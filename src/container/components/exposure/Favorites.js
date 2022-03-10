var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import AccountUtil from '../../util/AccountUtil';
import {YellowfinUtil} from '../../util/YellowfinUtil';

var FavoritesViewWidget = React.createFactory(require('./FavoritesViewWidget'));
var MediaQueryWrapper = React.createFactory(require('../MediaQueryWrapper'));
var MobileFavoritesWidget = React.createFactory(require('./MobileFavoritesWidget'));
var ExposureAppConstants = require('../../constants/ExposureAppConstants');

class Favorites extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  static displayName = 'Favorites';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    query: PropTypes.objectOf(PropTypes.string)
  };

  getFavoritesWrappers = () => {
    var immExposureStore = this.props.immExposureStore;
    var itemIds = immExposureStore.getIn(['favoritesView', 'itemIds']);
    var itemTypes = immExposureStore.getIn(['favoritesView', 'itemTypes']);
    var immItems = itemIds.map(function(itemId) {
      switch (itemTypes.get(itemId)) {
        case ExposureAppConstants.FAVORITE_TYPE_FILE_WRAPPER:
          return immExposureStore.getIn(['files', itemId, 'fileWrapper']);
        case ExposureAppConstants.FAVORITE_TYPE_TASK_WRAPPER:
          // check if favorite item is of Task, set flag isTask as true
          let taskObj = immExposureStore.getIn(['tasks', itemId]);
          taskObj = taskObj.setIn(['task', 'isTask'], true);
          return taskObj;
      }
    });
    return immItems;
  };

  componentWillMount() {
    if (AccountUtil.hasClinopsInsightsLeftNav(comprehend.globals.immAppConfig)) {
      YellowfinUtil.fetchYellowfinReportIds(this.setYFReportIds.bind(this));
    }
  }

  setYFReportIds(reportIds) {
   this.setState({YFReportIds: reportIds});
  }


  render() {
    var props = {
      immExposureStore: this.props.immExposureStore,
      immFavoriteWrappers: this.getFavoritesWrappers(),
      query: this.props.location.query,
      YFReportIds: this.state.YFReportIds
    };
    return MediaQueryWrapper({
      className: 'app-tab-favorites',
      desktopComponent: FavoritesViewWidget(props),
      phoneComponent: MobileFavoritesWidget(props)
    });
  }
}

module.exports = Favorites;
