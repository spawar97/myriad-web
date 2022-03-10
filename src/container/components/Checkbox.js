var React = require('react');
var _ = require('underscore');
var cx = require('classnames');

var div = React.createFactory(require('./TouchComponents').TouchDiv);
import PropTypes from 'prop-types';

class Checkbox extends React.Component {
  static displayName = 'Checkbox';

  static propTypes = {
    checkedState: PropTypes.any.isRequired,
    dimmed: PropTypes.bool,
    onClick: PropTypes.func,
    id: PropTypes.string,
  };

  static defaultProps = {
    dimmed: false,
    id: null,
  };

  handleClick = () => {
    _.isFunction(this.props.onClick) ? this.props.onClick(this.props.checkedState !== true) : _.noop;
  };

  render() {
    return div({className: 'checkbox-container', onClick: this.handleClick},
      div({className: cx('checkbox', {
        partial: this.props.checkedState === 'partial',
        checked: this.props.checkedState === true,
        dimmed: this.props.dimmed}), id: this.props.id}),
      this.props.children);
  }
}

module.exports = Checkbox;
