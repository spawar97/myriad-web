var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
import PropTypes from 'prop-types';

var div = React.createFactory(require('./TouchComponents').TouchDiv);

class SimpleAction extends React.Component {
  static displayName = 'SimpleAction';

  static propTypes = {
    onClick: PropTypes.func.isRequired,
    class: PropTypes.string,
    text: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.element),
      PropTypes.element,
      PropTypes.string
    ]),
    title: PropTypes.string
  };

  static defaultProps = {title: ''};

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    var classes = {'simple-action': true};
    if (this.props.class) { classes[this.props.class] = true; }
    return div({className: cx(classes), title: this.props.title, onClick: this.props.onClick}, this.props.text);
  }
}

module.exports = SimpleAction;
