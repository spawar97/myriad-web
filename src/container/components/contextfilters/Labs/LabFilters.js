import React, { useEffect, useState } from 'react';
import ContextFilterDropdown from './ContextFilterDropdown';
import ToggleButton from '../../../components/ToggleButton';
import Util from '../../../util/util';
import { getObject } from '../../../util/SessionStorage';
import ComprehendQuery from "../../../lib/ComprehendQuery";
import ExposureActions from "../../../actions/ExposureActions";
import FrontendConstants from '../../../constants/FrontendConstants';
import CustomLoader from './CustomLoader';

const LabFilters = (props) => {
  let { exposureStore, abnormalOptions, selectedValues } = props;
  const [active, setActive] = useState(false);
  const [abnormalCount, setAbnormalCount] = useState(null);
  const [subjectsCountLoader, setSubjectsCountLoader] = useState(false);
  const [disAbleToggle, setDisableToggle] = useState(true);

  const updateContextFilter = (e) => {
    let { aliasName, columnName, tableName } = abnormalOptions;
    let immStore = exposureStore?.getExposureStore()?.toJS();
    let reportData = immStore?.files[props?.fileId]?.reportData;

    if (active) {
      Util.saveAndPublishEvent(reportData, aliasName, "clearAll", tableName, columnName, null, immStore);
    }
    else {
      Util.saveAndPublishEvent(reportData, aliasName, "true", tableName, columnName, null, immStore);
    }
    setActive(!active);
  }

  const checkIfPresentInContextFilters = (tableName, columnName) => {
    let widgetFilters = getObject('widgetContextFilter');
    let data = widgetFilters?.filter((obj) => obj.columnName == columnName &&  obj.tableName == tableName);
    return data;
  }

  const loadData = async () => {
    let { fileId, exposureStore, abnormalOptions } = props;
    let { query, dataParser } = abnormalOptions;

    let immQueryOptionsWrapper = exposureStore?.getImmQueryOptionsWrapper(fileId);
    let taskFilters = exposureStore?.getExposureStore()?.toJS()?.fetchedTaskFilters;

    let value = await ComprehendQuery.filterWidgetAsyncQuery(fileId, immQueryOptionsWrapper, query, null, false, taskFilters, true).then((res) => {
     
      if (res?.Error) {
        throw new Error(res?.Error?.message);
      } 
      else {
        let rowData = res && _.pluck(res?.reportData, "rows");
        let parseData = res && dataParser(rowData, query);      
        return parseData;
      }
    }).catch(err => {
      ExposureActions.createStatusMessage(
        err?.message,
        StatusMessageTypeConstants.WARNING,
      );
    });

    return value;
  }

  const updateAbnormalCount = async () => {
    setSubjectsCountLoader(true);
    let abnormalCounts = await loadData();
    let subjectWithAbnormalCount = abnormalCounts['abnormal'][0]?.count;
    setAbnormalCount(String(subjectWithAbnormalCount));
    setSubjectsCountLoader(false);
  }

  useEffect(() => {
    let labs = checkIfPresentInContextFilters('rpt_lab_information', 'lbtest');
    let subjectsEnabled = checkIfPresentInContextFilters('rpt_lab_information', 'issubjabnormal');

    if (labs[0]?.values?.length) {
      updateAbnormalCount();
      setDisableToggle(false);

      if (subjectsEnabled[0]?.values?.length) {
        setActive(true);
      }
      else {
        setActive(false);
      }
    }
    else {
      setAbnormalCount(null);
      setActive(false);
      setDisableToggle(true);
    }

  }, [selectedValues]);

  return (
    <div className='lab-filtrs'>
      <div className='lab-filtr'>
        <ContextFilterDropdown {...props} 
          setAbnormalCount={setAbnormalCount} 
          setSubjectsCountLoader={setSubjectsCountLoader}
          setDisableToggle={setDisableToggle}
          setActive={setActive}
          getLabs={checkIfPresentInContextFilters} 
          loadData={loadData}
        />
      </div>
      <div className='lab-toggle'>
        {subjectsCountLoader ? <CustomLoader /> : <div className="abnormal-subjects">
          <div className={disAbleToggle ? 'abnormal-label-class disabled' : 'abnormal-label-class'}>
            Subjects with abnormal values {abnormalCount ? `(${abnormalCount})` : null}
          </div>
          <ToggleButton 
            id={"enble-tggle"} 
            isActive={active} 
            activeText={FrontendConstants.CHECKMARK}
            onClick={(e) => updateContextFilter(e)} 
            className="enable-abnormal-button" 
            disabled={disAbleToggle} 
          />
        </div>}
      </div>
    </div>
  );
}

export default LabFilters;
