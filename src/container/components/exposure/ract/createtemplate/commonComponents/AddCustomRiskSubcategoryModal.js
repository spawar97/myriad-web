import React, { useRef, useEffect } from "react";
import { PropTypes } from 'prop-types';

const AddCustomRiskSubcategoryModal = (props) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        props.onClose();
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  if(!props.show){
    return null;
  }
  return <div id="myModal" className="create-ract-template custom-risk-subcategory-modal modal" ref={wrapperRef}>
    <div className="create-ract-template custom-risk-subcategory-modal-content modal-content">
      <div className="custom-risk-subcategory-modal-header modal-header">
        <span className="close" onClick={(e) => props.onClose(e)}>&times;</span>
        <div className="create-ract-template custom-risk-subcategory-modal-header-div ract-add-button modal-header-div">
          Add Custom Risk Subcategory
        </div>
      </div>
      <div className="create-ract-template custom-risk-subcategory-modal-body modal-body">
        <table>
          <tr>
            <td className="input-text-container">
              <input type="text" id="fname" className='add-modal-input' name="subCategoryName" placeholder="Custom Subcategory Name" onChange={(e) => props.onHandleChange(e)} />
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

AddCustomRiskSubcategoryModal.PropTypes = {
  onAdd: PropTypes.func,
  onHandleChange: PropTypes.func,
  onClose: PropTypes.func,
  show: PropTypes.bool
};

export default React.memo(AddCustomRiskSubcategoryModal);
