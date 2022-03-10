import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from 'classnames';
import FrontendConstants from '../../../constants/FrontendConstants';
import Util from "../../../util/util";
import ExposureStoreKey from "../../../stores/constants/ExposureStoreKeys";
import ContentPlaceholder from '../../ContentPlaceholder';
import Combobox from "../../Combobox";
import Button from "../../Button";
import RactScorecardStore from "../../../stores/RactScorecardStore";

class RactFilters extends React.PureComponent {
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    handleClose: PropTypes.func,
    handleClear: PropTypes.func,
    handleStudyChange: PropTypes.func,
    filterHelpFile: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.resetAllFilters = this.resetAllFilters.bind(this);
    this.applyFilters = this.applyFilters.bind(this);
    const selectedStudiesArray = this.props.selectedStudies.map(selectedStudy => this._getStudyList().filter(masterStudy => masterStudy.value == selectedStudy)).map(study => study[0]);
    this.state = {
      immClientFilters: props.immClientFiltersApplied,
      selectedStudies: selectedStudiesArray,
      oobSelectedStudiesId: [],
      customSelectedStudiesId: [],
    };
  }

  resetAllFilters() {
    this.setState({
      selectedStudies: [],
    });
  }

  applyFilters() {
    const {selectedStudies} = this.state;
    const selectedStudiesValues = selectedStudies.map(study => study.value);
    this.props.handleStudyChange(selectedStudiesValues);
  }

  _getStudyList() {
    const immRactStore = RactScorecardStore.getStore();
    const ractStudies = immRactStore.get(FrontendConstants.RACT_STUDY_FILTER_ARRAY).map((studyName, studyID) => {
      return {
        "label": studyName,
        "value": studyID,
      };
    });
    return ractStudies.toArray();
  }

  changeStudy(study) {
    this.setState({
      selectedStudies: study,
    });
  }

  _clearStudy(e) {
    e.stopPropagation();
    this.changeStudy([]);
  }

  _getFilters() {
    const {filterHelpFile, handleClose} = this.props;
    const immAllStudies = this._getStudyList();
    const immSelectedStudies = this.state.selectedStudies.length > 0 ? Imm.fromJS(this.state.selectedStudies) : Imm.List();

    const selectorProps = {
      abbreviationThreshold: 4,
      className: cx('ract-scorecard-dropdown-stduies', 'filter-dropdown'),
      multi: true,
      clearable: true,
      placeholder: '',
      value: immSelectedStudies,
      onChange: (selectedStudy) => {
        this.changeStudy(selectedStudy);
      },
      options: Imm.fromJS(immAllStudies),
      passOnlyValueToChangeHandler: false,
      clearRenderer: (e) => {
        return <span id='clearAll' className='icon-close-alt'
                     onMouseDown={(e) => this._clearStudy(e)}/>;
      },
    };

    return (<div className='oversight-filters filters ract-study-filter'>
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
        <div className={cx('studyFilter', 'filter-block', 'dropdown-filter-block')}>
          <div className={"filter-title"}>
            <span className={cx('filter-title-text')}>
              {'Studies'}
            </span>
          </div>
          <div className="filter-element">
            <Combobox {...selectorProps}/>
          </div>
        </div>
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
      content = <ContentPlaceholder/>;
    } else {
      const listFilters = this._getFilters();
      content = (
        <div className='ract-scorecard-filters'>
          <div className='sub-tab-header'>
            {listFilters}
          </div>
        </div>
      );
    }
    return content;
  }
}

export default RactFilters;
