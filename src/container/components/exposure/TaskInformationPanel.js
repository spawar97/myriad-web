var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var Calendar = React.createFactory(require('../Calendar'));
let Checkbox = React.createFactory(require('../Checkbox'));
var Combobox = React.createFactory(require('../Combobox'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var TaskAssignees = React.createFactory(require('../TaskAssignees'));
var ToggleButton = React.createFactory(require('../ToggleButton'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var TaskInputFieldConstants = require('../../constants/TaskInputFieldConstants');
import {taskFieldType, taskAttributeType, coreDropdownFields, clinicalFields} from '../../constants/TaskDisplayConstants';

var Util = require('../../util/util');
import MasterStudyFilterUtil from "../../util/MasterStudyFilterUtil";
import TaskManagementStore from '../../stores/TaskManagementStore';
import AdminStore from '../../stores/AdminStore';
import PermissionsUtil from '../../util/PermissionsUtil';
import { FeatureListConstants, AccessPermissionsConstants } from '../../constants/PermissionsConstants';

var div = React.createFactory(require('../TouchComponents').TouchDiv),
  span = React.createFactory(require('../TouchComponents').TouchSpan);

const FILE_SELECT_GROUP_NAME_OVERRIDES = {};
FILE_SELECT_GROUP_NAME_OVERRIDES[ExposureAppConstants.FILE_TYPE_REPORT] = 'Reports';
FILE_SELECT_GROUP_NAME_OVERRIDES[ExposureAppConstants.FILE_TYPE_DASHBOARD] = 'Dashboards';
FILE_SELECT_GROUP_NAME_OVERRIDES[ExposureAppConstants.FILE_TYPE_DATA_REVIEW] = 'Data Review Sets';

class TaskInformationPanel extends React.Component {
  static displayName = 'TaskInformationPanel';

  static propTypes = {
    immFileConfigs: PropTypes.instanceOf(Imm.Map).isRequired,
    immUsers: PropTypes.instanceOf(Imm.Map).isRequired,
    assigneeIds: PropTypes.arrayOf(PropTypes.string),
    authorId: PropTypes.string,
    createdAt: PropTypes.string,
    dashboardId: PropTypes.string,
    description: PropTypes.string,
    dueDate: PropTypes.string,
    handleInputChange: PropTypes.func,  // Required for add mode and view mode.
    handleLinkedFileChange: PropTypes.func,  // Required for add mode.
    isAddConfirmationMode: PropTypes.bool,
    isAddMode: PropTypes.bool,
    isAuthor: PropTypes.bool,
    isUpdateConfirmationMode: PropTypes.bool,
    isViewMode: PropTypes.bool,
    observerIds: PropTypes.arrayOf(PropTypes.string),
    reportId: PropTypes.string,
    taskState: PropTypes.string,
    title: PropTypes.string,
    updatedAt: PropTypes.string,
    disableAssociatedReports: PropTypes.bool,
    datareviewId: PropTypes.string,
    handleCustomTask:PropTypes.func,
    clonedTriggered:PropTypes.bool
  };

  getAssigneeDropdownItems = () => {
    let immUserList = this.getAssignableUsers();
    const immGroupEntities = this.props.immGroupEntities.valueSeq();
    const immAssigneeList = Util.getSelectableUsersOrTeams(immGroupEntities, immUserList, this.props.currentUserId).map(immAssignee => {
      return immAssignee.set('selected', _.contains(this.props.assigneeIds, immAssignee.getIn(['entity', 'id'])));
    });
    let studyIds = this.props.studyIds || [];
    return immAssigneeList.map(immAssignee => {
      let hasTaskEditAccess = false;
      const immGroupEntities = this.props.immGroupEntities;
      const immUserGroups = immGroupEntities.filter(immGroupEntity => immGroupEntity.get('userIds').contains(immAssignee.getIn(['entity','id'])));
      if (PermissionsUtil.checkEntityHasAccessForFeature(immAssignee.get('entity', Imm.Map()), FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)
        || PermissionsUtil.hasInheritedAccessForFeature(immAssignee.get('entity', Imm.Map()), immUserGroups, FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)) {
          hasTaskEditAccess = true;
      }
      let studyAccess = this.checkStudyPermission(immAssignee.get('entity', Imm.Map()), studyIds);

      if(!hasTaskEditAccess  || !studyAccess)  return Imm.fromJS({});
      
      // TODO: Use proper immutable access, instead of converting to JS.
      const assignee = immAssignee.toJS();
      switch (assignee.entityType) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          return Imm.fromJS({
            text: assignee.entity.name,
            id: assignee.entity.id,
            type: FrontendConstants.TEAMS
          });
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          if (assignee.entity.isSelectable) {
            return Imm.fromJS({
              text: assignee.entity.fullName,
              id: assignee.entity.id,
              type: FrontendConstants.USERS
            });
          }
      }
    }).filter(immAssignee => immAssignee && !immAssignee.isEmpty());
  };

  getUserList = (immUserList, userIdsPool) => {
    return immUserList.map(function (immUser) {
      return immUser.set('selected', _.contains(userIdsPool, immUser.get('id')));
    }, this).sortBy(function (immUser) {
      return immUser.get('fullName');
    });
  };

  // Only display selectable users in the user dropdown.
  getUserDropdownItems = () => {
    let immUserList = this.getAssignableUsers();
    const immObserverList = this.getUserList(immUserList, this.props.observerIds || []);
    let studyIds = this.props.studyIds || [];
    return immObserverList.filter((immUser)=>{ 
      let hasTaskEditAccess = false;
      const immGroupEntities = this.props.immGroupEntities;
      const immUserGroups = immGroupEntities.filter(immGroupEntity => immGroupEntity.get('userIds').contains(immUser.get('id')));
      if (PermissionsUtil.checkEntityHasAccessForFeature(immUser, FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)
        || PermissionsUtil.hasInheritedAccessForFeature(immUser, immUserGroups, FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)) {
          hasTaskEditAccess = true;
      }
      let studyAccess = this.checkStudyPermission(immUser, studyIds);

      if(hasTaskEditAccess  && studyAccess)  return immUser;

    }).flatMap(immUser => immUser.get('isSelectable', false) ? Imm.fromJS([{
      text: immUser.get('fullName'),
      id: immUser.get('id')
    }]) : Imm.List());
  };

  getAssignableUsers = () => {
    let immAssignableUsers;
    if (this.state && this.state.immAssignableUsers) {
      const immAssignableIds = this.state.immAssignableUsers.map(immUserInfo => immUserInfo.getIn(['user', 'id'], null)).toList();
      immAssignableUsers = this.props.immUsers.filter(immUser => {
        return immAssignableIds.contains(immUser.get('id', false));
      });
    } else {
      immAssignableUsers = this.props.immUsers;
    }
    return immAssignableUsers.valueSeq();
  };

  checkStudyPermission = (immUser, studyIds) => {
    let studyAccess = false;
    if(immUser.get('dataAccessStudyNames', Imm.List()).size === 0) {
      studyAccess = true;
    }
    else {
      if(studyIds.length === 0) {
        studyAccess = true;
      } else if(studyIds.length){
        let dataAccessStudyNames = immUser.get('dataAccessStudyNames').toJS();
        studyAccess = studyIds.every(val => dataAccessStudyNames.includes(val));
      } 
    }
    return studyAccess;
  }

  state = {
    isOpenClinical: false, //clinical attributes by default collaps
    isOpenExtended: true, // extended attributes by default extended
    customTriggered: this.props.customTriggered,
    clonedTriggered: this.props.clonedTriggered,
    assigneeUserList : this.getAssigneeDropdownItems(),
    observerUserList: this.getUserDropdownItems()
  };

  componentDidMount() {
    this.getTaskAssignableUsers();
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ customTriggered: nextProps.customTriggered });  
    this.setState({ clonedTriggered: nextProps.clonedTriggered });  
  }

  isTaskStateOpen = (task) => {
    if(task.fieldId === coreDropdownFields.DUE_DATE) {
    const { taskTypeId, taskStateId } = this.props.coreTaskAttributes;
    // Get immTaskType.
    return this.props.immTaskTypes && ((this.props.immTaskTypes.find(immTaskType => immTaskType.get('id') === taskTypeId) || Imm.Map())
      .get('taskStates', Imm.List())
      // Get immTaskState.
      .find(immTaskState => immTaskState.get('id') === taskStateId) || Imm.Map())
      // Check taskStateKind.
      .get('taskStateKind') === ExposureAppConstants.TASK_STATE_OPEN;
    }
    return true;
  };

  getFile = (file) => {
    return {
      key: file.id,
      fileId: file.id,
      fileType: file.fileType,
      title: file.title
    };
  };

  handleItemOpener = (itemName) => {
    this.setState({ [itemName]: !this.state[itemName] });
  };

  handleFilesSelect = (selection) => {
    this.props.handleLinkedFileChange(selection.fileId, selection.fileType);
  };

  handleChangeField = (task, e) => {
    this.props.handleInputChange(task, e.target.value);
  };

  handleDropdownCalendarChange = (task, value) => {
    this.props.handleInputChange(task, value);
  };

  handleDateConditionChange = (task, value) => {
    this.props.handleInputChange(task, value);
  };

  getInvalidDueDateErrorMessage = () => {
    if (!this.props.isViewMode || this.props.originalDueDate !== this.props.dueDate) {
      if (!$.isNumeric(this.props.dueDate)) {
        return FrontendConstants.PLEASE_ENTER_VALID_DATE;
      } else if (!Util.validFutureEpochString(this.props.dueDate)) {
        return FrontendConstants.DUE_DATE_CANNOT_BE_IN_THE_PAST;
      }
    }
  };

  parseFiles = (immFileConfigs) => {
    return immFileConfigs.sortBy(function (immFileConfig) {
      return immFileConfig.title.toLowerCase();
    }).map(this.getFile, this).toList().toJS()
  };

  getTaskAssignableUsers(taskStudyIds) {
    let applicableStudyIds;
    if (_.isEmpty(taskStudyIds) && !!this.props.immExposureStore) {
      const immMasterStudyIds = MasterStudyFilterUtil.getSelectedMasterStudyIds(this.props.cookies, this.props.immExposureStore);
      applicableStudyIds = immMasterStudyIds.toArray();
    } else {
      applicableStudyIds = taskStudyIds;
    }

    if (_.isEmpty(applicableStudyIds)) {
      const userList = [...this.props.immUsers].map(([id, user]) => ({id, user}));
      this.updateTaskAssignableUsers(Imm.fromJS(userList));
    } else {
      ExposureActions.getTaskAssignableUsers(applicableStudyIds, this.updateTaskAssignableUsers.bind(this))
    }
  };

  updateTaskAssignableUsers(immUsers) {
    this.setState({
      immAssignableUsers: immUsers
    });
  };

  getDropdownOptions = (task, attributeTypeObj) => {
    let dropdownValues = [];
    let isDisabled = false;
    const immTaskTypeOptions = this.props.immTaskTypes.map(immTaskType => ({
      text: immTaskType.get('name'),
      id: immTaskType.get('id')
    }));
    const immSelectedTaskType = this.props.immTaskTypes.find(immTaskType => immTaskType.get('id') === attributeTypeObj['taskTypeId']);
    let dropdownOptions = {};
    if (task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
      dropdownValues = task.fieldValues.map(field => ({id: field.key, text: field.value}));
      isDisabled = true;
    } else {
      switch (task.fieldId) {
        case coreDropdownFields.ASSIGNEE_IDS:
          const immAssignees = this.state.assigneeUserList;
          dropdownValues = immAssignees
          break;
        case coreDropdownFields.OBSERVER_IDS:
          const immObservers = this.state.observerUserList;
          dropdownValues = immObservers
          break;
        case coreDropdownFields.TASK_TYPE_ID:
          dropdownValues = immTaskTypeOptions
          break;
        case coreDropdownFields.TASK_STATE_ID:
          isDisabled = !immSelectedTaskType;
          dropdownValues = immSelectedTaskType ? immSelectedTaskType.get('taskStates').map(immTaskState => ({
            text: immTaskState.get('name'),
            id: immTaskState.get('id')
          })) : Imm.List()
          break;
        case coreDropdownFields.ACTION_TYPE_ID:
          isDisabled = !immSelectedTaskType;
          dropdownValues = immSelectedTaskType ? immSelectedTaskType.get('actionTypes').map(immActionTypes => ({
            text: immActionTypes.get('name'),
            id: immActionTypes.get('id')
          })) : Imm.List()
          break;
        default:
          dropdownValues = task.fieldValues.map(field => ({id: field, text: field.toString()}));
          break;
      }
    }
    dropdownOptions = {
      dropdownValues: Imm.fromJS(dropdownValues),
      isDisabled
    }
    return dropdownOptions;
  }

  getInputClassName = (task) => {
    let className = "";
    if(task.attributeType === taskAttributeType.CORE_TASK_ATTRIBUTE) {
      switch (task.fieldId) {
        case coreDropdownFields.TITLE:
          className = "title-input"
          break;
          case coreDropdownFields.DESCRIPTION:
          className = "description-input"
          break;
          case coreDropdownFields.URGENCY:
          className = "urgency-toggle-button"
          break;
          case coreDropdownFields.PRIORITY:
          className = "priority-input-block"
          break;
          case coreDropdownFields.DUE_DATE:
          className = "due-date-input"
          break;
          case coreDropdownFields.EMAIL_NOTIFICATION:
          className = "email-toggle-button"
          break;
        case coreDropdownFields.ASSIGNEE_IDS:
          className = "assignee-input-block"
          break;
        case coreDropdownFields.OBSERVER_IDS:
          className = "observer-input-block"
          break;
        case coreDropdownFields.TASK_TYPE_ID:
          className = "task-type-input"
          break;
        case coreDropdownFields.TASK_STATE_ID:
          className = "task-state-input"
          break;
        case coreDropdownFields.ACTION_TYPE_ID:
          className = "action-type-input"
          break;
      }
    }else if(task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
      switch (task.fieldId){
        case clinicalFields.STUDIES: 
          className = "study-input"
          break;
        case clinicalFields.COUNTRIES: 
          className = "country-input"
          break;
        case clinicalFields.SITES: 
          className = "site-input"
          break;
      }

    }
    return className
  }

  getLabelClassName = (task) => {
    let className = "";
    if(task.attributeType === taskAttributeType.CORE_TASK_ATTRIBUTE) {
      switch (task.fieldId) {
        case coreDropdownFields.ASSIGNEE_IDS:
          className = "assignee-text"
          break;
        case coreDropdownFields.OBSERVER_IDS:
          className = "observer-text"
          break;
      }
    }
    return className
  }

  renderTaskFields = (task) => {
    const taskCoreAttrValues = this.props;
    const newImmStore = TaskManagementStore.getStore();
    const dateConditions = newImmStore.get('dateConditions')
    const attributeTypeObj = task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE
      ? taskCoreAttrValues.extendedDynamicTaskAttributes
      : task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE
        ? taskCoreAttrValues.clinicalTaskAttribute
        : taskCoreAttrValues.coreTaskAttributes;

      if ((!this.state.customTriggered || (this.state.customTriggered && task.fieldId === coreDropdownFields.ASSIGNEE_IDS)) && (task.fieldType === taskFieldType.SINGLE_SELECT_DROPDOWN || task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN)) {
      var {dropdownValues, isDisabled} = this.getDropdownOptions(task, attributeTypeObj);
      var selectedValue = task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN
        ? dropdownValues.filter(option => _.contains(attributeTypeObj[task.fieldId], option.get('id')))
        : attributeTypeObj[task.fieldId] ? attributeTypeObj[task.fieldId].toString() : null;

      if(selectedValue && selectedValue.size === 0 && task.fieldId !== 'studyIds' && task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE && this.props.studyIds && this.props.studyIds.length > 0) {
        selectedValue = Imm.fromJS([{id:'All',text:'All'}])
        dropdownValues = Imm.fromJS([{id:'All',text:'All'}])
      }
      if(task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE && (!this.props.studyIds || this.props.studyIds.length === 0)) {
        selectedValue = Imm.fromJS([]);
      }
      return (
        <div className="input-block">
          <div className={`task-pane-text ${this.getLabelClassName(task)} ${task.isMandatory && 'required'}`}>
            {task.fieldName}
          </div>
          {Combobox({
            // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
            // of that and not click needlessly to close the dropdown after selection.
            className: cx('dropdown', 'autoblur', {'invalid-input': !_.isEmpty(this.props.checkInvalidFieldMsg(task))}, this.getInputClassName(task)),
            value: selectedValue,
            placeholder: task.fieldName,
            valueKey: 'id',
            labelKey: 'text',
            tabSelectsValue: false,
            multi: task.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN,
            onChange: this.handleDropdownCalendarChange.bind(null, task),
            onBlur: (_e) => {
              this.props.getDependentClinicalAttributes(task)
            },
            disabled: this.props.isObserverOnly || isDisabled,
            options: dropdownValues
          })}
          <div className="text-input-error-explanation">{this.props.checkInvalidFieldMsg(task)}</div>
        </div>
      )
    }
    if (task.fieldType === taskFieldType.TEXT || task.fieldType === taskFieldType.TEXTAREA) {
      return (
        InputBlockContainer({
          title: task.fieldName,
          titleClass: cx('task-pane-text', {required: task.isMandatory}),
          inputComponent: InputWithPlaceholder({
            type: task.fieldType === taskFieldType.TEXT ? 'text' : 'textarea',
            className: cx('text-input', 'task-title', {'invalid-input': !_.isEmpty(this.props.checkInvalidFieldMsg(task))}, this.getInputClassName(task)),
            onChange: this.handleChangeField.bind(null, task),
            placeholder: task.fieldDesc,
            rows: 3,
            value: attributeTypeObj[task.fieldId],
            title: attributeTypeObj[task.fieldId],
            disabled: this.props.isObserverOnly || isDisabled,
          }),
          errorMsg: this.props.checkInvalidFieldMsg(task)
        })
      )
    }
    if (!this.state.customTriggered && task.fieldType === taskFieldType.CALENDAR) {
      let isConditionBased = false;
      let taskDateConditions;
      let value = attributeTypeObj[task.fieldId];
      if (task.attributeType === taskAttributeType.EXTENDED_TASK_ATTRIBUTE
        || task.attributeType === taskAttributeType.CLINICAL_TASK_ATTRIBUTE) {
        isConditionBased = true;
        taskDateConditions = dateConditions.filter(conditionObj => task.dateConditions.some(condition => condition === conditionObj.get('dateCondition')));
        value = attributeTypeObj[task.fieldId].dateValue;
      }
      return (
        <div className="input-block">
          <div className={`task-pane-text ${task.isMandatory && 'required'}`}>
            {task.fieldName}
          </div>
          <div className={isConditionBased ? "calendar-container" : undefined}>
            {isConditionBased
            &&
            <div className="calender-condition-wrapper">
              {Combobox({
                className: cx('dropdown', 'autoblur', 'task-type-input'),
                value: Imm.fromJS(attributeTypeObj[task.fieldId].dateCondition),
                valueKey: 'id',
                labelKey: 'text',
                multi: false,
                showTooltip: true,
                onChange: this.props.handleDateConditionChange.bind(null, task),
                disabled: this.props.isObserverOnly,
                options: taskDateConditions.map(field => ({
                  id: field.get('dateCondition'),
                  text: field.get('label'),
                  tooltipText: field.get('desc')
                }))
              })}
            </div>
            }
            {Calendar({
                className: cx('text-input', 'form-control', {'invalid-input': !_.isEmpty(this.props.checkInvalidFieldMsg(task))}, this.getInputClassName(task)),
                valueDate: value,
                minDate: task.attributeType === taskAttributeType.CORE_TASK_ATTRIBUTE ? new Date().getTime().toString() : null,  // We can't have a task that's due before today.
                onChange: this.handleDropdownCalendarChange.bind(null, task),
                onBlur: (_e) => {this.props.getDependentClinicalAttributes(task)},
                innerKey: task.fieldId,
                placeholder: task.fieldDesc,
                readOnly: this.props.isObserverOnly || !this.isTaskStateOpen(task)
              })}
          </div>
          <div className="text-input-error-explanation">{this.props.checkInvalidFieldMsg(task)}</div>
        </div>
      )
    }
    if (!this.state.customTriggered && task.fieldType === taskFieldType.RADIO) {
      return (
        <div className="task-pane-text input-block">
          {task.fieldName}
          <div className="inline right">
            {ToggleButton({
              className:this.getInputClassName(task),
              isActive: attributeTypeObj[task.fieldId],
              activeText: task.fieldId === coreDropdownFields.URGENCY ? FrontendConstants.URGENCY_ICON : FrontendConstants.CHECKMARK,
              onClick: this.props.isObserverOnly ?
                _.noop : this.handleChangeField.bind(null, task)
            })}
          </div>
        </div>
      )
    }
  }


  // Render func for Task Management Enhancements 
  render() {
    const {taskMetadata} = this.props;
    let reportId = this.props.coreTaskAttributes.reportId;
    let dashboardId = this.props.coreTaskAttributes.dashboardId;
    let datareviewId = this.props.taskExtraInformation && this.props.taskExtraInformation.datareviewId;
    let isMonitor = this.props.monitorTitle;
    
    return (
      <div className="task-pane-panel">
        <div className="task-panel">
          {
            this.props.clonedCheck ?
            <div className='input-block input-checkbox-cloned'>
              {Checkbox({
                dimmed: false,
                checkedState: this.state.clonedTriggered,
                onClick: this.props.handleClonedTask
              })}
              <div className={`task-pane-text text-cloned`}>
                Cloned from previous task
              </div>
            </div> : null
          }
          
          {taskMetadata.coreAttributes.map((attribute) => {
            return (
              <div key={attribute.fieldId}>
                {this.renderTaskFields(attribute)}
              </div>
            )
          })}
    
          {
            !this.props.customTriggered ?
            <>
              <div>
                <div className='task-pane-sub-header'>
                  {FrontendConstants.EXTENDED_ATTRIBUTES}
                  <ItemOpener isOpen={this.state.isOpenExtended} onClick={()=>{this.handleItemOpener("isOpenExtended")}} >	
                  </ItemOpener>
                </div>
                {
                  this.state.isOpenExtended ? 	
                  taskMetadata.extendedAttributes.length === 0
                    ? (<div className="no-fields-class">{FrontendConstants.THERE_ARE_NO_ATTRIBUTES('Extended')}</div>)
                    : (taskMetadata.extendedAttributes.map((attribute) => {
                      return (
                        <div key={attribute.fieldId}>
                          {this.renderTaskFields(attribute)}
                        </div>
                      )
                    })) : null}
              </div>
              {
                (reportId || dashboardId || datareviewId || isMonitor) && 
                <div>	
                  <div className='task-pane-sub-header'>	
                    {FrontendConstants.CLINICAL_ATTRIBUTES}	
                    <ItemOpener isOpen={this.state.isOpenClinical} onClick={()=>{this.handleItemOpener("isOpenClinical")}} >	
                    </ItemOpener>	
                  </div>	
                  {
                    this.state.isOpenClinical? 	
                    taskMetadata.clinicalAttributes.length === 0	
                    ? (<div className="no-fields-class">{FrontendConstants.THERE_ARE_NO_ATTRIBUTES('Clinical')}</div>)	
                      : (taskMetadata.clinicalAttributes.map((attribute) => {	
                        return (	
                          <div key={attribute.fieldId}>	
                            {this.renderTaskFields(attribute)}	
                          </div>	
                        )	
                          
                      })) : null
                  }
                </div>
              }
            </>
            : null
          }
        </div>
      </div>
    )
  }
}

module.exports = TaskInformationPanel;
export default TaskInformationPanel;
