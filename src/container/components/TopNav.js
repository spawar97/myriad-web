import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from 'classnames';
import _ from 'underscore';

import Notifications from './exposure/Notifications';
import HomePageEntitySearcher from './search/HomePageEntitySearcher';
import SimpleDropdown from './SimpleDropdown';
import UserMenu from './UserMenu';
import MasterStudyFilter from './MasterStudyFilter';
import FrontendConstants from '../constants/FrontendConstants';
import GA from '../util/GoogleAnalytics';
import Util from '../util/util';
import SaamaLogo from '../../images/saama_logo.svg';

class TopNav extends React.PureComponent {
  static displayName = 'TopNav';

  static propTypes = {
    immStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immUserInfo: PropTypes.instanceOf(Imm.Map).isRequired,
    immUserMenuItems: PropTypes.instanceOf(Imm.List).isRequired,
    isExposure: PropTypes.bool.isRequired,
    version: PropTypes.string,
    contentHeight: PropTypes.number,
  };

  static contextTypes = {
    router: PropTypes.object
  };

  componentWillMount() {
    const immStore = this.props.immStore;
    if (!immStore.get('accountMap', Imm.Map()).has(immStore.get('currentAccountId'))) {
      GA.sendException('Authenticated accountId is not in accessible accounts list.', true);
      window.location.replace('/logout');
    }
  }

  shouldComponentUpdate(nextProps) {
    // We ignore immUserInfo and accountMap here because it should only change when the user log out and log back in with
    // a different user. In that case, the top nav will also be unmounted.
    return this.props.contentHeight !== nextProps.contentHeight ||
      this.props.isExposure !== nextProps.isExposure ||
      !Imm.is(this.props.immUserMenuItems, nextProps.immUserMenuItems) ||
      this.props.immStore.get('notifications') !== nextProps.immStore.get('notifications');
  }

  handleChange = (index) => {
    const accountId = Util.getImmFilteredAccountSeqFromAccountMap(this.props.isExposure, this.props.immStore).getIn([index, 'account', 'id']);
    const accountName = this.props.immStore.getIn(['accountMap', accountId, 'account', 'displayName']);

    // No need to do anything if the account hasn't changed, just return.
    if (accountId === this.props.immStore.get('currentAccountId')) { return; }

    const accountType = this.props.isExposure ? 'exposure' : 'aperture';
    
    this.context.router.push(`/confirm-change-account?accountId=${accountId}&accountType=${accountType}&accountName=${accountName}`);
  };

  render() {
    const {isExposure, immStore, immUserInfo, version, immUserMenuItems} = this.props;

    const immFilteredAccountSeq = Util.getImmFilteredAccountSeqFromAccountMap(isExposure, immStore);
    const isSingleAccount = immFilteredAccountSeq.size === 1;
    const singleAccountNameOverride = isSingleAccount
      ? immFilteredAccountSeq.first().getIn(['account', 'displayName'])
      : null;

    const accountDropdownItems = isSingleAccount
      ? []
      : immFilteredAccountSeq.map((immAccount) => {
          return {name: immAccount.getIn(['account', 'displayName'])};
        }).toJS();

    const selectedIndex = immFilteredAccountSeq.findIndex((immAccount) => {
      return immAccount.getIn(['account', 'id']) === immStore.get('currentAccountId');
    }, this);

    let notifications = null;
    let masterStudyFilter = null;
    let search = null;
    if (isExposure) {
      notifications = (
        <div className='top-nav-item notification-dropdown'>
          <Notifications immExposureStore={immStore} />
        </div>
      );

      const filterProps = _.extend({}, this.props);
      filterProps.immExposureStore = immStore;

      masterStudyFilter = (
        <MasterStudyFilter {...filterProps} context={this.context} />
      );

      search = (
        <div className='top-nav-item'>
          <HomePageEntitySearcher {...filterProps}/>
        </div>
      );
    }

    let accountDropdownOpener = isSingleAccount
      ? null
      : <div className='icon-accordion-down' />;

    const rightContent = (
      <div className={cx(
        'top-nav-right-items',
        {'is-admin': !this.props.isExposure})}
      >
        {search}
        {notifications}
        <div id='top-nav-customer-menu'
             className='top-nav-item'
        >
          <SimpleDropdown 
                          opener={null}
                          items={accountDropdownItems}
                          itemListHeader={FrontendConstants.SELECT_AN_ACCOUNT}
                          onChange={this.handleChange.bind(this)}
                          selectedIndex={selectedIndex}
                          disableChevron={true}
                          isDisabled={true}
                          selectedOverride={singleAccountNameOverride}
          />
        </div>
        <div className='top-nav-item'>
          <UserMenu immUserInfo={immUserInfo}
                    version={version}
                    userMenuItems={immUserMenuItems.toJS()}
          />
        </div>
      </div>
    );

    return (
      <div className={cx('top-nav', {'is-admin': !isExposure})}>
        <div className='top-nav-row'>
          {masterStudyFilter}
          {rightContent}
        </div>
      </div>
    );
  }
}

module.exports = TopNav;
