import React, {useEffect, useState} from 'react';
import "./infograp.scss";
import ReportGraph from "./ReportGraph";
import {getObject} from "../../../util/SessionStorage";
import { ReactGrid } from '../../../NavigationMapping';

const InfoGraphics = (props) => {
  let {config, handleOnCardEvent, highchartConfigs, tableDataDetails} = props;
  const [showModal, setShow] = useState(false);
  let prevSessionData = getObject('widgetContextFilter');

  const [isInfoClicked, setInfoClicked] = useState(false);
  let inclusion = 0, exclusion = 0;

  const handleClose = (e) => {
    e.stopPropagation();
    setShow(false)
  };

  const handleShow = (e) => {
    e.stopPropagation();
    setShow(true);
  }
  const handleModalClick = (e) => {
    e.stopPropagation();
  }

  const onStudyCardClick = (config) => {
    handleOnCardEvent(config);
    if (!isInfoClicked) {
      setInfoClicked(true);
    } else {
      setInfoClicked(false);
    }
  }
  useEffect(() => {
    if (prevSessionData.length == 0) {
      setInfoClicked(false);
    }},[prevSessionData]);

  const getCriteriaCount = (data) => {
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        if (data[i]["CriteriaType"] === 'Exclusion') {
          exclusion += data[i]["Count"]
        } else if (data[i]["CriteriaType"] === 'Inclusion') {
          inclusion += data[i]["Count"];
        }
      }
    }
  }

  const getTableData = (data) => {
    getCriteriaCount(data);
    let dispositionData = data.map((obj, i) => {
      return {"key": String(i), "data": obj, "children": []}
    })
    return dispositionData;
  }


  let tableData = tableDataDetails ? getTableData(tableDataDetails) : [];

  let columnList = [
    {
      id: 1,
      field: "Criteria",
      header: 'Criteria',
      displayName: 'Criteria',
    },
    {
      id: 2,
      field: "CriteriaType",
      header: 'CriteriaType',
      displayName: 'CriteriaType',
    },
    {
      id: 3,
      field: "Count",
      header: 'Count',
      displayName: 'Count',
    }
  ]

  let componentConfig = {
    id: "ReasonsTable",
    tableData: tableData,
    columnsList: columnList,
    prevPageLinkText: 'Prev',
    nextPageText: 'Next',
    pageLinkSize: 3,
    header: false,
    defaultPaginationRows: 8,
    showSearchHeader: false,
    paginationLayout: "FirstPageLink  PrevPageLink PageLinks NextPageLink LastPageLink",
    customeRowClassName: function () {
    },
    scrollable: true
  }

  return (
  <div className={isInfoClicked ? "item item-selected" :"item"} id="item" onClick={(e) => {
    config.disableClick ? null : onStudyCardClick(config)
  }}>
    <div className="item-wrapper-infographic infocomponent">
      <div className="info align-left">
        <div className='item-value-wrapper'>
        {config.header ? <div className="infographic-title hdr" title={config.header}><span className='value'>{config.header}</span></div> : null}
        {config.subHeader ? <div className="infographic-title sub-hdr" title={config.subHeader}>{config.subHeader}
        </div> : null}
        {config.selectedVal || config.selectedVal == 0 ? <div className="infographic-title title" title={config.selectedVal}>{config.selectedVal}</div> : null}
        </div>
        <div className="info-subtitle info-align" title={config.title}>{config.title}</div>
        <div className="info-reasons"></div>
        <div style={{display: config?.showReason}}>
          <button className="reasonBtn" onClick={(e) => {
            handleShow(e)
          }}> Reasons
          </button>
        </div>
        <div id="myModal" className="modal" onClick={(e) => {
          handleModalClick(e)
        }} style={{display: showModal == true ? 'block' : 'none'}}>
          <div className="modal-content">
            <div className="modalClose" onClick={(e) => {
              handleClose(e)
            }}>&times;</div>
            <div className='mainSection'>
              <div className='subSectionOne'><ReportGraph graphData={highchartConfigs}/></div>
              <div className="verticleSeprator"></div>
              <div className='subSectiontwo'>
                <div className="ieWrapper clearfix">I/E Failure Reasons (Inc - <span
                className="ieCount">{inclusion}</span>, Exc - <span className="ieCount">{exclusion}</span>)
                </div>
                <ReactGrid className='subSectiontwo' {...componentConfig}></ReactGrid></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  );
}


export default InfoGraphics;


