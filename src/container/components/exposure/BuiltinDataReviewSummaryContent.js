import React, { useState } from 'react';
import Imm from 'immutable';
import styled from 'styled-components';
import PropTypes from "prop-types";

const SummaryTable = styled.table`
    width: 100%;
    display: table;
    border-spacing: 0;
  `;

const HeaderCell = styled.th`
    background-color: #1F96DE;
    color: white;
    border-right: .1rem solid #1674AA;
    border-bottom: .1rem solid #1674AA;
    white-space: nowrap;
    padding-right: 1rem;
    padding-left: 1rem;
    padding-top: .5rem;
    padding-bottom: .5rem;
  `;

const EmptyHeaderCell = styled.th`
    background-color: #1F96DE;
    color: white;
    white-space: nowrap;
    border-right: .1rem solid #1674AA;
    border-bottom: .1rem solid #1674AA;
    padding-right: 1rem;
    padding-left: 1rem;
    padding-top: .5rem;
    padding-bottom: .5rem;
  `;

const ReviewSetCell = styled.td`
    background-color: #1F96DE;
    border-right: .1rem solid #1674AA;
    border-bottom: .1rem solid #1674AA;
    color: white;
    text-decoration: underline;
    white-space: nowrap;
    padding: 1rem;
    
    &:hover {
      cursor:pointer;
    }
  `;

const StatusCell = styled.td`
    white-space: nowrap;
    border-right: .1rem solid #CCC;
    border-bottom: .1rem solid #CCC;
    padding: 1rem;
  `;

const DataDiv = styled.div`
    text-align: center;
    color: ${props => props.inputColor || "black"};
  `;

const CenteredDiv = styled.div`
    text-align: center;
    font-weight: bold;
    color: #1F96DE;
    border-right: .1rem solid black;
    border-left: .1rem solid black;
    border-top .1rem solid black;
    width: 100%;
  `;

const BackCell = styled.th`
    background-color: #1F96DE;
    color: white;
    border-right: .1rem solid #1674AA;
    white-space: nowrap;
    text-decoration: underline;
    
    &:hover {
      cursor:pointer;
    }
  `;

const ReportCell = styled.td`
    background-color: #1F96DE;
    border: .1rem solid #1674AA;
    color: white;
    white-space: nowrap;
  `;

const TabularDiv = styled.div`
    text-align: center;
    color: #1F96DE;
    background-color: #CCC;
    border-right: .1rem solid black;
    border-left: .1rem solid black;
    width: 100%;
  `;

const ContentWrapper = styled.div`
    overflow-x: scroll;
    display: block;
    border: .1rem solid black;
  `;

function BuiltinDataReviewSummaryContent (props) {
  ///////////////////////////////////////////////////START OF HELPER FUNCTIONS////////////////////////////////////////

  function createCells (map) {
    // every key in the map is a review role (or the total row count)
    const cells = _.keys(map).map(key => {
      if (!key.includes('totalRowCount')) {
        const unreviewedCount = map[key];

        // if we get 'None' that means this review role isnt available for this review set, put a blank cell
        if (unreviewedCount !== 'None') {
          const totalRows = isDrilldown ? map['totalRowCount'] : map[key + ' totalRowCount'];
          const reviewedCount = totalRows - unreviewedCount;
          const percent = !isNaN(reviewedCount) && !isNaN(totalRows) ? Math.round(reviewedCount/totalRows * 100) : 0;

          let color;
          if (percent > 75) {
            color = 'rgb(70, 125, 21)';
          } else if (percent <= 75 && percent > 50) {
            color = 'rgb(255, 215, 0)';
          } else if (percent <= 50 && percent > 25) {
            color = 'orange';
          } else if (percent <= 25) {
            color = 'rgb(220, 59, 25)';
          } else {
            color = 'black';
          }

          return (
            <StatusCell id = 'status-cell'>
              <DataDiv id = 'percent-div' inputColor = {color}>{percent}%</DataDiv>
              <DataDiv id = 'count-div'>({unreviewedCount} unreviewed)</DataDiv>
            </StatusCell>
          );
        } else {
          return (
            <StatusCell id= 'status-cell'>
              <DataDiv id= 'percent-div'></DataDiv>
              <DataDiv id = 'count-div'></DataDiv>
            </StatusCell>
          );
        }
      }
    });

    return cells;
  }


  function getReviewSetSummary (reviewsForReviewSets, reportNameMap) {
    const reviewSets = reviewsForReviewSets.keySeq().toList();
    // every reviewSet map has the same set of roles, so just take the first review set
    const tabularReports = reviewsForReviewSets.get(reviewSets.get(0), Imm.Map());
    // and the first tabular review
    const tabularReport = tabularReports.keySeq().toList().get(0);
    const rolesMap = reviewsForReviewSets.getIn([reviewSets.get(0), tabularReport]);
    // and now we get the roles, finally
    const roles = rolesMap.keySeq().toList();

    const roleHeaders = roles.map(role => {
      if (role !== 'totalRowCount') {
        return (<HeaderCell id = 'header-cell'>{role}</HeaderCell>)
      }
    });

    // every review set gets a row
    const bodyRows = reviewSets.map(reviewSet => {
      const tabularReportsMap = reviewsForReviewSets.get(reviewSet);
      const tabularReports = tabularReportsMap.keySeq().toList();
      let map = {};

      tabularReports.forEach(tabularReport => {
        const roleCountMap = tabularReportsMap.get(tabularReport);

        roles.forEach(role =>{
          if (role !== 'totalRowCount') {

            const count = parseInt(roleCountMap.get(role));

            //not every tabular listing has the same review roles, store the count of total rows for the given review role
            if (map[role + ' totalRowCount']) {
              map[role + ' totalRowCount'] += Number.isNaN(count) ? 0 : parseInt(roleCountMap.get('totalRowCount'))
            } else {
              map[role + ' totalRowCount'] = Number.isNaN(count) ? 0 : parseInt(roleCountMap.get('totalRowCount'))
            }

            // if we have the role
            if (map[role]) {
              // and the count is an actual number
              if (!Number.isNaN(count)) {
                // if the role is 'None', clear the value and assign it to the count
                if (Number.isNaN(map[role])) {
                  map[role] = 0
                  map[role] += count
                } else {
                  map[role] += count
                }
              }
            // else the role doesnt exist, assign it None or the actual count of rows
            } else {
              map[role] = Number.isNaN(count) ? 'None' : parseInt(count)
            }
          }
        });
      });

      const cells = createCells(map);
      const reviewSetName = reportNameMap.get(reviewSet);

      return (
        <tr id = 'body-row'>
          <ReviewSetCell id='review-set' onClick = {(e) => changeView(e, reviewSet)}>{reviewSetName}</ReviewSetCell>
          {cells}
        </tr>
      );
    });

    return (
      <SummaryTable id = 'review-summary-table'>
        <thead>
          <tr id = 'header-row'>
            <EmptyHeaderCell id = 'empty-header-cell'></EmptyHeaderCell>
            {roleHeaders}
          </tr>
        </thead>
        <tbody>
          {bodyRows}
        </tbody>
      </SummaryTable>
    );
  }

  function getTabularReportSummary (reviewsForTabularSets, selectedReviewSet, reportNameMap) {
    const tabularReports = reviewsForTabularSets.keySeq().toList();

    let availableReviewRoles = Imm.List();

    // find the review roles
    tabularReports.forEach(report => {
      const map = reviewsForTabularSets.get(report);

      const filteredMap = map.filter((value, key) => value !== 'None');
      const reviewRolesWithData = filteredMap.keySeq().toList();

      if (availableReviewRoles.size < reviewRolesWithData.size)
        availableReviewRoles = reviewRolesWithData;
    });

    const roleHeaders = availableReviewRoles.map(role => {
      if (role != 'totalRowCount') {
        return (<HeaderCell id= 'header-cell'>{role}</HeaderCell>)
      }
    });

    // every tabular report gets a row
    const bodyRows = tabularReports.map(report => {
      const reportMap = reviewsForTabularSets.get(report);
      const roleList = reportMap.keySeq().toList();
      let map = {};

      map['totalRowCount'] = reportMap.get('totalRowCount');
      availableReviewRoles.forEach(role =>{
        if (role !== 'totalRowCount') {
          const count = reportMap.get(role);
          map[role] ? map[role] += count : map[role] = count;
        }
      });

      const cells = createCells(map);
      const reportName = reportNameMap.get(report);
      
      return (
        <tr id = 'body-row'>
          <ReportCell id='tabular-report'>{reportName}</ReportCell>
          {cells}
        </tr>
      );
    });

    //jsx seems to freak out if we use these inline, so just leave it as a const string
    const backArrow = '<<';

    return (
      <SummaryTable id = 'review-set-table'>
        <thead>
          <tr id = 'header-row'>
            <BackCell id = 'back-button' onClick = {(e) => changeView(e)}>{backArrow} Back</BackCell>
            {roleHeaders}
          </tr>
        </thead>
        <tbody>
          {bodyRows}
        </tbody>
      </SummaryTable>
    );
  }

  function changeView (event, reviewSetId) {
    if (event.target.id === 'back-button') {
      setIsDrilldown(false);
      setSelectedReviewSet('');
    } else {
      const targetedReviewSet = reviewSetId || '';
      setIsDrilldown(true);
      setSelectedReviewSet(targetedReviewSet);
    }
  }
  ///////////////////////////////////////////////////START OF RENDER CODE////////////////////////////////////////////

  const [isDrilldown, setIsDrilldown] = useState(false);
  const [selectedReviewSet, setSelectedReviewSet] = useState('');

  let content = '';
  if (isDrilldown && selectedReviewSet !== '') {
    content = getTabularReportSummary(props.reviewsForReviewSets.get(selectedReviewSet), selectedReviewSet, props.reportNameMap);
  }
  else {
    content = getReviewSetSummary(props.reviewsForReviewSets, props.reportNameMap);
  }

  return (
    <div>
      <CenteredDiv>Review Status</CenteredDiv>
      {isDrilldown ? <TabularDiv id = 'review-set-title'>{props.reportNameMap.get(selectedReviewSet)}</TabularDiv> : ''}
      <ContentWrapper>{content}</ContentWrapper>
    </div>
  );
}

BuiltinDataReviewSummaryContent.propTypes = {
  reviewsForReviewSets: PropTypes.instanceOf(Imm.Map),
  reportNameMap: PropTypes.instanceOf(Imm.Map)
};

export default BuiltinDataReviewSummaryContent;
