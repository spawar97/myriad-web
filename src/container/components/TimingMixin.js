// Simple mixin to aid with timeouts and intervals.
// Cleans up on unmount by clearing all timeouts and intervals.
// Adapted and extended from https://facebook.github.io/react/docs/reusable-components.html#mixins.
var TimingMixin = {
  componentWillMount: function() {
    this.intervalIds = [];
    this.timeoutIds = [];
  },

  setInterval: function() {
    this.intervalIds.push(setInterval.apply(null, arguments));
  },

  setTimeout: function() {
    this.timeoutIds.push(setTimeout.apply(null, arguments));
  },

  clearIntervals: function() {
    this.intervalIds.forEach(clearInterval);
    this.intervalIds = [];
  },

  clearTimeouts: function() {
    this.timeoutIds.forEach(clearTimeout);
    this.timeoutIds = [];
  },

  componentWillUnmount: function() {
    this.clearTimeouts();
    this.clearIntervals();
  }
};

module.exports = TimingMixin;
