import CookieConstants from '../constants/CookieConstants';
import AppDispatcher from '../http/AppDispatcher';

const CookieActions = {
  expireSessionFilters: function(callback) {
    AppDispatcher.handleViewAction({
      actionType: CookieConstants.COOKIE_EXPIRE_SESSION_FILTERS,
      callback
    });
  },

  resetAllSessionDynamicFilters: function(currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: CookieConstants.COOKIE_RESET_ALL_SESSION_DYNAMIC_FILTERS,
      currentAccountId: currentAccountId
    });
  },

  setSessionFilters: function(sessionFilters, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: CookieConstants.COOKIE_SET_SESSION_FILTERS,
      sessionFilters: sessionFilters,
      currentAccountId: currentAccountId
    });
  },

  updateSessionFilterFilterState: function(index, updateType, data, currentAccountId) {
    AppDispatcher.handleViewAction({
      actionType: CookieConstants.COOKIE_UPDATE_SESSION_FILTER_FILTER_STATE,
      index: index,
      updateType: updateType,
      data: data,
      currentAccountId: currentAccountId
    });
  },

  updateYellowfinStudyCacheFilters: function(currentAccountId, contentId, newFilterCache) {
    AppDispatcher.handleViewAction({
      actionType: CookieConstants.COOKIE_UPDATE_YELLOWFIN_STUDY_CACHE_FILTERS,
      contentId: contentId,
      newFilterCache: newFilterCache,
      currentAccountId: currentAccountId
    });
  }
};

module.exports = CookieActions;
