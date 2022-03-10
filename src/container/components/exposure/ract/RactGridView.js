import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import FrontendConstants from '../../../constants/FrontendConstants';
import RactGridCard from './RactGridCard';
import Masonry from 'react-masonry-component';

class RactGridView extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    immRactScorecardStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    selectedGroup: PropTypes.string,
    selectedSort: PropTypes.string,
    immPresentationData: PropTypes.instanceOf(Imm.OrderedMap),
    loadMore: PropTypes.func,
    isIE: PropTypes.bool,
    hasMore: PropTypes.bool,
    pageNumber: PropTypes.number,
    goToPreviousPage: PropTypes.func,
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
    let immEntityDetails = immAllEntityDetails.get(entityId);
    const entityScorecardKey = `${uniqueId}-scorecard`;
    const isStudyNameNotExists = !immEntityDetails.get('studyname');

    if (isStudyNameNotExists) {
      const immEntityAdditionalInfo = immEntityData.get('additionalInfo', Imm.Map());
      const studyName = immEntityAdditionalInfo.getIn(['studyname', 'value']);
      immEntityDetails = immEntityDetails.set('studyname', studyName);
    }

    return (
      <RactGridCard
        key={entityScorecardKey}
        entityScorecardKey={entityScorecardKey}
        entityId={entityId}
        immEntityData={immEntityData}
        immEntityDetails={immEntityDetails}
        loadingFileDrillDownId={this.props.loadingFileDrillDownId}
      />
    );
  }

  _getEntityCardGroups() {
    const {immPresentationData, selectedGroup} = this.props;
    let allEntityDetails;
    let immCardGroups = Imm.List();
    const immPresentationRows = immPresentationData.get('entityRows');

    allEntityDetails = immPresentationData.get('entityDetails');

    if (immPresentationRows && immPresentationRows.size > 0) {
      immPresentationRows.forEach((immGroupedData, grouping) => {
        const immCardGroup = immGroupedData.map((immEntityData, uniqueId) => {
          const entityId = immEntityData.get('studyid');
          return this._getEntityCard(allEntityDetails, entityId, immEntityData, uniqueId);
        }).toList();

        const groupDiv = selectedGroup !== 'NONE'
          ? (
            <div className='ract-scorecard-grid-group-label section-title' key={selectedGroup}>
              {grouping !== 'NULL' ? grouping : ''}
            </div>
          )
          : '';

        const cardGroup = (
          <div className='ract-scorecard-grid-grouped-contents' key={grouping}>
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
      <div className='ract-scorecard-grid-contents'>
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
        <div className='ract-scorecard-pagination'>
          {showMoreDiv}
          {previousPageDiv}
        </div>
      )
      : null;

    return (
      <div className='ract-scorecard-grid-view'>
        {content}
        {paginationBlock}
      </div>
    );
  }
}

export default RactGridView;
