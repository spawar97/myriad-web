var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var $ = require('jquery');
var cx = require('classnames');
var Imm = require('immutable');
var Tooltip = React.createFactory(require('rc-tooltip').default);
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Checkbox = React.createFactory(require('../Checkbox'));
var Combobox = React.createFactory(require('../Combobox'));
var DateRange = React.createFactory(require('../DateRange'));
var ListItem = React.createFactory(require('../ListItem'));
var Slider = React.createFactory(require('../Slider'));
var CookieActions = require('../../actions/CookieActions');
var ExposureActions = require('../../actions/ExposureActions');
var DataTypeConstants = require('../../constants/DataTypeConstants');
var ExposureAppConstants = require('../../constants/ExposureAppConstants');
var FrontendConstants = require('../../constants/FrontendConstants');
var FilterUpdateTypes = require('../../constants/FilterUpdateTypes');
var ModalConstants = require('../../constants/ModalConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var Menu = React.createFactory(require('../../lib/react-menu/components/Menu'));
var MenuOption = React.createFactory(require('../../lib/react-menu/components/MenuOption'));
var MenuOptions = React.createFactory(require('../../lib/react-menu/components/MenuOptions'));
var MenuTrigger = React.createFactory(require('../../lib/react-menu/components/MenuTrigger'));
var Util = require('../../util/util');
var Button = React.createFactory(require('../Button'));


var a = DOM.a;
var div = DOM.div;
var hr = DOM.hr;
var span = DOM.span;

var ALL_VALUES_DROPDOWN_INDEX = 0;

/**
 * This render the Filters pane
 */
class Filters extends React.Component {
  static displayName = 'Filters';

  static propTypes = {
    cookies: PropTypes.object.isRequired,
    fileId: PropTypes.string.isRequired,
    handleClose: PropTypes.func.isRequired,
    shouldHaveFixedPosition: PropTypes.func.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    drilldownId: PropTypes.string,
    useStudyFilter: PropTypes.bool
  };

  state = {
    panelFixed: false
  };

  shouldComponentUpdate(nextProps, nextState) {
    var cookies = this.props.cookies;
    var immExposureStore = this.props.immExposureStore;
    var immNextExposureStore = nextProps.immExposureStore;
    var currentFileId = this.props.fileId;
    var nextFileId = nextProps.fileId;
    var immCurrentSessionDynamicFilterResults = immExposureStore.get('sessionDynamicFilterResults');
    var immNextSessionDynamicFilterResults = immNextExposureStore.get('sessionDynamicFilterResults');

    // id:9899 This is to prevent Filters pane from pre-maturely rendering session filters upon delete.
    // CookieAction triggered to delete a filter entry in the cookie will trigger a re-render but filterData
    // has not yet arrived for ExposureStore (`fetchReportData` & `fetchDashboardData`).
    // Thus, we need to prevent the render until they sync up.
    var sessionFilterDataReady = true;
    if (!_.isEqual(cookies, nextProps.cookies) && immNextSessionDynamicFilterResults) {
      sessionFilterDataReady = immNextSessionDynamicFilterResults.size === _.size(Util.getSessionFiltersFromCookie(immExposureStore.get('currentAccountId')).sessionDynamicFilters, nextProps.cookies);
    }

    var stateChanged = this.state !== nextState;
    var cookiesChanged = !_.isEqual(cookies, nextProps.cookies);
    var fileIdChanged = currentFileId !== nextFileId;
    var filterPaneWasToggled = immExposureStore.get('showFiltersPane') !== immNextExposureStore.get('showFiltersPane');
    var fileChanged = immExposureStore.get('showFiltersPane') && !Imm.is(immExposureStore.getIn(['files', currentFileId]), immNextExposureStore.getIn(['files', nextFileId]));
    var sessionStaticFiltersChanged = !Imm.is(immExposureStore.get('sessionStaticFilterResults'), immNextExposureStore.get('sessionStaticFilterResults'));
    var sessionDynamicFiltersChanged = !Imm.is(immCurrentSessionDynamicFilterResults !== immNextSessionDynamicFilterResults);
    var comprehendSchemaOverviewsChanged = !Imm.is(immExposureStore.get('comprehendSchemaOverviews'), immNextExposureStore.get('comprehendSchemaOverviews'));

    return sessionFilterDataReady && (stateChanged || cookiesChanged || fileIdChanged || filterPaneWasToggled || fileChanged ||
        sessionStaticFiltersChanged || sessionDynamicFiltersChanged || comprehendSchemaOverviewsChanged
      );
  }

  componentWillUnmount() {
    if (Util.isDesktop()) {
      window.removeEventListener('scroll', this.updatePanelPosition);
      window.removeEventListener('resize', this.updatePanelPosition);
    }
  }

  componentDidMount() {
    if (Util.isDesktop()) {
      window.addEventListener('scroll', this.updatePanelPosition);
      window.addEventListener('resize', this.updatePanelPosition);
    }
  }

  updatePanelPosition = () => {
    const fp = ReactDOM.findDOMNode(this.refs.filterPane);
    if (fp) {  // This will be null if the filter pane is closed.
      // If the filter pane is open and we're in fixed mode grab the width of the
      // filterPane and apply it to the filter container. This is necessary
      // because when we make the filter container `position: fixed` it is no
      // longer width restricted by it's surroundings so we need to fix it using
      // the width of the parent element which is still in the normal layout
      // flow with the correct width.
      const fc = ReactDOM.findDOMNode(this.refs.filterContainer);
      $(fc).css('width', $(fp).outerWidth());
    }
    // Only update state if we need to.
    const isFixed = !this.props.shouldHaveFixedPosition();
    if (isFixed !== this.state.panelFixed) {
      this.setState({
        panelFixed: isFixed
      });
    }
  };

  updateSessionDropdownFilter = (filterIndex, newItemsSelected) => {
    var filterCookieEntry = Util.getSessionFilterCookieEntry(this.props.cookies, filterIndex, immExposureStore.get('currentAccountId'));
    var update = true;
    var itemsSelected = filterCookieEntry.filterState.itemsSelected || [];

    // If sizes are the same, verify all values are the same.
    if (_.size(itemsSelected) === _.size(newItemsSelected) && _.chain(itemsSelected).zip(newItemsSelected).all(([oldItem, newItem]) => oldItem === newItem).value()) {
      update = false;
    }
    if (update) {
      CookieActions.updateSessionFilterFilterState(filterIndex, FilterUpdateTypes.DROPDOWN_SET_VALUES, newItemsSelected);
      ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, filterIndex + 1);
    }
  };

  updateSessionDropdownRemoveValue = (filterIndex, value) => {
    CookieActions.updateSessionFilterFilterState(filterIndex, FilterUpdateTypes.LIST_REMOVE_VALUE, {value: value});
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, filterIndex + 1);
  };

  updateSessionSliderFilter = (filterIndex, data) => {
    CookieActions.updateSessionFilterFilterState(filterIndex, FilterUpdateTypes.SLIDER_UPDATE_FILTER_BOUNDS, {
      lowerBound: data.lowerBound.toString(),
      upperBound: data.upperBound.toString()
    });
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, filterIndex + 1);
  };

  updateSessionFilterIncludeNull = (filterIndex) => {
    CookieActions.updateSessionFilterFilterState(filterIndex, FilterUpdateTypes.TOGGLE_NULL);
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, filterIndex + 1);
  };

  updateDropdownFilter = (fileId, filterIndex, currentlySelected) => {
    currentlySelected != null ? ExposureActions.updateIncludedDynamicFilter(fileId, this.props.drilldownId, filterIndex,
      FilterUpdateTypes.DROPDOWN_SET_VALUES, currentlySelected instanceof Array ? currentlySelected : [currentlySelected]) :
      ExposureActions.updateIncludedDynamicFilter(fileId, this.props.drilldownId, filterIndex, FilterUpdateTypes.RESET_FILTER);
  };

  resetSessionDynamicFilter = (filterIndex) => {
    CookieActions.updateSessionFilterFilterState(filterIndex, FilterUpdateTypes.RESET_FILTER);
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, filterIndex + 1);
  };

  resetAllSessionDynamicFilters = () => {
    CookieActions.resetAllSessionDynamicFilters(immExposureStore.get('currentAccountId'));
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId);
  };

  removeSessionFilter = (sessionFilterType, filterIndex) => {
    // `fetchFilterDataStartIndex` for session filters represent the index of the filter among session dynamic filters ONLY.
    // If a session static filter is removed, all dynamic filters are affected, so `fetchFilterDataStartIndex` is set to -1.
    const fetchFilterDataStartIndex = sessionFilterType === ExposureAppConstants.FILTER_TYPE_DYNAMIC ? filterIndex : -1;
    let sessionFilters = Util.getSessionFiltersFromCookie(immExposureStore.get('currentAccountId'), this.props.cookies);

    switch (sessionFilterType) {
      case ExposureAppConstants.FILTER_TYPE_STATIC:
        sessionFilters.sessionStaticFilters.splice(filterIndex, 1);
        break;
      case ExposureAppConstants.FILTER_TYPE_DYNAMIC:
        sessionFilters.sessionDynamicFilters.splice(filterIndex, 1);
        break;
    }
    CookieActions.setSessionFilters(sessionFilters, immExposureStore.get('currentAccountId'));
    ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_SUCCESSFULLY_DELETED_A_SESSION_FILTER, StatusMessageTypeConstants.TOAST_SUCCESS);
    ExposureActions.applyFilter(this.props.fileId, this.props.drilldownId, fetchFilterDataStartIndex);
  };

  getDynamicFilterTitle = (immFilter, fileId, filterIndex, isSession) => {
    var propertyDisplayString = immFilter.getIn(['column', 'displayString']);
    var nodeDisplayString = '';
    var sessionDynamicFilterNameCount = this.props.immExposureStore.get('sessionDynamicFilterResults', Imm.List()).count(function(immFilter) {
      return immFilter.getIn(['dynamicFilterPropertyColumn', 'displayString']) === propertyDisplayString;
    });
    var includedDynamicFilterNameCount = this.props.immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List()).count(function(immFilter) {
      return immFilter.getIn(['column', 'displayString']) === propertyDisplayString;
    });
    if (sessionDynamicFilterNameCount + includedDynamicFilterNameCount > 1) {
      nodeDisplayString = propertyDisplayString !== 'Study Name' ? immFilter.getIn(['column', 'nodeDisplayString']) + ' - ' : '';
    }
    var nullExcluded = immFilter.get('nullExcluded', false);

    var resetMenuOption = immFilter.get('valid') ? MenuOption({
      // If this is an included filter, Reset is the last item before the hr.
      className: cx('filter-menu-option', 'react-menu-icon', 'icon-undo', {'last-item': !isSession}),
      onSelect: isSession ?
        this.resetSessionDynamicFilter.bind(null, filterIndex) :
        ExposureActions.updateIncludedDynamicFilter.bind(null, fileId, this.props.drilldownId, filterIndex, FilterUpdateTypes.RESET_FILTER)},
      div({className: 'react-menu-icon'}, FrontendConstants.RESET)) :
      null;

    var deleteMenuOption = isSession ?
      MenuOption({
          className: cx('filter-menu-option', 'react-menu-icon', 'icon-remove', 'last-item'),
          onSelect: this.removeSessionFilter.bind(null, ExposureAppConstants.FILTER_TYPE_DYNAMIC, filterIndex)
        },
        span({className: 'react-menu-icon'}, FrontendConstants.DELETE)) :
      null;

    var includeNullsMenuOption = immFilter.get('valid') ? MenuOption({
      className: 'include-nulls',
      onSelect: isSession ?
        this.updateSessionFilterIncludeNull.bind(null, filterIndex) :
        ExposureActions.updateIncludedDynamicFilter.bind(null, fileId, this.props.drilldownId, filterIndex, FilterUpdateTypes.TOGGLE_NULL)},
      div({className: 'virtual-table'},
        div({className: 'virtual-table-row'},
          div({className: 'virtual-table-cell'}, Checkbox({checkedState: nullExcluded, onClick: _.noop})),
          div({className: 'virtual-table-cell'}, span({className: 'include-nulls-text'}, FrontendConstants.EXCLUDE_NULL_VALUES))
        )
      )
    ) : null;

    // Use our custom prop `horizontalPlacement` to ensure that we don't horizontally overflow in the
    // mobile filter pane due to the dropdowns being rendered offscreen to the right by default.
    var menu = Menu({className: 'filter-menu', horizontalPlacement: 'left'},
      MenuTrigger({className: cx('filter-menu-trigger', 'icon-accordion-down')}, null),
      MenuOptions({className: 'filter-menu-options'},
        resetMenuOption,
        deleteMenuOption,
        hr(),
        includeNullsMenuOption
      )
    );

    return div({className: 'filter-title'},
      span({className: cx('filter-title-text', {'null-excluded': nullExcluded})}, nodeDisplayString + propertyDisplayString),
      menu
    );
  };

  getDropdownFilter = (immFilter, filterIndex, fileId, isSession, hidden) => {
    var propertyId = immFilter.getIn(['column', 'propertyId']);
    var dataType = immFilter.getIn(['column', 'dataType']);
    var immDropdownData = immFilter.get('data', Imm.List());

    let immDropdownItems = immDropdownData.map(value => {
      const label = Util.valueFormatter(value, dataType);
      return {value: label, label: label};
    });

    // Only one item remains or the filter is labeled invalid by the backend.
    var dropdownDisabled = immDropdownItems.size < 2 || !immFilter.get('valid');
    const dropdown = Combobox({
      className: 'filter-dropdown',
      abbreviationThreshold: 8,
      disabled: dropdownDisabled,
      // Enable multi-selection if the dropdown isn't disabled, that way if there's only one item to display, it will be
      // shown prominently.
      multi: !dropdownDisabled,
      clearable: false,  // Do not display an `x` that clears all choices inside the box.
      placeholder: FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER,  // Displayed when no choices are selected.
      // If the dropdown is disabled but we have items, that must mean we only have one item to display. Set it to be
      // displayed so the users know what value is selected even if the dropdown is frozen.
      // I am so so sorry for this nested ternary.
      value: dropdownDisabled ? (!immDropdownItems.isEmpty() ? immDropdownItems.first() : null) : immFilter.get('itemsSelected', Imm.List()).map(value => ({value: value, label: value})),
      onChange: isSession ? this.updateSessionDropdownFilter.bind(null, filterIndex) : this.updateDropdownFilter.bind(null, fileId, filterIndex),
      options: immDropdownItems.toOrderedSet()
    });

    return div({
        key: (isSession ? 'session-dynamic-filter' : fileId) + '-' + propertyId + '-' + filterIndex,
        // `hidden` className will hide the component. Currently, it's used to hide the `Study Name`
        // session dynamic filters to ensure the indices of the filter block line up with the indices
        // in the cookie.
        className: cx('filter-block dynamic-filter', 'dropdown-filter-block', {hidden})},
      this.getDynamicFilterTitle(immFilter, fileId, filterIndex, isSession),
      div({className: 'filter-element'},
        dropdown)
    );
  };

  greyOutdata = (existingFilterData, actualDataFilter, dataType) => {
    let valuesWithData = _.intersection(existingFilterData, actualDataFilter);
    let valuesWithNoData = _.difference(existingFilterData, valuesWithData);

    let greyedValues = valuesWithNoData.map(value => {
      return { value: value, label: value, className: "disabled", title: `Data is not available for selected ${dataType.toLocaleLowerCase()} to display dashboard`, disabled: true };
    });

    let dataValues = valuesWithData.map((val) => {
      return { value: val, label: val };
    });

    return Imm.fromJS([...dataValues, ...greyedValues]);
  };

  getSingleDropdownFilter = (immFilter, filterIndex, fileId, isSession, hidden, currentIncludedFilter = null) => {
    const propertyId = immFilter.getIn(['column', 'propertyId']);
    const dataType = immFilter.getIn(['column', 'dataType']);
    const immDropdownData = immFilter.get('data', Imm.List());

    // Code to map values and get intersection COM-4177
    let immDropdownItems = [];

    if (currentIncludedFilter && currentIncludedFilter.hasOwnProperty('intersection')) {
      let storedData = this.props.immExposureStore.get('includedFilter').toJS()
      let nextFilterData = storedData.hasOwnProperty(fileId) ? storedData[fileId][filterIndex + 1].dynamicFilterData.rows.map((ob) => { return ob.values }).flat() : [];
      immDropdownItems = this.greyOutdata(immDropdownData.toJS(), nextFilterData, immFilter.getIn(['column', 'displayString']));
    }
    else {
      // Existing code to handle combobox values
      immDropdownItems = immDropdownData.map(value => {
        const label = Util.valueFormatter(value, dataType);
        return {value: label, label: label};
      });
    }
    // ends here

    const value = {value: immFilter.getIn(['itemsSelected', 0]), label:immFilter.getIn(['itemsSelected', 0])};
    //The filter is labeled invalid by the backend.
    const dropdownDisabled = immDropdownItems.size < 2 || !immFilter.get('valid');
    const dropdown = Combobox({
      className: 'filter-dropdown',
      abbreviationThreshold: 8,
      disabled: dropdownDisabled,
      multi: false,  //closes dropdown on selection
      isMulti: false, //enables single selection
      clearable: false,  // Do not display an `x` that clears all choices inside the box.
      placeholder: FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER,  // Displayed when no choices are selected.
      //if our value is undefined, use null so we can see our placeholder
      value: dropdownDisabled ? (!immDropdownItems.isEmpty() ? immDropdownItems.first() : null) :(value && value.value ? value : null),
      onChange: isSession ? this.updateSessionDropdownFilter.bind(null, filterIndex) : this.updateDropdownFilter.bind(null, fileId, filterIndex),
      options: immDropdownItems.toOrderedSet()
    });

    let hasDisabledOptions = immDropdownItems.toJS().map((obj) => { return obj.disabled }).includes(true);
    
    return div({
        key: (isSession ? 'session-dynamic-filter' : fileId) + '-' + propertyId + '-' + filterIndex,
        // `hidden` className will hide the component. Currently, it's used to hide the `Study Name`
        // session dynamic filters to ensure the indices of the filter block line up with the indices
        // in the cookie.
        className: cx('filter-block dynamic-filter', 'dropdown-filter-block', {hidden})},
      this.getDynamicFilterTitle(immFilter, fileId, filterIndex, isSession),
      div({className: 'filter-element'}, dropdown),
      hasDisabledOptions ? 
       div({className: 'filter-msg-container'},
        div({className: 'filter-element-msg asterisk'}, "* "), 
        div({className: 'filter-element-msg msg'},"For grayed out sites no data available to display in dashboard.")
       )
      : null
    );
  };

  getSliderFilter = (immFilter, filterIndex, fileId, isSession, isEnableAllDates, immExposureStore) => {
    let templatizeReport, enablesAllCalendar, includedFilters;
    let immFile = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    let currentDashboardId = immExposureStore.get('currentDashboardId');
    let disableBound = false;
    let embededReports = immFile.getIn(['reportIds']) ? immFile.getIn(['reportIds']).toJS(): undefined;
    if(currentDashboardId && embededReports && embededReports.length > 0){
      _.forEach(embededReports, function (fileID) {
        includedFilters = immExposureStore.toJS().fileConfigs[fileID].includedDynamicFilters;
        includedFilters.map(function(immFilter, idx) {
          return enablesAllCalendar = includedFilters[idx].hasOwnProperty('enableAllDates') ? includedFilters[idx].enableAllDates : null;
        })

        templatizeReport = immExposureStore.getIn(['files', fileID, 'fileWrapper', 'file', 'templatedReport', 'template'])
        if (templatizeReport) {
          if (templatizeReport.toJS().id == '4fe13810-2baf-472a-84d9-5bf0d9e5e7d6'  || enablesAllCalendar == true) {
            disableBound = true;
          }
        }
      });
    }

    if(immFile.getIn(['templatedReport', 'template']) || isEnableAllDates) {
      let templateId = immFile.getIn(['templatedReport', 'template']).toJS();
      if (templateId.id == '4fe13810-2baf-472a-84d9-5bf0d9e5e7d6' || isEnableAllDates == true) {
        disableBound = true;
      }
    }
    var propertyId = immFilter.getIn(['column', 'propertyId']);
    var dataType = immFilter.getIn(['column', 'dataType']);
    var immSliderData = immFilter.get('data');
    var immCurrentBounds = immFilter.get('currentBounds', immSliderData);

    var minLowerBound = immSliderData ? Util.valueParser(immSliderData.get(0), dataType) : 0;
    var maxUpperBound = immSliderData ? Util.valueParser(immSliderData.get(1), dataType) : 1;

    var lowerBound = Util.valueParser(immCurrentBounds.get(0), dataType);
    var upperBound = Util.valueParser(immCurrentBounds.get(1), dataType);

    var disabled = _.isNaN(minLowerBound) ||
      _.isNaN(maxUpperBound) ||
      !immFilter.get('valid') ||
      (lowerBound > maxUpperBound) ||
      (upperBound < minLowerBound);

    var isDateRange = dataType === DataTypeConstants.DATE || dataType === DataTypeConstants.DATETIME;
    var onRangeUpdate = isSession ?
      this.updateSessionSliderFilter.bind(null, filterIndex) :
      ExposureActions.updateIncludedDynamicFilter.bind(null, fileId, this.props.drilldownId, filterIndex, FilterUpdateTypes.SLIDER_UPDATE_FILTER_BOUNDS);
    var filterElement = isDateRange ?
      DateRange({
        lowerBound: lowerBound,
        /*
         TP: 26044 documents an issue where the darkroom app exhibits
         undesirable behaviour when a column is of type 'Date' in Comprehend
         Schema but of type 'timestamp' in Postgres.

         As a short-term workaround, we are redefining the date picker
         functionality to exclude end date and allowing users to select past
         the last date of data as a workaround (more prevalent when the last
         date of data is today).
         */
        maxUpperBound: disableBound ? null : maxUpperBound + 86400000,
        minLowerBound: disableBound ? null : minLowerBound,
        upperBound: upperBound,
        skipLowInitialDate: !lowerBound,
        skipUpInitialDate : !upperBound,
        lowDisabled: disabled,
        upDisabled: disabled,
        onRangeUpdate: onRangeUpdate
      }) :
      Slider({
        lowerBound: lowerBound,
        maxUpperBound: maxUpperBound,
        minLowerBound: minLowerBound,
        upperBound: upperBound,
        disabled: disabled,
        onlyUpdateOnRelease: true,
        onSliderUpdate: onRangeUpdate,
        valueType: dataType
      });

    return div({
        key: (isSession ? 'session-dynamic-filter' : fileId) + '-' + propertyId + '-' + filterIndex + '-' + minLowerBound + '-' + maxUpperBound,
        className: cx('filter-block', 'dynamic-filter', {'slider-filter-block': !isDateRange, 'date-filter-block': isDateRange})},
      this.getDynamicFilterTitle(immFilter, fileId, filterIndex, isSession),
      div({className: cx('filter-element')}, filterElement)
    );
  };

  getIncludedDynamicFilters = () => {
    var immExposureStore = this.props.immExposureStore;
    var fileId = this.props.fileId;
    var immIncludedDynamicFilterStates = immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
    var immIncludedStaticFilters = immExposureStore.getIn(['files', fileId, 'includedStaticFilters'], Imm.List());
    if ((!immIncludedDynamicFilterStates || immIncludedDynamicFilterStates.isEmpty()) && (!immIncludedStaticFilters || immIncludedStaticFilters.isEmpty())) {
      return div({className: 'no-filters'}, FrontendConstants.NO_FILTERS_FOR_THIS_FILE(immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType'])));
    }

    let includedFilters = this.props.immExposureStore.toJS().fileConfigs[fileId].includedDynamicFilters;

    return immIncludedDynamicFilterStates.map(function(immFilter, idx) {
      let hidden = includedFilters[idx].hasOwnProperty('hidden') ? includedFilters[idx].hidden : null;
      let isEnableAllDates = includedFilters[idx].hasOwnProperty('enableAllDates') ? includedFilters[idx].enableAllDates : null;
      switch (immFilter.get('filterType')) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          return this.getDropdownFilter(immFilter, idx, fileId);
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          return this.getSliderFilter(immFilter, idx, fileId,false, isEnableAllDates, immExposureStore);
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
          return this.getSingleDropdownFilter(immFilter, idx, fileId, null, hidden, includedFilters[idx]);
      }
    }, this).toJS();
  };

  asteriskNeeded = () => {
    const immExposureStore = this.props.immExposureStore;
    const fileId = this.props.fileId;
    const immIncludedDynamicFilterStates = immExposureStore.getIn(['files', fileId, 'filterStates'], Imm.List());
    return immIncludedDynamicFilterStates.some(immFilter => immFilter.get('nullExcluded', false));
  };

  getIncludedStaticFilters = () => {
    var immExposureStore = this.props.immExposureStore;
    var fileId = this.props.fileId;
    var immIncludedStaticFilters = immExposureStore.getIn(['files', fileId, 'includedStaticFilters'], Imm.List());
    return immIncludedStaticFilters.map(function(immIncludedStaticFilter, idx) {
      return div({key: 'included-static-filter' + idx, className: 'static-filter-block'}, ListItem({
        classnameSet: {'included-static-filter': true},
        content: immIncludedStaticFilter.get('staticFilterDisplayString')
      }));
    }, this).toJS();
  };

  clearDrillDownFilter = () =>{
    const immExposureStore = this.props.immExposureStore;
    CookieActions.resetAllSessionDynamicFilters(immExposureStore.get('currentAccountId'));
    ExposureActions.clearDrilldown(this.props.fileId, this.props.drilldownId);
  };

  getDrilldownFilterContent = () => {
    const immExposureStore = this.props.immExposureStore;
    const drilldownId = this.props.drilldownId;
    const immDrilldownDataPointFilters = immExposureStore.getIn(['drilldown', drilldownId, 'drilldownDataPointFilters'], Imm.List());
    const immDrilldownDisplayStrings = immExposureStore.get('drilldownFilterDisplayStrings', Imm.List())
        .filter(immItem => immItem.indexOf("Comprehend Datasource") &&  immItem.indexOf("Object Unique Key"));
    const shouldRenderPrettyPrint = immDrilldownDisplayStrings.size > 0;
    const shouldRenderClearButton = !immDrilldownDataPointFilters.isEmpty() || shouldRenderPrettyPrint;

    if (!shouldRenderClearButton && !shouldRenderPrettyPrint) {
      return null;
    }

    // TODO: use css for width and height instead of js.
    // First, guess if the content will overflow by looking at # of entries to render. The vertical limit of the drilldown filter display is seven lines. For subsequent renders,
    // use jquery to accurately estimate the overflow.
    const overflown = immDrilldownDisplayStrings.size > 7 || $('.static-filters')[0] && $('.static-filters')[0].scrollHeight > $('.static-filters').innerHeight();
    const filterDisplay = div({className: 'static-filters', style: {width: overflown ? 'calc(100% - 3rem)' : '100%'}},
      _.map([...new Set(immDrilldownDisplayStrings.toJS() && immDrilldownDisplayStrings.toJS().sort())], (displayString, idx) => div({key: `static-filter-${idx}`, className: 'static-filter'}, displayString))
    );
    const innerContent = div({className: 'static-filters-container'}, filterDisplay, overflown ? div({className: 'ellipsis'}, '...') : null);
    return div({className: 'panel drilldown-filter'},
      // Render `Clear` button only when there are drilldown filters. `drilldownDataPointFilters` is used because upon a drilldown, there always exist data point filters.
      shouldRenderClearButton ? span({className: 'clear-drilldown-filters', onClick: ()=> {this.clearDrillDownFilter()}},
        FrontendConstants.CLEAR
      ) : null,
      // Render "pretty print" drilldown filter.
      shouldRenderPrettyPrint ?
        (overflown ? Tooltip(Util.getTooltipClasses(null, filterDisplay, 'bottom', 320), innerContent) : innerContent) : null
    );
  };

  getSessionStaticFilters = () => {
    var immExposureStore = this.props.immExposureStore;
    var immSessionStaticFilterResults = immExposureStore.get('sessionStaticFilterResults', Imm.List());
    return immSessionStaticFilterResults.isEmpty() ? [] :
      immSessionStaticFilterResults.map(function(immFilterResult, idx) {
        return div({key: 'session-static-filter' + idx, className: 'static-filter-block'}, ListItem({
          classnameSet: {disabled: !immFilterResult.get('valid'), 'session-static': true},
          content: immFilterResult.get('staticFilterDisplayString'),
          icon: 'icon-close-alt',
          onIconClick: this.removeSessionFilter.bind(null, ExposureAppConstants.FILTER_TYPE_STATIC, idx)
        }));
      }, this).toJS();
  };

  // Get immutable session dynamic filter state.
  getSessionDynamicFilterStates = () => {
    var immExposureStore = this.props.immExposureStore;
    var immSessionDynamicFilterResults = immExposureStore.get('sessionDynamicFilterResults', Imm.List());
    return immSessionDynamicFilterResults.map(function(immFilterResult, idx) {
      var filterCookieEntry = Util.getSessionFilterCookieEntry(this.props.cookies, idx, immExposureStore.get('currentAccountId'));
      var filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
      var immFilter = Imm.fromJS(filter).merge({
        column: immFilterResult.get('dynamicFilterPropertyColumn'),
        data: _.chain(immFilterResult.getIn(['dynamicFilterData', 'rows']).toJS()).pluck('values').flatten().value(),
        filterType: filter.dynamicFilterComponentType,
        valid: immFilterResult.get('valid')
      });

      // When a session filter is applied to an incompatible report (possibly with different schema), the backend won't even parse the CQL.
      // Therefore, we save `displayString` and `dataType` in the cookie as a fallback option so we know how to show invalid session filters.
      if (!immFilter.hasIn(['column', 'displayString'])) {
        immFilter = immFilter.setIn(['column', 'displayString'], filter.displayString);
      }
      if (!immFilter.hasIn(['column', 'dataType'])) {
        immFilter = immFilter.setIn(['column', 'dataType'], filter.dataType);
      }

      switch (immFilter.get('filterType')) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          if (!_.isUndefined(filter.lower) && !_.isUndefined(filter.upper)) {
            immFilter = immFilter.merge({currentBounds: [filter.lower, filter.upper]});
          }
          break;
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          // If the session dropdown filter hasn't been manipulated yet, `allSelected` might be undefined.
          if (!immFilter.has('allSelected')) {
            immFilter = immFilter.set('allSelected', true);
          }
          break;
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
          // If the session dropdown filter hasn't been manipulated yet, `allSelected` might be undefined.
          if (!immFilter.has('allSelected')) {
            immFilter = immFilter.set('allSelected', false);
          }
      }
      return immFilter;
    }, this);
  };

  // Map immutable session dynamic filters to components.
  getSessionDynamicFilters = () => {
    var fileId = this.props.fileId;
    return this.getSessionDynamicFilterStates().map(function(immFilter, idx) {
      switch (immFilter.get('filterType')) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          const isStudyFilter = this.props.useStudyFilter && idx === 0 && Util.isStudyColumn(immFilter.get('column'));
          // Instead of removing the `Study Name` session dynamic filter from the session dynamic filters list,
          // we hide the `Study Name` session dynamic filters to ensure the indices of the filter block
          // line up with the indices in the cookie.
          return this.getDropdownFilter(immFilter, idx, fileId, true, isStudyFilter);
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          return this.getSliderFilter(immFilter, idx, fileId, true);
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN_SINGLE_SELECT:
          return this.getSingleDropdownFilter(immFilter, idx, fileId, true, null, true);
      }
    }, this).toJS();
  };

  ifReportHeightMoreThanFilterHeight(){
    const reports = $('.reports');
    const filters = $('.filters');
    return reports && filters && reports.height() > filters.height();
  }

  render() {
    var immExposureStore = this.props.immExposureStore;
    if (!immExposureStore.get('showFiltersPane')) {
      return null;
    }

    var fileId = this.props.fileId;
    // For a dashboard, when dashboardSchemaId is defined, it means all reports in the dashboard share the same schemaId.
    var singleSchemaId;
    var fileType = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'fileType']);
    switch (fileType) {
      // NOTE -As of right now, data review sets don't have any sort of filtering, but in order to prevent some
      // avoidable bug in the future if that is decided to be added later, just going to ensure to get the property
      // 'dashboardSchemaId', since it is ALSO used by Data Review Sets
      case ExposureAppConstants.FILE_TYPE_DATA_REVIEW:
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        singleSchemaId = immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file', 'dashboardSchemaId']);
        break;
      case ExposureAppConstants.FILE_TYPE_REPORT:
        singleSchemaId = Util.getComprehendSchemaIdFromFile(immExposureStore.getIn(['files', fileId, 'fileWrapper', 'file']));
        break;
    }

    var drilldownFilterContent = this.getDrilldownFilterContent();
    var includedStaticFilters = this.getIncludedStaticFilters();
    var includedDynamicFilters = this.getIncludedDynamicFilters();
    var resetAllIncludedFilters = !_.isArray(includedDynamicFilters) ? null :
        Button({
          classes: {'reset-all-button': true},
          children: FrontendConstants.RESET_ALL,
          isSecondary: true,
          onClick: ExposureActions.resetAllIncludedDynamicFilters.bind(null, fileId, this.props.drilldownId)});
    var applyIncludedFilters = !_.isArray(includedDynamicFilters) ? null :
        Button({
          classes: {'apply-filters-button': true},
          children: FrontendConstants.APPLY,
          isPrimary: true,
          onClick: ExposureActions.applyFilter.bind(null, fileId, this.props.drilldownId, 1)});

    const isFixed = Util.isDesktop() && this.ifReportHeightMoreThanFilterHeight() && this.state.panelFixed;
    const staticFilterContent = includedStaticFilters.length > 0 ? div({className: 'static-filters-container'}, includedStaticFilters) : null;
    const asterisk = this.asteriskNeeded() ? span({className: 'null-asterisk-footnote'}, FrontendConstants.EXCLUDE_NULL_VALUES_FOOTNOTE) : null;

    return div({className: 'filters', key: 'filters', ref: 'filterPane'},
      div({className: cx('filters-container', {fixed: isFixed}), ref: 'filterContainer'},
        div({className: 'section-title'},
          span({className: 'title-text'}, FrontendConstants.FILTERS,
            a({className: 'icon-question-circle', href: Util.formatHelpLink('KPI_FILTER'), target: '_blank'}),
          ),
          div({className: 'close-button', onClick: this.props.handleClose})
        ),
        drilldownFilterContent,
        div({className: 'panel included-filter'},
          div({className: 'panel-sub-header text-truncation block-underline'},
            span({className: 'panel-sub-header-title'}, FrontendConstants.INCLUDED),
            div({className: 'filter-buttons-wrapper'},
              resetAllIncludedFilters,
              applyIncludedFilters
            )),
          includedDynamicFilters,
          staticFilterContent
        ),
        div({className: 'block-underline'}, asterisk)
      )
    );
  }
}

module.exports = Filters;
