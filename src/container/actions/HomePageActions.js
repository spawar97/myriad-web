import HomePageConstants from '../constants/HomePageConstants';
import AppDispatcher from '../http/AppDispatcher';

const HomePageActions = {
  fetchHomePages(isInitialLoad, initialTabId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_FETCH_HOME_PAGE,
      isInitialLoad,
      initialTabId
    });
  },

  fetchHomePageWithSelectedGroup(isInitialLoad, selectedGroupId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_FETCH_HOME_PAGE_WITH_SELECTED_GROUP,
      isInitialLoad,
      selectedGroupId
    });
  },

  addToHomePagePreview(reportId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_ADD_TO_HOME_PAGE_PREVIEW,
      reportId
    });
  },

  closeHomePageEditor() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_CLOSE_HOME_PAGE_EDITOR
    })
  },

  finishClosingHomePageEditor() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_FINISH_CLOSING_HOME_PAGE_EDITOR
    });
  },

  removeFromHomePagePreview(tab) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_REMOVE_FROM_HOME_PAGE_PREVIEW,
      tab
    });
  },

  submitHomePage(isNewHomePage, groupEntityId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_SUBMIT_HOME_PAGE,
      isNewHomePage,
      groupEntityId
    });
  },

  refreshHomePage() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_REFRESH_HOME_PAGE
    });
  },

  moveHomePageReport(oldIndex, newIndex) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_MOVE_HOME_PAGE_REPORT,
      oldIndex,
      newIndex
    });
  },

  clearAllHomePageTabs() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_CLEAR_ALL_HOME_PAGE_TABS
    });
  },

  deleteHomePage(groupEntityId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_DELETE_HOME_PAGE,
      groupEntityId
    });
  },

  selectHomePage(groupEntityId) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_SELECT_HOME_PAGE,
      groupEntityId
    });
  },

  resetHomePageStore() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_RESET_HOME_PAGE_STORE
    });
  },

  saveStateHomePage(baseStateHomePage) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_SAVE_STATE_HOME_PAGE,
      baseStateHomePage
    });
  },

  deleteStateHomePage() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_DELETE_STATE_HOME_PAGE
    });
  },

  setDelayReroute(route) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_SET_DELAY_REROUTE,
      route
    });
  },

  finishDelayReroute() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_FINISH_DELAY_REROUTE
    })
  },

  setDelayCallback(callback) {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_SET_DELAY_CALLBACK,
      callback
    });
  },

  finishDelayCallback() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_FINISH_DELAY_CALLBACK
    });
  },

  discardStateHomePage() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_DISCARD_STATE_HOME_PAGE
    });
  },

  enableHomeConfigureLink() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_UNABLE_CONFIGURE_LINK
    })
  },

  disableHomeConfigureLink() {
    AppDispatcher.handleViewAction({
      actionType: HomePageConstants.HOME_PAGE_DISABLE_CONFIGURE_LINK
    })
  },

};

export default HomePageActions;
