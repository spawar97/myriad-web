var React = require('react');
var createReactClass = require('create-react-class');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var FavoritesViewMixin = require('./FavoritesViewMixin');
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var MobileListView = React.createFactory(require('../MobileListView'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var RouteHelpers = require('../../http/RouteHelpers');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = React.createFactory(require('../TouchComponents').TouchSpan);

var MobileFavoritesWidget = createReactClass({
  displayName: 'MobileFavoritesWidget',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immFavoriteWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [FavoritesViewMixin, PaginationNavMixin],

  goToTask: function(taskId) {
    this.context.router.push({name: RouteNameConstants.EXPOSURE_TASKS_SHOW, params: {taskId: taskId}});
  },

  getHeader: function() {
    return div({className: 'list-view-path'}, 'Favorite List (' + this.props.immExposureStore.getIn(['favoritesView', 'totalRows']) + ')');
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var listViewInvalid = this.listViewInvalid();
    var isEmpty = immExposureStore.getIn(['favoritesView', 'totalRows']) === 0;

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }
    if (!this.areFavoritesReady(immExposureStore, this.state.renderedEnough))  {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }

    var itemTypes = immExposureStore.getIn(['favoritesView', 'itemTypes']);
    var listItems = this.props.immFavoriteWrappers.map(function(itemWrapper) {
      var metadata;
      var type = itemWrapper.get('file') ? ExposureAppConstants.FAVORITE_TYPE_FILE_WRAPPER : ExposureAppConstants.FAVORITE_TYPE_TASK_WRAPPER;
      switch (type) {
        case ExposureAppConstants.FAVORITE_TYPE_FILE_WRAPPER:
          metadata = [
            span({className: 'item-metadata-modified', key: 'imm'}, 'modified ' + Util.dateSinceFormatter(itemWrapper.getIn(['file', 'updatedAt'])))
          ];
          if (itemWrapper.getIn(['metadata', 'newInformation'], false)) {
            metadata.unshift(div({className: 'icon-eye', key: 'ie'}));
          }
          var fileType = itemWrapper.getIn(['file', 'fileType']);
          var fileId = itemWrapper.getIn(['file', 'id']);
          var fileTitle = fileWrapper.getIn(['file', 'title']);
          var action = () => this.context.router.push({
            name: RouteHelpers.getRouteForFileType(fileType),
            params: {fileId: fileId},
            query: fileType === ExposureAppConstants.FILE_TYPE_FOLDER ? {page: 1, pageSize: ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE} : {}});
          return {contents: [
              div({className: cx('item-header', Util.getFileTypeIconName(fileType, fileTitle)), key: 'ih'},
                itemWrapper.getIn(['file','title'])),
              div({className: 'item-metadata', key: 'im'}, metadata)
            ],
            icon: 'icon-arrow-right',
            action: action
          };
          break;
        case ExposureAppConstants.FAVORITE_TYPE_TASK_WRAPPER:
          metadata = [
            span({className: 'item-metadata-modified', key: 'imm'}, 'modified ' + Util.dateSinceFormatter(itemWrapper.getIn(['task','updatedAt'])))
          ];
          if (itemWrapper.getIn(['task', 'urgency'], false)) {
            metadata.unshift(div({className: 'icon-WarningCircle', key: 'inf'}));
          }
          if (!itemWrapper.get('comments', Imm.List()).isEmpty()) {
            metadata.unshift(div({className: 'icon-bubble', key: 'ib'}));
          }
          return {contents: [
              div({className: 'item-header', key: 'ih'},
                itemWrapper.getIn(['task','title'])),
              div({className: 'item-metadata', key: 'im'}, metadata)
            ],
            icon: 'icon-arrow-right',
            action: this.goToTask.bind(null, itemWrapper.getIn(['task', 'id']))
          };
          break;
      }
    }.bind(this)).toJS();

    var header = this.getHeader();

    return div({className: 'list-view'},
      div({className: 'page-header'},
        header,
        div({className: 'header-buttons'},
          null  // TODO: add in any buttons necessary
        )
      ),
      MobileListView({listItems: listItems}),
      isEmpty ? null : PaginationWidget({
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, RouteNameConstants.EXPOSURE_FAVORITES, this.props.params),
        rowsPerPage: ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE,
        rowsPerPageChangeHandler: this.setPageSize.bind(null, RouteNameConstants.EXPOSURE_FAVORITES, this.props.params),
        totalRows: immExposureStore.getIn(['favoritesView', 'totalRows'])
      })
    );
  }
});

module.exports = MobileFavoritesWidget;
