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
const Link = React.createFactory(require('react-router').Link);
const Tooltip = React.createFactory(require('rc-tooltip').default);
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

const Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
const Combobox = React.createFactory(require('../Combobox'));
const ContentPlaceholder = React.createFactory(require('../ContentPlaceholder'));
const EmptyContentNotice = React.createFactory(require('../EmptyContentNotice'));
const InputBlockContainer = React.createFactory(require('../InputBlockContainer'));
const InputWithPlaceholder = React.createFactory(require('../InputWithPlaceholder'));
const SimpleAction = React.createFactory(require('../SimpleAction'));
const ExposureActions = require('../../actions/ExposureActions');
const ExposureAppConstants = require('../../constants/ExposureAppConstants');
const FrontendConstants = require('../../constants/FrontendConstants');
const RouteNameConstants = require('../../constants/RouteNameConstants');
const StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
const AppRequest = require('../../http/AppRequest');
const RouteHelpers = require('../../http/RouteHelpers');
const GA = require('../../util/GoogleAnalytics');
const Util = require('../../util/util');
const HelpUtil = require('../../util/HelpUtil');

const div = React.createFactory(require('../TouchComponents').TouchDiv);
const span = React.createFactory(require('../TouchComponents').TouchSpan);

const {table, tbody, tr, td, a} = DOM;

const severityClasses = {[-1]: 'no-breach', [0]: 'low', [1]: 'medium', [2]: 'high'};

/**
 * Based on BuiltinTasksKPI.js
 */
var BuiltinDataMonitorKPI1 = createReactClass({
  displayName: 'BuiltinDataMonitorKPI1',

  propTypes: {
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
      studyId: null,
      immSelectedCountries: Imm.List(),
      immFilterOptions: Imm.List(),
      data: {},
      immStudyOptions: Imm.List(),
      immCountryOptions: Imm.List(),
      displayFilters: this.props.immExposureStore.get('showFiltersPane'),
      isLoading: true
    };
  },

  componentDidMount: function() {
    this.fetchData();
  },

  shouldComponentUpdate: function(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  },

  fetchData: function(studyId, siteIds) {
    this.setState({isLoading: true});
    const now = (new Date()).getTime();
    const params = $.param({
      studyid: studyId,
      siteids: JSON.stringify(siteIds)
    });
    const url = `/api/builtin/data-monitor-kpi-1?${params}`;

    AppRequest({type: 'GET', url: url}).then(
      data => {
        const currentCountries = (data.filterOptions[data.studyid] || {}).countries;
        const siteNameMap = _.chain(currentCountries)
          .values()
          .flatten()
          .map(({siteid, sitename}) => [siteid, sitename])
          .object()
          .value();
        this.setState({
          data: data.data,
          immFilterOptions: Imm.fromJS(data.filterOptions),
          siteNameMap,
          immStudyOptions: Imm.fromJS(_.map(data.filterOptions, (value, studyid) => ({id: studyid, name: value.name}))).sortBy(immStudy => immStudy.get('name')),
          immCountryOptions: Imm.fromJS(_.map(currentCountries, (siteIds, countryName) => ({id: countryName, name: countryName, siteIds: _.pluck(siteIds, 'siteid')}))).sortBy(immCountry => immCountry.get('name')),
          studyId: data.studyid,
          isLoading: false
        });
      },
      () => {
        this.setState({isLoading: false});
        console.log('%cERROR: GET ' + url + ' failed', 'color: #E05353');
        GA.sendAjaxException('GET ' + url + ' failed');
      }
    )
  },

  handleStudyDropdown: function(studyId) {
    this.setState({
      studyId,
      immSelectedCountries: Imm.List()
    });
    this.fetchData(studyId);
  },

  handleCountryDropdown: function(items) {
    this.setState({immSelectedCountries: Imm.fromJS(items)});
    this.fetchData(this.state.studyId, this.state.immCountryOptions.filter(immItem => _.contains(items, immItem.get('id'))).flatMap(immItem => immItem.get('siteIds')).toJS());
  },

  handleDisplayFilters: function(state) {
    this.setState({displayFilters: state});
    ExposureActions.toggleFiltersPane(state);
  },

  getFilterPane: function() {
    return div({className: 'filters'},
      div({className: 'sub-tab-header'},
        FrontendConstants.FILTERS,
        a({className: 'icon-question-circle', href: Util.formatHelpLink('KPI_FILTER'), target: '_blank'}),
        div({className: 'close-button', onClick: this.handleDisplayFilters.bind(null, false)})),
      div({className: 'included-filter'},
        div({className: cx('filter-block', 'dropdown-filter-block')},
          div({className: 'filter-title-text'}, FrontendConstants.STUDY),
          div({className: 'filter-element'},
            Combobox({
              // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
              // of that and not click needlessly to close the dropdown after selection.
              className: cx('filter-dropdown', 'autoblur', 'study-input'),
              placeholder: FrontendConstants.STUDY,
              value: this.state.studyId,
              valueKey: 'id',
              labelKey: 'name',
              onChange: this.handleStudyDropdown,
              autoBlur: true,
              options: this.state.immStudyOptions
            }))),
        div({className: cx('filter-block', 'dropdown-filter-block')},
          div({className: 'filter-title-text'}, FrontendConstants.COUNTRIES),
          div({className: 'filter-element'},
            Combobox({
              // This is one the dropdowns that auto-close after one selection, this will allow our test system to be aware
              // of that and not click needlessly to close the dropdown after selection.
              className: cx('filter-dropdown', 'autoblur', 'country-input'),
              placeholder: FrontendConstants.COUNTRIES,
              multi: true,
              value: this.state.immSelectedCountries,
              valueKey: 'id',
              labelKey: 'name',
              onChange: this.handleCountryDropdown,
              autoBlur: true,
              options: this.state.immCountryOptions
            })))));
  },

  createViz: function() {
    if (_.isEmpty(this.state.data.monitors) || _.isEmpty(this.state.data.sites)) {
      return EmptyContentNotice({noticeText: FrontendConstants.NO_DATA_RETURNED});
    }
    const currentFileId = this.props.params.fileId;
    const drilldownFileId = Util.getFileAssociatedFileIds(this.props.immExposureStore, currentFileId).first();

    const sortedMonitors = _.sortBy(this.state.data.monitors, monitor => monitor.monitorName);
    const columns = _.map(sortedMonitors, ({monitorName, id, monitorStatus, jobStartedAt}) => {
      const tooltipContent = div({className: 'monitor-kpi-tooltip'}, div({className: 'status'}, `${FrontendConstants.STATUS}: ${Util.capitalizeFirstLetter(monitorStatus.replace('_', ' ').toLowerCase())}`), div({className: 'last-run-time'}, `${FrontendConstants.LAST_RUN}: ${Util.dateTimeFormatterUTC(jobStartedAt)}`));
      return td({key: `monitor-${id}`}, monitorName, Tooltip(Util.getTooltipClasses(null, tooltipContent, 'bottom', 160), span({className: 'icon-question-circle'})))
    });
    columns.unshift(td({key: 'sites'}));
    const rows = _.chain(this.state.data.sites)
      .sortBy(siteId => this.state.siteNameMap[siteId])
      .map((siteId, idx) => {
        const siteName = this.state.siteNameMap[siteId];
        return tr({key: `row-${idx}`}, td({key: `site-${siteName}`}, siteName), _.map(sortedMonitors, monitor => {
          const key = JSON.stringify([monitor.id, siteId]);
          const result = this.state.data.data[key];
          const drilldownId = currentFileId;

          return td({key: key}, div({className: cx({circle: !!result}, 'result', result && severityClasses[result.severity])},
            (result && result.severity !== -1) ? Link({
              to: {name: RouteNameConstants.EXPOSURE_BUILTIN_SHOW, params: {fileId: drilldownFileId}, query: {drilldownId}},
              onClick: result ? ExposureActions.setBuiltinDrilldown.bind(null, drilldownId, Imm.fromJS(result.taskIds)) : _.noop}) : null));
        }));
      })
      .value();
    rows.unshift(tr({className: 'header', key: 'sites'}, columns));
    return table({className: 'data-monitor-viz-1-table'}, tbody(null, rows));
  },

  render: function() {
    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.params.fileId;
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);
    const immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    const reportTitle = immFile.get('title');

    let content;

    if (this.state.isLoading) {
      content = ContentPlaceholder();
    } else if (Util.isDesktop()) {
      content = div({className: 'builtin-view-container'},
        div({className: 'page-header'},
          isHomeActive
            ? null
            : Breadcrumbs({
                immExposureStore,
                fileId
              }),
          div({className: 'header-buttons'},
            SimpleAction({class: 'toggle-filters icon-filter2', text: FrontendConstants.FILTERS, onClick: this.handleDisplayFilters.bind(null, !this.state.displayFilters)}),
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
        div({className: cx('builtin-data-monitor-kpi-1', {'show-filters': this.state.displayFilters})},
          this.getFilterPane(),
          div({className: 'kpi-wrapper'}, this.createViz())
        )
      );
    } else {
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
  }
});

module.exports = BuiltinDataMonitorKPI1;
