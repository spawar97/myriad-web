import MasterStudyFilterUtil from "../../util/MasterStudyFilterUtil";

var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var Combobox = React.createFactory(require('../Combobox'));
var ListItem = React.createFactory(require('../ListItem'));
var ToggleButton = React.createFactory(require('../ToggleButton'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var TaskInputFieldConstants = require('../../constants/TaskInputFieldConstants');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

class TaskActionsPanel extends React.Component {
  static displayName = 'TaskActionsPanel';

  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    handleInputChange: PropTypes.func.isRequired,
    immCDMDropdownData: PropTypes.instanceOf(Imm.Map).isRequired,
    immUsers: PropTypes.instanceOf(Imm.Map).isRequired,
    isLinkedToCDMFile: PropTypes.bool.isRequired,
    isAddMode: PropTypes.bool.isRequired,
    assigneeId: PropTypes.string,
    observerIds: PropTypes.arrayOf(PropTypes.string),
    taskState: PropTypes.string,
    urgency: PropTypes.bool,
    isDataReview: PropTypes.bool
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  // Only display selectable users in the user dropdown.
  getUserDropdownItems = (immUsers) => {
    return immUsers.flatMap(immUser => immUser.get('isSelectable', false) ? Imm.fromJS([{
      text: immUser.get('fullName'),
      id: immUser.get('id')
    }]) : Imm.List());
  };

  getCDMItemSelections = (immCDMDropdownData, field) => {
    return immCDMDropdownData.getIn(['conditions', field, 'itemsSelected'], Imm.List());
  };

  handleCDMSelection = (field, selections) => {
    ExposureActions.setCDMDropdownSelections(this.props.currentFileId, {[field]: selections});
  };

  fetchCDMData = (props) => {
    ExposureActions.setCDMDropdownSelections(props.currentFileId, {
      study: props.extendedTaskAttributes.studyIds,
      country: props.extendedTaskAttributes.siteCountries,
      siteName: props.extendedTaskAttributes.siteNames,
      siteId: props.extendedTaskAttributes.siteIds
    });
  };

  componentDidMount() {
    if (this.props.isLinkedToCDMFile) {
      this.fetchCDMData(this.props);
      this.getTaskAssignableUsers();
    }
  }

  componentWillReceiveProps(nextProps) {
    const oldStudyIds = this.props.extendedTaskAttributes.studyIds || [];
    const newStudyIds = nextProps.extendedTaskAttributes.studyIds || [];
    if (oldStudyIds.length !== newStudyIds.length || _.difference(oldStudyIds, newStudyIds).length !== 0) {
      this.getTaskAssignableUsers(newStudyIds);
    }
    if ((!this.props.isLinkedToCDMFile && nextProps.isLinkedToCDMFile) || this.props.currentFileId !== nextProps.currentFileId) {
      this.fetchCDMData(this.props);
    }
    if (this.props.isLinkedToCDMFile &&
      !this.props.immCDMDropdownData.get('conditions', Imm.Map()).equals(nextProps.immCDMDropdownData.get('conditions', Imm.Map()))) {
      nextProps.handleInputChange(TaskInputFieldConstants.CDM_VALUE, {
        studyIds: this.getCDMItemSelections(nextProps.immCDMDropdownData, 'study'),
        siteCountries: this.getCDMItemSelections(nextProps.immCDMDropdownData, 'country'),
        siteNames: this.getCDMItemSelections(nextProps.immCDMDropdownData, 'siteName'),
        siteIds: this.getCDMItemSelections(nextProps.immCDMDropdownData, 'siteId')
      });
    }
  }

  getAssigneeDropdownItems = (assignees) => {
    return assignees.map(immAssignee => {
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
    return immUserList.map(function(immUser) {
      return immUser.set('selected', _.contains(userIdsPool, immUser.get('id')));
    }, this).sortBy(function(immUser) { return immUser.get('fullName'); });
  };

  getCDMDropdowns = () => {
    if (!this.props.isLinkedToCDMFile) { return null; }

    var immStudyDropdownData = this.props.immCDMDropdownData.getIn(['data', 'studyDropdownData'], Imm.List());
    var immCountryDropdownData = this.props.immCDMDropdownData.getIn(['data', 'countryDropdownData'], Imm.List());
    var immSiteDropdownData = this.props.immCDMDropdownData.getIn(['data', 'siteDropdownData'], Imm.List());

    return div({className: 'cdm-dropdowns'},
      div({className: 'studies-input-block input-block'},
        div({className: 'task-pane-text studies'},
          span({className: 'optional'}, FrontendConstants.STUDIES)),
        Combobox({
          // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
          // of that and not click needlessly to close the dropdown after selection.
          className: cx('dropdown', 'autoblur', 'study-input'),
          placeholder: 'Study',
          value: Imm.fromJS(this.props.extendedTaskAttributes.studyIds),
          multi: true,
          valueKey: 'key',
          labelKey: 'value',
          onChange: this.handleCDMSelection.bind(null, 'study'),
          // Close the menu after each selection, because otherwise the dropdown covers the elements below, making it
          // harder to proceed.
          autoBlur: true,
          disabled: this.props.isObserverOnly,
          options: immStudyDropdownData
        })
      ),
      !this.props.isDataReview ?
      (div({className: 'countries-input-block input-block'},
        div({className: 'task-pane-text countries'},
          span({className: 'optional'}, FrontendConstants.COUNTRIES)),
        Combobox({
          // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
          // of that and not click needlessly to close the dropdown after selection.
          className: cx('dropdown', 'autoblur', 'country-input'),
          placeholder: 'Country',
          value: Imm.fromJS(this.props.extendedTaskAttributes.siteCountries),
          multi: true,
          valueKey: 'key',
          labelKey: 'value',
          onChange: this.handleCDMSelection.bind(null, 'country'),
          // Close the menu after each selection, because otherwise the dropdown covers the elements below, making it
          // harder to proceed.
          autoBlur: true,
          disabled: this.props.isObserverOnly,
          options: immCountryDropdownData
        })
      )) : null,
      !this.props.isDataReview ?
      (div({className: 'sites-input-block input-block'},
        div({className: 'task-pane-text sites'},
          span({className: 'optional'}, FrontendConstants.SITES)),
        Combobox({
          // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
          // of that and not click needlessly to close the dropdown after selection.
          className: cx('dropdown', 'autoblur', 'site-input'),
          placeholder: 'Site',
          value: Imm.fromJS(this.props.extendedTaskAttributes.siteNames),
          multi: true,
          valueKey: 'value',
          labelKey: 'value',
          onChange: this.handleCDMSelection.bind(null, 'siteName'),
          // Close the menu after each selection, because otherwise the dropdown covers the elements below, making it
          // harder to proceed.
          autoBlur: true,
          disabled: this.props.isObserverOnly,
          options: immSiteDropdownData
        })
      )) : null
    );
  };

  getTaskAssignableUsers(taskStudyIds) {
    let applicableStudyIds;
    if (_.isEmpty(taskStudyIds) && !!this.props.immExposureStore) {
      const immMasterStudyIds = MasterStudyFilterUtil.getSelectedMasterStudyIds(this.props.cookies, this.props.immExposureStore);
      applicableStudyIds =  immMasterStudyIds.toArray();
    } else {
      applicableStudyIds = taskStudyIds;
    }

    if(_.isEmpty(applicableStudyIds)) {
      const userList = [...this.props.immUsers].map(([id, user]) => ({ id, user }));
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

  getAssignableUsers() {
    let immAssignableUsers;
    if(this.state && this.state.immAssignableUsers) {
      const immAssignableIds = this.state.immAssignableUsers.map(immUserInfo => immUserInfo.getIn(['user', 'id'], null)).toList();
      immAssignableUsers =  this.props.immUsers.filter(immUser => {
        return immAssignableIds.contains(immUser.get('id', false));
      });
    } else {
      immAssignableUsers =  this.props.immUsers;
    }
    return immAssignableUsers.valueSeq();
  };

  render() {
    const immUserList = this.getAssignableUsers();
    const immGroupEntities = this.props.immGroupEntities.valueSeq();
    const immAssigneeList = Util.getSelectableUsersOrTeams(immGroupEntities, immUserList, this.props.currentUserId).map(immAssignee => {
      return immAssignee.set('selected', _.contains(this.props.assigneeIds, immAssignee.getIn(['entity', 'id'])));
    });
    const immAssignees = this.getAssigneeDropdownItems(immAssigneeList);
    const immObserverList = this.getUserList(immUserList, this.props.observerIds || []);
    const immObservers = this.getUserDropdownItems(immObserverList).toList();

    let taskType, taskState, actionType;
    if (!this.props.isAddMode) {
      [taskType, taskState, actionType] = this.props.getTaskTypeTaskStateActionTypeDropdown(this.props.immTaskTypes, this.props.extendedTaskAttributes, this.props.isAddMode, this.props.isObserverOnly);
    }

    return div({className: cx('task-pane-panel actions-panel',
        {'is-editable': !this.props.isObserverOnly})},
      div({className: 'task-pane-sub-header'}, FrontendConstants.ACTIONS),
      div({className: 'task-pane-text input-block'}, FrontendConstants.URGENCY,
        div({className: 'inline right'},
          ToggleButton({isActive: this.props.urgency, activeText: '!', onClick: this.props.isObserverOnly ?
            _.noop :
            this.props.handleInputChange.bind(null, TaskInputFieldConstants.URGENCY)}))),
      taskType,
      taskState,
      actionType,
      div({className: 'assignee-input-block input-block'},
        div({className: 'task-pane-text assignee-text required'}, FrontendConstants.ASSIGNEE),
        Combobox({
          // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
          // of that and not click needlessly to close the dropdown after selection.
          className: cx('assignee-dropdown', 'autoblur'),
          placeholder: FrontendConstants.SELECT_ASSIGNEE,
          value: immAssignees.filter(immAssignee => _.contains(this.props.assigneeIds, immAssignee.get('id'))),
          multi: true,
          valueKey: 'id',
          labelKey: 'text',
          onChange: this.props.handleInputChange.bind(null, TaskInputFieldConstants.ASSIGNEE_IDS),
          // Close the menu after each selection, because otherwise the dropdown covers the dropdown below, making mistaken
          // selections quite likely.
          autoBlur: true,
          options: immAssignees,
          groupBy: 'type',
          disabled: this.props.isObserverOnly
        })
      ),
      div({className: 'observer-input-block input-block'},
        div({className: 'task-pane-text observer-text'},
          span(null, FrontendConstants.OBSERVERS)),
        Combobox({
          // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
          // of that and not click needlessly to close the dropdown after selection.
          className: cx('observer-dropdown', 'autoblur'),
          placeholder: FrontendConstants.SELECT_OBSERVERS,
          value: immObservers.filter(immObserver => _.contains(this.props.observerIds, immObserver.get('id'))),
          multi: true,
          valueKey: 'id',
          labelKey: 'text',
          onChange: this.props.handleInputChange.bind(null, TaskInputFieldConstants.OBSERVER_IDS),
          // Close the menu after each selection, because otherwise the dropdown covers the elements below, making it
          // harder to proceed.
          autoBlur: true,
          options: immObservers,
          disabled: this.props.isObserverOnly
        })
      ),
      this.getCDMDropdowns()
    );
  }
}

module.exports = TaskActionsPanel;
export default TaskActionsPanel;
