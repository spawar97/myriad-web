import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import Highchart  from '../Highchart';
import PropTypes from 'prop-types';
import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';
import ContentPlaceholder from '../ContentPlaceholder';
import EmptyContentNotice from '../EmptyContentNotice';
import Breadcrumbs from './Breadcrumbs';
import SimpleAction from '../SimpleAction';
import Combobox from '../Combobox';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import StudyScorecardConstants from '../../constants/StudyScorecardConstants';
import RouteNameConstants  from '../../constants/RouteNameConstants';
import AppRequest from '../../http/AppRequest';
import GA from '../../util/GoogleAnalytics';
import Util from '../../util/util';
import HelpUtil from  '../../util/HelpUtil';
import {TouchDiv as div} from '../TouchComponents';
import {TouchSpan as span} from '../TouchComponents';
import AccountUtil from '../../util/AccountUtil';
import {YellowfinUtil, YellowfinFilter} from '../../util/YellowfinUtil';
import ScorecardUtil from '../../util/ScorecardUtil';
import Button from '../Button';

class BuiltinScorecardKPI extends React.Component {
  constructor(props) {
    super(props);
    this.displayName = 'BuiltinScorecardKPI';

    this.immStudyOptions = Imm.List();
    this.immCroOptions = Imm.List();
    this.immProgramOptions = Imm.List();
    this.immCategoryOptions = Imm.List();

    this.state = {
      immSelectedStudies: Imm.List(),
      immSelectedCros: Imm.List(),
      immSelectedPrograms: Imm.List(),
      immSelectedCategories: Imm.List(),
      immYellowfinReportMap: Imm.List(),

      displayFilters: false,
      isLoadExtraInfo: false,
      isGetDataScorecardFailed: false,
      isLoading: true,
      studyFilterIsMinimized: true,
      hasChangeSessionFilter: false,
      filtersToApplied: {studies : [], croids: [], programs: [], categories: []}
    };

    // TODO - the logic in this component can be simplified by just monitoring state & using an isReady function to check
    //        these on render. Not changing this for 2.8.3, but we can definitely improve the logic here.
    this.isLoadingDrilldownFile = true;
    this.isLoadingDrilldownData = true;
    this.isLoadingQAScoreData = true;

    this.handleDisplayFilters = this.handleDisplayFilters.bind(this);
    this.handleDrilldown = this.handleDrilldown.bind(this);
    this.handleDropdownFilter = this.handleDropdownFilter.bind(this);
  }

  isLoadExtraInfo(filtersToApplied) {
    if (filtersToApplied) {
      const {immSelectedStudies} = this.state;
      return (immSelectedStudies.size === 1) && (filtersToApplied.croids && filtersToApplied.croids.length === 1);
    }
    return false;
  }

  generateFiltersComponent() {
    return (
      <div className="filters">
        <div className="sub-tab-header">
          {FrontendConstants.FILTERS}
          <a className= 'icon-question-circle' href={Util.formatHelpLink('KPI_FILTER')} target= '_blank'></a>
          <div className="close-button" onClick={() => this.handleDisplayFilters(false)}></div>
        </div>
        <div className='panel included-filter'>
          <div className='panel-sub-header text-truncation block-underline'>
            <span className='panel-sub-header-title'>{FrontendConstants.INCLUDED}</span>
            <div className='filter-buttons-wrapper'>
              <Button
                classes={{'reset-all-button':true}}
                onClick={this.resetAllFilters.bind(this)}
                children={FrontendConstants.RESET_ALL}
                isSecondary={true}>
              </Button>
              <Button
                classes={{'apply-filters-button':true}}
                onClick={this.applyFilters.bind(this)}
                children={FrontendConstants.APPLY}
                isPrimary={true}>
              </Button>
            </div>
          </div>
          <div className="filter-block">
            <div className="filter-title">{FrontendConstants.CRO}</div>
            <Combobox className={cx('dropdown', 'autoblur', 'cro-input')}
                      placeholder={FrontendConstants.CRO}
                      value={this.state.immSelectedCros}
                      onChange={(selectedItems) => {this.handleDropdownFilter(selectedItems, 'cro', false, false)}}
                      autoBlur={true}
                      multi={true}
                      options={this.immCroOptions} />
            <div className="filter-title">{FrontendConstants.PROGRAM}</div>
            <Combobox className={cx('dropdown', 'autoblur', 'program-input')}
                      placeholder={FrontendConstants.PROGRAM}
                      value={this.state.immSelectedPrograms}
                      onChange={(selectedItems) => {this.handleDropdownFilter(selectedItems, 'program', false, false)}}
                      autoBlur={true}
                      multi={true}
                      options={this.immProgramOptions} />
            <div className="filter-title">{FrontendConstants.SCORECARD_CATEGORY}</div>
            <Combobox className={cx('dropdown', 'autoblur', 'category-input')}
                      placeholder={FrontendConstants.SCORECARD_CATEGORY}
                      value={this.state.immSelectedCategories}
                      onChange={(selectedItems) => {this.handleDropdownFilter(selectedItems, 'category', false, false)}}
                      autoBlur={true}
                      multi={true}
                      options={this.immCategoryOptions} />
          </div>
        </div>
      </div>
    );
  }

  handleDisplayFilters(state) {
    this.setState({displayFilters: state});
    ExposureActions.toggleFiltersPane(state);
  }

  componentWillMount() {
    const fileId = this.props.params.fileId;
    ExposureActions.fetchFile(fileId, {}, {fetchData: true});

    this.fetchDrilldownFiles();
    this.fetchDrilldownData( () => {
      let filtersToApplied = this.state.filtersToApplied;
      let backFilter = this.props.immExposureStore.getIn(['builtinBackFilter', this.props.params.fileId]);
      if (backFilter) {
        let backFilterJS = backFilter.toJSON();

        this.immCroOptions = Imm.fromJS(backFilterJS.immCroOptions);
        this.immProgramOptions = Imm.fromJS(backFilterJS.immProgramOptions);
        this.immStudyOptions = Imm.fromJS(backFilterJS.immStudyOptions);
        this.immCategoryOptions = Imm.fromJS(backFilterJS.immCategoryOptions);

        filtersToApplied = {
          'croids': _.map(backFilterJS.croids, s => s.value),
          'programs': _.map(backFilterJS.programs, s => s.value),
          'categories': _.map(backFilterJS.categories, s => s.value),
          'displayFilters': this.state.displayFilters
        };

        // Reset filter
        ExposureActions.setBuiltinBackFilter(this.props.params.fileId, null)
        this.setState({
          immSelectedCros: Imm.fromJS(backFilterJS.croids),
          immSelectedPrograms: Imm.fromJS(backFilterJS.programs),
          immSelectedCategories: Imm.fromJS(backFilterJS.categories),
          displayFilters: backFilterJS.displayFilters,
          isLoadExtraInfo: this.isLoadExtraInfo(filtersToApplied),
          filtersToApplied: filtersToApplied
        });
      } else {
        this.setState({
          filtersToApplied: filtersToApplied
        });
      }
      this.fetchQualityAgreementData(filtersToApplied, backFilter);
    });
  }

  componentWillReceiveProps(nextProps) {
    const nextAccountId = nextProps.immExposureStore.get('currentAccountId');
    const nextSelectedStudies = ScorecardUtil.getSelectedStudiesFilterFromSessionForAccount(nextAccountId);

    if (!Imm.is(this.state.immSelectedStudies, nextSelectedStudies)) {
      let {filtersToApplied} = this.state;
      filtersToApplied.studies = nextSelectedStudies;
      this.setState(
        {
          immSelectedStudies: nextSelectedStudies,
          filtersToApplied
        },
        this.handleDropdownFilter.bind(this,nextSelectedStudies, 'study', false, true, Imm.List(), Imm.List(), Imm.List())
      );
    }
  }

  fetchQualityAgreementData(filtersToApplied, backFilter) {
    ExposureActions.fetchQualityAgreements((data) => {
      if (!data.errorMsg) {
        this.qualityAgreements = this.props.immExposureStore.get('qualityAgreements').toJSON();
        this.handleDropdownFilter(filtersToApplied.studies, 'study', backFilter);
      } else {
        this.isLoadingQAScoreData = false;
        this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile });
        console.log('%cERROR: ' + data.errorMsg, 'color: #E05353');
      }
    });
  }

  fetchDrilldownFiles() {
    if (AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig)) {
      YellowfinUtil.fetchYellowfinReportMap(this.setYellowfinReportMap.bind(this));
    }

    // The logic in this component really requires this to happen at the moment.
    // TODO - if we want to continue using the V2 CRO scorecard we should update / refactor some of this since it's really not
    //        going to be necessary going forward w/ V3 reports
    this.fetchV2DrilldownFiles();
  }

  /**
   * Sets the Yellowfin UUID map for drilldown information
   * @param uuidMap
   */
  setYellowfinReportMap(uuidMap) {
    this.setState({immYellowfinReportMap: Imm.Map(uuidMap)})
  }

  fetchV2DrilldownFiles() {
    let url = `/api/builtin/file-kpi`;
    const request = {
      type: 'POST',
      url: url,
      data: {}
    };
    request.data = JSON.stringify(_.values(StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP));
    AppRequest(request)
    .then(
      data => {
          this.isLoadingDrilldownFile = false;
          this.builtinDrilldownFileMap =  data.values;
          this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile });
      },
      () => {
        this.isLoadingDrilldownFile = false;
        this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile });
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  }

  fetchDrilldownData(callback) {
    let url = '/api/builtin/study-scorecard-drilldown';
    AppRequest({type: 'GET', url: url}).then(
      data => {
        this.isLoadingDrilldownData = false;
        this.drilldownMap = data.drilldowns ? _.chain(data.drilldowns.rows)
                                                .map(row => ({
                                                  "studyid" : row.values[0],
                                                  "drilldown": row.drilldown
                                                }))
                                                .groupBy('studyid')
                                                .mapObject(item => item[0] && item[0].drilldown)
                                                .value() : {};
        this.studyNameMap = data.drilldowns ? _.chain(data.drilldowns.rows)
                                                .map(row => ({
                                                  "studyid" : row.values[0],
                                                  "studyname": row.values[1]
                                                }))
                                                .groupBy('studyname')
                                                .mapObject(item => item[0] && item[0].studyid)
                                                .value() : {};
        this.studyIdMap = data.drilldowns ? _.chain(data.drilldowns.rows)
                                                .map(row => ({
                                                  "studyid" : row.values[0],
                                                  "studyname": row.values[1]
                                                }))
                                                .groupBy('studyid')
                                                .mapObject(item => item[0] && item[0].studyname)
                                                .value() : {};
        this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile });
        if (callback && _.isFunction(callback)) callback();
      },
      () => {
        this.isLoadingDrilldownData = false;
        this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile });
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  }

  handleDrilldown(kpikey, studyid) {
    const currentFileId = this.props.params.fileId;

    if (AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig)) {
      this.handleYellowfinDrilldown(kpikey, studyid);
      return;
    }

    const fileTitle = StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP[kpikey];
    const selectFile = this.builtinDrilldownFileMap && this.builtinDrilldownFileMap.filter(immItem =>  fileTitle === immItem.title)[0];
    const drilldownData = this.drilldownMap && this.drilldownMap[studyid];
    const drilldownFileId  = selectFile ? selectFile.id: '';
    const schemaId = selectFile ? selectFile.comprehendSchemaId: '';

    if (!drilldownFileId || !drilldownData) {
      return console.log(`%cERROR: Cannot perform drilldown for reportId: ${currentFileId}. Error: Report not found.`, 'color: #E05353');
    }

    const backId = currentFileId;
    const backRoute = this.props.dashboardId ? RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW : RouteNameConstants.EXPOSURE_REPORTS_SHOW;
    const backParams = {fileId: backId};
    const backText = this.props.dashboardId? FrontendConstants.BACK_TO_DASHBOARD : FrontendConstants.BACK_TO_REPORT;

    const fileType = selectFile? selectFile.type: ExposureAppConstants.FILE_TYPE_REPORT;;
    const toRoute = fileType === ExposureAppConstants.FILE_TYPE_REPORT ? RouteNameConstants.EXPOSURE_REPORTS_SHOW : RouteNameConstants.EXPOSURE_DASHBOARDS_SHOW;

    let backFilter = {
      'immCroOptions': this.immCroOptions,
      'immProgramOptions': this.immProgramOptions,
      'immStudyOptions': this.immStudyOptions,
      'immCategoryOptions': this.immCategoryOptions,
      'croids': this.state.immSelectedCros,
      'programs': this.state.immSelectedPrograms,
      'categories': this.state.immSelectedCategories,
      'displayFilters': this.state.displayFilters
    };
    ExposureActions.setBuiltinBackFilter(this.props.params.fileId, JSON.parse(JSON.stringify(backFilter)))

    try {
      ExposureActions.drilldownUpdateCurrentSelectionCondition(this.props.params.fileId, null, [drilldownData]);
      _.defer(this.transitionToRelated.bind(this, toRoute, drilldownFileId, null, schemaId, backRoute, backParams, backText));
    } catch (e) {
      console.log(`%cERROR: Cannot perform drilldown for reportId: ${currentFileId}. Error: ${e}`, 'color: #E05353');
    }
  }

  /**
  * If we're performing a drilldown to a Yellowfin report, we need to find the target report from the user's
   * accessible OOB KPI list & build a redirect link to that report.
   *
   * @param kpiKey
   * @param studyCroItem
   */
  handleYellowfinDrilldown(kpiKey, studyId) {
    const fileTitle = StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP_V3[kpiKey] && StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP_V3[kpiKey].name;
    const reportType = StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP_V3[kpiKey] && StudyScorecardConstants.STUDY_SCORECARD_DRILLDOWN_MAP_V3[kpiKey].type;
    const reportUUID = this.state.immYellowfinReportMap.get(fileTitle + '_' + reportType, "");
    const routeName = reportType === 'DASHBOARD'
      ? RouteNameConstants.EXPOSURE_EMBEDDED_DASHBOARDS_SHOW
      : RouteNameConstants.EXPOSURE_EMBEDDED_REPORTS_SHOW;

    // Build out the Study Name filter so we can pass that to Yellowfin
    const studyName = this.studyIdMap[studyId];
    const studyFilterNames = ['Study', 'Study Name'];
    const studyFilterValues = [studyName];

    let yellowfinFilters = [
      new YellowfinFilter(studyFilterNames, studyFilterValues) // Study filter info
    ];

    if (reportUUID) {
      // this.context.router.replace({name: RouteNameConstants.EXPOSURE_EMBEDDED_TASKS_SHOW, params: {taskId: this.props.params.taskId}});
      this.context.router.push({name: routeName, state: {filters: yellowfinFilters}, params: {fileId: reportUUID}});
    }
  }

  transitionToRelated(route, fileId, chartDrilldownKey, schemaId, backRoute, backParams, backText) {
    ExposureActions.pushBackNavAction(Imm.Map({text: backText, backAction: () => this.context.router.push({name: backRoute, params: backParams})}));
    ExposureActions.clearFileFilterState(fileId);
    ExposureActions.builtinDrilldownHandleRelatedFile(this.props.params.fileId, this.props.drilldownId, chartDrilldownKey, schemaId, (query) => this.context.router.push({name: route, params: {fileId}, query}));
    return false;
  }

  handleDropdownFilter(selectedItems, type, backFilter, isFetchData = true, immSelectedCros = this.state.immSelectedCros,
    immSelectedPrograms = this.state.immSelectedPrograms, immSelectedCategories = this.state.immSelectedCategories) {
    const {immExposureStore} = this.props;

    let studyCroList = _.chain(this.qualityAgreements).map(({studyId, croId}) => {return {"studyid": studyId, "croid": croId}}).value();
    let studyCroGroupByStudyId = _.groupBy(studyCroList, 'studyid');

    const {immSelectedStudies} = this.state;

    const studies = immSelectedStudies.map(study => Util.getStudyIdFromName(immExposureStore, study)).toJS();
    let selectedCros = immSelectedCros.toJS();
    let selectedPrograms = immSelectedPrograms.toJS();
    let selectedCategories = immSelectedCategories.toJS();

    let croids = _.pluck(selectedCros, 'value');
    let programs = _.pluck(selectedPrograms, 'value');
    let categories = _.pluck(selectedCategories, 'value');

    let croOptions = this.immCroOptions.toJS();
    let programOptions = this.immProgramOptions.toJS();
    let categoryOptions = this.immCategoryOptions.toJS();

    if (type === 'program') {
      selectedPrograms = programOptions.filter(item => _.contains(selectedItems, item.value));
    } else if (type === 'study') {
      if (!backFilter) {
        // Auto select CRO filter for studies that have only one QA configuration record for that specific study
        _.each(studies, studyid => {
          if (studyCroGroupByStudyId[studyid] && studyCroGroupByStudyId[studyid].length === 1 && studies.length === 1) {
            croids.push(studyCroGroupByStudyId[studyid][0].croid);
          }
          croids = _.uniq(croids);
          selectedCros = croOptions.filter(item => _.contains(croids, item.value));
        });
      }
    } else if (type === 'cro') {
      croids = selectedItems;
      selectedCros = croOptions.filter(item => _.contains(selectedItems, item.value));
    } else {
      categories = selectedItems;
      selectedCategories = categoryOptions.filter(item => _.contains(selectedItems, item.value));
    }

    programs = selectedPrograms.reduce((result, obj) => [...result, ...JSON.parse(obj.value)], []);

    let filtersToApplied = {studies, croids, programs, categories};
    this.setState({
      immSelectedCros: Imm.fromJS(selectedCros),
      immSelectedPrograms: Imm.fromJS(selectedPrograms),
      immSelectedCategories: Imm.fromJS(selectedCategories),
      isLoadExtraInfo: this.isLoadExtraInfo(filtersToApplied),
      hasChangeSessionFilter: type === 'study' && !isFetchData,
      filtersToApplied: filtersToApplied
    });
    if (isFetchData) {
      this.fetchData(filtersToApplied);
    }
  }

  filterThresholds(filtersToApplied, thresholdsData) {
    if (filtersToApplied) {
      if (filtersToApplied.studies && filtersToApplied.studies.length > 0) {
          thresholdsData = _.filter(thresholdsData, th => {
            return _.contains(filtersToApplied.studies, th.studyid);
          })
      }

      if (filtersToApplied.croids && filtersToApplied.croids.length > 0) {
          thresholdsData = _.filter(thresholdsData, th => {
            return _.contains(filtersToApplied.croids, th.croid);
          })
      }

      if (filtersToApplied.programs && filtersToApplied.programs.length > 0) {
          thresholdsData = _.filter(thresholdsData, th => {
            return _.contains(filtersToApplied.programs, th.studyid);
          })
      }

      if (filtersToApplied.categories && filtersToApplied.categories.length > 0) {
          let kpiids = _.chain(filtersToApplied.categories)
                        .map(cat => {
                            return StudyScorecardConstants.CATEGORY_TO_KPIID_MAP[cat.toUpperCase()];
                        })
                        .flatten().value();
          thresholdsData = _.filter(thresholdsData, th => {
            return _.contains(kpiids, th.kpiid);
          })
      }
    }
    return thresholdsData;
  }

  convertQualityAgreementsToThresholdList(qas) {
    let parseThresholds = (thresholds) => {
        let parseOneThreshold = (threshold) => {
            if (!threshold) return;
            if (threshold.thresholdUnit === 'PERCENT') {
                return parseFloat(threshold.value) / 100.0;
            } else {
                return parseFloat(threshold.value);
            }
        }

        let targetThreshold;
        let maxThreshold;
        _.each(thresholds, th => {
            if (th.name === "Target Variance Threshold %") {
                targetThreshold = parseOneThreshold(th);
            } else {
                maxThreshold = parseOneThreshold(th);
            }
        })
        let plusMinus = (targetThreshold < 0) || (maxThreshold < 0) ? -1 : 1;
        return {maxThreshold, targetThreshold, plusMinus};
    }

    return _.chain(qas)
            .map(qa => {
                return _.chain(qa.kpis)
                        .filter(kpi => kpi.enabled)
                        .map(kpi => {
                          let thObj = parseThresholds(kpi.thresholds);
                          return _.extend({
                              studyid: qa.studyId,
                              croid: qa.croId,
                              kpiid: kpi.id,
                              planned: StudyScorecardConstants.KPIS_NEED_CONVERT_SCORE_TO_PERCENT[kpi.id] && kpi.plan != undefined ? kpi.plan / 100: kpi.plan,
                              category: kpi.category
                          }, thObj);
                        })
                        .filter(kpi => {
                          if (kpi.planned == null || kpi.maxThreshold == null) {
                            console.log(`%cERROR: Quality Agreement configurations is incorrect for (Study ID = '${qa.studyId}' - CRO ID = '${qa.croId}' - KPI ID = '${kpi.kpiid}').`, 'color: #E05353');
                          }
                          return (kpi.planned != null && kpi.maxThreshold != null)
                        })
                        .value();
            })
            .flatten()
            .value();
  }

  generateScatterChartConfig(chartTitle, seriesData) {
    // Get max, min of x axis to prevent bubble cut off; minY to prevent label is hidden
    let allPoints = _.chain(seriesData).pluck('data').flatten().value();
    let maxX, minX, minY;
    let maxSizeX = _.map(allPoints, item => item.x + item.marker.radius * 2);
    let minSizeX = _.map(allPoints, item => item.x - item.marker.radius * 2);
    let minSizeY = _.map(allPoints, item => item.y - item.marker.radius * 2);
    if (allPoints.length >= 2) {
      maxX = _.max(maxSizeX) + 5;
      minX =_.min(minSizeX) + 5;
      minY =_.min(minSizeY) - 5;
    }

    let chartConfig = {
      "chart": {"type": "scatter"},
      "yAxis": {
        "title": {"text": "% off from target"},
        labels: {format: '{value:.2f}%'}
      },
      "xAxis": {"title": {"text": "Duration of threshold violation"}, },
      "plotOptions": {
        "series": {
          "cursor": "pointer",
          "point": {
            "events": {
              click: (e) => { this.handleDrilldown(e.point.kpiid, e.point.studyid);}
            }
          }
        }
      },
      "legend": { "enabled": false },
      "tooltip": {
        pointFormatter: function() {return this.tooltip },
        headerFormat: ''
      },
      "series": seriesData,
      "title": { "text": chartTitle }
    }

    if (maxX !== undefined && minX !== undefined && minY !== undefined) {
      chartConfig.yAxis.min = minY;
      chartConfig.xAxis.min = minX;
      chartConfig.xAxis.max = maxX;
    }
    return chartConfig;
  }

  generateSeriesData(kpis) {
    let redData = [];
    let yellowData = [];
    let seriesData = [];
    let getRadiusOfKPI = (kpi) => {
      if (kpi) {
        return (kpi.redPercent + kpi.yellowPercent) * 50;
      }
      return 0;
    }
    _.each(kpis, kpi => {
        let point = {
            studyid: kpi.studyid,
            kpiid: kpi.kpiid,
            name: StudyScorecardConstants.KPIID_TO_NAME_MAP[kpi.kpiid],
            x: kpi.duration,
            y: kpi.changeVsPlan * 100,
            tooltip: `<strong>${StudyScorecardConstants.KPIID_TO_NAME_MAP[kpi.kpiid]}</strong><br>`
                    + `Target Variance Threshold: ${Util.showPercentFormatUserInput(kpi.target_threshold, true)}<br>`
                    + `Maximum Variance Threshold: ${Util.showPercentFormatUserInput(kpi.max_threshold, true)}<br>`
                    + `Current value: ${Util.formatPlanValueOrKPIScoreToDisplay(kpi.kpiscore, kpi.kpiid)}<br>`
                    + `% Off from threshold: ${Util.showPercentFormatWithSignificant(kpi.changeVsPlan, true)}<br>`
                    + `Duration: ${kpi.duration} days<br>`
                    + `Number of sites with RED score: ${kpi.total_red_site} (${Util.showPercentFormat(kpi.redPercent)} of total sites)<br>`
                    + `Number of sites with YELLOW score: ${kpi.total_yellow_site} (${Util.showPercentFormat(kpi.yellowPercent)} of total sites)<br>`,
            dataLabels: {enabled: true, verticalAlign: "top", align: "center", formatter: function() {return this.point.name; } }
        }
        if (kpi.trafficlight === 'red') {
            point = _.extend(point, {marker: { radius: StudyScorecardConstants.INIT_SIZE_SCATTER_POINT + getRadiusOfKPI(kpi), states: {hover: {radius: StudyScorecardConstants.INIT_SIZE_SCATTER_POINT + getRadiusOfKPI(kpi)}} }});
            redData.push(point);
        } else if (kpi.trafficlight === 'yellow') {
            point = _.extend(point, {marker: { radius: StudyScorecardConstants.INIT_SIZE_SCATTER_POINT + getRadiusOfKPI(kpi), states: {hover: {radius: StudyScorecardConstants.INIT_SIZE_SCATTER_POINT + getRadiusOfKPI(kpi)}} }});
            yellowData.push(point);
        }
    })

    return [{
        "name": "Red",
        "color": "#dc3b19",
        "marker": {"symbol": "circle"},
        "cursor": "pointer",
        "data": redData,
        "dataLabels" : {
          "enabled": true,
          "verticalAlign": "middle",
          "align": "center",
          "formatter": function() {return this.point.name; }
        }
    },{
        "name": "Yellow",
        "color": "#FFD700",
        "marker": {"symbol": "circle"},
        "cursor": "pointer",
        "data": yellowData,
        "dataLabels" : {
          "enabled": true,
          "verticalAlign": "middle",
          "align": "center",
          "formatter": function() {return this.point.name; }
        }
    }]
  }

  parsingScorecardData(data) {
    let kpiscoresData = _.map(data.kpiscoresData, (item) => {
      let changeVsPlan = (item.kpiscore - item.planned) / item.planned;
      let yellowPercent = item.total_yellow_site / item.total_site;
      let redPercent = item.total_red_site / item.total_site;
      return _.extend(item, {changeVsPlan, yellowPercent, redPercent});
    });

    const mstonesDataMap = this.getMilestoneDataMap(data.milestonesData);
    const summaryData =  this.getSummaryData(kpiscoresData, mstonesDataMap);
    const detailsData = this.getDetailsData(kpiscoresData);
    return {summaryData, detailsData}
  }

  getMilestoneDataMap(milestonesData) {
    return _.chain(milestonesData)
            .map(ms => {
              let current_milestone_planned_date = ms.current_milestone_planned_date && new Date(ms.current_milestone_planned_date);
              let current_milestone_projected_date = ms.current_milestone_projected_date && new Date(ms.current_milestone_projected_date);
              let previous_milestone_planned_date = ms.previous_milestone_planned_date && new Date(ms.previous_milestone_planned_date);
              let previous_milestone_actual_completion_date = ms.previous_milestone_actual_completion_date && new Date(ms.previous_milestone_actual_completion_date);

              if (ms.current_milestone && current_milestone_projected_date
                   && previous_milestone_planned_date && current_milestone_planned_date) {
                ms.plannedDays = Util.millisToDays(current_milestone_planned_date - previous_milestone_planned_date);
                ms.actualDays = Util.millisToDays(current_milestone_projected_date - previous_milestone_planned_date);
                ms.delayDays = ms.actualDays - ms.plannedDays;
                ms.delayratio = ms.delayDays / ms.plannedDays;
              }

              if (ms.delayratio != undefined) {
                if (ms.delayratio <= 0) {
                  ms.catcolor = "green";
                } else if (ms.delayratio < 0.1) {
                  ms.catcolor = "yellow";
                } else {
                  ms.catcolor = "red";
                }
              }
              ms.tooltiplines = [`${ms.current_milestone_original_term}`,
                                 `Planned Start Date: ${Util.dateDisplayString(ms.previous_milestone_planned_date)}`,
                                 `Actual Start Date: ${Util.dateDisplayString(ms.previous_milestone_actual_completion_date)}`,
                                 `Planned End Date: ${Util.dateDisplayString(ms.current_milestone_planned_date)}`,
                                 ];
              if (ms.current_milestone_projected_date) ms.tooltiplines.push(`Projected Completion Date: ${Util.dateDisplayString(ms.current_milestone_projected_date)} (${ms.delayDays > 0 ? '+' + ms.delayDays : ms.delayDays} days)`);
              return ms;
            })
            .groupBy(item => item.studyid)
            .mapObject(item => item[0])
            .value();
  }

  getSummaryData(kpiscoresData, mstonesDataMap) {
    return _.chain(kpiscoresData)
            .groupBy(qa => JSON.stringify(_.map(['studyid', 'croid'], column => qa[column])))
            .mapObject(kpis => {
              let croname = kpis[0].croname;
              let studyname = kpis[0].studyname;
              let studyid = kpis[0].studyid;
              let objs = _.chain(kpis)
                          .groupBy(kpi => kpi.kpicategory)
                          .mapObject(kpis => {
                            let redKpis = [];
                            let yellowKpis = [];
                            _.each(kpis, kpi => {
                              if (kpi.trafficlight === "red") {
                                redKpis.push(StudyScorecardConstants.KPIID_TO_NAME_MAP[kpi.kpiid])
                              } else if (kpi.trafficlight === "yellow") {
                                yellowKpis.push(StudyScorecardConstants.KPIID_TO_NAME_MAP[kpi.kpiid])
                              }
                            })

                            if (redKpis.length > 0) {
                              return {catcolor: "red", dueToList:redKpis}
                            } else if (yellowKpis.length > 0) {
                              return {catcolor: "yellow", dueToList:yellowKpis}
                            } else {
                              return {catcolor: "green", tooltip: "All KPIs score are green"}
                            }
                          })
                          .value();
              return _.extend({studyname, croname}, objs, {"Milestone":mstonesDataMap[studyid]});
            })
            .values()
            .sortBy('studyname')
            .sortBy('croname')
            .value();
  }

  getDetailsData(kpiscoresData) {
    return _.chain(kpiscoresData)
            .groupBy(qa => JSON.stringify(_.map(['studyid', 'croid'], column => qa[column])))
            .mapObject(kpis => {
              let croname = kpis[0].croname;
              let studyname = kpis[0].studyname;
              let studyid = kpis[0].studyid;
              let objs = _.chain(kpis)
                          .groupBy(kpi => kpi.kpicategory)
                          .mapObject((kpis, kpicategory) => {
                            let seriesData = this.generateSeriesData(kpis);
                            let higchartConfig = this.generateScatterChartConfig(StudyScorecardConstants.CATEGORY_TO_CHART_TITLE_MAP[kpicategory],seriesData);
                            return higchartConfig
                          })
                          .values()
                          .value();

              let kpiTableData = _.map(kpis, kpi => {
                                   return {
                                      studyid,
                                      name: StudyScorecardConstants.KPIID_TO_NAME_MAP[kpi.kpiid],
                                      kpiid: kpi.kpiid,
                                      category: kpi.kpicategory,
                                      plan: kpi.planned,
                                      kpiscore: kpi.kpiscore,
                                      changeVsPlan: kpi.changeVsPlan,
                                      targetThreshold: kpi.target_threshold,
                                      maxThreshold: kpi.max_threshold,
                                      color: kpi.trafficlight,
                                      yellowPercent: kpi.yellowPercent,
                                      redPercent: kpi.redPercent
                                   }
                                 });
              return _.extend({studyname, croname}, {highchartConfigs: objs, kpiTableData});
            })
            .value();
  }

  getThresholds(filtersToApplied, qualityAgreements) {
    let thresholds = this.convertQualityAgreementsToThresholdList(qualityAgreements);
    return this.filterThresholds(filtersToApplied, thresholds);
  }

  updateFiltersData(filterData, filtersToApplied) {
    let filterCroData = filterData;

    if (filtersToApplied && filtersToApplied.studies && filtersToApplied.studies.length > 0) {
      filterCroData = _.chain(filterData).filter(item => _.contains(filtersToApplied.studies, item.studyid)).value();
    }

    let studyGroup = _.chain(filterData).groupBy('studyid').mapObject(item => item[0]).values().value();
    let croGroup = _.chain(filterCroData).groupBy('croid').mapObject(item => item[0]).values().value();
    let programGroup = _.chain(filterCroData).groupBy('program').values().value();

    let studyOpts = _.map(studyGroup, ({studyid, studyname}) => {return {value: studyid, label: studyname}});
    let croOpts = _.map(croGroup, ({croid, croname}) => {return {value: croid, label: croname}});
    let programOpts = _.map(programGroup, (items) => {
      const label = items[0].program;
      const value = JSON.stringify(_.uniq(items.map(item => item.studyid)));
      return { value, label };
    });

    this.immStudyOptions = Imm.fromJS(studyOpts);
    this.immCroOptions = Imm.fromJS(croOpts);
    this.immProgramOptions = Imm.fromJS(programOpts);
    this.immCategoryOptions = Imm.fromJS(StudyScorecardConstants.CATEGORY_OPTIONS);

    if (filtersToApplied.croids.length === 1 && filtersToApplied.croids.length !== this.state.immSelectedCros.toJS().length) {
      let selectedCros = croOpts.filter(item => item.value === filtersToApplied.croids[0]);
      this.setState({
        immSelectedCros: Imm.fromJS(selectedCros)
      })
    }
  }

  fetchData(filtersToApplied, isfetchDetailsData = false) {
    this.setState({isLoading: true});

    let url = '/api/builtin/study-scorecard';
    const thresholds = this.getThresholds(filtersToApplied, this.qualityAgreements);
    if (!thresholds || thresholds.length === 0) {
      this.isLoadingQAScoreData = false;
      return this.setState({
        thresholds: thresholds,
        isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile
      });
    }

    let request = {
      type: 'POST',
      url: url,
    };
    request.data = {
      isGetExtraInfo: filtersToApplied ? this.isLoadExtraInfo(filtersToApplied) : false,
      'thresholds': thresholds
    };
    request.data = JSON.stringify(request.data);
    AppRequest(request)
    .then(
      data => {
        this.isLoadingQAScoreData = false;
        const {summaryData, detailsData} = this.parsingScorecardData(data);
        this.updateFiltersData(data.filterData, filtersToApplied);
        this.setState({
          thresholds: thresholds,
          summaryData: summaryData,
          detailsData: undefined,
          isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile
        });
        if (isfetchDetailsData || (this.state.immSelectedStudies.size === 1 && this.state.immSelectedCros.size === 1)) {
          this.setState({
            detailsData: detailsData
          });
        }
      },
      () => {
        this.isLoadingQAScoreData = false;
        this.setState({isLoading: this.isLoadingQAScoreData || this.isLoadingDrilldownData || this.isLoadingDrilldownFile, isGetDataScorecardFailed: true});
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  }

  getUserPromptMessage() {
    if (this.state.filtersToApplied &&
      (this.state.immSelectedStudies.size > 1 ||
        (this.state.filtersToApplied.croids && this.state.filtersToApplied.croids.length > 1)
      )
    ) {
      return StudyScorecardConstants.PLEASE_SELECT_A_SINGLE_STUDY_AND_CRO_IN_THE_FILTERS_TO_ACCESS_ADDITIONAL_DETAILS;
    }
    return StudyScorecardConstants.PLEASE_USE_CRO_AND_OR_STUDY_FILTERS_TO_ACCESS_ADDITIONAL_DETAILS;
  }

  buildMainContent() {
    if (this.state.isGetDataScorecardFailed) {
      return <EmptyContentNotice noticeText={FrontendConstants.FAILED_TO_GET_DATA_FROM_SERVER} />;
    } else if (this.state.thresholds && this.state.thresholds.length === 0) {
      if ((this.state.immSelectedStudies.size > 0) || (this.state.immSelectedCros.size > 0) || (this.state.immSelectedPrograms.size > 0) || (this.state.immSelectedCategories.size > 0)) {
        return <EmptyContentNotice noticeText={FrontendConstants.NO_QUALITY_AGREEMENT_CONFIGURED_FOR_THIS_SELECTION} />;
      } else {
        return <EmptyContentNotice noticeText={FrontendConstants.NO_QUALITY_AGREEMENT_CONFIGURED} />;
      }
    } else if (this.state.summaryData && this.state.summaryData.length === 0) {
      return <EmptyContentNotice noticeText={FrontendConstants.NO_DATA_RETURNED} />;
    } else {
      return  <div>
                <StudySCOSummaryTableComponent {...this.props} summaryData={this.state.summaryData} />
                <h3 className="user-prompt" style={this.state.isLoadExtraInfo ? {"display":"none"} : {"textAlign": "center"}}>{this.getUserPromptMessage()}</h3>
                <StudySCOChartTableComponent {...this.props} detailsData={this.state.detailsData} display={this.state.isLoadExtraInfo} handleDrilldown={this.handleDrilldown}/>
              </div>
    }
  }

  resetAllFilters() {
    let filtersToApplied = this.state.filtersToApplied;
    filtersToApplied.studies = this.state.immSelectedStudies;
    this.setState({
      immSelectedCros: Imm.List(),
      immSelectedPrograms: Imm.List(),
      immSelectedCategories: Imm.List(),
      filtersToApplied: filtersToApplied
    });
    this.handleDropdownFilter(filtersToApplied.studies, 'study', false, true, Imm.List(), Imm.List(), Imm.List());
  }

  applyFilters() {
    this.fetchData(this.state.filtersToApplied, true);
  }

  render() {
    let content;
    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.params.fileId;
    const useV3 = AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig);
    const hasV3IfNeeded = useV3
      ? !this.state.immYellowfinReportMap.isEmpty()   // If we're using V3, make sure we have the YF report map
      : true;                                         // Otherwise we have everything we need (for V2 CRO scorecard)
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);
    const immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    const reportTitle = immFile.get('title');

    if (this.state.isLoading && hasV3IfNeeded) {
      content = <ContentPlaceholder />;
    } else {
      if (Util.isDesktop()) {
        content = (
            <div className="builtin-view-container">
              <div className={cx('app-tab-report  ', {'show-filters': immExposureStore.get('showFiltersPane')})}>
                <div className="page-header">
                    {
                      isHomeActive
                        ? null
                        : <Breadcrumbs immExposureStore={immExposureStore} fileId={fileId} />
                    }
                    <div className="header-buttons">
                      <SimpleAction class="toggle-filters icon-filter2" text={FrontendConstants.FILTERS} onClick={() => this.handleDisplayFilters(!this.state.displayFilters)}></SimpleAction>
                      <Menu className="more-menu" horizontalPlacement="Left">
                        <MenuTrigger className="more-menu-trigger">
                          <div className="react-menu-icon icon-menu2">More</div>
                        </MenuTrigger>
                        <MenuOptions className='more-menu-options'>
                          <MenuOption className="more-menu-share"
                                      onSelect={ExposureActions.shareFilesModal.bind(null, Imm.List([fileId]))}>
                            <div className="react-menu-icon icon-share">{FrontendConstants.SHARE}</div>
                          </MenuOption>
                        </MenuOptions>
                      </Menu>
                      {
                        isHomeActive && HelpUtil.isInAppHelpExists(reportTitle)
                          ? (
                            <a className={cx("icon-question-circle", "home-page-help")}
                               target='_blank'
                               href={Util.formatHelpLink(reportTitle)}
                            >
                              <span className='home-page-help-text'>
                                {FrontendConstants.HELP}
                              </span>
                            </a>
                          )
                          : null
                      }
                    </div>
                </div>
              </div>
              <div className={cx('builtin-tasks-kpi', {'show-filters': this.state.displayFilters})}>
                {this.generateFiltersComponent()}
                <div className="kpi-wrapper">
                  {this.buildMainContent()}
                </div>
              </div>
            </div>
        );
      } else {
        content = (
          <div className="builtin-view-container">
            <div className="page-header">
            </div>
            <div className="mobile-builtin">
                <div className="user-alert">
                    <span className="icon-info"></span>
                    <span className={cx('message', { 'mobile-message': Util.isMobile() })}>
                        {FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT}
                    </span>
                </div>
            </div>
          </div>
        );
      }
    }
    return content;
  }
}
BuiltinScorecardKPI.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  cookies: PropTypes.object,
  params: PropTypes.shape({
    fileId: PropTypes.string
  }).isRequired
};
BuiltinScorecardKPI.contextTypes = {
  router: PropTypes.object
};

class StudySCOSummaryTableComponent extends React.Component {
  render() {
    let summaryData = this.props.summaryData;

    let generateHtmlRow = ((kpiGroupData, index) => {
      let milestoneData = kpiGroupData["Milestone"];
      let complianceData = kpiGroupData["Subject Compliance"];
      let enrollData = kpiGroupData["Enrollment"];
      let siteProdData = kpiGroupData["Site Productivity"];
      let content = (data, isLastColumn, type) => {
        let toolipClass = isLastColumn ?  'tooltiptext-left' : 'tooltiptext';
        if (type === 'milestone') {
          if (data) {
            let tooltip = <span className={toolipClass}>{_.map(data.tooltiplines, (item, index) => {return <span key={index}> {item}<br /></span>})}</span>;
            return (
              <td className="tooltip">
                <div className={'circle ' + data.catcolor}>{tooltip}</div>
              </td>
            );
          } else {
            return <td></td>
          }
        } else if (data) {
          let tooltip = data.tooltip ? <span className={toolipClass}>{data.tooltip }</span> : <span className={toolipClass}>Due to: <br />{_.map(data.dueToList, (item, index) => {return <span key={index}> {item}<br /></span>})}</span>;
          return (
            <td className="tooltip">
              <div className={'circle ' + data.catcolor}>{tooltip}</div>
            </td>
          );
        } else {
          return  <td className="tooltip">
                    <div><span className="sc-summary-text">N/A</span><span className={toolipClass}>{StudyScorecardConstants.NO_KPI_SELECTED_IN_QA_FOR_THIS_CATEGORY}</span></div>
                  </td>
        }
      };
      return <tr key={index}>
               <td>{kpiGroupData.croname}</td>
               <td>{kpiGroupData.studyname}</td>
               {content(milestoneData, false, "milestone")}
               {content(complianceData, false)}
               {content(enrollData, false)}
               {content(siteProdData, true)}
             </tr>
    })

    return <table className="cro-table">
            <thead>
              <tr>
                <th>CRO Name</th>
                <th>Study Name</th>
                <th>Milestone Score</th>
                <th>Subject Compliance Score</th>
                <th>Enrollment Score</th>
                <th>Site Productivity Score</th>
              </tr>
            </thead>
            <tbody>
              {summaryData && summaryData.map((data, index) => generateHtmlRow(data, index))}
            </tbody>
          </table>
  }
}
StudySCOSummaryTableComponent.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string
  }).isRequired
};

class StudySCOChartTableComponent extends React.Component {
  render() {
    let chartConfigsAndTableData = _.chain(this.props.detailsData).values().sortBy('studyname').sortBy('croname').value();
    if (!this.props.display) return <div />;
    return (
      <div>
      {
        _.map(chartConfigsAndTableData, (item, index) => {
          return (
            <div key={item.croname + '-' + item.studyname} className="kpis-details-and-charts-container">
              <div className="separator"></div>
              <h2>{item.croname + ' - ' + item.studyname}</h2>
              <StudySCOChartsComponent {...this.props} hcConfigs={item.highchartConfigs} key={"hc" + index} />
              <StudySCOTableComponent {...this.props} kpiTableData={item.kpiTableData} key={"tbl" + index} handleDrilldown={this.props.handleDrilldown}/>
            </div>
          );
        })
      }
      </div>
    );
  }
}

class StudySCOChartsComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const isShowFilterPanel = this.props.immExposureStore.getIn(['showFiltersPane']);
    this.chartHeight = isShowFilterPanel ? '64vh' : '65vh';
    let hcConfigs = _.filter(this.props.hcConfigs, hcConfig => {
      return hcConfig && hcConfig.series && ((hcConfig.series[0] && hcConfig.series[0].data.length > 0) || (hcConfig.series[1] && hcConfig.series[1].data.length > 0));
    });
    hcConfigs = _.sortBy(hcConfigs, hc => StudyScorecardConstants.CHART_TITLE_INDEX_MAP[hc.title.text]);
    let reportId = this.props.params.fileId;
    return (
      <div className="kpis-container">
        {
          _.map(hcConfigs, (hcConfig, index) => {
            return (
              <div className="kpis-col" key={"hc" + index}>
                <Highchart reportId={reportId} height={this.chartHeight} configs={[hcConfig]} />
              </div>
            )
          })
        }
      </div>
    );
  }
}
StudySCOChartsComponent.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string
  }).isRequired
};

class StudySCOTableComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sortColumn: 'default',
      sortDirect: 'default'
    }

    this.colorMap = {"red": 1, "yellow": 2, "green": 3};
    this.categoryMap = {"Subject Compliance": 1, "Enrollment": 2, "Site Productivity": 3};
    this.kpiTableData = this.props.kpiTableData;
  }

  handleClickSort(colname) {
    if (this.state.sortColumn === colname) {
      if (this.state.sortDirect === 'asc') {
        this.setState({
          sortDirect: 'desc'
        });
      } else if (this.state.sortDirect === 'desc') {
        this.setState({
          sortColumn: 'default',
          sortDirect: 'default'
        });
      }

    } else {
      this.setState({
        sortColumn: colname,
        sortDirect: 'asc'}
      );
    }
  }

  sortData() {
    const colorMap = {"red": 1, "yellow": 2, "green": 3};
    const categoryMap = {"Subject Compliance": 1, "Enrollment": 2, "Site Productivity": 3};

    if (this.state.sortColumn === 'default') {
      this.kpiTableData = _.sortBy(this.kpiTableData, row => {
        let catNum = categoryMap[row.category] ? categoryMap[row.category] : 4;
        let catColor = colorMap[row.color] ? colorMap[row.color] : 4;
        return catNum+ '_' + catColor;
      });

    } else {
      if (this.state.sortColumn === 'category') {
        this.kpiTableData = _.sortBy(this.kpiTableData, row => {
          return categoryMap[row[this.state.sortColumn]];
        });

        if (this.state.sortDirect === 'desc') {
          this.kpiTableData = this.kpiTableData.reverse();
        }

      } else if (this.state.sortColumn === 'color') {
        this.kpiTableData = _.sortBy(this.kpiTableData, row => row.name.toLowerCase())
        this.kpiTableData = _.sortBy(this.kpiTableData, row => {
          if (this.state.sortDirect === 'asc') {
            return colorMap[row[this.state.sortColumn]];
          } else {
            return -colorMap[row[this.state.sortColumn]];
          }
        });
      } else {
        this.kpiTableData = _.sortBy(this.kpiTableData, row => {
          return row[this.state.sortColumn];
        });
        if (this.state.sortDirect === 'desc') {
          this.kpiTableData = this.kpiTableData.reverse();
        }
      }
    }
  }

  generateHeaderContent(displayName, columnName) {
    let classObj = cx({
      "icon": true ,
      "icon-descending-alt": this.state.sortColumn === columnName && this.state.sortDirect === "desc",
      "icon-ascending-alt": this.state.sortColumn === columnName && this.state.sortDirect === "asc",
      "icon-menu": this.state.sortColumn !== columnName
    });
    return (
      <div className="virtual-table-row">
        <span>
          {displayName}
        </span>
        <span style={{paddingLeft: "5px"}}>
            <span className={classObj}></span>
        </span>
      </div>
    )
  }

  render() {
    this.sortData();
    let that = this;

    return (
      <table className="cro-table">
        <thead>
          <tr>
            <th onClick={this.handleClickSort.bind(this, "name")}>
              {this.generateHeaderContent("KPI Name","name")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "category")}>
              {this.generateHeaderContent("Scorecard Category","category")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "plan")}>
              {this.generateHeaderContent("KPI Plan","plan")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "kpiscore")}>
              {this.generateHeaderContent("Current Value","kpiscore")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "changeVsPlan")}>
              {this.generateHeaderContent("Calculated Variance from Plan","changeVsPlan")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "targetThreshold")}>
              {this.generateHeaderContent("Target Variance Threshold","targetThreshold")}
            </th>
            <th onClick={this.handleClickSort.bind(this, "maxThreshold")}>
              {this.generateHeaderContent("Maximum Variance Threshold","maxThreshold")}
            </th>
            <th onClick={this.handleClickSort.bind(this,"color")}>
              {this.generateHeaderContent("KPI Score","color")}
            </th>
            <th onClick={this.handleClickSort.bind(this,"yellowPercent")}>
              {this.generateHeaderContent("% of Sites over Target Threshold","yellowPercent")}
            </th>
            <th onClick={this.handleClickSort.bind(this,"redPercent")}>
              {this.generateHeaderContent("% of Sites over Maximum Threshold","redPercent")}
            </th>
          </tr>
        </thead>
        <tbody>
          {
            this.kpiTableData && _.map(this.kpiTableData, (kpiRes) => {
              let drilldownStr = JSON.stringify(kpiRes.drilldown);
              return  <tr key={kpiRes.kpiid}>
                        <td>
                          <a onClick={() => that.props.handleDrilldown(kpiRes.kpiid, kpiRes.studyid)} className="open-link item-title-text">
                            {kpiRes.name}
                          </a>
                        </td>
                        <td>{kpiRes.category}</td>
                        <td>{Util.formatPlanValueOrKPIScoreToDisplay(kpiRes.plan, kpiRes.kpiid, true)}</td>
                        <td>{Util.formatPlanValueOrKPIScoreToDisplay(kpiRes.kpiscore, kpiRes.kpiid)}</td>
                        <td>{Util.showPercentFormatWithSignificant(kpiRes.changeVsPlan, true)}</td>
                        <td>{Util.showPercentFormatUserInput(kpiRes.targetThreshold, true)}</td>
                        <td>{Util.showPercentFormatUserInput(kpiRes.maxThreshold, true)}</td>
                        <td><div className={'circle ' + kpiRes.color}></div></td>
                        <td>{Util.showPercentFormat(kpiRes.yellowPercent)}</td>
                        <td>{Util.showPercentFormat(kpiRes.redPercent)}</td>
                      </tr>
            })
          }
        </tbody>
      </table>
    );
  }
}
StudySCOTableComponent.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map),
  params: PropTypes.shape({
    fileId: PropTypes.string
  }).isRequired
};

module.exports = BuiltinScorecardKPI;
