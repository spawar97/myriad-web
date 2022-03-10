import PropTypes from "prop-types";

var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');

import AdminActions from '../actions/AdminActions';

var ExposureActions = require('../actions/ExposureActions');
var CookieStore = require('../stores/CookieStore');
var ExposureStore = require('../stores/ExposureStore');
var SearchStore = require('../stores/SearchStore');
var AccountUtil = require('../util/AccountUtil');
import RouteNameConstants from '../constants/RouteNameConstants';
import PermissionsUtil from "../util/PermissionsUtil";
import { FeatureListConstants } from "../constants/PermissionsConstants";
import ContextComponent from './ContextComponent';

class Exposure extends React.Component {
  static displayName = 'Exposure';

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
    // Make sure the store is initialized with the config before we set state.
    ExposureStore.init(comprehend.globals.immAppConfig);
    SearchStore.SearchStore.init(comprehend.globals.immAppConfig);

    this.state = {
      contentHeight: 800,
      cookies: CookieStore.getCookies(),
      immExposureStore: ExposureStore.getExposureStore(),
      supernavbarRef: React.createRef(),
    };
  }

  componentWillMount() {
    CookieStore.addChangeListener(this._onCookieStoreChange);
    ExposureStore.addChangeListener(this._onExposureStoreChange);
    ExposureActions.fetchFileConfigs();
    ExposureActions.fetchTaskSummaries();
    if (AccountUtil.hasKPIStudio(comprehend.globals.immAppConfig)) {
      ExposureActions.fetchEmbeddedEntitiesSummary();
      ExposureActions.fetchClientOrg();
    }
    AdminActions.fetchFileConfigs(false);
    ExposureActions.fetchTaskTypes();
    ExposureActions.fetchQualityAgreements();
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
    this.setRenderHook();
  }

  componentWillUnmount() {
    const { supernavbarRef } = this.state;
    window.removeEventListener('resize', this.handleResize);
    CookieStore.removeChangeListener(this._onCookieStoreChange);
    ExposureStore.removeChangeListener(this._onExposureStoreChange);

    supernavbarRef.current.removeEventListener('lsac-nav-mounted', this.onNavBarMount);
  }

  handleResize = () => {
    // The 1 is to account for rounding issues when adjusting the
    // scaling/zoom factor in Chrome.
    this.setState({ contentHeight: $(ReactDOM.findDOMNode(this)).height() - 1 });
  };

  onNavBarMount = () => {
    const { supernavbarRef, cookies, immExposureStore } = this.state;
    const { immAppConfig } = comprehend.globals;

    const whoAmI = immAppConfig.get('user_info')
    const userInfoObject = {
      "name": whoAmI.get('username') !== undefined ? whoAmI.get('username') : '',
      "given_name": whoAmI.get('name') !== undefined ? whoAmI.get('name') : '',
      "family_name": whoAmI.get('lastname') !== undefined ? whoAmI.get('lastname') : '',
      "email": whoAmI.get('email') !== undefined ? whoAmI.get('email') : '',
      "applications": whoAmI.get('apps') !== undefined ? whoAmI.get('apps').toJS() : []
    }

    const superNavBar = supernavbarRef.current;

    superNavBar.setUserInfo(userInfoObject);
    if (PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK)) {
      superNavBar.initializeSidebarOptions([
        {
          category: 'collaboration',
          url: window.location.origin + "/tasks",
          icomoonId: 'task-list',
        }
      ]);
    }
    ExposureActions.setTopNavRenderHook(superNavBar.setExtraTopNavComponent);
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
    if (window.location.href.includes('embedded')) {
      return "KPI Studio";
    }
    if (window.location.href.includes('tasks')) {
      return "Collaboration";
    }
    return "";
  }

  getAppContext = () => {
    if (window.location.href.includes('tasks')) {
      return 'collaboration';
    } if (window.location.href.includes('home')) {
      return 'home';
    } else {
      return 'my_apps';
    }
  }

  getAppDomainOrigin = () => {
    const { immAppConfig } = comprehend.globals;
    return immAppConfig.get('appDomainOrigin')
  }
  render() {
    const { supernavbarRef } = this.state;
    const applicationTitle = this.getApplicationTitle();
    const appContext = this.getAppContext();
    const appDomainOrigin = this.getAppDomainOrigin()
    const clonedElement = React.cloneElement(this.props.children, {
      cookies: this.state.cookies,
      immExposureStore: this.state.immExposureStore,
      height: this.state.contentHeight,
      params: this.props.params,
      query: this.props.location.query
    });

    const ContextComponentProps = {
      ...this.props, 
      query: this.props.location.query, 
      immExposureStore: this.state.immExposureStore
    }

    return (
      <div>
        <lsac-supernavbar
          ref={supernavbarRef}
          topNavHeight='5.5rem'
          sidebarDisplayMode='minimal'
          topnavDisplayMode='minimal'
          applicationTitle={applicationTitle}
          appContext={appContext}
          domain={appDomainOrigin}
          data-html2canvas-ignore="true"
        />
        {clonedElement}
        <ContextComponent {...ContextComponentProps}/>
      </div>
    );
  }

  _onCookieStoreChange = () => {
    this.setState({ cookies: CookieStore.getCookies() });
  };

  _onExposureStoreChange = () => {
    this.setState({ immExposureStore: ExposureStore.getExposureStore() });
  };
}

// This doesn't export a factory because the code using it expects it to be a
// component class.
module.exports = Exposure;
