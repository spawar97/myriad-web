import React, { useState, useRef, useEffect } from "react";
import { PropTypes } from 'prop-types';
import RactScorecardStore from "../../../../../stores/RactScorecardStore";

const Accordion = (props) => {
  const [setActive, setActiveState] = useState("");
  const [setRotate, setRotateState] = useState("icon-DownArrow");
  const immRactStore = RactScorecardStore.getStore();
  const OOBSubCategoriesData = immRactStore.get('OOBSubCategoriesData');
  const content = useRef(null);

  const toggleAccordion = (e) => {
    e.preventDefault();
    props.closeAcc(props.index, setActive);
  }

  const deleteSubcategory = (e, id, categoryId) => {
    e.stopPropagation();
    props.remove(e, id, categoryId);
  }
    
  const { current, category, index, active } = props;

  useEffect(() => {
    if (active.accordian === index) {
      setActiveState(active.state ? "" : "active");
      setRotateState(active.state ? "icon-DownArrow" : "icon-UpArrow");
    }
    else {
      setActiveState("");
      setRotateState("icon-DownArrow");
    }
  }, [active]);

  useEffect(() => {
    setActiveState("");
    setRotateState("icon-DownArrow");
  }, [category]);

  return (
    <div className="accordion__section">
      { !current.isDeleted && !category.isDeleted ? <button className={`accordion ${setActive} ${index == 0 ? 'first-accordion' : 'normal'}`} onClick={(e) => toggleAccordion(e)}>
        <p className="accordion__title" id={current.enable ? "enabled" : "disabled"}>{current.name}</p>
        {!(OOBSubCategoriesData.includes((current.name).toLowerCase())) && !props.isView && current.enable && category.enable ?  <span className="icon-close-alt remove-subcategory color" onClick={(e) => deleteSubcategory(e, current.id, category.id)} /> : null }
        <span className={`${setRotate} arrow-icon right-fixed color`}></span>
      </button>: ''}
      { !current.isDeleted && !category.isDeleted  ? <div ref={content} className={`accordion__content ${setActive ? "opened" : "closed"}`}>
        <div className="accordion__text">
          {props.content}
        </div>
      </div> : ''}
    </div>
  );
}

Accordion.PropTypes = {
  current: PropTypes.object,
  active: PropTypes.object
};

export default React.memo(Accordion);
