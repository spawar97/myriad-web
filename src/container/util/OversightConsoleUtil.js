import _ from 'underscore';
import OversightScorecardConstants, {Key as ConstantsKey} from "../constants/OversightScorecardConstants";
import FrontendConstants from "../constants/FrontendConstants";
import Tooltip from 'rc-tooltip';
import Util from "./util";
import React from "react";
import keymirror from "keymirror";
import CollapsibleText from '../components/common/CollapsibleText';
import ExposureAppConstants from "../constants/ExposureAppConstants";
import { Key } from '../constants/OversightScorecardConstants';
import OversightScorecardActions from "../actions/OversightScorecardActions";
import Imm from "immutable";
import {YellowfinFilter} from "./YellowfinUtil";
import {Key as OversightStoreKey} from "../stores/constants/OversightStoreConstants";

class OversightConsoleUtil {

  //get query parameter value by keyname
  static getParameterByName(name, url = window.location.href) {
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }

  static isValidURL(location) {
    let isValid = true;
    if (!_.isEmpty(location.query)) {
      if (![Key.STUDY, Key.SITE].includes(location.query.level)
        || !_.keys(OversightScorecardConstants.GROUP_OPTIONS[location.query.level]).includes(location.query.groupBy)
        || !_.keys(OversightScorecardConstants.SORT_OPTIONS).includes(location.query.sortBy)) {
        isValid = false;
      }
    }
    return isValid;
  }

  static getScoreRatio(oversightScore) {
    if (oversightScore == null) {
      return null;
    }
    return oversightScore.get('score');
  }

  /*
  Take a score object and a metricConfig for it and identify score rating based on this info
   */
  static _getScoreRatingInternal(immScore, immMetricConfig) {
    let scoreRating;
    if (immScore.get("invalidvalue") === true) {
      const title = immMetricConfig.getIn(['displayAttributes', 'title']);
      scoreRating = OversightConsoleUtil.getInvalidScoreRating(title);
    } else if (immScore.get("missingvalue") === true) {
      const title = immMetricConfig.getIn(['displayAttributes', 'title']);
      scoreRating = OversightConsoleUtil.getMissingScoreRating(title);
    } else {
      const scoreRatio = OversightConsoleUtil.getScoreRatio(immScore);
      scoreRating = OversightConsoleUtil.getScoreRating(scoreRatio, immMetricConfig);
    }
    return scoreRating;
  }

  /*
  Calculate aggregated entity score based on a set of metric scores and metric configs for them
   */
  static getEntityOverallScore(immEntityScores, immFilteredMetricsById, selectedScorecardLevel, studyId,
                               immStudyToMetricGroupMap, defaultMetricGroupId, immMetricsByConfigId,
                               isEntityExcludedFromDefault) {
    const entity = (selectedScorecardLevel === OversightScorecardConstants.SCORECARD_OPTIONS.SITE ?
        FrontendConstants.SITE : FrontendConstants.STUDY).toLowerCase();
    const metricGroupId = immStudyToMetricGroupMap.get(studyId);
    // Further filter out any metrics which are not applicable to this entity
    const immFilteredMetricsForEntity = immFilteredMetricsById.map(immMetricConfigs => {
        // Get the metric configs from the filtered configs that apply to this metric group
        //  1 - Get the config defined for the metric group,
        //  2 - Or get the config defined for the default group, unless excluded
        return immMetricConfigs.get(metricGroupId)
          || (!isEntityExcludedFromDefault && immMetricConfigs.get(defaultMetricGroupId));
      }).filter(immMetricConfig => !!immMetricConfig && immMetricConfig.size > 0);

    // calculate overall score
    const score = OversightConsoleUtil.getEntityAggregatedScore(immEntityScores, immMetricsByConfigId);
    const scoreFormattedValue = _.isNumber(score)
      ? score.toFixed(1)
      : FrontendConstants.NOT_AVAILABLE_ABBREVIATION;
    const scoreColor = _.isNumber(score)
      ? OversightConsoleUtil.getEntityAggregateScoreColor(score)
      : OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID;

    // calculate overall score breakdown
    const immEntityScoresByMetricId = immEntityScores.groupBy(immScore => immScore.get('metricid')).map(x => x.get(0));
    const immScoreRatingsByCategory = immFilteredMetricsForEntity.map((immMetricConfig, metricId) => {
      const immScore = immEntityScoresByMetricId.get(metricId, Imm.fromJS(OversightConsoleUtil.getUndefinedMetricScore(immMetricConfig)));
      const scoreRating = OversightConsoleUtil._getScoreRatingInternal(immScore, immMetricConfig);

      return Imm.Map(scoreRating);
    }).groupBy(rating => rating.get('category'));

    const missingMetrics = (immScoreRatingsByCategory.get(ScoreCategoryKey.INVALID, Imm.List()) || Imm.List())
      .map(s => s.get('metricName'));
    const criticalMetrics = immScoreRatingsByCategory.get(ScoreCategoryKey.CRITICAL, Imm.List()) || Imm.List();
    const warningMetrics = immScoreRatingsByCategory.get(ScoreCategoryKey.WARNING, Imm.List())|| Imm.List();
    const goodMetrics = immScoreRatingsByCategory.get(ScoreCategoryKey.GOOD, Imm.List()) || Imm.List();

    return {
      value: scoreFormattedValue,
      color: scoreColor,
      breakdown: {
        entity: entity,
        missingNames: missingMetrics,
        missingCount: missingMetrics.size,
        missingColor: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
        criticalCount: criticalMetrics.size,
        criticalColor: OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD,
        warningCount: warningMetrics.size,
        warningColor: OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM,
        goodCount: goodMetrics.size,
        goodColor: OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD,
      },
    };
  }

  /**
   * Creates the entity header columns, used by the CSV and tabular rendering methods
   * @param selectedScorecardLevel
   * @param immMetricConfigsById
   * @returns {{infoHeaders: *, additionalHeaders: *, metricHeaders: *}}
   */
  static getEntityHeaders(selectedScorecardLevel, immMetricConfigsById) {
    let entityInfoHeaders, entityAdditionalHeaders;
    switch (selectedScorecardLevel) {
      case ConstantsKey.SITE:
        entityInfoHeaders = [
          {key: 'site-id', value: FrontendConstants.SITE_ID},
          {key: 'site-name', value: FrontendConstants.SITE_NAME},
          {key: 'site-status', value: FrontendConstants.SITE_STATUS},
          {key: 'pi-name', value: FrontendConstants.PI_NAME},
          {key: 'pi-email', value: FrontendConstants.PI_EMAIL},
          {key: 'site-fpfv', value: FrontendConstants.SITE_FPFV},
          {key: 'overall-score', value: FrontendConstants.SITE_SCORE},
        ];
        entityAdditionalHeaders = [{accessor: 'studyname', key: 'study-name', value: FrontendConstants.STUDY_NAME}];
        break;
      case ConstantsKey.STUDY:
        entityInfoHeaders = [
          {key: 'study-id', value: FrontendConstants.STUDY_ID},
          {key: 'study-name', value: FrontendConstants.STUDY_NAME},
          {key: 'overall-score', value: FrontendConstants.STUDY_SCORE},
        ];
        entityAdditionalHeaders = [];
        break;
    }
    const entityMetricHeaders = immMetricConfigsById.map(x => x.toList()).toList().flatten(true)
      .groupBy(immMetricConfig => OversightConsoleUtil.getMetricConfigKey(immMetricConfig))
      .map(immMetricConfigsList => {
        // As we already have grouped by title + suffix, it is safe to pull display attributes
        // and metric ID from the first configuration in the list
        const firstMetric = immMetricConfigsList.get(0);
        const title = firstMetric.getIn(['displayAttributes', 'title']);
        const suffix = firstMetric.getIn(['displayAttributes', 'suffix']);
        const metricId = firstMetric.get('metricId');
        // Construct a mapping of the following structure:
        // {
        //    metricConfigId -> metricConfig
        //  }
        const immMetricConfigsMap = immMetricConfigsList.groupBy(immMetricConfig => immMetricConfig.get('id'))
          .map(immMetricConfigs => immMetricConfigs.get(0));
        const metricGroupIds = immMetricConfigsList.map(immMetricConfig => immMetricConfig.get('metricGroupId')).toOrderedSet();

        return Imm.Map({
          title,
          suffix,
          configs: immMetricConfigsMap,
          metricId,
          metricGroupIds,
        });
      })
      .sort((immMetricConfigListA, immMetricConfigListB) => {
        return OversightConsoleUtil.metricConfigListSorter(immMetricConfigListA, immMetricConfigListB);
      });

    return {
      infoHeaders: entityInfoHeaders,
      additionalHeaders: entityAdditionalHeaders,
      metricHeaders: entityMetricHeaders,
    };
  }

  static getMetricConfigKey(immMetricConfig) {
    const title = immMetricConfig.getIn(['displayAttributes', 'title'], '').toLowerCase().replace(/ /g, '_');
    const suffix = immMetricConfig.getIn(['displayAttributes', 'suffix']).toLowerCase().replace(/ /g, '_');
    return `${title}-${suffix}`;
  }

  /**
   * Given two immutable metric configuration lists, sort them based on sequence + title
   * @param immMetricConfigListA
   * @param immMetricConfigListB
   * @returns {number} - Sort order
   */
  static metricConfigListSorter(immMetricHeaderConfigMapA, immMetricHeaderConfigMapB) {
    function getMetricSequence(immMetricList) {
      return immMetricList.reduce((memo, immMetricConfig) => {
        const sequence = immMetricConfig.get('metricSequence');
        if (memo == null) {
          return sequence;
        }
        return memo <= sequence ? memo : sequence;
      }, null);
    }
    const immMetricConfigListA = immMetricHeaderConfigMapA.get('configs');
    const immMetricConfigListB = immMetricHeaderConfigMapB.get('configs');
    const metricASequence = getMetricSequence(immMetricConfigListA);
    const metricBSequence = getMetricSequence(immMetricConfigListB);
    let compareResult;
    if (metricASequence != null && metricBSequence != null && metricASequence !== metricBSequence) {
      compareResult = metricASequence - metricBSequence;
    } else if (metricBSequence == null) {
      compareResult = 1;
    } else if (metricASequence == null) {
      compareResult = -1;
    } else {
      const metricATitle = immMetricHeaderConfigMapA.get('title');
      const metricBTitle = immMetricHeaderConfigMapB.get('title');
      compareResult = metricATitle.localeCompare(metricBTitle);
    }
    return compareResult;
  }
  /*
  Calculate aggregated entity score based on a set of metric scores and metric configs for them
   */
  static getEntityAggregatedScore(immScores, immMetricsByConfigId) {
    let denominator = 0;
    const finalScore = immScores.reduce((acc, immScore) => {
      const immMetricConfig = immMetricsByConfigId.get(immScore.get('metricconfigid'));
      const weight = immMetricConfig.get('weight');

      const scoreRating = OversightConsoleUtil._getScoreRatingInternal(immScore, immMetricConfig);
      // Do not count scores with Invalid score
      if (scoreRating.category !== ScoreCategoryKey.INVALID) {
        // Aggregate all valid metric weights, so it could be used to calculate the final score
        denominator = denominator + weight;
      }
      return acc + scoreRating.categoryWeight * weight;
    },
    // Start from 0.0
    0.0);

    // Calculate average, in case everything is 'good', score is going to be exactly '10'
    const average = finalScore / denominator;

    return isNaN(average) ? null : average;
  }

  static getEntityAggregateScoreColor(aggregateScore) {
    let color;
    if (isNaN(aggregateScore)) {
      color = OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID;
    } else {
      // Entity scores should be colored according to the following scale using the default colors:
      // Bad: score < 4
      // Medium: 4 <= score < 8
      // Good: score >= 8
      if (aggregateScore >= 8) {
        color = OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
      } else if (aggregateScore >= 4) {
        color = OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM
      } else {
        color = OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD
      }
    }

    return color;
  }

  static getUndefinedMetricScore(immMetricConfig, drillDownParams) {
    return {
      scoreData: {
        numerator: null,
        denominator: null,
        score: null,
        invalidvalue: false,
        missingvalue: true,
        metricid: immMetricConfig.get('metricId'),
        metricgroupid: immMetricConfig.get('metricGroupId'),
        metricconfigid: immMetricConfig.get('id'),
      },
      key: OversightConsoleUtil.getMetricConfigKey(immMetricConfig),
      render: {
        label: FrontendConstants.OVERSIGHT_SCORE_UNKNOWN,
        color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
        value: '',
        valueSuffix: '',
      },
      drillDownParams,
    };
  }

  static getMetricAggregateScore(immMetricScores, immMetricConfig, drillDownParams, selectedScorecardLevel) {
    const metricDetails = OversightConsoleUtil._metricScoreCalculation(immMetricScores, immMetricConfig, selectedScorecardLevel);
    return {
      scoreData: {
        numerator: Util.numberSignificant(metricDetails.numerators, 2),
        denominator: Util.numberSignificant(metricDetails.denominators, 2),
        score: metricDetails.scoreRender.value,
        invalidvalue: metricDetails.isInvalid,
        missingvalue: metricDetails.isMissing,
        metricid: immMetricConfig.get('metricId'),
        metricgroupid: immMetricConfig.get('metricGroupId'),
        metricconfigid: immMetricConfig.get('id'),
        lastEnrollmentLabel: metricDetails.lastEnrollmentLabel,
        lastEnrollmentDate: metricDetails.lastEnrollmentDate
      },
      key: OversightConsoleUtil.getMetricConfigKey(immMetricConfig),
      render: metricDetails.scoreRender,
      drillDownParams,
    };
  }

  /*
  Take all scores for one metric and do the calculation of numerators/denominators
  as well as determining that resulting score may be missing or invalid
   */
  static _metricScoreCalculation(immMetricScores, immMetricConfig, selectedScorecardLevel) {
    const multiplier = immMetricConfig.get('multiplier');
    const ignoreDenominator = immMetricConfig.get('ignoreDenominator');

    // Gather amount of missing/invalid/valid
    // As long there is only 1 metric score (site level, for example) - treat them as true/false
    // If there are more than 1, ignore missing/invalid as long as there is at least one valid
    let missingCount = 0;
    let invalidCount = 0;
    let validCount = 0;
    let numerators = 0;
    let denominators = 0;
    let lastEnrollmentLabel,lastEnrollmentDate;
    // If numerator is null, it should be tagged as missing.
    // If numerator is present, but denominator is 0/null and should not be ignored - mark missing as well
    // Site with an invalid metric should be omitted from the study roll up
    // A study that has at least one valid site score metric value should show a value
    immMetricScores.forEach(immMetric => {
      const numerator = immMetric.get('numerator', 0);
      const denominator = immMetric.get('denominator', 0);
      let invalidValue = immMetric.get('invalidvalue', false);
      lastEnrollmentDate = immMetric.get('last_enrollment_date');
      lastEnrollmentLabel = immMetric.get('last_enrollment_label');
      const numeratorOrDenominatorInvalid = numerator == null || (!ignoreDenominator && !denominator);
      const isMetricMissing = numeratorOrDenominatorInvalid || (selectedScorecardLevel !== Key.SITE && invalidValue);

      if (isMetricMissing) {
        missingCount++;
      } else if (!!denominator || !!ignoreDenominator) {
        // Continue calculating numerators/denominators regardless of valid/invalid as long as denominators is ok
        numerators += numerator;
        // If we ignoring denominator, doesn't really matter what we adding here
        denominators += denominator;
        validCount++;
      } else {
        // Fall back to it being an invalid one
        // e.g. denominator == null, invalidValue = false and ignoreDenominator == false (possible case from PLO)
        invalidValue = true;
      }

      if (invalidValue === true) {
        invalidCount++;
      }
    });

    let isMissing;
    let isInvalid;
    // Different behavior between 1 metric (one site) and a set of metrics (study or some grouping of sites)
    if (immMetricScores.size === 1) {
      isMissing = missingCount === 1;
      isInvalid = invalidCount === 1;
    } else if (validCount > 0){
      isMissing = false;
      isInvalid = false;
    } else {
      // Default (zero metrics case or no valid points if more than 1 scores)
      isMissing = missingCount > 0;
      isInvalid = invalidCount > 0;
    }

    let score = null;
    let rating;
    if (!isMissing) {
      if (!ignoreDenominator) {
        score = multiplier * (numerators / denominators);
        rating = OversightConsoleUtil.getScoreRating(score, immMetricConfig);
      } else {
        score = multiplier * numerators;
        rating = OversightConsoleUtil.getScoreRating(score, immMetricConfig);
      }
      score = Util.numberSignificant(score, 2);
    }
    let scoreRender;
    if (isMissing) {
      scoreRender = {
        label: FrontendConstants.OVERSIGHT_SCORE_UNKNOWN,
        color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
        value: '',
      };
    } else if (isInvalid) {
      scoreRender = {
        label: FrontendConstants.OVERSIGHT_SCORE_INVALID,
        color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
        value: score,
      };
    } else {
      scoreRender = {
        label: rating.label,
        color: rating.color,
        value: score,
      };
    }

    return {numerators, denominators, isMissing, isInvalid, scoreRender, lastEnrollmentDate, lastEnrollmentLabel};
  }

  static getScoreRating(scoreRatio, immMetricConfig) {
    let rating;
    const directionality = immMetricConfig.get('directionality');
    switch (directionality) {
      case 0:
        rating = OversightConsoleUtil.getRatingWhenHighIsGood(scoreRatio, immMetricConfig);
        break;
      case 1:
        rating = OversightConsoleUtil.getRatingWhenLowIsGood(scoreRatio, immMetricConfig);
        break;
      case 2:
        rating = OversightConsoleUtil.getRatingWhenBandIsGood(scoreRatio, immMetricConfig);
        break;
      default:
        rating = OversightConsoleUtil.getRatingWhenHighIsGood(scoreRatio, immMetricConfig);
    }
    return rating;
  }

  static getRatingWhenHighIsGood(scoreRatio, immMetricConfig) {
    let metricLabel, metricColor, category, categoryWeight;

    const thresholdHigh = immMetricConfig.get('thresholdHigh');
    const thresholdLow = immMetricConfig.get('thresholdLow');
    const goodLabel = immMetricConfig.getIn(['displayAttributes', 'goodLabel']);
    const goodColor = immMetricConfig.getIn(['displayAttributes', 'goodColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    const badLabel = immMetricConfig.getIn(['displayAttributes', 'badLabel']);
    const badColor = immMetricConfig.getIn(['displayAttributes', 'badColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const mediumLabel = immMetricConfig.getIn(['displayAttributes', 'mediumLabel']);
    const mediumColor = immMetricConfig.getIn(['displayAttributes', 'mediumColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM;
    const title = immMetricConfig.getIn(['displayAttributes', 'title']);

    if (scoreRatio > thresholdHigh) {
      metricLabel = goodLabel;
      metricColor = goodColor;
      category = ScoreCategoryKey.GOOD;
      categoryWeight = ScoreCategoryWeight.GOOD;
    } else if (scoreRatio < thresholdLow) {
      metricLabel = badLabel;
      metricColor = badColor;
      category = ScoreCategoryKey.CRITICAL;
      categoryWeight = ScoreCategoryWeight.CRITICAL;
    } else {
      metricLabel = mediumLabel;
      metricColor = mediumColor;
      category = ScoreCategoryKey.WARNING;
      categoryWeight = ScoreCategoryWeight.WARNING;
    }

    return {
      label: metricLabel,
      color: metricColor,
      category: category,
      categoryWeight: categoryWeight,
      metricName: title,
    };
  }

  static getRatingWhenLowIsGood(scoreRatio, immMetricConfig) {
    let metricLabel, metricColor, category, categoryWeight;

    const thresholdHigh = immMetricConfig.get('thresholdHigh');
    const thresholdLow = immMetricConfig.get('thresholdLow');
    const goodLabel = immMetricConfig.getIn(['displayAttributes', 'goodLabel']);
    const goodColor = immMetricConfig.getIn(['displayAttributes', 'goodColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    const badLabel = immMetricConfig.getIn(['displayAttributes', 'badLabel']);
    const badColor = immMetricConfig.getIn(['displayAttributes', 'badColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const mediumLabel = immMetricConfig.getIn(['displayAttributes', 'mediumLabel']);
    const mediumColor = immMetricConfig.getIn(['displayAttributes', 'mediumColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM;
    const title = immMetricConfig.getIn(['displayAttributes', 'title']);

    if (scoreRatio > thresholdHigh) {
      metricLabel = badLabel;
      metricColor = badColor;
      category = ScoreCategoryKey.CRITICAL;
      categoryWeight = ScoreCategoryWeight.CRITICAL;
    } else if (scoreRatio < thresholdLow) {
      metricLabel = goodLabel;
      metricColor = goodColor;
      category = ScoreCategoryKey.GOOD;
      categoryWeight = ScoreCategoryWeight.GOOD;
    } else {
      metricLabel = mediumLabel;
      metricColor = mediumColor;
      category = ScoreCategoryKey.WARNING;
      categoryWeight = ScoreCategoryWeight.WARNING;
    }
    return {
      label: metricLabel,
      color: metricColor,
      category: category,
      categoryWeight: categoryWeight,
      metricName: title,
    };
  }

  static getRatingWhenBandIsGood(scoreRatio, immMetricConfig) {
    let metricLabel, metricColor, category, categoryWeight;

    const thresholdHigh = immMetricConfig.get('thresholdHigh');
    const thresholdLow = immMetricConfig.get('thresholdLow');
    const goodLabel = immMetricConfig.getIn(['displayAttributes', 'goodLabel']);
    const goodColor = immMetricConfig.getIn(['displayAttributes', 'goodColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    const badLabel = immMetricConfig.getIn(['displayAttributes', 'badLabel']);
    const badColor = immMetricConfig.getIn(['displayAttributes', 'badColor']) ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const title = immMetricConfig.getIn(['displayAttributes', 'title']);

    if (scoreRatio < thresholdHigh && scoreRatio > thresholdLow) {
      metricLabel = goodLabel;
      metricColor = goodColor;
      category = ScoreCategoryKey.GOOD;
      categoryWeight = ScoreCategoryWeight.GOOD;
    } else {
      metricLabel = badLabel;
      metricColor = badColor;
      category = ScoreCategoryKey.CRITICAL;
      categoryWeight = ScoreCategoryWeight.CRITICAL;
    }
    return {
      label: metricLabel,
      color: metricColor,
      category: category,
      categoryWeight: categoryWeight,
      metricName: title,
    };
  }

  static getInvalidScoreRating(metricTitle) {
    return {
      label: FrontendConstants.OVERSIGHT_SCORE_INVALID,
      color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
      category: ScoreCategoryKey.INVALID,
      categoryWeight: ScoreCategoryWeight.INVALID,
      metricName: metricTitle,
    };
  }

  static getMissingScoreRating(metricTitle) {
    return {
      label: FrontendConstants.OVERSIGHT_SCORE_MISSING,
      color: OversightScorecardConstants.SCORE_DEFAULT_COLORS.INVALID,
      category: ScoreCategoryKey.INVALID,
      categoryWeight: ScoreCategoryWeight.INVALID,
      metricName: metricTitle,
    };
  }

  static getMetricLegends(immMetricConfig) {
    let legends;
    const directionality = immMetricConfig.get('directionality');

    switch (directionality) {
      case 0:
        legends = OversightConsoleUtil.getMetricLegendsWhenHighIsGood(immMetricConfig);
        break;
      case 1:
        legends = OversightConsoleUtil.getMetricLegendsWhenLowIsGood(immMetricConfig);
        break;
      case 2:
        legends = OversightConsoleUtil.getMetricLegendsWhenBandIsGood(immMetricConfig);
        break;
      default:
        legends = OversightConsoleUtil.getMetricLegendsWhenHighIsGood(immMetricConfig);
    }
    return legends;
  }

  static getMetricLegendsWhenHighIsGood(immMetricConfig) {
    const immDisplayAttributes = immMetricConfig.get('displayAttributes', Imm.Map());
    const suffix = OversightConsoleUtil._metricSuffixFormatted(immMetricConfig);
    const thresholdHigh = `${immMetricConfig.get('thresholdHigh')}${suffix}`;
    const thresholdLow = `${immMetricConfig.get('thresholdLow')}${suffix}`;

    const goodLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_GREATER(thresholdHigh);
    const goodColor = immDisplayAttributes.get('goodColor') ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    const badLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_LESS(thresholdLow);
    const badColor = immDisplayAttributes.get('badColor') ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const mediumLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_BETWEEN(thresholdLow, thresholdHigh);
    const mediumColor = immDisplayAttributes.get('mediumColor') ||
      OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM;

    return (
      <div className='metric-legends'>
        <div className='metric-legend good-legend'>
          <div className='legend-color' style={{backgroundColor: goodColor}} />
          <div className='legend-label'>{goodLabel}</div>
        </div>
        <div className='metric-legend medium-legend'>
          <div className='legend-color' style={{backgroundColor: mediumColor}} />
          <div className='legend-label'>{mediumLabel}</div>
        </div>
        <div className='metric-legend bad-legend'>
          <div className='legend-color' style={{backgroundColor: badColor}} />
          <div className='legend-label'>{badLabel}</div>
        </div>
      </div>
    );
  }

  static getMetricLegendsWhenLowIsGood(immMetricConfig) {
    const immDisplayAttributes = immMetricConfig.get('displayAttributes', Imm.Map());
    const suffix = OversightConsoleUtil._metricSuffixFormatted(immMetricConfig);
    const thresholdHigh = `${immMetricConfig.get('thresholdHigh')}${suffix}`;
    const thresholdLow = `${immMetricConfig.get('thresholdLow')}${suffix}`;

    const goodLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_LESS(thresholdLow);
    const goodColor = immDisplayAttributes.get('goodColor') || OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    const badLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_GREATER(thresholdHigh);
    const badColor = immDisplayAttributes.get('badColor') ||  OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const mediumLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_BETWEEN(thresholdLow, thresholdHigh);
    const mediumColor = immDisplayAttributes.get('mediumColor') || OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM;

    return (
      <div className='metric-legends'>
        <div className='metric-legend good-legend'>
          <div className='legend-color' style={{backgroundColor: goodColor}} />
          <div className='legend-label'>{goodLabel}</div>
        </div>
        <div className='metric-legend medium-legend'>
          <div className='legend-color' style={{backgroundColor: mediumColor}} />
          <div className='legend-label'>{mediumLabel}</div>
        </div>
        <div className='metric-legend bad-legend'>
          <div className='legend-color' style={{backgroundColor: badColor}} />
          <div className='legend-label'>{badLabel}</div>
        </div>
      </div>
    );
  }

  static getMetricLegendsWhenBandIsGood(immMetricConfig) {
    const immDisplayAttributes = immMetricConfig.get('displayAttributes', Imm.Map());
    const suffix = OversightConsoleUtil._metricSuffixFormatted(immMetricConfig);
    const thresholdHigh = `${immMetricConfig.get('thresholdHigh')}${suffix}`;
    const thresholdLow = `${immMetricConfig.get('thresholdLow')}${suffix}`;

    const badLabel = `${FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_LESS(thresholdLow)} OR ${FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_GREATER(thresholdHigh)}`;
    const badColor = immDisplayAttributes.get('badColor') || OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    const goodLabel = FrontendConstants.OVERSIGHT_TOOLTIP_LEGEND_BETWEEN(thresholdLow, thresholdHigh);
    const goodColor = immDisplayAttributes.get('goodColor') || OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;

    return (
      <div className='metric-legends'>
        <div className='metric-legend good-legend'>
          <div className='legend-color' style={{backgroundColor: goodColor}} />
          <div className='legend-label'>{goodLabel}</div>
        </div>
        <div className='metric-legend bad-legend'>
          <div className='legend-color' style={{backgroundColor: badColor}} />
          <div className='legend-label'>{badLabel}</div>
        </div>
      </div>
    );
  }

  static wrapWithTooltip(tooltipItem, tooltipContent, classNames, trigger, placement) {
    let tooltipTriggers = trigger ? trigger : ['click', 'hover'];
    const tooltipKey = `tooltip-${tooltipItem.key}`;
    const overlayClassName = classNames ? classNames : 'oversight-tooltip';
    const tooltipPlacement = placement ? placement : 'right';
    const tooltipAlignment = {
      overflow: {
        adjustX: 1,
        adjustY: 0,//stops adjusting the Y position and displays a scroll instead
      },
    };
    return (
      <Tooltip key={tooltipKey}
               placement={tooltipPlacement}
               align={tooltipAlignment}
               overlay={tooltipContent}
               overlayClassName={overlayClassName}
               trigger={tooltipTriggers}
               destroyTooltipOnHide={true}
               mouseEnterDelay={0.1}
      >
        {tooltipItem}
      </Tooltip>
    );
  }

  static navigateExposureDrilldownHandler(event, drillDownRoute, fileIdentifier, file, immScore, router, selectedScorecardLevel) {
    event.preventDefault();
    let params = {'study.studyid': immScore.get('studyid')};
    if (selectedScorecardLevel === Key.SITE) {
      params['site.siteid'] = immScore.get('siteid');
    }
    OversightScorecardActions.handleDrilldown(file, params,
      (query) => router.push({name: drillDownRoute, params: {fileId: fileIdentifier}, query})
    );
  }

  static getYellowfinDrillDownFilters(drillDownParams) {
    const filters = [];

    if (!!drillDownParams) {
      const studyName = drillDownParams.get('studyname', null);
      if (!!studyName) {
        filters.push(new YellowfinFilter(['Study', 'Study Name'],  [studyName]));
      }

      const siteName = drillDownParams.get('sitename', null);
      if (!!siteName) {
        filters.push(new YellowfinFilter(['Site', 'Site Name'], [siteName]));
      }

    }
    return filters;
  }

  static navigateToYellowfinDrillDown(event, drillDownRoute, fileIdentifier, drillDownParams, router) {
    event.preventDefault();
    const filters = OversightConsoleUtil.getYellowfinDrillDownFilters(drillDownParams);
    router.push({name: drillDownRoute, state: {filters: filters, ignoreStudySessionFilter: true}, params: {fileId: fileIdentifier}});
  }

  static getEntityMetricDrilldownLinks(immMetricConfig, drillDownParams, router, selectedScorecardLevel, loadingFileDrillDownId) {
    let drillDownLinks = [];

    const drillTargets = immMetricConfig.getIn(['embeddedDrillDown', 'targets'], Imm.List())
      .concat(
        immMetricConfig.get('drillTargetsToFiles', Imm.List())
      );
    if (drillTargets && drillTargets.size > 0) {
      drillTargets.forEach((immDrillEntity) => {
        const targetId = immDrillEntity.get('entityId', immDrillEntity.get('id'));
        const targetName = immDrillEntity.get('title', immDrillEntity.get('entityName'));
        const fileType = immDrillEntity.get('fileType', immDrillEntity.get('entityType'));
        const drillDownRoute = Util.getRouteNameByFileType(fileType);
        let linkIconClass = 'icon-spinner';
        if (loadingFileDrillDownId !== targetId) {
          linkIconClass = Util.getFileTypeIconName(fileType, targetName);
        }
        let navigationHandler = null;
        if (fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_DASHBOARD
          || fileType === ExposureAppConstants.FILE_TYPE_EMBEDDED_REPORT) {
          navigationHandler = (e) => this.navigateToYellowfinDrillDown(e, drillDownRoute, targetId,
            drillDownParams, router);
        } else {
          navigationHandler = (e) => this.navigateExposureDrilldownHandler(e, drillDownRoute, targetId,
            immDrillEntity, drillDownParams, router, selectedScorecardLevel);
        }
        drillDownLinks.push(
          <div className="oversight-scorecard-drilldown-link" key={targetId}>
            <a onClick={navigationHandler}>
              <i className={linkIconClass}></i>&nbsp;&nbsp;
              {targetName}
            </a>
          </div>
        );
      });
    }

    let drillDowns = null;
    if(!_.isEmpty(drillDownLinks)) {
      drillDowns = (<div className="drilldowns">{ drillDownLinks }</div>);
    }
    return drillDowns;
  }

  static getEntityMetricTooltip(immMetricData, immMetricConfig, router, selectedScorecardLevel, loadingFileDrillDownId) {
    const immScore = immMetricData.get('scoreData', Imm.Map());
    let headerMessage = "";
    const isMissing = immScore.get('missingvalue');
    const invalidValue = immScore.get('invalidvalue');

    if (isMissing) {
      headerMessage = FrontendConstants.OVERSIGHT_TOOLTIP_MISSING_DATA;
    } else if (invalidValue) {
      headerMessage = FrontendConstants.OVERSIGHT_TOOLTIP_INVALID_DATA;
    }
    const headerMessageDiv = (<div className='metric-header-notification-message'>
        {headerMessage}
      </div>);

    const drillDownParams = immMetricData.get('drillDownParams');
    let drillDowns = OversightConsoleUtil.getEntityMetricDrilldownLinks(immMetricConfig,
      drillDownParams, router, selectedScorecardLevel, loadingFileDrillDownId);

    const metricLegends = OversightConsoleUtil.getMetricLegends(immMetricConfig);
    const metricTitle = immMetricConfig.getIn(['displayAttributes', 'title']);
    const metricDescription = immMetricConfig.getIn(['displayAttributes', 'description']);
    const metricSuffix = OversightConsoleUtil._metricSuffixFormatted(immMetricConfig);

    const descriptionProps = {
      title: FrontendConstants.OVERSIGHT_TOOLTIP_METRIC_MORE,
      content: (
        <div>
          <div className='metric-title'>{metricTitle}</div>
          <div className='metric-description'>{metricDescription}</div>
          {metricLegends}
        </div>
      )
    };

    // Do not show denominator if we ignore denominators
    const denominator = immScore.get('denominator');
    const denominatorDiv = immMetricConfig.get('ignoreDenominator')
      ? ""
      : (
        <div className='metric-denominator'>
          <span>{immMetricConfig.getIn(['displayAttributes', 'denominatorLabel'])}: </span>
          <span>{denominator}</span>
        </div>
      );

    let lastEnrollmentDate = Util.dateFormatterUTC(immScore.get('lastEnrollmentDate')); 
    let lastEnrollmentLabel = immScore.get('lastEnrollmentLabel');
    const lastEnrollmentDataDiv = immScore.get('metricid') != 'os_enrollment_rate' 
    ? ""
     : (
      <div className='metric-enrollmentDate'>
        <span>{lastEnrollmentLabel}: </span>
        <span>{lastEnrollmentDate}</span>
      </div>
    );    

    const metricColor = immMetricData.getIn(['render', 'color']);
    const metricLabel = immMetricData.getIn(['render', 'label']);
    const metricValue = immMetricData.getIn(['render', 'value']);
    const metricNumeratorLabel = immMetricConfig.getIn(['displayAttributes', 'numeratorLabel']);
    const metricWeight = immMetricConfig.get('weight');
    // Do not show metric value if the value is missing
    const metricValueSpan = isMissing ? "" : (<span>{metricValue}{metricSuffix}</span>);
    const numerator = immScore.get('numerator');
    return (
      <div className='metric-score-tooltip'>
        <div className='metric-title'>
          {headerMessageDiv}
          <span>{metricTitle}: </span>
          <span style={{color: metricColor}}>{metricLabel}</span>
        </div>
        <div className='metric-value'>
          <span>{FrontendConstants.OVERSIGHT_TOOLTIP_METRIC_VALUE}: </span>
          {metricValueSpan}
        </div>
        <div className='metric-numerator'>
          <span>{metricNumeratorLabel}: </span>
          <span>{numerator}</span>
        </div>
        { denominatorDiv }
        { lastEnrollmentLabel != 'NULL' ?  lastEnrollmentDataDiv : ''}
        <div className='metric-weight'>
          <span>{FrontendConstants.OVERSIGHT_TOOLTIP_METRIC_WEIGHT}: </span>
          <span>{metricWeight}</span>
        </div>
        <div className='more-information'>
          <CollapsibleText {...descriptionProps} />
        </div>
        { drillDowns }
      </div>
    );

  }

  sortTooltipsByAlphabet(first, second) {
    return first.localeCompare(second);
  }

  static getOverallScoreTooltip(entityName, immOverallScore) {
    const missingNames = immOverallScore.get('missingNames', Imm.List()).sort(this.sortTooltipsByAlphabet).join(', ');
    const missingCount = immOverallScore.get('missingCount');
    const criticalColor = immOverallScore.get('criticalColor');
    const criticalCount = immOverallScore.get('criticalCount');
    const warningColor = immOverallScore.get('warningColor');
    const warningCount = immOverallScore.get('warningCount');
    const goodColor = immOverallScore.get('goodColor');
    const goodCount = immOverallScore.get('goodCount');
    const entity = immOverallScore.get('entity');

    const missingLabel = missingCount > 0 ? (
            <div>
              <div className='missing-metrics-title'>
                {FrontendConstants.OVERSIGHT_TOOLTIP_MISSING(missingCount, entity)}
              </div>
              <div className='missing-metrics'>{missingNames}</div>
            </div>
        ) : "";
    return (
      <div className='aggregate-score-tooltip'>
        <span className='entity-name'>{entityName}</span>
        <div className='score-categories'>
          <div className='category-column critical-category' style={{color: criticalColor}}>
            <div>{FrontendConstants.OVERSIGHT_TOOLTIP_CRITICAL}</div>
            <div>{criticalCount}</div>
          </div>
          <div className='category-column warning-category' style={{color: warningColor}}>
            <div >{FrontendConstants.OVERSIGHT_TOOLTIP_WARNING}</div>
            <div>{warningCount}</div>
          </div>
          <div className='category-column good-category' style={{color: goodColor}}>
            <div>{FrontendConstants.OVERSIGHT_TOOLTIP_GOOD}</div>
            <div>{goodCount}</div>
          </div>
        </div>
        {missingLabel}
      </div>
    );
  }

  static getEntityInfoTooltip(selectedScorecardLevel, entityId, immPresentationData, viewSitesCallback, studyName, immMilestoneLabel, studyId, isTabularView) {
    let immEntityDetails = immPresentationData.getIn(['entityDetails', selectedScorecardLevel, entityId]);
    immEntityDetails = immEntityDetails.set('studyname', studyName);
    let tooltip;
    switch (selectedScorecardLevel) {
      case Key.STUDY:
        tooltip = OversightConsoleUtil.getStudyInfoTooltip(entityId, immEntityDetails.toJS(), viewSitesCallback);
        break;
      case Key.SITE:
        tooltip = OversightConsoleUtil.getSiteInfoTooltip(entityId, immEntityDetails.toJS(), immMilestoneLabel.toJS(), null, studyId , isTabularView);
    }
    return tooltip;
  }

  static valueOrEmpty(data) {
    return data ? data : "--";
  }

  static getStudyInfoTooltip(studyId, studyDetails, viewSitesCallback) {
    let viewSitesDrillDown;
    if (viewSitesCallback != null) {
      viewSitesDrillDown = <div className='drilldown-view-study-sites'
                                onClick={viewSitesCallback}>
        {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_VIEW_SITES}
      </div>;
    }
    return (<div className='entity-info-tooltip'>
      <div className='info-header'>
        <div className='entity-name'>{studyDetails.studyname}</div>
        {viewSitesDrillDown}
      </div>
      <div className='entity-details'>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ID}: </div>
          <div className='tooltip-value'>{studyDetails.studyid}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PROGRAM}: </div>
          <div className='tooltip-value'>{studyDetails.studyprogram}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_THERAPEUTIC}: </div>
          <div className='tooltip-value'>{studyDetails.studytherapeuticarea}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_MEDICAL_INDICATION}: </div>
          <div className='tooltip-value'>{studyDetails.studymedicalindication}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PHASE}: </div>
          <div className='tooltip-value'>{studyDetails.studyphase}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_STATUS}: </div>
          <div className='tooltip-value'>{studyDetails.studystatus}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CRO_NAMES}: </div>
          <div className='tooltip-value'>{studyDetails.studycronames}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_START_DATE}: </div>
          <div className='tooltip-value'>{studyDetails.studystartdate}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PLANNED_END_DATE}: </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PLANNED_END_DATE_VALUE(studyDetails.studyplannedenddate)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE}: </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE_VALUE(studyDetails.studycurrentmilestone,
              studyDetails.studycurrentmilestoneplanneddate)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_REGIONS}: </div>
          <div className='tooltip-value'>{studyDetails.studyregions}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_SPONSOR}: </div>
          <div className='tooltip-value'>{studyDetails.studysponsor}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ENROLLMENT}: </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ENROLLMENT_VALUE(studyDetails.studyactualenrollmentcount,
              studyDetails.studyplannedenrollmentcount)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_SITE_ACTIVATION}: </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_SITE_ACTIVATION_VALUE(
              studyDetails.studycurrentsiteactivationcount, studyDetails.studytargetsiteactivationcount)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_DESCRIPTION}: </div>
          <div className='tooltip-value wrapped-content'>{studyDetails.studydescription}</div>
        </div>
      </div>
    </div>);
  }
 
  static getSiteInfoTooltip(siteId, siteDetails, milestoneLabelDetails, entityScorecardKey, studyId, isTabularView) {
    let studyid = isTabularView ? studyId : OversightConsoleUtil.getStudyIdFromUniqueId(entityScorecardKey);
    milestoneLabelDetails.length && milestoneLabelDetails.map(item=> {
      if(studyid == item.studyid) {
        siteDetails.configurableLabel = item.originalterm;
      }
    })
    return (<div className='entity-info-tooltip'>
      <span className='entity-name'>
        {FrontendConstants.OVERSIGHT_TOOLTIP_SITE_TITLE_VALUE(siteDetails.siteid, siteDetails.sitename)}
      </span>
      <div className='entity-details'>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_NAME}: </div>
          <div className='tooltip-value'>{siteDetails.studyname}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_COUNTRY}: </div>
          <div className='tooltip-value'>{siteDetails.sitecountry}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_LOCATION}: </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_SITE_LOCATION_VALUE(siteDetails.sitecity,
              siteDetails.sitestate, siteDetails.sitepostal)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{siteDetails.configurableLabel ? siteDetails.configurableLabel : FrontendConstants.OVERSIGHT_TOOLTIP_SITE_FPFV}: </div>
          <div className='tooltip-value'>{OversightConsoleUtil.valueOrEmpty(siteDetails.site_fpfv)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_STATUS}: </div>
          <div className='tooltip-value'>{OversightConsoleUtil.valueOrEmpty(siteDetails.sitestatus)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_INVESTIGATOR_NAME}: </div>
          <div className='tooltip-value'>{OversightConsoleUtil.valueOrEmpty(siteDetails.siteinvestigatorname)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_PI_EMAIL}: </div>
          <div className='tooltip-value'>{OversightConsoleUtil.valueOrEmpty(siteDetails.siteinvestigatoremail)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_CRA_NAME}: </div>
          <div className='tooltip-value'>{siteDetails.sitecraname}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_ACTIVATION_DATE}: </div>
          <div className='tooltip-value'>{siteDetails.siteactivationdate}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_SITE_ENROLLED_COUNT}: </div>
          <div className='tooltip-value'>{siteDetails.siteenrolledcount}</div>
        </div>
      </div>
    </div>);
  }

  static getGroupByColumn(option, scorecardLevel) {
    let columnName;
    switch(option) {
      case Key.STUDY :
        columnName = 'studyname';
        break;
      case Key.THERAPEUTIC_AREA :
        columnName = 'studytherapeuticarea';
        break;
      case Key.STATUS :
        columnName = 'studystatus';
        break;
      case Key.CRO :
        columnName = scorecardLevel === Key.STUDY ? 'studycronames' : 'sitecro';
        break;
      case Key.INDICATION :
        columnName = 'studymedicalindication';
        break;
      case Key.PROGRAM :
        columnName = 'studyprogram';
        break;
      case Key.REGION :
        columnName = scorecardLevel === Key.STUDY ? 'studyregions' : 'siteregion';
        break;
      case Key.SITE :
        columnName = 'siteid';
        break;
      case Key.CRA :
        columnName = 'sitecraname';
        break;
      case Key.STATE :
        columnName = 'sitestate';
        break;
      case Key.COUNTRY :
        columnName = 'sitecountry';
        break;
      case Key.INVESTIGATOR :
        columnName = 'siteinvestigatorname';
        break;
      case Key.SPONSOR :
        columnName = 'studysponsor';
        break;
      case Key.STUDY_PHASE :
        columnName = 'studyphase';
        break;
      case Key.NONE:
        columnName = scorecardLevel === Key.STUDY ? 'studyname' : 'siteid';
        break;
    }
    return columnName;
  }

  static getEntityDetails(entityId, selectedScorecardLevel, immAllDetails) {
    let entityDetails;
    switch (selectedScorecardLevel) {
      case Key.STUDY:
        entityDetails = immAllDetails && immAllDetails.getIn(['studyDetails', entityId], null);
        break;
      case Key.SITE:
        entityDetails = immAllDetails && immAllDetails.getIn(['siteDetails', entityId], null);
        break;
    }
    return entityDetails;
  }

  static getEntityName(selectedScorecardLevel, immEntityDetails) {
    let entityName = '';
    switch (selectedScorecardLevel) {
      case Key.STUDY:
        entityName = immEntityDetails && immEntityDetails.get('studyname');
        break;
      case Key.SITE:
        entityName = immEntityDetails && immEntityDetails.get('sitename');
        break;
      default:
        break;
    }

    return entityName;
  }


  static getEntityAdditionalInfo(selectedScorecardLevel, immEntityScores, immAllDetails) {
    let additionalInfo = {};
    switch (selectedScorecardLevel) {
      case Key.SITE:
        const siteStudyId = immEntityScores.getIn([0, 'studyid'], null);
        const studyDetails = immAllDetails.getIn(['studyDetails', siteStudyId]);
        let siteStudyTooltip;
        // Use StudyId as a fallback if studyDetails is null
        let studyName = siteStudyId;
        if (studyDetails != null) {
          siteStudyTooltip = OversightConsoleUtil.getStudyInfoTooltip(siteStudyId, studyDetails.toJS(), null);
          studyName = studyDetails.get('studyname', studyName);
        }
        additionalInfo['studyname'] = {
          value: studyName,
          tooltip: siteStudyTooltip,
        };
        break;
      default:
        break;
    }
    return additionalInfo;
  }

  static getMetricDrillDownParams(selectedScorecardLevel, selectedGroup, immMetricList, entityDetails) {
    let drillDownParamMap = {};
    const siteId = immMetricList.getIn([0, 'siteid']);
    const studyId = immMetricList.getIn([0, 'studyid']);
    switch (selectedScorecardLevel) {
      case ConstantsKey.SITE:
        switch (selectedGroup) {
          case ConstantsKey.STUDY:
            drillDownParamMap['siteid'] = siteId;
            drillDownParamMap['sitename'] = entityDetails.getIn([ConstantsKey.SITE, siteId, 'sitename']);
            drillDownParamMap['studyid'] = studyId;
            drillDownParamMap['studyname'] = entityDetails.getIn([ConstantsKey.STUDY, studyId, 'studyname']);
            break;
          default:
            drillDownParamMap['siteid'] = siteId;
            drillDownParamMap['sitename'] = entityDetails.getIn([ConstantsKey.SITE, siteId, 'sitename']);
        }
        break;
      case ConstantsKey.STUDY:
        drillDownParamMap['studyid'] = studyId;
        drillDownParamMap['studyname'] = entityDetails.getIn([ConstantsKey.STUDY, studyId, 'studyname']);
        break;
    }
    return drillDownParamMap;
  }

  static metricsListToMap(immMetrics) {
    return immMetrics.groupBy(metric => metric.get('metricId'))
      .map(metricList => metricList.get(0));
  }

  static _metricSuffixFormatted(immMetricConfig, tabularView) {
    const metricSuffix = immMetricConfig.getIn(['displayAttributes', 'suffix']);
    if (tabularView) {
      return metricSuffix === '%' ? metricSuffix : '';
    } else {
      return metricSuffix === '%' ? metricSuffix : ' ' + metricSuffix;
    }
  }

  static getUniqueEntityId(selectedScorecardLevel, entity) {
    let uniqueIdParts = [];
    const studyId = entity.get('studyid');
    uniqueIdParts.push(`studyid:${studyId}`);
    if (selectedScorecardLevel === ConstantsKey.SITE) {
      const siteId = entity.get('siteid');
      uniqueIdParts.push(`siteid:${siteId}`);
    }
    return uniqueIdParts.join(';');
  }

  static getStudyIdFromUniqueId(uniqueId) {
    const studyid = _.head(uniqueId.split(';'));
    return studyid.substring('studyid:'.length);
  }

  static getStudyToMetricGroupMapFromStore(immExposureStore, immOversightScorecardStore) {
    const immStudies = immExposureStore.get('studies');
    const immMetricGroups = immOversightScorecardStore.get(OversightStoreKey.metricGroups, Imm.Map());
    const immMetricGroupsList = immMetricGroups.toList();
    return OversightConsoleUtil.getStudyToMetricGroupMap(immStudies, immMetricGroupsList);
  }

  static getSiteIdFromUniqueId(uniqueId) {
    const siteid = _.last(uniqueId.split(';'));
    return siteid.substring('siteid:'.length);
  }

  static getEntityIdFromUniqueId(selectedScorecardLevel, uniqueEntityId) {
    let entityId;
    switch (selectedScorecardLevel) {
      case ConstantsKey.STUDY:
        entityId = OversightConsoleUtil.getStudyIdFromUniqueId(uniqueEntityId);
        break;
      case ConstantsKey.SITE:
        entityId = OversightConsoleUtil.getSiteIdFromUniqueId(uniqueEntityId);
        break;
      default:
        entityId = uniqueEntityId;
    }
    return entityId;
  }

  /**
   * Given the map of studies, and the map of metric groups, creates a mapping of:
   * { studyId -> metricGroupId }}
   *
   * If the study is not part of any metric group, will be assigned "NONE"
   * @param immStudies        - Map of studies
   * @param immMetricGroups   - Map of metric groups
   */
  static getStudyToMetricGroupMap(immStudies, immMetricGroups) {
    return immStudies.map((x, studyId) => {
      const immMetricGroup = immMetricGroups.find(y => y.get('studyIds').contains(studyId))
        || immMetricGroups.find(y => y.get('isDefault') && !y.get('excludedStudyIds').contains(studyId))
        || Imm.Map();
      return immMetricGroup.get('id', 'NONE');
    });
  }

  /**
   * Given a list of metric groups from the store, return the default metric group
   * @param immMetricGroups
   * @returns {*}
   */
  static getDefaultMetricGroup(immMetricGroups) {
    return immMetricGroups.find(x => x.get('isDefault'));
  }

  /**
   * Given a list of metric groups from the store, return the ID for the default metric group
   * @param immMetricGroups
   * @returns {*}
   */
  static getDefaultMetricGroupId(immMetricGroups) {
    return OversightConsoleUtil.getDefaultMetricGroup(immMetricGroups).get('id');
  }
}

const ScoreCategoryKey = keymirror({
  CRITICAL: null,
  WARNING: null,
  GOOD: null,
  INVALID: null,
});

const ScoreCategoryWeight = {
  CRITICAL:0,
  WARNING: 5,
  GOOD: 10,
  INVALID: 0, // It should be ignored, but considering it to be a zero, calculations could be simpler
};

const ScoreEntityTypeKey = keymirror({
  STUDY: null,
  SITE: null,
});

export default OversightConsoleUtil;
