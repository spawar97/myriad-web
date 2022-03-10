var FrontendConstants = require('./FrontendConstants');

// Exporting as array instead of map because the Dropdown this is used in expects an array.
module.exports = [
  {
    label: FrontendConstants.COUNT,
    value: 'count'
  },
  {
    label: FrontendConstants.MAXIMUM,
    value: 'max'
  },
  {
    label: FrontendConstants.MEAN,
    value: 'avg'
  },
  {
    label: FrontendConstants.MEDIAN,
    value: 'median'
  },
  {
    label: FrontendConstants.MINIMUM,
    value: 'min'
  },
  {
    label: FrontendConstants.STANDARD_DEVIATION,
    value: 'stddev'
  },
  {
    label: FrontendConstants.SUM,
    value: 'sum'
  }
];
