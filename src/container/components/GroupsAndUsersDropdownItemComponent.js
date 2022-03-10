var React = require('react');
var cx = require('classnames');
import PropTypes from 'prop-types';

var ExposureAppConstants = require('../constants/ExposureAppConstants');

var div = React.createFactory(require('./TouchComponents').TouchDiv);
var span = React.createFactory(require('./TouchComponents').TouchSpan);

class GroupsAndUsersDropdownItemComponent extends React.Component {
  static displayName = 'GroupsAndUsersDropdownItemComponent';

  static propTypes = {
    item: PropTypes.object.isRequired
  };

  render() {
    switch (this.props.item.entityType) {
      case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
        return div({className: cx('dropdown-item-component', 'group-item', 'bold')}, this.props.item.entity.name);
      case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
        return div({className: cx('dropdown-item-component', 'user-item')},
          div({className: cx('user-item-name', 'bold')}, this.props.item.entity.fullName),
          div({className: 'user-item-email'}, this.props.item.entity.username)
        );
    }
  }
}

module.exports = GroupsAndUsersDropdownItemComponent;
