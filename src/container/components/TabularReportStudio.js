import {listOfModules, listOfTags} from "../constants/ModulesFocusTags";
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import AccountUtil from '../util/AccountUtil';
import {withTransitionHelper} from './RouterTransitionHelper';

require('codemirror/lib/codemirror.css');
require('codemirror/mode/sql/sql');

var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');

var Button = React.createFactory(require('./Button'));
var CodeMirrorEditor = React.createFactory(require('./CodeMirrorEditor'));
var Combobox = React.createFactory(require('./Combobox'));
var FixedDataTableHeader = React.createFactory(require('./FixedDataTableHeader'));
var Highchart = React.createFactory(require('./Highchart'));
var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var ListItem = React.createFactory(require('./ListItem'));
var ModalDialogContent = require('./ModalDialogContent');
var SchemaTreeView = React.createFactory(require('./SchemaTreeView'));
var SimpleAction = React.createFactory(require('./SimpleAction'));
var StudioMixin = require('./StudioMixin');
var ExposureActions = require('../actions/ExposureActions');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var ModalConstants = require('../constants/ModalConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');
var StatusMessageTypeConstants = require('../constants/StatusMessageTypeConstants');
var AppRequest = require('../http/AppRequest');
var ComprehendSchemaUtil = require('../util/ComprehendSchemaUtil');
var GA = require('../util/GoogleAnalytics');
var ImmEmptyFile = require('../util/ImmEmptyFile');
var Util = require('../util/util');

// These classes are dependent on the FixedDataTable class.
var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div,
    span = DOM.span;

var TabularReportStudio = createReactClass({
  displayName: 'TabularReportStudio',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [StudioMixin],

  getInitialState: function() {
    var immEmptyFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_REPORT).set('reportConfig', Imm.fromJS({
      comprehendSchemaId: null,
      reportType: ExposureAppConstants.REPORT_TYPE_TABULAR,
      cqlQueries: [null],
      columnHeaders: [],
      queries: [],
      modules: [],
      tags: [],
      tagsToShow: Imm.List(), // to populate tags according to the module/s selected
    }));

    var immInitialFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], immEmptyFile);
    var immInitialWorkingCs = this.getInitialWorkingCs(this.props.immExposureStore.get('comprehendSchemas'), immInitialFile);
    if (immInitialWorkingCs && _.isNull(immInitialFile.getIn(['reportConfig', 'comprehendSchemaId']))) {
      immInitialFile = immInitialFile.setIn(['reportConfig', 'comprehendSchemaId'], immInitialWorkingCs.get('id'));
    }

    return {
      data: [],
      immColumnHeaders: immInitialFile.getIn(['reportConfig', 'columnHeaders'], Imm.List()),
      // We are mapping over queries to produce a set of query entry components.
      // Initial state of the page should be a single empty query entry component with no value in it.
      immCqlQueries: immInitialFile.getIn(['reportConfig', 'cqlQueries'], Imm.List([null])),
      immCqlQueryPointer: null,
      immCurrentFile: immInitialFile,
      immCurrentFileCopy: immInitialFile,
      immRanCqlQueries: Imm.List(),
      immSavedFile: immInitialFile,
      immSelectedTreeViewItemPath: null,
      immWorkingCs: immInitialWorkingCs,
      leftPanelWidth: null,
      reportType: ExposureAppConstants.REPORT_TYPE_TABULAR,
      rightPanelWidth: null
    };
  },

  getInitialWorkingCs: function(immComprehendSchemas, immReport) {
    if (_.isNull(immComprehendSchemas) || immComprehendSchemas.isEmpty()) {
      return null;
    } else {
      var immSchema = immComprehendSchemas.get(immReport.getIn(['reportConfig', 'comprehendSchemaId']), immComprehendSchemas.first());
      return this.getWorkingCs(immSchema);
    }
  },

  runQueries: function() {
    var cqlQueries = this.state.immCqlQueries.take(1).toJS();
    var url = '/api/cql-queries/' + this.state.immWorkingCs.get('id') + '/execute';
    AppRequest({type: 'POST', url: url, data: JSON.stringify(cqlQueries)}).then(
      function(dataList) {
        var newState = this.createReportState(dataList);
        newState.data = dataList;
        newState.immRanCqlQueries = this.state.immCqlQueries;
        this.setState(newState);
      }.bind(this),
      function(jqXHR) {
        ExposureActions.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.WARNING);
        console.log('%cERROR: POST ' + url + ' failed.', 'color: #E05353');
        GA.sendAjaxException('POST ', url, ' failed.', jqXHR.status);
      }
    );
  },

  autoFillHeaders: function() {
    var cqlQuery = this.state.immCqlQueries.take(1).toJS();
    var url = '/api/cql-queries/' + this.state.immWorkingCs.get('id') + '/parse';
    AppRequest({type: 'POST', url: url, data: JSON.stringify(cqlQuery)}).then(
      function(queries) {
        var columns = queries[0].columns;
        var displayStrings = _.pluck(columns, 'displayString');

        // If a column does not yet have a header, set it to the column display string.
        var numFilled = 0;
        var immColumnHeaders = this.state.immColumnHeaders.map(function(header, index) {
          if (header) {
            return header;
          } else {
            numFilled += displayStrings[index] ? 1 : 0;  // The display string might be undefined.
            return displayStrings[index];
          }
        });
        this.setState({immColumnHeaders: immColumnHeaders});
        ExposureActions.createStatusMessage(numFilled + ' of ' + columns.length + ' column headers were auto-filled.', StatusMessageTypeConstants.INFO);
      }.bind(this),
      function(jqXHR) {
        ExposureActions.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_PARSE_QUERY, StatusMessageTypeConstants.WARNING);
        console.log('%cERROR: POST ' + url + ' failed.', 'color: #E05353');
        GA.sendAjaxException('POST ', url, ' failed.', jqXHR.status);
      }
    );
  },

  componentDidMount: function() {
    var ctx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    this.FILTER_TYPE_WIDTH = Math.ceil(Util.getTextWidth(ctx, FrontendConstants.FILTER_TYPE + ':'));
    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }
    if (this.props.params.fileId && !this.state.immCurrentFile.has('id')) {
      ExposureActions.fetchFile(this.props.params.fileId);
    }
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    ExposureActions.fetchFileConfigs();  // Make sure we have all the files for the associated files dropdown.
  },

  componentDidUpdate: function() {
    this.handleResize();  // render seems to affect the panel widths - this call to `handleResize` will only cause a rerender if the widths change.
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    var isLoading = this.props.immExposureStore.get('isLoadingFile') !== nextProps.immExposureStore.get('isLoadingFile');
    var immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immFileConfigs =  this.props.immExposureStore.get('fileConfigs', Imm.Map());
    var immNextFileConfigs =  nextProps.immExposureStore.get('fileConfigs', Imm.Map());
    return isLoading ||
      this.props.params.fileId !== nextProps.params.fileId ||
      !_.isEqual(this.state, nextState) ||
      !immCurrentFile.equals(immNextFile) ||
      immFileConfigs !== immNextFileConfigs;
  },

  componentWillReceiveProps: function(nextProps) {
    var stateObject = {};
    var immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());

    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      stateObject.immWorkingCs = this.getInitialWorkingCs(nextProps.immExposureStore.get('comprehendSchemas'), immNextFile);
      if (!_.isNull(stateObject.immWorkingCs)) {
        stateObject.immSavedFile = this.state.immSavedFile.setIn(['reportConfig', 'comprehendSchemaId'], stateObject.immWorkingCs.get('id'));
        stateObject.immCurrentFile = this.state.immCurrentFile.setIn(['reportConfig', 'comprehendSchemaId'], stateObject.immWorkingCs.get('id'));
      }
    }


    let selectedModules = this.state.immCurrentFile.get('modules').length > 0 ? this.state.immCurrentFile.get('modules') : immCurrentFile.get('modules');
    let listOfSelectedModules;
    let listOfSelectedTags = [];
    let listOfOptions = []; // to pre populate tags based on default module selected
    const {immCurrentFileCopy} = this.state;
    if (selectedModules && selectedModules.size) {
      listOfSelectedModules = listOfModules.filter((module) => {
        return selectedModules.indexOf(module.text) !== -1;
      });
      stateObject.immCurrentFileCopy = immCurrentFileCopy.set('modules', Imm.fromJS(listOfSelectedModules));
    }

    let updatedRank = this.state.immCurrentFile.get('rank');
    if(updatedRank && updatedRank.size) {
     updatedRank.toJS().map(rank =>  {  
       let rankObj = rank;
       let tagsList = listOfTags.filter((tag) => {
        return rankObj.tag === (tag.text) && rankObj.module === (tag.moduleName);
       });
       listOfSelectedTags.push(tagsList[0]);
     });
      // filtering out valid tags based on default module selected

      if (selectedModules && selectedModules.size) {
        listOfOptions = this.selectTagsForModule(listOfSelectedModules);
        stateObject.immCurrentFileCopy = immCurrentFileCopy.set('modules', Imm.fromJS(listOfSelectedModules)).set('tags', Imm.fromJS(listOfSelectedTags)).set('tagsToShow', Imm.fromJS(listOfOptions));
      } 
    }

    if (!immNextFile.equals(immCurrentFile)) {
      _.extend(stateObject, {
        immCqlQueries: immNextFile.getIn(['reportConfig', 'cqlQueries'], Imm.List([null])),
        immColumnHeaders: immNextFile.getIn(['reportConfig', 'columnHeaders'], Imm.List()),
        reportType: immNextFile.getIn(['reportConfig', 'reportType'], ExposureAppConstants.REPORT_TYPE_GRAPHICAL),
        immCurrentFile: immNextFile,
        immSavedFile: immNextFile,
        immRanCqlQueries: Imm.List()
      });
      stateObject.immWorkingCs = this.getInitialWorkingCs(nextProps.immExposureStore.get('comprehendSchemas'), immNextFile);
    }

    if (!_.isEmpty(stateObject)) {
      this.setState(stateObject);
    }
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.handleResize);
  },

  createReportState: function(newData) {
    switch (this.state.reportType) {
      case ExposureAppConstants.REPORT_TYPE_TABULAR:
        return {immColumnHeaders: this.state.immColumnHeaders.setSize(newData[0].totalColumns)};
      default:
        ExposureActions.createStatusMessage(FrontendConstants.REPORT_TYPE_INVALID, StatusMessageTypeConstants.WARNING);
    }
  },

  createQueryEntry: function(query) {
    return div({className: 'query-entry'},
      div({className: 'entry-text required'}, FrontendConstants.QUERY, span({className: 'icon-question-circle', title: FrontendConstants.QUERY_TIP})),
      CodeMirrorEditor({
        className: cx('code-mirror-wrapper', 'query-input'),
        ref: 'codeMirror',
        lineNumbers: true,
        mode: 'text/x-sql',
        smartIndent: true,
        initialValue: query || '',
        onChange: this.onChangeCqlQuery,
        onBlur: this.onCompleteCqlQuery,
      })
    );
  },

  isDirty: function() {
    return !this.props.immExposureStore.get('isLoadingFile') && (!Imm.is(this.state.immSavedFile, this.state.immCurrentFile) || !Imm.is(this.state.immSavedFile.get('reportConfig'), Imm.fromJS(this.getReportConfig())));
  },

  unsavedWorkModalCopy() {
    return {header: FrontendConstants.DISCARD_CHANGES_TO_REPORT,
            content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST};
  },

  renderReport: function() {
    if (!Imm.is(this.state.immCqlQueries, this.state.immRanCqlQueries)) {
      this.runQueries();
    } else {
      this.setState(this.createReportState(this.state.data));
    }
  },

  onChangeCqlQuery: function(e) {
    this.setState({
      immCqlQueries: this.state.immCqlQueries.set(0, e)
    });
  },

  /** Execute onBlur of the CodeMirror box. Automatically append a semi-colon if you forget. **/
  onCompleteCqlQuery: function(value) {
    var stateObject = {immCqlQueryPointer: Imm.Map({cqlQueryIndex: 0})};
    if (!_.isEmpty(value)) {
      stateObject.immCqlQueries = this.state.immCqlQueries.set(0, value.replace(/ *;*$/,';'));
    }
    this.setState(stateObject, this.updateQueryBox);
  },

  onChangeSchema: function(dropdownValue) {
    this.setState({immWorkingCs: this.getWorkingCs(this.props.immExposureStore.getIn(['comprehendSchemas', dropdownValue.idx]))});
  },

  onChangeFileTitle: function(e) {
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('title', e.target.value)
    });
  },

  onChangeFileDescription: function(e) {
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('description', e.target.value)
    });
  },

  onChangeColumnHeader: function(idx, e) {
    this.setState({
      immColumnHeaders: this.state.immColumnHeaders.set(idx, e.target.value)
    });
  },


  /** Sets the contents of the CodeMirror box to match the latest state. **/
  updateQueryBox: function () {
    var cm = this.refs['codeMirror'].editor;
    let latestContent = this.state.immCqlQueries.toJS(); 

    if (latestContent && latestContent[0] !== null) {
      cm.setValue(latestContent[0]);
    }
  },

  /** This overrides the function handleTreeItemDoubleClick in StudioMixin to allow us to work with CodeMirror instead. **/
  handleTreeItemDoubleClickCodeMirror: function(immNodePath) {
    if (immNodePath.size < 3) {  // Only allow double-clicks on column nodes (where path length is 3).
      return;
    }
    var tableDotColumnShortName = immNodePath.takeLast(2).join('.'),
        cqlQueryIndex = 0,
        originalCqlQuery = this.state.immCqlQueries.get(0),
        cqlQuery = (originalCqlQuery || 'select').replace(/ *;*$/, ''),
        newCqlQuery,
        stateObject = {};
      newCqlQuery = getNewCqlQuery(cqlQuery, '');
    stateObject.immCqlQueries = this.state.immCqlQueries.set(cqlQueryIndex, newCqlQuery);
    this.setState(stateObject, this.updateQueryBox);

    function getNewCqlQuery(leftText, rightText) {
      // We trim the left and right text, determine the best separators to use and then add the separators to the text.
      var trimmedLeftText = leftText.replace(/ +$/,'');
      var trimmedRightText = rightText.replace(/^ +/,'');
      // If the word to the left is a field name (includes a `.`), we use ', ' as a separator, otherwise we use ' '.
      var leftSeparator = /\b(\w+\.)+\w+$/.test(trimmedLeftText) ? ', ' : ' ';
      // If the word to the right is a field name (includes a `.`), we use ', ' as a separator, otherwise we use ' '.
      var rightSeparator = /^(\w+\.)+\w+\b/.test(trimmedRightText) ? ', ' : ' ';
      var cql = trimmedLeftText + leftSeparator + tableDotColumnShortName + rightSeparator + trimmedRightText;
      // If the query doesn't start with a select, prepend it:
      if (!cql.toLocaleLowerCase().startsWith('select')) {
        cql = 'select ' + cql;
      }
      // Remove any trailing spaces and add a `;` (required for cql parsing to work on the back end).
      return cql.replace(/ *$/, '') + ';';
    }
  },

  rowGetter: function(data, index) {
    return _.chain(data[index].values)
      .zip(data[index].datatypes)
      .map(function(valueAndDataType) {
        return Util.valueFormatter.apply(null, valueAndDataType);
      }).value();
  },

  getReportConfig: function() {
    return {
      comprehendSchemaId: this.state.immWorkingCs ? this.state.immWorkingCs.get('id') : null,
      reportType: this.state.reportType,
      cqlQueries: this.state.immCqlQueries.take(1).toJS(),
      columnHeaders: this.state.immColumnHeaders.toJS(),
      queries: []
    };
  },

  save: function() {
    var reportConfig = this.getReportConfig();
    var immNewFile = this.state.immCurrentFile.merge({reportConfig: reportConfig});
    var immOriginalFile = this.state.immSavedFile;
    if (this.props.params.fileId) {  // In edit mode.
      immNewFile = immNewFile.set('id', this.props.params.fileId);
      if (immNewFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.delete('folderId');
      }
      var fileId = immNewFile.get('id');
      _.each(GA.GAHelper.extractEditOperations(immOriginalFile.toJS(), immNewFile.toJS()), function(editOperation) {
        GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.REPORT, editOperation);
      });
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId, immNewFile, this.goToView);
    } else {  // in add mode.
      var folderId = this.props.immExposureStore.getIn(['folderView', 'folderId']);
      if (folderId !== ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.set('folderId', folderId);
      }
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.REPORT);
      ExposureActions.reportCreationViewCreateReport(immNewFile, this.goToView);
    }
  },

  goToView: function(params) {
    this.setState({
      immSavedFile: this.state.immCurrentFile
    });
    if (!_.isUndefined(params.id)) {
      this.context.router.push({name: RouteNameConstants.EXPOSURE_REPORTS_SHOW, params: {fileId: params.id}});
    }
  },

  createPreviewTable: function(ctx, data, qIdx) {

    var headerWidths = this.state.immColumnHeaders.map(function(header) {
      return ctx.measureText(header).width;
    }).toJS();
    var maxWidth = _.chain(data.rows).first(20).reduce(function(memo, row) {
      _.each(row.values, function(cell, cIdx) {
        var w = ctx.measureText(cell).width;
        memo[cIdx] = _.max([memo[cIdx] || 0, w]);
      });
      return memo;
    }, headerWidths).value();

    var totalWidth = _.reduce(maxWidth, function(memo, num) { return memo + num; }, 0);
    var extraPadding = (this.state.rightPanelWidth - totalWidth) / _.size(maxWidth);

    var headerRenderer = function(label) {
      return FixedDataTableHeader({contents: label || '-'});
    };
    var tArgs = _.map(maxWidth, function(w, cIdx) {
      return Column({
        label: this.state.immColumnHeaders.get(cIdx),
        dataKey: cIdx,
        minWidth: w + extraPadding,
        width: w + extraPadding,
        headerRenderer: headerRenderer
      });
    }, this);

    tArgs.unshift({
      key: qIdx,
      headerHeight: 30,
      height: 450,
      width: this.state.rightPanelWidth,
      rowHeight: 30,
      // TODO: This prevents scroll events from being eaten by the table. This will hopefully be fixed in a future version of FDT and then we can remove this.
      overflowX: 'hidden',
      overflowY: 'hidden',
      rowsCount: _.size(data.rows),
      rowGetter: this.rowGetter.bind(null, data.rows)
    });

    return (
      div({key: qIdx, className: 'data-preview'},
        div({className: 'entry-text'}, 'Table preview'),
        Table.apply(null, tArgs)
      )
    );
  },

  handleAssociatedFilesDropdownSelect: function(fileIds) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('associatedFileIds', Imm.fromJS(fileIds).toSet())});
  },

  onChangeFileModules: function (dropdownValue) {
    let tagsToShow = this.selectTagsForModule(dropdownValue);
    let currentTagValue;
    let newTagsArray = [];
    let tagsPresent = this.state.immCurrentFileCopy.get('tags');
    // checking if already visible tags are valid or not else removing them from UI
    if (tagsPresent.size !== 0) {
      currentTagValue = tagsPresent.toJS();
      dropdownValue.forEach((element) => {
        newTagsArray.push(...(currentTagValue.filter(tag => {
          return tag && tag.module === element.value;
        })));
      });
    }
    let tags = newTagsArray.map((tag) => {
      return tag.text;
    });
    let modules = newTagsArray.map((selected) => {
      return selected.moduleName;
    });
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('modules', modules).set('tags',tags),
      immCurrentFileCopy: this.state.immCurrentFileCopy.set('modules', dropdownValue).set('tags', Imm.fromJS(newTagsArray)).set('tagsToShow', Imm.fromJS(tagsToShow))
    });
  },


// function to return only valid tags based on module selected
  selectTagsForModule: function (moduleValue) {
    let tagsReceived = [];
    moduleValue.forEach((element) => {
      tagsReceived.push(...(listOfTags.filter(tag => {
        return tag.module === element.value;
      })));
    });
    return tagsReceived;
  },


  onChangeFileTags: function (dropdownValue) {
    let tags = dropdownValue.map((selected) => {
      return selected.text;
    });

    let modules = dropdownValue.map((selected) => {
      return selected.moduleName;
    });
    let rankDetails = Util.setCorrespondingModulesAndTags(modules, tags);
    let updatedRanksDetails;
    if(this.state.immCurrentFile.get('rank') && this.state.immCurrentFile.get('rank').size > 0) {
      updatedRanksDetails= Util.updateRankDetails(rankDetails, this.state.immCurrentFile.get('rank').toJS());
    } else {
      updatedRanksDetails = rankDetails;
    }    
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('tags', tags).set('modules', modules).set('rank', updatedRanksDetails),
      immCurrentFileCopy: this.state.immCurrentFileCopy.set('rank', updatedRanksDetails).set('tags', Imm.fromJS(dropdownValue))
    });
  },

  render: function() {
    if (this.props.immExposureStore.get('isLoadingFile')) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }

    var immComprehendSchemas = this.props.immExposureStore.get('comprehendSchemas');
    var immCurrentFile = this.state.immCurrentFile;
    var inEditMode = !_.isEmpty(this.props.params.fileId);

    if (inEditMode) {
      var updateFileRequest = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'updateFileRequest']);
      if (updateFileRequest) {
        return div({className: 'spinner-container'}, div({className: 'spinner'}));
      }
    }

    var content = [];
    if (this.state.data) {
      var widestFont = Util.getWidestFont();
      var ctx = Util.get2dCanvasContext('16px ' + widestFont);
      var numQueryResults = 1;  // Only display the first query's results for a tabular report.

      content.push(div({key: 'preview'},
        _.chain(this.state.data)
          .first(numQueryResults)
          .map(function(queryData, index) { return this.createPreviewTable(ctx, queryData, index); }, this)
          .value()
      ));
    }

    var immColumnHeaderInputs = this.state.immColumnHeaders.flatMap(function(header, index) {
      return Imm.List([
        div({key: 'header-label' + index, className: 'entry-text required'}, 'Column header #' + (index + 1)),
        InputWithPlaceholder({
          key: 'header-' + index,
          className: 'text-input',
          value: header,
          onChange: this.onChangeColumnHeader.bind(null, index),
          placeholder: 'Column Header #' + (index + 1) + ' (required)',
          maxLength: 60
        })
      ]);
    }, this);
    if (!this.state.immColumnHeaders.isEmpty()) {
      var autoFillButton = Button({icon:'icon-pencil btn-auto-fill', key: 'auto-fill', children: 'Auto-fill column labels', isPrimary: true,
        onClick: this.autoFillHeaders, isDisabled: !this.state.immCqlQueries.get(0)});
      immColumnHeaderInputs = immColumnHeaderInputs.push(autoFillButton);
    }

    var queriesInvalid = this.state.immCqlQueries.isEmpty() || _.isEmpty(this.state.immCqlQueries.first());
    var queriesRendered = Imm.is(this.state.immCqlQueries, this.state.immRanCqlQueries);
    var tabularReportInvalid = this.state.immColumnHeaders.some(_.isEmpty);
    var isReportSaved = !this.isDirty();

    // Only display the first query for a tabular report.
    var immCqlQueries = this.state.immCqlQueries.take(1);
    var immQueryEntry = this.createQueryEntry(immCqlQueries.first());
    var immIncludedDynamicFilters = null;
    let allFiltersValid = false;

    if (!_.isNull(this.state.immWorkingCs)) {
      immIncludedDynamicFilters = this.getIncludedDynamicFilters(immCurrentFile);
      allFiltersValid = this.sanityCheckFilters(immCurrentFile);
    }

    var reportInvalid = queriesInvalid || _.isEmpty(immCurrentFile.get('title')) || tabularReportInvalid || !queriesRendered || !allFiltersValid;
    var immFilesAccessible = Util.getAllReportsAndDashboards(this.props.immExposureStore, /* returnImmutable */ true).filter(fileAccessible => fileAccessible.id !== immCurrentFile.get('id'));
    const hasKPIStudio = AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig);

    const warningMessage = hasKPIStudio
      ? (
        div({className: 'studio-warning'},
        div({className: 'studio-warning-icon'},
          span({className: 'icon-information_solid'})),
        div({className: 'studio-warning-message'},

          div({}, FrontendConstants.TABULAR_ANALYTICS_CREATED_HERE_ONLY_FOR_DATA_REVIEW_SETS),
          div({}, FrontendConstants.TO_CREATE_TABULAR_ANALYTICS_FOR_OTHER_PURPOSES)
        ))
      )
      : div({});

    let immCurrentFileCopy = this.state.immCurrentFileCopy;
    let modules = immCurrentFileCopy.get('modules');
    let tags = immCurrentFileCopy.get('tags');
    let tagsToShow = immCurrentFileCopy.get('tagsToShow');

    return div({className: 'studio'},
      div({className: 'page-header'},
        div({className: 'title' }, inEditMode ? FrontendConstants.EDIT_TABULAR_REPORT : FrontendConstants.CREATE_TABULAR_REPORT)),
      warningMessage,
      div({className: 'studio-editor'},
        div({className: 'schema-section'},
          div({className: 'entry-text'}, inEditMode ? FrontendConstants.REPORT_SCHEMA : FrontendConstants.SELECT_A_SCHEMA),
          Combobox({
            key: 'schema-dropdown',
            className: 'schema-dropdown',
            options: immComprehendSchemas ? immComprehendSchemas.map(function(immComprehendSchema, idx) {
              return {idx: idx, text: immComprehendSchema.get('name'), value: immComprehendSchema.get('id')};
            }).toList() : Imm.List(),
            valueKey: 'value',
            labelKey: 'text',
            passOnlyValueToChangeHandler: false,
            value: _.isNull(this.state.immWorkingCs) ? null : this.state.immWorkingCs.get('id'),
            onChange: this.onChangeSchema
          }),
          _.isNull(immComprehendSchemas) || _.isNull(this.state.leftPanelWidth) ? null :
            SchemaTreeView({
              columnCheckboxOnly: true,
              disableToggleButtons: true,
              handleTreeItemDoubleClick: this.handleTreeItemDoubleClickCodeMirror,
              handleTreeItemExpandOrCollapse: this.handleTreeItemExpandOrCollapse,
              handleTreeItemSelection: this.handleTreeItemSelection,
              handleTvSearch: this.handleTvSearch,
              handleTvToggleSearchField: this.handleTvToggleSearchField,
              height: this.SCHEMA_TREE_VIEW_HEIGHT,
              immWorkingCsDatasources: this.state.immWorkingCs.get('datasources'),
              immTvSearchState: this.state.immTvSearchState,
              maxDepth: 2,
              noCheckboxes: true,
              noSideNavBorder: true,
              noSearchBoxMargin: true,
              noTooltips: true,
              width: this.state.leftPanelWidth
            })
        ),
        div({className: 'entry-text required'}, FrontendConstants.TITLE),
        InputWithPlaceholder({
          type: 'text',
          className: 'text-input title-input',
          onChange: this.onChangeFileTitle,
          value: immCurrentFile.get('title'),
          placeholder: FrontendConstants.TITLE_REQUIRED,
          maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH}),
        div({className: 'entry-text'}, FrontendConstants.DESCRIPTION),
        InputWithPlaceholder({
          type: 'textarea',
          className: 'textarea description-input',
          onChange: this.onChangeFileDescription,
          rows: 1,
          value: immCurrentFile.get('description'),
          placeholder: FrontendConstants.DESCRIPTION,
          maxLength: 512}),
        InputBlockContainer({
          class: 'data-input',
          title: span({className: 'bold'}, FrontendConstants.MODULES),
          inputComponent: div({className: 'data-input-input-component'},
            Combobox({
              key: 'modules-dropdown',
              className: 'modules-dropdown',
              options: listOfModules ? Imm.fromJS(listOfModules) : Imm.List(),
              multi: true,
              valueKey: 'value',
              labelKey: 'text',
              passOnlyValueToChangeHandler: false,  // Ensures we're returning the whole option object rather than just the value.
              value: modules ? Imm.fromJS(modules) : '',
              onChange: this.onChangeFileModules
            }))
        }),
        InputBlockContainer({
          class: 'data-input, tag-class',
          title: span({className: 'bold'}, FrontendConstants.FOCUS_TAGS),
          inputComponent: div({className: 'data-input-input-component'},
            Combobox({
              key: 'tags-dropdown',
              className: 'tags-dropdown',
              options: tagsToShow ? Imm.fromJS(tagsToShow) : Imm.List(),
              multi: true,
              valueKey: 'value',
              labelKey: 'text',
              passOnlyValueToChangeHandler: false,  // Ensures we're returning the whole option object rather than just the value.
              value: tags ? Imm.fromJS(tags) : Imm.List(),
              onChange: this.onChangeFileTags
            }))
        }),
        div(null, immQueryEntry),
        Button({icon: 'icon-loop2 btn-save', children: FrontendConstants.SAVE, isPrimary: true, onClick: this.save,
          isDisabled: reportInvalid || isReportSaved}),
        Button({icon: 'icon-loop btn-render', children: FrontendConstants.RENDER, isPrimary: true, onClick: this.renderReport,
          isDisabled: queriesInvalid}),
        immColumnHeaderInputs,
        div({key: 'applied-filters-label', className: 'entry-text'},
          FrontendConstants.DYNAMIC_FILTERS,
          SimpleAction({class: 'add-applied-filter icon-plus-circle2', title: FrontendConstants.ADD_DYNAMIC_FILTER, onClick: this.addNewIncludedDynamicFilter})),
        div(null, FrontendConstants.DYNAMIC_FILTERS_TIP),
        immIncludedDynamicFilters,
        div({className: 'associated-files-panel'},
          div({className: 'entry-text'}, FrontendConstants.ASSOCIATED_REPORTS_AND_DASHBOARDS),
          Combobox({
            className: 'associated-files-dropdown',
            placeholder: FrontendConstants.SELECT_ANALYTICS_DASHBOARDS_TO_ASSOCIATE,
            value: immFilesAccessible.filter(file => immCurrentFile.get('associatedFileIds', Imm.Set()).toSet().contains(file.id)),
            valueKey: 'id',
            labelKey: 'text',
            groupBy: 'type',
            multi: true,
            onChange: this.handleAssociatedFilesDropdownSelect,
            options: immFilesAccessible
          })
        )
      ),
      div({className: 'studio-preview'}, content));
  }
});

module.exports = withTransitionHelper(TabularReportStudio);
