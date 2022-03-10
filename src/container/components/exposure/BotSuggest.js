import React from 'react';
import '../../../stylesheets/modules/bot.scss';
import Button from '../Button';
import Util from "../../util/util";
import { Badge } from 'primereact-opt/badge';
import ModalConstants from '../../constants/ModalConstants';
import {BOT_CONSTANTS} from './BotConstants';
import ExposureActions from '../../actions/ExposureActions';
import { getObject, setObject, setString } from '../../util/SessionStorage';

class BotSuggest extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      showSuggestBox: false,
      daliaColumnKeyDashboardColumnMapping: {
        age : {
          widgetName: 'Age',
          columnName: 'age',
          tableName: 'vw_sme_subject_detail'
        },
        aeser : {
          widgetName: 'AE Seriousness',
          columnName: 'aeser',
          tableName: 'vw_sme_ae_detail'
        },
        aeterm : {
          widgetName: 'AE',
          columnName: 'aeterm',
          tableName: 'vw_sme_ae_detail'
        }
      },
      suggestions: [],
      master_study: [],
      currentDashboard: '',
      suggestionsList: false,
      showBadge: false
    }
  }

  componentDidMount() {    
    const { immReport, immExposureStore } = this.props.widgetProps;
    let master_study = Util.getStudyId(immExposureStore);
    let dashboardName = immReport.getIn(['fileWrapper', 'file', 'identifier'], '');
    if((master_study && master_study.length == 1 && !_.isEqual(this.state.master_study, master_study)) || dashboardName != this.state.currentDashboard){
      this.setState({
        master_study : master_study,
        currentDashboard : dashboardName
      })      
      let data = immExposureStore.get('studies');
      if (data !== undefined) {
        const requestBody = {
          meta: {
            modelSelector: Util.getAccountName()
          },
          actionsData: {
            studies: immExposureStore.getIn(['botCompletion', 'inscribeStudy']),
            master_filter: master_study,
            selected_studies: master_study
          },
          dashboard_name: dashboardName
        };
        fetch(Util.getBotUrl() + "suggestions", {
          method: "post",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "FROM": immExposureStore.getIn(['botCompletion', 'mark']),
            "bot": "file",
            "builder": "bot"
          },
          body: JSON.stringify(requestBody)
        }).then(resp => {
          return resp.json();
        }).then(
          (data) =>{
            if(data.result == "success"){
              this.setState({
                suggestionResponse: data,
                suggestions : data.suggestions,
                suggestionsList: !_.isEmpty(data.suggestions) && _.isArray(data.suggestions),
                showBadge: true
              })
            }    
          } 
        );
      }
    }    
  }
  cancelPreviousApi(apiCalls, fileId){
    apiCalls.map((xhr) => {
      xhr?.abort();
    })
    _.defer(ExposureActions.deleteRequests, fileId);
  }

  updateSessionFilters(filterValues) {
    if (!_.isEmpty(filterValues)) {

      filterValues.map((obj) => {
        obj['isApplied'] = obj['values']
        return obj; 
      })

      setObject('widgetContextFilter', filterValues);
    }
  }

  acceptFunc(selectedSuggestion, index){
    ExposureActions.updateSessionStorage([]);
    ExposureActions.closeModal();
    this.setState({
      showSuggestBox: false,
      currentSuggestion: index
    })
    let reportData = this.props?.widgetProps.immReport.get('reportData')?.toJS();
    let immStore = this.props?.widgetProps.immExposureStore;    
    Object.keys(selectedSuggestion.filters).map(filterKey =>{
      let filterConfig = this.state.daliaColumnKeyDashboardColumnMapping[filterKey];
      if(filterConfig){
        let value = selectedSuggestion.filters[filterKey];
        let widgetName = filterConfig.widgetName;
        let columnName = filterConfig.columnName;
        let tableName = filterConfig.tableName;
        let selectedPointValue = Array.isArray(value) ? value : _.range(Math.round(value.min), Math.round(value.max) + 1).map(String);
        Util.saveAndPublishEvent(reportData, widgetName, selectedPointValue, tableName, columnName, null, immStore?.toJS());
      }      
    })
    let fileId = immStore?.get("activeFocusBreadcrumbsAnalytic");
    let apiCalls = reportData?.apiRequests;
    this.cancelPreviousApi(apiCalls, fileId);
    let filterStates = getObject('widgetContextFilter');
    ExposureActions.updateSessionStorage(filterStates || []);
    this.updateSessionFilters(filterStates);
    setString('isAppliedContextFilter', 1);
    reportData?.widgetMetaData[1]?.controller?.publish('widgetFilter', this.props.widgetProps.immExposureStore.get('widgetFilterStore'));
    setObject('selectWidgetContextFilter', filterStates);
    setObject('daliaSuggestContextFilter', true);
  }
  filterSuggestionClick(selectedSuggestion, index){
    ExposureActions.displayModal(ModalConstants.MODAL_DASHBOARD_FILTER_CONFIRMATION, {
      handleCancel: ExposureActions.closeModal,
      handleConfirm: this.acceptFunc.bind(this, selectedSuggestion, index),
      message: BOT_CONSTANTS.confirm_message
    });
  }
  render() {   
    return (
      <div className="bot-suggest">
        { this.state.suggestionsList && !this.state.showSuggestBox && 
          <Button icon="icon-solid icon-dalia" 
            isPrimary={true} 
            classes={{'bot-suggest-btn': true, 'p-overlay-badge': true }} 
            onClick={()=> this.setState({showSuggestBox: true, showBadge: false})}>
           { this.state.showBadge && <Badge value={this.state.suggestions.length} severity="danger"></Badge> }
        </Button> }
        { this.state.showSuggestBox && <div className="bot-suggest-box">
          <div className="bot-suggest-header">
            <span className="text-header">DaLIA Suggest</span>
            <span className="close-button" onClick={() => this.setState({ showSuggestBox: false})}></span>
          </div>
          <div className="bot-suggest-body">
            <ul className="list-items">
              {
                this.state.suggestions.map((suggestion, index) => {
                  return (
                    <li key={index} className="suggestion-list" onClick={() => this.filterSuggestionClick(suggestion, index)}>
                      <span>{suggestion.statement}</span>
                    </li>
                  );
                })
              }
            </ul>
          </div>
        </div> }   
      </div>           
    )
  }
}
    
export default BotSuggest;
