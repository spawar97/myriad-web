import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import _ from 'underscore';
import cx from 'classnames';
import Moment from 'moment';
import {Promise} from 'es6-promise';
import FrontendConstants from '../../../constants/FrontendConstants';
import OversightScorecardConstants, {Key as ConstantsKey, SortKeys} from '../../../constants/OversightScorecardConstants';
import {FeatureListConstants, AccessPermissionsConstants} from '../../../constants/PermissionsConstants';
import Util from '../../../util/util';

import FileSaver from 'file-saver';

import ContentPlaceholder from '../../ContentPlaceholder';
import SimpleAction from '../../SimpleAction';
import Menu from '../../../lib/react-menu/components/Menu';
import MenuOption from '../../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../../lib/react-menu/components/MenuTrigger';
import Combobox from '../../Combobox';

import OversightScorecardTabularView from './OversightScorecardTabularView';
import OversightScorecardGridView from './OversightScorecardGridView';
import OversightScorecardFilters from './OversightScorecardFilters';
import OversightScorecardCsvRenderer from './OversightScorecardCsvRenderer';

import OversightScorecardActions from '../../../actions/OversightScorecardActions';
import OversightScorecardStore, { GetOutstandingRequest } from '../../../stores/OversightScorecardStore';
import {Key as OversightStoreKey, RequestKey} from '../../../stores/constants/OversightStoreConstants';
import ExposureStoreKey from '../../../stores/constants/ExposureStoreKeys';
import OversightConsoleUtil from "../../../util/OversightConsoleUtil";
import RouteNameConstants from "../../../constants/RouteNameConstants";
import ExposureActions from "../../../actions/ExposureActions";
import StatusMessageTypeConstants from "../../../constants/StatusMessageTypeConstants";
import MetricSelector from "./MetricSelector";
import AccountUtil from "../../../util/AccountUtil";
import InformationMessage from "../InformationMessage";
import InfiniteScroll from 'react-infinite-scroller';
import PermissionsUtil from "../../../util/PermissionsUtil";

const TouchDiv = require('../../TouchComponents').TouchDiv;
var GA = require('../../../util/GoogleAnalytics');

class OversightScorecard extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    location: PropTypes.object,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    const pathState = this._getPathState(props);
    const activeTabId = this.props.params.activeTabId;
    this.state = {
      activeTabId: activeTabId,
      immOversightScorecardStore: OversightScorecardStore.getStore(),
      isAddingTasks: false,
      isTabularView: false,
      showFilters: false,
      immSelectedMetrics: Imm.List(),
      finishedInitialLoad: false,
      immMetrics: Imm.List(),
      immEnabledMetricNames: Imm.List(),
      ...pathState,
      immMetricsById: Imm.Map(),
      immPresentationData: Imm.OrderedMap(
        {
          entityHeaders: Imm.Map(),
          entityRows: Imm.Map(),
          entityDetails: Imm.Map(),
        }),
      isChangingPath: false,
      newRouteStateFunc: null,
      shownItemsCount: OversightScorecardConstants.NUM_ITEMS_PER_BATCH,
      pageNumber: 0,
      loadPresentationAfterStudyFetch: false
    };

    this.numTotalItems = 0;

    this.ViewStudySites = this._viewStudySites.bind(this);
    this.LoadMoreItems = this._loadMoreItems.bind(this);
    this.GoToPreviousPage = this._goToPreviousPage.bind(this);
    this.ChangeScorecard = this._onChangeScorecard.bind(this);
    this.ChangeGroup = this._onChangeGroup.bind(this);
    this.ChangeColumns = this._changeColumns.bind(this);
    this.ChangeSort = this._onChangeSort.bind(this);

    this.isIE = Util.isIE();
  }

  componentWillReceiveProps(nextProps) {
    if (!OversightConsoleUtil.isValidURL(nextProps.location)) {
      this._showWrongQueryError();
    } else {
      const newPath = nextProps.location.search;
      const oldPath = this.props.location.search;
      if (oldPath !== newPath) {

        const {immScorecardOptions, immGroupOptions, immSortOptions, isTabularView} = this.state;
        let newState = this._getPathState(nextProps, immScorecardOptions, immGroupOptions, immSortOptions, isTabularView);
        newState.isChangingPath = true;
        this.setState(newState);
        if (!Imm.is(newState.drilldownStudyId, this.state.drilldownStudyId)) {
          const drilldownIds = newState.drilldownStudyId && [newState.drilldownStudyId];
          OversightScorecardActions.applyDrillDownStudies(drilldownIds);
        }
        if (!Imm.is(this.state.selectedScorecardLevel, newState.selectedScorecardLevel)) {
             
            let storeStateData = OversightScorecardStore.getStore().toJS().storeState;
         
            if(Object.keys(storeStateData).length && newState.selectedScorecardLevel !== 'SITE'  ){ 
           
                let { immSelectedMetrics, finishedInitialLoad, immMetrics, immEnabledMetricNames,
                  immMetricsById, immPresentationData, selectedScorecardLevel, selectedGroup, 
                  drilldownStudyId, immOversightScorecardStore, 
                  immScorecardOptions, immGroupOptions, immSortOptions } = storeStateData;
                  
                OversightScorecardStore.initializeRequest("fetchScorecardFilterData");
                OversightScorecardStore.initializeRequest("fetchScorecardData");
                OversightScorecardStore.initializeRequest("fetchMilestoneLabel");
  
                let data = immPresentationData.toJS().entityRows && immPresentationData.toJS().entityRows.NONE ? immPresentationData.toJS().entityRows.NONE : null;
                this.numTotalItems = _.size(data)
       
                OversightScorecardStore.updateIncludedFilters(immOversightScorecardStore.get("includedDynamicFilters"));

                this.setState({
                  ...this.state,
                  immSelectedMetrics: immSelectedMetrics,
                  finishedInitialLoad: finishedInitialLoad,
                  immMetrics: immMetrics,
                  immEnabledMetricNames: immEnabledMetricNames,
                  immMetricsById: immMetricsById,
                  immPresentationData: immPresentationData,
                  selectedScorecardLevel: selectedScorecardLevel,
                  selectedGroup: selectedGroup,
                  drilldownStudyId: drilldownStudyId,
                  immScorecardOptions: immScorecardOptions,
                  immGroupOptions: immGroupOptions,
                  immSortOptions: immSortOptions,
                  immOversightScorecardStore:immOversightScorecardStore
                });
             
                let viewSiteStateData = OversightScorecardStore.getStore().toJS().viewSiteState
                let siteCachedData = viewSiteStateData && OversightScorecardStore.getStore().toJS().viewSiteState.siteCachedData;
               
                if(!siteCachedData && this._isReady() ){
                      OversightScorecardActions.storeViewSites({
                        ...viewSiteStateData, 
                        siteCachedData: this.state,
                        numTotalItems:this.numTotalItems,
                        routerState:oldPath
                      })
                }
            } else{
              // filter metrics
              this._onChangeImpl(newState.selectedScorecardLevel);
              const currentAccountId = nextProps.immExposureStore.get(ExposureStoreKey.currentAccountId);
              OversightScorecardActions.flushAllFilters(newState.selectedScorecardLevel, currentAccountId);
          }
        }
      }
      
    }
    const immOldMasterStudies = this._getSelectedMasterStudies(this.props);
    const immNextMasterStudies = this._getSelectedMasterStudies(nextProps);
    if (this.state.finishedInitialLoad && !Imm.is(immOldMasterStudies, immNextMasterStudies)) {
      OversightScorecardActions.applyStoreState({});
      OversightScorecardActions.storeViewSites({});
      this._refreshScoreCardData(nextProps);
    }
  }

  componentDidMount() {

    const fileId = "OVERSIGHT_SCORECARD";
    GA.sendDocumentOpen(fileId, GA.DOCUMENT_TYPE.FILE);

    OversightScorecardStore.addChangeListener(this._onChange);
    let storeStateData = OversightScorecardStore.getStore().toJS().storeState;
    const selectedMasterStudies = this._getSelectedMasterStudies(this.props);
    let { oldMasterStudies } = storeStateData;

    var isStudiesSame = Imm.is(selectedMasterStudies, oldMasterStudies);

    if (!Object.keys(storeStateData).length || !isStudiesSame) {
      OversightScorecardActions.applyStoreState({});
      OversightScorecardActions.storeViewSites({});
      OversightScorecardActions.fetchMetrics();
      OversightScorecardActions.fetchMetricGroups();
      this._refreshScoreCardData(this.props);
      this.setState({
        finishedInitialLoad: true,
      });

    } else {

      let { immSelectedMetrics, finishedInitialLoad, immMetrics, immEnabledMetricNames,
        immMetricsById, immPresentationData, selectedScorecardLevel, selectedGroup, drilldownStudyId, immOversightScorecardStore, immScorecardOptions, immGroupOptions, immSortOptions } = storeStateData;

      OversightScorecardStore.initializeRequest("fetchScorecardFilterData");
      OversightScorecardStore.initializeRequest("fetchScorecardData");
      OversightScorecardStore.initializeRequest("fetchMilestoneLabel");

      let data = immPresentationData.toJS().entityRows && immPresentationData.toJS().entityRows.NONE ? immPresentationData.toJS().entityRows.NONE : null;
      this.numTotalItems = _.size(data)
      OversightScorecardStore.updateIncludedFilters(immOversightScorecardStore.get("includedDynamicFilters"));

      this.setState({
        ...this.state,
        immSelectedMetrics: immSelectedMetrics,
        finishedInitialLoad: finishedInitialLoad,
        immMetrics: immMetrics,
        immEnabledMetricNames: immEnabledMetricNames,
        immMetricsById: immMetricsById,
        immPresentationData: immPresentationData,
        selectedScorecardLevel: selectedScorecardLevel,
        selectedGroup: selectedGroup,
        drilldownStudyId: drilldownStudyId,
        immScorecardOptions: immScorecardOptions,
        immGroupOptions: immGroupOptions,
        immSortOptions: immSortOptions,
        immOversightScorecardStore: immOversightScorecardStore
      });
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const { isChangingPath, newRouteStateFunc, loadPresentationAfterStudyFetch,
      selectedScorecardLevel, selectedGroup, immMetricsById, drilldownStudyId,
      immOversightScorecardStore, immEnabledMetricNames, selectedSort, immMetrics } = this.state;
    const { immExposureStore: immNewExposureStore } = this.props;
    const { immExposureStore: immOldExposureStore } = prevProps;
    const immNewStudies = immNewExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const immOldStudies = immOldExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const immResults = immOversightScorecardStore.get(OversightStoreKey.results);

    const getPresentationData = () => {
      return this._preparePresentationData(immResults,
        selectedScorecardLevel, selectedGroup, immMetricsById, drilldownStudyId,
        immEnabledMetricNames, selectedSort, immMetrics);
    };

    if (newRouteStateFunc && _.isFunction(newRouteStateFunc)) {
      newRouteStateFunc();
      this.setState({
        newRouteStateFunc: null,
        shownItemsCount: OversightScorecardConstants.NUM_ITEMS_PER_BATCH,
        pageNumber: 0,
      });
    }

    // If anything in the URL has changed, re-render the presentation data
    if (isChangingPath) {
      this.setState({
        immPresentationData: getPresentationData(),
        isChangingPath: false,
      });
    }
    // Otherwise, if we just finished a studies API load, and have a presentation data request queued, execute it
    // Keeping as an else if to avoid any edge case of double-calculating presentation data for no reason
    // if both of these request conditions are met
    else if (!Imm.is(immNewStudies, immOldStudies) && loadPresentationAfterStudyFetch) {
      OversightScorecardActions.applyStoreState({});
      OversightScorecardActions.storeViewSites({});
      this.setState({
        immPresentationData: getPresentationData(),
        loadPresentationAfterStudyFetch: false,
      });
    }
  }

  componentWillUnmount() {
    OversightScorecardStore.removeChangeListener(this._onChange);

    if (this.state.selectedScorecardLevel !== 'SITE') {
      const oldMasterStudies = this._getSelectedMasterStudies(this.props);
      let cacheData = this.state;
      cacheData.oldMasterStudies = oldMasterStudies;
      OversightScorecardActions.applyStoreState(cacheData);
    } else {

      let viewSiteStoreState = OversightScorecardStore.getStore().toJS().viewSiteState;

      OversightScorecardActions.storeViewSites({
        ...viewSiteStoreState,
        siteCachedData: this.state,
        numTotalItems: this.numTotalItems,
        routerState: this.props.location.search
      })

    }

  }

  _getPathState(props) {
    const immScorecardOptions = this._formatOptions(OversightScorecardConstants.SCORECARD_OPTIONS);
    const immSortOptions = this._formatOptions(OversightScorecardConstants.SORT_OPTIONS);
    let selectedScorecardLevel, selectedGroup, drilldownStudyId, immGroupOptions, selectedSort, isTabularView;
    if (!_.isEmpty(props.query)) {
      selectedScorecardLevel = props.query.level;
      immGroupOptions = this._formatOptions(OversightScorecardConstants.GROUP_OPTIONS[selectedScorecardLevel]);
      selectedGroup = props.query.groupBy;
      drilldownStudyId = props.query.studyId;
      selectedSort = props.query.sortBy || immSortOptions.getIn([0, 'value']);
      isTabularView = props.query.isTabularView === 'true';
    } else {
      selectedScorecardLevel = immScorecardOptions.getIn([0, 'value']);
      immGroupOptions = this._formatOptions(OversightScorecardConstants.GROUP_OPTIONS[selectedScorecardLevel]);
      selectedGroup = immGroupOptions.getIn([0, 'value']);
      drilldownStudyId = null;
      selectedSort = immSortOptions.getIn([0, 'value']);
      isTabularView = false;
    }
    return {
      immScorecardOptions,
      immGroupOptions,
      immSortOptions,
      selectedScorecardLevel,
      selectedGroup,
      selectedSort,
      drilldownStudyId,
      isTabularView,
    };
  }

  _onChangeImpl(selectedScorecardLevel) {
    const { immExposureStore } = this.props;
    const { immOversightScorecardStore, selectedSort, selectedGroup, drilldownStudyId } = this.state;
    const immStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const newImmOversightScorecardStore = OversightScorecardStore.getStore();
    let state = {
      immOversightScorecardStore: newImmOversightScorecardStore,
    };

    const newImmMetrics = newImmOversightScorecardStore.get(OversightStoreKey.metrics, Imm.Map());
    const newImmResults = newImmOversightScorecardStore.get(OversightStoreKey.results, Imm.Map());

    // If we have metrics in the new state, filter them to see if they are identical post-filtering
    // If metrics have changed, we need to update the immMetricsById map
    let {immMetrics: oldImmMetrics, immMetricsById, immEnabledMetricNames: oldImmEnabledMetricNames} = this.state;
    let immMetrics = oldImmMetrics;
    let immEnabledMetricNames = oldImmEnabledMetricNames;
    //check if all metrics were enabled for the selectedScorecardLevel
    let allMetricsEnabled = oldImmEnabledMetricNames.size === oldImmMetrics.size

    if (newImmMetrics.size > 0) {
      const immUpdatedMetrics = this._filterMetrics(newImmMetrics, selectedScorecardLevel);

      if (!Imm.is(immMetrics, immUpdatedMetrics)) {
        immMetrics = immUpdatedMetrics;
        // Group metrics by identifier. As there can be multiple configurations for the same identifier,
        // the map we are constructing is of the format:
        // {
        //    metricId -> {
        //      metricGroupId -> MetricConfiguration
        //    }
        // }
        immMetricsById = immUpdatedMetrics.groupBy(metric => metric.get('metricId'))
          .map(immMetricList => immMetricList.groupBy(immMetric => immMetric.get('metricGroupId'))
            .map(immGroupedMetricList => immGroupedMetricList.get(0)));

        immEnabledMetricNames = this._getMetricsNames(immUpdatedMetrics).filter((metricName) => {
            //filter only selected metrics, or all metrics if the previous scorecard level had all enabled, or add all
            // metrics to selected on first initialize
            return (allMetricsEnabled || oldImmEnabledMetricNames.includes(metricName) || !oldImmMetrics.size);
          });

        // Construct the list of enabled metric IDs. As an ID can have multiple configurations,
        // we are controlling enabling/disabling metric by ID, not name
        // immEnabledMetricIds = immMetricsById.keySeq()
        //   .filter(metricId => oldImmEnabledMetricIds.includes(metricId) || !immMetrics.size)
        //   .toList();


        // set new updated metric configs in state
        state.immMetricsById = immMetricsById;
        state.immEnabledMetricNames = immEnabledMetricNames;
        state.immMetrics = immUpdatedMetrics;
      }
    }

    const fetchScorecardDataRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.fetchScorecardData], null
    );
    const newFetchScorecardDataRequest = GetOutstandingRequest(RequestKey.fetchScorecardData);
    const fetchMetricsRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.fetchMetrics], null
    );
    const newFetchMetricsRequest = GetOutstandingRequest(RequestKey.fetchMetrics);
    if (((fetchMetricsRequest && !newFetchMetricsRequest) ||
      (fetchScorecardDataRequest && !newFetchScorecardDataRequest))
      && (newImmMetrics.size > 0 && newImmResults.size > 0)
    ) {
      if (immStudies.size > 0) {
        state.immPresentationData = this._preparePresentationData(newImmResults,
          selectedScorecardLevel, selectedGroup, immMetricsById, drilldownStudyId,
          immEnabledMetricNames, selectedSort, immMetrics);
      }
      else {
        state.loadPresentationAfterStudyFetch = true;
      }
    }

    this.setState(state);
  }

  _onChange = () => {
    const {selectedScorecardLevel} = this.state;
    this._onChangeImpl(selectedScorecardLevel);
  };

  _getSelectedMasterStudies(props) {
    const cookies = props.cookies;
    const currentAccountId = props.immExposureStore.get(ExposureStoreKey.currentAccountId);
    const immSelectedStudies = Imm.fromJS(
      Util.getSessionFilterStudyNames(cookies, currentAccountId)
    );
    return immSelectedStudies;
  }

  _refreshScoreCardData(props) {
    const {selectedScorecardLevel} = this.state;
    const currentAccountId = props.immExposureStore.get(ExposureStoreKey.currentAccountId);
    OversightScorecardActions.fetchScorecardFilterData(selectedScorecardLevel, currentAccountId);
    OversightScorecardActions.fetchScorecardData(selectedScorecardLevel, currentAccountId);
    OversightScorecardActions.fetchMilestoneLabel(currentAccountId);
  }

  _showWrongQueryError() {
    ExposureActions.createStatusMessage(FrontendConstants.ERROR_URL_QUERY, StatusMessageTypeConstants.TOAST_ERROR);
    this.context.router.push(RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD);
  }

  _setOversightStateRoute(studyId, level, groupBy, sortBy, isTabularView, doReplace) {

    let storeStateData = OversightScorecardStore.getStore().toJS().storeState;

    if (this.state.selectedScorecardLevel == 'STUDY' && Object.keys(storeStateData).length) {
      let { immOversightScorecardStore } = storeStateData;
      this.setState({
        ...this.state,
        immOversightScorecardStore: immOversightScorecardStore
      })
    }

    //if we're coming from the homepage then there certainly should be activeTabId
    let activeTabId = this.state.activeTabId;

    const routerUpdateFunction = doReplace
      ? this.context.router.replace
      : this.context.router.push;
    const name = activeTabId
        ? RouteNameConstants.EXPOSURE_HOME_WITH_TAB
        : RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD;

    let queryObject = {
      level,
      groupBy,
      sortBy,
      isTabularView,
    };

    if (studyId) {
      queryObject.studyId = studyId;
    }
    if (activeTabId) {
      queryObject.activeTabId = activeTabId;
    }

    this.setState({
      newRouteStateFunc: routerUpdateFunction.bind(this, {
        name: name,
        params: queryObject,
        query: queryObject,
      }),
    });
  }

  clearDrillDownStudies() {
    const {selectedScorecardLevel, selectedGroup, selectedSort, isTabularView} = this.state;
    this._setOversightStateRoute(null, selectedScorecardLevel, selectedGroup, selectedSort, isTabularView);
  }

  _viewStudySites(studyId) {
    //store study cache data on view site
    const oldMasterStudies = this._getSelectedMasterStudies(this.props);
    let cacheData = this.state;
    cacheData.oldMasterStudies = oldMasterStudies;
    OversightScorecardActions.applyStoreState(cacheData);

    //view site drill check if cache is present then show cached data for view sites
    let viewSiteStoreState = OversightScorecardStore.getStore().toJS().viewSiteState;

    if (viewSiteStoreState &&
      (viewSiteStoreState.prevStudyId === studyId) &&
      viewSiteStoreState.siteCachedData &&
      Object.keys(viewSiteStoreState.siteCachedData).length
    ) {
      window.history.replaceState(null, null, `${viewSiteStoreState.routerState}`)
      this.props.location.search = `${viewSiteStoreState.routerState}`

      let { immPresentationData, drilldownStudyId, finishedInitialLoad, immEnabledMetricNames,
        immGroupOptions, immMetrics, immMetricsById, immScorecardOptions, immSelectedMetrics,
        immSortOptions, isAddingTasks, isTabularView, loadPresentationAfterStudyFetch,
        selectedGroup, selectedScorecardLevel, selectedSort, immOversightScorecardStore
      } = viewSiteStoreState.siteCachedData;

      this.numTotalItems = viewSiteStoreState.numTotalItems;
      OversightScorecardStore.updateIncludedFilters(immOversightScorecardStore.get("includedDynamicFilters"))
      this.setState({
        ...this.state,
        immPresentationData: immPresentationData,
        drilldownStudyId: drilldownStudyId,
        finishedInitialLoad: finishedInitialLoad,
        immEnabledMetricNames: immEnabledMetricNames,
        immGroupOptions: immGroupOptions,
        immMetrics: immMetrics,
        immMetricsById: immMetricsById,
        immScorecardOptions: immScorecardOptions,
        immSelectedMetrics: immSelectedMetrics,
        immSortOptions: immSortOptions,
        isAddingTasks: isAddingTasks,
        isTabularView: isTabularView,
        loadPresentationAfterStudyFetch: loadPresentationAfterStudyFetch,
        selectedGroup: selectedGroup,
        selectedScorecardLevel: selectedScorecardLevel,
        selectedSort: selectedSort,
        immOversightScorecardStore:OversightScorecardStore.getStore()
      })

    } else {
      OversightScorecardActions.storeViewSites({ prevStudyId: studyId, site: ConstantsKey.SITE });
      const { selectedSort, isTabularView } = this.state;
      this._setOversightStateRoute(studyId, ConstantsKey.SITE, ConstantsKey.STUDY, selectedSort, isTabularView);
    }

  }

  _filterMetricsMap(immMetricsById, immEnabledMetricNames) {
    return immMetricsById.map(immMetricsList => immMetricsList.filter(immMetric => {
      return immEnabledMetricNames.includes(immMetric.getIn(['displayAttributes', 'title']));
    })).filter(immMetricsList => immMetricsList.size > 0);
  }

  /*
  Filter metrics for the specific scorecard level
   */
  _filterMetrics(immMetrics, selectedScorecardLevel) {
    const {immSelectedMetrics} = this.state;
    let immNewMetrics = Imm.List();

    function _isMetricEnabled(immMetric) {
      const metricStatus = immMetric.get('metricStatus');
      return metricStatus.toUpperCase() === ConstantsKey.ENABLED;
    }

    function _isScorecardSelected(immMetric) {
      const metricScorecards = immMetric.get('entities').toUpperCase();
      return (metricScorecards === ConstantsKey.SITE_AND_STUDY
        || selectedScorecardLevel === metricScorecards);
    }

    function _isMetricSelected(immMetric) {
      const metricId = immMetric.get('metricId');
      // Filter based on selected metrics
      if (immSelectedMetrics && immSelectedMetrics.size > 0) {
        return immSelectedMetrics.find(metric => {
          return metric.get('metricId') === metricId;
        });
      }
      else {
        return true;
      }
    }

    // Filter metrics
    immMetrics.forEach(immMetric => {
      const isEnabled = _isMetricEnabled(immMetric);
      const isScorecardSelected = _isScorecardSelected(immMetric);
      const isMetricSelected = _isMetricSelected(immMetric);

      if (isEnabled && isScorecardSelected && isMetricSelected) {
        immNewMetrics = immNewMetrics.push(immMetric);
      }
    });

    return immNewMetrics;
  }

  _formatOptions = (options) => {
    const optionsArray = _.map(options, (option, key) => {
      return Imm.Map({label: option, value: key});
    });
    return Imm.List(optionsArray);
  };

  toggleFilterPane() {
    const showFilters = !this.state.showFilters;
    this.setState({showFilters});
  }

  _preparePresentationData(immResults, selectedScorecardLevel, selectedGroup, immMetricsById,
                                   drilldownStudyId, immEnabledMetricNames, selectedSort, immMetrics) {
    //set ie to the first page and set shown items to items in a batch
    this.setState({pageNumber:0, shownItemsCount:OversightScorecardConstants.NUM_ITEMS_PER_BATCH});

    const {immExposureStore} = this.props;
    const {immOversightScorecardStore} = this.state;
    const filteredData = this._filterData(immResults, drilldownStudyId);
    const formattedResults = this._formatSiteAndStudyDetails(filteredData);
    const groupedData = this._groupData(formattedResults, selectedScorecardLevel, selectedGroup);
    const immFilteredMetricsById = this._filterMetricsMap(immMetricsById, immEnabledMetricNames);
    const immMetricsByConfigId = immMetrics.groupBy(immMetric => immMetric.get('id')).map(x => x.get(0));

    const immMetricGroups = immOversightScorecardStore.get(OversightStoreKey.metricGroups, Imm.Map());
    const immStudyToMetricGroupMap = OversightConsoleUtil.getStudyToMetricGroupMapFromStore(immExposureStore, immOversightScorecardStore);

    const allEntityDetails = Imm.Map()
      .set(ConstantsKey.SITE, formattedResults.get('siteDetails'))
      .set(ConstantsKey.STUDY, formattedResults.get('studyDetails'));

    // extend groupedData with calculation details for rendering
    const immDefaultMetricGroup = OversightConsoleUtil.getDefaultMetricGroup(immMetricGroups);
    const defaultMetricGroupId = immDefaultMetricGroup.get('id');
    const immExcludedStudies = immDefaultMetricGroup.get('excludedStudyIds', Imm.List());

    // entity metrics section
    // entityHeaders is a map of the format:
    // {
    //    (title+suffix) -> List(metricConfig)
    // }
    // Entity headers are sorted according to the metric sequence, specified in the configuration
    const entityHeaders = OversightConsoleUtil.getEntityHeaders(selectedScorecardLevel, immFilteredMetricsById);
    let immMetricIds = Imm.OrderedSet();
    Imm.fromJS(entityHeaders.metricHeaders).forEach(immMetricHeaderInfo => {
      immMetricHeaderInfo.get('configs', Imm.Map()).forEach(immMetricConfig => {
        immMetricIds = immMetricIds.add(immMetricConfig.get('metricId'));
      });
    });

    // Get the metric keys, which are the ordered sequence of metric columns to display
    const immMetricHeaderKeys = entityHeaders.metricHeaders.keySeq().toList();

    let entityRows = {};
    groupedData.forEach((immGroup, groupId) => {
      let groupRows = {};
      immGroup.forEach((immEntityScores, uniqueEntityId) => {
        const entityId = OversightConsoleUtil.getEntityIdFromUniqueId(selectedScorecardLevel, uniqueEntityId);
        const studyId = OversightConsoleUtil.getStudyIdFromUniqueId(uniqueEntityId);
        const metricGroupId = immStudyToMetricGroupMap.get(studyId);

        const isEntityExcludedFromDefault = immExcludedStudies.includes(studyId);

        // entity info section
        const entityDetails = OversightConsoleUtil.getEntityDetails(entityId, selectedScorecardLevel, formattedResults);
        const entityName = OversightConsoleUtil.getEntityName(selectedScorecardLevel, entityDetails);
        let entityStatus = '', entityPIName = '', entityPIEmail = '', entityFPFV = ''; 
        if(selectedScorecardLevel == 'SITE' && entityDetails){
          entityStatus = entityDetails.get('sitestatus');
          entityPIName = entityDetails.get('siteinvestigatorname');
          entityPIEmail =  entityDetails.get('siteinvestigatoremail');
          entityFPFV = entityDetails.get('site_fpfv');
        }
      
        // additional entity info section
        const additionalInfo = OversightConsoleUtil.getEntityAdditionalInfo(selectedScorecardLevel, immEntityScores, formattedResults);

        const allEntityScores = immMetricIds.map(metricId => {
          const immMetricConfigsForId = immFilteredMetricsById.get(metricId);
          // Get the metric configuration associated with the metric group for the entity's study ID,
          // if it exists. Otherwise, fall back to the configuration on the default metric group,
          // unless the entity is excluded from the default group
          const immMetricConfig = immMetricConfigsForId.get(metricGroupId)
            || (!isEntityExcludedFromDefault && immMetricConfigsForId.get(defaultMetricGroupId));
          if (!immMetricConfig) {
            return null;
          }

          // Filter to only retrieve the entity scores for the current metric being calculated
          const immMetricScores = immEntityScores.filter(immScore => immScore.get('metricid') === metricId);
          const drillDownParams = OversightConsoleUtil.getMetricDrillDownParams(selectedScorecardLevel,
            selectedGroup, immMetricScores, allEntityDetails);
          let entityMetricModel;
          if (immMetricScores != null && !immMetricScores.isEmpty()) {
            entityMetricModel = OversightConsoleUtil.getMetricAggregateScore(immMetricScores,
              immMetricConfig, drillDownParams, selectedScorecardLevel);
          } else {
            entityMetricModel = OversightConsoleUtil.getUndefinedMetricScore(immMetricConfig, drillDownParams);
          }
          return entityMetricModel;
        }).filter(immEntityScore => !!immEntityScore).toJS();

        const scoreDataGroupedByColumnKey = _.chain(allEntityScores)
          .groupBy(x => x.key)
          .mapObject(x => x[0])
          .value();
        const allEntityScoresByColumnKey = immMetricHeaderKeys.map(key => scoreDataGroupedByColumnKey[key]).toJS();

        // overall score section
        const entityDefinedScores = _.chain(allEntityScores)
          .filter(s => s && s.scoreData)
          .map(s => s.scoreData)
          .value();
        const entityOverallScore = OversightConsoleUtil.getEntityOverallScore(
          Imm.fromJS(entityDefinedScores), immFilteredMetricsById,
            selectedScorecardLevel, studyId, immStudyToMetricGroupMap, defaultMetricGroupId,
            immMetricsByConfigId, isEntityExcludedFromDefault
        );

        groupRows[uniqueEntityId] = {
          entityId,
          uniqueId: uniqueEntityId,
          entityName,
          entityStatus,
          entityPIName, 
          entityPIEmail,
          entityFPFV, 
          additionalInfo,
          overallScore: entityOverallScore,
          metrics: allEntityScoresByColumnKey,
        };
      });
      entityRows[groupId] = groupRows;
    });

    let immEntityRows = Imm.fromJS(entityRows);
    immEntityRows = selectedGroup === ConstantsKey.NONE
      ? Imm.OrderedMap({ NONE: immEntityRows.flatMap(x => x)})
      : immEntityRows;
    const immFilteredRows = this._clientFilter(immEntityRows);
    const immSortedEntityRows = this._sortEntityRows(immFilteredRows, selectedSort, selectedGroup);
    this.numTotalItems = immFilteredRows.reduce((sum, map) => sum + map.size, 0);

    return Imm.OrderedMap({
      entityHeaders: Imm.fromJS(entityHeaders),
      entityRows: immSortedEntityRows,
      entityDetails: allEntityDetails,
    });
  }

  _clientFilter(immEntityRows) {
    const {immOversightScorecardStore} = this.state;
    const immEntityScoreFilter = immOversightScorecardStore.getIn(
      [OversightStoreKey.clientFilters, 'entityScore'], Imm.Map()
    );
    const immLabelFilter = immOversightScorecardStore.getIn(
      [OversightStoreKey.clientFilters, 'label'], Imm.Map()
    );
    const immSelectedLabels = immLabelFilter.get('selectedItems', Imm.List());
    return immEntityRows
      .map(groupedEntities => {
        return groupedEntities.filter(entity => {
          const scoreValue = entity.getIn(['overallScore','value']);
          if (isNaN(scoreValue)) {
            if (!immEntityScoreFilter.get('nullExcluded') && !immLabelFilter.get('nullExcluded')) {
              return true;
            }
          } else {
            let isShow = false;
            const topValue = immEntityScoreFilter.get('to', null);
            const lowValue = immEntityScoreFilter.get('from', null);

            const scoreColor = entity.getIn(['overallScore','color']);
            let scoreLabel = null;
            switch (scoreColor) {
              case OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD: {
                scoreLabel =
                  OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.BAD.toLowerCase();
                break;
              }
              case OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM: {
                scoreLabel =
                  OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.MEDIUM.toLowerCase();
                break;
              }
              case OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD: {
                scoreLabel =
                  OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.GOOD.toLowerCase();
                break;
              }
            }
            const showLabel = !immSelectedLabels.size
              || !!immSelectedLabels.find(item => item.value === scoreLabel);

            if ((scoreValue >= lowValue || lowValue == null)
              && (scoreValue <= topValue || topValue == null)
              && showLabel) {
              isShow = true;
            }
            return isShow;
          }
          return false;
        });
      })
      .filter(groupedEntities => groupedEntities && groupedEntities.size > 0)
      .toOrderedMap();
  }

  _sortEntityRows(immEntityRows, selectedSort, selectedGroup) {
    return immEntityRows.map(immGroupedData => {
      const sortedByNanScore = immGroupedData.sort((immEntityData) => {
        const entityScore = immEntityData.getIn(['overallScore', 'value']);

        switch(selectedSort) {
          case 'SCORE_ASCENDING': {
            return isNaN(entityScore) ? -1 : 1;
          }
          case 'SCORE_DESCENDING': {
            return isNaN(entityScore) ? 1 : -1;
          }
        }
      });

      return sortedByNanScore.sort((immEntityData, immNextEntityData) => {
        const entityName = immEntityData.get('entityName');
        const nextEntityName = immNextEntityData.get('entityName');
        const entityScore = immEntityData.getIn(['overallScore', 'value']);
        const nextEntityScore = immNextEntityData.getIn(['overallScore', 'value']);
        const areScoresEmptyOrTheSame = (isNaN(entityScore) && isNaN(nextEntityScore))
          || (entityScore === nextEntityScore);

        switch(selectedSort) {
          case SortKeys.NAME_ASCENDING:
            return entityName && entityName.localeCompare(nextEntityName);
          case SortKeys.NAME_DESCENDING:
            return entityName && -entityName.localeCompare(nextEntityName);
          case SortKeys.SCORE_ASCENDING:
            if (areScoresEmptyOrTheSame) {
              return entityName && entityName.localeCompare(nextEntityName);
            }
            return entityScore - nextEntityScore;
          case SortKeys.SCORE_DESCENDING:
              if (areScoresEmptyOrTheSame) {
                return entityName && entityName.localeCompare(nextEntityName);
              }
            return nextEntityScore - entityScore;
        }
      });
    }).toOrderedMap().sortBy((x, key) => key.toLowerCase());
  }

  _formatSiteAndStudyDetails(immResults) {
    // format siteDetails
    const siteDetails = immResults.get('siteDetails', Imm.Map());
    const siteDateFields = ['site_fpfv','siteactivationdate', 'sitedeactivationdate'];
    const siteDetailsNew = this._preformatDetails(siteDetails, siteDateFields);

    // format studyDetails
    const studyDetails = immResults.get('studyDetails', Imm.Map());
    const studyDateFields = ['studystartdate', 'studycurrentmilestoneplanneddate',
      'studycurrentmilestoneprojecteddate', 'studyplannedenddate'];
    const studyDetailsNew = this._preformatDetails(studyDetails, studyDateFields);

    return Imm.Map([
      [ 'oversightMetrics', immResults.get('oversightMetrics') ],
      [ 'siteDetails', siteDetailsNew ],
      [ 'studyDetails', studyDetailsNew ],
    ]);
  }

  _preformatDetails(specificDetails, dateFields) {
    const result = specificDetails.map((details) => {
      let newDetails = details.map((value, key) => {
        let result = value;
        if (dateFields.includes(key)) {
          if (isNaN(value)) {
            result = "";
          } else {
            result = Util.dateFormatterUTC(value);
          }
        }
        // convert all NULLs to empty values
        if (result === "NULL") {
          result = "";
        }
        return result;
      });
      return newDetails;
    });
    return result;
  }

  _filterData(immResults, drilldownStudyId) {
    let immFilteredResults = immResults;

    if (!!drilldownStudyId) {
      const oversightMetrics = immResults.get('oversightMetrics')
        .filter(x => x.get('studyid') === drilldownStudyId);

      immFilteredResults = immFilteredResults.set('oversightMetrics', oversightMetrics);

    }

    return immFilteredResults;
  }

  _groupData(immResults, selectedScorecardLevel, selectedGroup) {
    const immOversightMetrics = immResults.get(OversightStoreKey.oversightMetrics, Imm.Map());
    const immStudyDetails = immResults.get(OversightStoreKey.studyDetails, Imm.Map());
    const immSiteDetails = immResults.get(OversightStoreKey.siteDetails, Imm.Map());
    const groupColumn = OversightConsoleUtil.getGroupByColumn(selectedGroup, selectedScorecardLevel);
    let groupedData;

    switch (selectedScorecardLevel) {
      case ConstantsKey.STUDY:
        switch (selectedGroup) {
          case ConstantsKey.NONE:
            groupedData = immOversightMetrics.groupBy(x => x.get('studyid'));
            break;
          case ConstantsKey.SITE:
            groupedData = immOversightMetrics.groupBy(x => x.get('siteid'));
            break;
          default:
            groupedData = immOversightMetrics.groupBy(x => immStudyDetails.getIn([
              x.get('studyid'), groupColumn,
            ]));
        }
        break;

      case ConstantsKey.SITE:
        // Do not include rows where siteid is null, those are study only metrics
        const intermediateData = immOversightMetrics.filter(x => x.get('siteid') !== 'NULL');
        switch (selectedGroup) {
          case ConstantsKey.NONE:
            groupedData = intermediateData.groupBy(x => x.get('siteid'));
            break;
          case ConstantsKey.STUDY:
            groupedData = intermediateData.groupBy(x => x.get('studyname'));
            break;
          default:
            groupedData = intermediateData.groupBy(x => immSiteDetails.getIn([
              x.get('siteid'), groupColumn,
            ]));
        }
    }

    groupedData = groupedData
      .map(x => {
        return x.groupBy(y => OversightConsoleUtil.getUniqueEntityId(selectedScorecardLevel, y));
      });

    return groupedData;
  }

  _getPartialRows() {
    const {immPresentationData, shownItemsCount, pageNumber, isTabularView} = this.state;
    const usePagination = this.isIE && !isTabularView;

    let rowNumber = 0;
    return immPresentationData
      .get('entityRows')
      .map(groupedEntities => {
        if (rowNumber >= shownItemsCount) return null;
        return groupedEntities.filter(entity => {
          if (rowNumber >= shownItemsCount) return false;

          let shouldInclude = true;

          // If we are using pagination, artificially create a page of results
          if (usePagination) {
            const rowPageNumber = Math.floor(rowNumber / OversightScorecardConstants.NUM_ITEMS_PER_BATCH);
            shouldInclude = rowPageNumber === pageNumber;
          }

          rowNumber++;
          return shouldInclude;
        });
      })
      .filter(groupedEntities => groupedEntities && groupedEntities.size > 0)
      .toOrderedMap();
  }

  _getContent() {
    const {isTabularView, immOversightScorecardStore, selectedScorecardLevel, selectedGroup,
      immPresentationData, immMetricsById, shownItemsCount} = this.state;
    const {immExposureStore} = this.props;
    const {numTotalItems} = this;
    const scorecardData = immOversightScorecardStore.get(OversightStoreKey.results);
    const displayMetrics = scorecardData;
    const immMetrics = immOversightScorecardStore.get(OversightStoreKey.metrics);
    const immMetricGroups = immOversightScorecardStore.get(OversightStoreKey.metricGroups);
    const defaultMetricGroupId = OversightConsoleUtil.getDefaultMetricGroupId(immMetricGroups);
    const immStudyToMetricGroupMap = OversightConsoleUtil.getStudyToMetricGroupMapFromStore(immExposureStore, immOversightScorecardStore);
    const immMilestoneLabel = immOversightScorecardStore.get(OversightStoreKey.milestoneLabel);
    const immPartialEntityRows = this._getPartialRows();

    const props = _.extend({}, this.props, {
      immOversightScorecardStore,
      immMetrics,
      scorecardData,
      selectedScorecardLevel,
      selectedGroup,
      displayMetrics,
      immPresentationData: immPresentationData.set('entityRows', immPartialEntityRows),
      immMetricsById,
      drilldownHandler: this.ViewStudySites,
      immMilestoneLabel,
      isTabularView
    });

    let renderContent;
    if (isTabularView) {
      renderContent = (
        <div className='oversight-scorecard-display-component'>
          <OversightScorecardTabularView
            {...props}
            loadMoreItems={this.LoadMoreItems}
            shownItemsCount={shownItemsCount}
            numTotalItems={numTotalItems}
            immStudyToMetricGroupMap={immStudyToMetricGroupMap}
            defaultMetricGroupId={defaultMetricGroupId}
          />
        </div>
      );
    }
    else {
      const hasMore = shownItemsCount < numTotalItems;
      const {pageNumber} = this.state;

      renderContent = (
        <InfiniteScroll
          dataLength={shownItemsCount}
          pageStart={0}
          loadMore={this.LoadMoreItems}
          hasMore={this.isIE ? false : hasMore}
          loader={<ContentPlaceholder containerClassName='infinite-scroll' />}
          threshold={1000}
        >
          <div className='oversight-scorecard-display-component'>
            <OversightScorecardGridView {...props}
              loadMore={this.LoadMoreItems}
              isIE={this.isIE}
              hasMore={shownItemsCount < numTotalItems}
              pageNumber={pageNumber}
              goToPreviousPage={this.GoToPreviousPage}
            />
          </div>
        </InfiniteScroll>
      );
    }

    return renderContent;
  }

  _getUpdatedShownItemCount() {
    const {shownItemsCount} = this.state;

    return shownItemsCount + OversightScorecardConstants.NUM_ITEMS_PER_BATCH;
  }

  _loadMoreItems() {
    const {pageNumber} = this.state;

    const shownItemsCount = this._getUpdatedShownItemCount();
    this.setState({
      shownItemsCount,
      pageNumber: pageNumber + 1,
    });
  }

  _goToPreviousPage() {
    const {pageNumber, shownItemsCount: oldItemsCount} = this.state;

    const shownItemsCount = oldItemsCount - OversightScorecardConstants.NUM_ITEMS_PER_BATCH;
    this.setState({
      pageNumber: pageNumber - 1,
      shownItemsCount,
    });
  }

  _onChangeScorecard(newScorecardLevel) {
    const {selectedScorecardLevel} = this.state;

    if (selectedScorecardLevel === newScorecardLevel) {
      return;
    }

    this._changeScorecard(newScorecardLevel);
  }

  _changeScorecard(newScorecardLevel, newDrilldownStudyId, selectedGroup) {
    const {drilldownStudyId, selectedSort, isTabularView} = this.state;

    const immNewGroupOptions = this._getGroupOptions(newScorecardLevel);
    const newSelectedGroup = selectedGroup ? selectedGroup : immNewGroupOptions.first().get('value');
    const drilldown = drilldownStudyId ? newDrilldownStudyId : drilldownStudyId;

    //store study cache data when scorecardlevel change to site
    if (newScorecardLevel !== 'STUDY') {
      //store study cache data on view site
      const oldMasterStudies = this._getSelectedMasterStudies(this.props);
      let cacheData = this.state;
      cacheData.oldMasterStudies = oldMasterStudies;
      OversightScorecardActions.applyStoreState(cacheData);
    }
    else if (newScorecardLevel !== 'SITE' && drilldownStudyId) {
      //store view site cache data when scorecardlevel change to study
      let viewSiteStoreState = OversightScorecardStore.getStore().toJS().viewSiteState;
      OversightScorecardActions.storeViewSites({
        ...viewSiteStoreState,
        siteCachedData: this.state,
        numTotalItems: this.numTotalItems,
        routerState: this.props.location.search
      });
    }

    this._setOversightStateRoute(drilldown, newScorecardLevel, newSelectedGroup, selectedSort, isTabularView);
  }

  _onChangeGroup(group) {
    const {selectedGroup, selectedSort, isTabularView} = this.state;
    const newSelectedGroup = group.value;

    if (selectedGroup === newSelectedGroup) {
      return;
    }

    this._showApplyingOptionSpinner({isApplyingGroup: true}, 1000);

    this._setOversightStateRoute(this.state.drilldownStudyId, this.state.selectedScorecardLevel, group.value,
      selectedSort, isTabularView);
  }

  _onChangeColumns(immEnabledMetricNames) {
    const {selectedScorecardLevel, immOversightScorecardStore,
      immMetricsById, selectedGroup,drilldownStudyId, selectedSort, immMetrics} = this.state;

    const immResults = immOversightScorecardStore.get(OversightStoreKey.results);
    const immPresentationData = this._preparePresentationData(immResults,
      selectedScorecardLevel, selectedGroup, immMetricsById, drilldownStudyId,
      immEnabledMetricNames, selectedSort, immMetrics);

    this.setState({
      immEnabledMetricNames,
      immPresentationData,
    });
  }

  _onChangeSort(sort) {
    const {selectedSort, drilldownStudyId, selectedScorecardLevel, selectedGroup, isTabularView} = this.state;
    const newSelectedSort = sort.value;

    if (newSelectedSort === selectedSort) {
      return;
    }

    this._showApplyingOptionSpinner({isApplyingSort: true}, 1000);

    this._setOversightStateRoute(drilldownStudyId,selectedScorecardLevel,
      selectedGroup, newSelectedSort, isTabularView);
  }

  _getGroupOptions(scorecardCategory) {
    return Imm.List(
      _.map(OversightScorecardConstants.GROUP_OPTIONS[scorecardCategory], (x, k) => {
        return Imm.Map({label: x, value: k});
      })
    );
  }

  _getApplyingRibbonOptionSpinner(isApplying, optionType) {
    let iconSpinnerContent;
    if (isApplying){
      const spinnerId = `os-ribbon-${optionType}`;
      iconSpinnerContent = <div className={cx('icon-spinner', spinnerId)}/>;
    }
    return (<div className='spinner-container'>{iconSpinnerContent}</div>);
  }

  _getRibbonFilters() {
    const {selectedScorecardLevel, selectedGroup, selectedSort,
      immScorecardOptions, immGroupOptions, immSortOptions, isTabularView,
      immEnabledMetricNames, immMetrics} = this.state;

    let allMetrics = this._getMetricsNames(immMetrics);
    const immMetricCategoryNamesMap = this._getMetricCategoryNameMap(immMetrics);

    return (
      <div className='oversight-scorecard-ribbon'>
        <div className='ribbon-filters'>
          <div className={cx('oversight-scorecard-scorecard', 'oversight-scorecard-ribbon-filter')}>
            <div className={cx('oversight-scorecard-scorecard-label', 'ribbon-filter-label')}>
              {FrontendConstants.SCORECARD}
            </div>
            <Combobox
              className={cx('oversight-scorecard-dropdown-scorecard', 'ribbon-filter-dropdown')}
              placeholder=''
              value={selectedScorecardLevel}
              onChange={this.ChangeScorecard}
              options={immScorecardOptions}
            />
          </div>
          <div className={cx('oversight-scorecard-group', 'oversight-scorecard-ribbon-filter')}>
            {this._getApplyingRibbonOptionSpinner(this.state.isApplyingGroup, FrontendConstants.GROUP)}
            <div className={cx('oversight-scorecard-group-label', 'ribbon-filter-label')}>
              {FrontendConstants.GROUP}
            </div>
            <Combobox
              className={cx('oversight-scorecard-dropdown-group', 'ribbon-filter-dropdown')}
              value={selectedGroup}
              options={immGroupOptions}
              onChange={this.ChangeGroup}
              passOnlyValueToChangeHandler={false}
            />
          </div>
          <div className={cx('oversight-scorecard-metric', 'oversight-scorecard-ribbon-filter')}>
            {this._getApplyingRibbonOptionSpinner(this.state.isApplyingMetrics, FrontendConstants.METRIC)}
            <div className={cx('oversight-scorecard-metric-label', 'ribbon-filter-label')}>
              {FrontendConstants.METRIC}
            </div>
            <MetricSelector
              immMetricCategoryNamesMap = {immMetricCategoryNamesMap}
              immItemMappings = {allMetrics}
              immSelectedItems = {immEnabledMetricNames}
              onApply = {this.ChangeColumns}
            />
          </div>
          <div className={cx('oversight-scorecard-sort', 'oversight-scorecard-ribbon-filter')}>
            {this._getApplyingRibbonOptionSpinner(this.state.isApplyingSort, FrontendConstants.SORT)}
            <div className={cx('oversight-scorecard-sort-label', 'ribbon-filter-label')}>
              {FrontendConstants.SORT}
            </div>
            <Combobox
              className={cx('oversight-scorecard-dropdown-sort', 'ribbon-filter-dropdown')}
              placeholder=''
              value={selectedSort}
              onChange={this.ChangeSort}
              options={immSortOptions}
              passOnlyValueToChangeHandler={false}
            />
          </div>
        </div>
        <div className='oversight-scorecard-toggle-view'>
          <span className={cx('view-toggle', 'icon-table', 'tabular-view-button', {
            'active': isTabularView,
          })}
                onClick={this._toggleViewType.bind(this, OversightScorecardConstants.VIEW_OPTIONS.TABULAR_VIEW)}
          />
          <span className={cx('view-toggle', 'icon-grid-view', 'grid-view-button', {
            'active': !isTabularView,
          })}
                onClick={this._toggleViewType.bind(this, OversightScorecardConstants.VIEW_OPTIONS.GRID_VIEW)}
          />
        </div>
      </div>
    )
  }

  _getMetricsNames(immMetrics) {
    return immMetrics.groupBy(x => x.getIn(['displayAttributes', 'title'])).keySeq().toList();
  }

  _getMetricCategoryNameMap(immMetrics) {
    return immMetrics.groupBy(x => x.get('category'))
      .map(x => x.groupBy(y => y.getIn(['displayAttributes', 'title'])).keySeq().toList());
  }

  _changeColumns(newColumnList) {
    this._showApplyingOptionSpinner({isApplyingMetrics: true}, 1000);
    this._onChangeColumns(newColumnList);
  }

  _getFilters() {
    const {showFilters, immOversightScorecardStore, selectedScorecardLevel} = this.state;

    let filterContent;
    const drilldownStudyIds = this.state.drilldownStudyId && [this.state.drilldownStudyId];
    const filterProps = _.extend({}, this.props, {
      immSelectedStudyIds: Imm.List(drilldownStudyIds),
      immIncludedDynamicFilters: immOversightScorecardStore.get(OversightStoreKey.includedDynamicFilters),
      immClientFiltersApplied: immOversightScorecardStore.get(OversightStoreKey.clientFilters),
    });

    if (showFilters) {
      filterContent = (
        <OversightScorecardFilters
          selectedScorecardLevel={selectedScorecardLevel}
          handleClose={this.toggleFilterPane.bind(this)}
          handleClear={this.clearDrillDownStudies.bind(this)}
          {...filterProps}
        />
      );
    }

    return filterContent;
  }

  _getAddTaskPane() {
    const {isAddingTasks} = this.state;

    let addTaskPane;

    if (isAddingTasks) {
      addTaskPane = (
        <div className='oversight-scorecard-add-task'>
          Add tasks
        </div>
      );
    }
  }

  _toggleViewType(viewType) {
    const {isTabularView: isCurrentlyTabularView} = this.state;
    const isTabularView = viewType === OversightScorecardConstants.VIEW_OPTIONS.TABULAR_VIEW;

    // If we have clicked the active view type, do nothing;
    if ((isCurrentlyTabularView && isTabularView) || (!isCurrentlyTabularView && !isTabularView)) {
      return;
    }

    const {selectedSort, drilldownStudyId, selectedScorecardLevel, selectedGroup} = this.state;
    this._setOversightStateRoute(drilldownStudyId,selectedScorecardLevel,
      selectedGroup, selectedSort, isTabularView);
  }

  _handleAddTask() {
    const isAddingTasks = !this.state.isAddingTasks;

    this.setState({isAddingTasks});
  }

  _handleExport() {
    const {immMetricsById, immPresentationData, selectedScorecardLevel} = this.state;

    let renderer = new OversightScorecardCsvRenderer(selectedScorecardLevel, immMetricsById);

    let csv = renderer.renderCsv(immPresentationData);

    const timestampString = Moment().format("YYYY-MM-DD-HH_mm_ss");
    const filename = `oversight-scorecard-export-${timestampString}.csv`;
    const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
    FileSaver.saveAs(blob, filename);
  }

  _isReady() {
    const {immExposureStore} = this.props;
    const {finishedInitialLoad, isChangingPath, newRouteStateFunc, immOversightScorecardStore} = this.state;
    const hasStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map()).size > 0;
    const hasMetrics = !GetOutstandingRequest(RequestKey.fetchMetrics);
    const hasMetricGroups = !GetOutstandingRequest(RequestKey.fetchMetricGroups);
    const isLoadingScorecardData = immOversightScorecardStore.get(OversightStoreKey.isLoadingScorecardData);
    const scoreCardDataFinishedLoading = !GetOutstandingRequest(RequestKey.fetchScorecardData)
      && !GetOutstandingRequest(RequestKey.applyDrillDownStudies) && !isLoadingScorecardData;
    const milestoneLabelData = !GetOutstandingRequest(RequestKey.fetchMilestoneLabel);

    return !isChangingPath && !newRouteStateFunc && scoreCardDataFinishedLoading
      && finishedInitialLoad && hasStudies && hasMetrics && hasMetricGroups && milestoneLabelData;
  }

  openConfig() {
    this.context.router.push(RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD_CONFIGURE);
  }

  _showApplyingOptionSpinner(isApplyingState, time) {
    this.setState(isApplyingState);
    Promise.resolve().then(() => {
      return this._sleep(time);
    }).then(() => {
      this._onFinishedApplyingOptions();
    });
  }

  _onFinishedApplyingOptions() {
    this.setState({
        isApplyingGroup: false,
        isApplyingMetrics: false,
        isApplyingSort: false
    });
  }

  _sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  render() {
    const {isTabularView, showFilters, immMetricsById} = this.state;

    let content, filters, addTaskPane, ribbonFilters, title, filterHomePageStyle;
    let activeTabId = this.state.activeTabId;
    if (!this._isReady()) {
      content = <ContentPlaceholder />;
    } else if (!immMetricsById.size) {
      content = (<InformationMessage
        params={
          {
            title: FrontendConstants.NO_METRICS_SELECTED,
            details: FrontendConstants.METRICS_HAVENT_BEEN_CONFIGURED,
          }
        }/>);
    } else {
      content = this._getContent();
      filters = this._getFilters();
      addTaskPane = this._getAddTaskPane();
      ribbonFilters = this._getRibbonFilters();
    }
    //if we are not on home page
    if (!activeTabId) {
      title = (
        <div className={cx('breadcrumbs', 'oversight-title')}>
          {FrontendConstants.OVERSIGHT_SCORECARD_FOCUS_AREA}
          <TouchDiv className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')}/>
          {FrontendConstants.OVERSIGHT_SCORECARD}
        </div>);
    }
    else {
      title = "";
      filterHomePageStyle = {
        marginBottom: '20pt',
      };
    }

    const toggleViewText = isTabularView
      ? FrontendConstants.GRID_VIEW
      : FrontendConstants.TABULAR_VIEW;

    let adminMenuOptions = null;
    // User only has access to the Configuration page if they have EDIT privilege for
    // the OVERSIGHT_SCORECARD feature
    const hasAccessToConfigurationPage = PermissionsUtil.checkLoggedInUserHasAccessForFeature(
      FeatureListConstants.OVERSIGHT_SCORECARD, AccessPermissionsConstants.EDIT
    );

    if (hasAccessToConfigurationPage) {
      adminMenuOptions = (
        <MenuOption className='more-menu-placeholder'
                    onSelect={this.openConfig.bind(this)}>
          <div className='react-menu-icon icon-cog'>
            {FrontendConstants.CONFIGURE_METRICS}
          </div>
        </MenuOption>
      );
    }

    return (
      <div className={cx('oversight-scorecard', {'show-filters': showFilters})}>
        <div className='page-header'>
          {title}
          <div className='header-buttons'>
            <a className='icon-report' href= '/folders/'>
              &nbsp;
              <span>All Analytics</span>
            </a>
            <SimpleAction
              class={cx('toggle-filters', 'icon-filter2')}
              text={FrontendConstants.FILTERS}
              onClick={this.toggleFilterPane.bind(this)}
            />
            <Menu className='more-menu'>
              <MenuTrigger className='more-menu-trigger'>
                <div className='react-menu-icon icon-menu2'>{FrontendConstants.MORE}</div>
              </MenuTrigger>
              <MenuOptions className='more-menu-options'>
                <MenuOption className='more-menu-export'
                            onSelect={this._handleExport.bind(this)}
                >
                  <div className='react-menu-icon icon-file-excel'>
                    {FrontendConstants.EXPORT}
                  </div>
                </MenuOption>
                <MenuOption className='more-menu-placeholder'
                            onSelect={isTabularView
                              ? this._toggleViewType.bind(this, OversightScorecardConstants.VIEW_OPTIONS.GRID_VIEW)
                              : this._toggleViewType.bind(this, OversightScorecardConstants.VIEW_OPTIONS.TABULAR_VIEW)
                            }
                >
                  <div className={cx('react-menu-icon', {
                    'icon-table': !isTabularView,
                    'icon-grid-view': isTabularView,
                  })}>
                    {toggleViewText}
                  </div>
                </MenuOption>
                {adminMenuOptions}
              </MenuOptions>
            </Menu>
          </div>
        </div>
        <div className='oversight-scorecard-ribbon-filters' style={filterHomePageStyle}>
          {ribbonFilters}
        </div>
        <div className={cx('oversight-scorecard-filters-container')}>
          {filters}
        </div>
        <div className='oversight-scorecard-content'>
          {content}
        </div>
        <div className='oversight-scorecard-add-task'>
          {addTaskPane}
        </div>
      </div>
    );
  }
}

export default OversightScorecard;
