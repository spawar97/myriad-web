var Highcharts = require('highcharts/highstock')

require('highcharts/modules/gantt')(Highcharts);
require('highcharts/highcharts-more')(Highcharts);
require('highcharts/modules/no-data-to-display')(Highcharts);
require('highcharts/modules/exporting')(Highcharts);
require('highcharts/modules/heatmap')(Highcharts);
window.Highcharts = Highcharts;

var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM, { html } from 'react-dom-factories';

import 'datatables';
import 'datatables/media/css/jquery.dataTables.min.css'
import '../../stylesheets/modules/highcharts.scss';

import jsZip from 'jszip';
import 'datatables.net-buttons/js/buttons.html5';
window.JSZip = jsZip;

import mergeWith from 'lodash.mergewith';
window.mergeLodash=mergeWith;

import 'datatables.net-plugins/pagination/input';
import 'datatables.net-plugins/sorting/currency';
import 'datatables.net-plugins/sorting/natural';

import { PDFExportUtil } from '../util/PDFExportUtil';
var ExposureActions = require('../actions/ExposureActions');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');
var StatusMessageTypeConstants = require('../constants/StatusMessageTypeConstants');
// Uncomment when using color palettes.
// const HighchartsUtil = require('../util/HighchartsUtil');
var Util = require('../util/util');
import ContextMenu from './contextfilters/ContextMenu';
import WidgetHighchart from './contextfilters/WidgetHighchart';
import { getObject, getSessionIntegar, setObject } from '../util/SessionStorage';
import {FeatureListConstants, AccessPermissionsConstants} from '../constants/PermissionsConstants';
import AccountUtil from '../util/AccountUtil';
import PermissionsUtil from '../util/PermissionsUtil';

var div = DOM.div;

const fallbackPointFormatter = function() { return `<span style="color:${this.color}">\u25CF</span> ${this.series.name}: <b>${this.y}</b><br/>` };

// Globally disable Highchart chart animations.
// Highcharts.setOptions is moved here to prevent race condition happens when the component is mounted and in a middle
// of rendering, changing Highcharts.Options will cause another re-render.
Highcharts.setOptions({
  chart: {
    animation: false
  },
  global: {
    // The 'useUTC' option will cause *all* timestamps passed in as series data
    // to be interpreted and displayed as UTC values.
    useUTC: true
  },
  plotOptions: {
    series: {
      animation: false
    }
  },
  exporting: {
    enabled: false
  },
  lang: {
    noData: 'Based on current filters selections,<br>no data was returned.<br>Please reselect filter options.',
    addTask: 'Add a task'
  },
    noData: {
        style: {
          color: '#666666',
          fontSize: '1.6rem',
          fontWeight: 'normal'
        }
    },
});

// Because we allow multi selection from desktop devices, we need to check if whether the current device is mobile/tablet to
// apply the logic to prevent Highcharts from capturing scrolls on mobile devices.
if (Util.isNotDesktop()) {
  // patch from https://gist.github.com/ricardoferreira1980/5335186
  Highcharts.Chart.prototype.callbacks.push(function(chart) {
    var hasTouch = document.documentElement.ontouchstart !== undefined,
      mouseTracker = chart.pointer,
      container = chart.container;

    const mouseMove = function (e) {
      if (e && e.touches && e.touches.length > 1) {
        mouseTracker.onContainerTouchMove(e);
      }
      else {
        return;
      }
    }

    container.onmousemove = container.ontouchmove = mouseMove;
  });
}

var isAccumulatedSelection = function(event) {
  return event.shiftKey || event.ctrlKey || event.metaKey;
};

var inBoundingBox = function(selectionEvent, point) {
  return point.x >= selectionEvent.xAxis[0].min &&
    point.x <= selectionEvent.xAxis[0].max &&
    point.y >= selectionEvent.yAxis[0].min &&
    point.y <= selectionEvent.yAxis[0].max;
};

const appendAlternativeSuffix = function(key) {
  return key + ' Alternative';
};

// `accumulate` is true when using shiftClick, cmdClick or ctrlClick.
var updateDrilldownSelection = function(chart, reportId, point, accumulate) {
  if (_.isEmpty(reportId)) { return; }
  var points = chart.getSelectedPoints();
  if (!_.isUndefined(point)) {
    var index = points.indexOf(point);
    if (accumulate) {  // When accumulate is true, only toggle the point that is clicked.
      if (index !== -1) {
        points.splice(index, 1);
      } else {
        points.push(point);
      }
    } else {  // When accumulate is false, clear everything and select the point when it was not selected.
      points = [];
      if (index === -1) {
        points.push(point);
      }
    }
  }

  // Display error status message and reset when points selected exceeds allowed maximum.
  if (_.size(points) > ExposureAppConstants.HIGHCHART_MULTISELECT_MAX_POINTS) {
    points = [];
    ExposureActions.createStatusMessage(FrontendConstants.DRILLDOWN_SELECTION_LIMIT_EXCEED, StatusMessageTypeConstants.WARNING);
  }
  ExposureActions.drilldownUpdateCurrentSelectionCondition(reportId, chart.userOptions.key, _.chain(points).pluck('drilldown').compact().value());
  if (point && point.alternativeDrilldown) {
    ExposureActions.drilldownUpdateCurrentSelectionCondition(
      reportId, 
      appendAlternativeSuffix(chart.userOptions.key),
      _.chain(points).pluck('alternativeDrilldown').compact().value()
    );
  }
};

// Fetch the data-drilldown attribute and based on drilldown data redirect to particular dashboard
var drilldownFromYAxisLabel  = function(that, thisClass) {
  // get dataset from data-drilldown attribute
  let drilldown = JSON.parse(that.dataset.drilldown);
  ExposureActions.drilldownUpdateCurrentSelectionCondition(thisClass.props.reportId, null, [drilldown]);

  // Declare back params
  let backId = thisClass.props.dashboardId || (thisClass.props.immReport && thisClass.props.immReport.getIn(['fileWrapper', 'file', 'id']));
  let backRoute = thisClass.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
  let backParams = { fileId: backId };
  let backText = thisClass.props.dashboardId? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

  // Declare drilldown params
  let checkNoTooltip = thisClass.props.immAssociatedFiles.get('noTooltip') ? true : false
  let drilldownmap = checkNoTooltip ? (thisClass.props.immAssociatedFiles.get('noTooltip', thisClass.props.immAssociatedFiles || (Imm.Map()).entrySeq().first())) || [] : thisClass.props.immAssociatedFiles;
  let fileType, toRoute;  
  drilldownmap.mapEntries(([drilldownFileId, immDrilldownFile]) => {
    if (!checkNoTooltip){
      [drilldownFileId, immDrilldownFile] = (immDrilldownFile.get('noTooltip', immDrilldownFile || Imm.Map()).entrySeq().first()) || [];
    }
    fileType = immDrilldownFile && immDrilldownFile.get('fileType')
    // Ensure the data-drilldown selection is on the current DOM node to prevent race condition while
    // different Highchart component unmounts.
    toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW
    let drilldownFileData = immDrilldownFile.toJS();
    toRoute = Util.setNavigateRoutes(drilldownFileData, toRoute);
    _.defer(thisClass.transitionToRelated.bind(null, toRoute, drilldownFileId, null, backRoute,
      backParams, backText));
      ExposureActions.toggleFiltersPane(true)
  });
};

// The wrapper component around Highcharts. For more api information, visit http://api.highcharts.com/highcharts or http://api.highcharts.com/highmaps.
// There are more highcharts examples in yutani/frontend/src/main/java/com/comprehend/frontend/gxt/highcharts.
class Highchart extends React.Component {
  static displayName = 'Highchart';

  static propTypes = {
    configs: PropTypes.array.isRequired,
    // Used to set `immVizLegendStates` in `Dashboard`.
    handleUpdateVizLegend: PropTypes.func,
    height: PropTypes.any,  // number in pixel or string (i.e. '70vh').
    html: PropTypes.string,
    immAssociatedFiles: PropTypes.instanceOf(Imm.Map),
    immReport: PropTypes.instanceOf(Imm.Map),
    // Used to store changes in the visibility of particular series in charts.
    immVizLegendStates: PropTypes.instanceOf(Imm.Map),
    reportId: PropTypes.string,
    setRenderTime: PropTypes.func,
    width: PropTypes.number,
    isHomePage: PropTypes.bool,
    homePageDrilldownHelper: PropTypes.func,
    skipIndex: PropTypes.number,
  };

  static contextTypes = {
    router: PropTypes.object
  };

  static defaultProps = {
    height: '70vh',
    immAssociatedFiles: Imm.Map()
  };

  constructor(props) {
    super(props);
    this.state = {
      isAddTaskEnabled : false
    }
  }

  charts = null;

  addTaskFlag = (flag) => {
    this.setState({ isAddTaskEnabled: flag });
  }

  allowDataAttributes = () => {
    ['data-associated-id', 'data-chart-drilldown-key', 'data-drilldown', 'title', 'data-screen', 'onclick'].map((attr) => {
      Highcharts.AST.allowedAttributes.push(attr);
    })
  };

  handleDrilldown = (route, fileId, chartDrilldownKey, openInNewTab) => {
    var schemaId = Util.getComprehendSchemaIdFromFile(this.props.immReport.getIn(['fileWrapper', 'file']));
    // Wipe the state of any filters that have been set on the drilldown target.

    ExposureActions.clearFileFilterState(fileId);

    let drilldownHelper;
    if (openInNewTab) {
      drilldownHelper = window.location.origin + '/' + route.replace(' ', '-') + '/' + fileId + '?drilldownId='
    }
    else {
      drilldownHelper = this.props.isHomePage
      ? (query) => this.props.homePageDrilldownHelper(route, fileId, query)
      : (query) => this.context.router.push({name: route, params: {fileId}, query});
    }
      
    ExposureActions.drilldownHandleRelatedFile(this.props.immReport.getIn(['fileWrapper', 'file', 'id']), this.props.drilldownId, chartDrilldownKey, schemaId, drilldownHelper, openInNewTab);
    // Stop browser from navigating to `route/{fileId}` after `drilldown` query params already set.
    return false;
  };

  transitionToRelated = (route, fileId, chartDrilldownKey, backRoute, backParams, backText, openInNewTab = false) => {
    ExposureActions.pushBackNavAction(Imm.Map({text: backText, backAction: () => this.context.router.push({name: backRoute, params: backParams})}));
    this.handleDrilldown(route, fileId, chartDrilldownKey, openInNewTab, openInNewTab);
    if (route && route === RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS) {
      ExposureActions.selectedModuleOption(true);
    }
  };

  componentDidMount() {
    var self = this;
    var fileId = this.props.reportId;
    const backId = this.props.dashboardId || (this.props.immReport && this.props.immReport.getIn(['fileWrapper', 'file', 'id']));
    const backRoute = this.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
    const backParams = {fileId: backId};
    const backText = this.props.dashboardId? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

    // When the tooltips are created, we can't put a function on the `onClick` handler of the link element because it doesn't have access to the
    // functions in the component. jQuery comes in to add the `click` handler dynamically. The `off` is used to prevent multiple
    // handlers from being added on subsequent component mounts, otherwise one click might trigger many transitions.
    $(ReactDOM.findDOMNode(this)).off('click').on('click', '.associated-file-link', function() {
      const {associatedId, chartDrilldownKey, alternativeChartDrilldownKey} = $(this).data();
      const fileType = self.props.immAssociatedFiles.getIn([associatedId, 'fileType']);
      let toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;
     
      if (self.props.immAssociatedFiles && !self.props.immAssociatedFiles.isEmpty()) {
          const drilldownmap = self.props.immAssociatedFiles;
          //setting routing path for drilldown
          drilldownmap.mapEntries(([drilldownFileId, immDrilldownFile]) => {
            if(drilldownFileId.hasOwnProperty(associatedId) || drilldownFileId === '_all') {
              let drilldownFileData = immDrilldownFile.toJS();
              toRoute = Util.setNavigateRoutes(drilldownFileData[associatedId], toRoute);
            }      
          })
      }
      
      if (alternativeChartDrilldownKey) {
        self.transitionToRelated(toRoute, associatedId, alternativeChartDrilldownKey, 
          backRoute, backParams, backText);
      } else {
        self.transitionToRelated(toRoute, associatedId, chartDrilldownKey, 
          backRoute, backParams, backText);
      }
    });
    $(ReactDOM.findDOMNode(this)).off('mouseenter').on('mouseenter', '.tooltip-clone', () => {
      this.hideAllTooltips = true;
    });
    $(ReactDOM.findDOMNode(this)).off('mouseleave').on('mouseleave', '.tooltip-clone', () => {
      this.hideAllTooltips = false;
    });
    this.renderHighchart();
    this.allowDataAttributes();
    
    if (this.props.immAssociatedFiles && !this.props.immAssociatedFiles.isEmpty()) {
      const checkNoTooltip = this.props.immAssociatedFiles.get('noTooltip') ? true : false
      const drilldownmap = checkNoTooltip ? (this.props.immAssociatedFiles.get('noTooltip', this.props.immAssociatedFiles || (Imm.Map()).entrySeq().first())) || [] : this.props.immAssociatedFiles;
      const drilldownableElements = $(ReactDOM.findDOMNode(this)).find('*[data-drilldown]');
      let fileType, toRoute;  
        drilldownmap.mapEntries(([drilldownFileId, immDrilldownFile]) => {
          if (!checkNoTooltip){
             [drilldownFileId, immDrilldownFile] = (immDrilldownFile.get('noTooltip', immDrilldownFile || Imm.Map()).entrySeq().first()) || [];
          }
          fileType = immDrilldownFile && immDrilldownFile.get('fileType')
          // Ensure the data-drilldown selection is on the current DOM node to prevent race condition while
          // different Highchart component unmounts.
          toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW
          _.each(drilldownableElements, element => {
            $(element).click(() => {
              try {
                const drilldown = JSON.parse(element.getAttribute('data-drilldown'))
                // get all elements with the attribute data-drilldown-key
                const drilldownKeyElement = JSON.parse(element.getAttribute('data-drilldown-key'))
                // Comparing the text from the cqs to the title of the report
                let textContent = element.textContent && element.textContent.trim();

                if (drilldownKeyElement && (textContent === immDrilldownFile.get("title"))) {
                  ExposureActions.drilldownUpdateCurrentSelectionCondition(this.props.reportId, null, [drilldown])
                  let drilldownFileData = immDrilldownFile.toJS();
                  toRoute = Util.setNavigateRoutes(drilldownFileData, toRoute);
                  
                  _.defer(this.transitionToRelated.bind(null, toRoute, drilldownFileId, null, backRoute, backParams, backText));
                  ExposureActions.toggleFiltersPane(true)
                }
                if (drilldownKeyElement < 1){
                  ExposureActions.drilldownUpdateCurrentSelectionCondition(this.props.reportId, null, [drilldown]);
                  _.defer(this.transitionToRelated.bind(null, toRoute, drilldownFileId, null, backRoute, backParams, backText));
                  ExposureActions.toggleFiltersPane(true)
                }
              } catch (e) {
                console.log(`%cERROR: Cannot perform drilldown for reportId: ${this.props.reportId}. Error: ${e}`, 'color: #E05353');
              }
            });
          });
        })
      }
  
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //This code is here for the functionality of the 'Portfolio Summary Dashboard' This will likely be moved into a utility
    //class later on, but it needs to be here for the time being.
    const fileIdentifier = self.props.immReport && self.props.immReport.getIn(['fileWrapper', 'file', 'identifier'], '') || '';
    if (fileIdentifier === 'PORTFOLIO_SUMMARY') {
      function export_table_to_csv(html, filename, table) {
        var csv = [];
        var headerRow = [];
        var rows = $(table.fnGetNodes()).each(function(){})
        var headers = $('.portfolio-table')[0].tHead.getElementsByTagName("th");

        for (var i = 0; i < headers.length; i++) {
          headerRow.push(headers[i].innerText);
        }
        csv.push(headerRow.join(","));

        for (i = 0; i < rows.length; i++) {
          var csvRow = []

          for (var j = 0; j < headers.length; j++)
            csvRow.push(rows[i].cells[j].getElementsByClassName("value")[0].innerText);
          csv.push(csvRow.join(","));
        }

        var csvFile = csv.join("\n");
        ExposureActions.exportFileData(fileId,undefined,'CSV',undefined, undefined, rows.length, csvFile);
      }

      $(document.getElementById("portfolio-button")).click( function () {
        var html = $(".portfolio-table").outerHTML;
        var table = $('.portfolio-table').dataTable();
        export_table_to_csv(html, "Portfolio Summary.csv", table);
      });
    }

    // PDF Export Code
    PDFExportUtil.pdfExportDataProcess(self.props, ExposureAppConstants.REPORT_TYPE_GRAPHICAL);

    _.defer(this.storeHighchartContext,this);

    let currentWidgetUpdating = getSessionIntegar('currentWidgetUpdating');

    if (currentWidgetUpdating) {      
      let prev = getObject('renderedWidget') ? getObject('renderedWidget') : [];
      let newItem = prev ? [...prev, currentWidgetUpdating] : [currentWidgetUpdating];
      setObject('renderedWidget', newItem);
    }

  }

  async storeHighchartContext(that) {
   return await ExposureActions.loadedPrimeTableComponent(that);
  }

  componentDidUpdate(prevProps) {
    // We're making sure that we're updating just because of a resize
    // in which case we just want to reflow, if we're updating something structural
    // to the chart, we want to re-render the whole chart. This was done
    // to prevent UI delays triggered by expensive re-renders on size changes.
    // These conditions should be kept in sync with what is being checked in shouldComponentUpdate.
    if ((prevProps.width !== this.props.width || prevProps.height !== this.props.height) && _.isEqual(this.props.configs, prevProps.configs) && this.props.html === prevProps.html && Imm.is(this.props.immAssociatedFiles, prevProps.immAssociatedFiles)) {
      _.each(this.charts, function(chart) {
        chart ? chart.reflow() : null;
      });
    } else {
      if (this.props.reportId !== prevProps.reportId) {
        ExposureActions.drilldownUpdateCurrentSelectionCondition();
      }
      this.renderHighchart();
    }
  }

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props.configs, nextProps.configs) ||
      !Imm.is(this.props.immAssociatedFiles, nextProps.immAssociatedFiles) ||
      this.props.height !== nextProps.height ||
      this.props.width !== nextProps.width ||
      this.props.html !== nextProps.html ||
      this.props.skipIndex !== nextProps.skipIndex;
  }

  componentWillUnmount() {
    // Remove the handlers we added in componentDidMount.
    $(ReactDOM.findDOMNode(this)).off('click', 'mouseenter', 'mouseleave');
    // Ensure the data-drilldown selection is on the current DOM node to prevent race condition while
    // different Highchart component mounts and incorrectly attach drilldownFileId to the data-drilldown div.
    const drilldownableElements = $(ReactDOM.findDOMNode(this)).find('*[data-drilldown]');
    _.each(drilldownableElements, element => $(element).off('click'));
    // Only try to update drilldown conditions if this is a proper (non-preview) report.
    if (this.props.reportId) {
      ExposureActions.drilldownUpdateCurrentSelectionCondition();
    }
  }

  onClickDataPointHandler = (event, pointContext) => {

    let { tableName, columnName } = pointContext.series.userOptions.custom;

    let currentWidgetName = pointContext.series.chart.title.textStr; 
    let selectedPointValue = pointContext?.name || pointContext?.category;
    let reportData = this.props.immReport.get('reportData')?.toJS();
    let immStore = this.props?.immExposureStore?.toJS()
 
    Util.saveAndPublishEvent(reportData, currentWidgetName, String(selectedPointValue), tableName, columnName, pointContext, immStore);
  }

  addWidgetFilterContext(event, pointContext) {

     this.onClickDataPointHandler(event, pointContext);
  }

  unmountCustomContextMenu = (contextMenu) => {
    let allNodes = Array.from(document.querySelectorAll("*[id^=custom-cnt-highcharts]"));
    allNodes?.map(ele => {
      ele ? ReactDOM.unmountComponentAtNode(ele) : null;     // unmount & deattach event from node component  
      ele?.remove();
    });

  }

  composeConfig = (renderToNode, conf) => {
    var reportId = this.props.reportId;
    var that = this;
    let customContextDiv = [];
    let reportData = that.props.immReport?.toJS().reportData;
    let immExposureStore = that.props.immExposureStore;
    let dashboardCustomConfigs = reportData?.dashboardCustomConfigs && Object.keys(reportData?.dashboardCustomConfigs).length;
    let userHasCreateTask = immExposureStore? AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask') && 
                              PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT): true

    // Set default Highcharts config variables here.
    var config = $.extend(
      true,  // Merge recursively
      {
        chart: {
          renderTo: renderToNode,
          events: {
            render: function () {   
              
              if (dashboardCustomConfigs && userHasCreateTask && !immExposureStore.toJS().isViewTasks) {
                var chart = this;

                for (var j in chart.series) {
                  var series = chart.series[j];
                  for (var i in series.data) {
                    (function(i) {
                      var point = series.data[i];
                      if (point.graphic) {
                        point.graphic.on('contextmenu', function(e) {

                          e.preventDefault();
                          let contextMenu = customContextDiv?.length ? customContextDiv[0] : null;
                          that.unmountCustomContextMenu(contextMenu);

                          let props = {
                            currentPoint: e,
                            componentThis: that,
                            currentChart: chart
                          }

                          let chartId = chart.container.id;
                          let domElement = document.getElementById(chartId);
                          let customElement = `custom-cnt-${domElement.id}`;
                          $(`<div id=${customElement}></div>`).insertAfter(domElement)
        
                          ReactDOM.render(<ContextMenu {...props} unmountCustomContextMenu={that.unmountCustomContextMenu}/>, document.getElementById(customElement));
                          
                          customContextDiv.push(customElement);      
                        });
                      }
                    })(i)
                  }
                }

              }
            },
            click: function() {
              let contextMenu = customContextDiv.length ?customContextDiv[0] : null;
              that.unmountCustomContextMenu(contextMenu);
            }
          }
        },
        credits: {
          enabled: false
        },
        tooltip: {
          backgroundColor: 'rgba(77, 77, 77, 0.95)',  // Gray70 in rgba with 95% alpha.
          style: {
            color: '#ffffff'
          }
        },
        plotOptions: {
          series: {
            allowPointSelect: true,
            cursor: 'pointer',
            point: {
              events: {
                click: function (event) {
                  let title =  this.series.chart.title.textStr;
                  let isAddTaskEnabled = that.state.isAddTaskEnabled;

                  if (reportData?.dashboardCustomConfigs?.FilterDependentWidget.includes(title) && !isAddTaskEnabled) {
                    that.addWidgetFilterContext(event, this);
                  } else if (isAddTaskEnabled) {
                    let { fileType, id } = that.props.immReport?.toJS()?.fileWrapper?.file;
                    that.props?.showAddTaskPanel(id, fileType);
                  }

                }
              }
            }
          }
        }
      },
      conf);

    const chartType = config.chartType || config.chart.type;
    // The Drilldown tooltip requires that all custom tooltip definition be defined as a pointFormatter or formatter.
    // If neither of those exist, we will use the default `pointFormat` from Highcharts (which is converted into a
    // formatter function below.
    // TODO: Find out how to use Highcharts to automatically create a formatter from a format string.
    // TODO: Grab the other formatter if it exists
    var pointFormatter = (conf.tooltip && conf.tooltip.pointFormatter) || fallbackPointFormatter;

    const drilldownKey = conf.drilldownKey || '_all';
    const associatedFiles = _.values(this.props.immAssociatedFiles.get(drilldownKey, Imm.Map()).toJS());

    var HighchartLib;
    // Highcharts and Highstock shares the same chart.type. `chartType` is used to indicate which library to use.
    // We'll remove `chartType` after figuring out which library to used since `chartType` isn't a
    // Highcharts/Highstock configuration field.
    switch(chartType) {
      case 'map':
        // Only load it when we need it because we're doing lazy loading.
        // Because webpack module caching mechanism ensures that the same code will not be required and
        // evaluated multiple times, it's OK to require in renderHighchart and in _.each loop.
        require('highcharts/modules/map')(Highcharts);
        if (config.series) {
          _.each(config.series, function(series) {
            switch(series.mapData) {
              case 'world':
                require('../resources/WorldMap');
                break;
              case 'Europe':
                require('../resources/EuropeMap');
                break;
              case 'US':
                require('../resources/USMap');
            }
            series.mapData = Highcharts.geojson(Highcharts.maps[series.mapData]);
          });
        }
        HighchartLib = Highcharts.Map;
        break;
      case 'stock':
        HighchartLib = Highcharts.StockChart;
        break;
      case 'gantt':
        HighchartLib = Highcharts.GanttChart;
        break;
      default:
        HighchartLib = Highcharts.Chart;
    }

    delete config.chartType;

    if (config.key) {
      /*
       * Unlike most charts (such as column, line, scatter, etc.), pie chart operates on points instead of series.
       * We had to add various check (config.chart.type === 'pie') here to ensure we're looking at the correct spot.
       */
      const legendEvent = {
        events: {
          legendItemClick: event => {
            if (this.props.immVizLegendStates) {
              this.props.handleUpdateVizLegend(this.props.immVizLegendStates.setIn([config.key, event.target.name], config.chart.type === 'pie' ? !event.target.visible : event.target.selected));
            }
          }
        }
      };

      // $.extend for a deep copy.
      $.extend(true, config, {
        plotOptions: config.chart.type === 'pie' ? {pie: {point: legendEvent}} : {series: legendEvent}
      });

      if (this.props.immVizLegendStates && this.props.immVizLegendStates.has(config.key)) {
        _.each(config.chart.type === 'pie' ? config.series[0].data : config.series, item => {
          // Force `visible: undefined` to be true because pie chart display `visible: undefined` as hidden whereas other chart display `visible: undefined` as visible.
          item.visible = this.props.immVizLegendStates.getIn([config.key, item.name], _.isUndefined(item.visible) ? true : item.visible);
        });
      }
    }

    if (config.chart.enableDrilldown) {
      delete config.chart.enableDrilldown;
      $.extend(
        true,
        config,
        {
          chart: {
            // Override zooming for lasso selection.
            zoomType: 'xy',
            events: {
              click: function() {
                // If you click on the chart background, clear points.
                _.forEach(this.getSelectedPoints(), function(point) {
                  point.select(false);
                });
              },
              selection: function(event) {
                if (
                  !(event.hasOwnProperty("resetSelection") &&
                    event.resetSelection)
                ) {
                  return true
                }
                // When accumulate is false, clear everything.
                if (!isAccumulatedSelection(event.originalEvent)) {
                  _.forEach(this.getSelectedPoints(), function(point) {
                    point.select(false);
                  });
                }
                _.chain(this.series)
                  .map(function(series) {
                    return series.data
                  })
                  .flatten(true)
                  .filter(function(point) {
                    return inBoundingBox(event, point);
                  })
                  .each(function(selectedPoint) {
                    selectedPoint.select(true, true);
                  });
                updateDrilldownSelection(this, reportId);

                // Prevent the chart from zooming.
                return false;
              }
            }
          },
          tooltip: {
            animation: false,
            useHTML: true,
            formatter: function() {
              // If the chart is hiding all tooltips, or we're hiding the drilldownTooltip for selected points on this chart,
              // then don't render any tooltip
              if (that.hideAllTooltips || ((this.point && this.point.selected) && (this.series && this.series.chart && this.series.chart.skipDrilldownTooltip))) {
                return false;  // In the Highcharts formatter API, return false prevents a tooltip from being displayed.
              }
              // This is a timeout so that it will execute right after the tooltip is done formatting.
              setTimeout(() => {
                const tooltipBounds = this.series.chart.tooltip.label.element.getBoundingClientRect();
                const clonedBounds = this.series.chart.svg ? this.series.chart.svg.getBoundingClientRect() : null;
                if (!this.series.chart.tooltip.isHidden &&  // If the tooltip is not visible, don't bother checking further.
                  clonedBounds &&  // If we don't have a cloned tooltip, also don't bother.
                  !(clonedBounds.left > tooltipBounds.right ||
                  clonedBounds.right < tooltipBounds.left ||
                  clonedBounds.top > tooltipBounds.bottom ||
                  clonedBounds.bottom < tooltipBounds.top)) {
                  // They intersect, so set opacity of cloned text to 0.4.
                  $('div.tooltip-clone *', this.series.chart.container).css('opacity', 0.4);

                  // Start checking at intervals equal to the length of the hide timer if we can restore the opacity.
                  // 500ms is the default hide delay in the Highcharts source code.
                  const restoreTimeoutFunction = () => {
                    if (this.series.chart.tooltip.isHidden) {
                      // The tooltip has disappeared, so we should restore the opacity of the cloned tooltip.
                      $('div.tooltip-clone *', this.series.chart.container).css('opacity', 1);
                    } else {
                      // Tooltip is still there, we should continue checking.
                      setTimeout(restoreTimeoutFunction, this.series.chart.tooltip.options.hideDelay || 500);
                    }
                  };
                  setTimeout(restoreTimeoutFunction, this.series.chart.tooltip.options.hideDelay || 500);
                } else {
                  // If our overlap conditions weren't met, restore opacity.
                  $('div.tooltip-clone *', this.series.chart.container).css('opacity', 1);
                }
              });
              let chartDrilldownKey = this.series.chart.userOptions.key 
                                        ? this.series.chart.userOptions.key : '';
              if (this.point.selected) {
                if (!this.series.chart.cloned) {
                  const getDrilldowndisplayComponent = (memo, associatedFile) => {
                    if (this.point && this.point.alternativeDrilldown && associatedFile.reportConfig
                      && associatedFile.reportConfig.reportType === "TABULAR"
                      && !chartDrilldownKey.isEmpty) {
                      chartDrilldownKey = appendAlternativeSuffix(chartDrilldownKey);
                    }
                    return `${memo}<div class="associated-file-link"
                      data-associated-id="${associatedFile.id}"
                      data-chart-drilldown-key="${chartDrilldownKey}">
                      ${associatedFile.title}</div>`; 
                  };
                  return _.reduce(associatedFiles, getDrilldowndisplayComponent,
                    '<div class="drilldown-tooltip-title">Drilldowns</div>');
                } else {
                  return false;
                }
              }
              return pointFormatter.call(this.point);
            }
          },
          plotOptions: {
            pie: {
              tooltip: {
                followPointer: false
              }
            },
            bubble: {
              tooltip: {
                followPointer: false
              }
            },
            series: {
              allowPointSelect: true,
              cursor: 'pointer',
              point: {
                events: {
                  click: function(event) {
                    updateDrilldownSelection(this.series.chart, reportId, this, isAccumulatedSelection(event));

                    // Execute any post-click events
                    if (this.events.custom && this.events.custom.afterClick) {
                      this.events.custom.afterClick(event, this);
                    }
                  },
                  select: function(event) {
                    // This flag is used when a KPI has multiple charts with shared points, and we programmatically select points
                    // on the other charts, and don't want to display the drilldown tooltip.
                    if (!this.series.chart.skipDrilldownTooltip) {
                      // This is in a timeout so that we allow the tooltip to know the point is selected when we refresh it.
                      setTimeout(() => {
                          if (!!this.series) {
                            that.deleteTooltipClone(this.series.chart);
                            this.series.chart.tooltip.refresh(this);

                            that.createTooltipClone(this.series.chart);

                            this.series.chart.cloned = this;
                          }
                        },
                        100); // TODO: See comment below.
                    }

                    // Execute any post-select events
                    if (this.events.custom && this.events.custom.afterSelect) {
                      this.events.custom.afterSelect(event, this);
                    }
                  },
                  unselect: function(event) {
                    if (!this.series.chart.skipDrilldownTooltip) { // This is in a timeout so that we allow the tooltip to know the point is unselected when we refresh it.
                      setTimeout(() => {
                        that.deleteTooltipClone(this.series.chart);
                        this.series.chart.tooltip.refresh(this);
                      }, 50); // TODO: Is there a less hacky way to do this? We need these callbacks to come in order, unselect first, so I arbitrarily spaced them out 50ms. _.defer was not consistent
                    }

                    // Execute any post-unselect events
                    if (this.events && this.events.custom && this.events.custom.afterUnselect) {
                      this.events.custom.afterUnselect(event, this);
                    }
                  }
                }
              },
            }
          }
        }
      );
    }

    /*enable zoom forcelly*/
    if (config.chart && config.chart.enableZoomForcely &&  config.chart.hasOwnProperty('events')) {
      config.chart.events.selection = function (event) {
        if (
          !(event.hasOwnProperty("resetSelection") &&
            event.resetSelection)
        ) {
          // When accumulate is false, clear everything.
          if (!isAccumulatedSelection(event.originalEvent)) {
            _.forEach(this.getSelectedPoints(), function (point) {
              point.select(false);
            });
          }
          _.chain(this.series)
            .map(function (series) {
              return series.data;
            })
            .flatten(true)
            .filter(function (point) {
              return inBoundingBox(event, point);
            })
            .each(function (selectedPoint) {
              selectedPoint.select(true, true);
            });
          updateDrilldownSelection(this, reportId);
        }
        return true;
      };
    }

    if (config.chart.enableyAxisDrilldown) {
      delete config.chart.enableyAxisDrilldown;
      $.extend(
        true,
        config,
        {
          chart: {
            events: {
              redraw: function() {
                let axisItems = document.getElementsByClassName('highcharts-axis-labels highcharts-yaxis-labels');
                if(axisItems) {
                  for (let i = 1; i <= axisItems.length; i++) {
                    let child = document.getElementsByClassName('highcharts-axis-labels highcharts-yaxis-labels')[i] ? document.getElementsByClassName('highcharts-axis-labels highcharts-yaxis-labels')[i].children : null;
                    child && child.forEach(function (label) {
                      label.lastElementChild && label.lastElementChild.addEventListener('click', function (e) {
                        drilldownFromYAxisLabel(this, that)
                      });
                    });
                  }
                }
              }
            }
          },
        }
      );
    }
    return new HighchartLib(config);
  };

  /**
   * By looking for the svg tag, we are agnostic to the ordering of elements inside the highcharts container.
   */
  findSvg = (chart) => {
    return _.find(chart.container.children, n => n.tagName.toLowerCase() === 'svg');
  };

  /**
   * In order to support a drilldown tooltip, we clone the tooltip so that we can effectively have 2 tooltips displayed at once.
   * The following code was heavily influenced by Torstein Hønsi's initial work found here: http://jsfiddle.net/SeCAB/45/
   */
  createTooltipClone = (chart) => {
    // Clone the background of the tooltip.
    chart.svg = chart.tooltip.label.element.cloneNode(true);

    // Clone the text of the tooltip.
    chart.html = $('div.highcharts-tooltip', chart.container).not('.tooltip-clone').clone().addClass('tooltip-clone').css({'transition': 'opacity 0.2s ease-in',  'pointer-events': 'all'});

    // Ensure that the original tooltip is hidden when we replace it with a clone to prevent weird issues with our
    // tooltip overlap fade-in/fade-out code.

    // Force immediate hiding of the old tooltip's rectangle.
    chart.tooltip.label.hide();
    // Doing this here explicitly prevent a race-condition where a neighboring tooltip begins rendering before .hide()
    // below sets it to isHidden, which causes the tooltip formatter to malfunction.
    chart.tooltip.isHidden = true;
    // Ensure any additional hidden flags are set and timers are removed.
    chart.tooltip.hide();

    // This timeout ensures this runs right after the hiding operations.
    setTimeout(() => {
      // Insert the cloned tooltip rect into the original svg container before the real one, so that it is rendered below it.
      this.findSvg(chart).insertBefore(chart.svg, chart.tooltip.label.element);

      // Insert the cloned text of the tooltip.
      $(chart.container).append(chart.html);
    });

  };

  deleteTooltipClone = (chart) => {
    if (chart.svg) {
      let svgNode = this.findSvg(chart);
      // If we're synchronizing multiple charts, chart.svg may not actually be a child of the SVG node
      // Use jquery contains instead of Node.contains because IE10 doesn't support Node.contains
      if (svgNode && $.contains(svgNode, chart.svg)) {
        // This removes the cloned SVG element from the DOM.
        svgNode.removeChild(chart.svg);
        // We are ready to accept a new tooltip clone.
        chart.svg = undefined;
      }

    }
    if (chart.html) {
      // This removes the cloned HTML from the DOM.
      chart.html.remove();
      // We are ready to accept a new tooltip clone.
      chart.html = undefined;
    }
    chart.cloned = null;
    this.hideAllTooltips = false;  // When the clone gets deleted while the mouse is over (so no mouseleave event happens), we re-enable tooltip.
  };

  getCurrentNodeAndResizeElementHeight = ($chartDOMNode, idx) => {
    var currentNode = $chartDOMNode.find('[index="' + idx + '"]')[0];
    var $currentNode = $(currentNode);
    if (!$currentNode.attr('noresize')) {
      $currentNode.height(this.props.height);
    }
    return currentNode;
  };

  renderHighchart = () => {
    var chartDOMNode = ReactDOM.findDOMNode(this.refs['highchart']);
    if (_.size(this.props.configs) === 1 && !this.props.html) {
      this.charts = [this.composeConfig(chartDOMNode, this.props.configs[0])];
    } else {
      this.charts = new Array(this.props.configs.length);
      var $chartDOMNode = $(chartDOMNode);
      _.each(this.props.configs, (conf, idx) => {
        // Do not render the skip index
        if (idx !== this.props.skipIndex) {
          // We delay the rendering of each chart in order to reduce the time to
          // first chart render. This also helps keep us from blocking the main UI
          // thread for too long.
          _.delay(() => {
            const element = this.getCurrentNodeAndResizeElementHeight($chartDOMNode, idx);
            const setRenderTime = Util.getGuardedCallback(this.props.setRenderTime);
            this.charts[idx] = this.composeConfig(element, conf);
            // Record the rendering of the first chart and the last chart. If
            // there is only one chart, record both.
            const renderTime = new Date() - window.comprehend.startRenderTime;
            if (idx === 0) {
              setRenderTime('firstChartRenderTime', renderTime);
            }
            if (idx === this.props.configs.length - 1) {
              setRenderTime('lastChartRenderTime', renderTime);
            }
            // The 50ms gap between each render will give the browser a hint to render each chart sequentially as they are available
            // as opposed to waiting until all are done before repainting the screen.
            // TODO: It is possible to explicitly trigger browser repaint instead of putting delays. Investigate the options and see their cross browser compatibility.
          }, 50 * idx);
        }
      });
    }
  };

  exposeConfig = (configs) => {
    const exposedConfigs = _.map(configs, ({chart, title, series}) => ({
      chart: _.pick(chart, 'type'),
      title,
      series: _.map(series, ({name, data}) => ({
        name,
        // For some series, the data can just be an array of numbers or strings.
        data: _.map(data, row => _.isObject(row) ? _.pick(row, 'name', 'x', 'y') : row)
      }))
    }));
    return JSON.stringify(exposedConfigs);
  };


  render() {

    let reportData = this.props.immReport?.toJS().reportData;
    let dashboardCustomConfigs = reportData?.dashboardCustomConfigs;
    let isWidgetizationEnabled = dashboardCustomConfigs  && Object.keys(dashboardCustomConfigs).length

    return isWidgetizationEnabled ?
      <WidgetHighchart 
        ref='highchart'
        that={this}
      /> :
      div(null,
        div({
          className: 'highchart',
          ref: 'highchart',
          style: _.isEmpty(this.props.html) || !this.props.html.match(/noresize=/) ? { height: this.props.height } : null,
          dangerouslySetInnerHTML: this.props.html ? {
            __html: this.props.html
          } : null
        }),
        div({ className: 'exposed-config' }, this.exposeConfig(this.props.configs)));
  } 
  
}

module.exports = Highchart;
