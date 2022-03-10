import React from 'react';
import PropTypes from 'prop-types';
import ExposureActions from '../actions/ExposureActions';
import FrontendConstants from '../constants/FrontendConstants';
import _ from 'underscore';
import AdminActions from '../actions/AdminActions';

/**
 * Higher order component that will do a few things:
 *  1. When the router leaves the component, will fire the `isDirty` method of the child component
 *      - If the child component is Dirty, will display a modal dialog asking whether to save/discard changes
 *  2. If a modal is being shown, the message is pulled in from the child's function unsavedWorkModalCopy if specified,
 *     otherwise a default message will be displayed
 *  3. If we leave, close all modals <-- this is used for the majority of components
 * @param WrappedComponent - The component to wrap with this functionality
 *
 * API Details for components using this HOC -
 *  isDirty(): Boolean -> Flags whether there is unsaved content on the page and navigation should be blocked
 *  unsavedWorkModalCopy(): {header: String, content: String} -> Message to display in a modal that shows if there is unsaved work
 */
var withTransitionHelper = (WrappedComponent, isAdmin) => {

  return class TransitionHelper extends React.PureComponent {
    static contextTypes = {
      router: PropTypes.object
    };

    static propTypes = {
      route: PropTypes.object
    };

    constructor(props) {
      super(props);
      this.routerWillLeave = this.routerWillLeave.bind(this);
    }

    /**
     * Once the component mounts, attach the router leave hook
     */
    componentDidMount() {
      this.context.router.setRouteLeaveHook(this.props.route, this.routerWillLeave);
    }

    /**
     * Hook that will check whether the child component has any unsaved work, and if so, it will display the modal
     * as appropriate.
     *
     * Regardless of whether any of the API functions are implemented, this will ensure that any open modal is
     * closed once navigation occurs
     * @param nextLocation
     * @returns {string}
     */
    routerWillLeave(nextLocation) {
      const closeModalAction = isAdmin ? AdminActions.closeModal : ExposureActions.closeModal;
      // Clear the vizspec skip index prior to performing navigation, so it is not persisted unintentionally
      ExposureActions.clearSkipIndex();

      // Get the saved messages from the wrapped component's unsavedWorkModalCopy implementation
      const unsavedMessages = this.wrappedComponent && _.isFunction(this.wrappedComponent.unsavedWorkModalCopy)
        ? this.wrappedComponent.unsavedWorkModalCopy()
        : {};
      const messageHeader = unsavedMessages.header
          ? unsavedMessages.header
          : FrontendConstants.DISCARD_CHANGES;
      const messageContent = unsavedMessages.content
          ? unsavedMessages.content
          : FrontendConstants.IF_YOU_DONT_SAVE_CHANGES_WILL_BE_LOST;

      // Check if the isDirty function is implemented, and if so display the modal if there are unsaved changes
      // Otherwise, it will close any open modals.
      const nowPath = this.props.location.pathname;
      const nextPath = nextLocation.pathname;
      if (this.wrappedComponent && _.isFunction(this.wrappedComponent.isDirty) &&
        ((nowPath !== '/data-review/tasks/new' && nowPath !== '/tasks/new') ||
        (nextPath !== '/data-review/tasks/new' && nextPath !== '/tasks/new'))) {
          if (this.wrappedComponent.isDirty()) {
            return `${messageHeader}|${messageContent}`;
          }
          else {
           closeModalAction();
          }
      }
      // If we have no isDirty method, we should still close all modals (i.e. the share modal)
      else {
        closeModalAction();
      }
    }

    render() {
      // firstLevelRegistered is necessary that the internal component does not override the configuration of the external component.
      // Pass the props through to the child component
      return <WrappedComponent
        {...this.props}
        ref={(component) => {
          this.wrappedComponent = component;
        }}
      />;
    }
  }
};

module.exports = { withTransitionHelper };
