var _ = require('underscore');
var HttpStatus = require('http-status-codes');

var Util = require('../util/util');

// If GoogleAnalytics has not been loaded, define a dummy function so that the
// functions in this file will work.
if (!window.ga) {
  window.ga = function() {};
}

const sendException = function(description, isFatal) {
    ga('send', 'exception', {
       exDescription: description,
       exFatal: isFatal
    });
};

var GAHelper = {
  editOperationIgnoreFields: ['updatedAt', 'taskFilters', 'propertySnapshotList', 'observerHistory', 'assigneeHistory', 'history', 'templatedReport', 'template'],

  extractEditOperations: function(oldObj, newObj) {
    return _.reduce(newObj, function(memo, value, key) {
      if (!_.isEqual(oldObj[key], value) && !_.contains(this.editOperationIgnoreFields, key)) {
        memo.push(key.toUpperCase());
      }
      return memo;
    }, [], this);
  },

  extractTemplatedReportEditOperations: function(oldTemplatedReport, newTemplatedReport) {
    var operations;
    /*
    If the template id has not changed, inspect the parameters and template data that changed (like the advanced config overrides) and send an
    event for the operations. If the template has changed, the report has basically changed completely so just send
    one event 'TEMPLATETYPE'.
    */
    if (oldTemplatedReport.template.id === newTemplatedReport.template.id && oldTemplatedReport.template.updatedAt === newTemplatedReport.template.updatedAt) {
      operations = _.chain(oldTemplatedReport.template.parameters)
                      .zip(newTemplatedReport.template.parameters)
                      .map(function(params) {
                          if (params[0].value !== params[1].value) {
                            return params[0].isDataParameter ? 'DATA_PARAMETER' : 'OPTIONS_PARAMETER';
                          }
                        }
                      )
                      .uniq()
                      .filter(_.isNotUndefined)
                      .union(this.extractEditOperations(oldTemplatedReport, newTemplatedReport))
                      .value();
    } else {
      operations = ['TEMPLATETYPE'];
    }

    return operations;
  },

  extractTaskWrapperEditOperations: function(oldTaskWrapper, newTaskWrapper) {
    oldTaskWrapper.task.observerIds = _.sortBy(oldTaskWrapper.task.observerIds);
    newTaskWrapper.task.observerIds = _.sortBy(newTaskWrapper.task.observerIds);
    var editOperations = this.extractEditOperations(oldTaskWrapper.task, newTaskWrapper.task);
    if (newTaskWrapper.newComment) { editOperations.push('NEW COMMENT'); }
    return editOperations;
  }
};

module.exports = {
  CONSTANTS: {
    NONE: 'NONE',
    TASKS_LANDING: 'tasks-landing-page'
  },

  DOCUMENT_ACTION: {
    OPEN: 'Open',
    CREATE: 'Create',
    FAVORITE: 'Favorite',
    UNFAVORITE: 'Unfavorite',
    EDIT: 'Edit',
    DELETE: 'Delete',
    SHARE: 'Share',
    MOVE: 'Move',
    DOWNLOAD: 'Download'
  },

  DOCUMENT_TYPE : {
    ADHOC_REPORT: 'ADHOC_REPORT',
    ADVANCED_REPORT: 'ADVANCED_REPORT',
    DASHBOARD: 'DASHBOARD',
    FILE: 'FILE',
    FOLDER: 'FOLDER',
    DATA_REVIEW: 'DATA_REVIEW_SET',
    REPORT: 'REPORT',
    TASK: 'TASK',
    TASKS: 'TASKS'
  },

  EVENT_CATEGORY: {
    AUTHENTICATION: 'Authentication',
    DOCUMENT: 'Document',
    REQUEST_TIME: 'Request Time'
  },

  GA_DIMENSION: _.reduce(['USER_ID', 'DOCUMENT_ID', 'TARGET_ID', 'EVENT_ERROR', 'TIMESTAMP', 'DOCUMENT_TYPE', 'DOWNLOAD_TYPE', 'ACCOUNT_ID'], function(memo, field, index) {
    memo[field] = 'dimension' + (index + 1);
    return memo;
  }, {}),

  getDocumentDefaultParams: function(eventAction, documentId, documentType, documentError) {
    var defaultParams = {
      hitType: 'event',
      eventAction: eventAction,
      eventCategory: 'Document'
    };
    defaultParams[this.GA_DIMENSION.DOCUMENT_ID] = documentId || this.CONSTANTS.NONE;
    defaultParams[this.GA_DIMENSION.DOCUMENT_TYPE] = documentType || this.CONSTANTS.NONE;
    defaultParams[this.GA_DIMENSION.EVENT_ERROR] = documentError || this.CONSTANTS.NONE;
    defaultParams[this.GA_DIMENSION.TIMESTAMP] = Util.getCurrentTimeMillis().toString();
    return defaultParams;
  },

  // Page Tracking
  // For more info: https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
  // page is a string that starts with '/', title is a string
  sendPageView: function(page, title) {
    ga('send', {
       hitType: 'pageview',
       page: page,
       title: title
    });
  },

  // Exceptions
  // For more info: https://developers.google.com/analytics/devguides/collection/analyticsjs/exceptions
  // exDescription is a string, exFatal is a boolean
  // In App.componentWillMount, we register a listener to listen to `'error'` event and send error messages to GA.
  sendException: sendException,

  sendExceptionHandler(e) {
    sendException(e.message + '\n[' + e.filename + ']: ' + e.lineno);
  },

  sendAjaxException: function(description, statusCode, isFatal) {
    sendException(description + '\nStatus Code: ' + statusCode + ' (' + HttpStatus[statusCode] + ')', isFatal);
  },

  // Events
  // For more info: https://developers.google.com/analytics/devguides/collection/analyticsjs/
  // Some basic important things about events:
  //   * hitType, eventCategory, eventAction are required
  //   * eventValue must be an integer, everything else are strings
  //   * eventCategory is the highest level, where we are in the application
  //   * eventAction is the action we take
  //   * dashboard,widget,label is of the form 'id(name)'
  sendDocumentOpen: function(documentId, documentType, documentRenderingTime) {
    ga('send', _.extend(this.getDocumentDefaultParams(this.DOCUMENT_ACTION.OPEN, documentId, documentType), {
      // TODO: id:8652
      eventValue: documentRenderingTime
    }));
  },

  sendDocumentCreate: function(documentType, documentCreateError) {
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.CREATE, null, documentType, documentCreateError);
    ga('send', params);
  },

  sendDocumentDelete: function(documentId, documentDeleteError) {
    // We cannot delete a Task currently.
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.DELETE, documentId, this.DOCUMENT_TYPE.FILE, documentDeleteError);
    ga('send', params);
  },

  sendDocumentsDelete: function(documentIds, deleteError) {
    _.each(documentIds, function(id) {
      this.sendDocumentDelete(id, deleteError);
    }, this);
  },

  // Tracked in ExposureStore.taskViewUpdateTask, ReportStudio.save, DashboardStudio.save,
  // ExposureStore.renameFolder, ExposureStore.updateFile (in FAILED_CONFIRMATION_SHARING_IMPACT case).
  sendDocumentEdit: function(documentId, documentType, documentEditOperation, documentEditError) {
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.EDIT, documentId, documentType, documentEditError);
    ga('send', _.extend(params, {
      eventLabel: documentEditOperation
    }));
  },

  // Tracked in ExposureStore.setItemIsStarred
  sendDocumentFavorite: function(documentId, documentType) {
    ga('send', this.getDocumentDefaultParams(this.DOCUMENT_ACTION.FAVORITE, documentId, documentType));
  },

  // Tracked in ExposureStore.setItemIsStarred
  sendDocumentUnfavorite: function(documentId, documentType) {
    ga('send', this.getDocumentDefaultParams(this.DOCUMENT_ACTION.UNFAVORITE, documentId, documentType));
  },

  // Tracked in ExposureStore.updatePrivileges.
  sendDocumentShare: function(documentId, shareeId, documentType, documentShareError) {
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.SHARE, documentId, documentType, documentShareError);
    params[this.GA_DIMENSION.TARGET_ID] = shareeId;
    ga('send', params);
  },

  // Tracked in ExposureStore.moveFiles.
  sendDocumentMove: function(documentId, targetLocation, documentMoveError) {
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.MOVE, documentId, this.DOCUMENT_TYPE.FILE, documentMoveError);
    params[this.GA_DIMENSION.TARGET_ID] = targetLocation;
    ga('send', params);
  },

  // Tracked in ExposureStore.exportFileData.
  sendDocumentDownload: function(documentId, downloadType) {
    var params = this.getDocumentDefaultParams(this.DOCUMENT_ACTION.DOWNLOAD, documentId, this.DOCUMENT_TYPE.FILE);
    params[this.GA_DIMENSION.DOWNLOAD_TYPE] = downloadType;
    ga('send', params);
  },

  // Sending userId to Google Analytics as we don't want to send real names.
  sendLogout: function() {
    var params = {
      hitType: 'event',
      eventCategory: this.EVENT_CATEGORY.AUTHENTICATION,
      eventAction: 'Logout'
    };
    params[this.GA_DIMENSION.TIMESTAMP] = Util.getCurrentTimeMillis().toString();
    ga('send', params);
  },

  // Tracked in AppRequest.startInactivityTimer.
  sendSessionTimeout: function() {
    var params = {
      hitType: 'event',
      eventCategory: this.EVENT_CATEGORY.AUTHENTICATION,
      eventAction: 'Session Timeout'
    };
    params[this.GA_DIMENSION.TIMESTAMP] = Util.getCurrentTimeMillis().toString();
    ga('send', params);
  },

  GAHelper: GAHelper
};
