import React from 'react';
import _ from 'underscore';
import cx from 'classnames';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import LegacyUsers from './LegacyUsers';
import UsersListView from './UsersListView';
import GroupsListView from './GroupsListView';
import DataAccessGroups from './DataAccessGroupsListView';

import SimpleButtonArray from '../SimpleButtonArray';
import AdminUserManagementConstants from '../../constants/AdminUserManagementConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import ListViewConstants from '../../constants/ListViewConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import AccountUtil from '../../util/AccountUtil';
import AdminStoreHelpers from '../../util/AdminStoreHelpers';
import { withTransitionHelper } from '../RouterTransitionHelper';

import DataReviewRolesListView from './DataReviewRolesListView';

class UserManagement extends React.PureComponent {
  static displayName = 'UserManagement';
  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    height: PropTypes.number,
    query: PropTypes.objectOf(PropTypes.string),
    width: PropTypes.number,
    immDataReviewStore: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  handleClickUserManagementTab(tabKey) {
    switch (tabKey) {
      case AdminUserManagementConstants.LEGACY_USERS_MODE:
        this.context.router.push(RouteNameConstants.APERTURE_USERS_LEGACY);
        break;
      case AdminUserManagementConstants.USERS_MODE:
        this.context.router.push(RouteNameConstants.APERTURE_USERS);
        break;
      case AdminUserManagementConstants.GROUPS_MODE:
        this.context.router.push(RouteNameConstants.APERTURE_GROUPS);
        break;
      case AdminUserManagementConstants.DATA_ACCESS_GROUPS_MODE:
        this.context.router.push(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS);
        break;
      case AdminUserManagementConstants.DATA_REVIEW_ROLES_MODE:
        this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES);
        break;
    }
  }

  getCurrentUserManagementTab() {
    let currentUserManagementTab;
    if (this.context.router.isActive(RouteNameConstants.APERTURE_USERS_LEGACY)) {
      currentUserManagementTab = AdminUserManagementConstants.LEGACY_USERS_MODE;
    } else if (this.context.router.isActive(RouteNameConstants.APERTURE_GROUPS)) {
      currentUserManagementTab = AdminUserManagementConstants.GROUPS_MODE;
    } else if (this.context.router.isActive(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS)) {
      currentUserManagementTab = AdminUserManagementConstants.DATA_ACCESS_GROUPS_MODE;
    } else if (this.context.router.isActive(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES)) {
      currentUserManagementTab = AdminUserManagementConstants.DATA_REVIEW_ROLES_MODE;
    }
    else {
      currentUserManagementTab = AdminUserManagementConstants.USERS_MODE;
    }
    return currentUserManagementTab;
  }

  getTabRadioButtons(currentUserManagementTab) {
    const {immAdminStore} = this.props;
    const includedTabs = _.chain(AdminUserManagementConstants)
      .values()
      .filter(function (tabName) {
        return AccountUtil.isLegacyAccount(immAdminStore) || tabName !== AdminUserManagementConstants.LEGACY_USERS_MODE;
      }).value();

    return (
      <div className='user-management-mode-buttons'>
        <SimpleButtonArray
          activeButtonKey={currentUserManagementTab}
          buttons={_.map(includedTabs, (tab) => ({key: tab, text: tab}))}
          onClick={this.handleClickUserManagementTab.bind(this)}
        />
      </div>
    );
  }

  isDirty() {
    return AdminStoreHelpers.isDirty(this.props.immAdminStore);
  }

  render() {
    let mainContent;
    const currentUserManagementTab = this.getCurrentUserManagementTab();
    switch (currentUserManagementTab) {
      case AdminUserManagementConstants.LEGACY_USERS_MODE:
        mainContent = (
          <LegacyUsers
            immAdminStore={this.props.immAdminStore}
            height={this.props.height}
            width={this.props.width}
          />
        );
        break;
      case AdminUserManagementConstants.USERS_MODE:
        mainContent = (
          <UsersListView
            immAdminStore={this.props.immAdminStore}
            rowsPerPageDenom={ListViewConstants.DEFAULT_ROWS_PER_PAGE}
            query={this.props.query}
          />
        );
        break;
      case AdminUserManagementConstants.GROUPS_MODE:
        mainContent = (
          <GroupsListView
            immAdminStore={this.props.immAdminStore}
            rowsPerPageDenom={ListViewConstants.DEFAULT_ROWS_PER_PAGE}
            query={this.props.query}
          />
        );
        break;
      case AdminUserManagementConstants.DATA_ACCESS_GROUPS_MODE:
        mainContent = (
          <DataAccessGroups
            immAdminStore={this.props.immAdminStore}
            rowsPerPageDenom={ListViewConstants.DEFAULT_ROWS_PER_PAGE}
            query={this.props.query}
          />
        );
        break;

      case AdminUserManagementConstants.DATA_REVIEW_ROLES_MODE:
        mainContent = (
          <DataReviewRolesListView
            immDataReviewStore={this.props.immDataReviewStore}
            query={this.props.query}
            width={this.props.width}
          />
        );
        break;
    }

    return (
      <div
        className={cx('admin-tab', 'user-management-tab')}
        style={{height: this.props.height, width: this.props.width}}
      >
        <div className='page-header'>
          <div className='title'>
            {FrontendConstants.USER_MANAGEMENT}
          </div>
        </div>
        {this.getTabRadioButtons(currentUserManagementTab)}
        {mainContent}
      </div>
    );
  }
}

export default withTransitionHelper(UserManagement, true);
