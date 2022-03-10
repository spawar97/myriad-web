var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
var Tooltip = React.createFactory(require('rc-tooltip').default);
import PropTypes from 'prop-types';

var Button = React.createFactory(require('../Button'));
var Combobox = React.createFactory(require('../Combobox'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var NumericInputBox = React.createFactory(require('../NumericInputBox'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ModalConstants = require('../../constants/ModalConstants');
var MonitorConfigurationFieldConstants = require('../../constants/MonitorConfigurationFieldConstants');
var MonitorUtil = require('../../util/MonitorUtil');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

import AccountUtil from '../../util/AccountUtil';
import ContentPlaceholder from '../ContentPlaceholder';

var ToggleButton = React.createFactory(require('../ToggleButton'));

class MonitorConfiguration extends React.Component {
  static displayName = 'MonitorConfiguration';

  static propTypes = {
    fileId: PropTypes.string.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    isEditable: PropTypes.bool,
    onCancel: PropTypes.func.isRequired,
    onUpdate: PropTypes.func.isRequired,
    // 'scaleFactors' is for keeping track of user inputs in STRING form.
    // Since `scaleFactor` inside Metric proto message is double, it cannot hold intermediate input of a user such as, '1.' or '0.'
    // with the conventional way of saving in the file proto. Typing '.' after '1' will immediately convert it back to just '1'
    // because '1.' will be parsed into '1' and be saved.
    scaleFactors: PropTypes.object.isRequired,
    thresholds: PropTypes.array.isRequired,
    updateConfigurationState: PropTypes.func.isRequired
  };

  state = {
    blurred: {
      scaleFactors: {},
      [MonitorConfigurationFieldConstants.THRESHOLD]: false,
      [MonitorConfigurationFieldConstants.MODIFICATION_NOTE]: false
    },
    modificationNote: null,
    scoreFormulaExpanded: false,
    immEmbeddedReportInfo: Imm.List()
  };

  componentWillMount() {
    this.setInitialMonitorConfiguration();
    this.requestYellowfinReports();
  }

  setInitialMonitorConfiguration = () => {
    var immMonitorFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
    this.setState({
      immLoadedMonitorFile: immMonitorFile,
      immWorkingMonitorFile: immMonitorFile
    });
  };

  requestYellowfinReports = () => {
    // Send a request to retrieve information about what reports a user has access to
    ExposureActions.getYellowfinReportList();
  };

  componentWillReceiveProps(nextProps) {
    // This is for the case where update happens successfully.
    var immNextMonitorFile = nextProps.immExposureStore.getIn(['files', nextProps.fileId, 'fileWrapper', 'file']);
    if (!Imm.is(this.state.immLoadedMonitorFile, immNextMonitorFile)) {
      this.setState({immLoadedMonitorFile: immNextMonitorFile, immWorkingMonitorFile: immNextMonitorFile});
    }

    // Format the dropdown options for V3 reports
    var immNextEmbeddedReportInfo = this.formatEmbeddedReportOptions(nextProps.immExposureStore.get('embeddedReportList', Imm.Map()));
    if (!Imm.is(this.state.immEmbeddedReportInfo, immNextEmbeddedReportInfo)) {
      this.setState({immEmbeddedReportInfo: immNextEmbeddedReportInfo});
    }
  }

  isDirty = () => {
    return this.state.immLoadedMonitorFile && !Imm.is(this.state.immLoadedMonitorFile, this.getUpdatedImmMonitorFile(this.state.immWorkingMonitorFile));
  };

  handleBlur = (field, isBlur) => {
    var newBlurred = _.clone(this.state.blurred);
    newBlurred[field] = isBlur;
    this.setState({blurred: newBlurred});
  };

  handleMetricBlur = (referenceName, isBlur) => {
    var newBlurred = _.clone(this.state.blurred);
    newBlurred.scaleFactors[referenceName] = isBlur;
    this.setState({blurred: newBlurred});
  };

  handleInputChange = (field, value, extra) => {
    let immWorkingMonitorFile = this.state.immWorkingMonitorFile;
    switch (field) {
      case MonitorConfigurationFieldConstants.THRESHOLD:
        var index = value;
        value = extra;
        var thresholds = _.clone(this.props.thresholds);
        thresholds[index] = value.target.value;
        this.props.updateConfigurationState({thresholds: thresholds});
        break;
      case MonitorConfigurationFieldConstants.IMPACT_RANGE:
        // TODO: this dropdown input change will be introduced after 2.2
        break;
      case MonitorConfigurationFieldConstants.MODIFICATION_NOTE:
        this.setState({modificationNote: value.target.value});
        break;
      case MonitorConfigurationFieldConstants.LINKED_REPORT_DASHBOARD:
        this.setState({immWorkingMonitorFile: immWorkingMonitorFile.set('associatedFileIds', Imm.List([value]))});
        break;
    }
  };

  handleScaleFactorChange = (referenceName, value) => {
    var scaleFactors = _.clone(this.props.scaleFactors);
    scaleFactors[referenceName] = value.target.value;
    this.props.updateConfigurationState({scaleFactors: scaleFactors});
  };

  handleCancel = () => {
    if (this.isDirty()) {
      ExposureActions.displayModal(ModalConstants.MODAL_UNSAVED_WARNING, {
        header: FrontendConstants.DISCARD_CHANGES_TO_MONITOR,
        content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
        handleCancel: ExposureActions.closeModal,
        discardFunc: () => {
          this.setInitialMonitorConfiguration();
          this.props.onCancel();
          ExposureActions.closeModal();
        }
      });
    } else {
      this.props.onCancel();
    }
  };

  handleUpdate = () => {
    var immMonitorFile = this.state.immWorkingMonitorFile;
    var invalidUpdate = this.getInvalidThresholdErrorMsg() || !this.state.modificationNote;

    if (!this.state.modificationNote) {
      this.handleBlur(MonitorConfigurationFieldConstants.MODIFICATION_NOTE, true);
    }

    // It is invalid anyway, let's see if we can skip metrics check.
    if (!invalidUpdate) {
      invalidUpdate = immMonitorFile.getIn(['monitor', 'metrics']).some(immMetric => !_.isEmpty(this.getInvalidMetricErrorMsg(immMetric.get('referenceName'))));
    }

    if (!invalidUpdate) {
      ExposureActions.updateFile(this.props.fileId, this.getUpdatedImmMonitorFile(immMonitorFile), this.props.onUpdate);
    }
  };

  getAssociatedFile = () => {
    var immFileConfigs = this.props.immExposureStore.get('fileConfigs');
    var associatedFileId = this.state.immLoadedMonitorFile.getIn(['associatedFileIds', 0]);
    const useEmbeddedReports = this.state.immLoadedMonitorFile.getIn(['monitor', 'useEmbeddedReports'], false);

    if (useEmbeddedReports) {
      let title = this.state.immEmbeddedReportInfo.find((report) => report.get('value', '') === associatedFileId, this, Imm.Map()).get('label', '');

      return div({className: cx('icon-report', 'associated-file')}, title);
    }
    else if (associatedFileId) {
      var title = immFileConfigs.getIn([associatedFileId, 'title']);
      var fileType = immFileConfigs.getIn([associatedFileId, 'fileType']);

      let icon;
      if (fileType === ExposureAppConstants.FILE_TYPE_REPORT) {
        icon = 'icon-report';
      } else if (fileType === ExposureAppConstants.FILE_TYPE_DASHBOARD) {
        icon = 'icon-dashboard';
      }

      return div({className: cx('icon-report', 'associated-file')}, title);
    } else {
      return div({className: 'associated-file'}, FrontendConstants.THERE_IS_NO_ASSOCIATED_REPORT_OR_DASHBOARD);
    }
  };

  getUpdatedImmMonitorFile = (immMonitorFile) => {
    var updates = {scaleFactors: this.props.scaleFactors};
    if (this.props.thresholds) {
      updates.thresholds = this.props.thresholds;
    }
    if (this.state.modificationNote) {
      updates.modificationNote = this.state.modificationNote;
    }
    return MonitorUtil.getUpdatedImmMonitorFile(immMonitorFile, updates);
  };

  getInvalidMetricErrorMsg = (referenceName) => {
    if (this.state.blurred.scaleFactors[referenceName]) {
      var scaleFactor = this.props.scaleFactors[referenceName];

      if (_.isEmpty(scaleFactor)) {
        return FrontendConstants.METRIC_CANNOT_BE_EMPTY;
      } else if (!Util.isNumberString(scaleFactor)) {
        return FrontendConstants.NUMERIC_VALUES_ONLY;
      }
    }
  };

  getInvalidThresholdErrorMsg = () => {
    if (this.state.blurred[MonitorConfigurationFieldConstants.THRESHOLD]) {
      return _.reduce(this.props.thresholds, (memo, threshold) => {
        if (!memo) {
          if (_.isEmpty(threshold)) {
            return FrontendConstants.THRESHOLD_CANNOT_BE_EMPTY;
          } else if (!Util.isNumberString(threshold)) {
            return FrontendConstants.NUMERIC_VALUES_ONLY;
          }
        }
      }, null);
    }
  };

  getInvalidModificationNoteErrorMsg = () => {
    return this.state.blurred[MonitorConfigurationFieldConstants.MODIFICATION_NOTE] && _.isEmpty(this.state.modificationNote) ? FrontendConstants.MODIFICATION_NOTE_IS_REQUIRED : null;
  };

  getMonitorMetrics = () => {
    var immMonitor = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file', 'monitor']);
    return immMonitor.get('metrics').map(function (immMetric) {
      var scaleFactor = immMetric.get('scaleFactor');
      var scaleFactorToShow = Util.limitDecimalPlaces(scaleFactor, ExposureAppConstants.MONITOR_NUMERIC_DECIMAL_PLACES_LIMIT);
      return div({key: immMetric.get('referenceName'), className: 'metric'},
        div({className: 'display-name'}, immMetric.get('displayName')),
        div({className: 'scale-factor'},
          scaleFactorToShow !== scaleFactor.toString() ?
            Tooltip(Util.getTooltipClasses(null, scaleFactor.toString(), 'top', null, 'numeric'), span(null, scaleFactorToShow)) :
            scaleFactorToShow
        )
      );
    }).toArray();
  };

  getMonitorEditableMetrics = () => {
    var immMonitor = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file', 'monitor']);
    return immMonitor.get('metrics').map(function (immMetric) {
      var referenceName = immMetric.get('referenceName');
      var invalidMetricErrorMsg = this.getInvalidMetricErrorMsg(referenceName);
      var loadedScaleFactor = this.state.immWorkingMonitorFile.getIn(['monitor', 'metrics']).find(immMetric => immMetric.get('referenceName') === referenceName).get('scaleFactor');
      var newScaleFactor = this.props.scaleFactors[referenceName];

      var isEditing = !_.isUndefined(newScaleFactor) && newScaleFactor !== loadedScaleFactor.toString();
      var scaleFactorToShow = isEditing ? newScaleFactor : loadedScaleFactor.toString();

      return div({key: immMetric.get('referenceName'), className: cx('metric', 'is-editing')},
        div({className: 'display-name'}, immMetric.get('displayName')),
        NumericInputBox({
          onBlur: this.handleMetricBlur.bind(null, referenceName, true),
          onChange: this.handleScaleFactorChange.bind(null, referenceName),
          onFocus: this.handleMetricBlur.bind(null, referenceName, false),
          handleSteps: this.changeScaleFactor.bind(null, referenceName, scaleFactorToShow),
          invalidInputErrorMsg: invalidMetricErrorMsg,
          isEditing: isEditing,
          isSteppable: true,
          name: 'scale-factor',
          originalValue: loadedScaleFactor,
          showOriginal: true,
          value: scaleFactorToShow
        })
      );
    }.bind(this)).toArray();
  };

  changeScaleFactor = (referenceName, originalScaleFactor, changeType) => {
    var scaleFactors = _.clone(this.props.scaleFactors);
    scaleFactors[referenceName] = Util.getNewNumericInputBoxValue(originalScaleFactor, changeType);
    this.props.updateConfigurationState({scaleFactors: scaleFactors});
  };

  changeThreshold = (originalThreshold, index, changeType) => {
    var thresholds = _.clone(this.props.thresholds);
    thresholds[index] = Util.getNewNumericInputBoxValue(originalThreshold, changeType);
    this.props.updateConfigurationState({thresholds: thresholds});
  };

  resetScaleFactors = () => {
    var immMonitorFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);

    var blurred = _.clone(this.state.blurred);
    _.extend(blurred, {
      scaleFactors: {},
      thresholds: false
    });
    this.setState({blurred: blurred});

    var thresholds = immMonitorFile.getIn(['monitor', 'thresholds']).map(threshold => threshold.get('scaleFactor', '').toString()).toJS();

    this.props.updateConfigurationState({
      scaleFactors: Util.getDefaultScaleFactors(immMonitorFile),
      thresholds: thresholds
    });
  };

  /**
   * Checks to see if we're ready to render the component
   * @returns {boolean}
   */
  isReady = () => {
    return !this.props.immExposureStore.get('embeddedReportList', Imm.Map()).isEmpty();
  };

  handleToggleEmbeddedReports() {
    let immWorkingMonitorFile = this.state.immWorkingMonitorFile;
    const useEmbeddedReports = immWorkingMonitorFile.getIn(['monitor', 'useEmbeddedReports'], false);

    // Toggle the value for the checkbox
    immWorkingMonitorFile = immWorkingMonitorFile.setIn(['monitor', 'useEmbeddedReports'], !useEmbeddedReports);

    // Remove associatedFileIds from the working monitor file
    immWorkingMonitorFile = immWorkingMonitorFile.set("associatedFileIds", null);

    this.setState({
      immWorkingMonitorFile: immWorkingMonitorFile
    });
  }

  /** Construct a List<Map<String, String>> where :
   *   {
   *     label: <reportName>,
   *     value: <reportUUID>
   *   }
   */
  formatEmbeddedReportOptions(embeddedReportList) {
    return Imm.List(embeddedReportList.get('reportMap')
      .map((report) => Imm.Map(
        {label: report.reportName, value: report.reportUUID}
      )));
  }

  render() {
    var isEditable = this.props.isEditable;
    var immMonitor = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file', 'monitor']);
    var invalidThresholdErrorMsg = this.getInvalidThresholdErrorMsg();
    var invalidModificationNoteErrorMsg = this.getInvalidModificationNoteErrorMsg();
    var monitorMetrics = isEditable ? this.getMonitorEditableMetrics() : this.getMonitorMetrics();

    // If we're not ready, render a content placeholder (if we're using v3, get the available reports for the user
    if (!this.isReady()) {
      return <ContentPlaceholder/>;
    }

    var monitorThresholds = null;
    if (isEditable) {
      var loadedThresholds = this.state.immWorkingMonitorFile.getIn(['monitor', 'thresholds']);
      var newThresholds = Imm.List(this.props.thresholds);

      monitorThresholds = loadedThresholds.zip(newThresholds).map((tuple, i) => {
        var loadedThreshold = tuple[0].get('scaleFactor');
        var newThreshold = tuple[1];

        var isEditingThreshold = !_.isUndefined(newThreshold) && newThreshold !== loadedThreshold.toString();
        var thresholdToShow = isEditingThreshold ? newThreshold : loadedThreshold.toString();

        return NumericInputBox({
          onBlur: this.handleBlur.bind(null, MonitorConfigurationFieldConstants.THRESHOLD, true),
          onChange: this.handleInputChange.bind(null, MonitorConfigurationFieldConstants.THRESHOLD, i),
          onFocus: this.handleBlur.bind(null, MonitorConfigurationFieldConstants.THRESHOLD, false),
          handleSteps: this.changeThreshold.bind(null, thresholdToShow, i),
          invalidInputErrorMsg: invalidThresholdErrorMsg,
          isEditing: isEditingThreshold,
          isSteppable: true,
          name: FrontendConstants.THRESHOLD,
          originalValue: loadedThreshold,
          showOriginal: true,
          value: thresholdToShow
        });
      });
    } else {
      var scaleFactors = immMonitor.get('thresholds').map(threshold => {
        return threshold.get('scaleFactor');
      });
      monitorThresholds = scaleFactors.map(scaleFactor => {
        var scaleFactorToShow = Util.limitDecimalPlaces(scaleFactor, ExposureAppConstants.MONITOR_NUMERIC_DECIMAL_PLACES_LIMIT);
        return div({className: 'scalar'},
          div({className: 'header'},
            FrontendConstants.SCALAR,
            Tooltip(Util.getTooltipClasses(FrontendConstants.THRESHOLD_SCALAR, FrontendConstants.ADJUST_THE_SENSITIVITY_OF_THE_THRESHOLD, 'left', 160), span({className: 'icon-question-circle'}))
          ),
          div({className: 'scale-factor'},
            scaleFactorToShow !== scaleFactor.toString() ?
              Tooltip(Util.getTooltipClasses(null, scaleFactor.toString(), 'top', null, 'numeric'), span(null, scaleFactorToShow)) :
              scaleFactorToShow
          )
        );
      });
    }

    var scoreFormula = this.state.scoreFormulaExpanded ?
      div({className: 'score-formula-content'},
        div({className: 'plan-description'},
          div({className: 'header'}, FrontendConstants.DESCRIPTION),
          div({className: 'description'}, immMonitor.getIn(['execPlan', 'planDescription']))
        ),
        div({className: 'plan-formula'},
          div({className: 'header'}, FrontendConstants.FORMULA),
          div({className: 'formula'}, immMonitor.getIn(['execPlan', 'planFormula']))
        )
      ) : null;

    var impactRange = isEditable ?
      div({className: 'impact-range'},
        div({className: 'header'}, FrontendConstants.IMPACT_RANGE),
        div({className: 'impact-range-dropdown'},
          // TODO: Expand these options - v2.2 will only have 1 option “Future only”.
          FrontendConstants.FUTURE_ONLY
        )
      ) : null;

    var modificationNote = isEditable ?
      div({className: 'modification-note'},
        span({className: 'header'}, FrontendConstants.MODIFICATION_NOTES),
        span(null, `(${FrontendConstants.REQUIRED})`),
        InputBlockContainer({
          class: 'modification-note-input-container',
          inputComponent: InputWithPlaceholder({
            type: 'textarea',
            className: cx('textarea', 'modification-note-input', {'invalid-input': !_.isEmpty(invalidModificationNoteErrorMsg)}),
            onBlur: this.handleBlur.bind(null, MonitorConfigurationFieldConstants.MODIFICATION_NOTE, true),
            onChange: this.handleInputChange.bind(null, MonitorConfigurationFieldConstants.MODIFICATION_NOTE),
            onFocus: this.handleBlur.bind(null, MonitorConfigurationFieldConstants.MODIFICATION_NOTE, false),
            rows: 4,
            value: this.state.modificationNote,
            placeholder: FrontendConstants.PLEASE_DESCRIBE_THE_EDITS_YOU_HAVE_MADE
          }),
          errorMsg: invalidModificationNoteErrorMsg
        })
      ) : null;

    var associatedFile = null;
    let embeddedReportToggle = null;

    if (isEditable) {
      const useEmbeddedReports = this.state.immWorkingMonitorFile.getIn(['monitor', "useEmbeddedReports"], false);
      let immLinkedReportDashboardData;

      if (!useEmbeddedReports) {
        immLinkedReportDashboardData = this.props.immExposureStore.get('fileConfigs').filter(immFileConfig => {
          var fileType = immFileConfig.get('fileType');
          var isAssociated = false;
          if (fileType === ExposureAppConstants.FILE_TYPE_REPORT) {
            isAssociated = Util.getComprehendSchemaIdFromFile(immFileConfig) === immMonitor.get('schemaId');
          } else if (fileType === ExposureAppConstants.FILE_TYPE_DASHBOARD) {
            isAssociated = immFileConfig.get('dashboardSchemaId') === immMonitor.get('schemaId');
          }
          return isAssociated;
        }).map((immFileConfig, fileId) => Imm.fromJS({
          label: immFileConfig.get('title'),
          value: fileId
        })).toList();
      }
      else {
        immLinkedReportDashboardData = this.state.immEmbeddedReportInfo;
      }

      if (!this.state.immEmbeddedReportInfo.isEmpty()) {
        embeddedReportToggle = div({className: 'embedded-reports-toggle'},
          div({className: 'header'}, FrontendConstants.USE_KPI_STUDIO_REPORTS),
          div({className: 'embedded-reports-toggle-button-wrapper'},
            ToggleButton({
              className: 'embedded-reports-toggle-button',
              isActive: useEmbeddedReports, // Check from the monitor configuration info if we are using V3 KPIs
              activeText: FrontendConstants.CHECKMARK,                                     // Display a checkmark if we're active
              onClick: this.handleToggleEmbeddedReports.bind(this)                         // On click update the state to let the component know to change the contents of the dropdown
            })
          )
        );
      }

      associatedFile = Combobox({
        className: 'linked-report-dashboard-dropdown',
        placeholder: FrontendConstants.SELECT_A_LINKED_REPORT_OR_DASHBOARD,
        value: this.state.immWorkingMonitorFile ? this.state.immWorkingMonitorFile.getIn(['associatedFileIds', 0]) : null,
        onChange: this.handleInputChange.bind(null, MonitorConfigurationFieldConstants.LINKED_REPORT_DASHBOARD),
        options: immLinkedReportDashboardData.sortBy((reportData) => reportData.get('label'))
      });
    } else {
      associatedFile = this.getAssociatedFile();
    }

    var editButtons = isEditable ?
      div({className: 'edit-buttons'},
        Button({
          children: FrontendConstants.UPDATE,
          isPrimary: true,
          onClick: this.handleUpdate
        }),
        Button({
          children: FrontendConstants.CANCEL,
          isSecondary: true,
          onClick: this.handleCancel
        })) : null;

    var thresholdScalars = monitorThresholds.map((monitorThreshold, i) => {
        return div({className: 'threshold-scalar'},
          div({className: cx('threshold', {'is-editing': isEditable})},
            div({className: 'header'},
              isEditable ?
                div(null,
                  FrontendConstants.THRESHOLD_SCALAR,
                  Tooltip(Util.getTooltipClasses(FrontendConstants.METRIC_WEIGHTS, FrontendConstants.METRIC_WEIGHTS_TOOLTIP_MESSAGE, 'top', 160), span({className: 'icon-question-circle'}))
                ) : FrontendConstants.THRESHOLD),
            div({className: 'display-string'}, immMonitor.getIn(['thresholds', i, 'displayName']))
          ),
          monitorThreshold
        );
      }
    ).toJS();

    // TODO: The viz temporarily displays all breaches & non-breaches and toggles off only show data breaches in the Filters pane (if that’s the setting).
    return div({className: 'monitor-configuration'},
      div({className: 'metrics'},
        div({className: 'header-container'},
          isEditable ?
            div(null,
              div({className: 'main-header'}, FrontendConstants.METRIC_WEIGHTS),
              Tooltip(Util.getTooltipClasses(FrontendConstants.METRIC_WEIGHTS, FrontendConstants.METRIC_WEIGHTS_TOOLTIP_MESSAGE, 'bottom', 160), span({className: 'icon-question-circle'})),
              span({className: 'reset-all-button', onClick: this.resetScaleFactors}, FrontendConstants.RESET_ALL)) :
            div(null,
              div({className: 'main-header'}, FrontendConstants.METRICS),
              div({className: 'weights-header'},
                FrontendConstants.WEIGHTS,
                Tooltip(Util.getTooltipClasses(FrontendConstants.METRIC_WEIGHTS, FrontendConstants.METRIC_WEIGHTS_TOOLTIP_MESSAGE, 'left', 160), span({className: 'icon-question-circle'}))))
        ),
        monitorMetrics
      ),
      thresholdScalars,
      div({className: 'threshold-type'},
        div({className: 'header'}, FrontendConstants.THRESHOLD_TYPE),
        div({className: 'type'}, ExposureAppConstants.MONITOR_THRESHOLD_TYPE_DESCRIPTION[immMonitor.get('thresholdType')])
      ),
      div({className: 'score-formula'},
        div({className: 'header'}, FrontendConstants.SCORE_FORMULA),
        div({
          className: 'expand-collapse-button', onClick: () => {
            this.setState({scoreFormulaExpanded: !this.state.scoreFormulaExpanded});
          }
        }, span({className: this.state.scoreFormulaExpanded ? 'icon-DownArrow' : 'icon-arrow-right'})),
        scoreFormula
      ),
      impactRange,
      embeddedReportToggle,
      div({className: 'associated-file-item'}, div({className: cx('header', 'linked-report-dashboard')}, FrontendConstants.LINKED_REPORT_DASHBOARD), associatedFile),
      modificationNote,
      editButtons
    );
  }
}

module.exports = MonitorConfiguration;
