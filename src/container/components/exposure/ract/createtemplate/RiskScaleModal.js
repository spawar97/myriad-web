import React, { useState, useEffect, useRef } from "react";
import { PropTypes } from 'prop-types';
import FrontendConstants from "../../../../constants/FrontendConstants";

const RiskScaleModal = (props) => {
  const { show, data, isView} = props;
  const [selected, setSelected] = useState(data.riskScale);
  const handleOptionChange = (e) => {
    setSelected(e.target.value);
  }

  const update = () => {
    props.updateRiskScale(selected);
    props.close()
  }

  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        cancelButton();
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);


  const cancelButton = () => {
    props.close()
    setSelected(data.riskScale);
  }

  if (show) {
    return <React.Fragment>
      <div className="risk-scale-modal" ref={wrapperRef}>
        <div className="risk-scale-container">
          <div className="risk-scale-title subtitle">
            Risk Scale:
          </div>
          <table className="risk-scale-table">
            <thead/>
            <tbody>
            {!isView ?
              <tr className="radio-labels">
                <td className="imp-probability">Impact/Probability </td>
                <td className="padding-left">
                  <div className="radio">
                    <input
                      id="1"
                      type="radio"
                      value={FrontendConstants.RISK_SCALE_ONE_TO_FIVE}
                      checked={selected == FrontendConstants.RISK_SCALE_ONE_TO_FIVE}
                      onChange={handleOptionChange}
                    />
                    <label htmlFor={`1`} className="radio-label">{FrontendConstants.RISK_SCALE_ONE_TO_FIVE}</label>
                  </div>
                </td>
                <td className="padding-left">
                  <div className="radio">
                    <input
                      id="2"
                      type="radio"
                      value={FrontendConstants.RISK_SCALE_ONE_TO_TEN}
                      checked={selected == FrontendConstants.RISK_SCALE_ONE_TO_TEN}
                      onChange={handleOptionChange}
                    />
                    <label htmlFor={`2`} className="radio-label">{FrontendConstants.RISK_SCALE_ONE_TO_TEN}</label>
                  </div>
                </td>
              </tr> :  <tr className="radio-labels">
                <td className="imp-probability">Impact/Probability</td> <td className="padding-left">{data.riskScale}</td></tr>}
            </tbody>
          </table>
          <div className="risk-score-buttons">
            <button className="btn btn-secondary cancel" onClick={() => cancelButton()}>Cancel</button>
            {!isView ? <button className="btn btn-primary submit" onClick={() => update()} >Submit</button> :''}
          </div>
        </div>
      </div>
    </React.Fragment>;
  }
  else {
    return null
  }
}

RiskScaleModal.PropTypes = {
  close: PropTypes.func,
  show: PropTypes.bool,
  data: PropTypes.object
};

export default React.memo(RiskScaleModal);
