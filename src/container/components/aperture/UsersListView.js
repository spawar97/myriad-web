var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var UsersViewMixin = require('./UsersViewMixin');
var Checkbox = React.createFactory(require('../Checkbox'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var BaseListViewMixin = require('../exposure/BaseListViewMixin');
var PaginationNavMixin = require('../exposure/PaginationNavMixin');
var PaginationWidget = React.createFactory(require('../exposure/PaginationWidget'));
var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');

// This class is dependent on the FixedDataTable class.
var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div;

var UsersListView = createReactClass({
  displayName: 'UsersListView',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  // The order of the mixins should retain consistency in `GroupsListView`,
  // `UsersListView`, `FavoritesViewWidget`, `FolderViewWidget`, `MobileFavoritesWidget`,
  // `MobileReportsWidget`, `MobileTasksWidget`, and `TasksViewWidget`.
  mixins: [BaseListViewMixin, UsersViewMixin, PaginationNavMixin],

  createHeaderContentHandler: function(colName) {
    return this.columnNameMap[colName];
  },

  componentWillReceiveProps: function() {
    this.handleResize();
  },

  itemAccessor: function(immData, rowIndex) {
    return immData.get(rowIndex);
  },

  getHandleOpenAction: function(id) {
    return [RouteNameConstants.APERTURE_USERS_SHOW, {userId: id}];
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    var immCheckedUserIds = this.props.immAdminStore.getIn(['usersView', 'checkedUserWrappers']).map(function(immUserWrapper) {
      return immUserWrapper.getIn(['user', 'id']);
    });
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immAdminStore,
      this.props.immAdminStore.getIn(['usersView', 'userIds']),
      immCheckedUserIds,
      this.props.immAdminStore.get('users'),
      this.itemAccessor,
      AdminActions.usersViewSetCheckedUserWrappers,
      _.noop,  // starredRowHandler.
      this.getHandleOpenAction,
      _.noop,  // getEditTransitionParams.
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths: function() {
    return BaseListViewMixin._getColumnWidths(
      this.props.immAdminStore.getIn(['usersView', 'displayedColumns']),
      this.props.immAdminStore.get('users'),
      this.props.immAdminStore);
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;
    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }

    if (!this.areUsersReady(immAdminStore, this.state.renderedEnough)) {
      return div({className: 'overlay'}, div({className: 'spinner'}));
    }

    var immUsersView = immAdminStore.get('usersView');
    var totalUsers = immUsersView.get('totalRows');

    var immColNames = immUsersView.get('displayedColumns').filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    var tableArgs = this.constructTableArgs(
      immAdminStore.get('users').size,
      immUsersView.get('displayedColumns'),
      null,
      this.setColumnSort.bind(null, null, RouteNameConstants.APERTURE_USERS, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      true,  // skipCheckBoxes.
      false  // skipOpen.
    );

    var content = (immUsersView.get('userIds').isEmpty()) ?
      EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.USERS)}) :
      div({className: 'list-view-table users-view-table'}, Table.apply(null, tableArgs));

    var listViewBar = div({className: 'list-view-bar'},
      // Hide when there are no users on the page.
      totalUsers === 0 ? null : this.getCogColumnSelectDropdown(immUsersView.get('displayedColumns'), immColNames, AdminActions.usersViewSetColumnOption)
    );

    return div({className: cx('users', 'list-view')},
      div({className: 'page-header'},
        div({className: 'list-view-path'}, 'Users'),
      ),
      listViewBar,
      content,
      PaginationWidget({
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, RouteNameConstants.APERTURE_USERS, this.props.params),
        rowsPerPage: parseInt(this.props.query.pageSize, 10),
        rowsPerPageChangeHandler: this.setPageSize.bind(null, RouteNameConstants.APERTURE_USERS, this.props.params),
        totalRows: totalUsers
      })
    );
  }
});

module.exports = UsersListView;
