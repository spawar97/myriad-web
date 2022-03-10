const Imm = require('immutable');

const AccountUtil = require('./AccountUtil');
const ComprehendSchemaUtil = require('./ComprehendSchemaUtil');


const AdminStoreHelpers = {
  /**
   * Determines if there are any unsaved changes in the Admin/Aperture/Architect
   * UI.
   * @returns {Boolean} Whether there are unsaved changes in the AdminStore.
   */
  isDirty(immAdminStore) {
    const hasUserSchemaChanges = AccountUtil.isLegacyAccount(immAdminStore) ? !immAdminStore.get('schemaUsersChangeList').isEmpty() : false;
    const hasSchemaChanges = !Imm.is(ComprehendSchemaUtil.stripCsMetadata(immAdminStore.get('workingCs')), ComprehendSchemaUtil.stripCsMetadata(immAdminStore.get('loadedCs')));
    
    return hasUserSchemaChanges || hasSchemaChanges;
  }
};

module.exports = AdminStoreHelpers;
