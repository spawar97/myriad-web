import React from 'react';
import cx from 'classnames';

import Spinner from './Spinner';
import { TouchDiv } from './TouchComponents';
import PropTypes from 'prop-types';

// Represents the basic Comprehend Button.
class Button extends React.PureComponent {
  render() {
    const buttonClasses = cx('btn', {
      'btn-disabled': this.props.isDisabled,
      'btn-primary': this.props.isPrimary,
      'btn-loading': this.props.isLoading,
      'btn-secondary': this.props.isSecondary
    }, this.props.classes);

    const buttonConfigs = {
      className: buttonClasses,
      tabindex:"0",
      onClick: this.props.isDisabled || this.props.isLoading ? null : () => { this.props.onClick(); },
    };

    // We cannot use the HTML `button` tag until we rip out Foundation, because
    // it applies a bunch of styles onto it.
    // We separate the result to 2 cases depending on the existent of this.props.icon to
    // eliminate the extra span React created when there is a null element and a span element in a div.
    return (
      <TouchDiv {...buttonConfigs}>
        {this.props.isLoading ? <Spinner containerClass='btn-spinner-container' compact /> : this.props.icon ? <div className={cx('icon', this.props.icon)} /> : null}
        {this.props.children}
      </TouchDiv>
    );
  }
}

Button.propTypes = {
  classes: PropTypes.object,
  icon: PropTypes.string,
  isDisabled: PropTypes.bool,
  // If isLoading is true the button will disable and display a spinner instead of text.
  isLoading: PropTypes.bool,
  isPrimary: PropTypes.bool,
  isSecondary: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.any
};

module.exports = Button;
