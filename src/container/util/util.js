import AccountUtil from "./AccountUtil";

var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var Cookies = require('js-cookie');
var Imm = require('immutable');
var Moment = require('moment');
var ExposureActions = require('../actions/ExposureActions');
var DataTypeConstants = require('../constants/DataTypeConstants');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var ExposureSharingConstants = require('../constants/ExposureSharingConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var MouseEventConstants = require('../constants/MouseEventConstants');
var StatusMessageTypeConstants = require('../constants/StatusMessageTypeConstants');
var StudyScorecardConstants = require('../constants/StudyScorecardConstants');
import RouteNameConstants from '../constants/RouteNameConstants';
import PermissionsUtil from "./PermissionsUtil";
import { FeatureListConstants } from "../constants/PermissionsConstants";
import {listOfModules, listOfTags} from "../constants/ModulesFocusTags";
import ExposureNavConstants from "../constants/ExposureNavConstants";
import {taskFieldType} from '../constants/TaskDisplayConstants';
var div = React.createFactory(require('../components/TouchComponents').TouchDiv);
var span = React.createFactory(require('../components/TouchComponents').TouchSpan);
import { getObject, setString } from '../util/SessionStorage';
import { v4 as uuidv4 } from 'uuid';

var Util = {

  // deep comparison with two array of object
  objectsEqual(object1, object2) {
    typeof object1 === 'object' && Object.keys(object1).length > 0
      ? Object.keys(object1).length === Object.keys(object2).length
      && Object.keys(object1).every(val => Util.objectsEqual(object1[val], object2[val]))
      : object1 === object2
  },

  arraysEqual(array1, array2) {
    array1.length === array2.length && array1.every((o, idx) => Util.objectsEqual(o, array2[idx]))
  },

  anyFiltersActive(immFilterStates) {
    return immFilterStates.some(immFilterState => {
      const filterType = immFilterState.get('filterType') || immFilterState.get('dynamicFilterComponentType');
      switch (filterType) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          if (!immFilterState.get('allSelected') && immFilterState.get('itemsSelected').size > 0) {
            return true;
          }
          break;
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          if (!_.isUndefined(immFilterState.get('currentBounds'))) {
            return true;
          }
          break;
      }
    });
  },

  anySessionFiltersActive(currentAccountId) {
    return Util.anyFiltersActive(Util.getSessionFilterStates(currentAccountId));
  },

  capitalizeFirstLetter(string) {
    return _.isEmpty(string) ? '' : string.charAt(0).toUpperCase() + string.slice(1);
  },

  changeCursorStyle(style) {
    $('html, body').css('cursor', style);
  },

  // http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-an-object
  // Underscore's clone is a shallow clone, while this does a deep clone.
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  dateFormat: 'YYYY-MM-DD',
  regexToCheckStringInDateFormat: /[/\-]/,

  dateFormatter(epoch) {
    return epoch ? Moment(parseInt(epoch, 10)).format(Util.dateFormat) : 'N/A';
  },

  // Used when we want to just keep the date in the epoch as is, without localizing it. This doesn't necessarily mean
  // that the date is expected to actually be in UTC.
  dateFormatterUTC(epoch) {
    return epoch ? Moment(parseInt(epoch, 10)).utc().format(Util.dateFormat) : 'N/A';
  },

  dateConverter(dateString) {
    let date = dateString;
    if (date) {
      date = !(Util.regexToCheckStringInDateFormat.test(date)) ? Moment(parseInt(date, 10)).utc().format(Util.dateFormat) : date;
    } else {
      date = 'N/A';
    }

    return date;
  },

  dateSinceFormatter(epoch) {
    if (epoch) {
      var d = Moment(parseInt(epoch, 10));
      // Only return "x ago" format is less than 5 days have passed.
      return (Moment().subtract(5, 'days').isAfter(d)) ?
        d.format('MMM D, YYYY') :
        d.fromNow();
    } else {
      return 'N/A';
    }
  },

  dateTimeFormatter(epoch) {
    return epoch ? Moment(parseInt(epoch, 10)).format('D MMM YY (h:mm A)') : 'N/A';
  },

  dateFormatter(epoch) {
    return epoch ? Moment(parseInt(epoch, 10)).format('D MMM YY') : 'N/A';
  },

  dateFormatterDMMMYYUTC(epoch) {
    return epoch ? Moment(parseInt(epoch, 10)).utc().format('D MMM YY') : 'N/A';
  },

  dateTimeFormaterTask(epoch){
    return epoch ? Moment(parseInt(epoch, 10)).format("YYYY-MM-DD h:mm:ss a") : 'N/A';
  },

  dateTimeFormatterUTC(epoch, attachUTCLabel = false) {
    return epoch ? (epoch.length < 13 ? Moment(parseInt(epoch, 10)).utc().format('hh:mm A') + (attachUTCLabel ? ' UTC' : '') : Moment(parseInt(epoch, 10)).utc().format('D MMM YY (h:mm A)')) + (attachUTCLabel ? ' UTC' : '') : 'N/A';
  },

  dateFormatUTCYYYYMMDDHHmm(epoch) {
    return epoch ? Moment(epoch).utc().format('YYYY-MM-DD, HH:mm') : 'N/A';
  },

  dateFormatDDMMYYHHmm(epoch){
    return epoch ? Moment(epoch).format('DDMMYY-HH:mm') : '';
  },

  datumDisplayValue(data) {
    switch (true) {
      case _.isDate(data):
        // Ensure we display the date in UTC to be consistent with Yutani.
        return data.toUTCString().substring(5, 16);
      default:
        return data;
    }
  },

  downloadFile(url, filename, ext, builtinFilterRequestWrapper, csv) {
    filename += '.' + ext.toLowerCase();

    //this front end export is only useful for tables with less than 1000 rows,
    //dont use this if you need to export a large table
    if (csv != null) {
      var csvFile = new Blob([csv], { type: "text/csv" });

      if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(csvFile, filename);
        return;
      }

      var downloadLink = document.createElement("a");
      downloadLink.download = filename;
      downloadLink.href = window.URL.createObjectURL(csvFile);
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();

      return;
    }
    // The download via transient anchor technique provides a consistent mechanism
    // across all the browsers we need to support.
    // IE and Safari don't support the download attribute (filename) on an anchor, so
    // we need to provide the filename to Scala where it will be used to specify the
    // Content-Disposition response header. Ref: http://caniuse.com/#feat=download.
    //url += '?filename=' + encodeURIComponent(filename);
    url += '/' + encodeURIComponent(filename);
    if (builtinFilterRequestWrapper) {
      url += '?builtinFilters=' + encodeURIComponent(JSON.stringify(builtinFilterRequestWrapper));
    }
    var a = $('<a>').attr('href', url).attr('download', filename).appendTo('body');
    a[0].click();
    a.remove();
  },

  // This is Mozilla's recommended string escape function for regexes.
  escapedRegExp(string, flags) {
    return new RegExp(string.replace(/([.*+?^${}()|\[\]\/\\])/g, '\\$1'), flags);
  },

  fileTypeToURL(fileType) {
    return fileType.toLowerCase() + 's/';
  },

  // This will generate a random key value. There should be little reason to use
  // this in most cases and because of the cost of the random call should be
  // avoided if possible.
  genRandomKeyVal() {
    return 'keyval-' + (Math.random() * 100000 + 1);
  },

  generateUUID() {
    var d = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  get2dCanvasContext(font) {
    var ctx = document.createElement('canvas').getContext('2d');
    if (font) {
      ctx.font = font;
    }
    return ctx;
  },

  constructDropdownData(immFile) {
    if (immFile.get('fileType') !== ExposureAppConstants.FILE_TYPE_FOLDER) {
      let type = immFile.get('fileType') === ExposureAppConstants.FILE_TYPE_REPORT ? ExposureAppConstants.FILE_TYPE_ANALYTICS : immFile.get('fileType');
      return [{
        text: immFile.get('title'),
        id: immFile.get('id'),
        comprehendSchemaId: this.getComprehendSchemaIdFromFile(immFile),
        type: this.pluralize(this.toTitleCase(type))
      }];
    }
  },
  // Gets a Dropdown friendly list of all available Dashboards and Reports for
  // the current user.
  getAllReportsAndDashboards(immExposureStore, returnImmutable) {
    const fileConfigsMap = immExposureStore.get('fileConfigs');
    return this.getAllReportsAndDashboardsFromMap(fileConfigsMap, returnImmutable);
  },

  getAllReportsAndDashboardsFromMap(immFileMap, returnImmutable) {
    const fileTitles = immFileMap.toList().flatMap(this.constructDropdownData, this).sortBy(function (file) {
      return file.text;
    });

    return returnImmutable ? fileTitles : fileTitles.toJS();
  },

  getAllTaskReportsAndDashboards(immExposureStore) {
    const fileIds = immExposureStore.get('tasks').toList().map(immTask => {
      return immTask.getIn(['task', 'coreTaskAttributes', 'reportId'], immTask.getIn(['task', 'coreTaskAttributes', 'dashboardId']));
    }).toJS();

    return _.chain(fileIds)
      .uniq()
      .map(fileId => {
        const immFile = immExposureStore.getIn(['fileConfigs', fileId]);
        if (immFile) {
          return this.constructDropdownData.call(this, immFile)
        }
      })
      .compact()
      .flatten()
      .value();
  },

  // Temporary measure while we have old and new style reports coexisting.
  getComprehendSchemaIdFromFile(immFile, cdmSchema = '') {
    if (immFile) {
      switch (immFile.get('fileType')) {
        case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
          return immFile.get('dashboardSchemaId');
        case ExposureAppConstants.FILE_TYPE_DASHBOARD:
          return immFile.get('dashboardSchemaId');
        case ExposureAppConstants.FILE_TYPE_REPORT || ExposureAppConstants.FILE_TYPE_ANALYTICS:
          return immFile.getIn(['templatedReport', 'comprehendSchemaId'], immFile.getIn(['reportConfig', 'comprehendSchemaId']));
        case ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD:
        case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
          return cdmSchema;
        case ExposureAppConstants.FILE_TYPE_BUILTIN:
          const builtinType = immFile.get('builtinType');
          switch (builtinType) {
            case ExposureAppConstants.BUILTIN_TYPE_SITE_SCORECARD:
            case ExposureAppConstants.BUILTIN_TYPE_SCORECARD:
              return cdmSchema;
            default:
              return '';
          }
      }
    }
  },

  getCurrentPathFromFragment() {
    return decodeURI(
      // We can't use window.location.hash here because it's not
      // consistent across browsers - Firefox will pre-decode it!
      window.location.href.split('#')[1] || ''
    );
  },

  getCurrentTimeMillis() {
    return new Date().getTime();
  },

  getDefaultScaleFactors(immMonitorFile) {
    var scaleFactors = {};
    immMonitorFile.getIn(['monitor', 'metrics']).forEach(immMetric => {
      scaleFactors[immMetric.get('referenceName')] = immMetric.get('scaleFactor').toString()
    });
    return scaleFactors;
  },

  getEventOffsets(e, offsetParent) {
    // From http://www.jacklmoore.com/notes/mouse-position/
    e = e || window.event;

    var target = offsetParent || e.target || e.srcElement,
      rect = target.getBoundingClientRect(),
      offsetX = e.clientX - rect.left,
      offsetY = e.clientY - rect.top;

    return {offsetX: offsetX, offsetY: offsetY};
  },

  getEmptyStudyFilter: (schemaId) => ({
    schemaId,
    cql: ExposureAppConstants.STUDY_SESSION_FILTER_CQL,
    type: 'PROPERTY_COLUMN',
    filterState: {
      allSelected: true,
      freshCookie: true,
      dataType: 'String',
      displayString: 'Study Name',
      dynamicFilterComponentType: ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN,
      itemsSelected: []
    }
  }),

  getSessionFilterStates(currentAccountId) {
    return Imm.List(
      _.map(
        Util.getSessionFiltersFromCookie(currentAccountId).sessionDynamicFilters,
        sFilter => Imm.fromJS(sFilter.filterState ? sFilter.filterState : {filterType: null})
      )
    );
  },

  getUserOrTeamNameFromId(immUsers, immEntities, userOrTeamId) {
    var userName = immUsers.getIn([userOrTeamId, 'fullName']);
    var groupName = immEntities.getIn([userOrTeamId, 'name']);
    return groupName || userName;
  },

  getFileName(immStore, fileId) {
    return immStore.getIn(['files', fileId, 'fileWrapper', 'file', 'title']);
  },

  getFileAssociatedFileIds(immStore, fileId) {
    return immStore.getIn(['files', fileId, 'fileWrapper', 'file', 'associatedFileIds'], Imm.List());
  },

  getFileTypeIconName(fileType, fieIdentifier) {
    switch (fileType) {
      case ExposureAppConstants.FILE_TYPE_REPORT || ExposureAppConstants.FILE_TYPE_ANALYTICS || ExposureAppConstants.FILE_TYPE_BUILTIN:
        switch (fieIdentifier) {
          case ExposureAppConstants.DATA_QUALITY_DASHBOARD:
          case ExposureAppConstants.STUDY_SUMMARY:
          case ExposureAppConstants.PORTFOLIO_SUMMARY:
            return 'icon-dashboard';
          default:
            return 'icon-report';
        }
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        return 'icon-dashboard';
      case ExposureAppConstants.FILE_TYPE_FOLDER:
        return 'icon-folder';
      case ExposureAppConstants.FILE_TYPE_TASK:
        return 'icon-task-alt';
      case ExposureAppConstants.FILE_TYPE_MONITOR:
        return 'icon-alarm-check';
      case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
        return 'icon-table';
      case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
        return 'icon-file';
      case ExposureAppConstants.FILE_TYPE_BUILTIN:
        return 'icon-report';
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
        return 'icon-kpi-studio';
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD:
        return 'icon-kpi-studio-dashboard';
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD:
        return 'icon-oversight-scorecard';
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.BOT_DASHBOARD:
        return 'icon-dalia';
      case ExposureAppConstants.FILE_TYPE_RACT:
        return 'icon-task-alt';
      default:
        return '';
    }
  },

  getRouteNameByFileType(fileType) {
    let routeName;
    switch (fileType) {
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD:
        routeName = RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
        routeName = RouteNameConstants.EXPOSURE_EMBEDDED_KPI_STUDIO_REPORTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_ANALYTICS:
      case ExposureAppConstants.FILE_TYPE_REPORT:
        routeName = RouteNameConstants.EXPOSURE_REPORTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        routeName = RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_BUILTIN:
        routeName = RouteNameConstants.EXPOSURE_BUILTIN_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_MONITOR:
        routeName = RouteNameConstants.EXPOSURE_MONITORS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_FOLDER:
        routeName = RouteNameConstants.EXPOSURE_FOLDERS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
        routeName = RouteNameConstants.EXPOSURE_DATA_REVIEW_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
        routeName = RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_TASK:
        routeName = RouteNameConstants.EXPOSURE_TASKS_SHOW;
        break;
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD:
        routeName = RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD;
        break;
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.BOT_DASHBOARD:
        routeName = RouteNameConstants.EXPOSURE_BOT_DASHBOARD;
        break;
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.BOT_FAQ:
        routeName = RouteNameConstants.EXPOSURE_BOT_DASHBOARD;
        break;
      default:
        console.log('%cERROR: util.getRouteNameByFileType failed', 'color: #E05353');
        break;
    }
    return routeName;
  },

  getFileTypeName(fileType, fileIdentifier) {
    switch (fileType) {
      case ExposureAppConstants.FILE_TYPE_REPORT:
      case ExposureAppConstants.FILE_TYPE_ANALYTICS:
        switch (fileIdentifier) {
          case ExposureAppConstants.DATA_QUALITY_DASHBOARD:
          case ExposureAppConstants.PORTFOLIO_SUMMARY:
          case ExposureAppConstants.STUDY_SUMMARY:
            return Util.toTitleCase(FrontendConstants.DASHBOARD);
          default:
            return Util.toTitleCase(FrontendConstants.ANALYTICS);
        }
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
        return Util.toTitleCase(FrontendConstants.CUSTOM_ANALYTICS);
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        return Util.toTitleCase(FrontendConstants.DASHBOARD);
      case ExposureAppConstants.FILE_TYPE_FOLDER:
        return Util.toTitleCase(FrontendConstants.FOLDER);
      case ExposureAppConstants.FILE_TYPE_MONITOR:
        return Util.toTitleCase(FrontendConstants.MONITOR);
      case ExposureAppConstants.FILE_TYPE_BUILTIN:
        return Util.toTitleCase(FrontendConstants.BUILTIN);
      default:
        return fileType;
    }
  },

  getGuardedCallback(callback) {
    return _.isFunction(callback) ? callback : _.noop;
  },

  getSelectableUsersOrTeams(_immGroupsEntities, _immUsers, currentUserId) {
    var immGroupEntities = _immGroupsEntities.sortBy(function (immGroup) {
      return immGroup.get('name');
    }).map(function (immGroup) {
      return Imm.Map({entity: immGroup, entityType: ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY});
    });
    var immUsers = _immUsers.filter(function (immUser) {
      return immUser.get('id', 'A') !== currentUserId;
    }).sortBy(function (immUser) {
      return immUser.get('fullName');
    }).map(function (immUser) {
      return Imm.Map({entity: immUser, entityType: ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY});
    });
    // immGroupEntities and immUsers are OrderedMaps at this point because we sorted over Map.
    // OrderedMaps can be concatenated, but we need a list to pass into DropdownList.
    return immGroupEntities.concat(immUsers).toList();
  },

  getImmFilteredAccountSeqFromAccountMap(isExposure, immStore) {
    return immStore.get('accountMap', Imm.Map()).filter(function (immAccount) {
      return isExposure && immAccount.get('isRead') || !isExposure && immAccount.get('isAdmin');
    }).valueSeq().sortBy(function (immAccount) {
      return immAccount.getIn(['account', 'displayName']);
    });
  },


  getListOfUserOrTeamNames(immUsers, immEntities, immListOfUsers) {
    return immListOfUsers ? immListOfUsers.map(userId => this.getUserOrTeamNameFromId(immUsers, immEntities, userId)).sortBy(_.identity).toJS() : [];
  },

  // A valid password must meet the following criteria in the following order:
  // (1) has at least 10 characters
  // (2) has at most 72 characters
  // (3) does not contain the user's first or last name or username/email
  // (4) contains a combination of at least 3 of the following characters uppercase letters, lowercase letters, numbers, symbols
  // (5) matches `confirm password`.
  getPasswordErrorMessage(firstName, lastName, username, password, confirmPassword) {
    // TODO: Move this logic to only the backend and rely on 400 Bad Request for validation.
    if (Util.isWhiteSpaceOnly(password)) {
      return FrontendConstants.REQUIRED_FIELD_ERROR_MESSAGE;
    }
    if (_.size(password) < 10) {
      return FrontendConstants.AT_LEAST_10_CHARACTERS;
    }
    if (_.size(password) > 72) {
      return FrontendConstants.AT_MOST_72_CHARACTERS;
    }

    if (Util.isWhiteSpaceOnly(firstName)) {
      return FrontendConstants.FIRST_NAME_EMPTY_IN_PASSWORD;
    }
    if (Util.isWhiteSpaceOnly(lastName)) {
      return FrontendConstants.LAST_NAME_EMPTY_IN_PASSWORD;
    }

    // Password shouldn't include either the full username/email or the part before the `@`.
    var nonPasswordFields = [firstName, lastName, username, username.split('@')[0]];
    var containedNonPasswordFields = _.filter(nonPasswordFields, function (field) {
      return password.toLowerCase().indexOf(field.toLowerCase()) > -1;
    });
    if (_.size(containedNonPasswordFields) > 0) {
      return FrontendConstants.CANNOT_CONTAIN_OTHER_FIELDS;
    }

    // Matches lowercase letter, uppercase letter, number, and ascii symbol.
    var characterTypeRegexes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[!-/:-@\[-`{-~]/];
    var characterTypeRegexesMatched = _.filter(characterTypeRegexes, function (regex) {
      return regex.test(password);
    });
    if (_.size(characterTypeRegexesMatched) < 3) {
      return FrontendConstants.AT_LEAST_3_CHARACTER_TYPES;
    }

    if (password !== confirmPassword) {
      return FrontendConstants.PASSWORD_AND_CONFIRM_PASSWORD_NOT_MATCH;
    }
  },

  getOversightScorecard(immExposureStore) {
    const immAppConfig = comprehend.globals.immAppConfig;
    if (AccountUtil.hasOversightScorecard(immAppConfig)
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.OVERSIGHT_SCORECARD)) {
      return immExposureStore.get('oversightReport').toJS();
    }
  },

  getBotUrl() {
    const immAppConfig = comprehend.globals.immAppConfig;
    return immAppConfig.get('vaUrl')
  },

  getAccountName() {
    const immAppConfig = comprehend.globals.immAppConfig;
    const data = immAppConfig.get('currentAccountId')
    const name = immAppConfig.get('accountMap').toJS()
    return name[data].account.name

  },

  getUserInfo() {
    const immAppConfig = comprehend.globals.immAppConfig;
    return immAppConfig.get('userInfo').toJS();
  },

  getQueryObject(queryString) {
    var queryObject = {};
    queryString.replace(/([^?=&]+)(=([^&]*))?/g, function ($0, $1, $2, $3) {
      queryObject[$1] = $3;
    });
    return queryObject;
  },

  getTextWidth(ctx, text) {
    return ctx.measureText(text).width;
  },

  getUserFullName(immUsers, userId) {
    return immUsers.getIn([userId, 'fullName']);
  },

  getUserByUserEntityId(immStore, userEntityId) {
    return immStore.getIn(['users', immStore.getIn(['userEntities', userEntityId])]);
  },

  getUsersByGroupEntityId(immStore, groupEntityId) {
    return immStore.getIn(['groupEntities', groupEntityId, 'userEntityIds'], Imm.List())
      .map(Util.getUserByUserEntityId.bind(null, immStore));
  },

  getUserStatus(immUserWrapper) {
    switch (immUserWrapper.getIn(['userEntity', 'userEntityState'])) {
      case ExposureSharingConstants.ACTIVE:
        return immUserWrapper.getIn(['user', 'isLocked'], false) ?
          // Do not show the user as locked unless they are already active on the account.
          {icon: 'icon-lock', text: FrontendConstants.LOCKED} :
          {icon: 'icon-checkmark-full', text: FrontendConstants.USER_STATUS_ACTIVE};
      case ExposureSharingConstants.INACTIVE:
        return {text: FrontendConstants.USER_STATUS_INACTIVE};
      case ExposureSharingConstants.PENDING_CONFIRMATION:
        // If expiration is after now, the user is pending.
        if (Moment().isBefore(
          parseInt(immUserWrapper.getIn(['accountConfirmation', 'lastSentAt']), 10) +
          parseInt(immUserWrapper.getIn(['accountConfirmation', 'expiryTimeoutMillis']), 10))) {
          return {text: FrontendConstants.USER_STATUS_PENDING};
        } else {
          return {icon: 'icon-WarningCircle', text: FrontendConstants.USER_STATUS_LINK_EXPIRED};
        }
      case ExposureSharingConstants.LINK_EXPIRE:
        return {icon: 'icon-WarningCircle', text: FrontendConstants.USER_STATUS_LINK_EXPIRED};
    }
  },

  getWidestFont: _.memoize(function () {
    // Fonts may load after a component has been rendered and there doesn't seem to be
    // a reliable way to catch the font load event. Instead, we determine the width of the
    // widest font in the body's font-family list and use that font for calculations.
    var ctx = this.get2dCanvasContext();
    var fonts = $(document.body).css('font-family').split(',');
    return _.reduce(fonts, function (memo, font) {
      ctx.font = 'normal 14px ' + font;
      var width = ctx.measureText('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
      if (!memo.width || width > memo.width) {
        memo.width = width;
        memo.font = font;
      }
      return memo;
    }, {}).font;
  }),

  getStudyIdFromName(immExposureStore, studyName) {
    const immStudies = immExposureStore.get('studies', Imm.Map());
    const studyNameUppercase = studyName.toUpperCase();
    return immStudies.findKey(study => {
      const searchStudyName = study.get('value').toUpperCase();
      return searchStudyName === studyNameUppercase;
    });
  },

  hasPrivilegeCapability(privilegeCapability) {
    return _.contains([ExposureSharingConstants.YES_CAN_REVOKE, ExposureSharingConstants.YES_CANNOT_REVOKE], privilegeCapability);
  },

  hasStudyFilter(currentAccountId) {
    const sessionDynamicFilters = this.getSessionFiltersFromCookie(currentAccountId).sessionDynamicFilters;
    const hasFilters = sessionDynamicFilters && sessionDynamicFilters[0]
      && sessionDynamicFilters[0].cql === ExposureAppConstants.STUDY_SESSION_FILTER_CQL;

    return hasFilters;
  },

  immPluck(key) {
    return function (immMap) {
      return immMap.get(key);
    }
  },

  isCDMFile(immExposureStore, immFile) {
    const cdmSchemaId = immExposureStore.getIn(['cdmSchemaIds', 0], '');
    const schemaId = Util.getComprehendSchemaIdFromFile(immFile, cdmSchemaId);
    return immExposureStore.get('cdmSchemaIds', Imm.List()).contains(schemaId);
  },

  // This aligns with `MediaQueryConstants.js` and `_media-breakpoints.scss`.
  isDesktop() {
    var windowWidth = $(window).width();
    return windowWidth >= 1025;
  },

  isIE() {
    return !!document.documentMode;
  },

  isHomeRouteActive(routes) {
    return this.isRouteActive(routes, RouteNameConstants.EXPOSURE_HOME);
  },

  // http://stackoverflow.com/a/7557433.
  // Check if an element is in viewport. Note: element should be a jquery element.
  isInViewport($element) {
    var rect = $element && $element.getBoundingClientRect();
    return (
      rect &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
    );
  },

  // This aligns with `MediaQueryConstants.js` and `_media-breakpoints.scss`.
  isMobile() {
    var windowWidth = $(window).width();
    return windowWidth >= 0 && windowWidth <= 767;
  },

  // A node is "in-scope" if it is contained in the search results and has also
  // been checked.
  isNodeInBatchEditScope(immNode) {
    return immNode.get('inSearch') && immNode.get('batchEditCheckboxState');
  },

  // A node is "in-scope" if it is contained in the search results and has also
  // been checked.
  isNodeInScope(immNode) {
    return immNode.get('inSearch') && immNode.get('checkboxState');
  },

  // This aligns with `MediaQueryConstants.js` and `_media-breakpoints.scss`.
  isNotDesktop() {
    return $(window).width() <= 1024;
  },

  isOpenTask(immTask) {
    return immTask.getIn(['coreTaskAttributes', 'taskState', 'taskStateKind']) === ExposureAppConstants.TASK_STATE_OPEN;
  },

  isPortrait() {
    return window.orientation === 0 || window.orientation === 180;
  },

  isPositiveInteger(str) {
    return /^\d+$/.test(str) && parseInt(str, 10) > 0;
  },

  // Checks to see if the MouseEvent is due to a simple left
  // click. Only true if the button clicked is the primary button, and
  // no modifier keys are pressed.
  isSimpleLeftClick(e) {
    var isLeftButton = e.button === MouseEventConstants.LEFT_BUTTON_CLICK;
    return isLeftButton &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey;
  },

  isRouteActive(routes, routeName) {
    return _.find(routes, route => route.name === routeName);
  },

  // Note: This function is only applicable to CDM schemas.
  // The assumption is the `study` table long name is `Study` and the `studyname` column long name is `Study Name`.
  // TODO: Update `QueryEngine` to supply shortName to make this less brittle.
  isStudyColumn(immColumn) {
    return immColumn && immColumn.get('nodeDisplayString') === ExposureAppConstants.STUDY_SESSION_FILTER_TABLE_LONG_NAME
      && immColumn.get('displayString') === ExposureAppConstants.STUDY_SESSION_FILTER_COLUMN_LONG_NAME;
  },

  // Lifted regex from play.api.data.validation.Constraint (https://github.com/playframework/playframework/blob/master/framework/src/play/src/main/scala/play/api/data/validation/Validation.scala)
  isValidEmail(email) {
    return /^^[a-zA-Z0-9\.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(email);
  },

  isWhiteSpaceOnly(str) {
    return _.isEmpty((str || '').trim());
  },

  isValidTitle(title) {
    return title.length <= ExposureAppConstants.FILE_TITLE_MAX_LENGTH;
  },

  isISO8601RepeatingInterval(interval) {
    /**
     * source: https://stackoverflow.com/questions/21686539/regular-expression-for-full-iso-8601-date-syntax
     *
     * technical ISO8601 specifies 4 forms of interval, we & Chronos only support the first form: <start>/<duration>
     *
     * note: keep validation in-sync with backend validation in ServiceActor.scala#validateISO8601RepeatingInterval
     */
    return /^R\d*\/([\+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24\:?00)([\.,]\d+(?!:))?)?(\17[0-5]\d([\.,]\d+)?)?([zZ]|([\+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?\/P(?=\w*\d)(?:\d+Y|Y)?(?:\d+M|M)?(?:\d+W|W)?(?:\d+D|D)?(?:T(?:\d+H|H)?(?:\d+M|M)?(?:\d+(?:\­.\d{1,2})?S|S)?)?$/.test(interval);
  },

  packagePageSettings(query) {
    var pageSizeStr = query.pageSize;
    var pageNumStr = query.page;
    var pageSettings = {
      page: parseInt(pageNumStr, 10),
      pageSize: parseInt(pageSizeStr, 10)
    };
    var sortColumn = query.sortColumn;
    var sortOrdering = query.sortOrdering;
    if (sortColumn && sortOrdering) {
      _.extendOwn(pageSettings, {sortColumn: sortColumn, sortOrdering: sortOrdering});
    }
    return pageSettings;
  },

  // TODO: Potentially making sorting adjustable.
  // Take a list of EntityPrivileges and group them by GROUP_ENTITY vs USER_ENTITY, then sort them and
  // map the results with a callback function. The callback function should expect:
  // callback(Imm.Map( entityPrivilegs -> immEntityPrivilege, [groupEntity: immGroupEntity, users: immUsers] OR [user: immUser] )).
  parseAndGroupEntityPrivileges(immExposureStore, immEntityPrivileges, callback) {
    // Group into 'GROUP_ENTITY' -> List(immEntityPrivileges), 'USER_ENTITY' -> List(immEntityPrivileges).

    var immGroupedEntityPrivileges = immEntityPrivileges.groupBy(function (immEntityPrivilege) {
      return immEntityPrivilege.get('entityType');
    });
    return immGroupedEntityPrivileges.map(function (immEntityPrivileges, key) {
      switch (key) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          return immEntityPrivileges.map(function (immEntityPrivilege) {  // Find the groupEntity in the store, and build the returned Map.
            var immGroupEntity = immExposureStore.getIn(['groupEntities', immEntityPrivilege.get('entityId')]);
            var immUsers = immGroupEntity ? Util.getUsersByGroupEntityId(immExposureStore, immGroupEntity.get('id')) : null;
            return Imm.Map({entityPrivileges: immEntityPrivilege, groupEntity: immGroupEntity, users: immUsers});
          }).filter(function (immMap) {
            return !!immMap.get('groupEntity');
          })  // Remove any undefineds or nulls from the list.
            .sortBy(function (immMap) {
              return immMap.getIn(['groupEntity', 'name']);
            })  // Assume sorting by name.
            .map(callback);
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          return immEntityPrivileges.map(function (immEntityPrivilege) {  // Find the user in the store, and build the returned Map.
            var immUser = Util.getUserByUserEntityId(immExposureStore, immEntityPrivilege.get('entityId'));
            return Imm.Map({entityPrivileges: immEntityPrivilege, user: immUser});
          }).filter(function (immMap) {
            return !!immMap.get('user');
          })  // Remove any undefineds or nulls from the list.
            .sortBy(function (immMap) {
              return immMap.getIn(['user', 'firstLastName']);
            })  // Assume sorting by First Last name.
            .map(callback);
      }
    });
  },

  // Maps a list of privileges ['read', 'edit'...] to a an object of privilegeType to boolean describing if the user has that privilege.
  parsePrivilegeCapabilities(privs, immEntityPrivileges) {
    return _.reduce(privs || [], function (memo, priv) {
      var privilegeCapability = immEntityPrivileges.getIn([priv, 'privilegeCapability']);
      memo[priv] = Util.hasPrivilegeCapability(privilegeCapability);
      return memo;
    }, {});
  },

  // PostgreSQL identifiers can include double quotes, but the backend will not
  // consider them valid unless they have been escaped.
  pgEscapeDoubleQuote(identifier) {
    return identifier.replace(/"/g, '""');
  },

  pluralize(str) {
    if (str && str.slice(-1) !== 's') {
      return str + 's';
    } else {
      return str;
    }
  },

  privilegeCapabilityIsFixed(privilegeCapaibilty) {
    return _.contains([ExposureSharingConstants.YES_CANNOT_REVOKE, ExposureSharingConstants.NO_CANNOT_GRANT], privilegeCapaibilty);
  },

  privilegeRequestIsActionable(privilegeCapability, privilegeRequest) {
    return privilegeCapability === ExposureSharingConstants.YES_CAN_REVOKE && privilegeRequest === ExposureSharingConstants.REVOKE ||
      privilegeCapability === ExposureSharingConstants.NO_CAN_GRANT && privilegeRequest === ExposureSharingConstants.GRANT;
  },

  round(number, decimalPlaces) {
    var scale = Math.pow(10, decimalPlaces);
    return Math.round(number * scale) / scale;
  },

  rowFormatter(immRow, immColumns) {
    return immRow.map(function (value, index) {
      var dataType = immColumns.getIn([index, 'dataType']);
      return Util.valueFormatter(value, dataType);
    });
  },

  // If a dynamic filter has been applied to a report/dashboard and a user
  // navigates to that report or dashboard we want to open the filter pane so
  // that the user can quickly see which non-static filters they currently have
  // applied to the data.
  shouldFilterPaneBeOpened(fileId, immExposureStore) {
    // Is the filter pane open already? If so then carry on, nothing to see here.
    if (!immExposureStore.get('showFiltersPane', false)) {
      // Iterate over the dynamic filters to see if any
      // are active. If so then we need to open the filter pane.
      let openFilterPane = Util.anyFiltersActive(immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List()));
      if (openFilterPane) {
        ExposureActions.toggleFiltersPane();
      }
    }
  },

  // Do a simple sort of the list, based on the type of the
  // values.
  simpleSort(list) {
    return _.sortBy(list, function (value) {
      return value;
    });
  },

  singularOrPlural(number, strings) {
    return number === 1 ? strings.singular : strings.plural;
  },

  strcmp(str1, str2) {
    return str1 < str2 ? -1 : (str1 > str2 ? 1 : 0);
  },

  sum(list) {
    return _.reduce(list, function (memo, i) {
      return memo + i;
    }, 0);
  },

  toTitleCase(str) {
    return _.map(str.split(/[ _]/), function (s) {
      return s.substr(0, 1).toUpperCase() + s.substr(1).toLowerCase();
    }).join(' ');
  },

  validDate(inputDate) {
    return Moment(inputDate, ['YYYY-MM-DD'], true).isValid();
  },

  // Determines if the input date is today or after.
  validFutureDate(inputDate) {
    var parsedDate = Moment(inputDate, ['YYYY-MM-DD'], true);  // Use strict parsing.
    return Util.validFutureMoment(parsedDate);
  },

  validFutureEpochString(epochString) {
    return Util.validFutureMoment(Moment(parseInt(epochString, 10)));
  },

  validFutureMoment(moment) {
    return moment.isValid() && moment.isAfter(Moment().startOf('day').subtract(1, 'ms'));
  },

  validSessionFilters(dynamicFilters, staticFilters) {
    if (!dynamicFilters || !staticFilters) {
      return false;
    }
    return _.every(dynamicFilters.concat(staticFilters), function (filterResult) {
      return filterResult.valid;
    });
  },

  valueFormatter(value, dataType) {
    if (value === ExposureAppConstants.NULL) {
      return value;
    }
    switch (dataType) {
      case DataTypeConstants.DATE:
        return Util.dateFormatterUTC(value);
      case DataTypeConstants.DATETIME:
        return Util.dateTimeFormatterUTC(value);
      // This is used to render clickable links in tabular reports, written to be used by the builtin tasks KPI listing.
      case DataTypeConstants.LINK:
        return {to: value};
      default:
        return value;
    }
  },

  valueParser(value, dataType) {
    switch (dataType) {
      case DataTypeConstants.DATE:
      case DataTypeConstants.DATETIME:
      case DataTypeConstants.INTEGER:
        return parseInt(value, 10);
      case DataTypeConstants.DECIMAL:
        return parseFloat(value);
      default:
        return value;
    }
  },

  packageFilterCondition(immFilterState) {
    var immFilterCondition = immFilterState.delete('column');
    if (immFilterState.get('filterType') === ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER) {
      var immCurrentBounds = immFilterState.get('currentBounds');
      immFilterCondition = immFilterCondition.merge({
        lower: immCurrentBounds ? immCurrentBounds.get(0).toString() : undefined,
        upper: immCurrentBounds ? immCurrentBounds.get(1).toString() : undefined,
        itemsSelected: []
      });
    }
    return Imm.fromJS({
      dynamicFilterPropertyColumn: immFilterState.get('column'),
      dynamicFilterCondition: immFilterCondition
    });
  },

  getFullSessionStaticFilters: (sessionFilter) => ({
    schemaId: sessionFilter.schemaId,
    sessionStaticFilterCql: sessionFilter.cql
  }),

  getFullSessionDynamicFilters(sessionFilter) {
    var filterState = sessionFilter.filterState;
    if (filterState && !filterState.itemsSelected) {
      filterState = _.extend({itemsSelected: []}, filterState);
    }
    return {
      schemaId: sessionFilter.schemaId,
      sessionDynamicFilterCql: sessionFilter.cql,
      sessionDynamicFilterCondition: filterState
    };
  },

  getOpenTasksCount(immTasks) {
    var immTasksToFilter = immTasks || Imm.List();
    return immTasksToFilter.filter(immTaskWrapper => this.isOpenTask(immTaskWrapper.get('task'))).size;
  },

  getNewNumericInputBoxValue(originalValue, changeType) {
    var newValue = null;
    var decimals = originalValue.split('.')[1];
    var numDecimalDigits = decimals ? decimals.length : 0;
    var diff = Math.pow(0.1, numDecimalDigits);
    switch (changeType) {
      case ExposureAppConstants.NUMERIC_INPUT_BOX_INCREMENT:
        newValue = parseFloat(originalValue) + diff;
        break;
      case ExposureAppConstants.NUMERIC_INPUT_BOX_DECREMENT:
        newValue = parseFloat(originalValue) - diff;
        break;
    }
    // This is done to accommodate for inaccurate float addition/subtraction.
    return newValue.toFixed(numDecimalDigits);
  },

  getTooltipClasses: function (header, content, placement, width, overlayClassName) {
    return {
      arrowContent: div({className: 'rc-tooltip-arrow-inner'}),
      placement: placement,
      overlay: div({
        className: 'overlay',
        style: {width: width ? width + 'px' : null}
      }, header ? span({className: 'header'}, header) : null, content),
      overlayClassName: overlayClassName
    };
  },

  getSessionFiltersFromCookie(currentAccountId, cookies, schemaId) {
    const sessionFilters = (cookies ? cookies.sessionFilters : Cookies.get('sessionFilters'));
    // Parse JSON if we've got anything.
    const parsedSessionFilters = _.isEmpty(sessionFilters) ? null : JSON.parse(sessionFilters);
    // If session filters existed, and we have ones for this account, return those.
    // Otherwise, a fresh and empty session filters object.
    return parsedSessionFilters &&
    _.has(parsedSessionFilters, currentAccountId)
      ? parsedSessionFilters[currentAccountId]
      : {
        sessionStaticFilters: [],
        sessionDynamicFilters: [Util.getEmptyStudyFilter(schemaId)],
      };
  },

  getSessionDynamicFiltersCount: (cookies, currentAccountId) => Util.getSessionFiltersFromCookie(currentAccountId, cookies).sessionDynamicFilters.length,

  getSessionFilterCookieEntry(cookies, index, currentAccountId) {
    var sessionFilters = Util.getSessionFiltersFromCookie(currentAccountId, cookies);
    return sessionFilters.sessionDynamicFilters[index];
  },

  getSessionFilterStudyNames(cookies, currentAccountId) {
    const entry = Util.getSessionFilterCookieEntry(cookies, 0, currentAccountId);
    const names = entry && entry.filterState && entry.filterState.itemsSelected;

    return names || [];
  },

  getYellowfinStudyCacheFilters(currentAccountId, contentId) {
    const studyCacheFiltersCrossAccounts = _.isEmpty(Cookies.get('studyCacheFilters')) ? null : JSON.parse(Cookies.get('studyCacheFilters'));
    const studyCacheFilters = studyCacheFiltersCrossAccounts && _.has(studyCacheFiltersCrossAccounts, currentAccountId) ? studyCacheFiltersCrossAccounts[currentAccountId] : {}
    return studyCacheFilters && _.has(studyCacheFilters, contentId) ? studyCacheFilters[contentId] : {};
  },

  isNumberString: function (numberString) {
    return !isNaN(parseFloat(numberString)) && isFinite(numberString);
  },

  isDecimal: function (num) {
    return num % 1 !== 0;
  },

  countDecimalPlaces: function (num) {
    var pieces = num.toString().split(".");
    return pieces[1] ? pieces[1].length : 0;
  },

  // The function takes a decimal number and limit the # of decimal places and add '...'.
  // If `num` has less decimal places than the limit, just returns a string form of the number.
  limitDecimalPlaces: function (num, limit) {
    var decimalPlacesCount = this.countDecimalPlaces(num);
    var numString = num.toString();
    if (decimalPlacesCount > limit) {
      return numString.substring(0, numString.indexOf('.') + limit + 1) + '...';
    } else {
      return numString;
    }
  },

  // Takes current https://host:port and appends /in-app-help/ then replaces space with underscore
  formatHelpLink(fileName) {
    const htmlPath = fileName
      ? `/help/${fileName.replace(/ /g, '_')}.html`
      : '/help/docs/index.html';
    return $(location).attr('origin') + htmlPath;
  },

  formatInAppHelpLink() {
    return $(location).attr('origin') + '/help/docs/index.html';
  },

  toPercentStr(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return `${value >= 0 ? '+' : ''}${value}`;
  },

  showPercentFormat(value, showPlusSign) {
    if (value === undefined || value === null) {
      return '';
    }

    let val = value * 100.0;
    if (showPlusSign) {
      return (value >= 0) ? ('+' + val.toFixed(2) + '%') : (val.toFixed(2) + '%');
    } else {
      return val.toFixed(2) + '%';
    }
  },

  showPercentFormatWithSignificant(value, showPlusSign, numSignificantNumber) {
    numSignificantNumber = numSignificantNumber ? parseInt(numSignificantNumber) : 3;
    if (value === undefined || value === null) {
      return '';
    }

    let val = value * 100.0;
    if (showPlusSign) {
      return (value >= 0) ? ('+' + this.numberSignificant(val, numSignificantNumber) + '%') : (this.numberSignificant(val, numSignificantNumber) + '%');
    } else {
      return this.numberSignificant(val, numSignificantNumber) + '%';
    }
  },

  showPercentFormatUserInput(value, showPlusSign) {
    if (value === undefined || value === null) {
      return '';
    }

    let val = value * 100.0;
    if (showPlusSign) {
      return (value >= 0) ? ('+' + val + '%') : (val + '%');
    } else {
      return val + '%';
    }
  },

  millisToDays(millis) {
    return Math.round(millis / 3600000 / 24);
  },

  dateDisplayString(epoch) {
    const [, day, month, year] = (new Date(epoch)).toUTCString().split(' ');
    return !epoch ? 'Unknown' : `${month} ${day}, ${year}`;
  },

  numberSignificant(num, numSignificantNumber) {
    if (num === undefined || num === null) {
      return '';
    }

    function round(value, decimals) {
      return Number(Math.round(value + "e" + decimals) + "e-" + decimals);
    }

    numSignificantNumber = (numSignificantNumber != null) ? parseInt(numSignificantNumber) : 3;

    let fixNumStr = num.toFixed(20);
    const [integerPart, decimalPart] = fixNumStr.split('.');

    if (numSignificantNumber < 1) {
      return Number(integerPart);
    }

    if (num >= 1 || num <= -1 || num === 0) {
      return round(num, numSignificantNumber);
    }

    if (decimalPart && decimalPart.length > 0 && fixNumStr.indexOf('e') < 0) {
      let [entire, zeros, digs] = decimalPart.match(/\.?(0*)([^0].*)/);

      let zeros_length = 0;
      if (zeros && zeros.length > 0) {
        zeros_length = zeros.length;
      }
      return round(num, zeros_length + numSignificantNumber);
    }
    return fixNumStr;
  },

  formatPlanValueOrKPIScoreToDisplay(value, kpiid, isPlanValue) {
    if (value === undefined || value === null) {
      return '';
    }

    if (StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kpiid]) {
      return (isPlanValue ? value * 100 : this.numberSignificant(value * 100)) + '%'
    } else {
      return (isPlanValue ? value : this.numberSignificant(value));
    }
  },

  // Simple string hashing function - source - http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
  simpleHash(inputString) {
    let hash = 0;
    if (inputString.length === 0) return hash;

    for (let i = 0; i < inputString.length; i++) {
      let char = inputString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  },

  buildFixedDataTableParams: function (pageSettings) {
    const length = pageSettings.pageSize;
    const beginIdx = (pageSettings.page - 1) * length;
    const sortBy = pageSettings.sortColumn;
    const order = pageSettings.sortOrdering;
    const params = {begin: beginIdx, length: length};

    if (sortBy && order) {
      params.sortby = sortBy;
      params.order = order;
    }

    return $.param(params);
  },

  getUserEntityId(immStore) {
    const userId = immStore.getIn(['userInfo', 'id']);
    return immStore.getIn(['users', userId, 'userEntityId']);
  },

  getStudyId(immExposureStore) {
    const sessionFiltersFromCookie = Util.getSessionFiltersFromCookie(immExposureStore.get('currentAccountId'));
    const dynamicSessionFilter = Util.getFullSessionDynamicFilters(sessionFiltersFromCookie.sessionDynamicFilters[0]);
    if (immExposureStore.get('studies')) {
      const data = immExposureStore.get('studies').toJS();
      let studies = [];
      let selectedValues = dynamicSessionFilter.sessionDynamicFilterCondition.itemsSelected;

      Object.entries(data).map(([key, value]) => {
        if (selectedValues.length === 0 || selectedValues.includes(value.value)) {
          studies.push(key);
        }
      });
      if (dynamicSessionFilter.sessionDynamicFilterCondition.allSelected) {
        Object.entries(data).map(([key, value]) => {
          studies.push(key);
        });
        return studies;
      } else if (studies.length > 0) {
        return studies;
      }
    }
  },

  // Fetch the data-drilldown attribute and based on drilldown data redirect to particular dashboard
  drilldownToSpecificDashboard(that, thisClass, openInNewTab = false) {
    // get dataset from data-drilldown attribute
    let drilldown = JSON.parse(that);
    ExposureActions.drilldownUpdateCurrentSelectionCondition(thisClass.props.reportId, null, [drilldown]);

    // Declare back params
    let backId = thisClass.props.dashboardId || (thisClass.props.immReport && thisClass.props.immReport.getIn(['fileWrapper', 'file', 'id']));
    let backRoute = thisClass.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
    let backParams = {fileId: backId};
    let backText = thisClass.props.dashboardId ? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

    // Declare drilldown params
    let checkNoTooltip = thisClass.props.immAssociatedFiles.get('noTooltip') ? true : false
    let drilldownmap = checkNoTooltip ? (thisClass.props.immAssociatedFiles.get('noTooltip', thisClass.props.immAssociatedFiles || (Imm.Map()).entrySeq().first())) || [] : thisClass.props.immAssociatedFiles;
    let fileType, toRoute;
    drilldownmap.mapEntries(([drilldownFileId, immDrilldownFile]) => {
      if (!checkNoTooltip) {
        [drilldownFileId, immDrilldownFile] = (immDrilldownFile.get('noTooltip', immDrilldownFile || Imm.Map()).entrySeq().first()) || [];
      }
      fileType = immDrilldownFile && immDrilldownFile.get('fileType')
      // Ensure the data-drilldown selection is on the current DOM node to prevent race condition while
      // different Highchart component unmounts.
      toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW
      let drilldownFileData = immDrilldownFile.toJS();
      toRoute = this.setNavigateRoutes(drilldownFileData, toRoute);
      _.defer(thisClass.transitionToRelated.bind(null, toRoute, drilldownFileId, null, backRoute,
        backParams, backText, openInNewTab));
      ExposureActions.toggleFiltersPane(true)
    });
  },

  setCorrespondingModulesAndTags(modules, tags) {
    let moduleInRank = [];
    let tagIndex =0 ;
    tags.forEach((tag) => {
      let tagDetails = listOfTags.filter((t) => {
        if (t.text)
          return tag === t.text;
      });
      if(tag === 'Study') {
        tagIndex = tagIndex+1;
      }
      let moduleDetailsForTag = listOfModules.filter((m) => {
        if(tagIndex === 2){
          return m.value === tagDetails[1].module;
        } else if (tagIndex === 1 && modules && modules.length === 1) {
          return modules.indexOf(m.text) != -1;
        } else {
          return m.value === tagDetails[0].module;
        }
      });
    
      let rank = {
        module: moduleDetailsForTag[0].text,
        tag: tagDetails[0].text
      };

      moduleInRank.push(rank);
    });
    return moduleInRank;
  },

  setCorrespondingModules(modulesList, tags) {
    let modules = [];
    let tagIndex =0 ;
  
    if(tags && tags.length) {
     tags.forEach((tag) => {
       let tagDetails = listOfTags.filter((t) => {
         if (t.text)
           return tag === t.text;
       });
       if(tag === 'Study') {
        tagIndex = tagIndex+1;
       }
       let moduleDetailsForTag = listOfModules.filter((m) => {
         if(tagIndex === 2){
           return m.value === tagDetails[1].module;
         } else if (tagIndex === 1 && modulesList && modulesList.length === 1) {
           return modulesList.indexOf(m.text) != -1;
         } else {
           return m.value === tagDetails[0].module;
         }
       });
        modules.push(moduleDetailsForTag[0].text);
      });
    } 
    return modules;
  },

  updateRankConfig(fileWrapper) {
    let tagsList = fileWrapper.file.tags;
    let rankList = fileWrapper.file.rank;
    let modulesList = fileWrapper.file.modules; 
    let updatedModulesObject = this.setCorrespondingModules(modulesList, tagsList); 
    let updatedRanks = this.setCorrespondingModulesAndTags(modulesList, tagsList);
    let updatedRanksDetails= this.updateRankDetails(updatedRanks, rankList);
    fileWrapper.file.rank = updatedRanksDetails;
    fileWrapper.file.modules = updatedModulesObject;
    return fileWrapper;
  },

  updateRankDetails(updatedRanks, oldRankList) {
    if(oldRankList) {
     for(let i = 0; i< updatedRanks.length; i++){
       let oldRankDetails = oldRankList.filter((oldRank) => {
         return updatedRanks[i].module === oldRank.module && oldRank.rank
       });
       if(oldRankDetails && oldRankDetails.length) {
         updatedRanks[i].rank = oldRankDetails[0].rank;
       } else {
         updatedRanks[i].rank = 0;
       }
     }
     return updatedRanks;
   }
   return updatedRanks;
  },

  setNavigateRoutes(drilldownFileData, toRoute) {
    let isOperationalInsideModule = drilldownFileData.modules && drilldownFileData.modules.includes(ExposureNavConstants.EXPOSURE_OPERATIONS_INSIGHTS_TAB);
    let toNewRoute = isOperationalInsideModule ? RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS :
      drilldownFileData.modules.includes(ExposureNavConstants.EXPOSURE_CLINICAL_INSIGHTS_TAB) ? RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS :
        toRoute;
    return toNewRoute;
  },

  // convert string to camel case
  toCamelCase(str) {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
  },

  //sort the task metadata according to the sequence
  getSortedTaskMetadata(taskMetadata) {
    let metadata = {};
    Object.entries(taskMetadata).map(([key, value]) => {
      if (Array.isArray(value)) {
        value = value.sort((a, b) => a.fieldSeq - b.fieldSeq);
      }
      metadata[key] = value
    });
    return metadata;
  },

  //check if the current value is a valid JSON
  checkIfJSON(str) {
    if (typeof (str) !== 'string') {
      return false;
    }
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  },

  //check if the selected attribute is multiselect
  attributeIsMultiSelect(taskMetadata, attributeName, taskType) {
    const taskConfig = taskMetadata.get('taskConfig').toJS();
    const taskConfigType = taskConfig.taskAttributes[taskType];
    const task = taskConfigType.find(task => task.fieldId === attributeName);
    return task && task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN
  },

  getFilterDependency (clinicalAttributes) {
    const filterDependencies = [];
    clinicalAttributes.map(attribute => {
      let result = [];
      if(attribute.dependOnAttributes.length !== 0){
        result = this.getDependentAttributes(attribute,result,clinicalAttributes);
      };
      filterDependencies.push({key:attribute.clinicalDbDetail.column,list :result});
    })
    return filterDependencies;
  },

  getDependentAttributes(attribute,dependent,clinicalAttributes) {
    attribute.dependOnAttributes.map(depends => {
      const dependentObj = clinicalAttributes.find(a => a.fieldId === depends);
      const isDependentPresent = dependent.some(field => field === dependentObj.clinicalDbDetail.column);
      !isDependentPresent && dependent.push(dependentObj.clinicalDbDetail.column);
      this.getDependentAttributes(dependentObj, dependent, clinicalAttributes);
    })
    return dependent
  },

  getNavigation: function () {
    let navigate = 'home'
    if (window.location.href.includes('operations-insights')) {
      navigate = '/operations-insights'
    } else if (window.location.href.includes('clinical-insights')) {
      navigate = '/clinical-insights'
    } else if (window.location.href.includes('ract')) {
      navigate = '/ract'
    } else if (window.location.href.includes('oversight-scorecard')) {
      navigate = '/oversight-scorecard'
    } else if (window.location.href.includes('kpi-studio')) {
      navigate = '/embedded/kpi-studio'
    } else if (window.location.href.includes('favorites')) {
      navigate = '/home/favorites'
    }
    return navigate;
  },

  getApplicationName: function (param) {
    var appName = "Analytics"
    
    return appName;
  },

  getClientIdOfModule: function () {
    const immAppConfig = comprehend.globals.immAppConfig;
    let modulesClientId = immAppConfig.get('openIdClientId')
    const clientIdUiRouterNameMapping = immAppConfig.get('clientIdUiRouterNameMapping', {})
    if (window.location.href.includes('operations-insights')) {
      modulesClientId = clientIdUiRouterNameMapping.get('operations-insights', modulesClientId)
    } else if (window.location.href.includes('clinical-insights')) {
      modulesClientId = clientIdUiRouterNameMapping.get('clinical-insights', modulesClientId)
    } else if (window.location.href.includes('ract')) {
      modulesClientId = clientIdUiRouterNameMapping.get('ract', modulesClientId)
    } else if (window.location.href.includes('oversight-scorecard')) {
      modulesClientId = clientIdUiRouterNameMapping.get('oversight-scorecard', modulesClientId)
    } else if (window.location.href.includes('kpi-studio')) {
      modulesClientId = clientIdUiRouterNameMapping.get('kpi-studio', modulesClientId)
    }
    return modulesClientId;
  },
  saveAndPublishEvent: function (reportData = {}, currentWidget = '', selectedPointValue = '', tableName = '', columnName = '', pointContext = null, immStore = {}) {

    let currentAccountId = immStore?.currentAccountId;
    let sessionStudy = Util.getSessionFiltersFromCookie(currentAccountId)?.sessionDynamicFilters;

    let selectedStudy = sessionStudy[0]?.filterState?.itemsSelected?.[0];
    
    let isSelectedPointArray = Array.isArray(selectedPointValue);
    let prevSessionContextFilter = getObject('widgetContextFilter') || [];
    let isApply = reportData?.dashboardCustomConfigs?.isApply;

    let isWidgetAlreadyPresent = prevSessionContextFilter && prevSessionContextFilter.some(obj => obj.widgetname === currentWidget);

    let updatedContextFilter = [];
    let filterWithinSameWidget = [];
    let existingWidgetflag = prevSessionContextFilter && prevSessionContextFilter.some(obj => {
      return (obj.widgetname === currentWidget) && tableName === obj.tableName && columnName === obj.columnName
    });

    if (isWidgetAlreadyPresent && prevSessionContextFilter?.length) {
      if (selectedPointValue == "clearAll") {
        updatedContextFilter = prevSessionContextFilter?.filter((obj) => obj.widgetname !== currentWidget)
      }
      else {
        updatedContextFilter = prevSessionContextFilter?.map((obj, index, { length }) => {

          let updatedExistingWidgetflag = filterWithinSameWidget && filterWithinSameWidget.some(obj => {
            return (obj.widgetname === currentWidget) && tableName === obj.tableName && columnName === obj.columnName
          });
  
          if (currentWidget === obj?.widgetname && tableName === obj?.tableName && columnName === obj?.columnName) {
  
            let isSelectedPointAlreadyPresent = obj.values?.some(obj => obj == selectedPointValue);
          if(!isSelectedPointArray){
            if (!isSelectedPointAlreadyPresent) {
    
              obj.values = [...obj.values, selectedPointValue];
    
            }
          }else{
            obj.values = selectedPointValue
          }
  
          } else if (!existingWidgetflag && !updatedExistingWidgetflag) {
            let newWidgetFilter = {
              key: uuidv4(),
              widgetname: currentWidget,
              values: [selectedPointValue],
              tableName: tableName,
              columnName: columnName,
              masterStudy: selectedStudy,
              isApplied: []
            };
  
            filterWithinSameWidget.push(newWidgetFilter);
  
          }
  
          return obj;
        })
  
        updatedContextFilter = [...filterWithinSameWidget, ...updatedContextFilter]?.filter(obj => obj);
      }
    } else if (selectedPointValue !== "clearAll"){

      let newWidgetFilter = [{
        key: uuidv4(),
        widgetname: currentWidget,
        values: isSelectedPointArray ? [...selectedPointValue] : [selectedPointValue],
        tableName: tableName,
        columnName: columnName,
        masterStudy: selectedStudy,
        isApplied: []
      }];

      updatedContextFilter = [...newWidgetFilter, ...prevSessionContextFilter];

    }
    else {
      updatedContextFilter = prevSessionContextFilter;
    }

    let prevSessionData = getObject('widgetContextFilter');

    function removeExistingPoint() {
      let data = updatedContextFilter.map(obj => {
        if (!isSelectedPointArray) {

          if ((currentWidget === obj.widgetname) && tableName === obj.tableName && columnName === obj.columnName) {
            let values = obj.values.filter(val => val !== selectedPointValue);
            if (values?.length) {
              return {
                ...obj, values
              }
            }
          } else {
            return obj;
          }

        } else if (isSelectedPointArray && selectedPointValue?.length) {
          return obj;
        } 
        
      }).filter(obj => obj);
      return data
    }

    let props = { tableName, columnName, pointContext };

    ExposureActions.widgetFilterStore(props);

    if (!isApply) {

      if (!(_.isEqual(updatedContextFilter, prevSessionData))) {

        ExposureActions.updateSessionStorage(updatedContextFilter);
        reportData?.widgetMetaData?.[1]?.controller?.publish('handleWidgetFilter', props);
        reportData?.widgetMetaData?.[1]?.controller?.publish('widgetFilter', props);

      } else {

        let removeClickedWidget = removeExistingPoint();

        ExposureActions.updateSessionStorage(removeClickedWidget);
        reportData?.widgetMetaData?.[1]?.controller?.publish('handleWidgetFilter', props);
        reportData?.widgetMetaData?.[1]?.controller?.publish('widgetFilter', props);
      }
    } else {

      setString('isAppliedContextFilter', 0);

      if (!(_.isEqual(updatedContextFilter, prevSessionData)) && !isSelectedPointArray) {
        ExposureActions.updateSessionStorage(updatedContextFilter);
        reportData?.widgetMetaData?.[1]?.controller?.publish('handleWidgetFilter', props);
      } else {
        let removeClickedWidget = removeExistingPoint();
        ExposureActions.updateSessionStorage(removeClickedWidget);
        reportData?.widgetMetaData?.[1]?.controller?.publish('handleWidgetFilter', props);
      }
    }
  },
  createIndexes:function (widgets) {
    return widgets.map((widget, index) => {
      widget.widgetIndex = index;
      widget.widgetId =widget.widgetId?widget.widgetId: 'widget-' + index;
      return widget;
    })
  },

  deepCopyFunction: function (inObject) {
    let outObject, value, key

    if (typeof inObject !== "object" || inObject === null) {
      return inObject // Return the value if inObject is not an object
    }

    // Create an array or object to hold the values
    outObject = Array.isArray(inObject) ? [] : {}

    for (key in inObject) {
      value = inObject[key]

      // Recursively (deep) copy for nested objects, including arrays
      outObject[key] = Util.deepCopyFunction(value)
    }

    return outObject
  },

  generateContextObject: function(args, isYellowfinTask = false){
    const { immAppConfig } = comprehend.globals;
    let { immReport, immExposureStore, widgetId, pointX, pointY, tabId, actionType, CookieStore, widgetTitle, fileId } = args
    if(immReport?.toJS()?.fileWrapper?.file){
      var {  id, modules, fileType, title:titleString } =  immReport.toJS().fileWrapper.file;
    }

    const appName = isYellowfinTask ? [FrontendConstants.KPI_STUDIO] :
                    fileType === ExposureAppConstants.FILE_TYPE_DATA_REVIEW ? [FrontendConstants.CDR] :
                    modules && modules.length > 0 ? [modules[0]] : [FrontendConstants.OTHER]
    
    let cookiesStore =  CookieStore ? CookieStore.getCookies() : null;
    
    let obj = {
      "context":{
         "filters":[
            {
               "key":"accountId",
               "value":[
                  immAppConfig.get('currentAccountId')
               ]
            },
            {
               "key":"app",
               "value": appName
            },
            {
               "key":"fileId",
               "value":[
                id ? id : fileId
               ]
            },
            
         ]
       },
       "action":actionType
    }
    if(pointX && pointY){
      let selectedStudy = Util.getSelectedStudiesFilterFromSession(cookiesStore,immExposureStore);
      let contextFilters = getObject('selectWidgetContextFilter');
      let title = `Study is ${selectedStudy.toJS().map(data=> data.label).join(',')}`
      let titleExtention = contextFilters?  contextFilters.map(data=> ` ${data.widgetname} is ${data.values.join(' and ')}`).join(', '):'';
      let concatinatedString = `${title}${titleExtention? `,`:''}${titleExtention}` ;
      obj.title = concatinatedString;
      obj.breadCrumb = `${titleString} - ${widgetTitle}`
      obj.position = [
        pointX,
        pointY
      ];
      obj.context.extraInformation = {
        contextFilters : JSON.stringify(contextFilters)
      }
      if(selectedStudy.toJS().length){
          obj.context.filters.push({
          "key":"studyId",
          "value":selectedStudy.toJS().map(data=> data.label)
        })
      }
    }
    if(widgetId){
       obj.context.filters.push({
        "key":"widgetId",
        "value":[
         widgetId
        ]
     })
    }
    if(tabId){
      obj.context.filters.push({
        "key":"tabId",
        "value":[
          tabId
        ]
      })
    }
    return obj;
  },

  getSelectedStudiesFilterFromSession:(cookiesStore,immExposureStore)=> {
    const filterCookieEntry = Util.getSessionFilterCookieEntry(cookiesStore, 0, immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    const immSelectedStudies = Imm.List(filter.itemsSelected).map(study => {
      const studyName = study;
      const studyId = Util.getStudyIdFromName(immExposureStore, studyName);
      return Imm.Map({ value: studyId, label: studyName });
    });
    return immSelectedStudies;
  },
  getUserById(userId) {
    if (userId !== '00000000-0000-0000-0000-000000000000') {
      const { immAppConfig } = comprehend.globals;
      const immUserWrappers = immAppConfig.get('userWrappers');
      const immUserEntity = immUserWrappers.find(x => x.getIn(['user', 'id']) === userId)
      if (immUserEntity !== undefined) {
        return immUserEntity.get('user');
      }
    }
  },

  //convert date to utc_formatted_date & time return dd-mmm-yyyy hh:mm:ss
  utc_formatted_date_time_new(date, istime) {
    const [, day, month, year] = (new Date(date)).toUTCString().split(' ');
    let formattedDate = !date ? 'Unknown' : `${day}-${month}-${year}`;
    let time = istime ? `0${parseInt(date.getUTCHours(), 10)}:${`0${parseInt(date.getUTCMinutes(), 10)}`.slice(-2)}:${`0${parseInt(date.getUTCSeconds(), 10)}`.slice(-2)} UTC` : '';
    return `${formattedDate} ${time}`
  },

  getUserAccessibleApps(){
    const immAppConfig = comprehend.globals.immAppConfig;
    const user_info = immAppConfig.get('user_info')
    const apps = user_info.get('apps')
    return apps
  },

  getApplicationClientId() {
    const immAppConfig = comprehend.globals.immAppConfig
    return immAppConfig.get('openIdClientId')
  }
};

module.exports = Util;
