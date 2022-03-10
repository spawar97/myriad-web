var Imm = require('immutable');

var ImmEmptyQualityAgreement = function(fileType) {
  return Imm.fromJS(
    {
      "studyId": "",
      "croId": "",
      "croName": "",
      "availableThresholds": [{
        "name": "Target Variance Threshold %",
        "color": "#FFD700"
      }, {
        "name": "Max Variance Threshold %",
        "color": "#dc3b19"
      }],
      "kpis": [
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Enrollment Rate (per 30 days)",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null,
              "placeholder": -10.0
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null,
              "placeholder": -15.0
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "placeholder": 1.0,
          "id": "ENROLL_RATE",
          "description": "(Total Count of Subjects Enrolled / Total Count of Site Days) x 30"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Site Activation Rate (in days)",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "SITE_ACTIVATION_RATE",
          "description": "Total Count of days between IRB Approval Date and Site Activation Date (across all sites) / Total Count of Sites Activated"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Consent Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "CONSENT_RATE",
          "description": "Total Count of Consented Subjects / Total Count of Subjects"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Screen Failure Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "SCREEN_FAILURE_RATE",
          "description": "Total Count of Screen Failures / Total Count of Subjects Screened"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Randomization Failure Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "RANDOMIZATION_FAILURE_RATE",
          "description": "Total Count of Randomization Failures / Total Count of Subjects Enrolled"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Withdrawal Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "WITHDRAWAL_RATE",
          "description": "Total Count of Withdrawals / Total Count of Subjects Enrolled"
        },
        {
          "category": "SUBJECT_ENROLLMENT",
          "name": "Evaluable Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "EVALUABLE_RATE",
          "description": "Total Count of Evaluable Subjects / Total Count of Subjects Enrolled"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Query Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "QUERY_RATE",
          "description": "Total Count of Queries / Total Count of Subject Days"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Open Query Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "OPEN_QUERY_RATE",
          "description": "Total Count of Open and Answered Queries / Total Count of Subject Days"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Data Entry Rate (in days)",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "DATA_ENTRY_RATE",
          "description": "Total Count of Days between Collected Date and Form Entry Date (across all sites) / Total Count of Forms Collected"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Open & Answered Queries by Age > 28 days",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "OPEN_AND_ANSWERED_QUERIES_BY_AGE_28",
          "description": "Count of queries where Age > 28 / Total Count of Open and Answered Queries (where `Open` queries are queries with a NULL queryClosedDate Category"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Open & Answered Queries by Age > 14 days and less than 28 days",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "OPEN_AND_ANSWERED_QUERIES_BY_AGE_14",
          "description": "Count of queries where 14 < Age =< 28 / Total Count of Open and Answered Queries (where `Open` queries are queries with a NULL queryClosedDate Category"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Query Resolution",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "QUERY_RESOLUTION",
          "description": "Total Count of Queries in Open state (e.g. where queryCloseDate is NULL) / Total Count of Queries"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Issue Resolution 30 days",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "ISSUE_RESOLUTION_30_DAYS",
          "description": "Total Count of open issues where (30 days < today - IssueOpenDate <= 60 days) / Total Count of issues"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Issue Resolution 60 days",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "ISSUE_RESOLUTION_60_DAYS",
          "description": "Total Count of open issues where (60 days < today - IssueOpenDate <= 90 days) / Total Count of issues"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Issue Resolution 90 days",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "ISSUE_RESOLUTION_90_DAYS",
          "description": "Total Count of open issues where (90 days < today - IssueOpenDate ) / Total Count of issues"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Missing Data per Visit",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "MISSING_DATA",
          "description": "(per visit) Total Count of all non-empty \"is required\" fields for all collected forms / Total Count of all \"is_required\" fields for all planned-to-be collected forms"
        },
        {
          "category": "SITE_PRODUCTIVITY",
          "name": "Monitoring Visits Past Due (in days)",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "MONITORING_VISITS_PAST_DUE",
          "description": "Total Count of days between Visit_Date and Planned_Visit_Date across all visits which have occurred / Total Count of Monitoring Visits where Visit_Date is not EMPTY"
        },
        {
          "category": "SUBJECT_COMPLIANCE",
          "name": "Protocol Deviations Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "DV_RATE",
          "description": "Total Count Protocol Deviations / Total Count of Subject Days"
        },
        {
          "category": "SUBJECT_COMPLIANCE",
          "name": "AE Rate",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "AE_RATE",
          "description": "Total Count of AEs / Total Count of Subject Days"
        },
        {
          "category": "SUBJECT_COMPLIANCE",
          "name": "Subject Visit Compliance",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "PERCENT",
          "enabled": false,
          "plan": null,
          "id": "SUBJECT_VISIT_COMPLIANCE",
          "description": "Count of Subject Visits in Window / Total Count of Subject Visits that should have occurred"
        },
        {
          "category": "SUBJECT_COMPLIANCE",
          "name": "Primary Endpoint Data Entry Rate (in days)",
          "thresholds": [
            {
              "thresholdUnit": "PERCENT",
              "name": "Target Variance Threshold %",
              "value": null
            },
            {
              "thresholdUnit": "PERCENT",
              "name": "Max Variance Threshold %",
              "value": null
            }
          ],
          "planUnit": "RAW",
          "enabled": false,
          "plan": null,
          "id": "PRIMARY_END_POINT_DATA_ENTRY_RATE",
          "description": "Total Count of Days between Collected Date and Primary Endpoint Form Entry Date (across all sites) / Total Count of Primary Endpoint Forms Collected"
        }
      ]
    }
  );
};

module.exports = ImmEmptyQualityAgreement;
