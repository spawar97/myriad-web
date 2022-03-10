import 'primeicons/primeicons.css';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.css';
import 'primeflex/primeflex.css';
import React from 'react';
import { Dialog as PrimeDialog } from 'primereact-opt/dialog';

const Dialog = (props) => {

  let { header, content, visible, footer, onHide, breakpoints, width } = props;

  return (
    <div className="dialog-demo">
      <div className="card">
        <PrimeDialog
          header={header}
          visible={visible}
          onHide={onHide}
          breakpoints={breakpoints}
          style={{ width: width }}
          footer={footer}
        >
          {content}
        </PrimeDialog>
      </div>
    </div>
  )
}

Dialog.defaultProps = {
  header: 'Header',
  width: '50vw',
  breakpoints: { '960px': '75vw' },
  footer: 'Footer',
  onHide: false,
  visible: false,
  content: 'body'
}

export default Dialog
