import Imm from 'immutable';

/**
 * Simple utility class relating to retrieving study information from the Exposure store.
 */
class StudiesUtil {
  /**
   * Retrieves an immutable list representation of study information from the 'studies' key
   * inside of exposure store, and sorts the list based on study name (alphabetically)
   * @param immExposureStore - Exposure store reference
   */
  static getImmStudies(immExposureStore) {
    // TODO - This function was built to for some reason mix immutable JS List with a list of
    //        js Objects. This should be converted into a list of immutable Maps, mixing structures
    //        makes it difficult to track. Unfortunately master study filter functionality
    //        is coded to expect this structure and cannot justify refactoring this in 2.11
    return immExposureStore.get('studies', Imm.List())
      .filter(study => study.has('value'))
      .map((study, studyId) => ({
        value: studyId,
        label: study.get('value'),
        isArchived: study.get('isArchived'),
      })).toList()
      .sort((study, nextStudy) => {
        const studyName = study['label'].toUpperCase();
        const nextStudyName = nextStudy['label'].toUpperCase();
        return studyName.localeCompare(nextStudyName);
      });
  }
}

export default StudiesUtil;
