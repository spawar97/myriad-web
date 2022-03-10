import React from 'react';
import {withTransitionHelper} from "../../RouterTransitionHelper";
import FrontendConstants from "../../../constants/FrontendConstants";
import cx from "classnames";
import Imm from 'immutable';

let createReactClass = require('create-react-class');
import TaskTable from "./TaskTable";
import PropTypes from 'prop-types';

var AdminActions = require('../../../actions/AdminActions');
import ContentPlaceholder from '../../ContentPlaceholder';
import Menu from '../../../lib/react-menu/components/Menu';
import MenuOption from '../../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../../lib/react-menu/components/MenuTrigger';
import AddClinicalAttributeModal from './AddClinicalAttributeModal';
import Button from '../../Button';

var TaskManagementActions = require('../../../actions/TaskManagementActions');
import TaskManagementStore from '../../../stores/TaskManagementStore';


var TaskManagementView = createReactClass({
  displayName: 'TaskManagement',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function () {
    let taskMetadata;
    let showModal = false;
    let immComprehendSchemas = null;
    this.storeChangeHandler = this._onStoreChange.bind(this);

    TaskManagementStore.resetStore();
    const newImmStore = TaskManagementStore.getStore();
    const fieldTypeArr = newImmStore.get('fieldTypeArr');
    const dateConditions = newImmStore.get('dateConditions');

    return {
      showModal: showModal,
      immComprehendSchemas: immComprehendSchemas,
      fieldTypeArr: fieldTypeArr,
      dateConditions: dateConditions.toJS(),
      taskMetadata: taskMetadata,
      clinicalAttributes: [],
      workingCs: null,
      immSelectedAttribute: null
    };
  },

  //if focusLatestExtendedRow flag in store is true then focus latest added row
  checkForFocusLatestExtendedRow: function () {
    const newImmStore = TaskManagementStore.getStore();
    const focusLatestExtendedRow = newImmStore.get('focusLatestExtendedRow');
    if (focusLatestExtendedRow) {
      this.focusToAddedRow();

      //Unset flag after focus
      TaskManagementActions.changeFlagFocusLatestExtendedRow();
    }
  },

  _getFixedWidthColumnStyle: function (width) {
    return {width: width, maxWidth: width, minWidth: width, textAlign: 'center'};
  },

  componentDidMount: function () {
    TaskManagementActions.addListener(this.storeChangeHandler);
    AdminActions.fetchComprehendSchemas();
    TaskManagementActions.fetchTaskMetadata();
  },

  componentWillUnmount() {
    TaskManagementActions.removeListener(this.storeChangeHandler);
  },

  _onStoreChange: function () {
    const newImmStore = TaskManagementStore.getStore();
    const taskMetadata = newImmStore.get('taskMetadata', Imm.List());
    this.setState({
      taskMetadata: taskMetadata,
      clinicalAttributes: taskMetadata.get('taskAttributes') ? taskMetadata.getIn(['taskAttributes', 'clinicalAttributes']).toJS() : null
    }, () => {
      this.checkForFocusLatestExtendedRow();
    });
  },

  _getTableHeader: function () {
    return (
      <tr>
        <th style={this._getFixedWidthColumnStyle('12rem')}>{FrontendConstants.TASK_MANAGEMENT_ACTIONS}</th>
        <th style={this._getFixedWidthColumnStyle('18rem')}>{FrontendConstants.TASK_MANAGEMENT_FIELD_NAME}</th>
        <th style={this._getFixedWidthColumnStyle('20rem')}>{FrontendConstants.TASK_MANAGEMENT_FIELD_TYPE}</th>
        <th style={this._getFixedWidthColumnStyle('20rem')}>{FrontendConstants.TASK_LOV}</th>
        <th style={this._getFixedWidthColumnStyle('12rem')}>{FrontendConstants.TASK_MANAGEMENT_IS_MANDATORY}</th>
        <th style={this._getFixedWidthColumnStyle('25rem')}>{FrontendConstants.TASK_FILTER_DEPENDANCY}</th>
        <th style={this._getFixedWidthColumnStyle('25rem')}>{FrontendConstants.TASK_MANAGEMENT_FIELD_DESC}</th>
        <th style={this._getFixedWidthColumnStyle('25rem')}>{FrontendConstants.TASK_ASSOCIATED_ANALYTICS_AND_DASHBOARD}</th>
      </tr>
    );
  },

  _isReady() {
    const newImmStore = TaskManagementStore.getStore();
    const {immAdminStore} = this.props;
    return newImmStore.get('taskMetadata') && newImmStore.get('taskMetadata').size > 0 && immAdminStore.get('dashboardsAndReports') &&
      immAdminStore.get('combineDashboardReportList') && immAdminStore.get('combineDashboardReportList').length > 0 && newImmStore.get('taskMetadataAnalytics');
  },

  _handleUpdateTaskMetadata(task_metadata, attributeType) {
    TaskManagementActions.updateTaskMetadata(task_metadata, attributeType);
  },

  _checkDuplicateInEachAttribute(newImmStore, attributeType, changedAtributeType, newValue, index) {
    let coreAttributes = newImmStore.getIn(['taskMetadata', 'taskAttributes', attributeType]);
    let coreIndex = coreAttributes.findIndex(attr => {
      return attr.get('fieldName').toUpperCase() == newValue.trim().toUpperCase();
    })
    if (coreIndex != -1 &&
      ((attributeType == changedAtributeType && index != coreIndex) ||
        (attributeType != changedAtributeType))) {
      return true;
    }
  },

  _checkDuplicateFieldName(index, attributeType, newValue) {
    const newImmStore = TaskManagementStore.getStore();
    const isDuplicate =
      this._checkDuplicateInEachAttribute(newImmStore, 'coreAttributes', attributeType, newValue, index) ||
      this._checkDuplicateInEachAttribute(newImmStore, 'extendedAttributes', attributeType, newValue, index) ||
      this._checkDuplicateInEachAttribute(newImmStore, 'clinicalAttributes', attributeType, newValue, index);

    return isDuplicate;
  },

  _getConfiguredDispositionContent: function () {
    const {immAdminStore} = this.props;
    const combineDashboardReportList = immAdminStore.get('combineDashboardReportList');
    const {taskMetadata, fieldTypeArr, dateConditions} = this.state;
    
    const commonProps = {
      fieldTypeArr: Imm.List(fieldTypeArr),
      dateConditions: dateConditions,
      updateTaskMetadata: this._handleUpdateTaskMetadata,
      checkDuplicateFieldName: this._checkDuplicateFieldName,
      files: combineDashboardReportList
    }

    const taskAttributeProps = {
      tasks_metadata: taskMetadata.getIn(['taskAttributes', 'coreAttributes'], Imm.List()),
      title: 'Core Attributes',
      attributeType: 'coreAttributes',
      removeAttribute: false,
      defaultMandatory: true,
      ...commonProps
    };
    const extendedAttributesProps = {
      tasks_metadata: taskMetadata.getIn(['taskAttributes', 'extendedAttributes'], Imm.List()),
      title: 'Extended Attributes',
      attributeType: 'extendedAttributes',
      removeAttribute: true,
      defaultMandatory: false,
      ...commonProps
    };
    const clinicalAttributesProps = {
      tasks_metadata: taskMetadata.getIn(['taskAttributes', 'clinicalAttributes'], Imm.List()),
      title: 'Clinical Attributes',
      attributeType: 'clinicalAttributes',
      removeAttribute: false,
      defaultMandatory: false,
      viewClinicalAttribute: this._addClinicalAttributeToTable,
      ...commonProps
    };

    const mappedDispositionContent = (
      <div>
        <TaskTable {...taskAttributeProps}></TaskTable>
        <TaskTable {...extendedAttributesProps}></TaskTable>
        <TaskTable {...clinicalAttributesProps} ref={clinicalAttributesRef => this.clinicalAttributesRef = clinicalAttributesRef}></TaskTable>
      </div>
    );

    return mappedDispositionContent;
  },

  isDirty: function () {
    const newImmStore = TaskManagementStore.getStore();
    const originalTaskMetadata = newImmStore.get('originalTaskMetadata');
    const taskMetadata = newImmStore.get('taskMetadata');
    if (!newImmStore.get('isMetadataAnalyticsLoading') && !Imm.is(originalTaskMetadata, taskMetadata)){
      return true;
    }
    else{
      return false;
    }
  },

  unsavedWorkModalCopy: function () {
    return {
      header: FrontendConstants.DISCARD_CHANGES_TO_REPORT,
      content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  },

  _removeInvalidRecords: function () {
    const newImmStore = TaskManagementStore.getStore();
    let taskMetadata = newImmStore.get('taskMetadata');
    let extendedAttributesList = taskMetadata.getIn(['taskAttributes', 'extendedAttributes']);
    extendedAttributesList = extendedAttributesList.filter((attr) => {
      return attr.get('fieldName') && attr.get('fieldName').trim() != ''
    })
    taskMetadata = taskMetadata.setIn(['taskAttributes', 'extendedAttributes'], extendedAttributesList);

    let clinicalAttributesList = taskMetadata.getIn(['taskAttributes', 'clinicalAttributes']);
    clinicalAttributesList = clinicalAttributesList.filter((attr) => {
      return attr.get('fieldName') && attr.get('fieldName').trim() != ''
    })
    taskMetadata = taskMetadata.setIn(['taskAttributes', 'clinicalAttributes'], clinicalAttributesList);
    this._continueSave(taskMetadata.toJS());
  },

  _callBackFunction: function (isContinue) {
    if (!isContinue) {
      const { invalidObj } = this.state;
      let lastRowId = `${invalidObj.attributeType}-${invalidObj.invalidIndex}`;
      var target = $(`#${lastRowId}`);
      if (target.length > 0) {
        target[0].scrollIntoView({block: 'center'});

        //Highlight row which is having invalid field
        target[0].className = 'highlight-row';

        //Remove highlighted class after 6 secs
        setTimeout(function(){
          target[0].className = '';
        },6000);
        
        // add invalidRecordType to invalid row
        // using this attribute we can show invalid field 
        const newImmStore = TaskManagementStore.getStore();
        const taskMetadata = newImmStore.get('taskMetadata');
        let attributesList = taskMetadata.getIn(['taskAttributes', invalidObj.attributeType]);
        attributesList = attributesList.setIn([invalidObj.invalidIndex, 'invalidRecordType'], invalidObj.invalidRecordType);
         
        this._handleUpdateTaskMetadata(attributesList, invalidObj.attributeType);
      }
    } else {
      this._removeInvalidRecords();
    }
  },

  setInvalidIndexWithAttributeType: function (invalidIndex, invalidRecordType, attributeType) {
    let invalidObj = {invalidIndex, invalidRecordType, attributeType}
    this.setState({invalidObj});
  },

  isDuplicateLOVs: function(lovs){
    lovs = lovs.split(",").map(function (item) {
      return item.trim().toUpperCase();
    });
    let findDuplicateIndex = lovs.findIndex((item, index) => lovs.indexOf(item) != index);
    if(findDuplicateIndex != -1) 
      return true;
    return false;

  },

  _validateByAttributeType: function (taskMetadata, attributeType) {
    let invalidRecordType = '';

    let invalidRecordIndex = taskMetadata.getIn(['taskAttributes', attributeType]).findIndex((attr) => {
      if (!attr.get('fieldName') || attr.get('fieldName').trim() == '') {
        invalidRecordType = 'emptyFieldName';
      } else if (attr.get('duplicateFieldName')) {
        invalidRecordType = 'duplicateFieldName';
      } else if (attr.get('associatedAnalyticsAndDashboard') && attr.get('associatedAnalyticsAndDashboard').length == 0) {
        invalidRecordType = 'emptyAssociatedAnalytics';
      } else if (attr.get('fieldType') === 'date' && attr.get('dateConditions').length == 0) {
        invalidRecordType = 'emptyDateConditions';
      } else if (attributeType == 'extendedAttributes' && ( attr.get('fieldType') === 'multiSelectDropdown' || 
          attr.get('fieldType') === 'singleSelectDropdown')){
            if(!attr.get('fieldValues') || attr.get('fieldValues').trim == ''){
              invalidRecordType = 'emptyLOVs';
            }else if(this.isDuplicateLOVs(attr.get('fieldValues'))){
              invalidRecordType = 'duplicateLOVs'
            }  
      }
      return invalidRecordType != ''
    })
    if (invalidRecordIndex != -1)
      return {invalidRecordIndex, invalidRecordType};
    else
      return {};
  },

  _validateRecords: function () {
    const newImmStore = TaskManagementStore.getStore();
    let taskMetadata = newImmStore.get('taskMetadata');
    const inValidExtendedAttribute = this._validateByAttributeType(taskMetadata, 'extendedAttributes');

    if (inValidExtendedAttribute.hasOwnProperty('invalidRecordIndex') && inValidExtendedAttribute.invalidRecordIndex != -1) {
      this.setInvalidIndexWithAttributeType(inValidExtendedAttribute.invalidRecordIndex, inValidExtendedAttribute.invalidRecordType, 'extendedAttributes');
      return inValidExtendedAttribute;
    } else {
      const inValidClinicalAttribute = this._validateByAttributeType(taskMetadata, 'clinicalAttributes');
      if (inValidClinicalAttribute.hasOwnProperty('invalidRecordIndex') && inValidClinicalAttribute.invalidRecordIndex != -1) {
        this.setInvalidIndexWithAttributeType(inValidClinicalAttribute.invalidRecordIndex, inValidClinicalAttribute.invalidRecordType, 'clinicalAttributes');
        return inValidClinicalAttribute;
      } else {
        return true;
      }
    }
  },

  _continueSave: function (taskMetadata) {
    const select_all_obj = {
      id: 'select_all',
      name: 'select_all'
    };
    let extendedAttributes = taskMetadata.taskAttributes.extendedAttributes;
    let clinicalAttributes = taskMetadata.taskAttributes.clinicalAttributes;
    let files = this.props.immAdminStore.get('dashboardsAndReports');
    let entitySummary = this.props.immAdminStore.get('kpiReportList');

    extendedAttributes = extendedAttributes.filter(attr => {
      if (attr.associatedAnalyticsAndDashboard.length == (files.size + entitySummary.length))
        attr.associatedAnalyticsAndDashboard = [select_all_obj]
      return attr
    })

    clinicalAttributes = clinicalAttributes.filter(attr => {
      if (attr.associatedAnalyticsAndDashboard.length == (files.size + entitySummary.length))
        attr.associatedAnalyticsAndDashboard = [select_all_obj]
      return attr
    })
    taskMetadata.taskAttributes.extendedAttributes = extendedAttributes;
    taskMetadata.taskAttributes.clinicalAttributes = clinicalAttributes;
    
    this.clinicalAttributesRef.setState({clinicalDataChangeConfirmation : false});
    TaskManagementActions.saveTaskMetadata(taskMetadata);
  },

  _saveTaskMetadata: function () {
    const isValid = this._validateRecords();
    if (typeof isValid == 'object') {
      if(isValid.invalidRecordType){
        let message;
        let invalidRecordType = isValid.invalidRecordType;
        switch(invalidRecordType){
          case 'emptyFieldName':
          case 'emptyLOVs':
          default: 
            message = FrontendConstants.TASK_MANAGEMENT_BLANK_RECORDS_MESSAGE;
            break;
          case 'duplicateFieldName':
            message = FrontendConstants.TASK_MANAGEMENT_DUPLICATE_FIELD_NAME_MESSAGE;
            break;
          case 'emptyAssociatedAnalytics':
            message = FrontendConstants.TASK_MANAGEMENT_EMPTY_ASSOCIATED_LIST;
            break;
          case 'emptyDateConditions':
            message = FrontendConstants.TASK_MANAGEMENT_EMPTY_DATE_CONDITIONS;
            break;
          case 'duplicateLOVs':
            message = FrontendConstants.TASK_MANAGEMENT_DUPLICATE_LOVS;
            break;
        }
        AdminActions.displayTaskManagementSaveConfirmationModal(this._callBackFunction, message);
      }
    } else {
      const newImmStore = TaskManagementStore.getStore();
      let taskMetadata = newImmStore.get('taskMetadata').toJS();
      this._continueSave(taskMetadata);
    }
  },

  focusToAddedRow: function () {

    const newImmStore = TaskManagementStore.getStore();
    let taskMetadata = newImmStore.get('taskMetadata');
    let extendedAttributesList = taskMetadata.getIn(['taskAttributes', 'extendedAttributes']);

    let lastRowId = `extendedAttributes-${extendedAttributesList.size - 1}`;
    var target = $(`#${lastRowId}`);
    if (target.length > 0) {
      target[0].scrollIntoView({block: 'center'});
    }

    var target1 = $(`#${lastRowId} :input:first`);
    if (target1.length > 0) {
      target1[0].focus();
    }
  },

  _getAddMenuContent: function () {
    var moreMenu = (
      <Menu className='add-menu'>
        <MenuTrigger className='add-menu-trigger'>
          <div className={cx('react-menu-icon', 'icon-plus-circle2')}>
            {FrontendConstants.ADD}
          </div>
        </MenuTrigger>
        <MenuOptions className='more-menu-options'>
          <MenuOption className='more-menu-delete' onSelect={this._addTaskAttributeToTable}>
            <div className='react-menu-icon icon-extended'>Extended Atrribute</div>
          </MenuOption>
          <MenuOption className='more-menu-delete icon-clinical hide-attribute' onSelect={this._addClinicalAttributeToTable}>
            <div>Clinical Atrribute</div>
          </MenuOption>
        </MenuOptions>
      </Menu>
    );
    return moreMenu;
  },

  _addClinicalAttributeToTable: function (immSelectedAttribute, idx) {
    const newImmStore = TaskManagementStore.getStore();
    const taskMetadata = newImmStore.get('taskMetadata', Imm.List());
    let workingCs = this.state.workingCs;
    let clinicalAttributesList = taskMetadata.get('taskAttributes') ? taskMetadata.getIn(['taskAttributes', 'clinicalAttributes']).toJS() : null

    if (immSelectedAttribute) {
      let comprehendSchemas = this.props.immAdminStore.get('comprehendSchemas');
      let selectedSchema = comprehendSchemas.find((schema) => {
        return schema.get('name') === immSelectedAttribute.get('clinicalDbDetail').schema
      })
      workingCs = this.getWorkingComprehendSchema(selectedSchema.get('id'));
      clinicalAttributesList[idx]['isActive'] = true;
    } else {
      clinicalAttributesList = clinicalAttributesList.map(attr => {
        attr['isActive'] = false
        return attr
      });
    }
    this.setState({
      showModal: true,
      isViewMode: immSelectedAttribute ? true : false,
      selectedAttributeName: immSelectedAttribute ? immSelectedAttribute.get('fieldName') : '',
      workingCs: workingCs,
      immSelectedAttribute: immSelectedAttribute,
      clinicalAttributes: clinicalAttributesList
    }, () => {
      this.setState(
        {
          leftPanelWidth: this.state.isViewMode ? ($('.clinical-popup-section-left').width()) : ($('.clinical-popup-section-left').width()) * 0.8,
          immWorkingCs: workingCs ? this.clinicalAttributeModalRef.getWorkingCs(workingCs) : null
        }, async () => {
          if (immSelectedAttribute) {
            let immPath = Imm.List([immSelectedAttribute.get('clinicalDbDetail').datasource, immSelectedAttribute.get('clinicalDbDetail').table]);
            await this.clinicalAttributeModalRef.handleTreeItemExpandOrCollapse(Imm.List([immSelectedAttribute.get('clinicalDbDetail').datasource]));
            await this.clinicalAttributeModalRef.handleTreeItemExpandOrCollapse(immPath);
            this.clinicalAttributeModalRef.handleTreeItemSelection(Imm.List([immSelectedAttribute.get('clinicalDbDetail').datasource, immSelectedAttribute.get('clinicalDbDetail').table, immSelectedAttribute.get('clinicalDbDetail').column]));
            let lastRowId = `.tree-entry .selected`;
            var target = $(lastRowId);
            if (target.length > 0) {
              target[0].scrollIntoView({block: 'center'});
            }
          }
        });

    });
  },

  closeClinicalAttributeModal: function () {
    this.setState({
      showModal: false
    })
  },

  _addTaskAttributeToTable: function () {
    const {immAdminStore} = this.props;
    const combineDashboardReportList = immAdminStore.get('combineDashboardReportList');
    TaskManagementActions.addExtendedTaskAttribute(combineDashboardReportList);
  },

  addClinicalAtrributes: function (clinicalAttributes) {
    const {immAdminStore} = this.props;
    const combineDashboardReportList = immAdminStore.get('combineDashboardReportList');
    TaskManagementActions.addClinicalAttributes(combineDashboardReportList, clinicalAttributes, this.closeClinicalAttributeModal);
  },

  addNewClinicalAttribute: function () {
    this.addNewFieldInTable(immComprehendSchemas);
  },

  getWorkingComprehendSchema: function (id) {
    return this.props.immAdminStore.getIn(['comprehendSchemas', id]);
  },

  render: function () {
    let content;
    const {
      clinicalAttributes,
      leftPanelWidth,
      showModal,
      isViewMode,
      workingCs,
      immSelectedAttribute,
      selectedAttributeName
    } = this.state;
    const headerContent = this._getTableHeader();
    const newImmStore = TaskManagementStore.getStore();
    const isEnabledSaveButton = newImmStore.get('isEnabledSaveButton');
    const saveOrUpdateButton = (
      <Button
        children={FrontendConstants.SAVE}
        isPrimary={true}
        onClick={this._saveTaskMetadata}
        isDisabled={!isEnabledSaveButton}
        classes="title-save-button"
      />
    );
    if (!this._isReady()) {
      content = <ContentPlaceholder/>;
    } else {
      content = this._getConfiguredDispositionContent();
    }
    const addClinicalAttributeModalProps = {
      clinicalAttributes: clinicalAttributes,
      immComprehendSchemas: this.props.immAdminStore.get('comprehendSchemas'),
      addNewClinicalAttribute: this.addNewClinicalAttribute,
      leftPanelWidth: leftPanelWidth,
      isViewMode: isViewMode,
      getWorkingComprehendSchema: this.getWorkingComprehendSchema,
      closeClinicalAttributeModal: this.closeClinicalAttributeModal,
      addClinicalAtrributes: this.addClinicalAtrributes,
      workingCs: workingCs,
      immSelectedAttribute: immSelectedAttribute,
      selectedAttributeName: selectedAttributeName
    }
    return (
      <div className={cx('admin-tab', 'task-management-container')}>
        <div className='tab-title'>
          <span>
            {FrontendConstants.TASK_CONFIGURATION}
          </span>
          <span className='page-header-right-part'>
            {this._getAddMenuContent()}
            {saveOrUpdateButton}
          </span>
        </div>

        <div className='config-content'>
          <table className="parallel-scroll">
            <thead>{headerContent}</thead>
          </table>
          {content}
          {
            showModal &&
            <AddClinicalAttributeModal {...addClinicalAttributeModalProps}
                                       ref={clinicalAttributeModal => this.clinicalAttributeModalRef = clinicalAttributeModal}></AddClinicalAttributeModal>
          }
        </div>
      </div>
    )
  }
});

module.exports = withTransitionHelper(TaskManagementView);
