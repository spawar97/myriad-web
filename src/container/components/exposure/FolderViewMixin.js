var _ = require('underscore');

var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');

/*
 * This Mixin is to define some React lifecycle methods in components for Reports Landing Page.
 *
 * Used by: FolderViewWidget, MobileReportsWidget
 * Required child functions/fields: defaultPageSize, isValidPageSize, props.query, props.immExposureStore
 */
var FolderViewMixin = {

  routeName: RouteNameConstants.EXPOSURE_FOLDERS,
  storeName: 'immExposureStore',
  storeKey: 'folderView',

  getInitialState: function() {
    // Tracks whether we've done sufficient preliminary render passes. Here one initial render pass is sufficient.
    return {renderedEnough: false};
  },

  shouldComponentUpdate: function(nextProps) {
    // Wait for store change, no need to render when query is changing.
    return _.isEqual(this.props.query, nextProps.query);
  },

  componentWillReceiveProps: function(nextProps) {
    var immExposureStore = this.props.immExposureStore;
    var newFolderId = nextProps.params.fileId;

    if (!nextProps.query.pageSize && !nextProps.query.page) {
      var route = newFolderId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : this.routeName;
      this.context.router.replace({name: route, params: {fileId: newFolderId}, query: {page: 1, pageSize: this.defaultPageSize}});
      return;
    }
    // Fetch when query params changed.
    if (this.props.params.fileId !== newFolderId || !_.isEqual(this.props.query, nextProps.query)) {
      ExposureActions.folderViewRefreshCheckedFileIds();
      var folderId = newFolderId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
      this.loadFolder(folderId, nextProps.query);
      GA.sendDocumentOpen(folderId, GA.DOCUMENT_TYPE.FOLDER);
    }

    // Fetch when filters change.
    if (immExposureStore.getIn(['activeListFilters', ExposureAppConstants.LIST_FILTER_TARGET_FOLDERS]) !== nextProps.immExposureStore.getIn(['activeListFilters', ExposureAppConstants.LIST_FILTER_TARGET_FOLDERS])) {
      ExposureActions.fetchFolderWithParameters(newFolderId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID, nextProps.query);
    }

    if (this.areFilesReady(this.props.immExposureStore, this.state.renderedEnough)) {
      this.setState({renderedEnough: true});
    }
  },

  componentDidMount: function() {
    var newFolderId = this.props.params.fileId;
    var pageSizeStr = this.props.query.pageSize;
    var pageNumStr = this.props.query.page;

    if (!Util.isPositiveInteger(pageSizeStr) || !Util.isPositiveInteger(pageNumStr)) {
      // Redirect if both are undefined, null, '' or invalid.
      if (!pageSizeStr && !pageNumStr) {
        var route = newFolderId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : this.routeName;
        this.context.router.replace({name: route, params: {fileId: newFolderId}, query: _.extend({}, this.props.query, {page: 1, pageSize: this.defaultPageSize})});
      } else {
        ExposureActions.folderViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      }
      return;
    }
    if (!this.isValidPageSize()) {
      ExposureActions.folderViewSetIsValid(ListViewConstants.LIST_VIEW_INVALID_QUERY);
      return;
    }
    var pageSettings = Util.packagePageSettings(this.props.query);
    var folderId = newFolderId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
    this.loadFolder(folderId, pageSettings);
    GA.sendDocumentOpen(folderId, GA.DOCUMENT_TYPE.FOLDER);
  },

  fileRequestInFlight: function(immExposureStore) {
    return immExposureStore.get('files').some(function(immFile) {
      return immFile.get('fileRequestInFlight');
    });
  },

  listViewInvalid: function() {
    if (!this.props.immExposureStore.get('folderRequest')) {
      switch (this.props.immExposureStore.getIn(['folderView', 'isValid'])) {
        case ListViewConstants.LIST_VIEW_VALID:
          return null;
        case ListViewConstants.LIST_VIEW_INVALID_QUERY:
          return FrontendConstants.ERROR_URL_QUERY;
        case ListViewConstants.LIST_VIEW_NOT_FOUND:
          return FrontendConstants.ERROR_NOT_FOUND;
        default:
          return null;
      }
    } else {
      return null;
    }
  },

  // Check if the files for a folder have loaded.
  areFilesReady: function(immExposureStore, renderedEnough) {
    var filesExist = !immExposureStore.get('files').isEmpty();
    var folderViewFileIdsExist = !immExposureStore.getIn(['folderView', 'fileIds']).isEmpty();
    var folderViewIsEmpty = immExposureStore.getIn(['folderView', 'isEmpty'], false);
    var folderRequestInFlight = immExposureStore.has('folderRequest');
    // Fully loaded, or reloading from fully loaded.
    var isReady = filesExist && folderViewFileIdsExist ||
      // An empty folder, first load.
      !filesExist && !folderRequestInFlight && !folderViewFileIdsExist && renderedEnough  && folderViewIsEmpty ||
      // An empty folder, subsequent loads. The last check makes sure we aren't still loading an individual file.
      // It's pulled out into a separate function so that the heavier loop over all files is only performed if all
      // short-circuits were avoided.
      filesExist && !folderRequestInFlight && !folderViewFileIdsExist && !this.fileRequestInFlight(immExposureStore)  && folderViewIsEmpty;
    return isReady;
  },

  // If we do not have folder file data inside file store, fetch it first and the call's "onSuccess" will call fetchFolderWithParameters.
  loadFolder: function(folderId, pageSettings) {
    var immFolder = this.props.immExposureStore.getIn(['files', folderId]);
    if (!immFolder) {
      ExposureActions.fetchFile(folderId, pageSettings);
    } else {
      ExposureActions.fetchFolderWithParameters(folderId, pageSettings);
    }
  }
};

module.exports = FolderViewMixin;
