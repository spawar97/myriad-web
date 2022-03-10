var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');

var blueimp = require('imports-loader?additionalCode=var%20define%20=%20false!blueimp-file-upload');  // http://webpack.github.io/docs/shimming-modules.html#disable-some-module-styles

import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import DataReviewActions from "../actions/DataReviewActions";
import ModalDialogContentExtended from "./ModalDialogContentExtended";

var AdminRadioItem = React.createFactory(require('./AdminRadioItem'));
var Button = React.createFactory(require('./Button'));
var Combobox = React.createFactory(require('./Combobox'));
var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var NoticeList = React.createFactory(require('./NoticeList'));
var SchemaTreeView = React.createFactory(require('./SchemaTreeView'));
var AddMonitorTaskAssignees = React.createFactory(require('./exposure/AddMonitorTaskAssignees'));
var ContactAdmin = React.createFactory(require('./exposure/ContactAdmin'));
var DataSelector = React.createFactory(require('./exposure/DataSelector'));
var EditMonitorTaskAssignee = React.createFactory(require('./exposure/EditMonitorTaskAssignee'));
var FileTitle = React.createFactory(require('./exposure/FileTitle'));
var PrivilegeTable = React.createFactory(require('./exposure/PrivilegeTable'));
var AdminActions = require('../actions/AdminActions');
var ExposureActions = require('../actions/ExposureActions');
var BatchEditConstants = require('../constants/BatchEditConstants');
var DataTypeConstants = require('../constants/DataTypeConstants');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var ExposureSharingConstants = require('../constants/ExposureSharingConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var HttpResponseConstants = require('../constants/HttpResponseConstants');
var ModalConstants = require('../constants/ModalConstants');
var ComprehendSchemaUtil = require('../util/ComprehendSchemaUtil');
var GA = require('../util/GoogleAnalytics');
var ComboboxRenderers = require('../util/ComboboxRenderers');
var Util = require('../util/util');
var UserInput = require('../util/UserInput');

var a = DOM.a;
var div = React.createFactory(require('./TouchComponents').TouchDiv);
var hr = DOM.hr;
var input = DOM.input;
var li = DOM.li;
var span = React.createFactory(require('./TouchComponents').TouchSpan);
var ul = DOM.ul;

const PRIVILEGE_OPTIONS = Imm.fromJS([
  {value: FrontendConstants.PRIVILEGE_TYPE_VIEW, label: FrontendConstants.PRIVILEGE_TYPE_VIEW},
  {value: FrontendConstants.PRIVILEGE_TYPE_EDIT, label: FrontendConstants.PRIVILEGE_TYPE_EDIT}
]);

var CheckAllUniquenessTableRow = React.createFactory(class extends React.Component {
  static displayName = 'CheckAllUniquenessTableRow';

  static propTypes = {
    status: PropTypes.string,
    text: PropTypes.string
  };

  render() {
    var iconName;
    // Display icons based on the status of the Table Uniqueness.
    switch (this.props.status) {
      case 'Verified':
        iconName = 'icon icon-checkmark-full';
        break;
      case 'Invalid':
        iconName = 'icon icon-close-alt';
        break;
      case 'being checked...':
      case 'Unchecked':
      default:
        iconName = 'icon icon-circle2';
        break;
    }
    return div({className: 'uniqueness-row', key: this.props.text}, span({className: iconName}), span({className: 'uniqueness-text'}, this.props.text));
  }
});

var ModalDialogContent = {
  AddSessionFilters: class extends React.Component {
    static displayName = 'AddSessionFilters';

    static propTypes = {
      fileId: PropTypes.string.isRequired,
      comprehendSchemaId: PropTypes.string.isRequired,
      handleCancel: PropTypes.func.isRequired,
      immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
      drilldownId: PropTypes.string,
      sessionFilterCqlParseValid: PropTypes.bool
    };

    static defaultProps = {
      sessionFilterCqlParseValid: true
    };

    state = {
      firstRender: true,
      cqlMode: false,
      selectedNode: null
    };

    componentWillMount() {
      this.props.setIsLarger(true);
    }

    componentDidUpdate() {
      if (this.state.cqlMode) {
        ReactDOM.findDOMNode(this.refs['cqlSessionFilterInput']).focus();
      }
    }

    handleAddCqlFilter = () => {
      var cql = this.state.cqlMode ?
        ReactDOM.findDOMNode(this.refs['cqlSessionFilterInput']).value.trim() :
        this.state.selectedNode;
      if (!_.isEmpty(cql)) {
        ExposureActions.validateCqlSessionFilter(cql, this.props.fileId, this.props.comprehendSchemaId, this.props.drilldownId, {addToCookie: true});
      }
    };

    toggleCqlMode = () => {
      this.setState({cqlMode: !this.state.cqlMode, selectedNode: null});
    };

    validateCqlFilter = (e) => {
      if (this.state.cqlMode) {
        var filterText = e.target.value.trim();
        if (!_.isEmpty(filterText)) {
          ExposureActions.validateCqlSessionFilter(filterText, this.props.fileId, this.props.comprehendSchemaId, this.props.drilldownId);
          this.setState({firstRender: false});
        }
      }
    };

    handleNodeSelection = (selectedNode) => {
      this.setState({selectedNode: selectedNode});
    };

    render() {
      var cqlContent = div({className: 'cql-content'},
        this.state.cqlMode ?
          div({className: 'cql-textbox'},
            span({className: 'cql-textbox-prefix'}, FrontendConstants.FILTER),
            InputBlockContainer({
              inputComponent: InputWithPlaceholder({
                key: 'cql-session-filter',
                type: 'text',
                ref: 'cqlSessionFilterInput',
                className: 'text-input',
                onChange: this.props.handleUpdateTitle,
                onBlur: this.validateCqlFilter,
                placeholder: FrontendConstants.ENTER_CQL,
                defaultValue: '',
                maxLength: ExposureAppConstants.FILTER_CQL_MAX_LENGTH
              })
            }),
            (!this.state.firstRender && !this.props.sessionFilterCqlParseValid) ? span({className: 'cql-validation-error-message'}, FrontendConstants.INVALID_CQL) : null
          ) : null,
        span({className: 'cql-mode-toggle-string', onClick: this.toggleCqlMode}, this.state.cqlMode ? FrontendConstants.FILTER_MODE_CQL : FrontendConstants.FILTER_MODE_DATA_PICKER)
      );

      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, FrontendConstants.ADD_NEW_SESSION_FILTER)),
        div({className: 'modal-dialog-main'},
          DataSelector({
            immExposureStore: this.props.immExposureStore,
            comprehendSchemaId: this.props.comprehendSchemaId,
            nodeSelectionHandler: this.handleNodeSelection,
            inSelectableMode: !this.state.cqlMode
          }),
          cqlContent),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.ADD_FILTER,
            isPrimary: true,
            onClick: this.handleAddCqlFilter}
          ),
          Button({
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel}
          )
        )
      );
    }
  },

  BatchEditColumnDataType: class extends React.Component {
    static displayName = 'BatchEditColumnDatatype';

    static propTypes = {
      columnCount: PropTypes.number.isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    state = {selectedDataType: null};

    handleBatchUpdate = () => {
      var statusMessage = 'Status update: ' + this.props.columnCount  + " columns' datatype has changed";
      AdminActions.batchEdit(BatchEditConstants.BATCH_EDIT_COLUMN_MODIFY_DATATYPE, this.state.selectedDataType, statusMessage);
    };

    handleTypeRadioClick = (type) => {
      this.setState({selectedDataType: type});
    };

    render() {
      var isTypeSelected = !_.isNull(this.state.selectedDataType);
      var radioItems = _.map(DataTypeConstants, function(type) {
        return AdminRadioItem({displayText: type,
                               key: type,
                               selected: this.state.selectedDataType === type,
                               handleClick: this.handleTypeRadioClick.bind(null, type)});
      }, this);

      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-edit'}), span({className: 'modal-dialog-header-text'}, 'BATCH EDIT: CHANGE DATATYPE')),
        div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, 'Change the datatype of the ' + this.props.columnCount + ' selected column' + (this.props.columnCount > 1 ? 's ' : ' ') + 'to:')),
        div({className: 'modal-radio-items'}, radioItems),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-loop2',
            children: FrontendConstants.UPDATE,
            isPrimary: isTypeSelected,
            isDisabled: !isTypeSelected,
            onClick: isTypeSelected ? this.handleBatchUpdate : null}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  BatchEditColumns: class extends React.Component {
    static displayName = 'BatchEditColumns';

    static propTypes = {
      attributeChanged: PropTypes.string.isRequired,
      changeCount: PropTypes.shape({
        totalColumns: PropTypes.number.isRequired,
        totalUnaffected: PropTypes.number.isRequired
      }).isRequired,
      newAttributeState: PropTypes.bool.isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    handleBatchUpdate = (statusMessage) => {
      AdminActions.batchEdit(this.props.attributeChanged, this.props.newAttributeState, statusMessage);
    };

    render() {
      var totalColumns = this.props.changeCount.totalColumns;
      var totalUnaffected = this.props.changeCount.totalUnaffected;
      var attrText,
          changeNotice,
          nullEffectNotice,
          statusMessage;

      switch(this.props.attributeChanged) {
        case BatchEditConstants.BATCH_EDIT_COLUMN_VISIBILITY:
          attrText = this.props.newAttributeState ? 'invisible' : 'visible';
          changeNotice = div({className: 'modal-dialog-main'},
                             span({className: 'modal-dialog-content-text'}, 'You are about to set ' + totalColumns + ' selected column' + (totalColumns > 1 ? 's ' : ' ') + 'as ' + attrText + '.'));
          nullEffectNotice = totalUnaffected > 0 ?
            div({className: 'modal-dialog-main'},
                span({className: 'icon icon-info'},
                     totalUnaffected + ' column' + (totalUnaffected > 1 ? 's are' : ' is') + ' already ' + attrText + ', and will remain ' + attrText + ' after you update.'))
            : null;
          statusMessage = 'Status update: ' + totalColumns + ' columns have been set as ' + attrText;
          break;
        case BatchEditConstants.BATCH_EDIT_COLUMN_UNIQUENESS:
          attrText = this.props.newAttributeState ? 'unique' : 'remove unique';
          changeNotice = this.props.newAttributeState ?
            div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, 'You are about to set ' + totalColumns + ' selected column' + (totalColumns > 1 ? 's ' : ' ') + 'as unique.')) :
            div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, 'You are about to remove ' + totalColumns + ' columns' + (totalColumns > 1 ? '\' ' : ' ') + 'uniqueness.'));
          var nullEffectAttrText = this.props.newAttributeState ? 'unique' : 'non-unique';
          nullEffectNotice = totalUnaffected > 0 ?
            div({className: 'modal-dialog-main'},
                span({className: 'icon icon-info'},
                     totalUnaffected + ' column' + (totalUnaffected > 1 ? 's are' : ' is') + ' already ' + nullEffectAttrText+ ', and will remain ' + nullEffectAttrText + ' after you update.'))
            : null;
          statusMessage = 'Status update: ' + totalColumns + (this.props.newAttributeState ? ' columns have been set as unique.' : ' columns\' uniqueness have been removed.');
          break;
      }

      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-edit'}), span({className: 'modal-dialog-header-text'},'BATCH EDIT: SET AS ' + attrText.toUpperCase())),
        changeNotice,
        nullEffectNotice,
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-loop2',
            children: FrontendConstants.UPDATE,
            isPrimary: true,
            onClick: this.handleBatchUpdate.bind(null, statusMessage)}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  BatchEditRename: class extends React.Component {
    static displayName = 'BatchEditRename';

    static propTypes = {
      columnCount: PropTypes.number.isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    state = {error: false};

    handleInputClick = () => {
      this.setState({error: false});
    };

    handleUpdate = () => {
      // We sanitize user input outside of AdminStore to provide immediate feedback to the user.
      // UserInput.sanitizeName will return null if user input is not acceptable.
      var statusMessage = 'Status update: ' + this.props.columnCount + ' columns have been renamed.';
      var sanitizedLongName = UserInput.sanitizeName(ReactDOM.findDOMNode(this.refs['batch-edit-rename-input']).value);
      if (_.isNull(sanitizedLongName)) {
        this.setState({error: true});
      } else {
        AdminActions.batchEdit(BatchEditConstants.BATCH_EDIT_COLUMN_RENAME, sanitizedLongName, statusMessage);
      }
    };

    render() {
      var error = this.state.error ?
        span({className: 'modal-dialog-error',
             ref: 'batch-edit-long-name-error'},
             'Input is not valid') : null;
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-edit'}), span({className: 'modal-dialog-header-text'}, 'BATCH EDIT: RENAME')),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, 'You are about to rename ' + this.props.columnCount + ' selected columns to:'),
          InputWithPlaceholder({
            onClick: this.handleInputClick,
            ref: 'batch-edit-rename-input',
            placeholder: 'New column name (required)'})),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-loop2',
            children: FrontendConstants.UPDATE,
            isPrimary: true,
            onClick: this.handleUpdate}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel}),
          error
        ));
    }
  },

  DeleteDataAccessGroup: class extends React.Component {
    static displayName = 'DeleteDataAccessGroup';
    static propTypes = {
      callback: PropTypes.func.isRequired,
      handleCancel: PropTypes.func.isRequired,
      immDataAccessGroups: PropTypes.instanceOf(Imm.List).isRequired
    };

    render() {
      const { immDataAccessGroups, handleCancel, callback } = this.props;
      const dataAccessGroupsList = ul({className:'deleted-items-list'},
          immDataAccessGroups.map(function(dataAccessGroup, idx) {
            return li({key:`delete-data-acccess-group-${idx}`, className: 'deleted-item'},
              dataAccessGroup.get('dataAccessProfileName')
            );
          }));

      return (
        div(null,
          div({className:'modal-dialog-header'},
            span({className:'modal-dialog-header-text'},
              FrontendConstants.ARE_YOU_SURE
            )
          ),
          div({className:cx('modal-dialog-main', 'modal-dialog-delete-item')},
            dataAccessGroupsList,
            div({className:'modal-dialog-delete-action'},
              span(null, FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE),
              span({className:'modal-dialog-delete-emphasis'}, FrontendConstants.PLEASE_CONFIRM_DELETE)
            )
          ),
          div({className:'modal-dialog-footer'},
            Button({
              icon: 'icon icon-remove',
              isPrimary: true,
              onClick: AdminActions.deleteDataAccessGroups.bind(null, immDataAccessGroups, true, callback)},
              FrontendConstants.DELETE),
            Button({
              isSecondary: true,
              onClick: handleCancel},
              FrontendConstants.CANCEL)
          )
        )
      );
    }
  },


  DeleteDataReviewRole: class extends React.Component {
    static displayName = 'DeleteDataReviewRole';
    static propTypes = {
      callback: PropTypes.func.isRequired,
      handleCancel: PropTypes.func.isRequired,
      immDataReviewRoles: PropTypes.instanceOf(Imm.List).isRequired
    };

    render() {
      const { immDataReviewRoles, handleCancel, callback } = this.props;
      const dataReviewRolesList = ul({className:'deleted-items-list'},
        immDataReviewRoles.map((dataReviewRole, idx) => {
          return li({key:`delete-data-review-role-${idx}`, className: 'deleted-item'},
            dataReviewRole.get('name')
          );
        }));

      return (
        div(null,
          div({className:'modal-dialog-header'},
            span({className:'modal-dialog-header-text'},
              FrontendConstants.ARE_YOU_SURE
            )
          ),
          div({className:cx('modal-dialog-main', 'modal-dialog-delete-item')},
            dataReviewRolesList,
            div({className:'modal-dialog-delete-action'},
              span(null, FrontendConstants.DELETE_ACTION_IS_IRREVERSIBLE),
              span({className:'modal-dialog-delete-emphasis'}, FrontendConstants.PLEASE_CONFIRM_DELETE)
            )
          ),
          div({className:'modal-dialog-footer'},
            Button({
                icon: 'icon icon-remove',
                isPrimary: true,
                onClick: DataReviewActions.deleteDataReviewRoles.bind(null, immDataReviewRoles, true, callback)},
              FrontendConstants.DELETE),
            Button({
                isSecondary: true,
                onClick: handleCancel},
              FrontendConstants.CANCEL)
          )
        )
      );
    }
  },

  Success: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      message: PropTypes.string.isRequired
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, FrontendConstants.SUCCESS)),
        div({className: 'modal-dialog-main'}, span({className: cx('icon', 'icon-checkmark-full')}), this.props.message),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.DONE,
            isPrimary: true,
            onClick: this.props.handleCancel})
        ));
    }
  },

  DeleteWarning: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      content: PropTypes.string,
      header: PropTypes.string,
      discardFunc: PropTypes.func.isRequired
    };

    static defaultProps = {
      header: 'Confirm Delete?',
      content: "If you delete, the data of the current entry will be lost."
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-WarningCircle'}), span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, this.props.content)),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon',
            children: FrontendConstants.CANCEL,
            isPrimary: true,
            onClick: this.props.handleCancel}),
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.DELETE,
            isSecondary: true,
            onClick: this.props.discardFunc})));
    }
  },

  UnsavedWarning: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      content: PropTypes.string,
      header: PropTypes.string,
      discardFunc: PropTypes.func.isRequired
    };

    static defaultProps = {
      header: 'Save Changes Before Closing?',
      content: "If you don't save, the changes you made on the current tab will be lost."
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-WarningCircle'}), span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, this.props.content)),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-arrow-left2',
            children: FrontendConstants.GO_BACK,
            isPrimary: true,
            onClick: this.props.handleCancel}),
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.DISCARD,
            isSecondary: true,
            onClick: this.props.discardFunc})));
    }
  },

  UncheckTableWarning: class extends React.Component {
    static propTypes = {
      doUncheck: PropTypes.func,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-WarningCircle'}), span({className: 'modal-dialog-header-text'}, 'Erase table settings?')),
        div({className: 'modal-dialog-main'}, div({className: 'modal-dialog-content-text'}, 'If you uncheck this table, you will erase all settings you made in this table when you save. Alternatively, you can set a table as invisible to keep the settings and hide it from end users.'),
                                              div({className: 'modal-dialog-content-text'}, 'This action cannot be undone.')),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-plus-circle2',
            children: FrontendConstants.YES_ERASE_SETTINGS,
            isPrimary: true,
            onClick: this.props.doUncheck}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL_KEEP_SETTINGS,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  ViewColumnEdges: class extends React.Component {
    static propTypes = {
      colLongName: PropTypes.string.isRequired,
      colShortName: PropTypes.string.isRequired,
      tableLongName: PropTypes.string.isRequired,
      tableShortName: PropTypes.string.isRequired,
      edges: PropTypes.arrayOf(PropTypes.shape({
        colLongName: PropTypes.string,
        colShortName: PropTypes.string,
        tableLongName: PropTypes.string,
        tableShortName: PropTypes.string
      })),
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    handleButtonClick = () => {
      AdminActions.displayModal(ModalConstants.MODAL_EDIT_COLUMN_EDGES, this.props);
    };

    render() {
      var edgeList = _.map(this.props.edges, function(edge, idx) {
        return div({className: 'edge-wrapper', key: idx}, div({className: 'edge'},
                   span({className: 'edge-table-long-name'}, edge.tableLongName),
                   span({className: 'edge-column-long-name'}, edge.colLongName),
                   span({className: 'edge-short-names'}, '(' + edge.tableShortName + '.' + edge.colShortName + ')')));
      });
      return div(null,
        div({className: 'modal-dialog-header underline'}, span(null, 'EDIT CHILDREN')),
        div({className: 'modal-dialog-main'},
            div({className: 'edge'},
                span({className: 'edge-table-long-name'}, this.props.tableLongName),
                span({className: 'edge-column-long-name'}, this.props.colLongName),
                span({className: 'edge-short-names'}, '(' + this.props.tableShortName + '.' + this.props.colShortName + ')'),
                span({className: 'icon-arrow-right-circle-full'})),
            // 250 is the padding for top and bottom of the modal.
            div({className: 'edges', style: {maxHeight: window.innerHeight - 250}}, edgeList)),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-plus-circle2',
            children: _.isEmpty(this.props.edges) ? FrontendConstants.ADD_CHILDREN : FrontendConstants.EDIT_CHILDREN,
            isPrimary: true,
            onClick: this.handleButtonClick}),
          _.isEmpty(this.props.edges) ? div(null, span(null, 'No child yet. Add one now?')) : null)
      );
    }
  },

  EditColumnEdges: class extends React.Component {
    static propTypes = {
      colLongName: PropTypes.string.isRequired,
      colShortName: PropTypes.string.isRequired,
      immInitialDatasources: PropTypes.instanceOf(Imm.Map).isRequired,
      tableLongName: PropTypes.string.isRequired,
      tableShortName: PropTypes.string.isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    state = {
      immDatasources: this.props.immInitialDatasources,
      immTvSearchState: Imm.fromJS({
        isTvSearchByTable: false,
        searchField: 'Long & Short Name',
        tvExcludedDataSources: [],
        tvResultCounts: [0, 0, 0],
        tvShowAllTreeItems: true
      })
    };

    handleCheckboxState = (immNodePath, newState) => {
      var path = Imm.List([immNodePath.get(0), 'tables', immNodePath.get(1), 'columns', immNodePath.get(2), 'checkboxState']);
      this.setState({immDatasources: this.state.immDatasources.setIn(path, newState)});
    };

    handleExpand = (immNodePath, newState) => {
      var path = Imm.List([immNodePath.get(0)]);
      if (immNodePath.size > 1) {
        path = path.push('tables', immNodePath.get(1));
      }
      path = path.push('expanded');
      this.setState({immDatasources: this.state.immDatasources.setIn(path, newState)});
    };

    handleTvSearch = (immTvSearchState, e) => {
      function isNodeInSearch(re, immNode, searchField) {
        switch(searchField) {
          case 'Long & Short Name':
            return re.test(immNode.get('longName')) || re.test(immNode.get('shortName'));
          case 'Long Name':
            return re.test(immNode.get('longName'));
          case 'Short Name':
            return re.test(immNode.get('shortName'));
        }
      }

      var searchText = e.target.value;
      var immNewTvSearchState = immTvSearchState.set('tvSearchText', searchText);
      var immDatasources = this.state.immDatasources;

      var tvResultCounts = [0, 0, 0];
      var re = _.isEmpty(searchText) ? null : Util.escapedRegExp(searchText, 'i');
      var newState = {};

      newState.immDatasources = immDatasources.withMutations(function(mutDatasources) {
        mutDatasources.forEach(function(immDatasource, datasourceShortName) {
          var searchField = immNewTvSearchState.get('searchField');
          var immDatasourceKeyPath = Imm.List([datasourceShortName]);
          var immTablesKeyPath = immDatasourceKeyPath.push('tables');
          var datasourceIsInSchema = this.state.immDatasources.getIn(immDatasourceKeyPath.push('inSchema'));
          if (datasourceIsInSchema) {
            mutDatasources.getIn(immTablesKeyPath).forEach(function(immTable, tableShortName) {
              var immTableKeypath = immTablesKeyPath.push(tableShortName);
              var immColumnsKeyPath = immTableKeypath.push('columns');
              var tableIsInSchema = this.state.immDatasources.getIn(immTableKeypath.push('inSchema'));
              if (tableIsInSchema) {
                mutDatasources.getIn(immColumnsKeyPath).forEach(function(immColumn, columnShortName) {
                  var visible = this.state.immDatasources.getIn(immColumnsKeyPath.push(columnShortName).push('inSchema')) && (_.isNull(re) || isNodeInSearch(re, immColumn, searchField));
                  mutDatasources.setIn(immColumnsKeyPath.push(columnShortName).push('inSearch'), visible);
                  if (visible) { tvResultCounts[2]++; }
                }, this);
              }
              var tableVisible = tableIsInSchema && mutDatasources.getIn(immColumnsKeyPath).some(function(immColumn) {
                return immColumn.get('inSearch');
              });
              if (tableVisible) { tvResultCounts[1]++; }
              mutDatasources.setIn(immTableKeypath.push('inSearch'), tableVisible);
            }, this);
          }
          var datasourceVisible = datasourceIsInSchema && mutDatasources.getIn(immTablesKeyPath).some(function(immTable) {
            return immTable.get('inSearch');
          });
          if (datasourceVisible) { tvResultCounts[0]++; }
          mutDatasources.setIn(immDatasourceKeyPath.push('inSearch'), datasourceVisible);
        }, this);
      }.bind(this));
      newState.immTvSearchState = immNewTvSearchState.set('tvResultCounts', Imm.List(tvResultCounts));

      this.setState(newState);
    };

    handleSearchFieldDropdown = (index) => {
      var searchField;
      switch(index) {
        case 0:
          searchField = 'Long & Short Name';
          break;
        case 1:
          searchField = 'Long Name';
          break;
        case 2:
          searchField = 'Short Name';
      }
      this.setState({immTvSearchState: this.state.immTvSearchState.set('searchField', searchField)});
    };

    handleSetEdges = () => {
      AdminActions.setColumnEdges(this.props.tableShortName, this.props.colShortName, 'children', this.state.immDatasources);
    };

    render() {
      if (!this.state.immDatasources) {
        return div(null);
      }
      return div(null,
        div({className: 'modal-dialog-header underline'}, span({className: 'modal-dialog-header-text'}, 'SELECT CHILDREN')),
        div({className: 'modal-dialog-main'},
          div({className: 'edge'},
            span({className: 'edge-table-long-name'}, this.props.tableLongName),
            span({className: 'edge-column-long-name'}, this.props.colLongName),
            span({className: 'edge-short-names'}, '(' + this.props.tableShortName + '.' + this.props.colShortName + ')'),
            span({className: 'icon-arrow-right-circle-full'})),
          SchemaTreeView({
            disableToggleButtons: true,
            noSideNavBorder: true,
            columnCheckboxOnly: true,
            noSearchBoxMargin: true,
            height: window.innerHeight - 200,
            maxDepth: 2,
            handleTreeItemCheckboxClick: this.handleCheckboxState,
            handleTreeItemExpandOrCollapse: this.handleExpand,
            handleTvSearch: this.handleTvSearch,
            searchColumnOnly: true,
            handleColumnSearchFieldDropdown: this.handleSearchFieldDropdown,
            width: 350,
            immWorkingCsDatasources: this.state.immDatasources,
            immTvSearchState: this.state.immTvSearchState
          })
        ),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-loop2',
            children: FrontendConstants.UPDATE,
            isPrimary: true,
            onClick: this.handleSetEdges}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  SaveDeployWarning: class extends React.Component {
    static displayName = 'SaveDeployWarning';

    static propTypes = {
      saveFunction: PropTypes.func.isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    handleSaveDeploy = () => {
      this.props.saveFunction();
      AdminActions.closeModal();
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-info'}), span({className: 'modal-dialog-header-text'}, 'INFO: CURRENT USERS MIGHT BE AFFECTED')),
        div({className: 'modal-dialog-main'}, span({className: 'modal-dialog-content-text'}, "Once you deploy, this schema will replace the currently active schema. Any user currently working with this schema will be affected.")),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-cloud-upload',
            children: FrontendConstants.SAVE_AND_DEPLOY,
            isPrimary: true,
            onClick: this.handleSaveDeploy}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  CheckAllUniqueness: class extends React.Component {
    static displayName = 'CheckAllUniqueness';

    static propTypes = {
      immAdminStore:  PropTypes.instanceOf(Imm.Map).isRequired,
      handleCancel: PropTypes.func
    };

    static defaultProps = {
      handleCancel: AdminActions.closeModal
    };

    componentDidMount() {
      // After this modal dialog is mounted, we send request to verify all the uniqueness un-verified columns.
      // Sending request at this time ensures later updates for the AdminStore will be correctly received after.
      this.props.immAdminStore.get('uniquenessNotVerifiedTables').forEach(function(keyPath){
        AdminActions.verifyTableUniquenessColumns(keyPath, false);
      });
    }

    render() {
      var rows = this.props.immAdminStore.get('uniquenessNotVerifiedTables').map(function(keyPath) {
        return CheckAllUniquenessTableRow({text: this.props.immAdminStore.getIn(keyPath.push('longName')), status: this.props.immAdminStore.getIn(keyPath.push('uniquenessStatus'))});
      }, this);
      var tableCount = ComprehendSchemaUtil.tablesCount(this.props.immAdminStore.getIn(['workingCs', 'datasources']));
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'icon icon-WarningCircle'}), span({className: 'modal-dialog-header-text'}, 'SCHEMA VALIDATION')),
        div({className: 'modal-dialog-main'},
          div({className: 'uniqueness-dialog-summary'},
            div({className: 'summary-row'}, div({className:'summary-text'}, 'Tables in Schema'), div({className:'summary-count'}, tableCount.total)),
            div({className: 'summary-row'}, div({className:'summary-text'}, 'Uniqueness Already Verified'), div({className:'summary-count'}, tableCount.uniquenessVerified)),
            div({className: 'summary-row'}, div({className:'summary-text'}, 'Uniqueness Unverified'), div({className:'summary-count'}, tableCount.total - tableCount.uniquenessVerified))),
          div({className: 'uniqueness-dialog-title'}, 'Checking Unverified Tables for Uniqueness'),
          div({className: 'uniqueness-dialog-rows'}, rows),
          div({className: 'uniqueness-dialog-hint-text'}, "Uniqueness properties for one or more tables included in this schema may be incorrect.  Please resolve any issues before deploying.")),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-arrow-left',
            children: FrontendConstants.RETURN_TO_EDIT,
            isPrimary: true,
            onClick: this.props.handleCancel})));
    }
  },

  CreateFolder: class extends React.Component {
    static displayName = 'CreateFolder';

    static propTypes = {
      createFolderStatus: PropTypes.string.isRequired,
      handleCancel: PropTypes.func.isRequired,
      handleCreateFolder: PropTypes.func.isRequired,
      handleUpdateTitle: PropTypes.func.isRequired
    };

    componentDidMount() {
      ReactDOM.findDOMNode(this.refs['createFolderTitleInput']).focus();
    }

    errorMsg = () => {
      switch (this.props.createFolderStatus) {
        case ExposureAppConstants.CREATE_FOLDER_EMPTY:
          return FrontendConstants.FOLDER_TITLE_CANNOT_BE_EMPTY;
        case ExposureAppConstants.CREATE_FOLDER_DUPLICATE:
          return FrontendConstants.FOLDER_TITLE_DUPLICATE;
      }
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'icon icon-folder'}),
          span({className: 'modal-dialog-header-text'}, 'Add Folder')
        ),
        div({className: 'modal-dialog-main'},
          InputBlockContainer({
            inputComponent: InputWithPlaceholder({
              key: 'create-folder',
              type: 'text',
              ref: 'createFolderTitleInput',
              className: cx('text-input', 'create-folder-title-input', {'invalid-input': this.props.createFolderStatus !== ExposureAppConstants.CREATE_FOLDER_VALID}),
              onChange: this.props.handleUpdateTitle,
              placeholder: 'Title',
              defaultValue: '',
              maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH}),
            errorMsg: this.errorMsg()
          })),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-plus-circle2',
            children: FrontendConstants.ADD,
            isPrimary: true,
            onClick: this.props.handleCreateFolder}),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})));
    }
  },

  RenameFolder: class extends React.Component {
    static displayName = 'RenameFolder';

    static propTypes = {
      renameFolderStatus: PropTypes.string.isRequired,
      handleCancel: PropTypes.func.isRequired,
      handleRenameFolder: PropTypes.func.isRequired,
      handleUpdateTitle: PropTypes.func.isRequired
    };

    componentDidMount() {
      ReactDOM.findDOMNode(this.refs['renameFolderTitleInput']).focus();
    }

    errorMsg = () => {
      switch (this.props.renameFolderStatus) {
        case ExposureAppConstants.RENAME_FOLDER_EMPTY:
          return FrontendConstants.FOLDER_TITLE_CANNOT_BE_EMPTY;
        case ExposureAppConstants.RENAME_FOLDER_DUPLICATE:
          return FrontendConstants.FOLDER_TITLE_DUPLICATE;
        case ExposureAppConstants.RENAME_FOLDER_INVALID:
          return FrontendConstants.FOLDER_TITLE_INVALID_CHARS;
      }
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'icon icon-folder'}),
          span({className: 'modal-dialog-header-text'}, FrontendConstants.RENAME_FOLDER)),
        div({className: 'modal-dialog-main'},
          InputBlockContainer({
            inputComponent: InputWithPlaceholder({
              key: 'rename-folder',
              type: 'text',
              ref: 'renameFolderTitleInput',
              className: cx('text-input', 'rename-folder-title-input', {'invalid-input': this.props.renameFolderStatus !== ExposureAppConstants.RENAME_FOLDER_VALID}),
              onChange: this.props.handleUpdateTitle,
              placeholder: FrontendConstants.TITLE,
              defaultValue: '',
              maxLength: ExposureAppConstants.FILE_TITLE_MAX_LENGTH}),
            errorMsg: this.errorMsg()
          })
        ),
        div({className: 'modal-dialog-footer'},
          Button({
            icon: 'icon icon-pencil',
            children: FrontendConstants.RENAME,
            isPrimary: true,
            onClick: this.props.handleRenameFolder}
          ),
          Button({
            icon: 'icon icon-close',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel}
          )
        )
      );
    }
  },

  ShareAdd: class extends React.Component {
    static displayName = 'ShareAdd';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleEditSharing: PropTypes.func.isRequired,
      handleShare: PropTypes.func.isRequired,
      immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
      immFileConfigs: PropTypes.instanceOf(Imm.List).isRequired,
      isHidden: PropTypes.bool
    };

    state = {
      immSelectedEntities: Imm.List(),
      privilegeDropdownValue: FrontendConstants.PRIVILEGE_TYPE_VIEW,
      immPrivilegeDropdown: null,
      isSingleFileShare: this.props.immFileConfigs.size === 1
    };

    selectEntityHandler = (entities) => {
      this.setState({immSelectedEntities: Imm.fromJS(entities)});
    };

    removeEntityHandler = (idx) => {
      this.setState({immSelectedEntities: this.state.immSelectedEntities.splice(idx, 1)});
    };

    hidePrivilegeDropdown = () => {
      this.setState({immPrivilegeDropdown: null});
    };

    togglePrivilegeDropdown = (willOpen) => {
      let isClosed = _.isNull(this.state.immPrivilegeDropdown);
      if (willOpen === isClosed) {
        this.setState({immPrivilegeDropdown: willOpen ? Imm.Map({
          top: 34,
          read: ExposureSharingConstants.YES_CANNOT_REVOKE,
          edit: this.state.privilegeDropdownValue === FrontendConstants.PRIVILEGE_TYPE_EDIT ? ExposureSharingConstants.YES_CAN_REVOKE :
            ExposureSharingConstants.NO_CAN_GRANT
        }) : null});
      }
    };

    privilegeHandler = (privilegeType) => {
      this.setState({
        privilegeDropdownValue: privilegeType,
        immPrivilegeDropdown: null
      });
    };

    cancelHandler = () => {
      if (this.isDirty()) {
        if (this.props.isHidden) {
          ExposureActions.discardModalChanges();
        } else {
          ExposureActions.toggleDisplayWarningModal();
        }
      } else {
        ExposureActions.closeModal();
      }
    };

    editSharingHandler = () => {
      if (this.isDirty()) {
        ExposureActions.toggleDisplayWarningModal({secondaryButtonAction: this.props.handleEditSharing});
      } else {
        this.props.handleEditSharing();
      }
    };

    isDirty = () => {
      return !this.state.immSelectedEntities.isEmpty();
    };

    shareHandler = () => {
      if (this.isDirty()) {
        var immPrivileges;
        switch (this.state.privilegeDropdownValue) {
          case FrontendConstants.PRIVILEGE_TYPE_EDIT:
            immPrivileges = Imm.List([ExposureSharingConstants.READ, ExposureSharingConstants.EDIT]);
            break;
          default:
            immPrivileges = Imm.List([ExposureSharingConstants.READ]);
        }

        for (let immFileConfigItem of this.props.immFileConfigs) {
          const fileId = immFileConfigItem.get('id');
          const documentType = immFileConfigItem.get('fileType').toUpperCase();

          this.state.immSelectedEntities.forEach(function(immEntityPrivilege) {
            GA.sendDocumentShare(
              fileId,
              immEntityPrivilege.getIn(['entity', 'id']),
              documentType
            );
          });
        }
        this.props.handleShare(this.props.immFileConfigs, this.state.immSelectedEntities,
          immPrivileges);
      }
    };

    getTitle = () => this.state.isSingleFileShare ?
      FileTitle({prefix: FrontendConstants.SHARE, immFileConfig: this.props.immFileConfigs.get(0)}) :
      FrontendConstants.SHARE_ITEMS;

    render() {
      // Explicitly allow active and pending users, even if they have not yet registered.
      var immEntities = Util.getSelectableUsersOrTeams(
        this.props.immExposureStore.get('groupEntities'),
        this.props.immExposureStore.get('users').filter(immUser => _.contains([ExposureSharingConstants.ACTIVE, ExposureSharingConstants.PENDING_CONFIRMATION], immUser.get('userEntityState'))),
        this.props.immExposureStore.getIn(['userInfo', 'id']))
        // This is used by the Combobox so that each item has a unique key.
        .map(immEntity => immEntity.set('value', immEntity.getIn(['entity', 'username'], immEntity.getIn(['entity', 'name']))));

      return div({className: cx('share-modal', 'add')},
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, this.getTitle())),
        div({className: 'modal-dialog-main'},
          div({className: 'modal-dialog-content-text add-users-groups'}, FrontendConstants.SHARING_ADD_USERS_OR_TEAMS),
          div({className: 'virtual-table'},
            div({className: 'virtual-table-row'},
              div({className: 'virtual-table-cell'},
                Combobox({
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
                div({className: 'privilege-dropdown-container'},
                  Combobox({
                    className: 'privilege-dropdown',
                    options: PRIVILEGE_OPTIONS,
                    searchable: false,
                    onChange: this.privilegeHandler,
                    value: this.state.privilegeDropdownValue
                  }))))
          )),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.SHARE,
            isPrimary: true,
            onClick: this.shareHandler
          }),
          Button({
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.cancelHandler
          }),
          this.state.isSingleFileShare &&
          div({className: 'modal-dialog-footer'},
            hr({className: 'sharing-modal-footer-separator'}),
            div({className: cx('footer-link', 'edit-sharing-link'),
                onClick: this.editSharingHandler},
              span({className: cx('icon', 'icon-pencil')}),
              span({className: 'text-link'}, FrontendConstants.SHARING_ADD_MODAL_LINK_TO_EDIT)
            ))
        )
      );
    }
  },

  ShareEdit: class extends React.Component {
    static displayName = 'ShareEdit';

    static propTypes = {
      handleAddMore: PropTypes.func.isRequired,
      handleCancel: PropTypes.func.isRequired,
      handleUpdate: PropTypes.func.isRequired,
      immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
      immFileConfig: PropTypes.instanceOf(Imm.Map).isRequired,
      isHidden: PropTypes.bool
    };

    state = {
      hasHelperTextBlock: false,
      helperTextIsOpen: false,
      // { USER_ENTITY -> { userId -> { read: PrivilegeCapability, edit: PrivilegeCapability ...} ... }, GROUP_ENTITY -> { groupEntityId -> { read: PrivilegeCapability, edit: PrivilegeCapability ...} }}
      immEntityPrivileges: Imm.Map(),
      // { USER_ENTITY -> { userId -> { read: GRANT, edit: REVOKE ...} ... }, GROUP_ENTITY -> { groupEntityId -> { read: GRANT, edit: REVOKE ...} }}
      immPrivilegeModifications: Imm.Map()
    };

    cancelHandler = () => {
      if (this.isDirty()) {
        if (this.props.isHidden) {
          ExposureActions.discardModalChanges();
        } else {
          ExposureActions.toggleDisplayWarningModal();
        }
      } else {
        ExposureActions.closeModal();
      }
    };

    hasFixedPrivileges = (immEntityPrivileges, entityType) => {
      return immEntityPrivileges.get(entityType).some(function(immEntityPrivileges) {
        return !immEntityPrivileges.get('self') && Util.privilegeCapabilityIsFixed(immEntityPrivileges.getIn(['entityPrivileges', ExposureSharingConstants.READ, 'privilegeCapability']));
      });
    };

    handleLoadEntityPrivileges = (immEntityPrivileges) => {
      // This will be called only once from PrivilegeTable.componentDidMount.
      var hasHelperTextBlock = this.hasFixedPrivileges(immEntityPrivileges, ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY) ||
        this.hasFixedPrivileges(immEntityPrivileges, ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY);
      this.setState({immEntityPrivileges: immEntityPrivileges, hasHelperTextBlock: hasHelperTextBlock});
    };

    handleAddMore = () => {
      if (this.isDirty()) {
        ExposureActions.toggleDisplayWarningModal({secondaryButtonAction: this.props.handleAddMore});
      } else {
        this.props.handleAddMore();
      }
    };

    handleModification = (immPrivilegeModifications) => {
      this.setState({immPrivilegeModifications: immPrivilegeModifications});
    };

    diffEntityPrivileges = (entityType) => {
      var immEntityTypePrivileges = this.state.immEntityPrivileges.get(entityType, Imm.List());
      // Iterate over the Map({entityId: entityMap}) of privilege modifications.
      return this.state.immPrivilegeModifications.get(entityType, Imm.Map()).flatMap(function(immPrivilegeModification, entityId) {
        // Find the entityPrivileges for the current entityId with guards to return an
        // empty Map if it's not found.
        var immEntityPrivileges = immEntityTypePrivileges.find(function(immEntityMap) {
          return immEntityMap.getIn(['entityPrivileges', 'entityId']) === entityId;
        }, this, Imm.Map()).get('entityPrivileges', Imm.Map());
        // Produce a map of privilegeFields for only the actionable privilegeRequests.
        var immPrivilegeFields = immPrivilegeModification.reduce(function(memo, privilegeRequest, privilegeType) {
          var privilegeCapability = immEntityPrivileges.getIn([privilegeType, 'privilegeCapability']);
          return Util.privilegeRequestIsActionable(privilegeCapability, privilegeRequest) ?
            memo.set(privilegeType, Imm.Map({editPrivilegesRequest: privilegeRequest})) : memo;
        }, Imm.Map(), this);
        // Return an EntityPrivileges object if there are any actionable privilegeRequests.
        // Note that Immutable requires a flatMap iterable of the same shape as the input iterator
        // (in this case a Map); also, unique keys are required with a Map.
        return immPrivilegeFields.isEmpty() ? {} :
          Imm.Map([[entityId, immPrivilegeFields.merge({
            entityId: entityId,
            entityType: entityType,
            privilegeFieldType: ExposureSharingConstants.EDIT_PRIVILEGES_REQUEST})]]);
      }, this).toList();
    };

    handleUpdate = () => {
      if (this.isDirty()) {
        var immEntityPrivilegesList = this.diffEntityPrivileges(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY)
          .concat(this.diffEntityPrivileges(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY));
        if (!immEntityPrivilegesList.isEmpty()) {
          var hasReadRevoke = immEntityPrivilegesList.some(function(immEntityPrivileges) {
            return immEntityPrivileges.getIn([ExposureSharingConstants.READ, 'editPrivilegesRequest']) === ExposureSharingConstants.REVOKE;
          });
          if (hasReadRevoke) {
            ExposureActions.toggleDisplayWarningModal({
              primaryButtonAction: this.props.handleUpdate.bind(null, this.props.immFileConfig, immEntityPrivilegesList),
              primaryButtonText: FrontendConstants.REMOVE,
              secondaryButtonAction: ExposureActions.toggleDisplayWarningModal,
              secondaryButtonText: FrontendConstants.CANCEL,
              warningText: FrontendConstants.REMOVE_ALL_ACCESS_WARNING
            });
          } else {
            this.props.handleUpdate(this.props.immFileConfig, immEntityPrivilegesList);
          }
        }
      }
    };

    isDirty = () => {
      return !this.state.immPrivilegeModifications.isEmpty() &&
        (!this.state.immPrivilegeModifications.get(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY, Imm.Map()).isEmpty() ||
        !this.state.immPrivilegeModifications.get(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY, Imm.Map()).isEmpty());
    };

    toggleDisplayHelperText = () => {
      this.setState({helperTextIsOpen: !this.state.helperTextIsOpen});
    };

    getHelperTextBlock = () => {
      var hideableTextBlock = !this.state.helperTextIsOpen ? null :
        div({className: 'hideable-text-block'},
          li(null, span({className: 'bullet-text'}, FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE_BULLET_1)),
          li(null, span({className: 'bullet-text'}, FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE_BULLET_2)),
          li(null, span({className: 'bullet-text'}, FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE_BULLET_3)),
          li(null, span({className: 'bullet-text'}, FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE_BULLET_4)),
          li(null, span({className: 'bullet-text'}, FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE_BULLET_5)),
          ContactAdmin()
        );
      return !this.state.hasHelperTextBlock ? null :
        div({className: 'helper-text-block'},
          div({className: 'persistent-text-block'},
            FrontendConstants.IF_UNABLE_TO_GRANT_OR_REVOKE,
            span({className: 'opener-block', onClick: this.toggleDisplayHelperText},
              (this.state.helperTextIsOpen ? FrontendConstants.LESS : FrontendConstants.MORE),
              span({className: cx('icon', 'icon-arrow-right', {open: this.state.helperTextIsOpen})}))),
          hideableTextBlock
        );
    };

    render() {
      var fileTypeName = Util.getFileTypeName(this.props.immFileConfig.get('fileType'), this.props.immFileConfig.get('title'));

      return div({className: cx('share-modal', 'edit')},
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'},
            FileTitle({prefix: FrontendConstants.EDIT_SHARING, immFileConfig: this.props.immFileConfig}))),
        div({className: 'modal-dialog-main'},
          PrivilegeTable({
            canModify: true,
            handleLoadEntityPrivileges: this.handleLoadEntityPrivileges,
            handleModification: this.handleModification,
            height: 297,  // Enough for header, 7 rows, and 1 pixel for the border bottom.
            immHeaderTextMap: Imm.Map({
              GROUP_ENTITY: FrontendConstants.SHARING_EDIT_MODAL_TEXT_GROUPS(fileTypeName),
              USER_ENTITY: FrontendConstants.SHARING_EDIT_MODAL_TEXT_USERS(fileTypeName)
            }),
            immExposureStore: this.props.immExposureStore,
            immFileConfig: this.props.immFileConfig,
            immPrivilegeModifications: this.state.immPrivilegeModifications,
            width: 428  // Available content width of the modal dialog.
          }),
          this.getHelperTextBlock()
        ),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.UPDATE,
            isPrimary: true,
            onClick: this.handleUpdate
          }),
          Button({
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.cancelHandler
          }),
          hr({className: 'sharing-modal-footer-separator'}),
          div({className: cx('footer-link', 'add-sharing-link'), onClick: this.handleAddMore},
            span({className: cx('icon', 'icon-pencil')}),
            span({className: 'text-link'}, FrontendConstants.SHARING_EDIT_MODAL_LINK_TO_ADD)
          )
        )
      );
    }
  },

  ShareResults: class extends React.Component {
    static displayName = 'ShareResults';

    static propTypes = {
      handleAddMore: PropTypes.func.isRequired,
      handleCancel: PropTypes.func.isRequired,
      handleDone: PropTypes.func.isRequired,
      handleEdit: PropTypes.func.isRequired,
      immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
      immFileConfigs: PropTypes.instanceOf(Imm.List).isRequired,
      immResultsEntityPrivileges: PropTypes.instanceOf(Imm.List),
      requestType: PropTypes.string.isRequired
    };

    state = {
      isSingleFileShare: this.props.immFileConfigs.size === 1
    };

    generateSuccessfulContent = () => {
      var successSpan;
      switch (this.props.requestType) {
        case ExposureSharingConstants.SHARE_REQUEST_TYPE_ADD:
          successSpan = span(null, span(null, 'You have successfully '), span({className: 'bold'}, 'shared'));
          break;
        case ExposureSharingConstants.SHARE_REQUEST_TYPE_MODIFY:
          successSpan = span(null, span(null, 'You have successfully '), span({className: 'bold'}, 'edited'), span(null, ' sharing options for'));
          break;
      }
      return div(null,
        span({className: cx('icon', 'icon-checkmark-full')}),
        successSpan,
        this.state.isSingleFileShare ?
          FileTitle({immFileConfig: this.props.immFileConfigs.get(0)}) :
          span({className: 'text-padding-left'}, FrontendConstants.SELECTED_ITEMS)
      );
    };

    // TODO: Inspect immResultEntityPrivileges for specific privileges that failed, instead of
    // just returning a list of entities. Most likely done when we implement edit/share for sharing.
    generateFailureContent = (immFailedEntities) => {
      var groupedElements = Util.parseAndGroupEntityPrivileges(this.props.immExposureStore, immFailedEntities, function(immMap) {
        switch (immMap.getIn(['entityPrivileges', 'entityType'])) {
          case ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY:
            var groupName = immMap.getIn(['groupEntity', 'name']);
            return div({key: 'group-' + groupName, className: cx('failed-entity', 'group-name')},
              span({className: cx('icon', 'icon-users')}),
              span({className: 'group-name-text'}, groupName)
            );
          case ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY:
            var firstLastName = immMap.getIn(['user', 'firstLastName']);
            return div({key: 'user-' + firstLastName, className: cx('failed-entity', 'user-name')},
              span({className: 'user-name-text'}, firstLastName)
            );
        }
      });

      return div({className: 'failed-entities'},
        groupedElements.get(ExposureAppConstants.RBAC_ENTITY_TYPE_GROUP_ENTITY),
        groupedElements.get(ExposureAppConstants.RBAC_ENTITY_TYPE_USER_ENTITY)
      );
    };

    render() {
      const { isSingleFileShare } = this.state;
      // TODO: More granular privilege checking, when we can add with edit/share.
      const immFailedEntities = this.props.immResultsEntityPrivileges.filter(function(immEntityPrivilege) {
        return immEntityPrivilege.getIn([ExposureSharingConstants.READ, 'editPrivilegesResult']) === ExposureSharingConstants.FAILURE ||
          immEntityPrivilege.getIn([ExposureSharingConstants.EDIT, 'editPrivilegesResult']) === ExposureSharingConstants.FAILURE;
      });
      var resultWasSuccessful = immFailedEntities.isEmpty();
      var headerText = resultWasSuccessful ? FrontendConstants.SUCCESS : FrontendConstants.SHARING_USERS_COULD_NOT_BE_ADDED_OR_MODIFIED(this.props.requestType);
      var resultContent = resultWasSuccessful ? this.generateSuccessfulContent() : this.generateFailureContent(immFailedEntities);

      return div({className: cx('share-modal', 'results', {success: resultWasSuccessful, partial: !resultWasSuccessful})},
        div({className: 'modal-dialog-header'},
          span({className: cx('modal-dialog-header-text', 'colon')}, headerText)
        ),
        div({className: 'modal-dialog-main'},
          resultContent,
          resultWasSuccessful ? null : ContactAdmin()
        ),
        div({className: 'modal-dialog-footer'},
          isSingleFileShare && Button({
            children: FrontendConstants.ADD_MORE_USERS,
            isPrimary: true,
            onClick: this.props.handleAddMore}),
          isSingleFileShare && Button({
            children: FrontendConstants.EDIT_SHARING,
            isSecondary: true,
            onClick: this.props.handleEdit}),
          Button({
            children: FrontendConstants.DONE,
            isSecondary: true,
            onClick: this.props.handleDone}))
      );
    }
  },

  ShareDetail: class extends React.Component {
    static displayName = 'ShareDetail';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      immFileConfigs: PropTypes.instanceOf(Imm.List).isRequired
    };

    state = {
      isSingleFileShare: this.props.immFileConfigs.size === 1
    };

    getTitle = () => {
      const fileTypeName = Util.getFileTypeName(this.props.immFileConfigs.getIn([0, 'fileType']), this.props.immFileConfigs.getIn([0, 'title']));
      return this.state.isSingleFileShare ?
        FileTitle({prefix: fileTypeName, immFileConfig: this.props.immFileConfigs.get(0)}) :
        FrontendConstants.SHARE_ITEMS
    };

    getCannotShareMessage = () => {
      const fileTypeName = Util.getFileTypeName(this.props.immFileConfigs.getIn([0, 'fileType']), this.props.immFileConfigs.getIn([0, 'title']));
      return this.state.isSingleFileShare ?
        FrontendConstants.YOU_CANNOT_SHARE(fileTypeName) :
        FrontendConstants.YOU_CANNOT_SHARE_ITEMS;
    };

    render() {
      return div({className: cx('share-modal', 'details')},
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, this.getTitle())
        ),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, this.getCannotShareMessage())
        ),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.OKAY,
            isPrimary: true,
            onClick: this.props.handleCancel})
        )
      );
    }
  },

  ShareError: class extends React.Component {
    static displayName = 'ShareError';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired
    };

    render() {
      return div({className: 'share-modal error'},
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text colon'}, FrontendConstants.SHARING_UNSUCCESSFUL)
        ),
        div({className: 'modal-dialog-main'},
          FrontendConstants.SHARING_UNSUCCESSFUL_DETAILS,
          ContactAdmin()
        ),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.OKAY,
            isPrimary: true,
            onClick: this.props.handleCancel}))
      );
    }
  },

  SimpleMessage: class extends React.Component {
    static displayName = 'SimpleMessage';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired,
      content: PropTypes.string,
      icon: PropTypes.string,
      primaryButton: PropTypes.shape({
        text: PropTypes.string
      })
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          this.props.icon ? span({className: cx('icon', this.props.icon)}) : null,
          this.props.content ? span({className: 'modal-dialog-content-text'}, this.props.content) : null),
        this.props.primaryButton ? div({className: 'modal-dialog-footer'},
          Button({
            children: this.props.primaryButton.text,
            isPrimary: true,
            onClick: this.props.handleCancel})) : null
      );
    }
  },

  TargetFolderSelectionDialog: class extends React.Component {
    static displayName = 'TargetFolderSelectionDialog';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired,
      content: PropTypes.string,
      currentFolderId: PropTypes.string,
      immRows: PropTypes.instanceOf(Imm.List),
      selectedFilesCount: PropTypes.number,
      primaryButton: PropTypes.shape({
        icon: PropTypes.string,
        onClick: PropTypes.func,
        text: PropTypes.string
      })
    };

    state = {activeFolderId: '', warning: null};

    handleClick = (id) => {
      this.setState({activeFolderId: id});
    };

    handleMove = () => {
      const { selectedFilesCount } = this.props;

      if (_.isEmpty(this.state.activeFolderId)) {
        this.setState({warning: FrontendConstants.PLEASE_SELECT_A_DESTINATION});
      } else if (this.state.activeFolderId === this.props.currentFolderId) {
        const warning = selectedFilesCount > 1
          ? FrontendConstants.ITEMS_ALREADY_IN_DESTINATION
          : FrontendConstants.ITEM_ALREADY_IN_DESTINATION
        this.setState({ warning });
      } else {
        ExposureActions.setMoveToFolderId(this.state.activeFolderId);
        this.props.primaryButton.onClick();
      }
    };

    render() {
      var immRows = this.props.immRows
        .sortBy(function(immRow) { return immRow.get('title'); })
        .map(function(immRow, rowIndex) {
          return div({className: 'folder-list-row', key: rowIndex, onClick: this.handleClick.bind(null, immRow.get('id'))},
            div({className: cx('folder-list-row-main', {'row-active': this.state.activeFolderId === immRow.get('id')})},
              span({className: 'icon icon-folder'}),
              span({className: 'folder-list-row-main-text'}, immRow.get('title'))));
        }, this);
      var rootFolderRow = div({className: 'folder-list-row', key: -1, onClick: this.handleClick.bind(null, ExposureAppConstants.REPORTS_LANDING_PAGE_ID)},
        div({className: cx('folder-list-row-main', 'root', {'row-active': this.state.activeFolderId === ExposureAppConstants.REPORTS_LANDING_PAGE_ID})},
          span({className: 'folder-list-row-main-text'}, 'Root Directory')));

      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, this.props.content),
          div({className: 'folder-list'},
            div({className: 'folder-list-rows'}, rootFolderRow, immRows))),
        this.state.warning ? div({className: 'folder-list-warning'}, this.state.warning) : null,
        div({className: 'modal-dialog-footer'},
          Button({
            icon: cx('icon', this.props.primaryButton.icon),
            children: this.props.primaryButton.text,
            isPrimary: true,
            onClick: this.handleMove})));
    }
  },

  DialogWithList: class extends React.Component {
    static displayName = 'DialogWithList';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired,
      closingContent: PropTypes.shape({
        emphasisText: PropTypes.string,
        text: PropTypes.arrayOf(PropTypes.string)
      }),
      contentIcon: PropTypes.string,
      content: PropTypes.string,
      description: PropTypes.string,
      immRows: PropTypes.instanceOf(Imm.List),
      listHeader: PropTypes.string,
      primaryButton: PropTypes.shape({
        icon: PropTypes.string,
        onClick: PropTypes.func,
        text: PropTypes.string
      }),
      secondaryButton: PropTypes.shape({
        icon: PropTypes.string,
        onClick: PropTypes.func,
        text: PropTypes.string
      })
    };

    render() {
      var simpleTitleSortFn = Util.immPluck('title');
      var immRows = this.props.immRows ? this.props.immRows
        .sortBy(simpleTitleSortFn)
        .map(function(immRow) {
          var immAssociated = immRow.get('associated');
          return immAssociated ? immRow.set('associated', immAssociated.sortBy(simpleTitleSortFn)) : immRow;
        }) : null;

      var closingContent = this.props.closingContent ? div({className: 'modal-dialog-closing'},
        this.props.closingContent.text.length === 1 ?
          div(null,
            span({className: 'modal-dialog-closing-text'}, this.props.closingContent.text[0]),
            span({className: 'modal-dialog-closing-emphasis'}, this.props.closingContent.emphasisText)) :
          div(null,
            div({className: 'modal-dialog-closing-text'}, _.map(this.props.closingContent.text, function(sentence, index) { return li({key: index}, sentence); })),
            div({className: 'modal-dialog-closing-emphasis'}, this.props.closingContent.emphasisText))) : null;

      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          div({className: 'modal-dialog-text'},
            div(null,
              this.props.contentIcon ? span({className: cx('icon', this.props.contentIcon)}) : null,
              this.props.content ? span({className: 'modal-dialog-content-text'}, this.props.content) : null,
            ),
            this.props.description ? span({className: 'modal-dialog-content-description'}, this.props.description) : null, 
          ),
          this.props.immRows ? NoticeList({listHeader: this.props.listHeader, immRows: immRows}) : null),
        closingContent,
        div({className: 'modal-dialog-footer'},
          this.props.primaryButton ? Button({
            icon: cx('icon', this.props.primaryButton.icon),
            children: this.props.primaryButton.text,
            isPrimary: true,
            onClick: this.props.primaryButton.onClick}) : null,
          this.props.secondaryButton ? Button({
            icon: cx('icon', this.props.secondaryButton.icon),
            children: this.props.secondaryButton.text,
            isSecondary: true,
            onClick: this.props.secondaryButton.onClick}) : null));
    }
  },

  MonitorTaskAssignees: class extends React.Component {
    static displayName = 'MonitorTaskAssignees';

    static propTypes = {
      fileId: PropTypes.string.isRequired,
      handleCancel: PropTypes.func.isRequired,
      immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
      // Below two are required but not marked 'isRequired' to suppress warnings. https://github.com/facebook/react/issues/4494
      isLarger: PropTypes.bool,
      setIsLarger: PropTypes.func
    };

    state = {
      isEditMode: false,
      modalHeader: FrontendConstants.MANAGE_ASSIGNEES
    };

    handleShowDataSelector = (showDataSelector, isEditingFilter) => {
      this.props.setIsLarger(showDataSelector);
      this.setState({modalHeader: showDataSelector ? (isEditingFilter ? FrontendConstants.EDIT_CONDITIONAL_FILTER : FrontendConstants.ADD_CONDITIONAL_FILTER) : FrontendConstants.MANAGE_ASSIGNEES});
    };

    getContent = () => {
      return this.state.isEditMode ? {
        body: EditMonitorTaskAssignee({
          canModify: true,
          fileId: this.props.fileId,
          handleCancel: this.props.handleCancel,
          immExposureStore: this.props.immExposureStore,
          handleShowDataSelector: this.handleShowDataSelector,
          height: 297,  // Enough for header, 7 rows, and 1 pixel for the border bottom.
          width: 428  // Available content width of the modal dialog.
        }),
        footer: {
          icon: 'icon-plus-circle2',
          text: FrontendConstants.ADD_MORE_ASSIGNEES
        }
      } : {
        body: AddMonitorTaskAssignees({
          fileId: this.props.fileId,
          handleCancel: this.props.handleCancel,
          handleShowDataSelector: this.handleShowDataSelector,
          immExposureStore: this.props.immExposureStore
        }),
        footer: {
          icon: 'icon-pencil',
          text: FrontendConstants.EDIT_ASSIGNEES
        }
      };
    };

    toggleContentPane = () => {
      this.setState({isEditMode: !this.state.isEditMode});
    };

    render() {
      var content = this.getContent();
      var immFile = this.props.immExposureStore.getIn(['files', this.props.fileId, 'fileWrapper', 'file']);
      var isDataSelectorMode = this.props.isLarger;
      var showFooter = !immFile.getIn(['monitor', 'taskConfig', 'taskAssignees'], Imm.Set()).isEmpty() && !isDataSelectorMode;

      return div({className: cx('monitor-task-assignees-modal', 'add')},
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'},
            this.state.modalHeader)),
        div({className: 'modal-dialog-main'}, content.body),
        div({className: 'modal-dialog-footer'},
          showFooter ? div(null,
            hr({className: 'sharing-modal-footer-separator'}),
            div({className: cx('footer-link', 'edit-monitor-task-assignees-link'), onClick: this.toggleContentPane},
              span({className: cx('icon', content.footer.icon)}),
              span({className: cx('text-link')}, content.footer.text)
            )
          ) : null
        )
      );
    }
  },

  RoleDefinitions: class extends React.Component {
    static displayName = 'RoleDefinitions';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'},
          span({className: 'modal-dialog-header-text'}, FrontendConstants.ROLES)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, FrontendConstants.USERS_CAN_PERFORM_THE_FOLLOWING_ACTIONS),
          div({className: 'role-definitions'},
            div({className: 'virtual-table'},
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell column-title no-border'}),
                div({className: 'virtual-table-cell column-title no-border'}, FrontendConstants.BASIC),
                div({className: 'virtual-table-cell column-title no-border'}, FrontendConstants.ADVANCED),
                div({className: 'virtual-table-cell column-title no-border'}, FrontendConstants.ADMIN)
              ),
              div({className: 'virtual-table-row section-title'},
                div({className: 'virtual-table-cell span-columns no-border'}, FrontendConstants.REPORTS_DASHBOARDS_FOLDERS_MONITORS),
                div({className: 'virtual-table-cell no-border'}),
                div({className: 'virtual-table-cell no-border'}),
                div({className: 'virtual-table-cell no-border'})
              ),

              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'}, FrontendConstants.VIEW_EDIT_SHARE_MOVE),
                div({className: 'virtual-table-cell icon-checkmark-full'}),
                div({className: 'virtual-table-cell icon-checkmark-full'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border-right'})
              ),
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'}, FrontendConstants.DELETE_IF_OWNER),
                div({className: 'virtual-table-cell icon-checkmark-full'}),
                div({className: 'virtual-table-cell icon-checkmark-full'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border-right'})
              ),
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'}, FrontendConstants.CREATE_ANALYTICS_DASHBOARDS_FOLDERS),
                div({className: 'virtual-table-cell'}),
                div({className: 'virtual-table-cell icon-checkmark-full'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border-right'})
              ),
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell no-border-bottom'}, FrontendConstants.CREATE_EDIT_MONITOR_DEFINITION),
                div({className: 'virtual-table-cell no-border-bottom'}),
                div({className: 'virtual-table-cell no-border-bottom'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border'})
              ),
              div({className: 'virtual-table-row section-title'},
                div({className: 'virtual-table-cell column-span no-border'}, FrontendConstants.OTHER),
                div({className: 'virtual-table-cell no-border'}),
                div({className: 'virtual-table-cell no-border'}),
                div({className: 'virtual-table-cell no-border'})
              ),
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell'}, FrontendConstants.CREATE_EDIT_DELETE_USERS),
                div({className: 'virtual-table-cell'}),
                div({className: 'virtual-table-cell'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border-right'})
              ),
              div({className: 'virtual-table-row'},
                div({className: 'virtual-table-cell no-border-bottom'}, FrontendConstants.CREATE_EDIT_DELETE_SCHEMAS),
                div({className: 'virtual-table-cell no-border-bottom'}),
                div({className: 'virtual-table-cell no-border-bottom'}),
                div({className: 'virtual-table-cell icon-checkmark-full no-border'})
              )
            )
          )
        )
      )
    }
  },

  /**
   *  This modal wraps around the ExposureAction exportFileData. The props for this modal are one in the
   * same as the required parameters for that API, with additional modal-related props
   */
  DownloadFile: class extends React.Component {
    static displayName = 'DownloadFile';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      fileId: PropTypes.string.isRequired,
      drilldownId: PropTypes.string,
      downloadType: PropTypes.string.isRequired,
      builtinFilterRequestWrapper: PropTypes.instanceOf(Imm.Map),
      dataDiffRequest: PropTypes.instanceOf(Imm.Map),
      auditReport: PropTypes.string  // Specify this to download an audit trail report
    };

    // Trigger the download once the component mounts
    componentDidMount() {
      if (this.props.auditReport) {
        ExposureActions.exportAuditData(this.props.auditReport);
      }
      else {
        ExposureActions.exportFileData(this.props.fileId, this.props.drilldownId, this.props.downloadType, this.props.builtinFilterRequestWrapper, this.props.dataDiffRequest);
      }
    }

    render() {
      return (
        div(null,
          div({className: 'modal-dialog-header'},
            span({className: 'modal-dialog-header-text'}, 'Downloading File')),
          div({className: 'modal-dialog-main'},
            span({className: 'modal-dialog-content-text'}, 'Preparing download, please wait for the download to finish.')),
            div({className: 'modal-dialog-footer'},
              Button({
                icon: 'icon icon-close',
                children: FrontendConstants.CLOSE,
                isPrimary: true,
                onClick: this.props.handleCancel})
            )
          )
        );
      }
  },

  DataReviewExportImport: class extends React.Component {
    static displayName = 'Begin Review';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      exportFile: PropTypes.func.isRequired,
      importFile: PropTypes.func.isRequired
    };

    render() {
      return (
        div(null,
          div({className: 'modal-dialog-header'},
            span({className: 'modal-dialog-header-text'}, 'Begin Review')),
          div({className: 'modal-dialog-main'},
            div(null,
              span({className: 'modal-dialog-content-text'},
                `To review data for this Data Review Set, click “Download Review File” to download an Excel file of 
                the data. Or to upload a Data Review Set that you have reviewed, click "Import Review File."`)),
            div({className: 'modal-dialog-inherit-note'}, Button({
              children: FrontendConstants.DATA_REVIEW_EXPORT_FILE,
              isPrimary: true,
              onClick: this.props.exportFile
            }), Button({
              children: FrontendConstants.DATA_REVIEW_IMPORT_FILE,
              isPrimary: true,
              onClick: this.props.importFile
            }))
/*
            ,
            div({className: 'modal-dialog-inherit-note'},
              span({className: 'modal-dialog-content-text'},
                `In the last column, titled “Reviewed”, indicate with an ‘x’ each row you want to mark as reviewed.\n
                Once finished, save the file and import it using the “Import Review File” button below.`)),
            div({className: 'modal-dialog-inherit-note'}, Button({
              children: FrontendConstants.DATA_REVIEW_IMPORT_FILE,
              isPrimary: true,
              onClick: this.props.importFile
            })),
            div({className: 'modal-dialog-inherit-note'},
              span({className: 'modal-dialog-content-text'},
                `You may also import a review file from the Data Review Set at any time by clicking “Import Review 
                File” after opening the Data Review Set.`))
*/
          )
        )
      )
    }
  },
  /**
   *  This modal wraps around the download as csv for large data referring to COM-2781
   */
  DownloadConfirmation: class extends React.Component {
    static displayName = 'DownloadConfirmation';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleDownload: PropTypes.func.isRequired,
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, FrontendConstants.DOWNLOAD)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, FrontendConstants.DOWNLOAD_DELAY_CONFIRMATION_MESSAGE)),
        div({className: 'modal-dialog-footer'},
        Button({
          children: FrontendConstants.CONFIRM,
          isPrimary: true,
          onClick: this.props.handleDownload}),
        Button({
          children: FrontendConstants.CANCEL,
          isSecondary: true,
          onClick: this.props.handleCancel}))
      );
    }
  },

  SaveContinueWarning: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleSave: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired,
      message: PropTypes.string.isRequired
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, this.props.message)),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.OK,
            isPrimary: true,
            onClick: this.props.handleCancel}),
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})
        ));
    }
  },

  SnapshotReplace: class extends React.Component {
    static displayName = 'SnapshotReplace';
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleSave: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired,
    /*   message: PropTypes.string.isRequired */
    };
    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, /* this.props.message */)),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.SNAPSHOT_NO,
            isSecondary: true,
            onClick: this.props.handleCancel}),
            Button({
              children: FrontendConstants.SNAPSHOT_YES,
              isPrimary: true,
              onClick: this.props.handleSave}),
        ));
    }
  },

  ResetContinueTaskManagement: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleContinue: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, FrontendConstants.TASK_MANAGEMENT_RESET_DEPENDENCY_MESSAGE)),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.CONTINUE,
            isPrimary: true,
            onClick: this.props.handleContinue}),
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})
        ));
    }
  },

  DeleteAttributeConfirmation: class extends React.Component {
    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleContinue: PropTypes.func.isRequired,
      header: PropTypes.string.isRequired
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.header)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, FrontendConstants.TASK_MANAGEMENT_DELETE_ATTRIBUTE_MESSAGE)),
        div({className: 'modal-dialog-footer'},
          Button({
            children: FrontendConstants.CONTINUE,
            isPrimary: true,
            onClick: this.props.handleContinue}),
          Button({
            icon: 'icon icon-remove',
            children: FrontendConstants.CANCEL,
            isSecondary: true,
            onClick: this.props.handleCancel})
        ));
    }
  },
  MultiSortSettings: class extends React.Component {
    static displayName = 'MultiSortSettings';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleMultiSort: PropTypes.func.isRequired,
    };
    state = {
      multiSortEnabledColumns : JSON.parse(JSON.stringify(this.props.multiSortColumns))
    }
    handleSortAddRow = (idx) =>{
      let multiSortEnabledColumns = this.state.multiSortEnabledColumns;
      let defaultRow = JSON.parse(JSON.stringify(this.props.defaultSortInitValue));
      multiSortEnabledColumns.splice(idx + 1, 0, defaultRow);
      this.setState({
        multiSortEnabledColumns: multiSortEnabledColumns
      });
    }
    handleSortDeleteRow = (idx) =>{
      let multiSortEnabledColumns = this.state.multiSortEnabledColumns;
      multiSortEnabledColumns.splice(idx, 1);
      this.setState({
        multiSortEnabledColumns: multiSortEnabledColumns
      });
    }

    handleSortColumnChange = (value, row) =>{
      let multiSortEnabledColumns = this.state.multiSortEnabledColumns;
      multiSortEnabledColumns[row].field = value;
      this.setState({
        multiSortEnabledColumns: multiSortEnabledColumns
      });
    }
    handleSortOrderChange = (value, row) =>{
      let multiSortEnabledColumns = this.state.multiSortEnabledColumns;
      multiSortEnabledColumns[row].order = value;
      this.setState({
        multiSortEnabledColumns: multiSortEnabledColumns
      });
    }

    resetMultiSort = () =>{
      this.props.resetMultiSort();
      this.setState({
        multiSortEnabledColumns: [JSON.parse(JSON.stringify(this.props.defaultSortInitValue))]
      });      
    }

    render() {
      const sortOrder = Imm.fromJS([
        {value: 1, label: FrontendConstants.ASCENDING},
        {value: -1, label: FrontendConstants.DESCENDING}
      ]);
      var tableBody = this.state.multiSortEnabledColumns.map((val, idx) =>{
        return div({className: 'sort-row body', key: idx},
                div({className: 'sort-cell empty-cell'}, idx == 0 ? FrontendConstants.SORT_BY : FrontendConstants.THEN_BY),
                div({className: 'sort-cell'}, Combobox({
                  options: Imm.fromJS(this.props.tableColumns),
                  value: val.field,
                  placeholder: FrontendConstants.SELECT_COLUMN,
                  onChange: (value) => {this.handleSortColumnChange(value, idx)}
                })),
                div({className: 'sort-cell'}, Combobox({
                  options: sortOrder,
                  value: val.order,
                  placeholder: FrontendConstants.SELECT_ORDER,
                  onChange: (value) => {this.handleSortOrderChange(value, idx)}
                })),
                div({className: 'sort-cell empty-cell'}, span({
                  className: 'icon icon-plus-circle2 add-icon',
                  onClick: this.handleSortAddRow.bind(null, idx)
                }), idx > 0 ? span({
                  className: 'icon icon-remove',
                  onClick: this.handleSortDeleteRow.bind(null, idx)
                }): "")
              )
      })
      return div({className: 'multi-sort-settings-modal'},
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, FrontendConstants.MULTI_LEVEL_SORT)),
        div({className: 'modal-dialog-main'},
          div({className: 'sort-column-table'},
            div({className: 'sort-row header'},
              div({className: 'sort-cell empty-cell'}, ''),
              div({className: 'sort-cell'}, FrontendConstants.COLUMN),
              div({className: 'sort-cell'}, FrontendConstants.DISPLAY_ORDER),
              div({className: 'sort-cell empty-cell'}, FrontendConstants.ACTIONS)
            ),
            div({className: 'table-body'}, tableBody)
          )
        ),
        div({className: 'modal-dialog-footer'},
          Button({
          children: FrontendConstants.RESET,
          isSecondary: true,
          onClick: this.resetMultiSort}),
          Button({
            children: FrontendConstants.OK,
            isPrimary: true,
            onClick: this.props.handleMultiSort.bind(null, this.state.multiSortEnabledColumns)})         
        )
      );
    }
  },
  DashboardFilterConfirmation: class extends React.Component {
    static displayName = 'DashboardFilterConfirmation';

    static propTypes = {
      handleCancel: PropTypes.func.isRequired,
      handleConfirm: PropTypes.func.isRequired,
      message: PropTypes.string.isRequired
    };

    render() {
      return div(null,
        div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, FrontendConstants.CONFIRM)),
        div({className: 'modal-dialog-main'},
          span({className: 'modal-dialog-content-text'}, this.props.message)),
        div({className: 'modal-dialog-footer align-right'},
        Button({
          children: FrontendConstants.CANCEL,
          isSecondary: true,
          onClick: this.props.handleCancel}),
        Button({
          children: FrontendConstants.CONFIRM,
          isPrimary: true,
          onClick: this.props.handleConfirm}))
      );
    }
  },
};

module.exports = _.extend(ModalDialogContent, ModalDialogContentExtended);
