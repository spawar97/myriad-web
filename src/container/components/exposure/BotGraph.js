// Import jquery
var $ = require('jquery');
window.jQuery = $;

// Import myriad highchart component
var React = require('react');
var Highchart = React.createFactory(require('../Highchart'));

// Import the chart config from cqs-opt library
import SimpleDonut from "cqs-opt/src/vizspecs/SimpleDonut";
import TrendDB from "cqs-opt/src/vizspecs/TrendDB";
import saamaLogo from '../../../images/saama_dark_logo.png';

class BotGraph extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      chartConfigData: {},
      definedColors : {
        "Incomplete Data": "#D6D6D4",
        "Non Serious Not Related AE": "#EAE63D",
        "Non-Serious-Not-Related": "#EAE63D",
        "Serious Related AE": "#D66B6B",
        "Serious-Related": "#D66B6B",
        "Serious Not Related AE": "#928228",
        "Serious-Not-Related": "#928228",
        "Non Serious Related AE": "#CB9135",
        "Non-Serious-Related": "#CB9135",
        "Related": "#918229",
        "Not-Related": "#CA9135",
        "Serious": "#A82350",
        "Non-Serious": "#EF9C75",
        "Incomplete-Data": "#D6D6D4"
      },
      events: {
        load: function() {
          this.series.forEach(function(s) {
            s.update({
              showInLegend: s.data.filter(obj => obj.y > 0).length > 0 ? true : false
            });
          });
        }
      },
      exportOptionsButton: {
        contextButton: {
          menuItems: [{
            text: 'Download PDF',
            onclick: function () {
                this.exportChart({
                    type: 'application/pdf'
                });
            }
          },
          {
            text: 'Download PNG',
            onclick: function () {
                this.exportChart({
                    type: 'image/png'
                });
            }
          },
          {
            text: 'Download JPEG',
            onclick: function () {
                this.exportChart({
                    type: 'image/jpeg'
                });
            }
          }]
        }
      },
      exportChartOptions: {
        chart: {
          events: {
            load: function() {
              this.renderer.image(saamaLogo, '20%', '35%', 300, 120)
              .attr({zIndex:1000, style:'opacity: 0.05'}).add();
            }
          }
        }
      }
    }
  }
  getTrendDataConfig = () => {
    let graphData = this.props.graphData;
    let xLabel = graphData['x-label'];
    let dataGroupedByCategory = _.groupBy(_.sortBy(graphData.graph_data, data => new Date(data[xLabel])), 'category');
    let categories = graphData.legends;    
    let trendData = _.map(categories, cat => ({
      name: cat,
      color: this.state.definedColors[cat],
      data: _.chain(dataGroupedByCategory[cat])
        .map(data => {
          let monthYear = data[xLabel];
          return {
            name: monthYear,
            y: data.count            
          };
        })
        .compact()
        .value()
    }));
    let xAxisCategories = _.chain(graphData.graph_data).pluck(graphData['x-label']).uniq().compact().value();    
    
    if(graphData.trend_data){
      let trendLineData = [];
      Object.entries(graphData.trend_data).map(([time, count])=> {
        trendLineData.push({
          name : time,
          y: count         
        })
      });
      trendData.push({
        name: 'Average AE',
        color: "#81878D",
        type: 'line',
        visible: true,
        data: trendLineData
      })

      if(trendLineData.length > xAxisCategories.length){
        xAxisCategories = _.chain(trendLineData).pluck('name').compact().value();
      }     
    }        
    const configData = {
      chartTitle: `<b>${graphData.graph_title}</b>`,
      titleUseHtml: true,
      forcePositiveYValue: true,
      xAxisCategories: xAxisCategories,
      yAxisTitle: 'Count of AE',
      series: trendData,
      tooltipValueSuffix: 'AE(s)',
      tooltipRateSuffix: ' AE',
    };
    let barChartConfig = TrendDB(configData);
    let finalConfigData = {...barChartConfig,
      exporting: {
        enabled: true,
        filename: graphData.graph_title,
        chartOptions: this.state.exportChartOptions,
        buttons: this.state.exportOptionsButton
      },
      chart: {...barChartConfig.chart, 
        zoomType: 'x',
        events: this.state.events
      },
      xAxis: {...barChartConfig.xAxis, 
        min:0, 
        max: xAxisCategories.length - 1
      },
      yAxis: {...barChartConfig.yAxis,
          reversedStacks: false
      },
      tooltip: {...barChartConfig.tooltip,
        pointFormatter: undefined,
        backgroundColor: null,
        borderWidth: 0,
        shadow: false,
        shared: true,
        useHTML: true,
        formatter: function () {
          let tooltip = `<div class="bullet-tooltip-cat tooltip-wrapper">
          <div class="query-tooltip">
            <span class="tooltip-title" >${this.points[0].key}</span>`;
          _.sortBy(this.points, (point) => point.series.name).map((point) =>{
            if(point.y > 0){
              tooltip += `<div class="tooltip-row">
                <span class="ageing-tooltip-label tooltip-label">
                  <span style="background:${point.color}" class="over-circle"></span>${point.series.name}:
                </span>
                <span class="tooltip-value" >${point.y}</span>
              </div>`
            }
          });
          tooltip += `<hr/><span>Total: </span> <span class="tooltip-value">${this.points[0].total}</span></div></div>`;          
          return tooltip;
        }
      }
    };
    this.setState({
      chartConfigData : finalConfigData
    }); 
  }
  
  getPieDataConfig = () => {
    let graphData = this.props.graphData;
    let data = graphData.graph_data.map(obj => ({
      ...obj,
      color: this.state.definedColors[obj.name]
    })).filter(obj => obj.y > 0);
    
    const configData = {
      chartTitle: graphData.graph_title,
      seriesName: 'AE Count',
      data: data,
      dataLabels: {
        enabled: true,
        formatter: function() {
          if (this.y > 0) {
            return '<b>' + this.y + ' ('+ this.percentage.toFixed(2) + '%)</b>';
          }
        }
      },
      enableTooltip: true,
      tooltipFormatter: function() { return `Count: ${this.y} AE(s)<br>Percentage: ${this.percentage.toFixed(2)} %`}
    };
    let pieChartConfig = SimpleDonut(configData);
    let finalConfigData = {...pieChartConfig,
      exporting: {
        enabled: true,
        filename: graphData.graph_title,
        chartOptions: this.state.exportChartOptions,
        buttons: this.state.exportOptionsButton
      }
    };
    this.setState({
      chartConfigData : finalConfigData
    }); 
  }  
  componentDidMount() {
    const graphType = this.props.graphData.graph_type;
    switch(graphType){
      case 'bar':
        this.getTrendDataConfig();
      break;
      case 'pie':
        this.getPieDataConfig();
      break;
    }
  }
  render() {
    return(
      <div>      
        <Highchart height='65vh' configs={[this.state.chartConfigData]} width={300}/>
      </div>
    );
  }  
}


export default BotGraph;
