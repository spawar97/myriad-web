import React, {useState, useEffect} from 'react';
import Combobox from "../../Combobox";
import Imm from 'immutable';
import RactScorecardStore from "../../../stores/RactScorecardStore";
import ExposureActions from "../../../actions/ExposureActions";
import ContentPlaceholder from "../../ContentPlaceholder";
import FrontendConstants from "../../../constants/FrontendConstants";
import StatusMessageTypeConstants from "../../../constants/StatusMessageTypeConstants";
import Calendar from '../../../components/Calendar';
import {PropTypes} from "prop-types";

const AddNewStudy = (props) => {

  const [studyName, setStudyName] = useState('');
  const [protocolID, setProtocolID] = useState('');
  const [program, setProgram] = useState('');
  const [sponsor, setSponsor] = useState('');
  const [therapeticArea, setTherapeticArea] = useState('');
  const [indication, setIndication] = useState('');
  const [studyStartDate, setStudyStartDate] = useState(null);
  const [studyEndDate, setStudyEndDate] = useState(null);
  const [ractTemplate, setRactTemplate] = useState(null);
  const [ractTemplateOptions, setRactTemplateOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorArray, setErrorArray] = useState({});

  useEffect(() => {
    let templates = getTemplates();
    setRactTemplateOptions(templates);
  }, []);

  const prepareTemlateData = (templates) => {
    templates = templates.filter(template => template.get('status') === FrontendConstants.RACT_TEMPLATE_FINAL_STATUS);
    return templates.map(template => {
      return {
        "label": template.get('name'),
        "value": template.get('id'),
      };
    });
  };

  const getTemplates = () => {
    const immRactStore = RactScorecardStore.getStore();
    const templates = prepareTemlateData(immRactStore.get('ractTemplates'));
    return templates;
  };

  const AddStudy = async () => {
    const studyData = {
      "ractTemplateId": ractTemplate,
      "protocolId": protocolID,
      "projectedStartDate": studyStartDate,
      "projectedEndDate": studyEndDate,
      "protocolName": studyName,
      "sponsor": sponsor,
      "program": program,
      "therapeticArea": therapeticArea,
      "indication": indication,
    };
    if (!!(studyName && ractTemplate && protocolID && studyStartDate && studyEndDate && sponsor && program && therapeticArea && indication)) {
      setIsLoading(true);
      await RactScorecardStore.createRactStudies(studyData).then(data => {
        setIsLoading(false);
        if (data.response != undefined) {
          if (data.response.status == 500) {
            ExposureActions.createStatusMessage(
              FrontendConstants.RACT_PROTOCOL_ID_EXISTS,
              StatusMessageTypeConstants.TOAST_ERROR,
            );
          }
        } else {
          ExposureActions.createStatusMessage(
            FrontendConstants.RACT_ADD_NEW_STUDY_SUCCESS,
            StatusMessageTypeConstants.TOAST_SUCCESS,
          );
          props.onAssignRact();
        }
      }).catch(error => {
        setIsLoading(false);
      });
    } else {
      handleValidation(studyData);
    }
  };

  const handleValidation = (studyData) => {
    let error = {};
    const addNewStudyJson = Imm.fromJS(studyData);
    addNewStudyJson.map((data, key) => {
      if (!data) {
        error[key] = data;
      }
    });
    if (Object.keys(error).length > 0) {
      setErrorArray(error);
    }
  };

  const handleTextInput = e => {
    if (e.target.id === FrontendConstants.RACT_ADD_NEW_STUDY_NAME_INPUT_ID) {
      setStudyName(e.target.value);
    } else if (e.target.id === FrontendConstants.RACT_ADD_NEW_PROTOCOL_ID_INPUT) {
      setProtocolID(e.target.value);
    } else if (e.target.id === FrontendConstants.RACT_ADD_NEW_PROGRAM_INPUT) {
      setProgram(e.target.value);
    } else if (e.target.id === FrontendConstants.RACT_ADD_NEW_THERAPEUTIC_AREA_INPUT) {
      setTherapeticArea(e.target.value);
    } else if (e.target.id === FrontendConstants.RACT_ADD_NEW_INDICATION_INPUT) {
      setIndication(e.target.value);
    } else if (e.target.id === FrontendConstants.RACT_ADD_NEW_SPONSOR_INPUT) {
      setSponsor(e.target.value);
    }
  };

  const handleDateInput = (dateType, value) => {
    if (dateType === FrontendConstants.RACT_START_DATE) {
      setStudyStartDate(value._i);
    } else if (dateType === FrontendConstants.RACT_END_DATE) {
      setStudyEndDate(value._i);
    }
  };

  const handleSelectedTemplate = (template) => {
    setRactTemplate(template);
  };

  return (
    <div className={'addNewStudyContainer'}>
      {isLoading ? <ContentPlaceholder/> : null}
      <div className={'addNewStudyContent'}>
        <h3> Add a New Study </h3>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Study Name</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_STUDY_NAME_INPUT_ID}
            type="text"
            onChange={(handleTextInput)}
            value={studyName}
            placeholder={FrontendConstants.RACT_ADD_NEW_STUDY_NAME_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("protocolName")) ?
              <span className="new-study-errors">
                      {FrontendConstants.RACT_ADD_NEW_STUDY_NAME_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Protocol Id</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_PROTOCOL_ID_INPUT}
            type="text"
            onChange={handleTextInput}
            value={protocolID}
            placeholder={FrontendConstants.RACT_ADD_NEW_PROTOCOL_ID_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("protocolId")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_PROTOCOL_ID_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Program</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_PROGRAM_INPUT}
            type="text"
            onChange={handleTextInput}
            value={program}
            placeholder={FrontendConstants.RACT_ADD_NEW_PROGRAM_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("program")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_PROGRAM_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Sponsor</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_SPONSOR_INPUT}
            type="text"
            onChange={handleTextInput}
            value={sponsor}
            placeholder={FrontendConstants.RACT_ADD_NEW_SPONSOR_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("sponsor")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_SPONSOR_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Therapeutic Area</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_THERAPEUTIC_AREA_INPUT}
            type="text"
            onChange={handleTextInput}
            value={therapeticArea}
            placeholder={FrontendConstants.RACT_ADD_NEW_THERAPEUTIC_AREA_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("therapeticArea")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_THERAPEUTIC_AREA_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Indication</div>
          <input
            id={FrontendConstants.RACT_ADD_NEW_INDICATION_INPUT}
            type="text"
            onChange={handleTextInput}
            value={indication}
            placeholder={FrontendConstants.RACT_ADD_NEW_INDICATION_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("indication")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_INDICATION_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Projected Started Date</div>
          <Calendar
            className={'text-input due-date-input'}
            valueDate={studyStartDate}
            onChange={handleDateInput.bind(null, FrontendConstants.RACT_START_DATE)}
            innerKey={FrontendConstants.RACT_START_DATE}
            placeholder={FrontendConstants.RACT_ADD_NEW_START_DATE_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("projectedStartDate")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_START_DATE_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>Projected End Date</div>
          <Calendar
            className={'text-input end-date-input'}
            minDate={new Date(studyStartDate).getTime().toString()}
            valueDate={studyEndDate}
            onChange={handleDateInput.bind(null, FrontendConstants.RACT_END_DATE)}
            innerKey={FrontendConstants.RACT_END_DATE}
            placeholder={FrontendConstants.RACT_ADD_NEW_END_DATE_PLACEHOLDER}
          />
          {
            (errorArray.hasOwnProperty("projectedEndDate")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ADD_NEW_END_DATE_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <div className={'studyInfo'}>
          <div className={'studyInfoLabel'}>RACT Version</div>
          <div className={'ractTemplateDiv'}>
            <Combobox
              value={ractTemplate}
              onChange={handleSelectedTemplate}
              options={Imm.fromJS(ractTemplateOptions)}
              placeholder={FrontendConstants.RACT_ASSIGN_TEMPLATE_PLACEHOLDER}
            />
          </div>
          {
            (errorArray.hasOwnProperty("ractTemplateId")) ?
              <span className="new-study-errors">
                {FrontendConstants.RACT_ASSIGN_TEMPLATE_ERROR_MESSAGE}
                  </span>
              : null
          }
        </div>
        <button className="btn btn-primary right" onClick={AddStudy}>
          Add
        </button>
      </div>
    </div>
  );
};

AddNewStudy.PropTypes = {
  onAssignRact: PropTypes.func.isRequired,
};

export default AddNewStudy;
