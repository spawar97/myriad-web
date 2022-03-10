import _ from 'underscore';
import Imm from 'immutable';
import ExposureAppConstants from "../constants/ExposureAppConstants";

class EntitySearchUtil {

  static transformEmbeddedFiles(immEmbeddedFiles) {
    if (immEmbeddedFiles == null || immEmbeddedFiles.size == 0) {
      return Imm.List();
    }
    const searchFiles = immEmbeddedFiles.map(immEntity => {
      const entity = immEntity.toJS();
      const entityType = EntitySearchUtil.getEmbeddedEntityType(entity.entityType);
      const searchFields = _.union(
        [{ key: 'title', value: entity.entityName }],
        [{ key: 'type', value: entityType }],
        [{ key: 'description', value: entity.entityDescription }],
      );
      return {
        id: entity.entityUuid,
        title: entity.entityName,
        type: 'EMBEDDED',
        fileType: entityType,
        searchFields: searchFields,
      }
    });
    return Imm.List(searchFiles);
  }

  static transformBotData(botSentences,quesType) {
    if (botSentences == null || botSentences.size === 0) {
      return Imm.List();
    }

    const searchBot = botSentences.map((botSentence, i) => {
      let entityType = "bot";
      if(quesType === "faq"){
        entityType = "botFaq";
      }
      const searchFields = _.union([{ key: 'title', value: botSentence }]);

      return {
        id: botSentence,
        title: botSentence,
        label: botSentence,
        type: 'VA',
        fileType: entityType,
        searchFields: searchFields
      }
    });
    return Imm.List(searchBot);
  }

  static transformPoweredBot(botSentences) {
    if (botSentences == null || botSentences.size === 0) {
      return Imm.List();
    }

    const searchBot = botSentences.map((botSentence, i) => {
      const entityType = "botp";
      const searchFields = _.union([{ key: 'title', value: botSentence }]);

      return {
        id: botSentence,
        title: botSentence,
        label: botSentence,
        type: 'VA',
        fileType: entityType,
        searchFields: searchFields,
        isDisabled: true
      }
    });
    return Imm.List(searchBot);
  }


  static transformExposureFiles(immExposureFiles) {
    if (immExposureFiles == null || immExposureFiles.size == 0) {
      return Imm.List();
    }
    const searchFiles = immExposureFiles.toList().map(fileMap => {
      return this.transformExposureFile(fileMap)
    });
    return Imm.List(searchFiles);
  }

  static transformExposureFile(file) {
    const searchFields = _.union(
      [{ key: 'title', value: file.get('title') }],
      [{ key: 'description', value: file.get('description') }],
    );
    return {
      id: file.get('id'),
      title: file.get('title'),
      type: 'EXPOSURE',
      fileType: file.get('fileType'),
      identifier: file.get('identifier'),
      searchFields: searchFields,
      module: file.get('modules').get(0),
    };
  }

  static transformOversightScorecardEntry(_immSearchStore) {
    const searchFields = _.union(
      [{ key: 'title', value: 'Oversight Scorecard' }],
      [{ key: 'description', value: 'Oversight Scorecard Report' }],
    );
    _immSearchStore = _immSearchStore.set(
      "oversight",
      Imm.List([
        {
          title: 'Oversight Scorecard',
          id: '11111111-1111-1111-1111-111111111111',
          type: 'oversight',
          description: 'Oversight Scorecard Overall',
          fileType: 'oversight_scorecard_report',
          searchFields: searchFields,
        }]));
    return _immSearchStore;
  }

  static getSearchFilesWithOversight(immExposureFiles, immEmbeddedFiles, immOversightScorecard) {
    return EntitySearchUtil.getSearchFiles(immExposureFiles, immEmbeddedFiles).concat(immOversightScorecard);
  }

  static getSearchFiles(immExposureFiles, immEmbeddedFiles) {
    const immSearchOptions = Imm.Set(immExposureFiles)
      .union(immEmbeddedFiles)
      .sortBy(opt => opt.title)
      .toList();
    return immSearchOptions;
  }

  static getEmbeddedEntityType(entityType) {
    let resolvedType = '';
    switch (entityType) {
      case ExposureAppConstants.FILE_TYPE_REPORT:
        resolvedType = ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT;
        break;
      case ExposureAppConstants.FILE_TYPE_DASHBOARD:
        resolvedType = ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD;
        break;
      default:
        break;
    }
    return resolvedType;
  }

  static isMatchingWordsUnordered(optionFieldValues, searchWords) {
    return optionFieldValues.findIndex(fieldValues => {
      const isAnyWordMissing = searchWords.findIndex(word => !fieldValues.includes(word)) > -1;
      return !isAnyWordMissing;
    }) > -1;
  }

  static sanitizeInput(input) {
    const regex = new RegExp(/[!"'’`-]/gi);
    return input.replace(regex, '');
  }

  static getLowerCaseOptions(options) {
    return _.map(options, option => {
      const searchFieldValues = _.map(option.searchFields, f => f.value ? f.value.toLowerCase() : '');
      return { ...option, searchFieldValues };
    });
  }

  static searchP1TitleMatches(options, lowerSearchInput) {
    return _.chain(options)
      .filter(option => option.searchFieldValues[0] === lowerSearchInput)  // Search title
      .map(option => option.id)
      .value();
  }

  static searchP2TitleSequenceMatchesOrderedByDashboard(options, lowerSearchInput) {
    const groupedByDashboard = _.chain(options)
      .filter(option => {
        const title = option.searchFieldValues[0];
        return title.length >= lowerSearchInput.length && title.substring(0, lowerSearchInput.length) === lowerSearchInput;
      })
      .groupBy(option => option.fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD)
      .value();

    // Now that it is split by whether the file is a YF Dashboard or not. Sort both individual lists alphabetically
    groupedByDashboard[true] = _.sortBy(groupedByDashboard[true], option => option.searchFieldValues[0]);
    groupedByDashboard[false] = _.sortBy(groupedByDashboard[true], option => option.searchFieldValues[0]);

    // Then union them together, with the YF dashboards ranked higher than other items
    return _.chain(groupedByDashboard[true])
      .union(groupedByDashboard[false])
      .map(option => option.id)
      .value();
  }

  static searchP3PartialMatches(options, lowerSearchInput) {
    return _.chain(options)
      .filter(option => option.searchFieldValues.findIndex(value => value.includes(lowerSearchInput)) > -1)
      .map(option => option.id)
      .value();
  }

  static searchP4UnorderedMatch(options, searchInput) {
    const searchWords = searchInput.split(' ').map(w => w.toLowerCase());
    return _.chain(options)
      .filter(option => this.isMatchingWordsUnordered(option.searchFieldValues, searchWords))
      .map(option => option.id)
      .value();
  }

  static searchP5SanitizedExactMatches(options, searchInput) {
    const sanitizedSearchInput = this.sanitizeInput(searchInput);
    const lowerSearchInputSanitized = sanitizedSearchInput.toLowerCase();
    return this.searchP3PartialMatches(options, lowerSearchInputSanitized);
  }

  static searchP6SanitizedUnorderedMatch(options, searchInput) {
    const sanitizedSearchInput = this.sanitizeInput(searchInput);
    const lowerSearchInputSanitized = sanitizedSearchInput.toLowerCase();
    return this.searchP4UnorderedMatch(options, lowerSearchInputSanitized);
  }

  /* Search prioritization
    - P1: Exact match on title
    - P2: Sequence match on title, with YF Dashboards prioritized higher than non-YF dashboards
    - P3: Do partial match on search input boundary (exact order)
    - P4: Do partial match on search input words anywhere (unordered)
    - P5: Do partial match on sanitized search input boundary (strip symbols)
    - P6: Do partial match on sanitized search input words anywhere (strip symbols)
  */
  static searchOptionFields(options, searchInput) {
    const lowerCaseOptions = this.getLowerCaseOptions(options);
    const lowerSearchInput = searchInput.toLowerCase();
    let unmatchedOptions = lowerCaseOptions;
    const priority1Ids = this.searchP1TitleMatches(unmatchedOptions, lowerSearchInput);
    unmatchedOptions = _.filter(unmatchedOptions, option => !priority1Ids.includes(option.id));
    const priority2Ids = this.searchP2TitleSequenceMatchesOrderedByDashboard(unmatchedOptions, lowerSearchInput);
    unmatchedOptions = _.filter(unmatchedOptions, option => !priority2Ids.includes(option.id));
    const priority3Ids = this.searchP3PartialMatches(unmatchedOptions, lowerSearchInput);
    unmatchedOptions = _.filter(unmatchedOptions, option => !priority3Ids.includes(option.id));
    const priority4Ids = this.searchP4UnorderedMatch(unmatchedOptions, searchInput);
    unmatchedOptions = _.filter(unmatchedOptions, option => !priority4Ids.includes(option.id));
    const priority5Ids = this.searchP5SanitizedExactMatches(unmatchedOptions, searchInput);
    unmatchedOptions = _.filter(unmatchedOptions, option => !priority5Ids.includes(option.id));
    const priority6Ids = this.searchP6SanitizedUnorderedMatch(unmatchedOptions, searchInput);

    const foundIds = _.uniq(_.union(priority1Ids, priority2Ids, priority3Ids, priority4Ids, priority5Ids, priority6Ids));
    return _.map(foundIds, id => options.find(option => option.id === id));
  }
}

export default EntitySearchUtil;
