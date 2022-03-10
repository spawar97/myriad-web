import keymirror from 'keymirror';
import Imm from 'immutable';
import FrontendConstants from './FrontendConstants';

const FeatureListConstants = keymirror({
  OVERSIGHT_SCORECARD: null,
  TASK: null,
  RACT: null
});

const AccessPermissionsConstants = keymirror({
  INHERIT: null,
  NONE: null,
  READ: null,
  EDIT: null,
});

const OversightScorecardPermissions = keymirror({
  canEditDefault: null,
});
module.exports.OversightScorecardPermissions = OversightScorecardPermissions;

const IndividualPermissions = Imm.List([
    {value: AccessPermissionsConstants.INHERIT, label: FrontendConstants.INHERIT},
    {value: AccessPermissionsConstants.NONE, label: FrontendConstants.NONE},
    {value: AccessPermissionsConstants.READ, label: FrontendConstants.VIEW},
    {value: AccessPermissionsConstants.EDIT, label: FrontendConstants.EDIT},
]);

const GroupPermissions = Imm.List([
  {value: AccessPermissionsConstants.NONE, label: FrontendConstants.NONE},
  {value: AccessPermissionsConstants.READ, label: FrontendConstants.VIEW},
  {value: AccessPermissionsConstants.EDIT, label: FrontendConstants.EDIT},
]);

module.exports.GroupPermissions = GroupPermissions;
module.exports.IndividualPermissions = IndividualPermissions;
module.exports.AccessPermissionsConstants = AccessPermissionsConstants;
module.exports.FeatureListConstants = FeatureListConstants;
