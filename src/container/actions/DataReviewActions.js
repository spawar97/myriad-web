import DataReviewConstants from '../constants/DataReviewConstants';
import AppDispatcher from '../http/AppDispatcher';

let DataReviewActions = {
  createDataReviewRole(immDataReviewRole, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_CREATE_ROLE,
      immDataReviewRole,
      callback,
    });
  },

  deleteDataReviewRoles(immDataReviewRoleIds, hasConfirmed, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_DELETE_ROLES,
      immDataReviewRoleIds,
      hasConfirmed: hasConfirmed,
      callback,
    });
  },

  fetchUserEntityRoles(userEntityId) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_FETCH_USER_ENTITY_ROLES,
      userEntityId
    });
  },

  fetchTabularReportNames(fileId) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_FETCH_TABULAR_REPORT_NAMES,
      fileId
    });
  },

  importDataReviewFile(data, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_IMPORT_FILE,
      data,
      callback,
    });
  },

  loadDataReviewRole(dataReviewRoleId) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_LOAD_ROLE,
      dataReviewRoleId,
    });
  },

  loadDataReviewRoles() {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_LOAD_ROLES,
    });
  },

  loadDataReviewRolesWithPageSettings(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_LOAD_ROLES_WITH_PAGE_SETTINGS,
      pageSettings,
    });
  },

  fetchReviewRolesUsageData: function() {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.ADMIN_GET_REVIEW_ROLES_USAGE_DATA
    });
  },

  fetchRolesUsageForReport (fileId) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.GET_REVIEW_ROLES_USAGE_DATA_FOR_REPORTS,
      fileId
    });
  },

  updateDataReviewRole(dataReviewRoleId, immDataReviewRole, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_UPDATE_ROLE,
      dataReviewRoleId,
      immDataReviewRole,
      callback,
    });
  },

  updateDataReviewRolesForUserEntities(userRoleMap, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_UPDATE_ROLES_FOR_USER_ENTITIES,
      userRoleMap,
      callback,
    });
  },

  updateUserDataReviewRole(userId, userEntity, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_UPDATE_USER_ROLES,
      userId,
      userEntity,
      callback,
    });
  },
  
  validateReviewFile(data, callback) {
    AppDispatcher.handleViewAction({
      actionType: DataReviewConstants.DATA_REVIEW_VALIDATE_FILE,
      data,
      callback,
    });
  }
};

module.exports = DataReviewActions;
export default DataReviewActions;
