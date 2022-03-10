var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var GroupsViewMixin = require('./GroupsViewMixin');
var Checkbox = React.createFactory(require('../Checkbox'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var BaseListViewMixin = require('../exposure/BaseListViewMixin');
var PaginationNavMixin = require('../exposure/PaginationNavMixin');
var PaginationWidget = React.createFactory(require('../exposure/PaginationWidget'));
var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
import ContentPlaceholder from '../ContentPlaceholder';

// This class is dependent on the FixedDataTable class.
var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div;

var GroupsListView = createReactClass({
  displayName: 'GroupsListView',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin, GroupsViewMixin, PaginationNavMixin],

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
    return [RouteNameConstants.APERTURE_GROUPS_EDIT, {groupId: id}];
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    var immCheckedGroupIds = this.props.immAdminStore.getIn(['groupsView', 'checkedGroups']).map(function(immGroup) {
      return immGroup.get('id');
    });

    // _specialCellRenderer assumes that immIds and immData are in the same order.
    var immIds = this.props.immAdminStore.getIn(['groupsView', 'groupIds']);
    var immData =  immIds.map(function(groupId) {
      return this.props.immAdminStore.getIn(['groups', groupId]);
    }, this);

    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immAdminStore,
      immIds,
      immCheckedGroupIds,
      immData,
      this.itemAccessor,
      AdminActions.groupsViewSetCheckedGroups,
      _.noop,  // starredRowHandler.
      this.getHandleOpenAction,
      _.noop,  // getEditTransitionParams.
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths: function() {
    return BaseListViewMixin._getColumnWidths(
      this.props.immAdminStore.getIn(['groupsView', 'displayedColumns']),
      this.props.immAdminStore.get('groups').valueSeq(),
      this.props.immAdminStore);
  },

  deleteHandler: function() {
    var immCheckedGroups = this.props.immAdminStore.getIn(['groupsView', 'checkedGroups']);
    if (immCheckedGroups.isEmpty()) {
      AdminActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_AT_LEAST_ONE_TEAM_TO_DELETE);
    } else {
      // The callback will redirect to first page of the list, keeping all other params the same.
      var updatedQuery = _.extend({}, this.props.query, {page: 1});
      AdminActions.deleteGroups(immCheckedGroups.toList(), false, () => this.context.router.push({name: RouteNameConstants.APERTURE_GROUPS, query: updatedQuery}));
    }
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;
    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }

    if (!this.areGroupsReady(immAdminStore, this.state.renderedEnough)) {
      return (
       <div className='overlay'>
         <ContentPlaceholder/>
       </div>
      );
    }

    var immGroupsView = immAdminStore.get('groupsView');
    var totalGroups = immGroupsView.get('totalRows');

    var immColNames = immGroupsView.get('displayedColumns').filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    var tableArgs = this.constructTableArgs(
      immAdminStore.getIn(['groupsView', 'groupIds']).size,
      immGroupsView.get('displayedColumns'),
      null,
      this.setColumnSort.bind(null, null, RouteNameConstants.APERTURE_GROUPS, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      true,  // skipCheckBoxes.
      true  // skipOpen.
    );

    var content = immGroupsView.get('groupIds').isEmpty() ?
      EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.GROUPS)}) :
      div({className: cx('list-view-table',  'groups-view-table')}, Table.apply(null, tableArgs));

    var listViewBar = div({className: 'list-view-bar'},
      // Hide when there are no groups on the page.
      totalGroups === 0 ? null : this.getCogColumnSelectDropdown(immGroupsView.get('displayedColumns'), immColNames, AdminActions.groupsViewSetColumnOption)
    );

    return div({className: cx('groups', 'list-view')},
      div({className: 'page-header'},
        div({className: 'list-view-path'}, FrontendConstants.TEAMS),
          div({className: 'header-buttons'},
              SimpleAction({
                class: cx('icon-plus-circle2', 'uppercase'),
                text: FrontendConstants.TEAM,
                onClick: () => this.context.router.push(RouteNameConstants.APERTURE_GROUPS_NEW)
              })
          )
      ),
      listViewBar,
      content,
      PaginationWidget({
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, RouteNameConstants.APERTURE_GROUPS, this.props.params),
        rowsPerPage: parseInt(this.props.query.pageSize, 10),
        rowsPerPageChangeHandler: this.setPageSize.bind(null, RouteNameConstants.APERTURE_GROUPS, this.props.params),
        totalRows: totalGroups
      })
    );
  }
});

module.exports = GroupsListView;
