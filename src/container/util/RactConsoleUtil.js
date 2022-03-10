import FrontendConstants from "../constants/FrontendConstants";
import Tooltip from 'rc-tooltip';
import React from "react";
import {Key} from '../constants/RactConstant';
import Imm from "immutable";
import Moment from "moment";
import FileSaver from "file-saver";
import Util from "./util";

class RACTConsoleUtil {

  static prepareRactConsoleDataCSV = (ractConsoleData) => {
    let exportData = [];
    const entityDetails = ractConsoleData.get('entityDetails');
    entityDetails.map((data, key) => {
      const studyID = key;
      const studyName = data.get('studyname');
      const ractInfo = data.get('ractInfo');
      const formatData = {};
      formatData[FrontendConstants.STUDY_ID] = studyID;
      formatData[FrontendConstants.STUDY_NAME] = studyName;
      formatData[FrontendConstants.RACT_STATUS] = ractInfo.get('ractStatus');
      formatData[FrontendConstants.RISK_SCORE] = ractInfo.get('ractRiskScore');
      formatData[FrontendConstants.RACT_TEMPLATE] = ractInfo.get('name');
      formatData[FrontendConstants.RACT_TOTAL_CATEGORY_COUNT] = ractInfo.get('totalCategoryCount');
      formatData[FrontendConstants.RACT_ENABLED_CATEGORY_COUNT] = ractInfo.get('enabledCategoryCount');
      formatData[FrontendConstants.RACT_TOTAL_SUB_CATEGORY_COUNT] = ractInfo.get('totalSubCategoryCount');
      formatData[FrontendConstants.RACT_ENABLED_SUB_CATEGORY_COUNT] = ractInfo.get('enabledSubCategoryCount');
      formatData[FrontendConstants.RACT_MITIGATION_ACTION_COUNT] = ractInfo.get('mitigationActionCount');
      formatData[FrontendConstants.RACT_STUDY_PROGRAM] = data.get('studyprogram');
      formatData[FrontendConstants.RACT_STUDY_THERAPEUTIC_AREA] = data.get('studytherapeuticarea');
      formatData[FrontendConstants.RACT_STUDY_MEDICAL_INDICATION] = data.get('studymedicalindication');
      formatData[FrontendConstants.RACT_STUDY_PHASE] = data.get('studyphase');
      formatData[FrontendConstants.RACT_STUDY_STATUS] = data.get('studystatus');
      formatData[FrontendConstants.RACT_STUDY_CRO_NAMES] = data.get('studycronames');
      formatData[FrontendConstants.RACT_STUDY_START_DATE] = Util.dateFormatterUTC(data.get('studystartdate'));
      formatData[FrontendConstants.RACT_STUDY_PLANNED_END_DATE] = Util.dateFormatterUTC(data.get('studyplannedenddate'));
      formatData[FrontendConstants.RACT_STUDY_CURRENT_MILESTONE] = data.get('studycurrentmilestone');
      formatData[FrontendConstants.RACT_STUDY_REGIONS] = data.get('studyregions');
      formatData[FrontendConstants.RACT_STUDY_SPONSORS] = data.get('studysponsor');
      formatData[FrontendConstants.RACT_STUDY_PLANNED_ENROLLMENT_COUNT] = data.get('studyplannedenrollmentcount');
      formatData[FrontendConstants.RACT_STUDY_ACTUAL_ENROLLMENT_COUNT] = data.get('studyactualenrollmentcount');
      formatData[FrontendConstants.RACT_STUDY_CURRENT_SITE_ACTIVATION_COUNT] = data.get('studycurrentsiteactivationcount');
      formatData[FrontendConstants.RACT_STUDY_TARGET_SITE_ENROLLMENT_COUNT] = data.get('studytargetsiteactivationcount');
      formatData[FrontendConstants.RACT_STUDY_DESCRIPTION] = data.get('studydescription');
      exportData.push(formatData);
    });
    return exportData;
  };

  static exportRactConsoleCSV(ractConsoleData) {
    const csvData = this.prepareRactConsoleDataCSV(ractConsoleData);
    const fileName = FrontendConstants.RACT_CONSOLE_EXPORT_CSV_FILENAME;
    this.exportCSV(csvData, fileName);
  }

  static exportCSV(data, filename) {
    const timestampString = Moment().format("YYYY-MM-DD-HH_mm_ss");
    const json = data;
    const fields = Object.keys(data[0]);
    const replacer = function (key, value) {
      return value === null ? '' : value;
    };
    let csv = json.map(function (row) {
      return fields.map(function (fieldName) {
        return JSON.stringify(row[fieldName], replacer);
      }).join(',');
    });
    csv.unshift(fields.join(',')); // add header column
    csv = csv.join('\r\n');

    const blob = new Blob([csv], {type: "text/csv;charset=utf-8"});
    FileSaver.saveAs(blob, filename + '-' + timestampString + '.csv');
  }

  static wrapWithTooltip(tooltipItem, tooltipContent, classNames, trigger, placement) {
    let tooltipTriggers = trigger ? trigger : ['click', 'hover'];
    const overlayClassName = classNames ? classNames : 'ract-tooltip';
    const tooltipPlacement = placement ? placement : 'right';
    const tooltipAlignment = {
      overflow: {
        adjustX: 1,
        adjustY: 0,//stops adjusting the Y position and displays a scroll instead
      },
    };
    return (
      <Tooltip
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

  static getOverallScoreTooltip(entityName, immOverallScore, riskCategoryRange) {
    const highColor = immOverallScore.get('criticalColor');
    const highCount = immOverallScore.get('criticalCount');
    const mediumColor = immOverallScore.get('warningColor');
    const mediumCount = immOverallScore.get('warningCount');
    const lowColor = immOverallScore.get('goodColor');
    const lowCount = immOverallScore.get('goodCount');
    const totalRiskScore = immOverallScore.get('riskScore');
    const enabledCategoryCount = immOverallScore.get('enabledCategoryCount');
    const totalRiskScoreDesc = '( ' + FrontendConstants.RACT_TOOLTIP_RISK_SCORE_DESC + ' )';
    const riskCategoryRangeDenominator = (riskCategoryRange == FrontendConstants.RACT_RISK_CATEGORY_RANGE_1_5) ? '25'
      : (riskCategoryRange == FrontendConstants.RACT_RISK_CATEGORY_RANGE_1_10 ? '100' : '--');

    const totalRiskScoreContainer = (
      <div className='totalRiskScoreContainer'>
        <div className='totalRiskScoreLabel'>
          <div className='tooltipLabel'>Total Risk Score</div>
          <div className='tooltipScoreCount'>{`${totalRiskScore} / ${riskCategoryRangeDenominator}`}</div>
        </div>
        <div className='totalRiskScoreDesc'>{totalRiskScoreDesc}</div>
      </div>
    );
    return (
      <div className='ract-score-tooltip'>
        <span className='entity-name'>{entityName}</span>
        {totalRiskScoreContainer}
        <div className='categoryRiskContainer'>
          <div className='tooltipLabel'>Category Risk Value</div>
          <div className='score-categories'>
            <div className='category-column critical-category' style={{color: highColor}}>
              <div>{FrontendConstants.RACT_TOOLTIP_HIGH}</div>
              <div>{highCount} / {enabledCategoryCount}</div>
            </div>
            <div className='category-column warning-category' style={{color: mediumColor}}>
              <div>{FrontendConstants.RACT_TOOLTIP_MEDIUM}</div>
              <div>{mediumCount} / {enabledCategoryCount}</div>
            </div>
            <div className='category-column good-category' style={{color: lowColor}}>
              <div>{FrontendConstants.RACT_TOOLTIP_LOW}</div>
              <div>{lowCount} / {enabledCategoryCount}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  static getStudyInfoTooltip(studyId, studyDetails) {

    let startDate = Util.dateConverter(studyDetails.studystartdate);

    let studyEndDate = studyDetails.studyplannedenddate || studyDetails.studyenddate ;

    let endDate = Util.dateConverter(studyEndDate);

    let currentMilesstonePlannedDate = Util.dateConverter(studyDetails.studycurrentmilestoneplanneddate);
    let isDataPresent = (data) => { return data ? data : 'N/A' };

    return (<div className='entity-info-tooltip'>
      <div className='info-header'>
        <div className='entity-name'>{isDataPresent(studyDetails.studyname)}</div>
      </div>
      <div className='entity-details'>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ID}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studyid)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PROGRAM}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studyprogram)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_THERAPEUTIC}:
          </div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studytherapeuticarea)}</div>
        </div>
        <div className='tooltip-field'>
          <div
            className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_MEDICAL_INDICATION}:
          </div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studymedicalindication)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PHASE}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studyphase)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_STATUS}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studystatus)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CRO_NAMES}:
          </div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studycronames)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_START_DATE}:
          </div>
          <div className='tooltip-value'>{startDate}</div>
        </div>
        <div className='tooltip-field'>
          <div
            className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PLANNED_END_DATE}:
          </div>
          <div className='tooltip-value'>
            {FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_PLANNED_END_DATE_VALUE(endDate)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div
            className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_CURRENT_MILESTONE}:
          </div>
          <div className='tooltip-value'>
            {FrontendConstants.RACT_TOOLTIP_STUDY_CURRENT_MILESTONE_VALUE(isDataPresent(studyDetails.studycurrentmilestone),
              currentMilesstonePlannedDate)}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_REGIONS}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studyregions)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_SPONSOR}:</div>
          <div className='tooltip-value'>{isDataPresent(studyDetails.studysponsor)}</div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_ENROLLMENT}:
          </div>
          <div className='tooltip-value'>
            {FrontendConstants.RACT_TOOLTIP_STUDY_ENROLLMENT_VALUE(isDataPresent(studyDetails.studyactualenrollmentcount),
              isDataPresent(studyDetails.studyplannedenrollmentcount))}
          </div>
        </div>
        <div className='tooltip-field'>
          <div
            className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_SITE_ACTIVATION}:
          </div>
          <div className='tooltip-value'>
            {FrontendConstants.RACT_TOOLTIP_STUDY_SITE_ACTIVATION_VALUE(
              isDataPresent(studyDetails.studycurrentsiteactivationcount), isDataPresent(studyDetails.studytargetsiteactivationcount))}
          </div>
        </div>
        <div className='tooltip-field'>
          <div className='tooltip-label'>{FrontendConstants.OVERSIGHT_TOOLTIP_STUDY_DESCRIPTION}:
          </div>
          <div className='tooltip-value wrapped-content'>{isDataPresent(studyDetails.studydescription)}</div>
        </div>
      </div>
    </div>);
  }

  static getSubCategoryScore(immSubcategories) {
    const subCategoryImpactScore = immSubcategories.get('subCategoryImpactScore');
    const subCategoryProbabilityScore = immSubcategories.get('subCategoryProbabilityScore');
    const subCategoryWeight = immSubcategories.get('subCategoryWeightage');
    const riskSubCategoryScore = parseInt(subCategoryImpactScore * subCategoryProbabilityScore * subCategoryWeight);
    return riskSubCategoryScore;
  }

  static getCategoryScore(immCategory) {
    const subCategories = immCategory.get('riskSubCategories');
    let riskCategoryScore = 0;
    let sumOfSubCategories = 0;
    let sumOfSubCategoriesWeight = 0;
    let totalEnabledSubCategories = 0;
    let mitigationActionCount = 0;
    subCategories.map(subcategory => {
      if (subcategory.get('subCategoryFlag') === 'true') {
        const riskSubCategoryScore = this.getSubCategoryScore(subcategory);
        const mitigationAction = subcategory.get('mitigationAction');
        if (mitigationAction.size > 0) {
          mitigationActionCount++;
        }
        sumOfSubCategories += riskSubCategoryScore;
        sumOfSubCategoriesWeight += parseInt(subcategory.get('subCategoryWeightage'));
        totalEnabledSubCategories++;
      }
    });
    riskCategoryScore = parseFloat((sumOfSubCategories / sumOfSubCategoriesWeight).toFixed(2));
    riskCategoryScore = isNaN(riskCategoryScore) ? 0 : riskCategoryScore;
    const categoryInfo = {
      score: riskCategoryScore,
      enabledSubCategories: totalEnabledSubCategories,
      mitigationActionCount: mitigationActionCount,
    };
    return categoryInfo;
  }

  static getScoreType(riskCategoryRange, score) {
    const riskCategoryRangeCount = (riskCategoryRange === FrontendConstants.RACT_RISK_CATEGORY_RANGE_1_5) ? 5 : 10;
    const riskCategoryRangeOne = ((riskCategoryRangeCount * riskCategoryRangeCount) / 3).toFixed(2);
    const riskCategoryRangeTwo = riskCategoryRangeOne * 2;
    let riskType;
    if (score === 0) {
      riskType = 'riskDisabled';
    } else if (score >= 0 && score < riskCategoryRangeOne) {
      riskType = 'low';
    } else if (score >= riskCategoryRangeOne && score < riskCategoryRangeTwo) {
      riskType = 'medium';
    } else {
      riskType = 'high';
    }
    return riskType;
  }

  static getRiskColor(riskType) {
    let riskColor;
    if (riskType === 'low') {
      riskColor = '#48CC00';
    } else if (riskType === 'medium') {
      riskColor = '#CF9F00';
    } else {
      riskColor = '#D90700';
    }
    return riskColor;
  }

  static calculateRiskScore(result) {
    return result.map(immCat => {
      let ractInfo = immCat.get('ractInfo');
      let riskCategories = ractInfo.get('riskCategories');
      if (riskCategories.size > 0) {
        let totalCategoryCount = riskCategories.size;
        let sumOfRiskCategoriesScore = 0;
        let enabledCategoryCount = 0;
        let totalSubCategoryCount = 0;
        let enabledSubCategoryCount = 0;
        let mitigationActionCount = 0;
        let categoryTabId = 0;
        const riskCategoryImpactRange = ractInfo.get('riskCategoryRange');
        let highCategoryCount, mediumCategoryCount, lowCategoryCount;
        highCategoryCount = mediumCategoryCount = lowCategoryCount = 0;
        riskCategories = riskCategories.map(category => {
          categoryTabId++;
          let riskCategoryColor;
          let riskCategoryType;
          let riskCategoryScore = 0;
          if (category.get('categoryFlag') === 'true') {
            const riskCategoryInfo = this.getCategoryScore(category);
            riskCategoryScore = riskCategoryInfo.score;
            totalSubCategoryCount += category.get('riskSubCategories').size;
            enabledSubCategoryCount += riskCategoryInfo.enabledSubCategories;
            mitigationActionCount += riskCategoryInfo.mitigationActionCount;
            sumOfRiskCategoriesScore += parseFloat(riskCategoryScore);
            riskCategoryType = this.getScoreType(riskCategoryImpactRange, riskCategoryScore);
            riskCategoryColor = this.getRiskColor(riskCategoryType);
            if (riskCategoryType === 'low') {
              lowCategoryCount++;
            } else if (riskCategoryType === 'medium') {
              mediumCategoryCount++;
            } else if (riskCategoryType === 'high') {
              highCategoryCount++;
            }
            enabledCategoryCount++;
          } else {
            riskCategoryColor = '#888888';
            riskCategoryScore = 0;
            riskCategoryType = 'disabled';
          }
          category = category.set("riskCategoryColor", riskCategoryColor)
            .set("riskCategoryType", riskCategoryType)
            .set("riskCategoryScore", riskCategoryScore)
            .set("categoryTabId", categoryTabId);
          return category;
        });
        let riskCount = parseFloat((sumOfRiskCategoriesScore / enabledCategoryCount).toFixed(2));
        riskCount = isNaN(riskCount) ? 0 : riskCount;
        const riskType = this.getScoreType(riskCategoryImpactRange, riskCount);
        const riskColor = this.getRiskColor(riskType);

        let histogramData = {
          "criticalColor": "#D90700",
          "criticalCount": highCategoryCount,
          "goodColor": "#48CC00",
          "goodCount": lowCategoryCount,
          "warningColor": "#CF9F00",
          "warningCount": mediumCategoryCount,
          "riskScore": riskCount,
          "enabledCategoryCount": enabledCategoryCount,

        };
        histogramData = Imm.fromJS(histogramData);
        ractInfo = ractInfo.set('riskCategories', riskCategories)
          .set('ractRiskScore', riskCount)
          .set('ractRiskColor', riskColor)
          .set('ractRiskType', riskType)
          .set('mitigationActionCount', mitigationActionCount)
          .set('totalCategoryCount', totalCategoryCount)
          .set('totalSubCategoryCount', totalSubCategoryCount)
          .set('enabledCategoryCount', enabledCategoryCount)
          .set('enabledSubCategoryCount', enabledSubCategoryCount)
          .set('histogramData', histogramData);
        immCat = immCat.set('ractInfo', ractInfo);

        const studyTherapeuticArea = immCat.get('studytherapeuticarea');
        const studyMedicalIndication = immCat.get('studymedicalindication');
        const studyCroNames = immCat.get('studycronames');
        const studySponsor = immCat.get('studysponsor');
        const studyRegions = immCat.get('studyregions');
        const studyProgram = immCat.get('studyprogram');
        const studyStatus = immCat.get('studystatus');
        const studyPhase = immCat.get('studyphase');

        immCat = immCat.set('studytherapeuticarea', studyTherapeuticArea ? studyTherapeuticArea : '')
          .set('studymedicalindication', studyMedicalIndication ? studyMedicalIndication : '')
          .set('studycronames', studyCroNames ? studyCroNames : '')
          .set('studysponsor', studySponsor ? studySponsor : '')
          .set('studyregions', studyRegions ? studyRegions : '')
          .set('studyprogram', studyProgram ? studyProgram : '')
          .set('studystatus', studyStatus ? studyStatus : '')
          .set('studyphase', studyPhase ? studyPhase : '');
        return immCat;
      }
    });
  }

  static getGroupByColumn(option) {
    let columnName;
    switch (option) {
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
        columnName = 'studycronames';
        break;
      case Key.INDICATION :
        columnName = 'studymedicalindication';
        break;
      case Key.PROGRAM :
        columnName = 'studyprogram';
        break;
      case Key.REGION :
        columnName = 'studyregions';
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
        columnName = 'studyname';
        break;
    }
    return columnName;
  }

  static routeChange(props, Route) {
    return props.router.push({
      name: Route
    })
  }
}

export default RACTConsoleUtil;
