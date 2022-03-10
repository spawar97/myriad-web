import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import _ from 'underscore';
import cx from 'classnames';

import {Key, RequestKey, GetOutstandingRequest as DataReviewGetOutstandingRequest} from '../../stores/DataReviewStore';
import {Table, Column} from 'fixed-data-table';
import FixedDataTableHeader from '../FixedDataTableHeader';
import ContentPlaceholder from '../ContentPlaceholder';
import Checkbox from '../Checkbox';
import Button from '../Button';

import UserManagementUtil from '../../util/UserManagementUtil';
import Util from '../../util/util';
import { withTransitionHelper } from '../RouterTransitionHelper'

import AdminActions from '../../actions/AdminActions';
import FrontendConstants from '../../constants/FrontendConstants';
import AdminRequestConstants from '../../constants/AdminRequestConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import DataReviewActions from "../../actions/DataReviewActions";
import {GetOutstandingRequest as AdminGetOutstandingRequest} from "../../stores/AdminStore";

class DataReviewRolesManagement extends React.PureComponent {
  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    immDataReviewStore: PropTypes.instanceOf(Imm.Map).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      immUsersList: Imm.List(),
      loadedUsers: false,
      loadedDataReviewRoles: false,
      baseUserRoleMap: null,
      workingUserRoleMap: null,
      finishedSave: false,
    };
  }

  componentDidMount() {
    AdminActions.loadAllUsers();
    DataReviewActions.loadDataReviewRoles();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    let {loadedUsers, loadedDataReviewRoles, baseUserRoleMap, finishedSave} = this.state;
    const {immAdminStore} = this.props;

    if (!loadedUsers) {
      const finishedLoadingUsers = !AdminGetOutstandingRequest(AdminRequestConstants.LOAD_ALL_USERS);
      if (finishedLoadingUsers) {
        this.setState({loadedUsers: true});
        loadedUsers = true;
      }
    }

    if (!loadedDataReviewRoles) {
      const finishedLoadingDataReviewRoles = !DataReviewGetOutstandingRequest(RequestKey.loadRoles);
      if (finishedLoadingDataReviewRoles) {
        this.setState({loadedDataReviewRoles: true});
        loadedDataReviewRoles = true;
      }
    }

    if (!baseUserRoleMap && loadedUsers && loadedDataReviewRoles) {
      const immUsers = UserManagementUtil.getUsersFromStore(immAdminStore);
      const userRoleMap = Imm.Map(immUsers.map(user => {
        const userEntity = user.get('userEntity');
        return [userEntity.get('id'), userEntity.get('reviewRoleIds')];
      }));

      this.setState({
        baseUserRoleMap: userRoleMap,
        workingUserRoleMap: userRoleMap,
        immUsersList: immUsers,
      });
    }

    if (finishedSave) {
      this.closeComponent();
    }
  }

  getTable() {
    const {immDataReviewStore} = this.props;
    const {immUsersList} = this.state;
    let immDataReviewRolesList = immDataReviewStore.get(Key.dataReviewRolesList, Imm.List());
    const rowHeight = 45;

    const tableProps = {
      headerHeight: rowHeight,
      height: this.props.height - 150,
      width: this.props.width - 20,
      overflowX: 'auto',
      overflowY: 'auto',
      rowHeight,
      rowsCount: immUsersList.size,
      rowGetter: this.rowGetter.bind(this),
    };

    let columnIndex = 0;
    const nameColumn = UserManagementUtil.getNameColumn(
      immUsersList, columnIndex++, 'review-roles-management'
    );
    const columns = immDataReviewRolesList
      .map(immReviewRole => this.getColumn(immReviewRole, columnIndex++));

    return (
      <div className='review-roles-management-table'>
        <Table {...tableProps}>
          {nameColumn}
          {columns}
        </Table>
      </div>
    );
  }

  rowGetter(index) {
    const {immUsersList} = this.state;
    const immUsers = immUsersList.sortBy(immUser => {
      const lastName = immUser.getIn(['user', 'lastName'], '').toLowerCase();
      const firstName = immUser.getIn(['user', 'firstName'], '').toLowerCase();
      return `${lastName}, ${firstName}`;
    });
    return immUsers.get(index);
  }

  getColumn(immReviewRole, columnIndex) {
    const widestFont = Util.getWidestFont();
    const reviewRoleCtx = Util.get2dCanvasContext(`bold 14px ${widestFont}`);
    const columnWidth = 100;
    const name = immReviewRole.get('name');
    const id = immReviewRole.get('id');
    const nameWidth = reviewRoleCtx.measureText(name).width;
    const width = Math.max(nameWidth || 0, columnWidth) + 45;

    return (
      <Column
        dataKey={id}
        key={id}
        align='center'
        headerRenderer={() => <FixedDataTableHeader contents={name} />}
        cellRenderer={this.cellRenderer.bind(this, columnIndex)}
        width={width}
        minWidth={width}
        maxWidth={width}
      />
    );
  }

  cellRenderer(columnIndex, cellData, cellDataKey, rowData, rowIndex) {
    const {workingUserRoleMap} = this.state;

    const userEntityId = rowData.getIn(['userEntity', 'id']);
    const immReviewRoleIds = workingUserRoleMap.get(userEntityId, Imm.List());
    const reviewRoleId = cellDataKey;
    const isChecked = immReviewRoleIds.contains(reviewRoleId);
    const id = `cell-${columnIndex}-${rowIndex}`;

    return (
      <Checkbox
        checkedState={isChecked}
        onClick={this.handleSelection.bind(this, userEntityId, reviewRoleId)}
        id={id}
      />
    );
  }

  handleSelection(userEntityId, reviewRoleId) {
    let {workingUserRoleMap} = this.state;
    let immReviewRoleIds = workingUserRoleMap.get(userEntityId, Imm.List());
    const reviewRoleIndex = immReviewRoleIds.findIndex(roleId => roleId === reviewRoleId);
    if (reviewRoleIndex >= 0) {
      immReviewRoleIds = immReviewRoleIds.delete(reviewRoleIndex);
    }
    else {
      immReviewRoleIds = immReviewRoleIds.push(reviewRoleId);
    }

    workingUserRoleMap = workingUserRoleMap.set(userEntityId, immReviewRoleIds);
    this.setState({workingUserRoleMap});
  }

  handleSubmit() {
    const {workingUserRoleMap, baseUserRoleMap} = this.state;
    const updatedUserRoleMap = workingUserRoleMap.filter((immReviewRoles, userEntityId) => {
      const baseReviewRoles = baseUserRoleMap.get(userEntityId);
      return !Imm.is(baseReviewRoles, immReviewRoles);
    });

    DataReviewActions.updateDataReviewRolesForUserEntities(
      updatedUserRoleMap, this.onSubmitComplete.bind(this)
    );
  }

  onSubmitComplete() {
    this.setState({
      baseUserRoleMap: this.state.workingUserRoleMap,
      finishedSave: true,
    });
  }

  handleCancel() {
    this.closeComponent();
  }

  closeComponent() {
    this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES);
  }

  canSave() {
    const {workingUserRoleMap, baseUserRoleMap} = this.state;
    const isSaving = DataReviewGetOutstandingRequest(RequestKey.updateRolesForUserEntities);

    return !isSaving && !Imm.is(workingUserRoleMap, baseUserRoleMap);
  }

  isReady() {
    const {baseUserRoleMap, workingUserRoleMap} = this.state;

    return !!baseUserRoleMap && !!workingUserRoleMap;
  }

  render() {
    let content;

    if (!this.isReady()) {
      content = <ContentPlaceholder />;
    }

    else {
      const table = this.getTable();
      const submitButton = (
        <Button
          icon='icon-loop2'
          children={FrontendConstants.SAVE}
          isPrimary={true}
          isDisabled={!this.canSave()}
          onClick={this.handleSubmit.bind(this)}
        />
      );
      const cancelButton = (
        <Button
          icon='icon-close'
          children={FrontendConstants.CANCEL}
          isSecondary={true}
          onClick={this.handleCancel.bind(this)}
        />
      );

      content = (
        <div className='data-review-roles-management'>
          <div className='page-header'>
            <div className='title'>{FrontendConstants.DATA_REVIEW_ROLES_MANAGEMENT}</div>
          </div>
          <div className='data-review-roles-management-body'>
            <div className='data-review-roles-management-table'>
              {table}
            </div>
          </div>
          <div className='data-review-roles-management-buttons'>
            {submitButton}
            {cancelButton}
          </div>
        </div>
      );
    }

    return (
      <div className='data-review-roles-management-container'>
        {content}
      </div>
    );
  }
}

export default withTransitionHelper(DataReviewRolesManagement);
