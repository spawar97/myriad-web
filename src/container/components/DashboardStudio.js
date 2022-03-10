let React = require('react');
let createReactClass = require('create-react-class');
let _ = require('underscore');
let FixedDataTable = require('fixed-data-table');
let Imm = require('immutable');
import DOM from 'react-dom-factories';
import {listOfModules, listOfTags} from '../constants/ModulesFocusTags';

let Button = React.createFactory(require('./Button'));
let Checkbox = React.createFactory(require('./Checkbox'));
let Combobox = React.createFactory(require('./Combobox'));
let FixedDataTableHeader = React.createFactory(require('./FixedDataTableHeader'));
let InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
let ModalDialogContent = require('./ModalDialogContent');
let ReportsWrapper = React.createFactory(require('./ReportsWrapper'));
let SchemaTreeView = React.createFactory(require('./SchemaTreeView'));
let SimpleAction = React.createFactory(require('./SimpleAction'));
let ReportWidget = React.createFactory(require('./exposure/ReportWidget'));
let StudioMixin = require('./StudioMixin');
let ExposureActions = require('../actions/ExposureActions');
let ExposureAppConstants = require('../constants/ExposureAppConstants');
let FrontendConstants = require('../constants/FrontendConstants');
let ModalConstants = require('../constants/ModalConstants');
let RouteNameConstants = require('../constants/RouteNameConstants');
let AppRequest = require('../http/AppRequest');
let GA = require('../util/GoogleAnalytics');
let ImmEmptyFile = require('../util/ImmEmptyFile');
let Util = require('../util/util');

// These classes are dependent on the FixedDataTable class.
let Column = React.createFactory(FixedDataTable.Column);
let Table = React.createFactory(FixedDataTable.Table);

let div = DOM.div,
  span = DOM.span;

import StudioPreview from './StudioPreview';
import {studioUtils} from '../util/StudioUtils';
import PropTypes from 'prop-types';
import {withTransitionHelper} from './RouterTransitionHelper';

var DashboardStudio = createReactClass({
  displayName: 'DashboardStudio',
  mixins: [StudioMixin],

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function () {
    var immExposureStore = this.props.immExposureStore;
    var immDashboard = immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immReportIds = this.props.params.fileId ? immDashboard.get('reportIds') : Imm.List();
    var immCheckedFiles = studioUtils.createImmCheckedFiles(immReportIds, this.props.immExposureStore);
    var immInitialDashboard = Imm.Map({
      title: immDashboard.get('title'),
      checkedFiles: immCheckedFiles,
      modules: immDashboard.get('modules', Imm.List()),
      tags: immDashboard.get('tags', Imm.List()),
      tagsToShow: Imm.List() // to populate tags according to the module/s selected
    });
    let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
    let immWorkingCs = this.getComprehendSchema(comprehendSchemaId);
    return {
      comprehendSchemaId: comprehendSchemaId,
      immBaseDashboard: immInitialDashboard,
      immCurrentFile: immDashboard,
      immSelectedTreeViewItemPath: null,
      immWorkingCs: immWorkingCs,
      immWorkingDashboard: immInitialDashboard,
      leftPanelWidth: null,
      rightPanelWidth: null,
      title: immDashboard.get('title')
    };
  },

  componentDidMount: function () {
    let ctx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    this.FILTER_TYPE_WIDTH = Math.ceil(Util.getTextWidth(ctx, FrontendConstants.FILTER_TYPE + ':'));
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }

    ExposureActions.fetchFileConfigs();
    ExposureActions.transitionLinkedReportsStudio(this.props.params.fileId, true);
  },

  shouldComponentUpdate: function (nextProps, nextState) {
    let isLoading = this.props.immExposureStore.get('isLoadingFile') !== nextProps.immExposureStore.get('isLoadingFile');
    return isLoading ||
      this.props.params.fileId !== nextProps.params.fileId ||
      this.state !== nextState ||
      !Imm.is(this.props.immExposureStore.get('files'), nextProps.immExposureStore.get('files')) ||
      !Imm.is(this.props.immExposureStore.get('fileConfigs'), nextProps.immExposureStore.get('fileConfigs'));
  },

  componentWillReceiveProps: function (nextProps) {
    if (!nextProps.params.fileId) {
      return;
    }
    let stateDashboard = {};
    let immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    let immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    // Handle the case where the dashboard file has loaded after `ExposureStore.fetchFile`.
    if (immCurrentFile.get('title') !== immNextFile.get('title')) {
      stateDashboard.title = immNextFile.get('title');
    }
    // Handle the case where the dashboard's reports have loaded after `ExposureStore.fetchDashboardReports`.
    // The check below is required so that the checked files are only reloaded on the initial file load.
    let requestInFlight = this.props.immExposureStore.get('fileConfigsRequestInFlight', false);
    let nextRequestInFlight = nextProps.immExposureStore.get('fileConfigsRequestInFlight', false);
    if (!Imm.is(immCurrentFile.get('reportIds'), immNextFile.get('reportIds')) || requestInFlight !== nextRequestInFlight) {
      let immCheckedFiles = studioUtils.createImmCheckedFiles(immNextFile.get('reportIds'), nextProps.immExposureStore);
      let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
      stateDashboard.checkedFiles = immCheckedFiles;
      stateDashboard.comprehendSchemaId = comprehendSchemaId;
      stateDashboard.immWorkingCs = this.getComprehendSchema(comprehendSchemaId);


      let selectedModules = immCurrentFile.get('modules');
      let listOfSelectedModules;
      let listOfSelectedTags= [];
      let listOfOptions = []; // to pre populate tags based on default module selected on dashboard

      if (selectedModules && selectedModules.size) {
        listOfSelectedModules = listOfModules.filter((module) => {
          return selectedModules.indexOf(module.text) !== -1;
        });

        stateDashboard.modules = Imm.fromJS(listOfSelectedModules);
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
        listOfOptions = this.selectTagsForModule(listOfSelectedModules);

        if (selectedModules && selectedModules.size) {
          stateDashboard.modules = Imm.fromJS(listOfSelectedModules);
          stateDashboard.tags = Imm.fromJS(listOfSelectedTags);
          stateDashboard.tagsToShow = Imm.fromJS(listOfOptions);
        } else {
          stateDashboard.tags = Imm.fromJS(listOfSelectedTags);
        }
      }
    }

    if (!_.isEmpty(stateDashboard)) {
      this.setState({
        immBaseDashboard: this.state.immBaseDashboard.merge(stateDashboard),
        immWorkingDashboard: this.state.immWorkingDashboard.merge(stateDashboard)
      });
    }
  },

  componentWillUnmount: function () {
    window.removeEventListener('resize', this.handleResize);
    ExposureActions.deleteFileStates(this.getImmWorkingFileIds().toJS());
    ExposureActions.transitionLinkedReportsStudio(null, false);
  },

  isDirty() {
    return !this.props.immExposureStore.get('isLoadingFile') && !Imm.is(this.state.immBaseDashboard, this.state.immWorkingDashboard);
  },

  unsavedWorkModalCopy() {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_DASHBOARD,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  onChangeFileTitle: function (e) {
    this.setState({immWorkingDashboard: this.state.immWorkingDashboard.set('title', e.target.value)});
  },

  save: function () {
    let immIncludedDynamicFilters = _.isNull(this.state.comprehendSchemaId) ? Imm.List() : this.state.immCurrentFile.get('includedDynamicFilters', Imm.List());
    let modules = this.state.immWorkingDashboard.get('modules').toJS().map((module) => {
      return module.text;
    });
    let tags = this.state.immWorkingDashboard.get('tags').toJS().map((tag) => {
      return tag.text;
    });
    let newFields = {
      reportIds: this.getImmWorkingFileIds().toJS(),
      title: this.state.immWorkingDashboard.get('title'),
      modules: modules,
      tags: tags,
      rank: this.state.immWorkingDashboard.get('rank'),
      includedDynamicFilters: immIncludedDynamicFilters
    };
    if (this.props.params.fileId) {  // In edit mode.
      let immExposureStore = this.props.immExposureStore;
      let immOriginalDashboard = immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file']);
      let immNewDashboard = immOriginalDashboard.merge(newFields);
      if (immNewDashboard.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewDashboard = immNewDashboard.delete('folderId');
      }
      let dashboardId = immNewDashboard.get('id');
      _.each(GA.GAHelper.extractEditOperations(immOriginalDashboard.toJS(), immNewDashboard.toJS()), function (editOperation) {
        GA.sendDocumentEdit(dashboardId, GA.DOCUMENT_TYPE.DASHBOARD, editOperation);
      });
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId, immNewDashboard, this.goToView);
    } else {  // In add mode.
      let immFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_DASHBOARD).merge(newFields);
      let folderId = this.props.immExposureStore.getIn(['folderView', 'folderId']);
      if (folderId !== ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immFile = immFile.set('folderId', folderId);
      }
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.DASHBOARD);
      ExposureActions.reportCreationViewCreateReport(immFile, this.goToView);
    }
  },

  getImmWorkingFileIds: function () {
    return this.state.immWorkingDashboard.get('checkedFiles', Imm.Set()).map(function (immCheckedFile) {
      return immCheckedFile.get('id');
    });
  },

  goToView: function (params) {
    if (!_.isUndefined(params.id)) {
      this.context.router.push({name: RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW, params: {fileId: params.id}});
    }
  },

  onClickCheckbox: function (rowIndex) {
    let immNewCheckedFiles = this.state.immWorkingDashboard.get('checkedFiles').map(function (immFile, idx) {
      return immFile.set('checked', idx === rowIndex && !immFile.get('checked'));
    });
    this.setState({
      immWorkingDashboard: this.state.immWorkingDashboard.set('checkedFiles', immNewCheckedFiles)
    }, () => {
      this.updateWorkingCs(this.state.immWorkingDashboard);
    });
  },

  onClickRemove: function (rowIndex) {
    let immNewCheckedFiles = this.state.immWorkingDashboard.get('checkedFiles').delete(rowIndex);
    ExposureActions.deleteFileStates(immNewCheckedFiles.map(function (immFile) {
      return immFile.get('id');
    }).toJS());
    this.setState({
      immWorkingDashboard: this.state.immWorkingDashboard.set('checkedFiles', immNewCheckedFiles)
    }, () => {
      this.updateWorkingCs(this.state.immWorkingDashboard);
    });
  },

  checkboxCellRenderer: function (cellData, cellDataKey, rowData, rowIndex) {
    return div({className: 'input-checkbox'},
      Checkbox({
        dimmed: false,
        checkedState: cellData,
        onClick: this.onClickCheckbox.bind(null, rowIndex)
      })
    );
  },

  removeCellRenderer: function (cellData, cellDataKey, rowData, rowIndex) {
    return span({className: 'icon-remove', onClick: this.onClickRemove.bind(null, rowIndex)});
  },

  createReportTable: function (immData) {  // data -> [{id: reportId, title: reportTitle, checked: checked}]
    let widestFont = Util.getWidestFont();
    let ctx = Util.get2dCanvasContext('16px ' + widestFont);
    let immWidths = immData.map(function (immReport) {
      return ctx.measureText(immReport.get('title')).width;
    });
    let maxWidth = Math.max(immWidths.max() || 0, this.state.leftPanelWidth - 120);  // 120px is checkbox cell width + remove cell width.
    let tArgs = [
      {
        // Arbitrarily large maxHeight, see BaseListViewMixin.js for more information
        maxHeight: 4000,
        headerHeight: 50,
        width: this.state.leftPanelWidth,
        rowHeight: 30,
        rowsCount: immData.size,
        // TODO: This prevents scroll events from being eaten by the table. This will hopefully be fixed in a future version of FDT and then we can remove this.
        overflowX: 'hidden',
        overflowY: 'hidden',
        rowGetter: function (index) {
          return immData.get(index).toJS();
        }
      },
      Column({
        label: 'checkbox',
        width: 60,
        dataKey: 'checked',
        headerRenderer: function () {
          return FixedDataTableHeader({
            contents: Checkbox({
              dimmed: false, checkedState: immData.some(function (immDatum) {
                return immDatum.get('checked');
              }), onClick: _.noop
            })
          });
        },
        cellRenderer: this.checkboxCellRenderer
      }),
      Column({
        dataKey: 'title',
        headerRenderer: function () {
          return FixedDataTableHeader({contents: FrontendConstants.REPORTS});
        },
        minWidth: maxWidth,
        width: maxWidth
      }),
      Column({
        label: 'remove',
        width: 60,
        dataKey: 'remove',
        headerRenderer: function () {
          return FixedDataTableHeader({contents: span({className: 'icon-remove'})});
        },
        cellRenderer: this.removeCellRenderer
      })
    ];

    return Table.apply(null, tArgs);
  },

  updateWorkingCs: function (immWorkingDashboard) {
    let immCheckedFiles = immWorkingDashboard.get('checkedFiles', Imm.List());
    let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
    this.setState({
      immWorkingDashboard: immWorkingDashboard,
      comprehendSchemaId: comprehendSchemaId,
      immWorkingCs: this.getComprehendSchema(comprehendSchemaId)
    });
    if (immCheckedFiles.isEmpty() || _.isNull(comprehendSchemaId)) {
      let immCurrentFile = this.state.immCurrentFile.set('appliedFilters', Imm.List());
      this.setState({immCurrentFile: immCurrentFile});
    }
  },

  handleSelectReport: function (report) {
    let immNewCheckedFiles = this.state.immWorkingDashboard.get('checkedFiles', Imm.List()).push(Imm.Map({
      id: report.id,
      title: report.text,
      checked: false,
      comprehendSchemaId: report.comprehendSchemaId
    }));
    this.setState({
      immWorkingDashboard: this.state.immWorkingDashboard.set('checkedFiles', immNewCheckedFiles)
    }, () => {
      this.updateWorkingCs(this.state.immWorkingDashboard);
      ExposureActions.fetchFile(report.id, null, {fetchData: true});
    });
  },

  onChangeFileModules: function (dropdownValue) {
    let tagsToShow = this.selectTagsForModule(dropdownValue);
    let currentTagValue;
    let newTagsArray = [];
    let tagsPresent = this.state.immWorkingDashboard.get('tags');
    // checking if already visible tags are valid or not else removing them from UI
    if (tagsPresent.size !== 0) {
      currentTagValue = tagsPresent.toJS();
      dropdownValue.forEach((element) => {
        newTagsArray.push(...(currentTagValue.filter(tag => {
          return tag && tag.module === element.value;
        })));
      });
    }
    this.setState({
      immWorkingDashboard: this.state.immWorkingDashboard.set('modules', Imm.fromJS(dropdownValue)).set('tags', Imm.fromJS(newTagsArray)).set('tagsToShow', Imm.fromJS(tagsToShow))
    });
  },
  // function to return only valid tags based on module selected
  selectTagsForModule: function (moduleValue) {
    let tagsReceived = [];
    moduleValue && moduleValue.forEach((element) => {
      tagsReceived.push(...(listOfTags.filter(tag => {
        return tag && tag.module === element.value;
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
      updatedRanksDetails= Util.updateRankDetails(rankDetails, this.state.immWorkingDashboard.get('rank').toJS());
    } else {
      updatedRanksDetails = rankDetails;
    }   
     this.setState({
      immWorkingDashboard: this.state.immWorkingDashboard.set('rank', updatedRanksDetails).set('tags', Imm.fromJS(dropdownValue))
    });
  },

  handleUp: function () {
    let selectedIndex = this.state.immWorkingDashboard.get('checkedFiles').findIndex(function (immFile) {
      return immFile.get('checked');
    });
    let immCheckedFiles = this.state.immWorkingDashboard.get('checkedFiles');
    if (selectedIndex > 0) {
      let immNewCheckedFiles = immCheckedFiles.splice(selectedIndex - 1, 2, immCheckedFiles.get(selectedIndex), immCheckedFiles.get(selectedIndex - 1));
      this.setState({
        immWorkingDashboard: this.state.immWorkingDashboard.set('checkedFiles', immNewCheckedFiles)
      }, () => {
        this.updateWorkingCs(this.state.immWorkingDashboard);
      });
    }
  },

  handleDown: function () {
    let selectedIndex = this.state.immWorkingDashboard.get('checkedFiles').findIndex(function (immFile) {
      return immFile.get('checked');
    });
    let immCheckedFiles = this.state.immWorkingDashboard.get('checkedFiles');
    if (selectedIndex > -1 && selectedIndex < immCheckedFiles.size - 1) {
      let immNewCheckedFiles = immCheckedFiles.splice(selectedIndex, 2, immCheckedFiles.get(selectedIndex + 1), immCheckedFiles.get(selectedIndex));
      this.setState({
        immWorkingDashboard: this.state.immWorkingDashboard.set('checkedFiles', immNewCheckedFiles)
      }, () => {
        this.updateWorkingCs(this.state.immWorkingDashboard);
      });
    }
  },

  getComprehendSchema: function (comprehendSchemaId) {
    let immSchema = this.props.immExposureStore.getIn(['comprehendSchemas', comprehendSchemaId]);
    return _.isUndefined(immSchema) ? null : this.getWorkingCs(immSchema);
  },

  render: function () {
    if (this.props.immExposureStore.get('isLoadingFile')) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }

    const immComprehendSchemas = this.props.immExposureStore.get('comprehendSchemas');
    const immCurrentFile = this.state.immCurrentFile;
    const immFilesAccessible = Util.getAllReportsAndDashboards(this.props.immExposureStore, /* returnImmutable */ true);
    const reportType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_ANALYTICS));
    const immCheckedFileIds = this.getImmWorkingFileIds();
    const immReportsAccessible = immFilesAccessible.filter(fileItem => fileItem.type === reportType && !immCheckedFileIds.contains(fileItem.id));

    const comprehendSchemaId = this.state.comprehendSchemaId;

    let immIncludedDynamicFilters = null;
    let schemaName = null;
    if (!(_.isNull(comprehendSchemaId) || _.isNull(this.state.immWorkingCs))) {
      immIncludedDynamicFilters = this.getIncludedDynamicFilters(immCurrentFile);
      schemaName = _.isNull(immComprehendSchemas) ? '-' : immComprehendSchemas.getIn([comprehendSchemaId, 'name']);
    }
    let immWorkingDashboard = this.state.immWorkingDashboard;
    let modules = immWorkingDashboard.get('modules');
    let tags = immWorkingDashboard.get('tags');
    let tagsToShow = immWorkingDashboard.get('tagsToShow');

    return div({className: 'studio'},
      div({className: 'page-header'},
        div({className: 'title'}, (this.props.params.fileId ? FrontendConstants.EDIT_DASHBOARD : FrontendConstants.CREATE_DASHBOARD))),
      div({className: 'studio-editor'},
        div({className: 'title'}, FrontendConstants.DASHBOARD_INFORMATION),
        div({className: 'entry-text required'}, FrontendConstants.TITLE),
        InputWithPlaceholder({
          type: 'text',
          className: 'text-input',
          onChange: this.onChangeFileTitle,
          value: immWorkingDashboard.get('title'),
          ref: 'title',
          placeholder: FrontendConstants.TITLE_REQUIRED,
          maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH
        }),
        div({className: 'entry-text'}, FrontendConstants.MODULES),
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
        }),
        div({className: 'entry-text'}, FrontendConstants.FOCUS_TAGS),
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
        }),
        div({className: 'title'}, FrontendConstants.REPORT),
        div({className: 'entry-text'}, FrontendConstants.SELECT_REPORTS),
        Combobox({
          placeholder: FrontendConstants.SELECT_REPORTS,
          className: 'report-type-dropdown',
          value: '',  // Always show the placeholder.
          valueKey: 'id',
          labelKey: 'text',
          passOnlyValueToChangeHandler: false,
          onChange: this.handleSelectReport,
          options: immReportsAccessible
        }),
        div({className: 'order-buttons'},
          span({className: 'icon-arrow-down', onClick: this.handleDown}),
          span({className: 'icon-arrow-up', onClick: this.handleUp})),
        div({className: 'reports-table'},
          this.createReportTable(immWorkingDashboard.get('checkedFiles', Imm.List()))
        ),
        div({className: 'schema-section'},
          div({className: 'title'}, FrontendConstants.REPORTS_COMMON_SCHEMA),
          div({className: 'schema-name'}, schemaName),
          _.isNull(immComprehendSchemas) || _.isNull(this.state.leftPanelWidth) || _.isNull(this.state.immWorkingCs) ? null :
            SchemaTreeView({
              columnCheckboxOnly: true,
              disableToggleButtons: true,
              handleTreeItemDoubleClick: _.noop,
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
        div({key: 'applied-filters-label', className: 'entry-text title'}, FrontendConstants.DYNAMIC_FILTERS,
          SimpleAction({
            class: 'add-applied-filter icon-plus-circle2',
            title: FrontendConstants.ADD_DYNAMIC_FILTER,
            onClick: this.addNewIncludedDynamicFilter
          })),
        div({className: 'applied-filters-text'}, immWorkingDashboard.get('checkedFiles').isEmpty() ? FrontendConstants.DYNAMIC_FILTERS_EMPTY_DASHBOARD : (_.isNull(comprehendSchemaId) ? FrontendConstants.DYNAMIC_FILTERS_DIFFERENT_SCHEMA : FrontendConstants.DYNAMIC_FILTERS_TIP)),
        immIncludedDynamicFilters,
        Button({
          icon: 'icon-loop2',
          children: FrontendConstants.SAVE,
          isPrimary: true,
          isDisabled: _.isEmpty(immWorkingDashboard.get('title')) || immWorkingDashboard.get('checkedFiles').isEmpty(),
          onClick: this.save
        })
      ),
      <StudioPreview
        immExposureStore={this.props.immExposureStore}
        title={FrontendConstants.DASHBOARD_PREVIEW}
        fileType={ExposureAppConstants.FILE_TYPE_DASHBOARD}
        reportIds={immCheckedFileIds.toJS()}
      />
    );
  },
});

module.exports = withTransitionHelper(DashboardStudio);
