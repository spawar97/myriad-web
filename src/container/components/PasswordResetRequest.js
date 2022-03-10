var React = require('react');
var _ = require('underscore');
var $ = require('jquery');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import saamaLogo from '../../images/saama_logo_login.png';

var Button = React.createFactory(require('./Button'));
var ExternalStatus = React.createFactory(require('./ExternalStatus'));
var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var FrontendConstants = require('../constants/FrontendConstants');
var LoginConstants = require('../constants/LoginConstants');
var GA = require('../util/GoogleAnalytics');
var Util = require('../util/util');

var div = DOM.div;
var span = DOM.span;
var img = DOM.img;
var h1 = DOM.h1;
var p = DOM.p;

class PasswordResetRequest extends React.Component {
  static displayName = 'PasswordResetRequest';

  static propTypes = {
    requestTimeoutMillis: PropTypes.number
  };

  state = {
    email: '',
    firstAttempt: true,
    confirmationScreen: false
  };

  handleChangeField = (field, e) => {
    var newState = {};
    newState[field] = e.target.value;
    this.setState(newState);
  };

  handleSubmit = () => {
    // Checks to see if any error messages would be displayed.
    var isValid = _.chain(this.getErrorMessages()).values().compact().isEmpty().value();
    var postUrl = '/api/reset-password-request';
    if (isValid) {
      $.ajax({
          dataType: 'json',
          contentType: 'application/json',
          url: postUrl,
          type: 'POST',
          data: JSON.stringify({
            email: this.state.email
          })
        })
        .fail(function(jqXHR) {
          GA.sendAjaxException('UserInitiatedPasswordReset failed: ' + jqXHR.statusText, jqXHR.status, false);
        });
      this.setState({confirmationScreen: true});
    } else if (this.state.firstAttempt) {
      this.setState({firstAttempt: false});
    }
  };

  getErrorMessages = () => {
    return {
      // We check that the email has a very basic shape (<something>@<something>.<something>).
      email: (Util.isWhiteSpaceOnly(this.state.email) || !Util.isValidEmail(this.state.email)) ? FrontendConstants.PLEASE_ENTER_VALID_EMAIL : null
    }
  };

  render() {
    const currentYear = new Date().getFullYear();
    if (this.state.confirmationScreen) {
      var icon = 'icon-checkmark-circle';
      var message = FrontendConstants.PASSWORD_RESET_AN_EMAIL_HAS_BEEN_SENT;
      var content = span({className: 'text-body2'}, FrontendConstants.PASSWORD_RESET_LINK_VALID_FOR(this.props.requestTimeoutMillis));
      return div({className: 'reset-password-confirmation'},
        ExternalStatus({
          icon: icon,
          message: message,
          content: content
        })
      );
    }
    else {
      var errorMessages = this.state.firstAttempt ? {} : this.getErrorMessages();

      var email = p(null,
        InputWithPlaceholder({className: 'flex-form-input radius username', placeholder: 'Enter Email',
          type: 'email', onChange: this.handleChangeField.bind(null, 'email'),
          value: this.state.email}));
      var leftContainer = div({ className: 'left-container' },
        div({ className: 'left-content' },
          div({ className: 'saama-logo' }, img({ src: saamaLogo })),
          div({ className: 'content1' }, LoginConstants.Content1),
          div({ className: 'content2' }, LoginConstants.Content2)
        )
      );
      
      return div({ className: 'container-division' },
      leftContainer,
        div({ className: 'right-container' },
          div({ className: 'flex-form reset-box' },
            p({ className: 'logo-header' }, LoginConstants.LSAC),
            div({ className: 'reset-container' },
              div({className: 'flex-form reset-password-request'},
                h1(null, FrontendConstants.RESET_PASSWORD),
                p(null,
                  span({className: cx('footer', 'text-body2')}, FrontendConstants.PLEASE_ENTER_EMAIL_FOR_PASSWORD_RESET)
                ),
                email,
                div({className: 'requestResetButton'},Button({
                  classes: {'request-reset-link': true},
                  children: 'Request reset link',
                  isPrimary: true,
                  onClick: this.handleSubmit
                }))
              )
            )
          ),p({ className: 'copyrightText' }, LoginConstants.CopyrightText + currentYear)
        )
      );
    }
  }
}

module.exports = PasswordResetRequest;
