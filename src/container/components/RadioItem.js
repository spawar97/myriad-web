var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

class RadioItem extends React.Component {
  static displayName = 'RadioItem';

  static propTypes = {
    checked: PropTypes.bool,
    handleChange: PropTypes.func,
    key: PropTypes.string,
    name: PropTypes.string,
    value: PropTypes.any,
    id: PropTypes.string
  };

  render() {
    var div = DOM.div,
        span = DOM.span,
        label = DOM.label,
        input = DOM.input;

    const inputProps = {
      type: 'radio',
      name: this.props.name,
      onChange: this.props.handleChange,
      value: this.props.value,
      checked: this.props.checked,
      id: this.props.id,
    };

    return div(

      {className: 'radio-item'},

      label({className: 'radio-label'},
        input(inputProps),
        div(null, div(null)), // radio button icon

        span(null, this.props.children)
      )
    );
  }
}

module.exports = RadioItem;
