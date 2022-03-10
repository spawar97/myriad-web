var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';

var div = React.createFactory(require('./TouchComponents').TouchDiv),
    span = React.createFactory(require('./TouchComponents').TouchSpan);

class SimpleDropdown extends React.Component {
   constructor(props) {
      super(props);
      this.dropdownRowsRef = React.createRef();
      this.state = {isOpen: false, headerItems: []};
   }

  static displayName = 'SimpleDropdown';

  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
      content: PropTypes.any,
      // Content can be either empty or a react component.
      // If content is a react component, we append to the dropdown directly.
      // If content is empty, we use icon and name to construct a dropdown element instead.
      disabled: PropTypes.bool,
      icon: PropTypes.string,
      name: PropTypes.any
    })).isRequired,
    disableChevron: PropTypes.bool,
    disableItemClick: PropTypes.bool,
    headerIconEnable: PropTypes.bool,
    hoverDisabled: PropTypes.bool,
    icon: PropTypes.string,
    isDisabled: PropTypes.bool,
    isInvalid: PropTypes.bool,
    itemListHeader: PropTypes.any,
    badgeCount: PropTypes.number,
    multiSelectEnabled: PropTypes.bool,
    onChange: PropTypes.func,
    opener: PropTypes.any,
    rightAlign: PropTypes.bool,
    selectCheckDisabled: PropTypes.bool,
    selectedIndex: PropTypes.number,
    selectedItemPrefix: PropTypes.string,
    selectedOverride: PropTypes.any,
    toggleHandler: PropTypes.func,
    useListStyle: PropTypes.bool
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  handleDropdownClick = () => {
    if (this.props.toggleHandler) {
      this.props.toggleHandler(!this.state.isOpen);
    }
    this.setState({isOpen: !this.state.isOpen});
  };

  closeDropdown = () => {
    this.setState({isOpen: false});
  };

  openDropdown = () => {
    this.setState({isOpen: true});
  };

  handleItemClick = (itemIndex) => {
    var callback;
    var isOpen = this.props.multiSelectEnabled;
    var newHeaderItems = this.state.headerItems;
    if (_.isNumber(itemIndex)) {
      if (this.props.items[itemIndex].disabled) {
        return;
      }
      if (this.props.onChange) {
        callback = this.props.onChange.bind(null, itemIndex);
      }
      if (this.props.headerIconEnable) {
        var selected = this.props.items[itemIndex];
        if (selected && selected.icon) {
          var shouldRemove = _.contains(newHeaderItems, selected.icon);
          if (shouldRemove) {
            newHeaderItems = _.without(newHeaderItems, selected.icon);
          } else {
            newHeaderItems = _.compact(_.map(this.props.items, function(item) {
              if (item.icon && item.isHeaderItem && (_.contains(newHeaderItems, item.icon) || item.icon === selected.icon)) {
                return item.icon;
              }
              return '';
            }));
          }
        }
      }
    } else {
      isOpen = false;
    }
    this.setState({isOpen: isOpen, headerItems: newHeaderItems}, callback);
  };

  render() {
    var iconClasses = {icon: !!this.props.icon};
    if (this.props.icon) {
      iconClasses[this.props.icon] = true;
    }
    var dropdownElements;
    if (this.state.isOpen && !_.isEmpty(this.props.items)) {
      var dropdownRows = _.map(this.props.items, function(item, idx) {
        return item.content ? item.content :
          div({key: 'item-' + idx, className: cx({icon: !!item.icon, disabled: item.disabled}),
               onClick: this.props.disableItemClick ? null : this.handleItemClick.bind(null, idx),
               ref: ()=>{ return this.dropdownRowsRef = item.name }},
              item.icon ? div({className: item.icon}) : null, div({className: 'item-name'}, item.name),
              this.props.selectCheckDisabled ? null : div({className: cx({'icon-checkmark-full': idx === this.props.selectedIndex})})
        );
      }, this);
      var dropdownStyle = this.props.dropdownHeight ? {maxHeight: this.props.dropdownHeight} : null;
      dropdownElements = [
        div({className: 'underlay', key: 'underlay', onClick: this.handleDropdownClick}),
        div({key: 'list', className: 'simple-dropdown-contents', style: dropdownStyle},
          this.props.itemListHeader ? div(null, div({className: 'item-list-header'}, div(null, this.props.itemListHeader))) : null,
          div({className: 'simple-dropdown-items'}, dropdownRows))];
    }
    var selectedItemPrefix;
    if (this.props.selectedItemPrefix) { selectedItemPrefix = span({className: 'selected-item-prefix'}, this.props.selectedItemPrefix); }
    var headerElements = _.map(this.state.headerItems, function(item, index) { return div({key: index, className: item}); });
    var selectedItem = this.props.selectedOverride || ((!_.isUndefined(this.props.selectedIndex) && this.props.selectedIndex >= 0 && this.props.selectedIndex < _.size(this.props.items)) ? this.props.items[this.props.selectedIndex].name : '');
    return div({className: cx({'simple-dropdown': true,
                               'input-error': this.props.isInvalid,
                               open: this.state.isOpen && !this.props.isDisabled,
                               disabled: this.props.isDisabled,
                               'no-scrollbar': this.props.scrollbarDisabled,
                               'no-hover': this.props.hoverDisabled,
                               'align-right': this.props.rightAlign,
                               'list-style': this.props.useListStyle,
                               'header-icon': !_.isEmpty(headerElements)})},
               div({className: cx('simple-dropdown-top', {'simple-dropdown-top-clickable': !this.props.isDisabled}), onClick: this.props.isDisabled ? null : this.handleDropdownClick},
                   div(null,
                        div(null, div({className: cx(iconClasses)})),
                       this.props.badgeCount > 0 ? div({className: 'badge'}, this.props.badgeCount) : null,
                       div({className: 'simple-dropdown-title'}, selectedItemPrefix, selectedItem),
                       _.isEmpty(headerElements) ? null : headerElements,
                       div(null, div({className: cx({'dropdown-opener': !this.props.opener && !this.props.disableChevron, 'opener': !!this.props.opener, disabled: this.props.isDisabled})}, this.props.opener)))),
               dropdownElements);
  }
}

module.exports = SimpleDropdown;
