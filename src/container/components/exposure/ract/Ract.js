import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from "classnames";
import FrontendConstants from "../../../constants/FrontendConstants";
import Menu from "../../../lib/react-menu/components/Menu";
import MenuTrigger from "../../../lib/react-menu/components/MenuTrigger";
import MenuOptions from "../../../lib/react-menu/components/MenuOptions";
import MenuOption from "../../../lib/react-menu/components/MenuOption";
import _ from "underscore";
import ContentPlaceholder from "../../ContentPlaceholder";
import RactGridView from "./RactGridView";
import Combobox from "../../Combobox";
import RouteNameConstants from "../../../constants/RouteNameConstants";
import RactScorecardStore from "../../../stores/RactScorecardStore";
import RACTConstant, {
  Key as ConstantsKey,
  SortKeys,
  RactStoreKeys,
} from "../../../constants/RactConstant";
import ExposureStoreKey from "../../../stores/constants/ExposureStoreKeys";
import {Promise} from "es6-promise";
import RactConsoleUtil from "../../../util/RactConsoleUtil";
import PermissionsUtil from "../../../util/PermissionsUtil";
import {
  AccessPermissionsConstants,
  FeatureListConstants,
} from "../../../constants/PermissionsConstants";
import {TouchDiv} from '../../TouchComponents';
import Util from "../../../util/util";
import AssignRact from "./AssignRact";
import AddNewStudy from "./AddNewStudy";
import SimpleAction from "../../SimpleAction";
import RactFilters from "./RactFilters";
import { Link } from "react-router";

var GA = require('../../../util/GoogleAnalytics');

class RACT extends React.PureComponent {
  static displayName = 'RACT';

  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    location: PropTypes.object,
  };
  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    RactScorecardStore.resetStore();
    const immGroupOptions = this._formatOptions(RACTConstant.GROUP_OPTIONS);
    const immSortOptions = this._formatOptions(RACTConstant.SORT_OPTIONS);
    const selectedGroup = immGroupOptions.getIn([0, 'value']);
    const selectedSort = immSortOptions.getIn([0, 'value']);
    this.state = {
      finishedInitialLoad: false,
      displayAssignRactContainer: false,
      displayNewStudyContainer: false,
      showFilters: false,
      immRactScorecardStore: RactScorecardStore.getStore(),
      selectedSort: selectedSort,
      selectedGroup: selectedGroup,
      selectedStudies: [],
      immPresentationData: Imm.OrderedMap(
        {
          entityHeaders: Imm.Map(),
          entityRows: Imm.Map(),
          entityDetails: Imm.Map(),
        }),
      loadPresentationAfterStudyFetch: false,
      isRactConsoleDataLoaded: false,
      loadPresentationAfterMasterStudyChanged: false,
      assignedRact: false,
    };
    this.changeGroup = this._onChangeGroup.bind(this);
    this.changeSort = this._onChangeSort.bind(this);
    this.showAssignRactContainer = this.showAssignRactContainer.bind(this);
    this.showNewStudyContainer = this.showNewStudyContainer.bind(this);
  }

  _onChangeGroup(group) {
    const {selectedGroup} = this.state;
    const newSelectedGroup = group.value;
    if (selectedGroup === newSelectedGroup) {
      return;
    }
    this._showApplyingOptionSpinner({isApplyingGroup: true}, 1000);
    let state = {
      selectedGroup: newSelectedGroup,
    };
    this.setState(state);
  }

  _onChangeSort(sort) {
    const {selectedSort} = this.state;
    const newSelectedSort = sort.value;
    if (newSelectedSort === selectedSort) {
      return;
    }
    this._showApplyingOptionSpinner({isApplyingSort: true}, 1000);
    let state = {
      selectedSort: newSelectedSort,
    };
    this.setState(state);
  }

  _showApplyingOptionSpinner(isApplyingState, time) {
    this.setState(isApplyingState);
    Promise.resolve().then(() => {
      return this._sleep(time);
    }).then(() => {
      this._onFinishedApplyingOptions();
    });
  }

  _onFinishedApplyingOptions() {
    this.setState({
      isApplyingGroup: false,
      isApplyingMetrics: false,
      isApplyingSort: false,
    });
  }

  _sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  async componentDidMount() {

    const fileId = "RACT";
    GA.sendDocumentOpen(fileId, GA.DOCUMENT_TYPE.FILE);

    await RactScorecardStore.addChangeListener(this._onChange);
    Promise.all([
      await RactScorecardStore.fetchRactStudies(),
      await RactScorecardStore.fetchRactTemplates(),
    ]).then(results => {
      this._refreshScoreCardData(this.props);
    });
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const {loadPresentationAfterStudyFetch, selectedGroup, selectedSort} = this.state;
    const {immExposureStore: immNewExposureStore} = this.props;
    const {immExposureStore: immOldExposureStore} = prevProps;
    const immNewStudies = immNewExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const immOldStudies = immOldExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const immResults = this.state.immRactScorecardStore.get(RactStoreKeys.RACT_CONSOLE_DATA, Imm.Map());
    const previousSelectedGroup = prevState.selectedGroup;
    const currentSelectedGroup = this.state.selectedGroup;
    const previousSelectedSort = prevState.selectedSort;
    const currentSelectedSort = this.state.selectedSort;
    const prevAsignRactState = prevState.assignedRact;
    const currentSelectedStudies = this.state.selectedStudies;
    const prevSelectedStudies = prevState.selectedStudies;
    const currentAsignRactState = this.state.assignedRact;
    const newImmRactScorecardStore = RactScorecardStore.getStore();
    const isRactAssigned = newImmRactScorecardStore.get(RactStoreKeys.IS_RACT_ASSIGNED);

    const getPresentationData = () => {
      return this._preparePresentationData(immResults, selectedGroup, selectedSort);
    };

    if (JSON.stringify(currentSelectedStudies) !== JSON.stringify(prevSelectedStudies)) {
      this._refreshScoreCardData(this.props);
    }

    if ((prevAsignRactState !== currentAsignRactState) && isRactAssigned) {
      this.reloadNewStudyAndAssignedRact();
    }

    if ((previousSelectedGroup !== currentSelectedGroup || previousSelectedSort !== currentSelectedSort)) {
      this.setState({
        immPresentationData: getPresentationData(),
      });
    }

    // if both of these request conditions are met
    if (!Imm.is(immNewStudies, immOldStudies) && loadPresentationAfterStudyFetch) {
      this.setState({
        immPresentationData: getPresentationData(),
        loadPresentationAfterStudyFetch: false,
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    const immOldMasterStudies = this._getSelectedMasterStudies(this.props);
    const immNextMasterStudies = this._getSelectedMasterStudies(nextProps);
    if (this.state.finishedInitialLoad && !Imm.is(immOldMasterStudies, immNextMasterStudies)) {
      this.setState({
        isRactConsoleDataLoaded: false,
      });
      this._refreshScoreCardData(nextProps);
    }
  }

  componentWillUnmount() {
    RactScorecardStore.removeChangeListener(this._onChange);
  }

  _getSelectedMasterStudies(props) {
    const cookies = props.cookies;
    const currentAccountId = props.immExposureStore.get(ExposureStoreKey.currentAccountId);
    const immSelectedStudies = Imm.fromJS(
      Util.getSessionFilterStudyNames(cookies, currentAccountId),
    );
    return immSelectedStudies;
  }

  async _refreshScoreCardData(props) {
    this.setState({
      finishedInitialLoad: false
    })
    const {selectedStudies} = this.state;
    const {immExposureStore} = props;
    let immStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    if (immStudies.size) {
      RactScorecardStore.resetIsRactAssigned();
      let selectedStudiesArray = Util.getStudyId(props.immExposureStore);
      const immRactStore = RactScorecardStore.getStore();
      if(immRactStore.size) {
        let customStudies = immRactStore.get(FrontendConstants.RACT_STUDIES).toJS()
        customStudies = customStudies.map(cs => cs.protocolId)
        selectedStudiesArray = selectedStudiesArray.concat(customStudies)
      }
      const ractConsoleRequestBody = {"studyIds": selectedStudies ? selectedStudies : selectedStudiesArray};
      await RactScorecardStore.fetchRactConsoleData(ractConsoleRequestBody).then(() => {
        this.setState({
          finishedInitialLoad: true,
          isRactConsoleDataLoaded: true,
          assignedRact: false,
          selectedStudies: selectedStudies ? selectedStudies : selectedStudiesArray,
          immRactScorecardStore: RactScorecardStore.getStore(),
        });
      });
    }
  }

  reloadNewStudyAndAssignedRact() {
    Promise.all([
      RactScorecardStore.fetchRactStudies(),
      RactScorecardStore.fetchRactTemplates(),
    ]).then(results => {
      this._refreshScoreCardData(this.props);
    });
  }

  onAssignRact() {
    this.setState({
      assignedRact: true,
      isRactConsoleDataLoaded: false,
      displayAssignRactContainer: false,
      displayNewStudyContainer: false,
    });
  }

  _onChange = () => {
    this._onChangeImpl();
  };

  _onChangeImpl() {
    const {immExposureStore} = this.props;
    const {selectedSort, selectedGroup} = this.state;
    const immStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const newImmRactScorecardStore = RactScorecardStore.getStore();
    let state = {
      immRactScorecardStore: newImmRactScorecardStore,
    };
    const newImmResults = newImmRactScorecardStore.get(RactStoreKeys.RACT_CONSOLE_DATA, Imm.Map());
    const isRactConsoleLoaded = newImmRactScorecardStore.get(RactStoreKeys.IS_RACT_CONSOLE_DATA_LOADED);
    if (immStudies.size > 0) {
      if (isRactConsoleLoaded) {
        RactScorecardStore.resetRactConsoleData();
        state.immPresentationData = this._preparePresentationData(newImmResults, selectedGroup, selectedSort);
      }
    } else {
      state.loadPresentationAfterStudyFetch = true;
    }
    this.setState(state);
  }

  _groupData(immResults, selectedGroup) {
    const groupColumn = RactConsoleUtil.getGroupByColumn(selectedGroup);
    let groupedData;
    if (selectedGroup == ConstantsKey.NONE) {
      groupedData = immResults;
    } else {
      groupedData = immResults.groupBy(x => immResults.getIn([
        x.get('studyid'), groupColumn,
      ]));
    }
    return groupedData;
  }

  toggleFilterPane() {
    const showFilters = !this.state.showFilters;
    this.setState({showFilters});
  }

  _preparePresentationData(immResults, selectedGroup, selectedSort) {
    let ractData = RactConsoleUtil.calculateRiskScore(immResults);
    const groupedData = this._groupData(ractData, selectedGroup);
    let immEntityRows = groupedData;
    immEntityRows = selectedGroup === ConstantsKey.NONE
      ? Imm.OrderedMap({NONE: immEntityRows})
      : immEntityRows;
    const immSortedEntityRows = this._sortEntityRows(immEntityRows, selectedSort);
    let allEntityDetails = Imm.fromJS(ractData);
    return Imm.OrderedMap({
      entityHeaders: Imm.fromJS({}),
      entityRows: immSortedEntityRows,
      entityDetails: allEntityDetails,
    });
  }

  _sortEntityRows(immEntityRows, selectedSort) {
    return immEntityRows.map(immGroupedData => {
      const sortedByNanScore = immGroupedData.sort((immEntityData) => {
        const entityScore = immEntityData.getIn(['ractInfo', 'ractRiskScore']);
        switch (selectedSort) {
          case SortKeys.RISK_SCORE_ASCENDING: {
            return isNaN(entityScore) ? -1 : 1;
          }
          case SortKeys.RACT_STATUS_DESCENDING: {
            return isNaN(entityScore) ? 1 : -1;
          }
        }
      });

      return sortedByNanScore.sort((immEntityData, immNextEntityData) => {
        const entityName = immEntityData.get('studyname');
        const nextEntityName = immNextEntityData.get('studyname');
        const entityRactInfo = immEntityData.get('ractInfo');
        const nextEntityRactInfo = immNextEntityData.get('ractInfo');
        const ractStatus = entityRactInfo.get('ractStatus');
        const newRactStatus = nextEntityRactInfo.get('ractStatus');
        const entityScore = entityRactInfo.get('ractRiskScore');
        const nextEntityScore = nextEntityRactInfo.get('ractRiskScore');
        const areScoresEmptyOrTheSame = (isNaN(entityScore) && isNaN(nextEntityScore))
          || (entityScore === nextEntityScore);
        const mitigationScore = (entityRactInfo.get('mitigationActionCount') / entityRactInfo.get('enabledSubCategoryCount')) * 100;
        const nextMitigationScore = (nextEntityRactInfo.get('mitigationActionCount') / nextEntityRactInfo.get('enabledSubCategoryCount')) * 100;
        const areMitigationScoresEmptyOrTheSame = (isNaN(mitigationScore) && isNaN(nextMitigationScore))
          || (mitigationScore === nextMitigationScore);

        switch (selectedSort) {
          case SortKeys.STUDY_NAME_ASCENDING:
            return entityName.localeCompare(nextEntityName);
          case SortKeys.STUDY_NAME_DESCENDING:
            return -entityName.localeCompare(nextEntityName);
          case SortKeys.RACT_STATUS_ASCENDING:
            return ractStatus.localeCompare(newRactStatus);
          case SortKeys.RACT_STATUS_DESCENDING:
            return -ractStatus.localeCompare(newRactStatus);
          case SortKeys.RISK_SCORE_ASCENDING:
            if (areScoresEmptyOrTheSame) {
              return entityName.localeCompare(nextEntityName);
            }
            return entityScore - nextEntityScore;
          case SortKeys.RISK_SCORE_DESCENDING:
            if (areScoresEmptyOrTheSame) {
              return -entityName.localeCompare(nextEntityName);
            }
            return nextEntityScore - entityScore;
          case SortKeys.MITIGATION_PROGRESS_ASCENDING:
            if (areMitigationScoresEmptyOrTheSame) {
              return entityName.localeCompare(nextEntityName);
            }
            return mitigationScore - nextMitigationScore;
          case SortKeys.MITIGATION_PROGRESS_DESCENDING:
            if (areMitigationScoresEmptyOrTheSame) {
              return -entityName.localeCompare(nextEntityName);
            }
            return nextMitigationScore - mitigationScore;
        }
      });
    }).toOrderedMap().sortBy((x, key) => key.toLowerCase());
  }

  _getPartialRows() {
    const {immPresentationData, shownItemsCount, pageNumber} = this.state;
    const usePagination = this.isIE;
    let rowNumber = 0;
    return immPresentationData
      .get('entityRows')
      .map(groupedEntities => {
        if (rowNumber >= shownItemsCount) return null;
        return groupedEntities.filter(entity => {
          if (rowNumber >= shownItemsCount) return false;
          let shouldInclude = true;
          // If we are using pagination, artificially create a page of results
          if (usePagination) {
            const rowPageNumber = Math.floor(rowNumber / RACTConstant.NUM_ITEMS_PER_BATCH);
            shouldInclude = rowPageNumber === pageNumber;
          }
          rowNumber++;
          return shouldInclude;
        });
      })
      .filter(groupedEntities => groupedEntities && groupedEntities.size > 0)
      .toOrderedMap();
  }

  _getContent() {
    const {
      immRactScorecardStore, selectedGroup,
      immPresentationData, shownItemsCount,
    } = this.state;
    const {numTotalItems} = this;
    const immPartialEntityRows = this._getPartialRows();
    const {pageNumber} = this.state;
    const props = _.extend({}, this.props, {
      immRactScorecardStore,
      selectedGroup,
      immPresentationData: immPresentationData.set('entityRows', immPartialEntityRows),
    });

    let renderContent = (
      <div className='ract-scorecard-display-component'>
        <RactGridView {...props}
                      loadMore={this.LoadMoreItems}
                      isIE={this.isIE}
                      hasMore={shownItemsCount < numTotalItems}
                      pageNumber={pageNumber}
                      goToPreviousPage={this.GoToPreviousPage}
                      loadingFileDrillDownId =  {immRactScorecardStore.get(ConstantsKey.loadingFileDrillDownId)}
        />
      </div>
    );
    return renderContent;
  }

  _formatOptions = (options) => {
    const optionsArray = _.map(options, (option, key) => {
      return Imm.Map({label: option, value: key});
    });
    return Imm.List(optionsArray);
  };

  _getApplyingRibbonOptionSpinner(isApplying, optionType) {
    let iconSpinnerContent;
    if (isApplying) {
      const spinnerId = `os-ribbon-${optionType}`;
      iconSpinnerContent = <div className={cx('icon-spinner', spinnerId)}/>;
    }
    return (<div className='spinner-container'>{iconSpinnerContent}</div>);
  }

  _getRibbonFilters(hasAccessToCreateRactTemplatePage) {
    const {selectedSort, selectedGroup} = this.state;
    const immGroupOptions = this._formatOptions(RACTConstant.GROUP_OPTIONS);
    const immSortOptions = this._formatOptions(RACTConstant.SORT_OPTIONS);
    let ribbonButtons = null;
    if (hasAccessToCreateRactTemplatePage) {
      ribbonButtons = (<div className={cx('ribbon-buttons')}>
        <div className={cx('btn btn-primary')} onClick={this.showNewStudyContainer}>Add New
          Study
        </div>
        <div className={cx('btn btn-primary')} onClick={this.showAssignRactContainer}>Assign RACT
          to Study
        </div>
      </div>);
    }
    return (
      <div className='ract-scorecard-ribbon'>
        <div className='ribbon-filters'>
          <div className={cx('ract-scorecard-group', 'ract-scorecard-ribbon-filter')}>
            {this._getApplyingRibbonOptionSpinner(this.state.isApplyingGroup, FrontendConstants.GROUP)}
            <div className={cx('ract-scorecard-group-label', 'ribbon-filter-label')}>
              {FrontendConstants.GROUP}
            </div>
            <Combobox
              className={cx('ract-scorecard-dropdown-group', 'ribbon-filter-dropdown')}
              options={immGroupOptions}
              value={selectedGroup}
              onChange={this.changeGroup}
              passOnlyValueToChangeHandler={false}
            />
          </div>
          <div className={cx('ract-scorecard-sort', 'ract-scorecard-ribbon-filter')}>
            {this._getApplyingRibbonOptionSpinner(this.state.isApplyingSort, FrontendConstants.SORT)}
            <div className={cx('ract-scorecard-sort-label', 'ribbon-filter-label')}>
              {FrontendConstants.SORT}
            </div>
            <Combobox
              className={cx('ract-scorecard-dropdown-sort', 'ribbon-filter-dropdown')}
              placeholder=''
              options={immSortOptions}
              value={selectedSort}
              onChange={this.changeSort}
              passOnlyValueToChangeHandler={false}
            />
          </div>
        </div>
        {ribbonButtons}
      </div>
    );
  }

  showAssignRactContainer() {
    this.setState({
      ...this.state,
      displayAssignRactContainer: true,
      selectedStudies: [],
      showFilters: false
    });
  }

  showNewStudyContainer() {
    this.setState({
      ...this.state,
      displayNewStudyContainer: true,
      selectedStudies: [],
      showFilters: false
    });
  }

  openRactTemplateConfiguration() {
    this.context.router.push({
      name: RouteNameConstants.EXPOSURE_RACT_TEMPLATE_CONFIGURATION
    });
  }

  handleStudyChange(newSelectedStudy) {
    if (JSON.stringify(this.state.selectedStudies) !== JSON.stringify(newSelectedStudy)) {
      this.setState({
        isRactConsoleDataLoaded: false,
        selectedStudies: newSelectedStudy,
      });
    }
  }

  _getFilters() {
    const {showFilters, selectedStudies} = this.state;
    let filterContent;
    const filterProps = _.extend({}, this.props, {
      selectedStudies: selectedStudies,
    });

    if (showFilters) {
      filterContent = (
        <RactFilters
          handleClose={this.toggleFilterPane.bind(this)}
          handleStudyChange={this.handleStudyChange.bind(this)}
          {...filterProps}
        />
      );
    }

    return filterContent;
  }

  closeWindow() {
    this.setState({
      displayAssignRactContainer: false,
      displayNewStudyContainer: false,
    });
  }

  _handleExport() {
    const {immPresentationData} = this.state;
    RactConsoleUtil.exportRactConsoleCSV(immPresentationData);
  }

  _isReady() {
    const {immExposureStore} = this.props;
    const {finishedInitialLoad, immRactScorecardStore, isRactConsoleDataLoaded} = this.state;
    const hasStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map()).size > 0;
    const hasPresentationData = immRactScorecardStore.get(RactStoreKeys.RACT_CONSOLE_DATA, Imm.Map()).size > 0;
    return (hasStudies && finishedInitialLoad && isRactConsoleDataLoaded);
  }

  render() {
    const {displayAssignRactContainer, displayNewStudyContainer, showFilters} = this.state;
    const {immExposureStore} = this.props;
    const immStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    let content, ribbonFilters, title, filters;
    let showCloseButton = null;
    // User only has access to the Create Ract Template page if they have EDIT privilege for
    // the RACT feature
    const hasAccessToCreateRactTemplatePage = PermissionsUtil.checkLoggedInUserHasAccessForFeature(
      FeatureListConstants.RACT, AccessPermissionsConstants.EDIT,
    );
    const closeButtonDiv = <div className={'close-button'}
                                onClick={this.closeWindow.bind(this)}></div>;

    if (!this._isReady()) {
      content = <ContentPlaceholder/>;
    } else {
      filters = this._getFilters();
      if (displayAssignRactContainer === true) {
        content = <AssignRact immStudies={immStudies} onAssignRact={this.onAssignRact.bind(this)}/>;
        showCloseButton = closeButtonDiv;

      } else if (displayNewStudyContainer === true) {
        content = <AddNewStudy onAssignRact={this.onAssignRact.bind(this)}/>;
        showCloseButton = closeButtonDiv;
      } else {
        content = this._getContent();
        ribbonFilters = this._getRibbonFilters(hasAccessToCreateRactTemplatePage);
      }
    }

    title = (
      <div className={cx('breadcrumbs', 'oversight-title')}>
        {FrontendConstants.RACT_MODULE}
      </div>);

    let adminMenuOptions = null;

    if (hasAccessToCreateRactTemplatePage) {
      adminMenuOptions = (
        <MenuOption className='more-menu-custom-ract-template'
                    onSelect={this.openRactTemplateConfiguration.bind(this)}>
          <div className='react-menu-icon icon-plus-circle2'>
            {FrontendConstants.RACT_TEMPLATE_CONFIGURATION}
          </div>
        </MenuOption>

      );
    }

    return (
      <div className={cx('ract', {'show-filters': showFilters})}>
        <div className='page-header'>
          {title}
          <div className='header-buttons'>
            <a className='icon-report' href= '/folders/'>
            &nbsp;
             <span>All Analytics</span>
            </a>
            <SimpleAction
              class={cx('toggle-filters', 'icon-filter2')}
              text={FrontendConstants.FILTERS}
              onClick={this.toggleFilterPane.bind(this)}
            />
            <Menu className='more-menu'>
              <MenuTrigger className='more-menu-trigger'>
                <div className='react-menu-icon icon-menu2'>{FrontendConstants.MORE}</div>
              </MenuTrigger>
              <MenuOptions className='more-menu-options'>
                {adminMenuOptions}
                <MenuOption className='more-menu-export'
                            onSelect={this._handleExport.bind(this)}>
                  <div className='react-menu-icon icon-file-excel'>
                    {FrontendConstants.EXPORT}
                  </div>
                </MenuOption>
              </MenuOptions>
            </Menu>
          </div>
        </div>
        <div className={cx('oversight-scorecard-filters-container')}>
          {filters}
        </div>
        <div className='ract-scorecard-content'>
          <div className='ract-scorecard-ribbon-filters'>
            {ribbonFilters}
          </div>
          {showCloseButton}
          {content}
        </div>
      </div>
    );
  }
}

module.exports = RACT;
