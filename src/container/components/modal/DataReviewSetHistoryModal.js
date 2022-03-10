import React from 'react';
import Button from "../Button";
import FrontendConstants from "../../constants/FrontendConstants";
import AppRequest from "../../http/AppRequest";
import HttpResponseConstants from "../../constants/HttpResponseConstants";
import ExposureActions from "../../actions/ExposureActions";
import StatusMessageTypeConstants from "../../constants/StatusMessageTypeConstants";
import GA from "../../util/GoogleAnalytics";
import PropTypes from "prop-types";
import Imm from "immutable";
import DataReviewStore from "../../stores/DataReviewStore";
import EmptyContentNotice from '../EmptyContentNotice';
import Spinner from '../Spinner';
import styled from 'styled-components';
import {reviewedByTypes as ReviewedByTypes} from '../../constants/DataReviewConstants';
import moment from "moment";

const HistoryTable = styled.table`
  width: 100%;
  display: table;
  border-spacing: 0;
  border: .1rem solid black;
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

const DataCell = styled.td`
  white-space: nowrap;
  border-right: .1rem solid #CCC;
  border-bottom: .1rem solid #CCC;
  padding: 1rem;
`;

class DataReviewSetHistoryModal extends React.PureComponent {
  static propTypes = {
    fileId: PropTypes.string,
    handleCancel: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.props.setModalClassName('data-review-transaction-modal');
    this.fileId = this.props.fileId;

    this.state = {
      immHistoryData: PropTypes.instanceOf(Imm.Map),
      isLoading: true
    };
  }

// on mount, send a get request to fetch the history
  componentDidMount() {
    let url = `/api/data-review/${this.fileId}/history`;
    const request = AppRequest({type: 'GET', url: url});
    request.then(
      (response) => {
        this.setState({immHistoryData: Imm.fromJS(response), isLoading: false});
      },
      (jqXHR) => {
        if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
          ExposureActions.createStatusMessage(FrontendConstants.DATA_REVIEW_SUMMARY_DATA_ERROR, StatusMessageTypeConstants.TOAST_ERROR);
          GA.sendAjaxException(`POST ${url} failed`);
        }
      }
    );
  }

  createHistoryTable(immHistoryData) {
    const sortedData = immHistoryData.sortBy(history =>{
      history.get('date');
    });

    // every history record gets a row in the table
    const rows = sortedData.map(history =>{
      const date = history.get('date');
      let name = history.get('name');
      let nameDeactivated = '';
      if (name.includes('(Deactivated)')){
        name = name.split('(Deactivated)')[0];
        nameDeactivated = '(Deactivated)';
      }
      let reviewTeam = history.get('reviewTeam');
      let reviewTeamDeactivated = '';
      if (reviewTeam.includes('(Deactivated)')){
        reviewTeam = reviewTeam.split('(Deactivated)')[0];
        reviewTeamDeactivated = '(Deactivated)';
      }
      //only exports have an 'action' key
      const isExport = history.get('action', '') !== '';
      const action = history.get('action', '');
      let actualAction = '';

      //if this is an export, there are three possible actions
      if (isExport) {
        switch (action) {
          case ReviewedByTypes.ALL_RECORDS:
            actualAction = '(All Records)';
            break;
          case ReviewedByTypes.UNREVIEWED_BY_ME:
            actualAction = '(Unreviewed by me)';
            break;
          case ReviewedByTypes.UNREVIEWED_BY:
            actualAction = '(Unreviewed by ' + reviewTeam + ')';
            break;
          default:
            actualAction = '';
        }
      }

      const dateValue = new Date(parseInt(date));
      const time = dateValue.toLocaleTimeString();
      const actualDate = moment(dateValue).format('YYYY-MM-DD');

      const dateCell = (
        <DataCell>
          <div>{actualDate}</div>
          <div>{time}</div>
        </DataCell>
      );
      const teamCell = (
        <DataCell>
          <div>{reviewTeam}</div>
          <div>{reviewTeamDeactivated}</div>
        </DataCell>
      );
      const userCell = (
        <DataCell>
          <div>{name}</div>
          <div>{nameDeactivated}</div>
        </DataCell>
      );
      const actionCell = (
        <DataCell>
          <div>{isExport ? 'Download File' : 'Import File'}</div>
          <div>{actualAction}</div>
        </DataCell>
      );

      return (
        <tr id = 'history-table-row'>
          {dateCell}
          {teamCell}
          {userCell}
          {actionCell}
        </tr>
      );
    });

    return (
      <HistoryTable id='history-table'>
        <thead id = 'headers'>
          <tr>
            <HeaderCell id ='header-cell'>Date and Time</HeaderCell>
            <HeaderCell id ='header-cell'>Review Team</HeaderCell>
            <HeaderCell id ='header-cell'>User</HeaderCell>
            <HeaderCell id ='header-cell'>Action</HeaderCell>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </HistoryTable>
    )
  }

  render () {

    let content = '';

    // if were loading, show a spinner
    if (this.state.isLoading) {
      content = (<Spinner/>);
    // if were not loading and the the history data is empty, we must have not received anything
    } else if (!this.state.isLoading && this.state.immHistoryData.isEmpty()) {
      content = (<EmptyContentNotice
                   noticeText ={FrontendConstants.NO_DATA_RETURNED}
                   className = {'modal-sized'}/>);
    // otherwise, we have data and construct the table
    } else {
      content = this.createHistoryTable(this.state.immHistoryData);
    }

    return (
      <div>
        <div className='modal-dialog-header'>
          <span className='modal-dialog-header-text'>{FrontendConstants.DATA_REVIEW_TRANSACTIONS}</span>
        </div>
        <div className = 'modal-dialog-main'>
          {content}
        </div>
        <div className = 'modal-dialog-footer'>
          <Button children = {FrontendConstants.CANCEL}
            isPrimary = {true}
            onClick = {this.props.handleCancel}/>
        </div>
      </div>
    );
  }
}

export default DataReviewSetHistoryModal;
