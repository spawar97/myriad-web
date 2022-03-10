import React from 'react';
import _ from 'underscore';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Button from '../Button';
import Combobox from '../Combobox';
import InputBlockContainer from '../InputBlockContainer';
import InputWithPlaceholder from '../InputWithPlaceholder';

const ExposureSharingConstants = require('../../constants/ExposureSharingConstants');
import FrontendConstants from '../../constants/FrontendConstants';
import ModalConstants from '../../constants/ModalConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import { AccessPermissionsConstants, FeatureListConstants, OversightScorecardPermissions, IndividualPermissions } from '../../constants/PermissionsConstants';
import Util from '../../util/util';
import PermissionsUtil from '../../util/PermissionsUtil';
import AccountUtil, { accountFeatures } from '../../util/AccountUtil';
import ToggleButton from '../ToggleButton';
import Spinner from '../Spinner';
import DataReviewStore, { Key, RequestKey, GetOutstandingRequest } from '../../stores/DataReviewStore';

import ShallowCompare from 'react-addons-shallow-compare';
import DataReviewActions from "../../actions/DataReviewActions";
import AdminActions from "../../actions/AdminActions";

const USER_ROLES = (() => {
  const roles = [
    FrontendConstants.ACCOUNT_ROLE_BASIC,
    FrontendConstants.ACCOUNT_ROLE_ADVANCED,
    FrontendConstants.ACCOUNT_ROLE_ADMIN,
  ];

  const roleMap = _.map(roles, role => ({ value: role, label: role }));

  return Imm.fromJS(roleMap);
})();

class UserDetail extends React.Component {
  static displayName = 'UserDetail';

  static propTypes = {
    height: PropTypes.number,
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number,
    params: PropTypes.shape({
      userId: PropTypes.string,
    }),
    immDataReviewStore: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      savedUserDetails: this.buildUserDetails(null, null, null),
      currentUserDetails: this.buildUserDetails(null, null, null),
      savedRole: null,
      currentRole: null,
      initialLoad: true,
      currentDataAccessGroupId: null,
      savedDataAccessGroupId: null,
      immReviewRoles: Imm.List(),
      immCurrentReviewRoles: Imm.List(),
      immSavedReviewRoles: Imm.List(),
      currentTaskAccess: '',
      currentRactAccess: '',
      savedTaskAccess: '',
      currentOversightScorecardAccess: '',
      savedOversightScorecardAccess: '',
      currentHasEditDefaultOSProfile: false,
      savedHasEditDefaultOSProfile: false,
    };

    // Begin function binding, so that the DOM will not unnecessarily render subcomponents if these are rebound on each render
    this.HandleUpdate = this.handleUpdate.bind(this);
    this.HandleCancel = this.handleCancel.bind(this);
    this.HandleToggleSSO = this.handleToggleSSO.bind(this);
    this.HandleToggleApiAccess = this.handleToggleApiAccess.bind(this);
    this.HandleToggleEditDefaultOSProfile = this.handleToggleEditDefaultOSProfile.bind(this);
    this.HandleChangeOversightScorecardAccess = this.handleChangeOversightScorecardAccess.bind(this);
    this.HandleChangeTaskAccess = this.handleChangeTaskAccess.bind(this);
    this.HandleChangeRactAccess = this.handleChangeRactAccess.bind(this);
  }

  componentDidMount() {
    const { userId } = this.props.params;
    const immUserWrapper = this.findImmUserWrapper(this.props);
    const stateObject = {};

    if (!immUserWrapper) {
      AdminActions.loadUser(userId);
    } else {
      const role = immUserWrapper.getIn(['role', 'name']);
      const isSSO = immUserWrapper.getIn(['user', 'isSSOUser'], false);
      const hasApiAccess = immUserWrapper.getIn(['user', 'hasApiAccess'], false);

      const immUserEntity = immUserWrapper.get('userEntity', Imm.Map());
      const dataAccessProfileId = immUserEntity.get('dataAccessProfileId');
      const reviewRoleIds = immUserEntity.get('reviewRoleIds');

      stateObject.savedUserDetails = this.buildUserDetails(isSSO, hasApiAccess);
      stateObject.currentUserDetails = this.buildUserDetails(isSSO, hasApiAccess);
      stateObject.savedRole = role;
      stateObject.currentRole = role;
      stateObject.currentDataAccessGroupId = dataAccessProfileId;
      stateObject.savedDataAccessGroupId = dataAccessProfileId;
      stateObject.immCurrentReviewRoles = reviewRoleIds;
      stateObject.immSavedReviewRoles = reviewRoleIds;

      // Check to see if user has permissions for granular features / functionality within the application
      const oversightScorecardAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD, AccessPermissionsConstants.INHERIT);
      stateObject.currentOversightScorecardAccess = oversightScorecardAccess;
      stateObject.savedOversightScorecardAccess = oversightScorecardAccess;

      const taskAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.TASK, AccessPermissionsConstants.INHERIT);
      stateObject.currentTaskAccess = taskAccess;
      stateObject.savedTaskAccess = taskAccess;

      const ractAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.RACT, AccessPermissionsConstants.INHERIT);
      stateObject.currentRactAccess = ractAccess;
      stateObject.savedRactAccess = ractAccess;


      const canEditDefaultOSProfile = PermissionsUtil.checkEntityHasPermissionForFeature(
        immUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD,
        OversightScorecardPermissions.canEditDefault, true
      );
      stateObject.currentHasEditDefaultOSProfile = canEditDefaultOSProfile;
      stateObject.savedHasEditDefaultOSProfile = canEditDefaultOSProfile;
    }

    stateObject.initialLoad = false;

    AdminActions.loadDataAccessGroups();
    DataReviewActions.loadDataReviewRoles();

    this.setState(stateObject);
  }

  /**
   * Since PureComponent will only perform a shallow compare on state, and UserDetails are a nested
   * object, instead of extending PureComponent for this component, just implement
   * shouldComponentUpdate and manually perform deep checks as necessary to determine if an update
   * should occur
   *
   * @param nextProps
   * @param nextState
   * @returns {*}
   */
  shouldComponentUpdate(nextProps, nextState) {
    const propsChanged = ShallowCompare(this.props, nextProps);
    const nextSavedDetails = nextState.savedUserDetails;
    const nextCurrentDetails = nextState.currentUserDetails;
    const { savedUserDetails, currentUserDetails } = this.state;

    return (
      propsChanged
      || ShallowCompare(savedUserDetails, nextSavedDetails)
      || ShallowCompare(currentUserDetails, nextCurrentDetails)
      || ShallowCompare(this.state, nextState)
    );
  }

  /**
   * Used to build out a User Details object which will be passed down to the backend and saved
   * appropriately. As information about the User is extended, extend this function appropriately
   *
   * @param isSSOUser - Whether the user is an SSO user
   * @param hasApiAccess - Whether the user has API access
   * @returns {Object} - A UserDetails object containing all editable user information outside of
   *                     role
   */
  buildUserDetails(isSSOUser, hasApiAccess) {
    return { isSSOUser, hasApiAccess };
  }

  componentWillReceiveProps(nextProps) {
    const stateObject = {};
    const thisUser = this.findImmUserWrapper(this.props);
    const nextUser = this.findImmUserWrapper(nextProps);

    const savedRole = thisUser ? thisUser.getIn(['role', 'name']) : null;
    const nextRole = nextUser ? nextUser.getIn(['role', 'name']) : null;

    const savedDataAccessGroupId = thisUser
      ? thisUser.getIn(['userEntity', 'dataAccessProfileId'])
      : null;

    const nextDataAccessGroupId = nextUser
      ? nextUser.getIn(['userEntity', 'dataAccessProfileId'])
      : null;

    const savedSSOUser = thisUser ? thisUser.getIn(['user', 'isSSOUser'], false) : null;
    const nextSSOUser = nextUser ? nextUser.getIn(['user', 'isSSOUser'], false) : null;

    const savedHasApiAccess = thisUser ? thisUser.getIn(['user', 'hasApiAccess'], false) : null;
    const nextHasApiAccess = nextUser ? nextUser.getIn(['user', 'hasApiAccess'], false) : null;

    const savedReviewRoleIds = thisUser
      ? thisUser.getIn(['userEntity', 'reviewRoleIds'])
      : null;
    const nextReviewRoleIds = nextUser
      ? nextUser.getIn(['userEntity', 'reviewRoleIds'])
      : null;

    const immUserEntity = thisUser ? thisUser.get('userEntity', Imm.Map()) : Imm.Map();
    const immNextUserEntity = nextUser ? nextUser.get('userEntity', Imm.Map()) : Imm.Map();

    const savedTaskAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.TASK);
    const nextTaskAccess = PermissionsUtil.getEntityPrivilegeForFeature(immNextUserEntity, FeatureListConstants.TASK);
    if (savedTaskAccess !== nextTaskAccess) {
      stateObject.currentTaskAccess = nextTaskAccess;
      stateObject.savedTaskAccess = nextTaskAccess;
    }

    const savedRactAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.RACT);
    const nextRactAccess = PermissionsUtil.getEntityPrivilegeForFeature(immNextUserEntity, FeatureListConstants.RACT);
    if (savedRactAccess !== nextRactAccess) {
      stateObject.currentRactAccess = nextRactAccess;
      stateObject.savedRactAccess = nextRactAccess;
    }

    const savedOversightScorecardAccess = PermissionsUtil.getEntityPrivilegeForFeature(immUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD);
    const nextOversightScorecardAccess = PermissionsUtil.getEntityPrivilegeForFeature(immNextUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD);
    if (savedOversightScorecardAccess !== nextOversightScorecardAccess) {
      stateObject.currentOversightScorecardAccess = nextOversightScorecardAccess;
      stateObject.savedOversightScorecardAccess = nextOversightScorecardAccess;
    }

    const savedCanEditDefaultOSProfile = PermissionsUtil.checkEntityHasPermissionForFeature(
      immUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD,
      OversightScorecardPermissions.canEditDefault, true
    );
    const nextCanEditDefaultOSProfile = PermissionsUtil.checkEntityHasPermissionForFeature(
      immNextUserEntity, FeatureListConstants.OVERSIGHT_SCORECARD,
      OversightScorecardPermissions.canEditDefault, true
    );
    if (savedCanEditDefaultOSProfile !== nextCanEditDefaultOSProfile) {
      stateObject.currentHasEditDefaultOSProfile = nextCanEditDefaultOSProfile;
      stateObject.savedHasEditDefaultOSProfile = nextCanEditDefaultOSProfile;
    }

    if (!Imm.is(savedReviewRoleIds, nextReviewRoleIds)) {
      stateObject.immCurrentReviewRoles = nextReviewRoleIds;
      stateObject.immSavedReviewRoles = nextReviewRoleIds;
    }

    // Check to see if the next user has a different role
    if (savedRole !== nextRole) {
      stateObject.currentRole = nextRole;
      stateObject.savedRole = nextRole;
    }

    // Check to see if any of the user details have changed
    if ((savedSSOUser !== nextSSOUser) || (savedHasApiAccess !== nextHasApiAccess) || (savedTaskAccess !== nextTaskAccess)) {
      stateObject.savedUserDetails = this.buildUserDetails(nextSSOUser, nextHasApiAccess, nextTaskAccess);
      stateObject.currentUserDetails = this.buildUserDetails(nextSSOUser, nextHasApiAccess, nextTaskAccess);
    }

    if (savedDataAccessGroupId !== nextDataAccessGroupId) {
      stateObject.savedDataAccessGroupId = nextDataAccessGroupId;
      stateObject.currentDataAccessGroupId = nextDataAccessGroupId;
    }

    if ((!this.state.immReviewRoles || this.state.immReviewRoles.size === 0)
      && nextProps.immDataReviewStore.get(Key.dataReviewRolesList).size > 0) {
      const immReviewRoles = DataReviewStore.getDataReviewRolesList();
      stateObject.immReviewRoles = immReviewRoles.map(immReviewRole => {
        return { value: immReviewRole.get('id'), label: immReviewRole.get('name') };
      });
    }

    if (!_.isEmpty(stateObject)) {
      this.setState(stateObject);
    }
  }

  /**
   * Checks whether there are any changes to the UserDetails object
   * @returns {boolean}
   */
  hasUserDetailChanges() {
    const { savedUserDetails, currentUserDetails } = this.state;
    return !_.isMatch(savedUserDetails, currentUserDetails);
  }

  /**
   * Checks whether the current role for the user is set to something other than the saved role
   * @returns {boolean}
   */
  hasRoleChange() {
    const { savedRole, currentRole } = this.state;
    return savedRole !== currentRole;
  }

  hasDataAccessGroupChange() {
    const { savedDataAccessGroupId, currentDataAccessGroupId } = this.state;
    return savedDataAccessGroupId !== currentDataAccessGroupId;
  }

  hasDataReviewRoleChange() {
    const { immSavedReviewRoles, immCurrentReviewRoles } = this.state;
    return !Imm.is(immCurrentReviewRoles, immSavedReviewRoles);
  }

  /**
   * Checks whether the user's permissions have changed. Any updates to the entity_permissions
   * table should go through this
   * @returns {*}
   */
  hasPermissionsChange() {
    return this.hasOversightScorecardChange() || this.hasTaskPermissionsChange() || this.hasRactPermissionsChange();
  }

  hasOversightScorecardChange() {
    const { currentOversightScorecardAccess, savedOversightScorecardAccess,
      currentHasEditDefaultOSProfile, savedHasEditDefaultOSProfile } = this.state;
    return (currentOversightScorecardAccess !== savedOversightScorecardAccess)
      || (currentHasEditDefaultOSProfile !== savedHasEditDefaultOSProfile);
  }

  hasTaskPermissionsChange() {
    const { currentTaskAccess, savedTaskAccess } = this.state;
    return (currentTaskAccess !== savedTaskAccess);
  }

  hasRactPermissionsChange() {
    const { currentRactAccess, savedRactAccess } = this.state;
    return (currentRactAccess !== savedRactAccess);
  }

  /**
   * Determines if any changes have been made by the administrator to the current user
   * @returns {boolean}
   */
  hasChanges() {
    return this.hasUserDetailChanges()
      || this.hasRoleChange()
      || this.hasDataAccessGroupChange()
      || this.hasDataReviewRoleChange()
      || this.hasOversightScorecardChange()
      || this.hasTaskPermissionsChange()
      || this.hasRactPermissionsChange();
  }

  /**
   * Handle updates to the user object as needed
   */
  handleUpdate() {
    const thisUser = this.findImmUserWrapper(this.props);
    let userEntity = thisUser.get('userEntity');

    // Role change hits a separate endpoint than updating any other user details
    if (this.hasRoleChange()) {
      AdminActions.updateUserRole(
        this.props.params.userId,
        this.state.currentRole,
        this.updateRoleCompleted.bind(this));
    }
    // If any other user details have changed, perform an update to the User object
    if (this.hasUserDetailChanges()) {
      AdminActions.updateUserDetails(
        this.props.params.userId,
        this.state.currentUserDetails,
        this.updateUserDetailsCompleted.bind(this));
    }

    if (this.hasDataAccessGroupChange()) {
      userEntity = userEntity.set('dataAccessProfileId', this.state.currentDataAccessGroupId);
      AdminActions.updateUserDataAccessGroup(
        this.props.params.userId,
        userEntity,
        this.updateUserDataAccessGroupCompleted.bind(this)
      );
    }

    if (this.hasDataReviewRoleChange()) {
      const reviewRoleIds = this.state.immCurrentReviewRoles || Imm.List();
      userEntity = userEntity.set('reviewRoleIds', reviewRoleIds);
      DataReviewActions.updateUserDataReviewRole(
        this.props.params.userId,
        userEntity,
        this.updateUserDataReviewRoleCompleted.bind(this)
      );
    }

    this.updatePermissionsIfNeeded();

    // TODO - the users list view breaks ordering sometimes after updating user roles. As such, we'll require
    //        an extra click for now... But a route change would be better UX
    // this.context.router.push({name: RouteNameConstants.APERTURE_USERS, query: {
    //   page: "1",
    //   pageSize: "20",
    //   sortColumn: "email",
    //   sortOrdering: "asc"
    // }});
  }

  /**
   * When a role change has been completed, inform the admin
   */
  updateRoleCompleted() {
    const immUser = this.findImmUserWrapper(this.props).get('user');

    let displayName = immUser.get('username');
    if (!_.isEmpty(immUser.get('firstName')) && !_.isEmpty(immUser.get('lastName'))) {
      displayName = immUser.get('firstName') + ' ' + immUser.get('lastName');
    }

    AdminActions.createStatusMessage(
      FrontendConstants.UPDATED_USER_ROLE(
        displayName,
        this.state.savedRole,
        this.state.currentRole
      ),
      StatusMessageTypeConstants.TOAST_SUCCESS);
  }

  /**
   * Inform the admin that user details have been updated successfully
   */
  updateUserDetailsCompleted() {
    AdminActions.createStatusMessage(
      FrontendConstants.UPDATED_USER_DETAILS,
      StatusMessageTypeConstants.TOAST_SUCCESS
    );
  }

  updateUserDataAccessGroupCompleted() {
    AdminActions.createStatusMessage(
      FrontendConstants.UPDATED_USER_DATA_ACCESS_GROUP,
      StatusMessageTypeConstants.TOAST_SUCCESS
    );
  }

  updateUserDataReviewRoleCompleted() {
    AdminActions.createStatusMessage(
      FrontendConstants.UPDATED_USER_DATA_REVIEW_ROLE,
      StatusMessageTypeConstants.TOAST_SUCCESS
    );
  }

  updatePermissionsCompleted() {
    AdminActions.createStatusMessage(
      FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_USER_PERMISSIONS,
      StatusMessageTypeConstants.TOAST_SUCCESS
    );
  }

  /**
   * If the user has made any permission changes, construct the proper entity permissions message,
   * and dispatch the request to update their permissions accordingly
   */
  updatePermissionsIfNeeded() {
    if (this.hasPermissionsChange()) {
      const { currentHasEditDefaultOSProfile, currentOversightScorecardAccess, currentTaskAccess, currentRactAccess } = this.state;

      const oversightScorecardPermissions = PermissionsUtil.formatOversightScorecardPermissions(
        currentOversightScorecardAccess,
        currentHasEditDefaultOSProfile
      );

      const taskPermissions = PermissionsUtil.formatTaskPermissions(currentTaskAccess);

      const ractPermissions = PermissionsUtil.formatRactPermissions(currentRactAccess)

      const userPermissions = PermissionsUtil.formatEntityPermissionsMessage(oversightScorecardPermissions, taskPermissions, ractPermissions);

      AdminActions.updateUserPermissions(
        this.props.params.userId,
        userPermissions,
        this.updatePermissionsCompleted.bind(this),
      );
    }
  }

  handleToggleSSO() {
    const { currentUserDetails } = this.state;
    currentUserDetails.isSSOUser = !currentUserDetails.isSSOUser;
    this.setState({ currentUserDetails: currentUserDetails });
  }

  handleToggleApiAccess() {
    const { currentUserDetails } = this.state;
    currentUserDetails.hasApiAccess = !currentUserDetails.hasApiAccess;
    this.setState({ currentUserDetails: currentUserDetails });
  }

  handleChangeOversightScorecardAccess(newAccess) {
    let { currentHasEditDefaultOSProfile } = this.state;
    // If removing EDIT access, the user can no longer edit the default OS Profile either
    if (newAccess !== AccessPermissionsConstants.EDIT) {
      currentHasEditDefaultOSProfile = false;
    }

    this.setState({
      currentOversightScorecardAccess: newAccess,
      currentHasEditDefaultOSProfile,
    });
  }

  handleChangeTaskAccess(newAccess) {
    this.setState({
      currentTaskAccess: newAccess,
    });
  }

  handleChangeRactAccess(newAccess) {
    this.setState({
      currentRactAccess: newAccess,
    });
  }

  handleToggleEditDefaultOSProfile() {
    const { currentHasEditDefaultOSProfile } = this.state;
    this.setState({
      currentHasEditDefaultOSProfile: !currentHasEditDefaultOSProfile,
    });
  }

  onChangeRole = (dropdownValue) => {
    const { currentOversightScorecardAccess, currentHasEditDefaultOSProfile } = this.state;
    let oversightScorecardAccess = currentOversightScorecardAccess;
    let hasEditDefaultOSProfile = currentHasEditDefaultOSProfile;
    // Basic users do not have access to OS configuration
    // Admin users always have access to OS configuration
    if (dropdownValue === FrontendConstants.ACCOUNT_ROLE_BASIC && oversightScorecardAccess === AccessPermissionsConstants.EDIT) {
      oversightScorecardAccess = AccessPermissionsConstants.READ;
    }

    if (dropdownValue === FrontendConstants.ACCOUNT_ROLE_BASIC) {
      hasEditDefaultOSProfile = false;
    }

    this.setState({
      currentRole: dropdownValue,
      currentOversightScorecardAccess: oversightScorecardAccess,
      currentHasEditDefaultOSProfile: hasEditDefaultOSProfile,
    });
  };

  onChangeDataAccessGroup(dropdownValue) {
    this.setState({ currentDataAccessGroupId: dropdownValue });
  }

  onChangeReviewRole(selectedRoleIds) {
    const { immReviewRoles } = this.state;

    const currentReviewRoles = _.map(selectedRoleIds, id => {
      const label = immReviewRoles.find(reviewRole => reviewRole.value === id).label;
      return { value: id, label: label };
    });

    this.setState({ immCurrentReviewRoles: Imm.fromJS(selectedRoleIds) });
  }

  handleCancel() {
    this.context.router.push({ name: RouteNameConstants.APERTURE_USERS });
  }

  findImmUserWrapper = (props) => {
    return props.immAdminStore.get('users').find(function (immUserWrapper) {
      return immUserWrapper.getIn(['user', 'id']) === props.params.userId;
    });
  };

  displayRoleDefinitions = () => {
    AdminActions.displayModal(
      ModalConstants.MODAL_ROLE_DEFINITIONS,
      { handleCancel: AdminActions.closeModal }
    );
  };

  isReady() {
    const { initialLoad } = this.state;
    const hasDataAccessGroupNames = this.props.immAdminStore.has('dataAccessGroupsList');
    const hasDataReviewRoles = !GetOutstandingRequest(RequestKey.loadRoles);

    return !initialLoad && hasDataAccessGroupNames && hasDataReviewRoles;
  }

  render() {
    if (!this.isReady()) {
      return <Spinner />;
    }

    const { immAdminStore } = this.props;
    const userId = this.props.params.userId;
    const immUserWrapper = this.findImmUserWrapper(this.props);

    const { immAppConfig } = comprehend.globals;


    // We should only show the option to mark a user as an SSO user if account is configured for SSO
    const hasSSO = AccountUtil.hasSSOEnabled(immAppConfig);
    const hasApiAccess = AccountUtil.hasApiAccess(immAppConfig);
    const accountHasOversightScorecard = AccountUtil.hasOversightScorecard(immAppConfig);

    if (!immUserWrapper) {
      return (
        <div className='overlay'>
          <div className='spinner' />
        </div>
      );
    }

    const immUser = immUserWrapper.get('user');

    if (immUser.has('invalid')) {
      return <div>{FrontendConstants.CANNOT_FIND_USER}</div>;
    }

    const email = (
      <InputBlockContainer
        title={FrontendConstants.EMAIL}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            disabled={true}
            className='text-input email-input input-disabled'
            value={immUser.get('username')} />
        )} />
    );

    const lastName = (
      <InputBlockContainer
        title={FrontendConstants.LAST_NAME}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            disabled={true}
            className='text-input last-name-input input-disabled'
            value={immUser.get('lastName')} />
        )} />
    );

    const firstName = (
      <InputBlockContainer
        title={FrontendConstants.FIRST_NAME}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            disabled={true}
            className='text-input first-name-input input-disabled'
            value={immUser.get('firstName')} />
        )} />
    );

    const isRegistered = immUserWrapper.getIn(['user', 'isRegistered'], false);
    const userEntityState = immUserWrapper.getIn(['userEntity', 'userEntityState']);
    const isPending = userEntityState === ExposureSharingConstants.PENDING_CONFIRMATION;
    const status = Util.getUserStatus(immUserWrapper).text;
    const resendInvitationButton = isPending
      ? <Button
        icon='icon-envelop btn-resend-invitation'
        children='Re-send registration link'
        isSecondary={true}
        onClick={AdminActions.resendInvitationLink.bind(null,
          userId,
          AdminActions.createStatusMessage.bind(null,
            FrontendConstants.RESENT_INVITATION_EMAIL_TO_NEW_USER(immUser.get('username')),
            StatusMessageTypeConstants.TOAST_SUCCESS))}
      />
      : null;

    // Do not show resetPasswordButton when the user is registered and is pending on this account
    const isSSOUser = this.state.savedUserDetails.isSSOUser;

    const { currentRole } = this.state;
    const rolesDropdown = immAppConfig.get('isSuperAdmin') ? (<Combobox
      className='roles-dropdown'
      placeholder=''
      value={currentRole}
      labelKey='value'
      valueKey='value'
      onChange={this.onChangeRole.bind(this)}
      options={USER_ROLES}
    />) : (
        <Combobox
            className='roles-dropdown'
            placeholder=''
            value={currentRole}
            labelKey='value'
            valueKey='value'
            onChange={this.onChangeRole.bind(this)}
            options={USER_ROLES}
            disabled={true}
        />
    );

    const rolesDropdownBlock = (
      <div className='input-block'>
        <span className='input-title'>{FrontendConstants.USER_TYPE}</span>
        <span className='input-hint' onClick={this.displayRoleDefinitions}>
          {FrontendConstants.VIEW_USER_TYPE_DEFINITIONS}
        </span>
        {rolesDropdown}
      </div>);

    const dataAccessGroupsDropdownBlock = (
      <div className={cx('input-block', 'permissions-dropdown-block')}>
        <span className='input-title'>{FrontendConstants.DATA_ACCESS_GROUP}</span>
        <Combobox
          className='data-access-groups-dropdown'
          placeholder=''
          value={this.state.currentDataAccessGroupId}
          labelKey='dataAccessProfileName'
          valueKey='id'
          onChange={this.onChangeDataAccessGroup.bind(this)}
          options={immAdminStore.get('dataAccessGroupsList')}
        />
      </div>
    );

    const reviewRolesDropdown = (
      <Combobox
        className='review-roles-dropdown'
        placeholder={FrontendConstants.NONE}
        value={this.state.immCurrentReviewRoles}
        labelKey='label'
        valueKey='value'
        onChange={this.onChangeReviewRole.bind(this)}
        multi={true}
        options={this.state.immReviewRoles}
      />
    );

    const reviewRolesDropdownBlock = (
      <div className={cx('input-block', 'permissions-dropdown-block')}>
        <span className='input-title'>{FrontendConstants.DATA_REVIEW_ROLES}</span>
        {reviewRolesDropdown}
      </div>
    );

    const updateButton = <Button
      icon='icon-loop2 btn-update'
      children={FrontendConstants.UPDATE}
      isPrimary={true}
      onClick={this.HandleUpdate}
      isDisabled={!this.hasChanges()}
    />;

    const cancelButton = <Button
      icon='btn-cancel'
      children={FrontendConstants.CANCEL}
      isSecondary={true}
      onClick={this.HandleCancel}
      classes={{ 'cancel': true }}
    />;

    const isSSOToggleButton = hasSSO
      ? (
        <div className='sso-user-toggle'>
          <div className='sso-user-toggle-button-header input-title'>
            {FrontendConstants.USE_SSO}
          </div>
          <div className='sso-user-toggle-button-wrapper'>
            <ToggleButton
              className='sso-user-toggle-button'
              isActive={this.state.currentUserDetails.isSSOUser || false}
              activeText={FrontendConstants.CHECKMARK}
              onClick={this.HandleToggleSSO}
            />
          </div>
        </div>
      )
      : '';

    const hasApiAccessButton = hasApiAccess
      ? (
        <div className='api-access-toggle'>
          <div className='api-access-toggle-button-header input-title'>
            {FrontendConstants.API_ACCESS}
          </div>
          <div className='api-access-toggle-button-wrapper'>
            <ToggleButton
              className='api-user-toggle-button'
              isActive={this.state.currentUserDetails.hasApiAccess || false}
              activeText={FrontendConstants.CHECKMARK}
              onClick={this.HandleToggleApiAccess}
            />
          </div>
        </div>
      )
      : '';

    // Basic users CANNOT edit the Oversight Scorecard configurations / groups
    const immOversightScorecardAccessOptions = currentRole !== FrontendConstants.ACCOUNT_ROLE_BASIC
      ? IndividualPermissions
      : IndividualPermissions.filter(obj => obj.value !== AccessPermissionsConstants.EDIT);

    const oversightScorecardAccessDropdownBlock = accountHasOversightScorecard
      ? (
        <div className={cx('input-block', 'oversight-access-dropdown-block')}>
          <span className='input-title'>{FrontendConstants.OVERSIGHT_SCORECARD_ACCESS}</span>
          <Combobox
            className='oversight-scorecard-access-dropdown'
            placeHolder=''
            value={this.state.currentOversightScorecardAccess}
            onChange={this.HandleChangeOversightScorecardAccess}
            options={immOversightScorecardAccessOptions}
          />
        </div>
      )
      : '';

    const taskAccessDropdown = (
      <div className={cx('input-block', 'task-access-dropdown-block')}>
        <span className='input-title'>{FrontendConstants.TASK_ACCESS}</span>
        <Combobox
          className='task-access-dropdown'
          placeHolder=''
          value={this.state.currentTaskAccess}
          onChange={this.HandleChangeTaskAccess}
          options={IndividualPermissions}
        />
      </div>
    );

    const ractAccessDropdown = AccountUtil.hasFeature(comprehend.globals.immAppConfig, accountFeatures.RACT) ? (
        <div className={cx('input-block', 'ract-access-dropdown-block')}>
          <span className='input-title'>{FrontendConstants.RACT_ACCESS}</span>
          <Combobox
              className='ract-access-dropdown'
              placeHolder=''
              value={this.state.currentRactAccess}
              onChange={this.HandleChangeRactAccess}
              options={IndividualPermissions}
          />
        </div>
    ) : null;

    const defaultOSEditVisible = accountHasOversightScorecard
      && currentRole !== FrontendConstants.ACCOUNT_ROLE_BASIC
      && this.state.currentOversightScorecardAccess === AccessPermissionsConstants.EDIT;
    const hasEditDefaultOSProfileButton = defaultOSEditVisible
      ? (
        <div className='oversight-scorecard-edit-default-profile-toggle'>
          <div className='oversight-scorecard-edit-default-profile-toggle-button-header input-title'>
            {FrontendConstants.CAN_EDIT_DEFAULT_OVERSIGHT_SCORECARD_PROFILE}
          </div>
          <div className='oversight-scorecard-edit-default-profile-toggle-button-wrapper'>
            <ToggleButton
              className='oversight-scorecard-edit-default-profile-toggle-button'
              isActive={this.state.currentHasEditDefaultOSProfile || false}
              activeText={FrontendConstants.CHECKMARK}
              onClick={this.HandleToggleEditDefaultOSProfile}
            />
          </div>
        </div>
      )
      : '';

    const oversightScorecardOptions = (
      <div className='oversight-scorecard-options'>
        {oversightScorecardAccessDropdownBlock}
        {hasEditDefaultOSProfileButton}
      </div>
    )

    // TODO: avoid js width and height calc.
    return (
      <div className='admin-tab user-management-tab user-management-user-detail'
        style={{ height: this.props.height, width: this.props.width }}
      >
        <div className='page-header'>
          <div className='title'>{FrontendConstants.DETAILS}</div>
          <div className='admin-user-details-buttons'>
            {updateButton}
            {cancelButton}
          </div>
        </div>
        <div className='admin-user-details-page-body'>
          <div className='admin-user-details'>
            <div className='section-header'>
              {FrontendConstants.USER_DETAILS}
            </div>
            {email}
            {lastName}
            {firstName}
            <div className='input-block'>
              <span className='input-title colon'>{FrontendConstants.ACCOUNT_STATUS}</span>
              <span className='status'>{status}</span>
            </div>
            {rolesDropdownBlock}
          </div>
          <div className='admin-user-details-permissions-pane'>
            <div className='section-header'>
              {FrontendConstants.USER_PERMISSIONS}
            </div>
            {reviewRolesDropdownBlock}
            {dataAccessGroupsDropdownBlock}
            {isSSOToggleButton}
            {hasApiAccessButton}
            {taskAccessDropdown}
            {oversightScorecardOptions}
            {ractAccessDropdown}
          </div>
        </div>
      </div>
    );
  }
}

module.exports = UserDetail;
export default UserDetail;
