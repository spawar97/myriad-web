import PermissionsUtil from "../../util/PermissionsUtil";
import { AccessPermissionsConstants } from '../../constants/PermissionsConstants';

var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import { FeatureListConstants } from "../../constants/PermissionsConstants";

// BaseListViewMixin is a mixin, it doesn't need to create a factory.
var BaseListViewMixin = require('./BaseListViewMixin');
var ListFilterMixin = require('./ListFilterMixin');
var ListFilters = React.createFactory(require('./ListFilters'));
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var TasksViewMixin = require('./TasksViewMixin');
var Checkbox = React.createFactory(require('../Checkbox'));
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var FixedDataTableHeader = React.createFactory(require('../FixedDataTableHeader'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var AccountUtil = require('../../util/AccountUtil');
var ComponentStoreAccessor = require('../../util/ComponentStoreAccessor');
const Util = require('../../util/util');

const TasksSummary = React.createFactory(require('./TasksSummary'));
const TasksTable = React.createFactory(require('./TasksTable'));
// This class is dependent on the FixedDataTable class.
var Table = React.createFactory(FixedDataTable.Table);

var div = React.createFactory(require('../TouchComponents').TouchDiv),
  span = React.createFactory(require('../TouchComponents').TouchSpan),
  a = DOM.a;

var TasksViewWidget = createReactClass({
  displayName: 'TasksViewWidget',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immTaskWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    immClosedTaskWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    listFilterType: PropTypes.string.isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin, ListFilterMixin, TasksViewMixin, PaginationNavMixin],

  getDefaultProps: function () {
    return { listFilterType: ExposureAppConstants.LIST_FILTER_TARGET_TASKS };
  },

  createHeaderContentHandler: function (colName) {
    switch (colName) {
      case 'isStarred':
        return div({ className: 'icon-star-full' });
      case 'urgency':
        return div({ className: 'icon-WarningCircle' });
      default:
        return this.columnNameMap[colName];
    }
  },

  getHeader: function () {
    return div({ className: 'list-view-path' },
      'Task List (' + this.props.immExposureStore.getIn(['tasksView', 'totalRows']) + ')',
      a({ className: 'icon-question-circle', href: Util.formatHelpLink('Task List'), target: '_blank', style: { marginLeft: '5px' } }));
  },

  getColumnWidths: function () {
    var widths = BaseListViewMixin._getColumnWidths(
      this.props.immExposureStore.getIn(['tasksView', 'displayedColumns']),
      this.props.immTaskWrappers,
      this.props.immExposureStore);
    // This is a stopgap measure to get the report title to display more reasonably until we implement the new list
    // view design. 200px was chosen manually to be "good enough".
    // TODO: Investigate the measurement and adjustment algorithms, there are likely issues with those.
    widths['title'] = _.max([widths['title'], 200]);
    return widths;
  },

  getHandleOpenAction: function (id) {
    // The final `null` prevents the `onClick` event from being passed into `transitionTo` as the `query` parameter.
    return [RouteNameConstants.EXPOSURE_TASKS_SHOW, { taskId: id }];
  },

  taskAccessor: function (immData, rowIndex) {
    return immData.getIn([rowIndex, 'task']);
  },

  specialCellRenderer: function (indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immExposureStore,
      this.props.immExposureStore.getIn(['tasksView', 'taskIds']),
      this.props.immExposureStore.getIn(['tasksView', 'checkedTaskIds']),
      this.props.immTaskWrappers,
      this.taskAccessor,
      ExposureActions.tasksViewSetCheckedTaskIds,
      ExposureActions.tasksViewSetIsStarred,
      this.getHandleOpenAction,
      _.noop,
      cellDataKey,
      rowIndex
    );
  },

  render: function () {
    var { immExposureStore, immTaskWrappers, immClosedTaskWrappers } = this.props;
    var immTasksView = immExposureStore.get('tasksView');
    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }

    var immColNames = immTasksView.get('displayedColumns').filter(function (isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    var tableArgs = this.constructTableArgs(
      this.props.immTaskWrappers.size,
      immTasksView.get('displayedColumns'),
      Imm.Set(['isStarred']),
      this.setColumnSort.bind(null, null, RouteNameConstants.EXPOSURE_TASKS, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      false,  // skipCheckBoxes.
      false  // skipOpen.
    );

    var totalRows = immTasksView.get('totalRows');
    var isEmpty = totalRows === 0;
    var header = this.getHeader();

    // Hide when there are no tasks on the page.
    var listViewBar = isEmpty ? null : div({ className: 'list-view-bar' },
      this.getCogColumnSelectDropdown(immTasksView.get('displayedColumns'), immColNames, ExposureActions.tasksViewSetColumnOption, function (colName) {
        return colName === 'isStarred' ? 'icon-star-full' : null;
      })
    );

    var filterPaneOpen = immExposureStore.get('showListFilterPane', false);
    
    var content = div({ className: 'list-view-table tasks-view-table' }, TasksSummary({
      immExposureStore: immExposureStore,
      immTaskWrappers: immTaskWrappers,
      query: this.props.query, context: this.context
    }), 
    this.props.immExposureStore.get('loadingTaskCount') && this.props.immExposureStore.get('relationFilterChange') ? null : TasksTable({
      immExposureStore: immExposureStore,
      immTaskWrappers: immTaskWrappers,
      immClosedTaskWrappers: immClosedTaskWrappers,
      query: this.props.query,
      context: this.context
    }));
    

    // A user must have CREATE_TASK on the account in order to create a task.
    var userHasCreateTask = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask')
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT);

    return content;
  }
});

module.exports = TasksViewWidget;
