import React from "react";
function DeleteRactConfirmationDialog(props) {
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
                    <span className="modal-dialog-header-text">{ props.message} </span>
                    <br/>
                  </div>
                  <div className="modal-dialog-main">
                    <span className="modal-dialog-header-text"> { props.consideration } </span>
                  </div>
                  {
                    props.yesOrNo ? (
                      <div className="modal-dialog-footer">
                        <div className="btn btn-primary"
                             id={`assign-no`}
                             onClick={() => props.close()}
                        >
                          <div className="icon icon icon-close" />
                          No
                        </div>
                        <div className="btn btn-secondary"
                             id={`assign-yes`}
                             onClick={props.deleteRactTemplate}
                        >
                          <div className="icon icon icon-checkmark-circle" />
                          Yes
                        </div>
                      </div>
                    ) : (
                      <div className="modal-dialog-footer">
                        <div className="btn btn-primary"
                             id={`assign-no`}
                             onClick={() => props.close()}
                        >
                          <div className="icon icon icon-close" />
                          OK
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
export default DeleteRactConfirmationDialog;

