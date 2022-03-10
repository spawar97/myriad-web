import Store from '../stores/DispositionTermStore';
import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/DispositionTermConstants';

const DispositionTermActions = {
  addListener(callback) {
    Store.addChangeListener(callback);
  },

  removeListener(callback) {
    Store.removeChangeListener(callback);
  },

  fetchDispositionConfig() {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_FETCH_CONFIG,
    });
  },

  updateDispositionConfig(immEditedDispositions) {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_UPDATE_CONFIG,
      immDispositions: immEditedDispositions,
    });
  },


  deleteDispositionConfig(ids) {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_DELETE_CONFIG,
      ids: ids,
    });
  },

  createDispositions(immDispositions) {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_CREATE_CONFIG,
      immDispositions: immDispositions,
    });
  },

  fetchUSDMEvents() {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_FETCH_USDM_EVENTS,
    });
  },

  fetchCustomerEvents() {
    AppDispatcher.handleViewAction({
      actionType: actions.DISPOSITION_FETCH_CUSTOMER_EVENTS,
    });
  },
};

export default DispositionTermActions;
