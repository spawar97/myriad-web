var Imm = require('immutable');
var _ = require('underscore');
var ExposureActions = require('../actions/ExposureActions');
import FrontendConstants from '../constants/FrontendConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
import { getObject, getString } from '../util/SessionStorage';

let immQueryOptionsWrapperGlobal, queryLogObjectGlobal, fileIdGlobal
let defaultParams = {
  dataType: 'json',
  contentType: 'application/json',
  timeout: 0,  // No timeout. The server is expected to handle timing out requests.
  type: 'POST',
  // Modify all AJAX requests to include the CSRF token.
  headers: { 'Csrf-Token': window.csrfToken }
};

class WidgetUtils {
  static getDefaultWidgetMetaData(noOfWidgets) {

    var widgetMetaData = [];
    for (let i = 1; i <= noOfWidgets; i++) {
      widgetMetaData.push({
        widgetId: 'widget-' + i,
        isLoading: true,
        widgetIndex: (i - 1),
        currentState: 0,
        dataCache: [],
        dataDependency: null,
        states: null,
        staticHiChartConf: [],
        staticlayout: '',
        apiProcessWidgetMetaData: null,
        apiQuery: null,
        apiUpdateWidget: null,
        xhrRequests: [],
        render: true,
        subscribeUpdate: [],
        preview: false,
        nextState: function () {
          if (this.states) {
            var currId = this.currentState;
            var currState = _.find(this.states, function (state) { return state.id === currId });
            if (currState && currState.nextState) {
              this.currentState = currState.nextState;
            } else {
              this.currentState = null;
            }
          }
        },
        checkDataDependency: function () {
          //check queries this widget is dependent on
          if (this.dataDependency) {
            let widget = this
            var isFullfilled = this.dataDependency.every(function (d) {
              return widget.dataCache.map(function (value) {
                return value.cqlId;
              }).includes(d);
            });
            if (isFullfilled) {
              this.staticHiChartConf = this.highChartConfigFunc(this.dataCache);
              this.staticlayout = this.layoutFunc(this.dataCache);
              this.isLoading = false;
              this.dataDependency = null;
            }
          }
          return (this.dataDependency)
        },
        renderView: function () {
          if (!this.preview)
            this.apiUpdateWidget(this);
        },
        addDataToCache: function (data) {
          this.dataCache.push(data);
        },
        updateDataCache: function (results, reqId) {
          let reqQuery = this.dataCache.filter(function (qry) { return qry.cqlId == reqId })[0];
          reqQuery.data = results;
          return reqQuery;
        },
        subscribeAndUpdate: function (reqId, results) {
          var localWidget = this;
          this.subscribeUpdate.map(function (widget) {
            widget?.addDataToCache({ cqlId: reqId, data: results })
            localWidget.checkDataDependencyAndRender(widget);
            //fire an update for fulfilled widget..
          });
          //should we move the state?
          this.isWidgetStateResolved();
        },
        checkDataDependencyAndRender: function (widget) {
          if (!widget?.checkDataDependency()) {
            widget?.renderView();
          }
        },
        getPromises: function () {
          return this.dataCache.map(function (qry) { return qry.promise; });
        },
        isWidgetStateResolved: function () {
          var localWidget = this;
          var allPromises = this.getPromises();
          Promise.all(allPromises).then(function (result) {
            localWidget.nextState();
            localWidget.apiProcessWidgetMetaData(localWidget);
          });
        }

      });
    }
    return widgetMetaData;
  }

  //An independent function that can create inbdividual widgets.
  static getWidgetMetaData(fileId, immQueryOptionsWrapper, queryLogObject, taskFilters, config) {
    immQueryOptionsWrapperGlobal = immQueryOptionsWrapper
    queryLogObjectGlobal = queryLogObject
    fileIdGlobal = fileId
    var widgetMetaData = {
      ...config,
      taskFilters: taskFilters,
      controller: config.controller,
      isLoading: config.isLoading ? config.isLoading : false,
      currentState: config.currentState ? config.currentState : 100,
      dataCache: [],
      dataDependency: config.dataDependency ? config.dataDependency : null,
      states: config.states ? createStates(config.states) : null,
      staticHiChartConf: [],
      staticlayout: config.staticlayout ? config.staticlayout : '',
      apiProcessWidgetMetaData: this.processWidgetMetaData,
      layoutFunc: config.layoutFunc,
      highChartConfigFunc: config.highChartConfigFunc,
      apiQuery: null,
      apiUpdateWidget: _.partial(ExposureActions.updateWidget, fileId),
      apiUpdateMultipleWidget: _.partial(ExposureActions.updateMultipleWidget, fileId),
      xhrRequests: [],
      render: false,
      staticWidget: config.staticWidget ? true : false,
      subscribeUpdate: config.subscribeUpdate ? config.subscribeUpdate : [],
      preview: false,
      successCallBack: config.successCallback ?
        config.successCallback :
        function successCallback(data, status, cqlId, context) {
          //function get called after each API success
          var rset = null;
          if (data.reportData) {
            rset = _.pluck(data.reportData, 'rows')
          } else {
            rset = _.pluck(data, 'rows')
          }
          var currentState = _.find(context.states, function (state) { return state.id === context.currentState });
          currentState.postProcess(rset, context, cqlId);
        },
      nextState: function () {
        if (this.states) {
          var currId = this.currentState;
          var currState = _.find(this.states, function (state) { return state.id === currId });
          if (currState && currState.nextState) {
            this.currentState = currState.nextState;
          } else {
            this.currentState = null;
          }
        }
      },
      checkDataDependency: function () {
        //check queries this widget is dependent on
        if (this.dataDependency) {
          let widget = this
          var isFullfilled = this.dataDependency.every(function (d) {
            return widget.dataCache.map(function (value) {
              return value.cqlId;
            }).includes(d);
          });
          if (isFullfilled) {
            this.staticHiChartConf = this.highChartConfigFunc(this.dataCache);
            this.staticlayout = this.layoutFunc(this.dataCache);
            this.isLoading = false;
            this.dataDependency = null;
          }
        }
        return (this.dataDependency)
      },
      renderView: function () {
        if (!this.preview)
          this.apiUpdateWidget(this);
      },
      addDataToCache: function (dat) {
        this.dataCache.push(dat);
      },
      updateDataCache: function (results, reqId) {
        let reqQuery = this.dataCache.filter(function (qry) { return qry.cqlId == reqId })[0];
        reqQuery.data = results;
        return reqQuery;
      },
      subscribeAndUpdate: function (reqId, results) {
        var localWidget = this;
        this.subscribeUpdate.map(function (widget) {
          widget?.addDataToCache({ cqlId: reqId, data: results })
          localWidget.checkDataDependencyAndRender(widget);
          //fire an update for fulfilled widget..
        });
        //should we move the state?
        this.isWidgetStateResolved();
      },
      checkDataDependencyAndRender: function (widget) {
        if (!widget?.checkDataDependency()) {
          widget?.renderView();
        }
      },
      getPromises: function () {
        return this.dataCache.map(function (qry) { return qry.promise; });
      },
      isWidgetStateResolved: function () {
        var localWidget = this;
        var allPromises = this.getPromises();
        if (allPromises.every(promise => promise.readyState == 4)) {
          Promise.all(allPromises).then(function (result) {
            localWidget.nextState();
            localWidget.apiProcessWidgetMetaData(localWidget);
          });
        }
      }
    }
    return widgetMetaData;
  }

  static processWidgetMetaData(widgetMetaData) {
    if (widgetMetaData && widgetMetaData.states) {
      var currentState = _.find(widgetMetaData.states, function (state) { return state.id === widgetMetaData.currentState });

      if (currentState && currentState.process) {
        currentState.process(currentState.preProcess(widgetMetaData.dataCache), null, null, widgetMetaData);
      } else if (currentState && currentState.postProcess) {
        currentState.postProcess(widgetMetaData);
      }
    } else if (widgetMetaData.staticWidget) {
      widgetMetaData.staticHiChartConf = widgetMetaData.highChartConfigFunc(widgetMetaData.dataCache);
      widgetMetaData.staticlayout = widgetMetaData.layoutFunc(widgetMetaData.dataCache);
      widgetMetaData.isLoading = false;
      widgetMetaData.dataDependency = null;
      widgetMetaData.apiUpdateWidget(widgetMetaData);
    }
  }

  static setNextState(widgetMetaData) {
    if (widgetMetaData && widgetMetaData.states) {
      var currentState = _.find(widgetMetaData.states, function (state) { return state.id === widgetMetaData.currentState });
      if (currentState.nextState) {
        widgetMetaData.currentState = currentState.nextState;
      } else {
        widgetMetaData.currentState = null;
        widgetMetaData.statePromise.then(function (result) {
          console.log("state Promise resolved.");
        })
      }
    }
  }

  static isWidgetLoaded(widgetMetaData, mixin) {
    let promise = [];
    widgetMetaData.map(function (widget) {
      widget.preview = true;
      widget.apiProcessWidgetMetaData(widget);
      promise.push(new Promise(function (resolve, reject) {
        let interval = setInterval(function () {
          if (widget.dataDependency == null) {
            resolve({ layout: widget.staticlayout, vizspecs: widget.staticHiChartConf });
            clearInterval(1000);
          }
        }, interval);

      }));
    });
    var p = Promise.all(promise).then(function (results) {
      mixin.setState({
        preview: {
          layout: 'Creating preview',
          vizspecs: [],
          data: results
        }
      });
    });
  }
}

function createStates(arrayOfStates) {
  //function to create Finite state machine executionn plan.
  let states = arrayOfStates.map((state, index, { length }) => {
    /* This piece of code is kept in order to have to earlier implementation in order.*/
    return {
      id: state.index ? state.index + 1 : index + 1,
      preProcess: state,
      process: processQueries,
      postProcess: postProcess.bind(state),
      nextState: length == index + 1 ? null : index + 2
    }
  })
  return states;
}

function processQueries(qryWrapperArr, x, y, widgetMetaData) {
  // This function is used to call API's
  var qArr = _.isArray(qryWrapperArr) ? qryWrapperArr : [qryWrapperArr];
  qArr.map(function (qry) {
    var prom = asyncQuery(fileIdGlobal, immQueryOptionsWrapperGlobal, queryLogObjectGlobal, qry, null, null, widgetMetaData);
    widgetMetaData.addDataToCache({ cqlId: qry.cqlId, data: null, promise: prom, widgetState: widgetMetaData.currentState })
  });
}

function getParsedResultsAsync(data, querySpecs) {
  const resultSpecs = _.chain(data)
    .zip(querySpecs)
    .map(([results, querySpec]) => _.extend({}, querySpec, { results }))
    .value();
  return _.object(parseResults(...resultSpecs));
}

function postProcess(results, widgetMetaData, reqId) {
  //1. add result to datacache
  let dataMap = getParsedResultsAsync(results, this()?.filter(data => data.cqlId == reqId)[0].query)

  widgetMetaData.updateDataCache(dataMap, reqId);
  //2. check if any dependencies met?
  widgetMetaData.subscribeAndUpdate(reqId, dataMap);
}

export const parseResults = (...resultSpecs) => {
  return _.map(resultSpecs, ({ results, columns, groupColumns, groupsHaveOneRow, includeDrilldown, name }) => {
    // TODO: Tables are stripped for access convenience sake (e.g. row.studyid rather than row['study.studyid']. In some
    // cases that could cause collisions, though I believe that's unlikely in the CDM.
    let collapsedColumns = _.chain(columns)
      .map(c => c ? c.split('.').pop() : NaN)  // Remove the table name if one exists and convert falsies to NaN
      .uniq(true)  // Collapses all identical adjacent columns, except NaNs since they are not equal to themselves, thus not collapsing the falsies
      .value();
    let parsedRows = _.map(results, row => {
      // This creates an object mapping column names to the column values. It also parses the column values according
      // to their datatype.
      let parsedRow = _.chain(collapsedColumns)
        .zip(row.values, row.datatypes)
        .map(([name, value, dataType]) => [name, parseColumn(value, dataType)])
        .object()
        .value();
      // All the omitted columns are collapsed into a single key that we can trash here.
      if (_.has(parsedRow, NaN)) {
        parsedRow[NaN] = null;
      }
      if (includeDrilldown) {
        parsedRow.drilldown = row.drilldown;
      }
      return parsedRow;
    });
    let output;  // Store the desired output, so we can insert it into a name tuple later.
    if (groupColumns) {
      groupColumns = _.map(groupColumns, column => column.split('.').pop());
      output = _.groupBy(parsedRows, row => JSON.stringify(_.map(groupColumns, column => row[column])));
      if (groupsHaveOneRow) {
        output = _.mapObject(output, rows => rows[0]);
      }
    } else {
      output = parsedRows;
    }
    if (name) {
      return [name, output]
    } else {
      return output;
    }
  });
};

function aSynchronousPostRequest(options, cqlId, context, fileId = "") {
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
  ExposureActions.updateRequests(fileId, xhrReq);
  if (context.xhrRequests) {
    context.xhrRequests.push(xhrReq);
  }
  return xhrReq;
}

function asyncQuery(fileId, immQueryOptions, queryLogObject, qryWrapper, ignoreFilters, ignoreDrilldown, context) {
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

  var queries = qryWrapper.cqlQuery || qryWrapper.query;
  queries = _.isArray(queries) ? queries : [queries];
  ignoreFilters = _.isBoolean(ignoreFilters) ? ignoreFilters : false;
  ignoreDrilldown = _.isBoolean(ignoreDrilldown) ? ignoreDrilldown : false;
  // This allows us to support a list of queries, especially useful for migrating existing reports that assume
  // multiple queries in a single call.
  const immGranularQueryObject = isGranularQuery(queries[0]) ?
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

    const sessionKey = 'widgetContextFilter';
    const path = window.location.pathname.includes('tasks');
    let sessionData = path && context.taskFilters.length != 0 ? JSON.parse(context.taskFilters) : getObject(sessionKey);
    let tableName = queries[0]?.tableName;
    let isAppliedContextFilter = path ? (sessionData.length ? 1 : 0) : +getString('isAppliedContextFilter');

  if (sessionData?.length && tableName) {

    let contextFilter = sessionData.map((obj) => {
      if (!_.isEmpty(obj?.isApplied)) {
        return {
          "filterCql": `${obj.tableName}.${obj.columnName}`,
          "itemsSelected": obj?.isApplied || []
        }
      }
    })?.filter((obj) => obj);

    let contextParams = { 'contextFilterDatas': contextFilter }

    immQueryOptions = immQueryOptions.set('contextFilters', contextParams);
  }

  const url = `/api/files/${fileId}/data`;
  const sprStart = new Date();
  return aSynchronousPostRequest({ url: url, data: JSON.stringify(immQueryOptions) }, qryWrapper.cqlId, context, fileId);
}

function isGranularQuery(query) {
  return _.has(query, 'query');
}
const parseBase10Int = i => parseInt(i, 10);
const typeParser = {
  'Integer': parseBase10Int,
  'DateTime': parseBase10Int,
  'Date': parseBase10Int,
  'Decimal': d => parseFloat(d),
  'Null': n => null
};

function parseColumn(column, dataType) {
  if (_.has(typeParser, dataType)) {
    return typeParser[dataType](column);
  }
  return column;
}


module.exports = WidgetUtils;
