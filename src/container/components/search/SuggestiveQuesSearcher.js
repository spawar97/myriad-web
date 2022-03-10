import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';

const menuRenderer = ({
                        focusedOption,
                        focusOption,
                        inputValue,
                        instancePrefix,
                        onFocus,
                        onOptionRef,
                        onSelect,
                        optionClassName,
                        optionComponent,
                        optionRenderer,
                        options,
                        removeValue,
                        selectValue,
                        valueArray,
                        valueKey
                      }, SuggestiveQuesComponent) => {
  let Option = optionComponent;
  //Rendering custom component at first to show the suggestions for questions and
  // after that rendering rest of the options in default react-select layout
  return <React.Fragment>
    {SuggestiveQuesComponent ? SuggestiveQuesComponent
      : null}
    {options.map((option, i) => {
      let isSelected = valueArray && valueArray.some(x => x[valueKey] === option[valueKey]);
      let isFocused = option === focusedOption;
      let optionClass = classNames(optionClassName, {
        'Select-option': true,
        'is-selected': isSelected,
        'is-focused': isFocused,
        'is-disabled': option.disabled,
      });
      return (
        <Option
          className={optionClass}
          focusOption={focusOption}
          inputValue={inputValue}
          instancePrefix={instancePrefix}
          isDisabled={option.disabled}
          isFocused={isFocused}
          isSelected={isSelected}
          key={`option-${i}-${option[valueKey]}`}
          onFocus={onFocus}
          onSelect={onSelect}
          option={option}
          optionIndex={i}
          ref={ref => {
            onOptionRef(ref, isFocused);
          }}
          removeValue={removeValue}
          selectValue={selectValue}>
          {optionRenderer(option, i, inputValue)}
        </Option>
      );
    })}
  </React.Fragment>
};
menuRenderer.PropTypes = {
  focusOption: PropTypes.func,
  focusedOption: PropTypes.object,
  inputValue: PropTypes.string,
  instancePrefix: PropTypes.string,
  onFocus: PropTypes.func,
  onOptionRef: PropTypes.func,
  onSelect: PropTypes.func,
  optionClassName: PropTypes.string,
  optionComponent: PropTypes.func,
  optionRenderer: PropTypes.func,
  options: PropTypes.array,
  removeValue: PropTypes.func,
  selectValue: PropTypes.func,
  valueArray: PropTypes.array,
  valueKey: PropTypes.string,
};

export default menuRenderer;

