import React, { useState, useEffect } from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import AppRequest from "../../http/AppRequest";
import FrontendConstants from "../../constants/FrontendConstants";
import StatusMessageTypeConstants from "../../constants/StatusMessageTypeConstants";
import Spinner from '../Spinner';
import GA from "../../util/GoogleAnalytics";
import ExposureActions from "../../actions/ExposureActions";
import {TouchDiv as div} from "../TouchComponents";
import Breadcrumbs from "./Breadcrumbs";
import SimpleAction from "../SimpleAction";
import _ from "underscore";
import Util from "../../util/util";
import cx from 'classnames';
import BuiltinDataReviewSummaryFilters from './BuiltinDataReviewSummaryFilters';
import ReportFilterNotice from "../ReportFilterNotice";
import BuiltinDataReviewSummaryContent from "./BuiltinDataReviewSummaryContent";
import EmptyContentNotice from '../EmptyContentNotice';

/**
 * Represents the view for data review summary. This is the top level component, the other components are as follows:
 *    - BuiltinDataReviewSummaryFilters: The filters pane
 *    - BuiltinDataReviewSummaryContent: The table view, shown in the condition / absence of certain filters
 */
function BuiltinDataReviewSummary (props) {
  //////////////////////////////////////////////START OF HELPER FUNCTIONS/////////////////////////////////////////////
  function toggleFiltersPane(state) {
    setShowFilters(state);
    ExposureActions.toggleFiltersPane(state);
  }

  function hasMinimumRequiredFilters(selectedFilterOptions) {
    const fromDate = selectedFilterOptions.getIn(['Dates', 0, 'value']);
    const toDate = selectedFilterOptions.getIn(['Dates', 1, 'value']);

    // Date range is only valid if we have a from date
    const isFromDateValid = fromDate && !isNaN(fromDate);

    // Date range is only valid if we have a to date
    const isToDateValid = toDate && !isNaN(toDate);

    // Study is a required filter
    const hasStudyFilter = selectedFilterOptions.hasIn(['Study', 'value']);

    return isFromDateValid && isToDateValid && hasStudyFilter;
  }

  function applyFilters (selectedFilterOptions) {
    //check if the filters have actually changed to avoid spamming
    if (!selectedFilterOptions.equals(lastOptions)) {
      //show that were loading since we've started the request
      setIsLoading(true);
      const url = `/api/builtin/data-review-summary`;

      //grab the filter info
      const subjectIds = selectedFilterOptions.get('Subjects', Imm.List())
        .reduce((memo, subjectData) => {
          memo.push(subjectData.get('value'));
          return memo;
        }, []);
      const siteIds = selectedFilterOptions.get('Sites', Imm.List())
        .reduce((memo, subjectData) => {
          memo.push(subjectData.get('value'));
          return memo;
        }, []);
      const startDate = selectedFilterOptions.getIn(['Dates', 0, 'value'], null);
      const fileIds = props.immExposureStore.get('fileConfigs').keySeq().toArray();

      const data = {
        fileIds: fileIds,
        studyId: selectedFilterOptions.getIn(['Study', 'value']),
        siteIds,
        subjectIds,
        startDateRange: isNaN(startDate) ? null : Number(startDate),
        endDateRange: Number(selectedFilterOptions.getIn(['Dates', 1, 'value'])),
      };

      const newRequest = AppRequest({type: 'PUT', data: JSON.stringify(data), url: url});
      newRequest
        .then(
          (data) => {
            //if successful, set the data, the previous filter options, and our state to loaded
            setIsLoaded(true);
            setReviewsForReviewSets(Imm.fromJS(data));
            setIsLoading(false)
            setLastOptions(selectedFilterOptions);
          },
          (jqXHR) => {
            ExposureActions.createStatusMessage(
              FrontendConstants.FAILED_TO_GET_REVIEW_SETS_FOR_SUMMARY,
              StatusMessageTypeConstants.TOAST_ERROR
            );
            GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
          });
    }
  }

  // on mount get the report names
  useEffect(() => {
    const { fileId } = props.params;
    const url = `/api/data-review/${fileId}/report-names`;
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      (data) => {
        setReportNameMap(Imm.fromJS(data));
      },
      jqXHR => {
        ExposureActions.createStatusMessage(
          FrontendConstants.FAILED_TO_GET_REVIEW_SETS_FOR_SUMMARY,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
      }
    );
  }, [])

  //////////////////////////////////////////////START OF RENDER CODE//////////////////////////////////////////////////
  //state variables
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [reviewsForReviewSets, setReviewsForReviewSets] = useState(Imm.Map());
  const [lastOptions, setLastOptions] = useState(Imm.Map());  //last filters that were applied, so we dont repeatedly send api requests
  const [reportNameMap, setReportNameMap] = useState(Imm.Map());
  const { fileId } = props.params
  const isHomeActive = Util.isHomeRouteActive(props.routes);

  let dataDiffContent;
  // if we have data from the backend that isnt empty, show content component
  if (isLoaded && !reviewsForReviewSets.isEmpty() ) {
    dataDiffContent = <BuiltinDataReviewSummaryContent
                        reviewsForReviewSets = {reviewsForReviewSets}
                        reportNameMap = {reportNameMap}/>;
  // if we have data from the backend that is empty, show the user its empty
  } else if (isLoaded && reviewsForReviewSets.isEmpty()) {
    dataDiffContent = (<EmptyContentNotice noticeText={FrontendConstants.NO_DATA_RETURNED}/>);
  // otherwise, we havent selected our filters and made a request
  } else {
    const bodyText = (
      <div>
        <div className={'report-filter-notice-text'}>{FrontendConstants.DATA_REVIEW_SUMMARY_PLEASE_SELECT_FILTERS}</div>
      </div>
    );

    dataDiffContent = (
      <ReportFilterNotice
        headerText={`${FrontendConstants.SELECT_FILTERS_TO_BEGIN_REVIEW}.`}
        bodyText={bodyText}
        filterPaneState={showFilters}/>
    );
  }

  return (
    <div className={cx('data-review-view-container', {'show-filters': showFilters})}>
      <div className='page-header'>
            {
              isHomeActive
              ? null
              : <Breadcrumbs immExposureStore={props.immExposureStore} fileId={fileId}
            isMobile={Util.isMobile()}/>
          }
          <div className='header-buttons'>
          <SimpleAction
            class={cx('toggle-filters', 'icon-filter2')}
            text={FrontendConstants.FILTERS}
            onClick={fileId ? (e) => toggleFiltersPane(!showFilters) : _.noop}
          />
      </div>
    </div>
      <div className='data-review-summary' >
          <div className='filters'>
            <BuiltinDataReviewSummaryFilters
              handleClose={(e) => toggleFiltersPane(false)}
              immExposureStore={props.immExposureStore}
              applyFilters={applyFilters}
              hasMinimumRequiredFilters={hasMinimumRequiredFilters}/>
          </div>
          {isLoading ? <Spinner/> : ''}
          <div className='data-diff-summary-container'>
            {dataDiffContent}
          </div>
        </div>
      </div>
  );
}


BuiltinDataReviewSummary.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string  //summary fileId
  }),
  routes: PropTypes.array
};

export default BuiltinDataReviewSummary;
