var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var $ = require('jquery');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('../Checkbox'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var AdminActions = require('../../actions/AdminActions');
var ComprehendSchemaUtil = require('../../util/ComprehendSchemaUtil');

var div = DOM.div;

var RelatedItem = React.createFactory(createReactClass({
  displayName: 'RelatedItem',
  propTypes: {
    width: PropTypes.number.isRequired,
    items: PropTypes.array,
    left: PropTypes.bool,
    type: PropTypes.string,
    class: PropTypes.string
  },
  // Padding is ellipsis width, and right padding.
  padding: 20 + 30,

  componentDidMount: function() {
    this.handleResize();
  },

  componentDidUpdate: function() {
    this.handleResize();
  },

  // In order for 'text-truncation' to work, we have to set the width of the right item.
  // Note: we currently ignore the case where the left item is too long to be display.
  handleResize: function() {
    var right = ReactDOM.findDOMNode(this.refs['right']);
    // 500px is side bar width + tree view nav + padding.
    var width = this.props.width - 500 - this.padding;
    $(right).width(width);
  },

  render: function() {
    var item = _.first(this.props.items);
    var left = this.props.left;
    var dropdown = _.size(this.props.items) > 1 ? SimpleDropdown({
      selectCheckDisabled: true,
      hoverDisabled: true,
      rightAlign: true,
      //  Dropdown max height is 300px. A single row height is 31px. Thus, maximum number of items we can have is floor(300/31) = 9.
      scrollbarDisabled: (_.size(this.props.items) - 1) <= 9,
      opener : 'Show ' + (_.size(this.props.items) - 1) + ' more...',
      itemListHeader: this.props.type + ' (' + (_.size(this.props.items) - 1) + ')',
      items: _.map(_.rest(this.props.items), function(item, index) {
        return {key: index, name: div({className: 'edge-item'}, div(null, left ? item.left : item.right))};
      })
    }) : null;
    var itemElement = !item ? null : div({className: 'related-list'},
                                         div({className: 'edge-item'},
                                             div({className: this.props.class}, item.left),
                                             div({className: 'icon-arrow-right-circle-full'}),
                                             div({ref: 'right', className: 'text-truncation'}, item.right)),
                                         div(null, div(null, div(null, dropdown))));
    return div(null, div(null, this.props.type), div(null, itemElement));
  }
}));

var OverallItem = React.createFactory(class extends React.Component {
  static displayName = 'OverallItem';

  static propTypes = {
    immItems: PropTypes.instanceOf(Imm.List),
    type: PropTypes.string
  };

  formatItem = (item) => {
    return (_.isEmpty(item.tableLongName) ? '' : item.tableLongName + ' ') +
      (_.isEmpty(item.colLongName) ? '' : item.colLongName + ' ') +
      '(' + item.tableShortName + (_.isEmpty(item.colShortName) ? '' : ('.' + item.colShortName)) + ')'
  };

  render() {
    var dropdown = SimpleDropdown({
      selectCheckDisabled: true,
      hoverDisabled: true,
      rightAlign: true,
      opener: div({className: 'icon-info'}),
      //  Dropdown max height is 300px. A single row height is 31px. Thus, maximum number of items we can have is floor(300/31) = 9.
      scrollbarDisabled: (this.props.immItems.size - 1) <= 9,
      itemListHeader: this.props.immItems.isEmpty() ? null : this.props.type + ' (' + this.props.immItems.size + ')',
      items: _.map(this.props.immItems.toJS(), function(item)
                   { return {name: div({className: cx({'edge-item': !!item.colShortName})}, this.formatItem(item) )}; }, this)});
    return div({className: 'overall-item'}, div({className: 'overall-name'}, this.props.type),
               div(null, div(null, div(null, div({className: 'overall-count'}, this.props.immItems.size), div(null, dropdown)))));
  }
});

var SchemaSummary = createReactClass({
  displayName: 'SchemaSummary',
  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired,
    resizeHandler: PropTypes.func
  },

  // Body padding is the sum of border, admin edit schema main left padding, admin tab right padding.
  bodyPadding: 1 + 10 + 30,
  // Item opener padding is the sum of padding, ellipsis width, and item opener width.
  itemOpenerPadding: 30 + 20 + 20,

  componentDidMount: function() {
    this.handleResize();
  },

  componentDidUpdate: function() {
    this.handleResize();
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return this.props.width !== nextProps.width || !_.isEqual(this.state, nextState) ||
      !Imm.is(this.props.immAdminStore.get('workingCs'), nextProps.immAdminStore.get('workingCs')) ||
      !Imm.is(this.props.immAdminStore.get('tableRowCounts'), nextProps.immAdminStore.get('tableRowCounts'));
  },

  componentWillReceiveProps: function(nextProps) {
    var newCurrentTableSummary = this.getCurrentTableSummary(nextProps.immAdminStore);
    if ((_.isNull(newCurrentTableSummary) !== _.isNull(this.state.currentTableSummary)) ||
        (!_.isNull(newCurrentTableSummary) && !_.isNull(this.state.currentTableSummary) && newCurrentTableSummary.hidden !== this.state.currentTableSummary.hidden)) {
      this.props.resizeHandler();
    }
    this.setState({currentTableSummary: newCurrentTableSummary});
  },

  /**
   * Returns a list of tables with DRT enabled.
   */
  getActiveReviewTools: function() {
    return this.props.immAdminStore.getIn(['workingCs', 'datasources']).reduce(function(immMemo, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return immMemo;
      }
      var immTableInfo = immDatasource.get('tables').filter(function(immTable) {
        return immTable.get('isDRTEnabled');
      }).map(function(immTable) {
        return Imm.Map({tableLongName: immTable.get('longName', immTable.get('shortName')), tableShortName: immTable.get('shortName')});
      });
      return immMemo.concat(immTableInfo);
    }, Imm.List()).sortBy(function(immDescriptor) { return immDescriptor.get('tableShortName'); });
  },

  getCurrentTableSummary: function(immAdminStore) {
    var immSelectedNodeKeyPath = immAdminStore.getIn(['workingCs', 'selectedNodeKeyPath'], null);
    // immSelectedNodeKeyPath should point to a table: ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>].
    if (_.isNull(immSelectedNodeKeyPath) || immSelectedNodeKeyPath.size !== 5) {
      return null;
    }

    var datasourceShortName = immSelectedNodeKeyPath.get(2);
    var immTable = immAdminStore.getIn(immSelectedNodeKeyPath);
    var immColumns = immTable.get('columns');
    var immUniqueColumns = immColumns.filter(function(immCol) {
      return immCol.get('isUnique');
    });
    var immVisibleColumns = immColumns.filter(function(immCol) {
      return !immCol.get('isInvisible');
    });

    var pathTranslator = _.partial(ComprehendSchemaUtil.pathToEdgeDescriptor, _, immAdminStore.getIn(['workingCs', 'datasources']));
    var parents = immColumns.reduce(function(memo, immColumn) {
      var columnParents = immColumn.get('parents', Imm.Set()).map(pathTranslator).toJS();
      columnParents = _.map(columnParents, function(parentDescriptor) {
        return _.extend({
          childColShortName: immColumn.get('shortName'),
          childColLongName: immColumn.get('longName')
        }, parentDescriptor);
      });
      return memo.concat(columnParents);
    }, []);
    var children = immColumns.reduce(function(memo, immColumn) {
      var columnChildren = immColumn.get('children', Imm.Set()).map(pathTranslator).toJS();
      columnChildren = _.map(columnChildren, function(childDescriptor) {
        return _.extend({
          parentColShortName: immColumn.get('shortName'),
          parentColLongName: immColumn.get('longName')
        }, childDescriptor);
      });
      return memo.concat(columnChildren);
    }, []);

    var immTableRowCounts = immAdminStore.get('tableRowCounts');
    var totalRows;
    if (immTableRowCounts.hasIn([datasourceShortName, immTable.get('shortName')])) {
      totalRows = immTableRowCounts.getIn([datasourceShortName, immTable.get('shortName')]);
    } else {
      totalRows = '-';
      AdminActions.updateSelectedTableRowCount();
    }

    return {
      longName: immTable.get('longName'),
      shortName: immTable.get('shortName'),
      hidden: !immTable.get('checkboxState'),
      status: 'Uniqueness ' + immTable.get('uniquenessStatus'),
      uniqueColumns: immUniqueColumns.toJS(),
      visibleColumns: immVisibleColumns.size,
      parents: parents,
      children: children,
      reviewToolState: immTable.get('isDRTEnabled'),
      totalRows: totalRows
    };
  },

  /**
   * Returns a list of tables included in the working schema.
   */
  getIncludedTables: function() {
    return this.props.immAdminStore.getIn(['workingCs', 'datasources']).reduce(function(immMemo1, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return immMemo1;
      }

      var immTableInfo = immDatasource.get('tables').reduce(function(immMemo2, immTable) {
        if (immTable.get('checkboxState')) {
          return immMemo2.push(Imm.Map({tableLongName: immTable.get('longName', immTable.get('shortName')), tableShortName: immTable.get('shortName')}));
        } else {
          return immMemo2;
        }
      }, Imm.List());

      return immMemo1.concat(immTableInfo);
    }, Imm.List()).sortBy(function(immDescriptor) { return immDescriptor.get('tableShortName'); });
  },

  getInitialState: function() {
    return {currentTableSummary: this.getCurrentTableSummary(this.props.immAdminStore), openOverall: true, openCurrentTable: true};
  },

  /**
   * Returns a list of tables without edges connecting them to other tables.
   */
  getOrphanedTables: function() {
    return this.props.immAdminStore.getIn(['workingCs', 'datasources']).reduce(function(immMemo1, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return immMemo1;
      }

      var immTableInfo = immDatasource.get('tables').reduce(function(immMemo2, immTable) {
        if (!immTable.get('checkboxState')) {
          return immMemo2;
        }
        var immEndpoints = immTable.get('columns').filter(function(immColumn) {
          return !immColumn.get('children', Imm.Set()).isEmpty() || !immColumn.get('parents', Imm.Set()).isEmpty();
        });
        if (immEndpoints.isEmpty()) {
          return immMemo2.push(Imm.Map({tableLongName: immTable.get('longName', immTable.get('shortName')), tableShortName: immTable.get('shortName')}));
        } else {
          return immMemo2;
        }
      }, Imm.List());

      return immMemo1.concat(immTableInfo);
    }, Imm.List()).sortBy(function(immDescriptor) { return immDescriptor.get('tableShortName'); });
  },

  /**
   * Returns a list of tables without any columns set as unique.
   */
  getUnsetUniquenessTables: function() {
    return this.props.immAdminStore.getIn(['workingCs', 'datasources']).reduce(function(immMemo1, immDatasource) {
      if (!immDatasource.get('checkboxState')) {
        return immMemo1;
      }

      var immTableInfo = immDatasource.get('tables').reduce(function(immMemo2, immTable) {
        if (!immTable.get('checkboxState')) {
          return immMemo2;
        }
        var immUniqueColumns = immTable.get('columns').filter(function(immColumn) { return immColumn.get('isUnique'); });
        if (immUniqueColumns.isEmpty()) {
          return immMemo2.push(Imm.Map({tableLongName: immTable.get('longName', immTable.get('shortName')), tableShortName: immTable.get('shortName')}));
        } else {
          return immMemo2;
        }
      }, Imm.List());

      return immMemo1.concat(immTableInfo);
    }, Imm.List()).sortBy(function(immDescriptor) { return immDescriptor.get('tableShortName'); });
  },

  handleOverallItemOpener: function() {
    // After the state of item opener changes, we call resizeHandler to force ComprehendSchemaTable to resize accordingly.
    // We need to ensure SchemaTable to finish re-rendering before we can resize ComprehendSchemaTable to get the correct measurement.
    this.setState({openOverall: !this.state.openOverall}, this.props.resizeHandler);
  },

  handleCurrentTableItemOpener: function() {
    // After the state of item opener changes, we call resizeHandler to force ComprehendSchemaTable to resize accordingly.
    // We need to ensure SchemaTable to finish re-rendering before we can resize ComprehendSchemaTable to get the correct measurement.
    this.setState({openCurrentTable: !this.state.openCurrentTable}, this.props.resizeHandler);
  },

  // In order for 'text-truncation' to work, we have to set the summary schema
  // component width.  The title width is calculated by the total space we have
  // minus the amount of space other components would take and the amount of
  // space the item opener would take.
  handleResize: function() {
    // The schema summary width would be the total space we have minus the
    // amount of space other components would take.
    $(ReactDOM.findDOMNode(this)).width(this.props.width - this.bodyPadding);
    //  The title width is only changed when the current table is displayed.
    if (this.state.currentTableSummary && !this.state.currentTableSummary.hidden) {
      $(ReactDOM.findDOMNode(this.refs['currentTableTitle'])).width(this.props.width - this.bodyPadding - this.itemOpenerPadding);
    }
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;
    var accountIsLegacy = immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);

    if (ComprehendSchemaUtil.isComprehendSchemaLoading(immAdminStore)) {
      return div({className: 'spinner-container'}, div({className: 'spinner'}));
    }
    var currentTableSummary = this.state.currentTableSummary;
    var displayTable = null;
    if (!_.isNull(currentTableSummary) && !currentTableSummary.hidden) {
      var currentTableContent = null;

      if (this.state.openCurrentTable) {
        var uniqueColumn = _.map(currentTableSummary.uniqueColumns, function(c) { return (c.longName || c.shortName) + ' (' + c.shortName + ')'; }).join(', ');
        var childElement = currentTableSummary.children.length === 0 ? null : RelatedItem({
          width: this.props.width,
          type: 'Child',
          class: 'child-summary',
          items: _.map(currentTableSummary.children, function(child) {
            return {left: [currentTableSummary.longName, ' ' + child.parentColLongName, ' (' + currentTableSummary.shortName + '.' + child.parentColShortName + ')'],
                    right: [child.tableLongName, ' ' + child.colLongName, ' (' + child.tableShortName + '.' + child.colShortName + ')']};
          })});
        var parentElement = currentTableSummary.parents.length === 0 ? null : RelatedItem({
          width: this.props.width,
          type: 'Parent',
          class: 'parent-summary',
          items: _.map(currentTableSummary.parents, function(parent) {
            return {left: [parent.tableLongName , ' ' + parent.colLongName , ' (' + parent.tableShortName + '.' + parent.colShortName + ')'],
                    right: [currentTableSummary.longName, ' ' + parent.childColLongName, ' (' + currentTableSummary.shortName + '.' + parent.childColShortName + ')']};
          })});
        currentTableContent = div(null,
                                  div(null, div(null, 'Status'), div(null, div(null, div(null, div({className: 'status-text'}, currentTableSummary.status), div(null, div({className: 'icon-loop2', onClick: AdminActions.verifySelectedTableUniquenessColumns})))))),
                                  accountIsLegacy ? div(null, div(null, 'Review Tool'), div({className: 'review-tool'}, currentTableSummary.reviewToolState ? 'Activated' : 'Deactivated')) : null,
                                  !uniqueColumn ? null : div(null, div(null, 'Unique column'), div({className: 'unique-column'}, uniqueColumn)),
                                  div(null, div(null, 'Total'), div({className: 'total-summary'}, currentTableSummary.totalRows + ' rows, ' + currentTableSummary.visibleColumns + ' visible columns')),
                                  parentElement,
                                  childElement);
      }
      displayTable = div({className: 'summary-current-table'},
                         div(null,
                             div(null,
                                 div(null, div({ref: 'currentTableTitle', className: 'text-truncation'}, 'CURRENT TABLE - ' + currentTableSummary.longName)),
                                 ItemOpener({isOpen: this.state.openCurrentTable, onClick: this.handleCurrentTableItemOpener}))),
                         currentTableContent);
    }
    const isCDMCheckbox = div(null,
      div({className: 'cdm-checkbox-label'}, 'Common data model'),
      Checkbox({
        checkedState: this.props.immAdminStore.getIn(['workingCs', 'isCDM']) || false,  // isCDM could be set as undefined.
        onClick: AdminActions.setIsCDM.bind(null, !this.props.immAdminStore.getIn(['workingCs', 'isCDM']))
      }));

    var overall = !this.state.openOverall ? null : div(null,
                                                       isCDMCheckbox,
                                                       OverallItem({type: 'In Schema', immItems: this.getIncludedTables()}),
                                                       OverallItem({type: 'Orphans', immItems: this.getOrphanedTables()}),
                                                       OverallItem({type: 'Uniqueness not set', immItems: this.getUnsetUniquenessTables()}),
                                                       accountIsLegacy ? OverallItem({type: 'Active Review Tool (RT)', immItems: this.getActiveReviewTools()}) : null);
    return div({className: 'summary-schema'},
               div({className: 'summary-overall'},
                   div(null, div(null, div(null, div(null, 'OVERALL')), ItemOpener({isOpen: this.state.openOverall, onClick: this.handleOverallItemOpener}))),
                   overall),
               displayTable);
  }
});

module.exports = SchemaSummary;
