import {listOfModules, listOfTags} from "../../constants/ModulesFocusTags";
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import AccountUtil from '../../util/AccountUtil';
import {withTransitionHelper} from '../RouterTransitionHelper';

require('codemirror/lib/codemirror.css');
require('codemirror/mode/javascript/javascript');

var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');

var DataSelector = React.createFactory(require('./DataSelector'));
var PreviewRenderMixin = require('./PreviewRenderMixin');
var ActionInputBox = React.createFactory(require('../ActionInputBox'));
var Button = React.createFactory(require('../Button'));
var Checkbox = React.createFactory(require('../Checkbox'));
var ClickableText = React.createFactory(require('../ClickableText'));
var CodeMirrorEditor = React.createFactory(require('../CodeMirrorEditor'));
var Combobox = React.createFactory(require('../Combobox'));
var Highchart = React.createFactory(require('../Highchart'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var CheckboxContainer = React.createFactory(require('../CheckboxContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ModalDialogContent = require('../ModalDialogContent');
var Spinner = React.createFactory(require('../Spinner'));
var Tabs = React.createFactory(require('../Tabs'));
var ExposureActions = require('../../actions/ExposureActions');
var AggregateConstants = Imm.fromJS(require('../../constants/AggregateConstants'));
var DataTypeConstants = require('../../constants/DataTypeConstants');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ModalConstants = require('../../constants/ModalConstants');
var ParameterTypeConstants = require('../../constants/ParameterTypeConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var TemplateTypeConstants = require('../../constants/TemplateTypeConstants');
var GA = require('../../util/GoogleAnalytics');
var ImmEmptyFile = require('../../util/ImmEmptyFile');
var TemplateLibrary = require('../../util/TemplateLibrary');
var Util = require('../../util/util');

var div = DOM.div;
var span = DOM.span;

var templateIcons = {
  TABULAR_TEMPLATE: 'icon-table',
  CHART_TEMPLATE: 'icon-stats'
};

var ListTemplate = React.createFactory(class extends React.Component {
  static propTypes = {
    handleClick: PropTypes.func.isRequired,
    immTemplates: PropTypes.instanceOf(Imm.Map).isRequired,
    listName: PropTypes.string.isRequired,
    selectedId: PropTypes.string.isRequired
  };

  render() {
    const templates = this.props.immTemplates
      .toList()
      .sortBy((t) => t.get('title').toUpperCase())
      .map(function (immTemplate, idx) {
        const isSelected = immTemplate.get('id') === this.props.selectedId;
        return div({
            className: cx('list-template-item', {selected: isSelected}),
            key: 'list-template-item-' + idx,
            onClick: this.props.handleClick.bind(null, immTemplate.get('id'))
          },
          div({className: 'list-template-item-icon ' + templateIcons[immTemplate.get('type')]}),
          div({className: 'list-template-item-content'},
            div({className: 'list-template-item-title text-truncation'}, immTemplate.get('title')),
            div({className: 'list-template-item-description text-truncation'}, immTemplate.get('description'))),
          isSelected ? div({className: 'icon-checkmark-circle'}): null);
      }, this);

    return div({className: 'list-template'},
      div({className: 'list-template-title'}, this.props.listName + ' (' + this.props.immTemplates.size + ')'),
      templates);
  }
});

var AdhocReportStudio = createReactClass({
  displayName: 'AdhocReportStudio',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },


  contextTypes: {
    router: PropTypes.object
  },

  mixins: [PreviewRenderMixin],

  getInitialState: function () {
    var immEmptyFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_REPORT).set('templatedReport', Imm.fromJS({
      template: {},
      advancedConfigOverrides: [],
      comprehendSchemaId: null,
      modules: [],
      tags: [],
      tagsToShow: Imm.List(), // to populate tags according to the module/s selected
    }));
    var immInitialFile = this.toImmInitialFile(this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], immEmptyFile));

    return {
      tab: ExposureAppConstants.ADHOC_REPORT_TABS.TEMPLATE,
      errors: Imm.Map(),
      // Move to props when wiring up with the store.
      selectedTemplateId: null,
      isOpenAdvancedConfiguration: false,
      expandPreview: false,
      definitionPaneWidth: null,
      dataSelectorPath: null,
      dataSelectorColumn: null,
      preview: {
        layout: null,
        vizspecs: null
      },
      immInitialFile: immInitialFile,
      immCurrentFile: immInitialFile,
      immCurrentFileCopy: immInitialFile,
      immTemplates: Imm.List()       // List of all templates (files)
    };
  },

  tabs: [],

  componentWillMount: function () {
    this.tabs[ExposureAppConstants.ADHOC_REPORT_TABS.TEMPLATE] = this.reportCreatorTemplateTab;
    this.tabs[ExposureAppConstants.ADHOC_REPORT_TABS.DATA] = this.reportCreatorDataTab;
    this.tabs[ExposureAppConstants.ADHOC_REPORT_TABS.OPTIONS] = this.reportCreatorOptionsTab;
  },

  componentWillReceiveProps: function (nextProps) {
    var stateObject = {};
    var immCurrentTemplates = this.state.immTemplates;
    var immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var fileIsUpdated = !immNextFile.equals(immCurrentFile);
    var immNextTemplates = this.getFilterTemplates(nextProps.immExposureStore.get('templates'), immNextFile);

    // Set up the state object to include the next templates
    stateObject.immTemplates = immNextTemplates;

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

    if ((fileIsUpdated || !Imm.is(immCurrentTemplates, immNextTemplates) || !this.state.selectedTemplateId) && !immNextTemplates.isEmpty()) {
      var selectedTemplateId = this.getSelectedTemplateId(immNextFile, immNextTemplates);
      stateObject.selectedTemplateId = selectedTemplateId;
      if (!immNextFile.getIn(['templatedReport', 'template', 'id'])) {  // If the file doesn't have a templatedReport, set the default selected template.
        stateObject.immCurrentFile = this.state.immCurrentFile.setIn(['templatedReport', 'template'], this.setDefaultValueForParameters(immNextTemplates.get(selectedTemplateId)));
        stateObject.immInitialFile = this.state.immInitialFile.setIn(['templatedReport', 'template'], this.setDefaultValueForParameters(immNextTemplates.get(selectedTemplateId)));
      }
    }

    if (!immNextFile.isEmpty() && fileIsUpdated) {
      // Currently, we use input boxes to display dynamic filters.
      // We need to convert actual included dynamic filter to a string value (ie: 'datasourceName.nodeShortName.propertyShortName').
      var immNewFile = this.toImmInitialFile(immNextFile);
      _.extend(stateObject, {
        immCurrentFile: immNewFile,
        immInitialFile: immNewFile,
      });
    }
    this.setState(stateObject);
  },

  /**
   * For the templates list, if we have KPI studio licensed, we should only show GPP & Cohort templates, AS WELL AS templates for the initial file
   * This way when a user edits an existing template that is an old type, they'll be able to access the editor without it crashing
   */
  getFilterTemplates(templatesList, file) {
    const immAppConfig = comprehend.globals.immAppConfig;
    const hasKPIStudio = AccountUtil.hasKPIStudio(immAppConfig);
    const immAllTemplates = templatesList;

    // If KPI Studio is off, then we'll show all templates
    if (!hasKPIStudio) {
      return immAllTemplates;
    }

    // If we haven't loaded any templates, then return the empty map
    if (immAllTemplates.isEmpty()) {
      return immAllTemplates;
    }

    // Set the base filter list
    let immFilterTemplates = Imm.List([
      "4fe13810-2baf-472a-84d9-5bf0d9e5e7d6",  // GPP
      "430f0947-0ee2-4dd6-9d29-364a5636a0ba",  // Cohort Analysis - Subject Trend against Baseline
      "b41151a6-279f-4587-83a7-4b7309d2bd4d" ,  // Cohort Analysis - Avg Results Trend
    ]);

    const fileId = file.get('id', null);
    // If we have a file ID (in edit mode), then we need to include that in the list of templates
    if (fileId) {
      // Get the template ID for the initially loaded template (when editing an existing file)
      const initialTemplateId = this.getSelectedTemplateId(file, immAllTemplates);

      if (!immFilterTemplates.includes(initialTemplateId)) {
        immFilterTemplates = immFilterTemplates.push(initialTemplateId);
      }
    }

    return immAllTemplates.filter(template => immFilterTemplates.includes(template.get('id')));
  },

  componentDidMount: function () {
    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }
    if (this.props.params.fileId) {
      ExposureActions.fetchFile(this.props.params.fileId);
    }

    ExposureActions.templatesFetch();
    window.addEventListener('resize', this.handleResize);
  },

  componentDidUpdate: function (prevProps, prevState) {
    var stateObject = {};
    if (!prevState.isOpenAdvancedConfiguration && this.state.isOpenAdvancedConfiguration && this.refs['codeMirror']) {
      this.initCodeMirror();
    }
    if (_.isNull(this.state.definitionPaneWidth)) {
      this.handleResize();
    }
    // We need to notify Highchart to update because we don't pass width and height to the component.
    if (this.state.expandPreview !== prevState.expandPreview || this.state.dataSelectorPath !== prevState.dataSelectorPath) {
      if (this.state.expandPreview || !_.isNull(this.state.dataSelectorPath)) {
        // TODO: figure a way to force .report-preview to expand its height to match .report-definition height
        // using css.
        $('.report-preview').height($('.report-definition').height());
      }
      if (this.refs['highchart-wrapper']) {
        this.refs['highchart-wrapper'].forceUpdate();
      }
    }
    //added this for dynamic filters for gpp template
    let gppSpecificDynamicFilters = ['study.studyname', 'dm.arm', 'site.sitename', 'subject.usubjid', 'rpt_lab_information.lbcat', 'rpt_lab_information.lbtestcd','rpt_lab_information.lbdtc']
    if (prevState.selectedTemplateId != this.state.selectedTemplateId) {
      if (!this.props.params.fileId) {
        if (this.state.selectedTemplateId == '4fe13810-2baf-472a-84d9-5bf0d9e5e7d6') {
          stateObject.immCurrentFile = this.state.immCurrentFile.setIn(['includedDynamicFilters'], Imm.List(gppSpecificDynamicFilters));
          stateObject.immInitialFile = this.state.immInitialFile.setIn(['includedDynamicFilters'], Imm.List(gppSpecificDynamicFilters));
        }
        else {
          stateObject.immCurrentFile = this.state.immCurrentFile.setIn(['includedDynamicFilters'], Imm.List([null]));
          stateObject.immInitialFile = this.state.immInitialFile.setIn(['includedDynamicFilters'], Imm.List([null]));
        }
      }
    }
    if (Object.keys(stateObject).length > 0) {
      this.setState(stateObject);
    }
  },

  componentWillUnmount: function () {
    window.removeEventListener('resize', this.handleResize);
  },

  initCodeMirror: function () {
    var cm = this.refs['codeMirror'].editor;
    // CodeMirror doesn't respect css settings so we have to set its size.
    cm.setSize('100%', '100%');
    cm.getDoc().setValue(JSON.stringify(this.state.immCurrentFile.getIn(['templatedReport', 'advancedConfigOverrides'], Imm.List())
      .map(function (str) {
        return JSON.parse(str);
      })
      .toJS(), null, 2));
    cm.focus();
  },

  createSavedMessages: function (immSavedFile) {
    if (this.state.immCurrentFile.get('includedDynamicFilters').filterNot(_.isNull).size > immSavedFile.get('includedDynamicFilters').filterNot(_.isNull).size) {
      ExposureActions.createStatusMessage(
        immSavedFile.getIn(['templatedReport', 'comprehendSchemaId'], false) ?
          FrontendConstants.DYNAMIC_FILTERS_DISCARDED_INVALID :
          FrontendConstants.DYNAMIC_FILTERS_DISCARDED_NO_SCHEMA,
        StatusMessageTypeConstants.WARNING);
    }
    ExposureActions.createStatusMessage(FrontendConstants.HAS_BEEN_SAVED(immSavedFile.get('title')), StatusMessageTypeConstants.TOAST_SUCCESS);
  },

  reportNameIsNotValid: function () {
    //TODO: We might also want to check for duplicate titles...
    return Util.isWhiteSpaceOnly(this.state.immCurrentFile.get('title', ''));
  },

  // Wrapper for event generated report name checks to avoid warning about return values to events.
  handleReportNameCheck: function () {
    if (!_.isUndefined(this.state.immCurrentFile.get('title')) && this.reportNameIsNotValid()) {
      this.setState({errors: this.state.errors.merge({title: FrontendConstants.REPORT_NAME_IS_REQUIRED})});
    }
  },

  clearError: function (parameterName) {
    var clearedParameter = {};
    clearedParameter[parameterName] = null;
    this.setState({errors: this.state.errors.merge(clearedParameter)});
  },

  checkIfSchemaSelected: function (immParameter) {
    if (!this.state.immCurrentFile.getIn(['templatedReport', 'comprehendSchemaId'], null)) {
      var result = {};
      result[immParameter.get('name')] = FrontendConstants.PLEASE_SELECT_A_SCHEMA_ABOVE_TO_PROCEED;
      this.setState({errors: this.state.errors.merge(result)});
    }
  },

  validateParameter: function (immParameter) {
    var result = {};
    var schemaId = this.state.immCurrentFile.getIn(['templatedReport', 'comprehendSchemaId']);
    // If there are no errors validateParameter will return null, if there is an
    // issue it will return an error message. Either way the result is
    // associated with the parameter name for later retrieval.
    result[immParameter.get('name')] = TemplateLibrary.validateParameter(immParameter, schemaId, this.updateErrorsCallback.bind(null, null));
    this.setState({errors: this.state.errors.merge(result)});
  },

  handleResize: function () {
    var width = $('.report-definition').width();
    if (width) {
      this.setState({definitionPaneWidth: width});
    }
  },

  toImmIncludedDynamicFilters: function (immDynamicFilterStrs) {
    // Matches "nodeShortName.propertyShortName" or '"node.shortname"."property.shortname"'.
    var dynamicFilterRegex = /^("[^"]+"|[^.]+)\.("[^"]+"|[^.]+)$/;
    var schemaId = this.state.immCurrentFile.getIn(['templatedReport', 'comprehendSchemaId']);
    if (!schemaId) {
      return Imm.List();
    }
    var immComprehendSchema = this.props.immExposureStore.getIn(['comprehendSchemas', schemaId]);

    return immDynamicFilterStrs.flatMap(function (dynamicFilterStr) {
      var matchedArr = dynamicFilterStr ? dynamicFilterStr.match(dynamicFilterRegex) : null;
      if (matchedArr) {
        // nodePath consists of [datasourceName, nodeShortName, propertyShortName].
        var nodePath = _.rest(matchedArr);
        var immNodes = immComprehendSchema.get('datasources').flatMap(function (immDatasource) {
          return immDatasource.get('nodes');
        });
        var immProperties = immNodes.find(function (immNode) {
          return immNode.get('shortName') === nodePath[0];
        }).get('properties');
        if (immProperties) {
          var immProperty = immProperties.find(function (immProperty) {
            return immProperty.get('shortName') === nodePath[1];
          });
          if (immProperty) {
            var filterType;
            switch (immProperty.get('dataType')) {
              case DataTypeConstants.DATE:
              case DataTypeConstants.DATETIME:
              case DataTypeConstants.DECIMAL:
              case DataTypeConstants.INTEGER:
                filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER;
                break;
              default:
                filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN;
            }
            return Imm.fromJS([{
              column: {
                nodeShortName: nodePath[0],
                propertyShortName: nodePath[1]
              },
              filterType: filterType
            }]);
          }
        }
      }
    });
  },

  // Currently, we use input boxes to display dynamic filters.
  // Before saving the report, we need to convert the value (ie: 'datasourceName.nodeShortName.propertyShortName')
  // from these boxes to an included dynamic filter.
  toImmInitialFile: function (immFile) {
    var escapeDotWithDoubleQuotes = function (str) {
      return _.contains(str, '.') ? '"' + str + '"' : str;
    };

    if (immFile.get('includedDynamicFilters').isEmpty()) {
      immFile = immFile.set('includedDynamicFilters', Imm.List([null]));
    } else {
      immFile = immFile.update('includedDynamicFilters', function (immIncludedDynamicFilters) {
        return immIncludedDynamicFilters.map(function (immIncludedDynamicFilter) {
          var immColumn = immIncludedDynamicFilter.get('column');
          return escapeDotWithDoubleQuotes(immColumn.get('nodeShortName')) + '.' +
            escapeDotWithDoubleQuotes(immColumn.get('propertyShortName'));
        });
      });
    }
    if (immFile.get('includedStaticFilters').isEmpty()) {
      immFile = immFile.set('includedStaticFilters', Imm.List([null]));
    }
    return immFile;
  },

  // TODO: validate input fields.
  reportCreatorTemplateTab: function () {
    var tab = this.state.tab;
    var immTemplates = this.state.immTemplates;
    if (!this.state.immTemplates.isEmpty() && !this.state.selectedTemplateId) {
      return Spinner();
    }

    var immSelectedTemplate = immTemplates.get(this.state.selectedTemplateId);
    var choices = immSelectedTemplate.get('parameters').flatMap(function (param) {
      return param.get('choices');
    }).join(', ');
    var titleError = this.state.errors.get('title', null);

    return {
      preview: [
        div({className: 'page-header', key: 'preview-header'}, div({className: 'title'}, FrontendConstants.PREVIEW)),
        div({className: 'preview-template-thumbnail', key: 'preview-template-thumbnail'},
          div({className: cx('thumbnail-icon', templateIcons[immSelectedTemplate.get('type')])})),
        div({
          className: 'preview-template-type',
          key: 'preview-template-type'
        }, TemplateTypeConstants[immSelectedTemplate.get('type')]),
        choices ? div({
          className: 'preview-template-category',
          key: 'preview-template-category'
        }, 'Category: ', choices) : null,
        div({
          className: 'preview-template-description',
          key: 'preview-template-description'
        }, immSelectedTemplate.get('description'))],
      content: div({className: 'tab-content'},
        InputBlockContainer({
          title: FrontendConstants.REPORT_NAME,
          titleClass: 'section-title',
          errorClass: 'report-name-error',
          errorMsg: titleError,
          inputComponent: InputWithPlaceholder({
            type: 'text',
            className: cx('text-input', 'report-name', {'invalid-input': titleError}),
            placeholder: FrontendConstants.REPORT_NAME,
            onChange: this.handleEditReportName,
            onBlur: this.handleReportNameCheck,
            value: this.state.immCurrentFile.get('title'),
            maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH
          })
        }),
        ListTemplate({
          listName: FrontendConstants.SIMPLE,
          immTemplates: immTemplates,
          selectedId: this.state.selectedTemplateId,
          handleClick: this.handleListTemplateItemClick
        })
      ),
      footer: div({className: 'footer'},
        Button({
          key: 'next-template',
          classes: {next: true},
          isPrimary: true,
          onClick: this.handleTemplateNextButtonClick.bind(null, tab, ExposureAppConstants.ADHOC_REPORT_TABS.DATA, false)
        }, FrontendConstants.NEXT))
    };
  },

  /**
   * Used in generating the items for the options and value props of the Combobox.
   */
  convertComprehendSchemaToOption: immComprehendSchema => immComprehendSchema ? Imm.fromJS({
    label: immComprehendSchema.get('name'),
    value: immComprehendSchema.get('id')
  }) : null,

  // TODO: validate input fields.
  reportCreatorDataTab: function () {
    var tab = this.state.tab;
    var immCurrentFile = this.state.immCurrentFile;
    var immTemplatedReport = immCurrentFile.get('templatedReport');
    var immTemplatedReportTemplate = immTemplatedReport.get('template');
    var immComprehendSchemas = this.props.immExposureStore.get('comprehendSchemas');
    var selectedComprehendSchema = immTemplatedReport.get('comprehendSchemaId');

    var dynamicFilters = immCurrentFile.get('includedDynamicFilters').map(function (filter, idx) {
      return InputBlockContainer({
        key: 'dyn-filter-' + idx,
        class: cx('data-input', 'dynamic-filter'),
        title: div({className: 'filter-title'}, FrontendConstants.DYNAMIC_FILTER(idx + 1), (immCurrentFile.get('includedDynamicFilters').size > 1) ? span({
          className: 'icon-remove',
          onClick: this.handleRemoveDynamicFilter.bind(null, idx)
        }) : null),
        inputComponent:
          ActionInputBox({
            className: 'filter-input',
            inputProps: {
              type: 'text',
              onChange: this.handleUpdateDynamicFilters.bind(null, idx),
              value: filter,
              className: 'text-input',
              placeholder: FrontendConstants.ENTER_CQL_OR_BROWSE
            },
            actionOnFocus: this.handleToggleDataSelector.bind(null, idx, ExposureAppConstants.DATA_SELECTOR_FILTERS, false),
            actionClass: {selected: idx === this.state.dataSelectorPath && ExposureAppConstants.DATA_SELECTOR_FILTERS == this.state.dataSelectorSource},
            actionIconClass: 'icon-arrow-right2'
          })
      })
    }, this);
    var staticFilters = immCurrentFile.get('includedStaticFilters').map(function (filter, idx) {
      return InputBlockContainer({
        key: 'static-filter-' + idx,
        class: cx('data-input', 'static-filter'),
        title: div({className: 'filter-title'}, FrontendConstants.STATIC_FILTER(idx + 1), span({
          className: 'icon-Pop_out',
          onClick: this.handleToggleDataSelector.bind(null, -1, null, true)
        }), ((immCurrentFile.get('includedStaticFilters').size > 1) ? span({
          className: 'icon-remove',
          onClick: this.handleRemoveStaticFilter.bind(null, idx)
        }) : null)),
        inputComponent: InputWithPlaceholder({
          type: 'text',
          key: 'parameter-measure-' + idx,
          className: cx('text-input', 'filter-input'),
          placeholder: FrontendConstants.ENTER_CQL,
          onChange: this.handleUpdateStaticFilters.bind(null, idx),
          value: filter
        })
      })
    }, this);
    var parameters = immTemplatedReportTemplate.get('parameters').map(this.generateParameters.bind(this, this.handleTemplatedReportParameter, true));
    let chartParameters = immTemplatedReportTemplate.get('parameters').map(this.generateParameters.bind(this, this.handleTemplatedReportParameter, true)).filter(function (component) {
      return !_.isUndefined(component);
    });

    var schemaErrorMsg = this.state.errors.get('schema', null);
    let infoParam =  chartParameters.filter(x => x.props.children[0].key.includes("info-param"));
    let constParam = chartParameters.filter(x => x.props.children[0].key.includes("constant-param"));
    let constSplitPoint = constParam.size - 2;
    let infoSplitPoint = Math.ceil(infoParam.size / 3.0);

    var nextButton = Button({
      key: 'next-data',
      classes: {next: true},
      isLoading: this.parametersAreLoading(),
      isPrimary: true,
      onClick: this.handleDataNextButtonClick.bind(null, ExposureAppConstants.ADHOC_REPORT_TABS.OPTIONS, true)
    }, FrontendConstants.NEXT);
    var rightPane;
    if (!_.isNull(this.state.dataSelectorPath)) {
      rightPane = div(null,
        div({className: 'page-header', key: 'preview-header'},
          div({className: 'title'}, FrontendConstants.DATA_SELECTOR),
          div({className: 'icon-close-alt', onClick: this.handleToggleDataSelector.bind(null, null)})),
        this.getDataSelector());
    } else {
      rightPane = div(null,
        div({className: 'page-header', key: 'preview-header'},
          div({className: 'title'}, this.state.dataSelectorPath ? FrontendConstants.DATA_SELECTOR : FrontendConstants.PREVIEW),
          div({
            className: this.state.expandPreview ? 'icon-contract' : 'icon-expand2',
            onClick: this.handleExpandPreviewPane
          })),
        this.getPreviewContent(),
        Button({
          classes: {render: true},
          key: 'render',
          isSecondary: true,
          onClick: this.handleRenderPreview,
          icon: 'icon-loop2'
        }, FrontendConstants.RENDER));
    }
    let dataParametersSection;
    let templateId = immTemplatedReportTemplate.get('id');
    if(templateId == "4fe13810-2baf-472a-84d9-5bf0d9e5e7d6" && infoParam.size > 0){
      dataParametersSection = div({className: cx('parameters', 'underline')},
      div({className: cx('parameters', 'left')}, constParam.take(constSplitPoint)),
      div({className:'info-title'}, FrontendConstants.INFOGRAPHIC_LABELS),
      div({className: cx('parameters', 'left')}, constParam.skip(constSplitPoint).take(2)),
      div({className: 'info-sub-title'}, FrontendConstants.DEFAULT_SUBJECT_INFORMATION, span({className: 'side-padding'}, FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN)),
      div({className: 'chart-constant-parameters'},infoParam.take(infoSplitPoint)),
      div({className: 'chart-constant-parameters'},infoParam.skip(infoSplitPoint).take(infoSplitPoint)),
      div({className: 'chart-constant-parameters'},infoParam.skip(8))) }
    else{
      dataParametersSection =   div({className: cx('parameters', 'underline')}, parameters)
    }

    return {
      preview: rightPane,
      content: div({className: 'tab-content'},
        div({className: 'section-title'}, FrontendConstants.DATA_ELEMENTS_FOR(immTemplatedReportTemplate.get('title'))),
        div({className: 'schema-selector'},
          InputBlockContainer({
            title: FrontendConstants.COMPREHEND_SCHEMA,
            titleClass: 'schema-dropdown-title',
            errorMsg: schemaErrorMsg,
            inputComponent: Combobox({
              key: 'schema-dropdown',
              placeholder: FrontendConstants.PLEASE_SELECT_A_SCHEMA_TO_PROCEED,
              className: cx('schema-dropdown', {'invalid-input': schemaErrorMsg}),
              options: immComprehendSchemas ? immComprehendSchemas.map(this.convertComprehendSchemaToOption).toList() : Imm.List(),
              value: immComprehendSchemas ? this.convertComprehendSchemaToOption(immComprehendSchemas.find(immComprehendSchema => immComprehendSchema.get('id') === selectedComprehendSchema)) : null,
              onChange: this.handleSchema
            })})),
        div({className: cx('section-title', 'small')}, FrontendConstants.PARAMETERS),
        dataParametersSection,
        div({className: 'filter-wrapper'},
          div({className: cx('section-title', 'small')}, 'Filters', span({className: 'small-side-padding'}, FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN)),
          div({className: 'filter-inputs'},
            dynamicFilters,
            ClickableText({
              className: 'add-dynamic-filter',
              icon: 'icon-plus-circle2',
              text: FrontendConstants.ADDITIONAL_DYNAMIC_FILTER,
              handleClick: this.handleAddDynamicFilter
            }),
            staticFilters,
            ClickableText({
              className: 'add-static-filter',
              icon: 'icon-plus-circle2',
              text: FrontendConstants.ADDITIONAL_STATIC_FILTER,
              handleClick: this.handleAddStaticFilter
            })),
          div({className: 'filter-instructions'},
            div({className: 'filter-instructions-line'}, FrontendConstants.THERE_ARE_TWO_TYPES_OF_FILTERS),
            div({className: 'filter-instructions-line'}, span({className: 'bold'}, FrontendConstants.DYNAMIC), ' - ', FrontendConstants.DYNAMIC_FILTERS_INSTRUCTIONS),
            div({className: 'filter-instructions-line'}, span({className: 'bold'}, FrontendConstants.STATIC), ' - ', FrontendConstants.STATIC_FILTERS_INSTRUCTIONS)))
      ),
      footer: div({className: 'footer'},
        nextButton,
        span({
          className: cx('text-link', 'save-and-exit'),
          onClick: this.handleSaveReport.bind(null, this.goToReports, true)
        }, FrontendConstants.OR_SAVE_AND_EXIT)
      )
    };
  },

  reportCreatorOptionsTab: function () {
    var tab = this.state.tab;
    var immCurrentFile = this.state.immCurrentFile;
    var immTemplatedReport = immCurrentFile.get('templatedReport');
    var immTemplatedReportTemplate = immTemplatedReport.get('template');
    var immFilesAccessible = Util.getAllReportsAndDashboards(this.props.immExposureStore, /* returnImmutable = */ true).filterNot(fileAccessible => fileAccessible.id === this.props.params.fileId);

    var immAssociatedFiles = immCurrentFile.get('associatedFileIds').toSeq().map(function (fileId) {
      return Imm.fromJS({
        id: fileId,
        text: this.props.immExposureStore.getIn(['fileConfigs', fileId, 'title'], ''),
        type: this.props.immExposureStore.getIn(['fileConfigs', fileId, 'fileType'], '')
      });
    }, this);

    var chartParameters = immTemplatedReportTemplate.get('parameters').map(this.generateParameters.bind(this, this.handleTemplatedReportParameter, false)).filter(function (component) {
      return !_.isUndefined(component);
    });
    let constParam = chartParameters.filter(x => x.props.children[0].key.includes("constant-param"));
    let checkboxParam = chartParameters.filter(x => x.props.children[0].key.includes("checkbox-param"));
    let splitPoint = Math.ceil(chartParameters.size / 2.0);  // Calculate split point to divide elements into vertical columns.
    let gppSplitPoint =  Math.ceil(checkboxParam.size / 2.0);


    if (this.state.isOpenAdvancedConfiguration) {
      return {
        content: div({className: 'advanced-configuration-overlay'},
          div({className: 'icon-close-alt', onClick: this.handleAdvancedConfiguration.bind(null, false)}),
          div({className: 'advanced-configuration-body'},
            div({className: 'advanced-configuration-container'},
              div({className: 'advanced-configuration-title'}, FrontendConstants.ADVANCED_CONFIGURATION),
              div({className: 'advanced-configuration-subtitle'}, 'Edit code here'),
              this.state.parseError ? div({className: 'advanced-configuration-error'}, this.state.parseError) : null,
              CodeMirrorEditor({
                className: 'code-mirror-wrapper',
                ref: 'codeMirror',
                lineNumbers: true,
                mode: 'javascript',
                smartIndent: true
              }),
              div({className: 'advanced-configuration-buttons'},
                Button({isPrimary: true, onClick: this.handleSaveAdvancedConfiguration}, FrontendConstants.FORMAT),
                Button({
                  isSecondary: true,
                  onClick: this.handleAdvancedConfiguration.bind(null, false)
                }, FrontendConstants.CANCEL))
            )
          )
        )
      };
    }
    var titleError = this.state.errors.get('title', null);
    var createButton = Button({
      key: 'next-data',
      classes: {create: true},
      isLoading: this.parametersAreLoading(),
      isPrimary: true,
      onClick: this.handleSaveReport.bind(null, this.goToReport, true)
    }, this.props.params.fileId ? FrontendConstants.UPDATE : FrontendConstants.CREATE);

    let immCurrentFileCopy = this.state.immCurrentFileCopy;
    let modules = immCurrentFileCopy.get('modules');
    let tags = immCurrentFileCopy.get('tags');
    let tagsToShow = immCurrentFileCopy.get('tagsToShow');
    let templateId = immTemplatedReportTemplate.get('id');

    var parametersSection;
    if(templateId == "4fe13810-2baf-472a-84d9-5bf0d9e5e7d6"){
      parametersSection = div({className: 'parameters'},
      div({className:cx('chart-parameters', 'left')},constParam),
      div({className: cx('chart-parameters', 'left')},checkboxParam.take(gppSplitPoint)),
      div({className: 'chart-parameters'},checkboxParam.skip(gppSplitPoint)),
      );
    }
    else{
      parametersSection =div({className: 'parameters'},
      div({className: cx('chart-parameters', 'left')}, chartParameters.take(splitPoint)),
      div({className: 'chart-parameters'}, chartParameters.skip(splitPoint)));
    }

    return {
      preview: [
        div({className: 'page-header', key: 'preview-header'},
          div({className: 'title'}, FrontendConstants.PREVIEW),
          div({
            className: this.state.expandPreview ? 'icon-contract' : 'icon-expand2',
            onClick: this.handleExpandPreviewPane
          })),
        this.getPreviewContent(),
        Button({
          classes: {render: true},
          key: 'render',
          isSecondary: true,
          onClick: this.handleRenderPreview,
          icon: 'icon-loop2'
        }, FrontendConstants.RENDER)],
      content: div({className: 'tab-content'},
        div({className: 'section-title'}, FrontendConstants.CONFIGURATION_OPTIONS_FOR(immTemplatedReportTemplate.get('title'))),
        div({className: cx('section-title', 'small')}, FrontendConstants.TITLES_AND_LABELS),
        InputBlockContainer({
          class: 'data-input',
          title: span({className: 'bold'}, FrontendConstants.REPORT_NAME),
          errorClass: 'report-name-error',
          errorMsg: titleError,
          inputComponent: InputWithPlaceholder({
            type: 'text',
            className: cx('text-input', 'report-name', {'invalid-input': titleError}),
            placeholder: FrontendConstants.REPORT_NAME,
            onBlur: this.handleReportNameCheck,
            onChange: this.handleEditReportName,
            value: immCurrentFile.get('title')
          })
        }),
        InputBlockContainer({
          class: 'data-input',
          title: div(null, span({className: 'bold'}, FrontendConstants.DESCRIPTION), span({className: 'small-side-padding'}, FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN)),
          inputComponent: InputWithPlaceholder({
            type: 'textarea',
            className: cx('text-input', 'report-description'),
            placeholder: FrontendConstants.DESCRIPTION,
            onChange: this.handleEditDescription,
            rows: 5,
            value: immCurrentFile.get('description')
          })
        }),
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
          class: 'data-input',
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
        parametersSection,
        ClickableText({
          className: 'advanced-config-link',
          icon: 'icon-cog',
          text: FrontendConstants.ADVANCED_CONFIGURATION,
          handleClick: this.handleAdvancedConfiguration.bind(null, true)
        }),
        div({className: 'related-files-wrapper'},
          div({className: cx('section-title', 'small')}, FrontendConstants.SELECT_RELATED_DASHBOARD_REPORTS_FOR(immTemplatedReportTemplate.get('title')) + FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN),
          InputBlockContainer({
            class: 'data-input',
            title: span({className: 'bold'}, FrontendConstants.SELECT_DASHBOARDS_REPORTS),
            inputComponent: div({className: 'data-input-input-component'},
              Combobox({
                className: 'related-reports-dropdown',
                options: immFilesAccessible,
                multi: true,
                placeholder: 'Select',
                groupBy: 'type',
                labelKey: 'text',
                valueKey: 'id',
                // TODO: Add icon rendering back in.
                value: immAssociatedFiles,
                onChange: this.handleAssociatedFilesDropdownSelect
              }))
          })
        )),
      footer: div({className: 'footer'},
        createButton,
        span({
          className: cx('text-link', 'save-and-exit'),
          onClick: this.handleSaveReport.bind(null, this.goToReports, false)
        }, FrontendConstants.OR_SAVE_AND_EXIT))
    };
  },

  handleAssociatedFilesDropdownSelect: function (associatedFileIds) {
    this.setState({
      immCurrentFile: this.state.immCurrentFile.set('associatedFileIds', Imm.fromJS(associatedFileIds).toSet()).set('drilldownFileIdMap', Imm.fromJS([{
        'key': '_all',
        list: associatedFileIds
      }]))
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
    console.log("this.state.immCurrentFile:    "+JSON.stringify(this.state.immCurrentFile))
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

  handleTabSelect: function (tab) {
    if (this.state.tab !== tab) {
      this.setState({
        expandPreview: false,
        dataSelectorPath: null,
        tab: tab
      });
    }
  },

  handleTemplateNextButtonClick: function (currentTab, nextTab, force) {
    var immTemplates = this.state.immTemplates;
    var immCurrentFile = this.state.immCurrentFile;
    var immCurrentTemplatedReport = immCurrentFile.get('templatedReport');
    // Modal pops up when
    // - not forced
    // - user made changes to data tabs and attempts to change the template.
    var changingTemplate = !!immCurrentTemplatedReport.getIn(['template', 'id']) && immCurrentTemplatedReport.getIn(['template', 'id']) !== this.state.selectedTemplateId;

    var valuesEqualDefaultValues = immCurrentTemplatedReport.getIn(['template', 'parameters']).every(function (immParameter) {
      return immParameter.get('value') === immParameter.get('defaultValue');
    });

    var changedOtherTabs = !Imm.is(immCurrentTemplatedReport.get('template'), immTemplates.get(immCurrentTemplatedReport.getIn(['template', 'id']))) ||
      !Imm.is(immCurrentFile.get('includedDynamicFilters'), Imm.List([null])) ||
      !Imm.is(immCurrentFile.get('includedStaticFilters'), Imm.List([null])) ||
      immCurrentTemplatedReport.get('comprehendSchemaId');

    if (this.reportNameIsNotValid()) {
      this.setState({errors: this.state.errors.merge({title: FrontendConstants.REPORT_NAME_IS_REQUIRED})});
      ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
      return;
    }

    if (!force && changingTemplate && !valuesEqualDefaultValues && changedOtherTabs) {
      ExposureActions.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
        header: FrontendConstants.ARE_YOU_SURE,
        content: FrontendConstants.CHANGING_TEMPLATE_WARNING,
        handleCancel: ExposureActions.closeModal,
        primaryButton: {
          text: FrontendConstants.CONFIRM,
          icon: 'icon-checkmark-full',
          onClick: function () {
            ExposureActions.closeModal();
            this.handleTemplateNextButtonClick(currentTab, nextTab, true);
          }.bind(this)
        },
        secondaryButton: {
          text: FrontendConstants.CANCEL,
          onClick: ExposureActions.closeModal
        }
      });
    } else {
      var newState = {tab: nextTab, expandPreview: false, dataSelectorPath: null};
      if (immCurrentTemplatedReport.getIn(['template', 'id']) !== this.state.selectedTemplateId) {
        // if the selected template is the default template then set that in the initial template as well.
        newState.immCurrentFile = this.state.immCurrentFile.set('templatedReport', Imm.fromJS({
          template: this.setDefaultValueForParameters(immTemplates.get(this.state.selectedTemplateId)),
          comprehendSchemaId: null,
          advancedConfigOverrides: []
        }));
        newState.preview = {
          layout: null,
          vizspecs: null
        };
      }
      this.setState(newState);
    }
  },

  handleAdvancedConfiguration: function (isOpen) {
    this.setState({isOpenAdvancedConfiguration: isOpen});
  },

  handleDataNextButtonClick: function (nextTab, validate) {
    var immTemplatedReport = this.state.immCurrentFile.get('templatedReport');
    // Only prevent navigation to the next tab if data parameters have issues, i.e. don't throw on Options tab parameters.
    var immErrors = validate ? TemplateLibrary.validateTemplate(
      immTemplatedReport.get('template'),
      immTemplatedReport.get('comprehendSchemaId'),
      Imm.List(),
      true,
      this.updateErrorsCallback.bind(null, this.handleDataNextButtonClick.bind(null, nextTab, false))) : null;

    if (validate && !immErrors.isEmpty()) {
      if (!immErrors.every(function (msg) {
        return msg === FrontendConstants.VERIFYING;
      })) {
        // We have a non-informational messages, throw a toast.
        ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
      }
      this.setState({errors: this.state.errors.merge(immErrors)});
    } else {
      this.setState({tab: nextTab, expandPreview: false, dataSelectorPath: null});
    }
  },

  handleTemplatedReportParameter: function (paramIndex, paramKey, value) {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['templatedReport', 'template', 'parameters', paramIndex, paramKey], value)});
  },

  handleEditReportName: function(e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('title', e.target.value),
      errors: this.state.errors.merge({title: null})});
  },

  handleEditDescription: function (e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('description', e.target.value)});
  },

  handleSaveReport: function (navigateTo, validateForCreation) {
    var immCurrentFile = this.state.immCurrentFile;
    var immInitialFile = this.state.immInitialFile;
    var immTemplatedReport = this.state.immCurrentFile.get('templatedReport');
    var immTemplatedReportTemplate = immTemplatedReport.get('template');
    let chartParameters = immTemplatedReportTemplate.get('parameters').map(this.generateParameters.bind(this, this.handleTemplatedReportParameter, true)).filter(function (component) {
      return !_.isUndefined(component);
    });
    let infoParam =  chartParameters.filter(x => x.props.children[0].key.includes("info-param"));
    // If the user has hit the CREATE button we need to validate the report
    // properly.
    var immErrors = Imm.Map();
    if (validateForCreation) {
      var immTemplatedReport = this.state.immCurrentFile.get('templatedReport');
      immErrors = immErrors.merge(TemplateLibrary.validateTemplate(
        immTemplatedReport.get('template'),
        immTemplatedReport.get('comprehendSchemaId'),
        Imm.List(),
        false,
        this.updateErrorsCallback.bind(null, this.handleSaveReport.bind(null, navigateTo, false))));
    }

    if (this.reportNameIsNotValid()) {
      // No title has been set, flag an error. We need a title at minimum to be
      // able to save even a partial report.
      immErrors = immErrors.merge({title: FrontendConstants.REPORT_NAME_IS_REQUIRED});
    }

    if (!immErrors.isEmpty()) {
      if (!immErrors.every(function (msg) {
        return msg === FrontendConstants.VERIFYING;
      })) {
        ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
      }
      this.setState({errors: this.state.errors.merge(immErrors)});
      return;
    }

    var immNewFile = this.state.immCurrentFile.set('includedDynamicFilters', this.toImmIncludedDynamicFilters(immCurrentFile.get('includedDynamicFilters')));
    if(infoParam.size > 0) {
      immNewFile = immNewFile.set('nullOrNotNullCheck',true);
    }
    immNewFile = immNewFile.set('includedStaticFilters', immCurrentFile.get('includedStaticFilters').flatMap(function (str) {
      if (str) {
        return Imm.List([str]);
      }
    }));
    var fileId = this.props.params.fileId;
    if (fileId) {  // We're in edit template mode.
      if (immNewFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.delete('folderId');
      }
      _.each(GA.GAHelper.extractEditOperations(immInitialFile.toJS(), immCurrentFile.toJS()), function (editOperation) {
        GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.ADHOC_REPORT, editOperation);
      });
      /*
       extractEditOperations only does a shallow comparison of the objects. While templatedReport is part of
       immInitialFile, we want more granularity as to which parameters in templatedReport actually changed,
       (instead of just seeing just one 'TEMPLATEDREPORT` event) so we have to call it again.
       */
      _.each(GA.GAHelper.extractTemplatedReportEditOperations(immInitialFile.get('templatedReport').toJS(), immCurrentFile.get('templatedReport').toJS()), function (editOperation) {
        GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.ADHOC_REPORT, editOperation);
      });
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId, immNewFile, navigateTo);
    } else {  // We're in new template mode.
      var folderId = this.props.immExposureStore.getIn(['folderView', 'folderId']);
      if (folderId !== ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.set('folderId', folderId);
      }
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.ADHOC_REPORT);
      ExposureActions.reportCreationViewCreateReport(immNewFile, navigateTo, /* forceEmit = */ true);
    }
  },

  handleSavedReportCallback: function (report, resfreshFilter) {
    var immSavedFile = this.toImmInitialFile(Imm.fromJS(report));
    this.createSavedMessages(immSavedFile);
    // This code is to fix IE9 bug where transitioning to a report or reports get stopped b/c the app thinks the studio is dirty.
    this.setState({
      immCurrentFile: immSavedFile,
      immInitialFile: immSavedFile
    });
    // Force an update to the file to grab any changes like filterStates.
    if (resfreshFilter) {
      ExposureActions.deleteFileEntry(report.id);
    } else {
      ExposureActions.fetchFiles([report.id]);
    }
  },

  goToReport: function (report) {
    let fileId = report.id;
    this.handleSavedReportCallback(report, true);
    this.context.router.push({name: RouteNameConstants.EXPOSURE_REPORTS_SHOW, params: {fileId: fileId}});
  },

  goToReports: function (report) {
    this.handleSavedReportCallback(report, false);
    this.context.router.push({name: RouteNameConstants.EXPOSURE_FOLDERS});
  },

  handleSaveAdvancedConfiguration: function () {
    var text = this.refs['codeMirror'].editor.getValue();
    try {
      var value = JSON.parse(text).map(function (val) {
        return JSON.stringify(val);
      });
      if (_.isArray(value)) {
        this.setState({
          parseError: null,
          immCurrentFile: this.state.immCurrentFile.setIn(['templatedReport', 'advancedConfigOverrides'], Imm.fromJS(value)),
          isOpenAdvancedConfiguration: false
        });
      } else {
        // TODO: handle invalid JSON.
        this.setState({
          parseError: "Please enter valid JSON."
        });
      }
    } catch (e) {
      // TODO: handle invalid JSON.
      this.setState({
        parseError: "Please enter valid JSON."
      });
    }
  },

  handleSchema: function(schemaId) {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['templatedReport', 'comprehendSchemaId'], schemaId),
      errors: this.state.errors.merge({schema: null}),
      dataSelectorPath: null});
  },

  handleUpdateDynamicFilters: function (idx, e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['includedDynamicFilters', idx], e.target.value)});
  },

  handleUpdateStaticFilters: function (idx, e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['includedStaticFilters', idx], e.target.value)});
  },

  handleAddDynamicFilter: function () {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('includedDynamicFilters', this.state.immCurrentFile.get('includedDynamicFilters').push(null))});
  },

  handleAddStaticFilter: function () {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('includedStaticFilters', this.state.immCurrentFile.get('includedStaticFilters').push(null))});
  },

  handleRemoveStaticFilter: function (idx) {
    ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_DELETED_FILTER(FrontendConstants.STATIC, idx + 1), StatusMessageTypeConstants.TOAST_SUCCESS);
    this.setState({immCurrentFile: this.state.immCurrentFile.deleteIn(['includedStaticFilters', idx])});
  },

  handleRemoveDynamicFilter: function (idx) {
    ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_DELETED_FILTER(FrontendConstants.DYNAMIC, idx + 1), StatusMessageTypeConstants.TOAST_SUCCESS);
    this.setState({immCurrentFile: this.state.immCurrentFile.deleteIn(['includedDynamicFilters', idx])});
  },

  handleRemoveAssociatedFile: function (fileId) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('associatedFileIds', this.state.immCurrentFile.get('associatedFileIds').toSet().delete(fileId))});
  },

  handleRenderPreview: function () {
    var immTemplatedReport = this.state.immCurrentFile.get('templatedReport');
    // Run through the instantiator to see if it's a valid report prior to
    // executing the queries and attempting to render the report. If there are
    // errors on any data parameters flag them, if not render the preview.
    var immErrors = TemplateLibrary.validateTemplate(
      immTemplatedReport.get('template'),
      immTemplatedReport.get('comprehendSchemaId'),
      Imm.List(),
      true,
      this.updateErrorsCallback.bind(null, null));

    if (!immErrors.isEmpty() && !immErrors.every(function (msg) {
      return msg === FrontendConstants.VERIFYING;
    })) {
      // Parameters failed validation, abort and let errors be rendered. We
      // ignore validating CQL parameters since there will be an invalid CQL
      // toast if there is an issue.
      ExposureActions.createStatusMessage(FrontendConstants.PLEASE_ENTER_ALL_PARAMETERS_BEFORE_RENDERING_PREVIEW, StatusMessageTypeConstants.TOAST_ERROR);
      this.setState({errors: this.state.errors.merge(immErrors)});
      return;
    }
    var immInstantiatedTemplate = TemplateLibrary.instantiateTemplate(immTemplatedReport.get('template'), immTemplatedReport.get('comprehendSchemaId'), Imm.List());
    this.renderPreview(immInstantiatedTemplate);
  },

  handleExpandPreviewPane: function () {
    this.setState({expandPreview: !this.state.expandPreview});
  },

  handleToggleDataSelector: function (dataSelectorPath, dataSelectorSource, dataSelectorReadOnly) {
    if (!this.state.immCurrentFile.getIn(['templatedReport', 'comprehendSchemaId'], null) && dataSelectorSource === ExposureAppConstants.DATA_SELECTOR_PARAMETERS) {
      this.checkIfSchemaSelected(this.state.immCurrentFile.getIn(['templatedReport', 'template', 'parameters', dataSelectorPath]));
    } else {
      this.setState({
        dataSelectorPath: dataSelectorPath,
        dataSelectorSource: dataSelectorSource,
        dataSelectorReadOnly: dataSelectorReadOnly
      });
    }
  },

  setDefaultValueForParameters: function (immTemplate) {
    var newParams = immTemplate.get('parameters').map(function (immParam) {
      return immParam.has('value') ? immParam : immParam.set('value', immParam.get('defaultValue'));
    });

    return immTemplate.set('parameters', newParams);
  },

  parametersAreLoading: function () {
    return this.state.errors.contains(FrontendConstants.VERIFYING);
  },

  parameterIsLoading: function (parameterName) {
    return this.state.errors.get(parameterName) === FrontendConstants.VERIFYING;
  },

  generateParameters: function (handleParameter, isDataParameter, immParameter, idx) {
    if (immParameter.get('isDataParameter', false) === isDataParameter) {
      var paramName = immParameter.get('name');
      var placeholdername = immParameter.get('placeholderValue');
      var isLoading = this.parameterIsLoading(paramName);
      var canSetIsAggregate = immParameter.get('canSetIsAggregate', false);
      var isAggregate = immParameter.get('isAggregate', false);
      var result = [
        immParameter.get('canSetIsUserConfigurable') ?
          div({className: 'configurable', key: 'configurable-' + idx},
            Checkbox({
              checkedState: immParameter.get('isUserConfigurable', false),
              onClick: handleParameter.bind(null, idx, 'isUserConfigurable')
            }),
            FrontendConstants.ALLOW_REPORT_VIEWER_TO_CONFIGURE)
          : null,
        canSetIsAggregate || isAggregate ?
          div({className: cx('aggregate', {disabled: !canSetIsAggregate}), key: 'aggregate-' + idx},
            Checkbox({
              dimmed: !canSetIsAggregate,
              checkedState: isAggregate,
              onClick: canSetIsAggregate ? handleParameter.bind(null, idx, 'isAggregate') : _.noop
            }),
            FrontendConstants.AGGREGATE)
          : null];
      var title = [span({className: 'bold', key: 'title' + idx}, paramName),
        (immParameter.get('isOptional') && immParameter.get('parameterType') !== 'INFO_PARAMETER' ? span({
          className: 'small-side-padding',
          key: 'optional-' + idx
        }, FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN) : null),
        (immParameter.get('canSetIsAggregate') ?
            span({
              className: 'small-side-padding',
              key: 'aggregate-' + idx,
              title: FrontendConstants.CAN_AGGREGATE_HELP_TEXT
            },
              '(' + FrontendConstants.CAN_AGGREGATE, span({className: 'icon-question-circle'}), ')')
            : null
        )];
      var errorMessage = this.state.errors.get(immParameter.get('name'), null);
      switch (immParameter.get('parameterType')) {
        case ParameterTypeConstants.CQL_PARAMETER:
          result.unshift(InputBlockContainer({
            key: 'cql-param-' + idx,
            class: 'data-input',
            title: title,
            errorMsg: errorMessage,
            isLoading: isLoading,
            inputComponent: div({className: 'data-input-input-component'},
              ActionInputBox({
                className: cx('parameter-input', {'invalid-input': errorMessage && !isLoading}),
                inputProps: {
                  type: 'text',
                  // FIXME: Ultimately we want a spinner to appear when an input
                  // is in loading state, for now just display a message and
                  // disable the input temporarily.
                  disabled: isLoading,
                  onFocus: this.checkIfSchemaSelected.bind(null, immParameter),
                  onBlur: this.validateParameter.bind(null, immParameter),
                  onChange: _.compose(handleParameter.bind(null, idx, 'value'), function (event) {
                    return event.target.value;
                  }),
                  value: immParameter.get('value'),
                  className: cx('text-input', 'cql-parameter', {'chart-parameter': !isDataParameter}),
                  placeholder: FrontendConstants.ENTER_CQL_OR_BROWSE
                },
                actionOnFocus: this.handleToggleDataSelector.bind(null, idx, ExposureAppConstants.DATA_SELECTOR_PARAMETERS, false),
                actionClass: {selected: idx === this.state.dataSelectorPath && ExposureAppConstants.DATA_SELECTOR_PARAMETERS === this.state.dataSelectorSource},
                actionIconClass: 'icon-arrow-right2',
                actionOnBlur: this.validateParameter.bind(null, immParameter)
              }),
              isDataParameter ? span({className: 'parameter-description'}, immParameter.get('description')) : null
            )
          }));
          break;
        case ParameterTypeConstants.LIST_PARAMETER:
          const immOptions = immParameter.get('choices').map(choice => Imm.fromJS({value: choice, label: choice}));
          result.unshift(InputBlockContainer({
            key: 'list-param-' + idx,
            class: 'data-input',
            title: title,
            errorMsg: errorMessage,
            inputComponent: div({className: 'data-input-input-component'},
              Combobox({
                className: cx('list-param-dropdown', 'dropdown-wrapper', {
                  'chart-parameter': !isDataParameter,
                  'invalid-input': errorMessage
                }),
                options: immOptions,
                placeholder: FrontendConstants.SELECT,
                // Using the find ensures that we're returning a reference into the same immutable object, instead of
                // creating a brand new immutable for the value prop.
                value: immOptions.find(immOption => immOption.get('value') === immParameter.get('value'), null),
                onFocus: this.clearError.bind(null, immParameter.get('name')),
                onChange: handleParameter.bind(null, idx, 'value')
              }),
              isDataParameter ? span({className: cx('parameter-description', 'dropdown')}, immParameter.get('description')) : null)
          }));
          break;
        case ParameterTypeConstants.CONSTANT_PARAMETER:
          result.unshift(InputBlockContainer({
            key: 'constant-param-' + idx,
            class: 'data-input',
            title: title,
            errorMsg: errorMessage,
            inputComponent: div({className: 'data-input-input-component'},
              InputWithPlaceholder({
                type: 'text',
                onChange: _.compose(handleParameter.bind(null, idx, 'value'), function (event) {
                  return event.target.value;
                }),
                value: immParameter.get('value'),
                className: cx('text-input', {'chart-parameter': !isDataParameter, 'invalid-input': errorMessage}),
                placeholder: placeholdername ? placeholdername : paramName
              }),
              isDataParameter ? span({className: 'parameter-description'}, immParameter.get('description')) : null
            )
          }));
          break;
        case ParameterTypeConstants.CHECKBOX_PARAMETER:
          result.unshift(CheckboxContainer({
            key: 'checkbox-param-' + idx,
            class: 'data-input',
            title: title,
            errorMsg: errorMessage,
            inputComponent: div({className: 'data-input-input-component'},
              Checkbox({
                checkedState: immParameter.get('value') === 'true',
                onClick: _.compose(handleParameter.bind(null, idx, 'value'), function (check) {
                  return check.toString();
                })
              }),
              isDataParameter ? span({className: 'parameter-description'}, immParameter.get('description')) : null
            )
          }));
          break;
        case ParameterTypeConstants.INFO_PARAMETER:
          result.unshift(CheckboxContainer({
            key: 'info-param-' + idx,
            class: 'data-input',
            title: title,
            errorMsg: errorMessage,
            inputComponent: div({className: 'data-input-input-component'},
            Checkbox({
              checkedState: immParameter.get('value') === 'true',
              onClick: _.compose(handleParameter.bind(null, idx, 'value'), function (check) {
                return check.toString();
              })
            }),
            !isDataParameter ? span({className: 'parameter-description'}, immParameter.get('description')) : null
            )
          }));
          break;
      }
      // Every parameter, with its associated input fields, is wrapped in a
      // container.
      return div({className: 'parameter-container'}, result);
    }
  },

  getTabs: function (tab) {
    var tabNames = _.keys(this.tabs);
    return Tabs({
      tabNames: tabNames,
      disabledTabs: _.rest(tabNames, _.indexOf(tabNames, tab) + 1),
      selectedTab: tab,
      handleTabSelect: this.handleTabSelect,
      tabNameMap: FrontendConstants.ADHOC_REPORT_TAB_DISPLAY_NAME
    });
  },

  handleListTemplateItemClick: function (id) {
    this.setState({
      selectedTemplateId: id
    });
  },

  getInitialTemplateId: function () {
    return this.getSelectedTemplateId(this.state.immInitialFile, this.state.immTemplates);
  },

  getSelectedTemplateId: function (immFile, immTemplates) {
    return immFile.getIn(['templatedReport', 'template', 'id'], immTemplates.first().get('id'));
  },

  getPreviewContent: function () {
    if (this.previewAvailable()) {
      // TODO: consolidate this with GraphicalReportWidget.
      return this.getPreview();
    }
    var immSelectedTemplate = this.state.immTemplates.get(this.state.selectedTemplateId);
    var choices = immSelectedTemplate.get('parameters').flatMap(function (param) {
      return param.get('choices');
    }).join(', ');
    return div({className: 'preview-body', key: 'preview-body'},
      div({className: cx('preview-template-thumbnail', 'underline'), key: 'preview-template-thumbnail'},
        div({className: cx('thumbnail-icon', templateIcons[immSelectedTemplate.get('type')])})));
  },

  getDataSelector: function () {
    var comprehendSchemaId = this.state.immCurrentFile.getIn(['templatedReport', 'comprehendSchemaId']);
    var parameterIsAggregate = this.state.immCurrentFile.getIn(['templatedReport', 'template', 'parameters', this.state.dataSelectorPath, 'isAggregate'], false);
    var showAggregate = parameterIsAggregate && !!this.state.dataSelectorColumn;
    var showOnlyCount = this.state.dataSelectorColumn && _.contains(this.state.dataSelectorColumn, '*');  // If dataSelectorColumn is '*', that means the whole table is selected and we must aggregate with count.

    var dataSelectorOptions = div({className: 'data-selector-options'}, div({className: cx('vertical-align-wrapper', {'aggregate-visible': showAggregate})},
      showAggregate ? div({className: 'column-selected'}, span(null, span({className: 'bold'}, FrontendConstants.AGGREGATE), FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN, ':'),
        Combobox({
          placeholder: FrontendConstants.SELECT_A_TYPE,
          className: 'aggregate-dropdown',
          options: showOnlyCount ? AggregateConstants.filter(immAggregateConstant => immAggregateConstant.get('label') === FrontendConstants.COUNT) : AggregateConstants,
          value: showOnlyCount ? AggregateConstants.find(immAggregateConstant => immAggregateConstant.get('label') === FrontendConstants.COUNT) : AggregateConstants.find(immAggregateConstant => immAggregateConstant.get('value') === this.state.dataSelectorAggregate),
          onChange: this.handleDataSelectorAggregate
        })) : null,
      Button({key: 'apply-data-selector',
        classes: {'data-selector-apply': true},
        isPrimary: true,
        onClick: this.handleDataSelectorApply.bind(null, showAggregate)}, FrontendConstants.APPLY)
    ));

    return div({className: 'preview-body', key: 'preview-body'}, comprehendSchemaId ? div(null, DataSelector({
      immExposureStore: this.props.immExposureStore,
      comprehendSchemaId: comprehendSchemaId,
      nodeSelectionHandler: this.handleDataSelectorSelection,
      inSelectableMode: !this.state.dataSelectorReadOnly,
      noInteractions: this.state.dataSelectorReadOnly,
      canSelectEntireTable: parameterIsAggregate
    }), !this.state.dataSelectorReadOnly ? dataSelectorOptions : null) : div(null, FrontendConstants.SCHEMA_IS_REQUIRED));
  },

  handleDataSelectorSelection: function (column) {
    var newState = {dataSelectorColumn: column};
    if (_.contains(column, '*')) {  // When the whole table is selected, the `dataSelectorAggregate` must be set to `count`.
      newState.dataSelectorAggregate = 'count';
    } else {
      newState.dataSelectorAggregate = null;
    }
    this.setState(newState);
  },

  handleDataSelectorApply: function (aggregateIsVisible) {
    var newValue;
    if (this.state.dataSelectorColumn) {
      if (this.state.dataSelectorAggregate && aggregateIsVisible) {
        newValue = `${this.state.dataSelectorAggregate}(${this.state.dataSelectorColumn})`;
      } else {
        newValue = this.state.dataSelectorColumn;
      }
      var immNewFile;
      if (newValue) {
        switch (this.state.dataSelectorSource) {
          case ExposureAppConstants.DATA_SELECTOR_PARAMETERS:
            immNewFile = this.state.immCurrentFile.setIn(['templatedReport', 'template', 'parameters', this.state.dataSelectorPath, 'value'], newValue);
            this.validateParameter(immNewFile.getIn(['templatedReport', 'template', 'parameters', this.state.dataSelectorPath]));
            break;
          case ExposureAppConstants.DATA_SELECTOR_FILTERS:
            immNewFile = this.state.immCurrentFile.setIn(['includedDynamicFilters', this.state.dataSelectorPath], newValue);
            break;
        }
      } else {
        immNewFile = this.state.immCurrentFile;
      }

      this.setState({
        immCurrentFile: immNewFile,
        dataSelectorPath: null,
        dataSelectorColumn: null,
        dataSelectorAggregate: null,
      });
    } else {
      ExposureActions.createStatusMessage(FrontendConstants.PLEASE_SELECT_A_TABLE_COLUMN, StatusMessageTypeConstants.TOAST_ERROR);
    }
  },

  handleDataSelectorAggregate: function (aggregate) {
    this.setState({dataSelectorAggregate: aggregate});
  },

  isDirty: function () {
    if (!this.props.immExposureStore.get('isLoadingFile') && !this.props.immExposureStore.get('isLoadingTemplate')) {
      return (!Imm.is(this.state.immInitialFile, this.state.immCurrentFile) || this.state.selectedTemplateId !== this.getInitialTemplateId());
    } else {
      return false;
    }
  },

  unsavedWorkModalCopy: function () {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_REPORT,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  updateErrorsCallback: function (continueNavFunction, parameterName, error) {
    var clearedParameter = {};
    clearedParameter[parameterName] = error;

    var newErrors = this.state.errors.merge(clearedParameter);
    this.setState({errors: newErrors});

    // If continueNavFunction is set then this validation round was triggered by
    // an attempt to switch tabs or save.
    if (continueNavFunction) {
      if (newErrors.every(function (msg) {
        return !msg;
      })) {
        // This call cleared out the last issue, continue nav.
        continueNavFunction();
      } else if (!newErrors.some(function (msg) {
        return msg === FrontendConstants.VERIFYING;
      })) {
        // We have no more pending validation checks are there was an error.
        ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
      }
    }
  },

  render: function () {
    var immExposureStore = this.props.immExposureStore;
    if (immExposureStore.get('isLoadingTemplate') || immExposureStore.get('isLoadingFile')) {
      return Spinner();
    }

    if (this.state.immTemplates.isEmpty()) {
      return div(null, FrontendConstants.NO_TEMPLATES);
    }

    var tabs = this.getTabs(this.state.tab);
    var tabContent = _.has(this.tabs, this.state.tab) ? this.tabs[this.state.tab]() : null;
    return div({className: 'adhoc-report-studio'},
      div({className: 'report-definition'},
        div({className: 'page-header'}, div({className: 'title'}, FrontendConstants.DEFINE_NEW_REPORT)),
        tabs,
        tabContent.content,
        tabContent.footer),
      div({className: cx('report-preview', {expand: this.state.expandPreview || !_.isNull(this.state.dataSelectorPath)})}, tabContent.preview)
    );
  }
});

module.exports = withTransitionHelper(AdhocReportStudio);
