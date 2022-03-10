var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var BaseListViewMixin = require('./BaseListViewMixin');
var FavoritesViewMixin = require('./FavoritesViewMixin');
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var Checkbox = React.createFactory(require('../Checkbox'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var RouteHelpers = require('../../http/RouteHelpers');
var Util = require('../../util/util');

// This class is dependent on the FixedDataTable class.
var Table = React.createFactory(FixedDataTable.Table);

var a = DOM.a;
var div = React.createFactory(require('../TouchComponents').TouchDiv);

var FavoritesViewWidget = createReactClass({
  displayName: 'FavoritesViewWidget',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immFavoriteWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin, FavoritesViewMixin, PaginationNavMixin],

  createHeaderContentHandler: function(colName) {
    switch (colName) {
      case 'isStarred':
        return div({className: 'icon-star-full'});
      default:
        return this.columnNameMap[colName];
    }
  },

  getColumnWidths: function() {
    return BaseListViewMixin._getColumnWidths(
      this.props.immExposureStore.getIn(['favoritesView', 'displayedColumns']),
      this.props.immFavoriteWrappers,
      this.props.immExposureStore
    );
  },

  getHeader: function() {
    return div({className: 'list-view-path'},
        'Favorite List (' + this.props.immExposureStore.getIn(['favoritesView', 'totalRows']) + ')',
        a({className: 'icon-question-circle', href: Util.formatHelpLink('Favorite List'), target: '_blank', style: {marginLeft: '5px'}}));
  },

  getHandleOpenAction: function(id, rowIndex) {
    var route = null;
    var params = null;
    var query = null;
    var isClinopsInsightsReport = false;
    if (this.props.YFReportIds) {
      this.props.YFReportIds.map(ids => {
        if (ids === id) isClinopsInsightsReport = true;
      });
    }
    switch (this.props.immExposureStore.getIn(['favoritesView', 'itemTypes', id])) {
      case ExposureAppConstants.FAVORITE_TYPE_FILE_WRAPPER:
        var fileType = this.props.immFavoriteWrappers.getIn([rowIndex, 'file', 'fileType']);
        if (fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT) {
          route = isClinopsInsightsReport ? RouteNameConstants.EXPOSURE_EMBEDDED_CLINOPS_INSIGHTS_REPORTS_SHOW : RouteNameConstants.EXPOSURE_EMBEDDED_KPI_STUDIO_REPORTS_SHOW;
        } else {
          route = RouteHelpers.getRouteForFileType(fileType);
        }
        params = {fileId: id};
        if (fileType === ExposureAppConstants.FILE_TYPE_FOLDER) {
          query = {page: 1, pageSize: this.defaultPageSize};
        }
        break;
      case ExposureAppConstants.FAVORITE_TYPE_TASK_WRAPPER:
        route = RouteNameConstants.EXPOSURE_TASKS_SHOW;
        params = {taskId: id};
        break;
    }
    return [route, params, query];
  },

  itemAccessor: function(immData, rowIndex) {
    var immFavoritesView = this.props.immExposureStore.get('favoritesView');
    var itemId = immFavoritesView.get('itemIds').get(rowIndex);
    var itemType = immFavoritesView.getIn(['itemTypes', itemId]);
    var immItem = null;
    switch (itemType) {
      case ExposureAppConstants.FAVORITE_TYPE_FILE_WRAPPER:
        immItem = immData.getIn([rowIndex, 'file']);
        break;
      case ExposureAppConstants.FAVORITE_TYPE_TASK_WRAPPER:
        immItem = immData.getIn([rowIndex, 'task']);
        break;
    }
    return immItem;
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immExposureStore,
      this.props.immExposureStore.getIn(['favoritesView', 'itemIds']),
      this.props.immExposureStore.getIn(['favoritesView', 'checkedItemIds']),
      this.props.immFavoriteWrappers,
      this.itemAccessor,
      ExposureActions.favoritesViewSetCheckedItemIds,
      _.noop,
      this.getHandleOpenAction,
      _.noop,
      cellDataKey,
      rowIndex
    );
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var immFavoritesView = immExposureStore.get('favoritesView');
    var isEmpty = immFavoritesView.get('totalRows') === 0;

    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }
    if (!this.areFavoritesReady(immExposureStore, this.state.renderedEnough)) {
      return div({className: 'spinner-container', key: 'loading'}, div({className: 'spinner'}));
    }

    var immColNames = immFavoritesView.get('displayedColumns').filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    var tableArgs = this.constructTableArgs(
      this.props.immFavoriteWrappers.size,
      immFavoritesView.get('displayedColumns'),
      Imm.Set(['isStarred']),
      this.setColumnSort.bind(null, null, RouteNameConstants.EXPOSURE_FAVORITES, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      false,  // skipCheckBoxes.
      false  // skipOpen.
    );

    var header = this.getHeader();

    var listViewBar = isEmpty ? null : div({className: 'list-view-bar'},
       this.getCogColumnSelectDropdown(immFavoritesView.get('displayedColumns'), immColNames, ExposureActions.favoritesViewSetColumnOption, function (colName) {
        return colName === 'newInformation' ? 'icon-eye' : null;
      })
    );

    var content = isEmpty ?
      EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.FAVORITES)}) :
      div({className: 'list-view-table favorites-view-table'}, Table.apply(null, tableArgs));

    return div({className: 'list-view'},
      div({className: 'page-header favorites-view-header'},
        header,
        div({className: 'page-buttons'},
          null  // TODO: add in any buttons necessary
        )
      ),
      listViewBar,
      div({className: 'list-view-table-container'}, content),
      isEmpty ? null : PaginationWidget({
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, RouteNameConstants.EXPOSURE_FAVORITES, null),
        rowsPerPage: parseInt(this.props.query.pageSize, 10),
        rowsPerPageChangeHandler: this.setPageSize.bind(null, RouteNameConstants.EXPOSURE_FAVORITES, null),
        totalRows: immExposureStore.getIn(['favoritesView', 'totalRows'])
      })
    );
  }
});

module.exports = FavoritesViewWidget;
