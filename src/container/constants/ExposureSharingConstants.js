var _ = require('underscore');
var keymirror = require('keymirror');

/** Top level sharing message
 *
 * message EntityPrivileges {
 *   optional string entityId = 1;
 *   optional RbacEntityType entityType = 2;
 *   optional PrivilegeFieldType privilegeFieldType = 3;
 *   optional PrivilegeField read = 4;
 *   optional PrivilegeField edit = 5;
 *   optional PrivilegeField share = 6;
 *   optional PrivilegeField owner = 7;
 * }
 */
module.exports = _.extend(
  keymirror({
    // PrivilegeCapability.
    // These describe responses from GETing current privileges on a file.
    // Entity has the privilege and can revoke a role on this target to remove this privilege.
    YES_CAN_REVOKE: null,
    // Entity has the privilege but cannot revoke a role on this target to remove this privilege.
    // The privilege could have come from inheritance.
    YES_CANNOT_REVOKE: null,
    // Entity does not have the privilege but can grant a role on this target to give this privilege.
    NO_CAN_GRANT: null,
    // Entity does not have the privilege and cannot grant a role on this target to give this privilege.
    // The entity may not have account-level privilege for this privilege on this type of target.
    NO_CANNOT_GRANT: null,

    // EditPrivilegesRequest.
    // These describe requests for PUTting privilege modifications.
    GRANT: null,
    REVOKE: null,

    // EditPrivilegesResult.
    // These describe responses from PUTting privilege modifications.
    SUCCESS: null,
    FAILURE: null,

    // PrivilegeFieldType.
    // Enum on the EntityPrivilege object that determines what type of message is contained in each of 'read', 'edit', etc.
    PRIVILEGE_CAPABILITIES: null,
    EDIT_PRIVILEGES_REQUEST: null,
    EDIT_PRIVILEGES_RESULT: null,
    SHARE_REQUEST_TYPE_ADD: null,
    SHARE_REQUEST_TYPE_MODIFY: null,

    // UserEntityState.
    ACTIVE: null,
    PENDING_CONFIRMATION: null,
    INACTIVE: null,
    DELETED: null,
    LINK_EXPIRE: null,
  }), {
    // Privileges on a target.
    // These are the privileges contained as keys within the EntityPrivileges object.
    READ: 'read',
    EDIT: 'edit',
    OWNER: 'owner'
});
