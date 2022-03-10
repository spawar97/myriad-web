var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ContentPlaceholder = React.createFactory(require('./ContentPlaceholder'));
var ReportWidget = React.createFactory(require('./exposure/ReportWidget'));
var ExposureAppConstants = require('../constants/ExposureAppConstants');
import { delItem } from '../util/SessionStorage';

var div = DOM.div;

class ReportsWrapper extends React.Component {
  static displayName = 'ReportsWrapper';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    dashboardId: PropTypes.string,
    drilldownId: PropTypes.string,
    fileType: PropTypes.string,
    // Used to set `immVizLegendStates` in `Dashboard`.
    handleUpdateVizLegend: PropTypes.func,
    // Used to store changes in the visibility of particular series in charts.
    immVizLegendStates: PropTypes.instanceOf(Imm.Map),
    reportIds: PropTypes.arrayOf(PropTypes.string),
    setRenderTime: PropTypes.func,
    tasksVisible: PropTypes.bool,
    isHomePage: PropTypes.bool,
    homePageDrilldownHelper: PropTypes.func
  };

  shouldComponentUpdate(nextProps, nextState) {
    return !_.isEqual(this.state, nextState) ||
      !_.isEqual(this.props.reportIds, nextProps.reportIds) ||
      this.props.drilldownId !== nextProps.drilldownId ||
      this.props.tasksVisible !== nextProps.tasksVisible ||
      !_.isEqual(this.props.immExposureStore.get('showFiltersPane'), nextProps.immExposureStore.get('showFiltersPane')) ||
      !Imm.is(this.props.immExposureStore.get('files'), nextProps.immExposureStore.get('files')) ||
      !Imm.is(this.props.immExposureStore.get('fileConfigs'), nextProps.immExposureStore.get('fileConfigs')) ||
      !Imm.is(this.props.immExposureStore.get('drilldown'), nextProps.immExposureStore.get('drilldown')) ||
      !Imm.is(this.props.immExposureStore.get('skipIndex'), nextProps.immExposureStore.get('skipIndex'));
  }

  componentWillUnmount() {
    delItem('currentWidgetUpdating');
    delItem('renderedWidget');
  }
 
  render() {
    var immExposureStore = this.props.immExposureStore;
    var reportProps = {
      drilldownId: this.props.drilldownId,
      dashboardId: this.props.dashboardId,
      hideTitle: _.size(this.props.reportIds) === 1 && this.props.fileType === ExposureAppConstants.FILE_TYPE_REPORT,
      immExposureStore: immExposureStore,
      contentPlaceholderHeight: _.size(this.props.reportIds) === 1 ? ExposureAppConstants.CONTENT_PLACEHOLDER_HEIGHT_REM_DEFAULT : ExposureAppConstants.CONTENT_PLACEHOLDER_HEIGHT_REM_HALF,
      tasksVisible: this.props.tasksVisible,
      setRenderTime: this.props.setRenderTime,
      immVizLegendStates: this.props.immVizLegendStates,
      handleUpdateVizLegend: this.props.handleUpdateVizLegend,
      isHomePage: this.props.isHomePage,
      homePageDrilldownHelper: this.props.homePageDrilldownHelper,
      showAddTaskPanel: this.props.showAddTaskPanel,
      addTaskSuccessCallback:this.props.addTaskSuccessCallback,
      selectedTab: this.props.selectedTab
    };

    // Returns a spinner for the dashboard when the reportIds are unknown.
    if (this.props.dashboardId && _.isEmpty(this.props.reportIds)) {
      return ContentPlaceholder();
    }

    var reports = _.map(this.props.reportIds, function(fileId, index) {
      var immReportEntry = immExposureStore.getIn(['files', fileId]);
      // If the query to get the file data hasn't return (when immExposureStore.getIn(['files', fileId]) == null), we render an
      // empty report with a spinner as a placeholder to maintain the order of the reports in the dashboard.
      var props = _.extend(reportProps, {key: index});
      if (immReportEntry) {
        _.extend(props, {immReport: immReportEntry});
      }
      return ReportWidget(props);
    });

    return div({className: 'reports'}, reports);
  }
}

module.exports = ReportsWrapper;
