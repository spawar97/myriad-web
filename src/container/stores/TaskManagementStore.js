import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';

import Store from './Store';
import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/TaskManagementConstants';
import AppRequest from '../http/AppRequest';
import { AppRequestByFetch } from '../http/AppRequest';
import AdminActions from '../actions/AdminActions';
import FrontendConstants from "../constants/FrontendConstants";
import StatusMessageTypeConstants from "../constants/StatusMessageTypeConstants";
import Util from '../util/util';
var AccountUtil = require('../util/AccountUtil');

const defaultStore = Imm.fromJS({
  taskMetadata: [],
  originalTaskMetadata: [],
  focusLatestExtendedRow: false,
  isEnabledSaveButton: false,
  fieldTypeArr: [
    {"id": 1, "fieldType": "Textbox", "field_type_value": "textbox"},
    {"id": 2, "fieldType": "Single Select Dropdown", "field_type_value": "singleSelectDropdown"},
    {"id": 3, "fieldType": "Multi Select Dropdown", "field_type_value": "multiSelectDropdown"},
    {"id": 4, "fieldType": "Date", "field_type_value": "date"},
    {"id": 5, "fieldType": "Textarea", "field_type_value": "textarea"},
    {"id": 6, "fieldType": "Toggle", "field_type_value": "toggle"}
  ],
  dateConditions: [
    {"id": 1, "label": "=", "dateCondition": "equalTo", "desc": "Equal to"},
    {"id": 2, "label": "<", "dateCondition": "lessThan", "desc": "Less than"},
    {"id": 3, "label": "<=", "dateCondition": "lessThanOrEqualTo", "desc": "Less than or Equal to"},
    {"id": 4, "label": ">", "dateCondition": "greaterThan", "desc": "Greater than"},
    {"id": 5, "label": ">=", "dateCondition": "greaterThanOrEqualTo", "desc": "Greater than or Equal to"},
    {"id": 6, "label": "!=", "dateCondition": "notEqualTo", "desc": "Not Equal to"}
  ]
});

let _immStore = defaultStore;

const attributeTypes = ['coreAttributes', 'extendedAttributes', 'clinicalAttributes'];

const TaskManagementStore = _.extend({
  getStore() {
    return _immStore;
  },

  resetStore() {
    _immStore = defaultStore;
  },

  // assign associated analytics and dashboard to each attribute 
  compareAndCheckAnalytics() {
    let taskMetadataAnalytics = _immStore.get('taskMetadataAnalytics');
    attributeTypes.forEach(attributeType => {
      let attributeListByType = _immStore.getIn(['taskMetadata', 'taskAttributes', attributeType]);
      attributeListByType = attributeListByType.map(attribute => {
        attribute = attribute.set('fieldValues', attribute.get('fieldValues').join(", "));
        if(attributeType != 'coreAttributes'){
          attribute = attribute.set('associatedAnalyticsAndDashboard', []);
          let commonAnalyticsList = taskMetadataAnalytics.getIn(['common_analytics', attribute.get('fieldId')], Imm.List());
          let kpiAnalyticsList = taskMetadataAnalytics.getIn(['kpi_studio_analytics', attribute.get('fieldId')], Imm.List());
          let finalAnalyticsList = commonAnalyticsList.concat(kpiAnalyticsList);
          attribute = attribute.set('associatedAnalyticsAndDashboard', finalAnalyticsList.toJS());
        }
        return attribute
      });
      _immStore = _immStore.setIn(['taskMetadata', 'taskAttributes', attributeType], attributeListByType);
    })
    _immStore = _immStore.set('originalTaskMetadata', _immStore.get('taskMetadata'));
  },

  fetchTaskMetadataAnalytics() {
    _immStore = _immStore.set('isMetadataAnalyticsLoading', true);
    const url = '/api/task-meta-analytics/' + AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig);
    let requestOption = {
      method: 'GET'
    };
    AppRequestByFetch(url, requestOption).then(
      async responseData => {
        _immStore = _immStore.set('taskMetadataAnalytics', Imm.fromJS(responseData));
        await TaskManagementStore.compareAndCheckAnalytics();
        _immStore = _immStore.set('isMetadataAnalyticsLoading', false);
        _immStore = _immStore.set('isEnabledSaveButton', true);
        TaskManagementStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        AdminActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        _immStore = _immStore.set('isMetadataAnalyticsLoading', false);
        TaskManagementStore.onAjaxCompletion();
      }
    );
  },

  fetchTaskMetadata() {
    const url = '/api/task-metadata';
    let requestOption = {
      method: 'GET'
    };
    AppRequestByFetch(url, requestOption).then(
      responseData => {
        _immStore = _immStore.set('taskMetadata', Imm.fromJS(responseData));
        TaskManagementStore.fetchTaskMetadataAnalytics();
        TaskManagementStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        AdminActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        TaskManagementStore.onAjaxCompletion();
      }
    );
  },

  saveTaskMetadata(taskMetadata) {
     
    _immStore = _immStore.set('isEnabledSaveButton', false);
    const url = '/api/task-metadata';
    const taskVersion = {
      "taskVersion": 3.6
    }
    const task_metadata_data = {...taskMetadata.taskAttributes, genericTasksAttributes: taskVersion}

    attributeTypes.forEach(attributeType => {
      task_metadata_data[attributeType] = task_metadata_data[attributeType].map(attr => {
        attr.fieldValues = attr.fieldValues.split(",").map(function (item) {
          return item.trim();
        });
        return attr;
      })
    })
    
    const newRequest = AppRequest({
      type: 'PUT',
      url: url,
      data: JSON.stringify(task_metadata_data)
    });
    newRequest.then(
      async responseData => {
        _immStore = _immStore.set('taskMetadata', Imm.fromJS(responseData));
        _immStore = _immStore.set('taskMetadataAnalytics', Imm.List());
        await TaskManagementStore.fetchTaskMetadataAnalytics();
        AdminActions.createStatusMessage(
          FrontendConstants.UPDATE_TASK_MANAGEMENT_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        TaskManagementStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        _immStore = _immStore.set('isEnabledSaveButton', true);
        AdminActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        TaskManagementStore.onAjaxCompletion();
      }
    );
  },

  updateMetadata(taskMetadata, attributeType) {
    _immStore = _immStore.setIn(['taskMetadata', 'taskAttributes', attributeType], taskMetadata);
  },

  addExtendedTaskAttribute(combineDashboardReportList) {
    let filesArr = [];
    combineDashboardReportList.forEach(element => {
      filesArr = filesArr.concat(element.items)
    });

    let extendedAttributeArray = _immStore.getIn(['taskMetadata', 'taskAttributes', 'extendedAttributes']);
    const dateConditions = _immStore.get('dateConditions').map(condition => {
      return condition.get('dateCondition');
    });
    let tempRow = {
      "id": null,
      "fieldId": "",
      "fieldName": "",
      "fieldDesc": "",
      "fieldType": "textbox",
      "fieldValues": "",
      "fieldDefaultValue": null,
      "isMandatory": false,
      "fieldSeq": extendedAttributeArray.size + 1,
      "taskVerion": 3.0,
      "defaultTask": false,
      "removeAttribute": true,
      "showMandatory": true,
      "dependOnAttributes": [],
      "dateConditions": dateConditions,
      "attributeType": 'EXTENDED_TASK_ATTRIBUTE',
      "associatedAnalyticsAndDashboard": filesArr
    };
    extendedAttributeArray = extendedAttributeArray.push(Imm.Map(tempRow));
    _immStore = _immStore.setIn(['taskMetadata', 'taskAttributes', 'extendedAttributes'], extendedAttributeArray);

    _immStore = _immStore.set('focusLatestExtendedRow', true);
  },

  addClinicalAttributes(combineDashboardReportList, clinicalAttributes, callback) {
    let filesArr = [];
    combineDashboardReportList.forEach(element => {
      filesArr = filesArr.concat(element.items)
    });

    const dateConditions = _immStore.get('dateConditions').map(condition => {
      return condition.get('dateCondition');
    });

    clinicalAttributes = clinicalAttributes.map((attr, index) => {
      attr.fieldId = attr.fieldId || Util.toCamelCase(attr.fieldName);
      attr.fieldDesc = attr.fieldDesc || "";
      attr.fieldType = attr.fieldType || (attr.filterType == 'DATE' ? "date" : "multiSelectDropdown");
      attr.fieldValues = attr.fieldValues || "";
      attr.fieldDefaultValue = attr.fieldDefaultValue || "";
      attr.isMandatory = attr.hasOwnProperty('isMandatory') ? attr.isMandatory : false;
      attr.fieldSeq = index + 1;
      attr.taskVerion = '3.0';
      attr.defaultTask = false;
      attr.showMandatory = true;
      attr.attributeType = 'CLINICAL_TASK_ATTRIBUTE',
      attr.dateConditions = attr.dateConditions || dateConditions;
      attr.associatedAnalyticsAndDashboard = attr.associatedAnalyticsAndDashboard || filesArr;
      attr.dependOnAttributes = attr.dependOnAttributes || [];
      return Imm.Map(attr);
    })

    _immStore = _immStore.setIn(['taskMetadata', 'taskAttributes', 'clinicalAttributes'], Imm.List(clinicalAttributes));
    callback();
  },

  changeFlagFocusLatestExtendedRow() {
    _immStore = _immStore.set('focusLatestExtendedRow', false);
  },

}, Store);

const _actions = {
  [actions.FETCH_TASK_METADATA]: TaskManagementStore.fetchTaskMetadata,
  [actions.SAVE_TASK_METADATA]: action => TaskManagementStore.saveTaskMetadata(action.taskMetadata),
  [actions.TASK_METADATA_UPDATE]: action => TaskManagementStore.updateMetadata(action.taskMetadata, action.attributeType),
  [actions.ADD_EXTENDED_TASK_ATTRIBUTE]: action => TaskManagementStore.addExtendedTaskAttribute(action.combineDashboardReportList),
  [actions.ADD_CLINICAL_ATTRIBUTES]: action => TaskManagementStore.addClinicalAttributes(action.combineDashboardReportList, action.clinicalAttributes, action.callback),
  [actions.CHANGE_FOCUS_LATEST_EXTENDED_ROW]: action => TaskManagementStore.changeFlagFocusLatestExtendedRow(),
  [actions.FETCH_TASK_METADATA_ANALYTICS]: action => TaskManagementStore.fetchTaskMetadataAnalytics()
};


TaskManagementStore.dispatcherIndex = AppDispatcher.register((payload) => {
  const {action} = payload;
  const immDispositionStore = TaskManagementStore.getStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!Imm.is(immDispositionStore, _immStore)) {
    TaskManagementStore.emitChange();
  }

  return true;
});

export default TaskManagementStore;
