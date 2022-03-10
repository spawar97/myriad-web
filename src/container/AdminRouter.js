var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
const ReactRouter = require('react-router');
var Imm = require('immutable');
import useNamedRoutes from 'use-named-routes';
import createHistory from 'history/lib/createBrowserHistory';
import useBeforeUnload from 'history/lib/useBeforeUnload';

const RouteHelpers = require('./AppRoutingHelpers');
var AdminActions = require('./actions/AdminActions');
var Admin = require('./components/Admin');
var Accounts = require('./components/aperture/Accounts');
var EditSchema = require('./components/aperture/EditSchema');
var GPP = require('./components/aperture/GPP');
var Schema = require('./components/aperture/Schema');
var SingleGroup = require('./components/aperture/SingleGroup');
var UserDetail = require('./components/aperture/UserDetail');
import UserManagement from './components/aperture/UserManagement';
var ModalDialog = React.createFactory(require('./components/ModalDialog'));
var SideBar = React.createFactory(require('./components/SideBar'));
const StatusMessageContainer = React.createFactory(require('./components/StatusMessageContainer'));
var TopNav = React.createFactory(require('./components/TopNav'));
var AdminNavConstants = require('./constants/AdminNavConstants');
var RouteNameConstants = require('./constants/RouteNameConstants');
var AccountUtil = require('./util/AccountUtil');
var Util = require('./util/util');
import ShareKPIs from './components/aperture/ShareKPIs';
import LogoutWrapper from './components/LogoutWrapper';
import DataAccessGroup from './components/aperture/DataAccessGroup';
import DataAccessGroupsManagement from './components/aperture/DataAccessGroupsManagement';
import DataReviewRole from './components/aperture/DataReviewRole';
import DataReviewRolesManagement from './components/aperture/DataReviewRolesManagement';
import DispositionTermView from "./components/aperture/dispositions/DispositionTermView";
import LsacSupernavBar from '@saama/lsac-supernavbar';
import TaskManagementView from "./components/aperture/taskManagement/TaskManagementView";


var div = React.createFactory(require('./components/TouchComponents').TouchDiv);

const IndexRedirect = ReactRouter.IndexRedirect;
const Route = ReactRouter.Route;
const Router = ReactRouter.Router;
const useRouterHistory = ReactRouter.useRouterHistory;

import PropTypes from 'prop-types';

module.exports = {
  // Defines the application routes and starts the main Router.
  //
  // TODO: Move the main handler components to their own modules as they get
  // built out.
  createRoutes: function() {
    const immAppConfig = comprehend.globals.immAppConfig;

    // Main route handler components. These correspond to the main navigation
    // tabs in the sidebar. They should handle rendering the various tabbed
    // views of the application.

    var currentAccountId = immAppConfig.get('currentAccountId');
    comprehend.globals.currentUserId = immAppConfig.getIn(['userInfo', 'id']);
    comprehend.globals.sessionCookieMaxInactivityAge = immAppConfig.getIn(['accountMap', currentAccountId, 'account', 'sessionCookieMaxInactivityAge']) || immAppConfig.get('sessionCookieMaxInactivityAgeDefault');

    // This wrapper component is used to decide which tab should be selected.
    var SideBarMixinAdmin = {
      contextTypes: {
        router: PropTypes.object
      },

      componentWillMount: function() {
        AdminActions.setCurrentTab(this.NavConstant);
      },

      render: function() {
        var immAdminStore = this.props.immAdminStore;
        var modalDialog = immAdminStore.get('modalContent') ? ModalDialog(null, immAdminStore.get('modalContent')) : null;
        const accountSwitchUrl = immAppConfig.get('openIdServer') + '/auth/realms/' + immAppConfig.get('openIdRealm')
            + '/api/accountSwitcher?redirect_uri=' + window.location.origin + '/openid-refresh?redirectUri='
            + encodeURIComponent('/home')
            + "&client_id=" + immAppConfig.get('openIdClientId')

        var immUserMenuItems = Imm.fromJS([
          {func: () => window.location.href = accountSwitchUrl, name: 'Switch Account', icon: 'icon-descending'},
          {func: () => this.context.router.push('/confirm-mode'), name: 'Enter Analyst Mode', icon: 'icon-stats2'},
          {func: () => this.context.router.push(RouteNameConstants.APERTURE_DISPOSITION_TERMS), name: 'Disposition Event Configuration', icon: 'icon-wrench'},
          {func: () => this.context.router.push(RouteNameConstants.TASK_CONFIGURATION), name: 'Task Configuration', icon: 'icon-task-list'},
          {func: () => this.context.router.push('/confirm-logout'), name: 'Sign out', icon: 'icon-exit'}]);
        var icons = immAppConfig.get('isSuperAdmin') ?
          AdminNavConstants.icons :
          _.omit(AdminNavConstants.icons, function(icon, tabName) { return tabName === 'Accounts'; });

        // Only show the Share KPIs tab if the account has KPI Studio enabled
        if (!AccountUtil.hasKPIStudio(immAppConfig)) {
          icons = _.omit(icons, (icon, tabName) => tabName === AdminNavConstants.ADMIN_SHARE_TAB);
        }

        const mainContent = React.cloneElement(
          this.props.children,
          {
            immAppConfig,
            width: this.props.width,
            height: this.props.height,
            params: this.props.params,
            query: this.props.query,
            immAdminStore: this.props.immAdminStore,
            immDataReviewStore: this.props.immDataReviewStore,
          });

        const statusMessages = StatusMessageContainer({
          immStatusMessageList: immAdminStore.get('statusMessageList'),
          handleCloseStatusMessage: AdminActions.closeStatusMessage
        });

        return (
          <div className='admin'>
            <SideBar isLegacyAccount={AccountUtil.isLegacyAccount(immAdminStore)}
                     currentTab={this.NavConstant}
                     sideBarTabs={icons}
                     logo='Black' 
                     isAperture={true}/>
            {statusMessages}
            <TopNav immUserInfo={immAppConfig.get('user_info')}
                    immStore={immAdminStore}
                    isExposure={false}
                    version={immAppConfig.get('version')}
                    immUserMenuItems={immUserMenuItems} />
            {mainContent}
            {modalDialog}
          </div>
        );
      }
    };

    // This wrapper component is used to decide which tab should be selected.
    var SideBarSchema = createReactClass({
      displayName: 'SideBarSchema',
      mixins: [SideBarMixinAdmin],
      NavConstant: AdminNavConstants.ADMIN_SCHEMA_TAB
    });

    var SideBarUsers = createReactClass({
      displayName: 'SideBarUsers',
      mixins: [SideBarMixinAdmin],
      NavConstant: AdminNavConstants.ADMIN_USERS_TAB
    });

    var SideBarAccounts = createReactClass({
      displayName: 'SideBarAccounts',
      mixins: [SideBarMixinAdmin],
      NavConstant: AdminNavConstants.ADMIN_ACCOUNTS_TAB
    });

    let SideBarShare = createReactClass({
      displayName: 'SideBarShare',
      mixins: [SideBarMixinAdmin],
      NavConstant: AdminNavConstants.ADMIN_SHARE_TAB
    });

    let SideBarDispositions = createReactClass({
      displayName: 'SideBarDispositions',
      mixins: [SideBarMixinAdmin],
      NavConstant: AdminNavConstants.ADMIN_DISPOSITIONS_TAB
    });

    const landingPage = RouteHelpers.calculateLandingPage(immAppConfig)

    // Defines the main routing hierarchy in the application. The deepest route
    // will be matched with highest priority.
    const routes = (
      <Route path="/">
        {/* Render the Admin component if that is the current URL. */}
        <Route name='Admin' path='/admin' component={Admin}>
          <IndexRedirect to="/admin/schemas/" />

          <Route component={SideBarSchema}>
            <Route name={RouteNameConstants.APERTURE_SCHEMAS} path='schemas/' component={Schema} />
            <Route name={RouteNameConstants.APERTURE_SCHEMAS_NEW} path='schemas/new' component={EditSchema} onLeave={AdminActions.resetWorkingCs} />
            <Route name={RouteNameConstants.APERTURE_SCHEMAS_EDIT} path='schemas/:schemaId/edit' component={EditSchema} onLeave={AdminActions.resetWorkingCs} />
            <Route name={RouteNameConstants.APERTURE_SCHEMAS_GPP} path='schemas/:schemaId/gpp' component={GPP} />
            <Route name={RouteNameConstants.APERTURE_DISPOSITION_TERMS} path='accounts/dispositions' component={DispositionTermView} />
            <Route name={RouteNameConstants.TASK_CONFIGURATION} path='accounts/task-configuration' component={TaskManagementView} />
          </Route>
          <Route component={SideBarUsers}>
            <Route name={RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS} path='data-access-groups/' component={UserManagement} />
            <Route name={RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_NEW} path='data-access-groups/new' component={DataAccessGroup} />
            <Route name={RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_EDIT} path='data-access-groups/:dataAccessGroupId/edit' component={DataAccessGroup} />
            <Route name={RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_MANAGEMENT} path='data-access-groups/manage' component={DataAccessGroupsManagement}/>
            <Route name={RouteNameConstants.APERTURE_DATA_REVIEW_ROLES} path='data-review-roles/' component={UserManagement} />
            <Route name={RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_MANAGEMENT} path='data-review-roles/manage' component={DataReviewRolesManagement} />
            <Route name={RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_NEW} path='data-review-roles/new' component={DataReviewRole} />
            <Route name={RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_EDIT} path='data-review-roles/:dataReviewRoleId/edit' component={DataReviewRole} />
            <Route name={RouteNameConstants.APERTURE_GROUPS} path='teams/' component={UserManagement} />
            <Route name={RouteNameConstants.APERTURE_GROUPS_NEW} path='teams/new' component={SingleGroup} />
            <Route name={RouteNameConstants.APERTURE_GROUPS_EDIT} path='teams/:groupId/edit' component={SingleGroup} />
            <Route name={RouteNameConstants.APERTURE_USERS_LEGACY} path='legacy-users/' component={UserManagement} />
            <Route name={RouteNameConstants.APERTURE_USERS} path='users/' component={UserManagement} />
            <Route name={RouteNameConstants.APERTURE_USERS_SHOW} path='users/:userId' component={UserDetail} />
          </Route>
          <Route component={SideBarShare}>
            <Route name={RouteNameConstants.APERTURE_SHARE_KPIS} path='share-kpis/' component={ShareKPIs} />
          </Route>
        </Route>

        <Route path="confirm-logout" component={LogoutWrapper} />
        <Route path="confirm-change-account" onEnter={RouteHelpers.changeAccount} />
        <Route path="confirm-mode" onEnter={RouteHelpers.changeMode(landingPage)} />
      </Route>
    );

    const customCreateHistory = useNamedRoutes(useRouterHistory(useBeforeUnload(createHistory)));
    const customHistory = customCreateHistory({
      routes,
      getUserConfirmation(message, callback) {
        const splitMessage = message.split('|');
        if (splitMessage.length < 2) {
          AdminActions.displayUnsavedWorkModal(callback);
        }
        else {
          AdminActions.displayUnsavedWorkModal(callback, splitMessage[0], splitMessage[1]);
        }
      }
    });

    ReactDOM.render(
      <Router history={customHistory} routes={routes} />,
      document.getElementById('container')
    );
  }
};
