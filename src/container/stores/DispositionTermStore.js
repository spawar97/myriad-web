import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';
import keymirror from 'keymirror';

import Store from './Store';
import AppDispatcher from '../http/AppDispatcher';
import {actions, EventKey, DispositionState} from '../constants/DispositionTermConstants';
import AppRequest from '../http/AppRequest';
import ExposureActions from '../actions/ExposureActions';
import FrontendConstants from "../constants/FrontendConstants";
import StatusMessageTypeConstants from "../constants/StatusMessageTypeConstants";

const defaultStore = Imm.fromJS({
  //List of configured disposition terms
  dispositions: [],
  //List of available usdm events
  usdmEvents: [],
  //List of available customer events
  customerEvents: [],
  //List of outstanding backend requests
  outstandingRequests: [],
});

let _immStore = defaultStore;

const DispositionTermStore = _.extend({
  getStore() {
    return _immStore;
  },

  resetStore() {
    _immStore = defaultStore;
  },

  fetchUSDMEvents() {
    const url = '/api/admin/dispositions/events';
    const newRequest = AppRequest({type: 'GET', url: url});
    const {fetchUsdmEvents} = RequestKey;
    DispositionTermStore.initializeRequest(fetchUsdmEvents);
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.usdmEvents, Imm.fromJS(responseData));
        DispositionTermStore.deleteOutstandingRequest(fetchUsdmEvents);
        DispositionTermStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DispositionTermStore.deleteOutstandingRequest(fetchUsdmEvents);
        DispositionTermStore.onAjaxCompletion();
      }
    );

    DispositionTermStore.startOutstandingRequest(fetchUsdmEvents, newRequest);
  },

  fetchCustomerEvents() {
    const url = '/api/admin/dispositions/customer/events';
    const newRequest = AppRequest({type: 'GET', url: url});
    const {fetchCustomerEvents} = RequestKey;
    DispositionTermStore.initializeRequest(fetchCustomerEvents);
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.customerEvents, Imm.fromJS(responseData));
        DispositionTermStore.deleteOutstandingRequest(fetchCustomerEvents);
        DispositionTermStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DispositionTermStore.deleteOutstandingRequest(fetchCustomerEvents);
        DispositionTermStore.onAjaxCompletion();
      }
    );

    DispositionTermStore.startOutstandingRequest(fetchCustomerEvents, newRequest);
  },

  fetchDispositions() {
    const url = '/api/admin/dispositions';
    const {fetchDispositions} = RequestKey;
    DispositionTermStore.initializeRequest(fetchDispositions);
    const newRequest = AppRequest({type: 'GET', url: url});
    newRequest.then(
      responseData => {
        _immStore = _immStore.set(Key.dispositions, Imm.fromJS(responseData));
        DispositionTermStore.deleteOutstandingRequest(fetchDispositions);
        DispositionTermStore.onAjaxCompletion();
      },
      jqXHR => {
        GA.sendAjaxException(`GET ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DispositionTermStore.deleteOutstandingRequest(fetchDispositions);
        DispositionTermStore.onAjaxCompletion();
      }
    );

    DispositionTermStore.startOutstandingRequest(fetchDispositions, newRequest);
  },

  updateDispositions(immEditedDispositions) {
    const immBaseDispositions = _immStore.get(Key.dispositions);
    const immDispositionsToUpdate = immEditedDispositions.filter(immDisposition => {
      const immBaseDisposition = immBaseDispositions.find(base => base.get('id', '') === immDisposition.get('id', ''));
      return !Imm.is(immBaseDisposition, immDisposition);
    });
    if(!!immDispositionsToUpdate && !immDispositionsToUpdate.isEmpty()) {
      const url = '/api/admin/dispositions';
      const {updateDispositions} = RequestKey;
      DispositionTermStore.initializeRequest(updateDispositions);
      const newRequest = AppRequest({
        type: 'PUT',
        url: url,
        data: JSON.stringify(immDispositionsToUpdate.toJS())});
      newRequest.then(
        responseData => {
          _immStore = _immStore.set(Key.dispositions, immEditedDispositions);
          ExposureActions.createStatusMessage(
            FrontendConstants.UPDATE_DISPOSITIONS_SUCCESSFUL,
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
          DispositionTermStore.deleteOutstandingRequest(updateDispositions);
          DispositionTermStore.onAjaxCompletion();
        },
        jqXHR => {
          GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
          ExposureActions.createStatusMessage(
            FrontendConstants.UNEXPECTED_SERVER_ERROR,
            StatusMessageTypeConstants.WARNING
          );
          DispositionTermStore.deleteOutstandingRequest(updateDispositions);
          DispositionTermStore.onAjaxCompletion();
        }
      );

      DispositionTermStore.startOutstandingRequest(updateDispositions, newRequest);
    }
  },

  createDispositions(immDispositions) {
    const url = '/api/admin/dispositions';
    const {createDispositions} = RequestKey;
    DispositionTermStore.initializeRequest(createDispositions);
    const newRequest = AppRequest({
      type: 'POST',
      url: url,
      data: JSON.stringify(immDispositions)});
    newRequest.then(
      responseData => {
        ExposureActions.createStatusMessage(
          FrontendConstants.UPDATE_DISPOSITIONS_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        DispositionTermStore.deleteOutstandingRequest(createDispositions);
        DispositionTermStore.onAjaxCompletion();
        DispositionTermStore.fetchDispositions();
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DispositionTermStore.deleteOutstandingRequest(createDispositions);
        DispositionTermStore.onAjaxCompletion();
      }
    );

    DispositionTermStore.startOutstandingRequest(createDispositions, newRequest);
  },

  deleteDispositions(deleteIds) {
    const url = '/api/admin/dispositions';
    const {updateDispositions} = RequestKey;
    DispositionTermStore.initializeRequest(updateDispositions);
    const newRequest = AppRequest({
      type: 'DELETE',
      url: url,
      data: JSON.stringify(deleteIds)});
    newRequest.then(
      responseData => {
        ExposureActions.createStatusMessage(
          FrontendConstants.UPDATE_DISPOSITIONS_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        );
        DispositionTermStore.deleteOutstandingRequest(updateDispositions);
        DispositionTermStore.onAjaxCompletion();
        DispositionTermStore.fetchDispositions();
      },
      jqXHR => {
        GA.sendAjaxException(`PUT ${url} failed.`, jqXHR.status);
        ExposureActions.createStatusMessage(
          FrontendConstants.UNEXPECTED_SERVER_ERROR,
          StatusMessageTypeConstants.WARNING
        );
        DispositionTermStore.deleteOutstandingRequest(updateDispositions);
        DispositionTermStore.onAjaxCompletion();
      }
    );

    DispositionTermStore.startOutstandingRequest(updateDispositions, newRequest);
  },

  startOutstandingRequest(requestName, request) {
    _immStore = _immStore.setIn(['outstandingRequests', requestName], request);
  },

  deleteOutstandingRequest(requestName) {
    _immStore = _immStore.deleteIn(['outstandingRequests', requestName]);
  },

  getOutstandingRequest(requestName) {
    return _immStore.getIn(['outstandingRequests', requestName]);
  },

  initializeRequest(requestName) {
    const request = DispositionTermStore.getOutstandingRequest(requestName);
    if (!!request) {
      request.abort();
    }

    DispositionTermStore.deleteOutstandingRequest(requestName);
  },
}, Store);

const Key = keymirror({
  dispositions: null,
  usdmEvents: null,
  outstandingRequests: null,
});

const RequestKey = keymirror({
  fetchDispositions: null,
  fetchUsdmEvents: null,
  fetchCustomerEvents: null,
  updateDispositions: null,
  createDispositions: null,
});

const _actions = {
  [actions.DISPOSITION_FETCH_CONFIG]: action => DispositionTermStore.fetchDispositions(),
  [actions.DISPOSITION_UPDATE_CONFIG]: action => DispositionTermStore.updateDispositions(action.immDispositions),
  [actions.DISPOSITION_CREATE_CONFIG]: action => DispositionTermStore.createDispositions(action.immDispositions),
  [actions.DISPOSITION_DELETE_CONFIG]: action => DispositionTermStore.deleteDispositions(action.ids),
  [actions.DISPOSITION_FETCH_USDM_EVENTS]: action => DispositionTermStore.fetchUSDMEvents(),
  [actions.DISPOSITION_FETCH_CUSTOMER_EVENTS]: action => DispositionTermStore.fetchCustomerEvents(),
};

DispositionTermStore.dispatcherIndex = AppDispatcher.register((payload) => {
  const {action} = payload;
  const immDispositionStore = DispositionTermStore.getStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!Imm.is(immDispositionStore, _immStore)) {
    DispositionTermStore.emitChange();
  }

  return true;
});

export default DispositionTermStore;
export {Key, RequestKey};
module.exports.GetOutstandingRequest = DispositionTermStore.getOutstandingRequest;
