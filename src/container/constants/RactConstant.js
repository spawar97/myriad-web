import FrontendConstants from './FrontendConstants';
import keymirror from 'keymirror';

export default {
  GROUP_OPTIONS: {
    NONE: FrontendConstants.OVERSIGHT_GROUP_BY_NONE,
    CRO: FrontendConstants.CRO,
    SPONSOR: FrontendConstants.SPONSOR,
    THERAPEUTIC_AREA: FrontendConstants.THERAPEUTIC_AREA,
    PROGRAM: FrontendConstants.PROGRAM,
    STATUS: FrontendConstants.STATUS,
    INDICATION: FrontendConstants.INDICATION,
    STUDY_PHASE: FrontendConstants.STUDY_PHASE,
  },

  NUM_ITEMS_PER_BATCH: 50,

  SORT_OPTIONS: {
    STUDY_NAME_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.STUDY_NAME),
    STUDY_NAME_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.STUDY_NAME),
    RISK_SCORE_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.RISK_SCORE),
    RISK_SCORE_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.RISK_SCORE),
    MITIGATION_PROGRESS_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.MITIGATION_PROGRESS),
    MITIGATION_PROGRESS_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.MITIGATION_PROGRESS),
    RACT_STATUS_ASCENDING: FrontendConstants.ASCENDING_ORDER(FrontendConstants.RACT_STATUS),
    RACT_STATUS_DESCENDING: FrontendConstants.DESCENDING_ORDER(FrontendConstants.RACT_STATUS),
  },

  SCORE_DEFAULT_COLORS: {
    BAD: '#D90700', //red
    MEDIUM: '#CF9F00', //amber
    GOOD: '#48CC00', //green
    INVALID: '#9B9B9B', //grey
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

export const actions = keymirror({
  RACT_HANDLE_DRILLDOWN: null,
});

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
  SPONSOR: null,
  STATE: null,
  STATUS: null,
  STUDY: null,
  STUDY_PHASE: null,
  THERAPEUTIC_AREA: null,
  NONE: null,
  loadingFileDrillDownId:null,
  PRIME_TABLE_DATA: null,
});

export const RactStoreKeys = {
  RACT_CONSOLE_DATA: FrontendConstants.RACT_CONSOLE_DATA,
  RACT_STUDY_FILTER_ARRAY: FrontendConstants.RACT_STUDY_FILTER_ARRAY,
  IS_RACT_ASSIGNED: FrontendConstants.IS_RACT_ASSIGNED,
  IS_RACT_CONSOLE_DATA_LOADED: FrontendConstants.IS_RACT_CONSOLE_DATA_LOADED,
};

export const SortKeys = keymirror({
  STUDY_NAME_ASCENDING: null,
  STUDY_NAME_DESCENDING: null,
  RISK_SCORE_ASCENDING: null,
  RISK_SCORE_DESCENDING: null,
  MITIGATION_PROGRESS_ASCENDING: null,
  MITIGATION_PROGRESS_DESCENDING: null,
  RACT_STATUS_ASCENDING: null,
  RACT_STATUS_DESCENDING: null,

});
