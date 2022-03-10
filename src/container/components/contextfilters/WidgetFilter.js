import { Button } from 'primereact-opt/button';
import React, { useState, useEffect, Fragment } from 'react';
import ExposureActions from '../../actions/ExposureActions';
import { getObject, setObject, setString, getString} from '../../util/SessionStorage'
import PreCannedFilter from '../contextfilters/PreCannedFilter';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import Util from "../../util/util";
import 'primeicons/primeicons.css';
import CountrySiteCohort from "./CountrySiteCohortFilters/countrySiteCohortFilter";


const WidgetFilter = (props) => {

  let { isLabel, andLabel, clearLabel, applyLabel, exposureStore } = props;
  let getStore = exposureStore?.getExposureStore()?.toJS();
  let reportData = getStore?.files[props?.fileId]?.reportData;
  let isApply = reportData?.dashboardCustomConfigs?.isApply || false;
  let widgetStore = getStore?.widgetFilterStore;
  let isViewTasks = getStore?.isViewTasks;

  const [state, setstate] = useState([]);
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(true);
  const [prevSessionApplyData, setPrevSessionApplyData] = isViewTasks ? useState(JSON.parse(getStore.fetchedTaskFilters)) : useState(getObject('widgetContextFilter'));
  const [clearPrecanned, setClearPrecanned] = useState(false);
  const [showMoreWidgetKey, setShowMoreWidgetKey] = useState([]);
  const [disableApply, setApplyDisable] = useState(false);
  const [preState, setPreState] = useState([]);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [cscFilters, resetCscFilters] = useState(false);
  const [overflowFlag, setOverflowFlag] = useState(false);

  const sessionContextFilter = () => getStore?.widgetFilterSession || []

  const updateWidgetState = async (data) => {
    let prevSessionData = getObject('widgetContextFilter');

    const changeState = async (data) => {
      setstate(data);
    }

    if (!(_.isEqual(data, prevSessionData))) {
      await changeState(data);
      // setPrevSessionApplyData(data);
      ExposureActions.updateSessionStorage(data);
      if (!isApply) {
        reportData?.widgetMetaData[1]?.controller?.publish('widgetFilter', widgetStore);
      }
    }
  }

  useEffect(() => {
    let currentSessionWidgetFilters = isViewTasks ? JSON.parse(getStore.fetchedTaskFilters) : sessionContextFilter();

    setstate(currentSessionWidgetFilters);

  }, [props]);

  useEffect(() => {
    let appliedStatus = getString('isAppliedContextFilter');
    const sessionKey = 'widgetContextFilter';
    let sessionData = getObject(sessionKey);

    if (sessionData.length > 0 && appliedStatus == 0) {
      if (!(_.isEqual(sessionData, preState))) {
        setApplyDisable(false);
      }
      else {
          setString('isAppliedContextFilter', 1);
      }
    } else if (sessionData.length > 0 && appliedStatus == 1) {
      setApplyDisable(true);
    }
  })

  const handleOnGo = (selectedFilter) => {
    let { contextJson } = selectedFilter;

    if (!(_.isEqual(contextJson, state))) {
      setPrevSessionApplyData(contextJson);
      ExposureActions.updateSessionStorage(contextJson);  //session update
      setstate(contextJson);
      setFilterPanelOpen(true);
      setApplyDisable(false);
      setString('isAppliedContextFilter', 0);
    }
  }

  const cancelPreviousApi = (apiCalls, fileId) => {
    apiCalls?.map((xhr) => {
      xhr?.abort();
    })
    _.defer(ExposureActions.deleteRequests, fileId);
  }

  const updateSessionFilters = (filterValues) => {
    if (!_.isEmpty(filterValues)) {

      filterValues.map((obj) => {
        obj['isApplied'] = obj['values']
        return obj; 
      })

      setObject('widgetContextFilter', filterValues);
      setstate(filterValues);
    }
  }

  const handleOnApply = (data) => {
    let currentState = data ? data : state;
    let fileId = props?.fileId;
    let apiCalls = reportData?.apiRequests;
    let daliaSuggestContextFilter = getObject('daliaSuggestContextFilter');

    if (!(_.isEqual(currentState, prevSessionApplyData)) || daliaSuggestContextFilter) {
      cancelPreviousApi(apiCalls, fileId);
      setPrevSessionApplyData(currentState);
      setPreState(state);
      ExposureActions.updateSessionStorage(currentState);  //session update
      
      let filterStates = getObject('widgetContextFilter');
      updateSessionFilters(filterStates);

      setString('isAppliedContextFilter', 1);
      reportData?.widgetMetaData[1]?.controller?.publish('widgetFilter', widgetStore); //publish api
      setObject('selectWidgetContextFilter', getObject('widgetContextFilter'));
      if(daliaSuggestContextFilter) setObject('daliaSuggestContextFilter', false);
    }
  }

  const clearFilter = (name) => {

    let targetName = name?.toLowerCase();
    let clearName = clearLabel?.toLowerCase();

    setShowMoreWidgetKey([]);
    if (targetName === clearName) {
      updateWidgetState([]);
      handleOnApply([]);
      reportData?.widgetMetaData[1]?.controller?.publish('widgetFilter', widgetStore);
      setClearPrecanned(true);
      setApplyDisable(false);
      resetCscFilters(true)
      setShowAllFilters(false);
    } else {

      let filterState = state?.filter(obj => {
        let widgetName = obj?.widgetname?.toLowerCase();

       return  widgetName !== targetName

      });
      updateWidgetState(filterState);
      setClearPrecanned(true);
      setApplyDisable(false);
      resetCscFilters(true)
    }
  }

  const clearSpecificValue = (e, name) => {
    let value = e.target.innerText;
    let widgetName = name?.toLowerCase();

    let filterState = state.filter((obj) => {
      let targetName = obj['widgetname']?.toLowerCase();

      if (targetName === widgetName && obj['values'].length === 1) {

        return widgetName !== targetName
      }
      else if (targetName === widgetName && obj['values']?.length !== 1) {
        obj['values'] = obj['values']?.filter((v) => { return v !== value })
      }
      return obj
    })

    updateWidgetState(filterState);
    setClearPrecanned(true);
    setApplyDisable(false);
    setString('isAppliedContextFilter', 0);
  }

  const handleFilterIconClick = () => {
    if (!isFilterPanelOpen) {
      setFilterPanelOpen(true);
    } else {
      setFilterPanelOpen(false);
    }
  }

  const capitalizeFirstLetter = (string) => {
    if (string)
      return string?.charAt(0)?.toUpperCase() + string?.slice(1);
  }

  //club objects which have same widget name
  const createWidgetState = () => {
    let filters = state.reduce((acc, obj) => {
      if (acc[obj.widgetname]) {
        acc[obj.widgetname].values = [...acc[obj?.widgetname]?.values, ...obj?.values]
        acc[obj.widgetname].isApplied = [...acc[obj?.widgetname]?.isApplied, ...obj?.isApplied]
      } else {
        acc[obj?.widgetname] = obj
      }
      return acc
    }, {});

    return filters && Object.values(filters);
  }

  let filterState = createWidgetState();

  const disableSave = (contextJson) => {
    if (_.isEqual(contextJson, state) || _.isEmpty(state)) {
      return true
    } else {
      return false
    }
  }

  const saveContextFilters = async (filterName, callPrecannedApi, setShowDialog, filterOptions) => {

    let options = filterOptions?.map((obj) => {
      return {
        data: obj.contextJson,
        filterName: obj?.label
      }
    });

    let matchedFilters = options?.map((obj) => {

      let currentState = state?.map(({ key, ...rest }) => rest);
      let optionData = obj?.data?.map(({ key, ...rest }) => rest);

      let alreadyPresent = _.isEqual(optionData, currentState);

      return {
        alreadyPresent,
        filterName: obj?.filterName
      }
    }).filter(obj => obj.alreadyPresent);

    if (matchedFilters?.length) {

      let matchedFiltersNames = matchedFilters?.map(obj => obj.filterName).join(', ');

      ExposureActions.createStatusMessage(
        `${matchedFiltersNames} already have the selected context filters`,
        StatusMessageTypeConstants.WARNING,
      );

      setShowDialog(false);

    } else {
      let clonedState = Util.deepCopyFunction(state);
      
      clonedState?.map((obj) => {
        obj.isApplied = obj?.values
        return obj;
      })

      let params = {
        data: JSON.stringify(clonedState),
        filterName: filterName,
        status: true
      }
      let args = {
        body : params,
        url : '/api/contextfilter'
       }

      await exposureStore.getPreCannedFilterList(args).then(async (res) => {

        if (res?.Error) {

          throw new Error(res?.Error?.message);

        } else {

          await callPrecannedApi();
          ExposureActions.createStatusMessage(
            'Context Filter Saved Successfully',
            StatusMessageTypeConstants.TOAST_SUCCESS,
          );

        }

      }).catch(err => {
        ExposureActions.createStatusMessage(
          err?.message,
          StatusMessageTypeConstants.WARNING,
        );
      })
    }

  }

  const  updateCscClearState = () => {
    resetCscFilters(false);
  }

  const calculateMinimizedOptions = (array) => {
    if (array.length > 2) {
      return `+ ${(array?.length - 2)} More`;
    }
  }

  const showAllValues = (option) => {
    setShowMoreWidgetKey(prev => ([...prev, { key: option.key }]))
  }

  const showLessValues = (option) => {
    let indexOption = showMoreWidgetKey.findIndex((obj) => obj.key == option.key);
    showMoreWidgetKey.splice(indexOption, 1);
    showMoreWidgetKey.length ? showAllValues(showMoreWidgetKey) : setShowMoreWidgetKey([]);
  }

  useEffect(() => {
    let element = document.getElementById('filter-dropdown');
    if (element.scrollWidth > element.clientWidth) {
      setOverflowFlag(true);
    } else {
      setOverflowFlag(false);
    }
  }, [state, showAllFilters, showMoreWidgetKey])

  return (
    <div className='widget-filter-container'>
     
      <div className='widget-top-bar'>

        <div className='widget-filter-icon'>
          <i
            className={isFilterPanelOpen ? "pi pi-filter widget-filter-open" : "pi pi-filter widget-filter-close"}
            onClick={(e) => { handleFilterIconClick(e) }}
            title='Context Filter'
          />
        </div>

      </div>

      {isFilterPanelOpen ? (
      <div className= 'filter-flex'>
        <div className='widget-filter'>
          <div className={'widget-filter-dropdown-wrapper ' + (isViewTasks ? ' widget-filter-task' : '')}>
            <div className={'filter-dropdown-wrapper ' + (!showAllFilters ? 'filter-more-style' : 'filter-width')}>
              <React.Fragment>
              <div className={(isViewTasks ? 'filter-dropdown-task ' : '') + (!showAllFilters ? 'filter-dropdown' : 'filter-dropdown-more')} id='filter-dropdown'>
          {
            filterState?.map((option, optInd, { length }) => {
              let name = capitalizeFirstLetter(option?.widgetname)
              let showMore = showMoreWidgetKey.some((obj) => obj.key == option.key);

              let selectedValues = option?.values?.map((val, ind) => {

                 if (ind < 2 && !showMore) {
                  return (
                    <Button
                      className={isViewTasks ? 'widget-filter-text' : 'widget-filter-value'}
                      key={ind}
                      label={(val == "true" || val == true) ? "Yes" : String(val)}
                      onClick={(e) => { isViewTasks ? '' : clearSpecificValue(e, name); }}
                      icon={option?.isApplied?.includes(val) ? "pi pi-check" : ''}
                      iconPos="right"
                    />
                  )
                }
                else if (showMore) {
                  return (
                    <Button
                      className={isViewTasks ? 'widget-filter-text' : 'widget-filter-value'}
                      key={ind}
                      label={(val == "true" || val == true) ? "Yes" : String(val)}
                      onClick={(e) => { isViewTasks ? '' : clearSpecificValue(e, name); }}
                      icon={option?.isApplied?.includes(val) ? "pi pi-check" : ''}
                      iconPos="right"
                    />
                  )
                }

              })

              return (
                <Fragment key={option.key}>
                  <Button
                    label={name}
                    className={isViewTasks ? 'widget-filter-text' : 'widget-filter-value'}
                    id={isViewTasks ? '' : 'widget-filter-name'}
                    onClick={() => { isViewTasks ? '' : clearFilter(name); }}
                  />
                  <Button
                    label={isLabel}
                    className='widget-filter-text'
                  />
                  {selectedValues}
                  {option?.values?.length > 2 && !showMore ?
                    <Button
                      label={calculateMinimizedOptions(option?.values)}
                      className='widget-filter-text filter_more'
                      onClick={() => { showAllValues(option) }}
                    />
                  : null}
                  {option?.values?.length > 2 && showMore ?
                  <Button
                  label='Less'
                  className='widget-filter-text filter_less'
                  onClick={() => {
                    showLessValues(option)
                  }}
                  />
                  : null}
                  {(length - 1 === optInd) ? null
                    :
                    <Button
                      label={andLabel}
                      className='widget-filter-text'
                    />
                  }
                </Fragment>
              );
            })
          }
          </div>
          {!showAllFilters && overflowFlag ?
          <Button
          label='More'
          className='widget-filter-more'
          onClick={() => {
            setShowAllFilters(true)
          }} /> : null}
          </React.Fragment>
                <div>{showAllFilters ? <Button
                  label='Less'
                  className='widget-filter-more'
                  onClick={() => {
                    setShowAllFilters(false)
                  }} /> : null}
                </div>
          </div>              
        </div>
        {!isViewTasks ? <div className='widget-filter-button'>
        { isApply ?
            <Button
              label={disableApply ? 'Applied' : applyLabel}
              name={applyLabel}
              disabled={disableApply}
              className={disableApply ? 'widget-applied-filter' : 'icon icon icon-checkmark-circle widget-apply-filter'}
              onClick={(e) => { handleOnApply(e) }}
            />
            : null
          }
          <Button
            label={clearLabel}
            name={clearLabel}
            className="icon icon icon-arrow-left2 widget-filter-clear"
            onClick={() => { clearFilter(clearLabel); }}
          />
          </div> : "" }
        </div>
      {isViewTasks ? null :<PreCannedFilter
      {...props}
      contextState ={state}
      handleOnGo={handleOnGo}
      disableSave={disableSave}
      saveContextFilters={saveContextFilters}
      clearPrecanned={clearPrecanned}
      setClearPrecanned={setClearPrecanned}
      />}
      </div> ): null}
      <CountrySiteCohort  {...props}  reportData = {reportData} state = {state} clearItems={cscFilters} updateCscState={updateCscClearState}/>
    </div>
  )
}

WidgetFilter.defaultProps = {
  data: [],
  isLabel: 'IS',
  andLabel: 'AND',
  clearLabel: 'Clear',
  applyLabel: 'Apply'
}

export default WidgetFilter
