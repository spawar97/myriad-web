var _ = require('underscore');

var Util = require('./util');
var ListViewConstants = require('../constants/ListViewConstants');

var PaginationUtil = {
  _mobileRowsPerPageOptions: [{rowsPerPage: ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE}],

  _nonMobileRowsPerPageOptions: _.range(1, ListViewConstants.PAGE_SIZE_DROPDOWN_ROWS).map(function(index) {
    return {rowsPerPage: index * ListViewConstants.DEFAULT_ROWS_PER_PAGE};
  }),

  defaultRowsPerPage: function() {
    return Util.isMobile() ? ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE : ListViewConstants.DEFAULT_ROWS_PER_PAGE;
  },

  rowsPerPageOptions: function() {
    return Util.isMobile() ? this._mobileRowsPerPageOptions : this._nonMobileRowsPerPageOptions;
  }
};

module.exports = PaginationUtil;
