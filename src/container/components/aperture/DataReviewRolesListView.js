import React from 'react';
import _ from 'underscore';
import cx from 'classnames';
import FixedDataTable from 'fixed-data-table';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import createReactClass from 'create-react-class';

import SimpleAction from '../SimpleAction';
import PaginationWidget from '../exposure/PaginationWidget';

import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';

import AdminActions from '../../actions/AdminActions';
import FrontendConstants from '../../constants/FrontendConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import ContentPlaceholder from '../ContentPlaceholder';
import Util from '../../util/util';
import {Key, RequestKey, GetOutstandingRequest} from '../../stores/DataReviewStore';

import BaseListViewMixin from '../exposure/BaseListViewMixin';
import PaginationNavMixin from '../exposure/PaginationNavMixin';
import DataReviewActions from "../../actions/DataReviewActions";

const Table = React.createFactory(FixedDataTable.Table);

const DataReviewRolesListView = createReactClass({
  storeName: 'immDataReviewStore',
  storeKey: 'dataReviewRolesView',

  displayName: 'DataReviewRolesListView',

  propTypes: {
    immDataReviewStore: PropTypes.instanceOf(Imm.Map).isRequired,
    query: PropTypes.objectOf(PropTypes.string),
    width: PropTypes.number.isRequired,
    params: PropTypes.object,
  },

  contextTypes: {
    router: PropTypes.object,
  },

  mixins: [BaseListViewMixin, PaginationNavMixin],

  getInitialState() {
    return {
      renderedEnough: false,
      immCheckedReviewRoles: Imm.Set(),
      isReviewRolesUsageData: false,
    };
  },

  componentDidMount() {
    this._refreshDataReviewRolesView();
    DataReviewActions.fetchReviewRolesUsageData();
  },

  componentWillReceiveProps(nextProps) {
    if (!nextProps.query.pageSize && !nextProps.query.page) {
      this.setState({ checkedReviewRoles: Imm.List() });
      this.context.router.replace({
        name: this.routeName,
        query: {
          page: 1,
          pageSize: this.defaultPageSize,
        },
      });
      return;
    }
    // Fetch when query params changed.
    if (!_.isEqual(this.props.query, nextProps.query)) {
      const pageSettings = Util.packagePageSettings(nextProps.query);
      DataReviewActions.loadDataReviewRolesWithPageSettings(pageSettings);
      this.setState({renderedEnough: true});
    }

    if(nextProps.immDataReviewStore.get('reviewRolesUsageData') && !this.state.isReviewRolesUsageData){
      this.setState({isReviewRolesUsageData: true});
    }

    this.handleResize();
  },

  createHeaderContentHandler(colName) {
    return this.columnNameMap[colName];
  },

  _itemAccessor(immData, rowIndex) {
    return immData.get(rowIndex);
  },

  _getHandleOpenAction(id) {
    return [RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_EDIT, {dataReviewRoleId: id}];
  },

  _checkReviewRole(rowIndex, isChecked) {
    const {immDataReviewStore} = this.props;
    let {immCheckedReviewRoles} = this.state;
    const reviewRoleId = immDataReviewStore.getIn([this.storeKey, 'dataReviewRoleIds', rowIndex]);
    if (isChecked) {
      immCheckedReviewRoles = immCheckedReviewRoles.add(reviewRoleId);
    }
    else {
      immCheckedReviewRoles = immCheckedReviewRoles.delete(reviewRoleId);
    }

    this.setState({immCheckedReviewRoles});
  },

  _clearCheckedReviewRoles() {
    this.setState({ immCheckedReviewRoles: Imm.Set() });
  },

  specialCellRenderer(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    const {immDataReviewStore} = this.props;
    const {immCheckedReviewRoles} = this.state;

    // _specialCellRenderer assumes that immIds and immData are in the same order.
    const immIds = immDataReviewStore.getIn([this.storeKey, 'dataReviewRoleIds']);
    const immData = immIds.map((dataReviewRoleId) => {
      let immReviewRole = immDataReviewStore.getIn([Key.dataReviewRoles, dataReviewRoleId]);
      const name = immReviewRole.get('name');
      immReviewRole = immReviewRole.set('reviewRoleName', name);
      const isEnabled = immReviewRole.get('isEnabled');
      immReviewRole = immReviewRole.set('reviewRoleState', isEnabled);
      immReviewRole = immReviewRole.delete('name');
      return immReviewRole;
    });

    return this._specialCellRenderer(
      indexColNameMap,
      immDataReviewStore,
      immIds,
      immCheckedReviewRoles.toList(),
      immData,
      this._itemAccessor,
      this._checkReviewRole,
      _.noop, // starredRowHandler.
      this._getHandleOpenAction,
      _.noop, // getEditTransitionParams.
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths() {
    const {immDataReviewStore} = this.props;

    return BaseListViewMixin._getColumnWidths(
      immDataReviewStore.getIn([this.storeKey, 'displayedColumns']),
      immDataReviewStore.get(Key.dataReviewRoles).valueSeq(),
      immDataReviewStore);
  },

  _isReviewRoleUnused(reviewRoleId) {
    const {immDataReviewStore} = this.props;
    return immDataReviewStore.get('reviewRolesUsageData') && !immDataReviewStore.getIn(['reviewRolesUsageData', reviewRoleId]).isOccupied;
  },

  _deleteHandler() {
    const {immDataReviewStore} = this.props;
    const {immCheckedReviewRoles} = this.state;

    if (immCheckedReviewRoles.isEmpty()) {
      AdminActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_AT_LEAST_ONE_DATA_REVIEW_ROLE_TO_DELETE);
    } else {
      const allRolesUnused = immCheckedReviewRoles.reduce((memo, reviewRoleId) => {
        return memo && this._isReviewRoleUnused(reviewRoleId);
      }, true);

      if (!allRolesUnused) {
        AdminActions.displayActionCouldNotBeCompletedModal(
          FrontendConstants.ALL_SELECTED_DATA_REVIEW_ROLES_MUST_BE_UNUSED_TO_DELETE
        );
      }
      else {
        // The callback will redirect to first page of the list, keeping all other params the same.
        const updatedQuery = _.extend({}, this.props.query, {page: 1});
        const immReviewRoles = immCheckedReviewRoles.map((reviewRoleId) => {
          return immDataReviewStore.getIn([Key.dataReviewRoles, reviewRoleId]);
        }).toList();

        DataReviewActions.deleteDataReviewRoles(immReviewRoles, false, (() => {
          this._clearCheckedReviewRoles();
          this._refreshDataReviewRolesView();
          this.context.router.replace({
            name: RouteNameConstants.APERTURE_DATA_REVIEW_ROLES,
            query: updatedQuery,
          });
        }).bind(this));
      }
    }
  },

  _refreshDataReviewRolesView() {
    const {pageSize, page} = this.props.query;

    if (!Util.isPositiveInteger(pageSize) || !Util.isPositiveInteger(page)) {
      this.context.router.replace({
        name: RouteNameConstants.APERTURE_DATA_REVIEW_ROLES,
        query: {
          page: 1,
          pageSize: this.defaultPageSize, //defaultPageSize initialized in PaginationNavMixin
        },
      });
    } else {
      const pageSettings = Util.packagePageSettings(this.props.query);
      DataReviewActions.loadDataReviewRolesWithPageSettings(pageSettings);
      this.setState({renderedEnough: true});
    }
  },

  _isReady() {
    const {renderedEnough} = this.state;
    const request = GetOutstandingRequest(RequestKey.loadRolesWithPageSettings);

    return renderedEnough && !request;
  },

  _getTableContent() {
    const {immDataReviewStore} = this.props;
    const immDisplayedColumns = immDataReviewStore.getIn([this.storeKey, 'displayedColumns']);
    const totalDataReviewRoles = immDataReviewStore.getIn([this.storeKey, 'totalRows']);

    const tableArgs = this.constructTableArgs(
      immDataReviewStore.get(Key.dataReviewRoles).size,
      immDisplayedColumns,
      null,
      this.setColumnSort.bind(null, null, RouteNameConstants.APERTURE_DATA_REVIEW_ROLES, null),
      this.createSortOrdering(immDisplayedColumns.keySeq(), this.props.query),
      this.specialCellRenderer,
      this.getColumnWidths,
      false,
      true
    );

    const table = Table.apply(null, tableArgs);

    return (
      <div className='data-review-roles-table list-view-table'>
        {table}
        <PaginationWidget
          curPage={parseInt(this.props.query.page, 10)}
          pageChangeHandler={this.goToPage.bind(
            null,
            RouteNameConstants.APERTURE_DATA_REVIEW_ROLES,
            this.props.params
          )}
          rowsPerPage={parseInt(this.props.query.pageSize, 10)}
          rowsPerPageChangeHandler={this.setPageSize.bind(
            null,
            RouteNameConstants.APERTURE_DATA_REVIEW_ROLES,
            this.props.params
          )}
          totalRows={totalDataReviewRoles}
        />
      </div>
    );
  },

  _editReviewRoleEnable(immReviewRole) {
    const isEnabled = immReviewRole.get('isEnabled');
    const immReviewRoleToEdit = immReviewRole.set('isEnabled', !isEnabled);
    DataReviewActions.updateDataReviewRole(immReviewRoleToEdit.get('id'),
      immReviewRoleToEdit,
      this._finishSubmitSuccessfully
    );
  },

  _finishSubmitSuccessfully() {
    this._refreshDataReviewRolesView();
  },

  _getStatusMenuOption() {
    const { immCheckedReviewRoles } = this.state;
    const isSelectedRoleEditable = immCheckedReviewRoles != null && immCheckedReviewRoles.size == 1;
    let editEnableMenuOption = null;
    if (isSelectedRoleEditable) {
      const { immDataReviewStore } = this.props;
      const immDataReviewRoles = immDataReviewStore.getIn([this.storeKey, 'dataReviewRoles']);
      const selectedReviewRoleId =immCheckedReviewRoles.first();
      const immSelectedReviewRole = immDataReviewRoles.find(r => r.get('id') === selectedReviewRoleId);
      const isSelectionEnabled = immSelectedReviewRole.get('isEnabled');
      const menuOptionClassName = isSelectionEnabled ? 'icon-Checkboxnegative' : 'icon-checkmark-full';
      const menuOptionLabel = isSelectionEnabled ? FrontendConstants.DISABLE : FrontendConstants.ENABLE;
      editEnableMenuOption = (
        <MenuOption className='more-menu-enable' onSelect={ this._editReviewRoleEnable.bind(this, immSelectedReviewRole)}>
          <div className={cx('react-menu-icon', menuOptionClassName)}>
             { menuOptionLabel }
          </div>
        </MenuOption>);
    }
    return editEnableMenuOption;
  },

  _getDeleteMenuOption() {
    const { immCheckedReviewRoles } = this.state;
    let disabled = true;
    let deleteHandler;

    if (immCheckedReviewRoles != null && immCheckedReviewRoles.size > 0) {
      const { immDataReviewStore } = this.props;
      const immDataReviewRoles = immDataReviewStore.getIn([this.storeKey, 'dataReviewRoles']);
      const immSelectedDefaultReviewRoles = immDataReviewRoles
        .filter(reviewRole => immCheckedReviewRoles.includes(reviewRole.get('id')) && reviewRole.get('isDefault'));
      disabled = immSelectedDefaultReviewRoles.size > 0 || !this.state.isReviewRolesUsageData;
      deleteHandler = !disabled && this._deleteHandler;
    }

    return (
      <MenuOption className='more-menu-delete' onSelect= {deleteHandler}>
        <div className={cx('react-menu-icon', 'icon-remove', 'menu-item-delete', {disabled: disabled})}>
          {FrontendConstants.DELETE}
        </div>
      </MenuOption>
    );
  },

  render() {
    let content;

    if (!this._isReady()) {
      content = <ContentPlaceholder />;
    }
    else {
      content = this._getTableContent();
    }

    const moreMenu = (
      <Menu className='more-menu'>
        <MenuTrigger className='more-menu-trigger'>
          <div className={cx('react-menu-icon', 'icon-menu2')}>{FrontendConstants.MORE}</div>
        </MenuTrigger>
        <MenuOptions className='more-menu-options'>
          { this._getStatusMenuOption() }
          { this._getDeleteMenuOption() }
        </MenuOptions>
      </Menu>
    );

    return (
      <div className={cx('review-roles', 'list-view')}>
        <div className='page-header'>
          <div className='list-view-path'>
            {FrontendConstants.DATA_REVIEW_ROLES}
          </div>
          <div className='header-buttons'>
            <SimpleAction
              class={cx('icon-users', 'data-review-roles-management-button')}
              text='Manage Review Roles'
              onClick={() => {
                this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_MANAGEMENT);
              }}
            />
            <SimpleAction
              class='icon-plus-circle2'
              text='Add Review Role'
              onClick={() => {
                this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES_NEW);
              }}
            />
            {moreMenu}
          </div>
        </div>
        {content}
      </div>
    );
  },
});

module.exports = DataReviewRolesListView;
