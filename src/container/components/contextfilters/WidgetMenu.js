import React from 'react'
import Tooltip from 'rc-tooltip';
import { Checkbox } from 'primereact-opt/checkbox';
import { useState, useEffect } from 'react';
import CookieStore from '../../stores/CookieStore';
import FrontendConstants from '../../constants/FrontendConstants'
import { Observable } from 'windowed-observable';
import { getExposureStore } from '../../CustomRenderer';
import Util from '../../util/util';
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
const WidgetMenu = (props) => {
  let { highcharts, useFullScreen } = props;
  let { immReport, immExposureStore, widgetMetaData, charts } = highcharts.props;
  const [checked, setChecked] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [showToolTip, setShowToolTip] = useState(true);
  const exposureStore = getExposureStore();
  let count = immExposureStore.get('taskCountOfWidgets')

  useEffect(() => {
    if(widgetMetaData?.widgetId){
      let selectedWidget = count && count.find(data => {
        return data.name == widgetMetaData?.widgetId
      })
      selectedWidget && setTaskCount(selectedWidget.taskCount)
    }
  }, [count])

  const getCount = (getExposureStore) => {
    const count = getExposureStore().getExposureStore().get('taskCountOfWidgets');
    let returnCount = count && count.find(data => data.name == widgetMetaData.widgetId)?.taskCount;
    return returnCount ? returnCount : 0;
  }

  const tooltipAlignment = {
    overflow: {
      adjustX: 1,
      adjustY: 0,//stops adjusting the Y position and displays a scroll instead
    },
  };

  const getCoordinates = (e) => {
    let coordinates = {
      x: e.pageX,
      y: e.pageY,
    };
    return coordinates;
  }

  const handleOnAddTaskCheckbox = (e, actionType, CookieStore) => {
    let { clientX: pointX, clientY: pointY } = e
    let widgetId = widgetMetaData.widgetId;
    let tabId = widgetMetaData.tab;
    let widgetTitle = widgetMetaData.widgetTitle ? widgetMetaData.widgetTitle : widgetMetaData.highchartConf?.chartTitle;
    let args = { immReport, immExposureStore, widgetId, pointX, pointY, actionType, CookieStore, widgetTitle, tabId };
    let taskObject = Util.generateContextObject(args);
    observable.publish(taskObject);
    setShowToolTip(false)
  }




  const taskMenuItems = () => {
    return <div className='add-task-menu context_menu'>
      <div id='add-task-text' htmlFor="add-task" onClick={e => handleOnAddTaskCheckbox(e, FrontendConstants.TASK_LIST, CookieStore)}>
        <span className='icon-icon-view-tasks'></span>
        <span className='task-menutext' > View Tasks </span>
        <span className='task-count'>({getCount(getExposureStore)})</span>
      </div>
    </div>
  }


  const TaskMenuHamburger = (
    <div id='widget-task-icon'>
      <Tooltip
        overlayClassName={'task-icon-tooltip widgetDropdown'}
        placement="bottomRight"
        trigger={['click']}
        align={tooltipAlignment}
        overlay={taskMenuItems}
        destroyTooltipOnHide={true}
        mouseEnterDelay={0.1}
      >
        <div className="task-menu-icon" />
      </Tooltip>
    </div>);

  const handleWidgetZoom = () => {

    if (_.isEmpty(highcharts.charts)) {

      if (useFullScreen?.active) {
        useFullScreen.exit();
      } else {
        useFullScreen.enter();
      }

    } else {
      highcharts?.charts?.[0]?.fullscreen.toggle();
    }

  }

  let isMaximizeEnabled = highcharts?.props?.widgetMetaData?.viewFullScreen;
  let isAddTaskEnabled = highcharts?.props?.widgetMetaData?.addTask;

  return (
    <div className='menu-container'>
      {isMaximizeEnabled ?
        <div className='widget-zoom-icon' onClick={() => handleWidgetZoom()} />
        : null
      }

      {isAddTaskEnabled && !immExposureStore.get('isViewTasks') ? TaskMenuHamburger : null}

    </div>
  )
}

export const callTaskCountApi = async (store, reportId) => {
  let CookieStore = store.immExposureStore.toJS().masterStudyFilterContext.props.cookies;
  let selectedStudy = Util.getSelectedStudiesFilterFromSession(CookieStore, store.immExposureStore)
  let { id, accountId, modules, fileType, title: titleString } = store.immFile.toJS();
  await getExposureStore().getTaskCountApi(
    {
      "groupBy": 'widgetId',
      "taskContext": {
        "filters": [
          { "key": "app", "value": fileType === ExposureAppConstants.FILE_TYPE_DATA_REVIEW ? [FrontendConstants.DATA_REVIEW_SET] : modules },
          { "key": "studyId", "value": selectedStudy.toJS().map(data => data.label) }, { "key": "fileId", "value": [id] },
          {
            "key": "accountId",
            "value": [
              accountId
            ]
          }
        ],
        "extraInformation": ""
      }
    }).then((res) => {
      if (res?.Error) {
        throw new Error(res?.Error?.message)
      } else {
      }
    })
}


export default WidgetMenu

