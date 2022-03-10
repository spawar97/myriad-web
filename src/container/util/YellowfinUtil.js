import _ from 'underscore';
import Imm from 'immutable';
import AppRequest from '../http/AppRequest';
import GA from './GoogleAnalytics';

/**
 * Utility class to contain generic Yellowfin integration points.
 *
 * As integration expands on the frontend of the application, please extend this utility class as necessary to perform
 * necessary functions.
 *
 */
class YellowfinUtil {
  /**
   * Sends an array of filter values to Yellowfin so that they get applied to whichever specific report object we're currently displaying
   * within the EmbeddedReportViewWidget. Used to dynamically apply filters from the app from various integration points across the app.
   *
   * @param yellowfinFilters <Array(YellowfinFilter)>   - List of YellowfinFilters to send to Yellowfin
   * @param immExposureStore <ExposureStore>            - Exposure Store
   */
  static sendYellowfinFilters(yellowfinFilters, immExposureStore) {
    // Verify each instance of the array of filters is a Yellowfin Filter and that we have filter data available
    if (yellowfinFilters && yellowfinFilters.length > 0 && !_.reduce(yellowfinFilters, (memo, filter) => memo && filter instanceof YellowfinFilter, true)) {
      console.log('ERROR: incorrect embedded filter values provided, cannot apply filters.');
      return;
    }

    const yellowfinUrl = immExposureStore.get('yellowfinUrl', '');
    if (!yellowfinUrl) {
      console.log('ERROR: Unable to determine URL for embedded application. Cannot send filter values.');
      return;
    }

    window.Yellowfin.eventListener.sendMessage(yellowfinUrl, 'set-filters', {
      filterData: yellowfinFilters
    });
  }

    /**
   * Get the list of Yellowfin reports the user has access to & their UUIDs. This will be used to build out the
   * drilldown list for the CRO scorecards.
   */
  static fetchYellowfinReportMap(callback) {
    const url = '/api/report-uuids';
    const request = {
      type: 'GET',
      url: url
    };

    AppRequest(request).then(
      reportUUIDMap => {
        let map = {};
        _.forEach(reportUUIDMap.reportMap, (report) => map[report.reportName + '_' + report.reportType] = report.reportUUID);
        callback(map);
      },
      () => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
      }
    )
  }

  static fetchYellowfinReportIds(callback) {
    const url = '/api/report-uuids';
    const request = {
      type: 'GET',
      url: url
    };

    AppRequest(request).then(
      reportUUIDMap => {
        const reportIds = reportUUIDMap.reportMap.map(report => report.reportUUID);
        callback(reportIds);
      },
      () => {
        console.log(`%cERROR: GET ${url} failed`, 'color: #E05353');
        GA.sendAjaxException(`GET ${url} failed`);
      }
    )
  }

  static getYellowfinReportName(immExposureStore, uuid) {
    let reportName = '';
    const immYellowfinEntities = immExposureStore.getIn(['embeddedEntitiesSummary', 'data'], Imm.List());
    const immFoundEntity = immYellowfinEntities.find(entity => entity.get('entityUuid', null) == uuid);
    if (immFoundEntity != null) {
      reportName = immFoundEntity.get('entityName', '');
    }
    return reportName;
  }

  /**
   * Gets the yellowfin app URL from relevant application configuration. If we are within the context of the app,
   * we will be able to retrieve this from the comprehend globals object, otherwise from outside of the app the
   * appConfig parameter must be set.
   *
   * @param appConfig (Imm.Map, optional) - The application configuration. Should only be used if outside of the context of the application
   * @returns {string} - The URL for the Yellowfin instance corresponding to the current running application
   */
  static getYellowfinAppUrl(appConfig = null) {
    const immAppConfig = appConfig
      ? appConfig
      : comprehend.globals.immAppConfig;

    const yellowfinHost = immAppConfig.get('yellowfinHost', null);
    const yellowfinPort = immAppConfig.get('yellowfinPort', null);
    const yellowfinProtocol = immAppConfig.get('yellowfinProtocol', null);

    // Construct the Yellowfin url
    return (yellowfinHost && yellowfinPort && yellowfinProtocol)
      ? `${yellowfinProtocol}${yellowfinHost}:${yellowfinPort}`
      : '';
  }
}

/**
 * Class to represent filter names / filter values for the purpose of sending those to Yellowfin to apply to any
 * specific report / dashboard object.
 *
 * @property filterNames <Array(String)> - Display name(s) for the filter which should be set. If multiple names are specified,
 *                                           will attempt to find any filter with the specified name. This is to handle the case
 *                                           where a filter could have multiple names across different report objects.
 *                                           For example: Some reports use 'Site', others use 'Site Name' for the sitename filter.
 *                                                        The filter should be applied to the filter that has either name
 *
 * @property filterValues <Array(String)> - The string representation for the filter values which should be set to the specified
 *                                          filter defined by filterNames
 */
class YellowfinFilter {
  /**
   * Instantiate the object
   * @param filterNames   - Display names for the filters to set
   * @param filterValues  - String representation of filter values to apply to said filterNames
   */
  constructor(filterNames, filterValues) {
    this.filterNames = filterNames;
    this.filterValues = filterValues;
  }
}

export {
  YellowfinFilter, YellowfinUtil
};
