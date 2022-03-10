var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var ListFilters = React.createFactory(require('./ListFilters'));
var ListFilterMixin = require('./ListFilterMixin');
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var TasksViewMixin = require('./TasksViewMixin');
var MobileListView = React.createFactory(require('../MobileListView'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var AccountUtil = require('../../util/AccountUtil');
var ComponentStoreAccessor = require('../../util/ComponentStoreAccessor');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = React.createFactory(require('../TouchComponents').TouchSpan);
import PermissionsUtil from '../../util/PermissionsUtil';
import {FeatureListConstants, AccessPermissionsConstants} from '../../constants/PermissionsConstants';

var MobileTasksWidget = createReactClass({
  displayName: 'MobileTasksWidget',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immTaskWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    // See PaginationNavMixin.js for pagination related query parameters, and ExposureStore.js's `activeListFilters` section for list filter parameters.
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  // The order of the mixins should retain consistency in `GroupsListView`,
  // `UsersListView`, `FavoritesViewWidget`, `FolderViewWidget`, `MobileFavoritesWidget`,
  // `MobileReportsWidget`, `MobileTasksWidget`, and `TasksViewWidget`.
  mixins: [TasksViewMixin, ListFilterMixin, PaginationNavMixin],

  getDefaultProps: function() {
    return {listFilterType: ExposureAppConstants.LIST_FILTER_TARGET_TASKS};
  },

  getHeader: function() {
    return div({className: 'list-view-path'}, 'Task List (' + this.props.immExposureStore.getIn(['tasksView', 'totalRows']) + ')');
  },

  goToTask: function(fileId, taskId) {
    this.context.router.push({name: RouteNameConstants.EXPOSURE_TASKS_SHOW, params: {taskId: taskId}});
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }
    if (!this.areTasksReady(immExposureStore, this.state.renderedEnough) || !ComponentStoreAccessor.areRelatedFilesReady(immExposureStore) || immExposureStore.get('tasksRequest')) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }
    var listItems = this.props.immTaskWrappers.map(function(immTaskWrapper) {
      var fileId = immTaskWrapper.getIn(['task', 'dashboardId']) || immTaskWrapper.getIn(['task', 'reportId']);
      var metadata = [
        span({className: 'item-metadata-modified', key: 'imm'}, 'modified ' + Util.dateSinceFormatter(immTaskWrapper.getIn(['task','updatedAt'])))
      ];
      if (immTaskWrapper.getIn(['task', 'urgency'], false)) {
        metadata.unshift(div({className: 'icon-WarningCircle', key: 'inf'}));
      }
      if (!immTaskWrapper.get('comments', Imm.List()).isEmpty()) {
        metadata.unshift(div({className: 'icon-bubble', key: 'ib'}));
      }
      if (immTaskWrapper.getIn(['metadata', 'isStarred'], false)) {
        metadata.unshift(div({className: 'icon-star-full', key: 'isf'}));
      } else {
        metadata.unshift(div({className: 'icon-star-empty', key: 'ise'}));
      }
      return {contents: [
        div({className: 'item-header', key: 'ih'},
          immTaskWrapper.getIn(['task','title'])),
        div({className: 'item-metadata', key: 'im'}, metadata)
      ],
        icon: 'icon-arrow-right',
        action: this.goToTask.bind(null, fileId, immTaskWrapper.getIn(['task', 'id']))
      }
    }, this).toJS();

    var header = this.getHeader();
    var filterPaneOpen = immExposureStore.get('showListFilterPane', false);

    // A user must have CREATE_TASK on the account in order to create a task.
    var userHasCreateTask = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask')
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT);

    var content = filterPaneOpen ?
      ListFilters({immExposureStore: immExposureStore,
        handleClose: ExposureActions.toggleListFilterPane,
        handleReset: this.handleFilterReset.bind(null, this.props.listFilterType),
        handleSelect: this.handleFilterSelection.bind(null, this.props.listFilterType),
        listFilterType: this.props.listFilterType,
        filterHelpFile: 'TASK_FILTER'}) :
      [div({className: 'page-header', key: 'ph'},
        header,
        div({className: 'header-buttons'},
          SimpleAction({class: 'icon-filter2', text: FrontendConstants.FILTERS, onClick: ExposureActions.toggleListFilterPane}),
          userHasCreateTask ? SimpleAction({
            class: 'icon-plus-circle2',
            text: 'Task',
            onClick: () => this.context.router.push(RouteNameConstants.EXPOSURE_TASKS_NEW)
          }) : null
        )
      ),
      MobileListView({listItems: listItems, key: 'mlv', emptyListMessage: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.TASKS)}),
      PaginationWidget({
        key: 'pw',
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, RouteNameConstants.EXPOSURE_TASKS, null),
        rowsPerPage: 10,
        rowsPerPageChangeHandler: this.setPageSize.bind(null, RouteNameConstants.EXPOSURE_TASKS, null),
        totalRows: immExposureStore.getIn(['tasksView', 'totalRows'])
      })];

    return div({className: cx('list-view', {'show-filters': filterPaneOpen})},
      content
    );
  }
});

module.exports = MobileTasksWidget;
