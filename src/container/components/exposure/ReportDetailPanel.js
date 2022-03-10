var React = require('react');
var Imm = require('immutable');
const Link = React.createFactory(require('react-router').Link);
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ItemOpener = React.createFactory(require('../ItemOpener'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var RouteHelpers = require('../../http/RouteHelpers');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    li = DOM.li,
    span = React.createFactory(require('../TouchComponents').TouchSpan),
    ul = DOM.ul,
    a = DOM.a;

class ReportDetailPanel extends React.Component {
  static displayName = 'ReportDetailPanel';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immReport: PropTypes.instanceOf(Imm.Map).isRequired,
    drilldownId: PropTypes.string,
    dashboardId: PropTypes.string,
    isLoading: PropTypes.bool
  };

  static contextTypes = {
    router: PropTypes.object
  };

  transitionToRelated = (route, fileId, backRoute, backParams, backText) => {
    ExposureActions.pushBackNavAction(Imm.Map({text: backText, backAction: () => this.context.router.push({name: backRoute, params: backParams})}));
    ExposureActions.clearFileFilterState(fileId);
  };

  initiateExport = (downloadType) => {
    ExposureActions.exportFileData(this.props.immReport.getIn(['fileWrapper', 'file', 'id']), this.props.drilldownId, downloadType);
  };

  getLocation(modules, fileId, route) {
    if (modules && modules.size > 0) {
      if (modules.get(0).toLowerCase() === RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS) {
        return {name: RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS, params: {fileId}};
      } else if (modules.get(0).toLowerCase() === RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS) {
        return {name: RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS, params: {fileId}};
      } else {
        return {name: route, params: {fileId}};
      }
    }
    return {name: route, params: {fileId}};
  }

  render() {
    var detailContent = null;

    // Since we'll be manipulating the data structure from here on, but never writing it back to the store, there's
    // no reason to have to take the ImmutableJS performance hit. This is why I'm letting Underscore.js handle things.
    var relatedFileIds = this.props.immReport.getIn(['fileWrapper', 'file', 'associatedFileIds'], Imm.List()).toJS();

    // Set up mobile/tablet back navigation.
    var backId = this.props.dashboardId || this.props.immReport.getIn(['fileWrapper', 'file', 'id']);
    var backRoute = this.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
    var backParams = {fileId: backId};
    var backText = this.props.dashboardId ? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

    // TP:12650
    // Note: Look in `fileConfigs` for the related files because that is always loaded into ExposureStore.
    // Previously this was looking in the `files` map, which isn't fully populated until the user navigates to the
    // report list. This caused related reports not to appear because the `fileType` and `title` couldn't be found.
    var isNotDesktop = Util.isNotDesktop();
    detailContent = _.chain(relatedFileIds)
      .groupBy(function(fileId) {
        return this.props.immExposureStore.getIn(['fileConfigs', fileId, 'fileType']);
      }, this)
      .map(function(fileIds, fileType) {
        var route = RouteHelpers.getRouteForFileType(fileType);
        var location = null;
        switch (fileType) {
          case ExposureAppConstants.FILE_TYPE_REPORT:
            return div({className: 'related-reports', key: 'related-reports'},
              span({className: 'header-text'}, FrontendConstants.REPORT_DETAIL_RELATED_REPORTS),
              a({className: 'icon-question-circle', href: Util.formatHelpLink('Related_Analytics'), target: '_blank'}),
              ul(null,
                fileIds.map(function(fileId) {
                  var title = this.props.immExposureStore.getIn(['fileConfigs', fileId, 'title']);
                  var modules = this.props.immExposureStore.getIn(['fileConfigs', fileId, 'modules']);
                  location =this.getLocation(modules, fileId, route);
                  return li({className: 'related-file icon-report', key: fileId},
                    isNotDesktop ?
                      Link({className: 'open-link', to: location, onClick: this.transitionToRelated.bind(null, RouteNameConstants.EXPOSURE_REPORTS_SHOW, fileId, backRoute, backParams, backText)}, title) :
                      Link({className: 'open-link', to: location, onClick: ExposureActions.clearFileFilterState.bind(null, fileId)}, title)
                  );
                }, this)));
          case ExposureAppConstants.FILE_TYPE_DASHBOARD:
            return div({className: 'related-dashboards', key: 'related-dashboards'},
              span({className: 'header-text'}, FrontendConstants.REPORT_DETAIL_RELATED_DASHBOARDS),
              ul(null,
                fileIds.map(function(fileId) {
                  var title = this.props.immExposureStore.getIn(['fileConfigs', fileId, 'title']);
                  var modules = this.props.immExposureStore.getIn(['fileConfigs', fileId, 'modules']);
                  location =this.getLocation(modules, fileId, route);
                  return li({className: 'related-file icon-dashboard', key: fileId},
                    isNotDesktop ?
                      Link({className: 'open-link', to: location, onClick: this.transitionToRelated.bind(null, RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW, fileId, backRoute, backParams, backText)}, title) :
                      Link({className: 'open-link', to: location, onClick: ExposureActions.clearFileFilterState.bind(null, fileId)}, title)
                  );
                }, this)));
        }
      }, this).value();

    var immFile = this.props.immReport.getIn(['fileWrapper', 'file']);
    switch (immFile.getIn(['templatedReport', 'template', 'type']) || immFile.getIn(['reportConfig', 'reportType'])) {
      case ExposureAppConstants.TEMPLATE_TYPE_TABULAR:
      case ExposureAppConstants.REPORT_TYPE_TABULAR:
        detailContent.push(
          div({className: 'export-options', key: 'export-options'},
            span({className: 'header-text'}, FrontendConstants.EXPORT_OPTIONS),
            a({className: 'icon-question-circle', href: Util.formatHelpLink('Export_Options'), target: '_blank'}),
            ul(null, li({className: 'open-link', onClick: this.initiateExport.bind(null, ExposureAppConstants.DOWNLOAD_TYPE_CSV)}, FrontendConstants.DOWNLOAD_CSV))
          )
        );
    }

    return div({className: cx('report-detail-panel', {loading: this.props.isLoading})},
      div({className: 'report-detail-panel-contents'},
        detailContent));
  }
}

module.exports = ReportDetailPanel;
