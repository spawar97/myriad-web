var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var Imm = require('immutable');
var DataTable = React.createFactory(require('../DataTable'));
var AdminActions = require('../../actions/AdminActions');
var BatchEditConstants = require('../../constants/BatchEditConstants');
var ColumnDropdownConstants = require('../../constants/ColumnDropdownConstants');
var DataTypeConstants = require('../../constants/DataTypeConstants');
var ModalConstants = require('../../constants/ModalConstants');
import PropTypes from 'prop-types';

var ComprehendSchemaTable = createReactClass({
  displayName: 'ComprehendSchemaTable',
  // The order of these properties in statusIcons would indicate the order of the status icons in the column status header.
  // The icon field indicates the icon that map to each status.
  // The name field indicates the tooltip that map to each icon in the column status header.
  statusIcons: {
    isUnique: {
      icon: 'icon-target',
      name: 'Unique'
    },
    hasChild: {
      icon: 'icon-arrow-right',
      name: 'Has child'
    },
    hasParent: {
      icon: 'icon-arrow-left',
      name: 'Has parent'
    },
    isInvisible: {
      icon: 'icon-eye-blocked',
      name: 'Invisible'
    }
  },

  propTypes: {
    batchEditEnabled: PropTypes.bool.isRequired,
    immTable: PropTypes.instanceOf(Imm.Map).isRequired,
    isTvSearchByTable: PropTypes.bool.isRequired,
    shortTables: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired,
    disableEditing: PropTypes.bool,
    doResize: PropTypes.bool,
    useGivenWidth: PropTypes.bool
  },

  calculateHeight: function(nextProps) {
    var props = nextProps ? nextProps : this.props;
    // Long name header height = short name height + long name height + padding.
    //                         = 21px + 14px + 8px * 2
    var headerHeight = 50;
    var statusIconHeight = 31;
    var dataTypeHeaderHeight = 31;
    var rowHeight = 31;
    var valuesSize = props.immTable.get('values').size;
    valuesSize = this.props.shortTables ? _.max(valuesSize, 5) : valuesSize;
    var valuesHeight = valuesSize > 0 ? (valuesSize * rowHeight + 3) : 0;
    // Choose the max between the calculated height of the table and the minimum
    // space required to show the dropdowns properly without scrolling on the
    // table. Currently the largest dropdown requires a table of at least 330px
    // to display fully.
    var requiredContentHeight = Math.max(valuesHeight + headerHeight + statusIconHeight + dataTypeHeaderHeight, 330);
    return requiredContentHeight;
  },

  getInitialState: function() {
    return {height: 0};
  },

  componentDidMount: function() {
    this.setState({
      height: this.calculateHeight()
    });
  },

  componentWillReceiveProps: function(nextProps) {
    if (nextProps.doResize || nextProps.immTable.get('values').size !== this.props.immTable.get('values').size) {
      this.handleResize(nextProps);
    }
  },

  // This callback is to handle clicks on the multi-column edit checkboxes that
  // appear on the DataTable header in column batch edit mode.
  handleBatchEditCheckboxClick: function(colShortName, newState) {
    var shortNameInfo = {tableShortName: this.props.immTable.get('shortName'), colShortName: colShortName};
    AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SET_COLUMN_STATE, newState, 'batchEditCheckboxState', shortNameInfo);
  },

  handleResize: function(nextProps) {
    // The `doResize` prop can cause this handler to fire when we're not mounted and
    // when `this.state.width === 0`. We need to guard against both situations.
    if (this.isMounted() && this.state.width !== 0) {
      this.setState({
        height: this.calculateHeight(nextProps)
      });
    }
  },

  handleDropdownClick: function(index, properties) {
    var tableShortName = this.props.immTable.get('shortName');
    switch (index) {
      case ColumnDropdownConstants.RENAME_COLUMN:
        AdminActions.renameColumnLongName(properties.shortName, properties.oldLongName, properties.newLongName, tableShortName);
        break;
      case ColumnDropdownConstants.SET_COLUMN_INVISIBILITY:
        AdminActions.setColumnInvisibility(tableShortName, properties.name, properties.isInvisible);
        break;
      case ColumnDropdownConstants.SET_EDGE:
        var immTable = this.props.immTable;
        AdminActions.displayModal(ModalConstants.MODAL_VIEW_COLUMN_EDGES, {
          tableLongName: immTable.get('longName'),
          tableShortName: immTable.get('shortName'),
          colLongName: properties.longName,
          colShortName: properties.shortName,
          children: immTable.getIn(['columns', properties.shortName, 'children'])
        });
        break;
      case ColumnDropdownConstants.SET_UNIQUE:
        AdminActions.setColumnUniqueness(properties.name, properties.isUnique, tableShortName);
        break;
    }
  },

  handleTypeDropdownClick: function(colName, index) {
    var type;
    switch (index) {
      case 0:
        type = DataTypeConstants.STRING;
        break;
      case 1:
        type = DataTypeConstants.INTEGER;
        break;
      case 2:
        type = DataTypeConstants.DECIMAL;
        break;
      case 3:
        type = DataTypeConstants.BOOLEAN;
        break;
      case 4:
        type = DataTypeConstants.DATETIME;
        break;
      case 5:
        type = DataTypeConstants.DATE;
        break;
      case 6:
        type = DataTypeConstants.IMAGE;
        break;
    }

    AdminActions.setColumnType(colName, type, this.props.immTable.get('shortName'));
  },

  render: function() {
    // Limit the number of sample rows displayed when a datasource is selected.
    var items = this.props.immTable.get('values').take(this.props.shortTables ? 7 : Infinity).map(function(value) { return value.get('row'); }).toJS();

    // Filter out columns that don't appear in the search results.
    var immFilteredCols = this.props.isTvSearchByTable ? this.props.immTable.get('columns') :
      this.props.immTable.get('columns').filter(function(immColumn) { return immColumn.get('inSearch'); });

    // Generate the column ordering from the filtered results. The column
    // ordering is just an array of the shortNames of the columns.
    var immFilteredColumnOrdering = this.props.isTvSearchByTable ? this.props.immTable.get('columnOrdering') :
      immFilteredCols.reduce(function(immColOrder, immCol, immColName) {
        return immColOrder.push(immColName);
      }, Imm.List()).sort();

    return DataTable({
      items: items,
      batchEditEnabled: this.props.batchEditEnabled && !this.props.isTvSearchByTable,
      columns: immFilteredCols.toJS(),
      columnOrdering: immFilteredColumnOrdering.toJS(),
      handleBatchEditCheckboxClick: this.handleBatchEditCheckboxClick,
      height: this.state.height,
      // Adjust width for padding, scrollbar and borders.
      width: this.props.width - (this.props.useGivenWidth ? 0 : 36),
      sortDisabled: true,
      paginationDisabled: true,
      statusIcons: this.statusIcons,
      colDropdownItems: this.props.disableEditing ? null : [
        {icon: 'icon-pencil', name: 'Rename'},
        {icon: this.statusIcons.isInvisible.icon, name: 'Set as Invisible'},
        {icon: this.statusIcons.isUnique.icon, name: 'Set as Unique'},
        {icon: 'icon-arrow-right-circle-full', name: 'Define Children'}],
      typeDropdownItems: this.props.disableEditing ? null : [
        {name: DataTypeConstants.STRING},
        {name: DataTypeConstants.INTEGER},
        {name: DataTypeConstants.DECIMAL},
        {name: DataTypeConstants.BOOLEAN},
        {name: DataTypeConstants.DATETIME},
        {name: DataTypeConstants.DATE},
        {name: DataTypeConstants.IMAGE}],
      allowEditColumnHeader: true,
      displayDataType: true,
      handleDropdownClick: this.handleDropdownClick,
      handleTypeDropdownClick: this.handleTypeDropdownClick,
      viewOnly: !this.props.immTable.get('checkboxState'),
      colLongNameEnabled: true,
      noBorder: true
    });
  }
});

module.exports = ComprehendSchemaTable;
