import React, { useState, forwardRef, useImperativeHandle } from 'react';
import PropTypes from 'prop-types';
import FrontendConstants from '../../../../../constants/FrontendConstants';
import StatusMessageConstants from '../../../../../constants/StatusMessageTypeConstants';
import Accordion from '../commonComponents/Accordian';
import SubCategoryDetail from './SubCategoryDetail';
import Select from 'react-select';
import WarningPopUpModal from '../commonComponents/WarningPopUpModal';
import { subCategoryRiskScore, calculateCategoryRiskScore } from './RactFormulaesUtil';
import AddModal from '../commonComponents/AddModal';
import ToggleButton from '../../../../ToggleButton';
import ExposureActions from '../../../../../actions/ExposureActions';
import ValidationPopUpModal from '../commonComponents/ValidationPopUpModal';
import ReviewModal from '../ReviewRiskCategory/ReviewModal';
import RactScorecardStore from '../../../../../stores/RactScorecardStore';
import { postCategoryData } from './RactFormulaesUtil';
import Loader from '../../../../../components/ContentPlaceholder';
import RouteNameConstants from "../../../../../constants/RouteNameConstants";
import './style.scss';
import PermissionsUtil from "../../../../../util/PermissionsUtil";
import {
  AccessPermissionsConstants,
  FeatureListConstants,
} from "../../../../../constants/PermissionsConstants";
import KpiFilter from './KpiFilter';
import RACTConsoleUtil from '../../../../../util/RactConsoleUtil';

const RactAssessment = (props, ref) => {

  const [currentTab, setCurrentTab] = useState(props.selectedTabID ? props.selectedTabID-1 : 0);
  const [categories, setCategories] = useState(props.Data);
  const [editQuestion, setEditQuestion] = useState(false);
  const [editConsideration, setEditConsideration] = useState(false);
  const [subCategoryScore, setsubCategoryScore] = useState('');
  const [ShowWarningModal, setShowWarningModal] = useState(false);
  const [PrevState, setPrevState] = useState([]);
  const [nextTab, setNextTab] = useState(0);
  const [pageEditted, setPageEdited] = useState(false);
  const [openAddFunctionalPlanModal, setAddFunctionalPlanModal] = useState(false);
  const [funtionalPlanModalText, setFuntionalPlanModalText] = useState('');
  const [openAddMitigationActionModal, setAddMitigationActionModal] = useState(false);
  const [mitigationActionModalText, setMitigationActionModalText] = useState('');
  const [CurrentMitigationSubCategory, setCurrentMitigationSubCategory] = useState({});
  const [categoryErrors, setErrors] = useState({});
  const [ShowValidationModal, setShowValidationModal] = useState(false);
  const [SignOffValidationField, setSignOffValidationField] = useState([]);
  const [onSaveModal, setOnSaveModal] = useState(false);
  const [onRejectModal, setOnRejectModal] = useState(false);
  const [onApproveModal, setOnApproveModal] = useState(false);
  const [activeAccordian, setActiveAccordian] = useState({ "accordian": null, "state": null });
  const [FunctionalAddInputError, setFunctionalAddInputError] = useState(false);
  const [MitigationAddInputError, setMitigationAddInputError] = useState(false);
  const [rejectCommentText, setRejectCommentText] = useState('');
  const [approveCommentText, setApproveCommentText] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [isCustomDataLoading, setCustomDataLoading] = useState(false);
  const [ractFunctionalPlanOptions, setRactFunctionalPlanOptions] = useState(props.functionalPlanOptions);
  const [reviewLoader, setReviewLoader] = useState(false);
  const [reviewCommentError, setReviewCommentError] = useState(false);
  const [allCategoriesDisabled, setAllCategoriesDisabled] = useState(false);
  const [updatedRactId, setUpdatedRactId] = useState(props.ractId === undefined ? window.location.href.split('/')[1] : props.ractId);
  const [currentTabAllSubCategoriesDisabled, setCurrentTabAllSubCategoriesDisabled] = useState(false);
  const [ShowClosePageWarningModal, setShowClosePageWarningModal] = useState(false);

  const  versionDetailFlag = props.versionName ;

  const reviewStatusFlag = window.location.pathname.includes('assessment-review') || versionDetailFlag;

  const editPermissionFlag = !PermissionsUtil.checkLoggedInUserHasAccessForFeature(
      FeatureListConstants.RACT, AccessPermissionsConstants.EDIT,
  );

  const storePrevious = () => {
    let deepCopy = JSON.parse(JSON.stringify(categories));
    setPrevState([...PrevState, deepCopy]);
  }

  /*Edit Subcategory Input , question & consideration handleChange function*/
  const triggerEdit = (option) => {
    let questionOption = FrontendConstants.RACT_ASSESSMENT_QUESTION_EDIT_OPTION_NAME;
    let considerationOption = FrontendConstants.RACT_ASSESSMENT_CONSIDERATION_EDIT_OPTION_NAME;

    if (option === questionOption) {
      setEditQuestion(!editQuestion);
    }
    if (option === considerationOption) {
      setEditConsideration(!editConsideration);
    }
  }

  const disableEdit = () => {
    setEditQuestion(false);
    setEditConsideration(false);
  }

  const questionHandleChange = (event, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].riskQuestion = event.target.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  const considerationHandleChange = (event, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].consideration = event.target.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*subcategory accordion functionality*/
  const closePreviousAccordion = (categoryData, activeState) => {

    const { subCategoryImpactScore, subCategoryProbabilityScore } = categoryData && categoryData.current;
    const { current } = categoryData;
    let totalRiskSubcategoryScore = subCategoryRiskScore(subCategoryImpactScore, subCategoryProbabilityScore);

    setsubCategoryScore(totalRiskSubcategoryScore);
    disableEdit();
    setActiveAccordian({ "accordian": categoryData.index, "state": activeState });
  }

  /*category tab handleChange functionality*/
  const handleClick = async (current, categoryData) => {

    if (pageEditted && current != currentTab) {
      setShowWarningModal(true);
      setNextTab(current);
    } else {
      setCurrentTab(current);
      setNextTab(current);
      disableEdit();
    }
  };

  /*RiskType Dropdown handleChange*/
  const handleRiskChange = (selectedRisk, currentTab) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        val.riskType = selectedRisk.value
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*Detectability radio button handleChange*/
  const handleDetectabilityChange = (event, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].subCategoryDetectability = event.target.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*Probability subcategory handleChange*/
  const handleProbabilityChange = (event, currentTab, currentSubcategory, calculateTotalSubcategoryRiskScore) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].subCategoryProbabilityScore = event.value;
      }
      return val
    })
    setCategories(updatedCategories);
    calculateTotalSubcategoryRiskScore();
    setPageEdited(true);
  }

  /*Impact subcategory handleChange*/
  const handleImpactChange = (event, currentTab, currentSubcategory, calculateTotalSubcategoryRiskScore) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].subCategoryImpactScore = event.value;
      }
      return val
    })
    setCategories(updatedCategories);
    calculateTotalSubcategoryRiskScore();
    setPageEdited(true);
  }

  /*Weightage dropdown handleChange*/
  const handleSubcategoryWeightage = (selectedSubcategoryWeight, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].subCategoryWeightage = selectedSubcategoryWeight && selectedSubcategoryWeight.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }


  /*Enable category handleChange*/
  const handleEnableCategory = (currentTab, enable) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        val.enabled = !enable;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*Enable subcategory handleChange*/
  const handleEnablesubCategory = (currEnabled, currentTab, currentSubcategory, category) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].enabled = !currEnabled;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
    autoUpdateCategory(category, updatedCategories);
  }

  /*rationale category handleChange*/
  const handleCategoryRationale = (event, currentTab) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        val.riskRationale = event.target.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*rationale subcategory handleChange*/
  const handleSubcategoryRationale = (event, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].subCategoryRationale = event.target.value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*Save and Discard Modal functionality*/
  const closeWarningModal = () => {
    setShowWarningModal(false);
    setNextTab(currentTab);
  }

  const discardWarningModal = () => {
    setShowWarningModal(false);
    setCategories(PrevState && PrevState[0]);
    setPrevState([]);
    setPageEdited(false);
    setCurrentTab(nextTab);
    disableEdit();
  }

  /* Risk Score Calculation */
  const getCategoryRiskScore = (category) => {

    let riskScore = calculateCategoryRiskScore(category);

    return riskScore.score;
  }

  /*Functional Plan*/
  const handleFunctionalPlan = (functionaPlan, currentTab, currentSubcategory) => {

    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].FunctionalCategory = functionaPlan.map(({ id, planName, ractTemplateId }) => ({ id, planName, ractTemplateId }));
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  const openFunctionalPlanModal = () => {
    setAddFunctionalPlanModal(true);
  }

  const closeFunctionalPlanModal = (e) => {
    setAddFunctionalPlanModal(false);
    setFunctionalAddInputError(false);
  }

  const handleFunctionalPlanModal = (event) => {
    setFuntionalPlanModalText(event.target.value);
  }

  const onAddFunctionalPlan = async () => {
    storePrevious();
    const { functionalPlanOptions } = props;

    let checkFunctionalOption = ractFunctionalPlanOptions.some((obj) => obj.planName.toLowerCase() == funtionalPlanModalText.toLowerCase());

    if (!checkFunctionalOption) {

      let functionalPlanBody = {
        "ractTemplateId": props.ractTemplateId,
        "functionalPlans": [funtionalPlanModalText]
      }

      await RactScorecardStore.addFunctionPlan(functionalPlanBody).then(async (data) => {
        setCustomDataLoading(true);
        if (data && data.length) {
          setRactFunctionalPlanOptions([...ractFunctionalPlanOptions, ...data]);
          ExposureActions.createStatusMessage(
              FrontendConstants.RACT_ASSESSMENT_FUNCTIONAL_PLAN_SUCCESS,
              StatusMessageConstants.TOAST_SUCCESS
          );
          setAddFunctionalPlanModal(false);
          setFunctionalAddInputError(false);
          setCustomDataLoading(false);
        } else {
          throw new Error
        }
      }).catch(error => {
        setAddFunctionalPlanModal(false);
        setFunctionalAddInputError(false);
        setCustomDataLoading(false);
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      });

    } else {
      setFunctionalAddInputError(true);
    }

    setPageEdited(true);
  }
  /* Functional Plan End */

  /* Mitigation Action */
  const handleMitigationAction = (mitigationAction, currentTab, currentSubcategory) => {

    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].mitigationAction = mitigationAction.map(({ id, mitigationActions, riskSubcategoryId }) => ({ id, mitigationActions, riskSubcategoryId }));
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  const openMitigationModal = (currentTab, currentSubcategory) => {
    setAddMitigationActionModal(true);
    setCurrentMitigationSubCategory({ currentTab: currentTab, currentSubcategory: currentSubcategory })
  }

  const closeMitigationModal = (e) => {
    setAddMitigationActionModal(false);
    setMitigationAddInputError(false);
  }

  const handleMitigationModal = (event) => {
    setMitigationActionModalText(event.target.value);
  }

  const onAddMitigationAction = async () => {

    storePrevious();
    let { currentTab, currentSubcategory } = CurrentMitigationSubCategory;
    let checkMitigationOption = false;

    categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        checkMitigationOption = activeCategory[0].existingMitigationOption.some((obj) => {
          return obj.mitigationActions.toLowerCase() == mitigationActionModalText.toLowerCase();
        });
      }
    })


    if (!checkMitigationOption) {

      let mitigationActionBody = {
        "riskSubcategryId": currentSubcategory.riskSubCategoryId,
        "mitigationActions": [mitigationActionModalText]
      }

      await RactScorecardStore.addMitigationAction(mitigationActionBody).then(async (data) => {
        setCustomDataLoading(true);
        if (data && data.length) {

          const updatedCategories = categories.map(val => {
            if (val.id == currentTab) {
              let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id);
              let currentMitigationOption = activeCategory[0].existingMitigationOption;
              activeCategory[0].existingMitigationOption = [...currentMitigationOption, ...data];
            }
            return val
          })
          setCategories(updatedCategories);

          ExposureActions.createStatusMessage(
              FrontendConstants.RACT_ASSESSMENT_MITIGATION_ACTION_SUCCESS,
              StatusMessageConstants.TOAST_SUCCESS
          );
          setAddMitigationActionModal(false);
          setMitigationAddInputError(false);
          setCustomDataLoading(false);
        } else {
          throw new Error
        }
      }).catch(error => {
        setAddMitigationActionModal(false);
        setMitigationAddInputError(false);
        setCustomDataLoading(false);
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      });

    } else {
      setMitigationAddInputError(true);
    }

    setPageEdited(true);
  }
  /* Mitigation Action End*/

  /* Disable category when all subcategory are disable  */
  const autoUpdateCategory = (object, updatedCategories) => {
    if (checkAllDisabled(object, updatedCategories)) {
      updateRiskCategory(false, updatedCategories, object);
    }
    else {
      updateRiskCategory(true, updatedCategories, object);
      setCategories(updatedCategories);
      setPageEdited(true);
    }
  }

  const updateRiskCategory = (value, updatedCategories, object) => {
    let riskCategories = updatedCategories.map(val => {
      if (val.id == object.id) {
        val.enabled = value
      }
      return val;
    })
    setCategories(riskCategories);
    setPageEdited(true);
  }

  const checkAllDisabled = (object, updatedCategories) => {
    let allFalse = true;
    updatedCategories.map(val => {
      if (val.id == object.id) {
        let subcategories = val.subcategory;
        subcategories.map(sub => {
          if (sub.enabled == true) {
            allFalse = false;
          }
        })
      }
    })
    return allFalse
  }
  /* Disable category end */

  /* Category Validation */
  const handleValidation = (currentTab) => {
    let errorSubcategory = [];
    let currentTabName = currentTab.name;
    let categoryIsValid = true;

    if (currentTab.enabled) {

      currentTab && currentTab.subcategory.map((obj) => {
        let error = {};
        if (obj.enabled !== false) {
          if (!(obj.subCategoryImpactScore !==0 && obj.subCategoryProbabilityScore !== 0)) {
            error.totalRiskSubcategoryScore = FrontendConstants.RACT_ASSESSMENT_TOTAL_RISK_SUBCATEGORY_SCORE_ERROR_MSG;
          }

          if (!obj.riskQuestion) {
            error.riskQuestion = FrontendConstants.RACT_ASSESSMENT_SUBCATEGORY_RISK_QUESTION_ERROR;
          }

          if (obj.FunctionalCategory.length === 0 || !obj.FunctionalCategory) {
            error.FunctionalCategory = FrontendConstants.RACT_ASSESSMENT_FUNCTIONAL_CATEGORY_ERROR_MSG;
          }

          if (obj.mitigationAction.length === 0 || !obj.mitigationAction) {
            error.MitigationAction = FrontendConstants.RACT_ASSESSMENT_MITIGATION_ACTION_ERROR_MSG;
          }
        }
        Object.keys(error).length ? error.subcategory = obj.name : null;

        return Object.keys(error).length ? errorSubcategory.push(error) : errorSubcategory;

      });

    }

    var obj = {};
    obj[currentTabName] = errorSubcategory;
    setErrors(obj);

    if (errorSubcategory.length !== 0) {
      categoryIsValid = false;
    }
    return categoryIsValid;
  }

  /* Save Button Functionality */
  const saveAndUpdate = async (currentTab) => {
    let isAllCategoriesDisabled = categories.some(val => val.enabled == true);
    let isCurrentTabAllSubcategoriesDisabled =  currentTab.subcategory.every(val => val.enabled == false );
    disableEdit();

    if (!handleValidation(currentTab)) {
      setOnSaveModal(true);
    } else if (!isAllCategoriesDisabled) {
      setAllCategoriesDisabled(true);
    } else if(isCurrentTabAllSubcategoriesDisabled && currentTab.enabled){
      setCurrentTabAllSubCategoriesDisabled(true);
    } else {

      let ractId = props.ractId === undefined ? props.parentProps.location.pathname.split('/')[3] : props.ractId;
      let assessmentData = postCategoryData(categories, ractId);
      let ractStatus = props.parentProps.location.state && props.parentProps.location.state.ractStatus || '';

      setLoading(true);
      let postData = {
        "ractId": ractId,
        "ractCategoryWrapper": ractStatus !== FrontendConstants.RACT_TEMPLATE_FINAL_STATUS ? 
                               assessmentData && assessmentData.filter(tab => currentTab.id == tab.id) : assessmentData
      }

      await RactScorecardStore.saveAssessmentData(postData).then(data => {
        if (data && data.ractId) {

          setLoading(false);
          setPrevState([]);
          setPageEdited(false);
          setUpdatedRactId(data.ractId);
          props.exportDataAfterSave(categories);

          ExposureActions.createStatusMessage(
              FrontendConstants.RACT_ASSESSMENT_CATEGORY_SAVE_SUCCESS,
              StatusMessageConstants.TOAST_SUCCESS
          );
        } else {
          throw new Error;
        }
      }).catch(error => {
        setLoading(false);
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      });
    }
  }

  /* Save & Sign-Off Modal */
  const handleSaveAndSignOff = (currentTab) => {
    disableEdit();

    let incompleteCategories = [];
    categories.map((obj) => {

      if (obj.enabled !== false) {
        obj.subcategory.map((val) => {
          if (val.enabled !== false) {
            if (!val.subCategoryImpactScore && !val.subCategoryProbabilityScore) {
              incompleteCategories.push(obj.name);
            }

            if (!val.FunctionalCategory || val.FunctionalCategory.length === 0) {
              incompleteCategories.push(obj.name);
            }

            if (!val.riskQuestion) {
              incompleteCategories.push(obj.name);
            }

            if (!val.mitigationAction || val.mitigationAction.length === 0) {
              incompleteCategories.push(obj.name);
            }
          }
        })
      }
    });

    if (incompleteCategories.length) {

      setShowValidationModal(true);
      setSignOffValidationField(Array.from(new Set(incompleteCategories)));

    } else if (pageEditted) {
      setShowWarningModal(true);
    } else {

      setPrevState([]);
      props.parentProps.router.push({
        name: RouteNameConstants.EXPOSURE_RACT_SIGN_OFF,
        state: {
          ractId: updatedRactId ? updatedRactId : props.ractId
        },
      });

      ExposureActions.createStatusMessage(
          FrontendConstants.ASSESSMENT_SAVE_AND_SIGNOFF_SUCCESS_MSG,
          StatusMessageConstants.TOAST_SUCCESS,
      );

      setPageEdited(false);

    }

  }

  /* Review Risk Category */
  const handleOnReject = (param) => {
    setOnRejectModal(true);
  }

  const handleRejectCancel = () => {
    setOnRejectModal(false);
    setReviewCommentError(false)
  }

  const handleOnApprove = (param) => {
    setOnApproveModal(true);
  }

  const handleApproveCancel = () => {
    setOnApproveModal(false);
    setReviewCommentError(false)
  }

  /* AssessmentReview: this function will use while Review Assessment */
  const handleOnReviewSubmit = (reviewType) => {
    const reviewApproveName = FrontendConstants.RACT_ASSESSMENT_REVIEW_APPROVE_NAME;
    const reviewRejectName = FrontendConstants.RACT_ASSESSMENT_REVIEW_REJECT_NAME;

    const reviewApi = async (data) => {
      let param = {
        signOffComment: data.comment,
        ractId: props.reviewRactId,
        signOffStatus: data.status,
        userId: props.parentProps.immExposureStore.getIn(['userInfo', 'id'])
      }

      setReviewLoader(true);
      await RactScorecardStore.signoffReviewSubmit(param).then(data => {
        if (data && data.ractStatus) {
          setReviewLoader(false);
          props.parentProps.router.push({
            name: RouteNameConstants.EXPOSURE_RACT
          })
          ExposureActions.createStatusMessage(
              FrontendConstants.ASSESSMENT_REVIEW_SUCCESS_MSG,
              StatusMessageConstants.TOAST_SUCCESS,
          );
        } else {
          throw new Error;
        }
      }).catch(error => {
        setReviewLoader(false);
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      });
    }

    if (reviewType === reviewApproveName) {

      if (approveCommentText) {
        let approveParam = {
          comment: approveCommentText,
          status: 'true'
        };

        setOnApproveModal(false);
        setReviewCommentError(false)
        reviewApi(approveParam);

      } else {
        setReviewCommentError(true);
      }

    } else if (reviewType === reviewRejectName) {

      if (rejectCommentText) {
        let rejectParam = {
          comment: rejectCommentText,
          status: 'false'
        };

        setOnRejectModal(false);
        setReviewCommentError(false)
        reviewApi(rejectParam);

      } else {
        setReviewCommentError(true)
      }
    }

  }

  const onInputReviewHandleChange = (event, reviewType) => {
    const reviewApproveName = FrontendConstants.RACT_ASSESSMENT_REVIEW_APPROVE_NAME;
    const reviewRejectName = FrontendConstants.RACT_ASSESSMENT_REVIEW_REJECT_NAME;

    if (reviewType === reviewApproveName) {
      setApproveCommentText(event.target.value);
    } else if (reviewType === reviewRejectName) {
      setRejectCommentText(event.target.value);
    }
  }

  /*Review Risk Category End*/

  /*Related KPIs */

  const handleRelatedKpis = (selectedKpi, currentTab) => {

    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        val.associatedFileIds = selectedKpi.map(obj=> obj.value);
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);

  }

  /* MONITOR KPIs*/ 

  const handleMonitorKpis = (selectedKpi, currentTab, currentSubcategory) => {

    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == currentTab) {
        let activeCategory = val.subcategory.filter(subDetail => subDetail.id == currentSubcategory.id)
        activeCategory[0].associatedFileIds =  selectedKpi.map(obj=> obj.value);
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);

  }
  
  /* Assessment Page Close Functionality */
  useImperativeHandle(ref, () => ({

    handleAssessmentClose: () => {
      if (pageEditted) {
        setShowClosePageWarningModal(true);
      } else {
        props.parentProps.router.push({
          name: RouteNameConstants.EXPOSURE_RACT
        })
      }

    }

  }));

  const handleNoAssessmentClose = () =>{
    setShowClosePageWarningModal(false);
  }

  const handleYesAssessmentClose = () => {
    RACTConsoleUtil.routeChange(props.parentProps, RouteNameConstants.EXPOSURE_RACT);
  }

  const { riskType, riskCategoryRange } = props;
  const diffElement = categories[currentTab].hasOwnProperty('diffElement') ? categories[currentTab].diffElement : [];

  return <React.Fragment>

    {isLoading || reviewLoader ? (
        <Loader
            containerClassName={"ract-assessment-loader"}
        />
    ) : null}

    <div className="container ract-assessment-container">
      <div className="ract-assessment-tab">
        {categories && categories.map((category, i) => (
                <button
                    key={category.name}
                    id={category.enabled ? 'enabled-category' : 'disabled-category'}
                    className={`tablinks ${i === currentTab ? 'active' : 'inactive'}`}
                    onClick={() => handleClick(i, category)}>{category.name}
                </button>
            )
        )}

      </div>
      <div className="ract-assessment-tabcontent" id="inner-tab-content">
        {currentTab !== -1 && categories && categories[currentTab] &&
        <React.Fragment>
          <div className="category-description">
            <div className="flex-container">
              <div className="text-description">
                <table className="risk-parameter-table">
                  <tbody>
                  <tr>
                    <td className="t-label p-title">Risk Category</td>
                    <td className="t-label">{categories[currentTab].name}</td>
                  </tr>
                  <tr>
                    <td className="t-label p-title">Risk Objective</td>
                    <td className="t-label category-objective">{categories[currentTab].objective}</td>
                  </tr>
                  <tr>
                    <td 
                      className={`t-label p-title ${diffElement && diffElement.includes('enable') ? 'version-diff' : ''}`}
                    >
                      Enabled
                    </td>
                    <td className="t-label">
                      <ToggleButton
                          className='category-enabled'
                          activeText={FrontendConstants.CHECKMARK}
                          isActive={categories[currentTab].enabled}
                          onClick={(event) => handleEnableCategory(categories[currentTab].id, categories[currentTab].enabled)}
                          disabled={reviewStatusFlag || editPermissionFlag}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td 
                     className={`t-label p-title ${diffElement && diffElement.includes('impactType') ? 'version-diff' : ''}`}
                    >
                      Risk Type
                    </td>
                    <td className="t-label">
                      <Select
                          className="risktype-selector"
                          value={riskType.filter(risk => risk.value == categories[currentTab].riskType)[0]}
                          options={riskType}
                          onChange={(val) => handleRiskChange(val, categories[currentTab].id)}
                          clearable={false}
                          disabled={!categories[currentTab].enabled || reviewStatusFlag || editPermissionFlag}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td 
                     className={`t-label p-title ${diffElement && diffElement.includes('rationale') ? 'version-diff' : ''}`}
                    >
                      Risk Rationale
                    </td>
                    <td className="t-label ">
                      <input
                          className="risk-rationale"
                          value={categories[currentTab].riskRationale}
                          onChange={(e) => handleCategoryRationale(e, categories[currentTab].id)}
                          disabled={!categories[currentTab].enabled || reviewStatusFlag || editPermissionFlag}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td 
                     className={`t-label p-title ${diffElement && diffElement.includes('associatedFileIds') ? 'version-diff' : ''}`}
                    >
                      Related KPIs
                    </td>
                    <td className="t-label ">
                       <KpiFilter
                         currentTab={categories[currentTab].id}
                         handleKpis={handleRelatedKpis}
                         associatedFileIds={categories[currentTab].associatedFileIds}
                         disabled={!categories[currentTab].enabled || reviewStatusFlag || editPermissionFlag}
                         Name={'Related'}
                       />
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <div className="Risk-Score">
                <span id="risk-score-1">{getCategoryRiskScore(categories[currentTab])}</span><br />
                <span id="risk-score-2">Risk Category Score</span><br />
                <span id="risk-score-3">(Auto Calculated based on associated Risk SubCategories score and Weight)</span>
              </div>
            </div>
            <div className="flex-container">
              <div className="subcategory-container row">
                <span className="risk-subcategory-title">Risk Subcategory</span>
              </div>
            </div>
            <div>
              {categories[currentTab] && categories[currentTab].subcategory && categories[currentTab].subcategory.map((object, i) => (
                  <React.Fragment >
                    <Accordion
                        index={i}
                        key={i}
                        current={object}
                        active={activeAccordian}
                        category={categories[currentTab]}
                        closeAcc={closePreviousAccordion}
                        setsubCategoryScore={setsubCategoryScore}
                        content={
                          <SubCategoryDetail
                              category={categories[currentTab]}
                              details={object}
                              questionHandler={questionHandleChange}
                              considerationHandler={considerationHandleChange}
                              triggerEdit={triggerEdit}
                              disableEdit={disableEdit}
                              categoryErrors={categoryErrors}
                              enableEdit={editQuestion}
                              riskCategoryRange={riskCategoryRange}
                              disabledField={!categories[currentTab].enabled}
                              openFunctionalPlanModal={openFunctionalPlanModal}
                              openMitigationModal={openMitigationModal}
                              enableConsideration={editConsideration}
                              subCategoryScore={subCategoryScore}
                              handleFunctionalPlan={handleFunctionalPlan}
                              handleMitigationAction={handleMitigationAction}
                              setsubCategoryScore={setsubCategoryScore}
                              handleDetectabilityChange={handleDetectabilityChange}
                              handleImpactChange={handleImpactChange}
                              handleProbabilityChange={handleProbabilityChange}
                              handleSubcategoryWeightage={handleSubcategoryWeightage}
                              handleEnablesubCategory={handleEnablesubCategory}
                              handleSubcategoryRationale={handleSubcategoryRationale}
                              reviewStatusFlag={reviewStatusFlag}
                              FunctionalCategoryOptions={ractFunctionalPlanOptions}
                              FunctionalAddInputError={FunctionalAddInputError}
                              editPermissionFlag={editPermissionFlag}
                              handleMonitorKpis={handleMonitorKpis}
                          />
                        }
                    />
                  </React.Fragment>
              ))}
            </div>
          </div>
        </React.Fragment>
        }
      </div>
      {versionDetailFlag ? null : ( reviewStatusFlag ?
        <div className="reject-approve">
          <button
            className="btn btn-secondary"
            onClick={() => handleOnReject(categories[currentTab])}
          >
            Reject
            </button>
          <button
            className="btn btn-primary"
            onClick={() => handleOnApprove(categories[currentTab])}
          >
            Approve
            </button>
        </div> :
        <div className="save-next">
          <button
            className="btn btn-secondary"
            onClick={() => saveAndUpdate(categories[currentTab])}
            disabled={isLoading || editPermissionFlag}
          >
            {FrontendConstants.RACT_ASSESSMENT_SAVE_BUTTON_TEXT}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSaveAndSignOff(categories[currentTab])}
            disabled={editPermissionFlag}
          >
            {FrontendConstants.RACT_ASSESSMENT_SAVE_AND_SIGNOFF_BUTTON_TEXT}
          </button>
        </div>
      )
    }
    </div>
    {
      versionDetailFlag ? null :
      (<React.Fragment>
        <WarningPopUpModal
          name={FrontendConstants.RACT_ASSESSMENT_TAB_CHANGE}
          show={ShowWarningModal}
          close={closeWarningModal}
          discard={discardWarningModal}
          warningHeaderText={FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED}
          warningContextText={FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST}
          yesButtonText={FrontendConstants.GO_BACK}
          noButtonText={FrontendConstants.DISCARD}
        />
        <WarningPopUpModal
          name={FrontendConstants.RACT_ASSESSMENT_PAGE_CLOSE}
          show={ShowClosePageWarningModal}
          close={handleYesAssessmentClose}
          discard={handleNoAssessmentClose}
          warningHeaderText={FrontendConstants.RACT_UNSAVE_CHANGES_MESSAGE_TEXT}
          warningContextText={``}
          yesButtonText={FrontendConstants.RACT_UNSAVE_CHANGES_YES_BUTTON_TEXT}
          noButtonText={FrontendConstants.RACT_UNSAVE_CHANGES_NO_SAVE_CHANGES_BUTTON_TEXT}
        />
        <ValidationPopUpModal
          show={ShowValidationModal}
          close={() => setShowValidationModal(false)}
          fields={SignOffValidationField}
          headerText={FrontendConstants.RACT_ASSESSMENT_UNABLE_TO_SIGN_OFF_TEXT}
        />
        <ValidationPopUpModal
          show={onSaveModal}
          close={() => setOnSaveModal(false)}
          headerText={FrontendConstants.RACT_ASSESSMENT_UNABLE_TO_SAVE_TEXT}
          modalContentText={FrontendConstants.RACT_ASSESSMENT_VALIDATION_MSG_TEXT}
        />
        <ValidationPopUpModal
          show={allCategoriesDisabled}
          close={() => setAllCategoriesDisabled(false)}
          headerText={FrontendConstants.RACT_ASSESSMENT_UNABLE_TO_SAVE_TEXT}
          modalContentText={FrontendConstants.RACT_ASSESSMENT_ALL_CATEGORY_DISABLED_MESSAGE}
        />
        <ValidationPopUpModal
          show={currentTabAllSubCategoriesDisabled}
          close={() => setCurrentTabAllSubCategoriesDisabled(false)}
          headerText={FrontendConstants.RACT_ASSESSMENT_UNABLE_TO_SAVE_TEXT}
          modalContentText={FrontendConstants.RACT_ASSESSMENT_ALL_SUBCATEGORY_DISABLED_MESSAGE}
        />
        <AddModal
          title={FrontendConstants.RACT_ASSESSMENT_FUNCTIONAL_PLAN_ADD_LABEL}
          placeholder={FrontendConstants.RACT_ASSESSMENT_FUNCTIONAL_PLAN_ADD_PLACEHOLDER}
          show={openAddFunctionalPlanModal}
          onClose={closeFunctionalPlanModal}
          onHandleChange={handleFunctionalPlanModal}
          onAdd={onAddFunctionalPlan}
          showError={FunctionalAddInputError}
          errorText={FrontendConstants.RACT_FUNCTIONAL_PLAN_VALIDATION_MSG}
          isLoading={isCustomDataLoading}
        />
        <AddModal
          title={FrontendConstants.RACT_ASSESSMENT_MITIGATION_ACTION_ADD_LABEL}
          placeholder={FrontendConstants.RACT_ASSESSMENT_MITIGATION_ACTION_ADD_PLACEHOLDER}
          show={openAddMitigationActionModal}
          onClose={closeMitigationModal}
          onHandleChange={handleMitigationModal}
          onAdd={() => onAddMitigationAction(props)}
          showError={MitigationAddInputError}
          errorText={FrontendConstants.RACT_MITIGATION_ADD_VALIDATION_MSG}
          isLoading={isCustomDataLoading}
        />
        <ReviewModal
          headerText={FrontendConstants.RACT_ASSESSMENT_REVIEW_REJECTION_HEADER_TEXT}
          cancelText={FrontendConstants.RACT_ASSESSMENT_REVIEW_CANCEL_TEXT}
          submitText={FrontendConstants.RACT_ASSESSMENT_REVIEW_SUBMIT_TEXT}
          name={FrontendConstants.RACT_ASSESSMENT_REVIEW_REJECT_NAME}
          placeholder={FrontendConstants.RACT_ASSESSMENT_REVIEW_REJECTION_COMMENT_PLACEHOLDER}
          show={onRejectModal}
          onClose={handleRejectCancel}
          onSubmit={handleOnReviewSubmit}
          onInputReviewHandleChange={onInputReviewHandleChange}
          reviewCommentError={reviewCommentError}
        />
        <ReviewModal
          headerText={FrontendConstants.RACT_ASSESSMENT_REVIEW_APPROVE_HEADER_TEXT}
          cancelText={FrontendConstants.RACT_ASSESSMENT_REVIEW_CANCEL_TEXT}
          submitText={FrontendConstants.RACT_ASSESSMENT_REVIEW_SUBMIT_TEXT}
          name={FrontendConstants.RACT_ASSESSMENT_REVIEW_APPROVE_NAME}
          placeholder={FrontendConstants.RACT_ASSESSMENT_REVIEW_APPROVE_COMMENT_PLACEHOLDER}
          show={onApproveModal}
          onClose={handleApproveCancel}
          onSubmit={handleOnReviewSubmit}
          onInputReviewHandleChange={onInputReviewHandleChange}
          reviewCommentError={reviewCommentError}
        />
      </React.Fragment>
      )
    }
  </React.Fragment>;
}

RactAssessment.PropTypes = {
  riskType: PropTypes.Array,
  riskCategoryRange: PropTypes.string,
  ractTemplateId: PropTypes.string
}

export default forwardRef(RactAssessment);

