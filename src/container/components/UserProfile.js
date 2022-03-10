import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import cx from 'classnames';

//Constants
import FrontendConstants from '../constants/FrontendConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';

//Components
import Button from '../components/Button';
import Combobox from '../components/Combobox';
import InputBlockContainer from '../components/InputBlockContainer';
import InputWithPlaceholder from '../components/InputWithPlaceholder';
import ContentPlaceholder from '../components/ContentPlaceholder';

//Actions
import ExposureActions from "../actions/ExposureActions";

const RESET_PASSWORD_URL = '/reset-password';
const MAX_ORGANIZATION_SYMBOLS_LENGTH = 100;
const USER_DEFAULT_ORGANIZATION_ROLES = Imm.fromJS([
  { value: 'Medical Monitor' },
  { value: 'Data Manager' },
  { value: 'Trial Operations' },
  { value: 'CRO Manager' },
  { value: 'Site Manager' },
  { value: 'Vendor Manager' },
  { value: 'Executive Team' },
  { value: 'Other' }
]);
const OTHER_ROLE = 'Other';

export default class UserProfile extends React.Component {
  static displayName = 'UserProfile';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
  };

  constructor(props) {
    super(props);

    const setSelectedOrganizationRole = (immUserInfo) => {
      const organizationRole = immUserInfo.get('organizationRole');
      const isDefaultRolesIncludesCurrentRole = USER_DEFAULT_ORGANIZATION_ROLES
        .some(role => role.get('value') === organizationRole);
      let selectedOrganizationRole;

      if (!organizationRole) {
        selectedOrganizationRole = '';
      } else if (isDefaultRolesIncludesCurrentRole) {
        selectedOrganizationRole = organizationRole;
      } else {
        selectedOrganizationRole = OTHER_ROLE;
      }

      return selectedOrganizationRole;
    }

    const hasSSOEnabled = () => {
      const { immAppConfig } = comprehend.globals;
      const currentAccountId = immAppConfig.get('currentAccountId', '');
      const accountInfo = immAppConfig.getIn(['accountMap', currentAccountId, 'account'], Imm.Map());
  
      return accountInfo.get('idPUrl', false);
    };

    const immUserInfo = props.immExposureStore.get('userInfo');
    const selectedOrganizationRole = setSelectedOrganizationRole(immUserInfo);
    const isSSOAccount = hasSSOEnabled();

    this.state = {
      immNotChangedUserInfo: immUserInfo,
      immUserInfo,
      selectedOrganizationRole,
      isSSOAccount
    }
  }

  componentWillReceiveProps(nextProps) {
    const { immExposureStore } = this.props;
    const isUpdateUserFetching = immExposureStore.get('isUpdateUserFetching');
    const nextUpdateUserFetching = nextProps.immExposureStore.get('isUpdateUserFetching');

    if (isUpdateUserFetching !== nextUpdateUserFetching) {
      const immUserInfo = nextProps.immExposureStore.get('userInfo');
      this.setState({ immNotChangedUserInfo: immUserInfo });
    }
  }

  editUserField = (fieldType, value) => {
    let immUserInfo = this.state.immUserInfo;
    immUserInfo = immUserInfo.set(fieldType, value);
    this.setState({ immUserInfo });
  };

  renderEmail = () => (
    <InputBlockContainer
      title={FrontendConstants.EMAIL}
      inputComponent={(
        <InputWithPlaceholder
          type='text'
          disabled={true}
          className='text-input email-input input-disabled'
          value={this.state.immUserInfo.get('username')}
        />
      )}
    />
  );

  renderFirstName = () => {
    const { immUserInfo } = this.state;
    const firstName = immUserInfo.get('firstName');

    return (
      <InputBlockContainer
        title={FrontendConstants.FIRST_NAME}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            className={cx('text-input', 'first-name-input', {
              'not-filled': !firstName
            })}
            value={firstName}
            onChange={(event) => this.editUserField('firstName', event.target.value)}
            disabled={true}
          />
        )}
      />
    );
  };

  renderLastName = () => {
    const { immUserInfo } = this.state;
    const lastName = immUserInfo.get('lastName');

    return (
      <InputBlockContainer
        title={FrontendConstants.LAST_NAME}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            className={cx('text-input', 'first-name-input', {
              'not-filled': !lastName
            })}
            value={lastName}
            onChange={(event) => this.editUserField('lastName', event.target.value)}
            disabled={true}
          />
        )}
      />
    );
  };

  changeSelectedOrganizationRole = (value) => {
    this.setState({ selectedOrganizationRole: value });

    if (value === OTHER_ROLE) {
      this.editUserField('organizationRole', '');
    } else {
      this.editUserField('organizationRole', value);
    }
  }

  renderOrganizationRoleDropDown = () => (
    <InputBlockContainer
      title={FrontendConstants.ORGANIZATION_ROLE}
      inputComponent={(
        <Combobox
          className='organization-roles-dropdown'
          placeholder={FrontendConstants.PLEASE_SPECIFY}
          value={this.state.selectedOrganizationRole}
          labelKey='value'
          valueKey='value'
          onChange={this.changeSelectedOrganizationRole}
          options={USER_DEFAULT_ORGANIZATION_ROLES}
        />
      )}
    />

  );

  renderOrganizationRole = () => {
    const { immUserInfo } = this.state;
    const organizationRole = immUserInfo.get('organizationRole');

    return (
      <InputWithPlaceholder
        type='textarea'
        maxLength={MAX_ORGANIZATION_SYMBOLS_LENGTH}
        placeholder={FrontendConstants.PLEASE_SPECIFY}
        className='text-input organization-role-input'
        value={organizationRole}
        onChange={(event) => this.editUserField('organizationRole', event.target.value)}
      />
    );
  };

  renderPhoneNumber = () => {
    const { immUserInfo } = this.state;
    const phone = immUserInfo.get('phone');

    return (
      <InputBlockContainer
        title={FrontendConstants.PHONE_NUMBER}
        inputComponent={(
          <InputWithPlaceholder
            type='text'
            className='text-input phone-input'
            value={phone}
            onChange={(event) => this.editUserField('phone', event.target.value)}
          />
        )}
      />
    );
  };

  handleUpdate = () => {
    const { immUserInfo } = this.state;
    const isProfileValid = this.validateProfile();

    if (isProfileValid) {
      const trimmedUserInfo = this.trimUserInfo(immUserInfo);
      ExposureActions.updateUserInfo(trimmedUserInfo);
    }
  };

  trimUserInfo = (immUserInfo) => {
    const keysForTrim = [
      'firstName',
      'lastName',
      'phone',
      'organizationRole'
    ];

    let immTrimmedUserInfo = immUserInfo;
    immUserInfo.forEach((value, key) => {
      if (keysForTrim.includes(key)) {
        immTrimmedUserInfo = immTrimmedUserInfo.set(key, value.trim());
      }
    });

    return immTrimmedUserInfo;
  }

  hasChanges = () => {
    const { immUserInfo, immNotChangedUserInfo } = this.state;
    const trimmedUserInfo = this.trimUserInfo(immUserInfo);
    return !trimmedUserInfo.equals(immNotChangedUserInfo);
  }

  validateProfile = () => {
    const { immUserInfo } = this.state;
    const firstName = immUserInfo.get('firstName');
    const lastName = immUserInfo.get('lastName');

    const isFirstNameValid = !!firstName && !!firstName.trim();
    const isLastNameNameValid = !!lastName && !!lastName.trim();

    if (!isFirstNameValid || !isLastNameNameValid) {
      ExposureActions.createStatusMessage(FrontendConstants.USER_PROFILE_FIELDS_ERROR, StatusMessageTypeConstants.WARNING);
      return false;
    }

    return true;
  };

  render() {
    const { immExposureStore } = this.props;
    const { isSSOAccount } = this.state;
    const { selectedOrganizationRole } = this.state;
    const isOtherRoleSelected = selectedOrganizationRole === OTHER_ROLE;
    const isUpdateUserFetching = immExposureStore.get('isUpdateUserFetching');

    if (isUpdateUserFetching) {
      return <ContentPlaceholder />;
    }

    return (
      <div className='users-profile'>
        <div className='page-header'>
          <div className='title'>
            {FrontendConstants.YOUR_PROFILE}
          </div>
          <div className='user-profile-buttons'>
            <Button
              icon='icon-loop2 btn-success'
              children={FrontendConstants.UPDATE}
              isPrimary={true}
              onClick={this.handleUpdate}
              isDisabled={!this.hasChanges()}
            />
          </div>
        </div>
        <div className='user-detailes-section'>
          {this.renderFirstName()}
          {this.renderLastName()}
          {this.renderPhoneNumber()}
          {this.renderEmail()}
          {this.renderOrganizationRoleDropDown()}
          {isOtherRoleSelected && this.renderOrganizationRole()}
        </div>
      </div>
    );
  }
}
