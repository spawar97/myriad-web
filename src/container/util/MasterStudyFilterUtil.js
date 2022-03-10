import _ from 'underscore';
import Imm from "immutable";
import Util from './util';
import ExposureStoreKey from "../stores/constants/ExposureStoreKeys";
import StudiesUtil from "./StudiesUtil";


class MasterStudyFilterUtil {

  static isAllArchivedSelected(immSelectedStudies, immStudies) {
    const selectedArchivedStudies = immSelectedStudies.filter(study => study.isArchived);
    const allArchivedStudies = immStudies.filter(study => study.isArchived).toOrderedSet();
    return !allArchivedStudies.isEmpty() && Imm.is(selectedArchivedStudies, allArchivedStudies);
  }

  static isAllActiveSelected(immSelectedStudies, immStudies) {
    const selectedActiveStudies = immSelectedStudies.filter(study => !study.isArchived);
    const allActiveStudies = immStudies.filter(study => !study.isArchived).toOrderedSet();
    return !allActiveStudies.isEmpty() && Imm.is(selectedActiveStudies, allActiveStudies);
  }

  static getSelectedMasterStudyIds(cookies, immExposureStore) {
    const currentAccountId = immExposureStore.get(ExposureStoreKey.currentAccountId);
    const immSelectedStudies = Imm.fromJS(
      Util.getSessionFilterStudyNames(cookies, currentAccountId)
    );
    return immSelectedStudies.map(studyName => {
      return Util.getStudyIdFromName(immExposureStore, studyName);
    });
  }

  static getSelectedStudies(immExposureStore, cookies) {
    const immStudies = StudiesUtil.getImmStudies(immExposureStore).toJS();
    const filterCookieEntry = Util.getSessionFilterCookieEntry(cookies, 0, immExposureStore.get('currentAccountId'));
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    const immSelectedStudies = Imm.List(filter.itemsSelected).map(study => {
      const studyName = study;
      const studyId = Util.getStudyIdFromName(immExposureStore, studyName);
      return Imm.Map({value: studyId, label: studyName});
    });
    let studyList = (immSelectedStudies.toJS()).length > 0 ? immSelectedStudies.toJS() : immStudies;
    return studyList;
  }

}

export default MasterStudyFilterUtil;
