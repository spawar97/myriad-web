/*
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * AppDispatcher
 *
 * A singleton that operates as the central hub for application updates.
 */

var Dispatcher = require('flux').Dispatcher;

/**
 * A bridge function between the views and the dispatcher, marking the action
 * as a view action.  Another variant here could be handleServerAction.
 * @param  {object} action The data coming from the view.
 */
Dispatcher.prototype.handleViewAction = function (action) {


  if (!this._isDispatching) {
    this.dispatch({
      source: 'VIEW_ACTION',
      action: action
    });
  } else {
    let that = this;

    try {

      that.dispatch({
        source: 'VIEW_ACTION',
        action: action
      })

    } catch (err) {
      return null
    }

  }

};

module.exports = new Dispatcher();
