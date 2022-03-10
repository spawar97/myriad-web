import _ from 'underscore';
import React from 'react';
import Imm from 'immutable';
import FrontendConstants from '../../constants/FrontendConstants';
import PropTypes from 'prop-types';

import ContentPlaceholder from '../ContentPlaceholder';
import HomePageTabsEditor from './HomePageTabsEditor';
import AccountUtil from '../../util/AccountUtil';
import Combobox from '../Combobox';

import HomePageActions from '../../actions/HomePageActions';
import ExposureActions from '../../actions/ExposureActions';
import HomePageUtil from "../../util/HomePageUtil";
import HomePageConstants from '../../constants/HomePageConstants';
import cx from 'classnames'
import { withTransitionHelper } from '../RouterTransitionHelper';

class HomePageAdmin extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immHomePageStore: PropTypes.instanceOf(Imm.Map).isRequired,
    path: PropTypes.string,
    params: PropTypes.shape({
      fileId: PropTypes.string,
      taskId: PropTypes.string
    }).isRequired,
    query: PropTypes.shape({
      dashboardId: PropTypes.string,
      drilldownId: PropTypes.string,
      reportId: PropTypes.string
    }),
    onChangeGroup: PropTypes.func.isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      currentGroupId: null,
      finishedInitialMount: false,
    }
  }

  componentWillReceiveProps(nextProps) {
    const { immHomePageStore } = nextProps;
    const immNewHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const currentGroupId = immNewHomePage.get('groupEntityId');
    const isNotSelfAndExist = !!currentGroupId && currentGroupId !== HomePageConstants.HOME_PAGE_SELF;

    if ((this.state.currentGroupId !== currentGroupId) && isNotSelfAndExist) {
      ExposureActions.fetchFileConfigsForGroup(currentGroupId);
    }

    if (currentGroupId === undefined || currentGroupId === HomePageConstants.HOME_PAGE_SELF) {
      let groupEntityId = this.teamsAvailableForEdit().getIn([0, 'id'], null);
      this.changeGroupHomePage(groupEntityId);
    } else {
      this.setState({ currentGroupId });
    }
  }

  componentDidMount() {
    this.setState({finishedInitialMount: true});
  }

  componentWillUnmount() {
    ExposureActions.fetchFileConfigs();
  }


  unsavedWorkModalCopy() {
    return {
      header:FrontendConstants.YOUR_HOMEPAGE_HAS_NOT_BEEN_SAVED,
      content:FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
    };
  }

  isDirty() {
    if (!!this.isClosing) {
      return false;
    }

    const {immHomePageStore} = this.props;
    return HomePageUtil.isEditedHomePage(immHomePageStore);
  }

  teamsAvailableForEdit() {
    const {immExposureStore} = this.props;
    const groupEntities = immExposureStore.get('groupEntities');
    const immGroupEntities = groupEntities.toList();

    return immGroupEntities.sortBy(file => file.get('name').toUpperCase());
  }

  onChangeGroupHomePage(groupEntityId) {
    const {immHomePageStore} = this.props;
    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.changeGroupHomePage.bind(this, groupEntityId));
  }

  changeGroupHomePage(currentGroupId) {
    this.setState({ currentGroupId });
    ExposureActions.fetchFileConfigsForGroup(currentGroupId);

    this.props.onChangeGroup(currentGroupId, true);
  }

  closeHomePageAdmin() {
    const {immHomePageStore} = this.props;
    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.completeCloseHomePageAdmin.bind(this));
  }

  completeCloseHomePageAdmin() {
    this.isClosing = true;
    HomePageActions.closeHomePageEditor();
  }

  getNoAccessContent() {
    return (
      <div>
        <div className='home-page-editor-pane-text'>
          <span className='icon-information_solid'/>
          <div className='section-title'>You do not have access to this workflow</div>
        </div>
      </div>
    );
  }

  getNoTeamsConfiguredContent = () => (
    <div>
      <div className='home-page-editor-pane-text editor-no-content'>
        <span className='icon-information_solid'/>
        <div className='no-teams-title'>{FrontendConstants.NO_TEAMS_CONFIGURED_FOR_THIS_ACCOUNT}</div>
      </div>
    </div>
  );

  isEditorReady() {
    const {immExposureStore} = this.props;
    const fileConfigsRequestInFlight = immExposureStore.get('fileConfigsRequestInFlight', false);

    return !fileConfigsRequestInFlight;
  }

  getAdminContent() {
    const { currentGroupId } = this.state;
    const isEditorReady = this.isEditorReady();
    const editorProps = _.extend({}, this.props);
    editorProps.isAdmin = true;

    let content;
    if (isEditorReady) {
      content = <HomePageTabsEditor {...editorProps}/>;
    }
    else {
      content = <ContentPlaceholder />;
    }

    return (
      <div>
        <div className='home-page-editor-pane-text'>
          <span className='input-title'>{FrontendConstants.TEAM}:</span>
          <Combobox
            className='home-page-admin-group-select-dropdown'
            placeholder=''
            value={currentGroupId}
            labelKey='name'
            valueKey='id'
            onChange={this.onChangeGroupHomePage.bind(this)}
            options={this.teamsAvailableForEdit()}
          />
        </div>
        <br />
        {content}
      </div>
    );
  }

  isReady() {
    const {immExposureStore, immHomePageStore} = this.props;
    const {finishedInitialMount} = this.state;
    const fileConfigsRequestInFlight = immExposureStore.get('fileConfigsRequestInFlight', false);
    const isLoadingHomePage = immHomePageStore.get('isLoadingHomePage', false);
    return finishedInitialMount && !fileConfigsRequestInFlight && !isLoadingHomePage;
  }

  render() {
    let content;
    const { immExposureStore } = this.props;
    const groupEntities = immExposureStore.get('groupEntities');

    if (!this.isReady()) {
      content = <ContentPlaceholder/>;
    } else if (!AccountUtil.isAdmin(this.props.immExposureStore)) {
      content = this.getNoAccessContent();
    } else if (groupEntities.size === 0) {
      content = this.getNoTeamsConfiguredContent();
    } else {
      content = this.getAdminContent();
    }

    return (
      <div className='home-page-editor-pane-container'>
        <div className={cx('home-page-editor-pane', 'home-page-team-editor-pane')}>
          <div className='section-title'>
            <span className='title-text'>{FrontendConstants.HOME_PAGE_ADMIN}</span>
            <div className='close-button' onClick={this.closeHomePageAdmin.bind(this)} />
          </div>
          <br />
          <div className='home-page-editor-pane-content'>
            {content}
          </div>
        </div>
      </div>
    );
  }
}

export default withTransitionHelper(HomePageAdmin);
