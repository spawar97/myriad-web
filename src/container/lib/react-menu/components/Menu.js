var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
import PropTypes from 'prop-types';

var MenuTrigger = require('./MenuTrigger');
var MenuOptions = require('./MenuOptions');
var MenuOption = require('./MenuOption');
var uuid = require('../helpers/uuid');
var buildClassName = require('../mixins/buildClassName');

var Menu = module.exports = createReactClass({

  displayName: 'Menu',

  mixins: [buildClassName],

  childContextTypes: {
    id: PropTypes.string,
    active: PropTypes.bool
  },

  getChildContext: function () {
    return {
      id: this.state.id,
      active: this.state.active
    };
  },

  getInitialState: function(){
    return {
      id: uuid(),
      active: false,
      selectedIndex: 0,
      // ####################### OUR CODE #########################
      // Because react-menu uses `visibility: hidden` the default positioning of 'right' and 'bottom' matters,
      // and makes the menu element take up space in the DOM to the right and bottom of the container before it
      // is opened. This causes overflows in the mobile filter pane. The initial positioning is corrected after
      // the dropdown is opened and `updatePositioning` is called, but we need to set it correctly before that happens.
      // The solution is to make the initial positioning configurable through two optional props.
      horizontalPlacement: this.props.horizontalPlacement || 'right', // only 'right' || 'left'
      verticalPlacement: this.props.verticalPlacement || 'bottom' // only 'top' || 'bottom'
      // ####################### OUR CODE #########################
    };
  },

  closeMenu: function() {
    this.setState({active: false}, this.focusTrigger);
  },

  focusTrigger: function() {
    ReactDOM.findDOMNode(this.refs.trigger).focus();
  },

  handleBlur: function() {
    // give next element a tick to take focus
    setTimeout(function() {
      if (!ReactDOM.findDOMNode(this).contains(document.activeElement) && this.state.active){
        this.closeMenu();
      }
    }.bind(this), 1);
  },

  handleTriggerToggle: function() {
    this.setState({active: !this.state.active}, this.afterTriggerToggle);
  },

  afterTriggerToggle: function() {
    if (this.state.active) {
      this.refs.options.focusOption(0);
      this.updatePositioning();
    }
  },

  updatePositioning: function() {
    var triggerRect = ReactDOM.findDOMNode(this.refs.trigger).getBoundingClientRect();
    var optionsRect = ReactDOM.findDOMNode(this.refs.options).getBoundingClientRect();
    var positionState = {};
    // horizontal = left if it wont fit on left side
    if (triggerRect.left + optionsRect.width > window.innerWidth) {
      positionState.horizontalPlacement = 'left';
    } else {
      positionState.horizontalPlacement = 'right';
    }
    if (triggerRect.top + optionsRect.height > window.innerHeight) {
      positionState.verticalPlacement = 'top';
    } else {
      positionState.verticalPlacement = 'bottom';
    }
    this.setState(positionState);
  },

  handleKeys: function(e) {
    if (e.key === 'Escape') {
      this.closeMenu();
    }
  },

  verifyTwoChildren: function() {
    var ok = (React.Children.count(this.props.children) === 2);
    if (!ok)
      throw 'react-menu can only take two children, a MenuTrigger, and a MenuOptions';
    return ok;
  },

  renderTrigger: function() {
    var trigger;
    if(this.verifyTwoChildren()) {
      React.Children.forEach(this.props.children, function(child){
        if (child.type === MenuTrigger) {
          trigger = React.cloneElement(child, {
            ref: 'trigger',
            onToggleActive: this.handleTriggerToggle
          });
        }
      }.bind(this));
    }
    return trigger;
  },

  renderMenuOptions: function() {
    var options;
    if(this.verifyTwoChildren()) {
      React.Children.forEach(this.props.children, function(child){
        if (child.type === MenuOptions) {
          options = React.cloneElement(child, {
            ref: 'options',
            horizontalPlacement: this.state.horizontalPlacement,
            verticalPlacement: this.state.verticalPlacement,
            onSelectionMade: this.closeMenu
          });
        }
      }.bind(this));
    }
    return options;
  },


  render: function() {
    return (
      <div
        className={this.buildClassName('Menu')}
        onKeyDown={this.handleKeys}
        onBlur={this.handleBlur}
      >
        {this.renderTrigger()}
        {this.renderMenuOptions()}
      </div>
    )
  }

});
