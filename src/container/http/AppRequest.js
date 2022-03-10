'use strict';
var $ = require('jquery');
var _ = require('underscore');
var Cookies = require('js-cookie');
var HttpStatus = require('http-status-codes');

var AdminActions = require('../actions/AdminActions');
var ExposureActions = require('../actions/ExposureActions');
var GA = require('../util/GoogleAnalytics');
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';

var WARNING_SECONDS = 60;

function startInactivityTimer(maxInactivityAge) {
  var sessionCookieMaxInactivityAge = maxInactivityAge || comprehend.globals.sessionCookieMaxInactivityAge;
  var timeTilModal = (sessionCookieMaxInactivityAge - WARNING_SECONDS) * 1000;  // 1 minute warning.
  var timeTilLogout = sessionCookieMaxInactivityAge * 1000;

  if (comprehend.globals.inactiveTimeout) {
    clearTimeout(comprehend.globals.inactiveTimeout);
  }
  if (timeTilModal >= 0) {  // This can be less than 0 if we're coming here from `checkLastActiveAt`.
    comprehend.globals.inactiveTimeout = setTimeout(function () {
      if (checkLastActiveAt(true)) {
        ExposureActions.warnInactivityLogout();
        AdminActions.warnInactivityLogout();
      }
    }, timeTilModal);
  }

  if (comprehend.globals.logoutTimeout) {
    clearTimeout(comprehend.globals.logoutTimeout);
  }
  comprehend.globals.logoutTimeout = setTimeout(function () {
    if (checkLastActiveAt()) {
      var redirectTo = '/logout';
      AdminActions.discardChanges();
      GA.sendSessionTimeout();
      window.location.replace(redirectTo);
    }
  }, timeTilLogout);
}

function checkLastActiveAt(isWarning) {
  var lastActiveAt = parseInt(Cookies.get('lastActiveAt'));
  var cookieEqualsGlobal = lastActiveAt === comprehend.globals.lastActiveAt;
  if (!cookieEqualsGlobal) {
    // We need to bump the time until logout and (potentially) the time until the modal
    // is displayed. The number of seconds we need to bump the timer(s) is the difference
    // between cookie's lastActiveAt value  and the global lastActiveAt value, plus
    // WARNING_SECONDS if we got here from the warning modal check.
    var maxInactivityAge = parseInt((lastActiveAt - comprehend.globals.lastActiveAt) / 1000) + (isWarning ? WARNING_SECONDS : 0);
    comprehend.globals.lastActiveAt = lastActiveAt;
    startInactivityTimer(maxInactivityAge);
    if (!isWarning && maxInactivityAge > WARNING_SECONDS) {
      // If we were about to logout and have bumped the timer by more than
      // WARNING_SECONDS, then we should close the warning modal.
      ExposureActions.closeModal();
      AdminActions.closeModal();
    }
  }
  return cookieEqualsGlobal;
}

var AppRequest = function (options) {

  var startTime = new Date().getTime();

  startInactivityTimer();

  // We store the current time in a JS cookie to ensure that an inactive application
  // tab cannot log the user out while they remain active in another tab. The cookie value
  // can be accessed by all tabs and windows (of a single browser) and is used in
  // conjunction with the `checkLastActiveAt` function to keep the timers of both tabs in
  // sync.
  comprehend.globals.lastActiveAt = startTime;
  Cookies.set('lastActiveAt', startTime, { path: '/' });

  return AppRequestBackground(options);
};

var AppRequestBackground = function (options) {
  var params = {
    dataType: 'json',
    contentType: 'application/json',
    timeout: 0,  // No timeout. The server is expected to handle timing out requests.
    // Modify all AJAX requests to include the CSRF token.
    headers: { 'Csrf-Token': window.csrfToken }
  };

  var request = $.ajax(_.defaults(options, params));
  request
    .fail(function (jqXHR) {
      GA.sendAjaxException('AppRequest failed: ' + jqXHR.statusText, jqXHR.status, false);
      if (jqXHR.status === HttpStatus.UNAUTHORIZED) {
        // Session cookie has expired. At this point, the backend will redirect all
        // requests to the login page due to an expired cookie, so we just reload the
        // page to logout the user.
        AdminActions.discardChanges();
        location.reload(true);
      }
    });

  // Return the jqXHR object instead of just the deferred (the return value of
  // done/fail).
  return request;
};

var AppRequestByFetch= async function (url, requestOptions = {}) {
  var startTime = new Date().getTime();
  startInactivityTimer();
  // We store the current time in a JS cookie to ensure that an inactive application
  // tab cannot log the user out while they remain active in another tab. The cookie value
  // can be accessed by all tabs and windows (of a single browser) and is used in
  // conjunction with the `checkLastActiveAt` function to keep the timers of both tabs in
  // sync.
  comprehend.globals.lastActiveAt = startTime;
  Cookies.set('lastActiveAt', startTime, { path: '/' });
  requestOptions.headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Csrf-Token': window.csrfToken
  }
  var response = await fetch(url, requestOptions).then(async res => {
    if (res.ok) return res.json();
    else if (res.status === 403) {
      return res;
    } else if (res.status === HttpStatus.UNAUTHORIZED) {
      // Session cookie has expired. At this point, the backend will redirect all
      // requests to the login page due to an expired cookie, so we just reload the
      // page to logout the user.
      AdminActions.discardChanges();
      location.reload(true);
    }
    else if (res.status === 500){
      return res.json().then(json => {
        ExposureActions.createStatusMessage(
          json.message,
          StatusMessageTypeConstants.TOAST_ERROR,
        );
      })
    }
     else {
      GA.sendAjaxException('AppRequest failed: ' + res.statusText, res.status, false);
      const error = new Error(res.statusText);
      error.response = res;
      return error;
    }
  });
  return response;
};

var AppRequestByFetchPDF= async function (url, requestOptions = {}) {
  var startTime = new Date().getTime();
  startInactivityTimer();
  // We store the current time in a JS cookie to ensure that an inactive application
  // tab cannot log the user out while they remain active in another tab. The cookie value
  // can be accessed by all tabs and windows (of a single browser) and is used in
  // conjunction with the `checkLastActiveAt` function to keep the timers of both tabs in
  // sync.
  comprehend.globals.lastActiveAt = startTime;
  Cookies.set('lastActiveAt', startTime, { path: '/' });
  requestOptions.headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Csrf-Token': window.csrfToken
  }
  var response = await fetch(url, requestOptions).then(async res => {
    if (res.ok) return res;
    else if (res.status === 403) {
      return res;
    } else if (res.status === HttpStatus.UNAUTHORIZED) {
      // Session cookie has expired. At this point, the backend will redirect all
      // requests to the login page due to an expired cookie, so we just reload the
      // page to logout the user.
      AdminActions.discardChanges();
      location.reload(true);
    }
    else if (res.status === 500){
      return res.json().then(json => {
        ExposureActions.createStatusMessage(
          json.message,
          StatusMessageTypeConstants.TOAST_ERROR,
        );
      })
    }
     else {
      GA.sendAjaxException('AppRequest failed: ' + res.statusText, res.status, false);
      const error = new Error(res.statusText);
      error.response = res;
      return error;
    }
  });
  return response;
};

module.exports = AppRequest;
module.exports.AppRequestByFetch = AppRequestByFetch;
module.exports.AppRequestBackground = AppRequestBackground;
module.exports.AppRequestByFetchPDF = AppRequestByFetchPDF;

