require('codemirror/lib/codemirror.css');
// These imports are used to modify CodeMirror global var.
require('codemirror/mode/javascript/javascript');

var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var CodeMirrorEditor = React.createFactory(require('../CodeMirrorEditor'));
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ImmMonitorStudioHelpText = require('./ImmMonitorStudioHelpText');
var Button = React.createFactory(require('../Button'));
var Combobox = React.createFactory(require('../Combobox'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var ModalDialogContent = require('../ModalDialogContent');
var Spinner = React.createFactory(require('../Spinner'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ModalConstants = require('../../constants/ModalConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var AppRequest = require('../../http/AppRequest');
var ImmEmptyFile = require('../../util/ImmEmptyFile');
var Util = require('../../util/util');

var div = DOM.div;

var VALIDATION_TYPE = {
  SAVE: 'SAVE',
  GEN_DATA_FRAME: 'GEN_DATA_FRAME',
  RUN_EXEC_PLAN: 'RUN_EXEC_PLAN'
};

class DesktopMonitorStudio extends React.Component {
  static displayName = 'DesktopMonitorStudio';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    var immEmptyMonitor = Imm.fromJS({
      monitorState: ExposureAppConstants.MONITOR_STATE.RECORDING.value,
      sendEmailNotification: false,
      execPlan: {
        planDescription: null,
        planFormula: null,
        apiVersion: this.API_VERSION,
        function: ImmMonitorStudioHelpText.getIn([this.API_VERSION.toString(), 'sampleFunction'])
      },
      window: 5,
      extraLabel: 'Mean',
      thresholds: [{
        displayName: 'Low',
        scaleFactor: 1.0
      }, {
        displayName: 'Medium',
        scaleFactor: 2.0
      }, {
        displayName: 'High',
        scaleFactor: 3.0
      }],
      thresholdType: 'UPPER_BAND',
      metrics: [{
        referenceName: null,
        displayName: null,
        query: null,
        scaleFactor: 1.0
      }],
      whatDescription: {
        table: null,
        displayColumns: [],
        whatFilter: null
      },
      taskConfig: {
        taskAssignees: []
      }
    });

    var immEmptyFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_MONITOR).set('monitor', immEmptyMonitor);
    var immInitialFile = props.immExposureStore.getIn(['files', props.params.fileId, 'fileWrapper', 'file'], immEmptyFile)
      .setIn(['monitor', 'modificationNote'], null);

    this.state = {
      immCurrentFile: immInitialFile,
      immSavedFile: immInitialFile,
      isValidating: false,
      openExecPlanHelpText: false,
      immErrors: Imm.Map()
    };
  }

  // Needs to be incremented when the api version change.
  //
  // Changelog
  // 1 -> 2:
  // - TP #14722:
  //   - MonitorResult.extra: execPlan may now return an 'extra' field in the return value
  //   - Monitor.extraLabel: an optional label field for the extra series
  // - TP #14676:
  //   - Monitor.window: an field for windowing support
  // - TP #14609: multiple thresholds support
  //   - Monitor.threshold.thresholdType -> Monitor.thresholdType
  //   - Monitor.threshold -> Monitor.thresholds
  //   - MonitorResult.commonThreshold is now a repeated field
  //   - execPlan context: thresholdScaleFactor -> thresholdScaleFactors
  API_VERSION = 2;

  componentDidMount() {
    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }

    if (this.props.params.fileId && !this.state.immCurrentFile.has('id')) {
      ExposureActions.fetchFile(this.props.params.fileId);
    } else {
      this.initCodeMirror();
    }
    console.log('\nWelcome to the Data Monitor Studio!\n' +
      'If you want to test out your execPlan in the console first fill out the `Comprehend Schema` and `Monitor Configuration` inputs, then click `Generate Frame`.\n' +
      'Then copy your execPlan function into the console and run it with no arguments.');
  }

  componentWillUnmount() {
    this.unsetWindowVariables();
  }

  componentWillReceiveProps(nextProps) {
    var immCurrentFile = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immNextFile = nextProps.immExposureStore.getIn(['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    if (!immNextFile.equals(immCurrentFile)) {
      // Empty out modification note.
      immNextFile = immNextFile.setIn(['monitor', 'modificationNote'], null);
      this.setState({
        immCurrentFile: immNextFile,
        immSavedFile: immNextFile
      }, this.initCodeMirror);
    }
  }

  /****************************************** Begin ExecPlan Variable section ******************************************/

  // Return the variable names so that we know what to delete from the global window object.
  getExecPlanVariableNames = () => {
    return ['dataFrames', 'metricScaleFactors', 'thresholdScaleFactors'];
  };

  getExecPlanVariables = () => {
    var args = {};
    let currentMonitor = this.getFileJSON().monitor;
    let dataFrames = this.getDataFrameJSON()
    args.dataFrames = _.isArray(dataFrames) ? dataFrames : [dataFrames];
    args.metricScaleFactors = _.reduce(currentMonitor.metrics, (memo, metric) => {
      memo[metric.referenceName] = metric.scaleFactor;
      return memo;
    }, {});
    let apiVersion = this.state.immSavedFile.getIn(['monitor', 'execPlan', 'apiVersion']);
    if (apiVersion >= 2)
      args.thresholdScaleFactors = _.map(currentMonitor.thresholds, threshold => threshold.scaleFactor);
    else
      args.thresholdScaleFactor = _.first(currentMonitor.thresholds).scaleFactor;
    return args;
  };

  // This function is called to set variables on the global `window` object.
  // This is normally not recommended, but we want the user to be able to
  // massage their execPlans in the console. So saving them to `window` brings them
  // in scope for when they copy their execPlan and try to run it in the console.
  setWindowVariables = () => {
    _.extend(window, this.getExecPlanVariables());
    // Log to the console so that the user knows that things are in scope.
    console.log('\nThe variables used in the execPlan function have been imported into global scope (window).\n' +
      'You should be able to run the execPlan in the console by copying and pasting it here.\n' +
      'The specific variables are  shown below and listed in the `Monitor Execution Plan Help Details` in the `Input` section.\n' +
      'You can update these variables by clicking `Generate Frame`.');
    // Display the variables formatted nicely.
    // Note: may only work in chrome and safari, but this is a page we realistically only expect users on chrome or safari.
    console.log.apply(console, ['\n' + _.map(this.getExecPlanVariableNames(), name => name + ' %O').join('\n')].concat(_.map(this.getExecPlanVariableNames(), name => window[name])));
  };

  unsetWindowVariables = () => {
    _.each(this.getExecPlanVariableNames(), variable => delete(window[variable]));
  };

  /******************************************* End ExecPlan Variable section *******************************************/

  // It'll call the successCallBack if immFile is valid.
  checkMonitorConfig = (immFile, validationType, successCallBack) => {
    if (!immFile) { return; }
    if (validationType === VALIDATION_TYPE.RUN_EXEC_PLAN && !this.getDataFrameJSON()) {
      return;
    }
    var immMonitorConfigErrors = Imm.List();
    var schemaId = immFile.getIn(['monitor', 'schemaId']);
    var isInEditMode = !!this.props.params.fileId;
    var immSavedFile = this.state.immSavedFile;
    var isRun = immSavedFile.getIn(['monitor', 'isRun']);
    var isInactive = immFile.getIn(['monitor', 'monitorState']) === ExposureAppConstants.MONITOR_STATE_INACTIVE;
    // We only validate monitor definition if the monitor is 'ACTIVE' or 'RECORDING' or has been run.
    var skipMonitorDefinitionValidation = !isRun && isInactive;
    // Modification note isn't required to generate frame or run exec plan.
    // It is required when edit an existing monitor.
    var invalidModificationNote = validationType === VALIDATION_TYPE.SAVE && isInEditMode && Util.isWhiteSpaceOnly(immFile.getIn(['monitor', 'modificationNote']));
    var invalidFile = validationType === VALIDATION_TYPE.SAVE && Util.isWhiteSpaceOnly(immFile.get('title'));

    // We only validate monitor definition if the monitor is 'ACTIVE' or 'RECORDING' or has been run.
    if (skipMonitorDefinitionValidation && !invalidModificationNote && !invalidFile && validationType === VALIDATION_TYPE.SAVE) {
      this.setState({
        immErrors: Imm.Map()
      }, successCallBack.bind(null, immFile));
      return;
    }

    if (invalidFile) {
      immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_NAME_IS_REQUIRED);
    }

    let thresholdsValid = immFile.getIn(['monitor', 'thresholds']).every(threshold => _.isNumber(threshold.get('scaleFactor')));

    if (validationType !== VALIDATION_TYPE.GEN_DATA_FRAME && !thresholdsValid) {
      immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_THRESHOLD_SCALE_FACTOR_MUST_BE_NUMERIC);
    }

    if (Util.isWhiteSpaceOnly(immFile.getIn(['monitor', 'whatDescription', 'table']))) {
      immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_TABLE_IS_REQUIRED);
    }

    if (isRun && immFile.getIn(['monitor', 'whatDescription', 'table']) !== immSavedFile.getIn(['monitor', 'whatDescription', 'table'])) {
      immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_HAS_BEEN_RUN_CANNOT_MODIFY_TABLE_REFERENCE);
    }

    var immMetrics = immFile.getIn(['monitor', 'metrics']) || Imm.List();

    if (immMetrics.isEmpty()) {
      immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_METRIC_IS_REQUIRED);
    } else {
      // Check if the metrics have not been modified on a run monitor.
      if (validationType === VALIDATION_TYPE.SAVE && isRun) {
        var immSavedMetrics = this.state.immSavedFile.getIn(['monitor', 'metrics']);
        var changedSize = immMetrics.size !== immSavedMetrics.size;
        var unchangedMetricDef = immSavedMetrics.every(function(immSavedMetric, idx) {
          var immMetric = immMetrics.get(idx);
          return immSavedMetric.get('referenceName') === immMetric.get('referenceName') &&
            immSavedMetric.get('query') === immMetric.get('query');
          });
        if (changedSize || !unchangedMetricDef) {
          immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_HAS_BEEN_RUN_CANNOT_MODIFY_METRIC_DEFINITION);
        }
      }

      var immMetricQueries = immMetrics.map(Util.immPluck('query'));
      var hasEmptyMetricQuery = immMetricQueries.some(Util.isWhiteSpaceOnly);
      if (hasEmptyMetricQuery) {
        immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_METRIC_QUERY_IS_REQUIRED);
      }

      var immMetricReferenceNames = immMetrics.map(Util.immPluck('referenceName'));
      var hasEmptyMetricReferenceName = immMetricReferenceNames.some(Util.isWhiteSpaceOnly);

      if (immMetricReferenceNames.isEmpty() || hasEmptyMetricReferenceName) {
        immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_METRIC_REFERENCE_NAME_IS_REQUIRED);
      }

      if (immMetricReferenceNames.size !== _.size(_.unique(immMetricReferenceNames.toJS()))) {
        immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_METRIC_REFERENCE_NAME_MUST_BE_UNIQUE);
      }

      var isMetricScaleFactorsValid = immMetrics.every(function(immMetric) {
        return _.isNumber(immMetric.get('scaleFactor'));
      });

      if (validationType !== VALIDATION_TYPE.GEN_DATA_FRAME && !isMetricScaleFactorsValid) {
        immMonitorConfigErrors = immMonitorConfigErrors.push(FrontendConstants.MONITOR_METRIC_SCALE_FACTORS_MUST_BE_NUMERIC);
      }
    }

    var immNewErrors = Imm.fromJS({
      schema: !immFile.getIn(['monitor', 'schemaId']) ? FrontendConstants.SCHEMA_IS_REQUIRED : null,
      monitorConfig: immMonitorConfigErrors.isEmpty() ? null : immMonitorConfigErrors,
      execPlanFunction: validationType !== VALIDATION_TYPE.GEN_DATA_FRAME && Util.isWhiteSpaceOnly(immFile.getIn(['monitor', 'execPlan', 'function'])) ?
        FrontendConstants.MONITOR_EXEC_PLAN_IS_REQUIRED :
        null,
      modificationNote: invalidModificationNote ? FrontendConstants.MODIFICATION_NOTE_IS_REQUIRED : null
    });

    // If all immNewErrors values are falsy, it's a frontend-valid monitor and is ready for backend validation.
    var isValidMonitor = !immNewErrors.some(_.identity);
    var newState = {
      immCurrentFile: immFile,
      immErrors: immNewErrors
    };

    if (isValidMonitor) {
      newState.isValidating = true;

      // We need to reach out to the back-end to validate table reference.
      var url = '/api/comprehend-schema-overview/' + schemaId;
      AppRequest({type: 'GET', url: url}).then(
        function(data) {
          // Returned data is a list of `DatasourceDescriptor`.
          var foundTableIndex = _.chain(data)
            .pluck('nodeDescriptors')
            .flatten()
            .pluck('shortName')
            .indexOf(immFile.getIn(['monitor', 'whatDescription', 'table']))
            .value();

          // If table reference is valid, we need to reach out to the back-end to validate metric queries.
          if (foundTableIndex !== -1) {
            AppRequest({type: 'POST', url: '/api/cql-queries/' + schemaId + '/parse', data: JSON.stringify(immMetricQueries)}).then(
              function() {
                this.setState({
                  immErrors: Imm.Map(),
                  isValidating: false
                }, successCallBack.bind(null, immFile));
              }.bind(this),
              function() {
                this.setState({
                  immErrors: this.state.immErrors.set('monitorConfig', Imm.List([FrontendConstants.MONITOR_METRIC_QUERY_IS_INVALID])),
                  isValidating: false
                });
                ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
              }.bind(this)
            );
          } else {
            this.setState({
              immErrors: this.state.immErrors.set('monitorConfig', Imm.List([FrontendConstants.MONITOR_TABLE_IS_NOT_IN_SELECTED_SCHEMA])),
              isValidating: false
            });
            ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
          }
        }.bind(this),
        function() {
          this.setState({
            immErrors: this.state.immErrors.set('monitorConfig', Imm.List([FrontendConstants.INVALID_SCHEMA])),
            isValidating: false
          });
        }.bind(this)
      );
    } else {
      ExposureActions.createStatusMessage(FrontendConstants.PLEASE_CORRECT_ALL_ERRORS_ON_THE_PAGE_TO_PROCEED, StatusMessageTypeConstants.TOAST_ERROR);
    }
    this.setState(newState, this.initCodeMirror);
  };

  exec = () => {
    // Similar to `data_monitor_runner.js`.
    let execPlanArguments = this.getExecPlanVariables();
    // Bring the arguments into scope.
    let dataFrames = execPlanArguments.dataFrames;
    let metricScaleFactors =  execPlanArguments.metricScaleFactors;
    let thresholdScaleFactors = execPlanArguments.thresholdScaleFactors;
    // For version 1 monitors.
    let thresholdScaleFactor = execPlanArguments.thresholdScaleFactor;
    var execPlanFunc = eval('('+this.getExecPlanFunction()+')');  // Now it's a function.
    var monitorResult = execPlanFunc();
    this.updateCodeMirror('codeMirrorMonitorResult', true, monitorResult);
  };

  extractImmFileToSave = () => {
    var newFile = this.getFileJSON();
    if (!newFile) { return null; }
    var execPlanFunction = this.getExecPlanFunction();
    // Filter out unrecognized fields.
    var immEditableMonitorConfig = this.getImmMonitorConfig(Imm.fromJS(newFile));
    // Look into unmodified file to check if this monitor has generated at least one data frame.
    var isRun = this.state.immSavedFile.getIn(['monitor', 'isRun']);

    // Merge editable fields back into current file to produce a new file.
    // TODO: Fix this ugly block of code when mergeDeepWith supports keyPath.
    return this.state.immCurrentFile.withMutations(function(mutCurrentFile) {
      mutCurrentFile
        .set('title', immEditableMonitorConfig.get('title'))
        .set('description', immEditableMonitorConfig.get('description'))
        .setIn(['monitor', 'window'], immEditableMonitorConfig.getIn(['monitor', 'window']))
        .setIn(['monitor', 'sendEmailNotification'], immEditableMonitorConfig.getIn(['monitor', 'sendEmailNotification']))
        .setIn(['monitor', 'extraLabel'], immEditableMonitorConfig.getIn(['monitor', 'extraLabel']))
        .setIn(['monitor', 'execPlan', 'function'], execPlanFunction)
        .setIn(['monitor', 'execPlan', 'planDescription'], immEditableMonitorConfig.getIn(['monitor', 'execPlan', 'planDescription']))
        .setIn(['monitor', 'execPlan', 'planFormula'], immEditableMonitorConfig.getIn(['monitor', 'execPlan', 'planFormula']))
        .setIn(['monitor', 'thresholds'], immEditableMonitorConfig.getIn(['monitor', 'thresholds']))
        .setIn(['monitor', 'whatDescription', 'displayColumns'], immEditableMonitorConfig.getIn(['monitor', 'whatDescription', 'displayColumns']));

      if (!isRun) {
        mutCurrentFile.setIn(['monitor', 'whatDescription', 'table'], immEditableMonitorConfig.getIn(['monitor', 'whatDescription', 'table']));
        mutCurrentFile.setIn(['monitor', 'whatDescription', 'whatFilter'], immEditableMonitorConfig.getIn(['monitor', 'whatDescription', 'whatFilter']));
        mutCurrentFile.setIn(['monitor', 'metrics'], immEditableMonitorConfig.getIn(['monitor', 'metrics']));
      } else {
        // Ensure there are no added or deleted metric definitions or updates to existing metric query, and reference name
        // when the monitor has been run.
        mutCurrentFile.getIn(['monitor', 'metrics']).forEach(function(immMetric, idx) {
          var displayNameKey = ['monitor', 'metrics', idx, 'displayName'];
          var scaleFactorKey = ['monitor', 'metrics', idx, 'scaleFactor'];
          mutCurrentFile
            .setIn(displayNameKey, immEditableMonitorConfig.getIn(displayNameKey))
            .setIn(scaleFactorKey, immEditableMonitorConfig.getIn(scaleFactorKey))
        });
      }
    });
  };

  finalizeSave = (fileId) => {
    var immSavedFile = this.state.immCurrentFile.set('id', fileId.id);
    this.setState({
      immCurrentFile: immSavedFile,
      immSavedFile: immSavedFile
    });
    this.context.router.push({name: RouteNameConstants.EXPOSURE_MONITORS_SHOW, params: {fileId: fileId.id}});
  };

  formatGeneratedDataFrame = (generatedFrame) => {
    // JSON.stringify(generatedFrame, null, 2) will format a 2d array with each element to be on a single line.
    // Regex to format data's 2d array to have each row to be on a single line with 2 spaces indentation.
    var pretty2DArray = JSON.stringify(generatedFrame.data)
      .replace(/^\[/, '[\n    ')
      .replace(/]$/, '\n  ]')
      .replace(/,/g, ', ')
      .replace(/\],/g, '],\n   ');

    delete generatedFrame.data;
    // We hide `dataFrameId`, `runId`, `createdAt` from the user.
    delete generatedFrame.dataFrameId;
    delete generatedFrame.runId;
    delete generatedFrame.createdAt;
    // Format data frames without data.
    var jsonText = JSON.stringify(generatedFrame, null, 2);
    // Put data back into the formatted JSON text.
    return jsonText.replace(/}\n}$/, '},\n  "data": ' + pretty2DArray + '\n}');
  };

  getDataFrameJSON = () => {
    var text = this.refs['codeMirrorDataFrame'].editor.getValue();
    try {
      if (text) {
        return JSON.parse(text);
      } else {
        this.setState({immErrors: this.state.immErrors.set('execPlanFunction', FrontendConstants.MONITOR_DATA_FRAME_IS_REQUIRED)});
      }
    } catch(e) {
      this.setState({immErrors: this.state.immErrors.set('execPlanFunction', FrontendConstants.INVALID_DATA_FRAME_JSON)});
    }
  };

  getExecPlanFunction = () => {
    return this.refs['codeMirrorExecPlanFunction'].editor.getValue();
  };

  getFileJSON = () => {
    var text = this.refs['codeMirrorConfig'].editor.getValue();
    try {
      return JSON.parse(text);
    } catch(e) {
      this.setState({immErrors: this.state.immErrors.update('monitorConfig', Imm.List(), immMonitorConfigErrors => immMonitorConfigErrors.push(FrontendConstants.INVALID_MONITOR_CONFIGURATION_JSON))});
    }
  };

  generateFrame = (immNewFile) => {
    var generateFrameUrl = '/api/monitors/frame';
    AppRequest({type: 'POST', url: generateFrameUrl, data: JSON.stringify(immNewFile.get('monitor'))}).then(
      function(generatedFrame) {
        var formattedFrame = this.formatGeneratedDataFrame(generatedFrame);
        this.updateCodeMirror('codeMirrorDataFrame', false, formattedFrame);
        // Update the window variables when the frame is returned.
        this.setWindowVariables();
      }.bind(this),
      function() {
        console.log('%cERROR: GET ' + generateFrameUrl + ' failed', 'color: #E05353');
        ExposureActions.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.TOAST_ERROR);
      }.bind(this)
    );
  };

  getImmMonitorConfig = (immFile) => {
    return Imm.fromJS({
      title: immFile.get('title'),
      description: immFile.get('description'),
      monitor: {
        window: immFile.getIn(['monitor', 'window']),
        sendEmailNotification: immFile.getIn(['monitor', 'sendEmailNotification']),
        extraLabel: immFile.getIn(['monitor', 'extraLabel']),
        execPlan: {
          planFormula: immFile.getIn(['monitor', 'execPlan', 'planFormula']),
          planDescription: immFile.getIn(['monitor', 'execPlan', 'planDescription'])
        },
        thresholds: immFile.getIn(['monitor', 'thresholds']),
        whatDescription: {
          table: immFile.getIn(['monitor', 'whatDescription', 'table']),
          displayColumns: immFile.getIn(['monitor', 'whatDescription', 'displayColumns'], []),
          whatFilter: immFile.getIn(['monitor', 'whatDescription', 'whatFilter'])
        },
        metrics: immFile.getIn(['monitor', 'metrics'])
      }
    });
  };

  handleModificationNote = (e) => {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['monitor', 'modificationNote'], e.target.value)});
  };

  handleMonitorState = (monitorState) => {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['monitor', 'monitorState'], monitorState),
      immErrors: this.state.immErrors.merge({monitorState: null})});
  };

  handleMonitorThresholdType = (thresholdType) => {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['monitor', 'thresholdType'], thresholdType),
      immErrors: this.state.immErrors.merge({thresholdType: null})});
  };

  handleOpenExecPlanHelpText = () => {
    this.setState({openExecPlanHelpText: !this.state.openExecPlanHelpText}, function() {
      let apiVersion = this.state.immSavedFile.getIn(['monitor', 'execPlan', 'apiVersion']);
      // Note: Immutable Maps only accept string keys, see https://github.com/facebook/immutable-js/issues/443.
      if (this.state.openExecPlanHelpText && apiVersion && ImmMonitorStudioHelpText.has(apiVersion.toString())) {
        this.updateCodeMirror('codeMirrorHelpText', false, ImmMonitorStudioHelpText.getIn([apiVersion.toString(), 'helpText']));
      }
    }.bind(this));
  };

  handleSchema = (schemaId) => {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['monitor', 'schemaId'], schemaId),
      immErrors: this.state.immErrors.merge({schema: null})});
  };

  initCodeMirror = () => {
    // Render file text box without execPlan.
    var immFileWithoutExecPlan = this.state.immCurrentFile.deleteIn(['monitor', 'execPlan', 'function']);
    this.updateCodeMirror('codeMirrorConfig', true, this.getImmMonitorConfig(immFileWithoutExecPlan).toJS());

    // Render execPlan separately.
    this.updateCodeMirror('codeMirrorExecPlanFunction', false, this.state.immCurrentFile.getIn(['monitor', 'execPlan', 'function']));
  };

  isDirty = () => {
    return !this.props.immExposureStore.get('isLoadingFile') && !Imm.is(this.state.immSavedFile, this.state.immCurrentFile);
  };

  validateAndExec = () => {
    var immNewFile = this.extractImmFileToSave();
    this.checkMonitorConfig(immNewFile, VALIDATION_TYPE.RUN_EXEC_PLAN, this.exec);
  };

  validateAndGenFrame = () => {
    var immNewFile = this.extractImmFileToSave();
    this.checkMonitorConfig(immNewFile, VALIDATION_TYPE.GEN_DATA_FRAME, this.generateFrame);
  };

  validateAndSave = () => {
    var immNewFile = this.extractImmFileToSave();
    this.checkMonitorConfig(immNewFile, VALIDATION_TYPE.SAVE, this.save);
  };

  save = (immNewFile) => {
    if (this.props.params.fileId) {  // We're in edit mode.
      if (immNewFile.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewFile = immNewFile.delete('folderId');
      }
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId, immNewFile, this.finalizeSave);
    } else {
      ExposureActions.reportCreationViewCreateReport(immNewFile, this.finalizeSave);
    }
  };

  updateCodeMirror = (refName, isJSON, value) => {
    value = value || '';
    var cm = this.refs[refName].editor;
    // CodeMirror doesn't respect css settings so we have to set its size.
    cm.setSize('100%', '100%');
    cm.getDoc().setValue(isJSON ? JSON.stringify(value, null, 2) : value);
  };

  render() {
    if (this.props.immExposureStore.get('isLoadingFile')) { return Spinner(); }

    var immCurrentFile = this.state.immCurrentFile;
    var immComprehendSchemas = this.props.immExposureStore.get('comprehendSchemas');
    var selectedComprehendSchema = immCurrentFile.getIn(['monitor', 'schemaId']);
    var inEditMode = !_.isEmpty(this.props.params.fileId);
    var isRun = this.state.immSavedFile.getIn(['monitor', 'isRun']);
    var schemaErrorMsg = this.state.immErrors.get('schema', null);
    var monitorConfigErrorMsg = (this.state.immErrors.get('monitorConfig') || Imm.List()).map(function(error, idx) {
      return div({key: 'monitor-config-error-' + idx, className: cx('text-input-error-explanation', 'monitor-config-error')}, error);
    });
    var execPlanFunctionError = this.state.immErrors.get('execPlanFunction');
    var modificationNoteError = this.state.immErrors.get('modificationNote');

    const immMonitorStates = Imm.fromJS(_.values(ExposureAppConstants.MONITOR_STATE));
    const immMonitorThresholdTypes = Imm.fromJS(_.values(ExposureAppConstants.MONITOR_THRESHOLD_TYPE));

    return div(null,
      div({className: 'page-header'},
        div({className: 'title'}, inEditMode ? FrontendConstants.EDIT_MONITOR : FrontendConstants.CREATE_MONITOR)),
        InputBlockContainer({
          title: FrontendConstants.COMPREHEND_SCHEMA,
          titleClass: cx('entry-text', 'required'),
          errorMsg: schemaErrorMsg,
          inputComponent: Combobox({
            key: 'schema-dropdown',
            disabled: isRun,
            placeholder: FrontendConstants.PLEASE_SELECT_A_SCHEMA_TO_PROCEED,
            className: cx('schema-dropdown', {'invalid-input': schemaErrorMsg}),
            options: immComprehendSchemas ? immComprehendSchemas.toList() : Imm.List(),
            valueKey: 'id',
            labelKey: 'name',
            value: immComprehendSchemas ? immComprehendSchemas.find(immComprehendSchema => immComprehendSchema.get('id') === selectedComprehendSchema) : null,
            onChange: this.handleSchema
          })}),
        InputBlockContainer({
          title: FrontendConstants.MONITOR_STATE,
          titleClass: cx('entry-text', 'required'),
          inputComponent: Combobox({
            key: 'monitor-state-dropdown',
            className: 'monitor-state-dropdown',
            options: immMonitorStates,
            labelKey: 'text',
            value: immMonitorStates.find(immMonitorState => immMonitorState.get('value') === immCurrentFile.getIn(['monitor', 'monitorState'])),
            onChange: this.handleMonitorState
          })}),
        InputBlockContainer({
          title: FrontendConstants.MONITOR_THRESHOLD_TYPE,
          titleClass: cx('entry-text', 'required'),
          inputComponent: Combobox({
            // TODO: This dropdown overlaps with the CodeMirror below, appearing partially underneath it.
            key: 'monitor-threshold-type-dropdown',
            className: 'threshold-type-dropdown',
            disabled: isRun,
            options: immMonitorThresholdTypes,
            labelKey: 'text',
            value: immMonitorThresholdTypes.find(immMonitorThresholdType => immMonitorThresholdType.get('value') === immCurrentFile.getIn(['monitor', 'thresholdType'])),
            onChange: this.handleMonitorThresholdType
          })}),
        div({className: cx('entry-text', 'required')}, FrontendConstants.MONITOR_CONFIGURATION),
        CodeMirrorEditor({
          className: cx('code-mirror-wrapper', 'monitor-configuration'),
          ref: 'codeMirrorConfig',
          readOnly: this.state.isValidating,
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true
        }),
        monitorConfigErrorMsg,
        Button({classes: {'btn-generate': true}, children: FrontendConstants.GENERATE_FRAME, isPrimary: true, isLoading: this.state.isValidating, onClick: this.validateAndGenFrame}),
        div({className: 'entry-text'}, FrontendConstants.DATA_FRAME),
        CodeMirrorEditor({
          className: cx('code-mirror-wrapper', 'data-frame-editor'),
          ref: 'codeMirrorDataFrame',
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true
        }),
        div({className: 'exec-plan-help-text-opener', onClick: this.handleOpenExecPlanHelpText},
          ItemOpener({isOpen: this.state.openExecPlanHelpText, onClick: this.handleOpenExecPlanHelpText}),
          div({className: 'exec-plan-help-text-title'}, FrontendConstants.MONITOR_EXEC_PLAN_HELP_DETAILS)),
        this.state.openExecPlanHelpText ? CodeMirrorEditor({
          className: cx('code-mirror-wrapper', 'code-mirror-help-text'),
          ref: 'codeMirrorHelpText',
          // 'nocursor' is given (instead of simply true), focusing of the editor is also disallowed.
          readOnly: 'nocursor',
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true
        }): null,
        div({className: cx('entry-text', 'required')}, FrontendConstants.MONITOR_EXEC_PLAN),
        CodeMirrorEditor({
          className: cx('code-mirror-wrapper', 'exec-plan'),
          ref: 'codeMirrorExecPlanFunction',
          readOnly: this.state.isValidating,
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true
        }),
        execPlanFunctionError ? div({className: cx('text-input-error-explanation', 'execPlan-function-errors')}, execPlanFunctionError) : null,
        Button({classes: {'btn-run-execPlan': true}, children: FrontendConstants.RUN, isPrimary: true, isLoading: this.state.isValidating, onClick: this.validateAndExec}),
        div({className: 'entry-text'}, FrontendConstants.MONITOR_RESULT),
        CodeMirrorEditor({
          className: cx('code-mirror-wrapper', 'monitor-result'),
          ref: 'codeMirrorMonitorResult',
          readOnly: true,
          lineNumbers: true,
          mode: 'javascript',
          smartIndent: true
        }),
        inEditMode ? InputBlockContainer({
          titleClass: cx('entry-text', 'required'),
          title: FrontendConstants.MODIFICATION_NOTE,
          errorMsg: modificationNoteError,
          inputComponent: InputWithPlaceholder({
            type: 'textarea',
            className: cx('text-input', 'modification-note', {'invalid-input': !!modificationNoteError}),
            placeholder: FrontendConstants.MODIFICATION_NOTE_PLACEHOLDER,
            rows: 5,
            onBlur: this.handleModificationNote})}) : null,
        Button({classes: {'bottom-btn': true}, icon: cx('icon-loop2', 'btn-save'), children: FrontendConstants.SAVE, isPrimary: true, isLoading: this.state.isValidating, onClick: this.validateAndSave}));
  }
}

module.exports = DesktopMonitorStudio;
