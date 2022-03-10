var _ = require('underscore');
var Imm = require('immutable');
var FrontendConstants = require('../constants/FrontendConstants');
var AppRequest = require('../http/AppRequest');
var GA = require('../util/GoogleAnalytics');
var Util = require('../util/util');

// Note that the goal of this code is to eventually be run independently in it's
// own Node application on the back-end. As such we're striving to keep this as
// self-contained as possible.
var TemplateLibrary = {
  // These validators correspond to the various ParameterType values from Exposure.proto.
  parameterValidators: {
    CQL_PARAMETER: function(immParameter, schemaId, updateErrorsCallback) {
      var paramValue = immParameter.get('value');

      if (!schemaId) {
        return FrontendConstants.PLEASE_SELECT_A_SCHEMA_ABOVE_TO_PROCEED;
      }

      if (_.isString(paramValue)) {
        // If the value has been cleared out it will be an empty string so we need to handle that case here.
        if (Util.isWhiteSpaceOnly(paramValue)) {
          return immParameter.get('isOptional') ? null : FrontendConstants.PARAMETER_IS_REQUIRED;
        }

        // We need to reach out to the back-end to validate.
        var url = '/api/cql-queries/' + schemaId + '/parse-column';
        var validationRequest = AppRequest({type: 'POST', url: url, data: paramValue});

        validationRequest.then(
          function(cqlCols) {
            if (_.isEmpty(cqlCols)) {
              updateErrorsCallback(immParameter.get('name'), FrontendConstants.INVALID_CQL);
              return FrontendConstants.INVALID_CQL;
            } else {
              updateErrorsCallback(immParameter.get('name'), null);
              return null;
            }
          },
          function(jqXHR) {
            console.log('%cERROR: POST api/cql-queries' + url + '/parse-column failed in parameter validation', 'color: #E05353');
            GA.sendAjaxException('POST api/cql-queries' + url + '/parse-column failed in parameter validation.');
          }
        );

        return FrontendConstants.VERIFYING;
      } else {
        // This should never happen in normal usage but is here just in case to cover our bases.
        return FrontendConstants.INVALID_CQL;
      }
    },
    CONSTANT_PARAMETER: function() {
      // TODO: Validate constants somehow.
      return null;
    },
    LIST_PARAMETER: function(immParameter) {
      // Validate that the parameter value is actually one of the valid choices.
      if (!immParameter.get('choices').contains(immParameter.get('value', null))) {
        return FrontendConstants.PLEASE_MAKE_A_SELECTION;
      } else {
        return null;
      }
    },
    CHECKBOX_PARAMETER: function(immParameter) {
      // Validate the parameter value is a boolean. This check shouldn't ever
      // fail in normal usage.
      var paramValue = immParameter.get('value');
      if (!(paramValue === 'true' || paramValue === 'false')) {
        return FrontendConstants.PARAMETER_MUST_BE_BOOLEAN;
      } else {
        return null;
      }
    },
    INFO_PARAMETER: function(immParameter) {
      // Validate the parameter value is a boolean. This check shouldn't ever
      // fail in normal usage.
      var paramValue = immParameter.get('value');
      if (!(paramValue === 'true' || paramValue === 'false')) {
        return FrontendConstants.PARAMETER_MUST_BE_BOOLEAN;
      } else {
        return null;
      }
    }
  },

  validateParameter: function(immParameter, schemaId, updateErrorsCallback) {
    if (!_.isUndefined(immParameter.get('value'))) { // Just in case we have a valid value of `false`.
      // If the parameter has a value sanity check it.
      return this.parameterValidators[immParameter.get('parameterType')](immParameter, schemaId, updateErrorsCallback);
    } else {
      return null;
    }
  },

  validateTemplate: function(immTemplate, schemaId, advancedConfigOverrides, dataParametersOnly, updateErrorsCallback) {
    var immParameters = immTemplate.get('parameters');
    var errorMessages = {};
    if (_.isEmpty(schemaId)) { errorMessages['schema'] = FrontendConstants.SCHEMA_IS_REQUIRED; }
    if (immParameters && immParameters.size > 0) {
      // Make sure all of the required parameters have values assigned to them.
      // 'isOptional' should always be set to `true` or `false` and 'value'
      // should always be a selected value or null.  Also validate that the
      // value chosen is sane. Note that this validation is mainly for UI
      // feedback purposes and can be bypassed.
      immParameters.forEach(function(immParameter) {
        // Check if the parameter has a value set, and flag it if it's not optional. Skip non-data parameters if requested.
        if (!dataParametersOnly || immParameter.get('isDataParameter', false)) {
          var paramValue = immParameter.get('value');
          var error = null;

          if (!_.isUndefined(paramValue)) {
            // The parameter has been set, validate its value.
            error = this.parameterValidators[immParameter.get('parameterType')](immParameter, schemaId, updateErrorsCallback);
          } else if (!immParameter.get('isOptional', false)) {
            // A mandatory parameter is not set, flag it.
            error = FrontendConstants.PARAMETER_IS_REQUIRED;
          }

          if (error) {
            errorMessages[immParameter.get('name')] = error;
          }
        }
      }, this);
    }

    // TODO: We need to validate and sanity check the advancedConfigOverrides.
    return Imm.fromJS(errorMessages);
  },

  // This is the function that will take a Template and its filled out
  // Parameters and create an InstantiatedTemplate which can then be rendered as
  // a report. This function should only be called on a validated template.
  instantiateTemplate: function(immTemplate, schemaId, advancedConfigOverrides) {
    // TODO: We need to validate and sanity check the advancedConfigOverrides.
    return Imm.Map({template: immTemplate, comprehendSchemaId: schemaId, advancedConfigOverrides: advancedConfigOverrides});
  }
};

module.exports = TemplateLibrary;
