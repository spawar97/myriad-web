import Imm from 'immutable';
import {AccessPermissionsConstants} from '../constants/PermissionsConstants';

class PermissionsUtil{
  /**
   * Given the list of different individual module permissions, format the whole permissions message
   * as defined in Rbac.proto.
   * @param oversightScorecardPermissions - Object representing Oversight Scorecard permissions. Constructed
   *                                        by formatOversightScorecardPermissions
   * @param taskPermissions - Object representing Task  permissions. Constructed by formatTaskPermissions
   * @returns Object representing Entity Permissions, parseable into EntityPermissionsWrapper from Rbac.proto
   *
   * @param ractPermissions - Object representing Task  permissions. Constructed by formatRactPermissions
   * @returns Object representing Entity Permissions, parseable into EntityPermissionsWrapper from Rbac.proto
   */
  static formatEntityPermissionsMessage(oversightScorecardPermissions, taskPermissions, ractPermissions) {
    let oversightMessage, taskMessage, ractMessage;
    if(oversightScorecardPermissions != null) {
      oversightMessage = {oversightPermissions: oversightScorecardPermissions};
    }
    if(taskPermissions != null) {
      taskMessage = {taskPermissions: taskPermissions};
    }
    if(ractPermissions != null) {
      ractMessage = {ractPermissions: ractPermissions};
    }

    return _.assign({}, oversightMessage, taskMessage, ractMessage);
  }

  /**
   * Given a few Oversight Scorecard permissions, construct the message data as expected by update APIs,
   * so it can be parsed properly into the corresponding protobuf in Rbac.proto
   * @param privilege              - INHERIT, READ, EDIT, or NONE privilege for Oversight Scorecard
   * @param hasEditDefaultProfile  - If the user can edit the default profile on the Oversight Scorecard configuration page
   * @returns Object representing OS permissions, parseable into OversightEntityPermissions from Rbac.proto
   */
  static formatOversightScorecardPermissions(privilege, hasEditDefaultProfile) {
    return {
      privilege: privilege || AccessPermissionsConstants.NONE,
      canEditDefault: hasEditDefaultProfile || false,
    };
  }

  /**
   * Given a few Task permissions, construct the message data as expected by update APIs,
   * so it can be parsed properly into the corresponding protobuf in Rbac.proto
   * @param privilege              - INHERIT, READ, EDIT, or NONE privilege forTasks
   * @returns Object representing Task permissions, parseable into TaskEntityPermissions from Rbac.proto
   */
  static formatTaskPermissions(privilege) {
    return {
      privilege: privilege || AccessPermissionsConstants.NONE
    };
  }

  /**
   * Given a few Ract permissions, construct the message data as expected by update APIs,
   * so it can be parsed properly into the corresponding protobuf in Rbac.proto
   * @param privilege              - INHERIT, READ, EDIT, or NONE privilege forTasks
   * @returns Object representing Ract permissions, parseable into RactEntityPermissions from Rbac.proto
   */
  static formatRactPermissions(privilege) {
    return {
      privilege: privilege || AccessPermissionsConstants.NONE
    };
  }

  /**
   * Given a feature name, will verify if the currently logged in user has access to that feature
   * Will fall back on group permissions, to check if the user is part of any groups with that permission
   * @param featureName   - Name of the feature to check
   * @param accessLevel (Default: READ) - The access level to check for
   * @returns {boolean}   - Whether the logged in user has access
   */
  static checkLoggedInUserHasAccessForFeature(featureName, accessLevel = AccessPermissionsConstants.READ) {
    const {immAppConfig} = comprehend.globals;
    const userId = immAppConfig.getIn(['userInfo', 'id']);
    const immUserWrappers = immAppConfig.get('userWrappers');
    const immUserEntity = immUserWrappers.find(x => x.getIn(['user', 'id']) === userId).get('userEntity');
    const immGroupEntities = immAppConfig.get('groupEntities');
    const immUserGroups = immGroupEntities.filter(immGroupEntity => immGroupEntity.get('userIds').contains(userId));
    if (PermissionsUtil.checkEntityHasAccessForFeature(immUserEntity, featureName, accessLevel)
      || PermissionsUtil.hasInheritedAccessForFeature(immUserEntity, immUserGroups, featureName, accessLevel)) {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Checks if the logged in user has the specified permission for a specific feature.
   * NOTE - THIS DOES NOT FALLBACK ON GROUP PERMISSIONS, OR VICE VERSA
   * @param featureName      - Name of the feature
   * @param permissionName   - Name of the permission to check for
   * @param permissionValue  - The value for the permission to validate
   * @returns {boolean}      - Whether the logged in user has the specified permission
   */
  static checkLoggedInUserHasPermissionForFeature(featureName, permissionName, permissionValue) {
    const {immAppConfig} = comprehend.globals;
    const userId = immAppConfig.getIn(['userInfo', 'id']);
    const immUserWrappers = immAppConfig.get('userWrappers');
    const immUserEntity = immUserWrappers.find(x => x.getIn(['user', 'id']) === userId).get('userEntity');
    return PermissionsUtil.checkEntityHasPermissionForFeature(immUserEntity, featureName, permissionName, permissionValue);
  }


  /**
   * Checks whether the user or group entity has access for a feature
   * @param immEntity     - User or group entity
   * @param featureName   - Name of the feature to check access for
   * @param accessLevel (Default: READ) - Level of access to check
   * @returns {boolean}   - Whether the entity has the specified access
   */
  static checkEntityHasAccessForFeature(immEntity, featureName, accessLevel = AccessPermissionsConstants.READ) {
    const featurePrivilege = PermissionsUtil.getEntityPrivilegeForFeature(immEntity, featureName);

    switch (accessLevel) {
      case AccessPermissionsConstants.INHERIT:
        return featurePrivilege === AccessPermissionsConstants.INHERIT;
      // If the access level to check for is NONE... then check if the entity doesn't have access as well
      case AccessPermissionsConstants.NONE:
        return featurePrivilege === AccessPermissionsConstants.NONE;
      // If checking READ - if the entity has READ or EDIT then they have READ access to the feature
      case AccessPermissionsConstants.READ:
        return featurePrivilege === AccessPermissionsConstants.READ
          || featurePrivilege === AccessPermissionsConstants.EDIT;
      // If checking EDIT - entity only has edit privilege if explicitly assigned EDIT in the feature privilege map
      case AccessPermissionsConstants.EDIT:
        return featurePrivilege === AccessPermissionsConstants.EDIT;
    }
  }


  /**
   * Checks whether the user or group entity has an inherited access for a feature from a higher level access parent
   * @param immEntity     - User or group entity
   * @param immParentEntities  - Parent entities
   * @param featureName   - Name of the feature to check access for
   * @param accessLevel (Default: READ) - Level of access to check
   * @returns {boolean}   - Whether the entity has inherited the specified access
   */
  static hasInheritedAccessForFeature(immEntity, immParentEntities, featureName, accessLevel = AccessPermissionsConstants.READ) {
    const featurePrivilege = PermissionsUtil.getEntityPrivilegeForFeature(immEntity, featureName);
    let hasAccess = false;
    if(featurePrivilege === AccessPermissionsConstants.INHERIT) {
      const inheritedAccess = immParentEntities.map(immParentEntity => {
        return PermissionsUtil.checkEntityHasAccessForFeature(immParentEntity, featureName, accessLevel);
      }).filter(access => access === true);
      hasAccess = inheritedAccess != null && !inheritedAccess.isEmpty();
    }
    return hasAccess;
  }


  /**
   * Gets the privilege an entity has for the specified feature
   * @param immEntity    - The entity to check
   * @param featureName  - The name of the feature to check privilege for
   * @returns {String}   - Privilege level for the specified entity+feature
   */
  static getEntityPrivilegeForFeature(immEntity, featureName, defaultPrivilege) {
    const immFeaturePermissionsMap = PermissionsUtil._getEntityFeaturePermissionsMap(immEntity);
    const immPermissions = PermissionsUtil._getPermissionsForFeature(immFeaturePermissionsMap, featureName);
    const initialPrivilege = defaultPrivilege || AccessPermissionsConstants.NONE;
    return immPermissions.get('privilege', initialPrivilege);
  }

  /**
   * Checks if the user or group entity has permissions for a specific feature. Does not check
   * group permissions if a user entity is passed, or vice versa
   * @param immEntity         - The user or group entity
   * @param featureName       - The name of the feature
   * @param permissionName    - The name of the permission to check for the specified feature
   * @param permissionValue   - The value for the permission being checked
   * @returns {boolean}        - Whether the entity has the specified permission
   */
  static checkEntityHasPermissionForFeature(immEntity, featureName, permissionName, permissionValue) {
    const immFeaturePermissionsMap = PermissionsUtil._getEntityFeaturePermissionsMap(immEntity);
    const immPermissions = PermissionsUtil._getPermissionsForFeature(immFeaturePermissionsMap, featureName);
    const entityPermissionValue = immPermissions.get(permissionName);
    return entityPermissionValue === permissionValue;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Private Methods below
  //////////////////////////////////////////////////////////////////////////////////////////////

  static _getEntityFeaturePermissionsMap(immEntity) {
    const immFeaturePermissions = immEntity.get('featurePermissions', Imm.List());
    return PermissionsUtil._formatPermissionsMap(immFeaturePermissions);
  }

  static _getPermissionsForFeature(immFeatureMap, featureName) {
    return immFeatureMap.get(featureName, Imm.Map());
  }

  static _formatPermissionsMap(immFeaturePermissions) {
    return immFeaturePermissions.groupBy(x => x.get('feature'))
      .map(x => Imm.Map(JSON.parse(x.getIn([0, 'permissions'], '{}'))));
  }

}

export default PermissionsUtil;
