import React from 'react';
import PropTypes from 'prop-types';

class Spinner extends React.PureComponent {
  static displayName = 'Spinner';

  static propTypes = {
    compact: PropTypes.bool,
    containerClass: PropTypes.string
  };

  render() {
    var containerClass = this.props.containerClass ? this.props.containerClass : 'spinner-container';
    var spinnerClass = this.props.compact ? 'compact-spinner' : 'spinner';

    return (
      <div className={containerClass} key='loading'>
        <div className={spinnerClass} />
      </div>
    );
  }
}

module.exports = Spinner;
