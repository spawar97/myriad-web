var React = require('react');
var cx = require('classnames');
import PropTypes from 'prop-types';

var ExposureAppConstants = require('../constants/ExposureAppConstants');
var FrontendConstants = require('../constants/FrontendConstants');

var div = React.createFactory(require('./TouchComponents').TouchDiv);
var span = React.createFactory(require('./TouchComponents').TouchSpan);

class GroupsAndUsersDropdownGroupComponent extends React.Component {
  static displayName = 'GroupsAndUsersDropdownGroupComponent';

  static propTypes = {
    item: PropTypes.string.isRequired
  };

  render() {
    switch (this.props.item) {
      case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
        return div({className: cx('dropdown-group-component', 'groups-header')},
          span({className: cx('icon', 'icon-users')}),
          span({className: cx('bold', 'groups-header-title', 'colon')}, FrontendConstants.TEAMS)
        );
      case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
        return div({className: cx('dropdown-group-component', 'users-header')},
          span({className: cx('icon', 'icon-user')}),
          span({className: cx('bold', 'users-header-title', 'colon')}, FrontendConstants.USERS)
        );
    }
  }
}

module.exports = GroupsAndUsersDropdownGroupComponent;
