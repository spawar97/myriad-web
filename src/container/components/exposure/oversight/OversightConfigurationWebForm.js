import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import cx from 'classnames';
import FrontendConstants from "../../../constants/FrontendConstants";
import ToggleButton from "../../ToggleButton";
import Combobox from "../../Combobox";
import FormValidationUtil from "../../../util/FormValidationUtil";
import OversightConfigurationColorPicker from "./OversightConfigurationColorPicker";
import OversightConfigurationDrillDownSelect from "./OversightConfigurationDrillDownSelect";
import OversightScorecardConstants from "../../../constants/OversightScorecardConstants";
import OversightConfigurationCategoryAutocomplete from "./OversightConfigurationCategoryAutocomplete";


class OversightConfigurationWebForm extends React.PureComponent {

  static propTypes = {
    immMetric: PropTypes.instanceOf(Imm.Map).isRequired,
    onChange: PropTypes.func,
    showErrors: PropTypes.bool,
    immCategories: PropTypes.instanceOf(Imm.List),
    canEdit: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.entityLabels = {
      study: FrontendConstants.STUDY,
      site: FrontendConstants.SITE,
    };

    this.directionalityLabels = {
      0: FrontendConstants.OVERSIGHT_CONFIGURATION_HIGH_IS_GOOD,
      1: FrontendConstants.OVERSIGHT_CONFIGURATION_LOW_IS_GOOD,
      2: FrontendConstants.OVERSIGHT_CONFIGURATION_BAND_IS_GOOD
    };

    this.immEntities = Imm.List([
      {value: FrontendConstants.STUDY.toLowerCase(), label: this.entityLabels.study},
      {value: FrontendConstants.SITE.toLowerCase(), label: this.entityLabels.site},
    ]);

    this.immDirectionalities = Imm.List([
      {value: 0, label: this.directionalityLabels[0]},
      {value: 1, label: this.directionalityLabels[1]},
      {value: 2, label: this.directionalityLabels[2]},
    ]);

    this.state = {
      immForm: this.generateForm(this.props.immMetric),
    };
  }

  generateForm(immMetric) {
    const directionalityValue = immMetric.get('directionality', '');

    let badColor = immMetric.getIn(['displayAttributes', 'badColor']);
    if (!badColor) {
      badColor = OversightScorecardConstants.SCORE_DEFAULT_COLORS.BAD;
    }

    let mediumColor = immMetric.getIn(['displayAttributes', 'mediumColor']);
    if (!mediumColor) {
      mediumColor = OversightScorecardConstants.SCORE_DEFAULT_COLORS.MEDIUM;
    }

    let goodColor = immMetric.getIn(['displayAttributes', 'goodColor']);
    if (!goodColor) {
      goodColor = OversightScorecardConstants.SCORE_DEFAULT_COLORS.GOOD;
    }

    const jsForm = {
      hasErrors: false,
      fields: {
        metricStatus: {
          value: (immMetric.get('metricStatus') === OversightScorecardConstants.METRIC_STATUSES.ENABLED),
        },
        displayName: {
          value: immMetric.getIn(['displayAttributes', 'title'], ''),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [200]},
          ],
        },
        category: {
          value: immMetric.get('category', ''),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [200]},
          ],
        },
        description: {
          value: immMetric.getIn(['displayAttributes', 'description'], ''),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [1000]},
          ],
        },
        numeratorLabel: {
          value: immMetric.getIn(['displayAttributes', 'numeratorLabel'], ''),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [25]},
          ],
        },
        denominatorLabel: {
          value: immMetric.getIn(['displayAttributes', 'denominatorLabel'], ''),
          validators: [
            {name: this.validatorDenominatorRequred.bind(this), args: []},
            {name: 'maxLength', args: [25]},
          ],
        },
        ignoreDenominator: {
          value: immMetric.get('ignoreDenominator', false),
        },
        suffix: {
          value: immMetric.getIn(['displayAttributes', 'suffix'], ''),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [25]},
          ],
        },
        displayMultiplier: {
          value: immMetric.get('multiplier', ''),
          validators: [
            {name: 'float'},
            {name: 'notEq', args: [0]},
          ],
        },
        displayOrder: {
          value: immMetric.get('metricSequence', ''),
          validators: [
            {name: 'integer'},
            {name: 'min', args: [0]},
          ],
        },
        badLabel: {
          value: immMetric.getIn(
            ['displayAttributes', 'badLabel'],
            OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.BAD
          ),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [20]},
          ],
        },
        mediumLabel: {
          value: immMetric.getIn(
            ['displayAttributes', 'mediumLabel'],
            OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.MEDIUM
          ),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [20]},
          ],
        },
        goodLabel: {
          value: immMetric.getIn(
            ['displayAttributes', 'goodLabel'],
            OversightScorecardConstants.DISPLAY_SETTING_LABEL_DEFAULTS.GOOD
          ),
          validators: [
            {name: 'minLength', args: [1]},
            {name: 'maxLength', args: [20]},
          ],
        },
        badColor: {
          value: badColor,
        },
        mediumColor: {
          value: mediumColor,
        },
        goodColor: {
          value: goodColor,
        },
        applicableEntities: {
          value: this.getImmEntitiesFromString(this.props.immMetric.get('entities', '')),
          validators: [
            {name: 'minSize', args: [1]},
          ],
        },
        weight: {
          value: immMetric.get('weight', ''),
          validators: [
            {name: 'integer'},
            {name: 'min', args: [1]},
          ],
        },
        directionality: {
          value: directionalityValue,
          validators: [
            {name: this.validatorDirectionality.bind(this), args:[0, 1, 2]},
          ],
        },
        thresholdLow: {
          value: immMetric.get('thresholdLow', ''),
          validators: [
            {name: 'float'},
          ],
        },
        thresholdHigh: {
          value: immMetric.get('thresholdHigh', ''),
          validators: [
            {name: 'float'},
          ],
        },
        drillTargets: {
          value: {
            drillTargets: immMetric.get('drillTargets', []),
            embeddedDrillDown: immMetric.get('embeddedDrillDown', {targets: []}),
          },
          validators: [
            {name: this.validatorDrillTargets.bind(this), args: [4]},
          ],
        },
      },
    };

    return Imm.fromJS(jsForm);
  }

  changeForm(immForm) {
    const {immMetric} = this.props;

    const entities = this.getFormValue('applicableEntities', immForm)
      .map(entity => entity.value)
      .sort((a, b) => a.localeCompare(b))
      .join('_and_');

    let metricStatus = OversightScorecardConstants.METRIC_STATUSES.DISABLED;
    if (this.getFormValue('metricStatus', immForm)) {
      metricStatus = OversightScorecardConstants.METRIC_STATUSES.ENABLED;
    }

    const newMetric = {
      weight: +this.getFormValue('weight', immForm),
      studyMaskEntities: immMetric.get('studyMaskEntities', []),
      entities,
      metricStatus: metricStatus,
      metricId: immMetric.get('metricId'),
      siteMaskEntities: immMetric.get('siteMaskEntities', []),
      thresholdHigh: +this.getFormValue('thresholdHigh', immForm),
      directionality: this.getFormValue('directionality', immForm),
      thresholdLow: +this.getFormValue('thresholdLow', immForm),
      displayAttributes: {
        description: this.getFormValue('description', immForm),
        suffix: this.getFormValue('suffix', immForm),
        mediumLabel: this.getFormValue('mediumLabel', immForm),
        denominatorLabel: this.getFormValue('denominatorLabel', immForm),
        badColor: this.getFormValue('badColor', immForm),
        goodLabel: this.getFormValue('goodLabel', immForm),
        goodColor: this.getFormValue('goodColor', immForm),
        mediumColor: this.getFormValue('mediumColor', immForm),
        badLabel: this.getFormValue('badLabel', immForm),
        numeratorLabel: this.getFormValue('numeratorLabel', immForm),
        title: this.getFormValue('displayName', immForm),
      },
      metricSequence: +this.getFormValue('displayOrder', immForm),
      multiplier: +this.getFormValue('displayMultiplier', immForm),
      ignoreDenominator: this.getFormValue('ignoreDenominator', immForm),
      category: this.getFormValue('category', immForm),
      drillTargets: this.getFormValue('drillTargets', immForm).get('drillTargets'),
      embeddedDrillDown: this.getFormValue('drillTargets', immForm).get('embeddedDrillDown'),
    };

    this.props.onChange(Imm.fromJS(newMetric), !immForm.get('hasErrors'));
  }

  setFormValue(fieldName, value) {
    const newImmForm = FormValidationUtil.validateForm(
      this.state.immForm.setIn(['fields', fieldName, 'value'], value)
    );
    this.setState({immForm: newImmForm});
    this.changeForm(newImmForm);
  }

  getFormValue(fieldName, immFormOpt) {
    const immForm = immFormOpt ? immFormOpt : this.state.immForm;
    return immForm.getIn(['fields', fieldName, 'value']);
  }

  componentDidUpdate(prevProps) {
    const {immMetric} = this.props;
    if (!Imm.is(immMetric, prevProps.immMetric)) {
      this.setState({
        immForm: this.generateForm(immMetric),
      });
    }
  }

  validatorDenominatorRequred(value, immForm) {
    let result = null;
    if (!this.getFormValue('ignoreDenominator', immForm)) {
      if (!value) {
        result = FrontendConstants.VALIDATION_VALUE_IS_REQUIRED;
      }
    }
    return result;
  }

  validatorDrillTargets(value, immForm, testSize) {
    let result = null;
    const immEmbeddedDrillDownTargets = value.getIn(['embeddedDrillDown', 'targets'], Imm.List());
    const immDrillTargets = value.getIn(['drillTargets'], Imm.List());
    if (!(immEmbeddedDrillDownTargets.size + immDrillTargets.size <= testSize)) {
      result = FrontendConstants.VALIDATION_MAX_NUMBER_SELECTED_ITEMS;
    }
    return result;
  }

  validatorDirectionality(value, immForm, ...acceptableValues) {
    let result = null;
    if (!(value.toString().match(/^-?\d+(\.\d+)?$/) && acceptableValues.includes(parseFloat(value)))) {
      result = FrontendConstants.VALIDATION_VALUE_IS_REQUIRED;
    }
    return result;
  }

  getImmEntitiesFromString(entities) {
    let result = Imm.List();
    if (entities) {
      result = Imm.List(
        entities
          .split('_and_')
          .map(entity => ({value: entity, label: this.entityLabels[entity]}))
      );
    }
    return result;
  }

  toggleButtonChange(fieldName) {
    this.setFormValue(fieldName, !this.getFormValue(fieldName));
  }

  textChange(fieldName, event) {
    this.setFormValue(fieldName, event.currentTarget.value);
  }

  selectEntites(newValues) {
    this.setFormValue('applicableEntities',
      Imm.List(newValues.map(
        entity => ({value: entity, label: this.entityLabels[entity]})
      ))
    );
  }

  getFieldErrorsContent(fieldName) {
    const {immForm} = this.state;
    const {showErrors} = this.props;
    const messages = immForm.getIn(['fields', fieldName, 'messages']);
    let result = null;
    if (showErrors && messages && messages.size) {
      result = messages.map((message) => {
        return (<div className="error-message" key={fieldName + '_' + message}>{message}</div>);
      });
    }
    return result;
  }

  isFieldInvalid(fieldName) {
    const {immForm} = this.state;
    const {showErrors} = this.props;
    const messages = immForm.getIn(['fields', fieldName, 'messages']);
    return (showErrors && messages && messages.size);
  }

  render() {
    const {immMetric, immCategories, canEdit} = this.props;

    return (<div className="web-form">
      <div className="row">
        <div className="col">
          <div className="couple wide">
            <h1>{this.getFormValue('displayName')}</h1>
            <div className="input-group inline">
              <span className="label">{FrontendConstants.ENABLED}</span>
              <ToggleButton
                className="metric-status-toggle-button"
                isActive={this.getFormValue('metricStatus')}
                activeText={FrontendConstants.CHECKMARK}
                onClick={this.toggleButtonChange.bind(this, 'metricStatus')}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div>
            <span className="label">{FrontendConstants.METRIC_ID}: </span>
            <span className="test-automation-metric-id">{immMetric.get('metricId')}</span>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="input-group test-automation-displayName">
            <span className="label">{FrontendConstants.DISPLAY_NAME}</span>
            <input className={cx("text-input",
                {"invalid-input": this.isFieldInvalid('displayName')},
                {'disabled-form-input': !canEdit},
              )}
              type="text" value={this.getFormValue('displayName')}
              onChange={(event) => this.textChange('displayName', event)}
              disabled={!canEdit}
            />
            {this.getFieldErrorsContent('displayName')}
          </div>
        </div>
        <div className="col">
          <div className="input-group test-automation-applicableEntities">
            <span className="label">{FrontendConstants.APPLICABLE_ENTITIES}</span>
            <Combobox
              className={
                cx("entities-dropdown",
                  {"invalid-combobox": this.isFieldInvalid('applicableEntities')}
                  )}
              abbreviationThreshold={2}
              multi={true}
              clearable={true}
              placeholder={FrontendConstants.DROPDOWN_SELECT_PLACEHOLDER}
              value={this.getFormValue('applicableEntities')}
              onChange={this.selectEntites.bind(this)}
              options={this.immEntities}
              disabled={!canEdit}
            />
            {this.getFieldErrorsContent('applicableEntities')}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="input-group test-automation-category">
            <span className="label">{FrontendConstants.CATEGORY}</span>
            <OversightConfigurationCategoryAutocomplete
              value={this.getFormValue('category')}
              onChange={(value) => this.setFormValue('category', value)}
              isInvalid={this.isFieldInvalid('category')}
              immCategories={immCategories}
              canEdit={canEdit}
            />
            {this.getFieldErrorsContent('category')}
          </div>
        </div>
        <div className="col">
          <div className="input-group test-automation-weight">
            <span className="label">{FrontendConstants.WEIGHT}</span>
            <input className={cx("text-input short",
                {"invalid-input": this.isFieldInvalid('weight')},
                {'disabled-form-input': !canEdit},
              )}
              type="number" min="1"
              value={this.getFormValue('weight')}
              onChange={(event) => this.textChange('weight', event)}
              disabled={!canEdit}
            />
            {this.getFieldErrorsContent('weight')}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="input-group test-automation-description">
            <span className="label">{FrontendConstants.DESCRIPTION}</span>
            <textarea className={cx("text-input",
                {"invalid-input": this.isFieldInvalid('description')},
                {'disabled-form-input': !canEdit},
              )}
              value={this.getFormValue('description')}
              onChange={(event) => this.textChange('description', event)}
              disabled={!canEdit}
            />
            {this.getFieldErrorsContent('description')}
          </div>
        </div>
        <div className="col">
          <div className="row">
            <div className="col input-group test-automation-directionality">
              <span className="label">{FrontendConstants.DIRECTIONALITY}</span>
              <Combobox className={
                cx("oversight-scorecard-dropdown-scorecard", "ribbon-filter-dropdown",
                  'oversight-config-dropdown',
                  {"invalid-combobox": this.isFieldInvalid('directionality')}
                )}
                placeholder=''
                value={this.getFormValue('directionality')}
                onChange={(value) => this.setFormValue('directionality', value)}
                options={this.immDirectionalities}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('directionality')}
            </div>
          </div>
          <div className="couple">
            <div className="input-group test-automation-thresholdLow">
              <span className="label">{FrontendConstants.LOW_THRESHOLD}</span>
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('thresholdLow')},
                  {'disabled-form-input': !canEdit},
                )}
                type="number" step="0.01"
                value={this.getFormValue('thresholdLow')}
                onChange={(event) => this.textChange('thresholdLow', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('thresholdLow')}
            </div>
            <div className="input-group test-automation-thresholdHigh">
              <span className="label">{FrontendConstants.HIGH_THRESHOLD}</span>
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('thresholdHigh')},
                  {'disabled-form-input': !canEdit}
                )}
                type="number" step="0.01"
                value={this.getFormValue('thresholdHigh')}
                onChange={(event) => this.textChange('thresholdHigh', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('thresholdHigh')}
            </div>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="row">
            <div className="col couple">
              <div className="input-group test-automation-numeratorLabel">
                <span className="label">{FrontendConstants.NUMERATOR_LABEL}</span>
                <input className={cx("text-input short",
                    {"invalid-input": this.isFieldInvalid('numeratorLabel')},
                    {'disabled-form-input': !canEdit},
                  )}
                  type="text"
                  value={this.getFormValue('numeratorLabel')}
                  onChange={(event) => this.textChange('numeratorLabel', event)}
                  disabled={!canEdit}
                />
                {this.getFieldErrorsContent('numeratorLabel')}
              </div>
              <div className="input-group test-automation-denominatorLabel">
                <span className="label">{FrontendConstants.DENOMINATOR_LABEL}</span>
                <input className={cx("text-input short",
                    {"invalid-input": this.isFieldInvalid('denominatorLabel')},
                    {'disabled-form-input': !canEdit},
                  )}
                  type="text"
                  value={this.getFormValue('denominatorLabel')}
                  onChange={(event) => this.textChange('denominatorLabel', event)}
                  disabled={!canEdit}
                />
                {this.getFieldErrorsContent('denominatorLabel')}
              </div>
            </div>
          </div>
          <div>
            <div className="input-group inline">
              <span className="label">{FrontendConstants.IGNORE_DENOMINATOR}</span>
              <ToggleButton
                className='ignore-denominator-toggle-button'
                isActive={this.getFormValue('ignoreDenominator')}
                activeText={FrontendConstants.CHECKMARK}
                onClick={this.toggleButtonChange.bind(this, 'ignoreDenominator')}
                disabled={!canEdit}
              />
            </div>
          </div>
        </div>
        <div className="col">
          <div className="input-group test-automation-drillTargets">
            <span className="label">{FrontendConstants.DRILL_TARGETS}</span>
            <OversightConfigurationDrillDownSelect
              className={
                cx({"invalid-combobox": this.isFieldInvalid('drillTargets')})
              }
              value={this.getFormValue('drillTargets')}
              onChange={(value) => this.setFormValue('drillTargets', value)}
              disabled={!canEdit}
            />
            {this.getFieldErrorsContent('drillTargets')}
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="row">
            <div className="col input-group test-automation-suffix">
              <span className="label">{FrontendConstants.SUFFIX}</span>
              <input className={cx("text-input",
                  {"invalid-input": this.isFieldInvalid('suffix')},
                  {'disabled-form-input': !canEdit},
                )}
                type="text" value={this.getFormValue('suffix')}
                onChange={(event) => this.textChange('suffix', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('suffix')}
            </div>
          </div>
          <div className="couple">
            <div className="input-group test-automation-displayMultiplier">
              <span className="label">{FrontendConstants.DISPLAY_MULTIPLIER}</span>
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('displayMultiplier')},
                  {'disabled-form-input': !canEdit},
                )}
                type="number" step="0.01"
                value={this.getFormValue('displayMultiplier')}
                onChange={(event) => this.textChange('displayMultiplier', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('displayMultiplier')}
            </div>
            <div className="input-group test-automation-displayOrder">
              <span className="label">{FrontendConstants.DISPLAY_ORDER}</span>
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('displayOrder')},
                  {'disabled-form-input': !canEdit},
                )}
                type="number" min="0"
                value={this.getFormValue('displayOrder')}
                onChange={(event) => this.textChange('displayOrder', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('displayOrder')}
            </div>
          </div>
        </div>
        <div className="col">
          <span className="label">{FrontendConstants.SCORE_DISPLAY_SETTINGS}</span>
          <div className="row couple test-automation-badLabel">
            <div className="input-group">
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('badLabel')},
                  {'disabled-form-input': !canEdit},
                )}
                type="text" value={this.getFormValue('badLabel')}
                onChange={(event) => this.textChange('badLabel', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('badLabel')}
            </div>
            <div className="input-group">
              <OversightConfigurationColorPicker color={this.getFormValue('badColor')}
                onChange={(value) => this.setFormValue('badColor', value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="row couple test-automation-mediumLabel" >
            <div className="input-group">
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('mediumLabel')},
                  {'disabled-form-input': !canEdit},
                )}
                type="text"
                value={this.getFormValue('mediumLabel')}
                onChange={(event) => this.textChange('mediumLabel', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('mediumLabel')}
            </div>
            <div className="input-group">
              <OversightConfigurationColorPicker color={this.getFormValue('mediumColor')}
                 onChange={(value) => this.setFormValue('mediumColor', value)}
                 disabled={!canEdit}
              />
            </div>
          </div>
          <div className="row couple test-automation-goodLabel">
            <div className="input-group">
              <input className={cx("text-input short",
                  {"invalid-input": this.isFieldInvalid('goodLabel')},
                  {'disabled-form-input': !canEdit},
                )}
                type="text" value={this.getFormValue('goodLabel')}
                onChange={(event) => this.textChange('goodLabel', event)}
                disabled={!canEdit}
              />
              {this.getFieldErrorsContent('goodLabel')}
            </div>
            <div className="input-group">
              <OversightConfigurationColorPicker color={this.getFormValue('goodColor')}
                 onChange={(value) => this.setFormValue('goodColor', value)}
                 disabled={!canEdit}
              />
            </div>
          </div>
        </div>
      </div>
    </div>);
  }
}

module.exports = OversightConfigurationWebForm;
