import InfoComponent from "./Infographics";
import Utils from "../../../util/util";

const StudyInfoWidgets = (props) => {
  let {exposureStore, fileId} = props;
  let statusTerm = 'Yes';
  let highchartConfigs = props['pieChartData'];
  let tableDataDetails = props['tableData'];
  let ScreenArgs = {
    showReason: 'none',
    widgetName: 'Screened Subjects',
    title: 'Screened Subjects',
    columnName: 'screened_status',
    tableName: 'vw_sme_subject_detail',
    selectedVal: props["dataInfo"][0].data?.info1?.[0]?.count || '--',
    reason: '',
    filterText: statusTerm
  }
  let deathArgs = {
    showReason: 'none',
    widgetName: 'Deaths',
    title: 'Deaths',
    columnName: 'death_status',
    tableName: 'vw_sme_subject_detail',
    selectedVal: props["dataInfo"][0].data?.info2?.[0]?.count || '--',
    reason: '',
    filterText: statusTerm
  }
  let screenFailArgs = {
    showReason: 'block',
    widgetName: 'Screen Failure',
    title: 'Screen Failure',
    columnName: 'screen_failed_status',
    tableName: 'vw_sme_subject_detail',
    selectedVal: props["dataInfo"][0].data?.info3?.[0]?.count || '--',
    reason: '',
    filterText: statusTerm
  }
  let subjectWithdrawn = {
    showReason: 'none',
    widgetName: 'Subjects',
    title: 'Total Subjects Withdrawn',
    columnName: 'dsevent',
    tableName: 'vw_sme_subject_disposition',
    selectedVal: props["dataInfo"][0].data?.info4?.[0]?.count || '--',
    reason: '',
    filterText: 'WITHDRAWN'
  }
  let immStore = exposureStore?.getExposureStore()?.toJS();
  let reportData = immStore?.files[props?.fileId]?.reportData;


  const handleOnChange = (e) => {
    Utils.saveAndPublishEvent(reportData, e.widgetName, e.filterText, e.tableName, e.columnName, null, immStore);
  }

  return (
    <>
      <div className="items total-item-2">

        <InfoComponent config={ScreenArgs} handleOnCardEvent={handleOnChange}></InfoComponent>
        <InfoComponent config={deathArgs} handleOnCardEvent={handleOnChange}></InfoComponent>
      </div>
      <div className="items total-item-2">
        <InfoComponent config={screenFailArgs} handleOnCardEvent={handleOnChange} highchartConfigs={highchartConfigs}
                      tableDataDetails={tableDataDetails}></InfoComponent>
        <InfoComponent config={subjectWithdrawn} handleOnCardEvent={handleOnChange}></InfoComponent>

      </div>
    </>
  );
}
export default StudyInfoWidgets
