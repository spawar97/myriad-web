import React from 'react';
import $ from 'jquery';
import Imm from 'immutable';

import AdminActions from '../actions/AdminActions';
import AdminStore from '../stores/AdminStore';
import CookieStore from '../stores/CookieStore';
import PropTypes from 'prop-types';
import DataReviewStore from "../stores/DataReviewStore";
import PermissionsUtil from "../util/PermissionsUtil";
import {FeatureListConstants} from "../constants/PermissionsConstants";
import RouteNameConstants from "../constants/RouteNameConstants";

function getAdminState() {
  return {
    immAdminStore: AdminStore.getAdminStore()
  };
}

class Admin extends React.Component {
  static displayName = 'Admin';

  static propTypes = {
    immAppConfig: PropTypes.instanceOf(Imm.Map)
  };

  constructor(props) {
    super(props);
    AdminStore.init(comprehend.globals.immAppConfig);

    this.state = {contentHeight: 800,
            contentWidth: 800,
            immAdminStore: AdminStore.getAdminStore(),
            cookies: CookieStore.getCookies(),
            immDataReviewStore: DataReviewStore.getStore(),
            supernavbarRef: React.createRef(),
    };
  }

  componentDidMount() {
    CookieStore.addChangeListener(this._onCookieStoreChange);
    AdminStore.addChangeListener(this._onChange);
    DataReviewStore.addChangeListener(this._onDataReviewStoreChange);
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.setRenderHook();
  }

  componentWillMount(){
    AdminActions.fetchFileConfigs(true);
  }

  componentWillMount(){
    AdminActions.fetchFileConfigs(true);
  }

  componentWillUnmount() {
    const { supernavbarRef } = this.state;
    window.removeEventListener('resize', this.handleResize);
    AdminStore.removeChangeListener(this._onChange);
    CookieStore.removeChangeListener(this._onCookieStoreChange);
    DataReviewStore.removeChangeListener(this._onDataReviewStoreChange);

    supernavbarRef.current.removeEventListener('lsac-nav-mounted', this.onNavBarMount);
  }

  onNavBarMount = () => {
    const { supernavbarRef } = this.state;
    const superNavBar = supernavbarRef.current;

    const {immAppConfig} = comprehend.globals;

    const whoAmI = immAppConfig.get('user_info')
    const userInfoObject = {
      "name": whoAmI.get('username') !== undefined ? whoAmI.get('username') : '',
      "given_name": whoAmI.get('name') !== undefined ? whoAmI.get('name'): '',
      "family_name": whoAmI.get('lastname') !== undefined ? whoAmI.get('lastname') : '',
      "email": whoAmI.get('email') !== undefined ? whoAmI.get('email') : '',
      "applications": whoAmI.get('apps') !== undefined ? whoAmI.get('apps').toJS() : []
    }

    superNavBar.setUserInfo(userInfoObject);
    if(PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK)) {
      superNavBar.initializeSidebarOptions([
        {
          category: 'collaboration',
          label: 'Tasks',
          onClick: () => this.context.router.push({ name: RouteNameConstants.EXPOSURE_TASKS }),
          url: window.location.origin + "/tasks",
          icomoonId: 'task-list',
        }
      ]);
    }
    AdminActions.setTopNavRenderHook(superNavBar.setExtraTopNavComponent);
  };
  setRenderHook() {
    const { supernavbarRef } = this.state;
    supernavbarRef.current.addEventListener('lsac-nav-mounted', this.onNavBarMount);
  }
  getApplicationTitle = () => {
    if (window.location.href.includes('operations-insights')) {
      return "Operations Insights";
    }
    if (window.location.href.includes('ract') || window.location.
      href.includes('oversight-scorecard')) {
      return "RBQM";
    }
    if (window.location.href.includes('clinical-insights')) {
      return "Clinical Insights";
    }
    return "";
  }
  handleResize = () => {
    // 80 is to adjust for the height of the top bar.
    // 140 is to adjust for the sidebar.
    // The 1 is to account for rounding issues when adjusting the
    // scaling/zoom factor in Chrome.
    var $window = $(window);
    this.setState({contentHeight: $window.height() - 80 - 1,
                   contentWidth: $window.width() - 140 - 1});
  };

  render() {
    const { supernavbarRef } = this.state;
    const applicationTitle = this.getApplicationTitle();
    const clonedElement = React.cloneElement(this.props.children, {
      immAdminStore: this.state.immAdminStore,
      immAppConfig: this.props.immAppConfig,
      width: this.state.contentWidth,
      height: this.state.contentHeight,
      params: this.props.params,
      query: this.props.location.query,
      cookies: this.state.cookies,
      immDataReviewStore: this.state.immDataReviewStore,
    });
    return (
      <div>
      <lsac-supernavbar
        ref={supernavbarRef}
        topNavHeight='5.5rem'
        sidebarDisplayMode='hidden'
        topnavDisplayMode='minimal'
        applicationTitle={applicationTitle}
      />
      {clonedElement}
    </div>
    )
  }

  _onChange = () => {
    this.setState(getAdminState());
  };

  _onCookieStoreChange = () => {
    this.setState({cookies: CookieStore.getCookies()});
  };

  _onDataReviewStoreChange = () => {
    this.setState({immDataReviewStore: DataReviewStore.getStore()});
  };
}

// This doesn't export a factory because the code using it expects it to be a
// component class.
module.exports = Admin;
