import React from 'react';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import ModalConstants from '../../constants/ModalConstants';
import Util from '../../util/util';
import FrontendConstants from '../../constants/FrontendConstants';
import ShallowCompare from 'react-addons-shallow-compare';
import cx from 'classnames';
import AccountUtil from "../../util/AccountUtil";
import PermissionsUtil from "../../util/PermissionsUtil";
import {FeatureListConstants} from "../../constants/PermissionsConstants";

class AuditTrailReports extends React.Component {
  constructor() {
    super();
  }

  shouldComponentUpdate(nextState, nextProps) {
    return ShallowCompare(this, nextState, nextProps);
  }

  exportAuditReport(report) {
    ExposureActions.displayModal(ModalConstants.MODAL_DOWNLOAD_FILE, {
      handleCancel: ExposureActions.closeModal,
      fileId: '00000000-0000-0000-0000-000000000000',
      downloadType: ExposureAppConstants.DOWNLOAD_TYPE_CSV,
      auditReport: report
    });
  }

  render() {
    const hasOversightMetrics = AccountUtil.hasOversightScorecard(comprehend.globals.immAppConfig)
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.OVERSIGHT_SCORECARD);

    const oversightMetrics = hasOversightMetrics
    ? (
        <div className='audit-trail-reports'>
          <ul>
            <li>
              <div className='report-link' id='2' onClick={this.exportAuditReport.bind(this, "oversight_metric_configuration_audit_trail_report")}>
                Oversight Metric Configuration Audit Trail Report
              </div>
            </li>
          </ul>
        </div>
      )
    : null;


    let content = Util.isDesktop()
      ? (
        <div className='audit-trail-manager'>
          <div className='page-header'>
            <div className='title'>
              Audit Trail Reports
            </div>
          </div>
          <div className='info'>
            <div className='info-icon'>
              <span className='icon-information_solid' />
            </div>
            <div className='info-message'>
              <div>Audit trail reports for the current account are listed below.</div>
              <div>Click on the report name to export audit trail information.</div>
            </div>
          </div>
          <div className='audit-trail-reports'>
            <ul>
              <li>
                <div className='report-link' id='1' onClick={this.exportAuditReport.bind(this, "user_audit_trail_report")}>
                  User Audit Trail Report
                </div>
              </li>
            </ul>
          </div>
          <div className='audit-trail-reports'>
            <ul>
              <li>
                <div className='report-link' id='2' onClick={this.exportAuditReport.bind(this, "data_access_group_audit_trail_report")}>
                  Data Access Group Audit Trail Report
                </div>
              </li>
            </ul>
          </div>
          <div className='audit-trail-reports'>
            <ul>
              <li>
                <div className='report-link' id='3' onClick={this.exportAuditReport.bind(this, "data_review_audit_trail_report")}>
                  Data Review Audit Trail Report
                </div>
              </li>
            </ul>
          </div>
          <div className='audit-trail-reports'>
            <ul>
              <li>
                <div className='report-link' id='4' onClick={this.exportAuditReport.bind(this, "disposition_audit_trail_report")}>
                  Disposition Audit Trail Report
                </div>
              </li>
            </ul>
          </div>
          {oversightMetrics}
            <div className='audit-trail-reports'>
                <ul>
                    <li>
                        <div className='report-link' id='4' onClick={this.exportAuditReport.bind(this, "ract_audit_trail_report")}>
                            Ract Audit Trail Report
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        )
      : (
         <div className='monitor-view-container'>
           <div className='page-header'>
             <div className='title'>
               Audit Trail Reports
             </div>
           </div>
           <div className='mobile-monitor'>
             <div className='user-alert'>
               <span className='icon-info' />
               <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                  {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
                </span>
             </div>
           </div>
         </div>
        );

   return content;
  }
}

export default AuditTrailReports;
