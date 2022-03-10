var _ = require('underscore');

var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');
var FrontendContants = require('../../constants/FrontendConstants');
import { getObject, setObject } from '../../util/SessionStorage';

/*
 * This Mixin is to define some React lifecycle methods in components for Tasks Landing Page.
 *
 * Used by: TasksViewWidget, MobileTasksWidget
 * Required child functions/fields: defaultPageSize, isValidPageSize, props.query, props.immExposureStore
 */
const immAppConfig = comprehend.globals.immAppConfig;
const user_info = immAppConfig.get('user_info')
const apps = user_info.get('apps')

let AppNameArray =  [FrontendContants.CLINICAL_INSIGHTS, FrontendContants.OPERATIONS_INSIGHTS, FrontendContants.CDR, FrontendContants.KPI_STUDIO, 'RBQM', 'Other']
let AppNameSelected = [
  {
  "name": FrontendContants.CDR,
  "isChecked": true
  },
  {
    "name": 'Other',
    "isChecked": true
  }
];

AppNameArray.map((i)=>{
  apps.toJS().map((j)=>{
    if(i === j.name){
      AppNameSelected.push( {
        "name":j.name,
        "isChecked": true
    })
    }else if(j.name === 'RACT' || j.name === 'Oversight Scorecard'){
      AppNameSelected.push( {
        "name":'RBQM',
        "isChecked": true
    })
    }

  })
})

let paginationRequest = {}
paginationRequest['taskStateFilter'] = 'OPEN'
paginationRequest['relationshipFilter'] = 'Assignee'
paginationRequest['begin'] = 0
paginationRequest['length'] = 20
paginationRequest['appName'] = AppNameSelected

let countRequest = {}
countRequest['taskStateFilter'] = 'OPEN'
countRequest['relationshipFilter'] = 'Assignee'
countRequest['appName'] = AppNameSelected

var TasksViewMixin = {

  routeName: RouteNameConstants.EXPOSURE_TASKS,
  storeName: 'immExposureStore',
  storeKey: 'tasksView',

  getInitialState: function () {
    // Tracks whether we've done sufficient preliminary render passes. Here one initial render pass is sufficient.
    return { renderedEnough: false };
  },

  shouldComponentUpdate: function (nextProps) {
    // Wait for store change, no need to render when query is changing.
    return _.isEqual(this.props.query, nextProps.query);
  },

  componentDidMount: function () {
    ExposureActions.setLoadingCollaboration(true)
    const collabNav = JSON.parse(getObject('collaboration-navigation'))
    let sessionFilters = Util.getSessionFiltersFromCookie(this.props.immExposureStore.get('currentAccountId'));
    if (collabNav && sessionFilters['collaboration'] === true) {
      countRequest['relationshipFilter'] = collabNav['relationshipFilter']
      countRequest['appName'] = collabNav['appName']
      ExposureActions.fetchTasksWithParameters(true, collabNav);
      ExposureActions.fetchTasksApplicationsCount(countRequest);
      ExposureActions.fetchClosedTasksWithParameters(true, collabNav);
    } else {
      ExposureActions.fetchTasksWithParameters(true, paginationRequest);
      ExposureActions.fetchTasksApplicationsCount(countRequest);
      ExposureActions.fetchClosedTasksWithParameters(true, paginationRequest);
    }
    this.setState({ renderedEnough: true });
    GA.sendDocumentOpen(GA.CONSTANTS.TASKS_LANDING, GA.DOCUMENT_TYPE.TASKS);
    // We already do `ExposureActions.fetchTaskSummaries` in `Exposure.js`.
    // Add a guard to avoid sending unnecessary call when the user navigates directly
    // to the task list view.
    if (!this.props.immExposureStore.get('taskSummariesRequest')) {
      ExposureActions.fetchTaskSummaries();
    }
    ExposureActions.setLoadingCollaboration(false)
  },

  // Check if all tasks are loaded.
  areTasksReady: function (immExposureStore, renderedEnough) {
    // Wait until fetchFile action returns and metadata field is populated.
    var tasksExist = !immExposureStore.get('tasks').isEmpty();
    var tasksViewFileIdsExist = !immExposureStore.getIn(['tasksView', 'taskIds']).isEmpty();
    var tasksViewIsEmpty = immExposureStore.getIn(['tasksView', 'isEmpty'], false);
    var tasksRequestInFlight = immExposureStore.has('tasksRequest');
    var isReady = tasksExist && tasksViewFileIdsExist ||  // Fully loaded, or reloading from fully loaded.
      !tasksRequestInFlight && !tasksViewFileIdsExist && !tasksExist && renderedEnough && tasksViewIsEmpty ||  // An empty tasks, first load.
      !tasksRequestInFlight && !tasksViewFileIdsExist && tasksExist && tasksViewIsEmpty;  // An empty tasks list, subsequent loads.
    return isReady;
  },

  listViewInvalid: function () {
    if (!this.props.immExposureStore.get('tasksRequest')) {
      switch (this.props.immExposureStore.getIn(['tasksView', 'isValid'])) {
        case ListViewConstants.LIST_VIEW_VALID:
          return null;
        case ListViewConstants.LIST_VIEW_INVALID_QUERY:
          return FrontendConstants.ERROR_URL_QUERY;
        case ListViewConstants.LIST_VIEW_NOT_FOUND:
          return FrontendConstants.ERROR_NOT_FOUND;
        default:
          return null;
      }
    } else {
      return null;
    }
  }
};

module.exports = TasksViewMixin;
