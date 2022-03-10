import Imm from 'immutable';
import _ from 'underscore';
import Util from './util';
import React from 'react';
import {Column} from 'fixed-data-table';
import FixedDataTableHeader from '../components/FixedDataTableHeader';
import FrontendConstants from '../constants/FrontendConstants';
import ExposureSharingConstants from '../constants/ExposureSharingConstants';

class UserManagementUtil {
  static getUsersFromStore(immAdminStore) {
    return immAdminStore.get('users', Imm.List()).filter(immUser => {
      const userEntityState = immUser.getIn(['userEntity', 'userEntityState']);
      return userEntityState === ExposureSharingConstants.ACTIVE
        || userEntityState === ExposureSharingConstants.PENDING_CONFIRMATION
          || userEntityState === ExposureSharingConstants.LINK_EXPIRE
    });
  }
  static getNameColumn(immUsersList, columnIndex, classNamePrefix) {
    const widestFont = Util.getWidestFont();
    const nameCtx = Util.get2dCanvasContext('14px ' + widestFont);
    const emailCtx = Util.get2dCanvasContext('12px ' + widestFont);
    let userEmailWidths = [];
    let userNameWidths = [];
    immUsersList.map(immUser => {
      const email = immUser.getIn(['user', 'username']);
      const name = `${immUser.getIn(['user', 'lastName'])}, ${immUser.getIn(['user', 'firstName'])}`;
      userEmailWidths.push(emailCtx.measureText(`(${email})`).width);
      userNameWidths.push(nameCtx.measureText(name).width);
    });

    const maxNameWidth = Math.max(_.max(userEmailWidths) || 0, _.max(userNameWidths), 90) + 45;

    return (
      <Column
        dataKey='name'
        align='center'
        headerRenderer={() => <FixedDataTableHeader contents={FrontendConstants.NAME} />}
        cellRenderer={UserManagementUtil.nameCellRenderer.bind(
          null, classNamePrefix, columnIndex
        )}
        width={maxNameWidth}
        maxWidth={maxNameWidth}
        fixed={true}
      />
    );
  }

  static nameCellRenderer(classNamePrefix, columnIndex, cellData, cellDataKey, rowData, rowIndex) {
    const immUser = rowData;
    const email = immUser.getIn(['user', 'username']);
    const name = `${immUser.getIn(['user', 'lastName'])}, ${immUser.getIn(['user', 'firstName'])}`;
    const userEntityId = immUser.getIn(['userEntity', 'id']);
    const id = `${columnIndex}-${rowIndex}`;
    return (
      <div className={`${classNamePrefix}-user-name`} key={userEntityId} id={id}>
        <div className={`${classNamePrefix}-name`}>{name}</div>
        <div className={`${classNamePrefix}-email`}>({email})</div>
      </div>
    );
  }
}

export default UserManagementUtil;
