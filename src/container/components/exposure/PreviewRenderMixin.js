var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
var cx = require('classnames');
import DOM, { data } from 'react-dom-factories';

var Highchart = React.createFactory(require('../Highchart'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var StatusMessageTypeConstants = require('../../constants/StatusMessageTypeConstants');
var QueryUtils = require('../../util/QueryUtils');
var WidgetUtils = require('../../util/WidgetUtils');
var div = DOM.div;

var PreviewRenderMixin = {
      getPreviewDiv: function (pLayout, pVizspecs) {
        var vizspecs = _.map(
            _.zip(
                pVizspecs,
                this.state.immCurrentFile.getIn(['templatedReport', 'advancedConfigOverrides'], Imm.List()).toJS()
            ), function (vizpair) {
              // Apply the config override if one exists for this vizspec.
              return vizpair[1] ? $.extend(true, vizpair[0], JSON.parse(vizpair[1])) : vizpair[0];
            });
        return div({ className: cx('preview-body', 'preview-render-mixin-body'), key: 'preview-body' }, Highchart({
          ref: 'highchart-wrapper',
          height: this.state.expandPreview ? '70vh' : '40vh',
          html: pLayout,
          configs: pVizspecs
        }));
      },
      getPreview: function () {
        if (this.state.preview && this.state.preview.data) {
          var divArr = [];
          var i = 0;
          var mixin = this;
          this.state.preview.data.map(function (widget) {
            if (widget.layout && widget.layout.length > 0)
              divArr[i++] = mixin.getPreviewDiv(widget.layout, (widget.vizspecs) ? widget.vizspecs : []);
          });
          return divArr;
        } else {
          return this.getPreviewDiv(this.state.preview.layout, this.state.preview.vizspecs);
        }
      },

  previewAvailable: function() {
    return this.state.preview && this.state.preview.layout && this.state.preview.vizspecs;
  },

  renderPreview: function(immInstantiatedTemplate) {
    // The QueryUtil function takes a immFile as an input, and gets the query planinformation from the `templatedReport` field.
    // Construct a stubbed file to satisfy the input to that function.
    let immStubbedFile = Imm.Map([['templatedReport', immInstantiatedTemplate.set('isAdvancedReport', true)]]);

    let reportData = {};
    try {
      // Run the queryPlan.
      // Does the preview path really need to be separate from the normal rendering path?
      [reportData,] = QueryUtils.execInstantiatedTemplateQueryPlan(immStubbedFile, null, Imm.List());
      if (reportData.widgetMetaData) {
        var ref = this;
        var result = WidgetUtils.isWidgetLoaded(reportData.widgetMetaData, ref);
      }else{
        this.setState({ showContentPlaceHolder: false })
      }
     } catch (e) {
      console.log(`%cERROR: Error when executing query plan: ${e}`, 'color: #E05353');
      ExposureActions.createStatusMessage(FrontendConstants.REPORT_FAILED_TO_EXECUTE_QUERY, StatusMessageTypeConstants.TOAST_ERROR);
      return;
    }

    this.setState({preview: {
      layout: reportData.layout,
      vizspecs: reportData.vizspecs
    }});
  }
};

module.exports = PreviewRenderMixin;
