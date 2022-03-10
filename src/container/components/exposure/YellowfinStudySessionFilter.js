import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import PropTypes from 'prop-types';

import Util from '../../util/util';
import FrontendConstants from '../../constants/FrontendConstants';
import FilterUpdateTypes from '../../constants/FilterUpdateTypes';

import { TouchDiv as div } from '../TouchComponents';
import { TouchSpan as span } from '../TouchComponents';
import CookieActions from '../../actions/CookieActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import ExposureActions from '../../actions/ExposureActions';
import RouteNameConstants from "../../constants/RouteNameConstants";
import StudyFilterSelector from "../filters/StudyFilterSelector";
import ReducedStudyFilter from "../filters/ReducedStudyFilter";

/**
 * Thin wrapper for Yellowfin filter session.
 *
 */
class YellowfinStudySessionFilter extends React.PureComponent {
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    fileId: PropTypes.string,
    yfParams: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.state = {
      immSelectedStudies: Imm.List(),
      immStudyOptions: Imm.List(),
      displayFilters: false,
      studyFilterIsMinimized: true,
      hasChangeSessionFilter: false,
      isMultiSelect: true,
      isYellowfinLoading: false,
      ignoreStudySessionFilter: this.props.ignoreStudySessionFilter ? this.props.ignoreStudySessionFilter : false,
      comprehendFileId: null,
      studyFilterMap: null
    };

    this.toggleMinimizeDisplayFilter = this.toggleMinimizeDisplayFilter.bind(this);
    this.handleStudySessionFilter = this.handleStudySessionFilter.bind(this);
  }

  componentDidMount() {
    if (this.state.ignoreStudySessionFilter) {
      return;
    }
    window.Yellowfin.eventListener.addListener(this, 'getstudyfilter', this.handleReceiverFilter);
    window.Yellowfin.eventListener.addListener(this, 'isloading', this.handleReceiverIsLoading);
    window.Yellowfin.eventListener.addListener(this, 'iframe-change', this.handleIframeChangeEvent);
    window.Yellowfin.eventListener.addListener(this, 'add-filter');
    window.Yellowfin.eventListener.addListener(this, 'isdrillthrough', this.handleReceiverDrillThrough);
    window.Yellowfin.eventListener.addListener(this, 'ismaximise', this.handleReceiverMaximise);
    window.Yellowfin.eventListener.addListener(this, 'get-selected-study-filter', this.handleSendSelectedStudiesFilter);
    window.Yellowfin.eventListener.addListener(this, 'study-cache-filter', this.handleReceiverStudyCacheFilter);
    window.Yellowfin.eventListener.addListener(this, 'get-master-study-filter', this.handleGetMasterStudyFilter);
    window.Yellowfin.eventListener.addListener(this, 'show-master-study-filter', this.handleShowMasterStudyFilter);
    if (!this.props.immExposureStore.get('yellowfinStudyFilterDataRequestInFlight', false) && !this.state.studyFilterMap) {
      ExposureActions.fetchYellowfinStudyFilterData();
    }
  }

  componentWillUnmount() {
    if (this.state.ignoreStudySessionFilter) {
      return;
    }
    window.Yellowfin.eventListener.removeListener(this, 'getstudyfilter');
    window.Yellowfin.eventListener.removeListener(this, 'isloading');
    window.Yellowfin.eventListener.removeListener(this, 'iframe-change');
    window.Yellowfin.eventListener.removeListener(this, 'get-selected-study-filter');
    window.Yellowfin.eventListener.removeListener(this, 'study-cache-filter');
    window.Yellowfin.eventListener.removeListener(this, 'ismaximise');
    window.Yellowfin.eventListener.removeListener(this, 'get-master-study-filter');
    window.Yellowfin.eventListener.removeListener(this, 'show-master-study-filter');
  }

  componentDidUpdate() {
    // Check for study Filter Minimize change
    if (this.studyFilterIsMinimized != this.state.studyFilterIsMinimized) {
      this.studyFilterIsMinimized = this.state.studyFilterIsMinimized
    }
  }

  componentWillReceiveProps(nextProps) {
    const immFilterResult = nextProps.immExposureStore.get('yellowfinStudyDynamicFilterResults', Imm.Map());
    if (!immFilterResult.isEmpty() && !this.state.studyFilterMap) {
      this.setState({
        studyFilterMap: immFilterResult.map(studyData => ({
          value: studyData.get('value'),
          label: studyData.get('value'),
          isArchived: studyData.get('isArchived'),
        })).sortBy(immStudy => immStudy.value)
      });
    }
  }

  render() {
    return (
      <div className={cx('top-nav-left-items', { minimized: this.state.studyFilterIsMinimized })}>
        <div className={cx('app-tab-report session-filter', { 'show-filters': this.props.immExposureStore.get('showSessionStudyFilter') })}>
          {this.getStudyNameSessionDynamicFilterComponent()}
        </div>
      </div>
    );
  }

  handleReceiverFilter(data) {

    const studyOptions = Imm.List(this.state.immStudyOptions)
      .map(immRow => Imm.Map({
        value: immRow.getIn(['label']),
        label: immRow.getIn(['label']),
      })).toJS();

    const receivedFilterOptions = data.studyFilter && data.studyFilter.filterOptions || [];
    const yellowfinStudies = receivedFilterOptions.map(option => ({
      value: option.value,
      label: option.value,
    }));

    //  Merge yellowfin studies in state options
    yellowfinStudies.forEach(yellowfinStudy => {
      const isYFStudyMissingInState = (_.size(yellowfinStudy.value) > 0)
        && studyOptions.find(option => option.value === yellowfinStudy.value) == null;
      if (isYFStudyMissingInState) {
        studyOptions.push(yellowfinStudy);
      }
    });

    const immSelectedStudies = this.getSelectedStudiesFilterFromSession();
    const sendStudies = this.getSelectedStudiesForSendingToYellowfin(immSelectedStudies, studyOptions);

    // Check ignore apply the study session filter
    if (this.state.contentId !== data.contentId) {
      // Get cache value
      const studyCacheFilter = Util.getYellowfinStudyCacheFilters(this.props.immExposureStore.get('currentAccountId'), data.contentId);
      // send back selecting filter
      let sendData = {
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: data.contentType,
        studyFilter: data.studyFilter,
        studyFilterValue: sendStudies,
        isDrillThrough: this.state.isDrillThrough,
        drillThroughContentName: this.state.drillThroughContentName,
        isMaximise: this.state.isMaximise
      }
      if (studyCacheFilter && (studyCacheFilter.valueOne || studyCacheFilter.valueList)) {
        sendData.studyCacheFilter = studyCacheFilter;
      }
      window.Yellowfin.eventListener.sendMessage(this.props.immExposureStore.get('yellowfinUrl'), 'setstudyfilter', sendData);
    }

    if (this.state.isDrillThrough && this.state.drillThroughContentName == data.contentName) {
      this.setState({
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: data.contentType,
        immStudyOptions: Imm.fromJS(studyOptions),
        yfStudyFilter: data.studyFilter,
        isDrillThrough: false,
        drillThroughContentName: null,
        isMaximise: false
      });
      ExposureActions.setShowSessionStudyFilter(true);
    } else if (data && data.studyFilter && data.studyFilter.filterId) {
      this.setState({
        contentId: data.contentId,
        contentName: data.contentName,
        contentType: data.contentType,
        immStudyOptions: Imm.fromJS(studyOptions),
        yfStudyFilter: data.studyFilter,
        isMaximise: false
      });
      ExposureActions.setShowSessionStudyFilter(true);
    } else {
      this.setState({
        contentId: null,
        isMaximise: false
      });
      ExposureActions.setShowSessionStudyFilter(false);
    }
  }

  toggleMinimizeDisplayFilter() {
    this.setState({ studyFilterIsMinimized: !this.state.studyFilterIsMinimized });
    if (!this.state.studyFilterIsMinimized) {
      let immSelectedStudies = this.getCurrentSelectedStudiesFilter();
      immSelectedStudies = immSelectedStudies.size === 0 ? this.getSelectedStudiesFilterFromSession() : immSelectedStudies;

      let immStudySelect = immSelectedStudies.map(function (immSelect) { return immSelect.get('label'); }).toJS();
      // Study session dynamic filter is always the first item in the list of session dynamic filters.
      this.checkYellowfinStudyNameDynamicSessionFilter();
      CookieActions.updateSessionFilterFilterState(0, FilterUpdateTypes.DROPDOWN_SET_VALUES, _.uniq(immStudySelect), this.props.immExposureStore.get('currentAccountId'));

      // Send setstudyfilter event for apply master selected filter on yellowfin
      this.sendStudyFilterToYellowfin(immStudySelect);
      // Send selected-study-filter event for build relate option from master selected filter on yellowfin
      this.handleSendSelectedStudiesFilter(null);
    }
  }

  handleStudySessionFilter(immStudySelect) {
    this.setState({
      immSelectedStudies: Imm.fromJS(immStudySelect),
      isYellowfinLoading: false,
      hasChangeSessionFilter: true
    });
  }

  sendStudyFilterToYellowfin(studies) {
    window.Yellowfin.eventListener.sendMessage(this.props.immExposureStore.get('yellowfinUrl'), 'setstudyfilter', {
      contentId: this.state.contentId,
      contentName: this.state.contentName,
      contentType: this.state.contentType,
      studyFilter: this.state.yfStudyFilter,
      studyFilterValue: studies
    });
  }

  handleReceiverDrillThrough(data) {
    if (data.isDrillThrough) {
      this.setState({
        isDrillThrough: data.isDrillThrough,
        drillThroughContentName: data.name,
      })
    }
  }

  handleReceiverMaximise(maximise) {
    if (maximise) {
      this.setState({
        isMaximise: maximise
      })
    }
  }

  handleSendSelectedStudiesFilter(data) {
    const immSelectedStudies = data ? this.getSelectedStudiesFilterFromSession()
      : this.getCurrentSelectedStudiesFilter();
    const sendStudies = this.getSelectedStudiesForSendingToYellowfin(immSelectedStudies,
      this.state.immStudyOptions);
    window.Yellowfin.eventListener.sendMessage(
      this.props.immExposureStore.get('yellowfinUrl'),
      'selected-study-filter', {
      contentId: this.state.contentId,
      contentName: this.state.contentName,
      contentType: this.state.contentType,
      action: data && data.action ? data.action : null,
      studyFilter: this.state.yfStudyFilter,
      studyFilterValue: sendStudies
    }
    );
  }

  handleReceiverStudyCacheFilter(data) {
    CookieActions.updateYellowfinStudyCacheFilters(this.props.immExposureStore.get('currentAccountId'), data.contentId, data.cacheFilter);
  }

  handleGetMasterStudyFilter() {
    const immSelectedStudies = this.getSelectedStudiesFilterFromSession();
    const studies = this.getSelectedStudiesForSendingToYellowfin(immSelectedStudies, this.state.immStudyOptions);
    window.Yellowfin.eventListener.sendMessage(this.props.immExposureStore.get('yellowfinUrl'),
      'set-master-study-filter', { studyFilterValue: studies });
  }

  handleShowMasterStudyFilter() {
    ExposureActions.setShowSessionStudyFilter(true);
  }

  handleIframeChangeEvent() {
    this.setState({
      contentId: null
    });
    ExposureActions.setShowSessionStudyFilter(false);
  }

  getCurrentSelectedStudiesFilter() {
    if(!this.state.immSelectedStudies.toJS().length){
      return Imm.List(this.props.immExposureStore.get("studies").toList().toJS()).map(value => Imm.Map({ value: value.value, label: value.value }));
    }else if (this.state.hasChangeSessionFilter && this.state.immSelectedStudies) {
      return Imm.List(this.state.immSelectedStudies).map(value => Imm.Map({ value: value, label: value }));
    }
    return this.getSelectedStudiesFilterFromSession();
  }

  getSelectedStudiesFilterFromSession() {
    const filterCookieEntry = Util.getSessionFilterCookieEntry(this.props.cookies, 0, this.props.immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    let immSelectedStudies = Imm.List(filter.itemsSelected).map(value => Imm.Map({ value: value, label: value }));
    return immSelectedStudies;
  }

  getSelectedStudiesForSendingToYellowfin(immSelectedStudies, immStudyOptions) {
    let sendStudies = [];
    if (!immSelectedStudies.isEmpty()) {
      // return selected studies with DAG applied
      sendStudies = immSelectedStudies.map(immSelect => immSelect.get('label')).toJS();
    } else if (this.state.studyFilterMap && _.size(immStudyOptions) !== this.state.studyFilterMap.size) {
      // all studies are selected return studies filtered by DAG
      sendStudies = this.state.studyFilterMap.toList().map(option => option.value).toJS();
    }
    return sendStudies;
  }

  checkYellowfinStudyNameDynamicSessionFilter() {
    // Add `study.studyname` as session dynamic filter if a yellowfin report and doesn't have
    // a `study.studyname` session dynamic filter.
    // If the filter already exists, don't add it.
    const sessionFilters = Util.getSessionFiltersFromCookie(this.props.cookies, 0, this.props.immExposureStore.get('currentAccountId'));
    if (!(sessionFilters && sessionFilters.sessionDynamicFilters && sessionFilters.sessionDynamicFilters[0])) {
      let yellowfinSessionDynamicFilters = _.filter(sessionFilters.sessionDynamicFilters, filter =>
        filter.schemaId == ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT
        && filter.cql == ExposureAppConstants.STUDY_SESSION_FILTER_CQL);
      const comprehendSchemaId = this.props.immExposureStore.getIn(['cdmSchemaIds', 0], '');
      sessionFilters.sessionDynamicFilters.unshift(Util.getEmptyStudyFilter(comprehendSchemaId));
      CookieActions.setSessionFilters(sessionFilters, this.props.immExposureStore.get('currentAccountId'));
    }
  }

  checkStudyMappingFilter(studyFilterMap, studyOptions) {
    let checkValue = false;

    if (!studyOptions.size) {
      checkValue = true
    } else {
      studyOptions.forEach(studyOption => {
        const checkStudy = studyFilterMap.filter(option => option.value === studyOption.getIn(['value']));
        if (checkStudy.size > 0) {
          checkValue = true;
        }
      });
    }
    return checkValue;
  }

  getStudyNameSessionDynamicFilterComponent() {
    const studyOptions = Imm.List(this.state.immStudyOptions)
      .map(immRow => Imm.Map({
        value: immRow.getIn(['label']),
        label: immRow.getIn(['label']),
        isArchived: immRow.get('isArchived'),
      }));
    const filterCookieEntry = Util.getSessionFilterCookieEntry(this.props.cookies, 0, this.props.immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    let immSelectedStudies;
    if (this.state.hasChangeSessionFilter && this.state.immSelectedStudies) {
      immSelectedStudies = this.state.immSelectedStudies;
    } else {
      immSelectedStudies = Imm.List(filter.itemsSelected);
    }

    let immDropdownItems;
    if (this.state.studyFilterMap && this.checkStudyMappingFilter(this.state.studyFilterMap, studyOptions)) {
      immDropdownItems = this.state.studyFilterMap;
    } else {
      immDropdownItems = studyOptions;
      if (immSelectedStudies.isEmpty()) {
        immSelectedStudies = this.state.immSelectedStudies;
      }
    }

    let actionText;
    let displayComponent;
    const isViewingTask = this.props.params.taskId && this.context.router.isActive({
      name: RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW,
      params: this.props.params
    });
    const isDisabled = this.state.ignoreStudySessionFilter || isViewingTask || !Util.isDesktop() ||
      (!this.props.immExposureStore.get('showSessionStudyFilter') && !this.state.isYellowfinLoading && !this.state.isDrillThrough);
    if (isDisabled) {
      displayComponent = <span className={cx('selected-study', 'study-filter-action', 'study-filter-not-applicable')}>{FrontendConstants.NOT_APPLICABLE}</span>
    } else if (this.state.studyFilterIsMinimized) {
      if (immSelectedStudies && immSelectedStudies.isEmpty()) {
        displayComponent = <span className="selected-study">{FrontendConstants.ALL_SELECTED}</span>
      } else {
        displayComponent = (<ReducedStudyFilter immSelectedNames={Imm.List(immSelectedStudies)}
          immStudies={immDropdownItems.toOrderedSet()} />);
      }
      actionText = FrontendConstants.CHANGE;
    } else {
      displayComponent = (
        <div className='study-filter-dropdown'>
          <StudyFilterSelector className='study-filter-selector'
            immStudies={immDropdownItems.toOrderedSet()}
            immSelectedNames={Imm.List(immSelectedStudies)}
            placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
            onChange={this.handleStudySessionFilter}
            immExposureStore={this.props.immExposureStore}
          />
        </div>
      );
      actionText = FrontendConstants.APPLY;
    }
    return (
      <div className={cx('study-session-filter', {
        minimized: this.state.studyFilterIsMinimized,
        disabled: isDisabled,
        mobile: !Util.isDesktop()
      })}>
        <span className={cx('title', 'colon')}>{FrontendConstants.STUDIES}</span>
        {displayComponent}
        <span className="study-filter-display-mode study-filter-action" onClick={this.toggleMinimizeDisplayFilter}>{actionText}</span>
      </div>
    );
  }
}

YellowfinStudySessionFilter.contextTypes = {
  router: PropTypes.object
};

export default YellowfinStudySessionFilter;
