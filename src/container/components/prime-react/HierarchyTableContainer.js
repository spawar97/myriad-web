import React from 'react';
import HierarchyTable from './HierarchyTable';

// Represents the basic Comprehend compoenent.
const HierarchyTableContainer = (props) => {

  return (
    <div className="prime-table-section">
      <HierarchyTable {...props} />
    </div>
  );
}

export default HierarchyTableContainer; 
