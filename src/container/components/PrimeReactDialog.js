import React from 'react'
import { Dialog } from 'primereact-opt/dialog';

const PrimeReactDialog = (props) => {

    let footer = <div></div>

    return (
        <React.Fragment>
            <Dialog
                id={props.id}
                className={props.className}
                header={props.header}
                footer={footer}
                visible={props.visible}
                position={props.position}
                resizable={props.resizable}
                style={props.style}
                onHide={props.onClosetask}
                modal={props.modal}
                closeOnEscape={false}
                closable={props.Closable}
                >
                {props.dialogContent}
                
            </Dialog>
        </React.Fragment>
    )
}

export default PrimeReactDialog;
