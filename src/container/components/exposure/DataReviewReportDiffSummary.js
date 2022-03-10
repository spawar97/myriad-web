import React from 'react';
import Imm from 'immutable';
import shallowCompare from 'react-addons-shallow-compare';
import cx from 'classnames';
import PropTypes from 'prop-types';

/**
 * View component for an individual report's data diff summary between two points in time.
 */
class DataReviewReportDiffSummary extends React.Component{
  /**
   * This is a pure component, do a shallow compare to see if it needs updating
   * @param nextProps
   * @param nextState
   */
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  render() {
    const summaryData = this.props.immSummaryData;
    const deletedSubjects = summaryData.get('deletedSubjectCount', 0);
    const deletedRecords = summaryData.get('deletedRecordCount', 0);
    const newSubjects = summaryData.get('newSubjectCount', 0);
    const newRecords = summaryData.get('newRecordCount', 0);
    const updatedSubjects = summaryData.get('updatedSubjectCount', 0);
    const updatedRecords = summaryData.get('updatedRecordCount', 0);
    const kpiTitle = this.props.immReport.get('title', 'Not Specified');

    return (
      <div className='data-diff-kpi-summary'>
        <div className='report-title'>Listing Name: {kpiTitle}</div>
        <div className={cx('data-diff-kpi-summary-row', 'data-diff-kpi-summary-new')}>{newRecords} new records for {newSubjects} subjects</div>
        <div className={cx('data-diff-kpi-summary-row', 'data-diff-kpi-summary-deleted')}>{deletedRecords} deleted records for {deletedSubjects} subjects</div>
        <div className={cx('data-diff-kpi-summary-row', 'data-diff-kpi-summary-updated')}>{updatedRecords} updated data elements for {updatedSubjects} subjects</div>
       </div>
    );
  }
}


DataReviewReportDiffSummary.propTypes = {
  immReport: PropTypes.instanceOf(Imm.Map).isRequired,
  immSummaryData: PropTypes.instanceOf(Imm.Map).isRequired
};


export default DataReviewReportDiffSummary;
