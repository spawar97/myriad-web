var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
var Moment = require('moment');
var DateTime = React.createFactory(require('react-datetime/DateTime'));

var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var MediaQueryWrapper = React.createFactory(require('./MediaQueryWrapper'));
var FrontendConstants = require('../constants/FrontendConstants');
var Util = require('../util/util');
import PropTypes from 'prop-types';

class Calendar extends React.Component {
  static displayName = 'Calendar';

  static propTypes = {
    className: PropTypes.string.isRequired,
    innerKey: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    valueDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    maxDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    minDate: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]),
    onBlur: PropTypes.func,
    placeholder: PropTypes.string,
    readOnly: PropTypes.bool,
    skipInitialDate: PropTypes.bool,
    closeOnSelect: PropTypes.bool
  };

  static defaultProps = {
    onBlur: _.noop,
    closeOnSelect: true
  };

  // `d` is either a SyntheticEvent or a Moment object. The latter can be passed
  // straight through, but the former needs to only pass along the date string
  // value.
  getRelevantValue = (d) => {
   const date = _.has(d, 'target') ? Moment(d.target.value) : d;
   return (typeof date === 'object') ? Moment.utc(Moment(date).format(Util.dateFormat)): date;   // convert local time to UTC for selected date
  };

  handleBlur = (d) => {
    this.props.onBlur(this.getRelevantValue(d));
  };

  handleChange = (d) => {
    this.props.onChange(this.getRelevantValue(d));
  };

  // When the minDate is defined, it is not after the current time.  Similarly, when the maxDate is defined, it is not before the current time.
  isValidDate = (current) => {
    return !((this.props.minDate && Moment(parseInt(this.props.minDate, 10)).utc().startOf('day').isAfter(current)) ||
      (this.props.maxDate && Moment(parseInt(this.props.maxDate, 10)).utc().endOf('day').isBefore(current)));
  };

  render() {
    var sharedProps = {
      key: this.props.innerKey
    };

    var phoneRangeProps = {};
    if (this.props.minDate) {
      phoneRangeProps.min = Util.dateFormatterUTC(this.props.minDate);
    }
    if (this.props.maxDate) {
      phoneRangeProps.max = Util.dateFormatterUTC(this.props.maxDate);
    }

    var disabledText = {};
    if (this.props.readOnly && !this.props.valueDate) {
      disabledText.value = FrontendConstants.EM_DASH;
    }

    let valueDate = this.props.skipInitialDate ? '' : ((this.props.valueDate) ? (($.isNumeric(this.props.valueDate) && !(this.props.valueDate.toString().length < 10)) ? Util.dateFormatterUTC(this.props.valueDate) : this.props.valueDate) : '');
    let pValueDate = this.props.valueDate && $.isNumeric(this.props.valueDate) && !(this.props.valueDate.toString().length < 10) ? Util.dateFormatterUTC(this.props.valueDate) : '';

    var desktopCalendar = DateTime(_.extend({
      defaultValue: valueDate,
      value: valueDate,
      dateFormat: Util.dateFormat,
      timeFormat: false,
      isValidDate: this.isValidDate,
      inputProps: _.extend({
        className: this.props.className,
        disabled: this.props.readOnly,
        placeholder: this.props.placeholder,
      }, disabledText),
      onChange: this.handleChange,
      onBlur: this.handleBlur,
      closeOnSelect: this.props.closeOnSelect,
      utc: true
    }, sharedProps));

    var phoneCalendar = InputWithPlaceholder(_.extend({
      className: this.props.className,
      type: 'date',
      onChange: this.handleChange,
      onBlur: this.handleBlur,
      placeholder: this.props.placeholder,
      defaultValue: pValueDate,
      maxLength: 64,
      disabled: this.props.readOnly
    }, phoneRangeProps, sharedProps));

    var classInfo = cx('calendar-wrapper', {disabled: this.props.readOnly});

    return MediaQueryWrapper({
      className: classInfo,
      desktopComponent: desktopCalendar,
      phoneComponent: phoneCalendar
    });
  }
}

module.exports = Calendar;
