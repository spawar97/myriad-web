var React = require('react');
var createReactClass = require('create-react-class');
var buildClassName = require('../mixins/buildClassName');
import PropTypes from 'prop-types';

module.exports = createReactClass({

  contextTypes: {
    id: PropTypes.string,
    active: PropTypes.bool
  },

  mixins: [buildClassName],

  toggleActive: function() {
    this.props.onToggleActive(!this.context.active);
  },

  handleClick: function() {
    this.toggleActive();
  },

  render: function() {
    var triggerClassName =
      this.buildClassName(
        'Menu__MenuTrigger ' +
        (this.context.active
        ? 'Menu__MenuTrigger__active'
        : 'Menu__MenuTrigger__inactive')
      );

    return (
      <div
        className={triggerClassName}
        onClick={this.handleClick}
        role="button"
        aria-owns={this.context.id}
        aria-haspopup="true"
      >
        {this.props.children}
      </div>
    )
  }

});
