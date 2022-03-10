import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import PropTypes from 'prop-types';
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import OversightScorecardHistogram from '../oversight/OversightScorecardHistogram';
import RACTConsoleUtil from '../../../util/RactConsoleUtil';
import RouteNameConstants from "../../../constants/RouteNameConstants";
import FrontendConstants from "../../../constants/FrontendConstants";
import RactActions from '../../../actions/RactActions';
import ExposureStore from '../../../stores/ExposureStore';
import ExposureActions from '../../../actions/ExposureActions';
import StatusMessageConstants from '../../../constants/StatusMessageTypeConstants';
import { title } from 'react-dom-factories';

var Util = require('../../../util/util');

class RactGridCard extends React.PureComponent {
  static propTypes = {
    entityScorecardKey: PropTypes.string.isRequired,
    entityId: PropTypes.string,
    immEntityData: PropTypes.instanceOf(Imm.Map).isRequired,
    immEntityDetails: PropTypes.instanceOf(Imm.Map).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      isExpanded: false,
    };
  }

  _getEntityLabel() {
    const {immEntityDetails, entityId} = this.props;

    let entityName = immEntityDetails.get('studyname');

    const entityNameSpan = (
      <span className='ract-scorecard-card-entity-name-span'>
        {entityName}
      </span>
    );
    const tooltip = RACTConsoleUtil.getStudyInfoTooltip(entityId, immEntityDetails.toJS());
    return RACTConsoleUtil.wrapWithTooltip(entityNameSpan, tooltip,
      cx('ract-tooltip', 'ract-grid-view-tooltip'), ['click', 'hover'], 'bottom');
  }

  _toggleExpandEntity() {
    const {isExpanded} = this.state;

    this.setState({
      isExpanded: !isExpanded,
    });
  }

  _getScoreDiv() {
    const {immEntityData} = this.props;
    const entityName = immEntityData.get('studyname');
    const ractInfo = immEntityData.get('ractInfo');
    const score = ractInfo.get('ractRiskScore');
    const riskType = ractInfo.get('ractRiskType');
    const riskCategoryRange = ractInfo.get('riskCategoryRange');
    let immEntityScoreBreakdown = ractInfo.get('histogramData');

    const tooltip = RACTConsoleUtil.getOverallScoreTooltip(entityName, immEntityScoreBreakdown, riskCategoryRange);

    const scoreDiv = (
      <div className={cx('ract-scorecard-card-score', riskType)}>
        <div className='ract-scorecard-card-score-text'>
          {score}
        </div>
      </div>
    );

    const histogram = <OversightScorecardHistogram
      immEntityScoreBreakdown={immEntityScoreBreakdown}/>;
    const displayDiv = (
      <div className='ract-scorecard-card-score-display'>
        {scoreDiv}
        {histogram}
      </div>
    );

    const wrappedDisplayDiv = RACTConsoleUtil.wrapWithTooltip(displayDiv, tooltip);
    return wrappedDisplayDiv;
  }

  _getStudyEntityMetadata() {
    const {immEntityDetails} = this.props;
    const ractTemplateName = immEntityDetails.getIn(['ractInfo', 'name']);
    const entityId = immEntityDetails.get('studyid');
    const studyName = immEntityDetails.get('studyname');
    const ractInfo = immEntityDetails.get('ractInfo');
    const ractStatus = ractInfo.get('ractStatus');
    const ractVersion = ractInfo.get('ractVersionNumber');
    let ractLastModifiedOn = ractInfo.get('ractPublishedDate');
    ractLastModifiedOn = Util.dateFormatterUTC(ractLastModifiedOn);
    let ractStatusClass = FrontendConstants.RACT_STATUS_PUBLISHED;
    if (ractStatus === FrontendConstants.RACT_STATUS_DRAFT) {
      ractStatusClass = FrontendConstants.RACT_STATUS_DRAFT;
    }
    const renderTooltip = props => (
      <Tooltip {...props} className = "racttemplateTooltip">{ractTemplateName}</Tooltip>
    );
    
    return (
      <div className='ract-scorecard-card-entity-metadata'>
        <div className='ract-scorecard-details'>
          <div className='ract-label'>Study ID:</div>
          <div className='ract-value'>{entityId}</div>
        </div>
        
        <div>  
            <OverlayTrigger placement="bottom-end" trigger="click" overlay={renderTooltip}>
              <div className='ract-scorecard-details'>
                <div className='ract-label'>RACT Template:</div>
                <div className='ract-value' title={ractTemplateName}>{ractTemplateName}</div>
              </div>
            </OverlayTrigger>
          </div>
          
        <div className='ract-scorecard-details'>
          <div className='ract-label'>RACT Version:</div>
          <div className='ract-value'>
            {ractVersion}
           { parseInt(ractVersion) > 1 ? <div 
              className='icon-file ract-version-details'
              title='Ract Versions'
              onClick={(e) => this.ractVersionDetails(entityId, studyName, ractInfo, ractStatus)}
            /> : null }
          </div>
        </div>
        <div className='ract-scorecard-details'>
          <div className='ract-label'>RACT Status:</div>
          <div className={cx('ract-value ', {ractStatusClass})}>{ractStatus === "Final" ? "Published" : ractStatus}</div>
        </div>
        <div className='ract-scorecard-details'>
          <div className='ract-label'>RACT Last Modified On:</div>
          <div className='ract-value'>{ractLastModifiedOn}</div>
        </div>
      </div>
    );
  }

  _getMitigationScoreDiv() {
    const {immEntityDetails} = this.props;
    const riskMitigationCount = immEntityDetails.getIn(['ractInfo', 'mitigationActionCount']);
    const riskMitigationCountTotal = immEntityDetails.getIn(['ractInfo', 'enabledSubCategoryCount']);

    const displayDiv = (
      <div
        className='ract-scorecard-card-mitigation-status'>{riskMitigationCount}/{riskMitigationCountTotal}</div>
    );
    const tooltip = (
      <div className='mitigationTooltipContainer'>
        <div className='riskMitigationLabel'>Risk Mitigation Status</div>
        <div className='riskMitigationDetails'>
          <div className='riskMitigationTitle'>Risk Subcategories with Mitigation Action Plan
          </div>
          <div className='riskMitigationCount'>{riskMitigationCount}</div>
        </div>
        <div className='riskMitigationDetails'>
          <div className='riskMitigationTitle'>Count of all risk subcategories</div>
          <div className='riskMitigationCountTotal'>{riskMitigationCountTotal}</div>
        </div>
      </div>
    );
    const wrappedDisplayDiv = RACTConsoleUtil.wrapWithTooltip(displayDiv, tooltip);
    return wrappedDisplayDiv;
  }

  ractAssessment(id, studyId, studyName, ractId, ractVersion, ractStatus) {
    const selectedTabID = parseInt(id);
    this.context.router.push({
      name: RouteNameConstants.EXPOSURE_RACT_ASSESSMENT,
      params: {selectedTabId: selectedTabID},
      state: {
        selectedTabId: selectedTabID,
        selectedRactId: ractId,
        studyId: studyId,
        studyName: studyName,
        ractVersion: ractVersion,
        ractStatus: ractStatus
      },
    });
  }
 
  ractVersionDetails(studyId, studyName, ractInfo, ractStatus){
    let ractDetails = ractInfo.toJS();
    this.context.router.push({
      name: RouteNameConstants.EXPOSURE_RACT_ASSESSMENT,
      params: {selectedTabId: 1},
      state: {
        versionName:'ract-version',
        selectedRactId: ractDetails.ractId,
        studyId: studyId,
        selectedTabId: 1,
        studyName: studyName,
        ractStatus: ractStatus
      },
    });
  }

  navigateToRelatedKpis(event, drillDownRoute, fileIdentifier, drillDownParams, file, fileType) {
    event.preventDefault();

    let Store = ExposureStore.getExposureStore().toJS();
    let fileStore = ExposureStore.getExposureStore().toJS().fileConfigs;
    let activeStudiesList = Store.studies ? Object.entries(Store.studies).map(obj => Object.fromEntries([obj])) : [];
    let activeStudies = activeStudiesList && activeStudiesList.map(v => Object.keys(v)).flat();
    let drillDownStudyId = drillDownParams.studyid;
    let drillDownStudyName = drillDownParams.studyname;
    let toastErrorTimeOut = 7000;
    let monitorFileTypeText = 'MONITOR';
    let isFileIdPresentInStore = Object.keys(fileStore).includes(fileIdentifier);

    if (!isFileIdPresentInStore) {

      return ExposureActions.createStatusMessageWithCustomTimeout(
        FrontendConstants.RACT_REPORT_NOT_ACCESSIBLE_MESSAGE,
        StatusMessageConstants.TOAST_INFO,
        toastErrorTimeOut
      );

    } else {
      if (activeStudies && activeStudies.includes(drillDownStudyId)) {
        let params = { 'study.studyid': drillDownStudyId };

        if (fileType === monitorFileTypeText) {
          this.context.router.push({ name: drillDownRoute, params: { fileId: fileIdentifier } });
        } else {

          RactActions.handleDrilldown(Imm.fromJS(file), params,
            (query) => this.context.router.push({ name: drillDownRoute, params: { fileId: fileIdentifier }, query })
          );
        }
      } else {
        let inActiveStudyMessage = fileType === monitorFileTypeText ?
          FrontendConstants.RACT_MONITOR_INACTIVE_STUDY_ERROR_MESSAGE(drillDownStudyName) :
          FrontendConstants.RACT_RELATED_KPI_INACTIVE_STUDY_ERROR_MESSAGE(drillDownStudyName);

        this.context.router.push({ name: drillDownRoute, params: { fileId: fileIdentifier } });

        return ExposureActions.createStatusMessageWithCustomTimeout(
          inActiveStudyMessage,
          StatusMessageConstants.TOAST_INFO,
          toastErrorTimeOut
        );
      }
    }
  }

  _getEntityBreakdownData() {
    const {immEntityData, immEntityDetails, loadingFileDrillDownId} = this.props;
    const ractId = immEntityData.getIn(['ractInfo', 'ractId']);
    const ractInfo = immEntityDetails.get('ractInfo');
    const ractVersion = ractInfo.get('ractVersionNumber');
    const ractStatus = ractInfo.get('ractStatus');

    const { studyid, studyname } = immEntityDetails && immEntityDetails.toJS(); 

    return immEntityData
      .getIn(['ractInfo', 'riskCategories'])
      .sortBy((f) => f.get('uiSeq'))    // Grab all Subcategories
      .filter(x => x)       // Filter out undefined categories
      .map((category) => {
        const riskCategoryType = category.getIn(['riskCategoryType']);
        const name = category.getIn(['categoryName']);
        const categoryTabId = category.getIn(['categoryTabId']);
        const categoryKpiList = category.getIn(['drillTargetsToFiles']).toJS();
        const key = name && name.toLowerCase().split(' ').join('-');
        const kpiLinkDiv = <div className='ract-scorecard-kpi-link' id={categoryTabId}
                                onClick={(e) => this.ractAssessment(category.getIn(['uiSeq']), studyid,studyname, ractId, ractVersion, ractStatus)}>{name}</div>;
                       
        const subCategory = category.getIn(['riskSubCategories']).toJS();
       
        const subCategoryKpiList = subCategory && subCategory.map(val => val.drillTargetsToFiles).flat();

        const kpiList =  [...categoryKpiList, ...subCategoryKpiList];

        const drillDownKPIList = kpiList && kpiList.filter((file, index, self) =>
          index === self.findIndex((drillKpi) => (
            drillKpi.id === file.id && drillKpi.id === file.id
          ))
        );

        const tooltipContent =
          <div className='ract-category-tooltip-content'>
            {drillDownKPIList && drillDownKPIList.map(kpi => {
              let linkIconClass = 'icon-spinner';
       
              if (loadingFileDrillDownId !== kpi.id) {
                linkIconClass = Util.getFileTypeIconName(kpi.fileType, kpi.title);
              }

              const drillDownRoute = Util.getRouteNameByFileType(kpi.fileType);
              const drillDownParams = {studyid: studyid, studyname:studyname}
              
              return <div className='ract-category-tooltip-title' onClick={(e)=> this.navigateToRelatedKpis(e, drillDownRoute, kpi.id, drillDownParams, kpi, kpi.fileType )} >
                  <i class={`${linkIconClass}`} />
                  {kpi.title}
              </div>       
            })}
          </div>

        const tooltipAlignment = {
          overflow: {
            adjustX: 1,
            adjustY: 0,//stops adjusting the Y position and displays a scroll instead
          },
        };
        
        return (
          riskCategoryType !== 'disabled' ?
            <div
              className='ract-scorecard-card-details-kpi-info'
              key={key}
            >
              <div
                className={cx('ract-scorecard-scorebox', riskCategoryType)}
              />
              {drillDownKPIList && drillDownKPIList.length ?
                RACTConsoleUtil.wrapWithTooltip(kpiLinkDiv, tooltipContent) 
                : kpiLinkDiv
                }
            </div>
            : null
        );
      }).toSeq();
  }

  render() {
    const {entityScorecardKey} = this.props;
    const {isExpanded} = this.state;
    const entityLabel = this._getEntityLabel();
    const entityMetadata = this._getStudyEntityMetadata();
    const entityBreakdownData = this._getEntityBreakdownData();
    const scoreDiv = this._getScoreDiv();
    const mitigationScoreDiv = this._getMitigationScoreDiv();
    return (
      <div
        key={entityScorecardKey}
        className={
          cx('ract-scorecard-card', {
            'expanded': isExpanded,
            'minimized': !isExpanded,
          })}
      >
        <div>
          <div className='ract-scorecard-card-overview'>
            <div className='ract-scorecard-card-entity-contents'>
              <div className='ract-scorecard-card-entity-header'>
                <div className='ract-scorecard-card-entity-name'>
                  {entityLabel}
                </div>
              </div>
              <div className='ract-scorecard-card-entity-info'>
                <div className='ract-scorecard-card-entity-metadata-container'>
                  {entityMetadata}
                </div>
              </div>
            </div>
            <div className='ract-scorecard-card-entity-actions'>
              {mitigationScoreDiv}
              {scoreDiv}
            </div>
          </div>

          <div className={cx('ract-scorecard-card-scores-breakdown', {
            'minimized': !isExpanded,
          })}
          >
            {entityBreakdownData}
          </div>
          <div className='ract-scorecard-card-show-details'
               onClick={this._toggleExpandEntity.bind(this)}>
            {isExpanded ? 'Show Less' : 'Show More'}
            <span className={cx('ract-scorecard-card-accordion',
              'icon-accordion-down', {'rotate-arrow-up': isExpanded})}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default RactGridCard;
