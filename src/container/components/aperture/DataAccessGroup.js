import React from 'react';
import createReactClass from 'create-react-class';
import $ from 'jquery';
import _ from 'underscore';
import cx from 'classnames';
import FixedDataTable from 'fixed-data-table';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

import Button from '../Button';
import Combobox from '../Combobox';
import InputBlockContainer from '../InputBlockContainer';
import InputWithPlaceholder from '../InputWithPlaceholder';
import SimpleAction from '../SimpleAction';
import BaseListViewMixin from '../exposure/BaseListViewMixin';
import PaginationWidget from '../exposure/PaginationWidget';
import AdminActions from '../../actions/AdminActions';
import FrontendConstants from '../../constants/FrontendConstants';
import ListViewConstants from '../../constants/ListViewConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import Util from '../../util/util';
import ContentPlaceholder from '../ContentPlaceholder';

const Table = React.createFactory(FixedDataTable.Table);

const domDiv = DOM.div;

const DataAccessGroup = createReactClass({
  displayName: 'DataAccessGroup',

  propTypes: {
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.objectOf(PropTypes.string)
  },

  contextTypes: {
    router: PropTypes.object
  },

  mixins: [BaseListViewMixin],

  immDisplayedColumns: Imm.OrderedMap({
    studyId: true,
    studyName: true
  }),

  getInitialState() {
    return {
      dataAccessGroupName: '',
      immStudyIds: Imm.List(),
      immCheckedStudyIds: Imm.List(),
      curPage: 1,
      rowsPerPage: ListViewConstants.DEFAULT_ROWS_PER_PAGE,
      dataAccessGroupNameErrorMessage: null,
      isEditable: false,
      isAllAccessProfile: false
    };
  },

  componentDidMount() {
    const {dataAccessGroupId} = this.props.params;
    if (dataAccessGroupId) {
      AdminActions.loadDataAccessGroup(dataAccessGroupId);
    }
    else {
      this.setState({isEditable: true});
    }
    AdminActions.loadAllStudies();
  },

  componentWillReceiveProps(nextProps) {
    const nextAdminStore = nextProps.immAdminStore;
    const {dataAccessGroupId} = nextProps.params;
    if (dataAccessGroupId) {
      const dataAccessGroup = nextAdminStore.getIn(['dataAccessGroups', dataAccessGroupId]);
      const isAllAccessProfile = dataAccessGroupId === '00000000-0000-0000-0000-000000000000';
      const isEditable = !isAllAccessProfile;
      if (dataAccessGroup) {
        const studyIds = !this.state.immStudyIds.isEmpty()
          ? this.state.immStudyIds
          : this.sortImmStudyIds(dataAccessGroup.get('studyIds'), nextAdminStore.get('studies'), nextAdminStore);
        this.handleResize();
        this.setState({
          dataAccessGroupName: dataAccessGroup.get('dataAccessProfileName'),
          immStudyIds: studyIds,
          isEditable: isEditable,
          isAllAccessProfile: isAllAccessProfile
        });
      }
    }
  },

  sortImmStudyIds(immStudyIds, immStudies, adminStore) {
    if (!this.studiesReady(adminStore)) return immStudyIds;

    return immStudyIds.sortBy(
      (id) => {
        return immStudies.get(id);
      },
      (immStudy1, immStudy2) => {
        const studyName1 = immStudy1.get('value').toLowerCase();
        const studyName2 = immStudy2.get('value').toLowerCase();
        return Util.strcmp(studyName1, studyName2);
      }
    );
  },

  saveDataAccessGroupCompleted(success) {
    if (success) {
      this.context.router.push(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS);
    }
  },

  canSave: function() {
    const {dataAccessGroupName, immStudyIds} = this.state;
    return (
      Util.isWhiteSpaceOnly(dataAccessGroupName) || immStudyIds.isEmpty()
    );
  },

  handleSubmit: function (isNew) {
    const {dataAccessGroupName, immStudyIds} = this.state;
    const {immAdminStore } = this.props;
    const immStudyList = immAdminStore.get('studies', Imm.Map());
    const studyNames = immStudyIds.map((studyId) => immStudyList.get(studyId).get('value')).toJS();
    const dataAccessGroupNameEmpty = Util.isWhiteSpaceOnly(dataAccessGroupName);

    if (dataAccessGroupNameEmpty) {
      this.setState({
        dataAccessGroupNameErrorMessage: FrontendConstants.DATA_ACCESS_GROUP_NAME_IS_REQUIRED
      });
      return;
    }
    if (immStudyIds.isEmpty()) {
      this.setState({
        dataAccessGroupStudiesErrorMessage: FrontendConstants.DATA_ACCESS_GROUP_STUDIES_IS_REQUIRED
      });
      return;
    }

    const dataAccessGroup = {
      dataAccessProfileName: dataAccessGroupName,
      studyIds: immStudyIds.toJS(),
      studyNames: studyNames
    };

    if (isNew) {
      AdminActions.addDataAccessGroup(
        dataAccessGroup,
        this.saveDataAccessGroupCompleted.bind(this)
      );
    }
    else {
      AdminActions.updateDataAccessGroup(
        this.props.params.dataAccessGroupId,
        dataAccessGroup,
        this.saveDataAccessGroupCompleted.bind(this)
      );
    }
  },

  handleDataAccessGroupNameInputChange(e) {
    this.setState({
      dataAccessGroupName: e.target.value,
      dataAccessGroupNameErrorMessage: ''
    });
  },

  handleSelectStudyDropdown(studyId) {
    if (!this.state.immStudyIds.contains(studyId)) {
      const updatedStudiesList = this.state.immStudyIds.push(studyId);
      const immSortedStudies = this.sortImmStudyIds(updatedStudiesList, this.props.immAdminStore.get('studies'), this.props.immAdminStore);
      this.setState({
        immStudyIds: immSortedStudies
      });
    }
    this.setState({
      dataAccessGroupStudiesErrorMessage: ''
    });
  },

  handleRemove() {
    this.setState({
      immStudyIds: this.state.immStudyIds.filterNot(function (id) {
        return this.state.immCheckedStudyIds.contains(id);
      }, this),
      immCheckedStudyIds: Imm.List()
    });
  },

  studiesReady(adminStore) {
    return (
      adminStore.get('studies') &&
      !adminStore.get('studies').isEmpty() &&
      !this.state.immStudyIds.isEmpty()
    );
  },

  studyOptionFilter(option, filter) {
    if (_.isEmpty(filter)) {
      return true;
    }

    const lowerCaseFilter = filter.toLowerCase();
    const {studyName} = option;

    return studyName && studyName.toLowerCase().indexOf(lowerCaseFilter) !== -1;
  },

  studyOptionRenderer(option) {
    return (
      <div className={cx('group-user-dropdown-entry', {disabled: option.disabled})}>
        <span className='data-access-group-dropdown-study-name'>
          {option.studyName}
        </span>
      </div>
    );
  },

  getStudiesDropdown() {
    const immStudies = this.props.immAdminStore.get('studies');
    const dropdownItems = immStudies
      ? immStudies.map((immStudy, studyId) => {
        return {
          studyName: immStudy.get('value'),
          studyId: studyId,
          disabled: this.state.immStudyIds.contains(studyId)
        };
      }, this).toList()
      : Imm.List();

    return (
      <Combobox
        className={cx('group-users-dropdown', {'invalid-input': this.state.dataAccessGroupStudiesErrorMessage})}
        placeHolder={FrontendConstants.ADD_A_STUDY}
        value=''
        valueKey='studyId'
        labelKey='text'
        onChange={this.handleSelectStudyDropdown}
        options={dropdownItems}
        filterOption={this.studyOptionFilter}
        optionRenderer={this.studyOptionRenderer}
        disabled={!this.state.isEditable}
      />
    );
  },

  getStudiesTable() {
    const studyIdsSize = this.state.immStudyIds
      .skip(this.state.rowsPerPage * (this.state.curPage - 1))
      .take(this.state.rowsPerPage)
      .size;
    return domDiv(
      {className: 'group-users-table'},
      Table.apply(null, this.constructTableArgs(
        Math.min(studyIdsSize, this.state.rowsPerPage),
        this.immDisplayedColumns,
        Imm.List(),
        null,
        Imm.Map(),
        this.specialCellRenderer,
        this.getColumnWidths,
        false,
        true
      )));
  },

  getPaginationWidget() {
    const rowsPerPageOptions = _.range(1, ListViewConstants.PAGE_SIZE_DROPDOWN_ROWS).map(function (index) {
      return {rowsPerPage: index * ListViewConstants.DEFAULT_ROWS_PER_PAGE};
    });
    return (
      <PaginationWidget
        curPage={this.state.curPage}
        pageChangeHandler={
          function (pageNum) {
            this.setState({
              curPage: pageNum
            });
          }.bind(this)
        }
        rowsPerPage={this.state.rowsPerPage}
        rowsPerPageChangeHandler={
          function (rowsPerPage) {
            this.setState({
              curPage: 1,
              rowsPerPage: rowsPerPage
            });
          }.bind(this)
        }
        rowsPerPageDenom={ListViewConstants.DEFAULT_ROWS_PER_PAGE}
        rowsPerPageOptions={rowsPerPageOptions}
        totalRows={this.state.immStudyIds.size}
      />);
  },

  itemAccessor(immData, rowIndex) {
    return immData.get(rowIndex);
  },

  getHandleOpenAction(id) {
    return [RouteNameConstants.APERTURE_USERS_SHOW, {userId: id}];
  },

  createHeaderContentHandler(colName) {
    return this.columnNameMap[colName];
  },

  setCheckedStudies(rowIndex, isChecked) {
    const rowIndexWithOffset = this.state.rowsPerPage * (this.state.curPage - 1) + rowIndex;
    const immCheckedStudies = isChecked ?
      this.state.immCheckedStudyIds.push(this.state.immStudyIds.get(rowIndexWithOffset)) :
      this.state.immCheckedStudyIds.filterNot(function (id) {
        return id === this.state.immCheckedStudyIds.get(rowIndexWithOffset);
      }, this);
    this.setState({immCheckedStudyIds: immCheckedStudies});
  },

  getRowsThisPage() {
    const {immAdminStore} = this.props;
    const {rowsPerPage, immStudyIds, curPage} = this.state;
    const startIndex = rowsPerPage * (curPage - 1);
    const immStudyIdsThisPage = immStudyIds.skip(startIndex).take(rowsPerPage);

    const immStudiesThisPage = immStudyIdsThisPage.map((studyId) => {
      const studyName = immAdminStore.getIn(['studies', studyId, 'value']);

      return Imm.fromJS({studyName: studyName, studyId: studyId});
    });

    return {immStudyIdsThisPage, immStudiesThisPage};
  },

  specialCellRenderer(indexColNameMap, checkedState, cellDataKey, rowData, rowIndex) {
    const {immCheckedStudyIds} = this.state;
    const {immStudyIdsThisPage, immStudiesThisPage} = this.getRowsThisPage();

    return this._specialCellRenderer(
      indexColNameMap,
      this.props.immAdminStore,
      immStudyIdsThisPage,
      immCheckedStudyIds,
      immStudiesThisPage,
      this.itemAccessor,
      this.setCheckedStudies,
      _.noop,
      this.getHandleOpenAction,
      _.noop,
      cellDataKey,
      rowIndex
    );
  },

  getColumnWidths() {
    const {immAdminStore} = this.props;
    const {immStudiesThisPage} = this.getRowsThisPage();

    const colWidths = BaseListViewMixin._getColumnWidths(
      this.immDisplayedColumns,
      immStudiesThisPage,
      immAdminStore);

    return colWidths;
  },

  isReady() {
    const {immAdminStore} = this.props;
    const dataAccessGroupId = this.props.params.dataAccessGroupId;

    const hasGroupInfoIfNeeded = dataAccessGroupId
      ? immAdminStore.getIn(['dataAccessGroups', dataAccessGroupId])
      : true;
    const studies = immAdminStore.get('studies', Imm.List());
    const hasStudyInfo = (studies && !studies.isEmpty());

    return hasGroupInfoIfNeeded && hasStudyInfo;
  },

  render() {
    if (!this.isReady()) {
      return (
        <div className={cx('admin-tab', 'user-management-tab', 'user-management-single-group')}
             style={{height: this.props.height, width: this.props.width}}>
          <ContentPlaceholder/>
        </div>
      );
    }

    const {immAdminStore} = this.props;
    const {isEditable} = this.state;

    const dataAccessGroupNameInput = <InputBlockContainer
      title={FrontendConstants.DATA_ACCESS_NAME}
      titleClass='required'
      inputComponent={
        <InputWithPlaceholder
          type='text'
          className={cx('text-input', 'name-input', {'invalid-input': this.state.dataAccessGroupNameErrorMessage})}
          onChange={this.handleDataAccessGroupNameInputChange}
          value={this.state.dataAccessGroupName}
          maxLength={100}
          disabled={!isEditable}
        />}
    />;

    const studiesReady = this.studiesReady(immAdminStore);
    const studiesDropDown = this.getStudiesDropdown();
    const deleteButton = <SimpleAction class='icon-remove' onClick={this.handleRemove}/>;
    const studiesTable = studiesReady ? this.getStudiesTable() : null;
    const paginationWidget = studiesReady ? this.getPaginationWidget() : null;

    const submitButton = this.props.params.dataAccessGroupId
      ? ( isEditable
        ? <Button
            icon='icon-loop2'
            children={FrontendConstants.UPDATE}
            isPrimary={true}
            isDisabled={this.canSave()}
            onClick={this.handleSubmit.bind(null, false)}
          />
        : '' )
      : <Button
        icon='icon-plus-circle2'
        children={FrontendConstants.ADD_THIS_DATA_ACCESS_GROUP}
        isPrimary={true}
        isDisabled={this.canSave()}
        onClick={this.handleSubmit.bind(null, true)}
      />;

    const cancelButton = <Button
      icon='icon-close'
      children={FrontendConstants.CANCEL}
      isSecondary={true}
      onClick={() => this.context.router.push(RouteNameConstants.APERTURE_DATA_ACCESS_GROUPS)}
    />;

    return (
      <div className={cx('admin-tab', 'user-management-tab', 'user-management-single-group')}
           style={{height: this.props.height, width: this.props.width}}>
        <div className='page-header'>
          <div className='title'>
            {this.props.params.dataAccessGroupId
              ? FrontendConstants.EDIT_DATA_ACCESS_GROUP
              : FrontendConstants.ADD_A_DATA_ACCESS_GROUP
            }
          </div>
        </div>
        <div className='section-header'>
          <div className='title'>
            {FrontendConstants.DETAILS}
          </div>
        </div>
        <div className='edit-group-inputs'>
          {dataAccessGroupNameInput}
        </div>
        {this.state.dataAccessGroupNameErrorMessage
          ? (
            <span className={cx('name-error-message', 'text-input-error-explanation')}>
              {this.state.dataAccessGroupNameErrorMessage}
            </span>
          )
          : null
        }
        <div className='section-header'>
          <div className='title'>
            {FrontendConstants.STUDIES}
          </div>
        </div>
        <div className='edit-group-users-dropdown-header'>
          {FrontendConstants.ADD_STUDIES_TO_THIS_DATA_ACCESS_GROUP}
        </div>
        <div className='edit-group-users-dropdown'>
          {studiesDropDown}
        </div>
        {this.state.dataAccessGroupStudiesErrorMessage
          ? (
            <span className={cx('name-error-message', 'text-input-error-explanation')}>
              {this.state.dataAccessGroupStudiesErrorMessage}
            </span>
          )
          : null
        }
        <div className='edit-group-users-table-header'>
          <span className='total-studies'>
            {FrontendConstants.STUDIES_IN_THIS_DATA_ACCESS_GROUP(this.state.immStudyIds.size, this.state.isAllAccessProfile)}
          </span>
          {this.state.immStudyIds.isEmpty()
            ? null
            : deleteButton
          }
        </div>
        {studiesTable}
        {paginationWidget}
        {submitButton}
        {cancelButton}
      </div>
    );
  }
});

module.exports = DataAccessGroup;
