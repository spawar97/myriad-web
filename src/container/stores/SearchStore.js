import _ from 'underscore';
import Imm from 'immutable';

import Store from './Store';
import AppDispatcher from '../http/AppDispatcher';
import keymirror from "keymirror";
import EntitySearchUtil from "../util/EntitySearchUtil";
import AccountUtil from "../util/AccountUtil";
import ReportUtil from "../util/ReportUtil";
import { AppRequestBackground } from "../http/AppRequest";
import GA from "../util/GoogleAnalytics";
import PermissionsUtil from "../util/PermissionsUtil";
import { FeatureListConstants } from "../constants/PermissionsConstants";
import { ActionName } from '../constants/SearchConstants';

let _immSearchStore = Imm.fromJS({});

const SearchStore = _.extend({

  init(immAppConfig) {
    const PERIOD_MILLISECONDS = this._getUserEntitySpecificSyncPeriod(immAppConfig) * 1000;
    const _doAsyncSearchDataRefresh = () => {
      SearchStore.fetchAll();
    };
    setInterval(_doAsyncSearchDataRefresh, PERIOD_MILLISECONDS);
  },

  getSearchStore() {
    return _immSearchStore;
  },

  _getUserEntitySpecificSyncPeriod(immAppConfig) {
    const currentAccountId = immAppConfig.get('currentAccountId');
    const instantSearchSyncPeriod = immAppConfig.getIn(
      ['accountMap', currentAccountId, 'account', 'instantSearchSyncPeriod'],
      immAppConfig.get('instantSearchSyncPeriodDefault')
    );
    return instantSearchSyncPeriod;
  },

  syncFile(fileConfig) {
    let item = EntitySearchUtil.transformExposureFile(fileConfig);
    let items = this.getFiles();
    items = this._updateById(items, item);
    _immSearchStore = _immSearchStore.set(Key.files, items);
  },

  syncFiles(fileConfigMap) {
    const immExposureFiles = EntitySearchUtil.transformExposureFiles(fileConfigMap);
    _immSearchStore = _immSearchStore.set(Key.files, immExposureFiles);
  },

  removeFiles(fileIds) {
    let items = this.getFiles();
    items = this._removeById(items, fileIds);
    _immSearchStore = _immSearchStore.set(Key.files, items);
  },

  getFiles() {
    return _immSearchStore.get(Key.files, Imm.List());
  },

  getOversightScorecard() {
    const immAppConfig = comprehend.globals.immAppConfig;
    if (AccountUtil.hasOversightScorecard(immAppConfig)
      && PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.OVERSIGHT_SCORECARD)) {
      _immSearchStore = EntitySearchUtil.transformOversightScorecardEntry(_immSearchStore);
      return _immSearchStore.get(Key.oversight, Imm.List());
    }
  },

  syncEmbeddedEntities(embeddedEntitySummaries) {
    const immEmbeddedFiles = EntitySearchUtil.transformEmbeddedFiles(embeddedEntitySummaries);
    _immSearchStore = _immSearchStore.set(Key.embedded, immEmbeddedFiles);
  },

  getEmbeddedEntities() {
    return _immSearchStore.get(Key.embedded, Imm.List());
  },

  _updateById(items, item) {
    const index = items.findIndex((element) => element.id === item.id);
    if (index === -1) {
      items = items.push(item);
    } else {
      items = items.set(index, item);
    }
    return items;
  },

  _removeById(items, ids) {
    return items.filter(item => !ids.includes(item.id));
  },

  fetchAll() {
    this.fetchFileConfigs();
    if (AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig)) {
      this.fetchEmbeddedEntitiesSummary();
    }
  },

  fetchFileConfigs() {
    this._fetchData(
      '/api/files',
      RequestKey.inFlightFileConfigsRequest,
      (data) => {
        const fileConfigsMapObject = ReportUtil.createFileConfigMapObject(data);
        const immFilesMap = Imm.fromJS(fileConfigsMapObject);
        SearchStore.syncFiles(immFilesMap);
      });
  },

  fetchBotSuggestionSummaryConfigs(selectedSuggestion) {
    const requestBody = {
      "text": selectedSuggestion,
      "meta": {
        "access_control": "admi",
        "context": "filter"
      }
    }
    let url = '/api/autoComplete';
    const result = AppRequest({ type: 'POST', url: url, data: JSON.stringify(requestBody) });
    result.then(
      data => {
        SearchStore.onAjaxCompletion();
        const botConfigsMapObject = ReportUtil.createBotConfigMapObject(data);
        const immBotMap = Imm.fromJS(botConfigsMapObject);
        SearchStore.syncBotSuggestion(immBotMap);
      }
    );
  },

  fetchEmbeddedEntitiesSummary() {
    this._fetchData(
      '/api/embedded/entities-summary',
      RequestKey.inFlightEmbeddedEntitiesSummaryRequest,
      (data) => {
        const summaries = Imm.fromJS(data.entityMap);
        SearchStore.syncEmbeddedEntities(summaries);
      })
  },

  _fetchData(url, requestKey, callback) {
    this._abortExistingOutstandingRequest(requestKey);

    const newRequest = AppRequestBackground({ type: 'GET', url: url });
    newRequest.then(
      data => {
        callback(data);
        SearchStore._deleteOutstandingRequest(requestKey);
        SearchStore.onAjaxCompletion();
      },
      jqXHR => {
        // ATTENTION: do not log aborted actions from SearchStore
        if (jqXHR.statusText !== 'abort') {
          SearchStore._deleteOutstandingRequest(requestKey);
          console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
          GA.sendAjaxException(`GET ${url} failed`);
        }
      }
    );

    this._setOutstandingRequest(requestKey, newRequest);
  },

  _abortExistingOutstandingRequest(key) {
    const oldRequest = this._getOutstandingRequest(key);
    if (oldRequest) {
      // unset before abort, as abort is async and will happen eventually
      this._deleteOutstandingRequest(key);
      oldRequest.abort();
    }
  },

  _getOutstandingRequest(requestName) {
    return _immSearchStore.getIn([Key.outstandingRequests, requestName]);
  },

  _setOutstandingRequest(requestName, request) {
    _immSearchStore = _immSearchStore.setIn([Key.outstandingRequests, requestName], request);
  },

  _deleteOutstandingRequest(requestName) {
    _immSearchStore = _immSearchStore.deleteIn([Key.outstandingRequests, requestName]);
  },

}, Store);

const Key = keymirror({
  files: null,
  embedded: null,
  outstandingRequests: null,
  oversight: null
});

const RequestKey = keymirror({
  inFlightFileConfigsRequest: null,
  inFlightEmbeddedEntitiesSummaryRequest: null,
});


const _actions = {
  [ActionName.SEARCH_STORE_SYNC_FILES]: action => SearchStore.syncFiles(action.fileConfigMap),
  [ActionName.SEARCH_STORE_REMOVE_FILES]: action => SearchStore.removeFiles(action.fileIds),
  [ActionName.SEARCH_STORE_SYNC_FILE]: action => SearchStore.syncFile(action.fileConfig),
  [ActionName.SEARCH_STORE_SYNC_EMBEDDED_ENTITIES]: action =>
    SearchStore.syncEmbeddedEntities(action.embeddedEntitySummaries),
};

SearchStore.dispatcherIndex = AppDispatcher.register(function (payload) {
  const { action } = payload;
  const immSearchStore = SearchStore.getSearchStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }

  if (!Imm.is(immSearchStore, _immSearchStore)) {
    SearchStore.emitChange();
  }

  return true;
});

module.exports.SearchStore = SearchStore;
