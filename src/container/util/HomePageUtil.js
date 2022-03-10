import Imm from 'immutable';
import ExposureAppConstants from '../constants/ExposureAppConstants';
import FrontendConstants from '../constants/FrontendConstants';
import HomePageConstants from "../constants/HomePageConstants";
import ExposureActions from "../actions/ExposureActions";
import HomePageActions from "../actions/HomePageActions";

class HomePageUtil {

  static isActiveTabInHomePage(immHomePage, activeTabId) {
    const homePageTabs = immHomePage.get('tabs', Imm.List());
    return homePageTabs.findKey(tab => tab.get('id', null) === activeTabId) > -1;
  }

  static findTabIndex(immHomePage, immTab) {
    const homePageTabs = immHomePage.get('tabs', Imm.List());
    return homePageTabs.findKey(tab => Imm.is(tab, immTab));
  }

  static findSelectedTab(immHomePageStore, activeTabId) {
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const homePageTabs = immHomePage.get('tabs', Imm.List());
    if (activeTabId == null && homePageTabs.size > 0) {
      return homePageTabs.get(0);
    }
    return homePageTabs.find(tab => tab.get('id', '') === activeTabId);
  }

  static findTeamWithTab(immAllHomePages, tabId) {
    let groupEntityId = '';
    if (tabId === ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS) {
      groupEntityId = ExposureAppConstants.HOME_PAGE_TAB_TYPES.MY_DASHBOARDS;
    }
    else {
      let immHomePage = immAllHomePages.find(homePage => {
        const immTabs = homePage.get('tabs', Imm.List());
        return immTabs.find(tab => tab.get('id') === tabId);
      });

      groupEntityId = immHomePage && immHomePage.get('groupEntityId');
    }

    return groupEntityId;
  }

  static getDefaultActiveTabId(immHomePage) {
    return immHomePage.getIn(['tabs', 0, 'id'], null);
  }

  static isHomePageEmpty(immHomePage) {
    return immHomePage == null || immHomePage.get('tabs', Imm.List()).size === 0;
  }

  static findTabWithIndex(immHomePage, tabEntityId, tabType) {
    if (tabEntityId == ExposureAppConstants.OVERSIGHT_REPORT) {
      tabType = ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD;
    }
    const immTabs = immHomePage.get('tabs', Imm.List());
    return immTabs.find(tab => tab.get('tabType', '') === tabType && tab.get('entityId', '') === tabEntityId);
  }

  static getTabReportName(immExposureStore, immTab) {
    const tabType = immTab.get('tabType');
    const entityId = immTab.get('entityId');

    let reportTitle = '';
    switch(tabType) {
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE:
        reportTitle = immExposureStore.getIn(['fileConfigs', entityId, 'title'], FrontendConstants.NOT_AVAILABLE);
        break;
      case ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD:
        reportTitle = immExposureStore.getIn(['oversightReport', 'title'], FrontendConstants.NOT_AVAILABLE);
        break;
      default:
        reportTitle = 'UNSUPPORTED TYPE - TO UPDATE LATER';
    }

    return reportTitle;
  }

  static getTabIdsOfType(immHomePage, tabType) {
    const tabsOfType = HomePageUtil.getTabsOfType(immHomePage, tabType);
    return tabsOfType.groupBy(tab => tab.get('entityId', '')).keySeq();
  }

  static getTabsOfType(immHomePage, tabType) {
    const homePageTabs = immHomePage.get('tabs', Imm.List());
    return homePageTabs.filter(tab => tab.get('tabType', '') === tabType);
  }

  static convertToHomePageDto(immHomePage) {
    const homePageTabs = immHomePage.get('tabs', Imm.List());
    return {
      "tabs": homePageTabs.map((tab, i) => tab.set('tabIndex', i)).toJS()
    };
  }

  static textOverflowEllipsis(text, maxLength) {
    let ret = text;
    if (ret.length > maxLength) {
      ret = ret.substr(0, maxLength - 10) + "..." + ret.substr(text.length - 7, 7);
    }
    return ret;
  }

  static getGroupEntityIdsWithHomePages(immHomePageStore, immExposureStore) {
    const allHomePages = immHomePageStore.get('allHomePages');
    return allHomePages.filter(immHomePage => {
      const groupEntityId = immHomePage.get('groupEntityId', null);
      const numTabs = immHomePage.get('tabs', Imm.List()).size;

      return groupEntityId !== HomePageConstants.HOME_PAGE_SELF && numTabs > 0;
    }).map(immHomePage => immExposureStore.getIn(['groupEntities', immHomePage.get('groupEntityId'), 'name']));
  }

  static getSelectedGroupEntityId(immHomePageStore) {
    return immHomePageStore.get('selectedGroupEntityId', HomePageConstants.HOME_PAGE_SELF);
  }

  static getSelectedHomePage(immHomePageStore) {
    const selectedGroupEntityId = this.getSelectedGroupEntityId(immHomePageStore);
    return immHomePageStore.getIn(['allHomePages', selectedGroupEntityId], Imm.Map());
  }

  static getAllHomePages(immHomePageStore) {
    return immHomePageStore.get('allHomePages', Imm.Map());
  }

  static getSelectedHomePageTabs(immHomePageStore) {
    const selectedGroupEntityId = this.getSelectedGroupEntityId(immHomePageStore);
    const immHomePage = immHomePageStore.getIn(['allHomePages', selectedGroupEntityId], Imm.Map());
    return immHomePage.get('tabs', Imm.List())
  }

  static getHomePage(immHomePageStore, groupEntityId) {
     return immHomePageStore.getIn(['allHomePages', groupEntityId], Imm.Map());
  }

  static getNewEmptyHomePage (groupEntityId) {
    return  Imm.fromJS({
      tabs: [],
      groupEntityId: groupEntityId,
    });
  }

  static isEditedHomePage(immHomePageStore) {
    let workStateHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    let baseStateHomePage = immHomePageStore.get('baseStateHomePage');
    return baseStateHomePage !== undefined && !Imm.is(workStateHomePage, baseStateHomePage);
  }

  static wrapperUnsavedWorkModal(immHomePageStore, callback) {
    if (this.isEditedHomePage(immHomePageStore)) {
      ExposureActions.displayUnsavedWorkModal(
        FrontendConstants.YOUR_HOMEPAGE_HAS_NOT_BEEN_SAVED,
        FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST,
        (isDiscard) => {
          if (isDiscard !== false) {
            HomePageActions.discardStateHomePage();
            callback();
          }
        }
      );
    } else {
      callback();
    }
  }

  static getDefaultGroupEntityId = (immExposureStore) => {
    const groupEntities = immExposureStore.get('groupEntities');

    if (groupEntities.size === 0) {
      return '';
    }

    const immGroupEntities = groupEntities.toList();
    const sortedImmGroupEntities = immGroupEntities.sortBy(file => file.get('name').toUpperCase());
    const firstImmGroup = sortedImmGroupEntities.get(0);

    return firstImmGroup.get('id');
  };
}

export default HomePageUtil;
