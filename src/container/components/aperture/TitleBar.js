var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));

var div = DOM.div;

class TitleBar extends React.Component {
  static displayName = 'TitleBar';

  static propTypes = {
    noNewOption: PropTypes.bool,
    onClick: PropTypes.func,
    tabName: PropTypes.string
  };

  render() {
    var buttonText = this.props.buttonText || 'New ' + this.props.tabName;
    return div({className: 'admin-tab-title-bar'},
      div({className: 'tab-title'}, 'Saama LSAC ' + this.props.tabName),
      this.props.noNewOption ? null : Button({icon: 'icon-plus-circle2', children: buttonText, onClick: this.props.onClick, isPrimary: true})
    );
  }
}

module.exports = TitleBar;
