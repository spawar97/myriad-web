import React from 'react';
import PrimeTable from "./PrimeTable";

// Represents the basic Comprehend compoenent.
const PrimeReactTableContainer = (props) => {

  return (
    <div className="prime-table-section">
      <PrimeTable {...props} />
    </div>
  );
}

export default PrimeReactTableContainer; 
