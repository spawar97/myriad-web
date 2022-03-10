var _ = require('underscore');
var Imm = require('immutable');

var MonitorUtil = {
  getResultTimestamp: function(immMonitorResult) {
    return parseInt(immMonitorResult.get('jobStartedAt'), 10);
  },

  /** Takes a `immMonitorFile` and applies the given updates to it.
    *
    * `updates` has the form:
    * {
    *   scaleFactors: {
    *     referenceName1: scaleFactor1 (string or number),
    *     referenceName2: scaleFactor2 (string or number),
    *     ...
    *   },
    *   thresholds: [
    *     thresholdScaleFactor (string or number),
    *     ...
    *   ],
    *   modificationNote: string
    * }
    *
    * Note: If any update value is null or undefined it will not be used.
    */
  getUpdatedImmMonitorFile: function(immMonitorFile, updates) {
    if (updates.scaleFactors) {
      var immMetrics = immMonitorFile.getIn(['monitor', 'metrics']).withMutations(function(mutMetrics) {
        mutMetrics.forEach(function(immMetric, index) {
          // If there is a scaleFactor update for this metric, use it.
          if (_.has(updates.scaleFactors, immMetric.get('referenceName'))) {
            var newScaleFactor = updates.scaleFactors[immMetric.get('referenceName')];
            mutMetrics.set(index, mutMetrics.get(index).set('scaleFactor', parseFloat(newScaleFactor)));
          }
        }.bind(this));
      }.bind(this));
      immMonitorFile = immMonitorFile.setIn(['monitor', 'metrics'], immMetrics);
    }
    if (updates.thresholds) {
      // Zip suffices here
      var oldThresholds = immMonitorFile.getIn(['monitor', 'thresholds']);
      var finalNewThresholds = oldThresholds.zip(Imm.List(updates.thresholds)).map(tuple => {
        var [oldThresholdObject, newThresholdValue] = tuple;
        return oldThresholdObject.set('scaleFactor', parseFloat(newThresholdValue));
      });
      immMonitorFile = immMonitorFile.setIn(['monitor', 'thresholds'], finalNewThresholds);
    }
    if (updates.modificationNote) {
      immMonitorFile = immMonitorFile.setIn(['monitor', 'modificationNote'], updates.modificationNote);
    }
    return immMonitorFile;
  }
};

module.exports = MonitorUtil;
