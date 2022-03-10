var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var TitleBar = React.createFactory(require('./TitleBar'));
var Button = React.createFactory(require('../Button'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ToggleButton = React.createFactory(require('../ToggleButton'));
const Link = React.createFactory(require('react-router').Link);
var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');
var RouteNameConstants = require('../../constants/RouteNameConstants');

var div = DOM.div;

import AdminStoreHelpers from '../../util/AdminStoreHelpers';
import { withTransitionHelper } from '../RouterTransitionHelper';

var Accounts = createReactClass({
  displayName: 'Accounts',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    height: PropTypes.number,
    query: PropTypes.objectOf(PropTypes.string),
    width: PropTypes.number
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function() {
    return {
      isLegacyAccount: false,
      accountName: '',
      accountDisplayName: '',
      accountAdminEmail: ''
    };
  },

  componentDidMount: function() {
    AdminActions.getAccounts();
  },

  handleLegacyToggle: function() {
    this.setState({isLegacyAccount: !this.state.isLegacyAccount});
  },

  handleAccountNameChange: function(e) {
    var name = e.target.value;
    this.setState({accountName: name, validAccountName: /^[a-zA-Z0-9\-]+$/.test(name)});
  },

  handleAccountDisplayNameChange: function(e) {
    var displayName = e.target.value;
    this.setState({accountDisplayName: displayName, validAccountDisplayName: !_.isEmpty(displayName)});
  },

  handleAccountAdminEmailChange: function(e) {
    var email = e.target.value;
    this.setState({accountAdminEmail: email, validAccountAdminEmail: Util.isValidEmail(email)});
  },

  isDirty: function() {
    return AdminStoreHelpers.isDirty(this.props.immAdminStore);
  },

  render: function() {
    var immAccount = this.props.immAdminStore.get('accounts').find(function(immAccount) {
      return immAccount.get('name') === this.state.accountName;
    }, this);
    var submitAction = immAccount ?
      AdminActions.addAccountAdmin.bind(null, this.state.accountName, this.state.accountAdminEmail) :
      AdminActions.createAccountWithAdmin.bind(null, this.state.accountName, this.state.accountDisplayName, this.state.isLegacyAccount, this.state.accountAdminEmail);
    var isSubmittable = this.state.validAccountAdminEmail && this.state.validAccountName && (!_.isUndefined(immAccount) || this.state.validAccountDisplayName);

    return (
      div({className: 'accounts-tab'},
        TitleBar({tabName: FrontendConstants.ACCOUNT_MANAGEMENT, noNewOption: true}),
        InputWithPlaceholder({
          className: 'account-name text-input',
          value: this.state.accountName,
          placeholder: FrontendConstants.ACCOUNT_NAME,
          onChange: this.handleAccountNameChange
        }),
        InputWithPlaceholder({
          className: 'account-display-name text-input',
          value: immAccount ? immAccount.get('displayName') : this.state.accountDisplayName,
          disabled: !_.isUndefined(immAccount),
          placeholder: FrontendConstants.ACCOUNT_DISPLAY_NAME,
          onChange: this.handleAccountDisplayNameChange
        }),
        div({className: 'account-legacy-toggle'},
          div({className: 'account-legacy-toggle-label'}, FrontendConstants.LEGACY_ACCOUNT),
          ToggleButton({
            isActive: immAccount ? immAccount.get('isLegacy') : this.state.isLegacyAccount,
            activeText: FrontendConstants.CHECKMARK,
            onClick: immAccount ? _.noop : this.handleLegacyToggle
          })
        ),
        InputWithPlaceholder({
          className: 'account-admin-email text-input',
          value: this.state.accountAdminEmail,
          placeholder: FrontendConstants.ACCOUNT_ADMIN_EMAIL,
          onChange: this.handleAccountAdminEmailChange
        }),
        Button({
          classes: {'submit-account-button': true},
          icon: 'icon-plus-circle2',
          children: immAccount ? FrontendConstants.ADD_ACCOUNT_ADMIN : FrontendConstants.CREATE_ACCOUNT,
          onClick: submitAction,
          isDisabled: !isSubmittable,
          isPrimary: true
        })
      )
    );
  }
});

module.exports = withTransitionHelper(Accounts, true);
