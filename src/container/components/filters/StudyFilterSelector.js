import React from 'react';
import PropTypes from "prop-types";
import Imm from "immutable";
import cx from 'classnames';
import FrontendConstants from "../../constants/FrontendConstants";
import Combobox from '../Combobox';
import Checkbox from "../Checkbox";
import InputWithPlaceholder from "../InputWithPlaceholder";
import MasterStudyFilterUtil from "../../util/MasterStudyFilterUtil";

class StudyFilterSelector extends React.PureComponent {

  static propTypes = {
    immStudies: PropTypes.oneOfType([
      PropTypes.instanceOf(Imm.OrderedSet),
      PropTypes.instanceOf(Imm.List)
    ]).isRequired,
    immSelectedNames: PropTypes.oneOfType([
      PropTypes.instanceOf(Imm.OrderedSet),
      PropTypes.instanceOf(Imm.List)
    ]).isRequired,
    onChange: PropTypes.func.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  };

  constructor(props) {
    super(props);
    const immSelectedStudies = this._getImmSelectedStudies(props);
    const immSelectedArchived = immSelectedStudies.filter(study => study.isArchived);
    const isAllActiveSelected = MasterStudyFilterUtil.isAllActiveSelected(immSelectedStudies, props.immStudies);
    const isAllArchivedSelected = MasterStudyFilterUtil.isAllArchivedSelected(immSelectedStudies, props.immStudies);
    this.state = {
      immSelectedStudies: this._getImmSelectedStudies(props),
      isDropDownOpened: false,
      includeArchived: !immSelectedArchived.isEmpty(),
      isAllActiveSelected: isAllActiveSelected,
      isAllArchivedSelected: isAllArchivedSelected,
      searchWord: null
    };
    this.openerRenderer = this._getOpenerRenderer.bind(this);
    this.openerHandler = this._onOpenerClick.bind(this);
    this.focusHandler = this._onFocus.bind(this);
    this.blurHandler = this._onBlur.bind(this);
    this.searchInputHandler = this._onSearchInputChange.bind(this);
    this.includeArchivedHandler = this._onIncludeArchivedClicked.bind(this);
    this.selectionHandler = this._onSelectionChanged.bind(this);
    this.inputChangeHandler = this._onInputChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const immPrevStudies = this.props.immStudies;
    const immNextStudies = nextProps.immStudies;
    const immPrevSelectedNames = this.props.immSelectedNames;
    const immNextSelectedNames = nextProps.immSelectedNames;
    if (!Imm.is(immPrevStudies, immNextStudies)
      || !Imm.is(immPrevSelectedNames, immNextSelectedNames)) {
      const immNewSelectedStudies = this._getImmSelectedStudies(nextProps);
      const isAllActiveSelected = MasterStudyFilterUtil.isAllActiveSelected(immNewSelectedStudies, immNextStudies);
      const isAllArchivedSelected = MasterStudyFilterUtil.isAllArchivedSelected(immNewSelectedStudies, immNextStudies);
      this.setState({
        immSelectedStudies: immNewSelectedStudies,
        isAllActiveSelected: isAllActiveSelected,
        isAllArchivedSelected: isAllArchivedSelected,
      });
    }
  }

  componentDidMount() {
    // add drop-down blur handler
    document.addEventListener('click', this.blurHandler, false);
  }

  componentWillUnmount() {
    // remove blur-handler
    document.removeEventListener('click', this.blurHandler, false);
  }

  _getImmSelectedStudies(props) {
    const selectedNames = props.immSelectedNames.toJS();
    return props.immStudies
      .filter(study => selectedNames.includes(study.label))
      .map(study => _.assign(study, {className: study.isArchived ? 'is-archived' : ''}))
      .toOrderedSet(study => study.label);
  }

  _getStudyOption(study) {
    const clickHandler = !study.isDisabled
      ? this._onStudyOptionClicked.bind(this, study)
      : null;
    return (<div className={cx('study-option', {'is-archived': study.isArchived}, {'is-disabled': study.isDisabled})}
                 key={study.value}
                 onClick={clickHandler}>
        <span className='study-label'>{study.label}</span>
    </div>);
  }

  _getAllActiveOption(isDisabled) {
    return {
      value: 'allActive',
      label: FrontendConstants.ALL_ACTIVE,
      isArchived: false,
      isDisabled: isDisabled
    };
  }

  _getAllArchivedOption(isDisabled) {
    return {
      value: 'allArchived',
      label: FrontendConstants.ALL_ARCHIVED,
      isArchived: true,
      isDisabled: isDisabled
    };
  }

  _getDropDownContent() {
    const { isAllActiveSelected, isAllArchivedSelected, includeArchived } = this.state;
    const { immStudies } = this.props;
    const studies = immStudies.filter(study => {
      return this._isStudyIncluded(study);
    }).map(study => this._getStudyOption(study)).toJS();

    let includeArchivedCheckbox;
    const hasArchivedStudies = !immStudies.filter(study => study.isArchived).isEmpty();
    if (hasArchivedStudies) {
      includeArchivedCheckbox = (
        <Checkbox checkedState={this.state.includeArchived}
                  onClick={this.includeArchivedHandler}>
          {FrontendConstants.INCLUDE_ARCHIVED}
        </Checkbox>);
    }

    const hasActiveStudies = !immStudies.filter(study => !study.isArchived).isEmpty();
    let isAllActiveOption;
    if (hasActiveStudies) {
      isAllActiveOption = this._getStudyOption(this._getAllActiveOption(isAllActiveSelected));
    }

    let isAllArchivedOption;
    if (includeArchived && hasArchivedStudies) {
      isAllArchivedOption = this._getStudyOption(this._getAllArchivedOption(isAllArchivedSelected));
    }

    
    return (<div className='study-selector-content' ref={node => { this.dropDownContentRef = node; }}>

      <InputWithPlaceholder
        className='search-input'
        type='text'
        placeholder={FrontendConstants.SEARCH_STUDY}
        onChange={this.searchInputHandler}
        maxLength={100}
      />
      {includeArchivedCheckbox}
      <hr/>
      <div className='selector-options-container'>
        {isAllActiveOption}{isAllArchivedOption}
        {studies}
      </div>
    </div>);
  }

  _onOpenerClick() {
    const { isDropDownOpened } = this.state;
    if(isDropDownOpened) {
      this.setState({isDropDownOpened: false});
    } else {
      this.setState({isDropDownOpened: true});
    }
  }

  _getOpenerRenderer() {
    return (<div>
      <span className={cx('Select-arrow')}
            onMouseDown={this.openerHandler}></span>
    </div>);
  }

  _onBlur(event) {
    // ignore clicks on the input or the dropdown itself
    const isClickOnFilterContent = this.state.isDropDownOpened
      && (event.target.className === 'study-label'
        || (this.dropDownContentRef && this.dropDownContentRef.contains(event.target))
        || (this.inputContainerRef && this.inputContainerRef.contains(event.target)));

    // TODO - this breaks logic when rendered in supernavbar. Investigate further as development proceeds
    // this.setState({isDropDownOpened: false});
  }

  _onFocus() {
    if (!this.state.isDropDownOpened) {
      this.setState({isDropDownOpened: true});
    }
  }

  _onIncludeArchivedClicked() {
    const {includeArchived, immSelectedStudies} = this.state;
    const immSelectedArchived = immSelectedStudies.filter(study => study.isArchived);
    const newIncludeArchived = !includeArchived;
    this.setState({includeArchived: newIncludeArchived});
    if (!immSelectedArchived.isEmpty() && !newIncludeArchived) {
      // clear all archived selection
      const immNewSelectedStudies = immSelectedStudies.filter(study => !study.isArchived);
      const newSelectedIds = immNewSelectedStudies.map(s => s.value).toJS();
      this.props.onChange(newSelectedIds);
    }
  }

  _onStudyOptionClicked(study) {
    let { immSelectedStudies } = this.state;
    let { immStudies } = this.props;
    let immNewSelectedStudies;
    if (study.value === 'allActive') {
      // keep selected archived studies
      immNewSelectedStudies = immSelectedStudies.filter(study => study.isArchived);
      // add all active studies
      immNewSelectedStudies = immNewSelectedStudies.concat(immStudies.filter(study => !study.isArchived));
    } else if (study.value === 'allArchived') {
      // keep selected active studies
      immNewSelectedStudies = immSelectedStudies.filter(study => !study.isArchived);
      // add all archived studies
      immNewSelectedStudies = immNewSelectedStudies.concat(immStudies.filter(study => study.isArchived));
    } else {
      immNewSelectedStudies = immSelectedStudies.add(study);
    }
    const newSelectedIds = immNewSelectedStudies.map(s => s.value).toJS();
    this.props.onChange(newSelectedIds);
  }

  _onInputChange(newValue) {
    const { immSelectedStudies } = this.state;
    if (newValue === '' && immSelectedStudies && !immSelectedStudies.isEmpty()) {
      this._onSelectionChanged([]);
    }
  }

  _onSelectionChanged(selectedIds) {
    const { immSelectedStudies } = this.state;
    let newSelectIds;
    newSelectIds = selectedIds;
    if (newSelectIds.includes('allActive')) {
      newSelectIds = _.filter(selectedIds, id => id !== 'allActive');
      const activeSelectedIds = immSelectedStudies.filter(study => !study.isArchived).map(study => study.value).toJS();
      newSelectIds = _.union(activeSelectedIds, newSelectIds);
    }

    if (newSelectIds.includes('allArchived')) {
      newSelectIds = _.filter(selectedIds, id => id !== 'allArchived');
      const archivedSelectedIds = immSelectedStudies.filter(study => study.isArchived).map(study => study.value).toJS();
      newSelectIds = _.union(newSelectIds, archivedSelectedIds);
    }

    this.props.onChange(newSelectIds);
  }

  _onSearchInputChange(e) {
    const inputValue = e.target.value;
    this.setState({searchWord: inputValue});
  }

  _isStudyIncluded(study){
    const {immSelectedStudies, searchWord, isAllArchivedSelected, isAllActiveSelected} = this.state;
    const selectedIds = immSelectedStudies.map(s => s.value).toJS();
    const isStudySelected = selectedIds.includes(study.value)
      || (isAllArchivedSelected && study.isArchived)
      || (isAllActiveSelected && !study.isArchived);
    const isStudyInSearchResult = _.isEmpty(searchWord)
      || study.label.toLowerCase().includes(searchWord.toLowerCase());
    return !isStudySelected && isStudyInSearchResult && (this.state.includeArchived || !study.isArchived);
  }

  render() {
    const { isDropDownOpened } = this.state;

    let dropDownContent;
    if (isDropDownOpened) {
      dropDownContent = this._getDropDownContent();
    }

    const immRenderedSelectedStudies = this.state.immSelectedStudies;
    const selectorProps = {
      arrowRenderer: this.openerRenderer,
      abbreviationThreshold: 2,
      multi: true,
      clearable: true,
      searchable: false,
      onBlurResetsInput: false,
      placeholder: FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER,
      options: Imm.List(),
      value: immRenderedSelectedStudies,
      onChange: this.selectionHandler,
      onInputChange: this.inputChangeHandler
    };

    return (
      <div className="study-filter-selector" ref={node => { this.inputContainerRef = node; }}>
        <div className="input-container" onFocus={this.focusHandler}>
          <Combobox className='study-filter-combobox' {...selectorProps}/>
        </div>
        <div className="dropdown-container">
          {dropDownContent}
        </div>
      </div>
    );
  }
}

export default StudyFilterSelector;
