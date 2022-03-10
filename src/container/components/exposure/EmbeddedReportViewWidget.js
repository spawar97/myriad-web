import React from 'react';
import Imm from 'immutable';
import $ from 'jquery';
import PropTypes from 'prop-types';
import cx from 'classnames';

import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants'
import { withReportListener } from './YellowfinReportListenerHelper';
import AccountUtil from '../../util/AccountUtil';
import {YellowfinFilter} from '../../util/YellowfinUtil';
import YellowfinFilterHandler from './YellowfinFilterHandler';
import Spinner from '../Spinner';
import EmbeddedReportsTask from './EmbeddedReportsTask';
import RouteNameConstants from '../../constants/RouteNameConstants';
import PermissionsUtil from "../../util/PermissionsUtil";
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');
import { Observable } from 'windowed-observable';
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import _ from 'underscore';

const validYellowfinFilters = {
  "study": FrontendConstants.COLUMN_NAME_STUDYNAME, "study name": FrontendConstants.COLUMN_NAME_STUDYNAME,
  "study_name": FrontendConstants.COLUMN_NAME_STUDYNAME, "studyname": FrontendConstants.COLUMN_NAME_STUDYNAME,
  "study-name": FrontendConstants.COLUMN_NAME_STUDYNAME, "site": FrontendConstants.COLUMN_NAME_SITENAME,
  "site name": FrontendConstants.COLUMN_NAME_SITENAME, "site_name": FrontendConstants.COLUMN_NAME_SITENAME,
  "sitename": FrontendConstants.COLUMN_NAME_SITENAME, "site-name": FrontendConstants.COLUMN_NAME_SITENAME,
  "country": FrontendConstants.COLUMN_NAME_COUNTRY, "sitecountry": FrontendConstants.COLUMN_NAME_COUNTRY,
  "site country": FrontendConstants.COLUMN_NAME_COUNTRY, "site_country": FrontendConstants.COLUMN_NAME_COUNTRY,
  "site-country": FrontendConstants.COLUMN_NAME_COUNTRY, "studyid": FrontendConstants.COLUMN_NAME_STUDYID,
  "study id": FrontendConstants.COLUMN_NAME_STUDYID, "study_id": FrontendConstants.COLUMN_NAME_STUDYID, 
  "study-id": FrontendConstants.COLUMN_NAME_STUDYID, "siteid": FrontendConstants.COLUMN_NAME_SITEID, 
  "site id": FrontendConstants.COLUMN_NAME_SITEID, "site_id": FrontendConstants.COLUMN_NAME_SITEID, 
  "site-id": FrontendConstants.COLUMN_NAME_SITEID
}

/**
 * Thin wrapper for the builtin KPIs, allows for simpler routing.
 *
 * The resize logic was based on ReportWidget.js.
 */
class EmbeddedReportViewWidget extends React.PureComponent {
  constructor(props) {
    super(props);
    // Extract the yellowfin filter information from the router's state
    // TODO - there may be a better way to do this...
    let ignoreStudySessionFilter;

    let filters = [];
    const taskId = this.props && this.props.params && this.props.params.taskId;

    const hasRouterState = this.props.router && this.props.router.location && this.props.router.location.state;

    if (taskId && hasRouterState) {
      ignoreStudySessionFilter = this.props.router.location.state.ignoreStudySessionFilter;
      filters = this.props.router.location.state.filters;
    }

    /**
     * If the file ID was passed in from the router on a redirect, grab the correct Yellowfin file ID to avoid triggering an app refresh due to the ID not being available
     */
    let {fileId} = this.props;
    if (!fileId && hasRouterState) {
      fileId = this.props.router.location.state.fileId;
    }
    if (hasRouterState) {
      ignoreStudySessionFilter = this.props.router.location.state.ignoreStudySessionFilter;
      filters = this.props.router.location.state.filters;
    }

    this.state = {
      width: 300,
      displayFilters: false,
      doRedirect: false,
      filters: filters,
      ignoreStudySessionFilter: ignoreStudySessionFilter,
      fileId: fileId,
      addTask: false,
      viewTask: false,
      yellowfinReportQuery: '',
      yellowfinReportId: '',
      hasFinishedRedirect: false
    };
  }

  /**
   * Runs on initial mount, if it doesn't find this file ID in the store, attempts to fetch it.
   */
  componentDidMount() {
    this.fetchFileIfNeeded();
    this.attachListeners();

    const isViewingTask = this.props.params.taskId && this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW,
      params: this.props.params,
      query: this.props.query
    });
    if (isViewingTask) {
      this.setState({viewTask: true});
    }

    ExposureActions.setKPIStudioActive();
  }

  componentWillUnmount() {
    // Ensure to clear out the yellowfin login session ID
    ExposureActions.clearEmbeddedLoginSessionId();
    ExposureActions.clearKPIStudioActive();
    this.detachListeners();
  }

  /**
   * Attaches any and all listeners needed for integration with embedded application
   */
  attachListeners() {
    const immAppConfig = comprehend.globals.immAppConfig;

    // For tasks, we'll need to redirect after the initial login is complete
    window.Yellowfin.eventListener.addListener(this, 'do-task-redirect', this.handleTaskRedirection);
    // Only allow creation of tasks from Yellowfin if we have the feature flag v3_task_integration set and user has permisssions
    const accountCanCreateTask = AccountUtil.hasFeature(immAppConfig, 'v3_task_integration');
    const userCanCreateTask = PermissionsUtil.checkLoggedInUserHasAccessForFeature("TASK", "EDIT");
    if (accountCanCreateTask && userCanCreateTask) {
      window.Yellowfin.eventListener.addListener(this, 'newtask', this.newTask);
    }

    window.Yellowfin.eventListener.addListener(this, 'iframe-change', this.handleIframeChange);
    window.Yellowfin.eventListener.addListener(this, 'comprehend-gpp-drillthrough', this.handleComprehendGppDrillthroughFromYF);
  }

  /**
   * Detaches any and all listeners that were added during component initialization
   */
  detachListeners() {
    // Remove the attached event listeners
    window.Yellowfin.eventListener.removeListener(this, 'do-task-redirect');
    window.Yellowfin.eventListener.removeListener(this, 'newtask');
    window.Yellowfin.eventListener.removeListener(this, 'iframe-change');
    window.Yellowfin.eventListener.removeListener(this, 'comprehend-gpp-drillthrough');
  }

  handleIframeChange() {
    // If we are performing a redirect, only clear task information once the redirecct has completed
    if (this.state.doRedirect)
    {
      if (this.state.hasFinishedRedirect) {
        this.clearTaskInformation();
      }
    } else {
      this.clearTaskInformation();
    }
  }

  /**
   * Handles creation of a new task
   * @param data
   */
  newTask(data) {
    const reportInformation = data.filterInformation.split('&');
    let reportData = {};
    _.each(reportInformation, function (queryInfo) {
      let paramInfo = queryInfo.split('=');
      reportData[paramInfo[0]] = paramInfo[1];
    });

    const immExposureStore = this.props.immExposureStore;
    
    let promptFilters = data.promptFilters; let studyNames = []; let studyIds = []; let siteNames = []; let siteIds = []; let countries = [];
    if(promptFilters && promptFilters.length > 0){
      promptFilters.forEach(filter => {
        if(filter.name && ( validYellowfinFilters[filter.name.toLowerCase()] === FrontendConstants.COLUMN_NAME_STUDYNAME )){
          studyNames = filter.value.split("|");
        }
        if(filter.name && ( validYellowfinFilters[filter.name.toLowerCase()] === FrontendConstants.COLUMN_NAME_STUDYID )){
          studyIds = filter.value.split("|");
        }
        if(filter.name && ( validYellowfinFilters[filter.name.toLowerCase()] === FrontendConstants.COLUMN_NAME_SITENAME )){
          siteNames = filter.value.split("|");
        }
        if(filter.name && ( validYellowfinFilters[filter.name.toLowerCase()] === FrontendConstants.COLUMN_NAME_SITEID )){
          siteIds = filter.value.split("|");
        }
        if(filter.name && ( validYellowfinFilters[filter.name.toLowerCase()] === FrontendConstants.COLUMN_NAME_COUNTRY )){
          countries = filter.value.split("|");
        }
      });
    }
    
    const props = {
      isLinkedToCDMFile: false,
      currentFileId: reportData.reportUUID,
      fromYellowfinReport: true,
      yellowfinReportQuery: data.filterInformation,
      yellowfinClinicalFilters: {
        studyNames, studyIds, siteNames, siteIds, countries
      }
    }

    const actionType = FrontendConstants.ADD_TASK;
    let args = { immExposureStore, actionType, fileId: reportData.reportUUID };
    let isYellowfinTask = true;
    let taskObject = Util.generateContextObject(args, isYellowfinTask);
    taskObject.yellowfinProps = props;
    observable.publish(taskObject);
  }

  /**
   * Handles when the user toggles the task pane (will wipe any of the task info)
   */
  handleToggleTasksPane() {
    this.clearTaskInformation();
  }

    /**
   * When the iframe is initialized & the user is logged in successfully using the generated SSO token, we may need to do
   * a redirect in the event of having a task. We store the filter information & other relevant info inside of the task
   * extendedAttributes object, so we will then load that static URL for the specific task at that point in time.
   */
  handleTaskRedirection() {
    // Send yellowfin the feature list for the current account
    if (this.props.params && this.props.params.taskId) {
      // For the first time this is retrieved, let this component know to perform a redirect
      if (!this.state.doRedirect) {
        this.setState({
          doRedirect: true
        });
      }
      // For every consecutive time this hits, let the component know that the redirection has finished
      else {
        if (!this.state.hasFinishedRedirect) {
          this.setState({
            hasFinishedRedirect: true
          });
        }
      }
    }
  }

  /**
   * Handles when receiver message for a click Comprehend GPP Link Formatter on Yellowfin
   */
  handleComprehendGppDrillthroughFromYF(data) {
    let requestParams = {};
    if (data.gppUUID){
      requestParams.gppUUID = data.gppUUID;
    }
    if (data.studyId){
      requestParams.studyId = data.studyId;
    }
    if (data.usubjId){
      requestParams.usubjId = data.usubjId;
    }
    let url = '/embedded/gpp-report-drilldown?' + $.param(requestParams);
    let newTab = window.open(url , '_blank');
    newTab.focus();
  }

  /**
   * Clears task information from the component (used to clear task information when user performs navigation from
   * within the iframe itself.
   */
  clearTaskInformation() {
    this.setState({
      viewTask: false,
      addTask: false,
      filterInformation: {},
      yellowfinReportQuery: ''
    });
  }


  componentDidUpdate() {
    this.fetchFileIfNeeded();
  }

  componentWillReceiveProps(nextProps) {
    const taskId = this.props.params.taskId;
    const immTask = nextProps.immExposureStore.getIn(['tasks', taskId, 'task'], Imm.Map());
    const {fileId: oldFileId} = this.props;
    const {fileId: newFileId} = nextProps;

    if (oldFileId !== newFileId) {
      this.setState({fileId: newFileId, doRedirect: true});
    }

    // If we have a task and the task from the store is not empty, then we are ready to render
    if (taskId && !immTask.isEmpty()) {
      const yfFileId = immTask.getIn(['extendedTaskAttributes', 'associatedEmbeddedReportId'], '');
      let filters = [];

      if (yfFileId) {
        const siteNames = immTask.getIn(['extendedTaskAttributes', 'siteNames'], Imm.List()).toJS();
        const studyNames = immTask.getIn(['extendedTaskAttributes', 'extraStudyInformation', 'studyNames'], Imm.List()).toJS();

        if (siteNames.length > 0) {
          filters.push(new YellowfinFilter(['Site', 'Site Name'], siteNames));
        }

        if (studyNames.length > 0) {
          filters.push(new YellowfinFilter(['Study', 'Study Name'], studyNames));
        }

        this.setState({filters: filters, fileId: yfFileId});
      }
    }
  }

  fetchFileIfNeeded() {
    // TODO: Check if this fetch is needed (this might be unnecessary though)
    const requestInFlight = this.props.immExposureStore.getIn(['embeddedLoginSessionId', 'requestInFlight']);
    const loginSessionId = this.props.immExposureStore.getIn(['embeddedLoginSessionId', 'id']);
    if (!requestInFlight && !loginSessionId)  {
      ExposureActions.fetchEmbeddedDashboards();
    }

    const taskId = this.props && this.props.params && this.props.params.taskId;
    // If we have a task, ensure we've loaded all task information
    if (taskId && this.props.immExposureStore.getIn(['tasks', this.props.params.taskId, 'task'], Imm.Map()).isEmpty()) {
      ExposureActions.fetchTask(taskId);
    }
  }

  /**
   * @returns {boolean} Do we have any in-flight requests for this file?
   */
  isReady() {
    const immExposureStore = this.props.immExposureStore;
    const requestInFlight = immExposureStore.getIn(['embeddedLoginSessionId', 'requestInFlight'], true);
    const loginSessionId = immExposureStore.getIn(['embeddedLoginSessionId', 'id']);
    const hasTaskInfoIfNeeded = this.props.params.taskId
      ? !immExposureStore.getIn(['tasks', this.props.params.taskId, 'task'], Imm.Map()).isEmpty()
      : true;
    const hasClientOrgId = immExposureStore.has('embeddedClientOrgId');
    return !requestInFlight && loginSessionId && hasTaskInfoIfNeeded && hasClientOrgId;
  }

  /**
   * Constructs the URL that will be used for the embedded iframe
   * @returns {string}
   */
  constructUrl() {
    const { entry, params, immExposureStore } = this.props;
    let { fileId } = this.state;

    const loginSessionId = immExposureStore.getIn(['embeddedLoginSessionId', 'id']);
    const yellowfinUrl = immExposureStore.get('yellowfinUrl');

    let filterUrl = '';

    // If we have a task ID, extract the task information
    if (params && params.taskId) {
      const immTask = immExposureStore.getIn(['tasks', this.props.params.taskId, 'task'], Imm.Map());
      filterUrl = immTask.getIn(['extendedTaskAttributes', 'yellowfinReportQuery'], '');
    }

    let url = `${yellowfinUrl}/logon.i4?LoginWebserviceId=${loginSessionId}&entry=${entry}`;

    if (this.state.doRedirect) {
      const reportUrl = `${yellowfinUrl}/RunReport.i4`;
      const dashboardUrl = `${yellowfinUrl}/RunDashboard.i4`;
      if (filterUrl) {
        url = `${reportUrl}?${filterUrl}`;
      }
      else {
        if (fileId) {
          if (entry === ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.REPORT_ENTRY) url = `${reportUrl}?reportUUID=${fileId}`;
          else if (entry === ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.VIEW_DASHBOARDS_ENTRY) url = `${dashboardUrl}?dashUUID=${fileId}`;
          const clientOrgId = immExposureStore.get('embeddedClientOrgId');
          url += `&primaryOrg=1&clientOrg=${clientOrgId}`;
        }
      }
    }
    else {
      if (fileId) {
        if (entry === ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.REPORT_ENTRY) url += `&reportuuid=${fileId}`;
        else if (entry === ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.VIEW_DASHBOARDS_ENTRY) url += `&dashboarduuid=${fileId}`;
      }

      //TODO - allow for customization of YF params from parent components
      url += `&yftoolbar=TRUE&disablesidenav=TRUE&disablelogoff=TRUE&hidefooter=TRUE&hideheader=FALSE`;
   }

    return url;
  }

  render() {
    if (!this.isReady()) {
      return <Spinner />;
    }

    let iframeClass = this.props.iframeClass ? this.props.iframeClass : 'iframe-inner-content';
    let iframeWrapperClass = this.props.iframeWrapperClass ? this.props.iframeWrapperClass : 'iframe-container-reports';
    const {props} = this;
    const taskPaneProps = _.extend({}, props);
    taskPaneProps.handleToggleTasksPane = this.handleToggleTasksPane.bind(this);
    taskPaneProps.clearTaskInformation = this.clearTaskInformation.bind(this);
    taskPaneProps.yellowfinReportQuery = this.state.yellowfinReportQuery;
    taskPaneProps.yellowfinReportId = this.state.yellowfinReportId;
    taskPaneProps.addTask = this.state.addTask;
    taskPaneProps.viewTask = this.state.viewTask;

    const taskPane = (this.state.addTask || this.state.viewTask)
      ? <EmbeddedReportsTask  {...taskPaneProps} />
      : null;

    return (
      <div className='embedded-reports-view-widget' ref={(embeddedReportsView) => this.embeddedReportsView = embeddedReportsView}>
        <YellowfinFilterHandler immExposureStore={this.props.immExposureStore} filters={this.state.filters} />
        <div className={iframeWrapperClass} style={{height:this.state.iFrameHeight, overflow:'auto'}} >
          <div className={ taskPane ? cx('iframe-container-outer-wrapper', 'iframe-container-show-tasks') : 'iframe-container-outer-wrapper' }>
            <iframe
              id = 'yellowfinEmbeddedIframe'
              className={iframeClass}
              src={this.constructUrl()}
              ref='yellowfin-iframe'
            />
          </div>
          { taskPane
              ? (
                <div className='task-container'>
                  { taskPane }
                </div>
              )
                : ''
          }
        </div>
      </div>
    );
  }
}
EmbeddedReportViewWidget.propTypes =  {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  fileId: PropTypes.string,
  entry: PropTypes.string.isRequired,
  iframeClass: PropTypes.string,
  iframeWrapperClass: PropTypes.string,
  taskPane: PropTypes.element,
  params: PropTypes.shape({
    fileId: PropTypes.string,
    taskId: PropTypes.string,
    filters: PropTypes.arrayOf(PropTypes.instanceOf(YellowfinFilter))
  }).isRequired
};

EmbeddedReportViewWidget.contextTypes = {
  router: PropTypes.object
};

export default withReportListener(EmbeddedReportViewWidget);
