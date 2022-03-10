import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import cx from 'classnames';
import InfiniteScroll from 'react-infinite-scroller';

import ContentPlaceholder from '../../ContentPlaceholder';
import FrontendConstants from '../../../constants/FrontendConstants';

import OversightScorecardConstants from "../../../constants/OversightScorecardConstants";
import OversightConsoleUtil from "../../../util/OversightConsoleUtil";
import {Key} from "../../../constants/OversightScorecardConstants";
import { Key as OversightStoreKey } from "../../../stores/constants/OversightStoreConstants";

class OversightScorecardTabularView extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immOversightScorecardStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    selectedScorecardLevel: PropTypes.string,
    selectedGroup: PropTypes.string,
    immSelectedMetrics: PropTypes.instanceOf(Imm.List),
    immSelectedSort: PropTypes.string,
    immPresentationData: PropTypes.instanceOf(Imm.OrderedMap),
    drilldownHandler: PropTypes.func,
    loadMoreItems: PropTypes.func.isRequired,
    shownItemsCount: PropTypes.number.isRequired,
    numTotalItems: PropTypes.number.isRequired,
    immStudyToMetricGroupMap: PropTypes.instanceOf(Imm.Map).isRequired,
    defaultMetricGroupId: PropTypes.string.isRequired,
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
  }

  _getOversightTableHeaders(immEntityHeaders) {
    let headerColumns = [];

    const additionalHeaders = immEntityHeaders.get('additionalHeaders', Imm.Map()).map(immHeader => {
      const key = immHeader.get('key');
      const value = immHeader.get('value');
      const headerClass = `header-${key}`;
      return (
        <th key={key} className={headerClass}>
          {value}
        </th>
      );
    }).toSeq();
    headerColumns.push(additionalHeaders);

    const infoHeaders = immEntityHeaders.get('infoHeaders', Imm.Map()).map(immHeader => {
      const key = immHeader.get('key');
      const value = immHeader.get('value');
      const headerClass = `header-${key}`;
      return (
        <th key={key} className={headerClass}>
          {value}
        </th>
      );
    }).toSeq();
    headerColumns.push(infoHeaders);

    let newmetricHeaders=[];
    const metricHeaders = immEntityHeaders.get('metricHeaders', Imm.Map()).map((immMetricHeaderInfo, key) => {
      // As we have grouped headers by title + suffix, we can safely retrieve this information from
      // the first
      const value = immMetricHeaderInfo.get('title');
      const suffix = immMetricHeaderInfo.get('suffix');
      const headerSizeClassName = this._getHeaderSizeClassName(value, suffix);
      newmetricHeaders.push (
        <th key={key} className={cx('header-metric-score', headerSizeClassName)}>
          <div className='oversight-metric-score-information'>
            <div className='oversight-metric-score-name'>{value}</div>
            <div className='oversight-metric-score-suffix'>({suffix})</div>
          </div>
        </th>
      );
    }).toSeq();
    headerColumns.push(newmetricHeaders);
    return headerColumns;
  }

  _getHeaderSizeClassName(title, suffix) {
    let sizeClassName;
    if (title.length > 30 || suffix.length > 30) {
      sizeClassName = 'large-header-cell';
    } else if (title.length < 15 && suffix.length < 15){
      sizeClassName = 'small-header-cell';
    } else {
      sizeClassName = '';
    }
    return sizeClassName;
  }

  _getEntityIdCell(entityId, headerClass, studyName, studyId) {
    const cellKey = `entity-id-${entityId}`;
    const entityIdCell = <td key={cellKey} className={cx('entity-id', headerClass)}>{entityId}</td>;

    const viewStudySitesCallback = () => this.props.drilldownHandler(entityId);
    const immPresentationData = this.props.immPresentationData;
    const immMilestoneLabel = this.props.immMilestoneLabel;
    const isTabularView = this.props.isTabularView;
    const entityInfoTooltip = OversightConsoleUtil.getEntityInfoTooltip(this.props.selectedScorecardLevel,
      entityId, immPresentationData, viewStudySitesCallback, studyName, immMilestoneLabel, studyId, isTabularView);

    return (OversightConsoleUtil.wrapWithTooltip(entityIdCell, entityInfoTooltip));
  }

  _getEntityNameCell(entityName, entityId, headerClass, studyName, studyId) {
    const cellKey = `entity-name-${entityName}`;
    const entityNameCell = <td key={cellKey} className={cx('entity-name', headerClass)}>{entityName}</td>;
    const immMilestoneLabel = this.props.immMilestoneLabel;
    const viewStudySitesCallback = () => this.props.drilldownHandler(entityId);
    const immPresentationData = this.props.immPresentationData;
    const isTabularView = this.props.isTabularView;
    const entityInfoTooltip = OversightConsoleUtil.getEntityInfoTooltip(this.props.selectedScorecardLevel,
      entityId, immPresentationData, viewStudySitesCallback, studyName, immMilestoneLabel, studyId, isTabularView);

    return (OversightConsoleUtil.wrapWithTooltip(entityNameCell, entityInfoTooltip));
  }

  _getOtherEntityCell(value, headerClass){
    const cellKey = `entity-status-${entityValue}`;
    const entityValue =  value === ''
      ? FrontendConstants.NOT_AVAILABLE
      : value;
    const entityNameCell = <td key={cellKey} className={cx('entity-name', headerClass)}>{entityValue}</td>;
    return entityNameCell;
  }

  _getAdditionalInfoCell(accessor, value, tooltip, headerClass) {
    const cellKey = `entity-additional-info-${accessor}`;
    const cell = <td key={cellKey} className={cx('additional-info', headerClass)}>{value}</td>;
    if (tooltip != null) {
      return (OversightConsoleUtil.wrapWithTooltip(cell, tooltip));
    }
    return cell;
  }

  _getEntityOverallScoreCell(entityId, entityName, immOverallScore) {
    const cellKey = `entity-overall-score-${entityId}`;
    const value = immOverallScore.get('value');
    const color = immOverallScore.get('color');
    const immBreakdown = immOverallScore.get('breakdown', Imm.Map());

    const scoreLongerName = value === FrontendConstants.NOT_AVAILABLE_ABBREVIATION
      ? FrontendConstants.NOT_AVAILABLE
      : value;

    const overallScoreCell = <td key={cellKey} className='oversight-scorecard-tableview-score' style={{color}}>
      {scoreLongerName}
    </td>;

    const overallScoreTooltip = OversightConsoleUtil.getOverallScoreTooltip(entityName, immBreakdown);

    return (OversightConsoleUtil.wrapWithTooltip(overallScoreCell, overallScoreTooltip));
  }

  _getEntityMetricScoreCell(entityId, immMetricData, immMetricHeader, immMetricConfig, metricHeaderKey) {
    let cellContent, tooltip;
    const missingCell = (
      <div style={{color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID}}>
        {FrontendConstants.OVERSIGHT_SCORE_UNKNOWN}
      </div>
    );

    const headerSizeClassName = this._getHeaderSizeClassName(immMetricHeader.get('title', ''),
      immMetricHeader.get('suffix', ''));
    if (!!immMetricData) {
      const immScoreData = immMetricData.get('scoreData');

      if (immMetricData.size > 0 && immScoreData.size > 0) {
        const invalidvalue = immMetricData.getIn(['scoreData', 'invalidvalue'], false);
        const missingvalue = immMetricData.getIn(['scoreData', 'missingvalue'], false);
        let scoreValue = immMetricData.getIn(['render', 'value']);
        const scoreLabel = immMetricData.getIn(['render', 'label']);
        const color = immMetricData.getIn(['render', 'color']);
        const valueSuffix = missingvalue ? '' : OversightConsoleUtil._metricSuffixFormatted(immMetricConfig, true);
        cellContent = (
          <div>
          <span style={{color}}>
            {scoreLabel}
          </span>
            <div className={cx({'invalid-metric-value': invalidvalue})}>
              {scoreValue}{valueSuffix}
            </div>
          </div>
        );

        const loadingFileDrillDownId = this.props.immOversightScorecardStore.get(OversightStoreKey.loadingFileDrillDownId);
        tooltip = OversightConsoleUtil.getEntityMetricTooltip(immMetricData, immMetricConfig,
          this.context.router, this.props.selectedScorecardLevel, loadingFileDrillDownId);
      } else {
        cellContent = missingCell;
      }
    } else {
      cellContent = missingCell;
    }

    const cellKey = `${entityId}-${metricHeaderKey}oversight-score-cell`;
    const cell = <td key={cellKey} className={cx('oversight-score', headerSizeClassName)}>{cellContent}</td>;

    if (tooltip != null) {
      return OversightConsoleUtil.wrapWithTooltip(cell, tooltip);
    }
    return cell;
  }

  _getEntityRowCells(entityId, immGroupRowData, immEntityHeaders) {
    const {immStudyToMetricGroupMap, selectedScorecardLevel,defaultMetricGroupId} = this.props;
    let entityRowCells = [];
    const immAdditionalHeaders = immEntityHeaders.get('additionalHeaders', Imm.List());
    const immAdditionalGroupRowInfo = immGroupRowData.get('additionalInfo', Imm.Map());
    const entityName = immGroupRowData.get('entityName');
    const entityStatus = immGroupRowData.get('entityStatus');
    const entityPIName =  immGroupRowData.get('entityPIName');
    const entityPIEmail =  immGroupRowData.get('entityPIEmail');
    const entityFPFV =  immGroupRowData.get('entityFPFV');
    const immOverallScore = immGroupRowData.get('overallScore');
    const immGroupRowDataMetrics = immGroupRowData.get('metrics', Imm.List())
      .filter(immMetricData => !!immMetricData)
      .groupBy(immMetricData => immMetricData.get('key'))
      .map(immMetricData => immMetricData.get(0));

    const studyId = OversightConsoleUtil.getStudyIdFromUniqueId(immGroupRowData.get('uniqueId'));
    const metricGroupId = immStudyToMetricGroupMap.get(studyId);
    const studyName = immAdditionalGroupRowInfo.getIn(['studyname', 'value'], entityName);

    // Additional Info cells
    immAdditionalHeaders.forEach((immHeader) => {
      const accessor = immHeader.get('accessor', '');
      const headerCellValue = immAdditionalGroupRowInfo.getIn([accessor, 'value']);
      const headerCellTooltip = immAdditionalGroupRowInfo.getIn([accessor, 'tooltip']).toJS();
      const headerClass = immHeader.get('key', '');
      entityRowCells.push(this._getAdditionalInfoCell(accessor, headerCellValue, headerCellTooltip, headerClass));
    });

    // Entity Info cells
    const headerIdClass = immEntityHeaders.getIn(['infoHeaders', 0, 'key'], '');
    entityRowCells.push(this._getEntityIdCell(entityId, headerIdClass, studyName, studyId));
    const headerNameClass = immEntityHeaders.getIn(['infoHeaders', 1, 'key']);
    entityRowCells.push(this._getEntityNameCell(entityName, entityId, headerNameClass, studyName, studyId));

    if(selectedScorecardLevel === 'SITE') {
      const headerStatusClass = immEntityHeaders.getIn(['infoHeaders', 2, 'key']);
      entityRowCells.push(this._getOtherEntityCell(entityStatus, headerStatusClass));

      const headerPINameClass = immEntityHeaders.getIn(['infoHeaders', 3, 'key']);
      entityRowCells.push(this._getOtherEntityCell(entityPIName, headerPINameClass));

      const headerPIEmailClass = immEntityHeaders.getIn(['infoHeaders', 4, 'key']);
      entityRowCells.push(this._getOtherEntityCell(entityPIEmail, headerPIEmailClass));

      const headerFPFVClass = immEntityHeaders.getIn(['infoHeaders', 5, 'key']);
      entityRowCells.push(this._getOtherEntityCell(entityFPFV, headerFPFVClass));
    }   
    // Overall score cell
    entityRowCells.push(this._getEntityOverallScoreCell(entityId, entityName, immOverallScore));

    // Entity metric cells
    immEntityHeaders.get('metricHeaders', Imm.OrderedMap()).forEach((immMetricHeader, metricHeaderKey) => {
      const immMetricData = immGroupRowDataMetrics.get(metricHeaderKey);
      const immMetricConfig = !!immMetricData
        ? immMetricHeader.getIn(['configs', immMetricData.getIn(['scoreData', 'metricconfigid'])])
        : null;
      const metricScoreCell = this._getEntityMetricScoreCell(entityId, immMetricData, immMetricHeader, immMetricConfig, metricHeaderKey);
      entityRowCells.push(metricScoreCell);
    });

    return entityRowCells;
  }

  _getOversightTableRows(immEntityRows, immEntityHeaders) {
    let tableRows = [];
    const numHeaderCells = immEntityHeaders.get('infoHeaders', Imm.List()).size
      + immEntityHeaders.get('additionalHeaders', Imm.List()).size
      + immEntityHeaders.get('metricHeaders', Imm.List()).size;

    immEntityRows.forEach((immGroupRows, groupName) => {
      // Add group row only if selected group by
      if (this.props.selectedGroup !== Key.NONE) {
        const groupRowKey = `oversight-group-${groupName}`;
        tableRows.push(<tr key={ groupRowKey }>
          <th colSpan={numHeaderCells}
              className='oversight-scorecard-table-row grouped-scores'>{groupName}</th>
        </tr>);
      }
      immGroupRows.forEach((immGroupRow, uniqueId) => {
        const entityId = immGroupRow.get('entityId');
        const rowKey = `oversight-row-${groupName}-${uniqueId}-${entityId}`;
        const rowCells = this._getEntityRowCells(entityId, immGroupRow, immEntityHeaders);
        tableRows.push(<tr key={ rowKey } className={cx('oversight-scorecard-table-row', rowKey)}>{rowCells}</tr>);
      });
    });
    return tableRows;
  }

  _getOversightTable() {
    const {immPresentationData, shownItemsCount, numTotalItems, loadMoreItems} = this.props;
    const tableColumns = this._getOversightTableHeaders(immPresentationData.get('entityHeaders'));
    const tableRows = this._getOversightTableRows(immPresentationData.get('entityRows'),
      immPresentationData.get('entityHeaders'));

    return (
      <table className='oversight-scorecard-table'>
        <thead className='oversight-scorecard-table-header'>
          <tr>{tableColumns}</tr>
        </thead>
        <tbody className='oversight-scorecard-table-body'>
          <InfiniteScroll
            dataLength={shownItemsCount}
            pageStart={0}
            loadMore={loadMoreItems}
            hasMore={shownItemsCount < numTotalItems}
            loader={<ContentPlaceholder containerClassName='infinite-scroll' />}
            threshold={500}
            useWindow={false}
          >
            { tableRows }
          </InfiniteScroll>
        </tbody>
      </table>
    );
  }

  _isReady() {
    const { immPresentationData } = this.props;
    return immPresentationData != null && !immPresentationData.isEmpty();
  }

  render() {
    let content;

    if (!this._isReady()) {
      content = <ContentPlaceholder /> ;
    } else {
      content = this._getOversightTable();
    }

    return (
      <div className='oversight-scorecard-tabular-view'>
        {content}
      </div>
    );
  }
}

export default OversightScorecardTabularView;
