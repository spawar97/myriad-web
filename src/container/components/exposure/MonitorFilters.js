var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Combobox = React.createFactory(require('../Combobox'));
var Spinner = React.createFactory(require('../Spinner'));
var ToggleButton = React.createFactory(require('../ToggleButton'));
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');

var div = DOM.div;
var span = DOM.span;
var a = DOM.a;

class MonitorFilters extends React.Component {
  static displayName = 'MonitorFilters';

  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    handleToggleFilterByBreach: PropTypes.func.isRequired,
    handleUpdateWhatIdentifierDropdown: PropTypes.func.isRequired,
    disabledFilterByBreach: PropTypes.bool,
    displayFilters: PropTypes.bool,
    displayNames: PropTypes.array,
    filterBreachOnly: PropTypes.bool,
    previewIsLoading: PropTypes.bool,
    selectedWhatIdentifier: PropTypes.string,
    uniquenessNames: PropTypes.array,
    whatIdentifierMap: PropTypes.object
  };

  isReady = () => {
    return this.props.displayNames && this.props.uniquenessNames && this.props.whatIdentifierMap;
  };

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

    return div({className: 'filters'},
      div({className: 'sub-tab-header'},
        FrontendConstants.FILTERS,
        a({className: 'icon-question-circle', href: Util.formatHelpLink('FILTER_IN_MONITOR'), target: '_blank'}),
        div({className: 'close-button', onClick: this.props.handleClose})),
      div({className: 'monitor-filter'},
        div({className: 'filter-title'}, `${this.props.displayNames.join(', ')} (${this.props.uniquenessNames.join(', ')})`),
        dropdown),
      div({className: 'filter-block'},
        div({className: 'filter-title'},
          FrontendConstants.SHOW_ONLY_THRESHOLD_BREACHES,
          span({className: 'breach-only-toggle'}, ToggleButton({
            isActive: this.props.filterBreachOnly,
            activeText: FrontendConstants.CHECKMARK,
            disabled: this.props.disabledFilterByBreach,
            onClick: this.props.handleToggleFilterByBreach})))),
      // Disable user action on Filters pane when preview is loading.
      this.props.previewIsLoading ? div({className: 'container-overlay'}) : null);
  }
}

module.exports = MonitorFilters;
