var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';

var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var DataTypeConstants = require('../constants/DataTypeConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var KeyCodeConstants = require('../constants/KeyCodeConstants');
var Util = require('../util/util');

var div = React.createFactory(require('./TouchComponents').TouchDiv);

/*
 * Slider.js is adapted from https://github.com/seatgeek/react-slider
 */
class Slider extends React.Component {
  static displayName = 'Slider';

  static propTypes = {
    lowerBound: PropTypes.number.isRequired,
    maxUpperBound: PropTypes.number.isRequired,
    minLowerBound: PropTypes.number.isRequired,
    upperBound: PropTypes.number.isRequired,
    disabled: PropTypes.bool,
    inverseScalingFunction: PropTypes.func,
    onlyUpdateOnRelease: PropTypes.bool,
    onSliderUpdate: PropTypes.func,
    scalingFunction: PropTypes.func,
    valueType: PropTypes.oneOf([
      DataTypeConstants.DECIMAL,
      DataTypeConstants.INTEGER
    ])
  };

  static defaultProps = {
    scalingFunction: function(x, constantBase) {
      return x / constantBase;
      // Another example of a scaling function is `return Math.pow(x, 2) / Math.pow(constantBase, 2);`
    },
    inverseScalingFunction: function(x, constantBase) {
      return x / constantBase;
      // Another example of an inverse scaling function is `return Math.sqrt(x) / Math.sqrt(constantBase);`
    },
    onSliderUpdate: _.noop,
    valueType: DataTypeConstants.INTEGER
  };

  constructor(props) {
    super(props);
    var lowerBound = props.lowerBound;
    var upperBound = props.upperBound;

    this.state = {
      lower: 0,
      upper: 0,
      lowerBound: lowerBound,
      upperBound: upperBound,
      lowerBoundInput: lowerBound,
      upperBoundInput: upperBound,
      lastLowerBound: lowerBound,
      lastUpperBound: upperBound,
      storedValue: 0,
      lowerActive: false,
      upperActive: false
    };
  }

  componentDidMount() {
    document.addEventListener('mouseup', this.sliderUpdater);
    document.addEventListener('touchend', this.sliderUpdater);
    window.addEventListener('resize', this.repositionPointers);
    this.repositionPointers();
  }

  componentWillReceiveProps(nextProps) {
    var stateObject = {};
    if (this.props.lowerBound !== nextProps.lowerBound || this.props.upperBound !== nextProps.upperBound) {
      stateObject.lowerBound = nextProps.lowerBound;
      stateObject.upperBound = nextProps.upperBound;
      stateObject.lowerBoundInput = nextProps.lowerBound;
      stateObject.upperBoundInput = nextProps.upperBound;
      stateObject.lastLowerBound = nextProps.lowerBound;
      stateObject.lastUpperBound = nextProps.upperBound;
    }
    if (!_.isEmpty(stateObject)) {
      this.repositionPointers(stateObject, nextProps);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.sliderUpdater);
    document.removeEventListener('touchend', this.sliderUpdater);
    window.removeEventListener('resize', this.repositionPointers);
  }

  getOtherDirection = (thisDirection) => {
    return thisDirection === 'upper' ? 'lower' : 'upper';
  };

  sliderUpdater = () => {
    if (this.props.onlyUpdateOnRelease && (this.state.lowerActive || this.state.upperActive)) {
      this.onSliderUpdate();
    }
    this.setState({
      lowerActive: false,
      upperActive: false
    });
    document.removeEventListener('mousemove', this.mouseMoveHelper);
    document.removeEventListener('touchmove', this.mouseMoveHelper);
  };

  getSliderWidth = () => {
    return $(ReactDOM.findDOMNode(this.refs['fullSlider'])).width();
  };

  moveConditionsMet = (state) => {
    var sliderWidth = this.getSliderWidth();
    var leftWithinBounds = state.lower >= 0 && state.lower < sliderWidth;
    var rightWithinBounds = state.upper >= 0 && state.upper < sliderWidth;
    var leftNotCrossing = state.lower <= sliderWidth - state.upper;
    var rightNotCrossing = sliderWidth - state.upper >= state.lower;
    return leftWithinBounds && rightWithinBounds && leftNotCrossing && rightNotCrossing;
  };

  repositionPointers = (state, props, inputSide) => {
    var sliderWidth = this.getSliderWidth();
    state = _.chain(this.state).clone().extend(state).value();
    props = props || this.props;
    if (props.disabled) {
      // Set the slider handles at the ends if the slider is disabled.
      state.lower = 0;
      state.upper = 0;
    } else {
      // Adjust the lowerBound and upperBound values so they are in-bounds. If we don't do this,
      // the slider handles will render past the ends of the slider bar.
      var lowerBound = _.max([state.lowerBound, props.minLowerBound]);
      var upperBound = _.min([state.upperBound, props.maxUpperBound]);
      var valueRange = props.maxUpperBound - props.minLowerBound;
      state.lower = Math.floor(props.inverseScalingFunction(lowerBound - props.minLowerBound, valueRange) * sliderWidth);
      state.upper = sliderWidth - (props.inverseScalingFunction(upperBound - props.minLowerBound, valueRange) * sliderWidth);
    }
    this.setState(state, _.isUndefined(inputSide) ? null : this.onSliderUpdate.bind(null, inputSide));
  };

  buildNextState = (updateDirection, updateLocation) => {
    var sliderWidth = this.getSliderWidth();
    updateLocation = _.max([0, updateLocation]);
    var nextState = _.clone(this.state),
        otherDirection = this.getOtherDirection(updateDirection),
        absoluteLocation = updateDirection === 'lower' ? updateLocation : sliderWidth - updateLocation;

    var rawBound = this.props.scalingFunction(absoluteLocation, sliderWidth) * (this.props.maxUpperBound - this.props.minLowerBound) + this.props.minLowerBound;
    var roundedBound = this.props.valueType === DataTypeConstants.DECIMAL ? Util.round(rawBound, 2) : Math.ceil(rawBound);
    // Make sure the rounded result is not out of bounds.
    nextState[updateDirection + 'Bound'] = updateDirection === 'lower' ? _.max([this.props.minLowerBound, roundedBound]) : _.min([this.props.maxUpperBound, roundedBound]);

    nextState[updateDirection] = updateLocation;
    nextState[updateDirection + 'BoundInput'] = nextState[updateDirection + 'Bound'];
    nextState[otherDirection + 'BoundInput'] = nextState[otherDirection + 'Bound'];
    return nextState;
  };

  handleFocus = (side) => {
    var stateObject = {};
    stateObject[side + 'BoundInput'] = '';
    stateObject.storedValue = this.state[side + 'BoundInput'];
    this.setState(stateObject);
  };

  handleChange = (side, e) => {
    var stateObject = {},
        inputValue = e.target.value;

    // Allow empty string, `-` alone, integers and floats.
    if (!/^(-?(\d+\.?(\d+)?)?)?$/.test(inputValue)) {
      return;
    }
    stateObject[side + 'BoundInput'] = inputValue;
    this.setState(stateObject);
  };

  handleKeyDown = (side, e) => {
    if (e.keyCode === KeyCodeConstants.ENTER) {
      this.handleInputUpdate(side);
    }
  };

  handleInputUpdate = (side, fromBlur) => {
    var inputValue = this.state[side + 'BoundInput'],
        parsedInputValue = Util.valueParser(inputValue, this.props.valueType),
        stateObject = {};
    if (parsedInputValue >= this.props.minLowerBound && parsedInputValue <= this.props.maxUpperBound) {
      var otherSide = this.getOtherDirection(side),
          otherBound = otherSide + 'Bound';
      stateObject[side + 'Bound'] = parsedInputValue;
      if (side === 'lower' && parsedInputValue > this.state.upperBound || side === 'upper' && parsedInputValue < this.state.lowerBound) {
        stateObject[otherBound] = parsedInputValue;
      }
      this.repositionPointers(stateObject, null, side);
    } else if (fromBlur) {
      stateObject[side + 'BoundInput'] = this.state.storedValue;
      this.setState(stateObject);
    }
  };

  handleMouseMove = (side, initialX, originalPosition, e) => {
    e.preventDefault();
    // We determine position from a touch event, if it exists (i.e. `e.touches` is not
    // undefined), otherwise we use the mouse position.
    var newX = (e.touches ? e.touches[0] : e).clientX;

    var scaling = side === 'lower' ? 1 : -1;
    var nextState = this.buildNextState(side, originalPosition + scaling * (newX - initialX));
    if (this.moveConditionsMet(nextState)) {
      this.setState(nextState, this.props.onlyUpdateOnRelease ? null : this.onSliderUpdate);
    }
  };

  handleMouseDown = (side, e) => {
    // We determine position from a touch event, if it exists (i.e. `e.touches` is not
    // undefined), otherwise we use the mouse position.
    var initialX = (e.touches ? e.touches[0] : e).clientX,
        originalPosition = this.state[side],
        stateObject = {};

    this.mouseMoveHelper = this.handleMouseMove.bind(null, side, initialX, originalPosition);

    document.addEventListener('mousemove', this.mouseMoveHelper);
    document.addEventListener('touchmove', this.mouseMoveHelper);

    stateObject[side + 'Active'] = true;  // Set active state on mousedown.
    this.setState(stateObject);
  };

  onSliderUpdate = (inputSide) => {
    if (this.state.lowerBound !== this.state.lastLowerBound || this.state.upperBound !== this.state.lastUpperBound) {
      this.setState({
        lastLowerBound: this.state.lowerBound,
        lastUpperBound: this.state.upperBound,
        storedValue : _.isUndefined(inputSide) ? null : this.state[inputSide + 'Bound']
      }, function() {
        this.props.onSliderUpdate({
          lowerBound: this.state.lowerBound,
          upperBound: this.state.upperBound
        });
      }.bind(this));
    }
  };

  render() {
    var disabled = this.props.disabled;
    var boundsUndefined = _.isNaN(this.props.lowerBound) || _.isNaN(this.props.upperBound);
    var handleLowerSliderKnob = disabled ? _.noop : this.handleMouseDown.bind(null, 'lower');
    var handleUpperSliderKnob = disabled ? _.noop : this.handleMouseDown.bind(null, 'upper');

    return div({className: cx('slider-container', 'clearfix')},
      div({className: 'input-bound-container'},
        div({className: cx('lower-bound', {disabled: disabled})},
          InputWithPlaceholder({
            disabled: disabled,
            type: 'text',
            className: 'lower-input',
            onFocus: this.handleFocus.bind(null, 'lower'),
            onBlur: this.handleInputUpdate.bind(null, 'lower', true),
            onChange: this.handleChange.bind(null, 'lower'),
            onKeyDown: this.handleKeyDown.bind(null, 'lower'),
            value: disabled && boundsUndefined ? FrontendConstants.EM_DASH : this.state.lowerBoundInput,
            placeholder: this.state.lowerBound})
        )
      ),
      div({className: cx('slider-control-container', 'clearfix')},
        div({className: 'full-slider', ref: 'fullSlider'},
          div({className: cx('slider', {disabled: disabled}),
               style: {left: this.state.lower, right: this.state.upper}})
        ),
        div({className: 'clearfix'},
          div({className: cx('lower', {active: this.state.lowerActive}),
               style: {left: this.state.lower},
               onTouchStart: handleLowerSliderKnob,
               onMouseDown: handleLowerSliderKnob}
          ),
          div({className: cx('upper', {active: this.state.upperActive}),
               style: {right: this.state.upper},
               onTouchStart: handleUpperSliderKnob,
               onMouseDown: handleUpperSliderKnob}
          )
        )
      ),
      div({className: 'input-bound-container'},
        div({className: cx('upper-bound', {disabled: disabled})},
          InputWithPlaceholder({
            disabled: disabled,
            type: 'text',
            className: 'upper-input',
            onFocus: this.handleFocus.bind(null, 'upper'),
            onBlur: this.handleInputUpdate.bind(null, 'upper', true),
            onChange: this.handleChange.bind(null, 'upper'),
            onKeyDown: this.handleKeyDown.bind(null, 'upper'),
            value: disabled && boundsUndefined ? FrontendConstants.EM_DASH : this.state.upperBoundInput,
            placeholder: this.state.upperBound})
        )
      )
    );
  }
}

module.exports = Slider;
