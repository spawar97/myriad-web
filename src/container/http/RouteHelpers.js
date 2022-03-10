var ExposureAppConstants = require('../constants/ExposureAppConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');

module.exports = {
  /* Return the named route for a given file type. */
  getRouteForFileType: function(fileType) {
    var route = null;
    switch (fileType) {
      case ExposureAppConstants.FILE_TYPE_REPORT:
        route = RouteNameConstants.EXPOSURE_REPORTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_QUALITY_AGREEMENT:
        route = RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        route = RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_MONITOR:
        route = RouteNameConstants.EXPOSURE_MONITORS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_BUILTIN:
        route = RouteNameConstants.EXPOSURE_BUILTIN_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_FOLDER:
        route = RouteNameConstants.EXPOSURE_FOLDERS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_TASK:
        route = RouteNameConstants.EXPOSURE_TASKS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT:
        route = RouteNameConstants.EXPOSURE_EMBEDDED_REPORTS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD:
        route = RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW;
        break;
      case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
        route = RouteNameConstants.EXPOSURE_DATA_REVIEW_SHOW;
        break;
    }
    return route;
  }
};
