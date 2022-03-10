import React from 'react';
import Select from 'react-select';
import Combobox from '../../../../Combobox';
import ExposureStore from '../../../../../stores/ExposureStore';
import { fromJS, List } from 'immutable';

const KpiFilter = (props) => {

  let { handleKpis, currentTab, associatedFileIds, fileType = '', subCategoryTab = {},
    Name = '', disabled, fileTypeNameConstant } = props;

  let fileStore = ExposureStore.getExposureStore().toJS().fileConfigs;

  let fileList = Object.entries(fileStore).map(obj => Object.fromEntries([obj]));

  let changeFileTypeName = (fileType) => {
    if (fileType === fileTypeNameConstant.FOLDER) {
      return fileTypeNameConstant.FOLDERS
    }
    return fileType;
  }

  let kpiOptions = fileList.map(obj => {
    let file = obj[Object.keys(obj)];
    return {
      'value': file.id,
      'label': file.title,
      'fileType': changeFileTypeName(file.fileType)
    }
  });

  if (fileType === fileTypeNameConstant.MONITOR) {
    kpiOptions = kpiOptions.filter(file => file.fileType === fileTypeNameConstant.MONITOR)
  } else {
    kpiOptions = kpiOptions.filter(file => file.fileType === fileTypeNameConstant.DASHBOARD || file.fileType === fileTypeNameConstant.REPORT)
  }

  return (
    <React.Fragment>
      <Combobox
        className={`ract-assessment-kpi-filter-${Name}`}
        options={fromJS(kpiOptions)}
        multi={true}
        value={associatedFileIds && associatedFileIds.length ? List(associatedFileIds) : List()}
        onChange={(val) => { handleKpis(val, currentTab, subCategoryTab) }}
        groupBy='fileType'
        passOnlyValueToChangeHandler={false}
        clearable={true}
        placeholder={`${Name}-KPIs`}
        disabled={disabled}
      />
    </React.Fragment>
  )
}

KpiFilter.defaultProps = {
  optionsList: [],
  fileTypeNameConstant: {
    FOLDER: 'FOLDER',
    FOLDERS: 'FOLDERS',
    MONITOR: 'MONITOR',
    BUILTIN: 'BUILTIN',
    DASHBOARD:'DASHBOARD',
    REPORT:'REPORT'
  }
}

export default KpiFilter;
