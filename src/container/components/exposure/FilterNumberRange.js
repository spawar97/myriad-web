import React from 'react';
import PropTypes from 'prop-types';
import FrontendConstants from "../../constants/FrontendConstants";

const INPUT_DELAY = 1500;

class FilterNumberRange extends React.PureComponent {

  static propTypes = {
    top: PropTypes.number.isRequired,
    bottom: PropTypes.number.isRequired,
    range: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      from: props.range[0],
      to: props.range[1],
      inputFrom: props.range[0],
      inputTo: props.range[1],
    };
  }

  componentDidUpdate(prevProps) {
    const {range} = this.props;
    const {range: rangePrev} = prevProps;
    if (range[0] !== rangePrev[0] || range[1] !== rangePrev[1]) {
      this.setState({
        from: range[0],
        to: range[1],
        inputFrom: range[0],
        inputTo: range[1],
      });
    }
  }

  checkFromValue(value) {
    const {to} = this.state;
    const {bottom} = this.props;
    let result = true;
    if (!isNaN(value)) {
      const floatValue = parseFloat(value);
      if (floatValue > to || floatValue < bottom) {
        result = false;
      }
    } else {
      result = false;
    }
    return result;
  }

  onFromChange = (event) => {
    const newValue = event.currentTarget.value;
    const {to} = this.state;
    const {bottom} = this.props;
    this.setState({inputFrom: newValue});
    setTimeout(() => {
      const {inputFrom, from} = this.state;
      if (this.checkFromValue(newValue)) {
        if (newValue === inputFrom) {
          let newFloatValue = parseFloat(newValue);
          if (isNaN(newFloatValue)) {
            newFloatValue = bottom;
          }
          this.setState({
            from: newFloatValue,
            inputFrom: newFloatValue,
          });
          this.props.onChange([newFloatValue, to]);
        }
      } else if (newValue === inputFrom) {
        this.setState({inputFrom: from});
      }
    }, INPUT_DELAY);
  };

  checkToValue(value) {
    const {from} = this.state;
    const {top} = this.props;
    let result = true;
    if (!isNaN(value)) {
      const floatValue = parseFloat(value);
      if (floatValue < from || floatValue > top) {
        result = false;
      }
    } else {
      result = false;
    }
    return result;
  }

  onToChange = (event) => {
    const newValue = event.currentTarget.value;
    const {from} = this.state;
    const {top} = this.props;
    this.setState({inputTo: newValue});
    setTimeout(() => {
      const {inputTo, to} = this.state;
      if (this.checkToValue(newValue)) {
        if (newValue === inputTo) {
          let newFloatValue = parseFloat(newValue);
          if (isNaN(newFloatValue)) {
            newFloatValue = top;
          }
          this.setState({
            to: newFloatValue,
            inputTo: newFloatValue,
          });
          this.props.onChange([from, newFloatValue]);
        }
      } else if (newValue === inputTo) {
        this.setState({inputTo: to});
      }
    }, INPUT_DELAY);
  };

  render() {
    const {inputFrom, inputTo} = this.state;
    return (<div className="filter-element range">
      <input className="text-input" type="number" step="0.01" value={inputFrom}
             placeholder={FrontendConstants.FROM} onChange={this.onFromChange}/>
      <input className="text-input" type="number" step="0.01" value={inputTo}
             placeholder={FrontendConstants.TO_CAPITALIZED} onChange={this.onToChange}/>
    </div>);
  }
}

module.exports = FilterNumberRange;
