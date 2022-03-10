var _ = require('underscore');

var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

var FavoritesViewMixin = {

  routeName: RouteNameConstants.EXPOSURE_FAVORITES,
  storeName: 'immExposureStore',
  storeKey: 'favoritesView',

  getInitialState: function() {
    return {rederedEnough: false};
  },

  listViewInvalid: function() {
    if (!this.props.immExposureStore.get('favoritesRequest')) {
      switch (this.props.immExposureStore.getIn(['favoritesView', 'isValid'])) {
        case ListViewConstants.LIST_VIEW_VALID:
          return null;
        case ListViewConstants.LIST_VIEW_INVALID_QUERY:
          return FrontendConstants.ERROR_URL_QUERY;
        case ListViewConstants.LIST_VIEW_NOT_FOUND:
          return FrontendConstants.ERROR_NOT_FOUND;
        default:
          return null;
      }
    } else {
      return null;
    }
  },

  shouldComponentUpdate: function(nextProps) {
    // Wait for store change, no need to render when query is changing.
    return _.isEqual(this.props.query, nextProps.query);
  },

  componentWillReceiveProps: function(nextProps) {
    if (!nextProps.query.pageSize || !nextProps.query.page) {
      this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      return;
    }
    if (!_.isEqual(this.props.query, nextProps.query)) {
      ExposureActions.fetchFavoritesWithPageSettings(nextProps.query);
      this.setState({rederedEnough: true});
    }
  },

  componentDidMount: function() {
    var pageSizeStr = this.props.query.pageSize;
    var pageNumStr = this.props.query.page;
    if (!Util.isPositiveInteger(pageSizeStr) || !Util.isPositiveInteger(pageNumStr)) {
      if (!pageSizeStr && !pageNumStr) {
        this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      } else {
        ExposureActions.favoritesViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      }
      return;
    }
    var pageSettings = Util.packagePageSettings(this.props.query);
    ExposureActions.fetchFavoritesWithPageSettings(pageSettings);
  },

  areFavoritesReady: function(immExposureStore) {
    // TODO: There are probably more edge cases here to handle. For now it seems working fine though.
    var favoritesRequestInFlight = immExposureStore.has('favoritesRequest');
    var isReady = !favoritesRequestInFlight;
    return isReady;
  }
};

module.exports = FavoritesViewMixin;
