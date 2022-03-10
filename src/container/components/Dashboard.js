var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
var Menu = React.createFactory(require('../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../lib/react-menu/components/MenuTrigger'));

var Combobox = React.createFactory(require('./Combobox'));
var ContentPlaceholder = React.createFactory(require('./ContentPlaceholder'));
var ModalDialogContent = require('./ModalDialogContent');
var ReportsWrapper = React.createFactory(require('./ReportsWrapper'));
var SimpleAction = React.createFactory(require('./SimpleAction'));
var AddTask = React.createFactory(require('./exposure/AddTask'));
var Filters = React.createFactory(require('./exposure/Filters'));
var Breadcrumbs = React.createFactory(require('./exposure/Breadcrumbs'));
var ViewTask = React.createFactory(require('./exposure/ViewTask'));
var CookieActions = require('../actions/CookieActions');
var ExposureActions = require('../actions/ExposureActions');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');
var RouteHelpers = require('../http/RouteHelpers');
var GA = require('../util/GoogleAnalytics');
var AccountUtil = require('../util/AccountUtil');
var Util = require('../util/util');
var HelpUtil = require('../util/HelpUtil');
const Link = React.createFactory(require('react-router').Link);
import {YellowfinFilter} from '../util/YellowfinUtil';
import ReportUtil from '../util/ReportUtil';
import PermissionsUtil from '../util/PermissionsUtil';
import {FeatureListConstants, AccessPermissionsConstants} from '../constants/PermissionsConstants';
import 'datatables/media/js/jquery.dataTables.min';
import 'datatables/media/css/jquery.dataTables.css';

var div = React.createFactory(require('./TouchComponents').TouchDiv);
var span = React.createFactory(require('./TouchComponents').TouchSpan);
import DOM from 'react-dom-factories';

const a = DOM.a;

import PropTypes from 'prop-types';
import {withTransitionHelper} from './RouterTransitionHelper';
import { Observable } from 'windowed-observable';
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import { getObject, setObject } from '../util/SessionStorage';

var Dashboard = createReactClass({
  displayName: 'Dashboard',

  propTypes: {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    params: PropTypes.shape({
      fileId: PropTypes.string,
      taskId: PropTypes.string
    }),
    query: PropTypes.shape({
      dashboardId: PropTypes.string,
      drilldownId: PropTypes.string,
      reportId: PropTypes.string
    }),
    tabListSize: PropTypes.number,
    isHomePage: PropTypes.bool,
    homePageDrilldownHelper: PropTypes.func,
    homePagePropsChangeDrilldown: PropTypes.func,
    skipIndex: PropTypes.number
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function () {
    return {
      // `immVizLegendStates` stores the state of graphical report's legend selection. `immVizLegendStates` consists of
      // {[vizConfig.key]: {[series.name]: isVisible}.
      immVizLegendStates: Imm.Map(),
      rightSectionValue: "",
      selectedTab: { default: "tab-1" },
      selectedTaskTab: ""
    };
  },

  shouldComponentUpdate: function (nextProps, nextState) {
      return ShallowCompare(this, nextProps, nextState);
  },

  componentWillMount() {
    let taskId = this.props.params.taskId;
    let datareviewId = this.props.immExposureStore.getIn(['tasks', taskId, 'task', 'taskExtraInformation', 'datareviewId']);
    if (datareviewId) {
      this.context.router.replace({
        name: RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_SHOW,
        params: {taskId: taskId}
      });
    }
  },

  // When this component is first rendered, we need to fetch the file that will
  // be rendered if we do not have it loaded yet. Note that this should be kept
  // in sync with the componentWillReceiveProps behavior.
  componentDidMount: function () {
    document.getElementsByClassName('report-body')[0].addEventListener('wheel', this.handleMultiScroll, {passive: false});

    var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    // This is for untied task case.
    if (_.isUndefined(fileId)) {
      return;
    }
    GA.sendDocumentOpen(fileId, GA.DOCUMENT_TYPE.FILE);
    // When the user directly navigates to an invalid drilldownId, we ignore it.
    if (this.props.query.drilldownId && !this.props.immExposureStore.hasIn(['drilldown', this.props.query.drilldownId])) {
      this.context.router.replace(this.props.location.pathname);
    } else if (!this.props.params.taskId) {  // Tasked associated file is fetched in fetchTask.
      ExposureActions.fetchFile(fileId, {drilldownId: this.props.query.drilldownId}, {
        fetchData: true,
        setCurrentDashboard: true,
        firstRender: true
      });
    }

    ExposureActions.clearSkipIndex();
  },

  componentWillReceiveProps: function (nextProps) {
    const tabListSize = this.props.tabListSize;
    const newTabListSize = nextProps.tabListSize;
    // TODO: Remove nextTaskId if it is no longer needed due to task navigation being gone.
    var nextTaskId = nextProps.params.taskId;
    var currentFileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    var nextFileId = ReportUtil.getReportOrDashboardId(nextProps.params, nextProps.query, nextProps.immExposureStore);
    // Fetch file if tab was deleted in edit mode.
    if (newTabListSize < tabListSize) {
      ExposureActions.fetchFile(
        nextFileId,
        {drilldownId: nextProps.query.drilldownId},
        {fetchData: true, setCurrentDashboard: true, firstRender: true}
      );
    }
    let clonedTaskDetails = this.props.immExposureStore.get('taskStoreDetailsData');
    
    if(clonedTaskDetails){
      let clonedContextEntity = clonedTaskDetails.getIn(['task', 'coreTaskAttributes', 'reportId']) ||
                              clonedTaskDetails.getIn(['task', 'coreTaskAttributes', 'dashboardId'])
      if(currentFileId !== clonedContextEntity ){
        ExposureActions.storeTaskDetailsAction(false)
        ExposureActions.storeTaskDetailsDataAction(null)
        ExposureActions.storeClonedTriggeredAction(false)
      }
    }
    //  Only transition to file when the file is not opened along with a task.
    if (!nextTaskId && (currentFileId !== nextFileId || this.props.query.drilldownId !== nextProps.query.drilldownId)) {
      if (this.props.location.pathname === RouteNameConstants.EXPOSURE_HOME_EDITOR) {
        this.props.homePagePropsChangeDrilldown(currentFileId, nextFileId, nextProps.query.drilldownId);
      } else {
        ExposureActions.transitionFile(currentFileId, nextFileId, nextProps.query.drilldownId);
      }
    }
    // If the drilldown was invalid (previous report and current report have different schemas), switch the path back.
    if (nextProps.query.drilldownId && !nextProps.immExposureStore.hasIn(['drilldown', nextProps.query.drilldownId])) {
      this.context.router.replace(this.props.location.pathname);
    }
  },

  componentDidUpdate: function (prevProps) {
    // Add various perf metrics to the DOM for automated performance
    // testing. This may be called multiple times during the course of a "render
    // flow", but the final value should be accurate.
    let $dashboardView = $(ReactDOM.findDOMNode(this.refs['dashboardView']));

    // Get the file we are rendering and check if any reportMetrics exist. If
    // they do, add them to the DOM. If not, remove the existing data if it
    // exists as it must be old.
    const fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    const immReportMetrics = this.props.immExposureStore.getIn(['files', fileId, 'reportMetrics'], Imm.Map());
    if (immReportMetrics.isEmpty()) {
      $dashboardView.removeData([
        'simpleRenderTime',
        'totalRequestTime',
        'totalSequentialQueryTime',
        'queryPlanTime',
        'firstChartRenderTime',
        'lastChartRenderTime']);
    } else {
      $dashboardView.data({
        simpleRenderTime: new Date() - window.comprehend.startRenderTime,
        totalRequestTime: immReportMetrics.get('totalRequestTime'),
        totalSequentialQueryTime: immReportMetrics.get('totalSequentialQueryTime'),
        queryPlanTime: immReportMetrics.get('queryPlanTime')
      });
    }

    const {immExposureStore} = this.props;
    const {taskId} = this.props.params;
    const immTask = immExposureStore.getIn(['tasks', taskId, 'task'], Imm.Map());

    // If we have the task information available, we can safely parse the info from the object and do a redirect.
    if (taskId && !immExposureStore.getIn(['tasks', taskId, 'task'], Imm.Map()).isEmpty()) {
      const yfFileId = immTask.get('coreTaskAttributes', 'reportId', '') || immTask.getIn(['extendedTaskAttributes', 'associatedEmbeddedReportId'], false);

      if (yfFileId && immTask.getIn(['extendedTaskAttributes', 'fromYellowfinReport'], false)) {
        const siteNames = immTask.getIn(['extendedTaskAttributes', 'siteNames'], Imm.List()).toJS();
        const studyNames = immTask.getIn(['extendedTaskAttributes', 'extraStudyInformation', 'studyNames'], Imm.List()).toJS();

        let filters = [];
        if (siteNames.length > 0) {
          filters.push(new YellowfinFilter(['Site', 'Site Name'], siteNames));
        }

        if (studyNames.length > 0) {
          filters.push(new YellowfinFilter(['Study', 'Study Name'], studyNames));
        }

        this.context.router.replace({
          name: RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW,
          state: {filters: filters, ignoreStudySessionFilter: true, fileId: yfFileId},  // These will be available in the child component within props.router.location.state
          params: {taskId: taskId}
        });
      }
    }
    if(this.props.immExposureStore.get('selectedTab') != prevProps.immExposureStore.get('selectedTab')) {
      this.setState({
        selectedTaskTab: this.props.immExposureStore.get('selectedTab')
      });
    }
  },

  componentWillUpdate: function (nextProps, nextState) {
    var oldFileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    var nextFileId = ReportUtil.getReportOrDashboardId(nextProps.params, nextProps.query, nextProps.immExposureStore);
    if (oldFileId !== nextFileId) {
      Util.shouldFilterPaneBeOpened(nextFileId, nextProps.immExposureStore);
      if (nextProps.immExposureStore.get('showTaskPane') === false){
        this.setState({rightSectionValue:""})
       }
    }
  },

  componentWillUnmount: function () {
    document.getElementsByClassName('report-body')[0].removeEventListener('wheel', this.handleMultiScroll);

    var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    if (!_.isUndefined(fileId)) {
      ExposureActions.transitionFile(fileId, null);
    }
    ExposureActions.toggleTasksPane(false);
  },

  // To avoid multiple scroll scrolling at same time
  handleMultiScroll: function (e) {
    // Check if the cursor is pointed on fixed-data-table component
    if (typeof e?.target?.className === 'string' && e?.target?.className?.toLowerCase().includes("fixed")) {
      e.preventDefault();
    } else {
      return false;
    }
  },

  // When individual charts render, they can call this method to update the perf
  // metrics attribute.
  setRenderTime: function (dataAttribute, time) {
    $(ReactDOM.findDOMNode(this.refs['dashboardView'])).data(dataAttribute, time);
  },

  handleToggleFiltersPane: function () {
    ExposureActions.toggleFiltersPane();
  },

  /**
   * Determine whether the dashboard component is dirty (true in the case of the
   * AddTask/ViewTask component being dirty).
   */
  isDirty() {
    return this.refs['task'] && this.refs['task'].isDirty();
  },

  handleToggleTasksPane: function (currentFileId) {
    this.setState({rightSectionValue:""},()=>{
      ExposureActions.toggleTasksPane(false);
     });

     if (
      this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_NEW,
      params: this.props.params,
      query: this.props.query
    })){
      this.context.router.push(RouteNameConstants.EXPOSURE_TASKS);
    }
  },

  handleShowAddTasksPane: function (fileId, fileType) {
    var queryParams = null;
    var routeName = null;
    const clientId = Util.getClientIdOfModule();
    ExposureActions.clearTaskInformationTemp();
    if (this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_NEW,
      params: this.props.params,
      query: this.props.query
    })){
        if(fileType && fileType !== ExposureAppConstants.NO_ASSOCIATED_FILE){
      switch (fileType) {
        case ExposureAppConstants.FILE_TYPE_REPORT:
          queryParams = {reportId: fileId, drilldownId: this.props.query.drilldownId, disableAssociatedReports: true, appName: clientId};
          routeName = RouteNameConstants.EXPOSURE_TASKS_NEW
          break;
        case ExposureAppConstants.FILE_TYPE_DASHBOARD:
          queryParams = {dashboardId: fileId, drilldownId: this.props.query.drilldownId, disableAssociatedReports: true};
          routeName = RouteNameConstants.EXPOSURE_TASKS_NEW
          break;
        case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
          queryParams = {fileId: fileId, disableAssociatedReports: false};
          routeName = RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_NEW
          break;
      }
      this.context.router.push({name: routeName, query: queryParams});
    } else {
      this.context.router.push({name: RouteNameConstants.EXPOSURE_TASKS_NEW});
    }
    }else{
      const immExposureStore = this.props.immExposureStore;
      const immReport = immExposureStore.getIn(['files', fileId]);
      const actionType = FrontendConstants.ADD_TASK;
      let args = { immReport, immExposureStore, actionType };
      let taskObject = Util.generateContextObject(args);
      taskObject.isLegacyDashboard = true;
      observable.publish(taskObject);
    }
  },

  addTaskSuccessCallback: function(flag) {
    this.setState({rightSectionValue:""} ,()=>{
      ExposureActions.toggleTasksPane(!flag);
    });
    if (
      this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_NEW,
      params: this.props.params,
      query: this.props.query
    })){
      this.context.router.push(RouteNameConstants.EXPOSURE_TASKS);
    }
  },

  handleShareFile: function (fileId) {
    ExposureActions.shareFilesModal(Imm.List([fileId]));
  },

  handleUpdateVizLegend: function (immVizLegendStates) {
    this.setState({immVizLegendStates});
  },

  getTaskView: function (currentFileId, immFile, isLinkedToCDMFile) {
    var isUnsavedWarningDisplayed = this.props.immExposureStore.get('modalContent', {}).type === ModalDialogContent.UnsavedWarning;
    var handleToggleTasksPane = this.handleToggleTasksPane.bind(null, currentFileId);
    var immExposureStore = this.props.immExposureStore;

    var defaultProps = {
      ref: 'task',
      currentFileId,
      isLinkedToCDMFile,
      currentUserId: immExposureStore.getIn(['userInfo', 'id']),
      handleToggleTasksPane: handleToggleTasksPane,
      immFileConfigs: immExposureStore.get('fileConfigs'),
      immGroupEntities: immExposureStore.get('groupEntities'),
      immUsers: immExposureStore.get('users'),
      immTaskTypes: immExposureStore.get('taskTypes'),
      immCDMDropdownData: this.props.immExposureStore.get('CDMDropdownData'),
      isLoading: immExposureStore.get('isLoadingTask')
    };
    let addTaskContainer = AddTask(_.extend(defaultProps, {
      immExposureStore,
      drilldownId: this.props.query.drilldownId,
      handleLinkedFileChange: this.handleShowAddTasksPane,
      isUnsavedWarningDisplayed: isUnsavedWarningDisplayed,
      route: this.props.route,
      disableAssociatedReports: this.props.query.disableAssociatedReports === "true" ? true : false,
      appName: this.props.query.appName,
      addTaskSuccessCallback: this.addTaskSuccessCallback,
      taskStoreDetails: this.props.immExposureStore.get('taskStoreDetails'),
      taskStoreDetailsData: this.props.immExposureStore.get('taskStoreDetailsData'),
      hideHeader: this.state.rightSectionValue === "AddTask"
    }));
    if (this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_NEW,
      params: this.props.params,
      query: this.props.query
    })) {
      return addTaskContainer;
    }else if (this.props.params.taskId && this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_SHOW,
      params: this.props.params,
      query: this.props.query
    })) {
      return ViewTask(_.extend(defaultProps, {
        immExposureStore,
        currentTaskId: this.props.params.taskId,
        immTaskSummaries: immExposureStore.get('taskSummaries'),
        immTaskWrappers: immExposureStore.get('tasks'),
        isUnsavedWarningDisplayed: isUnsavedWarningDisplayed
      }));
    }
  },

  isScrolledIntoView: function (elem) {
    const docViewTop = $(window).scrollTop();
    const docViewBottom = docViewTop + $(window).height();

    const elemTop = elem.offset().top;
    const elemBottom = elemTop + elem.height();

    const result = ((elemBottom > docViewTop) && (elemTop < docViewBottom))
    return result;
  },

  isHeaderVisible: function () {
    return this.isScrolledIntoView($(ReactDOM.findDOMNode(this.refs['pageHeader'])))
  },

  isReady: function () {
    const {immExposureStore} = this.props;
    const {taskId} = this.props.params;

    const associatedReportFileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
    const immAssociatedFile = immExposureStore.getIn(['files', associatedReportFileId, 'fileWrapper', 'file']);

    // If we don't have the task fully loaded
    if (taskId && this.props.immExposureStore.getIn(['tasks', taskId, 'task'], Imm.Map()).isEmpty()) {
      return false;
    }

    // If we're loading the task still, or we don't have the associated report / dashboard
    if (associatedReportFileId && !immAssociatedFile && immExposureStore.get('isLoadingTask')) {
      return false;
    }

    // Otherwise, we're ready
    return true;
  },
  
  switchActiveTab: function (event) {
    let allButtons = document.getElementsByClassName('wdt-tab-button');
    for (let i = 0; i < allButtons.length; i++) {
      document.getElementsByClassName('wdt-tab-button')[i]?.classList?.remove("active")
    }
    event.currentTarget.classList.add("active");
  },

  cancelPreviousApiCalls: function (apiCalls, fileId) {
    apiCalls?.map((xhr) => {
      xhr?.abort();
    })
    ExposureActions.deleteRequests(fileId);
  },
  
  changeTab: async function (currentTab) {
    return new Promise((resolve) => {
      resolve( 
        this.setState({
        selectedTab: currentTab
        })
      );
    })
  },

  updateStore: async function(currentTab, tabName, event) {
    let fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    let apiCalls = this.props.immExposureStore?.get('files')?.get(fileId)?.get('reportData')?.get('apiRequests')?.toJS();
   
    this.switchActiveTab(event);
    setObject("currentWidgetizationTab", tabName);
    this.cancelPreviousApiCalls(apiCalls, fileId);
    this.setState({
      selectedTab: currentTab,
      selectedTaskTab: tabName
    })

    let widgetMetaData = currentTab?.dashboardWidgets
    let { dashboardLayoutProps, style, FilterDependentWidget, isApply } = currentTab;
    let dashboardCustomConfigs = {  dashboardLayoutProps, style, FilterDependentWidget, isApply };

    ExposureActions.updateWidgetMetaData(fileId, widgetMetaData, dashboardCustomConfigs);
  },

  createtabs: function(fileId, immExposureStore) {
    let reportData = immExposureStore?.get('files')?.get(fileId)?.get('reportData');
    let dashboardCustomConfigs = reportData?.get("dashboardCustomConfigs")?.toJS()
    let tabs = reportData?.get("tabs")?.toJS();
    let currentSessionTab = getObject("currentWidgetizationTab") || "";
    let isViewTasks = immExposureStore.toJS().isViewTasks;

    if (!_.isEmpty(tabs) && dashboardCustomConfigs) {
      let tabButtons = [];
      let tabKeys = tabs && Object.keys(tabs);
      let selectedTab = isViewTasks ? immExposureStore.toJS().selectedTab : '';
  
      for (let i = 0; i < tabKeys?.length; i++) {
        let tabName = tabKeys[i];
        let currentTab = tabs[tabKeys[i]];
        let disabledButton = isViewTasks ? this.state.selectedTaskTab == tabName : currentSessionTab === tabName;
        
        isViewTasks ?
          tabButtons.push(<button
            className={tabName == selectedTab ? "wdt-tab-button active" : "wdt-tab-button"}
            onClick={(event) => this.updateStore(currentTab, tabName, event)}
            disabled={disabledButton}
          >
            {tabName}
          </button>) :
          tabButtons.push(<button
            className={i !== 0 ? "wdt-tab-button" : "wdt-tab-button active"}
            onClick={(event) => this.updateStore(currentTab, tabName, event)}
            disabled={disabledButton}
          >
            {tabName}
          </button>)
      }
      
      return <>
      {tabs ? <div className='wdt-tabs-container'>
        {tabButtons}
      </div> : null}
      </>
    }
  },

  render: function () {
    var immExposureStore = this.props.immExposureStore;
    var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
    var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    const isLinkedToCDMFile = Util.isCDMFile(immExposureStore, immFile);
    var taskView = this.getTaskView(fileId, immFile, isLinkedToCDMFile);
    var showTasks = !_.isUndefined(taskView) && this.state.rightSectionValue !== "AddTask";
    const isMobile = Util.isMobile();
    var hideFilterPanel = immFile == undefined ? true : immFile.get('hideLeftFilterPanel');
    var isFileDisplayed = false;

    var reports, updatedText, reportTitle, fileType, editRoute, reportParams;
    if (!this.isReady()) {
      // Show a spinner while the task is loading and the file hasn't loaded.
      reports = ContentPlaceholder();
      updatedText = 'Updated N/A';

      // reports = ContentPlaceholder();
      // updatedText = 'Updated N/A';
    } else if (_.isUndefined(fileId)) {
      reports = [
        div({key: 'no-report', className: 'no-report'}, 'No Visualization'),
        div({key: 'no-report-desc', className: 'no-report-desc'}, FrontendConstants.TASK_NO_ASSOCIATION)
      ];
      reportTitle = 'Report';
    } else if (immExposureStore.getIn(['files', fileId, 'fileRequestRejectedWith404'])) {
      reportTitle = this.props.params.taskId && !_.isUndefined(immExposureStore.getIn(['loadedTask', 'dashboardId'])) ? 'dashboard' : 'report';
      reports = [
        div({key: 'no-report', className: 'no-report'}, 'No Visualization'),
        div({
          key: 'no-report-desc',
          className: 'no-report-desc'
        }, 'This ' + reportTitle + " doesn't exist or you don't have access to it.")
      ];
    } else if (!immFile) {
      reports = ContentPlaceholder();
      updatedText = 'Updated N/A';
    } else {
      reportTitle = immFile.get('title');
      fileType = immFile.get('fileType');
      var reportIds,
        dashboardId = null;
      switch (fileType) {
        case ExposureAppConstants.FILE_TYPE_DASHBOARD:
          dashboardId = fileId;
          reportIds = immFile.get('reportIds', Imm.List()).toJS();
          editRoute = RouteNameConstants.EXPOSURE_DASHBOARDS_EDIT;
          reportParams = {fileId: fileId};
          break;
        case ExposureAppConstants.FILE_TYPE_REPORT:
          reportIds = [fileId];
          if (immFile.getIn(['templatedReport', 'isAdvancedReport'], false)) {
            editRoute = RouteNameConstants.EXPOSURE_TEMPLATES_EDIT_ADVANCED_REPORT;
            reportParams = {advancedReportId: fileId};
          } else if (immFile.get('templatedReport')) {
            editRoute = RouteNameConstants.EXPOSURE_ADHOC_REPORTS_EDIT;
            reportParams = {fileId: fileId};
          } else {
            editRoute = RouteNameConstants.EXPOSURE_REPORTS_EDIT;
            reportParams = {fileId: fileId};
          }
      }

      const skipIndex = this.props.immExposureStore.get('skipIndex', null);
      reports = ReportsWrapper({
        drilldownId: this.props.query.drilldownId,
        dashboardId: dashboardId,
        tasksVisible: showTasks,
        fileType: fileType,
        immExposureStore: immExposureStore,
        reportIds: reportIds,
        immVizLegendStates: this.state.immVizLegendStates,
        handleUpdateVizLegend: this.handleUpdateVizLegend,
        setRenderTime: this.setRenderTime,
        isHomePage: this.props.isHomePage,
        homePageDrilldownHelper: this.props.homePageDrilldownHelper,
        showAddTaskPanel:this.handleShowAddTasksPane,
        skipIndex,
        selectedTab: this.state.selectedTab
      });
      updatedText = 'Updated ' + Util.dateTimeFormatter(immFile.get('updatedAt'));
      isFileDisplayed = true;
      hideFilterPanel = immFile == undefined ? true : immFile.get('hideLeftFilterPanel');
    }
    var canEdit = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'canEdit'], false);

    // A user must have CREATE_TASK on the account in order to create a task.
    var userHasCreateTask = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask')
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT);

    const filterComponent = Filters({
      isLinkedToCDMFile,
      immExposureStore,
      fileId,
      cookies: this.props.cookies,
      drilldownId: this.props.query.drilldownId,
      handleClose: this.handleToggleFiltersPane,
      shouldHaveFixedPosition: this.isHeaderVisible,
    });
    const filter = fileId ? filterComponent : null;
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);

    let showFilter = hideFilterPanel ? null : SimpleAction({
     class: 'toggle-filters icon-filter2',
     text: FrontendConstants.FILTERS,
     onClick: fileId ? this.handleToggleFiltersPane : _.noop
   });

    return (
      div({
          className: cx('app-tab-report',
            {
              'show-filters': hideFilterPanel ? false : immExposureStore.get('showFiltersPane'),
            })
        },
        div({className: 'page-header', ref: 'pageHeader'},
          isHomeActive
            ? null
            : Breadcrumbs({
              immExposureStore,
              fileId,
              isMobile
            }),
          immExposureStore.toJS().isViewTasks ?
            <div className='header-buttons'>
              <>{this.createtabs(fileId, immExposureStore)}</>
            </div>
            : div({ className: 'header-buttons' },
              <>{this.createtabs(fileId, immExposureStore)}</>,
              a({ className: cx('icon-report'), href: '/folders/' },
              ! hideFilterPanel? span({className: ''}, ' All Analytics'): ''
              ),
          showFilter,
            Menu({className: 'more-menu', horizontalPlacement: 'left'},
           ! hideFilterPanel?  MenuTrigger({className: 'more-menu-trigger'}, div({className: 'react-menu-icon icon-menu2'}, 'More')):'',
              MenuOptions({className: 'more-menu-options'},
                userHasCreateTask && !hideFilterPanel ? MenuOption({
                    className: 'more-menu-add',
                    onSelect: this.handleShowAddTasksPane.bind(null, fileId, fileType)
                  },
                  div({className: 'react-menu-icon icon-plus-circle2'}, FrontendConstants.ADD_A_TASK)) : null,
                MenuOption({
                    className: 'more-menu-share',
                    disabled: !isFileDisplayed,  // Disable share option if the file is not displayed.
                    onSelect: this.handleShareFile.bind(null, fileId)
                  },
                  div({className: 'react-menu-icon icon-share'}, 'Share')),
                MenuOption({
                    className: 'more-menu-edit',
                    disabled: !canEdit,
                    onSelect: () => this.context.router.push({name: editRoute, params: reportParams})
                  },
                  div({className: 'react-menu-icon icon-pencil'}, 'Edit'))
              )
            ),
            isHomeActive && HelpUtil.isInAppHelpExists(reportTitle)
              ? a({
                className: cx('icon-question-circle', 'home-page-help'),
                href: Util.formatHelpLink(reportTitle),
                target: '_blank'
              },
              span({className: 'home-page-help-text'}, FrontendConstants.HELP)
              )
              : null
          )),
        filter,
        div({className: cx('report-body', {'item-detail-modal-is-open': immExposureStore.get('showMobileTabularReportDetails') || showTasks})},
          div({className: 'dashboard-view', ref: 'dashboardView'}, reports)),
        // Note: If this div starts popping up inside of the 'report-body' on a
        // highchart report make sure that the highchart html doesn't use any
        // abbreviated HTML tags, e.g. <div \>, since they aren't parsed
        // correctly and don't get closed.
        div({className: 'tasks'}, taskView))
    );
  }
});

module.exports = withTransitionHelper(Dashboard);
