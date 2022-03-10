var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;

class SimpleTable extends React.Component {
  static displayName = 'SimpleTable';

  static propTypes = {
    content: PropTypes.any,
    title: PropTypes.any
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    var classes = {'simple-table': true};
    if (this.props.classes) { classes[this.props.classes] = true; }
    var headerCells = [div({key: 'title'}, this.props.title)].concat(this.props.headerActions || []);
    return div({className: cx(classes)},
      div(null, div(null, div(null, div(null, headerCells)))),
      div(null, div(null, div(null, this.props.content)))
    );
  }
}

module.exports = SimpleTable;
