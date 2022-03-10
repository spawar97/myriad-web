import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import Util from '../util/util';
import AccountUtil from "../util/AccountUtil";
import ReportUtil from '../util/ReportUtil';
import StudiesUtil from '../util/StudiesUtil';
import cx from 'classnames';
import _ from 'underscore';
import ExposureActions from '../actions/ExposureActions';
import CookieActions from '../actions/CookieActions';
import ExposureAppConstants from '../constants/ExposureAppConstants';
import FrontendConstants from '../constants/FrontendConstants';
import FilterUpdateTypes from '../constants/FilterUpdateTypes';
import RouteNameConstants from '../constants/RouteNameConstants';
import YellowfinStudySessionFilter from './exposure/YellowfinStudySessionFilter';
import StudyFilterSelector from "./filters/StudyFilterSelector";
import ReducedStudyFilter from "./filters/ReducedStudyFilter";
import { getObject, setObject } from '../util/SessionStorage';
class MasterStudyFilter extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    params: PropTypes.shape({
      fileId: PropTypes.string,
      taskId: PropTypes.string
    }),
    query: PropTypes.shape({
      dashboardId: PropTypes.string,
      drilldownId: PropTypes.string,
      reportId: PropTypes.string
    }),
    isMobile: PropTypes.bool,
    context: PropTypes.any,
  };

  disabledRoutes = [
    RouteNameConstants.EXPOSURE_ADHOC_REPORTS_EDIT,
    RouteNameConstants.EXPOSURE_REPORTS_EDIT,
    RouteNameConstants.EXPOSURE_DATA_REVIEW_EDIT,
  ];

  enabledRoutes = [
    RouteNameConstants.EXPOSURE_OVERSIGHT_SCORECARD,
    RouteNameConstants.EXPOSURE_HOME_EDITOR,
    RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS,
    RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS,
    RouteNameConstants.EXPOSURE_BOT_DASHBOARD,
    RouteNameConstants.EXPOSURE_HOME,
  ];

  constructor(props) {
    super(props);
    this.state = {
      studyFilterIsMinimized: true,
      immSelectedStudies: Imm.List(),
    };
    this.handleStudySessionFilter = this.handleStudySessionFilter.bind(this);
    this.changeMasterFilter = this.changeMasterFilter.bind(this);
  }

  componentDidMount() {
    if (this.props.immExposureStore.get('studies', Imm.Map()).isEmpty()) {
      ExposureActions.fetchStudies(this.setSelectedStudies.bind(this));
    }
    else {
      this.setSelectedStudies();
    }
    ExposureActions.saveMasterFilterContext(this);
  }

  componentDidUpdate(prevProps, prevState) {

    let prev = prevProps.immExposureStore.get('masterStudyFilterContext');
    let current = this.props.immExposureStore.get('masterStudyFilterContext');
    if (!_.isEqual(prev, current)) {
      ExposureActions.saveMasterFilterContext(this);
    }

    if(this.props.immExposureStore.get('taskStudy') != prevProps.immExposureStore.get('taskStudy')) {
      let immSelectedStudiesTask = [];
      if (this.props.immExposureStore.get('isViewTasks')) {
        const immStudies = StudiesUtil.getImmStudies(this.props.immExposureStore).toJS();
        let studyId = this.props.immExposureStore.get('taskStudy');

        immStudies.forEach(item => {
          studyId.forEach(study => {
            if (item.label == study) {
              immSelectedStudiesTask.push(item);
            }
          });
        });
      }
      this.setState({
        immSelectedStudies: Imm.fromJS(immSelectedStudiesTask)
      });
    }
    
  }

  setSelectedStudies() {
    if (!AccountUtil.hasMasterStudyFilterAllSelectDefault(comprehend.globals.immAppConfig)) {
      let sessionFilters = JSON.parse(this.props.cookies.sessionFilters);
      let sessionDynamicFilters = sessionFilters[this.props.immExposureStore.get('currentAccountId')].sessionDynamicFilters[0];
      let filterState = sessionDynamicFilters.filterState;
      let sessionFiltersCheck = Util.getSessionFilterCookieEntry(this.props.cookies, 0, this.props.immExposureStore.get('currentAccountId'));

      if (filterState.freshCookie) {
        filterState.freshCookie = false;
        CookieActions.setSessionFilters(sessionFilters[this.props.immExposureStore.get('currentAccountId')], this.props.immExposureStore.get('currentAccountId'));

        CookieActions.updateSessionFilterFilterState(0, FilterUpdateTypes.DROPDOWN_SET_VALUES,
          this.props.immExposureStore.get('studies').filter(study => !study.get('isArchived'))
            .map(study => study.get('value')).valueSeq().toArray(), this.props.immExposureStore.get('currentAccountId'));
      }
    }

    this.setState({
      immSelectedStudies: this.getSelectedStudiesFilterFromSession(),
    });
  }

  toggleMinimizeDisplayFilter() {
    this.setState({ studyFilterIsMinimized: !this.state.studyFilterIsMinimized });
    if (!this.state.studyFilterIsMinimized) {
      const immSelectedStudies = this.state.immSelectedStudies;
      const cookieSelectedStudies = this.getSelectedStudiesFilterFromSession();

      if (!Imm.is(immSelectedStudies, cookieSelectedStudies)) {
        let selectedStudies = immSelectedStudies.map(function (selectedStudy) {
          return selectedStudy.get('label');
        }).toJS();
        // Study session dynamic filter is always the first item in the list of session dynamic filters.
        CookieActions.updateSessionFilterFilterState(0, FilterUpdateTypes.DROPDOWN_SET_VALUES,
          _.uniq(selectedStudies), this.props.immExposureStore.get('currentAccountId'));

        const fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
        if (fileId) {
          ExposureActions.applyFilter(fileId, this.props.query.drilldownId, 1);

          let contextFilter = getObject("widgetContextFilter") || [];

          if (contextFilter?.length) {
            let updatedContextFilter = contextFilter?.map((obj) => {
              obj.masterStudy = selectedStudies?.[0];
              return obj;
            })
            setObject('widgetContextFilter', updatedContextFilter);
          }

        }
      }
    }
  }

  getSelectedStudiesFilterFromSession() {
    const { immExposureStore } = this.props;

    const filterCookieEntry = Util.getSessionFilterCookieEntry(this.props.cookies, 0, immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    const immSelectedStudies = Imm.List(filter.itemsSelected).map(study => {
      const studyName = study;
      const studyId = Util.getStudyIdFromName(immExposureStore, studyName);
      return Imm.Map({ value: studyId, label: studyName });
    });
    return immSelectedStudies;
  }

  getStudySessionFilter() {
    const { immExposureStore, cookies } = this.props;
    let isViewTasks = immExposureStore.get('isViewTasks');
    const filterCookieEntry = Util.getSessionFilterCookieEntry(cookies, 0, immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};

    let immSelectedStudies = Imm.List();
    if (filter.allSelected || filter.itemsSelected.length > 0) {
      immSelectedStudies = this.state.immSelectedStudies;
    } else {
      immSelectedStudies = this.getSelectedStudiesFilterFromSession();
    }

    let actionText;
    let displayComponent;
    const isDisabled = !this.shouldShowStudySessionFilter();
    if (isDisabled) {
      displayComponent = (
        <span className={cx('study-filter-action', 'study-filter-not-applicable')}>
          {FrontendConstants.NOT_APPLICABLE}
        </span>
      );
    } else if (this.state.studyFilterIsMinimized) {
      if (_.isEmpty(filter.itemsSelected) && !isViewTasks) {
        displayComponent = <span className='selected-study'>{FrontendConstants.ALL_SELECTED}</span>;
      } else {
        const immStudies = StudiesUtil.getImmStudies(immExposureStore);
        const immSelectedNames = immSelectedStudies.map(study => study.get('label'));
        displayComponent = (<ReducedStudyFilter immSelectedNames={immSelectedNames} immStudies={immStudies} />);
      }
      actionText = FrontendConstants.CHANGE;
    } else {
      const immStudies = StudiesUtil.getImmStudies(immExposureStore);
      displayComponent = (
        <div className='study-filter-dropdown'>
          <StudyFilterSelector className='study-filter-selector'
            immStudies={immStudies}
            placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
            immSelectedNames={immSelectedStudies.map(study => study.get('label'))}
            onChange={this.handleStudySessionFilter}
            immExposureStore={immExposureStore}
          />
        </div>
      );
      actionText = FrontendConstants.APPLY;
    }

    return (
      <div className={cx('top-nav-left-items', { minimized: this.state.studyFilterIsMinimized })}>
        <div className={cx('study-session-filter',
          {
            minimized: this.state.studyFilterIsMinimized,
            mobile: this.props.isMobile,
            disabled: isDisabled
          })}>
          <span className={
            cx('title', 'colon')}>
            {FrontendConstants.STUDIES}
          </span>
          {displayComponent}
          <span className={isViewTasks ? cx('disabled') : cx('study-filter-display-mode', 'study-filter-action')}
            onClick={!isViewTasks ? this.toggleMinimizeDisplayFilter.bind(this) : ''}>
            {actionText}
          </span>
        </div>
      </div>
    );
  }

  handleStudySessionFilter(newStudyIds) {
    const immStudies = this.props.immExposureStore.get('studies', Imm.Map());
    const selectedStudies = _.map(newStudyIds, studyId => {
      const studyName = immStudies.getIn([studyId, 'value']);
      return { value: studyId, label: studyName };
    });

    this.setState({
      immSelectedStudies: Imm.fromJS(selectedStudies),
    });

    // Clear out the skip index for any reports that use the flag for preventing invalid refreshes
    // Required as changing the study session filter re-renders the entire report.
    ExposureActions.clearSkipIndex();
  }

  shouldShowStudySessionFilter() {
    const { immExposureStore, context } = this.props;
    const fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, immExposureStore);
    const immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    
    if(immFile && immFile.get('disableMasterStudyFilters')){
      return false;
    }

    if (immExposureStore.get('fileConfigsRequestInFlight', false)) {
      return false;
    }

    const { routes } = context.router;
    const route = routes[routes.length - 1];

    if (_.contains(this.disabledRoutes, route.name)) {
      return false;
    }

    if (_.contains(this.enabledRoutes, route.name)) {
      return true;
    }

    
    if (fileId === ExposureAppConstants.OVERSIGHT_REPORT || !fileId && this.props.params.activeTabId) {
      return true;
    }
    
    return Util.isCDMFile(immExposureStore, immFile);
  }

  async changeMasterFilter(newStudyIds) {
    const setNewStudy = async () => {
      this.handleStudySessionFilter(newStudyIds);
    }
    await setNewStudy();

    const immSelectedStudies = this.state.immSelectedStudies;
    const cookieSelectedStudies = this.getSelectedStudiesFilterFromSession();

    if (!Imm.is(immSelectedStudies, cookieSelectedStudies)) {
      let selectedStudies = immSelectedStudies.map(function (selectedStudy) {
        return selectedStudy.get('label');
      }).toJS();
      // Study session dynamic filter is always the first item in the list of session dynamic filters.
      CookieActions.updateSessionFilterFilterState(0, FilterUpdateTypes.DROPDOWN_SET_VALUES,
        _.uniq(selectedStudies), this.props.immExposureStore.get('currentAccountId'));

      const fileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
      if (fileId) {
        ExposureActions.applyFilter(fileId, this.props.query.drilldownId, 1);
      }
    }
  }

  render() {
    const { immExposureStore } = this.props;
    if (immExposureStore.get('studies', Imm.List()).size <= 0) {
      return null;
    }

    if (immExposureStore.get('isKPIStudioActive', false)) {
      return <YellowfinStudySessionFilter {...this.props} />
    } else {
      return this.getStudySessionFilter();
    }
  }
}

export default MasterStudyFilter;
module.exports = MasterStudyFilter;
