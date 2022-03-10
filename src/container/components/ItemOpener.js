var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
import PropTypes from 'prop-types';

var div = React.createFactory(require('./TouchComponents').TouchDiv);

class ItemOpener extends React.Component {
  static displayName = 'ItemOpener';

  static propTypes = {
    onClick: PropTypes.func.isRequired,
    extraClasses: PropTypes.string,
    isOpen: PropTypes.bool
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  handleClick = () => {
    this.props.onClick(!this.props.isOpen);
  };

  render() {
    return div({className: cx('item-opener', this.props.extraClasses, {open: this.props.isOpen}), onClick: this.handleClick});
  }
}

module.exports = ItemOpener;
