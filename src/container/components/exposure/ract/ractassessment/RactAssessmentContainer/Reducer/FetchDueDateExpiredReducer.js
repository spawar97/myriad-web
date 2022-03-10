
export const dueDateInitialState = {
  isDueDateLoading: false,
  isDueDateError: false,
  dueDateExpiredFlagData: false
}

const FetchDueDateExpiredReducer = (state = dueDateInitialState, action) => {
  switch (action.type) {
    case 'FETCH_DUE_DATE_INIT':
      return {
        ...state,
        isDueDateLoading: true,
        isDueDateError: false
      };
    case 'FETCH_DUE_DATE_SUCCESS':
      return {
        ...state,
        isDueDateLoading: false,
        isDueDateError: false,
        dueDateExpiredFlagData: action.payload,
      };
    case 'FETCH_DUE_DATE_FAILURE':
      return {
        ...state,
        isDueDateLoading: false,
        isDueDateError: true,
      };
    default:
      throw new Error();
  }
};

export default FetchDueDateExpiredReducer;
