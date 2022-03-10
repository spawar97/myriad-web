// var keymirror = require('keymirror');

// module.exports = keymirror({
//   ADD_CONFIRMATION: null,
//   ADD_OR_VIEW: null,
//   UPDATE_CONFIRMATION: null
// });

export const taskFieldType = {
  "SINGLE_SELECT_DROPDOWN": "singleSelectDropdown",
  "CALENDAR": "date",
  "TEXT": "textbox",
  "TEXTAREA": "textarea",
  "RADIO": "toggle",
  "MULTI_SELECT_DROPDOWN": "multiSelectDropdown"
}
export const taskAttributeType = {
  "CLINICAL_TASK_ATTRIBUTE": "CLINICAL_TASK_ATTRIBUTE",
  "EXTENDED_TASK_ATTRIBUTE": "EXTENDED_TASK_ATTRIBUTE",
  "CORE_TASK_ATTRIBUTE": "CORE_TASK_ATTRIBUTE",
}
export const coreDropdownFields = {
  "TITLE":"title",
  "DESCRIPTION": "description",
  "ASSIGNEE_IDS": "assigneeIds",
  "OBSERVER_IDS": "observerIds",
  "TASK_TYPE_ID": "taskTypeId",
  "TASK_STATE_ID": "taskStateId",
  "ACTION_TYPE_ID": "actionTypeId",
  "EMAIL_NOTIFICATION": "isNotificationRequired",
  "URGENCY": "urgency",
  "PRIORITY": "priority",
  "DUE_DATE": "dueDate"
}

export const clinicalFields = {
  "STUDIES": "studyIds",
  "COUNTRIES": "siteCountries",
  "SITES": "siteIds"
}

export const fileTypeConstants = {
  "FILE_TYPE_DASHBOARD": "DASHBOARD",
  "FILE_TYPE_DATA_REVIEW": "DATA_REVIEW_SET",
  "FILE_TYPE_REPORT": "REPORT"
}
