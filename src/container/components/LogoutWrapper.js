import React from 'react';
import EmbeddedSessionRefresher from './EmbeddedSessionRefresher';
import {YellowfinUtil} from '../util/YellowfinUtil';
import CookieActions from '../actions/CookieActions';
import { delItem } from '../util/SessionStorage';

/**
 * Simple component to handle the application logout logic. This component will render the EmbeddedSessionRefresher
 * component in logout mode, which will log the user out of their corresponding Yellowfin session. Once we hit that render,
 * the logout will proceed.
 */
class LogoutWrapper extends React.PureComponent {
  /**
   * After the component mounts (renders the first time), then go to the logout page to log out of the application
   */
  componentDidMount() {
    delItem('collaboration-navigation');
    CookieActions.expireSessionFilters(LogoutWrapper.finishedClearingSessionFilters);
  }

  static finishedClearingSessionFilters() {
    window.location.replace('/logout');
  }

  render() {
    // Render the session refresher in logout mode, so we remove the YF session while logging out of the app
    return <EmbeddedSessionRefresher windowLocation={window.location.href} logout={true} />;
  }
}

export default LogoutWrapper;
