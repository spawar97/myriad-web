var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('../Checkbox'));
var AdminActions = require('../../actions/AdminActions');
var Util = require('../../util/util.js');

// These classes are dependent on the FixedDataTable class.
var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

var div = DOM.div;

class YutaniUsersTable extends React.Component {
  static displayName = 'YutaniUsersTable';

  static propTypes = {
    height: PropTypes.number.isRequired,
    immComprehendSchemaMetadataList: PropTypes.instanceOf(Imm.List).isRequired,
    immSchemaUsersChangeList: PropTypes.instanceOf(Imm.List).isRequired,
    immUsers: PropTypes.instanceOf(Imm.List).isRequired,
    isLoading: PropTypes.bool.isRequired,
    width: PropTypes.number.isRequired
  };

  state = {
    immColWidths: Imm.List()
  };

  componentDidUpdate(prevProps) {
    // The browser will retain the scroll position of the `admin-tab-users-table`
    // viewport between renders. We don't want this behavior when we switch customers, so
    // we reset the scroll position after each load. This must be done on the
    // `componentDidUpdate` call since it is ineffective when used with the
    // `componentWillUpdate` call.
    if (prevProps.isLoading && !this.props.isLoading) {
      var $this = $(ReactDOM.findDOMNode(this));
      $this.scrollLeft(0);
      $this.scrollTop(0);
    }
  }

  getDimensions = () => {
    var ctx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    var availableHeight = this.props.height - 100;  // 100 is to adjust for spacing above and below the table.
    var tableHeight = _.min([availableHeight, ((this.props.immUsers.size + 2) /* 2 header rows */) * 50]);
    var checkboxWidth = 16;
    var maxUserNameWidth = Math.ceil(this.props.immUsers.reduce(function(memo, user) {
      return _.max([memo, ctx.measureText(user).width]);
    }, ctx.measureText('User').width));
    var immColWidths = this.props.immComprehendSchemaMetadataList.reduce(function(immMemo, immSchema) {
      return immMemo.push(Math.ceil(_.max([checkboxWidth, ctx.measureText(immSchema.get('schemaName')).width])));
    }, Imm.List([Math.ceil(ctx.measureText('All / None').width), maxUserNameWidth]));
    var cellLeftRightPadding = 40;
    return {tableHeight: tableHeight, immColWidths: immColWidths.map(function(width) { return width + cellLeftRightPadding; })};
  };

  // This routine handles updates to the shadow copy of the changes to user access
  // rights that overrides the copy of the actual current user access rights
  // pulled from the source. On a save the information in the shadow copy will
  // be used to generate the api calls to actually set user access rights.
  updateChangeList = (immChangeList, schemaId, schemaName, userName, adding) => {
    var changeListReduction = immChangeList.reduce(function(changeListReduction, immSchemaEntry) {
      if (immSchemaEntry.get('schemaName') === schemaName) {
        // Update this schema change list and record that we have done so.
        //
        // If an entry for the schema already exists then see if the
        // user has been updated. If it has, then we're reversing it
        // so remove the user entry and the entry for the schema if no
        // more users are attached to it.
        var usersListReduction = immSchemaEntry.get('users').reduce(function(usersListReduction, immUserEntry) {
          if (immUserEntry.get('userName') === userName) {
            // Drop the user from the changelist if the `adding`
            // property is different. Otherwise retain this user entry
            // without modification since it is the same as the
            // requested change.
            return [immUserEntry.get('adding') !== adding ? usersListReduction[0] : usersListReduction[0].push(immUserEntry), true];
          } else {
            // Retain this user entry without modification since it is
            // unrelated to the requested change.
            return [usersListReduction[0].push(immUserEntry), usersListReduction[1]];
          }
        }, [Imm.List(), false]);

        // If we didn't find our user entry, create a new one.
        var immUpdatedUsersList = usersListReduction[1] ?
          usersListReduction[0] :
          usersListReduction[0].push(Imm.Map({userName: userName, adding: adding}));

        // Add the updated schema entry to the new list if it still
        // has user entries, otherwise drop the schema entry.
        return [immUpdatedUsersList.size ?
          changeListReduction[0].push(immSchemaEntry.set('users', immUpdatedUsersList)) :
          changeListReduction[0], true];
      } else {
        // Add this schema entry to the new list unchanged.
        return [changeListReduction[0].push(immSchemaEntry), changeListReduction[1]];
      }
    }, [Imm.List(), false]);

    // If we didn't update an existing schemaEntry, create a new
    // one. Finish by returning the updated change list.
    if (!changeListReduction[1]) {
      return changeListReduction[0].push(Imm.fromJS({
        // TODO: Remove ( || 'NO_ID') after removing yutani source of truth.
        schemaId: schemaId || 'NO_ID',
        schemaName: schemaName,
        users: [{userName: userName, adding: adding}]
      }));
    } else {
      return changeListReduction[0];
    }
  };

  addOrRemoveUserOnSchema = (schemaId, schemaName, userName, adding) => {
    var immChangeList = this.updateChangeList(this.props.immSchemaUsersChangeList, schemaId, schemaName, userName, adding);
    AdminActions.updateSchemaUsers(immChangeList);
  };

  addOrRemoveUserOnAllSchemas = (userName, adding) => {
    var immChangeList = this.props.immComprehendSchemaMetadataList.reduce(function(immChangeList, immSchema) {
      if (this.getCheckedState(immSchema, userName) !== adding) {
        immChangeList = this.updateChangeList(immChangeList, immSchema.get('id'), immSchema.get('schemaName'), userName, adding);
      }
      return immChangeList;
    }, this.props.immSchemaUsersChangeList, this);
    AdminActions.updateSchemaUsers(immChangeList);
  };

  addOrRemoveAllUsersOnSchema = (immSchema, adding) => {
    var immChangeList = this.props.immUsers.reduce(function(immChangeList, userName) {
      if (this.getCheckedState(immSchema, userName) !== adding) {
        immChangeList = this.updateChangeList(immChangeList, immSchema.get('id'), immSchema.get('schemaName'), userName, adding);
      }
      return immChangeList;
    }, this.props.immSchemaUsersChangeList, this);
    AdminActions.updateSchemaUsers(immChangeList);
  };

  tallyCheckboxState = (total, immList) => {
    if (total === immList.size) {
      return true;
    } else if (total > 0) {
      return 'partial';
    }
    return false;
  };

  // This function determines if a base user access setting has been changed but
  // not yet saved.
  //
  // Returns a Boolean.
  checkForOverride = (schemaName, userName) => {
    var immSchema = this.props.immSchemaUsersChangeList.find(function(immSchema) { return immSchema.get('schemaName') === schemaName; });
    if (immSchema) {
      return immSchema.get('users').some(function(immUser) { return immUser.get('userName') === userName; });
    } else {
      return false;
    }
  };

  // Determine whether a cell should be checked or not.
  getCheckedState = (immSchema, user) => {
    // If the (schema, user) pair is in the change list, that means
    // the state is opposite of the original state. Otherwise the
    // state is the original state.
    var overridden = this.checkForOverride(immSchema.get('schemaName'), user);
    // If the schema does not have a users field, it's an empty list.
    var originalHasUser = immSchema.get('legacyUsers', Imm.List()).contains(user);
    return overridden ? !originalHasUser : originalHasUser;
  };

  getSchemaCheckBox = (schema) => {
    var total = this.props.immUsers.reduce(function(count, user) {
      return count + (this.getCheckedState(schema, user) ? 1 : 0);
    }, 0, this);

    return this.tallyCheckboxState(total, this.props.immUsers);
  };

  getUserCheckBox = (user) => {
    var total = this.props.immComprehendSchemaMetadataList.reduce(function(count, schema) {
      return count + (this.getCheckedState(schema, user) ? 1 : 0);
    }, 0, this);

    return this.tallyCheckboxState(total, this.props.immComprehendSchemaMetadataList);
  };

  setHoverIndex = (rowIndex) => {
    this.setState({hoverIndex: rowIndex});
  };

  headerRenderer = (label, index) => {
    var content;
    var secondRowClasses = {'virtual-table-cell second-row': true};
    switch (index) {
      case 0:
        content = [label, '-'];
        break;
      case 1:
        content = [label, 'User'];
        break;
      default:
        // Subtracting 2 from the index within the FixedDataTable will align us with
        // the correct index in immComprehendSchemaMetadataList. Our first two columns
        // represent the "All / None" and "User" columns.
        var immSchema = this.props.immComprehendSchemaMetadataList.get(index - 2);
        var checkedState = this.getSchemaCheckBox(immSchema);
        var checkbox = Checkbox({dimmed: !checkedState,
                                 checkedState: checkedState,
                                 onClick: this.addOrRemoveAllUsersOnSchema.bind(null, immSchema)});
        content = [checkbox, immSchema.get('schemaName')];
        // Note: 'schema-name' class is specified exclusively for SitePrism.
        secondRowClasses['schema-name'] = true;
    }
    return div({className: 'table-header virtual-table'},
             div({className: 'virtual-table-row first-row'}, div({className: 'virtual-table-cell'}, content[0])),
             div({className: 'virtual-table-row second-row'}, div({className: cx(secondRowClasses)}, content[1])));
  };

  allNoneCellRenderer = (immSortedUsers, cellData, cellDataKey, rowData, rowIndex) => {
    var userName = immSortedUsers.get(rowIndex);
    var userCheckedState = this.getUserCheckBox(userName);
    return Checkbox({dimmed: !userCheckedState,
                     checkedState: userCheckedState,
                     onClick: this.addOrRemoveUserOnAllSchemas.bind(null, userName)});
  };

  cellRenderer = (immSortedUsers, checkedState, cellDataKey, rowData, rowIndex) => {
    // cellDataKey references the index of the column within the FixedDataTable;
    // subtracting 2 will align us with the correct index in
    // immComprehendSchemaMetadataList. Our first two columns represent the "All / None"
    // and "User" columns.
    var schemaId = this.props.immComprehendSchemaMetadataList.get(cellDataKey - 2).get('id');
    var schemaName = this.props.immComprehendSchemaMetadataList.get(cellDataKey - 2).get('schemaName');
    var userName = immSortedUsers.get(rowIndex);
    return Checkbox({dimmed: !checkedState,
                     checkedState: checkedState,
                     onClick: this.addOrRemoveUserOnSchema.bind(null, schemaId, schemaName, userName)});
  };

  rowClassNameGetter = (index) => {
    var classes = {};
    if (index === this.state.hoverIndex) { classes['row-hover'] = true; }
    // Add a class to the last element of the
    // collection so that we know when the table has fully loaded.
    if (index === this.props.immUsers.size - 1) { classes['table-last-row-marker'] = true; }
    return cx(classes);
  };

  render() {
    if (this.props.isLoading) { return div({className: 'overlay'}, div({className: 'spinner'})); }

    var dimensions = this.getDimensions();

    var immSortedUsers = this.props.immUsers.sortBy(function(userName) { return userName.toLowerCase(); });
    var tableRows = immSortedUsers.map(function(userName) {
      var immRowCols = this.props.immComprehendSchemaMetadataList.map(function(immSchema) {
        return this.getCheckedState(immSchema, userName);
      }, this);
      return immRowCols.unshift(null, userName);
    }, this).toJS();

    var tableArgs = this.props.immComprehendSchemaMetadataList.map(function(immSchema, colIndex) {
      return Column({
        // By default, the fixed-data-table column headers seem to be static.
        // Adding a unique identifier to the column label effectively makes the header dynamic.
        // We should investigate whether or not this is the intended behavior of the component.
        // If it is not intended, we might want to submit a PR to the project to fix the issue.
        label: 'Col ' + (colIndex + 2) + '-' + (new Date).getTime(),
        width: dimensions.immColWidths.get(colIndex + 2),
        dataKey: colIndex + 2,
        flexGrow: 1,
        headerRenderer: this.headerRenderer,
        cellRenderer: this.cellRenderer.bind(null, immSortedUsers)
      });
    }, this).toJS();

    tableArgs.unshift({key: 'yutani-users-table',
                       className: 'yutani-users-table',
                       height: dimensions.tableHeight,
                       width: this.props.width - 30,
                       headerHeight: 100,
                       headerRenderer: this.headerRenderer,
                       rowHeight: 50,
                       rowsCount: this.props.immUsers.size,
                       rowGetter: function(index) { return tableRows[index]; },
                       rowClassNameGetter: this.rowClassNameGetter},
                      Column({label: 'All / None',
                              width: dimensions.immColWidths.get(0),
                              dataKey: 0,
                              fixed: true,
                              headerRenderer: this.headerRenderer,
                              cellRenderer: this.allNoneCellRenderer.bind(null, immSortedUsers)}),
                      Column({label: '-',
                              width: dimensions.immColWidths.get(1),
                              dataKey: 1,
                              fixed: true,
                              headerRenderer: this.headerRenderer}));

    return Table.apply(null, tableArgs);
  }
}

module.exports = YutaniUsersTable;
