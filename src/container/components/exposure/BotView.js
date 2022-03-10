import cx from 'classnames';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import React from 'react';
import _ from 'underscore';
import '../../../stylesheets/modules/bot.scss';
import '../../../stylesheets/_colors.scss';
import '../../../stylesheets/_imported-font-icons.scss';
import ExposureActions from '../../actions/ExposureActions';
import ExposureAppConstants from '../../constants/ExposureAppConstants';
import FrontendConstants from '../../constants/FrontendConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import GA from '../../util/GoogleAnalytics';
import Util from "../../util/util";
import Combobox from '../Combobox';
import ContentPlaceholder from '../ContentPlaceholder';
import SimpleAction from '../SimpleAction';
import BotBreadcrumbs from './BotBreadcrumbs';
import {BOT_CONSTANTS} from './BotConstants';
import BotPrimeTable from './BotPrimeTable';
import AppRequest from '../../http/AppRequest';
import BotModal from './BotModal';
import ModalConstants from '../../constants/ModalConstants';
import BotGraph from './BotGraph';
import ToggleButton from '../ToggleButton';
import { DataTable } from 'primereact-opt/datatable';
import { Column } from 'primereact-opt/column';

// Entities will follow below sequence on UI for showing Filters
const params = ["studyprogram", "studysponsor", "provider", "studyname", "study", "siteregion", "country", "site", "subjectid", "siteinvestigator", "sitename",
  "ta", "indication", "studyphase", "sitecra", "studystatus", "sitestatus", "studylevel", "sitelevel", "enrollmentandscreen",
  "subjectdisposition", "standardized_medication_name", "cm_indication", "route_of_administration", "aeterm", "severity", "relatedness", 
  "relatedness_to_study_drug", "seriousness", "issuetype", "arm", "lbtest", "lbtestcd", "lbcat", "lbscat", "schedule_compliance", "category", "visitnum", "visit"];

class BotView extends React.PureComponent {

  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      fileId: PropTypes.string,
    }),
  };

  constructor(props) {
    super(props);
    this.state = {
      bData: {},
      loading: true,
      filters: {},
      displayFilters: false,
      filterData: {},
      values: {},
      options: {},
      botId: "",
      askedSentence: "",
      disabledButton: false,
      intentName: "",
      modalForFeedBack: false, // to show/hide feedback popover as per need
      vote: "", // value of vote (like or dislike as per user response)
      likeVoteIconType: "up", // Decides to show lined/solid like icon
      dislikeVoteIconType: "down",// Decides to show lined/solid dislike icon
      masterStudy: this.props.immExposureStore ? Util.getStudyId(this.props.immExposureStore) : null,
      tableView: false
    };
  }

  getStudiesForBot() {
    const sessionFiltersFromCookie = Util.getSessionFiltersFromCookie(this.props.immExposureStore.get('currentAccountId'));
    const dynamicSessionFilter = Util.getFullSessionDynamicFilters(sessionFiltersFromCookie.sessionDynamicFilters[0]);
    const data = this.props.immExposureStore.get('studies').toJS();
    let studies = [];
    let selectedValues = dynamicSessionFilter.sessionDynamicFilterCondition.itemsSelected;

    Object.entries(data).map(([key, value]) => {
      if (selectedValues.length === 0 || selectedValues.includes(value.value)) {
        studies.push(value.eStudyId);
      }
    });

    const check = this.props.immExposureStore.getIn(['botCompletion', 'list']);
    if (check && dynamicSessionFilter.sessionDynamicFilterCondition.allSelected) {
      return check;
    } else if (studies.length > 0) {
      return studies;
    }

    return [];
  }

  //This function recieves data from backend API to populate UI
  getDataFromBot(questionAsked) {
    let self = this;
    this.setState({
      loading: true,
      likeVoteIconType: 'up',
      dislikeVoteIconType: 'down',
      reframeQuestion: false,
      filterError: false
    });

    setTimeout(function repeatTimeout() {
      let data = self.props.immExposureStore.get('studies');
      if (data !== undefined) {
        let botId = "";
        if (!self.state.botId) {
          botId = Math.random().toString(36).slice(2) + new Date().getTime() +
            Math.random().toString(36).slice(2);
        } else {
          botId = self.state.botId;
        }

        const requestBody = {
          "text": questionAsked,
          "meta": {
            "modelSelector": Util.getAccountName()
          },
          "actionsData": {
            "studies": self.props.immExposureStore.getIn(['botCompletion', 'inscribeStudy']),
            "master_filter": Util.getStudyId(self.props.immExposureStore)
          },
          "entities": self.props.immExposureStore.get('botEntities') ? self.props.immExposureStore.get('botEntities') : {}
        };
        self.setState({masterStudy: Util.getStudyId(self.props.immExposureStore)});
        fetch(Util.getBotUrl() + "run", {
          method: "post",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "FROM": self.props.immExposureStore.getIn(['botCompletion', 'mark']),
            "session": botId.substring(0, 31),
            "bot": "file",
            "builder": "bot"
          },
          body: JSON.stringify(requestBody)
        }).then(resp => {
          if(resp.status == 204){
            self.setState({
              loading: false,
              askedSentence: questionAsked,
              reframeQuestion: true,
            });
          }
          else{
            return resp.json();
          }
        }).then(
          function (data) {
            if (data && data.dag_info) {
              if (data.dag_info.entities) {
                const keys = Object.keys(data.dag_info.entities);
                const values = {};
                for (let i = 0; i < keys.length; i++) {
                  let valArr = [];
                  if (Array.isArray(data.dag_info.entities[keys[i]])
                    && data.dag_info.entities[keys[i]].length > 0 && (keys[i] !== "study" || keys[i] !== "site")) {
                    valArr = data.dag_info.entities[keys[i]];
                  } else if (Array.isArray(data.dag_info.entities[keys[i]])
                    && data.dag_info.entities[keys[i]].length > 0 && (keys[i] === "study" || keys[i] === "site")) {
                    valArr = data.dag_info.entities[keys[i]].map(e => e.toUpperCase());
                  } else if (keys[i] === "study" || keys[i] === "site") {
                    valArr.push(data.dag_info.entities[keys[i]].toUpperCase());
                  } else {
                    valArr.push(data.dag_info.entities[keys[i]]);
                  }
                  values[keys[i]] = valArr;
                }
                self.setState({
                  bData: data,
                  values: values,
                  botId: botId.substring(0, 31),
                  loading: false,
                  askedSentence: questionAsked,
                  intentName: data.dag_info.intent,
                  tableView: false
                }, () => {
                  self.handleToggle();
                });
              }
            } else if (data.success === false) {
              self.setState({
                loading: false,
                askedSentence: questionAsked,
                reframeQuestion: true,
              });
            } else {
              self.setState({
                loading: false,
                askedSentence: questionAsked
              })
              ExposureActions.createStatusMessage(FrontendConstants.BOT_RUN_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
            }
          }.bind(self),
          function (jqXHR) {
            self.setState({
              loading: false,
              askedSentence: questionAsked
            })
            ExposureActions.createStatusMessage(FrontendConstants.BOT_RUN_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
            GA.sendAjaxException(`Connection to ${Util.getBotUrl()} failed.`, jqXHR.status);
          }
        );
      } else {
        setTimeout(repeatTimeout, 2000);
      }
    }, 2000);
  }

  // Function for hiding the feedback pop over from UI
  hideModal = () => {
    this.setState({ modalForFeedBack: false });
  }

  // This function calls backend API to submit feedback reponse from user
  giveFeedback = (feedbackText) => {
    const userInfo = Util.getUserInfo();
    const accountId = Util.getAccountName();
    const reqBody = {
      userId: userInfo.username,
      vote: this.state.vote,
      feedback: feedbackText,
      accountId: accountId,
      question: this.state.askedSentence,
      timestamp: new Date(),
      id: this.state.bData.id
    }
    fetch(Util.getBotUrl() + "update", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "FROM": this.props.immExposureStore.getIn(['botCompletion', 'mark']),
        "session": this.state.botId,
        "bot": "file",
        "builder": "bot"
      },
      body: JSON.stringify(reqBody)
    }).then(resp => {
      return resp.json();
    }).then(
      data => {
        if (this.state.vote === 'up') {
          this.setState({
            likeVoteIconType: "up-solid",
          });
        }
        else if (this.state.vote === 'down') {
          this.setState({
            dislikeVoteIconType: "down-solid",
          });
        }
      });
  }

  // This functions returns a common error layout
  getErrorLayout(message) {
    return (
      <div className="report-filter-notice">
        <div className="report-filter-notice-text-holder">
          <div className="report-filter-notice-header">
            <span className="icon-information_solid"/>
            <span className="report-filter-notice-text">
              {message}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // This function is used to show Intent Title and description
  getIntentInfo() {
    let title = this.state.bData.info.intent_title;
    let data = this.state.bData.info.data;
    title = title.charAt(0).toUpperCase() + title.slice(1);
    return (
      <div>
        <span className="bot-result-label">{title}</span>
        <span className="vote-icons">
          {
            this.state.likeVoteIconType === 'up' ?
              <a onClick={() => this.setState({ vote: "like", modalForFeedBack: true, likeVoteIconType: "up-solid", dislikeVoteIconType: 'down' })}
                 className="icon-lined icon-like">
              </a>
              : <a className="icon-solid icon-like-solid">
                {
                  this.state.modalForFeedBack ?
                    <span>
                      <BotModal show={this.state.modalForFeedBack}
                        feedback={this.giveFeedback}
                        handleClose={this.hideModal}>
                      </BotModal>
                    </span>
                    : null
                }
              </a>
          }
          {
            this.state.dislikeVoteIconType === 'down' ?
              <a onClick={() => this.setState({ vote: "dislike", modalForFeedBack: true, dislikeVoteIconType: "down-solid", likeVoteIconType: 'up' })}
                className="icon-lined icon-dislike">
              </a>
              : <a className="icon-solid icon-dislike-solid">
                {
                  this.state.modalForFeedBack ?
                    <span>
                      <BotModal show={this.state.modalForFeedBack}
                        feedback={this.giveFeedback}
                        handleClose={this.hideModal}>
                      </BotModal>
                    </span>
                    : null
                }
              </a>
          }
        </span>
        <div className="summary-card">
          {(data && data[0]) ?
            data[0].summary ? <span id="kpi-value"> {data[0].summary} </span> :
            data[0].summaryDetails ? 
            <DataTable value={data[0].summaryDetails}>
              { Object.keys(data[0].summaryDetails[0]).map((col,i) => {
                  return <Column field={col} header={col.toUpperCase()}/>;
              })}
            </DataTable>
            : null
            : null
          }
          {this.state.bData.info.type === 'graph' ? 
          <div className="align-right">
            <label className="">Chart</label>
            <ToggleButton id="chartTableViewToggle" activeText="" isActive={this.state.tableView} onClick={(e) => this.toggleCheckbox(e)} className="table-chart-button"/>
            <label className="">Table</label>
          </div> : null}   
        </div>        
        <span className="bot-result-description"><b>Note: </b>{this.state.bData.info.intent_desc}</span>
      </div>
    );
  }

  toggleCheckbox(e) {
    this.setState({
      tableView : !this.state.tableView
    })
  }

  // This function is used to show final output on UI (Table, chart etc)
  getChart() {
    if (Object.keys(this.state.bData).length !== 0 && !this.state.reframeQuestion && !this.state.filterError) {
      if (this.state.bData.mode === "intent_disambiguation") {
        return (this.getErrorLayout(BOT_CONSTANTS.Disambiguate));
      } else if (this.state.bData.info != undefined && Object.keys(this.state.bData.info).length > 0) {
        const displayData = this.state.bData.info.data;
        const graphData = this.state.bData.info;
        if(_.isEmpty(displayData)) {
          return this.getIntentInfo();           
        }
        switch (this.state.bData.info.type) {
          case 'table':
            return (<div>
                {this.getIntentInfo()}
                {/*Below code is currently added to handle summary card for some specific intents.
                 Going forward this will be handled in a better way as response from run API becomes consistent for all intents */}
                {(displayData && displayData[0] && displayData[0].details !== undefined && displayData[0].details.length > 0) ?
                  <BotPrimeTable tableData={displayData[0].details}/> :
                    (displayData && displayData[0] && displayData[0].summary !== undefined && (displayData[0].details == undefined || !displayData[0].details.length)) ? "" :  
                    displayData ?                   
                  <BotPrimeTable tableData={displayData}/> : ""
                }
              </div>
            );
          case 'text':
            if(displayData && displayData[0] && displayData[0].summary !== undefined) {
              return (
                <React.Fragment>
                  {this.getIntentInfo()}
                  <BotPrimeTable tableData={displayData[0].details}/>
                </React.Fragment>);
            } else {
              return (<div>
                {this.getIntentInfo()}
                {/\d/.test(displayData) ?
                  //regex is used to extract date or digit from string
                  <div className="bot-result-value">{displayData.match(/(?:\d{1,2}\/\d{4}|\d{1,9}(?:\/\d{1,2}\/\d{4})?)/)[0]}</div> :
                  <div className="bot-result-info">{displayData}</div>
                }
              </div>);
            }
          case 'graph':
          return (<div>
              {this.getIntentInfo()}
              { this.state.tableView ?
                (displayData && displayData[0] && displayData[0].details !== undefined && displayData[0].details.length > 0) ?
                  <BotPrimeTable tableData={displayData[0].details}/> :
                    (displayData && displayData[0] && displayData[0].summary !== undefined && (displayData[0].details == undefined || !displayData[0].details.length)) ? "" :  
                    displayData ? <BotPrimeTable tableData={displayData}/> : ""
                : <BotGraph graphData={graphData} />
              }
            </div>
          );
          default:
            return (<div>
                <span className="bot-result-label">{this.state.bData.info.intent_title}</span>
                <div className="bot-result-value">{displayData}</div>
              </div>
            );
        }
      } else if (this.state.bData.info == null) {
        return (<div>
          <div className="bot-result-info">{BOT_CONSTANTS.NoResult}</div>
        </div>);
      } else if (Object.keys(this.state.bData.info).length === 0) {
        return (this.getErrorLayout(BOT_CONSTANTS.SelectFilters));
      }
    } else if (this.state.reframeQuestion) {
      return (this.getErrorLayout(BOT_CONSTANTS.ReframeQuestion));
    } else if (this.state.filterError) {
      return (this.getErrorLayout(BOT_CONSTANTS.ApplyFilterErrorMessage));
    }
  }

  callBackFunction() {
    ExposureActions.toggleListFilterPane();
    ExposureActions.openListFilterPane();
  }

  handleToggle() {
    let options = {};
    if (Object.keys(this.state.bData).length > 0 && this.state.bData.mode !== "intent_disambiguation"
      && this.state.bData.prompt_text === "Do you want to ask something else?") {
      let array = Object.keys(this.state.bData.dag_info.entities)
      let self = this;
      if (array.length > 0) {
        for (let i = 0; i < array.length; i++) {
          (function () {
            let key = array[i]
            const requestBody = {
              "sentence": "entites_comp " + array[i],
              "meta": {
                "modelSelector": Util.getAccountName(),
                "access_control": self.props.immExposureStore.getIn(['botCompletion', 'inscribeStudy']),
                "master_filter": Util.getStudyId(self.props.immExposureStore)
              },
            };

            ExposureActions.openListFilterPane();
            fetch(Util.getBotUrl() + "complete_chunks", {
              method: "post",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "FROM": self.props.immExposureStore.getIn(['botCompletion', 'mark']),
                "session": self.state.botId,
                "bot": "file",
                "builder": "bot"
              },
              body: JSON.stringify(requestBody)
            }).then(resp => {
              return resp.json();
            }).then(
              data => {
                if (data.completions.filteredChunks.length > 0) {
                  const valArray = [];
                  for (let j = 0; j < data.completions.filteredChunks.length; j++) {
                    if (data.completions.filteredChunks[j].type === key) {
                      let newObj = {};
                      let value = data.completions.filteredChunks[j].value;
                      if (value) {
                        if (key === "study" || key === "site" || key === "studyphase") {
                          newObj.value = data.completions.filteredChunks[j].value;
                          valArray.push(newObj);
                        } else {
                          newObj.value = self.toTitleCase(data.completions.filteredChunks[j].value);
                          valArray.push(newObj);
                        }

                      }
                    }
                  }
                  options[key] = valArray;
                }
                self.setState({
                  options
                }, () => {
                  self.callBackFunction()
                });
              }
            );
          })();
        }
      }
    }
  }

  handleDropdownFilter(key, e) {
    this.setState({
      [key.key]: e
    });

    let object = _.extend({}, this.state.values);
    object[key.key] = e

    this.setState({
      values: object
    });
  }

  resetAllFilters() {
    const requestBody = {
      "entities": params,
      "request": "DELETE"
    };

    let self = this;
    fetch(Util.getBotUrl() + "run", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "FROM": self.props.immExposureStore.getIn(['botCompletion', 'mark']),
        "session": self.state.botId,
        "bot": "file",
        "builder": "bot"
      },
      body: JSON.stringify(requestBody)
    }).then(resp => {
      return resp.json();
    }).then(
      function (data) {
        let bData = this.state.bData;
        bData.info = {}
        this.setState({
          loading: false,
          values: {},
          bData: bData,
          filterError: false
        });
      }.bind(this),
      function (jqXHR) {
        self.setState({
          loading: false,
          askedSentence: questionAsked
        })
        ExposureActions.createStatusMessage(FrontendConstants.BOT_FILTER_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
        GA.sendAjaxException(`Connection to ${Util.getBotUrl()} failed.`, jqXHR.status);
      }
    );
  }

  applyFilters() {
    const fData = this.state.values;
    const keysOfData = Object.keys(this.state.values);
    let distinct = params.filter(function (obj) { return keysOfData.indexOf(obj) == -1; });

    for (let i = 0; i < distinct.length; i++) {
      fData[distinct[i]] = []
    }
    this.setState({
      loading: true,
      filterError: false
    });

    let questionAsked = this.props.params.fileId;
    const requestBody = {
      "text": questionAsked, //Fetching the question which is being asked by the user
      "meta": {
        "modelSelector": Util.getAccountName(),
        "context": fData,
        "redoIntent": this.state.bData.dag_info.intent
      },
      "actionsData": {
        "applyFilter":true, // This flag determines that run API is being hit from Apply Filter button
        "studies": this.props.immExposureStore.getIn(['botCompletion', 'inscribeStudy']),
        "master_filter": Util.getStudyId(this.props.immExposureStore)
      }
    };

    let self = this;
    fetch(Util.getBotUrl() + "run", {
      method: "post",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "FROM": self.props.immExposureStore.getIn(['botCompletion', 'mark']),
        "session": self.state.botId,
        "bot": "file",
        "builder": "bot"
      },
      body: JSON.stringify(requestBody)
    }).then(resp => {
      return resp.json();
    }).then(
      function (data) {
        if(data.dag_info){
          this.setState({
            bData: data,
            loading: false,
            intentName: data.dag_info.intent
          });
        } else if (data.success === false) {
          self.setState({
            loading: false,
            askedSentence: questionAsked,
            filterError: true,
          });
        } else {
          self.setState({
            loading: false,
            askedSentence: questionAsked
          })
          ExposureActions.createStatusMessage(FrontendConstants.BOT_RUN_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
        }
      }.bind(this),
      function (jqXHR) {
        self.setState({
          loading: false,
          askedSentence: questionAsked
        })
        ExposureActions.createStatusMessage(FrontendConstants.BOT_FILTER_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
        GA.sendAjaxException(`Connection to ${Util.getBotUrl()} failed.`, jqXHR.status);
      }
    );
  }

  toTitleCase(str) {
    str = str.toString();
    return str.replace(
      /\w\S*/g,
      function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
    );
  }

  // filter dropdown data as per studies selected in Master Study Filter
  filterStudies(dropdownOptions, key) {
    // get studyname of currently selected studies
    const sessionFiltersFromCookie = Util.getSessionFiltersFromCookie(this.props.immExposureStore.get('currentAccountId'));
    const dynamicSessionFilter = Util.getFullSessionDynamicFilters(sessionFiltersFromCookie.sessionDynamicFilters[0]);
    let studyNames = dynamicSessionFilter.sessionDynamicFilterCondition.itemsSelected;
    // get study ids of the currently selected studies
    let studyIds = Util.getStudyId(this.props.immExposureStore);
    // if filtered chunks contain any study id or studyname which is not selected in Master Study filter
    // need to remove that entry from dropdown options
    if(studyNames.length > 0 && studyIds.length > 0 && dropdownOptions && dropdownOptions.length >0) {
        if(key === "studyname") {
          dropdownOptions = dropdownOptions.filter(function(item) {
            return studyNames.includes(item.value);
          })
        }
        if(key === "study") {
          dropdownOptions = dropdownOptions.filter(function(item) {
            return studyIds.includes(item.value);
          })
        }
    }
    return dropdownOptions;
  }

  getComboBox() {
    if (Object.keys(this.state.bData).length > 0) {
      if (this.state.bData.dag_info !== undefined && this.state.bData.mode !== "intent_disambiguation"
        && this.state.bData.prompt_text === "Do you want to ask something else?") {
        let array = Object.keys(this.state.bData.dag_info.entities);
        let orderedFilter = params.filter(key => this.state.bData.dag_info.entities[key]).map(key => ({ key, vals: this.state.bData.dag_info.entities[key] }));
        if (array.length > 0) {
          return orderedFilter.map((key, index) => {
            let newObj = {};
            let newArray = [];

            if (this.state.values) {
              let dataCol = this.state.values[key.key];
              if (dataCol !== undefined && key.key !== "milestone" && key.key !== "metric" && key.key !== "study_site_country_flag") {
                if (Array.isArray(dataCol)) {
                  for (let j = 0; j < dataCol.length; j++) {
                    let object = {};
                    if (key.key === "study" || key.key === "site" || key.key === "studyphase") {
                      object.value = dataCol[j];
                      newArray.push(object);
                    } else {
                      object.value = this.toTitleCase(dataCol[j]);
                      newArray.push(object);
                    }
                  }
                  newObj[key.key] = newArray;
                }
              }
            }
            if (key.key !== "milestone" && key.key !== "metric" && key.key !== "study_site_country_flag") {
              let dropdownOptions = this.state.options[key.key];
              if(key.key === "studyname" || key.key === "study") {
                dropdownOptions = this.filterStudies(dropdownOptions,key.key);
              }
              return (
                <div key={index} className={cx('filter-block', 'dropdown-filter-block')}>
                  <div className="filter-title">
                    <label className="filter-title-text">{BOT_CONSTANTS[key.key]}</label>
                  </div>
                  <div className="filter-element">
                    <Combobox
                      className='filter-dropdown'
                      placeHolder=''
                      multi={true}
                      labelKey='value'
                      value={newObj[key.key] ? Imm.fromJS(newObj[key.key]) : Imm.List()}
                      onChange={(selectedItems) => { this.handleDropdownFilter(key, selectedItems) }}
                      options={dropdownOptions ? Imm.fromJS(dropdownOptions) : Imm.List()}
                    />
                  </div>
                </div>
              );
            }
          });
        }
      }
    }
    return null;
  }
  openModalForDownload() {
    ExposureActions.displayModal(ModalConstants.MODAL_DOWNLOAD_CONFIRMATION, {
      handleCancel: ExposureActions.closeModal,
      handleDownload: this.downloadCsv.bind(this),
    });
  }
  downloadCsv() {
    ExposureActions.closeModal();
    let self = this;
    let url = Util.getBotUrl() + 'download.csv' + '/' + self.state.botId + '/' 
              + self.props.immExposureStore.getIn(['botCompletion', 'mark']);
    var a = document.createElement('a');
    a.target = "_blank";
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadData() {
    if(this.state.bData.info.downloadable){
      this.openModalForDownload();
    }
    else{
      let requestData = JSON.stringify({ questionAsked: this.state.askedSentence, type: "VA", intentName: this.state.intentName });
      const newRequest = AppRequest({ type: 'POST', url: "/api/va/prepare-export", data: requestData });
      newRequest.then(
        () => {
          let displayData = this.state.bData.info.data;
          let data;
          if(displayData && displayData[0] && displayData[0].details !== undefined) {
            data = displayData[0].details;
          } else {
            data = displayData;
          }
          let CSV = '';
          if (this.state.bData.info.type === 'text' && displayData && displayData[0] && displayData[0].summary === undefined) {
            CSV = data
          } else {
            let arrData = typeof data !== 'object' ? JSON.parse(data) : data;
            let row = '';
            for (let index in arrData[0]) {
              if (!index.startsWith('@extra')) row += index + ',';
            }
            row = row.slice(0, -1);
            CSV += row + '\r\n';
            for (let i = 0; i < arrData.length; i++) {
              let row = '';
              for (let index in arrData[i]) {
                if (!index.startsWith('@extra')) row += '"' + arrData[i][index] + '",';
              }
              row.slice(0, row.length - 1);
              CSV += row + '\r\n';
            }
            if (CSV === '') {
              return;
            }
          }


          const uri = 'data:text/csv;charset=utf-8,' + escape(CSV);
          const isIE = /*@cc_on!@*/false || !!document.documentMode;
          const link = document.createElement('a');
          link.href = uri;
          link.style.display = 'none';
          link.download = this.state.askedSentence + '.csv';
          const csvFile = new Blob([CSV], { type: "text/csv" });
          if (isIE) {
            window.navigator.msSaveOrOpenBlob(csvFile, this.state.askedSentence + '.csv');
            return;
          }
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
        (jqXHR) => {
          if (jqXHR.statusText !== "abort") {
            ExposureActions.createStatusMessage(FrontendConstants.BOT_AUDIT_FAILED, StatusMessageTypeConstants.TOAST_ERROR);
          }
        }
      )
    }
  }

  componentDidUpdate() {
    if (this.state.askedSentence !== this.props.params.fileId && this.state.askedSentence !== ""
      && !this.state.loading) {
      this.getDataFromBot(this.props.params.fileId);
    }
    let newMasterStudy = this.props.immExposureStore ? this.props.immExposureStore.get('newMasterStudy') : null;
    if (newMasterStudy && this.state.masterStudy && JSON.stringify(newMasterStudy.sort()) != JSON.stringify(this.state.masterStudy.sort())) {
      this.getDataFromBot(this.props.params.fileId);
    }
  }

  componentDidMount() {
    if (this.state.askedSentence === "") {
      this.getDataFromBot(this.props.params.fileId);
    }
    this.setState({masterStudy: Util.getStudyId(this.props.immExposureStore)});
  }

  // Walk up the folder structure to produce an Immutable List of immFiles.
  getImmFilePath(fileId, immExposureStore) {
    const immTopLevelFile = Imm.Map({
      id: ExposureAppConstants.REPORTS_LANDING_PAGE_ID,
      title: "DaLIA Search Query",
    });
    let immFiles = Imm.List();
    let immCurFile = immExposureStore.getIn(["fileConfigs", fileId]);
    while (immCurFile) {
      immFiles = immFiles.unshift(immCurFile);
      const parentId = immCurFile.get("folderId");
      immCurFile = immExposureStore.getIn(["fileConfigs", parentId]);
    }
    // If the current file is inside a folder, that folder will be the root. Otherwise add `Analytics`.
    if (immFiles.size < 2) {
      immFiles = immFiles.unshift(immTopLevelFile);
    }
    const currentFile = immFiles.last();
    const reportTitle = currentFile.get("title");
    return reportTitle;
  }

  // Function to show related KPI links on UI
  // Report titles are recieved from backend as array of Strings, then redirecting based on respective id
  getRelatedKpi() {
    let relatedKpisLink = [];
    let kpiSection;
    let kpiLinksFromBot = this.state.bData.info.KPI_links;
    if (kpiLinksFromBot !== undefined && kpiLinksFromBot.length > 0) {
      kpiLinksFromBot.forEach((linkTitle) => {
        this.props.immExposureStore.get("fileConfigs").forEach((fileConfig, index) => {
          if (fileConfig.get("title") === linkTitle) {
            relatedKpisLink.push(
              <li key={index} className="no-underline">
                <span className="icon-report"/>
                <a className="open-link" href={`/reports/${fileConfig.get("id")}`}>
                  {fileConfig.get("title")}
                </a>
              </li>
            );
          }
        });
      });
      if (relatedKpisLink.length > 0) {
        kpiSection = (
          <div id="related-analytics" className="export-options related-analytics">
            <span className="header-text">
              Related Analytics
              <a className="icon-question-circle"
                 href={Util.formatHelpLink(this.getImmFilePath(this.props.fileId, this.props.immExposureStore))}
                 target="_blank"/>
            </span>
            <ul id="kpi-links">{relatedKpisLink}</ul>
          </div>
        );
      }
      return kpiSection;
    }
  }

  getRecommendedQues() {
    let recomQuesFromBot = this.state.bData.info.recommended_questions;
    if (recomQuesFromBot !== undefined && recomQuesFromBot.length > 0) {
      let ques = recomQuesFromBot.map((question, index) => {
        return (
          <li key={index} className="no-underline">
            <a href={encodeURI(`/bot/${question}`)}>- {question}</a>
          </li>
        );
      });
      let recommendedQues = (
        <div className="export-options recommended-ques">
          <span className="header-text">{BOT_CONSTANTS.RecommendedQuestion}</span>
          <ul id="recommended-ques-section">{ques}</ul>
        </div>
      );
      return recommendedQues;
    }
  }

  getExportOption() {
    if (this.state.bData.info && !this.state.reframeQuestion 
      && !(this.state.bData.mode === "intent_disambiguation")  && !this.state.filterError) {
      if (Object.keys(this.state.bData.info).length > 0) {
        if (this.state.bData.info.type) {
          return (
            <div className="report-detail-panel export-detail-panel">
              <div id="dalia-export-panel" className="report-detail-panel-contents export-detail-panel-contents">
                {/*Below section is to show recommended questions for a particular search result on UI*/}
                {this.getRecommendedQues()}
                {/*Below section is to show Related Analytics links on UI*/}
                {this.getRelatedKpi()}
                {/*Below section is to show Export CSV option on UI*/}
                <div id="export-section" className="export-options">
                  <span className="header-text">Export Options</span>
                  <ul id="export">
                    <li className="open-link" onClick={this.downloadData.bind(this)}>
                      Download as CSV
                    </li>
                    <li className="powered-by">Powered by
                      <span className="bot-logo-color">DaLIA
                        <span className="icon-dalia"></span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <div className="report-detail-panel export-detail-panel">
              <div className="report-detail-panel-contents export-detail-panel-contents">
                <div className="export-options">
                  <span className="powered-by">Powered by
                    <span className="bot-logo-color">DaLIA</span>
                    <span className="icon-dalia"/>
                  </span>
                </div>
              </div>
            </div>
          );
        }
      }
    }
  }

  getButtonOptions(areFiltersDisabled) {
    if (!areFiltersDisabled) {
      return (
        <div className="filter-buttons-wrapper">
          <div className="btn btn-secondary reset-all-button"
               onClick={this.resetAllFilters.bind(this)}>
            {FrontendConstants.RESET_ALL}
          </div>
          <div className="btn btn-primary apply-filters-button"
               onClick={this.applyFilters.bind(this)}>
            {FrontendConstants.APPLY}
          </div>
        </div>
      );
    } else {
      return (
        <div className="no-filters">{FrontendConstants.FILTER_NOT_APPLICABLE}</div>
      );
    }
  }

  render() {
    const { immExposureStore } = this.props;
    const dagInfoEntities = (this.state.bData.dag_info && this.state.bData.dag_info.entities) || {};
    const checkDisambiguation = this.state.bData.mode === "intent_disambiguation" ||
    this.state.bData.prompt_text !== "Do you want to ask something else?" ? true : false;
    let areFiltersDisabled = _.keys(dagInfoEntities).length === 0;
    if (checkDisambiguation) {
      areFiltersDisabled = true;
    }
    let filterPaneOpen = immExposureStore.get('showListFilterPane', false);

    let searchText = this.props.params.fileId;

    if (this.state.loading) {
      return (<ContentPlaceholder />);
    }

    return (
      <div>
        <div className={cx('list-view', { 'show-filters': filterPaneOpen })}>
          <div className="page-header">
            <BotBreadcrumbs
              immExposureStore={immExposureStore}
              fileId={this.props.params.fileId}
              searchedText={searchText}
            />
            <div className="header-buttons">
              <SimpleAction class='icon-filter2' text={FrontendConstants.FILTERS} onClick={ExposureActions.toggleListFilterPane}/>
            </div>
          </div>

          <div className="filters">
            <div className="section-title">
              <span className="title-text">
                {FrontendConstants.FILTERS.toUpperCase()}
                <a className="icon-question-circle" href={Util.formatHelpLink(this.getImmFilePath(this.props.fileId, this.props.immExposureStore))}
                   target="_blank"/>
              </span>
              <div className="close-button"
                   onClick={ExposureActions.toggleListFilterPane}>
              </div>
            </div>
            <div className="panel included-filter">
              <div className="panel-sub-header text-truncation block-underline">
                <span className="panel-sub-header-title">
                  {FrontendConstants.INCLUDED}
                </span>
                {this.getButtonOptions(areFiltersDisabled)}
              </div>
              {this.getComboBox()}
            </div>
          </div>
          <div className="report-body">
            <div className={cx('bot-search-result', { 'show-filters': filterPaneOpen })}>
              <div className="bot-search-single-result-container bot-detailed-result">
                {this.getChart()}
                {this.getExportOption()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = BotView;
