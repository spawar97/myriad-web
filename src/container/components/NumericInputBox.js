var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var ExposureAppConstants = require('../constants/ExposureAppConstants');

var div = DOM.div;

class NumericInputBox extends React.Component {
  static displayName = 'NumericInputBox';

  static propTypes = {
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
    onFocus: PropTypes.func,
    handleSteps: PropTypes.func,
    invalidInputErrorMsg: PropTypes.string,
    isEditing: PropTypes.bool,
    isSteppable: PropTypes.bool,
    name: PropTypes.string,
    originalValue: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    showOriginal: PropTypes.bool,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    placeholder: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ])
  };

  render() {
    var name = this.props.name;

    return div({className: 'numeric-input-box'},
      this.props.isSteppable ? div({className: cx('step-button', 'step-up'), onClick: this.props.handleSteps.bind(null, ExposureAppConstants.NUMERIC_INPUT_BOX_INCREMENT)}, '+') : null,
      div({className: 'numeric-input-container'},
        InputBlockContainer({
          class: 'numeric-input-block-container',
          inputComponent: InputWithPlaceholder({
            type: 'text',
            className: cx('text-input', 'numeric-input', name ? name.toLowerCase() + '-input' : null, {'invalid-input': !_.isEmpty(this.props.invalidInputErrorMsg), 'is-editing': this.props.isEditing, 'disabled': this.props.disabled}),
            onBlur: this.props.onBlur,
            onChange: this.props.onChange,
            onFocus: this.props.onFocus,
            value: this.props.value,
            disabled: this.props.disabled,
            placeholder: this.props.placeholder
          }),
          errorMsg: this.props.invalidInputErrorMsg
        }),
        this.props.showOriginal && this.props.isEditing ? div({className: 'original-value'}, this.props.originalValue) : null
      ),
      this.props.isSteppable ? div({className: cx('step-button', 'step-down'), onClick: this.props.handleSteps.bind(null, ExposureAppConstants.NUMERIC_INPUT_BOX_DECREMENT)}, '-') : null
    );
  }
}

module.exports = NumericInputBox;
