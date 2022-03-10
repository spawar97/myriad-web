var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
var Imm = require('immutable');
var _ = require('underscore');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
var Moment = require('moment');
var question = require('../../../images/question-circle.png');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));
var DateRange = React.createFactory(require('../DateRange'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var Highchart = React.createFactory(require('../Highchart'));
var Spinner = React.createFactory(require('../Spinner'));
var AppRequest = require('../../http/AppRequest');
var ExposureActions = require('../../actions/ExposureActions');
var DataMonitorVizColorConstants = require('../../constants/DataMonitorVizColorConstants');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var Util = require('../../util/util');
var MonitorUtil = require('../../util/MonitorUtil');

var div = DOM.div;
var span = DOM.span;
var a = DOM.a;

// MAX_Y_AXIS_SCALE and MIN_Y_AXIS_SCALE are used by the axis to add some top and bottom padding.
const MAX_Y_AXIS_SCALE = 1.1;
const MIN_Y_AXIS_SCALE = 0.9;
// THRESHOLD_MIN_Y_AXIS_SCALE and THRESHOLD_MAX_Y_AXIS_SCALE are used in calculating the `arearange` series coverage
// area so that it extends past the highest/lowest result point.
const THRESHOLD_MIN_Y_AXIS_SCALE = 0.7;
const THRESHOLD_MAX_Y_AXIS_SCALE = 1.3;

// Highstock z-index constants;
const PREVIEW_SHADE_Z_INDEX = 2;
const MONITOR_RUN_SERIES_Z_INDEX = 3;
const ERROR_SERIES_Z_INDEX = 4;
const CHANGES_PLOT_LINE_Z_INDEX = 5;
const TRENDLINE_WIDTH = 2.5;

class DataMonitorViz extends React.Component {
  static displayName = 'DataMonitorViz';

  static propTypes = {
    cancelPreview: PropTypes.func.isRequired,
    fetchMonitorData: PropTypes.func.isRequired,
    fileId: PropTypes.string.isRequired,
    handlePreviewRequest: PropTypes.func.isRequired,
    immMonitor: PropTypes.instanceOf(Imm.Map).isRequired,
    filterBreachOnly: PropTypes.bool,
    immMonitorAudits: PropTypes.instanceOf(Imm.List),
    immMonitorResults: PropTypes.instanceOf(Imm.List),
    immMonitorTasks: PropTypes.instanceOf(Imm.List),
    immPreviewMonitorResults: PropTypes.instanceOf(Imm.List),
    initialEndTime: PropTypes.number,
    initialStartTime: PropTypes.number,
    isEditableAndInConfiguration: PropTypes.bool,
    isPreviewDisplayed: PropTypes.bool,
    monitorBreachData: PropTypes.array,
    togglePreviewDisplay: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedMonitorResult: {
        jobStartedAt: null,
        whatIdentifier: null
      },
      visibleMonitorTrendlines: props.visibleMonitorTrendlines,
      startTime: props.initialStartTime,
      endTime: props.initialEndTime
    };
  }

  componentDidUpdate() {
    // Override the default HighStocks range input onChange behavior to prevent
    // it from snapping only to available points and thus preventing expanding the
    // visible date range.
    var highchartsRef = this.refs['monitor-viz'];
    if (highchartsRef) {
      // Usually Highcharts caches charts in `Highcharts.charts`, and the last one in the array is
      // the current chart. In this case we are looking up the chart by it's ref, so there is only
      // one chart in the array.
      var chart = highchartsRef.charts[0];
      _.each($('.highcharts-range-selector'), rangeSelector => {
        rangeSelector.onchange = this.overrideInputOnChange.bind(null, chart);
      });
    }
  }

  // Ensure that we don't rerender the chart every time we change the parent's configuration state.
  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  componentWillUpdate(nextProps) {
    if (_.isNull(this.state.startTime)) {
      this.state.startTime = nextProps.initialStartTime;
      this.state.endTime = nextProps.initialEndTime;
    }
  }

  // This is the click handler for the `Render` button that starts previews.
  handlePreviewRender = () => {
    // If the user is in current view, we need to fetch preview data and toggle to preview view.
    this.props.handlePreviewRequest(this.state.startTime, this.state.endTime);
  };

  // Get the series the "extra" value in the monitor result
  getExtraSeries = (immSuccessRuns, previewStartTime, previewEndTime) => {
    if (immSuccessRuns.isEmpty() || immSuccessRuns.flatMap(immMonitorResult => {
          return Imm.fromJS(immMonitorResult.has('extra') ? [immMonitorResult.get('extra')] : []);
        }).isEmpty()) {
      // All we have is errors, return an empty array.
      return [];
    }

    var extraSeriesLabel = this.props.immMonitor.getIn(['monitor', 'extraLabel']) || 'Extra';

    var extraSeries = immSuccessRuns.map(immMonitorResult => {
      var timestamp = MonitorUtil.getResultTimestamp(immMonitorResult);
      return Imm.Map({
        x: timestamp,
        name: Util.dateFormatUTCYYYYMMDDHHmm(timestamp),
        y: immMonitorResult.get('extra')
      });
    });

    return [{
      // Add an id here to be able to recognize it later.
      id: 'extra-line',
      data: extraSeries.toJS(),
      lineWidth: 1,
      color: '#323232', // From mockup
      connectNulls: false,
      enableMouseTracking: true,
      stickyTracking: false,
      zoneAxis: 'x',
      zones: previewStartTime && previewEndTime ? [{
        value: previewStartTime
      }, {
        value: previewEndTime,
        dashStyle: 'dash'
      }] : null,
      tooltip: {
        followPointer: true,
        pointFormat: extraSeriesLabel + ': <b>{point.y}</b>'
      },
      states: {
        hover: {
          enabled: false
        }
      },
      marker: {
        enabled: false
      }
    }];
  };

  getThresholdSeries = (immSuccessRuns, minY, maxY, previewStartTime, previewEndTime) => {
    var getYValues;

    if (immSuccessRuns.isEmpty()) {
      // All we have is errors, return an empty array.
      return [];
    }

    // Note that we assume these threshold values are ordered
    switch (this.props.immMonitor.getIn(['monitor', 'thresholdType'])) {
      case ExposureAppConstants.MONITOR_THRESHOLD_TYPE.UPPER_BAND.value:
        getYValues = (maxBound, threshold, prevMaxY, prevMinY) => {
          return [_.min([prevMinY, maxBound * THRESHOLD_MAX_Y_AXIS_SCALE]), threshold];
        };
        break;
      case ExposureAppConstants.MONITOR_THRESHOLD_TYPE.LOWER_BAND.value:
        getYValues = (maxBound, threshold, prevMaxY, prevMinY, minBound) => {
          return [threshold, _.max([prevMaxY, minBound * THRESHOLD_MIN_Y_AXIS_SCALE])];
        };
        break;
      // TODO: Implement other threshold types.
    }

    // {threshold0, threshold1, ...} x {arearange, line} x {# of dataframes}, so:
    // [frame1: [threshold1 - arearange, threshold1 - line, threshold2 - arearange, threshold2 - line],
    //  frame2: [threshold1 - arearange, threshold1 - line, threshold2 - arearange, threshold2 - line], ...]
    var immRawCommonThresholds = immSuccessRuns.map(immMonitorResult => {
      var [prevHigh, prevLow] = [-Infinity, Infinity];

      // flatMap over all the thresholds
      return immMonitorResult.get('commonThreshold').flatMap(threshold => {
        var [high, low] = getYValues(maxY, threshold, prevHigh, prevLow, minY);
        [prevHigh, prevLow] = [high, low];

        var timestamp = MonitorUtil.getResultTimestamp(immMonitorResult);
        var immThreshold = Imm.Map({
          x: timestamp,
          name: Util.dateFormatUTCYYYYMMDDHHmm(timestamp)
        });

        return Imm.List([
          // Area range point.
          immThreshold.merge({
            high: high,
            low: low
          }),
          // Threshold tooltip point.
          immThreshold.set('y', threshold)
        ]);
      });
    });

    // Creating a 2d array that contains [`arearange` data point, `threshold-line` data point].
    // Note that we use _.zip() here to transpose the matrix, so we have everything grouped by thresholds. So:
    // [threshold1 - arearange: [frame1, frame2, ...],
    //  threshold1 - line: [frame1, frame2, ...],
    //  threshold2 - arearange: [frame1, frame2, ...],
    //  threshold2 - line: [frame1, frame2, ...], ...]
    var immCommonThresholds = Imm.fromJS(_.zip.apply(this, immRawCommonThresholds.toJS()));

    // Even indexes are arearange, odd indexes are line

    // Hard-coded color values from mockup
    var highThresholdColor = Imm.fromJS(DataMonitorVizColorConstants.THRESHOLD_HIGH);
    var lowThresholdColor = Imm.fromJS(DataMonitorVizColorConstants.THRESHOLD_LOW);
    var colorDiff = highThresholdColor.zip(lowThresholdColor).map(tuple => {
      var [high, low] = tuple;
      return high - low;
    });
    var colorGradient = colorDiff.map(diff => { return Math.floor(diff / (immCommonThresholds.size / 2)); });

    var colorVectorToHtmlColorCode = vector => {
      var hexes = vector.map(hex => {
        var temp = hex.toString(16);
        return ("00" + temp).slice(-2);
      });
      return ['#'].concat(hexes.toJS()).join('');
    };

    // Note, we go from high to low and then reverse - so if we have only one threshold, we take the high color
    var areaSeriesColors = _.map(_.range(immCommonThresholds.size / 2, 0, -1), i => {
      return colorVectorToHtmlColorCode(highThresholdColor.zip(colorGradient).map(tuple => {
        var [high, gradient] = tuple;
        return Math.min(high - gradient * i, 255);
      }));
    }).reverse();

    // threshold displayNames, if any
    var thresholdDisplayNames = this.props.immMonitor.getIn(['monitor', 'thresholds']).map(Util.immPluck('displayName'));

    var areaSeries = immCommonThresholds.flatMap((threshold, i) => {
      const name = thresholdDisplayNames.has(i/2) ? thresholdDisplayNames.get(i/2) : FrontendConstants.THRESHOLD;
      return (i % 2 != 0) ? Imm.List() : Imm.fromJS([{
          // We use `arearange` chart to draw common threshold.
          type: 'arearange',
          name: name,
          data: threshold.toJS(),
          color: areaSeriesColors[i / 2],
          tooltip: {
            followPointer: true,
            pointFormat: name + ': <b>{point.y}</b>'
          }
        }]);
    });

    var lineSeries = immCommonThresholds.flatMap((threshold, i) => {
      const name = thresholdDisplayNames.has(i/2) ? thresholdDisplayNames.get(i/2) : FrontendConstants.THRESHOLD;
      return (i % 2 == 0) ? Imm.List() : Imm.fromJS([{
        // Add an id here to be able to recognize it later.
        name: name,
        id: 'threshold-line',
        data: threshold.toJS(),
        lineWidth: 1,
        // TODO - Jun - This should change per threshold series
        color: DataMonitorVizColorConstants.THRESHOLD_LINE,
        connectNulls: false,
        enableMouseTracking: false,
        zoneAxis: 'x',
        zones: previewStartTime && previewEndTime ? [{
          value: previewStartTime
        }, {
          value: previewEndTime,
          dashStyle: 'dash'
        }] : null,
        states: {
          hover: {
            enabled: false
          }
        },
        marker: {
          enabled: false,
          states: {
            hover: {
              enabled: true
            }
          }
        }
      }]);
    });

    // Ensure line series come after area series, for z-index
    return areaSeries.concat(lineSeries).toJS();
  };

  getSuccessfulMonitorResultSeries = (immSuccessRuns) => {
    let breachOnly = this.props.filterBreachOnly;
    let fileId = this.props.fileId;
    let selectedWhatIdentifier = this.state.selectedMonitorResult.whatIdentifier;
    let selectedJobCreatedAt = this.state.selectedMonitorResult.jobStartedAt;
    let visibleMonitorTrendlines = this.state.visibleMonitorTrendlines;
    let whatIdLabelLookupMap = this.props.whatIdentifierMap;

    return immSuccessRuns
      .flatMap(immMonitorResult => {
        return immMonitorResult.get('scores').flatMap(immScore => {
          // Filter by breach only.
          // We remove non-breach points unless the associated trendline is visible.
          let isTrendlineVisible = visibleMonitorTrendlines.get(immScore.get('whatIdentifier'), false);
          if (breachOnly && !immScore.get('hasBreached') && !isTrendlineVisible) {
            return [];
          }
          let timestamp = MonitorUtil.getResultTimestamp(immMonitorResult);
          return [Imm.fromJS({
            x: timestamp,
            y: immScore.get('score'),
            whatIdentifier: immScore.get('whatIdentifier'),
            selected: immMonitorResult.get('jobStartedAt') === selectedJobCreatedAt && immScore.get('whatIdentifier') === selectedWhatIdentifier,
            name: Util.dateFormatUTCYYYYMMDDHHmm(timestamp),
            label: (whatIdLabelLookupMap[immScore.get('whatIdentifier')] || {}).whatLabel,
            color: immScore.get('hasBreached') ? DataMonitorVizColorConstants.BREACH_FILL : DataMonitorVizColorConstants.NON_BREACH_FILL
          })];
        })
      })
    .groupBy(immPoint => immPoint.get('whatIdentifier'))
    .map((immSeriesData, seriesWhatIdentifier)  => {
      return Imm.fromJS({
        data: immSeriesData,
        // The zIndex of series to ensure monitor result series will be put above the `arearange` common threshold series.
        zIndex: MONITOR_RUN_SERIES_Z_INDEX,
        allowPointSelect: true,
        enableMouseTracking: true,
        followPointer: false,
        stickyTracking: false,
        dataGrouping: {
          enabled: false
        },
        lineWidth: visibleMonitorTrendlines.get(seriesWhatIdentifier, false) ? TRENDLINE_WIDTH : 0,
        color: DataMonitorVizColorConstants.WHAT_TRENDLINE,
        tooltip: {
          snap: 0,
          headerFormat: '',
          pointFormat:
            FrontendConstants.BULLET + ' ' + FrontendConstants.DATE +': <b>{point.name}</b><br/>' +
            FrontendConstants.BULLET + ' ' + FrontendConstants.SCORE + ': <b>{point.y}</b><br/>{point.label}'
        },
        point: {
          events: {
            select: function(e) {
              let whatId = e.target.whatIdentifier;
              let jobStartedAt = e.target.x.toString();
              let immTaskTuple = this.props.immMonitorTasks.find(t => t.get('jobStartedAt') === jobStartedAt && t.get('whatId') === whatId);
              if (immTaskTuple) {
                ExposureActions.setMonitorTasksExpandedIds(Imm.List([immTaskTuple.getIn(['task', 'id'])]), true);
              }
              let newVisibleMonitorTrendlines = visibleMonitorTrendlines.has(whatId) ? visibleMonitorTrendlines.update(whatId, isVisible => !isVisible) : visibleMonitorTrendlines.set(whatId, true);
              ExposureActions.setVisibleMonitorTrendlines(fileId, newVisibleMonitorTrendlines);
              // We are keeping the selected point and the visible trendlines in the component's state.
              this.setState({selectedMonitorResult: {
                jobStartedAt: jobStartedAt,
                whatIdentifier: whatId
              }, visibleMonitorTrendlines: newVisibleMonitorTrendlines});
              // Bypass highcharts selection event.
              return false;
            }.bind(this),
            unselect: function(e) {
              let whatId = e.target.whatIdentifier;
              // When unselecting a point, remove its associated trendline from view.
              let newVisibleMonitorTrendlines = visibleMonitorTrendlines.set(whatId, false);
              ExposureActions.setVisibleMonitorTrendlines(fileId, newVisibleMonitorTrendlines);
              // We are keeping the selected point and the visible trendlines in the component's state.
              this.setState({selectedMonitorResult: {
                jobStartedAt: null,
                whatIdentifier: null
              }, visibleMonitorTrendlines: newVisibleMonitorTrendlines});
              // Bypass highcharts selection event.
              return false;
            }.bind(this)
          }
        },
        states: {
          hover: {
            lineWidth: 0,
            lineWidthPlus: 0
          }
        },
        marker: {
          enabled: true,
          radius: 4,
          symbol: 'circle',
          states: {
            hover: {
              // Default to the series' or point's color.
              fillColor: e => e.color
            },
            select: {
              lineColor: DataMonitorVizColorConstants.SELECTED_HALO_FILL,
              radius: 5,
              lineWidth: 3
            }
          }
        }
      }) }, this)
    .toList()
    .toJS();
  };

  getErrorSeries = (immFailedRuns, minY, maxY) => {
    var immErrorData = immFailedRuns.map(function(immMonitorResult) {
      return {
        x: MonitorUtil.getResultTimestamp(immMonitorResult),
        y: maxY * THRESHOLD_MAX_Y_AXIS_SCALE
      };
    });

    var immErrorTooltipData = immFailedRuns.map(function(immMonitorResult) {
      var timestamp = MonitorUtil.getResultTimestamp(immMonitorResult);
      return {
        x: timestamp,
        date: Util.dateFormatUTCYYYYMMDDHHmm(timestamp),
        description: immMonitorResult.get('errors').map(function(error) { return FrontendConstants.BULLET + ' ' + error; }).join('<br/>'),
        y: (maxY + minY) / 2
      };
    });

    return [{
      type: 'column',
      zIndex: ERROR_SERIES_Z_INDEX,
      data: immErrorData.toJS(),
      // To disable tooltip.
      enableMouseTracking: false,
      color: DataMonitorVizColorConstants.ERROR_FILL,
      pointRange: immFailedRuns.map(immFailedRun => immFailedRun.get('pointRange')).min()
    }, {
      type: 'scatter',
      name: FrontendConstants.DATA_MONITOR_RUN_ERROR,
      zIndex: ERROR_SERIES_Z_INDEX,
      data: immErrorTooltipData.toJS(),
      marker: {
        fillColor: DataMonitorVizColorConstants.ERROR_POINT_FILL,
        symbol: 'url(' + question + ')'
      }
    }];
  };

  // Get called whenever Highcharts `afterSetExtremes` event get fired such as when the range navigator
  // moves, or zooming along x-axis via lasso, or when the date selector controls are modified.
  handleUpdateRange = (e) => {
    var startTime = parseInt(e.min, 10);
    var endTime = parseInt(e.max, 10);
    if (this.state.startTime !== startTime || this.state.endTime !== endTime) {
      // Always fetch the monitor data for the new time range.
      this.props.fetchMonitorData(startTime, endTime);
      // Save the start/end timestamps for use when submitting preview requests.
      this.state.startTime = startTime;
      this.state.endTime = endTime;
    }
  };

  isReady = () => {
    return this.props.monitorBreachData && this.props.immMonitorResults;
  };

  // Inserts PreviewResults into the existing MonitorResults, lining up timestamps and comparing `hasBreached` to set `isSimulated`.
  spliceInPreviewResults = () => {
    // The preview results may not be in the desired range (we have moved the window since previewing).
    // Filter to only display the ones in the window.
    var immPreviewResultsInRange = this.props.immPreviewMonitorResults.filter(immResult => this.state.startTime <= MonitorUtil.getResultTimestamp(immResult) && MonitorUtil.getResultTimestamp(immResult) <= this.state.endTime);
    // Splice the preview results into the monitor results.
    return this.props.immMonitorResults.concat(immPreviewResultsInRange)
      // Group all results by `jobStartedAt`, returning an OrderedMap.
      // This will match PreviewResults with the existing MonitorResult they were simulating a change to.
      // Note: This assumes `jobStartedAt` is unique across MonitorResults, and that a PreviewResult has its `jobStartedAt`
      // set to the `jobStartedAt` of the MonitorResult it is simulating a change to.
      .groupBy(MonitorUtil.getResultTimestamp)
      .sortBy((v, k) => k)  // Sort by the key (`jobStartedAt` timestamp).
      .map(immResults => {
        // There are four possibilities at this point.
        // The groupBy has left us with an array (PreviewResult == PR, MonitorResult == MR) of:
        // [MR] -- There was no PreviewResult for this MonitorResult, meaning it was outside the most recent preview request.
        // [PR] -- There was no MonitorResult for this data frame, all whats are in the `isSimulated = true` state.
        // [MR, PR] or [PR, MR] -- The PreviewResult lines up over the MonitorResult, we compare the `hasBreached` values for each what,
        //                         to determine the `isSimulated` value.
        // Filter down to get a list of length 0 or 1 for each of PreviewResult and MonitorResult.
        var immPreviewResult = immResults.filter(immResult => immResult.get('jobType') === 'PREVIEW_JOB');
        var immMonitorResult = immResults.filterNot(immResult => immResult.get('jobType') === 'PREVIEW_JOB');
        if (immPreviewResult.isEmpty()) {  // [MR].
          return immMonitorResult.first();
        } else if (immMonitorResult.isEmpty()) {  // [PR].
          return immPreviewResult.first();
        } else {  // [PR, MR] or [MR, PR].
          var immMonitorResultWhatIdentifierToBreached = Imm.Map(immMonitorResult.first().get('scores').map(immScore => [immScore.get('whatIdentifier'), immScore.get('hasBreached', false)]));
          return immPreviewResult.first().updateIn(['scores'], immScores => immScores.map(immScore => {
            var whatIdentifier = immScore.get('whatIdentifier');
            var originallyBreached = immMonitorResultWhatIdentifierToBreached.get(whatIdentifier);
            return immScore.set('hasBreached', originallyBreached);
          }));
        }
      })
      .toList();
  };

  // This is a hack to override the hard-coded default behavior of the Highstocks date range inputs.
  // The original code can be found at http://code.highcharts.com/stock/highstock.src.js
  // This change was made necessary due to the inputs snapping the input date to the date of the
  // closest known data point, which is problematic if you've only lazy loaded the previously requested data points.
  // The net result was that the visible date range could be shrunk, but never grown using the date inputs.
  // This override removes the snapping behavior and passes the date through unchanged so that larger date ranges
  // can be specified. The need for this change is brought up in this thread:
  // http://forum.highcharts.com/highstock-usage/rangeselector-and-async-data-loading-not-working-t31874/
  // NOTE: This code was left as much like the original linked above as possible, as such it may not adhere 100%
  //       to our normal coding and style conventions.
  overrideInputOnChange = (chart, input) => {
    var adjustDateInput = function(input) {
      var value = Date.parse(input);

      // If the value isn't parsed directly to a value by the browser's Date.parse method,
      // like YYYY-MM-DD in IE, try parsing it a different way
      if (isNaN(value)) {
        value = input.split('-');
        value = Date.UTC(parseInt(value[0], 10), parseInt(value[1], 10) - 1, parseInt(value[2], 10));
      }

      return value;
    };

    // handle changes in the input boxes
    var value = adjustDateInput(input.target.value),
      xAxis = chart.xAxis[0],
      isMin = input.target.name === 'min';

    if (!isNaN(value)) {
      var otherInputName = '.highcharts-range-selector[name=' + (isMin ? 'max' : 'min') + ']';
      var otherDate = adjustDateInput($(otherInputName).val());

      if (_.isNumber(value) && _.isNumber(otherDate) && ((isMin && value < otherDate) || (!isMin && value > otherDate))) {
        var min = isMin ? value : xAxis.min;
        var max = isMin ? xAxis.max : value;
        chart.xAxis[0].setExtremes(
          min,
          Moment(max).utc().endOf('day').format('x'),
          undefined,
          undefined,
          { trigger: 'rangeSelectorInput' }
        );
      }
    }
  };

  render() {
    var immMonitorResults = null;
    var monitorBreachData = this.props.monitorBreachData;
    var immMonitorAudits = this.props.immMonitorAudits;
    var changes = [];
    var previewOverlapBands = [];
    var previewIsLoading = this.props.isPreviewDisplayed && !this.props.immPreviewMonitorResults;
    var whatIdLabelLookupMap = this.props.whatIdentifierMap;
    var visibleTrendlines = this.props.visibleMonitorTrendlines;

    if (!this.isReady()) {
      return div({className: 'spinner-container-placeholder'}, Spinner());
    }

    // Assuming this.props.immPreviewMonitorResults timestamp and immMonitorResult time stamp line up.
    if (this.props.isPreviewDisplayed && this.props.isEditableAndInConfiguration && this.props.immPreviewMonitorResults) {
      immMonitorResults = this.spliceInPreviewResults();
      // The start and end of the preview data.
      var startPreviewTime = MonitorUtil.getResultTimestamp(this.props.immPreviewMonitorResults.first());
      var endPreviewTime = MonitorUtil.getResultTimestamp(this.props.immPreviewMonitorResults.last());

      // The min.max of the data we will be displaying.
      var dataMin = MonitorUtil.getResultTimestamp(immMonitorResults.first());
      var dataMax = MonitorUtil.getResultTimestamp(immMonitorResults.last());

      // Determine the shaded bands representing the non-simulated regions.
      // The PreviewResults we have are outside the current range of the x-axis. Display 1 band covering entire chart.
      if (startPreviewTime > dataMax || endPreviewTime < dataMin) {
        previewOverlapBands.push({
          from: this.state.startTime,  // Use the chart min/max instead of a data point so that the band goes all the way to the edge.
          to: this.state.endTime,
          zIndex: PREVIEW_SHADE_Z_INDEX,
          color: 'url(#custom-pattern)'
        });
      } else {
        // Determine if there needs to be a band on the left side of the chart (the preview area starts at least a point after the left side of the chart).
        if (startPreviewTime > dataMin) {
          changes.push(startPreviewTime);
          previewOverlapBands.push({
            from: this.state.startTime,
            to: startPreviewTime,
            zIndex: PREVIEW_SHADE_Z_INDEX,
            color: 'url(#custom-pattern)'
          });
        }
        // Determine if there needs to be a band on the right side of the chart (the preview area ends at least a point before the right side of the chart).
        if (endPreviewTime < dataMax) {
          changes.push(endPreviewTime);
          previewOverlapBands.push({
            from: endPreviewTime,
            to: this.state.endTime,
            zIndex: PREVIEW_SHADE_Z_INDEX,
            color: 'url(#custom-pattern)'
          });
        }
      }
    } else {
      immMonitorResults = this.props.immMonitorResults;
    }

    if (_.isEmpty(monitorBreachData)) {
      return div({className: cx('monitor-viz', Util.isDesktop() ? 'desktop' : 'non-desktop')},
        EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.DATA_MONITOR_RESULTS)}));
    } else if (!immMonitorResults) {
      return Spinner();
    }

    // TP:11729.
    // The navigator goes into an infinite `updateExtremes` loop if there is exactly one
    // data point in its series. This will make the minimum range on the navigator to be
    // 10 seconds.
    var navXAxis = {
      min: _.first(monitorBreachData).x,
      max: _.last(monitorBreachData).x
    };

    if (monitorBreachData.length === 1) {
      navXAxis = {
        minRange: 10000  // 10 seconds represents the minimum range when there is one data point.
      };
    }

    // Create a map of `auditAction.actionAt` to functional monitor configurations such as `metricScaleFactors`,
    // `thresholdScaleFactor`, `execPlanFunction`.
    var immMonitorAuditDiffer = Imm.Map(immMonitorAudits.map(function(immMonitorAudit) {
      return [immMonitorAudit.getIn(['auditAction', 'actionAt']), Imm.Map({
        metricScaleFactors: immMonitorAudit.getIn(['file', 'monitor', 'metrics']).map(Util.immPluck('scaleFactor')),
        thresholdScaleFactors: immMonitorAudit.getIn(['file', 'monitor', 'thresholds']).map(Util.immPluck('scaleFactor')),
        execPlanFunction: immMonitorAudit.getIn(['file', 'monitor', 'execPlan', 'function'])
      })];
    }));

    // Whenever there are changes to a monitor's configuration, `monitorVersion` will be updated. By comparing `monitorVersion`,
    // we'll find the updatedAt timestamps. We'll then look into the audit map constructed above (`immMonitorAuditDiffer`)
    // to obtain only the functional configuration updated timestamps.
    changes.push(immMonitorResults.reduce(function(memo, immMonitorResult) {
      var currentMonitorVersion = immMonitorResult.get('monitorVersion');
      if (currentMonitorVersion === 'PREVIEW') { return memo; }
      if (memo.prevMonitorVersion !== currentMonitorVersion &&
          !immMonitorAuditDiffer.get(currentMonitorVersion).equals(immMonitorAuditDiffer.get(memo.prevMonitorVersion))) {
        memo.timestamps.push(MonitorUtil.getResultTimestamp(immMonitorResult));
      }
      memo.prevMonitorVersion = currentMonitorVersion;
      return memo;
    }, {prevMonitorVersion: immMonitorResults.first() ? immMonitorResults.first().get('monitorVersion') : 0, timestamps: []}).timestamps);

    var plotLines = _.map(changes, function(timestamp) {
      return {
        zIndex: CHANGES_PLOT_LINE_Z_INDEX,
        color: DataMonitorVizColorConstants.CHANGES_LINE,
        width: 1,
        value: timestamp
      };
    });

    var immSuccessRuns = immMonitorResults.filter(function(immMonitorResult) {
      return immMonitorResult.get('errors', Imm.List()).isEmpty();
    });

    // Calculate min and max value on the yAxis. If we don't have any successful
    // runs to choose min/max values from then just set it to some value to
    // ensure the errors have a scale on which to display.
    var [minY, maxY] = immSuccessRuns.isEmpty() ? [0, 2] : immSuccessRuns.reduce(function(minMaxArr, immMonitorResult) {
      var [min, max] = minMaxArr;
      var [minScore, maxScore] = minMaxArr;
      var thresholds = immMonitorResult.get('commonThreshold');
      if (!immMonitorResult.get('scores').isEmpty()) {
        maxScore = immMonitorResult.get('scores').maxBy(Util.immPluck('score')).get('score');
        minScore = immMonitorResult.get('scores').minBy(Util.immPluck('score')).get('score');
      }
      return [_.min([min, minScore].concat(thresholds)), _.max([max, maxScore].concat(thresholds))];
    }, [Infinity, 0]);

    var immFailedRuns = immMonitorResults.map((immMonitorResult, index) => {
      // Computes the distance between errors and surrounding points which is used to determine the minimum
      // width of the error bar. This is necessary in the case where monitor results (or other errors)
      // occur within 1 day of the error to prevent those points from being covered by the error bar.
      if (!immMonitorResult.get('errors', Imm.List()).isEmpty()) {
        const DEFAULT_POINT_RANGE = 12 * 3600 * 1000;
        let prevMonitorResultTimestamp = Number.MIN_SAFE_INTEGER;
        let nextMonitorResultTimestamp = Number.MAX_SAFE_INTEGER;
        let currentMonitorResultTimestamp = MonitorUtil.getResultTimestamp(immMonitorResult);

        if (index !== 0) {
          prevMonitorResultTimestamp = MonitorUtil.getResultTimestamp(immMonitorResults.get(index - 1));
        }

        if (index !== immMonitorResults.size - 1) {
          nextMonitorResultTimestamp = MonitorUtil.getResultTimestamp(immMonitorResults.get(index + 1));
        }

        let pointRange = _.min([currentMonitorResultTimestamp - prevMonitorResultTimestamp, nextMonitorResultTimestamp - currentMonitorResultTimestamp, 2 * DEFAULT_POINT_RANGE]);
        return immMonitorResult.set('pointRange', pointRange);
      } else {
        return immMonitorResult;
      }
    }).filterNot(function(immMonitorResult) {
      return immMonitorResult.get('errors', Imm.List()).isEmpty();
    });

    var successfulMonitorResultSeries = this.getSuccessfulMonitorResultSeries(immSuccessRuns);
    var failedMonitorResultSeries = this.getErrorSeries(immFailedRuns, minY, maxY);
    var thresholdSeries = this.getThresholdSeries(immSuccessRuns, minY, maxY, startPreviewTime, endPreviewTime);
    var extraSeries = this.getExtraSeries(immSuccessRuns, startPreviewTime, endPreviewTime);

    // We need to process the extraSeries data to see if the data contained within there has
    // yAxis value greater than maxY or less than minY, so the mean value line will not be cutoff
    // if the mean is greater than maxY for upper band monitors, or the mean is less than minY
    // for lower band monitors
    const flattenedExtraSeriesData = _.chain(extraSeries)
      .map(series => series.data)
      .flatten(true)
      .value();
    maxY = _.reduce(flattenedExtraSeriesData, (memo, series) => series.y > memo ? series.y : memo, maxY);
    minY = _.reduce(flattenedExtraSeriesData, (memo, series) => series.y < memo ? series.y : memo, minY);


    var series = successfulMonitorResultSeries
      .concat(failedMonitorResultSeries)
      .concat(thresholdSeries)
      .concat(extraSeries);

    var highchartViz = Highchart({
      ref: 'monitor-viz',
      // Override default height (70vh).
      // We want the download history link to be visible without scrolling.
      height: '65vh',
      configs: [{
        chartType: 'stock',
        chart: {
          // TP:11729.
          // Ensure that we don't respect multitouch events.
          // Note: We may want to revisit this later.
          pinchType: "",
          // TP:11729.
          // Ensure that we can't pan the chart, we use the navigator for
          // moving along the xAxis.
          // Note: We may want to revisit this later.
          panning: false,
          enableDrilldown: false
        },
        defs: {
          patterns: [{
            id: 'custom-pattern',
            path: {
              d: 'M 0 0 L 10 10 M 9 -1 L 11 1 M -1 9 L 1 11',
              stroke: DataMonitorVizColorConstants.PREVIEW_PLOT_BAND_STROKE,
              strokeWidth: 1
            }
          }]
        },
        // To discard `All` options, we need to specify specific buttons we want to display.
        rangeSelector: {
          inputDateFormat: '%Y-%m-%d',
          buttons: [{
            type: 'month',
            count: 1,
            text: '1m'
          }, {
            type: 'month',
            count: 3,
            text: '3m'
          }, {
            type: 'month',
            count: 6,
            text: '6m'
          }, {
            type: 'ytd',
            text: 'YTD'
          }, {
            type: 'year',
            count: 1,
            text: '1y'
          }]
        },
        xAxis: {
          crosshair: false,
          endOnTick: false,
          startOnTick: false,
          type: 'datetime',
          min: this.state.startTime,
          max: this.state.endTime,
          ordinal: false, // If true, points would be equally spaced regardless of x distance.
          plotLines: plotLines,
          plotBands: previewOverlapBands,
          events : {
            afterSetExtremes: this.handleUpdateRange
          }
        },
        yAxis: {
          crosshair: false,
          min: minY * MIN_Y_AXIS_SCALE,
          opposite: false,
          // Highest y value * a top padding scale for vanity.
          max: maxY * MAX_Y_AXIS_SCALE,
          gridLineWidth: 0,
          lineWidth: 1,
          minorGridLineWidth: 0,
          minorTickInterval: 'auto',
          minorTickWidth: 1,
          minorTickLength: 10
        },
        tooltip: {
          snap: 0,
          animation: false,
          backgroundColor: DataMonitorVizColorConstants.TOOLTIP_BACKGROUND,
          borderRadius: 10,
          borderColor: DataMonitorVizColorConstants.TRANSPARENT,
          style: {
            color: DataMonitorVizColorConstants.TOOLTIP_TEXT,
            padding: 10
          },
          shadow: false,
          crosshairs: false,
          shared: false,
          split: false
        },
        scrollbar: {
          liveRedraw: false
        },
        plotOptions: {
          series: {
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              align: 'right',
              allowOverlap: false,
              formatter: function() {
                if (_.isEmpty(this.series.data)) {
                  // If the given series has no data, then there is nothing to format.
                  return null;
                }

                let isTrendlineVisible = visibleTrendlines.get(this.point.whatIdentifier, false);
                let rightmostSeriesPoint = _.last(this.series.data);
                let isRightmostPoint = this.point.x === rightmostSeriesPoint.x
                  && this.point.y === rightmostSeriesPoint.y
                  && this.point.whatIdentifier === rightmostSeriesPoint.whatIdentifier;
                let whatInformation = _.has(whatIdLabelLookupMap, this.point.whatIdentifier)
                  ? whatIdLabelLookupMap[this.point.whatIdentifier].text
                  : null;
                return (isTrendlineVisible && isRightmostPoint) ? whatInformation : null;
              },
              verticalAlign: 'middle',
              x: -5,
              y: 0
            },
            stickyTracking: false
          },
          arearange: {
            color: DataMonitorVizColorConstants.THRESHOLD_FILL
          },
          column: {
            pointPadding: 0,
            groupPadding: 0,
            borderColor: DataMonitorVizColorConstants.ERROR_STROKE,
            borderWidth: 1
          },
          scatter: {
            cursor: 'pointer',
            tooltip: {
              snap: 0,
              headerFormat: '<b>{series.name}</b><br/>',
              pointFormat: FrontendConstants.DATE + ': <b>{point.date}</b><br/>{point.description}'
            }
          }
        },
        series: series,
        navigator: {
          adaptToUpdatedData: false,
          // TP:11729, TP:11739.
          // Set yAxis min to 0 since it represents # of breaches per result.
          // Note: This was accidentally typo'd to xAxis, which caused some weird behavior.
          yAxis: {
            min: 0
          },
          xAxis: navXAxis,
          series: {
            data: monitorBreachData
          }
        }
      }]});

    var thresholdSeriesDisplayNames =
        this.props.immMonitor.getIn(['monitor', 'thresholds']).map(Util.immPluck('displayName'));

    var legendMenu;
    if (this.props.isPreviewDisplayed) {
      var thresholdLegends = thresholdSeriesDisplayNames.flatMap(thresholdDisplayName => {
        return Imm.fromJS([
          MenuOption({className: 'menu-option-threshold'},
              div({className: 'react-menu-icon icon-viz-threshold'},
                  thresholdDisplayName ? ('Current ' + thresholdDisplayName) : FrontendConstants.CURRENT_THRESHOLD)),
          MenuOption({className: 'menu-option-sim-threshold'},
              div({className: 'react-menu-icon icon-dashed-line'},
                  thresholdDisplayName ? ('Simulated ' + thresholdDisplayName) : FrontendConstants.SIMULATED_THRESHOLD))
        ]);
      }).toJS();
      legendMenu = MenuOptions({className: 'more-menu-options legend-options'},
        thresholdLegends,
        MenuOption({className: 'menu-option-preview-region'},
          div({className: 'react-menu-icon icon-diagonals'}, FrontendConstants.CURRENT_PREVIEW_REGIONS)),
        MenuOption({className: 'menu-option-breach'},
          div({className: 'react-menu-icon option-breach icon-circle'}, FrontendConstants.BREACH)),
        MenuOption({className: 'menu-option-non-breach'},
          div({className: 'react-menu-icon option-non-breach icon-circle'}, FrontendConstants.NON_BREACH)));
    } else {
      var thresholdLegends = thresholdSeriesDisplayNames.map(thresholdDisplayName => {
        return MenuOption({className: 'menu-option-threshold'},
            div({className: 'react-menu-icon icon-viz-threshold'},
                thresholdDisplayName ? thresholdDisplayName : FrontendConstants.THRESHOLD));
      }).toJS();
      legendMenu = MenuOptions({className: 'more-menu-options legend-options'},
        thresholdLegends,
        MenuOption({className: 'menu-option-breach'},
          div({className: 'react-menu-icon option-breach icon-circle'}, FrontendConstants.BREACH)),
        MenuOption({className: 'menu-option-non-breach'},
          div({className: 'react-menu-icon option-non-breach icon-circle'}, FrontendConstants.NON_BREACH)));
    }
    var legend = Menu({className: 'more-menu legend', horizontalPlacement: 'left'},
      MenuTrigger({className: 'more-menu-trigger legend-opener'},
        span({className: 'legend-opener-text'}, FrontendConstants.LEGEND),
        span({className: 'icon-menu-hamburger'})),
      legendMenu);

    var previewMenu = this.props.isEditableAndInConfiguration ?
      div({className: 'preview-menu'},
        this.props.immPreviewMonitorResults ?
          div({className: cx('toggle-preview', this.props.isPreviewDisplayed ? 'view-current' : 'view-simulated'), onClick: this.props.togglePreviewDisplay},
            span({className: 'text-link'}, this.props.isPreviewDisplayed ? FrontendConstants.VIEW_CURRENT : FrontendConstants.VIEW_SIMULATED))
          : null,
        Button({
          children: FrontendConstants.RENDER,
          classes: {'render-preview-button': true, 'btn-disabled': previewIsLoading},
          icon: 'icon-loop2',
          isSecondary: true,
          onClick: this.handlePreviewRender
        })) :
      null;

    var vizContainer = div({className: 'viz-container'},
      highchartViz,
      previewMenu);

    var vizOverlay;
    if (previewIsLoading) {
      vizOverlay = div({className: 'container-overlay'},
        div({className: 'preview-loading-container'},
          div({className: 'preview-loading-message-container'},
            div({className: 'preview-loading-message'}, FrontendConstants.MONITOR_PREVIEW_LOADING_MESSAGE),
            div({className: 'text-link', onClick: this.props.cancelPreview}, FrontendConstants.CANCEL)),
          Spinner()));
    }

    return div({className: cx('monitor-viz', Util.isDesktop() ? 'desktop' : 'non-desktop')},
      div({className: 'viz-pane-container'},
        div({className: 'sub-tab-header'}, FrontendConstants.PERFORMANCE,
          a({className: 'icon-question-circle', href: Util.formatHelpLink('PERFORMANCE'), target: '_blank'})
        ),
        div({className: 'viz-header'}, div({className: 'viz-title'}, FrontendConstants.BREACHES), legend),
        vizContainer,
        vizOverlay));
  }
}

module.exports = DataMonitorViz;
