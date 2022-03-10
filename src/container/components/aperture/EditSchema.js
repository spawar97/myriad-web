var React = require('react');
var createReactClass = require('create-react-class');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var BatchEditControlPanel = React.createFactory(require('./BatchEditControlPanel'));
var BatchEditTable = React.createFactory(require('./BatchEditTable'));
var EditSchemaTitleBar = React.createFactory(require('./EditSchemaTitleBar'));
var SchemaSummary = React.createFactory(require('./SchemaSummary'));
var SimpleTable = React.createFactory(require('./SimpleTable'));
var SchemaTreeView = React.createFactory(require('../SchemaTreeView'));
var AdminActions = require('../../actions/AdminActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var ModalConstants = require('../../constants/ModalConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');
var SaveModeConstants = require('../../constants/SaveModeConstants');
var ComprehendSchemaUtil = require('../../util/ComprehendSchemaUtil');
import AdminStoreHelpers from '../../util/AdminStoreHelpers';
import { withTransitionHelper } from '../RouterTransitionHelper';

var div = DOM.div;

var EditSchema = createReactClass({
  displayName: 'EditSchema',

  propTypes: {
    height: PropTypes.number,
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number,
    params: PropTypes.shape({
      schemaId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  componentDidMount: function() {
    AdminActions.loadDatasources(this.props.params.schemaId);
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    var currentImmAdminStore = this.props.immAdminStore;
    var nextImmAdminStore = nextProps.immAdminStore;
    var currentIsLoading = ComprehendSchemaUtil.isComprehendSchemaLoading(currentImmAdminStore);
    var nextIsLoading = ComprehendSchemaUtil.isComprehendSchemaLoading(nextImmAdminStore);

    return this.props.width !== nextProps.width || this.props.height !== nextProps.height || !_.isEqual(this.state, nextState) ||
      currentIsLoading !== nextIsLoading ||
      !Imm.is(currentImmAdminStore.get('workingCs'), nextImmAdminStore.get('workingCs')) ||
      !Imm.is(currentImmAdminStore.get('datasources'), nextImmAdminStore.get('datasources')) ||
      !Imm.is(currentImmAdminStore.get('tableRowCounts'), nextImmAdminStore.get('tableRowCounts')) ||
      !Imm.is(currentImmAdminStore.get('tvSearchState'), nextImmAdminStore.get('tvSearchState')) ||
      currentImmAdminStore.get('batchEditEnabled') !== nextImmAdminStore.get('batchEditEnabled');
  },

  componentWillReceiveProps: function(nextProps) {
    // When 'CheckAllUniqueness' dialog is open and the status of the columns' uniqueness is changed, we check if all uniqueness is verified.
    // If that is the case, we hide the 'CheckAllUniqueness' dialog and display the 'SaveDeployWarning' dialog.  Otherwise, we update the
    // content (icons in particular) of the 'CheckAllUniqueness' dialog.
    var modalContent = this.props.immAdminStore.get('modalContent');
    if (modalContent && modalContent.type.displayName === 'CheckAllUniqueness') {
      if (ComprehendSchemaUtil.allUniquenessVerified(this.props.immAdminStore.getIn(['workingCs', 'datasources']))) {
        AdminActions.displayModal(ModalConstants.MODAL_SAVE_DEPLOY_WARNING, {saveFunction: this.handleSaveAndDeploy});
      } else if (!Imm.is(this.props.immAdminStore.get('workingCs'), nextProps.immAdminStore.get('workingCs'))) {
        AdminActions.displayModal(ModalConstants.MODAL_CHECK_ALL_UNIQUENESS, {immAdminStore: nextProps.immAdminStore});
      }
    }
  },

  getInitialState: function() {
    return {
      doResize: false,
      tvSearchText: null
    };
  },

  handleSaveAndDeploy: function() {
    let that = this;
    const saveMode = _.isEmpty(this.props.params.schemaId) ? SaveModeConstants.CREATE : SaveModeConstants.EDIT;
    const callback = () => {
      that.context.router.push(RouteNameConstants.APERTURE_SCHEMAS);
    };

    AdminActions.saveAndDeployComprehendSchema(saveMode, callback);
  },

  handleTvSearch: function(immTvSearchState, e) {
    if (!this.props.immAdminStore.getIn(['tvSearchState', 'searchInProgress'])) {
      AdminActions.updateEditSchemaSearchInProgress(true);
    }
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
    }
    var newTvSearchText = e.target.value;
    this.searchTimeoutId = setTimeout(AdminActions.updateTvSearch.bind(null, immTvSearchState, newTvSearchText, false), ExposureAppConstants.TREE_VIEW_SEARCH_TIMEOUT);
    this.setState({tvSearchText: newTvSearchText});
  },

  isDirty: function() {
    return AdminStoreHelpers.isDirty(this.props.immAdminStore);
  },

  onSaveAndDeploy: function() {
    if (ComprehendSchemaUtil.allUniquenessVerified(this.props.immAdminStore.getIn(['workingCs', 'datasources']))) {
      AdminActions.displayModal(ModalConstants.MODAL_SAVE_DEPLOY_WARNING, {saveFunction: this.handleSaveAndDeploy});
    } else {
      AdminActions.displayModal(ModalConstants.MODAL_CHECK_ALL_UNIQUENESS);
    }
  },

  resizeHandler: function() {
    this.setState({doResize: true}, function() {
      this.setState({doResize: false});
    });
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;

    if (ComprehendSchemaUtil.isComprehendSchemaLoading(immAdminStore)) {
      return div({className: 'overlay'}, div({className: 'spinner'}));
    }

    var immWorkingCs = immAdminStore.get('workingCs');
    var accountIsLegacy = immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);
    var creatingNewSchema = _.isNull(immAdminStore.getIn(['loadedCs', 'name'], null));
    // `selectedNodeKeyPath`: ['workingCs', 'datasources', << datasource short name >>, 'tables', << table short name >>]
    var immSelectedNodeKeyPath = immWorkingCs.get('selectedNodeKeyPath', null);
    var immSelectedNode = immSelectedNodeKeyPath ? immAdminStore.getIn(immSelectedNodeKeyPath) : null;

    var heightBelowTitleBar = this.props.height - 54;
    // 310 here comes from the 60 for padding + 250 for sidenav.
    var mainWindowWidth = this.props.width - 310;
    var schemaName = immWorkingCs.get('name') || 'Comprehend ' + immAdminStore.get('currentTab');
    var immTvSearchState = immAdminStore.get('tvSearchState');

    var tableContent = _.isNull(immSelectedNodeKeyPath) ? null : div(null,
        div({className: 'table-container'},
            SimpleTable({title: BatchEditControlPanel({tvSearchText: this.state.tvSearchText,
                                                       datasourceIsSelected: immSelectedNode.has('tables'),
                                                       immSelectedNode: immSelectedNode,
                                                       isTvSearchByTable: immTvSearchState.get('isTvSearchByTable'),
                                                       batchEditEnabled: immAdminStore.get('batchEditEnabled')}),
                         content: BatchEditTable({immAdminStore: immAdminStore, doResize: this.state.doResize, width: mainWindowWidth})})));

    return div({className: 'admin-tab admin-tab-edit-schema', style: {height: this.props.height, width: this.props.width}},
      EditSchemaTitleBar({onSaveAndDeploy: this.onSaveAndDeploy,
                          schemaName: schemaName,
                          canRenameSchema: !accountIsLegacy || creatingNewSchema}),
      div({className: 'admin-edit-schema', style: {height: heightBelowTitleBar + 'px'}},
        SchemaTreeView({
          height: heightBelowTitleBar,
          width: 250,
          maxDepth: 1,  // We only want to display datasources and tables in the navigation tree view. maxDepth === 2 will also display columns.
          handleTreeItemCheckboxClick: _.partial(AdminActions.updateTreeData, _, 'checkboxState', _),
          handleTreeItemSelection: _.partial(AdminActions.updateTreeData, _, 'selected', true),
          handleTreeItemExpandOrCollapse: _.partial(AdminActions.updateTreeData, _, 'expanded', _),
          handleTvSearch: this.handleTvSearch,
          immAdminStore: this.props.immAdminStore,
          immWorkingCsDatasources: immWorkingCs.get('datasources'),
          datasourcesAreLoading: immAdminStore.get('datasourcesAreLoading'),
          immTvSearchState: immTvSearchState,
          tvSearchText: this.state.tvSearchText}),
        div({className: 'admin-edit-schema-main', style: {height: heightBelowTitleBar + 'px', width: mainWindowWidth + 'px'}},
          div(null,
            div(null,
              div(null,
                SimpleTable({
                  title: 'Summary',
                  content: SchemaSummary({immAdminStore: immAdminStore, resizeHandler: this.resizeHandler, width: mainWindowWidth})
                }))),
            tableContent
        ))
      )
    );
  }
});

module.exports = withTransitionHelper(EditSchema, true);
