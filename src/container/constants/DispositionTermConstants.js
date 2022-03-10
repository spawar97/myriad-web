import keymirror from 'keymirror';

export const actions = keymirror({
  DISPOSITION_FETCH_CONFIG: null,
  DISPOSITION_UPDATE_CONFIG: null,
  DISPOSITION_DELETE_CONFIG: null,
  DISPOSITION_CREATE_CONFIG: null,
  DISPOSITION_CREATE_ALL: null,
  DISPOSITION_FETCH_USDM_EVENTS: null,
  DISPOSITION_FETCH_CUSTOMER_EVENTS: null,
});

export const StateKey = keymirror({
  ACTIVE: null,
  WITHDRAWN: null,
  COMPLETED: null,
});

export const DispositionState = {
  ACTIVE: 'Active',
  WITHDRAWN: 'Withdrawn',
  COMPLETED: 'Completed',
};

export const USDMEventKey = keymirror({
  NONE: null,
  EVENT_SCREENED: null,
  EVENT_SCREEN_FAILURE: null,
  EVENT_RANDOMIZED: null,
  EVENT_RANDOMIZATION_FAILURE: null,
  EVENT_ENROLLED: null,
  EVENT_EARLY_EOT: null,
  EVENT_END_OF_TREATMENT: null,
  EVENT_COMPLETED: null,
  EVENT_LOST_TO_FOLLOW_UP: null,
  EVENT_WITHDRAWN: null,
  EVENT_DISCONTINUED: null,
});
