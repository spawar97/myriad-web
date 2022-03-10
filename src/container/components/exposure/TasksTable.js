var React = require('react');
var Imm = require('immutable');
var Util = require('../../util/util');
var _ = require('underscore');
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));

import PropTypes from 'prop-types';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "primeflex/primeflex.css";
import { DataTable } from 'primereact-opt/datatable';
import { Column } from 'primereact-opt/column';
import { TabMenu } from 'primereact-opt/tabmenu';
import ExposureActions from '../../actions/ExposureActions';
import ExposureStore from '../../stores/ExposureStore';
import ViewTask from './ViewTask';
import "../../../stylesheets/modules/tasks-dashboard.scss";
import { getObject } from '../../util/SessionStorage';

class TasksTable extends React.Component {
  constructor(props) {
    super(props);
    let newQueryParams = _.clone(JSON.parse(getObject('collaboration-navigation')));
    var initialSortObj = []
    if(newQueryParams) {
      initialSortObj = [{field: newQueryParams['sortBy'], order: newQueryParams['order']}]
    }
    this.state = {
      taskTableData: [],
      activeIndex: 0,
      showTask: false,
      taskData: {},
      currentTaskId: null,
      multiSortMeta: initialSortObj ? initialSortObj : [],
      currentTaskId: null,
      applicationsClass: {
        "Clinical Insights": '#4072c1',
        'Operations Insights': '#3cad87',
        'Clinical Data Review': '#cec33a',
        'KPI Studio': '#d861a0',
        'RBQM': '#8e3ad6',
        'Other': '#a92a6d'
      },
      colorClass: ['#4072c1', '#3cad87', '#cec33a', '#cb844d', '#8e3ad6', '#07d790', '#026fc4', '#02c2ab', '#04b608', '#8cc61a', '#a92a6d', '#fec702', '#cc810a', '#cd1e02', '#a555de', '#4afabe', '#2fa3fd', '#2dfde4', '#26fafb', '#baea5c', '#d861a0', '#f4cd3f', '#f5b247', '#f68755', '#fd5338']
    }
    this.taskColumns = [
      { field: 'isStarred', header: <span className='icon-star-full'></span>, sortable: true },
      { field: 'taskRefrenceId', header: 'Task Id', sortable: true },
      { field: 'title', header: 'Task Title', sortable: true },
      { field: 'priorityIndex', header: 'Priority', sortable: true },
      { field: 'taskType', header: 'Task Type', sortable: true },
      { field: 'updatedAt', header: 'Updated', sortable: true },
      { field: 'dueDate', header: 'Due Date', sortable: true },
      { field: 'taskStateKind', header: 'Status', sortable: true },
      { field: 'actionType', header: 'Action', sortable: true },
      { field: 'authorId', header: 'Author', sortable: true },
      { field: 'assignees', header: 'Assignees', sortable: true },
      { field: 'panel' }
    ];
  }

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  handleTabChange(e) {
    let tabType = 'open'
    if (e.index === 1) {
      tabType = 'close'
    }
    ExposureActions.setTaskTab(tabType)
    this.getActiveIndex()
  }

  handleFavorites(f, id) {
    let value = true
    if (f.target.classList[0] === 'icon-star-full') {
      value = false
    }
    ExposureActions.tasksViewSetIsStarred(id, value)
  }

  showLoadMore(immOpenTasksData, totalTaskRows, immCloseTasksData, totalClosedTaskRows) {
    if (this.props.immExposureStore.get('taskTabSelected') === 'open') {
      return (
        <div>
          {
            immOpenTasksData.size !== totalTaskRows ? (
              <div>
                <button className='loadBtn' onClick={() => this.loadMoreTaskList()}>Load More</button>
                <span>{immOpenTasksData.size} of {totalTaskRows}</span>
              </div>
            ) : (
              <span>{immOpenTasksData.size} of {totalTaskRows}</span>
            )
          }
        </div>
      )
    } else if (this.props.immExposureStore.get('taskTabSelected') === 'close') {
      return (
        <div>
          {
            immCloseTasksData.size !== totalClosedTaskRows ? (
              <div>
                <button className='loadBtn' onClick={() => this.loadMoreTaskList()}>Load More</button>
                <span>{immCloseTasksData.size} of {totalClosedTaskRows}</span>
              </div>
            ) : (
              <span>{immCloseTasksData.size} of {totalClosedTaskRows}</span>
            )
          }
        </div>
      )
    }
  }

  getTaskPanel(task) {
    ExposureActions.setTaskShowHideDetail(true)
    this.setState({
      currentTaskId: task.get('id')
    })
  }

  loadMoreTaskList() {
    let newQueryParams = JSON.parse(getObject('collaboration-navigation'))
    if (this.props.immExposureStore.get('taskTabSelected') === 'open' && newQueryParams['taskStateFilter'] === 'OPEN') {
      newQueryParams['length'] = newQueryParams['length'] + 20
    } else if (this.props.immExposureStore.get('taskTabSelected') === 'close' && newQueryParams['taskStateFilter'] === 'CLOSED') {
      newQueryParams['length'] = newQueryParams['length'] + 20
    } else {
      newQueryParams['length'] = 20
    }

    if (this.props.immExposureStore.get('taskTabSelected') === 'open') {
      newQueryParams['taskStateFilter'] = 'OPEN'
      ExposureActions.fetchTasksWithParameters(true, newQueryParams);
    } else {
      newQueryParams['taskStateFilter'] = 'CLOSED'
      ExposureActions.fetchClosedTasksWithParameters(true, newQueryParams);
    }
  }

  getUserDetail(task, u_detail) {
    if (u_detail !== undefined) {
      return u_detail.get('lastName')+ ', ' + u_detail.get('firstName')
    } else {
      return task.getIn(['task', 'monitorTitle'])
    }
  }

  getAppName(task_context) {
    if (task_context && task_context.size) {
      const data = task_context.toJS()
      const filterAppNameKey = data.filter(e => e['key'] === 'app')
      if (filterAppNameKey.length) {
        return filterAppNameKey.map(f => f['value'])[0].toString()
      } else {
        return ''
      }
    }
  }

  isFavToggleAllowed(task_obj) {
    let response = 'enabled'
    const currentUserId = this.props.immExposureStore.getIn(['userInfo', 'id'])
    const author = task_obj.getIn(['task', 'authorId'])
    const assignees = task_obj.getIn(['task', 'assigneeIds']).toJS()
    const observers = task_obj.getIn(['task', 'observerIds']).toJS()
    if (assignees.length || observers.length) {
      if (author !== currentUserId && !assignees.includes(currentUserId) && !observers.includes(currentUserId)) {
        response = 'disabled'
      }
    }
    return response
  }

  getDataAsPerTableFormat(t, t_state_type) {
    const taskObj = {}
    const assignees = []
    var hasStarred = false

    const metadata_obj = this.props.immExposureStore.getIn(['tasks', t.getIn(['task', 'id']), 'metadata'])
    if (metadata_obj) {
      if (metadata_obj.get('isStarred')) {
        hasStarred = true
      }
    }
    let appName = t.getIn(['task', 'appName']);
    const isEnabled = this.isFavToggleAllowed(t)
    taskObj["isStarred"] = <div className={hasStarred ? 'icon-star-full'
      : 'icon-star-empty'
    } style={{ borderLeft: `6px solid ${this.state.applicationsClass[appName ? appName : 'Other']}` }}
      onClick={e => this.handleFavorites(e, t.getIn(['task', 'id']))} />

    taskObj['taskRefrenceId'] = <div className='taskId' title={t.getIn(['task', 'taskRefrenceId'])} onClick={() => this.getTaskPanel(t.get('task'))}> {t.getIn(['task', 'taskRefrenceId'])} </div>
    taskObj['title'] = <div className='taskTitle' title={t.getIn(['task', 'title'])}>{t.getIn(['task', 'title'])}</div>
    taskObj['taskType'] = <div className='taskTypee' title={t.getIn(['task', 'taskType'])} >{t.getIn(['task', 'taskType'])} </div>
    taskObj['actionType'] = <div className='taskAction' title={t.getIn(['task', 'actionType'], '--')}>{t.getIn(['task', 'actionType'], '--')} </div> 
    taskObj['priorityIndex'] = <div className={t.getIn(['task', 'priority'])} title={t.getIn(['task', 'priority'])}>{t.getIn(['task', 'priority'])}</div>
    taskObj['updatedAt'] = <div className='taskUpdatedAt' title={Util.dateTimeFormatterUTC(t.getIn(['task', 'updatedAt']), true)}>{Util.dateFormatterDMMMYYUTC(t.getIn(['task', 'updatedAt']))} </div> 
    taskObj['dueDate'] = <div className='taskDueDate' title={Util.dateFormatterDMMMYYUTC(t.getIn(['task', 'dueDate']))}>{Util.dateFormatterDMMMYYUTC(t.getIn(['task', 'dueDate']))}</div> 
    taskObj['taskStateKind'] = <div className='taskStatee' title={Util.toTitleCase(t.getIn(['task', 'taskStateKind']))}>{Util.toTitleCase(t.getIn(['task', 'taskStateKind']))} </div> 
    taskObj['authorId'] = <div className='taskAuthorId' title={this.getUserDetail(t, Util.getUserById(t.getIn(['task', 'authorId'])))}>{this.getUserDetail(t, Util.getUserById(t.getIn(['task', 'authorId'])))}</div> 
    t.getIn(['task', 'assigneeIds']).map((u) => {
      const value = Util.getUserOrTeamNameFromId(this.props.immExposureStore.get('users'), this.props.immExposureStore.get('groupEntities'), u)
      assignees.push(value)
    })
    taskObj['assignees'] = <div className='taskAssignee' title={assignees.toString()}> {assignees.toString()}</div>
    taskObj["panel"] = <div className={'icon-arrow-right'} onClick={() => this.getTaskPanel(t.get('task'))} />
    return taskObj;
  }

  handleSorting(sortType) {
    let newQueryParams = _.clone(JSON.parse(getObject('collaboration-navigation')));
    let sortOrder = 'asc'
    if (!this.state.multiSortMeta[0] || this.state.multiSortMeta[0].field !== sortType || this.state.multiSortMeta[0].order === -1) {
      sortOrder = 'asc'
    } else {
      sortOrder = 'desc'
    }
    newQueryParams['sortBy'] = sortType
    newQueryParams['order'] = sortOrder
    this.setState({
      multiSortMeta: [{field: sortType, order: sortOrder === 'asc' ? 1 : -1}]
    }, () => {
      if (this.props.immExposureStore.get('taskTabSelected') === 'open') {
        ExposureActions.fetchTasksWithParameters(true, newQueryParams);
      } else if (this.props.immExposureStore.get('taskTabSelected') === 'close') {
        ExposureActions.fetchClosedTasksWithParameters(true, newQueryParams);
      }
    })
  }

  getActiveIndex() {
    let activeIndex = 0
    if (this.props.immExposureStore.get('taskTabSelected') === 'close') {
      activeIndex = 1
    }
    return activeIndex
  }


  render() {
    const { immExposureStore, immTaskWrappers, immClosedTaskWrappers } = this.props
    const viewTaskProp = {
      immExposureStore,
      currentUserId: immExposureStore.getIn(['userInfo', 'id']),
      immTaskSummaries: immExposureStore.get('taskSummaries'),
      immTaskWrappers: immExposureStore.get('tasks'),
      handleToggleTasksPane: () => { },
      immFileConfigs: immExposureStore.get('fileConfigs'),
      immUsers: immExposureStore.get('users'),
      isUnsavedWarningDisplayed: false,
      immTaskTypes: immExposureStore.get('taskTypes'),
      immGroupEntities: immExposureStore.get('groupEntities'),
      isLoading: immExposureStore.get('isLoadingTask'),
      isViewOnlyTask: true
    }
    const openTaskTableData = []
    const closedTaskTableData = []
    let immCloseTasksData = []
    let totalClosedTaskRows = 0

    const immOpenTasksData = immExposureStore.get('tasksView').get('taskIds')
    const totalTaskRows = immExposureStore.get('tasksView').get('totalRows')
    if (immExposureStore.get('closedTasksView')) {
      totalClosedTaskRows = immExposureStore.get('closedTasksView').get('totalRows')
      immCloseTasksData = immExposureStore.get('closedTasksView').get('taskIds')
    }

    if (totalTaskRows > 0) {
      if (immTaskWrappers) {
        immTaskWrappers.map((t) => {
          const taskObj = this.getDataAsPerTableFormat(t, 'open')
          openTaskTableData.push(taskObj)
        })
      }
    }

    if (totalClosedTaskRows > 0 && immClosedTaskWrappers) {
      immClosedTaskWrappers.map((t) => {
        const taskObj = this.getDataAsPerTableFormat(t, 'close')
        closedTaskTableData.push(taskObj)
      })
    }

    let defaultProps = {
      resizableColumns: true,
      pageLinkSize: 1
    }

    return (
      <div className='card-container'>
        <div className='table-view-container'>
          <div>
            <TabMenu activeIndex={this.getActiveIndex()} model={[
              { label: 'Open Tasks (' + totalTaskRows + ')' },
              { label: 'Closed Tasks (' + totalClosedTaskRows + ')' }
            ]} onTabChange={(e) => this.handleTabChange(e)} />
            {
              this.props.immExposureStore.get('taskTabSelected') === 'close' ? (
                <div className='table-view-container'>
                  {
                    !this.props.immExposureStore.get('closeTaskTableloading') ? (
                      <DataTable {...defaultProps} value={closedTaskTableData} multiSortMeta={this.state.multiSortMeta}>
                        {
                          this.taskColumns.map((col, i) => {
                            let headerComponent = <span style={{ cursor: 'pointer'}} onClick={() => this.handleSorting(col.field)}>{col.header}</span>
                            return <Column key={col.field} field={col.field} header={headerComponent} className={col.field} sortable={col.sortable} sortableDisabled/>;
                          })
                        }
                      </DataTable>
                    ) : (
                      <ContentPlaceholder />
                    )
                  }
                </div>
              ) : (
                <div className='table-view-container'>
                  {
                    this.props.immExposureStore.get('taskTableloading') ? (
                      <ContentPlaceholder />
                    ) : (
                      <DataTable {...defaultProps} value={openTaskTableData} multiSortMeta={this.state.multiSortMeta}>
                        {
                          this.taskColumns.map((col, i) => {
                            let headerComponent = <span style={{ cursor: 'pointer'}} onClick={() => this.handleSorting(col.field)}>{col.header}</span>
                            return <Column key={col.field} field={col.field} header={headerComponent} className={col.field} sortable={col.sortable} sortableDisabled/>;
                          })
                        }
                      </DataTable>
                    )
                  }
                </div>
              )
            }
            {this.showLoadMore(immOpenTasksData, totalTaskRows, immCloseTasksData, totalClosedTaskRows)}
          </div>
          {
            this.props.immExposureStore.get('showTaskDetail') ?
              <ViewTask {...viewTaskProp} currentTaskId={this.state.currentTaskId} />
              : <div></div>
          }
        </div>
      </div >
    )
  }
}

module.exports = TasksTable;
