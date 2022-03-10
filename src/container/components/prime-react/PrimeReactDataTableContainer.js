import React from 'react';
import PrimeDataTable from "./PrimeDataTable";

// Represents the basic Comprehend compoenent.
const PrimeReactDataTableContainer = (props) => {

    return (
        <div className="prime-table-section">
            <PrimeDataTable {...props} />
        </div>
    );
}

export default PrimeReactDataTableContainer; 