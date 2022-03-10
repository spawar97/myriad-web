import PermissionsUtil from "../../util/PermissionsUtil";

var React = require('react');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import {FeatureListConstants} from "../../constants/PermissionsConstants";

var TasksViewWidget = React.createFactory(require('./TasksViewWidget'));
var MobileTasksWidget = React.createFactory(require('./MobileTasksWidget'));
var MediaQueryWrapper = React.createFactory(require('../MediaQueryWrapper'));
var ExposureActions = require('../../actions/ExposureActions');
import NoAccessContentNotice from "../NoAccessContentNotice";

class Tasks extends React.Component {
  static displayName = 'Tasks';

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    query: PropTypes.objectOf(PropTypes.string)
  };

  render() {
    var immExposureStore = this.props.immExposureStore;

    var immTaskWrappers = immExposureStore.getIn(['tasksView', 'taskIds']).map(function(id) {
      return immExposureStore.getIn(['openTasks', id]);
    });

    var immClosedTaskWrappers = immExposureStore.getIn(['closedTasksView', 'taskIds']).map(function(id) {
      return immExposureStore.getIn(['closedTasks', id]);
    });

    var desktopComponent = TasksViewWidget({
      immExposureStore: immExposureStore,
      immTaskWrappers: immTaskWrappers,
      immClosedTaskWrappers: immClosedTaskWrappers,
      query: this.props.query
    });

    var phoneComponent = MobileTasksWidget({
      immExposureStore: immExposureStore,
      immTaskWrappers: immTaskWrappers,
      query: this.props.query
    });

    return PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK) ? (
        MediaQueryWrapper({className: 'app-tab-tasks', desktopComponent: desktopComponent, phoneComponent: phoneComponent})
    ) : <NoAccessContentNotice />;
  }
}

module.exports = Tasks;
