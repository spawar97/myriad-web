var React = require('react');
import DOM from 'react-dom-factories';
var FrontendConstants = require('../constants/FrontendConstants');

import PropTypes from 'prop-types';

var div = DOM.div;
var span = DOM.span;

class EmptyContentNotice extends React.Component {
  static displayName = 'EmptyContentNotice';

  static propTypes = {
    noticeText: PropTypes.string,
    className: PropTypes.string
  };

  static defaultProps = {
    noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(),
    className: ''
  };

  render() {
    return div({className: `empty-content${this.props.className !== '' ? ' ' + this.props.className : ''}`},
      div({className: `empty-content-text-holder${this.props.className !== '' ? ' ' + this.props.className : ''}`},
        div({className: 'icon-text-wrapper'},
          span({className: 'icon-info'}),
          span({className: 'empty-content-text'}, this.props.noticeText))));
  }
}

module.exports = EmptyContentNotice;
