import Store from '../stores/TaskManagementStore';
import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/TaskManagementConstants';

var TaskManagementActions = {
  addListener(callback) {
    Store.addChangeListener(callback);
  },

  removeListener(callback) {
    Store.removeChangeListener(callback);
  },

  fetchTaskMetadata() {
    AppDispatcher.handleViewAction({
      actionType: actions.FETCH_TASK_METADATA,
    });
  },

  saveTaskMetadata(taskMetadata) {
    AppDispatcher.handleViewAction({
      actionType: actions.SAVE_TASK_METADATA,
      taskMetadata
    });
  },

  updateTaskMetadata(taskMetadata, attributeType) {
    AppDispatcher.handleViewAction({
      actionType: actions.TASK_METADATA_UPDATE,
      taskMetadata,
      attributeType
    });
  },

  addExtendedTaskAttribute(combineDashboardReportList) {
    AppDispatcher.handleViewAction({
      actionType: actions.ADD_EXTENDED_TASK_ATTRIBUTE,
      combineDashboardReportList
    });
  },

  addClinicalAttributes(combineDashboardReportList, clinicalAttributes, callback) {
    AppDispatcher.handleViewAction({
      actionType: actions.ADD_CLINICAL_ATTRIBUTES,
      clinicalAttributes,
      combineDashboardReportList,
      callback
    });
  },

  changeFlagFocusLatestExtendedRow() {
    AppDispatcher.handleViewAction({
      actionType: actions.CHANGE_FOCUS_LATEST_EXTENDED_ROW
    });
  },

  fetchTaskMetadataAnalytics() {
    AppDispatcher.handleViewAction({
      actionType: actions.FETCH_TASK_METADATA_ANALYTICS,
    });
  },

};

module.exports = TaskManagementActions;
export default TaskManagementActions;
