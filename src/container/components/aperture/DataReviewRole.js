import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import cx from 'classnames';

import RouteNameConstants from '../../constants/RouteNameConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import Util from '../../util/util';

import ContentPlaceholder from '../ContentPlaceholder';
import Button from '../Button';
import InputBlockContainer from '../InputBlockContainer';
import InputWithPlaceholder from '../InputWithPlaceholder';
import {Key, RequestKey, GetOutstandingRequest} from '../../stores/DataReviewStore';
import DataReviewActions from "../../actions/DataReviewActions";
import AdminActions from "../../actions/AdminActions";

class DataReviewRole extends React.PureComponent {
  static propTypes = {
    immDataReviewStore: PropTypes.object,
    params: PropTypes.shape({
      dataReviewRoleId: PropTypes.string,
    }),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      isEditMode: props.params && props.params.dataReviewRoleId,
      workingDataReviewRole: Imm.Map(),
      baseDataReviewRole: Imm.Map(),
      isReady: false,
    };
  }

  componentDidMount() {
    if (this.state.isEditMode) {
      const dataReviewRoleId = this.props.params.dataReviewRoleId;
      DataReviewActions.loadDataReviewRole(dataReviewRoleId);
    }
    else {
      this.setState({isReady: true});
    }
  }

  componentDidUpdate(prevProps) {
    const {isReady, isEditMode} = this.state;
    const {immDataReviewStore} = this.props;
    if (isEditMode && !isReady) {
      if (!GetOutstandingRequest(RequestKey.loadRole)) {
        const dataReviewRoleId = this.props.params.dataReviewRoleId;
        const immDataReviewRole = immDataReviewStore.getIn(
          [Key.dataReviewRoles, dataReviewRoleId]
        );
        this.setState({
          isReady: true,
          baseDataReviewRole: immDataReviewRole,
          workingDataReviewRole: immDataReviewRole,
        });
      }
    }
  }

  _handleReviewRoleNameChange(e) {
    let immDataReviewRole = this.state.workingDataReviewRole;
    const name = e.target.value;

    immDataReviewRole = immDataReviewRole.set('name', name);
    this.setState({
      workingDataReviewRole: immDataReviewRole,
    });
  }

  _handleSubmit() {
    const {isEditMode, workingDataReviewRole} = this.state;
    const isValid = this._validateReviewRole();

    if (isValid) {
      if (isEditMode) {
        const dataReviewRoleId = this.props.params.dataReviewRoleId;
        DataReviewActions.updateDataReviewRole(dataReviewRoleId,
          workingDataReviewRole,
          this._finishSubmitSuccessfully.bind(this)
        );
      }
      else {
        DataReviewActions.createDataReviewRole(
          workingDataReviewRole,
          this._finishSubmitSuccessfully.bind(this)
        );
      }
    }
  }

  _validateReviewRole() {
    const {workingDataReviewRole} = this.state;
    const name = workingDataReviewRole.get('name', '');

    let isValid = true;
    if (name.length <= 0 || !Util.isValidTitle(name)) {
      isValid = false;
      AdminActions.createStatusMessage(
        FrontendConstants.INVALID_DATA_REVIEW_ROLE_NAME_LENGTH,
        StatusMessageTypeConstants.WARNING
      );
    }

    return isValid;
  }

  _finishSubmitSuccessfully() {
    this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES);
  }

  _canSave() {
    const {workingDataReviewRole, baseDataReviewRole} = this.state;
    const hasChanged = !Imm.is(workingDataReviewRole, baseDataReviewRole);
    const isEditable = !workingDataReviewRole.get('isDefault', false);

    return hasChanged && isEditable;
  }

  render() {
    const { isReady, isEditMode, workingDataReviewRole } = this.state;
    const dataReviewRoleName = workingDataReviewRole.get('name', '');

    let content;
    if (!isReady) {
      content = <ContentPlaceholder />;
    }
    else {
      const title = isEditMode
        ? FrontendConstants.EDIT_DATA_REVIEW_ROLE
        : FrontendConstants.ADD_DATA_REVIEW_ROLE;

      const isEditable = !workingDataReviewRole.get('isDefault', false);

      const dataReviewRoleNameInput = <InputBlockContainer
        title={FrontendConstants.DATA_REVIEW_ROLE_NAME}
        titleClass='required'
        inputComponent={
          <InputWithPlaceholder
            type='text'
            className={ cx('text-input', 'name-input',
              {'invalid-input': this.state.dataAccessGroupNameErrorMessage})
            }
            onChange={this._handleReviewRoleNameChange.bind(this)}
            value={dataReviewRoleName}
            maxLength={100}
            disabled={!isEditable}
          />}
      />;

      const submitButtonInnerContent = isEditMode
          ? FrontendConstants.UPDATE
          : FrontendConstants.ADD_THIS_DATA_REVIEW_ROLE;
      const submitButton = <Button
        icon={isEditMode ? 'icon-loop2' : 'icon-plus-circle2'}
        children={submitButtonInnerContent}
        isPrimary={true}
        isDisabled={!this._canSave()}
        onClick={this._handleSubmit.bind(this)}
      />;

      const cancelButton = <Button
        icon='icon-close'
        children={FrontendConstants.CANCEL}
        isSecondary={true}
        onClick={() => this.context.router.push(RouteNameConstants.APERTURE_DATA_REVIEW_ROLES)}
      />;

      content = (
        <div className='data-review-role-editor-content'>
          <div className='page-header'>
            <div className='title'>
              {title}
            </div>
          </div>
          <div className='section-header'>
            <div className='title'>
              {FrontendConstants.DETAILS}
            </div>
          </div>
          {dataReviewRoleNameInput}
          <div className='data-review-role-buttons'>
            {submitButton}
            {cancelButton}
          </div>
        </div>
      );
    }


    return (
      <div className={cx('admin-tab', 'user-management-tab', 'data-review-role-editor')}>
        {content}
      </div>
    );
  }
}

export default DataReviewRole;
