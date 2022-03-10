var _ = require('underscore');
var Util = require.requireActual('../util');

// Only add Util functions that need to be overridden for test in this file.
module.exports = _.extend(Util, {
  get2dCanvasContext: function() {
    return {
      measureText: function(sometext) {
        return {width: sometext.length * 14};
      }
    };
  },

  getWidestFont: function() {
    return 'Helvetica';
  }
});
