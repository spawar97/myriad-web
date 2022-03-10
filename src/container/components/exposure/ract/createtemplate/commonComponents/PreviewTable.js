import React, { useEffect, useRef } from "react";
import 'datatables/media/js/jquery.dataTables.min';
import 'datatables/media/css/jquery.dataTables.css';
import FrontendConstants from '../../../../../constants/FrontendConstants';

const PreviewTable = (props) => {

  const { data, index, enabled } = props;

  const enabledData = (allData) => {
    let refinedData = allData.filter(function( obj ) {
      return obj.enable !== false;
    });
    return refinedData;
  }

  const customData = (data) => {
    const result = enabledData(data).map(({id, categoryId, enable, updateFlag, ...rest}) => ({...rest}));
    for(let i = 0; i < result.length; i++){
      result[i]["Risk Subcategory"] = result[i]["name"];
      result[i]["Risk Question for Discussion"] = result[i]["question"];
      result[i]["Risk Consideration"] = result[i]["consideration"];

      delete result[i]["name"];
      delete result[i]["question"];
      delete result[i]["consideration"];
      result[i]["type"] ? delete result[i]["type"] : null
      result[i]["updateFlag"] ? delete result[i]["updateFlag"] : null
    }
    return result;
  }

  const makeTableHTML = (id, data) => {
    let refinedData = customData(data);
    if (refinedData.length){
      let columnData = Object.keys(refinedData && refinedData[0]);
      let columnValues = refinedData.map(values => { return Object.values(values) });
  
      let result = `<table id=${id} class=display>`;
      result += "<thead><tr>";
      for (let m in columnData) {
        result += "<th>" + columnData[m] + "</th>";
      }
      result += "</tr></thead>";
      result += "<tbody>"
      for (let i in columnValues) {
        result += "<tr>";
        for (let j in columnValues[i]) {
          result += "<td>" + columnValues[i][j] + "</td>";
        }
        result += "</tr>";
      }
      result += "</tbody>";
      result += "</table>";
      return result
    }
    else {
      return showPreviewMessage(FrontendConstants.RACT_PREVIEW, FrontendConstants.RACT_SUBCATEGORY_DISABLED)
    }
  };

  const showPreviewMessage = (header, body) => {
    return `<div class="report-filter-notice" noresize=1>
      <div class="report-filter-notice-text-holder">
        <div class="report-filter-notice-header">
          <span class="icon-information_solid"></span>
          <span class="report-filter-notice-text">${header}</span>
        </div>
        <div class="errorBody"><span class="report-filter-notice-sub-text">${body}</span></div>
      </div>
    </div>`;
  }

  const content = useRef(null);

  useEffect(() => {
    if ($(`#preview-table-${index}`).length){
      $(`#preview-table-${index}`).DataTable({
        "bDestroy": true,
        "paging":   false,
        "scrollY":  true,
        "scrollCollapse": true,
        bFilter: false,
        bInfo: false,
        "columnDefs": [
          { "width": "25%", "targets": 0 },
          { "width": "30%", "targets": 1, "sortable": false },
          { "width": "45%", "targets": 2, "sortable": false }
        ]
      });
    }
  }, [props.data]);

  return <React.Fragment>
    <div className="preview-container" dangerouslySetInnerHTML={{ __html: enabled && data.length > 0 ? makeTableHTML(`preview-table-${index}`, data) : showPreviewMessage(FrontendConstants.RACT_PREVIEW, FrontendConstants.RACT_CATEGORY_DISABLED) }} >
    </div>
  </React.Fragment>;
}

export default React.memo(PreviewTable);
