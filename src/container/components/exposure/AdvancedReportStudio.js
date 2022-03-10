require('codemirror/lib/codemirror.css');
// These imports are used to modify CodeMirror global var.
require('codemirror/addon/hint/html-hint');
require('codemirror/addon/hint/javascript-hint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/show-hint.css');
require('codemirror/mode/htmlembedded/htmlembedded');
require('codemirror/mode/javascript/javascript');

let React = require('react');
let createReactClass = require('create-react-class');
let _ = require('underscore');
let Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

let DrilldownTargetSelector = React.createFactory(require('./DrilldownTargetSelector'));
let PreviewRenderMixin = require('./PreviewRenderMixin');
let Button = React.createFactory(require('../Button'));
let ClickableText = React.createFactory(require('../ClickableText'));
let CodeMirrorEditor = React.createFactory(require('../CodeMirrorEditor'));
let Combobox = React.createFactory(require('../Combobox'));
let Highchart = React.createFactory(require('../Highchart'));
let InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
let ListItem = React.createFactory(require('../ListItem'));
let ModalDialogContent = require('../ModalDialogContent');
let SchemaTreeView = React.createFactory(require('../SchemaTreeView'));
let SimpleAction = React.createFactory(require('../SimpleAction'));
let StudioMixin = require('../StudioMixin');
let ExposureActions = require('../../actions/ExposureActions');
let ExposureAppConstants = require('../../constants/ExposureAppConstants');
let FrontendConstants = require('../../constants/FrontendConstants');
let ModalConstants = require('../../constants/ModalConstants');
let RouteNameConstants = require('../../constants/RouteNameConstants');
let TemplateLibrary = require('../../util/TemplateLibrary');
let GA = require('../../util/GoogleAnalytics');
let ImmEmptyFile = require('../../util/ImmEmptyFile');
let QueryUtils = require('../../util/QueryUtils');
let Util = require('../../util/util');
import {withTransitionHelper} from '../RouterTransitionHelper';
import {listOfModules, listOfTags} from '../../constants/ModulesFocusTags';
import ExposureNavConstants from '../../constants/ExposureNavConstants';
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
let div = DOM.div;

var AdvancedReportStudio = createReactClass({
  displayName: 'AdvancedReportStudio',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    params: PropTypes.shape({
      advancedReportId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [StudioMixin, PreviewRenderMixin],

  getInitialState: function () {
    let immEmptyTemplate = Imm.fromJS({
      title: '',
      description: '',
      modules: [],
      tags: [],
      type: ExposureAppConstants.TEMPLATE_TYPE_CHART,
      // We need to have an empty array even though these will never be filled out to keep protobuf happy.
      parameters: Imm.List(),
      queryPlan: '',
      tagsToShow: Imm.List() // to populate tags according to the module/s selected
    });
    let immEmptyFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_REPORT);

    let immInitialFile = this.props.immExposureStore.getIn(['files', this.props.params.advancedReportId, 'fileWrapper', 'file'], immEmptyFile);
    let immInitialTemplate = immInitialFile.getIn(['templatedReport', 'template'], immEmptyTemplate);
    let immInitialWorkingCs = this.getInitialWorkingCs(this.props.immExposureStore.get('comprehendSchemas'), immInitialFile);
    let showContentPlaceHolder = false
    return {
      immCurrentFile: immInitialFile,
      immCurrentFileCopy: immInitialFile,
      immCurrentTemplate: immInitialTemplate,
      immSavedFile: immInitialFile,
      immSavedTemplate: immInitialTemplate,
      immWorkingCs: immInitialWorkingCs,
      showContentPlaceHolder: showContentPlaceHolder
    };
  },

  componentDidMount: function () {
    let ctx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    this.FILTER_TYPE_WIDTH = Math.ceil(Util.getTextWidth(ctx, FrontendConstants.FILTER_TYPE + ':'));
    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }
    // If we are editing a file, fetch it.
    if (this.props.params.advancedReportId) {
      ExposureActions.fetchFile(this.props.params.advancedReportId);
    }
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    ExposureActions.fetchFileConfigs();  // Make sure we have all the files for the associated files dropdown.
    ExposureActions.templatesFetch();
  },

  componentDidUpdate: function () {
    this.handleResize();
  },

  componentWillReceiveProps: function (nextProps) {
    let stateObject = {};
    let immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.advancedReportId, 'fileWrapper', 'file'], Imm.Map());
    let immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.advancedReportId, 'fileWrapper', 'file'], Imm.Map());
    let selectedModules = immCurrentFile.get('modules');
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

    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      stateObject.immWorkingCs = this.getInitialWorkingCs(nextProps.immExposureStore.get('comprehendSchemas'), immNextFile);
    }

    if (!immNextFile.equals(immCurrentFile)) {
      let immTemplate = immNextFile.getIn(['templatedReport', 'template']);
      _.extend(stateObject, {
        immCurrentFile: immNextFile,
        immCurrentTemplate: immTemplate,
        immSavedFile: immNextFile,
        immSavedTemplate: immTemplate
      });
      stateObject.immWorkingCs = this.getInitialWorkingCs(nextProps.immExposureStore.get('comprehendSchemas'), immNextFile);
    }

    if (!_.isEmpty(stateObject)) {
      this.setState(stateObject);
    }
  },

  componentWillUnmount: function () {
    window.removeEventListener('resize', this.handleResize);
  },

  shouldComponentUpdate: function (nextProps, nextState) {
    // isLoading is set to true by ExposureStore.createFile and ExposureStore.updateFile.
    let isLoading = this.props.immExposureStore.get('isLoadingFile') !== nextProps.immExposureStore.get('isLoadingFile');
    // requestInFlight is set to true for a specific fileId when in the process of ExposureStore.fetchFile.
    // Since we fetchFile on componentDidMount (when editing files), make sure there isn't a request in flight.
    let requestInFlight = this.props.immExposureStore.getIn(['files', this.props.params.advancedReportId, 'fileRequestInFlight'], false);
    let nextRequestInFlight = nextProps.immExposureStore.getIn(['files', nextProps.params.advancedReportId, 'fileRequestInFlight'], false);
    let immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.advancedReportId, 'fileWrapper', 'file'], Imm.Map());
    let immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.advancedReportId, 'fileWrapper', 'file'], Imm.Map());
    return isLoading ||  // The report is being created or updated.
      requestInFlight !== nextRequestInFlight ||  // Change in the state of the fetchFile request.
      this.props.params.advancedReportId !== nextProps.params.advancedReportId ||  // Change in the id of the report we are editing.
      !_.isEqual(this.state, nextState) ||  // State change.
      !immCurrentFile.equals(immNextFile);  // Change in File object.
  },

  getInitialWorkingCs: function (immComprehendSchemas, immReport) {
    if (_.isNull(immComprehendSchemas) || immComprehendSchemas.isEmpty()) {
      return null;
    } else {
      let immSchema = immComprehendSchemas.get(immReport.getIn(['templatedReport', 'comprehendSchemaId']), immComprehendSchemas.first());
      return this.getWorkingCs(immSchema);
    }
  },

  handleAssociatedFilesDropdownSelect: function (fileIds) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('associatedFileIds', Imm.fromJS(fileIds).toSet())});
  },

  handleDrilldownTargetSelect: function (key, fileIds) {
    const index = this.state.immCurrentFile.get('drilldownFileIdMap').findIndex(target => target.get('key') === key);
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['drilldownFileIdMap', index, 'list'], Imm.fromJS(fileIds))});
  },

  handleRenderPreview: function () {
    this.setState({ showContentPlaceHolder: true })
    let immCurrentTemplate = this.state.immCurrentTemplate.set('queryPlan', this.refs['queryplan-input'].editor.getValue());
    // First attempt to compile the template:
    let immInstantiatedTemplate = TemplateLibrary.instantiateTemplate(immCurrentTemplate, this.state.immWorkingCs.get('id'), Imm.List());
    this.renderPreview(immInstantiatedTemplate);
  },

  onChangeTemplateType: function (templateType) {
    this.setState({immCurrentTemplate: this.state.immCurrentTemplate.set('type', templateType)});
  },

  onChangeFileTitle: function (e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('title', e.target.value)});
  },

  onChangeFileDescription: function (e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('description', e.target.value)});
  },

  save: function () {
    let immCurrentTemplate = this.state.immCurrentTemplate.set('queryPlan', this.refs['queryplan-input'].editor.getValue());
    let immErrors = TemplateLibrary.validateTemplate(immCurrentTemplate, this.state.immWorkingCs.get('id'), Imm.List());
    // First attempt to compile the template:
    if (!immErrors.isEmpty()) {
      //FIXME: Show the error messages properly!
      console.log(immErrors.toJS());
      return;
    }
    let immInstantiatedTemplate = TemplateLibrary.instantiateTemplate(immCurrentTemplate, this.state.immWorkingCs.get('id'), Imm.List());
    immInstantiatedTemplate = immInstantiatedTemplate.set('isAdvancedReport', true);

    // The template is legit. Try to save the report.
    let immNewFile = this.state.immCurrentFile.set('templatedReport', immInstantiatedTemplate);
    if (this.props.params.advancedReportId) {  // We're in edit template mode.
      if (immNewFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.delete('folderId');
      }
      _.each(GA.GAHelper.extractEditOperations(this.state.immSavedFile.toJS(), immNewFile.toJS()), function (editOperation) {
        GA.sendDocumentEdit(this.props.params.advancedReportId, GA.DOCUMENT_TYPE.ADVANCED_REPORT, editOperation);
      }, this);
      // The queryPlan is hidden inside the templatedReport so this was the most efficient way to see if they are different.
      if (this.state.immSavedFile.getIn(['templatedReport', 'template', 'queryPlan']) !== immNewFile.getIn(['templatedReport', 'template', 'queryPlan'])) {
        GA.sendDocumentEdit(this.props.params.advancedReportId, GA.DOCUMENT_TYPE.ADVANCED_REPORT, 'QUERYPLAN');
      }
      ExposureActions.reportCreationViewUpdateReport(this.props.params.advancedReportId, immNewFile, this.finalizeSave);
    } else {  // We're in new template mode.
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.ADVANCED_REPORT);
      ExposureActions.reportCreationViewCreateReport(immNewFile, this.finalizeSave, /* forceEmit = */ true);
    }
  },

  finalizeSave: function (advancedReportId) {
    let immSavedFile = this.state.immCurrentFile.set('id', advancedReportId.id);
    this.setState({
      immCurrentFile: immSavedFile,
      immSavedFile: immSavedFile,
      immSavedTemplate: this.state.immCurrentTemplate
    });
    this.context.router.push({name: RouteNameConstants.EXPOSURE_REPORTS_SHOW, params: {fileId: advancedReportId.id}});
  },

  isDirty: function () {
    return !this.props.immExposureStore.get('isLoadingFile') && !Imm.is(this.state.immSavedTemplate, this.state.immCurrentTemplate) || !Imm.is(this.state.immSavedFile, this.state.immCurrentFile);
  },

  unsavedWorkModalCopy() {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_REPORT,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  handleQueryPlan: function (queryPlan) {
    this.setState({immCurrentTemplate: this.state.immCurrentTemplate.set('queryPlan', queryPlan)});
  },

  onChangeSchema: function (dropdownValue) {
    this.setState({
      immWorkingCs: this.getWorkingCs(this.props.immExposureStore.getIn(['comprehendSchemas', dropdownValue.idx])),
      immCurrentFile: this.state.immCurrentFile.setIn(['templatedReport', 'comprehendSchemaId'], dropdownValue.value)
    });
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
      })
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
    if(this.state.immSavedFile.get('rank') && this.state.immSavedFile.get('rank').size > 0) {
      updatedRanksDetails= Util.updateRankDetails(rankDetails, this.state.immSavedFile.get('rank').toJS());
    } else {
      updatedRanksDetails = rankDetails;
    } 
  
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('tags', tags).set('modules', modules).set('rank', updatedRanksDetails),
      immCurrentFileCopy: this.state.immCurrentFileCopy.set('rank', updatedRanksDetails).set('tags', Imm.fromJS(dropdownValue))
    });
  },

  render: function () {
    if (this.props.immExposureStore.get('isLoadingFile') || this.props.immExposureStore.getIn(['files', this.props.params.advancedReportId, 'fileRequestInFlight'], false)) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }

    let immComprehendSchemas = this.props.immExposureStore.get('comprehendSchemas');
    let immCurrentTemplate = this.state.immCurrentTemplate;
    let immCurrentFile = this.state.immCurrentFile;
    let immCurrentFileCopy = this.state.immCurrentFileCopy;
    let inEditMode = !_.isEmpty(this.props.params.advancedReportId);
    let isTemplateSaved = !this.isDirty();
    let headerText = inEditMode ? FrontendConstants.EDIT_TEMPLATE_ADVANCED_REPORT : FrontendConstants.CREATE_TEMPLATE_ADVANCED_REPORT;
    const immDrilldownTargets = immCurrentFile.get('drilldownFileIdMap');
    let modules = immCurrentFileCopy.get('modules');
    let tags = immCurrentFileCopy.get('tags');
    let tagsToShow = immCurrentFileCopy.get('tagsToShow');
  
    let immFilesAccessible = Util.getAllReportsAndDashboards(this.props.immExposureStore, /* returnImmutable */ true).filter(fileAccessible => fileAccessible.id !== immCurrentFile.get('id'));

    let immIncludedDynamicFilters = null;
    let immIncludedStaticFilters = null;
    let allFiltersValid = false;
    if (!_.isNull(this.state.immWorkingCs)) {
      immIncludedDynamicFilters = this.getIncludedDynamicFilters(immCurrentFile);
      immIncludedStaticFilters = this.getIncludedStaticFilters(immCurrentFile);
      allFiltersValid = this.sanityCheckFilters(immCurrentFile);
    }

    let reportInvalid = _.isEmpty(immCurrentFile.get('title')) || _.isEmpty(immCurrentTemplate.get('type')) || !allFiltersValid;
    let content = [];
    if (this.previewAvailable()) {
      // TODO: consolidate this with GraphicalReportWidget.
      let ret = this.getPreview();
      if (_.isArray(ret)) {
        content = ret;
      } else {
        content[0] = ret;
      }
    }

    return div({className: 'studio'},
      div({className: 'page-header'},
        div({className: 'title'}, headerText)),
      div({className: 'studio-editor'},
        div({className: 'schema-section'},
          div({className: 'entry-text'}, inEditMode ? FrontendConstants.REPORT_SCHEMA : FrontendConstants.SELECT_A_SCHEMA),
          Combobox({
            key: 'schema-dropdown',
            className: 'schema-dropdown',
            options: immComprehendSchemas ? immComprehendSchemas.map(function (immComprehendSchema, idx) {
              return {idx: idx, text: immComprehendSchema.get('name'), value: immComprehendSchema.get('id')};
            }).toList() : Imm.List(),
            valueKey: 'value',
            labelKey: 'text',
            passOnlyValueToChangeHandler: false,  // Ensures we're returning the whole option object rather than just the value.
            value: _.isNull(this.state.immWorkingCs) ? '' : this.state.immWorkingCs.get('id'),
            onChange: this.onChangeSchema
          }),
          _.isNull(immComprehendSchemas) || _.isNull(this.state.leftPanelWidth) ? null :
            SchemaTreeView({
              columnCheckboxOnly: true,
              disableToggleButtons: true,
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
          maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH
        }),
        div({className: 'entry-text'}, FrontendConstants.DESCRIPTION),
        InputWithPlaceholder({
          type: 'textarea',
          className: 'textarea description-input',
          onChange: this.onChangeFileDescription,
          rows: 1,
          value: immCurrentFile.get('description'),
          placeholder: FrontendConstants.DESCRIPTION,
          maxLength: 512
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
        div({className: 'entry-text'}, FrontendConstants.TEMPLATE_TYPE),
        Combobox({
          key: 'report-type-dropdown',
          className: 'report-type-dropdown',
          searchable: false,
          options: Imm.fromJS([{label: 'Graphical', value: ExposureAppConstants.TEMPLATE_TYPE_CHART}, {
            label: 'Tabular',
            value: ExposureAppConstants.TEMPLATE_TYPE_TABULAR
          }]),
          value: immCurrentTemplate.get('type'),
          onChange: this.onChangeTemplateType
        }),
        div({key: 'applied-filters-label', className: 'entry-text'},
          FrontendConstants.DYNAMIC_FILTERS,
          SimpleAction({
            class: 'add-applied-filter icon-plus-circle2',
            title: FrontendConstants.ADD_DYNAMIC_FILTER,
            onClick: this.addNewIncludedDynamicFilter
          })),
        div({className: 'dynamic-filters-tip'}, FrontendConstants.DYNAMIC_FILTERS_TIP),
        immIncludedDynamicFilters,
        immIncludedStaticFilters,
        ClickableText({
          className: 'add-static-filter',
          icon: 'icon-plus-circle2',
          text: FrontendConstants.ADDITIONAL_STATIC_FILTER,
          handleClick: this.handleAddStaticFilter
        }),
        div({className: 'drilldown-targets-panel'},
          div({className: 'entry-text'}, FrontendConstants.DRILLDOWN_OPTIONS),
          div(null, FrontendConstants.DEFINE_DRILLDOWN_OPTIONS),
          DrilldownTargetSelector({immFilesAccessible, immDrilldownTargets, onChange: this.handleDrilldownTargetSelect})
        ),
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
        ),
        div({className: 'entry-text'}, FrontendConstants.TEMPLATE_QUERYPLAN),
        div({className: 'in-scope-text'}, QueryUtils.IN_SCOPE_EXPLANATION),
        CodeMirrorEditor({
          ref: 'queryplan-input',
          key: 'queryplan-input',
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true,
          dragDrop: true,
          initialValue: immCurrentTemplate.get('queryPlan', ''),
          onChange: this.handleQueryPlan,
          extraKeys: {'`': 'autocomplete'}
        }),
        Button({
          icon: 'icon-loop2 btn-save', children: FrontendConstants.SAVE, isPrimary: true, onClick: this.save,
          isDisabled: reportInvalid || isTemplateSaved
        }),
        Button({
          icon: 'icon-loop btn-render',
          children: FrontendConstants.RENDER,
          isPrimary: true,
          onClick: this.handleRenderPreview
        })),
        div({ className: 'studio-preview' }, (content.length > 0) ? content.map(function (c) { return c }) : this.state.showContentPlaceHolder ? ContentPlaceholder({ height: this.props.contentPlaceholderHeight }) : ''))
  }
});

module.exports = withTransitionHelper(AdvancedReportStudio);
