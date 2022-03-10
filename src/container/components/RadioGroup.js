var React = require('react');
var _ = require('underscore');
var RadioItem = React.createFactory(require('./RadioItem.js'));
import DOM from 'react-dom-factories';

var div = DOM.div;

class RadioGroup extends React.Component {
  static displayName = 'RadioGroup';

  render() {

    var radioItems = _.map(this.props.radios, function(r) {
      return RadioItem(
        {
          key: this.props.name + '-' + r.value,
          name: this.props.name,
          handleChange: this.props.handleChange,
          value: r.value,
          checked: r.value === this.props.value
        },
        r.caption);
    }, this);

    var radioTitle = null;

    if (this.props.title) {
      radioTitle = div({className: 'radio-group-wrapper-cell radio-title'}, this.props.title);
    }

    var className = 'radio-group-wrapper';
    if (this.props.className) {
      className = this.props.className + ' ' + className;
    }

    return div(
      {className: className},
      radioTitle,
      div({className: 'radio-group-wrapper-cell'}, radioItems)
    );

  }
}

module.exports = RadioGroup;
