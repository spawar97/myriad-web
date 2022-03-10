import React from 'react';
import FocusBreadcrumbsView from "./FocusBreadcrumbsView";
import "../../../stylesheets/modules/focusBreadcrumbs.scss";
import PropTypes from "prop-types";
import Imm from "immutable";
import ExposureActions from "../../actions/ExposureActions";
var GA = require('../../util/GoogleAnalytics');

class ClinicalInsights extends React.PureComponent {
  static displayName = 'Clinical Insights';
  static defaultFocus = "Patient Profile";
  static defaultFocusId = 'Patient Profile';

  static listOfTags = [
    {
      idx: "1",
      value: "study",
      title: "Study",
      module: "clinical_insights",
    },
    {
      idx: "2",
      value: "patient_profile",
      title: "Patient Profile",
      module: "clinical_insights",
      defaultAnalytic: "Smart Clinical Explorer"
    }, {
      idx: "3",
      value: "compliance",
      title: "Compliance",
      module: "clinical_insights",
    },
    {
      idx: "4",
      value: "safety",
      title: "Safety",
      module: "clinical_insights",
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

    const fileId = "CLINICAL_INSIGHTS";
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
    this.focusViewProps['defaultFocusId'] = ClinicalInsights.defaultFocusId;
    this.focusViewProps['moduleDisplayName'] = ClinicalInsights.displayName;
  }

  getListOfAllowedFocus(immExposureStore) {
    // Get the analytics list for the module
    const immModuleAnalytics = immExposureStore.get('fileConfigs')
      .filter(x => x.get('modules').includes(ClinicalInsights.displayName));

    const tags = ClinicalInsights.listOfTags.filter(x => {
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

export default ClinicalInsights;

