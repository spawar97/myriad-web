import Imm from 'immutable';

/**
 * Module containing utility functions for checking account information for the currently accessed account,
 * such as whether the account is a legacy (Yutani) account, whether the user has specific privileges (isAdmin),
 * or whether the account has specific packages or features.
 */
var AccountUtil = {

  /**
   * Defines the list of packages that are available / defined by our application.
   * Keep in sync with Config.scala
   */
  accountFeatures: {
    DISABLE_HOME_PAGE: 'disable_home_page',
    CLINOPS_INSIGHT_LEFTNAV_BUTTON: 'clinops_insights_leftnav_button',
    CUSTOM_HELP_COOKIE_PREFIX: 'custom_help_cookie_',
    HOME_PAGE_DEFAULT_MY_DASHBOARDS: 'home_page_default_my_dashboards',
    DISABLE_V3_BREADCRUMBS: "disable_v3_breadcrumbs",
    MASTER_STUDY_FILTER_ALL_SELECT_DEFAULT: 'master_study_filter_all_select_default',
    RACT: 'ract',
  },

  /**
   * Checks if the account is a legacy / Yutani / V1 account
   */
  isLegacyAccount: function(immAdminStore) {
    return immAdminStore.getIn(['accountMap', immAdminStore.get('currentAccountId'), 'account', 'isLegacy'], false);
  },

  /**
   * Returns whether the current logged in user is an administrator
   */
  isAdmin: function(immExposureStore) {
    return AccountUtil.hasPrivilege(immExposureStore, 'isAdmin');
  },

  /**
   * Checks if for specific priviliges, such as whether the user is an admin
   */
  hasPrivilege: function(immExposureStore, privilege) {
    return immExposureStore.getIn(['accountMap', immExposureStore.get('currentAccountId'), privilege], false);
  },


  /**
   * Will check the current app config to see whether a specific package is enabled on the given account
   * @param immAppConfig - The app config
   * @param packageName - The name of the package to check for
   * @returns {boolean|*}
   */
  hasPackage: function(immAppConfig, packageName) {
    return immAppConfig.get('accountPackages', [])
      .some(function(accountPackage) {
        return accountPackage.get('name', '') === packageName;
      })
  },

  /**
   * Will check to see if a specific feature is enabled. Features are similar to packages but should be considered smaller scale,
   * and not large packages of functionality
   * @param immAppConfig - The app config
   * @param featureName - Name of the feature to check for
   * @returns {*}
   */
  hasFeature: function(immAppConfig, featureName) {
    return immAppConfig.get('accountFeatures', Imm.List())
      .contains(featureName);
  },

  /**
   * Will return the list of features enabled on the current account.
   * @param immAppConfig - The app Config
   * @returns Imm.List - The list of features
   */
  getFeatureList: function(immAppConfig) {
    return immAppConfig.get('accountFeatures', Imm.List());
  },

  /**
   * Checks to see if the current account has SSO enabled
   * @param immAppConfig - App config
   * @returns {bool} - Whether SSO is configured on the current account
   */
  hasSSOEnabled: function(immAppConfig) {
    const currentAccountId = immAppConfig.get('currentAccountId', '');
    const accountInfo = immAppConfig.getIn(['accountMap', currentAccountId, 'account'], Imm.Map());

    return accountInfo.get('idPUrl', false);
  },

  hasApiAccess: function(immAppConfig) {
    return AccountUtil.hasFeature(immAppConfig, 'external_api_access');
  },

  hasHomePageAccess: function(immAppConfig) {
    return !AccountUtil.hasFeature(immAppConfig, AccountUtil.accountFeatures.DISABLE_HOME_PAGE);
  },

  hasV3BreadcrumbsAccess: function(immAppConfig) {
    return !AccountUtil.hasFeature(immAppConfig, AccountUtil.accountFeatures.DISABLE_V3_BREADCRUMBS);
  },

  hasClinopsInsightsLeftNav: function(immAppConfig) {
    return AccountUtil.hasKPIStudio(immAppConfig)
      && AccountUtil.hasFeature(immAppConfig, AccountUtil.accountFeatures.CLINOPS_INSIGHT_LEFTNAV_BUTTON);
  },

  hasHomePageDefaultMyDashboards(immAppConfig) {
    return AccountUtil.hasKPIStudio(immAppConfig)
      && AccountUtil.hasFeature(immAppConfig, AccountUtil.accountFeatures.HOME_PAGE_DEFAULT_MY_DASHBOARDS);
  },

  hasMasterStudyFilterAllSelectDefault(immAppConfig) {
    return AccountUtil.hasFeature(immAppConfig, AccountUtil.accountFeatures.MASTER_STUDY_FILTER_ALL_SELECT_DEFAULT);
  },

  getCustomHelpAccountName: function(immAppConfig) {
    const regex = new RegExp(AccountUtil.accountFeatures.CUSTOM_HELP_COOKIE_PREFIX);
    const filteredFeatures = this.getFeatureList(immAppConfig).filter(function(feature) {
      return (feature.search(regex) > -1);
    });
    let result = "";
    if (filteredFeatures.size > 0) {
      // there suppose to be only one such feature
      const feature = filteredFeatures.get(0)
      result = feature.replace(AccountUtil.accountFeatures.CUSTOM_HELP_COOKIE_PREFIX, '')
    }
    return result;
  },

  /**
   * The next batch of functions are helper functions to check for the existence of specific packages. This list of helper
   * functions should exactly match the packages that we support at any given time
   *
   * IMPORTANT - If you add/remove packages, you must update the following files:
   *  1. Config.scala
   *  2. PackagePermissions.md
   *
   */

  hasKPIStudio: function(immAppConfig) {
    // keep in-sync with Config.scala / AccountPackage
    let accessFromAuth = false
    const user_info = immAppConfig.get('user_info')
    const apps = user_info.get('apps')
    if (apps !== undefined) {
      const findKPIStudio = apps.find(app => app.get('name') === 'KPI Studio')
      if (findKPIStudio !== undefined && findKPIStudio.size > 0) {
        accessFromAuth = true
      }
    }
    return AccountUtil.hasPackage(immAppConfig, 'KPI_Studio') && accessFromAuth;
  },
  hasCROOversight: function(immAppConfig) {
    // keep in-sync with Config.scala / AccountPackage
    return AccountUtil.hasPackage(immAppConfig, 'CRO_O');
  },
  hasCentralizedMonitoring: function(immAppConfig) {
    return AccountUtil.hasPackage(immAppConfig, 'Centralized_Monitoring');
  },
  hasMedicalInsights: function(immAppConfig) {
    return AccountUtil.hasPackage(immAppConfig, 'Medical_Insights');
  },
  hasClinopsInsights: function(immAppConfig) {
    return AccountUtil.hasPackage(immAppConfig, 'Clinops_Insights');
  },
  hasOversightScorecard(immAppConfig) {
    return AccountUtil.hasPackage(immAppConfig, "Oversight_Scorecard");
  },
  hasVirtualAssistant(immAppConfig) {
    return AccountUtil.hasPackage(immAppConfig, 'Virtual_Assistant');
  },

  getPackages: function(immAppConfig) {
    return immAppConfig.get('accountPackages', []).map((packageInfo) => packageInfo.get('name'));
  },
};

module.exports = AccountUtil;
export default AccountUtil;
