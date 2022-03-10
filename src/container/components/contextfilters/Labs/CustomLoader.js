import React from 'react';
import "./loader.css";

const CustomLoader = (props) => {

  return (
    <div className='dot-loader'> 
     <div className='dot-flash-label'>
       Loading 
     </div>
      <div className="snippet" data-title=".dot-flashing">
        <div className="stage">
          <div className="dot-flashing"></div>
        </div>
      </div>
    </div>
  );
}

export default CustomLoader;
