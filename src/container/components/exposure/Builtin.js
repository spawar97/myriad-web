const React = require('react');
const Imm = require('immutable');
const $ = require('jquery');
var _ = require('underscore');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import BuiltinDataReviewSummary from './BuiltinDataReviewSummary';
import BuiltinTasksKPI from './BuiltinTasksKPI';
import BuiltinDataMonitorKPI1 from './BuiltinDataMonitorKPI1';
import BuiltinSiteScorecardKPI from  './BuiltinSiteScorecardKPI';
import BuiltinDataDiffKPI from './BuiltinDataDiff';
import BuiltinScorecardKPI from './BuiltinScorecardKPI';

const ReactDOM = require('react-dom');

const Spinner = React.createFactory(require('../Spinner'));
const ExposureActions = require('../../actions/ExposureActions');
const ExposureAppConstants = require('../../constants/ExposureAppConstants');

import { withTransitionHelper } from '../RouterTransitionHelper';

var div = DOM.div;

/**
 * Thin wrapper for the builtin KPIs, allows for simpler routing.
 *
 * The resize logic was based on ReportWidget.js.
 */
class Builtin extends React.Component {
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    }),
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    this.state = {width: 300};
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
  }

  componentWillReceiveProps() {
    this.handleResize();
  }

  componentDidUpdate() {
    this.fetchFileIfNeeded();
  }

  fetchFileIfNeeded() {
    const immFiles = this.props.immExposureStore.getIn(['files']);
    if (!immFiles.has(this.props.params.fileId)) {
      ExposureActions.fetchFiles([this.props.params.fileId]);
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
    var immExposureStore = this.props.immExposureStore;
    var fileId = this.props.params.fileId;
    var builtinType  = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file', 'builtinType']);
    var updateRequest = immExposureStore.getIn(['files', fileId, 'updateFileRequest']);
    return !updateRequest && !_.isUndefined(builtinType);
  }

  render() {
    if (!this.isReady()) {
      return Spinner();
    }

    const builtinType  = this.props.immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file', 'builtinType']);

    const newProps = _.extend({}, this.props, {width: this.state.width});

    switch(builtinType) {
      case ExposureAppConstants.BUILTIN_TYPE_TASKS:
        return <BuiltinTasksKPI {...newProps}/>

      case ExposureAppConstants.BUILTIN_TYPE_DATA_MONITOR_KPI_1:
        return <BuiltinDataMonitorKPI1 {...newProps}/>
      case ExposureAppConstants.BUILTIN_TYPE_SITE_SCORECARD:
        return <BuiltinSiteScorecardKPI {...newProps}/>
      case ExposureAppConstants.BUILTIN_TYPE_DATA_DIFF:
        return <BuiltinDataDiffKPI {...newProps}/>
      case ExposureAppConstants.BUILTIN_TYPE_SCORECARD:
        return <BuiltinScorecardKPI {...newProps}/>
      case ExposureAppConstants.BUILTIN_TYPE_DATA_REVIEW_SUMMARY:
        return <BuiltinDataReviewSummary {...newProps}/>
      default:
        return <div>Unsupported Builtin Type: ${builtinType}</div>
    }
  }
}


module.exports = withTransitionHelper(Builtin);
