var React = require('react');
import DOM from 'react-dom-factories';

var FrontendConstants = require('../../constants/FrontendConstants');

var div = DOM.div,
    span = DOM.span;

class ContactAdmin extends React.Component {
  static displayName = 'ContactAdmin';

  render() {
    return div({className: 'contact-admin virtual-table'},
      div({className: 'virtual-table-row'},
        div({className: 'virtual-table-cell'}, span({className: 'icon icon-info'})),
        div({className: 'virtual-table-cell'}, span({className: 'text'}, FrontendConstants.CONTACT_ADMIN))));
  }
}

module.exports = ContactAdmin;
