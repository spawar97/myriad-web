var Imm = require('immutable');

// The back-ticks consider indentation as a part of the string. The sample execPlan has to be
// in this funky indentation in order for it to look sane in the code mirror text block.
// The keys are the `monitor.execPlan.apiVersion`.
var ImmMonitorStudioHelpText = Imm.fromJS({
  1: {
    sampleFunction:
`function() {
  var result = {scores: [], errors: []};

  var latestFrame = _.last(dataFrames);

  // A function to compute the score for a what given a list of metric values.
  var computeScore = function(metricValues) {
    // Simply multiply each metric by its scaleFactor and sum them.
    return _.reduce(latestFrame.metrics, function(score, metricObj, metricName) {
      return score + metricValues[metricObj.index] * metricScaleFactors[metricName];
    }, 0);
  };

  // A function to compute the commonThreshold.
  var computeThreshold = function() {
    // Return a simple static threshold, equal to the thresholdScaleFactor.
    return 1.0 * thresholdScaleFactor;
  };

  // Apply the computeScore function to all whats, formatting the score object for that what
  // and storing it in the scores array.
  result.scores = _.map(latestFrame.whats, function(whatObj, whatIndex) {
    return _.extend({score: computeScore(latestFrame.data[whatIndex])}, whatObj);
  });

  // Run the computeThreshold function.
  result.commonThreshold = computeThreshold();

  return result;
}
`,
    helpText:
`/********************************************** Input **********************************************
Libraries available:
  - underscore (_)

Arguments in scope:
  - dataFrames
  - metricScaleFactors
  - thresholdScaleFactor
*/

// An array of dataFrame objects.
// Frames are sorted by the time they were created, ascending, such that the current frame (that the calculation
// should be performed on) is the last one. Suggested to access by _.last(dataFrames).
var dataFrames = [{
  // An array containing the "whats" for this monitor.
  // A "what" is a row in the table that the monitor is defined against. It will be treated as a series in the visualization.
  // In this case each "what" is a site because the monitor is defined against the "sites" table.
  "whats": [
    {
      // A hash of the uniquenessValues, useful for looking up a specific "what" historically.
      "whatIdentifier": "3afc20e93f4a8c5281ad23fb3da6d548e6324de195e3de4d0865555f3e623762",
      // Because each "what" is a row in the table, they are uniquely identified by the uniqueness columns configured
      // for that table (in the current schema). That is shown here by mapping the shortname of a uniqueness column to
      // the value that this "what" has for that column.
      "uniquenessValues": {
        "siteid": "0700"  // So this "what" is the site with siteid = "0700".
      }
    },
    ...
    {
      "whatIdentifier": "1fdc13485c8abdffe049567b9d704156b8922886f60ea97141a895715da301ac",
      "uniquenessValues": {
        "siteid": "0200"
      }
    },
    ...
  ],
  // Object mapping each metric's referenceName to its index in the inner arrays of the "data" array below.
  "metrics": {
    "mild": {
      "index": 0
    },
    "moderate": {
      "index": 1
    },
    "severe": {
      "index": 2
    }
  },
  // The data, in a 2D array.
  // Each inner array corresponds a "what" in the "what"s array (they share the same index).
  // Each element in an inner array corresponds to a metric, the indexes are in the metrics object above.
  "data": [
    [null, null, null],  // Note that these values are Numbers or null, make sure you handle the null case.
    ...
    // Using the metrics object above we can see that the metric with referenceName "moderate" returned a
    // value of 27 for this "what". The metric with referenceName "severe" returned a value of 20, etc.
    [51, 27, 20],
    ...
  ]
}];

// Object mapping a metric's referenceName to its scaleFactor.
var metricScaleFactors = {
  "mild": 1.0,
  "moderate": 1.5,
  "severe": 3.0
};

// Simple variable for the thresholdScaleFactor.
var thresholdScaleFactor = 10.0;

/********************************************** Output **********************************************
Required outputs:
  - results object
*/

// This object needs to be returned from the execPlan function.
var result = {
  // An array of score objects.
  "scores": [
    {
      // Generated score for this "what".
      // This value **MUST** be a plottable Number (i.e. cannot be null, undefined, Infinity, String, etc.), otherwise
      // an error string will be added to the errors array and this entire result will be reported as a failed result.
      // Consider defining a default score that makes sense with your monitor.
      "score": 0,
      // These two keys/values are sourced from the current data frame.
      // See the sample function for a reference implementation of how to map over the data frame.
      "whatIdentifier": "3afc20e93f4a"8c5281ad23fb3da6d548e6324de195e3de4d0865555f3e623762"",
      "uniquenessValues": {
        "siteid": "0700"
      }
    },
    ...
    {
      "score": 151.5,
      "whatIdentifier": "1fdc13485c8abdffe049567b9d704156b8922886f60ea97141a895715da301ac",
      "uniquenessValues": {
        "siteid": "0200"
      }
    },
    ...
  ],
  // The computed common threshold.
  // Again **MUST** be a plottable Number.
  "commonThreshold": 100,
  // An array of strings.
  // If this is non-empty then the visualization will not show the scores for this result and instead
  // show the list of errors.
  "errors": []
};`
  },
  2: {
    sampleFunction:
`function() {
  var result = {scores: [], errors: []};

  var latestFrame = _.last(dataFrames);
  var windowFrames = dataFrames.length == 1 ? dataFrames : _.first(dataFrames, dataFrames.length - 1);

  // A function to compute the score for a what given a list of metric values.
  var computeScore = function(metricValues) {
    // Simply multiply each metric by its scaleFactor and sum them.
    return _.reduce(latestFrame.metrics, function(score, metricObj, metricName) {
      return score + metricValues[metricObj.index] * metricScaleFactors[metricName];
    }, 0);
  };

  // Doesn't include null metric valued whats in the average or standard deviation
  var computeScoreForWindow = function(metricValues) {
    if (_.every(metricValues, _.isNull)) {
      return null;
    } else {
      return computeScore(metricValues);
    }
  }

  // Helper function to compute the average safeguarding against null values.
  var average = function(array) {
    var cleanedArray = _.filter(array, function(x) {return !_.isNull(x)})
    return _.reduce(cleanedArray, function(a, b) {
      return a + b;
    }, 0) / cleanedArray.length;
  }

  // Helper function to compute the standard deviation safeguarding against null values
  var stddev = function(array) {
    var cleanedArray = _.filter(array, function(x) {return !_.isNull(x)})
    var mean = average(cleanedArray);
    return Math.sqrt(average(_.map(cleanedArray, function(elem) {
      return Math.pow(elem - mean, 2);
    })));
  }

  // For each data frame in the window, compute scores.
  var scoresInWindow = _.map(windowFrames, function(dataFrame) {
    return _.map(dataFrame.whats, function(whatObj, whatIndex) {
      return computeScoreForWindow(dataFrame.data[whatIndex]);
    })
  });

  // Mean for each data frame's scores.
  var localMeans = _.map(scoresInWindow, function(daysScore) {
    return average(daysScore);
  })

  // Standard deviation for each data frame's scores.
  var localStddevs = _.map(scoresInWindow, function(daysScore) {
    return stddev(daysScore);
  })

  // Mean across the window.
  var windowMean = average(localMeans);
  // Standard deviation across the window.
  var windowStddev = average(localStddevs);

  // Compute the thresholds using the window mean and standard deviation.
  var computeThreshold = function() {
    // We rely on the scale factor to set the value.
    return _.map(thresholdScaleFactors, function(thresholdScaleFactor) { return Math.round(windowMean + thresholdScaleFactor * windowStddev); });
  };

  // Apply the computeScore function to all whats, formatting the score object for that what
  // and storing it in the scores array.
  result.scores = _.map(latestFrame.whats, function(whatObj, whatIndex) {
    return _.extend({score: computeScore(latestFrame.data[whatIndex])}, whatObj);
  });

  // Run the computeThreshold function.
  result.commonThreshold = computeThreshold();

  // Set an extra value to the windowMean
  result.extra = windowMean;

  return result;
}
`,
    helpText:
`/********************************************** Input **********************************************
Libraries available:
  - underscore (_)

Arguments in scope:
  - dataFrames
  - metricScaleFactors
  - thresholdScaleFactor
*/

// An array of dataFrame objects.
// Frames are sorted by the time they were created, ascending, such that the current frame (that the calculation
// should be performed on) is the last one. Suggested to access by _.last(dataFrames).
var dataFrames = [{
  // An array containing the "whats" for this monitor.
  // A "what" is a row in the table that the monitor is defined against. It will be treated as a series in the visualization.
  // In this case each "what" is a site because the monitor is defined against the "sites" table.
  "whats": [
    {
      // A hash of the uniquenessValues, useful for looking up a specific "what" historically.
      "whatIdentifier": "3afc20e93f4a8c5281ad23fb3da6d548e6324de195e3de4d0865555f3e623762",
      // Because each "what" is a row in the table, they are uniquely identified by the uniqueness columns configured
      // for that table (in the current schema). That is shown here by mapping the shortname of a uniqueness column to
      // the value that this "what" has for that column.
      "uniquenessValues": {
        "siteid": "0700"  // So this "what" is the site with siteid = "0700".
      }
    },
    ...
    {
      "whatIdentifier": "1fdc13485c8abdffe049567b9d704156b8922886f60ea97141a895715da301ac",
      "uniquenessValues": {
        "siteid": "0200"
      }
    },
    ...
  ],
  // Object mapping each metric's referenceName to its index in the inner arrays of the "data" array below.
  "metrics": {
    "mild": {
      "index": 0
    },
    "moderate": {
      "index": 1
    },
    "severe": {
      "index": 2
    }
  },
  // The data, in a 2D array.
  // Each inner array corresponds a "what" in the "what"s array (they share the same index).
  // Each element in an inner array corresponds to a metric, the indexes are in the metrics object above.
  "data": [
    [null, null, null],  // Note that these values are Numbers or null, make sure you handle the null case.
    ...
    // Using the metrics object above we can see that the metric with referenceName "moderate" returned a
    // value of 27 for this "what". The metric with referenceName "severe" returned a value of 20, etc.
    [51, 27, 20],
    ...
  ]
}];

// Object mapping a metric's referenceName to its scaleFactor.
var metricScaleFactors = {
  "mild": 1.0,
  "moderate": 1.5,
  "severe": 3.0
};

// Simple variable for the thresholdScaleFactors.
var thresholdScaleFactors = [10.0];

/********************************************** Output **********************************************
Required outputs:
  - results object
*/

// This object needs to be returned from the execPlan function.
var result = {
  // An array of score objects.
  "scores": [
    {
      // Generated score for this "what".
      // This value **MUST** be a plottable Number (i.e. cannot be null, undefined, Infinity, String, etc.), otherwise
      // an error string will be added to the errors array and this entire result will be reported as a failed result.
      // Consider defining a default score that makes sense with your monitor.
      "score": 0,
      // These two keys/values are sourced from the current data frame.
      // See the sample function for a reference implementation of how to map over the data frame.
      "whatIdentifier": "3afc20e93f4a8c5281ad23fb3da6d548e6324de195e3de4d0865555f3e623762",
      "uniquenessValues": {
        "siteid": "0700"
      }
    },
    ...
    {
      "score": 151.5,
      "whatIdentifier": "1fdc13485c8abdffe049567b9d704156b8922886f60ea97141a895715da301ac",
      "uniquenessValues": {
        "siteid": "0200"
      }
    },
    ...
  ],
  // The computed common thresholds.
  // Again **MUST** be a plottable Number.
  "commonThreshold": [100],
  // An array of strings.
  // If this is non-empty then the visualization will not show the scores for this result and instead
  // show the list of errors.
  "errors": []
};`
  }
});

module.exports = ImmMonitorStudioHelpText;
