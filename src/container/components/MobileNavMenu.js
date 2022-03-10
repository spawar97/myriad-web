var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import MultiRoutes from './MultiRoutes';

var ExposureActions = require('../actions/ExposureActions');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
let ExposureNavConstants = require('../constants/ExposureNavConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var RouteNameConstants = require('../constants/RouteNameConstants');
var SideBarConstants = require('../constants/SideBarConstants');
const GA = require('../util/GoogleAnalytics');
var Util = require('../util/util');

var div = React.createFactory(require('./TouchComponents').TouchDiv),
    li = DOM.li,
    ul = DOM.ul;

class MobileNavMenu extends React.Component {
  static displayName = 'MobileNavMenu';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    sideBarTabs: PropTypes.object.isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  };

  // We ignore all props here because it should only change when the user logs out and logs back in with
  // a different user or the user has changed the current account. In that case, the component will also be unmounted.
  shouldComponentUpdate() {
    return false;
  }

  logout = () => {
    GA.sendLogout();
    this.context.router.push('/confirm-logout');
  };

  goToUserProfile = () => {
    this.context.router.push('/user-profile');
    ExposureActions.toggleMobileNavMenu(false);
  }

  render() {
    var immExposureStore = this.props.immExposureStore;
    var immFilteredAccountSeq = Util.getImmFilteredAccountSeqFromAccountMap(true, immExposureStore);

    var tasksCount = Util.getOpenTasksCount(immExposureStore.get('tasks'));

    const MultiTab = (props) => {
     
      const redirectMenu = (routeName) => {
        this.context.router.push(routeName);
        ExposureActions.toggleMobileNavMenu(true);
      }

      return (<div className='mobile-nav-menu-item-text multiTab'>
        <MultiRoutes icon={props.icon} name={props.name} redirectMenu={redirectMenu} />
      </div>);
    }

    var menuItems = _.map(this.props.sideBarTabs, function(icon, name) {
      // The "Analytics" tab actually shows a list of files (folders, reports,
      // dashboards). We choose to represent the list with the url "/folders/"
      // since it is essentially a folder view of the "root" folder.
      var route = name === 'Analytics' ? RouteNameConstants.EXPOSURE_FOLDERS : name.toLowerCase();

      if (typeof icon === 'object') {
        return (<li key={name}>
          <div className='mobile-nav-menu-item'>
            <div className={icon['Icon Name']} />
            <MultiTab icon={icon} name={name} context={this.context} />
          </div>
        </li>);
      } else {
        return li({ key: name },
          div({
            className: 'mobile-nav-menu-item', onClick: function () {
              this.context.router.push(route);
              ExposureActions.toggleMobileNavMenu(true);
            }.bind(this)
          },
            div({ className: icon }),
            (name === SideBarConstants.TASKS && tasksCount > 0) ? div({ className: 'badge' }, tasksCount) : null,
            div({ className: 'mobile-nav-menu-item-text' }, name)
          ));
      }
    }, this);

    // Prepend the Menu line and divider.
    menuItems.unshift(li({key: 'menu'}, div({className: 'mobile-nav-menu-header'}, 'Menu')));

    // Append another divider.
    menuItems.push(li({className: 'mobile-nav-light-hr', key: 'lhr'}));

    // Append the User info and a logout link.
    // FIXME: Wire the 'Welcome <user>' entry up to do something if it's supposed to do anything...
    menuItems.push(li({key: 'welcome'},
      div({className: 'mobile-nav-menu-item'},
        div({className: 'icon-user'}),
        div({className: 'mobile-nav-menu-item-text'}, immExposureStore.getIn(['userInfo', 'firstName'])))));

    menuItems.push(li({key: 'userProfile'},
      div({className: 'mobile-nav-menu-item', onClick: this.goToUserProfile},
        div({className: 'icon-user'}),
        div({className: 'mobile-nav-menu-item-text'}, FrontendConstants.MY_PROFILE))));

    menuItems.push(li({key: 'logout'},
      div({className: 'mobile-nav-menu-item', onClick: this.logout},
        div({className: 'icon-exit'}),
        div({className: 'mobile-nav-menu-item-text'}, 'Sign out'))));

    // Prepend the Switch Account line and divider.
    menuItems.push(li({key: 'switch-account'}, div({className: 'mobile-nav-switch-account-header'},
      immFilteredAccountSeq.size === 1 ? FrontendConstants.CURRENT_ACCOUNT : FrontendConstants.SWITCH_ACCOUNT)));

    // Creating account items from account map.
    var accounts = immFilteredAccountSeq.map((immAccount) => {
      var accountId = immAccount.getIn(['account', 'id']);
      const accountName = immAccount.getIn(['account', 'displayName']);
      var isSelected = accountId === immExposureStore.get('currentAccountId');
      return div(
        {className: cx('mobile-nav-switch-account-item', {selected: isSelected}),
         // If the account is already selected, close the menu. This mirrors the behavior in desktop.
         onClick: isSelected ? ExposureActions.toggleMobileNavMenu.bind(null, false) : () => this.context.router.push(`/confirm-change-account?accountId=${accountId}&accountType=exposure&accountName=${accountName}`)},
        div({className: 'mobile-nav-switch-account-item-text'}, accountName),
        div({className: cx({'icon-checkmark-full': isSelected})}));
    }).toJS();

    menuItems.push(accounts);

    return div({className: 'mobile-nav-menu'},
      ul(null, menuItems));
  }
}

module.exports = MobileNavMenu;
