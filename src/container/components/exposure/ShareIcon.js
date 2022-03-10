var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var TestUtils = require('react-dom/test-utils');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;

class ShareIcon extends React.Component {
  static displayName = 'ShareIcon';

  static propTypes = {
    class: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return div({className: cx('share-icon', this.props.class, this.props.type)});
  }
}

module.exports = ShareIcon;
