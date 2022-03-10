import React from 'react';
import Imm from 'immutable';
import EmbeddedReportViewWidget from './EmbeddedReportViewWidget';
import PropTypes from 'prop-types';

import ExposureAppConstants from '../../constants/ExposureAppConstants';
import {withTransitionHelper} from '../RouterTransitionHelper';
import Util from "../../util/util";
import cx from "classnames";
import FrontendConstants from "../../constants/FrontendConstants";

/**
 * Thin wrapper for the KPI Studio functionality - the core logic is in EmbeddedReportViewWidget
 */
class KPIStudio extends React.Component {
  render() {
    let props = {
      immExposureStore: this.props.immExposureStore,
      entry: ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.KPI_STUDIO_ENTRY,
      iframeClass: 'iframe-inner-content-fullscreen',
      iframeWrapperClass: 'iframe-container-kpi-studio',
      params: this.props.params
    };

    //TODO - We'll need to handle mobile / tablet displays here using a MediaQuery - do after creation of a mobile view widget

    return (
      <div className="yellowfin-container">
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
      </div>
    );
  }
}

KPIStudio.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string,
    taskId: PropTypes.string
  }).isRequired
};

KPIStudio.contextTypes = {
  router: PropTypes.object
};

export default withTransitionHelper(KPIStudio);
