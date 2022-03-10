const React = require('react');
const createReactClass = require('create-react-class');
const _ = require('underscore');
const cx = require('classnames');
const Imm = require('immutable');
const Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
const MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
const MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
const MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import ContentPlaceholder from '../ContentPlaceholder';

const Breadcrumbs = React.createFactory(require('./Breadcrumbs'));
const BuiltinTasksKPIFilters = React.createFactory(require('./BuiltinTasksKPIFilters'));
const SimpleAction = React.createFactory(require('../SimpleAction'));
const Spinner = React.createFactory(require('../Spinner'));
const TabularWidget = React.createFactory(require('./TabularWidget'));
const ExposureActions = require('../../actions/ExposureActions');
const DataTypeConstants = require('../../constants/DataTypeConstants');
const ExposureAppConstants = require('../../constants/ExposureAppConstants');
const FrontendConstants = require('../../constants/FrontendConstants');
const ListViewConstants = require('../../constants/ListViewConstants');
const AppRequest = require('../../http/AppRequest');
const RouteHelpers = require('../../http/RouteHelpers');
const GA = require('../../util/GoogleAnalytics');
const Util = require('../../util/util');
const HelpUtil = require('../../util/HelpUtil');

const div = React.createFactory(require('../TouchComponents').TouchDiv);
const span = React.createFactory(require('../TouchComponents').TouchSpan);
const li = DOM.li,
      ul = DOM.ul,
      a = DOM.a;


/**
 * Based on Monitor.js
 */
var BuiltinTasksKPI = createReactClass({
  displayName: 'BuiltinTasksKPI',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number.isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    }),
    query: PropTypes.shape({
      drilldownId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  getInitialState: function() {
    return {
      immTaskData: Imm.Map(),
      filterBreachOnly: true,
      displayFilters: this.props.immExposureStore.get('showFiltersPane'),
      pageLowerLimit: 0,
      pageUpperLimit: ListViewConstants.DEFAULT_ROWS_PER_PAGE - 1,
      immPageOrdering: Imm.List(),
      immSelectedFilterOptions: Imm.Map(),
      isLoadingPage: false
    };
  },

  componentDidMount: function() {
    this.setInitialState();
  },

  /**
   * We should update for fileId and width change. If there's a state change, if it's taskData return true. Otherwise, trigger
   * a fetch and return false.
   * @param nextProps
   * @param nextState
   */
  shouldComponentUpdate: function(nextProps, nextState) {
    // If the only state that changed is the taskData, that means we just fetched and we should update. Also update on width change.
    if (this.props.width !== nextProps.width || this.props.params.fileId !== nextProps.params.fileId || this.state.immTaskData !== nextState.immTaskData) {
      return true;
    } else {
      const stateChanged = !_.isEqual(this.state, nextState);
      const selectedFilterOptionsChanged = !this.state.immSelectedFilterOptions.equals(nextState.immSelectedFilterOptions);

      const curDrilldownId = this.props.query.drilldownId;
      const nextDrilldownId = nextProps.query.drilldownId;
      const { immExposureStore : immCurStore } = this.props;
      const { immExposureStore : immNextStore } = nextProps;
      const builtinDrilldownChanged = !immCurStore.getIn(['builtinDrilldown', curDrilldownId], Imm.List())
        .equals(immNextStore.getIn(['builtinDrilldown', nextDrilldownId], Imm.List()));

      if (stateChanged || selectedFilterOptionsChanged || builtinDrilldownChanged) {
        return true;
      }
    }
    return false;
  },

  componentDidUpdate(prevProps, prevState) {
    const pageLowerLimitChanged = this.state.pageLowerLimit !== prevState.pageLowerLimit;
    const selectedFilterOptionsChanged = !this.state.immSelectedFilterOptions.equals(prevState.immSelectedFilterOptions);
    const currentDrilldownId = this.props.query.drilldownId;
    const previousDrilldownId = prevProps.query.drilldownId;
    const { immExposureStore : immCurStore } = this.props;
    const { immExposureStore : immPrevStore } = prevProps;
    const builtinDrilldownChanged = !immCurStore.getIn(['builtinDrilldown', currentDrilldownId], Imm.List())
      .equals(immPrevStore.getIn(['builtinDrilldown', previousDrilldownId], Imm.List()));

    if (pageLowerLimitChanged || selectedFilterOptionsChanged || builtinDrilldownChanged) {
      this.fetchTaskData(this.state);
    }
  },

  setInitialState: function() {
    if (this.state.immTaskData.isEmpty()) {
        this.fetchTaskData();
    }
  },

  /**
   * We're adding route information to the Link fields.
   * @param immTaskData
   * @returns taskData
   */
  createTaskLinks: function(immTaskData) {
    //var createdTaskLinks = false;
    return immTaskData.update('immRows', immRows => immRows.map(immRow =>
      immRow.update('values', immValues =>
        immValues.map(value =>
          // If this value is a string, and contains cellText, we know this value contains JSON we can use in created a Link. We augment it with the appropriate route for tasks.
          _.isString(value) && value.indexOf('cellText') != -1 ? _.extend(JSON.parse(value), {name: RouteHelpers.getRouteForFileType(ExposureAppConstants.FILE_TYPE_TASK)}) : value
        )
      )
    ));
  },

  constructFilters: function(localState) {
    localState = localState || this.state;

    const drilldownTaskIds = this.props.immExposureStore.getIn(['builtinDrilldown', _.isEmpty(this.props.query) ? '' : this.props.query.drilldownId], Imm.List()).toJS();

    const haveFilterSelections = !localState.immSelectedFilterOptions.isEmpty() || !_.isEmpty(drilldownTaskIds);

    if (haveFilterSelections) {
      const drilldownFilterRequests = _.map(drilldownTaskIds, taskId => ({field: 'Task ID', value: taskId, type: 'EQUALS', dataType: DataTypeConstants.STRING}));
      return drilldownFilterRequests.concat(localState.immSelectedFilterOptions.valueSeq().flatten(true).toJS());
    }

    // Default value.
    return [];
  },

  /**
   * This grabs the latest task data from the server respecting the various filters, page limitations, drilldown, etc.
   * @param localState When we call this from within shouldComponentUpdate(), we want to give it access to the state
   * that we're transitioning to.
   */
  fetchTaskData: function(localState) {
    localState = localState || this.state;
    let url = `/api/builtin/task-kpi`;

    const request = {
      type: 'POST',
      url: url,
      data: {filters: [], startRow: localState.pageLowerLimit, endRow: localState.pageUpperLimit}
    };

    request.data.filters = this.constructFilters(localState);

    if (localState.immPageOrdering) {
      request.data.sortColumns = localState.immPageOrdering.map(immOrdering =>
        ({field: immOrdering.getIn(['column', 'displayString']), ordering: immOrdering.get('ordering')})).toJS();
    }
    this.setState({isLoadingPage: true});

    request.data = JSON.stringify(request.data);
    AppRequest(request)
      .then(data => {
          if (_.isObject(data) && 'columns' in data && 'taskRows' in data && 'totalRows' in data) {
            const immTaskData = Imm.fromJS({
              immRows: Imm.fromJS(data.taskRows),
              immColumns: Imm.fromJS(_.map(data.columns, ({datatype, value}) => ({dataType: datatype, nodeDisplayString: 'Tasks KPI', displayString: value}))),
              immColumnHeaders: Imm.fromJS(_.pluck(data.columns, 'value')),
              totalRows: data.totalRows
            });

            const filterOptions = _.indexBy(data.filterOptions, 'field');

            let newState = {
              immTaskData: this.createTaskLinks(immTaskData),
              filterOptions: filterOptions,
              isLoadingPage: false
            };
            this.setState(newState);
          }
        // TODO: If we don't return valid data, the spinner will just continue forever. We should implement a general approach to error handling
        // rather than creating a special one here. I think a mixin may be good for that. Recommend this be done at later date.
        },
        () => {
          this.setState({isLoadingPage: false});
          GA.sendAjaxException(`GET ${url} failed`);
        }
      );
  },

  handleDisplayFilters: function(state) {
    this.setState({displayFilters: state});
    ExposureActions.toggleFiltersPane(state);
  },

  applyTaskFilters : function (immSelectedFilterOptions) {
    this.setState({
      immSelectedFilterOptions: immSelectedFilterOptions,
      pageLowerLimit: immSelectedFilterOptions ? 0 : this.state.pageLowerLimit,
      pageUpperLimit: immSelectedFilterOptions ? this.tabularReportGetRowsPerPage() - 1 : this.state.pageUpperLimit,
    });
  },

  /**
   * The following functions mimic the API a tabular report utilizes to track state via the main store. This is passed
   * to the underlying TabularWidget. Since we are storing state locally we don't need to utilize the shared store.
   *
   * We're not checking for existence of this.state.immTaskData, because the TabularWidget that would call these functions
   * would only be added to the page once we've grabbed the data.
   */
  /**************** Begin tabular report store API ****************/
  tabularReportGetRowsPerPage: function() {
    var pageLowerLimit = this.state.pageLowerLimit;
    var pageUpperLimit = this.state.pageUpperLimit;
    return pageUpperLimit - pageLowerLimit + 1;
  },

  tabularReportGetTotalRows: function(reportId) {
    return this.state.immTaskData.get('totalRows');
  },

  tabularReportSetRowsPerPage: function(reportId, drilldownId, rowsPerPage) {
    const newState = _.extend({}, this.state, {
      pageLowerLimit: 0,
      pageUpperLimit: rowsPerPage - 1,
      isLoadingPage: true
    });
    this.setState(newState);
    this.fetchTaskData(newState);

  },

  setTabularReportPage: function(reportId, pageNumber, rowsPerPage) {
    var newPageLowerLimit = rowsPerPage * (pageNumber - 1);
    var newPageUpperLimit = rowsPerPage + newPageLowerLimit - 1;
    this.setState({
      pageLowerLimit: newPageLowerLimit,
      pageUpperLimit: newPageUpperLimit,
      isLoadingPage: true
    });
  },

  tabularReportGoToPage: function(reportId, drilldownId, pageNumber) {
    var pageLowerLimit = this.state.pageLowerLimit;
    var rowsPerPage = Util.isMobile() ? ListViewConstants.DEFAULT_MOBILE_ROWS_PER_PAGE :
      this.tabularReportGetRowsPerPage();
    var totalRows = this.tabularReportGetTotalRows();

    var curPageNumber = pageLowerLimit / rowsPerPage + 1;
    var maxPageNumber = Math.floor((totalRows + rowsPerPage - 1) / rowsPerPage);
    if (1 <= pageNumber && pageNumber <= maxPageNumber && pageNumber !== curPageNumber) {
      this.setTabularReportPage(reportId, pageNumber, rowsPerPage);
    }
  },

  tabularReportSetColumnSort: function(reportId, drilldownId, colIndex, sortIndex) {
    // TODO: We currently support only single column sorts. This logic needs to be updated when we support multi-column sorts.
    var immNewOrderings = Imm.List();
    if (sortIndex !== 2) {
      var queryOrdering = [ListViewConstants.ORDER_ASCENDING_STR, ListViewConstants.ORDER_DESCENDING_STR][sortIndex];
      immNewOrderings = Imm.List([Imm.Map({column: this.state.immTaskData.getIn(['immColumns', colIndex]), ordering: queryOrdering})]);
    }

    const newState = _.extend({}, this.state);
    newState.immPageOrdering = immNewOrderings;
    this.setState(newState);
    this.fetchTaskData(newState);
  },

  render: function() {
    if (this.state.immTaskData.isEmpty()) {
      return Spinner();
    }

    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.params.fileId;
    const isHomeActive = Util.isHomeRouteActive(this.props.routes);
    const immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    const reportTitle = immFile.get('title');

    var content;
    if (Util.isDesktop()) {
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
        div({className: cx('builtin-tasks-kpi', {'show-filters': this.state.displayFilters})},
          BuiltinTasksKPIFilters({
            filterOptions: this.state.filterOptions,
            handleClose: this.handleDisplayFilters.bind(null, false),
            immSelectedFilterOptions: this.state.immSelectedFilterOptions,
            displayFilters: this.state.displayFilters,
            applyTaskFilters:this.applyTaskFilters
          }),
          div({className: 'kpi-wrapper'}, !this.state.immTaskData.isEmpty() ?
            this.state.isLoadingPage ? <ContentPlaceholder/> :
            TabularWidget({
              totalRows: this.state.immTaskData.get('totalRows'),
              immColumns: this.state.immTaskData.get('immColumns'),
              immColumnHeaders: this.state.immTaskData.get('immColumnHeaders'),
              immPageOrdering: this.state.immPageOrdering,
              immRows: this.state.immTaskData.get('immRows'),
              tabularActions: this,
              width: this.props.width,
              fileId: this.props.params.fileId,
              pageLowerLimit: this.state.pageLowerLimit,
              pageUpperLimit: this.state.pageUpperLimit,
            }) : null,
            div({className: cx('report-detail-panel', {loading: false})},
              div({className: 'report-detail-panel-contents'},
                div({className: 'export-options', key: 'export-options'},
                  span({className: 'header-text'}, FrontendConstants.EXPORT_OPTIONS),
                  ul(null, li({className: 'open-link', onClick: ExposureActions.exportFileData.bind(null, fileId, this.props.query.drilldownId, ExposureAppConstants.DOWNLOAD_TYPE_CSV, {filters: this.constructFilters(), sortColumns: []})}, FrontendConstants.DOWNLOAD_CSV))
                )
              )
            )
          )
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

module.exports = BuiltinTasksKPI;
