var React = require('react');
var createReactClass = require('create-react-class');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
var FolderViewMixin = require('./FolderViewMixin');
var ListFilterMixin = require('./ListFilterMixin');
var ListFilters = React.createFactory(require('./ListFilters'));
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var MobileListView = React.createFactory(require('../MobileListView'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var ExposureActions = require('../../actions/ExposureActions');
var ListViewConstants = require('../../constants/ListViewConstants');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var RouteHelpers = require('../../http/RouteHelpers');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = React.createFactory(require('../TouchComponents').TouchSpan);

var MobileReportsWidget = createReactClass({
  displayName: 'MobileReportsWidget',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immFileWrappers: PropTypes.instanceOf(Imm.List).isRequired,
    listFilterType: PropTypes.string.isRequired,
    totalFiles: PropTypes.number.isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    }),
    // See PaginationNavMixin.js for pagination related query parameters, and ExposureStore.js's `activeListFilters` section for list filter parameters.
    query: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [FolderViewMixin, ListFilterMixin, PaginationNavMixin],

  componentWillMount: function() {
    // There should be nothing on the mobile backNav stack if we're here.
    if (!this.props.immExposureStore.get('backNavActionStack').isEmpty()) {
      ExposureActions.clearBackNavActionStack();
    }
  },

  navigateToReport: function(fileType, fileId) {
    var route = this.props.params.fileId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : RouteNameConstants.EXPOSURE_FOLDERS;
    ExposureActions.pushBackNavAction(Imm.Map({
      text: FrontendConstants.BACK_TO_REPORT_LIST,
      backAction: this.urlTransitionTo.bind(null, route, this.props.params, this.props.query)}));
    ExposureActions.clearFileFilterState(fileId);
    this.urlTransitionTo(
      RouteHelpers.getRouteForFileType(fileType),
      {fileId: fileId},
      fileType === ExposureAppConstants.FILE_TYPE_FOLDER ? {page: 1, pageSize: ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE} : null);
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var listViewInvalid = this.listViewInvalid();

    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }
    if (!this.areFilesReady(immExposureStore, this.state.renderedEnough) || immExposureStore.get('folderRequest')) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }

    var listItems = this.props.immFileWrappers.map(function(fileWrapper) {
      var metadata = [
        span({className: 'item-metadata-modified', key: 'imm'}, 'modified ' + Util.dateSinceFormatter(fileWrapper.getIn(['file', 'updatedAt'])))
      ];
      if (fileWrapper.getIn(['metadata', 'newInformation'], false)) {
        metadata.unshift(div({className: 'icon-eye', key: 'ie'}));
      }
      if (fileWrapper.get('isShared', false)) {
        metadata.unshift(div({className: 'icon-share', key: 'is'}));
      }
      if (fileWrapper.getIn(['metadata', 'isStarred'], false)) {
        metadata.unshift(div({className: 'icon-star-full', key: 'if'}));
      } else {
        metadata.unshift(div({className: 'icon-star-empty', key: 'ise'}));
      }
      var fileType = fileWrapper.getIn(['file', 'fileType']);
      var fileId = fileWrapper.getIn(['file', 'id']);
      var fileTitle = fileWrapper.getIn(['file', 'title']);
      var action = this.navigateToReport.bind(null, fileType, fileId);
      return {contents: [
          div({className: cx('item-header', Util.getFileTypeIconName(fileType, fileTitle)), key: 'ih'},
            fileWrapper.getIn(['file','title'])),
          div({className: 'item-metadata', key: 'im'}, metadata)
        ],
        icon: 'icon-arrow-right',
        action: action
      };
    }, this).toJS();

    var route = this.props.params.fileId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : RouteNameConstants.EXPOSURE_FOLDERS;
    var filterPaneOpen = immExposureStore.get('showListFilterPane', false);
    var content = filterPaneOpen ?
      ListFilters({immExposureStore: immExposureStore,
        handleClose: ExposureActions.toggleListFilterPane,
        handleReset: this.handleFilterReset.bind(null, this.props.listFilterType),
        handleSelect: this.handleFilterSelection.bind(null, this.props.listFilterType),
        listFilterType: this.props.listFilterType,
        filterHelpFile: 'FOLDERVIEW_FILTER'}) :
      [div({className: 'page-header', key: 'ph'},
        Breadcrumbs({
          immExposureStore,
          fileId: this.props.params.fileId,
          isMobile: true
        }),
        div({className: 'header-buttons'},
          SimpleAction({class: 'icon-filter2', text: FrontendConstants.FILTERS, onClick: ExposureActions.toggleListFilterPane})
        )
      ),
      MobileListView({listItems: listItems, key: 'mlv'}),
      PaginationWidget({
        key: 'pw',
        curPage: parseInt(this.props.query.page, 10),
        pageChangeHandler: this.goToPage.bind(null, route, this.props.params),
        rowsPerPage: ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE,
        rowsPerPageChangeHandler: this.setPageSize.bind(null, route, this.props.params),
        totalRows: this.props.totalFiles
      })];

    return div({className: cx('list-view', {'show-filters': filterPaneOpen})},
      content
    );
  }
});

module.exports = MobileReportsWidget;
