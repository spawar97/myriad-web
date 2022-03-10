import React from 'react';
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

class AdminRadioItem extends React.Component {
  static displayName = 'AdminRadioItem';

  static propTypes = {
    selected: PropTypes.bool.isRequired,
    handleClick: PropTypes.func.isRequired,
    displayText: PropTypes.string
  };

  render() {
    var div = DOM.div,
        span = DOM.span;

    var radioButtonIcon = this.props.selected ? 'icon icon-circle' : 'icon icon-radio-unchecked';

    return div({className: 'admin-radio-item', onClick: this.props.handleClick},
      div({className: radioButtonIcon}, span(null, this.props.displayText))
    );
  }
}

module.exports = AdminRadioItem;
