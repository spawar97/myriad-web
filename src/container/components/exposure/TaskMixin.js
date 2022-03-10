var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
var Moment = require('moment');
import {taskFieldType, taskAttributeType, coreDropdownFields} from '../../constants/TaskDisplayConstants';

var Util = require('../../util/util');
var ExposureActions = require('../../actions/ExposureActions');
import FrontendConstants from '../../constants/FrontendConstants';
import DataTypeConstants from '../../constants/DataTypeConstants';
import TaskManagementStore from '../../stores/TaskManagementStore';
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
const newImmStore = TaskManagementStore.getStore();

var TaskMixin = {

  getCDMDropdownName: function (field, id) {
    return (this.props.immCDMDropdownData.getIn(['data', `${field}DropdownData`], Imm.List()).find(immItem => immItem.get('key') === id) || Imm.Map()).get('value');
  },

  getTaskAttributes: function (immTask, props) {
    return _.extend(immTask.toJS(), props, {
      handleInputChange: this.handleInputChange,
      checkInvalidFieldMsg: this.checkInvalidFieldMsg,
      immUsers: this.props.immUsers,
      immGroupEntities: this.props.immGroupEntities,
      isLinkedToCDMFile: this.props.isLinkedToCDMFile,
      immFileConfigs: this.props.immFileConfigs,
      immTaskTypes: this.props.immTaskTypes,
      getDependentClinicalAttributes: this.getDependentClinicalAttributes,
      handleDateConditionChange: this.handleDateConditionChange,
    });
  },

  //Get the clinical dropdown values based on the selected dependent clinical attributes
  componentWillReceiveProps: function (nextProps) {
    if (this.props.immExposureStore.get('clinicalAttributesDropdownData') !== nextProps.immExposureStore.get('clinicalAttributesDropdownData')) {
      if (this.state.taskConfig) {
        const taskAttributes = this.state.taskConfig.get('taskAttributes').toJS();
        let workingTaskMetadata = this.state.workingTaskMetadata;
        const clinicalData = nextProps.immExposureStore.get('clinicalAttributesDropdownData').toJS();
        const updatedClinicalAttributes = _.each(taskAttributes.clinicalAttributes, (attribute) => {
          if (attribute.clinicalDbDetail) {
            const clinicalAttribute = clinicalData.find(data => data.columnDetails ? attribute.clinicalDbDetail.column === data.columnDetails.column : attribute.clinicalDbDetail.column === data.clinicalDbDetail.column)
            attribute.fieldValues = clinicalAttribute ? clinicalAttribute.resultData : attribute.fieldValues;
            if(attribute.clinicalDbDetail.dataType === DataTypeConstants.DATE && clinicalAttribute && clinicalAttribute.resultData.length !== 0){
              let selectedValue = clinicalAttribute.resultData[0].value
              let dateValue = Util.dateFormatterUTC(selectedValue);
              attribute.clinicalDbDetail.values = [dateValue];
              let selectedAttribute = workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute', attribute.fieldId])
              let fieldValue = {
                'dateCondition': Imm.Iterable.isIterable(selectedAttribute) ? selectedAttribute.get('dateCondition') : selectedAttribute.dateCondition,
                'dateValue': selectedValue
              }
              taskAttributes.clinicalAttributes.map(clinicalAttribute => {
                clinicalAttribute.clinicalDbDetail.dependOnAttributes.map(dependedAttribute => {
                  if(attribute.clinicalDbDetail.column === dependedAttribute.name){
                    dependedAttribute.values = attribute.clinicalDbDetail.values;
                    dependedAttribute.operator = attribute.clinicalDbDetail.operator;
                  }
                })
              })
              workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'clinicalTaskAttribute', attribute.fieldId], fieldValue)
            }
          }
          return attribute
        })
        this.setState({workingTaskMetadata, taskConfig: this.state.taskConfig.setIn(['taskAttributes', 'clinicalAttributes'], Imm.fromJS(updatedClinicalAttributes))})
      }
    }
  },

  //Get the required value format that needs to be passed to fetch column-data API
  fetchFormattedClinicalValue: function (attribute, selectedAttributeValue) {
    let selectedValue = {};
    const dateConditions = newImmStore.get('dateConditions')
    if(attribute.fieldType === taskFieldType.CALENDAR) {
      let dateValue = Util.dateFormatterUTC(selectedAttributeValue.dateValue);
      let dateConditionValue = dateConditions.find(conditionObj => conditionObj.get('dateCondition') === selectedAttributeValue.dateCondition).get('label');
      selectedValue.value = [dateValue];
      selectedValue.operator = dateConditionValue
    } else if(attribute.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN){
      selectedValue.value = selectedAttributeValue
    } else {
      selectedValue.value = [selectedAttributeValue];
    }
    return selectedValue;
  },

  //Get the dependent clinical attribute dropdown values on blur of clinical attribute after selection.
  //Update the dependent attribute values inside the task in the dependOnAttributes array so that the value is preserved.
  getDependentClinicalAttributes: function (selectedTask) {
    if (selectedTask.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
      const taskCoreAttrValues = this.state.workingTaskMetadata.get('task').toJS()
      const attributeTypeObj = selectedTask.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE
        ? taskCoreAttrValues.extendedDynamicTaskAttributes
        : selectedTask.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE
          ? taskCoreAttrValues.clinicalTaskAttribute
          : taskCoreAttrValues.coreTaskAttributes;

      const taskAttributes = this.state.taskConfig;
      const clinicalDependentList = Util.getFilterDependency(taskAttributes.getIn(['taskAttributes', 'clinicalAttributes']).toJS());
      const clinicalChangedFields = [];
      const clinicalColumnDetails = [];

      clinicalDependentList.map(field => {
        if(field.list.some(column => column === selectedTask.clinicalDbDetail.column)){
          clinicalChangedFields.push(field.key)
        }
      })
      const selectedTaskObject = taskAttributes.getIn(['taskAttributes', 'clinicalAttributes']).find(attr => attr.get('fieldId') === selectedTask.fieldId).toJS()
      if(selectedTaskObject && !_.isEqual(selectedTaskObject.clinicalDbDetail.values, attributeTypeObj[selectedTask.fieldId])){
        const updatedAttributes = taskAttributes.getIn(['taskAttributes', 'clinicalAttributes']).map(attribute => {
          let selectedValue = this.fetchFormattedClinicalValue(selectedTaskObject, attributeTypeObj[selectedTask.fieldId])
          if(selectedTask.fieldId === attribute.get('fieldId')) {
            attribute = attribute.setIn(['clinicalDbDetail','values'], selectedValue.value);
            if(selectedTask.fieldType === taskFieldType.CALENDAR){
              attribute = attribute.setIn(['clinicalDbDetail','operator'], selectedValue.operator);
            }
          };
          const isDependent = attribute.get('dependOnAttributes').some(data => selectedTask.fieldId === data);
          if (isDependent) {
            const selectedIndex = attribute.getIn(['clinicalDbDetail', 'dependOnAttributes']).findIndex(item => item.get('name') === selectedTask.clinicalDbDetail.column);
            if (attributeTypeObj[selectedTask.fieldId]) {
              attribute = attribute.setIn(['clinicalDbDetail', 'dependOnAttributes', selectedIndex, 'values'], selectedValue.value)
              if(selectedTaskObject.fieldType === taskFieldType.CALENDAR){
                attribute = attribute.setIn(['clinicalDbDetail', 'dependOnAttributes', selectedIndex, 'operator'], selectedValue.operator)
              }
            }
          }
          clinicalColumnDetails.push(attribute.get('clinicalDbDetail').toJS())
          return attribute
        });
        const columnDetailsObject = {columnDetails: clinicalColumnDetails,clinicalChangedFields,clinicalDependentList }
        ExposureActions.fetchClinicalAttributes(columnDetailsObject);
        this.setState({taskConfig: this.state.taskConfig.setIn(['taskAttributes', 'clinicalAttributes'], Imm.fromJS(updatedAttributes))})
      }
    }
  },

  //This function has been introduced for adding date condition to date type attributes
  handleDateConditionChange: function (task, value) {
    let workingTaskMetadata = this.state.workingTaskMetadata;
    if (task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE) {
      let taskObj = this.state.workingTaskMetadata.getIn(['task', 'extendedDynamicTaskAttributes', task.fieldId]);
      let fieldValue = {
        'dateCondition': value,
        'dateValue': Imm.Iterable.isIterable(taskObj) ? taskObj.get('dateValue') : taskObj.dateValue
      }
      workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'extendedDynamicTaskAttributes', task.fieldId], fieldValue)
    } else {
      let taskObj = this.state.workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute', task.fieldId])
      let fieldValue = {
        'dateCondition': value,
        'dateValue': Imm.Iterable.isIterable(taskObj) ? taskObj.get('dateValue') : taskObj.dateValue
      }
      workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'clinicalTaskAttribute', task.fieldId], fieldValue)
    }
    this.setState({ workingTaskMetadata: workingTaskMetadata },() => {
      this.getDependentClinicalAttributes(task);
    });
  },

  //Handle Input change for task attribute form values
  handleInputChange: function (task, value) {
    let workingTaskMetadata = this.state.workingTaskMetadata;
    let formObj = {};
    let attributeValue;
    switch (task.attributeType) {
      case taskAttributeType.CORE_TASK_ATTRIBUTE:
        attributeValue = this.setAttributeValue(task, value);
        formObj = workingTaskMetadata.getIn(['task', 'coreTaskAttributes', task.fieldId]);
        if (!formObj) {
          formObj = { [task.fieldId]: attributeValue };
          workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'coreTaskAttributes'], formObj)
        } else {
          workingTaskMetadata = task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN
            ? workingTaskMetadata.setIn(['task', 'coreTaskAttributes', task.fieldId], attributeValue)
            : workingTaskMetadata.mergeIn(['task', 'coreTaskAttributes', task.fieldId], attributeValue);
        }
        if(task.fieldId === coreDropdownFields.TASK_TYPE_ID) {
          // Get immTaskState.
          let allTaskStates = this.props.immTaskTypes && ((this.props.immTaskTypes.find(immTaskType => immTaskType.get('id') === value) || Imm.Map())
            .get('taskStates', Imm.List()))
           // Select default task state as 'OPEN', if not awailable then select first from task list
          let taskStateValue = allTaskStates.find(immTaskState => immTaskState.get('name') === "Open") || allTaskStates.get(0)
          let defaultTaskStateValue = taskStateValue && taskStateValue.get('id')
          workingTaskMetadata = workingTaskMetadata.setIn(['task', 'coreTaskAttributes', coreDropdownFields.TASK_STATE_ID], defaultTaskStateValue)
        }
        break;
      case taskAttributeType.EXTENDED_TASK_ATTRIBUTE:
        attributeValue = this.setAttributeValue(task, value);
        formObj = workingTaskMetadata.getIn(['task', 'extendedDynamicTaskAttributes', task.fieldId]);
        if (!formObj) {
          formObj = { [task.fieldId]: attributeValue };
          workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'extendedDynamicTaskAttributes'], formObj)
        } else {
          workingTaskMetadata = task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN
          ? workingTaskMetadata.setIn(['task', 'extendedDynamicTaskAttributes', task.fieldId], attributeValue)
          : workingTaskMetadata.mergeIn(['task', 'extendedDynamicTaskAttributes', task.fieldId], attributeValue);
        }
        break;
      case "newComment":
        if (Util.isWhiteSpaceOnly(value)) {
          workingTaskMetadata = workingTaskMetadata.delete('newComment');
        } else {
          workingTaskMetadata = workingTaskMetadata.set('newComment', Imm.Map({
            comment: value,
            userId: this.props.currentUserId,
            taskId: this.props.currentTaskId
          }));
        }
        break;
      default:
        attributeValue = this.setAttributeValue(task, value);
        formObj = workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute', task.fieldId]);
        if (!formObj) {
          formObj = { [task.fieldId]: attributeValue };
          workingTaskMetadata = workingTaskMetadata.mergeIn(['task', 'clinicalTaskAttribute'], formObj)
        } else {
          workingTaskMetadata = workingTaskMetadata.setIn(['task', 'clinicalTaskAttribute', task.fieldId], attributeValue)
        }
        break;
    }
    this.setState({workingTaskMetadata});
  },

  setAttributeValue: function (task, value) {
    let fieldValue;
    switch (task.fieldType) {
      case taskFieldType.CALENDAR:
        let dateValue = (typeof value === 'object') ? Moment(value).endOf('day').utc().valueOf().toString() : value;
        if (task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE) {
          let taskObj = this.state.workingTaskMetadata.getIn(['task', 'extendedDynamicTaskAttributes', task.fieldId])
          fieldValue = {
            'dateCondition': Imm.Iterable.isIterable(taskObj) ? taskObj.get('dateCondition') : taskObj.dateCondition,
            'dateValue': dateValue
          }
        } else if (task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
          let taskObj = this.state.workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute', task.fieldId])
          fieldValue = {
            'dateCondition': Imm.Iterable.isIterable(taskObj) ? taskObj.get('dateCondition') : taskObj.dateCondition,
            'dateValue': dateValue
          }
        } else {
          fieldValue = dateValue;
        }
        break;
      case taskFieldType.RADIO:
        if (task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE) {
          fieldValue = !this.state.workingTaskMetadata.getIn(['task', 'extendedDynamicTaskAttributes', task.fieldId]);
        } else if (task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
          fieldValue = !this.state.workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute', task.fieldId]);
        } else {
          fieldValue = !this.state.workingTaskMetadata.getIn(['task', 'coreTaskAttributes', task.fieldId]);
        }
        break;
      default:
        fieldValue = value;
        break;
    }
    return fieldValue;
  },

  //Handle form validations on form submit
  handleFormValidations() {
    let errors = {};
    const taskConfiguration = this.state.taskConfig.get('taskAttributes').toJS();
    Object.entries(taskConfiguration).map(([_attributeType, attributeList]) => {
      Array.isArray(attributeList) && attributeList.map(attribute => {
        const isInValid = !_.isEmpty(this.checkInvalidFieldMsg(attribute, true));
        errors[attribute.fieldId] = isInValid;
      });
    });
    return Object.values(errors).some(error => error);
  },

  checkInvalidFieldMsg(task, submitValidation = false) {
    let invalidMessage = null;
    if (submitValidation || this.state.submitTriggered) {
      const taskCoreAttrValues = this.state.workingTaskMetadata.get('task').toJS()
      const attributeTypeObj = task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE
        ? taskCoreAttrValues.extendedDynamicTaskAttributes
        : task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE
          ? taskCoreAttrValues.clinicalTaskAttribute : taskCoreAttrValues.coreTaskAttributes;

      if (task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE && !this.props.isLinkedToCDMFile) {
        return invalidMessage;
      }
    
      switch (task.fieldType) {
        case taskFieldType.TEXT:
        case taskFieldType.TEXTAREA:
        case taskFieldType.SINGLE_SELECT_DROPDOWN:
          invalidMessage = task.isMandatory && Util.isWhiteSpaceOnly(attributeTypeObj[task.fieldId]) && FrontendConstants.INVALID_MESSAGE(task.fieldName);
          break;
        case taskFieldType.CALENDAR:
          const attributeValue = task.attributeType === taskAttributeType.CORE_TASK_ATTRIBUTE
            ? attributeTypeObj[task.fieldId]
            : attributeTypeObj[task.fieldId]['dateValue'];
          if (!$.isNumeric(attributeValue)) {
            invalidMessage = FrontendConstants.PLEASE_ENTER_VALID_DATE;
          } else if ((task.fieldId === coreDropdownFields.DUE_DATE) && (!Util.validFutureEpochString(attributeValue))) {
            invalidMessage = FrontendConstants.DUE_DATE_CANNOT_BE_IN_THE_PAST;
          }
          break;
        case taskFieldType.MULTI_SELECT_DROPDOWN:
          invalidMessage = task.isMandatory && attributeTypeObj[task.fieldId].length === 0 && FrontendConstants.INVALID_MESSAGE(task.fieldName);
          break;
      }
    }
    return invalidMessage
  },

  //Format the task Obj to sent to the API
  formatTask(workingTaskMetadata) {
    let coreTaskAttributes = workingTaskMetadata.getIn(['task', 'coreTaskAttributes']).toJS();
    let clinicalTaskAttribute = workingTaskMetadata.getIn(['task', 'clinicalTaskAttribute']).toJS();
    let extendedDynamicTaskAttributes = workingTaskMetadata.getIn(['task', 'extendedDynamicTaskAttributes']).toJS();
    let coreAttributes = {};
    let extendedAttributes = [];
    let clinicalAttributes = [];
    Object.entries(coreTaskAttributes).forEach(([key, value]) => {
      let attributeValue = value 
      if(key === coreDropdownFields.ACTION_TYPE_ID && value === ""){
        attributeValue = null
      }
      coreAttributes[key] = attributeValue;
    });
    workingTaskMetadata = workingTaskMetadata.setIn(['task', 'coreTaskAttributes'], Imm.fromJS(coreAttributes));  
    
    Object.entries(clinicalTaskAttribute).forEach(([key, value]) => {
      if (value && (value.length !== 0 || _.isObject(value))) {
        if (Array.isArray(value)) {
          clinicalAttributes.push({attributeName: key, attributeValues: value});
        } else {
          const newValue = _.isString(value) ? value : JSON.stringify(value)
          clinicalAttributes.push({attributeName: key, attributeValues: [newValue]});
        }
      }
    })
    workingTaskMetadata = workingTaskMetadata.setIn(['task', 'clinicalTaskAttribute'], clinicalAttributes)

    Object.entries(extendedDynamicTaskAttributes).forEach(([key, value]) => {
      if (value && (value.length !== 0 || _.isObject(value))) {
        if (Array.isArray(value)) {
          extendedAttributes.push({attributeName: key, attributeValue: value});
        } else {
          const newValue = _.isString(value) ? value : JSON.stringify(value)
          extendedAttributes.push({attributeName: key, attributeValue: [newValue]});
        }
      }
    })
    workingTaskMetadata = workingTaskMetadata.set('clientId', this.props.appName);
    if(this.props.taskContext){
      let taskContext = this.props.taskContext;
      if(taskContext.extraInformation){
        taskContext.extraInformation = JSON.stringify(taskContext.extraInformation);
      }
      workingTaskMetadata = workingTaskMetadata.setIn(['task', 'taskContext'], this.props.taskContext);
    }
    workingTaskMetadata = workingTaskMetadata.setIn(['task', 'extendedDynamicTaskAttributes'], extendedAttributes);
    return workingTaskMetadata;
  },

  isObserverOnly: function (currentUserId, immTask) {
    let userRelationType = this.getUserRelationWithTask(currentUserId, immTask);
    return userRelationType == FrontendConstants.TASK_RELATION_OBSERVER || userRelationType == FrontendConstants.TASK_RELATION_NONE;
  },

  isReadOnly: function (currentUserId, immTask){
    let userRelationType = this.getUserRelationWithTask(currentUserId, immTask);
    return userRelationType == FrontendConstants.TASK_RELATION_NONE;
  },

  getUserRelationWithTask: function (currentUserId, immTask){
    var immAllAssignees = immTask.getIn(['coreTaskAttributes', 'assigneeIds']).flatMap(assigneeId => {
      return this.props.immGroupEntities.getIn([assigneeId, 'userIds']) || [assigneeId];
    });
    var immAllObservers = immTask.getIn(['coreTaskAttributes', 'observerIds']);
    return currentUserId == immTask.getIn(['coreTaskAttributes', 'authorId']) ? FrontendConstants.TASK_RELATION_AUTHOR :
      immAllAssignees.contains(currentUserId) ? FrontendConstants.TASK_RELATION_ASSIGNEE : immAllObservers.contains(currentUserId) ? FrontendConstants.TASK_RELATION_OBSERVER : FrontendConstants.TASK_RELATION_NONE;
  },

  userCantAccessTask: function (currentUserId, immTask) {
    var authorId = immTask.getIn(['coreTaskAttributes', 'authorId']);
    var immAllAssignees = immTask.getIn(['coreTaskAttributes', 'assigneeIds']).flatMap(assigneeId => {
      return this.props.immGroupEntities.getIn([assigneeId, 'userIds']) || [assigneeId];
    });
    var immObserverIds = immTask.getIn(['coreTaskAttributes', 'observerIds'], Imm.Set());
    immAllAssignees = Imm.Set(immAllAssignees);
    immObserverIds = Imm.Set(immObserverIds);
    return currentUserId !== authorId && !immAllAssignees.contains(currentUserId) && !immObserverIds.contains(currentUserId);
  }

};

module.exports = TaskMixin;
