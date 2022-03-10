import React from 'react';
import Imm from 'immutable';
import PropTypes from "prop-types";
import cx from "classnames";


import {withTransitionHelper} from "../../RouterTransitionHelper";
import DispositionTermStore, { Key as StoreKey, RequestKey, GetOutstandingRequest } from '../../../stores/DispositionTermStore';
import AdminActions from "../../../actions/AdminActions";
import DispositionTermActions from "../../../actions/DispositionTermActions";
import FrontendConstants from "../../../constants/FrontendConstants";
import ContentPlaceholder from '../../ContentPlaceholder';
import {USDMEventKey, DispositionState, StateKey} from "../../../constants/DispositionTermConstants";
import Button from '../../Button';
import DispositionTable from "./DispositionTable";
import DispositionUtil from "../../../util/DispositionUtil";
import RouteNameConstants from "../../../constants/RouteNameConstants";
import StatusMessageTypeConstants from "../../../constants/StatusMessageTypeConstants";


class DispositionTermView extends React.PureComponent {

  static displayName = 'Dispositions';

  static propTypes = {
    immAdminStore: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    DispositionTermStore.resetStore();
    this.state = {
      immBaseDispositions: Imm.List(),
      immEditedDispositions: Imm.List(),
      immUsdmEvents: Imm.List(),
      immCustomerEvents: Imm.List(),
      isUnmappedExpanded: true,
      isMappedExpanded: false,
    };

    this.storeChangeHandler = this._onStoreChange.bind(this);
    this.cancelHandler = this._cancelConfigChanges.bind(this);
    this.submitUpdatesHandler = this._submitDispositions.bind(this);
    this.updateHandler = this._handleDispositionUpdates.bind(this);
    this.deleteHandler = this._handleDeleteDisposition.bind(this);
    this.unmappedUpdateHandler = this._handleUnmappedDispositionUpdates.bind(this);
    this.createSingleHandler = this._createDisposition.bind(this);
    this.createMultiHandler = this._createDispositions.bind(this);
    this.dismissHandler = this._showDismissDialog.bind(this);
    this.toggleExpandUnmapped = this._toggleExpandUnmappedContent.bind(this);
    this.toggleExpandMapped = this._toggleExpandMappedContent.bind(this);
    this.checkforDuplicates = this._checkForDuplicateDispositionLabelNames.bind(this);
  }

  componentDidMount() {
    DispositionTermActions.addListener(this.storeChangeHandler);
    DispositionTermActions.fetchDispositionConfig();
    DispositionTermActions.fetchUSDMEvents();
    DispositionTermActions.fetchCustomerEvents();
  }

  componentWillUnmount() {
    DispositionTermActions.removeListener(this.storeChangeHandler);
  }

  _onStoreChange() {
    const newImmStore = DispositionTermStore.getStore();
    const immUsdmEvents = newImmStore.get(StoreKey.usdmEvents, Imm.List());
    const immCustomerEvents =  newImmStore.get(StoreKey.customerEvents, Imm.List());
    const newImmDispositions = newImmStore.get(StoreKey.dispositions, Imm.List())
      .sortBy(disposition => disposition.get('uiSequence'));
    const immUnmappedDispositions = this._getUnmappedDispositions(newImmDispositions, immCustomerEvents);
    const sortedUnmappedDispositions = immUnmappedDispositions.sortBy(disposition => disposition.get('customerEvent'));
    this.setState({
      immBaseDispositions: newImmDispositions,
      immEditedDispositions: newImmDispositions,
      immUnmappedBaseDispositions: sortedUnmappedDispositions,
      immUnmappedDispositions: sortedUnmappedDispositions,
      immUsdmEvents: immUsdmEvents,
      immCustomerEvents: immCustomerEvents,
    });
  }

  _showDismissDialog() {
    if (this._isDirty()) {
      AdminActions.displayUnsavedWorkModal(
        (isDiscard) => {
          if (isDiscard !== false) {
            this.cancelHandler();
          }
        },
        FrontendConstants.CONFIGURATION_HAS_NOT_BEEN_SAVED,
        FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST
      );
    } else {
      this.cancelHandler();
    }
  }

  _cancelConfigChanges() {
    this.context.router.push({name: RouteNameConstants.APERTURE_SCHEMAS});
  }
  _checkForDuplicateDispositionLabelNames(immDispositionLabels)
  {
    const immDispositionLabelsSet = immDispositionLabels.toSet();
    return !(immDispositionLabelsSet.size === immDispositionLabels.size);
  }
  _submitDispositions() {
    const {immEditedDispositions} = this.state;
    // User should enter unique Disposition name. Otherwise, throw a status message
    const immDispositionLabels = immEditedDispositions.map(immDisposition => immDisposition.get('uiEvent',null));
    const hasDuplicates = this.checkforDuplicates(immDispositionLabels);
    var firstEventActiveFlag = false;
    immEditedDispositions.map(immDispositionData => {
      if(immDispositionData.get('isStartingEvent',null) == true && immDispositionData.get('state',null).get('stateName',null) == "Active"){
        firstEventActiveFlag = true;
      }
     }
     )
    if(hasDuplicates){
        AdminActions.createStatusMessage(
          FrontendConstants.DUPLICATE_DISPOSITION_NAMES,
          StatusMessageTypeConstants.TOAST_ERROR
        );
    }
    else {
      if(!firstEventActiveFlag){
        AdminActions.createStatusMessage(
          FrontendConstants. DISPOSITION_FIRSTEVENT_NOTACTIVESTATUS_UPDATE,
          StatusMessageTypeConstants.TOAST_ERROR
        );
        window.scrollTo(0,0);

      } 
      else{
         AdminActions.createStatusMessage(
          FrontendConstants. UPDATE_DISPOSITIONS_SUCCESSFUL,
          StatusMessageTypeConstants.TOAST_SUCCESS
        ); 

      }
      DispositionTermActions.updateDispositionConfig(immEditedDispositions);
    }
  }

  _handleDeleteDisposition(id) {
    AdminActions.displayDeleteWarningModal(
      (isDiscard) => {
        if (isDiscard !== false) {
          this._confirmDeleteDisposition(id);
        }
      },
      FrontendConstants.DISPOSITION_WARNING_DELETE_HEADER,
      FrontendConstants.DISPOSITION_WARNING_DELETE_CONTENT
    );
  }
  
  _confirmDeleteDisposition(id){
    const {immEditedDispositions} = this.state;
    // User cannot delete the disposition if there is no starting event
    const immDispositionStartingEvents = immEditedDispositions
        .map(immDisposition => immDisposition.get('isStartingEvent',null));
    const hasStartingEventTrue = immDispositionStartingEvents.filter(isStartingEvent => !!isStartingEvent);
    const currentDispositionStatus = immEditedDispositions.filter(immDisposition => immDisposition.get('id') === id)
        .filter(immDisposition => !!immDisposition.get('isStartingEvent'));

    if ((hasStartingEventTrue.size > 1)|| (hasStartingEventTrue.size === 1 && currentDispositionStatus.size === 0)) {
      DispositionTermActions.deleteDispositionConfig([id]);
    }
    else {
      AdminActions.createStatusMessage(
          FrontendConstants.FIRST_EVENT_MUST_BE_SELECTED,
          StatusMessageTypeConstants.TOAST_ERROR
      );
    }
  }

  _handleDispositionUpdates(immUpdatedDispositions) {
    this.setState({
      immEditedDispositions: immUpdatedDispositions,
    });
  }

  _handleUnmappedDispositionUpdates(immUpdatedDispositions) {
    this.setState({
      immUnmappedDispositions: immUpdatedDispositions,
    });
  }

  _getCreateModel(immDisposition, uiSeq, isStartingEvent) {
    let immDispositionToCreate = immDisposition.set('id', null);
    immDispositionToCreate = immDispositionToCreate.set('uiSequence', uiSeq);
    immDispositionToCreate = immDispositionToCreate.set('enabled', true);
    immDispositionToCreate = immDispositionToCreate.set('isStartingEvent', isStartingEvent);
    return immDispositionToCreate;
  }

  _createDisposition(immDisposition) {
    const {immEditedDispositions} = this.state;
    const isStartingEvent = !immEditedDispositions || immEditedDispositions.isEmpty();
    const currentLastUiSeq = immEditedDispositions.isEmpty()
      ? 0
      : immEditedDispositions.map(x => x.get('uiSequence')).max();
    const uiSeq = currentLastUiSeq + 1;
    const immDispositionToCreate = this._getCreateModel(immDisposition, uiSeq, isStartingEvent);
    const immDispositionLabels = immEditedDispositions.map(immDisposition => immDisposition.get('uiEvent',null));
    const hasDuplicates = this.checkforDuplicates(immDispositionLabels.concat(immDisposition.get('uiEvent',null)));
    if(hasDuplicates){
      AdminActions.createStatusMessage(
          FrontendConstants.DUPLICATE_DISPOSITION_NAMES,
          StatusMessageTypeConstants.TOAST_ERROR
      );
    }
    else {
      DispositionTermActions.createDispositions(Imm.List([immDispositionToCreate]));
    }
  }

  _createDispositions() {
    const {immUnmappedDispositions, immEditedDispositions} = this.state;
    const immValidDispositions = immUnmappedDispositions.filter(immDisposition => {
      return DispositionUtil.isDispositionConfigValid(immDisposition)
    }).map((immDisposition, index) => {
      const isStartingEvent = index == 0 && (!immEditedDispositions || immEditedDispositions.isEmpty());
      const currentLastUiSeq = immEditedDispositions.isEmpty()
        ? 0
        : immEditedDispositions.map(x => x.get('uiSequence')).max();
      const uiSeq = currentLastUiSeq + 1 + index;
      return this._getCreateModel(immDisposition, uiSeq, isStartingEvent);
    });
    // Merge newly added and existing disposition names:
    const immDispositionLabels = immValidDispositions.map(immDisposition => immDisposition.get('uiEvent',null))
          .concat(immEditedDispositions.map(immDisposition => immDisposition.get('uiEvent',null)));
    const hasDuplicates = this.checkforDuplicates(immDispositionLabels);
    if(hasDuplicates){
      AdminActions.createStatusMessage(
          FrontendConstants.DUPLICATE_DISPOSITION_NAMES,
          StatusMessageTypeConstants.TOAST_ERROR
      );
    }
    else {
      DispositionTermActions.createDispositions(immValidDispositions);
    }
  }

  _getUnmappedDispositions(immBaseDispositions, immCustomerEvents) {
    let unmappedDispositions;
    if(!!immCustomerEvents && !immCustomerEvents.isEmpty()) {
      const mappedCustomerEvents = immBaseDispositions
        .map(immDisposition => immDisposition.get('customerEvent', ''));
      const unmappedCustomerEvents = immCustomerEvents
        .filter(customerEvent => !mappedCustomerEvents.includes(customerEvent));
      unmappedDispositions = unmappedCustomerEvents.map((customerEvent, index) => {
        return Imm.fromJS({
          id: `unmapped-disposition-${index}`,
          usdmEvent: {
            eventId: USDMEventKey.NONE,
            eventName: 'None',
          },
          state: {
            stateId: StateKey.COMPLETED,
            stateName: DispositionState[StateKey.COMPLETED],
          },
          customerEvent: customerEvent,
          uiEvent: '',
          uiSequence: -1,
          isStartingEvent: false,
          enabled: false,
          isPersisted: false,
        });
      });
    }
    return unmappedDispositions;
  }

  _getUnmappedDispositionContent() {
    const {immEditedDispositions, immUnmappedDispositions, immUsdmEvents, isUnmappedExpanded} = this.state;
    let unmappedDispositionContent;
    if (isUnmappedExpanded) {
      const immUnmappedUsdmEvents = DispositionUtil.getDispositionAvailableUSDMOptions(null,
        immUsdmEvents, immEditedDispositions);

      const unmappedDispositionProps = {
        immDispositions: immUnmappedDispositions,
        immUsdmEvents: immUnmappedUsdmEvents,
        isEnabled: false,
        handleUpdate: this.unmappedUpdateHandler,
        handleCreate: this.createSingleHandler,
      };
      unmappedDispositionContent = (<DispositionTable {...unmappedDispositionProps}></DispositionTable>);
    }
    return unmappedDispositionContent;
  }

  _getConfiguredDispositionContent() {
    const {immEditedDispositions, immUsdmEvents, isMappedExpanded} = this.state;
    let mappedDispositionContent;
    if(isMappedExpanded) {
      const configuredDispositionProps = {
        immDispositions: immEditedDispositions,
        immUsdmEvents: immUsdmEvents,
        isEnabled: true,
        handleUpdate: this.updateHandler,
        handleDelete: this.deleteHandler,
      };
      mappedDispositionContent = (
        <DispositionTable {...configuredDispositionProps}></DispositionTable>
      );
    }
    return mappedDispositionContent;
  }

  _toggleExpandUnmappedContent() {
    const {isUnmappedExpanded} = this.state;
    this.setState({
      isUnmappedExpanded: !isUnmappedExpanded,
    });
  }

  _toggleExpandMappedContent() {
    const {isMappedExpanded} = this.state;
    this.setState({
      isMappedExpanded: !isMappedExpanded,
    });
  }

  _isAddAllValid() {
    const {immUnmappedDispositions} = this.state;
    const immValidDispositions = immUnmappedDispositions.filter(immDisposition => {
      return DispositionUtil.isDispositionConfigValid(immDisposition)
    });
    return !!immValidDispositions && !immValidDispositions.isEmpty() ;
  }

  _isUpdateDirty() {
    const {immBaseDispositions, immEditedDispositions} = this.state;
    return !Imm.is(immBaseDispositions, immEditedDispositions);
  }

  _isDirty() {
    const {immBaseDispositions, immEditedDispositions, immUnmappedBaseDispositions, immUnmappedDispositions} = this.state;
    return !Imm.is(immBaseDispositions, immEditedDispositions)
      || !Imm.is(immUnmappedBaseDispositions, immUnmappedDispositions);
  }

  _isReady() {
    const {immUsdmEvents, immCustomerEvents} = this.state;
    return !!immUsdmEvents && !immUsdmEvents.isEmpty()
      && !!immCustomerEvents && !immCustomerEvents.isEmpty()
      && !GetOutstandingRequest(RequestKey.fetchDispositions)
      && !GetOutstandingRequest(RequestKey.fetchUsdmEvents)
      && !GetOutstandingRequest(RequestKey.fetchCustomerEvents)
      && !GetOutstandingRequest(RequestKey.createDispositions)
      && !GetOutstandingRequest(RequestKey.updateDispositions);
  }

  _getTableHeader() {
    return (
      <tr>
        <th className='event-sequence-column'>{FrontendConstants.DISPOSITION_COLUMN_SEQ}</th>
        <th className='ui-event-column'>{FrontendConstants.DISPOSITION_COLUMN_UI_EVENT}</th>
        <th className='usdm-event-column'>{FrontendConstants.DISPOSITION_COLUMN_USDM_EVENT}</th>
        <th className='customer-event-column'>{FrontendConstants.DISPOSITION_COLUMN_CUSTOMER_EVENT}</th>
        <th className='is-starting-event-column'>{FrontendConstants.DISPOSITION_COLUMN_IS_STARTING_EVENT}</th>
        <th className='state-column'>
          <td className='state-column'>{FrontendConstants.DISPOSITION_COLUMN_STATE}</td>
          <tr className='state-types'>
            <td className='state-active-column'>{FrontendConstants.DISPOSITION_COLUMN_STATE_ACTIVE}</td>
            <td className='state-withdrawn-column'>{FrontendConstants.DISPOSITION_COLUMN_STATE_WITHDRAWN}</td>
            <td className='state-completed-column'>{FrontendConstants.DISPOSITION_COLUMN_STATE_COMPLETED}</td>
          </tr>
        </th>
        <th className='enabled-event-column'>{FrontendConstants.DISPOSITION_COLUMN_ENABLE}</th>
      </tr>
    );
  }

  render() {
    const {immUnmappedDispositions, immEditedDispositions, isUnmappedExpanded, isMappedExpanded} = this.state;
    let content;
    if (!this._isReady()) {
      content = <ContentPlaceholder/>;
    } else {
      const headerContent = this._getTableHeader();

      const unmappedEventCount = !!immUnmappedDispositions ? immUnmappedDispositions.size : 0;
      const unmappedDispositionContent = this._getUnmappedDispositionContent();

      const mappedDispositionCount = !!immEditedDispositions ? immEditedDispositions.size : 0;
      const configuredDispositionContent = this._getConfiguredDispositionContent();
      content = (
        <div className='config-content'>
          <table>
            <thead>{headerContent}</thead>
          </table>
          <div className='table-title' onClick={this.toggleExpandUnmapped}>
            <div className={cx('expand-button', 'icon-accordion-down', {'expanded': isUnmappedExpanded})}></div>
            {FrontendConstants.DISPOSITION_UNCONFIGURED_TITLE} ({unmappedEventCount})
          </div>
          {unmappedDispositionContent}
          <div className='table-title' onClick={this.toggleExpandMapped}>
            <div className={cx('expand-button', 'icon-accordion-down', {'expanded': isMappedExpanded})}></div>
            {FrontendConstants.DISPOSITION_CONFIGURED_TITLE} ({mappedDispositionCount})
          </div>
          {configuredDispositionContent}
          <div className="buttons">
            <Button
              icon='btn-cancel'
              children={FrontendConstants.CANCEL}
              isSecondary={true}
              onClick={this.dismissHandler}
              classes={{'cancel': true}}
            />
            <Button
              icon='icon-plus-circle2 btn-create'
              children={FrontendConstants.ADD}
              isPrimary={true}
              onClick={this.createMultiHandler}
              isDisabled={!this._isAddAllValid()}
              classes={{'add': true}}
            />
            <Button
              icon='icon-loop2 btn-update'
              children={FrontendConstants.UPDATE}
              isPrimary={true}
              onClick={this.submitUpdatesHandler}
              isDisabled={!this._isUpdateDirty()}
              classes={{'update': true}}
            />
          </div>
        </div>
      );
    }
    return (
      <div className={cx('admin-tab', 'disposition-tab', 'disposition-container')}>
        <div className='tab-title'>{FrontendConstants.DISPOSITION_PAGE_TITLE}</div>
        {content}
      </div>
    );
  }

}

export default withTransitionHelper(DispositionTermView, true);
