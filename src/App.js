import { useEffect } from "react";
import React from 'react';
require('core-js');
import "regenerator-runtime/runtime";
var Imm = require('immutable');
require('normalize.css');
require('fixed-data-table/dist/fixed-data-table.css');
require('rc-tooltip/assets/bootstrap.css');
require('react-widgets/dist/css/react-widgets.css');
require('react-datetime/css/react-datetime.css');
require('./stylesheets/app.scss');
require('./stylesheets/_breakpoints.scss');
require('react-select/dist/react-select.css');
Object.assign = require('object-assign');  // Required for FixedDataTable.
var _ = require('underscore');
var $ = require('jquery');
const GA = require('./container/util/GoogleAnalytics');
window.addEventListener('error', GA.sendExceptionHandler);
window.$ = window.jQuery = $;
window._ = _;
window.React = React;
window.globals = {};
comprehend = { globals: { immAppConfig: Imm.fromJS({}) } }

const Router = require(/\/admin\//.test(window.location.href) ? './container/AdminRouter' : './container/ExposureRouter');


function App() {

  useEffect(() => {
    debugger
    if (!window.location.origin) {
      window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    }
  }, []);

  return (
    Router.createRoutes()
  );
}

export default App;
