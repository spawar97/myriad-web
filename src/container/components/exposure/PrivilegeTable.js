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
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
var PrivilegeDropdown = React.createFactory(require('./PrivilegeDropdown'));
var ShareIcon = React.createFactory(require('./ShareIcon'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var ExposureSharingConstants = require('../../constants/ExposureSharingConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');

var div = DOM.div;
var hr = DOM.hr;
var span = DOM.span;

var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

class PrivilegeTable extends React.Component {
  static displayName = 'PrivilegeTable';

  static propTypes = {
    canModify: PropTypes.bool.isRequired,
    height: PropTypes.number.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immFileConfig: PropTypes.instanceOf(Imm.Map).isRequired,
    immHeaderTextMap: PropTypes.shape({
      GROUP_ENTITY: PropTypes.string,
      USER_ENTITY: PropTypes.string
    }).isRequired,
    width: PropTypes.number.isRequired,
    // handleLoadEntityPrivileges, handleModification, and immPrivilegeModifications
    // are optional, only used when editing sharing (canModify = true).
    handleLoadEntityPrivileges: PropTypes.func,
    handleModification: PropTypes.func,
    // { USER_ENTITY -> { userId -> { read: GRANT, edit: REVOKE ...} ... }, GROUP_ENTITY -> { groupEntityId -> { read: GRANT, edit: REVOKE ...} }}
    immPrivilegeModifications: PropTypes.instanceOf(Imm.Map)
  };

  state = {
    tab: ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY,
    immGroupEntityList: null,  // Imm.List( Imm.Map ({entityPrivileges: immEntityPrivileges, groupEntity: immGroupEntity, users: immUsers }) ...)
    immUserList: null,  // Imm.List( Imm.Map ({entityPrivileges: immEntityPrivileges, user: immUser}) ...)
    immPrivilegeDropdown: null
  };

  componentDidMount() {
    // To increase portability of this component, we store immGroupEntityList and
    // immUserList in its state and optionally call a callback on the parent.
    ExposureActions.getPrivilegeCapabilities(this.props.immFileConfig.get('id'), immEntityPrivileges => {
      // We just want at the data, so use the identity function here.
      var immGroupedData = Util.parseAndGroupEntityPrivileges(this.props.immExposureStore, immEntityPrivileges, _.identity);
      var immUserList = immGroupedData.get(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY, Imm.List());
      var immGroupEntityList = immGroupedData.get(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY, Imm.List());
      // Move any owners to the end of the list - there should be one (and only one)
      // owner, however this technique ensures proper ordering if there happen to be
      // multiple owners.
      var immOwnerUserList = immUserList.filter(immUser => Util.hasPrivilegeCapability(immUser.getIn(['entityPrivileges', ExposureSharingConstants.OWNER, 'privilegeCapability'])));
      var immNonOwnerUserList = immUserList.filter(immUser => !Util.hasPrivilegeCapability(immUser.getIn(['entityPrivileges', ExposureSharingConstants.OWNER, 'privilegeCapability'])));
      var selfUserId = this.props.immExposureStore.getIn(['userInfo', 'id']);
      if (selfUserId) {
        var indexOfSelfInNonOwner = immNonOwnerUserList.findIndex(immUser => immUser.getIn(['user', 'id']) === selfUserId);
        if (indexOfSelfInNonOwner > -1) {
          // Move self to end of the list.
          immNonOwnerUserList = immNonOwnerUserList.splice(indexOfSelfInNonOwner, 1).push(immNonOwnerUserList.get(indexOfSelfInNonOwner).set('self', true));
        } else {
          // Retain order of owners (there **should** only be one).
          immOwnerUserList = immOwnerUserList.map(immUser => immUser.set('self', immUser.getIn(['user', 'id']) === selfUserId));
        }
      }
      this.setState({
        immGroupEntityList: immGroupEntityList,
        immUserList: immNonOwnerUserList.concat(immOwnerUserList)
      });
      if (_.isFunction(this.props.handleLoadEntityPrivileges)) {
        this.props.handleLoadEntityPrivileges(Imm.Map([
          [ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY, immUserList],
          [ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY, immGroupEntityList]
        ]));
      }
    });
  }

  elementForPrivs = (immEntityPrivileges) => {
    if (Util.hasPrivilegeCapability(this.determinePrivilegeCapabilityState(immEntityPrivileges, ExposureSharingConstants.OWNER))) {
      return [
        div({key: ExposureSharingConstants.OWNER, className: cx('virtual-table-cell', 'privilege-cell')},
          div({className: 'owner'}, FrontendConstants.OWNER.toUpperCase()))
      ];
    } else {
      var privs = [ExposureSharingConstants.READ, ExposureSharingConstants.EDIT];
      var privBooleanObject = _.reduce(privs, (memo, privilegeType) => {
        memo[privilegeType] = Util.hasPrivilegeCapability(this.determinePrivilegeCapabilityState(immEntityPrivileges, privilegeType));
        return memo;
      }, {});
      return [
        div({key: ExposureSharingConstants.READ, className: cx('virtual-table-cell', 'privilege-cell')},
          ShareIcon({type: ExposureSharingConstants.READ, class: cx({hidden: !privBooleanObject[ExposureSharingConstants.READ]})})),
        div({key: ExposureSharingConstants.EDIT, className: cx('virtual-table-cell', 'privilege-cell')},
          ShareIcon({type: ExposureSharingConstants.EDIT, class: cx({hidden: !privBooleanObject[ExposureSharingConstants.EDIT]})}))
      ];
    }
  };

  elementForTab = (tab) => {
    return div({
      className: cx('privilege-table-tab', {selected: this.state.tab === tab}),
      onClick: this.switchTab.bind(null, tab)
    }, FrontendConstants.SHARING_ENTITY_TYPE_DISPLAY_NAME(tab));
  };

  handleExpand = (rowIndex) => {
    // TODO: Expand groups to show users - note that it will require an update to
    // FixedDataTable 0.3.0+ since current version does not cleanly handle row height
    // changes.
    //this.setState({immGroupEntityList: this.state.immGroupEntityList.updateIn([rowIndex, 'expanded'], false, _.negate(_.identity))});
  };

  switchTab = (tab) => {
    this.setState({tab: tab, immPrivilegeDropdown: null});
  };

  /**
   * Determine the effective current state of a privilegeCapability based on the initial
   * privilegeCapability and the current privilegeRequest (which may have been modified
   * by the privilege dropdown checkboxes).
   */
  determinePrivilegeCapabilityState = (immEntityPrivileges, privilegeType, privilegeRequest) => {
    var privilegeCapability = immEntityPrivileges.getIn([privilegeType, 'privilegeCapability']);
    privilegeRequest = privilegeRequest || this.props.immPrivilegeModifications.getIn([immEntityPrivileges.get('entityType'), immEntityPrivileges.get('entityId'), privilegeType]);
    switch (privilegeCapability) {
      case ExposureSharingConstants.YES_CAN_REVOKE:
        return privilegeRequest === ExposureSharingConstants.REVOKE ? ExposureSharingConstants.NO_CAN_GRANT : privilegeCapability;
      case ExposureSharingConstants.NO_CAN_GRANT:
        return privilegeRequest === ExposureSharingConstants.GRANT ? ExposureSharingConstants.YES_CAN_REVOKE : privilegeCapability;
      default:
        return privilegeCapability;
    }
  };

  hasPrivilegeChecked = (privilegeType) => {
    return (privilegeType === ExposureSharingConstants.READ || this.hasPrivilegeChecked(ExposureSharingConstants.READ)) &&
      Util.hasPrivilegeCapability(this.state.immPrivilegeDropdown.get(privilegeType));
  };

  togglePrivilegeDropdown = (immCellData, e) => {
    // Position the dropdown 20 px below the top of the clicked chevron.
    var top = $(e.target).offset().top - $(ReactDOM.findDOMNode(this.refs['privilegeTableContainer'])).offset().top + 20;
    var immEntityPrivileges = immCellData.get('entityPrivileges');
    var read = this.determinePrivilegeCapabilityState(immEntityPrivileges, ExposureSharingConstants.READ);
    var edit = this.determinePrivilegeCapabilityState(immEntityPrivileges, ExposureSharingConstants.EDIT);
    this.setState({immPrivilegeDropdown: Imm.Map({cellData: immCellData, top, read, edit})});
  };

  hidePrivilegeDropdown = () => {
    this.setState({immPrivilegeDropdown: null});
  };

  privilegeHandler = (privilegeType, checkedState) => {
    if (_.isFunction(this.props.handleModification)) {
      var immCellData = this.state.immPrivilegeDropdown.get('cellData');
      var immEntityPrivileges = immCellData.get('entityPrivileges');
      var privilegeRequest = checkedState ? ExposureSharingConstants.GRANT : ExposureSharingConstants.REVOKE;
      var privilegeCapability = this.determinePrivilegeCapabilityState(immEntityPrivileges, privilegeType, privilegeRequest);
      var immPrivilegeModifications = this.props.immPrivilegeModifications;
      if (privilegeType === ExposureSharingConstants.READ && privilegeRequest === ExposureSharingConstants.REVOKE) {
        immPrivilegeModifications = immPrivilegeModifications.mergeIn([immEntityPrivileges.get('entityType'), immEntityPrivileges.get('entityId')],
          {read: privilegeRequest, edit: privilegeRequest});
        this.setState({
          immPrivilegeDropdown: this.state.immPrivilegeDropdown.merge({
            read: privilegeCapability,
            edit: this.determinePrivilegeCapabilityState(immEntityPrivileges, ExposureSharingConstants.EDIT, privilegeRequest)})
        });
      } else if (privilegeType === ExposureSharingConstants.EDIT && privilegeRequest === ExposureSharingConstants.GRANT) {
        immPrivilegeModifications = immPrivilegeModifications.mergeIn([immEntityPrivileges.get('entityType'), immEntityPrivileges.get('entityId')],
          {read: privilegeRequest, edit: privilegeRequest});
        this.setState({
          immPrivilegeDropdown: this.state.immPrivilegeDropdown.merge({
            read: this.determinePrivilegeCapabilityState(immEntityPrivileges, ExposureSharingConstants.READ, privilegeRequest),
            edit: privilegeCapability})
        });
      } else {
        immPrivilegeModifications = immPrivilegeModifications.setIn([immEntityPrivileges.get('entityType'), immEntityPrivileges.get('entityId'), privilegeType], privilegeRequest);
        this.setState({immPrivilegeDropdown: this.state.immPrivilegeDropdown.set(privilegeType, privilegeCapability)});
      }
      this.props.handleModification(immPrivilegeModifications);
      this.hidePrivilegeDropdown();  // TODO: Only close the dropdown when 'Remove all access' is clicked when there is more than just the READ privilege.
    }
  };

  render() {
    var tabs = div({className: 'privilege-table-tabs'},
      this.elementForTab(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY),
      this.elementForTab(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY)
    );

    var groupsAndUsersReady = this.state.immGroupEntityList && this.state.immUserList;

    var headerText, headerLabel, immData, userOrGroupRenderer, displayedTable;
    if (groupsAndUsersReady) {
      switch (this.state.tab) {
        case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
          headerText = this.props.immHeaderTextMap.get(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY);
          headerLabel = FrontendConstants.TEAM_NAME;
          immData = this.state.immGroupEntityList;
          userOrGroupRenderer = immCellData => {
            var groupName = immCellData.getIn(['groupEntity', 'name']);
            return div({className: 'virtual-table privileges-table'},
              div({className: 'virtual-table-row'},
                // TODO: Enable group expansion.
                //span({className: cx('icon', 'icon-arrow-right', {expanded: isExpanded}), onClick: this.handleExpand.bind(null, rowIndex)}),
                div({className: 'virtual-table-cell'},
                  span({className: cx('icon', 'icon-users')}),
                  span({className: cx('name', 'group-name')}, groupName)
                ),
                this.elementForPrivs(immCellData.get('entityPrivileges'))
              )
            );
          };
          break;
        case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
          headerText = this.props.immHeaderTextMap.get(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY);
          headerLabel = FrontendConstants.USER_NAME;
          immData = this.state.immUserList;
          userOrGroupRenderer = immCellData => {
            var self = immCellData.get('self', false);
            var userName = immCellData.getIn(['user', 'firstLastName']);
            var hasNoPrivileges = _.every([ExposureSharingConstants.READ, ExposureSharingConstants.EDIT],
              priv => !Util.hasPrivilegeCapability(this.determinePrivilegeCapabilityState(immCellData.get('entityPrivileges'), priv)));
            return div({className: 'virtual-table privileges-table'},
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'},
                  span({className: cx('name', 'user-name', {self: self, 'no-privileges': hasNoPrivileges})}, userName),
                  self ? span({className: 'self-subtext'}, FrontendConstants.SELF_SUBTEXT) : null
                ),
                this.elementForPrivs(immCellData.get('entityPrivileges'))
              )
            );
          };
          break;
      }

      // 36 + 1 for border-bottom.
      var defaultRowHeight = 37;
      var rowHeightGetter = index => defaultRowHeight * (immData.getIn([index, 'expanded'], false) ? (immData.getIn([index, 'users'], Imm.List()).size + 1) : 1);
      var headerHeight = defaultRowHeight;
      var totalHeight = immData.size * defaultRowHeight + headerHeight;
      var hasScrollbar = totalHeight > this.props.height;
      var scrollbarWidth = 17;
      var editWidth = 36 + (hasScrollbar ? scrollbarWidth : 0);
      var groupOrUserWidth = this.props.width - (this.props.canModify ? editWidth : 0);

      var groupOrUserColumn = Column({
        align: 'left',
        // TODO: See if we can use the 'label' prop after upgrading react fixed data table.
        headerRenderer: () => headerLabel,
        dataKey: 0,
        width: groupOrUserWidth,
        cellRenderer: userOrGroupRenderer
      });

      var editColumn = this.props.canModify ? Column({
        align: 'left',
        cellClassName: 'edit-cell',
        // TODO: See if we can use the 'label' prop after upgrading react fixed data table.
        headerRenderer: () => FrontendConstants.EDIT,
        dataKey: 0,
        width: editWidth,
        cellRenderer: immCellData => {
          var disabled = immCellData.get('self') ||
            Util.hasPrivilegeCapability(immCellData.getIn(['entityPrivileges', ExposureSharingConstants.OWNER, 'privilegeCapability'])) ||
            immCellData.getIn(['entityPrivileges', ExposureSharingConstants.EDIT, 'privilegeCapability']) === ExposureSharingConstants.YES_CANNOT_REVOKE;
          return span({
            className: cx('icon', 'icon-accordion-down', {disabled}),
            onClick: disabled ? null : this.togglePrivilegeDropdown.bind(null, immCellData)
          });
        }
      }) : null;

      var tableProps = {
        headerHeight,
        height: this.props.height,
        width: this.props.width,
        overflowX: 'auto',
        overflowY: 'auto',
        rowHeight: defaultRowHeight,
        rowHeightGetter,
        rowsCount: immData.size,
        rowGetter: index => [immData.get(index)]
      };

      var privilegeDropdown = this.state.immPrivilegeDropdown ?
        PrivilegeDropdown({
          hidePrivilegeDropdown: this.hidePrivilegeDropdown,
          immPrivilegeDropdown: this.state.immPrivilegeDropdown,
          privilegeHandler: this.privilegeHandler
        }) : null;

      displayedTable = div({ref: 'privilegeTableContainer', className: cx('fdt-container', {'has-scrollbar': hasScrollbar})},
        Table(tableProps, groupOrUserColumn, editColumn),
        privilegeDropdown
      );
    }

    var readyContent = span(null, headerText, displayedTable);

    var spinner = ContentPlaceholder();

    var content = groupsAndUsersReady ? readyContent : spinner;

    return div({className: cx('privilege-table')},
      tabs,
      hr({className: 'privilege-table-tab-separator'}),
      content
    );
  }
}

module.exports = PrivilegeTable;
