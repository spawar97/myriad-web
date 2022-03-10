import Imm from 'immutable';
import Util from './util';

class StudioUtils {
  createImmCheckedFiles(immCheckedFileIds, immExposureStore) {
    if (!immCheckedFileIds || immCheckedFileIds.isEmpty()) {
      return Imm.List();
    }
    return immCheckedFileIds.map(function(fileId) {
      return Imm.Map({
        id: fileId,
        title: immExposureStore.getIn(['fileConfigs', fileId, 'title'], '-'),
        comprehendSchemaId: Util.getComprehendSchemaIdFromFile(immExposureStore.getIn(['fileConfigs', fileId])),
        checked: false
      });
    });
  }

  getCommonComprehendSchemaId(immCheckedFiles) {
    let comprehendSchemaIds = immCheckedFiles.map((immCheckedFile) => immCheckedFile.get('comprehendSchemaId'));
    // When reports in the dashboard have different schema, return null.
    // Otherwise, return the common `comprehendSchemaId` for all reports in this dashboard.
    return comprehendSchemaIds.every((id) => id === comprehendSchemaIds.get(0)) ? comprehendSchemaIds.get(0) : null;
  }
}

// Note this pattern will allow for this StudioUtils module to be imported as a singleton class
export let studioUtils = new StudioUtils();
