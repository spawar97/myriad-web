import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import AppRequest from '../../http/AppRequest';
import DataReviewReportDiffSummary from './DataReviewReportDiffSummary';
import Util from '../../util/util';
import DataReviewUtil from '../../util/DataReviewUtil';
import ExposureActions from '../../actions/ExposureActions';
import FrontendConstants from '../../constants/FrontendConstants';
import DataTypeConstants from '../../constants/DataTypeConstants';
import HttpResponseConstants from '../../constants/HttpResponseConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import shallowCompare from 'react-addons-shallow-compare';
import Placeholder from '../ContentPlaceholder';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import GA from '../../util/GoogleAnalytics';
import Button from '../Button';
import ModalConstants from '../../constants/ModalConstants';

import {TouchDiv as div} from '../TouchComponents';

/**
 * This class represents the view for the data diff summary for a data review set. This is basically an
 * at-a-glance view of differences between the analytics contained in the data review set between two points in time
 */
class DataReviewSummaryView extends React.Component {
  constructor() {
    super();

    this.state = {
      immSummaryData: Imm.Map(),
      dataRequests: Imm.List()
    };
  }

  componentDidMount() {
    // Once the component mounts, let's kick off the data diff summary requests for all tabular listings associated with
    // this data review set
    this.getSummaryData();
  }

  /**
   * This is a pure react component (if we were using a newer version of React this class would extend React.PureComponent
   * Since we're not updating React at the moment, use the old method to determine whether we should update this component
   * via shallowCompare
   * @param nextProps - the props for the incoming potential update
   * @param nextState - the state for the incoming potential update
   * @returns {*}
   */
  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  /**
   * If the component updated, wipe out the summary data that existed on the component and get the summary data
   * for the new updated component
   * @param prevProps - the previous set of props for the component
   * @param prevState - the previous state of the component
   */
  componentDidUpdate(prevProps, prevState) {
    if (!this.props.immSelectedFilterOptions.equals(prevProps.immSelectedFilterOptions)) {
      this.setState({immSummaryData: Imm.Map()});
      this.getSummaryData();
    }
  }

  componentWillUnmount() {
    // Abort all ongoing data requests when unmounting this component
    const dataRequests = this.state.dataRequests;
    dataRequests.map((request) => request.abort());
  }

  /**
   * Fetches the summary data for each individual associated tabular listing for this data review set.
   * As the responses come in, we'll populate the summary information into the state and use that
   * for rendering each response
   */
  getSummaryData() {
    const immReportIds = this.props.immDataReview.get('reportIds');
    const data = DataReviewUtil.buildDataDiffRequest(this.props.immSelectedFilterOptions.set('FileId', this.props.immDataReview.get("id")));

    // Abort all old requests
    const oldRequests = this.state.dataRequests;
    oldRequests.map((request) => request.abort());

    let newRequests = Imm.List();

    immReportIds.map((reportId) => {
      let url = `/api/files/${reportId}/diff/summary`;
      const request = AppRequest({type: 'POST', url: url, data: JSON.stringify(data)});
      newRequests = newRequests.push(request);
      request.then(
        (dataDiffSummary) => {
          let summaryData = this.state.immSummaryData.set(reportId, dataDiffSummary);
          this.setState({immSummaryData: summaryData});
        },
        (jqXHR) => {
          // If the post fails, display an error message
          if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
            ExposureActions.createStatusMessage(FrontendConstants.DATA_REVIEW_SUMMARY_DATA_ERROR, StatusMessageTypeConstants.TOAST_ERROR);
            GA.sendAjaxException(`POST ${url} failed`);
          }
        }
      );
    });

    this.setState({dataRequests: newRequests});
  }

  isDisabledBeginReview() {
    return !this.props.immSelectedFilterOptions.get('ReviewRoles', Imm.List()).size;
  }

  beginReview() {
    ExposureActions.displayModal(ModalConstants.MODAL_DATA_REVIEW_EXPORT_IMPORT, {
      handleCancel: ExposureActions.closeModal,
      exportFile: this.props.exportFile,
      importFile: this.props.importFile,
      immSelectedFilterOptions: this.props.immSelectedFilterOptions
    });
  }

  render() {
    const immReportIds = this.props.immDataReview.get('reportIds');
    const { immSelectedFilterOptions } = this.props;

    const subjects = immSelectedFilterOptions.get('Subjects', Imm.List());
    let selectedSubjects;
    if (subjects.isEmpty()) {
      selectedSubjects = FrontendConstants.ALL_SUBJECTS;
    }
    else {
      selectedSubjects = subjects.map((subject) => subject.get('value')).join(', ');
    }

    const study = immSelectedFilterOptions.getIn(['Study', 'displayName'], FrontendConstants.ALL_STUDIES);

    const fromDateTimestamp = immSelectedFilterOptions.getIn(['Dates', 0, 'value']);
    const fromDate = !isNaN(fromDateTimestamp) ? Util.valueFormatter(fromDateTimestamp, DataTypeConstants.DATE) :
      FrontendConstants.DATA_REVIEW_FROM_DATE;

    const toDate = Util.valueFormatter(immSelectedFilterOptions.getIn(['Dates', 1, 'value']), DataTypeConstants.DATE);

    // The results of each report summary will be stored in the component state.
    let reportSummaries = immReportIds.map((reportId) => {
      const key = `data-diff-summary-${reportId}`;
      // If we have summary data for the report, show the data
      if (this.state.immSummaryData.has(reportId)) {
        const summaryData = this.state.immSummaryData.get(reportId);
        // Because this is a data review set and we initially told it to fetch the file data, we'll guarantee that this exists in
        // whichever component this is embedded in
        const linkedReport = this.props.immExposureStore.getIn(['files', reportId, 'fileWrapper', 'file']);
        return (
          <div key={key}>
            <DataReviewReportDiffSummary
              immReport={linkedReport}
              immSummaryData={Imm.fromJS(summaryData)}
            />
          </div>
        );
      }
      else {
        return (
          <div key={key}>
            <Placeholder height={ExposureAppConstants.CONTENT_PLACEHOLDER_HEIGHT_REM_HALF}/>
          </div>
        );
      }
    }).toArray();


    return (
      <div className='data-diff-summary-view-container'>
        <div className='data-diff-summary'>
          <div className='header-text'>{FrontendConstants.DATA_CHANGE_SUMMARY}</div>
          <div className='data-diff-summary-row'>
            <div className='data-diff-summary-key'>{FrontendConstants.STUDY_ID}:</div>
            <div className='data-diff-summary-value'>{study}</div>
          </div>
          <div className='data-diff-summary-row'>
            <div className='data-diff-summary-key'>{FrontendConstants.SUBJECTS}:</div>
            <div className='data-diff-summary-value'>{selectedSubjects}</div>
          </div>
          <div className='data-diff-summary-row'>
            <div className='data-diff-summary-key'>{FrontendConstants.FROM_DATE}:</div>
            <div className='data-diff-summary-value'>{fromDate}</div>
          </div>
          <div className='data-diff-summary-row'>
            <div className='data-diff-summary-key'>{FrontendConstants.TO_DATE}:</div>
            <div className='data-diff-summary-value'>{toDate}</div>
          </div>
        </div>
        <div className='kpi-summaries'>
          {reportSummaries}
          <div className={'data-diff-begin-review'}>
            <Button
              classes={{'begin-review-button': true}}
              children={'Begin Review'}
              isDisabled={this.isDisabledBeginReview()}
              isPrimary={true}
              onClick={this.beginReview.bind(this)} />
          </div>
        </div>
      </div>
    );
  }
}

DataReviewSummaryView.displayName = 'DataReviewSummary';

DataReviewSummaryView.propTypes = {
  immDataReview: PropTypes.object,
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  immSelectedFilterOptions: PropTypes.instanceOf(Imm.Map).isRequired,
  exportFile: PropTypes.func,
  importFile: PropTypes.func,
  params: PropTypes.shape({
    fileId: PropTypes.string,
    fromDate: PropTypes
  })
};

DataReviewSummaryView.contextTypes = {
  router: PropTypes.object
};

export default DataReviewSummaryView;
