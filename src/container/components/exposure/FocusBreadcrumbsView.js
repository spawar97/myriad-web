import PropTypes from "prop-types";
import Imm from "immutable";
import _ from "underscore";
import ExposureActions from "../../actions/ExposureActions";
import Dashboard from "../Dashboard";
import FocusBreadcrumbs from "../common/FocusBreadcrumb";
import React from "react";
import RouteNameConstants from "../../constants/RouteNameConstants";
import ReportUtil from '../../util/ReportUtil';

class FocusBreadcrumbsView extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    location: PropTypes.object,
    params: PropTypes.shape({
      fileId: PropTypes.string,
    }),
    defaultFocusId: PropTypes.string.isRequired,
    listOfTags: PropTypes.array.isRequired,
    moduleDisplayName: PropTypes.string.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    let breadcrumbConfig = [{
      value: props.moduleDisplayName,
      type: 'label',
    }, {
      value: props.listOfTags,
      type: 'dropdown',
      onChange: this.changeFocusArea,
      defaultValue: '',
      immSelectedValue: Imm.Map(),
      param: 'selectedFocus',
      displayLabel: 'Focus',
    }, {
      value: Imm.List(),
      type: 'dropdown',
      onChange: this.changeAnalytics,
      defaultValue: '',
      param: 'selectedAnalytic',
      immSelectedValue: Imm.Map(),
      displayLabel: 'Analytics',
    }];

    this.state = {
      immModuleAnalytics: Imm.List(),
      immAnalytics: Imm.List(),
      selectedFocus: '',
      selectedFocusId: '',
      dashboardContent: null,
      fileId: '',
      immSelectedAnalytic: null,
      immSelectedFocus: null,
      breadcrumbConfig: Imm.fromJS(breadcrumbConfig),
    };
  }

  componentDidUpdate(prevProps) {
    const {immExposureStore: prevImmExposureStore} = prevProps;
    const {immExposureStore: newImmExposureStore} = this.props;
    const {immSelectedFocus} = this.state;

    const justFinishedFileConfigsRequest = prevImmExposureStore.get('fileConfigsRequestInFlight', false) && !newImmExposureStore.get('fileConfigsRequestInFlight', false);
    // If we have received an update to the file configs, update the module analytics
    if (justFinishedFileConfigsRequest) {
      // Set the list of analytics for the focus now that we have have this information
      this.getAnalyticsForFocus(immSelectedFocus, null, false);
    }
  }

  componentWillReceiveProps(newProps) {
    const {immExposureStore: prevImmExposureStore, immSelectedValue} = this.props;
    const {immExposureStore: newImmExposureStore, moduleDisplayName} = newProps;
    const {defaultFocusId, listOfTags} = this.props;
    const currentFileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    const nextFileId = ReportUtil.getReportOrDashboardId(newProps.params, newProps.query, newProps.immExposureStore);
    const isModuleActive = newProps.immExposureStore.get('isModuleActive')
    if ((currentFileId !== nextFileId && isModuleActive) || (currentFileId !== nextFileId && !isModuleActive)) {
      let selectedAnalyticTitle = newProps.immExposureStore.getIn(['fileConfigs', nextFileId, 'title']);
      let selectedModuleTag = newProps.immExposureStore.getIn(['fileConfigs', nextFileId, 'rank']).find(function (obj) {
        return obj.get('module') === moduleDisplayName;
      });

      let module = selectedModuleTag.get('module');
      let tag = selectedModuleTag.get('tag');

      if (module) {
        const immSelectedFocus = Imm.Map(_.find(listOfTags, tagInfo => tagInfo.title === tag));
        this.changeFocusArea(immSelectedFocus, selectedAnalyticTitle, true);
        ExposureActions.clearSelectedModuleOption();
      }
    }
  }

  componentDidMount() {
    const {defaultFocusId, listOfTags, immExposureStore, moduleDisplayName} = this.props;
    // Once the component mounts, select the default focus ID
    const focus = defaultFocusId;
    const isModuleActive = immExposureStore.get('isModuleActive');
    const currentFileId = ReportUtil.getReportOrDashboardId(this.props.params, this.props.query, this.props.immExposureStore);
    let selectedAnalyticTitle;
    let module;
    let tag;
    if (currentFileId) {
      selectedAnalyticTitle = immExposureStore.getIn(['fileConfigs', currentFileId, 'title']);
      let selectedModuleTag = immExposureStore.getIn(['fileConfigs', currentFileId, 'rank'])
          .find(function (obj) {
            return obj.get('module') === moduleDisplayName;
          });
      module = selectedModuleTag.get('module');
      tag = selectedModuleTag.get('tag');
    }
    if (!isModuleActive) {
      //after page refresh
      if (currentFileId) {
        if (module) {
          const immSelectedFocus = Imm.Map(_.find(listOfTags, tagInfo => tagInfo.title === tag));
          this.changeFocusArea(immSelectedFocus, selectedAnalyticTitle, true);
        }
      } else {
        // Use Imm.Map instead of fromJS to explicitly always convert to a map, even if the find fails
        let immSelectedFocus = Imm.Map(_.find(listOfTags, tagInfo => tagInfo.title === focus));
        if (!immSelectedFocus || immSelectedFocus.isEmpty()) {
          immSelectedFocus = listOfTags && listOfTags.length > 0
            ? Imm.Map(listOfTags[0])
            : Imm.Map();
        }
        this.changeFocusArea(immSelectedFocus);
      }
    } else {
      if (module) {
        const immSelectedFocus = Imm.Map(_.find(listOfTags, tagInfo => tagInfo.title === tag));
        this.changeFocusArea(immSelectedFocus, selectedAnalyticTitle, true);
      }
    }
  }

  componentWillUnmount() {
    // Wipe the flagged analytic that is active so master study filter will continue working as expected.
    ExposureActions.clearActiveFocusBreadcrumbsAnalytic();
  }

  updateBreadcrumbConfig(immSelectedFocus, immSelectedAnalytic, analytics, isDrillDown) {
    const {breadcrumbConfig} = this.state;
    // Update the breadcrumb configuration based off of the specified input parameters
    const immUpdatedBreadcrumbConfig = breadcrumbConfig.map(bc => {
      if (bc.has('param')) {
        // Update the selectedFocus parameters for the breadcrumbs
        if (bc.get('param').includes('selectedFocus')) {
          return bc.set('immSelectedValue', immSelectedFocus);
          // Update the selected analytics parameters for the breadcrumbs
        } else if (bc.get('param').includes('selectedAnalytic')) {
          return bc.set('value', analytics ? analytics : Imm.List())
            .set('immSelectedValue', immSelectedAnalytic ? immSelectedAnalytic : Imm.Map());
        }
      } else {
        return bc;
      }
    });
    const newFileId = immSelectedAnalytic ? immSelectedAnalytic.get('id') : '';

    // Set the active file in the store so that the master study filter will work as expected
    ExposureActions.setActiveFocusBreadcrumbsAnalytic(newFileId);

    if (!isDrillDown) {
      let moduleDisplayName = this.props.moduleDisplayName.toLowerCase();
      switch (moduleDisplayName) {
        case RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS:
          this.context.router.push({
            name: RouteNameConstants.EXPOSURE_OPERATIONS_INSIGHTS_REPORTS,
            params: {fileId: newFileId}
          });
          break;

        case RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS:
          this.context.router.push({
            name: RouteNameConstants.EXPOSURE_CLINICAL_INSIGHTS_REPORTS,
            params: {fileId: newFileId}
          });
          break;

        default:
          break;
      }
    }

    this.setState({
      breadcrumbConfig: immUpdatedBreadcrumbConfig,
      fileId: newFileId,
    });
  }

  /**
   * Changes the selected focus area to the given focus, and will update the list of analytics if they are available
   * @param immSelectedFocus - The focus to change to
   */
  changeFocusArea = (immSelectedFocus, selectedAnalyticTitle, isDrillDown) => {
    const {immExposureStore} = this.props;
    const focus = immSelectedFocus.get('title');
    const focusId = immSelectedFocus.get('value');

    // Get the list of analytics for the newly selected focus
    // If we do not yet have fileConfigs, this will be executed automatically in componentDidUpdate
    // to retrieve the list
    if (immExposureStore.get('fileConfigs', Imm.List()).size > 0) {
      this.getAnalyticsForFocus(immSelectedFocus, selectedAnalyticTitle, isDrillDown);
    }

    this.setState({
      selectedFocus: focus,
      selectedFocusId: focusId,
      immSelectedFocus,
    });
  };

  changeAnalytics = (immSelectedAnalytic) => {
    const {immAnalytics, immSelectedFocus} = this.state;
    this.updateBreadcrumbConfig(immSelectedFocus, immSelectedAnalytic, immAnalytics, false);
    this.setState({
      immSelectedAnalytic,
    });
  };

  sortAnalyticsByRank = (immAnalytic) => {
    let analyticsWithoutRank = [];
    let analyticsWithRank = [];
    let analyticsByRank = [];

    immAnalytic.toJS().forEach((analytic) => {
      if (analytic.rank)
        analyticsWithRank.push(analytic);
      else
        analyticsWithoutRank.push(analytic);
    });

    analyticsWithRank.sort((a, b) => {
      return a.rank - b.rank;
    });

    analyticsByRank = analyticsWithRank.concat(analyticsWithoutRank);
    return Imm.fromJS(analyticsByRank);
  };

  getAnalyticsForFocus = (immSelectedFocus, selectedAnalyticTitle, isDrillDown) => {
    const {immExposureStore, moduleDisplayName} = this.props;
    const focusName = immSelectedFocus.get('title', '');
    const defaultAnalytic = immSelectedFocus.get('defaultAnalytic', '');
    let immAnalyticsOption = selectedAnalyticTitle ? selectedAnalyticTitle : defaultAnalytic;

    // Get the analytics list for the module
    // Get list of reports for the selected focus
    let immAnalytics = immExposureStore.get('fileConfigs')
        .filter(x => {
          return x.get('rank').find(obj => {
            return x.get('modules') && x.get('modules').size > 0 && x.get('tags') && x.get('tags').size > 0 && obj.get('module') === moduleDisplayName && obj.get('tag') === focusName;
          })
        })
        .map(immAnalytic => {
          return this.transformExposureFile(immAnalytic);
        })
        .toList();

    immAnalytics = this.sortAnalyticsByRank(immAnalytics);
    if (immAnalytics.size > 0) {
      let immSelectedAnalytic = immAnalytics.get(0);
      const immDefaultAnalytic = immAnalytics.find(immAnalytic => {
        return immAnalytic.get('title') === immAnalyticsOption;
      });

      if (immDefaultAnalytic && Imm.Map.isMap(immDefaultAnalytic)) {
        immSelectedAnalytic = immDefaultAnalytic;
      }
      this.updateBreadcrumbConfig(immSelectedFocus, immSelectedAnalytic, immAnalytics, isDrillDown);
    } else {
      this.updateBreadcrumbConfig(immSelectedFocus);
    }

    this.setState({
      immAnalytics,
    });
  };

  findValueInList(list, value) {
    let isTagPresent = list.filter(l => {return l.title === value});

    return isTagPresent.length;
  }

  transformExposureFile(file) {
    const searchFields = [
      {key: 'title', value: file.get('title')},
      {key: 'description', value: file.get('description')},
    ];

    let rank = 0;
    const {moduleDisplayName} = this.props;
    let rankInFile = file.get('rank');
    let listOfTags = this.props.listOfTags;
    if (rankInFile.size) {
      rank = rankInFile.filter(r => {
        return file.get('modules') && file.get('modules').size > 0 && file.get('tags') && file.get('tags').size > 0 && r.get('module') === moduleDisplayName && this.findValueInList(listOfTags, r.get('tag'));
      }).map(r => {
        return r.get('rank');
      }).get(0);
    }

    let value = file.get('identifier');

    return Imm.fromJS({
      id: file.get('id'),
      title: file.get('title'),
      type: 'EXPOSURE',
      fileType: file.get('fileType'),
      value: value ? value : file.get('title'),
      searchFields: searchFields,
      rank: rank,
    });
  }

  _getDisplayContent() {
    const {fileId} = this.state;
    if (fileId) {
      // Extend / copying object doesn't perform a deep copy for nested objects. As such, any
      // updates to the 'params' field directly will update the object via reference, causing
      // deep "shouldComponentUpdate" functions to render false, since they were updated by ref.
      // Create a clone of dashboard's params each render so the child dashboard component will
      // re-render properly. We should consider updating the entire rendering framework to take
      // these parameters as immutable objects to avoid this in the future.
      const dashboardProps = _.extend({}, this.props);
      const dashboardParams = _.extend({}, dashboardProps.params);
      dashboardParams.fileId = fileId;
      dashboardProps.params = dashboardParams;

      return <Dashboard {...dashboardProps} />;
    } else {
      return (
        <div className="empty-content">
          <div className="empty-content-text-holder">
            <div className="icon-text-wrapper">
              <span className="icon-info"></span>
              <span className="empty-content-text">Please select an analytic to display.</span>
            </div>
          </div>
        </div>
      );
    }
  }

  render() {
    const {breadcrumbConfig} = this.state;
    const displayContent = this._getDisplayContent();
    const showTaskPane = this.props.immExposureStore.get('showTaskPane')

    return (
      <span className="focus-breadcrumbs-view">
        <div className="page-header breadcrumb-header">
          <div className="breadcrumbs">
            <FocusBreadcrumbs immBreadcrumbConfig={breadcrumbConfig} showTaskPane={showTaskPane} exposureStore={this.props.immExposureStore} fileId ={this.context.router.params.fileId}/>
          </div>
        </div>
        <div className="focus-dashboards">
          {displayContent}
        </div>
      </span>
    );
  }
}

export default FocusBreadcrumbsView;
