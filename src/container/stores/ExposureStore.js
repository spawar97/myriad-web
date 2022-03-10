import React from 'react';
import $ from 'jquery';
import _ from 'underscore';
import HttpStatus from 'http-status-codes';
import Imm from 'immutable';

import CookieStore from './CookieStore';
import CookieActions from '../actions/CookieActions';
import ExposureActions from '../actions/ExposureActions';
import SearchActions from '../actions/SearchActions';
import ModalDialogContent from '../components/ModalDialogContent';
import ExposureAppConstants from '../constants/ExposureAppConstants';
import ExposureConstants from '../constants/ExposureConstants';
import ExposureNavConstants from '../constants/ExposureNavConstants';
import ExposureSharingConstants from '../constants/ExposureSharingConstants';
import FilterUpdateTypes from '../constants/FilterUpdateTypes';
import FrontendConstants from '../constants/FrontendConstants';
import HttpResponseConstants from '../constants/HttpResponseConstants';
import ListViewConstants from '../constants/ListViewConstants';
import ModalConstants from '../constants/ModalConstants';
import RouteNameConstants from '../constants/RouteNameConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
import AppDispatcher from '../http/AppDispatcher';
import AppRequest from '../http/AppRequest';
import { AppRequestByFetch, AppRequestByFetchPDF } from '../http/AppRequest';
import GA from '../util/GoogleAnalytics';
import ImmEmptyFile from '../util/ImmEmptyFile';
import QueryUtils from '../util/QueryUtils';
import ReportUtil from '../util/ReportUtil';
import TemplateLibrary from '../util/TemplateLibrary';
import Util from '../util/util';
import Store from './Store';
import keymirror from "keymirror";
import PermissionsUtil from "../util/PermissionsUtil";
import { AccessPermissionsConstants } from '../constants/PermissionsConstants';
import { FeatureListConstants } from "../constants/PermissionsConstants";
import Key from './constants/ExposureStoreKeys';
import { getExposureStore } from '../CustomRenderer';
import { delItem, setObject, getObject } from '../util/SessionStorage';
import { getExposureStoreForExport } from '../util/PDFExportUtil';  
import { callTaskCountApi } from '../components/contextfilters/WidgetMenu';


// Immutable _immExposureStore object to hold the state of Exposure.  It's
// important to not modify this in place so that we can take advantage of
// `shouldComponentUpdate` in React components with simple object equality
// checks for performance improvements.
var _immExposureStore = Imm.fromJS({
  /* These are the values of the filters currently applied. The structure of it will be as follows:
   *
   *                       _             _
   *                      |  tasks   -> |  filterName -> <selection value>
   *                      |             |_      *
   * activeListFilters -> |              _
   *                      |_ filters -> |  filterName -> <selection value>
   *                                    |_      *
   */
  activeListFilters: {
    tasks: {},
    folders: {}
  },
  backNavActionStack: [],
  currentDashboardId: null,
  disableSessionFilters: null,
  displayWarningModal: false,
  taskStoreDetails:false,
  taskStoreDetailsData:null,
  clonedTriggered:false,
  /*           _           _
   *          | userId -> |   id
   * users -> |   *       |   userEntityId
   *          |   *       |   firstName
   *          |   *       |   lastName
   *          |   *       |   fullName
   *          |   *       |   username
   *          |   *       |   email
   *          |   *       |   isSelectable
   *          |   *       |_
   *          |_  *
   */
  users: {},

  // Map ( userEntityId -> userId )
  userEntities: {},

  /*                   _                  _
   * groupEntities -> | groupEntityId -> |  id
   *                  |   *              |  accountId
   *                  |   *              |  name
   *                  |   *              |_
   *                  |_  *
   */
  groupEntities: {},

  cdmSchemaIds: [],  // Common Data Model schemaIds.

  comprehendSchemas: null,

  clinicalColumnMap: {
    "cqs.study.studyid": "studyIds",
    "cqs.site.sitecountry": "siteCountries",
    "cqs.site.siteid": "siteIds"
  },

  // Map ( comprehendSchemaId -> Map ( datasourceName -> DatasourceDescriptor ) )
  comprehendSchemaOverviews: {},
  /*
   * -  This is the central file store in frontend.
   *
   * -  Notice that we use a flattened class 'File' to represent all user created files,
   *    including folders, dashboard, reports, etc. See Aperture.proto
   *
   * -  For tabular reports, we maintain a tabularReportState object. This stores pagination and sort state for tabular reports.
   *    When the user switches to a different report or dashboard, this object should be reset to an empty state.
   *
   *    An object in this map looks like the following: {pageLowerLimit: Integer, pageUpperLimit: Integer, pageOrderings: Array, query: {}}
   *    Note that `query` is the single parsed cqlQuery for the tabular report.
   *
   * -  For dashboards and reports, we maintain a filterStates object. This stores the current selection state of the applied filters.
   *    This is an array of objects, where each object contains the following:
   *      > `column`: The Column object (see QueryEngine.proto) representing the property column the applied filter is on.
   *      > `filterType`: Indicates slider or dropdown.
   *      > `data`: A list of strings representing the data that is in the filter. For dropdowns, it is a list of distinct values
   *        for the property. For sliders, it is the maximum and minimum value the slider show allow.
   *      > `itemsSelected`: Used only for dropdowns -- indexes into the data field that indicate the currently selected values to filter on.
   *      > `allSelected`: Used only for dropdowns -- indicates if all non-null values are selected. If this is true, `itemsSelected`
   *        will be empty.
   *      > `nullExcluded`: Indicates if we want to exclude NULL from the filter.
   *      > `currentBounds`: Used only for sliders -- the currently set minimum and maximum value to filter on. These values must
   *        be within the bounds set by `data`. If `currentBounds` is not present, it is assumed to be the full range in `data`.
   *
   * -  Each file's info is identified using its fileId. Any file specific info
   *    in UI should be fetched from its entry in the 'files' map, this way we maintain
   *    frontend app-level consistency for each file (eg: info in a thumbnail and a
   *    fully-rendered dashboard would be consistent)
   *
   * -  The reportData may be empty for reports that are not opened (eg: report list view only need
   *    metadata from the wrapper), but when this is fetched, it should respect currentReportWrapper.
   *
   * -  A simple diagram as the following
   *                                     _
   *                                    |   fileWrapper  (always consistent with server)
   *                                    |
   *                                    |   tabularReportState
   *                                    |
   *                                    |   includedStaticFilters  (only used for reports)
   *                                    |
   *                                    |   filterStates
   *             _                      |
   *            |   fileId (UUID) ->    |   reportData  (could be empty)
   *            |         *             |
   * files ->   |         *             |   dataRequest  (outstanding AppRequest for fetching reportData if there is one,
   *            |         *             |                 this is to allow pagination/sorting requests to abort)
   *            |         *             |
   *            |         *             |   updateFileRequest  (outstanding AppRequest to update a file)
   *            |         *             |
   *            |         *             |   fileRequestInFlight  (we currently have a request running to fetch the
   *            |         *             |                         file configuration)
   *            |         *             |
   *            |         *             |   fileRequestRejectedWith404  (if the file request is rejected with 404, don't keep trying)
   *            |         *             |
   *            |         *             |   fileSCCs (any SCCs applied to the file)
   *            |         *             |
   *            |         *             |   taskFilters (taskFilters applied to the file)
   *            |         *             |
   *            |         *             |_  visibleMonitorTrendlines (only used for monitors)
   *            |         *
   *            |   'landing-page' : a special default view of the `Reports` tab
   *            |_
   *
   * folderRequest
   *
   */
  files: {
    // The `landing-page` is the default view of the `Analytics` tab.
    'landing-page': {
      fileWrapper: {
        file: {
          id: ExposureAppConstants.REPORTS_LANDING_PAGE_ID,
          title: ExposureNavConstants.EXPOSURE_REPORTS_TAB
        }
      }
    }
  },

  /*
   * - fileConfigs are simply the file protobuf message.
   *   They do not have additional information like metadata, reportIds, etc.
   *
   * -  A simple diagram as the following
   *                   _                       _
   *                  |   fileId (UUID) ->    | fileConfigRequestInFlight   (we currently have a request running to fetch the
   *                  |         *             |                              file configuration)
   * fileConfigs ->   |         *             |
   *                  |         *             | fileConfig  (only really important for names/types and other info about
   *                  |         *             |                the file itself)
   *                  |         *             |_
   *                  |_
   *
   * fileConfigsRequestInFlight
   */
  fileConfigs: {},
  fileConfigsRequestInFlight: false,

  // Current requests for EntityPrivileges on files for the current user.
  filesPrivilegeRequests: null,

  // Current request for EntityPrivileges on a file for all entities on the account.
  filePrivilegeCapabilitiesRequest: null,

  // Current requests to edit sharing on files.
  editPrivilegesRequests: null,

  showTaskDetail: false,
  loadingTaskCount: false,
  loadingCollaboration: false,
  taskTabSelected: 'open',

  // These are the definitions of our list filters.
  listFilters: {
    // The key here, e.g. `favoriteFilter` is also the argument that appears in the URL
    tasks: {
      favoriteFilter: {
        title: FrontendConstants.FAVORITE_ONLY,
        activeText: '',
        type: ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE
      },
      urgentFilter: {
        title: FrontendConstants.URGENT_ONLY,
        activeText: '!',
        type: ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE
      },
      reportFilter: { title: FrontendConstants.ANALYTICS },
      taskTypeFilter: { title: FrontendConstants.TASK_TYPE },
      taskStateFilter: { title: FrontendConstants.TASK_STATE },
      relationshipFilter: {
        title: FrontendConstants.RELATIONSHIP_TO_TASK,
        filterOptions: [
          {
            'id': 'All',
            'text': FrontendConstants.ALL
          },
          {
            'id': 'Assignee',
            'text': FrontendConstants.ASSIGNEE
          },
          {
            'id': 'Owner',
            'text': FrontendConstants.OWNER
          },
          {
            'id': 'Observer',
            'text': FrontendConstants.OBSERVER
          }
        ]
      },
      appName: {},
      delayed: {},
    },
    folders: {
      favoriteFilter: {
        title: FrontendConstants.FAVORITE_ONLY,
        activeText: '',
        type: ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE
      },
      // These filters correspond to the fileType enum
      typeFilter: {
        title: 'Type', filterOptions: [
          {
            'id': 'All',
            'text': FrontendConstants.ALL
          },
          {
            'id': 'Report',
            'text': FrontendConstants.ANALYTICS
          },
          {
            'id': 'Dashboard',
            'text': FrontendConstants.DASHBOARD
          },
          {
            'id': 'Folder',
            'text': FrontendConstants.FOLDER
          },
          {
            'id': 'Monitor',
            'text': FrontendConstants.MONITOR
          },
          {
            'id': 'Builtin',
            'text': FrontendConstants.BUILTIN
          },
          {
            'id': ExposureAppConstants.FILE_TYPE_DATA_REVIEW,
            'text': FrontendConstants.DATA_REVIEW_SET
          },
          {
            'id': ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT,
            'text': FrontendConstants.QUALITY_AGREEMENT
          }
        ]
      },
      permissionFilter: {
        title: 'Permission', filterOptions: [
          {
            'id': FrontendConstants.ALL,
            'text': FrontendConstants.ALL
          },
          {
            'id': 'Edit',
            'text': FrontendConstants.CAN_EDIT
          }
        ]
      }
    }
  },

  /*
   * -  This is the store for keeping the state of folder view (the reports tab when showing content
   *    of a folder). Notice this store only keeps track of a list of file IDs (the fileIds field) to determine
   *    what needs to be displayed in the view. The info for specific files (title, author, etc) is then extracted
   *    from the "files" store above. We use a single folder Id (the folderId field) to keep track of which
   *    folder we are browsing as we navigate through the directory tree. We then use the parent folder Id
   *    stored inside its fileWrapper to backtrack the full directory path.
   */
  folderView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    fileIds: [],
    checkedFileIds: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      isStarred: true,
      // TODO (POST-DIA): Restore the below two lines once we implement lastDataSync.
      //newInformation: false,
      //lastDataSync: false,
      isShared: true,
      fileType: true,
      title: true,
      createdBy: false,
      createdAt: true,
      updatedAt: true,
      edit: true  // edit field is added here to render the edit column to let the user edit a report.
    })
  },

  createFolder: {
    status: ExposureAppConstants.CREATE_FOLDER_VALID,
    title: null
  },

  moveToFolderId: null,

  favoritesView: {
    isValid: ExposureAppConstants.LIST_VIEW_VALID,
    itemIds: [],
    itemTypes: {},
    checkedItemIds: Imm.Set(),
    totalRows: 0,
    displayedColumns: Imm.OrderedMap({
      title: true,
      createdBy: false,
      createdAt: true,
      updatedAt: false,
      favoriteType: true
    }),
    requestsInFlight: {}
  },

  /* This is a map with a hashed key and an accumulated list of selection conditions value.
   *
   * `drilldownDataPointFilters`: SCCs generated by click on data points on a report.
   * `drilldownIncludedStaticFilters`: Included static filters of the source report at the moment of drilldown.
   * `drilldownIncludedDynamicFilters`: Included dynamic filters of the source report at the moment of drilldown.
   * `drilldownTaskFilters`: A list of selection condition columns for task filters.
   * `drilldownFilterDisplayStrings`: A list of string, integer pairs, representing display string, depth pairs. A.k.a "Pretty Print".
   *
   *
   * drilldownFilterDisplayStrings
   *                 _
   *                |   drilldownDataPointFilters
   * drilldownid -> |   drilldownIncludedStaticFilters
   *                |   drilldownIncludedDynamicFilters
   *                |   drilldownTaskFilters
   *                |
   *                |_  schemaId
   */
  drilldown: {},
  drilldownFilterDisplayStrings: [],
  currentSelectionCondition: {},

  /** Stores drilldown information for the builtin KPIs. */
  builtinDrilldown: {},

  showFiltersPane: false,
  showMobileNavMenu: false,
  showNotificationsDropdown: false,
  showListFilterPane: false,
  showMonitorTasks: false,
  statusMessageList: [],

  qualityAgreements: [],
  qualityAgreementsRequest: null,
  tasks: {},
  fetchedTaskFilters: [],
  selectedTab: '',
  isViewTasks: false,
  taskStudy: [],

  // This is a Map(id: TaskSummary) of open tasks used to populate the task dropdown in
  // ViewTask and to calculate the SideBar task count.
  taskSummaries: {},
  tasksRequest: null,
  tasksCountRequest: null,
  closedTasksRequest: null,

  notifications: {},
  notificationsRequest: null,

  // This boolean is to represent if tabular report's row details page is open or not for mobile case.
  showMobileTabularReportDetails: false,

  taskTypes: [],
  taskMetadata: {},
  clinicalAttributesDropdownData: [],

  tasksView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    taskIds: [],
    checkedTaskIds: Imm.Set(),
    //TODO: order this
    displayedColumns: Imm.OrderedMap({
      isStarred: true,
      urgency: true,
      authorId: true,
      assigneeIds: true,
      title: true,
      description: false,
      createdAt: true,
      updatedAt: true,
      dueDate: true,
      dashboardId: false,
      reportId: false,
      taskType: true,
      taskState: true
    })
  },

  closedTasksView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    taskIds: [],
    checkedTaskIds: Imm.Set(),
    //TODO: order this
    displayedColumns: Imm.OrderedMap({
      isStarred: true,
      urgency: true,
      authorId: true,
      assigneeIds: true,
      title: true,
      description: false,
      createdAt: true,
      updatedAt: true,
      dueDate: true,
      dashboardId: false,
      reportId: false,
      taskType: true,
      taskState: true
    })
  },

  // Templates are stored in the following fashion:
  // templates: { '<UUID>': {<template data>}, 'UUID2': {<template 2 data>} }
  templates: {},
  templatesView: {
    checkedTemplateIds: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      title: true,
      authorId: true,
      description: true,
      createdAt: true,
      updatedAt: true
    })
  },

  validateCqlSessionFilterRequest: null,
  validateMonitorSelectionConditionColumnCql: null,
  dataSelectorInputValid: true,
  appliedSessionStaticFilters: [],

  /* CDMDropdownData defines dropdown data of `studyname`, `sitecountry`, `sitename` dropdowns used for Add/Edit Tasks.
   *
   * CDMDropdownData: {
   *   conditions: {
   *     study: {
   *       itemsSelected: ['S900', 'S1000']
   *    },
   *    country: {
   *      itemsSelected: []
   *    },
   *    site: {
   *      itemsSelected: []
   *    }
   *  },
   *  data: {
   *    study: [{key: 'S900', value: 'Omega'}, ... ],
   *    country: [...],
   *    site: [...]
   *  }
   * }
   */
  CDMDropdownData: {},
  embeddedLoginSessionId: {
    id: null,
    requestInFlight: false
  },

  embeddedReportList: {},


  // this variable must be 'true' only when a yellowfin report is opened
  showSessionStudyFilter: false,
  isUpdateUserFetching: false,
  drilldownFileData: {},
  cqsPDFChart: [],
  includedFilter: {},
  widgetFilterSession: [],
  widgetFilterStore: {},
  preCannedFiltersList: null,
  currentWidgetUpdating: null,
  masterStudyFilterContext: null,
  countryFilterList: null
});

var ExposureStore = _.extend({

  init(immConfig) {
    var immUsers = ExposureStore.parseUserList(immConfig.get('userWrappers'));
    // Map ( userEntityId -> userId ).
    var immUserEntities = immUsers.flatMap(function (immUser, userId) {
      return [[immUser.get('userEntityId'), userId]];
    });

    // Constants defined in AppConfig, passed down in the twirl template.
    let immMonitorConstantKeys = Imm.List(['monitorPreviewMaxPollMillis', 'monitorPreviewPollIntervalMillis']);
    let immOversightScorecardKeys = Imm.Map(
      {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Oversight Scorecard',
        text: 'Oversight Scorecard',
        type: 'oversight_scorecard_report',
      }
    );

    let immMonitorConstants = immConfig.filter((v, k) => immMonitorConstantKeys.includes(k));

    let immYellowfinMap = Imm.Map({
      yellowfinProtocol: immConfig.get('yellowfinProtocol'),
      yellowfinHost: immConfig.get('yellowfinHost'),
      yellowfinPort: immConfig.get('yellowfinPort')
    });

    const defaultSchemaId = immConfig.getIn(['cdmSchemaIds', 0], '');
    const currentAccountId = immConfig.get('currentAccountId');
    // getSessionFiltersFromCookie will create empty study filter in cookie if it absent
    const sessionFilters = Util.getSessionFiltersFromCookie(currentAccountId, null, defaultSchemaId);
    CookieActions.setSessionFilters(sessionFilters, currentAccountId);

    _immExposureStore = _immExposureStore.merge({
      accountMap: immConfig.get('accountMap'),
      userInfo: immConfig.get('userInfo'),
      cdmSchemaIds: immConfig.get('cdmSchemaIds'),
      currentAccountId: currentAccountId,
      monitorConstants: immMonitorConstants,
      oversightReport: immOversightScorecardKeys,
      users: immUsers,
      userEntities: immUserEntities,
      groupEntities: immConfig.get('groupEntities'),
      yellowfinUrl: `${immConfig.get('yellowfinProtocol')}${immConfig.get('yellowfinHost')}:${immConfig.get('yellowfinPort')}`
    });
  },

  getExposureStore() {
    return _immExposureStore;
  },

  _updateStore(immExposureStore) {
    // Provided only for use in testing.
    _immExposureStore = immExposureStore;
  },

  /**************** Begin file store API ****************/
  getFiles() {
    return _immExposureStore.get('files');
  },
  setFiles(immFiles) {
    _immExposureStore = _immExposureStore.set('files', immFiles);
  },
  mergeFile(fileId, file) {
    _immExposureStore = _immExposureStore.mergeIn(['files', fileId], file);
  },
  setFile(fileId, immFile) {
    // `reportIds` are calculated in `fetchDashboardData` but would be overwritten
    // by any subsequent (or in-flight) `fetchFile` (which always returns an empty list
    // for `reportIds`). We ensure calculated values are retained.
    immFile = immFile.update('reportIds', Imm.List(), function (immReportIds) {
      return immReportIds.isEmpty() ? ExposureStore.getFileWrapper(fileId).getIn(['file', 'reportIds'], Imm.List()) : immReportIds;
    });
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'fileWrapper', 'file'], immFile);
  },
  getFileWrapper(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileWrapper'], Imm.Map());
  },
  setFileWrapper(fileId, immFileWrapper) {
    // `reportIds` are calculated in `fetchDashboardData` but would be overwritten
    // by any subsequent (or in-flight) `fetchFile` (which always returns an empty list
    // for `reportIds`). We ensure calculated values are retained.
    immFileWrapper = immFileWrapper.updateIn(['file', 'reportIds'], Imm.List(), function (immReportIds) {
      return immReportIds.isEmpty() ? ExposureStore.getFileWrapper(fileId).getIn(['file', 'reportIds'], Imm.List()) : immReportIds;
    });
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'fileWrapper'], immFileWrapper);
  },
  getFile(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
  },
  getUpdateFileRequest(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'updateFileRequest']);
  },
  _getUpdateFilesRequests(filesIds) {
    const filesRequests = [];

    filesIds.forEach(fileId => {
      const request = _immExposureStore.getIn(['files', fileId, 'updateFileRequest']);

      if (request) {
        filesRequests.push(request);
      }
    });

    return filesRequests;
  },
  _abortOldRequests(filesIds) {
    const oldRequests = ExposureStore._getUpdateFilesRequests(filesIds);

    if (oldRequests.length) {
      oldRequests.forEach(oldRequest => oldRequest.abort());
    }
  },
  setUpdateFileRequest(fileId, updateFileRequest) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'updateFileRequest'], updateFileRequest);
  },
  clearUpdateFileRequest(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'updateFileRequest']);
  },
  _clearUpdateFilesRequests(filesIds) {
    filesIds.forEach(fileId => {
      _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'updateFileRequest']);
    });
  },
  clearReportData(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'reportData']);
  },
  getReportData(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'reportData']);
  },
  setReportData(fileId, immData) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'reportData'], immData);
  },
  clearFileSCCs(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'fileSCCs']);
  },
  getFileSCCs(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileSCCs']);
  },
  setFileSCCs(fileId, immData) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'fileSCCs'], immData);
  },
  setFilterStateAfterApply(fileId) {
    let filterStates = _immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStatesAfterApply'], filterStates);
  },
  clearFileTaskFiltersSCCS(fileId) {
    const immFile = ExposureStore.getFile(fileId);
    if (immFile && immFile.get('fileType') === ExposureAppConstants.FILE_TYPE_DASHBOARD) {
      immFile.get('reportIds', Imm.List()).forEach(reportId => {
        _immExposureStore = _immExposureStore.deleteIn(['files', reportId, 'taskFilters']);
      });
    }
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'taskFilters']);
  },
  getFileTaskFiltersSCCS(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'taskFilters']);
  },
  setFileTaskFiltersSCCS(fileId, immData) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'taskFilters'], immData);
  },
  clearReportMetrics(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'reportMetrics']);
  },
  setReportMetrics(fileId, immData) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'reportMetrics'], immData);
  },
  getReportConfig(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'reportConfig']);
  },
  getReportCqlQueries(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'reportConfig', 'cqlQueries']);
  },
  deleteFileState(fileId) {
    // Only do this to old-style files.
    const immFile = ExposureStore.getFile(fileId);
    if (immFile && !immFile.get('templatedReport', false)) {
      var reportType;
      var reportConfig = ExposureStore.getReportConfig(fileId);
      if (reportConfig) {
        reportType = reportConfig.get('reportType');
      }
      if (ExposureStore.getFile(fileId).get('fileType') === ExposureAppConstants.FILE_TYPE_REPORT &&
        reportType === ExposureAppConstants.REPORT_TYPE_TABULAR) {
        ExposureStore.resetTabularReportState(fileId);
      }
    }
    ExposureStore.clearReportData(fileId);
    ExposureStore.clearReportMetrics(fileId);
  },
  getTabularReportQuery(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'tabularReportState', 'query']);
  },
  setTabularReportQuery(fileId, query) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'tabularReportState', 'query'], Imm.fromJS(query));
  },
  getTabularReportState(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'tabularReportState'], Imm.Map());
  },
  setTabularReportState(fileId, immTabularReportState) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'tabularReportState'], immTabularReportState);
  },
  resetTabularReportState(fileId) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'tabularReportState'], Imm.fromJS({
      pageLowerLimit: 0,
      pageUpperLimit: ListViewConstants.DEFAULT_ROWS_PER_PAGE - 1,
      pageOrderings: []
    }));
  },
  setTabularReportPage(reportId, pageNumber, rowsPerPage) {
    var newPageLowerLimit = rowsPerPage * (pageNumber - 1);
    var newPageUpperLimit = rowsPerPage + newPageLowerLimit - 1;
    var immOldTabularReportState = ExposureStore.getTabularReportState(reportId);
    var immNewTabularReportState = immOldTabularReportState.merge({
      pageLowerLimit: newPageLowerLimit,
      pageUpperLimit: newPageUpperLimit
    });
    ExposureStore.setTabularReportState(reportId, immNewTabularReportState);
  },
  getFilterStates(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
  },
  getReportIncludedStaticFilters(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'includedStaticFilters']);
  },
  setIncludedStaticFilterResults(fileId, includedStaticFilters) {
    var immincludedStaticFilters = Imm.fromJS(includedStaticFilters);
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'includedStaticFilters'], immincludedStaticFilters);
  },
  deleteReportIncludedStaticFilters(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'includedStaticFilters']);
  },
  getFileIncludedDynamicFilters(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'includedDynamicFilters'], Imm.List());
  },
  setIncludedDynamicFilterResults(fileId, filterResults, fetchFilterDataStartIndex = 0) {
    const sessionDynamicFiltersCount = Util.getSessionDynamicFiltersCount(CookieStore.getCookies(), _immExposureStore.get('currentAccountId'));

    // TODO: If `filterResults` we get back from API call contains information about filter selections, we do not need to merge but simply set.
    const immNewFilterStates = Imm.fromJS(filterResults).map((immFilterResult, idx) => {
      // If this filter is initialized for the first time, we want to have fresh selections. The App should handle missing `itemSelected` and `allSelected`
      // correctly but lets be explicit.
      const immOriginalFilterState = _immExposureStore.getIn(['files', fileId, 'filterStates', idx], Imm.fromJS({
        itemsSelected: Imm.OrderedSet(),
        allSelected: true
      }));

      // `sessionDynamicFiltersCount` is added to the `idx` b/c `idx` is index among included dynamic filters ONLY.
      // `fetchFilterDataStartIndex` is an index among session dynamic filters combined with included dynamic filters to start fetching filter data from.
      if (fetchFilterDataStartIndex <= idx + sessionDynamicFiltersCount) {
        // This is the list of options that will be displayed in the dropdown.
        const immNewFilterOptions = immFilterResult.getIn(['dynamicFilterData', 'rows'], Imm.List()).map(immRow => immRow.get('values')).flatten();
        // Filter out selections that are no longer possible options for the user to select.
        const immNewSelectedItems = immOriginalFilterState.get('itemsSelected').filter(item => immNewFilterOptions.contains(item));
        // Fetching the filter type
        const filterTypeForFile = _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'includedDynamicFilters', idx, 'filterType']);
        // If the filter type is set to single select in the file, use that. Otherwise, use the filter type defined by
        // the data type for the property column itself, as calculated on the backend
        const filterType = (filterTypeForFile === ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT)
          ? filterTypeForFile
          : immFilterResult.get('dynamicFilterComponentType');
        // We would like to maintain current filter selection states (ex. `itemsSelected`, `currentBounds`, etc)
        return immOriginalFilterState.merge(Imm.fromJS({
          column: immFilterResult.get('dynamicFilterPropertyColumn'),
          filterType: filterType,
          itemsSelected: immNewSelectedItems,
          allSelected: immNewSelectedItems.isEmpty(),
          data: immNewFilterOptions,
          valid: true
        }));
      } else {
        return immOriginalFilterState;
      }
    });

    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates'], immNewFilterStates);
  },
  addDropdownFilterSelection(fileId, filterIndex, item) {
    _immExposureStore = _immExposureStore.updateIn(['files', fileId, 'filterStates', filterIndex], function (immFilter) {
      return immFilter.merge({
        itemsSelected: immFilter.get('itemsSelected').add(item),
        allSelected: false
      });
    });
  },
  removeDropdownFilterSelection(fileId, filterIndex, item) {
    _immExposureStore = _immExposureStore.updateIn(['files', fileId, 'filterStates', filterIndex], function (immFilter) {
      var immItemsSelected = immFilter.get('itemsSelected').delete(item);
      return immFilter.merge({
        itemsSelected: immItemsSelected,
        allSelected: immItemsSelected.isEmpty()
      });
    });
  },
  setDropdownFilterSelection(fileId, filterIndex, items) {
    _immExposureStore = _immExposureStore.updateIn(['files', fileId, 'filterStates', filterIndex], function (immFilter) {
      return immFilter.merge({
        itemsSelected: items,
        allSelected: _.isEmpty(items)
      });
    });
  },
  resetIncludedDynamicFilter(fileId, filterIndex) {
    var filterType = ExposureStore.getFilterStates(fileId).getIn([filterIndex, 'filterType']);
    switch (filterType) {
      case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
      case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
        ExposureStore.selectAllFilterValues(fileId, filterIndex);
        break;
      case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
        ExposureStore.clearSliderFilterBounds(fileId, filterIndex);
        break;
    }
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates', filterIndex, 'nullExcluded'], false);
  },
  selectAllFilterValues(fileId, filterIndex) {
    _immExposureStore = _immExposureStore.mergeIn(['files', fileId, 'filterStates', filterIndex], {
      itemsSelected: Imm.OrderedSet(),
      allSelected: true
    });
  },
  toggleNullFilter(fileId, filterIndex) {
    _immExposureStore = _immExposureStore.updateIn(['files', fileId, 'filterStates', filterIndex], function (immFilter) {
      return immFilter.set('nullExcluded', !immFilter.get('nullExcluded'));
    });
  },
  toggleShowMonitorTasks(forceClose) {
    if (forceClose) {
      _immExposureStore = _immExposureStore.set('showMonitorTasks', false);
      _immExposureStore = _immExposureStore.delete('immExpandedMonitorTasksIds');
    } else {
      _immExposureStore = _immExposureStore.set('showMonitorTasks', !_immExposureStore.get('showMonitorTasks'));
    }
  },
  clearSliderFilterBounds(fileId, filterIndex) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'filterStates', filterIndex, 'currentBounds']);
  },
  setSliderFilterBounds(fileId, filterIndex, bounds) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates', filterIndex, 'currentBounds'], Imm.fromJS(bounds));
  },
  getReportDataRequest(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'dataRequest']);
  },
  setReportDataRequest(fileId, dataRequest) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'dataRequest'], dataRequest);
  },
  clearReportDataRequest(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'dataRequest']);
  },
  getFilterDataRequest(fileId) {
    return _immExposureStore.getIn(['files', fileId, 'filterDataRequest']);
  },
  setFilterDataRequest(fileId, dataRequest) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterDataRequest'], dataRequest);
  },
  clearFilterDataRequest(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'filterDataRequest']);
  },
  getExportDataRequest() {
    return _immExposureStore.get('exportDataRequest');
  },
  setExportDataRequest(dataRequest) {
    _immExposureStore = _immExposureStore.set('exportDataRequest', dataRequest);
  },
  clearExportDataRequest() {
    _immExposureStore = _immExposureStore.delete('exportDataRequest');
  },
  getFileMetadata(fileId) {
    return ExposureStore.getFileWrapper(fileId).get('metadata');
  },
  setFileMetadata(fileId, immMetadata) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'fileWrapper', 'metadata'], immMetadata);
  },
  getFolderRequest() {
    return _immExposureStore.get('folderRequest');
  },
  setFolderRequest(fileRequest) {
    _immExposureStore = _immExposureStore.set('folderRequest', fileRequest);
    _immExposureStore = _immExposureStore.deleteIn(['folderView', 'isEmpty']);
  },
  clearFolderRequest() {
    _immExposureStore = _immExposureStore.delete('folderRequest');
  },
  setFileEntry(fileId, fileWrapper) {
    let updateFileWrapper;
    if (fileWrapper.file.tags && fileWrapper.file.tags.length > 0) {
      updateFileWrapper = Util.updateRankConfig(fileWrapper);
    } else {
      updateFileWrapper = fileWrapper;
    }
    ExposureStore.mergeFile(fileId, { fileRequestInFlight: false, fileRequestRejectedWith404: false });
    var immFileWrapper = Imm.fromJS(updateFileWrapper);
    var immFile = ExposureStore.getFile(fileId);
    if (immFile && !Imm.is(immFile.delete('folderId'), immFileWrapper.get('file').delete('folderId'))) {
      // The folderId doesn't matter for comparing the information used to render a file.
      // Frontend files may also have different folderIds than persisted files. For example,
      // a frontend file can have a folderId of 'landing-page', while the same file in the DB
      // would have no folderId.
      ExposureStore.deleteFileState(fileId);
    }
    ExposureStore.setFileWrapper(fileId, immFileWrapper);
    ExposureStore.setFileConfig(fileId, updateFileWrapper);
  },
  setFileEntryOnly(fileId, fileWrapper) {
    let updateFileWrapper;
    if (fileWrapper.file.tags && fileWrapper.file.tags.length > 0) {
      updateFileWrapper = Util.updateRankConfig(fileWrapper);
    } else {
      updateFileWrapper = fileWrapper;
    }
    ExposureStore.mergeFile(fileId, { fileRequestInFlight: false, fileRequestRejectedWith404: false });
    ExposureStore.setFile(fileId, Imm.fromJS(updateFileWrapper.file));
    ExposureStore.setFileConfig(fileId, updateFileWrapper);
  },
  getFileConfig(fileId) {
    return _immExposureStore.getIn(['fileConfigs', fileId]);
  },
  isFileConfigRequestInFlight(fileId) {
    _immExposureStore.getIn(['fileConfigs', fileId, 'fileConfigRequestInFlight'], false);
  },
  mergeFileConfig(fileId, fileConfig) {
    _immExposureStore = _immExposureStore.mergeIn(['fileConfigs', fileId], fileConfig);
  },
  _mergeFileConfigs(fileConfigsObject) {
    const immFiles = Imm.fromJS(fileConfigsObject);
    _immExposureStore = _immExposureStore.mergeIn('fileConfigs', immFiles);
    SearchActions.syncFiles(immFiles);
  },
  setFileConfig(fileId, fileWrapper) {
    const file = Imm.fromJS(fileWrapper.file);
    _immExposureStore = _immExposureStore.setIn(['fileConfigs', fileId], file);
    SearchActions.syncFile(file);
  },
  setFileConfigs(fileConfigsObject) {
    const immFiles = Imm.fromJS(fileConfigsObject);
    _immExposureStore = _immExposureStore.set('fileConfigs', immFiles);
    SearchActions.syncFiles(immFiles);
  },
  isFileConfigsRequestInFlight() {
    _immExposureStore.get('fileConfigsRequestInFlight', false);
  },
  setFileConfigsRequestInFlight(fileConfigsRequestInFlight) {
    _immExposureStore = _immExposureStore.set('fileConfigsRequestInFlight', fileConfigsRequestInFlight);
  },
  clearFileConfigsRequestInFlight() {
    _immExposureStore = _immExposureStore.delete('fileConfigsRequestInFlight');
  },
  _setFileConfigsForDataReview(fileConfigsObject) {
    const immFiles = Imm.fromJS(fileConfigsObject);
    _immExposureStore = _immExposureStore.set(Key.fileConfigsForDataReview, immFiles);
  },
  _isFileConfigsForDataReviewRequestInFlight() {
    _immExposureStore.get(Key.fileConfigsForDataReviewRequestInFlight, false);
  },
  _setFileConfigsForDataReviewRequestInFlight() {
    _immExposureStore = _immExposureStore.set(Key.fileConfigsForDataReviewRequestInFlight, true);
  },
  _setMsfChange(masterStudy) {
    _immExposureStore = _immExposureStore.set('newMasterStudy', masterStudy)
  },
  _clearFileConfigsForDataReviewRequestInFlight() {
    _immExposureStore = _immExposureStore.delete(Key.fileConfigsForDataReviewRequestInFlight);
  },
  _setDataReviewRoles(dataRewiewRoles) {
    const immRoles = Imm.fromJS(dataRewiewRoles);
    _immExposureStore = _immExposureStore.set(Key.dataReviewRoles, immRoles);
  },
  _isDataReviewRolesRequestInFlight() {
    _immExposureStore.get(Key.dataReviewRolesRequestInFlight, false);
  },
  _setDataReviewRolesRequestInFlight() {
    _immExposureStore = _immExposureStore.set(Key.dataReviewRolesRequestInFlight, true);
  },
  _clearDataReviewRolesRequestInFlight() {
    _immExposureStore = _immExposureStore.delete(Key.dataReviewRolesRequestInFlight);
  },
  setVisibleMonitorTrendlines(fileId, visibleMonitorTrendlines) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'visibleMonitorTrendlines'], visibleMonitorTrendlines);
  },
  /**************** End file store API ****************/

  /**************** Begin data review API **************/
  setDataReviewFilterRequestInFlight(filterRequestInFlight) {
    _immExposureStore = _immExposureStore.set('dataReviewFilterRequestInFlight', filterRequestInFlight);
  },
  clearDataReviewFilterRequestInFlight() {
    _immExposureStore = _immExposureStore.delete('dataReviewFilterRequestInFlight');
  },
  getDataReviewFilterRequestInFlight() {
    return _immExposureStore.get('dataReviewFilterRequestInFlight');
  },
  setDataReviewFilterOptions(data) {
    _immExposureStore = _immExposureStore.setIn(['DataReviewFilterOptions', 'data'], Imm.fromJS(data));
  },
  clearDataReviewFilterOptions() {
    _immExposureStore = _immExposureStore.delete('DataReviewFilterOptions');
  },
  getDataReviewFilterOptions() {
    _immExposureStore = _immExposureStore.getIn(['DataReviewFilterOptions', 'data']);
  },
  /**************** End data review API ****************/


  /**************** Begin study CRO store API *********/
  getStudyCROData() {
    return _immExposureStore.get('studyCroData', Imm.Map());
  },
  setStudyCROData(studyCroData) {
    _immExposureStore = _immExposureStore.set('studyCroData', Imm.fromJS(studyCroData));
  },
  setStudyCRODataRequestInFlight(dataRequestInFlight) {
    _immExposureStore = _immExposureStore.set('croRequestInFlight', dataRequestInFlight);
  },
  isStudyCRODataRequestInFlight() {
    return _immExposureStore.get('croRequestInFlight', false);
  },
  clearStudyCRODataRequestInFlight() {
    _immExposureStore.delete('croRequestInFlight');
  },
  setStudyCroDataRequest(request) {
    _immExposureStore = _immExposureStore.set('studyCroDataRequest', request);
  },
  getStudyCroDataRequest() {
    return _immExposureStore.get('studyCroDataRequest');
  },
  clearStudyCroDataRequest() {
    _immExposureStore = _immExposureStore.delete('studyCroDataRequest')
  },
  /**************** End study CRO store API ***********/

  /**************** Begin Yellowfin study filter store API *********/
  getYellowfinStudyDynamicFilterData() {
    return _immExposureStore.get('yellowfinStudyDynamicFilterResults', Imm.Map());
  },
  setYellowfinStudyDynamicFilterData(yellowfinStudyFilterData) {
    _immExposureStore = _immExposureStore.set('yellowfinStudyDynamicFilterResults', Imm.fromJS(yellowfinStudyFilterData));
  },
  setYellowfinStudyFilterDataRequestInFlight(dataRequestInFlight) {
    _immExposureStore = _immExposureStore.set('yellowfinStudyFilterDataRequestInFlight', dataRequestInFlight);
  },
  isYellowfinStudyFilterDataRequestInFlight() {
    return _immExposureStore.get('yellowfinStudyFilterDataRequestInFlight', false);
  },
  clearYellowfinStudyFilterDataRequestInFlight() {
    _immExposureStore.delete('yellowfinStudyFilterDataRequestInFlight');
  },
  setYellowfinStudyFilterDataRequest(request) {
    _immExposureStore = _immExposureStore.set('yellowfinStudyFilterDataRequest', request);
  },
  getYellowfinStudyFilterDataRequest() {
    return _immExposureStore.get('yellowfinStudyFilterDataRequest');
  },
  clearYellowfinStudyFilterDataRequest() {
    _immExposureStore = _immExposureStore.delete('yellowfinStudyFilterDataRequest')
  },
  /**************** Begin Yellowfin study filter store API ***********/

  /**************** Begin sharing API ****************/
  clearFilesPrivilegeRequests() {
    _immExposureStore = _immExposureStore.delete('filesPrivilegeRequests');
  },
  getFilesPrivilegeRequests() {
    return _immExposureStore.get('filesPrivilegeRequests');
  },
  setFilesPrivilegeRequests(filesPrivilegeRequests) {
    _immExposureStore = _immExposureStore.set('filesPrivilegeRequests', filesPrivilegeRequests);
  },
  clearFilePrivilegeCapabilitiesRequest() {
    _immExposureStore = _immExposureStore.delete('filePrivilegeCapabilitiesRequest');
  },
  getFilePrivilegeCapabilitiesRequest() {
    return _immExposureStore.get('filePrivilegeCapabilitiesRequest');
  },
  setFilePrivilegeCapabilitiesRequest(filePrivilegeCapabilitiesRequest) {
    _immExposureStore = _immExposureStore.set('filePrivilegeCapabilitiesRequest',
      filePrivilegeCapabilitiesRequest);
  },
  clearEditPrivilegesRequests() {
    _immExposureStore = _immExposureStore.delete('editPrivilegesRequests');
  },
  getEditPrivilegesRequests() {
    return _immExposureStore.get('editPrivilegesRequests');
  },
  setEditPrivilegesRequests(editPrivilegesRequests) {
    _immExposureStore = _immExposureStore.set('editPrivilegesRequests', editPrivilegesRequests);
  },
  getFilesPrivileges(fileIds, callback) {
    const oldRequests = ExposureStore.getFilesPrivilegeRequests();
    if (oldRequests) {
      oldRequests.forEach(function (oldRequest) {
        oldRequest.abort();
      });
    }

    let newRequests = [];
    fileIds.forEach(function (fileId) {
      newRequests.push(
        AppRequest({ type: 'GET', url: '/api/files/' + fileId + '/privileges' }));
    });
    ExposureStore.setFilesPrivilegeRequests(newRequests);
    Promise.all(ExposureStore.getFilesPrivilegeRequests()).then(
      function (data) {  // EntityPrivileges for all fileIds.
        ExposureStore.clearFilesPrivilegeRequests();
        Util.getGuardedCallback(callback)(data);
        ExposureStore.emitChange();
      },
      function () {
        ExposureStore.clearFilesPrivilegeRequests();
        ExposureStore.emitChange();
      }
    );
  },

  getPrivilegeCapabilities(fileId, callback) {
    var url = '/api/files/' + fileId + '/share';
    var oldRequest = ExposureStore.getFilePrivilegeCapabilitiesRequest(fileId);
    if (oldRequest) {
      oldRequest.abort();
    }
    var newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setFilePrivilegeCapabilitiesRequest(newRequest);

    newRequest.then(
      function (data) {  // EntityPrivileges.
        ExposureStore.clearFilePrivilegeCapabilitiesRequest();
        Util.getGuardedCallback(callback)(Imm.fromJS(data));
        ExposureStore.emitChange();
      },
      function () {
        ExposureStore.clearFilePrivilegeCapabilitiesRequest();
        ExposureStore.emitChange();
      }
    );
  },
  monitorTaskAssigneesModal: function (fileId) {
    ExposureStore.displayModal(ModalConstants.MODAL_MONITOR_TASK_ASSIGNEES, {
      fileId,
      handleCancel: ExposureActions.closeModal,
      immExposureStore: _immExposureStore
    });
  },
  shareFilesModal: function (fileIds) {
    ExposureStore.getFilesPrivileges(fileIds, function (data) {
      const immEntityPrivilegesList = Imm.fromJS(data);
      let filesConfig = [];
      fileIds.forEach(function (fileId) {
        filesConfig.push(ExposureStore.getFileConfig(fileId));
      });
      const immFileConfigs = Imm.Set(filesConfig).toList();

      let hasShareAccess = true;
      for (let immEntityPrivileges of immEntityPrivilegesList) {
        const privBooleanObject = Util.parsePrivilegeCapabilities([ExposureSharingConstants.READ,
        ExposureSharingConstants.EDIT], immEntityPrivileges);
        if (!privBooleanObject[ExposureSharingConstants.READ] ||
          !privBooleanObject[ExposureSharingConstants.EDIT]) {
          hasShareAccess = false;
          break;
        }
      }

      if (hasShareAccess) {
        ExposureStore.displayModal(ModalConstants.MODAL_SHARE_ADD, {
          handleCancel: _.noop,
          handleEditSharing: ExposureActions.editSharingFileModal.bind(null, fileIds.get(0)),
          handleShare: ExposureActions.shareFiles,
          immExposureStore: _immExposureStore,
          immFileConfigs: immFileConfigs
        });
      } else {
        ExposureStore.displayModal(ModalConstants.MODAL_SHARE_DETAIL, {
          handleCancel: ExposureActions.closeModal,
          immFileConfigs: immFileConfigs
        });
      }
    });
  },
  updatePrivileges(immFileConfigs, immEntityPrivilegesList, callback) {
    const oldRequests = ExposureStore.getEditPrivilegesRequests();
    if (oldRequests) {
      oldRequests.forEach(function (oldRequest) {
        oldRequest.abort();
      });
    }

    let newRequests = [];
    for (let immFileConfig of immFileConfigs) {
      const url = '/api/files/' + immFileConfig.get('id') + '/share';
      newRequests.push(AppRequest({
        type: 'PUT',
        url: url,
        data: JSON.stringify(immEntityPrivilegesList.toJS())
      }));
    }
    ExposureStore.setEditPrivilegesRequests(newRequests);
    Promise.all(newRequests).then(
      function (data) {  // EntityPrivileges -- EDIT_PRIVILEGES_RESULT.
        ExposureStore.clearEditPrivilegesRequests();
        if (_.isFunction(callback)) {
          callback(data);
          ExposureStore.refreshCurrentFolderWithParameters();
        } else {
          ExposureStore.emitChange();
        }
      },
      function () {
        ExposureStore.clearEditPrivilegesRequests();
        ExposureStore.displayModal(ModalConstants.MODAL_SHARE_ERROR, {
          handleCancel: ExposureActions.closeModal
        });
        ExposureStore.emitChange();
      }
    );
  },
  parseSharingEntitiesToEntityPrivileges(immSharingEntities) {
    return immSharingEntities.map(function (immSharingEntity) {
      var entityType = immSharingEntity.get('entityType');
      var entityId;
      switch (entityType) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          entityId = immSharingEntity.getIn(['entity', 'id']);
          break;
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          entityId = immSharingEntity.getIn(['entity', 'userEntityId']);
          break;
      }
      return Imm.Map({
        entityId: entityId,
        entityType: entityType,
        privilegeFieldType: ExposureSharingConstants.EDIT_PRIVILEGES_REQUEST,
        read: immSharingEntity.get(ExposureSharingConstants.READ, null),
        edit: immSharingEntity.get(ExposureSharingConstants.EDIT, null),
        owner: immSharingEntity.get(ExposureSharingConstants.OWNER, null)
      });
    });
  },

  shareFiles(immFileConfigs, immSelectedEntities, immPrivileges) {
    const editPrivilegesRequests = ExposureStore.getEditPrivilegesRequests();
    if (!editPrivilegesRequests || editPrivilegesRequests.size === 0) {
      const fileId = immFileConfigs.getIn([0, 'id']);
      var privObject = immPrivileges.reduce(function (memo, priv) {
        memo[priv] = { editPrivilegesRequest: ExposureSharingConstants.GRANT };
        return memo;
      }, {});
      var immSharingEntities = immSelectedEntities.map(function (immSelectedEntity) {
        return immSelectedEntity.merge(privObject);
      });
      var immEntityPrivileges =
        ExposureStore.parseSharingEntitiesToEntityPrivileges(immSharingEntities);
      ExposureStore.updatePrivileges(immFileConfigs, immEntityPrivileges,
        function (editPrivilegesResults) {
          ExposureStore.displayModal(ModalConstants.MODAL_SHARE_RESULTS, {
            handleAddMore: ExposureActions.shareFilesModal.bind(null, Imm.List([fileId])),
            handleCancel: ExposureActions.closeModal,
            handleDone: ExposureActions.closeModal,
            handleEdit: ExposureActions.editSharingFileModal.bind(null, fileId),
            immExposureStore: _immExposureStore,
            immFileConfigs: immFileConfigs,
            immResultsEntityPrivileges: Imm.fromJS(editPrivilegesResults),
            requestType: ExposureSharingConstants.SHARE_REQUEST_TYPE_ADD
          });
        });
    }
  },

  editSharingFileModal(fileId) {
    var immFileConfig = ExposureStore.getFileConfig(fileId);
    // This should only be called via clicking on the links in the add share modal.
    // Therefore we should already have permission to see this.
    ExposureStore.displayModal(ModalConstants.MODAL_SHARE_EDIT, {
      handleAddMore: ExposureActions.shareFilesModal.bind(null, Imm.List([fileId])),
      handleCancel: _.noop,
      handleUpdate: ExposureActions.updateSharingFile,
      immExposureStore: _immExposureStore,
      immFileConfig: immFileConfig
    });
    ExposureStore.emitChange();
  },

  updateSharingFile(immFileConfig, immEntityPrivilegesList) {
    const editPrivilegesRequests = ExposureStore.getEditPrivilegesRequests();
    if (!editPrivilegesRequests || editPrivilegesRequests.size === 0) {
      var fileId = immFileConfig.get('id');
      ExposureStore.updatePrivileges(new Set([immFileConfig]), immEntityPrivilegesList,
        function (editPrivilegesResult) {
          ExposureStore.displayModal(ModalConstants.MODAL_SHARE_RESULTS, {
            handleAddMore: ExposureActions.shareFilesModal.bind(null, Imm.List([fileId])),
            handleCancel: ExposureActions.closeModal,
            handleDone: ExposureActions.closeModal,
            handleEdit: ExposureActions.editSharingFileModal.bind(null, fileId),
            immExposureStore: _immExposureStore,
            immFileConfigs: new Imm.Set([immFileConfig]).toList(),
            immResultsEntityPrivileges: Imm.fromJS(editPrivilegesResult),
            requestType: ExposureSharingConstants.SHARE_REQUEST_TYPE_MODIFY
          });
        });
    }
  },
  /**************** End sharing API ****************/

  /**************** Begin favoritesView store API ****************/
  getFavoritesRequest() {
    return _immExposureStore.get('favoritesRequest');
  },
  setFavoritesRequest(favoritesRequest) {
    _immExposureStore = _immExposureStore.set('favoritesRequest', favoritesRequest);
  },
  clearFavoritesRequest() {
    _immExposureStore = _immExposureStore.delete('favoritesRequest');
  },
  setFavoritesView(favoritesView) {
    _immExposureStore = _immExposureStore.set('favoritesView', favoritesView);
  },
  favoritesViewSetIsValid(isValid) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'isValid'], isValid);
  },
  favoritesViewSetItemIds(immItemIds) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'itemIds'], immItemIds);
  },
  favoritesViewSetItemTypes(immItemTypes) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'itemTypes'], immItemTypes);
  },
  favoritesViewSetIsEmpty(isEmpty) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'isEmpty'], isEmpty);
  },
  favoritesViewGetItemIds() {
    return _immExposureStore.getIn(['favoritesView', 'itemIds']);
  },
  favoritesViewGetCheckedItemIds() {
    return _immExposureStore.getIn(['favoritesView', 'checkedItemIds']);
  },
  favoritesViewSetCheckedItemIds(immCheckedItemIds) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'checkedItemIds'], immCheckedItemIds);
  },
  favoritesViewSetTotalRows(totalRows) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'totalRows'], totalRows);
  },
  favoritesViewSetRequestInFlight(itemId, request) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'requestsInFlight', itemId], request);
  },
  favoritesViewGetRequestInFlight(itemId) {
    _immExposureStore.getIn(['favoritesView', 'requestsInFlight', itemId]);
  },
  favoritesViewClearRequestInFlight(itemId) {
    _immExposureStore = _immExposureStore.deleteIn(['favoritesView', 'requestsInFlight', itemId]);
  },
  /**************** End favoritesView store API ****************/

  /**************** Begin folderView store API ****************/
  folderViewGetFileIds() {
    return _immExposureStore.getIn(['folderView', 'fileIds']);
  },
  folderViewResetFileIds() {
    _immExposureStore = _immExposureStore.setIn(['folderView', 'fileIds'], Imm.List());
  },
  folderViewGetCheckedFileIds() {
    return _immExposureStore.getIn(['folderView', 'checkedFileIds']);
  },
  folderViewSetCheckedFileIds(immCheckedFileIds) {
    _immExposureStore = _immExposureStore.setIn(['folderView', 'checkedFileIds'], immCheckedFileIds);
  },
  folderViewResetCheckedFileIds() {
    _immExposureStore = _immExposureStore.setIn(['folderView', 'checkedFileIds'], Imm.Set());
  },
  folderViewSetIsValid(isValid) {
    _immExposureStore = _immExposureStore.setIn(['folderView', 'isValid'], isValid);
  },
  /**************** End folderView store API ****************/

  /**************** Begin notifications store API ****************/
  getNotification(targetId) {
    return _immExposureStore.getIn(['notifications', targetId]);
  },
  setNotification(targetId, immNotification) {
    _immExposureStore = _immExposureStore.setIn(['notifications', targetId], immNotification);
  },
  setNotifications(immNotifications) {
    _immExposureStore = _immExposureStore.set('notifications', immNotifications);
  },
  getNotificationsRequest() {
    return _immExposureStore.get('notificationsRequest');
  },
  setNotificationsRequest(notificationsRequest) {
    _immExposureStore = _immExposureStore.set('notificationsRequest', notificationsRequest);
  },
  clearNotificationsRequest() {
    _immExposureStore = _immExposureStore.delete('notificationsRequest');
  },
  /**************** Begin notifications store API ****************/

  /**************** Begin tasks store API ****************/
  getTaskWrapper(taskId) {
    return _immExposureStore.getIn(['tasks', taskId]);
  },
  setTaskWrapper(taskId, immTaskWrapper) {
    _immExposureStore = _immExposureStore.setIn(['tasks', taskId], immTaskWrapper);
  },
  getClosedTaskWrapper(taskId) {
    return _immExposureStore.getIn(['closedTasks', taskId]);
  },
  setClosedTaskWrapper(taskId, immTaskWrapper) {
    _immExposureStore = _immExposureStore.setIn(['closedTasks', taskId], immTaskWrapper);
  },
  getTask(taskId) {
    return _immExposureStore.getIn(['openTasks', taskId, 'task']);
  },
  getClosedTask(taskId) {
    return _immExposureStore.getIn(['closedTasks', taskId, 'task']);
  },
  setTask(taskId, immTask) {
    _immExposureStore = _immExposureStore.setIn(['openTasks', taskId, 'task'], immTask);
  },
  setClosedTask(taskId, immTask) {
    _immExposureStore = _immExposureStore.setIn(['closedTasks', taskId, 'task'], immTask);
  },
  getTaskMetadata(taskId) {
    // Note: metadata is optional and will be set to `undefined` if metadata for the user doesn't currently exist.
    return _immExposureStore.getIn(['tasks', taskId, 'metadata']) || Imm.Map();
  },
  getClosedTaskMetadata(taskId) {
    // Note: metadata is optional and will be set to `undefined` if metadata for the user doesn't currently exist.
    return _immExposureStore.getIn(['closedTasks', taskId, 'metadata']) || Imm.Map();
  },
  setTaskMetadata(taskId, immTaskMetadata) {
    _immExposureStore = _immExposureStore.setIn(['tasks', taskId, 'metadata'], immTaskMetadata);
  },
  setClosedTaskMetadata(taskId, immTaskMetadata) {
    _immExposureStore = _immExposureStore.setIn(['closedTasks', taskId, 'metadata'], immTaskMetadata);
  },
  setTaskRequestRejectedWith404(taskId, taskRequestRejectedWith404) {
    _immExposureStore = _immExposureStore.setIn(['tasks', taskId, 'taskRequestRejectedWith404'], taskRequestRejectedWith404);
  },
  getTasksRequest() {
    return _immExposureStore.get('tasksRequest');
  },
  setTasksRequest(tasksRequest) {
    _immExposureStore = _immExposureStore.set('tasksRequest', tasksRequest);
    _immExposureStore = _immExposureStore.deleteIn(['tasksView', 'isEmpty']);
  },
  getClosedTasksRequest() {
    return _immExposureStore.get('closedTasksRequest');
  },
  setClosedTasksRequest(tasksRequest) {
    _immExposureStore = _immExposureStore.set('closedTasksRequest', tasksRequest);
    _immExposureStore = _immExposureStore.deleteIn(['closedTasksView', 'isEmpty']);
  },
  getTasksCountRequest() {
    return _immExposureStore.get('tasksCountRequest');
  },
  setTasksCountRequest(tasksRequest) {
    _immExposureStore = _immExposureStore.set('tasksCountRequest', tasksRequest);
  },
  clearTasksRequest() {
    _immExposureStore = _immExposureStore.delete('tasksRequest');
  },
  clearClosedTasksRequest() {
    _immExposureStore = _immExposureStore.delete('closedTasksRequest');
  },
  clearTasksCountRequest() {
    _immExposureStore = _immExposureStore.delete('tasksCountRequest');
  },
  setTasksApplicationsCount(data) {
    _immExposureStore = _immExposureStore.set('taskApplicationCount', data);
  },
  setShowTaskDetail(showOrHide) {
    _immExposureStore = _immExposureStore.set('showTaskDetail', showOrHide);
  },
  getShowTaskDetail() {
    return _immExposureStore.get('showTaskDetail');
  },
  setLoadingTaskCount(isLoading) {
    _immExposureStore = _immExposureStore.set('loadingTaskCount', isLoading);
  },
  getLoadingTaskCount() {
    return _immExposureStore.get('loadingTaskCount');
  },
  setTaskTableLoading(isLoading) {
    _immExposureStore = _immExposureStore.set('taskTableloading', isLoading);
  },
  getTaskTableLoading() {
    return _immExposureStore.get('taskTableloading');
  },
  setCloseTaskTableLoading(isLoading) {
    _immExposureStore = _immExposureStore.set('closeTaskTableloading', isLoading);
  },
  getCloseTaskTableLoading() {
    return _immExposureStore.get('closeTaskTableloading');
  },
  setLoadingCollaboration(isLoading) {
    _immExposureStore = _immExposureStore.set('loadingCollaboration', isLoading);
  },
  getLoadingCollaboration() {
    return _immExposureStore.get('loadingCollaboration');
  },
  setTaskTab(tabType) {
    _immExposureStore = _immExposureStore.set('taskTabSelected', tabType);
  },
  getTaskTab() {
    return _immExposureStore.get('taskTabSelected');
  },
  /**************** End tasks store API ****************/

  /**************** Begin TasksView store API ****************/
  tasksViewGetTotalRows() {
    return _immExposureStore.getIn(['tasksView', 'totalRows']);
  },
  tasksViewSetTotalRows(totalRows) {
    _immExposureStore = _immExposureStore.setIn(['tasksView', 'totalRows'], totalRows);
  },
  closedTasksViewGetTotalRows() {
    return _immExposureStore.getIn(['closedTasksView', 'totalRows']);
  },
  closedTasksViewSetTotalRows(totalRows) {
    _immExposureStore = _immExposureStore.setIn(['closedTasksView', 'totalRows'], totalRows);
  },
  tasksViewGetCheckedTaskIds() {
    return _immExposureStore.getIn(['tasksView', 'checkedTaskIds']);
  },
  tasksViewSetCheckedTaskIds(immCheckedTaskIds) {
    _immExposureStore = _immExposureStore.setIn(['tasksView', 'checkedTaskIds'], immCheckedTaskIds);
  },
  tasksViewGetTaskIds() {
    return _immExposureStore.getIn(['tasksView', 'taskIds']);
  },
  tasksViewGetColumnOptions() {
    return _immExposureStore.getIn(['tasksView', 'displayedColumns']);
  },
  tasksViewSetColumnOption(columnName, checked) {
    _immExposureStore = _immExposureStore.setIn(['tasksView', 'displayedColumns', columnName], checked);
  },
  tasksViewSetIsValid(isValid) {
    _immExposureStore = _immExposureStore.setIn(['tasksView', 'isValid'], isValid);
  },
  /**************** End TasksView store API ****************/

  /**************** Begin TaskSummaries store API ****************/
  getTaskSummariesRequest() {
    return _immExposureStore.get('taskSummariesRequest');
  },
  setTaskSummariesRequest(tasksRequest) {
    _immExposureStore = _immExposureStore.set('taskSummariesRequest', tasksRequest);
  },
  clearTaskSummariesRequest() {
    _immExposureStore = _immExposureStore.delete('taskSummariesRequest');
  },
  setTaskSummaries(immTaskSummaries) {
    _immExposureStore = _immExposureStore.set('taskSummaries', immTaskSummaries);
  },
  /**************** End TaskSummaries store API ****************/

  /**************** Begin User store API ****************/
  parseUserList(userWrappers) {
    var immUserWrappers = Imm.List.isList(userWrappers) ? userWrappers : Imm.fromJS(userWrappers);
    return immUserWrappers.reduce(function (immMemo, immUserWrapper) {
      var id = immUserWrapper.getIn(['user', 'id']);
      var userEntityId = immUserWrapper.getIn(['userEntity', 'id']);
      var firstName = immUserWrapper.getIn(['user', 'firstName']);
      var lastName = immUserWrapper.getIn(['user', 'lastName']);
      var username = immUserWrapper.getIn(['user', 'username']);
      var firstLastName = lastName && firstName ? firstName + ' ' + lastName : username;
      var fullName = lastName && firstName ? lastName + ', ' + firstName : username;
      var userEntityState = immUserWrapper.getIn(['userEntity', 'userEntityState']);
      var featurePermissions = immUserWrapper.getIn(['userEntity', 'featurePermissions']);
      var dataAccessStudyNames = immUserWrapper.getIn(['userEntity', 'dataAccessStudyNames']);
      // isSelectable determines which users show up in dropdowns and modals.
      // Note: Sharing does not use this variable (as it needs to include pending users), but tasks use it.
      var isSelectable = immUserWrapper.getIn(['user', 'isRegistered']) && userEntityState === ExposureSharingConstants.ACTIVE;

      return immMemo.set(id, Imm.Map({
        id: id,
        userEntityId: userEntityId,
        firstName: firstName,
        lastName: lastName,
        firstLastName: firstLastName,
        fullName: fullName,
        username: username,
        userEntityState: userEntityState,
        isSelectable: isSelectable,
        featurePermissions: featurePermissions,
        dataAccessStudyNames: dataAccessStudyNames
      }));
    }, Imm.Map());
  },
  /**************** End User store API ****************/

  getValidateCqlSessionFilterRequest() {
    return _immExposureStore.get('validateCqlSessionFilterRequest');
  },
  getValidateMonitorSelectionConditionColumnCql() {
    return _immExposureStore.get('validateMonitorSelectionConditionColumnCql');
  },
  setValidateCqlSessionFilterRequest(cqlRequest) {
    _immExposureStore = _immExposureStore.set('validateCqlSessionFilterRequest', cqlRequest);
  },
  setValidateMonitorSelectionConditionColumnCql(cqlRequest) {
    _immExposureStore = _immExposureStore.set('validateMonitorSelectionConditionColumnCql', cqlRequest);
  },
  clearValidateCqlSessionFilterRequest() {
    _immExposureStore = _immExposureStore.delete('validateCqlSessionFilterRequest');
  },
  clearValidateMonitorSelectionConditionColumnCql() {
    _immExposureStore = _immExposureStore.delete('validateMonitorSelectionConditionColumnCql');
  },
  getDataSelectorInputValid() {
    _immExposureStore = _immExposureStore.get('dataSelectorInputValid', true);
  },
  setDataSelectorInputValid(valid) {
    _immExposureStore = _immExposureStore.set('dataSelectorInputValid', valid);
  },
  getSessionFilterCqlParseValid() {
    return _immExposureStore.get('sessionFilterCqlParseValid');
  },
  setSessionFilterCqlParseValid(isValid) {
    _immExposureStore = _immExposureStore.set('sessionFilterCqlParseValid', isValid);
  },
  setSessionStaticFilterResults(filterResults) {
    _immExposureStore = _immExposureStore.set('sessionStaticFilterResults', Imm.fromJS(filterResults));
  },
  getSessionStaticFilterResults() {
    return _immExposureStore.get('sessionStaticFilterResults');
  },
  setSessionDynamicFilterResults(filterResults, fetchFilterDataStartIndex = 0) {
    let sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));

    if (!_immExposureStore.get('sessionDynamicFilterResults')) {
      _immExposureStore = _immExposureStore.set('sessionDynamicFilterResults', Imm.List());
    }

    _.each(filterResults, (filterResult, idx) => {
      if (fetchFilterDataStartIndex <= idx) {
        // Session Filter is not valid when it is on a report a with different Comprehend Schema than the one filter is intialized with.
        if (filterResult.valid) {
          var filterCookieEntry = sessionFilters.sessionDynamicFilters[idx] || { filterState: {} };
          filterCookieEntry.filterState.displayString = filterResult.dynamicFilterPropertyColumn.displayString;
          filterCookieEntry.filterState.dynamicFilterComponentType = filterResult.dynamicFilterComponentType;
          filterCookieEntry.filterState.dataType = filterResult.dynamicFilterPropertyColumn.dataType;
          sessionFilters.sessionDynamicFilters[idx] = filterCookieEntry;
        }
      }
    });

    // Only copy over filter that are affected. That is, `fetchFilterDataStartIndex <= idx`.
    _immExposureStore = _immExposureStore.set('sessionDynamicFilterResults',
      _immExposureStore.get('sessionDynamicFilterResults', Imm.List()).take(fetchFilterDataStartIndex).concat(Imm.fromJS(filterResults).skip(fetchFilterDataStartIndex))
    );

    CookieStore.setSessionFilters(sessionFilters, _immExposureStore.get('currentAccountId'));
    CookieStore.emitChange();
  },
  /*
   * Applies the DAG (data access group) filter on the Session Filter
   * by removing from the selected items the ones not part of the DAG.
   */
  mapSessionFiltersWithDataAccessGroup(filterResults, fetchFilterDataStartIndex = 0) {
    const sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
    filterResults.forEach(function (filterResult, idx) {
      if (fetchFilterDataStartIndex <= idx) {
        if (filterResult.valid) {

          // Get DAG enabled filters values
          const enabledDAGFilters = Imm.fromJS(filterResult)
            .getIn(['dynamicFilterData', 'rows'], Imm.List())
            .map(immRow => ({ value: immRow.getIn(['values', 0]), label: immRow.getIn(['values', 0]) }));

          // Get session filter selected items
          const filterCookieEntry = sessionFilters.sessionDynamicFilters[idx] || { filterState: {} };
          const sessionFilter = (filterCookieEntry && filterCookieEntry.filterState) || {};

          ExposureStore.updateSessionFilterHasIncludeDAGFilters(idx, sessionFilter.itemsSelected,
            enabledDAGFilters);
        }
      }
    });
  },
  /*
   * Applies the DAG (data access group) filter on the Yellowfin Session Filter
   * by removing from the selected items the ones not part of the DAG.
   */
  mapYellowfinSessionFiltersWithDataAccessGroup(filterResult) {
    // Get DAG enabled filters values
    const enabledDAGFilters = Imm.fromJS(filterResult)
      .map(immRow => ({ value: immRow.get('value'), label: immRow.get('value') })).toList();

    // Get session filter selected items
    const sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
    const filterCookieEntry = sessionFilters.sessionDynamicFilters[0] || { filterState: {} };
    const sessionFilter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    ExposureStore.updateSessionFilterHasIncludeDAGFilters(0, sessionFilter.itemsSelected,
      enabledDAGFilters);
  },
  /*
   * Update the Session filter in cookies with values has include in DAG applied values
   */
  updateSessionFilterHasIncludeDAGFilters(idx, sessionItemsSelected, enabledDAGFilters) {
    if (sessionItemsSelected) {
      let selectedStudies = [];
      let hasUpdateSessionFilter = false;
      // Exclude from session filter selected items not part of the the DAG
      sessionItemsSelected.forEach(studySelected => {
        let checkStudy = enabledDAGFilters.find(option =>
          option.value === studySelected);
        if (checkStudy) {
          selectedStudies.push(studySelected);
        } else {
          hasUpdateSessionFilter = true;
        }
      });
      if (hasUpdateSessionFilter) {
        // Update the Yellowfin Session filter in cookies with DAG applied values
        CookieActions.updateSessionFilterFilterState(idx, FilterUpdateTypes.DROPDOWN_SET_VALUES,
          selectedStudies, _immExposureStore.get('currentAccountId'));
      }
    }
  },
  setDrilldownFilterDisplayStrings(drilldownDisplayStrings) {
    _immExposureStore = _immExposureStore.set('drilldownFilterDisplayStrings', Imm.fromJS(drilldownDisplayStrings));
  },
  clearDrilldownFilterDisplayStrings() {
    _immExposureStore = _immExposureStore.delete('drilldownFilterDisplayStrings');
  },
  clearEmbeddedLoginSessionId() {
    _immExposureStore = _immExposureStore.deleteIn(['embeddedLoginSessionId', 'id']);
  },
  getImmIncludedFilters(reportId) {
    const immFile = ExposureStore.getFile(reportId);
    const currentDashboardId = _immExposureStore.get('currentDashboardId');
    const includedDynamicFilterSourceId = currentDashboardId || reportId;
    const immFilterStates = ExposureStore.getFilterStates(includedDynamicFilterSourceId);
    const immIncludedDynamicFilters = immFilterStates.map(Util.packageFilterCondition);

    return Imm.fromJS({
      includedDynamicFilters: immIncludedDynamicFilters,
      includedStaticFilters: immFile.get('includedStaticFilters', Imm.List())
    });
  },

  setCDMDropdownData(data) {
    _immExposureStore = _immExposureStore.setIn(['CDMDropdownData', 'data'], Imm.fromJS(data));
  },

  setEmbeddedLoginSessionId(id) {
    _immExposureStore = _immExposureStore.setIn(['embeddedLoginSessionId', 'id'], id)
  },

  setClientOrgId(data) {
    _immExposureStore = _immExposureStore.set('embeddedClientOrgId', data);
  },

  setEmbeddedEntitiesSummary(data) {
    const summaries = Imm.fromJS(data);
    _immExposureStore = _immExposureStore.setIn(['embeddedEntitiesSummary', 'data'], summaries);
    SearchActions.syncEmbeddedEntities(summaries);
  },

  getEmbeddedEntitiesSummary() {
    return _immExposureStore.get(['embeddedEntitiesSummary', 'data'], Imm.List())
  },

  setEmbeddedEntitiesSummaryRequestInFlight(requestInFlight) {
    _immExposureStore = _immExposureStore.setIn(['embeddedEntitiesSummary', 'requestInFlight'], requestInFlight)
  },

  getEmbeddedEntitiesSummaryRequestInFlight() {
    return _immExposureStore.getIn(['embeddedEntitiesSummary', 'requestInFlight']);
  },

  setEmbeddedLoginSessionIdRequestInFlight(requestInFlight) {
    _immExposureStore = _immExposureStore.setIn(['embeddedLoginSessionId', 'requestInFlight'], requestInFlight)
  },

  getQualityAgreements() {
    return _immExposureStore.get('qualityAgreements', Imm.List());
  },

  getQualityAgreementsRequest() {
    return _immExposureStore.get('qualityAgreementsRequest')
  },

  setQualityAgreementsRequest(request) {
    _immExposureStore = _immExposureStore.set('qualityAgreementsRequest', request);
  },
  setWhoAmI(data) {
    _immExposureStore = _immExposureStore.set('whoAmI', data);
  },

  /**************** Begin AJAX calls ****************/
  fetchComprehendSchemas() {
    var url = '/api/comprehend-schemas';
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        var csList = Imm.fromJS(data);
        var csMap = Imm.OrderedMap(csList.map(function (cs) {
          return [cs.get('id'), cs];
        }));
        _immExposureStore = _immExposureStore.set('comprehendSchemas', csMap);
        ExposureStore.emitChange();
      },
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
  },

  fetchFavoritesWithPageSettings(pageSettings) {
    var length = pageSettings.pageSize;
    var beginIdx = (pageSettings.page - 1) * length;
    var sortBy = pageSettings.sortColumn;
    var order = pageSettings.sortOrdering;

    var params = { begin: beginIdx, length: length };
    if (sortBy && order) {
      params.sortby = sortBy;
      params.order = order;
    }
    var url = '/api/favorites/paginated?' + $.param(params);
    var oldRequest = ExposureStore.getFavoritesRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    var newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setFavoritesRequest(newRequest);

    newRequest.then(
      function (data) {
        ExposureStore.clearFavoritesRequest();
        ExposureStore.favoritesViewSetIsValid(ExposureAppConstants.LIST_VIEW_VALID);
        Imm.fromJS(data.fileWrappers).forEach(function (immFileWrapper) {
          var fileId = immFileWrapper.getIn(['file', 'id']);
          ExposureStore.setFileWrapper(fileId, immFileWrapper);
        });
        Imm.fromJS(data.taskWrappers).forEach(function (immTaskWrapper) {
          var taskId = immTaskWrapper.getIn(['task', 'id']);
          ExposureStore.setTaskWrapper(taskId, immTaskWrapper);
        });
        var favoritesView = _immExposureStore.get('favoritesView');
        var newView = favoritesView.merge({
          begin: data.begin,
          itemIds: Imm.fromJS(data.itemIds),
          itemTypes: Imm.fromJS(data.itemTypes),
          isEmpty: Imm.fromJS(data.itemIds).isEmpty(),
          totalRows: data.totalRows
        });
        ExposureStore.setFavoritesView(newView);
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            ExposureStore.favoritesViewSetIsValid(ExposureAppConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            ExposureStore.favoritesViewSetIsValid(ExposureAppConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        ExposureStore.clearFavoritesRequest();
        ExposureStore.emitChange();
      }
    );
  },

  fetchEmbeddedDashboards() {
    const url = '/api/embedded/login-session-id';
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        ExposureStore.setEmbeddedLoginSessionId(data['login-session-id']);
        ExposureStore.setEmbeddedLoginSessionIdRequestInFlight(false);
        ExposureStore.emitChange();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        ExposureStore.emitChange();
      }
    );
    ExposureStore.setEmbeddedLoginSessionIdRequestInFlight(true);
  },

  fetchClientOrg() {
    const url = '/api/embedded/client-org';
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        ExposureStore.setClientOrgId(data);
        ExposureStore.onAjaxCompletion();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
      }
    );
  },

  fetchEmbeddedEntitiesSummary() {
    const url = '/api/embedded/entities-summary';
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        ExposureStore.setEmbeddedEntitiesSummary(data.entityMap);
        ExposureStore.setEmbeddedEntitiesSummaryRequestInFlight(false);
        ExposureStore.onAjaxCompletion();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
      }
    );
    ExposureStore.setEmbeddedEntitiesSummaryRequestInFlight(true);
  },

  fetchYellowfinReportList() {
    const url = `/api/embedded/report-list`;

    AppRequest({ type: 'GET', url: url }).then(
      data => {
        ExposureStore.setYellowfinReportList(Imm.Map(data));
        ExposureStore.emitChange();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        ExposureStore.emitChange();
      }
    )
  },

  getYellowfinReportList() {
    return _immExposureStore.get('embeddedReportList');
  },

  setYellowfinReportList(reportUUIDMap) {
    _immExposureStore = _immExposureStore.set('embeddedReportList', reportUUIDMap);
  },

  /*
   * Given a fileId, fetch its file wrapper from backend. fileWrapper will be updated.
   *
   * 'fetchData' is to issue a fetchReportData on success
   * 'pageSettings' is for folder fetches.
   * 'setCurrentDashboard' is to set global ExposureStore field of representing what dashboard is currently rendered.
   * 'firstRender' is to signal that the fetch is triggered by the first render of the report/dashboard.
   * 'fetchRelatedData' is used to signal fetching the related report data for reports linked via join tables
   */
  fetchFile(fileId, pageSettings, { fetchData, setCurrentDashboard, firstRender, fetchRelatedData = true } = {}) {
    // Set startRenderTime so that we can measure the report render time inside
    // the component. This case is due to an initial dashboard/report load which
    // will refetch filter data, report data, and finally update the
    // dashboard/report. We set the startRenderTime globally because it is
    // extremely convenient. We can clean up this global at another time.
    delete window.comprehend.startRenderTime;
    window.comprehend.startRenderTime = new Date();

    // We should not be fetching landing page itself.
    if (fileId === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
      ExposureStore.fetchFolderWithParameters(fileId, pageSettings);
      return;
    }

    var url = '/api/files/' + fileId;
    AppRequest({ type: 'GET', url: url }).then(
      function (fileWrapper) {
        const drilldownId = pageSettings ? pageSettings.drilldownId : null;
        ExposureStore.setFileEntry(fileId, fileWrapper);
        const cdmSchemaId = _immExposureStore.getIn(['cdmSchemaIds', 0], '');
        const schemaId = Util.getComprehendSchemaIdFromFile(ExposureStore.getFile(fileId), cdmSchemaId);
        if (schemaId) {
          ExposureStore.addStudyNameDynamicSessionFilter(fileId, schemaId);
        }
        switch (fileWrapper.file.fileType) {
          case ExposureAppConstants.FILE_TYPE_REPORT:
            if (setCurrentDashboard) {
              ExposureStore.setCurrentDashboardId(null);
            }
            if (fetchData) {
              // Unlike the dashboard case below, filter data does not have to be fetched prior to fetching a single report's data. This
              // is because the server will automatically generate the filter state data based on the included dynamic filters in the file object.
              ExposureStore.fetchFilterData(fileId, pageSettings ? pageSettings.drilldownId : null, null, firstRender, () => ExposureStore.fetchReportData(fileId, pageSettings ? pageSettings.drilldownId : null, firstRender));
            }
            break;
          case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
            if (fetchData) {
              // Data Reviews are using the same linked reportIds as dashboards, so use 'fetchDashboardData'
              ExposureStore.fetchDashboardData(fileId, drilldownId, firstRender, false);
            }
            break;
          case ExposureAppConstants.FILE_TYPE_DASHBOARD:
            if (setCurrentDashboard) {
              ExposureStore.setCurrentDashboardId(fileId);
            }
            if (fetchData) {
              // Filter data must be fetched before the report data on a dashboard because of the way dynamic filters are
              // implemented. Specifically, fetching filter data initializes `filterStates` which is then included in the report data
              // requests. Without fetching filter data, `filterStates` will not be initialized, which means no filter information will be sent
              // with these report data requests. Although no dynamic filter selections will have been made prior to fetching the report
              // data, the presence of the filter still modifies the report data results in two ways: 1) When the presence of a filter
              // requires joins to another table to be made, those joins are made even when no filter selection is made. Since the
              // joins are inner joins, rows which can't be joined to the filter table are excluded. 2) Filters by default do not include null
              // values. That means that by default they filter out some data. Due to this expected behavior, it is required that the
              // `filterStates` be initialized before fetching report data. If both 1) and 2) are changed (e.g. we do left joins for filters
              // and include nulls by default), then fetching filter data could be done in parallel to fetching report data.
              ExposureStore.fetchFilterData(fileId, drilldownId, null, firstRender, () => ExposureStore.fetchDashboardData(fileId, drilldownId, firstRender, fetchRelatedData));
            }
            break;
          case ExposureAppConstants.FILE_TYPE_FOLDER:
            ExposureStore.fetchFolderWithParameters(fileId, pageSettings);
            break;
          case ExposureAppConstants.FILE_TYPE_MONITOR:
            // We don't fetch for monitor data directly in fetchFile.
            break;
          case ExposureAppConstants.FILE_TYPE_BUILTIN:
            if (fetchData) {
              ExposureStore.fetchFilterData(fileId, null, null, firstRender);
            }
            break;
        }
        // Emit change here otherwise editing a report by visiting a URL directly may get no File data.
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        ExposureStore.mergeFile(fileId, { fileRequestInFlight: false });
        // We assume the reason we'd have a 404 rejection is the file doesn't exist or the user doesn't have access to it.
        if (jqXHR.status === HttpStatus.NOT_FOUND) {
          ExposureStore.mergeFile(fileId, { fileRequestRejectedWith404: true });
          ExposureStore.setDataReviewFilterOptions({});
          ExposureStore.clearDataReviewFilterRequestInFlight();
          ExposureStore.setDataReviewFilterRequestInFlight(false);
        }
        ExposureStore.emitChange();
      }
    );
    ExposureStore.mergeFile(fileId, { fileRequestInFlight: true });
  },

  /*
   * Given a list of fileIds, fetch file wrappers.
   * API will return all files if an empty list is passed into it.
   */
  fetchFiles(fileIds) {
    fileIds = _.uniq(fileIds);
    var url = '/api/files';
    var fileIdsParam = _.map(fileIds, fileId => `fileIds=${fileId}`).join('&');
    url += '?' + fileIdsParam;
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        // Extract the denied fileIds and update fileRequestRejectedWith404 to be true.
        var deniedFileIds = _.difference(fileIds, _.map(data, function (fileWrapper) {
          return fileWrapper.file.id;
        }));
        _.forEach(deniedFileIds, function (fileId) {
          ExposureStore.mergeFile(fileId, { fileRequestInFlight: false, fileRequestRejectedWith404: true });
        });
        // Since fetchFiles does not retrieve metadata, we only want to replace file inside filewrapper.
        _.forEach(data, function (fileWrapper) {
          ExposureStore.setFileEntryOnly(fileWrapper.file.id, fileWrapper);
        });
        ExposureStore.emitChange();
      },
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET api/files failed');
      }
    );
    _.forEach(fileIds, function (fileId) {
      ExposureStore.mergeFile(fileId, { fileRequestInFlight: true });
    });
  },

  displayFailToDeleteFilesModal() {
    ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.FAIL,
      icon: 'icon-close-alt',
      content: FrontendConstants.FAIL_TO_DELETE,
      handleCancel: ExposureActions.closeModal
    });
  },

  displayInsufficientPermissionsModal() {
    ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.INSUFFICIENT_PERMISSIONS,
      content: FrontendConstants.YOU_DO_NOT_HAVE_SUFFICIENT_PERMISSIONS,
      handleCancel: ExposureActions.closeModal,
      primaryButton: { text: FrontendConstants.OKAY }
    });
  },

  displayActionCouldNotBeCompletedModal(content) {
    ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.THIS_ACTION_COULD_NOT_BE_COMPLETED,
      content: content,
      handleCancel: ExposureActions.closeModal,
      primaryButton: { text: FrontendConstants.OKAY }
    });
  },

  /*
   * Validate the deletion of the files and display a dialog when the files are successfully deleted.
   * Display dialogs and alert the user for the following cases:
   *  (1) At least one file the user select to delete does not have ownership -- abort the deletion.
   *  (2) At least one folder to be deleted is not empty -- abort the deletion.
   *  (3) At least one dashboard or report to be deleted is associated to an open task -- abort the deletion.
   *  (4) At lease one report is associated to a dashboard -- confirm to delete and remove the report(s) from
   *      the dashboards.
   *  (5) If all above checks pass, confirm to delete.
   */
  validateAndDeleteFiles(fileIds, folderId, pageSettings, confirm, confirmRemoveReportInDashboard) {
    fileIds = _.uniq(fileIds);
    let builtinFiles = [];
    let builtinFileIds = [];

    if (confirm) {
      const { notAllowedFiles, allowedFilesIds, notAllowedFilesIds } = ExposureStore._splitFilesByType(
        fileIds,
        ExposureAppConstants.FILE_TYPE_BUILTIN
      );
      fileIds = allowedFilesIds;
      builtinFiles = notAllowedFiles;
      builtinFileIds = notAllowedFilesIds;
    }

    var url = '/api/files' + '?confirm=' + confirm.toString() + '&confirmRemoveReportInDashboard=' + confirmRemoveReportInDashboard.toString();
    AppRequest({ type: 'DELETE', url: url, data: JSON.stringify(fileIds) }).then(
      function () {
        if (builtinFiles.length) {
          const isSomethingDeleted = !!fileIds.length;
          const immBuiltinRows = Imm.fromJS(builtinFiles);
          ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
            header: FrontendConstants.PLEASE_NOTE,
            contentIcon: isSomethingDeleted ? 'icon-checkmark-full' : null,
            content: isSomethingDeleted
              ? fileIds.length.toString() + ' ' + Util.singularOrPlural(fileIds.length, FrontendConstants.FILES_DELETED)
              : null,
            description: FrontendConstants.YOU_CANNOT_DELETE_BUILD_IN_KPI,
            listHeader: Util.singularOrPlural(immBuiltinRows.size, FrontendConstants.ITEMS_CANNOT_BE_DELETED),
            handleCancel: ExposureActions.closeModal,
            immRows: immBuiltinRows,
            primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
          });
        } else {
          ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
            header: FrontendConstants.SUCCESS,
            icon: 'icon-checkmark-full',
            content: fileIds.length.toString() + ' '
              + Util.singularOrPlural(fileIds.length, FrontendConstants.FILES_DELETED),
            handleCancel: ExposureActions.closeModal,
            primaryButton: { text: FrontendConstants.OKAY }
          });
        }
        ExposureStore.folderViewResetCheckedFileIds();
        ExposureStore.fetchFolderWithParameters(folderId, pageSettings);
        SearchActions.removeFiles(fileIds);

        builtinFileIds.forEach(builtinFileId => {
          ExposureStore.folderViewSetCheckedFileIds(ExposureStore.folderViewGetCheckedFileIds().add(builtinFileId));
        });
      },
      function (jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.BAD_REQUEST:
            var immRows = _.isNull(jqXHR.responseJSON.info) ? Imm.List() : Imm.fromJS(jqXHR.responseJSON.info.files);
            switch (jqXHR.responseJSON.message) {
              case HttpResponseConstants.BAD_REQUEST.FAILED_OWNERSHIP:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.PLEASE_NOTE,
                  content: Util.singularOrPlural(immRows.size, FrontendConstants.YOU_ARE_NOT_OWNER_TO_DELETE),
                  listHeader: Util.singularOrPlural(immRows.size, FrontendConstants.ITEMS_CANNOT_BE_DELETED),
                  handleCancel: ExposureActions.closeModal,
                  immRows: immRows,
                  primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.FAILED_EMPTY_FOLDER:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.PLEASE_NOTE,
                  content: Util.singularOrPlural(immRows.size, FrontendConstants.FOLDERS_NOT_EMPTY_TO_DELETE),
                  listHeader: Util.singularOrPlural(immRows.size, FrontendConstants.FOLDERS_CANNOT_BE_DELETED),
                  handleCancel: ExposureActions.closeModal,
                  immRows: immRows,
                  primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.FAILED_TASK_ASSOCIATION:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.PLEASE_NOTE,
                  content: Util.singularOrPlural(immRows.size, FrontendConstants.FILES_ASSOCIATE_WITH_TASK_CANNOT_BE_DELETED),
                  listHeader: Util.singularOrPlural(immRows.size, FrontendConstants.ITEMS_CANNOT_BE_DELETED),
                  handleCancel: ExposureActions.closeModal,
                  immRows: immRows,
                  primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.DELETE_RACT_CONFIRMATION:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.PLEASE_NOTE,
                  content: Util.singularOrPlural(immRows.size, FrontendConstants.FILES_ASSOCIATE_WITH_RACT_CANNOT_BE_DELETED),
                  listHeader: Util.singularOrPlural(immRows.size, FrontendConstants.ITEMS_CANNOT_BE_DELETED),
                  handleCancel: ExposureActions.closeModal,
                  immRows: immRows,
                  primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.FAILED_DASHBOARD_ASSOCIATION:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.ARE_YOU_SURE,
                  content: Util.singularOrPlural(immRows.size, FrontendConstants.REPORTS_TO_DELETE_HAVE_DASHBOARDS),
                  listHeader: FrontendConstants.AFFECTED_DASHBOARDS,
                  handleCancel: ExposureActions.closeModal,
                  immRows: immRows,
                  closingContent: {
                    text: [Util.singularOrPlural(immRows.size, FrontendConstants.DELETING_REPORTS_REMOVE_FROM_DASHBOARDS), FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE],
                    emphasisText: FrontendConstants.PLEASE_CONFIRM_DELETE
                  },
                  primaryButton: {
                    text: FrontendConstants.DELETE,
                    icon: 'icon-remove',
                    onClick() {
                      ExposureActions.closeModal();
                      ExposureStore.validateAndDeleteFiles(fileIds, folderId, pageSettings, true, true)
                    }
                  },
                  secondaryButton: { text: FrontendConstants.CANCEL, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.FAILED_CONFIRMATION:
                ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                  header: FrontendConstants.ARE_YOU_SURE,
                  handleCancel: ExposureActions.closeModal,
                  closingContent: {
                    text: [FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE],
                    emphasisText: FrontendConstants.PLEASE_CONFIRM_DELETE
                  },
                  primaryButton: {
                    text: FrontendConstants.DELETE,
                    icon: 'icon-remove',
                    onClick() {
                      ExposureActions.closeModal();
                      ExposureStore.validateAndDeleteFiles(fileIds, folderId, pageSettings, true, false)
                    }
                  },
                  secondaryButton: { text: FrontendConstants.CANCEL, onClick: ExposureActions.closeModal }
                });
                break;
              case HttpResponseConstants.BAD_REQUEST.FAILED:
              default:
                ExposureStore.displayFailToDeleteFilesModal();
                break;
            }
            GA.sendDocumentsDelete(fileIds, jqXHR.responseJSON.message.toUpperCase());
            break;
          default:
            ExposureStore.displayFailToDeleteFilesModal();
            console.log('%cERROR: DELETE' + url + ' of files ' + JSON.stringify(fileIds) + ' failed', 'color: #E05353');
            GA.sendAjaxException('DELETE' + url + ' of files ' + JSON.stringify(fileIds) + ' failed');
        }
        ExposureStore.emitChange();
      }
    );
  },

  deleteFiles(fileIds, folderId, pageSettings) {
    if (_.isEmpty(fileIds)) {
      return;
    }
    ExposureStore.validateAndDeleteFiles(fileIds, folderId, pageSettings, false, false);
  },

  setMoveToFolderId(folderId) {
    _immExposureStore = _immExposureStore.set('moveToFolderId', folderId)
  },

  setMonitorTasks(immMonitorTasks = Imm.List()) {
    _immExposureStore = _immExposureStore.set('monitorTasks', immMonitorTasks);
  },

  setMonitorTasksExpandedIds(immExpandedIds, openMonitorTasks) {
    _immExposureStore = _immExposureStore.set('immExpandedMonitorTasksIds', immExpandedIds);
    if (openMonitorTasks) {
      _immExposureStore = _immExposureStore.set('showMonitorTasks', true);
    }
  },

  areFilesEditable(filesIds) {
    return !filesIds
      .some(fileId => !_immExposureStore.getIn(['files', fileId, 'fileWrapper', 'canEdit']));
  },

  _endMoveFilesHandler(data, filesCount, folderId, pageSettings, notAllowedImmFiles, allowedIds) {
    if (data.errorMsg) {
      return;
    }

    if (notAllowedImmFiles.size) {
      const isSomethingMoved = !!allowedIds.length;

      ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
        header: FrontendConstants.PLEASE_NOTE,
        contentIcon: isSomethingMoved ? 'icon-checkmark-full' : null,
        content: isSomethingMoved ? FrontendConstants.FILES_MOVED(filesCount) : null,
        description: FrontendConstants.YOU_CANNOT_MOVE_BUILD_IN_KPI,
        listHeader: Util.singularOrPlural(
          notAllowedImmFiles.size,
          FrontendConstants.ITEMS_CANNOT_BE_MOVED
        ),
        handleCancel: ExposureActions.closeModal,
        immRows: notAllowedImmFiles,
        primaryButton: { text: FrontendConstants.OK, onClick: ExposureActions.closeModal }
      });
    } else {
      ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
        header: FrontendConstants.SUCCESS,
        icon: 'icon-checkmark-full',
        content: FrontendConstants.FILES_MOVED(filesCount),
        handleCancel: ExposureActions.closeModal
      });
    }

    ExposureStore.folderViewResetCheckedFileIds();
    ExposureStore.fetchFolderWithParameters(folderId, pageSettings);
  },

  _prepareFileForUpdate(folders, fileWrapper) {
    let immFile = Imm.fromJS(fileWrapper.file);
    const moveToFolderId = _immExposureStore.get('moveToFolderId');
    const fileType = immFile.get('fileType');

    if (fileType === ExposureAppConstants.FILE_TYPE_MONITOR) {
      const oldFolderId = immFile.get('folderId');
      const oldFolderName = !!oldFolderId
        ? ExposureStore.getFile(oldFolderId).get('title')
        : FrontendConstants.ROOT_DIRECTORY;

      let newFolderName = '';
      const newDestination = ExposureStore.getFile(moveToFolderId);

      if (newDestination) {
        newFolderName = newDestination.get('title');
      } else {
        const folder = folders.find(folder => folder.id === moveToFolderId);
        newFolderName = folder.title;
      }
      immFile = immFile.setIn(
        ['monitor', 'modificationNote'],
        FrontendConstants.MOVE_MONITOR_MODIFICATION_NOTE(oldFolderName, newFolderName)
      );
    }

    const fileId = immFile.get('id');
    GA.sendDocumentMove(fileId, moveToFolderId);
    const isLandingPage = moveToFolderId === ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
    const folderId = isLandingPage ? null : moveToFolderId;

    immFile = immFile.set('folderId', folderId);
    return immFile;
  },

  _moveFilesHandler(folders, filesIds, folderId, pageSettings) {
    const moveFilesRequests = [];

    const { notAllowedFiles, allowedFilesIds } = ExposureStore._splitFilesByType(
      filesIds,
      ExposureAppConstants.FILE_TYPE_BUILTIN
    );

    allowedFilesIds.forEach(fileId => {
      const url = '/api/files/' + fileId;
      moveFilesRequests.push(AppRequest({ type: 'GET', url }));
    });

    Promise.all(moveFilesRequests)
      .then(
        fileWrappers => {
          const prepearedFiles = fileWrappers
            .map(fileWrapper => ExposureStore._prepareFileForUpdate(folders, fileWrapper));
          const filesCount = prepearedFiles.length;
          const immFilesNotAllowedToMove = Imm.fromJS(notAllowedFiles);
          ExposureStore.updateFiles(allowedFilesIds, prepearedFiles,
            (data) => ExposureStore._endMoveFilesHandler(data, filesCount, folderId, pageSettings,
              immFilesNotAllowedToMove, allowedFilesIds), false);
        },
        (jqXHR) => {
          console.log('%cERROR: GET ' + jqXHR.url + ' failed', 'color: #E05353');
          GA.sendAjaxException('GET ' + jqXHR.url + ' failed');
        });
  },

  showSelectFolderModal(folders, filesIds, folderId, pageSettings) {
    ExposureStore.displayModal(ModalConstants.MODAL_SELECT_A_FOLDER, {
      header: FrontendConstants.MOVE,
      content: FrontendConstants.SELECT_A_DESTINATION,
      currentFolderId: folderId,
      handleCancel: ExposureActions.closeModal,
      immRows: Imm.fromJS(folders),
      selectedFilesCount: filesIds.size,
      primaryButton: {
        text: FrontendConstants.MOVE,
        icon: 'icon-move',
        onClick: () => ExposureStore._moveFilesHandler(folders, filesIds, folderId, pageSettings)
      }
    });
    ExposureStore.emitChange();
  },

  moveFiles(filesIds, folderId, pageSettings) {
    const hasEditPrivileges = ExposureStore.areFilesEditable(filesIds);

    if (hasEditPrivileges) {
      const url = '/api/folder/subfolders';
      AppRequest({ type: 'GET', url: url })
        .then(
          folders => ExposureStore.showSelectFolderModal(folders, filesIds, folderId, pageSettings),
          () => {
            console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
            GA.sendAjaxException('GET ' + url + ' failed');
          }
        );
    } else {
      // The user doesn't have EDIT privilege on the file.
      ExposureStore.displayInsufficientPermissionsModal();
    }
  },

  _splitFilesByType(filesIds, type) {
    const notAllowedFiles = [];
    const notAllowedFilesIds = [];
    const allowedFilesIds = [];

    filesIds.forEach(fileId => {
      const fileType = _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType']);
      const fileTitle = _immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'title']);
      if (fileType === type) {
        notAllowedFiles.push({ "type": fileType, "title": fileTitle });
        notAllowedFilesIds.push(fileId);
      } else {
        allowedFilesIds.push(fileId);
      }
    });

    return { notAllowedFiles, allowedFilesIds, notAllowedFilesIds };
  },

  extendSession() {
    var url = '/api/extend-session';
    AppRequest({ type: 'GET', url: url }).then(
      _.noop,
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
  },

  /*
   * Given a fileId, fetch its file config.
   *
   * Note: only touches the fileConfigs part of the store.
   */
  fetchFileConfig(fileId) {
    if (ExposureStore.isFileConfigRequestInFlight(fileId)) {
      return;
    }
    var url = '/api/files/' + fileId;
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        let updateFileWrapper;
        if (data.file.tags && data.file.tags.length > 0) {
          updateFileWrapper = Util.updateRankConfig(data);
        } else {
          updateFileWrapper = data;
        }
        ExposureStore.setFileConfig(fileId, updateFileWrapper);
        ExposureStore.mergeFileConfig(fileId, { fileConfigRequestInFlight: false });
        ExposureStore.emitChange();
      },
      function () {
        // TODO: Handle 404 response.
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
        ExposureStore.mergeFileConfig(fileId, { fileConfigRequestInFlight: false });
        ExposureStore.emitChange();
      }
    );
    ExposureStore.mergeFileConfig(fileId, { fileConfigRequestInFlight: true });
  },

  /*
   * Given a list of fileIds, fetch file configs.
   * If fileIds is empty, fetch all file configs.
   *
   * Note: only touches the fileConfigs part of the store.
   */
  fetchFileConfigs(fileIds, callback) {
    fileIds = _.uniq(fileIds);
    var guardedCallback = Util.getGuardedCallback(callback);
    if (ExposureStore.isFileConfigsRequestInFlight()) {
      guardedCallback(_immExposureStore);
      return;
    }
    var url = '/api/files';
    var fileIdsParam = _.map(fileIds, function (fileId) {
      return 'fileIds=' + fileId;
    }).join('&');
    url += '?' + fileIdsParam;
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        const fileConfigsMapObject = ReportUtil.createFileConfigMapObject(data);
        ExposureStore.setFileConfigs(fileConfigsMapObject);
        ExposureStore.clearFileConfigsRequestInFlight();
        guardedCallback(_immExposureStore);
        ExposureStore.emitChange();
      },
      function () {
        // TODO: Handle 404 response.
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
        ExposureStore.clearFileConfigsRequestInFlight();
        ExposureStore.emitChange();
      }
    );
    ExposureStore.setFileConfigsRequestInFlight(true);
  },

  fetchFileConfigsForDataReview(completionCallback) {
    const url = `/api/data-review/files`;
    if (ExposureStore._isFileConfigsForDataReviewRequestInFlight()) {
      return;
    }
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        const fileConfigsMapObject = ReportUtil.createFileConfigMapObject(data);
        ExposureStore._mergeFileConfigs(fileConfigsMapObject);
        ExposureStore._setFileConfigsForDataReview(fileConfigsMapObject);
        ExposureStore._clearFileConfigsForDataReviewRequestInFlight();
        ExposureStore.onAjaxCompletion();
        completionCallback();
      },
      jqXHR => {
        ExposureActions.createStatusMessage(FrontendConstants.FAILED_TO_GET_DATA_FROM_SERVER,
          StatusMessageTypeConstants.TOAST_ERROR);
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
        ExposureStore._clearFileConfigsForDataReviewRequestInFlight();
        ExposureStore.onAjaxCompletion();
        completionCallback();
      }
    );
    ExposureStore._setFileConfigsForDataReviewRequestInFlight();
  },

  fetchDataReviewRoles(dataReviewId, completionCallback) {
    let url = `/api/data-review/${dataReviewId}/roles`;
    if (!dataReviewId) {
      url = `/api/data-review/roles`;
    }
    if (ExposureStore._isDataReviewRolesRequestInFlight()) {
      return;
    }
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        const reviewRoles = data;
        ExposureStore._setDataReviewRoles(reviewRoles);
        ExposureStore._clearDataReviewRolesRequestInFlight();
        ExposureStore.onAjaxCompletion();
        completionCallback();
      },
      jqXHR => {
        ExposureActions.createStatusMessage(FrontendConstants.FAILED_TO_GET_DATA_FROM_SERVER,
          StatusMessageTypeConstants.TOAST_ERROR);
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
        ExposureStore._clearDataReviewRolesRequestInFlight();
        ExposureStore.onAjaxCompletion();
        completionCallback();
      }
    );
    ExposureStore._setDataReviewRolesRequestInFlight();
  },

  fetchFileConfigsForGroup(groupId) {
    const url = `/api/files/groups/${groupId}`;
    if (ExposureStore.isFileConfigsRequestInFlight()) {
      return;
    }
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        const fileConfigsMapObject = ReportUtil.createFileConfigMapObject(data);
        ExposureStore.setFileConfigs(fileConfigsMapObject);
        ExposureStore.clearFileConfigsRequestInFlight();
        ExposureStore.emitChange();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
        ExposureStore.clearFileConfigsRequestInFlight();
        ExposureStore.emitChange();
      }
    );
    ExposureStore.setFileConfigsRequestInFlight(true);
  },

  refreshCurrentFolderWithParameters() {
    var href = window.location.href;
    var match = href.match(/\/folders\/(.+)?\?(.+)/);
    if (_.size(match) === 3) {
      var folderId = _.isEmpty(match[1]) ? ExposureAppConstants.REPORTS_LANDING_PAGE_ID : match[1];
      var queryObject = Util.getQueryObject(match[2] || '');
      var params = Util.packagePageSettings(queryObject);
      ExposureStore.fetchFolderWithParameters(folderId, params);
    } else {
      ExposureStore.emitChange();
    }
  },

  fetchFolderWithParameters(folderId, params) {
    var length = params.pageSize;
    var beginIdx = (params.page - 1) * length;
    var sortBy = params.sortColumn;
    var order = params.sortOrdering;

    var requestParams = { begin: beginIdx, length: length };
    var immFilters = _immExposureStore.getIn(['activeListFilters', ExposureAppConstants.LIST_FILTER_TARGET_FOLDERS]);
    _.extend(requestParams, immFilters.toJS());

    if (sortBy && order) {
      requestParams.sortby = sortBy;
      requestParams.order = order;
    }

    var url = '/api/folder/' + folderId + '/paginated?' + $.param(requestParams);
    var oldRequest = ExposureStore.getFolderRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    var newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setFolderRequest(newRequest);

    newRequest.then(
      function (data) {
        ExposureStore.clearFolderRequest();
        ExposureStore.folderViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        const accessibleFiles = data.files.filter(item => {
          if (!!item.file.builtinType && item.file.builtinType === 'TASKS') {
            const hastTaskAcccess = PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.READ);
            return hastTaskAcccess;
          }
          return true;
        });
        var immChildrenIdList = Imm.fromJS(data.fileIds);
        var immFolder = ExposureStore.getFileWrapper(folderId);
        var immNewFolder = immFolder.setIn(['file', 'fileIds'], immChildrenIdList);
        ExposureStore.setFileWrapper(folderId, immNewFolder);
        var immChildrenFiles = Imm.fromJS(accessibleFiles);
        immChildrenFiles.forEach(function (immFileWrapper) {
          var fileId = immFileWrapper.getIn(['file', 'id']);
          if (!immFileWrapper.has('metadata')) {
            immFileWrapper = immFileWrapper.set('metadata', Imm.Map());
          }
          var immNewFileWrapper = immFileWrapper;
          if (!immFileWrapper.hasIn(['file', 'folderId'])) {
            immNewFileWrapper = immFileWrapper.setIn(['file', 'folderId'], ExposureAppConstants.REPORTS_LANDING_PAGE_ID);
          }
          ExposureStore.setFileConfig(fileId, immNewFileWrapper.toJS());
          ExposureStore.setFileWrapper(fileId, immNewFileWrapper);
        });

        var immFileIdList = immChildrenFiles.map(function (immFileWrapper) {
          return immFileWrapper.getIn(['file', 'id']);
        });
        // This seem a wild line reach out side of file store. Everything else in this
        // function is dealing with things inside file store, while this line is updating
        // folder view store. No better solution yet.
        _immExposureStore = _immExposureStore.mergeIn(['folderView'], {
          begin: data.begin,
          fileIds: immFileIdList,
          isEmpty: immFileIdList.isEmpty(),
          folderId: folderId
        });
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            ExposureStore.folderViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            ExposureStore.folderViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        ExposureStore.clearFolderRequest();
        ExposureStore.emitChange();
      }
    )
  },

  /*
   * Fetch all notifications for the current user
   */
  fetchNotifications() {
    var url = '/api/notifications';
    var currentRequest = ExposureStore.getNotificationsRequest();
    if (!currentRequest) {
      var newRequest = AppRequest({ type: 'GET', url: url });
      ExposureStore.setNotificationsRequest(newRequest);
      newRequest.then(
        function (data) {
          ExposureStore.clearNotificationsRequest();
          // TODO: Add alerts to notifications.
          var immNotifications = Imm.fromJS(_.sortBy(_.uniq(data.notifications, 'targetId'), 'updatedAt').reverse());
          ExposureStore.setNotifications(immNotifications);
          ExposureStore.emitChange();
        },
        function () {
          ExposureStore.clearNotificationsRequest();
        }
      )
    }
  },

  // Fetches required dashboard and data review set data
  fetchDashboardData(dashboardId, drilldownId, firstRender, fetchRelatedData = true) {
    const immFile = ExposureStore.getFile(dashboardId);
    const drilldownSchemaId = _immExposureStore.getIn(['drilldown', drilldownId, 'schemaId']);

    if (drilldownId && drilldownSchemaId !== immFile.get('dashboardSchemaId')) {
      _immExposureStore = _immExposureStore.deleteIn(['drilldown', drilldownId]);
      if (firstRender) {
        ExposureStore.createStatusMessage(FrontendConstants.FILTER_NOT_APPLICABLE, StatusMessageTypeConstants.TOAST_ERROR);
      }
      // No need to fetch data here. Deleting the drilldown will cause the URL to change (dropping drilldownId from the query parameters),
      // causing another call to fetchDashboardData.
      return;
    }
    const immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(dashboardId, drilldownId, /* noPagingOptions */ false, null, firstRender);
    const url = `/api/dashboard-reports/${dashboardId}`;
    AppRequest({ type: 'GET', url: url }).then((data) => {
      const immChildrenIdList = Imm.fromJS(_.chain(data).map(fileWrapper => (fileWrapper.file.fileType === ExposureAppConstants.FILE_TYPE_REPORT ? fileWrapper.file.id : null)).compact().value());
      const immNewDashboard = ExposureStore.getFileWrapper(dashboardId).setIn(['file', 'reportIds'], immChildrenIdList);
      ExposureStore.setFileWrapper(dashboardId, immNewDashboard);
      _.defer(() => {
        // TODO: we should improve the performance by doing lazy loading base on the position of the scrollbar.
        // Follow up user story: https://comprehend.tpondemand.com/entity/5361.
        _.each(data, (fileWrapper) => {
          if (fileWrapper.file.fileType === ExposureAppConstants.FILE_TYPE_REPORT) {
            const fileId = fileWrapper.file.id;
            ExposureStore.setFileEntry(fileId, fileWrapper);
            ExposureStore.setFileTaskFiltersSCCS(fileId, immQueryOptionsWrapper.get('taskFilters'));

            // If we want to execute the report queries, then do so
            if (fetchRelatedData) {
              ExposureStore.fetchReportData(fileId, drilldownId);
            }
            // Otherwise, emit the change for the file configs so they are stored in the store properly
            else {
              ExposureStore.emitChange();
            }
          }
        });
      });
      // Making sure the emitChange() is finished before fetchReportData.
      ExposureStore.emitChange();
    }, () => {
      console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
      GA.sendAjaxException(`GET ${url} failed`);
    });
  },

  fetchStudyCROData() {
    const oldRequest = ExposureStore.getStudyCroDataRequest();
    if (oldRequest) {
      oldRequest.abort();
      ExposureStore.clearStudyCroDataRequest();
      ExposureStore.clearStudyCRODataRequestInFlight();
    }

    let url = '/api/study-cro';
    const request = AppRequest({ type: 'GET', url: url });
    ExposureStore.setStudyCroDataRequest(request);
    request.then(
      function (data) {
        ExposureStore.setStudyCROData(data);
        ExposureStore.clearStudyCRODataRequestInFlight();
        ExposureStore.clearStudyCroDataRequest();
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
          GA.sendAjaxException('GET ' + url + ' failed');
          ExposureStore.clearStudyCRODataRequestInFlight();
          ExposureStore.clearStudyCroDataRequest();
          ExposureStore.emitChange();
        }
      }
    );

    ExposureStore.setStudyCRODataRequestInFlight(true);
  },

  // Construct an immutable form of `queryOptionsWrapper` to be used when fetching filter data, report data, and export data.
  getImmQueryOptionsWrapper(fileId, drilldownId, noPagingOptions, fetchFilterDataStartIndex, firstRender, rowLength) {
    const immFile = ExposureStore.getFile(fileId);
    const reportType = immFile.getIn(['reportConfig', 'reportType']);
    // Below three are filters that are carried over when drilling down to a report. The app carries over the source report's drilldown SCCs and included static/dynamic filters.
    const immDrilldownDataPointFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownDataPointFilters'], Imm.List());
    const immDrilldownIncludedStaticFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedStaticFilters'], Imm.List());
    const immDrilldownIncludedDynamicFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedDynamicFilters'], Imm.List());
    const immDrilldownTaskFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownTaskFilters'], Imm.List());
    const currentDashboardId = _immExposureStore.get('currentDashboardId');
    const includedDynamicFilterSourceId = currentDashboardId || fileId;
    const immFilterStates = ExposureStore.getFilterStates(includedDynamicFilterSourceId);
    const sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
    const sessionStaticFilters = _.map(sessionFilters.sessionStaticFilters, Util.getFullSessionStaticFilters);
    const sessionDynamicFilters = _.map(sessionFilters.sessionDynamicFilters, Util.getFullSessionDynamicFilters);
    const immIncludedDynamicFilters = immFilterStates.map(Util.packageFilterCondition);
    const isTabularReport = immFile.getIn(['reportConfig', 'reportType']) === ExposureAppConstants.REPORT_TYPE_TABULAR;
    // We need to fetch information about Tabular Report's columns, represented by `tabularReportQuery`, because they are used in column sorting mechanism. There might be
    // a room of improvement here...
    const fetchTabularReportQuery = isTabularReport && _.isUndefined(ExposureStore.getTabularReportQuery(fileId));

    // Disable session filters when in the DashboardStudio or when in a dashboard and `dashboardSchemaId` is not
    // specified. `dashboardSchemaId` is not specified when the dashboard contains reports from multiple schemas, hence
    // we want to disable session filters as they won't be applicable to all reports.
    const disableSessionFilters = immFile.get('disableMasterStudyFilters') || _immExposureStore.get('disableSessionFilters') || (currentDashboardId && !ExposureStore.getFile(currentDashboardId).has('dashboardSchemaId'));

    const taskFilters = ExposureStore.getFileTaskFiltersSCCS(fileId) || Imm.List();
    const fetchPrettyPrint = !!firstRender;

    let immQueryOptionsWrapper = Imm.Map({
      disableSessionFilters,
      fetchTabularReportQuery,
      fetchFilterDataStartIndex,
      drilldownDataPointFilters: immDrilldownDataPointFilters,
      drilldownIncludedStaticFilters: immDrilldownIncludedStaticFilters,
      drilldownIncludedDynamicFilters: immDrilldownIncludedDynamicFilters,
      drilldownTaskFilters: immDrilldownTaskFilters,
      includedDynamicFilterSourceId: includedDynamicFilterSourceId,
      sessionStaticFilters: sessionStaticFilters,
      sessionDynamicFilters: sessionDynamicFilters,
      includedDynamicFilters: immIncludedDynamicFilters,
      taskFilters,
      pageOrderings: [],
      cqlQueries: [],
      fetchPrettyPrint,
      rowLength: rowLength
    });

    if (reportType === ExposureAppConstants.REPORT_TYPE_TABULAR) {
      const immTabularReportState = ExposureStore.getTabularReportState(fileId);

      immQueryOptionsWrapper = immQueryOptionsWrapper.merge(Imm.Map({
        pageLowerLimit: !noPagingOptions ? immTabularReportState.get('pageLowerLimit', 0) : null,
        pageUpperLimit: !noPagingOptions ? immTabularReportState.get('pageUpperLimit', ListViewConstants.DEFAULT_ROWS_PER_PAGE - 1) : null,
        pageOrderings: immTabularReportState.get('pageOrderings', Imm.List())
      }));
    }

    return immQueryOptionsWrapper;
  },

  /*
   * Given `fileId` and `drilldownId`, fetch filter data for current state in the store. This function is responsible for getting
   * necessary data for rendering Session Filters and Included Filters. Necessary data includes filter validity, filter selection options, and
   * current filter selection.
   * `fetchFilterDataStartIndex`: represents the index among session and included dynamic filters to start fetching filter data from.
   *
   * Interaction Flow
   *
   *
   * Opening a report/dashboard
   *                                       report
   *                                     +-------------> fetchReportData
   *                                     |
   * fetchFile ---> fetchFilterData ---> |
   *                                     |
   *                                     | dashboard
   *                                     +-------------> fetchDashboardData --> fetchReportData/report
   *
   *
   * Adding/Removing/Modifying a dynamic filter
   *                                         report
   *                                       +-------------> fetchReportData
   *                                       |
   * applyFilter ---> fetchFilterData ---> |
   *                                       |
   *                                       | dashboard
   *                                       +-------------> fetchReportData/report
   *
   */
  fetchFilterData(fileId, drilldownId, fetchFilterDataStartIndex, firstRender, callback) {

    if (window?.opener?.params) {
      drilldownId = window.opener.params?.drilldownKey;
      let drilldown = window.opener.params?.drillDownParams?.[drilldownId];

      let { drilldownDataPointFilters, drilldownIncludedStaticFilters, drilldownIncludedDynamicFilters, drilldownTaskFilters } = drilldown;

      _immExposureStore = _immExposureStore.setIn(['drilldown', drilldownId], Imm.fromJS({
        drilldownDataPointFilters: drilldownDataPointFilters,
        drilldownIncludedStaticFilters: drilldownIncludedStaticFilters,
        drilldownIncludedDynamicFilters: drilldownIncludedDynamicFilters,
        drilldownTaskFilters: drilldownTaskFilters
      }));

      window.opener.params = undefined;
    }

    const immFile = ExposureStore.getFile(fileId);
    const fileType = immFile.get('fileType');
    const immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(fileId, drilldownId, /* noPagingOptions */ false, fetchFilterDataStartIndex, firstRender);

    const url = `/api/files/${fileId}/filter-data`;

    let filterHeaderData = immQueryOptionsWrapper.toJS();

    let nullOrNotNullCheck = immFile.get('nullOrNotNullCheck');
    if (nullOrNotNullCheck) {
      filterHeaderData['nullOrNotNullCheck'] = true;
    }

    const data = JSON.stringify(filterHeaderData);

    const oldRequest = ExposureStore.getFilterDataRequest(fileId);

    if (oldRequest) {
      oldRequest.abort();
    }

    const newRequest = AppRequest({ type: 'POST', url: url, data: data });
    ExposureStore.setFilterDataRequest(fileId, newRequest);
    if (firstRender) {
      ExposureStore.clearDrilldownFilterDisplayStrings();
    }
    newRequest.then((data) => {
      /* `data` contains four lists of filter data and they are used for,
       * sessionStaticFilterResults: validity, display string.
       * sessionDynamicFilterResults: validity, filter selection data, component type, column display string.
       * includedStaticFilterResults: display string.
       * includedDynamicFilterResults: filter selection data, component type, column display string.
       */
      ExposureStore.clearFilterDataRequest(fileId);
      const currentDashboardId = _immExposureStore.get('currentDashboardId');
      // `insideDashboard` represents that `fetchFilterData` is triggered on reports that are under a dashboard and the app has the dashboard open.
      const insideDashboard = !_.isEmpty(currentDashboardId) && currentDashboardId !== fileId;

      ExposureStore.setIncludedStaticFilterResults(fileId, data.includedStaticFilterResults);
      ExposureStore.setFileSCCs(fileId, Imm.fromJS(data.queryEngineSCCs));
      if (firstRender) {
        ExposureStore.setDrilldownFilterDisplayStrings(data.drilldownFilterDisplayStrings);

        // After refresh store the first time data
        let obj = {};
        obj[fileId] = data.includedDynamicFilterResults;
        let storedFilterData = _immExposureStore.get('includedFilter').toJS();

        // If store is empty then its first load so save the data
        if (_.isEmpty(storedFilterData)) {
          ExposureStore.saveFilterData(obj);
        }
        // If store is not empty, then check if its for same dashboard or new dashboard
        else if (!_.isEmpty(storedFilterData) && !storedFilterData.hasOwnProperty(fileId)) {
          ExposureStore.saveFilterData(obj, fileId);
        }
      }

      if (!insideDashboard) {
        ExposureStore.setIncludedDynamicFilterResults(fileId, data.includedDynamicFilterResults, fetchFilterDataStartIndex);
        ExposureStore.setSessionStaticFilterResults(data.sessionStaticFilterResults);
        ExposureStore.mapSessionFiltersWithDataAccessGroup(data.sessionDynamicFilterResults,
          fetchFilterDataStartIndex);
        ExposureStore.setSessionDynamicFilterResults(data.sessionDynamicFilterResults, fetchFilterDataStartIndex);
      } else {
        // This section of code is called when `fetchFilterData` is called on reports inside a dashboard. Why would you need filter data for inner-reports when viewing a dashboard?
        // Each inner-report's included static filters are applied on their report data from backend, using each file object's persisted.
        console.log(`%cERROR: GET ${url} possibly called unnecessarily.`, 'color: #E05353');
      }

      if(callback){
        ExposureStore.setFilterStateAfterApply(fileId);
        ExposureStore.emitChange();
      }
      Util.getGuardedCallback(callback)();
      ExposureStore.emitChange();
    }, (jqXHR) => {
      if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
        ExposureStore.clearFilterDataRequest(newRequest);
        // id:13164.
        // TODO: Convert this message to a toast when the report UI replaces the loading spinner with an 'error' component.
        ExposureStore.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
      }
    });
  },

  // Set default values in filters
  setDefaultValuesToFilters(fileId, immExposureStore, defaultData, drilldownId) {
    let itemsAlreadySelected = false;

    var getDynamicFilters = immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List()).toJS();
    let dynamicFilterList = getDynamicFilters.map((immFilter) => {
      let newFilterData = immFilter;
      let filterDisplayName = immFilter && immFilter.column.displayString;
      let filtersList = defaultData.map((obj) => obj.filterName);

      if (filtersList.includes(filterDisplayName)) {
        let newItemSelected = [];
        let defaultValuesData = defaultData.filter((obj) => obj.filterName === filterDisplayName);
        let currentFilterData = defaultValuesData && defaultValuesData[0].data;

        if (currentFilterData.constructor === Array) {
          newItemSelected = [...new Set([...newFilterData.itemsSelected, ...currentFilterData])];
        }
        else {
          let { startIndex, endIndex } = currentFilterData;
          let start = startIndex || 0;
          let end = endIndex || 2;
          newItemSelected = immFilter.data && immFilter.data.length ? immFilter.data.slice(start, end) : [];
        }

        newFilterData = {
          ...immFilter,
          itemsSelected: newFilterData.itemsSelected.length ? newFilterData.itemsSelected : newItemSelected,
          allSelected: false
        }

        itemsAlreadySelected = immFilter.itemsSelected.length ? true : false;

        return newFilterData;
      }

      return newFilterData;
    });

    if (!itemsAlreadySelected) {
      ExposureStore.setDefaultDynamicFilterResults(fileId, dynamicFilterList);
    }

  },
  /*
   * Given `reportId` and `drilldownId`, update its report data in the file store. This function assumes
   * the fileWrapper exists.
   *
   * The retrieved data is respective of all existing selection condition columns
   * specified by embedded, session, dashboard, and other applied filters.
   */
  fetchReportData(reportId, drilldownId, firstRender) {
    const immFile = ExposureStore.getFile(reportId);
    const reportType = immFile.getIn(['reportConfig', 'reportType']);
    const currentDashboardId = _immExposureStore.get('currentDashboardId');
    const insideDashboard = !_.isNull(currentDashboardId);
    const drilldownSchemaId = _immExposureStore.getIn(['drilldown', drilldownId, 'schemaId']);
    const reportSchemaId = Util.getComprehendSchemaIdFromFile(immFile);

    // Clears reportData so it renders a Content Placeholder with a spinner.
    ExposureStore.clearReportData(reportId);
    ExposureStore.clearReportMetrics(reportId);
    ExposureStore.emitChange();

    if (drilldownId && !insideDashboard && drilldownSchemaId !== reportSchemaId) {
      _immExposureStore = _immExposureStore.deleteIn(['drilldown', drilldownId]);
      if (firstRender) {
        ExposureStore.createStatusMessage(FrontendConstants.FILTER_NOT_APPLICABLE, StatusMessageTypeConstants.TOAST_ERROR);
      }
      // No need to fetch data here. Deleting the drilldown will cause the URL to
      // change (dropping drilldownId from the query parameters), causing another call to
      // fetchReportData.
      return;
    }

    let includedDynamicFilters = ExposureStore.getFile(reportId).toJS().includedDynamicFilters;
    let defaultData = [];

    includedDynamicFilters.map((obj) => {
      if (obj.hasOwnProperty("itemSelected")) {
        defaultData.push(obj["itemSelected"]);
      }
    })

    if (defaultData.length && firstRender) {
      ExposureStore.setDefaultValuesToFilters(reportId, _immExposureStore, defaultData, drilldownId);
    }

    const immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(reportId, drilldownId);
    const immQualityAgreements = ExposureStore.getQualityAgreements();

    // This section is for new-style reports.
    if (immFile.get('templatedReport', false)) {
      // Lets the following block to defer as it has a synchronized call.
      _.defer(() => {
        // Run through the validator to see if it's a valid report prior to perform a data fetch.
        // This is a performance enhancement.
        // FIXME: When a proper mechanism to flag adhoc reports as finished or not is
        // created this should should check that instead. Right now we have to
        // ignore the CQL checks so invalid CQL could slip by, but the user would
        // still see a proper invalid CQL error.
        const immTemplateErrors = TemplateLibrary.validateTemplate(
          immFile.getIn(['templatedReport', 'template']),
          immFile.getIn(['templatedReport', 'comprehendSchemaId']),
          immFile.getIn(['templatedReport', 'advancedConfigOverrides']),
          false,
          _.noop);
        if (!immTemplateErrors.isEmpty() && !immTemplateErrors.every(msg => msg === FrontendConstants.VERIFYING)) {
          ExposureStore.createStatusMessage(FrontendConstants.REPORT_CONTAINS_ERRORS, StatusMessageTypeConstants.WARNING);
          return;
        }

        let reportData, perfMetrics;
        try {
          // Run the queryPlan.
          const cookies = CookieStore.getCookies();
          [reportData, perfMetrics] = QueryUtils.execInstantiatedTemplateQueryPlan(immFile, immQueryOptionsWrapper, immQualityAgreements, this.getExposureStore(), cookies, this);
          getExposureStore(this);
          getExposureStoreForExport(this);
          if(immFile.toJS()?.hideLeftFilterPanel){
            callTaskCountApi({immFile,immExposureStore:_immExposureStore}, reportId);
            ExposureStore.getUSDMTime( reportId)
          }

        } catch (e) {
          console.log(`%cERROR: Error when executing query plan: ${e}`, 'color: #E05353');
          ExposureStore.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.TOAST_ERROR);
          ExposureStore.emitChange();
          return;
        }

        ExposureStore.setReportData(reportId, Imm.fromJS(reportData));
        ExposureStore.setReportMetrics(reportId, Imm.fromJS(perfMetrics));
        ExposureStore.emitChange();
      });
      return;
    }

    const url = `/api/files/${reportId}/data`;
    const data = JSON.stringify(immQueryOptionsWrapper.toJS());
    const oldRequest = ExposureStore.getReportDataRequest(reportId);
    if (oldRequest) {
      oldRequest.abort();
    }

    const newRequest = AppRequest({ type: 'POST', url: url, data: data });
    ExposureStore.setReportDataRequest(reportId, newRequest);
    newRequest.then((data) => {
      ExposureStore.clearReportDataRequest(reportId);
      ExposureStore.setReportData(reportId, Imm.fromJS(data.reportData));

      if (immQueryOptionsWrapper.get('fetchTabularReportQuery')) {
        switch (reportType) {
          case ExposureAppConstants.REPORT_TYPE_TABULAR:
            ExposureStore.resetTabularReportState(reportId);
            ExposureStore.setTabularReportQuery(reportId, data.tabularReportQuery);
        }
      }
      ExposureStore.emitChange();
    }, (jqXHR) => {
      if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
        ExposureStore.clearReportDataRequest(reportId);
        ExposureStore.createStatusMessage(FrontendConstants.REPORT_DATA_FAILED_TO_LOAD(immFile.get('title')), StatusMessageTypeConstants.WARNING);
      }

    });
  },

  fetchStudies(callback) {
    const url = `/api/studies`;
    AppRequest({ type: 'GET', url: url }).then(
      (data) => {
        let studyData = Imm.Map();
        if (data) {
          studyData = Imm.fromJS(data);
        }
        _immExposureStore = _immExposureStore.set(Key.studies, studyData);
        ExposureStore.emitChange();
        Util.getGuardedCallback(callback)();
      },
      (jqXHR) => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        Util.getGuardedCallback(callback)();
      }
    )
  },

  // TODO - As we will need to get studies for other workflows, we should combine this API with loadAllStudies in
  //        AdminStore. We could have a single API which takes in the store as a parameter to know which to update
  fetchYellowfinStudyFilterData(callback) {
    const oldRequest = ExposureStore.getYellowfinStudyFilterDataRequest();
    if (oldRequest) {
      oldRequest.abort();
      ExposureStore.clearYellowfinStudyFilterDataRequest();
      ExposureStore.clearYellowfinStudyFilterDataRequestInFlight();
    }

    const url = '/api/studies';
    const newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setYellowfinStudyFilterDataRequest(newRequest);
    newRequest.then(
      function (data) {
        if (data) {
          ExposureStore.setYellowfinStudyDynamicFilterData(data);
          ExposureStore.mapYellowfinSessionFiltersWithDataAccessGroup(data);
          if (callback) callback({ data: data });
        }
        ExposureStore.clearYellowfinStudyFilterDataRequestInFlight();
        ExposureStore.clearYellowfinStudyFilterDataRequest();
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
          GA.sendAjaxException('GET ' + url + ' failed');
          ExposureStore.clearYellowfinStudyFilterDataRequestInFlight();
          ExposureStore.clearYellowfinStudyFilterDataRequest();
          ExposureStore.emitChange();
          console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
          GA.sendAjaxException(`GET ${url} failed`);
        }
      }
    );
  },

  setBuiltinDrilldown(drilldownId, data) {
    _immExposureStore = _immExposureStore.setIn(['builtinDrilldown', drilldownId], data);
    ExposureStore.emitChange();
  },

  builtinDrilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey = '', schemaId, transitionTo) {

    var drilldownKey = Util.generateUUID();
    // 1. Data Selection Filter
    var immCurrentSelectionCondition = _immExposureStore.getIn(['currentSelectionCondition', chartDrilldownKey], Imm.Map());
    // Check if drilldown is happening on the same report as where selection has happened. This is to resolve a bug where in a dashboard, with report A and B,
    // a user can select data points on a report A and drilldown from report B.
    var immSelectionConditionColumn = immCurrentSelectionCondition.get('scc');

    var dataSelected = immSelectionConditionColumn && !immSelectionConditionColumn.isEmpty();
    if (dataSelected) {
      var immDrilldownDataPointFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownDataPointFilters'], Imm.List()).push(immSelectionConditionColumn);
      _immExposureStore = _immExposureStore.setIn(['drilldown', drilldownKey], Imm.Map({
        schemaId,
        drilldownDataPointFilters: immDrilldownDataPointFilters
      }));

      // 2. Included Static & Dynamic Filters
      var immIncludedFilters = this.getImmIncludedFilters(fileId);
      var includedFilterApplied = immIncludedFilters.get('includedStaticFilters') || immIncludedFilters.get('includedDynamicFilters');
      if (includedFilterApplied) {
        var immIncludedStaticFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedStaticFilters'], Imm.List()).concat(immIncludedFilters.get('includedStaticFilters'));
        var immIncludedDynamicFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedDynamicFilters'], Imm.List()).concat(immIncludedFilters.get('includedDynamicFilters'));
        _immExposureStore = _immExposureStore.mergeIn(['drilldown', drilldownKey], Imm.Map({
          drilldownIncludedStaticFilters: immIncludedStaticFilters,
          drilldownIncludedDynamicFilters: immIncludedDynamicFilters
        }));
      }

      _immExposureStore = _immExposureStore.delete('currentSelectionCondition');
      // transitionTto is synchronous, so it is possible to trigger an ExposureAction within an ExposureAction, which is not allowed (https://github.com/reactjs/react-router/issues/950).
      // _.defer allows the current action to finish first.
      _.defer(() => transitionTo({ drilldownId: drilldownKey }));
    } else {
      _.defer(transitionTo);
    }
  },

  setBuiltinBackFilter(fileId, data) {
    _immExposureStore = _immExposureStore.setIn(['builtinBackFilter', fileId], Imm.fromJS(data));
    ExposureStore.emitChange();
  },

  /* CDMDropdownData defines dropdown data of `studyname`, `sitecountry`, `sitename` dropdowns used for Add/Edit Tasks.
   *
   * CDMDropdownData: {
   *   conditions: {
   *     study: {
   *       itemsSelected: [],
   *       nullsExcluded: true,
   *       allSelected: true
   *    },
   *    country: { ...
   *    }
   *  },
   *  data: {
   *    study: [(id, 'A'), (id, 'B'), (id, 'C')],
   *    country: [],
   *    site: []
   *  }
   * }
   */
  setCDMDropdownSelections(fileId, selections) {
    if (_.size(selections) > 1) {
      _.each(selections, (options, field) => {
        _immExposureStore = _immExposureStore.setIn(['CDMDropdownData', 'conditions', field], Imm.fromJS({
          itemsSelected: options,
          nullExcluded: true,
          allSelected: _.size(options) === 0
        }));
      });
    } else {  // Update single selection.
      _.each(selections, (options, field) => {
        if (field === 'siteName') {
          _immExposureStore = _immExposureStore.updateIn(['CDMDropdownData', 'conditions', field], (immCondition) => {
            let immGuardedCondition = immCondition || Imm.fromJS({
              itemsSelected: [],
              nullExcluded: true,
              allSelected: true
            });
            const immCurrentSelections = immGuardedCondition.get('itemsSelected');
            // This is in case there are invalid entries that do not exist in the dropdownData.
            const immSelectionsToKeep = immCurrentSelections.filter(selection => _.contains(options, selection));
            const group = 'siteDropdownData';
            const immNewSelections = _immExposureStore.getIn(['CDMDropdownData', 'data', group], Imm.List()).map(immSelection => immSelection.get("value")).filter(selection => _.contains(options, selection));

            return Imm.fromJS({
              itemsSelected: immSelectionsToKeep.concat(immNewSelections.filter((immSelection) => !immSelectionsToKeep.contains(immSelection))),
              allSelected: _.size(options) === 0
            });
          });
          _immExposureStore = _immExposureStore.updateIn(['CDMDropdownData', 'conditions', 'siteId'], (immCondition) => {
            let immGuardedCondition = immCondition || Imm.fromJS({
              itemsSelected: [],
              nullExcluded: true,
              allSelected: true
            });
            const immCurrentSelections = immGuardedCondition.get('itemsSelected');
            // This is in case there are invalid entries that do not exist in the dropdownData.
            const immSelectionsToKeep = immCurrentSelections.filter(selection => _.contains(options, selection));
            const group = 'siteDropdownData';
            let cdmDDData = _immExposureStore.getIn(['CDMDropdownData', 'data', group], Imm.List()).toJS()
            let dataArray = [];
            cdmDDData.forEach(
              data => {
                options.some(i => i == data.value) ? dataArray.push(data.key) : [];
              }
            );
            const immNewSelections = _immExposureStore.getIn(['CDMDropdownData', 'data', group], Imm.List()).map(immSelection => immSelection.get("key")).filter(selection => _.contains(dataArray, selection));

            return Imm.fromJS({
              itemsSelected: immSelectionsToKeep.concat(immNewSelections.filter((immSelection) => !immSelectionsToKeep.contains(immSelection))),
              allSelected: _.size(options) === 0
            });
          });
        } else {
          _immExposureStore = _immExposureStore.updateIn(['CDMDropdownData', 'conditions', field], (immCondition) => {
            let immGuardedCondition = immCondition || Imm.fromJS({
              itemsSelected: [],
              nullExcluded: true,
              allSelected: true
            });
            const immCurrentSelections = immGuardedCondition.get('itemsSelected');
            // This is in case there are invalid entries that do not exist in the dropdownData.
            const immSelectionsToKeep = immCurrentSelections.filter(selection => _.contains(options, selection));
            const group = (field === 'study') ? 'studyDropdownData' : (field === 'country') ? 'countryDropdownData' : 'siteDropdownData';
            const immNewSelections = _immExposureStore.getIn(['CDMDropdownData', 'data', group], Imm.List()).map(immSelection => immSelection.get("key")).filter(selection => _.contains(options, selection));

            return Imm.fromJS({
              itemsSelected: immSelectionsToKeep.concat(immNewSelections.filter((immSelection) => !immSelectionsToKeep.contains(immSelection))),
              allSelected: _.size(options) === 0
            });
          });
        }
      });
    }

    ExposureStore.fetchCDMDropdownData(fileId);
  },

  fetchCDMDropdownData(fileId) {
    const immDefaultCondition = Imm.Map({
      itemsSelected: [],
      nullExcluded: true,
      allSelected: true
    });

    const immFile = ExposureStore.getFile(fileId);
    if (!immFile || !Util.isCDMFile(_immExposureStore, immFile)) {
      return;
    }

    const schemaId = Util.getComprehendSchemaIdFromFile(immFile);
    const url = '/api/cdm-dropdown-data';
    const data = JSON.stringify({
      schemaId,
      dropdownConditions: [
        _immExposureStore.getIn(['CDMDropdownData', 'conditions', 'study'], immDefaultCondition).toJS(),
        _immExposureStore.getIn(['CDMDropdownData', 'conditions', 'country'], immDefaultCondition).toJS(),
        _immExposureStore.getIn(['CDMDropdownData', 'conditions', 'siteId'], immDefaultCondition).toJS()
      ]
    });

    const newRequest = AppRequest({ type: 'POST', url: url, data: data });
    newRequest.then(data => {
      ExposureStore.setCDMDropdownData(data);
      ExposureStore.emitChange();
    }, (jqXHR) => {
      console.log('%cERROR: GET api/cdm-dropdown-data failed', 'color: #E05353');
      GA.sendAjaxException('GET api/cdm-dropdown-data failed');
    })
  },

  gppDrilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey = '', schemaId, transitionTo) {

    const drilldownKey = Util.generateUUID();
    // 1. Data Selection Filter
    const immCurrentSelectionCondition = _immExposureStore.getIn(['currentSelectionCondition', chartDrilldownKey], Imm.Map());
    // Check if drilldown is happening on the same report as where selection has happened. This is to resolve a bug where in a dashboard, with report A and B,
    // a user can select data points on a report A and drilldown from report B.
    const immSelectionConditionColumn = immCurrentSelectionCondition.get('scc');

    const dataSelected = immSelectionConditionColumn && !immSelectionConditionColumn.isEmpty();
    if (dataSelected) {
      const immDrilldownDataPointFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownDataPointFilters'], Imm.List()).push(immSelectionConditionColumn);
      _immExposureStore = _immExposureStore.setIn(['drilldown', drilldownKey], Imm.Map({
        schemaId,
        drilldownDataPointFilters: immDrilldownDataPointFilters
      }));

      // 2. Included Static & Dynamic Filters
      const immIncludedFilters = this.getImmIncludedFilters(fileId);
      const includedFilterApplied = immIncludedFilters.get('includedStaticFilters') || immIncludedFilters.get('includedDynamicFilters');
      if (includedFilterApplied) {
        const immIncludedStaticFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedStaticFilters'], Imm.List()).concat(immIncludedFilters.get('includedStaticFilters'));
        const immIncludedDynamicFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedDynamicFilters'], Imm.List()).concat(immIncludedFilters.get('includedDynamicFilters'));
        _immExposureStore = _immExposureStore.mergeIn(['drilldown', drilldownKey], Imm.Map({
          drilldownIncludedStaticFilters: immIncludedStaticFilters,
          drilldownIncludedDynamicFilters: immIncludedDynamicFilters
        }));
      }

      _immExposureStore = _immExposureStore.delete('currentSelectionCondition');
      ExposureStore.emitChange()
      // transitionTto is synchronous, so it is possible to trigger an ExposureAction within an ExposureAction, which is not allowed (https://github.com/reactjs/react-router/issues/950).
      // _.defer allows the current action to finish first.
      _.defer(() => transitionTo({ drilldownId: drilldownKey }));
    } else {
      _.defer(transitionTo);
    }
  },

  exportAuditData(auditReport) {
    // Hardcode the file ID to be an empty UUID since this is required info for the export API
    let url = '/api/files/00000000-0000-0000-0000-000000000000/prepare-export/audit';
    let requestData = JSON.stringify({
      auditReportName: auditReport,
      accountId: _immExposureStore.get('currentAccountId')
    });

    // Reuse the same export data request entry in the store, don't see a reason why we should separate these
    const oldRequest = ExposureStore.getExportDataRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    const newRequest = AppRequest({ type: 'POST', url: url, data: requestData });
    ExposureStore.setExportDataRequest(newRequest);
    newRequest.then(
      (downloadId) => {
        Util.downloadFile(`/export/audit/${downloadId}`, auditReport, ExposureAppConstants.DOWNLOAD_TYPE_CSV);
        ExposureStore.clearExportDataRequest();
        ExposureStore.emitChange();
      },
      (jqXHR) => {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          ExposureStore.createStatusMessage(FrontendConstants.CSV_EXPORT_FAILED(auditReport), StatusMessageTypeConstants.WARNING);
          ExposureStore.clearExportDataRequest();
          ExposureStore.emitChange();
        }
      }
    )
  },

  /*
   * Given a fileId, download its data in csv format. This function assumes the
   * fileWrapper exists. The downloadType parameter is provided for future expansion of
   * export file types (i.e. Excel).
   *
   * Report:
   * The downloaded data is respective of all existing selection condition columns
   * specified by embedded, session, dashboard, and other applied filters.
   *
   * Monitor:
   * The downloaded data is the monitor's history including configuration changes, execution results.
   *
   * Data Review Set:
   * The downloaded data is either a summary or detailed view of the data diff given the specified dataDiffRequest
   */
  exportFileData(fileId, drilldownId, downloadType, builtinFilterRequestWrapper, dataDiffRequest, rowLength, csv, immQueryOptionsWrapper) {
    var immFile = ExposureStore.getFile(fileId);
    var url = '/api/files/' + fileId + '/prepare-export?downloadType=' + downloadType;
    var data;
    switch (immFile.get('fileType')) {
      case ExposureAppConstants.FILE_TYPE_REPORT:
        if (!immQueryOptionsWrapper) {
          immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(fileId, drilldownId, /* noPagingOptions */ true, undefined, undefined, rowLength);
        }
        data = JSON.stringify(immQueryOptionsWrapper.toJS());

        break;
      case ExposureAppConstants.FILE_TYPE_MONITOR:
      case ExposureAppConstants.FILE_TYPE_BUILTIN:
        // TODO: Update `prepare-export` to not include `QueryOptionsWrapper` when `fileType` is` MONITOR`
        // or fix proto message serialize list issue.
        data = JSON.stringify({
          drilldownDataPointFilters: [],
          drilldownIncludedStaticFilters: [],
          drilldownIncludedDynamicFilters: [],
          drilldownTaskFilters: [],
          includedDynamicFilters: [],
          sessionStaticFilters: [],
          sessionDynamicFilters: [],
          taskFilters: [],
          pageOrderings: [],
          cqlQueries: []
        });
        break;
      case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
        data = JSON.stringify(dataDiffRequest);
        break;
      default:
        console.log('%cERROR: Cannot export unsupported file.', 'color: #E05353');
        return;
    }

    var oldRequest = ExposureStore.getExportDataRequest();
    if (oldRequest) {
      oldRequest.abort();
    }


    var newRequest = AppRequest({ type: 'POST', url: url, data: data });
    ExposureStore.setExportDataRequest(newRequest);
    newRequest.then(
      function (downloadId) {
        ExposureStore.clearReportDataRequest(fileId);
        Util.downloadFile('/export/' + fileId + '/' + downloadId, immFile.get('title'), downloadType, builtinFilterRequestWrapper, csv);
      },
      function (jqXHR) {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          ExposureStore.clearReportDataRequest(fileId);
          ExposureStore.createStatusMessage(FrontendConstants.CSV_EXPORT_FAILED(immFile.get('title')), StatusMessageTypeConstants.WARNING);
          ExposureStore.emitChange();
        }
      }
    );
    GA.sendDocumentDownload(fileId, downloadType);
  },
  /*
     * Fetch a task and the file it is tied to.
     */
  fetchTask(taskId, isViewOnlyTask) {
    var url = '/api/tasks/' + taskId;
    _immExposureStore = _immExposureStore.set('mediaUrl', null);
    _immExposureStore = _immExposureStore.set('isLoadingTask', true);
    AppRequest({ type: 'GET', url: url }).then(
      function (taskWrapper) {
        ExposureStore.setTaskWrapper(taskId, Imm.fromJS(taskWrapper));
        ExposureStore.setTaskRequestRejectedWith404(taskId, false);
        const fileId = taskWrapper.task.coreTaskAttributes.reportId || taskWrapper.task.coreTaskAttributes.dashboardId ||
          (taskWrapper.task.taskExtraInformation && taskWrapper.task.taskExtraInformation.datareviewId);
        const externalTask = taskWrapper.task.extendedTaskAttributes && taskWrapper.task.extendedTaskAttributes.fromYellowfinReport;

        // (1) Task is associated to a file: we reset filters when opening the task.
        // (2) Task is **not** associated to a file: we do not reset any filter.
        // Note - We only do this for tasks associated with V2 analytics.
        if (fileId && !externalTask && !isViewOnlyTask) {
          if (!!taskWrapper.task.coreTaskAttributes.reportId || !!taskWrapper.task.coreTaskAttributes.dashboardId) {
            _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates'], Imm.List());
            ExposureStore.setFileTaskFiltersSCCS(fileId, Imm.fromJS(taskWrapper.task.taskFilters));
          } else {
            ExposureStore.setMedTaskFilters(fileId, taskWrapper.task.extendedTaskAttributes.medTaskFilters);
          }
          if (Util.anySessionFiltersActive(_immExposureStore.get('currentAccountId'))) {
            CookieActions.resetAllSessionDynamicFilters(_immExposureStore.get('currentAccountId'));
            ExposureStore.createStatusMessage(FrontendConstants.FILTER_HAS_BEEN_REPLACED_BY_TASK_FILTERS, StatusMessageTypeConstants.TOAST_INFO);
          }
          ExposureStore.fetchFile(fileId, { drilldownId: null }, {
            fetchData: true,
            setCurrentDashboard: true,
            firstRender: true
          });
          // When taskFilter is not null, open the filters pane.
          if (!_.isEmpty(taskWrapper.task.taskFilters)) {
            _immExposureStore = _immExposureStore.set('showFiltersPane', true);
          }

          if(taskWrapper?.task?.taskContext?.extraInformation) {
            try {
              let filters = JSON.parse(taskWrapper.task.taskContext.extraInformation).contextFilters;
              _immExposureStore = _immExposureStore.set('fetchedTaskFilters', filters == "null" ? "[]" : filters);
              _immExposureStore = _immExposureStore.set('isViewTasks', true);
              ExposureStore.emitChange();
            } catch (e) {
              console.log(`ERROR: Error in setting task filters: ${e}`);
            }
          }

          if(taskWrapper?.task?.taskContext?.filters) {
            let studyId = [];
            let selectedTab = '';
            taskWrapper.task.taskContext.filters.forEach(item => {
              if(item.key == 'studyId') {
                studyId = item.value;
              }
              if(item.key == 'tabId') {
                selectedTab = item.value[0];
              }
            });
            
            _immExposureStore = _immExposureStore.set('taskStudy', studyId);
            _immExposureStore = _immExposureStore.set('selectedTab', selectedTab);
            ExposureStore.emitChange();
          }
        }

        const clinicalColumnDetails = taskWrapper.taskConfig.taskAttributes.clinicalAttributes.map(attribute => {
          let clinicalSelectedValues = taskWrapper.task.clinicalTaskAttribute.filter((attr) => {
            return attr.attributeName === attribute.fieldId 
          })

          if(clinicalSelectedValues && clinicalSelectedValues.length) {
            return {
              column: attribute.clinicalDbDetail.column,
              values: clinicalSelectedValues[0].attributeValues && clinicalSelectedValues[0].attributeValues.length > 0 ? clinicalSelectedValues[0].attributeValues : []
            }
          } else {
            return {
              column: attribute.clinicalDbDetail.column,
              values: []
            }
          }
        });

        ExposureStore.fetchClinicalAttributesV2(clinicalColumnDetails, taskId)

        // Since 'lastViewed' will now change, we can potentially clear a notification.
        if(taskWrapper.task.snpshtId){
          ExposureStore.getTaskScreenshot(taskWrapper.task.snpshtId)
        } else {
          _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        }
        ExposureStore.fetchNotifications();
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        ExposureStore.setTaskRequestRejectedWith404(taskId, true);
        ExposureStore.emitChange();
        console.log('%cERROR: GET api/tasks/' + taskId + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET api/tasks/' + taskId + ' failed');
      }
    )
  },

  fetchTaskTypes() {
    const url = '/api/task-types';

    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        const taskStateNameMap = _.chain(data.idNameList)
          .map(taskState => [taskState.id, taskState])
          .object()
          .mapObject(taskState => ({
            name: taskState.name,
            taskStates: _.chain(taskState.taskStates).map(({ id, name }) => [id, name]).object().value(),
            actionTypes: _.chain(taskState.actionTypes).map(({ id, name }) => [id, name]).object().value()
          }))
          .value();

        _immExposureStore = _immExposureStore.set('taskTypes', Imm.fromJS(data.currentTaskTypes.taskTypes)).set('taskStateNameMap', Imm.fromJS(taskStateNameMap));
      },
      function () {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`%cERROR: GET ${url} failed`);
      }
    );
  },

  fetchTaskMetadata(callback, clinicalFilters) {
    const url = '/api/task-metadata';
    _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', true);
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        const taskMetadata = data;
        if (taskMetadata.taskAttributes.clinicalAttributes.length != 0) {
          let clinicalDBDetailsList = [];
          taskMetadata.taskAttributes.clinicalAttributes.map(clinicalAttr => {
            if (clinicalAttr.clinicalDbDetail && clinicalAttr.clinicalDbDetail.column) {
              const clinicalDbDetail = clinicalAttr.clinicalDbDetail
              clinicalDbDetail.column = `${clinicalDbDetail.datasource}.${clinicalDbDetail.table}.${clinicalDbDetail.column}`;
              clinicalAttr.clinicalDbDetail.values = [];
              clinicalAttr.clinicalDbDetail.operator = "=";
              if (clinicalAttr.dependOnAttributes.length !== 0) {
                clinicalAttr.dependOnAttributes.map(dependOnAttribute => {
                  const dependentObj = taskMetadata.taskAttributes.clinicalAttributes.find(attribute => attribute.fieldId === dependOnAttribute);
                  clinicalAttr.clinicalDbDetail.dependOnAttributes.push({ name: dependentObj.clinicalDbDetail.column, dataType: dependentObj.clinicalDbDetail.dataType, values: [], operator: "=" })
                })
              }
              clinicalDBDetailsList.push(clinicalAttr.clinicalDbDetail);
            }
          })
          const screenshotCapture = taskMetadata.taskAttributes.genericTasksAttributes.captureScreenshot;
          callback(screenshotCapture);
          if(taskMetadata?.taskAttributes?.clinicalAttributes) {
            let clinicalColumnMap = _immExposureStore.get('clinicalColumnMap').toJS();
            let clinicalAttributes = taskMetadata?.taskAttributes?.clinicalAttributes
            if(clinicalAttributes && clinicalAttributes.length) {
              let columnDataObj = clinicalAttributes.map((clinicalAttr) =>{
                return {
                  column: clinicalAttr.clinicalDbDetail.column,
                  values: clinicalFilters[clinicalColumnMap[clinicalAttr.clinicalDbDetail.column]]
                }
              })
              _immExposureStore = _immExposureStore.set('taskMetadata', Imm.fromJS(taskMetadata));
              ExposureStore.fetchClinicalAttributesV2(columnDataObj);
            }
          }
          _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
        } else {
          _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
          _immExposureStore = _immExposureStore.set('taskMetadata', Imm.fromJS(taskMetadata));
        }
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`%cERROR: GET ${url} failed`);
      }
    );
  },

  fetchClinicalAttributesV2(columnDataObj, currentTaskId) {
    let requestData = {
      "schema": "CQS",
      "datasource": "cqs",
      "columns": columnDataObj
    }
    const url = '/api/collaboration/tasks/clinical-data';
    AppRequest({ type: 'POST', url: url, data: JSON.stringify(requestData) }).then(
      function (columnData) {
        if(!currentTaskId){
          let clinicalAttributes = _immExposureStore.getIn(['taskMetadata', 'taskAttributes', 'clinicalAttributes'], Imm.List()).toJS();
          clinicalAttributes = clinicalAttributes.map((clinicalAttr)=>{
            let fieldValues = columnData.filter((columnDt)=>{
              return clinicalAttr.clinicalDbDetail.column === columnDt.column
            })
            if(fieldValues && fieldValues.length) {
              clinicalAttr.fieldValues = fieldValues[0].resultData
            }
            else {
              clinicalAttr.fieldValues = [];
            }
            return clinicalAttr;
          })
          _immExposureStore = _immExposureStore.setIn(['taskMetadata', 'taskAttributes', 'clinicalAttributes'], Imm.fromJS(clinicalAttributes));
        } else {
          let clinicalAttributes =  _immExposureStore.getIn(['tasks', currentTaskId, 'taskConfig', 'taskAttributes', 'clinicalAttributes'], Imm.List()).toJS()
          clinicalAttributes = clinicalAttributes.map((clinicalAttr)=>{
            let fieldValues = columnData.filter((columnDt)=>{
              return clinicalAttr.clinicalDbDetail.column === columnDt.column
            })
            if(fieldValues && fieldValues.length) {
              clinicalAttr.fieldValues = fieldValues[0].resultData
            }
            else {
              clinicalAttr.fieldValues = [];
            }
            return clinicalAttr;
          })
          _immExposureStore = _immExposureStore.setIn(['tasks', currentTaskId, 'taskConfig', 'taskAttributes', 'clinicalAttributes'], Imm.fromJS(clinicalAttributes));
        }
        ExposureStore.emitChange();
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
        console.log(`%cERROR: POST ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`POST ${url} failed`);
      }
    );
  },

  fetchClinicalAttributes(clinicalDBDetailsList, taskMetadata) {
    const url = '/api/column-data';
    AppRequest({ type: 'POST', url: url, data: JSON.stringify(clinicalDBDetailsList) }).then(
      function (columnData) {
        _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
        if (taskMetadata) {
          _.each(taskMetadata.taskAttributes.clinicalAttributes, function (clinicalAttr) {
            const matchingColumn = _.find(columnData, (data) => clinicalAttr.clinicalDbDetail && clinicalAttr.clinicalDbDetail.column === data.clinicalDbDetail.column);
            clinicalAttr.fieldValues = matchingColumn ? matchingColumn.resultData : clinicalAttr.fieldValues;
          });
          taskMetadata.taskAttributes = Util.getSortedTaskMetadata(taskMetadata.taskAttributes);
          _immExposureStore = _immExposureStore.set('taskMetadata', Imm.fromJS(taskMetadata));
          ExposureStore.emitChange();
        } else {
          _immExposureStore = _immExposureStore.set('clinicalAttributesDropdownData', Imm.fromJS(columnData));
          ExposureStore.emitChange();
        }
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTaskTypes', false);
        console.log(`%cERROR: POST ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`POST ${url} failed`);
      }
    );
  },

  fetchTaskSummaries() {
    var oldRequest = ExposureStore.getTaskSummariesRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    var url = '/api/task-summaries';
    var newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setTaskSummariesRequest(newRequest);

    newRequest.then(
      function (taskSummaries) {
        ExposureStore.clearTaskSummariesRequest(newRequest);
        var taskSummaryKvps = Imm.fromJS(taskSummaries).map(function (ts) {
          return [ts.get('id'), ts];
        });
        ExposureStore.setTaskSummaries(Imm.Map(taskSummaryKvps));
        ExposureStore.emitChange();
      },
      function () {
        ExposureStore.clearTaskSummariesRequest(newRequest);
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
  },

  showTaskDetails(showOrHide) {
    ExposureStore.setShowTaskDetail(showOrHide)
  },

  /*
   * Fetch all tasks with a query and if fetchFiles is set to true, also fetch files that tasks are tied to.
   */
  fetchTasksWithParameters(fetchFiles, params) {
    var url = '/api/tasks/paginated';
    var oldRequest = ExposureStore.getTasksRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    var newRequest = AppRequest({ type: 'POST', url: url,
      data: JSON.stringify(params) 
    });
    ExposureStore.setTasksRequest(newRequest);
    ExposureStore.setTaskTableLoading(true)

    newRequest.then(
      function (data) {
        ExposureStore.clearTasksRequest();
        let sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
        if (!('collaboration' in sessionFilters)) {
          sessionFilters['collaboration'] = true
          CookieStore.setSessionFilters(sessionFilters, _immExposureStore.get('currentAccountId'));
        }
        setObject('collaboration-navigation', JSON.stringify(params))
        ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        var immTaskWrappers = Imm.fromJS(data.data);
        immTaskWrappers.forEach(function (immTasksWrapper) {
          var taskId = immTasksWrapper.get('id');
          // Because the response immTasksWrapper doesn't fill out observerIds, we shouldn't override existing observerIds with those.
          ExposureStore.setTask(taskId, immTasksWrapper);
          let taskUserMetadataObj = {}
          taskUserMetadataObj['accountId'] = immTasksWrapper.get('accountId')
          taskUserMetadataObj['userId'] = Util.getUserInfo()['id']
          taskUserMetadataObj['taskId'] = taskId
          const isStarred = immTasksWrapper.getIn(['isStarred'])
          if (isStarred === 'false') {
            taskUserMetadataObj['isStarred'] = false
          } else {
            taskUserMetadataObj['isStarred'] = true
          }
          ExposureStore.setTaskMetadata(taskId, Imm.fromJS(taskUserMetadataObj));
        });
        ExposureStore.emitChange();
        var immTaskIds = immTaskWrappers.map(function (immTaskWrapper) {
          return immTaskWrapper.get('id');
        })
        immTaskIds = immTaskIds.filter((v, i, a) => a.indexOf(v) === i)
        _immExposureStore = _immExposureStore.mergeIn(['tasksView'], {
          begin: data.begin,
          taskIds: immTaskIds,
          isEmpty: immTaskIds.isEmpty()
        });

        if (fetchFiles) {
          var fileIds = immTaskWrappers.map(function (immTaskWrapper) {
            var fileId = immTaskWrapper.getIn(['reportId']) || immTaskWrapper.getIn(['dashboardId']);
            // no need to fetch already loaded file because we expect this call only at the beginning.
            if (fileId && !ExposureStore.getFile(fileId)) {
              return fileId;
            }
            return null;
          }).filter(function (value) {
            return value;
          }).toSet().toJS();

          // fetchFiles will return all files when fileIds is empty.
          if (!_.isEmpty(fileIds)) {
            ExposureStore.fetchFiles(fileIds);
          }
        }
        ExposureStore.tasksViewSetTotalRows(data.totalTasks);
        ExposureStore.setTaskTableLoading(false)
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        ExposureStore.clearTasksRequest();
        ExposureStore.emitChange();
        ExposureStore.setTaskTableLoading(false)
      }
    )
  },

  /*
   * Fetch all tasks with a query and if fetchFiles is set to true, also fetch files that tasks are tied to.
   */
  fetchClosedTasksWithParameters(fetchFiles, params) {
    let newQueryParams = JSON.parse(JSON.stringify(params));
    newQueryParams['taskStateFilter'] = 'CLOSED,CANCELLED'

    ExposureStore.setCloseTaskTableLoading(true)

    var url = '/api/tasks/paginated';

    var newRequest = AppRequest({ type: 'POST', url: url, data: JSON.stringify(newQueryParams)  });

    newRequest.then(
      function (data) {
        ExposureStore.clearClosedTasksRequest();
        ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        var immTaskWrappers = Imm.fromJS(data.data);
        immTaskWrappers.forEach(function (immTasksWrapper) {
          var taskId = immTasksWrapper.getIn(['id']);
          // Because the response immTasksWrapper doesn't fill out observerIds, we shouldn't override existing observerIds with those.
          ExposureStore.setClosedTask(taskId, immTasksWrapper);
          let taskUserMetadataObj = {}
          taskUserMetadataObj['accountId'] = immTasksWrapper.get('accountId')
          taskUserMetadataObj['userId'] = Util.getUserInfo()['id']
          taskUserMetadataObj['taskId'] = taskId
          const isStarred = immTasksWrapper.getIn(['isStarred'])
          if (isStarred === 'false') {
            taskUserMetadataObj['isStarred'] = false
          } else {
            taskUserMetadataObj['isStarred'] = true
          }
          ExposureStore.setClosedTaskMetadata(taskId, Imm.fromJS(taskUserMetadataObj));
        });
        var immTaskIds = immTaskWrappers.map(function (immTaskWrapper) {
          return immTaskWrapper.getIn(['id']);
        });
        immTaskIds = immTaskIds.filter((v, i, a) => a.indexOf(v) === i)
        _immExposureStore = _immExposureStore.mergeIn(['closedTasksView'], {
          begin: data.begin,
          taskIds: immTaskIds,
          isEmpty: immTaskIds.isEmpty()
        });

        ExposureStore.setCloseTaskTableLoading(false)
        if (fetchFiles) {
          var fileIds = immTaskWrappers.map(function (immTaskWrapper) {
            var fileId = immTaskWrapper.getIn(['reportId']) || immTaskWrapper.getIn(['dashboardId']);
            // no need to fetch already loaded file because we expect this call only at the beginning.
            if (fileId && !ExposureStore.getFile(fileId)) {
              return fileId;
            }
            return null;
          }).filter(function (value) {
            return value;
          }).toSet().toJS();

          // fetchFiles will return all files when fileIds is empty.
          if (!_.isEmpty(fileIds)) {
            ExposureStore.fetchFiles(fileIds);
          }
        }
        ExposureStore.closedTasksViewSetTotalRows(data.totalTasks);
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            ExposureStore.tasksViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        ExposureStore.clearClosedTasksRequest();
        ExposureStore.emitChange();
        ExposureStore.setCloseTaskTableLoading(false)
      }
    )
  },

  fetchTasksApplicationsCount(parameters) {
    const url = `/api/tasks/count`;
    var oldRequest = ExposureStore.getTasksCountRequest();
    if (oldRequest) {
      oldRequest.abort();
    }
    _immExposureStore = _immExposureStore.set('appsSelected', Imm.fromJS(parameters['appName'].map(e => {
     if(e['isChecked']===true)
      return e['name']
    })));
    ExposureStore.setLoadingTaskCount(true)
    var newRequest = AppRequest({ type: 'POST', url: url, data: JSON.stringify(parameters) });
    ExposureStore.setTasksCountRequest(newRequest);
    newRequest.then(
      (data) => {
        ExposureStore.clearTasksCountRequest();
        if (parameters['appName']) {
          data["appsSelected"] = parameters['appName'].map(e => {
            if(e['isChecked']===true)
            return e['name']
          })
        }
        _immExposureStore = _immExposureStore.set('tasksSummary', Imm.fromJS(data));
        ExposureStore.setLoadingTaskCount(false);
        ExposureStore.setRelationFilterChange(false);
        ExposureStore.emitChange();
      },
      function () {
        ExposureStore.clearTasksCountRequest();
        ExposureStore.setLoadingTaskCount(false);
        ExposureStore.setRelationFilterChange(false);
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  },

  /**
   * Fetches the available data review filter options for the specified data review file ID
   * @param fileId - the data review file ID
   */
  fetchDataReviewFilterOptions(fileId) {
    const url = `/api/data-review/${fileId}/filter-data`;
    AppRequest({ type: 'GET', url: url }).then(
      (data) => {
        ExposureStore.clearDataReviewFilterOptions();
        ExposureStore.clearDataReviewFilterRequestInFlight();
        ExposureStore.setDataReviewFilterOptions(data);
        ExposureStore.setDataReviewFilterRequestInFlight(false);
        ExposureStore.emitChange();
      },
      (jqXHR) => {
        switch (jqXHR.status) {
          case HttpStatus.BAD_REQUEST:
            ExposureStore.createStatusMessage(jqXHR.responseJSON.message,
              StatusMessageTypeConstants.TOAST_ERROR);
            break;
          case HttpStatus.INTERNAL_SERVER_ERROR:
            ExposureActions.createStatusMessage(FrontendConstants.FAILED_TO_GET_FILTER_DATA_FROM_SERVER,
              StatusMessageTypeConstants.TOAST_ERROR);
        }
        console.log($`%cERROR: GET ${url} failed', 'color: #E053531`);
        GA.sendAjaxException(`GET ${url} failed`);
        ExposureStore.clearDataReviewFilterOptions();
        ExposureStore.clearDataReviewFilterRequestInFlight();
        ExposureStore.setDataReviewFilterOptions({});
        ExposureStore.setDataReviewFilterRequestInFlight(false);
        ExposureStore.emitChange();
      }
    );

    ExposureStore.setDataReviewFilterRequestInFlight(true);
  },

  /**
   * Fetches the available data review filter options for the specified data review file ID
   * @param fileId - the data review file ID
   */
  fetchDataReviewSummaryFilterOptions() {
    const url = `/api/data-review/data-review-summary-filter-data`;

    AppRequest({ type: 'GET', url: url }).then(
      (data) => {
        ExposureStore.clearDataReviewFilterOptions();
        ExposureStore.clearDataReviewFilterRequestInFlight();
        ExposureStore.setDataReviewFilterOptions(data);
        ExposureStore.setDataReviewFilterRequestInFlight(false);
        ExposureStore.emitChange();
      },
      (jqXHR) => {
        switch (jqXHR.status) {
          case HttpStatus.BAD_REQUEST:
            ExposureStore.createStatusMessage(jqXHR.responseJSON.message,
              StatusMessageTypeConstants.TOAST_ERROR);
            break;
          case HttpStatus.INTERNAL_SERVER_ERROR:
            ExposureActions.createStatusMessage(FrontendConstants.FAILED_TO_GET_FILTER_DATA_FROM_SERVER,
              StatusMessageTypeConstants.TOAST_ERROR);
        }
        console.log($`%cERROR: GET ${url} failed', 'color: #E053531`);
        GA.sendAjaxException(`GET ${url} failed`);
        ExposureStore.clearDataReviewFilterOptions();
        ExposureStore.clearDataReviewFilterRequestInFlight();
        ExposureStore.setDataReviewFilterOptions({});
        ExposureStore.setDataReviewFilterRequestInFlight(false);
        ExposureStore.emitChange();
      }
    );

    ExposureStore.setDataReviewFilterRequestInFlight(true);
  },

  setQualityAgreementFetchInFlight(flag) {
    _immExposureStore = _immExposureStore.set('qualityAgreementFetchInFlight', flag);
  },
  isQualityAgreementFetchInFlight() {
    _immExposureStore.get('qualityAgreementFetchInFlight', false);
  },
  clearQualityAgreementFetchInFlight() {
    _immExposureStore.delete('qualityAgreementFetchInFlight');
  },
  fetchQualityAgreements(callback) {
    if (ExposureStore.isQualityAgreementFetchInFlight()) {
      return;
    }
    const url = '/api/quality-agreements';

    const oldRequest = ExposureStore.getQualityAgreementsRequest();
    if (oldRequest) {
      oldRequest.abort();
    }
    const newRequest = AppRequest({ type: 'GET', url: url });
    ExposureStore.setQualityAgreementsRequest(newRequest);
    ExposureStore.setQualityAgreementFetchInFlight(true);
    newRequest.then(
      data => {
        _immExposureStore = _immExposureStore.set('qualityAgreements', Imm.fromJS(data));
        ExposureStore.clearQualityAgreementFetchInFlight();
        ExposureStore.emitChange();
        if (callback) callback({ data: Imm.fromJS(data) });
      },
      () => {
        console.log($`%cERROR: GET ${url} failed', 'color: #E053531`);
        GA.sendAjaxException(`PUT ${url} failed`);
        ExposureStore.clearQualityAgreementFetchInFlight();
        ExposureStore.emitChange();
        if (callback) callback({ errorMsg: "GET ${url} failed" });
      }
    )
  },

  updateFiles(filesIds, filesList, callback, confirmSharingImpact = false) {
    let filesUpdateRequests = [];
    const safeCallback = Util.getGuardedCallback(callback);
    const url = '/api/files' + '?confirmSharingImpact=' + confirmSharingImpact.toString();

    ExposureStore._abortOldRequests(filesIds);

    _immExposureStore = _immExposureStore.set('isLoadingFile', true);

    filesList.forEach(immFile => {
      const data = JSON.stringify(immFile);
      const newRequest = AppRequest({ type: 'PUT', url, data });

      ExposureStore.setUpdateFileRequest(immFile.get('id'), newRequest);
      filesUpdateRequests.push(newRequest);
    });

    Promise.all(filesUpdateRequests)
      .then(
        data => {
          ExposureStore._clearUpdateFilesRequests(filesIds);
          filesList.forEach(file => {
            const fileId = file.id;
            ExposureStore.setFileWrapper(
              fileId,
              ExposureStore.getFileWrapper(fileId).set('file', Imm.fromJS(file))
            );
          });

          safeCallback(data);
          _immExposureStore = _immExposureStore.set('isLoadingFile', false);
          ExposureStore.emitChange();
        },
        (jqXHR) => {
          _immExposureStore = _immExposureStore.set('isLoadingFile', false);
          switch (jqXHR.status) {
            case HttpStatus.BAD_REQUEST:
              switch (jqXHR.responseJSON.message) {
                case HttpResponseConstants.BAD_REQUEST.FAILED_CONFIRMATION_SHARING_IMPACT:
                  ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
                    header: FrontendConstants.ARE_YOU_SURE,
                    handleCancel: ExposureActions.closeModal,
                    closingContent: {
                      text: [FrontendConstants.MOVE_IMPACT_SHARING],
                      emphasisText: FrontendConstants.PLEASE_CONFIRM_MOVE
                    },
                    primaryButton: {
                      text: FrontendConstants.MOVE,
                      icon: 'icon-move',
                      onClick: function () {
                        ExposureStore.updateFiles(filesIds, filesList, safeCallback, true);
                      }
                    },
                    secondaryButton: { text: FrontendConstants.CANCEL, onClick: ExposureActions.closeModal }
                  });
                  ExposureStore._abortOldRequests(filesIds);
                  ExposureStore.emitChange();
                  return;
                default:
                  ExposureStore.createStatusMessage(
                    FrontendConstants.UPDATE_FILES_UNSUCCESSFUL,
                    StatusMessageTypeConstants.TOAST_ERROR
                  );
              }
            case HttpStatus.FORBIDDEN:
              ExposureStore.displayInsufficientPermissionsModal();
              break;
            default:
              ExposureStore.createStatusMessage(
                FrontendConstants.UPDATE_FILES_UNSUCCESSFUL,
                StatusMessageTypeConstants.TOAST_ERROR
              );
          }

          console.log('%cERROR: PUT api/files failed', 'color: #E05353');
          GA.sendAjaxException('PUT api/files failed');
          ExposureStore.emitChange();
        });
  },

  updateFile(fileId, immFile, callback, confirmSharingImpact = false) {
    var url = '/api/files' + '?confirmSharingImpact=' + confirmSharingImpact.toString();
    var data = JSON.stringify(immFile.toJS());
    var oldRequest = ExposureStore.getUpdateFileRequest(fileId);
    if (oldRequest) {
      oldRequest.abort();
    }
    var safeCallback = Util.getGuardedCallback(callback);
    var newRequest = AppRequest({ type: 'PUT', url: url, data: data });
    _immExposureStore = _immExposureStore.set('isLoadingFile', true);
    ExposureStore.setUpdateFileRequest(fileId, newRequest);
    newRequest.then(
      function (data) {
        ExposureStore.clearUpdateFileRequest(fileId);
        ExposureStore.setFileWrapper(fileId, ExposureStore.getFileWrapper(fileId).set('file', Imm.fromJS(data)));
        safeCallback(data);
        _immExposureStore = _immExposureStore.set('isLoadingFile', false);
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        _immExposureStore = _immExposureStore.set('isLoadingFile', false);
        switch (jqXHR.status) {
          case HttpStatus.BAD_REQUEST:
            switch (jqXHR.responseJSON.message) {
              case HttpResponseConstants.BAD_REQUEST.FAILED_DUPLICATE_FOLDER:
                safeCallback({ errorMsg: ExposureAppConstants.RENAME_FOLDER_DUPLICATE });
                break;
              default:
                switch (immFile.get('fileType')) {
                  case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
                    callback(jqXHR);
                    break;
                  case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
                    const errorMessage = jqXHR.responseJSON.message;
                    ExposureStore.createStatusMessage(errorMessage, StatusMessageTypeConstants.TOAST_ERROR);
                    break;
                  default:
                    ExposureStore.createStatusMessage(FrontendConstants.UPDATE_FILE_UNSUCCESSFUL(immFile.get('fileType').toLowerCase()), StatusMessageTypeConstants.TOAST_ERROR);
                }
            }
            break;
          case HttpStatus.FORBIDDEN:
            ExposureStore.displayInsufficientPermissionsModal();
            break;
          default:
            ExposureStore.createStatusMessage(FrontendConstants.UPDATE_FILE_UNSUCCESSFUL(immFile.get('fileType').toLowerCase()), StatusMessageTypeConstants.TOAST_ERROR);
        }
        console.log('%cERROR: PUT api/files failed', 'color: #E05353');
        GA.sendAjaxException('PUT api/files failed');
        ExposureStore.clearUpdateFileRequest(fileId);
        ExposureStore.emitChange();
      }
    )
  },

  /*
   * Create a file in the backend. Notice this function should be allowed with
   * multiple outstanding AppRequests.
   */
  createFile(immFile, callback, forceEmit) {
    var url = '/api/files';
    var data = JSON.stringify(immFile.toJS());
    _immExposureStore = _immExposureStore.set('isLoadingFile', true);
    AppRequest({ type: 'POST', url: url, data: data }).then(
      function (data) {
        callback(data);
        _immExposureStore = _immExposureStore.set('isLoadingFile', false);
        // Band-aid for IE9 tests since new style reports need to emit here.
        if (forceEmit) {
          ExposureStore.emitChange();
        }
      },
      function (jqXHR) {
        _immExposureStore = _immExposureStore.set('isLoadingFile', false);
        if (jqXHR.status === HttpStatus.BAD_REQUEST && jqXHR.responseJSON.message === HttpResponseConstants.BAD_REQUEST.FAILED_DUPLICATE_FOLDER) {
          callback({ errorMsg: ExposureAppConstants.CREATE_FOLDER_DUPLICATE });
        } else {
          switch (immFile.get('fileType')) {
            case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
              callback(jqXHR);
              break;
            case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
              const errorMessage = jqXHR.responseJSON.message;
              ExposureStore.createStatusMessage(errorMessage, StatusMessageTypeConstants.TOAST_ERROR);
              break;
            default:
              ExposureStore.createStatusMessage(FrontendConstants.CREATE_FILE_UNSUCCESSFUL(immFile.get('fileType').toLowerCase()), StatusMessageTypeConstants.TOAST_ERROR);
              break;
          }
          ExposureStore.emitChange();
        }
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
      }
    );
    ExposureStore.emitChange();
  },

  createFolder(pageSettings) {
    // Force the status to be CREATE_FOLDER_VALID initially as the empty string should have the status of CREATE_FOLDER_EMPTY.
    _immExposureStore = _immExposureStore.setIn(['createFolder', 'status'], ExposureAppConstants.CREATE_FOLDER_VALID);
    ExposureStore.displayModal(ModalConstants.MODAL_CREATE_FOLDER, {
      createFolderStatus: _immExposureStore.getIn(['createFolder', 'status']),
      handleUpdateTitle(e) {
        _immExposureStore = _immExposureStore.setIn(['createFolder', 'title'], e.target.value.trim());
      },
      // We only validate the title when the user hit 'Add' button.
      // This can be changed to validate on the fly for better UX in the future.
      handleCreateFolder() {
        GA.sendDocumentCreate(GA.DOCUMENT_TYPE.FOLDER);
        var title = _immExposureStore.getIn(['createFolder', 'title']);
        if (Util.isWhiteSpaceOnly(title)) {
          GA.sendDocumentCreate(GA.DOCUMENT_TYPE.FOLDER, ExposureAppConstants.CREATE_FOLDER_EMPTY);
          _immExposureStore = _immExposureStore.setIn(['createFolder', 'status'], ExposureAppConstants.CREATE_FOLDER_EMPTY);
          ExposureStore.updateModal({ createFolderStatus: ExposureAppConstants.CREATE_FOLDER_EMPTY });
          ExposureStore.emitChange();
        } else {
          // Create a file with `title` and `fileType`; `folderId` is omitted as we can only create folder on landing page.
          var immFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_FOLDER).set('title', title);
          ExposureStore.createFile(immFile, function (params) {
            if (params.errorMsg === ExposureAppConstants.CREATE_FOLDER_DUPLICATE) {
              GA.sendDocumentCreate(GA.DOCUMENT_TYPE.FOLDER, ExposureAppConstants.CREATE_FOLDER_DUPLICATE);
              _immExposureStore = _immExposureStore.setIn(['createFolder', 'status'], ExposureAppConstants.CREATE_FOLDER_DUPLICATE);
              ExposureStore.updateModal({ createFolderStatus: ExposureAppConstants.CREATE_FOLDER_DUPLICATE });
              ExposureStore.emitChange();
            } else {
              ExposureStore.fetchFolderWithParameters(ExposureAppConstants.REPORTS_LANDING_PAGE_ID, pageSettings);
              ExposureStore.createStatusMessage('Folder ' + _immExposureStore.getIn(['createFolder', 'title']) + ' has been created.', StatusMessageTypeConstants.TOAST_SUCCESS);
              ExposureStore.closeModal();
            }
          }, false);  // Do not force emit since the supplied callback calls emitChange.
        }
      },
      handleCancel: ExposureActions.closeModal
    });
  },

  renameFolder(fileId, pageSettings) {
    ExposureStore.displayModal(ModalConstants.MODAL_RENAME_FOLDER, {
      renameFolderStatus: ExposureAppConstants.RENAME_FOLDER_VALID,
      handleRenameFolder() {
        GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.FOLDER, 'TITLE');
        var title = _immExposureStore.getIn(['renameFolder', 'title']);
        if (Util.isWhiteSpaceOnly(title)) {
          GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.FOLDER, 'TITLE', ExposureAppConstants.RENAME_FOLDER_EMPTY);
          ExposureStore.updateModal({ renameFolderStatus: ExposureAppConstants.RENAME_FOLDER_EMPTY });
          ExposureStore.emitChange();
        } else if (!Util.isValidTitle(title)) {
          GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.FOLDER, 'TITLE', ExposureAppConstants.RENAME_FOLDER_INVALID);
          ExposureStore.updateModal({ renameFolderStatus: ExposureAppConstants.RENAME_FOLDER_INVALID });
          ExposureStore.emitChange();
        } else {
          var immFile = ExposureStore.getFile(fileId).set('title', title);
          var parentFolderId = immFile.get('folderId') || ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
          if (immFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
            immFile = immFile.delete('folderId');
          }
          ExposureActions.updateFile(fileId, immFile, function (params) {
            if (params.errorMsg === ExposureAppConstants.RENAME_FOLDER_DUPLICATE) {
              GA.sendDocumentEdit(fileId, GA.DOCUMENT_TYPE.FOLDER, 'TITLE', ExposureAppConstants.RENAME_FOLDER_DUPLICATE);
              ExposureStore.updateModal({ renameFolderStatus: ExposureAppConstants.RENAME_FOLDER_DUPLICATE });
            } else {
              ExposureStore.fetchFolderWithParameters(parentFolderId, pageSettings);
              ExposureStore.createStatusMessage(FrontendConstants.FOLDER_TITLE_UPDATED_TO(title), StatusMessageTypeConstants.TOAST_SUCCESS);
              ExposureStore.closeModal();
            }
            ExposureStore.emitChange();
          }, false);
        }
      },
      handleUpdateTitle(e) {
        _immExposureStore = _immExposureStore.setIn(['renameFolder', 'title'], e.target.value.trim());
      },
      handleCancel: ExposureActions.closeModal
    });
  },

  setItemIsStarred(itemId, type, isStarred, hit_task_count) {
    var oldRequest = ExposureStore.favoritesViewGetRequestInFlight(itemId);
    if (oldRequest) {
      oldRequest.abort();
    }
    var url = '/api/' + type.toLowerCase() + '-user-metadata/' + itemId;
    url += '?' + $.param({ favorite: isStarred });
    var newRequest = AppRequest({ type: 'PUT', url: url });
    ExposureStore.favoritesViewSetRequestInFlight(itemId, newRequest);
    newRequest.then(
      function () {
        ExposureStore.favoritesViewClearRequestInFlight(itemId);
        if (hit_task_count) {
          const collabNav = getObject('collaboration-navigation')
          ExposureStore.fetchTasksApplicationsCount(JSON.parse(collabNav))
        }
      },
      function () {
        ExposureStore.favoritesViewClearRequestInFlight(itemId);
        GA.sendAjaxException('PUT ' + url + ' failed');
      }
    );
  },

  /**************** End AJAX calls ****************/

  folderViewUpdateCheckedFileIds(rowIndex, checked) {
    var fileId = ExposureStore.folderViewGetFileIds().get(rowIndex);
    if (checked) {
      ExposureStore.folderViewSetCheckedFileIds(ExposureStore.folderViewGetCheckedFileIds().add(fileId));
    } else {
      ExposureStore.folderViewSetCheckedFileIds(ExposureStore.folderViewGetCheckedFileIds().delete(fileId));
    }
  },

  folderViewUpdateColumnOption(colName, checked) {
    _immExposureStore = _immExposureStore.setIn(['folderView', 'displayedColumns', colName], checked);
  },

  folderViewUpdateIsStarred(rowIndex, isStarred) {
    var fileId = ExposureStore.folderViewGetFileIds().get(rowIndex);
    var immMetadata = ExposureStore.getFileMetadata(fileId);
    ExposureStore.setFileMetadata(fileId, immMetadata.set('isStarred', isStarred));
    ExposureStore.setItemIsStarred(fileId, 'file', isStarred, false);
  },

  favoritesViewUpdateCheckedItemIds(rowIndex, checked) {
    var itemId = ExposureStore.favoritesViewGetItemIds().get(rowIndex);
    if (checked) {
      ExposureStore.favoritesViewSetCheckedItemIds(ExposureStore.favoritesViewGetCheckedItemIds().add(itemId));
    } else {
      ExposureStore.favoritesViewSetCheckedItemIds(ExposureStore.favoritesViewGetCheckedItemIds().delete(itemId));
    }
  },

  favoritesViewUpdateColumnOption(colName, checked) {
    _immExposureStore = _immExposureStore.setIn(['favoritesView', 'displayedColumns', colName], checked);
  },

  openListFilterPane() {
    _immExposureStore = _immExposureStore.set('showListFilterPane', true);
  },

  getTaskScreenshot(snpshtId){
    var url = '/api/collaboration/media/' + snpshtId;
    AppRequest({type: 'GET', url: url}).then(
      function (screenshotMediaFile) {
        _immExposureStore = _immExposureStore.set('mediaUrl', screenshotMediaFile.mediaUrl);
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        ExposureStore.emitChange();
      })
  },

  taskScreenshotSubmit(saveTaskObject) {
    _immExposureStore = _immExposureStore.set('isLoadingTask', true);
    var url = '/api/collaboration/media'
        var settings = {
          url: url,
          "method": "PUT",
          "timeout": 0,
          "processData": false,
          "mimeType": "multipart/form-data",
          "contentType": false,
          "data": saveTaskObject.snpsht,
          "headers": { 'Csrf-Token': window.csrfToken },
        };
        
      $.ajax(settings).then(
      (data) =>{
        let snpshtId = JSON.parse(data).id;
        saveTaskObject.result= saveTaskObject.result.setIn(['task','snpshtId'], snpshtId);
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        ExposureStore.taskViewSubmitTask(saveTaskObject.result, saveTaskObject.drilldownId, saveTaskObject.transitionTo, saveTaskObject.addTaskSuccessCallback)
      },
      (jqXHR) =>{
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        var errorStatusMsg = jqXHR.status === HttpStatus.BAD_REQUEST ? jqXHR.responseJSON.message : FrontendConstants.FAILED_CREATE_TASK;
        ExposureStore.createStatusMessage(errorStatusMsg, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
        console.log('%cERROR: PUT api/media failed', 'color: #E05353');
        GA.sendAjaxException('PUT api/media failed');
      }
    );
  },

  getTaskList(taskRelationship, sortBy, orderBy, begin, length, context) {
    _immExposureStore = _immExposureStore.set('isTaskListLoading', true);
    const url = '/api/collaboration/tasks/list';
    const newRequest = AppRequest({
      type: 'POST', url: url,
      data: JSON.stringify({
        relationshipFilter: taskRelationship,
        sortBy: sortBy,
        orderBy: orderBy,
        filters: context.filters,
        begin: begin,
        length: length,
      }),
    });
    newRequest.then(
      (data) => {
        _immExposureStore = _immExposureStore.set('apitasklist', data.data);
        _immExposureStore = _immExposureStore.set('totalTasks', data.totalTasks);
        _immExposureStore = _immExposureStore.set('isTaskListLoading', false);
        ExposureStore.emitChange();
      },
      jqXHR => {
        _immExposureStore = _immExposureStore.set('isTaskListLoading', false);
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_GET_TASKLIST,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
      }
    );
  },

  /**************** Begin task store API ****************/

  taskViewSubmitTask(immWorkingTaskWrapper, drilldownId, transitionTo, callback) {
    const reportId = immWorkingTaskWrapper.getIn(['task', 'coreTaskAttributes', 'reportId']);
    const dashboardId = immWorkingTaskWrapper.getIn(['task', 'coreTaskAttributes', 'dashboardId']);
    const datareviewId = immWorkingTaskWrapper.getIn(['task', 'taskExtraInformation', 'datareviewId']);
    var url = '/api/tasks';
    _immExposureStore = _immExposureStore.set('isLoadingTask', true);

    // When the task is associated with a report, add taskFilters.
    if (!_.isNull(reportId || dashboardId)) {
      immWorkingTaskWrapper = immWorkingTaskWrapper.setIn(['task', 'taskFilters'], ExposureStore.getFileSCCs(reportId || dashboardId));
    } else if (!_.isNull(datareviewId)) {
      immWorkingTaskWrapper = immWorkingTaskWrapper.setIn(['task', 'taskExtraInformation', 'datareviewId'], datareviewId);
      immWorkingTaskWrapper = immWorkingTaskWrapper.setIn(['task', 'extendedTaskAttributes', 'medTaskFilters'], JSON.stringify(_immExposureStore.getIn(['files', datareviewId, 'immMedFilterSelection'])));
    }

    AppRequest({ type: 'POST', url: url, data: JSON.stringify(immWorkingTaskWrapper) }).then(
      function (taskWrapper) {
        var taskId = taskWrapper.task.id;
        const fromYellowfinReport = taskWrapper.task.extendedTaskAttributes.fromYellowfinReport;
        ExposureStore.setTask(taskId, Imm.fromJS(taskWrapper.task));

        ExposureStore.createStatusMessage(FrontendConstants.YOU_HAVE_ADDED_A_TASK, StatusMessageTypeConstants.TOAST_SUCCESS);
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        ExposureStore.fetchTaskSummaries();
        ExposureStore.fetchNotifications();
        callback();
      },
      function (jqXHR) {
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        var errorStatusMsg = jqXHR.status === HttpStatus.BAD_REQUEST ? jqXHR.responseJSON.message : FrontendConstants.FAILED_CREATE_TASK;
        ExposureStore.createStatusMessage(errorStatusMsg, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
        console.log('%cERROR: POST api/tasks failed', 'color: #E05353');
        GA.sendAjaxException('POST api/tasks failed');
      }
    );
  },

  taskViewUpdateTask(immWorkingTaskWrapper, isObserverOnly, transitionToCollaboration) {
    var taskId = immWorkingTaskWrapper.getIn(['task', 'id']);
    let clinicalAttributes = immWorkingTaskWrapper.getIn(['taskConfig', 'taskAttributes', 'clinicalAttributes'], Imm.List()).toJS();
    clinicalAttributes = clinicalAttributes.map((clinicalAttr) => {
      clinicalAttr.fieldValues = [];
      return clinicalAttr;
    });
    immWorkingTaskWrapper = immWorkingTaskWrapper.setIn(['taskConfig', 'taskAttributes', 'clinicalAttributes'], Imm.fromJS(clinicalAttributes))
    var url = '/api/tasks/' + taskId;
    var type = 'PUT';
    // This is an observer case. An Observer is only allowed to submit comments.
    if (isObserverOnly) {
      url += '/comments';
      type = 'POST';
    }
    _immExposureStore = _immExposureStore.set('isLoadingTask', true);
    _.each(GA.GAHelper.extractTaskWrapperEditOperations(ExposureStore.getTaskWrapper(taskId).toJS(), immWorkingTaskWrapper.toJS()), function (editOperation) {
      GA.sendDocumentEdit(taskId, GA.DOCUMENT_TYPE.TASK, editOperation);
    });
    AppRequest({ type: type, url: url, data: JSON.stringify(immWorkingTaskWrapper) }).then(
      function (taskWrapper) {
        ExposureStore.createStatusMessage(FrontendConstants.YOU_HAVE_UPDATED_A_TASK, StatusMessageTypeConstants.TOAST_SUCCESS);
        // Sets the taskWrapper so the updates will show up.
        ExposureStore.setTaskWrapper(taskId, Imm.fromJS(taskWrapper));
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        ExposureStore.emitChange();
        ExposureStore.fetchTaskSummaries();
        transitionToCollaboration();
      },
      function (jqXHR) {
        _immExposureStore = _immExposureStore.set('isLoadingTask', false);
        var errorStatusMsg = jqXHR.status === HttpStatus.BAD_REQUEST ? jqXHR.responseJSON.message : FrontendConstants.FAIL_UPDATE_TASK;
        ExposureStore.createStatusMessage(errorStatusMsg, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
        var errorMessage = type + ' ' + url + ' failed';
        console.log('%cERROR: ' + errorMessage, 'color: #E05353');
        GA.sendAjaxException(errorMessage);
      }
    );
  },

  /**************** End task store API ****************/

  /**************** Begin tabular report store API ****************/

  tabularReportGetRowsPerPage(reportId) {
    var immTabularReportState = ExposureStore.getTabularReportState(reportId);
    var pageLowerLimit = immTabularReportState.get('pageLowerLimit');
    var pageUpperLimit = immTabularReportState.get('pageUpperLimit');
    return pageUpperLimit - pageLowerLimit + 1;
  },

  tabularReportGetTotalRows(reportId) {
    return ExposureStore.getReportData(reportId).getIn([0, 'totalRows']);
  },

  tabularReportSetRowsPerPage(reportId, drilldownId, rowsPerPage) {
    var immTabularReportState = ExposureStore.getTabularReportState(reportId);
    var immNewTabularReportState = immTabularReportState.merge({
      pageLowerLimit: 0,
      pageUpperLimit: rowsPerPage - 1
    });
    ExposureStore.setTabularReportState(reportId, immNewTabularReportState);
    ExposureStore.fetchReportData(reportId, drilldownId);
  },

  tabularReportGoToPage(reportId, drilldownId, pageNumber) {
    var immTabularReportState = ExposureStore.getTabularReportState(reportId);
    var pageLowerLimit = immTabularReportState.get('pageLowerLimit');
    var rowsPerPage = Util.isMobile() ? ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE :
      ExposureStore.tabularReportGetRowsPerPage(reportId);
    var totalRows = ExposureStore.tabularReportGetTotalRows(reportId);

    var curPageNumber = pageLowerLimit / rowsPerPage + 1;
    var maxPageNumber = Math.floor((totalRows + rowsPerPage - 1) / rowsPerPage);
    if (1 <= pageNumber && pageNumber <= maxPageNumber && pageNumber !== curPageNumber) {
      ExposureStore.setTabularReportPage(reportId, pageNumber, rowsPerPage);
      ExposureStore.fetchReportData(reportId, drilldownId);
    }
  },

  tabularReportSetColumnSort(reportId, drilldownId, colIndex, sortIndex) {
    var immTabularReportState = ExposureStore.getTabularReportState(reportId);
    var immQuery = ExposureStore.getTabularReportQuery(reportId);
    // TODO: We currently support only single column sorts. This logic needs to be updated when we support multi-column sorts.
    var immNewOrderings = Imm.List();
    if (sortIndex !== 2) {
      var queryOrdering = [ListViewConstants.ORDER_ASCENDING_STR, ListViewConstants.ORDER_DESCENDING_STR][sortIndex];
      immNewOrderings = Imm.List([Imm.Map({ column: immQuery.getIn(['columns', colIndex]), ordering: queryOrdering })]);
    }
    ExposureStore.setTabularReportState(reportId, immTabularReportState.set('pageOrderings', immNewOrderings));
    ExposureStore.fetchReportData(reportId, drilldownId);
  },

  /**************** End tabular report store API ****************/

  /**************** Start mobile back nav API ****************/
  clearBackNavActionStack() {
    _immExposureStore = _immExposureStore.set('backNavActionStack', Imm.List());
  },

  pushBackNavAction(backNavAction) {
    _immExposureStore = _immExposureStore.update('backNavActionStack', function (immBackNavActionStack) {
      return immBackNavActionStack.push(backNavAction);
    });
  },

  popBackNavAction() {
    var backAction = _immExposureStore.get('backNavActionStack').last().get('backAction');
    _immExposureStore = _immExposureStore.update('backNavActionStack', function (immBackNavActionStack) {
      return immBackNavActionStack.pop();
    });
    // We need to defer since the backAction will call other ExposureActions.
    _.defer(backAction);
  },
  /**************** End mobile back nav API ****************/


  /**************** Start Template API ***************/
  // Create a new template on the back-end.
  templateCreate(immTemplate, postAction) {
    var url = '/api/templates';
    _immExposureStore = _immExposureStore.set('isLoadingTemplate', true);
    AppRequest({ type: 'POST', url: url, data: JSON.stringify(immTemplate.toJS()) }).then(
      function (data) {
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        var immTemplate = Imm.fromJS(data);
        _immExposureStore = _immExposureStore.setIn(['templates', data.id], immTemplate);
        ExposureStore.createStatusMessage(FrontendConstants.CREATE_TEMPLATE_SUCCESSFUL, StatusMessageTypeConstants.STATUS);
        postAction(immTemplate);
        ExposureStore.emitChange();
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
        ExposureStore.createStatusMessage(FrontendConstants.CREATE_TEMPLATE_UNSUCCESSFUL, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
      }
    );
  },

  // Update an already existing template on the back-end.
  // TODO: If this function remains this similar to templateCreate when the real
  // template UI is created then they should be combined.
  templateUpdate(immTemplate, postAction) {
    var url = '/api/templates/' + immTemplate.get('id');
    _immExposureStore = _immExposureStore.set('isLoadingTemplate', true);
    AppRequest({ type: 'PUT', url: url, data: JSON.stringify(immTemplate.toJS()) }).then(
      function (data) {
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        var immTemplate = Imm.fromJS(data);
        _immExposureStore = _immExposureStore.setIn(['templates', data.id], immTemplate);
        ExposureStore.createStatusMessage(FrontendConstants.EDIT_TEMPLATE_SUCCESSFUL, StatusMessageTypeConstants.STATUS);
        postAction(immTemplate);
        ExposureStore.emitChange();
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        console.log('%cERROR: PUT ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('PUT ' + url + ' failed');
        ExposureStore.createStatusMessage(FrontendConstants.EDIT_TEMPLATE_UNSUCCESSFUL, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
      }
    );
  },

  // Delete the supplied list of templates. User will be prompted to confirm the
  // deletion.
  templatesDelete(templateIds, confirmed) {
    if (_.isEmpty(templateIds)) {
      return;
    }

    templateIds = _.uniq(templateIds);
    if (confirmed) {
      var url = '/api/templates';
      AppRequest({ type: 'DELETE', url: url, data: JSON.stringify(templateIds) }).then(
        function () {
          ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
            header: FrontendConstants.SUCCESS,
            icon: 'icon-checkmark-full',
            content: templateIds.length + ' ' + Util.singularOrPlural(templateIds.length, FrontendConstants.TEMPLATES_DELETED),
            handleCancel: ExposureActions.closeModal
          });
          ExposureStore.templatesViewResetCheckedTemplateIds();
          ExposureStore.templatesFetch();
        },
        function () {
          ExposureStore.displayFailToDeleteFilesModal();
          console.log('%cERROR: DELETE ' + url + ' of template ' + JSON.stringify(templateIds) + ' failed', 'color: #E05353');
          GA.sendAjaxException('DELETE ' + url + ' of templates ' + JSON.stringify(templateIds) + ' failed');
          ExposureStore.emitChange();
        }
      );
    } else {
      ExposureStore.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
        header: FrontendConstants.ARE_YOU_SURE,
        handleCancel: ExposureActions.closeModal,
        closingContent: {
          text: [FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE],
          emphasisText: FrontendConstants.PLEASE_CONFIRM_DELETE
        },
        primaryButton: {
          text: FrontendConstants.DELETE,
          icon: 'icon-remove',
          onClick() {
            ExposureActions.closeModal();
            ExposureStore.templatesDelete(templateIds, true)
          }
        },
        secondaryButton: { text: FrontendConstants.CANCEL, onClick: ExposureActions.closeModal }
      });
    }
  },

  // Fetch all templates that the user/account has access to. Must be re-run
  // after each account change to keep an accurate list.
  templatesFetch() {
    var url = '/api/templates';

    _immExposureStore = _immExposureStore.set('isLoadingTemplate', true);
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        var immNewTemplates = Imm.Map({});
        var immTemplateIdList = Imm.List();

        _.forEach(data, function (template) {
          var immTemplate = Imm.fromJS(template);
          immNewTemplates = immNewTemplates.set(template.id, immTemplate);
        });
        immNewTemplates.mapKeys(function (key) {
          immTemplateIdList = immTemplateIdList.push(key);
        });
        _immExposureStore = _immExposureStore.mergeIn(['templatesView'], {
          templateIds: immTemplateIdList
        });
        _immExposureStore = _immExposureStore.set('templates', immNewTemplates);
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        ExposureStore.emitChange();
      },
      function () {
        _immExposureStore = _immExposureStore.set('isLoadingTemplate', false);
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET api/templates failed');
      }
    );
  },

  templatesViewGetCheckedTemplateIds() {
    return _immExposureStore.getIn(['templatesView', 'checkedTemplateIds']);
  },

  templatesViewGetTemplateIds() {
    return _immExposureStore.getIn(['templatesView', 'templateIds']);
  },

  templatesViewResetCheckedTemplateIds() {
    _immExposureStore = _immExposureStore.setIn(['templatesView', 'checkedTemplateIds'], Imm.Set());
  },

  templatesViewSetCheckedTemplateIds(immCheckedTemplateIds) {
    _immExposureStore = _immExposureStore.setIn(['templatesView', 'checkedTemplateIds'], immCheckedTemplateIds);
  },

  templatesViewSetColumnOption(columnName, checked) {
    _immExposureStore = _immExposureStore.setIn(['templatesView', 'displayedColumns', columnName], checked);
  },

  templatesViewUpdateCheckedTemplateIds(rowIndex, checked) {
    var templateId = ExposureStore.templatesViewGetTemplateIds().get(rowIndex);
    if (checked) {
      ExposureStore.templatesViewSetCheckedTemplateIds(ExposureStore.templatesViewGetCheckedTemplateIds().add(templateId));
    } else {
      ExposureStore.templatesViewSetCheckedTemplateIds(ExposureStore.templatesViewGetCheckedTemplateIds().delete(templateId));
    }
  },

  /**************** End Template API *************/

  // If the report is a tabular report, change back to the first page. Similarly, tabular reports
  // in dashboards must change back to the first page.
  // `fetchFilterDataStartIndex` represents an index of the filter among session dynamic filters and included dynamic filters to start fetching filter data from.
  async applyFilter(fileId, drilldownId, fetchFilterDataStartIndex, fetchReportData = true) {
    // Set startRenderTime so that we can measure the report render time inside
    // the component. This is due to a filter change which will refetch filter
    // data, report data, and finally update the dashboard/report. We set the
    // startRenderTime globally because it is extremely convenient. We can clean
    // up this global at another time.

    const oldCSCData = ExposureStore.getCSCFetchController();
    if (oldCSCData) {
      ExposureStore.clearSelectedFilter(null);
    }

    const presetData = ExposureStore.getPreSetList();
    if (presetData) {
      ExposureStore.clearPresetFilter(null);
    }
    const preStudyFilters = ExposureStore.getSessionFilterController();
    if(preStudyFilters.length > 0){
      ExposureStore.setWidgetSessionStore([])
    }

    const oldLazyRequest = ExposureStore.getFetchController();

    if (oldLazyRequest?.toJS().length && fetchReportData) {
      await oldLazyRequest.map(obj => obj.abort());
      ExposureStore.setFetchController('reset');
    }

    delete window.comprehend.startRenderTime;
    window.comprehend.startRenderTime = new Date();

    var immFile = ExposureStore.getFile(fileId);
    if (immFile !== undefined) {
      switch (immFile.get('fileType')) {
        case ExposureAppConstants.FILE_TYPE_REPORT: {
          const reportType = immFile.getIn(['reportConfig', 'reportType']);
          if (reportType === ExposureAppConstants.REPORT_TYPE_TABULAR) {
            var rowsPerPage = Util.isMobile() ? ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE :
              ExposureStore.tabularReportGetRowsPerPage(fileId);
            ExposureStore.setTabularReportPage(fileId, 1, rowsPerPage);
          }
          ExposureStore.fetchFilterData(fileId, drilldownId, fetchFilterDataStartIndex, false, fetchReportData ? () => ExposureStore.fetchReportData(fileId, drilldownId) : null);
          break;
        }
        case ExposureAppConstants.FILE_TYPE_DASHBOARD: {
          immFile.get('reportIds').forEach((reportId) => {
            const config = ExposureStore.getReportConfig(reportId);
            if (config && config.get('reportType') === ExposureAppConstants.REPORT_TYPE_TABULAR) {
              var rowsPerPage = Util.isMobile() ? ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE :
                ExposureStore.tabularReportGetRowsPerPage(reportId);
              ExposureStore.setTabularReportPage(reportId, 1, rowsPerPage);
            }
          });
          ExposureStore.fetchFilterData(fileId, drilldownId, fetchFilterDataStartIndex, false, fetchReportData ? () => {
            immFile.get('reportIds').forEach((reportId) => {
              ExposureStore.fetchReportData(reportId, drilldownId);
            });
          } : null);
        }
      }
    } else if (window.location.href.includes('/bot')) {
      ExposureStore._setMsfChange(Util.getStudyId(_immExposureStore));
    }
  },

  clearFileFilterState(fileId) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates'], Imm.List());
    ExposureStore.clearFileTaskFiltersSCCS(fileId)
    ExposureStore.selectedModuleOption(true);
  },

  setDataFilterSelection(fileId, immDataFilterSelection) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'immDataFilterSelection'], immDataFilterSelection);
  },

  clearDataFilterSelection(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'immDataFilterSelection']);
  },

  setMedTaskFilters(fileId, immMedTaskFilters) {
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'immMedTaskFilters'], immMedTaskFilters);
  },

  clearDataTaskFilters(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId, 'immMedTaskFilters']);
  },

  setTaskInformationTemp(immWorkingTaskWrapperTemp) {
    _immExposureStore = _immExposureStore.set('immWorkingTaskWrapperTemp', immWorkingTaskWrapperTemp);
  },

  clearTaskInformationTemp() {
    _immExposureStore = _immExposureStore.delete('immWorkingTaskWrapperTemp');
  },

  getTaskAssignableUsers(studyIds, callBack) {
    const url = '/api/tasks/assignable-users';
    const newRequest = AppRequest({
      type: 'POST',
      url: url,
      data: JSON.stringify({
        studyIds: studyIds,
      }),
    });
    newRequest.then(
      function (data) {
        const immUsers = Imm.fromJS(data);
        callBack(immUsers)
      },
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException(`POST ${url} failed`);
      }
    );
  },


  // A function to handle all updates to an applied filter.
  // `data` is used only for the cases DROPDOWN_TOGGLE_VALUE and SLIDER_UPDATE_FILTER_BOUNDS.
  // It should always be an object containing the appropriate data for the specific case.
  updateIncludedDynamicFilter(fileId, drilldownId, filterIndex, updateType, data) {
    const immOriginalFilter = ExposureStore.getFilterStates(fileId).get(filterIndex);
    switch (updateType) {
      case FilterUpdateTypes.DROPDOWN_SELECT_ALL_VALUES:
        ExposureStore.selectAllFilterValues(fileId, filterIndex);
        break;
      case FilterUpdateTypes.DROPDOWN_SET_VALUES:
        ExposureStore.setDropdownFilterSelection(fileId, filterIndex, data);
        break;
      case FilterUpdateTypes.DROPDOWN_ADD_VALUE:
        ExposureStore.addDropdownFilterSelection(fileId, filterIndex, data.value);
        break;
      case FilterUpdateTypes.LIST_REMOVE_VALUE:
        ExposureStore.removeDropdownFilterSelection(fileId, filterIndex, data.value);
        break;
      case FilterUpdateTypes.RESET_FILTER:
        ExposureStore.resetIncludedDynamicFilter(fileId, filterIndex);
        break;
      case FilterUpdateTypes.SLIDER_UPDATE_FILTER_BOUNDS:
        ExposureStore.setSliderFilterBounds(fileId, filterIndex, [data.lowerBound, data.upperBound]);
        break;
      case FilterUpdateTypes.TOGGLE_NULL:
        ExposureStore.toggleNullFilter(fileId, filterIndex);
        break;
    }

    // Don't do anything if the filter didn't change.
    const immUpdatedFilter = ExposureStore.getFilterStates(fileId).get(filterIndex);
    if (Imm.is(immOriginalFilter, immUpdatedFilter)) {
      return;
    }
    const sessionDynamicFiltersCount = Util.getSessionDynamicFiltersCount(CookieStore.getCookies());
    // We add 1 here to `filterIndex + sessionDynamicFiltersCount` because when modifying ith dynamic filter, we do not need to refetch its filter data.
    ExposureStore.applyFilter(fileId, drilldownId, filterIndex + sessionDynamicFiltersCount + 1, false);
  },

  // Resets all included dynamic filters.
  resetAllIncludedDynamicFilters(fileId, drilldownId) {
    ExposureStore.getFilterStates(fileId).forEach(function (immFilter, filterIndex) {
      ExposureStore.resetIncludedDynamicFilter(fileId, filterIndex);
    });
    ExposureStore.applyFilter(fileId, drilldownId);
  },

  // When the user clicks on the related file while some data points are selected, we create a new drilldown selection condition list.
  // The new drilldown selection condition list consists of current drilldown selection condition and current selection condition.
  // Included filters will be included as selection conditions in drilldown only when some data points are selected.
  drilldownHandleRelatedFile(fileId, drilldownId, chartDrilldownKey = '', schemaId, transitionTo, openInNewTab = false) {
    var drilldownKey = Util.generateUUID();
    // 1. Data Selection Filter
    var immCurrentSelectionCondition = _immExposureStore.getIn(['currentSelectionCondition', chartDrilldownKey], Imm.Map());
    // Check if drilldown is happening on the same report as where selection has happened. This is to resolve a bug where in a dashboard, with report A and B,
    // a user can select data points on a report A and drilldown from report B.
    var isSameFile = fileId === immCurrentSelectionCondition.get('fileId');
    var immSelectionConditionColumn = immCurrentSelectionCondition.get('scc');

    var dataSelected = immSelectionConditionColumn && !immSelectionConditionColumn.isEmpty();
    if (isSameFile && dataSelected) {
      var immDrilldownDataPointFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownDataPointFilters'], Imm.List()).push(immSelectionConditionColumn);
      _immExposureStore = _immExposureStore.setIn(['drilldown', drilldownKey], Imm.Map({
        schemaId,
        drilldownDataPointFilters: immDrilldownDataPointFilters
      }));

      // 2. Included Static & Dynamic Filters
      var immIncludedFilters = this.getImmIncludedFilters(fileId);
      var includedFilterApplied = immIncludedFilters.get('includedStaticFilters') || immIncludedFilters.get('includedDynamicFilters');
      if (includedFilterApplied) {
        var immIncludedStaticFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedStaticFilters'], Imm.List()).concat(immIncludedFilters.get('includedStaticFilters'));
        var immIncludedDynamicFilters = _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownIncludedDynamicFilters'], Imm.List()).concat(immIncludedFilters.get('includedDynamicFilters'));
        _immExposureStore = _immExposureStore.mergeIn(['drilldown', drilldownKey], Imm.Map({
          drilldownIncludedStaticFilters: immIncludedStaticFilters,
          drilldownIncludedDynamicFilters: immIncludedDynamicFilters
        }));
      }

      // 3. Task Filters
      // When viewing a task and its associated file, taskFilter denotes the task.taskFilter.
      var taskFilter = ExposureStore.getFileTaskFiltersSCCS(fileId);
      // immDrilldownTaskFilters is passed as part of the drilldown when viewing a file that is not associated with a task,
      // but previous taskFilters are carried as part of the drilldown.
      var immDrilldownTaskFilters = taskFilter ? taskFilter : _immExposureStore.getIn(['drilldown', drilldownId, 'drilldownTaskFilters'], Imm.List());
      _immExposureStore = _immExposureStore.mergeIn(['drilldown', drilldownKey], Imm.Map({ drilldownTaskFilters: immDrilldownTaskFilters }));

      _immExposureStore = _immExposureStore.delete('currentSelectionCondition');
      // transitionTto is synchronous, so it is possible to trigger an ExposureAction within an ExposureAction, which is not allowed (https://github.com/reactjs/react-router/issues/950).
      // _.defer allows the current action to finish first.

      const openInTab = (url, drilldownKey) => {
        let windowElement = window;

        let drillDownParams = { [drilldownKey]: _immExposureStore?.toJS()?.drilldown[drilldownKey] };

        windowElement.params = {
          drillDownParams: drillDownParams,
          drilldownKey: drilldownKey
        };

        windowElement.open(url + drilldownKey, '_blank').focus();
      }

      if (openInNewTab) {
        _.defer(() => openInTab(transitionTo, drilldownKey))
      }
      else {
        _.defer(() => transitionTo({ drilldownId: drilldownKey }));
      }
    } else {
      _.defer(transitionTo);
    }
  },

  // This converts a list of highchart drilldown elements to a selection condition and set it to the store.
  drilldownUpdateCurrentSelectionCondition(fileId, chartDrilldownKey = '', drilldownElements) {
    if (_.isEmpty(fileId) || _.isEmpty(drilldownElements)) {
      _immExposureStore = _immExposureStore.delete('currentSelectionCondition');
    } else {
      var scc = _.reduce(drilldownElements, function (drilldownElement1, drilldownElement2) {
        return QueryUtils.constructOrSelectionCondition(drilldownElement1, drilldownElement2);
      });
      _immExposureStore = _immExposureStore.setIn(['currentSelectionCondition', chartDrilldownKey], Imm.fromJS({
        fileId,
        scc
      }));
    }
  },

  // Delete a file entry to force it to be re-downloaded on the next access.
  deleteFileEntry(fileId) {
    _immExposureStore = _immExposureStore.deleteIn(['files', fileId]);
  },

  // Used for clean-up in DashboardStudio.
  deleteFileStates(fileIds) {
    _.each(fileIds, ExposureStore.deleteFileState);
  },

  /**
   * Used for studio workflows for file types that share a concept of linked reports. Currently this is limited to -
   *    Dashboards
   *    Data Review Sets
   * @param fileId (UUID String) - The file ID for the report
   * @param enter (Boolean) - Whether we are entering the activity or leaving
   */
  transitionLinkedReportsStudio(fileId, enter) {
    ExposureStore.setDisableSessionFilters(enter);
    if (enter && fileId) {
      ExposureStore.fetchFile(fileId, null, { fetchData: true });
    }
  },


  transitionDataReviewStudio(fileId, enter) {
    transitionLinkedReportsStudio(fileId, enter);
  },

  clearDrilldown(fileId, drilldownId) {
    _immExposureStore = _immExposureStore.mergeIn(['drilldown', drilldownId], Imm.fromJS({
      drilldownDataPointFilters: [],
      drilldownIncludedStaticFilters: [],
      drilldownIncludedDynamicFilters: [],
      drilldownTaskFilters: []
    }));
    ExposureStore.clearDrilldownFilterDisplayStrings();
    ExposureStore.clearFileTaskFiltersSCCS(fileId);
    ExposureStore.createStatusMessage(FrontendConstants.YOU_HAVE_CLEARED_ALL_DRILLDOWN_AND_OR_TASK_FILTERS, StatusMessageTypeConstants.TOAST_SUCCESS);
    ExposureStore.applyFilter(fileId, drilldownId);
  },

  // This function contains logic for switching between a dashboard page, a report page, or any other type of page.
  transitionFile(currentFileId, nextFileId, nextDrilldownId) {
    if (!_.isEmpty(currentFileId)) {
      var immCurrentFile = ExposureStore.getFile(currentFileId);
      if (immCurrentFile) {
        switch (immCurrentFile.get('fileType')) {
          case ExposureAppConstants.FILE_TYPE_DASHBOARD:
            immCurrentFile.get('reportIds', Imm.List()).forEach(ExposureStore.deleteFileState);
          // Allow fall-through.
          case ExposureAppConstants.FILE_TYPE_REPORT:
            ExposureStore.deleteFileState(currentFileId);
            break;
        }
      }
    }
    if (_.isEmpty(nextFileId)) {
      ExposureStore.setCurrentDashboardId(null);
    } else {
      ExposureStore.fetchFile(nextFileId, { drilldownId: nextDrilldownId }, {
        fetchData: true,
        setCurrentDashboard: true,
        firstRender: true
      });
    }
  },

  transitionTo(path) {
    window.location.assign('/' + path);
  },

  tasksViewUpdateCheckedTaskIds(rowIndex, checked) {
    var taskId = ExposureStore.tasksViewGetTaskIds().get(rowIndex);
    if (checked) {
      ExposureStore.tasksViewSetCheckedTaskIds(ExposureStore.tasksViewGetCheckedTaskIds().add(taskId));
    } else {
      ExposureStore.tasksViewSetCheckedTaskIds(ExposureStore.tasksViewGetCheckedTaskIds().delete(taskId));
    }
  },

  tasksViewUpdateColumnOption(columnName, checked) {
    ExposureStore.tasksViewSetColumnOption(columnName, checked);
  },

  tasksViewUpdateIsStarred(rowIndex, isStarred) {
    // var taskId = ExposureStore.tasksViewGetTaskIds().get(rowIndex);
    var taskId = rowIndex;
    var immMetadata = ExposureStore.getTaskMetadata(taskId);
    ExposureStore.setTaskMetadata(taskId, immMetadata.set('isStarred', isStarred));
    ExposureStore.setItemIsStarred(taskId, 'task', isStarred, true);
  },

  toggleFiltersPane(visible) {
    if (visible === undefined) {
      visible = !_immExposureStore.get('showFiltersPane');
    }
    _immExposureStore = _immExposureStore.set('showFiltersPane', visible);
  },

  toggleMobileNavMenu(clearBackNavActionStack) {
    if (clearBackNavActionStack) {
      ExposureStore.clearBackNavActionStack();
    }

    _immExposureStore = _immExposureStore.set('showMobileNavMenu', !_immExposureStore.get('showMobileNavMenu'));
    if (_immExposureStore.get('showMobileNavMenu')) {
      _immExposureStore = _immExposureStore.set('showNotificationsDropdown', false);
    }
  },

  toggleNotificationsDropdown() {
    _immExposureStore = _immExposureStore.set('showNotificationsDropdown', !_immExposureStore.get('showNotificationsDropdown'));
    if (_immExposureStore.get('showNotificationsDropdown')) {
      _immExposureStore = _immExposureStore.set('showMobileNavMenu', false);
    }
  },

  toggleListFilterPane() {
    _immExposureStore = _immExposureStore.set('showListFilterPane', !_immExposureStore.get('showListFilterPane'));
  },

  setComprehendSchemaOverview(comprehendSchemaId, immDatasources) {
    _immExposureStore = _immExposureStore.setIn(['comprehendSchemaOverviews', comprehendSchemaId], immDatasources);
  },

  setComprehendSchemaOverviewTable(comprehendSchemaId, datasourceName, nodeShortName, immTable) {
    _immExposureStore = _immExposureStore.setIn(['comprehendSchemaOverviews', comprehendSchemaId, datasourceName, nodeShortName], immTable);
  },

  setCurrentDashboardId(dashboardId) {
    _immExposureStore = _immExposureStore.set('currentDashboardId', dashboardId);
  },

  /**
   * Used to signal to the store that we are in an activity which should disable session filters.
   * @param disableSessionFilters: Boolean - whether we should disable the session filters currently
   */
  setDisableSessionFilters(disableSessionFilters) {
    _immExposureStore = _immExposureStore.set('disableSessionFilters', disableSessionFilters);
  },

  setShowMobileTabularReportDetails(isOpen) {
    _immExposureStore = _immExposureStore.set('showMobileTabularReportDetails', isOpen);
  },

  // Close both the warning modal and any other open modal.
  discardModalChanges() {
    _immExposureStore = _immExposureStore.merge({ displayWarningModal: false });
    _immExposureStore = _immExposureStore.delete('modalContent');
  },

  closeModal() {
    _immExposureStore = _immExposureStore.delete('modalContent');
  },

  closeStatusMessage(id) {
    _immExposureStore = _immExposureStore.update('statusMessageList', function (immList) {
      return immList.filterNot(function (immStatusMessage) {
        return immStatusMessage.get('id') === id;
      });
    });
  },

  createStatusMessage(text, type) {
    var id = (new Date()).getTime() + '' + Math.random();
    _immExposureStore = _immExposureStore.update('statusMessageList', function (immList) {
      return immList.push(Imm.Map({ id: id, text: text, type: type }));
    });
  },

  createStatusMessageWithCustomTimeout(text, type, toastTimeout) {
    var id = (new Date()).getTime() + '' + Math.random();
    _immExposureStore = _immExposureStore.update('statusMessageList', function (immList) {
      return immList.push(Imm.Map({ id: id, text: text, type: type, toastTimeout: toastTimeout }));
    });
  },

  toggleDisplayWarningModal(props, forceHide) {
    _immExposureStore = _immExposureStore.set('displayWarningModal', _immExposureStore.get('displayWarningModal') || forceHide ? false : props || true);
  },

  inactivityLogoutWarningModal() {
    ExposureStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.YOUR_SESSION_WILL_END,
      content: FrontendConstants.YOUR_SESSION_IS_ABOUT_TO_END,
      handleCancel() {
        ExposureActions.extendSession();
        ExposureActions.closeModal();
      },
      primaryButton: {
        text: FrontendConstants.OK
      }
    });
  },

  displayModal(modalType, modalProps) {
    var modalContent;
    switch (modalType) {
      case ModalConstants.MODAL_ADD_SESSION_FILTERS:
        modalContent = React.createFactory(ModalDialogContent.AddSessionFilters)(modalProps);
        break;
      case ModalConstants.MODAL_CREATE_FOLDER:
        modalContent = React.createFactory(ModalDialogContent.CreateFolder)(modalProps);
        break;
      case ModalConstants.MODAL_DATA_REVIEW_EXPORT_IMPORT:
        modalContent = React.createFactory(ModalDialogContent.DataReviewExportImport)(modalProps);
        break;
      case ModalConstants.MODAL_DIALOG_WITH_LIST:
        modalContent = React.createFactory(ModalDialogContent.DialogWithList)(modalProps);
        break;
      case ModalConstants.MODAL_DOWNLOAD_FILE:
        modalContent = React.createFactory(ModalDialogContent.DownloadFile)(modalProps);
        break;
      case ModalConstants.MODAL_MONITOR_TASK_ASSIGNEES:
        modalContent = React.createFactory(ModalDialogContent.MonitorTaskAssignees)(modalProps);
        break;
      case ModalConstants.MODAL_RENAME_FOLDER:
        modalContent = React.createFactory(ModalDialogContent.RenameFolder)(modalProps);
        break;
      case ModalConstants.MODAL_SELECT_A_FOLDER:
        modalContent = React.createFactory(ModalDialogContent.TargetFolderSelectionDialog)(modalProps);
        break;
      case ModalConstants.MODAL_SHARE_ADD:
        modalContent = React.createFactory(ModalDialogContent.ShareAdd)(modalProps);
        break;
      case ModalConstants.MODAL_SHARE_EDIT:
        modalContent = React.createFactory(ModalDialogContent.ShareEdit)(modalProps);
        break;
      case ModalConstants.MODAL_SHARE_RESULTS:
        modalContent = React.createFactory(ModalDialogContent.ShareResults)(modalProps);
        break;
      case ModalConstants.MODAL_SHARE_DETAIL:
        modalContent = React.createFactory(ModalDialogContent.ShareDetail)(modalProps);
        break;
      case ModalConstants.MODAL_SHARE_ERROR:
        modalContent = React.createFactory(ModalDialogContent.ShareError)(modalProps);
        break;
      case ModalConstants.MODAL_SIMPLE_MESSAGE:
        modalContent = React.createFactory(ModalDialogContent.SimpleMessage)(modalProps);
        break;
      case ModalConstants.MODAL_UNSAVED_WARNING:
        modalContent = React.createFactory(ModalDialogContent.UnsavedWarning)(modalProps);
        break;
      case ModalConstants.MODAL_DELETE_OVERSIGHT_SCORECARD_CONFIG:
        modalContent = React.createFactory(ModalDialogContent.DeleteOversightScorecardConfig)(modalProps);
        break;
      case ModalConstants.MODAL_ADD_OVERSIGHT_METRIC_GROUP:
        modalContent = React.createFactory(ModalDialogContent.OversightMetricGroupModal)(modalProps);
        break;
      case ModalConstants.MODAL_DELETE_OVERSIGHT_METRIC_GROUP:
        modalContent = React.createFactory(ModalDialogContent.DeleteOversightMetricGroup)(modalProps);
        break;
      case ModalConstants.MODAL_EDIT_OVERSIGHT_METRIC_GROUP:
        modalContent = React.createFactory(ModalDialogContent.OversightMetricGroupModal)(modalProps);
        break;
      case ModalConstants.MODAL_IMPORT_VALIDATION_DETAILS:
        modalContent = React.createFactory(ModalDialogContent.DataReviewImportValidationModal)(modalProps);
        break;
      case ModalConstants.MODAL_DATA_REVIEW_SET_HISTORY:
        modalContent = React.createFactory(ModalDialogContent.DataReviewSetHistoryModal)(modalProps);
        break;
      case ModalConstants.MODAL_DOWNLOAD_CONFIRMATION:
        modalContent = React.createFactory(ModalDialogContent.DownloadConfirmation)(modalProps);
        break;
      case ModalConstants.MODAL_MULTI_SORT_SETTINGS:
        modalContent = React.createFactory(ModalDialogContent.MultiSortSettings)(modalProps);
        break;
      case ModalConstants.MODAL_DASHBOARD_FILTER_CONFIRMATION:
        modalContent = React.createFactory(ModalDialogContent.DashboardFilterConfirmation)(modalProps);
        break;  
      case ModalConstants.MODEL_SNAPSHOT_REPLACE:
        modalContent = React.createFactory(ModalDialogContent.SnapshotReplace)(modalProps);
        break;
    }
    if (modalContent) {
      _immExposureStore = _immExposureStore.set('modalContent', modalContent);
    }
  },

  extractListFilters(type, query) {
    var filters = _.pick(query, _immExposureStore.getIn(['listFilters', type]).keySeq().toJS());
    var immFilters = Imm.fromJS(filters);
    _immExposureStore = _immExposureStore.setIn(['activeListFilters', type], immFilters);
  },

  hasAnyModal() {
    return !!(_immExposureStore.has('modalContent') || _immExposureStore.get('displayWarningModal'));
  },

  updateModal(modalProps) {
    // Only update modal when the content is defined.
    if (_immExposureStore.get('modalContent')) {
      var modalContent = React.cloneElement(_immExposureStore.get('modalContent'), modalProps);
      _immExposureStore = _immExposureStore.set('modalContent', modalContent);
    }
  },

  updateListFilter(type, filter, value) {
    _immExposureStore = _immExposureStore.setIn(['listFilters', type, filter], value);
  },

  // `filterState` should have the same shape as an entry in filterStates.
  packageSessionFilterCookieEntry(schemaId, cql, filterState, filterType) {
    return {
      schemaId: schemaId,
      cql: cql,
      filterState: filterState,
      type: filterType
    };
  },

  setModalDataSelectorInputValid(valid) {
    ExposureStore.setDataSelectorInputValid(valid);
    ExposureStore.updateModal({ immExposureStore: _immExposureStore });
  },

  validateMonitorSelectionConditionColumnCql(immMonitorFile, schemaId, cql, successCallback) {
    var url = '/api/cql-queries/' + schemaId + '/parse-monitor-selection-condition-column';
    var oldRequest = ExposureStore.getValidateMonitorSelectionConditionColumnCql();
    if (oldRequest) {
      oldRequest.abort();
    }
    var data = JSON.stringify(immMonitorFile.set('includedStaticFilters', Imm.List([cql])).toJS());
    var newRequest = AppRequest({ type: 'POST', url: url, data: data });
    ExposureStore.setValidateMonitorSelectionConditionColumnCql(newRequest);

    newRequest.then(
      function (selectionConditionColumns) {
        ExposureStore.clearValidateMonitorSelectionConditionColumnCql();
        ExposureStore.setDataSelectorInputValid(true);
        ExposureStore.updateModal({ immExposureStore: _immExposureStore });
        Util.getGuardedCallback(successCallback)();
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        ExposureStore.clearValidateMonitorSelectionConditionColumnCql();
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          ExposureStore.setDataSelectorInputValid(false);
          ExposureStore.updateModal({ immExposureStore: _immExposureStore });
          console.log('%cERROR: POST api/cql-queries' + schemaId + '/parse-monitor-selection-condition-column failed', 'color: #E05353');
          GA.sendAjaxException('POST api/cql-queries' + schemaId + '/parse-monitor-selection-condition-column failed');
        }
        ExposureStore.emitChange();
      }
    )
  },

  addStudyNameDynamicSessionFilter(fileId, schemaId) {
    // Add `study.studyname` as session dynamic filter if a report uses CDM schema and doesn't have
    // a `study.studyname` session dynamic filter.
    // If the filter already exists, don't add it.
    if (_immExposureStore.get('cdmSchemaIds').contains(schemaId) && !Util.hasStudyFilter(_immExposureStore.get('currentAccountId'))) {
      var sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
      // Check for Builtin study session filter has exist
      var builtinSessionDynamicFilters = _.filter(sessionFilters.sessionDynamicFilters, filter =>
        filter.schemaId == ExposureAppConstants.FILE_TYPE_BUILTIN
        && filter.cql == ExposureAppConstants.STUDY_SESSION_FILTER_CQL);

      // Check for Yellowfin session filter has exist
      var yellowfinSessionDynamicFilters = _.filter(sessionFilters.sessionDynamicFilters, filter =>
        filter.schemaId == ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT
        && filter.cql == ExposureAppConstants.STUDY_SESSION_FILTER_CQL);

      // Removing existing study session filter and unshift the new study session filter to
      // the top of the session dynamic filter.
      sessionFilters.sessionDynamicFilters = _.filter(sessionFilters.sessionDynamicFilters, filter => filter.cql !== ExposureAppConstants.STUDY_SESSION_FILTER_CQL);
      if (_.size(builtinSessionDynamicFilters) > 0) {
        builtinSessionDynamicFilters[0].schemaId = schemaId;
        sessionFilters.sessionDynamicFilters.unshift(builtinSessionDynamicFilters[0]);
      } else if (_.size(yellowfinSessionDynamicFilters) > 0) {
        yellowfinSessionDynamicFilters[0].schemaId = schemaId;
        sessionFilters.sessionDynamicFilters.unshift(yellowfinSessionDynamicFilters[0]);
      } else {
        sessionFilters.sessionDynamicFilters.unshift(Util.getEmptyStudyFilter(schemaId));
      }
      CookieActions.setSessionFilters(sessionFilters, _immExposureStore.get('currentAccountId'));
    }
  },

  validateCqlSessionFilter(cql, fileId, schemaId, drilldownId, { addToCookie } = {}) {
    var url = '/api/cql-queries/' + schemaId + '/parse-column';
    var oldRequest = ExposureStore.getValidateCqlSessionFilterRequest();
    if (oldRequest) {
      oldRequest.abort();
    }

    // We don't need to stringify the data here since cql is already a string.
    var newRequest = AppRequest({ type: 'POST', url: url, data: cql });
    ExposureStore.setValidateCqlSessionFilterRequest(newRequest);

    newRequest.then(
      function (cqlCols) {
        if (_.isEmpty(cqlCols) || !_.contains([ExposureAppConstants.COLUMN_TYPES.PROPERTY_COLUMN, ExposureAppConstants.COLUMN_TYPES.SELECTION_CONDITION_COLUMN], cqlCols[0].type)) {
          ExposureStore.updateModal({ sessionFilterCqlParseValid: false });
        } else if (addToCookie) {
          var cqlCol = cqlCols[0];
          var sessionFilters = Util.getSessionFiltersFromCookie(_immExposureStore.get('currentAccountId'));
          var newSessionFilterEntry = ExposureStore.packageSessionFilterCookieEntry(schemaId, cql, {}, cqlCol.type);

          // If the filter already exists, don't add it.
          if (_.findWhere(sessionFilters.sessionStaticFilters.concat(sessionFilters.sessionDynamicFilters), _.omit(newSessionFilterEntry, 'filterState'))) {
            ExposureStore.createStatusMessage(FrontendConstants.DUPLICATE_SESSION_FILTER, StatusMessageTypeConstants.TOAST_ERROR);
          } else {
            // Session static filters affect all dynamic filters.
            var fetchFilterDataStartIndex = newSessionFilterEntry.type === ExposureAppConstants.COLUMN_TYPES.PROPERTY_COLUMN ? Util.getSessionDynamicFiltersCount(CookieStore.getCookies(), _immExposureStore.get('currentAccountId')) : -1;
            switch (cqlCol.type) {
              case ExposureAppConstants.COLUMN_TYPES.PROPERTY_COLUMN:
                sessionFilters.sessionDynamicFilters.push(newSessionFilterEntry);
                break;
              case ExposureAppConstants.COLUMN_TYPES.SELECTION_CONDITION_COLUMN:
                sessionFilters.sessionStaticFilters.push(newSessionFilterEntry);
                break;
            }
            CookieActions.setSessionFilters(sessionFilters, _immExposureStore.get('currentAccountId'));
            ExposureStore.createStatusMessage(FrontendConstants.YOU_HAVE_ADDED_A_NEW_SESSION_FILTER, StatusMessageTypeConstants.TOAST_SUCCESS);
            ExposureStore.applyFilter(fileId, drilldownId, fetchFilterDataStartIndex);
          }
          ExposureStore.closeModal();
        } else {
          ExposureStore.updateModal({ sessionFilterCqlParseValid: true });
        }
        ExposureStore.clearValidateCqlSessionFilterRequest();
        ExposureStore.emitChange();
      },
      function (jqXHR) {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          ExposureStore.clearValidateCqlSessionFilterRequest();
          ExposureStore.emitChange();
          console.log('%cERROR: POST api/cql-queries' + schemaId + '/parse-column failed', 'color: #E05353');
          GA.sendAjaxException('POST api/cql-queries' + schemaId + '/parse-column failed');
        }
      }
    );
  },

  displayUnsavedWorkModal(header, content, callback) {
    ExposureStore.displayModal(ModalConstants.MODAL_UNSAVED_WARNING, {
      header,
      content,
      handleCancel: () => {
        ExposureActions.closeModal();
        callback(false);
      },
      discardFunc: () => {
        ExposureStore.clearTaskInformationTemp();
        ExposureStore.toggleTaskPane(false);
        ExposureStore.setTaskStoreDetails(false);
        ExposureStore.setTaskStoreDetailsData(null);
        ExposureActions.closeModal();
        callback();
      }
    });
  },

  acceptPolicyAndAgreements(userId, transitionTo) {
    const url = `/api/user/${userId}/accept-policy`;
    AppRequest({ type: 'POST', url: url, data: JSON.stringify(userId) }).then(
      () => {
        _.defer(transitionTo);
        ExposureStore.emitChange();
      },
      () => {
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        ExposureStore.createStatusMessage(FrontendConstants.ACCEPT_POLICY_AND_AGREEMENTS_ERROR, StatusMessageTypeConstants.WARNING);
        ExposureStore.emitChange();
      }
    );
  },

  setKPIStudioActive() {
    _immExposureStore = _immExposureStore.set('isKPIStudioActive', true)
  },

  clearKPIStudioActive() {
    _immExposureStore = _immExposureStore.delete('isKPIStudioActive');
  },

  setShowSessionStudyFilter(showSessionStudyFilter) {
    _immExposureStore = _immExposureStore.set('showSessionStudyFilter', showSessionStudyFilter);
  },

  applyCheckAll(check) {
    if (check) {
      ExposureStore.folderViewResetCheckedFileIds();
    } else {
      let immAllSelected = Imm.Set();
      ExposureStore.folderViewGetFileIds().forEach((fileId) => {
        immAllSelected = immAllSelected.add(fileId);
      });
      ExposureStore.folderViewSetCheckedFileIds(immAllSelected);
    }
  },

  updateUserInfo(immUserInfo) {
    const userId = immUserInfo.get('id');
    const url = `/api/user/${userId}/profile`;
    _immExposureStore = _immExposureStore.set('isUpdateUserFetching', true);

    AppRequest({ type: 'POST', url: url, data: JSON.stringify(immUserInfo) }).then(
      function (result) {
        const immResult = Imm.fromJS(result);
        _immExposureStore = _immExposureStore.set('userInfo', immResult);
        ExposureActions.createStatusMessage(FrontendConstants.USER_UPDATED_SUCCESFULLY, StatusMessageTypeConstants.TOAST_SUCCESS);
        _immExposureStore = _immExposureStore.set('isUpdateUserFetching', false);
        ExposureStore.onAjaxCompletion();
      },
      function () {
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
        ExposureActions.createStatusMessage(FrontendConstants.USER_UPDATED_UNSUCCESFULLY, StatusMessageTypeConstants.WARNING);
        _immExposureStore = _immExposureStore.set('isUpdateUserFetching', false);
        ExposureStore.onAjaxCompletion();
      }
    );
  },

  refreshViz(fileId, vizspec, reportIndex, skipIndex) {
    let immReportData = ExposureStore.getReportData(fileId);
    if (!!vizspec && !isNaN(reportIndex)) {
      immReportData = immReportData.setIn(['vizspecs', reportIndex], vizspec);
      ExposureStore.setReportData(fileId, immReportData);
    }
    _immExposureStore = _immExposureStore.set('skipIndex', skipIndex);
  },

  updateWidget(fileId, widgetMetaData) {
    let immReportData = ExposureStore.getReportData(fileId);
    _immExposureStore = _immExposureStore.set('currentWidgetUpdating', widgetMetaData.widgetIndex);
    
    let widgetIndex = immReportData.toJS().widgetMetaData.filter((obj) => obj?.widgetId == widgetMetaData?.widgetId)[0]?.widgetIndex;

    if (!isNaN(widgetIndex)) {
      immReportData = immReportData?.setIn(['widgetMetaData', widgetIndex], Imm.fromJS(widgetMetaData));
      let oldCSCData = ExposureStore.getCSCFetchController();
      if(oldCSCData){
        ExposureStore.clearSelectedFilter(null);
      }
      ExposureStore.setReportData(fileId, immReportData);
    }
  },

  clearSkipIndex() {
    _immExposureStore = _immExposureStore.delete('skipIndex');
  },

  setActiveFocusBreadcrumbsAnalytic(fileId) {
    _immExposureStore = _immExposureStore.set('activeFocusBreadcrumbsAnalytic', fileId);
  },

  clearActiveFocusBreadcrumbsAnalytic() {
    _immExposureStore = _immExposureStore.delete('activeFocusBreadcrumbsAnalytic');
  },

  fetchBotCompletion() {
    const url = '/api/va/completion';
    AppRequest({ type: 'GET', url: url }).then(
      (data) => {
        let newData = Imm.Map();
        if (data) {
          newData = Imm.fromJS(data);
        }
        _immExposureStore = _immExposureStore.set('botCompletion', newData);
        ExposureStore.emitChange();
      },
      (jqXHR) => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
      }
    )
  },
  selectedModuleOption(isModuleActive) {
    _immExposureStore = _immExposureStore.set('isModuleActive', isModuleActive);
  },
  clearSelectedFilter(ref) {
    _immExposureStore = _immExposureStore.set('countryFilterList', ref);
  },

  clearPresetFilter(ref) {
    _immExposureStore = _immExposureStore.set('preCannedFiltersList', ref);
  },

  clearSelectedModuleOption() {
    _immExposureStore = _immExposureStore.set('isModuleActive', false);
  },

  setTopNavRenderHook(renderHook) {
    _immExposureStore = _immExposureStore.set('topNavRenderHook', renderHook);
  },

  setSupernavBarRef(ref) {
    _immExposureStore = _immExposureStore.set('supernavbar-ref', ref);
  },
  whoAmI() {
    const url = '/api/whoami';
    AppRequest({ type: 'GET', url: url }).then(
      data => {
        ExposureStore.setWhoAmI(data);
        ExposureStore.onAjaxCompletion();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
      }
    );
  },

  setDrilldownData(fileData) {
    _immExposureStore = _immExposureStore.set('drilldownFileData', fileData);
  },

  async exportPDF(requestModel) {
    if (requestModel && Object.keys(requestModel).length) {
      let url = '/api/export/pdf';
      let requestOption = {
        method: 'POST',
        body: JSON.stringify(requestModel),
      };
      await AppRequestByFetchPDF(url, requestOption).then(data => {
        return data.blob();
      }).then((blob) => {
        if (navigator.msSaveBlob) {
          // For IE10+
          return navigator.msSaveBlob(blob, requestModel.fileName);
        } else {
          const href = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = href;
          link.setAttribute('download', requestModel.fileName);
          document.body.appendChild(link);
          link.click();
        }
      }).catch(error => {
        GA.sendAjaxException(`Get ${url} failed.`, error.status);
      });
    }
  },

  pdfChartDataAction(chartData, isMultiData) {
    const combinedArray = [];
    if (isMultiData) {
      let updateChartData = this.getPdfChartDataAction();
      if(updateChartData === undefined) {
        updateChartData = [];
      }
      combinedArray.push(...updateChartData, ...chartData)
      _immExposureStore = _immExposureStore.set('cqsPDFChartData', combinedArray);
    } else {
      _immExposureStore = _immExposureStore.set('cqsPDFChartData', chartData);
    }
  },

  getPdfChartDataAction() {
    return _immExposureStore.get('cqsPDFChartData');
  },

  pdfPrimeTableDataAction(tableData) {
    _immExposureStore = _immExposureStore.set('pdfPrimeTableData', tableData);
  },

  setBotEntities(entities) {
    _immExposureStore = _immExposureStore.set('botEntities', entities);
  },

  setDefaultDynamicFilterResults(fileId, dynamicFilterList) {
    var immDefaultFilterStates = Imm.fromJS(dynamicFilterList);
    _immExposureStore = _immExposureStore.setIn(['files', fileId, 'filterStates'], immDefaultFilterStates);
  },

  saveFilterData(data, fileId = null) {
    let formattedData = Imm.fromJS(data);
    let prev = _immExposureStore.get('includedFilter').toJS();

    if (fileId) {
      let combined = { ...prev, ...data };
      _immExposureStore = _immExposureStore.set('includedFilter', Imm.fromJS(combined));
    }
    else {
      _immExposureStore = _immExposureStore.set('includedFilter', formattedData);
    }
  },
  updateMultipleWidget(fileId, widgetMetaData) {
    //function that updates multiple widgets.
    let immReportData = ExposureStore.getReportData(fileId);
    if (!Array.isArray(widgetMetaData)) {
      widgetMetaData = [widgetMetaData]
    };
    widgetMetaData.map((widget, index) => {
      let oldWidget = immReportData.getIn(['widgetMetaData', widget.widgetIndex]).toJS();
      oldWidget.staticHiChartConf = widget.staticHiChartConf
      if (widget.highChartConfigFunc) {
        oldWidget.highChartConfigFunc = widget.highChartConfigFunc
      }
      immReportData = immReportData.setIn(['widgetMetaData', widget.widgetIndex], Imm.fromJS(oldWidget));
    })
    ExposureStore.setReportData(fileId, immReportData);
  },

  setFetchController(controller) {
    if (controller === 'reset') {
      _immExposureStore = _immExposureStore.set('lazyController', Imm.fromJS([]));
    }
    else {
      let prev = _immExposureStore.get('lazyController') || [];
      let aborts = [...prev, controller];
      _immExposureStore = _immExposureStore.set('lazyController', Imm.fromJS(aborts));
    }
  },

  getFetchController() {
    return _immExposureStore.get('lazyController');
  },

  getCSCFetchController() {
    return _immExposureStore.get('countryFilterList');
  },

  getPreSetList() {
    return _immExposureStore.get('preCannedFiltersList');
  },

  getSessionFilterController(){
    return  _immExposureStore.get('widgetFilterSession');
  },

  setWidgetSessionStore(data) {
    _immExposureStore = _immExposureStore.set('widgetFilterSession', data);
    setObject('widgetContextFilter', data);
    delItem('currentWidgetUpdating');
    delItem('renderedWidget');
  },

  setWidgetFilterStore(data) {
    let prevStore = _immExposureStore.get('widgetFilterStore') || {};
    _immExposureStore = _immExposureStore.set('widgetFilterStore', { ...prevStore, ...data });
  },

  async getPreCannedFilterList(args) {
  let resourceURL = args.url;
  let body = args.body;

    let url = resourceURL;
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(body),
    };

    return await AppRequestByFetch(url, requestOption).then(async (res) => {

      if (res?.response) {

        let response = await res.response.json();
        return { Error: response };

      } else {

        _immExposureStore = _immExposureStore.set('preCannedFiltersList', res);
        return res;
      }

    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });

  },


  async getCountryFilterList(fileId) {

    let url = `/api/files/${fileId}/data`;
    let body = {
      query: 'select vw_sme_subject_detail.sitecountry, vw_sme_subject_detail.siteid, vw_sme_subject_detail.arm;',
      ignoreFilters: false,
      ignoreDrilldown: false,
      ignoreRowLimit: false
    }

    let immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(fileId)
    immQueryOptionsWrapper = immQueryOptionsWrapper.set('cqlQueries', [body]);

    let requestOption = {
      method: 'GET'
    };

    if (body) {
      url = `/api/files/${fileId}/data`;
      requestOption = {
        method: 'POST',
        body: JSON.stringify(immQueryOptionsWrapper),
      };
    }

    return await AppRequestByFetch(url, requestOption).then(async (res) => {
      if (res?.response) {
        let response = await res.response.json();
        return { Error: response };
      } else {
        _immExposureStore = _immExposureStore.set('countryFilterList', res);
        return res;
      }
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });

  },

  setCurrentWidgetUpdating(data) {
    _immExposureStore = _immExposureStore.set('currentWidgetUpdating', data);
  },

  updateMasterStudyContext(data) {
    _immExposureStore = _immExposureStore.set('masterStudyFilterContext', data);
  },
  setTaskStoreDetails(taskStoreDetails) {
    _immExposureStore = _immExposureStore.set('taskStoreDetails', taskStoreDetails);
    ExposureStore.emitChange();
  },

  getTaskStoreDetails() {
   return _immExposureStore.get('taskStoreDetails');
  },

  setTaskStoreDetailsData(taskStoreDetailsData){
    _immExposureStore = _immExposureStore.set('taskStoreDetailsData', taskStoreDetailsData);
    ExposureStore.emitChange();
  },

  setClonedTriggered(clonedTriggered){
    _immExposureStore = _immExposureStore.set('clonedTriggered', clonedTriggered);
    ExposureStore.emitChange();
  },

  toggleTaskPane(visible) {
    _immExposureStore = _immExposureStore.set('showTaskPane', visible);
  },

  displaySnapshotReplaceModal: function (callback, e, imgstore, screenshottime) {
    ExposureStore.displayModal(ModalConstants.MODEL_SNAPSHOT_REPLACE, {
      header: FrontendConstants.SNAPSHOT_REPLACE,
      handleCancel: () => {
        ExposureActions.closeModal();
        callback(false);
      },
      handleSave: () => {
          ExposureActions.closeModal();
          callback(true, e, imgstore, screenshottime);
      }
    });
  },

  updateWidgetMetaData(fileId, widgetMetaData, dashboardCustomConfigs) {
    let immReportData = ExposureStore.getReportData(fileId);
    immReportData = immReportData?.set('widgetMetaData', Imm.fromJS(widgetMetaData));
    immReportData = immReportData?.set('dashboardCustomConfigs', Imm.fromJS(dashboardCustomConfigs));
    ExposureStore.setReportData(fileId, immReportData);
    ExposureStore.emitChange();
  },

  updateWidgetizationApiRequests(fileId, request) {
    let immReportData = ExposureStore.getReportData(fileId);
    if (immReportData.get('apiRequests') && immReportData.get('apiRequests').toJS().length) {
      let prev = immReportData.get('apiRequests')?.toJS();
      let requests = [...prev, request];
      immReportData = immReportData?.set('apiRequests', Imm.fromJS(requests));
    }
    else {
      immReportData = immReportData?.set('apiRequests', Imm.fromJS([request]));
    }
    ExposureStore.setReportData(fileId, immReportData);
    ExposureStore.emitChange();
  },

  deleteWidgetizationApiRequests(fileId) {
    let immReportData = ExposureStore.getReportData(fileId);
    immReportData = immReportData?.set('apiRequests', Imm.fromJS([]));
    ExposureStore.setReportData(fileId, immReportData);
    ExposureStore.emitChange();
  },
  async getTaskCountApi(body) {

    let url = `/api/collaboration/tasks/count`;

    let requestOption = {
      method: 'GET'
    };

    if (body) {
      url = `/api/collaboration/tasks/count`;
      requestOption = {
        method: 'POST',
        body: JSON.stringify(body),
      };
    }

    return await AppRequestByFetch(url, requestOption).then(async (res) => {

      if (res?.response) {

        let response = await res.response.json();
        return { Error: response };

      } else {

        _immExposureStore = _immExposureStore.set('taskCountOfWidgets', res);
        return res;
      }

    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });

  },
  async getUSDMTime(fileId) {
    let url = `/api/files/${fileId}/data`;
    let selectedStudies = Util.getSelectedStudiesFilterFromSession(_immExposureStore.toJS().masterStudyFilterContext.props.cookie,_immExposureStore)
    let studies = selectedStudies.toJS()?.map(data=>data.value)
    let study = studies.length == 1 ? studies[0] : null
    if(studies.length>1){
      _immExposureStore.set('USDMTime', undefined)
      return;
    }
    let body = {
      query: `select rpt_ss_and_usdm_refresh_time.source_system_and_usdm_refresh_time where (rpt_ss_and_usdm_refresh_time.studyid= '${study}') and (rpt_ss_and_usdm_refresh_time.source_system_and_usdm='LSAC - USDM');`,
      ignoreFilters: false,
      ignoreDrilldown: false,
      ignoreRowLimit: false
    }

    let immQueryOptionsWrapper = ExposureStore.getImmQueryOptionsWrapper(fileId)
    immQueryOptionsWrapper = immQueryOptionsWrapper.set('cqlQueries', [body]);

    let requestOption = {
      method: 'GET'
    };

    if (body) {
      url = `/api/files/${fileId}/data`;
      requestOption = {
        method: 'POST',
        body: JSON.stringify(immQueryOptionsWrapper),
      };
    }

    return await AppRequestByFetch(url, requestOption).then(async (res) => {
      if (res?.response) {
        let response = await res.response.json();
        return { Error: response };
      } else {
        _immExposureStore = _immExposureStore.set('USDMTime', res?.reportData[0]?.rows);
        return res;
      }
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });

  },

  setIsViewTasks(value) {
    _immExposureStore = _immExposureStore.set('isViewTasks', value);
    ExposureStore.emitChange();
  },

  setRelationFilterChange(filterChangeFlag) {
    _immExposureStore = _immExposureStore.set('relationFilterChange', filterChangeFlag);
    ExposureStore.emitChange();
  }

}, Store);


var _actions = {
  [ExposureConstants.EXPOSURE_CURRENT_WIDGET_UPDATING]: action => ExposureStore.setCurrentWidgetUpdating(action.data),
  [ExposureConstants.WIDGET_FILTER_STORE]: action => ExposureStore.setWidgetFilterStore(action.data),
  [ExposureConstants.UPDATE_WIDGET_FILTER_SESSION_STORAGE]: action => ExposureStore.setWidgetSessionStore(action.data),
  [ExposureConstants.DRILLDOWN_FILE_DATA]: action => ExposureStore.setDrilldownData(action.fileData),
  [ExposureConstants.EXPOSURE_APPLY_FILTER]: action => ExposureStore.applyFilter(action.fileId, action.drilldownId, action.fetchFilterDataStartIndex),
  [ExposureConstants.EXPOSURE_BUILTIN_DRILLDOWN_HANDLE_RELATED_FILE]: action => ExposureStore.builtinDrilldownHandleRelatedFile(action.fileId, action.drilldownId, action.chartDrilldownKey, action.schemaId, action.transitionTo),
  [ExposureConstants.EXPOSURE_CLEAR_BACK_NAV_ACTION_STACK]: ExposureStore.clearBackNavActionStack,
  [ExposureConstants.EXPOSURE_CLEAR_DRILLDOWN]: action => ExposureStore.clearDrilldown(action.fileId, action.drilldownId),
  [ExposureConstants.EXPOSURE_CLEAR_EMBEDDED_LOGIN_SESSION_ID]: action => ExposureStore.clearEmbeddedLoginSessionId(),
  [ExposureConstants.EXPOSURE_CLEAR_FILE_FILTER_STATE]: action => ExposureStore.clearFileFilterState(action.fileId),
  [ExposureConstants.EXPOSURE_CLOSE_MODAL]: ExposureStore.closeModal,
  [ExposureConstants.EXPOSURE_CLOSE_STATUS_MESSAGE]: action => ExposureStore.closeStatusMessage(action.id),
  [ExposureConstants.EXPOSURE_CREATE_FOLDER]: action => ExposureStore.createFolder(action.pageSettings),
  [ExposureConstants.EXPOSURE_CREATE_STATUS_MESSAGE]: action => ExposureStore.createStatusMessage(action.text, action.type, action.action, action.actionText),
  [ExposureConstants.EXPOSURE_CREATE_STATUS_MESSAGE_WITH_CUSTOM_TIMEOUT]: action =>
    ExposureStore.createStatusMessageWithCustomTimeout(action.text, action.type, action.toastTimeout, action.action,
      action.actionText),
  [ExposureConstants.EXPOSURE_DELETE_FILE_ENTRY]: action => ExposureStore.deleteFileEntry(action.fileId),
  [ExposureConstants.EXPOSURE_DELETE_FILE_STATES]: action => ExposureStore.deleteFileStates(action.fileIds),
  [ExposureConstants.EXPOSURE_DELETE_FILES]: action => ExposureStore.deleteFiles(action.fileIds, action.folderId, action.pageSettings),
  [ExposureConstants.EXPOSURE_DISCARD_MODAL_CHANGES]: ExposureStore.discardModalChanges,
  [ExposureConstants.EXPOSURE_DISPLAY_ACTION_COULD_NOT_BE_COMPLETED_MODAL]: action => ExposureStore.displayActionCouldNotBeCompletedModal(action.content),
  [ExposureConstants.EXPOSURE_DISPLAY_INSUFFICIENT_PERMISSIONS_MODAL]: ExposureStore.displayInsufficientPermissionsModal,
  [ExposureConstants.EXPOSURE_DISPLAY_MODAL]: action => ExposureStore.displayModal(action.modalType, action.modalProps),
  [ExposureConstants.EXPOSURE_DISPLAY_UNSAVED_WORK_MODAL]: action => ExposureStore.displayUnsavedWorkModal(action.header, action.content, action.callback),
  [ExposureConstants.EXPOSURE_DRILLDOWN_HANDLE_RELATED_FILE]: action => ExposureStore.drilldownHandleRelatedFile(action.fileId, action.drilldownId, action.chartDrilldownKey, action.schemaId, action.transitionTo, action.openInNewTab),
  [ExposureConstants.EXPOSURE_DRILLDOWN_UPDATE_CURRENT_SELECTION_CONDITION]: action => ExposureStore.drilldownUpdateCurrentSelectionCondition(action.fileId, action.chartDrilldownKey, action.drilldownElements),
  [ExposureConstants.EXPOSURE_EDIT_SHARING_FILE_MODAL]: action => ExposureStore.editSharingFileModal(action.fileId),
  [ExposureConstants.EXPOSURE_EXPORT_AUDIT_DATA]: action => ExposureStore.exportAuditData(action.auditReport),
  [ExposureConstants.EXPOSURE_EXPORT_REPORT_DATA]: action => ExposureStore.exportFileData(action.fileId, action.drilldownId, action.downloadType, action.builtinFilterRequestWrapper, action.dataDiffRequest, action.rowLength, action.csv, action.immQueryOptionsWrapper),
  [ExposureConstants.EXPOSURE_EXTEND_SESSION]: ExposureStore.extendSession,
  [ExposureConstants.EXPOSURE_EXTRACT_LIST_FILTERS]: action => ExposureStore.extractListFilters(action.type, action.query),
  [ExposureConstants.EXPOSURE_FETCH_COMPREHEND_SCHEMAS]: ExposureStore.fetchComprehendSchemas,
  [ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_ROLES]: action => ExposureStore.fetchDataReviewRoles(action.dataReviewId, action.completionCallback),
  [ExposureConstants.EXPOSURE_FETCH_FILE]: action => ExposureStore.fetchFile(action.fileId, action.pageSettings, action.options),
  [ExposureConstants.EXPOSURE_FETCH_FILES]: action => ExposureStore.fetchFiles(action.fileIds),
  [ExposureConstants.EXPOSURE_FETCH_FILE_CONFIG]: action => ExposureStore.fetchFileConfig(action.fileId),
  [ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS]: action => ExposureStore.fetchFileConfigs(action.fileIds, action.callback),
  [ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS_FOR_DATA_REVIEW]: action => ExposureStore.fetchFileConfigsForDataReview(action.completionCallback),
  [ExposureConstants.EXPOSURE_FETCH_FAVORITES_WITH_PAGE_SETTINGS]: action => ExposureStore.fetchFavoritesWithPageSettings(action.pageSettings),
  [ExposureConstants.EXPOSURE_FETCH_FOLDER_WITH_PAGE_SETTINGS]: action => ExposureStore.fetchFolderWithParameters(action.folderId, action.parameters),
  [ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_FILTER_OPTIONS]: action => ExposureStore.fetchDataReviewFilterOptions(action.fileId),
  [ExposureConstants.EXPOSURE_FETCH_DATA_REVIEW_SUMMARY_FILTER_OPTIONS]: action => ExposureStore.fetchDataReviewSummaryFilterOptions(action.fileId, action.fileIds),
  [ExposureConstants.EXPOSURE_FETCH_NOTIFICATIONS]: ExposureStore.fetchNotifications,
  [ExposureConstants.EXPOSURE_FETCH_QUALITY_AGREEMENTS]: action => ExposureStore.fetchQualityAgreements(action.callback),
  [ExposureConstants.EXPOSURE_FETCH_STUDY_CRO_DATA]: ExposureStore.fetchStudyCROData,
  [ExposureConstants.EXPOSURE_FETCH_TASK]: action => ExposureStore.fetchTask(action.taskId, action.isViewOnlyTask),
  [ExposureConstants.EXPOSURE_FETCH_TASK_TYPES]: ExposureStore.fetchTaskTypes,
  [ExposureConstants.EXPOSURE_FETCH_TASK_METADATA]: action => ExposureStore.fetchTaskMetadata(action.callback, action.clinicalFilters),
  [ExposureConstants.EXPOSURE_FETCH_CLINICAL_ATTRIBUTES]: action => ExposureStore.fetchClinicalAttributes(action.clinicalDBDetails, action.taskMetadata),
  [ExposureConstants.EXPOSURE_FETCH_CLINICAL_ATTRIBUTES_V2]: action => ExposureStore.fetchClinicalAttributesV2(action.columnDataObj, action.currentTaskId),
  [ExposureConstants.EXPOSURE_FETCH_TASK_SUMMARIES]: ExposureStore.fetchTaskSummaries,
  [ExposureConstants.EXPOSURE_FETCH_TASKS_WITH_PAGE_SETTINGS]: action => ExposureStore.fetchTasksWithParameters(action.fetchFiles, action.parameters),
  [ExposureConstants.EXPOSURE_FETCH_CLOSED_TASKS_WITH_PAGE_SETTINGS]: action => ExposureStore.fetchClosedTasksWithParameters(action.fetchFiles, action.parameters),
  [ExposureConstants.EXPOSURE_FETCH_EMBEDDED_FILE]: action => ExposureStore.fetchEmbeddedFile(action.fileId),
  [ExposureConstants.EXPOSURE_FETCH_EMBEDDED_DASHBOARDS]: action => ExposureStore.fetchEmbeddedDashboards(),
  [ExposureConstants.EXPOSURE_FETCH_EMBEDDED_ENTITIES_SUMMARY]: action => ExposureStore.fetchEmbeddedEntitiesSummary(),
  [ExposureConstants.EXPOSURE_FETCH_YELLOWFIN_STUDY_FILTER_DATA]: action => ExposureStore.fetchYellowfinStudyFilterData(action.callback),
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_REFRESH_CHECKED_FILE_IDS]: ExposureStore.folderViewResetCheckedFileIds,
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_CHECKED_FILE_IDS]: action => ExposureStore.folderViewUpdateCheckedFileIds(action.rowIndex, action.value),
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_COLUMN_OPTION]: action => ExposureStore.folderViewUpdateColumnOption(action.colName, action.value),
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_IS_STARRED]: action => ExposureStore.folderViewUpdateIsStarred(action.rowIndex, action.isStarred),
  [ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_CHECKED_ITEM_IDS]: action => ExposureStore.favoritesViewUpdateCheckedItemIds(action.rowIndex, action.value),
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_SET_IS_VALID]: action => ExposureStore.folderViewSetIsValid(action.isValid),
  [ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_IS_VALID]: action => ExposureStore.favoritesViewSetIsValid(action.isValid),
  [ExposureConstants.EXPOSURE_FAVORITES_VIEW_SET_COLUMN_OPTION]: action => ExposureStore.favoritesViewUpdateColumnOption(action.colName, action.value),
  [ExposureConstants.EXPOSURE_GET_PRIVILEGE_CAPABILITIES]: action => ExposureStore.getPrivilegeCapabilities(action.fileId, action.callback),
  [ExposureConstants.EXPOSURE_GET_YELLOWFIN_REPORT_LIST]: action => ExposureStore.fetchYellowfinReportList(),
  [ExposureConstants.EXPOSURE_GPP_DRILLDOWN_HANDLE_RELATED_FILE]: action => ExposureStore.gppDrilldownHandleRelatedFile(action.fileId, action.drilldownId, action.chartDrilldownKey, action.schemaId, action.transitionTo),
  [ExposureConstants.EXPOSURE_INACTIVITY_LOGOUT_WARNING]: ExposureStore.inactivityLogoutWarningModal,
  [ExposureConstants.EXPOSURE_MONITOR_TASK_ASSIGNEES_MODAL]: action => ExposureStore.monitorTaskAssigneesModal(action.fileId),
  [ExposureConstants.EXPOSURE_MOVE_FILES]: action => ExposureStore.moveFiles(action.filesIds, action.folderId, action.pageSettings),
  [ExposureConstants.EXPOSURE_OPEN_LIST_FILTER_PANE]: ExposureStore.openListFilterPane,
  [ExposureConstants.EXPOSURE_POP_BACK_NAV_ACTION]: action => ExposureStore.popBackNavAction(action.backNavAction),
  [ExposureConstants.EXPOSURE_PUSH_BACK_NAV_ACTION]: action => ExposureStore.pushBackNavAction(action.backNavAction),
  [ExposureConstants.EXPOSURE_REPORT_CREATION_VIEW_CREATE_REPORT]: action => ExposureStore.createFile(action.immReport, action.callback, action.forceEmit),
  [ExposureConstants.EXPOSURE_REPORT_CREATION_VIEW_UPDATE_REPORT]: action => ExposureStore.updateFile(action.reportId, action.immReport, action.callback, false),
  [ExposureConstants.EXPOSURE_RENAME_FOLDER_MODAL]: action => ExposureStore.renameFolder(action.folderId, action.pageSettings),
  [ExposureConstants.EXPOSURE_RESET_ALL_INCLUDED_FILTERS]: action => ExposureStore.resetAllIncludedDynamicFilters(action.fileId, action.drilldownId),
  [ExposureConstants.EXPOSURE_SET_BUILTIN_BACK_FILTER]: action => ExposureStore.setBuiltinBackFilter(action.fileId, action.data),
  [ExposureConstants.EXPOSURE_SET_BUILTIN_DRILLDOWN]: action => ExposureStore.setBuiltinDrilldown(action.drilldownId, action.data),
  [ExposureConstants.EXPOSURE_SET_CDM_DROPDOWN_SELECTIONS]: action => ExposureStore.setCDMDropdownSelections(action.fileId, action.selections),
  [ExposureConstants.EXPOSURE_SET_COMPREHEND_SCHEMA_OVERVIEW]: action => ExposureStore.setComprehendSchemaOverview(action.comprehendSchemaId, action.immDatasources),
  [ExposureConstants.EXPOSURE_SET_COMPREHEND_SCHEMA_OVERVIEW_TABLE]: action => ExposureStore.setComprehendSchemaOverviewTable(action.comprehendSchemaId, action.datasourceName, action.nodeShortName, action.immTable),
  [ExposureConstants.EXPOSURE_SET_MODAL_DATA_SELECTOR_INPUT_VALID]: action => ExposureStore.setModalDataSelectorInputValid(action.valid),
  [ExposureConstants.EXPOSURE_SET_SHOW_MOBILE_TABULAR_REPORT_DETAILS]: action => ExposureStore.setShowMobileTabularReportDetails(action.isOpen),
  [ExposureConstants.EXPOSURE_SET_MONITOR_TASKS]: action => ExposureStore.setMonitorTasks(action.immMonitorTasks),
  [ExposureConstants.EXPOSURE_SET_MONITOR_TASKS_EXPANDED_IDS]: action => ExposureStore.setMonitorTasksExpandedIds(action.immExpandedIds, action.openMonitorTasks),
  [ExposureConstants.EXPOSURE_SET_MOVE_TO_FOLDERID]: action => ExposureStore.setMoveToFolderId(action.folderId),
  [ExposureConstants.EXPOSURE_SET_VISIBLE_MONITOR_TRENDLINES]: action => ExposureStore.setVisibleMonitorTrendlines(action.fileId, action.visibleMonitorTrendlines),
  [ExposureConstants.EXPOSURE_SHARE_FILES]: action => ExposureStore.shareFiles(
    action.immFileConfigs, action.immSelectedEntities, action.immPrivileges),
  [ExposureConstants.EXPOSURE_SHARE_FILES_MODAL]: action =>
    ExposureStore.shareFilesModal(action.fileIds),
  [ExposureConstants.EXPOSURE_TABULAR_REPORT_GO_TO_PAGE]: action => ExposureStore.tabularReportGoToPage(action.reportId, action.drilldownId, action.pageNumber),
  [ExposureConstants.EXPOSURE_TABULAR_REPORT_SET_COLUMN_SORT]: action => ExposureStore.tabularReportSetColumnSort(action.reportId, action.drilldownId, action.colIndex, action.sortIndex),
  [ExposureConstants.EXPOSURE_TABULAR_REPORT_SET_ROWS_PER_PAGE]: action => ExposureStore.tabularReportSetRowsPerPage(action.reportId, action.drilldownId, action.rowsPerPage),
  [ExposureConstants.EXPOSURE_GET_TASK_LIST]: action => ExposureStore.getTaskList(action.taskRelationship, action.sortBy, action.orderBy, action.begin, action.length, action.context),
  [ExposureConstants.EXPOSURE_TASK_SCREENSHOT_SUBMIT]: action => ExposureStore.taskScreenshotSubmit(action.saveTaskObject),
  [ExposureConstants.EXPOSURE_TASK_VIEW_SUBMIT_TASK]: action => ExposureStore.taskViewSubmitTask(action.currentFileId, action.drilldownId, action.transitionTo, action.addTaskSuccessCallback),
  [ExposureConstants.EXPOSURE_TASK_VIEW_UPDATE_TASK]: action => ExposureStore.taskViewUpdateTask(action.immWorkingTaskWrapper, action.isObserverOnly, action.transitionToCollaboration),
  [ExposureConstants.EXPOSURE_TASKS_VIEW_SET_CHECKED_TASK_IDS]: action => ExposureStore.tasksViewUpdateCheckedTaskIds(action.rowIndex, action.value),
  [ExposureConstants.EXPOSURE_TASKS_VIEW_SET_COLUMN_OPTION]: action => ExposureStore.tasksViewUpdateColumnOption(action.colName, action.value),
  [ExposureConstants.EXPOSURE_TASKS_VIEW_SET_IS_STARRED]: action => ExposureStore.tasksViewUpdateIsStarred(action.rowIndex, action.isStarred),
  [ExposureConstants.EXPOSURE_TASKS_VIEW_SET_IS_VALID]: action => ExposureStore.tasksViewSetIsValid(action.isValid),
  [ExposureConstants.EXPOSURE_TEMPLATE_CREATE]: action => ExposureStore.templateCreate(action.immTemplate, action.postAction),
  [ExposureConstants.EXPOSURE_TEMPLATES_DELETE]: action => ExposureStore.templatesDelete(action.templateIds, false),
  [ExposureConstants.EXPOSURE_TEMPLATES_FETCH]: ExposureStore.templatesFetch,
  [ExposureConstants.EXPOSURE_TEMPLATES_VIEW_SET_CHECKED_TEMPLATE_IDS]: action => ExposureStore.templatesViewUpdateCheckedTemplateIds(action.rowIndex, action.value),
  [ExposureConstants.EXPOSURE_TEMPLATE_UPDATE]: action => ExposureStore.templateUpdate(action.immTemplate, action.postAction),
  [ExposureConstants.EXPOSURE_TEMPLATES_VIEW_SET_COLUMN_OPTION]: action => ExposureStore.templatesViewSetColumnOption(action.colName, action.value),
  [ExposureConstants.EXPOSURE_TOGGLE_DISPLAY_WARNING_MODAL]: action => ExposureStore.toggleDisplayWarningModal(action.props, action.forceHide),
  [ExposureConstants.EXPOSURE_TOGGLE_FILTERS_PANE]: action => ExposureStore.toggleFiltersPane(action.visible),
  [ExposureConstants.EXPOSURE_TOGGLE_MOBILE_NAV_MENU]: action => ExposureStore.toggleMobileNavMenu(action.clearBackNavActionStack),
  [ExposureConstants.EXPOSURE_TOGGLE_MONITOR_TASKS_PANE]: action => ExposureStore.toggleShowMonitorTasks(action.forceClose),
  [ExposureConstants.EXPOSURE_TOGGLE_NOTIFICATIONS_DROPDOWN]: ExposureStore.toggleNotificationsDropdown,
  [ExposureConstants.EXPOSURE_TOGGLE_LIST_FILTER_PANE]: ExposureStore.toggleListFilterPane,
  [ExposureConstants.EXPOSURE_TRANSITION_LINKED_REPORTS_STUDIO]: action => ExposureStore.transitionLinkedReportsStudio(action.fileId, action.enter),
  [ExposureConstants.EXPOSURE_TRANSITION_FILE]: action => ExposureStore.transitionFile(action.currentFileId, action.nextFileId, action.nextDrilldownId),
  [ExposureConstants.EXPOSURE_TRANSITION_TO]: action => ExposureStore.transitionTo(action.path),
  [ExposureConstants.EXPOSURE_UPDATE_APPLIED_FILTER]: action => ExposureStore.updateIncludedDynamicFilter(action.fileId, action.drilldownId, action.filterIndex, action.updateType, action.data),
  [ExposureConstants.EXPOSURE_UPDATE_FILE]: action => ExposureStore.updateFile(action.fileId, action.immFile, action.callback, action.confirmSharingImpact),
  [ExposureConstants.EXPOSURE_UPDATE_LIST_FILTER]: action => ExposureStore.updateListFilter(action.type, action.filter, action.value),
  [ExposureConstants.EXPOSURE_UPDATE_SHARING_FILE]: action => ExposureStore.updateSharingFile(action.immFileConfig, action.immEntityPrivilegesList),
  [ExposureConstants.EXPOSURE_VALIDATE_CQL_SESSION_FILTER]: action => ExposureStore.validateCqlSessionFilter(action.cql, action.fileId, action.schemaId, action.drilldownId, action.options),
  [ExposureConstants.EXPOSURE_VALIDATE_MONITOR_SELECTION_CONDITION_COLUMN_CQL]: action => ExposureStore.validateMonitorSelectionConditionColumnCql(action.immMonitorFile, action.schemaId, action.cql, action.successCallback),
  [ExposureConstants.EXPOSURE_SET_DATA_FILTER_SELECTIONS]: action => ExposureStore.setDataFilterSelection(action.fileId, action.immDataFilterSelection),
  [ExposureConstants.EXPOSURE_SET_MED_TASK_FILTERS]: action => ExposureStore.setMedTaskFilters(action.fileId, action.immMedTaskFilters),
  [ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_SELECTIONS]: action => ExposureStore.clearDataFilterSelection(action.fileId),
  [ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_OPTIONS]: action => ExposureStore.clearDataReviewFilterOptions(),
  [ExposureConstants.EXPOSURE_CLEAR_DATA_FILTER_REQUEST_IN_FLIGHT]: action => ExposureStore.clearDataReviewFilterRequestInFlight(),
  [ExposureConstants.EXPOSURE_CLEAR_DATA_TASK_FILTERS]: action => ExposureStore.clearDataTaskFilters(action.fileId),
  [ExposureConstants.EXPOSURE_SET_TASK_INFO_TEMP]: action => ExposureStore.setTaskInformationTemp(action.immWorkingTaskWrapperTemp),
  [ExposureConstants.EXPOSURE_CLEAR_TASK_INFO_TEMP]: action => ExposureStore.clearTaskInformationTemp(),
  [ExposureConstants.EXPOSURE_GET_TASK_ASSIGNABLE_USERS]: action => ExposureStore.getTaskAssignableUsers(action.studyIds, action.callBack),
  [ExposureConstants.EXPOSURE_FETCH_FILE_CONFIGS_FOR_GROUP]: action => ExposureStore.fetchFileConfigsForGroup(action.groupId),
  [ExposureConstants.EXPOSURE_FETCH_STUDIES]: action => ExposureStore.fetchStudies(action.callback),
  [ExposureConstants.EXPOSURE_SET_KPI_STUDIO_ACTIVE]: action => ExposureStore.setKPIStudioActive(),
  [ExposureConstants.EXPOSURE_CLEAR_KPI_STUDIO_ACTIVE]: action => ExposureStore.clearKPIStudioActive(),
  [ExposureConstants.EXPOSURE_FOLDER_VIEW_CHECK_ALL]: action => ExposureStore.applyCheckAll(action.check),
  [ExposureConstants.EXPOSURE_SHOW_SESSION_STUDY_FILTER]: action => ExposureStore.setShowSessionStudyFilter(action.showSessionStudyFilter),
  [ExposureConstants.EXPOSURE_UPDATE_USER_INFO]: action => ExposureStore.updateUserInfo(action.userInfo),
  [ExposureConstants.EXPOSURE_FETCH_CLIENT_ORG]: action => ExposureStore.fetchClientOrg(),
  [ExposureConstants.EXPOSURE_ACCEPT_POLICY_AND_AGREEMENTS]: action => ExposureStore.acceptPolicyAndAgreements(action.userId, action.transitionTo),
  [ExposureConstants.EXPOSURE_REFRESH_VIZ]: action => ExposureStore.refreshViz(action.fileId, action.vizspec, action.reportIndex, action.skipIndex),
  [ExposureConstants.EXPOSURE_UPDATE_WIDGET]: action => ExposureStore.updateWidget(action.fileId, action.widgetMetaData, action.widgetIndex),
  [ExposureConstants.EXPOSURE_CLEAR_SKIP_INDEX]: action => ExposureStore.clearSkipIndex(),
  [ExposureConstants.EXPOSURE_SET_ACTIVE_FOCUS_BREADCRUMBS_ANALYTIC]: action => ExposureStore.setActiveFocusBreadcrumbsAnalytic(action.fileId),
  [ExposureConstants.EXPOSURE_CLEAR_ACTIVE_FOCUS_BREADCRUMBS_ANALYTIC]: action => ExposureStore.clearActiveFocusBreadcrumbsAnalytic(),
  [ExposureConstants.EXPOSURE_BOT_COMPLETION]: action => ExposureStore.fetchBotCompletion(),
  [ExposureConstants.EXPOSURE_SELECTED_MODULE]: action => ExposureStore.selectedModuleOption(action.isModuleActive),
  [ExposureConstants.CLEAR_EXPOSURE_SELECTED_MODULE]: action => ExposureStore.clearSelectedModuleOption(),
  [ExposureConstants.EXPOSURE_BOT_COMPLETION]: action => ExposureStore.fetchBotCompletion(),
  [ExposureConstants.SET_TOP_NAV_RENDER_HOOK]: action => ExposureStore.setTopNavRenderHook(action.renderHook),
  [ExposureConstants.SET_SUPERNAVBAR_REF]: action => ExposureStore.setSupernavBarRef(action.ref),
  [ExposureConstants.EXPOSURE_WHO_AM_I]: action => ExposureStore.whoAmI(),
  [ExposureConstants.EXPOSURE_PDF_REPORT_DATA]: action => ExposureStore.exportPDF(action.requestModel),
  [ExposureConstants.CQS_PDF_EXPORT]: action => ExposureStore.pdfChartDataAction(action.chartData, action.isMultiData),
  [ExposureConstants.PRIME_TABLE_PDF_EXPORT]: action => ExposureStore.pdfPrimeTableDataAction(action.tableData),
  [ExposureConstants.EXPOSURE_SET_BOT_ENTITIES]: action => ExposureStore.setBotEntities(action.entities),
  [ExposureConstants.EXPOSURE_UPDATE_MULTIPLE_WIDGET]: action => ExposureStore.updateMultipleWidget(action.fileId, action.widgetMetaData, action.widgetIndex),
  [ExposureConstants.FETCH_CONTROLLER_ACTION]: action => ExposureStore.setFetchController(action.controller),
  [ExposureConstants.UPDATE_MASTER_FILTER_CONTEXT]: action => ExposureStore.updateMasterStudyContext(action.data),
  [ExposureConstants.STORE_TASK_DETAILS_BOOLEAN]: action => ExposureStore.setTaskStoreDetails(action.taskStoreDetails),
  [ExposureConstants.STORE_TASK_DETAILS]: action => ExposureStore.setTaskStoreDetailsData(action.taskStoreDetailsData),
  [ExposureConstants.STORE_CLONED_TRIGGERED_BOOLEAN]:action=>ExposureStore.setClonedTriggered(action.clonedTriggered),
  [ExposureConstants.EXPOSURE_TOGGLE_TASK_PANE]: action => ExposureStore.toggleTaskPane(action.visible),
  [ExposureConstants.MODEL_SNAPSHOT_REPLACE]: action => ExposureStore.displaySnapshotReplaceModal(action.callback, action.e, action.imgstore, action.screenshottime),
  [ExposureConstants.SET_FILE_ID]: action => ExposureStore.setFile(action.fileId, action.immFile),
  [ExposureConstants.UPDATE_WIDGET_META_DATA]: action => ExposureStore.updateWidgetMetaData(action.fileId, action.widgetMetaData, action.dashboardCustomConfigs),
  [ExposureConstants.UPDATE_REQUESTS]: action => ExposureStore.updateWidgetizationApiRequests(action.fileId, action.request),
  [ExposureConstants.DELETE_REQUESTS]: action => ExposureStore.deleteWidgetizationApiRequests(action.fileId),
  [ExposureConstants.EXPOSURE_FETCH_TASKS_APPLICATIONS_COUNT]: action => ExposureStore.fetchTasksApplicationsCount(action.parameters),
  [ExposureConstants.CLEAR_TASK_FILTERS]: action => ExposureStore.clearFileTaskFiltersSCCS(action.fileId),
  [ExposureConstants.EXPOSURE_SET_SHOWHIDE_TASKS_DETAILS]: action => ExposureStore.setShowTaskDetail(action.parameters),
  [ExposureConstants.EXPOSURE_GET_SHOWHIDE_TASKS_DETAILS]: action => ExposureStore.getShowTaskDetail(action.parameters),
  [ExposureConstants.EXPOSURE_SET_TASK_TAB_SELECTED]: action => ExposureStore.setTaskTab(action.parameters),
  [ExposureConstants.EXPOSURE_GET_TASK_TAB_SELECTED]: action => ExposureStore.getTaskTab(action.parameters),
  [ExposureConstants.EXPOSURE_SET_COLLABORATION_LOADING]: action => ExposureStore.setLoadingCollaboration(action.parameters),
  [ExposureConstants.EXPOSURE_GET_COLLABORATION_LOADING]: action => ExposureStore.getLoadingCollaboration(action.parameters),
  [ExposureConstants.EXPOSURE_SET_LOADING_TASK_COUNT]: action => ExposureStore.setLoadingTaskCount(action.parameters),
  [ExposureConstants.EXPOSURE_GET_LOADING_TASK_COUNT]: action => ExposureStore.getLoadingTaskCount(action.parameters),
  [ExposureConstants.EXPOSURE_SET_LOADING_TASK_TABLE]: action => ExposureStore.setTaskTableLoading(action.parameters),
  [ExposureConstants.EXPOSURE_GET_LOADING_TASK_TABLE]: action => ExposureStore.getTaskTableLoading(action.parameters),
  [ExposureConstants.EXPOSURE_SET_LOADING_CLOSE_TASK_TABLE]: action => ExposureStore.setCloseTaskTableLoading(action.parameters),
  [ExposureConstants.EXPOSURE_GET_LOADING_CLOSE_TASK_TABLE]: action => ExposureStore.getCloseTaskTableLoading(action.parameters),
  [ExposureConstants.SET_VIEW_TASKS]: action => ExposureStore.setIsViewTasks(action.value),
  [ExposureConstants.SET_RELATION_FILTER_CHANGE]: action => ExposureStore.setRelationFilterChange(action.filterChangeFlag)
};

ExposureStore.dispatcherIndex = AppDispatcher.register(function (payload) {
  var action = payload.action;
  var immExposureStore = _immExposureStore;
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  // Note: Imm.is is extremely performant. A typical comparison takes about 200 nanoseconds.
  if (!Imm.is(_immExposureStore, immExposureStore)) {
    ExposureStore.emitChange();
  }
  return true;
});

module.exports = ExposureStore;
