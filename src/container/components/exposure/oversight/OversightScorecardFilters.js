import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from 'classnames';

import FrontendConstants from '../../../constants/FrontendConstants';
import Util from "../../../util/util";
import ExposureStoreKey from "../../../stores/constants/ExposureStoreKeys";
import ContentPlaceholder from '../../ContentPlaceholder';
import ExposureAppConstants from "../../../constants/ExposureAppConstants";
import OversightScorecardActions from "../../../actions/OversightScorecardActions";
import OversightScorecardStore from "../../../stores/OversightScorecardStore";
import { RequestKey } from '../../../stores/constants/OversightStoreConstants';
import Menu from "../../../lib/react-menu/components/Menu";
import MenuOption from "../../../lib/react-menu/components/MenuOption";
import MenuOptions from "../../../lib/react-menu/components/MenuOptions";
import MenuTrigger from "../../../lib/react-menu/components/MenuTrigger";
import Checkbox from "../../Checkbox";
import Combobox from "../../Combobox";
import Button from "../../Button";
import FilterNumberRange from "../FilterNumberRange";
import OversightScorecardConstants from "../../../constants/OversightScorecardConstants";

class OversightScorecardFilters extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    immIncludedDynamicFilters: PropTypes.instanceOf(Imm.List),
    path: PropTypes.string,
    immSelectedStudyIds: PropTypes.instanceOf(Imm.List),
    immClientFiltersApplied: PropTypes.instanceOf(Imm.Map),
    selectedScorecardLevel: PropTypes.string.isRequired,
    handleClose: PropTypes.func.isRequired,
    handleClear: PropTypes.func.isRequired,
    filterHelpFile: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.resetAllFilters = this.resetAllFilters.bind(this);
    this.applyFilters = this.applyFilters.bind(this);

    this.state = {
      immClientFilters: props.immClientFiltersApplied,
    };

    this.immLabels = Imm.List([
      {
        value: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.GOOD.toLowerCase(),
        label: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.GOOD,
      },
      {
        value: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.MEDIUM.toLowerCase(),
        label: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.MEDIUM,
      },
      {
        value: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.BAD.toLowerCase(),
        label: OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.BAD,
      },
    ]);
  }

  _getStudyFilter() {
    let studyFilterContent;
    const { immSelectedStudyIds, immExposureStore } = this.props;
    const immStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map());
    const drillDownStudIds = immSelectedStudyIds && immSelectedStudyIds.toJS();
    const drillDownStudies = drillDownStudIds.map(id => ({value: id, label: immStudies.getIn([id, 'value'])}));

    if (!_.isEmpty(drillDownStudies)) {
      const staticFilters = drillDownStudies.map(study => {
        return <div key={study.value} className='static-filter'> {study.label}</div>;
      });
      studyFilterContent = (<div className='list-filters'>
        <div className='filterContent'>
          <span className='clear-drilldown-filters' onClick={this.props.handleClear}>{FrontendConstants.CLEAR}</span>
          <div className='static-filters-container'>
            <div className='static-filters'>
              {staticFilters}
            </div>
          </div>
        </div>
      </div>);
    }
    return studyFilterContent;
  }

  callFilterAction(func) {
    const {immExposureStore, selectedScorecardLevel} = this.props;
    const currentAccountId = immExposureStore.get(ExposureStoreKey.currentAccountId);
    func(selectedScorecardLevel, currentAccountId);
  }

  resetIncludedDynamicFilter(filterIndex) {
    this.callFilterAction(
      OversightScorecardActions.resetIncludedDynamicFilter.bind(this, filterIndex)
    );
  }

  toggleNullFilter(filterIndex) {
    this.callFilterAction(OversightScorecardActions.toggleNullFilter.bind(this, filterIndex));
  }

  setDropdownFilterSelection(filterIndex, items) {
    this.callFilterAction(
      OversightScorecardActions.setDropdownFilterSelection.bind(this, filterIndex, items)
    );
  }

  resetAllFilters() {
    this.callFilterAction(OversightScorecardActions.resetAllFilters.bind(this));
    this.resetClientFilters();
    OversightScorecardActions.applyClientFilters(Imm.Map());
  }

  applyFilters() {
    this.props.selectedScorecardLevel == "STUDY" ? OversightScorecardActions.applyStoreState({}) : null;
    this.callFilterAction(OversightScorecardActions.fetchScorecardData.bind(this));
    OversightScorecardActions.applyClientFilters(this.state.immClientFilters);
  }

  resetClientFilters() {
    const {immClientFilters} = this.state;
    const newImmClientFilters = immClientFilters.map(() => Imm.Map());
    this.setState({immClientFilters: newImmClientFilters});
  }

  resetClientFilter(filterKey) {
    this.setState({immClientFilters: this.state.immClientFilters.set(filterKey, Imm.Map())});
  }

  toggleNullClientFilter(filterKey) {
    const {immClientFilters} = this.state;
    const immFilter = immClientFilters.get(filterKey);
    const newImmClientFilters = immClientFilters.setIn(
      [filterKey, 'nullExcluded'], !immFilter.get('nullExcluded')
    );
    this.setState({immClientFilters: newImmClientFilters});
  }

  setClientRangeFilter(filterKey, range) {
    const {immClientFilters} = this.state;
    let newImmClientFilters = immClientFilters.setIn([filterKey, 'from'], range[0]);
    newImmClientFilters = newImmClientFilters.setIn([filterKey, 'to'], range[1]);
    this.setState({immClientFilters: newImmClientFilters});
  }

  setClientDropdownFilter(filterKey, values) {
    const {immClientFilters} = this.state;
    const selectedItems = Imm.fromJS(values).map(
      value => this.immLabels.find(item => item.value === value)
    );
    const newImmClientFilters = immClientFilters.setIn([filterKey, 'selectedItems'], selectedItems);
    this.setState({immClientFilters: newImmClientFilters});
  }

  getDynamicFilterTitle = (immFilter, filterIndex) => {
    const propertyDisplayString = immFilter.getIn(['column', 'displayString']);
    const nullExcluded = immFilter.get('nullExcluded', false);

    let resetMenuOption = null;
    let includeNullsMenuOption = null;
    if (immFilter.get('valid')) {
      resetMenuOption = (<MenuOption
        className={cx('filter-menu-option', 'react-menu-icon', 'icon-undo', 'last-item')}
        onSelect={this.resetIncludedDynamicFilter.bind(this, filterIndex)}
      >
        <div className="react-menu-icon">{FrontendConstants.RESET}</div>
      </MenuOption>);
      includeNullsMenuOption = (<MenuOption
        className="include-nulls"
        onSelect={this.toggleNullFilter.bind(this, filterIndex)}
      >
        <div className="virtual-table">
          <div className="virtual-table-row">
            <div className="virtual-table-cell">
              <Checkbox checkedState={nullExcluded} onClick={() => {}}/>
            </div>
            <div className="virtual-table-cell">
              <span className="include-nulls-text">{FrontendConstants.EXCLUDE_NULL_VALUES}</span>
            </div>
          </div>
        </div>
      </MenuOption>);
    }

    const menu = (<Menu className="filter-menu" horizontalPlacement="left">
      <MenuTrigger className="filter-menu-trigger icon-accordion-down"/>
      <MenuOptions className="filter-menu-options">
        {resetMenuOption}
        <hr/>
        {includeNullsMenuOption}
      </MenuOptions>
    </Menu>);

    return (<div className="filter-title">
      <span className={cx('filter-title-text', {'null-excluded': nullExcluded})}>
        {propertyDisplayString}
      </span>
      {menu}
    </div>);
  };

  getDropdownFilter = (immFilter, filterIndex) => {
    const propertyId = immFilter.getIn(['column', 'propertyId']);
    const dataType = immFilter.getIn(['column', 'dataType']);
    const immDropdownData = immFilter.get('data', Imm.List());
    const immDropdownItems = immDropdownData.map(value => {
      const label = Util.valueFormatter(value, dataType);
      return {value: label, label: label};
    });
    const dropdownDisabled = immDropdownItems.size < 2 || !immFilter.get('valid');
    const filterRequest = OversightScorecardStore.getOutstandingRequest(RequestKey.fetchScorecardFilterData);

    let iconSpinnerContent = null;
    if (filterRequest)  {
      iconSpinnerContent = (<div className='icon-spinner'/>);
    }

    let value = null;
    if (dropdownDisabled) {
      if (!immDropdownItems.isEmpty()) {
        value = immDropdownItems.first();
      }
    } else {
      value = immFilter.get('itemsSelected', Imm.List())
        .map(value => ({value: value, label: value}));
    }

    return (<div key={propertyId + '-' + filterIndex}
                 className="filter-block dynamic-filter dropdown-filter-block">
      {this.getDynamicFilterTitle(immFilter, filterIndex)}
      <div className="filter-element">
        <Combobox className={cx('filter-dropdown', {'arrow-hidden': !!filterRequest})}
                  abbreviationThreshold={8}
                  disabled={dropdownDisabled}
                  multi={!dropdownDisabled}
                  clearable={false}
                  placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
                  value={value}
                  onChange={this.setDropdownFilterSelection.bind(this, filterIndex)}
                  options={immDropdownItems.toOrderedSet()}
        />
        {iconSpinnerContent}
      </div>
    </div>);
  };

  getIncludedDynamicFilters = () => {
    const {immIncludedDynamicFilters} = this.props;
    return immIncludedDynamicFilters.map((immFilter, idx) => {
      switch (immFilter.get('filterType')) {
        case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
          return this.getDropdownFilter(immFilter, idx);
        case ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER:
          //Slider haven't been used yet in the oversight filters
          return null;
      }
    }, this).toJS();
  };

  getClientFilter = (filterKey, filterOptions) => {
    const {immClientFilters} = this.state;
    const immFilter = immClientFilters.get(filterKey, Imm.Map());
    let filterInputContent = null;
    const classname = filterOptions.classname ? filterOptions.classname : 'dropdown-filter-block';
    switch (filterOptions.type) {
      case ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN:
        filterInputContent = (<Combobox
          abbreviationThreshold={2}
          className={'filter-dropdown'}
          multi={true}
          clearable={true}
          placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
          value={immFilter.get('selectedItems', Imm.List())}
          onChange={(values) => this.setClientDropdownFilter(filterKey, values)}
          options={filterOptions.options}
        />);
        break;
      case ExposureAppConstants.APPLIED_FILTER_TYPE_RANGE: {
        const range = [
          immFilter.get('from', filterOptions.bottom),
          immFilter.get('to', filterOptions.top),
        ];
        filterInputContent = (
          <FilterNumberRange top={filterOptions.top} bottom={filterOptions.bottom}
                             range={range}
                             onChange={(range) => this.setClientRangeFilter(filterKey, range)}/>
        );
        break;
      }
    }

    const nullExcluded = immFilter.get('nullExcluded', false);
    return (
      <div key={"client_" + filterKey}
           className={cx('filter-block dynamic-filter', classname)}>
        <div className="filter-title">
          <span className={cx('filter-title-text', {'null-excluded': nullExcluded})}>
            {filterOptions.title}
          </span>
          <Menu className="filter-menu" horizontalPlacement="left">
            <MenuTrigger className="filter-menu-trigger icon-accordion-down"/>
            <MenuOptions className="filter-menu-options">
              <MenuOption
                className={cx('filter-menu-option', 'react-menu-icon', 'icon-undo', 'last-item')}
                onSelect={this.resetClientFilter.bind(this, filterKey)}
              >
                <div className="react-menu-icon">{FrontendConstants.RESET}</div>
              </MenuOption>
              <hr/>
              <MenuOption
                className="include-nulls"
                onSelect={this.toggleNullClientFilter.bind(this, filterKey)}
              >
                <div className="virtual-table">
                  <div className="virtual-table-row">
                    <div className="virtual-table-cell">
                      <Checkbox checkedState={nullExcluded} onClick={() => {}}/>
                    </div>
                    <div className="virtual-table-cell">
                      <span className="include-nulls-text">{FrontendConstants.EXCLUDE_NULL_VALUES}</span>
                    </div>
                  </div>
                </div>
              </MenuOption>
            </MenuOptions>
          </Menu>
        </div>
        <div className="filter-element">
          {filterInputContent}
        </div>
      </div>
    );
  };

  getClientDynamicFilters = () => {
    const entityScoreFilter = this.getClientFilter('entityScore',
      {
        type: ExposureAppConstants.APPLIED_FILTER_TYPE_RANGE,
        title: FrontendConstants.ENTITY_SCORE,
        top: 10,
        bottom: 0,
        classname: 'range-filter-block'
      }
    );
    const labelFilter = this.getClientFilter('label', {
      type: ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN,
      title: FrontendConstants.OVERSIGHT_SCORE_CATEGORY,
      options: this.immLabels,
    });
    return [ entityScoreFilter, labelFilter ];
  };

  _getFilters() {
    const {selectedScorecardLevel, immExposureStore, filterHelpFile, handleClose} = this.props;
    const studyFilter = this._getStudyFilter();
    const currentAccountId = immExposureStore.get(ExposureStoreKey.currentAccountId);
    return (<div className='oversight-filters filters'>
      <div className='section-title'>
        <span className='title-text'>
          {FrontendConstants.FILTERS}
          <a className='icon-question-circle'
             href={Util.formatHelpLink(filterHelpFile)}
             target='_blank'></a>
        </span>
        <div className='close-button' onClick={handleClose}></div>
      </div>
      <div className='panel included-filter'>
      {studyFilter}
        <div className="panel-sub-header text-truncation block-underline">
          <span className="panel-sub-header-title">{FrontendConstants.INCLUDED}</span>
          <div className="filter-buttons-wrapper">
            <Button classes={{'reset-all-button': true}}
                    children={FrontendConstants.RESET_ALL}
                    isSecondary={true}
                    onClick={this.resetAllFilters}
            />
            <Button classes={{'apply-filters-button': true}}
                    children={FrontendConstants.APPLY}
                    isPrimary={true}
                    onClick={this.applyFilters}
            />
          </div>
        </div>
        {this.getIncludedDynamicFilters()}
        {this.getClientDynamicFilters()}
      </div>
    </div>);
  }

  _isReady() {
    const {immExposureStore} = this.props;
    const hasStudies = immExposureStore.get(ExposureStoreKey.studies, Imm.Map()).size > 0;
    return hasStudies;
  }

  render() {
    let content;
    if (!this._isReady()) {
      content = <ContentPlaceholder />;
    } else {
      const listFilters = this._getFilters();
      content = (
        <div className='oversight-scorecard-filters'>
          <div className='sub-tab-header'>
            {listFilters}
          </div>
        </div>
      );
    }
    return content;
  }
}

export default OversightScorecardFilters;
