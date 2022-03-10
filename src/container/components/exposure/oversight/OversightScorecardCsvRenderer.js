import Immutable from 'immutable';

import OversightConsoleUtil from '../../../util/OversightConsoleUtil';
import FrontendConstants from '../../../constants/FrontendConstants';
import keymirror from "keymirror";
import OversightScorecardConstants from "../../../constants/OversightScorecardConstants";

class OversightScorecardCsvRenderer {

  constructor(scorecardLevel, immMetricsById) {
    this.eol = '\r\n';
    this.quoteChar = '"';
    this.separator = ',';
    this.quoteCharRegex = new RegExp(this.quoteChar, 'g');
    // https://tools.ietf.org/html/rfc4180 "2.  Definition of the CSV Format" point 7.
    this.escapedQuote = this.quoteChar + this.quoteChar;

    this.scorecardLevel = scorecardLevel;
    this.immMetricsById = immMetricsById;

    // columns are ordered as it is required to be show in csv file
    this.siteColumnsMap = Immutable.OrderedMap.of(
      // id and name is part of PresentationModel
      ["sitecity", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_CITY],
      ["sitecountry", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_COUNTRY],
      ["sitecraname", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_CRA_NAME],
      ["sitepostal", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_POSTAL],
      ["siteregion", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_REGION],
      ["sitestate", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_STATE],
      ["siteenrolledcount", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_ENROLLED_COUNT],
      ["siteinvestigatorname", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_INVESTIGATOR_NAME],
      ["siteactivationdate", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_ACTIVATION_DATE],
      ["sitedeactivationdate", FrontendConstants.OVERSIGHT_TOOLTIP_SITE_DEACTIVATION_DATE],
    );

    // columns are ordered as it is required to be show in csv file
    this.studyColumnsMap = Immutable.OrderedMap.of(
      // id and name is part of PresentationModel
      ["studystatus", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_STATUS],
      ["studyphase", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PHASE],
      ["studydescription", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_DESCRIPTION],
      ["studyprogram", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PROGRAM],
      ["studyregions", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_REGIONS],
      ["studyactualenrollmentcount",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ACTUAL_ENROLLMENT_COUNT],
      ["studyplannedenrollmentcount",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PLANNED_ENROLLMENT_COUNT],
      ["studycronames", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CRO_NAMES],
      ["studycurrentmilestone", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE],
      ["studycurrentmilestoneplanneddate",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE_PLANNED_DATE],
      ["studycurrentmilestoneprojecteddate",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE_PROJECTED_DATE],
      ["studymedicalindication", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_MEDICAL_INDICATION],
      ["studystartdate", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_START_DATE],
      ["studycurrentsiteactivationcount",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_SITE_ACTIVATION_COUNT],
      ["studytargetsiteactivationcount",
        FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_TARGET_SITE_ACTIVATION_COUNT],
      ["studytherapeuticarea", FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_THERAPEUTIC],
    );

    this.entityColumnMap =
      ( this.scorecardLevel === 'STUDY')
        ? this.studyColumnsMap
        : this.siteColumnsMap;
    this.entityColumnPrefix = ( this.scorecardLevel === 'STUDY') ? "Study " : "Site ";

    this.metricColumns = keymirror({
      numerator: null,
      denominator: null,
      score: null,
    });
  }

  renderCsv(immPresentationData) {
    const title = this._getAllTitles(
      this.scorecardLevel,
      immPresentationData.get('entityHeaders')
    );

    const entityDetails = immPresentationData.get('entityDetails').get(this.scorecardLevel);
    let csv = title + immPresentationData.get('entityRows').reduce((accum, groupByLevel) => {
      // we skip keys to print
      let result = accum + this._printGroupByLevel(groupByLevel, entityDetails);
      return result;
    }, "");
    return csv;
  }

  _getAllTitles(selectedScorecardLevel, entityHeaders) {
    const additionalHeaders = this._getKeyValueTitles(entityHeaders.get('additionalHeaders'));
    let title = ''
      + additionalHeaders
      + ((additionalHeaders.length != 0) ? this.separator : '')
      + this._getDetailsIdentifiers(entityHeaders.get('infoHeaders'))
      + this.separator
      + this._getDetailColumnTitles(selectedScorecardLevel)
      + this.separator
      + this._getOverallTitles(entityHeaders.get('infoHeaders'))
      + this.separator
      + this._getMetricTitles(entityHeaders.get('metricHeaders'))
      + this.eol;
    return title;
  }

  _getKeyValueTitles(keyValueMapsList) {
    const result = keyValueMapsList.map(item => item.get('value'));
    return this._quoteAndJoin(result);
  }

  _getDetailsIdentifiers(keyValueMapsList) {
    const result = keyValueMapsList
      .filter(item => item.get('key') !== 'overall-score')
      .map(item => item.get('value'));
    return this._quoteAndJoin(result);
  }

  _getDetailColumnTitles(selectedScorecardLevel) {
    const result = this.entityColumnMap.valueSeq()
      .map(value => this.entityColumnPrefix + value);
    return this._quoteAndJoin(result);
  }

  _getOverallTitles(keyValueMapsList) {
    const overallScoreTitle = keyValueMapsList
      .filter(item => item.get('key') === 'overall-score')
      .map(item => item.get('value'))
      .get(0);
    const result = Immutable.List.of(overallScoreTitle, overallScoreTitle + ' Rank');
    return this._quoteAndJoin(result);
  }

  _getMetricTitles(listOfKeyValueMapWithConfig) {
    const titles = listOfKeyValueMapWithConfig.map(item => {
      // we produce 3 columns(numerator, denominator, score) for each metric
      // let attributesMap = item.getIn(['config', 'displayAttributes']);
      const metricLabel = item.get('title');
      const suffix = item.get('suffix');
      const immConfigsList = item.get('configs').toList();
      // TODO - if we have multiple configs for the same metric title + suffix combination, it is
      //        technically possible for us to have different numerator/denominator labels.
      //        Determine if selecting the first metric config from this list is fine behavior
      const attributesMap = immConfigsList.getIn([0, 'displayAttributes']);
      const numeratorLabel = attributesMap.get(this.metricColumns.numerator+'Label');
      const denominatorLabel = attributesMap.get(this.metricColumns.denominator+'Label');

      return Immutable.List.of(
        `${metricLabel} (${numeratorLabel})`,
        `${metricLabel} (${denominatorLabel})`,
        `${metricLabel} (${suffix})`,
        `${metricLabel} (Score Label)`,
        `${metricLabel} (Score Label Rank)`,
      );
    }).toList().flatten(true);
    return this._quoteAndJoin(titles);
  }

  _printGroupByLevel(groupedByLevel, entitiesDetailsMap) {
    let result = "";
    groupedByLevel.forEach((rowMap, key) => {
      let additionalValues = this._printAdditional(rowMap.get('additionalInfo'));

      const entityId = rowMap.get('entityId');
      const entityDetails = entitiesDetailsMap.get(entityId);
      let entityValues = this._printEntity(entityId, rowMap.get('entityName'), entityDetails);

      const overallScoreValues = this._printOverall(rowMap.get('overallScore'));
      const metricValues = this._printScorecardMetrics(rowMap.get('metrics'));

      result += additionalValues
        + ((additionalValues.length !== 0) ? this.separator : '') + entityValues
        + this.separator + overallScoreValues
        + metricValues
        + this.eol;
    });
    return result;
  }

  _printAdditional(additionalInfoMap) {
    const result = Immutable.List(additionalInfoMap.map(item => item.get('value')).values());
    return this._quoteAndJoin(result);
  }

  _printEntity(id, name, dataMap) {
    const extendedData = Immutable.List(this.entityColumnMap.keySeq()
      .map(key => this._escapeRawData(dataMap.get(key))));
    const data = Immutable.List.of(this._escapeRawData(id), this._escapeRawData(name)).concat(extendedData);
    return this._quoteAndJoin(data);
  }

  _printOverall(dataMap) {
    const value = dataMap.get('value');
    const rank = this._getAggregateScoreRank(value);
    const result = Immutable.List.of(value, rank);
    return this._quoteAndJoin(result);
  }

  _printScorecardMetrics(metricsList) {
    const metrics = metricsList.reduce((accum, metricMap) => {
        let result = accum + this.separator + this._printMetricData(metricMap) ;
        return result;
      }, "");

    return metrics;
  }

  _printMetricData(metricMap) {
    let result = ['', '', '', 'Missing', '-1'];
    if (metricMap != null) {
      const numerator = metricMap.getIn(['scoreData', this.metricColumns.numerator]);
      const denominator = metricMap.getIn(['scoreData', this.metricColumns.denominator]);
      const score = metricMap.getIn(['scoreData', this.metricColumns.score]);

      const metricId = metricMap.getIn(['scoreData','metricid']);
      const metricGroupId = metricMap.getIn(['scoreData', 'metricgroupid']);
      const label = metricMap.getIn(['render', 'label']);
      const rank = this._convertLabelToRank(metricId, label, metricGroupId);

      result = [numerator, denominator, score, label, rank];
    }
    return this._quoteAndJoin(result);
  }

  _quoteAndJoin(list) {
    return list.map(value => this.quoteChar + value + this.quoteChar).join(this.separator)
  }

  _escapeRawData(value) {
    let result = "";
    if (value == null) {
      result = "";
    } else {
      // we do escaping only for Study/Site data
      // all other data is numerical or defined in configuration there should not be any quotations
      result = value.toString().replace(this.quoteCharRegex, this.escapedQuote);
    }
    return result;
  }

  _getAggregateScoreRank(aggregateScore) {
    const color = OversightConsoleUtil.getEntityAggregateScoreColor(aggregateScore);
    let result;
    switch (color) {
      case OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD:
        result = 3;
        break;
      case OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM:
        result = 2;
        break;
      case OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD:
        result = 1;
        break;
      case OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID:
        result = -1;
        break;
      default:
        result = "N/A";
        break;
    }
    return result;
  }

  _convertLabelToRank(metricId, label, metricGroupId) {
    const metricMap = this.immMetricsById.getIn([metricId, metricGroupId, 'displayAttributes']);
    let rank = -1;
    if (label === metricMap.get('goodLabel')) {
      rank = 3;
    } else if (label === metricMap.get('mediumLabel')) {
      rank = 2;
    } else if (label === metricMap.get('badLabel')) {
      rank = 1;
    }
    return rank;
  }
}

export default OversightScorecardCsvRenderer;
