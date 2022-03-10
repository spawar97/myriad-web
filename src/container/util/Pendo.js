require('es6-promise').polyfill();
require('isomorphic-fetch');
import Cookies from 'js-cookie';
import FrontendConstants from '../constants/FrontendConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
import ExposureActions from '../actions/ExposureActions';

var PendoUtil = {

    /**
     * Grabs all data intended for Pendo consumption
     */
    getData: function(immAppConfig) {
        const deploymentName = immAppConfig.get('deploymentName');
        const accountId = immAppConfig.get('currentAccountId');
        return {
            enabled: immAppConfig.get('pendoEnabled'),
            apiKey: immAppConfig.get('pendoApiKey'),
            userId: immAppConfig.getIn(['userInfo', 'id']) + '-' + deploymentName,
            email:  immAppConfig.getIn(['userInfo', 'username'], ''),
            accountId: accountId,
            accountName: immAppConfig.getIn(['accountMap', accountId, 'account', 'displayName']),
            isComprehendUser: this.isComprehendUser(immAppConfig),
        }
    },

    isComprehendUser(immAppConfig) {
      const comprehendEmailRegex = new RegExp('@comprehend.com$');
      const saamaEmailRegex = new RegExp('@saama.com$');
      const username = immAppConfig.getIn(['userInfo', 'username'], '');
      return comprehendEmailRegex.test(username) || saamaEmailRegex.test(username);
    }
};

var pendoData = PendoUtil.getData(comprehend.globals.immAppConfig);

if (pendoData.enabled) {
    initializePendo();

    // 5 min in milliseconds
    const pendoHealthCheckInterval = 300000;

    setInterval(() => {
        let isPendoInitialized = false;
        Promise.resolve().then(() => {
            try {
                isPendoInitialized = pendo.isReady();
            } catch (exception) {
                isPendoInitialized = false;
            }
        }).finally(() => {
            if (isPendoInitialized) {
                const pendoLoadGuidesAvailabilityCheck1 =
                  fetch(`https://app.pendo.io/data/ptm.gif/${pendoData.apiKey}?v=test&ct=${Date.now()}&jzb=test`);
                const pendoLoadGuidesAvailabilityCheck2 =
                  fetch(`https://app.pendo.io/data/guide.js/${pendoData.apiKey}?jzb=test&v=test&ct=${Date.now()}`);
                let isGuidesBlocked = true;
                Promise.all([pendoLoadGuidesAvailabilityCheck1, pendoLoadGuidesAvailabilityCheck2])
                  .then(() => {
                    isGuidesBlocked = false;
                }).catch(() => {
                    console.log("Guides error in Pendo: Failed to fetch guids URLs.");
                }).finally(() => {
                    if (isGuidesBlocked) {
                        checkForNeedDisplayPendoBlockedNotification();
                    } else {
                        Cookies.set('isPendoBlocked', false);
                        Cookies.remove('pendoBlockedLastNotifiedDate');
                    }
                });
            } else {
                checkForNeedDisplayPendoBlockedNotification();
                initializePendo();
            }
        });
    }, pendoHealthCheckInterval);
}

function initializePendo() {
    const pendoInitializationAvailabilityCheck =
      fetch(`https://cdn.pendo.io/agent/static/${pendoData.apiKey}/pendo.js`);

    pendoInitializationAvailabilityCheck.then(() => {
        (function(apiKey){
            (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=[];
                v=['initialize','identify','updateOptions','pageLoad'];for(w=0,x=v.length;w<x;++w)(function(m){
                    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
                y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
                z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
        })(pendoData.apiKey);

        pendo.initialize({
            sanitizeUrl: function(url) {
                if (url.includes('home/tab')){
                    url += '/' + document.getElementsByClassName('tablinks home-page-report-tab active')[0].title;
                } else if (url.includes('reports') || url.includes('dashboards')){
                    if (url.includes('drilldownId')) {
                        url += '/';
                    }
                    const fileTitleTextElement = document.getElementsByClassName("file-title-text");
                    const textContent = fileTitleTextElement && fileTitleTextElement[0] && fileTitleTextElement[0].textContent
                        || '';

                    url += textContent;

                }
                // console.log("Pendo sanitized url: " + url);
                return url;
            },
            visitor: {
                id:        pendoData.userId,  // Required if user is logged in
                email:     pendoData.email,
                // role:         // Optional

                // You can add any additional visitor level key-values here,
                // as long as it's not one of the above reserved names.
                isComprehendUser: pendoData.isComprehendUser,
            },
            account: {
                id:       pendoData.accountId, // Highly recommended
                // planLevel:    // Optional
                // planPrice:    // Optional
                // creationDate: // Optional

                // You can add any additional account level key-values here,
                // as long as it's not one of the above reserved names.
                accountName: pendoData.accountName,
            }
        });
    }).catch(() => {
        console.log("Pendo initialization error: Failed to fetch initialization URL.");
    });
}

function checkForNeedDisplayPendoBlockedNotification() {
    if (Cookies.get('isPendoBlocked') === "true") {
        // Pendo already bloсked. Check for the need to display a new Pendo blocking notification (once a day).
        const oneDayInMilliseconds = 86400000;
        const pendoLastNotifiedDate = Cookies.get('pendoBlockedLastNotifiedDate');
        const timePassedSinceLastNotification = Date.now() - pendoLastNotifiedDate;
        if (oneDayInMilliseconds - timePassedSinceLastNotification <= 0) {
            showPendoBlockingNotification();
        }
    } else {
        // Pendo is blocked. Show the first pendo blocking notification.
        showPendoBlockingNotification();
        Cookies.set('isPendoBlocked', true);
    }
}

function showPendoBlockingNotification() {
    // 5 seconds in milliseconds
    const toastTimeout = 5000;
    //split up the domain
    const domainArray = window.location.hostname.split('.');
    let domain;
    if (domainArray.length < 3) {
        //for myriad.local
        domain = domainArray[domainArray.length - 2] + '.' + domainArray[domainArray.length - 1];
    } else {
        //for *.lsac.cloud
        domain = '*.' + domainArray[domainArray.length - 2] + '.' + domainArray[domainArray.length - 1];
    }

    ExposureActions.createStatusMessageWithCustomTimeout(FrontendConstants.PENDO_BLOCKED + domain,
      StatusMessageTypeConstants.TOAST_ERROR, toastTimeout);
    Cookies.set('pendoBlockedLastNotifiedDate', Date.now());
}

module.exports = PendoUtil;
export default PendoUtil;
