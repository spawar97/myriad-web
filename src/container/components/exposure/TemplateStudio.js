require('codemirror/lib/codemirror.css');
// These imports are used to modify CodeMirror global var.
require('codemirror/addon/hint/html-hint');
require('codemirror/addon/hint/javascript-hint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/show-hint.css');
require('codemirror/mode/htmlembedded/htmlembedded');
require('codemirror/mode/javascript/javascript');

var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));
var CodeMirrorEditor = React.createFactory(require('../CodeMirrorEditor'));
var Combobox = React.createFactory(require('../Combobox'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ParameterTypeConstants = require('../../constants/ParameterTypeConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
import { withTransitionHelper } from '../RouterTransitionHelper';

var div = DOM.div;

const REPORT_TYPE_OPTIONS = Imm.fromJS([{name: 'Graphical', value: ExposureAppConstants.TEMPLATE_TYPE_CHART}, {name: 'Tabular', value: ExposureAppConstants.TEMPLATE_TYPE_TABULAR}]);

var TemplateStudio = createReactClass({
  displayName: 'TemplateStudio',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    params: PropTypes.shape({
      templateId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  state: {
    isCodeParametersChanged: false,
    isCodeQueryChanged: false
  },

  getInitialState: function() {
    var immEmptyTemplate = Imm.fromJS({
      title: '',
      description: '',
      type: ExposureAppConstants.TEMPLATE_TYPE_CHART,
      // The below parameter defaults are based on the values from the initial base template.
      // Default values are the only strings being pulled from FrontendConstants since other strings
      // need to match up with the backend.
      parameters: Imm.fromJS([
        { name: 'Measure',
          description: 'Measure',
          parameterType: ParameterTypeConstants.CQL_PARAMETER,
          isOptional: false,
          choices: [],
          canSetIsAggregate: true,
          isDataParameter: true },
        { name: 'Dimension 1',
          description: 'Dimension 1',
          parameterType: ParameterTypeConstants.CQL_PARAMETER,
          isOptional: false,
          choices: [],
          canSetIsAggregate: false,
          isDataParameter: true },
        { name: 'Dimension 2',
          description: 'Dimension 2',
          parameterType: ParameterTypeConstants.CQL_PARAMETER,
          isOptional: true,
          choices: [],
          canSetIsAggregate: false,
          isDataParameter: true },
        { name: 'Type',
          description: 'Type',
          parameterType: ParameterTypeConstants.LIST_PARAMETER,
          choices: ['Bar', 'Column', 'Line', 'Scatter'],
          isOptional: false,
          isDataParameter: true },
        { name: 'Chart title',
          parameterType: ParameterTypeConstants.CONSTANT_PARAMETER,
          isOptional: false,
          choices: [],
          defaultValue: FrontendConstants.COUNT_OF_SUBJECT_BY_RACE_SEX },
        { name: 'Chart subtitle',
          parameterType: ParameterTypeConstants.CONSTANT_PARAMETER,
          choices: [],
          isOptional: false },
        { name: 'y-axis',
          parameterType: ParameterTypeConstants.CONSTANT_PARAMETER,
          isOptional: false,
          choices: [],
          defaultValue: FrontendConstants.COUNT_OF_SUBJECT },
        { name: 'x-axis',
          parameterType: ParameterTypeConstants.CONSTANT_PARAMETER,
          isOptional: false,
          choices: [],
          defaultValue: FrontendConstants.RACE },
        { name: 'Data display style',
          parameterType: ParameterTypeConstants.LIST_PARAMETER,
          isOptional: false,
          defaultValue: FrontendConstants.RACE,
          choices: ['style 1', 'style 2']}
      ]),
      queryPlan: ''
    });

    var immInitialTemplate = this.props.immExposureStore.getIn(['templates', this.props.params.templateId], immEmptyTemplate);
    return {
      immCurrentTemplate: immInitialTemplate,
      immSavedTemplate: immInitialTemplate
    };
  },

  componentDidMount: function() {
    ExposureActions.templatesFetch();
  },

  componentWillReceiveProps: function(nextProps) {
    var stateObject = {};
    var immCurrentTemplate = this.props.immExposureStore.getIn(['templates', this.props.params.templateId], Imm.Map());
    var immNextTemplate = nextProps.immExposureStore.getIn(['templates', nextProps.params.templateId], Imm.Map());

    if (!immNextTemplate.equals(immCurrentTemplate)) {
      _.extend(stateObject, {
        immCurrentTemplate: immNextTemplate,
        immSavedTemplate: immNextTemplate
      });
    }
    if (!_.isEmpty(stateObject)) {
      this.setState(stateObject);
    }
  },

  onChangeTemplateType: function(templateType) {
    this.setState({immCurrentTemplate: this.state.immCurrentTemplate.set('type', templateType)});
  },

  onChangeTemplateTitle: function(e) {
    this.setState({immCurrentTemplate: this.state.immCurrentTemplate.set('title', e.target.value)});
  },

  onChangeTemplateDescription: function(e) {
    this.setState({immCurrentTemplate: this.state.immCurrentTemplate.set('description', e.target.value)});
  },

  checkTemplateChanges: function (newTemplateValue, templateName) {
    let oldTemplateValue = this.state.immCurrentTemplate.get(templateName);

    if (typeof oldTemplateValue !== "string") {
      oldTemplateValue = JSON.stringify(oldTemplateValue.toJS(), null, 2);
      this.setState({ isCodeParametersChanged: !_.isEqual(newTemplateValue, oldTemplateValue) });
    } else {
      this.setState({ isCodeQueryChanged: !_.isEqual(newTemplateValue, oldTemplateValue) });
    }
  },

  save: function() {
    let immCurrentTemplate = this.state.immCurrentTemplate.merge({
      parameters: Imm.fromJS(JSON.parse(this.refs['parameter-input'].editor.getValue())),
      queryPlan: this.refs['queryplan-input'].editor.getValue()
    });
    if (this.props.params.templateId) {  // We're in edit template mode.
      ExposureActions.templateUpdate(immCurrentTemplate, this.finalizeSave);
    } else {  // We're in new template mode.
      ExposureActions.templateCreate(immCurrentTemplate, this.finalizeSave);
    }

    this.setState({ isCodeParametersChanged: false, isCodeQueryChanged: false });
  },

  finalizeSave: function(immTemplate) {
    this.setState({
      immCurrentTemplate: immTemplate,
      immSavedTemplate: immTemplate
    });
    this.context.router.push({name: RouteNameConstants.EXPOSURE_TEMPLATES_EDIT, params: {templateId: immTemplate.get('id')}});
  },

  isDirty: function() {
    const { immExposureStore } = this.props;
    const { immSavedTemplate, immCurrentTemplate, isCodeParametersChanged, isCodeQueryChanged } = this.state;

    return !immExposureStore.get('isLoadingTemplate') && !Imm.is(immSavedTemplate, immCurrentTemplate) ||
      isCodeParametersChanged || isCodeQueryChanged;
  },

  unsavedWorkModalCopy() {
    return {header: FrontendConstants.DISCARD_CHANGES_TO_TEMPLATE,
            content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST};
  },

  render: function() {
    if (this.props.immExposureStore.get('isLoadingTemplate')) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }
    var immCurrentTemplate = this.state.immCurrentTemplate;
    var inEditMode = !_.isEmpty(this.props.params.templateId);
    var templateInvalid = _.isEmpty(immCurrentTemplate.get('title'));
    var isTemplateSaved = !this.isDirty();

    return div({className: 'studio'},
      div({className: 'page-header'},
        div({className: 'title' }, inEditMode ? FrontendConstants.EDIT_TEMPLATE : FrontendConstants.CREATE_TEMPLATE)),
      div({className: 'studio-editor'},
        div({className: 'entry-text required'}, FrontendConstants.TITLE),
        InputWithPlaceholder({
          type: 'text',
          className: 'text-input title-input',
          onChange: this.onChangeTemplateTitle,
          value: immCurrentTemplate.get('title'),
          placeholder: 'Title (required)',
          maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH}),
        div({className: 'entry-text'}, FrontendConstants.DESCRIPTION),
        InputWithPlaceholder({
          type: 'textarea',
          className: 'textarea description-input',
          onChange: this.onChangeTemplateDescription,
          rows: 1,
          value: immCurrentTemplate.get('description'),
          placeholder: FrontendConstants.DESCRIPTION,
          maxLength: 512}),
        div({className: 'entry-text'}, FrontendConstants.TEMPLATE_TYPE),
        Combobox({
          key: 'report-type-dropdown',
          className: 'report-type-dropdown',
          searchable: false,
          labelKey: 'name',
          options: REPORT_TYPE_OPTIONS,
          value: immCurrentTemplate.get('type'),
          onChange: this.onChangeTemplateType
        })),
        div({className: 'entry-text'}, FrontendConstants.TEMPLATE_PARAMETERS),
        CodeMirrorEditor({
          className: 'parameter-input',
          ref: 'parameter-input',
          key: 'parameter-input',
          lineNumbers: true,
          mode: {name: 'javascript', json: true},
          smartIndent: true,
          dragDrop: true,
          // Use JsonFormatter to pretty print JSON with a 2 space indent.
          initialValue: JSON.stringify(immCurrentTemplate.get('parameters').toJS(), null, 2),
          extraKeys: {'`': 'autocomplete'},
          onChange: (value) => this.checkTemplateChanges(value, 'parameters')
        }),
        div({className: 'entry-text'}, FrontendConstants.TEMPLATE_QUERYPLAN),
        CodeMirrorEditor({
          className: 'queryplan-input',
          ref: 'queryplan-input',
          key: 'queryplan-input',
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true,
          dragDrop: true,
          initialValue: immCurrentTemplate.get('queryPlan', ''),
          extraKeys: {'`': 'autocomplete'},
          onChange: (value) => this.checkTemplateChanges(value, 'queryPlan')
        }),
        Button({icon: 'icon-loop2 btn-save bottom-btn', children: 'Save', isPrimary: true, onClick: this.save,
          isDisabled: templateInvalid || isTemplateSaved}));
  }
});

module.exports = withTransitionHelper(TemplateStudio);
