var React = require('react');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;
var span = DOM.span;

class ListItem extends React.Component {
  static displayName = 'ListItem';

  static propTypes = {
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    classnameSet: PropTypes.object,
    icon: PropTypes.string,
    key: PropTypes.string,
    onIconClick: PropTypes.func,
    width: PropTypes.number
  };

  render() {
    return div({className: cx({'text-truncation': !!this.props.width}, 'tag', 'list-item', this.props.classnameSet), style: {width: this.props.width}, key: this.props.key},
               span({className: 'list-item-content'}, this.props.content),
               this.props.icon ? span({className: this.props.icon, onClick: this.props.onIconClick}) : null);
  }
}

module.exports = ListItem;
