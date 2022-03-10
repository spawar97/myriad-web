// Contains store accessor and utility functions for components to use.
var ComponentStoreAccessor = {

  /******************** Task Components ********************/

  // Check if each task's tied reports/dashboard are ready inside the store.
  areRelatedFilesReady: function(immExposureStore) {
    return immExposureStore.get('tasks') && immExposureStore.get('tasks').every(function(immTaskWrapper) {
      var fileId = immTaskWrapper.getIn(['task', 'reportId']) || immTaskWrapper.getIn(['task', 'dashboardId']);
      return !fileId || immExposureStore.getIn(['files', fileId]);
    });
  }
};

module.exports = ComponentStoreAccessor;
