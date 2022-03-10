var React = require('react');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var SimpleButtonArray = React.createFactory(require('../SimpleButtonArray'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = DOM.span;

class Notifications extends React.Component {
  static displayName = 'Notifications';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  };

  componentDidMount() {
    ExposureActions.fetchNotifications();
  }

  componentWillReceiveProps(nextProps) {
    if (this.refs['notifications-dropdown']) {
      if (nextProps.immExposureStore.get('showNotificationsDropdown')) {
        this.refs['notifications-dropdown'].openDropdown();
      } else {
        this.refs['notifications-dropdown'].closeDropdown();
      }
    }
  }

  handleViewTask = (taskId) => {
    this.refs['notifications-dropdown'].handleDropdownClick();
    this.context.router.push({name: RouteNameConstants.EXPOSURE_TASKS_SHOW, params: {taskId: taskId}});
  };

  render() {
    var immNotifications = this.props.immExposureStore.get('notifications', Imm.Map()).map(function(immNotification, id) {
      var time = Util.dateTimeFormatter(immNotification.get('updatedAt'));
      const taskUuid = immNotification.get('targetId');
      return div({className: 'task', key: id, onClick: this.handleViewTask.bind(null, taskUuid)},
        immNotification.get('priority') == 'Urgent' ? 
          div({className: 'with-urgency'}, 
            span({className: 'icon-WarningCircle', title:'Urgent'}),
            div({className: 'description'}, immNotification.get('description'))) : 
          div({className: 'description'}, immNotification.get('description')),
        immNotification.getIn(['taskType','name']) ?  
          div({className: 'task-type-title'},
            div({className: 'task-type'},immNotification.getIn(['taskType','name']) + ':'),
            div({className: 'notification-title padding-left', title: immNotification.get('title')}, immNotification.get('title'))) : 
          div({className: 'notification-title', title: immNotification.get('title')}, immNotification.get('title')),
        div({className: 'time'}, `Notified on: ${time}`)
      );
    }, this).toList();

    //TODO: restore tabs once we have notifications for alerts.
    var searchToggle = null;
    //SimpleButtonArray({
    //  buttons: [
    //    {text: ' Task (' + immNotifications.size + ') ', class: 'icon-task-alt'},
    //    {text: ' Alert (0) ', class: 'icon-bell'}],
    //  activeButtonKey: 0
    //});

    var dropdownContent = div({className: 'mobile-notifications-dropdown-content'},
      div({className: cx('notifications-header')},
        span({className: 'icon-envelop notifications-icon'}),
        span({className: 'notifications-title'}, 'NOTIFICATIONS'),
        span({className:'mobile-notifications-count'},' (' + immNotifications.size + ') ')),
      searchToggle,
      immNotifications.isEmpty() ? div({className: 'no-notification'}, FrontendConstants.NONE_AT_THIS_TIME) : immNotifications
    );

    return div({className: 'notifications'}, SimpleDropdown({
      badgeCount: this.props.immExposureStore.get('notifications', Imm.Map()).size,
      selectCheckDisabled: true,
      hoverDisabled: true,
      disableItemClick: true,
      icon: 'icon-envelop',
      opener: div({className: 'icon-accordion-down'}),
      ref: 'notifications-dropdown',
      toggleHandler: ExposureActions.toggleNotificationsDropdown,
      items: [{name: dropdownContent}]
    }));
  }
}

module.exports = Notifications;
