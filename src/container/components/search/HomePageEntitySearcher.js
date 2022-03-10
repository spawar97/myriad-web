import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';

import ExposureAppConstants from "../../constants/ExposureAppConstants";
import EntitySearcher from "./EntitySearcher";
import FrontendConstants from "../../constants/FrontendConstants";
import HomePageStore from "../../stores/HomePageStore";
import HomePageUtil from "../../util/HomePageUtil";
import util from '../../util/util';
import HomePageConstants from "../../constants/HomePageConstants";
import HomePageActions from "../../actions/HomePageActions";
import RouteNameConstants from "../../constants/RouteNameConstants";
import ExposureActions from '../../actions/ExposureActions';


class HomePageEntitySearcher extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      immHomePageStore: HomePageStore.getHomePageStore(),
      expanded: false
    }
  }

  componentDidMount() {
    HomePageStore.addChangeListener(this._onHomePageStoreUpdate);
    HomePageActions.fetchHomePages(true, this.props.params.activeTabId);
  }

  componentWillUnmount() {
    HomePageStore.removeChangeListener(this._onHomePageStoreUpdate);
  }

  _onHomePageStoreUpdate = () => {
    const { immHomePageStore } = this.state;
    const immNewHomePageStore = HomePageStore.getHomePageStore();
    if (!Imm.is(immHomePageStore.get('allHomePages'), immNewHomePageStore.get('allHomePages'))) {
      this.setState({ immHomePageStore: immNewHomePageStore });
    }
  };

  navigateToSelection(selectedOption) {
    if (!selectedOption) {
      return;
    }
    let routeName;
    const {id, fileType, module} = selectedOption;
    if (module !== undefined) {
      ExposureActions.clearSelectedModuleOption();
      ExposureActions.selectedModuleOption(true);
      let moduleDisplayName = module.toLowerCase();
      switch (moduleDisplayName) {
        case RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS:
          this.context.router.push({
            name: RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS,
            params: {fileId: id}
          });
          break;

        case RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS:
          this.context.router.push({
            name: RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS,
            params: {fileId: id}
          });
          break;

        default:
          break;
      }
    } else {
      this.context.router.push({name: util.getRouteNameByFileType(fileType), params: {fileId: id}});
    }
  }

  navigateToSelectionHomePageTab(immHomePageTab) {
    const routeName = RouteNameConstants.EXPOSURE_HOME_WITH_TAB;
    const selectionTabId = immHomePageTab.get('id', null);
    this.context.router.push({ name: routeName,  params: {activeTabId: selectionTabId }});
  }

  onSelectedItem(selectedOption) {
    const { immHomePageStore } = this.state;
    const immUserHomePage = HomePageUtil.getHomePage(immHomePageStore, HomePageConstants.HOME_PAGE_SELF);
    //checks whether the saved state contain prev deleted and currently selected (via search) report
    const savedStateHomePage = (HomePageStore.getHomePageStore()).get('baseStateHomePage');
    const immHomePageTab = savedStateHomePage ? HomePageUtil.findTabWithIndex(savedStateHomePage, selectedOption.id,
        ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE) : HomePageUtil.findTabWithIndex(immUserHomePage, selectedOption.id,
        ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE);

    if (immHomePageTab != null) {
      this.navigateToSelectionHomePageTab(immHomePageTab);
    }
    else {
      this.navigateToSelection(selectedOption);
    }
  }

  render() {
    const props = {
      onSelectedItem: this.onSelectedItem.bind(this),
      immExposureStore: this.props.immExposureStore
    };

    return (
      <EntitySearcher {...props} title={FrontendConstants.ENTITY_SEARCHER_TOOLTIP}/>
    );
  }
}


module.exports = HomePageEntitySearcher;
export default HomePageEntitySearcher;
