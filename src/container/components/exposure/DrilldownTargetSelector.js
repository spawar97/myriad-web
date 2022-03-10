var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Combobox = React.createFactory(require('../Combobox'));
var FrontendConstants = require('../../constants/FrontendConstants');

var div = DOM.div;

class DrilldownTargetSelector extends React.Component {

  constructor(props) {
    super(props);

    // Bind methods to the class, since we're not using React.createClass anymore which did this automatically.
    this.generateKeyAndDropdown = this.generateKeyAndDropdown.bind(this);
  }

  generateKeyAndDropdown(immDrilldownTarget) {
    const {immFilesAccessible, onChange} = this.props;

    const drilldownKey = immDrilldownTarget.get('key');
    const key = drilldownKey === '_all' ? 'Default' : drilldownKey;

    const list = immDrilldownTarget.get('list');

    const dropdown = Combobox({
      key,
      className: 'drilldown-target-dropdown',
      placeholder: 'Select',
      value: immFilesAccessible.filter(file => list.contains(file.id)),
      valueKey: 'id',
      labelKey: 'text',
      groupBy: 'type',
      multi: true,
      onChange: onChange.bind(null, drilldownKey),
      options: immFilesAccessible
    });
    return div({key, className: 'drilldown-target-group'}, div({className: 'drilldown-target-key'}, key), dropdown);
  }

  render() {
    const {immDrilldownTargets} = this.props;
    return div({className: 'drilldown-target-selector'}, immDrilldownTargets.map(this.generateKeyAndDropdown).toJS());
  }
}

DrilldownTargetSelector.propTypes = {
  immDrilldownTargets: PropTypes.instanceOf(Imm.List).isRequired,
  immFilesAccessible: PropTypes.instanceOf(Imm.List).isRequired,
  onChange: PropTypes.func.isRequired
};

module.exports = DrilldownTargetSelector;
