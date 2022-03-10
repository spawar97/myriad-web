import React, {useState, useEffect, forwardRef, useImperativeHandle, useRef} from 'react';
import {PropTypes} from 'prop-types';
import RiskObjective from './RiskObjective';
import EnableCategory from './EnableCategory';
import ExposureActions from '../../../../actions/ExposureActions';
import RiskScaleModal from './RiskScaleModal';
import Accordion from './commonComponents/Accordian';
import DetailedAccordian from './commonComponents/DetailedAccordian';
import PreviewTable from './commonComponents/PreviewTable';
import AddRiskCategoryModal from './commonComponents/AddRiskCategoryModal';
import AddCustomRiskSubcategoryModal from './commonComponents/AddCustomRiskSubcategoryModal';
import WarningPopUpModal from './commonComponents/WarningPopUpModal';
import FrontendConstants from '../../../../constants/FrontendConstants';
import StatusMessageTypeConstants from '../../../../constants/StatusMessageTypeConstants';
import RactScorecardStore from '../../../../stores/RactScorecardStore';
import RouteNameConstants from '../../../../constants/RouteNameConstants';
import ContentPlaceholder from '../../../../components/ContentPlaceholder';
import Imm from 'immutable';
import './style.scss';
import RACTConsoleUtil from '../../../../util/RactConsoleUtil';

const Template = (props) => {
  const [templateName, setTemplateName] = useState("");
  const [disable, setDisable] = useState(false);
  const [updatedTemplateName, setUpdatedTemplateName] = useState(false);
  const childRef = useRef();

  const updateTemplate = (name) => {
    setUpdatedTemplateName(name);
    setTemplateName(name);
  }
  return <div>
    <HeaderLabels 
      childRef = { childRef }
      setTemplateName={setTemplateName}
      disable={disable}
      updatedTemplateName={updatedTemplateName}
    />
    <Container 
      ref={childRef}
      templateName={templateName}
      updateTemplate={updateTemplate}
      setDisable={setDisable}
      props={props}
    />
  </div>;
}

const HeaderLabels = (props) => {
  const [name, setName] = useState("");
  const changeName = (e) => {
    setName(e.target.value);
    props.setTemplateName(e.target.value);
    props.childRef.current.setIsTemplateChange(true);
  }
  let templateName = props.updatedTemplateName;
  let isView = false;
  let isEdit = false;
  if (window.location.pathname.includes('view-template') && templateName) {
    isView = true;
  } else if (window.location.pathname.includes('edit-template')) {
    isEdit = true;
  }
  useEffect(() => {
    if (window.location.pathname.includes('edit-template') && templateName) {
      setName(templateName);
    } else if (window.location.pathname.includes('view-template') && templateName) {
      setName(templateName);
    } else if (window.location.pathname.includes('duplicate-template')) {
      props.setTemplateName("");
    }
  }, [templateName]);

  return <React.Fragment>
    <table className="step-button-container">
      <thead/>
      <tbody>
      <tr>
        <td>
          <div className="step-indicator-container">
            <div
              className={props.disable ? "step-indicator-arrow arrow-one first-tab" : "step-indicator-arrow arrow-one"}></div>
            <div
              className={props.disable ? "step-indicator ract-template disabled" : "step-indicator ract-template enabled"}>
              {isView && !isEdit ? FrontendConstants.RACT_VIEW_TEMPLATE : !isView && isEdit ? FrontendConstants.RACT_UPDATE_TEMPLATE : FrontendConstants.RACT_CREATE_TEMPLATE}
            </div>
            <div className="step-indicator-arrow arrow-two"></div>
            <div className={props.disable ? "step-indicator preview enabled" : "step-indicator preview disabled"}>
              Preview
            </div>
          </div>
        </td>
        <td className="right-align">
            <div className="ract-create-template-close close-button" onClick={() => { props.childRef.current.handleCreateTemplateClose() }} />
        </td>
      </tr>
      </tbody>
    </table>
    <div className="template">
      <table className="temp-container">
        <thead/>
        <tbody>
        <tr>
          <td className="temp-name-container">
            <label className="template-input-label title">Template Name *</label>
          </td>
          <td>
            {!isView ? <input type="text" name="template" value={name} className="template-area" onChange={(e) => {
              changeName(e)
            }} disabled={props.disable}/> : <div>{name}</div>}
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </React.Fragment>;
}

const Subtitles = (props) => {
  const {scaleData, isView} = props;
  const [show, setShow] = useState(false);

  const toggleModal = () => {
    setShow(!show);
    props.closeCustomSubcategory();
  }

  const closeModal = () => {
    setShow(false);
  }

  return <div>
    <div className="risk-category-subtitle">
      <div className="ract-module row title left-align">Risk Category</div>
      <div className="ract-module row right-align">
        <div className="risk-score-trigger">
          <div className="subtitle color right-align">
            <span className="align-risk-scale show-pointer" onClick={() => toggleModal()}>
              Risk Scale
              <span className="icon-setter">
                <span className="icon-DownArrow"></span>
              </span>
            </span>
          </div>
        </div>
        <RiskScaleModal show={show} data={scaleData} isView={isView} close={closeModal}
                        updateRiskScale={props.updateScale}/>
      </div>
    </div>
  </div>;
}

const Container = forwardRef ((props, ref) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [riskScale, setRiskScale] = useState({riskScale: props.riskScale});
  const [categories, setCategories] = useState([]);
  const [show, setShow] = useState(false);
  const [openSubcategoryModal, setOpenSubcategoryModal] = useState(false);
  const [customCategory, setCustomCategory] = useState({value: ''});
  const [edit, setEdit] = useState(true);
  const [customSubcategory, setCustomSubcategory] = useState({value: ''});
  const [currentCategory, setCurrentCategory] = useState({id: ''});
  const [editObj, setEditObj] = useState(false);
  const [objective, setObjective] = useState({value: ''});
  const [pageEdited, setPageEdited] = useState(false);
  const [displayWarning, setDisplayWarning] = useState(false);
  const [PrevState, setPrevState] = useState([]);
  const [nextTab, setNextTab] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [updatedSubCategory, setUpdatedSubCategory] = useState({"id": null, "subcategories": [], "updated": false});
  const [deleteCategory, setDeleteCategory] = useState(false);
  const [activeAccordian, setActiveAccordian] = useState({"accordian": null, "state": null});
  const [isLoading, setIsLoading] = useState(false);
  const [ractTemplateId, setRactTemplateId] = useState("");
  const [ractId, setRactId] = useState("");
  // const [templateStatus, setTemplateStatus] = useState(false);
  const [ShowClosePageWarningModal, setShowClosePageWarningModal] = useState(false);
  const [isTemplateChange, setIsTemplateChange] = useState(false);

  const {params} = props.props;
  let isView = false;
  if (window.location.pathname.includes('view-template')) {
    isView = true
  }
  const immRactStore = RactScorecardStore.getStore();
  const OOBCategoriesData = immRactStore.get('OOBCategoriesData');
  const OOBSubCategoriesData = immRactStore.get('OOBSubCategoriesData');

  const closePreviousAccordion = (current, activeState) => {
    setActiveAccordian({"accordian": current, "state": activeState});
  }

  const closeModal = (e) => {
    setShow(false);
  }

  const closeSubcategoryModal = (e) => {
    setOpenSubcategoryModal(false);
  }

  const handleChange = (event) => {
    setCustomCategory({value: event.target.value});
  }

  const subcategoryHandleChange = (event) => {
    setCustomSubcategory({value: event.target.value});
  }

  const questionHandleChange = (value, subcategoryId, categoryId) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == categoryId) {
        let activeCategory = val.riskSubCategories.filter(subDetail => subDetail.id == subcategoryId)
        activeCategory[0].question = value;
        if (ractTemplateId) {
          val.isUpdate = true;
          activeCategory[0].isUpdate = true;
        }
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  const considerationHandleChange = (value, subcategoryId, categoryId) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id == categoryId) {
        let activeCategory = val.riskSubCategories.filter(subDetail => subDetail.id == subcategoryId)
        activeCategory[0].consideration = value;
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  const storePrevious = () => {
    let deepCopy = JSON.parse(JSON.stringify(categories));
    setPrevState([...PrevState, deepCopy]);
  }

  const searchAndUpdate = (category) => {
    storePrevious();
    let regex = new RegExp(/^(?!\s*$).+/);
    if (props.templateName && regex.test(props.templateName)) {
      if (checkForQuestion(category)) {
        disableEdit();
        saveObjective();
        if (checkForSubcategories() && category) {
          setPageEdited(false);
          setIsTemplateChange(false);
        } else if (deleteCategory) {
          setPageEdited(false);
          setIsTemplateChange(false);
          setDeleteCategory(false);
        } else {
          ExposureActions.createStatusMessage(
            FrontendConstants.RISK_SUBCATEGORY_EMPTY,
            StatusMessageTypeConstants.TOAST_INFO
          );
        }
        setPrevState([]);
        if ((checkForSubcategories() && category) || deleteCategory) {
          createRactTemplate(false);
        }
      } else {
        ExposureActions.createStatusMessage(
          FrontendConstants.RACT_SUBCATEGORY_QUESTION_ERROR,
          StatusMessageTypeConstants.TOAST_INFO
        );
      }
    } else {
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_TEMPLATE_NAME_ERROR,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }

  const checkForSubcategories = () => {
    if (deleteCategory) {
      return true
    } else {
      let subcategoriesPresent = true;
      let existingcategories = JSON.parse(JSON.stringify(categories));
      for (let i = 0; i < existingcategories.length; i++) {
        if (!existingcategories[i].isDeleted) {
          if (existingcategories[i].riskSubCategories.length === 0) {
            subcategoriesPresent = false;
            break;
          } else {
            if (!subcategoriesPresent) {
              subcategoriesPresent = false;
              break;
            }
            for (let j = 0; j < existingcategories[i].riskSubCategories.length; j++) {
              if (!existingcategories[i].riskSubCategories[j].isDeleted) {
                subcategoriesPresent = true;
                break;
              } else {
                subcategoriesPresent = false;
              }
            }
          }
        }
      }
      return subcategoriesPresent;
    }
  }

  /*Enable category handleChange*/
  const handleEnableCategory = (currentTab, enable) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id === currentTab.id) {
        val.enable = !enable;
        if (ractTemplateId) {
          val.isUpdate = true;
        }
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
  }

  /*Enable subcategory handleChange*/
  const handleEnablesubCategory = (currEnabled, currentTab, currentSubcategory) => {
    storePrevious();
    const updatedCategories = categories.map(val => {
      if (val.id === currentTab.id) {
        let activeCategory = val.riskSubCategories.filter(subDetail => subDetail.id === currentSubcategory)
        activeCategory[0].enable = !currEnabled;
        if (ractTemplateId) {
          val.isUpdate = true;
          activeCategory[0].isUpdate = true;
        }
      }
      return val
    })
    setCategories(updatedCategories);
    setPageEdited(true);
    autoUpdateCategory(currentTab, updatedCategories);
  }

  const manageEnableCategory = (enable, object) => {
    storePrevious();
    setPageEdited(true);
  }

  const manageEnableSubCategory = (enable, object, subId) => {
    storePrevious();
    let subcategory = {"id": "", "enable": ""};
    subcategory["id"] = subId;
    subcategory["enable"] = enable;
    let array = updatedSubCategory.subcategories;
    array.push(subcategory);
    setUpdatedSubCategory({"id": object.id, "subcategories": array, "updated": true});
    setPageEdited(true);
  }

  const autoUpdateCategory = (object, updatedCategories) => {
    if (checkAllDisabled(object, updatedCategories)) {
      updateRiskCategory(false, updatedCategories, object);
    } else {
      setCategories(updatedCategories);
      setPageEdited(true);
    }
  }

  const updateRiskCategory = (value, updatedCategories, object) => {
    let riskCategories = updatedCategories.map(val => {
      if (val.id === object.id) {
        val.enable = value
      }
      return val;
    })
    setCategories(riskCategories);
    setPageEdited(true);
  }

  const checkAllDisabled = (object, updatedCategories) => {
    let allFalse = true;
    updatedCategories.map(val => {
      if (val.id === object.id) {
        let subcategories = val.riskSubCategories;
        subcategories.map(sub => {
          if (sub.enable === true) {
            allFalse = false;
          }
        })
      }
    })
    return allFalse
  }

  const saveObjective = () => {
    storePrevious();
    let categoryId = categories[currentTab] && categories[currentTab].id;
    if (objective.value) {
      let array = categories;
      for (let i = 0; i < array.length; i++) {
        if (array[i].id === categoryId) {
          array[i].objective = objective.value;
        }
      }
      setCategories(array);
      setEditObj(false);
      setObjective({value: ''});
    }
  }

  const generateTemporaryCustomId = (array, option) => {
    if (option === "categories" && array.length > 0) {
      let last = array.length;
      let id = parseInt(last) + 1
      return id.toString();
    } else if (option === "subcategories" && array.length > 0) {
      let last = array.length + 1;
      let categoryId = currentCategory.id;
      return categoryId + "." + last.toString();
    } else if (option === "subcategories" && array.length == 0) {
      let categoryId = currentCategory.id;
      return categoryId + "." + "1";
    }
  }

  const checkIfEmpty = (data) => {
    let regex = new RegExp(/^(?!\s*$).+/);
    if (data && regex.test(data)) {
      return true
    } else {
      return false
    }
  }

  const addCategory = () => {
    setDeleteCategory(false);
    if (checkIfEmpty(customCategory.value)) {
      storePrevious();
      if (checkForDuplicateName(categories, customCategory.value)) {
        ExposureActions.createStatusMessage(
          FrontendConstants.RISK_CATEGORY_DUPLICATE,
          StatusMessageTypeConstants.TOAST_INFO
        );
      } else {
        let newCategory = {};
        newCategory["id"] = generateTemporaryCustomId(categories, "categories");
        newCategory["name"] = customCategory.value;
        newCategory["objective"] = customCategory.value;
        newCategory["type"] = "custom"
        newCategory["enable"] = true;
        newCategory["riskSubCategories"] = [];
        setCategories([...categories, newCategory]);
        setShow(false);
        setPageEdited(true);
        ExposureActions.createStatusMessage(
          FrontendConstants.RISK_SUBCATEGORY_EMPTY,
          StatusMessageTypeConstants.TOAST_INFO
        );
        let newTab = categories.length;
        setCurrentTab(newTab);
        disableEdit();
      }
    } else {
      let newCategory = {};
      newCategory["id"] = generateTemporaryCustomId(categories, "categories");
      newCategory["name"] = customCategory.value;
      newCategory["objective"] = customCategory.value;
      newCategory["type"] = "custom";
      newCategory["enable"] = true;
      newCategory["riskSubCategories"] = [];
      setCategories([...categories, newCategory]);
      setShow(false);
      setPageEdited(true);
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_VALID_CATEGORY,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }

  const removeCategory = (e, id) => {
    storePrevious();
    e.preventDefault();
    let array = [...categories];
    let refinedCategories;
    if (ractTemplateId) {
      refinedCategories = categories.map(val => {
        if (val.id === id && val.type !== "custom") {
          val.isUpdate = true;
          val.isDeleted = true;
        } else if (val.id === id && val.type === "custom") {
          val.isUpdate = false;
          val.isDeleted = true;
        }
        return val
      })
    } else {
      refinedCategories = array.filter(function (obj) {
        return obj.id !== id;
      });
    }
    setCategories(refinedCategories);
    setPageEdited(true);
    setDeleteCategory(true);
  }

  const removeSubcategory = (e, subId, catId) => {
    storePrevious();
    let array = [...categories];
    for (let i = 0; i < array.length; i++) {
      if (array[i].id === catId) {
        let refinedsubCategories;
        if (ractTemplateId) {
          refinedsubCategories = array[i].riskSubCategories.map(subDetail => {
            if (subDetail.id === subId && subDetail.type !== "custom") {
              subDetail.isUpdate = true;
              subDetail.isDeleted = true;
              array[i].isUpdate = true;
            } else if (subDetail.id === subId && subDetail.type === "custom") {
              subDetail.isUpdate = false;
              subDetail.isDeleted = true;
            }
            return subDetail
          })
        } else {
          refinedsubCategories = array[i].riskSubCategories.filter(function (obj) {
            return obj.id !== subId;
          });
        }
        array[i].riskSubCategories = refinedsubCategories;
      }
    }
    setCategories(array);
    setPageEdited(true);
  }

  const handleClick = (current, category) => {
    if (pageEdited && currentTab != current) {
      setDisplayWarning(true);
      setNextTab(current);
    } else {
      setCurrentTab(current);
      disableEdit();
    }
  };

  const triggerEdit = () => {
    storePrevious();
    setEdit(true);
  }

  const disableEdit = () => {
    setEdit(false);
  }

  const openCustomSubcategoryModal = (id) => {
    setOpenSubcategoryModal(true);
    setCurrentCategory({id: id});
  }

  const searchAndUpdateSubcategory = () => {
    if (checkIfEmpty(customSubcategory.value)) {
      storePrevious();
      let array = [...categories];
      let result = array.filter(obj => {
        return obj.id == currentCategory.id
      })
      if (checkForDuplicateName(result[0].riskSubCategories, customSubcategory.value)) {
        ExposureActions.createStatusMessage(
          FrontendConstants.RISK_SUBCATEGORY_DUPLICATE,
          StatusMessageTypeConstants.TOAST_INFO
        );
      } else if (OOBSubCategoriesData.includes((customSubcategory.value).toLowerCase())) {
        ExposureActions.createStatusMessage(
          FrontendConstants.RISK_SUBCATEGORY_DUPLICATE,
          StatusMessageTypeConstants.TOAST_INFO
        );
      } else {
        for (let i = 0; i < array.length; i++) {
          if (array[i].id === currentCategory.id) {
            let subcategories = array[i].riskSubCategories;
            let obj = {}
            obj["id"] = generateTemporaryCustomId(subcategories, "subcategories", currentCategory);
            obj["name"] = customSubcategory.value;
            obj["enable"] = true
            obj["question"] = "";
            obj["consideration"] = "";
            obj["type"] = "custom";
            subcategories.push(obj)
          }
        }
        setCategories(array);
        setOpenSubcategoryModal(false);
        setPageEdited(true);
      }
    } else {
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_VALID_SUBCATEGORY,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }

  const categoriesEnabled = () => {
    let updatedcategories = JSON.parse(JSON.stringify(categories));
    let enabled = false;
    for (let i = 0; i < updatedcategories.length; i++) {
      if (updatedcategories[i].enable) {
        enabled = true;
      }
    }
    return enabled;
  }

  const checkForDuplicateName = (array, name) => {
    let duplicate = false;
    array.map(val => {
      if (!val.isDeleted && val.name.toLowerCase() === name.toLowerCase()) {
        duplicate = true;
      }
    })
    return duplicate
  }

  const createRactTemplate = async (status) => {
    if (categoriesEnabled()) {
      let immCategories = Imm.fromJS(categories).toJSON();
      let sequencedCategories = immCategories.map(category => {
        if ((ractTemplateId && category.isUpdate) || !ractTemplateId) {
          let sequencedCategory = {};
          sequencedCategory["id"] = category["type"] === "custom" ? "" : category["id"];
          sequencedCategory["name"] = category["name"];
          sequencedCategory["objective"] = category["objective"];
          sequencedCategory["enable"] = category["enable"];
          sequencedCategory["isDeleted"] = category["isDeleted"] == true ? true : false;
          let riskSubCategories = category["riskSubCategories"]
          let newSubCategories = riskSubCategories.map(subcategory => {
            if ((ractTemplateId && subcategory.isUpdate) || !ractTemplateId) {
              let sequencedSubCategory = {}
              sequencedSubCategory["id"] = subcategory["type"] === "custom" ? "" : subcategory["id"];
              sequencedSubCategory["name"] = subcategory["name"];
              sequencedSubCategory["question"] = subcategory["question"];
              sequencedSubCategory["consideration"] = subcategory["consideration"];
              sequencedSubCategory["enable"] = subcategory["enable"];
              sequencedSubCategory["isDeleted"] = subcategory["isDeleted"] == true ? true : false
              return sequencedSubCategory;
            }
          })
          sequencedCategory["riskSubCategories"] = newSubCategories;
          return sequencedCategory;
        }
      })
      sequencedCategories = sequencedCategories.filter(function (obj) {
        return !!obj;
      });

      sequencedCategories = sequencedCategories.map(val => {
        let refinedsubCategories = val.riskSubCategories.filter(function (subcat) {
          return !!subcat;
        });
        val.riskSubCategories = refinedsubCategories;
        return val
      })
      const createRactTemplateData = {
        'id': ractTemplateId ? ractTemplateId : '',
        'ractId': ractId ? ractId : '',
        'riskCategoryRange': riskScale.riskScale,
        'name': props.templateName,
        'description': '',
        'status': status ? true : false,
        'riskCategories': sequencedCategories,
      }
      setIsLoading(true);
      let response = await RactScorecardStore.createNewRactTemplate(createRactTemplateData);
      if (response && response.id) {
        setRactTemplateId(response.id);
        setRactId(response.ractId);
        setCategories(response.riskCategories);
        setIsLoading(false);
        if (ractTemplateId && !status) {
          ExposureActions.createStatusMessage(
            FrontendConstants.RACT_TEMPLATE_UPDATED,
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
        } else {
          ExposureActions.createStatusMessage(
            FrontendConstants.RACT_TEMPLATE_CREATED,
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
          if (status) {
            redirectToRactHome();
          }
        }
      } else {
        setIsLoading(false);
        ExposureActions.createStatusMessage(
          response.message,
          StatusMessageTypeConstants.TOAST_INFO
        );
        throw new Error(`${FrontendConstants.RACT_API_ERROR} ${response.statusCode}`)
      }
    } else {
      setIsLoading(false);
      ExposureActions.createStatusMessage(
        FrontendConstants.RISK_CATEGORIES_DISABLED,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }
  const redirectToRactHome = () => {
    props.props.router.push(RouteNameConstants.EXPOSURE_RACT);
  }

  const fetchAllCategories = async () => {
    setIsLoading(true);
    let response = await RactScorecardStore.fetchCreateTemplateData();
    if (response.length) {
      refineCategories(response);
    } else {
      setIsLoading(false);
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_RISK_CATEGORY_API_ERROR,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }

  const refineCategories = (data) => {
    const templateId = params && params.ractTemplateId;
    let array = data.map(val => {
      val.enable = true;
      let subcategories = val.riskSubCategories;
      subcategories.map(subcategory => {
        subcategory.enable = true;
      })
      return val;
    })
    if (!templateId) {
      setCategories(array);
    }
    if (templateId === FrontendConstants.OOB_RACT_TEMPLATE_ID) {
      props.updateTemplate(FrontendConstants.RACT_OOB);
      setCategories(array);
    } else if (templateId === FrontendConstants.OOB1_RACT_TEMPLATE_ID) {
      props.updateTemplate(FrontendConstants.RACT_OOB_1);
      setCategories(array);
    }
    setIsLoading(false);
  }

  const fetchRactTemplateData = async () => {
    const templateId = params && params.ractTemplateId;
    if (templateId) {
      setIsLoading(true);
      await RactScorecardStore.fetchRactTemplateData(templateId).then(async (data) => {
        setCategories(data.riskCategories);
        if (window.location.pathname.includes('edit-template') || window.location.pathname.includes('view-template')) {
          setRactTemplateId(data.id);
          setRactId(data.ractId);
          props.updateTemplate(data.name);
        } else {
          props.updateTemplate("");
        }
        setRiskScale({riskScale: data.riskCategoryRange});
        setIsLoading(false);
      }).catch(error => {
        setIsLoading(false);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING,
        );
      });
    }
  }

  useEffect(() => {
    const templateId = params && params.ractTemplateId;
    fetchAllCategories();
    if (templateId && templateId !== FrontendConstants.OOB_RACT_TEMPLATE_ID && templateId !== FrontendConstants.OOB1_RACT_TEMPLATE_ID) {
      fetchRactTemplateData();
    }
  }, []);

  const riskObj = () => {
    setEditObj(!editObj);
  }

  const save = (value) => {
    setObjective({value: value});
    setPageEdited(true);
  }

  const closeWarning = () => {
    setDisplayWarning(false);
  }

  const updateRiskScale = (value) => {
    setRiskScale({riskScale: value});
    ExposureActions.createStatusMessage(
      FrontendConstants.RISK_SCALE_UPDATED,
      StatusMessageTypeConstants.TOAST_SUCCESS
    );
    setIsTemplateChange(true);
  }

  const discard = () => {
    setDisplayWarning(false);
    setCategories(PrevState && PrevState[0]);
    setPrevState([]);
    setPageEdited(false);
    setCurrentTab(nextTab);
    disableEdit();
  }

  const saveAndNext = (category) => {
    let regex = new RegExp(/^(?!\s*$).+/);
    if (props.templateName && regex.test(props.templateName)) {
      if (checkForQuestion(category)) {
        if (checkForSubcategories() && category) {
          createRactTemplate(false);
          setShowPreview(true);
          props.setDisable(true);
          setPageEdited(false);
          setIsTemplateChange(false);
        } else if (deleteCategory) {
          setPageEdited(false);
          setIsTemplateChange(false);
          setDeleteCategory(false);
          ExposureActions.createStatusMessage(
            FrontendConstants.RISK_CATEGORY_UPDATED,
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
        } else {
          ExposureActions.createStatusMessage(
            FrontendConstants.RISK_SUBCATEGORY_EMPTY,
            StatusMessageTypeConstants.TOAST_INFO
          );
        }
      } else {
        ExposureActions.createStatusMessage(
          FrontendConstants.RACT_SUBCATEGORY_QUESTION_INFO,
          StatusMessageTypeConstants.TOAST_INFO
        );
      }
    } else {
      ExposureActions.createStatusMessage(
        FrontendConstants.RACT_TEMPLATE_NAME_ERROR,
        StatusMessageTypeConstants.TOAST_INFO
      );
    }
  }

  const backToPrevious = () => {
    setShowPreview(false);
    props.setDisable(false);
  }

  const checkForQuestion = (category) => {
    if (category) {
      let questionPresent = true;
      let regex = new RegExp(/^(?!\s*$).+/);
      let subcategories = category.riskSubCategories;
      if (!category.isDeleted) {
        subcategories.map(val => {
          if (val.question && regex.test(val.question)) {
            questionPresent = true;
          } else {
            if (!val.isDeleted) {
              questionPresent = false;
            }
          }
        })
      }
      return questionPresent;
    } else {
      return true
    }
  }

  /* Create Template Close Functionality */
  useImperativeHandle(ref, () => ({

    handleCreateTemplateClose: () => {
      if (pageEdited || isTemplateChange) {
        setShowClosePageWarningModal(true);
      } else {
        props.props.router.push({
          name: RouteNameConstants.EXPOSURE_RACT_TEMPLATE_CONFIGURATION
        })
      }

    },
    setIsTemplateChange: setIsTemplateChange
  }));

  const handleNoAssessmentClose = () => {
    setShowClosePageWarningModal(false);
  }

  const handleYesAssessmentClose = () => {
    RACTConsoleUtil.routeChange(props.props, RouteNameConstants.EXPOSURE_RACT_TEMPLATE_CONFIGURATION);
  }

  return <React.Fragment>
    {isLoading ? <ContentPlaceholder containerClassName={"ract-loader"}/> : null}
    {showPreview ? null :
      <Subtitles scaleData={riskScale} updateRiskScale={updateRiskScale} isView={isView} updateScale={updateRiskScale}
                 closeCustomSubcategory={closeSubcategoryModal}/>}
    <div className="container">
      <div className="ract-tab">
        {
          categories && categories.map((category, i) => (
              !category.isDeleted ? <button
                key={category.id}
                className={currentTab === i ? "tablinks active" : "tablinks inactive"}
                id={category.enable ? category.id : "disabled"}
                onClick={(e) => handleClick(i, category)}
              >
                {category.name}
                {!(OOBCategoriesData.includes((category.name).toLowerCase())) && category.enable  && !isView && showPreview === false ?
                  <span className="close remove-category"
                      onClick={(e) => removeCategory(e, category.id)}>&times;</span> : null}
              </button> : ''
            )
          )}
        {showPreview ? null : <div className="add-custom-category">
          {!isView ? <button
            className="btn btn-secondary custom ract-add-button"
            onClick={() => {
              setShow(!show);
              closeSubcategoryModal()
            }}
          >
            Add Custom Risk Category
            <span className="plus-icon absolute-icon"/>
          </button> : ""}
        </div>}
      </div>
      {showPreview === false ?
        <div className="tabcontent" id="inner-tab-content">
          {currentTab !== -1 &&
          <React.Fragment>
            <div className="category-description">
              <div className="flex-container">
                <div className="text-description">
                  <table className="risk-parameter-table">
                    <thead/>
                    <tbody>
                    <tr>
                      <td className="t-label p-title">Risk Category</td>
                      <td
                        className="info-font-weight">{categories[currentTab] && !categories[currentTab].isDeleted ? categories[currentTab].name : ''}</td>
                    </tr>
                    <tr>
                      <td className="t-label p-title">Risk Objective</td>
                      {categories[currentTab] && !categories[currentTab].isDeleted ?
                        <RiskObjective isView={isView} enable={editObj} current={categories[currentTab]}
                                       triggerEdit={riskObj} disableEdit={() => setEditObj(false)}
                                       objective={categories[currentTab].objective}
                                       objectivetype={categories[currentTab].type} changeObjective={save}/> : ''}
                    </tr>
                    </tbody>
                  </table>
                </div>
                <div className="enable-category">
                  {categories[currentTab] && <EnableCategory enable={categories[currentTab].enable} isView={isView}
                                                             category={categories[currentTab]}
                                                             changeEnable={manageEnableCategory}
                                                             updateEnable={handleEnableCategory}/>}
                </div>
              </div>
              <div className="flex-container subcategory-container">
                <div className="ract-module row">
                  <span className="risk-subcategory-title">Risk Subcategory</span>
                </div>
                {!isView ?
                  <div className="custom-subcategory-container">
                    <div className="add-custom-subcategory">
                      <span className="plus-icon"
                            onClick={() => openCustomSubcategoryModal(categories[currentTab].id)}></span>
                      <span className="custom-subcategory-title color show-pointer"
                            onClick={() => openCustomSubcategoryModal(categories[currentTab].id)}>Add Custom Risk Subcategory
                </span>
                    </div>
                    <AddCustomRiskSubcategoryModal show={openSubcategoryModal} onClose={closeSubcategoryModal}
                                                   onHandleChange={subcategoryHandleChange}
                                                   onAdd={searchAndUpdateSubcategory}/>
                  </div> : <div></div>}
              </div>
              <div>
                {categories[currentTab] && categories[currentTab].riskSubCategories && categories[currentTab].riskSubCategories.map((object, i) => (
                  <React.Fragment>
                    <Accordion
                      index={i}
                      key={i}
                      isView={isView}
                      current={object}
                      active={activeAccordian}
                      category={categories[currentTab]}
                      remove={removeSubcategory}
                      closeAcc={closePreviousAccordion}
                      content={<DetailedAccordian category={categories[currentTab]} isView={isView} details={object}
                                                  question={questionHandleChange}
                                                  consideration={considerationHandleChange} editOption={triggerEdit}
                                                  enableEdit={edit}
                                                  toggleEnable={manageEnableSubCategory}
                                                  updateEnable={handleEnablesubCategory}/>}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </React.Fragment>}
        </div> :
        <div className="tabcontent preview-tab-content" id="inner-tab-content">
          <PreviewTable show={showPreview} data={categories[currentTab] && categories[currentTab].riskSubCategories}
                        index={currentTab} enabled={categories[currentTab] && categories[currentTab].enable}
                        currentTab={currentTab}/>
        </div>
      }
      {showPreview === false && !isView ?
        <div className="save-next">
          <button className="btn btn-secondary save-btn" onClick={() => searchAndUpdate(categories[currentTab])}>Save
          </button>
          <button className="btn btn-primary save-next-icon-button"
                  onClick={() => saveAndNext(categories[currentTab])}>Save & Next <span
            className="icon-arrow-right save-next-icon"/></button>
        </div> : showPreview === true ?
          <div className="preview-next">
            <button className="btn btn-secondary preview-buttons previous-btn" onClick={() => backToPrevious()}><span
              className="icon-arrow-left"/>Previous
            </button>
            <button className="btn btn-primary preview-buttons create-ract-button"
                    onClick={() => createRactTemplate(true)}>Create RACT Template
            </button>
          </div> : ''
      }
      <AddRiskCategoryModal show={show} onClose={closeModal} onHandleChange={handleChange} onAdd={addCategory}/>
      <WarningPopUpModal
        name={FrontendConstants.RACT_ASSESSMENT_TAB_CHANGE}
        show={displayWarning}
        close={closeWarning}
        discard={discard}
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
    </div>
  </React.Fragment>;
})

HeaderLabels.PropTypes = {
  setTemplateName: PropTypes.func,
  disable: PropTypes.bool
}

Subtitles.PropTypes = {
  scaleData: PropTypes.string
}

Container.PropTypes = {
  templateName: PropTypes.string,
  setDisable: PropTypes.func
}

Template.PropTypes = {
  setTemplateName: PropTypes.func,
  disable: PropTypes.bool,
  templateName: PropTypes.string,
  setDisable: PropTypes.func
};

Container.defaultProps = {
  riskScale: FrontendConstants.RISK_SCALE_ONE_TO_FIVE
};

export default Template;
