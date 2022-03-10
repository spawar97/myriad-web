var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var FrontendConstants = require('../constants/FrontendConstants');

var div = DOM.div;
var ul = DOM.ul;
var li = DOM.li;

class PasswordRequirements extends React.Component {
  static displayName = 'PasswordRequirements';

  static propTypes = {
    isResetPassword: PropTypes.bool
  };

  render() {
    // Clone the contents of the array from FrontendConstants, otherwise we keep expanding it.
    // Normally we would use underscore, but this is meant to be a lightweight component in external components.
    const requirementsList = FrontendConstants.PASSWORD_REQUIREMENTS_ARRAY.slice(0);
    if (this.props.isResetPassword) {
      requirementsList.unshift(FrontendConstants.PASSWORD_REQUIREMENTS_RESET_ARRAY);
    }
    return div({
      className: 'password-requirements text-body2'},
      ul({className: 'password-requirements-list'}, requirementsList.map(function(requirement, index) {
        return li({key: 'requirement-' + index, className: 'password-requirement'}, requirement);
      }))
    );
  }
}

module.exports = PasswordRequirements;
