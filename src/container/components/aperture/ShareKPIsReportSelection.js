import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import Button from '../Button';

import AdminActions from '../../actions/AdminActions';
import FrontendConstants from '../../constants/FrontendConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import Spinner from '../Spinner';
import Checkbox from '../Checkbox';

import KPIDependencyMap from '../../resources/KPIDependencyMap.json';

class ShareKPIsReportSelection extends React.PureComponent {

  constructor(props) {
    super(props);

    this.state = {
      reportData: null,                               // The content folders that are available at the default organization, as well as whether the selected group has access to said folder
      dependencyMap: Imm.fromJS(KPIDependencyMap),    // The dependencies for each Comprehend OOB KPI, used to ensure an invalid configuration cannot be deployed
      errorList: Imm.List(),                          // Any errors that occur during updating sharing of OOB KPIs
      ignoreWarning: false                            // Whether the user should ignore the warnings & save report configuration
    };
  }

  componentWillReceiveProps(nextProps) {
    const id = nextProps.selectedGroup.get('id');

    // If current props doesn't have YF report data but the next props does, then set the state
    if (!this.props.immAdminStore.hasIn(['yfReports', id]) && nextProps.immAdminStore.hasIn(['yfReports', id])) {
      const reportData = nextProps.immAdminStore.getIn(['yfReports', id, 'shareData']);
      this.setState({
        initialReportData: this.state.initialReportData ? this.state.initialReportData : reportData,
        reportData: reportData
      });
    }
  }

  componentDidMount() {
    AdminActions.getYellowfinReportsForGroup(this.props.selectedGroup.get('id'));
  }

  /**
   * Checks the changes to sharing for the group, and will then perform an update if the changes are valid changes. If they are invalid,
   * then an error list will be generated and will let the user know which selections have an invalid configuration
   */
  handleSelection() {
    const difference = this.getShareChanges();

    const isValid = this.validateSelections();

    if (isValid || this.state.ignoreWarning) {
      AdminActions.saveYellowfinReportSharingForGroup(this.props.selectedGroup.get('id'), difference, this.selectionFinished.bind(this));
    }
    else {
      AdminActions.createStatusMessage("Invalid KPI Configuration - See error list at top of screen and adjust sharing accordingly", StatusMessageTypeConstants.TOAST_ERROR);
    }
  }

  // Gets the changes made to sharing for this group
  getShareChanges() {
    // TODO - After 2.8.0, move this diff logic to the backend and update the POST to send the entire set of data. All diffing logic should be on the backend
    return this.state.reportData.toSet().subtract(this.state.initialReportData.toSet());
  }

  /**
   * Performs validation of the selected sharing configuration for the group. Based on the KPI Dependency map, it will see
   * if all dependencies for every shared report is valid.
   *
   * TODO - After 2.8.0, move this validation to the backend!
   * @returns {boolean}
   */
  validateSelections() {
    const comprehendReports = this.state.reportData.filter((report) => report.get('parentRefCode') === 'COMPREHEND');
    const refCodeMap = comprehendReports.groupBy((report) => report.get('refCode')).map((report) => report.get(0));
    const validateReportList = refCodeMap.filter((report) => report.get('hasAccess'));
    const { dependencyMap } = this.state;

    let errorList = Imm.List();

    validateReportList.forEach((report, refCode) => {
      const hasAccess = report.get('hasAccess');
      const dependencies = dependencyMap.get(refCode, Imm.List());

      let missingDependencies = Imm.List();

      dependencies.forEach((dependencyRefCode) => {
        if (!validateReportList.has(dependencyRefCode)) {
          missingDependencies = missingDependencies.push(dependencyRefCode);
        }
      });

      if (!missingDependencies.isEmpty()) {
        const errorFolder = validateReportList.getIn([refCode, 'description']);
        const missingFolderNames = missingDependencies.map((dependencyRefCode) => refCodeMap.getIn([dependencyRefCode, 'description'])).join(', ');
        errorList = errorList.push(`${errorFolder} requires the following folders as dependencies: ${missingFolderNames}`);
      }
    });

    if (!errorList.isEmpty()) {
      this.state.errorList = errorList;
      return false;
    }

    return true;
  }

  /**
   * Once the selection is finished, will check whether it was a success or not.
   * If it was successful, then it will clear the group selection and return to the shareKPIs component, triggering an unmount on this component
   * If it was a failure, a status message will be displayed letting the user know
   *
   * @param success - Whether this was a successful operation
   */
  selectionFinished(success) {
    const groupName = this.props.selectedGroup.get('name');

    // Display the correct status message depending on whether this operation was successful
    if (success) {
      this.props.clearGroup();
      AdminActions.createStatusMessage(`Successfully updated Sharing for team ${groupName}`, StatusMessageTypeConstants.TOAST_SUCCESS);
    }
    else {
      AdminActions.createStatusMessage(`Error when attempting to update sharing for team ${groupName}`, StatusMessageTypeConstants.TOAST_ERROR);
    }
  }

  handleClick(contentFolderID, value) {
    const {reportData} = this.state;
    const index = reportData.findIndex((contentFolder) => contentFolder.get('id') === contentFolderID);

    this.setState({
      reportData: reportData.setIn([index, 'hasAccess'], value)
    });
  }

  handleSelectAll(parentRefCode, value) {
    let {reportData} = this.state;

    this.setState({
      reportData: reportData.map((report) => (report.get('parentRefCode') === parentRefCode) ? report.set('hasAccess', value) : report)
    });
  }

  handleIgnoreWarning() {
    this.setState({ignoreWarning: !this.state.ignoreWarning });
  }

  isReady() {
    // return this.props.immAdminStore.hasIn(['yfReports', this.props.selectedGroup.get('id')]);
    return this.state.reportData;
  }

  render() {
    if (!this.isReady()) {
      return <Spinner />;
    }

    const { reportData } = this.state;

    const reportInfoByTopFolder = reportData.groupBy((reportData) => reportData.get('parentRefCode'));

    let kpisByTopFolder = reportInfoByTopFolder.map((reportList, key) => {
      return (
        <div className='kpi-package-info' key={key}>
          <div className='kpi-package-header'>
            <div className='kpi-package-name'>
              <div className='package-name'>
                <span className='icon-folder' />{key}
              </div>
              <div className='toggle-all-kpis'>
                <Checkbox checkedState={reportList.reduce((memo, report) => memo && report.get('hasAccess'), true)}
                          onClick={this.handleSelectAll.bind(this, key)} />
                Select All
              </div>
            </div>

          </div>
          <div className='kpi-info'>
            {
              reportList
                .sortBy((kpi) => kpi.get('description').toUpperCase())
                .map((reportData) => {
                  const contentFolderID = reportData.get('id');

                  return (
                    <div className='report-info' key={contentFolderID}>
                      <Checkbox checkedState={!!Number(reportData.get('hasAccess', 0))}
                                onClick={this.handleClick.bind(this, contentFolderID)}/>
                      <div className='report-description'>{reportData.get('description')}</div>
                    </div>
                  );
                })
                .toList()
            }
          </div>
        </div>
      )
    }).toList();

    const errorList = this.state.errorList && !this.state.errorList.isEmpty()
      ? (
      <div className='error-list'>
        <div className='error-header'>
          <div className='error-icon'><span className='icon-WarningCircle'/></div>
          <div className='error-header-message'>{FrontendConstants.SHARE_KPIS_CONFIGURATION_WARNING}</div>
        </div>
        <ul className='error-message-list'>
          {this.state.errorList.map((error, key) => <li key={key} className='error-message'>{`${error}`}</li>).toSeq()}
        </ul>
        <div className='bypass-warning'>
          <Checkbox checkedState={this.state.ignoreWarning}
                    onClick={this.handleIgnoreWarning.bind(this)} />
          <div className='bypass-warning-message'>Ignore Warning</div>
        </div>
      </div>
    )
      : "";

    return (
      <div className='share-kpis-report-selection'>
        {errorList}
        {kpisByTopFolder}
        <div className='edit-buttons'>
          <Button
            children={FrontendConstants.UPDATE}
            isPrimary={true}
            onClick={this.handleSelection.bind(this)}
            isDisabled={this.state.initialReportData.equals(reportData)}
          />
          <Button
            children={FrontendConstants.CANCEL}
            isSecondary={true}
            onClick={this.props.clearGroup}
          />
        </div>
      </div>
    );
  }
}

ShareKPIsReportSelection.propTypes = {
  immAdminStore: PropTypes.instanceOf(Imm.Map).isRequired,
  selectedGroup: PropTypes.instanceOf(Imm.Map).isRequired,
  clearGroup: PropTypes.func.isRequired
};

export default ShareKPIsReportSelection;
