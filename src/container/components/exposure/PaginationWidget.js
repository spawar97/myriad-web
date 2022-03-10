var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Combobox = React.createFactory(require('../Combobox'));
var KeyCodeConstants = require('../../constants/KeyCodeConstants');
var PaginationConstants = require('../../constants/PaginationConstants');
var PaginationUtil = require('../../util/PaginationUtil');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv),
    input = DOM.input,
    span = React.createFactory(require('../TouchComponents').TouchSpan);

class PaginationWidget extends React.Component {
  static displayName = 'PaginationWidget';

  static propTypes = {
    curPage: PropTypes.number.isRequired,
    pageChangeHandler: PropTypes.func.isRequired,
    rowsPerPage: PropTypes.number.isRequired,
    rowsPerPageChangeHandler: PropTypes.func.isRequired,
    totalRows: PropTypes.number.isRequired
  };

  state = {edit: false,
          compactMode: false};

  shouldComponentUpdate(nextProps, nextState) {
    return this.state !== nextState ||
      this.props.curPage !== nextProps.curPage ||
      this.props.rowsPerPage !== nextProps.rowsPerPage ||
      this.props.totalRows !== nextProps.totalRows
  }

  componentWillMount() {
    this.defaultPageSize = PaginationUtil.defaultRowsPerPage();
  }

  componentDidMount() {
    var compactMode = this.isCompact();
    this.setState({compactMode: compactMode});
  }

  componentWillReceiveProps() {
    var compactMode = this.isCompact();
    this.setState({compactMode: compactMode});
  }

  calculateTotalPages = () => {
    var totalRows = this.props.totalRows;
    var rowsPerPage = this.props.rowsPerPage;
    return Math.ceil(totalRows / rowsPerPage);
  };

  handlePageBoxEnter = (e) => {
    switch (e.keyCode) {
      case KeyCodeConstants.ENTER:
        this.setState({edit: false});
        var page = e.target.value;
        if (/^\d+$/.test(e.target.value)) {
          page = parseInt(page, 10);
          if (1 <= page && page <= this.calculateTotalPages()) {
            this.props.pageChangeHandler(page);
          }
        }
        break;
      case KeyCodeConstants.ESCAPE:
        this.setState({edit: false});
        break;
    }
  };

  handlePageBoxFocus = () => {
    this.setState({edit: true}, function() {
      var input = ReactDOM.findDOMNode(this.refs['page-number-input']);
      input.focus();
      input.select();
    });
  };

  handlePageBoxBlur = () => {
    this.setState({edit: false});
  };

  handlePagination = (paginationAction) => {
    var targetPage = 1;
    switch(paginationAction) {
      case PaginationConstants.PAGINATION_FIRST_PAGE:
        targetPage = 1;
        break;
      case PaginationConstants.PAGINATION_PREV_PAGE:
        targetPage = _.max([1, this.props.curPage - 1]);
        break;
      case PaginationConstants.PAGINATION_NEXT_PAGE:
        targetPage = _.min([this.calculateTotalPages(), this.props.curPage + 1]);
        break;
      case PaginationConstants.PAGINATION_LAST_PAGE:
        targetPage = this.calculateTotalPages();
        break;
    }
    if (this.props.curPage !== targetPage) {
      this.props.pageChangeHandler(targetPage);
    }
  };

  handleRowsPerPageChange = (rowsPerPage) => {
    this.props.rowsPerPageChangeHandler(rowsPerPage);
  };

  // This was implemented to force a more compact pagination layout when the
  // available width falls below 560px. See TP#8206 for details.
  isCompact = () => {
    return $(ReactDOM.findDOMNode(this)).width() < 560;
  };

  render() {
    var totalPages = this.calculateTotalPages();
    var isSinglePage = totalPages === 1;
    var ctx = Util.get2dCanvasContext('normal 14px ' + Util.getWidestFont());
    // 15px is added to have more space on top of text size of totalPages
    var inputWidth = ctx.measureText(totalPages.toString()).width + 15;
    var forwardDisabled = this.props.curPage === 1;
    var backwardDisabled = this.props.curPage === this.calculateTotalPages();

    var lowerRowNumber = (this.props.curPage - 1) * this.props.rowsPerPage + 1;
    var upperRowNumber = this.props.curPage * this.props.rowsPerPage;
    if (upperRowNumber > this.props.totalRows) {
      upperRowNumber = this.props.totalRows;
    }

    // Skip all of the below work if there's nothing to do.
    if (this.props.totalRows === 0) {
      // React.getDOMNode(this) (in isCompact) returns null when render function returns null even when the
      // component is mounted.
      return div();
    }

    var pageNumber = this.state.edit ? input({
      className: 'page-number',
      type: 'text',
      ref: 'page-number-input',
      defaultValue: this.props.curPage,
      onKeyDown: this.handlePageBoxEnter,
      maxLength: 10,
      style: {width: inputWidth},
      onBlur: this.handlePageBoxBlur
    }) : span({className: 'page-number', style: {width: inputWidth}}, this.props.curPage);

    var rowsPerPageOptions = PaginationUtil.rowsPerPageOptions();
    var rowsPerPageEntry = rowsPerPageOptions[this.props.rowsPerPage / this.defaultPageSize - 1];
    var rowsPerPage = _.isUndefined(rowsPerPageEntry) ? "20" : rowsPerPageEntry.rowsPerPage;

    var displayInfo = div({className: 'display-info-container'},
      div({className: 'display-info'}, 'Displaying ' + lowerRowNumber + '-' + upperRowNumber + ' of ' + this.props.totalRows)
    );

    var paginator = div({className: 'paging-widget-container'},
      div({className: 'paging-widget'},
        div({className: cx('virtual-table', {'single-page': isSinglePage})},
          div({className: 'virtual-table-row'},
            div({className: cx('icon-first-page', 'virtual-table-cell', {disabled: forwardDisabled, 'single-page': isSinglePage}),
                 onClick: this.handlePagination.bind(null, PaginationConstants.PAGINATION_FIRST_PAGE)}
            ),
            div({className: cx('icon-previous-page', 'virtual-table-cell', {disabled: forwardDisabled, 'single-page': isSinglePage}),
                 onClick: this.handlePagination.bind(null, PaginationConstants.PAGINATION_PREV_PAGE)}
            ),
            div({className: cx('virtual-table-cell', 'page-text', {'single-page': isSinglePage})},
              div({className: 'virtual-table'},
                div({className: 'virtual-table-row'},
                  span({className: 'virtual-table-cell'}, 'Page '),
                  div({className: cx('virtual-table-cell', 'page-number-container'), style: {width: inputWidth}, onClick: this.state.edit ? _.noop : this.handlePageBoxFocus},
                    pageNumber
                  ),
                  span({className: 'virtual-table-cell'}, ' of '),
                  div({className: cx('virtual-table-cell', 'paging-widget-totalpages'), style: {width: inputWidth}}, totalPages)
                )
              )
            ),
            div({className: cx('icon-next-page', 'virtual-table-cell', {disabled: backwardDisabled, 'single-page': isSinglePage}),
                 onClick: this.handlePagination.bind(null, PaginationConstants.PAGINATION_NEXT_PAGE)}
            ),
            div({className: cx('icon-last-page', 'virtual-table-cell', {disabled: backwardDisabled, 'single-page': isSinglePage}),
                 onClick: this.handlePagination.bind(null, PaginationConstants.PAGINATION_LAST_PAGE)}
            )
          )
        )
      )
    );

    var rowsPerPageDropdown = div({className: 'rows-per-page-dropdown-container'},
      Combobox({
        className: 'rows-per-page-dropdown',
        value: rowsPerPage,
        onChange: this.handleRowsPerPageChange,
        valueKey: 'rowsPerPage',
        labelKey: 'rowsPerPage',
        searchable: false,
        options: Imm.fromJS(rowsPerPageOptions)
      })
    );

    return this.state.compactMode ?
      div({className: cx('pagination-widget', 'compact')},
        paginator,
        div({className: 'pagination-widget-compact-row'},
          div({className: 'spacer'}, null),
          displayInfo,
          rowsPerPageDropdown)) :
      div({className: 'pagination-widget'},
        displayInfo,
        paginator,
        rowsPerPageDropdown);
  }
}

module.exports = PaginationWidget;
