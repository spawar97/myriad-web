var _ = require('underscore');

var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var Util = require('../../util/util');

/**
 * This mixin serves as the base for all list filtering panes.
 */
var ListFilterMixin = {
  componentWillReceiveProps: function(nextProps) {
    if (!_.isEqual(this.props.query, nextProps.query)) {
      ExposureActions.extractListFilters(this.props.listFilterType, nextProps.query);
    }
  },

  componentWillMount: function() {
    // If one of our list filter parameters is enabled on mount then we want to make
    // sure that the list filter pane is open.
    // And don't do this on mobile.
    if (!Util.isMobile() && this.props.immExposureStore && this.props.query && this.props.listFilterType) {
      if (this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType]).some(function(immFilter, urlKey) {
        return _.has(this.props.query, urlKey);
      }, this)) {
        ExposureActions.openListFilterPane();
      }
    }
  },

  componentDidMount: function() {
    ExposureActions.extractListFilters(this.props.listFilterType, this.props.query);
  },

  handleFilterReset: function(type) {
    var newQueryParams = _.chain(this.props.query).clone()
      .omit(this.props.immExposureStore.getIn(['listFilters', type]).keySeq().toJS())  // Drop all filters.
      .value();

    // If we've actually changed the settings, move to first page.
    if (!_.isEqual(this.props.query, newQueryParams)) {
      newQueryParams.page = 1;
    }

    ExposureActions.folderViewRefreshCheckedFileIds();
    var fileId = this.props.params && 'fileId' in this.props.params ? this.props.params.fileId : null;  // Are we in a folder?
    this.context.router.push({name: type, params: {fileId: fileId}, query: newQueryParams});
  },

  handleFilterSelection: function(type, filterKey, selection) {
    selection = _.has(selection, 'id') ? selection.id : selection;
    var immFilters = this.props.immExposureStore.getIn(['activeListFilters', type]);
    var filterType = this.props.immExposureStore.getIn(['listFilters', type, filterKey, 'type']);
    if (filterType === ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE) {
      // Flip the toggles value.
      selection = (immFilters.get(filterKey) !== 'true').toString();
    }

    var immNewFilterState = immFilters.set(filterKey, selection);

    var newQueryParams = _.chain(this.props.query).clone()
      .omit(immNewFilterState.keySeq().toJS())  // Drop all currently set filter values from query.
      .extend(immNewFilterState.filter(function(value) {  // Don't add filters with default values to query.
        switch (filterType) {
          case ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE:
            return value !== 'false';
          case ExposureAppConstants.LIST_FILTER_TYPE_DROPDOWN:
          default:
            if (_.has(value, 'id')) {
              return value.id !== FrontendConstants.ALL;
            } else {
              return value !== FrontendConstants.ALL;
            }
        }
      }).toJS()).value();

    // Need to clean up reportFilter identifier since it is an object instead of a string.
    if (filterKey === 'reportFilter' && _.has(newQueryParams.reportFilter, 'id')) {
      newQueryParams.reportFilter = newQueryParams.reportFilter.id;
    }

    // Whenever the task type filter gets switched, we need to unset the task state filter.
    if (filterKey === 'taskTypeFilter') {
      delete newQueryParams.taskStateFilter;
      const immTaskStateFilter = this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType, 'taskStateFilter']);
      ExposureActions.updateListFilter(this.props.listFilterType, 'taskStateFilter', immTaskStateFilter.delete('filterOptions'));
    }

    // Reset to the first page on every filter change.
    if (!_.isEqual(this.props.query, newQueryParams)) {
      newQueryParams.page = 1;
    }

    ExposureActions.folderViewRefreshCheckedFileIds();

    var fileId = this.props.params && 'fileId' in this.props.params ? this.props.params.fileId : null;  // Are we in a folder?
    var navType = null;
    switch (type) {
      case ExposureAppConstants.LIST_FILTER_TARGET_FOLDERS:
        navType = fileId ? RouteNameConstants.EXPOSURE_FOLDERS_SHOW : RouteNameConstants.EXPOSURE_FOLDERS;
        break;
      case ExposureAppConstants.LIST_FILTER_TARGET_TASKS:
        navType = RouteNameConstants.EXPOSURE_TASKS;
        break;
    }
    this.context.router.push({name: navType, params: {fileId: fileId}, query: newQueryParams});
  }
};

module.exports = ListFilterMixin;
