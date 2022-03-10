var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));

var div = DOM.div;

class InputBlockContainer extends React.Component {
  static displayName = 'InputBlockContainer';

  static propTypes = {
    inputComponent: PropTypes.any,
    class: PropTypes.string,
    errorClass: PropTypes.string,
    errorMsg: PropTypes.string,
    isLoading: PropTypes.bool,
    readOnly: PropTypes.bool,
    title: PropTypes.node,
    titleClass: PropTypes.string
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    var classes = {'input-block': true};
    if (this.props.class) { classes[this.props.class] = true; }

    var errorClasses = this.props.isLoading ? {'text-input-info-explanation': true} : {'text-input-error-explanation': true};
    if (this.props.errorClass) { errorClasses[this.props.errorClass] = true; }

    var titleClasses = {'input-title': true};
    if (this.props.titleClass) { titleClasses[this.props.titleClass] = true; }

    return div({className: cx(classes)},
      this.props.title ? div({className: cx(titleClasses)}, this.props.title) : null,
      this.props.inputComponent,
      _.isEmpty(this.props.errorMsg) ? null : div({className: cx(errorClasses)}, this.props.errorMsg)
    );
  }
}

module.exports = InputBlockContainer;
