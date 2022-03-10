var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM,{img} from 'react-dom-factories';
import { Dialog } from "primereact-opt/dialog";
import {Button} from "primereact-opt/button";
import PrimeReactDialog from '../../components/PrimeReactDialog'


var TaskActionsPanel = React.createFactory(require('./TaskActionsPanel'));
var TaskInformationPanel = React.createFactory(require('./TaskInformationPanel'));
var TaskMixin = require('./TaskMixin');
var Combobox = React.createFactory(require('../Combobox'));
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var ExposureActions = require('../../actions/ExposureActions');
import TaskManagementStore from '../../stores/TaskManagementStore';
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
import DataTypeConstants from '../../constants/DataTypeConstants';
import {taskFieldType} from '../../constants/TaskDisplayConstants';
var ModalConstants = require('../../constants/ModalConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');
const Spinner = React.createFactory(require('../Spinner'));
import StudiesUtil from '../../util/StudiesUtil';
var AccountUtil = require('../../util/AccountUtil');
import PermissionsUtil from '../../util/PermissionsUtil';
import {FeatureListConstants, AccessPermissionsConstants} from '../../constants/PermissionsConstants';
import { getObject, setObject } from '../../util/SessionStorage';

const newImmStore = TaskManagementStore.getStore();
var br = DOM.br,
  div = React.createFactory(require('../TouchComponents').TouchDiv),
  li = DOM.li,
  span = React.createFactory(require('../TouchComponents').TouchSpan),
  ul = DOM.ul,
  a = DOM.a;

var ViewTask = createReactClass({
  displayName: 'ViewTask',

  mixins: [TaskMixin],

  propTypes: {
    currentUserId: PropTypes.string.isRequired,
    currentTaskId: PropTypes.string.isRequired,
    handleToggleTasksPane: PropTypes.func.isRequired,
    immFileConfigs: PropTypes.instanceOf(Imm.Map).isRequired,
    immTaskSummaries: PropTypes.instanceOf(Imm.Map).isRequired,
    immTaskWrappers: PropTypes.instanceOf(Imm.Map).isRequired,
    immUsers: PropTypes.instanceOf(Imm.Map).isRequired,
    isUnsavedWarningDisplayed: PropTypes.bool.isRequired,
    isLoading: PropTypes.bool,
    currentFileId: PropTypes.string,
    setTaskFilters: PropTypes.func,
    applyTaskFilters: PropTypes.func
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function () {
    return {
      allHistoryDisplayed: false,
      isCommentsOpen: true,
      isOverviewOpen: true,
      forceUpdate: false,
      width: 0,
      initialLoad: true,        // Used to flag that this is the initial load of the component. Used to ensure we fire events as expected
      isLoadedTaskFilters: false,
      submitTriggered: false,
      sspreview:false,
      showViewTaskPanel: true,
      workingTaskMetadata: this.props.immTaskWrappers && this.props.immTaskWrappers.get(this.props.currentTaskId),
      liveReportClicked : false
    };
  },

  componentDidMount: function () {
    const taskId = this.props.currentTaskId;

    GA.sendDocumentOpen(taskId, GA.DOCUMENT_TYPE.TASK);
    if (taskId && !this.props.isLoading) {
      ExposureActions.fetchTask(taskId, this.props.isViewOnlyTask);
    }

    // Clear the initial load flag after finishing the first render
    this.setState({
      initialLoad: false
    });
  },

  componentWillReceiveProps: function (nextProps) {
    var nextTaskId = nextProps.currentTaskId;
    if (nextTaskId && this.props.currentTaskId !== nextTaskId) {
      ExposureActions.fetchTask(nextTaskId, this.props.isViewOnlyTask);
    }
    // If we have switched tasks, reset the validation state. We cannot simply compare
    // task ids because it is possible the task data has not been fetched yet.
    var immCurrentLoadedTaskWrapper = this.props.immTaskWrappers.get(this.props.currentTaskId);
    var immNextLoadedTaskWrapper = nextProps.immTaskWrappers.get(nextProps.currentTaskId);
    if ((!Imm.is(immCurrentLoadedTaskWrapper, immNextLoadedTaskWrapper) || (immCurrentLoadedTaskWrapper !== immNextLoadedTaskWrapper))) {
      this.getTaskMetadata(immNextLoadedTaskWrapper)
    }
  },

  componentWillUpdate: function (nextProps) {
    let setTaskFilters = nextProps.setTaskFilters;
    let applyTaskFilters = nextProps.applyTaskFilters;
    let fileId = nextProps.immExposureStore.getIn(['tasks', nextProps.currentTaskId, 'task', 'taskExtraInformation', 'datareviewId'])
    let medTaskFilters = nextProps.immExposureStore.getIn(['files', fileId, 'immMedTaskFilters']);
    if (!this.state.isLoadedTaskFilters && medTaskFilters && typeof medTaskFilters === 'string') {
      this.setState({
        isLoadedTaskFilters: true
      });
      applyTaskFilters(setTaskFilters(JSON.parse(medTaskFilters)));
    }
  },

  //Get the required value format that needs to be passed to fetch column-data API
  fetchClinicalValue: function (attribute, taskMetadata) {
    let selectedValue = {};
    const dateConditions = newImmStore.get('dateConditions')
    if(attribute.fieldType === taskFieldType.MULTI_SELECT_DROPDOWN) {
      selectedValue.value = taskMetadata.getIn(['task','clinicalTaskAttribute',attribute.fieldId], Imm.List()).toJS();
      selectedValue.operator = "="
    } else if (attribute.fieldType === taskFieldType.CALENDAR) {
      const selectedAttributeValue = taskMetadata.getIn(['task','clinicalTaskAttribute',attribute.fieldId], Imm.List()).toJS()
      let dateValue = Util.dateFormatterUTC(selectedAttributeValue.dateValue);
      let dateConditionValue = dateConditions.find(conditionObj => conditionObj.get('dateCondition') === selectedAttributeValue.dateCondition).get('label');
      selectedValue.value = [dateValue];
      selectedValue.operator = dateConditionValue
    } else {
      selectedValue.value = [taskMetadata.getIn(['task','clinicalTaskAttribute',attribute.fieldId])];
      selectedValue.operator = "="
    }
    return selectedValue;
  },

  getTaskMetadata: function (taskMetadata) {
    if(!taskMetadata) return; 
    let taskExtendedAttributes = {};
    let taskClinicalAttributes = {}
    let taskAttributes = {}
    let immLoadedTaskWrapper = taskMetadata.get('task');
    if(!taskMetadata.get('taskConfig')) return;
    let taskConfig = taskMetadata.get('taskConfig').toJS();
    let isMonitor = immLoadedTaskWrapper.get('monitorTitle');
    immLoadedTaskWrapper.get('extendedDynamicTaskAttributes', Imm.List()).map(function (attribute) {
      const isMultiSelect = Util.attributeIsMultiSelect(taskMetadata, attribute.get('attributeName'), 'extendedAttributes')
      const attributeValue = isMultiSelect ? attribute.get('attributeValue') : attribute.getIn(['attributeValue', 0])
      const isJSON = Util.checkIfJSON(attributeValue);
      taskExtendedAttributes[attribute.get('attributeName')] = isJSON ? JSON.parse(attributeValue) : attributeValue;
    })

    immLoadedTaskWrapper.get('clinicalTaskAttribute', Imm.List()).map(function (attribute) {
      const isMultiSelect = Util.attributeIsMultiSelect(taskMetadata, attribute.get('attributeName'), 'clinicalAttributes')
      const attributeValue = isMultiSelect ? attribute.get('attributeValues') : attribute.getIn(['attributeValues', 0])
      const isJSON = Util.checkIfJSON(attributeValue);
      taskClinicalAttributes[attribute.get('attributeName')] = isJSON ? JSON.parse(attributeValue) : attributeValue;
    })
    taskMetadata = taskMetadata.setIn(['task', 'extendedDynamicTaskAttributes'], Imm.fromJS(taskExtendedAttributes))
    taskMetadata = taskMetadata.setIn(['task', 'clinicalTaskAttribute'], Imm.fromJS(taskClinicalAttributes));
    
    const fieldId = taskMetadata.getIn(['task', 'coreTaskAttributes', 'reportId']) || taskMetadata.getIn(['task', 'coreTaskAttributes', 'dashboardId']);
    Object.entries(taskConfig.taskAttributes).map(([attributeType, attributeList]) => {
      if ((fieldId || isMonitor) && (attributeType === 'clinicalAttributes' || attributeType === 'extendedAttributes')) {
        if(!isMonitor){
          attributeList = attributeList.filter(attribute => attribute.associatedAnalyticsAndDashboard.some(list => list.id === 'select_all' || list.id === fieldId))
        }
        attributeList = attributeList.map(attribute => {
           if(attribute.clinicalDbDetail && attribute.clinicalDbDetail.column) {
            if(!attribute.clinicalDbDetail.column.includes(".")){
              //This condition to be rectify later
              attribute.clinicalDbDetail.column = `${attribute.clinicalDbDetail.datasource}.${attribute.clinicalDbDetail.table}.${attribute.clinicalDbDetail.column}`;
            }
            let selectedValue = this.fetchClinicalValue(attribute, taskMetadata)
            attribute.clinicalDbDetail.values = selectedValue.value;
            attribute.clinicalDbDetail.operator = selectedValue.operator; 
            attribute.clinicalDbDetail.dependOnAttributes.map(dependedAttribute => {
              const dependentObject = taskConfig.taskAttributes.clinicalAttributes.find(attribute => attribute.clinicalDbDetail.column === dependedAttribute.name);
              let selectedValue = this.fetchClinicalValue(dependentObject, taskMetadata);
              dependedAttribute.values = selectedValue.value;
              dependedAttribute.operator = selectedValue.operator;
            })
          }
          return attribute
        })
      }
      taskAttributes[attributeType] = attributeList;
    })
    taskConfig.taskAttributes = taskAttributes;
    
    this.setState({
      workingTaskMetadata: taskMetadata,
      baseTaskMetadata: taskMetadata,
      taskConfig: Imm.fromJS(taskConfig)
    });
  },

  componentWillUnmount: function () {
    let fileId = this.props.immExposureStore.getIn(['tasks', this.props.currentTaskId, 'task', 'taskExtraInformation', 'datareviewId'])
    ExposureActions.clearDataTaskFilters(fileId);
    ExposureActions.clearFileTaskFiltersSCCS(this.props.currentFileId);
    ExposureActions.setIsViewTasks(false);
  },

  handleNewComment: function (e) {
    this.handleInputChange({attributeType: 'newComment'}, e.target.value);
  },

  handleOverviewItemOpener: function () {
    this.setState({isOverviewOpen: !this.state.isOverviewOpen});
  },

  handleCommentsItemOpener: function () {
    this.setState({isCommentsOpen: !this.state.isCommentsOpen});
  },

  toggleAllComments: function () {
    this.setState({allHistoryDisplayed: !this.state.allHistoryDisplayed});
  },

  isDirty: function () {
    return !Imm.is(this.state.baseTaskMetadata, this.state.workingTaskMetadata);
  },

  unsavedWorkModalCopy() {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_TASK,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
    };
  },

  transitionToCollaboration(){
    ExposureActions.setTaskShowHideDetail(false)
    const collabNav = JSON.parse(getObject('collaboration-navigation'))
    if(this.props.isViewOnlyTask) {
      ExposureActions.setLoadingCollaboration(true)
      this.setState({ showViewTaskPanel: false });
      ExposureActions.fetchTasksApplicationsCount(collabNav);
      ExposureActions.fetchTasksWithParameters(true, collabNav);
      ExposureActions.fetchClosedTasksWithParameters(true, collabNav);
    }else{
      this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS });
    }
  },

  handleUpdateTask: function () {
    var wasObserverOnly = this.isObserverOnly(this.props.currentUserId, this.props.immTaskWrappers.getIn([this.props.currentTaskId, 'task']));
    if (this.userCantAccessTask(this.props.currentUserId, this.state.workingTaskMetadata.get('task'))) {
      ExposureActions.displayModal(ModalConstants.MODAL_DIALOG_WITH_LIST, {
        header: FrontendConstants.ARE_YOU_SURE,
        content: FrontendConstants.NO_LONGER_FOLLOW_TASK,
        handleCancel: ExposureActions.closeModal,
        primaryButton: {
          text: FrontendConstants.CONFIRM,
          icon: 'icon-checkmark-full',
          onClick: function () {
            ExposureActions.closeModal();
            const result = this.formatTask(this.state.workingTaskMetadata);
            ExposureActions.taskViewUpdateTask(result, wasObserverOnly, this.transitionToCollaboration);
          }.bind(this)
        },
        secondaryButton: {
          text: FrontendConstants.CANCEL,
          onClick: ExposureActions.closeModal
        }
      });
    } else {
      this.setState({submitTriggered: true});
      if (!this.handleFormValidations()) {
        const result = this.formatTask(this.state.workingTaskMetadata);
        ExposureActions.taskViewUpdateTask(result, wasObserverOnly, this.transitionToCollaboration);
      }
    }
  },

  isSubmittable: function () {
    var immLoadedTask = this.props.immTaskWrappers.getIn([this.props.currentTaskId, 'task']);
    var immWorkingTask = this.state.workingTaskMetadata.get('task');

    // `this.state` is updated on keystrokes, while `immWorkingTask` is updated on blur. Therefore,
    // `this.state` contains the same values as `immWorkingTask`, or more up-to-date values.
    // To check for changes, we check the state against `immLoadedTask`.
    var taskValid = true;
    taskValid = taskValid && !Util.isWhiteSpaceOnly(immWorkingTask.get('title'));
    taskValid = taskValid && !Util.isWhiteSpaceOnly(immWorkingTask.get('description'));
    taskValid = taskValid && (Util.validFutureEpochString(immWorkingTask.get('dueDate')) || immWorkingTask.get('dueDate') === immLoadedTask.get('dueDate'));
    taskValid = taskValid && !immWorkingTask.get('assigneeIds', Imm.Set()).isEmpty();
    taskValid = taskValid && immWorkingTask.getIn(['extendedTaskAttributes', 'taskTypeId']);
    taskValid = taskValid && immWorkingTask.getIn(['extendedTaskAttributes', 'taskStateId']);

    var taskChanged = immWorkingTask.get('title') !== immLoadedTask.get('title');
    taskChanged = taskChanged || (immWorkingTask.get('description') !== immLoadedTask.get('description'));
    taskChanged = taskChanged || (immWorkingTask.get('dueDate') !== immLoadedTask.get('dueDate'));
    taskChanged = taskChanged || this.state.workingTaskMetadata.has('newComment');
    taskChanged = taskChanged || (immWorkingTask.get('urgency') !== immLoadedTask.get('urgency'));
    taskChanged = taskChanged || !Imm.is(immWorkingTask.get('assigneeIds'), immLoadedTask.get('assigneeIds'));
    taskChanged = taskChanged || !Imm.is(immWorkingTask.get('observerIds'), immLoadedTask.get('observerIds'));
    taskChanged = taskChanged || !Imm.is(immWorkingTask.get('extendedTaskAttributes'), immLoadedTask.get('extendedTaskAttributes'));
    return taskValid && taskChanged;
  },

  getUserNameString: function (userId) {
    if (!userId) {
      return null;
    }
    return Util.getUserOrTeamNameFromId(this.props.immUsers, this.props.immGroupEntities, userId);
  },

  computeAuditDiffs: function () {
    var immLoadedTaskWrapper = this.props.immTaskWrappers.get(this.props.currentTaskId);

    var immCommentsLog = immLoadedTaskWrapper.get('comments', Imm.List()).map(function (immComment) {
      return Imm.Map({
        actionAt: immComment.get('createdAt'),
        actionBy: immComment.get('userId'),
        type: 'comment',
        comment: immComment.get('comment')
      });
    }).toList();

    var immAuditLog = immLoadedTaskWrapper.get('taskHistory', Imm.List()).sortBy(function (immTaskAud) {
      return parseInt(immTaskAud.getIn(['auditAction', 'actionAt']), 10);
    }).reduce(function (immMemo, immTaskAud) {
      var immAuditAction = immTaskAud.get('auditAction');
      var immTask = immTaskAud.get('task');
      var immLastTask = immMemo.getIn(['lastEntry', 'task'], Imm.Map());
      var immBaseDiff = Imm.Map({
        actionAt: immAuditAction.get('actionAt'),
        actionBy: immAuditAction.get('actionBy')
      });
      // Note: The order of the immPaths is important.
      // It'd affect the order the history will be display and also vary by the logic in renderTaskDiffs.
      var immPaths = Imm.fromJS([
        ['coreTaskAttributes', 'urgency'],
        ['coreTaskAttributes', 'priority'],
        ['coreTaskAttributes', 'isNotificationRequired'],
        ['coreTaskAttributes', 'taskState'],
        ['coreTaskAttributes', 'assigneeIds'],
        ['coreTaskAttributes', 'description'],
        ['coreTaskAttributes', 'title'],
        ['coreTaskAttributes', 'dueDate'],
        ['coreTaskAttributes', 'taskTypeId'],
        ['coreTaskAttributes', 'taskStateId'],
        ['coreTaskAttributes', 'actionTypeId'],
        ['extendedTaskAttributes', 'extraStudyInformation', 'studyNames'],
        ['extendedTaskAttributes', 'studyIds'],
        ['extendedTaskAttributes', 'siteCountries'],
        ['extendedTaskAttributes', 'siteNames']]);
      var immDiffList = immPaths.reduce(function (immDiffList, immPath) {
        if (!Imm.is(immTask.getIn(immPath), immLastTask.getIn(immPath))) {
          var type = immPath.last();
          var newDiff = {
            type: type,
            old: immLastTask.getIn(immPath),
            new: immTask.getIn(immPath)
          };
          // taskStateId and actionTypeId depends on taskTypeId so we need to populate them here
          // so that renderTaskDiffs have access to taskTypeId.
          if (_.contains(['taskStateId', 'actionTypeId'], type)) {
            var taskTypeIdPath = ['coreTaskAttributes', 'taskTypeId'];
            newDiff.oldTaskTypeId = immLastTask.getIn(taskTypeIdPath);
            newDiff.newTaskTypeId = immTask.getIn(taskTypeIdPath);
          }
          var diff = immBaseDiff.merge(newDiff);
          return immDiffList.push(diff);
        }
        return immDiffList;
      }, immMemo.get('diffList'));
      return Imm.Map({ diffList: immDiffList, lastEntry: immTaskAud });
    }, Imm.Map({ diffList: Imm.List(), lastEntry: Imm.Map() })).get('diffList');

    var immObserversLog = immLoadedTaskWrapper.get('observerHistory', Imm.List()).map(function (immObserver) {
      var immAuditAction = immObserver.get('auditAction');
      var type = immAuditAction.get('actionType') === 'DELETE' ? 'observer_remove' : 'observer_assign';
      return Imm.Map({
        actionAt: immAuditAction.get('actionAt'),
        actionBy: immAuditAction.get('actionBy'),
        type: type,
        userId: immObserver.get('taskObserver').get('userId')
      });
    });

    var immAssigneesLog = immLoadedTaskWrapper.get('assigneeHistory', Imm.List()).map(function (immAssignee) {
      var immAuditAction = immAssignee.get('auditAction');
      var type = immAuditAction.get('actionType') === 'DELETE' ? 'assignee_remove' : 'assignee_assign';
      return Imm.Map({
        actionAt: immAuditAction.get('actionAt'),
        actionBy: immAuditAction.get('actionBy'),
        type: type,
        userOrTeamId: immAssignee.get('taskAssignee').get('userOrTeamId')
      });
    });

    return immCommentsLog.concat(immAuditLog, immObserversLog, immAssigneesLog);
  },

  getActualSiteNames: function (list) {
    // Old tasks can contain siteId in siteName json field
    const newSitesFromDropdown = list
      .map(siteId => this.getCDMDropdownName('site', siteId)).join(', ');
    // if content is not mapping ... it mean it is just siteNames
    return newSitesFromDropdown || list.join(', ');
  },

  renderTaskDiffs: function (immLogs) {
    var immUsers = this.props.immUsers;
    return immLogs.groupBy(function (immEntry) {
      return immEntry.get('actionAt');
    }).sortBy(
      function (immLogGroup, timestamp) {
        return parseInt(timestamp, 10);
      },
      function (timestamp1, timestamp2) {
        // Note: sortBy expects numeric output - most browsers will handle boolean
        // `timestamp1 < timestamp` the same as `timestamp2 - timestamp1`, however Safari
        // does not:
        // ref: http://stackoverflow.com/questions/15507729/safari-doesnt-sort-array-of-objects-like-others-browsers
        // also: http://jsfiddle.net/fg524gkx/
        return timestamp2 - timestamp1;
      }
    ).map(function (immChanges, timestamp) {
      var assigneesAdded = [];
      var assigneesRemoved = [];
      var observersAdded = [];
      var observersRemoved = [];

      var contents = immChanges.map(function (immChange) {
        var content = null;
        switch (immChange.get('type')) {
          case 'comment':
            content = 'Comment has been added: ' + immChange.get('comment') + '.';
            break;
          case 'observer_assign':
            observersAdded.push(this.getUserNameString(immChange.get('userId')));
            break;
          case 'observer_remove':
            observersRemoved.push(this.getUserNameString(immChange.get('userId')));
            break;
          case 'assignee_assign':
            assigneesAdded.push(this.getUserNameString(immChange.get('userOrTeamId')));
            break;
          case 'assignee_remove':
            assigneesRemoved.push(this.getUserNameString(immChange.get('userOrTeamId')));
            break;
          case 'urgency':
            if (immChange.get('new')) {
              content = 'The task has been marked Urgent.';
            } else {
              content = 'The task has been marked Not Urgent.';
            }
            break;
          case 'priority':  // This is to handle legacy tasks that were created before extended task attributes.
            if (!immChange.get('old')) {
              content = 'Priority set to ' + immChange.get('new') + '.';
            } else {
              content = 'Priority changed from ' + immChange.get('old') + ' to ' + immChange.get('new') + '.';
            }
            break;
          case 'isNotificationRequired':
            if (immChange.get('new')) {
              content = 'The email notification is turned On.';
            } else {
              content = 'The email notification is turned Off.';
            }
            break;
          case 'studyNames':
            if (!immChange.get('old')) {
              // Work around when no study ids has been set, it'd still be save as an empty list.
              if (!immChange.get('new').isEmpty()) {
                const newStudies = immChange.get('new', Imm.List()).join(', ');
                content = 'Studies set to ' + newStudies + '.';
              }
            } else {
              const newStudies = immChange.get('new', Imm.List()).join(', ');
              const oldStudies = immChange.get('old', Imm.List()).join(', ');
              content = 'Studies changed from ' + oldStudies + ' to ' + newStudies + '.';
            }
            break;
          case 'siteCountries':
            if (!immChange.get('old')) {
              // Work around when no countries has been set, it'd still be save as an empty list.
              if (!immChange.get('new').isEmpty()) {
                content = 'Countries set to ' + immChange.get('new').join(', ') + '.';
              }
            } else {
              content = 'Countries changed from ' + immChange.get('old').join(', ') + ' to ' + immChange.get('new').join(', ') + '.';
            }
            break;
          case 'siteNames':
            if (!immChange.get('old')) {
              // Work around when no sites has been set, it'd still be save as an empty list.
              if (!immChange.get('new').isEmpty()) {
                const newSites = immChange.get('new', Imm.List())
                content = 'Sites set to ' + this.getActualSiteNames(newSites) + '.';
              }
            } else {
              const newSites = immChange.get('new', Imm.List());
              const oldSites = immChange.get('old', Imm.List());
              content = 'Sites changed from '
                + this.getActualSiteNames(oldSites)
                + ' to ' + this.getActualSiteNames(newSites) + '.';
            }
            break;
          case 'taskState':  // This is to handle legacy tasks that were created before extended task attributes.
            if (!immChange.get('old')) {
              content = 'Status set to ' + immChange.get('new') + '.';
            } else {
              content = 'Status changed from ' + immChange.get('old') + ' to ' + immChange.get('new') + '.';
            }
            break;
          case 'taskTypeId':
            var newTaskStateName = this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('new'), 'name']);
            if (!immChange.get('old')) {
              content = 'Task type set to ' + newTaskStateName + '.';
            } else {
              content = 'Task type changed from ' + this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('old'), 'name']) + ' to ' + newTaskStateName + '.';
            }
            break;
          case 'taskStateId':
            var newTaskState = this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('newTaskTypeId'), 'taskStates', immChange.get('new')]);
            if (!immChange.get('old')) {
              content = 'Task state set to ' + newTaskState + '.';
            } else {
              content = 'Task state changed from ' + this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('oldTaskTypeId'), 'taskStates', immChange.get('old')]) + ' to ' + newTaskState + '.';
            }
            break;
          case 'actionTypeId':
            var newActionType = this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('newTaskTypeId'), 'actionTypes', immChange.get('new')]);
            if (!immChange.get('old')) {
              content = 'Action set to ' + newActionType + '.';
            } else {
              content = 'Action changed from ' + this.props.immExposureStore.getIn(['taskStateNameMap', immChange.get('oldTaskTypeId'), 'actionTypes', immChange.get('old')]) + ' to ' + newActionType + '.';
            }
            break;
          case 'title':
            if (!immChange.get('old')) {
              content = 'Title has been set to ' + immChange.get('new') + '.';
            } else {
              content = 'Title has been changed from ' + immChange.get('old') + ' to ' + immChange.get('new') + '.';
            }
            break;
          case 'description':
            content = 'Description has been updated.';
            break;
          case 'dueDate':
            var newDueDate = Util.dateFormatterDMMMYYUTC(immChange.get('new'));
            if (!immChange.get('old')) {
              content = 'Due date has been set to ' + newDueDate + '.';
            } else {
              content = 'Due date has been changed from ' + Util.dateFormatterDMMMYYUTC(immChange.get('old')) + ' to ' + newDueDate + '.';
            }
            break;
        }
        return content;
      }, this).filter(function (value) {
        // Filter out null values created in observer cases above.
        return value;
      }).toJS();

      var observersAddedSize = _.size(observersAdded);
      if (observersAddedSize === 1) {
        contents.push(observersAdded[0] + ' has been added as an Observer.');
      } else if (observersAddedSize > 1) {
        contents.push(observersAdded.join(', ') + ' have been added as Observers.');
      }

      var observersRemovedSize = _.size(observersRemoved);
      if (observersRemovedSize === 1) {
        contents.push(observersRemoved[0] + ' has been removed as an Observer.');
      } else if (observersRemovedSize > 1) {
        contents.push(observersRemoved.join(', ') + ' have been removed as Observers.');
      }

      var assigneesAddedSize = _.size(assigneesAdded);
      if (assigneesAddedSize === 1) {
        contents.push(assigneesAdded[0] + ' has been added as an Assignee.');
      } else if (assigneesAddedSize > 1) {
        contents.push(assigneesAdded.join(', ') + ' have been added as Assignees.');
      }

      var assigneesRemovedSize = _.size(assigneesRemoved);
      if (assigneesRemovedSize === 1) {
        contents.push(assigneesRemoved[0] + ' has been removed as an Assignee.');
      } else if (assigneesRemovedSize > 1) {
        contents.push(assigneesRemoved.join(', ') + ' have been removed as Assignees.');
      }

      return {
        userFirstName: immUsers.getIn([immChanges.getIn([0, 'actionBy']), 'firstName']),
        userLastName: immUsers.getIn([immChanges.getIn([0, 'actionBy']), 'lastName']),
        monitorTitle: this.props.immTaskWrappers.getIn([this.props.currentTaskId, 'task', 'monitorTitle']),
        timestamp: Util.dateTimeFormatterUTC(timestamp, true),
        contents: _.map(contents, function (text, idx) {
          return span({key: idx}, text);
        })
      };
    }, this).toList();
  },

  

  //Added this section to show created by, created at and updated at inside the Comments and History section
  taskCreatedUpdatedDetails: function () {
    const immLoadedTask = this.props.immTaskWrappers.getIn([this.props.currentTaskId, 'task', 'coreTaskAttributes']);
    return (
      <div className='task-create-update-details'>
        <div className='task-pane-text author'>
          Created by: <span className='inline'>
            {this.props.immUsers.getIn([immLoadedTask.get('authorId'), 'fullName'] , this.props.immTaskWrappers.getIn([this.props.currentTaskId, 'task','monitorTitle']))}
          </span>
        </div>
        <div className='task-pane-text created-at'>
          Created: <span className='inline'>{Util.dateTimeFormatterUTC(immLoadedTask.get('createdAt'), true)}</span>
        </div>{
          (immLoadedTask.get('createdAt') === immLoadedTask.get('updatedAt')) ? null :
            <div className='task-pane-text updated-at'>
              Updated: <span className='inline'>{Util.dateTimeFormatterUTC(immLoadedTask.get('updatedAt'), true)}</span>
            </div>
        }
      </div>
    )
  },

  openDialogbox(ssPreview) {
    this.setState({ [ssPreview]: !this.state[ssPreview] });
  },

  closeViewtask() {
    if (this.props.isViewOnlyTask) {
      if (!this.isDirty()) {
        this.setState({ showViewTaskPanel: false });
        ExposureActions.setTaskShowHideDetail(false)
      } else {
        this.setState({ liveReportClicked: true }, () => {
          ExposureActions.displayUnsavedWorkModal(
            FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED,
            FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
            (isDiscard) => {
              if (isDiscard !== false) {
                this.setState({ showViewTaskPanel: false });
                ExposureActions.setTaskShowHideDetail(false)
              }
            }
          );
        });
      }
    }
    else {
      this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS });
      ExposureActions.setTaskShowHideDetail(false)
    }
  },

 viewSelectedtask (taskId) {
  if (!this.isDirty()) {
    this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS_SHOW,  params : {taskId: taskId} });
   } else {
    this.setState({liveReportClicked:true}, ()=>{
      ExposureActions.displayUnsavedWorkModal(
        FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED,
        FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
        (isDiscard) => {
          if (isDiscard !== false) {
            this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS_SHOW,  params : {taskId: taskId} });
          }else{
            this.setState({liveReportClicked:false});
          }
        }
      );
    } );
   }
  },

  goToColl(){
    this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS});
    ExposureActions.setTaskShowHideDetail(false)
  },

  /**
   * Checks whether the component is ready to render. First time through we should only render the placeholder while we verify
   * that we have everything we need.
   * @returns {boolean} - Whether the component is ready to render
   */
  isReady: function () {
    return !this.props.isLoading && this.props.immTaskWrappers && !this.state.initialLoad;
  },

  render: function () {
    var titleComponent = div({ className: 'section-title' },
    span({ className: 'title-text' }, FrontendConstants.TASK_DETAILS
    ))
    let dialogContentSpinner;
    const primeReactDialogStyleObj = { width: '25%', height: 'calc(100vh - 7.5rem)', top: '5.5rem',margin:'0'};
    dialogContentSpinner = div({ style: { height: "35rem", } },
      Spinner());
    if (!this.isReady()) {
      return PrimeReactDialog({
        header: titleComponent,
        id: "task-container",
        className: 'exposure',
        position: 'top-right',
        visible: this.state.showViewTaskPanel,
        resizable: false,
        dialogContent: dialogContentSpinner,
        modal: false,
        style: primeReactDialogStyleObj,
        onClosetask: this.closeViewtask,
        Closable: false,
      })
    }

    const isMobile = Util.isMobile();
    var titleComponent = div({ className: 'section-title' },
      span({ className: 'title-text' }, FrontendConstants.TASK_DETAILS
      ),
      this.props.isViewOnlyTask ? div({ className: 'live-report', onClick: () => { this.viewSelectedtask(this.props.currentTaskId) } }, FrontendConstants.LIVE_REPORT,
       ) 
        : 
        div({ className: 'live-report', onClick: () => { this.goToColl(this.props.currentTaskId) } }, FrontendConstants.GO_TO_COLLABORATION,
       ),
      isMobile ? div({ className: 'close-button', onClick: this.props.handleToggleTasksPane }) : null);

    var currentTaskId = this.props.currentTaskId;
    let dialogContentError;
    dialogContentError = div({ className: 'task-pane view-task', ref: 'pane' },
      div({ className: 'task-error' },
        span({ className: 'icon-WarningCircle' }),
        span({ className: 'error-text' }, FrontendConstants.TASK_404_ERROR)),
        div({ className: 'align-right-buttons' },
        <Button
          className="p-button-outlined update-button btn btn-secondary" 
          tabindex="0"
          label= {FrontendConstants.CANCEL}
          onClick= {this.closeViewtask}
        />
      )
    );
    if (this.props.immTaskWrappers.getIn([currentTaskId, 'taskRequestRejectedWith404'])) {
      return PrimeReactDialog({
        header: titleComponent,
        id: "task-container",
        className: 'exposure',
        position: 'top-right',
        visible: this.state.showViewTaskPanel,
        resizable: false,
        dialogContent: dialogContentError,
        modal: false,
        style: primeReactDialogStyleObj,
        onClosetask: this.closeViewtask,
        Closable: false,
      })

    } else if (!this.props.immTaskWrappers.hasIn([currentTaskId, 'task'])) {
      return PrimeReactDialog({
        header: titleComponent,
        id: "task-container",
        className: 'exposure',
        position: 'top-right',
        visible: this.state.showViewTaskPanel,
        resizable: false,
        dialogContent: dialogContentSpinner,
        modal: false,
        style: primeReactDialogStyleObj,
        onClosetask: this.closeViewtask,
        Closable: false,
      })
    }
    var immLoadedTask = this.props.immTaskWrappers.getIn([currentTaskId, 'task']);
    var wasObserverOnly = this.isObserverOnly(this.props.currentUserId, immLoadedTask);
    var urgencyText = !immLoadedTask.getIn(['coreTaskAttributes', 'urgency']) ? null :
      div({key: 'urgency-text'},
        div({className: 'task-pane-text'},
          FrontendConstants.URGENCY,
          div({ className: 'inline' }, span({ className: 'is-urgent' }, '!'), `(${FrontendConstants.URGENT})`)),
        br());

    var immDiffs = this.renderTaskDiffs(this.computeAuditDiffs());
    var immDisplayedDiffs = this.state.allHistoryDisplayed ? immDiffs : immDiffs.take(3);
    var immRenderedHistory = immDisplayedDiffs.map(function (entry, index) {
      return div({key: 'task-history-' + index, className: 'history'},
        entry.userFirstName && entry.userLastName
          ? (
            div({className: 'title'},
              span({className: 'icon-user'}),
              `${entry.userLastName} ${entry.userFirstName}`,
              ' - ',
              entry.timestamp)
          )
          : (
            div({className: 'title'},
              span({className: 'icon-alarm-check'}),
              entry.monitorTitle,
              ' - ',
              entry.timestamp
            )),
        ul({className: 'audit-list'},
          _.map(entry.contents, function (content, idx) {
            return li({className: 'text', key: idx}, content);
          })
        )
      );
    });
    if (immDiffs.size > 3) {
      var button =  <Button
        label={this.state.allHistoryDisplayed ? FrontendConstants.VIEW_LESS : FrontendConstants.VIEW_MORE}
        className="p-button-outlined update-button btn btn-secondary" 
        onClick={ this.toggleAllComments}
      />;
      immRenderedHistory = immRenderedHistory.push(button);
    }
    if (this.state.taskConfig && this.state.taskConfig.get('taskAttributes')) {
      var informationPanelWorkingTaskProps = this.getTaskAttributes(this.state.workingTaskMetadata.get('task'), {
        isAuthor: this.props.currentUserId === immLoadedTask.get('authorId'),
        isObserverOnly: wasObserverOnly,
        isViewMode: true,
        taskMetadata: this.state.taskConfig.get('taskAttributes').toJS(),
      });
      informationPanelWorkingTaskProps.originalDueDate = immLoadedTask.get('dueDate');
      informationPanelWorkingTaskProps.studyIds = informationPanelWorkingTaskProps?.clinicalTaskAttribute?.studyIds || [];
      if(informationPanelWorkingTaskProps.studyIds.length){
        const immStudies = StudiesUtil.getImmStudies(this.props.immExposureStore).toJS();
        informationPanelWorkingTaskProps.studyIds = informationPanelWorkingTaskProps.studyIds.map((studyId) => {
          let resStudy = immStudies.filter(study => study.value === studyId);
          if(resStudy && resStudy.length > 0) {
            return resStudy[0].label;
          } else {
            return null;
          }
        }).filter(x => x);
      }
    }
    const isReadOnlyPerson = this.isReadOnly(this.props.currentUserId, immLoadedTask) 
    var userHasCreateTask = AccountUtil.hasPrivilege(this.props.immExposureStore, 'isCreateTask')
    && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT);
    let snapImg = this.props.immExposureStore.get('mediaUrl')
    let dialogboxpreview;
    dialogboxpreview = (
      <Dialog
        resizable={false}
        header={FrontendConstants.TASK_TITLE +": "+ this.state.workingTaskMetadata.get('task').toJS().coreTaskAttributes.title}
        visible={this.state.sspreview}
        onHide={() => this.openDialogbox("sspreview")}
        data-keyboard="false"
        data-backdrop="static"
        className='snapshot-Dialog preview-screenshot-popup'
      >
        <div>
          <img className="img-preview" src={"data:image/png;base64," + snapImg} />
        </div>
      </Dialog>
    );
    let dialogContent;
    dialogContent = div({ className: 'task-pane view-task', ref: 'pane' },
    div({className:'task-referance-id'},div({},FrontendConstants.TASK,": " ), div({className: 'task-referance-value'},this.state.workingTaskMetadata.getIn(['task', 'taskRefrenceId'])), ),
      this.state.taskConfig && TaskInformationPanel(informationPanelWorkingTaskProps),
      snapImg ? div({}, div({ className: "task-pane-sub-header" },
        FrontendConstants.SNAPSHOT),
        div(
          {},
          img({
            className: 'snapshot-view', src: "data:image/png;base64," + snapImg,
            title: FrontendConstants.SNAPSHOT,
            onClick: () => { this.openDialogbox("sspreview") }
          }),
        ), dialogboxpreview,
      ) : null,
      div({ className: 'task-pane-panel' },
        div({ className: 'task-pane-sub-header' },
          span(null, FrontendConstants.COMMENTS_AND_HISTORY),
          ItemOpener({ isOpen: this.state.isCommentsOpen, onClick: this.handleCommentsItemOpener })),
        !this.state.isCommentsOpen ? null : [
          isReadOnlyPerson ? null : InputWithPlaceholder({
            type: 'textarea',
            key: 'task-comment',
            className: 'textarea task-comment input-block',
            onChange: this.handleNewComment,
            rows: 6,
            value: this.state.workingTaskMetadata.getIn(['newComment', 'comment'], ''),
            placeholder: FrontendConstants.ADD_A_COMMENT
          }),
          <div className={`task-history-details ${isReadOnlyPerson ? 'margin-top-history' : ''}`}>
            {this.taskCreatedUpdatedDetails()}
          </div>,
          div({ key: 'task-history', className: 'comments' }, immRenderedHistory)
        ]),
      div({ className: 'align-right-buttons' },
        <Button
          className="update-button btn btn-secondary" 
          label= {FrontendConstants.CANCEL}
          onClick= {this.closeViewtask}
        />, !isReadOnlyPerson && userHasCreateTask ? <Button
          className="update-button btn btn-primary"
          label= {FrontendConstants.UPDATE}
          onClick= {this.handleUpdateTask}
        /> : null
      )
    );
   return PrimeReactDialog({
      header: titleComponent,
      id: "task-container",
      className: 'exposure',
      position: 'top-right',
      visible: this.state.showViewTaskPanel,
      resizable: false,
      dialogContent: dialogContent,
      modal:this.props.isViewOnlyTask && !this.state.liveReportClicked? true:false,
      style: primeReactDialogStyleObj,
      onClosetask: this.closeViewtask,
      Closable: false,
    })
  }
});

module.exports = ViewTask;
