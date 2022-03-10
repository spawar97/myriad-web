import React from 'react';
import PropTypes from 'prop-types';
import {Table, Column} from 'fixed-data-table';
import FixedDataTableHeader from '../FixedDataTableHeader';
import Imm from 'immutable';
import _ from 'underscore';
import ContentPlaceholder from '../ContentPlaceholder';
import RadioItem from '../RadioItem';
import UserManagementUtil from '../../util/UserManagementUtil';
import Util from '../../util/util';
import Button from '../Button';

import AdminActions from '../../actions/AdminActions';
import AdminRequestConstants from '../../constants/AdminRequestConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import ExposureSharingConstants from '../../constants/ExposureSharingConstants';
import { withTransitionHelper } from '../RouterTransitionHelper'
import AdminStore from '../../stores/AdminStore';

class DataAccessGroupsManagement extends React.PureComponent {
  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {
      baseUserDagMap: null,
      workingUserDagMap: null,
      finishedSave: false,
      loadedUsers: false,
      loadedDataAccessGroups: false,
      immUsersList: null
    }
  }

  componentDidMount() {
    AdminActions.loadAllUsers();
    AdminActions.loadDataAccessGroups();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const {loadedUsers, loadedDataAccessGroups, finishedSave, baseUserDagMap} = this.state;
    const {immAdminStore} = this.props;

    if (!loadedUsers) {
      const finishedLoadingUsers = !AdminStore.getOutstandingRequest(AdminRequestConstants.LOAD_ALL_USERS);
      if (finishedLoadingUsers) {
        this.setState({loadedUsers: true});
      }
    }

    if (!loadedDataAccessGroups) {
      const finishedLoadingDataAccessGroups = !AdminStore.getOutstandingRequest(AdminRequestConstants.LOAD_DATA_ACCESS_GROUPS);
      if (finishedLoadingDataAccessGroups) {
        this.setState({loadedDataAccessGroups: true});
      }
    }

    if (!baseUserDagMap && loadedUsers && loadedDataAccessGroups) {
      const immUsers = UserManagementUtil.getUsersFromStore(immAdminStore);
      const userToDagMap = Imm.Map(immUsers.map(user => {
        const userEntity = user.get('userEntity');
        return [userEntity.get('id'), userEntity.get('dataAccessProfileId')];
      }));

      this.setState({
        baseUserDagMap: userToDagMap,
        workingUserDagMap: userToDagMap,
        immUsersList: immUsers,
      });
    }

    if (finishedSave) {
      this.closeComponent();
    }

  }

  isDirty() {
    return !Imm.is(this.state.workingUserDagMap, this.state.baseUserDagMap);
  }


  unsavedWorkModalCopy() {
    return {header: FrontendConstants.DISCARD_CHANGES_TO_DATA_ACCESS_GROUP_ASSIGNMENT,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST};
  }

  cellRenderer(columnIndex, cellData, cellDataKey, rowData, rowIndex) {
    const {workingUserDagMap} = this.state;

    const dataAccessProfileId = cellDataKey;
    const immUser = rowData;
    const userEntityId = immUser.getIn(['userEntity', 'id']);
    const checked = workingUserDagMap.get(userEntityId) === dataAccessProfileId;
    const id = `cell-${columnIndex}-${rowIndex}`;

    return (
      <RadioItem
        handleChange={this.handleDataAccessGroupChange.bind(this, userEntityId, dataAccessProfileId)}
        checked={checked}
        id={id}
      />
    );
  }


  handleDataAccessGroupChange(userEntityId, dataAccessProfileId) {
    let immUpdatedUserDagMap = this.state.workingUserDagMap;
    immUpdatedUserDagMap = immUpdatedUserDagMap.set(userEntityId, dataAccessProfileId);

    this.setState({
      workingUserDagMap: immUpdatedUserDagMap
    });
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

  getTable() {
    const {immAdminStore} = this.props;
    const {immUsersList} = this.state;
    let immDataAccessGroupsList = immAdminStore.get('dataAccessGroupsList', Imm.List());
    const immAllProfile = immDataAccessGroupsList
      .find(dag => dag.get('id') === '00000000-0000-0000-0000-000000000000');
    immDataAccessGroupsList = immDataAccessGroupsList
      .filterNot(dag => dag.get('id') === '00000000-0000-0000-0000-000000000000');


    const rowHeight = 45;

    const tableProps = {
      headerHeight: rowHeight,
      height: this.props.height - 150,
      width: this.props.width - 20,
      overflowX: 'auto',
      overflowY: 'auto',
      rowHeight,
      rowsCount: immUsersList.size,
      rowGetter: this.rowGetter.bind(this)
    };

    let columnIndex = 0;
    const nameColumn = UserManagementUtil.getNameColumn(
      immUsersList, columnIndex++, 'data-access-groups-management'
    );

    const allAccessColumn = this.getColumn(immAllProfile, columnIndex++);
    const columns = immDataAccessGroupsList.map(immDataAccessGroup => this.getColumn(immDataAccessGroup, columnIndex++));

    return (
      <div className='data-access-groups-management-table'>
        <Table {...tableProps}>
          {nameColumn}
          {allAccessColumn}
          {columns}
        </Table>
      </div>
    )
  }

  getColumn(immDataAccessGroup, columnIndex) {
    const widestFont = Util.getWidestFont();
    const dataAccessProfileCtx = Util.get2dCanvasContext('bold 14px ' + widestFont);
    const columnWidth = 100;
    const name = immDataAccessGroup.get('dataAccessProfileName');
    const id = immDataAccessGroup.get('id');
    const nameWidth = dataAccessProfileCtx.measureText(name).width;
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

  canSave() {
    const isSaving = AdminStore.getOutstandingRequest(AdminRequestConstants.UPDATE_DATA_ACCESS_GROUPS_FOR_USER_ENTITIES);

    return !isSaving && !Imm.is(this.state.workingUserDagMap, this.state.baseUserDagMap);
  }

  handleSubmit() {
    const {workingUserDagMap, baseUserDagMap} = this.state;
    const updatedUserDagMap = workingUserDagMap.filter((dataAccessProfileId, userEntityId) => {
      return baseUserDagMap.get(userEntityId) !== dataAccessProfileId;
    });

    AdminActions.updateDataAccessGroupsForUserEntities(updatedUserDagMap, this.onSubmitComplete.bind(this));
  }

  onSubmitComplete() {
    this.setState({
      baseUserDagMap: this.state.workingUserDagMap,
      finishedSave: true
    });
  }

  handleCancel() {
    this.closeComponent();
  }

  closeComponent() {
    this.context.router.push(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS);
  }

  isReady() {
    const {baseUserDagMap, workingUserDagMap} = this.state;

    return !!baseUserDagMap && !!workingUserDagMap;
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
        <div className='data-access-groups-management'>
          <div className='page-header'>
            <div className='title'>{FrontendConstants.DATA_ACCESS_GROUPS_MANAGEMENT}</div>
          </div>
          <div className='data-access-groups-management-body'>
            <div className='data-access-groups-management-table'>
              {table}
            </div>
          </div>
          <div className='data-access-group-management-buttons'>
            {submitButton}
            {cancelButton}
          </div>
        </div>
      );
    }

    return (
      <div className='data-access-groups-management-container'>
        {content}
      </div>
    );
  }
}

export default withTransitionHelper(DataAccessGroupsManagement);
