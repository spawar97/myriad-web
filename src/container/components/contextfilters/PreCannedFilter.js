import React, { useState } from 'react';
import { fromJS } from 'immutable';
import { Button } from 'primereact-opt/button';
import { InputText } from 'primereact-opt/inputtext';
import Select from '../Combobox';
import { useEffect } from 'react';
import Dialog from './Dialog';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import ExposureActions from '../../actions/ExposureActions';
import { getObject } from '../../util/SessionStorage';
import {TieredMenu} from "primereact-opt/tieredmenu";

const PreCannedFilter = (props) => {
  let { filterPlaceholder, exposureStore, goText, handleOnGo, saveLabel, saveAsLabel, disableSave, cancel, apply,
    saveContextFilters, dailogHeader, alertDailogHeader, dialogFilterName, clearPrecanned, setClearPrecanned, filterNameNote, contextState} = props;

  let { preCannedFiltersList } = exposureStore?.getExposureStore()?.toJS();
  let [showList, setShowList] = useState(false);
  let [hasContextItem, setContextItem]  = useState(false);
  const [showAlertDialog, setAlertShowDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedFilters, setSelectedFilters] = useState('');
  const [filterOptions, setFilterOptions] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [filterNameText, setFilterNameText] = useState('');
  let menu;

  useEffect(() => {
    filterOptions.length ? setShowList(true): setShowList(false);
  });

  useEffect(() => {
    contextState.length ? setContextItem(false): setContextItem(true);
  });

  let items = [
    {
      label: StatusMessageTypeConstants.PRESET,
      style: {fontWeight: 'bold'},
      className: 'preset'
      
    },
    {
      label: StatusMessageTypeConstants.SAVE_AS,
      disabled:hasContextItem ? true : false,
      command: () => {
        setShowDialog(true)
      }
    },
   {
      separator: true
    },
    {
      label: StatusMessageTypeConstants.SAVED_FILTERS,
      disabled: showList ? false : true,
      items: [...filterOptions],
    }
  ];


  const callPrecannedApi = async () => {
    let masterStudy = exposureStore.getExposureStore().get('masterStudyFilterContext');
    let studyName = masterStudy ?.state?.immSelectedStudies.toJS()[0]?.label;
    let args = {
      body : {"masterStudy" : studyName},
      url: `/api/contextfilter/list`
    }
    await exposureStore.getPreCannedFilterList(args).then((res) => {
      if (res?.Error) {

        throw new Error(res?.Error?.message);

      } else {
        let optionsList = res?.map(({ id, filterName, data }) => {
          return {
            value: id,
            label: filterName,
            contextJson: JSON.parse(data),
            command: (e) => {
              setSelectedItem(e);
              setAlertShowDialog(true)
            }
          }
        })

        setFilterOptions(optionsList);

        let defaultSelected = defaultSelectedFilterName(optionsList);
        setSelectedFilters(defaultSelected);
      }

    }).catch(err => {
      ExposureActions.createStatusMessage(
        err?.message,
        StatusMessageTypeConstants.WARNING,
      );
    })
  }

  const getPreCannedFilterOptions = async () => {

    if (!preCannedFiltersList) {
      await callPrecannedApi();
    } else {

      let optionsList = preCannedFiltersList?.map(({ id, filterName, data }) => {
        return {
          value: id,
          label: filterName,
          contextJson: JSON.parse(data),
          command: (e) => {
            setSelectedItem(e);
            setAlertShowDialog(true)
          }
        }
      })

      setFilterOptions(optionsList);
      let defaultSelected = defaultSelectedFilterName(optionsList);
      setSelectedFilters(defaultSelected)
    }

  }

  const defaultSelectedFilterName = (optionsList) => {
    let contextFilter = getObject("widgetContextFilter");

    let selectedOptions = [];
    
    optionsList.map((obj) => {
      if (_.isEqual(obj.contextJson, contextFilter)) {
        selectedOptions.push(obj);
      }
    });

    return selectedOptions?.[0];
  }

  useEffect(() => {
    getPreCannedFilterOptions();
  }, [])

  useEffect(() => {
    if (clearPrecanned && !_.isEmpty(selectedFilters)) {
      setSelectedFilters('');
    }
  }, [clearPrecanned])

  const handleOnClickGo = (e) => {
    setAlertShowDialog(false);
    if (!(_.isEmpty(e.item))) {
      handleOnGo(e.item);
    }
  }
  const handleInputChange = (e) => {
    let { value } = e.target;
    setFilterNameText(value);
  }

  const alertDialogContent = (
  <div className='save-content-dialog'>
    <div id='alert-label-filter'>
      <label>{StatusMessageTypeConstants.ALERT_MESSAGE}</label>
    </div>
  </div>
  )

  const hideAlertDialog = () => {
    setAlertShowDialog(false);
  }

  const alertDialogFooter = (
  <div className='save-button-container'>    
    <Button
    id='dialog-cancel-filter'
    label={cancel}
    name={cancel}
    onClick={(e) => { hideAlertDialog(); }}
    className='btn btn-secondary'
    />
    <Button
    id='dialog-apply-filter'
    label={apply}
    name={apply}
    onClick={(e) => { handleOnClickGo(selectedItem); }}
    className='btn btn-primary'
    />
  </div>
  )

  const dialogContent = (
    <div className='save-content-dialog'>
      <div id='label-filter'>
        <label>{dialogFilterName}</label>
      </div>
      <div className='input-filter-name'>
        <InputText
          id='input-box-filter'
          value={filterNameText}
          onChange={(e) => handleInputChange(e)}
          maxLength={32}
        />
        <small
          id="username2-help"
          className="p-error p-d-block"
        >
          {filterNameNote}
        </small>
      </div>
    </div>
  )

  const hideDialog = () => {
    setFilterNameText('');
    setShowDialog(false);
  }


 const handleOnSaveContextFilter = () => {
    saveContextFilters(filterNameText, callPrecannedApi, setShowDialog, filterOptions);
    hideDialog();
  }

  const dialogFooter = (
    <div className='save-button-container'>
      <Button
        id='dialog-save-filter'
        label={saveLabel}
        name={saveLabel}
        onClick={(e) => { handleOnSaveContextFilter(); }}
        disabled={filterNameText.trim() == ''}
        className={"btn btn-primary"}
      />
    </div>
  )

  return (
    <div className='pre-canned-filter-container'>
      <div className="card">
        <TieredMenu model={items}  popup ref={el => menu = el} id="popup_menu" className='filter_menu' />
        <Button label="" icon="pi pi-ellipsis-v" className={"precanned-button"} onClick={(event) => menu.toggle(event)} aria-controls="popup_menu" aria-haspopup />
        <Dialog
        visible={showDialog}
        onHide={() => { hideDialog(); }}
        header={<div id='dialog-header'>{dailogHeader}</div>}
        footer={dialogFooter}
        content={dialogContent}
        width={'30vw'}
        className="lsac_modal_ci"
        />
        <Dialog
        visible={showAlertDialog}
        onHide={() => { hideAlertDialog(); }}
        header={<div id='dialog-header'>{alertDailogHeader}</div>}
        footer={alertDialogFooter}
        content={alertDialogContent}
        width={'30vw'}
        className="lsac_modal_ci"
        />
      </div>
    </div>
  )
}


PreCannedFilter.defaultProps = {
  filterPlaceholder: 'precanned filter',
  goText: 'Go',
  apply: 'Apply',
  cancel : 'Cancel',
  saveAsLabel: 'Save As',
  saveLabel: 'Save',
  dialogFilterName: 'Filter Name',
  dailogHeader: 'Save Context Filter',
  alertDailogHeader:'',
  filterOptions: [],
  filterNameNote: 'Filtername should be less than 32 characters'
}

export default PreCannedFilter
