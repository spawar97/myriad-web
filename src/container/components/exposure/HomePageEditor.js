import _ from 'underscore';
import React from 'react';
import Imm from 'immutable';
import HomePageConstants from '../../constants/HomePageConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import PropTypes from 'prop-types';
import ContentPlaceholder from '../ContentPlaceholder';

import HomePageTabsEditor from './HomePageTabsEditor';
import HomePageActions from '../../actions/HomePageActions';
import HomePageUtil from "../../util/HomePageUtil";
import { withTransitionHelper } from '../RouterTransitionHelper';

class HomePageEditor extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    params: PropTypes.shape({
      fileId: PropTypes.string,
      taskId: PropTypes.string
    }).isRequired,
    query: PropTypes.shape({
      dashboardId: PropTypes.string,
      drilldownId: PropTypes.string,
      reportId: PropTypes.string
    })
  };

  static contextTypes = {
    router: PropTypes.object
  };

  constructor(props) {
    super(props);
  }

  componentWillMount() {
    HomePageActions.selectHomePage(HomePageConstants.HOME_PAGE_SELF);
    HomePageActions.fetchHomePages();
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

  closeHomePageEditor() {
    const {immHomePageStore} = this.props;
    HomePageUtil.wrapperUnsavedWorkModal(immHomePageStore, this.completeCloseHomePageEditor.bind(this));
  }

  completeCloseHomePageEditor() {
    this.isClosing = true;
    HomePageActions.closeHomePageEditor();
    HomePageActions.enableHomeConfigureLink();
  }

  isReady() {
    const {immExposureStore} = this.props;
    const fileConfigsRequestInFlight = immExposureStore.get('fileConfigsRequestInFlight', false);

    return !fileConfigsRequestInFlight;
  }

  render() {
    let content;
    if (!this.isReady()) {
      content = <ContentPlaceholder/>;
    }

    else {
      const editorProps = _.extend({}, this.props);
      editorProps.groupEntityId = HomePageConstants.HOME_PAGE_SELF;
      content = <HomePageTabsEditor {...editorProps}/>;
    }

    return (
      <div className='home-page-editor-pane-container'>
        <div className='home-page-editor-pane'>
          <div className='section-title'>
            <span className='title-text'>{FrontendConstants.HOME_PAGE_EDITOR}</span>
            <div className='close-button' onClick={this.closeHomePageEditor.bind(this)} />
          </div>
          <div className='home-page-editor-pane-content'>
            {content}
          </div>
        </div>
      </div>
    );
  }
}

export default withTransitionHelper(HomePageEditor);
