import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import FocusBreadcrumbsView from "./FocusBreadcrumbsView";
import "../../../stylesheets/modules/focusBreadcrumbs.scss";
import ExposureActions from '../../actions/ExposureActions';
var GA = require('../../util/GoogleAnalytics');

class OperationsInsights extends React.PureComponent {
  static displayName = 'Operations Insights';
  static defaultFocus = "Portfolio";
  static defaultFocusId = 'Portfolio';

  static listOfTags = [{
    idx: "1",
    value: "portfolio",
    title: "Portfolio",
    module: "operations_insights",
    defaultAnalytic: "Portfolio Summary"
  }, {
    idx: "2",
    value: "study",
    title: "Study",
    module: "operations_insights",
    defaultAnalytic: "Study Summary"
  }, {
    idx: "3",
    value: "country",
    title: "Country",
    module: "operations_insights",
  }, {
    idx: "4",
    value: "site",
    title: "Site",
    module: "operations_insights",
    defaultAnalytic: "Site Performance"
  }, {
    idx: "5",
    value: "subject",
    title: "Subject",
    module: "operations_insights",
  }, {
    idx: "6",
    value: "data_quality",
    title: "Data Quality",
    module: "operations_insights",
  }, {
    idx: "7",
    value: "financials",
    title: "Financials",
    module: "operations_insights",
  }];

  static propTypes = {
    cookies: PropTypes.object,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    path: PropTypes.string,
    location: PropTypes.object,
    params: PropTypes.shape({
      fileId: PropTypes.string,
    }),
  };

  constructor(props) {
    super(props);
    this.focusViewProps = {};
    this.state = {
      flag: 0
    };
  }

  componentDidMount() {

    const fileId = "OPERATIONS_INSIGHTS";
    GA.sendDocumentOpen(fileId, GA.DOCUMENT_TYPE.FILE);
    ExposureActions.clearSelectedModuleOption();
    ExposureActions.fetchFileConfigs();
  }

  componentWillReceiveProps(newProps) {
    const { immExposureStore: prevImmExposureStore } = this.props;
    const { immExposureStore: newImmExposureStore } = newProps;

    const justFinishedFileConfigsRequest = prevImmExposureStore.get('fileConfigsRequestInFlight', false) && !newImmExposureStore.get('fileConfigsRequestInFlight', false);
    // If we have received an update to the file configs, update the module analytics
    if (justFinishedFileConfigsRequest) {
      this.setFocusViewProps(newProps);
      this.setState({
        flag: 1
      });
    }
  }

  componentWillUnmount() {
    ExposureActions.clearSelectedModuleOption();
  }

  setFocusViewProps(propsToBeUsed) {
    this.focusViewProps = _.extend({}, propsToBeUsed);
    const tags = this.getListOfAllowedFocus(propsToBeUsed.immExposureStore);
    this.focusViewProps['listOfTags'] = tags;
    this.focusViewProps['defaultFocusId'] = OperationsInsights.defaultFocusId;
    this.focusViewProps['moduleDisplayName'] = OperationsInsights.displayName;
  }

  getListOfAllowedFocus(immExposureStore) {
    // Get the analytics list for the module
    const immModuleAnalytics = immExposureStore.get('fileConfigs')
      .filter(x => x.get('modules').includes(OperationsInsights.displayName));

    const tags = OperationsInsights.listOfTags.filter(x => {
      let list = immModuleAnalytics.filter(y => y.get('tags').includes(x.title))
      if (list.size !== 0) {
        return x;
      }
      return null;
    });

    return tags;
  }

  render() {
    if (this.state.flag) {
      this.setFocusViewProps(this.props);
      const tags = this.focusViewProps['listOfTags'];
      return (
        <div>
          {tags && tags.length ? (
            <FocusBreadcrumbsView {...this.focusViewProps} />
          ) : (
            <div className="empty-content">
              <div className="empty-content-text-holder">
                <div className="icon-text-wrapper">
                  <span className="icon-info"></span>
                  <span className="empty-content-text">
                    You currently do not have access to this module.
                    Please contact the support team -
                    <a href="https://support.saama.com" target="_blank"
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      https://support.saama.com
                    </a>
                    <div className="navigation section">
                      <a href="/folders/" style={{ cursor: 'pointer', textDecoration: 'underline'  }}>
                        Or return to Analytics
                      </a>
                    </div>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return <div />;
    }
  }
}

module.exports = OperationsInsights;
