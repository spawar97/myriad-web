import {USDMEventKey} from "../constants/DispositionTermConstants";

class DispositionUtil {

  static getDispositionAvailableUSDMOptions(immDisposition, immAllUSDMEvents, immAllDispositions) {
    let immSelectedUSDMEventId;
    if (!!immDisposition) {
      immSelectedUSDMEventId = immDisposition.getIn(['usdmEvent', 'eventId'], null);
    }

    // Get all selected usdmEvent in the different dispositions
    const immAllSelectedUSDMEventIds = immAllDispositions
      .map(immDisposition => immDisposition.get('usdmEvent'))
      .filter(immUsdmEvent => immUsdmEvent != null
        && immUsdmEvent.get('eventId', '') !== USDMEventKey.NONE
        && immUsdmEvent.get('eventId', '') !== immSelectedUSDMEventId
      )
      .map(immUsdmEvent => immUsdmEvent.get('eventId', ''));

    // Build the dropdown available usdmEvent selections for current disposition
    let immAvailableUSDMOptions = immAllUSDMEvents
      .filter(immUsdmEvent => !immAllSelectedUSDMEventIds.includes(immUsdmEvent.get('eventId', '')));

    return immAvailableUSDMOptions;
  }

  static isDispositionConfigValid(immDisposition) {
    return !!immDisposition.get('state', null)
      && !!immDisposition.get('usdmEvent', null)
      && !!immDisposition.get('uiEvent', null)
      && !!immDisposition.get('uiSequence', -1) >= 0;
  }
}

export default DispositionUtil;
