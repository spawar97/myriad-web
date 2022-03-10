import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import PropTypes from 'prop-types';

import OversightScorecardHistogram from './OversightScorecardHistogram';

import FrontendConstants from '../../../constants/FrontendConstants';
import OversightConsoleUtil from '../../../util/OversightConsoleUtil';
import Util from '../../../util/util';
import {Key} from "../../../constants/OversightScorecardConstants";

class OversightScorecardGridCard extends React.PureComponent {
  static propTypes = {
    drilldownHandler: PropTypes.func.isRequired,
    entityScorecardKey: PropTypes.string.isRequired,
    entityId: PropTypes.string,
    immEntityData: PropTypes.instanceOf(Imm.Map).isRequired,
    immMetricsById: PropTypes.instanceOf(Imm.Map).isRequired,
    selectedScorecardLevel: PropTypes.string.isRequired,
    immEntityDetails: PropTypes.instanceOf(Imm.Map).isRequired,
    loadingFileDrillDownId: PropTypes.string,
    immMilestoneLabel:PropTypes.instanceOf(Imm.Map).isRequired
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false,
    };

    this.warningTextContext = Util.get2dCanvasContext('bold 12px ' + Util.getWidestFont());
  }

  _getEntityLabel() {
    const {selectedScorecardLevel, immEntityDetails, entityId} = this.props;

    let entityName = OversightConsoleUtil.getEntityName(selectedScorecardLevel, immEntityDetails);
    let entityNameSpanInnerContent = '';

    switch (selectedScorecardLevel) {
      case Key.STUDY:
        entityNameSpanInnerContent = entityName;
        break;
      case Key.SITE:
        entityNameSpanInnerContent = `${entityId}: ${entityName}`;
        break;
      default:
        break;
    }

    const entityNameSpan = (
      <span className='oversight-scorecard-card-entity-name-span'>
        {entityNameSpanInnerContent}
      </span>
    );

    const tooltip = this._getEntityLabelTooltip();

    return OversightConsoleUtil.wrapWithTooltip(entityNameSpan, tooltip,
      cx('oversight-tooltip', 'oversight-grid-view-tooltip'), ['click', 'hover'], 'bottom');
  }

  _getEntityLabelTooltip() {
    const {entityScorecardKey, selectedScorecardLevel, immEntityDetails, entityId, immMilestoneLabel} = this.props;
    let tooltip;
    if (selectedScorecardLevel === Key.STUDY) {
      const drilldownCallback = () => this.props.drilldownHandler(entityId);
      tooltip = immEntityDetails && OversightConsoleUtil.getStudyInfoTooltip(entityId, immEntityDetails.toJS(),
        drilldownCallback);
    }
    else {
      tooltip = immEntityDetails && OversightConsoleUtil.getSiteInfoTooltip(entityId, immEntityDetails.toJS(), immMilestoneLabel.toJS(), entityScorecardKey);
    }

    return tooltip;
  }

  _toggleExpandEntity() {
    const {isExpanded} = this.state;

    this.setState({
      isExpanded: !isExpanded,
    });
  }

  _getEntityBreakdownData() {
    const {immEntityData, immMetricsById, loadingFileDrillDownId} = this.props;

    return immEntityData
      .get('metrics')       // Grab all metrics data
      .filter(x => x)       // Filter out undefined metrics
      .map((immMetricData) => {
        const metricId = immMetricData.getIn(['scoreData', 'metricid']);
        const metricGroupId = immMetricData.getIn(['scoreData', 'metricgroupid']);
        const color = immMetricData.getIn(['render', 'color']);
        const immMetricConfig = immMetricsById.getIn([metricId, metricGroupId]);

        const name = immMetricConfig.getIn(['displayAttributes', 'title']);
        const key = name.toLowerCase().split(' ').join('-');

        const kpiLinkDiv = <div className='oversight-scorecard-kpi-link'>{name}</div>;
        const metricTooltip = OversightConsoleUtil.getEntityMetricTooltip(immMetricData, immMetricConfig,
          this.context.router, this.props.selectedScorecardLevel, loadingFileDrillDownId);
        const wrappedKpiLink = OversightConsoleUtil
          .wrapWithTooltip(kpiLinkDiv, metricTooltip,
            cx('oversight-tooltip', 'oversight-grid-view-tooltip'), ['click', 'hover'],
            'bottom');

        return (
          <div className='oversight-scorecard-card-details-kpi-info' key={key}>
            <div className='oversight-scorecard-scorebox'
                 style={{'backgroundColor': color}}
            />
            {wrappedKpiLink}
          </div>
        );
      }).toSeq();
  }

  _getScoreDiv() {
    const {immEntityData}  = this.props;
    const {warningTextContext} = this;

    const immOverallScore = immEntityData.get('overallScore', Imm.Map());
    const entityName = immEntityData.get('entityName');
    const score = immOverallScore.get('value');
    const color = immOverallScore.get('color');
    const immEntityScoreBreakdown = immOverallScore.get('breakdown', Imm.Map());

    const tooltip = OversightConsoleUtil.getOverallScoreTooltip(entityName, immEntityScoreBreakdown);

    const scoreDiv = (
      <div className='oversight-scorecard-card-score' style={{color: color}}>
        <div className='oversight-scorecard-card-score-text'>
          {score}
        </div>
      </div>
    );

    const missingScoreCount = immEntityScoreBreakdown.get('missingCount', 0) || 0;
    let missingScoreIndicator = '';

    if (missingScoreCount) {
      const INDICATOR_WIDTH = 30;
      const INDICATOR_HEIGHT = 25;
      const PADDING = 2;
      const PADDING_TOP = 1;
      const Y_AXIS_BASE = INDICATOR_HEIGHT + PADDING_TOP - PADDING;


      const missingScoreTextWidth = Util.getTextWidth(warningTextContext, missingScoreCount);
      const trianglePoints = `${INDICATOR_WIDTH / 2},${PADDING_TOP}, ${INDICATOR_WIDTH},${Y_AXIS_BASE}, 0,${Y_AXIS_BASE}`;
      let textX = (INDICATOR_WIDTH - missingScoreTextWidth) / 2;
      if (textX < 0) {
        textX = 15;
      }

      const textY = Y_AXIS_BASE - 4;

      missingScoreIndicator = (
        <div className='oversight-missing-score-indicator'>
          <svg width={INDICATOR_WIDTH} height={INDICATOR_HEIGHT}>
            <polygon points={trianglePoints} fill="#FFFF98" stroke="#9B870C" strokeWidth="2"/>
            <g><text x={textX} y={textY} style={{fontSize: 12, fontWeight: 'bold'}}>{missingScoreCount}</text></g>
          </svg>
        </div>
      );
    }

    const histogram = <OversightScorecardHistogram immEntityScoreBreakdown={immEntityScoreBreakdown} />;
    const displayDiv = (
      <div className='oversight-scorecard-card-score-display'>
        {scoreDiv}
        {histogram}
        {missingScoreIndicator}
      </div>
    );

    const wrappedDisplayDiv = OversightConsoleUtil.wrapWithTooltip(displayDiv, tooltip);
    return wrappedDisplayDiv;
  }

  _getAdditionalInfoStudyMetadata() {
    const {immEntityData} = this.props;
    const immEntityAdditionalInfo = immEntityData.get('additionalInfo', Imm.Map());
    const studyNameLabel = `${FrontendConstants.STUDY}: ${immEntityAdditionalInfo.getIn(['studyname', 'value'])}`;
    const immTooltip = immEntityAdditionalInfo.getIn(['studyname', 'tooltip']);
    const labelContent = <div className='oversight-metadata-study-name'>{studyNameLabel}</div>;
    return (<div className='oversight-scorecard-card-entity-additional-metadata'>
      {immTooltip && OversightConsoleUtil.wrapWithTooltip(labelContent, immTooltip.toJS())}
    </div>);
  }

  _getEntityMetadata() {
    const {selectedScorecardLevel} = this.props;

    let entityDetails, additionalInfoContent;
    switch (selectedScorecardLevel) {
      case Key.STUDY:
        entityDetails = this._getStudyEntityMetadata();
        break;
      case Key.SITE:
        entityDetails = this._getSiteEntityMetadata();
        additionalInfoContent = this._getAdditionalInfoStudyMetadata();
        break;
      default:
        break;
    }

    return (
      <div className='oversight-scorecard-card-entity-metadata-container'>
        {additionalInfoContent}
        {entityDetails}
      </div>
    );
  }

  _getStudyEntityMetadata() {
    const {immEntityDetails} = this.props;
    const entityTherapeuticArea = immEntityDetails.get('studytherapeuticarea');
    const entityPhase = immEntityDetails.get('studyphase');
    const entityId = immEntityDetails.get('studyid');

    const phaseDetails = FrontendConstants
      .OVERSIGHT_PHASE_DETAILS(entityTherapeuticArea, entityPhase);

    const enrolled = immEntityDetails.get('studyactualenrollmentcount');
    const plannedEnrollment = immEntityDetails.get('studyplannedenrollmentcount');
    const sitesActive = immEntityDetails.get('studycurrentsiteactivationcount');
    const targetActivations = immEntityDetails.get('studytargetsiteactivationcount');

    const studyStartDate = immEntityDetails.get('studystartdate');
    const plannedEndDate  = immEntityDetails.get('studyplannedenddate');
    const durationDetails = FrontendConstants
      .OVERSIGHT_DURATION_DETAILS(studyStartDate, plannedEndDate);

    const entitySubDetails = FrontendConstants.OVERSIGHT_ENROLLMENT_AND_ACTIVATION_DETAILS(enrolled,
      plannedEnrollment, sitesActive, targetActivations);
    return (
      <div className='oversight-scorecard-card-entity-metadata'>
        <div className='oversight-scorecard-study-id-details'>{entityId}</div>
        <div className='oversight-scorecard-study-phase-details'>{phaseDetails}</div>
        <div className='oversight-scorecard-study-duration-details'>{durationDetails}</div>
        <div className='oversight-scorecard-enrollment-activation-details'>{entitySubDetails}</div>
      </div>
    );
  }

  _getSiteEntityMetadata() {
    const {immEntityDetails} = this.props;
    const siteCountry = immEntityDetails && immEntityDetails.get('sitecountry');
    const siteActivationDate = immEntityDetails && immEntityDetails.get('siteactivationdate');
    const siteEnrolledCount = immEntityDetails && immEntityDetails.get('siteenrolledcount', 0) || 0;

    return (
      <div className='oversight-scorecard-card-entity-metadata'>
        <div className='oversight-scorecard-site-country'>{siteCountry}</div>
        <div className='oversight-scorecard-site-activation-date'>
          {FrontendConstants.OVERSIGHT_SITE_ACTIVATION(siteActivationDate)}
        </div>
        <div className='oversight-scorecard-site-enrollment-count'>
          {FrontendConstants.OVERSIGHT_ENROLLED(siteEnrolledCount)}
        </div>
      </div>
    );
  }

  render() {

    const {entityScorecardKey, selectedScorecardLevel, entityId} = this.props;
    const {isExpanded} = this.state;
    const entityLabel = this._getEntityLabel();

    const entityMetadata = this._getEntityMetadata();

    const entityBreakdownData = this._getEntityBreakdownData();
    const drilldownLink = selectedScorecardLevel === Key.STUDY
      ? (
        <div className='oversight-scorecard-card-drilldown-link'
             onClick={this.props.drilldownHandler.bind(this, entityId)}
        >
          {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_VIEW_SITES}
        </div>
      )
      : '';

    const scoreDiv = this._getScoreDiv();

    return (
      <div
        key={entityScorecardKey}
        className={
          cx('oversight-scorecard-card', {
            'expanded': isExpanded,
            'minimized': !isExpanded,
          }) }
      >
        <div>
          <div className='oversight-scorecard-card-overview'>
            {scoreDiv}
            <div className='oversight-scorecard-card-entity-contents'>
              <div className='oversight-scorecard-card-entity-header'>
                <div className='oversight-scorecard-card-entity-name'>
                  {entityLabel}
                </div>
                {drilldownLink}
              </div>
              <div className='oversight-scorecard-card-entity-info'>
                {entityMetadata}
              </div>
            </div>
            <div className={cx('oversight-scorecard-card-accordion',
              'icon-accordion-down', {'rotate-arrow-up': isExpanded})}
                 onClick={this._toggleExpandEntity.bind(this)}
            />
          </div>
          <div className={cx('oversight-scorecard-card-scores-breakdown', {
            'minimized': !isExpanded,
          })}
          >
            {entityBreakdownData}
          </div>
        </div>
      </div>
    );
  }

}

export default OversightScorecardGridCard;
