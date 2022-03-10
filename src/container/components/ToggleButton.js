var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
import PropTypes from 'prop-types';

var div = React.createFactory(require('./TouchComponents').TouchDiv);

class ToggleButton extends React.Component {
  static displayName = 'ToggleButton';

  static propTypes = {
    activeText: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired,
    disabled: PropTypes.bool,
    displayStar: PropTypes.bool,
    className: PropTypes.string,
    onClick: PropTypes.func
  };

  static defaultProps = {
    displayStar: false,
    isActive: false
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return div({className: cx('toggle-button', this.props.className ? this.props.className : '',
          {'is-active': this.props.isActive, disabled: this.props.disabled}), onClick: this.props.disabled ? null : this.props.onClick},
      div({className: cx('circle', 'left', {'icon-star-empty': this.props.displayStar && this.props.isActive})},
        this.props.isActive && !this.props.displayStar ? this.props.activeText : null),
      div({className: 'circle right'}));
  }
}

module.exports = ToggleButton;
