var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var CurrentSchemaTable = React.createFactory(require('./CurrentSchemaTable'));
var SimpleTable = React.createFactory(require('./SimpleTable'));
var TitleBar = React.createFactory(require('./TitleBar'));
var JsonEditor = React.createFactory(require('../JsonEditor'));
var SimpleAction = React.createFactory(require('../SimpleAction'));
var AdminActions = require('../../actions/AdminActions');
var AdminNavConstants = require('../../constants/AdminNavConstants');
var RouteNameConstants = require('../../constants/RouteNameConstants');

var div = DOM.div;

class Schema extends React.Component {
  static displayName = 'Schema';

  static propTypes = {
    height: PropTypes.number,
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number
  };

  static contextTypes = {
    router: PropTypes.object
  };

  componentDidMount() {
    AdminActions.getComprehendSchemaList();
  }

  shouldComponentUpdate(nextProps) {
    return this.props.width !== nextProps.width || this.props.height !== nextProps.height ||
      this.props.immAdminStore.get('schemaListIsLoading') !== nextProps.immAdminStore.get('schemaListIsLoading') ||
      !Imm.is(this.props.immAdminStore.get('comprehendSchemaMetadataList'), nextProps.immAdminStore.get('comprehendSchemaMetadataList')) ||
      !Imm.is(this.props.immAdminStore.get('comprehendSchemaJson'), nextProps.immAdminStore.get('comprehendSchemaJson'));
  }

  getSchema = () => {
    return this.props.immAdminStore.get('comprehendSchemaMetadataList').find(function(immCs) {
      return immCs.get('isSelected');
    });
  };

  handleEditJson = () => {
    var immSchema = this.getSchema();
    AdminActions.getComprehendSchemaJson(immSchema.get('schemaName'), immSchema.get('id'));
  };

  handleEditSchema = () => {
    var immSchema = this.getSchema();
    this.context.router.push({name: RouteNameConstants.APERTURE_SCHEMAS_EDIT, params: {schemaId: immSchema.get('id')}});
  };

  handleEditGPP = () => {
    var immSchema = this.getSchema();
    this.context.router.push({name: RouteNameConstants.APERTURE_SCHEMAS_GPP, params: {schemaId: immSchema.get('id')}});
  };

  render() {
    var immAdminStore = this.props.immAdminStore;

    if (immAdminStore.get('schemaListIsLoading')) {
      return div({className: 'overlay'}, div({className: 'spinner'}));
    }

    var accountIsLegacy = immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);
    var immComprehendSchemaJson = immAdminStore.get('comprehendSchemaJson');
    var immComprehendSchemaMetadataList = immAdminStore.get('comprehendSchemaMetadataList');

    var headerActions = [];
    var schemaSelected = immComprehendSchemaMetadataList.find(function(immCs) { return immCs.get('isSelected'); });
    if (schemaSelected) {
      headerActions.push(
        SimpleAction({key: 'edit-json', class: 'icon-file', text: 'Edit JSON', onClick: this.handleEditJson}),
        SimpleAction({key: 'edit-schema', class: 'icon-pencil', text: 'Edit Schema', onClick: this.handleEditSchema}),
        accountIsLegacy ? SimpleAction({key: 'edit-gpp', class: 'icon-paragraph-left', text: 'GPP', onClick: this.handleEditGPP}) : null);
    }
    return div(
      {className: 'admin-tab admin-tab-schema', style: {height: this.props.height, width: this.props.width}},
      TitleBar({tabName: 'Schema', onClick: function() {
        this.context.router.push(RouteNameConstants.APERTURE_SCHEMAS_NEW);
      }.bind(this)}),
      SimpleTable({
        title: 'Current Schema',
        headerActions: headerActions,
        content: CurrentSchemaTable({immComprehendSchemaMetadataList: immComprehendSchemaMetadataList})
      }),
      immComprehendSchemaJson.get('isActive') ?
        JsonEditor({data: immComprehendSchemaJson.get('data'),
                    error: immComprehendSchemaJson.get('error'),
                    isLoading: immComprehendSchemaJson.get('isLoading'),
                    isSaving: immComprehendSchemaJson.get('isSaving'),
                    width: this.props.width}) : null
    );
  }
}

module.exports = Schema;
