var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var DataSelectorWithInput = React.createFactory(require('./DataSelectorWithInput'));
var Button = React.createFactory(require('../Button'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var ModalConstants = require('../../constants/ModalConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var Util = require('../../util/util');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var li = DOM.li;
var p = DOM.p;
var ul = DOM.ul;
var span = React.createFactory(require('../TouchComponents').TouchSpan);

var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

class EditMonitorTaskAssignee extends React.Component {
  static displayName = 'EditMonitorTaskAssignee';

  static propTypes = {
    canModify: PropTypes.bool.isRequired,
    fileId: PropTypes.string.isRequired,
    handleCancel: PropTypes.func.isRequired,
    height: PropTypes.number.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired,
    handleShowDataSelector: PropTypes.func
  };

  state = {
    immActionsDropdown: null,
    immTaskAssignees: null,
    removedSomething: false,
    showDataSelector: false
  };

  componentWillMount() {
    var immTaskAssignees = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file', 'monitor', 'taskConfig', 'taskAssignees'], Imm.List());
    this.setState({immTaskAssignees});
  }

  update = () => {
    var immFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
    var immOriginalTaskAssignees = immFile.getIn(['monitor', 'taskConfig', 'taskAssignees']);

    // Nothing has changed here.
    if (Imm.is(immOriginalTaskAssignees, this.state.immTaskAssignees)) {
      return;
    }

    if (this.state.removedSomething) {
      ExposureActions.toggleDisplayWarningModal({
        headerText: FrontendConstants.ARE_YOU_SURE,
        primaryButtonAction: () => {
          this.updateFile();
          ExposureActions.toggleDisplayWarningModal();
        },
        primaryButtonText: FrontendConstants.CONTINUE,
        secondaryButtonAction: ExposureActions.toggleDisplayWarningModal,
        secondaryButtonText: FrontendConstants.CANCEL,
        warningText: div({className: 'task-assignee-update-warning-content'},
          span({className: 'warning-header'}, FrontendConstants.THE_FOLLOWING_ACTIONS_ARE_IRREVERSIBLE),
          ul(null,
            li(null, FrontendConstants.DELETING_CONDITIONAL_FILTERS),
            li(null, FrontendConstants.REMOVING_ASSIGNEES)
          ),
          FrontendConstants.PLEASE_CONFIRM_YOU_WOULD_LIKE_TO_CONTINUE
        )
      });
    } else {
      this.updateFile();
    }
  };

  updateFile = () => {
    var fileId = this.props.fileId;
    var immExposureStore = this.props.immExposureStore;
    var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    var immTaskAssignees = this.state.immTaskAssignees.filter(immTaskAssignee => !immTaskAssignee.get('removed')).toSet().toList();

    var immNewFile = immFile.setIn(['monitor', 'taskConfig', 'taskAssignees'], immTaskAssignees);
    // TODO: modification note?
    immNewFile = immNewFile.setIn(['monitor', 'modificationNote'], 'Task assignees updated.');
    ExposureActions.updateFile(fileId, immNewFile);
    ExposureActions.closeModal();
    ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_UPDATED_THE_ASSIGNEES_LIST, StatusMessageTypeConstants.TOAST_SUCCESS);
  };

  showActionsDropdown = (immTaskAssignee, e) => {
    // Position the dropdown 20 px below the top of the clicked chevron.
    var top = $(e.target).offset().top - $(ReactDOM.findDOMNode(this.refs['AssigneeTableContainer'])).offset().top + 20;
    this.setState({immActionsDropdown: Imm.Map({immTaskAssignee: immTaskAssignee, top: top})});
  };

  showDataSelector = (showDataSelector, isEditingFilter) => {
    this.props.handleShowDataSelector(showDataSelector, isEditingFilter);
    this.setState({showDataSelector});
  };

  handleAddConditionalFilter = (index, filterValue) => {
    this.props.handleShowDataSelector(false);
    this.setState({
      immTaskAssignees: this.state.immTaskAssignees.setIn([index, 'taskAssignmentFilter'], filterValue),
      showDataSelector: false
    });
    this.hideActionsDropdown();
  };

  handleAddConditionalFilterCancel = () => {
    this.showDataSelector(false);
    this.hideActionsDropdown();
  };

  handleRemoveFilter = (index) => {
    this.setState({
      immTaskAssignees: this.state.immTaskAssignees.deleteIn([index, 'taskAssignmentFilter']),
      removedSomething: true
    });
  };

  handleRemoveTaskAssignee = (selectedIndex) => {
    var immTaskAssignees = this.state.immTaskAssignees;
    this.setState({
      immTaskAssignees: immTaskAssignees.setIn([selectedIndex, 'removed'], true),
      removedSomething: true
    });
    this.hideActionsDropdown();
  };

  hideActionsDropdown = () => {
    this.setState({immActionsDropdown: null});
  };

  render() {
    var immExposureStore = this.props.immExposureStore;
    var content;

    if (this.state.showDataSelector) {
      var immMonitorFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
      var schemaId = immMonitorFile.getIn(['monitor', 'schemaId']);
      var index = this.state.immActionsDropdown.getIn(['immTaskAssignee', 'index']);
      content = DataSelectorWithInput({
        immExposureStore,
        comprehendSchemaId: schemaId,
        validateInput: ExposureActions.validateMonitorSelectionConditionColumnCql.bind(null, immMonitorFile, schemaId),
        nodeSelectionHandler: _.noop,
        inSelectableMode: false,
        noInteractions: true,
        handleAdd: this.handleAddConditionalFilter.bind(null, index),
        handleCancel: this.handleAddConditionalFilterCancel,
        defaultValue: this.state.immActionsDropdown.getIn(['immTaskAssignee', 'taskAssignmentFilter'])
      });
    } else {
      // Create the owner.
      var immOwnerAssignee = Imm.fromJS({
        entityId: immExposureStore.get('userEntities').filter(userId => userId === comprehend.globals.currentUserId).keySeq().get(0),
        rbacEntityType: ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY,
        self: true
      });
      var immTaskAssignees = this.state.immTaskAssignees.push(immOwnerAssignee);

      var headerText = p({className: 'manage-assignee-help-text'}, FrontendConstants.MONITOR_OWNER_TASK.PLEASE_NOTE, span({className: 'bold'}, FrontendConstants.MONITOR_OWNER_TASK.OWNER), FrontendConstants.MONITOR_OWNER_TASK.BECOMES_THE_ASSIGNEE);
      var headerLabel = FrontendConstants.TASK_ASSIGNEES;

      var assigneeRenderer = immTaskAssignee => {
        var entityId = immTaskAssignee.get('entityId');
        var entityType = immTaskAssignee.get('rbacEntityType');
        var filter = immTaskAssignee.get('taskAssignmentFilter');
        var removed = immTaskAssignee.get('removed');

        var name;
        switch (entityType) {
          case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
            var userId = immExposureStore.getIn(['userEntities', entityId]);
            var immUser = immExposureStore.getIn(['users', userId]);
            name = immUser.get('fullName');
            break;
          case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
            name = immExposureStore.getIn(['groupEntities', entityId, 'name']);
            break;
        }

        return div({className: cx('virtual-table', 'assignees-table', {removed})},
          div({className: 'virtual-table-row'},
            div({className: 'virtual-table-cell'},
              entityType === ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY ? span({className: cx('icon', 'icon-users')}) : null,
              div({className: 'name'}, immTaskAssignee.get('self') ? div({className: 'owner-tag'}, FrontendConstants.OWNER.toUpperCase()) : null, name),
              filter ? div({className: 'filter'},
                filter,
                span({className: cx('icon-close-alt', {disabled: removed}), onClick: removed ? _.noop : this.handleRemoveFilter.bind(null, immTaskAssignee.get('index'))})
              ) : null
            )
          )
        );
      };

      // 36 + 1 for border-bottom.
      var defaultRowHeight = 37;
      var defaultFilterHeight = 45;
      var rowHeightGetter = index => {
        var filter = this.state.immTaskAssignees.getIn([index, 'taskAssignmentFilter']);
        return defaultRowHeight + (filter ? defaultRowHeight : 0);
      };
      var headerHeight = defaultRowHeight;
      var totalHeight = immTaskAssignees.size * defaultRowHeight
        + immTaskAssignees.filter(Util.immPluck('taskAssignmentFilter')).size * defaultFilterHeight
        + headerHeight;
      var hasScrollbar = totalHeight > this.props.height;
      var scrollbarWidth = 17;
      var editWidth = 36 + (hasScrollbar ? scrollbarWidth : 0);
      var groupOrUserWidth = this.props.width - (this.props.canModify ? editWidth : 0);

      var assigneeColumn = Column({
        align: 'left',
        headerRenderer: () =>  headerLabel,
        dataKey: 0,
        width: groupOrUserWidth,
        cellRenderer: assigneeRenderer
      });

      var editColumn = this.props.canModify ? Column({
        align: 'left',
        cellClassName: 'edit-cell',
        dataKey: 0,
        width: editWidth,
        cellRenderer: immCellData => {
          var disabled = immCellData.get('removed') || immCellData.get('self');
          return span({
            className: cx('icon', 'icon-accordion-down', {disabled}),
            onClick: disabled ? _.noop : this.showActionsDropdown.bind(null, immCellData)
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
        rowsCount: immTaskAssignees.size,
        rowGetter: index => [immTaskAssignees.get(index).set('index', index)]
      };

      var actionsDropdown;
      if (this.state.immActionsDropdown) {
        var immActionsDropdown = this.state.immActionsDropdown;
        var hasFilter = !!immActionsDropdown.getIn(['immTaskAssignee', 'taskAssignmentFilter']);
        actionsDropdown = div({className: 'actions-dropdown-container'},
          div({className: 'actions-dropdown-underlay', onClick: this.hideActionsDropdown}),
          div({className: 'actions-dropdown', style: {top: immActionsDropdown.get('top')}},
            div({
              className: cx('option', 'add-edit-filter', 'icon-plus-circle2'),
              onClick: this.showDataSelector.bind(null, true, hasFilter)
            }, hasFilter ? FrontendConstants.EDIT_FILTER : FrontendConstants.ADD_FILTER),
            div({
              className: cx('option', 'remove-assignee', 'icon-close'),
              onClick: this.handleRemoveTaskAssignee.bind(null, this.state.immActionsDropdown.getIn(['immTaskAssignee', 'index']))
            }, FrontendConstants.REMOVE_ASSIGNEE)
          )
        );
      }

      var displayedTable = div({
          ref: 'AssigneeTableContainer',
          className: cx('fdt-container', {'has-scrollbar': hasScrollbar})
        },
        Table(tableProps, assigneeColumn, editColumn),
        actionsDropdown
      );

      content = div(null,
        span(null, headerText, displayedTable),
        div({className: 'edit-task-assignees-buttons'},
        Button({
          children: FrontendConstants.UPDATE,
          isPrimary: true,
          onClick: this.update}),
        Button({
          children: FrontendConstants.CANCEL,
          isSecondary: true,
          onClick: this.props.handleCancel}))
      );
    }

    return div({className: 'edit-task-assignee-table'}, content);
  }
}

module.exports = EditMonitorTaskAssignee;
