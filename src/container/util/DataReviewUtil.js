import Imm from 'immutable';
import FrontendConstants from '../constants/FrontendConstants';
import Util from "./util";
import _ from "underscore";

class DataReviewUtil {

  static buildDataDiffRequest(immSelectedFilterOptions) {
    const subjectIds = immSelectedFilterOptions.get('Subjects', Imm.List())
      .reduce((memo, subjectData) => {
        memo.push(subjectData.get('value'));
        return memo;
      }, []);

    const siteIds = immSelectedFilterOptions.get('Sites', Imm.List())
      .reduce((memo, subjectData) => {
        memo.push(subjectData.get('value'));
        return memo;
      }, []);
    const startDate = immSelectedFilterOptions.getIn(['Dates', 0, 'value'], null);
    return {
      studyId: immSelectedFilterOptions.getIn(['Study', 'value']),
      subjectIds,
      siteIds,
      startDate: isNaN(startDate) ? null : Number(startDate),
      endDate: Number(immSelectedFilterOptions.getIn(['Dates', 1, 'value'])),
      reviewRoles: immSelectedFilterOptions.getIn(['ReviewRoles', 'value']),
      includedRecords: immSelectedFilterOptions.getIn(['IncludedRecords', 'value']),
      fileId: immSelectedFilterOptions.get('FileId')
    };
  }

  static getReviewRoleStatus(immReviewRole) {
    const isReviewRoleEnabled = immReviewRole.get('isEnabled');
    const icon = isReviewRoleEnabled ? 'icon-checkmark-full' : 'icon-Checkboxnegative';
    const text = isReviewRoleEnabled
      ? FrontendConstants.REVIEW_ROLE_STATUS_ACTIVE
      : FrontendConstants.REVIEW_ROLE_STATUS_DISABLED;
    return {icon: icon, text: text};
  }

  static mapFileConfigsToComboboxOptions(fileConfigs) {
    const result = fileConfigs.toList()
      .flatMap((immFile) => {
        let fileType = immFile.get('fileType');
        return [{
          text: immFile.get('title'),
          id: immFile.get('id'),
          comprehendSchemaId: Util.getComprehendSchemaIdFromFile(immFile),
          type: Util.pluralize(Util.toTitleCase(fileType))
        }];
      })
      .sort((a, b) => {
        const prevTitle = a.text && a.text.toUpperCase();
        const nextTitle = b.text && b.text.toUpperCase();
        return prevTitle.localeCompare(nextTitle);
      });
    return result;
  }

  static handleFilterSelection(field, dataType, type, immFilterData, immSelectedFilterOptions, selections) {
    let newFilters = immSelectedFilterOptions;
    const isMulti = _.isArray(selections);

    // If selections are empty clear the field.
    if (_.isEmpty(selections)) {
      newFilters = newFilters.delete(field);
    } else if (type === 'EQUALS') {
      if (isMulti) {
        newFilters = newFilters.set(field, Imm.fromJS(
          _.map(selections, (selection) => {
            return { field, dataType, type, value: selection.value, displayName: selection.displayName };
          })
        ));
      } else {
        newFilters = newFilters.set(field, Imm.fromJS({
          field,
          dataType,
          type,
          value: selections.value,
          displayName: selections.displayName
        }));
      }
    } else if (type === 'RANGE') {
      newFilters = newFilters.set(field, Imm.fromJS([
        { field, dataType, type: 'GREATER_THAN', value: selections.lowerBound },
        { field, dataType, type: 'LESS_THAN', value: selections.upperBound }
      ]));
    }

    switch (field) {
      // If the study field was changed, we must remove sites and subjects since these are a map
      case 'Study':
        newFilters = newFilters.delete('Sites');
        newFilters = newFilters.delete('Subjects');
        break;
      case 'Sites':
        // if a site gets removed, we need to remove the subjects for that site as well
        const selectedStudy = newFilters.getIn(['Study', 'value'], '');
        const selectedSites = newFilters.get('Sites', '');

        // find the subjects we have selected
        const selectedSubjects = newFilters.get('Subjects', Imm.List()).toSet();
        let subjectFilterData = Imm.Set();

        // if we have selected a study and sites
        if (selectedStudy !== '' && selectedSites !== '') {
          // get all the possible subjects
          subjectFilterData = selectedSites.flatMap(site => {
            return immFilterData.getIn([selectedStudy, site.get('value')]).map(subject => {
              return Imm.fromJS({
                dataType: 'String',
                displayName: subject,
                field: 'Subjects',
                type: 'EQUALS',
                value: subject
              });
            }).toSet();
          }).toSet();
        }

        // intersect the set of possible subjects with the set of selected subjects
        newFilters = newFilters.set('Subjects', subjectFilterData.intersect(selectedSubjects).toList());
        break;
      case 'ReviewRoles':
        const includedRecordsValue = newFilters.getIn(['IncludedRecords', 'value']);
        if (includedRecordsValue === 'UNREVIEWED_BY' && !selections) {
          newFilters = newFilters.delete('IncludedRecords');
        }
        break;
    }
    return newFilters;
  }

  static handleDateRange(field, dataType, type, min, max, immSelectedFilterOptions, selections) {
    const lowerBound = Util.valueFormatter(selections.lowerBound, dataType);
    const upperBound = Util.valueFormatter(selections.upperBound, dataType);
    const minBound = Util.valueFormatter(min, dataType);
    const maxBound = Util.valueFormatter(max, dataType);
    return this.handleFilterSelection(field, dataType, type, null, immSelectedFilterOptions, lowerBound === minBound && upperBound === maxBound ? {} : selections);
  }
}

export default DataReviewUtil;
