import React from 'react';
import ReactDOM from 'react-dom';
import Imm from 'immutable';
import $ from 'jquery';
import PropTypes from 'prop-types';

import Spinner from '../Spinner';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import EmbeddedReportViewWidget from './EmbeddedReportViewWidget';
import FrontendConstants from '../../constants/FrontendConstants';

import Breadcrumbs from './Breadcrumbs';
import Util from '../../util/util';
import cx from 'classnames';

/**
 * Thin wrapper for the builtin KPIs, allows for simpler routing.
 *
 * The resize logic was based on ReportWidget.js.
 */
class EmbeddedReports extends React.PureComponent {

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string,
      taskId: PropTypes.string,
    }).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {
      width: 300,
      displayFilters: false,
      iframeUrl: ''          // Used to detect when the user changes pages within Yellowfin
    };

    this.handleResize = this.handleResize.bind(this);
  }

  /**
   * Runs on initial mount, if it doesn't find this file ID in the store, attempts to fetch it.
   */
  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.fetchFileIfNeeded();
    this.handleResize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    ExposureActions.clearEmbeddedLoginSessionId();
  }


  componentWillReceiveProps() {
    this.handleResize();
  }

  componentDidUpdate() {
    this.fetchFileIfNeeded();
  }


  fetchFileIfNeeded() {
    // TODO: Check if this fetch is needed (this might be unnecessary though)
    const requestInFlight = this.props.immExposureStore.getIn(['embeddedLoginSessionId', 'requestInFlight']);
    const loginSessionId = this.props.immExposureStore.getIn(['embeddedLoginSessionId', 'id']);
    if (!requestInFlight && !loginSessionId) {
      ExposureActions.fetchEmbeddedDashboards();
    }
  }

  /**
   * Retrieve the size of this wrapper to pass down to our children.
   */
  handleResize() {
    var $widgetDOM = $(ReactDOM.findDOMNode(this));
    // Don't change the width if we haven't been able to retrieve it.
    this.setState({width: $widgetDOM.width() || this.state.width});
  }

  /**
   * @returns {boolean} Do we have any in-flight requests for this file?
   */
  isReady() {
    const immExposureStore = this.props.immExposureStore;
    const requestInFlight = immExposureStore.getIn(['embeddedLoginSessionId', 'requestInFlight'], true);
    const loginSessionId = immExposureStore.getIn(['embeddedLoginSessionId', 'id']);
    return !requestInFlight && loginSessionId;
  }



  render() {
    if (!this.isReady()) {
      return <Spinner />;
    }
    const immTask = this.props.immExposureStore.getIn(['tasks', this.props.params.taskId, 'task'], Imm.Map());
    const fileId = this.props.params.fileId || this.props.query.reportId || immTask.getIn(['coreTaskAttributes','reportId']) || immTask.getIn(['extendedTaskAttributes', 'yellowfinReportId']);


    let props = {
      immExposureStore: this.props.immExposureStore,
      fileId: fileId,
      params: this.props.params,
      entry: ExposureAppConstants.EMBEDDED_REPORTS_ENTRY_TYPES.REPORT_ENTRY,
      router: this.context.router,
      iframeClass: 'iframe-inner-content-fullscreen',
      iframeWrapperClass: 'iframe-container-reports'
    };

    let content;

    const immExposureStore = this.props.immExposureStore;
    if (Util.isDesktop()) {
      content =
        (<div className="yellowfin-container">
          <div className={cx('embedded-reports-view-container', 'embedded-reports-custom-analytics')}>
            <EmbeddedReportViewWidget ref='embedded-report-view-widget' {...props}/>
          </div>
        </div>);
    }
    else {
      content = (
        <div className='builtin-view-container'>
          <div className='page-header'>
            <Breadcrumbs immExposureStore={immExposureStore} fileId={fileId} isMobile={Util.isMobile()} />
          </div>
          <div className='mobile-builtin'>
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

export default EmbeddedReports;
