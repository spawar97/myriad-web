var React = require('react');
var MediaQuery = React.createFactory(require('react-responsive'));
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var MediaQueryConstants = require('../constants/MediaQueryConstants');

var div = DOM.div;

class MediaQueryWrapper extends React.Component {
  static displayName = 'MediaQueryWrapper';

  static propTypes = {
    className: PropTypes.string.isRequired,
    desktopComponent: PropTypes.element.isRequired,
    phoneComponent: PropTypes.element.isRequired,
  };

  render() {
    return div({className: this.props.className},
        MediaQuery(MediaQueryConstants.MQ_DESKTOP, this.props.desktopComponent),
        MediaQuery(MediaQueryConstants.MQ_PHONE, this.props.phoneComponent)
    );
  }
}

module.exports = MediaQueryWrapper;
