import React from "react";
const DialogBox = (props) => {
    return (
        <React.Fragment>
            <div className="modal-dialog-underlay modal-underlay virtual-table">
                <div className="virtual-table-row">
                    <div className="virtual-table-cell">
                        <div className="modal-dialog">
                            <div className="modal-dialog-content">
                                <div className='Review-Modal'>
                                    <div className="modal-dialog-header">
                                        {props.header}
                                    </div>
                                    <div className="modal-dialog-main">
                                        {props.content}
                                    </div>
                                    <div className="modal-dialog-footer">
                                        {props.footer}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
export default DialogBox;
