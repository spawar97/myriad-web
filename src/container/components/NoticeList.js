var React = require('react');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ExposureAppConstants = require('../constants/ExposureAppConstants');
var Util = require('../util/util');

var div = DOM.div;
var span = DOM.span;

class NoticeList extends React.Component {
  static displayName = 'NoticeList';

  static propTypes = {
    immRows: PropTypes.instanceOf(Imm.List).isRequired,
    listHeader: PropTypes.string
  };

  state = {immOpenFolders: Imm.Set()};

  handleToggleFolder = (folderId) => {
    var immOpenFolders = this.state.immOpenFolders;
    this.setState({immOpenFolders: immOpenFolders.has(folderId) ? immOpenFolders.delete(folderId) : immOpenFolders.add(folderId)});
  };

  render() {
    var hasFolders = this.props.immRows.some(function(immRow) {
      return immRow.get('type') === ExposureAppConstants.FILE_TYPE_FOLDER && !immRow.get('associated', Imm.List()).isEmpty();
    });
    var immRows = this.props.immRows
      .map(function(immRow, rowIndex) {
        var id = immRow.get('id');
        var isFolder = immRow.get('type') === ExposureAppConstants.FILE_TYPE_FOLDER;
        var isFolderWithContents = isFolder && !immRow.get('associated', Imm.List()).isEmpty();
        var isOpenFolder = isFolderWithContents && this.state.immOpenFolders.has(id);
        var hasSubRows = immRow.has('associated') && (!isFolder || isOpenFolder);
        var immSubRows = hasSubRows ? immRow.get('associated')
          .map(function(immSubRow, subRowIndex) {
            return div({className: cx('notice-list-row-sub', 'virtual-table', {'with-folders': hasFolders}), key: subRowIndex},
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'}, span({className: cx('icon', 'type-icon', Util.getFileTypeIconName(immSubRow.get('type'), immSubRow.get('title')))})),
                div({className: cx('virtual-table-cell', 'text-cell')}, span({className: 'notice-list-row-sub-text'}, immSubRow.get('title')))));
          }) : null;
        // We check hasFolders to determine whether all rows need an extra spacing element (because of the opener of at least one folder).
        var openerCell = hasFolders ? div({className: cx('virtual-table-cell', 'opener-cell'), onClick: isFolder ? this.handleToggleFolder.bind(null, id) : null},
          span({className: cx({icon: isFolderWithContents, 'icon-arrow-right': isFolderWithContents, open: isOpenFolder, 'opener-placeholder': !isFolderWithContents})})) : null;
        return div({className: 'notice-list-row', key: rowIndex},
          div({className: cx('notice-list-row-main', 'virtual-table', {'row-disabled': hasSubRows && !isFolder})},
            div({className: 'virtual-table-row'},
              openerCell,
              div({className: 'virtual-table-cell'}, span({className: cx('icon', 'type-icon', Util.getFileTypeIconName(immRow.get('type'), immRow.get('title')))})),
              div({className: cx('virtual-table-cell', 'text-cell')}, span({className: 'notice-list-row-main-text'}, immRow.get('title'))))),
          immSubRows);
      }, this);

    return div({className: 'notice-list'},
      div({className: 'notice-list-header'}, this.props.listHeader),
      div({className: 'notice-list-rows'}, immRows));
  }
}

module.exports = NoticeList;
