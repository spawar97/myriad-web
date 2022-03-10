import React from 'react';
import PropTypes from 'prop-types';
import ExposureActions from '../../actions/ExposureActions';

import Imm from 'immutable';

import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import AccountUtil from '../../util/AccountUtil';
import PendoUtil from '../../util/Pendo';
import PermissionsUtil from "../../util/PermissionsUtil";

/**
 * Higher order component intended to contain whatever helper functionality is needed around the multiple
 * entrypoints into the Yellowfin display components. The primary purpose of this is initially for
 * attaching event listeners to the component to facilitate communications (adding tasks, setting session filters,
 * etc.). But this could be extended to include any other required functionality.
*/
let withReportListener = (WrappedComponent) => {

  return class ReportListenerHelper extends React.PureComponent {
    static contextTypes = {
      router: PropTypes.object
    };

    static propTypes = {
      immExposureStore: PropTypes.instanceOf(Imm.Map),
      params: PropTypes.shape({
        fileId: PropTypes.string,
        taskId: PropTypes.string
      }).isRequired
    };

    constructor(props) {
      super(props);
    }

    componentDidMount() {

      // Once we've successfully mounted, attach all listeners
      this.attachListeners();
    }

    componentWillUnmount() {
      // Be sure to detach listeners before unmounting
      this.detachListeners();
    }

    /**
     * Attaches all listeners needed for this component
     *
     * TODO - Once we get beyond 5 listeners here, refactor this component to separate out any other view logic
     *        such as the Task Pane logic into separate components.
     */
    attachListeners() {
      const immAppConfig = comprehend.globals.immAppConfig;
      window.Yellowfin.eventListener.addListener(this, 'get-feature-list', this.getFeatureList);
      window.Yellowfin.eventListener.addListener(this, 'get-pendo-data', this.getPendoData);
      window.Yellowfin.eventListener.addListener(this, 'extend-session', ExposureActions.extendSession);
      window.Yellowfin.eventListener.addListener(this, 'handle-iframe', this.handleIframeAction);
    }

    /**
     * Detaches all listeners that we've attached to this component
     */
    detachListeners() {
      window.Yellowfin.eventListener.removeListener(this, 'get-feature-list');
      window.Yellowfin.eventListener.removeListener(this, 'get-pendo-data');
      window.Yellowfin.eventListener.removeListener(this, 'extend-session');
      window.Yellowfin.eventListener.removeListener(this, 'handle-iframe');
    }

    getFeatureList() {
      const immAppConfig = comprehend.globals.immAppConfig;
      const userCanCreateTask = PermissionsUtil.checkLoggedInUserHasAccessForFeature("TASK", "EDIT");
      const accountFeatureList = AccountUtil.getFeatureList(immAppConfig).toJS();
      const accessibleFeatures = accountFeatureList.filter(feature => feature !== "v3_task_integration" || userCanCreateTask);

      window.Yellowfin.eventListener.sendMessage(
        this.props.immExposureStore.get('yellowfinUrl'),
        'feature-list',
        accessibleFeatures);
    }

    getPendoData() {
      const immAppConfig = comprehend.globals.immAppConfig;
      window.Yellowfin.eventListener.sendMessage(this.props.immExposureStore.get('yellowfinUrl'), 'pendo-data', PendoUtil.getData(immAppConfig));
    }

    //Handle YF session timeout and YF occurs error page
    handleIframeAction(data) {
      if(data.handleAction=='reloadIframe') {
        $('#yellowfinEmbeddedIframe').hide();
        window.location.reload();
      } 
      else if(data.handleAction=='showError') {
        ExposureActions.createStatusMessage(data.messageError, StatusMessageTypeConstants.TOAST_ERROR);
      }
    }

    render() {
      // Pass the props through to the child component
      return <WrappedComponent
        {...this.props}
        ref={(component) => {
          this.wrappedComponent = component;
        }}
      />;
    }
  }
};

module.exports = { withReportListener };
