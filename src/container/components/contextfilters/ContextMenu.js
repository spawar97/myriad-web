import React,{ useState, useEffect }  from 'react';
import Util from '../../util/util';
import { Observable } from 'windowed-observable';
import  FrontendConstants from '../../constants/FrontendConstants'
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import CookieStore from '../../stores/CookieStore';

const ContextMenu = (props) => {
  let { currentPoint, componentThis, currentChart, unmountCustomContextMenu  } = props;
  let { immReport, immExposureStore, widgetMetaData } = componentThis.props;
  const [pointX, setPointX] = useState();
  const [pointY, setPointY] = useState();
  const [coOrdinates, setCoOrdinates] = useState({});
  
  
  const calCulateXandY = (chart, selectedPoint) => {
    let chartWidth = chart.plotWidth;
    let contextMenuWidth = 50;
    let currentPointX = selectedPoint.offsetX;

    let shiftX = 0;
    if ((currentPointX + contextMenuWidth) > chartWidth) {
      shiftX = (currentPointX + contextMenuWidth) - chartWidth; 
    }     

    let coordinates = {
      x: selectedPoint.x,
      y: selectedPoint.y,
      xWithScroll: selectedPoint.x + window.pageXOffset,
      yWithScroll: selectedPoint.y + window.pageYOffset
    };

    setPointX(currentPointX - shiftX);
    setPointY(selectedPoint.offsetY);
    setCoOrdinates(coordinates)
  }

  useEffect(() => {
    document.onclick = function(e){
      unmountCustomContextMenu();
    };
  }, []);

  useEffect(() => {
    calCulateXandY(currentChart, currentPoint);
  }, [currentChart]);

  const showAddTaskPanel = (actionType) => {
    let tabId = widgetMetaData.tab; // will be implemented when the tab will be implemented
    let {x: pointX,y:pointY}= coOrdinates
    let widgetId = widgetMetaData.widgetId;
    let widgetTitle = widgetMetaData.widgetTitle?widgetMetaData.widgetTitle:widgetMetaData.highchartConf?.chartTitle;
    let args = { immReport, immExposureStore, widgetId, pointX, pointY, actionType, CookieStore, widgetTitle ,tabId};
    let taskObject = Util.generateContextObject(args);
    observable.publish(taskObject);
    unmountCustomContextMenu();
  }
  
 

  return (    
    <>
    { !currentChart?.fullscreen?.isOpen? <div className="custom-context context_menu" style={{top: pointY, left: pointX }}>
        <div className="cnt-add-task" onClick={() => showAddTaskPanel(FrontendConstants.ADD_TASK)}><span className='icon-add-task'></span> <span>Add Task</span></div>
      </div> : null
    }
    </>
      )
}

ContextMenu.defaultProps = {

}

export default ContextMenu

