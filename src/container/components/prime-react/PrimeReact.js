import React from 'react';
import ReactDOM from 'react-dom';
import { datalist } from 'react-dom-factories';
import PrimeTable from "./PrimeTable";

// Represents the basic Comprehend Button.
class PrimeReact extends React.PureComponent {

  render() {
    return (
      <div className="Demo__section">
        <PrimeTable tableData={this.props.data}/>
      </div>
    );
  }

}

const renderChart = (id, data) => {
  return ReactDOM.render(<PrimeReact data={data}/>, document.getElementById(id));
};

export default renderChart; 
