var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var FolderViewWidget = React.createFactory(require('./FolderViewWidget'));
var MobileReportsWidget = React.createFactory(require('./MobileReportsWidget'));
var MediaQueryWrapper = React.createFactory(require('../MediaQueryWrapper'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');

class Reports extends React.Component {
  static displayName = 'Reports';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    }).isRequired,
    location: PropTypes.object.isRequired
  };

  componentWillUnmount() {
    ExposureActions.clearSelectedModuleOption();
  }

  render() {
    var immExposureStore = this.props.immExposureStore;

    var immFileWrappers = immExposureStore.getIn(['folderView', 'fileIds']).map(function(id) {
      return immExposureStore.getIn(['files', id, 'fileWrapper']);
    });

    var curFolderId = this.props.params.fileId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
    var childFiles = immExposureStore.getIn(['files', curFolderId, 'fileWrapper', 'file', 'fileIds']);
    var totalFiles = childFiles ? childFiles.size : 0;

    var sharedProps = {
      immExposureStore: immExposureStore,
      immFileWrappers: immFileWrappers,
      totalFiles: totalFiles,
      params: this.props.params,
      query: this.props.location.query
    };

    var desktopComponent = FolderViewWidget(_.extend({}, sharedProps));
    var phoneComponent = MobileReportsWidget(_.extend({}, sharedProps, {listFilterType: 'folders'}));

    return MediaQueryWrapper({className: 'app-tab-reports', desktopComponent: desktopComponent, phoneComponent: phoneComponent});
  }
}

module.exports = Reports;
