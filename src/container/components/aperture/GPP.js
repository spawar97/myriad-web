var _ = require('underscore');
var Imm = require('immutable');
var React = require('react');
var createReactClass = require('create-react-class');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ComprehendSchemaTable = React.createFactory(require('./ComprehendSchemaTable'));
var EditSchemaTitleBar = React.createFactory(require('./EditSchemaTitleBar'));
var GPPSidebar = React.createFactory(require('./GPPSidebar'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var SchemaTreeView = React.createFactory(require('../SchemaTreeView'));
var AdminActions = require('../../actions/AdminActions');
var ModalConstants = require('../../constants/ModalConstants');
var ComprehendSchemaUtil = require('../../util/ComprehendSchemaUtil');

var div = DOM.div;
var span = DOM.span;

import AdminStoreHelpers from '../../util/AdminStoreHelpers';
import { withTransitionHelper } from '../RouterTransitionHelper';

var GPP = createReactClass({
  displayName: 'GPP',

  propTypes: {
    height: PropTypes.number.isRequired,
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    params: PropTypes.shape({
      schemaId: PropTypes.string
    }).isRequired,
    width: PropTypes.number.isRequired
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function() {
    return {openCurrentTable: true};
  },

  componentDidMount: function() {
    var loadGPP = true;
    AdminActions.loadDatasources(this.props.params.schemaId, loadGPP);
  },

  shouldComponentUpdate: function(nextProps) {
    return this.props.width !== nextProps.width || this.props.height !== nextProps.height ||
      this.props.immAdminStore.get('comprehendSchemaIsLoading') !== nextProps.immAdminStore.get('comprehendSchemaIsLoading') ||
      !Imm.is(this.props.immAdminStore.get('workingCs'), nextProps.immAdminStore.get('workingCs')) ||
      !Imm.is(this.props.immAdminStore.get('tvSearchState'), nextProps.immAdminStore.get('tvSearchState')) ||
      !Imm.is(this.props.immAdminStore.get('workingGPP'), nextProps.immAdminStore.get('workingGPP'));
  },

  handleItemOpener: function() {
    this.setState({openCurrentTable: !this.state.openCurrentTable});
  },

  handleTreeItemSelection: function(immNodePath) {
    if (immNodePath.size > 1) {
      AdminActions.updateTreeData(immNodePath, 'selected', true);
    }
  },

  isDirty: function() {
    return AdminStoreHelpers.isDirty(this.props.immAdminStore);
  },

  onSaveAndDeploy: function() {
    AdminActions.displayModal(ModalConstants.MODAL_SAVE_DEPLOY_WARNING, {saveFunction: AdminActions.saveAndDeployGPPConfig});
  },

  render: function() {
    var immAdminStore = this.props.immAdminStore;
    var immWorkingCs = immAdminStore.get('workingCs');
    var immWorkingGPP = immAdminStore.get('workingGPP');

    if (ComprehendSchemaUtil.isComprehendSchemaLoading(immAdminStore)) {
      return div({className: 'overlay'}, div({className: 'spinner'}));
    }

    var containerHeight = this.props.height - 60;  // 20px for top container padding + 20px for bottom container padding + 20px for tab title.
    var immSelectedNodeKeyPath = immWorkingCs.get('selectedNodeKeyPath');
    var sampleDataWidth = this.props.width - 450;  // 350 is the width of the GPP panel, 100 is the padding between them.
    var immSelectedTable = null;
    var sampleData = null;
    var title = null;
    if (immSelectedNodeKeyPath) {
      immSelectedTable = immWorkingCs.getIn(immSelectedNodeKeyPath.shift());
      title = div({className: 'table-title'},
        ItemOpener({isOpen: this.state.openCurrentTable, onClick: this.handleItemOpener}),
        div(null, immSelectedTable.get('longName')),
        div({className: 'short-name'}, immSelectedTable.get('shortName')));

      if (this.state.openCurrentTable && immSelectedTable.get('tableDataIsLoading')) {
        sampleData = div({className: 'spinner-container'}, div({className: 'spinner'}));
      } else if (this.state.openCurrentTable) {
        sampleData = ComprehendSchemaTable({
          batchEditEnabled: false,
          immTable: immSelectedTable,
          isTvSearchByTable: false,
          shortTables: true,
          width: sampleDataWidth,
          disableEditing: true,
          doResize: false,
          useGivenWidth: true});
      }
    }

    var immDurationCharts = immWorkingGPP.get('charts').filter(function(immChart) { return immChart.get('type') === 'Duration' && immChart.get('tablePath'); });
    var durationChartNames = immDurationCharts.isEmpty() ? '-' : immDurationCharts.map(function(immChart) {
      var longName = immWorkingCs.getIn(immChart.get('tablePath').unshift('datasources').push('longName'));
      var shortName = immChart.get('tablePath').last();
      return span({key: shortName}, longName + ' (' + shortName + ')');
    }, this).toJS();

    var immNumericCharts = immWorkingGPP.get('charts').filter(function(immChart) { return immChart.get('type') === 'Numeric' && immChart.get('mainColumnPath'); });
    var numericChartNames = immNumericCharts.isEmpty() ? '-' : immNumericCharts.map(function(immChart) {
      var tableShortName = immChart.get('tablePath').last();
      var columnLongName = immWorkingCs.getIn(immChart.get('mainColumnPath').unshift('datasources').push('longName'));
      var columnShortName = immChart.get('mainColumnPath').last();
      return span({key: columnShortName}, columnLongName + ' (' + tableShortName + '.' + columnShortName + ')');
    }, this).toJS();

    var summaryComponent = [
      div({key: 'durationSummary'}, div({className: 'list-title'}, 'GPP duration in current schema'), div({className: 'list-items'}, durationChartNames)),
      div({key: 'numericSummary'}, div({className: 'list-title'}, 'GPP numeric in current schema'), div({className: 'list-items'}, numericChartNames))];
    return div({className: 'admin-tab', style: {height: this.props.height, width: this.props.width}},
      EditSchemaTitleBar({hideOptionsDropdown: true, onSaveAndDeploy: this.onSaveAndDeploy, schemaName: immWorkingCs.get('name') + "'s GPP"}),
      div(null,
        div({className: 'admin-tab-gpp', style: {height: containerHeight, width: sampleDataWidth + 25}},  // Outer wrapper is used to create extra space for y-scrollbar.
          div({className: 'admin-tab-gpp-inner', style: {height: containerHeight, width: sampleDataWidth}},
            div({className: 'title'}, 'Summary'),
            div({className: 'summary'}, summaryComponent),
            div({className: 'title'}, 'Sample Data'),
            SchemaTreeView({
              disableToggleButtons: true,
              noSideNavBorder: true,
              columnCheckboxOnly: true,
              noSearchBoxMargin: true,
              height: 300,
              width: sampleDataWidth,
              gppMode: true,
              maxDepth: 1,  // We only want to display datasources and tables in the navigation tree view. maxDepth === 2 will also display columns.
              handleTreeItemCheckboxClick: _.partial(AdminActions.updateTreeData, _, 'checkboxState', _),
              handleTreeItemSelection: this.handleTreeItemSelection,
              handleTreeItemExpandOrCollapse: _.partial(AdminActions.updateTreeData, _, 'expanded', _),
              handleTvSearch: function(immTvSearchState, e) { AdminActions.updateTvSearch(immTvSearchState.set('tvSearchText', e.target.value), true); },
              immWorkingCsDatasources: immWorkingCs.get('datasources'),
              immTvSearchState: immAdminStore.get('tvSearchState')}),
            title,
            sampleData)),
        GPPSidebar({immWorkingCsDatasources: immWorkingCs.get('datasources'), immWorkingGPP: immWorkingGPP, height: containerHeight}))
    );
  }
});

module.exports = withTransitionHelper(GPP, true);
