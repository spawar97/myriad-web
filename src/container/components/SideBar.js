import React from 'react';
import _ from 'underscore';
import cx from 'classnames';
import {Link} from 'react-router';
import PropTypes from 'prop-types';
import {TouchA as a, TouchDiv as div} from './TouchComponents';
import Util from '../util/util';
import AccountUtil from '../util/AccountUtil';

var ExposureActions = require('../actions/ExposureActions');
var AdminNavConstants = require('../constants/AdminNavConstants');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var ExposureNavConstants = require('../constants/ExposureNavConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');
var SideBarConstants = require('../constants/SideBarConstants');
import Accordion from "./Accordion";

class SideBar extends React.PureComponent {
  static displayName = 'SideBar';

  static propTypes = {
    currentTab: PropTypes.string.isRequired,
    sideBarTabs: PropTypes.object.isRequired,
    isLegacyAccount: PropTypes.bool,
    logo: PropTypes.oneOf(['White', 'Black']),
    taskCount: PropTypes.number,
    isAperture: PropTypes.bool
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor() {
    super();
    this.state = {
      showExpandedMenu: false
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.scrollToSelectedTab();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  componentDidUpdate() {
    this.handleResize();
  }

  // handleResize is attached at componentDidMount
  handleResize() {

  }

  //Scroll to the selected tab
  scrollToSelectedTab() {
    if (this.sideBarContainerView) {
      if (this.sideBarContainerView.getElementsByClassName("selected").length) {
        let selectTab = this.sideBarContainerView.getElementsByClassName("selected")[0].parentNode;
        const tabSeq = parseInt(selectTab.getAttribute("data-tab-seq"));
        const sideBarContainer = this.sideBarContainerView.getElementsByClassName("side-bar-container-scroll")[0];
        //const footer = this.sideBarContainerView.getElementsByClassName("footer-fixed")[0];
        const scrollHeightTop = (tabSeq + 1) * selectTab.clientHeight;
        let sideBarTabs = this.sideBarContainerView.getElementsByClassName("virtual-table-row");

        if (scrollHeightTop > window.innerHeight) {
          // Set timeout for loaded element on IE
          setTimeout(function () {
              sideBarTabs[tabSeq - 1].scrollIntoView();
            }
            , 100);
        }
      }
    }
  }

  openExpandedMenu = () => {
    this.setState({
      showExpandedMenu: true
    });
  };

  closeExpandedView = () => {
    this.setState({
      showExpandedMenu: false
    });
  };

  render() {
    let tabSeq = 0;
    // We are removing `transform: translate(-50%, -50%);` because IE9 has a weird bug that causes the side bar to disappear.
    return (
      <div
        className={cx('side-bar', 'virtual-table', {
          'side-bar-extended-width': this.state.showExpandedMenu,
          'side-bar-width': !this.state.showExpandedMenu,
        })}
        ref={(sideBarContainerView) => this.sideBarContainerView = sideBarContainerView}>
        <div className='side-bar-container-scroll' onMouseEnter={this.openExpandedMenu}
             onMouseLeave={this.closeExpandedView}>
          <div className='side-bar-inner-container'>
            {
              _.map(this.props.sideBarTabs, function (icon, name) {
                // We regex match on the name to ensure that when the 'Edit Schema' tab is
                // open the 'Schema' tab remains selected.
                tabSeq++;
                let sideBarSubMenuDiv = [];
                let selectedMenu = false;
                let subMenuSelected = false;
                if(typeof icon === 'object'){
                  let subTabSeq = 0;
                  _.map(icon['Sub Menu'], function (subMenuIcon, subMenuName) {
                    subTabSeq++;
                    if(this.props.currentTab === subMenuName){
                      subMenuSelected = true;
                    }
                    sideBarSubMenuDiv.push (
                      <div className='virtual-table-row subMenu' key={`subTab-${subMenuName}`}>
                        <div className='virtual-table-cell' data-tab-seq={subTabSeq}>
                          <SideBarTab
                            isLegacyAccount={this.props.isLegacyAccount}
                            isMenuExpanded={this.state.showExpandedMenu}
                            name={subMenuName}
                            subMenu={[]}
                            icon={subMenuIcon}
                            displayName={this.state.showExpandedMenu ? true : false}
                            displayIcon={true}
                            selected={this.props.currentTab === subMenuName}
                            badgeCount={subMenuName === SideBarConstants.TASKS && this.props.taskCount > 0 ? this.props.taskCount : null}
                          />
                        </div>
                      </div>
                    );
                  },this);
                }
                if(subMenuSelected == true){
                  selectedMenu = true;
                }else{
                  selectedMenu = (this.props.currentTab === name);
                }
                return (
                  <div className='virtual-table-row' key={`tab-${name}`}>
                    <div className='virtual-table-cell' data-tab-seq={tabSeq}>
                      <SideBarTab
                        isLegacyAccount={this.props.isLegacyAccount}
                        isMenuExpanded={this.state.showExpandedMenu}
                        name={name}
                        icon={icon}
                        subMenu={sideBarSubMenuDiv}
                        displayName={this.state.showExpandedMenu ? true : false}
                        displayIcon={true}
                        selected={selectedMenu}
                        badgeCount={name === SideBarConstants.TASKS && this.props.taskCount > 0 ? this.props.taskCount : null}
                      />
                    </div>
                  </div>
                );
              }, this)
            }
          </div>
        </div>
      </div>
    );
  }
}

var SideBarTab = React.createFactory(class extends React.Component {
  static displayName = 'SideBarTab';

  static propTypes = {
    name: PropTypes.string.isRequired,
    icon: PropTypes.any.isRequired,
    selected: PropTypes.bool.isRequired,
    badgeCount: PropTypes.number,
    isLegacyAccount: PropTypes.bool,
    displayName: PropTypes.bool.isRequired,
    displayIcon: PropTypes.bool.isRequired,
    isMenuExpanded: PropTypes.bool.isRequired,
    subMenu: PropTypes.array
  };

  getTabName = (name) => {
    switch(name) {
      case ExposureNavConstants.EXPOSURE_REPORTS_TAB: return 'reports';
      case ExposureNavConstants.EXPOSURE_YF_KPI_STUDIO_TAB: return 'kpi-studio';
      case ExposureNavConstants.EXPOSURE_YF_CLINOPS_INSIGHTS_TAB: return 'clinops-insights';
      case ExposureNavConstants.EXPOSURE_SHARE_KPIS: return 'share-kpis';
      case ExposureNavConstants.EXPOSURE_OPERATIONS_INSIGHTS_TAB: return 'operations-insights';
      case ExposureNavConstants.EXPOSURE_CLINICAL_INSIGHTS_TAB: return 'clinical-insights';
      case ExposureNavConstants.EXPOSURE_OVERSIGHT_SCORECARD_TAB: return 'oversight-scorecard';
      default: return name.toLowerCase();
    }
  };

  render() {
    const {name, badgeCount, icon, subMenu} = this.props;
    let newIcon = icon;
    if(typeof newIcon === 'object'){
      newIcon = icon['Icon Name']
    }
    const iconDiv = (
      <div className={`side-bar-tab-icon ${newIcon}`}>
        {_.isNull(badgeCount) ? null : <div className='badge'>{badgeCount}</div>}
      </div>
    );

    const nameDiv = <div className="side-bar-tab-menu-name">{name}</div>;

    const sideBarContents = (
      <div className='side-bar-tab-contents'>
        {this.props.displayIcon ? iconDiv : null}
        {this.props.displayName ? nameDiv : null}
      </div>
    );

    let route;
    switch (name) {
      case AdminNavConstants.ADMIN_USERS_TAB:
        route = this.props.isLegacyAccount
          ? RouteNameConstants.APERTURE_USERS_LEGACY
          : RouteNameConstants.APERTURE_USERS;
        break;
      // The "Analytics" tab actually shows a list of files (folders, reports,
      // dashboards, monitors). We choose to represent the list with the url "/folders/"
      // since it is essentially a folder view of the "root" folder.
      case ExposureNavConstants.EXPOSURE_REPORTS_TAB:
        route = RouteNameConstants.EXPOSURE_FOLDERS;
        break;
      case ExposureNavConstants.EXPOSURE_HOME_TAB:
        route = AccountUtil.hasHomePageDefaultMyDashboards(comprehend.globals.immAppConfig)
          ? RouteNameConstants.EXPOSURE_DASHBOARDS_HOME
          : RouteNameConstants.EXPOSURE_HOME;
        break;
      default:
        route = name.toLowerCase();
    }

    let key = 'side-bar-tab-' + this.getTabName(name);
    let link = '';
    if(subMenu.length == 0){
      link = (
        <Link id={key} key={key}
              className={cx({
                'side-bar-tab': true,
                selected: this.props.selected,
                'side-bar-tab-width': !this.props.showExpandedMenu,
                'side-bar-tab-extended-width': this.props.isMenuExpanded
              })}
              to={route}
        >
          {sideBarContents}
        </Link>
      );
    }else{
      link = (
        <div id={key} key={key}
             className={cx({
               'side-bar-tab': true,
               selected: this.props.selected,
               'side-bar-tab-width': !this.props.showExpandedMenu,
               'side-bar-tab-extended-width': this.props.isMenuExpanded
             })}
        >
          <Accordion
            title={sideBarContents}
            content={subMenu}
          />
        </div>
      );
    }
    return link;
  }
});

module.exports = SideBar;
