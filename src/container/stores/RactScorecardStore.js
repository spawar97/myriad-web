import _ from 'underscore';
import Imm from 'immutable';
import GA from '../util/GoogleAnalytics';
import Store from './Store';
import { AppRequestByFetch } from '../http/AppRequest';
import ExposureActions from '../actions/ExposureActions';
import ExposureConstants from '../constants/ExposureConstants';
import FrontendConstants from "../constants/FrontendConstants";
import { RactStoreKeys, Key } from "../constants/RactConstant";
import StatusMessageTypeConstants from "../constants/StatusMessageTypeConstants";
import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/RactConstant';
import AppRequest from '../http/AppRequest';
import Util from "../util/util";


const defaultStore = Imm.fromJS({
  results: {},
  rawResults: {}, // raw scores
  isRactConsoleDataLoaded: false,
  isRactAssigned: false,
  OOBCategoriesData: [],
  OOBSubCategoriesData:[], 
  primeTableData: []
});

let _immStore = defaultStore;

const RactScorecardStore = _.extend({
  getStore() {
    return _immStore;
  },

  resetStore() {
    _immStore = defaultStore;
  },

  resetRactConsoleData() {
    _immStore = _immStore.set(RactStoreKeys.IS_RACT_CONSOLE_DATA_LOADED, false);
  },

  resetIsRactAssigned() {
    _immStore = _immStore.set(RactStoreKeys.IS_RACT_ASSIGNED, false);
  },

  setLoadedTableData(tableData) {
    _immStore = _immStore.set('primeTableData', Imm.fromJS(tableData));
  },

  async fetchRactConsoleData(studies) {
    let url = '/api/ract/console';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(studies),
    };
    await AppRequestByFetch(url, requestOption).then(async (data) => {
      let ractConsoleData = data ? Imm.fromJS(data) : Imm.List();
      _immStore = await _immStore.set(RactStoreKeys.RACT_CONSOLE_DATA, ractConsoleData);
      _immStore = _immStore.set(RactStoreKeys.IS_RACT_CONSOLE_DATA_LOADED, true);
      if (studies.studyIds.length === 0) {
        let studies = [];
        studies = Imm.fromJS(ractConsoleData.map(a => studies[a.get('studyid')] = a.get('studyname')));
        _immStore = await _immStore.set(RactStoreKeys.RACT_STUDY_FILTER_ARRAY, studies);
      }
      RactScorecardStore.onAjaxCompletion();
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchCreateTemplateData() {
    let url = '/api/ract/riskcategories';
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      let allOOBCategories = [];
      let allOOBSubCategories = [];
      let array = data.map(val =>{
        allOOBCategories.push((val.name).toLowerCase());
        val.riskSubCategories.map(subcategory => {
          allOOBSubCategories.push((subcategory.name).toLowerCase())
        })
        return val;
      })
      let allOOBCategoriesData = Imm.fromJS(allOOBCategories);
      let allOOBSubCategoriesData = Imm.fromJS(allOOBSubCategories);
      _immStore = _immStore.set("OOBCategoriesData", allOOBCategoriesData);
      _immStore = _immStore.set("OOBSubCategoriesData", allOOBSubCategoriesData);

      return data
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchRactTemplates() {
    let url = '/api/ract/template-list';
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      let studyData = Imm.fromJS(data);
      _immStore = _immStore.set("ractTemplates", studyData);
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async assignRactTemplate(assignRactData) {
    let url = '/api/ract/study';
    let requestOption = {
      method: 'PUT',
      body: JSON.stringify(assignRactData),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      _immStore = _immStore.set(RactStoreKeys.IS_RACT_ASSIGNED, true);
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchRactStudies() {
    let url = '/api/ract/custom-study';
    let requestOption = {
      method: 'GET',
    };
    await AppRequestByFetch(url, requestOption).then(data => {
      let studyData = Imm.fromJS(data);
      _immStore = _immStore.set("ractStudies", studyData);
      RactScorecardStore.onAjaxCompletion();
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async createRactStudies(studyData) {
    let url = '/api/ract/custom-study';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(studyData),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      _immStore = _immStore.set(RactStoreKeys.IS_RACT_ASSIGNED, true);
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async createNewRactTemplate(ractData) {
    let url = '/api/ract/create';
    try {
      let requestOption = {
        method: 'POST',
        body: JSON.stringify(ractData),
      };
      const response = await AppRequestByFetch(url, requestOption)
      return response
    } catch (error) {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    }
  },

  async fetchAssessmentData(ractID) {
    let url = `/api/ract/assessment/${ractID}`;
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(res => {
      if (res.ractCategoryWrapper) {
        return res;
      } else {
        throw new Error
      }
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async saveAssessmentData(studyData) {
    let url = '/api/ract/assessment';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(studyData),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async addFunctionPlan(functionalPlan) {
    let url = '/api/ract/function-plan';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(functionalPlan),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async addMitigationAction(mitigationAction) {
    let url = '/api/ract/mitigation-action';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(mitigationAction),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async signoffReviewSubmit(data) {
    let url = '/api/ract/sign-off';
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(data),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchUsers() {
    let url = '/api/users-info';
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async assignUsersToRactTemplate(data) {
    let url = '/api/ract/assign-user';
    try {
      let requestOption = {
        method: 'POST',
        body: JSON.stringify(data)
      };
      const response = await AppRequestByFetch(url, requestOption)
      return response
    } catch (error) {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    }
  },

  async reviewAssessmentUserDueDateExpired(param) {
    let {ractId, userId} = param;
    let url = `/api/ract/check-status/${ractId}?userId=${userId}`;
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async reassignAssessment(data) {
    let url = `/api/ract/reassign-user`;
    let requestOption = {
      method: 'POST',
      body: JSON.stringify(data),
    };
    return await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchRactTemplateData(ractTemplateId) {
    let url = `/api/ract/template/${ractTemplateId}`;
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(res => {
      return res;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },
  async deleteRactTemplates(ractTemplateId) {
    let url = `/api/ract/template/${ractTemplateId}`;
    let requestOption = {
      method: 'DELETE',
    };
    await AppRequestByFetch(url, requestOption).then(data => {
      return data;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  startDrillLoading(fileId) {
    _immStore = _immStore.set(Key.loadingFileDrillDownId, fileId);
  },

  finishDrillLoading() {
    _immStore = _immStore.delete(Key.loadingFileDrillDownId);
    RactScorecardStore.onAjaxCompletion();
  },

  handleDrilldown(immEntity, params, drilldownHelper) {
    const doDrillDown = (immFile) => {
      const fileId = immFile.get('id');
      const url = `/api/files/${fileId}/drilldown-data`;
      RactScorecardStore.startDrillLoading(fileId);
      AppRequest({type: 'GET', url: url, data: params}).then(
        (data) => {
          if (data.drilldowns.rows.length) {
            const values = Object.values(params).join(', ');
            const fileTitle = immFile.get('title');
            const chartDrilldownKey = `${values}: ${fileTitle}`;
            const schemaId = Util.getComprehendSchemaIdFromFile(immFile);
            RactScorecardStore.finishDrillLoading(fileId);
            ExposureActions.setFileId(fileId, immFile);
            ExposureActions.drilldownUpdateCurrentSelectionCondition(fileId, chartDrilldownKey,
            data.drilldowns.rows.map(row => row.drilldown));
            ExposureActions.drilldownHandleRelatedFile(fileId, undefined, chartDrilldownKey, schemaId,
              drilldownHelper);
          }
        },
        () => {
          RactScorecardStore.finishDrillLoading(fileId);
          GA.sendAjaxException(`GET ${url} failed`);
        }
      );
    };

    if (immEntity.get('id')) {
      doDrillDown(immEntity);
    } else {
      const fileId = immEntity.get('entityId');
      const url = '/api/files/' + fileId;
      RactScorecardStore.startDrillLoading(fileId);
      AppRequest({type: 'GET', url: url})
        .then((fileWrapper) => doDrillDown(Imm.fromJS(fileWrapper.file)))
        .catch(
          () => {
            RactScorecardStore.finishDrillLoading(fileId);
            GA.sendAjaxException(`GET ${url} failed`);
          }
        );
    }
  },

  async fetchRactVersionDetails(studyId) {
    let url = `/api/ract/version-detail/${studyId}`;
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(res => {
      return res;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  async fetchRactVersionDiff(nextRactId, prevRactId) {
    let url = `/api/ract/assessment-diff/${nextRactId}/${prevRactId}`;
    let requestOption = {
      method: 'GET',
    };
    return await AppRequestByFetch(url, requestOption).then(res => {
      return res;
    }).catch(error => {
      GA.sendAjaxException(`Get ${url} failed.`, error.status);
      ExposureActions.createStatusMessage(
        FrontendConstants.UNEXPECTED_SERVER_ERROR,
        StatusMessageTypeConstants.WARNING,
      );
    });
  },

  storeHighchartThis(that) {
    _immStore = _immStore.set('highchartThis', that);
  },

  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener(callback) {
    this.removeListener(CHANGE, callback);
  },

  getAll() {
    return _immStore.toJS().primeTableData;
  },

}, Store);

const _actions = {
  [actions.RACT_HANDLE_DRILLDOWN]: action =>  RactScorecardStore.handleDrilldown(action.file, action.params, action.drilldownHelper),
  [ExposureConstants.EXPOSURE_PRIME_LOADED]: action => RactScorecardStore.storeHighchartThis(action.data),
  [actions.PRIME_TABLE_DATA]: action => RactScorecardStore.setLoadedTableData(action.tableData),
};

RactScorecardStore.dispatcherIndex = AppDispatcher.register((payload) => {
  const {action} = payload;
  const immHomePageStore = RactScorecardStore.getStore();
  if (_actions[action.actionType]) {
    _actions[action.actionType](action);
  }
  if (!Imm.is(immHomePageStore, _immStore)) {
    RactScorecardStore.emitChange();
  }

  return true;
});

export default RactScorecardStore;

