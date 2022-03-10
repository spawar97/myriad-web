var React = require('react');
var cx = require('classnames');

var div = React.createFactory(require('./TouchComponents').TouchDiv);
var span = React.createFactory(require('./TouchComponents').TouchSpan);
import PropTypes from 'prop-types';

class ClickableText extends React.Component {
  static displayName = 'ClickableText';

  static propTypes = {
    handleClick: PropTypes.func.isRequired,
    text: PropTypes.string.isRequired,
    className: PropTypes.string,
    icon: PropTypes.string
  };

  render() {
    return div({className: cx('clickable-text', this.props.className), onClick: this.props.handleClick},
      this.props.icon ? span({className: cx('icon', this.props.icon)}) : null,
      span({className: 'text-link'}, this.props.text));
  }
}

module.exports = ClickableText;
