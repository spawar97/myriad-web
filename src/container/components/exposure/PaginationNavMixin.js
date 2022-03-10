var _ = require('underscore');

var ExposureActions = require('../../actions/ExposureActions');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');
var PaginationUtil = require('../../util/PaginationUtil');

var PaginationNavMixin = {

  componentWillMount: function() {
    this.defaultPageSize = PaginationUtil.defaultRowsPerPage();
  },

  componentWillReceiveProps: function(nextProps) {
    if (Util.isPositiveInteger(nextProps.query.page) && Util.isPositiveInteger(nextProps.query.pageSize)) {
      var page = parseInt(nextProps.query.page, 10);
      var pageSize = parseInt(nextProps.query.pageSize, 10);
      var rowsPerPageOptions = _.pluck(PaginationUtil.rowsPerPageOptions(), 'rowsPerPage');
      var massagedPageSize = pageSize
      var begin = nextProps[this.storeName].getIn([this.storeKey, 'begin']);
      var query;
      if (this.props[this.storeName].getIn([this.storeKey, 'begin']) !== begin) {
        if ((page - 1) * pageSize !== begin) {
          query = _.clone(nextProps.query);
          query.page = (begin / pageSize) + 1;
        }
      } else if (pageSize !== massagedPageSize) {
        query = _.clone(nextProps.query);
        // We'll try to keep the same item at the top of the list on the new page:
        query.page = Math.floor((page  - 1) * pageSize / massagedPageSize) + 1;
      }
      if (query) {
        query.pageSize = massagedPageSize;
        this.context.router.replace({name: this.routeName, params: nextProps.params, query: query});
      }
    }
  },

  /*
   * This function cases on which type of object user is interaction with (Task, Folder, Report, Dashboard) and directs
   * them accordingly. Only task and folder are ones who want query parameters to roll over in transition. Opening a
   * report or a dashboard should not carry query params.
   *
   * Used by: FolderViewWidget, MobileReportsWidget, TasksViewWidget, MobileTasksWidget, FavoritesViewWidget
   * Required child functions/fields: props.query, props.immExposureStore
   *
   * The query object needs to contain the following arguments for pagination, all as strings
   * page           Page number
   * pageSize       Number of items per page
   * sortColumn     Name of column to sort by
   * sortOrdering   Ascending or descending (asc|desc)
   */
  urlTransitionTo: function(route, params, query) {
    // Merge with anything else in the ROUTE, unless going to a report, dashboard, or task page.
    var transferQuery = !_.contains([
      RouteNameConstants.EXPOSURE_REPORTS_SHOW,
      RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW,
      RouteNameConstants.EXPOSURE_MONITORS_SHOW,
      RouteNameConstants.EXPOSURE_BUILTIN_SHOW,
      RouteNameConstants.EXPOSURE_TASKS_SHOW
    ], route);
    query = !transferQuery ? {} : _.extend({}, this.props.query, query);
    if (route === RouteNameConstants.EXPOSURE_FOLDERS || route === RouteNameConstants.EXPOSURE_FOLDERS_SHOW) {
      ExposureActions.folderViewRefreshCheckedFileIds();
    }
    this.context.router.push({name: route, params, query});
  },

  isValidPageSize: function() {
    var pageSize = this.props.query.pageSize;
    if (Util.isPositiveInteger(pageSize)) {
      var pageSizeNum = parseInt(pageSize, 10);
      // We expect the result of division to be either 1, 2, 3, 4, 5 (This is also index into rowsPerPage dropdown).
      var pageSizeDivided = pageSizeNum / PaginationUtil.defaultRowsPerPage();
      return Util.isPositiveInteger(pageSizeDivided) && pageSizeDivided < ListViewConstants.PAGE_SIZE_DROPDOWN_ROWS;
    }
    return false;
  },

  goToPage: function(type, params, page) {
    if (page === this.props.query.page) {
      return;
    }
    this.urlTransitionTo(type, params, {
      page: page,
      pageSize: this.props.query.pageSize,
      sortColumn: this.props.query.sortColumn,
      sortOrdering: this.props.query.sortOrdering
    });
  },

  setPageSize: function(type, params, pageSize) {
    if (pageSize === this.props.query.pageSize) {
      return;
    }
    this.urlTransitionTo(type, params, {
      page: 1,
      pageSize: pageSize,
      sortColumn: this.props.query.sortColumn,
      sortOrdering: this.props.query.sortOrdering
    });
  }
};

module.exports = PaginationNavMixin;
