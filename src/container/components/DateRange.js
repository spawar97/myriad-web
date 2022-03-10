var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Moment = require('moment');
var $ = require('jquery');
var ReactDOM = require('react-dom');

var Calendar = React.createFactory(require('./Calendar'));
var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var FrontendConstants = require('../constants/FrontendConstants');
var Util = require('../util/util');
import DOM from 'react-dom-factories';
var div = DOM.div;
var span = DOM.span;

import PropTypes from 'prop-types';


var LOWER_INPUT = 'lower';
var UPPER_INPUT = 'upper';

class DateRange extends React.Component {
  static displayName = 'DateRange';

  static propTypes = {
    lowerBound: PropTypes.number,
    maxUpperBound: PropTypes.number.isRequired,
    minLowerBound: PropTypes.number.isRequired,
    upperBound: PropTypes.number,
    lowDisabled: PropTypes.bool,
    upDisabled: PropTypes.bool,
    onRangeUpdate: PropTypes.func,
    skipLowInitialDate: PropTypes.bool,
    skipUpInitialDate: PropTypes.bool,
    closeOnSelect: PropTypes.bool,
    lowerPlaceHolder: PropTypes.string,
    upperPlaceHolder: PropTypes.string,
    lowerIsNotRequired: PropTypes.bool,
    upperIsNotRequired: PropTypes.bool
  };

  static defaultProps = {
    onRangeUpdate: _.noop,
    closeOnSelect: true
  };

  state = {
    lowerBoundError: null,
    upperBoundError: null
  };

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.handleReactDateTimeAlignment();  // Need to handle the react-datetime alignment to ensure the upper calendar isn't cut off
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    // We only need to update the react-datetime offset if we're on desktop
    if(Util.isDesktop()) {
      this.handleReactDateTimeAlignment();
    }
  };

  handleReactDateTimeAlignment = () => {
    let dateRangeElement = $(ReactDOM.findDOMNode(this));   // This element
    let upperDateInput = dateRangeElement.find($('.upper-date-input'));  // The input box for the upper date
    let upperDateCalendarElement = upperDateInput.find($('.rdtPicker')); // The calendar popup for the upper date

    // If the upper date input box overflows, we need to make it align left again so it's not cut off on the left side
    // We can do this by checking if the height of this element is > the height of 2 input boxes stacked on top of each
    // other (with padding)
    if((dateRangeElement && upperDateInput && upperDateCalendarElement) &&
        (dateRangeElement[0].clientHeight < upperDateInput[0].clientHeight * 2)) {
      upperDateCalendarElement.addClass('rdt-picker-right-align');
    }
    else {
      upperDateCalendarElement.removeClass('rdt-picker-right-align');
    }
  };

  getStartOfDay = (moment) => {
    var startOfDay = moment.startOf('day');
    return {
      moment: startOfDay,
      timestamp: startOfDay.valueOf().toString()
    };
  };

  getEndOfDay = (moment) => {
    var endOfDay = moment.endOf('day');
    return {
      moment: endOfDay,
      timestamp: endOfDay.valueOf().toString()
    };
  };

  momentOutOfBounds = (moment) => {
    var minLowerBound = Moment(this.props.minLowerBound).utc().startOf('day');
    var maxUpperBound = Moment(this.props.maxUpperBound).utc().endOf('day');
    return moment.utc().isBefore(minLowerBound) || moment.utc().isAfter(maxUpperBound);
  };

  isNotRequiredAndEmpty = (inputSide, value) => {
    const isNotRequired = !!this.props[inputSide + 'IsNotRequired'];
    return isNotRequired && _.isEmpty(value)
  };

  onBlur = (inputSide, value) => {
    var moment = Moment(value);
    if (!this.isNotRequiredAndEmpty(inputSide, value) &&
      !(moment._i instanceof Date) && !Moment(moment._i, Util.dateFormat, true).isValid()) {
      // If the user clicks away when the date is not valid, display an error message.
      var newState = {};
      newState[inputSide + 'BoundError'] = FrontendConstants.PLEASE_ENTER_VALID_DATE;
      this.setState(newState);
    }
  };

  onRangeUpdate = (inputSide, value) => {
    var otherSide = inputSide === LOWER_INPUT ? UPPER_INPUT : LOWER_INPUT;
    var moment = Moment(value).utc();
    var newState = {};
    const otherSideIsNotRequired = !!this.props[otherSide + 'IsNotRequired'];
    let isValid = true;

    if (!this.isNotRequiredAndEmpty(inputSide, value)) {
      if (!moment.isValid()) {
        newState[inputSide + 'BoundError'] = FrontendConstants.PLEASE_ENTER_VALID_DATE;
        this.setState(newState);
        isValid = false;
      } else if (!(moment._i instanceof Date) && !Moment(moment._i, Util.dateFormat, true).isValid()) {
        // Adding strict date validation to ensure we don't update date range when the user is still typing.
        isValid = false;
        return;
      } else if (this.momentOutOfBounds(moment)) {
        newState[inputSide + 'BoundError'] =
          FrontendConstants.DATE_OUT_OF_BOUNDS(Util.dateFormatterUTC(this.props.minLowerBound), Util.dateFormatterUTC(this.props.maxUpperBound));
        this.setState(newState);
        isValid = false;
      }
    }
    if (isValid) {
      newState[inputSide + 'BoundError'] = null;

      var otherMoment = Moment(this.props[otherSide + 'Bound']).utc();
      var otherSideValid = _.isNull(this.state[otherSide + 'BoundError']);

      var lowerBound, upperBound, bounds;
      switch (inputSide) {
        case LOWER_INPUT:
          lowerBound = this.getStartOfDay(moment);
          upperBound = this.getEndOfDay(otherMoment);
          if (otherSideValid && lowerBound.moment.isAfter(upperBound.moment)) {
            // If the lower bound is set to after the current upper bound, set the upper bound to the end
            // of the same day as the new lower bound.
            bounds = {lowerBound: lowerBound.timestamp, upperBound: this.getEndOfDay(moment).timestamp};
          } else {
            bounds = {lowerBound: lowerBound.timestamp, upperBound: upperBound.timestamp};
          }
          break;
        case UPPER_INPUT:
          lowerBound = this.getStartOfDay(otherMoment);
          upperBound = this.getEndOfDay(moment);
          if (otherSideValid && upperBound.moment.isBefore(lowerBound.moment)) {
            // If the upper bound is set to before the current lower bound, set the lower bound to the start
            // of the same day as the new upper bound.
            bounds = {lowerBound: this.getStartOfDay(moment).timestamp, upperBound: upperBound.timestamp};
          } else {
            bounds = {lowerBound: lowerBound.timestamp, upperBound: upperBound.timestamp};
          }
          break;
      }

      this.setState(newState, otherSideValid || otherSideIsNotRequired ? this.props.onRangeUpdate.bind(null, bounds) : null);
    }
  };

  render() {
    return (
      div({className: 'date-range'},
        InputBlockContainer({
          inputComponent: Calendar({
            className: cx('text-input', {'invalid-input': !_.isNull(this.state.lowerBoundError)}),
            innerKey: 'lower-input',
            onChange: this.onRangeUpdate.bind(null, LOWER_INPUT),
            valueDate: this.props.lowerBound,
            maxDate: this.props.maxUpperBound,
            minDate: this.props.minLowerBound,
            onBlur: this.onBlur.bind(null, LOWER_INPUT),
            readOnly: this.props.lowDisabled,
            skipInitialDate: this.props.skipLowInitialDate,
            closeOnSelect: this.props.closeOnSelect,
            placeholder: this.props.lowerPlaceHolder
          }),
          class: 'lower-input',
          errorMsg: this.state.lowerBoundError
        }),
        span({className: 'to'}, FrontendConstants.TO),
        InputBlockContainer({
          inputComponent: Calendar({
            className: cx('text-input', {'invalid-input': !_.isNull(this.state.upperBoundError)}),
            innerKey: 'upper-input',
            onChange: this.onRangeUpdate.bind(null, UPPER_INPUT),
            valueDate: this.props.upperBound,
            maxDate: this.props.maxUpperBound,
            minDate: this.props.minLowerBound,
            onBlur: this.onBlur.bind(null, UPPER_INPUT),
            readOnly: this.props.upDisabled,
            skipInitialDate: this.props.skipUpInitialDate,
            closeOnSelect: this.props.closeOnSelect,
            placeholder: this.props.upperPlaceHolder
          }),
          class: cx('upper-input', 'upper-date-input'),
          errorMsg: this.state.upperBoundError
        }))
    );
  }
}

module.exports = DateRange;
