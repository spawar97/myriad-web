import React from 'react';
import _ from 'underscore';
import cx from 'classnames';
import FixedDataTable from 'fixed-data-table';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

import Checkbox from '../Checkbox';
import EmptyContentNotice from '../EmptyContentNotice';
import SimpleAction from '../SimpleAction';
import PaginationWidget from '../exposure/PaginationWidget';

import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';

import AdminActions from '../../actions/AdminActions';
import FrontendConstants from '../../constants/FrontendConstants';
import ListViewConstants from '../../constants/ListViewConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import ContentPlaceholder from '../ContentPlaceholder';
import Util from '../../util/util';

import BaseListViewMixin from '../exposure/BaseListViewMixin';
import PaginationNavMixin from '../exposure/PaginationNavMixin';

// This class is dependent on the FixedDataTable class.
const Table = React.createFactory(FixedDataTable.Table);
import DOM from 'react-dom-factories';
const domDiv = DOM.div;

const DataAccessGroupsListView = createReactClass({
  storeName: 'immAdminStore',
  storeKey: 'dataAccessGroupsView',

  displayName: 'DataAccessGroupsListView',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin, PaginationNavMixin],


  getInitialState() {
    return {
      renderedEnough: false
    };
  },

  componentDidMount() {
    this.refreshDataAccessGroupsView();
  },

  componentWillReceiveProps(nextProps) {
    if (!nextProps.query.pageSize && !nextProps.query.page) {
      AdminActions.dataAccessGroupsViewResetCheckedGroups();
      this.context.router.replace({name: this.routeName, query: {page: 1, pageSize: this.defaultPageSize}});
      return;
    }
    // Fetch when query params changed.
    if (!_.isEqual(this.props.query, nextProps.query)) {
      AdminActions.loadDataAccessGroupsWithPageSettings(nextProps.query);
      this.setState({renderedEnough: true});
    }

    this.handleResize();
  },

  createHeaderContentHandler(colName) {
    return this.columnNameMap[colName];
  },

  itemAccessor(immData, rowIndex) {
    return immData.get(rowIndex);
  },

  getHandleOpenAction(id) {
    return [RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_EDIT, {dataAccessGroupId: id}];
  },

  specialCellRenderer(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    const {immAdminStore} = this.props;
    const immCheckedDataAccessGroupIds = immAdminStore.getIn(['dataAccessGroupsView', 'checkedDataAccessGroups'])
      .map((immDataAccessGroup) => immDataAccessGroup.get('id'));

    // _specialCellRenderer assumes that immIds and immData are in the same order.
    const immIds = immAdminStore.getIn(['dataAccessGroupsView', 'dataAccessGroupIds']);
    const immData = immIds.map(function (dataAccessGroupId) {
      return immAdminStore.getIn(['dataAccessGroups', dataAccessGroupId]);
    }, this);

    return this._specialCellRenderer(
      indexColNameMap,
      immAdminStore,
      immIds,
      immCheckedDataAccessGroupIds,
      immData,
      this.itemAccessor,
      AdminActions.dataAccessGroupsViewSetCheckedGroups,
      _.noop,  // starredRowHandler.
      this.getHandleOpenAction,
      _.noop,  // getEditTransitionParams.
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths() {
    const {immAdminStore} = this.props;

    return BaseListViewMixin._getColumnWidths(
      immAdminStore.getIn(['dataAccessGroupsView', 'displayedColumns']),
      immAdminStore.get('dataAccessGroups').valueSeq(),
      immAdminStore);
  },

  isGroupEmpty(immDataAccessGroup) {
    return immDataAccessGroup && immDataAccessGroup.get('userEntityIds').size === 0;
  },

  deleteHandler() {
    const immCheckedDataAccessGroups = this.props.immAdminStore.getIn(['dataAccessGroupsView', 'checkedDataAccessGroups']);
    if (immCheckedDataAccessGroups.isEmpty()) {
      AdminActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_AT_LEAST_ONE_DATA_ACCESS_GROUP_TO_DELETE);
    } else {
      let allGroupsEmpty = immCheckedDataAccessGroups.reduce((memo, dataAccessGroup) => memo && this.isGroupEmpty(dataAccessGroup), true);

      if (!allGroupsEmpty) {
        AdminActions.displayActionCouldNotBeCompletedModal(FrontendConstants.ALL_SELECTED_DATA_ACCESS_GROUPS_MUST_BE_EMPTY_TO_DELETE);
      }

      else {
        // The callback will redirect to first page of the list, keeping all other params the same.
        const updatedQuery = _.extend({}, this.props.query, {page: 1});

        AdminActions.deleteDataAccessGroups(immCheckedDataAccessGroups.toList(), false, (function() {
          this.refreshDataAccessGroupsView();
          this.context.router.replace({name: RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS, query: updatedQuery});
        }).bind(this));
      }
    }
  },

  refreshDataAccessGroupsView() {
    const {pageSize, page} = this.props.query;

    AdminActions.dataAccessGroupsViewResetCheckedGroups();

    if (!Util.isPositiveInteger(pageSize) || !Util.isPositiveInteger(page)) {
      // Redirect if both are undefined, null, '', or invalid.
      if (!pageSize && !page) {
        this.context.router.replace({
          name: RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS,
          query: {page: 1, pageSize: this.defaultPageSize}
        });
      } else {
        AdminActions.dataAccessGroupsViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      }
      return;
    }

    const pageSettings = Util.packagePageSettings(this.props.query);
    AdminActions.loadDataAccessGroupsWithPageSettings(pageSettings);
    this.setState({renderedEnough: true});
  },

  areDataAccessGroupsReady(immAdminStore, renderedEnough) {
    const dataAccessGroupsExist = !immAdminStore.get('dataAccessGroups', Imm.Map()).isEmpty();
    const dataAccessViewIsEmpty = immAdminStore.getIn(['dataAccessGroupsView', 'isEmpty'], false);
    const dataAccessGroupsRequestInFlight = (
      immAdminStore.hasIn(['outstandingRequests', 'dataAccessGroupsRequest']) ||
      immAdminStore.get('dataAccessGroupsAreLoading')
    );

    const isReady = dataAccessGroupsExist ||
      (!dataAccessGroupsRequestInFlight && !dataAccessGroupsExist && renderedEnough && dataAccessViewIsEmpty) ||  // An empty users, first load.
      (!dataAccessGroupsRequestInFlight && dataAccessGroupsExist && dataAccessViewIsEmpty);  // An empty users list, subsequent loads.
    return isReady;
  },

  listViewInvalid() {
    if (!this.props.immAdminStore.get('dataAccessGroups')) {
      switch (this.props.immAdminStore.getIn(['usersView', 'isValid'])) {
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
  },

  render() {
    const {immAdminStore} = this.props;
    const listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return <div>{listViewInvalid}</div>;
    }

    if (!this.areDataAccessGroupsReady(immAdminStore, this.state.renderedEnough)) {
      return (
        <div className='overlay'>
          <ContentPlaceholder/>
        </div>
      );
    }

    const immDataAccessGroupsView = immAdminStore.get('dataAccessGroupsView');
    const totalDataAccessGroups = immDataAccessGroupsView.get('totalRows');

    const immColNames = immDataAccessGroupsView.get('displayedColumns').filter(function (isDisplayed) {
      return isDisplayed;
    }).keySeq();

    const immSortOrdering = this.createSortOrdering(immColNames, this.props.query);

    const tableArgs = this.constructTableArgs(
      immAdminStore.get('dataAccessGroups').size,
      immDataAccessGroupsView.get('displayedColumns'),
      null,
      this.setColumnSort.bind(null, null, RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS, null),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      false,  // skipCheckBoxes.
      true  // skipOpen.
    );

    let content = immDataAccessGroupsView.get('dataAccessGroupIds').isEmpty()
      ? (
          <EmptyContentNotice noticeText={FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.DATA_ACCESS_GROUPS)} />
        )
      : domDiv({className: cx('list-view-table', 'groups-view-table')}, Table.apply(null, tableArgs));

    let listViewBar = domDiv({className: 'list-view-bar'},
      // Hide when there are no groups on the page.
      totalDataAccessGroups === 0
        ? null
        : this.getCogColumnSelectDropdown(immDataAccessGroupsView.get('displayedColumns'), immColNames, AdminActions.dataAccessGroupsViewSetColumnOption)
    );

    var moreMenu = (
      <Menu className='more-menu'>
        <MenuTrigger className='more-menu-trigger'>
          <div className='react-menu-icon icon-menu2'>More</div>
        </MenuTrigger>
        <MenuOptions className='more-menu-options'>
          <MenuOption className='more-menu-delete' onSelect={this.deleteHandler}>
            <div className='react-menu-icon icon-remove menu-item-delete'>Delete</div>
          </MenuOption>
        </MenuOptions>
      </Menu>
    );


    return (
      <div className={cx('groups', 'list-view')}>
        <div className='page-header'>
          <div className='list-view-path'>
            {FrontendConstants.DATA_ACCESS_GROUPS}
          </div>
          <div className='header-buttons'>
            <SimpleAction
              class={cx('icon-users', 'data-access-groups-management-button')}
              text={FrontendConstants.MANAGE_GROUP_ASSIGNMENT}
              onClick={() => this.context.router.push({name: RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_MANAGEMENT,
                params: {
                  width: this.props.width
                }})}
            />
            <SimpleAction
              class='icon-plus-circle2'
              text={FrontendConstants.DATA_ACCESS_GROUP}
              onClick={() => this.context.router.push(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS_NEW)}
            />
            {moreMenu}
          </div>
        </div>
        {listViewBar}
        {content}
        <PaginationWidget
          curPage={parseInt(this.props.query.page, 10)}
          pageChangeHandler={this.goToPage.bind(null, RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS, this.props.params)}
          rowsPerPage={parseInt(this.props.query.pageSize, 10)}
          rowsPerPageChangeHandler={this.setPageSize.bind(null, RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS, this.props.params)}
          totalRows={totalDataAccessGroups}
        />
      </div>
    );
  }
});

module.exports = DataAccessGroupsListView;
