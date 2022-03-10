module.exports = {
  SITE_SCORECARD_DRILLDOWN_MAPPING:{
    ENROLL_RATE : "Subject Enrollment Rate - Site",
    SITE_ACTIVATION_RATE: "Site Activation - Listing",
    CONSENT_RATE: "Consent Rate - Site",
    SCREEN_FAILURE_RATE: "Screen Failures by Reason - Site",
    RANDOMIZATION_FAILURE_RATE: "Randomization Failures by Reason - Site",
    WITHDRAWAL_RATE: "Subject Withdrawal - Site",
    EVALUABLE_RATE: "Subject Evaluable - Site",
    QUERY_RATE: "Query Rate - Site",
    OPEN_QUERY_RATE: "Query Rate - Site",
    DATA_ENTRY_RATE: "Data Entry Rate - Site",
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_28: "Open & Answered Queries by Age - Site",
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_14: "Open & Answered Queries by Age - Site",
    QUERY_RESOLUTION: "Query Resolution - Site",
    ISSUE_RESOLUTION_30_DAYS: "Issue Resolution - Site",
    ISSUE_RESOLUTION_60_DAYS: "Issue Resolution - Site",
    ISSUE_RESOLUTION_90_DAYS: "Issue Resolution - Site",
    MISSING_DATA:  "Missing Required Field Data - Listing",
    MONITORING_VISITS_PAST_DUE:  "Monitoring Visits Past Due - Country",
    DV_RATE: "Protocol Deviations Rate - Site",
    AE_RATE: "AE Rate per Subject Days - Site",
    SUBJECT_VISIT_COMPLIANCE: "Subject Visit Compliance with Schedule - Site",
    PRIMARY_END_POINT_DATA_ENTRY_RATE: "Primary Endpoint Data Entry Rate - Site"
  },
  
  SITE_SCORECARD_DRILLDOWN_MAPPING_V3: {
    ENROLL_RATE: {
      name: "Subject Enrollment Rate",
      type: "DASHBOARD"
    },
    SITE_ACTIVATION_RATE: {
      name: "Site Activation",
      type: "DASHBOARD"
    },
    CONSENT_RATE: {
      name: "Subject Consent",
      type: "DASHBOARD"
    },
    SCREEN_FAILURE_RATE: {
      name: "Subject Screening",
      type: "DASHBOARD"
    },
    RANDOMIZATION_FAILURE_RATE: {
      name: "Subject Randomization",
      type: "DASHBOARD"
    },
    WITHDRAWAL_RATE: {
      name: "Subject Withdrawal",
      type: "DASHBOARD"
    },
    EVALUABLE_RATE: {
      name: "Evaluable",
      type: "DASHBOARD"
    },
    QUERY_RATE: {
      name: "Query Rate",
      type: "DASHBOARD"
    },
    OPEN_QUERY_RATE: {
      name: "Open Query Rate",
      type: "DASHBOARD"
    },
    DATA_ENTRY_RATE: {
      name: "Data Entry Rate",
      type: "DASHBOARD"
    },
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_28: {
      name: "Open & Answered Queries by Age",
      type: "DASHBOARD"
    },
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_14: {
      name: "Open & Answered Queries by Age",
      type: "DASHBOARD"
    },
    QUERY_RESOLUTION: {
      name: "Query Resolution",
      type: "DASHBOARD"
    },
    ISSUE_RESOLUTION_30_DAYS: {
      name: "Site Issues",
      type: "DASHBOARD"
    },
    ISSUE_RESOLUTION_60_DAYS: {
      name: "Site Issues",
      type: "DASHBOARD"
    },
    ISSUE_RESOLUTION_90_DAYS: {
      name: "Site Issues",
      type: "DASHBOARD"
    },
    MISSING_DATA: {
      name: "Data Completeness",
      type: "REPORT"
    },
    MONITORING_VISITS_PAST_DUE: {
      name: "Monitoring Visits",
      type: "DASHBOARD"
    },
    DV_RATE: {
      name: "Protocol Deviations",
      type: "DASHBOARD"
    },
    AE_RATE: {
      name: "Adverse Events",
      type: "DASHBOARD"
    },
    SUBJECT_VISIT_COMPLIANCE: {
      name: "Subject Compliance",
      type: "DASHBOARD"
    },
    PRIMARY_END_POINT_DATA_ENTRY_RATE: {
      name: "Primary Endpoint Data Entry Rate",
      type: "DASHBOARD"
    }
  },

  SITE_SCORECARD_CONFIG : {
        red    : 'a-red',
        yellow : 'b-yellow',
        green  : 'c-green',
        empty   : 'd-empty',
        targetVariance: 'Target Variance Threshold %',
        maxVariance: 'Max Variance Threshold %',
        planRawUnit: 'RAW',
        planPercentUnit: 'PERCENT',
        emptyTootipMessage: 'The current value cannot be calculated for this site'
  }
};
