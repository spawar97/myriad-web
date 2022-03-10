import AdminStore from "../../stores/AdminStore";

var React = require('react');
var createReactClass = require('create-react-class');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));
var Combobox = React.createFactory(require('../Combobox'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
const ToggleButton = React.createFactory(require('../ToggleButton'));
var BaseListViewMixin = require('../exposure/BaseListViewMixin');
var PaginationWidget = React.createFactory(require('../exposure/PaginationWidget'));
var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

import AccountUtil, { accountFeatures } from '../../util/AccountUtil';
import PermissionsUtil from '../../util/PermissionsUtil';
import {AccessPermissionsConstants, FeatureListConstants, GroupPermissions} from '../../constants/PermissionsConstants';
import AdminRequestConstants from "../../constants/AdminRequestConstants";

var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div;
var span = DOM.span;

var SingleGroup = createReactClass({
  displayName: 'SingleGroup',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin],

  immDisplayedColumns: Imm.OrderedMap({
    firstName: true,
    lastName: true,
    email: true
  }),

  getInitialState: function() {
    return {
      groupName: '',
      groupDescription: '',
      immUserIds: Imm.List(),
      immCheckedUserIds: Imm.List(),
      curPage: 1,
      rowsPerPage: ListViewConstants.DEFAULT_ROWS_PER_PAGE,
      groupNameErrorMessage: null,
      usersListErrorMessage: null,
      hasOversightScorecard: false,
      taskPrivileges: AccessPermissionsConstants.NONE,
      ractPrivileges: AccessPermissionsConstants.NONE,
    };
  },

  componentDidMount: function() {
    if (this.props.params.groupId) {
      AdminActions.loadGroup(this.props.params.groupId);
    }
    AdminActions.loadAllUsersForWorkflow();
  },

  componentWillUnmount: function() {
    AdminActions.clearAllUsersForWorkflow();
  },

  componentWillReceiveProps: function(nextProps) {
    const {groupId} = nextProps.params;
    if (groupId) {
      const immGroup = nextProps.immAdminStore.getIn(['groups', groupId]);
      const hasFinishedLoadingUsers = !AdminStore.getOutstandingRequest(AdminRequestConstants.LOAD_ALL_USERS);
      if (immGroup && hasFinishedLoadingUsers && nextProps.immAdminStore.get('workflowUsers') && !nextProps.immAdminStore.get('workflowUsers').isEmpty()) {
        const accountHasOversightScorecard = AccountUtil.hasOversightScorecard(comprehend.globals.immAppConfig);
        const groupHasOversightScorecard = accountHasOversightScorecard
          && PermissionsUtil.checkEntityHasAccessForFeature(immGroup, FeatureListConstants.OVERSIGHT_SCORECARD);
        const taskPrivileges = PermissionsUtil.getEntityPrivilegeForFeature(immGroup, FeatureListConstants.TASK);
        const ractPrivileges = PermissionsUtil.getEntityPrivilegeForFeature(immGroup, FeatureListConstants.RACT);
        this.handleResize();
        this.setState({
          groupName: immGroup.get('name'),
          groupDescription: immGroup.get('description'),
          immUserIds: !this.state.immUserIds.isEmpty()
            ? this.state.immUserIds
            : this.sortImmUserIds(immGroup.get('userIds'), nextProps.immAdminStore.get('workflowUsers')),
          hasOversightScorecard: groupHasOversightScorecard,
          taskPrivileges: taskPrivileges,
          ractPrivileges: ractPrivileges
        });
      }
    }
  },

  // We render the FDT rows using a fixed order (lastName, firstName, email).
  sortImmUserIds: function(immUserIds, immUserWrappers) {
    return immUserIds.sortBy(
      function(id) {
        const matchingUser = immUserWrappers.find(function(immUserWrapper) {
          return immUserWrapper.getIn(['user', 'id']) === id;
        });
        return matchingUser.get('user');
      },
      function(immUser1, immUser2) {
        var firstName1 = immUser1.get('firstName');
        var firstName2 = immUser2.get('firstName');
        var lastName1 = immUser1.get('lastName');
        var lastName2 = immUser2.get('lastName');
        var email1 = immUser1.get('username');
        var email2 = immUser2.get('username');
        var firstNameEqual = firstName1 === firstName2;
        var lastNameEqual = lastName1 === lastName2;
        if (firstNameEqual && lastNameEqual) {
          return Util.strcmp(email1, email2);
        } else if (lastNameEqual) {
          return Util.strcmp(firstName1, firstName2);
        } else {
          return Util.strcmp(lastName1, lastName2)
        }
      }
    );
  },

  handleSubmit: function(isNew) {
    const {hasOversightScorecard, taskPrivileges, ractPrivileges} = this.state;
    var nameEmpty = Util.isWhiteSpaceOnly(this.state.groupName);
    var usersEmpty = this.state.immUserIds.isEmpty();
    if (nameEmpty) {
      this.setState({
        groupNameErrorMessage: FrontendConstants.TEAM_NAME_IS_REQUIRED
      });
      return;
    }
    if (isNew && usersEmpty) {
      this.setState({
        usersListErrorMessage: FrontendConstants.ADDING_A_USER_IS_REQUIRED
      });
      return;
    }
    // This has to be a string due to issues with protobuf
    const permissions = `{"privilege": "${hasOversightScorecard ? AccessPermissionsConstants.READ : AccessPermissionsConstants.NONE}"}`;
    const taskPermissions = `{"privilege": "${taskPrivileges || AccessPermissionsConstants.NONE}"}`;
    const ractPermissions = `{"privilege": "${ractPrivileges || AccessPermissionsConstants.NONE}"}`;
    const featurePermissionsJson = [
      {
        feature: FeatureListConstants.OVERSIGHT_SCORECARD,
        permissions: permissions,
      },
      {
        feature: FeatureListConstants.TASK,
        permissions: taskPermissions,
      },
      {
        feature: FeatureListConstants.RACT,
        permissions: ractPermissions,
      }
    ];

    const groupObject = {
      name: this.state.groupName,
      description: this.state.groupDescription,
      userIds: this.state.immUserIds.toJS(),
      featurePermissions: featurePermissionsJson,
    };

    if (isNew) {
      AdminActions.addGroup(
          groupObject,
          this.groupUpdatedCallback.bind(this)
      );
    } else {
      AdminActions.updateGroup(
          this.props.params.groupId,
          groupObject,
          this.groupUpdatedCallback.bind(this)
      );
    }
  },

  groupUpdatedCallback(success) {
    if (success) {
      this.context.router.push(RouteNameConstants.APERTURE_GROUPS);
    } else {
      this.setState({
        groupNameErrorMessage: FrontendConstants.TEAM_NAME_IS_ALREADY_IN_USE
      });
    }
  },

  handleGroupNameInputChange: function(e) {
    this.setState({
      groupName: e.target.value,
      groupNameErrorMessage: ''
    });
  },

  handleDescriptionInputChange: function(e) {
    this.setState({
      groupDescription: e.target.value
    });
  },

  handleSelectUsersDropdown: function(userId) {
    if (!this.state.immUserIds.contains(userId)) {
      this.setState({
        immUserIds: this.sortImmUserIds(this.state.immUserIds.push(userId), this.props.immAdminStore.get('workflowUsers')),
        usersListErrorMessage: ''
      });
    }
  },

  handleRemove: function() {
    this.setState({
      immUserIds: this.state.immUserIds.filterNot(function(id) {
        return this.state.immCheckedUserIds.contains(id);
      }, this),
      immCheckedUserIds: Imm.List()
    });
  },

  usersReady: function() {
    return this.props.immAdminStore.get('workflowUsers') && !this.props.immAdminStore.get('workflowUsers').isEmpty() && !this.state.immUserIds.isEmpty();
  },

  /**
   * @param option {object} With a firstName, lastName, and email.
   * @param filter {string} The search string the user has entered.
   * @returns {boolean} Whether the filter appears in any of the above fields, ignoring case.
   */
  userOptionFilter: (option, filter) => {
    if (_.isEmpty(filter)) {
      return true;
    }
    const lowerCasedFilter = filter.toLowerCase();

    // Sometimes we don't have the name.
    const val = option.email + (option.firstName || '') + (option.lastName || '');
    return val.toLowerCase().indexOf(lowerCasedFilter) !== -1;
  },

  userOptionRenderer: option => div({className: cx('group-user-dropdown-entry', {disabled: option.disabled})},
      span({className: 'group-user-dropdown-first-name'}, option.firstName),
      span({className: 'group-user-dropdown-last-name'}, option.lastName),
      div({className: 'group-user-dropdown-email'}, option.email)
    ),

  getUsersDropdown: function() {
    var immUserWrappers = this.props.immAdminStore.get('workflowUsers').filterNot(function(immUserWrapper) {
      return immUserWrapper.getIn(['userEntity','userEntityState']) === 'DELETED';
    });
    var dropdownItems = immUserWrappers ? immUserWrappers.map(function(immUserWrapper) {
      var immUser = immUserWrapper.get('user');
      return {
        firstName: immUser.get('firstName'),
        lastName: immUser.get('lastName'),
        email: immUser.get('username'),
        id: immUser.get('id'),
        disabled: this.state.immUserIds.contains(immUser.get('id'))
      };
    }, this).toList() : Imm.List();
    return Combobox({
      className: 'group-users-dropdown',
      placeholder: FrontendConstants.ADD_A_USER,
      value: '',
      valueKey: 'id',
      labelKey: 'text',
      onChange: this.handleSelectUsersDropdown,
      options: dropdownItems,
      filterOption: this.userOptionFilter,
      optionRenderer: this.userOptionRenderer
    });
  },

  getUsersTable: function() {
    var userIdsSize = this.state.immUserIds.skip(this.state.rowsPerPage * (this.state.curPage - 1)).take(this.state.rowsPerPage).size;
    return div(
      {className: 'group-users-table'},
      Table.apply(null, this.constructTableArgs(
        Math.min(userIdsSize, this.state.rowsPerPage),
        this.immDisplayedColumns,
        Imm.List(),
        null,
        Imm.Map(),
        this.specialCellRenderer,
        this.getColumnWidths,
        false,  // skipCheckBoxes.
        true  // skipOpen.
      )));
  },

  getPaginationWidget: function() {
    var rowsPerPageOptions = _.range(1, ListViewConstants.PAGE_SIZE_DROPDOWN_ROWS).map(function(index) {
      return {rowsPerPage: index * ListViewConstants.DEFAULT_ROWS_PER_PAGE};
    });
    return PaginationWidget({
      curPage: this.state.curPage,
      pageChangeHandler: function(pageNum) {
        this.setState({
          curPage: pageNum
        });
      }.bind(this),
      rowsPerPage: this.state.rowsPerPage,
      rowsPerPageChangeHandler: function(rowsPerPage) {
        this.setState({
          curPage: 1,
          rowsPerPage: rowsPerPage
        });
      }.bind(this),
      rowsPerPageDenom: ListViewConstants.DEFAULT_ROWS_PER_PAGE,
      rowsPerPageOptions: rowsPerPageOptions,
      totalRows: this.state.immUserIds.size
    });
  },

  itemAccessor: function(immData, rowIndex) {
    return immData.get(rowIndex);
  },

  getHandleOpenAction: function(id) {
    return [RouteNameConstants.APERTURE_USERS_SHOW, {userId: id}];
  },

  createHeaderContentHandler: function(colName) {
    return this.columnNameMap[colName];
  },

  setCheckedUserWrappers: function(rowIndex, isChecked) {
    const rowIndexWithOffset = this.state.rowsPerPage * (this.state.curPage - 1) + rowIndex;
    const immCheckedUserIds = isChecked ?
      this.state.immCheckedUserIds.push(this.state.immUserIds.get(rowIndexWithOffset)) :
      this.state.immCheckedUserIds.filterNot(function(id) {
        return id === this.state.immUserIds.get(rowIndexWithOffset);
      }, this);
    this.setState({immCheckedUserIds: immCheckedUserIds});
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    var startIndex = this.state.rowsPerPage * (this.state.curPage - 1);
    var immUserIds = this.state.immUserIds.skip(startIndex).take(this.state.rowsPerPage);
    var immUserWrappers = this.state.immUserIds.map(function(immUserId) {
      return this.props.immAdminStore.get('workflowUsers').find(function(immUserWrapper) {
        return immUserWrapper.getIn(['user', 'id']) === immUserId;
      });
    }, this).skip(startIndex).take(this.state.rowsPerPage);
    var immCheckedUserIds = this.state.immCheckedUserIds;
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immAdminStore,
      immUserIds,
      immCheckedUserIds,
      immUserWrappers,
      this.itemAccessor,
      this.setCheckedUserWrappers,
      _.noop,
      this.getHandleOpenAction,
      _.noop,
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths: function() {
    return BaseListViewMixin._getColumnWidths(
      this.immDisplayedColumns,
      this.props.immAdminStore.get('workflowUsers').map(function(immUserWrapper) {
        return immUserWrapper.get('user');
      }),
      this.props.immAdminStore);
  },

  handleToggleOversightScorecard() {
    const {hasOversightScorecard} = this.state;
    this.setState({
      hasOversightScorecard: !hasOversightScorecard,
    });
  },

  handleTaskAccessChange(newPrivileges) {
    this.setState({
      taskPrivileges: newPrivileges,
    });
  },

  handleRactAccessChange(newPrivileges) {
    this.setState({
      ractPrivileges: newPrivileges,
    });
  },

  getTaskAccessDropDown() {
    return (
      <div className={cx('input-block', 'task-access-dropdown-block')}>
        <span className='input-title'>{FrontendConstants.TASK_ACCESS}</span>
        <Combobox
          className='task-access-dropdown'
          placeHolder=''
          value={this.state.taskPrivileges}
          onChange={this.handleTaskAccessChange}
          options={GroupPermissions}
        />
      </div>
    );
  },


  getRactAccessDropDown() {
    if (AccountUtil.hasFeature(comprehend.globals.immAppConfig, accountFeatures.RACT)) {
      return (
          <div className={cx('input-block', 'ract-access-dropdown-block')}>
            &nbsp;
            <span className='input-title'>{FrontendConstants.RACT_ACCESS}</span>
            <Combobox
                className='ract-access-dropdown'
                placeHolder=''
                value={this.state.ractPrivileges}
                onChange={this.handleRactAccessChange}
                options={GroupPermissions}
            />
          </div>
      );
    }
  },

  render: function() {
    var groupNameInput = InputBlockContainer({
      title: FrontendConstants.TEAM_NAME,
      titleClass: 'required',
      inputComponent: InputWithPlaceholder({
        type: 'text',
        refs: 'name-input',
        className: cx('text-input', 'name-input', {'invalid-input': this.state.groupNameErrorMessage}),
        onChange: this.handleGroupNameInputChange,
        value: this.state.groupName,
        maxLength: 100})
    });

    var groupDescriptionInput = InputBlockContainer({
      title: FrontendConstants.DESCRIPTION,
      inputComponent: InputWithPlaceholder({
        type: 'text',
        refs: 'description-input',
        className: cx('text-input', 'description-input'),
        onChange: this.handleDescriptionInputChange,
        value: this.state.groupDescription,
        maxLength: 100})
    });

    var usersDropdown = this.getUsersDropdown();

    var deleteButton = SimpleAction({class: 'icon-remove', onClick: this.handleRemove});

    var usersTable = this.usersReady() ? this.getUsersTable() : null;

    var paginationWidget = this.usersReady() ? this.getPaginationWidget() : null;

    var submitButton = this.props.params.groupId ? Button({
        icon: 'icon-loop2',
        children: FrontendConstants.UPDATE,
        isPrimary: true,
        onClick: this.handleSubmit.bind(null, false)
      }) : Button({
        icon: 'icon-plus-circle2',
        children: FrontendConstants.ADD_THIS_TEAM,
        isPrimary: true,
        onClick: this.handleSubmit.bind(null, true)
      });

    var cancelButton = Button({
      icon: 'icon-close',
      children: FrontendConstants.CANCEL,
      isSecondary: true,
      onClick: () => this.context.router.push(RouteNameConstants.APERTURE_GROUPS)
    });

    let oversightScorecardToggle;
    if (AccountUtil.hasOversightScorecard(comprehend.globals.immAppConfig)) {
      oversightScorecardToggle = (
        div({className: cx('oversight-scorecard-access-toggle', 'input-block')},
          div({className:cx('oversight-scorecard-access-toggle-button-header', 'input-title')},
            FrontendConstants.OVERSIGHT_SCORECARD
          ),
          div({className:'oversight-scorecard-access-toggle-button-wrapper'},
            ToggleButton({
              className: 'oversight-scorecard-user-toggle-button',
              isActive: this.state.hasOversightScorecard || false,
              activeText: FrontendConstants.CHECKMARK,
              onClick: this.handleToggleOversightScorecard,
            })
          )
        )
      );
    }

    const taskAccessDropdown = this.getTaskAccessDropDown();

    const ractAccessDropdown = this.getRactAccessDropDown();

    const groupPermissionsSection = (
        div({className: 'group-permissions-section'},
          div({className: 'section-header'},
            div({className: 'title'},
              FrontendConstants.GROUP_PERMISSIONS,
            )
          ),
          div({className: 'group-permissions'},
            oversightScorecardToggle,
            taskAccessDropdown,
            ractAccessDropdown
          )
        )
      );

    return div({className: cx('admin-tab', 'user-management-tab', 'user-management-single-group'), style: {height: this.props.height, width: this.props.width}},
      div({className: 'page-header'}, div({className: 'title'}, this.props.params.groupId ? FrontendConstants.EDIT_TEAM : FrontendConstants.ADD_A_TEAM)),
      div({className: 'section-header'}, div({className: 'title'}, FrontendConstants.DETAILS)),
      div({className: 'edit-group-inputs'}, groupNameInput, groupDescriptionInput),
      groupPermissionsSection,
      this.state.groupNameErrorMessage ? span({className: cx('name-error-message', 'text-input-error-explanation')}, this.state.groupNameErrorMessage) : null,
      div({className: 'section-header'}, div({className: 'title'}, FrontendConstants.USERS)),
      div({className: cx('edit-group-users-dropdown-header', 'required')}, FrontendConstants.ADD_USERS_TO_THIS_TEAM),
      div({className: 'edit-group-users-dropdown'}, usersDropdown),
      this.state.usersListErrorMessage ? span({className: cx('user-error-message', 'text-input-error-explanation')}, this.state.usersListErrorMessage) : null,
      div({className: 'edit-group-users-table-header'},
        span({className: 'total-users'}, FrontendConstants.USERS_IN_THIS_TEAM(this.state.immUserIds.size)),
        this.state.immUserIds.isEmpty() ? null : deleteButton),
      usersTable,
      paginationWidget,
      submitButton,
      cancelButton
    );
  }
});

module.exports = SingleGroup;
