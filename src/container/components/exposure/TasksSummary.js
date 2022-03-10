var React = require('react');
var ExposureActions = require('../../actions/ExposureActions');
var Imm = require('immutable');
var Combobox = require('../Combobox');
var _ = require('underscore');
var FrontendConstants = require('../../constants/FrontendConstants')
var ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));

import { Pointer } from 'highcharts';
import PropTypes from 'prop-types';
import "../../../stylesheets/modules/tasks-dashboard.scss"
import "../../../stylesheets/modules/tasks-summary.scss"
import { getObject } from '../../util/SessionStorage';

class TasksSummary extends React.Component {

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      values: '',
      infographicSelected: [],
      filters: {
        delayed: 'Overdue',
        urgentFilter: 'High Priority',
        favoriteFilter: 'Starred',
      },
      filtersIcons: {
        favoriteFilter: 'icon-star-empty',
        urgentFilter: 'icon-RBQM',
        delayed: 'icon-timer'
      },
      relationShipOptions: [{
        'id': 'All',
        'value': 'All'
      }, {
        'id': 'Assignee',
        'value': FrontendConstants.ASSIGN_ME
      },
      {
        'id': 'Observer',
        'value': FrontendConstants.OBSERVE_ME
      },
      {
        'id': 'Owner',
        'value': FrontendConstants.OWN_ME
      }],
      applicationsClass: {
        "Clinical Insights": '#4072c1',
        'Operations Insights': '#3cad87',
        'Clinical Data Review': '#cec33a',
        'KPI Studio': '#d861a0',
        'RBQM': '#8e3ad6',
        'Other': '#a92a6d'
      },
      AppNameSelect:[],
      colorClass: ['#4072c1', '#3cad87', '#cec33a', '#cb844d', '#8e3ad6', '#07d790', '#026fc4', '#02c2ab', '#04b608', '#8cc61a', '#a92a6d', '#fec702', '#cc810a', '#cd1e02', '#a555de', '#4afabe', '#2fa3fd', '#2dfde4', '#26fafb', '#baea5c', '#d861a0', '#f4cd3f', '#f5b247', '#f68755', '#fd5338'],
    }
  }

  componentDidMount () {
    const immAppConfig = comprehend.globals.immAppConfig;
    const user_info = immAppConfig.get('user_info')
    const apps = user_info.get('apps')
  
    let AppNameArray = [FrontendConstants.CLINICAL_INSIGHTS, FrontendConstants.OPERATIONS_INSIGHTS, FrontendConstants.CDR, FrontendConstants.KPI_STUDIO, 'RBQM', 'Other']
    let AppNameSelect = [
      {
        "name": FrontendConstants.CDR,
        "isChecked": true
        },
        {
          "name": 'Other',
          "isChecked": true
        }
    ];

    AppNameArray.map((i) => {
      apps.toJS().map((j) => {
        if (i === j.name) {
          AppNameSelect.push({
            "name":j.name,
            "isChecked": true
        })
        }else if(j.name === 'RACT' || j.name === 'Oversight Scorecard'){
          AppNameSelect.push( {
            "name":'RBQM',
            "isChecked": true
        })
        }
      })
    })
    this.setState({AppNameSelect:AppNameSelect})
  }

  handleFilterSelection(type, filterKey, selection) {
    const collabNav = JSON.parse(getObject('collaboration-navigation'))
    collabNav[filterKey] = selection
    let countRequest = {}
    countRequest['taskStateFilter'] = 'OPEN'
    countRequest['relationshipFilter'] = collabNav['relationshipFilter']
    countRequest['appName'] = collabNav['appName']
    countRequest[filterKey] = selection
    collabNav[filterKey] = selection
    if (filterKey === 'relationshipFilter' && selection === 'All') {
      delete countRequest['relationshipFilter']
      delete collabNav['relationshipFilter']
    }
    if (selection === false) {
      delete collabNav[filterKey]
    }

    ExposureActions.fetchTasksApplicationsCount(countRequest);
    ExposureActions.fetchTasksWithParameters(true, collabNav);
    ExposureActions.fetchClosedTasksWithParameters(true, collabNav);
  }

  handleCheckbox(e, i, arrayOfAppsSelected, AppNameSelect) {
    if (e.target.checked) {
      arrayOfAppsSelected = arrayOfAppsSelected.set(arrayOfAppsSelected.size, e.target.value)
      AppNameSelect.map((i)=>{
        if(i.name === e.target.value){
          i.isChecked = true;
        }
      })
    } else {
      arrayOfAppsSelected = arrayOfAppsSelected.filter(a => a !== e.target.value)
      AppNameSelect.map((i)=>{
        if(i.name === e.target.value){
          i.isChecked = false;
        }
      })
    }
    this.handleFilterSelection('tasks', 'appName', AppNameSelect)
  }

  handleDropdownFilter(relationOptions) {
    ExposureActions.setRelationFilterChange(true);
    this.setState({
      value: relationOptions
    }, () => {
      this.handleFilterSelection('tasks', 'relationshipFilter', relationOptions)
    })
  }

  contentTaskFromApplication(data, arrayOfAppsSelected,AppNameSelected) {
    if (data) {
      const object = data.toJS()
      if (Object.keys(object).length) {
        return (
          <div className='applications-grid'>
            {
              Object.keys(object).map((key, index) => {
                const appTaskCount = object[key] ? object[key] : 0
                return (
                  <div className="application-item">
                    <div className='application-title-container'>
                      <label className="check-box application-checkbox">
                        <input id={index}
                          type="checkbox"
                          value={key}
                          className={this.state.colorClass[index]}
                          defaultChecked={arrayOfAppsSelected.includes(key)}
                          style={{
                            outline: `2px solid ${this.state.applicationsClass[key ? key : 'Other']}`,
                            outlineOffset: '-2px',
                            accentColor: this.state.applicationsClass[key ? key : 'Other'],
                            cursor: 'pointer',
                          }}
                          onChange={(e) => this.handleCheckbox(e, index, arrayOfAppsSelected, AppNameSelected)} />
                        <div className="check-box-content">
                        </div>
                      </label>
                      <div style={{ color: arrayOfAppsSelected.includes(key) ? 'black' : '#aaa' }}>{key}</div>
                    </div>
                    <div style={{ color: arrayOfAppsSelected.includes(key) ? 'black' : '#aaa' }}>{appTaskCount}</div>
                  </div>
                )
              })
            }
          </div>
        )
      } else {
        return (
          <div className='noData'>{FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.TASKS)}</div>
        )
      }
    } else {
      return (
        <div className='noData'>{FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.TASKS)}</div>
      )
    }
  }

  getComboBox() {
    const valueObj = {}
    const newQueryParams = JSON.parse(getObject('collaboration-navigation'))
    if (newQueryParams !== undefined && newQueryParams !== null) {
      if (newQueryParams['relationshipFilter']) {
        valueObj['id'] = newQueryParams['relationshipFilter']
        valueObj['value'] = this.state.relationShipOptions.filter((e) => e.id === newQueryParams['relationshipFilter'])[0].value
      } else {
        valueObj['id'] = this.state.relationShipOptions[0].id
        valueObj['value'] = this.state.relationShipOptions[0].value
      }
    }
    return (
      <Combobox
        placeHolder=''
        labelKey='value'
        valueKey='id'
        value={valueObj}
        onChange={this.handleDropdownFilter.bind(this)}
        options={Imm.fromJS(this.state.relationShipOptions)}
      />
    )
  }

  getTaskOverdue(data, type) {
    if (data) {
      if (type === 'delayed') {
        return data.get('totalTaskOverdue')
      } else if (type === 'favoriteFilter') {
        return data.get('totalTaskStarred')
      } else if (type === 'urgentFilter') {
        return data.get('totalTaskHighPriority')
      }
    }
  }

  isInforgraphicSelected(type) {
    const collNav = JSON.parse(getObject('collaboration-navigation'))
    if (collNav) {
      if (type in collNav) {
        return true
      }
    }
  }

  getTaskInforgraphics(immExposureTaskSummary) {
    return Object.keys(this.state.filters).map((e) => {
      return (
        <div className={`infographics ${this.isInforgraphicSelected(e) ? 'selected' : ''}`} onClick={() => this.handleFilterSelection('tasks', e, this.isInforgraphicSelected(e) ? false : true)}>
          <div className="filter-view">
            <div className='filter-value-container'>
              <span className={"icon" + " " + this.state.filtersIcons[e]}></span>
              <div className='filter-value'>
                {this.getTaskOverdue(immExposureTaskSummary, e)}
              </div>
            </div>
          </div>
          <div className='filter-title'>{this.state.filters[e]}</div>
        </div>
      )
    })
  }

  getTotalTaskCountInSelectedApplication(data, total_task_count, selected_apps) {
    if (data) {
      const object = data.toJS()
      const taskcountList = Object.keys(object).map((key, index) => {
        return object[key] ? object[key] : 0
      })
      return taskcountList.reduce(function (a, b) {
        return a + b;
      }, 0);
    } else {
      return 0;
    }
  }

  getTaskProgressReport(data, total_task_count) {
    if (data) {
      const object = data.toJS()
      var size = Object.keys(object).length;
      var weightArray = 0;
      return (
        <div className='applications-strip'>
          {
            Object.keys(object).map((key, index) => {
              const appTaskCount = object[key] ? object[key] : 0
              var weight;
              if((size-1) !== index){
                weight = total_task_count === 0 ? 0 : 
                (appTaskCount / total_task_count) * 100 < 1 ? 1 :
                Math.floor((appTaskCount / total_task_count) * 100)
                weightArray = weightArray + parseInt(weight);
              }else{
                  weight = 100 - parseInt(weightArray);
              }
              return (
                <div key={key} className={'strip-item' + " " + this.state.colorClass[index]} style={{
                  flex: `${weight}%`,
                  backgroundColor: this.state.applicationsClass[key ? key : 'Other']
                }}>
                  {weight}%
                </div>
              )
            })
          }
        </div>
      )
    }
  }
  render() {
    var totalTaskInApplication = 0
    const immExposureTaskSummary = this.props.immExposureStore.get('tasksSummary')
    const taskFromApplication = immExposureTaskSummary !== undefined ?
      immExposureTaskSummary.get('taskApplicationCount') : undefined
    const appsSelected = this.props.immExposureStore.get('appsSelected') ? this.props.immExposureStore.get('appsSelected') : []

    if (immExposureTaskSummary) {
      totalTaskInApplication = immExposureTaskSummary.get('totalTaskInApplication')
    }

    return (
      <div className='dashboard-container'>
        <div className='dashboard-header'>
          <div className='header-inner-container'>
            <div className='header-title'>Collaboration Dashboard</div>
            <div className='header-dropdown'>
              <div className='dropdown-title'>View</div>
              <div className='relationship-selector'>
                {this.getComboBox()}
              </div>
            </div>
          </div>
        </div>
        {this.props.immExposureStore.get('loadingTaskCount') && this.props.immExposureStore.get('relationFilterChange') ?
          <ContentPlaceholder /> :
          <div className='dashboard-body'>
            <div className='card-container'>
              <div className='summary-container'>
                <div className='inner-container' >
                  <div className='title-container'>
                    <div className='summary-title'>Open Tasks by Application</div>
                    <div className='tasks-counter'>
                      {totalTaskInApplication}
                    </div>
                  </div>

                  <div className='applications-container'>
                    {this.getTaskProgressReport(taskFromApplication, totalTaskInApplication)}
                    {this.contentTaskFromApplication(taskFromApplication, appsSelected, this.state.AppNameSelect)}
                  </div>
                </div>
                <div className='inner-container' >
                  <div className='filters-container'>
                    <div className='filters-wrapper tasks-collab'>
                      <div className='filters-inner-container'>
                        {this.props.immExposureStore.get('loadingTaskCount') ? <ContentPlaceholder height={0.1} /> : this.getTaskInforgraphics(immExposureTaskSummary)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    )
  }
}

module.exports = TasksSummary;
