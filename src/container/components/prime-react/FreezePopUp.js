import React, { useRef, useEffect } from "react";
import { Dropdown } from 'primereact-opt/dropdown';
import { MultiSelect } from 'primereact-opt/multiselect';

const FreezePopUp = (props) => {
  const { show, colOptions, freezedColumns, onColumnFreeze, setShowModal, showHideMetricProps, colFreezeOptions, isMultiple } = props;

  const {
    toggleColumnLabel,
    cols,
    onColumnToggle
  } = showHideMetricProps;

  const wrapperRef = useRef(null);

  useEffect(() => {
    let classNames = ["p-multiselect-item", "freeze-dropdown"];

    function handleClickOutside(event) {
      let parent = event.target.offsetParent;

      if (wrapperRef.current && !classNames.includes(parent) && !wrapperRef.current.contains(event.target) && !wrapperRef.current.parentElement.contains(event.target) && !parent.classList.contains("p-multiselect-panel") && !parent.classList.contains("p-multiselect-item")) {
        setShowModal(false);
      }
    }
    // Bind the event listener
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [wrapperRef]);

  const optionSelected = (e) => {
    onColumnFreeze(e);
    if(!isMultiple){
      setShowModal(false);
    }
  }


  const selectedItemTemplate = (option) => {
    if (option) {
      return option.displayName + ', ';
    }
  }

  const selectedItemTemplateMultiple = (option) => {
    if (option) {
      return option.displayName + ', ';
    }
  }

  if (show) {
    return <div id="myModal" className="create-ract-template custom-risk-subcategory-modal modal prime-table-config" ref={wrapperRef}>
      <div className="freeze-widget-container">
        <label className="freeze-label"> Freeze Columns </label>
        { isMultiple ? <MultiSelect 
          value={freezedColumns}
          options={colFreezeOptions}
          onChange={(e) => optionSelected(e)}
          className={"freeze-dropdown"}
          selectedItemTemplate={selectedItemTemplateMultiple}
        /> : <Dropdown 
        value={freezedColumns}
        options={colFreezeOptions}
        onChange={(e) => optionSelected(e)}
        className={"freeze-dropdown"}
      /> }
        
      </div>
      <div className="show-hide-container">
        <label className="freeze-label"> {toggleColumnLabel}  </label>
        <MultiSelect
          className={"show-hide-dropdown"}
          value={cols}
          options={colOptions}
          onChange={(e) => onColumnToggle(e)}
          selectedItemTemplate={selectedItemTemplate}
        />
      </div>
    </div>
  }

}

export default React.memo(FreezePopUp);
