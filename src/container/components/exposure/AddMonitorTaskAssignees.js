var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var DataSelectorWithInput = React.createFactory(require('./DataSelectorWithInput'));
var Button = React.createFactory(require('../Button'));
var Combobox = React.createFactory(require('../Combobox'));
var InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
var GroupsAndUsersDropdownGroupComponent = React.createFactory(require('../GroupsAndUsersDropdownGroupComponent'));
var GroupsAndUsersDropdownItemComponent = React.createFactory(require('../GroupsAndUsersDropdownItemComponent'));
var ListItem = React.createFactory(require('../ListItem'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var ComboboxRenderers = require('../../util/ComboboxRenderers');

var Util = require('../../util/util');

var div = DOM.div;
var p = DOM.p;
var span = DOM.span;

class AddMonitorTaskAssignees extends React.Component {
  static displayName = 'AddMonitorTaskAssignee';

  static propTypes = {
    fileId: PropTypes.string.isRequired,
    handleCancel: PropTypes.func.isRequired,
    handleShowDataSelector: PropTypes.func.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  state = {
    conditionalFilter: null,
    immSelectedEntities: Imm.List(),
    showDataSelector: false,
    assigneeErrorMsg: null
  };

  selectEntityHandler = (entities) => {
    this.setState({
      immSelectedEntities: Imm.fromJS(entities),
      assigneeErrorMsg: null
    });
  };

  removeEntityHandler = (idx) => {
    this.setState({immSelectedEntities: this.state.immSelectedEntities.splice(idx, 1)});
  };

  showDataSelector = (showDataSelector) => {
    this.props.handleShowDataSelector(showDataSelector);
    this.setState({showDataSelector});
  };

  clearConditionalFilter = () => {
    this.setState({conditionalFilter: null});
  };

  save = () => {
    if (this.state.immSelectedEntities.isEmpty()) {
      this.setState({assigneeErrorMsg: FrontendConstants.REQUIRED_FIELD_ERROR_MESSAGE});
    } else {
      var fileId = this.props.fileId;
      var immExposureStore = this.props.immExposureStore;
      var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
      var immTaskAssignees = this.state.immSelectedEntities.map(immSelectedEntity => {
        var newAssignee = {
          entityId: immSelectedEntity.getIn(['entity', immSelectedEntity.get('entityType') === ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY ? 'userEntityId' : 'id']),
          rbacEntityType: immSelectedEntity.get('entityType')
        };

        if (this.state.conditionalFilter) {
          newAssignee.taskAssignmentFilter = this.state.conditionalFilter;
        }
        return Imm.Map(newAssignee);
      });

      // TODO: When an assignee has the same conditional filter with different formatting, it won't differentiate
      var immNewFile = immFile.updateIn(['monitor', 'taskConfig', 'taskAssignees'], Imm.List(), immOldAssignees => immOldAssignees.concat(immTaskAssignees).toSet()).setIn(['monitor', 'modificationNote'], 'Task assignees updated.');
      ExposureActions.updateFile(fileId, immNewFile);
      ExposureActions.closeModal();
      ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_ADDED_ASSIGNEES, StatusMessageTypeConstants.TOAST_SUCCESS);
    }
  };

  handleAddConditionalFilter = (filterValue) => {
    this.props.handleShowDataSelector(false);
    this.setState({
      conditionalFilter: filterValue,
      showDataSelector: false
    });
  };

  render() {
    var immEntities = Util.getSelectableUsersOrTeams(this.props.immExposureStore.get('groupEntities'), this.props.immExposureStore.get('users').filter(Util.immPluck('isSelectable')), this.props.immExposureStore.getIn(['userInfo', 'id']))
      // This is used by the Combobox so that each item has a unique key.
      .map(immEntity => immEntity.set('value', immEntity.getIn(['entity', 'username'], immEntity.getIn(['entity', 'name']))));

    var immMonitorFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
    var schemaId = immMonitorFile.getIn(['monitor', 'schemaId']);

    return this.state.showDataSelector ?
      DataSelectorWithInput({
        immExposureStore: this.props.immExposureStore,
        comprehendSchemaId: this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file', 'monitor', 'schemaId']),
        validateInput: ExposureActions.validateMonitorSelectionConditionColumnCql.bind(null, immMonitorFile, schemaId),
        nodeSelectionHandler: _.noop,
        inSelectableMode: false,
        noInteractions: true,
        handleAdd: this.handleAddConditionalFilter,
        handleCancel: this.showDataSelector.bind(this, false)
      }) :
      div(null,
        div({className: 'modal-dialog-content-text add-users-groups'}, FrontendConstants.ADD_USERS_AND_OR_TEAMS),
        div({className: 'virtual-table'},
          div({className: 'virtual-table-row'},
            div({className: 'virtual-table-cell'},
              InputBlockContainer({
                inputComponent: Combobox({
                  className: 'entity-dropdown',
                  abbreviationThreshold: 10,  // We are in a modal and are displaying full names, so this is a relatively low limit.
                  options: immEntities,
                  groupBy: 'entityType',
                  multi: true,
                  filterOption: ComboboxRenderers.filterUserAndGroupEntities,
                  optionRenderer: ComboboxRenderers.groupAndUserDropdownRenderer,
                  valueRenderer: ComboboxRenderers.groupAndUserValueRenderer,
                  passOnlyValueToChangeHandler: false,
                  onChange: this.selectEntityHandler,
                  placeholder: FrontendConstants.SHARING_TEAM_AND_USER_DROPDOWN_PLACEHOLDER,
                  value: this.state.immSelectedEntities
                }),
                errorMsg: this.state.assigneeErrorMsg
              })
            ))),
        div(null,
          div({className: 'modal-dialog-content-text add-filter'}, FrontendConstants.ADD_FILTER, span({className: 'optional'}, FrontendConstants.OPTIONAL_LOWER_CASE_WITH_PAREN)),
          p({className: 'add-filter-help-text'}, FrontendConstants.MONITOR_OWNER_TASK.PLEASE_NOTE, span({className: 'bold'}, FrontendConstants.MONITOR_OWNER_TASK.OWNER), FrontendConstants.MONITOR_OWNER_TASK.BECOMES_THE_ASSIGNEE),
          !this.state.conditionalFilter ? div({className: 'conditional-filter', onClick: this.showDataSelector.bind(null, true)},
            span({className: cx('icon', 'icon-plus-circle2')}),
            span({className: 'text-link'}, FrontendConstants.CONDITIONAL_FILTER)) :
            div({className: 'tag-container'}, ListItem({
              classnameSet: {'conditional-filter-tag': true},
              content: this.state.conditionalFilter,
              icon: 'icon-close-alt',
              onIconClick: this.clearConditionalFilter
            }))
        ),
        div({className: 'add-task-assignees-buttons'},
          Button({
            children: FrontendConstants.ADD,
            isPrimary: true,
            onClick: this.save}),
          Button({
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel}))
      );
  }
}

module.exports = AddMonitorTaskAssignees;
