var React = require('react');
var createReactClass = require('create-react-class');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var AccessDesktopTag = React.createFactory(require('./AccessDesktopTag'));
var DesktopMonitorStudio = React.createFactory(require('./DesktopMonitorStudio'));
var MediaQueryWrapper = React.createFactory(require('../MediaQueryWrapper'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
import { withTransitionHelper } from '../RouterTransitionHelper';

var MonitorStudio = createReactClass({
  displayName: 'MonitorStudio',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  isDirty() {
    return this.refs['desktopComponent'] && this.refs['desktopComponent'].isDirty();
  },

  unsavedWorkModalCopy() {
    return {header: FrontendConstants.DISCARD_CHANGES_TO_MONITOR,
            content: FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST};
  },
  
  render() {
    var desktopComponent = DesktopMonitorStudio({
      immExposureStore: this.props.immExposureStore,
      params: this.props.params,
      ref: 'desktopComponent'
    });

    var nonDesktopComponent = AccessDesktopTag();

    return MediaQueryWrapper({
      className: 'studio',
      desktopComponent: desktopComponent,
      phoneComponent: nonDesktopComponent});
  }
});

module.exports = withTransitionHelper(MonitorStudio);
