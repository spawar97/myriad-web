import React, { useState, useEffect } from "react";
import ToggleButton from '../../../../../components/ToggleButton';
import FrontendConstants from '../../../../../constants/FrontendConstants';

const DetailedAccordion = (props) => {
  const [question, setQuestion] = useState("");
  const [consideration, setConsideration] = useState("");
  const [selected, setSelected] = useState(false);
  const [editQuestion, setEditQuestion] = useState(false);
  const [editConsideration, setEditConsideration] = useState(false);

  useEffect(() => {
    setSelected(props.details.enable);
    setEditQuestion(false);
    setEditConsideration(false);
  }, [props.details]);

  useEffect(() => {
    if (!props.enableEdit){
      setEditQuestion(false);
      setEditConsideration(false);
    }
  },[props.enableEdit])

  const onEditQuestion = (e, subCategoryId, categoryId) => {
    setQuestion(e.target.value);
    props.question(e.target.value, subCategoryId, categoryId);
  }

  const onEditConsideration = (e, subCategoryId, categoryId) => {
    setConsideration(e.target.value);
    props.consideration(e.target.value, subCategoryId, categoryId);
  }

  const openTextArea = () => {
    setQuestion(props.details.question);
    setEditQuestion(!editQuestion);
    props.editOption();
  }

  const openConsiderationTextArea = () => {
    setConsideration(props.details.consideration);
    setEditConsideration(!editConsideration);
    props.editOption();
  }

  const toggleCheckbox = () => {
    setSelected(!selected);
    props.updateEnable(selected, props.category, props.details.id);
  }

  const checkDisable = () => {
    if (props.category.enable){
      return !selected
    }
    else {
      return true
    }
  }

  const checkIfEmpty = (data) => {
    let regex = new RegExp(/^(?!\s*$).+/);
    if (data && regex.test(data)){
      return true
    }
    else {
      return false
    }
  }

  return (<React.Fragment>
    <div className="enable-container">
      <label className="enable-category-label">Enabled</label>
      <ToggleButton isActive={selected} activeText={FrontendConstants.CHECKMARK} onClick={(e) => toggleCheckbox(e)} className="enable-category-button" disabled={props.category.enable && !props.isView ? false : true}/>
    </div>
    <div className="flex-container">
      <div className="ract-module row global-padding right-line">
        <span className="p-title">Risk Question *</span>
        <table className="accordian-textarea">
          <thead/>
          <tbody>
            <tr>
              <td className="question-txt">
                {checkIfEmpty(props.details.question) ? null : <p className="ract-error-msg">This field is required</p>}
                {editQuestion ? <textarea name="question" value={question} className="question-area" onChange={(e) => onEditQuestion(e, props.details.id, props.category.id)} disabled={checkDisable()}/> : <div className="question-area padding-none">{props.details.question}</div>}
              </td>
              <td className="edit-btn-container">
                <div className="edit-btn">
                  {!props.isView ? <button className="btn btn-secondary edit-button" onClick={() => {openTextArea()}} disabled={checkDisable()}>
                    {editQuestion ? "Add" : "Edit"}
                  </button> : ''}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ract-module row global-padding">
        <span className="p-title">Risk Consideration </span>
        <table className="accordian-textarea">
          <thead/>
          <tbody>
            <tr>
              <td className="question-txt">
              {editConsideration ? <textarea name="consideration" value={consideration} className="question-area" value={consideration} onChange={(e) => onEditConsideration(e, props.details.id, props.category.id)} disabled={checkDisable()}/> : <div className="question-area padding-none">{props.details.consideration}</div>}
              </td>
            <td className="edit-btn-container">
              <div className="edit-btn">
                {!props.isView ? <button className="btn btn-secondary edit-button" onClick={() => {openConsiderationTextArea()}} disabled={checkDisable()}>
                  {editConsideration ? "Add" : "Edit"}
                </button> : '' }
              </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </React.Fragment>);
}

export default React.memo(DetailedAccordion);
