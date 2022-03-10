import AdminConstants from '../constants/AdminConstants';
import AppDispatcher from '../http/AppDispatcher';
import ExposureConstants from "../constants/ExposureConstants";

var AdminActions = {
  addAccountAdmin: function(accountName, accountAdminEmail) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_ADD_ACCOUNT_ADMIN,
      accountName: accountName,
      accountAdminEmail: accountAdminEmail
    });
  },

  addGPPChart: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_ADD_GPP_CHART
    });
  },

  addDataAccessGroup: function(dataAccessGroup, callback) {
    AppDispatcher.handleViewAction({
      dataAccessGroup: dataAccessGroup,
      actionType: AdminConstants.ADMIN_ADD_DATA_ACCESS_GROUP,
      callback: callback
    })
  },

  addGroup: function(group, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_ADD_GROUP,
      group: group,
      callback: callback
    });
  },

  batchEdit: function(batchEditType, value, statusMessage) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_BATCH_EDIT,
      batchEditType: batchEditType,
      value: value,
      statusMessage: statusMessage
    });
  },

  clearComprehendSchemaJsonError: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CLEAR_COMPREHEND_SCHEMA_ERROR
    });
  },

  closeComprehendSchemaJsonEditor: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CLOSE_COMPREHEND_SCHEMA_EDITOR
    });
  },

  closeModal: function(callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CLOSE_MODAL,
      callback: callback
    });
  },

  closeStatusMessage: function(id) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CLOSE_STATUS_MESSAGE,
      id: id
    });
  },

  createAccountWithAdmin: function(accountName, accountDisplayName, isLegacyAccount, accountAdminEmail) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CREATE_ACCOUNT_WITH_ADMIN,
      accountName: accountName,
      accountDisplayName: accountDisplayName,
      isLegacyAccount: isLegacyAccount,
      accountAdminEmail: accountAdminEmail
    });
  },

  createUserByEmail: function(email, useSSO, dataAccessGroupId, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CREATE_USER_BY_EMAIL,
      email: email,
      useSSO: useSSO,
      dataAccessGroupId: dataAccessGroupId,
      callback: callback
    });
  },

  createStatusMessage: function(text, type) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CREATE_STATUS_MESSAGE,
      text: text,
      type: type
    });
  },

  loadDataAccessGroup: function(dataAccessGroupId) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUP,
      dataAccessGroupId: dataAccessGroupId
    });
  },

  loadDataAccessGroups: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUPS
    });
  },

  loadDataAccessGroupsWithPageSettings: function(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUPS_WITH_PAGE_SETTINGS,
      pageSettings: pageSettings
    });
  },

  dataAccessGroupsViewResetCheckedGroups: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_RESET_CHECKED_GROUPS
    });
  },

  dataAccessGroupsViewSetCheckedGroups: function(rowIndex, isChecked) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_SET_CHECKED_GROUPS,
      rowIndex: rowIndex,
      value: isChecked
    });
  },

  dataAccessGroupsViewSetColumnOption: function(colName, bool) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DATA_ACCESS_GROUPS_GROUPS_VIEW_SET_COLUMN_OPTION,
      colName: colName,
      value: bool
    });
  },

  dataAccessGroupsViewSetIsValid: function(isValid) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_SET_IS_VALID,
      isValid: isValid
    });
  },

  deleteDataAccessGroups: function(immDataAccessGroups, hasConfirmed, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DELETE_DATA_ACCESS_GROUPS,
      immDataAccessGroups: immDataAccessGroups,
      hasConfirmed: hasConfirmed,
      callback: callback
    });
  },

  deleteUserManagementField: function(key) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DELETE_USER_MANAGEMENT_FIELD,
      key: key
    });
  },

  displayDeleteWarningModal(callback, messageHeader, messageContent) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISPLAY_DELETE_WARNING_MODAL,
      callback,
      messageHeader,
      messageContent
    });
  },

  displayUnsavedWorkModal(callback, messageHeader, messageContent) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISPLAY_UNSAVED_WORK_MODAL,
      callback,
      messageHeader,
      messageContent
    });
  },

  discardChanges: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISCARD_CHANGES
    });
  },

  discardSchemaChanges: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISCARD_SCHEMA_CHANGES
    });
  },

  discardUsersChanges: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISCARD_USERS_CHANGES
    });
  },

  displayActionCouldNotBeCompletedModal: function(content) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISPLAY_ACTION_COULD_NOT_BE_COMPLETED_MODAL,
      content: content
    });
  },

  displayTaskManagementSaveConfirmationModal: function(callback, message) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.TASK_MANAGEMENT_SAVE_CONFIRMATION,
      message,
      callback
    });
  },

  displayDependancyResetModal: function(callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.TASK_MANAGEMENT_RESET_DEPENDENCY_CONFIRMATION,
      callback
    });
  },

  deleteExtendedAttributeConfirmation: function(callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.TASK_MANAGEMENT_DELETE_ATTRIBUTE_CONFIRMATION,
      callback
    });
  },

  displayModal: function(modalType, modalProps) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_DISPLAY_MODAL,
      modalType: modalType,
      modalProps: modalProps
    });
  },

  extendSession: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_EXTEND_SESSION
    });
  },

  getAccounts: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_ACCOUNTS
    });
  },

  getComprehendSchemaJson: function(schemaName, schemaId) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_COMPREHEND_SCHEMA_JSON,
      schemaId: schemaId,
      schemaName: schemaName
    });
  },

  getComprehendSchemaList: function(callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_COMPREHEND_SCHEMA_LIST,
      callback: callback
    });
  },

  getLegacyUsers: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_LEGACY_USERS
    });
  },

  getYellowfinReportsForGroup: function(groupID) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_YELLOWFIN_REPORTS_FOR_GROUP,
      groupID: groupID
    })
  },

  saveYellowfinReportSharingForGroup: function(groupID, reportShareData, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_YELLOWFIN_REPORT_SHARING_FOR_GROUP,
      groupID: groupID,
      reportShareData: reportShareData,
      callback: callback
    })
  },

  getYellowfinUserGroups: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GET_YELLOWFIN_USER_GROUPS
    });
  },

  loadAllUsers: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_ALL_USERS,
    });
  },

  loadAllUsersForWorkflow: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_ALL_USERS_FOR_WORKFLOW,
    });
  },

  clearAllUsersForWorkflow: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_CLEAR_USERS_FOR_WORKFLOW,
    })
  },

  loadAllStudies: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_ALL_STUDIES
    });
  },

  loadDatasources: function(schemaId, loadGPP) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_DATASOURCES,
      schemaId: schemaId,
      loadGPP: loadGPP
    });
  },

  loadGPP: function(schemaId) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_GPP,
      schemaId: schemaId
    });
  },

  loadUser: function(userId, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_USER,
      userId: userId,
      callback: callback
    });
  },

  loadUsersWithPageSettings: function(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_USERS_WITH_PAGE_SETTINGS,
      pageSettings: pageSettings
    });
  },

  parseSourceTreeData: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_PARSE_SOURCE_TREE_DATA
    });
  },

  removeGPPChart: function(index) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_REMOVE_GPP_CHART,
      index: index
    });
  },

  removeGPPDemographyInfoItem: function(immColumnPath) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_REMOVE_GPP_DEMOGRAPHY_INFO_ITEM,
      immColumnPath: immColumnPath
    });
  },

  renameColumnLongName: function(shortName, oldLongName, newLongName, tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_RENAME_COLUMN_LONG_NAME,
      shortName: shortName,
      oldLongName: oldLongName,
      newLongName: newLongName,
      tableShortName: tableShortName
    });
  },

  renameSchema: function(newSchemaName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_RENAME_SCHEMA,
      newSchemaName: newSchemaName
    })
  },

  renameSchemaTableLongName: function(newName, tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_RENAME_SCHEMA_TABLE_LONG_NAME,
      newName: newName,
      tableShortName: tableShortName
    });
  },

  resendInvitationLink: function(userId, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_RESEND_INVITATION_LINK,
      userId: userId,
      callback: callback
    });
  },

  resetUserPassword: function(userId, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_RESET_USER_PASSWORD,
      userId: userId,
      callback: callback
    });
  },

  saveAndDeployComprehendSchema: function(mode, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_AND_DEPLOY_COMPREHEND_SCHEMA,
      mode: mode,
      callback: callback
    });
  },

  saveAndDeployGPPConfig: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_AND_DEPLOY_GPP_CONFIG
    });
  },

  saveComprehendSchema: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_COMPREHEND_SCHEMA
    });
  },

  saveComprehendSchemaJson: function(json) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_COMPREHEND_SCHEMA_JSON,
      json: json
    });
  },

  setColumnEdges: function(tableShortName, columnShortName, endpointType, immDatasources) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_COLUMN_EDGES,
      columnShortName: columnShortName,
      tableShortName: tableShortName,
      endpointType: endpointType,
      immDatasources: immDatasources
    });
  },

  setColumnInvisibility: function(tableShortName, columnShortName, isInvisible) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_COLUMN_INVISIBILITY,
      columnShortName: columnShortName,
      tableShortName: tableShortName,
      isInvisible: isInvisible
    });
  },

  setColumnType: function(columnShortName, type, tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_COLUMN_TYPE,
      columnShortName: columnShortName,
      type: type,
      tableShortName: tableShortName
    });
  },

  setColumnUniqueness: function(columnShortName, isUnique, tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_COLUMN_UNIQUENESS,
      columnShortName: columnShortName,
      isUnique: isUnique,
      tableShortName: tableShortName
    });
  },

  setCurrentSchema: function(id, selected) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_CURRENT_SCHEMA,
      id: id,
      selected: selected
    });
  },

  setCurrentTab: function(tabName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_CURRENT_TAB,
      tabName: tabName
    });
  },

  setDbConnectionName: function(dbConnectionName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_DB_CONNECTION_NAME,
      dbConnectionName: dbConnectionName
    });
  },

  setGPPNumericChartDate: function(immColumnPath) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_GPP_NUMERIC_CHART_DATE,
      immColumnPath: immColumnPath
    });
  },

  setIsCDM: function(isCDM) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_IS_CDM,
      isCDM
    });
  },

  setTableInvisibility: function(isInvisible, tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SET_CURRENT_TABLE_INVISIBILITY,
      isInvisible: isInvisible,
      tableShortName: tableShortName
    });
  },

  saveSchemaUsers: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_SAVE_SCHEMA_USERS
    });
  },

  toggleDRT: function(tableShortName) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_TOGGLE_DRT,
      tableShortName: tableShortName
    });
  },

  toggleSchemaOpenState: function(schemaIndex, openState) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_TOGGLE_SCHEMA_OPEN_STATE,
      schemaIndex: schemaIndex,
      openState: openState
    });
  },

  updateBatchEdit: function(updatedType, updatedState, updatedField, shortNameInfo) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_BATCH_EDIT,
      updatedType: updatedType,
      updatedState: updatedState,
      updatedField: updatedField,
      shortNameInfo: shortNameInfo
    });
  },

  updateEditSchemaSearchInProgress: function(searchInProgress) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_EDIT_SCHEMA_SEARCH_IN_PROGRESS,
      searchInProgress: searchInProgress
    });
  },

  updateDataAccessGroup: function(dataAccessGroupId, dataAccessGroup, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_DATA_ACCESS_GROUP,
      dataAccessGroupId: dataAccessGroupId,
      dataAccessGroup: dataAccessGroup,
      callback: callback
    });
  },

  updateGroup: function(groupId, group, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_GROUP,
      groupId: groupId,
      group: group,
      callback: callback
    });
  },

  updateGPPChart: function(index, field, value) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_GPP_CHART,
      index: index,
      field: field,
      value: value
    });
  },

  updateGPPDemography: function(field, value) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_GPP_DEMOGRAPHY,
      field: field,
      value: value
    });
  },

  updateSchemaUsers: function(changeList) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_SCHEMA_USERS,
      changeList: changeList
    });
  },

  updateSelectedTableRowCount: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_SELECTED_TABLE_ROW_COUNT
    });
  },

  updateTreeData: function(node, updatedField, updatedState) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_TREE_DATA,
      node: node,
      updatedField: updatedField,
      updatedState: updatedState
    });
  },

  updateTvSearch: function(immTvSearchState, tvSearchText, keepSelection) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_TV_SEARCH,
      immTvSearchState: immTvSearchState,
      tvSearchText: tvSearchText,
      keepSelection: keepSelection
    });
  },

  updateUserRole: function(userId, role, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_USER_ROLE,
      userId: userId,
      role: role,
      callback: callback
    });
  },

  updateUserDataAccessGroup: function(userId, userEntity, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_USER_DATA_ACCESS_GROUP,
      userId: userId,
      userEntity: userEntity,
      callback: callback
    });
  },

  updateUserDetails: function(userId, userDetails, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_USER_DETAILS,
      userId: userId,
      userDetails: userDetails,
      callback: callback
    });
  },

  updateUserPermissions(userId, userPermissions, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_USER_PERMISSIONS,
      userId,
      userPermissions,
      callback,
    });
  },

  usersViewResetCheckedUserWrappers: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_USERS_VIEW_RESET_CHECKED_USER_WRAPPERS
    });
  },

  usersViewSetCheckedUserWrappers: function(rowIndex, isChecked) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_USERS_VIEW_SET_CHECKED_USER_WRAPPERS,
      rowIndex: rowIndex,
      value: isChecked
    });
  },

  usersViewSetColumnOption: function(colName, bool) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_USERS_VIEW_SET_COLUMN_OPTION,
      colName: colName,
      value: bool
    });
  },

  usersViewSetIsValid: function(isValid) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_USERS_VIEW_SET_IS_VALID,
      isValid: isValid
    });
  },

  loadGroup: function(groupId) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_GROUP,
      groupId: groupId
    });
  },

  loadGroupsWithPageSettings: function(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_LOAD_GROUPS_WITH_PAGE_SETTINGS,
      pageSettings: pageSettings
    });
  },

  groupsViewResetCheckedGroups: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GROUPS_VIEW_RESET_CHECKED_GROUPS
    });
  },

  groupsViewSetCheckedGroups: function(rowIndex, isChecked) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GROUPS_VIEW_SET_CHECKED_GROUPS,
      rowIndex: rowIndex,
      value: isChecked
    });
  },

  groupsViewSetColumnOption: function(colName, bool) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GROUPS_VIEW_SET_COLUMN_OPTION,
      colName: colName,
      value: bool
    });
  },

  groupsViewSetIsValid: function(isValid) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_GROUPS_VIEW_SET_IS_VALID,
      isValid: isValid
    });
  },

  updateDataAccessGroupsForUserEntities(immUpdatedUserEntitiesMap, callback) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_UPDATE_DATA_ACCESS_GROUPS_FOR_USER_ENTITIES,
      immUpdatedUserEntitiesMap,
      callback
    });
  },

  verifySelectedTableUniquenessColumns: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_VERIFY_SELECTED_TABLE_UNIQUENESS_COLUMNS
    });
  },

  verifyTableUniquenessColumns: function(immNodeKeyPath, displayStatusMessage) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_VERIFY_TABLE_UNIQUENESS_COLUMNS,
      immNodeKeyPath: immNodeKeyPath,
      displayStatusMessage: displayStatusMessage
    });
  },

  warnInactivityLogout: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_INACTIVITY_LOGOUT_WARNING
    });
  },

  setTopNavRenderHook(renderHook){
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.SET_TOP_NAV_RENDER_HOOK,
      renderHook
    })
  },

  fetchComprehendSchemas: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_FETCH_COMPREHEND_SCHEMAS
    });
  },

  fetchFileConfigs: function(loadEntitySummary) {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_FETCH_FILES,
      loadEntitySummary
    });
  },

  fetchEntitySummary: function() {
    AppDispatcher.handleViewAction({
      actionType: AdminConstants.ADMIN_FETCH_ENTITY_SUMMARY
    });
  },
};

module.exports = AdminActions;
export default AdminActions;
