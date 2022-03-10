var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var TitleBar = React.createFactory(require('./TitleBar'));
var YutaniUsersTable = React.createFactory(require('./YutaniUsersTable'));
var AdminActions = require('../../actions/AdminActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');

var div = DOM.div;

class LegacyUsers extends React.Component {
  static displayName = 'LegacyUsers';

  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
    height: PropTypes.number,
    width: PropTypes.number
  };

  componentDidMount() {
    AdminActions.getComprehendSchemaList(AdminActions.getLegacyUsers);
  }

  shouldComponentUpdate(nextProps) {
    var currentImmAdminStore = this.props.immAdminStore;
    var nextImmAdminStore = nextProps.immAdminStore;
    var currentIsLoading = this.isLoadingLegacyUsers(currentImmAdminStore);
    var nextIsLoading = this.isLoadingLegacyUsers(nextImmAdminStore);
    return this.props.width !== nextProps.width || this.props.height !== nextProps.height || currentIsLoading !== nextIsLoading ||
      !Imm.is(currentImmAdminStore.get('legacyUsers'), nextImmAdminStore.get('legacyUsers')) ||
      !Imm.is(currentImmAdminStore.get('comprehendSchemaMetadataList'), nextImmAdminStore.get('comprehendSchemaMetadataList')) ||
      !Imm.is(currentImmAdminStore.get('schemaUsersChangeList'), nextImmAdminStore.get('schemaUsersChangeList'));
  }

  isLoadingLegacyUsers = (immAdminStore) => {
    return immAdminStore.get('schemaListIsLoading') || immAdminStore.get('usersAreLoading') || immAdminStore.get('schemaUsersAreLoading') || immAdminStore.get('schemaUsersAreSaving');
  };

  render() {
    var immAdminStore = this.props.immAdminStore;

    return div({className: 'legacy-users'},
        TitleBar({
          tabName: FrontendConstants.USERS,
          buttonText: FrontendConstants.SAVE,
          onClick: AdminActions.saveSchemaUsers
        }),
        YutaniUsersTable({
          isLoading: this.isLoadingLegacyUsers(immAdminStore),
          width: this.props.width,
          height: this.props.height,
          immComprehendSchemaMetadataList: immAdminStore.get('comprehendSchemaMetadataList'),
          immUsers: immAdminStore.get('legacyUsers'),
          immSchemaUsersChangeList: immAdminStore.get('schemaUsersChangeList')
        })
    );
  }
}

module.exports = LegacyUsers;
