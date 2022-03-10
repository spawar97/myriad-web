var $ = require('jquery');
window.jQuery = $;
// Import myriad highchart component
var React = require('react');
import SimpleDonut from "../../../../../node_modules/cqs-opt/src/vizspecs/SimpleDonut";

var Highchart = React.createFactory(require('../../Highchart'));

const ReportGraph = (props) => {
  let {graphData} = props;

  const configData = {
    chartTitle: 'Screen Failure By reason',
    data: graphData,
    dataLabels: {
      enabled: true,
      formatter: function () {
        return `${this.y}`;
      }
    },
    innerSize: '65%',
    enableTooltip: false,
  };

  let pieChartConfig = SimpleDonut(configData);
  let finalConfigData = {...pieChartConfig};

  return Highchart({
    height: '65vh',
    configs: [finalConfigData],
    width: 300
  });
}

export default ReportGraph;


