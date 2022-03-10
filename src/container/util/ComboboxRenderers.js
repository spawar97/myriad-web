const React = require('react');
const cx = require('classnames');
import DOM from 'react-dom-factories';

const ExposureAppConstants = require('../constants/ExposureAppConstants');
const FrontendConstants = require('../constants/FrontendConstants');

const div = DOM.div;
const span = DOM.span;

const ComboboxRenderers = {
  /**
   * Used to render each option in the users and groups dropdown in the Share dialog.
   * @param option
   * @returns {*}
   */
  groupAndUserDropdownRenderer: option => {
    if (option.group) {
      // Based on GroupsAndUsersDropdownGroupComponent
      switch (option.label) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          return div({className: cx('groups-header')},
            span({className: cx('icon', 'icon-users')}),
            span({className: cx('bold', 'groups-header-title', 'colon')}, FrontendConstants.TEAMS)
          );
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          return div({className: cx('users-header')},
            span({className: cx('icon', 'icon-user')}),
            span({className: cx('bold', 'users-header-title', 'colon')}, FrontendConstants.USERS)
          );
      }
    } else {
      // Based on GroupsAndUsersDropdownItemComponent
      switch (option.entityType) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          return div({className: cx('dropdown-item-component', 'group-item')}, option.entity.name);
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          return div({className: cx('dropdown-item-component', 'user-item')},
            div({className: cx('user-item-name', 'bold')}, option.entity.fullName),
            div({className: 'user-item-email'}, option.entity.username)
          );
      }
    }
  },

  /**
   * Used to render each tag bubble in the users and groups dropdown in the Share dialog.
   * @param value
   * @returns {*}
   */
  groupAndUserValueRenderer: value => {
    // Displays `+X More` when abbreviating the list.
    if (value.value === ExposureAppConstants.COMBOBOX_ABBREVIATION_VALUE) {
      return span({className: 'list-item-content-text'}, value.label);
    }
    switch (value.entityType) {
      case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
        return span({className: 'group-selection'},
          span({className: 'icon icon-users'}),
          span({className: 'list-item-content-text'}, value.entity.name));
        break;
      case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
        return span({className: 'user-selection'},
          span({className: 'list-item-content-text'}, value.entity.fullName));
        break;
    }
  },

  /**
   * This function is used by Comboboxes that use the above renderers.
   * @param option The object that contains the Option used by the combobox. It is guaranteed to have a 'value' field, but the rest might vary.
   * @param filter The string the user has typed into the search box
   * @returns {boolean} Based on the filter string, should we display this option?
   */
  filterUserAndGroupEntities: function(option, filter) {
    if (_.isEmpty(filter)) {
      return true;
    }
    // Keep the group labels displayed even when filtering.
    if (option.value === option.label) {
      return true;
    }
    const lowerCasedFilter = filter.toLowerCase();

    let inName = false;  // The default path will just filter through option.value. Will only set this to something else when we're dealing with a full entity.
    if ('entity' in option) {
      const name = option.entityType === ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY ? option.entity.name : option.entity.fullName;
      inName = name.toLowerCase().indexOf(lowerCasedFilter) !== -1;
    }

    return option.value.indexOf(lowerCasedFilter) !== -1 || inName;
  }
};

module.exports = ComboboxRenderers;
