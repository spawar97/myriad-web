var _ = require('underscore');

module.exports = {

  /*
   * This prints out an ever larger table showing the property update history to the log.
   */
  debugPropertySequenceMixin: {
    propHistory: [],

    componentDidUpdate: function(prevProps) {
      console.groupCollapsed("Component updated on " + (new Date()));
      var curhist = this.propHistory;
      curhist.push(_.map(prevProps, function(item) {
        if (_.isObject(item) && 'toJS' in item) {
          return item.toJS();
        }
        return item;
      }));
      this.propHistory = curhist;
      console.table(curhist);
      console.groupEnd();
    }
  }
};
