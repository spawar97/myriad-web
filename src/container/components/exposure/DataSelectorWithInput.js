var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var DataSelector = React.createFactory(require('./DataSelector'));
var Button = React.createFactory(require('../Button'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var AppRequest = require('../../http/AppRequest');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');

var div = DOM.div;
var span = DOM.span;

class DataSelectorWithInput extends React.Component {
  static displayName = 'DataSelectorWithInput';

  static propTypes = {
    comprehendSchemaId: PropTypes.string.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    validateInput: PropTypes.func.isRequired,
    defaultValue: PropTypes.string,
    handleAdd: PropTypes.func,
    handleCancel: PropTypes.func,
    prefix: PropTypes.string,
    sessionFilterCqlParseValid: PropTypes.bool,
    titleClassName: PropTypes.string
  };

  state = {inputValue: this.props.defaultValue};

  componentWillUnmount() {
    ExposureActions.setModalDataSelectorInputValid(true);
  }

  handleInputChange = (e) => {
    this.setState({inputValue: e.target.value});
  };

  render() {
    var cqlContent = div({className: 'cql-content'},
        div({className: 'cql-textbox'},
          span({className: 'cql-textbox-prefix'}, FrontendConstants.FILTER),
          InputBlockContainer({
            inputComponent: InputWithPlaceholder({
              key: 'cql-input',
              type: 'text',
              ref: 'cqlInput',
              className: 'text-input',
              onChange: this.handleInputChange,
              onBlur: this.props.validateInput.bind(null, this.state.inputValue),
              placeholder: FrontendConstants.ENTER_CQL,
              defaultValue: this.props.defaultValue,
              maxLength: ExposureAppConstants.FILTER_CQL_MAX_LENGTH
            })
          }),
          !this.props.immExposureStore.get('dataSelectorInputValid') ? span({className: 'cql-validation-error-message'}, FrontendConstants.INVALID_CQL) : null
        ),
        div({className: 'data-selector-input-buttons'},
          Button({
              children: this.props.defaultValue ? FrontendConstants.EDIT_FILTER : FrontendConstants.ADD_FILTER,
              isPrimary: true,
              onClick: this.props.validateInput.bind(null, this.state.inputValue, this.props.handleAdd.bind(null, this.state.inputValue))}
          ),
          Button({
              children: FrontendConstants.CANCEL,
              isSecondary: true,
              onClick: this.props.handleCancel}
          )
        )
    );

    return div({className: 'data-selector-with-input'},
      DataSelector(this.props),
      cqlContent
    );
  }
}

module.exports = DataSelectorWithInput;
