import React, { useState, useEffect } from "react";
import { PropTypes } from 'prop-types';
import RactScorecardStore from "../../../../stores/RactScorecardStore";

const RiskObjective = (props) => {
  const [objective, setObjective] = useState(props.objective);
  const immRactStore = RactScorecardStore.getStore();
  const OOBCategoriesData = immRactStore.get('OOBCategoriesData');
  const changeObjective = (e) => {
    setObjective(e.target.value);
    props.changeObjective(e.target.value);
  }

  const setEnable = () => {
    props.triggerEdit();
  }

  useEffect(() => {
    setObjective(props.objective)
  }, [props.objective]);

  useEffect(() => {
    props.disableEdit();
  }, [props.current.id])

  return <React.Fragment>
    <td className="objective-txt info-font-weight">
      {props.enable && props.objective ? <input type="text" name="objective" value={objective} className="objective-area" onChange={(e) => {changeObjective(e)}} /> : objective}
    </td>
    <td className="edit-obj-btn-container">
      {!(OOBCategoriesData.includes((props.current.name).toLowerCase())) && !props.isView ? <button className="btn btn-secondary edit-button" onClick={() => setEnable()}>{props.enable ? "Add" : "Edit"}</button> : null}
    </td>
  </React.Fragment>;
}

RiskObjective.PropTypes = {
  changeObjective: PropTypes.func,
  triggerEdit: PropTypes.func,
  objective: PropTypes.string
};

export default React.memo(RiskObjective);
