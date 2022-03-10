import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';

import Store from './Store';
import ExposureAppConstants from '../constants/ExposureAppConstants';
import AppDispatcher from '../http/AppDispatcher';
import AppRequest from '../http/AppRequest';
import HomePageUtil from '../util/HomePageUtil';
import ExposureActions from '../actions/ExposureActions';
import HomePageConstants from '../constants/HomePageConstants';
import FrontendConstants from '../constants/FrontendConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';

const defaultHomePageStore = Imm.fromJS({
  allHomePages: {},
  selectedGroupEntityId: null,
  requestedTabIsNotFound: false,
  isConfigureEnabled: false
});

let _immHomePageStore = defaultHomePageStore;

const HomePageStore = _.extend({
  getHomePageStore() {
    return _immHomePageStore;
  },

  resetHomePageStore() {
    _immHomePageStore = defaultHomePageStore;
  },

  fetchHomePages(isInitialLoad, initialTabId) {
    const url = '/api/home-page';
    HomePageStore.fetchHomePagesFromUrl(url, isInitialLoad, null, initialTabId);
  },

  fetchHomePageWithSelectedGroup(isInitialLoad, selectedGroupId) {
    const url = '/api/home-page';
    HomePageStore.fetchHomePagesFromUrl(url, isInitialLoad, selectedGroupId);
  },

  fetchHomePagesFromUrl(url, isInitialLoad, selectedGroupId, initialTabId) {
    _immHomePageStore = _immHomePageStore.set('isLoadingHomePage', true);
    AppRequest({type: 'GET', url: url}).then(
      response => {
        const myHomePage = HomePageStore.parseHomePageFromDto(response.myHomePage);
        const teamHomePages = response.teamHomePages.map (page => HomePageStore.parseHomePageFromDto(page));
        const immAllHomePages = HomePageStore.getImmHomePages(myHomePage, teamHomePages);
        let selectedGroupEntityId;

        if (!selectedGroupId) {
          selectedGroupEntityId = HomePageStore.getDefaultSelectedGroupEntityId(myHomePage, teamHomePages, isInitialLoad);
        }
        else {
          selectedGroupEntityId = selectedGroupId;
        }

        if (initialTabId) {
          const initialGroupEntityId = HomePageUtil.findTeamWithTab(immAllHomePages, initialTabId);
          if (initialGroupEntityId) {
            _immHomePageStore = _immHomePageStore.set('selectedGroupEntityId', initialGroupEntityId);
          }
          else {
            _immHomePageStore = _immHomePageStore.set('selectedGroupEntityId', selectedGroupEntityId);
            const isRequestedTabIsNotFoundPresent = _immHomePageStore.get('requestedTabIsNotFound');
            _immHomePageStore = _immHomePageStore.set('requestedTabIsNotFound', !isRequestedTabIsNotFoundPresent);
          }
        }
        else {
          _immHomePageStore = _immHomePageStore.set('selectedGroupEntityId', selectedGroupEntityId);
        }

        _immHomePageStore = _immHomePageStore.set('allHomePages', immAllHomePages);
        _immHomePageStore = _immHomePageStore.delete('isLoadingHomePage');
        _immHomePageStore = _immHomePageStore.delete('serverError');
        HomePageStore.finishedRefreshingHomePage();
        HomePageStore.onAjaxCompletion();
      },
      jqXHR => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        _immHomePageStore = _immHomePageStore.delete('isLoadingHomePage');

        let serverError = { status: jqXHR.status };
        if (jqXHR.responseJSON) {
          serverError = { ...serverError, ...jqXHR.responseJSON };
        }
        _immHomePageStore = _immHomePageStore.set('serverError', serverError);

        HomePageStore.finishedRefreshingHomePage();
        HomePageStore.onAjaxCompletion();
      }
    );
  },

  getImmHomePages(myHomePage, teamHomePages) {
    let allHomePages = {};
    allHomePages[HomePageConstants.HOME_PAGE_SELF] = myHomePage;
    teamHomePages.forEach((page) => {
      allHomePages[page.groupEntityId] = page;
    });
    return Imm.fromJS(allHomePages);
  },

  getDefaultSelectedGroupEntityId(myHomePage, teamHomePages, isInitialLoad) {
    if (!isInitialLoad) {
      return HomePageConstants.HOME_PAGE_SELF;
    }
    const userTeamHomePages = teamHomePages.filter(p => !p.isAdminOnly);
    const isMyHomePageEmpty = _.isEmpty(myHomePage) || _.isEmpty(myHomePage.tabs);
    const showTeamHomePage = isMyHomePageEmpty && !_.isEmpty(userTeamHomePages) && !_.isEmpty(userTeamHomePages[0].tabs);
    return showTeamHomePage ? _.head(userTeamHomePages).groupEntityId : HomePageConstants.HOME_PAGE_SELF;
  },

  parseHomePageFromDto(homePageDto) {
    let sortedTabs = [];
    if(!_.isEmpty(homePageDto) && !_.isEmpty(homePageDto.tabs)) {
      sortedTabs = _.chain(homePageDto.tabs)
        .sortBy('tabIndex')
        .map(tab => _.assign(_.omit(tab, 'tabIndex')))
        .value();
    }
    let groupEntityId = HomePageConstants.HOME_PAGE_SELF;
    if (!_.isEmpty(homePageDto) && homePageDto.groupEntityId != null) {
      groupEntityId = homePageDto.groupEntityId
    }

    return _.assign({}, homePageDto, {
      tabs: sortedTabs,
      groupEntityId: groupEntityId
    });
  },

  moveInList(list, from, to) {
    const movingItem = list.get(from);
    let newList = list.splice(from, 1);
    newList = newList.splice(to, 0, movingItem);
    return newList;
  },

  moveHomePageReport(oldIndex, newIndex) {
    let immHomePages = _immHomePageStore.get('allHomePages');
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(_immHomePageStore);
    let immHomePage = immHomePages.get(selectedGroupEntityId, Imm.Map());

    let oldTabs = immHomePage.get('tabs', Imm.List());
    let updatedTabs = this.moveInList(oldTabs, oldIndex, newIndex);

    const immUpdatedHomePage = immHomePage.set('tabs', updatedTabs);
    _immHomePageStore = _immHomePageStore.setIn(
      ['allHomePages', selectedGroupEntityId], immUpdatedHomePage);
  },

  addToHomePagePreview(reportId) {

    let immHomePages = _immHomePageStore.get('allHomePages');
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(_immHomePageStore);
    let immHomePage = immHomePages.get(selectedGroupEntityId, Imm.Map());
    let updatedTabs = immHomePage.get('tabs', Imm.List());
    // use tabs size as temporary id for tab selection in editor mode until home page is persisted and real id obtained
    const fileJs = {
      entityId: reportId,
      tabType: reportId === ExposureAppConstants.OVERSIGHT_REPORT ? ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD : ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE,
      id: updatedTabs.size.toString(),
    };
    updatedTabs = updatedTabs.push(Imm.fromJS(fileJs));
    const immUpdatedHomePage = immHomePage.set('tabs', updatedTabs);
    immHomePages = immHomePages.set(selectedGroupEntityId , immUpdatedHomePage);
    _immHomePageStore = _immHomePageStore.set('allHomePages', immHomePages);
  },

  submitHomePage(isNewHomePage, groupEntityId) {
    let url = `/api/home-page/groups/${groupEntityId}`;
    if (groupEntityId === HomePageConstants.HOME_PAGE_SELF) {
      url = '/api/home-page';
    }
    const immHomePage = HomePageUtil.getHomePage(_immHomePageStore, groupEntityId);
    const homePage = HomePageUtil.convertToHomePageDto(immHomePage, Imm.List());
    _immHomePageStore = _immHomePageStore.set('isSubmittingHomePage', true);
    AppRequest({type: isNewHomePage ? 'POST' : 'PUT', url: url, data: JSON.stringify(homePage)}).then(
      function(data) {
        ExposureActions.createStatusMessage(FrontendConstants.SUBMIT_HOME_PAGE_SUCCESSFUL, StatusMessageTypeConstants.TOAST_SUCCESS);
        HomePageStore.closeHomePageEditor();
        HomePageStore.onAjaxCompletion();
      },
      function() {
        _immHomePageStore = _immHomePageStore.set('isSubmittingHomePage', false);
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
        ExposureActions.createStatusMessage(FrontendConstants.SUBMIT_HOME_PAGE_UNSUCCESSFUL, StatusMessageTypeConstants.WARNING);
        HomePageStore.onAjaxCompletion();
      }
    );
  },

  removeFromHomePagePreview(tab) {
    let immHomePages = _immHomePageStore.get('allHomePages');
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(_immHomePageStore);
    let immHomePage = immHomePages.get(selectedGroupEntityId, Imm.Map());
    const tabIndex = HomePageUtil.findTabIndex(immHomePage, tab);
    if (tabIndex >= 0) {
      immHomePage = immHomePage.removeIn(['tabs' , tabIndex]);
      immHomePages = immHomePages.set(selectedGroupEntityId , immHomePage);
      _immHomePageStore = _immHomePageStore.set('allHomePages', immHomePages);
    }
  },

  clearAllHomePageTabs() {
    let immHomePages = _immHomePageStore.get('allHomePages');
    const selectedGroupEntityId = HomePageUtil.getSelectedGroupEntityId(_immHomePageStore);
    immHomePages = immHomePages.setIn([selectedGroupEntityId, 'tabs'], Imm.List());
    _immHomePageStore = _immHomePageStore.set('allHomePages', immHomePages);
  },

  deleteHomePage(groupEntityId) {
    let url = `/api/home-page/groups/${groupEntityId}`;
    if (groupEntityId === HomePageConstants.HOME_PAGE_SELF) {
      url = '/api/home-page';
    }
    _immHomePageStore = _immHomePageStore.set('isSubmittingHomePage', true);
    AppRequest({type: 'DELETE', url: url, data: ''}).then(
      function() {
        _immHomePageStore = _immHomePageStore.set('isSubmittingHomePage', false);
        HomePageStore.clearAllHomePageTabs();
        HomePageStore.closeHomePageEditor();
        ExposureActions.createStatusMessage(FrontendConstants.DELETE_HOME_PAGE_SUCCESSFUL, StatusMessageTypeConstants.TOAST_SUCCESS);
        HomePageStore.onAjaxCompletion();
      },
      function(error) {
        _immHomePageStore = _immHomePageStore.set('isSubmittingHomePage', false);
        console.log(`%cERROR: DELETE ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`DELETE ${url} failed`);
        ExposureActions.createStatusMessage(FrontendConstants.DELETE_HOME_PAGE_UNSUCCESSFUL, StatusMessageTypeConstants.WARNING);
        HomePageStore.onAjaxCompletion();
      }
    );
  },

  refreshHomePage() {
    _immHomePageStore = _immHomePageStore.set('refreshHomePage');
    HomePageStore.fetchHomePages(false);
  },

  finishedRefreshingHomePage() {
    _immHomePageStore = _immHomePageStore.delete('refreshHomePage');
  },

  closeHomePageEditor() {
    _immHomePageStore = _immHomePageStore.set('closeHomePageEditor', true);
  },

  finishClosingHomePageEditor() {
    _immHomePageStore = _immHomePageStore.delete('closeHomePageEditor');
  },

  selectHomePage(selectedGroupEntityId) {
    if (selectedGroupEntityId !== ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS) {
      let updatedHomePages = _immHomePageStore.get('allHomePages');
      const selectedHomePage = _immHomePageStore.getIn(['allHomePages', selectedGroupEntityId], Imm.Map());
      if (selectedHomePage.isEmpty()) {
        updatedHomePages = updatedHomePages.set(selectedGroupEntityId, HomePageUtil.getNewEmptyHomePage(selectedGroupEntityId));
        _immHomePageStore = _immHomePageStore.set('allHomePages', updatedHomePages);
      }
    }
    _immHomePageStore = _immHomePageStore.set('selectedGroupEntityId', selectedGroupEntityId);
  },

  saveStateHomePage(baseStateHomePage) {
    _immHomePageStore = _immHomePageStore.set('baseStateHomePage', baseStateHomePage);
  },

  deleteStateHomePage() {
    _immHomePageStore = _immHomePageStore.delete('baseStateHomePage');
  },

  setDelayReroute(route) {
    _immHomePageStore = _immHomePageStore.set('delayReroute', route);
  },

  finishDelayReroute() {
    _immHomePageStore = _immHomePageStore.delete('delayReroute');
  },

  setDelayCallback(callback) {
    _immHomePageStore = _immHomePageStore.set('delayCallback', callback);
  },

  finishDelayCallback() {
    _immHomePageStore = _immHomePageStore.delete('delayCallback');
  },

  discardStateHomePage() {
    const selectedGroupEntityId = _immHomePageStore.get('selectedGroupEntityId', HomePageConstants.HOME_PAGE_SELF);
    let updatedHomePages = _immHomePageStore.get('allHomePages');
    updatedHomePages = updatedHomePages.set(selectedGroupEntityId, _immHomePageStore.get('baseStateHomePage'));
    _immHomePageStore = _immHomePageStore.set('allHomePages', updatedHomePages);
  },

  enableHomeConfigureLink() {
    _immHomePageStore = _immHomePageStore.set('isConfigureEnabled',false);
  },

  disableHomeConfigureLink() {
    _immHomePageStore = _immHomePageStore.set('isConfigureEnabled',true);
  },

}, Store);

const _actions = {
  [HomePageConstants.HOME_PAGE_UNABLE_CONFIGURE_LINK]: action => HomePageStore.enableHomeConfigureLink(),
  [HomePageConstants.HOME_PAGE_DISABLE_CONFIGURE_LINK]: action => HomePageStore.disableHomeConfigureLink(),

  [HomePageConstants.HOME_PAGE_FETCH_HOME_PAGE]: action => HomePageStore.fetchHomePages(action.isInitialLoad, action.initialTabId),
  [HomePageConstants.HOME_PAGE_FETCH_HOME_PAGE_WITH_SELECTED_GROUP]: action => HomePageStore.fetchHomePageWithSelectedGroup(action.isInitialLoad, action.selectedGroupId),
  [HomePageConstants.HOME_PAGE_ADD_TO_HOME_PAGE_PREVIEW]: action => HomePageStore.addToHomePagePreview(action.reportId),
  [HomePageConstants.HOME_PAGE_REMOVE_FROM_HOME_PAGE_PREVIEW]: action => HomePageStore.removeFromHomePagePreview(action.tab),
  [HomePageConstants.HOME_PAGE_SUBMIT_HOME_PAGE]: action => HomePageStore.submitHomePage(action.isNewHomePage, action.groupEntityId),
  [HomePageConstants.HOME_PAGE_REFRESH_HOME_PAGE]: action => HomePageStore.refreshHomePage(),
  [HomePageConstants.HOME_PAGE_MOVE_HOME_PAGE_REPORT]: action => HomePageStore.moveHomePageReport(action.oldIndex, action.newIndex),
  [HomePageConstants.HOME_PAGE_CLEAR_ALL_HOME_PAGE_TABS]: action => HomePageStore.clearAllHomePageTabs(),
  [HomePageConstants.HOME_PAGE_DELETE_HOME_PAGE]: action => HomePageStore.deleteHomePage(action.groupEntityId),
  [HomePageConstants.HOME_PAGE_CLOSE_HOME_PAGE_EDITOR]: action => HomePageStore.closeHomePageEditor(),
  [HomePageConstants.HOME_PAGE_FINISH_CLOSING_HOME_PAGE_EDITOR]: action => HomePageStore.finishClosingHomePageEditor(),
  [HomePageConstants.HOME_PAGE_SELECT_HOME_PAGE]: action => HomePageStore.selectHomePage(action.groupEntityId),
  [HomePageConstants.HOME_PAGE_RESET_HOME_PAGE_STORE]: action => HomePageStore.resetHomePageStore(),
  [HomePageConstants.HOME_PAGE_SAVE_STATE_HOME_PAGE]: action => HomePageStore.saveStateHomePage(action.baseStateHomePage),
  [HomePageConstants.HOME_PAGE_DELETE_STATE_HOME_PAGE]: action => HomePageStore.deleteStateHomePage(action.baseStateHomePage),
  [HomePageConstants.HOME_PAGE_SET_DELAY_REROUTE]: action => HomePageStore.setDelayReroute(action.route),
  [HomePageConstants.HOME_PAGE_FINISH_DELAY_REROUTE]: action => HomePageStore.finishDelayReroute(),
  [HomePageConstants.HOME_PAGE_SET_DELAY_CALLBACK]: action => HomePageStore.setDelayCallback(action.callback),
  [HomePageConstants.HOME_PAGE_FINISH_DELAY_CALLBACK]: action => HomePageStore.finishDelayCallback(),
  [HomePageConstants.HOME_PAGE_DISCARD_STATE_HOME_PAGE]: action => HomePageStore.discardStateHomePage(action.baseStateHomePage),
};

HomePageStore.dispatcherIndex = AppDispatcher.register(function(payload) {
  const {action} = payload;
  const immHomePageStore = HomePageStore.getHomePageStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!Imm.is(immHomePageStore, _immHomePageStore)) {
    HomePageStore.emitChange();
  }

  return true;
});

module.exports = HomePageStore;
