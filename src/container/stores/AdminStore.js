import React from 'react';
import _ from 'underscore';
import HttpStatus from 'http-status-codes';
import Imm from 'immutable';
import {Promise} from 'es6-promise';

import Store from './Store.js';
import AdminActions from '../actions/AdminActions';
import ModalDialogContent from '../components/ModalDialogContent';
import AdminConstants from '../constants/AdminConstants';
import AdminRequestConstants from '../constants/AdminRequestConstants';
import BatchEditConstants from '../constants/BatchEditConstants';
import DataTypeConstants from '../constants/DataTypeConstants';
import FrontendConstants from '../constants/FrontendConstants';
import HttpResponseConstants from '../constants/HttpResponseConstants';
import ListViewConstants from '../constants/ListViewConstants';
import ModalConstants from '../constants/ModalConstants';
import SaveModeConstants from '../constants/SaveModeConstants';
import { fileTypeConstants } from '../constants/TaskDisplayConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
import AppRequest from '../http/AppRequest';
import AppRequestByFetch from '../http/AppRequest';
import AppDispatcher from '../http/AppDispatcher';
import GA from '../util/GoogleAnalytics';
import ComprehendSchemaUtil from '../util/ComprehendSchemaUtil';
import UserInput from '../util/UserInput';
import Util from '../util/util';
import PermissionsUtil from '../util/PermissionsUtil';
import ExposureConstants from "../constants/ExposureConstants";
import ReportUtil from "../util/ReportUtil";
import EntitySearchUtil from "../util/EntitySearchUtil";
var AccountUtil = require('../util/AccountUtil');

const _initialWorkingCs = {
  id: null,
  yutaniId: null,
  name: null,
  datasources: null,
  legacy: null,
  selectedNodeKeyPath: null,
  isCDM: false
};

// Immutable _immAdminStore object to hold the state of Aperture.  It's
// important to not modify this in place so that we can take advantage of
// `shouldComponentUpdate` in React components with simple object equality
// checks for performance improvements.
let _immAdminStore = Imm.fromJS({
  accounts: [],
  batchEditEnabled: false,
  comprehendSchemaJson: {data: null, error: null, isActive: false, isLoading: false, isSaving: false, schemaName: null, schemaId: null},
  comprehendSchemaMetadataList: [],
  connections: [],
  csIsSaving: false,
  currentAccountId: null,
  datasources: null,
  datasourcesAreLoading: false,
  comprehendSchemaIsLoading: false,
  uniquenessNotVerifiedTables: [],
  legacyUsers: [],
  loadedCs: _initialWorkingCs,
  outstandingRequests: {},
  statusMessageList: [],
  schemaListIsLoading: false,
  schemaUsersAreLoading: false,
  schemaUsersAreSaving: false,
  schemaUsersChangeList: [],
  tableRowCounts: {},
  tvSearchState: {
    searchInProgress: false,
    isTvSearchByTable: false,
    tvExcludedDataSources: [],
    tvResultCounts: [0, 0, 0],
    tvShowAllTreeItems: true
  },
  userManagement: {},
  users: [],
  workflowUsers: [],
  usersAreLoading: false,
  usersView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    userIds: [],
    checkedUserWrappers: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      email: true,
      lastName: true,
      firstName: true,
      userEntityState: true,
      group: false,
      role: true
    })
  },
  // Shameless copy of the above user data.
  groups: {},
  groupsAreLoading: false,
  groupsView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    groupIds: [],
    checkedGroups: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      name: true,
      numUsers: true,
      description: true
    })
  },
  dataAccessGroups: {},
  dataAccessGroupsList: Imm.List(),
  dataAccessGroupsAreLoading: false,
  dataAccessGroupsView: {
    isValid: ListViewConstants.LIST_VIEW_VALID,
    totalRows: 0,
    dataAccessGroupIds: [],
    checkedDataAccessGroups: Imm.Set(),
    displayedColumns: Imm.OrderedMap({
      dataAccessProfileName: true,
      numUsers: true
    })
  },
  studies: {},
  // The `selectedNodeKeyPath` is an immutable List of keys specifying the path to the
  // selected node, i.e.
  // ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>
  workingCs: _initialWorkingCs,
  workingGPP: {
    demography: {
      tablePath: null,
      namePath: null,
      infoPaths: []
    },
    // Each element of `charts` is an object with the following fields:
    // type, editing, tablePath, mainColumnPath, lowerBoundPath, & upperBoundPath.
    charts: [],
    // numericChartDatePaths maps tableString to {chartCount, datePath}.
    numericChartDatePaths: {}
  }
});

var workingCsSelectedNodeKeyPath = ['workingCs', 'selectedNodeKeyPath'];

// These columns are added to the schema when DRT is enabled and clinical tables/views have been created.
// Their visibility state should be the same as the DRT activation state.
var immReviewToolColumnShortNames = Imm.List([
  'reviewid',
  'assigner_username',
  'assigneeuser_username',
  'assigneegroup_name',
  'reviewflag',
  'reviewstate',
  'createddate'
]);

var AdminStore = _.extend({

  init: _.once(function(immConfig) {
    _immAdminStore = _immAdminStore.merge({
      accountMap: immConfig.get('accountMap', _immAdminStore.get('accountMap')),
      currentAccountId: immConfig.get('currentAccountId'),
      accountClinicalDBs: immConfig.get('accountClinicalDBs')
    });
  }),

  getAdminStore: function() {
    return _immAdminStore;
  },

  _updateStore: function(adminStore) {
    // Provided only for use in testing.
    _immAdminStore = adminStore;
  },

  getOutstandingRequest(requestName) {
    return _immAdminStore.getIn(['outstandingRequests', requestName]);
  },

  startOutstandingRequest(requestName, request) {
    _immAdminStore = _immAdminStore.setIn(['outstandingRequests', requestName], request);
  },

  deleteOutstandingRequest(requestName) {
    _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', requestName]);
  },

  initializeRequest(requestName) {
    const request = AdminStore.getOutstandingRequest(requestName);
    if (!!request) {
      request.abort();
    }

    AdminStore.deleteOutstandingRequest(requestName);
  },

  addGroup: function(group, callback) {
    var groupEntity = _.extend(group, {userEntityIds: []});
    var url = '/api/admin/groups';
    AppRequest({type: 'POST', data: JSON.stringify(groupEntity), url: url}).then(
        function(data) {
          if (data.groupId) {  // Group id gets returned on success.
            AdminActions.createStatusMessage(FrontendConstants.SUCCESS_A_NEW_TEAM_HAS_BEEN_ADDED, StatusMessageTypeConstants.TOAST_SUCCESS);
            callback(true);
          } else {
            callback(false);
          }
        },
        function(jqXHR) {
          GA.sendAjaxException('POST ' + url + ' failed.', jqXHR.status);
        }
    );
  },

  addGPPChart: function() {
    _immAdminStore = _immAdminStore.updateIn(['workingGPP', 'charts'], function(immCharts) {
      return immCharts.push(Imm.Map({editing: true}));
    });
  },

  addAccountAdmin: function(accountName, accountAdminEmail) {
    var immAccount = _immAdminStore.get('accounts').find(function(immAccount) {
      return immAccount.get('name') === accountName;
    });
    AppRequest({
      type: 'POST',
      url: '/api/admin/accounts/' + immAccount.get('id') + '/admins/',
      data: accountAdminEmail
    }).then(
      function() {
        AdminStore.createStatusMessage(FrontendConstants.ACCOUNT_ADMIN_CREATION_SUCCESS(accountName, accountAdminEmail), StatusMessageTypeConstants.STATUS);
        AdminStore.emitChange();
      },
      function() {
        AdminStore.createStatusMessage(FrontendConstants.ACCOUNT_ADMIN_CREATION_FAILURE(accountName, accountAdminEmail), StatusMessageTypeConstants.WARNING);
        AdminStore.emitChange();
      }
    );
  },

  // batchEdit provides functionality for all batch editings.
  //
  // BATCH_EDIT_COLUMN_MODIFY_DATATYPE: Set the data type for all columns on all
  //   tables currently in search and are selected for batch editing. This can
  //   be triggered when either a table or a datasource is selected.
  // BATCH_EDIT_COLUMN_RENAME: Set longName of all columns on all tables
  //   currently in search and selected for batch editing. Can be triggered
  //   while selecting either a datasource or a table.
  // BATCH_EDIT_COLUMN_UNIQUENESS: Set visibility for all columns on all tables
  //   currently in search and are selected for batch editing. This can be
  //   triggered when either a table or a datasource is selected.
  // BATCH_EDIT_COLUMN_VISIBILITY: Set visibility for all columns on all tables
  //   currently in search and are selected for batch editing. This can be
  //   triggered when either a table or a datasource is selected.
  // BATCH_EDIT_TABLE_VISIBILITY: Set visibility for all tables which have been
  //   selected for batch editing in the currently selected datasource.
  //
  // BE CAREFUL! If the setting you are dealing with below can be changed in
  // batch column edit mode then there may be tables or columns outside the
  // current scope that have `batchEditCheckboxState: true`, so you need to be
  // careful to limit the effects of your changes here. Usually detecting if a
  // datasource or a table is currently selected and limiting changes
  // appropriately (i.e. to the selected table in the latter case) should be enough.
  batchEdit: function(batchEditType, value, statusMessage) {
    var immCurrentSelectionPath = _immAdminStore.getIn(workingCsSelectedNodeKeyPath);

    if (!_.isNull(immCurrentSelectionPath)) {
      // We want immTablePath to be a path to the tables var on the current
      // datasource. If a table is selected we only want the first 4 parts of
      // its path, if a datasource is selected we need to add 'tables'.
      var immTablePath = AdminStore.isDatasource(immCurrentSelectionPath) ? immCurrentSelectionPath.push('tables') : immCurrentSelectionPath.take(4);
      switch(batchEditType) {
        case BatchEditConstants.BATCH_EDIT_COLUMN_MODIFY_DATATYPE:
        case BatchEditConstants.BATCH_EDIT_COLUMN_UNIQUENESS:
        case BatchEditConstants.BATCH_EDIT_COLUMN_VISIBILITY:
          if(AdminStore.isDatasource(immCurrentSelectionPath)) {
            _immAdminStore.getIn(immTablePath).filter(Util.isNodeInScope).forEach(function(immTable) {
              AdminStore.batchSetColumnAttribute(batchEditType, immTable, value);
            });
          } else {
            AdminStore.batchSetColumnAttribute(batchEditType, _immAdminStore.getIn(immCurrentSelectionPath), value);
          }
          AdminStore.closeModal();

          break;
        case BatchEditConstants.BATCH_EDIT_COLUMN_RENAME:
          // We sanitize the name in the modal, and handle malformed input there.
          // Returns an immTable with updated longNames.
          var renameColumnLongNames = function(immTable) {
            return immTable.update('columns', function(immColumns) {
              return immColumns.map(function(immColumn) {
                return Util.isNodeInBatchEditScope(immColumn) ? immColumn.set('longName', value) : immColumn;
              });
            });
          };
          // If current selection path is a datasource, we will rename columns for each table in this datasource.
          // Otherwise the selection path is a table, and we will rename columns for this table.
          if (AdminStore.isDatasource(immCurrentSelectionPath)) {
            _immAdminStore = _immAdminStore.updateIn(immTablePath, function(immTables) {
              return immTables.map(function(immTable) {
                return Util.isNodeInScope(immTable) ? renameColumnLongNames(immTable) : immTable;
              });
            });
          } else {
            _immAdminStore = _immAdminStore.updateIn(immCurrentSelectionPath, renameColumnLongNames);
          }
          AdminStore.closeModal();
          break;
        case BatchEditConstants.BATCH_EDIT_TABLE_VISIBILITY:
          _immAdminStore.getIn(immTablePath).filter(Util.isNodeInScope).forEach(function(immTable) {
            if (immTable.get('batchEditCheckboxState')) {
              AdminStore.setTableInvisibility(value, immTable.get('shortName'));
            }
          });
          break;
      }

      if (statusMessage) {
        AdminStore.createStatusMessage(statusMessage, 'status');
      }
    }
  },

  // This is a helper function that actually does the work of setting batch
  // edited columns values. This is driven by the batchEdit function above.
  batchSetColumnAttribute: function(batchEditType, immTable, value) {
    var tableShortName = immTable.get('shortName');
    immTable.get('columns').forEach(function(immColumn, colShortName) {
      if (Util.isNodeInBatchEditScope(immColumn)) {
        switch(batchEditType) {
          case BatchEditConstants.BATCH_EDIT_COLUMN_VISIBILITY:
            AdminStore.setColumnInvisibility(tableShortName, colShortName, value);
            break;
          case BatchEditConstants.BATCH_EDIT_COLUMN_UNIQUENESS:
            AdminStore.setColumnUniqueness(colShortName, value, tableShortName);
            break;
          case BatchEditConstants.BATCH_EDIT_COLUMN_MODIFY_DATATYPE:
            AdminStore.setColumnType(colShortName, value, tableShortName);
            break;
        }
      }
    });
  },

  closeComprehendSchemaEditor: function() {
    _immAdminStore = _immAdminStore.set('comprehendSchemaJson', Imm.Map({data: null, error: null, isActive: false, isLoading: false, isSaving: false, schemaName: null, schemaId: null}));
  },

  clearComprehendSchemaJsonError: function() {
    _immAdminStore = _immAdminStore.setIn(['comprehendSchemaJson', 'error'], null);
  },

  closeModal: function(callback) {
    _immAdminStore = _immAdminStore.delete('modalContent');
    _.defer(Util.getGuardedCallback(callback));
    AdminStore.emitChange();
  },

  closeStatusMessage: function(id) {
    _immAdminStore = _immAdminStore.update('statusMessageList', function(immList) {
      return immList.filterNot(function(statusMessage) { return statusMessage.get('id') === id; });
    });
  },

  createAccountWithAdmin: function(accountName, accountDisplayName, isLegacyAccount, accountAdminEmail) {
    var newAccount = {
      name: accountName,
      displayName: accountDisplayName,
      isLegacy: isLegacyAccount,
      visibleExtendedTaskMetadataFields: []
    };
    AppRequest({
      type: 'POST',
      url: '/api/admin/accounts/',
      data: JSON.stringify({account: newAccount, adminEmail: accountAdminEmail})
    }).then(
      function(account) {
        _immAdminStore = _immAdminStore.set('accounts', _immAdminStore.get('accounts').push(Imm.fromJS(account)));
        AdminStore.createStatusMessage(FrontendConstants.ACCOUNT_CREATION_SUCCESS(accountName, accountAdminEmail), StatusMessageTypeConstants.STATUS);
        AdminStore.emitChange();
      },
      function() {
        AdminStore.createStatusMessage(FrontendConstants.ACCOUNT_CREATION_FAILURE(accountName, accountAdminEmail), StatusMessageTypeConstants.WARNING);
        AdminStore.emitChange();
      }
    );
  },

  createStatusMessage: function(text, type, action) {
    var id = (new Date()).getTime() + '' + Math.random();
    _immAdminStore = _immAdminStore.update('statusMessageList', function(immList) {
      return immList.push(Imm.Map({id: id, text: text, type: type}));
    });
    AdminStore.emitChange();
  },

  createUserByEmail: function(email, useSSO, dataAccessGroupId, callback) {
    const userRegistrationData = JSON.stringify({
      email: email,
      useSSO: useSSO,
      dataAccessGroupId: dataAccessGroupId
    });

    const addUserRequest = AppRequest({
      type: 'POST',
      url: '/api/admin/users?email=true',
      data: userRegistrationData
    });
    addUserRequest.then(
      function() {
        AdminStore.createStatusMessage(FrontendConstants.SENT_INVITATION_EMAIL_TO_NEW_USER(email), 'status');
        _immAdminStore = _immAdminStore.deleteIn(['userManagement', 'addUserError']);
        Util.getGuardedCallback(callback)();
        AdminStore.emitChange();
      },
      function(jqXHR) {
        if (jqXHR.status === HttpStatus.BAD_REQUEST) {
          var message = "Unknown Error";
          if (jqXHR.responseJSON.message === HttpResponseConstants.BAD_REQUEST.FAILED_DUPLICATE_ENTITY) {
            message = FrontendConstants.DUPLICATE_USER;
          } else if (jqXHR.responseJSON.message === HttpResponseConstants.BAD_REQUEST.FAILED_DUPLICATE_ACCOUNT_WITH_IDP) {
            message = FrontendConstants.DUPLICATE_ACCOUNT_WITH_IDP(jqXHR.responseJSON.info.duplicateAccountId);
          }
          _immAdminStore = _immAdminStore.setIn(['userManagement', 'addUserError'], message);
          AdminStore.emitChange();
        }
        GA.sendAjaxException('POST create user ' + email + ' failed.', jqXHR.status);
      });
  },

  decrementGPPNumericChartCount: function(tableString) {
    _immAdminStore = _immAdminStore.updateIn(['workingGPP', 'numericChartDatePaths', tableString], function(data) {
      var count = data.get('chartCount');
      if (count > 1) {
        return data.update('chartCount', function(count) { return count - 1; });
      } else {
        return Imm.Map({chartCount: 0, datePath: null});
      }
    });
  },

  deleteDataAccessGroups: function(immDataAccessGroups, hasConfirmed, callback) {
    const url = `/api/admin/data-access-groups`;

    const immDataAccessGroupIds = immDataAccessGroups.map((group) => group.get('id'));
    if (!hasConfirmed) {
      AdminStore.displayModal(ModalConstants.MODAL_DELETE_DATA_ACCESS_GROUP, {
        handleCancel: AdminActions.closeModal,
        // Preserve the callback that was generated in the UserList.
        callback: callback,
        immDataAccessGroups: immDataAccessGroups
      });
    }

    else {
      AppRequest({
        type: 'DELETE',
        url: url,
        data: JSON.stringify(immDataAccessGroupIds)
      }).then(
        function (deletedDataAccessGroups) {
          AdminStore.displayModal(ModalConstants.MODAL_SUCCESS, {
            handleCancel: AdminActions.closeModal.bind(null, callback),
            message: FrontendConstants.DELETE_DATA_ACCESS_GROUPS_SUCCESS(immDataAccessGroupIds.size)
          });
        },
        function () {
          AdminStore.createStatusMessage(FrontendConstants.COULD_NOT_DELETE_DATA_ACCESS_GROUPS, StatusMessageTypeConstants.WARNING);
          AdminStore.emitChange();
        }
      );
    }
  },

  deleteUserManagementField: function(key) {
    _immAdminStore = _immAdminStore.deleteIn(['userManagement', key]);
    AdminStore.emitChange();
  },

  displayDeleteWarningModal(callback, messageHeader, messageContent) {
    AdminStore.displayModal(ModalConstants.MODAL_DELETE_WARNING, {
      header: messageHeader,
      content: messageContent,
      handleCancel: () => {
        AdminActions.closeModal();
        callback(false);
      },
      discardFunc: () => {
        AdminStore.discardChanges();
        AdminStore.closeModal();
        callback();
      }
    });
  },

  displayUnsavedWorkModal(callback, messageHeader, messageContent) {
    const header = messageHeader ? messageHeader : FrontendConstants.DISCARD_CHANGES;
    const content = messageContent ? messageContent : FrontendConstants.IF_YOU_LEAVE_NOW_CHANGES_WILL_BE_LOST;

    AdminStore.displayModal(ModalConstants.MODAL_UNSAVED_WARNING, {
      header,
      content,
      handleCancel: () => {
        AdminActions.closeModal();
        callback(false);
      },
      discardFunc: () => {
        AdminStore.discardChanges();
        AdminStore.closeModal();
        callback();
      }
    });
  },

  discardChanges: function() {
    AdminStore.discardSchemaChanges();
    AdminStore.discardUsersChanges();
  },

  discardSchemaChanges: function() {
    if (!_immAdminStore.getIn(['workingCs', 'datasources']) || _immAdminStore.getIn(['workingCs', 'datasources']).isEmpty()) { return; }
    // Save the selection, expansion, & search states.
    var immSelectedNodeKeyPath = _immAdminStore.getIn(workingCsSelectedNodeKeyPath);
    var immTvSearchState = _immAdminStore.get('tvSearchState');
    var expandedDatasources = _immAdminStore.getIn(['workingCs', 'datasources']).reduce(function(memo, ds, shortName) {
      if (ds.get('expanded')) {
        memo.push(shortName);
      }
      return memo;
    }, []);

    _immAdminStore = _immAdminStore.set('workingCs', _immAdminStore.get('loadedCs'));
    AdminStore.restoreTreeViewState(immSelectedNodeKeyPath, immTvSearchState, expandedDatasources);
  },

  discardUsersChanges: function() {
    _immAdminStore = _immAdminStore.merge({
      schemaUsersAreSaving: false,
      schemaUsersChangeList: Imm.List()
    });
  },

  displayActionCouldNotBeCompletedModal: function(content) {
    AdminStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.THIS_ACTION_COULD_NOT_BE_COMPLETED,
      content: content,
      handleCancel: AdminActions.closeModal,
      primaryButton: {text: FrontendConstants.OKAY}
    });
  },

  displayTaskManagementSaveConfirmationModal: function(callback, message) {
    AdminStore.displayModal(ModalConstants.TASK_MANAGEMENT_SAVE_CONFIRMATION, {
      header: FrontendConstants.TASK_MANAGEMENT_SAVE,
      message,
      handleCancel: () => {
        AdminStore.closeModal();
        callback(false);
      },
      handleContinue: () => {
        AdminStore.closeModal();
        callback(true);
      }
    });
  },

  displayDependancyResetModal: function(callback) {
    AdminStore.displayModal(ModalConstants.TASK_MANAGEMENT_RESET_DEPENDENCY_CONFIRMATION, {
      header: FrontendConstants.TASK_MANAGEMENT_RESET_CONTINUE,
      handleCancel: () => {
        AdminStore.closeModal();
        callback(false);
      },
      handleContinue: () => {
        AdminStore.closeModal();
        callback(true);
      }
    });
  },

  deleteExtendedAttributeConfirmation: function(callback) {
    AdminStore.displayModal(ModalConstants.TASK_MANAGEMENT_DELETE_ATTRIBUTE_CONFIRMATION, {
      header: FrontendConstants.TASK_MANAGEMENT_RESET_CONTINUE,
      handleCancel: () => {
        AdminStore.closeModal();
        callback(false);
      },
      handleContinue: () => {
        AdminStore.closeModal();
        callback(true);
      }
    });
  },

  displayModal: function(modalType, modalProps) {
    var modalContent;
    switch(modalType) {
      case ModalConstants.MODAL_BATCH_EDIT_COLUMNS:
        modalContent = React.createFactory(ModalDialogContent.BatchEditColumns)(modalProps);
        break;
      case ModalConstants.MODAL_BATCH_EDIT_COLUMN_DATATYPE:
        modalContent = React.createFactory(ModalDialogContent.BatchEditColumnDataType)(modalProps);
        break;
      case ModalConstants.MODAL_BATCH_EDIT_RENAME:
        modalContent = React.createFactory(ModalDialogContent.BatchEditRename)(modalProps);
        break;
      case ModalConstants.MODAL_CHECK_ALL_UNIQUENESS:
        // When modalProps is undefined, this modal is about to be mounted, we update uniquenessNotVerifiedTables
        // and pass immAdminStore.
        if (_.isUndefined(modalProps)) {
          _immAdminStore = _immAdminStore.set('uniquenessNotVerifiedTables', ComprehendSchemaUtil.listUniquenessNotVerified(_immAdminStore.getIn(['workingCs', 'datasources'])));
          modalProps = {immAdminStore: _immAdminStore};
        }
        modalContent = React.createFactory(ModalDialogContent.CheckAllUniqueness)(modalProps);
        break;
      case ModalConstants.MODAL_DELETE_DATA_ACCESS_GROUP:
        modalContent = React.createFactory(ModalDialogContent.DeleteDataAccessGroup)(modalProps);
        break;
      case ModalConstants.MODAL_DELETE_DATA_REVIEW_ROLE:
        modalContent = React.createFactory(ModalDialogContent.DeleteDataReviewRole)(modalProps);
        break;
      case ModalConstants.MODAL_DELETE_WARNING:
        modalContent = React.createFactory(ModalDialogContent.DeleteWarning)(modalProps);
        break;
      case ModalConstants.MODAL_EDIT_COLUMN_EDGES:
        // modalProps is not extensible, thus we clone it first.
        var immInitialDatasources = AdminStore.getEdgeEditorTree(modalProps.tableShortName, modalProps.colShortName, 'children');
        var props = _.clone(modalProps);
        props.immInitialDatasources = immInitialDatasources;
        modalContent = React.createFactory(ModalDialogContent.EditColumnEdges)(props);
        break;
      case ModalConstants.MODAL_ROLE_DEFINITIONS:
        modalContent = React.createFactory(ModalDialogContent.RoleDefinitions)(modalProps);
        break;
      case ModalConstants.MODAL_SAVE_DEPLOY_WARNING:
        modalContent = React.createFactory(ModalDialogContent.SaveDeployWarning)(modalProps);
        break;
      case ModalConstants.MODAL_SIMPLE_MESSAGE:
        modalContent = React.createFactory(ModalDialogContent.SimpleMessage)(modalProps);
        break;
      case ModalConstants.MODAL_SUCCESS:
        modalContent = React.createFactory(ModalDialogContent.Success)(modalProps);
        break;
      case ModalConstants.MODAL_UNCHECK_TABLE:
        modalContent = React.createFactory(ModalDialogContent.UncheckTableWarning)(modalProps);
        break;
      case ModalConstants.MODAL_UNSAVED_WARNING:
        modalContent = React.createFactory(ModalDialogContent.UnsavedWarning)(modalProps);
        break;
      case ModalConstants.MODAL_VIEW_COLUMN_EDGES:
        // modalProps is not extensible, thus we clone it first.
        var props = _.clone(modalProps);
        props.edges = modalProps.children.map(_.partial(ComprehendSchemaUtil.pathToEdgeDescriptor, _, _immAdminStore.getIn(['workingCs', 'datasources']))).toJS();
        modalContent = React.createFactory(ModalDialogContent.ViewColumnEdges)(props);
        break;
      case ModalConstants.TASK_MANAGEMENT_SAVE_CONFIRMATION:
        modalContent = React.createFactory(ModalDialogContent.SaveContinueWarning)(modalProps);
        break;
      case ModalConstants.TASK_MANAGEMENT_RESET_DEPENDENCY_CONFIRMATION:
        modalContent = React.createFactory(ModalDialogContent.ResetContinueTaskManagement)(modalProps);
        break;
      case ModalConstants.TASK_MANAGEMENT_DELETE_ATTRIBUTE_CONFIRMATION:
        modalContent = React.createFactory(ModalDialogContent.DeleteAttributeConfirmation)(modalProps);
        break;
    }
    if (modalContent) {
      _immAdminStore = _immAdminStore.set('modalContent', modalContent);
      AdminStore.emitChange();
    }
  },

  extendSession: function() {
    var url = '/api/extend-session';
    AppRequest({type: 'GET', url: url}).then(
      _.noop,
      function() {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
  },

  loadComprehendSchema: function(schemaId, transitionAction) {
    AdminStore.getComprehendSchema(schemaId, function(cs) {
      AdminStore.resetEditSchemaTab();
      AdminStore.setWorkingCs(cs);
      if (_.isFunction(transitionAction)) {
        transitionAction();
      }
    });
  },

  loadDatasources: function(schemaId, loadGPP) {
    var resetAction = function() {
      AdminStore.resetWorkingCs();
      AdminStore.resetEditSchemaTab();
      if (!_.isEmpty(schemaId)) {
        if (loadGPP) {
          AdminStore.loadGPP(schemaId);
        } else {
          AdminStore.loadComprehendSchema(schemaId);
        }
      }
      AdminStore.emitChange();
    };

    if (!_.isNull(_immAdminStore.get('datasources'))) {
      resetAction();
      return;
    }

    if (_immAdminStore.get('datasourcesAreLoading')) { return; }
    var url = '/api/admin/comprehend-datasources';
    if (!_.isEmpty(schemaId)) {
      url += '/' + schemaId;
    }
    var datasourceRequest = AppRequest({type: 'GET', url: url});
    datasourceRequest.then(
      function(datasources) {
        _immAdminStore = _immAdminStore.merge({datasources: datasources, datasourcesAreLoading: false});
        resetAction();
      },
      function(jqXHR) {
        _immAdminStore = _immAdminStore.set('datasourcesAreLoading', false);
        // Purposefully aborted requests aren't considered an error that needs
        // to be tracked.
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          GA.sendAjaxException('GET comprehend schemas for ' + _immAdminStore.get('currentAccountId') + ' failed.', jqXHR.status);
        }
      });

    _immAdminStore = _immAdminStore.merge({datasources: Imm.Map(), datasourcesAreLoading: true});
    _immAdminStore = _immAdminStore.setIn(['outstandingRequests', 'datasourceRequest'], datasourceRequest);
  },

  loadGPP: function(schemaId) {
    AdminStore.getComprehendSchema(schemaId, function(cs) {
      AdminStore.resetEditSchemaTab();
      AdminStore.setWorkingCs(cs);
      AdminStore.setWorkingGPP(cs);
      _immAdminStore = _immAdminStore.mergeDeep({
        tvSearchState: {tvShowAllTreeItems: false, isTvSearchByTable: true}
      });
    });
  },

  filterTreeViewSearchResults: function(mutAdminStore, tvSearchText, immKeyPath, immTvSearchState, tvResultCounts, filterChanged) {
    var isSearchTextEmpty = _.isEmpty(tvSearchText);
    var re = isSearchTextEmpty ? null : Util.escapedRegExp(tvSearchText, 'i');

    // Set the depth of the tree at which we want to match against our search
    // terms. If we're searching by columns then we want to match at depth 2, if
    // we're searching by tables then we match at depth 1.
    var searchDepth = immTvSearchState.get('isTvSearchByTable') ? 1 : 2;

    function treeMapper(immKeyPath, depth) {
      var immNode = mutAdminStore.getIn(immKeyPath),
          visible = false;

      if (immNode.has('childrenName') && depth < searchDepth) {
        var immChildKeyPath = immKeyPath.push(immNode.get('childrenName'));
        mutAdminStore.getIn(immChildKeyPath).forEach(function(immNode, key) {
          visible = treeMapper(immChildKeyPath.push(key), depth + 1) || visible;
        });
      }

      // If the search string is empty just set everything visible again.
      if (isSearchTextEmpty) {
        visible = true;
      } else if (depth === searchDepth) {
        // Only look deeper than the first level since we do not match on Datasource names.
        if (re.test(immNode.get('longName')) || re.test(immNode.get('shortName'))) {
          visible = immTvSearchState.get('tvShowAllTreeItems') || !!immNode.get('checkboxState');
        }
      }

      // Make sure that tables are expanded/collapsed according to search by columns/tables if we've changed filter modes.
      if (filterChanged && immNode.get('childrenName') === 'columns') {
        mutAdminStore.setIn(immKeyPath.push('batchEditExpanded'), !immTvSearchState.get('isTvSearchByTable'));
      }

      if (visible) { tvResultCounts[depth]++; }
      mutAdminStore.setIn(immKeyPath.push('inSearch'), visible);
      return visible;
    }

    treeMapper(immKeyPath, 0);
  },

  // Set the `checkboxState` to `updatedState` for the `immUpdatedNode`
  // and all of its descendants.
  //
  // Set the `checkboxState` to `partial|true|false` for all ancestors
  // of `updatedNode`.
  fixUpCheckboxes: function(immNodeKeyPath, updatedState) {
    var immUpdatedNode = _immAdminStore.getIn(immNodeKeyPath);
    // This is a recursive map over our tree data structure.
    //
    // immKeyPath - A list of keys specifying a path into the nested `mutAdminStore`.
    // parentUpdated - An updated parent node always updates its descendants
    // `checkboxState` to `updatedState`.
    // mutAdminStore - A mutable admin store, generated from a call to withMutations.
    function treeMapper(immKeyPath, parentUpdated, mutAdminStore) {
      var isCurrentNodeUpdated = false,
          isChildNodeUpdated = false;

      mutAdminStore.getIn(immKeyPath).forEach(function(immNode, key) {
        var immMyKeyPath = immKeyPath.push(key);
        if (immNode.get('selected')) { mutAdminStore.setIn(workingCsSelectedNodeKeyPath, immMyKeyPath); }

        // If my parent was updated or I am the updatedNode, then I need to update my
        // state and also recursively update the state of all my descendants.
        var recursiveUpdate = parentUpdated || immNode === immUpdatedNode;
        if (recursiveUpdate) {
          mutAdminStore.setIn(immMyKeyPath.push('checkboxState'), updatedState);
          isCurrentNodeUpdated = true;
        }

        // If one of my children was updated then I need to update myself as well.
        var childrenName = immNode.get('childrenName');
        if (childrenName) {
          var childNodes = immNode.get(childrenName);
          isChildNodeUpdated = treeMapper(immMyKeyPath.push(childrenName), recursiveUpdate, mutAdminStore);

          // I only need to recalculate my child-based state if I haven't updated myself
          // and a child node was updated.
          if (!isCurrentNodeUpdated && isChildNodeUpdated) {
            // We can have the following state combinations:
            //
            // Description                     | Children States | Parent State
            // ----------------------------------------------------------------
            // all checked                     | [X]             | [X]
            // none checked                    | [ ]             | [ ]
            // all partial                     | [-]             | [-]
            // checked and unchecked           | [X], [ ]        | [-]
            // partial and checked             | [-], [X]        | [-]
            // partial and unchecked           | [-], [ ]        | [-]
            // partial, checked, and unchecked | [-], [X], [ ]   | [-]
            //
            // The state table indicates that if any child is 'partial' then my state is
            // 'partial'. Instead of using a `reduce` which will always scan all my child
            // nodes, we can improve performance by using a `some` configured to
            // short-circuit the search if any child has a 'partial' state. We can also
            // keep track of the `overallChildState` within the `some`. If the `some`
            // returns `false` then we know all child nodes were scanned and my state is
            // `overallChildState`.
            var overallChildState;
            var myChildBasedState = childNodes.some(function(immNode, key) {
              // The Map iterated by `some` is immutable and doesn't reflect the
              // mutable changes to `mutAdminStore`. We need to interrogate
              // `mutAdminStore` directly to get the current state.
              var childState = mutAdminStore.getIn(immMyKeyPath.push(childrenName, key, 'checkboxState'));
              if (childState === 'partial') {
                // We know `myChildBasedState` is 'partial' -> short-circuit the search
                // to immediately set `myChildBasedState` to 'partial'.
                return true;
              } else {
                // If `currentState` hasn't been initialized, we do so now.
                // Otherwise, we only need to change `currentState` to 'partial' if
                // `currentState` !== `childState`, i.e. we know that there are both checked
                // and unchecked children.
                if (_.isUndefined(overallChildState)) { overallChildState = childState; }
                else if (overallChildState !== childState) { overallChildState = 'partial'; }
              }
            }) ? 'partial' : overallChildState;

            mutAdminStore.setIn(immMyKeyPath.push('checkboxState'), myChildBasedState);
          }
        }
      });

      return isCurrentNodeUpdated || isChildNodeUpdated;
    }

    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      treeMapper(Imm.List(['workingCs', 'datasources']), false, mutAdminStore);
    });
  },

  getComprehendSchema: function(schemaId, successCallback) {
    var url = '/api/admin/comprehend-schema/' + schemaId;
    AppRequest({type: 'GET', url: url}).then(
      function(cs) {
        successCallback(cs);
        _immAdminStore = _immAdminStore.set('comprehendSchemaIsLoading', false);
        AdminStore.emitChange();
      },
      function(jqXHR) {
        AdminStore.showFailureMessage('Status update: Schema could not be loaded at this time.');
        GA.sendAjaxException('GET Comprehend Schema for customer ' + _immAdminStore.get('currentAccountId') + ', schema ' + schemaId + ' failed.', jqXHR.status);
        AdminStore.emitChange();
      });
    _immAdminStore = _immAdminStore.set('comprehendSchemaIsLoading', true);
    AdminStore.emitChange();
  },

  getAccounts: function() {
    var url = '/api/admin/accounts/';
    AppRequest({type: 'GET', url: url}).then(
      function(data) {
        _immAdminStore = _immAdminStore.set('accounts', Imm.fromJS(data));
        AdminStore.emitChange();
      },
      function() {
        AdminStore.showFailureMessage(FrontendConstants.ACCOUNTS_FAILED_TO_LOAD);
        AdminStore.emitChange();
      }
    );
  },

  getComprehendSchemaJson: function(schemaName, schemaId) {
    var url = '/api/admin/comprehend-schema-json/' + schemaId;
    AppRequest({type: 'GET', url: url}).then(
      function(data) {
        _immAdminStore = _immAdminStore.mergeDeep({comprehendSchemaJson: {data: data, isLoading: false}});
        AdminStore.emitChange();
      },
      function(jqXHR) {
        AdminStore.showFailureMessage('Status update: JSON could not be loaded at this time.');
        GA.sendAjaxException('GET Comprehend Schema JSON for customer ' + _immAdminStore.get('currentAccountId') + ', schema ' + schemaId + ' failed.', jqXHR.status);
        _immAdminStore = _immAdminStore.mergeDeep({comprehendSchemaJson: {error: 'Get failed', isLoading: false}});
        AdminStore.emitChange();
      });
    _immAdminStore = _immAdminStore.mergeDeep({comprehendSchemaJson: {data: null, error: null, isActive: true, isLoading: true, isSaving: false, schemaName: schemaName, schemaId: schemaId}});
  },

  getComprehendSchemaList: function(callback) {
    var url = '/api/admin/comprehend-schema-metadata-list';
    AppRequest({type: 'GET', url: url}).then(
      function(data) {
        var epochDate = function(d) { return d && new Date(+d); };
        var parsedData = _.chain(data).map(function(cs) {
          return {id: cs.id, schemaName: cs.name, createdDate: epochDate(cs.createdAt), lastModifiedDate: epochDate(cs.updatedAt), lastActiveDate: epochDate(cs.activeAt)};
        }).sortBy(function(cs) {
          return cs.schemaName;
        }).value();
        _immAdminStore = _immAdminStore.merge({comprehendSchemaMetadataList: Imm.fromJS(parsedData), schemaListIsLoading: false});
        Util.getGuardedCallback(callback)();
        AdminStore.emitChange();
      },
      function(jqXHR) {
        GA.sendAjaxException('GET Comprehend Schemas for customer ' + _immAdminStore.get('currentAccountId') + ' failed.', jqXHR.status);
        _immAdminStore = _immAdminStore.merge({comprehendSchemaMetadataList: Imm.List(), schemaListIsLoading: false});
        AdminStore.emitChange();
      });
    _immAdminStore = _immAdminStore.set('schemaListIsLoading', true);
    AdminStore.emitChange();
  },

  // Convenience function for retrieving the `name` (stored as `shortName` for node
  // compatibility) of the datasource of the selected table.
  getCurrentDatasourceName: function(mutAdminStore) {
    var imm$AdminStore = mutAdminStore || _immAdminStore;
    // The first three elements of `selectedNodeKeyPath`: ['workingCs', 'datasources', << datasource short name >>]
    return (imm$AdminStore.getIn(workingCsSelectedNodeKeyPath) || Imm.List()).get(2);
  },

  // Convenience function for retrieving the `shortName` of the selected table.
  getCurrentTableName: function(mutAdminStore) {
    var imm$AdminStore = mutAdminStore || _immAdminStore;
    // `selectedNodeKeyPath`: ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>]
    return imm$AdminStore.getIn(workingCsSelectedNodeKeyPath).get(4);
  },

  // This function creates a schema object based off the workingCs.
  // This object can be passed to the backend as JSON to save a schema.
  // An example of Legacy Comprehend Schema is located at myriad/cbt/proto/src/test/resources/SampleSchemaWithoutNull.json
  getCurrentCs: function() {
    var immWorkingCs = _immAdminStore.get('workingCs');
    var legacy = JSON.parse(immWorkingCs.get('legacy') || '{}');
    legacy.visibleName = immWorkingCs.get('name');

    // To support GPP, we need to filter out datasources, tables, and columns that are no longer a part of the schema or is set to invisible.
    // We only modify metadata object with type gpp_demography_node_prop or gpp_drill_down_prop.
    if (legacy.metadata) {
      legacy.metadata = _.chain(legacy.metadata)
        .map(function(m) {
          switch(m.type) {
            case 'gpp_demography_node_prop':
              var nodeInfo = m.nodeId.split('.');  // nodeId has the following format: 'datasourceShortName.tableShortName.columnShortName'.
              var datasourceShortName = nodeInfo[0];
              var tableShortName = nodeInfo[1];
              var immTableKeyPath = Imm.List(['datasources', datasourceShortName, 'tables', tableShortName]);
              if (immWorkingCs.getIn(immTableKeyPath.push('checkboxState'))) {
                // Each entry in informationProperties/nameNodeProperties has the following format: 'datasourceShortName.tableShortName.columnShortName'.
                // Note: datasourceShortName and tableShortName in a property should be equal to datasourceShortName and tableShortName in nodeId.
                var ips = _.filter(m.informationProperties, function(property) {
                  return !immWorkingCs.getIn(immTableKeyPath.push('columns', property.split('.')[2], 'isInvisible'));
                });
                var nnps = _.filter(m.nameNodeProperties, function(property) {
                  return !immWorkingCs.getIn(immTableKeyPath.push('columns', property.split('.')[2], 'isInvisible'));
                });
                return {
                  type: m.type,
                  nodeId: m.nodeId,
                  informationProperties: ips,
                  nameNodeProperties: nnps
                };
              } else {
                return null;
              }
            case 'gpp_drill_down_prop':
              // Each chart in durationChart has the following format: 'datasourceShortName.tableShortName'.
              var dc = _.filter(m.durationCharts, function(chart) {
                var chartInfo = chart.split('.');
                return immWorkingCs.getIn(['datasources', chartInfo[0], 'tables', chartInfo[1], 'checkboxState']);
              });
              // numericCharts field is a map with key in 'datasourceShortName.tableShortName' and value is an array of charts. Each chart
              // is in the 'datasourceShortName.tableShortName.columnShortName' format. Note: the chart datasourceShortName and tableShortName
              // should match datasourceShortName and tableShortName in key field in the numericCharts map.
              var nc = _.reduce(m.numericCharts, function(memo, charts, key) {
                var keyInfo = key.split('.');
                var immTableKeyPath = Imm.List(['datasources', keyInfo[0], 'tables', keyInfo[1]]);
                if (immWorkingCs.getIn(immTableKeyPath.push('checkboxState'))) {
                  memo[key] = _.filter(charts, function(chart) {
                    return !immWorkingCs.getIn(immTableKeyPath.push('columns', chart.split('.')[2], 'isInvisible'));
                  });
                }
                return memo;
              }, {});
              if (_.isEmpty(dc) && _.isEmpty(nc)) {  // We remove the gpp_drill_down_prop metadata object if durationCharts and numericCharts is empty.
                return null;
              } else {
                return {
                  type: m.type,
                  numericCharts: nc,
                  durationCharts: dc
                };
              }
            default:
              return m;
          }
        }).compact().value();
    }

    var currentCs = {
      id: immWorkingCs.get('id'),
      isCDM: immWorkingCs.get('isCDM') || false,
      yutaniId: immWorkingCs.get('yutaniId'),
      name: immWorkingCs.get('name'),
      legacy: JSON.stringify(legacy),
      dbConnectionName: immWorkingCs.get('dbConnectionName')
    };

    currentCs.datasources = immWorkingCs.get('datasources').reduce(function(datasources, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return datasources;
      }

      var nodes = immDatasource.get('tables').reduce(function(tables, immTable) {
        if (!immTable.get('checkboxState')) {
          return tables;
        }

        // Configure DRT properties
        var nodeLegacy = JSON.parse(immTable.get('legacy', '{}'));
        if (ComprehendSchemaUtil.hasDRTProperties(nodeLegacy) && !immTable.get('isDRTEnabled')) {  // Remove the DRT properties if DRT was disabled
          nodeLegacy = _.omit(nodeLegacy, ['reviewFlagLabel', 'reviewStatusLabel', 'reviewAssigneeLabel', 'reviewStatusLabels']);
        } else if (!ComprehendSchemaUtil.hasDRTProperties(nodeLegacy) && immTable.get('isDRTEnabled')) {  // Add the DRT properties if DRT was enabled
          nodeLegacy.reviewFlagLabel = 'Confirmed Data';
          nodeLegacy.reviewStatusLabel = 'Status';
          nodeLegacy.reviewAssigneeLabel = 'Assign To';
          nodeLegacy.reviewStatusLabels = ['Open', 'Under Review', 'Review Complete', 'Closed'];
        }

        // Set table uniqueness to "Verified";
        nodeLegacy.metadata = _.reject(nodeLegacy.metadata, function(element) { return element.type === 'table-uniqueness'; });
        nodeLegacy.metadata.push({type: 'table-uniqueness', value: 'Verified'});

        var node = {
          yutaniId: immTable.get('yutaniId'),
          shortName: immTable.get('shortName'),
          longName: immTable.get('longName'),
          isVisible: !immTable.get('isInvisible'),
          legacy: JSON.stringify(nodeLegacy)
        };
        node.properties = immTable.get('columns').reduce(function(columns, immColumn) {
          columns.push({
            yutaniId: immColumn.get('yutaniId'),
            shortName: immColumn.get('shortName'),
            longName: immColumn.get('longName'),
            // The JSON parser in the backend expects dataType to be all uppercase.
            dataType: immColumn.get('dataType', DataTypeConstants.STRING).toUpperCase(),
            isVisible: !immColumn.get('isInvisible'),
            isUnique: immColumn.get('isUnique'),
            legacy: immColumn.get('legacy')
          });
          return columns;
        }, []);

        tables.push(node);
        return tables;
      }, []);

      datasources.push({
        shortName: immDatasource.get('shortName'),
        nodes: nodes
      });
      return datasources;
    }, []);

    currentCs.edges = immWorkingCs.get('datasources').reduce(function(memo1, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return memo1;
      }

      var dsShortName = immDatasource.get('shortName');
      var dsEdges = immDatasource.get('tables').reduce(function(memo2, immTable) {
        if (!immTable.get('checkboxState')) {
          return memo2;
        }

        var tableShortName = immTable.get('shortName');
        var tableEdges = immTable.get('columns').reduce(function(memo3, immColumn) {
          var columnShortName = immColumn.get('shortName');
          var parent = [dsShortName, tableShortName, columnShortName].join('.');
          var columnEdges = immColumn.get('children').map(function(childPath) {
            return {
              parent: parent,
              child: ComprehendSchemaUtil.pathToColumnString(childPath)
            };
          });
          return memo3.concat(columnEdges.toJS());
        }, []);
        return memo2.concat(tableEdges);
      }, []);
      return memo1.concat(dsEdges);
    }, []);

    return currentCs;
  },

  // Returns a copy of workingCs' datasources that can be used in the edge editor modal.
  // * The properties 'selected' and 'expanded' are set to false and true respectively for all tree nodes.
  // * For each column, the property 'checkboxState' is set to true if the column is part of an edge with the selected
  //   column, and false if not.
  // * The property 'inSchema' mirrors the 'checkboxState' property of workingCs' datasources for datasources and tables.
  //   This avoids overloading of the 'checkboxState' property.
  // * 'inSchema' is set to false for the currently selected table so that users cannot add a circular edge.
  //
  // `endpointType` should be either 'parents' or 'children'.
  getEdgeEditorTree: function(tableShortName, colShortName, endpointType) {
    var datasourceShortName = _immAdminStore.getIn(workingCsSelectedNodeKeyPath).get(2);
    var immTableKeyPath = Imm.List(['workingCs', 'datasources', datasourceShortName, 'tables', tableShortName]);
    var immColumnEndpointsKeyPath = immTableKeyPath.push('columns', colShortName, endpointType);
    var immEndpoints = _immAdminStore.getIn(immColumnEndpointsKeyPath);

    function updateNode(mutDatasources, immPath) {
      mutDatasources.getIn(immPath).forEach(function(immNode, shortName) {
        var immNodePath = immPath.push(shortName);
        mutDatasources.setIn(immNodePath.push('selected'), false);

        var tableIsSelf = immNodePath.equals(immTableKeyPath.skip(2));  // remove 'workingCs' and 'datasources'
        if (immNode.get('checkboxState') && !tableIsSelf) {
          mutDatasources.setIn(immNodePath.push('inSchema'), true);
          mutDatasources.setIn(immNodePath.push('inSearch'), true);
          if (immNode.get('childrenName')) {
            mutDatasources.setIn(immNodePath.push('expanded'), true);
            updateNode(mutDatasources, immNodePath.push(immNode.get('childrenName')));
          } else {
            // The current tree-node is a column. Check the checkbox if it's part of an edge with the selected column.
            var isEndpoint = immEndpoints.contains(immNodePath);
            mutDatasources.setIn(immNodePath.push('checkboxState'), isEndpoint);
          }
        } else {
          mutDatasources.setIn(immNodePath.push('inSchema'), false);
          mutDatasources.setIn(immNodePath.push('inSearch'), false);
          mutDatasources.setIn(immNodePath.push('checkboxState'), false);
        }
      });
    }

    return _immAdminStore.getIn(['workingCs', 'datasources']).withMutations(function(mutDatasources) {
      updateNode(mutDatasources, Imm.List());
    });
  },

  getEdgeEndpointPaths: function(immDatasources) {
    var endpointPaths = [];
    immDatasources.forEach(function(immDatasource, dsShortName) {
      if (immDatasource.get('checkboxState')) {
        immDatasource.get('tables').forEach(function(immTable, tableShortName) {
          if (immTable.get('checkboxState')) {
            immTable.get('columns').forEach(function(immColumn, columnShortName) {
              if (immColumn.get('checkboxState')) {
                endpointPaths.push(Imm.List([dsShortName, 'tables', tableShortName, 'columns', columnShortName]));
              }
            });
          }
        });
      }
    });
    return Imm.Set(endpointPaths);
  },

  // `getNewWorkingCs` uses the contents of adminStore.datasources to create a new workingCs.
  // The new workingCs will have:
  //   * no datasources expanded
  //   * no checkboxes checked
  //   * no node selected
  //   * all tables and columns available for search
  //   * long names of tables and columns set to their respective shortnames
  getNewWorkingCs: function() {
    // immPath:
    //   Recursion depth 0: []
    //   Recursion depth 1: [<< datasource short name >>, 'tables']
    //   Recursion depth 2: [<< datasource short name >>, 'tables', << table short name >>, 'columns']
    function updateNode(mutDatasources, immPath) {
      mutDatasources.getIn(immPath).forEach(function(immNode, shortName) {
        var immNamePath = immPath.push(shortName);
        mutDatasources.setIn(immNamePath.push('checkboxState'), false);
        mutDatasources.setIn(immNamePath.push('inSearch'), true);
        mutDatasources.setIn(immNamePath.push('longName'), mutDatasources.getIn(immNamePath.push('longName')) || mutDatasources.getIn(immNamePath.push('shortName')));
        mutDatasources.setIn(immNamePath.push('dataType'), mutDatasources.getIn(immNamePath.push('dataType')));
        if (immPath.size === 2) {
          // Initialize these values on tables only.
          mutDatasources.setIn(immNamePath.push('isInvisible'), false);
          mutDatasources.setIn(immNamePath.push('isDRTEnabled'), false);
          mutDatasources.setIn(immNamePath.push('uniquenessStatus'), 'Unchecked');
        }
        if (immPath.size === 4) {
          // Initialize these values on columns only.
          mutDatasources.mergeIn(immNamePath, {
            name: mutDatasources.getIn(immNamePath.push('shortName')),
            batchEditCheckboxState: false,
            dataType: mutDatasources.getIn(immNamePath.push('dataType'), 'String'),
            hasChild: false,
            hasParent: false,
            isInvisible: false,
            isUnique: false,
            children: Imm.Set(),
            parents: Imm.Set()
          });
        }
        if (immPath.size < 4) {
          // Only add these values to datasources and tables.
          mutDatasources.setIn(immNamePath.push('expanded'), false);
          mutDatasources.setIn(immNamePath.push('selected'), false);
        }
        if (immPath.size < 3) {
          var childrenName = ['tables', 'columns'][immPath.size / 2];
          mutDatasources.setIn(immNamePath.push('childrenName'), childrenName);
          updateNode(mutDatasources, immNamePath.push(childrenName));
        }
      });
    }

    var datasources = _immAdminStore.get('datasources').withMutations(function(mutDatasources) { updateNode(mutDatasources, Imm.List()); });

    return Imm.fromJS({
      id: null,
      yutaniId: null,
      name: null,
      datasources: datasources,
      legacy: null,
      selectedNodeKeyPath: null,
      dbConnectionName: _immAdminStore.get('accountClinicalDBs').keySeq().get(0)
    });
  },

  getTableNameByPath: function(immTablePath) {
    return immTablePath.last();
  },

  getTablePath: function(tableShortName) {
    return AdminStore.isDatasource(_immAdminStore.getIn(workingCsSelectedNodeKeyPath)) ?
      _immAdminStore.getIn(workingCsSelectedNodeKeyPath).push('tables', tableShortName) : _immAdminStore.getIn(workingCsSelectedNodeKeyPath);
  },

  // We need two types of user information:
  // 1. The list of all users that can be assigned to a schema. This we get from
  //    LDAP via Darkroom.
  // 2. The List of users currently assigned to each schema. Currently we get
  //    this from Yutani but this will ultimately be changed to come from
  //    Darkroom as well.
  getLegacyUsers: function() {
    var currentAccountId = _immAdminStore.get('currentAccountId');

    if (_immAdminStore.get('schemaListIsLoading')) { return; }

    AppRequest({type: 'GET', url: '/api/admin/get-users'}).then(
      function(data) {
        var url = '/api/admin/comprehend-schema-yutani-users-list';
        AppRequest({type: 'GET', url: url}).then(
          function(data) {
            var immUpdatedMetadataList = _immAdminStore
              .get('comprehendSchemaMetadataList')
              .map(function(immSchema) {
                // See if we have user info for this schema.
                var userInfoSchema = _.find(data, function(userInfo) {
                  return userInfo.schemaName === immSchema.get('schemaName');
                });
                return _.isUndefined(userInfoSchema) ? immSchema : immSchema.set('legacyUsers', Imm.fromJS(userInfoSchema.users));
              });
            _immAdminStore = _immAdminStore.merge({comprehendSchemaMetadataList: immUpdatedMetadataList, schemaUsersAreLoading: false});
            AdminStore.emitChange();
          },
          function(jqXHR) {
            GA.sendAjaxException('GET list of schema users for customer ' + currentAccountId + ' failed.', jqXHR.status);
            _immAdminStore = _immAdminStore.set('schemaUsersAreLoading', false);
            AdminStore.emitChange();
          });

        _immAdminStore = _immAdminStore.merge({legacyUsers: Imm.List(data), usersAreLoading: false});
        AdminStore.emitChange();
      },
      function(jqXHR) {
        GA.sendAjaxException('GET list of users for customer ' + currentAccountId + ' failed.', jqXHR.status);
        _immAdminStore = _immAdminStore.set('usersAreLoading', false);
        AdminStore.emitChange();
      });
    _immAdminStore = _immAdminStore.merge({legacyUsers: Imm.List(), schemaUsersAreLoading: true, usersAreLoading: true, schemaUsersChangeList: Imm.List()});
  },

  getYellowfinUserGroups: function() {
    const currentAccountId = _immAdminStore.get('currentAccountId');

    if (!_immAdminStore.get('yfUserGroups', null)) {
      AppRequest({type: 'GET', url: '/api/admin/yf-groups'}).then(
        (data) => {
          _immAdminStore = _immAdminStore.set('yfUserGroups', Imm.fromJS(data.groups));
          AdminStore.emitChange();
        },
        (jqXHR) => {
          GA.sendAjaxException(`GET yellowfin user groups for customer ${currentAccountId} failed.`, jqXHR.status);
        }
      );
    }
  },

  /**
   * For a given Yellowfin group ID, return the list of content folders they have Read access for
   * @param groupID - The internal Yellowfin Group ID
   */
  getYellowfinReportsForGroup: function(groupID) {
    const currentAccountId = _immAdminStore.get('currentAccountId');

    if (!_immAdminStore.get('yfReportRequestInProgress')) {
      _immAdminStore = _immAdminStore.set('yfReportRequestInProgress', true);
      _immAdminStore = _immAdminStore.deleteIn(['yfReports', groupID]);

      AppRequest({
        type: 'GET',
        url: `/api/admin/yf-reports/${Number(groupID)}`
      }).then(
        (data) => {
          _immAdminStore = _immAdminStore.setIn(['yfReports', groupID], Imm.fromJS(data));
          _immAdminStore = _immAdminStore.delete('yfReportRequestInProgress');
          AdminStore.emitChange();
        },
        (jqXHR) => {
          GA.sendAjaxException(`GET /admin/yf-reports for group ${groupID} on customer ${currentAccountId} failed`, jqXHR.status);
          _immAdminStore = _immAdminStore.delete('yfReportRequestInProgress');
          AdminStore.emitChange();
        }
      );
    }

    AdminStore.emitChange();
  },

  /**
   * For a given yellowfin group and OOB KPI Sharing data information, will share/unshare the list of content folders
   * @param groupID - The internal Yellowfin Group ID
   * @param reportShareData - JSON representation of what content folders on the parent organization the group should have access to
   * @param callback
   */
  saveYellowfinReportSharingForGroup: function(groupID, reportShareData, callback) {
    const currentAccountId = _immAdminStore.get('currentAccountId');

    if (!_immAdminStore.get('saveYfReportSharingInProgress')) {
      _immAdminStore = _immAdminStore.set('saveYfReportSharingInProgress', true);

      AppRequest({
        type: 'POST',
        url: `/api/admin/yf-reports/${groupID}`,
        data: JSON.stringify({"shareData" : reportShareData.toJS()}),
        dataType: 'text'
      }).then(
        (data) => {
          _immAdminStore = _immAdminStore.delete('saveYfReportSharingInProgress');
          AdminStore.emitChange();

          callback(true);
        },
        (jqXHR) => {
          GA.sendAjaxException(`POST /admin/yf-reports for group ${groupID} on customer ${currentAccountId} failed`, jqXHR.status);
          _immAdminStore = _immAdminStore.delete('saveYfReportSharingInProgress');
          AdminStore.emitChange();

          callback(false);
        }
      );
    }

    AdminStore.emitChange();
  },

  inactivityLogoutWarningModal: function() {
    AdminStore.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.YOUR_SESSION_WILL_END,
      content: FrontendConstants.YOUR_SESSION_IS_ABOUT_TO_END,
      handleCancel: function() {
        AdminActions.closeModal();
        AdminActions.extendSession();
      },
      primaryButton: {
        text: FrontendConstants.OK
      }
    });
  },

  incrementGPPNumericChartCount: function(tableString) {
    _immAdminStore = _immAdminStore.updateIn(['workingGPP', 'numericChartDatePaths', tableString, 'chartCount'], 0, function(count) {
      return count + 1;
    });
  },

  isDatasource: function(nodePath) {
    return _immAdminStore.getIn(nodePath).has('tables');
  },

  loadTableColumns: function(immTablePath) {
    if (!_immAdminStore.getIn(immTablePath).has('values')) {
      // Only do a load if we haven't already pulled in the preview data.
      var datasourceName = AdminStore.getCurrentDatasourceName();
      var tableName = AdminStore.getTableNameByPath(immTablePath);
      var dbConnectionName =  _immAdminStore.getIn(['workingCs', 'dbConnectionName']);
      AppRequest({type: 'GET', url: '/api/admin/comprehend-schema-table/' + dbConnectionName + '/' + Util.pgEscapeDoubleQuote(datasourceName) + '/' + Util.pgEscapeDoubleQuote(tableName)}).then(
        function(data) {
          if (AdminStore.getCurrentDatasourceName() === datasourceName) {
            if (!_immAdminStore.getIn(immTablePath).has('values')) {
              var immColumns = _immAdminStore.getIn(immTablePath.push('columns'));
              _immAdminStore = _immAdminStore.mergeIn(immTablePath, {
                columnOrdering: immColumns.keySeq().toList().sort(),
                values: _.map(data.values, function(value) { return {row: value}; }),
                tableDataIsLoading: false
              });
            }
            AdminStore.emitChange();
          }
        },
        function(jqXHR) {
          GA.sendAjaxException('GET comprehend schema for a table failed in AdminStore loadTableColumns for customer ' + _immAdminStore.get('currentAccountId'), jqXHR.status);
          _immAdminStore = _immAdminStore.setIn(immTablePath.push('tableDataIsLoading'), false);
        });
      _immAdminStore = _immAdminStore.setIn(immTablePath.push('tableDataIsLoading'), true);
    }
  },

  loadUser: function(userId, callback) {
    AppRequest({type: 'GET', url: '/api/admin/users/' + userId}).then(
      function(userWrapper) {
        AdminStore.addUserToStore(userWrapper);
        AdminStore.emitChange();

        if (callback) {
          Util.getGuardedCallback(callback)();
        }
      },
      function(jqXHR) {
        const userWrapper = Imm.fromJS({
          user: {
            id: userId,
            invalid: true
          }
        });
        AdminStore.addUserToStore(userWrapper);
        AdminStore.emitChange();
        GA.sendAjaxException('GET user for ' + userId + ' failed.', jqXHR.status);

        if (callback) {
          Util.getGuardedCallback(callback)();
        }
      });
  },

  /**
   * The users list in admin store is an immutable list. It should have been originally implemented as a map to avoid
   * keying issues, however we can use this as a stop-gap to ensure that we do not insert multiple copies of the same user
   *
   * If we have multiple copies of the same user, the Users list will fail to load due to keying issues. Using this helper
   * method avoids that
   * @param userWrapper {JSON} - The user wrapper to insert into the users list
   */
  addUserToStore(userWrapper) {
    const immUserWrapper = Imm.fromJS(userWrapper);
    const userId = immUserWrapper.getIn(['user', 'id']);
    const usersList = _immAdminStore.get('users').filterNot(user => user.getIn(['user', 'id']) === userId).unshift(immUserWrapper).sortBy(user => user.getIn(['user', 'lastName'], ''));
    _immAdminStore = _immAdminStore.set('users', usersList);
  },

  loadAllUsers: function() {
    const requestName = AdminRequestConstants.LOAD_ALL_USERS;
    AdminStore.loadUsers(requestName, 'users');
  },

  loadAllUsersForWorkflow: function() {
    const requestName = AdminRequestConstants.LOAD_ALL_USERS_FOR_WORKFLOW;
    AdminStore.loadUsers(requestName, 'workflowUsers');
  },

  clearUsersForWorkflow: function() {
    _immAdminStore = _immAdminStore.set('workflowUsers', Imm.List());
  },

  loadUsers: function(requestName, key) {
    AdminStore.initializeRequest(requestName);

    const url = '/api/admin/users';
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      function(data) {
        var immUserWrappers = Imm.fromJS(data);
        _immAdminStore = _immAdminStore.set(key, immUserWrappers);
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      },
      function(jqXHR) {
        GA.sendAjaxException('GET ' + url + ' failed.', jqXHR.status);
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      }
    );

    AdminStore.startOutstandingRequest(requestName, newRequest);
  },

  loadUsersWithPageSettings: async function (pageSettings) {
    const params = Util.buildFixedDataTableParams(pageSettings);

    const oldRequest = _immAdminStore.getIn(['outstandingRequests', 'usersRequest']);
    
    if (oldRequest) {
      await oldRequest.toJS().abort();
    }

    const url = `/api/admin/users/paginated?${params}`;

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      function(data) {
        AdminStore.usersViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        var immUserWrappers = Imm.fromJS(data.userWrappers);
        var immUserIds = immUserWrappers.map(function(immUser){
          return immUser.getIn(['user', 'id']);
        });
        _immAdminStore = _immAdminStore.mergeDeep({
          usersAreLoading: false,
          usersView: {
            isEmpty: immUserIds.isEmpty(),
            totalRows: data.totalUsers
        }});

        _immAdminStore = _immAdminStore.mergeIn(['usersView'], {
          begin: data.begin,
          userIds: immUserIds
        });
        _immAdminStore = _immAdminStore.set('users', immUserWrappers);
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'usersRequest']);
        AdminStore.emitChange();
      },
      function(jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            AdminStore.usersViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            AdminStore.usersViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        _immAdminStore = _immAdminStore.merge({usersAreLoading: false});
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'usersRequest']);
        AdminStore.emitChange();
      }
    );

    _immAdminStore = _immAdminStore.merge({usersAreLoading: true, outstandingRequests: {usersRequest: newRequest}});
    AdminStore.emitChange();
  },

  removeEdgesFromNode: function(immNodeKeyPath) {
    function manageEdges(immNodeKeyPath, mutAdminStore) {
      var immParentsToFix, immChildrenToFix;

      var immNodeColumnsKeyPath = immNodeKeyPath.push('columns');
      mutAdminStore.updateIn(immNodeColumnsKeyPath, function(immColumns) {
        immParentsToFix = immColumns.reduce(function(immMemo, immColumn, colShortName) {
          var immEndpointKeyPath = immNodeColumnsKeyPath.push(colShortName).skip(2);  // Skip 'workingCs' and 'datasources'
          return immMemo.concat(immColumn.get('parents').map(function(immParent) {
            return Imm.Map({
              parent: immParent.unshift('workingCs', 'datasources'),
              child: immEndpointKeyPath
            });
          }));
        }, Imm.List());

        immChildrenToFix = immColumns.reduce(function(immMemo, immColumn, colShortName) {
          var immEndpointKeyPath = immNodeColumnsKeyPath.push(colShortName).skip(2);  // Skip 'workingCs' and 'datasources'
          return immMemo.concat(immColumn.get('children').map(function(immChild) {
            return Imm.Map({
              parent: immEndpointKeyPath,
              child: immChild.unshift('workingCs', 'datasources')
            });
          }));
        }, Imm.List());

        return immColumns.map(function(immColumn) {
          return immColumn.merge({
            hasChild: false,
            hasParent: false,
            parents: Imm.Set(),
            children: Imm.Set()
          });
        });
      });

      immParentsToFix.forEach(function(edge) {
        var immChildrenPath = edge.get('parent').push('children');
        var immChildren = mutAdminStore.getIn(immChildrenPath).remove(edge.get('child'));
        mutAdminStore.setIn(immChildrenPath, immChildren);
        mutAdminStore.setIn(edge.get('parent').push('hasChild'), !immChildren.isEmpty());
      });

      immChildrenToFix.forEach(function(edge) {
        var immParentsPath = edge.get('child').push('parents');
        var immParents = mutAdminStore.getIn(immParentsPath).remove(edge.get('parent'));
        mutAdminStore.setIn(immParentsPath, immParents);
        mutAdminStore.setIn(edge.get('child').push('hasParent'), !immParents.isEmpty());
      });
    }

    if (immNodeKeyPath.size === 3) {  // A datasource was unchecked
      _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
        mutAdminStore.getIn(immNodeKeyPath.push('tables')).forEach(function(immTable, tableShortName) {
          manageEdges(immNodeKeyPath.push('tables', tableShortName), mutAdminStore);
        });
      });
    } else if (immNodeKeyPath.size === 5) {  // A table was unchecked
      _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
        manageEdges(immNodeKeyPath, mutAdminStore);
      });
    }
  },

  // Removes a GPP chart from workingGPP charts.
  //
  // This function also modifies the table and column legacy metadata to remove GPP-specific metadata.
  // Schema legacy metadata is reset and repopulated when saving a GPP configuration.
  removeGPPChart: function(index) {
    var immGPPChart = _immAdminStore.getIn(['workingGPP', 'charts', index]);
    switch (immGPPChart.get('type')) {
      case 'Duration':
        AdminStore.removeGPPDurationChartMetadata(immGPPChart);
        break;
      case 'Numeric':
        AdminStore.removeGPPNumericChartMetadata(immGPPChart);
    }
    _immAdminStore = _immAdminStore.deleteIn(['workingGPP', 'charts', index]);
  },

  removeGPPDemographyInfoItem: function(immColumnPath) {
    var immInfoPaths = _immAdminStore.getIn(['workingGPP', 'demography', 'infoPaths']);
    _immAdminStore = _immAdminStore.setIn(['workingGPP', 'demography', 'infoPaths'], immInfoPaths.remove(immInfoPaths.indexOf(immColumnPath)));
  },

  removeGPPDurationChartMetadata: function(immGPPChart) {
    if (!immGPPChart.get('tablePath')) {
      return;
    }
    var immTablePath = immGPPChart.get('tablePath').unshift('workingCs', 'datasources');
    var immTable = _immAdminStore.getIn(immTablePath);
    var tableLegacy = JSON.parse(immTable.get('legacy'));
    tableLegacy.metadata = _.reject(tableLegacy.metadata, function(element) {
      return element.type === 'gpp_term_for_duration_prop' ||
        element.type === 'start_date_of_event_np_id_prop' ||
        element.type === 'end_date_of_event_np_id_prop';
    });
    _immAdminStore = _immAdminStore.setIn(immTablePath.push('legacy'), JSON.stringify(tableLegacy));
  },

  removeGPPNumericChartMetadata: function(immGPPChart) {
    // Decrement the chart count
    if (!immGPPChart.get('tablePath')) {
      return;
    }
    var tableString = ComprehendSchemaUtil.pathToTableString(immGPPChart.get('tablePath'));
    AdminStore.decrementGPPNumericChartCount(tableString);

    // Remove the column metadata
    if (!immGPPChart.get('mainColumnPath')) {
      return;
    }
    var immColumnPath = immGPPChart.get('mainColumnPath').unshift('workingCs', 'datasources');
    var immColumn = _immAdminStore.getIn(immColumnPath);
    var columnLegacy = JSON.parse(immColumn.get('legacy'));
    columnLegacy.metadata = _.reject(columnLegacy.metadata, function(element) {
      return element.type === 'normal_range_prop';
    });
    _immAdminStore = _immAdminStore.setIn(immColumnPath.push('legacy'), JSON.stringify(columnLegacy));

    // Remove the table metadata
    if (_immAdminStore.getIn(['workingGPP', 'numericChartDatePaths', tableString, 'chartCount']) > 0) {
      return;
    }
    var immTablePath = immGPPChart.get('tablePath').unshift('workingCs', 'datasources');
    var immTable = _immAdminStore.getIn(immTablePath);
    var tableLegacy = JSON.parse(immTable.get('legacy'));
    tableLegacy.metadata = _.reject(tableLegacy.metadata, function(element) {
      return element.type === 'date_of_event_np_id_prop';
    });
    _immAdminStore = _immAdminStore.setIn(immTablePath.push('legacy'), JSON.stringify(tableLegacy));
  },

  renameColumnLongName: function(shortName, oldLongName, newLongName, tableShortName) {
    var trimmedAndCollapsed = UserInput.trimAndCollapse(newLongName);
    if (oldLongName !== trimmedAndCollapsed) {
      // `selectedNodeKeyPath`: ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>]
      var immColumnLongNameKeyPath = AdminStore.getTablePath(tableShortName).push('columns', shortName, 'longName');
      _immAdminStore = _immAdminStore.setIn(immColumnLongNameKeyPath, trimmedAndCollapsed);
    }
  },

  renameSchema: function(newSchemaName) {
    _immAdminStore = _immAdminStore.setIn(['workingCs', 'name'], UserInput.trimAndCollapse(newSchemaName));
  },

  setDbConnectionName: function(dbConnectionName) {
    _immAdminStore = _immAdminStore.setIn(['workingCs', 'dbConnectionName'], dbConnectionName);
  },

  setIsCDM: function(isCDM) {
    _immAdminStore = _immAdminStore.setIn(['workingCs', 'isCDM'], isCDM);
  },

  renameSchemaTableLongName: function(newLongName, tableShortName) {
    var trimmedAndCollapsed = UserInput.trimAndCollapse(newLongName);
    // `selectedNodeKeyPath`: ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>]
    var immTableLongNameKeyPath = AdminStore.getTablePath(tableShortName).push('longName');
    _immAdminStore = _immAdminStore.setIn(immTableLongNameKeyPath, trimmedAndCollapsed);
  },

  resendInvitationLink: function(userId, callback) {
    var addUserRequest = AppRequest({
      type: 'POST',
      url: '/api/admin/users/resend-invitation',
      data: userId,
      dataType: 'text'
    });
    addUserRequest.then(
      function() {
        Util.getGuardedCallback(callback)();
      },
      function(jqXHR) {
        GA.sendAjaxException('POST resend user confirmation ' + userId + ' failed.', jqXHR.status);
      });
  },

  resetUserPassword: function(userId, callback) {
    var addUserRequest = AppRequest({
      type: 'POST',
      url: '/api/admin/users/reset-password',
      data: userId,
      dataType: 'text'
    });
    addUserRequest.then(
      function() {
        Util.getGuardedCallback(callback)();
      },
      function(jqXHR) {
        GA.sendAjaxException('POST reset-password password ' + userId + ' failed.', jqXHR.status);
      });
  },

  // Clears out state information related to the EditSchema component.
  // This includes table row counts and tree view state.
  resetEditSchemaTab: function() {
    _immAdminStore = _immAdminStore.merge({tableRowCounts: {},
                                           tvSearchState: {
                                             isTvSearchByTable: false,
                                             tvExcludedDataSources: [],
                                             tvResultCounts: [0, 0, 0],
                                             tvShowAllTreeItems: true
                                           }});
  },

  // Requires loadDatasources to have completed, so if any requests are in
  // flight, this function will wait and perform its operations in a callback.
  resetWorkingCs: function() {
    // Clear the current workingCs while we potentially wait for datasources to load.
    _immAdminStore = _immAdminStore.merge({workingCs: _initialWorkingCs, loadedCs: _initialWorkingCs});

    var datasourceRequest = _immAdminStore.getIn(['outstandingRequests', 'datasourceRequest'], Promise.resolve(true));
    datasourceRequest.then(function() {
      var immNewWorkingCs = AdminStore.getNewWorkingCs();
      _immAdminStore = _immAdminStore.merge({workingCs: immNewWorkingCs, loadedCs: immNewWorkingCs});
      AdminStore.emitChange();
    });
  },

  restoreTreeViewState: function(immSelectedNodeKeyPath, immTvSearchState, expandedDatasources) {
    if (immSelectedNodeKeyPath) {
      AdminStore.updateSelectedNode(immSelectedNodeKeyPath);
      AdminStore.loadTableColumns(immSelectedNodeKeyPath);
    }
    AdminStore.updateTvSearch(immTvSearchState, true);
    _immAdminStore = _immAdminStore.mergeDeepIn(['workingCs', 'datasources'], _.reduce(expandedDatasources,
      function(memo, datasourceShortName) {
        memo[datasourceShortName] = {expanded: true};
        return memo;
      }, {}));
  },

  saveSchemaUsers: function() {
    var schemaUsersChangeListStringified = JSON.stringify(_immAdminStore.get('schemaUsersChangeList').toJS());
    var url = '/api/admin/update-schema-yutani-user-access';
    new Promise(function(resolve, reject) {
      AppRequest({
        type: 'PUT',
        url: url,
        data: schemaUsersChangeListStringified
      }).then(
        function(data) {
          if (data) {
            resolve();
          } else {
            reject();
          }
        },
        function(jqXHR) {
          reject(jqXHR.status);
        });
    }).then(function() {
      AdminStore.getLegacyUsers();
      _immAdminStore = _immAdminStore.merge({schemaUsersAreSaving: false, schemaUsersChangeList: Imm.List()});
      AdminStore.emitChange();
    }, function(statusCode) {
      console.log('%cERROR: PUT Comprehend Schema Access Changes failed', 'color: #E05353');
      GA.sendAjaxException('PUT Comprehend Schema Access Changes for customer' + _immAdminStore.get('currentAccountId') + 'failed.', statusCode);
      AdminStore.getLegacyUsers();
      _immAdminStore = _immAdminStore.merge({schemaUsersAreSaving: false, schemaUsersChangeList: Imm.List()});
      AdminStore.createStatusMessage('Error saving one or more users', StatusMessageTypeConstants.WARNING);
      AdminStore.emitChange();
    });
    _immAdminStore = _immAdminStore.merge({legacyUsers: Imm.List(), schemaUsersAreSaving: true});
    AdminStore.emitChange();
  },

  saveAndDeployComprehendSchema: function(mode, callback) {
    if (_immAdminStore.get('csIsSaving')) {
      return;
    }

    var comprehendSchema = AdminStore.getCurrentCs();
    var schemaName = comprehendSchema.name;
    var schemaId = comprehendSchema.id;

    // TODO Ensure that the schema name is valid.

    var type;
    var url = '/api/admin/comprehend-schema';
    switch (mode) {
      case SaveModeConstants.CREATE:
        type = 'POST';
        break;
      case SaveModeConstants.EDIT:
        type = 'PUT';
        url += '/' + schemaId;
        break;
    }
    AppRequest({
      type: type,
      url: url,
      data: JSON.stringify(comprehendSchema)
    }).then(
      function(data) {
        if (_immAdminStore.getIn(['workingCs', 'name']) !== schemaName || !_immAdminStore.get('csIsSaving')) {
          return;
        }

        AdminStore.setWorkingCs(data);
        _immAdminStore = _immAdminStore.merge({csIsSaving: false});

        AdminStore.createStatusMessage('Status update: "' + schemaName + '" has been deployed.', 'status');
        AdminStore.emitChange();
        Util.getGuardedCallback(callback)();

      },
      function(jqXHR) {
        console.log('%cERROR: ' + type + ' Comprehend Schema failed', 'color: #E05353');
        GA.sendAjaxException(type + ' Comprehend Schema for customer' + _immAdminStore.get('currentAccountId') + ', schema ' + schemaId + ' failed.', jqXHR.statusCode);
        if (_immAdminStore.getIn(['workingCs', 'name']) === schemaName && _immAdminStore.get('csIsSaving')) {
          _immAdminStore = _immAdminStore.set('csIsSaving', false);
          AdminStore.emitChange();
        }
        AdminStore.showFailureMessage('Status update: Deploy is unsuccessful. ' + jqXHR.responseJSON.message);
      });
    _immAdminStore = _immAdminStore.set('csIsSaving', true);
  },

  saveAndDeployGPPConfig: function() {
    if (_immAdminStore.get('csIsSaving')) {
      return;
    }
    if (!_immAdminStore.getIn(['workingGPP', 'demography', 'tablePath']) || !_immAdminStore.getIn(['workingGPP', 'demography', 'namePath'])) {
      AdminStore.createStatusMessage('Please set GPP patient information before saving.', 'warning');
      return;
    }
    var immNumericChartDatePaths = _immAdminStore.getIn(['workingGPP', 'numericChartDatePaths']);
    if (!_immAdminStore.getIn(['workingGPP', 'charts']).every(_.partial(ComprehendSchemaUtil.isValidGPPChart, _, immNumericChartDatePaths))) {
      AdminStore.createStatusMessage('At least one GPP chart is invalid. Please fix before saving.', 'warning');
      return;
    }

    AdminStore.setGPPMetadata();
    var comprehendSchema = AdminStore.getCurrentCs();
    var schemaName = comprehendSchema.name;
    var schemaId = comprehendSchema.id;

    var url = '/api/admin/comprehend-schema/' + schemaId;
    AppRequest({
      type: 'PUT',
      url: url,
      data: JSON.stringify(comprehendSchema)
    }).then(
      function(data) {
        if (_immAdminStore.getIn(['workingCs', 'name']) !== schemaName || !_immAdminStore.get('csIsSaving')) {
          return;
        }
        AdminStore.setWorkingCs(data);
        AdminStore.setWorkingGPP(data);
        _immAdminStore = _immAdminStore.set('csIsSaving', false);
        AdminStore.createStatusMessage('Status update: GPP config for "' + schemaName + '" has been deployed.', 'status');
        AdminStore.emitChange();
      },
      function(jqXHR) {
        console.log('%cERROR: PUT Comprehend Schema failed', 'color: #E05353');
        GA.sendAjaxException('PUT Comprehend Schema for customer' + _immAdminStore.get('currentAccountId') + ', schema ' + schemaId + ' failed.', jqXHR.statusCode);
        if (_immAdminStore.getIn(['workingCs', 'name']) === schemaName && _immAdminStore.get('csIsSaving')) {
          _immAdminStore = _immAdminStore.set('csIsSaving', false);
          AdminStore.emitChange();
        }
        AdminStore.showFailureMessage('Status update: Deploy is unsuccessful.');
      });
    _immAdminStore = _immAdminStore.set('csIsSaving', true);
  },

  saveComprehendSchema: function() {
    // TODO Implement this for TP 4806.
  },

  saveComprehendSchemaJson: function(data) {
    var schemaName = _immAdminStore.getIn(['comprehendSchemaJson', 'schemaName']);
    var schemaId = _immAdminStore.getIn(['comprehendSchemaJson', 'schemaId']);

    var url = '/api/admin/comprehend-schema-json/' + schemaId;
    if (!_immAdminStore.getIn(['comprehendSchemaJson', 'isSaving'])) {
      new Promise(function(resolve, reject) {
        AppRequest({
          type: 'PUT',
          url: url,
          data: JSON.stringify(data)
        }).then(
          function(data) {
            if (data) {
              AdminStore.createStatusMessage('Status update: "' + schemaName + '" has been deployed.', 'status');
              AdminStore.getComprehendSchemaList();
              resolve();
            } else {
              reject();
            }
          },
          function(jqXHR) {
            AdminStore.showFailureMessage('Status update: Deploy is unsuccessful.');
            reject(jqXHR.status);
          });
      }).then(
        function() {
          if (_immAdminStore.getIn(['comprehendSchemaJson', 'schemaName']) === schemaName && _immAdminStore.getIn(['comprehendSchemaJson', 'isSaving'])) {
            AdminStore.closeComprehendSchemaEditor();
            AdminStore.emitChange();
          }
        }.bind(this),
        function(statusCode) {
          console.log('%cERROR: PUT Comprehend Schema Json failed', 'color: #E05353');
          GA.sendAjaxException('PUT Comprehend Schema Json for customer' + _immAdminStore.get('currentAccountId') + ', schema ' + schemaId + ' failed.', statusCode);
          if (_immAdminStore.getIn(['comprehendSchemaJson', 'schemaName']) === schemaName && _immAdminStore.getIn(['comprehendSchemaJson', 'isSaving'])) {
            _immAdminStore = _immAdminStore.mergeDeep({comprehendSchemaJson: {error: 'Save failed', isSaving: false}});
            AdminStore.emitChange();
          }
          AdminStore.showFailureMessage('Status update: Deploy is unsuccessful.');
        }
      );
      _immAdminStore = _immAdminStore.mergeDeep({comprehendSchemaJson: {data: data, error: null, isSaving: true}});
    }
  },

  // TODO: refactor to setColumnVisibility
  setColumnInvisibility: function(tableShortName, columnShortName, isInvisible) {
    var immTablePath = AdminStore.getTablePath(tableShortName);
    var immTableColumnKeyPath = immTablePath.push('columns');
    var immColumnIsInvisibleKeyPath = immTableColumnKeyPath.push(columnShortName, 'isInvisible');
    _immAdminStore = _immAdminStore.setIn(immColumnIsInvisibleKeyPath, isInvisible);

    var immTableLongNameKeyPath = immTablePath.push('isInvisible');
    _immAdminStore = _immAdminStore.setIn(immTableLongNameKeyPath, _immAdminStore.getIn(immTableColumnKeyPath).every(function(value) { return value.get('isInvisible'); }));
  },

  setColumnEdges: function(tableShortName, columnShortName, endpointType, immDatasources) {
    var datasourceShortName = _immAdminStore.getIn(workingCsSelectedNodeKeyPath).get(2);
    var endpointFlag = endpointType === 'children' ? 'hasChild' : 'hasParent';
    var immCurrentColumnPath = Imm.List(['workingCs', 'datasources', datasourceShortName, 'tables', tableShortName, 'columns', columnShortName]);
    var immOldEndpoints = _immAdminStore.getIn(immCurrentColumnPath.push(endpointType));
    var immNewEndpoints = AdminStore.getEdgeEndpointPaths(immDatasources);

    var immAddedEndpoints = immNewEndpoints.subtract(immOldEndpoints);
    var immRemovedEndpoints = immOldEndpoints.subtract(immNewEndpoints);
    var opposingEndpointType = endpointType === 'children' ? 'parents' : 'children';
    var opposingEndpointFlag = endpointType === 'children' ? 'hasParent' : 'hasChild';

    var immTruncatedCurrentColumnPath = immCurrentColumnPath.skip(2);  // Remove 'workingCs' and 'datasources'
    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      immAddedEndpoints.forEach(function(immEndpointPath) {
        var immFullPath = immEndpointPath.unshift('workingCs', 'datasources');
        var immOpposingEndpoints = mutAdminStore.getIn(immFullPath.push(opposingEndpointType)).add(immTruncatedCurrentColumnPath);
        mutAdminStore.setIn(immFullPath.push(opposingEndpointType), immOpposingEndpoints);
        mutAdminStore.setIn(immFullPath.push(opposingEndpointFlag), true);
      });

      immRemovedEndpoints.forEach(function(immEndpointPath) {
        var immFullPath = immEndpointPath.unshift('workingCs', 'datasources');
        var immOpposingEndpoints = mutAdminStore.getIn(immFullPath.push(opposingEndpointType)).remove(immTruncatedCurrentColumnPath);
        mutAdminStore.setIn(immFullPath.push(opposingEndpointType), immOpposingEndpoints);
        mutAdminStore.setIn(immFullPath.push(opposingEndpointFlag), !immOpposingEndpoints.isEmpty());
      });

      mutAdminStore.setIn(immCurrentColumnPath.push(endpointType), immNewEndpoints);
      mutAdminStore.setIn(immCurrentColumnPath.push(endpointFlag), !immNewEndpoints.isEmpty());
    });
    AdminStore.closeModal();
  },

  setColumnType: function(columnShortName, type, tableShortName) {
    var immColumnLongNameKeyPath = AdminStore.getTablePath(tableShortName).push('columns', columnShortName, 'dataType');
    _immAdminStore = _immAdminStore.setIn(immColumnLongNameKeyPath, type);
  },

  setColumnUniqueness: function(columnShortName, isUnique, tableShortName) {
    var immTablePath = AdminStore.getTablePath(tableShortName);
    var immColumnIsUniqueKeyPath = immTablePath.push('columns', columnShortName, 'isUnique');
    _immAdminStore = _immAdminStore.setIn(immColumnIsUniqueKeyPath, isUnique);
    _immAdminStore = _immAdminStore.setIn(immTablePath.push('uniquenessStatus'), 'Unchecked');
  },

  setCurrentSchema: function(id, selected) {
    var immComprehendSchemaMetadataList = _immAdminStore.get('comprehendSchemaMetadataList').map(function(immCs) {
      return immCs.set('isSelected', immCs.get('id') === id && selected);
    });
    _immAdminStore = _immAdminStore.set('comprehendSchemaMetadataList', immComprehendSchemaMetadataList);
   },

  setCurrentTab: function(tabName) {
    _immAdminStore = _immAdminStore.set('currentTab', tabName);
  },

  // Loads data from workingGPP into legacy metadata fields in workingCs.
  setGPPMetadata: function() {
    var immWorkingGPP = _immAdminStore.get('workingGPP');
    var immDurationCharts = immWorkingGPP.get('charts').filter(function(immChart) { return immChart.get('type') === 'Duration'; });
    var immNumericCharts = immWorkingGPP.get('charts').filter(function(immChart) { return immChart.get('type') === 'Numeric'; });

    var schemaLegacy = JSON.parse(_immAdminStore.getIn(['workingCs', 'legacy']));
    schemaLegacy.metadata = _.reject(schemaLegacy.metadata, function(element) {
      return element.type === 'gpp_demography_node_prop' || element.type === 'gpp_drill_down_prop';
    });
    schemaLegacy.metadata.push({
      type: 'gpp_demography_node_prop',
      nodeId: ComprehendSchemaUtil.pathToTableString(immWorkingGPP.getIn(['demography', 'tablePath'])),
      nameNodeProperties: [ComprehendSchemaUtil.pathToColumnString(immWorkingGPP.getIn(['demography', 'namePath']))],
      informationProperties: immWorkingGPP.getIn(['demography', 'infoPaths']).map(ComprehendSchemaUtil.pathToColumnString).toJS()
    });

    var durationCharts = immDurationCharts.map(function(immChart) { return ComprehendSchemaUtil.pathToTableString(immChart.get('tablePath')); }).toJS();
    var numericCharts = immNumericCharts
      .groupBy(function(immChart) { return ComprehendSchemaUtil.pathToTableString(immChart.get('tablePath')); })
      .map(function(immCharts) {
        return immCharts.map(function(immChart) { return ComprehendSchemaUtil.pathToColumnString(immChart.get('mainColumnPath')); });
      }).toJS();
    schemaLegacy.metadata.push({
      type: 'gpp_drill_down_prop',
      durationCharts: durationCharts,
      numericCharts: numericCharts
    });

    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      immDurationCharts.forEach(function(immChart) {
        var immLegacyPath = immChart.get('tablePath').unshift('workingCs', 'datasources').push('legacy');
        var tableLegacy = JSON.parse(mutAdminStore.getIn(immLegacyPath));
        tableLegacy.metadata = _.reject(tableLegacy.metadata, function(element) {
          return element.type === 'gpp_term_for_duration_prop' ||
            element.type === 'start_date_of_event_np_id_prop' ||
            element.type === 'end_date_of_event_np_id_prop';
        });

        tableLegacy.metadata.push({
          type: 'gpp_term_for_duration_prop',
          propertyId: ComprehendSchemaUtil.pathToColumnString(immChart.get('mainColumnPath'))
        });
        tableLegacy.metadata.push({
          type: 'start_date_of_event_np_id_prop',
          propertyId: ComprehendSchemaUtil.pathToColumnString(immChart.get('lowerBoundPath'))
        });
        tableLegacy.metadata.push({
          type: 'end_date_of_event_np_id_prop',
          propertyId: ComprehendSchemaUtil.pathToColumnString(immChart.get('upperBoundPath'))
        });
        mutAdminStore.setIn(immLegacyPath, JSON.stringify(tableLegacy));
      });

      immNumericCharts.forEach(function(immChart) {
        var immLegacyPath = immChart.get('mainColumnPath').unshift('workingCs', 'datasources').push('legacy');
        var columnLegacy = JSON.parse(mutAdminStore.getIn(immLegacyPath));
        columnLegacy.metadata = _.reject(columnLegacy.metadata, function(element) {
          return element.type === 'normal_range_prop';
        });

        if (immChart.get('lowerBoundPath') && immChart.get('upperBoundPath')) {
          columnLegacy.metadata.push({
            type: 'normal_range_prop',
            low: ComprehendSchemaUtil.pathToColumnString(immChart.get('lowerBoundPath')),
            high: ComprehendSchemaUtil.pathToColumnString(immChart.get('upperBoundPath'))
          });
        }
        mutAdminStore.setIn(immLegacyPath, JSON.stringify(columnLegacy));
      });

      immWorkingGPP.get('numericChartDatePaths').forEach(function(immData, tableString) {
        if (!immData.get('datePath')) {
          return;
        }
        var immLegacyPath = ComprehendSchemaUtil.tableStringToPath(tableString).unshift('workingCs', 'datasources').push('legacy');
        var tableLegacy = JSON.parse(mutAdminStore.getIn(immLegacyPath));
        tableLegacy.metadata = _.reject(tableLegacy.metadata, function(element) {
          return element.type === 'date_of_event_np_id_prop';
        });

        tableLegacy.metadata.push({
          type: 'date_of_event_np_id_prop',
          propertyId: ComprehendSchemaUtil.pathToColumnString(immData.get('datePath'))
        });
        mutAdminStore.setIn(immLegacyPath, JSON.stringify(tableLegacy));
      });
      mutAdminStore.setIn(['workingCs', 'legacy'], JSON.stringify(schemaLegacy));
    });
  },

  setGPPNumericChartDate: function(immColumnPath) {
    var tableString = ComprehendSchemaUtil.pathToTableString(immColumnPath);
    _immAdminStore = _immAdminStore.setIn(['workingGPP', 'numericChartDatePaths', tableString, 'datePath'], immColumnPath);
  },

  setTableInvisibility: function(isInvisible, tableShortName) {
    var immTablePath = AdminStore.getTablePath(tableShortName);
    var immColumns = _immAdminStore.getIn(immTablePath.push('columns')).map(function(value) {
      return value.set('isInvisible', isInvisible);
    });
    _immAdminStore = _immAdminStore.mergeIn(immTablePath, {
      isInvisible: isInvisible,
      columns: immColumns
    });
  },

  // Requires loadDatasources to have completed, so if any requests are in
  // flight, this function will wait and perform its operations in a callback.
  setWorkingCs: function(cs) {
    // Clear the current workingCs while we potentially wait for datasources to load.
    _immAdminStore = _immAdminStore.merge({workingCs: _initialWorkingCs, loadedCs: _initialWorkingCs});

    var datasourceRequest = _immAdminStore.getIn(['outstandingRequests', 'datasourceRequest'], Promise.resolve(true));

    datasourceRequest.then(function() {
      // `cs` contains a subset of the tables and columns in `_immAdminStore.datasources`. In addition,
      // the ordering of the tables and columns in `cs` is not the same as in `_immAdminStore.datasources`.
      //
      // To easily load the data from `cs` into `_immAdminStore.workingCs.datasources`, we use a lookup map
      // to find the information we need without doing a linear scan.
      var datasourcesMap = _.reduce(cs.datasources, function(dsMap, ds) {
        var tablesMap = _.reduce(ds.nodes, function(tMap, node) {
          var columnsMap = _.reduce(node.properties, function(cMap, property) {
            cMap[property.shortName] = property;
            return cMap;
          }, {});

          var newNode = _.omit(node, 'properties');
          newNode.columns = columnsMap;
          tMap[node.shortName] = newNode;
          return tMap;
        }, {});

        var newDatasource = _.omit(ds, 'nodes');
        newDatasource.tables = tablesMap;
        dsMap[ds.shortName] = newDatasource;
        return dsMap;
      }, {});

      var immEdgeMessages = Imm.List();

      var immWorkingCsDatasources = AdminStore.getNewWorkingCs().get('datasources').withMutations(function(mutDatasources) {
        var immPath = Imm.List();
        mutDatasources.forEach(function(immDatasource, dsShortName) {
          var immDatasourcePath = immPath.push(dsShortName);
          var datasource = datasourcesMap[immDatasource.get('shortName')];

          if (datasource) {
            var nIncludedTables = 0;

            immDatasource.get('tables').forEach(function(immTable, tShortName) {
              var immTablePath = immDatasourcePath.push('tables', tShortName);
              var table = datasource.tables[immTable.get('shortName')];

              if (table) {
                mutDatasources.mergeIn(immTablePath, _.omit(table, 'columns'));
                mutDatasources.setIn(immTablePath.push('checkboxState'), true);
                if (table.legacy) {
                  var legacyObject = JSON.parse(table.legacy);
                  mutDatasources.setIn(immTablePath.push('isDRTEnabled'), ComprehendSchemaUtil.hasDRTProperties(legacyObject));
                  mutDatasources.setIn(immTablePath.push('uniquenessStatus'), ComprehendSchemaUtil.getTableUniquenessStatus(legacyObject));
                }

                var isTableVisible = false;
                nIncludedTables++;

                if (_immAdminStore.getIn(['accountMap', _immAdminStore.get('currentAccountId'), 'account', 'isLegacy'])) {
                  // To support DRT, make sure DRT columns are added to the table so that they can be edited if desired.
                  var drtColumns = _.filter(table.columns, function(column) { return immReviewToolColumnShortNames.contains(column.shortName); });
                  // Filtering an object turns it into an list; now turn it back into a object.
                  var drtColumnMap = _.chain(drtColumns).pluck('shortName').object(drtColumns).value();
                  immTable = immTable.mergeIn(['columns'], drtColumnMap);
                }

                immTable.get('columns').forEach(function(immColumn, cShortName) {
                  var immColumnPath = immTablePath.push('columns', cShortName);
                  var column = table.columns[immColumn.get('shortName')];
                  if (column) {
                    mutDatasources.mergeIn(immColumnPath, column);
                    mutDatasources.setIn(immColumnPath.push('isInvisible'), !column.isVisible);
                    isTableVisible = isTableVisible || column.isVisible;
                  } else {
                    mutDatasources.setIn(immColumnPath.push('isInvisible'), true);
                  }
                  // Add properties used for bookkeeping, since DRT columns will be missing these properties.
                  mutDatasources.mergeIn(immColumnPath, {
                    name: mutDatasources.getIn(immColumnPath.push('shortName')),
                    checkboxState: true,
                    batchEditCheckboxState: false,
                    hasChild: false,
                    hasParent: false,
                    inSearch: true,
                    children: Imm.Set(),
                    parents: Imm.Set()
                  });
                });
                mutDatasources.setIn(immTablePath.push('isInvisible'), !isTableVisible);
              }
            });
            var nTotalTables = immDatasource.get('tables').size;
            var checkboxState = (nIncludedTables === nTotalTables) ? true : (nIncludedTables > 0) ? 'partial' : false;
            mutDatasources.setIn(immDatasourcePath.push('checkboxState'), checkboxState);
          }
        });

        _.each(cs.edges, function(edge) {
          var parentPath = ComprehendSchemaUtil.columnStringToPath(edge.parent);
          var childPath = ComprehendSchemaUtil.columnStringToPath(edge.child);

          var parentPresent = mutDatasources.hasIn(parentPath);
          var childPresent = mutDatasources.hasIn(childPath);
          if (parentPresent && childPresent) {
            var immChildren = mutDatasources.getIn(parentPath.push('children'));
            mutDatasources.setIn(parentPath.push('children'), immChildren.add(childPath));
            mutDatasources.setIn(parentPath.push('hasChild'), true);

            var immParents = mutDatasources.getIn(childPath.push('parents'));
            mutDatasources.setIn(childPath.push('parents'), immParents.add(parentPath));
            mutDatasources.setIn(childPath.push('hasParent'), true);
          } else if (parentPresent) {
            immEdgeMessages = immEdgeMessages.push('The edge ' + edge.parent + ' => ' + edge.child + ' was dropped because the child endpoint is invalid.');
          } else if (childPresent) {
            immEdgeMessages = immEdgeMessages.push('The edge ' + edge.parent + ' => ' + edge.child + ' was dropped because the parent endpoint is invalid.');
          } else {
            immEdgeMessages = immEdgeMessages.push('The edge ' + edge.parent + ' => ' + edge.child + ' was dropped because both endpoints are invalid.');
          }
        });
      });

      var immCs = Imm.fromJS({
        id: cs.id,
        isCDM: cs.isCDM || false,
        yutaniId: cs.yutaniId,
        name: cs.name,
        datasources: immWorkingCsDatasources,
        legacy: cs.legacy,
        selectedNodeKeyPath: null,
        dbConnectionName: cs.dbConnectionName
      });
      _immAdminStore = _immAdminStore.merge({workingCs: immCs, loadedCs: immCs});

      immEdgeMessages.forEach(function(message) {
        AdminStore.createStatusMessage(message, StatusMessageTypeConstants.INFO);
      });

      AdminStore.emitChange();
    });
  },

  setWorkingGPP: function(cs) {
    // Clear existing GPP state.
    _immAdminStore = _immAdminStore.set('workingGPP', Imm.fromJS({
      demography: {
        tablePath: null,
        namePath: null,
        infoPaths: []
      },
      charts: [],
      numericChartDatePaths: {}
    }));

    // Loading the working GPP config is dependent on loading the working Comprehend schema.
    // Since loading the working Comprehend schema is dependent on loading the datasources,
    // loading the working GPP is also dependent on loading the datasources.
    var datasourceRequest = _immAdminStore.getIn(['outstandingRequests', 'datasourceRequest']);
    datasourceRequest.then(function() {
      var schemaLegacy = JSON.parse(cs.legacy || '{}');
      _.each(schemaLegacy.metadata, function(value) {
        switch (value.type) {
          case 'gpp_demography_node_prop':
            _immAdminStore = _immAdminStore.mergeIn(['workingGPP', 'demography'], {
              tablePath: ComprehendSchemaUtil.tableStringToPath(value.nodeId),
              namePath: ComprehendSchemaUtil.columnStringToPath(value.nameNodeProperties[0]),
              infoPaths: _.map(value.informationProperties, ComprehendSchemaUtil.columnStringToPath)
            });
            break;
          case 'gpp_drill_down_prop':
            // Load duration charts
            var durationCharts = _.map(value.durationCharts, function(tableString) {
              var chart = {type: 'Duration', tablePath: ComprehendSchemaUtil.tableStringToPath(tableString)};
              var nodeLegacy = JSON.parse(_immAdminStore.getIn(chart.tablePath.unshift('workingCs', 'datasources').push('legacy')));
              _.each(nodeLegacy.metadata, function(value) {
                switch (value.type) {
                  case 'gpp_term_for_duration_prop':
                    chart.mainColumnPath = ComprehendSchemaUtil.columnStringToPath(value.propertyId);
                    break;
                  case 'start_date_of_event_np_id_prop':
                    chart.lowerBoundPath = ComprehendSchemaUtil.columnStringToPath(value.propertyId);
                    break;
                  case 'end_date_of_event_np_id_prop':
                    chart.upperBoundPath = ComprehendSchemaUtil.columnStringToPath(value.propertyId);
                }
              });
              return Imm.Map(chart);
            });

            // Load numeric charts
            var numericCharts = _.chain(value.numericCharts).map(function(columnStrings, tableString) {
              var immTablePath = ComprehendSchemaUtil.tableStringToPath(tableString);
              return _.map(columnStrings, function(columnString) {
                var immMainColumnPath = ComprehendSchemaUtil.columnStringToPath(columnString);
                var chart = {type: 'Numeric', tablePath: immTablePath, mainColumnPath: immMainColumnPath};
                var columnLegacy = JSON.parse(_immAdminStore.getIn(chart.mainColumnPath.unshift('workingCs', 'datasources').push('legacy')));
                var metadata = _.filter(columnLegacy.metadata, function(element) {
                  return element.type === 'normal_range_prop';
                });
                if (!_.isEmpty(metadata)) {
                  chart.lowerBoundPath = ComprehendSchemaUtil.columnStringToPath(metadata[0].low);
                  chart.upperBoundPath = ComprehendSchemaUtil.columnStringToPath(metadata[0].high);
                }
                return Imm.Map(chart);
              });
            }).flatten(true).value();
            var numericChartDatePaths = _.mapObject(value.numericCharts, function(columnStrings, tableString) {
              var immTablePath = ComprehendSchemaUtil.tableStringToPath(tableString);
              var tableLegacy = JSON.parse(_immAdminStore.getIn(immTablePath.unshift('workingCs', 'datasources').push('legacy')));
              var metadata = _.filter(tableLegacy.metadata, function(element) {
                return element.type === 'date_of_event_np_id_prop';
              })[0];
              var immDatePath = ComprehendSchemaUtil.columnStringToPath(metadata.propertyId);
              return Imm.Map({datePath: immDatePath, chartCount: columnStrings.length})
            });

            _immAdminStore = _immAdminStore.mergeIn(['workingGPP'], {
              charts: durationCharts.concat(numericCharts),
              numericChartDatePaths: numericChartDatePaths
            });
        }
      });
    });
  },

  showFailureMessage: function(text) {
    AdminStore.createStatusMessage(
      text,
      'warning',
      function() {
        AdminStore.closeComprehendSchemaEditor();
        AdminStore.emitChange();
      },
      'Return to Schema page.'
    );
  },

  toggleDRT: function(tableShortName) {
    var immTablePath = AdminStore.getTablePath(tableShortName);
    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      var newDRTState = !mutAdminStore.getIn(immTablePath.push('isDRTEnabled'));
      mutAdminStore.setIn(immTablePath.push('isDRTEnabled'), newDRTState);

      // Automatically make DRT schema columns visible if DRT was enabled, or invisible if DRT was disabled.
      var immTableColumnsPath = immTablePath.push('columns');
      immReviewToolColumnShortNames.forEach(function(columnShortName) {
        var immColumnPath = immTableColumnsPath.push(columnShortName);
        if (mutAdminStore.hasIn(immColumnPath)) {
          mutAdminStore.setIn(immColumnPath.push('isInvisible'), !newDRTState);
        }
      });
    });
  },

  toggleSchemaOpenState: function(schemaIndex, openState) {
    _immAdminStore = _immAdminStore.setIn(['comprehendSchemaMetadataList', schemaIndex, 'isOpen'], openState);
  },

  // [updatedType]
  // BATCH_EDIT_SELECT_ALL_COLUMNS: This will either select or de-select all of the columns
  //   for column batch editing across all non-filtered and in-schema tables.
  //   Can be triggered when both a datasource and a table are selected.
  // BATCH_EDIT_SELECT_ALL_TABLES: This will [de-]select all non-filtered and in-schema
  //   tables for table batch editing.
  // BATCH_EDIT_SET_COLUMN_STATE: Updates a field on the column pointed to by the shortNameInfo.
  //   The affected field is chosen by updatedField, the new state is
  //   updatedState. Can be triggered when both a datasource and a table are
  //   selected.
  // BATCH_EDIT_SET_TABLE_STATE: Updates a field on the table pointed to by the shortNameInfo.
  //   The affected field is chosen by updatedField, the new state is
  //   updatedState.
  // BATCH_EDIT_MODE_TOGGLE: Enable or disable batch editing mode. It will also set the
  //   columns and tables to the default true selection mode.
  //
  // [updatedField]
  // batchEditExpanded: Display the preview of a table if it is true. For table only.
  // batchEditCheckboxState: True if the checkbox of a table/column is selected.
  //
  // [shortNameInfo]
  // If we are updating columns this will contain index info for both the table
  // and column being updated. If we are updating a table it will just contain
  // the table's index and a null. The object looks thusly:
  //  { tableShortName: <short name of table>, colShortName: <short name of column> }
  updateBatchEdit: function(updatedType, updatedState, updatedField, shortNameInfo) {
    var immCurrentSelectionPath = _immAdminStore.getIn(workingCsSelectedNodeKeyPath);
    if (!_.isNull(immCurrentSelectionPath)) {
      // We want immTablePath to be a path to the tables var on the current
      // datasource. If a table is selected we only want the first 4 parts of
      // its path, if a datasource is selected we need to add 'tables'.
      var immTablePath = AdminStore.isDatasource(immCurrentSelectionPath) ? immCurrentSelectionPath.push('tables') : immCurrentSelectionPath.take(4);
      switch (updatedType) {
        case BatchEditConstants.BATCH_EDIT_SELECT_ALL_COLUMNS:
          _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
            // Only include the tables that are in our search results and are
            // included in the schema.
            mutAdminStore.getIn(immTablePath).filter(Util.isNodeInScope).forEach(function(immTable) {
              var immColumnsPath = immTablePath.push(immTable.get('shortName'), 'columns');
              // Only select the columns that are in our search results.
              immTable.get('columns').filter(function(immColumn) { return immColumn.get('inSearch'); }).forEach(function(immColumn, colShortName) {
                mutAdminStore.setIn(immColumnsPath.push(colShortName, 'batchEditCheckboxState'), updatedState);
              });
            });
          });
          break;
        case BatchEditConstants.BATCH_EDIT_SELECT_ALL_TABLES:
          _immAdminStore = _immAdminStore.setIn(immTablePath, _immAdminStore.getIn(immTablePath).map(function(immTable) {
            return immTable.set('batchEditCheckboxState', updatedState);
          }));
          break;
        case BatchEditConstants.BATCH_EDIT_SET_COLUMN_STATE:
          var immColumnsPath = immTablePath.push(shortNameInfo.tableShortName, 'columns', shortNameInfo.colShortName);
          _immAdminStore = _immAdminStore.setIn(immColumnsPath.push(updatedField), updatedState);
          break;
        case BatchEditConstants.BATCH_EDIT_SET_TABLE_STATE:
          _immAdminStore = _immAdminStore.setIn(immTablePath.push(shortNameInfo.tableShortName, updatedField), updatedState);
          // Lazy load table content data when it is expanded
          if (updatedField === 'batchEditExpanded') {
            var immNodeKeyPath = Imm.List(immTablePath).push(shortNameInfo.tableShortName);
            AdminStore.loadTableColumns(immNodeKeyPath);
          }
          break;
        case BatchEditConstants.BATCH_EDIT_MODE_TOGGLE:
          // If we're entering batch edit mode set the default for the batch
          // edit checkmarks on the table and columns for this datasource.
          _immAdminStore = _immAdminStore.set('batchEditEnabled', !_immAdminStore.get('batchEditEnabled'));
          if (_immAdminStore.get('batchEditEnabled')) {
            _immAdminStore = _immAdminStore.setIn(immTablePath, _immAdminStore.getIn(immTablePath)
              .map(function(immTable, tableShortName) {
                if (Util.isNodeInScope(immTable)) {
                  var immColumnPath = immTablePath.push(tableShortName, 'columns');
                  var immUpdatedTable = immTable.set('columns', _immAdminStore.getIn(immColumnPath)
                    .map(function(immColumn) {
                      // Only set the columns that are not-filtered to true.
                      return immColumn.set('batchEditCheckboxState', immColumn.get('inSearch'));
                    }));
                  return immUpdatedTable.merge({batchEditCheckboxState: immTable.get('inSearch')});
                } else {
                  return immTable;
                }}));
          }
          break;
      }
    }
  },

  updateGroup: function(groupId, group, callback) {
    var groupEntity = _.extend(group, {userEntityIds: []});
    var url = '/api/admin/groups/' + groupId;
    AppRequest({type: 'PUT', data: JSON.stringify(groupEntity), url: url}).then(
      function(data) {
        if (data.groupId) {  // Group id gets returned on success.
          AdminActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_THE_TEAM, StatusMessageTypeConstants.TOAST_SUCCESS);
          callback(true);
        } else {
          callback(false);
        }
      },
      function(jqXHR) {
        GA.sendAjaxException('PUT ' + url + ' failed.', jqXHR.status);
      }
    );
  },

  // Updates information on a single GPP chart. Acceptable fields and corresponding values are:
  //            'type' - 'Duration' or 'Numeric'
  //       'tablePath' - [<< datasource short name >>, 'tables', << table short name >>]
  //         'editing' - true or false; indicates if the chart's editing panel is open
  //  'mainColumnPath' - A column path
  //  'lowerBoundPath' - A column path
  //  'upperBoundPath' - A column path
  //
  // A column path is represented by [<< datasource short name >>, 'tables', << table short name >>, 'columns', << column short name >>].
  // The table path prefix (the first three elements of the path) for 'mainColumnPath', 'lowerBoundPath',
  // and 'upperBoundPath' should be equal to the value of 'tablePath'.
  updateGPPChart: function(index, field, value) {
    var immChartsPath = Imm.List(['workingGPP', 'charts']);
    var immChartPath = immChartsPath.push(index);

    if (field === 'editing') {
      var immChart = _immAdminStore.getIn(immChartPath);
      var immNumericChartDatePaths = _immAdminStore.getIn(['workingGPP', 'numericChartDatePaths']);
      // If we're done editing, make sure the chart is valid first.
      if (!value && !ComprehendSchemaUtil.isValidGPPChart(immChart, immNumericChartDatePaths)) {
        AdminStore.createStatusMessage('GPP chart ' + (index + 1) + ' is invalid. Please fix before continuing.', 'warning');
      } else {
        _immAdminStore = _immAdminStore.setIn(immChartPath.push('editing'), value);
      }
      return;
    }

    var currentType = _immAdminStore.getIn(immChartPath.push('type'));
    switch (currentType) {
      case 'Duration':
        AdminStore.updateGPPDurationChart(immChartPath, field, value);
        return;
      case 'Numeric':
        AdminStore.updateGPPNumericChart(immChartPath, field, value);
        return;
    }

    // The current type did not match 'Duration' or 'Numeric', so this is a relatively new chart.
    // We must be setting either 'type' or 'tablePath'.
    switch (field) {
      case 'type':
        var immCharts = _immAdminStore.getIn(immChartsPath);
        var immTablePath = _immAdminStore.getIn(immChartPath.push('tablePath'));
        if (value === 'Duration' && immTablePath && ComprehendSchemaUtil.durationGPPChartExists(immCharts, index, immTablePath)) {
          // If the type was set to 'Duration' and a table was already selected, make sure a duration chart doesn't exist for that table.
          var tableLongName = _immAdminStore.getIn(immTablePath.unshift('workingCs', 'datasources').push('longName'));
          AdminStore.createStatusMessage('A duration chart for "' + tableLongName + '" already exists.', 'warning');
          break;
        } else if (value === 'Numeric' && immTablePath) {
          // If the type was set to 'Numeric' and a table was already selected, increment the numeric chart count.
          AdminStore.incrementGPPNumericChartCount(ComprehendSchemaUtil.pathToTableString(immTablePath));
        }
        // Allow fall-through
      case 'tablePath':
        _immAdminStore = _immAdminStore.setIn(immChartPath.push(field), value);
    }
  },

  // Updates GPP demography information. Acceptable fields and corresponding values are:
  //  'tablePath' - [<< datasource short name >>, 'tables', << table short name >>]
  //   'namePath' - A column path
  //  'infoPaths' - A list of column paths
  //
  // A column path is represented by [<< datasource short name >>, 'tables', << table short name >>, 'columns', << column short name >>].
  // The table path prefix (the first three elements of the path) for 'namePath' and each of the 'infoPaths'
  // should be equal to the value of 'tablePath'.
  updateGPPDemography: function(field, value) {
    var immGPPDemographyPath = Imm.List(['workingGPP', 'demography']);
    switch (field) {
      case 'tablePath':
        if (!value.equals(_immAdminStore.getIn(immGPPDemographyPath.push('tablePath')))) {
          // If the table has changed, clear out the column selections.
          _immAdminStore = _immAdminStore.setIn(immGPPDemographyPath, Imm.Map({
            tablePath: value,
            namePath: null,
            infoPaths: Imm.List()
          }));
        }
        break;
      case 'namePath':
      case 'infoPaths':
        _immAdminStore = _immAdminStore.setIn(immGPPDemographyPath.push(field), value);
    }
  },

  updateGPPDurationChart: function(immChartPath, field, value) {
    var immChart = _immAdminStore.getIn(immChartPath);
    var immTablePath = immChart.get('tablePath');
    switch (field) {
      case 'type':
        if (value === 'Numeric') {
          _immAdminStore = _immAdminStore.updateIn(immChartPath, function(immChart) {
            return immChart.merge({
              type: 'Numeric',
              tablePath: null,
              mainColumnPath: null,
              lowerBoundPath: null,
              upperBoundPath: null
            });
          });
        }
        break;
      case 'tablePath':
        if (value.equals(immTablePath)) {
          break;
        }
        var immCharts = _immAdminStore.getIn(['workingGPP', 'charts']);
        var index = immChartPath.last();
        if (ComprehendSchemaUtil.durationGPPChartExists(immCharts, index, value)) {
          var tableLongName = _immAdminStore.getIn(value.unshift('workingCs', 'datasources').push('longName'));
          AdminStore.createStatusMessage('A duration chart for "' + tableLongName + '" already exists.', 'warning');
          break;
        }
        _immAdminStore = _immAdminStore.updateIn(immChartPath, function(immChart) {
          return immChart.merge({
            tablePath: value,
            mainColumnPath: null,
            lowerBoundPath: null,
            upperBoundPath: null
          });
        });
        break;
      case 'mainColumnPath':
      case 'lowerBoundPath':
      case 'upperBoundPath':
        _immAdminStore = _immAdminStore.setIn(immChartPath.push(field), value);
    }
  },

  updateGPPNumericChart: function(immChartPath, field, value) {
    var immChart = _immAdminStore.getIn(immChartPath);
    var immTablePath = immChart.get('tablePath');
    var tableString = immTablePath ? ComprehendSchemaUtil.pathToTableString(immTablePath) : null;
    var immMainColumnPath = immChart.get('mainColumnPath');
    switch (field) {
      case 'type':
        if (value === 'Duration') {
          if (!_.isNull(tableString)) {
            AdminStore.decrementGPPNumericChartCount(tableString);
          }
          _immAdminStore = _immAdminStore.updateIn(immChartPath, function(immChart) {
            return immChart.merge({
              type: 'Duration',
              tablePath: null,
              mainColumnPath: null,
              lowerBoundPath: null,
              upperBoundPath: null
            });
          });
        }
        break;
      case 'tablePath':
        if (value.equals(immTablePath)) {
          break;
        }
        if (!_.isNull(tableString)) {
          AdminStore.decrementGPPNumericChartCount(tableString);
        }
        AdminStore.incrementGPPNumericChartCount(ComprehendSchemaUtil.pathToTableString(value));
        _immAdminStore = _immAdminStore.updateIn(immChartPath, function(immChart) {
          return immChart.merge({
            tablePath: value,
            mainColumnPath: null,
            lowerBoundPath: null,
            upperBoundPath: null
          });
        });
        break;
      case 'mainColumnPath':
        if (value.equals(immMainColumnPath)) {
          break;
        }
        var immCharts = _immAdminStore.getIn(['workingGPP', 'charts']);
        var index = immChartPath.last();
        if (ComprehendSchemaUtil.numericGPPChartExists(immCharts, index, value)) {
          var columnLongName = _immAdminStore.getIn(value.unshift('workingCs', 'datasources').push('longName'));
          AdminStore.createStatusMessage('A numeric chart for "' + columnLongName + '" already exists.', 'warning');
        } else {
          _immAdminStore = _immAdminStore.setIn(immChartPath.push(field), value);
        }
        break;
      case 'lowerBoundPath':
      case 'upperBoundPath':
        // If one is set to null, set the other to null to maintain valid state.
        if (_.isNull(value)) {
          _immAdminStore = _immAdminStore.mergeIn(immChartPath, {
            lowerBoundPath: null,
            upperBoundPath: null
          });
        } else {
          _immAdminStore = _immAdminStore.setIn(immChartPath.push(field), value);
        }
    }
  },

  updateSchemaUsers: function(changeList) {
    _immAdminStore = _immAdminStore.set('schemaUsersChangeList', changeList);
  },

  updateSelectedNode: function(immNodeKeyPath) {
    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      var immSelectedNodeKeyPath = mutAdminStore.getIn(workingCsSelectedNodeKeyPath);
      // If we already have a selected node, unselect it.
      if (!_.isNull(immSelectedNodeKeyPath)) { mutAdminStore.setIn(immSelectedNodeKeyPath.push('selected'), false); }

      mutAdminStore.setIn(immNodeKeyPath.push('selected'), true);
      mutAdminStore.setIn(workingCsSelectedNodeKeyPath, immNodeKeyPath);

      // Update batch edit settings appropriately for the new selection.
      mutAdminStore.set('batchEditEnabled', false);
      if (AdminStore.isDatasource(immNodeKeyPath)) {
        var immTablesPath = immNodeKeyPath.push('tables');
        mutAdminStore.setIn(immTablesPath, mutAdminStore.getIn(immTablesPath).map(function(immTable) {
          return immTable.set('batchEditExpanded', false);
        }));
      } else {
        mutAdminStore.setIn(immNodeKeyPath.push('batchEditExpanded'), true);
      }
    });
  },

  updateSelectedTableRowCount: function() {
    var datasourceName = AdminStore.getCurrentDatasourceName();
    var tableName = AdminStore.getCurrentTableName();
    var dbConnectionName = _immAdminStore.getIn(['workingCs', 'dbConnectionName']);
    new Promise(function(resolve, reject) {
      AppRequest({
        type: 'GET',
        url: '/api/admin/comprehend-schema-table-total-rows/' + dbConnectionName + '/' + Util.pgEscapeDoubleQuote(datasourceName) + '/' + Util.pgEscapeDoubleQuote(tableName)
      }).then(
        function(data) {
          if (data && data.value !== null) {
            resolve(data);
          } else {
            reject({status: "Null value returned."});
          }
        },
        function(jqXHR) {
          reject(jqXHR.status);
        });
    }).then(
      function(data) {
        _immAdminStore = _immAdminStore.setIn(['tableRowCounts', datasourceName, tableName], data.value);
        AdminStore.emitChange();
      },
      function(jqXHR) {
        GA.sendAjaxException('Get Comprehend schema table total rows for customer ' + _immAdminStore.get('currentAccountId') + ' in AdminStore updateSelectedTableRowCount failed.', jqXHR.status);
        AdminStore.emitChange();
      });

    // Set a placeholder value so we don't keep sending requests.
    _immAdminStore = _immAdminStore.setIn(['tableRowCounts', datasourceName, tableName], '-');
  },

  // Handle updates to the tree view.
  updateTreeData: function(immNodePath, updatedField, updatedState) {
    var immNodeKeyPath = Imm.List(['workingCs', 'datasources', immNodePath.get(0)]);
    if (immNodePath.size > 1) { immNodeKeyPath = immNodeKeyPath.push('tables', immNodePath.get(1)); }
    switch (updatedField) {
      case 'checkboxState':
        if (!updatedState) {
          var doUncheck = function() {
            AdminStore.removeEdgesFromNode(immNodeKeyPath);
            AdminStore.fixUpCheckboxes(immNodeKeyPath, updatedState);
            AdminStore.closeModal();
            AdminStore.emitChange();
          };
          AdminStore.displayModal(ModalConstants.MODAL_UNCHECK_TABLE, {doUncheck: doUncheck});
        } else {
          AdminStore.fixUpCheckboxes(immNodeKeyPath, updatedState);
        }
        break;
      case 'expanded':
        _immAdminStore = _immAdminStore.setIn(immNodeKeyPath.push(updatedField), updatedState);
        break;
      case 'selected':
        AdminStore.updateSelectedNode(immNodeKeyPath);
        if (_immAdminStore.getIn(immNodeKeyPath.push('childrenName')) === 'columns') {
          AdminStore.loadTableColumns(immNodeKeyPath);
        }
        break;
    }
  },

  updateTvSearch: function(immNewTvSearchState, tvSearchText, keepSelection) {
    _immAdminStore = _immAdminStore.withMutations(function(mutAdminStore) {
      var filterChanged = immNewTvSearchState.get('isTvSearchByTable') !== _immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']);

      // Clear the current selection, if any.
      if (mutAdminStore.getIn(workingCsSelectedNodeKeyPath) && !keepSelection) {
        mutAdminStore.setIn(mutAdminStore.getIn(workingCsSelectedNodeKeyPath).push('selected'), false);
        mutAdminStore.mergeDeep({workingCs: {selectedNodeKeyPath: null}, batchEditEnabled: false});
      }

      // Reset our counts. These will be updated during the search.
      var tvResultCounts = [0, 0, 0];

      mutAdminStore.getIn(['workingCs', 'datasources']).forEach(function(immDs, dsShortName) {
        if (!immNewTvSearchState.get('tvExcludedDataSources').contains(dsShortName)) {
          // This datasource is included in the search, search it.
          AdminStore.filterTreeViewSearchResults(mutAdminStore,
                                                 tvSearchText,
                                                 Imm.List(['workingCs', 'datasources', dsShortName]),
                                                 immNewTvSearchState,
                                                 tvResultCounts,
                                                 filterChanged);
        } else {
          // Datasource is excluded from search, just mark it invisible.
          mutAdminStore.setIn(['workingCs', 'datasources', dsShortName, 'inSearch'], false);
        }
      });

      mutAdminStore.set('tvSearchState', immNewTvSearchState.merge({tvResultCounts: Imm.List(tvResultCounts), searchInProgress: false}));
    });
  },

  updateEditSchemaSearchInProgress: function(searchInProgress) {
    _immAdminStore = _immAdminStore.setIn(['tvSearchState', 'searchInProgress'], searchInProgress);
  },

  updateUserRole: function(userId, role, callback) {
    AppRequest({type: 'POST', data: role, url: '/api/admin/users/' + userId + '/update-role'}).then(
      function () {
        Util.getGuardedCallback(callback)();
        AdminActions.loadUser(userId);
      },
      function (jqXHR) {
        AdminActions.createStatusMessage(FrontendConstants.CHANGE_USER_ROLE_FAILED, StatusMessageTypeConstants.WARNING);
        GA.sendAjaxException('POST update-role ' + userId + ' failed.', jqXHR.status);
      });
  },

  updateUserDetails: function(userId, userDetails, callback) {
    AppRequest({type: 'POST', data: JSON.stringify(userDetails), url: `/api/admin/users/${userId}/update-details`}).then(
      () => {
        AdminActions.loadUser(userId, callback);
      },
      (jqXHR) => {
        AdminActions.createStatusMessage(FrontendConstants.CHANGE_USER_DETAILS_FAILED, StatusMessageTypeConstants.WARNING);
        GA.sendAjaxException(`POST update ${userId} failed`, jqXHR.status);
      }
    )
  },

  verifyTableUniquenessColumns: function(immNodeKeyPath, displayStatusMessage) {
    var immTable = _immAdminStore.getIn(immNodeKeyPath);
    var immUniqueColumns = immTable.get('columns').filter(function(immCol) {
      return immCol.get('isUnique');
    });
    if (immUniqueColumns.isEmpty()) {
      if (displayStatusMessage) {
        AdminStore.createStatusMessage('Please select uniqueness columns for this table.', 'warning');
      }
      _immAdminStore = _immAdminStore.setIn(immNodeKeyPath.push('uniquenessStatus'), 'Invalid');
      return;
    }

    var datasourceName = immNodeKeyPath.get(2);
    var tableName = immTable.get('shortName');
    var dbConnectionName = _immAdminStore.getIn(['workingCs', 'dbConnectionName']);
    var payload = JSON.stringify(immUniqueColumns.map(function(immColumn) {
      return immColumn.get('shortName');
    }).toList().toJS());
    AppRequest({
      type: 'POST',
      url: '/api/admin/verify-uniqueness/' + dbConnectionName + '/' + [Util.pgEscapeDoubleQuote(datasourceName), Util.pgEscapeDoubleQuote(tableName)].join('/'),
      data: payload
    }).then(
      function(data) {
        _immAdminStore = _immAdminStore.setIn(immNodeKeyPath.push('uniquenessStatus'), data.verified ? 'Verified' : 'Invalid');
        AdminStore.emitChange();
      },
      function(jqXHR) {
        GA.sendAjaxException('Verifying uniqueness for customer ' + _immAdminStore.get('currentAccountId') + ' in AdminStore verifyTableUniquenessColumns failed.', jqXHR.status);
        _immAdminStore = _immAdminStore.setIn(immNodeKeyPath.push('uniquenessStatus'), 'Invalid');
        AdminStore.emitChange();
      });

    _immAdminStore = _immAdminStore.setIn(immNodeKeyPath.push('uniquenessStatus'), 'being checked...');
  },

  usersViewResetCheckedUserWrappers: function() {
    _immAdminStore = _immAdminStore.setIn(['usersView', 'checkedUserWrappers'], Imm.Set());
  },

  // TODO: This should be checkedUserIds, and any code that needs to map to UserWrappers should use a map of userId -> UserWrapper
  // similar to what we have in ExposureStore. This is a hack to store the full UserWrapper, done at the tail end of delete-user id:7006.
  // This work to construct the map of userId -> UserWrapper was pushed off due to time constraints and pending refactors to Aperture.
  usersViewSetCheckedUserWrappers: function(rowIndex, checked) {
    var userId = _immAdminStore.getIn(['usersView', 'userIds']).get(rowIndex);
    var immUserWrapper = _immAdminStore.get('users').find(function(immUserWrapper) {
      return immUserWrapper.getIn(['user', 'id']) === userId;
    });
    var immNewCheckedUserWrappers;
    if (checked) {
      immNewCheckedUserWrappers = _immAdminStore.getIn(['usersView', 'checkedUserWrappers']).add(immUserWrapper);
    } else {
      immNewCheckedUserWrappers = _immAdminStore.getIn(['usersView', 'checkedUserWrappers']).delete(immUserWrapper);
    }
    _immAdminStore = _immAdminStore.setIn(['usersView', 'checkedUserWrappers'], immNewCheckedUserWrappers);
  },

  usersViewSetColumnOption: function(columnName, checked) {
    _immAdminStore = _immAdminStore.setIn(['usersView', 'displayedColumns', columnName], checked);
  },

  usersViewSetIsValid: function(isValid) {
    _immAdminStore = _immAdminStore.setIn(['usersView', 'isValid'], isValid);
  },

  loadGroup: function(groupId) {
    var url = '/api/admin/groups/' + groupId;
    AppRequest({type: 'GET', url: url}).then(
      function(group) {
        // TODO: We should really make sure we only have a single instance of a group
        // stored in the store. For example, the group store should probably be a map
        // instead of a list.
        _immAdminStore = _immAdminStore.setIn(['groups', groupId], Imm.fromJS(group));
        AdminStore.emitChange();
      },
      function(jqXHR) {
        // TODO: See comment in the success handler.
        _immAdminStore = _immAdminStore.setIn(['groups', groupId], Imm.fromJS({
          group: {
            id: groupId,
            invalid: true
          }
        }));
        AdminStore.emitChange();
        GA.sendAjaxException('GET ' + url + ' failed.', jqXHR.status);
      });
  },

  loadGroupsWithPageSettings: async function(pageSettings) {
    const params = Util.buildFixedDataTableParams(pageSettings);

    const oldRequest = _immAdminStore.getIn(['outstandingRequests', 'groupsRequest']);
    if (oldRequest) {
      await oldRequest.toJS().abort();
    }

    const url = `/api/admin/groups/paginated?${params}`;

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      function(data) {
        AdminStore.groupsViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        var immGroups = Imm.fromJS(data.groups);
        var immGroupIds = immGroups.map(function(immGroup) {
          return immGroup.get('id');
        });
        _immAdminStore = _immAdminStore.mergeDeep({
          groupsAreLoading: false,
          groupsView: {
            begin: data.begin,
            isEmpty: immGroupIds.isEmpty(),
            totalRows: data.totalGroups
          }
        });
        _immAdminStore = _immAdminStore.setIn(['groupsView', 'groupIds'], immGroupIds);
        immGroups.forEach(function(immGroup) {
          _immAdminStore = _immAdminStore.setIn(['groups', immGroup.get('id')], immGroup);
        });
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'groupsRequest']);
        AdminStore.emitChange();
      },
      function(jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            AdminStore.groupsViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            AdminStore.groupsViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        _immAdminStore = _immAdminStore.merge({groupsAreLoading: false});
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'groupsRequest']);
        AdminStore.emitChange();
      }
    );

    _immAdminStore = _immAdminStore.merge({groupsAreLoading: true, outstandingRequests: {groupsRequest: newRequest}});
    AdminStore.emitChange();
  },

  groupsViewResetCheckedGroups: function() {
    _immAdminStore = _immAdminStore.setIn(['groupsView', 'checkedGroups'], Imm.Set());
  },

  groupsViewSetCheckedGroups: function(rowIndex, checked) {
    var groupId = _immAdminStore.getIn(['groupsView', 'groupIds']).get(rowIndex);
    var immGroup = _immAdminStore.getIn(['groups', groupId]);
    var immNewCheckedGroups;
    if (checked) {
      immNewCheckedGroups = _immAdminStore.getIn(['groupsView', 'checkedGroups']).add(immGroup);
    } else {
      immNewCheckedGroups = _immAdminStore.getIn(['groupsView', 'checkedGroups']).delete(immGroup);
    }
    _immAdminStore = _immAdminStore.setIn(['groupsView', 'checkedGroups'], immNewCheckedGroups);
  },

  groupsViewSetColumnOption: function(columnName, checked) {
    _immAdminStore = _immAdminStore.setIn(['groupsView', 'displayedColumns', columnName], checked);
  },

  groupsViewSetIsValid: function(isValid) {
    _immAdminStore = _immAdminStore.setIn(['groupsView', 'isValid'], isValid);
  },

  loadDataAccessGroup: function(dataAccessGroupId) {
    const url = '/api/admin/data-access-groups/' + dataAccessGroupId;
    AppRequest({type: 'GET', url: url}).then(
      function(dataAccessGroup) {
        // TODO: We should really make sure we only have a single instance of a group
        // stored in the store. For example, the group store should probably be a map
        // instead of a list.
        _immAdminStore = _immAdminStore.setIn(['dataAccessGroups', dataAccessGroupId], Imm.fromJS(dataAccessGroup));
        AdminStore.emitChange();
      },
      function(jqXHR) {
        // TODO: See comment in the success handler.
        _immAdminStore = _immAdminStore.setIn(['dataAccessGroups', dataAccessGroupId], Imm.fromJS({
          dataAccessGroup: {
            id: dataAccessGroupId,
            invalid: true
          }
        }));
        AdminStore.emitChange();
        GA.sendAjaxException('GET ' + url + ' failed.', jqXHR.status);
      });
  },

  loadDataAccessGroupsWithPageSettings: async function(pageSettings) {
    const params = Util.buildFixedDataTableParams(pageSettings);

    const oldRequest = _immAdminStore.getIn(['outstandingRequests', 'dataAccessGroupsRequest']);
    if (oldRequest) {
      await oldRequest.abort();
    }

    const url = `/api/admin/data-access-groups/paginated?${params}`;

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      function(data) {
        AdminStore.dataAccessGroupsViewSetIsValid(ListViewConstants.LIST_VIEW_VALID);
        const immDataAccessGroups = Imm.fromJS(data.dataAccessGroups);
        const immDataAccessGroupIds = immDataAccessGroups.map((immDataAccessGroup) => {
          return immDataAccessGroup.get('id');
        });

        _immAdminStore = _immAdminStore.mergeDeep({
          dataAccessGroupsAreLoading: false,
          dataAccessGroupsView: {
            begin: data.begin,
            isEmpty: immDataAccessGroupIds.isEmpty(),
            totalRows: data.totalDataAccessGroups
          }
        });
        _immAdminStore = _immAdminStore.setIn(['dataAccessGroupsView', 'dataAccessGroupIds'], immDataAccessGroupIds);
        _immAdminStore = _immAdminStore.delete('dataAccessGroups');
        immDataAccessGroups.forEach(function(immDataAccessGroup) {
          const dataAccessGroupId = immDataAccessGroup.get('id');
          _immAdminStore = _immAdminStore.setIn(['dataAccessGroups', dataAccessGroupId], immDataAccessGroup);
        });
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'dataAccessGroupsRequest']);
        AdminStore.emitChange();
      },
      function(jqXHR) {
        switch (jqXHR.status) {
          case HttpStatus.NOT_FOUND:
            AdminStore.dataAccessGroupsViewSetIsValid(ListViewConstants.LIST_VIEW_NOT_FOUND);
            break;
          case HttpStatus.BAD_REQUEST:
            AdminStore.dataAccessGroupsViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
            break;
        }
        _immAdminStore = _immAdminStore.merge({dataAccessGroupsAreLoading: false});
        _immAdminStore = _immAdminStore.deleteIn(['outstandingRequests', 'dataAccessGroupsRequest']);
        AdminStore.emitChange();
      }
    );

    _immAdminStore = _immAdminStore.merge({
      dataAccessGroupsAreLoading: true,
      outstandingRequests: {dataAccessGroupsRequest: newRequest}
    });
    AdminStore.emitChange();
  },

  dataAccessGroupsViewResetCheckedGroups: function() {
    _immAdminStore = _immAdminStore.setIn(['dataAccessGroupsView', 'checkedDataAccessGroups'], Imm.Set());
  },

  dataAccessGroupsViewSetCheckedGroups: function(rowIndex, checked) {
    const dataAccessGroupId = _immAdminStore.getIn(['dataAccessGroupsView', 'dataAccessGroupIds']).get(rowIndex);
    const immDataAccessGroup = _immAdminStore.getIn(['dataAccessGroups', dataAccessGroupId]);
    let immNewCheckedDataAccessGroups;
    if (checked) {
      immNewCheckedDataAccessGroups = _immAdminStore.getIn(['dataAccessGroupsView', 'checkedDataAccessGroups']).add(immDataAccessGroup);
    } else {
      immNewCheckedDataAccessGroups = _immAdminStore.getIn(['dataAccessGroupsView', 'checkedDataAccessGroups']).delete(immDataAccessGroup);
    }
    _immAdminStore = _immAdminStore.setIn(['dataAccessGroupsView', 'checkedDataAccessGroups'], immNewCheckedDataAccessGroups);
  },

  dataAccessGroupsViewSetColumnOption: function(columnName, checked) {
    _immAdminStore = _immAdminStore.setIn(['dataAccessGroupsView', 'displayedColumns', columnName], checked);
  },

  dataAccessGroupsViewSetIsValid: function(isValid) {
    _immAdminStore = _immAdminStore.setIn(['dataAccessGroupsView', 'isValid'], isValid);
  },

  addDataAccessGroup: function(dataAccessGroup, callback) {
    const url = '/api/admin/data-access-groups';

    AppRequest({type: 'POST', data: JSON.stringify(dataAccessGroup), url: url}).then(
      (data) => {
        if (data.id) {
          AdminActions.createStatusMessage(FrontendConstants.SUCCESS_A_NEW_DATA_ACCESS_GROUP_HAS_BEEN_ADDED,
            StatusMessageTypeConstants.TOAST_SUCCESS);
          callback(true);
        }
        else {
          callback(false);
        }
      },
      (jqXHR) => {
        GA.sendAjaxException(`POST ${url} failed.`, jqXHR.status);
      }
    )
  },

  loadDataAccessGroups: function() {
    const requestName = AdminRequestConstants.LOAD_DATA_ACCESS_GROUPS;
    AdminStore.initializeRequest(requestName);

    const url = '/api/admin/data-access-groups';

    const newRequest = AppRequest({type: 'GET', url: url});

    newRequest.then(
      (data) => {
        const dataAccessGroups = data && Imm.fromJS(data.dataAccessGroups).sortBy((group) => group.get('dataAccessProfileName').toUpperCase());
        const idMap = dataAccessGroups && dataAccessGroups.groupBy((dap) => dap.get('id'));
        _immAdminStore = _immAdminStore.delete('dataAccessGroups');
        _immAdminStore = _immAdminStore.set('dataAccessGroups', idMap);
        _immAdminStore = _immAdminStore.delete('dataAccessGroupsList');
        _immAdminStore = _immAdminStore.set('dataAccessGroupsList', Imm.fromJS(dataAccessGroups));

        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      },
      (jqXHR) => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      }
    );

    AdminStore.startOutstandingRequest(requestName, newRequest);
    AdminStore.emitChange();
  },

  updateDataAccessGroup: function(dataAccessGroupId, dataAccessGroup, callback) {
    const url = `/api/admin/data-access-groups/${dataAccessGroupId}`;
    AppRequest({type: 'PUT', data: JSON.stringify(dataAccessGroup), url: url}).then(
      (data) => {
        if (data.id) {
          AdminActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_THE_DATA_ACCESS_GROUP, StatusMessageTypeConstants.TOAST_SUCCESS);
          callback(true);
        } else {
          callback(false);
        }
      },
      function(jqXHR) {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
      }
    );
  },

  updateUserDataAccessGroup: function(userId, userEntity, callback) {
    const url = `/api/admin/users/${userId}/update-data-access-group`;
    AppRequest({type: 'POST', data: JSON.stringify(userEntity), url: url}).then(
      (data) => {
        Util.getGuardedCallback(callback)();
        AdminActions.loadUser(userId);
      },
      (jqXHR) => {
        AdminActions.createStatusMessage(FrontendConstants.CHANGE_USER_DATA_ACCESS_GROUP_FAILED, StatusMessageTypeConstants.WARNING);
        GA.sendAjaxException(`POST update-data-access-group ${userId} failed.`, jqXHR.status);
      }
    )
  },

  updateDataAccessGroupsForUserEntities(immUpdatedUserEntitiesMap, callback) {
    const requestName = AdminRequestConstants.UPDATE_DATA_ACCESS_GROUPS_FOR_USER_ENTITIES;
    AdminStore.initializeRequest(requestName);

    const url = `/api/admin/data-access-groups/batch-update`;
    const updateMap = immUpdatedUserEntitiesMap.map((dataAccessProfileId, userEntityId) => {
      return {userEntityId, dataAccessProfileId};
    }).toList().toJS();

    const updateJson = JSON.stringify({ updateMap });
    const newRequest = AppRequest({type: 'PUT', data: updateJson, url: url});
    newRequest.then(
      (data) => {
        AdminActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_DATA_ACCESS_GROUP_ASSIGNMENTS, StatusMessageTypeConstants.TOAST_SUCCESS);
        Util.getGuardedCallback(callback)();
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      },
      (jqXHR) => {
        AdminActions.createStatusMessage(FrontendConstants.UPDATE_DATA_ACCESS_GROUPS_FOR_USERS_FAILED,
          StatusMessageTypeConstants.WARNING);
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      }
    );

    AdminStore.startOutstandingRequest(requestName, newRequest);
  },

  updateUserPermissions(userId, userPermissions, callback) {
    const requestName = AdminRequestConstants.UPDATE_USER_ENTITY_PERMISSIONS;
    AdminStore.initializeRequest(requestName);

    const url = `/api/admin/permissions/user/${userId}`;
    const data = JSON.stringify(userPermissions);

    const newRequest = AppRequest({type: 'PUT', data: data, url: url});
    newRequest.then(
      data => {
        callback();
        const userIndex = _immAdminStore.get('users').findIndex((immUserWrapper) => {
          return immUserWrapper.getIn(['user', 'id']) === userId;
        });
        const immUserWrapper = _immAdminStore.getIn(['users', userIndex], Imm.Map());
        const immUserEntity = immUserWrapper.get('userEntity', Imm.Map());
        const immFeaturePermissions = immUserEntity.get('featurePermissions', Imm.List());
        const featureIndex = immFeaturePermissions.findIndex((immFeature) => {
          return immFeature.get('feature', '') === data.feature;
        });
        _immAdminStore = _immAdminStore.setIn(
          ['users', userIndex, 'userEntity', 'featurePermissions', featureIndex],
          Imm.fromJS(data)
        );

        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      },
      jqXHR => {
        AdminActions.createStatusMessage(
          FrontendConstants.UPDATE_USER_PERMISSIONS_FAILED,
          StatusMessageTypeConstants.WARNING
        );
        AdminStore.deleteOutstandingRequest(requestName);
        AdminStore.onAjaxCompletion();
      }
    );

    AdminStore.startOutstandingRequest(requestName, newRequest);
  },

  loadAllStudies: function() {
    const url = `/api/studies`;
    AppRequest({type: 'GET', url: url}).then(
      (data) => {
        _immAdminStore = _immAdminStore.set('studies', Imm.fromJS(data));
        AdminStore.emitChange();
      },
      (jqXHR) => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
      }
    )
  },

  verifySelectedTableUniquenessColumns: function() {
    var immSelectedNodeKeyPath = _immAdminStore.getIn(workingCsSelectedNodeKeyPath);
    AdminStore.verifyTableUniquenessColumns(immSelectedNodeKeyPath, true);
  },

  setTopNavRenderHook(renderHook) {
    _immAdminStore = _immAdminStore.set('topNavRenderHook', renderHook);
  },

  //Fetch query list with datasources
  fetchComprehendSchemas:  function(){
    var url = '/api/comprehend-schemas';
    AppRequest({ type: 'GET', url: url }).then(
      function (data) {
        var csList = Imm.fromJS(data);
        var csMap = Imm.OrderedMap(csList.map(function (cs) { return [cs.get('id'), cs]; }));
        _immAdminStore = _immAdminStore.set('comprehendSchemas', csMap);
        AdminStore.onAjaxCompletion();
      },
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
        AdminStore.onAjaxCompletion();
      }
    );
  },

  //Fetch reports and dashboard list account wise
  fetchFileConfigs:  function(loadEntitySummary){
    var url = '/api/files-for-account';
    AppRequestByFetch({ type: 'GET', url: url }).then(
      async function (data) {
        const fileConfigsMapObject = ReportUtil.createFileConfigMapObject(data);
        let immFilesMap = Imm.fromJS(fileConfigsMapObject);
        immFilesMap = EntitySearchUtil.transformExposureFiles(immFilesMap);
        _immAdminStore = _immAdminStore.set('dashboardsAndReports', immFilesMap);
        
        if (AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig) && loadEntitySummary) {
          AdminStore.fetchEmbeddedEntitiesSummary();
        }else{
          _immAdminStore = _immAdminStore.set('kpiReportList', []);
          await AdminStore.combineAssociateAnalyticsAndKPIReportsList();
          AdminStore.setIsKPIReportLoadDone(true);
        }
        AdminStore.onAjaxCompletion();
      },
      function () {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
        AdminActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        AdminStore.onAjaxCompletion();
      }
    );
  },

  fetchEmbeddedEntitiesSummary : function() {
    const url = '/api/embedded/entities-summary';
    AppRequestByFetch({ type: 'GET', url: url }).then(
      async data => {
        let entityMap = data.entityMap ? data.entityMap.filter(entity => entity.entityType == 'REPORT') : [];
        _immAdminStore = _immAdminStore.set('kpiReportList', entityMap);
        await AdminStore.combineAssociateAnalyticsAndKPIReportsList();
        _immAdminStore = _immAdminStore.set('isKPIReportLoadDone', true);
        AdminStore.onAjaxCompletion();
      },
      async jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
        await AdminStore.combineAssociateAnalyticsAndKPIReportsList();
        _immAdminStore = _immAdminStore.set('isKPIReportLoadDone', true);
        AdminStore.onAjaxCompletion();
      }
    );
  },

  //combine associated dashboards, reports and KPI reports
  combineAssociateAnalyticsAndKPIReportsList: function () {
    let dashboardsAndReports = _immAdminStore.get('dashboardsAndReports');
    let kpiReportList = _immAdminStore.get('kpiReportList');

    //Modify dashboard and reports array with required attributes 
    dashboardsAndReports = dashboardsAndReports.toJS().map(report => {
      let newReportObj = {
        id: report.id,
        name: report.title,
        fileType: report.fileType
      }
      return newReportObj;
    })

    //divide list by file type
    let dashboards = dashboardsAndReports.filter(entity => entity.fileType === fileTypeConstants.FILE_TYPE_DASHBOARD).sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let reports = dashboardsAndReports.filter(entity => entity.fileType === fileTypeConstants.FILE_TYPE_REPORT).sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });
    let dataReviewSets = dashboardsAndReports.filter(entity => entity.fileType === fileTypeConstants.FILE_TYPE_DATA_REVIEW).sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });

    //Modify KPI reports array with required attributes
    kpiReportList = kpiReportList.map(entity => {
      let newReportObj = {
        id: entity.entityUuid,
        name: entity.entityName
      }
      return newReportObj;
    })

    //sort KPI reports with name
    kpiReportList = kpiReportList.sort(function (a, b) {
      return a.name.localeCompare(b.name)
    });

    // group dashboards and KPI studio reports
    let combineDashboardReportList = [
      {
        name: 'Dashboards',
        items: dashboards
      },
      {
        name: 'Reports',
        items: reports
      },
      {
        name: 'Data Review Sets',
        items: dataReviewSets
      },
      {
        name: 'KPI Studio Reports',
        items: kpiReportList
      }
    ];
    _immAdminStore = _immAdminStore.set('combineDashboardReportList', combineDashboardReportList);
  },

  setIsKPIReportLoadDone: function(value){
    _immAdminStore = _immAdminStore.set('isKPIReportLoadDone', value);
    AdminStore.onAjaxCompletion();
  }
}, Store);

var _actions = {
  [AdminConstants.ADMIN_ADD_ACCOUNT_ADMIN]: action => AdminStore.addAccountAdmin(action.accountName, action.accountAdminEmail),
  [AdminConstants.ADMIN_ADD_GPP_CHART]: action => AdminStore.addGPPChart(),
  [AdminConstants.ADMIN_ADD_GROUP]: action => AdminStore.addGroup(action.group, action.callback),
  [AdminConstants.ADMIN_BATCH_EDIT]: action => AdminStore.batchEdit(action.batchEditType, action.value, action.statusMessage),
  [AdminConstants.ADMIN_CLEAR_COMPREHEND_SCHEMA_ERROR]: action => AdminStore.clearComprehendSchemaJsonError(),
  [AdminConstants.ADMIN_CLOSE_COMPREHEND_SCHEMA_EDITOR]: action => AdminStore.closeComprehendSchemaEditor(),
  [AdminConstants.ADMIN_CLOSE_MODAL]: action => AdminStore.closeModal(action.callback),
  [AdminConstants.ADMIN_CLOSE_STATUS_MESSAGE]: action => AdminStore.closeStatusMessage(action.id),
  [AdminConstants.ADMIN_CREATE_ACCOUNT_WITH_ADMIN]: action => AdminStore.createAccountWithAdmin(action.accountName, action.accountDisplayName, action.isLegacyAccount, action.accountAdminEmail),
  [AdminConstants.ADMIN_CREATE_USER_BY_EMAIL]: action => AdminStore.createUserByEmail(action.email, action.useSSO, action.dataAccessGroupId, action.callback),
  [AdminConstants.ADMIN_CREATE_STATUS_MESSAGE]: action => AdminStore.createStatusMessage(action.text, action.type),
  [AdminConstants.ADMIN_DELETE_DATA_ACCESS_GROUPS]: action => AdminStore.deleteDataAccessGroups(action.immDataAccessGroups, action.hasConfirmed, action.callback),
  [AdminConstants.ADMIN_DELETE_USER_MANAGEMENT_FIELD]: action => AdminStore.deleteUserManagementField(action.key),
  [AdminConstants.ADMIN_DISPLAY_UNSAVED_WORK_MODAL]: action => AdminStore.displayUnsavedWorkModal(action.callback, action.messageHeader, action.messageContent),
  [AdminConstants.ADMIN_DISPLAY_DELETE_WARNING_MODAL]: action => AdminStore.displayDeleteWarningModal(action.callback, action.messageHeader, action.messageContent),
  [AdminConstants.ADMIN_DISCARD_CHANGES]: action => AdminStore.discardChanges(),
  [AdminConstants.ADMIN_DISCARD_SCHEMA_CHANGES]: action => AdminStore.discardSchemaChanges(),
  [AdminConstants.ADMIN_DISCARD_USERS_CHANGES]: action => AdminStore.discardUsersChanges(),
  [AdminConstants.ADMIN_DISPLAY_ACTION_COULD_NOT_BE_COMPLETED_MODAL]: action => AdminStore.displayActionCouldNotBeCompletedModal(action.content),
  [AdminConstants.TASK_MANAGEMENT_SAVE_CONFIRMATION]: action => AdminStore.displayTaskManagementSaveConfirmationModal(action.callback, action.message),
  [AdminConstants.TASK_MANAGEMENT_RESET_DEPENDENCY_CONFIRMATION]: action => AdminStore.displayDependancyResetModal(action.callback),
  [AdminConstants.TASK_MANAGEMENT_DELETE_ATTRIBUTE_CONFIRMATION]: action => AdminStore.deleteExtendedAttributeConfirmation(action.callback),
  [AdminConstants.ADMIN_DISPLAY_MODAL]: action => AdminStore.displayModal(action.modalType, action.modalProps),
  [AdminConstants.ADMIN_EXTEND_SESSION]: action => AdminStore.extendSession(),
  [AdminConstants.ADMIN_GET_ACCOUNTS]: action => AdminStore.getAccounts(),
  [AdminConstants.ADMIN_GET_COMPREHEND_SCHEMA_JSON]: action => AdminStore.getComprehendSchemaJson(action.schemaName, action.schemaId),
  [AdminConstants.ADMIN_GET_COMPREHEND_SCHEMA_LIST]: action => AdminStore.getComprehendSchemaList(action.callback),
  [AdminConstants.ADMIN_GET_LEGACY_USERS]: action => AdminStore.getLegacyUsers(),
  [AdminConstants.ADMIN_INACTIVITY_LOGOUT_WARNING]: action => AdminStore.inactivityLogoutWarningModal(),
  [AdminConstants.ADMIN_LOAD_ALL_USERS]: action => AdminStore.loadAllUsers(),
  [AdminConstants.ADMIN_LOAD_ALL_USERS_FOR_WORKFLOW]: action => AdminStore.loadAllUsersForWorkflow(),
  [AdminConstants.ADMIN_CLEAR_USERS_FOR_WORKFLOW]: action => AdminStore.clearUsersForWorkflow(),
  [AdminConstants.ADMIN_LOAD_DATASOURCES]: action => AdminStore.loadDatasources(action.schemaId, action.loadGPP),
  [AdminConstants.ADMIN_LOAD_GPP]: action => AdminStore.loadGPP(action.schemaId),
  [AdminConstants.ADMIN_LOAD_USER]: action => AdminStore.loadUser(action.userId, action.callback),
  [AdminConstants.ADMIN_LOAD_USERS_WITH_PAGE_SETTINGS]: action => AdminStore.loadUsersWithPageSettings(action.pageSettings),
  [AdminConstants.ADMIN_REMOVE_GPP_CHART]: action => AdminStore.removeGPPChart(action.index),
  [AdminConstants.ADMIN_REMOVE_GPP_DEMOGRAPHY_INFO_ITEM]: action => AdminStore.removeGPPDemographyInfoItem(action.immColumnPath),
  [AdminConstants.ADMIN_RENAME_COLUMN_LONG_NAME]: action => AdminStore.renameColumnLongName(action.shortName, action.oldLongName, action.newLongName, action.tableShortName),
  [AdminConstants.ADMIN_RENAME_SCHEMA]: action => AdminStore.renameSchema(action.newSchemaName),
  [AdminConstants.ADMIN_RENAME_SCHEMA_TABLE_LONG_NAME]: action => AdminStore.renameSchemaTableLongName(action.newName, action.tableShortName),
  [AdminConstants.ADMIN_RESEND_INVITATION_LINK]: action => AdminStore.resendInvitationLink(action.userId, action.callback),
  [AdminConstants.ADMIN_RESET_USER_PASSWORD]: action => AdminStore.resetUserPassword(action.userId, action.callback),
  [AdminConstants.ADMIN_SAVE_AND_DEPLOY_COMPREHEND_SCHEMA]: action => AdminStore.saveAndDeployComprehendSchema(action.mode, action.callback),
  [AdminConstants.ADMIN_SAVE_AND_DEPLOY_GPP_CONFIG]: action => AdminStore.saveAndDeployGPPConfig(),
  [AdminConstants.ADMIN_SAVE_COMPREHEND_SCHEMA]: action => AdminStore.saveComprehendSchema(),
  [AdminConstants.ADMIN_SAVE_COMPREHEND_SCHEMA_JSON]: action => AdminStore.saveComprehendSchemaJson(action.json),
  [AdminConstants.ADMIN_SAVE_SCHEMA_USERS]: action => AdminStore.saveSchemaUsers(action.changeList),
  [AdminConstants.ADMIN_SET_COLUMN_EDGES]: action => AdminStore.setColumnEdges(action.tableShortName, action.columnShortName, action.endpointType, action.immDatasources),
  [AdminConstants.ADMIN_SET_COLUMN_INVISIBILITY]: action => AdminStore.setColumnInvisibility(action.tableShortName, action.columnShortName, action.isInvisible),
  [AdminConstants.ADMIN_SET_COLUMN_TYPE]: action => AdminStore.setColumnType(action.columnShortName, action.type, action.tableShortName),
  [AdminConstants.ADMIN_SET_COLUMN_UNIQUENESS]: action => AdminStore.setColumnUniqueness(action.columnShortName, action.isUnique, action.tableShortName),
  [AdminConstants.ADMIN_SET_CURRENT_SCHEMA]: action => AdminStore.setCurrentSchema(action.id, action.selected),
  [AdminConstants.ADMIN_SET_CURRENT_TAB]: action => AdminStore.setCurrentTab(action.tabName),
  [AdminConstants.ADMIN_SET_CURRENT_TABLE_INVISIBILITY]: action => AdminStore.setTableInvisibility(action.isInvisible, action.tableShortName),
  [AdminConstants.ADMIN_SET_DB_CONNECTION_NAME]: action => AdminStore.setDbConnectionName(action.dbConnectionName),
  [AdminConstants.ADMIN_SET_GPP_NUMERIC_CHART_DATE]: action => AdminStore.setGPPNumericChartDate(action.immColumnPath),
  [AdminConstants.ADMIN_SET_IS_CDM]: action => AdminStore.setIsCDM(action.isCDM),
  [AdminConstants.ADMIN_TOGGLE_DRT]: action => AdminStore.toggleDRT(action.tableShortName),
  [AdminConstants.ADMIN_TOGGLE_SCHEMA_OPEN_STATE]: action => AdminStore.toggleSchemaOpenState(action.schemaIndex, action.openState),
  [AdminConstants.ADMIN_UPDATE_BATCH_EDIT]: action => AdminStore.updateBatchEdit(action.updatedType, action.updatedState, action.updatedField, action.shortNameInfo),
  [AdminConstants.ADMIN_UPDATE_EDIT_SCHEMA_SEARCH_IN_PROGRESS]: action => AdminStore.updateEditSchemaSearchInProgress(action.searchInProgress),
  [AdminConstants.ADMIN_UPDATE_GROUP]: action => AdminStore.updateGroup(action.groupId, action.group, action.callback),
  [AdminConstants.ADMIN_UPDATE_GPP_CHART]: action => AdminStore.updateGPPChart(action.index, action.field, action.value),
  [AdminConstants.ADMIN_UPDATE_GPP_DEMOGRAPHY]: action => AdminStore.updateGPPDemography(action.field, action.value),
  [AdminConstants.ADMIN_UPDATE_SCHEMA_USERS]: action => AdminStore.updateSchemaUsers(action.changeList),
  [AdminConstants.ADMIN_UPDATE_SELECTED_TABLE_ROW_COUNT]: action => AdminStore.updateSelectedTableRowCount(),
  [AdminConstants.ADMIN_UPDATE_TREE_DATA]: action => AdminStore.updateTreeData(action.node, action.updatedField, action.updatedState),
  [AdminConstants.ADMIN_UPDATE_TV_SEARCH]: action => AdminStore.updateTvSearch(action.immTvSearchState, action.tvSearchText, action.keepSelection),
  [AdminConstants.ADMIN_UPDATE_USER_ROLE]: action => AdminStore.updateUserRole(action.userId, action.role, action.callback),
  [AdminConstants.ADMIN_UPDATE_USER_DETAILS]: action => AdminStore.updateUserDetails(action.userId, action.userDetails, action.callback),
  [AdminConstants.ADMIN_USERS_VIEW_RESET_CHECKED_USER_WRAPPERS]: action => AdminStore.usersViewResetCheckedUserWrappers(),
  [AdminConstants.ADMIN_USERS_VIEW_SET_CHECKED_USER_WRAPPERS]: action => AdminStore.usersViewSetCheckedUserWrappers(action.rowIndex, action.value),
  [AdminConstants.ADMIN_USERS_VIEW_SET_COLUMN_OPTION]: action => AdminStore.usersViewSetColumnOption(action.colName, action.value),
  [AdminConstants.ADMIN_USERS_VIEW_SET_IS_VALID]: action => AdminStore.usersViewSetIsValid(action.isValid),
  [AdminConstants.ADMIN_LOAD_GROUP]: action => AdminStore.loadGroup(action.groupId),
  [AdminConstants.ADMIN_LOAD_GROUPS_WITH_PAGE_SETTINGS]: action => AdminStore.loadGroupsWithPageSettings(action.pageSettings),
  [AdminConstants.ADMIN_GROUPS_VIEW_RESET_CHECKED_GROUPS]: action => AdminStore.groupsViewResetCheckedGroups(),
  [AdminConstants.ADMIN_GROUPS_VIEW_SET_CHECKED_GROUPS]: action => AdminStore.groupsViewSetCheckedGroups(action.rowIndex, action.value),
  [AdminConstants.ADMIN_GROUPS_VIEW_SET_COLUMN_OPTION]: action => AdminStore.groupsViewSetColumnOption(action.colName, action.value),
  [AdminConstants.ADMIN_GROUPS_VIEW_SET_IS_VALID]: action => AdminStore.groupsViewSetIsValid(action.isValid),
  [AdminConstants.ADMIN_VERIFY_SELECTED_TABLE_UNIQUENESS_COLUMNS]: action => AdminStore.verifySelectedTableUniquenessColumns(),
  [AdminConstants.ADMIN_VERIFY_TABLE_UNIQUENESS_COLUMNS]: action => AdminStore.verifyTableUniquenessColumns(action.immNodeKeyPath, action.displayStatusMessage),
  [AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUP]: action => AdminStore.loadDataAccessGroup(action.dataAccessGroupId),
  [AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUPS_WITH_PAGE_SETTINGS]: action => AdminStore.loadDataAccessGroupsWithPageSettings(action.pageSettings),
  [AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_RESET_CHECKED_GROUPS]: action => AdminStore.dataAccessGroupsViewResetCheckedGroups(),
  [AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_SET_CHECKED_GROUPS]: action => AdminStore.dataAccessGroupsViewSetCheckedGroups(action.rowIndex, action.value),
  [AdminConstants.ADMIN_DATA_ACCESS_GROUPS_GROUPS_VIEW_SET_COLUMN_OPTION]: action => AdminStore.dataAccessGroupsViewSetColumnOption(action.colName, action.value),
  [AdminConstants.ADMIN_DATA_ACCESS_GROUPS_VIEW_SET_IS_VALID]: action => AdminStore.dataAccessGroupsViewSetIsValid(action.isValid),
  [AdminConstants.ADMIN_ADD_DATA_ACCESS_GROUP]: action => AdminStore.addDataAccessGroup(action.dataAccessGroup, action.callback),
  [AdminConstants.ADMIN_LOAD_DATA_ACCESS_GROUPS]: action => AdminStore.loadDataAccessGroups(),
  [AdminConstants.ADMIN_UPDATE_DATA_ACCESS_GROUP]: action => AdminStore.updateDataAccessGroup(action.dataAccessGroupId, action.dataAccessGroup, action.callback),
  [AdminConstants.ADMIN_UPDATE_USER_DATA_ACCESS_GROUP]: action => AdminStore.updateUserDataAccessGroup(action.userId, action.userEntity, action.callback),
  [AdminConstants.ADMIN_LOAD_ALL_STUDIES]: action => AdminStore.loadAllStudies(),
  [AdminConstants.ADMIN_UPDATE_DATA_ACCESS_GROUPS_FOR_USER_ENTITIES]: action => AdminStore.updateDataAccessGroupsForUserEntities(action.immUpdatedUserEntitiesMap, action.callback),
  [AdminConstants.ADMIN_UPDATE_USER_PERMISSIONS]: action => AdminStore.updateUserPermissions(action.userId, action.userPermissions, action.callback),
  [AdminConstants.ADMIN_FETCH_COMPREHEND_SCHEMAS]: AdminStore.fetchComprehendSchemas,
  [AdminConstants.ADMIN_FETCH_FILES]: action=> AdminStore.fetchFileConfigs(action.loadEntitySummary),
  [AdminConstants.ADMIN_FETCH_ENTITY_SUMMARY]: AdminStore.fetchEmbeddedEntitiesSummary,
  /**
   * Begin Yellowfin admin actions
   */
  [AdminConstants.ADMIN_GET_YELLOWFIN_USER_GROUPS]: action => AdminStore.getYellowfinUserGroups(),
  [AdminConstants.ADMIN_GET_YELLOWFIN_REPORTS_FOR_GROUP]: action => AdminStore.getYellowfinReportsForGroup(action.groupID),
  [AdminConstants.ADMIN_SAVE_YELLOWFIN_REPORT_SHARING_FOR_GROUP]: action => AdminStore.saveYellowfinReportSharingForGroup(action.groupID, action.reportShareData, action.callback),
  [AdminConstants.SET_TOP_NAV_RENDER_HOOK]: action => AdminStore.setTopNavRenderHook(action.renderHook),
};

AdminStore.dispatcherIndex = AppDispatcher.register(function(payload) {
  var action = payload.action;
  var immAdminStore = _immAdminStore;
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  // Note: Imm.is is extremely performant. A typical comparison takes about 200 nanoseconds.
  if (!Imm.is(_immAdminStore, immAdminStore)) {
    AdminStore.emitChange();
  }
  return true;
});

module.exports = AdminStore;
module.exports.GetOutstandingRequest = AdminStore.getOutstandingRequest;
