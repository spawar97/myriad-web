import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import FrontendConstants from '../../../constants/FrontendConstants';

import ContentPlaceholder from '../../ContentPlaceholder';

import OversightScorecardActions from '../../../actions/OversightScorecardActions';
import OversightScorecardStore, {  GetOutstandingRequest } from '../../../stores/OversightScorecardStore';
import OversightConsoleUtil from "../../../util/OversightConsoleUtil";
import PermissionsUtil from "../../../util/PermissionsUtil";
import {Key as OversightStoreKey, RequestKey} from '../../../stores/constants/OversightStoreConstants';
import {FeatureListConstants, OversightScorecardPermissions} from '../../../constants/PermissionsConstants';
import SplitterLayout from 'react-splitter-layout';
import InformationMessage from '../InformationMessage';
import OversightConfigurationMetricList from './OversightConfigurationMetricList';
import OversightConfigurationJsonEditor from './OversightConfigurationJsonEditor';
import OversightConfigurationWebForm from './OversightConfigurationWebForm';
import Spinner from '../../Spinner';
import ModalConstants from '../../../constants/ModalConstants';
import ExposureActions from '../../../actions/ExposureActions';
import StatusMessageTypeConstants from '../../../constants/StatusMessageTypeConstants';
import AccountUtil from "../../../util/AccountUtil";
import StudiesUtil from '../../../util/StudiesUtil';
import PropTypes from "prop-types";
import ExposureStoreKey from "../../../stores/constants/ExposureStoreKeys";
import RouteNameConstants from "../../../constants/RouteNameConstants";
import OversightScorecardConstants from "../../../constants/OversightScorecardConstants";
import SimpleButtonArray from '../../SimpleButtonArray';
import Combobox from "../../Combobox";
import Button from '../../Button';
import {withTransitionHelper} from "../../RouterTransitionHelper";
import OversightConfigurationUtil from "../../../util/OversightConfigurationUtil";

class OversightScorecardConfiguration extends React.PureComponent {

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    OversightScorecardStore.resetStore();

    const canEditDefaultProfile = PermissionsUtil.checkLoggedInUserHasPermissionForFeature(
      FeatureListConstants.OVERSIGHT_SCORECARD, OversightScorecardPermissions.canEditDefault, true
    );

    this.SelectMetricGroup = this._selectMetricGroup.bind(this);
    this.SelectMetricGroupByStudy = this._selectMetricGroupByStudy.bind(this);
    this.AddMetricGroup = this._addMetricGroup.bind(this);
    this.EditMetricGroup = this._editMetricGroup.bind(this);
    this.DeleteMetricGroup = this._deleteMetricGroup.bind(this);

    this.state = {
      immOversightScorecardStore: OversightScorecardStore.getStore(),
      immMetricsCombined: Imm.List(),
      immEditingMetric: null,
      immEditingMetricInit: null,
      immEditingMetricChanged: null,
      editingMetricId: null,
      editMode: OversightScorecardConstants.EDIT_MODES.WEB_FORM,
      validationResult: true,
      showErrors: false,
      selectedMetricGroup: null,
      selectedStudy: null,
      immStudyToMetricGroupMap: Imm.Map(),
      immMetricGroupList: Imm.List(),
      canEditDefaultProfile,
    };
  }

  componentDidMount() {
    const {immExposureStore} = this.props;
    OversightScorecardActions.applyStoreState({});
    OversightScorecardActions.storeViewSites({});
    OversightScorecardStore.addChangeListener(this._onChange);
    OversightScorecardActions.fetchMetricDefaults();
    OversightScorecardActions.fetchMetrics();
    const currentAccountId = immExposureStore.get(ExposureStoreKey.currentAccountId);
    OversightScorecardActions.fetchScorecardMetricIds(currentAccountId);
    OversightScorecardActions.fetchMetricGroups(true);
  }

  componentWillUnmount() {
    OversightScorecardStore.removeChangeListener(this._onChange);
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const {immExposureStore : immOldExposureStore} = this.props;
    const {immExposureStore : immNewExposureStore} = nextProps;
    const {immOversightScorecardStore} = this.state;

    const immOldStudies = immOldExposureStore.get('studies', Imm.Map());
    const immNewStudies = immNewExposureStore.get('studies', Imm.Map());
    const immMetricGroups = immOversightScorecardStore.get(OversightStoreKey.metricGroups, Imm.List());
    const immMetricGroupList = immOversightScorecardStore.get(OversightStoreKey.metricGroups, Imm.List())
      .valueSeq().toList();

    if (!Imm.is(immOldStudies, immNewStudies) && immMetricGroups.size > 0) {
      const immStudyToMetricGroupMap = OversightConsoleUtil.getStudyToMetricGroupMap(immNewStudies, immMetricGroups);
      this.setState({
        immStudyToMetricGroupMap,
        immMetricGroupList
      });
    }
  }


  get immCategories() {
    return this.state.immMetricsCombined
      .groupBy(immMetric => immMetric.get('category'))
      .keySeq()
      .toList()
      .filter(category => category);
  }

  get immDefaultMetricGroup() {
    const {immOversightScorecardStore} = this.state;
    if (!immOversightScorecardStore) {
      return Imm.Map();
    }

    return immOversightScorecardStore
      .get('metricGroups', Imm.Map())
      .find(immMetric => immMetric.get('isDefault', false), this, Imm.Map());
  }

  get isDefaultMetricGroupSelected() {
    const {selectedMetricGroup} = this.state;
    const defaultGroupId =  this.immDefaultMetricGroup.get('id');
    return !!selectedMetricGroup && selectedMetricGroup === defaultGroupId;
  }

  /**
   * Removes extraneous metadata fields from a metric
   * @param immMetric
   * @returns {*}
   */
  removeMetricMetaFields(immMetric) {
    return immMetric
      .delete('drillTargetsToFiles')
      .delete('id')
      .delete('accountId')
      .delete('isAccount');
  }

  /**
   * Finds the metric from the combined metrics list with the specified metric ID.
   * The combined metric list is the currently displayed metric list for the selected metric
   * group, so no bleeding of metric IDs -> metric configurations for other groups should be possible.
   * @param metricId
   * @returns {*}
   */
  getImmMetricById(metricId) {
    const {immMetricsCombined} = this.state;
    return immMetricsCombined.find(item => {
      return item.get('metricId', null) === metricId;
    }, this, Imm.Map());
  }

  _getGroupFirstMetric(immMetricsCombined) {
    const immSortedMetrics = OversightConfigurationUtil
        .sortMetrics(immMetricsCombined)
        .sortBy(immMetric => immMetric.get('category'));
    return immSortedMetrics.first();
  }

  _selectMetricGroup(metricGroupId) {
    this.doActionWithDismiss(this._selectMetricGroupDiscardChanges.bind(this, metricGroupId));
    const {immMetricsCombined} = this.state;
    const firstMetricId = this._getGroupFirstMetric(immMetricsCombined).get('metricId', null);
    this.selectMetric(firstMetricId);
  }

  _selectMetricGroupDiscardChanges(metricGroupId, studyId = null) {
    // Only update metric group if a group was actually selected
    if (metricGroupId) {
      this.cancelMetricConfiguration();
      this.setState({
        selectedMetricGroup: metricGroupId,
        selectedStudy: studyId,
      });

      OversightScorecardActions.selectMetricGroup(metricGroupId);
    }
  }

  _selectMetricGroupByStudy(studyId) {
    const {immStudyToMetricGroupMap} = this.state;
    const metricGroupIdForStudy = immStudyToMetricGroupMap.get(studyId, this.immDefaultMetricGroup.get('id'));
    if (metricGroupIdForStudy) {
      this.doActionWithDismiss(this._selectMetricGroupDiscardChanges.bind(this, metricGroupIdForStudy, studyId));
    }
  }

  _addMetricGroup() {
    const {immStudyToMetricGroupMap, immOversightScorecardStore} = this.state;
    ExposureActions.displayModal(ModalConstants.MODAL_ADD_OVERSIGHT_METRIC_GROUP, {
      handleCancel: ExposureActions.closeModal,
      handleSuccess: this._finishAddOrUpdateMetricGroup.bind(this),
      immExposureStore: this.props.immExposureStore,
      immStudyToMetricGroupMap,
      immOversightScorecardStore,
    });
  }

  _finishAddOrUpdateMetricGroup() {
    const {isEdit} = this.state;
    // Clear out the study that was selected, so if studies were updated it is not displaying
    // misleading information after the update
    ExposureActions.closeModal();
    this.setState({
      selectedStudy: null,
    });
    OversightScorecardActions.fetchMetricGroups();
    this._selectMetricGroupDiscardChanges(this.immDefaultMetricGroup.get('id'));
  }

  _finishDeleteMetricGroup(success) {
    if (success) {
      ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_DELETED_THE_METRIC_GROUP, StatusMessageTypeConstants.TOAST_SUCCESS);
    }

    ExposureActions.closeModal();
    OversightScorecardActions.fetchMetricGroups();
    this._selectMetricGroupDiscardChanges(this.immDefaultMetricGroup.get('id'));
  }

  _editMetricGroup() {
    const {immStudyToMetricGroupMap, immOversightScorecardStore} = this.state;
    ExposureActions.displayModal(ModalConstants.MODAL_EDIT_OVERSIGHT_METRIC_GROUP, {
      handleCancel: ExposureActions.closeModal,
      handleSuccess: this._finishAddOrUpdateMetricGroup.bind(this),
      immExposureStore: this.props.immExposureStore,
      immStudyToMetricGroupMap,
      metricGroupId: this.state.selectedMetricGroup,
      immOversightScorecardStore,
    });
  }

  _deleteMetricGroup() {
    const {selectedMetricGroup, immOversightScorecardStore} = this.state;
    const metricGroupTitle = immOversightScorecardStore.getIn([OversightStoreKey.metricGroups, selectedMetricGroup, 'name']);
    ExposureActions.displayModal(ModalConstants.MODAL_DELETE_OVERSIGHT_METRIC_GROUP, {
      immDeletionTargetLabels: Imm.List([metricGroupTitle]),
      handleCancel: ExposureActions.closeModal,
      callback: () => {
        OversightScorecardActions.deleteMetricGroup(
          selectedMetricGroup,
          this._finishDeleteMetricGroup.bind(this)
        );
        ExposureActions.closeModal();
      },
    });
  }

  /**
   * Change handler for the Oversight Scorecard store
   * @private
   */
  _onChange = () => {
    const {immExposureStore} = this.props;
    const {immMetricsCombined, immOversightScorecardStore, editingMetricId} = this.state;
    const newImmOversightScorecardStore = OversightScorecardStore.getStore();

    let state = {
      immOversightScorecardStore: newImmOversightScorecardStore,
    };

    /**
     * Check if the combined metrics (combined list of default and configured metrics)
     */
    const newImmMetricsCombined = newImmOversightScorecardStore.get(OversightStoreKey.metricsCombined, Imm.Map());
    if (!newImmMetricsCombined.equals(immMetricsCombined)) {
      state.immMetricsCombined = newImmMetricsCombined;
    }

    /**
     * Check if any metric creation requests have completed
     */
    const createMetricRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.createMetricConfiguration], null
    );
    const newCreateMetricRequest = GetOutstandingRequest(RequestKey.createMetricConfiguration);
    const immCreatedMetric = newImmOversightScorecardStore.get(OversightStoreKey.createdMetric, null);
    if (createMetricRequest && !newCreateMetricRequest && immCreatedMetric) {
      const immMetric = this.removeMetricMetaFields(immCreatedMetric);
      state.immEditingMetric = immMetric;
      state.immEditingMetricInit = immMetric;
      state.immEditingMetricChanged = immMetric;
      state.showErrors = false;
    }

    /**
     * Check if any update metric requests have completed
     */
    const updateMetricRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.updateMetricConfiguration], null
    );
    const newUpdateMetricRequest = GetOutstandingRequest(RequestKey.updateMetricConfiguration);
    const immUpdatedMetric = newImmOversightScorecardStore.get(OversightStoreKey.updatedMetric, null);
    if (updateMetricRequest && !newUpdateMetricRequest && immUpdatedMetric) {
      const immMetric = this.removeMetricMetaFields(immUpdatedMetric);
      state.immEditingMetric = immMetric;
      state.immEditingMetricInit = immMetric;
      state.immEditingMetricChanged = immMetric;
      state.showErrors = false;
    }

    /**
     * Check if any delete metric requests have completed
     */
    const deleteMetricRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.deleteMetricConfiguration], null
    );
    const newDeleteMetricRequest = GetOutstandingRequest(RequestKey.deleteMetricConfiguration);
    const immDeletedMetricIds = newImmOversightScorecardStore.get(OversightStoreKey.deletedMetricIds, null);
    if (deleteMetricRequest && !newDeleteMetricRequest && immDeletedMetricIds) {
      const immDefaultMetric = newImmMetricsCombined.find(item => {
        return item.get('metricId', null) === editingMetricId;
      }, this, Imm.Map());
      state.immEditingMetric = this.removeMetricMetaFields(immDefaultMetric);
      state.immEditingMetricInit = this.removeMetricMetaFields(immDefaultMetric);
      state.immEditingMetricChanged = this.removeMetricMetaFields(immDefaultMetric);
      state.showErrors = false;
    }

    /**
     * Checks if any fetch requests have completed
     */
    const fetchMetricGroupsRequest = immOversightScorecardStore.getIn(
      ['outstandingRequests', RequestKey.fetchMetricGroups], null
    );
    const newFetchMetricGroupsRequest = GetOutstandingRequest(RequestKey.fetchMetricGroups);
    const immMetricGroups = newImmOversightScorecardStore.get(OversightStoreKey.metricGroups, Imm.Map());
    if (fetchMetricGroupsRequest && !newFetchMetricGroupsRequest) {
      const immMetricGroupList = immMetricGroups.valueSeq().toList();

      const immDefaultMetricGroup = immMetricGroups.find(x => x.get('isDefault', false));
      state.selectedMetricGroup = immDefaultMetricGroup.get('id');
      const immStudies = immExposureStore.get('studies', Imm.Map());
      if (immStudies.size > 0) {
        const immStudyToMetricGroupMap = OversightConsoleUtil.getStudyToMetricGroupMap(immStudies, immMetricGroupList);
        state.immStudyToMetricGroupMap = immStudyToMetricGroupMap;
        state.immMetricGroupList = immMetricGroupList;
      }
    }

    this.setState(state);
  };

  /**
   * Selects a metric by ID
   * @param id
   */
  selectMetric(id) {
    const immSelectedMetric = this.removeMetricMetaFields(this.getImmMetricById(id));
    this.setState({
      editingMetricId: id,
      immEditingMetric: immSelectedMetric,
      immEditingMetricInit: immSelectedMetric,
      immEditingMetricChanged: immSelectedMetric,
      validationResult: true,
      showErrors: false,
    });
  }

  updateMetricConfiguration() {
    const { editingMetricId, immOversightScorecardStore, immEditingMetricChanged,
      validationResult, editMode } = this.state;

    const selectedMetricGroup = immOversightScorecardStore.get(OversightStoreKey.selectedMetricGroup);
    if (validationResult) {
      this.setState({immEditingMetric: immEditingMetricChanged});
      const immMetricFromAccountList = immOversightScorecardStore.get(OversightStoreKey.metrics, Imm.List())
        .find(item => item.get('metricId', null) === editingMetricId
          && item.get('metricGroupId', null) === selectedMetricGroup);

      if (immMetricFromAccountList) {
        OversightScorecardActions.updateMetricConfiguration(
          immMetricFromAccountList.get('id', null),
          immEditingMetricChanged.set('metricGroupId', selectedMetricGroup).toJS()
        );
      } else {
        const immMetricFromDefaults = immOversightScorecardStore.get(OversightStoreKey.metricDefaults, Imm.List())
          .find(item => item.get('metricId', null) === editingMetricId);
        const immMetricFromIds = immOversightScorecardStore.get(OversightStoreKey.metricIds, Imm.List())
          .find(item => item.get('metricId', null) === editingMetricId);
        if (immMetricFromDefaults || immMetricFromIds) {
          OversightScorecardActions.createMetricConfiguration(
            immEditingMetricChanged.set('drillTargetsToFiles', [])
              .set('metricGroupId', selectedMetricGroup)
              .toJS()
          );
        }
      }
    } else {
      this.setState({showErrors: true});
      if (editMode === OversightScorecardConstants.EDIT_MODES.JSON) {
        ExposureActions.createStatusMessage(
          FrontendConstants.INVALID_JSON,
          StatusMessageTypeConstants.WARNING
        );
      }
    }
  }

  cancelMetricConfiguration() {
    this.setState({
      immEditingMetric: null,
      immEditingMetricInit: null,
      immEditingMetricChanged: null,
      editingMetricId: null,
      validationResult: true,
      showErrors: false,
    });
  }

  deleteMetricConfiguration() {
    const { editingMetricId, immOversightScorecardStore, selectedMetricGroup } = this.state;
    const immMetricFromAccountList = immOversightScorecardStore.get(OversightStoreKey.metrics, Imm.List())
      .find(item => item.get('metricId', null) === editingMetricId
        && item.get('metricGroupId') === selectedMetricGroup
      );
    if (immMetricFromAccountList) {
      ExposureActions.displayModal(ModalConstants.MODAL_DELETE_OVERSIGHT_SCORECARD_CONFIG, {
        handleCancel: ExposureActions.closeModal,
        callback: () => {
          OversightScorecardActions.deleteMetricConfiguration(
            immMetricFromAccountList.get('id', null)
          );
          ExposureActions.closeModal();
        },
        immDeletionTargetLabels: Imm.List([immMetricFromAccountList.getIn(['displayAttributes', 'title'], null)]),
      });
    }
  }

  changeMetricInput(immNewMetricValue, validationResult){
    this.setState({immEditingMetricChanged: immNewMetricValue, validationResult});
  }

  get _saveInProgress() {
    return (GetOutstandingRequest(RequestKey.createMetricConfiguration)
      || GetOutstandingRequest(RequestKey.updateMetricConfiguration)
      || GetOutstandingRequest(RequestKey.deleteMetricConfiguration));
  }

  doActionWithDismiss(action) {
    if (this.isDirty()) {
      ExposureActions.displayUnsavedWorkModal(
        FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED,
        FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
        (isDiscard) => {
          if (isDiscard !== false) {
            action();
          }
        }
      );
    } else {
      action();
    }
  }

  closeConfig() {
    this.context.router.push(RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD);
  }

  changeEditorMode(key) {
    const {validationResult, immEditingMetricChanged} = this.state;
    const state = {};
    if (validationResult) {
      state.editMode = key;
      state.immEditingMetric = immEditingMetricChanged;
    }
    this.setState(state);
  }

  canChangeMode() {
    const {validationResult, editMode} = this.state;
    let result = false;
    if (validationResult) {
      result = true;
    } else {
      this.setState({showErrors: true});
      if (editMode === OversightScorecardConstants.EDIT_MODES.JSON) {
        ExposureActions.createStatusMessage(
          FrontendConstants.INVALID_JSON,
          StatusMessageTypeConstants.WARNING
        );
      }
    }
    return result;
  }

  isDirty() {
    const { immEditingMetricInit, immEditingMetricChanged } = this.state;
    if (immEditingMetricInit != null && immEditingMetricChanged != null) {
      let immMetricInitWithDefaults = immEditingMetricInit.setIn(['displayAttributes', 'goodColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD)
      immMetricInitWithDefaults = immMetricInitWithDefaults.setIn(['displayAttributes', 'mediumColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM)
      immMetricInitWithDefaults = immMetricInitWithDefaults.setIn(['displayAttributes', 'badColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD)

      let immEditingMetricChangedFormatted = immEditingMetricChanged

      const goodcolorval = immEditingMetricChangedFormatted.getIn(['displayAttributes', 'goodColor']);
      if (!goodcolorval) {
        immEditingMetricChangedFormatted = immEditingMetricChangedFormatted.setIn(['displayAttributes', 'goodColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD)
      }

      const mediumColorval = immEditingMetricChangedFormatted.getIn(['displayAttributes', 'mediumColor']);
      if (!mediumColorval) {
        immEditingMetricChangedFormatted = immEditingMetricChangedFormatted.setIn(['displayAttributes', 'mediumColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM)
      }

      const badColorval = immEditingMetricChangedFormatted.getIn(['displayAttributes', 'badColor']);
      if (!badColorval) {
        immEditingMetricChangedFormatted = immEditingMetricChangedFormatted.setIn(['displayAttributes', 'badColor'], OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD)
      }
      if (immMetricInitWithDefaults.has('metricGroupId')) {
        immMetricInitWithDefaults = immMetricInitWithDefaults.deleteIn(['metricGroupId'])
      }
      if (immEditingMetricChangedFormatted.has('metricGroupId')) {
        immEditingMetricChangedFormatted = immEditingMetricChangedFormatted.deleteIn(['metricGroupId'])
      }

      return (!(Imm.is(immMetricInitWithDefaults, immEditingMetricChangedFormatted)))
    }
    else {
      return (!(Imm.is(immEditingMetricInit, immEditingMetricChanged)))
    }
  }

  unsavedWorkModalCopy() {
    return {header: FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST};
  }

  _getContent() {
    const {immOversightScorecardStore, editingMetricId, editMode, immEditingMetric,
      showErrors, selectedMetricGroup, selectedStudy, immMetricGroupList} = this.state;
    const {immExposureStore} = this.props;

    const emptyMetricConfigProps = {
      params: {
        title: FrontendConstants.NO_METRICS_SELECTED,
        details: FrontendConstants.SELECT_METRIC_FROM_CATEGORY,
      },
    };

    const unassignedStudySelected = selectedMetricGroup === 'NONE';

    const canEditMetricGroup = this.isDefaultMetricGroupSelected
      ? this.state.canEditDefaultProfile
      : !unassignedStudySelected;

    let updateMetricHandler = () => {};
    if (this.isDirty()) {
      updateMetricHandler = this.updateMetricConfiguration.bind(this);
    }

    let metricConfigurationContent = null;
    if (this._saveInProgress) {
      metricConfigurationContent = (<Spinner containerClass='metric-spinner' />);
    } else if (immEditingMetric) {
      let editorContent = null;
      if (editMode === OversightScorecardConstants.EDIT_MODES.JSON) {
        editorContent = (
          <OversightConfigurationJsonEditor immMetric={immEditingMetric}
                                            onChange={this.changeMetricInput.bind(this)}
          />);
      } else {
        editorContent = (
          <OversightConfigurationWebForm immMetric={immEditingMetric}
                                         onChange={this.changeMetricInput.bind(this)}
                                         showErrors={showErrors}
                                         immCategories={this.immCategories}
                                         canEdit={canEditMetricGroup}
          />);
      }
      const buttons = canEditMetricGroup
        ? (
          <div className="buttons">
            <Button
              isPrimary={true}
              onClick={updateMetricHandler}
              isDisabled={!this.isDirty()}
            >
              {FrontendConstants.UPDATE}
            </Button>
            <Button
              isSecondary={true}
              onClick={this.doActionWithDismiss.bind(this, this.cancelMetricConfiguration.bind(this))}
            >
              {FrontendConstants.CANCEL}
            </Button>
          </div>
        )
        : '';

      metricConfigurationContent = (
        <div>
          {editorContent}
          {buttons}
        </div>
      );
    } else {
      const {immMetricsCombined} = this.state;
      const immFirstMetric = this._getGroupFirstMetric(immMetricsCombined);
      if(immFirstMetric) {
        const firstMetricId = this._getGroupFirstMetric(immMetricsCombined).get('metricId', null);
        this.selectMetric(firstMetricId);
      }
      else
        metricConfigurationContent = (<InformationMessage {...emptyMetricConfigProps}/>);
    }

    const selectedIndex = immOversightScorecardStore.get(OversightStoreKey.metrics, Imm.List())
      .findIndex(item => item.get('metricId', null) === editingMetricId
        && item.get('metricGroupId') === selectedMetricGroup
      );
    let isMetricCreated = false;
    if (selectedIndex !== -1) {
      isMetricCreated = true;
    }

    const immStudies = StudiesUtil.getImmStudies(immExposureStore);
    const immMetricGroupsOptions = immMetricGroupList.map(immMetricGroup => {
      return Imm.Map({
        value: immMetricGroup.get('id'),
        label: immMetricGroup.get('name'),
        isDefault: immMetricGroup.get('isDefault', false),
      });
    }).sort((immMetricGroupA, immMetricGroupB) => {
      // Ensure that 'Default' is at the top of the selection options
      if (immMetricGroupA.get('isDefault', false)) {
        return -1;
      }
      if (immMetricGroupB.get('isDefault', false)) {
        return 1;
      }

      const labelA = immMetricGroupA.get('label').toLowerCase();
      const labelB = immMetricGroupB.get('label').toLowerCase();
      return labelA.localeCompare(labelB);
    });

    const immStudyIdToStudyName = immStudies.groupBy(studyData => studyData.value).map(studyData => {
      return studyData.get(0).label;
    });

    const selectedStudyName = immStudyIdToStudyName.get(selectedStudy);

    const immSelectedMetricGroupStudyIds = immOversightScorecardStore.getIn(
      [ 'metricGroups', selectedMetricGroup, 'studyIds'], Imm.List());

    // Unless explicitly excluded, all studies are included in the default metric group.
    // So for the default metric group, we will show the exclusion list
    const immStudyIdList = this.isDefaultMetricGroupSelected
      ? this.immDefaultMetricGroup.get('excludedStudyIds', Imm.List())
      : immSelectedMetricGroupStudyIds;

    const immStudiesList = immStudyIdList.map(studyId => {
      return immStudyIdToStudyName.get(studyId);
    }).filter(studyName => !!studyName).sort();

    const studiesList = immStudiesList.join(', ');

    const studiesListString = immStudiesList.size !== immStudyIdList.size
      ? immStudiesList.size > 0
        ? `${studiesList} and other studies which you don't have access to`
        : `Studies which you don't have access to`
      : studiesList;

    const emptyStudyListDiv = this.isDefaultMetricGroupSelected
      ? (
        <div className='oversight-metric-group-study-list-no-studies' />
      )
      : (
        <div className='oversight-metric-group-study-list-no-studies'>
          {FrontendConstants.NO_STUDIES_ASSOCIATED_WITH_METRIC_GROUP}
        </div>
      );

    const studyListDiv = immStudyIdList.size > 0
      ? (
        <div className='oversight-metric-group-study-list'>
          {studiesListString}
        </div>
      )
      : emptyStudyListDiv;

    const studyListLabel = this.isDefaultMetricGroupSelected
      ? immStudyIdList.size === 0
        ? FrontendConstants.DEFAULT_METRIC_GROUP_APPLIES_TO_ALL_STUDIES
        : FrontendConstants.DEFAULT_METRIC_GROUP_APPLIES_TO_ALL_STUDIES_EXCEPT
      : FrontendConstants.METRIC_GROUP_APPLIES_TO_STUDIES(immStudiesList.size);

    const studyListBanner = unassignedStudySelected
    ? (
      <div className='unassigned-study-warning'>
        <span className={cx('icon', 'icon-WarningCircle', 'unassigned-study-warning-icon')}/>
        <div className='oversight-metric-group-unassigned-study-message'>
          {FrontendConstants.STUDY_IS_NOT_ASSIGNED_TO_ANY_METRIC_GROUP(selectedStudyName)}
        </div>
      </div>
      )
    : (
      <div className='oversight-metric-group-study-list-wrapper'>
        <div className='oversight-metric-group-study-list-label'>
          {studyListLabel}
        </div>
        {studyListDiv}
      </div>
    );

    // TODO - Add tooltip help icon for explaining behavior of the dropdowns
    const metricGroupSelector = (
      <div className='oversight-metric-group-selection'>
        <div className='oversight-metric-group-selector-panes'>
          <div className='oversight-metric-group'>
            <span className='label'>{FrontendConstants.METRIC_GROUP}</span>
            <Combobox className='metric-group-selector'
                      placeholder={FrontendConstants.NONE}
                      value={selectedMetricGroup}
                      onChange={this.SelectMetricGroup}
                      options={immMetricGroupsOptions}
                      valueKey='value'
                      labelKey='label'
            />
          </div>
          <div className='oversight-metric-group-studies'>
            <span className='label'>{FrontendConstants.STUDY}</span>
            <Combobox className='metric-studies-selector'
                      placeholder={FrontendConstants.NOT_SELECTED}
                      value={selectedStudy}
                      onChange={this.SelectMetricGroupByStudy}
                      options={immStudies}
                      valueKey='value'
                      labelKey='label'
            />
          </div>
        </div>
        <div className="buttons">
          <Button
            isPrimary={true}
            isDisabled={this.isDefaultMetricGroupSelected || unassignedStudySelected}
            onClick={this.DeleteMetricGroup}
            children={FrontendConstants.DELETE_METRIC_GROUP}
          />
          <Button
            isPrimary={true}
            isDisabled={!canEditMetricGroup}
            onClick={this.EditMetricGroup}
            children={FrontendConstants.EDIT_METRIC_GROUP}
          />
          <Button
            isPrimary={true}
            onClick={this.AddMetricGroup}
            children={FrontendConstants.ADD_METRIC_GROUP}
          />
        </div>
        {studyListBanner}
      </div>
    );

    const deleteConfigurationButton = canEditMetricGroup
      ? (
        <div className={cx('title', 'delete-button', {'hidden': !isMetricCreated})}
             onClick={this.deleteMetricConfiguration.bind(this)}>
          {FrontendConstants.DELETE_CONFIGURATION}
          <span className={cx('icon-remove', 'delete-padding-left')}></span>
        </div>
      )
      : '';

    const viewButtons = canEditMetricGroup
      ? [
          {key: OversightScorecardConstants.EDIT_MODES.JSON, class: 'mode-buttons icon-console'},
          {key: OversightScorecardConstants.EDIT_MODES.WEB_FORM, class: 'mode-buttons icon-grid-view'},
      ]
      : [
        {key: OversightScorecardConstants.EDIT_MODES.WEB_FORM, class: 'mode-buttons icon-grid-view'},
      ];

    return (
      <div className='oversight-scorecard-content'>
        {metricGroupSelector}
        <SplitterLayout primaryMinSize={400} primaryIndex={1} secondaryMinSize={200}
                        secondaryInitialSize={350}>
          <div className='pane-content-left'>
            <div className='pane-header'>
              <div className='title'>
                {FrontendConstants.AVAILABLE_METRICS}
              </div>
            </div>
            <div className='metric-menu'>
              <OversightConfigurationMetricList immMetrics={this.state.immMetricsCombined}
                                                activatedId={this.state.editingMetricId}
                                                itemSelected={
                                                  (id) => this.doActionWithDismiss(
                                                    () => this.selectMetric(id)
                                                  )}
              />
            </div>
          </div>
          <div>
            <div className='pane-header'>
              <div className='title'>
                {FrontendConstants.METRIC_CONFIGURATION}
              </div>
              <div className="header-buttons">
                {deleteConfigurationButton}
                <SimpleButtonArray
                  activeButtonKey={editMode}
                  buttons={viewButtons}
                  onClick={this.changeEditorMode.bind(this)}
                  canChange={this.canChangeMode.bind(this)}
                />
              </div>
            </div>
            {metricConfigurationContent}
          </div>
        </SplitterLayout>
      </div>
    );
  }

  _isReady() {
    let hasMetrics = !GetOutstandingRequest(RequestKey.fetchMetricDefaults)
      && !GetOutstandingRequest(RequestKey.fetchMetrics)
      && !GetOutstandingRequest(RequestKey.fetchScorecardMetricIds);
    const hasMetricGroups = !GetOutstandingRequest(RequestKey.fetchMetricGroups);
    const hasStudies = this.props.immExposureStore.get('studies', Imm.Map()).size > 0;

    return hasMetrics && hasMetricGroups && hasStudies;
  }

  render() {
    let content;

    if (!this._isReady()) {
      content = <ContentPlaceholder />;
    } else {
      content = this._getContent();
    }

    return (
      <div className='oversight-scorecard configuration'>
        <div className='page-header'>
          <div className='title'>
            {FrontendConstants.CONFIGURE_OVERSIGHT_SCORECARD}
            <div className='close-button' onClick={this.closeConfig.bind(this)}></div>
          </div>
        </div>
        {content}
      </div>
    );
  }
}

export default withTransitionHelper(OversightScorecardConfiguration);
