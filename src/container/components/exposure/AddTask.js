var React = require('react');
var createReactClass = require('create-react-class');
var cx = require('classnames');
var _ = require('underscore');
var Imm = require('immutable');
var Moment = require('moment');
import PropTypes from 'prop-types';
import DOM,{img} from 'react-dom-factories';
import { Dialog } from "primereact-opt/dialog";
import {Button} from "primereact-opt/button";
import html2canvas from "html2canvas";
import captureicon from '../../../images/capture_icon.png'
var i =DOM.i;

var TaskActionsPanel = React.createFactory(require('./TaskActionsPanel'));
var TaskInformationPanel = React.createFactory(require('./TaskInformationPanel'));
var TaskMixin = require('./TaskMixin');
var Combobox = React.createFactory(require('../Combobox'));
var ExposureActions = require('../../actions/ExposureActions');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');
import {YellowfinUtil} from '../../util/YellowfinUtil';
import MasterStudyFilterUtil from "../../util/MasterStudyFilterUtil";
import ContentPlaceholder from '../ContentPlaceholder';
import {taskFieldType, taskAttributeType, coreDropdownFields} from '../../constants/TaskDisplayConstants';
const Spinner = React.createFactory(require('../Spinner'));

var br = DOM.br;
var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);
import StudiesUtil from '../../util/StudiesUtil';

var hasLoadedFileConfig = false;

var AddTask = createReactClass({
  displayName: 'AddTask',

  propTypes: {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    currentUserId: PropTypes.string.isRequired,
    handleLinkedFileChange: PropTypes.func.isRequired,
    handleToggleTasksPane: PropTypes.func.isRequired,
    immFileConfigs: PropTypes.instanceOf(Imm.Map).isRequired,
    immGroupEntities: PropTypes.instanceOf(Imm.Map).isRequired,
    immUsers: PropTypes.instanceOf(Imm.Map).isRequired,
    isUnsavedWarningDisplayed: PropTypes.bool.isRequired,
    currentFileId: PropTypes.string,
    drilldownId: PropTypes.string,
    fromYellowfinReport: PropTypes.bool,
    yellowfinReportQuery: PropTypes.string,     // Query string storing filter information and other info for YF reports
    addTaskSuccessCallback: PropTypes.func,
    disableAssociatedReports: PropTypes.bool,
    appName: PropTypes.string,
    taskStoreDetails: PropTypes.bool,
    taskStoreDetailsData: PropTypes.object,
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [TaskMixin],

  getInitialState: function () {
    //Check if the task config is available and create the task form wrapper
    ExposureActions.storeClonedTriggeredAction(this.props.immExposureStore.get('taskStoreDetails'))
    let taskConfigMetadata;
    if (!this.props.immExposureStore.get('taskMetadata').isEmpty()) {
      taskConfigMetadata = this.updateTaskConfigMetadata(this.props)
    }
    let workingTaskMetadata = this.props.taskStoreDetails ? this.props.taskStoreDetailsData :
                              this.props.immExposureStore.get('immWorkingTaskWrapperTemp') ?
                              this.props.immExposureStore.get('immWorkingTaskWrapperTemp')
                                .mergeIn(['task', 'coreTaskAttributes'], this.getTaskLinkedFile(this.props, 'fileDetails'))
                                .mergeIn(['task', 'taskExtraInformation'], this.getTaskLinkedFile(this.props, 'dataReviewID')) :
                              taskConfigMetadata && taskConfigMetadata.workingTaskMetadata;

    if(workingTaskMetadata){
      workingTaskMetadata = this.generateDefaultValueForClone(workingTaskMetadata);
    }
    return {
      taskConfig: taskConfigMetadata && Imm.fromJS(taskConfigMetadata.taskConfig),
      baseTaskMetadata: taskConfigMetadata && taskConfigMetadata.baseTaskMetadata,
      workingTaskMetadata,
      width: 0,
      disableAssociatedReports: !!this.props.currentFileId,
      submitTriggered: false,
      customTriggered: this.props.immExposureStore.get('taskStoreDetails'),
      clonedTriggered: this.props.immExposureStore.get('taskStoreDetails'),
      clonedCheck: this.props.taskStoreDetails,
      imgsrc: null, 
      imgstore:null,
      screenshotdate:null,	
      displayBasic:false , 	
      imgsnap:null, 
      sspreview:false, 	
      autocaptureShow:false, 	
      isInitialScreenshotCaptured:false,	
      sceenshotCapturing: false,
      snapshotsection:true
    };
  },

  //Generate dynamic task metadata form object from the task configuration configured at admin level
  generateDynamicTaskMetadata(props) {
    const taskMetadata = props.immExposureStore.getIn(['taskMetadata', 'taskAttributes']).toJS();
    let taskMetadataObj = this.getTaskWrapper(props);
    let taskCoreAttr = this.getTaskFormValues(taskMetadata.coreAttributes);
    taskMetadataObj = taskMetadataObj.mergeIn(['task', 'coreTaskAttributes'], taskCoreAttr);
    let taskExtendedAttr = this.getTaskFormValues(taskMetadata.extendedAttributes);
    taskMetadataObj = taskMetadataObj.mergeIn(['task', 'extendedDynamicTaskAttributes'], taskExtendedAttr);
    return taskMetadataObj;
  },

  generateDefaultValueForClone(workingTaskMetadata){
    workingTaskMetadata = workingTaskMetadata.setIn(['task', 'coreTaskAttributes', 'title'], this.props?.automatedTitle);
    workingTaskMetadata = workingTaskMetadata.setIn(['task', 'coreTaskAttributes', 'dueDate'], Moment().endOf('day').add(13, 'd').utc().valueOf().toString());
    return workingTaskMetadata;
  },

  //Get the initial/default values for the form object based on the attribute type
  getTaskFormValues: function (attributeList) {
    let taskMetadataObj = {}
    attributeList.map((task) => {
      switch (task.fieldType) {
        case taskFieldType.TEXT:
          if(task.fieldId === coreDropdownFields.TITLE){
            taskMetadataObj[task.fieldId] = this.props?.automatedTitle;
          }else{
            taskMetadataObj[task.fieldId] = "";
          }
          break;
        case taskFieldType.SINGLE_SELECT_DROPDOWN:
          taskMetadataObj[task.fieldId] = "";
          break;
        case taskFieldType.RADIO:
          taskMetadataObj[task.fieldId] = false;
          break;
        case taskFieldType.MULTI_SELECT_DROPDOWN:
          taskMetadataObj[task.fieldId] = [];
          break;
        case taskFieldType.CALENDAR:
          let value = task.fieldDefaultValue || Moment().endOf('day').add(13, 'd').utc().valueOf().toString()
          taskMetadataObj[task.fieldId] = task.attributeType === taskAttributeType.CORE_TASK_ATTRIBUTE
            ? value
            : {'dateCondition': task.dateConditions[0], 'dateValue': value}
          break;
        default:
          taskMetadataObj[task.fieldId] = "";
          break;
      }
    })
    return taskMetadataObj;
  },

  //Create the initial task object wrapper for form
  getTaskWrapper: function (props) {
    return Imm.fromJS({
      task: {
        coreTaskAttributes: Imm.Map(),
        extendedDynamicTaskAttributes: Imm.Map(),
        extendedTaskAttributes: {
          fromYellowfinReport: props.fromYellowfinReport,
          yellowfinReportQuery: props.yellowfinReportQuery
        },
        taskExtraInformation: Imm.Map(),
        clinicalTaskAttribute: Imm.Map(),
        propertySnapshotList: [],
        taskFilters: [],
        robustTaskFilters: []
      },
      comments: [],
      taskHistory: [],
      assigneeHistory: [],
      observerHistory: [],
      taskConfig: this.addTaskConfig(props),
    }).mergeIn(['task', 'coreTaskAttributes'], this.getTaskLinkedFile(props, 'fileDetails'))
      .mergeIn(['task', 'taskExtraInformation'], this.getTaskLinkedFile(props, 'dataReviewID'));
  },

  //We need to do reset the fieldValues while adding a task as we are populating the fieldValues 
  //for clinical attributes based on the dependent attribute selected
  addTaskConfig: function (props) {
    let taskMetadata = props.immExposureStore.getIn(['taskMetadata']).toJS();
    taskMetadata.taskAttributes.clinicalAttributes = taskMetadata.taskAttributes.clinicalAttributes.map((task) => {
      task.fieldValues = [];
      return task
    })
    return taskMetadata;
  },

  //Link the file details if present or after the task has been linked to a dashboard/report/datareview file
  getTaskLinkedFile: function (props, type) {
    var fileId = props.currentFileId;
    var fileType = props.immFileConfigs.getIn([fileId, 'fileType']);
    return type === 'fileDetails' ? {
      reportId: (fileType === ExposureAppConstants.FILE_TYPE_REPORT) || props.fromYellowfinReport ? fileId : null,
      dashboardId: fileType === ExposureAppConstants.FILE_TYPE_DASHBOARD ? fileId : null,
    } : {
      datareviewId: fileType === ExposureAppConstants.FILE_TYPE_DATA_REVIEW ? fileId : null
    }
  },

  componentDidMount: function () {
    // We need to fetch all file configs to populate a list of
    // possible reports/dashboards to attach a new task to.
    // The list of fileIds is empty to signify that we want
    // all files without filtering them to a given subset.

    if(!this.props.currentFileId) {
      ExposureActions.fetchFileConfigs([], function (immExposureStore) {
        this.hasLoadedFileConfig = true;
      }.bind(this)
    );
    }
    ExposureActions.fetchTaskMetadata(this.screenshotCaptureflag, this.props?.clinicalFilters);
    let reportId = this.state.workingTaskMetadata && this.state.workingTaskMetadata.getIn(['task', 'coreTaskAttributes', 'reportId']);
    if (this.props.fromYellowfinReport && reportId) {
      const reportName = YellowfinUtil.getYellowfinReportName(this.props.immExposureStore, reportId);
      this.setReportName(reportName);
    }
  },

  screenshotCaptureflag (screenshotCapture) {
    if(this.props.screnshotId) {
    if(screenshotCapture == FrontendConstants.CAPTURE_SCREENSHOT_AUTO) { 
      this.takescreenshot(this.props.screnshotId, false);
     } else if (screenshotCapture == FrontendConstants.CAPTURE_SCREENSHOT_MANUAL) {  
       this.setState({ isInitialScreenshotCaptured : true })
     } else if (screenshotCapture == FrontendConstants.CAPTURE_SCREENSHOT_NONE) {
       this.setState({snapshotsection:false,  isInitialScreenshotCaptured : true })
     } 
    }
  },

  componentWillReceiveProps: function (nextProps) {
    if (this.props.isLinkedToCDMFile !== nextProps.isLinkedToCDMFile ||
      this.props.currentFileId !== nextProps.currentFileId ||
      this.props.immFileConfigs.has(this.props.currentFileId) !== nextProps.immFileConfigs.has(nextProps.currentFileId) ||
      this.props.immExposureStore.get('taskMetadata') !== nextProps.immExposureStore.get('taskMetadata')) {
      const taskConfigMetadata = this.updateTaskConfigMetadata(nextProps);
      if (taskConfigMetadata) {
        this.setState({
          workingTaskMetadata: taskConfigMetadata.workingTaskMetadata
            .mergeIn(['task', 'coreTaskAttributes'], this.getTaskLinkedFile(nextProps, 'fileDetails'))
            .mergeIn(['task', 'taskExtraInformation'], this.getTaskLinkedFile(nextProps, 'dataReviewID')),
          baseTaskMetadata: taskConfigMetadata.baseTaskMetadata
            .mergeIn(['task', 'coreTaskAttributes'], this.getTaskLinkedFile(nextProps, 'fileDetails'))
            .mergeIn(['task', 'taskExtraInformation'], this.getTaskLinkedFile(nextProps, 'dataReviewID')),
          taskConfig: Imm.fromJS(taskConfigMetadata.taskConfig)
        })
        ExposureActions.storeClonedTriggeredAction(this.props.immExposureStore.get('taskStoreDetails'))
      }
    }
  },

  autoPopulateClinicalAttributes: function (workingMetadataClinicalAttr, clinicalAttributesData) {
    if(this.props.clinicalFilters){
      Object.entries(workingMetadataClinicalAttr).forEach(([key, value]) => {
        clinicalAttributesData.forEach((clinicalAttr) => {
          if(clinicalAttr.fieldId == key && this.props.clinicalFilters[key] && this.props.clinicalFilters[key].length > 0){
            workingMetadataClinicalAttr[key] = this.props.clinicalFilters[key].map((clinicalElem) => {
              if(clinicalAttr.fieldValues && clinicalAttr.fieldValues.length) {
                let res = clinicalAttr.fieldValues.filter ((elem) => elem.value == clinicalElem || elem.key == clinicalElem);
                return res && res.length > 0 ? res[0].key : null;
              } else return null;
            }).filter(x => x);
          }
        });
      });
    }
    return workingMetadataClinicalAttr;
  },

  //We create the Form JSON if not present and update it with clinical attributes and extended attributes which are linked with the current dashboard/analytics/reports 
  //Also add the file details to the form obj
  updateTaskConfigMetadata: function (props) {
    if (!props.immExposureStore.get('taskMetadata').isEmpty()) {
      let workingTaskMetadata = this.state && this.state.workingTaskMetadata;
      let baseTaskMetadata = this.state && this.state.baseTaskMetadata;
      let taskClinicalAttribute = {};
      let taskExtendedAttribute = {};
      let taskConfig = props.immExposureStore.get('taskMetadata').toJS();

      if ((!this.state) || (this.state && !this.state.workingTaskMetadata)) {
        let taskFormObj = this.generateDynamicTaskMetadata(props);
        workingTaskMetadata = taskFormObj;
        baseTaskMetadata = taskFormObj;
      }
      if (props.currentFileId) {
        let taskAttributes = {};
        Object.entries(taskConfig.taskAttributes).map(([attributeType, attributeList]) => {
          if (attributeType === 'clinicalAttributes' || attributeType === 'extendedAttributes') {
            attributeList = attributeList.filter(attribute => attribute.associatedAnalyticsAndDashboard.some(list => list.id === 'select_all' || list.id === props.currentFileId))
          }
          taskAttributes[attributeType] = attributeList
        })
        taskConfig.taskAttributes = taskAttributes;
        taskClinicalAttribute = this.getTaskFormValues(taskAttributes.clinicalAttributes);
        taskClinicalAttribute = this.autoPopulateClinicalAttributes(taskClinicalAttribute, taskAttributes.clinicalAttributes);
        taskExtendedAttribute = this.getTaskFormValues(taskAttributes.extendedAttributes);
        workingTaskMetadata = workingTaskMetadata
          .setIn(['task', 'extendedDynamicTaskAttributes'], Imm.Map(taskExtendedAttribute))
          .setIn(['task', 'clinicalTaskAttribute'], Imm.Map(taskClinicalAttribute))
        baseTaskMetadata = baseTaskMetadata
          .setIn(['task', 'extendedDynamicTaskAttributes'], Imm.Map(taskExtendedAttribute))
          .setIn(['task', 'clinicalTaskAttribute'], Imm.Map(taskClinicalAttribute))
      }
      return {workingTaskMetadata, baseTaskMetadata, taskConfig};
    }
  },

  isDirty: function () {
    return !this.props.isLoading && !Imm.is(this.state.baseTaskMetadata, this.state.workingTaskMetadata);
  },

  unsavedWorkModalCopy() {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_TASK,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  setReportName(reportName) {
    this.setState({
      workingTaskMetadata: this.state.workingTaskMetadata.mergeIn(
        ['task', 'extendedTaskAttributes'],
        { reportName: reportName })
    });
  },

  clearUnnecessaryFields(data){
    data = data.setIn(['task', 'coreTaskAttributes', 'description'], "");
    data = data.setIn(['task', 'coreTaskAttributes', 'title'], "");
    data = data.setIn(['task', 'coreTaskAttributes', 'dueDate'], "");
    data = data.setIn(['task', 'clinicalTaskAttribute'], Imm.Map());
    return data;
  },

  handleSubmitTask() {
    this.setState({submitTriggered: true});
    if (!this.handleFormValidations()) {
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.TASK);
      ExposureActions.clearTaskInformationTemp();
      const result = this.formatTask(this.state.workingTaskMetadata);
      result.set('clientId', this.props.appName);
      let taskMetadata = this.clearUnnecessaryFields(this.state.workingTaskMetadata);
      ExposureActions.storeTaskDetailsAction(true);
      ExposureActions.storeTaskDetailsDataAction(taskMetadata);
      ExposureActions.storeClonedTriggeredAction(true);
      ExposureActions.setTaskInformationTemp(this.state.workingTaskMetadata);
      let saveTaskObject = {
        snpsht: this.state.imgstore,
        result,
        drilldownId: this.props.drilldownId,
        transitionTo: this.context.router.push,
        addTaskSuccessCallback: this.props.addTaskSuccessCallback
      }
      if(this.state.imgstore){
        ExposureActions.taskScreenshotSubmit(saveTaskObject);
      }else{
        ExposureActions.taskViewSubmitTask(result, this.props.drilldownId, this.context.router.push, this.props.addTaskSuccessCallback);
      }
     }
  },

  handleClonedTask(){
    let taskConfigMetadata, workingTaskMetadata;
    if (!this.props.immExposureStore.get('taskMetadata').isEmpty()) {
      taskConfigMetadata = this.updateTaskConfigMetadata(this.props)
    }
    ExposureActions.storeClonedTriggeredAction(!this.props.immExposureStore.get('clonedTriggered'))
    if(!this.props.immExposureStore.get('clonedTriggered')){
      if(this.props.taskStoreDetailsData){
        workingTaskMetadata = this.generateDefaultValueForClone(this.props.taskStoreDetailsData);
      }
    }else {
      workingTaskMetadata = taskConfigMetadata.baseTaskMetadata;
    }
    this.setState({
      workingTaskMetadata, 
      customTriggered: false,
      clonedTriggered: !this.props.immExposureStore.get('clonedTriggered')
    });
  },

  handleCustomTask(){
    this.setState({
      customTriggered: false
    });
  },

  handleCloseTask(){
    ExposureActions.toggleTasksPane(false);
    this.props.addTaskSuccessCallback(true);
  },

  _isReady() {
    return !this.props.isLoading && !this.props.immExposureStore.get('isLoadingTaskTypes') && ((this.props.screnshotId && this.state.isInitialScreenshotCaptured) || !this.props.screnshotId );
  },

  removeImage() {
    this.setState({
      displayBasic: false,
      sspreview: false,
      imgsnap: null,
      imgstore: null,
      screenshotdate: null
    })
  },

  openDialogbox(e) {
    this.setState({
      sspreview: true,
    });
  },

  callBackfunction(flag, e, imgstore, screenshotdate) {
    if (flag) {
      this.setState({
        imgsnap: e,
        imgstore: imgstore,
        screenshotdate: screenshotdate,
        autocaptureShow: true
      })
    }
  },

  addSnap (e, imgstore, screenshotdate) {
    this.setState({
      imgsnap: e,
      imgstore:imgstore,
      screenshotdate:screenshotdate
    }); 
  },

  attachSnapshot(e, imgstore, screenshotdate) {
    if (this.state.imgsnap == null) {
      this.setState({
        displayBasic: false,
        imgsnap: e,
        screenshotdate: screenshotdate,
        imgstore: imgstore,
        autocaptureShow: true
      });
    } else {
      ExposureActions.displaySnapshotReplaceModal(this.callBackfunction, e, imgstore, screenshotdate);
      this.setState({
        displayBasic: false
      });
    }
  },

  onHide() {
    this.setState({
      displayBasic: false,
      sspreview: false,
    });
  },
 
  takescreenshot(id, flag) {
    this.setState({ sceenshotCapturing: true }, () => {
      html2canvas(document.getElementById(id), {
        scale: 1
      }).then(canvas => {
        let dataURL = canvas.toDataURL()
        let formData = new FormData()
        formData.append('snpsht', dataURL)
        formData.append('serviceType', 'TASK')
        this.setState({
          isInitialScreenshotCaptured: true,
          displayBasic: flag,
          imgsrc: dataURL,
          imgstore: formData,
          screenshotdate: Util.dateTimeFormatter(new Date().getTime()),
          sceenshotCapturing: false,
          sspreview: false
        }, () => {
          if (!flag) this.addSnap(this.state.imgsrc, this.state.imgstore, this.state.screenshotdate);
        },
        );
      })
    })
  },
  renderFooter() {
    return <div className="snapshot-footer">
      <button className="btn btn-secondary reset-all-button" onClick={() => this.removeImage()}>{FrontendConstants.CANCEL}</button>
      <button className="btn btn-primary apply-filters-button" onClick={() => this.attachSnapshot(this.state.imgsrc, this.state.imgstore, this.state.screenshotdate)}>{FrontendConstants.ATTACH}</button>
    </div>
  },  

  render: function () {
    if (this.state.workingTaskMetadata) {
      var taskCoreAttrValues = this.getTaskAttributes(this.state.workingTaskMetadata.get('task'), {
        taskMetadata: this.state.taskConfig.get('taskAttributes').toJS(),
        isAddMode: true,
        handleLinkedFileChange: this.props.handleLinkedFileChange,
        isAuthor: true,
        isLoadFileConfig: this.hasLoadedFileConfig,
        disableAssociatedReports: this.state.disableAssociatedReports,
        customTriggered: this.state.customTriggered,
        handleCustomTask: this.handleCustomTask,
        handleClonedTask: this.handleClonedTask,
        clonedTriggered: this.state.clonedTriggered,
        clonedCheck: this.state.clonedCheck,
      });
    }
    
    let dialogbox ;
    dialogbox = (
      <Dialog
        resizable={false}
        header={FrontendConstants.SCREENSHOT}
        visible={this.state.displayBasic}
        footer={() => this.renderFooter()}
        onHide={() => this.removeImage()}
        data-keyboard="false"
        data-backdrop="static"
        className='preview-screenshot-popup'
      >
        <div className='preview-img-div'>
        <div><img className="img-preview" src={this.state.imgsrc} /></div>
          </div>
      </Dialog>
    );
    let dialogboxpreview;
    dialogboxpreview=(
      <Dialog
        resizable={false}
        header={FrontendConstants.TASK_TITLE  +": "+ this.state?.workingTaskMetadata?.get('task').toJS().coreTaskAttributes?.title}
        visible={this.state.sspreview}
        onHide={() => this.onHide()}
        data-keyboard="false"
        data-backdrop="static"
        className='snapshot-Dialog preview-screenshot-popup'
      >
        <div className='preview-img-div'>
         <div><img className="img-preview" src={this.state.imgsnap} /></div>
        </div>
      </Dialog>
    );
    let content;
    if (!this._isReady()) {
      content =  div({style:{height:"35rem",}},
        Spinner());
    } else {
      if(taskCoreAttrValues){
        taskCoreAttrValues.studyIds = this.props?.clinicalFilters?.studyIds;
      }
      content = div({className: 'task-pane', ref: 'pane'},
        !this.props.hideHeader ? div({className: 'section-title'},
          span({className: 'title-text no-uppercase'}, FrontendConstants.ADD_A_TASK),
          div({className: 'close-button', onClick: this.props.handleToggleTasksPane})) : null,
        this.state.workingTaskMetadata && TaskInformationPanel(taskCoreAttrValues),
        this.state.snapshotsection ? div({},
          this.props.screnshotId ? div({},div({className:'task-pane-sub-header'},
          this.state.imgsnap ? i({className: 'align-right icon-remove', title:FrontendConstants.SCREENSHOT_REMOVE, onClick: () => {this.removeImage()},}): null,
          FrontendConstants.SCREENSHOT,
          ),
          this.state.imgsnap ? null : div({className: 'snapshot-align-center'},
          this.state.sceenshotCapturing ? 
            i({
              className: "pi pi-spin pi-spinner snapshot-spinner",
            }) : 
            img({src:captureicon,
              title:FrontendConstants.SCREENSHOT_CAPTURE,
              className:'snapshot-icon',
              onClick: () => {this.takescreenshot(this.props.screnshotId, true)},
            }),div({},FrontendConstants.SCREENSHOT_CAPTURE),)
            ):null,
          div(
            {className: 'snapshot-align-center'},
            !this.state.imgsnap ? null  : img({src:this.state.imgsnap,
              title:FrontendConstants.SCREENSHOT,
              className:'snapshot-position',
            onClick:()=>{this.openDialogbox(this.state.imgsnap)}}),
            dialogbox
        ),
          dialogboxpreview,
          !this.state.screenshotdate ? null  : div({className:'snapshot-time'}, this.state.autocaptureShow ? FrontendConstants.SNAPSHOT_MANUALLY : FrontendConstants.SNAPSHOT_AUTOMATICALLY , FrontendConstants.SNAPSHOT_CAPTURED_AT,this.state.screenshotdate),
          ):null,
          br(),
       
        div({className: 'align-right-buttons'},
          <Button
          className="update-button btn btn-secondary" 
          label= {FrontendConstants.CANCEL}
          onClick= {this.handleCloseTask}
        />,
          this.state.customTriggered ? 
          <Button
          className="update-button btn btn-primary"
          label= {FrontendConstants.CUSTOMIZE_TASK}
          onClick= {this.handleCustomTask}
        />
           : null,
          <Button
          className="update-button btn btn-primary"
          label= {FrontendConstants.ADD_THIS_TASK}
          onClick= {this.handleSubmitTask}
        />
      ) )
    }
    return (
      content
    );
  } 
});

module.exports = AddTask;
export default AddTask;
