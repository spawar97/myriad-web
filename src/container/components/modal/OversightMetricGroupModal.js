import React from "react";
import PropTypes from "prop-types";
import Imm from "immutable";
import {Key, RequestKey} from "../../stores/constants/OversightStoreConstants";
import StudiesUtil from '../../util/StudiesUtil';
import Util from "../../util/util";
import OversightConsoleUtil from "../../util/OversightConsoleUtil";
import OversightScorecardActions from "../../actions/OversightScorecardActions";
import FrontendConstants from "../../constants/FrontendConstants";
import InputBlockContainer from "../InputBlockContainer";
import InputWithPlaceholder from "../InputWithPlaceholder";
import cx from "classnames";
import Combobox from "../Combobox";
import Button from "../Button";

/**
 * Simple modal component for adding/editing oversight metric groups
 */
class OversightMetricGroupModal extends React.PureComponent {
  static displayName = 'OversightMetricGroupModal';

  /**
   * immExposureStore - Exposure store reference
   * immOversightScorecardStore - Scorecard store reference
   * metricGroupId - ID of the metric group being edited. If not passed, modal operates in "create" mode
   * handleCancel - function to handle when user cancels creation/updating metric group
   * handleSuccess - function callback for when creation/updating metric group succeeds
   * immStudyToMetricGroupMap - Immutable map of format {studyId -> metricGroupId}
   */
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immOversightScorecardStore: PropTypes.instanceOf(Imm.Map).isRequired,
    metricGroupId: PropTypes.string,
    handleCancel: PropTypes.func.isRequired,
    handleSuccess: PropTypes.func.isRequired,
    immStudyToMetricGroupMap: PropTypes.instanceOf(Imm.Map).isRequired,
    setModalClassName: PropTypes.func,
  };

  constructor(props){
    super(props);
    const {immStudyToMetricGroupMap, immExposureStore,
      immOversightScorecardStore, metricGroupId
    } = props;

    const immAllStudies = immExposureStore.get('studies', Imm.Map()).map((immStudy, studyId) => {
      return immStudy.set('id', studyId);
    }).toList();
    const immAllStudyIds = immAllStudies.map(immStudy => immStudy.get('id'));
    const immMetricGroups = immOversightScorecardStore.get(Key.metricGroups, Imm.Map());
    const immDefaultMetricGroup = OversightConsoleUtil.getDefaultMetricGroup(immMetricGroups);
    const defaultMetricGroupId = immDefaultMetricGroup.get('id');

    const isEditMode = !!metricGroupId; // If we have a metric group ID, we are in the edit workflow
    const isEditingDefaultGroup = isEditMode && metricGroupId === defaultMetricGroupId;

    const immUnassignedStudies = immDefaultMetricGroup.get('excludedStudyIds', Imm.List());
    const immSelectableStudies = isEditingDefaultGroup
      ? immAllStudies
      : immAllStudies.filter(immStudy => {
        const studyId = immStudy.get('id');
        // Note - this mapping lookup will filter out any studies the user does not have access to
        // based on their data access groups, as study information for these studies will not
        // be available to the user.
        const metricGroupIdForStudy = immStudyToMetricGroupMap.get(studyId);
        const studyInDefaultGroup = metricGroupIdForStudy === defaultMetricGroupId;
        const studyInSelectedGroup = metricGroupId
          ? metricGroupIdForStudy === metricGroupId
          : false;

        const studyExcludedFromDefaultGroup = immUnassignedStudies.includes(studyId);
        const studyHasNoGroup = studyExcludedFromDefaultGroup && metricGroupIdForStudy === 'NONE';

        // A study is selectable if it is either in the selected metric group, part of the default
        // group, or has no group assignment (meaning it is excluded from the default metric group
        // but not assigned to any other existing metric groups.
        return studyInDefaultGroup || studyInSelectedGroup || studyHasNoGroup;
      });
    const immSelectableStudiesSorted = immSelectableStudies
      .sortBy(immStudy => immStudy.get('value', '').toUpperCase());

    let immStudies = Imm.Set();
    let immWorkingStudies = Imm.Set();
    let name = '';

    if (isEditMode) {
      const immSelectedMetricGroup = immMetricGroups.get(metricGroupId);
      name = immSelectedMetricGroup.get('name', '');
      immStudies = isEditingDefaultGroup
        ? immAllStudyIds.toSet().subtract(immUnassignedStudies)
        : immSelectedMetricGroup.get('studyIds', Imm.List()).toSet();
      immWorkingStudies = immStudies;
    }

    // As updates only take into consideration changes between the base and end state, filter
    // out any studies from the list which are not selectable for the current user.
    immStudies = immStudies.filter(studyId => immSelectableStudies.find(immStudyInfo => {
      return immStudyInfo.get('id') === studyId;
    }));

    this.state = {
      metricGroupName: name,
      workingMetricGroupName: name,
      immAllStudies,
      immSelectableStudies: immSelectableStudiesSorted,
      immStudies,
      immWorkingStudies,
      isEdit: isEditMode,
      isEditingDefaultGroup,
      hasBegunNameEdit: false,
    };

    this.SelectStudy = this._selectStudy.bind(this);
    this.HandleNameInputChange = this._handleNameInputChange.bind(this);
    this.AddMetricGroup = this._addMetricGroup.bind(this);
    this.UpdateMetricGroup = this._updateMetricGroup.bind(this);
  }

  componentDidMount() {
    this.props.setModalClassName('oversight-metric-group-modal');
  }

  _handleNameInputChange(e) {
    this.setState({
      workingMetricGroupName: e.target.value,
      hasBegunNameEdit: true,
    });
  }

  _selectStudy(selectedStudies) {
    if (!selectedStudies) {
      return;
    }

    const immWorkingStudies = Imm.Set(selectedStudies);

    this.setState({
      immWorkingStudies,
    });
  }

  _isValidMetricGroupName() {
    const {metricGroupId : editGroupId} = this.props;
    const {isEdit, workingMetricGroupName} = this.state;

    if (workingMetricGroupName.length === 0 || !Util.isValidTitle(workingMetricGroupName)) {
      return false;
    }

    const immMetricGroups = this.props.immOversightScorecardStore.get(Key.metricGroups, Imm.Map());

    const isUniqueName = immMetricGroups.filter(immMetricGroup => {
      let metricGroupId = immMetricGroup.get('id');
      let isEditingGroup = isEdit
        ? metricGroupId === editGroupId
        : false;
      return !isEditingGroup && immMetricGroup.get('name', '').toUpperCase() === workingMetricGroupName.toUpperCase();
    }).size === 0;
    return isUniqueName;
  }

  _addMetricGroup() {
    const {immOversightScorecardStore} = this.props;
    const {workingMetricGroupName, immWorkingStudies} = this.state;
    if (!immOversightScorecardStore.getIn(['outstandingRequests', RequestKey.addMetricGroup])) {
      OversightScorecardActions.addMetricGroup(workingMetricGroupName, immWorkingStudies, this._finishSave.bind(this));
    }
  }
  _updateMetricGroup() {
    const {immOversightScorecardStore, metricGroupId} = this.props;
    const {workingMetricGroupName, immWorkingStudies, isEditingDefaultGroup, immStudies,
      immSelectableStudies} = this.state;

    const immSelectableStudyIds = immSelectableStudies.map(immStudyInfo => immStudyInfo.get('id'));

    const immMetricGroups = immOversightScorecardStore.get(Key.metricGroups, Imm.Map());

    if (!immOversightScorecardStore.getIn(['outstandingRequests', RequestKey.editMetricGroup])) {
      // If updating the default group, the only field editable is the studies field. As such,
      // we must determine which studies the user excluded (from those which were previously included)
      // and update the default group's excludedStudyIds field appropriately
      if (isEditingDefaultGroup) {
        const immDefaultMetricGroup = OversightConsoleUtil.getDefaultMetricGroup(immMetricGroups);
        const immSavedExcludedStudies = immDefaultMetricGroup.get('excludedStudyIds', Imm.List()).toSet();

        const immAddedExcludedStudies = immStudies.filter(studyId => !immWorkingStudies.contains(studyId));
        const immRemovedExcludedStudies = immSavedExcludedStudies.filter(studyId => immWorkingStudies.contains(studyId));
        let studyIdToName = {};
        immAddedExcludedStudies
            .concat(immRemovedExcludedStudies)
            .forEach(studyId => {
              studyIdToName[studyId] = this.props.immExposureStore.getIn(['studies', studyId, 'value']);
            });
        OversightScorecardActions.editDefaultMetricGroup(metricGroupId, workingMetricGroupName, immAddedExcludedStudies, immRemovedExcludedStudies, studyIdToName, this._finishSave.bind(this));

      }
      // Otherwise, update the existing non-default metric group
      else {
        // Determine which studies were added and which were removed from the user.
        const immAddedStudies = immWorkingStudies.filter(studyId => !immStudies.contains(studyId));
        const immRemovedStudies = immStudies.filter(studyId => !immWorkingStudies.contains(studyId));
        let studyIdToName = {};
        immAddedStudies
           .concat(immRemovedStudies)
           .forEach(studyId => {
             studyIdToName[studyId] = this.props.immExposureStore.getIn(['studies', studyId, 'value']);
              });
        OversightScorecardActions.editMetricGroup(metricGroupId, workingMetricGroupName, immAddedStudies, immRemovedStudies, studyIdToName, this._finishSave.bind(this));
      }
    }
  }

  _finishSave(success) {
    if (success) {
      this.props.handleSuccess();
    }
  }

  _canSave() {
    const {workingMetricGroupName, metricGroupName, immStudies, immWorkingStudies} = this.state;
    const hasChanges = workingMetricGroupName !== metricGroupName
      || !Imm.is(immStudies, immWorkingStudies);

    return this._isValidMetricGroupName() && hasChanges;
  }

  render() {
    const {immOversightScorecardStore} = this.props;
    const {workingMetricGroupName, immSelectableStudies, immWorkingStudies,
      hasBegunNameEdit, isEdit, isEditingDefaultGroup} = this.state;
    const isAdding = immOversightScorecardStore.getIn(['outstandingRequests', RequestKey.addMetricGroup], false);
    const isValidName = !hasBegunNameEdit || this._isValidMetricGroupName();
    const errorMessage = hasBegunNameEdit && !isValidName ? FrontendConstants.INVALID_NAME : '';

    const nameInput = (
      <InputBlockContainer
        title='Name *'
        inputComponent={
          <InputWithPlaceholder
            type='text'
            className={cx('text-input', 'name-input', {'invalid-input': !isValidName})}
            onChange={this.HandleNameInputChange}
            value={workingMetricGroupName}
            maxLength={100}
            disabled={isEditingDefaultGroup}
          />
        }
        errorMsg={errorMessage}
      />
    );

    const selectorProps = {
      multi: true,
      clearable: true,
      searchable: false,
      onBlurResetsInput: false,
      placeholder: FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER,
      options: immSelectableStudies,
      value: immWorkingStudies,
      onChange: this.SelectStudy,
      onInputChange: this.SelectStudy,
      valueKey: 'id',
      labelKey: 'value',
      abbreviationThreshold: 10000,   // We should never hit 10k studies, and even if we get near this it will make the UI look awful, however it will at least not cut off data.
    };

    const studyDropdown = (
      <div className='oversight-metric-group-studies'>
        <span className='label'>{FrontendConstants.STUDY}</span>
        <Combobox className='metric-studies-selector'
                  {...selectorProps}
        />
      </div>
    );

    const modalProperties = isEdit
      ? {
          headerText: FrontendConstants.EDIT_METRIC_GROUP,
          saveText: FrontendConstants.UPDATE,
          saveFunction: this.UpdateMetricGroup
        }
      : {
          headerText: FrontendConstants.ADD_METRIC_GROUP,
          saveText: FrontendConstants.SAVE,
          saveFunction: this.AddMetricGroup
        };

    return (
      <div className='oversight-metric-group-add-popup'>
        <div className='modal-dialog-header'>
          <span className='modal-dialog-header-text'>{modalProperties.headerText}</span>
        </div>
        <div className='modal-dialog-main'>
          {nameInput}
          {studyDropdown}
        </div>
        <div className='buttons'>
          <Button
            icon='icon-loop2'
            children={modalProperties.saveText}
            isPrimary={true}
            isLoading={isAdding}
            isDisabled={!this._canSave()}
            onClick={modalProperties.saveFunction}
          />
          <Button
            icon='icon-close'
            children={FrontendConstants.CANCEL}
            isSecondary={true}
            onClick={this.props.handleCancel}
          />
        </div>
      </div>
    );
  }
}

export default OversightMetricGroupModal;
