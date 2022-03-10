var React = require('react');
import PropTypes from 'prop-types';

var ExposureActions = require('../actions/ExposureActions');
var FrontendConstants = require('../constants/FrontendConstants');

class ReportFilterNotice extends React.Component {
  componentDidMount() {
    // Pop open the filter pane to guide users to resolving the issue if it's
    // not open already.
    if (!this.props.filterPaneState) {
      ExposureActions.toggleFiltersPane();
    }
  }

  render() {
    return (
      <div className='report-filter-notice'>
        <div className='report-filter-notice-text-holder'>
          <div className='report-filter-notice-header'>
            <span className='icon-information_solid'/>
            <span className='report-filter-notice-text'>
              {this.props.headerText}
            </span>
          </div>
          <div>
            <span className='report-filter-notice-sub-text'>
              {this.props.bodyText}
            </span>
          </div>
        </div>
      </div>
    );
  }
}

ReportFilterNotice.propTypes = {
  filterPaneState: PropTypes.bool,
  headerText: PropTypes.string,
  bodyText: PropTypes.object
};

ReportFilterNotice.defaultProps = {
  filterPaneState: true  // By default don't force open the filters pane in case behavior is different for other use cases.
};

module.exports = ReportFilterNotice;
