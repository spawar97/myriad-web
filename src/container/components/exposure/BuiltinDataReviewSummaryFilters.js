import React, {useState, useEffect} from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import Button from "../Button";
import Spinner from "../Spinner";
import FrontendConstants from "../../constants/FrontendConstants";
import DataTypeConstants from "../../constants/DataTypeConstants";
import Util from "../../util/util";
import ExposureActions from "../../actions/ExposureActions";
import _ from "underscore";
import DateRange from "../DateRange";
import Combobox from "../Combobox";
import DataReviewUtil from "../../util/DataReviewUtil"

/**
 * View for the filters pane of the data review set.
 */
function BuiltinDataReviewSummaryFilters (props) {
  const classifier = (s) => s.toLowerCase().replace(/ /, '-');

  // our default values for the filters
  function initialSelectionFilterOptions(selectedFilterOptions) {
    const field = 'Dates';
    const dataType = DataTypeConstants.DATE;
    selectedFilterOptions = selectedFilterOptions.set('Dates', Imm.fromJS([
      {field, dataType, type: 'GREATER_THAN', value:  Util.valueParser(NaN, dataType)},
      {field, dataType, type: 'LESS_THAN', value: Util.valueParser(Date.now(), dataType)}
    ]));

    setImmSelectedFilterOptions(selectedFilterOptions);
    return selectedFilterOptions;
  }

  function handleDateRange(field, dataType, type, min, max, immSelectedFilterOptions, selections) {
    const newFilters = DataReviewUtil.handleDateRange(field, dataType, type, min, max, immSelectedFilterOptions, selections)
    setImmSelectedFilterOptions(newFilters);
  }

  function getDataReviewSummaryFilterOptions(props) {
    if (!immExposureStore.getIn(['DataReviewFilterOptions', 'data']) || immExposureStore.getIn(['DataReviewFilterOptions', 'data']).isEmpty()) {
      ExposureActions.fetchDataReviewSummaryFilterOptions();
    }
  }

  function resetAllFilters() {
    const selectedFilterOptions = initialSelectionFilterOptions(Imm.Map());
    setImmSelectedFilterOptions(selectedFilterOptions);
  }

  function isReady() {
    const {immExposureStore} = props;
    // This component is only ready once we have data for the data review filters and there's no filter requests in flight
    return immExposureStore.getIn(['DataReviewFilterOptions', 'data'])
  }

  function handleFilterSelection(field, dataType, type, immFilterData, immSelectedFilterOptions, selections) {
    const newFilters = DataReviewUtil.handleFilterSelection(field, dataType, type, immFilterData, immSelectedFilterOptions, selections);
    setImmSelectedFilterOptions(newFilters);
  }

  // on mount get the filter options
  useEffect(() => {
    getDataReviewSummaryFilterOptions(props)
  }, [])

  //////////////////////////////////////////////START OF RENDER CODE//////////////////////////////////////////////////
  const {immExposureStore, handleClose, applyFilters, hasMinimumRequiredFilters} = props;

  //state variables
  const [immSelectedFilterOptions, setImmSelectedFilterOptions] = useState(Imm.Map());

  let ready = isReady();
  const fields = ['Study', 'Sites', 'Subjects', 'Dates'];
  // filter options grabbed from ExposureStore.fetchDataReviewSummaryFilterOptions()
  const immFilterData = immExposureStore.getIn(['DataReviewFilterOptions', 'data'], Imm.Map());

  const studyFilterData = immFilterData.keySeq().map(study => {
    return {displayName: study, value: study}
  }).toArray();

  const selectedStudy = immSelectedFilterOptions.getIn(['Study', 'value'], '');

  let subjectFilterData = [];
  let siteFilterData = [];

  if (!!selectedStudy && !immFilterData.isEmpty()) {
    siteFilterData = immFilterData.get(selectedStudy).keySeq().map(site => {
      return {displayName: site, value: site}
    }).toArray();
  }

  const selectedSites = immSelectedFilterOptions.get('Sites', '');

  if (!!selectedSites && !immFilterData.isEmpty()) {
    subjectFilterData = selectedSites.flatMap(site => {
      return immFilterData.getIn([selectedStudy, site.get('value')]).map(subject => {
        return {displayName: subject, value: subject}
      }).toArray();
    }).toArray();
  }

  const filterOptions = {
    Study: {
      name: 'Study',
      displayName: FrontendConstants.STUDY_ID + " *",
      dataType: DataTypeConstants.STRING,
      filterOptions: studyFilterData,
    },
    Sites: {
      name: 'Sites',
      displayName: FrontendConstants.SITE,
      dataType: DataTypeConstants.String,
      filterOptions: siteFilterData,
      multi: true
    },
    Subjects: {
      name: 'Subjects',
      displayName: 'Subject Identifier',
      dataType: DataTypeConstants.STRING,
      filterOptions: _.uniq(subjectFilterData, 'value'),
      multi: true
    },
    Dates: {
      name: 'Dates',
      displayName: 'Data Update Range *',
      dataType: DataTypeConstants.DATE
    }
  };

  let dropdowns = _.map(fields, (field) => {
    const filter = filterOptions[field];
    const filterName = filter.displayName;
    const isMulti = !!filter.multi;
    const dataType = filter.dataType;
    const key = 'filter-' + filterName

    if (dataType === DataTypeConstants.DATE) {
      // Date range filter
      const minLowerBound = Util.valueParser(0, dataType); // Minimum date is epoch 0
      const maxUpperBound = Util.valueParser(Date.now(), dataType); // Max date is today - DateRange wants millis

      const lowerBound = Util.valueParser(immSelectedFilterOptions.getIn([field, 0, 'value'], null), dataType);
      const upperBound = Util.valueParser(immSelectedFilterOptions.getIn([field, 1, 'value'], Date.now()), dataType);

      return [
        <div className='filter' key = {key}>
          <div className='filter-title'>{filterName}</div>
        {
          ready
          ? (
            <DateRange
              minLowerBound={minLowerBound}
              maxUpperBound={maxUpperBound}
              lowerBound={lowerBound}
              upperBound={upperBound}
              onRangeUpdate={(e) => handleDateRange(field, dataType, 'RANGE', minLowerBound, maxUpperBound, immSelectedFilterOptions, e)}
              skipLowInitialDate={!lowerBound}
              skipUpInitialDate={!upperBound}/>
            )
            : ''
        }

      </div>
    ];
    } else {
      const immFilterOptions = Imm.fromJS(filter.filterOptions);
      const selectedValue = immSelectedFilterOptions.get(field, Imm.List()).get('value', "");
      let selectedValues = immSelectedFilterOptions.get(field, Imm.List());
      let value = isMulti ? selectedValues : selectedValue;

      return [
        <div className='filter' key = {key}>
          <div className='filter-title'>{filterName}</div>
          <Combobox
            className={`builtin-filter-${classifier(field)}`}
            clearable={true}
            multi={isMulti}
            onChange={(e) => handleFilterSelection(field, dataType, 'EQUALS', immFilterData, immSelectedFilterOptions, e)}
            labelKey='displayName'
            value={value}
            options={immFilterOptions}
            passOnlyValueToChangeHandler={false}/>
        </div>
    ];
    }
  });

  return (
    <div className={ready ? 'data-review-filters' : 'data-review-filters-disabled'}>
      <div className='sub-tab-header'>
        {FrontendConstants.FILTERS}
        <a className= 'icon-question-circle' href={Util.formatHelpLink('KPI_FILTER')} target= '_blank'></a>
        <div className='close-button' onClick={handleClose}/>
      </div>
      <div className='panel included-filter'>
        <div className='panel-sub-header text-truncation block-underline'>
        <span className='panel-sub-header-title'>{FrontendConstants.INCLUDED}</span>
        <div className='filter-buttons-wrapper'>
          <Button
            classes={{ 'reset-all-button': true }}
            onClick={(e) => resetAllFilters()}
            children={FrontendConstants.RESET_ALL}
            isSecondary={true}>
          </Button>
          <Button
            classes={{ 'apply-filters-button': true }}
            onClick={(e) => applyFilters(immSelectedFilterOptions)}
            children={FrontendConstants.APPLY}
            isDisabled={!hasMinimumRequiredFilters(immSelectedFilterOptions)}
            isPrimary={true}>
          </Button>
        </div>
    </div>
    <div className='filter-block'>
      {dropdowns}
    </div>
  </div>
  {!ready ? <Spinner /> : ''}
</div>
);
}

BuiltinDataReviewSummaryFilters.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  handleClose: PropTypes.func,
  applyFilters: PropTypes.func,
  hasMinimumRequiredFilters: PropTypes.func,
};

export default BuiltinDataReviewSummaryFilters;
