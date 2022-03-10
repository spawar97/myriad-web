var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
import PropTypes from 'prop-types';

var BaseListViewMixin = require('./BaseListViewMixin');
var Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var FolderViewMixin = require('./FolderViewMixin');
var ListFilterMixin = require('./ListFilterMixin');
var ListFilters = React.createFactory(require('./ListFilters'));
var PaginationNavMixin = require('./PaginationNavMixin');
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var RouteHelpers = require('../../http/RouteHelpers');
var AccountUtil = require('../../util/AccountUtil');
var GA = require('../../util/GoogleAnalytics');
const AddMenu = React.createFactory(require('./AddMenu'));

// This class is dependent on the FixedDataTable class.
var Table = React.createFactory(FixedDataTable.Table);

var div = React.createFactory(require('../TouchComponents').TouchDiv);

var FolderViewWidget = createReactClass({
  displayName: 'FolderViewWidget',

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

  mixins: [BaseListViewMixin, FolderViewMixin, ListFilterMixin, PaginationNavMixin],

  allowedFilesTypes: [
    ExposureAppConstants.FILE_TYPE_REPORT,
    ExposureAppConstants.FILE_TYPE_DASHBOARD,
    ExposureAppConstants.FILE_TYPE_MONITOR,
    ExposureAppConstants.FILE_TYPE_BUILTIN,
    ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT,
    ExposureAppConstants.FILE_TYPE_DATA_REVIEW
  ],

  getDefaultProps: function() {
    return {listFilterType: ExposureAppConstants.LIST_FILTER_TARGET_FOLDERS};
  },

  componentWillMount: function() {
    // There should be nothing on the mobile backNav stack if we're here.
    if (!this.props.immExposureStore.get('backNavActionStack').isEmpty()) {
      ExposureActions.clearBackNavActionStack();
    }

    ExposureActions.folderViewSetColumnOption('edit', true);
  },

  createHeaderContentHandler: function(colName) {
    switch (colName) {
      case 'isShared':
        return div({className: 'icon-share'});
      case 'isStarred':
        return div({className: 'icon-star-full'});
      case 'newInformation':
        return div({className: 'icon-eye'});
      default:
        return this.columnNameMap[colName];
    }
  },

  /*
   * Two pass calculation here.
   *
   * 1. Calculate the width of each column in the table to fit the data.
   *    It iterates through immFileWrappers to see data on each cell to calculate the min width to fit them.
   * 2. Resize resizable columns' widths to fit the whole table width.
   *    This is done so that we do not have any leftover space on the right when widths of columns added is
   *    less than the width of the containing table.
   *    Note: This second pass happens in `constructTableArgs`
   */
  getColumnWidths: function() {
    var widths = BaseListViewMixin._getColumnWidths(
      this.props.immExposureStore.getIn(['folderView', 'displayedColumns']),
      this.props.immFileWrappers,
      this.props.immExposureStore);
    // This is a stopgap measure to get the report title to display more reasonably until we implement the new list
    // view design. 300px was chosen manually to be "good enough".
    // TODO: Investigate the measurement and adjustment algorithms, there are likely issues with those.
    widths['title'] = _.max([widths['title'], 300]);
    return widths;
  },

  openFolderItem: function(id, rowIndex, fileType) {
    // TODO: update ExposureActions.pushBackNavAction for monitor.
    var route = this.props.params.fileId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : RouteNameConstants.EXPOSURE_FOLDERS;
    ExposureActions.pushBackNavAction(Imm.Map({
      text: FrontendConstants.BACK_TO_REPORT_LIST,
      backAction: this.urlTransitionTo.bind(null, route, this.props.params, this.props.query)}));
    ExposureActions.clearFileFilterState(id);
    this.urlTransitionTo(
      RouteHelpers.getRouteForFileType(fileType),
      {fileId: id},
      fileType === ExposureAppConstants.FILE_TYPE_FOLDER ? {page: 1, pageSize: this.defaultPageSize} : null);
  },

  getHandleOpenAction: function(id, rowIndex) {
    var fileType = this.props.immFileWrappers.getIn([rowIndex, 'file', 'fileType']);

    return [
      // Route.
      RouteHelpers.getRouteForFileType(fileType),
      // Params.
      {fileId: id},
      // Query.
      fileType === ExposureAppConstants.FILE_TYPE_FOLDER ? {page: 1, pageSize: this.defaultPageSize} : null,
      // Mobile Func.
      this.openFolderItem.bind(null, id, rowIndex, fileType)
    ];
  },

  // We are returning an array of the parameters to apply to `this.context.router.push`.
  getEditTransitionParams: function(id, rowIndex) {
    // A user must have EDIT on the file and CREATE_TARGET on the account in order to edit the file.
    if (this.props.immFileWrappers.getIn([rowIndex, 'canEdit'])) {
      var fileType = this.props.immFileWrappers.getIn([rowIndex, 'file', 'fileType']);
      switch (fileType) {
        // It's meaningless to edit a built-in report.
        case ExposureAppConstants.FILE_TYPE_BUILTIN:
          return null;
        case ExposureAppConstants.FILE_TYPE_DASHBOARD:
          return [RouteNameConstants.EXPOSURE_DASHBOARDS_EDIT, {fileId: id}, null];
        case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
          return [RouteNameConstants.EXPOSURE_DATA_REVIEW_EDIT, {fileId: id}, null];
        case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
          return [RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_EDIT, {fileId: id}, null];
        case ExposureAppConstants.FILE_TYPE_MONITOR:
          // The edit link takes you to the programmer UI which only admins should have access to.
          return AccountUtil.hasPrivilege(this.props.immExposureStore, 'isAdmin') ?
            [RouteNameConstants.EXPOSURE_MONITORS_EDIT, {fileId: id}, null] : null;
        case ExposureAppConstants.FILE_TYPE_REPORT:
          var immTemplatedReport = this.props.immFileWrappers.getIn([rowIndex, 'file', 'templatedReport'], Imm.Map());
          if (immTemplatedReport.get('isAdvancedReport', false)) {
            return [RouteNameConstants.EXPOSURE_TEMPLATES_EDIT_ADVANCED_REPORT, {advancedReportId: id}, null];
          } else {
            return [immTemplatedReport.isEmpty() ? RouteNameConstants.EXPOSURE_REPORTS_EDIT : RouteNameConstants.EXPOSURE_ADHOC_REPORTS_EDIT, {fileId: id}, null];
          }
      }
    }
  },

  fileAccessor: function(immData, rowIndex) {
    return immData.getIn([rowIndex, 'file']);
  },

  specialCellRenderer: function(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immExposureStore,
      this.props.immExposureStore.getIn(['folderView', 'fileIds']),
      this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']),
      this.props.immFileWrappers,
      this.fileAccessor,
      ExposureActions.folderViewSetCheckedFileIds,
      ExposureActions.folderViewSetIsStarred,
      this.getHandleOpenAction,
      this.getEditTransitionParams,
      cellDataKey,
      rowIndex
    );
  },

  filesSelected: function() {
    var immCheckedFileIds = this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']);
    return immCheckedFileIds.size;
  },

  deleteFilesHandler: function() {
    GA.sendDocumentsDelete(this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']).toJS());
    if (this.filesSelected() > 0) {
      ExposureActions.deleteFiles(this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']).toJS(), this.props.params.fileId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID, this.props.query);
    } else {
      ExposureActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_AT_LEAST_ONE_FOLDER_REPORT_OR_DASHBOARD_TO_DELETE);
    }
  },

  shareFilesHandler: function() {
    if (this.filesSelected() === 0) {
      ExposureActions.displayActionCouldNotBeCompletedModal(
        FrontendConstants.PLEASE_SELECT_FILES_TO_SHARE);
    } else {
      ExposureActions.shareFilesModal(
        this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']).toList());
    }
  },

  renameFolderHandler: function() {
    switch(this.filesSelected()) {
      case 0:
        ExposureActions.displayActionCouldNotBeCompletedModal(FrontendConstants.PLEASE_SELECT_ONE_FOLDER_TO_RENAME);
        break;
      case 1:
        if (this.isSingleFileSelected([ExposureAppConstants.FILE_TYPE_FOLDER])) {
          ExposureActions.renameFolderModal(this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']).toList().get(0), this.props.query);
        } else {
          ExposureActions.displayActionCouldNotBeCompletedModal(FrontendConstants.ONLY_ONE_FOLDER_CAN_BE_RENAMED_AT_THIS_TIME);
        }
        break;
      default:
        ExposureActions.displayActionCouldNotBeCompletedModal(FrontendConstants.ONLY_ONE_FOLDER_CAN_BE_RENAMED_AT_THIS_TIME);
    }
  },

  isSingleFileSelected: function(fileTypes) {
    var immCheckedFileIds = this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']);
    if (immCheckedFileIds.size !== 1) {
      return false;
    }
    var fileId = immCheckedFileIds.toList().get(0);
    return _.contains(fileTypes, this.props.immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType']));
  },

  handleCheckAll: function() {
    if (this.filesSelected() > 0) {
      ExposureActions.applyCheckAll(true);
    } else {
      ExposureActions.applyCheckAll(false);
    }
  },

  checkFilesAllowance(fileTypes, selectedFilesIds) {
    const { immExposureStore } = this.props;
    return !selectedFilesIds.some(
        fileId => !_.contains(
          fileTypes,
          immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType'])
        )
    );
  },

  moveFilesHandler: function() {
    const { immExposureStore, params, query } = this.props;
    const selectedFilesCount = this.filesSelected();

    if (selectedFilesCount === 0) {
      ExposureActions.displayActionCouldNotBeCompletedModal(
        FrontendConstants.PLEASE_SELECT_ONE_REPORT_DASHBOARD_OR_MONITOR_TO_MOVE
      );
    } else {
      const selectedFilesIds = immExposureStore.getIn(['folderView', 'checkedFileIds']).toList();
      const areSelectedFilesAllowedToMove = this.checkFilesAllowance(this.allowedFilesTypes, selectedFilesIds);

      if (areSelectedFilesAllowedToMove) {
          const folderId = params.fileId || ExposureAppConstants.REPORTS_LANDING_PAGE_ID;
          ExposureActions.moveFiles(selectedFilesIds, folderId, query);
      } else {
          ExposureActions.displayActionCouldNotBeCompletedModal(
          FrontendConstants.ONLY_DASHBOARD_REPORTS_OR_MONITORS_CAN_BE_MOVED_AT_THIS_TIME
        );
      }
    }
  },

  isMoreMenuDeleteOptionEnabled: function() {
    const immCheckedFileIds = this.props.immExposureStore.getIn(['folderView', 'checkedFileIds']);
    return immCheckedFileIds.some(fileId => {
      const fileType = this.props.immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType']);
      return fileType !== ExposureAppConstants.FILE_TYPE_BUILTIN
    })
  },

  render: function() {
    var immExposureStore = this.props.immExposureStore;
    var immFolderView = immExposureStore.get('folderView');
    var listViewInvalid = this.listViewInvalid();


    if (!_.isNull(listViewInvalid)) {
      return div(null, listViewInvalid);
    }
    if (!this.areFilesReady(immExposureStore, this.state.renderedEnough) || immExposureStore.get('folderRequest')) {
      return ContentPlaceholder();
    }
    var immColNames = immFolderView.get('displayedColumns').filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    var immSortOrdering = this.createSortOrdering(immColNames, this.props.query);
    var fileId = this.props.params.fileId;
    var checkAll = this.handleCheckAll;

    var route = fileId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : RouteNameConstants.EXPOSURE_FOLDERS;
    var tableArgs = this.constructTableArgs(
      this.props.immFileWrappers.size,
      immFolderView.get('displayedColumns'),
      Imm.Set(['isShared', 'isStarred', 'newInformation']),
      this.setColumnSort.bind(null, ExposureActions.folderViewRefreshCheckedFileIds, route, {fileId: fileId}),
      immSortOrdering,
      this.specialCellRenderer,
      this.getColumnWidths,
      false,  // skipCheckBoxes.
      false,  // skipOpen.
      checkAll
    );

    // Hide when there are no reports on the page.
    var listViewBar = this.props.totalFiles === 0 ? null : div({className: 'list-view-bar'},
      this.getCogColumnSelectDropdown(immFolderView.get('displayedColumns'), immColNames, ExposureActions.folderViewSetColumnOption, function (colName) {
        switch (colName) {
          case 'isShared':
            return 'icon-share';
          case 'isStarred':
            return 'icon-star-full';
          case 'newInformation':
            return 'icon-eye';
          default:
            return null;
        }
      })
    );

    // A user must have CREATE_TARGET privilege to `create report`, `create folder`, `create advanced report` and `create dashboard`.
    var userHasCreateTarget = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTarget');
    var userIsAdmin = AccountUtil.hasPrivilege(immExposureStore, 'isAdmin');
    // Besides CREATE_TARGET privilege, a user must be on the top-level directory and on desktop platform to add folder.
    var filterPaneOpen = immExposureStore.get('showListFilterPane', false);

    var content = (immFolderView.get('fileIds').isEmpty()) ?
      EmptyContentNotice({noticeText: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.ANALYTICS)}) :
      div({className: 'list-view-table folder-view-table'}, Table.apply(null, tableArgs));

    var moreMenu = Menu({className: 'more-menu'},
      MenuTrigger({className: 'more-menu-trigger'}, div({className: 'react-menu-icon icon-menu2'}, FrontendConstants.MORE)),
      MenuOptions({className: 'more-menu-options'},
        MenuOption({className: 'more-menu-share',
            onSelect: this.shareFilesHandler},
          div({className: 'react-menu-icon icon-share menu-item-share'}, FrontendConstants.SHARE)),
        MenuOption({className: 'more-menu-move',
            onSelect: this.moveFilesHandler},
          div({className: 'react-menu-icon icon-move menu-item-move'}, FrontendConstants.MOVE)),
        this.isMoreMenuDeleteOptionEnabled()
          ? MenuOption({className: 'more-menu-delete', onSelect: this.deleteFilesHandler}, 
          div({className: 'react-menu-icon icon-remove menu-item-delete'}, FrontendConstants.DELETE))
          : null,
        userHasCreateTarget && this.isSingleFileSelected([ExposureAppConstants.FILE_TYPE_FOLDER]) ? MenuOption({className: 'more-menu-rename-folder',
            onSelect: this.renameFolderHandler},
          div({className: 'react-menu-icon icon-pencil menu-item-rename-folder'}, FrontendConstants.RENAME_FOLDER)) : null
      )
    );

    return div({className: cx('list-view', {'show-filters': filterPaneOpen})},
      div({className: 'page-header'},
        Breadcrumbs({
          immExposureStore: immExposureStore,
          fileId: this.props.params.fileId
        }),
        div({className: 'header-buttons'},
          SimpleAction({class: 'icon-filter2', text: FrontendConstants.FILTERS, onClick: ExposureActions.toggleListFilterPane}),
          AddMenu({immExposureStore: immExposureStore, query: this.props.query, fileId: fileId}),
          moreMenu
        )
      ),
      listViewBar,
      ListFilters({immExposureStore: immExposureStore,
        handleClose: ExposureActions.toggleListFilterPane,
        handleReset: this.handleFilterReset.bind(null, this.props.listFilterType),
        handleSelect: this.handleFilterSelection.bind(null, this.props.listFilterType),
        listFilterType: this.props.listFilterType,
        filterHelpFile: 'FOLDERVIEW_FILTER'}),
      div({className: cx('list-view-table-container', {'show-filters': filterPaneOpen})},
        content,
        PaginationWidget({
          curPage: parseInt(this.props.query.page, 10),
          pageChangeHandler: this.goToPage.bind(null, route, this.props.params),
          rowsPerPage: parseInt(this.props.query.pageSize, 10),
          rowsPerPageChangeHandler: this.setPageSize.bind(null, route, this.props.params),
          totalRows: this.props.totalFiles
        })
      )
    );
  }
});

module.exports = FolderViewWidget;
