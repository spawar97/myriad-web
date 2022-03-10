var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Combobox = React.createFactory(require('../Combobox'));
var Spinner = React.createFactory(require('../Spinner'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ToggleButton = React.createFactory(require('../ToggleButton'));
var Util = require('../../util/util');

var a = DOM.a;
var div = React.createFactory(require('../TouchComponents').TouchDiv),
    span = React.createFactory(require('../TouchComponents').TouchSpan);

class ListFilters extends React.Component {
  static displayName = 'ListFilters';

  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleReset: PropTypes.func.isRequired,
    handleSelect: PropTypes.func.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    listFilterType: PropTypes.string.isRequired,
    filterHelpFile: PropTypes.string.isRequired
  };

  componentWillMount() {
    const immReportFilter = this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType, 'reportFilter']);
    const immStatusFilter = this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType, 'taskStateFilter']);
    const immTypeFilter = this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType, 'taskTypeFilter']);

    const immTaskTypes = this.props.immExposureStore.get('taskTypes');
    const selectedTaskTypeFilterId = this.props.immExposureStore.getIn(['activeListFilters', this.props.listFilterType, 'taskTypeFilter']);
    const immSelectedTaskType = immTaskTypes.find(immTaskType => immTaskType.get('id') === selectedTaskTypeFilterId);

    if (immReportFilter && _.isUndefined(immReportFilter.get('filterOptions'))) {
      ExposureActions.fetchFileConfigs([], function(immExposureStore) {
        var newFilter = immReportFilter.toJS();
        newFilter.filterOptions = Util.getAllTaskReportsAndDashboards(immExposureStore);
        newFilter.filterOptions.unshift({id: FrontendConstants.ALL, text: FrontendConstants.ALL, type: FrontendConstants.ALL});
        newFilter.groupBy = 'type';
        ExposureActions.updateListFilter(this.props.listFilterType, 'reportFilter', Imm.fromJS(newFilter));
      }.bind(this));
    }

    if (immTypeFilter && _.isUndefined(immTypeFilter.get('filterOptions'))) {
      const newFilter = immTypeFilter.toJS();
      newFilter.filterOptions = _.map(immTaskTypes.toJS(), taskType => {
        return {
          'id': taskType.id,
          'text': taskType.name
        }
      });
      newFilter.filterOptions.unshift({id: FrontendConstants.ALL, text: FrontendConstants.ALL, type: FrontendConstants.ALL});
      ExposureActions.updateListFilter(this.props.listFilterType, 'taskTypeFilter', Imm.fromJS(newFilter));
    }

    // Only populate this filter if there is a selected task type.
    if (immStatusFilter && _.isUndefined(immStatusFilter.get('filterOptions'))) {
      const newFilter = immStatusFilter.toJS();
      if (immSelectedTaskType) {
        newFilter.filterOptions = _.map(immSelectedTaskType.get('taskStates').toJS(), taskState => {
          return {
            'id': taskState.id,
            'text': taskState.name
          }
        });
      } else {
        newFilter.filterOptions = [
          {
            'id': 'Open',
            'text': FrontendConstants.OPEN
          },
          {
            'id': 'Closed',
            'text': FrontendConstants.CLOSED
          },
          {
            'id': 'Cancelled',
            'text': FrontendConstants.CANCELLED
          }
        ];
      }
      newFilter.filterOptions.unshift({id: FrontendConstants.ALL, text: FrontendConstants.ALL, type: FrontendConstants.ALL});
      ExposureActions.updateListFilter(this.props.listFilterType, 'taskStateFilter', Imm.fromJS(newFilter));
    }
  }

  render() {
    if (this.props.immExposureStore.get('fileConfigsRequestInFlight')) {
      return Spinner();
    }

    var immFilterDefinitions = this.props.immExposureStore.getIn(['listFilters', this.props.listFilterType]);
    var immFilterSelections = this.props.immExposureStore.getIn(['activeListFilters', this.props.listFilterType]);

    var immFilters = immFilterDefinitions.map(function(immDefinition, filter) {
      var title = immDefinition.get('title');

      switch (immDefinition.get('type')) {
        case ExposureAppConstants.LIST_FILTER_TYPE_TOGGLE:
          return div({className: 'list-filter-toggle-container', key: title},
            span({className: 'list-filter-toggle-title'}, title),
            ToggleButton({
              isActive: immFilterSelections.get(filter) === 'true',
              displayStar: filter === 'favoriteFilter',
              activeText: immDefinition.get('activeText'),
              onClick: this.props.handleSelect.bind(null, filter)})
            );
          break;
        case ExposureAppConstants.LIST_FILTER_TYPE_DROPDOWN:
        default:
          var additionalParams = {};
          var groupField = immDefinition.get('groupBy');
          if (groupField) {
            additionalParams.groupBy = groupField
          }
          // filterOptions is falsy when it is waiting on `fetchFileConfigs` to be set in the callback function.
          if (!immDefinition.get('filterOptions')) {
            // There can be multiple filters that fall into this code path and then we'd have multiple spinners in place
            // of filter options, so just returning null here so nothing is displayed.
            return null;
          }
          return div({className: 'list-filter-dropdown-container', key: title},
            span({className: 'list-filter-dropdown-title'}, title),
            Combobox(_.extend({
                className: 'associated-files-dropdown',
                value: immFilterSelections.get(filter, FrontendConstants.ALL),
                valueKey: 'id',
                labelKey: 'text',
                onChange: this.props.handleSelect.bind(null, filter),
                options: immDefinition.get('filterOptions', Imm.List())
              }, additionalParams))
          );
      }
    }, this).toList();

    return (
      div({className: 'filters'},
        div({className: 'section-title'},
          span({className: 'title-text'}, FrontendConstants.FILTERS,
            a({className: 'icon-question-circle', href: Util.formatHelpLink(this.props.filterHelpFile), target: '_blank'}),
          ),
          div({className: 'close-button', onClick: this.props.handleClose}),
          div({className: 'reset-button', onClick: this.props.handleReset}, FrontendConstants.RESET)),
        div({className: 'list-filters'}, immFilters))
    );
  }
}

module.exports = ListFilters;
