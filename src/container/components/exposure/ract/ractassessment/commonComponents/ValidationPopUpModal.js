import React from 'react';
import PropTypes from 'prop-types';
import FrontEndConstant from '../../../../../constants/FrontendConstants';

const ValidationPopUpModal = (props) => {

  const { show, fields, modalContentText, headerText } = props;

  if (show) {
    const fieldText = (
      <React.Fragment>
        <span className="modal-dialog-content-text">
          {FrontEndConstant.RACT_ASSESSMENT_VALIDATION_MSG}
        </span>
        <ul className='validation-list'>
          {
            fields && fields.map((val) => (
              <li>{val}</li>
            ))
          }
        </ul>
      </React.Fragment>
    );

    return (
      <React.Fragment>
        <div className="modal-dialog-underlay modal-underlay virtual-table">
          <div className="virtual-table-row">
            <div className="virtual-table-cell">
              <div className="modal-dialog">
                <div className="modal-dialog-closer" onClick={() => props.close()}>
                </div>
                <div className="modal-dialog-content">
                  <div>
                    <div className="modal-dialog-header">
                      <span className="icon icon-WarningCircle"></span>
                      <span className="modal-dialog-header-text">{headerText}</span>
                    </div>
                    <div className="modal-dialog-main">
                      {fields ? fieldText : null}
                      {modalContentText ? <span className="modal-dialog-content-text">{modalContentText}</span> : null}
                    </div>
                    <div className="modal-dialog-footer">
                      <div className="btn btn-primary" onClick={() => props.close()}>
                        <div className="icon icon icon-arrow-left2">
                        </div>
                        Go Back
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

ValidationPopUpModal.PropTypes={
  show: PropTypes.bool,
  fields: PropTypes.array,
  modalContentText: PropTypes.string,
  headerText: PropTypes.string,
}

export default ValidationPopUpModal;
