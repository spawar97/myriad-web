var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import { getObject } from '../../util/SessionStorage';

var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var ReportFilterNotice = React.createFactory(require('../ReportFilterNotice'));
var Highchart = React.createFactory(require('../Highchart'));
import ExposureActions from '../../actions/ExposureActions';

class GraphicalReportWidget extends React.Component {
  static displayName = 'GraphicalReportWidget';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired,
    // Used to set `immVizLegendStates` in `Dashboard`.
    handleUpdateVizLegend: PropTypes.func,
    height: PropTypes.any,  // number in pixel or string (i.e. '70vh').
    immReport: PropTypes.instanceOf(Imm.Map),
    // Used to store changes in the visibility of particular series in charts.
    immVizLegendStates: PropTypes.instanceOf(Imm.Map),
    setRenderTime: PropTypes.func,
    isHomePage: PropTypes.bool,
    homePageDrilldownHelper: PropTypes.func,
    widgetMetaData: PropTypes.any,
    apiProcessWidgetMetaData: PropTypes.func,
    apiQuery: PropTypes.func
  };

  state = { processedData: null };
  componentDidMount() {
    if (this.props.widgetMetaData) {
      var widgetData = this.props.widgetMetaData;
      widgetData.render = false;
      if (widgetData) {
        if (this.props.widgetMetaData.apiProcessWidgetMetaData && widgetData.currentState) {
          _.defer(this.props.widgetMetaData.apiProcessWidgetMetaData, widgetData);
        }
      }
    }

    ExposureActions.updateSessionStorage(getObject('widgetContextFilter') || []);
  }

  shouldComponentUpdate(nextProps, nextState) {
    let currentWidgetUpdating = nextProps.immExposureStore?.get('currentWidgetUpdating');
    let showFiltersPane =   _.isEqual(this.props.immExposureStore.get('showFiltersPane'), nextProps.immExposureStore.get('showFiltersPane')) ;

    let renderedWidgets = getObject('renderedWidget') || [];

    if (nextProps?.widgetMetaData && currentWidgetUpdating && renderedWidgets.includes(currentWidgetUpdating) && showFiltersPane && _.isEqual(this.props, nextProps))
    {
      return false;
    }
    else {
      return ShallowCompare(this, nextProps, nextState);
    }
  }

  componentDidUpdate() {
    if (this.props.widgetMetaData) {
      var widgetData = this.props.widgetMetaData;
      widgetData.render = false;
    }
  }

  componentWillUnmount() {

    if (this.props.widgetMetaData) {
      var widget = this.props.widgetMetaData
      _.map(this.props.widgetMetaData.xhrRequests, function (xhrReq) {
        console.log('Aborting XHR Requests for widget: ', widget.widgetId);
        xhrReq.abort();
        console.log('Abort complete: ', widget.widgetId);
      });
    }
  }

  render() {
    // If drilldown files (fileConfigs) are not loaded in the exposure store yet, show spinner until they are ready.
    if (this.props.immExposureStore.get('fileConfigsRequestInFlight') ||
      (this.props.widgetMetaData && this.props.widgetMetaData.isLoading)) {
      return ContentPlaceholder({ height: 48 });
    }

    var immReportData = this.props.immReport.get('reportData');
    var immAssociatedFiles = this.props.immReport.getIn(['fileWrapper', 'file', 'drilldownFileIdMap'], Imm.List()).reduce((immMemo, immDrilldownTargets) => {
      const fileMap = immDrilldownTargets.get('list', Imm.List()).reduce((immFileMemo, fileId) => {
        const fileConfig = this.props.immExposureStore.getIn(['fileConfigs', fileId]);
        // If the user does not have access to the file, skip adding it to the file map for the drilldown key.
        return fileConfig ? immFileMemo.set(fileId, fileConfig) : immFileMemo;
      }, Imm.Map());
      return immMemo.set(immDrilldownTargets.get('key'), fileMap);
    }, Imm.Map());

    if (this.props.immReport.getIn(['fileWrapper', 'file', 'templatedReport'], false)) {
      const immMessage = immReportData.get('message', null);

      if (immMessage) {
        return ReportFilterNotice({
          headerText: immMessage.get('header'),
          bodyText: immMessage.get('body'),
          filterPaneState: this.props.immExposureStore.get('showFiltersPane')
        });
      }
      // This is a new style report.
      var vizspecs = _.map(
        _.zip(immReportData.get('vizspecs').toJS(),
          this.props.immReport.getIn(['fileWrapper', 'file', 'templatedReport', 'advancedConfigOverrides'], Imm.List()).toJS()
        ), function (vizpair) {
          // Apply the config override if one exists for this vizspec.
          return vizpair[1] ? $.extend(true, vizpair[0], JSON.parse(vizpair[1])) : vizpair[0];
        });

      if (this.props.widgetMetaData && this.props.widgetMetaData.staticHiChartConf) {
        vizspecs = this.props.widgetMetaData.staticHiChartConf;
      }


      return Highchart({
        ...this.props,
        reportId: this.props.immReport.getIn(['fileWrapper', 'file', 'id']),
        immAssociatedFiles: immAssociatedFiles,
        immReport: this.props.immReport,
        dashboardId: this.props.dashboardId,
        drilldownId: this.props.drilldownId,
        height: this.props.height,
        html: (this.props.widgetMetaData && !this.props.widgetMetaData.isLoading) ? this.props.widgetMetaData.staticlayout : immReportData.get('layout'),
        configs: vizspecs,
        width: this.props.width,
        setRenderTime: this.props.setRenderTime,
        immVizLegendStates: this.props.immVizLegendStates,
        handleUpdateVizLegend: this.props.handleUpdateVizLegend,
        isHomePage: this.props.isHomePage,
        homePageDrilldownHelper: this.props.homePageDrilldownHelper,
        skipIndex: this.props.immExposureStore.get('skipIndex'),
        showAddTaskPanel: this.props.showAddTaskPanel
      });
    } else {
      var reportData = _.pluck(immReportData.toJS(), 'rows');
      try {
        // TODO: We currently converting to the processed data to string and convert it back to a JSON as a workaround for
        // processed data not able to evaluate nested result. We need to refine this later.
        var data = JSON.parse(
          JSON.stringify(
            Function('data', this.props.immReport.getIn(['fileWrapper', 'file', 'reportConfig', 'preprocessor']))(reportData)
          ));
        var config = eval('(' + this.props.immReport.getIn(['fileWrapper', 'file', 'reportConfig', 'vizspec']) + ')');
        return Highchart({
          reportId: this.props.immReport.getIn(['fileWrapper', 'file', 'id']),
          height: this.props.height,
          html: this.props.immReport.getIn(['fileWrapper', 'file', 'reportConfig', 'html']),
          configs: config,
          immVizLegendStates: this.props.immVizLegendStates,
          handleUpdateVizLegend: this.props.handleUpdateVizLegend,
          width: this.props.width
        });
      } catch (e) {
        console.log('%cERROR: Invalid report ' + e.message, 'color: #E05353');
      }
    }
  }
}

module.exports = GraphicalReportWidget;
