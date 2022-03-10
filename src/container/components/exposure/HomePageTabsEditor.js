import React from 'react';
import Imm from 'immutable';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import PropTypes from 'prop-types';

import Util from '../../util/util';
import HomePageUtil from '../../util/HomePageUtil';
import Combobox from '../Combobox';
import Button from "../Button";

import HomePageActions from '../../actions/HomePageActions';
import ExposureActions from "../../actions/ExposureActions";
import StatusMessageTypeConstants from "../../constants/StatusMessageTypeConstants";

import HomePageTabsList from './HomePageTabsList';

class HomePageTabsEditor extends React.PureComponent {
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immHomePageStore: PropTypes.instanceOf(Imm.Map).isRequired,
    isAdmin: PropTypes.bool
  };

  constructor(props) {
    super(props);

    const {immHomePageStore} = props;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);

    this.state = {
      groupEntityId: immHomePage.get('groupEntityId'),
      immBaseHomePage: immHomePage,
      immWorkingHomePage: immHomePage,
      isHomePagePersisted: immHomePage.get('id', null) != null,
    };
  }

  componentDidMount() {
    HomePageActions.saveStateHomePage(this.state.immBaseHomePage);
  }

  componentWillUnmount() {
    HomePageActions.deleteStateHomePage();
  }

  componentWillReceiveProps(nextProps) {
    const {immHomePageStore} = nextProps;
    const immNewHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    this.state = {
      groupEntityId: immNewHomePage.get('groupEntityId'),
      immBaseHomePage: this.state.immBaseHomePage,
      immWorkingHomePage: immNewHomePage,
      isHomePagePersisted: this.state.isHomePagePersisted,
    };
  }

  handleSelectReport(value) {
    const reportId = value.id;
    HomePageActions.addToHomePagePreview(reportId);
  }

  handleClearAll() {
    HomePageActions.clearAllHomePageTabs();
  }

  getReportsDropdown(){
    const {immExposureStore, immHomePageStore} = this.props;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
    const _immHomePageExposureIds = HomePageUtil.getTabIdsOfType(immHomePage, ExposureAppConstants.HOME_PAGE_FILE_TYPES.FILE);
    const immHomePageExposureOversightIds = HomePageUtil.getTabIdsOfType(immHomePage, ExposureAppConstants.HOME_PAGE_FILE_TYPES.OVERSIGHT_SCORECARD);
    const immHomePageExposureIds = _immHomePageExposureIds.concat(immHomePageExposureOversightIds);

    const reportType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_ANALYTICS));
    const dashboardType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_DASHBOARD));
    const builtinType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_BUILTIN));
    const monitorType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_MONITOR));
    const dataReviewType = Util.pluralize(Util.toTitleCase(ExposureAppConstants.FILE_TYPE_DATA_REVIEW));
    const oversightScorecardType = ExposureAppConstants.FILE_TYPE_OVERSIGHT_SCORECARD;
    const immFiles = Util.getAllReportsAndDashboards(immExposureStore, true);
    const _immOversightScorecard = Util.getOversightScorecard(immExposureStore);
    const immUpdatedFiles = _immOversightScorecard ? immFiles.concat(_immOversightScorecard) : immFiles;
    const immSortedUpdatedFiles = immUpdatedFiles.sortBy(item => item.text);
    const immReports = immSortedUpdatedFiles.filter(file => {
      const {type} = file;
      const isSupportedType = (type === reportType || type === dashboardType || type === builtinType
        || type === monitorType || type === dataReviewType || type === oversightScorecardType);

      return isSupportedType && !immHomePageExposureIds.contains(file.id);
    });

    return (
      <div className='input-block'>
        <div className='home-page-editor-report-selector-header'>
          <span className='home-page-editor-pane-text home-page-report-selector-text'>{FrontendConstants.ADD_TO_HOME_PAGE}</span>
        </div>
        <Combobox
          className='home-page-report-selector-dropdown'
          placeholder={FrontendConstants.SELECT_REPORTS}
          value=''
          valueKey='id'
          labelKey='text'
          passOnlyValueToChangeHandler={false}
          onChange={this.handleSelectReport.bind(this)}
          options={immReports}
        />
      </div>
    );
  }

  getHomePageReportsList(immExposureStore, immHomePageStore) {
    return <HomePageTabsList {...{immExposureStore, immHomePageStore}}/>;
  }

  getSubmitButton() {
    const {isHomePagePersisted} = this.state;
    const submitHandler = this.getSubmitHandler();
    return <Button
      icon='icon-loop2'
      children={isHomePagePersisted ? FrontendConstants.SAVE : FrontendConstants.CREATE}
      isPrimary={true}
      isDisabled={!this.isEdited()}
      onClick={submitHandler}
    />;
  }

  validate() {
      const {immHomePageStore} = this.props;
      const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);
      const immHomePageTabs = immHomePage.get('tabs', Imm.List());
      let violation = "";
      const maxAmount = 20;
      if (immHomePageTabs.size > maxAmount) {
          violation = FrontendConstants.AMOUNT_OF_IS_ABOVE("pages", immHomePageTabs.count(), maxAmount);
      }
      return violation
  }

  getSubmitHandler () {
    let submitHandler;
    if (!this.state.isHomePagePersisted) {
      submitHandler = this.handleCreateHomePage.bind(this);
    }
    else if (this.state.immWorkingHomePage && this.state.immWorkingHomePage.getIn(['tabs'], Imm.List()).size > 0) {
      submitHandler =  this.handleUpdateHomePage.bind(this);
    }
    else {
      submitHandler = this.handleDeleteHomePage.bind(this);
    }

    return submitHandler;
  }

  handleCreateHomePage () {
    const violation = this.validate();
    if (_.isEmpty(violation) ) {
      HomePageActions.submitHomePage(true, this.state.groupEntityId);
      HomePageActions.saveStateHomePage(this.state.immWorkingHomePage);
      HomePageActions.enableHomeConfigureLink();
    } else {
        ExposureActions.createStatusMessage(violation, StatusMessageTypeConstants.TOAST_ERROR);
    }
  }

  handleUpdateHomePage () {
    const violation = this.validate();
      if (_.isEmpty(violation) ) {
          HomePageActions.submitHomePage(false, this.state.groupEntityId);
          HomePageActions.saveStateHomePage(this.state.immWorkingHomePage);
          HomePageActions.enableHomeConfigureLink();
      } else {
          ExposureActions.createStatusMessage(violation, StatusMessageTypeConstants.TOAST_ERROR);
      }
  }

  handleDeleteHomePage () {
    HomePageActions.deleteHomePage(this.state.groupEntityId);
    HomePageActions.saveStateHomePage(this.state.immWorkingHomePage);
    HomePageActions.enableHomeConfigureLink();
  }

  isEdited() {
    const {immHomePageStore} = this.props;
    return HomePageUtil.isEditedHomePage(immHomePageStore);
  }

  render() {
    const {immExposureStore, immHomePageStore} = this.props;
    const immHomePage = HomePageUtil.getSelectedHomePage(immHomePageStore);

    return (
      <div>
        <div className='home-page-editor-reports-list'>
          <div className='home-page-editor-reports-list-header'>
            <span className='subheader-title'>{FrontendConstants.PAGES}</span>
            <Button
              classes={{'home-page-clear-all-tabs': true}}
              children={FrontendConstants.CLEAR_ALL}
              isSecondary={true}
              isDisabled={immHomePage.size === 0}
              onClick={this.handleClearAll.bind(this)}
            />
          </div>
          {this.getHomePageReportsList(immExposureStore, immHomePageStore)}
        </div>

        <br />
        {this.getReportsDropdown()}
        <br />
        <div>{this.getSubmitButton()}</div>
      </div>
    );
  }
}

HomePageTabsEditor.propTypes = {

};

export default HomePageTabsEditor;
