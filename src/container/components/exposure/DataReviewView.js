import React from 'react';
import Imm from 'immutable';
import _ from 'underscore';
import ContentPlaceHolder from '../ContentPlaceholder';
import DataReviewViewFilters from './DataReviewViewFilters';
import DataReviewSummaryView from './DataReviewSummaryView';
import Breadcrumbs from './Breadcrumbs';
import Util from '../../util/util';
import cx from 'classnames';
import ReportFilterNotice from '../ReportFilterNotice';
import PropTypes from 'prop-types';

import ExposureActions from '../../actions/ExposureActions';
import DataReviewActions from "../../actions/DataReviewActions";
import SimpleAction from '../SimpleAction';
import FrontendConstants from '../../constants/FrontendConstants';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';
import AccountUtil from '../../util/AccountUtil';

import {TouchDiv as div} from '../TouchComponents';
import ModalDialogContent from '../ModalDialogContent';
import RouteHelpers from '../../http/RouteHelpers';
import AddTask from './AddTask';
import ViewTask from './ViewTask';
import ShallowCompare from 'react-addons-shallow-compare';
import {withTransitionHelper} from '../RouterTransitionHelper';
import Button from '../Button';
import DataReviewUtil from "../../util/DataReviewUtil";
import ModalConstants from "../../constants/ModalConstants";
import DataReviewStore from '../../stores/DataReviewStore';
import { Dialog as PrimeDialog } from 'primereact-opt/dialog';
import { Observable } from 'windowed-observable';
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import CookieStore from '../../stores/CookieStore';

// NOTE - Leaving top level component as a factory component so if we need mixins (generally for the top component) we don't need to change anything later

/**
 * Represents the view for viewing data review sets. This is the top level component, the other components are as follows:
 *    - DataReviewViewFilters: The filters pane
 *    - DataReviewSummaryView: The summary data diff view. Shown in the condition / absence of certain filters, see `getRenderMode`
 */
class DataReviewView extends React.Component{
  static displayName = 'DataReviewView';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string, // This is the ID of the data review set
      taskId: PropTypes.string
    }),
    router: PropTypes.object
  };

  static contextTypes = {
    router: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);
    let immExposureStore = this.props.immExposureStore;
    let fileId = this.getFileId(this.props);
    let immDataReview = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file'], Imm.Map());
    let immSelectedFilterOptions = this.props.query.addtask ? immExposureStore.getIn(['files', fileId, 'immMedFilterSelection'], Imm.Map()) : Imm.Map();

    this.importFile = React.createRef();
    this.initialRender = true;  // Used to prevent unintended rendering on the first render
    this.renderModes = {
      DEFAULT_VIEW: 'DEFAULT_VIEW',   // Default - tells instructions to use filters to see results
      SUMMARY_VIEW: 'SUMMARY_VIEW',   // DataReviewSummaryView
    };

    this.fileIsValid = this.fileIsValid.bind(this);
    this.postValidation = this.postValidation.bind(this);
    this.validateImportFile = this.validateImportFile.bind(this);
    this.onSubmitComplete = this.onSubmitComplete.bind(this);
    this.isDirty = this.isDirty.bind(this);
    this.setTaskFilters = this.setTaskFilters.bind(this);
    this.getTaskView = this.getTaskView.bind(this);
    this.toggleFiltersPane = this.toggleFiltersPane.bind(this);
    this.getFileId = this.getFileId.bind(this);
    this.getDiffExportMessage = this.getDiffExportMessage.bind(this);
    this.handleExportFile = this.handleExportFile.bind(this);
    this.onChange = this.onChange.bind(this);
    this.applyTaskFilters = this.applyTaskFilters.bind(this);
    this.handleToggleTasksPane = this.handleToggleTasksPane.bind(this);
    this.clickFileInput = this.clickFileInput.bind(this);
    this.displayHistoryModal = this.displayHistoryModal.bind(this);
    this.addTaskSuccessCallback = this.addTaskSuccessCallback.bind(this);

    this.state = {
      immDataReview: immDataReview,
      immDataReviewStore: DataReviewStore.getStore(),
      showFilters: true,
      isParseExcelFileReady: true,
      finishedSave: true,
      immSelectedFilterOptions: immSelectedFilterOptions,
      isTaskAvailable: false,
    }
  };

  getErrorDialog() {
    return ExposureActions.displayModal(ModalConstants.MODAL_SIMPLE_MESSAGE, {
      header: FrontendConstants.FAIL,
      content: FrontendConstants.FAIL_IMPORT_REVIEW_FILE,
      handleCancel: ExposureActions.closeModal,
      primaryButton: {text: FrontendConstants.CANCEL}
    });
  }

  fileIsValid(response, data) {
    // grab each field from the response json and append them to the form data, along with the file BLOB
    data.append('downloadId', response['downloadId']);
    data.append('reviewRole', response['reviewRole']);

    // for each valid set of rows, go through them and use the sheet name as a key for all the rows and comments
    // {"sheetName1" : {"1":"comment","2":""...}, "sheetname2":{...}}
    let rowMapString = {};
    _.keys(response).filter(key => {return key.includes("rowMap") && !key.includes("valid")}).forEach(key => {
      const sheetKey = key.split(' rowMap')[0];
      if (!!response[key]) {
        rowMapString[sheetKey] = JSON.parse(response[key]);
      }
    });

    data.append("rowMap", JSON.stringify(rowMapString));
    data.append('startDateRange', response['startDateRange']);
    data.append('endDateRange', response['endDateRange']);

    ExposureActions.displayModal(ModalConstants.MODAL_IMPORT_VALIDATION_DETAILS, {
      reviewedDate: new Date().toISOString().slice(0, 10),
      sheetAndRowMap: response,
      tabularReportNameMap: this.state.immDataReviewStore.get('tabularReportNameMap'),
      callback: () => {
        DataReviewActions.importDataReviewFile(data, this.onSubmitComplete);
        ExposureActions.closeModal();
        this.setState({
          finishedSave: false
        });
      },
      handleCancel: ExposureActions.closeModal,
    });
  }

  postValidation(response, data) {
    let validSheets = 0;

    // checking if anything valid has actually been uploaded
    _.keys(response).filter(key => {return key.includes("valid") && !key.includes("invalid") && !key.includes("rowMap")}).forEach(key => {
      if (response[key] != "") {
        validSheets++;
      }
    });

    // if we have a key for one or more valid sheets, proceed
    if (validSheets) {
      this.fileIsValid(response, data);
    } else {
      this.getErrorDialog();
    }
  }

  validateImportFile(event) {
    const file = event.target.files[0];
    let formData = new FormData();
    const fileId = this.getFileId(this.props);
    if (file) {
      formData.append('fileToBeValidated', file);
      formData.append('fileId', fileId);
      DataReviewActions.validateReviewFile(formData, this.postValidation);
    }
    else {
      this.getErrorDialog();
    }

    // clear out the event here so we can trigger this function again if necessary
    event.target.value = '';
  }

  onSubmitComplete() {
    this.setState({
      finishedSave: true
    });
  }

  /**
   * When the component mounts, do the AJAX call to fetch all of the data review set data
   */
  componentDidMount() {
    DataReviewStore.addChangeListener(this.onChange);
    const userEntityId = Util.getUserEntityId(this.props.immExposureStore);
    let fileId = this.getFileId(this.props);
    //get the roles for the userEntity to be passed to the filters component
    DataReviewActions.fetchUserEntityRoles(userEntityId);
    DataReviewActions.fetchTabularReportNames(fileId);
    // Fetch the data review set, and the related files. Note that we don't want to fetch the actual
    // report data for these reports (i.e. we don't want to execute the queries on these reports), so
    // set the flag fetchRelatedData to false to prevent unnecessary query executions
    if (_.isUndefined(fileId)) {
      return;
    }

    if (!this.props.params.taskId
      || !this.context.router.isActive(
        {
          name: RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_SHOW,
          params: this.props.params,
          query: this.props.query
        }))
    {
      ExposureActions.fetchFile(fileId, null, {
        fetchData: true,
        firstRender: true,
        fetchRelatedData: false
      });
    }
  }

  componentWillUnmount() {
    DataReviewStore.removeChangeListener(this.onChange);
    ExposureActions.toggleTasksPane(false);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

   handleToggleFiltersPane() {
    ExposureActions.toggleFiltersPane();
  }

  /**
   * So when the component is about to receive new props, let's check to see if there's anything that has changed since
   * the initial load. The use case this covers is to retrieve the data from the join table (to get the data for
   * all of the linked reports for the Data Review Set
   * @param nextProps - The incoming possibly / probably updated props that we need to check
   */
  componentWillReceiveProps(nextProps) {
    let immCurrentDataReview = this.props.immExposureStore.getIn(['files', this.getFileId(this.props), 'fileWrapper', 'file'], Imm.Map());
    let nextDataReview = nextProps.immExposureStore.getIn(['files', this.getFileId(nextProps), 'fileWrapper', 'file'], Imm.Map());

    // Compare the current data review set's list of reportIds and see if we actually received that in the next props
    // If it's different just set it to be the new file and let render take care of the rest
    if (!Imm.is(immCurrentDataReview.get('reportIds'), nextDataReview.get('reportIds'))) {
      this.setState({
        immDataReview: nextDataReview
      });
    }
    let clonedTaskDetails = this.props.immExposureStore.get('taskStoreDetailsData');
    if(clonedTaskDetails){	
      let clonedContextEntity = clonedTaskDetails.getIn(['task', 'taskExtraInformation', 'datareviewId'])
      
      if(immCurrentDataReview.toJS()?.id !== clonedContextEntity){	
        ExposureActions.storeTaskDetailsAction(false)	
        ExposureActions.storeTaskDetailsDataAction(null)	
        ExposureActions.storeClonedTriggeredAction(false)	
      }	
    }
  }

  /**
   * Checks to see if we have everything necessary in order to render this data review set. In order for this to be
   * displayable, we need to fetch the list of tabular analytics from the dashboards_reports join table
   * @returns {boolean}
   */
  isReady () {
    // This is used because the AJAX call in ComponentDidMount will trigger only after the initial render, and we don't want to display anything initially
    if (this.initialRender) {
      this.initialRender = false;
      return false;
    }

    let fileRequestInFlight = this.props.immExposureStore.getIn(['files', this.getFileId(this.props), 'fileRequestInFlight'], false);
    let haveDataReview = !this.state.immDataReview.isEmpty();

    let hasDataReviewLinkedReports = false;
    if (haveDataReview) {
      hasDataReviewLinkedReports = this.state.immDataReview.get('reportIds').reduce((memo, reportId) => {
        // If we encountered a report that hasn't loaded, we're not ready
        if (!memo) return memo;

        // If a file request is in progress, we're not ready
        if (this.props.immExposureStore.getIn(['files', reportId, 'fileRequestInFlight'])) return false;

        // Finally, if we don't have the file object itself then RIP
        return this.props.immExposureStore.hasIn(['files', reportId, 'fileWrapper', 'file']);
      }, true);
    }

    // If we don't have the data review or any of its linked reports then we're not ready
    return !fileRequestInFlight && haveDataReview && hasDataReviewLinkedReports;
  }

  setTaskFilters (dataTaskFilters) {
    let immSelectedFilterOptions = Imm.Map();
    if (dataTaskFilters.Study) {
      let study = dataTaskFilters.Study;
      immSelectedFilterOptions = immSelectedFilterOptions.set('Study', Imm.fromJS(
        {field: study.field, dataType: study.dataType, type: study.type, value: study.value, displayName: study.displayName}
      ));
    }

    if (dataTaskFilters.Subjects) {
      let subject = dataTaskFilters.Subjects;
      immSelectedFilterOptions = immSelectedFilterOptions.set('Subjects', Imm.fromJS(
      _.map(subject, (subject) => {return {field: subject.field, dataType: subject.dataType, type: subject.type, value: subject.value, displayName: subject.displayName};})
      ));
    }

    if (dataTaskFilters.Dates) {
      let date1 = dataTaskFilters.Dates[0];
      let date2 = dataTaskFilters.Dates[1];
      if (date2) {
        immSelectedFilterOptions = immSelectedFilterOptions.set('Dates', Imm.fromJS([
          {field: date1.field, dataType: date1.dataType, type: date1.type, value: date1.value},
          {field: date2.field, dataType: date2.dataType, type: date2.type, value: date2.value}
        ]));
      } else {
        immSelectedFilterOptions = immSelectedFilterOptions.set('Dates', Imm.fromJS([
          {field: date1.field, dataType: date1.dataType, type: date1.type, value: date1.value}
        ]));
      }
    }
    return immSelectedFilterOptions;
  }

  applyTaskFilters (immSelectedFilterOptions) {
    this.setState({
      immSelectedFilterOptions: immSelectedFilterOptions
    });
    return true;
  }

  /**
   * Used to toggle the filter pane (either show or hide the pane)
   */
  toggleFiltersPane(state) {
    this.setState({showFilters: state});
    ExposureActions.toggleFiltersPane(state);
  }

  componentWillUpdate(nextProps, nextState) {	
    let immCurrentDataReview = this.props.immExposureStore.getIn(['files', this.getFileId(this.props), 'fileWrapper', 'file'], Imm.Map());	
    if(this.props.immExposureStore.get('taskStoreDetailsData') !== undefined && this.props.immExposureStore.get('taskStoreDetailsData') !== null && this.props.immExposureStore.get('taskStoreDetailsData').toJS().task.coreTaskAttributes.reportId !== null){	
      if(immCurrentDataReview.toJS().id !== this.props.immExposureStore.get('taskStoreDetailsData').toJS().task.coreTaskAttributes.reportId ){	
        ExposureActions.toggleTasksPane(false);	
      }	
    }	
  }

  /**
   * In order to do a data diff on the data review set, the user must specify a minimum set of filters to
   * perform the data diff. This checks that requirement.
   */
  hasMinimumRequiredFilters(immSelectedFilterOptions) {
    const fromDate = immSelectedFilterOptions.getIn(['Dates', 0, 'value']);
    const toDate = immSelectedFilterOptions.getIn(['Dates', 1, 'value']);

    // Date range is only valid if we have a from date
    const isFromDateValid = fromDate && !isNaN(fromDate);

    // Date range is only valid if we have a to date
    const isToDateValid = toDate && !isNaN(toDate);

    // Study is a required filter
    const hasStudyFilter = immSelectedFilterOptions.hasIn(['Study', 'value']);

    // Included Records is required filter
    const hasIncludedRecords = immSelectedFilterOptions.hasIn(['IncludedRecords', 'value']);

    return isFromDateValid && isToDateValid && hasStudyFilter && hasIncludedRecords;
  }

  /**
   * Based on the existence / values of the specified filters, we'll change the render mode appropriately
   */
  getRenderMode () {
    if (!this.hasMinimumRequiredFilters(this.state.immSelectedFilterOptions)) {
      return this.renderModes.DEFAULT_VIEW;
    }
    return this.renderModes.SUMMARY_VIEW;
  }

  handleAddTasksPane = (fileId, fileType) => {
    ExposureActions.clearTaskInformationTemp();
    const immExposureStore = this.props.immExposureStore;
    const immReport = immExposureStore.getIn(['files', fileId]);
    const actionType = FrontendConstants.ADD_TASK;
    let args = { immReport, immExposureStore, actionType, CookieStore };
    let taskObject = Util.generateContextObject(args);
    observable.publish(taskObject);
  }

  handleToggleTasksPane(currentFileId) {
    this.setState({ isTaskAvailable: false},()=>{
      ExposureActions.toggleTasksPane(false);
     });
     if (
      this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_TASKS_NEW,
      params: this.props.params,
      query: this.props.query
    })){
      this.context.router.push(RouteNameConstants.EXPOSURE_TASKS);
    }
  }

  isDirty() {
    return this.refs['task'] && this.refs['task'].isDirty();
  }

  addTaskSuccessCallback() {
    this.setState({
      isTaskAvailable : false
    }, () =>{
      ExposureActions.toggleTasksPane(false);
    })
  }
  
  getTaskView(currentFileId, immFile, isLinkedToCDMFile) {
    let isUnsavedWarningDisplayed = this.props.immExposureStore.get('modalContent', {}).type === ModalDialogContent.UnsavedWarning;
    let handleToggleTasksPane = this.handleToggleTasksPane.bind(null, currentFileId);
    let immExposureStore = this.props.immExposureStore;
    let fileTitle = immFile && immFile.get('title');
    let currentDateTime = Util.dateFormatDDMMYYHHmm(new Date());
    const immReport = immExposureStore.getIn(['files', currentFileId]);
    let automatedTitle = `${currentDateTime}${fileTitle ? '-'+ fileTitle : ''}`

    let defaultProps = {
      ref: 'task',
      currentFileId,
      isLinkedToCDMFile,
      currentUserId: immExposureStore.getIn(['userInfo', 'id']),
      handleToggleTasksPane: handleToggleTasksPane,
      immFileConfigs: immExposureStore.get('fileConfigs'),
      immGroupEntities: immExposureStore.get('groupEntities'),
      immUsers: immExposureStore.get('users'),
      immTaskTypes: immExposureStore.get('taskTypes'),
      immCDMDropdownData: this.props.immExposureStore.get('CDMDropdownData'),
      isLoading: immExposureStore.get('isLoadingTask')
    };
    if (this.context.router.isActive({name: RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_NEW, params: this.props.params, query: this.props.query})||
    this.state.isTaskAvailable) {
      let props = _.extend(defaultProps, {
        immExposureStore,
        handleLinkedFileChange: this.handleAddTasksPane,
        isUnsavedWarningDisplayed: isUnsavedWarningDisplayed,
        disableAssociatedReports: this.props.query.disableAssociatedReports === "true",
        isDataReview: true,
        taskStoreDetails: this.props.immExposureStore.get('taskStoreDetails'),	
        taskStoreDetailsData: this.props.immExposureStore.get('taskStoreDetailsData'),
        addTaskSuccessCallback: this.addTaskSuccessCallback,
        automatedTitle,
        hideHeader: true
      });
      return <PrimeDialog 
                header={FrontendConstants.ADD_A_TASK} 
                visible={this.state.isTaskAvailable} 
                style={{'width': '25%', height: 'auto'}} 
                onHide={()=>this.handleToggleTasksPane()}
                position="top-right"
                resizable={false}
                id="task-container"
                className="exposure"
                modal={true}>
                  <AddTask {...props} />
              </PrimeDialog>
    } else if (this.props.params.taskId && this.context.router.isActive({
        name: RouteNameConstants.EXPOSURE_DATA_REVIEW_SET_TASKS_SHOW,
        params: this.props.params, query: this.props.query
      })) {
      let props = _.extend(defaultProps, {
        immExposureStore,
        currentTaskId: this.props.params.taskId,
        immTaskSummaries: immExposureStore.get('taskSummaries'),
        immTaskWrappers: immExposureStore.get('tasks'),
        isUnsavedWarningDisplayed: isUnsavedWarningDisplayed,
        isDataReview: true,
        setTaskFilters: this.setTaskFilters,
        applyTaskFilters: this.applyTaskFilters
      });
      return <ViewTask {...props} />
    }
  }

  getFileId(props) {
    if (props.params.fileId) {
      return props.params.fileId;
    } else if (props.query.fileId) {
      return props.query.fileId;
    } else {
      return props.immExposureStore.getIn(['tasks', this.props.params.taskId, 'task', 'taskExtraInformation', 'datareviewId'])
    }
  }

  getDiffExportMessage () {
    const reviewRolesCount = this.state.immSelectedFilterOptions.get('ReviewRoles', Imm.List()).size;
    if (reviewRolesCount !== 0) {
      return "";
    }

    return (
      <div className='data-diff-message'>
        <div className='data-diff-export-message-container'>
          <div className='data-diff-export-message-icon'>
            <span className="icon-information_solid"/>
          </div>
          <div className='data-diff-export-message-wrapper'>
            {FrontendConstants.DATA_REVIEW_SUMMARY_FILTER_REVIEW_ROLES}
          </div>
        </div>
      </div>);
  }

  /**
   * Used to handle exporting the data diff to Excel
   */
  handleExportFile() {
    const data = DataReviewUtil.buildDataDiffRequest(this.state.immSelectedFilterOptions);
    ExposureActions.displayModal(ModalConstants.MODAL_DOWNLOAD_FILE, {
      handleCancel: ExposureActions.closeModal,
      fileId: this.state.immDataReview.get('id'),
      downloadType: ExposureAppConstants.DOWNLOAD_TYPE_XLSX,
      dataDiffRequest: data
    });
  }

  clickFileInput() {
    this.importFile.current.click();
  }
  
  displayHistoryModal() {
    ExposureActions.displayModal(ModalConstants.MODAL_DATA_REVIEW_SET_HISTORY, {
      handleCancel: ExposureActions.closeModal,
      fileId: this.getFileId(this.props)
    });
  }

  render () {
    if (this.state.isParseExcelFileReady === false || this.state.finishedSave === false) {
      return <ContentPlaceHolder/>
    }

    let showFilters = this.state.showFilters;
    let fileId = this.getFileId(this.props);
    let canEdit = this.props.immExposureStore.getIn(['files', fileId, 'fileWrapper', 'canEdit'], false);
    let immFile = this.props.immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    let isCDMFile = Util.isCDMFile(this.props.immExposureStore, immFile);
    let taskView = this.getTaskView(fileId, immFile, isCDMFile);
    let showTasks = !_.isUndefined(taskView) && !this.state.isTaskAvailable;
    let renderMode = this.getRenderMode();
    let dataDiffContent;

    const isHomeActive = Util.isHomeRouteActive(this.props.routes);

    if (this.isReady() && renderMode === this.renderModes.SUMMARY_VIEW) {
      dataDiffContent = (
            <DataReviewSummaryView
              immExposureStore={this.props.immExposureStore}
              immDataReview={this.state.immDataReview}
              immSelectedFilterOptions={this.state.immSelectedFilterOptions}
              exportFile={this.handleExportFile}
              importFile={this.clickFileInput}
            />
          );
    } else {
      const bodyText = (<div>
          <div>{FrontendConstants.DATA_REVIEW_PLEASE_SELECT_FILTERS}</div>
          <div className={'report-filter-notice-text'}>Import a completed review file, or view a history of the exports and imports for this Review Set:</div>
          <Button
            classes={cx('import-button', 'report-filter-notice-text')}
            children={FrontendConstants.DATA_REVIEW_IMPORT_FILE}
            isPrimary={true}
            onClick={this.clickFileInput}/>
          <Button
            classes={cx('transaction-button', 'report-filter-notice-text')}
            children={FrontendConstants.DATA_REVIEW_PAST_IMPORTS_EXPORTS}
            isPrimary={true}
            onClick={this.displayHistoryModal}/>
        </div>);

      dataDiffContent = (<ReportFilterNotice
        headerText={`${FrontendConstants.SELECT_FILTERS_TO_BEGIN_REVIEW}.`}
        bodyText={bodyText}
        filterPaneState={this.state.showFilters}
      />);
    }

    return (
      <div className={cx('data-review-view-container', {'show-filters': showFilters, 'show-tasks': showTasks})}>
        <div className='page-header'>
          {
            isHomeActive
              ? null
              : <Breadcrumbs immExposureStore={this.props.immExposureStore} fileId={fileId}
                             isMobile={Util.isMobile()}/>
          }
          <div className='header-buttons'>
            <SimpleAction
              class={cx('toggle-filters', 'icon-filter2')}
              text={FrontendConstants.FILTERS}
              onClick={fileId ? this.toggleFiltersPane.bind(null, !showFilters) : _.noop}
            />
            <Menu className="more-menu" horizontalPlacement="Left">
              <MenuTrigger className="more-menu-trigger">
                <div className="react-menu-icon icon-menu2">More</div>
              </MenuTrigger>
              <MenuOptions className='more-menu-options'>
                {AccountUtil.hasPrivilege(this.props.immExposureStore, 'isCreateTask') ?
                <MenuOption className="more-menu-add" onSelect={()=>this.handleAddTasksPane(fileId, ExposureAppConstants.FILE_TYPE_DATA_REVIEW)}>
                  <div className="react-menu-icon icon-plus-circle2">{FrontendConstants.ADD_A_TASK}</div>
                </MenuOption> : null}
                <MenuOption className="more-menu-share"
                            onSelect={ExposureActions.shareFilesModal.bind(null, Imm.List([fileId]))}>
                  <div className="react-menu-icon icon-share">{FrontendConstants.SHARE}</div>
                </MenuOption>
                <MenuOption className="more-menu-edit" disabled={!canEdit}
                  onSelect={() => this.context.router.push(
                    {
                      name: RouteNameConstants.EXPOSURE_DATA_REVIEW_EDIT,
                      params: {fileId: fileId}
                    })}
                >
                  <div className="react-menu-icon icon-pencil">{FrontendConstants.EDIT}</div>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </div>
        </div>
        <div className='data-review-view' >
          <div className='filters'>
            <DataReviewViewFilters
              immSelectedFilterOptions={this.state.immSelectedFilterOptions}
              displayFilters={this.state.showFilters}
              handleClose={this.toggleFiltersPane.bind(null, false)}
              immDataReview={this.state.immDataReview}
              immExposureStore={this.props.immExposureStore}
              setTaskFilters={this.setTaskFilters}
              applyTaskFilters={this.applyTaskFilters}
              hasMinimumRequiredFilters={this.hasMinimumRequiredFilters}
              immDataReviewStore={this.state.immDataReviewStore}
            />
          </div>
          <div className='data-diff-summary-container'>
            {renderMode !== this.renderModes.DEFAULT_VIEW ? this.getDiffExportMessage() : ''}
            <input id='dataReviewInput'
                   type='file'
                   ref={this.importFile}
                   accept='.xls, .xlsx'
                   onChange={this.validateImportFile}
            />
            {dataDiffContent}
          </div>
        </div>
        <div className='tasks'>
          {taskView}
        </div>
      </div>
    );
  }

  onChange() {
    this.setState({
      immDataReviewStore: DataReviewStore.getStore()
    });
  }
}

module.exports = withTransitionHelper(DataReviewView);
