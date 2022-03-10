let React = require('react');
let cx = require('classnames');
let Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

let ExposureSharingConstants = require('../../constants/ExposureSharingConstants');
let FrontendConstants = require('../../constants/FrontendConstants');
let Util = require('../../util/util');

let div = DOM.div;
let span = DOM.span;

class PrivilegeDropdown extends React.Component {
  static displayName = 'PrivilegeDropdown';

  static propTypes = {
    hidePrivilegeDropdown: PropTypes.func.isRequired,
    immPrivilegeDropdown: PropTypes.instanceOf(Imm.Map).isRequired,
    privilegeHandler: PropTypes.func.isRequired
  };

  render() {
    let editChecked = Util.hasPrivilegeCapability(this.props.immPrivilegeDropdown.get('edit'));
    let readChecked = !editChecked && Util.hasPrivilegeCapability(this.props.immPrivilegeDropdown.get('read'));
    let canGrantEdit = this.props.immPrivilegeDropdown.get('edit') === ExposureSharingConstants.NO_CAN_GRANT;
    let canRevokeEdit = this.props.immPrivilegeDropdown.get('edit') === ExposureSharingConstants.YES_CAN_REVOKE;
    let canGrantRead = this.props.immPrivilegeDropdown.get('read') === ExposureSharingConstants.NO_CAN_GRANT;
    let canRevokeRead = this.props.immPrivilegeDropdown.get('read') === ExposureSharingConstants.YES_CAN_REVOKE;
    let hasEditOption = editChecked || canGrantEdit;
    let hasRemoveAccess = (readChecked || editChecked) && canRevokeRead;

    // Note: The `onMouseDown` event of the dropdown options is wired up instead of
    // `onClick` because the DropdownList uses the `onBlur` event of the dropdown to hide
    // its dropdown list. The `onClick` event of a dropdown option will not fire before
    // the `onBlur` event of the dropdown whereas the `onMouseDown` event will.

    return div({className: 'privilege-dropdown-container'},
      div({className: 'privilege-dropdown-underlay', onClick: this.props.hidePrivilegeDropdown}),
      div({className: cx('privilege-dropdown', {'has-remove-access': hasRemoveAccess}), style: {top: this.props.immPrivilegeDropdown.get('top')}},
        div({className: 'virtual-table'},
          div({className: cx('virtual-table-row', 'read', {clickable: canGrantRead || canRevokeEdit}),
              onMouseDown: canGrantRead ? this.props.privilegeHandler.bind(null, ExposureSharingConstants.READ, true) :
                canRevokeEdit ? this.props.privilegeHandler.bind(null, ExposureSharingConstants.EDIT, false) : this.props.hidePrivilegeDropdown},
            div({className: cx('virtual-table-cell', 'icon-cell')}, readChecked ? div({className: 'icon icon-checkmark-full'}) : null),
            div({className: cx('virtual-table-cell', 'text-cell')}, FrontendConstants.PRIVILEGE_TYPE_VIEW)),
          hasEditOption ? div({className: cx('virtual-table-row', 'edit', {clickable: canGrantEdit}),
            onMouseDown: canGrantEdit ? this.props.privilegeHandler.bind(null, ExposureSharingConstants.EDIT, true) : this.props.hidePrivilegeDropdown},
            div({className: cx('virtual-table-cell', 'icon-cell')}, editChecked ? div({className: 'icon icon-checkmark-full'}) : null),
            div({className: cx('virtual-table-cell', 'text-cell')}, FrontendConstants.PRIVILEGE_TYPE_EDIT)) : null,
          hasRemoveAccess ? div({className: cx('virtual-table-row', 'spacer-row')}) : null,
          hasRemoveAccess ?
            div({className: cx('virtual-table-row', 'remove-access', 'clickable'), onMouseDown: this.props.privilegeHandler.bind(null, ExposureSharingConstants.READ, false)},
              div({className: cx('virtual-table-cell', 'icon-cell')}, span({className: 'icon icon-close'})),
              div({className: cx('virtual-table-cell', 'text-cell')}, FrontendConstants.REMOVE_ACCESS)) :
            null)));
  }
}

module.exports = PrivilegeDropdown;
