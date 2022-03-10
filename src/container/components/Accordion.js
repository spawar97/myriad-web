import React, {useState, useRef} from "react";
import "../../stylesheets/modules/accordion.scss";
import {PropTypes} from "prop-types";

function Accordion(props) {
  const [setActive, setActiveState] = useState("");
  const [setHeight, setHeightState] = useState("0px");
  const content = useRef(null);

  function toggleAccordion() {
    const height = content.current.scrollHeight;
    setActiveState(setActive === "" ? "active" : "");
    setHeightState(
      setActive === "active" ? "0px" : `${height}px`,
    );
  }

  function resetAccordion() {
    setActiveState('');
    setHeightState("0px");
  }

  return (
    <div className="accordion__section" onClick={() => toggleAccordion()}
         onMouseLeave={() => resetAccordion()}>
      <button className={`accordion ${setActive}`}>
        <div className="accordion__title">{props.title}</div>
        <div className={'icon-accordion-right arrowColor accordionArrow'}/>
      </button>
      <div
        ref={content}
        style={{maxHeight: `${setHeight}`}}
        className="accordion__content"
      >
        <div className="accordion__text">
          {props.content}
        </div>
      </div>
    </div>
  );
}

export default Accordion;
