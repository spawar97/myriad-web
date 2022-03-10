var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');

var Button = React.createFactory(require('./components/Button'));
var ExternalStatus = React.createFactory(require('./components/ExternalStatus'));
var FrontendConstants = require('./constants/FrontendConstants');

var div = React.createFactory(require('./components/TouchComponents').TouchDiv);

require('../stylesheets/_breakpoints.scss');

$(document).ready(function() {
  var newConfig = {};

  function goToLoginPage() {
    if (config.idpUrl) {
      window.location.assign(config.idpUrl);
    } else {
      window.location.assign('/');
    }
  }

  function goToResetPasswordPage() {
    window.location.assign('/reset-password');
  }

  if (config.isExpired) {
    newConfig.icon = 'icon-WarningCircle';
    newConfig.message = FrontendConstants.LINK_EXPIRED(config.statusType);
    newConfig.content = div({className: 'explanation'},
      div({className: 'expiry-period'}, FrontendConstants.LINK_ONLY_VALID_FOR_X_TIME(config.statusType, config.timeout)),
      div(null, FrontendConstants.PLEASE_CONTACT_ADMIN),
      Button({classes: {'reset-password-btn': true}, children: FrontendConstants.RESET_PASSWORD, isPrimary: true, onClick: goToResetPasswordPage}));
  } else {
    newConfig.icon = 'icon-checkmark-circle';
    switch (config.statusType) {
      case 'invitation':  // Account confirmation.
        newConfig.message = FrontendConstants.ACCOUNT_CONFIRMATION_SUCCESS(config.accountName, config.isConfirmed, config.hasMoreThanOneAccount);
        newConfig.content = config.hasMoreThanOneAccount ? null :
          Button({classes: {'get-started-btn': true}, children: FrontendConstants.GET_STARTED, isPrimary: true, onClick: goToLoginPage});
        break;
      case 'reset password':  // User reset password.
        newConfig.message = FrontendConstants.PASSWORD_RESET_CONFIRM_MESSAGE;
        newConfig.content = Button({classes: {'get-started-btn': true}, children: FrontendConstants.GO_TO_LOGIN, isPrimary: true, onClick: goToLoginPage});
        break;
    }
  }

  ReactDOM.render(
    ExternalStatus(newConfig),
    document.getElementById('container')
  );
});
