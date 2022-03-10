var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ComprehendSchemaTable = React.createFactory(require('./ComprehendSchemaTable'));
var SimpleTable = React.createFactory(require('./SimpleTable'));
var Checkbox = React.createFactory(require('../Checkbox'));
var InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var AdminActions = require('../../actions/AdminActions');
var BatchEditConstants = require('../../constants/BatchEditConstants');
var KeyCodeConstants = require('../../constants/KeyCodeConstants');
var Util = require('../../util/util');

var div = DOM.div,
    input = DOM.input,
    span = DOM.span;

var ControlPanel = React.createFactory(createReactClass({
  displayName: 'ControlPanel',
  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immTable: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number
  },

  // Body padding is the sum of admin tab left padding, tree nav size, border, admin edit schema main left padding, and admin tab right padding.
  bodyPadding: 30 + 300 + 1 + 20 + 30,
  // Searchbox padding is the sum of padding, ellipsis width, searchBox size, and searchBox right padding.
  searchBoxPadding: 30 + 20 + 250 + 20,

  getInitialState: function() {
    return {edit: false};
  },

  componentDidMount: function() {
    this.handleResize();
  },

  componentDidUpdate: function() {
    this.handleResize();
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return !_.isEqual(this.state, nextState) || this.props.width !== nextProps.width ||
      !Imm.is(this.props.immTable, nextProps.immTable);
  },

  // In order for 'text-truncation' to work, we have to set the control panel longName wrapper width.
  // The width is calculated by min between the width would be required for the text to be render correctly and the size of the available space we have.
  // The textWidth is max of longName text and shortName text.
  // This function will be triggered after the component being mount, after a prop or state of a component being updated, and when the screen being resized.
  handleResize: function() {
    var widestFont = Util.getWidestFont();
    var longName = this.refs['longName'];
    if (longName) {
      var titleWidth = Util.get2dCanvasContext('16px ' + widestFont).measureText(this.props.immTable.get('longName').toUpperCase()).width;
      var subtitleWidth = Util.get2dCanvasContext('12px ' + widestFont).measureText(this.props.immTable.get('shortName')).width;
      var textWidth = _.max([titleWidth, subtitleWidth]);
      var width = _.min([this.props.width - this.bodyPadding - this.searchBoxPadding, textWidth]);
      $(ReactDOM.findDOMNode(longName)).width(width);
    }
  },

  handleRenameTitle: function(e) {
    switch (e.keyCode) {
      case KeyCodeConstants.ENTER:
        this.setState({edit: false});
        AdminActions.renameSchemaTableLongName(e.target.value, this.props.immTable.get('shortName'));
        break;
      case KeyCodeConstants.ESCAPE:
        this.setState({edit: false});
        break;
    }
  },

  handleDropdownChange: function(index) {
    var tableShortName = this.props.immTable.get('shortName');
    switch (index) {
      case 0:
        this.setState({edit: true}, function() {
          var input = ReactDOM.findDOMNode(this.refs['rename-longName-input']);
          input.focus();
          input.select();
        });
        break;
      case 1:
        AdminActions.setTableInvisibility(!this.props.immTable.get('isInvisible'), tableShortName);
        break;
      case 2:
        AdminActions.toggleDRT(tableShortName);
    }
  },

  handleBlur: function() {
    this.setState({edit: false});
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;
    var isInvisible = this.props.immTable.get('isInvisible');
    var accountIsLegacy = immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);

    var renameItem = {icon: 'icon-pencil', name: 'Rename', disabled: isInvisible};
    var invisiblityItem = isInvisible ?
      {icon: 'icon-eye', name: 'Set as Visible'} :
      {icon: 'icon-eye-blocked', name: 'Set as Invisible'};

    var items = [renameItem, invisiblityItem];
    if (accountIsLegacy) {
      var reviewToolItem = this.props.immTable.get('isDRTEnabled') ?
        {icon: 'icon-close', name: 'Deactivate RT'} :
        {icon: 'icon-checkmark-full', name: 'Activate RT'};
      items.push(reviewToolItem);
    }
    var dropdown = div(null,
      SimpleDropdown({
        isDisabled: !this.props.immTable.get('checkboxState'),
        rightAlign: true,
        scrollbarDisabled: true,
        onChange: this.handleDropdownChange,
        selectCheckDisabled: true,
        items: items
      }));

    var longName = this.state.edit ? input({
      type: 'text',
      ref: 'rename-longName-input',
      defaultValue: this.props.immTable.get('longName'),
      onKeyDown: this.handleRenameTitle,
      onBlur: this.handleBlur
    }) : div({ref: 'longName', className: cx({'text-truncation': true, dimmed: isInvisible})}, this.props.immTable.get('longName'));
    var titleComp = div(null,
      div(null,
        div(null, longName),
        div(null, dropdown),
        isInvisible ? div(null, div({className: 'icon-eye-blocked'})) : null),
      div(null, div(null, this.props.immTable.get('shortName'))));
    return div({className: 'control-panel'}, div(null, div(null, titleComp)));
  }
}));

class TableItem extends React.Component {
  static displayName = 'TableItem';

  static propTypes = {
    doResize: PropTypes.bool.isRequired,
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immTable: PropTypes.instanceOf(Imm.Map).isRequired,
    shortTables: PropTypes.bool.isRequired,
    width: PropTypes.number
  };

  shouldComponentUpdate(nextProps) {
    return this.props.width !== nextProps.width || this.props.doResize !== nextProps.doResize || this.props.shortTables !== nextProps.shortTables ||
      !Imm.is(this.props.immTable, nextProps.immTable) ||
      this.props.immAdminStore.get('batchEditEnabled') !== nextProps.immAdminStore.get('batchEditEnabled') ||
      this.props.immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']) !== nextProps.immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']);
  }

  handleExpandOrCollapse = (shortName, newState) => {
    AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SET_TABLE_STATE, newState, 'batchEditExpanded', {tableShortName: shortName, colShortName: null});
  };

  handleTableItemDropdownChange = (changeType) => {
    switch (changeType) {
      case 0:
        //TODO: Rename
        break;
      case 1:
        // Toggle single table visibility.
        AdminActions.setTableInvisibility(!this.props.immTable.get('isInvisible', false), this.props.immTable.get('shortName'));
        break;
      case 2:
        AdminActions.toggleDRT(this.props.immTable.get('shortName'));
    }
  };

  handleCheckboxClick = (shortName, newState) => {
    AdminActions.updateBatchEdit(BatchEditConstants.BATCH_EDIT_SET_TABLE_STATE, newState, 'batchEditCheckboxState', {tableShortName: shortName, colShortName: null});
  };

  render() {
    var immAdminStore = this.props.immAdminStore;
    var immTable = this.props.immTable;
    var batchEditEnabled = immAdminStore.get('batchEditEnabled');
    var isTvSearchByTable = immAdminStore.getIn(['tvSearchState', 'isTvSearchByTable']);
    var accountIsLegacy = immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);

    var tableShortName = immTable.get('shortName');
    var itemIsExpanded = immTable.get('batchEditExpanded');
    var opener = ItemOpener({isOpen: itemIsExpanded,
                             onClick: this.handleExpandOrCollapse.bind(null, tableShortName)});

    var checkbox = batchEditEnabled && isTvSearchByTable ?
      Checkbox({dimmed: !immTable.get('batchEditCheckboxState'),
                onClick: this.handleCheckboxClick.bind(null, tableShortName),
                checkedState: immTable.get('batchEditCheckboxState')}) : null;

    var displayText = immTable.get('longName') ?
      [immTable.get('longName'), span({key: 'sn', className: 'tree-short-name'}, immTable.get('shortName'))] : immTable.get('shortName');

    var textbox =
        div({className: cx({'batch-table-name': true,
                            dimmed: !immTable.get('batchEditCheckboxState') && immTable.get('depth') > 0}),
            ref: 'textbox'},
           displayText);

    var renameItem = {icon: 'icon-pencil', name: 'Rename'};
    var visibilityItem = immTable.get('isInvisible') ?
      {icon: 'icon-eye', name: 'Set as Visible'} :
      {icon: 'icon-eye-blocked', name: 'Set as Invisible'};

    var items = [renameItem, visibilityItem];
    if (accountIsLegacy) {
      var reviewToolItem = immTable.get('isDRTEnabled') ?
        {icon: 'icon-close', name: 'Deactivate RT'} :
        {icon: 'icon-checkmark-full', name: 'Activate RT'};
      items.push(reviewToolItem);
    }
    var dropdown = div(null, SimpleDropdown({
      rightAlign: false,
      isDisabled: batchEditEnabled,
      scrollbarDisabled: true,
      onChange: this.handleTableItemDropdownChange,
      opener: div({className: 'icon-cog'}),
      selectCheckDisabled: true,
      items: items
    }));

    // this.props.width is the width of admin-edit-schema-main
    // If we don't subtract 2 here then we get a horizontal scroll bar because of the borders of the containing table.
    var tableWidth = this.props.width - 2;
    var previewTable = null;

    if (itemIsExpanded) {
      var dataIsLoading = immTable.get('tableDataIsLoading');
      if (!dataIsLoading && immTable.has('values')) {
        // The TableItem has been expanded and the table data is loaded. Show
        // the table.
        previewTable = div(null,
          div(null,
              SimpleTable({title: ControlPanel({immAdminStore: immAdminStore,
                                                immTable: immTable,
                                                width: tableWidth}),
                           content: ComprehendSchemaTable({shortTables: this.props.shortTables,
                                                           batchEditEnabled: batchEditEnabled,
                                                           immTable: immTable,
                                                           isTvSearchByTable: isTvSearchByTable,
                                                           doResize: this.props.doResize,
                                                           width: tableWidth})})));
      } else if (dataIsLoading) {
        // The TableItem has been expanded to show the table but the table data
        // is still loading. Show a spinner for now.
        previewTable = div({className: 'spinner-container'}, div({className: 'spinner'}));
      }
    }

    return div(null,
      div({className: 'batch-table-entry'},
        div(null, opener),
        div(null, checkbox),
        // 104 = 20(checkbox) + 20(item-opener) + 18(cog) + 48 to line up the cogs
        div({style: {width: tableWidth - 104}}, textbox),
        div(null, dropdown)),
      previewTable);
  }
}

module.exports = TableItem;
