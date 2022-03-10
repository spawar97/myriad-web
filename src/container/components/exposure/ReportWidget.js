var $ = require('jquery');
var Imm = require('immutable');
var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import 'datatables/media/js/jquery.dataTables.min';
import 'datatables/media/css/jquery.dataTables.css';
window.jQuery = $;
var ReactDOM = require('react-dom');

//Libraries for PDF export feature, used in CQS report so made it global
import html2canvas from "html2canvas";
import jsPDF from 'jspdf';
window.jsPDF = jsPDF;
window.html2canvas = html2canvas;
import 'jspdf-autotable';

import 'select2/dist/js/select2.min.js';
import 'select2/dist/css/select2.min.css';
import Util from '../../util/util';

var GraphicalReportWidget = React.createFactory(require('./GraphicalReportWidget'));
var TabularReportWidget = React.createFactory(require('./TabularReportWidget'));
var MobileTabularReportWidget = React.createFactory(require('./MobileTabularReportWidget'));
var ReportDetailPanel = React.createFactory(require('./ReportDetailPanel'));
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var MediaQueryWrapper = React.createFactory(require('../MediaQueryWrapper'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
import ExposureStore from '../../stores/ExposureStore';
import DashboardLayoutManager from './DashboardLayoutManager';
import BotSuggest from './BotSuggest';
import { setObject } from '../../util/SessionStorage';

var div = DOM.div;
var style = DOM.style;

class ReportWidget extends React.Component {
  static displayName = 'ReportWidget';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    contentPlaceholderHeight: PropTypes.number,
    dashboardId: PropTypes.string,
    drilldownId: PropTypes.string,
    // Used to set `immVizLegendStates` in `Dashboard`.
    handleUpdateVizLegend: PropTypes.func,
    hideTitle: PropTypes.bool,
    immReport: PropTypes.instanceOf(Imm.Map),
    // Used to store changes in the visibility of particular series in charts.
    immVizLegendStates: PropTypes.instanceOf(Imm.Map),
    setRenderTime: PropTypes.func,
    tasksVisible: PropTypes.bool,
    isHomePage: PropTypes.bool,
    homePageDrilldownHelper: PropTypes.func

  };

  state = { width: 300, selectedTab: { default: "tab-1" } };

   setDrilldown = async (props) => {

    var immAssociatedFiles = props.immReport.getIn(['fileWrapper', 'file', 'drilldownFileIdMap'], Imm.List()).reduce((immMemo, immDrilldownTargets) => {
      const fileMap = immDrilldownTargets?.get('list', Imm.List()).reduce((immFileMemo, fileId) => {
        const fileConfig = ExposureStore.getExposureStore().getIn(['fileConfigs', fileId]);
        // If the user does not have access to the file, skip adding it to the file map for the drilldown key.
        return fileConfig ? immFileMemo?.set(fileId, fileConfig) : immFileMemo;
      }, Imm.Map());
      return immMemo.set(immDrilldownTargets?.get('key'), fileMap);
    }, Imm.Map());

    return immAssociatedFiles;
  }

  async componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    // Populate all of the related file info.
    var immFileIds = this.getUnsetFileIds(this.props.immReport, this.props.immExposureStore);
    if (!immFileIds.isEmpty()) {
      ExposureActions.fetchFiles(immFileIds.toJS());
    }

    let drilldownData = await this.setDrilldown(this.props);
    ExposureActions.setDrilldownData(drilldownData && drilldownData.toJS());
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  async componentWillReceiveProps(nextProps) {

    let drilldownData = Object.entries(nextProps.immExposureStore?.get('drilldownFileData'));

    let previousDrillData = drilldownData.map((obj, key) => {

      let fileList = _.isEmpty(obj[1]) ? [] : Object.keys(obj[1]);
      return {
        key: obj[0],
        list: fileList
      }
    });

    let currentDrillData = nextProps.immReport?.getIn(['fileWrapper', 'file', 'drilldownFileIdMap']).toJS();


    if (!Util.arraysEqual(previousDrillData, currentDrillData)) {
      let drilldownData = await this.setDrilldown(nextProps);
      ExposureActions.setDrilldownData(drilldownData && drilldownData.toJS());
    }

    this.handleResize();
  }

  handleResize = () => {
    var $widgetDOM = $(ReactDOM.findDOMNode(this));
    this.setState({ width: $widgetDOM.width() });
  };

  getUnsetFileIds = (immReport, immExposureStore) => {
    return !immReport ? Imm.List() : immReport?.getIn(['fileWrapper', 'file', 'associatedFileIds'], Imm.List())
      .filter(function (fileId) {
        // Find all associated files we don't have information for yet.
        return !immExposureStore.hasIn(['files', fileId, 'fileWrapper', 'file', 'fileType']);
      }, this);
  };

  shouldComponentUpdate(nextProps, nextState) {
    var immUnsetFileIds = null;

    if (this.state.width !== nextState.width) {
      return true
    }
    else if (this.props.selectedTab !== nextProps.selectedTab) {
      this.setState({
        selectedTab: null,
      })

      _.defer(this.changeTab, nextProps.selectedTab)

      return false;
    }
    else if (this.state.selectedTab !== nextState.selectedTab) {
      return true
    } 
    else {
      // Determine if any file info has been populated since the last render. If
      // no files were unpopulated on the last render then we don't need to update.
      var immPreviouslyUnsetFileIds = this.getUnsetFileIds(this.props.immReport, this.props.immExposureStore);
      if (!immPreviouslyUnsetFileIds.isEmpty()) {
        immUnsetFileIds = this.getUnsetFileIds(nextProps.immReport, nextProps.immExposureStore);
      }

      return (this.props.immReport !== nextProps.immReport && !_.isUndefined(nextProps.immReport)) ||
        this.props.immExposureStore?.get('drilldown') !== nextProps.immExposureStore?.get('drilldown') ||
        !Imm.is(this.props.immExposureStore?.get('fileConfigs'), nextProps.immExposureStore?.get('fileConfigs')) ||
        this.props.drilldownId !== nextProps.drilldownId ||
        // We only want TabularReportWidget to re-render after a width change event. The GraphicalReportWidget re-render will cause the
        // highchart animation to have a undesirable flickering side effect. The highchart component listens to its parent DOM size and
        // resizes itself when its parent DOM size change as a highcharts library feature.
        (this.props.immReport && this.props.immReport?.getIn(['fileWrapper', 'file', 'reportConfig', 'reportType']) === ExposureAppConstants.REPORT_TYPE_TABULAR && this.state.width !== nextState.width) ||
        this.props.tasksVisible !== nextProps.tasksVisible ||
        this.props.immExposureStore?.get('showFiltersPane') !== nextProps.immExposureStore?.get('showFiltersPane') ||
        (!immPreviouslyUnsetFileIds.isEmpty() && !Imm.is(immPreviouslyUnsetFileIds, immUnsetFileIds)) ||
        !Imm.is(this.props.immExposureStore?.get('skipIndex'), nextProps.immExposureStore?.get('skipIndex'));
    }
  }

  componentDidUpdate() {
    this.handleResize();
  }

  updateWidgets = async (widgets) => {
    this.setState({
      allWidgets: widgets
    });
  }

  changeTab = (currentTab) => {
    this.setState({
      selectedTab: currentTab
    })
  }

  cancelPreviousApiCalls = (apiCalls, fileId) => {
    apiCalls.map((xhr) => {
      xhr?.abort();
    })
    ExposureActions.deleteRequests(fileId);
  }

  switchActiveTab = (event) => {
    let allButtons = document.getElementsByClassName('wdt-tab-button');
    for (let i = 0; i < allButtons.length; i++) {
      document.getElementsByClassName('wdt-tab-button')[i]?.classList?.remove("active")
    }
    event.currentTarget.classList.add("active");
  }

  updateStore = (currentTab, tabName, event) => {
    let fileId = this.props.immExposureStore?.get("activeFocusBreadcrumbsAnalytic");
    let apiCalls = this.props.immReport?.get('reportData')?.get('apiRequests')?.toJS();

    this.switchActiveTab(event);
    setObject("currentWidgetizationTab", tabName);
    this.cancelPreviousApiCalls(apiCalls, fileId);
    this.setState({
      selectedTab: null
    })

    let widgetMetaData = currentTab?.dashboardWidgets
    let { dashboardLayoutProps, style, FilterDependentWidget, isApply } = currentTab;
    let dashboardCustomConfigs = {  dashboardLayoutProps, style, FilterDependentWidget, isApply };

    ExposureActions.updateWidgetMetaData(fileId, widgetMetaData, dashboardCustomConfigs)
    _.defer(this.changeTab, currentTab);
  }


  createTabs = (dashboardCustomProps, content) => {
    let reportData = this.props.immReport?.get("reportData")
    let dashboardCustomConfigs = reportData?.get("dashboardCustomConfigs")?.toJS();

    if (dashboardCustomProps && dashboardCustomConfigs) {
    
      return <>
      {this.state.selectedTab ? DashboardLayoutManager(dashboardCustomProps) : null}
      </>
    }
    else {
      return content
    }

  }

  render() {
    var content = null, reportDetailPanel;

    // If the query to get the file data hasn't return immReport will be empty, we render an
    // empty report with a spinner as a placeholder to maintain the order of the reports in the dashboard.
    if (this.props.immReport && this.props.immReport.hasIn(['fileWrapper', 'file'])) {
      var widgetProps = {
        drilldownId: this.props.drilldownId,
        dashboardId: this.props.dashboardId,
        immExposureStore: this.props.immExposureStore,
        immReport: this.props.immReport,
        contentPlaceholderHeight: this.props.contentPlaceholderHeight,
        width: this.state.width,
        setRenderTime: this.props.setRenderTime,
        immVizLegendStates: this.props.immVizLegendStates,
        handleUpdateVizLegend: this.props.handleUpdateVizLegend,
        isHomePage: this.props.isHomePage,
        homePageDrilldownHelper: this.props.homePageDrilldownHelper,
        showAddTaskPanel: this.props.showAddTaskPanel
      };
      var immFile = this.props.immReport.getIn(['fileWrapper', 'file']);
      switch (immFile.getIn(['templatedReport', 'template', 'type']) || immFile.getIn(['reportConfig', 'reportType'])) {
        case ExposureAppConstants.TEMPLATE_TYPE_TABULAR:
        case ExposureAppConstants.REPORT_TYPE_TABULAR:
          if (this.props.immReport &&
            this.props.immReport.getIn(['tabularReportState', 'query']) &&
            this.props.immReport.getIn(['reportData', 0, 'rows'])) {
            // Only one of these MediaQueries will be rendered, depending on the screen size.
            content = MediaQueryWrapper({
              className: 'report-widget-body',
              desktopComponent: TabularReportWidget(widgetProps),
              phoneComponent: MobileTabularReportWidget(widgetProps)
            });
          } else {
            _.extend(widgetProps, { isLoading: true });
          }
          reportDetailPanel = ReportDetailPanel(widgetProps);
          break;
        case ExposureAppConstants.TEMPLATE_TYPE_CHART:
        case ExposureAppConstants.REPORT_TYPE_GRAPHICAL:
          if (this.props.immReport.get('reportData')) {
            //start widgetization
            let allWidgetsMetaData = this.props.immReport?.get('reportData')?.get('widgetMetaData');
            if (allWidgetsMetaData) {
              content = [];
              for (let i = 0; i < allWidgetsMetaData.size; i++) {
                var widgetMetaData = allWidgetsMetaData.get(i);
                let currentWidget = _.extend(widgetProps, { key: widgetMetaData?.toJS().widgetId, widgetMetaData: widgetMetaData?.toJS() });
               
                content[i] = GraphicalReportWidget(currentWidget);
              }
            } else {
              content = GraphicalReportWidget(widgetProps);
            }//end widgetization
          } else {
            _.extend(widgetProps, { isLoading: true });
          }
          reportDetailPanel = this.props.immReport.getIn(['fileWrapper', 'file', 'associatedFileIds']).isEmpty() ? null : ReportDetailPanel(widgetProps);
          break;
      }
    }

    let dashboardCustomProps = {};
    let reportData = this.props.immReport?.get('reportData')?.toJS();
    let isViewTasks = this.props.immExposureStore.get('isViewTasks');
    
    let dashboardCustomConfigs = reportData?.dashboardCustomConfigs;
 
    if (content?.length && dashboardCustomConfigs ) {

      let { style, dashboardLayoutProps } = dashboardCustomConfigs || {};
      let customStyle = style;
      let configs = dashboardLayoutProps;

      dashboardCustomProps['widgets'] = content;
      dashboardCustomProps['customStyle'] = customStyle;

      Object.assign(dashboardCustomProps, configs);
    }
    
    return div({ className: 'report-widget', id:"task-screenshot" },
      this.props.hideTitle ? null : div({ className: 'report-title' },
        this.props.immReport ? this.props.immReport.getIn(['fileWrapper', 'file', 'title']) : ''),
        style({ className: 'dashboard-specific', type: 'text/css'}, content && content.length > 0  ? dashboardCustomProps.customStyle : null),
      div({ className: 'report-widget-body' }, 
      dashboardCustomConfigs && !isViewTasks ? <BotSuggest widgetProps={this.props}/> : null,
        (Array.isArray(content) ?
          content.length > 0 ? this.createTabs(dashboardCustomProps, content) : ContentPlaceholder({ height: this.props.contentPlaceholderHeight })
          : content ? content : ContentPlaceholder({ height: this.props.contentPlaceholderHeight }))),
      reportDetailPanel
    );
  }
}

module.exports = ReportWidget;
