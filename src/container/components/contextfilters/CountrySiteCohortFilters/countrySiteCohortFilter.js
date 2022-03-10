import React, { useState } from 'react';
import "./countryFilter.scss";
import { useEffect } from 'react';
import StatusMessageTypeConstants from '../../../constants/StatusMessageTypeConstants';
import ExposureActions from '../../../actions/ExposureActions';
import Util from "../../../util/util";
import {getObject} from "../../../util/SessionStorage";
import Combobox from "../../Combobox";
var Imm = require('immutable');

const CountrySiteCohort = (props) => {
  let all = 'All';
  let defaultObject = [{label:all,value:all}]
  let { exposureStore, fileId , clearItems, updateCscState} = props;
  let immStore = exposureStore?.getExposureStore()?.toJS();
  let { countryFilterList, isViewTasks } = immStore;
  const [selectedFilters, setSelectedFilters] = useState(defaultObject);
  const [countryItemFilter, setCountryItemFilters] = useState(defaultObject);
  const [siteSelectedFilters, setSiteSelectedFilters] = useState(defaultObject);
  const [siteItemFilter, setSiteItemFilters] = useState(defaultObject);
  const [cohortSelectedFilters, setCohortSelectedFilters] = useState(defaultObject);
  const [cohortItemFilter, setCohortItemFilters] = useState(defaultObject);
  const [filterOptions, setFilterOptions] = useState([]);
  const [siteFilterOptions, setSiteFilterOptions] = useState([]);
  const [cohortFilterOptions, setCohortFilterOptions] = useState([]);
  const [itemList, setItemList] = useState([]);
  const [mainOptionList, setMainOptionList] = useState([]);
  const [cohortValues, setCohortValues] = useState(defaultObject);
  const [siteValues, setSiteValues] = useState(defaultObject);
  const [countryValues, setCountryValues] = useState(defaultObject);
  let [hasSession, setStartSession] = useState(false)

  const callCountryApi = async () => {
    await exposureStore.getCountryFilterList(fileId).then((res) => {
      if (res?.Error) {
        throw new Error(res?.Error?.message);
      } else {
        setItemList(res);
        let optionsList = res.reportData[0].rows.map((obj) => {
          var optionObj = {}
          optionObj.country = obj.values[0];
          optionObj.site = obj.values[1];
          optionObj.arm = obj.values[2];
          return optionObj
        })
        setMainOptionList(optionsList);

        let countryFilterListItem = getData(optionsList, 'country');
        setFilterOptions(countryFilterListItem);

        let siteFilterList = getData(optionsList, 'site');
        setSiteFilterOptions(siteFilterList);

        let cohortFilterList = getData(optionsList, 'arm');
        setCohortFilterOptions(cohortFilterList);
      }
    }).catch(err => {
      ExposureActions.createStatusMessage(
      err?.message,
      StatusMessageTypeConstants.WARNING,
      );
    })
  }

  function sortArray(x, y){
    if (x.value < y.value) {return -1;}
    if (x.value > y.value) {return 1;}
    return 0;
  }

  const getFilterOptions = async () => {
    if (!countryFilterList) {
      await callCountryApi();
    } else {
      let optionsList = countryFilterList.reportData[0]?.rows.map((obj) => {
        var optionObj = {}
        optionObj.country = obj.values[0];
        optionObj.site = obj.values[1];
        optionObj.arm = obj.values[2];
        return optionObj;
      })
      setMainOptionList(optionsList)

      if(!hasSession){
        setStartSession(true);
        let defaultSelectedCountry = defaultSelectedFilterName('Country');
        defaultSelectedCountry ? setCountryItemFilters(defaultSelectedCountry): setCountryItemFilters(countryItemFilter);

        let defaultSelectedSite = defaultSelectedFilterName('Site');
        defaultSelectedSite ?  setSiteItemFilters(defaultSelectedSite) : setSiteItemFilters(siteItemFilter);

        let defaultSelectedCohort = defaultSelectedFilterName('Cohort');
        defaultSelectedCohort ?  setCohortItemFilters(defaultSelectedCohort) : setCohortSelectedFilters(cohortSelectedFilters);
      }
    }
  }

  const defaultSelectedFilterName = (key) => {
    let contextFilter = getObject("widgetContextFilter");
    let element;
    let keyItem = contextFilter.filter(function (itm) { if(itm.widgetname == key){ return itm} });
    let keySpecificVal = keyItem.length > 0 ? keyItem[0].values : undefined;
    if(keyItem.length > 0) {
      element = keySpecificVal.map((obj) => {
        return {value: obj, label: obj}
      })
    }
    return  element;
  }

  useEffect(() => {
    if (isViewTasks) {
      let taskFilters = JSON.parse(immStore.fetchedTaskFilters);
      let cohortValues = [];
      let siteValues = [];
      let countryValues = [];
      taskFilters.length && taskFilters.forEach(item => {
        if (item.widgetname == 'Cohort') {
          item.values.forEach(value => {
            cohortValues.push({ label: value, value: value });
          });
        } else if (item.widgetname == 'Site') {
          item.values.forEach(value => {
            siteValues.push({ label: value, value: value });
          });
        } else if (item.widgetname == 'Country') {
          item.values.forEach(value => {
            countryValues.push({ label: value, value: value });
          });
        }
      });

      siteValues.length ? setSiteValues(siteValues) : '';
      countryValues.length ? setCountryValues(countryValues) : '';
      cohortValues.length ? setCohortValues(cohortValues) : '';
    }
  }, [])


  useEffect(() => {
    if (clearItems) {
      setCountryItemFilters(defaultObject);
      setSiteItemFilters(defaultObject);
      setCohortItemFilters(defaultObject);
      setSelectedFilters(defaultObject);
      setSiteSelectedFilters(defaultObject);
      setCohortSelectedFilters(defaultObject)
      updateCscState();
    }},[clearItems]);

  useEffect(() => {
      getFilterOptions();
      getFinalObject();
      setSelectedFilters(selectedFilters);
      setMainOptionList(mainOptionList)
      setSiteSelectedFilters(siteSelectedFilters);
      setCohortSelectedFilters(cohortSelectedFilters);
      if (hasSession) {
        setCountryItemFilters(countryItemFilter);
        setSiteItemFilters(siteItemFilter);
        setCohortItemFilters(cohortItemFilter);
      }
  }, [cohortSelectedFilters,cohortItemFilter,mainOptionList, selectedFilters,countryItemFilter,siteSelectedFilters,siteItemFilter])

  function getData(itemArray, keyVal){
    let itmFilter = _.pluck(itemArray, keyVal).map((obj) => { return {value: obj, label: obj} });
    let filteredItems = itmFilter ? [...new Map(itmFilter.map(item =>
    [item['value'], item])).values()] : [];
    filteredItems.sort(sortArray);
    return filteredItems;
  }

  function getFilterArray(param){
    let firstItemList, secondItemList, firstKeyValue, secondKeyValue, finalResult;
    firstItemList = param.firstItemList;
    secondItemList = param.secondItemList;
    firstKeyValue = param.firstKeyValue;
    secondKeyValue = param.secondKeyValue;

    finalResult = mainOptionList.filter(function (itm) {
      if(firstItemList[0] == all && secondItemList[0] == all){ return itm }
      else if(firstItemList[0] != all && secondItemList[0] == all){ return firstItemList.indexOf(itm[firstKeyValue]) > -1}
      else if(firstItemList[0] == all && secondItemList[0] != all){ return secondItemList.indexOf(itm[secondKeyValue]) > -1;}
      else if(firstItemList[0] != all && secondItemList[0] != all){
        return firstItemList.indexOf(itm[firstKeyValue]) > -1 && secondItemList.indexOf(itm[secondKeyValue]) > -1;}
    });
    return finalResult;
  }

  function getFinalObject(){
    let countryNames = _.pluck(countryItemFilter, 'value').map((obj) => {
      return obj ;
    })
    let siteNames =  _.pluck(siteItemFilter, 'value').map((obj) => {
      return obj ;
    })
    let cohortNames =  _.pluck(cohortItemFilter, 'value').map((obj) => {
      return obj ;
    })

    let countryParam = {
      firstItemList : siteNames,
      secondItemList : cohortNames,
      firstKeyValue: 'site',
      secondKeyValue :'arm'
    }
    let countryArray =  getFilterArray(countryParam);

    let siteParam = {
      firstItemList : countryNames,
      secondItemList : cohortNames,
      firstKeyValue: 'country',
      secondKeyValue :'arm'
    }
    let siteArray = getFilterArray(siteParam);

    let cohortParam = {
      firstItemList : countryNames,
      secondItemList : siteNames,
      firstKeyValue: 'country',
      secondKeyValue :'site'
    }
    let cohortArray = getFilterArray(cohortParam);

    let countryFilterItems = getData(countryArray, 'country');
    setFilterOptions(countryFilterItems);

    let siteFilterList = getData(siteArray, 'site');
    setSiteFilterOptions(siteFilterList);

    let cohortFilterList = getData(cohortArray, 'arm');
    setCohortFilterOptions(cohortFilterList);
  }

  function publishItem(args){
    let updatesFilterState, selectedVal,  widgetName, colName;
    updatesFilterState = args.setUpdatedFilterOpt;
    selectedVal = args.publishItem;
    widgetName = args.publishWidget;
    colName = args.columnName;

    updatesFilterState(selectedVal);
    if(selectedVal && selectedVal[0].label != all){
      for(let i= 0 ;i < selectedVal.length ;i++)
      {
        Util.saveAndPublishEvent(props.reportData, widgetName, selectedVal[i].label, 'vw_sme_subject_detail', colName,null, immStore);
      }
    }
  }

  useEffect(() => {
      if(countryItemFilter[0].value !== all){
      getFinalObject()
    }

    if (!_.isEmpty(selectedFilters)) {
      let publishObj = {
        setUpdatedFilterOpt:setSelectedFilters,
        publishItem:selectedFilters,
        publishWidget:'Country',
        columnName:'sitecountry',
      }
      publishItem(publishObj);
    }
  }, [selectedFilters,countryItemFilter])


  useEffect(() => {
    if(siteItemFilter[0].value !== all) {
     getFinalObject()
    }
    if (!_.isEmpty(siteSelectedFilters)) {
      let publishObj = {
        setUpdatedFilterOpt:setSiteSelectedFilters,
        publishItem:siteSelectedFilters,
        publishWidget:'Site',
        columnName:'siteid',
      }
      publishItem(publishObj);
    }
  }, [siteSelectedFilters, siteItemFilter])

  useEffect(() => {
    if(cohortItemFilter.value !== all){
      getFinalObject()
    }
    if (!_.isEmpty(cohortSelectedFilters)) {
      let publishObj = {
        setUpdatedFilterOpt:setCohortSelectedFilters,
        publishItem:cohortSelectedFilters,
        publishWidget:'Cohort',
        columnName:'arm',
      }
      publishItem(publishObj);
    }
  }, [cohortSelectedFilters, cohortItemFilter])

  function removeAllElements(itemState){
    let element;
    if(itemState && itemState.values.length > 1){
      element = itemState.values.map((obj)=>{
        return {value: obj,label:obj}
      })
    }
    else{
      element = itemState? [{value: itemState.values[0], label: itemState.values[0]}] : defaultObject
    }
    return element;
  }

  function handleAllFilter(args){
    let itemPresent, optionVal, preState, selectedIndex, selectedValue, setUpdateFiltersList, stateElement, updateFilterVal, updatedCountry, widgetName;
    let itemValues = [];

    widgetName =  args.widget;
    optionVal = args.selectedItems;
    updateFilterVal  = args.setFilterOpt ;
    setUpdateFiltersList =args.setUpdatedFilterOpt;

     updatedCountry =  props.state.length > 0 ? props.state.find((obj) => obj.widgetname == widgetName): undefined;
    if (optionVal.length != 0) {
        if (optionVal[0].label == all) {
          optionVal.shift();
        }
      preState = updatedCountry ? updatedCountry.values : undefined;
      if (preState && preState.length > optionVal.length) {
        for (let i = 0; i < preState.length; i++) {
          stateElement = {value: preState[i], label: preState[i]}
          itemPresent = optionVal.some(optionVal => optionVal.value === stateElement.value)
          if (!itemPresent) {
            selectedValue = itemValues.push(stateElement)
            updateFilterVal(itemValues);
          }
        }
      } else {
        selectedIndex = optionVal.length - 1;
        selectedValue = optionVal.length > 1 ? [optionVal[selectedIndex]] : optionVal;
        updateFilterVal(selectedValue);
      }
       setUpdateFiltersList(optionVal);
    }
    else {
      let element =  removeAllElements(updatedCountry);
      updateFilterVal(element);
       setUpdateFiltersList(defaultObject);
    };
  }

  const handleOnChangeCountryFilters = (selectedOption) => {
    let countryFilters = [];
    selectedOption.forEach(item => {
      countryFilters.push({label: item, value: item});
    });
    let countryArgs = {
      widget: 'Country',
      selectedItems:countryFilters,
      setFilterOpt:setSelectedFilters,
      setUpdatedFilterOpt:setCountryItemFilters
    }
    handleAllFilter(countryArgs);
  }

  const handleOnChangeSiteFilters = (siteSelectedOption) => {
    let siteFilters = [];
    siteSelectedOption.forEach(item => {
      siteFilters.push({label: item, value: item});
    });
    let siteArgs = {
      widget: 'Site',
      selectedItems:siteFilters,
      setFilterOpt:setSiteSelectedFilters,
      setUpdatedFilterOpt:setSiteItemFilters
    }
    handleAllFilter(siteArgs);
  }

  const handleOnChangeCohortFilters = (cohortSelectedOption) => {
    let cohortFilters = [];
    cohortSelectedOption.forEach(item => {
      cohortFilters.push({label: item, value: item});
    });
    let cohortArgs = {
      widget: 'Cohort',
      selectedItems:cohortFilters,
      setFilterOpt:setCohortSelectedFilters,
      setUpdatedFilterOpt:setCohortItemFilters
     }
    handleAllFilter(cohortArgs);
  }


  return (
  <div className= "flexSection">
    <div className="boxSection">
      <span className={"spanHeader"}>Country</span><br/>
      <Combobox
      className={"itemNameSelect"}
      abbreviationThreshold= {1} 
      options={Imm.fromJS(filterOptions).toOrderedSet()}
      placeholder={'Country'}
      multi={true}
      clearable={true}
      onChange={(event) => handleOnChangeCountryFilters(event)}
      value={isViewTasks ? Imm.fromJS([...countryValues]) : Imm.fromJS([...countryItemFilter])}
      disabled={isViewTasks}
      />
    </div>
    <div className="boxSection">
      <span className={"spanHeader"}>Site</span><br/>
      <Combobox
      className={"itemNameSelect"}
      abbreviationThreshold= {1}
      options={Imm.fromJS(siteFilterOptions).toOrderedSet()}
      placeholder={'Site Id'}
      multi={true}
      clearable={true}
      onChange={(event) => handleOnChangeSiteFilters(event)}
      value={isViewTasks ? Imm.fromJS([...siteValues]) : Imm.fromJS([...siteItemFilter])}
      disabled={isViewTasks}
      />
    </div>
    <div className="boxSection">
      <span className={"spanHeader"}>Cohort</span><br/>
      <Combobox
      className={"itemNameSelect"}
      abbreviationThreshold= {1}
      options={Imm.fromJS(cohortFilterOptions).toOrderedSet()}
      placeholder={'Cohort'}
      multi={true}
      clearable={true}
      onChange={(event) => handleOnChangeCohortFilters(event)}
      value={isViewTasks ? Imm.fromJS([...cohortValues]) : Imm.fromJS([...cohortItemFilter])}
      disabled={isViewTasks}
      />
    </div>
  </div>
  )
}

CountrySiteCohort.defaultProps = {
  filterPlaceholder: '',
  filterOptions: []
}

export default CountrySiteCohort
