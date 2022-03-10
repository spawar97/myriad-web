import React from 'react';
import Imm from 'immutable';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import HomePageConstants from '../../constants/HomePageConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import PropTypes from 'prop-types';

import cx from 'classnames';
import Util from '../../util/util';
import { withTransitionHelper } from '../RouterTransitionHelper';
import Dashboard from '../Dashboard';
import Monitor from './Monitor';
import DataReviewView from './DataReviewView';
import Builtin from './Builtin';
import HomePageAdmin from './HomePageAdmin';
import HomePageEditor from './HomePageEditor';
import InformationMessage from './InformationMessage';
import ContentPlaceholder from '../ContentPlaceholder';
import ExposureActions from '../../actions/ExposureActions';
import AccountUtil from '../../util/AccountUtil';
import HomePageUtil from '../../util/HomePageUtil';
import HomePageStore from '../../stores/HomePageStore';
import HomePageActions from '../../actions/HomePageActions';
import RouteNameConstants from "../../constants/RouteNameConstants";
import StatusMessageTypeConstants from "../../constants/StatusMessageTypeConstants";
import {UnwrappedEmbeddedDashboards as EmbeddedDashboards} from "./EmbeddedDashboards";
import HomePageResponsiveNavBar from "./HomePageResponsiveNavBar";
import OversightScorecard from "./oversight/OversightScorecard";
import PermissionsUtil from "../../util/PermissionsUtil";
import {FeatureListConstants} from "../../constants/PermissionsConstants";
import Favorites from './Favorites.js';
import ExposureNavConstants from '../../constants/ExposureNavConstants';
class HomePage extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    params: PropTypes.shape({
      activeTabId: PropTypes.string,
      fileId: PropTypes.string,
      taskId: PropTypes.string,
    }).isRequired,
    query: PropTypes.shape({
      dashboardId: PropTypes.string,
      drilldownId: PropTypes.string,
      reportId: PropTypes.string
    })
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    const isDashboard = props.location.pathname === RouteNameConstants.EXPOSURE_DASHBOARDS_HOME;
    const activeTabId = isDashboard
      ? ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS
      : this.props.params.activeTabId;

    HomePageActions.resetHomePageStore();
    this.state = {
      immHomePageStore: HomePageStore.getHomePageStore(),
      activeTabId: activeTabId,
      changedActiveTabId: false,
      nextDrilldownId: null,
      isChangingReports: false,
      tabQuery: null,
      displayedEditor: null,
      disableEditing: false,
      isHomePageTabsStateDiffers: false
    };
  }

  componentDidMount() {
    const {  immExposureStore, location } = this.props;

    HomePageStore.addChangeListener(this._onHomePageStoreUpdate);
    if (this.state.activeTabId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS) {
      HomePageActions.fetchHomePageWithSelectedGroup(true, ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS);
      HomePageActions.selectHomePage(ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS);
    } else if (location.pathname === RouteNameConstants.EXPOSURE_HOME_TEAM_EDITOR) {
      const selectedGroupId = HomePageUtil.getDefaultGroupEntityId(immExposureStore);
      HomePageActions.fetchHomePageWithSelectedGroup(true, selectedGroupId);
    } else {
      if(this.props.params.activeTabId){
        HomePageActions.fetchHomePages(true, this.props.params.activeTabId);
      } else{
        const immHomePage = HomePageUtil.getSelectedHomePage(this.state.immHomePageStore);;
        const groupEntityId = HomePageUtil.getDefaultActiveTabId(immHomePage);
        this.selectTeamTabWithDefaultActiveId(groupEntityId, false);
      }
    }    
  }

  componentWillReceiveProps(nextProps) {
    const oldPathname = this.props.location.pathname;
    const newPathname = nextProps.location.pathname;
    const tabQuery = (_.isEmpty(nextProps.query) && newPathname === RouteNameConstants.EXPOSURE_HOME_EDITOR)
      ? this.state.tabQuery
      : nextProps.query;

    if (oldPathname !== newPathname) {
      this.handleChangePath(nextProps, newPathname, oldPathname);
    }

    let displayedEditor = null;
    if (!this.state.disableEditing) {
      if (newPathname === RouteNameConstants.EXPOSURE_HOME_EDITOR) {
        displayedEditor = HomePageConstants.HOME_PAGE_EDITOR;
      } else if (newPathname === RouteNameConstants.EXPOSURE_HOME_TEAM_EDITOR) {
        displayedEditor = HomePageConstants.HOME_PAGE_ADMIN_EDITOR;
      }
    }

    this.setState({ displayedEditor, tabQuery });
  }

  handleChangePath(nextProps, newPathname, oldPathname) {
    let activeTabId = this.state.activeTabId;
    let changedActiveTabId = false;

    switch (newPathname) {
      case RouteNameConstants.EXPOSURE_DASHBOARDS_HOME:
        activeTabId = ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
        changedActiveTabId = true;
        break;
      default:
        const newUrlActiveTabId = nextProps.params && nextProps.params.activeTabId;
        if (newUrlActiveTabId) {
          activeTabId = newUrlActiveTabId;
          changedActiveTabId = true;
        }
    }

    if (changedActiveTabId) {
      if (oldPathname === RouteNameConstants.EXPOSURE_HOME_EDITOR
        || oldPathname === RouteNameConstants.EXPOSURE_HOME_TEAM_EDITOR) {
        HomePageActions.fetchHomePages(false, activeTabId);
      }
    }

    this.setState({activeTabId, changedActiveTabId});
  }

  componentWillUnmount() {
    HomePageStore.removeChangeListener(this._onHomePageStoreUpdate);
  }

  _onHomePageStoreUpdate = () => {
    const {immHomePageStore} = this.state;
    const newImmHomePageStore = HomePageStore.getHomePageStore();
    const newImmHomePage = HomePageUtil.getSelectedHomePage(newImmHomePageStore);

    const {isHomePageTabsStateDiffers} = this.state;

    const savedStateHomePageStore = (HomePageStore.getHomePageStore()).get('baseStateHomePage');

    if (savedStateHomePageStore) {
      const actualStateHomePageTabsListSize = newImmHomePage.get('tabs', Imm.List()).size;
      const savedStateHomePageTabsListSize = savedStateHomePageStore.get('tabs', Imm.List()).size;

      if (actualStateHomePageTabsListSize != savedStateHomePageTabsListSize) {
        this.setState({
         isHomePageTabsStateDiffers: (!Imm.is(immHomePageStore.get('allHomePages'), savedStateHomePageStore.get('allHomePages'))),
        });
      }
    }
    else {
      this.setState({
        isHomePageTabsStateDiffers: false,
      });
    }


    let activeTabId = this.state.activeTabId;
    const isActiveTabInNewHome = HomePageUtil.isActiveTabInHomePage(newImmHomePage, activeTabId);
    if (activeTabId != null && !isActiveTabInNewHome
      && activeTabId !== ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS && !isHomePageTabsStateDiffers) {
      activeTabId = HomePageUtil.getDefaultActiveTabId(newImmHomePage);
    }

    const shouldReplaceTabUrl = this.shouldReplaceTabUrl(newImmHomePageStore);

    if (shouldReplaceTabUrl || this.state.isChangingReports) {
      const oldImmHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
      if (!Imm.is(newImmHomePage, oldImmHomePage)) {
        activeTabId = HomePageUtil.getDefaultActiveTabId(newImmHomePage);
      }

      this.setActiveTabRoute(activeTabId, shouldReplaceTabUrl);
    }

    if (newImmHomePage && !HomePageUtil.isHomePageEmpty(newImmHomePage) && activeTabId == null) {
      // Set first tab as active tab id if any
      activeTabId = HomePageUtil.getDefaultActiveTabId(newImmHomePage);
    }

    const newState = {
      immHomePageStore: newImmHomePageStore,
      activeTabId,
      disableEditing: !!newImmHomePageStore.get('serverError', null),
    };

    this.setState(newState);

    if (!this.isEditorShown() && !HomePageUtil.isHomePageEmpty(newImmHomePage)) {
      this.showErrorIfWrongUrlOfTabEntered();
    }
  };

  shouldReplaceTabUrl(newImmHomePageStore) {
    const {immHomePageStore} = this.state;

    // Check if we just finished loading
    const finishedLoading = immHomePageStore.get('isLoadingHomePage', false)
      && !newImmHomePageStore.get('isLoadingHomePage', false);

    // Check if we have an existing URL tab for initial load
    const hasInitialTabURL = this.props.params.activeTabId;

    // Check if we just finished a refresh
    const finishedRefreshing = immHomePageStore.get('refreshHomePage', false)
      && !newImmHomePageStore.get('refreshHomePage', false);

    const pathName = this.props.routes[this.props.routes.length - 1].name;
    const isUrlCanContainActiveTabId = pathName === RouteNameConstants.EXPOSURE_HOME ||
      pathName === RouteNameConstants.EXPOSURE_HOME_WITH_TAB;

    return (!hasInitialTabURL && finishedLoading && isUrlCanContainActiveTabId) || finishedRefreshing;
  }

  componentDidUpdate() {
    const {immHomePageStore} = this.state;

    const reroute = immHomePageStore.get('delayReroute', null);
    const callback = immHomePageStore.get('delayCallback', null);
    if (immHomePageStore.get('closeHomePageEditor', false)) {
      this.handleCloseHomePageEditor();
    }
    else if (this.state.isChangingReports) {
      this.handleIsChangingReports();
    }
    else if (this.state.changedActiveTabId && !immHomePageStore.get('isLoadingHomePage', false)) {
      this.handleChangedActiveTabId();
    }
    else if (reroute) {
      this.handleDelayReroute(reroute);
    }
    else if (callback) {
      this.handleDelayCallback(callback);
    }
  }

  handleIsChangingReports() {
    this.setState({
      isChangingReports: false,
      nextDrilldownId: null
    });
  }

  handleCloseHomePageEditor() {
    this.setState({
      displayedEditor: null,
    });

    HomePageActions.refreshHomePage();
    HomePageActions.deleteStateHomePage();
    HomePageActions.finishClosingHomePageEditor();
    this.context.router.push({name: RouteNameConstants.EXPOSURE_HOME});
  }

  handleChangedActiveTabId() {
    const { immHomePageStore, activeTabId } = this.state;

    const immAllPages = HomePageUtil.getAllHomePages(immHomePageStore);
    const groupEntityId = HomePageUtil.findTeamWithTab(immAllPages, activeTabId);
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(immHomePageStore);

    if (groupEntityId !== selectedGroupEntityId) {
      HomePageActions.selectHomePage(groupEntityId);
    }

    this.setState({ changedActiveTabId: false });
  }

  handleDelayReroute(route) {
    this.context.router.push({name: route});
    HomePageActions.finishDelayReroute();
  }

  handleDelayCallback(callback) {
    callback();
    HomePageActions.finishDelayCallback();
  }

  selectTeamTabWithDefaultActiveId(groupEntityId, keepEditorOpen) {
    let activeTabId;

    if (groupEntityId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS) {
      activeTabId = ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
    } else if (groupEntityId === RouteNameConstants.EXPOSURE_FAVORITES) {
      activeTabId = ExposureAppConstants.HOME_PAGE_TAB_TYPES.FAVORITES;
    }
    else {
      const nextHomePage = HomePageUtil.getHomePage(this.state.immHomePageStore, groupEntityId);
      activeTabId = HomePageUtil.getDefaultActiveTabId(nextHomePage);
    }

    HomePageActions.selectHomePage(groupEntityId);
    this.setActiveTabRoute(activeTabId, false, groupEntityId, !keepEditorOpen);

    let newState = {};

    if (!keepEditorOpen) {
      newState.displayedEditor = null;
    }

    newState.activeTabId = activeTabId;
    newState.isChangingReports = true;
    newState.nextDrilldownId = null;
    newState.tabQuery = null;

    this.setState(newState);
  }

  handleTabSelection(activeTabId, drilldownQuery) {
    const selectedHomePage = HomePageUtil.getSelectedHomePage(this.state.immHomePageStore);
    if (activeTabId == null) {
      activeTabId = HomePageUtil.getDefaultActiveTabId(selectedHomePage);
    }
    if (!this.isEditorShown() && !HomePageUtil.isHomePageEmpty(selectedHomePage)) {
      // URL with TabId only when we are NOT in edit mode
      this.setActiveTabRoute(activeTabId, null, null, null, drilldownQuery);
    }
    this.setState({
      activeTabId: activeTabId,
      isChangingReports: true,
      nextDrilldownId: drilldownQuery ? drilldownQuery : null,
      tabQuery: null
    });
  }

  setActiveTabRoute(activeTabId, doReplace, newGroupEntityId, keepEditorOpen, query) {
    if (this.isEditorShown() && !keepEditorOpen) {
      return;
    }

    const routerUpdateFunction = doReplace
      ? this.context.router.replace
      : this.context.router.push;

    if (activeTabId != null) {
      if (activeTabId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS) {
        routerUpdateFunction({name: RouteNameConstants.EXPOSURE_DASHBOARDS_HOME});
      } else if(activeTabId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.FAVORITES) {
        routerUpdateFunction({name: ExposureAppConstants.HOME_PAGE_TAB_TYPES.FAVORITES})
      }
      else {
        routerUpdateFunction({name: RouteNameConstants.EXPOSURE_HOME_WITH_TAB, params: {activeTabId: activeTabId}, query});
      }
    } else {
      routerUpdateFunction({name: RouteNameConstants.EXPOSURE_HOME});
      const immHomePage = HomePageUtil.getHomePage(this.state.immHomePageStore, newGroupEntityId);
      const isEmpty = HomePageUtil.isHomePageEmpty(immHomePage);

      if (this.props.params.activeTabId && !isEmpty) {
        ExposureActions.createStatusMessage(FrontendConstants.PROBLEMS_TO_ACTIVATE_TAB,
          StatusMessageTypeConstants.TOAST_ERROR);
      }
    }
  }

  teamTabSelection(newGroupEntityId, suppressModal) {
    const {immHomePageStore} = this.state;
    const oldGroupEntityId = this.state.immHomePageStore.get('selectedGroupEntityId', HomePageConstants.HOME_PAGE_SELF);
    
    if (newGroupEntityId === oldGroupEntityId) {
      return;
    }

    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.handleTeamTabSelection.bind(this, newGroupEntityId));
  }

  handleTeamTabSelection(groupEntityId) {
    const { displayedEditor } = this.state;
    const shouldClosePageEditor = !!displayedEditor &&
      (displayedEditor === HomePageConstants.HOME_PAGE_EDITOR ||
      groupEntityId === HomePageConstants.HOME_PAGE_SELF ||
      groupEntityId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS ||
      groupEntityId === RouteNameConstants.EXPOSURE_FAVORITES);

    if (shouldClosePageEditor) {
      this.handleCloseHomePageEditor();
      HomePageActions.enableHomeConfigureLink();
    }

    HomePageActions.deleteStateHomePage();
    HomePageActions.setDelayCallback(this.selectTeamTabWithDefaultActiveId.bind(this, groupEntityId, !shouldClosePageEditor));
  }

  handleOpenEditor(openEditorCallback, event) {
    event.stopPropagation();
    openEditorCallback();
  }

  openEditor = () => {
    const {immHomePageStore} = this.state;
    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.completeOpenEditor.bind(this));
    HomePageActions.disableHomeConfigureLink();
  };

  completeOpenEditor() {
    HomePageActions.deleteStateHomePage();
    HomePageActions.selectHomePage(HomePageConstants.HOME_PAGE_SELF);
    HomePageActions.setDelayReroute(RouteNameConstants.EXPOSURE_HOME_EDITOR);
  }

  openAdminEditor = () => {
    const { immHomePageStore } = this.state;
    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.completeOpenAdminEditor.bind(this));
  };

  completeOpenAdminEditor() {
    HomePageActions.deleteStateHomePage();
    HomePageActions.enableHomeConfigureLink();
    HomePageActions.setDelayReroute(RouteNameConstants.EXPOSURE_HOME_TEAM_EDITOR);
  };

  isEditorShown() {
    return this.state.displayedEditor != null
  }

  handleExposureDrilldown(currentFileId, nextFileId, drilldownId) {
    const {immHomePageStore} = this.state;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const nextTabWithIndex = HomePageUtil.findTabWithIndex(immHomePage, nextFileId, ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE);
    if (nextTabWithIndex) {
      const nextTabId = nextTabWithIndex.get('id', null);
      this.handleTabSelection(nextTabId, drilldownId);
    }
    else {
      ExposureActions.transitionFile(currentFileId,nextFileId, drilldownId);
    }
  }

  exposureDrilldownHelper(route, fileId, query) {
    const {immHomePageStore} = this.state;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const nextTabWithIndex = HomePageUtil.findTabWithIndex(immHomePage, fileId, ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE);
    if (nextTabWithIndex) {
      const nextTabId = nextTabWithIndex.get('id', null);
      this.handleTabSelection(nextTabId, query);
      this.setState({
        isChangingReports: true,
        tabQuery: query,
      });
    }
    else {
      this.context.router.push({name: route, params: {fileId}, query});
    }
  }

  getEmbeddedReportIframeContent(tab) {
    let embeddedReportProps = {
      immExposureStore: this.props.immExposureStore,
      params: this.props.params,
      iframeClass: 'home-iframe-inner-content-fullscreen',
      iframeWrapperClass: 'home-iframe-container-dashboard',
      viewContainerClass: 'home-embedded-reports-view-container'
    };

    let content;
    if (Util.isDesktop()) {
      if(tab === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS){
        content = <EmbeddedDashboards {...embeddedReportProps} />
      } else if (tab === ExposureAppConstants.HOME_PAGE_TAB_TYPES.FAVORITES) {
        content = <Favorites immExposureStore = {embeddedReportProps.immExposureStore} location = {this.props.location} />
      }
    }
    else {
      content = (
        <div className='embedded-reports-view-container'>
          <div className='mobile-embedded'>
            <div className='user-alert'>
              <span className='icon-info' />
              <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return content;
  }

  getTabContent() {
    const {activeTabId, immHomePageStore} = this.state;
    const immTab = HomePageUtil.findSelectedTab(immHomePageStore, activeTabId);
    const entityId = immTab && immTab.get('entityId', '');
    const tabType = immTab && immTab.get('tabType', '');
    switch(tabType) {
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE:
        return this.getExposureContent(entityId);
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD:
        return this.getExposureContent(entityId);
      default:
        return this.getUnavailableReportContent();
    }
  }

  getExposureContent(fileId) {
    const {immExposureStore} = this.props;
    const {activeTabId} = this.state;
    let fileType = null;
    if (fileId !== ExposureAppConstants.OVERSIGHT_REPORT) {
      fileType = immExposureStore.getIn(['fileConfigs', fileId, 'fileType'], null);
    }
    else {
      // Only apply fileType if user has access to scorecard, if there is no access, default case
      // in switch will fallback to be report unavailable
      if (AccountUtil.hasOversightScorecard(comprehend.globals.immAppConfig)
          && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.OVERSIGHT_SCORECARD)) {
        fileType = immExposureStore.getIn(['oversightReport', 'type'], null);
      }
    }
    const fileRequestRejected = immExposureStore.getIn(['files', fileId, 'fileRequestRejectedWith404'], false);

    let content;
    if (fileRequestRejected) {
      content = this.getUnavailableReportContent();
    }
    else {
      switch (fileType) {
        case ExposureAppConstants.FILE_TYPE_MONITOR:
          content = this.getMonitorContent(fileId);
          break;
        case ExposureAppConstants.FILE_TYPE_BUILTIN:
          content = this.getBuiltinContent(fileId);
          break;
        case ExposureAppConstants.FILE_TYPE_ANALYTICS:
        case ExposureAppConstants.FILE_TYPE_REPORT:
        case ExposureAppConstants.FILE_TYPE_DASHBOARD:
          content = this.getExposureReportContent(fileId);
          break;
        case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
          content = this.getDataReviewContent(fileId);
          break;
        case ExposureAppConstants.FILE_TYPE_OVERSIGHT_SCORECARD:
          content = this.getOversightScorecardContent(fileId, activeTabId);
          break;
        default:
          content = this.getUnavailableReportContent();
          break;
      }
    }

    return content;
  }

  showErrorIfWrongUrlOfTabEntered() {
    const {immHomePageStore} = this.state;
    const requestedTabIsNotFound = immHomePageStore.get('requestedTabIsNotFound');
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    let activeTabId = HomePageUtil.getDefaultActiveTabId(immHomePage);

    if(requestedTabIsNotFound) {
      ExposureActions.createStatusMessage(FrontendConstants.PROBLEMS_TO_ACTIVATE_TAB,
          StatusMessageTypeConstants.TOAST_ERROR);
      this.props.router.push(RouteNameConstants.EXPOSURE_HOME);
      this.setActiveTabRoute(activeTabId);
      immHomePageStore.set('requestedTabIsNotFound', false);

    }
  }

  getUnavailableReportContent() {
    const emptyTabProps = {
      params: {
        title: FrontendConstants.HOME_PAGE_TAB_UNAVAILABLE,
        details: FrontendConstants.HOME_PAGE_TAB_UNAVAILABLE_DETAILS,
      }
    };
    return <InformationMessage {...emptyTabProps}/>;
  }

  getExposureReportContent(fileId) {
    let exposureReportProps = {
      ...this.props
    };

    const { immHomePageStore } = this.state;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const tabList = immHomePage.get('tabs', Imm.List());

    exposureReportProps.params.fileId = fileId;
    exposureReportProps.isHomePage = true;
    exposureReportProps.homePageDrilldownHelper = this.exposureDrilldownHelper.bind(this);
    exposureReportProps.homePagePropsChangeDrilldown = this.handleExposureDrilldown.bind(this);
    exposureReportProps.tabListSize = tabList.size;

    if (this.state.nextDrilldownId) {
      exposureReportProps.drilldownId = this.state.nextDrilldownId;
    }

    if (this.state.tabQuery) {
      exposureReportProps.query = this.state.tabQuery
    }

    return <Dashboard {...exposureReportProps} />;
  }

  getMonitorContent(fileId) {
    let monitorProps = {
      ...this.props
    };

    monitorProps.params.fileId = fileId;
    return <Monitor {...monitorProps} />;
  }

  getOversightScorecardContent(fileId, activeTabId) {
    let oversightScorecardProps = {
      ...this.props
    };

    oversightScorecardProps.params.fileId = fileId;
    oversightScorecardProps.params.activeTabId = activeTabId;
    return <OversightScorecard {...oversightScorecardProps} />;
  }

  getBuiltinContent(fileId) {
    let builtinProps = {
      ...this.props
    };

    builtinProps.params.fileId = fileId;
    return <Builtin {...builtinProps} />;
  }

  getDataReviewContent(fileId) {
    let dataReviewProps = {
      ...this.props
    };

    dataReviewProps.params.fileId = fileId;
    return <DataReviewView {...dataReviewProps} />
  }

  getEditor() {
    const { immHomePageStore, displayedEditor } = this.state;
    const editorProps = _.chain({})
      .extend(this.props)
      .omit('route')
      .value();

    const numRoutes = this.context.router.routes.length;

    editorProps.route = this.context.router.routes[numRoutes - 1];
    editorProps.immHomePageStore = immHomePageStore;

    let editor = null;
    if (displayedEditor === HomePageConstants.HOME_PAGE_ADMIN_EDITOR) {
      editor = <HomePageAdmin {...editorProps} onChangeGroup={this.selectTeamTabWithDefaultActiveId.bind(this)} />;
    }
    else if (displayedEditor === HomePageConstants.HOME_PAGE_EDITOR) {
      editor = <HomePageEditor {...editorProps} />;
    }

    return editor;
  }

  getReportTabButtons() {
    const {immHomePageStore, activeTabId} = this.state;
    const {immExposureStore} = this.props;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const immHomePageTabs = immHomePage.get('tabs', Imm.List());

    let immTabOptions = Imm.List();
    immHomePageTabs.forEach((tab, i) => {
      const fullTitle = HomePageUtil.getTabReportName(immExposureStore, tab);
      const reportTitle = HomePageUtil.textOverflowEllipsis(fullTitle, 30);
      const isActiveTab = tab.get('id') === activeTabId;
      const titleSpan = (<span>{isActiveTab ? fullTitle : reportTitle}</span>);

      let unavailableSpan = '';
      if (reportTitle === FrontendConstants.NOT_AVAILABLE ) {
        unavailableSpan = <span className='icon icon-WarningCircle'></span>;
      }

      let titleDiv = (<div className='tab-title'>{unavailableSpan}{titleSpan}</div>);

      immTabOptions = immTabOptions.push({
        value: tab.get('id'),
        label: titleDiv,
        title: fullTitle,
        cx: cx("tablinks", "home-page-report-tab",
          {
            "active": isActiveTab,
            "first": i === 0,
            "last": i === immHomePageTabs.size - 1
          }
        ),
      });
    });

    let tabs = null;
    if(immTabOptions.size > 0) {
      const tabNavBarProps = {
        immOptions: immTabOptions,
        onSelectedTab: this.handleTabSelection.bind(this),
        activeOptionId: activeTabId,
        dropDownClassName: 'report-tab-drop-down-wrapper',
      };
      tabs = (
        <HomePageResponsiveNavBar {...tabNavBarProps} key="home-page-report-tab-navbar"/>
      );
    }
    return tabs;
  }

  getTeamTabButtons() {
    let tabs = [];
    const {immExposureStore} = this.props;  
    const { displayedEditor, immHomePageStore, disableEditing} = this.state;
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(immHomePageStore);

    let immGroupEntitiesForUser = HomePageUtil.getGroupEntityIdsWithHomePages(immHomePageStore, immExposureStore);
    const showMyDashboards = AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig);
    const numGroupEntitiesForUser = immGroupEntitiesForUser.size;

    const isMyHomePageActive = selectedGroupEntityId === HomePageConstants.HOME_PAGE_SELF || disableEditing;
    const isFavoritesPageActive = selectedGroupEntityId === RouteNameConstants.EXPOSURE_FAVORITES || disableEditing;
    let onClickHandler = () => {};
    if (!disableEditing && isMyHomePageActive && !immHomePageStore.get('isConfigureEnabled')) {
      onClickHandler = this.handleOpenEditor.bind(this, this.openEditor);
    } 
    const configureHomePage = (
      <span
        className={cx(
          'home-page-enter-edit-mode',
          {'disabled': disableEditing || !isMyHomePageActive || immHomePageStore.get('isConfigureEnabled')}
        )}
        key='editor'
        style={{bottom: '0px'}}
        onClick={onClickHandler}>
        {FrontendConstants.CONFIGURE}
      </span>
    );

    const myHomePage = (
      <div key={`home-page-team-tab-self`}
           className={cx(
             "tablinks",
             "home-page-team-tab-div-button",
             "home-page-team-tab-my-home-button",
             "first",
             {
               "active": isMyHomePageActive,
               "last": numGroupEntitiesForUser === 0 && !showMyDashboards
             }
           )}
           onClick={this.teamTabSelection.bind(this, HomePageConstants.HOME_PAGE_SELF)}
           title={FrontendConstants.MY_HOME}
      >
        <div className="analytics-top-nav-item" style={{width: '50%', float: 'left'}}>{FrontendConstants.MY_HOME}</div>
        <div className="analytics-top-nav-item" style={{width: '50%', float: 'right'}}>{configureHomePage}</div>
      </div>
    );

    const favoritesTab = (
      <div key={`home-page-team-tab-self2`}
           className={cx(
             "tablinks",
             "analytics-top-nav-item",
             "home-page-team-tab-div-button",
             "home-page-team-tab-my-home-button",
             "first",
             {
               "active": isFavoritesPageActive,
               "last": numGroupEntitiesForUser === 0 && !showMyDashboards
             }
           )}
            onClick={this.teamTabSelection.bind(this, RouteNameConstants.EXPOSURE_FAVORITES)}
            title={FrontendConstants.FAVORITES}
      >
        {FrontendConstants.FAVORITES}
      </div>
    )

    tabs.push(favoritesTab, myHomePage);

    if (showMyDashboards) {
      const isMyDashboardsActive = selectedGroupEntityId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
      let onClickHandler = () => {};
      if (!disableEditing) {
        onClickHandler = this.teamTabSelection.bind(this, ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS);
      }
      const myDashboardsHomePage = (
        <div key='home-page-team-tab-my-dashboards'
             className={cx(
               "tablinks",
               "analytics-top-nav-item",
               "home-page-team-tab-div-button",
               "home-page-team-tab-my-dashboards-button",
               {
                 "active": isMyDashboardsActive,
                 "last": numGroupEntitiesForUser === 0
               },
               {'disabled': disableEditing},
             )}
             onClick={onClickHandler}
             title={FrontendConstants.MY_DASHBOARDS}
        >
          {FrontendConstants.MY_DASHBOARDS}
        </div>
      );
      tabs.push(myDashboardsHomePage);
    }

    let immTeamOptions = Imm.List();
    let i = 0;
    immGroupEntitiesForUser.sort().forEach((groupName, groupEntityId) => {
      i++;
      const immHomePage = HomePageUtil.getHomePage(immHomePageStore, groupEntityId);
      const isActive = groupEntityId === selectedGroupEntityId;

      if (!immHomePage.get('isAdminOnly', false) || isActive){
        const isLast = i === immGroupEntitiesForUser.size;
        immTeamOptions = immTeamOptions.push({
          value: groupEntityId,
          label: groupName,
          title: groupName,
          cx: cx("tablinks", "home-page-team-tab-div-button", {"active": isActive, "last": isLast}),
        });
      }
    });

    const teamNavBar = this.getTeamNavBar(immTeamOptions, selectedGroupEntityId);
    if (teamNavBar != null) {
      tabs.push(teamNavBar);
    }

    if (AccountUtil.isAdmin(immExposureStore)) {
      const isShowingAdminEditor = displayedEditor === HomePageConstants.HOME_PAGE_ADMIN_EDITOR;

      let onClickHandler = () => {};
      if (!disableEditing) {
        onClickHandler = this.handleOpenEditor.bind(this, this.openAdminEditor);
      }

      const adminButton = (
        <button
          className={cx(
              "home-page-enter-admin-mode",
              "analytics-top-nav-item",
              {
                "active": isShowingAdminEditor,
                "disabled": disableEditing
              }
          )}
          key='admin-editor'
          onClick={onClickHandler}
          title={FrontendConstants.CONFIGURE_TEAM_HOME_PAGES}
        >
          {FrontendConstants.CONFIGURE_TEAM_HOME_PAGES}
        </button>
      );

      tabs.push(adminButton);
    }

    return tabs;
  }

  getTeamNavBar(options, selectedId) {
    let teamNavBar = null;
    if(options.size > 0) {
      const teamNavBarProps = {
        immOptions: options,
        onSelectedTab: this.teamTabSelection.bind(this),
        activeOptionId: selectedId,
        dropDownClassName: 'team-tab-drop-down-wrapper',
      };
      teamNavBar = (
        <HomePageResponsiveNavBar {...teamNavBarProps} key='home-page-team-tab-navbar'/>
      );
    }
    return teamNavBar;
  }

  isTabRefreshing() {
    const {immHomePageStore, isChangingReports} = this.state;

    return isChangingReports
        || immHomePageStore.get('isLoadingHomePage', false);
  }

  isReady() {
    const {immExposureStore} = this.props;
    const {immHomePageStore} = this.state;
    const fileConfigsRequestInFlight = immExposureStore.get('fileConfigsRequestInFlight', false);

    return !immHomePageStore.has('isLoadingHomePage') &&
      (!fileConfigsRequestInFlight ||
      this.state.activeTabId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS);
  }

  getEmptyHomePageDetailsProp(isTeamHomePage) {
    const configureLink = isTeamHomePage
      ? FrontendConstants.CONFIGURE_TEAM_HOME_PAGES
      : FrontendConstants.CONFIGURE;
    const editorHandler = isTeamHomePage ?  this.openAdminEditor : this.openEditor;
    const editorKey =  isTeamHomePage ? 'admin-editor' : 'editor';
    return <div>
      {FrontendConstants.ADD_PAGES_TO_YOUR_HOME}
      <span className='home-page-link-enter-edit-or-admin-mode' key={editorKey}
            onClick={this.handleOpenEditor.bind(this, editorHandler)}>
        {configureLink}
        {'.'}
      </span>
    </div>
  }

  getHomePageContent() {
    const {immHomePageStore, displayedEditor} = this.state;
    const selectedGroupEntityId = immHomePageStore.get('selectedGroupEntityId', HomePageConstants.HOME_PAGE_SELF);
    const serverError = immHomePageStore.get('serverError', null);
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const immHomePageTabs = immHomePage.get('tabs', Imm.List());
    const isMyDashboardsSelected = selectedGroupEntityId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
    const isFavoritesPageActive = selectedGroupEntityId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.FAVORITES;
    const isEmpty = HomePageUtil.isHomePageEmpty(immHomePage);

    let tabContent;
    let isRefreshing = this.isTabRefreshing();
    if (isRefreshing) {
      tabContent = <ContentPlaceholder/>;
    }
    else if (serverError) {
      const emptyPageProps = {
        params: {
          iconClass: 'icon-WarningCircle',
          title: FrontendConstants.UNEXPECTED_SERVER_ERROR,
          details: FrontendConstants.TRY_REFRESHING_YOUR_BROWSER,
        }
      };
      tabContent = <InformationMessage {...emptyPageProps}/>;
    }
    else if (isMyDashboardsSelected || isFavoritesPageActive) {
      tabContent = this.getEmbeddedReportIframeContent(selectedGroupEntityId);
    }
    else if (immHomePageTabs.size <= 0) {
      const isTeamHomePage = selectedGroupEntityId !== HomePageConstants.HOME_PAGE_SELF
        && selectedGroupEntityId !== ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
      const emptyPageProps = {
        params: {
          title: isTeamHomePage
            ? FrontendConstants.HOME_PAGE_NOT_CONFIGURED
            : FrontendConstants.YOUR_HOME_PAGE_NOT_CONFIGURED,
          details: this.isEditorShown() ? '' : this.getEmptyHomePageDetailsProp(isTeamHomePage),
        }
      };
      tabContent = <InformationMessage {...emptyPageProps}/>;
    }
    else {
      tabContent = this.getTabContent();
    }

    let tabs = [];

    const reportTabs = this.getReportTabButtons();
    if (reportTabs) {
      tabs = tabs.concat(reportTabs);
    }

    const tabContentClass = isMyDashboardsSelected
      ? 'home-page-dashboard-tabcontent'
      : 'home-page-tabcontent';

    const reportTabsContent = tabs.length > 0
      ? (
        <div className={cx('home-page-tab', 'home-page-report-tab')}>
          {tabs}
        </div>
      )
      : null;

    return (
      <div className={cx('home-page-content',
        {
          'home-page-content-editor-mode': !!displayedEditor,
          'empty': isEmpty,
          'dashboard': isMyDashboardsSelected
        }
      )}>
        {reportTabsContent}
        <div id="content" className={cx(tabContentClass,
          { 'empty': isEmpty}
        )}>
          {tabContent}
        </div>
      </div>
    );
  }

  render() {
    let homePageContent;
    const {displayedEditor, immHomePageStore} = this.state;
    const isReady = this.isReady();
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const isEmpty = HomePageUtil.isHomePageEmpty(immHomePage);

    if (!isReady) {
      homePageContent = (
        <div className={cx('home-page-content',
          {'home-page-content-editor-mode': !!displayedEditor})}
         >
          <ContentPlaceholder/>
        </div>
      );
    }
    else {
      homePageContent = this.getHomePageContent();
    }

    let editor = this.getEditor();

    return (
      <div className='home-page'>
        <div className='home-page-all-content'>
          <div className={cx('home-page-tab', 'home-page-team-tab')}>
            {isReady && this.getTeamTabButtons()}
          </div>
          <div className={cx('home-page-content-container',
            {
              'empty': isEmpty
            }
          )}>
          {homePageContent}
          {editor}
        </div>
      </div>
    </div>
    )
  }
}

export default withTransitionHelper(HomePage);
