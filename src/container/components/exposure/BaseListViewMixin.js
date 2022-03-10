var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');

// This class is dependent on the FixedDataTable class.
var Column = React.createFactory(FixedDataTable.Column);

var Checkbox = React.createFactory(require('../Checkbox'));
var FixedDataTableHeader = React.createFactory(require('../FixedDataTableHeader'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var TaskAssignees = React.createFactory(require('../TaskAssignees'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');
import DataReviewUtil from "../../util/DataReviewUtil";
import FrontendConstants from '../../constants/FrontendConstants';

const Link = React.createFactory(require('react-router').Link);

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);
var TaskDescription = React.createFactory(require('../TaskDescription'));

/**
 * This mixin serves as the base for all list view tabs, by providing common functionality including
 * column resizing, column width calculation, rendering of shared columns and window resizing.
 */
var BaseListViewMixin = {
  columnNameMap: {
    fileType: 'Type',
    favoriteType: 'Type',
    title: 'Title',
    isStarred: 'Favorite',
    isShared: 'Shared',
    createdAt: 'Created',
    updatedAt: 'Updated',
    edit: 'Edit',
    open: 'Open',
    dueDate: 'Due Date',
    newInformation: 'New Information',
    createdBy: 'Created by',
    authorId: 'Author',
    assigneeIds: 'Assignees',
    name: 'Teams',
    numUsers: 'No. of Users',
    description: 'Description',
    dashboardId: 'Dashboard',
    reportId: 'Analytics',
    taskType: 'Task Type',
    taskState: 'Task State',
    urgency: 'Urgent',
    email: 'Email',
    lastName: 'Last Name',
    firstName: 'First Name',
    userEntityState: 'Status',
    group: 'Team',
    role: FrontendConstants.USER_TYPE,
    dataAccessProfileName: 'Data Access Group',
    studyId: 'Study ID',
    studyName: 'Study Name',
    reviewRoleName: 'Review Role Name',
    reviewRoleState: 'Status',
  },

  // Mandatory columns should always display in a table, the column dropdown item for such column will be disabled.
  mandatoryColumns: ['title', 'email', 'name'],
  iconColumns: ['edit', 'isShared', 'isStarred', 'newInformation', 'urgency'],
  headerHeight: 40,

  getDefaultProps: function() {
    return {
      specialColWidths: {
        checkBox: 60,
        open: 80
      }
    };
  },

  getInitialState: function() {
    return {colWidths: null};
  },

  componentDidMount: function() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.handleResize);
  },

  createSortOrdering: function(immColNames, query) {
    var immSortOrdering = Imm.OrderedMap();
    var sortColumnStr = query.sortColumn;
    var sortOrderingStr = query.sortOrdering;
    if (sortColumnStr && sortOrderingStr && immColNames.contains(sortColumnStr) && _.contains(['asc', 'desc'], sortOrderingStr)) {
      immSortOrdering = immSortOrdering.set(sortColumnStr, sortOrderingStr);
    }
    return immSortOrdering;
  },

  // handleResize is attached at componentDidMount. The first render will trigger getColumnWidths before
  // setting the width but colWidths will be re-initialized after data load.
  handleResize: function() {
    var $widgetDOM = $(ReactDOM.findDOMNode(this));
    this.setState({width: $widgetDOM.width()});
  },

  dropdownCheckBoxClickHandler: function(dropdownHandler, colName, newState) {
    dropdownHandler(colName, newState);
    this.setState({colWidths: null});
  },

  getCogColumnSelectDropdown: function(immDisplayedColumns, immColNames, dropdownHandler, colNameToIconName) {
    // Return either the icon classname for this column or empty string.
    var iconClassName = function(colName) {
      return _.isFunction(colNameToIconName) && colNameToIconName(colName) || '';
    };

    var dropdownCheckBoxClickHandler = function(dropdownHandler, colName, newState) {
      dropdownHandler(colName, newState);
      this.setState({colWidths: null});
    };

    var dropdownItems = immDisplayedColumns.keySeq().map(function(colName) {
      var disabled = _.contains(this.mandatoryColumns, colName);
      var clickHandler = disabled ? _.noop :
        dropdownCheckBoxClickHandler.bind(this, dropdownHandler, colName, !immDisplayedColumns.get(colName));
      var checkBox = Checkbox({checkedState: immColNames.contains(colName)});
      return {content:
        div({key: colName, className: cx('column-select-item', {disabled: disabled}), onClick: clickHandler},
          checkBox,
          span({className: cx(iconClassName(colName), 'column-name')}, this.columnNameMap[colName]))};
    }, this).toJS();

    return SimpleDropdown({
      opener: div({className: 'icon-cog'}),
      selectCheckDisabled: true,
      scrollbarDisabled: true,
      items: dropdownItems
    });
  },

  headerRenderer: function(sortHandler, createHeaderContentHandler, immSortOrdering, indexColNameMap, label, colIndex) {
    var colName = indexColNameMap[colIndex];
    var colOrdering = immSortOrdering.get(colName, '');
    var sortIndex = {asc: 0, desc: 1, '': 2}[colOrdering];
    var contents = createHeaderContentHandler(colName);

    switch (colName) {
      case 'edit':
        return FixedDataTableHeader({contents: contents});
      default:
        return FixedDataTableHeader({
          contents: contents,
          sortHandler: sortHandler ? sortHandler.bind(null, colName) : null,
          sortIndex: sortIndex
        });
    }
  },

  _getColumnIcon: function(colName, id, rowIndex, immDatum, immDatumMetadata, starredRowHandler, getEditTransitionParams, isShared) {
    let fileType = immDatum.get('fileType') || ExposureAppConstants.FILE_TYPE_TASK;
    switch(colName) {
      case 'isShared':
        if (isShared) {
          return div({className: 'icon-share'});
        } else {
          return null;
        }
      case 'isStarred':
        // Embedded reports cannot be favorited
        if (fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT) {
          return div({className: cx('icon-star-empty', 'icon-star-disabled')})
        }
        if (immDatumMetadata && immDatumMetadata.get('isStarred')) {
          return div({className: 'icon-star-full', onClick: starredRowHandler.bind(null, rowIndex, false, immDatum.get('id'), fileType)});  // Tasks do not have that field set
        } else {
          return div({className: 'icon-star-empty', onClick: starredRowHandler.bind(null, rowIndex, true, immDatum.get('id'), fileType)});  // TODO: Fix this when we have new starrable items
        }
      case 'newInformation':
        // The user may not have metadata on the item yet, if not use -MAX_VALUE so they always get newInformation.
        var lastViewed = immDatumMetadata ? immDatumMetadata.get('lastViewed') : -Number.MAX_VALUE;
        if (immDatum.get('lastDataSync') && immDatum.get('lastDataSync') > lastViewed ||
          immDatum.get('updatedAt') && immDatum.get('updatedAt') > lastViewed) {
          return div({className: 'icon-eye'});
        } else {
          return null;
        }
      case 'urgency':
        if ((!immDatum.get('coreTaskAttributes') && immDatum.get('urgency')) || (immDatum.get('coreTaskAttributes') && immDatum.getIn(['coreTaskAttributes', colName]))) {
          return div({className: 'icon-WarningCircle'});
        } else {
          return null;
        }
      // `edit` column is a pencil icon cell with link that send the user to the corresponding url
      // to edit a report or dashboard. FOLDER fileType is currently inapplicable, hence the edit cell for those files will be empty.
      case 'edit':
        const editTransitionParams = this.getEditTransitionParams(id, rowIndex);
        if (editTransitionParams) {
          const [route, params, query] = editTransitionParams;
          const location = {name: route, params, query};
          return Link({className: cx('edit-item', 'icon-pencil'), to: location, onClick: ExposureActions.clearFileFilterState.bind(null, id)});
        }
    }
  },

  // _getColumnText requires a store (could be immExposureStore or immAdminStore) to obtain the text each cell has.
  _getColumnText: function(immStore, colName, immDatum) {
    let columnValue;
    if(immDatum.get('coreTaskAttributes')){
      columnValue = immDatum.getIn(['coreTaskAttributes', colName]);
    }else{
      columnValue = immDatum.get(colName);
    }
    switch(colName) {
      case 'dashboardId':
        const dashboardFileName = Util.getFileName(immStore, columnValue);
        return _.isEmpty(dashboardFileName) ? '-' : dashboardFileName;
      case 'reportId':
        let reportFileName = '';
        if (!immDatum.getIn(['extendedTaskAttributes','fromYellowfinReport'])) {
          reportFileName = Util.getFileName(immStore, columnValue);
        } else {
          reportFileName = immDatum.getIn(['extendedTaskAttributes','reportName']);
        }
        return _.isEmpty(reportFileName) ? '-' : reportFileName;
      case 'authorId':
        let username = Util.getUserFullName(immStore.get('users'), columnValue);
        return username ? username : immDatum.get('monitorTitle');
      case 'assigneeIds':
        return Util.getListOfUserOrTeamNames(immStore.get('users'), immStore.get('groupEntities'), columnValue);
      case 'createdBy':
        return Util.getUserFullName(immStore.get('users'), immDatum.get('authorId'));
      case 'lastDataSync':
      case 'createdAt':
      case 'updatedAt':
      case 'dueDate':
        return Util.dateFormatterUTC(columnValue);
      // When the column name is userEntityState, firstName, lastName and email, immDatum is a wrapper.
      case 'userEntityState':
        return Util.getUserStatus(immDatum).text;
      case 'role':
        return immDatum.getIn(['role', 'name']);
      case 'firstName':
      case 'lastName':
        return immDatum.getIn(['user', colName]);
      case 'email':
        // A user's email is represented by his/her username.
        return immDatum.getIn(['user', 'username']);
      case 'numUsers':
        // The number of users in a group is determined by the length of the group's `userEntities` array.
        return immDatum.get('userEntityIds', Imm.List()).size;
      case 'fileType':
        if (immDatum) {
          let type = immDatum.get(colName);
          return Util.getFileTypeName(type, immDatum.get('title'));
        } else {
          return null;
        }
      case 'taskType':
        if(immDatum.get('coreTaskAttributes')){
          return immDatum.getIn(['coreTaskAttributes', 'taskType', 'name']);
        }
        return immDatum.getIn(['extendedTaskAttributes', 'taskType', 'name']);
      case 'taskState':
        if(immDatum.get('coreTaskAttributes')){
          return immDatum.getIn(['coreTaskAttributes', 'taskState', 'name']);
        }
        return immDatum.getIn(['extendedTaskAttributes', 'taskState', 'name']);
      case 'title':
      case 'name':
      case 'description':
      default:
        return immDatum ? columnValue : null;
    }
  },

  // TODO: NOTE: THIS DOES NOT WORK PROPERLY ANYMORE. The accessorFunction is not returning a working function to
  // figure out the max width of the column. However, when the method was originally written, it was done for
  // values that are text-only (now there are icons, etc), so fixing it will most likely cascade issues.
  _getTextColumnWidth: function(ctx, immData, accessorFunction, colName) {
    return immData.reduce(function(memo, immDatum) {
      // Text cell padding is 20px (left) + 20px (right).
      return _.max([Util.getTextWidth(ctx, accessorFunction(immDatum) + 40), memo]);
      // We initialize the memo with the column header cell width.
      // |pad|text|pad|icon|pad|
      // | 20|????|10 | 16 | 20|
    }, Util.getTextWidth(ctx, this.columnNameMap[colName]) + 66);
  },

  // This function defines how a cell should be rendered. It uses _getColumnText and _getColumnIcon to gather those info.
  // _getColumnText requires a store (could be immExposureStore or immAdminStore) to obtain the text each cell has.
  // getHandleOpenAction should be a function that returns an array like [route, params, query, mobileOnclick]
  _specialCellRenderer: function(
    indexColNameMap,
    immStore,
    immIds,
    immCheckedIds,
    immData,
    dataAccessor,
    checkedRowHandler,
    starredRowHandler,
    getHandleOpenAction,
    getEditTransitionParams,
    cellDataKey,
    rowIndex) {

    function starredRowHandlerWithGA(index, isStarred, itemId, type) {
      if (isStarred) {
        GA.sendDocumentFavorite(itemId, type.toUpperCase());
      } else {
        GA.sendDocumentUnfavorite(itemId, type.toUpperCase());
      }
      starredRowHandler(index, isStarred);
    }
    var isNotDesktop = Util.isNotDesktop();
    var id = immIds.get(rowIndex);
    let colName = indexColNameMap[cellDataKey];
    let immDatum = dataAccessor(immData, rowIndex, colName);
    const fileType = immDatum ? immDatum.get('fileType') : ExposureAppConstants.FILE_TYPE_TASK;
    const isDataAccessGroupList = immDatum ? immDatum.has('dataAccessProfileName') : false;
    const isDataReviewRoleList = this.storeKey && this.storeKey === 'dataReviewRolesView';

    if (cellDataKey === 'checkBox') {  // for checkbox column
      // Disable checkboxes for workflows not intended to be editable by end users. For example, embedded
      // reports, the all access data access profile, etc.
      const disabled = fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT
        || (isDataAccessGroupList && immDatum.get('id') === '00000000-0000-0000-0000-000000000000');

      if (disabled) {
        return div({className: 'input-checkbox'},
          Checkbox({
            dimmed: true,
            checkedState: false
          })
        );
      } else {
        return div({className: 'input-checkbox'},
          Checkbox({
            dimmed: false,
            checkedState: immCheckedIds.contains(id),
            onClick: checkedRowHandler.bind(null, rowIndex)
          })
        );
      }
    } else if (cellDataKey === 'open') {  // for open button column
      const linkInfo = getHandleOpenAction(id, rowIndex);
      if (linkInfo) {
        const [route, params, query, mobileOnclick] = linkInfo;
        const location = {name: route, params, query};
        return isNotDesktop && _.isFunction(mobileOnclick) ?
          span({className: 'icon-arrow-right', onClick: mobileOnclick}) :
          Link({className: cx('icon-arrow-right'), to: location, onClick: ExposureActions.clearFileFilterState.bind(null, id)});
      }
      return span({className: 'icon-arrow-right'});
    } else {
      var immDatumMetadata = immData.getIn([rowIndex, 'metadata']);
      var isShared = immData.getIn([rowIndex, 'isShared']);

      if (_.contains(this.iconColumns, colName)) {
        return this._getColumnIcon(colName, id, rowIndex, immDatum, immDatumMetadata, starredRowHandlerWithGA, getEditTransitionParams, isShared);
      } else {
        var columnText = this._getColumnText(immStore, colName, immDatum);
        var classNameInfo;
        switch (colName) {
          case 'assigneeIds':
            return div(null, TaskAssignees({taskAssignees: columnText}));
          case 'fileType':
            let type = immDatum.get(colName);
            // TODO - Take a look at how we're using these display constants to drive functionality across the frontend, functionality shouldn't be driven based on the actual value of the constant but rather what it represents
            switch(type) {
              case ExposureAppConstants.FILE_TYPE_MONITOR:
                classNameInfo = {className: 'icon-alarm-check'};
                break;
              case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
                classNameInfo = {className: 'icon-table'};
                break;
              case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
                classNameInfo = {className: 'icon-file'};
                break;
              case ExposureAppConstants.FILE_TYPE_REPORT:
              case ExposureAppConstants.FILE_TYPE_BUILTIN:
              case ExposureAppConstants.FILE_TYPE_ANALYTICS:
              case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
                let identifier = immDatum.get('title');
                switch(identifier) {
                  case ExposureAppConstants.DATA_QUALITY_DASHBOARD:
                  case ExposureAppConstants.PORTFOLIO_SUMMARY:
                  case ExposureAppConstants.STUDY_SUMMARY:
                    classNameInfo = {className: 'icon-dashboard'};
                    break;
                  default:
                    classNameInfo = {className: 'icon-report'};
                }
                break;
              default:
                classNameInfo = {className: 'icon-' + columnText.toLowerCase()};
            }
            return div({className: 'type-info'}, span(classNameInfo), span(null, Util.toTitleCase(columnText)));
          case 'favoriteType':
            return div({className: 'type-info'}, span(null, immDatum.get('isTask') ? 'Task' : Util.getFileTypeName(fileType, immDatum.get('title'))));
          case 'email':
          case 'name':
          case 'title':
          case 'dataAccessProfileName':
          case 'reviewRoleName':
            const linkInfo = getHandleOpenAction(id, rowIndex);
            if (linkInfo) {
              const [route, params, query, mobileOnclick] = linkInfo;
              const location = {name: route, params, query};
              return isNotDesktop && _.isFunction(mobileOnclick) ?
                div({className: 'text-link'}, span({className: cx('open-link', 'item-title-text'), onClick: mobileOnclick}, columnText)) :
                div({className: 'text-link', title: columnText}, Link({className: cx('open-link', 'item-title-text'), to: location, onClick: ExposureActions.clearFileFilterState.bind(null, id)}, columnText));
            }
            return div({className: 'text-link'}, span({className: cx('open-link', 'item-title-text')}, columnText));
          case 'reviewRoleState':
            const reviewRoleStatus = DataReviewUtil.getReviewRoleStatus(immDatum);
            return div(null, span({className: cx(reviewRoleStatus.icon)}), span(null, reviewRoleStatus.text));
          case 'userEntityState':
            var userStatus = Util.getUserStatus(immDatum);
            return div(null, span({className: userStatus.icon}), span(null, userStatus.text));
          case 'description':
            return div(null, TaskDescription({description: columnText}));
            default:
            return columnText;
        }
      }
    }
  },

  // This function will call _getTextColumnWidth to measure the widest width for a column. _getTextColumnWidth calls
  // _getColumnText to obtain the actual text a cell has.
  _getColumnWidths: function(immDisplayedColumns, immData, immStore) {
    var widestFont = Util.getWidestFont();
    var ctx = Util.get2dCanvasContext('bold 14px ' + widestFont);
    return immDisplayedColumns.reduce(function(immMemo, isEnabled, colName) {
      if (!isEnabled) {
        return immMemo.set(colName, 0);
      }
      if (_.contains(this.iconColumns, colName)) {
        return immMemo.set(colName, 70);    // iconColumn width is content width (15px) + sortIcon (15px) + (left + right) padding (20px * 2).
      }
      var colWidth = this._getTextColumnWidth(ctx, immData, _.partial(this._getColumnText, immStore, colName), colName);
      // Since we rendered fileType column with a fileType icon, we have to add the icon width (15px) + icon padding (5px) here.
      return immMemo.set(colName, colName === 'fileType' ? colWidth + 20 : colWidth);
    }, Imm.Map(), this).toJS();
  },

  // 0.01 to accommodate for calculation rounding that will lead to bigger number than total table width.
  getFixedWidth: function(specialColWidths) {
    return _.reduce(specialColWidths, function(memo, colWidth) { return memo + colWidth; }, 0.01);
  },


  // Constructs the arguments used for creation of the FixedDataTable Table component
  constructTableArgs: function(
    totalRows,
    immDisplayedColumns,
    immNonResizableColumnNames,
    columnSortHandler,
    immSortOrdering,
    specialCellRenderer,
    getColumnWidths,
    skipCheckBoxes,
    skipOpen,
    handleCheckAll) {

    var colWidths = this.state.colWidths || getColumnWidths();
    var displayIconColumnWidths = [];
    var displayTextColumnWidths = {};

    // Go through the list of column widths & see if these are icon columns or text columns, and set the widths accordingly
    _.each(colWidths, function(width, colName) {
      if (width === 0) { return; }
      if (_.contains(this.iconColumns, colName)) {
        displayIconColumnWidths.push(width);
      } else {
        displayTextColumnWidths[colName] = width;
      }
    }, this);

    // Get the total width of the table
    var totalWidths = Util.sum(_.values(displayTextColumnWidths)) + Util.sum(displayIconColumnWidths) + this.getFixedWidth(this.props.specialColWidths);
    totalWidths = skipCheckBoxes ? totalWidths - this.props.specialColWidths.checkBox : totalWidths;
    totalWidths = skipOpen ? totalWidths - this.props.specialColWidths.open : totalWidths;
    if (totalWidths < this.state.width) {
      var extraTextColumnPadding = (this.state.width - totalWidths) / _.size(displayTextColumnWidths);
      colWidths = _.mapObject(colWidths, function(width, colName) {
        return _.has(displayTextColumnWidths, colName) ? width + extraTextColumnPadding : width;
      });
    }

    var indexColNameMap = {};
    // We want to know which columns are displayed currently.
    var immColNames = immDisplayedColumns.filter(function(isDisplayed) {
      return isDisplayed;
    }).keySeq();

    // Construct the columns for the table, going through the column names map
    var tableArgs = immColNames.map(function(colName, colIndex) {
      indexColNameMap[colIndex] = colName;
      return Column({
        label: colName + '-' + (new Date()).getTime(),
        width: colWidths[colName],
        minWidth: 80,
        maxWidth: 250,
        dataKey: colIndex,
        headerRenderer: this.headerRenderer.bind(null, columnSortHandler, this.createHeaderContentHandler, immSortOrdering, indexColNameMap),
        cellRenderer: specialCellRenderer.bind(null, indexColNameMap)
      });
    }, this).toJS();

    // Add checkbox column if needed
    if(!skipCheckBoxes) {
      indexColNameMap[-1] = 'checkBox';
      tableArgs.unshift(
        Column({
          label: 'checkBox',
          width: this.props.specialColWidths.checkBox,
          dataKey: 'checkBox',
          headerRenderer: function() {
            return FixedDataTableHeader({ contents: div({className: 'icon-checkbox-checked'}), onCheckAll: handleCheckAll});
          },
          cellRenderer: specialCellRenderer.bind(null, indexColNameMap)
        }));
    }

    // TODO - reinspect the TODO below as I'm updating fixed-data-table at the moment
    tableArgs.unshift({
      // Since FixedDataTable requires either `height` or `maxHeight` if we want it to size itself, then we must supply it
      // with a `maxHeight` but the value here is an arbitrarily high number value greater than what will be shown
      // regardless of how many rows we display, so that the table will never scroll.
      maxHeight: 4000,
      width: _.max([totalWidths, this.state.width]),
      headerHeight: this.headerHeight,
      rowHeight: 40,
      rowsCount: totalRows,
      // TODO: This prevents scroll events from being eaten by the table. This will hopefully be fixed in a future version of FDT and then we can remove this.
      overflowX: 'hidden',
      overflowY: 'hidden',
      rowGetter: function() { return {}; }  // Instead of using rowGetter, we are using specialCellRenderer.
    });

    // Adds an 'Open' column to open the data corresponding to that row
    if (!skipOpen) {
      tableArgs.push(Column({
        label: 'open',
        width: this.props.specialColWidths.open,
        dataKey: 'open',
        headerRenderer: function() {
          return FixedDataTableHeader({contents: 'Open'});
        },
        cellRenderer: specialCellRenderer.bind(null, indexColNameMap)
      }));
    }

    return tableArgs;
  },

  setColumnSort: function(beforeReplaceUrlAction, route, params, sortColumn, sortOrdering) {
    var queryParams = _.clone(this.props.query);
    if (_.contains([0, 1], sortOrdering)) {
      _.extendOwn(queryParams, {sortColumn: sortColumn, sortOrdering: ['asc', 'desc'][sortOrdering]});
    }
    else {    // no sorting
      queryParams = _.omit(queryParams, ['sortColumn', 'sortOrdering']);
    }
    if (_.isFunction(beforeReplaceUrlAction)) {
      beforeReplaceUrlAction();
    }

    this.context.router.replace({name: route, params: params, query: queryParams});
  }
};

module.exports = BaseListViewMixin;
