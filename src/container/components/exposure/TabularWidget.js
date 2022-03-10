var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var Imm = require('immutable');
var FixedDataTable = require('fixed-data-table-opt');
const Link = React.createFactory(require('react-router').Link);
import PropTypes from 'prop-types';

var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var FixedDataTableHeader = React.createFactory(require('../FixedDataTableHeader'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var PaginationConstants = require('../../constants/PaginationConstants');
var Util = require('../../util/util');

// These classes are dependent on the FixedDataTable class.
var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

/**
 * This used to be TabularReportWidget, but to increase re-use, the immReport prop was removed and replace with the components it uses.
 */
class TabularWidget extends React.Component {
  static displayName = 'TabularWidget';

  static propTypes = {
    // All of these props were pulled out of what used to be TabularReportWidget so that this TabularWidget could be
    // re-used by the builtins. They were chosen by looking for the smallest set of elements needed to render the
    // table, without being report-specific.
    width: PropTypes.number.isRequired,
    immColumns: PropTypes.instanceOf(Imm.List).isRequired,
    immColumnHeaders: PropTypes.instanceOf(Imm.List).isRequired,
    immRows: PropTypes.instanceOf(Imm.List).isRequired,
    immPageOrdering: PropTypes.instanceOf(Imm.List).isRequired,
    pageLowerLimit: PropTypes.number.isRequired,
    pageUpperLimit: PropTypes.number.isRequired,
    totalRows: PropTypes.number.isRequired,
    drilldownId: PropTypes.string,
    // The following prop allows using an alternative tabular state and paging mechanism. The builtin tabulars don't
    // need to go through the main store.
    tabularActions: PropTypes.object
  };

  static defaultProps = {
    tabularActions: ExposureActions
  };

  state = {colWidths: null};

  componentWillReceiveProps(nextProps) {
    if (this.props.width !== nextProps.width && this.state.colWidths) {
      var eachColumnExtraPadding = (nextProps.width - this.props.width) / _.size(this.state.colWidths);
      var newWidths = _.map(this.state.colWidths, function(oldWidth) {
        return oldWidth + eachColumnExtraPadding;
      });
      this.setState({
        colWidths: newWidths
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  rowGetter = (index) => {
    return Util.rowFormatter(this.props.immRows.getIn([index, 'values']), this.props.immColumns).toJS();
  };

  getPaddedColWidths = () => {
    var widestFont = Util.getWidestFont();
    var ctx = Util.get2dCanvasContext('bold 14px ' + widestFont);
    var headerCellAdjustment = 66;  // 20px left padding, 20px right padding, 10px padding between vells, 16px icon width.
    var colWidths = this.props.immColumnHeaders.map(function(header) {
      return ctx.measureText(header).width + headerCellAdjustment;
    }).toJS();
    ctx = Util.get2dCanvasContext('normal 14px ' + widestFont);
    var bodyCellAdjustment = 40;  // 20px left padding, 20px right padding.
    this.props.immRows.forEach(function(immRow, index) {
      _.each(this.rowGetter(index), function(cellData, colIndex) {
        // Ensure that the length of the actual text is taken into account for Link cells.
        if (_.isObject(cellData) && 'to' in cellData) {
          cellData = cellData.to.cellText;
        }
        colWidths[colIndex] = _.max([colWidths[colIndex], ctx.measureText(cellData).width + bodyCellAdjustment]);
      });
    }, this);

    colWidths = colWidths.map((elem) => elem > 400 ? 400 : elem);
    var totalWidth = _.reduce(colWidths, function(memo, num) { return memo + num; }, 0);
    if (this.props.width > totalWidth) {
      var extraPadding = (this.props.width - totalWidth) / _.size(colWidths);
      return _.map(colWidths, function(minWidth) {
        return minWidth + extraPadding;
      });
    }

    return colWidths;
  };

  getCurPageNumber = () => {
    var rowsPerPage = this.props.pageUpperLimit - this.props.pageLowerLimit + 1;
    return this.props.pageLowerLimit / rowsPerPage + 1;
  };

  headerRenderer = (label, colIndex) => {
    var sortIndex = 2;
    var immColumn = this.props.immColumns.get(colIndex);
    var immPageOrdering = this.props.immPageOrdering.find(function(immPageOrdering) {
      return immPageOrdering.get('column').equals(immColumn);
    });
    if (immPageOrdering) {
      switch (immPageOrdering.get('ordering')) {
        case ListViewConstants.ORDER_ASCENDING_STR:
          sortIndex = 0;
          break;
        case ListViewConstants.ORDER_DESCENDING_STR:
          sortIndex = 1;
          break;
      }
    }
    return FixedDataTableHeader({
      contents: label,
      sortHandler: this.sortHandler.bind(null, colIndex),
      sortIndex: sortIndex
    });
  };

  sortHandler = (colIndex, sortIndex) => {
    this.props.tabularActions.tabularReportSetColumnSort(this.props.fileId, this.props.drilldownId, colIndex, sortIndex);
  };

  getMaxPageNumber = () => {
    var totalRows = this.props.totalRows;
    var rowsPerPage = this.props.pageUpperLimit - this.props.pageLowerLimit + 1;
    return Math.ceil(totalRows / rowsPerPage);
  };

  paginationHandler = (paginationAction) => {
    var reportId = this.props.fileId;
    var destinationPage = 1;
    switch (paginationAction) {
      case PaginationConstants.PAGINATION_FIRST_PAGE:
        destinationPage = 1;
        break;
      case PaginationConstants.PAGINATION_PREV_PAGE:
        destinationPage = this.getCurPageNumber() - 1;
        break;
      case PaginationConstants.PAGINATION_NEXT_PAGE:
        destinationPage = this.getCurPageNumber() + 1;
        break;
      case PaginationConstants.PAGINATION_LAST_PAGE:
        destinationPage = this.getMaxPageNumber();
        break;
    }
    this.props.tabularActions.tabularReportGoToPage(reportId, this.props.drilldownId, destinationPage, this.props.totalRows);
  };

  paginationRowsPerPageChangeHandler = (item) => {
    var reportId = this.props.fileId;
    this.props.tabularActions.tabularReportSetRowsPerPage(reportId, this.props.drilldownId, item);
  };

  /**
   * If the cell contains data that can be passed to a Link(), do so. Otherwise, leave it as is.
   * @param cellData
   * @param columnShortName
   * @returns {*}
   */
   cellRenderer = (width, cellData) => {
    var bodyCellAdjustment = 40;
    if (_.isObject(cellData) && 'to' in cellData) {
      return Link(_.extend({className: 'open-link'}, cellData), cellData.to.cellText);
    } else {
      return div({className: 'cellData-overflow', style : {maxWidth : 400 - bodyCellAdjustment}, title : width >= (400 - bodyCellAdjustment) ? cellData : null }, cellData);
    }
  };

  calculateWidth = () => {
    return document.getElementsByClassName('report-widget')[0].offsetWidth;
  }

  render() {
    var immColumnHeaders = this.props.immColumnHeaders;
    var rows = this.props.immRows;
    var colWidths = this.state.colWidths || this.getPaddedColWidths();

    var totalRows = this.props.totalRows;
    var rowsPerPage = this.props.pageUpperLimit - this.props.pageLowerLimit + 1;
    let fixedColumns = ["Study ID", "Study Id", "Study Name", "Study Identifier"];
    var tableArgs = immColumnHeaders.map(function(headerText, colIndex) {
      return Column({
        label: headerText,
        width: colWidths[colIndex],
        minWidth: 80,
        maxWidth: 400,
        dataKey: colIndex,
        cellRenderer: this.cellRenderer.bind(null, colWidths[colIndex]),  // TODO: only add this to the necessary columns
        headerRenderer: this.headerRenderer,
        fixed: fixedColumns.includes(headerText) ? true : false
      });
    }, this).toJS();

    let reportWidget = document.getElementsByClassName('report-widget')[0];

    if (reportWidget) {
      tableArgs.unshift({
        maxHeight: 500,
        width: this.calculateWidth(),
        headerHeight: 40,
        rowHeight: 40,
        // TODO: This prevents scroll events from being eaten by the table. This will hopefully be fixed in a future version of FDT and then we can remove this.
        overflowX: 'auto',
        overflowY: 'auto',
        rowsCount: rows.size,
        rowGetter: this.rowGetter});
    }
    else {
      // Existing code for fixedDatatable
      tableArgs.unshift({
        maxHeight: 4000,
        width: _.max([this.props.width, Util.sum(colWidths)]),
        headerHeight: 40,
        rowHeight: 40,
        // TODO: This prevents scroll events from being eaten by the table. This will hopefully be fixed in a future version of FDT and then we can remove this.
        overflowX: 'hidden',
        overflowY: 'hidden',
        rowsCount: rows.size,
        rowGetter: this.rowGetter});
    }


    return div({className: 'tabular-report-widget'},
      (rows.isEmpty()) ?
        EmptyContentNotice({noticeText: FrontendConstants.NO_DATA_RETURNED}) :
        div({className: `table-wrapper ${reportWidget ? "fixed-table-wrapper" : null}`}, Table.apply(null, tableArgs) ),
        PaginationWidget({
          paginationHandler: this.paginationHandler,
          pageChangeHandler: this.props.tabularActions.tabularReportGoToPage.bind(null, this.props.fileId, this.props.drilldownId),
          rowsPerPageChangeHandler: this.paginationRowsPerPageChangeHandler,
          totalRows: totalRows,
          curPage: this.getCurPageNumber(),
          rowsPerPage: rowsPerPage
        })
    );
  }
}

module.exports = TabularWidget;
