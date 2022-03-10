import PropTypes from "prop-types";
import React from 'react';
import Imm from 'immutable';
import FrontendConstants from '../../constants/FrontendConstants';
import cx from 'classnames';
import Button from '../Button'

class GenericDeleteWarning extends React.PureComponent {
  static displayName = 'GenericDeleteWarning';
  static propTypes = {
    callback: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
    immDeletionTargetLabels: PropTypes.instanceOf(Imm.List).isRequired,
  };

  render() {
    const { handleCancel, callback, immDeletionTargetLabels } = this.props;
    const deletedTargets = (
      <ul className='deleted-items-list'>
        {immDeletionTargetLabels.map((targetLabel, index) => {
          return (
            <li key={index} className='deleted-item'>
              {targetLabel}
            </li>
          );
        })}
      </ul>
    );

    return (
      <div>
        <div className='modal-dialog-header'>
          <span className='modal-dialog-header-text'>
            {FrontendConstants.ARE_YOU_SURE}
          </span>
        </div>
        <div className={cx('modal-dialog-main', 'modal-dialog-delete-item')}>
          {deletedTargets}
          <div className='modal-dialog-delete-action'>
            <span>{FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE}</span>
            <span className='modal-dialog-delete-emphasis'>{FrontendConstants.PLEASE_CONFIRM_DELETE}</span>
          </div>
        </div>
        <div className='modal-dialog-footer'>
          <Button
              icon='icon icon-remove'
              isPrimary={true}
              onClick={callback}
              children={FrontendConstants.DELETE}
          />
          <Button
              isSecondary={true}
              onClick={handleCancel}
              children={FrontendConstants.CANCEL}
          />
        </div>
      </div>
    );
  }
}

export default GenericDeleteWarning;
