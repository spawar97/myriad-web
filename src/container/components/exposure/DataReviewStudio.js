import React from 'react';
import createReactClass from 'create-react-class';
import Imm from 'immutable';
import StudioMixin from '../StudioMixin';
import PropTypes from 'prop-types';

import ExposureActions from '../../actions/ExposureActions';
import Key from '../../stores/constants/ExposureStoreKeys';
import FrontendConstants from '../../constants/FrontendConstants';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import ImmEmptyFile from '../../util/ImmEmptyFile';

import DataReviewStore from '../../stores/DataReviewStore';

import {TouchDiv as div} from '../TouchComponents';
import Button from '../Button';

import FixedDataTable from 'fixed-data-table';
// These classes are dependent on the FixedDataTable class.
const Column = React.createFactory(FixedDataTable.Column);
const Table = React.createFactory(FixedDataTable.Table);
const FixedDataTableHeader = React.createFactory(require('../FixedDataTableHeader'));
const Checkbox = React.createFactory(require('../Checkbox'));

import InputWithPlaceHolder from '../InputWithPlaceholder';
import Combobox from '../Combobox';

import {studioUtils} from '../../util/StudioUtils';
import DataReviewUtil from '../../util/DataReviewUtil';
import Util from '../../util/util';

import GA from '../../util/GoogleAnalytics';
import RouteNameConstants from '../../constants/RouteNameConstants';
import StudioPreview from '../StudioPreview';
import { withTransitionHelper } from '../RouterTransitionHelper';
import ContentPlaceholder from '../ContentPlaceholder';
import DataReviewActions from "../../actions/DataReviewActions";


/**
 * This component is used to create Data Review Sets.
 */

let DataReviewStudio = createReactClass({
  displayName: 'DataReviewStudio',
  mixins: [StudioMixin],

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  /**
   * Sets the initial state of the component. Will set the default values for all info
   * (the current data review, the base data review, the title, etc)
   */
  getInitialState: function() {
    let immExposureStore = this.props.immExposureStore;

    // The working data review is already loaded into the store via /api/files/, so grab it from the fileWrapper object
    let immDataReview = immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());

    const immInitialDataReviewRoles = immExposureStore.get(Key.dataReviewRoles, Imm.List());

    // The first time this data review is loaded by the client the associated reportIds are NOT loaded. We need to
    // Use the join table later to fetch the fileIds associated with this review,
    // and use those IDs to get them from the store
    let immReportIds = this.props.params.fileId ? immDataReview.get('reportIds') : Imm.List();
    let immCheckedFiles = studioUtils.createImmCheckedFiles(immReportIds, this.props.immExposureStore);

    let immInitialDataReview = Imm.Map({
      title: immDataReview.get('title'),
      checkedFiles: immCheckedFiles
    });
    let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
    let immComprehendSchema = this.getComprehendSchema(comprehendSchemaId);

    return {
      immBaseDataReview: immInitialDataReview,
      immDataReviewStore: DataReviewStore.getStore(),
      immWorkingDataReview: immInitialDataReview,
      immWorkingUnusedDataReviewRoles: immInitialDataReviewRoles,
      immWorkingDataReviewRoles: Imm.List(),
      immCurrentFile: immDataReview,
      title: immDataReview.get('title'),
      immWorkingCs: immComprehendSchema,
      comprehendSchemaId: comprehendSchemaId,
      isReportLoaded: false,
      isSaving: false,
      isReportListLoaded: false,
      isRoleListLoaded: false,
      isReviewRoles: false,
      // for StudioMixin
      leftPanelWidth: null,
      rightPanelWidth: null,
    };
  },

  componentDidMount: function() {
    let ctx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    this.FILTER_TYPE_WIDTH = Math.ceil(Util.getTextWidth(ctx, FrontendConstants.FILTER_TYPE + ':'));

    // This is actually the handleResize from StudioMixin
    window.addEventListener('resize', this.handleResize);
    this.handleResize();

    if (_.isNull(this.props.immExposureStore.get('comprehendSchemas'))) {
      ExposureActions.fetchComprehendSchemas();
    }

    ExposureActions.fetchDataReviewRoles(this.props.params.fileId, this._onRolesFetchCompletion);
    ExposureActions.fetchFileConfigsForDataReview(this._onFetchCompletion);
    // Let the app know that we don't need session filters
    ExposureActions.transitionLinkedReportsStudio(this.props.params.fileId, true);
    DataReviewStore.addChangeListener(this.onDataReviewStoreChange);
    DataReviewActions.fetchRolesUsageForReport(this.props.params.fileId);
  },

  _onRolesFetchCompletion: function() {
    this.setState({ isRoleListLoaded: true });
  },

  _onFetchCompletion: function() {
    this.setState({ isReportListLoaded: true });
  },

  componentWillUpdate: function() {
    if (!this.state.isReportLoaded && !this.state.immWorkingDataReview.get('checkedFiles').isEmpty()) {
      const immData = this.state.immWorkingDataReview.get('checkedFiles');
      immData.map(function(immReport) {
        ExposureActions.fetchFile(immReport.get('id'), null, {fetchData: true});
      });
      this.setState({isReportLoaded: true});
    }
  },

  /**
   * When the component receives a new set of props / state, let's check if we need to update anything
   * @param nextProps
   * @param nextState
   * @returns {boolean}
   */
  shouldComponentUpdate: function(nextProps, nextState) {
    const isLoading = this.props.immExposureStore.get('isLoadingFile')
                        !== nextProps.immExposureStore.get('isLoadingFile');
    return isLoading ||
      this.props.params.fileId !== nextProps.params.fileId ||
      this.state !== nextState ||
      !Imm.is(this.props.immExposureStore.get('files'), nextProps.immExposureStore.get('files')) ||
      !Imm.is(this.props.immExposureStore.get('fileConfigs'), nextProps.immExposureStore.get('fileConfigs')) ||
      !Imm.is(this.props.immExposureStore.get(Key.dataReviewRoles), nextProps.immExposureStore.get(Key.dataReviewRoles));
  },

  componentWillReceiveProps: function(nextProps) {
    const dataReviewRoles = nextProps.immExposureStore.get(Key.dataReviewRoles, Imm.List());
    const immWorkingUnusedDataReviewRoles = dataReviewRoles.filter(role => !role.get('isAssigned'));
    const immWorkingDataReviewRoles = dataReviewRoles.filter(role => role.get('isAssigned'));
    if ((this.state.immWorkingUnusedDataReviewRoles.size + this.state.immWorkingDataReviewRoles.size) != dataReviewRoles.size
        || (!this.state.isReviewRoles && this.state.isRoleListLoaded)) {
      this.setState({
        immWorkingUnusedDataReviewRoles: immWorkingUnusedDataReviewRoles,
        immWorkingDataReviewRoles: immWorkingDataReviewRoles,
        isReviewRoles: true
      });
    }

    if (!nextProps.params.fileId) {
      return;
    }
    var stateDataReview = {};
    var immCurrentFile = this.props.immExposureStore.getIn(
      ['files', this.props.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    var immNextFile = nextProps.immExposureStore.getIn(
      ['files', nextProps.params.fileId, 'fileWrapper', 'file'], Imm.Map());
    // Handle the case where the data review file has loaded after `ExposureStore.fetchFile`.
    if (immCurrentFile.get('title') !== immNextFile.get('title')) {
      stateDataReview.title = immNextFile.get('title');
    }
    // Handle the case where the data review's reports have loaded after `ExposureStore.fetchFileConfigs`.
    // The check below is required so that the checked files are only reloaded on the initial file load.
    if (!Imm.is(immCurrentFile.get('reportIds'), immNextFile.get('reportIds'))) {
      let immCheckedFiles =  studioUtils.createImmCheckedFiles(immNextFile.get('reportIds'), nextProps.immExposureStore);
      let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
      stateDataReview.checkedFiles = immCheckedFiles;
      stateDataReview.comprehendSchemaId = comprehendSchemaId;
      stateDataReview.immWorkingCs = this.getComprehendSchema(comprehendSchemaId);
    }
    if (!_.isEmpty(stateDataReview)) {
      this.setState({
        immBaseDataReview: this.state.immBaseDataReview.merge(stateDataReview),
        immWorkingDataReview: this.state.immWorkingDataReview.merge(stateDataReview),
      });
    }
  },

  componentWillUnmount: function() {
    window.removeEventListener('resize', this.handleResize);
    ExposureActions.deleteFileStates(this.getImmWorkingFileIds().toJS());
    ExposureActions.transitionLinkedReportsStudio(null, false);
    DataReviewStore.removeChangeListener(this.onDataReviewStoreChange);
  },

  onChangeFileTitle: function(e) {
    this.setState({immWorkingDataReview: this.state.immWorkingDataReview.set('title', e.target.value)});
  },

  cannotSave: function() {
    return (
      _.isEmpty(this.state.immWorkingDataReview.get('title'))
        || (this.state.immWorkingDataReview.get('checkedFiles')
            && this.state.immWorkingDataReview.get('checkedFiles').isEmpty())
        || this.state.immWorkingDataReviewRoles.isEmpty()
    );
  },

  saveLoading: function() {
    return this.state.isSaving;
  },

  save: function() {
    this.setState({isSaving: true});

    let comprehendSchemaId = this.state.immComprehendSchema ? this.state.immComprehendSchema.toJS().id : '';
    let newFields = {
      comprehendSchemaId: comprehendSchemaId,
      reportIds: this.getImmWorkingFileIds().toJS(),
      title: this.state.immWorkingDataReview.get('title'),
      advancedFileAttributes: { dataReviewRoles: this.state.immWorkingDataReviewRoles.toJS() }
    };

    // If we have a file ID we're in Edit mode
    if (this.props.params.fileId) {
      let immExposureStore = this.props.immExposureStore;
      let immOriginalDataReview = immExposureStore.getIn(['files', this.props.params.fileId, 'fileWrapper', 'file']);
      let immNewDataReview = immOriginalDataReview.merge(newFields);

      // If the data review is saved to the top level folder,
      // then remove anything from the 'folderId' key prior to saving
      if(immNewDataReview.get('folderId') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immNewDataReview = immNewDataReview.delete('folderId');
      }
      let dataReviewId = immNewDataReview.get('id');
      _.each(GA.GAHelper.extractEditOperations(immOriginalDataReview.toJS(), immNewDataReview.toJS()),
        (editOperation) => {
          GA.sendDocumentEdit(dataReviewId, GA.DOCUMENT_TYPE.DATA_REVIEW, editOperation);
        });
      ExposureActions.reportCreationViewUpdateReport(this.props.params.fileId,
        immNewDataReview, this.saveSucceeded.bind(this));
    }

    // Otherwise this is creating a new Med Review Set
    else {
      // Since this is a new Med Review set, we'll need to create an empty file, merge the working file into it, and
      // send it to the backend to save it
      let immFile = ImmEmptyFile(ExposureAppConstants.FILE_TYPE_DATA_REVIEW).merge(newFields);
      let folderId = this.props.immExposureStore.getIn(['folderView', 'folderId']);
      if (folderId !== ExposureAppConstants.REPORTS_LANDING_PAGE_ID) {
        immFile = immFile.set('folderId', folderId);
      }
      // Log the creation event to GA
      GA.sendDocumentCreate(GA.DOCUMENT_TYPE.DATA_REVIEW);
      ExposureActions.reportCreationViewCreateReport(immFile, this.saveSucceeded);
    }
  },

  handleDataReviewErrorMessages(jqXHR) {
    _.mapObject(jqXHR.responseJSON.info, (reportError, reportName) => {
      const reportErrorMessage = `${reportName}: ${reportError}`;
      ExposureActions.createStatusMessage(reportErrorMessage, StatusMessageTypeConstants.TOAST_ERROR);
    });
    ExposureActions.createStatusMessage(FrontendConstants.ERROR_SAVING_DATA_REVIEW_SET,
      StatusMessageTypeConstants.TOAST_ERROR);
  },

  saveSucceeded: function(result) {
    if (result.hasOwnProperty('id') && result.id!='') {
      var skipDirtyCheck = result;
      if (skipDirtyCheck) {
        this.skipDirtyCheck = true;
      }
      // If we have a file ID this is an update
      const successMessage = this.props.params.fileId
        ? FrontendConstants.DATA_REVIEW_SET_UPDATED_SUCCESSFULLY
        : FrontendConstants.DATA_REVIEW_SET_SAVED_SUCCESSFULLY;
       ExposureActions.createStatusMessage(successMessage, StatusMessageTypeConstants.TOAST_SUCCESS);
      this.context.router.push({name: RouteNameConstants.EXPOSURE_FOLDERS});
    } else {
      this.handleDataReviewErrorMessages(result);
      
      this.setState({isSaving: false});  
    }
  },

  handleUp: function() {
    const selectedIndex = this.state.immWorkingDataReview.get('checkedFiles').findIndex(
        function(immFile) { return immFile.get('checked'); }
      );
    const immCheckedFiles = this.state.immWorkingDataReview.get('checkedFiles');
    if (selectedIndex > 0) {
      const immNewCheckedFiles = immCheckedFiles.splice(selectedIndex - 1, 2,
        immCheckedFiles.get(selectedIndex), immCheckedFiles.get(selectedIndex - 1));
      this.updateComprehendSchema(this.state.immWorkingDataReview.set('checkedFiles', immNewCheckedFiles));
    }
  },

  handleDown: function() {
    const selectedIndex = this.state.immWorkingDataReview.get('checkedFiles').findIndex(
        function(immFile) { return immFile.get('checked'); }
      );
    const immCheckedFiles = this.state.immWorkingDataReview.get('checkedFiles');
    if (selectedIndex > -1 && selectedIndex < immCheckedFiles.size - 1) {
      const immNewCheckedFiles = immCheckedFiles.splice(selectedIndex, 2,
        immCheckedFiles.get(selectedIndex + 1), immCheckedFiles.get(selectedIndex));
      this.updateComprehendSchema(this.state.immWorkingDataReview.set('checkedFiles', immNewCheckedFiles));
    }
  },

  handleSelectReport: function(report) {
    const immNewCheckedFiles = this.state.immWorkingDataReview.get('checkedFiles', Imm.List()).push(
      Imm.Map({id: report.id, title: report.text, checked: false, comprehendSchemaId: report.comprehendSchemaId}));
    this.updateComprehendSchema(this.state.immWorkingDataReview.set('checkedFiles', immNewCheckedFiles));
    ExposureActions.fetchFile(report.id, null, {fetchData: true});
    this.setState({isReportLoaded: true});
  },

  getComprehendSchema: function(comprehendSchemaId) {
    var immSchema = this.props.immExposureStore.getIn(['comprehendSchemas', comprehendSchemaId]);
    return _.isUndefined(immSchema) ? null : this.getWorkingCs(immSchema);
  },

  // Note - isDirty is used by withTransitionHelper to check if the DOM is in a dirty state (is loading basically)
  isDirty() {
    if (this.skipDirtyCheck) {
      return false;
    }
    else {
      return !this.props.immExposureStore.get('isLoadingFile')
        && !Imm.is(this.state.immBaseDataReview, this.state.immWorkingDataReview);
    }
  },

  updateComprehendSchema: function(immWorkingDataReview) {
    let immCheckedFiles = immWorkingDataReview.get('checkedFiles', Imm.List());
    let comprehendSchemaId = studioUtils.getCommonComprehendSchemaId(immCheckedFiles);
    this.setState({
      immWorkingDataReview: immWorkingDataReview,
      comprehendSchemaId: comprehendSchemaId,
      immWorkingCs: this.getComprehendSchema(comprehendSchemaId)
    });

    if (immCheckedFiles.isEmpty() || _.isNull(comprehendSchemaId)) {
      let immCurrentFile = this.state.immCurrentFile.set('appliedFilters', Imm.List());
      this.setState({immCurrentFile: immCurrentFile});
    }
  },

  onClickCheckbox: function(rowIndex) {
    var immNewCheckedFiles = this.state.immWorkingDataReview.get('checkedFiles').map(function(immFile, idx) {
      return immFile.set('checked', idx === rowIndex && !immFile.get('checked'));
    });
    this.updateComprehendSchema(this.state.immWorkingDataReview.set('checkedFiles', immNewCheckedFiles));
  },

  onClickRemove: function(rowIndex) {
    var immNewCheckedFiles = this.state.immWorkingDataReview.get('checkedFiles').delete(rowIndex);
    ExposureActions.deleteFileStates(immNewCheckedFiles.map(function(immFile) { return immFile.get('id'); }).toJS());
    immNewCheckedFiles.map(function(immReport) {
      ExposureActions.fetchFile(immReport.get('id'), null, {fetchData: true});
    });
    this.updateComprehendSchema(this.state.immWorkingDataReview.set('checkedFiles', immNewCheckedFiles));
  },

  checkboxCellRenderer: function(cellData, cellDataKey, rowData, rowIndex) {
    return (
      <div className='input-checkbox'>
        {Checkbox({
          dimmed: false,
          checkedState: cellData,
          onClick: this.onClickCheckbox.bind(null, rowIndex)
        })}
      </div>
    );
  },

  removeCellRenderer: function(cellData, cellDataKey, rowData, rowIndex) {
    return <span className='icon-remove' onClick={this.onClickRemove.bind(null, rowIndex)} />;
  },

  createReportTable: function(immData) {  // data -> [{id: reportId, title: reportTitle, checked: checked}]
    const widestFont = Util.getWidestFont();
    const ctx = Util.get2dCanvasContext('16px ' + widestFont);
    const immWidths = immData.map(function(immReport) {
      return ctx.measureText(immReport.get('title')).width;
    });
    // default is half of component size
    const tableWidth = this.state.leftPanelWidth || (this._studioDivRef.offsetWidth / 2);
    // 120px is checkbox cell width + remove cell width.
    const maxWidth = Math.max(immWidths.max() || 0, tableWidth - 120);
    const tArgs = [
      {
        // Arbitrarily large maxHeight, see BaseListViewMixin.js for more information
        maxHeight: 4000,
        headerHeight: 50,
        width: tableWidth,
        rowHeight: 30,
        rowsCount: immData.size,
        // TODO: This prevents scroll events from being eaten by the table.
        //  This will hopefully be fixed in a future version of FDT and then we can remove this.
        overflowX: 'hidden',
        overflowY: 'hidden',
        rowGetter: function(index) { return immData.get(index).toJS(); }
      },
      Column({
        label: 'checkbox',
        width: 60,
        dataKey: 'checked',
        headerRenderer: function() {
          return FixedDataTableHeader({
            contents: Checkbox({
              dimmed: false,
              checkedState: immData.some(function(immDatum) { return immDatum.get('checked'); }),
              onClick: _.noop
            })
          });
        },
        cellRenderer: this.checkboxCellRenderer
      }),
      Column({
        dataKey: 'title',
        headerRenderer: function() { return FixedDataTableHeader({contents: FrontendConstants.TABULAR_REPORT}); },
        minWidth: maxWidth,
        width: maxWidth
      }),
      Column({
        label: 'remove',
        width: 60,
        dataKey: 'remove',
        headerRenderer: function() {
          return FixedDataTableHeader({contents: <span className='icon-remove' />});
        },
        cellRenderer: this.removeCellRenderer
      })
    ];

    return Table.apply(null, tArgs);
  },

  getImmWorkingFileIds: function() {
    return this.state.immWorkingDataReview.get('checkedFiles', Imm.Set()).map(
      function(immCheckedFile) { return immCheckedFile.get('id'); });
  },

  isReady() {
    return this.state.isReportListLoaded && this.state.isRoleListLoaded;
  },

  handleSelectRoles(value) {
    const baseDataReviewRoles = this.state.immWorkingUnusedDataReviewRoles.concat(this.state.immWorkingDataReviewRoles);
    const newList = baseDataReviewRoles.filter(item => value.includes(item.get('id')));
    const newUnusedList = baseDataReviewRoles.filter(item => !value.includes(item.get('id')));

    this.setState({
      immWorkingDataReviewRoles: newList,
      immWorkingUnusedDataReviewRoles: newUnusedList,
    });
  },

  getContent() {
    const comboboxOptions = DataReviewUtil.mapFileConfigsToComboboxOptions(
      this.props.immExposureStore.get(Key.fileConfigsForDataReview, Imm.List()));

    const immCheckedFileIds = this.getImmWorkingFileIds();
    let values = Imm.List();
    const rolesUsage = this.state.immDataReviewStore.get('reviewRolesUsageData');

    if (!_.isEmpty(rolesUsage)) {
      const usedRoleIds = rolesUsage.keySeq().map(roleId => {
        const usageObject = rolesUsage.get(roleId);
        if (usageObject.isOccupied) {
          return roleId;
        }
      }).toList();

      values = this.state.immWorkingDataReviewRoles.map(role => {
        if (usedRoleIds.includes(role.get('id'))) {
          return role.set('clearableValue', false);
        } else {
          return role
        }
      }).toList();
    } else {
      values =  this.state.immWorkingDataReviewRoles;
    }
    
    return (
      <div>
        <div className='studio-editor'>
          <div className='title'>{FrontendConstants.DATA_REVIEW_INFORMATION}</div>
          <div className='entry-text required'>{FrontendConstants.TITLE}</div>
          <InputWithPlaceHolder
            type='text'
            className='text-input'
            onChange={this.onChangeFileTitle}
            value={this.state.immWorkingDataReview.get('title')}
            ref='title'
            placeholder={FrontendConstants.TITLE_REQUIRED}
            maxLength={ExposureAppConstants.FILE_TITLE_MAX_LENGTH}
          />
          <div className='entry-text required'>{FrontendConstants.AVAILABLE_REVIEW_ROLES}</div>
          <Combobox
            className='data-review-role-selector-dropdown'
            placeholder={FrontendConstants.SELECT_ROLES}
            valueKey='id'
            labelKey='name'
            multi={true}
            value={values}
            onChange={this.handleSelectRoles}
            options={this.state.immWorkingUnusedDataReviewRoles}
          />
          <div className='title'>{FrontendConstants.TABULAR_REPORT}</div>
          <div className='entry-text'>{FrontendConstants.SELECT_TABULAR_REPORTS}</div>
          <Combobox
            className='data-review-report-selector-dropdown'
            placeholder={FrontendConstants.SELECT_REPORTS}
            value=''
            valueKey='id'
            labelKey='text'
            passOnlyValueToChangeHandler={false}
            onChange={this.handleSelectReport}
            options={comboboxOptions}
            />
          <div className='order-buttons'>
            <span
              className='icon-arrow-down'
              onClick={this.handleDown}
              />
            <span
              className='icon-arrow-up'
              onClick={this.handleUp}
              />
          </div>
          <div className='reports-table'>
            {this.createReportTable(this.state.immWorkingDataReview.get('checkedFiles', Imm.List()))}
          </div>
          <Button
            icon='icon-loop2'
            children={FrontendConstants.SAVE}
            isPrimary={true}
            isLoading={this.saveLoading()}
            isDisabled={this.cannotSave()}
            onClick={this.save}
            />
        </div>
        <StudioPreview
          immExposureStore={this.props.immExposureStore}
          title={FrontendConstants.DATA_REVIEW_PREVIEW}
          fileType={ExposureAppConstants.FILE_TYPE_DATA_REVIEW}
          reportIds={immCheckedFileIds.toJS()}
        />
      </div>
    );
  },
  onDataReviewStoreChange () {
    this.setState({immDataReviewStore: DataReviewStore.getStore()});
  },

  render() {

    let content;
    if (this.isReady()) {
      content = this.getContent();
    } else {
      content = (<ContentPlaceholder/>);
    }

    // If we have a file, we're in edit mode. Otherwise we're creating a new data review
    const title = this.props.params.fileId ? FrontendConstants.EDIT_DATA_REVIEW_SET : FrontendConstants.CREATE_DATA_REVIEW;

    return (
      <div className='studio' ref={studio => this._studioDivRef = studio}>
        <div className='page-header'>
          <div className='breadcrumbs'>
            {title}
          </div>
        </div>
        {content}
      </div>
    );
  },
});

module.exports = withTransitionHelper(DataReviewStudio);
