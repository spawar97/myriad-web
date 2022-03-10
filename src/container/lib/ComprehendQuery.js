var $ = require('jquery');
var _ = require('underscore');
var Imm = require('immutable');
var HttpStatus = require('http-status-codes');
var ExposureActions = require('../actions/ExposureActions');
var FrontendConstants = require('../constants/FrontendConstants');
var StatusMessageTypeConstants = require('../constants/StatusMessageTypeConstants');
import Util from '../util/util';
import WidgetUtils from '../util/WidgetUtils';
import AppRequest from '../http/AppRequest';
import PubSub from '../widgets/PubSubController'
var GA = require('../util/GoogleAnalytics');
import { AppRequestByFetch } from '../http/AppRequest';
import { getObject } from '../util/SessionStorage';

var defaultParams = {
  dataType: 'json',
  contentType: 'application/json',
  timeout: 0,  // No timeout. The server is expected to handle timing out requests.
  type: 'POST',
  // Modify all AJAX requests to include the CSRF token.
  headers: { 'Csrf-Token': window.csrfToken }
};
/*
 * This function duplicates some of AppRequest, but is expected to eventually be removed once we go fully async, with
 * query() expected to become a synchronous wrapper for the async interface.
 */
async function lazyRequest(options, url, requestOption) {
  return await AppRequestByFetch(url, requestOption).then(async (res) => {

    if (res?.response) {

      let response = await res.response.json();
      return { Error: response };

    } else {

      return res;
    }
  }).catch(error => {
    GA.sendAjaxException(`Get ${url} failed.`, error.status);
    return error;
  });
}
function synchronousPostRequest(options) {
  var response = $.ajax(_.defaults(options, { async: false }, defaultParams));
  switch (response.status) {
    case HttpStatus.OK:
      return response.responseJSON;
      break;
    // TODO: Error 500 means we failed to execute the CQL usually. If the fileId is incorrect, we get a 4xx error. May
    // be useful to surface that somehow.
    default:
      console.log('%cERROR: synchronousPostRequest ' + options.url + ' failed.', 'color: #E05353');
      let message = (response.responseJSON && response.responseJSON.message) ? response.responseJSON.message : FrontendConstants.CANNOT_EXECUTE_QUERY;
      ExposureActions.createStatusMessage(message, StatusMessageTypeConstants.WARNING);
      // TODO: Right now the 500 errors from this endpoint don't put anything useful in the "message" field. This should
      // change to include something we can surface to the user.
      // Throw to stop query plan execution.
      throw _.extend(response.responseJSON, { error: true });
  }
}
function aSynchronousPostRequest(options, cqlId, context) {
  var xhrReq = $.ajax(_.defaults(options, { async: true }, defaultParams))
    .done(function (data, status) {
      context.successCallBack(data, status, cqlId, context);
    })
    .fail(function (xhr, status, error) {
      console.log('%cERROR: asynchronousPostRequest ' + options.url + ' failed.', 'color: #E05353');
      if (status != 'abort') {
        let message = FrontendConstants.CANNOT_EXECUTE_QUERY;
        ExposureActions.createStatusMessage(message, StatusMessageTypeConstants.WARNING);
        throw _.extend({ error: true });
      }
    });
  if (context.xhrRequests) {
    context.xhrRequests.push(xhrReq);
  }
  return xhrReq;
}
var ComprehendQuery = {
  isGranularQuery: function (query) {
    return _.has(query, 'query');
  },
  /*
   * When this function gets exposed into the report renderer, a local `query` should be created that's a partially
   * applied version of this one with the following passed in:
   *
   * var query = _.partial(ComprehendQuery.query, fileId, immQueryOptions, queryLogObject);
   *
   * This query function accepts queries in several formats:
   *
   * 1. Queries with filtering and drilldown setting per query rather than per request. Queries should have the following format:
   *
   *    { query: <raw query> [, ignoreFilters: <true|false>, ignoreDrilldown: <true|false>] }
   *
   *    and can either be a single granular query object or an array of them.
   *
   * 2. As a string or array of strings containing the queries followed by optional per-request
   *    ignoreFilters and ignoreDrilldown options.
   *
   * Optional fields will default to false.
   *
   */
  query: function (fileId, immQueryOptions, queryLogObject, queries, ignoreFilters, ignoreDrilldown) {
    if (!(fileId && immQueryOptions && queries && queryLogObject)) {
      return { error: true, message: 'Missing arguments' };
    }
    queries = _.isArray(queries) ? queries : [queries];
    ignoreFilters = _.isBoolean(ignoreFilters) ? ignoreFilters : false;
    ignoreDrilldown = _.isBoolean(ignoreDrilldown) ? ignoreDrilldown : false;
    // This allows us to support a list of queries, especially useful for migrating existing reports that assume
    // multiple queries in a single call.
    const immGranularQueryObject = ComprehendQuery.isGranularQuery(queries[0]) ?
      // If the first query is an object it's a granular query object and has
      // per-query options specified. This block will ensure that any
      // unspecified optional options have a default value set.
      Imm.List(_.map(queries, query => ({
        query: query.query,
        ignoreFilters: query.ignoreFilters || false,
        ignoreDrilldown: query.ignoreDrilldown || false,
        ignoreRowLimit: query.ignoreRowLimit || false,
      }))) :
      // The queries object is just a list of query strings that have
      // per-request options and needs to be converted into a granular query
      // object.
      Imm.List(_.map(queries, query => ({ query, ignoreFilters, ignoreDrilldown })));
    immQueryOptions = immQueryOptions.set('cqlQueries', immGranularQueryObject);
    const url = `/api/files/${fileId}/data`;
    const sprStart = new Date();
    const result = synchronousPostRequest({ url: url, data: JSON.stringify(immQueryOptions) });
    const sprTotalTime = new Date() - sprStart;
    if (!_.isEmpty(result.queryTimings)) {
      result.queryTimings.requestTime = sprTotalTime;
      queryLogObject.requests.push(result.queryTimings);
    }
    return _.pluck(result.reportData, 'rows');
  },
  asyncQuery: function (fileId, immQueryOptions, queryLogObject, qryWrapper, ignoreFilters, ignoreDrilldown, context) {
    if (!(fileId && immQueryOptions && qryWrapper && queryLogObject)) {
      return { error: true, message: 'Missing arguments' };
    }

    if (qryWrapper.filters) {
      let selectedFilters = immQueryOptions.get("includedDynamicFilters").toJS()
      let alteredFilters = selectedFilters.map((data, index) => {
        if (data.dynamicFilterPropertyColumn.displayString == qryWrapper.filters.label) {
          data.dynamicFilterCondition.itemsSelected = qryWrapper.filters.selectedOptions
          data.dynamicFilterCondition.allSelected = false
        }
        return data;
      })
      //let filterObj = immQueryOptions.get("includedDynamicFilters")
      //filterObj.push(qryWrapper.filters);
      immQueryOptions = immQueryOptions.set("includedDynamicFilters", alteredFilters);
    }

    var queries = qryWrapper.cqlQuery  || qryWrapper.query;
    queries = _.isArray(queries) ? queries : [queries];
    ignoreFilters = _.isBoolean(ignoreFilters) ? ignoreFilters : false;
    ignoreDrilldown = _.isBoolean(ignoreDrilldown) ? ignoreDrilldown : false;
    // This allows us to support a list of queries, especially useful for migrating existing reports that assume
    // multiple queries in a single call.
    const immGranularQueryObject = ComprehendQuery.isGranularQuery(queries[0]) ?
      // If the first query is an object it's a granular query object and has
      // per-query options specified. This block will ensure that any
      // unspecified optional options have a default value set.
      Imm.List(_.map(queries, query => ({
        query: query.query,
        ignoreFilters: query.ignoreFilters || false,
        ignoreDrilldown: query.ignoreDrilldown || false,
        ignoreRowLimit: query.ignoreRowLimit || false,
      }))) :
      // The queries object is just a list of query strings that have
      // per-request options and needs to be converted into a granular query
      // object.
      Imm.List(_.map(queries, query => ({ query, ignoreFilters, ignoreDrilldown })));
    immQueryOptions = immQueryOptions.set('cqlQueries', immGranularQueryObject);
    
    const  sessionKey = 'widgetContextFilter';
    let sessionData = getObject(sessionKey);
    let tableName = queries[0]?.tableName;

    if (sessionData?.length &&  tableName) {

      let contextFilter = sessionData.map((obj) => {
        return {
          "filterCql": `${obj.tableName}.${obj.columnName}`,
          "itemsSelected": obj?.isApplied || []
        }
      })

      let contextParams = {'contextFilterDatas' : contextFilter}

      immQueryOptions = immQueryOptions.set('contextFilters', contextParams);
    }

    const url = `/api/files/${fileId}/data`;
    const sprStart = new Date();
    return aSynchronousPostRequest({ url: url, data: JSON.stringify(immQueryOptions) }, qryWrapper.cqlId, context);
  },
  /**
   * Fires a server-side query for the specified file.
   * @param fileId            - The file currently being viewed
   * @param immExposureStore  - Reference of exposure store
   * @param cookies           - User's cookies, used for looking up master study filter information
   * @param queryIndex        - Index of the server-side query to execute
   * @param filterMap         - Map of filters to be applied to the server-side queries
   * @param queryLogObject    - (NOT USED!!!) object for logging query information
   * @returns                 - An array of rows for the specified query
   */
  serverQuery(fileId, immExposureStore, cookies, queryIndex, filterMap, queryLogObject) {
    if (!(fileId && !isNaN(queryIndex))) {
      return { error: true, message: 'Missing arguments' };
    }
    const studyNames = Util.getSessionFilterStudyNames(cookies, comprehend.globals.immAppConfig.get('currentAccountId'));
    const studyIds = _.map(studyNames, name => Util.getStudyIdFromName(immExposureStore, name));
    let updatedFilterMap = _.extend({}, filterMap);
    updatedFilterMap.studySessionFilter = studyIds || [];
    const url = `/api/files/${fileId}/server-query/${queryIndex}`;
    const sprStart = new Date();
    const result = synchronousPostRequest({ url: url, data: JSON.stringify(updatedFilterMap) });
    const sprTotalTime = new Date() - sprStart;
    if (!_.isEmpty(result.queryTimings)) {
      result.queryTimings.requestTime = sprTotalTime;
      // TODO - enable???
      // queryLogObject.requests.push(result.queryTimings);
    }
    return result.rowData;
  },
  /**
   * Refreshes the vizspec at reportIndex for the given file, and skips re-rendering the skipIndex
   * @param fileId
   * @param vizspec
   * @param reportIndex
   * @param skipIndex
   */
  refreshViz(fileId, vizspec, reportIndex, skipIndex) {
    ExposureActions.refreshVizspecs(fileId, vizspec, reportIndex, skipIndex);
  },
  getDefaultWidgetMetaData(noOfWidgets) {
    return WidgetUtils.getDefaultWidgetMetaData(noOfWidgets);
  },
  processWidgetMetaData(widgetMetaData) {
    return WidgetUtils.processWidgetMetaData(widgetMetaData);
  },
  updateWidget(fileId, widgetMetaData) {
    widgetMetaData.render = true;
    return ExposureActions.updateWidget(fileId, widgetMetaData);
  },
  /**
   * API for exporting a given report's file data, based on the CQL queries
   * @param fileId                  - file ID
   * @param immQueryOptionsWrapper  - Query options wrapper, includes all sorts of information required by the query
   * @param rowCount                - The report's row count
   * @param cqlQueries              - Query to fire for the export
   * @param ignoreFileFilters       - If set to true, will ignore all dynamic filters included on the report during the export
   */
  exportReportData(fileId, immQueryOptionsWrapper, rowCount, cqlQueries, ignoreFileFilters) {
    let immReportQueryOptionsWrapper = immQueryOptionsWrapper;
    if (cqlQueries && cqlQueries.length > 0) {
      immReportQueryOptionsWrapper = immReportQueryOptionsWrapper.set('cqlQueries', cqlQueries);
    }
    immReportQueryOptionsWrapper = immReportQueryOptionsWrapper.set('rowLength', rowCount);
    immReportQueryOptionsWrapper = immReportQueryOptionsWrapper.set('ignoreFileFilters', ignoreFileFilters || false);
    ExposureActions.exportFileData(fileId, null, 'CSV', null, null, rowCount, null, immReportQueryOptionsWrapper);
  },
  queryWithoutFile: function (schemaId, cqlQuery) {
    if (!(schemaId && cqlQuery)) {
      return { error: true, message: 'Missing arguments' };
    }
    // This allows us to support a list of queries, especially useful for migrating existing reports that assume
    // multiple queries in a single call.
    let cqlQueries = _.isArray(cqlQuery) ? cqlQuery : [cqlQuery];
    if (ComprehendQuery.isGranularQuery(cqlQueries[0])) {
      // This is a granular-type query array so we need to pluck out the queries.
      cqlQueries = _.pluck(cqlQueries, 'query');
    }
    const url = `/api/cql-queries/${schemaId}/execute`;
    return _.pluck(synchronousPostRequest({ url: url, data: JSON.stringify(cqlQueries) }), 'rows');
  },
  asyncQueryWithoutFile: function (schemaId, qryWrapper, x, y, context) {
    if (!(schemaId && qryWrapper)) {
      return { error: true, message: 'Missing arguments' };
    }
    // This allows us to support a list of queries, especially useful for migrating existing reports that assume
    // multiple queries in a single call.
    let cqlQueries = _.isArray(qryWrapper.cqlQuery) ? qryWrapper.cqlQuery : [qryWrapper.cqlQuery];
    if (ComprehendQuery.isGranularQuery(cqlQueries[0])) {
      // This is a granular-type query array so we need to pluck out the queries.
      cqlQueries = _.pluck(cqlQueries, 'query');
    }
    const url = `/api/cql-queries/${schemaId}/execute`;
    return aSynchronousPostRequest({ url: url, data: JSON.stringify(cqlQueries) }, qryWrapper.cqlId, context);
  },
  /*
   * This function should also be exposed directly into the `queryPlan`, but plainly as `parseColumn.`
   */
  parseColumn: function (column, dataType) {
    switch (dataType) {
      case 'Decimal':
        return parseFloat(column);
      case 'Integer':
        return parseInt(column, 10);
      case 'Date':
        return new Date(parseInt(column, 10));
      case 'Null':
        return null;
      case 'String':
      default:
        return column;
    }
  },
  getWidgetMetaData(fileId, immQueryOptionsWrapper, queryLogObject, taskFilters, config) {
    return WidgetUtils.getWidgetMetaData(fileId, immQueryOptionsWrapper, queryLogObject, taskFilters, config);
  },
  pubSubController(fileId) {
    return PubSub(fileId);
  },
  updateMultipleWidget(fileId, widgetMetaData) {
    return ExposureActions.updateMultipleWidget(fileId, widgetMetaData);
  },

  asyncRequest: function (immQueryOptions, fileId, myqueries) {

    if (myqueries.studies.length) {
      let selectedFilters = immQueryOptions.get("includedDynamicFilters").toJS()
      let alteredFilters = selectedFilters.map((data) => {
        if (data.dynamicFilterPropertyColumn.displayString == myqueries.filterLabel) {
          data.dynamicFilterCondition.itemsSelected = myqueries.studies;
          data.dynamicFilterCondition.allSelected = false
        }
        return data;
      });
      immQueryOptions = immQueryOptions.set("includedDynamicFilters", alteredFilters);
    }

    var queries = myqueries.queries;

    const immGranularQueryObject = ComprehendQuery.isGranularQuery(queries[0]) ?
      // If the first query is an object it's a granular query object and has
      // per-query options specified. This block will ensure that any
      // unspecified optional options have a default value set.
      Imm.List(_.map(queries, query => ({
        query: query.query,
        ignoreFilters: query.ignoreFilters || false,
        ignoreDrilldown: query.ignoreDrilldown || false,
        ignoreRowLimit: query.ignoreRowLimit || false,
      }))) :
      // The queries object is just a list of query strings that have
      // per-request options and needs to be converted into a granular query
      // object.
      Imm.List(_.map(queries, query => ({ query, ignoreFilters, ignoreDrilldown })));

    immQueryOptions = immQueryOptions.set('cqlQueries', immGranularQueryObject);
    const url = `/api/files/${fileId}/data`;
    let options = { url: url, data: JSON.stringify(immQueryOptions) }

    let requestOption = {
      method: 'POST',
      body: JSON.stringify(immQueryOptions),
      signal: myqueries.signal
    };

    var data = lazyRequest(options, url, requestOption);
    return data;
  },

  filterWidgetAsyncQuery : async function(fileId, immQueryOptions, widgetQuery, signal, disableContextFilter, taskFilters, ignoreIsAppliedContextFilter = false){

    const  sessionKey = 'widgetContextFilter';

    const path = window.location.pathname.includes('tasks');
    let sessionData = path ? JSON.parse(taskFilters) : getObject(sessionKey);
    
    var queries = widgetQuery;

    let immGranularQueryObject;

    if (queries && Array.isArray(queries[0].query)) {
      immGranularQueryObject = queries.map((obj) => {
        return obj.query.map((query) => {
          query.ignoreDrilldown = query.ignoreDrilldown ? true : false;
          query.ignoreFilters = query.ignoreFilters ? true : false;
          query.ignoreRowLimit = query.ignoreRowLimit ? true : false;
          return query 
        })
      }).flat();
    }
    else {
      immGranularQueryObject = ComprehendQuery.isGranularQuery(queries?.[0]) ?
      // If the first query is an object it's a granular query object and has
      // per-query options specified. This block will ensure that any
      // unspecified optional options have a default value set.
      Imm.List(_.map(queries, query => ({
        query: query.query,
        ignoreFilters: query.ignoreFilters || false,
        ignoreDrilldown: query.ignoreDrilldown || false,
        ignoreRowLimit: query.ignoreRowLimit || false,
      }))) :
      // The queries object is just a list of query strings that have
      // per-request options and needs to be converted into a granular query
      // object.
      Imm.List(_.map(queries, query => ({ query, ignoreFilters, ignoreDrilldown })));
    }

    immQueryOptions = immQueryOptions.set('cqlQueries', immGranularQueryObject);
    let isAppliedContextFilter = getObject('isAppliedContextFilter');

    const getSelectecValues = (ignoreIsAppliedContextFilter, obj) => {
      if (ignoreIsAppliedContextFilter) {
        return obj?.values
      }
      else if (!_.isEmpty(obj?.isApplied)) {
        return obj?.isApplied
      }
      else {
        return []
      }
    }

    if (sessionData?.length && (!disableContextFilter)) {
      
      let contextFilter = sessionData.map((obj) => {
        if (!_.isEmpty(obj?.isApplied) || ignoreIsAppliedContextFilter) {
          return {
            "filterCql": `${obj.tableName}.${obj.columnName}`,
            "itemsSelected": getSelectecValues(ignoreIsAppliedContextFilter, obj)
          }
        }
      })?.filter((obj) => obj);

      let contextParams = {'contextFilterDatas' : contextFilter}

      immQueryOptions = immQueryOptions.set('contextFilters', contextParams);
    }

    const url = `/api/files/${fileId}/data`;
    let options = { url: url, data: JSON.stringify(immQueryOptions) }

    let controller = new AbortController();
    await ExposureActions.updateRequests(fileId, controller);
    
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(immQueryOptions),
      signal: signal ? signal : controller.signal 
    };

    var data = lazyRequest(options, url, requestOption);
    return data;

  }
};
module.exports = ComprehendQuery;
