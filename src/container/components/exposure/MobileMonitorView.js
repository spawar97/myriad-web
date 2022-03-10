var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

class MonitorOverview extends React.Component {
  static displayName = 'MonitorOverview';

  static propTypes = {
    fileId: PropTypes.string.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  state = { moreDescription: false };

  render() {
    var immExposureStore = this.props.immExposureStore;
    var immMonitorFile = immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);

    var monitorDescription = null;
    var description = immMonitorFile.get('description');
    if (description.length > ExposureAppConstants.MONITOR_DESCRIPTION_LETTER_COUNT_LIMIT) {
      var toggleLink = span({className: cx('more-less-link', 'text-link'), onClick: () => {
        this.setState({moreDescription: !this.state.moreDescription});
      }}, FrontendConstants[this.state.moreDescription ? 'LESS' : 'MORE'].toLowerCase());
      if (!this.state.moreDescription) {
        description = description.substring(0, ExposureAppConstants.MONITOR_DESCRIPTION_LETTER_COUNT_LIMIT) + '...';
      }
      monitorDescription = div({className: 'monitor-description'}, div({className: cx('description', {less: !this.state.moreDescription})}, description), toggleLink);
    } else {
      monitorDescription = div({className: 'monitor-description'}, immMonitorFile.get('description') || FrontendConstants.THERE_IS_NO_SUMMARY);
    }

    return div({className: 'mobile-monitor-view'},
      div({className: 'header'}, FrontendConstants.SUMMARY),
      div({className: 'description'}, monitorDescription)
    );
  }
}

module.exports = MonitorOverview;
