import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import AppRequest from '../../http/AppRequest';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import ExposureActions from '../../actions/ExposureActions';
import RouteNameConstants from '../../constants/RouteNameConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import RouteHelpers from '../../http/RouteHelpers';
import Util from '../../util/util';

import { withTransitionHelper } from '../RouterTransitionHelper';

class GraphicalReportDrilldown extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      drilldownData: null,
      hasDrilldown : false
    };
  }

  componentDidMount() {
    if (this.props.query.gppUUID && this.props.query.gppUUID != ''){
      this.fetchDrilldownData();
      ExposureActions.fetchFile(this.props.query.gppUUID, {}, {fetchData: true, firstRender: true});
    } else {
      const errMessage = `Cannot perform drilldown: failure to open report with id not set.`;
      ExposureActions.createStatusMessage(errMessage, StatusMessageTypeConstants.TOAST_ERROR);
    }
  }

  componentWillReceiveProps(nextProps) {
    let gppFileId = nextProps.query && nextProps.query.gppUUID;
    const requestInFlight = nextProps.immExposureStore.getIn(['files', gppFileId, 'fileRequestInFlight'], false);
    if (this.state.drilldownData && !this.state.hasDrilldown && !requestInFlight){
      this.setState({hasDrilldown: true});
      const immGppFile = nextProps.immExposureStore.getIn(['files', gppFileId, 'fileWrapper', 'file'], Imm.Map());
      this.goToDrilldown(immGppFile);
    }
  }

  fetchDrilldownData(gppData) {
    const params = $.param({
      usubjId: this.props.query.usubjId ? this.props.query.usubjId: ''
    });
    let url = `/api/files/gpp-drilldown-data?${params}`;
    AppRequest({type: 'GET', url: url}).then(
      data => {
        const drilldownData = data.drilldowns
          ? data.drilldowns.rows
            .map(row => ({
              "studyId" : row.values[0],
              "usubjId" : row.values[1],
              "drilldown": row.drilldown
            }))
          :{};
        this.setState({drilldownData: drilldownData});
        const immGppFile = this.props.immExposureStore.getIn(['files', this.props.query.gppUUID, 'fileWrapper', 'file']);
        if (immGppFile && !this.state.hasDrilldown){
          this.setState({hasDrilldown: true});
          this.goToDrilldown(immGppFile);
        }
      },
      () => {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  }

  /**
   * Handles events for the rendered chart. Will perform a drilldown to either a V2 highcharts KPI
   * @param drilldown
   * @param gppData
   */
  goToDrilldown(immGppFile) {
    const drilldownFileId  = this.props.query.gppUUID;
    let drilldownItem = null;
    if (this.props.query.studyId && this.state.drilldownData){
      drilldownItem = this.state.drilldownData.filter(dItem => dItem.studyId === this.props.query.studyId && dItem.usubjId === this.props.query.usubjId )[0];
    } else {
      drilldownItem = this.state.drilldownData.filter(dItem => dItem.usubjId === this.props.query.usubjId )[0];
    }
    const schemaId = Util.getComprehendSchemaIdFromFile(immGppFile);
    if (immGppFile.isEmpty() || !schemaId || !drilldownItem) {
      const errMessage = `Cannot perform drilldown: failure to open report with id ${drilldownFileId}.`;
      return ExposureActions.createStatusMessage(errMessage, StatusMessageTypeConstants.TOAST_ERROR);
    }

    const fileType = immGppFile.get('fileType');
    const toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;

    try {
      var drilldown = null;
      drilldown = JSON.parse(JSON.stringify(drilldownItem.drilldown));
      ExposureActions.drilldownUpdateCurrentSelectionCondition(drilldownFileId, null, [drilldown]);
      _.defer(this.transitionToRelated.bind(this, toRoute, drilldownFileId, null, schemaId));
    } catch (e) {
      const errMessage = `Cannot perform drilldown: failure to open report with id ${drilldownFileId}.`;
      ExposureActions.createStatusMessage(errMessage, StatusMessageTypeConstants.TOAST_ERROR);
      console.log(`%cERROR: ${errMessage} Error: ${e}`, 'color: #E05353');
    }
  }

  transitionToRelated(route, fileId, chartDrilldownKey, schemaId) {
    ExposureActions.clearFileFilterState(fileId);
    ExposureActions.gppDrilldownHandleRelatedFile(fileId, null, chartDrilldownKey, schemaId, (query) => this.context.router.push({name: route, params: {fileId}, query}));
    return false;
  }

  render() {
    // This is an empty component.
    return <div></div>;
  }
}

GraphicalReportDrilldown.PropTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  query: PropTypes.shape({
      gppUUID: PropTypes.string,
      studyId: PropTypes.string,
      usubjId: PropTypes.string
  })
};

GraphicalReportDrilldown.contextTypes = {
  router: PropTypes.object
};

export default GraphicalReportDrilldown;
