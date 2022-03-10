import React, { useCallback, useMemo } from 'react';
import InfoCards from './InfoCards';
import Utils from '../../../util/util';
import './infoCardContainer.scss'
const InfoCardsContainer = (props) => {
  let { dataCache, exposureStore, fileId } = props;
  let fetchedData = dataCache?.[0]?.['data'] || [];
  let immStore = exposureStore?.getExposureStore()?.toJS();
  let reportData = immStore?.files[fileId]?.reportData;
  let getFetchedValue = useCallback((name) => {
    let cardData = fetchedData[name]?.[0];
    return cardData && Object.values(cardData)
  }, [fetchedData]);
  let infoCardList1= useMemo(() => [
    {
      name: 'cm1',
      header: <span id='cm1-header'>{getFetchedValue('cm1&cm7')?.[0] == 0 || getFetchedValue('cm1&cm7')?.[0]? getFetchedValue('cm1&cm7')?.[0] : '--'}</span>,
      footer: 'Total Count of Distinct CMs',
      columnName: 'cmdecode_flag',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Total Count of Distinct CMs',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm2',
      header: <span id='cm2-header'>{getFetchedValue('cm2&cm3')?.[0] || '--'}</span>,
      footer: 'Total Count of Subjects with CMs',
      columnName: 'cmdecode_flag',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Total Count of Subjects with CMs',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm3',
      header: <span id='cm3-header'>{Number(((getFetchedValue('cm2&cm3')[0] / getFetchedValue('cm3&cm7')[0]) * 100)?.toFixed(2)) || '--'}%</span>,
      footer: '% of Subjects with CM',
      columnName: 'cmdecode_flag',
      tableName: 'vw_sme_cm_detail',
      widgetName: '% of Subjects with CM',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm4',
      header: <span id='cm4-header'>{getFetchedValue('cm4')?.[0] == 0 || getFetchedValue('cm4')?.[0]? getFetchedValue('cm4')?.[0] : '--'}</span>,
      footer: 'CMs without Medical Indications',
      columnName: 'cmdecod',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'CMs without Medical Indications',
      selectedFilterText: `${getFetchedValue('cm4')?.[0] || ''}`
    },
    {
      name: 'cm5',
      content: <span id='cm5-content'>{getFetchedValue('cm5')?.[1] || '--'}</span>,
      header: <span id='cm5-header'>{getFetchedValue('cm5')?.[0] || '--'}</span>,
      footer: 'CM with highest subjects',
      columnName: 'cmdecod',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'CM with highest subjects',
      selectedFilterText: `${getFetchedValue('cm5')?.[0] || ''}`
    },
    {
      name: 'cm7',
      header: <span id='cm7-header'>{Number(((getFetchedValue('cm1&cm7')?.[0]) / (getFetchedValue('cm3&cm7')?.[0]))?.toFixed(2)) || '--'}</span>,
      footer: 'Average CM count',
      columnName: 'cmdecode_flag',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Average CM count',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm9',
      content: <span id='cm9-content'>{getFetchedValue('cm9')?.[1] || '--'}</span>,
      header: <span id='cm9-header'>{getFetchedValue('cm9')?.[0] || '--'}</span>,
      footer: 'Site with highest subjects using CM',
      columnName: 'siteid',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Site with highest subjects using CM',
      selectedFilterText: `${getFetchedValue('cm9')?.[0] || ''}`
    }
    
  ], [fetchedData]);
  let infoCardList2 = useMemo(() => [
 
    {
      name: 'cm10',
      content: <span id='cm10-content'>{getFetchedValue('cm10')?.[1] || '--'}</span>,
      header: <span id='cm10-header'>{getFetchedValue('cm10')?.[0] || '--'}</span>,
      footer: 'Most Frequent CM indications',
      columnName: 'cmindc',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Most Frequent CM indications',
      selectedFilterText: `${getFetchedValue('cm10')?.[0] || ''}`
    },
    {
      name: 'cm11',
      header: <span id='cm11-header'>{getFetchedValue('cm11')?.[0] == 0 || getFetchedValue('cm11')?.[0]? getFetchedValue('cm11')?.[0] : '--'}</span>,
      footer: 'Count of subjects with ongoing CMs',
      columnName: 'cmongo',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Count of subjects with ongoing CMs',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm12',
      header: <span id='cm12-header'>{getFetchedValue('cm12')?.[0] == 0 || getFetchedValue('cm12')?.[0]? getFetchedValue('cm12')?.[0] : '--'}</span>,
      footer: 'Count of ongoing CMs',
      columnName: 'cmongo',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Count of ongoing CMs',
      selectedFilterText: 'Yes'
    },
    {
      name: 'cm14',
      content: <span id='cm14-content'>{getFetchedValue('cm14')?.[1] || '--'}</span>,
      header: <span id='cm14-header'>{getFetchedValue('cm14')?.[0] || '--'}</span>,
      footer: 'Site with highest CM count',
      columnName: 'siteid',
      tableName: 'vw_sme_cm_detail',
      widgetName: 'Site with highest CM count',
      selectedFilterText: `${getFetchedValue('cm14')?.[0] || ''}`
    }
  ], [fetchedData]);
  const handleOnClick = useCallback((e) => {
    Utils.saveAndPublishEvent(reportData, e.widgetName, e.selectedFilterText, e.tableName, e.columnName, null, immStore);
  }, [reportData, immStore]);
  return <div><div className='items total-item-7'><InfoCards infoCardList={infoCardList1} handleOnClick={handleOnClick}/></div>
            <div className='items total-item-4'><InfoCards infoCardList={infoCardList2} handleOnClick={handleOnClick} /></div></div>
}
export default React.memo(InfoCardsContainer);
