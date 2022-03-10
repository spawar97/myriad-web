var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var Imm = require('immutable');
var BatchEditTable = React.createFactory(require('./BatchEditTable'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var AdminActions = require('../../actions/AdminActions');
var BatchEditConstants = require('../../constants/BatchEditConstants');
var ModalConstants = require('../../constants/ModalConstants');
var Util = require('../../util/util');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;
var hr = DOM.hr;
var span = DOM.span;

class BatchEditControlPanel extends React.Component {
  static displayName = 'BatchEditControlPanel';

  static propTypes = {
    batchEditEnabled: PropTypes.bool.isRequired,
    datasourceIsSelected: PropTypes.bool.isRequired,
    immSelectedNode: PropTypes.instanceOf(Imm.Map).isRequired,
    isTvSearchByTable: PropTypes.bool.isRequired,
    tvSearchText: PropTypes.string.isRequired
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  getColumnChangeInfo = (attribute, newAttributeState) => {
    // Count the number of columns affected by the proposed change as well as
    // the number of columns for which the change will have no effect. This
    // wrapper function calls getColumnCounts() for each in-scope table and
    // tallys the columns.
    var immChangeCount = Imm.Map({totalColumns: 0, totalUnaffected: 0});
    if (this.props.immSelectedNode.has('tables')) {
      // This is a datasource, loop over all in-scope tables.
      immChangeCount = this.props.immSelectedNode.get('tables')
        .filter(Util.isNodeInScope)
        .reduce(function(immUpdatedChangeCount, immTable) {
          return this.getColumnCounts(immTable, immUpdatedChangeCount, attribute, newAttributeState);
        }, immChangeCount, this);
    } else {
      immChangeCount = this.getColumnCounts(this.props.immSelectedNode, immChangeCount, attribute, newAttributeState);
    }

    return immChangeCount;
  };

  // immTable: Immutable table to count columns on.
  // immChangeCount: Immutable Map of form {totalColumns: 0, totalUnaffected: 0} where
  //   totalColumns represent the number of checked columns and totalUnaffected
  //   represents the number of checked columns that will not change state as a
  //   result of the selected change action.
  // attribute: The column field being changed, e.g. isUnique.
  // newAttributeState: The new value for the field stored in `attribute`. If a
  //   column already has its attribute field set equal to newAttributeState,
  //   e.g, a column with isUnique: true is being batch set to be unique, then that
  //   column will be added to the count of totalUnaffected columns.
  getColumnCounts = (immTable, immChangeCount, attribute, newAttributeState) => {
    // This function does the actual counting of the affected or no-effect columns.
    return immTable.get('columns').reduce(function(immChangeCount, immColumn) {
      if (immColumn.get('batchEditCheckboxState')) {
        immChangeCount = immChangeCount.update('totalColumns', function(totalColumns) { return totalColumns += 1; });
        if (immColumn.get(attribute) === newAttributeState) {
          immChangeCount = immChangeCount.update('totalUnaffected', function(totalUnaffected) { return totalUnaffected += 1; });
        }
      }

      return immChangeCount;
    }, immChangeCount);
  };

  // This function will return the number of columns currently selected for
  // batch editing.
  getSelectedColumnCount = () => {
    // Just tally the number of selected columns.
    if (this.props.immSelectedNode.has('tables')) {
      // This is a datasource, loop over all in-scope tables.
      return this.props.immSelectedNode.get('tables')
        .filter(function(immTable) { return immTable.get('inSearch') && immTable.get('checkboxState'); })
        .reduce(function(updatedSelectedColumnCount, immTable) {
          return updatedSelectedColumnCount + immTable.get('columns').filter(function(immColumn) { return immColumn.get('batchEditCheckboxState'); }).count();
        }, 0, this);
    } else {
      return this.props.immSelectedNode.get('columns').filter(function(immColumn) { return immColumn.get('batchEditCheckboxState'); }).count();
    }
  };

  handleBatchEdit = () => {
    AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_MODE_TOGGLE);
  };

  handleTableBatchEditDropdownChange = (index) => {
    switch (index) {
      case 0:
        // Set tables visible.
        AdminActions.batchEdit(BatchEditConstants.BATCH_EDIT_TABLE_VISIBILITY, false);
        break;
      case 1:
        // Set tables invisible.
        AdminActions.batchEdit(BatchEditConstants.BATCH_EDIT_TABLE_VISIBILITY, true);
        break;
      // Number jumps by one to account for hr element in dropdown.
      case 3:
        // Check all tables.
        AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SELECT_ALL_TABLES, true);
        break;
      case 4:
        // Un-check all tables.
        AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SELECT_ALL_TABLES, false);
        break;
    }
  };

  handleColumnBatchEditDropdownChange = (index) => {
    switch (index) {
      case 0:
        // We don't know the newAttributeState until the user sends input,
        // so we can only use changeCount.totalColumns.
        var modalProps = {columnCount: this.getSelectedColumnCount()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_RENAME, modalProps);
        break;
      case 1:
        // Batch modify column data type.
        var modalProps = {columnCount: this.getSelectedColumnCount()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_COLUMN_DATATYPE, modalProps);
        break;
      case 2:
        // Set columns visible.
        var modalProps = {attributeChanged: BatchEditConstants.BATCH_EDIT_COLUMN_VISIBILITY, newAttributeState: false, changeCount: this.getColumnChangeInfo('isInvisible', false).toJS()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_COLUMNS, modalProps);
        break;
      case 3:
        // Set columns invisible.
        var modalProps = {attributeChanged: BatchEditConstants.BATCH_EDIT_COLUMN_VISIBILITY, newAttributeState: true, changeCount: this.getColumnChangeInfo('isInvisible', true).toJS()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_COLUMNS, modalProps);
        break;
      case 4:
        // Add uniqueness.
        var modalProps = {attributeChanged: BatchEditConstants.BATCH_EDIT_COLUMN_UNIQUENESS, newAttributeState: true, changeCount: this.getColumnChangeInfo('isUnique', true).toJS()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_COLUMNS, modalProps);
        break;
      case 5:
        // Remove uniqueness.
        var modalProps = {attributeChanged: BatchEditConstants.BATCH_EDIT_COLUMN_UNIQUENESS, newAttributeState: false, changeCount: this.getColumnChangeInfo('isUnique', false).toJS()};
        AdminActions.displayModal(ModalConstants.MODAL_BATCH_EDIT_COLUMNS, modalProps);
        break;
      // Number jumps by one to account for hr element in dropdown.
      case 7:
        // Select all columns.
        AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SELECT_ALL_COLUMNS, true);
        break;
      case 8:
        // De-select all columns.
        AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SELECT_ALL_COLUMNS, false);
        break;
    }
  };

  render() {
    var dropdown = null,
        batchEditButton = null;

    // Only show the batch edit button and menu if a datasource is selected or
    // if a table is selected and we're filtering by column, and only if the
    // table is in schema or datasource has a table in the schema.
    if ((this.props.datasourceIsSelected || !this.props.isTvSearchByTable) && !!this.props.immSelectedNode.get('checkboxState')) {
      // Display the correct batch edit menu depending on whether we are
      // searching by table or by column.
      dropdown = div(null,
        SimpleDropdown({
          isDisabled: !this.props.batchEditEnabled,
          rightAlign: false,
          scrollbarDisabled: true,
          onChange: this.props.isTvSearchByTable ? this.handleTableBatchEditDropdownChange : this.handleColumnBatchEditDropdownChange,
          opener: div({className: 'icon-cog clickable'}),
          selectCheckDisabled: true,
          items: this.props.isTvSearchByTable ? [
            {icon: 'icon-eye', name: 'Set as Visible'},
            {icon: 'icon-eye-blocked', name: 'Set as Invisible'},
            {content: hr({key: 'hr-batch-edit-control-panel'})},
            {icon: 'icon-checkmark-full', name: 'Select All'},
            {icon: 'icon-checkbox-unchecked', name: 'Deselect All'}
          ] : [
            {icon: 'icon-pencil', name: 'Rename'},
            {icon: 'icon-font', name: 'Modify Datatype'},
            {icon: 'icon-eye', name: 'Set as Visible'},
            {icon: 'icon-eye-blocked', name: 'Set as Invisible'},
            {icon: 'icon-target', name: 'Set as Unique'},
            {icon: 'icon-close', name: 'Remove Unique'},
            {content: hr({key: 'hr-batch-edit-control-panel'})},
            {icon: 'icon-checkmark-full', name: 'Select All'},
            {icon: 'icon-checkbox-unchecked', name: 'Deselect All'}
          ]
        }));

      batchEditButton = div(
        {onClick: this.handleBatchEdit},
        span({className: 'clickable'}, this.props.isTvSearchByTable ? 'Table Batch Edit' : 'Column Batch Edit'));
    }

    var title = _.isEmpty(this.props.tvSearchText) ? 'Sample Data' :
      'Search results: ' + (this.props.isTvSearchByTable ? 'Tables' : 'Columns') + ' with "' + this.props.tvSearchText + '"';

    return div({className: 'control-panel batch-edit-control-panel'},
      div(null,
        title,
        batchEditButton,
        dropdown));
  }
}

module.exports = BatchEditControlPanel;
