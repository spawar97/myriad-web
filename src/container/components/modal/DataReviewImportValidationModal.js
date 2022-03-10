import React from "react";
import PropTypes from "prop-types";
import FrontendConstants from "../../constants/FrontendConstants";
import Button from "../Button";
import moment from "moment";
import Imm from "immutable";

class DataReviewImportValidationModal extends React.PureComponent {
  static displayName = 'DataReviewImportValidationModal';

  static propTypes = {
    reviewedDate: PropTypes.string.isRequired,
    sheetAndRowMap: PropTypes.object.isRequired,
    tabularReportNameMap: PropTypes.instanceOf(Imm.Map),
    callback: PropTypes.func.isRequired,
    handleCancel: PropTypes.func.isRequired,
  };

  modalDialogContentTextItem = (itemCategory, itemDescription) => {
    return div({className: 'modal-dialog-content-text-item'},
      span({className: 'bold colon'}, itemCategory),
      itemDescription
    )
  };

  modalDialogSheetsAndRows = (sheetAndRowMap, tabularReportNameMap) => {
    //
    delete sheetAndRowMap["Data Change Summary"];
    let rows = [];
    _.keys(sheetAndRowMap).filter(key => key.includes("valid")).forEach(key => {

      if (sheetAndRowMap[key] != "" && key.includes("invalid")) {
        const reportId = key.split(' invalid')[0];
        const reportName = tabularReportNameMap.get(reportId);
        rows.push(<div>{reportName} invalid rows: {sheetAndRowMap[key]}</div>)
      } else if (sheetAndRowMap[key] != "" && !key.includes("invalid")) {
        const reportId = key.split(' valid')[0];
        const reportName = tabularReportNameMap.get(reportId);
        rows.push(<div>{reportName} valid rows: {sheetAndRowMap[key]}</div>)
      }
    })
    return rows;
  };

  render() {
    const { reviewedDate, sheetAndRowMap, callback, handleCancel, tabularReportNameMap } = this.props;
    return (
      <div>
        <div className='modal-dialog-header'>
          <span className='modal-dialog-header-text'>{FrontendConstants.PLEASE_CONFIRM_IMPORT}</span>
        </div>
        <div className = 'modal-dialog-main'>
          <div className = 'modal-dialog-text'>
            <span className = 'title colon'>{FrontendConstants.DATA_REVIEW_SUMMARY}</span>
            <div className = 'modal-dialog-content-text'>
              <div>Review Valid From: {moment(new Date(Number(sheetAndRowMap['startDateRange']))).format('YYYY-MM-DD')} to {moment(new Date(Number(sheetAndRowMap['endDateRange']))).format('YYYY-MM-DD')}</div>
              {this.modalDialogSheetsAndRows(sheetAndRowMap, tabularReportNameMap)}
            </div>
          </div>
        </div>
        <div className = 'modal-dialog-footer'>
          <Button children = {FrontendConstants.CONFIRM}
                  isPrimary = {true}
                  onClick = {callback}/>
          <Button children = {FrontendConstants.CANCEL}
                  isPrimary = {true}
                  onClick = {handleCancel}/>
        </div>
      </div>
    );
  }
}

export default DataReviewImportValidationModal;
