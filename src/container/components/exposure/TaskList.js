import React, { useEffect, useState } from 'react'
import TaskListItem from './TaskListItem';
import Imm from 'immutable';
var Combobox = React.createFactory(require('../Combobox'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
import Spinner from '../Spinner';


const TaskList = props => {

  const taskRelationshipList = [
    { id: 0, label: FrontendConstants.ALL, value: "" },
    { id: 1, label: FrontendConstants.CREATED_BY_ME, value: FrontendConstants.OWNER },
    { id: 2, label: FrontendConstants.ASSIGNED_TO_ME, value: FrontendConstants.ASSIGNEE },
    { id: 3, label: FrontendConstants.OBSERVED_BY_ME, value: FrontendConstants.OBSERVER }
  ];

  const [taskRelationship, setTaskRelationship] = useState("");
  const [taskmodified, setTaskmodified] = useState(false);
  const [isdisable, setisDisable] = useState(true);
  const [taskpriority, setTaskpriority] = useState(false)
  const [isdisablepriority, setisDisablepriority] = useState(false);
  const [selectedvalue, setSelectedvalue] = useState({ value: 0, label: FrontendConstants.ALL })
  const [sortBy, setsortBy] = useState(FrontendConstants.UPDATED_AT)
  const [orderBy, setorderBy] = useState(FrontendConstants.DESC)
  const [currentPage, setCurrentPage] = useState(1)  

  var taskList = [];
  var totalTasks = 0;
  var pageSize = 5;

  function isReady() {
    const { immExposureStore } = props;
    if (immExposureStore.get('apitasklist')) {
      taskList = immExposureStore.get('apitasklist')
      totalTasks = immExposureStore.get('totalTasks')
    }
  }

  useEffect(() => {
    if (currentPage) {
      ExposureActions.getTaskList(taskRelationship, sortBy, orderBy, 0, pageSize * currentPage, props.context);
    }
  }, [currentPage])

  useEffect(() => {
    document.getElementById('task-list-panel').scrollTop = 0;
    setCurrentPage(1);
  }, [taskRelationship, taskmodified, taskpriority])

  let ready = isReady();
  
  const tasklistSortpriority = () => {
    const psort = !taskpriority;
    setTaskpriority(psort)
    setsortBy(FrontendConstants.PRIORITY)
    setorderBy(psort ? FrontendConstants.ASC : FrontendConstants.DESC);
    setisDisablepriority(true)
    setisDisable(false)
    setCurrentPage(0)
  }

  const tasklistSortmodified = () => {
    const tsort = !taskmodified;
    setTaskmodified(tsort);
    setsortBy(FrontendConstants.UPDATED_AT)
    setorderBy(tsort ? FrontendConstants.ASC : FrontendConstants.DESC);
    setisDisable(true)
    setisDisablepriority(false)
    setCurrentPage(0)    
  }

  const selectRelation = (val) => {
    const selcetedRelation = taskRelationshipList.find(x => x.id === val)
    const { id, value, label } = selcetedRelation;
    setTaskRelationship(value);
    setSelectedvalue({ label: label, value: id })
    setCurrentPage(0)
  }
  const handleScroll = (e) => {
    let element = e.target
    if ((element.clientHeight + element.scrollTop >= element.scrollHeight - 1) && pageSize * currentPage < totalTasks) {
      setCurrentPage(currentPage + 1);
    }
  }
  return (
    <div className="task-list-container task-pane">
      <div className="tasklist-realtionship">
        <div style={{ width: "41%" }}>
          {
            Combobox({
              className: "dropdown",
              clearable: false,
              placeholder: FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER,
              value: selectedvalue,
              options: Imm.List(taskRelationshipList.map(val => ({ value: val.id, label: val.label }))),
              onChange: selectRelation
            })}
        </div>
        <div className={`tasklist-sort ${(isdisablepriority)? 'active_tab' :''}` } onClick={tasklistSortpriority}>
          <span>
            {FrontendConstants.TASK_LIST_SORT_PRIORITY}
            {!isdisablepriority ? <i className={"pi pi-sort-amount-up tasklist-idisable"} ></i> :
              taskpriority ? <i className={"pi pi-sort-amount-down-alt tasklist-icon"} ></i> : <i className="pi pi-sort-amount-up tasklist-icon"></i>}
          </span>
        </div>
        <div className={`tasklist-modified ${(isdisable)? 'active_tab' :''}` } onClick={tasklistSortmodified} >
          <span>
            {FrontendConstants.TASK_LIST_SORT_MODIFIEDON}
            {!isdisable ? <i className={"pi pi-sort-amount-up tasklist-idisable"} ></i> :
              taskmodified ? <i className={"pi pi-sort-amount-down-alt tasklist-icon"} ></i> : <i className="pi pi-sort-amount-up tasklist-icon"></i>}
          </span>
        </div>
      </div>
      
      <div id='task-list-panel' onScroll={(e) => { handleScroll(e) }}>
        {
          props.immExposureStore.get('isTaskListLoading') ? <div className='no-task'><Spinner/></div> :
          taskList.length > 0 ?
            (taskList.map((item) => {
              return <TaskListItem key={item.id} {...item} immExposureStore={props.immExposureStore} />
            })) : (<div className='no-task'>{FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.TASKS)}</div>)
        }
      </div>
    </div>
  )
}


export default TaskList
