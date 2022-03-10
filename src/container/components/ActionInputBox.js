var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');

var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));

import DOM from 'react-dom-factories';
var div = DOM.div;

import PropTypes from 'prop-types';

class ActionInputBox extends React.Component {
  static displayName = 'ActionInputBox';

  static propTypes = {
    inputProps: PropTypes.object.isRequired,
    actionClass: PropTypes.object,
    actionIconClass: PropTypes.string,
    actionOnBlur: PropTypes.func,
    actionOnFocus: PropTypes.func,
    className: PropTypes.string
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return div({className: cx('action-input', this.props.className)},
      InputWithPlaceholder(this.props.inputProps),
      div({className: cx('action-button', this.props.actionClass), onFocus: this.props.actionOnFocus, onBlur: this.props.actionOnBlur, tabIndex: -1},
        div({className: cx('icon', this.props.actionIconClass)})));
  }
}

module.exports = ActionInputBox;
