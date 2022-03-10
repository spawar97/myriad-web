import Moment from "moment";
import FileSaver from "file-saver";
import FrontendConstants from '../../../../../constants/FrontendConstants';

export const calculateCategoryRiskScore = (category) => {

  let riskCategoryScore = 0;
  let sumOfSubCategories = 0;
  let sumOfSubCategoriesWeight = 0;
  let totalEnabledSubCategories = 0;

  category.subcategory && category.subcategory.map((subcategory) => {

    if (subcategory.enabled === true) {
      let ImpactScore = subcategory.subCategoryImpactScore;
      let ProbabiltyScore = subcategory.subCategoryProbabilityScore;
      let subCategoryWeightage = subcategory.subCategoryWeightage;
      const riskSubCategoryScore = (ImpactScore * ProbabiltyScore * subCategoryWeightage);
      sumOfSubCategories += riskSubCategoryScore;
      sumOfSubCategoriesWeight += parseInt(subCategoryWeightage);
      totalEnabledSubCategories++;
    }
  });

  riskCategoryScore = (sumOfSubCategories / sumOfSubCategoriesWeight).toFixed(2);
  const categoryInfo = {
    score: riskCategoryScore,
    score: riskCategoryScore && riskCategoryScore !== 'NaN' ? riskCategoryScore : 'N/A',
    enabledSubCategories: totalEnabledSubCategories
  };

  return categoryInfo;

}

export const subCategoryRiskScore = (Impact, Probability) => {

  return Impact * Probability;
}

export const getCategoryData = (data) => {
  let category = data && data.map((obj) => {
    let subcategoryData = obj.ractSubCategoryWrapper.map((obj) => {
      return {
        id: obj.id,
        name: obj.name,
        enabled: obj.enable,
        riskQuestion: obj.question,
        consideration: obj.consideration,
        subCategoryDetectability: obj.detectability,
        subCategoryImpactScore: obj.impactScore,
        subCategoryProbabilityScore: obj.probabilityScore,
        subCategoryWeightage: obj.weight,
        subCategoryRationale: obj.rationale,
        FunctionalCategory: obj.selectedFunctionalPlans,
        mitigationAction: obj.selectedMitigationActions,
        existingMitigationOption: obj.mitigationActionOptions,
        associatedTaskId: obj.associatedTaskId,
        riskSubCategoryId: obj.riskSubCategoryId,
        customMitigationActions: [],
        customFunctionalPlan: [],
        associatedFileIds: obj.associatedFileIds,
        diffElement:obj.diffElement
      }
    });

    return {
      name: obj.name,
      id: obj.id,
      enabled: obj.enable,
      objective: obj.objective,
      riskType: obj.impactType,
      riskRationale: obj.rationale,
      weight: obj.weight,
      riskCategoryId: obj.riskCategoryId,
      kri: obj.kri,
      uiSeq: obj.uiSeq,
      ractVersionId: obj.ractVersionId,
      associatedFileIds:obj.associatedFileIds,
      diffElement:obj.diffElement,
      subcategory: subcategoryData,
    }
  });

  return category;
}

export const postCategoryData = (data, ractId) => {
  let category = data && data.map((objrc) => {
    let subcategoryData = objrc.subcategory.map((obj) => {
      return {
        id: obj.id,
        detectability: obj.subCategoryDetectability,
        impactType: "",
        rationale: obj.subCategoryRationale,
        mitigationActions: obj.mitigationAction.map(val => val.id),
        impactScore: parseInt(obj.subCategoryImpactScore),
        probabilityScore: parseInt(obj.subCategoryProbabilityScore),
        flag: obj.enabled.toString(),
        weight: parseInt(obj.subCategoryWeightage),
        question: obj.riskQuestion,
        consideration: obj.consideration,
        riskSubcategoryId: obj.riskSubCategoryId,
        functionalPlans: obj.FunctionalCategory.map(val => val.id),
        uiSeq: 1,
        categoryId: objrc.id,
        associatedFileIds: obj.associatedFileIds
      }
    });
    
    return {
      id: objrc.id,
      impactType: objrc.riskType,
      rationale: objrc.riskRationale,
      flag: objrc.enabled.toString(),
      weight: objrc.weight,
      kri: objrc.kri,
      riskCategoryId: objrc.riskCategoryId,
      ractId: ractId,
      uiSeq: objrc.uiSeq,
      ractVersionId: objrc.ractVersionId,
      associatedFileIds:objrc.associatedFileIds,
      ractSubCategoryWrapper: subcategoryData
    }
  });

  return category;
}

/* assessment data export */
export const prepareAssessmentData = (data) => {

  let assessmentExportData = []
  data && data.map((val) => {
    let csvData = val.subcategory.map((obj, ind) => {
      if (val.enabled && obj.enabled) {
        return {
          'Category Number': val.uiSeq,
          'Category Name': val.name, 
          'Category Objective': val.objective.toString().replace(/"/g, '').trim(),
          'Impact Type': val.riskType,
          'Category Rationale': val.riskRationale.toString().replace(/"/g, '').trim(),
          'Subcategory Number': `${val.uiSeq}.${ind + 1}`,
          'Subcategory Name': obj.name,
          'Question': obj.riskQuestion.toString().replace(/"/g, '').trim(),
          'Consideration': obj.consideration.toString().replace(/"/g, '').trim(),
          'Detectability': obj.subCategoryDetectability,
          'Impact Score': obj.subCategoryImpactScore,
          'Probability Score': obj.subCategoryProbabilityScore,
          'Weight': obj.subCategoryWeightage,
          'SubCategory Rationale': obj.subCategoryRationale.toString().replace(/"/g, '').trim(),
          'Functional Plan': obj.FunctionalCategory.map(plan => plan.planName).join('\n'),
          'Mitigation Action': obj.mitigationAction.map(action => action.mitigationActions).join('\n'),
        }
      } else {
        return {};
      }
    });

    return assessmentExportData.push(...csvData);

  });

  return assessmentExportData;
}

export const exportCSV = (data, filename) => {
  const timestampString = Moment().format("YYYY-MM-DD-HH_mm_ss");
  const json = data;
  const fields = Object.keys(data[0]);
  const replacer = function (key, value) {
    return value === null ? '' : value;
  };
  let csv = json.map(function (row) {
    return fields.map(function (fieldName) {
      return JSON.stringify(row[fieldName], replacer).replace(/\\n/g, '\n');
    }).join(',');
  });
  csv.unshift(fields.join(','));
  csv = csv.join('\r\n');

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  FileSaver.saveAs(blob, filename + '-' + timestampString + '.csv');
}

export const exportAssessmentCSV = (ractConsoleData, exportDataAfterSave) => {

  let categoryUpdatedData = exportDataAfterSave;
  let exportData = categoryUpdatedData.length ? categoryUpdatedData : ractConsoleData;
  const csvData = prepareAssessmentData(exportData);
  const fileName = FrontendConstants.RACT_ASSESSMENT_EXPORT_CSV_FILENAME;
  let data = csvData.filter(value => Object.keys(value).length !== 0);
  exportCSV(data, fileName);
}

/* assessment data export end */
