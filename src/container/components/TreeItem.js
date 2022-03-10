var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('./Checkbox'));
var ItemOpener = React.createFactory(require('./ItemOpener'));
var AdminActions = require('../actions/AdminActions');

var div = DOM.div,
    span = DOM.span;

// Each TreeItem represents one branch or leaf of the tree in the UI.
class TreeItem extends React.Component {
  static displayName = 'TreeItem';

  static propTypes = {
    depth: PropTypes.number.isRequired,
    handleTreeItemExpandOrCollapse: PropTypes.func.isRequired,
    immNode: PropTypes.instanceOf(Imm.Map).isRequired,
    immNodePath: PropTypes.instanceOf(Imm.List).isRequired,
    maxDepth: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    disableCheckbox: PropTypes.bool,
    handleTreeItemCheckboxClick: PropTypes.func,
    handleTreeItemDoubleClick: PropTypes.func,
    handleTreeItemSelection: PropTypes.func,
    noCheckboxes: PropTypes.bool,
    noTooltips: PropTypes.bool
  };

  render() {
    var selectionHandler = this.props.immNode.get('selected') || _.isUndefined(this.props.handleTreeItemSelection) ? null : this.props.handleTreeItemSelection.bind(null, this.props.immNodePath),
        doubleClickHandler = _.isUndefined(this.props.handleTreeItemDoubleClick) ? null : this.props.handleTreeItemDoubleClick.bind(null, this.props.immNodePath);

    var opener = _.isUndefined(this.props.immNode.get('childrenName')) || this.props.depth === this.props.maxDepth ? null :
       ItemOpener({isOpen: this.props.immNode.get('expanded'),
                   onClick: this.props.handleTreeItemExpandOrCollapse.bind(null, this.props.immNodePath)});
    var checkbox = this.props.noCheckboxes ? null : this.props.disableCheckbox ? div({style: {width: 20}}) :
      Checkbox({dimmed: !this.props.immNode.get('checkboxState'),
                onClick: this.props.handleTreeItemCheckboxClick.bind(null, this.props.immNodePath),
                checkedState: this.props.immNode.get('checkboxState', false)});

    var displayText;
    if (this.props.depth === 0) {
      displayText = this.props.immNode.get('longName') || this.props.immNode.get('shortName');
    } else {
      displayText = this.props.immNode.get('longName') ?
        [span({key: 'ln', className: 'tree-long-name'}, this.props.immNode.get('longName')), span({key: 'sn', className: 'tree-short-name'}, this.props.immNode.get('shortName'))] :
        this.props.immNode.get('shortName');
    }

    var textMargin = 10 * this.props.depth;
    var iconWidth = this.props.immNode.get('isInvisible') ? 15 : 0;
    var maxWidth = this.props.width - (this.props.noCheckboxes ? 0 : 20) - 20 - textMargin;  // Checkbox width is 20px, item-open width is also 20px.
    var textbox =
        div({className: 'tree-name',
             style: {maxWidth: maxWidth - iconWidth},
             title: this.props.noTooltips ? '' : this.props.immNode.get('longName') + ' (' + this.props.immNode.get('shortName') + ')'},
            displayText);

    var icon = this.props.immNode.get('isInvisible') ? div({className: 'icon-eye-blocked'}) : null;
    var textRow = div({className: cx('selector', {dimmed: !this.props.immNode.get('checkboxState') && this.props.immNode.get('depth') > 0,
                                      selected: this.props.immNode.get('selected')}),
                       style: {marginLeft: textMargin, width: maxWidth + 10},  // + 10 to add extra padding to the highlight
                       // We wire up the `onMouseDown` handler instead of the `onClick` handler because
                       // Quirksmode recommends against registering click and dblclick events on the same element:
                       // http://www.quirksmode.org/dom/events/click.html
                       onMouseDown: selectionHandler,
                       onDoubleClick: doubleClickHandler},
                      div(null, div(null, div(null, textbox), div(null, icon))));
    // React v15 removes the auto-generated data-reactid fields from all DOM elements, and our cukes were using that
    // as a hack to quickly identify rows. Create our own `data-nodepath` attribute to store the needed info
    let nodepath = this.props.immNodePath.join('.');
    return div({className: 'tree-entry depth-' + this.props.depth, "data-nodepath": nodepath},
        div(null, opener),
        div(null, checkbox),
        div(null, textRow)
    );
  }
}

module.exports = TreeItem;
