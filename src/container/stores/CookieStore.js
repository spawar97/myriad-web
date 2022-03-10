import _ from 'underscore';
import Cookies from 'js-cookie';

import Store from './Store';
import CookieConstants from '../constants/CookieConstants';
import ExposureAppConstants from '../constants/ExposureAppConstants';
import FilterUpdateTypes from  '../constants/FilterUpdateTypes';
import AppDispatcher from '../http/AppDispatcher';
import Util from '../util/util';

const CookieStore = _.extend({
  expireSessionFilters: function(callback) {
    Cookies.remove('sessionFilters', '', {path: '/'});
    Cookies.remove('studyCacheFilters', '', {path: '/'});
    Util.getGuardedCallback(callback)();
  },

  getCookies: function() {
    return Cookies.get();
  },

  /**
   * Session filters are now sub-keyed on the account ID. The reason we're doing that instead of just using a different
   * cookie key like `sessionFilters-accountId` is that we need the ability to expire *all* session filters regardless
   * of what account we're on, so we can clean up on exit.
   * @param sessionFilters
   * @param currentAccountId
   */
  setSessionFilters: function(sessionFilters, currentAccountId) {
    const sessionFiltersCrossAccounts = JSON.parse(Cookies.get('sessionFilters') || '{}');
    sessionFiltersCrossAccounts[currentAccountId] = sessionFilters;
    Cookies.set('sessionFilters', JSON.stringify(sessionFiltersCrossAccounts), {path: '/'});
  },

  resetAllSessionDynamicFilters: function(currentAccountId) {
    const sessionFilters = Util.getSessionFiltersFromCookie(currentAccountId);
    var sessionDynamicFilters = sessionFilters.sessionDynamicFilters;
    _.each(sessionDynamicFilters, function(filter) {
      switch (filter.filterState.dynamicFilterComponentType) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          filter.filterState.allSelected = true;
          filter.filterState.itemsSelected = [];
          break;
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          filter.filterState.lower = undefined;
          filter.filterState.upper = undefined;
          break;
      }
    });
    CookieStore.setSessionFilters(sessionFilters, currentAccountId);
  },

  updateSessionFilterFilterState: function(index, updateType, data, currentAccountId) {
    const sessionFilters = Util.getSessionFiltersFromCookie(currentAccountId);
    const originalEntry = sessionFilters.sessionDynamicFilters[index] || {};
    const filterState = originalEntry.filterState || {};
    let newFilterState = {};

    var itemsSelected;
    switch (updateType) {
      case FilterUpdateTypes.DROPDOWN_SELECT_ALL_VALUES:
        newFilterState = {
          itemsSelected: [],
          allSelected: true
        };
        break;
      case FilterUpdateTypes.DROPDOWN_SET_VALUES:
        itemsSelected = data || [];
        newFilterState = {
          allSelected: _.isEmpty(itemsSelected),
          itemsSelected: itemsSelected,
          nullExcluded: true
        };
        break;
      case FilterUpdateTypes.DROPDOWN_ADD_VALUE:
        itemsSelected = filterState.itemsSelected || [];
        itemsSelected.push(data.value);
        newFilterState = {
          allSelected: false,
          itemsSelected: itemsSelected
        };
        break;
      case FilterUpdateTypes.LIST_REMOVE_VALUE:
        itemsSelected = _.without(filterState.itemsSelected, data.value);
        newFilterState = {
          itemsSelected: itemsSelected,
          allSelected: _.isEmpty(itemsSelected)
        };
        break;
      case FilterUpdateTypes.RESET_FILTER:
        switch (filterState.dynamicFilterComponentType) {
          case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
          case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
            newFilterState = {
              itemsSelected: [],
              allSelected: true
            };
            break;
          case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
            newFilterState = {
              lower: undefined,
              upper: undefined
            };
            break;
        }
        break;
      case FilterUpdateTypes.SLIDER_UPDATE_FILTER_BOUNDS:
        newFilterState = {
          lower: data.lowerBound,
          upper: data.upperBound
        };
        break;
      case FilterUpdateTypes.TOGGLE_NULL:
        newFilterState = {nullExcluded: !filterState.nullExcluded};
        break;
    }
    if (originalEntry.filterState === undefined) {
        originalEntry.filterState = {};
    }
    _.extend(originalEntry.filterState, newFilterState);
    sessionFilters.sessionDynamicFilters[index] = originalEntry;
    CookieStore.setSessionFilters(sessionFilters, currentAccountId);
  },

  // Yellowfin study cache filters funtion
  setYellowfinStudyCacheFilters: function(studyCacheFilters, currentAccountId) {
    const studyCacheFiltersCrossAccounts = JSON.parse(Cookies.get('studyCacheFilters') || '{}');
    studyCacheFiltersCrossAccounts[currentAccountId] = studyCacheFilters;
    Cookies.set('studyCacheFilters', JSON.stringify(studyCacheFiltersCrossAccounts), {path: '/'});
  },

  getYellowfinStudyCacheFilters: function(currentAccountId) {
    const studyCacheFilters = _.isEmpty(Cookies.get('studyCacheFilters')) ? null : JSON.parse(Cookies.get('studyCacheFilters'));
    return studyCacheFilters && _.has(studyCacheFilters, currentAccountId) ? studyCacheFilters[currentAccountId] : {};
  },

  updateYellowfinStudyCacheFilters: function(currentAccountId, contentId, newFilterCache) {
    const studyCacheFilters = CookieStore.getYellowfinStudyCacheFilters(currentAccountId);
    studyCacheFilters[contentId] = newFilterCache;
    CookieStore.setYellowfinStudyCacheFilters(studyCacheFilters, currentAccountId);
  }
}, Store);

var _actions = {};

_actions[CookieConstants.COOKIE_EXPIRE_SESSION_FILTERS] = (action) => CookieStore.expireSessionFilters(action.callback);
_actions[CookieConstants.COOKIE_RESET_ALL_SESSION_DYNAMIC_FILTERS] = (action) => CookieStore.resetAllSessionDynamicFilters(action.currentAccountId);
_actions[CookieConstants.COOKIE_SET_SESSION_FILTERS] = (action) => CookieStore.setSessionFilters(action.sessionFilters, action.currentAccountId);
_actions[CookieConstants.COOKIE_UPDATE_SESSION_FILTER_FILTER_STATE] = (action) => CookieStore.updateSessionFilterFilterState(action.index, action.updateType, action.data, action.currentAccountId);
_actions[CookieConstants.COOKIE_UPDATE_YELLOWFIN_STUDY_CACHE_FILTERS] = (action) => CookieStore.updateYellowfinStudyCacheFilters(action.currentAccountId, action.contentId, action.newFilterCache);

CookieStore.dispatcherIndex = AppDispatcher.register(function(payload) {
  var action = payload.action;
  var cookies = Cookies.get();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!_.isEqual(Cookies.get(), cookies)) {
    CookieStore.emitChange();
  }
  return true;
});

module.exports = CookieStore;
