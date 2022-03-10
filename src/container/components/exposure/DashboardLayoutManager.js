import React from 'react';
import '../../../stylesheets/modules/dashboard-view.scss';
const DashboardLayoutManager = (props) => {
  const { totalRows, defaultColumns, widgets, customStyle } = props;
  let widgetIndex = 0;
  let rightPanelWidgets = [];
  let roundedWidgets = [];
  
  const mapWidgets = (widgets) => {
    widgets?.map((widget) => {
      if (widget?.props?.widgetMetaData?.rightPanel) {
        rightPanelWidgets.push(widget)
      }
      else {
        roundedWidgets.push(widget)
      }
    })
  }
  const generateColumns = (currentRow) => {
    let columnHtml = [];
    let columnCount = props[`row${currentRow}`] ? props[`row${currentRow}`] : defaultColumns;
    if (widgetIndex === 0){
      columnHtml.push(<div>{roundedWidgets[widgetIndex]}</div>);
    }
    for (let i = 0; i < columnCount; i++) {
      widgetIndex = widgetIndex + 1; 
      if(columnCount == 1){
        columnHtml.push(<div className={`dashboard-col single-widget ${roundedWidgets[widgetIndex]?.props?.widgetMetaData?.className} widget-${widgetIndex}`}>{roundedWidgets[widgetIndex]}</div>);
      }else{
        columnHtml.push(<div className={`dashboard-col ${roundedWidgets[widgetIndex]?.props?.widgetMetaData?.className} widget-${widgetIndex}`}>{roundedWidgets[widgetIndex]}</div>);
      }

    }
    return columnHtml;
  }
  const generateRows = (count) => {
    
    let html = [];
    
    for (let i = 0; i < count; i++) {
      html.push(<div className="dashboard-row">{generateColumns(i + 1)}</div>);
    }
    return html;
  }
  const showRightPanel = (rightPanelWidgets) => {
    let html = [];
    
    for (let i = 0; i < rightPanelWidgets.length; i++) {
      html.push(<div className="dashboard-row">{rightPanelWidgets[i]}</div>);
    }
    return html;
  }
  mapWidgets(widgets);
  return <div id="dashboard-layout"><div className="center-widgets">{generateRows(totalRows)}</div><div className="right-widgets">{showRightPanel(rightPanelWidgets)}</div></div>
}
export default DashboardLayoutManager;
