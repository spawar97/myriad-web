import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import Select from 'react-select';
import FrontendConstants from '../../constants/FrontendConstants';
import EntitySearchUtil from '../../util/EntitySearchUtil';
import Util from '../../util/util';
import AccountUtil from "../../util/AccountUtil";
import SearchActions from '../../actions/SearchActions';
import Imm from 'immutable';
import ExposureActions from '../../actions/ExposureActions';
import 'abortcontroller-polyfill';
import { BOT_CONSTANTS } from "../exposure/BotConstants";
import MenuRenderer from "../search/SuggestiveQuesSearcher";

let completionResponses = {};
let botSelectionStore = Imm.fromJS({});
let poweredBy = ['Powered by DaLIA'];


class EntitySearcher extends React.PureComponent {

  static propTypes = {
    onSelectedItem: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    tooltip: PropTypes.string,
    immExposureStore: PropTypes.instanceOf(Imm.Map),
  };

  static contextTypes = {
    router: PropTypes.object,
  };

  constructor(props) {
    super(props);
    const immSearchOptions = this._getSearchOptions();
    this.state = {
      immSearchOptions: this.sortOptionFields(immSearchOptions),
      filteredOptions: this.sortOptionFields(immSearchOptions.toJS()),
      searchInput: '',
      sentences: [],
      chunks: [],
      filterdChunks: [],
      filterdSentences: [],
      controller: undefined,
      hasVA: AccountUtil.hasVirtualAssistant(comprehend.globals.immAppConfig),
      faqRecieved: [],
      firstOption: {}, // Save inputted text as selected option
      completeApiURL: "complete_chunks",
      selectedChunks: {}
    };
  }

  componentDidMount() {
    SearchActions.addListener(this._onChange);
    if (this.props.immExposureStore.get('botCompletion') == undefined) {
      ExposureActions.fetchBotCompletion();
    }
  }

  componentWillUnmount() {
    SearchActions.removeListener(this._onChange);
  }

  // we need this method to be as field to be able to add/remove is as listener
  _onChange = () => {
    let immSearchOptions = this._getSearchOptions().toObject();
    immSearchOptions = { ...immSearchOptions };
    immSearchOptions = Imm.fromJS(immSearchOptions).toList();
    this.setState({
      immSearchOptions: immSearchOptions,
      filteredOptions: immSearchOptions.toJS(),
      searchInput: this.state.searchInput,
    });
  };

  _getSearchOptions() {
    const immExposureFiles = SearchActions.getFiles();
    const immOversightScorecard = SearchActions.getOversightScorecard();
    const immEmbeddedFiles = SearchActions.getEmbeddedEntities();
    const immSearchItems = immOversightScorecard ? EntitySearchUtil.getSearchFilesWithOversight(immExposureFiles, immEmbeddedFiles, immOversightScorecard) : EntitySearchUtil.getSearchFiles(immExposureFiles, immEmbeddedFiles);
    const immOptionsWithLabels = immSearchItems.map(option => this._getSearchOption(option));
    const immSearchOptions = immOptionsWithLabels;
    return immSearchOptions;
  }

  _renderFileOption(file) {
    const iconClass = Util.getFileTypeIconName(file.fileType, file.title);
    switch (file.fileType) {
      case 'botp':
        return (
          <div>
            <span className='search-bot-option'>{file.title}</span>
            <span className={Util.getFileTypeIconName('bot')} style={{ float: "right" }} />
          </div>
        );
      case 'botFaq':
        return (
          <div id='faq'>
            <span className='icon-dalia' />
            <span className='search-option'>{file.title}</span>
            <span id='faqOuterBox'>FAQ</span>
          </div>
        );
      default:
        return (
          <div>
            <span className={iconClass} />
            <span className='search-option'>{file.title}</span>
          </div>
        );
    }
  }

  _getSearchOption(file) {
    const label = this._renderFileOption(file);
    return { ...file, label };
  }

  setBotSuggestion(selectedOption) {
    botSelectionStore.set("botSelection", selectedOption);
  }

  getBotSuggestion() {
    return botSelectionStore.get("botSelection");
  }

  _onSelectionChange(selectedOption) {
    ExposureActions.setBotEntities(this.state.selectedChunks);
    this.setState({
      selectedChunks: {}
    });
    const { hasVA } = this.state;
    let updatedQuestion, selectedValue;
    if (hasVA) {
      this.setBotSuggestion(selectedOption);
    }
    const { onSelectedItem } = this.props;
    // Check event for selected option if it is mousedown then select hovered option
    // else first option is selected which is input field value 
    if (event.type == "mousedown" || event.keyCode == 27 || event.type == "touchend") {
      selectedValue =  selectedOption;  
    } else {
      selectedValue =  this.state.firstOption;
    }
    updatedQuestion = this.updateSelectedOption(selectedValue);
    onSelectedItem(updatedQuestion);
  }

  // added space at end of question to resolve same question search issue
  updateSelectedOption(selectedOption) {
    let updatedOption = selectedOption;
    if(this.context.router.location.pathname.includes("/bot") && this.context.router.params.fileId && this.context.router.params.fileId == selectedOption.id){
      updatedOption.id = this.context.router.params.fileId + " ";
    }
    return updatedOption;
  }

  _filterOptions() {
    const searchInput = (!this.state.hasVA || _.isEmpty(this.state.searchInput?.trim())) ? [] : [this._getSearchOption(EntitySearchUtil.transformBotData([this.state.searchInput]).toJS()[0])];
    const botFaqs = this.state.filteredOptions.filter(option => option.fileType === 'botFaq');
    return searchInput.concat(botFaqs).concat(this.sortOptionFields(this.state.filteredOptions.filter(option => option.fileType !== 'botFaq' && option.id != searchInput[0]?.id)));
  }

  updateFilteredCompletions(searchInput) {
    const { fetchPromise, controller } = this.getBotSentenceData(searchInput);
    fetchPromise.then(filterdData => {
      let [filterdSentences, filterdChunks] = filterdData;

      // cache the response
      completionResponses[searchInput] = { filterdChunks, filterdSentences };
      if (searchInput.trim() === this.state.searchInput.trim()) {
        // if input has not changed from the one requested
        this.setState(state => {
          return {
            ...state,
            filterdChunks,
            filterdSentences
          };
        });
      }
    });
    return controller;
  }

  getBotSentenceData(input, completeApiURL = this.state.completeApiURL) {
    if (input) {
      const controller = new AbortController();
      const url = completeApiURL;
      const requestBody = {
        "sentence": input,
        "meta": {
          "modelSelector": Util.getAccountName(),
          "access_control": this.props.immExposureStore.getIn(['botCompletion', 'inscribeStudy']),
          "master_filter": Util.getStudyId(this.props.immExposureStore)
        },
      };

      const fetchPromise = new Promise((accept, _reject) => {
        fetch(Util.getBotUrl() + url, {
          method: "post",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "FROM": this.props.immExposureStore.getIn(['botCompletion', 'mark']),
            "session": new Date().getTime() + Math.random().toString(36).slice(2),
            "bot": "file",
            "builder": "bot"
          },
          body: JSON.stringify(requestBody)
        }).then(resp => {
          return resp.json();
        }).then(resp => {
          let filteredChunks = this.state.filterdChunks;
          let filteredSentences = this.state.filterdSentences;
          if (completeApiURL == 'complete_sentence') {
            filteredSentences = this.setFilteredSetences(input, resp.completions);
          } else {
            filteredChunks = resp.completions.filteredChunks ? resp.completions.filteredChunks : filteredChunks;
          }
          // get studyname of currently selected studies
          const sessionFiltersFromCookie = Util.getSessionFiltersFromCookie(this.props.immExposureStore.get('currentAccountId'));
          const dynamicSessionFilter = Util.getFullSessionDynamicFilters(sessionFiltersFromCookie.sessionDynamicFilters[0]);
          let studyNames = dynamicSessionFilter.sessionDynamicFilterCondition.itemsSelected;
          // get study ids of the currently selected studies
          let studyIds = Util.getStudyId(this.props.immExposureStore);
          // if filtered chunks contain any study id or studyname which is not selected in Master Study filter
          // need to remove that entry from auto suggestion
          if(studyNames.length > 0 && studyIds.length > 0 && filteredChunks && filteredChunks.length > 0) {
            for(let i =filteredChunks.length-1 ; i>= 0; i--) {
              if(filteredChunks[i] && filteredChunks[i].type === "studyname"){
                let counter = 0;
                for(let j = studyNames.length-1 ; j >= 0 ; j--){
                  if(filteredChunks[i] && filteredChunks[i].value != studyNames[j]){
                    counter = counter +1;
                  }
                  if(counter === studyNames.length) {
                    filteredChunks.splice(i,1);
                  }
                }
              } 
              if(filteredChunks[i] && filteredChunks[i].type === "study") {
                let counter = 0;
                for(let j = studyIds.length-1 ; j >= 0; j--){
                  if(filteredChunks[i] && filteredChunks[i].value != studyIds[j]){
                    counter = counter +1;
                  }
                  if(counter === studyIds.length) {
                    filteredChunks.splice(i,1);
                  }
                }
              }
            }
          }     
          this.setState({
            filterdChunks: filteredChunks
          });
          accept([filteredSentences, filteredChunks]);
        })
          .catch(e => {
            if (e.name !== "AbortError") {
              console.warn(e);
            }
          });
      });
      return { fetchPromise, controller };
    }
  }
//Set filtered sentences on api response when space is entered in searchbar
  setFilteredSetences(searchInput, data) {
    this.setState({
      faqRecieved: data.faq ? data.faq : this.state.faqRecieved,
      filterdSentences: data.filteredSentences ?  data.filteredSentences : this.state.filterdSentences
    }, () => {
      searchInput = this.state.searchInput && this.state.searchInput.length > 0 ? this.state.searchInput : searchInput;
      this._onInputChange(searchInput); // Refresh search dropdown on change filteredSentences
    });
    return data.filteredSentences;
  }
  _onInputChangeStandard(input) {
    const { immSearchOptions } = this.state;
    let options = [];
    if(this.state.hasVA){
      this.getBotSentenceData(" ");
      this.getBotSentenceData(" ", "complete_sentence");
      let faqArray;
      if(!_.isEmpty(this.state.faqRecieved)) {
        faqArray = this.state.faqRecieved;
      }
      faqArray = EntitySearchUtil.transformBotData(faqArray,"faq").toJS();
      faqArray.forEach((element, i) => {
        options.push(this._getSearchOption(element));
      });
    }
    //options array will first show the default FAQs as per the account from which user has logged in followed by the Reports
    options.push(...immSearchOptions.toJS());
    let filteredOptions = options;
    if (!_.isEmpty(input)) {
      filteredOptions = EntitySearchUtil.searchOptionFields(options, input);
    }
    this.setState({
      filteredOptions: filteredOptions,
      searchInput: input
    });
    return input;
  }

  _onInputChangeVA(searchInput) {
    const { controller } = this.state;
    if (controller) controller.abort();
    let newController;

    if (searchInput.trim() in completionResponses) {
      const { filterdChunks, filterdSentences } = completionResponses[
        searchInput.trim()
      ];
      this.setState({
        ...this.state,
        searchInput,
        filterdChunks,
        filterdSentences,
        controller: undefined
      });
    } else {
      if (searchInput.trim()) {
        newController = this.updateFilteredCompletions(searchInput.trim());
        this.setState({
          ...this.state,
          searchInput,
          controller: newController
        });
      }
    }

    const { immSearchOptions } = this.state;
    const options = immSearchOptions.toJS();
    let filteredOptions = options;
    let botAndNavieArray = [];
    let botSentenceArray = [];
    let firstInput = [];
    let faqArray = this.state.faqRecieved;
    let modifiedArray =[];

    if (!_.isEmpty(searchInput)) {
      filteredOptions = EntitySearchUtil.searchOptionFields(filteredOptions, searchInput);
    }
    // Showing the first option as whatever user is typing
    if (!_.isEmpty(searchInput.trim())) {
      firstInput.push(searchInput);
      botAndNavieArray.push(this._getSearchOption(EntitySearchUtil.transformBotData(firstInput).toJS()[0]));
    }
    // Filter FAQs on the basis of what user is typing in the search bar
    if (faqArray && searchInput.includes(" ")) {
      let userInput = searchInput.trim().split(" ");
      userInput.forEach(inputVal => {
        faqArray.forEach(element => {
          if (this.convertToLowerCase(element).includes(this.convertToLowerCase(inputVal)) && !modifiedArray.includes(element)) {
            modifiedArray.push(element);
          }
        })
      })
    } else if (faqArray) {
      faqArray.forEach(element => {
        if (this.convertToLowerCase(element).includes(this.convertToLowerCase(searchInput)) && !modifiedArray.includes(element)) {
          modifiedArray.push(element);
        }
      })
    }
    faqArray = EntitySearchUtil.transformBotData(modifiedArray, "faq").toJS();
    faqArray.forEach((element, i) => {
      botAndNavieArray.push(this._getSearchOption(element));
    });

    if (filteredOptions.length >= 5 && !_.isEmpty(searchInput.trim())) {
      filteredOptions.forEach((element, i) => {
        if (i < 5) {
          botAndNavieArray.push(element);
        }
      });
    } else {
      for (let i = 0; i < filteredOptions.length; i++) {
        botAndNavieArray.push(filteredOptions[i]);
      }
    }

    if (this.state.filterdSentences && this.state.filterdSentences.length > 0 && !_.isEmpty(searchInput)) {
      botSentenceArray = EntitySearchUtil.transformBotData(this.state.filterdSentences);
      botSentenceArray = botSentenceArray.toJS();

      if (botSentenceArray.length >= 5) {
        botSentenceArray.forEach((element, i) => {
          if (i < 5) {
            botAndNavieArray.push(this._getSearchOption(element));
          }
        });
      } else {
        botSentenceArray.forEach((element, i) => {
          if (i >= 0) {
            botAndNavieArray.push(this._getSearchOption(element));
          }
        });
      }
    }

    if (firstInput.length > 0) {
      botAndNavieArray.push(this._getSearchOption(EntitySearchUtil.transformPoweredBot(poweredBy).toJS()[0]));
    }
    
    this.setState({
      filteredOptions: botAndNavieArray,
      searchInput: searchInput,
      firstOption: botAndNavieArray[0] // Set first item of option list as firstOption
    });
    return searchInput;
  }

  _onInputChange(searchInput) {
    if (AccountUtil.hasVirtualAssistant(comprehend.globals.immAppConfig) && searchInput && searchInput.length < 150) {
      this._onInputChangeVA(searchInput);
    }
    else {
      this._onInputChangeStandard(searchInput);
    }
  }

  handleClick() {
  }

  // This function is used to append the suggestion selected by the user with the text
  // which is already written in search box.
  constructSentence(txt, chunk, chunkType) {
    let newWord = "";
    let splitText = txt.trim().split(" ");
    // If user searches for a sentence
    if (splitText.length > 1) {
      let splitChunk = chunk.split(" ");
      let lastLetter = splitText[(splitText.length) - 1];
      if (this.convertToLowerCase(splitChunk[0]).includes(this.convertToLowerCase(lastLetter))) {
        splitText.splice(-1);
        newWord = splitText.join(' ') + " " + chunk;
      } else {
        for (let i = (splitText.length) - 1; i >= 0; i--) {
          if (this.convertToLowerCase(splitChunk[0]) === this.convertToLowerCase(splitText[i])) {
            splitText.splice(i);
            newWord = splitText.join(' ') + " " + chunk;
            break;
          }
        }
      }
      if (newWord === "") {
        newWord = splitText.join(' ') + " " + chunk;
      }
    }
    // If user searches for a single string and part of string matches with suggestion
    else if(this.convertToLowerCase(chunk).includes(this.convertToLowerCase(splitText[0]))){
      newWord = chunk;
    }
    else {
      newWord = splitText.join('') + " " + chunk;
    }
    this.inputElement.state.inputValue = newWord;
    this.saveSelectedChunks(chunk, chunkType);
    this._onInputChangeVA(newWord);
  }
  saveSelectedChunks(chunkValue, chunkType) {
    let selected = this.state.selectedChunks;
    let values = selected[chunkType] || [];
    values.push(chunkValue);
    selected[chunkType] = values;
    this.setState({
      selectedChunks : selected
    });
  }
  // Component to show set of suggestions for any question inside search menu
  // This is a custom component which is rendered inside React-Select
  showSuggestiveQuestionComponent() {
    if (this.state.filterdChunks && this.state.filterdChunks.length > 0) {
      let suggestiveQues = [];
      let filteredChunks = this.state.filterdChunks;
      let txt = this.state.searchInput;
  // Iterating over suggestions received from backend to render suggestion box
      filteredChunks.forEach((chunk, index) => {
        suggestiveQues.push(
          <div key={index} onClick={() => this.constructSentence(txt, chunk.value, chunk.type)}
               id="suggestion-box">
            <div id="chunk-title" className="chunk-title"> {chunk.type} </div>
            <div id="chunk-value"> {chunk.value} </div>
          </div>
        );
      });
      return (
        <div id="suggestive-ques-section">
          {suggestiveQues}
        </div>
      );
    }
    return null;
  }

// This function gives the value of currently focussed option on React Select
  getFocusedOption(keyCode) {
       // Remove focus from 'Powered by DaLIA' on Up  and Down Arrow
    if (this.inputElement.state.focusedOption.id ==  BOT_CONSTANTS.poweredBy) {
      // When keyCode is 38 i.e. Up arrow then  'focusOptionIndex' should be set to last enabled option
      // When keyCode is 40 i.e. Down arrow then  'focusOptionIndex' should be set to First enabled option
      let focusOptionIndex = keyCode == 38 ? (this.inputElement._visibleOptions.length - 2) : 0;
      let option = this.inputElement._visibleOptions[focusOptionIndex];
      this.inputElement.focusOption(option);
    }
    let focussedOption = this.inputElement.state.focusedOption;
    if (focussedOption) {
      return focussedOption.title;
    } else return null;
  }

// This function is used to show the text on search bar when user presses up and down arrow keys
  changeState(e) {
    // Set completeApiURL to 'complete_sentence' on space click else 'complete_chunks'
    if (e.keyCode === 32) {
      this.setState({ completeApiURL: "complete_sentence" }, () => {
        setTimeout(
          ()=>{
            if (this.inputElement.state.inputValue.trim()) {
              this.updateFilteredCompletions(this.inputElement.state.inputValue.trim());
            }
          },0
        )       
      });
    } else {
      this.setState({ completeApiURL: "complete_chunks" });
    }
    // checking up or down arrow using keycode
    if (e.keyCode === 40 || e.keyCode === 38) {
      // Below code is used to get latest focussed option 
      Promise.resolve().then(() => {
        const focusedOption = this.getFocusedOption(event.keyCode);
        this.inputElement.state.inputValue = focusedOption;
        this.setState({
          firstOption: this.inputElement.state.focusedOption
        })
      })
    }
    setTimeout(
      ()=>{
        if (this.inputElement.state.inputValue.trim()) {
          this.setState({
            searchInput: this.inputElement.state.inputValue.trim()
          })
        }
      },0
    )
  }

// This function converts a text into lowercase
  convertToLowerCase(text) {
    return text.toLowerCase();
  }

// This function is to sort the dropdown options list
  sortOptionFields(listData){
    return listData.sort((a, b) => 
      (a.title == BOT_CONSTANTS.poweredBy || b.title == BOT_CONSTANTS.poweredBy) ? 1 
        : a.title > b.title ? 1: -1);
  }
  
  render() {
    const { hasVA } = this.state;
    const placeholder = hasVA
      ? FrontendConstants.ENTITY_SEARCHER_PLACEHOLDER_VA
      : FrontendConstants.ENTITY_SEARCHER_PLACEHOLDER;

    const props = {
      className: 'search-combobox',
      placeholder,
      onChange: this._onSelectionChange.bind(this),
      onSelect: this.props.onSelectedItem,
      options: this.sortOptionFields(this.state.immSearchOptions.toJS()),
      filterOptions: this._filterOptions.bind(this),
      onInputChange: this._onInputChange.bind(this),
      onOpen: this._onInputChange.bind(this),
      valueKey: 'id',
    };

    const searchIcon = (
      <div className='icon-search' onClick={this.handleClick.bind(this)} />
    );

    let vaIcon = hasVA
      ? <i className="icon-dalia" />
      : '';

    return (
      <div title={FrontendConstants.ENTITY_SEARCHER_TOOLTIP}
        className={cx('top-nav-search-container')}>
        <div className='search-box'>
          {vaIcon}
          <div className='search-selector' title={FrontendConstants.ENTITY_SEARCHER_TOOLTIP}>
            <Select {...props}
                    autoFocus={true}
                    clearable={true}
                    closeOnSelect={true}
                    maxMenuHeight={300}
                    escapeClearsValue={true}
                    onBlurResetsInput={false}
                    ref={input => this.inputElement = input}
                    onInputKeyDown={(e)=>this.changeState(e)}
                    menuRenderer={(props) => MenuRenderer(props, this.showSuggestiveQuestionComponent())}
            />
          </div>
        </div>
        {searchIcon}
      </div>
    );
  }
}

export default EntitySearcher;
