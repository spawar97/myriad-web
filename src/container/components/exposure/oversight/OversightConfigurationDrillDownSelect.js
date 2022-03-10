import React from 'react';
import FrontendConstants from "../../../constants/FrontendConstants";
import Imm from "immutable";
import Combobox from "../../Combobox";
import SearchActions from "../../../actions/SearchActions";
import PropTypes from 'prop-types';
import EntitySearchUtil from "../../../util/EntitySearchUtil";
import Util from "../../../util/util";

class OversightConfigurationDrillDownSelect extends React.PureComponent {

  static propTypes = {
    className: PropTypes.string,
    value: PropTypes.instanceOf(Imm.Map),
    onChange: PropTypes.func,
    disabled: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      immOptions: this.searchItemsToOptions(this.getSearchItems()),
      immValue: this.metricFieldsToForm(this.props.value),
    };
  }

  componentDidMount() {
    SearchActions.addListener(this._onChange);
  }

  componentWillUnmount() {
    SearchActions.removeListener(this._onChange);
  }

  componentDidUpdate(prevProps) {
    const {value} = this.props;
    if (!Imm.is(value, prevProps.value)) {
      this.setState({
        immValue: this.metricFieldsToForm(value),
      });
    }
  }

  _onChange = () => {
    this.setState({
      immOptions: this.searchItemsToOptions(this.getSearchItems()),
    });
  };

  searchItemsToOptions(immFiles) {
    return immFiles
      .map(option => ({
        value: option.id,
        label: option.title,
        fileType: option.fileType,
      }))
      .sortBy(opt => opt.title);
  }

  renderOptionLabel(option) {
    const iconClass = Util.getFileTypeIconName(option.fileType, option.label);
    return (
      <div>
        <span className={ iconClass } />
        <span className='search-option'>{ option.label }</span>
      </div>
    );
  }

  metricFieldsToForm(immMetricValue) {
    const immSearchItems = this.getSearchItems();
    const filesFromDrillTargets = immMetricValue.get('drillTargets')
      .map(identifier => immSearchItems.find(file => file.identifier === identifier))
      .filter(option => option);
    const filesFromEmbeddedDrillDown = immMetricValue.getIn(['embeddedDrillDown', 'targets'])
      .map(embeddedItem => immSearchItems.find(file => file.id === embeddedItem.get('entityId')))
      .filter(option => option);
    return this.searchItemsToOptions(Imm.Set(filesFromDrillTargets)
      .union(filesFromEmbeddedDrillDown));
  }

  getSearchItems() {
    const immExposureFiles = SearchActions.getFiles();
    const immEmbeddedFiles = SearchActions.getEmbeddedEntities();
    return EntitySearchUtil.getSearchFiles(immExposureFiles, immEmbeddedFiles);
  }

  selectDrillTargets(newValues) {
    const {immOptions} = this.state;
    const immValue = Imm.fromJS(
      newValues.map(value => immOptions.find(option => option.value === value))
    );
    this.setState({immValue});

    const immSearchItems = this.getSearchItems();
    const immSelectedFiles = newValues.map(value => {
      return immSearchItems.find(file => file.id === value);
    });
    const drillTargets = immSelectedFiles
      .map(file => file.identifier)
      .filter(identifier => identifier);
    const targets = immSelectedFiles
      .filter(file => !file.identifier)
      .map(file => ({entityId: file.id, entityName: file.title, entityType: file.fileType}));

    this.props.onChange(Imm.fromJS({
      drillTargets,
      embeddedDrillDown: {targets},
    }));
  }

  render() {
    const {immOptions, immValue} = this.state;
    return (
      <Combobox
        className={this.props.className}
        abbreviationThreshold={4}
        multi={true}
        clearable={true}
        placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
        value={immValue}
        onChange={this.selectDrillTargets.bind(this)}
        options={immOptions}
        optionRenderer={this.renderOptionLabel}
        disabled={this.props.disabled}
      />);
  }
}

module.exports = OversightConfigurationDrillDownSelect;
