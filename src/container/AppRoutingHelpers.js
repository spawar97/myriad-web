import AccountUtil from "./util/AccountUtil";

const AppRequest = require('./http/AppRequest');
const GA = require('./util/GoogleAnalytics');

const AdminActions = require('./actions/AdminActions');
const ExposureActions = require('./actions/ExposureActions');
const StatusMessageTypeConstants = require('./constants/StatusMessageTypeConstants');
import RouteNameConstants from './constants/RouteNameConstants';

/**
 * @param callback Used to signal completion of the onEnter handler. We never
 * call it here because we don't intend on completing the route transition (we
 * reload the page instead).
 */
function changeAccount(nextState, replace, callback) {
  const accountId = nextState.location.query.accountId;
  const accountType = nextState.location.query.accountType;
  const isExposure = accountType === 'exposure';
  const accountName = nextState.location.query.accountName;
  const destination = isExposure ? '/' : '/admin';

  AppRequest({type: 'POST', url: `/api/change-account/${accountId}/${accountType}`}).then(
    // We use window.location.replace here because we want the action of
    // changing accounts to be a reload of the page and not have the
    // previous page in the history.
    () => window.location.replace(destination),
    (jqXHR) => {
      GA.sendAjaxException(`Changing account to ${accountId} failed.`, jqXHR.status);

      const ActionCreator = isExposure ? ExposureActions : AdminActions;
      ActionCreator.createStatusMessage(`The account could not be changed to ${accountName}.`, StatusMessageTypeConstants.WARNING);
    }
  );
}

function calculateLandingPage(immAppConfig) {
  const defaultLandingPage = "/home/";

  let landingPage = defaultLandingPage;
  if (!AccountUtil.hasHomePageAccess(immAppConfig)) {
    landingPage = '/folders/';
  } else {
    if (AccountUtil.hasHomePageDefaultMyDashboards(immAppConfig)) {
      landingPage = RouteNameConstants.EXPOSURE_DASHBOARDS_HOME;
    }
  }

  return landingPage;
}

/**
 * @param path The path to navigate to when the onEnter handler is called.
 */
function changeMode(path) {
  return (nextState, replace, callback) => window.location.replace(path);
}

module.exports.changeAccount = changeAccount;
module.exports.changeMode = changeMode;
module.exports.calculateLandingPage = calculateLandingPage;
