import React from 'react';
import ReactDOM from 'react-dom';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import _ from 'underscore';

import AccountUtil from '../../util/AccountUtil';
import ModalDialogContent from '../ModalDialogContent';
import ViewTask from './ViewTask';
import AddTask from './AddTask';

class EmbeddedReportsTask extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const immAppConfig = comprehend.globals.immAppConfig;
    const yellowfinReportId = this.props.yellowfinReportId;

    // If V3 Task integration is disabled, then never show the task pane
    if (!AccountUtil.hasFeature(immAppConfig, 'v3_task_integration')) {
      return null;
    }

    let isUnsavedWarningDisplayed = this.props.immExposureStore.get('modalContent', {}).type === ModalDialogContent.UnsavedWarning;
    let handleToggleTasksPane = this.props.handleToggleTasksPane;
    let immExposureStore = this.props.immExposureStore;

    let defaultProps = {
      ref: 'task',
      currentFileId: yellowfinReportId,
      isLinkedToCDMFile: true,
      currentUserId: immExposureStore.getIn(['userInfo', 'id']),
      handleToggleTasksPane: handleToggleTasksPane,
      immFileConfigs: immExposureStore.get('fileConfigs'),
      immGroupEntities: immExposureStore.get('groupEntities'),
      immUsers: immExposureStore.get('users'),
      immTaskTypes: immExposureStore.get('taskTypes'),
      immCDMDropdownData: this.props.immExposureStore.get('CDMDropdownData'),
      isLoading: immExposureStore.get('isLoadingTask')
    };

    // Get view for adding task
    if (this.props.addTask) {
      const props = _.extend(defaultProps, {
        immExposureStore,
        handleLinkedFileChange: _.noop,
        isUnsavedWarningDisplayed: isUnsavedWarningDisplayed,
        fromYellowfinReport: true,
        yellowfinReportQuery: this.props.yellowfinReportQuery,
        addTaskSuccessCallback: this.props.clearTaskInformation,
        handleToggleTasksPane:handleToggleTasksPane
      });
      return <AddTask {...props} />
    }
    // View for viewing an existing task
    else if (this.props.viewTask) {
      const props = _.extend(defaultProps, {
        immExposureStore,
        currentTaskId: this.props.params.taskId,
        immTaskSummaries: immExposureStore.get('taskSummaries'),
        immTaskWrappers: immExposureStore.get('tasks'),
        isUnsavedWarningDisplayed: isUnsavedWarningDisplayed
      });
      return <ViewTask {...props} />
    }
    else {
      return null;
    }
  }
}

EmbeddedReportsTask.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  fileId: PropTypes.string,
  params: PropTypes.shape({
    fileId: PropTypes.string,
    taskId: PropTypes.string
  }).isRequired,
  handleToggleTasksPane: PropTypes.func.isRequired,
  clearTaskInformation: PropTypes.func.isRequired,
  addTask: PropTypes.bool.isRequired,
  viewTask: PropTypes.bool.isRequired,
  yellowfinReportQuery: PropTypes.string.isRequired,
  yellowfinReportId: PropTypes.string.isRequired
};

EmbeddedReportsTask.contextTypes = {
  router: PropTypes.object
};

export default EmbeddedReportsTask;
