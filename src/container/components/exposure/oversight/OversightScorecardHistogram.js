import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';

class OversightScorecardHistogram extends React.PureComponent {
  static propTypes = {
    immEntityScoreBreakdown: PropTypes.instanceOf(Imm.Map),
  };

  static MAX_COLUMN_HEIGHT = 50;
  static MIN_COLUMN_HEIGHT = 0;
  static HISTOGRAM_HEIGHT = 70;
  static HISTOGRAM_WIDTH = 60;
  static COLUMN_WIDTH = 15;
  static GUTTER_WIDTH = 5;
  static HALF_GUTTER_WIDTH = OversightScorecardHistogram.GUTTER_WIDTH / 2;
  static Y_AXIS_BASE = OversightScorecardHistogram.HISTOGRAM_HEIGHT - 5;
  static X_AXIS_BASE = OversightScorecardHistogram.HALF_GUTTER_WIDTH;


  _getColumnHeight(ratio) {
    let columnHeight;

    if (!ratio || isNaN(ratio)) {
      columnHeight = OversightScorecardHistogram.MIN_COLUMN_HEIGHT;
    }
    else {
      columnHeight = OversightScorecardHistogram.MAX_COLUMN_HEIGHT * ratio;

      if (columnHeight < OversightScorecardHistogram.MIN_COLUMN_HEIGHT) {
        columnHeight = OversightScorecardHistogram.MIN_COLUMN_HEIGHT;
      }
    }

    return columnHeight;
  }

  _generateHistogram() {
    const {immEntityScoreBreakdown} = this.props;

    const goodColor = immEntityScoreBreakdown.get('goodColor');
    const warningColor = immEntityScoreBreakdown.get('warningColor');
    const criticalColor = immEntityScoreBreakdown.get('criticalColor');

    const goodCount = immEntityScoreBreakdown.get('goodCount') || 0;
    const warningCount = immEntityScoreBreakdown.get('warningCount' || 0);
    const criticalCount = immEntityScoreBreakdown.get('criticalCount') || 0;

    const numMetrics = goodCount + warningCount + criticalCount;
    const goodRatio = goodCount / numMetrics;
    const warningRatio = warningCount / numMetrics;
    const criticalRatio = criticalCount / numMetrics;


    const goodHeight = this._getColumnHeight(goodRatio);
    const warningHeight = this._getColumnHeight(warningRatio);
    const criticalHeight = this._getColumnHeight(criticalRatio);

    const goodXAxis = 2 * OversightScorecardHistogram.GUTTER_WIDTH +
      2 * OversightScorecardHistogram.COLUMN_WIDTH;
    const goodYAxis = OversightScorecardHistogram.Y_AXIS_BASE - goodHeight;
    const criticalYAxis = OversightScorecardHistogram.Y_AXIS_BASE - criticalHeight;

    const warningXAxis = OversightScorecardHistogram.GUTTER_WIDTH
      + OversightScorecardHistogram.COLUMN_WIDTH;
    const warningYAxis = OversightScorecardHistogram.Y_AXIS_BASE - warningHeight;

    const graphYAxisBase = OversightScorecardHistogram.HISTOGRAM_HEIGHT
      - OversightScorecardHistogram.HALF_GUTTER_WIDTH;
    const graphBaseWidth = OversightScorecardHistogram.HISTOGRAM_WIDTH
      - OversightScorecardHistogram.GUTTER_WIDTH;


    return (
      <svg width={OversightScorecardHistogram.HISTOGRAM_WIDTH}
           height={OversightScorecardHistogram.HISTOGRAM_HEIGHT} version='1.1'
      >
        <rect x={OversightScorecardHistogram.X_AXIS_BASE} y={criticalYAxis}
              width={OversightScorecardHistogram.COLUMN_WIDTH} height={criticalHeight}
              stroke={criticalColor} fill={criticalColor}
        />
        <rect x={warningXAxis} y={warningYAxis} width={OversightScorecardHistogram.COLUMN_WIDTH}
              height={warningHeight} stroke={warningColor} fill={warningColor}
        />
        <rect x={goodXAxis} y={goodYAxis} width={OversightScorecardHistogram.COLUMN_WIDTH}
              height={goodHeight} stroke={goodColor} fill={goodColor}
        />
        <rect x={OversightScorecardHistogram.X_AXIS_BASE} y={graphYAxisBase}
              width={graphBaseWidth} height={OversightScorecardHistogram.HALF_GUTTER_WIDTH}
              stroke='grey' fill='grey'
        />
      </svg>
    );
  }

  render() {
    const histogram = this._generateHistogram();
    return (
      <div className='oversight-scorecard-histogram'>
        {histogram}
      </div>
    );
  }
}

export default OversightScorecardHistogram;
