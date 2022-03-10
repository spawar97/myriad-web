import React from 'react';
import Imm from 'immutable';
import AdminActions from '../../actions/AdminActions';
import PropTypes from 'prop-types';
import Spinner from '../Spinner';

import GroupSelection from './ShareKPIsGroupSelection';
import ReportSelection from './ShareKPIsReportSelection';

import FrontendConstants from '../../constants/FrontendConstants';
import cx from 'classnames';

import AccountUtil from '../../util/AccountUtil';

class ShareKPIs extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedGroup: null,
      immPackages: AccountUtil.getPackages(comprehend.globals.immAppConfig)
    };
  }

  componentDidMount() {
    // Get the Yellowfin user groups so we can render those in ShareKPIsGroupSelection.js
    AdminActions.getYellowfinUserGroups();
  }

  isReady() {
    return this.props.immAdminStore.has('yfUserGroups');
  }

  onGroupSelect(group) {
    this.setState({
      selectedGroup: group
    });
  }

  clearGroup() {
    this.setState({
      selectedGroup: null
    });
  }

  render() {
    if (!this.isReady()) {
      return <Spinner />;
    }

    const { immAdminStore, width, height } = this.props;

    const groups = immAdminStore.get('yfUserGroups');
    const { selectedGroup } = this.state;

    return (
      <div className={cx('admin-tab', 'share-kpis-tab')} style={{width, height}}>
        <div className='page-header'>
          <div className='title'>{FrontendConstants.SHARE_KPIS}</div>
        </div>
        <div className='workflow-info'>
          <div className='package-display'>
            Packages on current account: <div className='package-list'>{ this.state.immPackages.join(', ') }</div>
          </div>
          {
            this.state.selectedGroup
              ? (
                <div>
                  <br />
                  <div className='selected-group-info'>
                    Selected Team:
                    <div className='group-name'>{selectedGroup.get('name')}</div>
                  </div>
                </div>
                )
              : ""
          }
        </div>
        <div className='share-kpis-tab-main-view'>
          {
            selectedGroup
              ? <ReportSelection selectedGroup={selectedGroup} clearGroup={this.clearGroup.bind(this)} immAdminStore={immAdminStore}/>
              : <GroupSelection groups={groups} onGroupSelect={this.onGroupSelect.bind(this)}/>
          }
        </div>
      </div>
    );
  }
}

ShareKPIs.propTypes = {
  immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
  width: PropTypes.number,
  height: PropTypes.number
};

export default ShareKPIs;
