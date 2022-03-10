var React = require('react');
var ReactDOM = require('react-dom');
var ShallowCompare = require('react-addons-shallow-compare');
var $ = require('jquery');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';


var input = DOM.input;
var textarea = DOM.textarea;

class InputWithPlaceholder extends React.Component {
  static displayName = 'InputWithPlaceholder';

  static propTypes = {
    autoFocus: PropTypes.bool,
    className: PropTypes.string,
    defaultValue: PropTypes.string,
    disabled: PropTypes.bool,
    id: PropTypes.string,
    maxLength: PropTypes.number,
    min: PropTypes.string,
    name: PropTypes.string,
    onBlur: PropTypes.func,
    onChange: PropTypes.func,
    onClick: PropTypes.func,
    onFocus: PropTypes.func,
    onKeyDown: PropTypes.func,
    placeholder: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    rows: PropTypes.number,  // For textarea.
    type: PropTypes.string,
    value: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ])
  };

  static defaultProps = {maxLength: 1024};

  componentDidMount() {
    $(ReactDOM.findDOMNode(this));
  }

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    // Clone props. We don't use Util.clone or _.clone to reduce the size of comprehend-login.js.
    var props = $.extend({}, this.props);
    props.type = props.type || 'text';

    return (this.props.type === 'textarea' ? textarea : input)(props);
  }
}

module.exports = InputWithPlaceholder;
