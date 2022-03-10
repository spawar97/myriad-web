import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';

import Store from './Store';
import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/OversightScorecardConstants';
import AppRequest from '../http/AppRequest';
import Util from "../util/util";
import $ from "jquery";
import ExposureActions from '../actions/ExposureActions';
import ExposureStore from '../stores/ExposureStore';
import OversightConsoleUtil from "../util/OversightConsoleUtil";
import FrontendConstants from "../constants/FrontendConstants";
import StatusMessageTypeConstants from "../constants/StatusMessageTypeConstants";
import HttpResponseConstants from "../constants/HttpResponseConstants";
import ExposureAppConstants from "../constants/ExposureAppConstants";
import {Key, RequestKey} from './constants/OversightStoreConstants';

const defaultStore = Imm.fromJS({
  //List of default metric configurations
  metricDefaults: [],
  //List of metric configurations of active account
  metrics: [],
  //Map of metrics combined from 'metricDefaults' and 'metrics'
  metricsCombined: [],
  results: {}, // drilldown filtered scores
  includedDynamicFilters: [],
  clientFilters: {},
  rawResults: {}, // raw scores
  isLoadingScorecardData: false,
  metricGroups: {},
  selectedMetricGroup: null,
  storeState:{},
  viewSiteState:{},
  milestoneLabel:{}
});

let _immStore = defaultStore;

const OversightScorecardStore = _.extend({
  getStore() {
    return _immStore;
  },

  resetStore() {
    _immStore = defaultStore;
  },

  updateCombinedMetrics() {
    const selectedMetricGroup = _immStore.get(Key.selectedMetricGroup);
    const metricIdsById = OversightConsoleUtil.metricsListToMap(_immStore.get(Key.metricIds, Imm.List()));
    const metricDefaultsById = OversightConsoleUtil.metricsListToMap(_immStore.get(Key.metricDefaults, Imm.List()));
    const accountMetricsById = OversightConsoleUtil.metricsListToMap(
      _immStore.get(Key.metrics, Imm.List())
        .filter(immMetric => immMetric.get('metricGroupId') === selectedMetricGroup)
        .map(immMetric => immMetric.set('isAccount', true))
    );
    const immMetricsByIdCombined = metricIdsById.concat(metricDefaultsById.concat(accountMetricsById));
    _immStore = _immStore.set(Key.metricsCombined, immMetricsByIdCombined.valueSeq());
  },

  fetchMetricDefaults() {
    const url = '/api/oversight/metrics/defaults';
    const {fetchMetricDefaults} = RequestKey;

    OversightScorecardStore.initializeRequest(fetchMetricDefaults);
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      data => {
        const newMetricDefaults = Imm.fromJS(data);
        _immStore = _immStore.set(Key.metricDefaults, newMetricDefaults);
        this.updateCombinedMetrics();

        OversightScorecardStore.deleteOutstandingRequest(fetchMetricDefaults);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(fetchMetricDefaults);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchMetricDefaults, newRequest);
  },

  fetchMetrics() {
    const url = '/api/oversight/metrics';
    const {fetchMetrics} = RequestKey;

    OversightScorecardStore.initializeRequest(fetchMetrics);
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      data => {
        const newMetrics = Imm.fromJS(data);
        _immStore = _immStore.set(Key.metrics, newMetrics);
        this.updateCombinedMetrics();

        OversightScorecardStore.deleteOutstandingRequest(fetchMetrics);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(fetchMetrics);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchMetrics, newRequest);
  },

  fetchMetricGroups(firstLoad) {
    const url = '/api/oversight/metric-groups';
    const {fetchMetricGroups} = RequestKey;

    OversightScorecardStore.initializeRequest(fetchMetricGroups);
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      data => {
        const newMetricGroups = Imm.fromJS(data);
        const immMetricGroups = Imm.Map(newMetricGroups.map(x => [x.get('id'), x]));
        _immStore = _immStore.set(Key.metricGroups, immMetricGroups);

        if (firstLoad) {
          const defaultMetricGroupId = immMetricGroups.find(x => x.get('isDefault')).get('id');
          OversightScorecardStore.selectMetricGroup(defaultMetricGroupId);
        }

        OversightScorecardStore.deleteOutstandingRequest(fetchMetricGroups);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`Get ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(fetchMetricGroups);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchMetricGroups, newRequest);
  },

  addMetricGroup(name, immStudies, callback) {
    const url = '/api/oversight/metric-groups';
    const {addMetricGroup} = RequestKey;

    OversightScorecardStore.initializeRequest(addMetricGroup);
    const newRequest = AppRequest({
      type: 'POST',
      url: url,
      data: JSON.stringify({
        name: name,
        addedStudyIds: immStudies.toJS(),
        removedStudyIds: [],
        addedExcludedStudyIds: [],
        removedExcludedStudyIds: [],
      }),
    });
    newRequest.then(
      data => {
        OversightScorecardStore.deleteOutstandingRequest(addMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        const messageText = FrontendConstants.YOU_HAVE_SUCCESSFULLY_ADDED_A_METRIC_GROUP;
        ExposureActions.createStatusMessage(messageText, StatusMessageTypeConstants.TOAST_SUCCESS);
        callback(true);

      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_ADD_NEW_METRIC_GROUP,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(addMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(false);
      }
    );

    OversightScorecardStore.startOutstandingRequest(addMetricGroup, newRequest);
  },

  /**
   * Sends a request to the server for updating an existing metric group. This specific function
   * should only be used for metric groups which are NOT the default metric group. Edits to the
   * default metric group should use the function editDefaultMetricGroup.
   *
   * @param metricGroupId       - metric_group ID
   * @param name                - Name of the group
   * @param immAddedStudies     - Immutable list of study IDs added to the group
   * @param immRemovedStudies   - Immutable list of study IDs removed from the group
   * @param callback
   */
  editMetricGroup(metricGroupId, name, immAddedStudies, immRemovedStudies, studyIdToName, callback) {
    const url = `/api/oversight/metric-groups/${metricGroupId}`;
    // This shares the same request as the request for editing the default metric group
    const {editMetricGroup} = RequestKey;

    OversightScorecardStore.initializeRequest(editMetricGroup);
    const newRequest = AppRequest({
      type: 'PUT',
      url: url,
      data: JSON.stringify({
        name: name,
        addedStudyIds: immAddedStudies.toJS(),
        removedStudyIds: immRemovedStudies.toJS(),
        addedExcludedStudyIds: [],      // Only used for default metric group
        removedExcludedStudyIds: [],    // Only used for default metric group
      }),
    });
    newRequest.then(
      data => {
          if(immAddedStudies.size > 0) {
              const addedStudyNames = immAddedStudies.map(studyId => studyIdToName[studyId]);
              const messageText = FrontendConstants.OS_GROUP_ADDED_STUDIES_SUCCESS(name, addedStudyNames.join(", "));
              ExposureActions.createStatusMessage(messageText, StatusMessageTypeConstants.TOAST_SUCCESS);
          }
          if(immRemovedStudies.size > 0) {
              const removedStudyNames = immRemovedStudies.map(studyId => studyIdToName[studyId]);
              const messageText = FrontendConstants.OS_GROUP_REMOVED_STUDIES_SUCCESS(name, removedStudyNames.join(", "));
              ExposureActions.createStatusMessage(messageText, StatusMessageTypeConstants.TOAST_SUCCESS);
          }
        OversightScorecardStore.deleteOutstandingRequest(editMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(true);
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_EDIT_METRIC_GROUP,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(editMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(false);
      }
    );

    OversightScorecardStore.startOutstandingRequest(editMetricGroup, newRequest);
  },

  /**
   * Sends a request to the server to update the default metric group for the account
   * @param metricGroupId       - metric_group ID
   * @param name                - Name of the group
   * @param immAddedExcludedStudies   - Immutable list of study IDs added to the exclusion list
   * @param immRemovedExcludedStudies - Immutable list of study IDs removed from the exclusion list
   * @param callback
   */
  editDefaultMetricGroup(metricGroupId, name, immAddedExcludedStudies, immRemovedExcludedStudies, studyIdToName, callback) {
    const url = `/api/oversight/metric-groups/${metricGroupId}`;
    // This shares the same request as updating any other non-default metric group
    const {editMetricGroup} = RequestKey;

    OversightScorecardStore.initializeRequest(editMetricGroup);
    const newRequest = AppRequest({
      type: 'PUT',
      url: url,
      data: JSON.stringify({
        name: 'Default',
        addedStudyIds: [],        // Ignored on the default group
        removedStudyIds: [],      // Ignored on the default group
        addedExcludedStudyIds: immAddedExcludedStudies.toJS(),
        removedExcludedStudyIds: immRemovedExcludedStudies.toJS(),
      }),
    });
    newRequest.then(
      data => {
        OversightScorecardStore.deleteOutstandingRequest(editMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        if(immRemovedExcludedStudies.size > 0) {
          const addedStudyNames = immRemovedExcludedStudies.map(studyId => studyIdToName[studyId]);
          const messageText = FrontendConstants.OS_GROUP_ADDED_STUDIES_SUCCESS(name, addedStudyNames.join(", "));
          ExposureActions.createStatusMessage(messageText, StatusMessageTypeConstants.TOAST_SUCCESS);
        }
        if(immAddedExcludedStudies.size > 0) {
          const removedStudyNames = immAddedExcludedStudies.map(studyId => studyIdToName[studyId]);
          const messageText = FrontendConstants.OS_GROUP_REMOVED_STUDIES_SUCCESS(name, removedStudyNames.join(", "));
          ExposureActions.createStatusMessage(messageText, StatusMessageTypeConstants.TOAST_SUCCESS);
        }
        callback(true);
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_EDIT_METRIC_GROUP,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(editMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(false);
      }
    );

    OversightScorecardStore.startOutstandingRequest(editMetricGroup, newRequest);
  },
  deleteMetricGroup(metricGroupId, callback) {
    const url = `/api/oversight/metric-groups/${metricGroupId}`;
    const {deleteMetricGroup} = RequestKey;

    OversightScorecardStore.initializeRequest(deleteMetricGroup);
    const newRequest = AppRequest({
      type: 'DELETE',
      url: url,
      data: '',
    });
    newRequest.then(
      () => {
        OversightScorecardStore.deleteOutstandingRequest(deleteMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(true);
      },
      jqXHR => {
        GA.sendAjaxException(`DELETE ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_DELETE_METRIC_GROUP,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(deleteMetricGroup);
        OversightScorecardStore.onAjaxCompletion();
        callback(false);
      }
    );

    OversightScorecardStore.startOutstandingRequest(deleteMetricGroup, newRequest);
  },
  selectMetricGroup(metricGroupId) {
    const currentSelectedGroup = _immStore.get(Key.selectedMetricGroup);
    if (metricGroupId !== currentSelectedGroup) {
      const immMetricGroup = _immStore.getIn([Key.metricGroups, metricGroupId])
        || _immStore.get(Key.metricGroups).find(x => x.get('isDefault'));
      if (immMetricGroup) {
        _immStore = _immStore.set(Key.selectedMetricGroup, metricGroupId);
        this.updateCombinedMetrics();
      }
    }
  },

  getImmQueryOptionsWrapper(currentAccountId) {
    const sessionFilters = Util.getSessionFiltersFromCookie(currentAccountId);
    let sessionStaticFilters, sessionDynamicFilters;
    if (sessionFilters != null) {
      sessionStaticFilters = _.map(sessionFilters.sessionStaticFilters, Util.getFullSessionStaticFilters);
      sessionDynamicFilters = _.map(sessionFilters.sessionDynamicFilters, Util.getFullSessionDynamicFilters);
    }
    const immFilterStates = _immStore.get(Key.includedDynamicFilters, Imm.List());
    const immIncludedDynamicFilters = immFilterStates.map(Util.packageFilterCondition);
    return Imm.Map({
      drilldownDataPointFilters: [],
      drilldownIncludedStaticFilters: [],
      drilldownIncludedDynamicFilters: [],
      includedDynamicFilters: immIncludedDynamicFilters,
      sessionStaticFilters: sessionStaticFilters,
      sessionDynamicFilters: sessionDynamicFilters,
      taskFilters: [],
      drilldownTaskFilters: [],
      pageOrderings: [],
      cqlQueries: [],
    });
  },

  applyDrillDownStudies(drillDownStudyIds) {
    OversightScorecardStore.initializeRequest(RequestKey.applyDrillDownStudies);

    const immRawResults = _immStore.get(Key.rawResults);
    if (_.isEmpty(drillDownStudyIds)) {
      _immStore = _immStore.set(Key.results, immRawResults);
    } else {
      let immRawScores = immRawResults.get(Key.oversightMetrics, Imm.List());
      const immDrillDownScores = immRawScores.filter(score => {
        return _.contains(drillDownStudyIds, score.get('studyid', null));
      });
      const immDrillDownResults = immRawResults.set(Key.oversightMetrics, immDrillDownScores);
      _immStore = _immStore.set(Key.results, immDrillDownResults);
    }
    OversightScorecardStore.deleteOutstandingRequest(RequestKey.applyDrillDownStudies);
  },

  fetchScorecardData(selectedScorecardLevel, currentAccountId) {

    let studyId = OversightConsoleUtil.getParameterByName("studyId") !== null ? OversightConsoleUtil.getParameterByName("studyId") : '' ;
    let serviceEndpoint ='/api/oversight/data/';
    const url = selectedScorecardLevel.toLowerCase() == "site"  ?
      `${serviceEndpoint}${selectedScorecardLevel.toLowerCase()}?studyId=${studyId}` :
      `${serviceEndpoint}${selectedScorecardLevel.toLowerCase()} `;
      
    const {fetchScorecardData} = RequestKey;
    const immQueryOptionsWrapper = OversightScorecardStore.getImmQueryOptionsWrapper(currentAccountId);
    const data = JSON.stringify(immQueryOptionsWrapper.toJS());

    OversightScorecardStore.initializeRequest(fetchScorecardData);
    _immStore = _immStore.set(Key.isLoadingScorecardData, true);
    const newRequest = AppRequest({type: 'POST', url: url, data: data});
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.results, Imm.fromJS(responseData));
        _immStore = _immStore.set(Key.rawResults, Imm.fromJS(responseData));
        _immStore = _immStore.delete(Key.isLoadingScorecardData);
        OversightScorecardStore.deleteOutstandingRequest(fetchScorecardData);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        _immStore = _immStore.delete(Key.isLoadingScorecardData);
        OversightScorecardStore.deleteOutstandingRequest(fetchScorecardData);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchScorecardData, newRequest);
  },

  setDropdownFilterSelection(filterIndex, items, selectedScorecardLevel, currentAccountId) {
    _immStore = _immStore.updateIn([Key.includedDynamicFilters, filterIndex], (immFilter) => {
      return immFilter.merge({
        itemsSelected: items,
        allSelected: _.isEmpty(items),
      });
    });
    OversightScorecardStore.fetchScorecardFilterData(selectedScorecardLevel, currentAccountId);
  },

  selectAllFilterValues(filterIndex) {
    _immStore = _immStore.mergeIn([Key.includedDynamicFilters, filterIndex], {
      itemsSelected: Imm.OrderedSet(),
      allSelected: true,
      nullExcluded: false,
    });
  },

  resetIncludedDynamicFilterInStore(filterIndex) {
    const filterType = _immStore.getIn([Key.includedDynamicFilters, filterIndex, 'filterType']);
    switch (filterType) {
      case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
        OversightScorecardStore.selectAllFilterValues(filterIndex);
        break;
      case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
        //There is no slider filter in the Oversight
        break;
    }
  },

  resetIncludedDynamicFilter(filterIndex, selectedScorecardLevel, currentAccountId) {
    OversightScorecardStore.resetIncludedDynamicFilterInStore(filterIndex);
    OversightScorecardStore.fetchScorecardFilterData(selectedScorecardLevel, currentAccountId);
  },

  toggleNullFilter(filterIndex, selectedScorecardLevel, currentAccountId) {
    _immStore = _immStore.updateIn([Key.includedDynamicFilters, filterIndex], (immFilter) => {
      return immFilter.set('nullExcluded', !immFilter.get('nullExcluded'));
    });
    OversightScorecardStore.fetchScorecardFilterData(selectedScorecardLevel, currentAccountId);
  },

  resetAllFilters(selectedScorecardLevel, currentAccountId) {
    const newFilters = _immStore.get(Key.includedDynamicFilters, Imm.List());
    newFilters.forEach((filter, index) => {
      OversightScorecardStore.resetIncludedDynamicFilterInStore(index);
    });
    OversightScorecardStore.fetchScorecardData(selectedScorecardLevel, currentAccountId);
  },

  flushAllFilters(selectedScorecardLevel, currentAccountId, studyId) {
    _immStore = _immStore.set(Key.includedDynamicFilters, Imm.List());
    OversightScorecardStore.fetchScorecardFilterData(selectedScorecardLevel, currentAccountId);
    OversightScorecardStore.fetchScorecardData(selectedScorecardLevel, currentAccountId, studyId);
  },

  setIncludedDynamicFilterResults(filterResults) {
    const immNewFilterStates = Imm.fromJS(filterResults).map((immFilterResult, idx) => {
      const immOriginalFilterState = _immStore.getIn(
        [Key.includedDynamicFilters, idx],
        Imm.fromJS({
          itemsSelected: Imm.OrderedSet(),
          allSelected: true,
        })
      );
      const immNewFilterOptions = immFilterResult.getIn(['dynamicFilterData', 'rows'], Imm.List()).map(immRow => immRow.get('values')).flatten();
      const immNewSelectedItems = immOriginalFilterState.get('itemsSelected').filter(item => immNewFilterOptions.contains(item));
      return immOriginalFilterState.merge(Imm.fromJS({
        column: immFilterResult.get('dynamicFilterPropertyColumn'),
        filterType: immFilterResult.get('dynamicFilterComponentType'),
        itemsSelected: immNewSelectedItems,
        allSelected: immNewSelectedItems.isEmpty(),
        data: immNewFilterOptions,
        valid: true,
      }));
    });

    _immStore = _immStore.set(Key.includedDynamicFilters, immNewFilterStates);
  },

  applyClientFilters(immFilters) {
    _immStore = _immStore.set(Key.clientFilters, immFilters);
  },

  applyStoreState(state){
    _immStore = _immStore.set(Key.storeState, state);
  },

  storeViewSites(state){
    _immStore = _immStore.set(Key.viewSiteState, state);
  },

  updateIncludedFilters(state){
    _immStore = _immStore.set(Key.includedDynamicFilters, state);
  },

  fetchScorecardFilterData(selectedScorecardLevel, currentAccountId) {
    const {fetchScorecardFilterData} = RequestKey;
    const immQueryOptionsWrapper = OversightScorecardStore.getImmQueryOptionsWrapper(currentAccountId);
    const url = `/api/oversight/filter-data/${selectedScorecardLevel.toLowerCase()}`;
    const data = JSON.stringify(immQueryOptionsWrapper.toJS());

    const request = OversightScorecardStore.getOutstandingRequest(fetchScorecardFilterData);
    if (request) {
      request.abort();
    }
    OversightScorecardStore.initializeRequest(fetchScorecardFilterData);
    const newRequest = AppRequest({type: 'POST', url: url, data: data});
    newRequest.then((data) => {
      OversightScorecardStore.setIncludedDynamicFilterResults(data.includedDynamicFilterResults);
      OversightScorecardStore.deleteOutstandingRequest(fetchScorecardFilterData);
      OversightScorecardStore.onAjaxCompletion();
    }, (jqXHR) => {
      if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
        ExposureStore.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.WARNING);
        OversightScorecardStore.deleteOutstandingRequest(fetchScorecardFilterData);
        OversightScorecardStore.onAjaxCompletion();
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
      }
    });
    OversightScorecardStore.startOutstandingRequest(fetchScorecardFilterData, newRequest);
  },

  fetchScorecardMetricIds(currentAccountId) {
    const url = '/api/oversight/metrics/ids';
    const {fetchScorecardMetricIds} = RequestKey;
    const immQueryOptionsWrapper = OversightScorecardStore.getImmQueryOptionsWrapper(currentAccountId);
    const data = JSON.stringify(immQueryOptionsWrapper.toJS());

    OversightScorecardStore.initializeRequest(fetchScorecardMetricIds);
    const newRequest = AppRequest({type: 'POST', url: url, data: data});
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.metricIds, Imm.fromJS(responseData));
        this.updateCombinedMetrics();
        OversightScorecardStore.deleteOutstandingRequest(fetchScorecardMetricIds);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(fetchScorecardMetricIds);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchScorecardMetricIds, newRequest);
  },

  fetchMilestoneLabel(currentAccountId) {
    const url = '/api/oversight/milestonelabel/labels';
    const {fetchMilestoneLabel} = RequestKey;
    const immQueryOptionsWrapper = OversightScorecardStore.getImmQueryOptionsWrapper(currentAccountId);
    const data = JSON.stringify(immQueryOptionsWrapper.toJS());

    OversightScorecardStore.initializeRequest(fetchMilestoneLabel);
    const newRequest = AppRequest({type: 'POST', url: url, data: data});
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.milestoneLabel, Imm.fromJS(responseData));
        OversightScorecardStore.deleteOutstandingRequest(fetchMilestoneLabel);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(fetchMilestoneLabel);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(fetchMilestoneLabel, newRequest);
  },

  startDrillLoading(fileId) {
    _immStore = _immStore.set(Key.loadingFileDrillDownId, fileId);
  },

  finishDrillLoading() {
    _immStore = _immStore.delete(Key.loadingFileDrillDownId);
    OversightScorecardStore.onAjaxCompletion();
  },

  handleDrilldown(immEntity, params, drilldownHelper) {
    const doDrillDown = (immFile) => {
      const fileId = immFile.get('id');
      const url = `/api/files/${fileId}/drilldown-data`;
      OversightScorecardStore.startDrillLoading(fileId);
      AppRequest({type: 'GET', url: url, data: params}).then(
        (data) => {
          if (data.drilldowns.rows.length) {
            const values = Object.values(params).join(', ');
            const fileTitle = immFile.get('title');
            const chartDrilldownKey = `${values}: ${fileTitle}`;
            const schemaId = Util.getComprehendSchemaIdFromFile(immFile);
            OversightScorecardStore.finishDrillLoading(fileId);
            ExposureStore.setFile(fileId, immFile);
            ExposureActions.drilldownUpdateCurrentSelectionCondition(fileId, chartDrilldownKey,
              data.drilldowns.rows.map(row => row.drilldown));
            ExposureActions.drilldownHandleRelatedFile(fileId, undefined, chartDrilldownKey, schemaId,
              drilldownHelper);
          }
        },
        () => {
          OversightScorecardStore.finishDrillLoading(fileId);
          console.log($`%cERROR: GET ${url} failed', 'color: #E053531`);
          GA.sendAjaxException(`GET ${url} failed`);
        }
      );
    };

    if (immEntity.get('id')) {
      doDrillDown(immEntity);
    } else {
      const fileId = immEntity.get('entityId');
      const url = '/api/files/' + fileId;
      OversightScorecardStore.startDrillLoading(fileId);
      AppRequest({type: 'GET', url: url})
        .then((fileWrapper) => doDrillDown(Imm.fromJS(fileWrapper.file)))
        .catch(
          () => {
            OversightScorecardStore.finishDrillLoading(fileId);
            console.log($`%cERROR: GET ${url} failed', 'color: #E053531`);
            GA.sendAjaxException(`GET ${url} failed`);
          }
        );
    }
  },

  createMetricConfiguration(configData) {
    const url = '/api/oversight/metrics';
    const {createMetricConfiguration} = RequestKey;

    OversightScorecardStore.initializeRequest(createMetricConfiguration);
    const newRequest = AppRequest({type: 'POST', url: url, data: JSON.stringify(configData)});
    _immStore = _immStore.delete(Key.createdMetric);
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.createdMetric, Imm.fromJS(responseData));
        const accountMetrics = _immStore.get(Key.metrics, Imm.List());
        _immStore = _immStore.set(Key.metrics, accountMetrics.push(Imm.fromJS(responseData)));
        this.updateCombinedMetrics();
        ExposureActions.createStatusMessage(
          FrontendConstants.UPDATE_OVERSIGHT_SCORECARD_CONFIG_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        OversightScorecardStore.deleteOutstandingRequest(createMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(createMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(createMetricConfiguration, newRequest);
  },

  updateMetricConfiguration(id, configData) {
    const url = `/api/oversight/metrics/${id}`;
    const {updateMetricConfiguration} = RequestKey;

    OversightScorecardStore.initializeRequest(updateMetricConfiguration);
    const newRequest = AppRequest({type: 'PUT', url: url, data: JSON.stringify(configData)});
    _immStore = _immStore.delete(Key.updatedMetric);
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.updatedMetric, Imm.fromJS(responseData));
        const accountMetrics = _immStore.get(Key.metrics, Imm.List());
        _immStore = _immStore.set(Key.metrics,
          accountMetrics
            .delete(accountMetrics.findIndex(metric => metric.get('id') === id))
            .push(Imm.fromJS(responseData))
        );
        this.updateCombinedMetrics();
        ExposureActions.createStatusMessage(
          FrontendConstants.UPDATE_OVERSIGHT_SCORECARD_CONFIG_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        OversightScorecardStore.deleteOutstandingRequest(updateMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(updateMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(updateMetricConfiguration, newRequest);
  },

  deleteMetricConfiguration(id) {
    const url = '/api/oversight/metrics';
    const {deleteMetricConfiguration} = RequestKey;

    OversightScorecardStore.initializeRequest(deleteMetricConfiguration);
    const newRequest = AppRequest({type: 'DELETE', url: url, data: JSON.stringify([id])});
    _immStore = _immStore.delete(Key.deletedMetricIds);
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.deletedMetricIds, Imm.fromJS(responseData));
        const accountMetrics = _immStore.get(Key.metrics, Imm.List());
        _immStore = _immStore.set(Key.metrics,
          accountMetrics.delete(accountMetrics.findIndex(metric => metric.get('id') === id))
        );
        this.updateCombinedMetrics();
        ExposureActions.createStatusMessage(
          FrontendConstants.DELETE_OVERSIGHT_SCORECARD_CONFIG_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        OversightScorecardStore.deleteOutstandingRequest(deleteMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        OversightScorecardStore.deleteOutstandingRequest(deleteMetricConfiguration);
        OversightScorecardStore.onAjaxCompletion();
      }
    );

    OversightScorecardStore.startOutstandingRequest(deleteMetricConfiguration, newRequest);
  },

  startOutstandingRequest(requestName, request) {
    _immStore = _immStore.setIn(['outstandingRequests', requestName], request);
  },

  deleteOutstandingRequest(requestName) {
    _immStore = _immStore.deleteIn(['outstandingRequests', requestName]);
  },

  getOutstandingRequest(requestName) {
    return _immStore.getIn(['outstandingRequests', requestName]);
  },

  initializeRequest(requestName) {
    const request = OversightScorecardStore.getOutstandingRequest(requestName);
    if (!!request) {
      request.abort();
    }

    OversightScorecardStore.deleteOutstandingRequest(requestName);
  },
}, Store);


const _actions = {
  [actions.OVERSIGHT_CACHE_INCLUDED_FILTERS]: action => OversightScorecardStore.updateIncludedFilters(action.data),
  [actions.OVERSIGHT_VIEW_SITES_STATE]: action => OversightScorecardStore.storeViewSites(action.data),
  [actions.OVERSIGHT_STORE_STATE]: action => OversightScorecardStore.applyStoreState(action.data),
  [actions.OVERSIGHT_FETCH_METRICS]: action => OversightScorecardStore.fetchMetrics(),
  [actions.OVERSIGHT_FETCH_METRIC_DEFAULTS]: action => OversightScorecardStore.fetchMetricDefaults(),
  [actions.OVERSIGHT_CREATE_METRIC_CONFIGURATION]: action => OversightScorecardStore.createMetricConfiguration(action.configData),
  [actions.OVERSIGHT_UPDATE_METRIC_CONFIGURATION]: action => OversightScorecardStore.updateMetricConfiguration(action.id, action.configData),
  [actions.OVERSIGHT_DELETE_METRIC_CONFIGURATION]: action => OversightScorecardStore.deleteMetricConfiguration(action.id),
  [actions.OVERSIGHT_FETCH_SCORECARD_DATA]: action =>  OversightScorecardStore.fetchScorecardData(action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_FETCH_SCORECARD_FILTER_DATA]: action =>  OversightScorecardStore.fetchScorecardFilterData(action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_FETCH_METRIC_IDS]: action =>  OversightScorecardStore.fetchScorecardMetricIds(action.currentAccountId),
  [actions.OVERSIGHT_APPLY_DRILL_DOWN_STUDIES]: action =>  OversightScorecardStore.applyDrillDownStudies(action.drillDownStudyIds),
  [actions.OVERSIGHT_HANDLE_DRILLDOWN]: action =>  OversightScorecardStore.handleDrilldown(action.file, action.params, action.drilldownHelper),
  [actions.OVERSIGHT_SET_DROPDOWN_FILTER_SELECTION]: action =>  OversightScorecardStore.setDropdownFilterSelection(action.filterIndex, action.items, action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_RESET_INCLUDED_DYNAMIC_FILTER]: action =>  OversightScorecardStore.resetIncludedDynamicFilter(action.filterIndex, action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_TOGGLE_NULL_FILTER]: action =>  OversightScorecardStore.toggleNullFilter(action.filterIndex, action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_RESET_ALL_FILTERS]: action =>  OversightScorecardStore.resetAllFilters(action.selectedScorecardLevel, action.currentAccountId),
  [actions.OVERSIGHT_FLUSH_ALL_FILTERS]: action =>  OversightScorecardStore.flushAllFilters(action.selectedScorecardLevel, action.currentAccountId, action.studyId),
  [actions.OVERSIGHT_APPLY_CLIENT_FILTERS]: action =>  OversightScorecardStore.applyClientFilters(action.immFilters),
  [actions.OVERSIGHT_FETCH_METRIC_GROUPS]: action => OversightScorecardStore.fetchMetricGroups(action.firstLoad),
  [actions.OVERSIGHT_ADD_METRIC_GROUP]: action => OversightScorecardStore.addMetricGroup(action.name, action.immStudies, action.callback),
  [actions.OVERSIGHT_EDIT_METRIC_GROUP]: action => OversightScorecardStore.editMetricGroup(action.metricGroupId, action.name, action.immAddedStudies, action.immRemovedStudies, action.studyIdToName, action.callback),
  [actions.OVERSIGHT_EDIT_DEFAULT_METRIC_GROUP]: action => OversightScorecardStore.editDefaultMetricGroup(action.metricGroupId, action.name, action.immAddedExcludedStudies, action.immRemovedExcludedStudies, action.studyIdToName, action.callback),
  [actions.OVERSIGHT_SELECT_METRIC_GROUP]: action => OversightScorecardStore.selectMetricGroup(action.metricGroupId),
  [actions.OVERSIGHT_DELETE_METRIC_GROUP]: action => OversightScorecardStore.deleteMetricGroup(action.metricGroupId, action.callback),
  [actions.OVERSIGHT_FETCH_MILESTONELABEL]: action =>  OversightScorecardStore.fetchMilestoneLabel(action.currentAccountId),
};

OversightScorecardStore.dispatcherIndex = AppDispatcher.register((payload) => {
  const {action} = payload;
  const immHomePageStore = OversightScorecardStore.getStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!Imm.is(immHomePageStore, _immStore)) {
    OversightScorecardStore.emitChange();
  }

  return true;
});

export default OversightScorecardStore;
module.exports.GetOutstandingRequest = OversightScorecardStore.getOutstandingRequest;
