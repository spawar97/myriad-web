import Imm from 'immutable';
import Util from './util';

class ScorecardUtil {
  static getSelectedStudiesFilterFromSessionForAccount(accountId) {
    const filterCookieEntry = Util.getSessionFilterCookieEntry(null, 0, accountId);
    const filter = (filterCookieEntry && filterCookieEntry.filterState) || {};
    return Imm.List(filter.itemsSelected);
  }
}

export default ScorecardUtil;
