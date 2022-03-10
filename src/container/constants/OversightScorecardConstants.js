import FrontendConstants from './FrontendConstants';
import keymirror from 'keymirror';

export const actions = keymirror({
  OVERSIGHT_FETCH_METRIC_DEFAULTS: null,
  OVERSIGHT_FETCH_METRICS: null,
  OVERSIGHT_CREATE_METRIC_CONFIGURATION: null,
  OVERSIGHT_UPDATE_METRIC_CONFIGURATION: null,
  OVERSIGHT_DELETE_METRIC_CONFIGURATION: null,
  OVERSIGHT_FETCH_SCORECARD_DATA: null,
  OVERSIGHT_FETCH_SCORECARD_FILTER_DATA: null,
  OVERSIGHT_FETCH_METRIC_IDS: null,
  OVERSIGHT_APPLY_DRILL_DOWN_STUDIES: null,
  OVERSIGHT_HANDLE_DRILLDOWN: null,
  OVERSIGHT_SET_DROPDOWN_FILTER_SELECTION: null,
  OVERSIGHT_RESET_INCLUDED_DYNAMIC_FILTER: null,
  OVERSIGHT_TOGGLE_NULL_FILTER: null,
  OVERSIGHT_RESET_ALL_FILTERS: null,
  OVERSIGHT_FLUSH_ALL_FILTERS: null,
  OVERSIGHT_APPLY_CLIENT_FILTERS: null,
  OVERSIGHT_FETCH_METRIC_GROUPS: null,
  OVERSIGHT_ADD_METRIC_GROUP: null,
  OVERSIGHT_DELETE_METRIC_GROUP: null,
  OVERSIGHT_EDIT_METRIC_GROUP: null,
  OVERSIGHT_EDIT_DEFAULT_METRIC_GROUP: null,
  OVERSIGHT_SELECT_METRIC_GROUP: null,
  OVERSIGHT_STORE_STATE:null,
  OVERSIGHT_VIEW_SITES_STATE:null,
  OVERSIGHT_CACHE_INCLUDED_FILTERS:null,
  OVERSIGHT_FETCH_MILESTONELABEL:null,
});

export default {
  GROUP_OPTIONS: {
    STUDY: {
      NONE: FrontendConstants.OVERSIGHT_GROUP_BY_NONE,
      CRO: FrontendConstants.CRO,
      SPONSOR: FrontendConstants.SPONSOR,
      THERAPEUTIC_AREA: FrontendConstants.THERAPEUTIC_AREA,
      PROGRAM: FrontendConstants.PROGRAM,
      STATUS: FrontendConstants.STATUS,
      INDICATION: FrontendConstants.INDICATION,
      STUDY_PHASE: FrontendConstants.STUDY_PHASE,
    },

    SITE: {
      NONE: FrontendConstants.OVERSIGHT_GROUP_BY_NONE,
      CRO: FrontendConstants.CRO,
      STUDY: FrontendConstants.STUDY,
      STATE: FrontendConstants.STATE,
      COUNTRY: FrontendConstants.COUNTRY,
      REGION: FrontendConstants.REGION,
      CRA: FrontendConstants.CRA,
      INVESTIGATOR: FrontendConstants.INVESTIGATOR,
    },
  },

  NUM_ITEMS_PER_BATCH: 50,

  SCORECARD_OPTIONS: {
    STUDY: FrontendConstants.STUDY,
    SITE: FrontendConstants.SITE,
  },

  SORT_OPTIONS: {
    NAME_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.NAME),
    NAME_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.NAME),
    SCORE_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.SCORE),
    SCORE_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.SCORE),
  },

  SCORE_DEFAULT_COLORS: {
    BAD: '#D90700', //red
    MEDIUM: '#CF9F00', //amber
    GOOD: '#48CC00', //green
    INVALID: '#9B9B9B', //grey
  },

  VIEW_OPTIONS: keymirror({
    GRID_VIEW: null,
    TABULAR_VIEW: null,
  }),

  METRIC_STATUSES: {
    ENABLED: 'enabled',
    DISABLED: 'disabled',
  },

  DISPLAY_SETTING_LABEL_DEFAULTS: {
    BAD: 'Critical',
    MEDIUM: 'Poor',
    GOOD: 'Good',
  },

  EDIT_MODES: keymirror({
    JSON: null,
    WEB_FORM: null,
  }),
};

export const Key = keymirror({
  COUNTRY: null,
  CRA: null,
  CRO: null,
  DISABLED: null,
  ENABLED: null,
  INDICATION: null,
  INVESTIGATOR: null,
  PROGRAM: null,
  REGION: null,
  SITE: null,
  SITE_AND_STUDY: null,
  SPONSOR: null,
  STATE: null,
  STATUS: null,
  STUDY: null,
  STUDY_PHASE: null,
  THERAPEUTIC_AREA: null,
  NONE: null,
});

export const SortKeys = keymirror({
  NAME_ASCENDING: null,
  NAME_DESCENDING: null,
  SCORE_ASCENDING: null,
  SCORE_DESCENDING: null,
});
