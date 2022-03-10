require('@babel/polyfill');
var React = require('react');
var _ = require('underscore');
var $ = require('jquery');
var Imm = require('immutable');

const GA = require('./util/GoogleAnalytics');
require('./util/IeSupport');
require ('core-js');

Object.assign = require('object-assign');  // Required for FixedDataTable.

// Load the CSS for our app.
// TODO - break this up per component for better loading performance.
// Can't put this in any component that has jest tests on it, because jest will fail on any require() that doesn't load
// JavaScript.
// Include normalize as a base to start from, then include library stylesheets and finally our app stylesheets.
require('normalize.css');
require('fixed-data-table/dist/fixed-data-table.css');
require('rc-tooltip/assets/bootstrap.css');
require('react-widgets/dist/css/react-widgets.css');
require('react-datetime/css/react-datetime.css');
require('../stylesheets/app.scss');
require('../stylesheets/_breakpoints.scss');
require('react-select/dist/react-select.css');

// Copy the favicon to the public directory
var url = require('../images/favicon.png');

// Internet explorer does not have the window.location.origin attribute defined. We use this within our app to
// build out redirects for help text links (since they are not part of our SPA we need to actually use anchor tags to
// exit our app). By defining this attribute here it's injected into our SPA and available wherever we navigate within
// the app.
// See http://tosbourn.com/a-fix-for-window-location-origin-in-internet-explorer/
if (!window.location.origin) {
  window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
}

// Load underscore, React, jQuery, and any other global libraries into our main comprehend library.
// These will end up being exported and copied into the global comprehend var
// This is due to webpack's library configuration -> see output: { library: 'comprehend', ... } in webpack.config.js
// Also these values are populated by app.scala
exports.$ = $;
exports._ = _;
exports.React = React;

exports.app = function(appConfig) {
  // Store the app config globally so that it can be easily accessed by
  // components that need it.
  comprehend.globals.immAppConfig = Imm.fromJS(appConfig);

  // Load routes.
  require(/\/admin\//.test(window.location.href) ? './AdminRouter' : './ExposureRouter').createRoutes();
};
exports.globals = {};

// Track basic JavaScript errors.
window.addEventListener('error', GA.sendExceptionHandler);
