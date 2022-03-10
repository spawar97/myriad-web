import React from 'react';
import Imm from 'immutable';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import PropTypes from 'prop-types';

import cx from 'classnames';
import Util from '../../util/util';
import EmbeddedReportViewWidget from './EmbeddedReportViewWidget';
import { withTransitionHelper } from '../RouterTransitionHelper';

/**
 * Thin wrapper for embedded OEM dashboards - the majority of the logic lives in EmbeddedReportViewWidget
 */
class EmbeddedDashboards extends React.Component {

  render() {
    const {iframeClass, iframeWrapperClass, viewContainerClass} = this.props;

    let props = {
      immExposureStore: this.props.immExposureStore,
      fileId: this.props.params.fileId,
      entry: this.props.params.fileId
        ? ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.VIEW_DASHBOARDS_ENTRY
        : ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.DASHBOARDS_ENTRY,
      params: this.props.params,
      router: this.context.router,
      iframeClass: iframeClass || 'iframe-inner-content-fullscreen',
      iframeWrapperClass: iframeWrapperClass || 'iframe-container-dashboard',
    };

    // TODO - need to build a mobile embedded report widget and use a MediaQuery to display accordingly?

    const fileId = this.props.fileId;
    let content;
    if (Util.isDesktop()) {
      content = (
        <div className="yellowfin-container">
          <div className={viewContainerClass || 'embedded-reports-view-container'}>
            <EmbeddedReportViewWidget {...props}/>
          </div>
        </div>
        );
    }
    else {
      content = (
        <div className='embedded-reports-view-container'>
          <div className='mobile-embedded'>
            <div className='user-alert'>
              <span className='icon-info' />
              <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return content;
  }
}

EmbeddedDashboards.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string,
    taskId: PropTypes.string
  }).isRequired,
  iframeClass: PropTypes.string,
  iframeWrapperClass: PropTypes.string,
  viewContainerClass: PropTypes.string,
};

EmbeddedDashboards.contextTypes = {
  router: PropTypes.object
};

export default withTransitionHelper(EmbeddedDashboards);
export {EmbeddedDashboards as UnwrappedEmbeddedDashboards};
