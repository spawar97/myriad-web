import React, { forwardRef } from 'react'
import WidgetMenu from '../contextfilters/WidgetMenu';
import { FullScreen, useFullScreenHandle } from "react-full-screen";
import "./widgetizationStyle.scss";
import "./font/Roboto-Regular.ttf";

const WidgetHighchart = (props,ref) => {
  let { that } = props;
  let widgetIndex = that.props?.widgetMetaData?.viewWidgetName || '';
  const useFullScreen = useFullScreenHandle();

  return (
    <FullScreen handle={useFullScreen}>
    <div>
      <div
        className='highchart'
        id={`chart-viz${widgetIndex ? `-${widgetIndex}` : ''}`}
        style={_.isEmpty(that.props.html) || !that.props.html.match(/noresize=/) ? { height: that.props.height } : null}
      >
        <WidgetMenu highcharts={that} useFullScreen={useFullScreen} />

        <div
          ref={ref}
          dangerouslySetInnerHTML={that.props.html ? {
            __html: that.props.html
          } : null
          }
        />

      </div>

      <div className='exposed-config'>
        {that.exposeConfig(that.props.configs)}
      </div>
    </div>
    </FullScreen>
  )
}

export default forwardRef(WidgetHighchart)
