import React from 'react';
import PropTypes from 'prop-types';
import { SketchPicker } from 'react-color';

class OversightConfigurationColorPicker extends React.PureComponent {

  static propTypes = {
    color: PropTypes.string.isRequired,
    onChange: PropTypes.func,
    disabled: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      isOpened: false,
    };
  }

  toggleColorPicker() {
    this.setState({isOpened: !this.state.isOpened});
  }

  changeColor(value) {
    this.props.onChange(value.hex);
  }

  render() {
    const {color, disabled} = this.props;
    const {isOpened} = this.state;

    const colorStyle = {
      backgroundColor: color,
    };

    let colorPickerContent = null;
    if (isOpened) {
      colorPickerContent = (<div className="color-picker">
        <div className="backdrop" onClick={this.toggleColorPicker.bind(this)}></div>
        <SketchPicker
          color={color}
          onChange={this.changeColor.bind(this)}
        />
      </div>);
    }

    return (<div>
      <div className="color-rectangle"
           style={colorStyle}
           onClick={!disabled && this.toggleColorPicker.bind(this)}>
      </div>
      {colorPickerContent}
    </div>);
  }
}

module.exports = OversightConfigurationColorPicker;
