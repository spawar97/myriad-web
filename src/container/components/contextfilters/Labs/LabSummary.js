import React, { useState, useEffect  } from 'react';
import Util from "../../../util/util";
import PrimeTable from "../../prime-react/PrimeTable"; 
import { Dropdown } from 'primereact-opt/dropdown';

const LabSummary = (props) => {
  let { exposureStore, tableData, columnsList } = props;

  const [selectedTest, setSelectedTest] = useState(null);
  const [options, setOptions] = useState([]);
  const [data, setData] = useState({ tableData } || { });
  const [contextFilterOptions, setContextFilterOptions] = useState({});
  const [selectedField, setSelectedField] = useState(null);
  const [placeholder, setPlaceholder] = useState(null);

  const updateContextFilter = (e) => {
    let { aliasName, columnName, tableName } = contextFilterOptions;
    let immStore = exposureStore?.getExposureStore()?.toJS();
    let reportData = immStore?.files[props?.fileId]?.reportData;

    if (e.value !== 'All') {
      Util.saveAndPublishEvent(reportData, aliasName, [e.value], tableName, columnName, null, immStore);
    }
    else {
      Util.saveAndPublishEvent(reportData, aliasName, [], tableName, columnName, null, immStore);
    }
  }

  const changeData = (e) => {
    if (e.value == 'All') {
      setData({ tableData: tableData });
    }
    else {
      let updatedData = tableData?.filter((obj) => obj?.data[selectedField] == e?.value);
      setData({ tableData: updatedData });
    }    
    setSelectedTest(() => e.value);
    updateContextFilter(e)
  }

  useEffect(() => {

    let dropdownCol = columnsList?.filter((obj) => obj.addDropdown)[0];
    let dropDownField = dropdownCol?.field;
    let cnxtFiltrOpts = dropdownCol?.contextFilterOptions;
    let drpOptions = _.uniq(tableData.map((obj) => obj.data[dropDownField]));
    let drpPlaceholder = dropdownCol?.dropdownPlaceholder;

    let testOptions = [{ label: 'All', value: 'All' }];
    drpOptions.map((ele) => { 
      testOptions.push({ label: ele, value: ele })
    })

    setContextFilterOptions(cnxtFiltrOpts);
    setOptions(() => testOptions);
    setSelectedField(() => dropDownField);
    setPlaceholder(() => drpPlaceholder);
  }, [tableData, data]);

  return (
    <div id="lab-summry">
      <Dropdown value={selectedTest} options={options} onChange={(e) => changeData(e)} placeholder={placeholder} />
      <PrimeTable {...{...props, ...data}}/>
    </div>
  );
}

export default LabSummary;
