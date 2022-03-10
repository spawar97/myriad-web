const React = require('react');
const Spinner = React.createFactory(require('./Spinner'));
const ExposureAppConstants = require('../constants/ExposureAppConstants');
const FrontendConstants = require('../constants/FrontendConstants');
import DOM from 'react-dom-factories';
const div = DOM.div;
import PropTypes from 'prop-types';
import cx from 'classnames';

class ContentPlaceholder extends React.Component {
  static displayName = 'ContentPlaceholder';

  static propTypes = {
    height: PropTypes.number,
    containerClassName: PropTypes.string,
  };

  render() {
    const height = `${this.props.height || ExposureAppConstants.CONTENT_PLACEHOLDER_HEIGHT_REM_DEFAULT}rem`;
    return div({className: cx('content-placeholder', this.props.containerClassName), style: {height}},
      div({className: 'spinner-with-text-wrapper'},
        div({className: 'spinner-with-text'},
          div({className: 'spinner-text'}, FrontendConstants.LOADING_WITH_THREE_DOTS),
          Spinner())));
  }
}

module.exports = ContentPlaceholder;
