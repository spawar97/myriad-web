var Imm = require('immutable');
var ExposureActions = require('../actions/ExposureActions');
const ExposureAppConstants = require('../constants/ExposureAppConstants');
import FrontendConstants from '../constants/FrontendConstants';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
let exposureStore = {};

const getExposureStoreForExport = (store) =>{
  exposureStore = store;
}

var PDFExportUtil = {

    pdfExportDataProcess: function(props, reportType) {
         var reportHTML = "";
        $(document.getElementById("pdf-export-button")).off('click').on('click',function () {
          var title= '';
          var filterStates ='';
          var filterData = [];
          var tabularReportData =null;
          let store = exposureStore.getExposureStore().toJS();
          var filterFlag = false;
          if(ExposureAppConstants.REPORT_TYPE_GRAPHICAL == reportType) {
            title = props.immReport.getIn(['fileWrapper', 'file', 'title'], '');
            let includedDynamicFilters = props.immReport.getIn(['fileWrapper', 'file', 'includedDynamicFilters'], Imm.List());
            filterStates = props.immReport.getIn(['filterStates'], Imm.List());
            filterStates.map(function(filterstate, idx) {
              let includedDynamicFilter = includedDynamicFilters.get(idx);
              if(!includedDynamicFilter.get('hidden')){
                var itemsSelected =filterstate.get('itemsSelected').join(', ');
                if(itemsSelected != '') {
                  filterFlag = true;
                }
                var data = filterstate.get('data').join(', ');
                var displayString=  filterstate.get('column').get('displayString');
                let filterObject = {"displayString" : displayString, "itemsSelected": itemsSelected, 'data': data};
                filterData.push(filterObject)
              }
            });
          } else if(ExposureAppConstants.REPORT_TYPE_TABULAR == reportType){
            tabularReportData = props.immRows;
            title = props.title;
          }
          reportHTML = document.getElementsByClassName("report-widget")[0].innerHTML;    
          var showHeader = 'true'; 
          var showFooter = 'true';
          var pageSize = 'A2'; 
          var showFilter = 'true';
          var showWaterMark = 'true'; 
          var appliedFilter = 'false';

          var chartData;
          if(title == 'Study Summary') {
            chartData = JSON.stringify(props.configs);
          } else if(store.cqsPDFChartData && store.cqsPDFChartData[0].hasOwnProperty('metadata')) {
            var sortedChartData = store.cqsPDFChartData.sort(function bySequence(a, b) { 
              return b.metadata.sequence < a.metadata.sequence ?  1 
                   : b.metadata.sequence > a.metadata.sequence ? -1 
                   : 0;                 
            });
            chartData = JSON.stringify(sortedChartData);
          } else {
            chartData = JSON.stringify(store.cqsPDFChartData)
          }
          let pdfPrimeTableDataObj = [];
          if(title == 'Site Summary') {
            pdfPrimeTableDataObj = store.pdfPrimeTableData;
          }
          if(title == 'Portfolio Summary') {
            pageSize = 'A1';
          }
          var today = new Date();
          let fileName = title.replace(/\s/g, '_')+"_"+PDFExportUtil.formatDate("dd_MMM_yyyy_HH_mm_ss", today)+".pdf";
          var requestModel = {"reportHTML": encodeURIComponent(reportHTML), "dashboardName": title, "showHeader" : showHeader, "showFooter": showFooter, "pageSize" :pageSize, "showFilter": showFilter, "appliedFilter" : appliedFilter,  "showWaterMark" :  showWaterMark, "filterData" : filterData, "reportType" : reportType, "chartData" : encodeURIComponent(chartData), "pdfPrimeTableData" : pdfPrimeTableDataObj, "fileName": fileName}
          ExposureActions.createStatusMessage(
            FrontendConstants.PDF_EXPORT_INITIATED(title),
            StatusMessageTypeConstants.TOAST_SUCCESS
          );
          ExposureActions.exportPDF(requestModel);
        });
      },
      formatDate: function (formatStr, date, opts) {
        if (!date) {
            date = new Date();
        }
        opts = opts || {};
        let _days = opts.days;
        if (!_days) {
            _days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        }
        let _months = opts.months;
        if (!_months) {
            _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        }
        const pad = (number, strDigits, isUnpad) => {
            const strNum = Math.abs(number).toString();
            if (!isUnpad && strNum.length > strDigits.length) {
                return strNum;
            } else {
                return ('0000' + strNum).slice(-strDigits.length);
            }
        };
        const timezone = (date, letter) => {
            const chunk = [];
            const offset = -date.getTimezoneOffset();
            chunk.push(offset === 0 ? 'Z' : offset > 0 ? '+' : '-');//add Z or +,-
            if (offset === 0) return chunk;
            chunk.push(pad(Math.floor(offset / 60), '00'));//hour
            if (letter === 'X') return chunk.join('');
            if (letter === 'XXX') chunk.push(':');
            chunk.push(pad((offset % 60), '00'));//min
            return chunk.join('');
        };
        const DELIM = '\0\0';
        const escapeStack = [];
        const escapedFmtStr = formatStr.replace(/'.*?'/g, m => {
            escapeStack.push(m.replace(/'/g, ''));
            return `${DELIM}${escapeStack.length - 1}${DELIM}`;
        });
        const formattedStr = escapedFmtStr
            .replace(/y{4}|y{2}/g, m => pad(date.getFullYear(), m, true))
            .replace(/M{3}/g, m => _months[date.getMonth()])
            .replace(/M{1,2}/g, m => pad(date.getMonth() + 1, m))
            .replace(/M{1,2}/g, m => pad(date.getMonth() + 1, m))
            .replace(/d{1,2}/g, m => pad(date.getDate(), m))
            .replace(/H{1,2}/g, m => pad(date.getHours(), m))
            .replace(/h{1,2}/g, m => {
                const hours = date.getHours();
                return pad(hours === 0 ? 12 : hours > 12 ? hours - 12 : hours, m);
            })
            .replace(/a{1,2}/g, m => date.getHours() >= 12 ? 'PM' : 'AM')
            .replace(/m{1,2}/g, m => pad(date.getMinutes(), m))
            .replace(/s{1,2}/g, m => pad(date.getSeconds(), m))
            .replace(/S{3}/g, m => pad(date.getMilliseconds(), m))
            .replace(/[E]+/g, m => _days[date.getDay()])
            .replace(/[Z]+/g, m => timezone(date, m))
            .replace(/X{1,3}/g, m => timezone(date, m));
    
        const unescapedStr = formattedStr.replace(new RegExp(`${DELIM}\\d+${DELIM}`, 'g'),
            m => {
                const unescaped = escapeStack.shift();
                return unescaped.length > 0 ? unescaped : '\'';
            });

        return unescapedStr;
    }    
}

export {PDFExportUtil, getExposureStoreForExport}
