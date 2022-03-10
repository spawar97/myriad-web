import React, {useState, useEffect} from 'react';
import Combobox from "../../Combobox";
import Imm, {fromJS} from 'immutable';
import RactScorecardStore from "../../../stores/RactScorecardStore";
import ExposureActions from "../../../actions/ExposureActions";
import ContentPlaceholder from "../../../components/ContentPlaceholder";
import FrontendConstants from "../../../constants/FrontendConstants";
import StatusMessageTypeConstants from "../../../constants/StatusMessageTypeConstants";
import {PropTypes} from "prop-types";
import {RactStoreKeys} from "../../../constants/RactConstant";
import  Dialog from "./Dialog";

const AssignRact = (props) => {
  const [studyName, setStudyName] = useState(null);
  const [ractTemplate, setRactTemplate] = useState(null);
  const [studyOptions, setStudyOptions] = useState([]);
  const [ractTemplateOptions, setRactTemplateOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorArray, setErrorArray] = useState([]);
  const [isDisable, setIsDisable] = useState(false);
  const [isClickOnNO, setIsClickOnNO] = useState(false);

  useEffect(() => {
    let allStudies = getAllStudies();
    let templates = getTemplates();
    setStudyOptions(allStudies);
    setRactTemplateOptions(templates);
  }, []);

  const prepareCheckboxData = (label, value) => {
    return {
      "label": label,
      "value": value,
    };
  };

  const prepareStudyData = (studies, type) => {
    let study;
    if (type === 'ractStudies') {
      study = studies.map((study, key) => {
        return prepareCheckboxData(study.get("protocolName"), study.get("protocolId"));
      });
    } else {
      study = studies.map((study, key) => {
        return prepareCheckboxData(study.get("value"), key);
      });
    }
    return study.toArray();
  };

  const prepareTemlateData = (templates) => {
    templates = templates.filter(template => template.get('status') === FrontendConstants.RACT_TEMPLATE_FINAL_STATUS);
    return templates.map(template => {
      return prepareCheckboxData(template.get("name"), template.get("id"));
    });
  };

  const getAllStudies = () => {
    const immRactStore = RactScorecardStore.getStore();
    const customStudies = prepareStudyData(immRactStore.get('ractStudies'), 'ractStudies');
    const masterStudies = prepareStudyData(props.immStudies, 'masterStudies');
    return masterStudies.concat(customStudies);
  };

  const getTemplates = () => {
    const immRactStore = RactScorecardStore.getStore();
    const templates = prepareTemlateData(immRactStore.get('ractTemplates'));
    return templates;
  };

  const getConsoleData = () => {
    const immRactStore = RactScorecardStore.getStore();
    const consoleData = immRactStore.get(RactStoreKeys.RACT_CONSOLE_DATA);
    return consoleData;
  };

  useEffect(() => {
    if(!isClickOnNO){
      getWarning();
    }
  }, [studyName, ractTemplate])

  const emptyValue = (name) => {
    let studyPresentName = 'studyPresent';
    let error = [];

    if (name === studyPresentName) {
      const consoleData = getConsoleData().toJS();
      let existingTemplateId = consoleData[studyName] && consoleData[studyName].ractInfo.ractTemplateId;
      
      setIsClickOnNO(true);
      setRactTemplate(existingTemplateId);
      setErrorArray(error);
    } else {
      setErrorArray(error);
    }
  }

  const getWarning = () => {
    let error = [];
    setErrorArray(error);
    const consoleData = getConsoleData().toJS();
    if(studyName && ractTemplate) {
      const studies = Object.keys(consoleData)
      if(studies.includes(studyName)) {
        let existingTemplateName = consoleData[studyName].ractInfo.name;
        const templatesList = getTemplates().toJS();
        const templateName = templatesList.filter(t => t.value === ractTemplate)
        if(existingTemplateName !== templateName[0].label) {
          error["studyPresent"] = true;
          error["previousStudyTemplateName"] = existingTemplateName;
          setErrorArray(error);
          setIsDisable(true)
        } else if (existingTemplateName === templateName[0].label) {
          setIsDisable(true)
          error["existingTemplateName"] = existingTemplateName;
          error["sameStudy"] = true;
        }
      } else {
        setIsDisable(false)
      }
    }
  }

  const createPostData = (studyId, ractTemplateId) => {
    return {
      "ractTemplateId": ractTemplateId,
      "studyId": studyId,
      "checkCustom": true,
    };
  };

  const AssignRactTemplate = async () => {
    const data = createPostData(studyName, ractTemplate);
    handleValidation(data);
    if (studyName && ractTemplate) {
      setIsLoading(true);
      setErrorArray(false);
      setIsDisable(false);
      setIsClickOnNO(false);
      await RactScorecardStore.assignRactTemplate(data).then(resp => {
        setIsLoading(false);
        if (resp && !resp.message) {
          if (resp.ractId !== "") {
            ExposureActions.createStatusMessage(
                FrontendConstants.RACT_ASSIGN_TEMPLATE_SUCCESSFULLY,
                StatusMessageTypeConstants.TOAST_SUCCESS,
            );
            props.onAssignRact();
          } else {
            ExposureActions.createStatusMessage(
                FrontendConstants.RACT_ASSIGN_TEMPLATE_TOAST_ERROR,
                StatusMessageTypeConstants.TOAST_ERROR,
            );
            props.onAssignRact();
          }
        } else {
          throw new Error
        }
      }).catch(error => {
        setIsLoading(false);
        setIsDisable(false);
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageTypeConstants.WARNING,
        );
      });
    }
  };

  const handleValidation = (data) => {
    let error = [];
    if (!data.ractTemplateId) {
      error["ractTemplateId"] = true;
    }
    if (!data.studyId) {
      error["studyId"] = true;
    }
    if (Object.keys(error).length > 0) {
      setErrorArray(error);
    }
  };

  const handleSelection = (type, value) => {
    if (type === FrontendConstants.RACT_ASSIGN_RACT_TYPE_SELECTED_STUDY) {
      setIsClickOnNO(false);
      setStudyName(value);

      const consoleData = getConsoleData().toJS();
      let existingTemplateId = consoleData[value] && consoleData[value].ractInfo.ractTemplateId;

      if (existingTemplateId) {
        setRactTemplate(existingTemplateId);
      } else {
        setRactTemplate(null);
      }

    } else {
      setIsClickOnNO(false);
      setRactTemplate(value);
    }
  };

  return (
      <div className={'assignRactContainer'}>
        {isLoading ? <ContentPlaceholder/> : null}
        <div className={'assignRactContent'}>
          <h3> Assign RACT Template to Studies </h3>
          <div className={'selectionContainer'}>
            <div className={'studyDropdownSection'}>
              <h4>Study</h4>
              <Combobox
                  placeholder={FrontendConstants.STUDY}
                  value={studyName}
                  onChange={handleSelection.bind(null, FrontendConstants.RACT_ASSIGN_RACT_TYPE_SELECTED_STUDY)}
                  options={fromJS(studyOptions)}
              />
              {
                (errorArray.hasOwnProperty("studyId")) ?
                    <span className="assign-study-errors">
                      {FrontendConstants.RACT_ASSIGN_STUDY_ID_ERROR_MESSAGE}
                  </span>
                    : null
              }
            </div>
            <div className={'templateDropdownSection'}>
              <h4>Template</h4>
              <Combobox
                  placeholder={FrontendConstants.RACT_ASSIGN_TEMPLATE_PLACEHOLDER}
                  value={ractTemplate}
                  onChange={handleSelection.bind(null, FrontendConstants.RACT_ASSIGN_RACT_TYPE_SELECTED_TEMPLATE)}
                  options={Imm.fromJS(ractTemplateOptions)}
              />
              {
                (errorArray.hasOwnProperty("ractTemplateId")) ?
                    <span className="assign-template-errors" style={{color: 'red'}}>
                      {FrontendConstants.RACT_ASSIGN_TEMPLATE_ERROR_MESSAGE}
                  </span>
                    : null
              }
              {
                (errorArray.hasOwnProperty("sameStudy")) ?
                    <Dialog  name='sameStudy' assignStudyToTemplate={AssignRactTemplate} errorArray={errorArray} setErrorArray={emptyValue}
                            message={`The current selected template  ${ errorArray['existingTemplateName'] }  is already assigned to this study. Consider assigning a new template.`}
                            consideration= {""} yesOrNo={false}/>
                    : null
              }
            </div>
            <div>
              {isDisable ? (<button className="btn btn-primary btn-disabled right" onClick={AssignRactTemplate} disabled={isDisable}>
                Assign RACT
              </button>) : (
                  <button className="btn btn-primary right" onClick={AssignRactTemplate}>
                    Assign RACT
                  </button>
              )}
              {
                (errorArray.hasOwnProperty("studyPresent")) ?
                    <Dialog name='studyPresent' assignStudyToTemplate={AssignRactTemplate} errorArray={errorArray} setErrorArray={emptyValue}
                            message={`Template  ${ errorArray['previousStudyTemplateName'] }  is already assigned to this study, Once template is changed all previous assessment data will be lost.`}
                            consideration= {"Do you really want to proceed with this change ?"} yesOrNo={true}/>
                    : null
              }
            </div>
          </div>
        </div>
      </div>
  );
};
AssignRact.PropTypes = {
  onAssignRact: PropTypes.func.isRequired,
  immStudies: PropTypes.instanceOf(Imm.Map).isRequired,
};
export default AssignRact;

