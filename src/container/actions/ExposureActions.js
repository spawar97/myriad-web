import ExposureConstants from '../constants/ExposureConstants';
import AppDispatcher from '../http/AppDispatcher';

var ExposureActions = {

  // `applyFilter` is to reflect store variable changes necessary when a user changes a filter, such as resetting a tabular report's
  // current page number. Furthermore, the function triggers `fetchFilterData` and `fetchReportData` to get new data with filters applied.
  applyFilter(fileId, drilldownId, fetchFilterDataStartIndex) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_APPLY_FILTER,
      fileId,
      drilldownId,
      fetchFilterDataStartIndex
    });
  },
  fetchYellowfinStudyFilterData(callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_YELLOWFIN_STUDY_FILTER_DATA,
      callback
    });
  },

  builtinDrilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey, schemaId, transitionTo) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_BUILTIN_DRILLDOWN_HANDLE_RELATED_FILE,
      fileId,
      drilldownId,
      chartDrilldownKey,
      schemaId,
      transitionTo
    });
  },

  clearBackNavActionStack() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_BACK_NAV_ACTION_STACK
    });
  },

  clearDrilldown(fileId, drilldownId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_DRILLDOWN,
      fileId,
      drilldownId
    });
  },

  clearFileFilterState(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_FILE_FILTER_STATE,
      fileId
    });
  },

  clearEmbeddedLoginSessionId() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_EMBEDDED_LOGIN_SESSION_ID
    });
  },

  closeModal() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLOSE_MODAL
    });
  },

  closeStatusMessage(id) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLOSE_STATUS_MESSAGE,
      id
    });
  },

  closeTaskPaneYellowfin() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLOSE_TASK_PANE_YF
    })
  },

  createFolder(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CREATE_FOLDER,
      pageSettings
    });
  },

  createStatusMessage(text, type) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CREATE_STATUS_MESSAGE,
      text,
      type
    });
  },

  createStatusMessageWithCustomTimeout(text, type, toastTimeout) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CREATE_STATUS_MESSAGE_WITH_CUSTOM_TIMEOUT,
      text,
      type,
      toastTimeout
    });
  },

  deleteFileEntry(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DELETE_FILE_ENTRY,
      fileId
    });
  },

  deleteFileStates(fileIds) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DELETE_FILE_STATES,
      fileIds
    });
  },

  deleteFiles(fileIds, folderId, pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DELETE_FILES,
      fileIds,
      folderId,
      pageSettings
    });
  },

  discardModalChanges() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DISCARD_MODAL_CHANGES
    });
  },

  displayActionCouldNotBeCompletedModal(content) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DISPLAY_ACTION_COULD_NOT_BE_COMPLETED_MODAL,
      content
    });
  },

  displayInsufficientPermissionsModal() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DISPLAY_INSUFFICIENT_PERMISSIONS_MODAL
    });
  },

  displayModal(modalType, modalProps) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DISPLAY_MODAL,
      modalType,
      modalProps
    });
  },

  displayUnsavedWorkModal(header, content, callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DISPLAY_UNSAVED_WORK_MODAL,
      header,
      content,
      callback
    });
  },

  drilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey, schemaId, transitionTo, openInNewTab) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DRILLDOWN_HANDLE_RELATED_FILE,
      fileId,
      drilldownId,
      chartDrilldownKey,
      schemaId,
      transitionTo,
      openInNewTab
    });
  },

  drilldownUpdateCurrentSelectionCondition(fileId, chartDrilldownKey, drilldownElements) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_DRILLDOWN_UPDATE_CURRENT_SELECTION_CONDITION,
      fileId,
      chartDrilldownKey,
      drilldownElements
    });
  },

  editSharingFileModal(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_EDIT_SHARING_FILE_MODAL,
      fileId
    });
  },

  exportAuditData(auditReport) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_EXPORT_AUDIT_DATA,
      auditReport
    })
  },

  exportFileData(fileId, drilldownId, downloadType, builtinFilterRequestWrapper, dataDiffRequest, rowLength, csv, immQueryOptionsWrapper) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_EXPORT_REPORT_DATA,
      fileId,
      drilldownId,
      downloadType,
      builtinFilterRequestWrapper,
      dataDiffRequest,
      rowLength,
      csv,
      immQueryOptionsWrapper,
    });
  },

  extendSession() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_EXTEND_SESSION
    });
  },

  extractListFilters(type, query) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_EXTRACT_LIST_FILTERS,
      type,
      query
    });
  },

  fetchComprehendSchemas() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_COMPREHEND_SCHEMAS
    });
  },

  // 'pageSettings' is for folder fetches.
  // 'setCurrentDashboard' is to set global ExposureStore field of representing what dashboard is currently rendered.
  // 'firstRender' is to signal that the fetch is triggered by the first render of the report/dashboard.
  // options: {fetchData, setCurrentDashboard, firstRender, fetchRelatedData}
  fetchFile(fileId, pageSettings, options, callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILE,
      fileId,
      pageSettings,
      options,
      callback
    });
  },

  fetchFiles(fileIds) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILES,
      fileIds
    });
  },

  fetchFileConfig(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILE_CONFIG,
      fileId
    });
  },

  fetchFileConfigs(fileIds, callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS,
      fileIds,
      callback
    });
  },

  fetchFileConfigsForDataReview(completionCallback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS_FOR_DATA_REVIEW,
      completionCallback
    });
  },

  fetchDataReviewRoles(dataReviewId, completionCallback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_ROLES,
      dataReviewId,
      completionCallback
    });
  },

  fetchFolderWithParameters(folderId, parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FOLDER_WITH_PAGE_SETTINGS,
      folderId,
      parameters
    });
  },

  fetchFavoritesWithPageSettings(pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FAVORITES_WITH_PAGE_SETTINGS,
      pageSettings
    });
  },

  fetchDataReviewFilterOptions(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_FILTER_OPTIONS,
      fileId
    })
  },

  fetchDataReviewSummaryFilterOptions(fileId, fileIds) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_SUMMARY_FILTER_OPTIONS,
      fileId,
      fileIds
    });
  },

  fetchNotifications() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_NOTIFICATIONS
    });
  },

  fetchQualityAgreements(callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_QUALITY_AGREEMENTS,
      callback
    });
  },

  fetchStudyCROData() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_STUDY_CRO_DATA
    });
  },

  fetchTask(taskId, isViewOnlyTask) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASK,
      taskId,
      isViewOnlyTask
    });
  },

  fetchTaskTypes() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASK_TYPES
    });
  },

  fetchTaskMetadata(callback, clinicalFilters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASK_METADATA,
      callback,
      clinicalFilters
    });
  },

  fetchClinicalAttributes(clinicalDBDetails, taskMetadata) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_CLINICAL_ATTRIBUTES,
      clinicalDBDetails,
      taskMetadata
    });
  },

  fetchClinicalAttributesV2(columnDataObj, currentTaskId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_CLINICAL_ATTRIBUTES_V2,
      columnDataObj,
      currentTaskId
    });
  },

  fetchTaskSummaries() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASK_SUMMARIES
    });
  },

  fetchTasksWithParameters(fetchFiles, parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASKS_WITH_PAGE_SETTINGS,
      fetchFiles,
      parameters
    });
  },

  fetchClosedTasksWithParameters(fetchFiles, parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_CLOSED_TASKS_WITH_PAGE_SETTINGS,
      fetchFiles,
      parameters
    });
  },

  fetchTasksApplicationsCount(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_TASKS_APPLICATIONS_COUNT,
      parameters
    });
  },

  setTaskShowHideDetail(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_SHOWHIDE_TASKS_DETAILS,
      parameters
    });
  },

  getTaskShowHideDetail(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_SHOWHIDE_TASKS_DETAILS,
      parameters
    });
  },

  setTaskTab(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_TASK_TAB_SELECTED,
      parameters
    });
  },

  getTaskTab(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_TASK_TAB_SELECTED,
      parameters
    });
  },

  setLoadingCollaboration(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_COLLABORATION_LOADING,
      parameters
    });
  },

  getLoadingCollaboration(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_COLLABORATION_LOADING,
      parameters
    });
  },

  setLoadingTaskCount(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_LOADING_TASK_COUNT,
      parameters
    });
  },

  getLoadingTaskCount(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_LOADING_TASK_COUNT,
      parameters
    });
  },

  setTaskTableLoading(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_LOADING_TASK_TABLE,
      parameters
    });
  },

  getTaskTableLoading(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_LOADING_TASK_TABLE,
      parameters
    });
  },

  setCloseTaskTableLoading(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_LOADING_CLOSE_TASK_TABLE,
      parameters
    });
  },

  getCloseTaskTableLoading(parameters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_LOADING_CLOSE_TASK_TABLE,
      parameters
    });
  },

  setRelationFilterChange(filterChangeFlag) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.SET_RELATION_FILTER_CHANGE,
      filterChangeFlag
    });
  },

  fetchClientOrg() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_CLIENT_ORG,
    });
  },

  fetchEmbeddedFile(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_EMBEDDED_FILE,
      fileId
    })
  },

  fetchEmbeddedDashboards() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_EMBEDDED_DASHBOARDS
    });
  },

  fetchEmbeddedEntitiesSummary() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_EMBEDDED_ENTITIES_SUMMARY
    });
  },

  folderViewRefreshCheckedFileIds() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_REFRESH_CHECKED_FILE_IDS
    });
  },

  folderViewSetCheckedFileIds(rowIndex, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_CHECKED_FILE_IDS,
      rowIndex,
      value
    });
  },

  folderViewSetColumnOption(colName, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_COLUMN_OPTION,
      colName,
      value
    });
  },

  folderViewSetIsStarred(rowIndex, isStarred) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_IS_STARRED,
      rowIndex,
      isStarred
    });
  },

  folderViewSetIsValid(isValid) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_IS_VALID,
      isValid
    });
  },

  favoritesViewSetCheckedItemIds(rowIndex, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_CHECKED_ITEM_IDS,
      rowIndex,
      value
    });
  },

  favoritesViewSetIsValid(isValid) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_IS_VALID,
      isValid
    });
  },

  favoritesViewSetColumnOption(colName, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_COLUMN_OPTION,
      colName,
      value
    });
  },

  getPrivilegeCapabilities(fileId, callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_PRIVILEGE_CAPABILITIES,
      fileId,
      callback
    });
  },

  getYellowfinReportList() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_YELLOWFIN_REPORT_LIST
    });
  },

  moveFiles(filesIds, folderId, pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_MOVE_FILES,
      filesIds,
      folderId,
      pageSettings
    });
  },

  openListFilterPane() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_OPEN_LIST_FILTER_PANE
    });
  },

  popBackNavAction() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_POP_BACK_NAV_ACTION
    });
  },

  pushBackNavAction(backNavAction) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_PUSH_BACK_NAV_ACTION,
      backNavAction
    });
  },

  renameFolderModal(folderId, pageSettings) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_RENAME_FOLDER_MODAL,
      folderId,
      pageSettings
    });
  },

  reportCreationViewCreateReport(immReport, callback, forceEmit) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_REPORT_CREATION_VIEW_CREATE_REPORT,
      immReport,
      callback,
      forceEmit
    });
  },

  reportCreationViewUpdateReport(reportId, immReport, callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_REPORT_CREATION_VIEW_UPDATE_REPORT,
      reportId,
      immReport,
      callback
    });
  },

  resetAllIncludedDynamicFilters(fileId, drilldownId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_RESET_ALL_INCLUDED_FILTERS,
      fileId,
      drilldownId
    });
  },

  setBuiltinBackFilter(fileId, data) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_BUILTIN_BACK_FILTER,
      fileId,
      data,
    });
  },

  setBuiltinDrilldown(drilldownId, data) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_BUILTIN_DRILLDOWN,
      drilldownId,
      data,
    });
  },

  setCDMDropdownSelections(fileId, selections) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_CDM_DROPDOWN_SELECTIONS,
      fileId,
      selections
    });
  },

  setComprehendSchemaOverview(comprehendSchemaId, immDatasources) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_COMPREHEND_SCHEMA_OVERVIEW,
      comprehendSchemaId,
      immDatasources
    });
  },

  setComprehendSchemaOverviewTable(comprehendSchemaId, datasourceName, nodeShortName, immTable) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_COMPREHEND_SCHEMA_OVERVIEW_TABLE,
      comprehendSchemaId,
      datasourceName,
      nodeShortName,
      immTable
    });
  },

  setModalDataSelectorInputValid(valid) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_MODAL_DATA_SELECTOR_INPUT_VALID,
      valid
    });
  },

  setMoveToFolderId(folderId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_MOVE_TO_FOLDERID,
      folderId
    });
  },

  setMonitorTasks(immMonitorTasks) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_MONITOR_TASKS,
      immMonitorTasks
    });
  },

  setMonitorTasksExpandedIds(immExpandedIds, openMonitorTasks) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_MONITOR_TASKS_EXPANDED_IDS,
      immExpandedIds,
      openMonitorTasks
    });
  },

  setShowMobileTabularReportDetails(isOpen) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_SHOW_MOBILE_TABULAR_REPORT_DETAILS,
      isOpen
    });
  },

  setValidateMonitorSelectionConditionColumnCql(immMonitorFile, schemaId, cql, successCallback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_VALIDATE_MONITOR_SELECTION_CONDITION_COLUMN_CQL,
      immMonitorFile,
      schemaId,
      cql,
      successCallback
    });
  },

  setVisibleMonitorTrendlines(fileId, visibleMonitorTrendlines) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_VISIBLE_MONITOR_TRENDLINES,
      fileId,
      visibleMonitorTrendlines
    });
  },

  shareFiles(immFileConfigs, immSelectedEntities, immPrivileges) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SHARE_FILES,
      immFileConfigs: immFileConfigs,
      immSelectedEntities,
      immPrivileges
    });
  },

  shareFilesModal(fileIds) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SHARE_FILES_MODAL,
      fileIds
    });
  },

  monitorTaskAssigneesModal(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_MONITOR_TASK_ASSIGNEES_MODAL,
      fileId
    });
  },

  tabularReportGoToPage(reportId, drilldownId, pageNumber) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TABULAR_REPORT_GO_TO_PAGE,
      reportId,
      drilldownId,
      pageNumber
    });
  },

  tabularReportSetColumnSort(reportId, drilldownId, colIndex, sortIndex) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TABULAR_REPORT_SET_COLUMN_SORT,
      reportId,
      drilldownId,
      colIndex,
      sortIndex
    });
  },

  tabularReportSetRowsPerPage(reportId, drilldownId, rowsPerPage) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TABULAR_REPORT_SET_ROWS_PER_PAGE,
      reportId,
      drilldownId,
      rowsPerPage
    });
  },

  setIsViewTasks(value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.SET_VIEW_TASKS,
      value
    });
  },

  taskScreenshotSubmit(saveTaskObject) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASK_SCREENSHOT_SUBMIT,
      saveTaskObject
    });
  },

  getTaskList(taskRelationship, sortBy, orderBy, begin, length, context) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_TASK_LIST,
      taskRelationship,
      sortBy,
      orderBy,
      begin,
      length,
      context
    });
  },

  taskViewSubmitTask(currentFileId, drilldownId, transitionTo, addTaskSuccessCallback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASK_VIEW_SUBMIT_TASK,
      currentFileId,
      drilldownId,
      transitionTo,
      addTaskSuccessCallback
    });
  },

  taskViewUpdateTask(immWorkingTaskWrapper, isObserverOnly, transitionToCollaboration) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASK_VIEW_UPDATE_TASK,
      immWorkingTaskWrapper,
      isObserverOnly,
      transitionToCollaboration
    });
  },

  tasksViewSetCheckedTaskIds(rowIndex, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASKS_VIEW_SET_CHECKED_TASK_IDS,
      rowIndex,
      value
    });
  },

  tasksViewSetColumnOption(colName, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASKS_VIEW_SET_COLUMN_OPTION,
      colName,
      value
    });
  },

  tasksViewSetIsStarred(rowIndex, isStarred) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASKS_VIEW_SET_IS_STARRED,
      rowIndex,
      isStarred
    });
  },

  tasksViewSetIsValid(isValid) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TASKS_VIEW_SET_IS_VALID,
      isValid
    });
  },

  templateCreate(immTemplate, postAction) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATE_CREATE,
      immTemplate,
      postAction
    });
  },

  templatesDelete(templateIds) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATES_DELETE,
      templateIds
    });
  },

  templatesFetch() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATES_FETCH
    });
  },

  templateUpdate(immTemplate, postAction) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATE_UPDATE,
      immTemplate,
      postAction
    });
  },

  templatesViewSetCheckedTemplateIds(rowIndex, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATES_VIEW_SET_CHECKED_TEMPLATE_IDS,
      rowIndex: rowIndex,
      value: value
    });
  },

  templatesViewSetColumnOption(colName, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TEMPLATES_VIEW_SET_COLUMN_OPTION,
      colName,
      value
    });
  },

  toggleDisplayWarningModal(props, forceHide) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_DISPLAY_WARNING_MODAL,
      props,
      forceHide
    });
  },

  toggleFiltersPane(visible) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_FILTERS_PANE,
      visible
    });
  },

  toggleMobileNavMenu(clearBackNavActionStack) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_MOBILE_NAV_MENU,
      clearBackNavActionStack
    });
  },

  toggleMonitorTasksPane(forceClose) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_MONITOR_TASKS_PANE,
      forceClose
    });
  },

  toggleNotificationsDropdown() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_NOTIFICATIONS_DROPDOWN
    });
  },

  toggleListFilterPane() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_LIST_FILTER_PANE
    });
  },

  // `enter` is true if user has entered either the DashboardStudio or the DataReviewStudio and false upon exit.
  transitionLinkedReportsStudio(fileId, enter) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TRANSITION_LINKED_REPORTS_STUDIO,
      fileId,
      enter
    });
  },

  transitionFile(currentFileId, nextFileId, nextDrilldownId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TRANSITION_FILE,
      currentFileId,
      nextFileId,
      nextDrilldownId
    });
  },

  transitionTo(path) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TRANSITION_TO,
      path
    });
  },

  updateIncludedDynamicFilter(fileId, drilldownId, filterIndex, updateType, data) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_APPLIED_FILTER,
      fileId,
      drilldownId,
      filterIndex,
      updateType,
      data
    });
  },

  updateFile(fileId, immFile, callback, confirmSharingImpact) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_FILE,
      fileId,
      immFile,
      callback,
      confirmSharingImpact
    });
  },

  updateListFilter(type, filter, value) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_LIST_FILTER,
      type,
      filter,
      value
    });
  },

  updateSharingFile(immFileConfig, immEntityPrivilegesList) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_SHARING_FILE,
      immFileConfig,
      immEntityPrivilegesList
    });
  },

  validateCqlSessionFilter(cql, fileId, schemaId, drilldownId, options) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_VALIDATE_CQL_SESSION_FILTER,
      cql,
      drilldownId,
      fileId,
      schemaId,
      options
    });
  },

  validateMonitorSelectionConditionColumnCql(immMonitorFile, schemaId, cql, successCallback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_VALIDATE_MONITOR_SELECTION_CONDITION_COLUMN_CQL,
      immMonitorFile,
      schemaId,
      cql,
      successCallback
    });
  },

  warnInactivityLogout() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_INACTIVITY_LOGOUT_WARNING
    });
  },

  setDataFilterSelection(fileId, immDataFilterSelection) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_DATA_FILTER_SELECTIONS,
      fileId,
      immDataFilterSelection
    });
  },

  setMedTaskFilters(fileId, immMedTaskFilters) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_MED_TASK_FILTERS,
      fileId,
      immMedTaskFilters
    });
  },

  clearDataTaskFilters(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_DATA_TASK_FILTERS,
      fileId
    });
  },

  clearDataFilterSelection(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_SELECTIONS,
      fileId
    });
  },

  clearDataReviewFilterOptions() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_OPTIONS
    });
  },

  clearDataReviewFilterRequestInFlight() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_REQUEST_IN_FLIGHT
    });
  },

  setTaskInformationTemp(immWorkingTaskWrapperTemp) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_TASK_INFO_TEMP,
      immWorkingTaskWrapperTemp
    });
  },

  clearTaskInformationTemp() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_TASK_INFO_TEMP
    });
  },

  getTaskAssignableUsers(studyIds, callBack) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GET_TASK_ASSIGNABLE_USERS,
      studyIds,
      callBack
    });
  },

  gppDrilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey, schemaId, transitionTo) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_GPP_DRILLDOWN_HANDLE_RELATED_FILE,
      fileId,
      drilldownId,
      chartDrilldownKey,
      schemaId,
      transitionTo
    });
  },

  fetchFileConfigsForGroup(groupId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS_FOR_GROUP,
      groupId
    });
  },

  fetchStudies(callback) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_FETCH_STUDIES,
      callback
    });
  },

  setKPIStudioActive() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_KPI_STUDIO_ACTIVE,
    });
  },

  clearKPIStudioActive() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_KPI_STUDIO_ACTIVE
    });
  },

  applyCheckAll(check) {
    AppDispatcher.handleViewAction({ actionType: ExposureConstants.EXPOSURE_FOLDER_VIEW_CHECK_ALL, check });
  },

  setShowSessionStudyFilter(showSessionStudyFilter) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SHOW_SESSION_STUDY_FILTER, showSessionStudyFilter
    });
  },
  updateUserInfo(userInfo) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_USER_INFO,
      userInfo
    })
  },
  acceptPolicyAndAgreements(userId, transitionTo) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_ACCEPT_POLICY_AND_AGREEMENTS,
      userId,
      transitionTo
    });
  },

  /**
   * For a given file, updates a vizspec at the specified report index, and triggers a refresh
   * of all vizspecs associated with the file, with the option of skipping the refresh of a single
   * vizspec
   *
   * @param fileId        - The file being displayed
   * @param vizspec       - The updated vizspec that should be inserted into the file's vizspecs
   * @param reportIndex   - The index of the vizspec in the vizspecs array to update
   * @param skipIndex     - The index of the vizspec in the vizspecs array to skip refreshing
   */
  refreshVizspecs(fileId, vizspec, reportIndex, skipIndex) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_REFRESH_VIZ,
      fileId,
      vizspec,
      reportIndex,
      skipIndex,
    });
  },
 async updateWidget(fileId, widgetMetaData) {
    widgetMetaData = { ...widgetMetaData, render: true }
   await AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_UPDATE_WIDGET,
      fileId,
      widgetMetaData,
    });
  },

  /**
   * Clears the skip index - Which is used to notify the highcharts component to not render the
   * vizspec at the specified index.
   */
  clearSkipIndex() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_SKIP_INDEX,
    });
  },

  setActiveFocusBreadcrumbsAnalytic(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_ACTIVE_FOCUS_BREADCRUMBS_ANALYTIC,
      fileId,
    });
  },

  clearFileTaskFiltersSCCS(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.CLEAR_TASK_FILTERS,
      fileId,
    });
  },

  clearActiveFocusBreadcrumbsAnalytic() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CLEAR_ACTIVE_FOCUS_BREADCRUMBS_ANALYTIC,
    });
  },
  
  fetchBotCompletion() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_BOT_COMPLETION,
    });
  },

  selectedModuleOption(isModuleActive) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SELECTED_MODULE,
      isModuleActive,
    });
  },

  clearSelectedModuleOption() {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.CLEAR_EXPOSURE_SELECTED_MODULE,
    });
  },

  setTopNavRenderHook(renderHook){
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.SET_TOP_NAV_RENDER_HOOK,
      renderHook
    });
  },
  setDrilldownData(fileData){
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.DRILLDOWN_FILE_DATA,
      fileData
    });
  },

  
  loadedPrimeTableComponent(data) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_PRIME_LOADED,
      data,
    });
  },

  setSupernavbarRef(ref) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.SET_SUPERNAVBAR_REF,
      ref
    });
  },

  whoAmI() {
    AppDispatcher.handleViewAction(({
      actionType: ExposureConstants.EXPOSURE_WHO_AM_I
    }))
  },

  exportPDF(requestModel) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_PDF_REPORT_DATA,
      requestModel,
    });
  },

  pdfChartDataAction(chartData, isMultiData) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.CQS_PDF_EXPORT,
      chartData,
      isMultiData
    });
  },
  pdfPrimeTableDataAction(tableData) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.PRIME_TABLE_PDF_EXPORT,
      tableData
    });
  },

  setBotEntities(entities) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_SET_BOT_ENTITIES,
      entities
    });
  },
  updateMultipleWidget(fileId, widgetMetaData) {
    AppDispatcher.handleViewAction({
     actionType: ExposureConstants.EXPOSURE_UPDATE_MULTIPLE_WIDGET,
     fileId,
     widgetMetaData,
    });
   },

  updateFetchControllerAction(controller) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.FETCH_CONTROLLER_ACTION,
      controller
    });
  },

  updateSessionStorage(data){
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.UPDATE_WIDGET_FILTER_SESSION_STORAGE,
      data,
    });
  },

  widgetFilterStore(data){
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.WIDGET_FILTER_STORE,
      data,
    });
  },

  currentWidgetUpdating(data){
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_CURRENT_WIDGET_UPDATING,
      data,
    });
  },

  saveMasterFilterContext(data) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.UPDATE_MASTER_FILTER_CONTEXT,
      data
    });
  },
  storeTaskDetailsAction(taskStoreDetails) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.STORE_TASK_DETAILS_BOOLEAN,
      taskStoreDetails
    });
  },

  storeTaskDetailsDataAction(taskStoreDetailsData) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.STORE_TASK_DETAILS,
      taskStoreDetailsData
    });
  },
  
  storeClonedTriggeredAction(clonedTriggered) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.STORE_CLONED_TRIGGERED_BOOLEAN,
      clonedTriggered
    });
  },
  
  toggleTasksPane(visible) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.EXPOSURE_TOGGLE_TASK_PANE,
      visible
    });
  },

  displaySnapshotReplaceModal(callback, e, imgstore, screenshottime) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.MODEL_SNAPSHOT_REPLACE,
      callback,
      e,
      imgstore,
      screenshottime
    });
  },
  
  setFileId(fileId, immFile) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.SET_FILE_ID,
      fileId,
      immFile
    });
  },

  updateWidgetMetaData(fileId, widgetMetaData, dashboardCustomConfigs) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.UPDATE_WIDGET_META_DATA,
      fileId,
      widgetMetaData,
      dashboardCustomConfigs
    });
  },

  updateRequests(fileId, request) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.UPDATE_REQUESTS,
      fileId,
      request
    });
  },

  deleteRequests(fileId) {
    AppDispatcher.handleViewAction({
      actionType: ExposureConstants.DELETE_REQUESTS,
      fileId
    });
  }
};

module.exports = ExposureActions;
