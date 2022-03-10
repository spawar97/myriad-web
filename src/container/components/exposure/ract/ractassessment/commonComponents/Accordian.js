import React, { useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import "./Accordian.scss";

const Accordion = (props) => {

  const [setActive, setActiveState] = useState("");
  const [setRotate, setRotateState] = useState("icon-DownArrow");
  const content = useRef(null);

  const { current, category, index, active, closeAcc } = props;

  const toggleAccordion = (e) => {
    e.preventDefault();
    closeAcc(props, setActive);
  }

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
    <div className="ract-assessment-accordion">
    <div className="accordion__section">
      <button className={`accordion ${setActive} ${index == 0 ? 'first-accordion' : 'normal'}`} onClick={(e) => toggleAccordion(e)}>
        <p className="accordion__title" id={current.enabled ? "enabled" : "disabled"}>{current.name}</p>
        {current && current.type == "custom" ? <span className="icon-close-alt remove-subcategory color" onClick={(e) => deleteSubcategory(e, current.id, category.id)} /> : null}
        <span className={`${setRotate} arrow-icon right-fixed color`}></span>
      </button>
      <div ref={content} className={`accordion_content ${setActive ? "opened" : "closed"}`}>
        <div className="accordion__text">
          {props.content}
        </div>
      </div>
    </div>
    </div>
  );
}

Accordion.PropTypes = {
  current: PropTypes.object,
  category: PropTypes.object,
  index: PropTypes.number,
  active: PropTypes.object,
  closeAcc: PropTypes.func,
}

export default React.memo(Accordion);
