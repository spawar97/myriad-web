import AppDispatcher from '../http/AppDispatcher';
import {actions} from '../constants/RactConstant';

const RactActions = {

  handleDrilldown(file, params, drilldownHelper) {
    AppDispatcher.handleViewAction({
      actionType: actions.RACT_HANDLE_DRILLDOWN,
      file, params, drilldownHelper,
    });
  },

  updatePrimeTableData(tableData) {
    AppDispatcher.handleViewAction({
      actionType: actions.PRIME_TABLE_DATA,
      tableData
    });
  },
 
};

export default RactActions;
