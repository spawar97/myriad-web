import React, { Component } from 'react';
import { Observable } from "windowed-observable";
var Util = require('../util/util');
import ReportUtil from '../util/ReportUtil';
var AddTask = React.createFactory(require('./exposure/AddTask'));
import TaskList from './exposure/TaskList';
import { Dialog } from 'primereact-opt/dialog';
var FrontendConstants = require('../constants/FrontendConstants');
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import ExposureActions from '../actions/ExposureActions';
import { callTaskCountApi } from './contextfilters/WidgetMenu';
import StudiesUtil from '../util/StudiesUtil';
import MasterStudyFilterUtil from "../util/MasterStudyFilterUtil";
import {YellowfinUtil} from '../util/YellowfinUtil';

export default class ContextComponent extends Component {
    constructor(props) {
        super(props);

        this.state = {
            collaborationContext: null,
            showTaskCommentPanel: false,
            
        }
    }
     screnshotIdd=null;
    componentDidMount(){
        this.subscribeContext();
    }

    subscribeContext(){
        observable.subscribe((collaborationContext) => {
            this.setState({ 
                collaborationContext,
                showTaskCommentPanel: true
            });
        })
    }

    closeTaskCommentPanel(flag, isTaskSuccessful){
        var immExposureStore = this.props.immExposureStore;
        if((flag && !immExposureStore.get('isLoadingTask')) || !flag){
            this.setState({ 
                collaborationContext: null,
                showTaskCommentPanel: false
            });
        }
        if(isTaskSuccessful){
            var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
            var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
            callTaskCountApi({immExposureStore,immFile})
        }
        ExposureActions.clearTaskInformationTemp();
    }

    generateTaskListContainer(immExposureStore, context){
        return <TaskList immExposureStore={immExposureStore} context={context}/>
    }

    getStudyIdSiteIdSubjectIdFilter() {
        const immExposureStore = this.props.immExposureStore;
        const collaborationContext = this.state.collaborationContext;
        let studyIds = []; let siteList = []; let subjectList = []; let countryList = [];
        let studyFilterList = []; let siteFilterList = []; let subjectFilterList = []; let countryFilterList = [];
        const fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
        let studyColumnName;
        let filterStatesAfterApply = immExposureStore.getIn(['files', fileId, 'filterStatesAfterApply'])
        let filterStates = filterStatesAfterApply && filterStatesAfterApply.toJS();
        
        if(filterStates && filterStates.length) {
            studyFilterList = filterStates.filter((filterState) => {
                if (filterState.column.columnName === 'studyname' || filterState.column.columnName === 'studyid') {
                    studyColumnName = filterState.column.columnName
                    return true;
                }
            });
            siteFilterList = filterStates.filter((filterState) => filterState.column.columnName === 'sitename'); 
            subjectFilterList = filterStates.filter((filterState) => filterState.column.columnName === 'usubjid'); 
            countryFilterList = filterStates.filter((filterState) => filterState.column.columnName === 'sitecountry'); 

            if(siteFilterList.length === 1) {
                siteList = siteFilterList[0].itemsSelected.length ? siteFilterList[0].itemsSelected : siteFilterList[0].allSelected ? [] : siteFilterList[0].data;
            }
            if(subjectFilterList.length === 1) {
                subjectList = subjectFilterList[0].itemsSelected.length ? subjectFilterList[0].itemsSelected : subjectFilterList[0].data;
            }
            if(countryFilterList.length === 1) {
                countryList = countryFilterList[0].itemsSelected.length ? countryFilterList[0].itemsSelected : countryFilterList[0].allSelected ? [] : countryFilterList[0].data;
            }
        } else if(collaborationContext?.context?.extraInformation?.contextFilters){
            let contextFilters = JSON.parse(collaborationContext.context.extraInformation.contextFilters);
            if(contextFilters){
                siteFilterList = contextFilters.filter((contextFilter) => contextFilter.columnName === 'siteid');
                if(siteFilterList.length === 1) {
                    siteList = siteFilterList[0].values;
                }
    
                countryFilterList = contextFilters.filter((contextFilter) => contextFilter.columnName === 'sitecountry');
                if(countryFilterList.length === 1) {
                    countryList = countryFilterList[0].values;
                }
            }
        }
        if (studyFilterList.length > 0) {
          studyIds = studyFilterList[0].itemsSelected.length ? studyFilterList[0].itemsSelected : studyFilterList[0].data;
          if (studyColumnName && studyColumnName === 'studyid') {
            studyIds = this.convertStudyIdToStudyNames(studyIds, immExposureStore);
          }
        } else {
            studyIds = this.getMasterStudySelectedValues(immExposureStore);
        }
        
        const clinicalFilters = {
            studyIds, 
            siteList, 
            subjectList,
            countryList
        }
        return clinicalFilters;
    }

    convertStudyIdToStudyNames(studyIds, immExposureStore) {
        const immStudies = StudiesUtil.getImmStudies(immExposureStore).toJS();
        studyIds = studyIds.map((studyId) => {
            return immStudies.filter(study => study.value === studyId)[0].label;
        });
        return studyIds;
    }

    getMasterStudySelectedValues(immExposureStore) {
        let studyIds = [];
        let immMasterStudyIds = MasterStudyFilterUtil.getSelectedStudies(immExposureStore, this.props.cookies);
        if (immMasterStudyIds.length > 0) {
            studyIds = immMasterStudyIds.map(study => study.label);;
        } else {
            const immStudies = StudiesUtil.getImmStudies(immExposureStore).toJS();
            studyIds = immStudies.map(study => study.label);
        }
        return studyIds;
    }

    generateAddTaskContainer(){
        var immExposureStore = this.props.immExposureStore;
        var fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
        var immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
        let automatedTitle = '';
        const isLinkedToCDMFile = Util.isCDMFile(immExposureStore, immFile);

        if(this.state.collaborationContext?.yellowfinProps?.fromYellowfinReport){
            let yellowfinClinicalFilters = this.state.collaborationContext.yellowfinProps.yellowfinClinicalFilters;
            if(yellowfinClinicalFilters.studyNames && yellowfinClinicalFilters.studyNames.length) {
                var studyIds = yellowfinClinicalFilters.studyNames;
            } else if(yellowfinClinicalFilters.studyNames && yellowfinClinicalFilters.studyIds.length) {
                var studyIds = this.convertStudyIdToStudyNames(yellowfinClinicalFilters.studyIds, immExposureStore);
            } else {
                var studyIds = this.getMasterStudySelectedValues(immExposureStore);
            }

            if(yellowfinClinicalFilters.siteIds && yellowfinClinicalFilters.siteIds.length) {
                var siteList = yellowfinClinicalFilters.siteIds;
            } else if(yellowfinClinicalFilters.siteNames && yellowfinClinicalFilters.siteNames.length) {
                var siteList = yellowfinClinicalFilters.siteNames;
            } else {
                var siteList = [];
            }

            if(yellowfinClinicalFilters.countries && yellowfinClinicalFilters.countries.length) {
                var countryList = yellowfinClinicalFilters.countries;
            } else {
                var countryList = [];
            }
            var subjectList = [];
        } else {
            var { studyIds, siteList, subjectList, countryList } = this.getStudyIdSiteIdSubjectIdFilter();
        }
        

        if(this.state.collaborationContext?.title) {
            automatedTitle = `${this.state.collaborationContext.breadCrumb} ( ${this.state.collaborationContext.title} )`;
        } else {
            if (this.state.collaborationContext.yellowfinProps) {
                const reportName = YellowfinUtil.getYellowfinReportName(this.props.immExposureStore, this.state.collaborationContext.yellowfinProps.currentFileId);
                automatedTitle += reportName;
            } else {
                let fileTitle = immFile && immFile.get('title');
                if(fileTitle)  automatedTitle += fileTitle;
            }
            
            if((studyIds && studyIds.length === 1) || (siteList && siteList.length === 1) || (subjectList && subjectList.length === 1)){
                let titleIdsArr = [];
                [studyIds, siteList, subjectList].forEach((elem) => {
                    if(elem && elem.length === 1) {
                        titleIdsArr.push(elem[0]);
                    }
                })
                automatedTitle += " ( ";
                automatedTitle += titleIdsArr.join(", ");
                automatedTitle += " )"
            }
        }

        var defaultProps = {
            ref: 'task',
            currentFileId: fileId,
            isLinkedToCDMFile,
            currentUserId: immExposureStore.getIn(['userInfo', 'id']),
            immFileConfigs: immExposureStore.get('fileConfigs'),
            immGroupEntities: immExposureStore.get('groupEntities'),
            immUsers: immExposureStore.get('users'),
            immTaskTypes: immExposureStore.get('taskTypes'),
            immCDMDropdownData: this.props.immExposureStore.get('CDMDropdownData'),
            isLoading: immExposureStore.get('isLoadingTask')
        };

        const widgetIdObj = this.state.collaborationContext?.context?.filters?.filter((elem)=>elem.key === "widgetId");
        let screnshotId = this.state.collaborationContext?.isLegacyDashboard ? 'task-screenshot' : widgetIdObj.length ? widgetIdObj[0].value : null;
        if(!document.getElementById(screnshotId)){
            screnshotId = null;
        }
        this.screnshotIdd = screnshotId;

        let addTaskContainer = AddTask(_.extend(defaultProps, {
            immExposureStore,
            drilldownId: this.props.query.drilldownId,
            route: this.props.route,
            disableAssociatedReports: this.props.query.disableAssociatedReports === "true" ? true : false,
            appName: this.props.query.appName,
            addTaskSuccessCallback: this.closeTaskCommentPanel.bind(this, false, true),
            taskStoreDetails: this.props.immExposureStore.get('taskStoreDetails'),
            taskStoreDetailsData: this.props.immExposureStore.get('taskStoreDetailsData'),
            automatedTitle,
            screnshotId,
            clinicalFilters: {
                studyIds, 
                siteIds: siteList, 
                subjectList,
                siteCountries: countryList
            },
            hideHeader: true,
            taskContext: this.state.collaborationContext.context,
            ...this.state.collaborationContext.yellowfinProps
        }));

        return addTaskContainer;
    }

    deriveXandY(position) {
        let x = position[0];
        let y = position[1];
        let screenWidth = screen.width;
        let screenHeight = screen.height;
        if((x + Math.round(screenWidth * 0.30)) > screenWidth){
            x = x - Math.round(screenWidth * 0.30)
        }else{
            x = x + 40;
        }
        if((y + Math.round(screenHeight * 0.80)) > screenHeight){
            y = y - (y + Math.round(screenHeight * 0.80) - screenHeight)
        }
        return {x, y}
    }

    render() {
        const { collaborationContext, showTaskCommentPanel } = this.state;
        var immExposureStore = this.props.immExposureStore;

        let content = '', headerContent = '', position = '', dialogContent = '', dialogStyleObj = { width: '25%', position: 'absolute' };
        let footerContent = <div></div>
        let container_id = 'task-container'
        this.props;

        if(collaborationContext && collaborationContext.action){

            switch (collaborationContext.action) {
                case FrontendConstants.ADD_TASK:
                    headerContent = FrontendConstants.ADD_A_TASK; 
                    dialogContent = this.generateAddTaskContainer();
                    container_id = "task-container"
                    break;
                case FrontendConstants.TASK_LIST:
                    let taskCount = immExposureStore.get('totalTasks') || 0;
                    headerContent = `Tasks(${ taskCount })`; 
                    dialogContent = this.generateTaskListContainer(immExposureStore, collaborationContext.context);
                    container_id = "tasklist-container";
                default:
                    break;
            }

            if(collaborationContext.position){
                let positionObj = this.deriveXandY(collaborationContext.position);
                position = 'top-left';
                dialogStyleObj = { 
                    ...dialogStyleObj,
                    left: positionObj.x + 'px',
                    top: positionObj.y + 'px',
                    height: '70%'
                }
            } else 
            if(!this?.screnshotIdd && this.props.immExposureStore.get('taskStoreDetails'))
            {
                dialogStyleObj = { 
                    ...dialogStyleObj,
                    top: '11.5rem',
                    right: 0,
                    height: '66%'
                }
            }
            else{
                dialogStyleObj = { 
                    ...dialogStyleObj,
                    top: '11.5rem',
                    right: 0,
                    height: 'calc(100vh - 12.5rem)'
                }
            }

            
            content = <Dialog 
                id = {container_id}
                className = "exposure lsac_AddTask" 
                onShow={()=> document.body.style.marginRight='1%'}
                header = { headerContent }
                footer = { footerContent }
                visible = { true }
                onHide = {()=>{document.body.style.marginRight='0';this.closeTaskCommentPanel(true)}}
                resizable = { false }
                style = { dialogStyleObj }
                modal = { true }
                closeOnEscape={false}
                blockScroll={true}
                >
                    { dialogContent }
            </Dialog>
        }
        
        return (
            <div>
                { showTaskCommentPanel ? content : null }
            </div>
        )
    }
}
