import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/OversightScorecardConstants';

const OversightScorecardActions = {
  fetchMetricDefaults() {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_METRIC_DEFAULTS,
    });
  },
  applyStoreState(data){
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_STORE_STATE,
      data
    });
  },

  storeViewSites(data){
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_VIEW_SITES_STATE,
      data
    });
  },

  updateIncludedFilters(data){
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_CACHE_INCLUDED_FILTERS,
      data
    });
  },

  fetchMetrics() {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_METRICS,
    });
  },

  createMetricConfiguration(configData) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_CREATE_METRIC_CONFIGURATION,
      configData,
    });
  },

  updateMetricConfiguration(id, configData) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_UPDATE_METRIC_CONFIGURATION,
      id,
      configData,
    });
  },

  deleteMetricConfiguration(id) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_DELETE_METRIC_CONFIGURATION,
      id,
    });
  },

  fetchScorecardData(selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_SCORECARD_DATA,
      selectedScorecardLevel, currentAccountId,
    });
  },

  fetchScorecardFilterData(selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_SCORECARD_FILTER_DATA,
      selectedScorecardLevel, currentAccountId,
    });
  },

  fetchScorecardMetricIds(currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_METRIC_IDS,
      currentAccountId: currentAccountId,
    });
  },

  fetchMilestoneLabel(currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_MILESTONELABEL,
      currentAccountId: currentAccountId,
      });
  },

  applyDrillDownStudies(drillDownStudyIds) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_APPLY_DRILL_DOWN_STUDIES,
      drillDownStudyIds: drillDownStudyIds
    });
  },

  handleDrilldown(file, params, drilldownHelper) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_HANDLE_DRILLDOWN,
      file, params, drilldownHelper,
    });
  },

  setDropdownFilterSelection(filterIndex, items, selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_SET_DROPDOWN_FILTER_SELECTION,
      filterIndex, items, selectedScorecardLevel, currentAccountId,
    });
  },

  resetIncludedDynamicFilter(filterIndex, selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_RESET_INCLUDED_DYNAMIC_FILTER,
      filterIndex, selectedScorecardLevel, currentAccountId,
    });
  },

  toggleNullFilter(filterIndex, selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_TOGGLE_NULL_FILTER,
      filterIndex, selectedScorecardLevel, currentAccountId,
    });
  },

  resetAllFilters(selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_RESET_ALL_FILTERS,
      selectedScorecardLevel, currentAccountId,
    });
  },

  flushAllFilters(selectedScorecardLevel, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FLUSH_ALL_FILTERS,
      selectedScorecardLevel, currentAccountId,
    });
  },

  applyClientFilters(immFilters) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_APPLY_CLIENT_FILTERS,
      immFilters,
    });
  },

  fetchMetricGroups(firstLoad) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_FETCH_METRIC_GROUPS,
      firstLoad,
    });
  },

  addMetricGroup(name, immStudies, callback) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_ADD_METRIC_GROUP,
      name,
      immStudies,
      callback,
    });
  },
  deleteMetricGroup(metricGroupId, callback) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_DELETE_METRIC_GROUP,
      metricGroupId,
      callback,
    });
  },
  editDefaultMetricGroup(metricGroupId, name, immAddedExcludedStudies, immRemovedExcludedStudies, studyIdToName, callback) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_EDIT_DEFAULT_METRIC_GROUP,
      metricGroupId,
      name,
      immAddedExcludedStudies,
      immRemovedExcludedStudies,
      studyIdToName,
      callback,
    });
  },
  editMetricGroup(metricGroupId, name, immAddedStudies, immRemovedStudies, studyIdToName, callback) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_EDIT_METRIC_GROUP,
      metricGroupId,
      name,
      immAddedStudies,
      immRemovedStudies,
      studyIdToName,
      callback,
    });
  },

  selectMetricGroup(metricGroupId) {
    AppDispatcher.handleViewAction({
      actionType: actions.OVERSIGHT_SELECT_METRIC_GROUP,
      metricGroupId,
    });
  },
};

export default OversightScorecardActions;
