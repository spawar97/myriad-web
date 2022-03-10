import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import OversightConsoleUtil from '../../../util/OversightConsoleUtil';
import FrontendConstants from '../../../constants/FrontendConstants';
import OversightScorecardGridCard from './OversightScorecardGridCard';

import Masonry from 'react-masonry-component';
import {Key} from "../../../constants/OversightScorecardConstants";
import {Key as OversightStoreKey} from "../../../stores/constants/OversightStoreConstants";

class OversightScorecardGridView extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    immOversightScorecardStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    selectedScorecardLevel: PropTypes.string,
    selectedGroup: PropTypes.string,
    immSelectedMetrics: PropTypes.instanceOf(Imm.List),
    selectedSort: PropTypes.string,
    immMetrics: PropTypes.instanceOf(Imm.List),
    drilldownHandler: PropTypes.func,
    immPresentationData: PropTypes.instanceOf(Imm.OrderedMap),
    immMetricsById: PropTypes.instanceOf(Imm.Map),
    loadMore: PropTypes.func,
    isIE: PropTypes.bool,
    hasMore: PropTypes.bool,
    pageNumber: PropTypes.number,
    goToPreviousPage: PropTypes.func,
    immMilestoneLabel: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);

    // Initialize this once, so that we do not re-instantiate the object every render
    this.masonryOptions = {
      transitionDuration: '0',
      horizontalOrder: 'false',
    };

    this.imagesLoadedOptions = {};
  }

  _getEntityCard(immAllEntityDetails, entityId, immEntityData, uniqueId) {
    const {immMetricsById, selectedScorecardLevel, drilldownHandler, immOversightScorecardStore, immMilestoneLabel} = this.props;

    let immEntityDetails = immAllEntityDetails.get(entityId);
    const entityScorecardKey = `${uniqueId}-scorecard`;
    const isStudyNameNotExists = immEntityDetails && !immEntityDetails.get('studyname');

    if (isStudyNameNotExists) {
      const immEntityAdditionalInfo = immEntityData.get('additionalInfo', Imm.Map());
      const studyName = immEntityAdditionalInfo.getIn(['studyname', 'value']);
      immEntityDetails = immEntityDetails.set('studyname', studyName);
    }
    
    return (
      <OversightScorecardGridCard
        key={entityScorecardKey}
        drilldownHandler={drilldownHandler}
        entityScorecardKey={entityScorecardKey}
        entityId={entityId}
        immEntityData={immEntityData}
        immMetricsById={immMetricsById}
        selectedScorecardLevel={selectedScorecardLevel}
        immEntityDetails={immEntityDetails}
        loadingFileDrillDownId={immOversightScorecardStore.get(OversightStoreKey.loadingFileDrillDownId)}
        immMilestoneLabel={immMilestoneLabel}
      />
    );
  }



  _getEntityCardGroups() {
    const {selectedScorecardLevel, immPresentationData, selectedGroup} = this.props;
    let allEntityDetails;
    let immCardGroups = Imm.List();
    const immPresentationRows = immPresentationData.get('entityRows');

    switch(selectedScorecardLevel) {
      case Key.STUDY:
        allEntityDetails = immPresentationData.getIn(['entityDetails', Key.STUDY]);
        break;
      case Key.SITE:
        allEntityDetails = immPresentationData.getIn(['entityDetails', Key.SITE]);
        break;
      default:
        break;
    }

    if (immPresentationRows && immPresentationRows.size > 0) {
      immPresentationRows.forEach((immGroupedData, grouping) => {
        const immCardGroup = immGroupedData.map((immEntityData, uniqueId) => {
          const entityId = OversightConsoleUtil.getEntityIdFromUniqueId(selectedScorecardLevel, uniqueId);
          return this._getEntityCard(allEntityDetails, entityId, immEntityData, uniqueId);
        }).toList();

        const groupDiv = selectedGroup !== Key.NONE
          ? (
            <div className='oversight-scorecard-grid-group-label section-title' key={selectedGroup}>
              {grouping}
            </div>
          )
          : '';

        const cardGroup = (
          <div className='oversight-scorecard-grid-grouped-contents' key={grouping}>
            {groupDiv}
            <Masonry
              options={this.masonryOptions}
              enableResizableChildren={true}
              imagesLoadedOptions={this.imagesLoadedOptions}
              onLayoutComplete={null}
              onRemoveComplete={null}
              onImagesLoaded={null}
              disableImagesLoaded={true}
            >
              {immCardGroup}
            </Masonry>
          </div>
        );
        immCardGroups = immCardGroups.push(cardGroup);
      });
    }

    return immCardGroups.toSeq();
  }

  _getEntities() {
    const immCards = this._getEntityCardGroups();

    return (
      <div className='oversight-scorecard-grid-contents'>
        {immCards}
      </div>
    );
  }

  render() {
    const {isIE, hasMore, pageNumber, goToPreviousPage, loadMore} = this.props;
    const content = this._getEntities();
    const showMoreDiv = isIE && hasMore
      ? (
          <div className='grid-view-next-page' onClick={loadMore}>
            {FrontendConstants.NEXT_PAGE}
          </div>
        )
      : null;

    const previousPageDiv = isIE && pageNumber > 0
      ? (
          <div className='grid-view-prev-page' onClick={goToPreviousPage}>
            {FrontendConstants.PREVIOUS_PAGE}
          </div>
        )
      : null;

    const paginationBlock = showMoreDiv || previousPageDiv
      ? (
        <div className='oversight-scorecard-pagination'>
          {showMoreDiv}
          {previousPageDiv}
        </div>
      )
      : null;

    return (
      <div className='oversight-scorecard-grid-view'>
        {content}
        {paginationBlock}
      </div>
    );
  }
}

export default OversightScorecardGridView;
