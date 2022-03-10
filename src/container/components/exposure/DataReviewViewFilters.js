import React from 'react';
import Imm from 'immutable';
import _ from 'underscore';
import PropTypes from 'prop-types';
import Combobox from '../Combobox';
import DateRange from '../DateRange';
import Spinner from '../Spinner';
import DataTypeConstants from '../../constants/DataTypeConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import Button from '../Button';
import Util from '../../util/util';
import ExposureActions from '../../actions/ExposureActions';
import shallowCompare from 'react-addons-shallow-compare';
import Key from "../../stores/constants/ExposureStoreKeys";
import DataReviewActions from "../../actions/DataReviewActions";
import DataReviewUtil from "../../util/DataReviewUtil"

const classifier = (s) => s.toLowerCase().replace(/ /, '-');
/**
 * View for the filters pane of the data review set.
 */
class DataReviewViewFilters extends React.Component {

  static displayName = 'DataReviewViewFilters';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immDataReviewStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immDataReview: PropTypes.instanceOf(Imm.Map).isRequired,
    handleClose: PropTypes.func.isRequired,
    immSelectedFilterOptions: PropTypes.instanceOf(Imm.Map).isRequired,
    displayFilters: PropTypes.bool,
    setTaskFilters: PropTypes.func.isRequired,
    applyTaskFilters: PropTypes.func.isRequired
  };

  static defaultProps = {
    displayFilters: true,
    immSelectedFilterOptions: {}
  };

  constructor(props) {
    super(props);
    this.state = {
      immSelectedFilterOptions: props.immSelectedFilterOptions,
      isLoadedTaskFilters: false
    };
  }

  componentWillMount() {
    this.getDataReviewFilterOptions(this.props);
    this.setDataFilterSelection(this.props.immDataReview.get('id'), this.state.immSelectedFilterOptions);
    this.initialSelectionFilterOptions(this.state.immSelectedFilterOptions);
  }

  componentWillReceiveProps(nextProps) {
    if (this.havePropsChanged(this.props, nextProps)) {
      let fileId = nextProps.immDataReview.get('id');
      let immDataTaskFilters = nextProps.immExposureStore.getIn(['files', fileId, 'immDataTaskFilters']);

      if (!this.state.isLoadedTaskFilters && immDataTaskFilters && typeof immDataTaskFilters === 'string') {
        const immSelectedFilterOptions = this.props.setTaskFilters(JSON.parse(immMedTaskFilters));
        this.setState({
          immSelectedFilterOptions,
          isLoadedTaskFilters: !!immMedTaskFilters
        });
      }
      this.getDataReviewFilterOptions(nextProps);
      this.setDataFilterSelection(fileId, nextProps.immSelectedFilterOptions);
    }
  }

  havePropsChanged(oldProps, newProps) {
    if (oldProps.displayFilters !== newProps.displayFilters) {
      return true;
    }
    if (!Imm.is(oldProps.immSelectedFilterOptions, newProps.immSelectedFilterOptions)) {
      return true;
    }
    if (!Imm.is(oldProps.immDataReview, newProps.immDataReview)) {
      return true;
    }
    // check immExposureStore's fields
    let fileId = newProps.immDataReview.get('id');
    if (!Imm.is(oldProps.immExposureStore.getIn(['files', fileId, 'immDataTaskFilters']),
      newProps.immExposureStore.getIn(['files', fileId, 'immDataTaskFilters']))) {
      return true;
    }
    if (!Imm.is(oldProps.immExposureStore.get('dataReviewFilterRequestInFlight'),
      newProps.immExposureStore.get('dataReviewFilterRequestInFlight'))) {
      return true;
    }
    if (!Imm.is(oldProps.immExposureStore.getIn(['DataReviewFilterOptions', 'data']),
      newProps.immExposureStore.getIn(['DataReviewFilterOptions', 'data']))) {
      return true;
    }
    return false;
  }

  componentWillUnmount() {
    ExposureActions.clearDataFilterSelection(this.props.immDataReview.get('id'));
    ExposureActions.clearDataReviewFilterOptions();
    ExposureActions.clearDataReviewFilterRequestInFlight();
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  initialSelectionFilterOptions(immSelectedFilterOptions) {
    const field = 'Dates';
    const dataType = DataTypeConstants.DATE;
    immSelectedFilterOptions = immSelectedFilterOptions.set('Dates', Imm.fromJS([
      {field, dataType, type: 'GREATER_THAN', value:  Util.valueParser(NaN, dataType)},
      {field, dataType, type: 'LESS_THAN', value: Util.valueParser(Date.now(), dataType)}
    ]));
    this.setState({
      immSelectedFilterOptions: immSelectedFilterOptions
    });
    return immSelectedFilterOptions;
  }

  getDataReviewFilterOptions(props) {
    if (!props.immExposureStore.getIn(['DataReviewFilterOptions', 'data'])
      && props.immExposureStore.get('dataReviewFilterRequestInFlight', false) === false
      && props.immDataReview.get('id')) {
      ExposureActions.fetchDataReviewFilterOptions(props.immDataReview.get('id'));
    }
  }

  setDataFilterSelection(fileId, immSelectedFilterOptions) {
    ExposureActions.setDataFilterSelection(fileId, immSelectedFilterOptions);
  }

  resetAllFilters(applyTaskFilters, setTaskFilters, dataTaskFilters) {
    let immSelectedFilterOptions = setTaskFilters(dataTaskFilters);
    if (dataTaskFilters && !dataTaskFilters.Dates) {
      immSelectedFilterOptions = this.initialSelectionFilterOptions(immSelectedFilterOptions);
    }
    this.setState({
      immSelectedFilterOptions: immSelectedFilterOptions
    });

    applyTaskFilters(immSelectedFilterOptions);
  }

  applyFilters(applyTaskFilters, immSelectedFilterOptions) {
    applyTaskFilters(immSelectedFilterOptions)
  }

  handleFilterSelection(field, dataType, type, immFilterData, immSelectedFilterOptions, selections) {
    let newFilters = DataReviewUtil.handleFilterSelection(field, dataType, type, immFilterData, immSelectedFilterOptions, selections);

    this.setState({
      immSelectedFilterOptions: newFilters || immSelectedFilterOptions
    });
    return true;
  }

  /**
   * Wraps around the filter handler, if the selections match the bounds, just clear them so that we don't send any
   * filter requests to the server. We need to do this here, so we don't need to teach the parent component about min
   * and max bounds.
   * It uses the valueFormatter, because we want to reset the filter for dates if we're in the same date, rather than
   * try to hit the exact epoch.
   * @param field
   * @param dataType
   * @param type
   * @param min
   * @param max
   * @param selections
   */
  handleDateRange(field, dataType, type, min, max, immSelectedFilterOptions, selections) {
    const newFilters = DataReviewUtil.handleDateRange(field, dataType, type, min, max, immSelectedFilterOptions, selections);

    this.setState({
      immSelectedFilterOptions: newFilters || immSelectedFilterOptions
    });
    return true;
  }

  isReady() {
    const {immExposureStore} = this.props;
    // This component is only ready once we have data for the data review filters and there's no filter requests in flight
    return immExposureStore.getIn(['DataReviewFilterOptions', 'data']) &&
      !immExposureStore.get('dataReviewFilterRequestInFlight');
  }

  getReviewRolesFilterData(immDataReview) {
    const immReviewSetReviewRoles = immDataReview.getIn(['advancedFileAttributes', Key.dataReviewRoles], Imm.List());
    const immUserReviewRoles = this.props.immDataReviewStore.get('dataReviewRolesAvailableToUser');

    const reviewRoleFilterData = [];
    const userReviewRoleIds = immUserReviewRoles.map(role => {return role.get('id')})
    immReviewSetReviewRoles.forEach(role => {
      // we only show the review roles that both the review set and user have access to
      if (userReviewRoleIds.contains(role.get('id'))) {
        reviewRoleFilterData.push({displayName: role.get('name'), value: role.get('id')})
      }
    });

    return reviewRoleFilterData;
  }

  render() {
    let isReady = this.isReady();
    const fields = ['Study', 'Sites', 'Subjects', 'Dates', 'ReviewRoles', 'IncludedRecords'];
    const { immExposureStore, immDataReview } = this.props;
    const { immSelectedFilterOptions } = this.state;

    const immFilterData = immExposureStore.getIn(['DataReviewFilterOptions', 'data'], Imm.Map());
    const fileId = immDataReview.get('id');
    let immDataTaskFilters = immExposureStore.getIn(['files', fileId, 'immDataTaskFilters'], '{}');
    let dataTaskFilters = JSON.parse(immDataTaskFilters);
    let studyDisabled = !!dataTaskFilters.Study;
    let subjectsDisabled = !!dataTaskFilters.Subjects;
    let fromDateDisabled = !!dataTaskFilters.Dates &&
      ((dataTaskFilters.Dates[0].type === 'GREATER_THAN') ||
        (dataTaskFilters.Dates[1].type === 'GREATER_THAN' && dataTaskFilters.Dates[1].value !== 'NaN'));
    let toDateDisabled = !!dataTaskFilters.Dates &&
      ((dataTaskFilters.Dates[0].type === 'LESS_THAN') ||
        (dataTaskFilters.Dates[1].type === 'LESS_THAN' && dataTaskFilters.Dates[1].value !== 'NaN'));

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

    if (!immFilterData.isEmpty()) {
      if (!selectedSites) {
        subjectFilterData = immFilterData.get(selectedStudy, Imm.Map())
          .flatten(true)
          .toList()
          .map(subject => ({displayName: subject, value: subject}))
          .toArray();
      }
      else {
        subjectFilterData = selectedSites.flatMap(site => {
          return immFilterData.getIn([selectedStudy, site.get('value')]).map(subject => {
            return {displayName: subject, value: subject}
          }).toArray();
        }).toArray();

      }
    }

    const reviewRolesFilterData = this.getReviewRolesFilterData(immDataReview);
    const reviewRole = immSelectedFilterOptions.getIn(['ReviewRoles', 'displayName'], NaN);
    let includedRecords = [];

    includedRecords.push({displayName: 'All Records', value: 'ALL_RECORDS'});
    includedRecords.push({displayName: 'Unreviewed by Me', value: 'UNREVIEWED_BY_ME'});

    if (!_.isNaN(reviewRole)) {
      includedRecords.push({displayName: 'Unreviewed by ' + reviewRole, value: 'UNREVIEWED_BY'});
    }

    const filterOptions = {
      Study: {
        name: 'Study',
        displayName: FrontendConstants.STUDY_ID + " *",
        dataType: DataTypeConstants.STRING,
        filterOptions: studyFilterData
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
      },
      ReviewRoles: {
        name: 'ReviewRoles',
        displayName: 'Review Role *',
        dataType: DataTypeConstants.STRING,
        filterOptions: reviewRolesFilterData
      },
      IncludedRecords: {
        name: 'IncludedRecords',
        displayName: 'Included Records *',
        dataType: DataTypeConstants.STRING,
        filterOptions: includedRecords.sort()
      }
    };

    let dropdowns = _.map(fields, (field) => {
      const filter = filterOptions[field];
      const filterName = filter.displayName;
      const isMulti = !!filter.multi;
      const dataType = filter.dataType;

      if (dataType === DataTypeConstants.DATE) {
        // Date range filter
        const minLowerBound = Util.valueParser(0, dataType); // Minimum date is epoch 0
        const maxUpperBound = Util.valueParser(Date.now(), dataType); // Max date is today - DateRange wants millis

        const lowerBound = Util.valueParser(immSelectedFilterOptions.getIn([field, 0, 'value'], NaN), dataType);
        const upperBound = Util.valueParser(immSelectedFilterOptions.getIn([field, 1, 'value'], Date.now()), dataType);

        return [
          <div className='filter'>
            <div className='filter-title'>{filterName}</div>
            { // So yeah this component doesn't work right in IE10 if it's rendered first as disabled, it will try to validate regardless
              // of whether it is disabled. Just gonna not load the DateRange filter until we've completed the AJAX for the studycro info
              // to avoid the bug detailed in TP #23382
              // TODO - figure out how to re-enable this on load to make it look a little nicer
              isReady
                ? (
                  <DateRange
                    minLowerBound={minLowerBound}
                    maxUpperBound={maxUpperBound}
                    lowerBound={lowerBound}
                    upperBound={upperBound}
                    onRangeUpdate={this.handleDateRange.bind(this, field, dataType, 'RANGE', minLowerBound, maxUpperBound, this.state.immSelectedFilterOptions)}
                    skipLowInitialDate={!lowerBound}
                    skipUpInitialDate={!upperBound}
                    lowDisabled={fromDateDisabled}
                    upDisabled={toDateDisabled}
/*
                    lowerPlaceHolder={FrontendConstants.DATA_REVIEW_FROM_DATE}
                    lowerIsNotRequired={true}
*/
                  />
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
          <div className='filter'>
            <div className='filter-title'>{filterName}</div>
            <Combobox
              className={`builtin-filter-${classifier(field)}`}
              clearable={true}
              multi={isMulti}
              onChange={this.handleFilterSelection.bind(this, field, dataType, 'EQUALS', immFilterData, this.state.immSelectedFilterOptions)}
              labelKey='displayName'
              value={value}
              options={immFilterOptions}
              passOnlyValueToChangeHandler={false}
              disabled={field === 'Study' ? studyDisabled : subjectsDisabled}
            />
          </div>
        ];
      }
    }, this);

    return (
      <div className={isReady ? 'data-review-filters' : 'data-review-filters-disabled'}>
        <div className='sub-tab-header'>
          {FrontendConstants.FILTERS}
          <a className= 'icon-question-circle' href={Util.formatHelpLink('KPI_FILTER')} target= '_blank'></a>
          <div className='close-button' onClick={this.props.handleClose}/>
        </div>
        <div className='panel included-filter'>
          <div className='panel-sub-header text-truncation block-underline'>
            <span className='panel-sub-header-title'>{FrontendConstants.INCLUDED}</span>
            <div className='filter-buttons-wrapper'>
              <Button
                classes={{ 'reset-all-button': true }}
                onClick={this.resetAllFilters.bind(this, this.props.applyTaskFilters, this.props.setTaskFilters, dataTaskFilters)}
                children={FrontendConstants.RESET_ALL}
                isSecondary={true}>
              </Button>
              <Button
                classes={{ 'apply-filters-button': true }}
                onClick={this.applyFilters.bind(this, this.props.applyTaskFilters, immSelectedFilterOptions)}
                children={FrontendConstants.APPLY}
                isDisabled={!this.props.hasMinimumRequiredFilters(immSelectedFilterOptions)}
                isPrimary={true}>
              </Button>
            </div>
          </div>
          <div className='filter-block'>
            {dropdowns}
          </div>
        </div>
        {!isReady && this.props.displayFilters ? <Spinner /> : ''}
      </div>
    );
  }
}

export default DataReviewViewFilters;
