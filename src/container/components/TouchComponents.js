import React from 'react';
import _ from 'underscore';

/**
 * This is a higher order component that will wrap a given component with touch event handlers (i.e. onClick, onTouchMove,
 * onTouchEnd, etc.
 * @param WrappedComponent
 * @returns {TC} - The TouchComponent version of the wrapped component
 */
const withTouch = (WrappedComponent) => {
   return class TC extends React.PureComponent {
    constructor(props) {
      super(props);
      this.state = {
        lockedEventHandling: false,
        movedTouch: false
      };
    }

    handleClick(e) {
      if (!this.state.lockedEventHandling) {
        this.props.onClick(e);
      } else {
        // This is a ghostclick we can ignore. Some browsers won't stop it from happening despite `e.preventDefault()`.
        this.setState({lockedEventHandling: false});
      }
    }

    handleTouch(e) {
      let { lockedEventHandling, movedTouch } = this.state;

      if (!movedTouch) {
        // This prevents underlying or new elements from receiving the touch. This won't block scrolling, since we only
        // land here if we aren't moving.
        e.preventDefault();
        lockedEventHandling = true;
        this.props.onClick(e);
      }

      this.setState({movedTouch: false, lockedEventHandling})
    }

    // This ensures that we don't triggered onTouchEnd for scroll events
    handleMove() {
      this.setState({movedTouch: true});
    }

    render() {
      // If we have an onClick property attached, then add all the corresponding click handler functions
      const touchProps = _.isFunction(this.props.onClick)
        ? {onClick: this.handleClick.bind(this), onTouchEnd: this.handleTouch.bind(this), onTouchMove: this.handleMove.bind(this)}
        : null;

      const props = _.extend({}, this.props, touchProps);

      return  <WrappedComponent {...props} />;
    }
  }
};

// Convert a div element to a Component to feed into the HOC (Higher Order Component)
class WrappedDiv extends React.PureComponent {
  render() {
    return <div {...this.props}>{this.props.children}</div>;
  }
}

// Convert a span element to a Component to feed into the HOC
class WrappedSpan extends React.PureComponent {
  render() {
    return <span {...this.props}>{this.props.children}</span>;
  }
}

// Create a wrapped TouchDiv component
const TouchDiv = withTouch(WrappedDiv);
TouchDiv.displayName = 'TouchDiv';

// Create a wrapped TouchSpan component
const TouchSpan = withTouch(WrappedSpan);
TouchSpan.displayName = 'TouchSpan';

module.exports = {
  TouchDiv: TouchDiv,
  TouchSpan: TouchSpan
};

export {TouchDiv, TouchSpan};
