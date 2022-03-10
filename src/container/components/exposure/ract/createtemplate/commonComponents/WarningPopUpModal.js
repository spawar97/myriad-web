import React from 'react';
import { PropTypes } from 'prop-types';
import FrontendConstants from '../../../../../constants/FrontendConstants';

const WarningPopUpModal = (props) => {

  const discardChanges = () => {
    if (name === FrontendConstants.RACT_ASSESSMENT_TAB_CHANGE) {
      discard();
      close();
    } else {
      discard();
    }
  }

  const { show, discard, close, warningHeaderText, warningContextText, yesButtonText, noButtonText, name } = props;

  if (show) {
    return  (<React.Fragment>
      <div className="modal-dialog-underlay modal-underlay virtual-table">
        <div className="virtual-table-row">
          <div className="virtual-table-cell">
            <div className="modal-dialog">
            <div className="modal-dialog-closer" onClick={() => name === FrontendConstants.RACT_ASSESSMENT_TAB_CHANGE ? close(): discard()}></div>
              <div className="modal-dialog-content">
                <div>
                  <div className="modal-dialog-header">
                  <span className="icon icon-WarningCircle"></span>
                  <span className="modal-dialog-header-text">{warningHeaderText}</span>
                </div>
                <div className="modal-dialog-main">
                  <span className="modal-dialog-content-text">{warningContextText}</span>
                </div>
                <div className="modal-dialog-footer">
                 <div className="btn btn-primary" onClick={() => close()}>
                    <div className="icon icon icon-arrow-left2"></div>
                      {yesButtonText}
                  </div>
                  <div className="btn btn-secondary" onClick={() => discardChanges()}>
                   <div className="icon icon icon-remove"></div>
                      {noButtonText}
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
  }
  else {
    return null;
  }
}

WarningPopUpModal.PropTypes = {
  close: PropTypes.func,
  discard: PropTypes.func,
  show: PropTypes.bool
};

export default React.memo(WarningPopUpModal);
