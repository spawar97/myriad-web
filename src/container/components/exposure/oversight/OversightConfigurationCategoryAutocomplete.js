import React from 'react';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import Autosuggest from 'react-autosuggest';
import cx from 'classnames';

class OversightConfigurationCategoryAutocomplete extends React.PureComponent {

  static propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    isInvalid: PropTypes.bool,
    immCategories: PropTypes.instanceOf(Imm.List),
    canEdit: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      suggestions: props.immCategories.toJS(),
    };


    this.OnSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this);
    this.OnSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this);
    this.ShouldRenderSuggestions = this.shouldRenderSuggestions.bind(this);
  }

  getSuggestionValue(value) {
    return value;
  }

  renderSuggestion(value) {
    return (
      <div>
        {value}
      </div>
    );
  }

  onSuggestionsFetchRequested({ value }) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;
    let suggestions =  this.props.immCategories.toJS();
    if (inputLength) {
      suggestions = suggestions
        .filter(
          suggestion => suggestion.trim().toLowerCase().includes(inputValue)
        );
    }
    this.setState({suggestions});
  }

  onSuggestionsClearRequested() {
    this.setState({suggestions: []});
  }

  onValueChange(event, { newValue }) {
    this.props.onChange(newValue);
  }

  shouldRenderSuggestions(value) {
    return true;
  }

  render() {
    const {value, onChange, isInvalid, canEdit} = this.props;
    const {suggestions} = this.state;
    const inputProps = {
      className: cx("text-input", {"invalid-input": isInvalid}),
      value,
      onChange: this.onValueChange.bind(this),
    };

    const content = canEdit
      ? (
        <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={this.OnSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.OnSuggestionsClearRequested}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={this.renderSuggestion}
          shouldRenderSuggestions={this.ShouldRenderSuggestions}
          inputProps={inputProps}
        />
      )
      : (
        <input className={cx('text-input', 'disabled-form-input')}
               disabled={true}
               value={value}
        />
      );

    return content;

  }
}

module.exports = OversightConfigurationCategoryAutocomplete;
