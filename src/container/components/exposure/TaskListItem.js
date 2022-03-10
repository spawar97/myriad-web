
import React from 'react'
import { size } from 'underscore';
var RouteNameConstants = require('../../constants/RouteNameConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var Util = require('../../util/util');

const TaskListItem = props => {
    const [showLess, setShowLess] = React.useState(true);
    const length = 105;
    const viewSelectedtask = (taskId) => {
        window.open('/' + RouteNameConstants.EXPOSURE_TASKS + '/' + taskId);
    }
    const { immExposureStore } = props;
    let assigneeIds = props.assigneeIds;
    let assigneeList = [];
    let username = [];
    for (const element of assigneeIds) {
        username = Util.getUserOrTeamNameFromId(immExposureStore.get('users'), immExposureStore.get('groupEntities'), element)
        assigneeList.push(username);
    }

    return (
        <div className="task-list">
            <div>
                <span className='task-refrenceid' onClick={() => { viewSelectedtask(props.id) }}>{props.taskRefrenceId}</span>
                <span className='task-modified'><span className='task-modified-label'>{FrontendConstants.TASK_LIST_SORT_MODIFIEDON}</span><span className='task-modified-value'>{Util.dateTimeFormatterUTC(props.updatedAt, true)}</span></span>
            </div>
            <div className='task-list-title'>
                <span title={props.title}>  {props.title}</span>
            </div>
            <div className='task-assinee'>
                <span className='task-assinee-label'>{FrontendConstants.ASSIGN_TO}</span>
                <span title={assigneeList}className='task-assinee-value'>{assigneeList.join(',')}</span>
            </div>
            {props.description.length < length ? <div className='task-discrip'>{props.description}</div> :
                <div>
                    <div className='task-discrip'>{showLess ? `${props.description.slice(0, length)}...` : `${props.description}`}</div>
                    <a className='task-show' onClick={() => setShowLess(!showLess)} >{FrontendConstants.SHOW} {showLess ? FrontendConstants.MORE : FrontendConstants.LESS}</a>
                </div>
            }
            <div className='task-priority-view'>
                <span className="badge"
                    style={{ background: props.priority == 'Urgent' ? '#AF2452 ' : props.priority == 'High' ? '#F84D71 ' : props.priority == 'Medium' ? '#FFCC56 ' : '#4BC0C0' }}>{props.priority}
                </span>
                <span className='task-status'>{FrontendConstants.STATUS}:  <span className='task-status-label'> {props.status}</span></span>
                <a className='task-viewtask-btn' onClick={() => { viewSelectedtask(props.id) }}>{FrontendConstants.VIEW_TASK}<span className='icon-arrow-right'></span></a>
            </div>
        </div>
    )
}

export default TaskListItem
