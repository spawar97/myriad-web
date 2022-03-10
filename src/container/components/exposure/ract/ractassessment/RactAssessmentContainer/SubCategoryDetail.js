import React, { useEffect } from "react";
import PropTypes from 'prop-types';
import Select from 'react-select';
import { subCategoryRiskScore } from './RactFormulaesUtil';
import MenuRenderer from '../commonComponents/MenuRenderer';
import FrontendConstants from '../../../../../constants/FrontendConstants';
import ToggleButton from '../../../../ToggleButton';
import './style.scss';
import MonitorKpi from './KpiFilter';

const SubCategoryDetail = (props) => {

  const { openFunctionalPlanModal, disabledField, openMitigationModal,
    categoryErrors, reviewStatusFlag, FunctionalCategoryOptions, editPermissionFlag, handleMonitorKpis, category } = props;

  const oneToFiveCategoryRange = '1-5';

  const oneToTenCategoryRange = '1-10';

  useEffect(() => {
    calculateTotalSubcategoryRiskScore();
  }, []);

  const calculateTotalSubcategoryRiskScore = () => {

    const { subCategoryImpactScore, subCategoryProbabilityScore } = props && props.details;

    let subCategoryTotalRiskScore = subCategoryRiskScore(subCategoryImpactScore, subCategoryProbabilityScore);

    return props.setsubCategoryScore(subCategoryTotalRiskScore);
  }

  const subcategoryDetectability = (currentCheck) => {
    const range = props.detectabilityRadio;

    return range.map((obj, ind) => {

      return (
        <div className={`detectability-${ind}`}>
          <label id={`detectability-label-${ind}`}>
            <input
              id={`detectability-radio-${ind}`}
              key={`radio-${obj.label}`}
              type="radio"
              value={`${obj.value}`}
              checked={currentCheck.toLowerCase() == obj.value}
              onChange={(e) => props.handleDetectabilityChange(e, props.category.id, props.details)}
              disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
            />
            <span className="radio-label"> {`${obj.label}`} </span>
          </label>
        </div>
      );
    });
  }

  const CustomFunctionalPlanMenuComponent = () => {

    return (
      <div className='Custom-Menu-Option'>
        <span id='add-new-functional-plan' className='ract-add-button' onClick={() => openFunctionalPlanModal()}>
          Add New Functional Plan
        </span>
      </div>
    );
  }

  const CustomMitigationActionMenuComponent = (data) => {

    return (
      <React.Fragment>
        {data && data.noOptionText ? data.noOptionText : null}
        <div className='Custom-Menu-Option'>
          <span id='add-new-functional-plan' className='ract-add-button' onClick={() => openMitigationModal(props.category.id, props.details)}>
            Add New Mitigation Action
          </span>
        </div>
      </React.Fragment>
    );
  }

  const { mitigationAction, existingMitigationOption } = props.details;
  let funcCategoryOptions = FunctionalCategoryOptions ? FunctionalCategoryOptions : [];

  let existingMitigationActionOption = existingMitigationOption ? existingMitigationOption : [];

  let categoryRange = props.riskCategoryRange == oneToFiveCategoryRange ? props.rangeupto5 : (props.riskCategoryRange == oneToTenCategoryRange ? props.rangeupto10 : [])

  let subCategoryError;
  if (Object.keys(categoryErrors).length !== 0) {
    if (categoryErrors[props.category.name] && categoryErrors[props.category.name].length !== 0) {
      subCategoryError = categoryErrors[props.category.name].find(val => val.subcategory == props.details.name);
    }
  }

  const impactSelectValue = props.details.subCategoryImpactScore ?
    categoryRange.filter(plan =>
      plan.value == props.details.subCategoryImpactScore
    )[0]
    : { value: '0', label: '0' };

  const probabilityValue = props.details.subCategoryProbabilityScore ?
    categoryRange.filter(plan =>
      plan.value == props.details.subCategoryProbabilityScore
    )[0]
    : { value: '0', label: '0' };

  const riskWeightValue = props.details.subCategoryWeightage ?
    props.riskWeightageOptions.filter(weight =>
      weight.value == props.details.subCategoryWeightage
    )[0]
    : { value: '10', label: '10' };

  const functionalPlanValue = props.details.FunctionalCategory &&
    props.details.FunctionalCategory.map((plan) => {
      return {
        value: plan.planName,
        label: plan.planName,
        id: plan.id,
        planName: plan.planName,
        ractTemplateId: plan.ractTemplateId
      };
    });

  const functionalSelectOption = funcCategoryOptions && funcCategoryOptions.map((plan) => {
    return {
      value: plan.planName,
      label: plan.planName,
      id: plan.id,
      planName: plan.planName,
      ractTemplateId: plan.ractTemplateId
    };
  });

  const mitigationActionValue = mitigationAction &&
    mitigationAction.map((mitigation) => {
      return {
        value: mitigation.mitigationActions,
        label: mitigation.mitigationActions,
        id: mitigation.id,
        mitigationActions: mitigation.mitigationActions,
        riskSubcategoryId: mitigation.riskSubcategoryId
      };
    });

  const mitigationSelectOption = existingMitigationActionOption.map((mitigation) => {
    return {
      value: mitigation.mitigationActions,
      label: mitigation.mitigationActions,
      id: mitigation.id,
      mitigationActions: mitigation.mitigationActions,
      riskSubcategoryId: mitigation.riskSubcategoryId
    };
  });

  const diffElement = props.details.hasOwnProperty('diffElement') ? props.details.diffElement : [];

  return (
    <React.Fragment>
      <div className="enable-container">
        <label 
          className={`enable-category-label ${diffElement && diffElement.includes('enable') ? 'version-diff' : ''}`}
        >
          Enabled
        </label>
        <ToggleButton
          className='subcategory-enabled'
          activeText={FrontendConstants.CHECKMARK}
          isActive={props.details.enabled}
          onClick={(e) => props.handleEnablesubCategory(props.details.enabled, props.category.id, props.details, props.category)}
          disabled={disabledField || editPermissionFlag || reviewStatusFlag}
        />
      </div>
      <div className="flex-container">
        <div className="ract-module row global-padding right-line">
          <span 
           className={`p-title required ${diffElement && diffElement.includes('question') ? 'version-diff' : ''}`}
          >
            Risk Question
          </span>
          <table>
            <tbody>
              <tr>
                <td className="question-txt">
                  {props.enableEdit ?
                    <textarea
                      name="question"
                      value={props.details.riskQuestion}
                      className="question-area"
                      onChange={(e) => props.questionHandler(e, props.category.id, props.details)}
                      disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                    /> :
                    <div
                      className="question-area"
                    >
                      {props.details.riskQuestion}
                    </div>
                  }
                </td>
                <td className="edit-btn-container">
                  <button
                    className="btn btn-secondary"
                    id="quetion-edit-button"
                    onClick={() => props.triggerEdit("question")}
                    disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                  >
                    {props.enableEdit ? 'Add' : 'Edit'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          {
            (subCategoryError !== undefined &&
              subCategoryError.FunctionalCategory !== undefined) ?
              <span className="subcategory-errors">
                <text className="subcategory-error-text">
                  {subCategoryError.riskQuestion}
                </text>
              </span>
              : null
          }
        </div>
        <div className="ract-module row global-padding" >
          <span 
           className={`p-title ${diffElement && diffElement.includes('consideration') ? 'version-diff' : ''}`}
          > 
           Risk Consideration
          </span>
          <table>
            <tbody>
              <tr>
                <td className="question-txt">
                  {props.enableConsideration ?
                    <textarea
                      name="consideration"
                      value={props.details.consideration}
                      className="question-area"
                      onChange={(e) => props.considerationHandler(e, props.category.id, props.details)}
                      disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                    /> :
                    <div
                      className="question-area"
                    >
                      {props.details.consideration}
                    </div>
                  }
                </td>
                <td className="edit-btn-container">
                  <button
                    className="btn btn-secondary"
                    id="consideration-edit-button"
                    onClick={() => props.triggerEdit("consideration")}
                    disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                  >
                    {props.enableConsideration ? 'Add' : 'Edit'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className='subcategory-risk-score'>
        <table id="subcategory-risk-score-table">
          <tbody>
            <tr>
              <td className="t-label p-title risk-category-score">Risk SubCategory Score</td>
            </tr>
            <tr>
              <td
               className={`t-label p-title ${diffElement && diffElement.includes('impactScore') ? 'version-diff' : ''}`}
              > 
               Impact
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <Select
                  className="range-selector"
                  value={impactSelectValue}
                  onChange={(e) => props.handleImpactChange(e, props.category.id, props.details, calculateTotalSubcategoryRiskScore)}
                  options={categoryRange}
                  clearable={false}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
                <span className='impact-range-text'>
                  ({props.riskCategoryRange})
                </span>
              </td>
            </tr>
            <tr>
              <td 
                className={`t-label p-title ${diffElement && diffElement.includes('probabilityScore') ? 'version-diff' : ''}`}
              > 
               Probability
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <Select
                  className="range-selector"
                  value={probabilityValue}
                  onChange={(e) => props.handleProbabilityChange(e, props.category.id, props.details, calculateTotalSubcategoryRiskScore)}
                  options={categoryRange}
                  clearable={false}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
                <span className='probability-range-text'>
                  ({props.riskCategoryRange})
                </span>
              </td>
            </tr>
            <tr>
              <td
               className={`t-label p-title ${diffElement && diffElement.includes('detectability') ? 'version-diff' : ''}`}
              >
                Detectability
              </td>
              <td className="t-label " id='subcategory-td-data'>
                {
                  subcategoryDetectability(props.details.subCategoryDetectability)
                }
              </td>
            </tr>
            <tr>
              <td className="t-label p-title required">Total Risk Subcategory Score</td>
              <td className="t-label" id='subcategory-td-data'>
                <input
                  id="total-risk-category-score"
                  value={props.subCategoryScore}
                  disabled
                />
                <span className='risk-category-text'>
                  (Auto calculated based on risk probability and Impact)
                </span>
              </td>
              {
                (subCategoryError !== undefined &&
                  subCategoryError.totalRiskSubcategoryScore !== undefined) ?
                  <span className="subcategory-errors">
                    <text className='subcategory-error-text'>
                      {subCategoryError.totalRiskSubcategoryScore}
                    </text>
                  </span>
                  : null
              }
            </tr>

            <tr>
              <td
               className={`t-label p-title required ${diffElement && diffElement.includes('weight') ? 'version-diff' : ''}`}
              >
                Risk Weight
              </td>
              <td className="t-label risk-weightage-td" id='subcategory-td-data'>
                <Select
                  className="range-selector"
                  value={riskWeightValue}
                  onChange={(e) => props.handleSubcategoryWeightage(e, props.category.id, props.details)}
                  options={props.riskWeightageOptions}
                  clearable={false}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
                <span className='risk-weight-text'>
                  (1 - 10)
                </span>
              </td>
            </tr>

            <tr>
              <td 
               className={`t-label p-title ${diffElement && diffElement.includes('rationale') ? 'version-diff' : ''}`}
              > 
               Risk Rationale
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <input
                  className="risk-rationale"
                  value={props.details.subCategoryRationale}
                  onChange={(e) => props.handleSubcategoryRationale(e, props.category.id, props.details)}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
              </td>
            </tr>
            <tr>
              <td 
                className={`t-label p-title required ${diffElement && diffElement.includes('selectedFunctionalPlans') ? 'version-diff' : ''}`}
              > 
                Functional Plan Impacted
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <Select
                  className="subcategory-functional-plan"
                  multi
                  value={functionalPlanValue}
                  options={functionalSelectOption}
                  onChange={(e) => props.handleFunctionalPlan(e, props.category.id, props.details)}
                  menuRenderer={(props) => MenuRenderer(props, CustomFunctionalPlanMenuComponent)}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
              </td>
              {
                (subCategoryError !== undefined &&
                  subCategoryError.FunctionalCategory !== undefined) ?
                  <span className="subcategory-errors">
                    <text className="subcategory-error-text">
                      {subCategoryError.FunctionalCategory}
                    </text>
                  </span>
                  : null
              }
            </tr>
            <tr>
              <td 
                className={`t-label p-title required ${diffElement && diffElement.includes('selectedMitigationActions') ? 'version-diff' : ''}`}
              >
                Mitigation Action
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <Select
                  className="subcategory-mitigation-action"
                  options={mitigationSelectOption}
                  value={mitigationActionValue}
                  onChange={(e) => props.handleMitigationAction(e, props.category.id, props.details)}
                  menuRenderer={(props) => MenuRenderer(props, CustomMitigationActionMenuComponent)}
                  multi
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                  noResultsText={<CustomMitigationActionMenuComponent noOptionText={'Not Available '} />}
                />
              </td>
              {
                (subCategoryError !== undefined &&
                  subCategoryError.MitigationAction !== undefined) ?
                  <span className="subcategory-errors">
                    <text className="subcategory-error-text">
                      {subCategoryError.MitigationAction}
                    </text>
                  </span>
                  : null
              }
            </tr>
            <tr>
              <td 
               className={`t-label p-title ${diffElement && diffElement.includes('associatedFileIds') ? 'version-diff' : ''}`}
              >
                Related Monitors
              </td>
              <td className="t-label " id='subcategory-td-data'>
                <MonitorKpi
                  fileType='MONITOR'
                  associatedFileIds={props.details.associatedFileIds}
                  currentTab={category.id}
                  subCategoryTab={props.details}
                  handleKpis={handleMonitorKpis}
                  Name= {'Monitor'}
                  disabled={disabledField || !props.details.enabled || reviewStatusFlag || editPermissionFlag}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </React.Fragment>
  );
}

SubCategoryDetail.PropTypes = {
  openFunctionalPlanModal: PropTypes.func,
  disabledField: PropTypes.bool,
  openMitigationModal: PropTypes.func,
  categoryErrors: PropTypes.object,
  reviewStatusFlag: PropTypes.bool
}

SubCategoryDetail.defaultProps = {
  riskWeightageOptions: [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' }
  ],
  rangeupto5: [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' }
  ],
  rangeupto10: [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
    { value: '4', label: '4' },
    { value: '5', label: '5' },
    { value: '6', label: '6' },
    { value: '7', label: '7' },
    { value: '8', label: '8' },
    { value: '9', label: '9' },
    { value: '10', label: '10' }
  ],
  FunctionalCategory: [
    { value: 'Safety Plan', label: 'Safety Plan' },
    { value: 'Medical Monitoring Plan', label: 'Medical Monitoring Plan' }
  ],
  mitigationAction: [
    { value: 'M1', label: 'M1' },
    { value: 'M2', label: 'M2' },
    { value: 'M3', label: 'M3' },
  ],
  detectabilityRadio: [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'difficult', label: 'Difficult' }
  ]
}

export default React.memo(SubCategoryDetail);
