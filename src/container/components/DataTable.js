var React = require('react');
var ReactDOM = require('react-dom');
var ReactUpdate = require('react-addons-update');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('./Checkbox'));
var SimpleDropdown = React.createFactory(require('./SimpleDropdown.js'));
var ColumnDropdownConstants = require('../constants/ColumnDropdownConstants.js');
var KeyCodeConstants = require('../constants/KeyCodeConstants.js');
var Util = require('../util/util.js');

var div = DOM.div,
    input = DOM.input,
    span = DOM.span;

import PropTypes from 'prop-types';

// Each column gets a resize div that supplies the means by which to
// resize the columns in the table. The logic for handling the actual
// resizing is done via handlers defined in the main DataTable
// component.
//
// Props:
//   idx: Index of the column that this div is attached to.
//   startResize: The event handler that will trigger a column resize
var ColumnResizer = React.createFactory(
class extends React.Component {
  static displayName = 'ColumnResizer';

  static propTypes = {
    canResize: PropTypes.bool,
    resetWidth: PropTypes.func,
    startResize: PropTypes.func
  };

  render() {
    return div({className: cx({dimmed: this.props.isInvisible, 'table-col-resize': true, disabled: !this.props.canResize}),
                onMouseDown: this.props.canResize ? this.props.startResize : null,
                onDoubleClick: this.props.canResize ? this.props.resetWidth : null});
  }
});

// This is the table header component. This will generate the table header row as a ThRow,
// which in turn generates the individual header entries as ThCells.
// Props:
//   activeColumns: The array of columns currently being sorted
//   transposed: Boolean stating if a table is transposed
//   columns: Column data passed from back-end
//   columnNames: Display names for various columns
//   updateActiveColumns: Function to update activeColumns in TabularDataWidget
//   sortDisabled: Boolean toggling sort
//   columnResizers: Array of handles for resizing the columns
//   colWidths: Array of column width info in the following form:
//              [{contentWidth: Int, currentWidth: Int, headerWidth: Int, manuallySized: Boolean}, ...]
var THead = React.createFactory(
  class extends React.Component {
    static displayName = 'THead';

    static propTypes = {
      activeColumns: PropTypes.array,
      allowEditColumnHeader: PropTypes.bool,
      batchEditEnabled: PropTypes.bool.isRequired,
      colDropdownItems: PropTypes.arrayOf(PropTypes.shape({
        icon: PropTypes.string,
        name: PropTypes.string
      })),
      colLongNameEnabled: PropTypes.bool,
      columnNames: PropTypes.arrayOf(PropTypes.string),
      columnResizers: PropTypes.array,
      columns: PropTypes.object,
      colWidths: PropTypes.array,
      handleBatchEditCheckboxClick: PropTypes.func,
      handleDropdownClick: PropTypes.func,
      sortDisabled: PropTypes.bool,
      statusIcons: PropTypes.object,
      transposed: PropTypes.bool,
      updateActiveColumns: PropTypes.func,
      viewOnly: PropTypes.bool
    };

    render() {
      var headerRow = ThRow({ref: 'th-row',
                             activeColumns: this.props.activeColumns,
                             allowEditColumnHeader: this.props.allowEditColumnHeader,
                             batchEditEnabled: this.props.batchEditEnabled,
                             colDropdownItems: this.props.colDropdownItems,
                             colLongNameEnabled: this.props.colLongNameEnabled,
                             columnNames: this.props.columnNames,
                             columnResizers: this.props.columnResizers,
                             columns: this.props.columns,
                             colWidths: this.props.colWidths,
                             handleBatchEditCheckboxClick: this.props.handleBatchEditCheckboxClick,
                             handleDropdownClick: this.props.handleDropdownClick,
                             sortDisabled: this.props.sortDisabled,
                             statusIcons: this.props.statusIcons,
                             transposed: this.props.transposed,
                             updateActiveColumns: this.props.updateActiveColumns,
                             viewOnly: this.props.viewOnly});
      return div({className: 'thead'}, headerRow);
    }
  },
);

// Table status header. This will generate the table header row as a ThRow,
// which in turn generates the individual header entries as ThCells.
// Each cell would be an array of icons. Each column can have several status attributes
// applied to it, such as invisible, hasChild, hasParent, unique, sortAsc, sortDes.
// statusIcons is an object with key as status attribute, and value as status icon.
var THeadStatus = React.createFactory(
  class extends React.Component {
    static displayName = 'THeadStatus';

    static propTypes = {
      columnResizers: PropTypes.array,
      columnNames: PropTypes.arrayOf(PropTypes.string),
      columns: PropTypes.object,
      colWidths: PropTypes.array,
      statusIcons: PropTypes.object
    };

    render() {
      return this.props.statusIcons ? div(
        {className: 'thead'},
        ThRow({
          ref: 'th-row',
          columnResizers: this.props.columnResizers,
          columnNames: this.props.columnNames,
          columns: this.props.columns,
          colWidths: this.props.colWidths,
          statusIcons: this.props.statusIcons
        })
      ) : null;
    }
  },
);

var THeadDataType = React.createFactory(class extends React.Component {
  static displayName = 'THeadDataType';

  static propTypes = {
    columnNames: PropTypes.arrayOf(PropTypes.string),
    columnResizers: PropTypes.array,
    columns: PropTypes.object,
    colWidths: PropTypes.array,
    displayDataType: PropTypes.bool,
    handleTypeDropdownClick: PropTypes.func,
    typeDropdownItems: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string
    })),
    viewOnly: PropTypes.bool
  };

  render() {
    return this.props.displayDataType ? div(
      {className: 'thead'},
      ThRow({
        ref: 'th-row',
        columnResizers: this.props.columnResizers,
        columnNames: this.props.columnNames,
        columns: this.props.columns,
        colWidths: this.props.colWidths,
        displayDataType: this.props.displayDataType,
        handleTypeDropdownClick: this.props.handleTypeDropdownClick,
        typeDropdownItems: this.props.typeDropdownItems,
        viewOnly: this.props.viewOnly
      })
    ) : null;
  }
});

// Table header row component. This will construct the table header
// row using ThCell for the individual header entries.
//
// Props:
//   activeColumns: The array of columns currently being sorted
//   transposed: Boolean stating is a table is transposed
//   columns: Column data passed from back-end
//   columnNames: Display names for various columns
//   updateActiveColumns: Function to update activeColumns in TabularDataWidget
//   sortDisabled: Boolean toggling sort
//   columnResizers: Array of handles for resizing the columns
//   colWidths: Array of column width info in the following form:
//              [{contentWidth: Int, currentWidth: Int, headerWidth: Int, manuallySized: Boolean}, ...]
var ThRow = React.createFactory(
class extends React.Component {
  static displayName = 'ThRow';

  static propTypes = {
    activeColumns: PropTypes.array,
    allowEditColumnHeader: PropTypes.bool,
    batchEditEnabled: PropTypes.bool,
    colDropdownItems: PropTypes.arrayOf(PropTypes.shape({
      icon: PropTypes.string,
      name: PropTypes.string
    })),
    colLongNameEnabled: PropTypes.bool,
    columnNames: PropTypes.arrayOf(PropTypes.string),
    columnResizers: PropTypes.array,
    columns: PropTypes.object,
    colWidths: PropTypes.array,
    displayDataType: PropTypes.bool,
    handleBatchEditCheckboxClick: PropTypes.func,
    handleDropdownClick: PropTypes.func,
    handleTypeDropdownClick: PropTypes.func,
    sortDisabled: PropTypes.bool,
    statusIcons: PropTypes.object,
    transposed: PropTypes.bool,
    typeDropdownItems: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string
    })),
    updateActiveColumns: PropTypes.func,
    viewOnly: PropTypes.bool
  };

  // Determine if column is already being used for ordering.
  //
  // columnName - Name of the column we want to know is active.
  // activeColumns - An array of objects containing column name and ordering string pairs, e.g.
  //                 [{column: <name>, order: <asc|desc>}, ...]
  // Returns {String} name of column in column array if it is present, {undefined} otherwise.
  isColumnActive = (columnName, activeColumns) => {
    return _.findWhere(activeColumns, {column: columnName});
  };

  // Get index of column entry in the active column array.
  //
  // columnName - Name of the column we want to know the index for.
  // activeColumns - An array of objects containing column name and ordering string pairs, e.g.
  //                 [{column: <name>, order: <asc|desc>}, ...]
  // Returns {Int} index of column in activeColumns.
  getColumnIndex = (columnName, activeColumns) => {
    return _.pluck(activeColumns, 'column').indexOf(columnName);
  };

  // Sort columns. A column can have one of 3 states:
  //   unordered: default state
  //   ordered ascending: column is being used for ordering in ascending order
  //   ordered descending: column is being used for ordering in descending order
  //
  // State of columns changes as following:
  //   unordered -> ordered ascending -> ordered descending -> unordered -> ...
  //
  // The new array of active columns is propagated back up to the TabularDataWidget
  // parent component and triggers a re-render of the DataTable component.
  //
  //   column - Name of column to adjust sort order on.
  //   e - Event passed from event handler. Tracked to stop propagation to parent in DOM.
  sortColumn = (column, e) => {
    e.stopPropagation();
    var newActiveColumns;
    if (!this.isColumnActive(column, this.props.activeColumns)) {
      // Column isn't being used for sorting, add it.
      newActiveColumns = ReactUpdate(this.props.activeColumns, {$push:[{column: column, order: 'asc'}]});
    } else {
      var index = this.getColumnIndex(column, this.props.activeColumns);
      if (this.props.activeColumns[index].order === 'asc') {
        // Column is sorted by asc, reverse to desc. Sort is spliced in place to maintain ordering selected by user.
        newActiveColumns = ReactUpdate(this.props.activeColumns, {$splice: [[index, 1, {column: column, order: 'desc'}]]});
      } else {
        // Column is already descending, remove from ordering.
        newActiveColumns = ReactUpdate(this.props.activeColumns, {$splice: [[this.getColumnIndex(column, this.props.activeColumns), 1]]});
      }
    }
    this.props.updateActiveColumns(newActiveColumns);
  };

  // Determine the type of sort arrow to be displayed.
  //
  // column: Column information object of type {column: <name>, order: <asc|desc>}
  // sortIndex: The sortIndex indicates the priority of the column in the sort
  //            order, e.g. if we have two columns that are sorted, the first
  //            column to have a sort applied will have sort index 1 and the
  //            second column will have sort index 2. The sort index indicates
  //            what the sort priority of each column is (sortIndex 1 will have
  //            greatest effect on the resulting order of the result).
  // Returns: CSS styling information {String} for the sort arrow.
  sortArrow = (column, sortIndex) => {
    if (this.props.sortDisabled || this.props.transposed) {
      return null;
    }
    if (!column) {
      return div({key: 'arrow', className: 'table-arrow-up'});
    } else if (column.order === 'asc') {
      return div({key: 'arrow', className: 'table-arrow-up ordered'}, span({key: 'sort-index-up', className: 'sort-index'}, sortIndex + 1));
    } else {
      return div({key: 'arrow', className: 'table-arrow-down ordered'}, span({key: 'sort-index-down', className: 'sort-index'}, sortIndex + 1));
    }
  };

  render() {
    var headerCells = _.map(this.props.columnNames, function(c, idx) {
      var activeColumn = this.isColumnActive(c, this.props.activeColumns);
      var sortIndex = _.indexOf(this.props.activeColumns, activeColumn);
      var newWidths = {minWidth: this.props.colWidths[idx].currentWidth};
      return [ThCell({ref: 'th-cell-' + idx,
                      arrow: this.sortArrow(activeColumn, sortIndex),
                      allowEditColumnHeader: this.props.allowEditColumnHeader,
                      batchEditEnabled: this.props.batchEditEnabled,
                      colDropdownItems: this.props.colDropdownItems,
                      colLongNameEnabled: this.props.colLongNameEnabled,
                      column: this.props.columns[c],
                      displayDataType: this.props.displayDataType,
                      handleBatchEditCheckboxClick: this.props.handleBatchEditCheckboxClick,
                      handleClick: this.props.transposed || this.props.sortDisabled ? null : this.sortColumn.bind(null, c),
                      handleDropdownClick: this.props.handleDropdownClick,
                      handleTypeDropdownClick: this.props.handleTypeDropdownClick,
                      isLastColumn: idx === this.props.colWidths.length - 1,
                      statusIcons: this.props.statusIcons,
                      style: newWidths,
                      transposed: this.props.transposed,
                      typeDropdownItems: this.props.typeDropdownItems,
                      viewOnly: this.props.viewOnly}),
              this.props.columnResizers[idx]];
    }, this);
    return div({className: 'th-row'}, headerCells);
  }
});

// This is the table header cell component.
// A header cell can be rendered as a column header, a data type column header, or a status header.
// When statusIcons is passed in as a prop, it indicates the header cell should be rendered as a status header.
// A status header will display a set of status icon. It has a table structure with each status icon wrapped in a table cell.
// When a displayDataType is passed in as a prop, it indicates the header cell should be rendered as a data type column header.
// A data type column header is used to display column data type such as String, Float, etc.
// If neither statusIcons or displayDataType is passed in as a prop, the header will be rendered as a column header.
// A column header will display column long name, column shortname (if any), column header dropdown.
//
// Props:
//   colName: Column name information to display
//   arrow: Sort arrow as created by sortArrow() to display
//   transposed: Describes whether table is transposed or not
//   colDropdownItems: The items in the table header cell's dropdown (if any)
//   colLongName: Boolean to indicate if the column has long name and short name to display
//   column: Column properties
//   displayDataType: Boolean to indicate if the column header should only display its datatype
//   handleTypeDropdownClick: Function to handle when a override datatype is clicked on a column.
//   isLastColumn: Boolean to indicate if a header cell is the last header cell, to decide the dropdown alignment direction.
//   statusIcons: A map with keys are the status properties and values are the icon class names associate to each status.
var ThCell = React.createFactory(
class extends React.Component {
  static displayName = 'ThCell';

  static propTypes = {
    allowEditColumnHeader: PropTypes.bool,
    arrow: PropTypes.any,
    batchEditEnabled: PropTypes.bool,
    colDropdownItems: PropTypes.arrayOf(PropTypes.shape({
      icon: PropTypes.string,
      name: PropTypes.string
    })),
    colLongNameEnabled: PropTypes.bool,
    column: PropTypes.shape({
      isInvisible: PropTypes.bool,
      sortAsc: PropTypes.bool,
      sortDesc: PropTypes.bool,
      longName: PropTypes.string,
      name: PropTypes.string
    }),
    displayDataType: PropTypes.bool,
    handleClick: PropTypes.func,
    handleBatchEditCheckboxClick: PropTypes.func,
    handleDropdownClick: PropTypes.func,
    handleTypeDropdownClick: PropTypes.func,
    isLastColumn: PropTypes.bool,
    statusIcons: PropTypes.object,
    styles: PropTypes.shape({
      minWidth: PropTypes.number
    }),
    typeDropdownItems: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string
    })),
    viewOnly: PropTypes.bool
  };

  state = {edit: false};
  iconCount = 0;
  useDropdown = false;

  handleBlur = () => {
    this.setState({edit: false});
  };

  handleRenameTitle = (e) => {
    switch (e.keyCode) {
      case KeyCodeConstants.ENTER:
        this.setState({edit: false});
        this.props.handleDropdownClick(ColumnDropdownConstants.RENAME_COLUMN, {shortName: this.props.column.name, oldLongName: this.props.colLongNameEnabled ? this.props.column.longName : this.props.column.name, newLongName: e.target.value});
        break;
      case KeyCodeConstants.ESCAPE:
        this.setState({edit: false});
        break;
    }
  };

  handleDropdownClick = (index) => {
    switch (index) {
      case 0:
        this.setState({edit: true}, function() {
          var input = ReactDOM.findDOMNode(this.refs['rename-title-input']);
          input.focus();
          input.select();
        });
        break;
      case 1:
        this.props.handleDropdownClick(ColumnDropdownConstants.SET_COLUMN_INVISIBILITY, {name: this.props.column.name, isInvisible: !this.props.column.isInvisible});
        break;
      case 2:
        this.props.handleDropdownClick(ColumnDropdownConstants.SET_UNIQUE, {name: this.props.column.name, isUnique: !this.props.column.isUnique});
        break;
      case 3:
        this.props.handleDropdownClick(ColumnDropdownConstants.SET_EDGE, {longName: this.props.column.longName, shortName: this.props.column.shortName});
        break;
      default:
        this.props.handleDropdownClick(index);
    }
  };

  render() {
    var cellElement = null;

    // statusIcons is an object with key as status attribute, and value as status icon.
    // If statusIcons is passed in, ThCell should render an array of status icons for THeadStatus.
    // If statusIcons isn't passed in, ThCell should render a column header for THead.
    if (this.props.statusIcons) {
      var icons = _.chain(this.props.statusIcons)
        .map(function(statusObj, status) {
          return this.props.column[status] ? div({className: 'status-icon', key: status}, div({className: statusObj.icon, title: statusObj.name})) : null;
        }, this).compact().value();
      cellElement = div({className: 'status-header'}, div(null, !_.isEmpty(icons) ? icons : div({className: 'status-icon'}, div(null, '-'))));
    } else if (this.props.displayDataType) {
      var dropdown = !_.isEmpty(this.props.typeDropdownItems) ? div(null, div(null, div(null, div(null,
        SimpleDropdown({
          isDisabled: this.props.viewOnly,
          rightAlign: !this.props.isLastColumn,
          scrollbarDisabled: true,
          opener: div({className: 'icon-accordion-down'}),
          selectCheckDisabled: true,
          onChange: this.props.handleTypeDropdownClick.bind(null, this.props.column.name),
          items: this.props.typeDropdownItems
        }))))) : null;
      cellElement = div({className: 'data-type-header'}, div(null, div(null, this.props.column.dataType), dropdown));
    } else {
      var colTitleText = this.props.colLongNameEnabled ? this.props.column.longName : this.props.column.name;
      var colTitle = this.state.edit ? div({key: 'title'}, input({
        type: 'text',
        ref: 'rename-title-input',
        maxLength: 1024,
        defaultValue: colTitleText,
        onBlur: this.handleBlur,
        onKeyDown: this.handleRenameTitle
      })) : span({key: 'title', title: _.size(colTitleText) > 50 ? colTitleText : ''}, colTitleText.substr(0, 50));

      var batchEditCheckbox = this.props.batchEditEnabled ?
        Checkbox({dimmed: !this.props.column.batchEditCheckboxState,
                  onClick: this.props.handleBatchEditCheckboxClick.bind(null, this.props.column.shortName),
                  checkedState: this.props.column.batchEditCheckboxState}) : null;

      var col = div({onClick: this.props.handleClick}, this.props.colLongNameEnabled ?
        div(null, div(null, div(null, div(null, div({className: 'col-long-name'}, colTitle), div(null, div({className: 'col-short-name'}, this.props.column.name)))),
          div(null, this.props.arrow))) : [colTitle, this.props.arrow]);
      var dropdown = !_.isEmpty(this.props.colDropdownItems) ? div(null, div(null, div(null, div(null,
        SimpleDropdown({
          isDisabled: this.props.viewOnly,
          rightAlign: !this.props.isLastColumn,
          scrollbarDisabled: true,
          opener: div({className: 'icon-cog'}),
          selectCheckDisabled: true,
          onChange: this.props.allowEditColumnHeader ? this.handleDropdownClick : this.props.handleDropdownClick,
          items: _.map(this.props.colDropdownItems, function(item) {
            if (item.name === 'Set as Invisible') {
              return {name: this.props.column.isInvisible ? 'Set as Visible' : item.name,
                      icon: this.props.column.isInvisible ? 'icon-eye' : item.icon};
            } else if (item.name === 'Set as Unique') {
              return {name: this.props.column.isUnique ? 'Remove Uniqueness' : item.name,
                      icon: this.props.column.isUnique ? 'icon-close' : item.icon};
            }
            return {name: item.name, icon: item.icon};
          }, this)
        }))))) : null;
      cellElement = div(null, batchEditCheckbox, div(null, col, dropdown));
    }
    return div({className: cx({dimmed: this.props.column.isInvisible, 'th-cell': true, 'no-sort': !this.props.handleClick || this.props.statusIcons || this.props.displayDataType, 'long-name': this.props.colLongNameEnabled}),
                style: this.props.style},
               cellElement);
  }
});

// This is the table Body React component. This component will take the non-header
// column information and generate TRows made up of TdCells which in turn
// make up the body of the table.
//
// Props:
//   columns: Column information from back-end
//   items: Each item is a row to be displayed in the final table in the form:
//          {<nameOfColumn>: <cell value>, ...}
//   columnNames: Display names for various columns
//   columnResizers: Array of handles for resizing the columns
//   colWidths: Array of column width info in the following form:
//              [{contentWidth: Int, currentWidth: Int, headerWidth: Int, manuallySized: Boolean}, ...]
var TBody = React.createFactory(
 class extends React.Component {
    static displayName = 'TBody';

    render() {
      var rows = [];
      var preSortedItems = this.props.items;
      // Row items are sorted on backend by applying ordering filters
      _.each(preSortedItems, function(item, idx) {
        rows.push(
          TRow({key: 'trow-' + idx,
                idx: idx,
                item: item,
                columns: this.props.columns,
                columnNames: this.props.columnNames,
                columnResizers: this.props.columnResizers,
                colWidths: this.props.colWidths,
                highlightRows: this.props.highlightRows,
                handleRowClick: this.props.handleRowClick})
        );
      }, this);

      return div({className: 'tbody', onScroll: this.props.onScroll}, rows);
    }
  },
);

// This is the table body row component. Each TRow is a row in the body of the
// table and holds one TdCell per column.
//
// Props:
//   idx: Number indicating row index
//   item: Column info
//   columnNames: Display names for various columns
//   columnResizers: Array of handles for resizing the columns
//   colWidths: Array of column width info in the following form:
//              [{contentWidth: Int, currentWidth: Int, headerWidth: Int, manuallySized: Boolean}, ...]
var TRow = React.createFactory(
 class extends React.Component {
    static displayName = 'TRow';

    cells = (x, rowIdx) => {
      return _.map(this.props.columnNames, function(c, idx) {
        return [TdCell({key: 'td-cell-' + rowIdx + '-' + idx,
                        cellData: Util.datumDisplayValue(x[c]),
                        currentWidth: this.props.colWidths[idx].currentWidth,
                        isInvisible: this.props.columns[c].isInvisible}),
                this.props.columnResizers[idx]];
      }, this);
    };

    render() {
      return div({className: cx({'t-row': true, highlight: _.has(this.props.highlightRows, this.props.idx)}),
                  // `handleRowClick` is an optional prop - not specified for the `dataIntegrity` `DataTable`
                  onClick: this.props.handleRowClick && this.props.handleRowClick.bind(null, this.props.idx)},
               this.cells(this.props.item, this.props.idx));
    }
  },
);

// This is the table body cell component, i.e. one entry in a row of a table.
//
// Props:
//   rowIdx: Index of row this cell belongs to
//   colIdx: Index of column this cell belongs to
//   cellData: Contents of the cell to display
//   currentWidth: Current column width
var TdCell = React.createFactory(
 class extends React.Component {
    static displayName = 'TdCell';

    render() {
      // If cellData is a Boolean, React doesn't render anything, so we need to
      // convert it to a String.
      const cellData = typeof(this.props.cellData) === 'boolean' ? this.props.cellData.toString() : this.props.cellData;

      return div({className: cx({'td-cell': true, dimmed: this.props.isInvisible}),
                  style: {minWidth: this.props.currentWidth}},
                 // the width of the inner div must be explicitly set for `overflow: hidden` to work,
                 // which is necessary to allow columns to be sized narrower than their content
                 // the cell padding is 8px (all sides), so we need to subtract 16px from the outer div width
                 div({style: {width: this.props.currentWidth - 17}}, cellData));
    }
  },
);

// This is the DataTable React Component. This component is responsible for
// rendering the actual table and its contents.
//
// Props:
//   initialItems: Rows to display in form:
//                 {<nameOfColumn>: <cell value>, ...}
//   columns: Column information
//   navigateTablePage: Function to trigger table result page change
//   updateActiveColumns: Function to update activeColumns in parent
//   page: Current page of results
//   numPages: Total number of result pages
//   activeColumns: Array of currently sorted columns
//   transposed: Boolean describing if table is transposed or not
//   height: Table height
//   width: Table width
//   *sortDisabled: Disables sort on columns
class DataTable extends React.Component {
  static displayName = 'DataTable';

  static propTypes = {
    activeColumns: PropTypes.array,
    allowEditColumnHeader: PropTypes.bool,
    batchEditEnabled: PropTypes.bool.isRequired,
    colLongNameEnabled: PropTypes.bool,
    columns: PropTypes.object,
    handleBatchEditCheckboxClick: PropTypes.func,
    handleRowClick: PropTypes.func,
    hasActionPath: PropTypes.bool,
    height: PropTypes.number,
    highlightRows: PropTypes.object,
    items: PropTypes.array,
    navigateTablePage: PropTypes.func,
    numPages: PropTypes.number,
    paginationDisabled: PropTypes.bool,
    resultsPerPage: PropTypes.number,
    setWidgetResultsPerPage: PropTypes.func,
    sortDisabled: PropTypes.bool,
    statusIcons: PropTypes.object,
    totalResults: PropTypes.number,
    updateActiveColumns: PropTypes.func,
    viewOnly: PropTypes.bool,
    width: PropTypes.number
  };

  constructor(props) {
    super(props);
    // Before adjustSizes can run, initialize data table with dummy values for the column widths.
    var placeHolderWidths = [];
    _.each(props.columns, function() {
      placeHolderWidths.push({contentWidth: 10, currentWidth: 10, headerWidth: 10, manuallySized: false});
    });

    this.state = {
      page: 1,
      paginationInputWidth: 0,
      colWidths: placeHolderWidths,
      dragStartX: 0,
      resizing: -1,
      startingWidth: 0
    };
  }

  // This is to begin the column re-sizing process in the ColumnResizer.
  startResize = (colIdx, e) => {
    this.setState({resizing: colIdx,
                   dragStartX: e.pageX,
                   startingWidth: this.state.colWidths[colIdx].currentWidth});
  };

  // This handles the active column resizing. As the resizing handles
  // are dragged the colWidths state information for the column being
  // resized will update, triggering a redraw and animating the
  // resize.
  doResize = (e) => {
    if (this.state.resizing >= 0) {
      if (e.pageX !== 0) {
        var newWidth = this.state.startingWidth + e.pageX - this.state.dragStartX;
        if (newWidth >= this.state.colWidths[this.state.resizing].headerWidth) {
          var spec = {};
          spec[this.state.resizing] = {$merge: {currentWidth: newWidth, manuallySized: true}};
          var newWidths = ReactUpdate(this.state.colWidths, spec);
          this.setState({colWidths: newWidths});
          if (newWidth > this.state.startingWidth) {
            this.handleScrollWrapper((this.state.resizing + 1) === newWidths.length);
          }
        }
      }
    }
  };

  // This is what is fired to end a column resizing. It removes the
  // event handlers from the high-level elements.
  endResize = () => {
    if (this.state.resizing >= 0) {
      this.setState({resizing: -1});
    }
  };

  // On a double-click of a ColumnResizer, reset the column width.
  resetWidth = (colIdx) => {
    var spec = {};
    spec[colIdx] = {$merge: {currentWidth: this.state.colWidths[colIdx].contentWidth, manuallySized: false}};
    var newWidths = ReactUpdate(this.state.colWidths, spec);
    this.setState({colWidths: newWidths});
  };

  // This will determine the appropriate column widths which will
  // be stored as state in colWidths.
  adjustColWidths = (nextProps) => {
    var props = nextProps ? nextProps : this.props;
    var columns = props.columns;
    var columnOrdering = props.columnOrdering;
    var widestFont = Util.getWidestFont();
    var ctx = Util.get2dCanvasContext('bold 14px ' + widestFont);
    // First the headers
    // Cell and header padding is 8px on each side
    // Arrow width is 27px (11px left & right border + 5px left margin)
    // We need to add 1px for IE, because IE
    var paddingAndArrow = this.props.sortDisabled ? 0 : 44;
    // Ensure there is enough padding space to account for the space the dropdown
    // opener requires (34px) to keep columns aligned.
    var headerPadding = this.props.colLongNameEnabled ? 34 : 0;

    // Status header padding is 8px on each side + 1 px for IE.
    var statusHeaderPadding = props.statusIcons ? 17 : 0;

    var headerWidths = _.map(columnOrdering, function(column) {
      var textWidth = _.max([(!props.colLongNameEnabled ? 0 : ctx.measureText(columns[column].longName.substr(0, 50)).width), ctx.measureText(column.substr(0, 50)).width]);

      // Status icons width is number of icons * (icon width + padding). Icon width is 14px and padding is 5px.
      var statusIconWidth = _.chain(props.statusIcons)
        .map(function(icon, status) {
            return columns[column][status] ? icon : null;
        })
        .compact()
        .size()
        .value() * 19;

      var dataTypeWidth = columns[column].dataType ? ctx.measureText(columns[column].dataType).width : 0;

      // Dropdown opener is 14px.
      var iconPadding = props.colDropdownItems ? 14 : 0;
      return _.max([textWidth + paddingAndArrow + iconPadding + headerPadding, statusIconWidth + statusHeaderPadding, dataTypeWidth + iconPadding + headerPadding]);
    }, this);

    // Array of (Array of proposed column widths in pixels)
    var widths = [headerWidths];

    // Then each of the items in the table
    ctx.font = 'normal 14px ' + widestFont;
    var padding = 21;
    _.each(props.items, function(item) {
      widths.push(_.map(columnOrdering, function(column) {
        var displayValue = Util.datumDisplayValue(item[column]);
        var textWidth = _.isEmpty(displayValue) ? 0 : ctx.measureText(displayValue).width;
        return textWidth + padding;
      }, this));
    }, this);

    // Then find the max width of the columns
    var finalWidths = _.map(_.zip.apply(_, widths), function(col) {
      return _.max(col);
    });

    // Check if the column widths add up to at least the overall table width.
    // If not, just make it the proper fraction of the table width.
    var sumWidths = _.reduce(finalWidths, function(memo, num) { return memo + num; }, 0);
    // tableWidth = this.props.width - column resizers width - left & right border width
    var availableWidth = props.width - (5 * finalWidths.length) - 2;
    var hasXScroll = sumWidths > availableWidth;
    if (!hasXScroll) {
      finalWidths = _.map(finalWidths, function(w) { return w / sumWidths * availableWidth; });
    }

    // Convert the final widths to expected format. Use the current
    // colWidth value if it is still valid.
    finalWidths = _.map(finalWidths, function(w, i) {
      var spec = {contentWidth: w, headerWidth: headerWidths[i]};

      // When # of columns change, there is a chance colWidths[i] is undefined because 'i' is out of range,
      // so we want to check for that.
      spec.currentWidth = _.max([headerWidths[i], w, this.state.colWidths[i] ? this.state.colWidths[i].currentWidth : 0]);

      if (!hasXScroll || !(this.state.colWidths[i] && this.state.colWidths[i].manuallySized)) {
        spec.currentWidth = w;
      }

      return nextProps ? spec : {$merge: spec};
    }, this);

    // When 'nextProps' is not null, this function is being called before render, so we just want to set state of colWidths
    if (nextProps) {
      this.setState({
        colWidths: finalWidths
      });
    } else {
      // Adjust wrapper height and scroll after rendering.
      this.setState({canResize: hasXScroll,
                     colWidths: ReactUpdate(this.state.colWidths, finalWidths)}, this.adjustWrapperHeightAndScroll);
    }
  };

  adjustWrapperHeightAndScroll = () => {
    // We can't determine the header height until the columns have been properly resized,
    // so we pass this function in as a callback to `setState({colWidths: finalWidths})`
    // in `adjustColWidths`.
    var theadHeight = $(ReactDOM.findDOMNode(this.refs['tableHead'])).outerHeight(true);
    var theadStatusHeight = this.refs['tableHeadStatus'] ? $(ReactDOM.findDOMNode(this.refs['tableHeadStatus'])).outerHeight(true) : 0;
    var theadDataTypeHeight = this.refs['tableHeadDataType'] ? $(ReactDOM.findDOMNode(this.refs['tableHeadDataType'])).outerHeight(true) : 0;
    var tpaginationHeight = this.props.paginationDisabled ? 0 : $(ReactDOM.findDOMNode(this.refs['table-pagination'])).outerHeight(true);
    var tableTopAndBottomBorder = this.props.noBorder ? 0: 2; //  noBorder prop is used to mark no border `DataTable`.
    var xScrollBarHeight = this.state.canResize ? 14: 0;
    $(ReactDOM.findDOMNode(this.refs['twrapper']))
      .height(this.props.height + xScrollBarHeight - theadHeight - theadStatusHeight - theadDataTypeHeight - tpaginationHeight - tableTopAndBottomBorder);

    var leftScroll = this.leftScroll;
    if (leftScroll) {
      var scrollLeft;
      if (leftScroll.full) {
        // Set scrollLeft to an impossibly high number - the browser will auto-adjust
        // to the maximum possible scrollLeft position.
        scrollLeft = 1e6;
      } else {
        var colIdx = leftScroll.colIdx;
        var $leftCell = $(ReactDOM.findDOMNode(this.refs['tableHead'].refs['th-row'].refs['th-cell-' + colIdx]));
        scrollLeft = $leftCell.position().left + leftScroll.colPixels;
      }
      $(ReactDOM.findDOMNode(this.refs['twrapper'])).scrollLeft(scrollLeft);
    }
  };

  adjustPageInputWidth = () => {
    if (this.props.paginationDisabled) { return; }
    this.setState({paginationInputWidth: $(ReactDOM.findDOMNode(this.refs['numPages'])).width()});
  };

  componentDidMount() {
    this.adjustColWidths();
    this.adjustPageInputWidth();
  }

  // Scroll the header row horizontally in sync with the table body.
  handleBodyScroll = () => {
    var scrollLeft = -ReactDOM.findDOMNode(this.refs['twrapper']).scrollLeft;
    $(ReactDOM.findDOMNode(this.refs['tableHead'])).css({left: scrollLeft});
    if (this.refs['tableHeadStatus']) {
      $(ReactDOM.findDOMNode(this.refs['tableHeadStatus'])).css({left: scrollLeft});
    }
    if (this.refs['tableHeadDataType']) {
      $(ReactDOM.findDOMNode(this.refs['tableHeadDataType'])).css({left: scrollLeft});
    }
  };

  componentWillReceiveProps(nextProps) {
    // If the contents of the DataTable has changed, then we want to reset the
    // horizontal scroll. Our unique identifier is the list of columns; we'll use a deep
    // comparison on this list to check if the DataTable contents have changed.
    if (!_.isEqual(_.keys(this.props.columns), _.keys(nextProps.columns))) {
      $(ReactDOM.findDOMNode(this.refs['twrapper'])).scrollLeft(0);
      $(ReactDOM.findDOMNode(this.refs['tableHead'])).css({left: 0});
      if (this.refs['tableHeadStatus']) {
        $(ReactDOM.findDOMNode(this.refs['tableHeadStatus'])).css({left: 0});
      }
      if (this.refs['tableHeadDataType']) {
        $(ReactDOM.findDOMNode(this.refs['tableHeadDataType'])).css({left: 0});
      }
    }

    // If the actual values stored on our columns has changed then we need to
    // recalculate widths to ensure everything still fits properly.
    if (!_.isEqual(this.props.columns, nextProps.columns)) {
      this.adjustColWidths(nextProps);
    }
  }

  componentWillUpdate() {
    // Record current scroll position before rendering.
    this.updateLeftScroll();
  }

  componentDidUpdate(prevProps) {
    var didAdjustColWidths;
    if (!_.isEqual(prevProps.items, this.props.items) || prevProps.width !== this.props.width) {
      this.adjustColWidths();
      this.resetPageInput();
      didAdjustColWidths = true;
    }
    if (prevProps.numPages !== this.props.numPages) {
      this.adjustPageInputWidth();
    }
    if (prevProps.height > 0 && prevProps.height !== this.props.height) {
      this.adjustPageInputWidth();
      if (!didAdjustColWidths) {
        this.adjustWrapperHeightAndScroll();
      }
      if (this.props.setWidgetResultsPerPage) {
        this.props.setWidgetResultsPerPage(this.state.page, this.navigateTablePage);
      }
    }
  }

  columnNames = () => {
    return this.props.columnOrdering;
  };

  // This will reset the value in the pageInput input to the original
  // setting.
  resetPageInput = () => {
    var pageInput = this.refs['pageInput'];
    if (pageInput) { $(ReactDOM.findDOMNode(pageInput)).val(this.state.page); }
  };

  // When the user enters a new page number into the pageInput input
  // and hits enter this function will fire.
  handlePageNumberChange = (e) => {
    // If user has just pressed enter
    if (e.keyCode === KeyCodeConstants.ENTER) {
      // Ensure the input string contains only digits.
      var nextPage = /^\d+$/.test(e.target.value) ? parseInt(e.target.value, 10) : NaN;
      this.navigateTablePage(nextPage);
    }
  };

  // If the value is not a number or is out of range then we reset the
  // input. If the value is valid then we navigate to that table page.
  navigateTablePage = (nextPage) => {
    if (_.isNaN(nextPage) || nextPage < 1 || nextPage > this.props.numPages) {
      this.resetPageInput();
    } else {
      this.props.navigateTablePage(nextPage);
      this.setState({page: nextPage});
    }
  };

  // Calculates the scroll offset of the table relative to the first
  // visible column.
  updateLeftScroll = () => {
    var leftScroll = null;
    var $twrapper = $(ReactDOM.findDOMNode(this.refs['twrapper']));
    var scrollLeft = $twrapper.scrollLeft();
    var $thRow = $(ReactDOM.findDOMNode(this.refs['tableHead'].refs['th-row']));
    if (_.isNumber(scrollLeft) && scrollLeft > 0) {
      if ($thRow.width() - $twrapper.width() === scrollLeft) {
        leftScroll = {full: true};
      } else {
        var cells = $thRow.find('.th-cell');
        _.find(cells, function(cell, idx) {
          var $cell = $(cell);
          var cellLeft = $cell.position().left;
          if (cellLeft + $cell.width() >= scrollLeft) {
            leftScroll = {colIdx: idx, colPixels: scrollLeft - cellLeft};
            return true;
          }
          return false;
        });
      }
    }
    this.leftScroll = leftScroll;
  };

  updateActiveColumns = (newActiveColumns) => {
    this.props.updateActiveColumns(newActiveColumns);
    this.setState({page: 1});
  };

  // handleScrollWrapper helps us be able to resize the right-most
  // column in a table. Otherwise, we would not be able to scroll past
  // the table and increase the columns size. This function is in
  // DataTable to allow access to the refs and make sure we only select
  // child elements of the current table widget.
  handleScrollWrapper = (isLastCol) => {
    if (isLastCol) {
      // This is a magic number to push the table over and allow us to scroll
      // past to the right.
      var scrollAmount = 100000;
      $(ReactDOM.findDOMNode(this.refs['twrapper'])).scrollLeft(scrollAmount);
    }
  };

  render() {
    var columnNames = this.columnNames();
    var pagination = this.props.paginationDisabled ? null : [
      div({key: 'up',
           className: 'table-page-up-arrow',
           onClick: this.navigateTablePage.bind(null, this.state.page - 1)}),
      input({key: 'input',
             className: 'text-subheading',
             style: {width: this.state.paginationInputWidth},
             ref: 'pageInput',
             type: 'text',
             defaultValue: 1,
             maxLength: ('' + this.props.numPages).length,
             onBlur: this.resetPageInput,
             onKeyDown: this.handlePageNumberChange}),
      span({key: 'slash',
            className: 'slash text-subheading'},
           ' / '),
      span({key: 'numPages',
            className: 'text-subheading',
            ref: 'numPages'},
           (_.isUndefined(this.props.numPages) ? '-' : this.props.numPages) + ' '),
      div({key: 'dn',
           className: 'table-page-down-arrow',
           onClick: this.navigateTablePage.bind(null, this.state.page + 1)})
    ];

    // Calculate the range of results we're currently displaying.
    var lowResult = this.props.resultsPerPage * (this.state.page - 1) + 1;
    var highResult = Math.min(this.props.totalResults, (this.props.resultsPerPage * this.state.page));
    var currentResultRange = 'Displaying: ' + lowResult + '-' + highResult + ' / ' + this.props.totalResults;
    var tableRecords = div({className: 'table-records text-subheading'}, currentResultRange);

    // Create the column resizing divs that will track which cells to resize.
    var columnResizers = _.map(columnNames, function(name, idx) {
        return ColumnResizer({colIdx: idx,
                              canResize: this.state.canResize,
                              isInvisible: this.props.columns[name].isInvisible,
                              startResize: this.startResize.bind(null, idx),
                              resetWidth: this.resetWidth.bind(null, idx)});
    }, this);

    // This is the case where there are no body rows, but we want horizontal scroll to be enabled for the case
    // where headers exceed DataTable's width.
    var tableStyle = {width: this.props.width};
    var noRowData = _.isEmpty(this.props.items);
    if (noRowData) {
      _.extend(tableStyle, {'overflow-x': 'scroll'});
    }

    return div({className: 'table'},
               div({className: cx({datatable: true, 'has-action-path': this.props.hasActionPath}),
                    style: tableStyle,
                    onMouseMove: this.doResize,
                    onMouseUp: this.endResize},
                 THead({ref: 'tableHead',
                        activeColumns: this.props.activeColumns,
                        allowEditColumnHeader: this.props.allowEditColumnHeader,
                        batchEditEnabled: this.props.batchEditEnabled,
                        colDropdownItems: this.props.colDropdownItems,
                        colLongNameEnabled: this.props.colLongNameEnabled,
                        columnNames: columnNames,
                        columnResizers: columnResizers,
                        columns: this.props.columns,
                        colWidths: this.state.colWidths,
                        handleBatchEditCheckboxClick: this.props.handleBatchEditCheckboxClick,
                        handleDropdownClick: this.props.handleDropdownClick,
                        sortDisabled: this.props.sortDisabled,
                        transposed: this.props.transposed,
                        updateActiveColumns: this.updateActiveColumns,
                        viewOnly: this.props.viewOnly
                 }),
                 THeadStatus({ref: 'tableHeadStatus',
                   columnNames: columnNames,
                   columnResizers: columnResizers,
                   columns: this.props.columns,
                   colWidths: this.state.colWidths,
                   statusIcons: this.props.statusIcons
                 }),
                 THeadDataType({ref: 'tableHeadDataType',
                   columnNames: columnNames,
                   columnResizers: columnResizers,
                   columns: this.props.columns,
                   colWidths: this.state.colWidths,
                   displayDataType : this.props.displayDataType,
                   handleTypeDropdownClick: this.props.handleTypeDropdownClick,
                   typeDropdownItems: this.props.typeDropdownItems,
                   viewOnly: this.props.viewOnly
                 }),
                 div({ref: 'twrapper', className: cx({'tbody-wrapper': true, 'scroll-x': this.state.canResize && !noRowData}),
                      onScroll: this.handleBodyScroll},
                   TBody({ref: 'tableBody',
                          items: this.props.items,
                          columns: this.props.columns,
                          columnNames: columnNames,
                          columnResizers: columnResizers,
                          colWidths: this.state.colWidths,
                          highlightRows: this.props.highlightRows,
                          handleRowClick: this.props.handleRowClick})
                 )
               ),
              this.props.paginationDisabled ? null : div({ref: 'table-pagination', className: 'table-pagination'},
                 pagination,
                 tableRecords)
              );
  }
}

module.exports = DataTable;
