 var Imm = require('immutable');
var regression = require('regression');
var _ = require('underscore');
import FileSaver from "file-saver";
import CustomRenderer from "../CustomRenderer";
var Util = require('./util');
var ComprehendQuery = require('../lib/ComprehendQuery');

import MasterStudyFilterUtil from '../util/MasterStudyFilterUtil';
import ExposureActions from '../actions/ExposureActions';
import RactActions from '../actions/RactActions';
import Utils from "../util/util";
import { Highcharts } from "highcharts/modules/stock";
import RactScorecardStore from "../stores/RactScorecardStore";
import { setObject } from "./SessionStorage";

var QueryUtils = {
  emptyColumn: Imm.fromJS({
    arguments: [],
    filterColumns: []
  }),

  getDrilldownDetails: function (fileId, immExposureStore) {
    let immDrilldownData = immExposureStore.get('drilldownFilterDisplayStrings', Imm.List())
      .filter(immItem => immItem.indexOf("Comprehend Datasource"));
    let drillDownReportString = immDrilldownData.size > 0;
    return drillDownReportString
  },

  getFilterValues: function (fileId, immExposureStore) {
    var immIncludedDynamicFilterStates = immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
    let filterValue = immIncludedDynamicFilterStates.map(function (immFilter, idx) {
      return ({
        "selectedOptions": immFilter.getIn(['itemsSelected']).toJS(),
        "label": immFilter.getIn(['column', 'displayString']),
        "allSelected": immFilter.getIn(['allSelected']),
        "valid": immFilter.getIn(['valid']),
        "optionList": immFilter.getIn(['data']).toJS(),
      })
    }).toJS();
    return filterValue;
  },

  getDashboardFilterValues: function (fileId, immExposureStore) {
    var immIncludedDynamicFilterStates = immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
    if(immIncludedDynamicFilterStates && immIncludedDynamicFilterStates.size == 0){
      const currentDashboardId = immExposureStore.get('currentDashboardId');
      immIncludedDynamicFilterStates = immExposureStore.getIn(['files', currentDashboardId, 'filterStates'], Imm.List());
    }
    let filterValue = immIncludedDynamicFilterStates.map(function (immFilter, idx) {
      return ({
        "selectedOptions": immFilter.getIn(['itemsSelected']).toJS(),
        "label": immFilter.getIn(['column', 'displayString']),
        "allSelected": immFilter.getIn(['allSelected']),
        "valid": immFilter.getIn(['valid']),
        "optionList": immFilter.getIn(['data']).toJS(),
        "currentBounds":immFilter.getIn(['currentBounds'])
      })
    }).toJS();
    return filterValue;
  },
  getWidget: function (fileId, entireStore, widget) {
    let store = entireStore.getExposureStore();
    let immReportData = store.getIn(['files', fileId, 'reportData']);;
    return immReportData.getIn(['widgetMetaData', widget.widgetIndex])?.toJS();
  },

  exportToCsv: function (filename, csvData) {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
    FileSaver.saveAs(blob, filename + '.csv');
  },

  updatePrimeDataStore: function (loadedData) {
    RactActions.updatePrimeTableData(loadedData);
  },

  renderMyriadComponent: function (fileId, config) {
    let props = {
      ...config,
      fileId
    }
    return CustomRenderer(props);
  },

  pdfChartStore: function (immExposureStore, chartData, isMultiData) {
    ExposureActions.pdfChartDataAction(chartData, isMultiData);
  },

  pdfPrimeTableStore: function (immExposureStore, tableData) {
    ExposureActions.pdfPrimeTableDataAction(tableData);
  },

  updateFetchController: function (controller) {
    ExposureActions.updateFetchControllerAction(controller);
  },

  constructOrSelectionCondition: function (immSelectionCondition1, immSelectionCondition2) {
    return QueryUtils.emptyColumn.merge({
      type: 'SELECTION_CONDITION_COLUMN',
      sccType: 'DRILL_DOWN_GENERATED',
      functionDesc: 'OR_DESCRIPTION',
      isCohort: true,
      arguments: [immSelectionCondition1, immSelectionCondition2]
    });
  },

  getDrilldownFileData: function (exposureStore) {
    return exposureStore.get('drilldownFileData');
  },
  drilldownToDashboard: function (drillDownData, openInNewTab = false) {
    let store = RactScorecardStore.getStore();
    let highchartsData = store.get("highchartThis");
    Utils.drilldownToSpecificDashboard(drillDownData, highchartsData, openInNewTab)
  },

  // Text to be displayed above the advanced report queryPlan, explaining what is available.
  // comprehendSchemaId - So that it can be used as a key in frontend caching.
  // hasAssociatedFiles - So that we can disable drilldown when there are no associated files.
  IN_SCOPE_EXPLANATION: '' +
    `The following variables are in scope:
  Note: these won't be supplied when previewing.
  attributes.ComprehendAttributes = {comprehendSchemaId: <UUID>, hasAssociatedFiles: <Boolean>}
The following libraries are in scope:
  _ (underscore) - version ${_.VERSION}
  regressionjs
  `,

  // Runs queryPlans from InstantiatedTemplates, whether that be advanced reports or adhoc reports.
  // Arguments:
  //   - immFile - Required. If this is for a preview, then it should be stubbed out such that it just has the `templatedReport` key.
  //   - immQueryOptionsWrapper - Not needed for previews, see ExposureStore.fetchReportData.
  //   - immQualityAgreements - Quality Agreement data that will be passed into the closure if necessary.
  //   - immExposureStore - Passed to the ServerQuery function, for study name -> study ID lookup
  //   - cookies - Cookie data, passed to serverQuery function for master study filter support
  // Returns reportData.
  // Note: Does not catch exceptions from the query plan, it is the responsibility of the caller to handle them.
  execInstantiatedTemplateQueryPlan: function (immFile, immQueryOptionsWrapper, immQualityAgreements, immExposureStore, cookies, entireStore) {
    const immInstantiatedTemplate = immFile.getIn(['templatedReport']);
    const queryPlanSource = immInstantiatedTemplate.getIn(['template', 'queryPlan']);
    const attributes = _.chain(immInstantiatedTemplate.getIn(['template', 'parameters'], Imm.List()).toJS())
      .groupBy('name')
      .mapObject(attrs => attrs[0])  // We know there will only be a single parameter with each name.
      .value();
    // Grab just the values.
    const parameters = _.mapObject(attributes, attrs => attrs.value || attrs.defaultValue);

    const fileId = immFile.get('id');
    const immDynamicFilters = immFile.get('includedDynamicFilters', Imm.List());
    const usubjidFilterIndex = immDynamicFilters.findKey(x => {
      return x.getIn(['column', 'propertyShortName'], '') === 'usubjid';
    });
    const immIncludedDynamicFilters = !!immQueryOptionsWrapper
      ? immQueryOptionsWrapper.get('includedDynamicFilters', Imm.List())
      : Imm.List();

    if (immIncludedDynamicFilters.size && usubjidFilterIndex != null
      && immIncludedDynamicFilters.get(usubjidFilterIndex)
    ) {
      const selectedUsubjids = immIncludedDynamicFilters
        .getIn([usubjidFilterIndex, 'dynamicFilterCondition', 'itemsSelected'], Imm.List())
        .toJS();
      parameters.selectedUsubjid = !!selectedUsubjids.length ? selectedUsubjids[0] : null;
    }

    // Initialize the query timing object. This will be filled out by the queryPlan.
    let queryLogObject = { title: immFile.get('title'), id: fileId, requests: [], totalRequestTime: 0, totalSequentialQueryTime: 0 };
    // The `api` object is a container for holding all API calls. Any new API
    // calls being added for use inside of queryPlans must be added to this
    // object, e.g.:
    //
    // api.<new api> = <new_api>
    //
    // Once added the API can be called from within the queryPlan by calling:
    //
    // `api.<new api function>(...)`.
    let api = {};

    if (!fileId) {
      // The preview version of the query is slightly different, as it may not yet have a file id.
      // Thus it uses `queryWithoutFile` instead of `query`.
      api.query = _.partial(ComprehendQuery.queryWithoutFile, immInstantiatedTemplate.get('comprehendSchemaId'));
      //new hooks
      api.asyncQuery = _.partial(ComprehendQuery.asyncQueryWithoutFile, immInstantiatedTemplate.get('comprehendSchemaId'));
      api.getDefaultWidgetMetaData = _.partial(ComprehendQuery.getDefaultWidgetMetaData);
      api.processWidgetMetaData = _.partial(ComprehendQuery.processWidgetMetaData);
      api.updateWidget = _.partial(ComprehendQuery.updateWidget, fileId);
      let isGppAdvancedReport = immFile.getIn(['templatedReport', 'isAdvancedReport'], false);
      parameters.isAdvancedReport = isGppAdvancedReport;
    } else {
      // Add meta-attributes specific to the report.
      let comprehendAttributes = {
        comprehendSchemaId: Util.getComprehendSchemaIdFromFile(immFile),
        hasAssociatedFiles: !immFile.get('associatedFileIds', Imm.List()).isEmpty()
      };
      _.extend(attributes, { ComprehendAttributes: comprehendAttributes });
      api.query = _.partial(ComprehendQuery.query, fileId, immQueryOptionsWrapper, queryLogObject);
      api.serverQuery = _.partial(ComprehendQuery.serverQuery, fileId, immExposureStore, cookies);
      api.refreshViz = _.partial(ComprehendQuery.refreshViz, fileId);
      api.exportReportData = _.partial(ComprehendQuery.exportReportData, fileId, immQueryOptionsWrapper);
      api.getSelectedStudies = _.partial(MasterStudyFilterUtil.getSelectedStudies, immExposureStore, cookies);
      api.getFilterValues = _.partial(this.getFilterValues, fileId, immExposureStore);
      api.getDashboardFilterValues = _.partial(this.getDashboardFilterValues, fileId, immExposureStore);
      api.getDrilldownDetails = _.partial(this.getDrilldownDetails, fileId, immExposureStore);
      api.exportToCsv = _.partial(this.exportToCsv);
      //new hooks
      api.asyncQuery = _.partial(ComprehendQuery.asyncQuery, fileId, immQueryOptionsWrapper, queryLogObject);
      api.getDefaultWidgetMetaData = _.partial(ComprehendQuery.getDefaultWidgetMetaData);
      api.processWidgetMetaData = _.partial(ComprehendQuery.processWidgetMetaData);
      api.updateWidget = _.partial(ComprehendQuery.updateWidget, fileId);
      api.getDrilldownFileData = _.partial(this.getDrilldownFileData, immExposureStore);
      // prime-react component
      api.renderMyriadComponent = _.partial(this.renderMyriadComponent, fileId);
      api.updatePrimeDataStore = _.partial(this.updatePrimeDataStore);

      api.asyncRequest = _.partial(ComprehendQuery.asyncRequest, immQueryOptionsWrapper, fileId);
      api.updateFetchController = _.partial(this.updateFetchController);
      //pdf Chart data store
      api.pdfChartStore = _.partial(this.pdfChartStore, immExposureStore);
      //pdf prime table store
      api.pdfPrimeTableStore = _.partial(this.pdfPrimeTableStore, immExposureStore);
      //post 3.7 in 4.1
      api.getWidgetMetaData = _.partial(ComprehendQuery.getWidgetMetaData,fileId, immQueryOptionsWrapper, queryLogObject, immExposureStore.get('fetchedTaskFilters'));
      api.pubSub = _.partial(ComprehendQuery.pubSubController, fileId);
      //API hook to update multiple widget.
      api.updateMultipleWidget = _.partial(ComprehendQuery.updateMultipleWidget, fileId);
      api.getWidget = _.partial(QueryUtils.getWidget, fileId, entireStore);

      api.getContext = _.partial(ComprehendQuery.getContext);
      api.filterWidgetAsyncQuery = _.partial(ComprehendQuery.filterWidgetAsyncQuery, fileId, immQueryOptionsWrapper)
      api.drilldownToDashboard = _.partial(this.drilldownToDashboard)
    }
    // This is a closure that only imports what we want into the context where the eval is happening.
    let [result, queryPlanTime] = ((_, parseColumn, queryPlanSource, parameters, attributes, regression, api, qualityAgreements) => {
      let query = api.query; // Remove this once all `query` calls have been replaced by `api.query`.
      const queryPlan = eval(`(${queryPlanSource.trim()})`);  // Now it's a function.
      const queryPlanStartTime = new Date();
      const queryPlanResult = queryPlan(parameters, attributes);
      return [queryPlanResult, new Date() - queryPlanStartTime];
    })(_, ComprehendQuery.parseColumn, queryPlanSource, parameters, attributes, regression, api, immQualityAgreements.toJS());

    if (api.widgetMetaData) {
      if (api.widgetMetaData.constructor === Object && !api.widgetMetaData?.enabled) {
        result.widgetMetaData = api.widgetMetaData.dashboardWidgets;
        const { dashboardLayoutProps, style, FilterDependentWidget, isApply} = api.widgetMetaData || {};
        result.dashboardCustomConfigs = { dashboardLayoutProps, style, FilterDependentWidget, isApply };
        setObject("currentWidgetizationTab", undefined);
      }
      else if (api.widgetMetaData?.enabled) {
        let allTabs = api.widgetMetaData.tabs;
        let defaultTab = allTabs?.length ?? Object.keys(allTabs)[0];

        for (let tab in allTabs) {
          allTabs[tab]["dashboardWidgets"] = Utils.createIndexes(allTabs[tab]["dashboardWidgets"]);
        }

        let path = immExposureStore.get('isViewTasks');
        setObject("currentWidgetizationTab", defaultTab);
        
        result.widgetMetaData = allTabs[path && immExposureStore.get('selectedTab') ? immExposureStore.get('selectedTab') : defaultTab]?.dashboardWidgets;
        const { dashboardLayoutProps, style, FilterDependentWidget, isApply } = allTabs[path && immExposureStore.get('selectedTab') ? immExposureStore.get('selectedTab') : defaultTab];
        result.dashboardCustomConfigs = { dashboardLayoutProps, style, FilterDependentWidget, isApply };
        result.tabs = allTabs
      }
      else {
        result.widgetMetaData = api.widgetMetaData;
      }
    }

    if (result.widgetMetaData) {
      result.widgetMetaData = Utils.createIndexes(result.widgetMetaData)
    }
    // If queries were performed by the queryPlan tally the times and log the result.
    if (!_.isEmpty(queryLogObject.requests)) {
      _.each(queryLogObject.requests, (request) => {
        // The queries might have been run in parallel on the server, but their
        // sum is still a useful metric as it allows us to see the amount of
        // "CPU time" running queries.
        const requestQueryTotal = _.reduce(request, (currentTotal, query) => currentTotal + query.queryTime, 0);
        queryLogObject.totalSequentialQueryTime += requestQueryTotal;
        queryLogObject.totalRequestTime += request.requestTime;
      });
      queryLogObject.queryPlanTime = queryPlanTime;

      // this log line prints query information into browser console, which is
      // then picked up by report generation scripts in cqs-reports.
      //
      // DO NOT REMOVE this line until there is another way to support:
      // https://github.com/comprehend/cqs-reports/blob/master/qualification/features/step_definitions/performance_steps.rb
      // search for step "I record the queries for analytics"
      console.log(`Report qualification details (${immFile.get('title')}): ${JSON.stringify(queryLogObject)}`);
    }
    return [result, queryLogObject];
  }
};

module.exports = QueryUtils;
