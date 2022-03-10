import React from 'react';
import createReactClass from 'create-react-class';
import _ from 'underscore';
import cx from 'classnames';
import Imm from 'immutable';
import Tooltip from 'rc-tooltip';
import PropTypes from 'prop-types';

import Button from '../Button';
import Combobox from '../Combobox';
import InputBlockContainer from '../InputBlockContainer';
import InputWithPlaceholder from '../InputWithPlaceholder';
import ToggleButton from '../ToggleButton';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import ModalConstants from '../../constants/ModalConstants';
import MonitorOverviewFieldConstants from '../../constants/MonitorOverviewFieldConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import RouteHelpers from '../../http/RouteHelpers';
import Util from '../../util/util';

import {TouchDiv as div, TouchSpan as span } from '../TouchComponents';

class MonitorOverview extends React.Component {
  static displayName = 'MonitorOverview';
  static propTypes = {
    fileId: PropTypes.string.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    onCancel: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    isEditable: PropTypes.bool
  };

  static monitorData = Imm.fromJS([
    {value: ExposureAppConstants.MONITOR_STATE_ACTIVE, label: FrontendConstants.ACTIVE},
    {value: ExposureAppConstants.MONITOR_STATE_RECORDING, label: FrontendConstants.RECORDING},
    {value: ExposureAppConstants.MONITOR_STATE_INACTIVE, label: FrontendConstants.INACTIVE}
  ]);

  constructor(props) {
    super(props);

    this.state = {
      blurred: {
        [MonitorOverviewFieldConstants.TITLE]: false,
        [MonitorOverviewFieldConstants.DESCRIPTION]: false
      },
      moreDescription: false
    };
  }

  componentWillMount() {
    var immMonitorFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
    this.setState({
      immLoadedMonitorFile: immMonitorFile,
      immWorkingMonitorFile: immMonitorFile
    });
  }

  componentWillReceiveProps(nextProps) {
    // This is for the case where update happens successfully.
    var immNextMonitorFile = nextProps.immExposureStore.getIn(['files', nextProps.fileId, 'fileWrapper', 'file']);
    if (!Imm.is(this.state.immLoadedMonitorFile, immNextMonitorFile)) {
      this.setState({immLoadedMonitorFile: immNextMonitorFile, immWorkingMonitorFile: immNextMonitorFile});
    }
  }

  isDirty() {
    return !Imm.is(this.state.immLoadedMonitorFile, this.state.immWorkingMonitorFile);
  }

  handleBlur(field, isBlur) {
    var newBlurred = _.clone(this.state.blurred);
    newBlurred[field] = isBlur;
    this.setState({blurred: newBlurred});
  }

  handleInputChange(field, value) {
    let immWorkingMonitorFile = this.state.immWorkingMonitorFile;
    switch (field) {
      case MonitorOverviewFieldConstants.TITLE:
        this.setState({immWorkingMonitorFile: immWorkingMonitorFile.set('title', value.target.value)});
        break;
      case MonitorOverviewFieldConstants.DESCRIPTION:
        this.setState({immWorkingMonitorFile: immWorkingMonitorFile.set('description', value.target.value)});
        break;
      case MonitorOverviewFieldConstants.MONITOR_STATUS:
        this.setState({immWorkingMonitorFile: immWorkingMonitorFile.setIn(['monitor', 'monitorState'], value)});
        break;
      case MonitorOverviewFieldConstants.SCHEDULE:
        let updatedFile = _.isEmpty(value.target.value)
          ? immWorkingMonitorFile.removeIn(['monitor', 'jobSchedule'])
          : immWorkingMonitorFile.setIn(['monitor', 'jobSchedule'], value.target.value);
        this.setState({immWorkingMonitorFile: updatedFile});
        break;
      case MonitorOverviewFieldConstants.TASK_URGENCY:
        var immNewMonitor = immWorkingMonitorFile.mergeIn(['monitor', 'taskConfig'], Imm.fromJS({
          isUrgent: !immWorkingMonitorFile.getIn(['monitor', 'taskConfig', 'isUrgent'])
        }));
        this.setState({immWorkingMonitorFile: immNewMonitor});
        break;
    }
  }

  handleCancel() {
    if (this.isDirty()) {
      ExposureActions.displayModal(ModalConstants.MODAL_UNSAVED_WARNING, {
        header: FrontendConstants.DISCARD_CHANGES_TO_MONITOR,
        content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
        handleCancel: ExposureActions.closeModal,
        discardFunc: () => {
          this.setState({immWorkingMonitorFile: this.state.immLoadedMonitorFile});
          this.props.onCancel();
          ExposureActions.closeModal();
        }
      });
    } else {
      this.props.onCancel();
    }
  }

  handleUpdate() {
    var invalidUpdate = this.getInvalidTitleErrorMessage() || this.getInvalidDescriptionErrorMessage() || this.getInvalidScheduleErrorMessage();
    if (!invalidUpdate) {
      // TODO: check with design/product if there could be a modification note for overview update.
      // Temporarily set to default string until TODO above is resolved.
      var immMonitorFile = this.state.immWorkingMonitorFile.setIn(['monitor', 'modificationNote'], 'Overview updated.');
      ExposureActions.updateFile(this.props.fileId, immMonitorFile, this.props.onUpdate);
    }
  }

  // If the title is changed but still empty, we should show it as invalid.
  getInvalidTitleErrorMessage() {
    return this.state.blurred[MonitorOverviewFieldConstants.TITLE] && Util.isWhiteSpaceOnly(this.state.immWorkingMonitorFile.get('title')) ? FrontendConstants.TITLE_CANNOT_BE_EMPTY : null;
  }

  // If the title is changed but still empty, we should show it as invalid.
  getInvalidDescriptionErrorMessage() {
    return this.state.blurred[MonitorOverviewFieldConstants.DESCRIPTION] && Util.isWhiteSpaceOnly(this.state.immWorkingMonitorFile.get('description')) ? FrontendConstants.DESCRIPTION_CANNOT_BE_EMPTY : null;
  }

  getInvalidScheduleErrorMessage() {
    let value = this.state.immWorkingMonitorFile.getIn(['monitor', 'jobSchedule']);

    return this.state.blurred[MonitorOverviewFieldConstants.SCHEDULE]
      && !(_.isEmpty(value) || Util.isISO8601RepeatingInterval(value))
      ? FrontendConstants.SCHEDULE_FORMAT_ERROR_MESSAGE
      : null;
  }

  render() {
    var immExposureStore = this.props.immExposureStore;
    var isEditable = this.props.isEditable;
    var immMonitorFile = immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
    var invalidTitleErrorMsg = this.getInvalidTitleErrorMessage();
    var invalidDescriptionErrorMsg = this.getInvalidDescriptionErrorMessage();
    var invalidScheduleErrorMsg = this.getInvalidScheduleErrorMessage();

    var monitorTitle = isEditable
      ? (
        <InputBlockContainer
          class='title'
          inputComponent={
            <InputWithPlaceholder
              type='text'
              className={cx('text-input', 'title-input', 'monitor-title', {'invalid-input': !_.isEmpty(invalidTitleErrorMsg)})}
              onBlur={this.handleBlur.bind(this, MonitorOverviewFieldConstants.TITLE, true)}
              onChange={this.handleInputChange.bind(this, MonitorOverviewFieldConstants.TITLE)}
              onFocus={this.handleBlur.bind(this, MonitorOverviewFieldConstants.TITLE, false)}
              placeholder={FrontendConstants.TITLE_REQUIRED}
              value={this.state.immWorkingMonitorFile.get('title')}
            />
          }
          errorMsg={invalidTitleErrorMsg}
        />
       )
      : (
        <span className='monitor-title'>
          {immMonitorFile.get('title')}
        </span>
        );

    var monitorDescription = null;
    if (isEditable) {
      monitorDescription = <InputBlockContainer
        class='description'
        inputComponent={
          <InputWithPlaceholder
            type='textarea'
            className={cx('textarea', 'description-input', {'invalid-input': !_.isEmpty(invalidDescriptionErrorMsg)})}
            onBlur={this.handleBlur.bind(this, MonitorOverviewFieldConstants.DESCRIPTION, true)}
            onChange={this.handleInputChange.bind(this, MonitorOverviewFieldConstants.DESCRIPTION)}
            onFocus={this.handleBlur.bind(this, MonitorOverviewFieldConstants.DESCRIPTION, false)}
            rows={6}
            value={this.state.immWorkingMonitorFile.get('description')}
            placeholder={FrontendConstants.DESCRIPTION}
            />
        }
        errorMsg={invalidDescriptionErrorMsg}
      />;
    }
    else {
      var description = immMonitorFile.get('description');
      if (description.length > ExposureAppConstants.MONITOR_DESCRIPTION_LETTER_COUNT_LIMIT) {
        var toggleLink = (
          <span className={cx('more-less-link', 'text-link')}
                onClick={() => {
                 this.setState({moreDescription: !this.state.moreDescription});
                }}
          >
            {FrontendConstants[this.state.moreDescription ? 'LESS' : 'MORE'].toLowerCase()}
          </span>
        );

        monitorDescription = (
          <div className='monitor-description'>
            <div className={cx('description', {less: !this.state.moreDescription})}>
              {description}
            </div>
            {toggleLink}
          </div>
        );

      } else {
        monitorDescription = <div className='monitor-description'>{immMonitorFile.get('description')}</div>;
      }
    }

    var openTasksCount = this.props.immExposureStore.getIn(['monitorTasks'], Imm.List())
      .map(immTaskTuple => { return immTaskTuple.get('task') })
      .toSet()
      .filter(immTask => Util.isOpenTask(immTask))
      .size;
    var openTasks = (
      <div className='monitor-overview-tasks icon-task-alt'>
        <span className='text-link' onClick={ExposureActions.toggleMonitorTasksPane.bind(this, false)}>
          {FrontendConstants.OPEN_TASKS(openTasksCount)}
        </span>
      </div>
    );

    var monitorStatus = isEditable
      ? (
          <Combobox
            className='monitor-status-dropdown'
            value={this.state.immWorkingMonitorFile.getIn(['monitor', 'monitorState'])}
            onChange={this.handleInputChange.bind(this, MonitorOverviewFieldConstants.MONITOR_STATUS)}
            options={MonitorOverview.monitorData}
          />
        )
      : (
        <span className='monitor-status'>
          {MonitorOverview.monitorData.find(immData => immData.get('value') === immMonitorFile.getIn(['monitor', 'monitorState']), null, Imm.Map()).get('label', '')}
        </span>
      );

    var monitorSchedule = isEditable
      ? <InputBlockContainer
          class='schedule'
          inputComponent={
            <InputWithPlaceholder
              type='text'
              className={cx('text-input', 'schedule-input', 'monitor-schedule', {'invalid-input': !_.isEmpty(invalidScheduleErrorMsg)})}
              onBlur={this.handleBlur.bind(this, MonitorOverviewFieldConstants.SCHEDULE, true)}
              onChange={this.handleInputChange.bind(this, MonitorOverviewFieldConstants.SCHEDULE)}
              onFocus={this.handleBlur.bind(this, MonitorOverviewFieldConstants.SCHEDULE, false)}
              placeholder={FrontendConstants.DEFAULT_MONITOR_SCHEDULE}
              value={this.state.immWorkingMonitorFile.getIn(['monitor', 'jobSchedule'])}
            />
          }
          errorMsg={invalidScheduleErrorMsg}
        />
      : (
          <span className='monitor-schedule'>
            {immMonitorFile.getIn(['monitor', 'jobSchedule'], FrontendConstants.DEFAULT_MONITOR_SCHEDULE)}
          </span>
        );

    var taskUrgency = isEditable
      ? <ToggleButton
          isActive={this.state.immWorkingMonitorFile.getIn(['monitor', 'taskConfig', 'isUrgent'])}
          activeText='!'
          onClick={this.handleInputChange.bind(this, MonitorOverviewFieldConstants.TASK_URGENCY)}
        />
      : (
          <span className='monitor-urgency'>
            {immMonitorFile.getIn(['monitor', 'taskConfig', 'isUrgent'])
              ? FrontendConstants.URGENT + '!'
              : FrontendConstants.NOT_URGENT
            }
          </span>
        );

    return (
      <div className='monitor-overview'>
        <div className='overview-item'>
          <div className='header title'>
            {FrontendConstants.TITLE}
          </div>
          {monitorTitle}
        </div>
        <div className='overview-item'>
          <div className='header description'>
            {FrontendConstants.DESCRIPTION}
          </div>
          {monitorDescription}
        </div>
        {!isEditable
          ? <div className='overview-item'>
              {openTasks}
            </div>
          : null
        }
        <div className='overview-item'>
          <div className='header status'>
            {FrontendConstants.MONITOR_STATUS}
            <Tooltip
              placement='top'
              overlay={(
                <div className='overlay' style={{width: '240px'}}>
                  <span className='header'>
                    {FrontendConstants.ACTIVE + ': '}
                  </span>
                  {FrontendConstants.MONITOR_STATUS_ACTIVE_TOOLTIP_MESSAGE}
                  <br />
                  <span className='header'>
                    {FrontendConstants.RECORDING + ': '}
                  </span>
                  {FrontendConstants.MONITOR_STATUS_RECORDING_TOOLTIP_MESSAGE}
                  <br />
                  <span className='header'>
                    {FrontendConstants.INACTIVE + ': '}
                  </span>
                  {FrontendConstants.MONITOR_STATUS_INACTIVE_TOOLTIP_MESSAGE}
                </div>
              )}
              arrowContent={<div className='rc-tooltip-arrow-inner' />}
            >
              <span className='icon-question-circle' />
            </Tooltip>
          </div>
          {monitorStatus}
        </div>
        <div className='overview-item'>
          <div className='header schedule'>
            {FrontendConstants.SCHEDULE}
            <Tooltip {...Util.getTooltipClasses(null, FrontendConstants.MONITOR_SCHEDULE_TOOLTIP_MESSAGE, 'top', 200)}>
              <span className='icon-question-circle' />
            </Tooltip>
          </div>
          {monitorSchedule}
        </div>
        <div className='overview-item'>
          <div className='header urgency'>
            {FrontendConstants.TASK_URGENCY}
            <Tooltip {...Util.getTooltipClasses(null, FrontendConstants.TASK_URGENCY_TOOLTIP_MESSAGE, 'top', 160)}>
              <span className='icon-question-circle' />
            </Tooltip>
          </div>
          {taskUrgency}
        </div>
        {isEditable
          ? (
              <div className='edit-buttons'>
                <Button
                  children={FrontendConstants.UPDATE}
                  isPrimary={true}
                  onClick={this.handleUpdate.bind(this)}
                />
                <Button
                  children={FrontendConstants.CANCEL}
                  isSecondary={true}
                  onClick={this.handleCancel.bind(this)}
                />
              </div>
            )
          : null
        }
      </div>
    );
  }
}

module.exports = MonitorOverview;
