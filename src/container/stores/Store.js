var _ = require('underscore');
let events = require('events');
events.defaultMaxListeners = 70;
var EventEmitter = events.EventEmitter;

var CHANGE_EVENT = 'change';

var Store = _.extend({

  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  onAjaxCompletion: function() {
    this.emitChange();
  },

  /**
   * @param {function} callback
   */
  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  /**
   * @param {function} callback
   */
  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }
}, EventEmitter.prototype);

module.exports = Store;
