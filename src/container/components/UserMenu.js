var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var SimpleDropdown = React.createFactory(require('./SimpleDropdown'));
var FrontendConstants = require('../constants/FrontendConstants');

var br = DOM.br;
var div = DOM.div;
var span = DOM.span;

class UserMenu extends React.Component {
  static displayName = 'UserMenu';

  static propTypes = {
    immUserInfo: PropTypes.instanceOf(Imm.Map).isRequired,
    userMenuItems: PropTypes.array.isRequired,
    version: PropTypes.string
  };

  handleChange = (id) => {
    this.props.userMenuItems[id].func();
  };

  render() {
    return div({className: 'user-menu'},
      div(null,
        SimpleDropdown({
          icon: 'icon-user',
          opener: div({className: 'icon-accordion-down'}),
          items: this.props.userMenuItems.map(function(i) { return {name: i.name, icon: i.icon}; }),
          itemListHeader: div({className: 'user-menu-header'},
            div({className: 'username'}, this.props.immUserInfo.get('username')),
            this.props.version ? div({className: 'version-container'}, span({className: 'version colon'}, FrontendConstants.VERSION), this.props.version) : null),
          onChange: this.handleChange,
          selectedOverride: null,
          scrollbarDisabled: true
        })
      )
    );
  }
}

module.exports = UserMenu;
