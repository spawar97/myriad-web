import React from 'react';
import PropTypes from 'prop-types';
import './modal.scss';

const AddModal = (props) => {
  
  const { show, title, onClose, placeholder, onAdd, onHandleChange,
          showError, errorText, isLoading } = props;

  if (!show) {
    return null;
  }

  return (
    <div className="assessment-modal modal">
      <div className="assessment-modal-content modal-content">
        <div className="assessment-modal-header modal-header">
          <button 
           className="modal-close"
           onClick={(e) => onClose(e)}
           disabled={isLoading}
          >
            x
          </button>
          <div className="assessment-modal-header-div modal-header-div">
            {title}
          </div>
        </div>
        <div className="assessment-modal-body modal-body">
          <table id='add-modal-table'>
            <tr>
              <td className="modal-input-container">
                <input
                 type="text"
                 id="fname"
                 className='add-modal-input'
                 placeholder={placeholder ? placeholder : ''}
                 name="categoryName"
                 autoFocus
                 onChange={(e) => onHandleChange(e)}
                />
              </td>
              <td className="add-btn-container">
                <button id='ract-modal-add'
                 className="assessment-add btn btn-align btn-primary" 
                 onClick={() => onAdd(props)}
                 disabled={isLoading}
                >
                   Add
                </button>
              </td>
            </tr>
          </table>
          {showError ?
            <span className="add-modal-errors-grid">
              <text className='add-modal-errors'>
                {errorText}
              </text>
            </span> : null}
        </div>
      </div>
    </div>);
}

AddModal.PropTypes = {
  show: PropTypes.bool,
  title: PropTypes.string,
  onClose: PropTypes.func,
  placeholder: PropTypes.string,
  onAdd: PropTypes.func,
  onHandleChange: PropTypes.func
}

export default AddModal;
