var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ExternalTemplate = React.createFactory(require('./ExternalTemplate'));

var div = DOM.div;

class ExternalStatus extends React.Component {
  static displayName = 'ExternalStatus';

  static propTypes = {
    icon: PropTypes.string.isRequired,
    message: PropTypes.any.isRequired,
    content: PropTypes.any
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return ExternalTemplate({
      headerClass: 'short-inner-box',
      content: div({className: 'inner-content short-content center'},
        div({className: this.props.icon}),
        div({className: 'status'}, this.props.message),
        this.props.content
      )
    });
  }
}

module.exports = ExternalStatus;
