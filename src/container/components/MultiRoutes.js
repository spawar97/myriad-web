import { useState, useRef } from 'react';

const MultiRoutes = (props) => {
  const [setActive, setActiveState] = useState("");
  const [setHeight, setHeightState] = useState("0px");
  const content = useRef(null);

  function toggleAccordion() {
    const height = content.current.scrollHeight;
    setActiveState(setActive === "" ? "active" : "");
    setHeightState(
      setActive === "active" ? "0px" : `${60}px`,
    );
  }

  function resetAccordion() {
    setActiveState('');
    setHeightState("0px");
  }

  let arr = [];
  for (const [key, value] of Object.entries(props.icon['Sub Menu'])) {
    let Obj = {};
    Obj[key] = value;
    arr.push(Obj);
  }

  return (
    <div className="multiTab-container" onClick={() => toggleAccordion()}
      onMouseLeave={() => resetAccordion()}>
      <div className={`multiTab-grid ${setActive}`}>
        <div className="multiTab-parent-text">{props.name}</div>
      </div>
      <div
        ref={content}
        style={{ maxHeight: `${setHeight}` }}
        className="multiTab__content"
      >
        {
          arr.map((obj, i) => {
            let name = Object.keys(obj).join('');
            return (
              <div key={name} className="MultiTab-Text" onClick={(e) => { e.stopPropagation(); props.redirectMenu(name && name.toLowerCase()) }}>
                {name}
              </div>);
          })
        }
      </div>
    </div>
  );
}

export default MultiRoutes;
