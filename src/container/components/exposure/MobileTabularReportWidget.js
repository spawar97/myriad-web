var React = require('react');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
var MobileListView = React.createFactory(require('../MobileListView'));
var PaginationWidget = React.createFactory(require('./PaginationWidget'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var ListViewConstants = require('../../constants/ListViewConstants');
var PaginationConstants = require('../../constants/PaginationConstants');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = React.createFactory(require('../TouchComponents').TouchSpan);

class MobileTabularReportWidget extends React.Component {
  static displayName = 'MobileTabularReportWidget';

  static propTypes = {
    drilldownId: PropTypes.string,
    immReport: PropTypes.instanceOf(Imm.Map)
  };

  state = {
    rowDetailIndex: null
  };

  componentWillUnmount() {
    ExposureActions.setShowMobileTabularReportDetails(false);
  }

  // Pagination related functions start here.
  getCurPageNumber = () => {
    var rowsPerPage = 10;
    return this.props.immReport.getIn(['tabularReportState', 'pageLowerLimit']) / rowsPerPage + 1;
  };

  getMaxPageNumber = () => {
    var totalRows = this.props.immReport.getIn(['reportData', 0, 'totalRows']);
    var rowsPerPage = 10;
    return Math.ceil(totalRows / rowsPerPage);
  };

  paginationHandler = (paginationAction) => {
    var reportId = this.props.immReport.getIn(['fileWrapper', 'file', 'id']);
    var destinationPage = 1;
    switch(paginationAction) {
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
    ExposureActions.tabularReportGoToPage(reportId, this.props.drilldownId, destinationPage);
  };

  // Pagination related functions end here.

  createListItem = (immRow, immColumnHeaders, colIndex, isUnique) => {
    var dataType = this.props.immReport.getIn(['tabularReportState', 'query', 'columns', colIndex, 'dataType']);
    var value = immRow.getIn(['values', colIndex]);
    return div({className: cx({'tabular-column': true, uniqueness: isUnique}), key: colIndex},
      div({className: 'tabular-column-name '}, immColumnHeaders.get(colIndex)),
      div({className: 'tabular-column-value'}, Util.valueFormatter(value, dataType)));
  };

  getListItemContents = (immRows, immColumns, immColumnHeaders) => {
    var immUniqueColumnIndices = Imm.List([]);
    var immFillerColumnIndices = Imm.List([]);

    immColumns.forEach(function(immCol, index) {
      if (immCol.get('isUnique')) {
        immUniqueColumnIndices = immUniqueColumnIndices.push(index);
      } else {
        immFillerColumnIndices = immFillerColumnIndices.push(index);
      }
    });

    // We need to pad out to at least 3 columns if we can.
    var fillerColumnsNeeded = 3 - immUniqueColumnIndices.size;
    immFillerColumnIndices = fillerColumnsNeeded > 0 ? immFillerColumnIndices.take(fillerColumnsNeeded) : Imm.List([]);

    return immRows.map(function(immRow, rowIndex) {
      var contents = immUniqueColumnIndices.map(function(colIndex) {
        return this.createListItem(immRow, immColumnHeaders, colIndex, true);
      }, this);

      contents = contents.concat(immFillerColumnIndices.map(function(colIndex) {
        return this.createListItem(immRow, immColumnHeaders, colIndex, false);
      }, this));

      return Imm.Map({contents: contents, icon: 'icon-info', action: this.toggleDetailedRowView.bind(null, rowIndex)});
    }, this);
  };

  getRowListItems = (immRow, immColumnHeaders) => {
    var immColumns = this.props.immReport.getIn(['tabularReportState', 'query', 'columns']);
    var immFormattedRow = Util.rowFormatter(immRow.get('values'), immColumns);
    return immFormattedRow.map(function(formattedValue, colIndex) {
      var header = immColumnHeaders.get(colIndex);
      var columnNameItem = div({className: 'tabular-column uniqueness', key: colIndex},
        div({className: 'tabular-column-name '}, header));
      var columnValue = div({className: 'tabular-column', key: colIndex + 1},
        div({className: 'tabular-column-value'}, formattedValue));
      return Imm.Map({contents: [columnNameItem, columnValue]});
    });
  };

  toggleDetailedRowView = (rowIndex) => {
    ExposureActions.pushBackNavAction(Imm.Map({text: FrontendConstants.BACK, backAction: function() {
      ExposureActions.setShowMobileTabularReportDetails(false);
      this.setState({rowDetailIndex: null});
    }.bind(this)}));

    ExposureActions.setShowMobileTabularReportDetails(true);
    this.setState({rowDetailIndex: rowIndex});
  };

  render() {

    // Take only ten rows because the first render will be given 20 rows by the default query.
    var immRows = this.props.immReport.getIn(['reportData', 0, 'rows']).take(10);
    var immColumnHeaders = this.props.immReport.getIn(['fileWrapper', 'file', 'reportConfig', 'columnHeaders']);
    var immColumns = this.props.immReport.getIn(['tabularReportState', 'query', 'columns']);
    var currentContent = null;
    var listItems = null;

    if (immRows.isEmpty()) {
      currentContent = EmptyContentNotice({noticeText: FrontendConstants.NO_DATA_RETURNED});
    } else if (this.state.rowDetailIndex !== null) {
      // We have data. Has the user requested a detailed view of a single row?
      // Display the detailed view for that row if yes, otherwise display the report.
      listItems = this.getRowListItems(immRows.get(this.state.rowDetailIndex), immColumnHeaders).toJS();

      currentContent = div({className: 'mobile-tabular-report-widget row-detail'},
          div({className: 'mobile-tabular-report-widget-row-detail-header-line light'}, 'Underlying Data Details'),
          MobileListView({listItems: listItems, dottedBorder: true}),
          div({className: 'mobile-tabular-report-widget-row-detail-bottom'}));
    } else {
      var totalRows = this.props.immReport.getIn(['reportData', 0, 'totalRows']);
      listItems = this.getListItemContents(immRows, immColumns, immColumnHeaders).toJS();

      currentContent = div(null,
        MobileListView({listItems: listItems}),
        PaginationWidget({
          paginationHandler: this.paginationHandler,
          pageChangeHandler: ExposureActions.tabularReportGoToPage.bind(null, this.props.immReport.getIn(['fileWrapper', 'file', 'id']), this.props.drilldownId),
          rowsPerPageChangeHandler: function() {},
          totalRows: totalRows,
          curPage: this.getCurPageNumber(),
          rowsPerPage: 10
        }));
    }

    return div({className: 'mobile-tabular-report-widget'}, currentContent);
  }
}

module.exports = MobileTabularReportWidget;
