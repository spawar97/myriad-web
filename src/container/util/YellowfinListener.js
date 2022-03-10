/* Code provided by eVizi: https://github.com/comprehend/yellowfin/pull/3 */
import _ from 'underscore';
import Imm from 'immutable';

var Yellowfin = {Yellowfin : {}};
window.Yellowfin = {yellowfin : {}};

/**
 * id listener class It will receive and dispatch all id events Any custom listener
 *
 * Example myCustomListener = function(id, eventName, eventArgs){...}
 * window.Yellowfin.Listener.addListener(myCustomListener);
 *
 */
Yellowfin.eventListener = function() {
  this.listeners = {};
  this.init();
};


Yellowfin.eventListener.prototype = {
  init : function() {
    (window.addEventListener && window.addEventListener('message', this.receiveMessage, false) // FF,SA,CH,OP,IE9+
    || window.attachEvent && window.attachEvent('onmessage', this.receiveMessage)); // IE8
  },
  /**
   * Adds a id listener.
   *
   * @param {object}
   *            context the context in which the listener will be called.
   * @param {string}
   *            eventName the event for this listener.
   * @param {function}
   *            listener the listener function. example
   *            receiveComprehendEvent(id, eventName, eventArgs)
   */
  addListener : function(context, eventName, listener) {
    if (typeof eventName !== 'string')
      return;

    this.listeners[eventName] = this.listeners[eventName] || [];
    this.listeners[eventName].push({
      fn : listener,
      context : context
    });
  },

  /**
   * Removes an event listener
   * @param context {object} - Reference to the context the listener is registered to
   * @param eventName {string} - The name of the event
   */
  removeListener : function(context, eventName) {
    this.listeners[eventName] = _.reject(this.listeners[eventName], function(listener) {
      return listener.context === context;
    });

    if (this.listeners[eventName] && this.listeners[eventName].length === 0) {
      delete this.listeners[eventName];
    }
  },

  /**
   * This function will trigger a id event to all the current
   * listeners
   */
  triggerEvent : function(id, eventName, eventArgs) {
    if (this.listeners[eventName]) {
      for ( var i = 0; i < this.listeners[eventName].length; i++) {
        var context = this.listeners[eventName][i].context;
        this.listeners[eventName][i].fn.call(context, eventArgs, id);
      }
    }
  },

  /**
   * Verifies that the origin of the message is from the expected Yellowfin URL.
   * be generous in matching URLs because:
   *
   *  1 - browsers will strip the message origin if the message is the sender is running on the default port.
   *  2 - IE10 compatibility.
   *
   * @param origin - the URL origin of the event
   * @returns {boolean} - whether the message is from the correct origin (Yellowfin Url)
   */
  isMessageOriginExpected(origin) {
    const immConfig = comprehend.globals.immAppConfig;
    // Get the Yellowfin URL from the global App config as the store isn't available to this module
    const url = `${immConfig.get('yellowfinProtocol')}${immConfig.get('yellowfinHost')}:${immConfig.get('yellowfinPort')}`;

    return (origin === url)
      || (url.indexOf("http://") === 0 && (origin + ":80") === url)
      || (url.indexOf("https://") === 0 && (origin + ":443") === url);
  },

  /**
   * Handler for when the listener receives a message from Yellowfin
   * @param e - The event
   */
  receiveMessage: function(e){
    // Verify that the origin is expected, then trigger the event
    if (window.Yellowfin.eventListener.isMessageOriginExpected(e.origin)){
      if (e.data.comprehendEvent){
        window.Yellowfin.eventListener.triggerEvent(this, e.data.comprehendEvent, e.data.comprehendData);
      }
    }
  },

  /**
   * Sends a message to the embedded Yellowfin instance using window.postMessage API.
   * @param yellowfinUrl - URL of the embedded YF instance. Please pull from immExposureStore
   * @param eventName    - Name of the message/event to send to YF
   * @param dataObj      - Object containing any necessary data to send along to YF
   */
  sendMessage: function(yellowfinUrl, eventName, dataObj) {
    var yellowfinIframe = document.getElementById('yellowfinEmbeddedIframe').contentWindow;
    if (yellowfinIframe){
      yellowfinIframe.postMessage({
        comprehendEvent : eventName,
      	comprehendData : dataObj
      }, yellowfinUrl);
    }

  }
};

window.Yellowfin.eventListener = new Yellowfin.eventListener();
