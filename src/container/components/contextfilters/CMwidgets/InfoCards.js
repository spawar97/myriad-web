import React, {useEffect, useState} from 'react';
import './InfoCards.scss';
import '../Infographics/infograp.scss';
import {getObject} from "../../../util/SessionStorage";

const InfoCards = (props) => {

  let { handleOnClick, infoCardList } = props;
  const [isInfoClicked, setInfoClicked] = useState({});
  let prevSessionData = getObject('widgetContextFilter');


  const handleOnCardEvent = (name) => {
    let infoSelectedObj = JSON.parse(JSON.stringify(isInfoClicked));
    if (!isInfoClicked[name]) {
      infoSelectedObj[name] = true;
    } else {
      infoSelectedObj[name] = false;
    }
    setInfoClicked(infoSelectedObj);
  }

  useEffect(() => {
    if (prevSessionData.length == 0 && Object.keys(isInfoClicked).length > 0) {
        setInfoClicked({});
     }
    },[prevSessionData]);

  return <div className='info-card-container flex-container'>
    {
      infoCardList.map((obj) => {
        let { header, content, footer, name } = obj;
        return <div key={name} className={isInfoClicked[obj.name] ? "item item-selected" :"item"} onClick={obj.disableClick ? null :() =>{handleOnClick(obj);handleOnCardEvent(obj.name)}}>
          <div className="item-wrapper-infographic">
          <div className="item-value-wrapper">
          <div  className="infographic-title hdr"  id='info-cards-header'>{header}</div>
          <div className="infographic-title sub-hdr" id='info-cards-content' >{content}</div>
          </div>
          <div className="info-subtitle info-align" id='info-cards-footer'>{footer}</div>
          </div>
        </div>
      })
    }
  </div>;
}

InfoCards.defaultProps = {
  infoCardList: [],
  handleOnClick: () => { }
}

export default React.memo(InfoCards);

