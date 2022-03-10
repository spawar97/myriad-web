import React from 'react';
import Imm from 'immutable';
import EmbeddedReportViewWidget from './EmbeddedReportViewWidget';
import PropTypes from 'prop-types';

import ExposureAppConstants from '../../constants/ExposureAppConstants';
import { withTransitionHelper } from '../RouterTransitionHelper';
import cx from "classnames";
import Util from "../../util/util";
import FrontendConstants from "../../constants/FrontendConstants";

/**
 * Thin wrapper for the ClinOps Insights functionality - the core logic is in EmbeddedReportViewWidget
 */
class ClinOpsInsights extends React.Component {
  render() {
    let props = {
      immExposureStore: this.props.immExposureStore,
      entry: ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.REPORT_LIST_ENTRY,
      iframeClass: 'iframe-inner-content-fullscreen',
      iframeWrapperClass: 'iframe-container-clinops-insights',
      params: this.props.params
    };

    //TODO - We'll need to handle mobile / tablet displays here using a MediaQuery - do after creation of a mobile view widget

    return (
      <div className='embedded-reports-view-container'>
        <div className='kpi-size-alert-wrapper'>
          <div className='mobile-embedded'>
            <div className='user-alert'>
              <span className='icon-info'/>
              <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
              </span>
            </div>
          </div>
        </div>
        <EmbeddedReportViewWidget {...props}/>
      </div>
    );
  }

  componentDidMount() {
    window.Yellowfin.eventListener.addListener(this, 'getFolderView', this.handleReceiverFolderView);
  }
 
  componentWillUnmount() {
    window.Yellowfin.eventListener.removeListener(this, 'getFolderView');
  }

  handleReceiverFolderView(data) {
    window.Yellowfin.eventListener.sendMessage(this.props.immExposureStore.get('yellowfinUrl'), 'clinops-insights-kpis', {
       url: '/embedded/clinops-insights/'
    });
  }
}

ClinOpsInsights.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string,
    taskId: PropTypes.string
  }).isRequired
};

ClinOpsInsights.contextTypes = {
  router: PropTypes.object
};

export default withTransitionHelper(ClinOpsInsights);
