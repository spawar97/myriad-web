var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import Select from 'react-select';
import PropTypes from 'prop-types';

import ExposureAppConstants from '../constants/ExposureAppConstants';

/**
 * Wrapper around react-select that maintains some additional state that allows display of an abbreviated view.
 */
class Combobox extends React.Component {

  constructor(props) {
    super(props);
    // Set initial state.
    this.state = {
      // When expanded is true the user has clicked on the '+ X More' item and the dropdown is now in a state where it
      // displays the untruncated list of options.
      expanded: false,
      closeOnSelect: !this.props.multi
    };

    // Bind methods to the class, since we're not using React.createClass anymore which did this automatically.
    this.onChange = this.onChange.bind(this);
    this.onValueClick = this.onValueClick.bind(this);
    this.restoreAbbreviatedState = this.restoreAbbreviatedState.bind(this);
    this.generateAbbreviatedList = this.generateAbbreviatedList.bind(this);
  }

  /**
   * Returns a truncated list of selected items for display purposes.
   */
  generateAbbreviatedList() {
    const aboveLimit = this.props.abbreviationThreshold && this.props.value.size > this.props.abbreviationThreshold;
    if (aboveLimit && !this.state.expanded) {
      // If all values are selected, and we haven't expanded the combobox yet, only display a single item reading 'All
      // Values Selected'.
      return this.props.value.slice(0, this.props.abbreviationThreshold).toList();
    } else {
      return this.props.value;
    }
  }

  /**
   * This function gets passed into the underlying react-select component. It wraps around the `onChange` prop because
   * we need to handle situations where we display an abbreviated list of items (since the + X More button is represented
   * as a selected value, as far as the underlying component knows).
   *
   * It also takes into account the `passOnlyValueToChangeHandler` prop, which allows us to use different kinds of
   * existing event handlers without having to modify them.
   *
   * @param newlySelectedRaw Array of objects. The currently selected set as the react-select components knows it/
   */
  onChange(immAbbreviatedList, newlySelectedRaw) {
    let trueSelection;  // This will contains the actual selected items, rather than the display-only ones.
    // Only in a multi-select is the abbreviated state possible, so the virtual selection logic is restricted to here.
    if (this.props.multi) {
      // This is the previous true selection set.
      const currentlySelected = _.pluck(this.props.value.toJS(), this.props.valueKey);
      // This is the previous display set.
      const abbreviatedList = _.pluck(immAbbreviatedList.toJS(), this.props.valueKey);
      // This is the new display set, after the user interaction (deletion or addition), with the abbreviation expansion
      // button removed.
      const newlySelected = _.chain(newlySelectedRaw).pluck(this.props.valueKey).reject(value => value === ExposureAppConstants.COMBOBOX_ABBREVIATION_VALUE).value();
      // Test if the total number of selected items is above the threshold.
      const aboveLimit = this.props.abbreviationThreshold && this.props.value.size > this.props.abbreviationThreshold;
      if (!this.state.expanded && aboveLimit && newlySelectedRaw.length) {
        // We're in the abbreviated state.
        // Figure out which things the user just added (might be an empty set).
        const newlyAdded = _.difference(newlySelected, abbreviatedList.length ? abbreviatedList : currentlySelected);
        // Figure out which things the user just removed (might be an empty set).
        const removed = _.difference(abbreviatedList, newlySelected);
        // Remove and add elements from the true selection as necessary.
        trueSelection = _.chain(currentlySelected).difference(removed).value().concat(newlyAdded);
      } else {
        // We're not in an abbreviated state, so we can just use update display set directly.
        trueSelection = newlySelected;
      }
      if (!this.props.passOnlyValueToChangeHandler) {
        // Extract the value fields from the option objects so we just return a list of the selected values.
        trueSelection = this.props.options.filter(immItem => _.contains(trueSelection, immItem.get(this.props.valueKey))).toJS();
      }
    } else {
      // This is the single-select, so we only need to decide whether we're returning only the value, or the whole
      // option object.
      trueSelection = this.props.passOnlyValueToChangeHandler && newlySelectedRaw ? newlySelectedRaw[this.props.valueKey] : newlySelectedRaw;
    }

    // Now call the external handler.
    this.props.onChange(trueSelection);
  }

  /**
   * Executed when any selected item is clicked, only performs an action when clicked on the abbreviation expander,
   * where it causes it to be replaced with the full list of selected items.
   *
   * This is only attached to the Select component when we're exceeded the abbreviation threshold.
   *
   * @param option The option clicked.
   */
  onValueClick(option) {
    const value = option[this.props.valueKey];
    if (value === ExposureAppConstants.COMBOBOX_ABBREVIATION_VALUE) {
      this.setState({ expanded: true });
    }
  }

  restoreAbbreviatedState() {
    this.setState({ expanded: false });
  }

  /**
   * Returns the element that will display how many hidden items have been selected, and when clicked will expand that
   * list.
   * @returns {{value: string, label: string, disabled: boolean, clearableValue: boolean}}
   */
  getAbbreviationItem() {
    return {
      value: ExposureAppConstants.COMBOBOX_ABBREVIATION_VALUE,
      label: `+ ${this.props.value.size - this.props.abbreviationThreshold} More`,
      disabled: true,
      clearableValue: false
    };
  }

  render() {
    // Make a copy of the props we can modify. This is a shallow copy, but we don't mind that since the props we'll want
    // to modify later (options and value) are Immutables.
    const props = _.clone(this.props);
    props.closeOnSelect = this.state.closeOnSelect;
    let immAbbreviatedList = Imm.List();
    // Logic for handling multiple selection.
    if (props.multi) {
      immAbbreviatedList = this.generateAbbreviatedList();
      const aboveLimit = props.abbreviationThreshold && props.value.size > props.abbreviationThreshold;
      if (!this.state.expanded && aboveLimit) {
        props.value = immAbbreviatedList.push(this.getAbbreviationItem());
        props.onValueClick = this.onValueClick;
      }

      if (this.state.expanded) {
        // If we're in the expanded state, when we click outside of the control, restore the abbreviated state.
        props.onBlur = this.restoreAbbreviatedState;
      }

      const values = _.pluck(this.props.value.toJS(), this.props.valueKey);
      // If we have options that we've selected, but aren't currently being displayed, make sure not to pass them into the
      // underlying component, because while it has the logic to not display options it knows are selected, it doesn't
      // know about these hidden items.
      props.options = props.options.filterNot(option => {
        let value;
        // props.options is an Immutable collection, but may not be a collection of immutable options.
        if (Imm.Iterable.isIterable(option)) {  // option is Immutable.
          value = option.get(this.props.valueKey);
        } else {  // option is an object.
          value = option.value;
        }
        return _.contains(values, value);
      }).toJS();
    } else {
      props.options = props.options.toJS();
    }

    // Group options if requested.
    if (props.groupBy) {
      props.options = _.chain(props.options)  // props.options is an array of objects at this point due to above .toJS().
        .groupBy(props.groupBy)  // This groups the options into an object keyed based on the groupBy field.
        .pairs()  // This converts the object into an array of pairs, since our ultimate output is expected to be an array.
        .map(([groupName, opts]) => {
          // Group headings are implemented using react-select's ability to have disabled items that you can't select.
          const groupItem = { disabled: true, group: true };
          groupItem[props.valueKey] = `${groupName}`;
          // In some cases, the groupBy field isn't display-friendly, so we allow providing an object that maps the values
          // to more presentable options.
          groupItem[props.labelKey] = props.groupNameOverrides && _.has(props.groupNameOverrides, groupName) ? props.groupNameOverrides[groupName] : groupName;
          return [groupItem, opts];
        })
        // Since we'll now have a list of lists, we want to convert it to a single list of options, with the group headings interspersed as special options.
        .flatten()
        .value();
    }

    props.value = Imm.Iterable.isIterable(props.value) ? props.value.toJS() : props.value;
    props.onChange = this.onChange.bind(this, immAbbreviatedList);
    props.disabled = this.props.disabled;

    //Added the optionRenderer prop when showTooltip is true to display tooltips for dropdown values
    //Added a new key 'tooltipText' to display on hover of dropdown values
    if (props.showTooltip) {
      props.optionRenderer = (option) => {
        return <div title={option.tooltipText}>{option.text}</div>
      }
    }
    
    return <Select {...props} />;
  }
}

Combobox.propTypes = {
  // Immutable so we don't have to deep-copy the props. Not using the `immOptions` naming convention to make the API as
  // outwardly identical to that of react-select's as possible.
  options: PropTypes.oneOfType([
    PropTypes.instanceOf(Imm.OrderedSet),
    PropTypes.instanceOf(Imm.List)
  ]).isRequired,
  value: PropTypes.oneOfType([
    PropTypes.instanceOf(Imm.OrderedSet),
    PropTypes.instanceOf(Imm.List),
    PropTypes.string,
    PropTypes.number,
    PropTypes.object
  ]),  // This way we don't have to deep-copy the props.
  // If this is missing, there's no threshold, as many items as the user selects will be displayed.
  abbreviationThreshold: PropTypes.number,
  groupBy: PropTypes.string,  // The key by which to group options.
  groupNameOverrides: PropTypes.object,  // Maps group names to replacement group names.
  passOnlyValueToChangeHandler: PropTypes.bool,  // Ensures we're returning the whole option object rather than just the value.
  disabled: PropTypes.bool, // Whether the combobox is enabled
  multi: PropTypes.bool,  // Whether the combobox supports multiple select
  placeholder: PropTypes.oneOfType([PropTypes.string, PropTypes.node]), // Default field placeholder
  backspaceRemoves: PropTypes.bool,
};

Combobox.defaultProps = {
  valueKey: 'value',
  labelKey: 'label',
  // A sane default to prevent degenerate cases, e.g. someone in a modal dialog selecting every single item available.
  // Our modals are a bit too primitive to handle that well, so having a reasonable hard limit to the growth is a good idea.
  abbreviationThreshold: 50,
  clearable: false,
  passOnlyValueToChangeHandler: true,
  disabled: false,
  multi: false
};

module.exports = Combobox;
