var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
var Moment = require('moment');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('../Checkbox'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var AdminActions = require('../../actions/AdminActions');

var div = DOM.div;
var span = DOM.span;

class CurrentSchemaTable extends React.Component {
  static displayName = 'CurrentSchemaTable';

  static propTypes = {
    immComprehendSchemaMetadataList: PropTypes.instanceOf(Imm.List).isRequired
  };

  dateTimeFormat = (d, format) => {
    switch (format) {
      case 0:
        return _.isDate(d) ? Moment(d).format('MMM D, \'YY') : '-';
      case 1:
        return _.isDate(d) ? Moment(d).format('h:mma') : '';
    }
  };

  render() {
    var immRows = this.props.immComprehendSchemaMetadataList.map(function(immRow, i) {
      return div(
        {key: 'row-' + i, className: 'schema-table-row'},
        div({className: cx({'schema-locked': immRow.get('schemaLocked')})}),
        div(null, ItemOpener({onClick: AdminActions.toggleSchemaOpenState.bind(null, i), isOpen: immRow.get('isOpen')})),
        div(null, Checkbox({onClick: AdminActions.setCurrentSchema.bind(null, immRow.get('id')), checkedState: !!immRow.get('isSelected')}), span({}, immRow.get('schemaName'))),
        div(null, this.dateTimeFormat(immRow.get('createdDate'), 0), span({className: 'time'}, this.dateTimeFormat(immRow.get('createdDate'), 1))),
        div(null, this.dateTimeFormat(immRow.get('lastModifiedDate'), 0), span({className: 'time'}, this.dateTimeFormat(immRow.get('lastModifiedDate'), 1))),
        div(null, this.dateTimeFormat(immRow.get('lastActiveDate'), 0), span({className: 'time'}, this.dateTimeFormat(immRow.get('lastActiveDate'), 1))),
        div(null, immRow.get('assignedUsers')),
        div()
      );
    }, this).unshift(
      div({key: 'header', className: 'schema-table-header'},
        div(),
        div(),
        div(null, 'Name'),
        div(null, 'Created'),
        div(null, 'Last Modified'),
        div(null, 'Last Active'),
        div(null, 'Assigned Users'),
        div()
      ));
    return div({className: 'current-schema-table'}, immRows.toJS());
  }
}

module.exports = CurrentSchemaTable;
