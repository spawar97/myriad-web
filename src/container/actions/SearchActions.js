import Store from '../stores/SearchStore';
import AppDispatcher from '../http/AppDispatcher';
import { ActionName } from '../constants/SearchConstants';

const SearchActions = {

  addListener(callback) {
    Store.SearchStore.addChangeListener(callback);
  },

  removeListener(callback) {
    Store.SearchStore.removeChangeListener(callback);
  },

  syncFiles(fileConfigMap) {
    AppDispatcher.handleViewAction({
      actionType: ActionName.SEARCH_STORE_SYNC_FILES,
      fileConfigMap,
    });
  },

  syncFile(fileConfig) {
    AppDispatcher.handleViewAction({
      actionType: ActionName.SEARCH_STORE_SYNC_FILE,
      fileConfig,
    });
  },

  removeFiles(fileIds) {
    AppDispatcher.handleViewAction({
      actionType: ActionName.SEARCH_STORE_REMOVE_FILES,
      fileIds,
    });
  },

  getFiles() {
    return Store.SearchStore.getFiles();
  },

  getOversightScorecard() {
    return Store.SearchStore.getOversightScorecard();
  },

  syncEmbeddedEntities(embeddedEntitySummaries) {
    AppDispatcher.handleViewAction({
      actionType: ActionName.SEARCH_STORE_SYNC_EMBEDDED_ENTITIES,
      embeddedEntitySummaries,
    });
  },

  getEmbeddedEntities() {
    return Store.SearchStore.getEmbeddedEntities();
  },

  fetchBotSuggestionSummary(selectedSuggestion) {
    return Store.SearchStore.fetchBotSuggestionSummaryConfigs(selectedSuggestion);
  }
};

export default SearchActions;
