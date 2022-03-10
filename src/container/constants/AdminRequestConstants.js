import keymirror from 'keymirror';

const requestConstants = keymirror({
  LOAD_ALL_USERS: null,
  LOAD_ALL_USERS_FOR_WORKFLOW: null,
  LOAD_DATA_ACCESS_GROUPS: null,
  UPDATE_DATA_ACCESS_GROUPS_FOR_USER_ENTITIES: null,
  UPDATE_USER_ENTITY_PERMISSIONS: null,
});

module.exports = requestConstants;
export default requestConstants;
