const React = require('react');
const createReactClass = require('create-react-class');
const ShallowCompare = require('react-addons-shallow-compare');
const _ = require('underscore');
const cx = require('classnames');
const Imm = require('immutable');
const Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
const MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
const MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
const MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
const Tooltip = React.createFactory(require('rc-tooltip').default);
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
const Button = React.createFactory(require('../Button'));
const Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
const Combobox = React.createFactory(require('../Combobox'));
const ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
const EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
const SimpleAction = React.createFactory(require('../SimpleAction'));
const ExposureActions = require('../../actions/ExposureActions');
const ExposureAppConstants = require('../../constants/ExposureAppConstants');
const FrontendConstants = require('../../constants/FrontendConstants');
const RouteNameConstants = require('../../constants/RouteNameConstants');
const SiteScorecardConstants = require('../../constants/SiteScorecardConstants');
const StudyScorecardConstants = require('../../constants/StudyScorecardConstants');
const AppRequest = require('../../http/AppRequest');
const GA = require('../../util/GoogleAnalytics');
const Util = require('../../util/util');
import HelpUtil from '../../util/HelpUtil';
import AccountUtil from '../../util/AccountUtil';
import {YellowfinUtil, YellowfinFilter} from '../../util/YellowfinUtil';
import ScorecardUtil from '../../util/ScorecardUtil';

const div = React.createFactory(require('../TouchComponents').TouchDiv);
const span = React.createFactory(require('../TouchComponents').TouchSpan);

const {table, thead, tbody, tfoot, th, tr, td, a} = DOM;
import { withTransitionHelper } from '../RouterTransitionHelper';

/**
 * Based on BuiltinTasksKPI.js
 */
var BuiltinSiteScorecardKPI = createReactClass({
  displayName: 'BuiltinSiteScorecardKPI',

  propTypes: {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number.isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function() {
    return {
      immSelectedStudies: Imm.List(),
      immSelectedStudyCros: Imm.List(),
      immSelectedSiteCras: Imm.List(),
      immSelectedSites: Imm.List(),
      immFilterOptions: Imm.List(),
      data: {},
      siteScorecardData: {},
      qualityAgreementsByStudy: {},
      filterOptions: {},
      immStudyOptions: Imm.List(),
      immStudyCroOptions: Imm.List(),
      immSiteCraOptions: Imm.List(),
      immSiteNameOptions: Imm.List(),
      immYellowfinReportMap: Imm.Map(),
      drilldowns: {},
      builtinDrilldownFileMap: {},
      drilldownSchemaId: null,
      displayFilters: this.props.immExposureStore.get('showFiltersPane'),
      isLoading: true,
      isLoadSiteScoreData: true,
      isLoadqualityAgreementsData: true,
      studyFilterIsMinimized: true,
      hasChangeFilter: false,
    };
  },

  componentDidMount: function() {
    // Once the component mounts, fetch required drilldown data & quality agreement data. The QA data is used to build
    // the report itself (pulls values & performs calculations based on data in the quality agreement). The drilldown
    // file list is used to know where we should drill down to for every entry in the report
    this.fetchDrilldownFiles();
    this.fetchQualityAgreementData();

    var backFilter = this.props.immExposureStore.getIn(['builtinBackFilter', this.props.params.fileId]);
    if (backFilter){
      let backFilterJS = backFilter.toJSON();
      this.setState({
        immStudyOptions: Imm.fromJS(backFilterJS.immStudyOptions),
        immSelectedStudyCros: Imm.fromJS(backFilterJS.siteCros),
        immSelectedSiteCras: Imm.fromJS(backFilterJS.siteCras),
        immSelectedSites: Imm.fromJS(backFilterJS.siteNames),
      });
      // reset filter
      ExposureActions.setBuiltinBackFilter(this.props.params.fileId, null)
      this.fetchData(backFilterJS.siteCros, backFilterJS.siteCras, backFilterJS.siteNames, true);
    } else {
      this.fetchData();
    }
    // Fetch file for build study sesion filter data
    ExposureActions.fetchFile(this.props.params.fileId, {}, {fetchData: true});
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  },


  componentWillReceiveProps: function(nextProps) {
    const nextAccountId = nextProps.immExposureStore.get('currentAccountId');
    const nextSelectedStudies = ScorecardUtil.getSelectedStudiesFilterFromSessionForAccount(nextAccountId);

    if (!Imm.is(this.state.immSelectedStudies, nextSelectedStudies)) {
      this.setState({
        immSelectedStudies: nextSelectedStudies
      });

      this.fetchData(this.state.immSelectedStudyCros.toJS());
    }
  },


  /**
   * If we are not using the V3 drilldown functionality, we'll need to call this API to build out the drilldown
   * targets & their necessary info from the query engine to perform drilldowns w/ filters applied.
   *
   * This is not used if we are using yellowfin drilldowns.
   */
  fetchDrilldownFiles: function() {
    if (AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig)) {
      YellowfinUtil.fetchYellowfinReportMap(this.setYellowfinReportMap);
    }
    else {
      this.fetchV2DrilldownFiles();
    }
  },

  /**
   * Sets the Yellowfin UUID map for drilldown information
   * @param uuidMap
   */
  setYellowfinReportMap: function(uuidMap) {
    this.setState({immYellowfinReportMap: Imm.Map(uuidMap)});
  },

  /**
   * Fetches all drilldown data necessary for the KPI scorecard (to drill to V2 reports)
   */
  fetchV2DrilldownFiles: function() {
    let url = `/api/builtin/file-kpi`;
    const request = {
      type: 'POST',
      url: url,
      data: {}
    };
    request.data = JSON.stringify(_.values(SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING));
    AppRequest(request)
    .then(
      data => {
          this.fetchDrilldownData(data.values);
      },
      () => {
        console.log('%cERROR: POST ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('POST ' + url + ' failed');
      }
    )
  },

  /**
   * If we are using the V2 drilldown functionality, we'll need to grab more data to properly construct the data
   * needed to perform drilldowns to other highcharts objects.
   *
   * This is not used if we are using Yellowfin drilldowns.
   *
   * @param files
   */
  fetchDrilldownData: function(files) {
    var comprehendSchemaId = files ? files[0].comprehendSchemaId:'';
    const params = $.param({
      schemaId: comprehendSchemaId
    });

    let url = `/api/builtin/drilldown-scorecard-kpi?${params}`;
    AppRequest({type: 'GET', url: url}).then(
      data => {
        const drilldownData = data.drilldowns ? _.chain(data.drilldowns.rows)
          .map(row => ({
            "studyid" : row.values[0],
            "siteid" : row.values[1],
            "drilldown": row.drilldown
          })).value() :{};
        this.setState({
          builtinDrilldownFileMap: files,
          drilldownSchemaId: comprehendSchemaId,
          drilldowns: drilldownData
        });
      },
      () => {
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  },

  /**
   * This will grab the data from the relevant quality agreement for the specified study. This is needed to
   * render the scorecard, as the values on the scorecard directly derive from whatever thresholds are defined
   * within the Quality Agreement.
   */
  fetchQualityAgreementData: function() {
    var that = this;
    ExposureActions.fetchQualityAgreements(function(data) {
      if (!data.errorMsg){
        const qualityAgreementsByStudy = that.buildQualityAgreementsByStudy();
        that.setState({
          isLoadqualityAgreementsData: false,
          qualityAgreementsByStudy: qualityAgreementsByStudy
        });
        if (!that.state.isLoadSiteScoreData){
          // We set isLoading is false for render form
          const siteScorecardData = that.buildSiteScorecardData(that.state.data, qualityAgreementsByStudy);
          that.setState({
            siteScorecardData: siteScorecardData,
            isLoading: false
          });
        }
      } else {
        if (!that.state.isLoadSiteScoreData){
          that.setState({isLoading: false});
        }
        console.log('%cERROR: ' + data.errorMsg, 'color: #E05353');
      }
    });
  },

  fetchData: function(siteCros, siteCras, siteNames, isBack = false) {
    const {immExposureStore} = this.props;
    const currentAccountId = immExposureStore.get('currentAccountId');
    this.setState({isLoading: true});
    let url = `/api/builtin/site-scorecard-kpi`;

    const request = {
      type: 'POST',
      url: url,
      data: {}
    };

    const selectedStudies = ScorecardUtil.getSelectedStudiesFilterFromSessionForAccount(currentAccountId).toJS();
    const studies = _.map(selectedStudies, studyName => {
      const studyId = Util.getStudyIdFromName(immExposureStore, studyName);
      return {value: studyId, label: studyName};
    });

    request.data = {
      'studies': studies?studies:[],
      'siteCros': siteCros?siteCros:[],
      'siteCras': siteCras?siteCras:[],
      'siteNames': siteNames?siteNames:[]
    };
    request.data = JSON.stringify(request.data);
    AppRequest(request)
    .then(
      data => {
        var studyId = studies && studies[0]? studies[0].value:null;
        const currentStudyCros = (data.filterOptions[studyId] || {}).studycros;
        const currentStudyCras = (data.filterOptions[studyId] || {}).sitecras;
        const currentSiteNames = (data.filterOptions[studyId] || {}).sitenames;

        const qualityAgreementsByStudy = this.buildQualityAgreementsByStudy();
        const buildScorecardData = this.buildSiteScorecardData(data.siteScorecardData, qualityAgreementsByStudy);
        this.setState({
          data: data.siteScorecardData,
          siteScorecardData: buildScorecardData,
          qualityAgreementsByStudy: qualityAgreementsByStudy,
          filterOptions: data.filterOptions,
          immFilterOptions: Imm.fromJS(data.filterOptions),
          immStudyOptions: Imm.fromJS(_.map(data.filterOptions, (value, studyid) => ({value: studyid, label: value.name}))).sortBy(immStudy => immStudy.get('label')),
          immStudyCroOptions: Imm.fromJS(_.map(currentStudyCros, (value, croname) => ({value: value.croid, label: croname}))).sortBy(immCro => immCro.get('label')),
          immSiteCraOptions: Imm.fromJS(_.map(currentStudyCras, (value, sitecraname) => ({value: value.siteid, label: sitecraname}))).sortBy(immCra => immCra.get('label')),
          immSiteNameOptions: Imm.fromJS(_.map(currentSiteNames, (value, sitename) => ({value: value.siteid, label: sitename}))).sortBy(immSite => immSite.get('label')),
          isLoadSiteScoreData: false,
        });

        if (!this.state.isLoadqualityAgreementsData){
          // We set isLoading is false for render form
          this.setState({
             isLoading: false,
          });
        }
      },
      () => {
        if (!this.state.isLoadqualityAgreementsData){
          this.setState({isLoading: false});
        }
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  },

  buildQualityAgreementsByStudy: function(){
    const qualityAgreements = this.props.immExposureStore.get('qualityAgreements').toJSON();
    return  _.chain(qualityAgreements)
      .filter(({studyId, kpis}) => _.contains(_.pluck(kpis, 'enabled'), true))
      .map(({studyId, croId, availableThresholds, kpis}) => {
        const checkKpis =  _.chain(kpis)
                      .filter(kpi => kpi.enabled)
                      .value();
        return  {
          identifier: JSON.stringify([studyId, croId]),
          studyId: studyId,
          croId : croId,
          availableThresholds: availableThresholds,
          kpis: checkKpis
        }
      })
      .groupBy('identifier')
      .value();
  },
  buildSiteScorecardData:function(siteCroScoresData, qualityAgreementsByStudy){
    // Buid report content
    const siteCroScoresByStudyCro = _.chain(siteCroScoresData)
      .filter(row => _.has(qualityAgreementsByStudy, JSON.stringify([row.studyid, row.croid])))
      .map(({studyid, studyname, croid, croname, siteid, sitename, sitecraname, kpiid, kpiscore, drilldown}) => ({
          identifier: JSON.stringify([studyid, croid]),
          studyid: studyid,
          studyname: studyname,
          siteid: siteid,
          sitename: sitename,
          sitecraname: sitecraname,
          croid: croid,
          croname: croname,
          kpiid: kpiid,
          kpiscore: kpiscore,
          drilldown: drilldown
      }))
      .sortBy('identifier')
      .groupBy('identifier')
      .value();

    // calculated site Cro Scores by Kpi score
    return _.mapObject(siteCroScoresByStudyCro, (siteCroRows, vizGroupIdentifier) => {
      let qualityAgreementsByStudyCro = qualityAgreementsByStudy[vizGroupIdentifier][0];
      let siteCroScoresGroupKPI = _.chain(siteCroRows)
      .map(({studyid, studyname, croid, croname, siteid, sitename, sitecraname, kpiid, kpiscore, drilldown}) => ({
              identifier: JSON.stringify([studyid, croid, siteid]),
              studyid: studyid,
              studyname: studyname,
              siteid: siteid,
              sitename: sitename,
              sitecraname: sitecraname,
              croid: croid,
              croname: croname,
              kpiid: kpiid,
              kpiscore: kpiscore,
              drilldown: drilldown
      }))
      .groupBy('identifier')
      .value();

      let returnSiteCroScores = _.mapObject(siteCroScoresGroupKPI, (groupRows, identifier) => {
          let groupSiteCroScores = {
              studyid: groupRows[0].studyid,
              studyname: groupRows[0].studyname,
              siteid: groupRows[0].siteid,
              sitename: groupRows[0].sitename,
              sitecraname: groupRows[0].sitecraname,
              croid: groupRows[0].croid,
              croname: groupRows[0].croname? groupRows[0].croname: ''
          }
          let tooltips = {};
          let drilldowns = {};
          let kpifileIds = {};
          _.each(groupRows, item => {
              let qAKpiScore = _.find(qualityAgreementsByStudyCro.kpis, p => p.id === item.kpiid);
              let kpiIndex = _.findIndex(_.keys(SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING), item.kpiid);
              if (qAKpiScore){
                  groupSiteCroScores[item.kpiid] = this.getKpiScoreStatus(item.kpiid, item.kpiscore, qAKpiScore);
                  tooltips[item.kpiid] = this.buildTooltip(item.kpiscore, item.kpiid, qAKpiScore);
                  drilldowns[item.kpiid] = item.drilldown;
                  kpifileIds[item.kpiid] = kpiIndex;
              } else {
                  tooltips[item.kpiid] = SiteScorecardConstants.SITE_SCORECARD_CONFIG.emptyTootipMessage;
              }
          });
          groupSiteCroScores.tooltips = tooltips;
          groupSiteCroScores.drilldowns = drilldowns;
          groupSiteCroScores.kpifileIds = kpifileIds;
          groupSiteCroScores.kpiscore= this.getSiteScoreStatus(groupSiteCroScores)
          return groupSiteCroScores;
      });

      // Build header
      let scoreHeader = {
              sitename: {name: 'Site Name' , sorttype : '', isscore: false, iskpi: false},
              siteid: {name: 'Site Identifier' , sorttype : '', isscore: false, iskpi: false},
              sitecraname: {name: 'CRA Name' , sorttype : '', isscore: false, iskpi: false},
              kpiscore: {name: 'Site Score' , sorttype : '', isscore: true, iskpi: false},
          }
      _.each(qualityAgreementsByStudyCro.kpis, item => {
        // Check kpi had exist on SiteCroScores data
        let checkKpi = _.findKey(_.values(returnSiteCroScores), item.id);
        if (_.size(checkKpi) > 0){
            scoreHeader[item.id] = {
                name:item.name,
                sorttype:'',
                isscore: true,
                iskpi: true
            }
        }
      });

      return {
        header: scoreHeader,
        studyid: siteCroRows[0].studyid,
        studyname: siteCroRows[0].studyname,
        croid: siteCroRows[0].croid,
        croname: siteCroRows[0].croname,
        siteCroData: _.values(returnSiteCroScores)
      };
    });
  },

  checkQualityAgreements: function(studyid) {
    let checkQualityAgreements = _.chain(_.values(this.state.qualityAgreementsByStudy))
      .filter(row => (row[0] && row[0].studyId == studyid))
      .map(row => ({
          studyid: row[0].studyId,
          croId: row[0].croId
      }))
      .value()
    let selectCROItemMap = this.state.immSelectedStudyCros.toJS() ? this.state.immSelectedStudyCros.toJS(): Imm.List();
    if (_.size(checkQualityAgreements) == 1){
      let croIds = _.pluck(checkQualityAgreements, 'croId')
      const currentStudyCros = (this.state.filterOptions[studyid] || {}).studycros;
      const immStudyCroOptions = Imm.fromJS(_.map(currentStudyCros, (value, croname) => ({value: value.croid, label: croname}))).sortBy(immCro => immCro.get('label'));
      selectCROItemMap = immStudyCroOptions.filter(immItem => _.contains(croIds, immItem.get('value'))).toJS();
    }
    return selectCROItemMap
  },

 handleStudyCroDropdown: function(items) {
    let selectItemMap = this.state.immStudyCroOptions.filter(immItem => _.contains(items, immItem.get('value'))).toJS();
    this.setState({immSelectedStudyCros:  Imm.fromJS(selectItemMap), hasChangeFilter: true });
  },

  handleSiteCraDropdown: function(items) {
    let selectItemMap = this.state.immSiteCraOptions.filter(immItem => _.contains(items, immItem.get('value'))).toJS();
    this.setState({immSelectedSiteCras:  Imm.fromJS(selectItemMap), hasChangeFilter: true});
  },

  handleSiteNameDropdown: function(items) {
    let selectItemMap = this.state.immSiteNameOptions.filter(immItem => _.contains(items, immItem.get('value'))).toJS();
    this.setState({immSelectedSites: Imm.fromJS(selectItemMap), hasChangeFilter: true});
  },

  resetAllFilters: function() {
    let selectCROItemMap = (this.state.immSelectedStudies.size === 1) ? Imm.fromJS(this.checkQualityAgreements(this.state.immSelectedStudies.getIn(['0','value'], ''))) : Imm.List();
    this.setState({immSelectedStudyCros: selectCROItemMap,
                  immSelectedSiteCras: Imm.List(),
                  immSelectedSites: Imm.List(),
                  hasChangeFilter: true});
    this.fetchData(
      selectCROItemMap,
      Imm.List().toJS(),
      Imm.List().toJS()
    );
  },

  applyFilters: function() {
    this.fetchData(
      this.state.immSelectedStudyCros.toJS(),
      this.state.immSelectedSiteCras.toJS(),
      this.state.immSelectedSites.toJS()
    );
  },

  handleDisplayFilters: function(state) {
    this.setState({displayFilters: state});
    ExposureActions.toggleFiltersPane(state);
  },

  handleSortHeader: function(event) {
    let studyid = event.target.getAttribute('data-studyid');
    let croid = event.target.getAttribute('data-croid');
    let sortid = event.target.getAttribute('data-sortid');
    let sorttype = event.target.getAttribute('data-sorttype');

    sorttype = sorttype=='asc'?'desc':'asc';

    // sort content of list
    let newSiteScorecardData = this.state.siteScorecardData;
    let studyCro = newSiteScorecardData[JSON.stringify([studyid, croid])];
    let isScoreSort = false;
    _.each(studyCro.header, (headerItem, headerKey) => {
      if (headerKey == sortid){
         studyCro.header[headerKey].sorttype = sorttype;
         isScoreSort = headerItem.iskpi? true:false;
      } else {
        studyCro.header[headerKey].sorttype = '';
      }
    });

    // Check sort sitename for kpi score sort
    if (isScoreSort  || sortid == "kpiscore"){
      studyCro.siteCroData = sorttype=='asc'? _.sortBy(studyCro.siteCroData, 'sitename'): _.sortBy(studyCro.siteCroData, 'sitename').reverse();
    }

    studyCro.siteCroData = sorttype=='asc'? _.sortBy(studyCro.siteCroData, sortid): _.sortBy(studyCro.siteCroData, sortid).reverse();
    newSiteScorecardData[JSON.stringify([studyid, croid])] = studyCro;

    // set state for re render UI
    this.setState({
      siteScorecardData: newSiteScorecardData,
      key: Math.random()
    });
  },

  /**
   * If we're performing a drilldown to a Yellowfin report, we need to find the target report from the user's
   * accessible OOB KPI list & build a redirect link to that report. We'll also need to pass that report
   * the specified site filter
   *
   * @param kpiKey
   * @param studyCroItem
   */
  handleYellowfinDrilldown: function(kpiKey, studyCroItem) {
    const fileTitle = SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING_V3[kpiKey] && SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING_V3[kpiKey].name;
    const reportType = SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING_V3[kpiKey] && SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING_V3[kpiKey].type;
    const reportUUID = this.state.immYellowfinReportMap.get(fileTitle + '_' + reportType, "");
    const routeName = reportType === 'DASHBOARD'
      ? RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW
      : RouteNameConstants.EXPOSURE_EMBEDDED_REPORTS_SHOW;

    // Build out the Study Name filter so we can pass that to Yellowfin
    const studyName = studyCroItem.studyname;
    const studyFilterNames = ['Study', 'Study Name'];
    const studyFilterValues = [studyName];


    // Build out the Site Name filter so we can pass that off to Yellowfin
    const siteName = studyCroItem.sitename;
    const filterNames = ['Site', 'Site Name'];
    const filterValues = [siteName];

    let yellowfinFilters = [
      new YellowfinFilter(studyFilterNames, studyFilterValues), // Study filter info
      new YellowfinFilter(filterNames, filterValues)            // Site filter info
    ];

    if (reportUUID) {
      // this.context.router.replace({name: RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW, params: {taskId: this.props.params.taskId}});
      this.context.router.push({name: routeName, state: {filters: yellowfinFilters}, params: {fileId: reportUUID}});
    }

    // TODO - now need to build out support for generic filters & send those to yellowfin through params
  },

  /**
   * Handles click events for the rendered chart. Will perform a drilldown to either a V2 highcharts KPI, or if we are using
   * the v3 UI updates feature flag, will call handleYellowfinDrilldown & use that to handle the drill to a YF report
   * @param kpiKey
   * @param studyCroItem
   */
  handleDrilldown: function(kpiKey, studyCroItem) {
    const currentFileId = this.props.params.fileId;

    const useYellowfin = AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig);

    if (useYellowfin) {
      this.handleYellowfinDrilldown(kpiKey, studyCroItem);
      return;
    }

    const fileTitle = SiteScorecardConstants.SITE_SCORECARD_DRILLDOWN_MAPPING[kpiKey];
    const selectFile = this.state.builtinDrilldownFileMap && this.state.builtinDrilldownFileMap.filter ? this.state.builtinDrilldownFileMap.filter(immItem =>  fileTitle === immItem.title)[0]: {};
    const drilldownData = this.state.drilldowns && this.state.drilldowns.filter ? this.state.drilldowns.filter(dItem => dItem.studyid == studyCroItem.studyid && dItem.siteid == studyCroItem.siteid)[0]:{};
    const drilldownFileId  = selectFile? selectFile.id: '';
    const schemaId = selectFile? selectFile.comprehendSchemaId: '';

    if (!drilldownFileId || !drilldownData) {
      return console.log(`%cERROR: Cannot perform drilldown for reportId: ${currentFileId}. Error: Report not found.`, 'color: #E05353');
    }
    const backId = currentFileId;
    const backRoute = this.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
    const backParams = {fileId: backId};
    const backText = this.props.dashboardId? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

    const fileType = selectFile? selectFile.type: ExposureAppConstants.FILE_TYPE_REPORT;;
    const toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;

    // We store current filter for the back button on drill down report
    var backFilter = {
      'studyOptions' : this.state.immStudyOptions,
      'studies': this.state.immSelectedStudies,
      'siteCros': this.state.immSelectedStudyCros,
      'siteCras': this.state.immSelectedSiteCras,
      'siteNames': this.state.immSelectedSites,
    };

    ExposureActions.setBuiltinBackFilter(this.props.params.fileId, JSON.parse(JSON.stringify(backFilter)));

    try {
      var drilldown = null;
      drilldown = JSON.parse(JSON.stringify(drilldownData.drilldown));
      ExposureActions.drilldownUpdateCurrentSelectionCondition(this.props.params.fileId, null, [drilldown]);
      _.defer(this.transitionToRelated.bind(null, toRoute, drilldownFileId, null, schemaId, backRoute, backParams, backText));
    } catch (e) {
      console.log(`%cERROR: Cannot perform drilldown for reportId: ${currentFileId}. Error: ${e}`, 'color: #E05353');
    }
  },

  transitionToRelated: function(route, fileId, chartDrilldownKey, schemaId, backRoute, backParams, backText) {
    ExposureActions.pushBackNavAction(Imm.Map({text: backText, backAction: () => this.context.router.push({name: backRoute, params: backParams})}));
    ExposureActions.clearFileFilterState(fileId);
    ExposureActions.builtinDrilldownHandleRelatedFile(this.props.params.fileId, this.props.drilldownId, chartDrilldownKey, schemaId, (query) => this.context.router.push({name: route, params: {fileId}, query}));
    return false;
  },

  getFilterPane: function() {
    return div({className: 'filters'},
      div({className: 'sub-tab-header'},
        FrontendConstants.FILTERS,
        div({className: 'close-button', onClick: this.handleDisplayFilters.bind(null, false)})),
        div({className: 'panel included-filter'},
          div({className: 'panel-sub-header text-truncation block-underline'},
            span({className: 'panel-sub-header-title'}, FrontendConstants.INCLUDED),
            div({className: 'filter-buttons-wrapper'},
              Button({classes: {'reset-all-button': true},
                      children: FrontendConstants.RESET_ALL,
                      isSecondary: true,
                      onClick: this.resetAllFilters}),
              Button({classes: {'apply-filters-button': true},
                      children: FrontendConstants.APPLY,
                      isPrimary: true,
                      onClick: this.applyFilters})
            ),
          ),
          div({className: 'filter-block'},
            div({className: 'filter-title'}, FrontendConstants.CRO_NAME),
            Combobox({
              // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
              // of that and not click needlessly to close the dropdown after selection.
              className: cx('dropdown', 'autoblur', 'studycro-input'),
              placeholder: FrontendConstants.CRO_NAME,
              multi: true,
              value: this.state.immSelectedStudyCros,
              valueKey: 'value',
              labelKey: 'label',
              onChange: this.handleStudyCroDropdown,
              autoBlur: true,
              options: this.state.immStudyCroOptions
            }),
            div({className: 'filter-title'}, FrontendConstants.SITE_CRA_NAME),
            Combobox({
              // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
              // of that and not click needlessly to close the dropdown after selection.
              className: cx('dropdown', 'autoblur', 'sitecra-input'),
              placeholder: FrontendConstants.SITE_CRA_NAME,
              multi: true,
              value: this.state.immSelectedSiteCras,
              valueKey: 'value',
              labelKey: 'label',
              onChange: this.handleSiteCraDropdown,
              autoBlur: true,
              options: this.state.immSiteCraOptions
            }),
            div({className: 'filter-title'}, FrontendConstants.SITE_NAME),
            Combobox({
              // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
              // of that and not click needlessly to close the dropdown after selection.
              className: cx('dropdown', 'autoblur', 'sitename-input'),
              placeholder: FrontendConstants.SITE_NAME,
              multi: true,
              value: this.state.immSelectedSites,
              valueKey: 'value',
              labelKey: 'label',
              onChange: this.handleSiteNameDropdown,
              autoBlur: true,
              options: this.state.immSiteNameOptions
            })
          ))
      );
  },


  getIncreasePercent: function(kpiScore, kpiScorePlan) {
    if (kpiScore === kpiScorePlan) {
      return 0;
    }
    if (kpiScorePlan === 0) {
      return 100;
    } else {
      return (kpiScore - kpiScorePlan) / kpiScorePlan * 100;
    }
  },

  getKpiScoreStatus: function(kipKey, kpiScore, qAKpiScore) {
    if (typeof kpiScore !== 'undefined' && kpiScore !== null ) {
        let planValue = StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kipKey] && qAKpiScore.plan != undefined ? qAKpiScore.plan / 100: qAKpiScore.plan
        let percentChange = this.getIncreasePercent(kpiScore, planValue);
        if (isNaN(percentChange)) return SiteScorecardConstants.SITE_SCORECARD_CONFIG.empty;
        let targetVariance = _.find(qAKpiScore.thresholds, p => p.name === SiteScorecardConstants.SITE_SCORECARD_CONFIG.targetVariance).value;
        let maxVariance = _.find(qAKpiScore.thresholds, p => p.name === SiteScorecardConstants.SITE_SCORECARD_CONFIG.maxVariance).value;
        if (typeof targetVariance == 'undefined' || targetVariance == null ) {
          if (maxVariance >= 0){
            if (percentChange <= maxVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
            } else {
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
            }
          } else {
             if (percentChange >= maxVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
            } else {
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
            }
          }
        } else {
          if (targetVariance > 0 || (targetVariance == 0 && maxVariance > 0)){
            if (percentChange < targetVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
            } else if ( percentChange <= maxVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.yellow;
            } else {
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
            }
          } else if (targetVariance == 0 && maxVariance < 0) {
            if (percentChange > targetVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
            } else if (percentChange >  maxVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.yellow;
            } else {
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
            }
          } else {
            if (percentChange < maxVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
            } else if (percentChange <= targetVariance){
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.yellow;
            } else {
              return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
            }
          }
        }
    } else {
        return SiteScorecardConstants.SITE_SCORECARD_CONFIG.empty
    }
  },

  getSiteScoreStatus: function(siteScoreItem) {
    let siteScoreItemValue = _.values(siteScoreItem)
    if (_.contains(siteScoreItemValue, SiteScorecardConstants.SITE_SCORECARD_CONFIG.red)){
        return SiteScorecardConstants.SITE_SCORECARD_CONFIG.red;
    } else if (_.contains(siteScoreItemValue, SiteScorecardConstants.SITE_SCORECARD_CONFIG.yellow)){
        return SiteScorecardConstants.SITE_SCORECARD_CONFIG.yellow;
    } else if (_.contains(siteScoreItemValue, SiteScorecardConstants.SITE_SCORECARD_CONFIG.green)){
        return SiteScorecardConstants.SITE_SCORECARD_CONFIG.green;
    } else {
      return SiteScorecardConstants.SITE_SCORECARD_CONFIG.empty;
    }
  },

  buildTooltip: function(kpiScore, kpiid, qAKpiScore) {
    let targetVariance = _.find(qAKpiScore.thresholds, p => p.name === SiteScorecardConstants.SITE_SCORECARD_CONFIG.targetVariance);
    let maxVariance = _.find(qAKpiScore.thresholds, p => p.name === SiteScorecardConstants.SITE_SCORECARD_CONFIG.maxVariance);
    let planValue = StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kpiid] && qAKpiScore.plan != undefined ? qAKpiScore.plan / 100: qAKpiScore.plan
    let planUnit = StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kpiid] ? SiteScorecardConstants.SITE_SCORECARD_CONFIG.planPercentUnit: SiteScorecardConstants.SITE_SCORECARD_CONFIG.planRawUnit
    let percentChange = Util.round(this.getIncreasePercent(kpiScore, planValue), 3);
    let formatPlanValue

    return !isNaN(percentChange)? `${qAKpiScore.name} (${planUnit})<br />`
        + `Plan value: ${qAKpiScore.plan}${StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kpiid]? '%': ''}<br />`
        + `Target variance threshold from plan: ${Util.toPercentStr(targetVariance.value)}%<br />`
        + `Maximum variance threshold from plan: ${Util.toPercentStr(maxVariance.value)}%<br />`
        + `Current ${qAKpiScore.name} at Site: ${Util.formatPlanValueOrKPIScoreToDisplay(parseFloat(kpiScore), kpiid)} (${Util.toPercentStr(percentChange)}% from plan)<br />` : SiteScorecardConstants.SITE_SCORECARD_CONFIG.emptyTootipMessage
  },

  breakLineTooltip: function(text) {
    if (!text) return SiteScorecardConstants.SITE_SCORECARD_CONFIG.emptyTootipMessage;
    var regex = /(<br \/>)/g;
    return text.split(regex).map(function(line, index) {
        return !line.match(regex) ? div({key: `key_${index}`}, `${line}`): ``;
    });
  },

  buildSiteScorecardTable: function(siteCroScores) {
    let layout = _.map(siteCroScores, (studyCro, studyCroKey) => {
      if (_.size(studyCro) == 0){
        return;
      }
      // Build header of table list
      let header = tr({className:'table-header', id: `header_${studyCro.studyid}_${studyCro.croid}`, 'data-studyid': `${studyCro.studyid}`, 'data-croid':`${studyCro.croid}`},
                    _.map(studyCro.header, (headerItem, headerKey) => {
                      return th({key: `${headerKey}`, className:'site-scorecard-header'},
                        div({className:'virtual-table-row'},
                          div({className:'fixed-data-table-header-contents virtual-table-cell'}, headerItem.name),
                          div({className: 'fixed-data-table-header-sorter virtual-table-cell'},
                            div({className:`icon ${headerItem.sorttype=='asc'?'icon-ascending-alt': headerItem.sorttype=='desc'?'icon-descending-alt': `icon-menu`}`, onClick:this.handleSortHeader , 'data-sortid':`${headerKey}`, 'data-sorttype': `${headerItem.sorttype}`, 'data-studyid': `${studyCro.studyid}`, 'data-croid': `${studyCro.croid}`})
                          )
                        )
                      )
                    })
                  )
      return div({className: 'site-scorecard-group' ,key:`div_${studyCro.studyid}_${studyCro.croid}`},
              div({className: 'site-scorecard-container'},
                div({className: 'site-scorecard-ourner'},
                  div({className: 'site-scorecard-title'}, `${studyCro.croname} ${studyCro.studyname} Site Scorecard`),
                  table({className: 'site-scorecard-table'},
                    thead(null, header),
                    tbody({id: `list_${studyCro.studyid}_${studyCro.croid}`}, this.buildSiteScorecardItem(studyCro)),
                    tfoot(null,
                      tr(null,
                        td({colSpan: '50'}, null)
                      )
                    )
                  )
                )
              ),
              div({className: 'site-scorecard-legend'},
                div({className: 'site-scorecard-legend-item'}, span({className: 'legend-circle c-green'}),'Better or on plan'),
                div({className: 'site-scorecard-legend-item'}, span({className: 'legend-circle b-yellow'}),'Between target and max variance thresholds'),
                div({className: 'site-scorecard-legend-item'}, span({className: 'legend-circle a-red'}),'Beyond max variance threshold'),
                div({className: 'site-scorecard-legend-item'}, span({className: 'legend-circle d-none'}),'Cannot calculate')
              )
            )
    });
    return div({key:'sitecros'}, layout)
  },

  buildSiteScorecardItem: function(studyCro){
      // Build content of table list
    return  _.map(studyCro.siteCroData, studyCroItem => {
      let kpiHtml =  _.map(studyCro.header, (headerItem, headerKey) => {
        if (headerItem.iskpi){
           const tooltipContent = div({className: 'site-scorecard-tooltip'}, this.breakLineTooltip(studyCroItem.tooltips[headerKey]));

          return td({key: `value_${studyCro.studyid}_${studyCro.croid}_${headerKey}`, className: 'drilldown-element ' + headerKey, 'data-drilldown': JSON.stringify(studyCroItem.drilldowns[headerKey]), 'data-drilldown-id': headerKey},
                  Tooltip(Util.getTooltipClasses(null, tooltipContent, 'left', 350), div({className: `circle ${studyCroItem[headerKey]? studyCroItem[headerKey] : ''}`, onClick:this.handleDrilldown.bind(this, headerKey, studyCroItem)}))
                )
        }
      });
      return tr({className:'table-row', key: `item_${studyCro.studyid}_${studyCro.croid}_${studyCroItem.siteid}`},
                td({key: `value_${studyCro.studyid}_${studyCro.croid}_sitename`, className:'sitename'}, `${studyCroItem.sitename}`),
                td({key: `value_${studyCro.studyid}_${studyCro.croid}_siteid`, className:'siteid'}, `${studyCroItem.siteid}`),
                td({key: `value_${studyCro.studyid}_${studyCro.croid}_sitecraname`, className:'sitecraname'}, `${studyCroItem.sitecraname}`),
                td({key: `value_${studyCro.studyid}_${studyCro.croid}_kpiscore`, className:'kpiscore'}, div({className: `circle ${studyCroItem.kpiscore? studyCroItem.kpiscore : ''}`})),
                kpiHtml
            )
    })
  },
  createViz: function() {
    if (this.state.isLoading) return;
    let hasConfigQuanlity = _.find(this.state.qualityAgreementsByStudy, p => (_.contains(_.pluck(p[0].kpis, 'enabled'), true)));
    if (!hasConfigQuanlity) {
      return EmptyContentNotice({noticeText: FrontendConstants.NO_QUALITY_AGREEMENT_CONFIGURED})
    } else {
      if (this.state.immSelectedStudies.isEmpty()) {
        return EmptyContentNotice({noticeText: FrontendConstants.SITE_SCORECARD_FILTERS_NO_SELECT});
      }
      // Check single study select for view site scorecard
      if (this.state.immSelectedStudies.size > 1) {
        return EmptyContentNotice({noticeText: FrontendConstants.PLEASE_SELECT_A_SINGLE_STUDY_TO_VIEW_SITE_SCORECARD});
      }
      if (_.isEmpty(this.state.siteScorecardData)) {
        let hasQuanlity = _.find(this.state.qualityAgreementsByStudy, p => (
                    _.contains(_.pluck(this.state.immSelectedStudies.toJS(),'value'), p[0].studyId)
                    && _.contains(_.pluck(this.state.immSelectedStudyCros.toJS(),'value'), p[0].croId)
                    && _.contains(_.pluck(p[0].kpis, 'enabled'), true)
            ));

        return hasQuanlity ? EmptyContentNotice({noticeText: FrontendConstants.NO_DATA_RETURNED}): EmptyContentNotice({noticeText: FrontendConstants.NO_QUALITY_AGREEMENT_CONFIGURED_FOR_STUDY});
      }
      return this.buildSiteScorecardTable(this.state.siteScorecardData);
    }
  },

  /**
   * Checks whether the required information to render the KPI has been loaded successfully. Basically we check to see if
   * the quality agreement data has been fetched (controlled by this.state.isLoading), and whether the drilldown information
   * has been initialized.
   *
   * @returns {boolean} - True if we're ready to render the scorecard, false otherwise
   */
  isReady: function() {
    let hasDrilldownInfo = AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig)
      ? !this.state.immYellowfinReportMap.isEmpty()
      : !_.isEmpty(this.state.drilldowns);

    return !this.state.isLoading && hasDrilldownInfo;
  },

  render: function() {
    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.params.fileId;
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);
    const immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    const reportTitle = immFile.get('title');

    let content;

    if (!this.isReady()) {
      content = ContentPlaceholder();
    }
    else if (Util.isDesktop()) {
      content = div({className: 'builtin-view-container'},
        div({className: 'page-header'},
          isHomeActive
            ? null
            : Breadcrumbs({
                immExposureStore,
                fileId
              }),
          div({className: 'header-buttons'},
            SimpleAction({class: 'toggle-filters icon-filter2 filters_button', text: FrontendConstants.FILTERS, onClick: this.handleDisplayFilters.bind(null, !this.state.displayFilters)}),
            Menu({className: 'more-menu', horizontalPlacement: 'left'},
              MenuTrigger({className: 'more-menu-trigger'}, div({className: 'react-menu-icon icon-menu2'}, 'More')),
              MenuOptions({className: 'more-menu-options'},
                MenuOption({className: 'more-menu-share',
                    onSelect: ExposureActions.shareFilesModal.bind(null, Imm.List([fileId]))},
                  div({className: 'react-menu-icon icon-share'}, FrontendConstants.SHARE))
              )
            ),
            isHomeActive && HelpUtil.isInAppHelpExists(reportTitle)
              ? a({className: cx('icon-question-circle', 'home-page-help'), href: Util.formatHelpLink(reportTitle), target: '_blank'},
                  span({className: 'home-page-help-text'}, FrontendConstants.HELP)
                )
              : null,
          )
        ),
        div({className: cx('builtin-site-cro-scorecard', {'show-filters': this.state.displayFilters})},
          this.getFilterPane(),
          div({className: 'kpi-wrapper'}, this.createViz())
        )
      );
    }

    // We don't support mobile view for the CRO scorecard KPIs
    else {
      content = div({className: 'builtin-view-container'},
        div({className: 'page-header'},
          isHomeActive
            ? null
            : Breadcrumbs({
                immExposureStore,
                fileId,
                isMobile: Util.isMobile()
              }),
        ),
        div({className: 'mobile-builtin'},
          div({className: 'user-alert'},
            span({className: 'icon-info'}),
            span({className: cx('message', { 'mobile-message': Util.isMobile() })}, FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT)
          )
        )
      );
    }
    return content;
  },


});

module.exports = withTransitionHelper(BuiltinSiteScorecardKPI);
