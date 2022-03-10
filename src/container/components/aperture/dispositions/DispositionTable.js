import React from 'react';
import Imm from 'immutable';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import PropTypes from "prop-types";
import cx from "classnames";

import FrontendConstants from "../../../constants/FrontendConstants";
import StatusMessageTypeConstants from '../../../constants/StatusMessageTypeConstants';
import {USDMEventKey, DispositionState, StateKey} from "../../../constants/DispositionTermConstants";
import ToggleButton from '../../ToggleButton';
import RadioItem from '../../RadioItem';
import Combobox from "../../Combobox";
import AdminActions from "../../../actions/AdminActions";
import DispositionUtil from "../../../util/DispositionUtil";
import Button from '../../Button';


class DispositionTable extends React.PureComponent {

  static displayName = 'DispositionTable';

  static propTypes = {
    immDispositions: PropTypes.instanceOf(Imm.List),
    immUsdmEvents: PropTypes.instanceOf(Imm.List),
    isEnabled: PropTypes.bool,
    handleUpdate: PropTypes.func,
    handleCreate: PropTypes.func,
    handleDelete: PropTypes.func,
  };

  static SortableItem = SortableElement(({rowRenderer, value: immDisposition}) => {
    const dispositionRow = rowRenderer(immDisposition);
    return (<div  className="grabbing noselect">{dispositionRow}</div>);
  });

  static SortableList = SortableContainer(({items, rowRenderer}) => {
    return (
      <div>
        {items.map((value, index) => {
          const key = `item-${index}`;
          const sortableItemProps = {key, index, value, rowRenderer};
          return (
            <DispositionTable.SortableItem {...sortableItemProps} />);
        })}
      </div>
    );
  });

  constructor(props) {
    super(props);
    this.state = {
      immEditedDispositions: props.immDispositions,
    };
    this.sortChangeHandler = this._onSortChange.bind(this);
    this.rowRenderer = this._getDispositionRow.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const {immDispositions, immUsdmEvents} = this.props;
    if(!Imm.is(immDispositions, nextProps.immDispositions)
      || !Imm.is(immUsdmEvents, nextProps.immUsdmEvents)) {
      this.setState({
        immEditedDispositions: nextProps.immDispositions,
        immUsdmEvents: nextProps.immUsdmEvents,
      });
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const {immEditedDispositions} = this.state;
    if(!!this.props.handleUpdate
      && !Imm.is(immEditedDispositions, prevState.immEditedDispositions)) {
      this.props.handleUpdate(immEditedDispositions);
    }
  }

  _getUpdatedDispositions(immEditedDispositions, dispositionId, updatedFieldName, updatedValue) {
    const editedEventIndex = immEditedDispositions
      .findIndex(disposition => disposition.get('id', '') === dispositionId);
    let immEditedDisposition = immEditedDispositions.get(editedEventIndex);
    immEditedDisposition = immEditedDisposition.set(updatedFieldName, updatedValue);
    let newImmDispositions = immEditedDispositions.set(editedEventIndex, immEditedDisposition);
    return newImmDispositions;
  }

  _updateDispositionField(id, updatedFieldName, updatedValue) {
    const {immEditedDispositions} = this.state;
    let newImmDispositions = this._getUpdatedDispositions(immEditedDispositions, id, updatedFieldName, updatedValue);
    this.setState({
      immEditedDispositions: newImmDispositions,
    });
  }

  _getReorderedDispositions(immEditedDispositions, event) {
    const { oldIndex, newIndex } = event;

    // Simple algorithm to reorder the list:
    // 1. Pop old index
    // 2. Splice array into 2 arrays at new index
    // 3. insert the popped element between the two arrays
    const immMovedDisposition = Imm.List([immEditedDispositions.get(oldIndex)]);
    const immDispositionsExcludingMovedDs = immEditedDispositions.delete(oldIndex);
    const immListStart = immDispositionsExcludingMovedDs.slice(0, newIndex);
    const immListEnd = immDispositionsExcludingMovedDs.slice(newIndex, immDispositionsExcludingMovedDs.size);

    // Map through the reordered list and update ds sequence appropriately
    return immListStart.concat(immMovedDisposition, immListEnd).map((immDs, dsseq) => {
      return immDs.set('uiSequence', dsseq + 1);
    });
  }

  _onSortChange(event) {
    const {immEditedDispositions} = this.state;
    const immNewDispositions = this._getReorderedDispositions(immEditedDispositions, event);
    this.setState({
      immEditedDispositions: immNewDispositions,
    });
  }

  _handleInputTextChange(id, fieldName, changeEvent) {
    const newValue = changeEvent.currentTarget.value;
    this._updateDispositionField(id, fieldName, newValue);
  }

  _handleStateChange(id, stateType, changeEvent) {
    const newState = Imm.fromJS({stateId: stateType, stateName: DispositionState[stateType]})
    this._updateDispositionField(id, 'state', newState);
  }

  _handleUsdmEventChange(id, option) {
    this._updateDispositionField(id, 'usdmEvent', Imm.fromJS(option));
  }

  _handleStartingEventChange(newStartingEventId) {
    let {immEditedDispositions} = this.state;
    const currentStartingDisposition = immEditedDispositions.find(disposition => disposition.get('isStartingEvent', false));
    const newStartingDisposition = immEditedDispositions
                                    .find(disposition => disposition.get('id') === newStartingEventId,this, Imm.Map());
    if (currentStartingDisposition != null) {
      // Prevent disabling starting event
      if (!newStartingDisposition.get('enabled')) {
        AdminActions.createStatusMessage(
          FrontendConstants.FIRST_EVENT_MUST_BE_SELECTED,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        return;
      }
      const oldStartingId = currentStartingDisposition.get('id', '');
      immEditedDispositions = this._getUpdatedDispositions(immEditedDispositions,
        oldStartingId, 'isStartingEvent', false);

    }
    immEditedDispositions = this._getUpdatedDispositions(immEditedDispositions,
      newStartingEventId, 'isStartingEvent', true);

    this.setState({
      immEditedDispositions: immEditedDispositions,
    });
  }

  _handleToggleDisposition(id) {
    const {immEditedDispositions} = this.state;
    const editedEventIndex = immEditedDispositions
      .findIndex(disposition => disposition.get('id', '') === id);
    let immEditedDisposition = immEditedDispositions.get(editedEventIndex);
    // Prevent disabling starting event
    if (immEditedDisposition.get('enabled') && immEditedDisposition.get('isStartingEvent')) {
      AdminActions.createStatusMessage(
        FrontendConstants.FIRST_EVENT_MUST_BE_SELECTED,
        StatusMessageTypeConstants.TOAST_ERROR
        );
      return;
    }
    immEditedDisposition = immEditedDisposition.set('enabled', !immEditedDisposition.get('enabled'));
    let newImmDispositions = immEditedDispositions.set(editedEventIndex, immEditedDisposition);
    if(!immEditedDisposition.get('enabled')) {
      // move disabled disposition to bottom
      const reorderEvent = {oldIndex: editedEventIndex, newIndex: immEditedDispositions.size};
      newImmDispositions = this._getReorderedDispositions(newImmDispositions, reorderEvent);
    }
    this.setState({
      immEditedDispositions: newImmDispositions,
    });
  }

  _isFieldInvalid(fieldName, value, id) {
    //TODO: validate input fields
    return false;
  }

  _isDispositionConfigValid(immDisposition) {
    return DispositionUtil.isDispositionConfigValid(immDisposition);
  }

  _getInputField(id, fieldName, value) {
    const inputKey = `input-${fieldName}`;
    const fixedWidthInputStyle = this._getFixedWidthColumnStyle('20rem');
    return (<input className={cx("text-input", {"invalid-input": this._isFieldInvalid(id, fieldName, value)})}
                   style={fixedWidthInputStyle}
                   type="text"
                   value={value}
                   key={inputKey}
                   onChange={this._handleInputTextChange.bind(this, id, fieldName)}
    />);
  }

  _getStateRadioButtons(immDisposition) {
    const stateId = immDisposition.getIn(['state', 'stateId'], '');
    const id = immDisposition.get('id', '');
    const fixedRadioColumnStyle = this._getFixedWidthColumnStyle('10rem');
    let radioButtonCells = [];
    radioButtonCells.push(
      <td key={StateKey.ACTIVE} style={fixedRadioColumnStyle}>
        <RadioItem
          handleChange={this._handleStateChange.bind(this, id, StateKey.ACTIVE)}
          checked={stateId === StateKey.ACTIVE}
          id={StateKey.ACTIVE}
        />
      </td>
    );
    radioButtonCells.push(
      <td key={StateKey.WITHDRAWN} style={fixedRadioColumnStyle}>
        <RadioItem
          handleChange={this._handleStateChange.bind(this, id, StateKey.WITHDRAWN)}
          checked={stateId === StateKey.WITHDRAWN}
          id={StateKey.WITHDRAWN}
        />
      </td>
    );
    radioButtonCells.push(
      <td key={StateKey.COMPLETED} style={fixedRadioColumnStyle}>
        <RadioItem
          handleChange={this._handleStateChange.bind(this, id, StateKey.COMPLETED)}
          checked={stateId === StateKey.COMPLETED}
          id={StateKey.COMPLETED}
        />
      </td>
    );
    return radioButtonCells;
  }

  _getIsStartingRadioButton(immDisposition) {
    const isStartingEvent = immDisposition.get('isStartingEvent', false);
    const dispositionId =  immDisposition.get('id', '');
    const radioSelector = !this.props.isEnabled ? '-' : (
      <RadioItem
        handleChange={this._handleStartingEventChange.bind(this, dispositionId)}
        checked={isStartingEvent}
        id='isStartingEvent'
        disabled={this.props.isEnabled}
      />
    );
    return radioSelector;
  }

  _getUSDMDropDownField(id) {
    const {immEditedDispositions} = this.state;
    const {immUsdmEvents} = this.props;

    // Get the current dropdown selected usdmEvent
    const immDisposition = immEditedDispositions
      .find(immDisposition => immDisposition.get('id', '') === id);
    const immSelectedUSDMEvent = immDisposition.get('usdmEvent', null);

    // Build the dropdown available usdmEvent selections for current disposition
    const immAvailableUSDMOptions = DispositionUtil.getDispositionAvailableUSDMOptions(immDisposition,
      immUsdmEvents, immEditedDispositions);

    let usdmEventDropdown;
    const key = `usdm-dropdown-${id}`;
    if (!immAvailableUSDMOptions.isEmpty()) {
      usdmEventDropdown = (<Combobox
        className='usdm-event-selector-dropdown'
        placeholder='Select USDM event'
        value={immSelectedUSDMEvent.get('eventId', '')}
        valueKey='eventId'
        labelKey='eventName'
        passOnlyValueToChangeHandler={false}
        onChange={this._handleUsdmEventChange.bind(this, id)}
        options={immAvailableUSDMOptions}
        key={key}
      />);
    } else {
      usdmEventDropdown = (<span>{immSelectedUSDMEvent.get('eventName', '')}</span>);
    }
    return usdmEventDropdown;
  }

  _deleteConfig(id) {
    if(!!this.props.handleDelete) {
      this.props.handleDelete(id);
    }
  }

  _createConfig(immDisposition) {
    if(!!this.props.handleCreate) {
      this.props.handleCreate(immDisposition);
    }
  }

  _getEnableToggle(immDisposition) {
    const id = immDisposition.get('id', false);
    const isDispositionPersisted = immDisposition.get('isPersisted', true);
    const isEnabled = immDisposition.get('enabled', false);
    const isValid = this._isDispositionConfigValid(immDisposition);

    let toggleButton;
    if(this.props.isEnabled && isDispositionPersisted) {
      toggleButton = (
        <ToggleButton
          className='api-user-toggle-button'
          isActive={isEnabled || false}
          activeText={FrontendConstants.CHECKMARK}
          onClick={this._handleToggleDisposition.bind(this, id)}>
        </ToggleButton>
      );
    } else {
      toggleButton = (
        <Button
          icon='btn-create'
          children={FrontendConstants.ADD}
          isPrimary={true}
          onClick={this._createConfig.bind(this, immDisposition)}
          isDisabled={!isValid}
        />
      );
    }
    return toggleButton;
  }

  _getFixedWidthColumnStyle(width) {
    return {width: width, maxWidth: width, minWidth: width, textAlign: 'center'};
  }

  _getDispositionRow(immDisposition) {
    const id = immDisposition.get('id', '');

    const customerDispositionEvent = immDisposition.get('customerEvent', '');
    const uiDispositionEvent = immDisposition.get('uiEvent', '');

    const uiEventInput = this._getInputField(id, 'uiEvent', uiDispositionEvent);
    const usdmEventInput = this._getUSDMDropDownField(id);
    const stateRadioButtons = this._getStateRadioButtons(immDisposition);
    const isStartingEventRadioButton = this._getIsStartingRadioButton(immDisposition);
    const enableToggleButton = this._getEnableToggle(immDisposition);

    const rowKey = `row-${id}`;
    let deleteDispositionBtn, uiSequence;
    if(this.props.isEnabled) {
      deleteDispositionBtn = (
        <div className='delete-disposition' onClick={this._deleteConfig.bind(this, id)}>x</div>
      );
      uiSequence = (
        <div style={{display: 'flex'}}>
          {deleteDispositionBtn}
          <div>{immDisposition.get('uiSequence', '')}</div>
          <div className='drag-drop-icon icon-menu9 icon-hamburger' style={{padding: '0 0 0 1rem'}}/>
        </div>
      );
    } else {
      uiSequence = '-';
    }

    return (
      <div key={rowKey}
           className='disposition-row'
           style={{display: 'flex'}}>
        <tr>
          <td style={this._getFixedWidthColumnStyle('10rem')} className='event-sequence-column'>
            {uiSequence}
          </td>
          <td style={this._getFixedWidthColumnStyle('25rem')} className='ui-event-column'>
            {uiEventInput}
          </td>
          <td style={this._getFixedWidthColumnStyle('25rem')} className='usdm-event-column'>
            {usdmEventInput}
          </td>
          <td style={this._getFixedWidthColumnStyle('25rem')} className='customer-event-column'>
            {customerDispositionEvent}
          </td>
          <td style={this._getFixedWidthColumnStyle('10rem')} className='is-starting-event-column'>
            {isStartingEventRadioButton}
          </td>
          {stateRadioButtons}
          <td style={this._getFixedWidthColumnStyle('10rem')} className='enabled-event-column'>
            {enableToggleButton}
          </td>
        </tr>
      </div>
    );
  }

  render() {
    const {immEditedDispositions} = this.state;
    const {isEnabled} = this.props;
    let tbodyContent;
    if (isEnabled) {
      tbodyContent = (
        <DispositionTable.SortableList items={immEditedDispositions}
                                       rowRenderer={this.rowRenderer}
                                       onSortEnd={this.sortChangeHandler}
                                       lockAxis={'y'}
                                       distance={10}
                                       helperClass='disposition-drag-and-drop'
        />
      );
    } else if(!!immEditedDispositions && !immEditedDispositions.isEmpty()) {
      tbodyContent = immEditedDispositions.map(immDisposition => this.rowRenderer(immDisposition));
    }

    return (
      <table className={cx({'disabled-table': !isEnabled})}>
        <tbody>{tbodyContent}</tbody>
      </table>
    );
  }
}

export default DispositionTable;
