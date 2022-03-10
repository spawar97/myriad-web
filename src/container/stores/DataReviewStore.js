import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';
import keymirror from 'keymirror';


import Store from "./Store";
import AppDispatcher from "../http/AppDispatcher";
import ListViewConstants from "../constants/ListViewConstants";
import AppRequest from "../http/AppRequest";
import DataReviewActions from "../actions/DataReviewActions";
import FrontendConstants from "../constants/FrontendConstants";
import StatusMessageTypeConstants from "../constants/StatusMessageTypeConstants";
import ModalConstants from "../constants/ModalConstants";
import DataReviewConstants from "../constants/DataReviewConstants";
import Util from '../util/util';
import AdminActions from "../actions/AdminActions";
import AdminStore from "./AdminStore";
import ExposureActions from "../actions/ExposureActions";

var HttpStatus = require('http-status-codes');


let _immDataReviewStore = Imm.fromJS({
  dataReviewRoles: {},
  dataReviewRolesList: Imm.List(),
  dataReviewRolesAvailableToUser: Imm.List(),
  dataReviewRolesAreLoading: false,
  dataReviewRolesView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    dataReviewRoleIds: [],
    checkedDataReviewRoles: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      reviewRoleName: true,
      reviewRoleState: true,
    }),
  },
});

let DataReviewStore = _.extend({

  getStore: function() {
    return _immDataReviewStore;
  },

  getOutstandingRequest(requestName) {
    return _immDataReviewStore.getIn(['outstandingRequests', requestName]);
  },

  startOutstandingRequest(requestName, request) {
    _immDataReviewStore = _immDataReviewStore.setIn(['outstandingRequests', requestName], request);
  },

  deleteOutstandingRequest(requestName) {
    _immDataReviewStore = _immDataReviewStore.deleteIn(['outstandingRequests', requestName]);
  },

  initializeRequest(requestName) {
    const request = DataReviewStore.getOutstandingRequest(requestName);
    if (!!request) {
      request.abort();
    }

    DataReviewStore.deleteOutstandingRequest(requestName);
  },

  _constructDataReviewRoleWrapper(immDataReviewRole) {
    return {
      name: immDataReviewRole.get('name'),
      isEnabled: immDataReviewRole.get('isEnabled'),
      isDefault: immDataReviewRole.get('isDefault'),
    };
  },

  createDataReviewRole(immDataReviewRole, callback) {
    const {createRole} = RequestKey;
    // For POST updates, do not double submit
    if (DataReviewStore.getOutstandingRequest(createRole)) {
      return;
    }

    const url = `/api/admin/review-roles`;
    const reviewRole = DataReviewStore._constructDataReviewRoleWrapper(immDataReviewRole);

    const newRequest = AppRequest({type: 'POST', url: url, data: JSON.stringify(reviewRole)});
    newRequest.then(
      (data) => {
        DataReviewActions.loadDataReviewRole(data.id);
        AdminActions.createStatusMessage(
          FrontendConstants.SUCCESS_A_NEW_DATA_REVIEW_ROLE_HAS_BEEN_ADDED,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        callback();
        DataReviewStore.deleteOutstandingRequest(createRole);
        DataReviewStore.onAjaxCompletion();
      },
      (jqXHR) => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        AdminActions.createStatusMessage(
            FrontendConstants.DATA_REVIEW_ROLE_NAME_EXISTS,
            StatusMessageTypeConstants.TOAST_ERROR
        );
        DataReviewStore.deleteOutstandingRequest(createRole);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(createRole, newRequest);
  },

  updateDataReviewRole(dataReviewRoleId, immDataReviewRole, callback) {
    const {updateRole} = RequestKey;
    // Do not allow double submissions for database update requests
    if (DataReviewStore.getOutstandingRequest(updateRole)) {
      return;
    }

    const url = `/api/admin/review-roles/${dataReviewRoleId}`;
    const reviewRole = DataReviewStore._constructDataReviewRoleWrapper(immDataReviewRole);

    const newRequest = AppRequest({type: 'PUT', url: url, data: JSON.stringify(reviewRole)});

    newRequest.then(
      (data) => {
        DataReviewActions.loadDataReviewRole(data.id);
        AdminActions.createStatusMessage(
          FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_THE_DATA_REVIEW_ROLE,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        callback();
        DataReviewStore.deleteOutstandingRequest(updateRole);
        DataReviewStore.onAjaxCompletion();
      },
      (jqXHR) => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        DataReviewStore.deleteOutstandingRequest(updateRole);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(updateRole, newRequest);
  },

  loadDataReviewRole(dataReviewRoleId) {
    const {loadRole} = RequestKey;
    DataReviewStore.initializeRequest(loadRole);

    const url = `/api/admin/review-roles/${dataReviewRoleId}`;

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      (data) => {
        _immDataReviewStore = _immDataReviewStore.setIn(
          [Key.dataReviewRoles, dataReviewRoleId],
          Imm.fromJS(data)
        );
        DataReviewStore.deleteOutstandingRequest(loadRole);
        DataReviewStore.onAjaxCompletion();
      },
      (jqXHR) => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        DataReviewStore.deleteOutstandingRequest(loadRole);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(loadRole, newRequest);
  },

  loadDataReviewRoles() {
    const {loadRoles} = RequestKey;
    DataReviewStore.initializeRequest(loadRoles);

    const url = `/api/review-roles`;
    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      data => {
        _immDataReviewStore = _immDataReviewStore.set(Key.dataReviewRolesList, Imm.fromJS(data));
        DataReviewStore.deleteOutstandingRequest(loadRoles);
        DataReviewStore.onAjaxCompletion();
      },
      () => {
        DataReviewStore.deleteOutstandingRequest(loadRoles);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(loadRoles, newRequest);
  },

  loadDataReviewRolesWithPageSettings(pageSettings) {
    const {loadRolesWithPageSettings} = RequestKey;
    DataReviewStore.initializeRequest(loadRolesWithPageSettings);

    const params = Util.buildFixedDataTableParams(pageSettings);
    const url = `/api/admin/review-roles/paginated?${params}`;

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      (data) => {
        const immDataReviewRoles = Imm.fromJS(data.reviewRoles);
        const immDataReviewRoleIds = immDataReviewRoles.map((immDataReviewRole) => {
          return immDataReviewRole.get('id');
        });

        _immDataReviewStore = _immDataReviewStore.mergeDeep({
          dataReviewRolesAreLoading: false,
          dataReviewRolesView: {
            begin: data.begin,
            isEmpty: immDataReviewRoleIds.isEmpty(),
            totalRows: data.totalReviewRoles,
          },
        });
        _immDataReviewStore = _immDataReviewStore.setIn(
          ['dataReviewRolesView', 'dataReviewRoleIds'],
          immDataReviewRoleIds
        );
        _immDataReviewStore = _immDataReviewStore.setIn(
          ['dataReviewRolesView', 'dataReviewRoles'],
          immDataReviewRoles
        );

        _immDataReviewStore = _immDataReviewStore.delete(Key.dataReviewRoles);
        immDataReviewRoles.forEach(function(immDataReviewRoles) {
          const dataReviewRoleId = immDataReviewRoles.get('id');
          _immDataReviewStore = _immDataReviewStore.setIn(
            [Key.dataReviewRoles, dataReviewRoleId],
            immDataReviewRoles
          );
        });
        DataReviewStore.deleteOutstandingRequest(loadRolesWithPageSettings);
        DataReviewStore.onAjaxCompletion();
      },
      () => {
        _immDataReviewStore = _immDataReviewStore.merge({dataReviewRolesAreLoading: false});

        DataReviewStore.deleteOutstandingRequest(loadRolesWithPageSettings);
        DataReviewStore.onAjaxCompletion();
      }
    );

    _immDataReviewStore = _immDataReviewStore.merge({ dataReviewRolesAreLoading: true });
    DataReviewStore.startOutstandingRequest(loadRolesWithPageSettings, newRequest);
  },

  deleteDataReviewRoles(immDataReviewRoles, hasConfirmed, callback) {
    const {deleteRoles} = RequestKey;

    if (!hasConfirmed) {
      AdminStore.displayModal(ModalConstants.MODAL_DELETE_DATA_REVIEW_ROLE, {
        handleCancel: AdminActions.closeModal,
        callback: callback,
        immDataReviewRoles: immDataReviewRoles,
      });

      return;
    }

    const url = `/api/admin/review-roles`;

    DataReviewStore.initializeRequest(deleteRoles);
    const idList = immDataReviewRoles.map((role) => role.get('id')).toList();

    const newRequest = AppRequest({
      type: 'DELETE',
      url: url,
      data: JSON.stringify(idList),
    });

    newRequest.then(
      (deletedDataReviewRoles) => {
        AdminStore.displayModal(ModalConstants.MODAL_SUCCESS, {
          handleCancel: AdminActions.closeModal.bind(null, callback),
          message: FrontendConstants.DELETE_DATA_REVIEW_ROLES_SUCCESS(deletedDataReviewRoles.length),
        });
        DataReviewStore.deleteOutstandingRequest(deleteRoles);
        DataReviewStore.onAjaxCompletion();
        DataReviewStore.emitChange();
      },
      () => {
        AdminActions.createStatusMessage(
          FrontendConstants.COULD_NOT_DELETE_DATA_REVIEW_ROLES,
          StatusMessageTypeConstants.WARNING
        );
        DataReviewStore.deleteOutstandingRequest(deleteRoles);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(deleteRoles, newRequest);
  },

  fetchReviewRolesUsageData: function() {
    const url = '/api/admin/review-roles/usage';
    AppRequest({type: 'GET', url: url}).then(
      function(data) {
        const immReviewRolesUsageData = data.reduce((acc, item) => {
          return acc.set(item.id, { isOccupied: item.isOccupied });
        }, Imm.Map());
        _immDataReviewStore = _immDataReviewStore.set('reviewRolesUsageData', immReviewRolesUsageData);
        DataReviewStore.onAjaxCompletion();
      },
      function() {
        AdminActions.createStatusMessage(
          FrontendConstants.DATA_REVIEW_ROLES_USAGE_DATA_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DataReviewStore.onAjaxCompletion();
      }
    );
  },

  fetchRolesUsageForReport: function(fileId) {
    const url = `/api/data-review/${fileId}/role-usage`;
    AppRequest({type: 'GET', url: url}).then(
      (data) => {
        const immReviewRolesUsageData = data.reduce((acc, item) => {
          return acc.set(item.id, { isOccupied: item.isOccupied });
        }, Imm.Map());
        _immDataReviewStore = _immDataReviewStore.set('reviewRolesUsageData', immReviewRolesUsageData);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        AdminActions.createStatusMessage(
          FrontendConstants.DATA_REVIEW_ROLES_USAGE_DATA_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DataReviewStore.onAjaxCompletion();
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        DataReviewStore.onAjaxCompletion();
      }
    );
  },

  updateUserDataReviewRoles(userId, userEntity, callback) {
    const {updateUserRoles} = RequestKey;
    DataReviewStore.initializeRequest(updateUserRoles);

    const url = `/api/admin/users/${userId}/update-data-review-roles`;

    const newRequest = AppRequest({type: 'PUT', data: JSON.stringify(userEntity), url: url});

    newRequest.then(
      () => {
        callback();
        AdminActions.loadUser(userId);
      },
      jqXHR => {
        AdminActions.createStatusMessage(
          FrontendConstants.CHANGE_USER_DATA_REVIEW_ROLES_FAILED,
          StatusMessageTypeConstants.WARNING
        );
        GA.sendAjaxException(`PUT update-data-review-role ${userId} failed.`, jqXHR.status);
      }
    )
  },

  updateDataReviewRolesForUserEntities(userRoleMap, callback) {
    const {updateRolesForUserEntities} = RequestKey;
    DataReviewStore.initializeRequest(updateRolesForUserEntities);

    const url = `/api/admin/review-roles/batch-update`;
    const updateMap = userRoleMap.map((reviewRoleIds, userEntityId) => {
      return {userEntityId, reviewRoleIds};
    }).toList().toJS();

    const updateJson = JSON.stringify({updateMap});
    const newRequest = AppRequest({type: 'PUT', data: updateJson, url: url});
    newRequest.then(
      () => {
        AdminActions.createStatusMessage(
          FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_DATA_REVIEW_ROLE_ASSIGNMENTS,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        callback();
        DataReviewStore.deleteOutstandingRequest(updateRolesForUserEntities);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        AdminActions.createStatusMessage(
          FrontendConstants.UPDATE_DATA_REVIEW_ROLES_FOR_USERS_FAILED,
          StatusMessageTypeConstants.WARNING
        );
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        DataReviewStore.deleteOutstandingRequest(updateRolesForUserEntities);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(updateRolesForUserEntities, newRequest);
  },

  getDataReviewRolesList() {
    return _immDataReviewStore.get(Key.dataReviewRolesList, Imm.List());
  },

  validateReviewFile(data, callback) {
    const { validateReviewFile } = RequestKey;
    DataReviewStore.initializeRequest(validateReviewFile);

    const url = `/api/data-review/validate-review-data`;

    // to send multipart form-data the following flags should be false:
    // contentType, cache, processData, parseData
    const newRequest = AppRequest({
      type: 'PUT',
      data: data,
      url: url,
      contentType: false,
      cache: false,
      method: 'PUT',
      processData: false,
      parseData: false});

    newRequest.then(
      (response) => {
        callback(response, data);
        DataReviewStore.deleteOutstandingRequest(validateReviewFile);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        ExposureActions.createStatusMessage(
          FrontendConstants.UPLOAD_DATA_REVIEW_FILE_DATA_FAILED,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        callback();
        DataReviewStore.deleteOutstandingRequest(validateReviewFile);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(validateReviewFile, newRequest);
  },

  importDataReviewFile(data, callback) {
    const { importDataReviewFile } = RequestKey;
    DataReviewStore.initializeRequest(importDataReviewFile);
    const url = `/api/data-review/import-review-data`;

    // to send multipart form-data the following flags should be false:
    // contentType, cache, processData, parseData
    const newRequest = AppRequest({
      type: 'PUT',
      data: data,
      url: url,
      contentType: false,
      cache: false,
      method: 'PUT',
      processData: false,
      parseData: false});

    newRequest.then(
      () => {
        ExposureActions.createStatusMessage(
          FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPLOAD_DATA_REVIEW_DATA,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        callback();
        DataReviewStore.deleteOutstandingRequest(importDataReviewFile);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        ExposureActions.createStatusMessage(
          FrontendConstants.UPLOAD_DATA_REVIEW_FILE_DATA_FAILED,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        callback();
        DataReviewStore.deleteOutstandingRequest(importDataReviewFile);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(importDataReviewFile, newRequest);
  },

  fetchRolesForUser (userEntityId) {
    const { fetchRolesForUserEntity } = RequestKey;
    DataReviewStore.initializeRequest(fetchRolesForUserEntity);
    const url = `/api/data-review/user-roles/${userEntityId}`;

    const newRequest = AppRequest({type: 'GET', url: url})
    newRequest.then(
      (data) => {
        _immDataReviewStore = _immDataReviewStore.mergeDeep({
          dataReviewRolesAreLoading: false,
          dataReviewRolesAvailableToUser: Imm.fromJS(data)
        });

        DataReviewStore.deleteOutstandingRequest(fetchRolesForUserEntity);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        _immDataReviewStore = _immDataReviewStore.merge({dataReviewRolesAreLoading: false});
        ExposureActions.createStatusMessage(
          FrontendConstants.UPLOAD_DATA_REVIEW_FILE_DATA_FAILED,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        DataReviewStore.deleteOutstandingRequest(fetchRolesForUserEntity);
        DataReviewStore.onAjaxCompletion();
      }
    );

    _immDataReviewStore = _immDataReviewStore.merge({ dataReviewRolesAreLoading: true });
    DataReviewStore.startOutstandingRequest(fetchRolesForUserEntity, newRequest);
  },

  fetchTabularReportNames(fileId) {
    const fetchTabularReportNames = RequestKey;
    DataReviewStore.initializeRequest(fetchTabularReportNames);
    const url = `/api/data-review/${fileId}/report-names`;
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      (data) => {
        _immDataReviewStore = _immDataReviewStore.mergeDeep({
          tabularReportNameMap: Imm.fromJS(data)
        });

        DataReviewStore.deleteOutstandingRequest(fetchTabularReportNames);
        DataReviewStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        DataReviewStore.deleteOutstandingRequest(fetchTabularReportNames);
        DataReviewStore.onAjaxCompletion();
      }
    );

    DataReviewStore.startOutstandingRequest(fetchTabularReportNames, newRequest);
  }
}, Store);

let _actions = {
  [DataReviewConstants.DATA_REVIEW_CREATE_ROLE]: action => 
    DataReviewStore.createDataReviewRole(action.immDataReviewRole, action.callback),
  [DataReviewConstants.DATA_REVIEW_DELETE_ROLES]: action => 
    DataReviewStore.deleteDataReviewRoles(action.immDataReviewRoleIds, action.hasConfirmed, action.callback),
  [DataReviewConstants.DATA_REVIEW_FETCH_USER_ENTITY_ROLES]: action => DataReviewStore.fetchRolesForUser(action.userEntityId),
  [DataReviewConstants.DATA_REVIEW_FETCH_TABULAR_REPORT_NAMES]: action => DataReviewStore.fetchTabularReportNames(action.fileId),
  [DataReviewConstants.DATA_REVIEW_LOAD_ROLE]: action => DataReviewStore.loadDataReviewRole(action.dataReviewRoleId),
  [DataReviewConstants.DATA_REVIEW_LOAD_ROLES]: () => DataReviewStore.loadDataReviewRoles(),
  [DataReviewConstants.DATA_REVIEW_LOAD_ROLES_WITH_PAGE_SETTINGS]: action => 
    DataReviewStore.loadDataReviewRolesWithPageSettings(action.pageSettings),
  [DataReviewConstants.DATA_REVIEW_IMPORT_FILE]: action =>
    DataReviewStore.importDataReviewFile(action.data, action.callback),
  [DataReviewConstants.DATA_REVIEW_UPDATE_ROLE]: action => 
    DataReviewStore.updateDataReviewRole(action.dataReviewRoleId, action.immDataReviewRole, action.callback),
  [DataReviewConstants.DATA_REVIEW_UPDATE_USER_ROLES]: action => 
    DataReviewStore.updateUserDataReviewRoles(action.userId, action.userEntity, action.callback),

  [DataReviewConstants.DATA_REVIEW_UPDATE_ROLES_FOR_USER_ENTITIES]: action => 
    DataReviewStore.updateDataReviewRolesForUserEntities(action.userRoleMap, action.callback),
  [DataReviewConstants.DATA_REVIEW_VALIDATE_FILE]: action =>
    DataReviewStore.validateReviewFile(action.data, action.callback),
  [DataReviewConstants.ADMIN_GET_REVIEW_ROLES_USAGE_DATA]: action =>
    DataReviewStore.fetchReviewRolesUsageData(),
  [DataReviewConstants.GET_REVIEW_ROLES_USAGE_DATA_FOR_REPORTS]: action =>
    DataReviewStore.fetchRolesUsageForReport(action.fileId),
};

DataReviewStore.dispatcherIndex = AppDispatcher.register(payload => {
  let action = payload.action;
  let immDataReviewStore = _immDataReviewStore;
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  // Note: Imm.is is extremely performant. A typical comparison takes about 200 nanoseconds.
  if (!Imm.is(_immDataReviewStore, immDataReviewStore)) {
    DataReviewStore.emitChange();
  }
  return true;
});

const Key = keymirror({
  dataReviewRoles: null,
  dataReviewRolesList: null,
});

const RequestKey = keymirror({
  createRole: null,
  deleteRoles: null,
  fetchRolesForUserEntity: null,
  fetchTabularReportNames: null,
  importDataReviewFile: null,
  loadRole: null,
  loadRoles: null,
  loadRolesWithPageSettings: null,
  updateUserRoles: null,
  updateRole: null,
  updateRolesForUserEntities: null,
  validateReviewFile: null,
});

export default DataReviewStore;
export {Key, RequestKey};
module.exports.GetOutstandingRequest = DataReviewStore.getOutstandingRequest;
