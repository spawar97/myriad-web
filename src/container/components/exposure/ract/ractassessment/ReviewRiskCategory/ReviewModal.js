import React from 'react';
import PropTypes from 'prop-types';
import './ReviewModal.scss';

const ReviewModal = (props) => {

  const { show, headerText, cancelText, submitText, placeholder, name,
    onSubmit, onClose, onInputReviewHandleChange, reviewCommentError } = props;

  const submitComment = (name) => {
    onSubmit(name);
  }

  if (show) {
    return (
      <React.Fragment>
        <div className="modal-dialog-underlay modal-underlay virtual-table">
          <div className="virtual-table-row">
            <div className="virtual-table-cell">
              <div className="modal-dialog">
                <div className="modal-dialog-closer" onClick={() => onClose()}>
                </div>
                <div className="modal-dialog-content">
                  <div className='Review-Modal'>
                    <div className="modal-dialog-header">
                      <span className="icon icon-pencil"></span>
                      <span className="modal-dialog-header-text">{headerText}</span>
                    </div>
                    <div className="modal-dialog-main">
                      <span className="modal-dialog-content-text">
                        <textarea
                          type="text"
                          id={`review${name}`}
                          placeholder={placeholder ? placeholder : ''}
                          name={`review${name}`}
                          onChange={(e) => onInputReviewHandleChange(e, name)}
                        />
                      </span>
                      {reviewCommentError ?
                        <span className="review-modal-errors">
                          <text className="review-modal-errors-text">
                            {`${name} Comment Should Not Be Empty.`}
                          </text>
                        </span>
                        : null
                      }
                    </div>
                    <div className="modal-dialog-footer">
                      <div className="btn btn-primary" onClick={() => onClose()}>
                        <div className="icon icon icon-arrow-left2">
                        </div>
                        {cancelText}
                      </div>
                      <div className="btn btn-secondary" onClick={() => submitComment(name)}>
                        <div className="icon icon icon-checkmark-circle">
                        </div>
                        {submitText}
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

ReviewModal.PropTypes = {
  show: PropTypes.bool,
  headerText: PropTypes.string,
  cancelText: PropTypes.string,
  submitText: PropTypes.string,
  placeholder: PropTypes.string,
  name: PropTypes.string,
  onSubmit: PropTypes.func,
  onClose: PropTypes.func,
  onInputReviewHandleChange: PropTypes.func
}

export default React.memo(ReviewModal);
