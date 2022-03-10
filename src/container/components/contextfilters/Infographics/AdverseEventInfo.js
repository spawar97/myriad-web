import InfoComponent from "./Infographics";
import Utils from "../../../util/util";

const AdverseEventInfo = (props) => {
  let { exposureStore } = props;

  let immStore = exposureStore?.getExposureStore()?.toJS();
  let reportData = immStore?.files[props?.fileId]?.reportData;

  const handleOnChange = (e) => {
    Utils.saveAndPublishEvent(reportData, e.widgetName, e.filterText, e.tableName, e.columnName, null, immStore);
  }

  const createInfoComponents = (configs) => {
    let infographics = [];

    configs?.map((config) => {
      let component = <InfoComponent config={config} handleOnCardEvent={handleOnChange}/>
      infographics.push(component);
    })

    return infographics;
  }

  return (
    <div id="info-widget-section">
      <div className="items total-item-2">
        {createInfoComponents(props.row1)}
      </div>
      <div className="items total-item-2">
        {createInfoComponents(props.row2)}
      </div>
    </div>
  );
}

export default AdverseEventInfo;
