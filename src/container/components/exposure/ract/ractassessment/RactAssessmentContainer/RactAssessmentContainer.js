import React, { useEffect, useState, useReducer, useRef } from 'react';
import FrontendConstants from '../../../../../constants/FrontendConstants';
import StatusMessageConstants from '../../../../../constants/StatusMessageTypeConstants';
import RactAssessment from './RactAssessment';
import RactScorecardStore from '../../../../../stores/RactScorecardStore';
import FetchCategoryDataReducer, { initialState } from './Reducer/RactAssessmentFetchReducer';
import FetchDueDateExpiredReducer, { dueDateInitialState } from './Reducer/FetchDueDateExpiredReducer';
import Loader from '../../../../../components/ContentPlaceholder';
import { getCategoryData, exportAssessmentCSV } from './RactFormulaesUtil';
import ExposureActions from '../../../../../actions/ExposureActions';
import { TouchDiv } from '../../../../TouchComponents';
import Menu from "../../../../../lib/react-menu/components/Menu";
import MenuTrigger from "../../../../../lib/react-menu/components/MenuTrigger";
import MenuOptions from "../../../../../lib/react-menu/components/MenuOptions";
import MenuOption from "../../../../../lib/react-menu/components/MenuOption";
import cx from "classnames";
import './style.scss';
import ReviewDueDateExpired from '../ReviewRiskCategory/ReviewDueDateExpired';
import PermissionsUtil from "../../../../../util/PermissionsUtil";
import {
  AccessPermissionsConstants,
  FeatureListConstants,
} from "../../../../../constants/PermissionsConstants";
import RouteNameConstants from '../../../../../constants/RouteNameConstants';
import DialogBox from "../../../../DialogBox";
import Select from 'react-select';


const Subtitles = (props) => {

  let { childRef } = props;

  const editPermissionFlag = PermissionsUtil.checkLoggedInUserHasAccessForFeature(
      FeatureListConstants.RACT, AccessPermissionsConstants.EDIT,
  );
  const _handleExport = () => {
    exportAssessmentCSV(props.data, props.exportDataAfterSave);
  }

  const { location, versionDetailOptionList, selectedVersion, handleVersionChange, categoryData,
          isCurreentVersionSelected } = props;
  
  const ractVersion = location.state && location.state.hasOwnProperty('ractVersion') ? location.state.ractVersion : categoryData.ractVersion ;
  const ractStatusInfo = location.state && location.state.ractStatus || '';
  const ractStatus = ractStatusInfo === FrontendConstants.RACT_STATUS_DRAFT ? FrontendConstants.RACT_TEMPLATE_DRAFT_STATUS :
    ractStatusInfo === FrontendConstants.RACT_TEMPLATE_FINAL_STATUS ? FrontendConstants.RACT_STATUS_PUBLISHED_STATUS : ractStatusInfo;

  const versionOption = versionDetailOptionList && versionDetailOptionList.map(obj => { return { value: obj.ractId, label: obj.ractVersion } });
  const sortedVersionOption = versionOption && versionOption.sort((current, next) => parseInt(current.label) - parseInt(next.label));
  const versionName = location.state && location.state.hasOwnProperty('versionName') ? location.state.versionName : false;
  let studyName = location.state && location.state.hasOwnProperty('studyName') ? location.state.studyName : categoryData.studyId;

  let ractVersionSelectedOption = sortedVersionOption && sortedVersionOption.map(option => {
    if (option.value === location.state.selectedRactId) {
      let ractStatus = location.state.ractStatus === FrontendConstants.RACT_STATUS_DRAFT ? FrontendConstants.RACT_TEMPLATE_DRAFT_STATUS :
        ractStatusInfo === FrontendConstants.RACT_TEMPLATE_FINAL_STATUS ? FrontendConstants.RACT_STATUS_PUBLISHED_STATUS : ractStatusInfo;

      option.label = (<div className='version-option'>
                        <span id='version-label'>{option.label}</span>
                        <span id='version-status'>({ractStatus})</span>
                      </div>) 
    }
    return option;
  });

  return (
    <React.Fragment>
      <div className='page-header'>
        <div className={cx('breadcrumbs', 'oversight-title')}>
          {FrontendConstants.RBQM_MODULE}
          <TouchDiv
            className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')} />
          {FrontendConstants.RACT_MODULE}
          <TouchDiv
            className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')} />
          { (versionName && !isCurreentVersionSelected) ? FrontendConstants.RACT_ASSESSMENT_VERSION_TITLE : FrontendConstants.RACT_ASSESSMENT_TITLE}
        </div>
        
        <div className='header-buttons'>
          {editPermissionFlag ?
            <Menu className='more-menu'>
              <MenuTrigger className='more-menu-trigger'>
                <div className='react-menu-icon icon-menu2'>{FrontendConstants.MORE}</div>
              </MenuTrigger>
              <MenuOptions className='more-menu-options'>
                <MenuOption className='more-menu-export'
                  onSelect={_handleExport}
                >
                  <div className='react-menu-icon icon-file-excel'>
                    {FrontendConstants.EXPORT}
                  </div>
                </MenuOption>
              </MenuOptions>
            </Menu>
            : null}
        </div>
      </div>
      <div className="risk-category-subtitle">
        <div className="ract-module row title left-align header-title">
          {FrontendConstants.RACT_ASSESSMENT_HEADER}
        </div>

        <div className="ract-module row title ract-study-version">
          <div className='ract-assessment-study'>
            {`Study: `}
            <label className='ract-assessment-study-label'>
            {`${studyName} `}
            </label>
          </div>
          <div className='ract-assessment-version'>
            {`RACT Version: `}
            {versionName ? <Select
              className='ract-assessment-version-select'
              value={selectedVersion && selectedVersion[0]}
              options={ractVersionSelectedOption}
              clearable={false}
              onChange={(e) => { handleVersionChange(e) }}
            /> :
              <label className='ract-assessment-version-label'>
                {`${ractVersion} ${ractStatus}`}
              </label>}
          </div>
        </div>
        
        <div className="ract-module row title right-align close-button" onClick={() => { childRef.current.handleAssessmentClose() }} />
        
      </div>
    </React.Fragment>
  );
}
const RactAssessmentContainer = (props) => {
  const [state, dispatch] = useReducer(FetchCategoryDataReducer, initialState);
  const [dueDateState, dispatchDueDate] = useReducer(FetchDueDateExpiredReducer, dueDateInitialState);
  const [assessmentData, setAssessmentData] = useState([]);
  const [ractTemplateId, setRactTemplateId] = useState("");
  const [saveAndUpdateData,setSaveAndUpdateData] = useState([]);
  const [assessmentAlreadySigned,setAssessmentAlreadySigned]=useState({signed: false, message: ''});
  const childRef = useRef();
  const [versionDetailOptionList, setVersionDetailOptionList] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState([]);

  const { location, riskType } = props;

  const fetchAssesmentData = async (didCancel, versionRactId) => {
    let ractId = '';
    const versionName = location.state && location.state.hasOwnProperty('versionName') ? location.state.versionName : false;

    dispatch({ type: 'FETCH_INIT' });

    if (!versionName) {

      if (window.location.pathname.includes('assessment-review')) {

        ractId = window.location.pathname.replace('/ract/assessment-review/', '');
  
      } else if (window.location.pathname.includes('assessment-configuration')) {

        ractId = window.location.pathname.split('/')[3];
  
      } else {
        ractId = location.state && location.state.selectedRactId;
      }

    }else{
      ractId = versionRactId;
    }
    await RactScorecardStore.fetchAssessmentData(ractId).then(async (data) => {
      if (data && data.ractCategoryWrapper) {
        setRactTemplateId(data.ractTemplateId);
        let categoryPropertyData = await getCategoryData(data.ractCategoryWrapper);
        categoryPropertyData.sort((obj1, obj2) => obj1.uiSeq - obj2.uiSeq);
        setAssessmentData(categoryPropertyData);
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } else {
        throw new Error
      }
    }).catch(error => {
      if (!didCancel) {
        dispatch({ type: 'FETCH_FAILURE' });
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      }
    });
  }
  const fetchReviewUserDueDateExpired = async (didCancel, fetchAssesmentData) => {
    dispatchDueDate({ type: 'FETCH_DUE_DATE_INIT' });
    let param = {
      ractId: window.location.pathname.replace('/ract/assessment-review/', ''),
      userId: props.immExposureStore.getIn(['userInfo', 'id'])
    }

    await RactScorecardStore.reviewAssessmentUserDueDateExpired(param).then(async (data) => {
      if (data && data['check-status']) {
        let dueDateFlag = data['check-status'] == "true" ? true : false;
        dispatchDueDate({ type: 'FETCH_DUE_DATE_SUCCESS', payload: !dueDateFlag });
        if (dueDateFlag) {
          fetchAssesmentData(didCancel);
        } else {
          dispatchDueDate({ type: 'FETCH_DUE_DATE_FAILURE' });
          setAssessmentAlreadySigned({signed: true, message: data['check-status']});
        }
      } else {
        throw new Error
      }
    }).catch(error => {
      if (!didCancel) {
        dispatchDueDate({ type: 'FETCH_DUE_DATE_FAILURE' });
        ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
        );
      }
    });
  }

  const fetchVersionDetails = async (didCancel) => {

    let { studyId, selectedRactId } = location.state;
    dispatch({ type: 'FETCH_INIT' });
    await RactScorecardStore.fetchRactVersionDetails(studyId).then((res) => {
      if(res){
           let versionDetailOptions = res;
           let defaultVersionSelected = versionDetailOptions && versionDetailOptions.filter(obj=> obj.ractVersion === "1");
           let versionSelected = defaultVersionSelected && defaultVersionSelected.map(obj => { return { value: obj.ractId, label: obj.ractVersion } });
           
           setVersionDetailOptionList(versionDetailOptions);
           setSelectedVersion(versionSelected);
           fetchAssesmentData(didCancel, versionSelected[0].value);
      }else{
        throw new Error
      }
    }).catch((err)=>{
      dispatch({ type: 'FETCH_FAILURE' });
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageConstants.WARNING,
      );
    });

  }

  useEffect(() => {
    let didCancel = false;
    const versionName = location.state && location.state.hasOwnProperty('versionName');

    if (versionName) {
      fetchVersionDetails(didCancel);
    }
    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    let didCancel = false;
    const versionName = location.state && location.state.hasOwnProperty('versionName');

    if (!versionName) {

      if (window.location.pathname.includes('assessment-review')) {
        fetchReviewUserDueDateExpired(didCancel, fetchAssesmentData);
      }

      if (!window.location.pathname.includes('assessment-review')) {
        fetchAssesmentData(didCancel);
      }

      return () => {
        didCancel = true;
      };
    }
  }, []);

  const getVersionDiff = async (nexRactId, prevRactId) => {

    dispatch({ type: 'FETCH_INIT' });

    await RactScorecardStore.fetchRactVersionDiff(nexRactId,prevRactId).then(async (data) => {

      if (data && data.diffRactCategoryWrapper) {
        let categoryPropertyData = await getCategoryData(data.diffRactCategoryWrapper);
        categoryPropertyData.sort((obj1, obj2) => obj1.uiSeq - obj2.uiSeq);
        setAssessmentData(categoryPropertyData);
        dispatch({ type: 'FETCH_SUCCESS', payload: data });

      } else {
        throw new Error
      }
    }).catch(error => {
        dispatch({ type: 'FETCH_FAILURE' });
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageConstants.WARNING,
        );
    });
  }

  const handleVersionChange = (currentVersion) => {
    let versionSelected = [currentVersion];
    let currentVersionRactId = versionSelected && versionSelected[0].value;
    let selectedVersionRactId = selectedVersion && selectedVersion[0].value;
    let currentVersionId = versionSelected && versionSelected[0].label;

    if (currentVersionRactId === selectedVersionRactId) {
      return null;
    } else {
      let didCancel = false;
      setSelectedVersion(versionSelected);
      if (parseInt(currentVersionId) > 1) {
        let versionOption = versionDetailOptionList && versionDetailOptionList.map(obj => { return { value: obj.ractId, label: obj.ractVersion } });
        let prevRactVersion = versionOption.filter(obj => parseInt(obj.label) === parseInt(currentVersionId) - 1);
        let prevRactVersionRactId = prevRactVersion && prevRactVersion[0].value;

        getVersionDiff(currentVersionRactId, prevRactVersionRactId);
      } else {
        fetchAssesmentData(didCancel, currentVersionRactId);
      }
    }
  }

  const { categoryData, isLoading } = state;
  const { isDueDateLoading, dueDateExpiredFlagData } = dueDateState;
  let reviewPath = window.location.pathname.includes('assessment-review');
  if (isLoading || isDueDateLoading) {
    return <Loader containerClassName={"ract-assessment-loader"} />
  }
  if (assessmentAlreadySigned.signed) {
    const redirect = () => {
      return props.router.push({
        name: RouteNameConstants.EXPOSURE_RACT,
      })
    }
    const header = (
        <React.Fragment><span className="icon icon-WarningCircle" ></span >
          <span className="modal-dialog-header-text">{assessmentAlreadySigned.message}</span>
          <br />
        </React.Fragment>
    );
    const footer = (
        <React.Fragment>
          <div className="btn btn-primary"
               id={`assign-no`}
               onClick={() => { redirect(); }}
          >
            <div className="icon icon icon-close" />
            OK
          </div>
        </React.Fragment>
    );
    return <DialogBox
        header={header}
        content={''}
        footer={footer}
    />
  }
  if (dueDateExpiredFlagData) {
    return <ReviewDueDateExpired data={props} />
  }

  let versionName = location.state && location.state.hasOwnProperty('versionName');
  let categoryRange = categoryData.hasOwnProperty('categoryRange') ?
                      categoryData.categoryRange : (categoryData.hasOwnProperty('nextRactCategoryRange') ?
                      categoryData.nextRactCategoryRange : props.categoryRange);

  let isCurreentVersionSelected = selectedVersion && selectedVersion.length && selectedVersion[0].value === location.state.selectedRactId ;
  
  return (categoryData.length !== 0 ?
    <React.Fragment>
      <Subtitles 
        childRef={childRef}
        versionDetailOptionList={versionDetailOptionList}
        location={location}
        data={assessmentData}
        exportDataAfterSave={saveAndUpdateData}
        selectedVersion={selectedVersion}
        handleVersionChange={handleVersionChange}
        categoryData={categoryData}
        isCurreentVersionSelected={isCurreentVersionSelected}
      />
      <RactAssessment
        ref={childRef}
        parentProps={props}
        selectedTabID={location.state && location.state.selectedTabId}
        Data={assessmentData ? assessmentData : props.Data }
        functionalPlanOptions={categoryData.functionalPlanOptions}
        ractId={location.state && location.state.selectedRactId}
        riskCategoryRange={categoryRange}
        reviewRactId={reviewPath ? window.location.pathname.replace('/ract/assessment-review/', '') : ''}
        prevData={categoryData}
        exportDataAfterSave={setSaveAndUpdateData}
        ractTemplateId={ractTemplateId ? ractTemplateId : props.ractTemplateId}
        riskType={riskType}
        versionName={versionName && !isCurreentVersionSelected}
      />
    </React.Fragment>
    : null
  );
}

RactAssessmentContainer.defaultProps = {
  riskType: [
    { value: 'Program', label: 'Program' },
    { value: 'Protocol', label: 'Protocol' },
    { value: 'Program/Protocol Risk Only', label: 'Program/Protocol' }
  ],
  Data: [],
  ractTemplateId: ''
}

export default RactAssessmentContainer;


