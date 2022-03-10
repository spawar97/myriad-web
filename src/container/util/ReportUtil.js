import Imm from 'immutable';
import _ from "underscore";
import Util from "./util";

class ReportUtil{
  static getReportOrDashboardId(params, query, immExposureStore) {
    if (params.fileId) {
      return params.fileId;
    } else if (params.taskId) {
      let immTask = immExposureStore.getIn(['tasks', params.taskId, 'task', 'coreTaskAttributes'], Imm.Map());
      return immTask.get('reportId') || immTask.get('dashboardId');
    } else if (immExposureStore.get('activeFocusBreadcrumbsAnalytic', '') !== '') {
      return immExposureStore.get('activeFocusBreadcrumbsAnalytic');
    } else {
      return query.reportId || query.dashboardId;
    }
  }

  static createFileConfigMapObject(fileConfigs) {
    return _.reduce(fileConfigs, function(memo, fileWrapper) {
      const fileId = fileWrapper.file.id;
      let updateFileWrapper;
      if(fileWrapper.file.tags && fileWrapper.file.tags.length > 0) {
         updateFileWrapper = Util.updateRankConfig(fileWrapper);
      } else {
        updateFileWrapper = fileWrapper;
      }
      memo[fileId] = updateFileWrapper.file;
      return memo;
    }, {});
  } 
}

export default ReportUtil;
