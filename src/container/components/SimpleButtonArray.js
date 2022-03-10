var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;

class SimpleButtonArray extends React.Component {
  static displayName = 'SimpleButtonArray';

  static propTypes = {
    activeButtonKey: PropTypes.any,
    buttons: PropTypes.arrayOf(PropTypes.shape({
      class: PropTypes.any,
      key: PropTypes.string,
      text: PropTypes.string
    })),
    isInactive: PropTypes.bool,
    onClick: PropTypes.func,
    canChange: PropTypes.func,
  };

  state = {activeButtonKey: this.props.activeButtonKey || 0};

  componentWillReceiveProps(nextProps) {
    if (this.props.activeButtonKey !== nextProps.activeButtonKey) {
      this.setState({activeButtonKey: nextProps.activeButtonKey});
    }
  }

  handleClick = (key) => {
    // Only fire the associated action if the button is the only button or if
    // the button is part of an array of buttons and it is not the currently
    // active button.
    if (key !== this.state.activeButtonKey || this.props.buttons.length === 1) {
      if (!this.props.canChange || this.props.canChange()) {
        const callback = this.props.onClick && this.props.onClick.bind(null, key);
        this.setState({activeButtonKey: key}, callback);
      }
    }
  };

  render() {
    var simpleButtons = _.map(this.props.buttons, function(b, i) {
      var key = b.key || i;
      var classes = {active: this.state.activeButtonKey === key && !this.props.isInactive};
      if (b.class) { classes[b.class] = true; }
      return div({key: key, className: cx('virtual-table-cell', classes), onClick: this.handleClick.bind(null, key)}, b.text);
    }, this);
    return div({className: 'simple-button-array virtual-table'}, div({className: 'virtual-table-row'}, simpleButtons))
  }
}

module.exports = SimpleButtonArray;
