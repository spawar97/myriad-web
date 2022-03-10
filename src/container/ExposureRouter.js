import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import { IndexRedirect, Redirect, Route, Router, useRouterHistory } from 'react-router';
import Imm from 'immutable';
import useNamedRoutes from 'use-named-routes';
import createHistory from 'history/lib/createBrowserHistory';
import useBeforeUnload from 'history/lib/useBeforeUnload';
import EmbeddedSessionRefresher from './components/EmbeddedSessionRefresher';
import DOM from 'react-dom-factories';

import RouteHelpers from './AppRoutingHelpers';
import ExposureActions from './actions/ExposureActions';
import Dashboard from './components/Dashboard';
import DashboardStudio from './components/DashboardStudio';
import Exposure from './components/Exposure';
import TabularReportStudio from './components/TabularReportStudio';
import AdhocReportStudio from './components/exposure/AdhocReportStudio';
import AdvancedReportStudio from './components/exposure/AdvancedReportStudio';
import Builtin from './components/exposure/Builtin';
import Favorites from './components/exposure/Favorites';
import Monitor from './components/exposure/Monitor';
import MonitorStudio from './components/exposure/MonitorStudio';
import Reports from './components/exposure/Reports';
import QualityAgreement from './components/exposure/QualityAgreement';
import Tasks from './components/exposure/Tasks';
import Templates from './components/exposure/Templates';
import TemplateStudio from './components/exposure/TemplateStudio';
import KPIStudio from './components/exposure/KPIStudio';
import EmbeddedDashboards from './components/exposure/EmbeddedDashboards';
import EmbeddedReports from './components/exposure/EmbeddedReports';
import DataReviewStudio from './components/exposure/DataReviewStudio';
import DataReviewView from './components/exposure/DataReviewView';
import AuditTrailReports from './components/exposure/AuditTrailManager';
import ClinOpsInsights from './components/exposure/ClinOpsInsights';
import LogoutWrapper from './components/LogoutWrapper';
import GraphicalReportDrilldown from './components/exposure/GraphicalReportDrilldown';
import HomePage from './components/exposure/HomePage';
import OversightScorecard from './components/exposure/oversight/OversightScorecard';
import Ract from './components/exposure/ract/Ract';
import CreateRactTemplate from './components/exposure/ract/createtemplate/CreateRactTemplate';
import RactTemplateConfiguration from './components/exposure/ract/RactTemplateConfiguration';
import RactAssessment from './components/exposure/ract/ractassessment/RactAssessmentContainer/RactAssessmentContainer';
import RactSignOff from './components/exposure/ract/ractsignoff/RactSignOff';
import OversightScorecardConfiguration from "./components/exposure/oversight/OversightScorecardConfiguration";
import UserProfile from './components/UserProfile';
import UserAgreementsPage from './components/UserAgreementsPage';
import ClinicalInsights from './components/exposure/ClinicalInsights';
import OperationsInsights from './components/exposure/OperationsInsights';

let MobileNavMenu = React.createFactory(require('./components/MobileNavMenu'));
let ModalDialog = React.createFactory(require('./components/ModalDialog'));
let ModalWarningDialog = React.createFactory(require('./components/ModalWarningDialog'));
let Notifications = React.createFactory(require('./components/exposure/Notifications'));
let SideBar = React.createFactory(require('./components/SideBar'));
let StatusMessageContainer = React.createFactory(require('./components/StatusMessageContainer'));
let TopNav = React.createFactory(require('./components/TopNav'));
let MasterStudyFilter = React.createFactory(require('./components/MasterStudyFilter'));
let HomePageEntitySearcher = React.createFactory(require('./components/search/HomePageEntitySearcher'));

import ExposureNavConstants from './constants/ExposureNavConstants';
import RouteNameConstants from './constants/RouteNameConstants';
import {FeatureListConstants} from './constants/PermissionsConstants';
import FrontendConstants from './constants/FrontendConstants';
import AccountUtil, { accountFeatures } from './util/AccountUtil';
import PermissionsUtil from './util/PermissionsUtil';
import {calculateLandingPage} from './AppRoutingHelpers';
import GA from './util/GoogleAnalytics';
import './util/Pendo';
import Util from './util/util';
import ReportUtil from './util/ReportUtil';
import saamaLogoMobile from '../images/saama_logo.svg';
import LsacSupernavBar from '@saama/lsac-supernavbar';

// Do not remove - this needs to be initialized. By importing, it will initialize the yellowfin listeners on the
// comprehend global, which is required for Yellowfin integration to function.
import YellowfinListener from './util/YellowfinListener';
import BotView from './components/exposure/BotView';


var div = React.createFactory(require('./components/TouchComponents').TouchDiv);
var img = DOM.img;
var span = DOM.span;

import PropTypes from 'prop-types';
import Cookies from "js-cookie";


module.exports = {

  setHelpCookies: function() {
    const immAppConfig = comprehend.globals.immAppConfig;
    const helpName = AccountUtil.getCustomHelpAccountName(immAppConfig);
    Cookies.set('customer', helpName, {path: '/'});
  },

  // Defines the application routes and starts the main Router.
  //
  // TODO: Move the main handler components to their own modules as they get built out.
  createRoutes: function() {
    const immAppConfig = comprehend.globals.immAppConfig;

    this.setHelpCookies();

    // Main route handler components. These correspond to the main navigation
    // tabs in the sidebar. They should handle rendering the various tabbed
    // views of the application.

    var currentAccountId = immAppConfig.get('currentAccountId');
    comprehend.globals.currentUserId = immAppConfig.getIn(['userInfo', 'id']);
    comprehend.globals.sessionCookieMaxInactivityAge = immAppConfig.getIn(['accountMap', currentAccountId, 'account', 'sessionCookieMaxInactivityAge']) || immAppConfig.get('sessionCookieMaxInactivityAgeDefault');

    var SideBarMixinExposure = {
      contextTypes: {
        router: PropTypes.object
      },

      getSidebarIcons(immAppConfig) {
        return _.omit(ExposureNavConstants.icons, (icon, tabName) => {
          let omitSidebarTab = false;
          if (tabName === ExposureNavConstants.EXPOSURE_HOME_TAB
            && !AccountUtil.hasHomePageAccess(immAppConfig)) {
            omitSidebarTab = true;
          }
          if (tabName === ExposureNavConstants.EXPOSURE_YF_CLINOPS_INSIGHTS_TAB
            && !(AccountUtil.hasClinopsInsightsLeftNav(immAppConfig))) {
            omitSidebarTab = true;
          }
          if (tabName === ExposureNavConstants.EXPOSURE_YF_KPI_STUDIO_TAB
            && !AccountUtil.hasKPIStudio(immAppConfig)) {
            omitSidebarTab = true;
          }
          if (tabName === ExposureNavConstants.EXPOSURE_RBQM_TAB) {
            const subMenuItem = icon["Sub Menu"];
            const subMenuLength = Object.getOwnPropertyNames(subMenuItem).length;
            if (subMenuLength > 0) {
              icon["Sub Menu"] = _.omit(subMenuItem, (subIcon, subTabName) => {
                let subMenuSidebarTab = false;
                if (subTabName === ExposureNavConstants.EXPOSURE_OVERSIGHT_SCORECARD_TAB
                  && (!AccountUtil.hasOversightScorecard(immAppConfig)
                    || !PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.OVERSIGHT_SCORECARD)
                  )) {
                  subMenuSidebarTab = true;
                }
                if (subTabName === ExposureNavConstants.EXPOSURE_RACT_TAB && (!AccountUtil.hasFeature(immAppConfig, accountFeatures.RACT)
                  || !PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.RACT))) {
                  subMenuSidebarTab = true;
                }
                return subMenuSidebarTab;
              });
            } else {
              omitSidebarTab = true;
            }
          }
          if (tabName === ExposureNavConstants.EXPOSURE_TASKS_TAB
            && (!PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK))) {
            omitSidebarTab = true;
          }
          if ((tabName === ExposureNavConstants.EXPOSURE_CLINICAL_INSIGHTS_TAB || tabName === ExposureNavConstants.EXPOSURE_OPERATIONS_INSIGHTS_TAB)
            && !AccountUtil.hasV3BreadcrumbsAccess(immAppConfig)) {
            omitSidebarTab = true;
          }
          return omitSidebarTab;
        });
      },

      render: function() {
        const {immExposureStore} = this.props;
        const modalWarningDialogProps = immExposureStore.get('displayWarningModal');
        const modalWarningDialog = modalWarningDialogProps ? ModalWarningDialog(_.extend({ref: 'warning-modal'}, modalWarningDialogProps)) : null;
        const modalDialog = immExposureStore.get('modalContent') ? ModalDialog({ref: 'modal-dialog', isHidden: !_.isNull(modalWarningDialog)}, immExposureStore.get('modalContent')) : null;
        const accountSwitchUrl = immAppConfig.get('openIdServer') + '/auth/realms/' + immAppConfig.get('openIdRealm') +
            '/api/accountSwitcher?redirect_uri=' + window.location.origin + '/openid-refresh?redirectUri='
            + encodeURIComponent(Util.getNavigation())
            + "&client_id=" + Util.getClientIdOfModule()

        const props = {
          immExposureStore,
          cookies: this.props.cookies,
          height: this.props.height,
          query: this.props.query,
          params: this.props.params,
        };

        var desktopTopNav, mobileTopNav, sideBar;
        // If we have KPI studio enabled, we'll show the KPI studio sidebar
        // Otherwise hide it
        let icons = this.getSidebarIcons(immAppConfig);

          const logout = () => {
            GA.sendLogout();
            this.context.router.push('/confirm-logout');
          };
          const goToUserProfile = () => this.context.router.push('/user-profile');
          let immUserMenuItems = Imm.fromJS([
            {func: goToUserProfile, name: FrontendConstants.MY_PROFILE, icon: 'icon-user'},
            {func: logout, name: 'Sign out', icon: 'icon-exit'}
          ]);
          // Only a user with the ADMIN privilege is allowed to enter Architect mode.
          if (AccountUtil.isAdmin(immExposureStore)) {
            immUserMenuItems = immUserMenuItems.unshift(Imm.fromJS({func: _.bind(ExposureActions.transitionTo, null, RouteNameConstants.EXPOSURE_AUDIT_TRAIL_REPORTS), name: 'Audit Trail Reports', icon: 'icon-file'}));
            immUserMenuItems = immUserMenuItems.unshift(Imm.fromJS({func: () => this.context.router.push('/confirm-mode'), name: 'Enter Architect Mode', icon: 'icon-equalizer'}));
          }
          if (immAppConfig.get('isSuperAdmin', false)) {
            immUserMenuItems = immUserMenuItems.unshift(Imm.fromJS({func: _.bind(ExposureActions.transitionTo, null, RouteNameConstants.EXPOSURE_TEMPLATES), name: 'Templates', icon: 'icon-book'}));
          }
          immUserMenuItems = immUserMenuItems.unshift(Imm.fromJS({func: () => window.location.href = accountSwitchUrl, name: 'Switch Account', icon: 'icon-descending'}));
          const topNavProps = _.extend({}, props, {
            immUserInfo: immAppConfig.get('user_info'),
            isExposure: true,
            immStore: immExposureStore,
            immUserMenuItems: immUserMenuItems
          });
          desktopTopNav = TopNav(topNavProps);
          sideBar =
            SideBar({
              key: 'side-bar',
              currentTab: this.NavConstant,
              taskCount: immExposureStore.get('taskSummaries').size,
              sideBarTabs: icons,
              logo: 'White'});
        
        var statusMessages = StatusMessageContainer({
          immStatusMessageList: immExposureStore.get('statusMessageList'),
          handleCloseStatusMessage: ExposureActions.closeStatusMessage
        });

        // Disable scrolling of underlying report in mobile when a modal is open.
        var disableScroll = immExposureStore.get('showFiltersPane') ||
          immExposureStore.get('showMobileNavMenu') ||
          immExposureStore.get('showNotificationsDropdown');

        var mobileTopNavMenusVisible = immExposureStore.get('showMobileNavMenu') ||
          immExposureStore.get('showNotificationsDropdown');

        const exposureClassnames = cx(
          'exposure',
          {
            'mobile-scroll-disabled': disableScroll,
            'mobile-top-nav-menus-visible': mobileTopNavMenusVisible
          });

        const mainContent = React.cloneElement(this.props.children, props);
        var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
        var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
        var hideFilterPanel = immFile && immFile.get('hideLeftFilterPanel');
        return (
          <div className={exposureClassnames}>
            {/* eventually will be deleting the myriad sidebar completely to use supernavbar */}
            {/* {sideBar} */}
            {statusMessages}
            {desktopTopNav}
            {modalDialog}
            {modalWarningDialog}
            {mobileTopNav}
            <div className={`main-content ${hideFilterPanel ? 'CIODashboard' : ''}`}>{mainContent}</div>
            {
              // If we have KPI studio enabled, we want to prevent the Yellowfin session from expiring whilst the user is
              // active on app, but not on Yellowfin (the case being we have one tab open with a YF report, and another tab browsing the app
              // This hack will embed an img tag that changes each render of this component (forcing a refresh), and
              // this image tag will point to the yellowfin instance url (rendering an img tag will force a GET request
              // on the src, which if pointed to the Yellowfin instance when having an active session cookie will refresh that session)
              <EmbeddedSessionRefresher windowLocation={window.location.href} logout={false}/>
            }
          </div>
        );
      }
    };

    // This wrapper component is used to decide which tab should be selected.
    var SideBarFavorites = createReactClass({
      displayName: 'SideBarFavorites',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_FAVORITES_TAB,
    });

    var SideBarReports = createReactClass({
      displayName: 'SideBarReports',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_REPORTS_TAB,
    });

    var SideBarTasks = createReactClass({
      displayName: 'SideBarTasks',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_TASKS_TAB,
    });

    let SideBarClinicalInsights = createReactClass({
      displayName: 'SideBarClinicalInsights',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_CLINICAL_INSIGHTS_TAB,
    });

    let SideBarHome = createReactClass({
      displayName: 'SideBarHome',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_HOME_TAB
    });

    let SideBarKPIStudio = createReactClass({
      displayName: 'SideBarKPIStudio',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_YF_KPI_STUDIO_TAB,
    });

    let SideBarClinOpsInsights = createReactClass({
      displayName: 'SideBarClinOpsInsights',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_YF_CLINOPS_INSIGHTS_TAB,
    });

    const SideBarOversightScorecard = createReactClass({
      displayName: 'SideBarOversightScorecard',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_OVERSIGHT_SCORECARD_TAB,
    });

    const SideBarRACT = createReactClass({
      displayName: 'SideBarRACT',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_RACT_TAB,
    });

    let SideBarOperationsInsights = createReactClass({
      displayName: 'SideBarOperationsInsights',
      mixins: [SideBarMixinExposure],
      NavConstant: ExposureNavConstants.EXPOSURE_OPERATIONS_INSIGHTS_TAB,
    });

    const landingPage = calculateLandingPage(immAppConfig);

    // Construct the routes here, outside of the <Router /> tree so that we can pass them into
    const routes = (
      <Route path='/' component={Exposure} onChange={() => ExposureActions.setShowSessionStudyFilter(false)}>
        <IndexRedirect to={landingPage} />

        {/* <Route component={SideBarFavorites}>
          <Route name={RouteNameConstants.EXPOSURE_FAVORITES} path='favorites' component={Favorites} />
        </Route> */}

        <Route component={SideBarKPIStudio}>
          <Route name={RouteNameConstants.EXPOSURE_YF_KPI_STUDIO} path='embedded/kpi-studio/' component={KPIStudio} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW} path='embedded/dashboards/:fileId' component={EmbeddedDashboards} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_KPI_STUDIO_REPORTS_SHOW} path='embedded/kpi-studio/reports/:fileId' component={EmbeddedReports} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_GPP_REPORTS_DRILLDOWN} path='embedded/gpp-report-drilldown' component={GraphicalReportDrilldown} />
        </Route>

        <Route component={SideBarReports}>
          <Route name={RouteNameConstants.EXPOSURE_FOLDERS} path='folders/' component={Reports} />
          <Route name={RouteNameConstants.EXPOSURE_FOLDERS_SHOW} path='folders/:fileId' component={Reports} />
          <Route name={RouteNameConstants.EXPOSURE_DASHBOARDS_NEW} path='dashboards/new' component={DashboardStudio} />
          <Route name={RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW} path='dashboards/:fileId/' component={Dashboard} />
          <Route name={RouteNameConstants.EXPOSURE_REPORTS_NEW} path='reports/new' component={TabularReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_REPORTS_SHOW} path='reports/:fileId/' component={Dashboard} />
          <Route name={RouteNameConstants.EXPOSURE_MONITORS_NEW} path='monitors/new' component={MonitorStudio} />
          <Route name={RouteNameConstants.EXPOSURE_MONITORS_SHOW} path='monitors/:fileId/' component={Monitor} />
          <Route name={RouteNameConstants.EXPOSURE_MONITORS_EDIT} path='monitors/:fileId/edit' component={MonitorStudio} />
          <Route name={RouteNameConstants.EXPOSURE_BUILTIN_SHOW} path='builtin/:fileId/' component={Builtin} />
          <Route name={RouteNameConstants.EXPOSURE_DASHBOARDS_EDIT} path='dashboards/:fileId/edit' component={DashboardStudio} />
          <Route name={RouteNameConstants.EXPOSURE_REPORTS_EDIT} path='reports/:fileId/edit' component={TabularReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_TEMPLATES} path='templates/' component={Templates} />
          <Route name={RouteNameConstants.EXPOSURE_TEMPLATES_NEW} path='templates/new' component={TemplateStudio} />
          <Route name={RouteNameConstants.EXPOSURE_TEMPLATES_EDIT} path='templates/:templateId/edit' component={TemplateStudio} />
          <Route name={RouteNameConstants.EXPOSURE_ADHOC_REPORTS_NEW} path='adhoc-reports/new' component={AdhocReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_ADHOC_REPORTS_EDIT} path='adhoc-reports/:fileId/edit' component={AdhocReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_TEMPLATES_NEW_ADVANCED_REPORT} path='advanced-report/new' component={AdvancedReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_TEMPLATES_EDIT_ADVANCED_REPORT} path='advanced-report/:advancedReportId/edit' component={AdvancedReportStudio} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW} path='embedded/dashboards/:fileId' component={EmbeddedDashboards} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_REPORTS_SHOW} path='embedded/reports/:fileId' component={EmbeddedReports} />
          <Route name={RouteNameConstants.EXPOSURE_DATA_REVIEW_NEW} path='data-review/new' component={DataReviewStudio} />
          <Route name={RouteNameConstants.EXPOSURE_DATA_REVIEW_EDIT} path='data-review/:fileId/edit' component={DataReviewStudio} />
          <Route name={RouteNameConstants.EXPOSURE_DATA_REVIEW_SHOW} path='data-review/:fileId/' component={DataReviewView} />
          <Route name={RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_NEW} path='quality-agreements/new' component={QualityAgreement} />
          <Route name={RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_SHOW} path='quality-agreements/:fileId' component={QualityAgreement} />
          <Route name={RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_EDIT} path='quality-agreements/:fileId/edit' component={QualityAgreement} />
          <Route name={RouteNameConstants.EXPOSURE_AUDIT_TRAIL_REPORTS} path='audit-trail-reports/' component={AuditTrailReports} />
          <Route name={RouteNameConstants.EXPOSURE_BOT_DASHBOARD} path='bot/:fileId' component={BotView} />
        </Route>

        <Route component={SideBarTasks}>
          <Route name={RouteNameConstants.EXPOSURE_TASKS_NEW} path='tasks/new' component={Dashboard} />
          <Route name={RouteNameConstants.EXPOSURE_TASKS_SHOW} path='tasks/:taskId' component={Dashboard} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_NEW} path='embedded/tasks/new' component={EmbeddedReports} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW} path='embedded/tasks/:taskId' component={EmbeddedReports} />
          <Route name={RouteNameConstants.EXPOSURE_TASKS} path='tasks/' component={Tasks} />
          <Route name={RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_NEW} path='data-review/tasks/new' component={DataReviewView} />
          <Route name={RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_SHOW} path='data-review/tasks/:taskId' component={DataReviewView} />
        </Route>

        <Route component={SideBarOperationsInsights}>
          <Route name={RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS} path='operations-insights'
                 component={OperationsInsights}/>
          <Route name={RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS}
                 path='operations-insights/reports/:fileId' component={OperationsInsights}/>
        </Route>

        <Route component={SideBarClinicalInsights}>
          <Route name={RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS} path='clinical-insights'
                 component={ClinicalInsights}/>
          <Route name={RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS}
                 path='clinical-insights/reports/:fileId' component={ClinicalInsights}/>
        </Route>

        <Route component={SideBarHome}>
          <Route name={RouteNameConstants.EXPOSURE_HOME} path='home/' component={HomePage} >
            <Route name={RouteNameConstants.EXPOSURE_HOME_WITH_TAB} path='tab/:activeTabId' component={HomePage} />
            <Route name={RouteNameConstants.EXPOSURE_DASHBOARDS_HOME} path='mydashboards' component={HomePage} />
            <Route name={RouteNameConstants.EXPOSURE_HOME_EDITOR} path='edit' component={HomePage} />
            <Route name={RouteNameConstants.EXPOSURE_HOME_TEAM_EDITOR} path='teams/edit' component={HomePage} />
            <Route name={RouteNameConstants.EXPOSURE_FAVORITES} path='favorites' component={HomePage} />
          </Route>
          <Route name={RouteNameConstants.EXPOSURE_USER_PROFILE} path="/user-profile" component={UserProfile} />
        </Route>

        <Route component={SideBarClinOpsInsights}>
          <Route name={RouteNameConstants.EXPOSURE_YF_CLINOPS_INSIGHTS} path='embedded/clinops-insights/' component={ClinOpsInsights} />
          <Route name={RouteNameConstants.EXPOSURE_EMBEDDED_CLINOPS_INSIGHTS_REPORTS_SHOW} path='embedded/clinops-insights/reports/:fileId' component={EmbeddedReports} />
        </Route>

        <Route component={SideBarOversightScorecard}>
          <Route name={RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD} path='oversight-scorecard/'
                 component={OversightScorecard}
          />
          <Route name={RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD_CONFIGURE} path='oversight-scorecard/configure'
                 component={OversightScorecardConfiguration}
          />
        </Route>

        <Route component={SideBarRACT}>
          <Route name={RouteNameConstants.EXPOSURE_RACT} path='ract/' component={Ract}/>
          <Route name={RouteNameConstants.EXPOSURE_CREATE_RACT_TEMPLATE} path='ract/create-template' component={CreateRactTemplate}/>
          <Route name={RouteNameConstants.EXPOSURE_RACT_TEMPLATE_CONFIGURATION} path='ract/ract-template-configuration' component={RactTemplateConfiguration}/>
          <Route name={RouteNameConstants.EXPOSURE_RACT_ASSESSMENT} exact path='ract/assessment-configuration/:ractId/:selectedTabId' component={RactAssessment}/>
          <Route name={RouteNameConstants.EXPOSURE_RACT_ASSESSMENT} path='ract/assessment/:selectedTabId' component={RactAssessment}/>
          <Route name={RouteNameConstants.EXPOSURE_RACT_SIGN_OFF} path='ract/sign-off' component={RactSignOff}/>        
          <Route name={RouteNameConstants.EXPOSURE_RACT_ASSESSMENT_REVIEW} path='ract/assessment-review/:ractId' component={RactAssessment}/>
          <Route name={RouteNameConstants.EXPOSURE_EDIT_RACT_TEMPLATE} path='ract/edit-template/:ractTemplateId' component={CreateRactTemplate}/>
          <Route name={RouteNameConstants.EXPOSURE_VIEW_RACT_TEMPLATE} path='ract/view-template/:ractTemplateId' component={CreateRactTemplate}/>
          <Route name={RouteNameConstants.EXPOSURE_DUPLICATE_RACT_TEMPLATE} path='ract/duplicate-template/:ractTemplateId' component={CreateRactTemplate}/>
        </Route>

        <Route>
          <Route name={RouteNameConstants.EXPOSURE_RBQM} />
        </Route>

        <Route path="confirm-logout" component={LogoutWrapper} />
        <Route path="confirm-change-account" onEnter={RouteHelpers.changeAccount} />
        <Route path="audit-reports" onEnter={RouteHelpers.changeMode('/admin/audit-reports')} />
        <Route path="confirm-mode" onEnter={RouteHelpers.changeMode('/admin/schemas')} />
        <Route path='policy-and-agreements' component={UserAgreementsPage}/>
      </Route>
    );

    const customCreateHistory = useNamedRoutes(useRouterHistory(useBeforeUnload(createHistory)));
    const customHistory = customCreateHistory({
      routes,
      getUserConfirmation(message, callback) {
        const splitMessage = message.split("|");
        // No custom message case
        if (splitMessage.length < 2) {
          ExposureActions.displayUnsavedWorkModal(message, message, callback);
        }
        else {
          ExposureActions.displayUnsavedWorkModal(splitMessage[0], splitMessage[1], callback);
        }
      }
    });

    // Defines the main routing hierarchy in the application. The deepest route
    // will be matched with highest priority.
    ReactDOM.render(
      <Router history={customHistory} routes={routes} />,
      document.getElementById('container')
    );
  }
};
