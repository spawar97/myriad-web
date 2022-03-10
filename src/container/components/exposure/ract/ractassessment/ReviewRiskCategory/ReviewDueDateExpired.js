import React, { useState } from 'react';
import RactScorecardStore from '../../../../../stores/RactScorecardStore';
import RouteNameConstants from '../../../../../constants/RouteNameConstants';
import FrontendConstants from '../../../../../constants/FrontendConstants';

const ReviewDueDateExpired = (props) => {

  const [isLoading, setLoading] = useState(false);

  let ractId = window.location.pathname.replace('/ract/assessment-review/', '');
  let userId = props.data.immExposureStore.getIn(['userInfo', 'id']);

  const dueDateExpiredUserReAssign = (name) => {

    const reAssignUserApi = async (isAssign) => {
      let param = {
        "ractId": ractId,
        "userId": userId,
        "reAssign": isAssign
      }

      setLoading(true);
      await RactScorecardStore.reassignAssessment(param).then((data) => {
        if (data) {

          setLoading(false);

        } else {
          throw new Error
        }
      }).catch(error => {
        if (!didCancel) {
          setLoading(false);
          ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageConstants.WARNING,
          );
        }
      })
    }


    if (name === FrontendConstants.ASSESSMENT_REVIEW_NOT_REASSIGN_NAME) {
      reAssignUserApi(false);
    } else if (name === FrontendConstants.ASSESSMENT_REVIEW_REASSIGN_NAME) {
      reAssignUserApi(true);
    }
    props.data.router.push({
      name: RouteNameConstants.EXPOSURE_RACT,
    })
  }


  return (
    <React.Fragment>
      <div className="modal-dialog-underlay modal-underlay virtual-table">
        <div className="virtual-table-row">
          <div className="virtual-table-cell">
            <div className="modal-dialog">

              <div className="modal-dialog-content">
                <div>
                  <div className="modal-dialog-header">
                    <span className="icon icon-WarningCircle"></span>
                    <span className="modal-dialog-header-text">{'Your Assessment Due Date is Expired'}</span>
                  </div>
                  <div className="modal-dialog-main">
                    {'Do you want to Re-assign ?'}
                  </div>
                  <div className="modal-dialog-footer">
                    <div className="btn btn-primary"
                      id={`assign-no`}
                      onClick={() => { dueDateExpiredUserReAssign(FrontendConstants.ASSESSMENT_REVIEW_NOT_REASSIGN_NAME) }}
                      disabled={isLoading}
                    >
                      <div className="icon icon icon-close" />
                      No
                    </div>
                    <div className="btn btn-secondary"
                      id={`assign-yes`}
                      onClick={() => { dueDateExpiredUserReAssign(FrontendConstants.ASSESSMENT_REVIEW_REASSIGN_NAME) }}
                      disabled={isLoading}
                    >
                      <div className="icon icon icon-checkmark-circle" />
                      Yes
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

export default ReviewDueDateExpired
