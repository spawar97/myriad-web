import React from 'react';
import Imm from 'immutable';
import FrontendConstants from '../../constants/FrontendConstants';
import HomePageUtil from '../../util/HomePageUtil';
import HomePageActions from '../../actions/HomePageActions';
import {SortableContainer, SortableElement} from 'react-sortable-hoc';
import PropTypes from "prop-types";

class HomePageTabsList extends React.PureComponent {

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    immHomePageStore: PropTypes.instanceOf(Imm.Map).isRequired,
  };

  onSortEnd = ({oldIndex, newIndex}) => {
    HomePageActions.moveHomePageReport(oldIndex, newIndex);
  };

  removeHomePageReport(tab) {
    HomePageActions.removeFromHomePagePreview(tab);
  }

  getReportTitle(tab) {
    const reportTitle = HomePageUtil.getTabReportName(this.props.immExposureStore, tab);
    const titleSpan = <span>{reportTitle}</span>;
    let unavailableSpan = '';
    if (reportTitle === FrontendConstants.NOT_AVAILABLE ) {
      unavailableSpan = <span className='icon icon-WarningCircle'/>;
    }
    return (
      <div className='home-page-editor-pane-report-title'>
        {unavailableSpan}
        {titleSpan}
      </div>
    );
  }

  getReportItem(tab) {
    const entityId = tab.get('entityId');
    const tabType = tab.get('tabType');
    const key = `${entityId}-${tabType}`;

    return (
      <div className='home-page-editor-pane-report'
           key={key}>
        <div className='icon-menu9 icon-hamburger home-page-editor-pane-report-hamburger' />
        <div className='close-button' onClick={this.removeHomePageReport.bind(this, tab)} />
        {this.getReportTitle(tab)}
      </div>
    );
  }

  render() {
    const {immHomePageStore} = this.props;
    const immHomePageTabs = HomePageUtil.getSelectedHomePageTabs(immHomePageStore);

    const SortableItem = SortableElement(({value}) => {
      return (<div className="grabbing noselect">{this.getReportItem(value)}</div>);
    });
    const SortableList = SortableContainer(({items}) => {
      return (
        <div>
          {items.map((value, index) => (
            <SortableItem key={`item-${index}`} index={index} value={value} />
          ))}
        </div>
      );
    });

    return (
      <div className='home-page-editor-pane-report-list'>
        <SortableList items={immHomePageTabs}
                      onSortEnd={this.onSortEnd}
                      lockAxis={'y'}
                      distance={10}
                      helperClass='home-page-editor-pane-report-drag-and-drop'
        />
      </div>
    );
  }

}

export default HomePageTabsList;