import ImmEmptyQualityAgreement from '../util/ImmEmptyQualityAgreement';
import _ from 'underscore';

let kpis = ImmEmptyQualityAgreement().toJS().kpis;
const KPIS_NEED_CONVERT_SCORE_TO_PERCENT = _.reduce(kpis, (memo, kpi) => {
                                              memo[kpi.id] = (kpi.planUnit === "PERCENT")
                                              return memo;
                                            }, {});
const KPIID_TO_NAME_MAP = _.reduce(kpis, (memo, kpi) => {
                              memo[kpi.id] = kpi.name
                              return memo;
                            }, {});
const CATEGORY_TO_KPIID_MAP = _(kpis).chain().groupBy('category').mapObject(kpis => {
  return _.map(kpis, kpi => kpi.id)
}).value();

module.exports = {
  STUDY_SCORECARD_DRILLDOWN_MAP: {
    ENROLL_RATE : "Subject Enrollment Rate - Study",
    SITE_ACTIVATION_RATE: "Site Activation - Study",
    CONSENT_RATE: "Consent Rate - Study",
    SCREEN_FAILURE_RATE: "Screen Failures by Reason - Study",
    RANDOMIZATION_FAILURE_RATE: "Randomization Failures by Reason - Study",
    WITHDRAWAL_RATE: "Subject Withdrawal - Study",
    EVALUABLE_RATE: "Subject Evaluable - Study",
    QUERY_RATE: "Query Rate - Study",
    OPEN_QUERY_RATE: "Query Rate - Study",
    DATA_ENTRY_RATE: "Data Entry Rate - Study",
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_28: "Open & Answered Queries by Age - Study",
    OPEN_AND_ANSWERED_QUERIES_BY_AGE_14: "Open & Answered Queries by Age - Study",
    QUERY_RESOLUTION: "Query Resolution - Study",
    ISSUE_RESOLUTION_30_DAYS: "Issue Resolution - Study",
    ISSUE_RESOLUTION_60_DAYS: "Issue Resolution - Study",
    ISSUE_RESOLUTION_90_DAYS: "Issue Resolution - Study",
    MISSING_DATA:  "Missing Data per Visit - Study",
    MONITORING_VISITS_PAST_DUE:  "Monitoring Visits Past Due - Study",
    DV_RATE: "Protocol Deviations Rate - Study",
    AE_RATE: "AE Rate per Subject Days - Study",
    SUBJECT_VISIT_COMPLIANCE: "Subject Compliance with Schedule - Study",
    PRIMARY_END_POINT_DATA_ENTRY_RATE: "Primary Endpoint Data Entry Rate - Study"
  },
  
  STUDY_SCORECARD_DRILLDOWN_MAP_V3: {
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
      name: "Subject Evaluable",
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

  KPIS_NEED_CONVERT_SCORE_TO_PERCENT: KPIS_NEED_CONVERT_SCORE_TO_PERCENT,

  KPIID_TO_NAME_MAP: KPIID_TO_NAME_MAP,

  CATEGORY_TO_KPIID_MAP: CATEGORY_TO_KPIID_MAP,

  CATEGORY_TO_CHART_TITLE_MAP: {
    "Subject Compliance" : "Subject Compliance KPIs: Performance against threshold",
    "Enrollment": "Enrollment KPIs: Performance against threshold",
    "Site Productivity": "Site Productivity KPIs: Performance against threshold"
  },

  CHART_TITLE_INDEX_MAP: {
    "Subject Compliance KPIs: Performance against threshold" : 1,
    "Enrollment KPIs: Performance against threshold" : 2,
    "Site Productivity KPIs: Performance against threshold" : 3
  },

  CATEGORY_OPTIONS: [
    {label: "Enrollment", value: "Subject_Enrollment"},
    {label: "Site Productivity", value: "Site_Productivity"},
    {label: "Subject Compliance", value: "Subject_Compliance"}
  ],

  INIT_SIZE_SCATTER_POINT: 4,

  NO_KPI_SELECTED_IN_QA_FOR_THIS_CATEGORY: 'No KPI selected in the quality agreement for this category',
  PLEASE_USE_CRO_AND_OR_STUDY_FILTERS_TO_ACCESS_ADDITIONAL_DETAILS: 'Please use CRO and/or Study filters to access additional details',
  PLEASE_SELECT_A_SINGLE_STUDY_AND_CRO_IN_THE_FILTERS_TO_ACCESS_ADDITIONAL_DETAILS: 'Please select a single Study and CRO in the filters to access additional details'
};
