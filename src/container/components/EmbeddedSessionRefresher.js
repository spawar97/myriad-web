import React from 'react';
import Util from '../util/util';
import PropTypes from 'prop-types';
import {YellowfinUtil} from '../util/YellowfinUtil';
import AccountUtil from '../util/AccountUtil';
import Imm from 'immutable';

/**
 * This component is a hack to keep the Yellowfin session in sync with the App session. Basically the way this operates
 * is by using an <img> tag that points to the Yellowfin app instance. This causes a GET request to be performed to
 * this URL, and since browsers will send cookies along with the request if we have them, this will trigger a session
 * refresh on the Yellowfin end to keep the App and the Yellowfin sessions kinda in sync
 */
class EmbeddedSessionRefresher extends React.PureComponent {
  render() {
    const {logout, windowLocation} = this.props;
    const immAppConfig = this.props.immAppConfig
      ? this.props.immAppConfig
      : comprehend.globals.immAppConfig;

    const yellowfinUrl = YellowfinUtil.getYellowfinAppUrl(immAppConfig);
    const hasKPIStudio = AccountUtil.hasKPIStudio(immAppConfig);

    if (!yellowfinUrl || !hasKPIStudio) return null;

    /**
     * Tie the hash to the current window location. As this will change on navigation, and is a prop being passed
     * to the component, when the location changes it will trigger a refresh (shouldComponentUpdate will return true
     * since the prop value for `windowLocation` changed
     */
    const hash = Util.simpleHash(windowLocation);

    // Using the hashed window location, construct the hash to append to the yellowfin URL
    const url = `${yellowfinUrl + (logout ? '/logoff.i4' : '')}#${hash}`;

    // This causes a GET request to fire to the src url (standard behavior of img tags). In addition to this,
    // since we have cookies for this URL in our session it'll send them along with the request, and hitting this
    // URL will let YF backend know that the user is active
    return <img className='embedded-session-refresher' src={url} />;
  }
}

EmbeddedSessionRefresher.displayName = 'EmbeddedSessionRefresher';

/**
 * windowLocation: Current location of the window
 * logout: Whether this session should be terminated
 * immAppConfig: Application configuration. Optional prop - If not specified will retrieve the application configuration
 *               from the comprehend global object.
 */
EmbeddedSessionRefresher.propTypes = {
  windowLocation: PropTypes.string.isRequired,
  logout: PropTypes.bool.isRequired,
  immAppConfig: PropTypes.instanceOf(Imm.Map)
};

export default EmbeddedSessionRefresher;
