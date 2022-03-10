const React = require('react');
const Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

const Combobox = React.createFactory(require('../Combobox'));
const DateRange = React.createFactory(require('../DateRange'));
const Spinner = React.createFactory(require('../Spinner'));
const DataTypeConstants = require('../../constants/DataTypeConstants');
const FrontendConstants = require('../../constants/FrontendConstants');
const Util = require('../../util/util');
const Button = React.createFactory(require('../Button'));

const div = DOM.div;
const span = DOM.span;
var a = DOM.a;

const classifier = (s) => s.toLowerCase().replace(/ /, '-');

class BuiltinTaskKPIFilters extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      immSelectedFilterOptions: props.immSelectedFilterOptions,
    };
  }

  static displayName = 'BuiltinTaskKPIFilters';

  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    filterOptions: PropTypes.object,
    immSelectedFilterOptions: PropTypes.instanceOf(Imm.Map).isRequired,
    displayFilters: PropTypes.bool,
    applyTaskFilters: PropTypes.func.isRequired
  };

  static defaultProps = {displayFilters: false, immSelectedFilterOptions: {}};

  isReady = () => {
    return !!this.props.filterOptions;
  };

  /**
   * Wraps around the filter handler, if the selections match the bounds, just clear them so that we don't send any
   * filter requests to the server. We need to do this here, so we don't need to teach the parent component about min
   * and max bounds.
   * It uses the valueFormatter, because we want to reset the filter for dates if we're in the same date, rather than
   * try to hit the exact epoch.
   * @param field
   * @param dataType
   * @param type
   * @param min
   * @param max
   * @param selections
   */
  handleDateRange = (field, dataType, type, min, max, selections) => {
    const lowerBound = Util.valueFormatter(selections.lowerBound, dataType);
    const upperBound = Util.valueFormatter(selections.upperBound, dataType);
    const minBound = Util.valueFormatter(min, dataType);
    const maxBound = Util.valueFormatter(max, dataType);
    this.handleFilterSelection(field, dataType, type, lowerBound === minBound && upperBound === maxBound ? {} : selections)
  };

  resetAllFilters(applyTaskFilters) {
    this.setState({
      immSelectedFilterOptions: Imm.Map()
    });
    applyTaskFilters(Imm.Map());
  }

  applyFilters(applyTaskFilters, immSelectedFilterOptions) {
    applyTaskFilters(immSelectedFilterOptions)
  }

  handleFilterSelection(field, dataType, type, selections) {
    let immSelectedFilterOptions;
    let actionTakenORTaskStatusSelections = [];
    // If selections are empty clear the field.
    if (_.isEmpty(selections)) {
      immSelectedFilterOptions = this.state.immSelectedFilterOptions.delete(field);
    } else if (type === 'EQUALS' && (field === FrontendConstants.ACTION_TAKEN_FILTER || field === FrontendConstants.TASK_STATUS_FILTER)) {
      let actionTakenORTaskStatus = this.props.filterOptions[field].filterOptions;
      for(let i =0; i< selections.length; i++) {
            let actionTakenORTaskStatusName = actionTakenORTaskStatus.find(o => o.value === selections[i]);
        actionTakenORTaskStatusSelections.push(actionTakenORTaskStatusName.displayName)
        }
        immSelectedFilterOptions = this.state.immSelectedFilterOptions.set(field, Imm.fromJS(
            _.map(actionTakenORTaskStatusSelections, selection => ({field, dataType, type, value: selection}))));
    } else if (type === 'EQUALS') {
      immSelectedFilterOptions = this.state.immSelectedFilterOptions.set(field, Imm.fromJS(
        _.map(selections, selection => ({field, dataType, type, value: selection}))));
    } else if (type === 'RANGE') {
      immSelectedFilterOptions = this.state.immSelectedFilterOptions.set(field, Imm.fromJS([
        {field, dataType, type: 'GREATER_THAN', value: selections.lowerBound},
        {field, dataType, type: 'LESS_THAN', value: selections.upperBound}
      ]));
    }
    this.setState({
      immSelectedFilterOptions: immSelectedFilterOptions || this.state.immSelectedFilterOptions
    });
  }

  render() {
    if (!this.isReady()) {
      // Only display a spinner if the filter pane is visible, otherwise we end up with a double spinner.
      return this.props.displayFilters ? Spinner() : null;
    }

    var whats = _.values(this.props.whatIdentifierMap);
    whats.unshift({text: FrontendConstants.ALL, value: null});
    var dropdown = Combobox({
      className: 'what-identifier-dropdown',
      placeholder: FrontendConstants.ALL,
      value: this.props.selectedWhatIdentifier,
      onChange: this.props.handleUpdateWhatIdentifierDropdown,
      // Setting the labelKey so we can consume in the format we get the what identifier map. I don't want to hunt down
      // everything that might touch the map just yet (or I'd convert its `text` field to `label`).
      labelKey: 'text',
      options: Imm.fromJS(whats)
    });
    const fields = ['Task Type', 'Task Status', 'Action Taken', 'Risk', 'Open Date', 'Last Assignment Date' , 'Due Date',
        'Close Date', 'Task Creator', 'Task Assignees', 'Study', 'Country', 'Site ID', 'Site Name'];

    const dropdowns = _.map(fields, (field) => {
      if (field in this.props.filterOptions) {
        const filter = this.props.filterOptions[field];
        if (filter.dataType === DataTypeConstants.DATE) {
          const dataType = filter.dataType;
          // Date range filter
          const minLowerBound = Util.valueParser(filter.filterOptions[0].value, dataType);
          const maxUpperBound = Util.valueParser(filter.filterOptions[1].value, dataType);

          const lowerBound = Util.valueParser(this.state.immSelectedFilterOptions.getIn([field, 0, 'value'], minLowerBound), dataType);
          const upperBound = Util.valueParser(this.state.immSelectedFilterOptions.getIn([field, 1, 'value'], maxUpperBound), dataType);
          return [
            div({className: 'filter-block date-filter-block'},
              div({className: 'filter-title'}, span({className: 'filter-title-text'}, field)),
              div({className: 'filter-element'},
                DateRange({
                  minLowerBound,
                  maxUpperBound,
                  lowerBound,
                  upperBound,
                  onRangeUpdate: this.handleDateRange.bind(this, field, filter.dataType, 'RANGE', minLowerBound, maxUpperBound)
                })
              )
            )
          ];
        } else {
          const immFilterOptions = Imm.fromJS(filter.filterOptions);
          const selectedValues = _.pluck(this.state.immSelectedFilterOptions.get(field, Imm.List()).toJS(), 'value');
          return [
            div({className: 'filter-block dropdown-filter-block'},
              div({className: 'filter-title'}, span({className: 'filter-title-text'}, field)),
              div({className: 'filter-element'},
                Combobox({
                  className: `builtin-filter-${classifier(field)} filter-dropdown`,
                  clearable: true,
                  multi: true,
                  onChange: this.handleFilterSelection.bind(this, field, filter.dataType, 'EQUALS'),
                  labelKey: 'displayName',
                  value: field === FrontendConstants.ACTION_TAKEN_FILTER || field === FrontendConstants.TASK_STATUS_FILTER ? immFilterOptions.filter(immFilterOption => _.contains(selectedValues, immFilterOption.get('displayName'))) : immFilterOptions.filter(immFilterOption => _.contains(selectedValues, immFilterOption.get('value'))),
                  options: immFilterOptions
                })
              )
            )
          ];
        }
      }
    });
    const resetAllIncludedFilters = Button({
        classes: {'reset-all-button': true},
        children: FrontendConstants.RESET_ALL,
        isSecondary: true,
        onClick: this.resetAllFilters.bind(this, this.props.applyTaskFilters)});
    const applyIncludedFilters = Button({
        classes: {'apply-filters-button': true},
        children: FrontendConstants.APPLY,
        isPrimary: true,
        onClick: this.applyFilters.bind(this, this.props.applyTaskFilters, this.state.immSelectedFilterOptions)});
    return div({className: 'filters'},
      div({className: 'sub-tab-header'},
        FrontendConstants.FILTERS,
        a({className: 'icon-question-circle', href: Util.formatHelpLink('KPI_FILTER'), target: '_blank'}),
        div({className: 'close-button', onClick: this.props.handleClose})),
      div({className: 'panel included-filter'},
        div({className: 'panel-sub-header text-truncation block-underline'},
          span({className: 'panel-sub-header-title'}, FrontendConstants.INCLUDED),
          div({className: 'filter-buttons-wrapper'},
            resetAllIncludedFilters,
            applyIncludedFilters
          )
        ),
          dropdowns),
      // Disable user action on Filters pane when preview is loading.
      this.props.previewIsLoading ? div({className: 'container-overlay'}) : null);
  }
}

module.exports = BuiltinTaskKPIFilters;
