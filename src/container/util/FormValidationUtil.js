import FrontendConstants from '../constants/FrontendConstants';

class FormValidationUtil {
  static validateForm(immForm) {
    let hasErrors = false;
    let immFields = immForm.get('fields').map((immValue) => {
      const immValidators = immValue.get('validators', []);
      let immMessages = immValidators
        .map(immValidator => {
          const validatorName = immValidator.get('name');
          const args = immValidator.get('args', []);
          let message = null;
          if (typeof validatorName === 'string') {
            if (FormValidationUtil[validatorName + 'Validator']) {
              message = FormValidationUtil[validatorName + 'Validator'](
                immValue.get('value'), ...args
              );
            }
          } else {
            message = validatorName(immValue.get('value'), immForm, ...args);
          }
          hasErrors = message ? true : hasErrors;
          return message;
        })
        .filter(message => message);
      return immValue.set('messages', immMessages);
    });

    const newImmForm = immForm.set('hasErrors', hasErrors);
    return newImmForm.set('fields', immFields);
  }

  static minLengthValidator(value, length) {
    let result = null;
    if (value !== undefined && value !== null
      && !(value.hasOwnProperty('length') && value.length >= length)) {
      result = FrontendConstants.VALIDATION_MIN_VALUE_LENGTH;
    }
    return result;
  }

  static maxLengthValidator(value, length) {
    let result = null;
    if (value !== undefined && value !== null
      && !(value.hasOwnProperty('length') && value.length <= length)) {
      result = FrontendConstants.VALIDATION_MAX_VALUE_LENGTH;
    }
    return result;
  }

  static minSizeValidator(value, length) {
    let result = null;
    if (value !== undefined && value !== null
      && !(value.hasOwnProperty('size') && value.size >= length)) {
      result = FrontendConstants.VALIDATION_MIN_NUMBER_SELECTED_ITEMS;
    }
    return result;
  }

  static floatValidator(value) {
    let result = null;
    if (!value.toString().match(/^-?\d+(\.\d+)?$/)) {
      result = FrontendConstants.VALIDATION_FLOAT;
    }
    return result;
  }

  static integerValidator(value) {
    let result = null;
    if (!value.toString().match(/^-?\d+$/)) {
      result = FrontendConstants.VALIDATION_INTEGER;
    }
    return result;
  }

  static minValidator(value, testValue) {
    let result = null;
    if (value.toString().match(/^-?\d+(\.\d+)?$/) && !(parseFloat(value) >= testValue)) {
      result = FrontendConstants.VALIDATION_MIN_VALUE(testValue);
    }
    return result;
  }

  static maxValidator(value, testValue) {
    let result = null;
    if (value.toString().match(/^-?\d+(\.\d+)?$/) && !(parseFloat(value) <= testValue)) {
      result = FrontendConstants.VALIDATION_MAX_VALUE(testValue);
    }
    return result;
  }

  static notEqValidator(value, testValue) {
    let result = null;
    if (value.toString().match(/^-?\d+(\.\d+)?$/) && !(parseFloat(value) !== testValue)) {
      result = FrontendConstants.VALIDATION_NOT_EQUAL_VALUE(testValue);
    }
    return result;
  }
}

export default FormValidationUtil;
