var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
var Moment = require('moment');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
var DataMonitorViz = React.createFactory(require('./DataMonitorViz'));
var MobileMonitorView = React.createFactory(require('./MobileMonitorView'));
var MonitorConfiguration = React.createFactory(require('./MonitorConfiguration'));
var MonitorFilters = React.createFactory(require('./MonitorFilters'));
var MonitorOverview = React.createFactory(require('./MonitorOverview'));
var MonitorTasks = React.createFactory(require('./MonitorTasks'));
var Highchart = React.createFactory(require('../Highchart'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ModalDialogContent = require('../ModalDialogContent');
var SimpleAction = React.createFactory(require('../SimpleAction'));
var Spinner = React.createFactory(require('../Spinner'));
var Tabs = React.createFactory(require('../Tabs'));
var TimingMixin = require('../TimingMixin');
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ModalConstants = require('../../constants/ModalConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var AppRequest = require('../../http/AppRequest');
var AccountUtil = require('../../util/AccountUtil');
var GA = require('../../util/GoogleAnalytics');
var MonitorUtil = require('../../util/MonitorUtil');
var Util = require('../../util/util');
var HelpUtil = require('../../util/HelpUtil');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);
var a = DOM.a;
import { withTransitionHelper } from '../RouterTransitionHelper';

var Monitor = createReactClass({
  displayName: 'Monitor',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [TimingMixin],

  getInitialState: function() {
    return {
      configurationState: {
        scaleFactors: {},
        thresholds: null
      },
      fetchedMetadata: false,
      immMonitorAudits: null,
      immMonitorResults: null,
      immPreviewMonitorResults: null,
      initialEndTime: null,
      initialStartTime: null,
      isEditable: false,
      isPreviewDisplayed: false,
      monitorBreachData: null,
      filterBreachOnly: true,
      monitorTab: ExposureAppConstants.MONITOR_TABS.OVERVIEW,
      displayFilters: false
    };
  },

  componentWillMount: function() {
    ExposureActions.transitionFile(null, this.props.params.fileId);
  },

  componentDidMount: function() {
    this.setInitialState();
  },

  componentWillReceiveProps: function(nextProps) {
    var currentFileId = this.props.params.fileId;
    var nextFileId = nextProps.params.fileId;
    if (currentFileId !== nextFileId) {
      ExposureActions.transitionFile(currentFileId, nextFileId);
    }
  },

  componentDidUpdate: function() {
    this.setInitialState();
  },

  componentWillUnmount: function() {
    var fileId = this.props.params.fileId;
    if (!_.isUndefined(fileId)) {
      ExposureActions.transitionFile(fileId, null);
    }
  },

  initiateExport: function(downloadType) {
    ExposureActions.exportFileData(this.props.params.fileId, undefined, downloadType);
  },

  getInitialConfigurationState: function() {
    var immMonitor = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file']);
    var scaleFactors = immMonitor.getIn(['monitor', 'metrics'], Imm.List())
      .reduce((memo, immMetric) => {
        memo[immMetric.get('referenceName')] = immMetric.get('scaleFactor').toString();
        return memo;
      }, {});

    var thresholds = immMonitor.getIn(['monitor', 'thresholds']).map(threshold => threshold.get('scaleFactor').toString()).toJS();
    return {
      scaleFactors: scaleFactors,
      thresholds: thresholds
    };
  },

  setInitialState: function() {
    if (!this.state.fetchedMetadata) {
      var immFileWrapper = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper']);
      if (!_.isUndefined(immFileWrapper)) {
        let configurationState = this.getInitialConfigurationState();
        this.setState({
          configurationState,
          fetchedMetadata: true
        });
        // On initial mount we fetch the monitor metadata.
        this.fetchMonitorBreachData();
      }
    }
  },

  fetchMonitorBreachData: function() {
    let url = `/api/monitors/${this.props.params.fileId}/metadata`;
    ExposureActions.setMonitorTasks();
    AppRequest({type: 'GET', url: url})
      .then(data => {
        let breachDataPoints = data.monitorResultDataPoints;
        let whatIdentifierMap = this.parseUniquenessLookupMap(data.displayWhats, data.displayNames);
        let newState = {
          whatIdentifierMap: whatIdentifierMap,
          uniquenessNames: data.uniquenessNames,
          displayNames: data.displayNames,
          monitorBreachData: breachDataPoints
        };
        if (_.isEmpty(breachDataPoints)) {
          // We got no metadata back, so we won't get any monitor results back.
          newState.immMonitorAudits = Imm.List();
          newState.immMonitorResults = Imm.List();
        } else {
          let endTime = _.last(breachDataPoints).x;
          let dataStartTime = _.first(breachDataPoints).x;
          let monthStartTime = parseInt(Moment(endTime).subtract(1, 'month').format('x'), 10);
          let startTime = _.max([dataStartTime, monthStartTime]);
          // When the page is first loaded, we fetch the latest 1 month of the monitor results.
          this.fetchMonitorData(startTime, endTime);
          newState.initialStartTime = startTime;
          newState.initialEndTime = endTime;
        }
        this.setState(newState);
      },
      () => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
      }
    );
  },

  fetchMonitorData: function(start, end) {
    if (!start || !end) {
      console.log(`%cERROR: fetchMonitorData failed (` + start + ', ' + end + ')', 'color: #E05353');
      return;
    }
    let queryString = `?startTime=${start}&endTime=${end}`;
    if (this.state.selectedWhatIdentifier) {
      queryString += '&whatIdentifier=' + this.state.selectedWhatIdentifier;
    }
    let url = `/api/monitors/${this.props.params.fileId}/results${queryString}`;
    AppRequest({type: 'POST', url: url})
      .then(data => {
        let immMonitorAudits = Imm.List();
        let immMonitorTasks = Imm.List();
        let immMonitorResults = Imm.fromJS(data.monitorResults);
        // Guard against no MonitorResults.
        if (!immMonitorResults.isEmpty()) {
          let respStartTime = MonitorUtil.getResultTimestamp(immMonitorResults.first());
          let respEndTime = MonitorUtil.getResultTimestamp(immMonitorResults.last());
          immMonitorAudits = Imm.fromJS(data.fileAuditResults);
          immMonitorTasks = Imm.fromJS(_.map(data.monitorTasks, taskTuple => {
            return {task: taskTuple[0], whatId: taskTuple[1], jobStartedAt: taskTuple[2]};
          }));
          if (respStartTime - start > Moment.duration(1, 'day').asMilliseconds() && end - respEndTime > Moment.duration(1, 'day').asMilliseconds()) {
            ExposureActions.createStatusMessage(FrontendConstants.THERE_WAS_AN_ERROR_AND_ONLY_A_PORTION_OF_THE_VIZ_COULD_BE_RENDERED, StatusMessageTypeConstants.TOAST_ERROR);
          }
        }

        this.setState({
          immMonitorResults: immMonitorResults,
          immMonitorAudits: immMonitorAudits
        });
        ExposureActions.setMonitorTasks(immMonitorTasks);
      },
      () => {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
    this.setState({immMonitorResults: null});
  },

  closeTasksPane: function() {
    // Close the tasks pane if it's open.
    ExposureActions.toggleMonitorTasksPane(true);
  },

  setIsEditable: function(isEditable) {
    var newState = {isEditable: isEditable};
    if (isEditable) {
      newState.filterBreachOnly = false;
      this.closeTasksPane();
    }
    this.setState(newState);
  },

  // Reset the configurationState stored in state back to the original values.
  handleCancelConfiguration: function() {
    let configurationState = this.getInitialConfigurationState();
    this.setState({
      isEditable: false,
      configurationState
    });
  },

  handleEditDefinitionTransition: function(fileId) {
    this.closeTasksPane();
    this.context.router.push({name: RouteNameConstants.EXPOSURE_MONITORS_EDIT, params: {fileId: fileId}});
  },

  togglePreviewDisplay: function() {
    this.setState({isPreviewDisplayed: !this.state.isPreviewDisplayed});
  },

  handleDisplayFilters: function(state) {
    this.setState({displayFilters: state});
  },

  updateConfigurationState: function(newConfigurationState) {
    // `setState` does a shallow merge, we need to do a manual deep merge.
    var mergedConfigurationState = _.chain(this.state.configurationState)
      .clone()
      .extend(newConfigurationState)
      .value();
    this.setState({configurationState: mergedConfigurationState});
  },

  /************************** Start of Preview Support *************************/

  // Handles a preview request.
  // Calls callback on successful response when polling for preview results.
  handlePreviewRequest: function(startTime, endTime) {
    // startTime and endTime must be defined.
    if (!startTime || !endTime) {
      console.log(`%cERROR: handlePreviewRequest failed (` + startTime + ', ' + endTime + ')', 'color: #E05353');
      return;
    }

    var immExposureStore = this.props.immExposureStore;
    let monitorPreviewPollIntervalMillis = immExposureStore.getIn(['monitorConstants', 'monitorPreviewPollIntervalMillis']);

    if (!monitorPreviewPollIntervalMillis) {
      console.log(`%cERROR: handlePreviewRequest failed, polling interval not defined`, 'color: #E05353');
      return;
    }

    var fileId = this.props.params.fileId;
    var immMonitorFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    var updatedImmMonitorFile = MonitorUtil.getUpdatedImmMonitorFile(immMonitorFile, this.state.configurationState);
    var updatedMonitorConfiguration = updatedImmMonitorFile.get('monitor');

    var queryString = '?startTime=' + startTime + '&endTime=' + endTime;
    var url = '/api/monitors/' + fileId + '/preview' + queryString;
    var data = JSON.stringify(updatedMonitorConfiguration);

    // Clear any existing timeouts for this component (previous polling).
    this.clearTimeouts();

    AppRequest({type: 'POST', url: url, data: data}).then(data => {
        // {requestId: <requestId>}.
        var requestId = data.requestId;
        // Record when we started polling so that we can time out the polling.
        var firstPoll = Date.now();
        // Uses TimingMixin.
        this.setTimeout(this.pollPreviewResults.bind(null, fileId, requestId, firstPoll), monitorPreviewPollIntervalMillis);
      },
      () => {
        this.cancelPreview();
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
      }
    );
    this.setState({immPreviewMonitorResults: null, isPreviewDisplayed: true});
  },

  handleToggleFilterByBreach: function() {
    this.setState({filterBreachOnly: !this.state.filterBreachOnly});
  },

  handleUpdateWhatIdentifierDropdown: function(whatIdentifier) {
    this.setState({selectedWhatIdentifier: whatIdentifier}, () => {
      let viz = this.refs['monitor-viz'];
      if (this.state.immPreviewMonitorResults) {
        this.pollPreviewResults(this.props.params.fileId, this.state.previewRequestId)
      }
      this.fetchMonitorData(viz.state.startTime, viz.state.endTime);
    });
  },

  parseUniquenessLookupMap: function(displayWhats, displayLongNames) {
    return _.reduce(displayWhats, (memo, displayWhat) => {
      let whatLabel = _.map(displayWhat.displayNameValues, function(value, index) {
        return `${FrontendConstants.BULLET} ${displayLongNames[index]}: <b>${value}</b>`;
      }).join('<br/>');
      memo[displayWhat.whatIdentifier] = {
        value: displayWhat.whatIdentifier,
        text: `${displayWhat.displayNameValues.join(', ')} (${displayWhat.uniquenessValues.join(', ')})`,
        whatLabel: whatLabel
      };
      return memo;
    }, {});
  },

  // Poll for preview results.
  // TODO: Investigate implementing a progress bar or similar by changing the `MONITOR_PREVIEW_JOB_IN_PROGRESS` message
  // to include number of preview results available with the number of results requested.
  pollPreviewResults: function(fileId, requestId, firstPoll, successCallback) {
    let immExposureStore = this.props.immExposureStore;
    let monitorPreviewPollIntervalMillis = immExposureStore.getIn(['monitorConstants', 'monitorPreviewPollIntervalMillis']);
    let monitorPreviewMaxPollMillis = immExposureStore.getIn(['monitorConstants', 'monitorPreviewMaxPollMillis']);

    if (!monitorPreviewPollIntervalMillis || !monitorPreviewMaxPollMillis) {
      console.log(`%cERROR: handlePreviewRequest failed, polling interval or max poll timeout not defined`, 'color: #E05353');
      this.cancelPreview();
      return;
    }

    let url = '/api/monitors/' + fileId + '/preview/' + requestId;
    if (this.state.selectedWhatIdentifier) {
      url += '?whatIdentifier=' + this.state.selectedWhatIdentifier;
    }
    AppRequest({type: 'GET', url: url}).then(data => {
        switch (data.status) {
          case ExposureAppConstants.MONITOR_PREVIEW_JOB_FAILURE:
            ExposureActions.createStatusMessage(FrontendConstants.MONITOR_PREVIEW_ERROR, StatusMessageTypeConstants.WARNING);
            this.cancelPreview();
            break;
          case ExposureAppConstants.MONITOR_PREVIEW_JOB_IN_PROGRESS:
            if (Date.now() - firstPoll > monitorPreviewMaxPollMillis) {
              ExposureActions.createStatusMessage(FrontendConstants.MONITOR_PREVIEW_TIMED_OUT, StatusMessageTypeConstants.WARNING);
              this.cancelPreview();
            } else {
              this.setTimeout(this.pollPreviewResults.bind(null, fileId, requestId, firstPoll), monitorPreviewPollIntervalMillis);
            }
            break;
          case ExposureAppConstants.MONITOR_PREVIEW_JOB_COMPLETED:
            this.setState({previewRequestId: requestId, immPreviewMonitorResults: Imm.fromJS(data.monitorResults)});
            Util.getGuardedCallback(successCallback)();
            break;
        }
      },
      () => {
        this.cancelPreview();
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    );
  },

  cancelPreview: function() {
    this.clearTimeouts();
    this.setState({
      previewIsLoading: false,
      previewRequestId: null,
      isPreviewDisplayed: false
    });
  },

  /*************************** End of Preview Support **************************/

  /*************************** Start of Dirty Logic ***************************/
  // Code in this block is to handle the dirty state of monitor edit state. It is responsible for spawning "Unsaved" warning modal.

  isDirty: function() {
    return this.refs[this.state.monitorTab] && this.refs[this.state.monitorTab].isDirty();
  },

  unsavedWorkModalCopy: function() {
    return {
      header:FrontendConstants.DISCARD_CHANGES_TO_MONITOR,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  displayMonitorUnsavedModal: function(discardFunc) {
    ExposureActions.displayModal(ModalConstants.MODAL_UNSAVED_WARNING, {
      header: FrontendConstants.DISCARD_CHANGES_TO_MONITOR,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
      handleCancel: ExposureActions.closeModal,
      discardFunc: discardFunc
    });
  },

  /**
   * Handles dirty state scenario when switching tabs. The tabs in the monitor
   * UI are not associated with unique URLs, so we don't rely on the
   * setRouteLeaveHook method for dirty state checking and instead do it all
   * manually.
   */
  handleTabSelect: function(tab) {
    if (this.state.monitorTab !== tab && this.state.isEditable && this.refs[this.state.monitorTab].isDirty()) {
      this.displayMonitorUnsavedModal(function() {
        let configurationState = this.getInitialConfigurationState();
        this.setState({
          monitorTab: tab,
          configurationState
        });
        ExposureActions.closeModal();
      }.bind(this));
    } else {
      this.setState({monitorTab: tab});
    }
  },

  /**************************** End of Dirty Logic ****************************/

  isReady: function() {
    var immExposureStore = this.props.immExposureStore;
    var fileId = this.props.params.fileId;
    var updateRequest = immExposureStore.getIn(['files', fileId, 'updateFileRequest']);
    return this.state.fetchedMetadata && !updateRequest;
  },

  render: function() {
    if (!this.isReady()) {
      return Spinner();
    }

    var fileId = this.props.params.fileId;
    var immExposureStore = this.props.immExposureStore;
    var immFileWrapper = immExposureStore.getIn(['files', fileId, 'fileWrapper']);
    var immFile = immFileWrapper.get('file');
    var previewIsLoading = this.state.isPreviewDisplayed && !this.state.immPreviewMonitorResults;
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);
    const reportTitle = immFile.get('title');

    var isOverviewTabSelected = this.state.monitorTab === ExposureAppConstants.MONITOR_TABS.OVERVIEW;

    var mainContent = DataMonitorViz({
      ref: 'monitor-viz',
      cancelPreview: this.cancelPreview,
      fetchMonitorData: this.fetchMonitorData,
      fileId: fileId,
      handlePreviewRequest: this.handlePreviewRequest,
      immMonitor: immFile,
      immMonitorAudits: this.state.immMonitorAudits,
      immMonitorResults: this.state.immMonitorResults,
      immMonitorTasks: this.props.immExposureStore.get('monitorTasks'),
      immPreviewMonitorResults: this.state.immPreviewMonitorResults,
      initialEndTime: this.state.initialEndTime,
      initialStartTime: this.state.initialStartTime,
      whatIdentifierMap: this.state.whatIdentifierMap,
      isEditableAndInConfiguration: this.state.isEditable && !isOverviewTabSelected,
      isPreviewDisplayed: this.state.isPreviewDisplayed,
      monitorBreachData: this.state.monitorBreachData,
      togglePreviewDisplay: this.togglePreviewDisplay,
      filterBreachOnly: this.state.filterBreachOnly,
      isFilterDisplayed: this.state.displayFilters,
      visibleMonitorTrendlines: this.props.immExposureStore.getIn(['files', fileId, 'visibleMonitorTrendlines'], Imm.Map())});

    var overviewAndConfiguration = Util.isDesktop() ?
      div({className: cx('right-pane', 'overview-and-config')},
        div({className: 'toggle-tabs-container'},
          Tabs({
            tabNames: _.keys(ExposureAppConstants.MONITOR_TABS),
            selectedTab: this.state.monitorTab,
            handleTabSelect: this.handleTabSelect,
            tabNameMap: FrontendConstants.MONITOR_TAB_DISPLAY_NAME,
            disabledTabs: []
          }),
          a({className: 'icon-question-circle', href: Util.formatHelpLink('CONFIGURATION'), target: '_blank'})
        ),
        isOverviewTabSelected ?
          MonitorOverview({
            ref: ExposureAppConstants.MONITOR_TABS.OVERVIEW,
            immExposureStore: immExposureStore,
            fileId: fileId,
            onCancel: this.setIsEditable.bind(null, false),
            onUpdate: this.setIsEditable.bind(null, false),
            isEditable: this.state.isEditable
          }) :
          MonitorConfiguration({
            ref: ExposureAppConstants.MONITOR_TABS.CONFIGURATION,
            fileId: fileId,
            immExposureStore: immExposureStore,
            isEditable: this.state.isEditable,
            onCancel: this.handleCancelConfiguration,
            onUpdate: this.setIsEditable.bind(null, false),
            scaleFactors: this.state.configurationState.scaleFactors,
            thresholds: this.state.configurationState.thresholds,
            updateConfigurationState: this.updateConfigurationState
          }),
        previewIsLoading ? div({className: 'container-overlay'}) : null
      ) : null;

    let monitorTasks = MonitorTasks({
      immExposureStore
    });

    let rightSidePane = Util.isDesktop() && this.props.immExposureStore.get('showMonitorTasks') ? monitorTasks : overviewAndConfiguration;

    var canEdit = immFileWrapper.get('canEdit');

    var content = null;

    var historyFooter = div({className: 'history'},
      div({className: 'sub-tab-header'}, FrontendConstants.HISTORY),
      div({className: 'link-container'},
        div({className: 'icon icon-arrow-down2'}),
        div({className: 'text-link', onClick: this.initiateExport.bind(null, ExposureAppConstants.DOWNLOAD_TYPE_CSV)}, FrontendConstants.DOWNLOAD_CSV),
        FrontendConstants.MONITOR_DOWNLOAD_HISTORY_TEXT));

    if (Util.isDesktop()) {
      content = div({className: 'monitor-view-container'},
      div({className: 'page-header'},
        isHomeActive
          ? null
          : Breadcrumbs({
              immExposureStore,
              fileId
            }),
        div({className: 'header-buttons'},
          SimpleAction({class: 'toggle-filters icon-filter2', text: FrontendConstants.FILTERS, onClick: this.handleDisplayFilters.bind(null, !this.state.displayFilters)}),
          SimpleAction({class: 'toggle-tasks icon-task-alt', text: 'Tasks', onClick: ExposureActions.toggleMonitorTasksPane.bind(null, false)}),
          Menu({className: 'more-menu', horizontalPlacement: 'left'},
            MenuTrigger({className: 'more-menu-trigger'}, div({className: 'react-menu-icon icon-menu2'}, 'More')),
            MenuOptions({className: 'more-menu-options'},
              MenuOption({className: 'more-menu-share',
                  onSelect: ExposureActions.shareFilesModal.bind(null, Imm.List([fileId]))},
                div({className: 'react-menu-icon icon-share'}, FrontendConstants.SHARE)),
              MenuOption({className: 'more-menu-manage-assignees',
                  disabled: !canEdit,
                  onSelect: ExposureActions.monitorTaskAssigneesModal.bind(null, fileId)},
                div({className: 'react-menu-icon icon-user manage-assignees'}, FrontendConstants.MANAGE_ASSIGNEES)),
              MenuOption({className: 'more-menu-edit',
                  disabled: !canEdit,
                  onSelect: this.setIsEditable.bind(null, true)},
                div({className: 'react-menu-icon icon-pencil edit-monitor'}, FrontendConstants.EDIT_MONITOR)),
              MenuOption({className: 'more-menu-edit',
                  disabled: !(canEdit && AccountUtil.hasPrivilege(immExposureStore, 'isAdmin')),
                  onSelect: this.handleEditDefinitionTransition.bind(null, fileId)},
                div({className: 'react-menu-icon icon-pencil edit-monitor-definition'}, FrontendConstants.EDIT_MONITOR_DEFINITION)))),
          isHomeActive && HelpUtil.isInAppHelpExists(reportTitle)
            ? a({className: cx('icon-question-circle', 'home-page-help'), href: Util.formatHelpLink(reportTitle), target: '_blank'},
                span({className: 'home-page-help-text'}, FrontendConstants.HELP)
              )
            : null,
          previewIsLoading ? div({className: 'container-overlay'}) : null
        )),
      div({className: cx('monitor', {'show-filters': this.state.displayFilters})},
        MonitorFilters({
          handleClose: this.handleDisplayFilters.bind(null, false),
          handleToggleFilterByBreach: this.handleToggleFilterByBreach,
          handleUpdateWhatIdentifierDropdown: this.handleUpdateWhatIdentifierDropdown,
          filterBreachOnly: this.state.filterBreachOnly,
          selectedWhatIdentifier: this.state.selectedWhatIdentifier,
          disabledFilterByBreach: this.state.isEditable,
          previewIsLoading: previewIsLoading,
          displayFilters: this.state.displayFilters,
          displayNames: this.state.displayNames,
          uniquenessNames: this.state.uniquenessNames,
          whatIdentifierMap: this.state.whatIdentifierMap}),
        div({className: 'viz-configuration-wrapper'},
          mainContent,
          rightSidePane,
          historyFooter)));
    } else {
      content = div({className: 'monitor-view-container'},
        div({className: 'page-header'},
          isHomeActive
            ? null
            : Breadcrumbs({
                immExposureStore,
                fileId,
                isMobile: Util.isMobile()
              }),
        ),
        div({className: 'mobile-monitor'},
          MobileMonitorView({
            immExposureStore: immExposureStore,
            fileId: fileId
          }),
          div({className: 'user-alert'},
            span({className: 'icon-info'}),
            span({className: cx('message', { 'mobile-message': Util.isMobile() })}, FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT)
          )
        )
      );
    }

    return content;
  }
});

module.exports = withTransitionHelper(Monitor);
