var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));
var Checkbox = React.createFactory(require('../Checkbox'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);
var a = DOM.a;

class MonitorTasks extends React.Component {
  static displayName = 'MonitorTasks';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  };

  state = { showOpenTasksOnly: true };

  componentWillUnmount() {
    // Force the pane closed in the store.
    ExposureActions.toggleMonitorTasksPane(true);
  }

  toggleShowOpenTasksOnly = () => {
    this.setState({showOpenTasksOnly: !this.state.showOpenTasksOnly});
  };

  setExpandedIds = (immIds) => {
    ExposureActions.setMonitorTasksExpandedIds(immIds);
  };

  viewSelectedtask = (taskId) => {
    window.open('/' + RouteNameConstants.EXPOSURE_TASKS + '/' + taskId);
  };

  getAssigneeList = (immTask) => {
    let immAssigneeIds = immTask.getIn(['coreTaskAttributes','assigneeIds'], Imm.Set());
    let immUserEntries = this.props.immExposureStore.get('users').valueSeq().filter(immUser =>
      immAssigneeIds.contains(immUser.get('id'))).map(immUser =>
        span({key: immUser.get('id')}, immUser.get('fullName')));
    let immGroupEntries = this.props.immExposureStore.get('groupEntities').valueSeq().filter(immGroup =>
      immAssigneeIds.contains(immGroup.get('id'))).map(immGroup =>
        span({key: immGroup.get('id')}, span({className: 'icon-users'}), immGroup.get('name')));
    let immAllEntries = immUserEntries.concat(immGroupEntries);
    return span(null, immAllEntries.count() > 1 ? immAllEntries.take(1).concat(Imm.List([span({key: 'more-entries'}, ` and ${immAllEntries.count() - 1} more`)])) : immAllEntries);
  };

  getTaskListItem = (immTask) => {
    let immExpandedMonitorTasksIds = this.props.immExposureStore.get('immExpandedMonitorTasksIds');
    if (immExpandedMonitorTasksIds && immExpandedMonitorTasksIds.contains(immTask.get('id'))) {
      return div({
          className: 'monitor-task-list-item-expanded',
          key: immTask.get('id')
        },
        span({className: 'monitor-task-list-item-title', onClick: this.setExpandedIds.bind(null, Imm.List())}, immTask.getIn(['coreTaskAttributes','title'])),
        span({className: 'icon-DownArrow', onClick: this.setExpandedIds.bind(null, Imm.List())}),
        div({className: 'monitor-task-details'},
          div({className: 'monitor-task-detail'},
            span({className: 'monitor-task-detail-entry colon'}, FrontendConstants.DATE_TIME),
            span({className: 'time'}, Util.dateFormatUTCYYYYMMDDHHmm(parseInt(immTask.getIn(['coreTaskAttributes','createdAt']), 10)))),
          div({className: 'monitor-task-detail'},
            span({className: 'monitor-task-detail-entry colon'}, FrontendConstants.ASSIGNEE),
            this.getAssigneeList(immTask)),
          div({className: 'monitor-task-detail'},
            span({className: 'monitor-task-detail-entry colon'}, FrontendConstants.STATUS),
            immTask.getIn(['coreTaskAttributes', 'taskState', 'name'])),
          div({className: 'monitor-task-detail'},
            span({className: 'monitor-task-detail-entry colon'}, FrontendConstants.LAST_USER_UPDATE),
            Util.dateFormatUTCYYYYMMDDHHmm(parseInt(immTask.getIn(['coreTaskAttributes','updatedAt']), 10)))
        ),
        Button({
          children: FrontendConstants.OPEN_TASK,
          isSecondary: true,
          onClick: () => this.viewSelectedtask(immTask.get('id'))
        })
      );
    } else {
      return div({
          className: 'monitor-task-list-item',
          key: immTask.get('id')
        },
        span({className: 'monitor-task-list-item-title', onClick: this.setExpandedIds.bind(null, Imm.List([immTask.get('id')]))}, immTask.getIn(['coreTaskAttributes','title'])),
        span({className: 'icon-arrow-right', onClick: this.setExpandedIds.bind(null, Imm.List([immTask.get('id')]))})
      );
    }
  };

  render() {
    let openOnly = this.state.showOpenTasksOnly;
    let immTasks = this.props.immExposureStore.getIn(['monitorTasks'], Imm.List()).map(immTaskTuple => { return immTaskTuple.get('task') }).toSet().toList();
    let immOpenTasks = immTasks.filter(immTask => Util.isOpenTask(immTask));
    let taskList = (openOnly ? immOpenTasks : immTasks).map(immTask => this.getTaskListItem(immTask));
    let noTasks = div({className: 'monitor-no-tasks'}, span({className: 'no-tasks'}, 'No tasks yet.'));
    let tasksCount = span({className: 'monitor-tasks-count'}, openOnly ? immOpenTasks.size + ' open tasks' : immTasks.size + ' tasks');

    let showOpenTasksOnly = div({className: 'monitor-tasks-show-open-tasks-only'},
      Checkbox({
        checkedState: openOnly,
        dimmed: false,
        onClick: this.toggleShowOpenTasksOnly
      }),
      span({className: 'show-only-open-tasks'}, FrontendConstants.SHOW_ONLY_OPEN_TASKS)
    );

    let title = div({className: 'monitor-tasks-title'},
      FrontendConstants.TASKS,
      a({className: 'icon-question-circle', href: Util.formatHelpLink('MONITOR_TASK'), target: '_blank'}),
      div({className: 'close-button', onClick: ExposureActions.toggleMonitorTasksPane})
    );

    return div({className: 'monitor-tasks right-pane'},
      title,
      div({className: 'monitor-tasks-content'},
        div({className: 'monitor-tasks-info'}, tasksCount, showOpenTasksOnly),
        div({className: 'monitor-tasks-list'}, taskList.isEmpty() ? noTasks : taskList.toJS())
      )
    );
  }
}

module.exports = MonitorTasks;
