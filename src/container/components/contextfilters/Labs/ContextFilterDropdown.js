import React, { useEffect, useState } from 'react';
import Util from "../../../util/util";
import { Dropdown } from 'primereact-opt/dropdown';

const ContextFilterDropdown = (props) => {
  let { exposureStore, options, placeholder, contextFilterOptions, dropdownLabel,  getLabs, loadData, abnormalOptions, setAbnormalCount, setSubjectsCountLoader, setDisableToggle, setActive } = props;

  const [selectedTest, setSelectedTest] = useState(null);
  const [dropdownOptions, setDropdownOptions] = useState([]);
  
  const removeSubjectWithAbnormalFilters = (immStore, reportData) => {
    let { aliasName, columnName, tableName } = abnormalOptions;
    Util.saveAndPublishEvent(reportData, aliasName, "clearAll", tableName, columnName, null, immStore);
  }

  const updateContextFilter = (e) => {
    let { aliasName, columnName, tableName } = contextFilterOptions;
    let immStore = exposureStore?.getExposureStore()?.toJS();
    let reportData = immStore?.files[props?.fileId]?.reportData;

    if (e.value == 'All') {
      Util.saveAndPublishEvent(reportData, aliasName, "clearAll", tableName, columnName, null, immStore);
      removeSubjectWithAbnormalFilters(immStore, reportData);
    }
    else {
      Util.saveAndPublishEvent(reportData, aliasName, [e.value], tableName, columnName, null, immStore);
    }
  }

  const changeData = async (e) => {
    setSubjectsCountLoader(() => true);
    setSelectedTest(() => e.value);
    updateContextFilter(e);

    if (e.value == "All") {
      setAbnormalCount(() => null);
      setActive(() => false);
      setDisableToggle(() => true);
    }
    else {
      let abnormalCounts = await loadData();
      let subjectWithAbnormalCount = abnormalCounts['abnormal'][0]?.count;
      setAbnormalCount(String(subjectWithAbnormalCount));
      setDisableToggle(false);
    }
    setSubjectsCountLoader(() => false);
  }

  useEffect(() => {
    if (options?.length) {
      setDropdownOptions(options);
      let labs = getLabs('rpt_lab_information', 'lbtest');
      labs[0]?.values?.length ? setSelectedTest(() => labs[0]?.values[0]) : setSelectedTest(() => null);
    }
  }, [options])

  return (
    <div className="cnt-filtr-drp">
      <label className="cnt-filtr-label">{dropdownLabel}</label>
      <Dropdown value={selectedTest} options={dropdownOptions} onChange={(e) => changeData(e)} placeholder={placeholder} />
    </div>
  );
}

export default ContextFilterDropdown;
