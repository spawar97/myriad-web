var _ = require('underscore');

var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

var GroupsViewMixin = {

  routeName: RouteNameConstants.APERTURE_GROUPS,
  storeName: 'immAdminStore',
  storeKey: 'groupsView',

  getInitialState: function () {
    // Tracks whether we've done sufficient preliminary render passes. Here one initial render pass is sufficient.
    return {renderedEnough: false};
  },

  shouldComponentUpdate: function (nextProps) {
    // Wait for store change, no need to render when query is changing.
    return _.isEqual(this.props.query, nextProps.query);
  },

  componentWillReceiveProps: function (nextProps) {
    if (!nextProps.query.pageSize && !nextProps.query.page) {
      AdminActions.groupsViewResetCheckedGroups();
      this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      return;
    }
    // Fetch when query params changed.
    if (!_.isEqual(this.props.query, nextProps.query)) {
      AdminActions.loadGroupsWithPageSettings(nextProps.query);
      this.setState({renderedEnough: true});
    }
  },

  componentDidMount: function () {
    this.refreshGroupsView();
  },

  refreshGroupsView: function () {
    var pageSizeStr = this.props.query.pageSize;
    var pageNumStr = this.props.query.page;
    if (!Util.isPositiveInteger(pageSizeStr) || !Util.isPositiveInteger(pageNumStr)) {
      // Redirect if both are undefined, null, '', or invalid.
      if (!pageSizeStr && !pageNumStr) {
        this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      } else {
        AdminActions.groupsViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      }
      return;
    }
    if (!this.isValidPageSize()) {
      AdminActions.groupsViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      return;
    }
    var pageSettings = Util.packagePageSettings(this.props.query);
    AdminActions.loadGroupsWithPageSettings(pageSettings);
    this.setState({renderedEnough: true});
  },

  areGroupsReady: function (immAdminStore, renderedEnough) {
    var groupsExist = !immAdminStore.get('groups').isEmpty();
    var groupsViewIsEmpty = immAdminStore.getIn(['groupsView', 'isEmpty'], false);
    var groupsRequestInFlight = immAdminStore.hasIn(['outstandingRequests', 'groupsRequest']) || immAdminStore.get('groupsAreLoading');
    var isReady = groupsExist ||
      !groupsRequestInFlight && !groupsExist && renderedEnough && groupsViewIsEmpty ||  // An empty groups, first load.
      !groupsRequestInFlight && groupsExist && groupsViewIsEmpty;  // An empty groups list, subsequent loads.
    return isReady;
  },

  listViewInvalid: function () {
    if (!this.props.immAdminStore.get('groupsAreLoading')) {
      switch (this.props.immAdminStore.getIn(['groupsView', 'isValid'])) {
        case ListViewConstants.LIST_VIEW_VALID:
          return null;
        case ListViewConstants.LIST_VIEW_INVALID_QUERY:
          return FrontendConstants.ERROR_URL_QUERY;
        case ListViewConstants.LIST_VIEW_NOT_FOUND:
          return FrontendConstants.ERROR_TEAMS_NOT_FOUND;
        default:
          return null;
      }
    } else {
      return null;
    }
  }
};

module.exports = GroupsViewMixin;
