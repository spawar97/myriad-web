var ExposureActions = require('../actions/ExposureActions');
//PUB-SUB model to watch and update changes required at run-time.
function pubSub(fileId) {

    const subscribers = {};
    const waitWidgets = {};

    //method for publishing chages.
    async function publish(eventName, data) {
      if (!Array.isArray(subscribers[eventName])) {
        return
      }
  
      let widgetList = [];

      for (const [index, callback] of subscribers[eventName].entries()) {
        let waitCallBack;
        if (waitWidgets[eventName][index] === 'wait') {
          waitCallBack = await callback(data);
          widgetList.push(waitCallBack);
        } else {
          waitCallBack = callback(data);
          widgetList.push(waitCallBack);
        }
      }
    }
    //method for listening on changes done by publish.
    function subscribe(eventName, callback, isWait='') {
        if (!Array.isArray(subscribers[eventName])) {
            subscribers[eventName] = []
        }

        if (!Array.isArray(waitWidgets[eventName])) {
          waitWidgets[eventName] = []
        }
      
        subscribers[eventName].push(callback);
        waitWidgets[eventName].push(isWait);
        
        return {
            unsubscribe() {
                subscribers[eventName] = subscribers[eventName].filter((cb) => {
                    // Does not include the callback in the new array
                    if (cb === callback) {
                        return false
                    }
                    return true
                })
            },
        }
    }

    return {
        publish,
        subscribe,
    }
}

export default pubSub;
