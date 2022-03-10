var _ = require('underscore');
var Imm = require('immutable');

var ComprehendSchemaUtil = {
  allUniquenessVerified: function(immWorkingCsDatasources) {
    return immWorkingCsDatasources.every(function(immDatasource) {
      return !immDatasource.get('checkboxState') || immDatasource.get('tables').every(function(immTable) {
        return !immTable.get('checkboxState') || immTable.get('uniquenessStatus') === 'Verified';
      });
    });
  },

  // Returns a list of Table Path whose uniqueness is not verified.
  listUniquenessNotVerified: function(immWorkingCsDatasources) {
    return immWorkingCsDatasources
      .filter(function(immDatasource) { return immDatasource.get('checkboxState'); })
      .flatMap(function(immDatasource) {
        return immDatasource.get('tables')
          .filter(function(immTable) {
            return immTable.get('checkboxState') && immTable.get('uniquenessStatus') !== 'Verified';
          }).map(function(immTable) {
            return Imm.List(['workingCs', 'datasources', immDatasource.get('shortName'), 'tables', immTable.get('shortName')]);
          });
      }).toList();
  },

  // Returns the total and uniqueness verified tables count.
  tablesCount: function(immWorkingCsDatasources) {
    return {
      total: immWorkingCsDatasources.reduce(function(count, immDatasource) {
        return count + immDatasource.get('tables').count(function(immTable) {
          return immTable.get('checkboxState');
        });
      }, 0),
      uniquenessVerified: immWorkingCsDatasources.reduce(function(count, immDatasource) {
        return count + immDatasource.get('tables').count(function(immTable) {
          return immTable.get('checkboxState') && immTable.get('uniquenessStatus') === 'Verified';
        });
      }, 0)
    };
  },

  // Converts a column string from the backend ("<<datasource short name>>.<<table short name>>.<<column short name>>")
  // to a path for use in the schema editor ([<<datasource short name>>, 'tables', <<table short name>>, 'columns', <<column short name>>]).
  columnStringToPath: function(endpoint) {
    var shortNames = endpoint.split('.');
    var datasource = shortNames[0];
    var table = shortNames[1];
    var column = shortNames[2];
    var path = [datasource, 'tables', table, 'columns', column];
    return Imm.fromJS(path);
  },

  durationGPPChartExists: function(immCharts, skipIndex, immTablePath) {
    return immCharts.some(function(immChart, index) {
      return index !== skipIndex && immChart.get('type') === 'Duration' && immTablePath.equals(immChart.get('tablePath'));
    });
  },

  isComprehendSchemaLoading: function(immAdminStore) {
    return immAdminStore.get('datasourcesAreLoading') ||
      immAdminStore.get('comprehendSchemaIsLoading') ||
      _.isNull(immAdminStore.get('datasources')) ||
      _.isNull(immAdminStore.getIn(['workingCs', 'datasources']));
  },

  // stripCsMetadata filters out all of the properties which are used only for displaying datasources and remembering user's interactions.
  // It is currently used to compare the loaded Comprehend Schema and the working Comprehend Schema to determine
  // whether the user has made some changes in the data of the working Comprehend Schema.
  stripCsMetadata: function(immCs){
    // 'values' is used to store data for a single table, which needs to be filtered out.
    var metadataKeys = ['batchEditExpanded', 'batchEditCheckboxState', 'columnOrdering', 'expanded', 'inSearch', 'selected', 'selectedNodeKeyPath', 'tableDataIsLoading', 'values'];
    var stripFunc = function(immData) {
      // We throw away all the metadataKeys first, then recursively strip remaining values.
      return immData.filterNot(function(v, k) {
        return _.contains(metadataKeys, k);
      }).map(function(v, k) {
        // The value, `v`, here is a Map of `UUID` -> Map[Datasource|Table|Column].
        // We want to run `stripFunc` on the datasource, table, or column objects.
        return _.contains(['datasources', 'tables', 'columns'], k) ? (v ? v.map(stripFunc) : v) : v;
      });
    };
    return stripFunc(immCs);
  },

  getTableUniquenessStatus: function(tableLegacy) {
    var tableUniqueness = _.filter(tableLegacy.metadata, function(element) {
      return element.type === 'table-uniqueness';
    });
    return _.isEmpty(tableUniqueness) ? 'Unchecked' : tableUniqueness[0].value;
  },

  hasDRTProperties: function(tableLegacy) {
    return tableLegacy.reviewFlagLabel && tableLegacy.reviewStatusLabel && tableLegacy.reviewAssigneeLabel && !_.isEmpty(tableLegacy.reviewStatusLabels);
  },

  // Determines if a GPP chart configuration is valid.
  // * For duration charts, the tablePath, mainColumnPath, lowerBoundPath, & upperBoundPath must be defined and not null.
  // * For numeric charts, the tablePath, mainColumnPath, & the corresponding datePath must also be defined and not null.
  //   Additionally, both lowerBoundPath and upperBoundPath are defined and not null, or both are undefined or null.
  isValidGPPChart: function(immChart, immNumericChartDatePaths) {
    var validChart = immChart.get('tablePath') && immChart.get('mainColumnPath');
    if (!validChart) {
      return false;
    }
    switch (immChart.get('type')) {
      case 'Numeric':
        var tableString = ComprehendSchemaUtil.pathToTableString(immChart.get('tablePath'));
        validChart = validChart && immNumericChartDatePaths.getIn([tableString, 'datePath']);

        var noLowerBoundPath = !immChart.has('lowerBoundPath') || _.isNull(immChart.get('lowerBoundPath'));
        var noUpperBoundPath = !immChart.has('upperBoundPath') || _.isNull(immChart.get('upperBoundPath'));
        validChart = validChart && (noLowerBoundPath === noUpperBoundPath);
        break;
      case 'Duration':
        validChart = validChart && immChart.get('lowerBoundPath') && immChart.get('upperBoundPath');
        break;
      default:
        validChart = false;
    }
    return validChart;
  },

  numericGPPChartExists: function(immCharts, skipIndex, immMainColumnPath) {
    return immCharts.some(function(immChart, index) {
      return index !== skipIndex && immChart.get('type') === 'Numeric' && immMainColumnPath.equals(immChart.get('mainColumnPath'));
    });
  },

  // Converts an endpoint path ([<<datasource short name>>, 'tables', <<table short name>>, 'columns', <<column short name>>])
  // to a string parseable by the backend ("<<datasource short name>>.<<table short name>>.<<column short name>>").
  pathToColumnString: function(immPath) {
    var dsShortName = immPath.get(0);
    var tableShortName = immPath.get(2);
    var columnShortName = immPath.get(4);
    return [dsShortName, tableShortName, columnShortName].join('.');
  },

  // Converts an endpoint path ([<<datasource short name>>, 'tables', <<table short name>>, 'columns', <<column short name>>])
  // to an object that can be used for displaying the edge endpoint in the frontend.
  pathToEdgeDescriptor: function(immPath, immDatasources) {
    return {
      tableShortName: immDatasources.getIn(immPath.take(3).push('shortName')),
      tableLongName: immDatasources.getIn(immPath.take(3).push('longName')),
      colShortName: immDatasources.getIn(immPath.push('shortName')),
      colLongName: immDatasources.getIn(immPath.push('longName'))
    };
  },

  // Converts an endpoint path ([<<datasource short name>>, 'tables', <<table short name>>])
  // to a string parseable by the backend ("<<datasource short name>>.<<table short name>>").
  pathToTableString: function(immPath) {
    var dsShortName = immPath.get(0);
    var tableShortName = immPath.get(2);
    return [dsShortName, tableShortName].join('.');
  },

  // Converts a table string from the backend ("<<datasource short name>>.<<table short name>>")
  // to a path for use in the schema editor ([<<datasource short name>>, 'tables', <<table short name>>]).
  tableStringToPath: function(endpoint) {
    var shortNames = endpoint.split('.');
    var datasource = shortNames[0];
    var table = shortNames[1];
    var path = [datasource, 'tables', table];
    return Imm.fromJS(path);
  }
};

module.exports = ComprehendSchemaUtil;
