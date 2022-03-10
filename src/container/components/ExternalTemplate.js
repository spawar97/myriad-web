var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import saamaLogo from '../../images/saama_logo_login.png';

var div = DOM.div;
var hr = DOM.hr;
var img = DOM.img;

require('../../stylesheets/external-form.scss');

class ExternalTemplate extends React.Component {
  static displayName = 'ExternalTemplate';

  static propTypes = {
    content: PropTypes.any.isRequired,
    headerClass: PropTypes.string
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return div({className: cx('external-template-body', this.props.headerClass)},
      div({className: 'saama-logo'},img({src: saamaLogo})),
      hr(),
      this.props.content);
  }
}

module.exports = ExternalTemplate;
