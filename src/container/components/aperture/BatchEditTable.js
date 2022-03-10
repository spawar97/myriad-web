var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var TableItem = React.createFactory(require('./TableItem'));
var Util = require('../../util/util');

var div = DOM.div,
    span = DOM.span;

class BatchEditTable extends React.Component {
  static displayName = 'BatchEditTable';

  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    doResize: PropTypes.bool.isRequired,
    width: PropTypes.number
  };

  shouldComponentUpdate(nextProps) {
    return this.props.width !== nextProps.width || this.props.doResize !== nextProps.doResize ||
      !Imm.is(this.props.immAdminStore.get('workingCs'), nextProps.immAdminStore.get('workingCs')) ||
      this.props.immAdminStore.get('batchEditEnabled') !== nextProps.immAdminStore.get('batchEditEnabled') ||
      this.props.immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']) !== nextProps.immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']);
  }

  generateTables = () => {
    var immSelectedNodeKeyPath = this.props.immAdminStore.getIn(['workingCs', 'selectedNodeKeyPath']);
    var immSelectedNode = this.props.immAdminStore.getIn(immSelectedNodeKeyPath);

    if (immSelectedNode.has('tables')) {
      // A datasource is selected, show its tables depending on the current
      // search and filter settings.
      return immSelectedNode.get('tables')
        .filter(Util.isNodeInScope)
        .sortBy(function(immTable) { return immTable.get('shortName'); })
        .map(function(immTable) {
          return TableItem({
            key: (immTable.get('shortName') || immTable.get('longName')) + immTable.get('depth'),
            doResize: this.props.doResize,
            immAdminStore: this.props.immAdminStore,
            immTable: immTable,
            shortTables: true,
            width: this.props.width
          });
        }, this)
        .filter(function(immTableItem) { return !_.isUndefined(immTableItem); })
        .toList();
    } else {
      // A single table is selected.
      return Imm.List([TableItem({
        key: (immSelectedNode.get('shortName') || immSelectedNode.get('longName')) + immSelectedNode.get('depth'),
        doResize: this.props.doResize,
        immAdminStore: this.props.immAdminStore,
        immTable: immSelectedNode,
        shortTables: false,
        width: this.props.width
      })]);
    }
  };

  render() {
    var immTableItems = this.generateTables();
    var content = immTableItems.isEmpty() ? span(null, 'No tables selected') : immTableItems;
    return div({className: 'schema-batch-edit-table'}, div(null, content));
  }
}

module.exports = BatchEditTable;
