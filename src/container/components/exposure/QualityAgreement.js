import React from 'react';
import createReactClass from 'create-react-class';
import ReactDOM from 'react-dom';
import cx from 'classnames';
import Imm from 'immutable';
import $ from 'jquery';
import _ from 'underscore';
import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

import Breadcrumbs from './Breadcrumbs';
import Button from '../Button';
import InputWithPlaceholder from '../InputWithPlaceholder';
import NumericInputBox from '../NumericInputBox';
import SimpleAction from '../SimpleAction';
import Spinner from '../Spinner';
import Combobox from '../Combobox';
import InputBlockContainer from '../InputBlockContainer';
import ToggleButton from '../ToggleButton';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import GA from '../../util/GoogleAnalytics';
import Util from '../../util/util';
import ImmEmptyFile from '../../util/ImmEmptyFile';
import ImmEmptyQualityAgreement from '../../util/ImmEmptyQualityAgreement';
import AppRequest from '../../http/AppRequest';
import RouteNameConstants from '../../constants/RouteNameConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import ShallowCompare from 'react-addons-shallow-compare';
import { withTransitionHelper } from '../RouterTransitionHelper';

const div = DOM.div;
const span = DOM.span;

/**
 *
 * The resize logic was based on ReportWidget.js.
 */
let QualityAgreement = createReactClass({
  displayName: 'QualityAgreement',

  propTypes:  {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function() {
    let baseQualityAgreement = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file', 'qualityAgreement'], ImmEmptyQualityAgreement());

    return {
      isEdit: /edit|new/.test(this.props.location.pathname),
      width: 300,
      immCurrentFile: this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], ImmEmptyFile()),
      immCurrentQualityAgreement: baseQualityAgreement,
      immBaseQualityAgreement: baseQualityAgreement,
      studyCroMap: this.props.immExposureStore.getIn('studyCroData', Imm.Map()),
    };
  },

  /**
   * Runs on initial mount, if it doesn't find this file ID in the store, attempts to fetch it.
   */
  componentDidMount: function() {
    window.addEventListener('resize', this.handleResize);
    ExposureActions.fetchStudyCROData();
    this.fetchFileIfNeeded(true);
    this.handleResize();
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.handleResize);
  },

  componentWillReceiveProps: function(nextProps) {
    let baseQualityAgreement = nextProps.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file', 'qualityAgreement'], ImmEmptyQualityAgreement());
    const studyCroMap = nextProps.immExposureStore.get('studyCroData', Imm.Map());
    if (!studyCroMap.isEmpty()) {
      this.setState({
        studyCroMap: studyCroMap,
        immCurrentFile: nextProps.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], ImmEmptyFile()),
        immCurrentQualityAgreement: this.state.immCurrentQualityAgreement ? this.state.immCurrentQualityAgreement : baseQualityAgreement,
        immBaseQualityAgreement: baseQualityAgreement
      });
    }
  },

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  },

  componentDidUpdate: function() {
    this.fetchFileIfNeeded();
  },

  fetchFileIfNeeded: function(forceFetch) {
    const immFiles = this.props.immExposureStore.getIn(['files']);
    if (this.props.params.fileId && (forceFetch || !immFiles.has(this.props.params.fileId))) {
      ExposureActions.fetchFile(this.props.params.fileId);
    }
  },

  /**
   * Retrieve the size of this wrapper to pass down to our children.
   */
  handleResize: function() {
    var $widgetDOM = $(ReactDOM.findDOMNode(this));
    // Don't change the width if we haven't been able to retrieve it.
    this.setState({width: $widgetDOM.width() || this.state.width});
  },

  toggleIsEdit: function() {
    this.setState({isEdit: !this.state.isEdit});
  },

  /**
   * @returns {boolean} Do we have any in-flight requests for this file?
   */
  isReady: function() {
    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.params.fileId;
    const requestInFlight = immExposureStore.getIn(['files', fileId, 'fileRequestInFlight'], false);
    const croDataInFlight = immExposureStore.get('croRequestInFlight', false);
    const hasCroData = !this.state.studyCroMap.isEmpty();
    return hasCroData && !(fileId && requestInFlight && croDataInFlight);
  },

  mergeThresholds: function(immThresholdDefinition, immThreshold) {
    return Imm.fromJS({
      name: immThresholdDefinition.get('name'),
      value: immThreshold.get('value'),
      thresholdUnit: 'PERCENT'
    });
  },

  updateThreshold: function(kpiName, thresholdName, e) {
    const newValue = e.target.value;
    const immKpis = this.state.immCurrentQualityAgreement.get('kpis');

    const immNewKpis = immKpis.update(
      immKpis.findIndex(immKpi => {
        return immKpi.get('name') === kpiName;
      }), immKpi => {
        const immThresholds = immKpi.get('thresholds');
        const newImmThresholds = immThresholds.update(
          immThresholds.findIndex(immThreshold => {
            return immThreshold.get('name') === thresholdName;
          }), immThreshold => {
            return immThreshold.set('value', newValue)
          }
        );
        return immKpi.set('thresholds', newImmThresholds);
      }
    );

    this.setState({
      immCurrentQualityAgreement: this.state.immCurrentQualityAgreement.set('kpis', immNewKpis)
    })
  },

  updatePlan: function(kpiName, e) {
    const newValue = e.target.value;
    const immKpis = this.state.immCurrentQualityAgreement.get('kpis');

    const immNewKpis = immKpis.update(
      immKpis.findIndex(immKpi => {
        return immKpi.get('name') === kpiName;
      }), immKpi => {
        return immKpi.set('plan', newValue);
      }
    );

    this.setState({
      immCurrentQualityAgreement: this.state.immCurrentQualityAgreement.set('kpis', immNewKpis)
    })
  },

  toggleKpiActiveFlag: function(kpiName, e) {
    const immKpis = this.state.immCurrentQualityAgreement.get('kpis');

    const immNewKpis = immKpis.update(
      immKpis.findIndex(immKpi => {
        return immKpi.get('name') === kpiName;
      }), immKpi => {
        return immKpi.set('enabled', !immKpi.get('enabled'));
      }
    );

    this.setState({
      immCurrentQualityAgreement: this.state.immCurrentQualityAgreement.set('kpis', immNewKpis)
    })
  },

  /**
   * Processes all of the values in the quality agreement prior to save, and performs validation that the Quality Agreement
   * meets all of the requirements for a valid Quality agreement
   * @param immQualityAgreement
   */
  processQualityAgreement: function(immQualityAgreement) {
    let allNumericValues = true; // Used to determine whether all values are numeric
    let hasEnabledKPI = false;   // Used to validate whether we have a KPI enabled
    let allMaxValuesGreaterThanTarget = true; // Used to determine whether the max threshold values are greater than the target variance value for all enabled KPIs
    let thresholdsHaveNoMixedSigns = true; // Used to determine whether the threshold values are either both positive or both negative

    // Process all values in the quality agreement, and perform validation on them. Turns all entered valued to
    // floats, and validates that at least one row is enabled and that all values entered are numeric
    const newQualityAgreement = immQualityAgreement.set('kpis', immQualityAgreement.get('kpis').map((immKpi, index) => {
      const immThresholds = immKpi.get('thresholds');
      const kpiEnabled = immKpi.get('enabled', false);
      // If we don't have a KPI enabled, update it based on the enabled status of this one
      if (!hasEnabledKPI) {
        hasEnabledKPI = kpiEnabled;
      }

      // Process the thresholds
      const newImmThresholds = immThresholds.map((immThreshold, index) => {
        let thresholdValue = immThreshold.get('value', null);

        if (thresholdValue != null) {
          thresholdValue = String(thresholdValue).trim();
        }

        const parsedValue = thresholdValue === "" ||  thresholdValue === null ?
            parseFloat(thresholdValue) :
            parseFloat(Number(thresholdValue));

        // If this KPI is enabled, check the threshold values to see if they are numeric, and that the absolute value of the max threshold >= the target
        if (kpiEnabled) {
          // Check if the threshold value is numeric
          if (isNaN(parsedValue)) {
            // If this is the target threshold value, this is an optional field. Don't set the flag if this is the case (target was set to null)
            if (index === 0) {
              if (thresholdValue != null && thresholdValue != "") {
                allNumericValues = false;
              }
            }
            else {
              allNumericValues = false;
            }
          }

          // If this is the max threshold, perform threshold comparison checks
          if (index === 1) {
            let enteredTargetValue = immThresholds.getIn([0, 'value'], null);

            if (enteredTargetValue != null) {
              enteredTargetValue = String(enteredTargetValue).trim();
            }
            let targetValue = enteredTargetValue === "" ||  enteredTargetValue === null ?
                parseFloat(enteredTargetValue) :
                parseFloat(Number(enteredTargetValue));

            // Target threshold values are optional, so if they're specified let's check here
            if (!isNaN(targetValue)) {
              let maxValue = parsedValue;

              // if the thresholds have different positivity values then flag them
              if ((maxValue < 0 && targetValue > 0) || (maxValue > 0 && targetValue < 0)) {
                thresholdsHaveNoMixedSigns = false;
              }
              else {
                // Otherwise check the abs value of these (we're basically checking that the distance of the max from zero
                // is greater than the target's distance from zero
                allMaxValuesGreaterThanTarget = Math.abs(maxValue) >= Math.abs(targetValue);
              }
            }
          }
        }
        return immThreshold.set('value', parsedValue);
      });

      let enteredPlan = immKpi.get('plan', null);
      if (enteredPlan != null) {
        enteredPlan = String(enteredPlan).trim();
      }
      const planValue = enteredPlan === "" ||  enteredPlan === null ?
          parseFloat(enteredPlan) :
          parseFloat(Number(enteredPlan));

      // If the KPI is enabled, and this isn't a number
      if (allNumericValues && kpiEnabled && isNaN(planValue)) {
        allNumericValues = false;
      }
      if (!!immKpi.get('enabled', false)) {
        hasEnabledKPI = true;
      }
      return immKpi.set('plan', planValue).set('thresholds', newImmThresholds)
    }));

    // Start validation, if this isn't valid we'll return an empty QualityAgreement and pop up an error message
    let errorMessage;

    if (!hasEnabledKPI) {
      errorMessage =  FrontendConstants.QUALITY_AGREEMENT_MUST_HAVE_ENABLED_KPI;
    }
    else if (!allNumericValues) {
      errorMessage = FrontendConstants.QUALITY_AGREEMENT_VALUES_MUST_BE_NUMERIC;
    }
    else if (!thresholdsHaveNoMixedSigns) {
      errorMessage = FrontendConstants.QUALITY_AGREEMENT_THRESHOLD_VALUES_DIFFERENT_SIGNS;
    }
    else if (!allMaxValuesGreaterThanTarget) {
      errorMessage = FrontendConstants.QUALITY_AGREEMENT_THRESHOLD_VALUES_INVALID;
    }

    if (errorMessage) {
      ExposureActions.createStatusMessage(errorMessage, StatusMessageTypeConstants.TOAST_ERROR);
      return ImmEmptyQualityAgreement();
    }

    return newQualityAgreement;
  },

  save: function() {
    const newQualityAgreement = this.processQualityAgreement(this.state.immCurrentQualityAgreement);
    // If this is an empty quality agreement, an error happened so don't save
    if (newQualityAgreement.equals(ImmEmptyQualityAgreement())) {
      return;
    }

    let immNewFile = this.state.immCurrentFile.set('qualityAgreement', newQualityAgreement);
    const studyId = this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_STUDY_ID);
    const studyName = this.state.studyCroMap.getIn([studyId, 'studyName']);
    const croId = this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID);
    const croName = this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_CRO_NAME, croId); // Default to CRO ID if we don't have a name for whatever reason
    const title = `${studyName} - ${croName}`;
    immNewFile = immNewFile.set('title', title);
    if (this.props.params.fileId) {  // In edit mode.
      immNewFile = immNewFile.set('id', this.props.params.fileId);
      if (immNewFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.delete('folderId');
      }
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId, immNewFile, this.saveSucceeded)
    } else {  // in add mode.
      var folderId = this.props.immExposureStore.getIn(['folderView', 'folderId']);
      if (folderId !== ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.set('folderId', folderId);
      }
      immNewFile = immNewFile.set('fileType', 'QUALITY_AGREEMENT');
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.REPORT);
      ExposureActions.reportCreationViewCreateReport(immNewFile, this.saveSucceeded.bind(this, true));
    }
  },

  hasStudyCro: function() {
    let hasStudyId = !!this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_STUDY_ID);
    let hasCroId = !!this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID);
    return hasStudyId && hasCroId;
  },

  canSave: function() {
    let hasStudyCro = this.hasStudyCro();
    let isQualityAgreementUpdated = this.isQualityAgreementUpdated();
    return hasStudyCro && isQualityAgreementUpdated;
  },

  isQualityAgreementUpdated: function() {
    return !Imm.is(this.state.immBaseQualityAgreement, this.state.immCurrentQualityAgreement);
  },

  // Used by the RouterTransitionHelper API to flag whether there's any unsaved work
  isDirty: function() {
    // This flag is used to navigate to the top page without triggering the dirty check for this component, so we
    // won't have a modal dialog show if the save button navigates to the top page
    if (this.skipDirtyCheck) {
      return false;
    }

    // Check to see if the current quality agreement is different than the one that was loaded with the
    // component
    return this.isQualityAgreementUpdated();
  },

  saveSucceeded: function(skipDirtyCheck) {
    if (skipDirtyCheck) {
      this.skipDirtyCheck = true;
    }

    // If we have a file ID, then this was an update, otherwise it was a creation
    const successMessage = this.props.params.fileId
      ? FrontendConstants.QUALITY_AGREEMENT_UPDATED_SUCCESSFULLY
      : FrontendConstants.QUALITY_AGREEMENT_SAVED_SUCCESSFULLY;

    ExposureActions.createStatusMessage(successMessage, StatusMessageTypeConstants.TOAST_SUCCESS);
    this.context.router.push({name: RouteNameConstants.EXPOSURE_FOLDERS});
  },

  handleDropdownChange: function(field, selection) {
    switch (field) {
      case ExposureAppConstants.QUALITY_AGREEMENT_STUDY_ID:
        immCurrentAgreement = this.state.immCurrentQualityAgreement.set(field, selection);
        immCurrentAgreement = immCurrentAgreement.set(ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID, "");
        immCurrentAgreement = immCurrentAgreement.set(ExposureAppConstants.QUALITY_AGREEMENT_CRO_NAME, "");
        this.setState({
          immCurrentQualityAgreement: immCurrentAgreement
        });
        break;
      case ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID:
        let immCurrentAgreement = this.state.immCurrentQualityAgreement.set(field, selection.value);
        immCurrentAgreement = immCurrentAgreement.set(ExposureAppConstants.QUALITY_AGREEMENT_CRO_NAME, selection.label);
        this.setState({
          immCurrentQualityAgreement: immCurrentAgreement
        });
        break;
      default:
        this.setState({
          immCurrentQualityAgreement: this.state.immCurrentQualityAgreement.set(field, selection)
        });
    }
  },

  canEditKPITable: function() {
    // We can edit the KPI table only if we have a study & cro selected
    let isInEditMode = this.state.isEdit;
    let haveStudyCRO = this.hasStudyCro();
    return isInEditMode && haveStudyCRO;
  },

  render: function() {
    if (!this.isReady()) {
      return <Spinner />;
    }

    const fileId = this.props.params.fileId;
    const immExposureStore = this.props.immExposureStore;

    const immQualityAgreement = this.state.immCurrentQualityAgreement;
    let studyCroMap = immExposureStore.get('studyCroData', Imm.Map());

    let content;
    const canEdit = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'canEdit'], false);

    const headerRow = (
      <div className='table-row table-header'>
        <div className='table-row-item'>Disable / Enable</div>
        <div className='table-row-item table-row-item-medium'>KPI</div>
        <div className='table-row-item'>Scorecard Category</div>
        <div className='table-row-item table-row-item-large'>KPI Description</div>
        <div className='table-row-item' style={{'backgroundColor': '#467d15'}}>KPI Plan</div>
        {immQualityAgreement.get('availableThresholds').map(immThreshold => {
          return <div className='table-row-item' style={{'backgroundColor': immThreshold.get('color')}}>{immThreshold.get('name')}</div>
        })}
      </div>
    );

    const canEditKpiTable = this.canEditKPITable();
    const kpiRows = immQualityAgreement.get('kpis').map(immKpi => {
      const canEditKpi = canEditKpiTable && immKpi.get('enabled');
      return (
        <div className={cx('table-row', {'disabled': canEditKpi})}>
          <div className={cx('table-row-item', 'quality-agreement-toggle')}>
            <ToggleButton isActive={immKpi.get('enabled')} disabled={!canEditKpiTable}
                          onClick={this.toggleKpiActiveFlag.bind(this, immKpi.get('name'))}/>
          </div>
          <div className={cx('table-row-item','table-row-item-medium', 'quality-agreement-kpi-name')}>{immKpi.get('name')}</div>
          <div className={cx('table-row-item', 'quality-agreement-scorecard-category')}>{FrontendConstants.QUALITY_AGREEMENT_CATEGORY(immKpi.get('category'))}</div>
          <div className={cx('table-row-item', 'table-row-item-large', 'quality-agreement-kpi-description')}>{immKpi.get('description')}</div>
          <div className={cx('table-row-item', 'quality-agreement-kpi-plan')}>
            <NumericInputBox onChange={this.updatePlan.bind(this, immKpi.get('name'))} value={immKpi.get('plan')}
                             disabled={!canEditKpi}
                             placeholder={immKpi.get('placeholder')}
            />
          </div>
          {immQualityAgreement.get('availableThresholds').map((immThresholdDefinition, index) => {
            const thresholdType = index ===  0
                ? ExposureAppConstants.QUALITY_AGREEMENT_THRESHOLD_TYPES.TARGET
                : ExposureAppConstants.QUALITY_AGREEMENT_THRESHOLD_TYPES.MAX;
            const immThreshold = immKpi.get('thresholds').find(immThreshold => immThreshold.get('name') === immThresholdDefinition.get('name'), this, Imm.Map());
            const value = this.mergeThresholds(immThresholdDefinition, immThreshold).get('value');

            return (
              <div className={cx('table-row-item', `quality-agreement-threshold-${thresholdType}`)}>
                <NumericInputBox
                  onChange={this.updateThreshold.bind(this, immKpi.get('name'), immThreshold.get('name'))} value={value}
                  disabled={!canEditKpi}
                  placeholder={immThreshold.get('placeholder')}
                />
              </div>);
            })
          }
        </div>
      );
    });

    const table = (
      <div className='table'>
        {headerRow}
        {kpiRows}
      </div>
    );

    const studyId = this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_STUDY_ID);
    const croId = this.state.immCurrentQualityAgreement.get(ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID);

    const studyOptions = studyCroMap.map((studyData, studyId) => {
      return {'value': studyId, 'label': studyData.get('studyName')};
    }).toList();

    const croOptions = studyCroMap.getIn([studyId, 'values'], Imm.Map()).map((croValues) => {
      return {'value': croValues.get('croId'), 'label': croValues.get('croName')}
    }).toList();

    const mainContent = (
      <div className='quality-agreement'>
        <div className='study-id'>
          <InputBlockContainer
            title='Study'
            inputComponent={
              <Combobox
                className='study-id-dropdown'
                options={studyOptions}
                onChange={this.handleDropdownChange.bind(this, ExposureAppConstants.QUALITY_AGREEMENT_STUDY_ID)}
                value={studyId}
                disabled={!this.state.isEdit}/>
            } />
        </div>
        {studyId ?
          <div className='cro-id'>
            <InputBlockContainer
              title='CRO'
              inputComponent={
                <Combobox
                  className='cro-id-dropdown'
                  options={croOptions}
                  onChange={this.handleDropdownChange.bind(this, ExposureAppConstants.QUALITY_AGREEMENT_CRO_ID)}
                  value={croId}
                  disabled={!this.state.isEdit}
                  passOnlyValueToChangeHandler={false}
                />
              } />
          </div>
     : null}
        {table}
      </div>
    );

    // Only allow for editing & sharing to occur if we're in view mode (existing file ID) but not in edit mode
    const moreMenu = (
        <div className='header-buttons'>
          <Menu className='more-menu' horizontalPlacement='right'>
            <MenuTrigger className='more-menu-trigger'>
              <div className='react-menu-icon icon-menu2'>More</div>
            </MenuTrigger>
            <MenuOptions className='more-menu-options'>
              <MenuOption className='more-menu-share'
                          onSelect={ExposureActions.shareFilesModal.bind(null, Imm.List([fileId]))}>
                <div className='react-menu-icon icon-share'>{FrontendConstants.SHARE}</div>
              </MenuOption>
              <MenuOption disabled={!canEdit} onSelect={this.toggleIsEdit}>
                <div className='react-menu-icon icon-pencil edit-quality-agreement'>{FrontendConstants.EDIT_QUALITY_AGREEMENT}</div>
              </MenuOption>
            </MenuOptions>
          </Menu>
        </div>
      );

    const header = (
        // If we have a fileID, then display the breadcrumb info. Otherwise just show the 'Create Quality Agreement' header
        fileId
          ? (
            <div className='page-header'>
              <Breadcrumbs immExposureStore={immExposureStore} fileId={fileId} />
              {moreMenu}
            </div>
          )
          : (
            <div className='page-header'>
              <div className='title'>Create Quality Agreement</div>
            </div>
          )

    );

    if (Util.isDesktop()) {
      content = (
        <div className='quality-agreement-view-container'>
          {header}
          {mainContent}
          <Button
            classes='quality-agreement-save'
            icon='icon-loop2 btn-save'
            children={FrontendConstants.SAVE}
            isPrimary={true}
            isDisabled={!this.canSave()}
            onClick={this.save} />
        </div>
      );
    }

      else {
        content = (
          <div className='monitor-view-container'>
            <div className='page-header'>
              <Breadcrumbs immExposureStore={immExposureStore} fileId={fileId} isMobile={Util.isMobile()} />
            </div>
            <div className='mobile-monitor'>
              <div className='user-alert'>
                <span className='icon-info' />
                <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                  {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
                </span>
              </div>
            </div>
          </div>
        );
      }

    return content;
  },
});

module.exports = withTransitionHelper(QualityAgreement);
