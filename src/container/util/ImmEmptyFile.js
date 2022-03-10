var Imm = require('immutable');

var ImmEmptyFile = function(fileType) {
  return Imm.fromJS({
    title: '',
    description: '',
    fileType: fileType,
    includedDynamicFilters: [],
    includedStaticFilters: [],
    reportIds: [],
    fileIds: [],
    associatedFileIds: [],
    drilldownFileIdMap: [{key: '_all', list: []}],
    advancedFileAttributes: { dataReviewRoles: [] },
    modules: [],
    tags: []
  });
};

module.exports = ImmEmptyFile;
