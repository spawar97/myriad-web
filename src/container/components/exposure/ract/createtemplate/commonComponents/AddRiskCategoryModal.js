import React from 'react';
import { PropTypes } from 'prop-types';

const AddRiskCategoryModal = (props) => {

  window.onclick = function (event) {
    if (event.target == document.getElementById("myModal")) {
      props.onClose();
    }
  };

  if(!props.show){
    return null;
  }
  return <div id="myModal" className="create-ract-template modal">
    <div className="create-ract-template modal-content">
      <div className="modal-header">
        <span className="close" onClick={(e) => props.onClose(e)}>&times;</span>
        <div className="create-ract-template modal-header-div">
          Add Custom Risk Category
        </div>
      </div>
      <div className="create-ract-template modal-body">
        <table>
          <tr>
            <td className="input-text-container">
              <input type="text" id="fname" className='add-modal-input' name="categoryName" placeholder="Custom Category Name" onChange={(e) => props.onHandleChange(e)} />
            </td>
            <td className="add-btn-container">
              <button className="btn btn-align btn-primary" onClick={() => props.onAdd()}>Add</button>
            </td>
          </tr>
        </table>
      </div>
    </div>
  </div>
}

AddRiskCategoryModal.PropTypes = {
  onAdd: PropTypes.func,
  onHandleChange: PropTypes.func,
  onClose: PropTypes.func,
  show: PropTypes.bool
};

export default React.memo(AddRiskCategoryModal);
