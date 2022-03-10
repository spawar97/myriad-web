var _ = require('underscore');
var Imm = require('immutable');

var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

var UsersViewMixin = {

  routeName: RouteNameConstants.APERTURE_USERS,
  storeName: 'immAdminStore',
  storeKey: 'usersView',

  getInitialState: function() {
    // Tracks whether we've done sufficient preliminary render passes. Here one initial render pass is sufficient.
    return {renderedEnough: false};
  },

  shouldComponentUpdate: function(nextProps) {
    // Wait for store change, no need to render when query is changing.
    return _.isEqual(this.props.query, nextProps.query);
  },

  componentWillReceiveProps: function(nextProps) {
    if (!nextProps.query.pageSize && !nextProps.query.page) {
      AdminActions.usersViewResetCheckedUserWrappers();
      this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      return;
    }
    // Fetch when query params changed.
    if (!_.isEqual(this.props.query, nextProps.query)) {
      AdminActions.loadUsersWithPageSettings(nextProps.query);
      this.setState({renderedEnough: true});
    }
  },

  componentDidMount: function() {
    this.refreshUsersView();
  },

  refreshUsersView: function() {
    var pageSizeStr = this.props.query.pageSize;
    var pageNumStr = this.props.query.page;

    AdminActions.usersViewResetCheckedUserWrappers();

    if (!Util.isPositiveInteger(pageSizeStr) || !Util.isPositiveInteger(pageNumStr)) {
      // Redirect if both are undefined, null, '', or invalid.
      if (!pageSizeStr && !pageNumStr) {
        this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      } else {
        AdminActions.usersViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      }
      return;
    }
    var pageSettings = Util.packagePageSettings(this.props.query);
    AdminActions.loadUsersWithPageSettings(pageSettings);
    this.setState({renderedEnough: true});
  },

  areUsersReady: function(immAdminStore, renderedEnough) {
    var usersExist = !immAdminStore.get('users', Imm.Map()).isEmpty();
    var usersViewIsEmpty = immAdminStore.getIn(['usersView', 'isEmpty'], false);
    var usersRequestInFlight = immAdminStore.hasIn(['outstandingRequests', 'usersRequest']) || immAdminStore.get('usersAreLoading');
    var isReady = usersExist ||
      !usersRequestInFlight && !usersExist && renderedEnough && usersViewIsEmpty ||  // An empty users, first load.
      !usersRequestInFlight && usersExist && usersViewIsEmpty;  // An empty users list, subsequent loads.
    return isReady;
  },

  listViewInvalid: function() {
    if (!this.props.immAdminStore.get('usersAreLoading')) {
      switch (this.props.immAdminStore.getIn(['usersView','isValid'])) {
        case ListViewConstants.LIST_VIEW_VALID:
          return null;
        case ListViewConstants.LIST_VIEW_INVALID_QUERY:
          return FrontendConstants.ERROR_URL_QUERY;
        case ListViewConstants.LIST_VIEW_NOT_FOUND:
          return FrontendConstants.ERROR_USERS_NOT_FOUND;
        default:
          return null;
      }
    } else {
      return null;
    }
  }
};

module.exports = UsersViewMixin;
