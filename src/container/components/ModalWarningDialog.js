var React = require('react');
var _ = require('underscore');
import PropTypes from 'prop-types';

var Button = React.createFactory(require('./Button'));
var ExposureActions = require('../actions/ExposureActions');
var FrontendConstants = require('../constants/FrontendConstants');

var div = React.createFactory(require('./TouchComponents').TouchDiv),
    span = React.createFactory(require('./TouchComponents').TouchSpan);

class ModalWarningDialog extends React.Component {
  static displayName = 'ModalWarningDialog';

  static propTypes = {
    headerText: PropTypes.string,
    primaryButtonAction: PropTypes.func,
    primaryButtonText: PropTypes.string,
    secondaryButtonAction: PropTypes.func,
    secondaryButtonText: PropTypes.string,
    warningText: PropTypes.any
  };

  static defaultProps = {
    headerText: FrontendConstants.ARE_YOU_SURE,
    primaryButtonAction: ExposureActions.toggleDisplayWarningModal,
    primaryButtonText: FrontendConstants.RETURN,
    secondaryButtonAction: ExposureActions.discardModalChanges,
    secondaryButtonText: FrontendConstants.DISCARD,
    warningText: FrontendConstants.SHARING_NONE_OF_YOUR_CHANGES
  };

  stopPropagation = (e) => {
    e.stopPropagation();
  };

  clickHandler = (action) => {
    if (_.isFunction(action)) { action(); }
  };

  render() {
    // We are removing `transform: translate(-50%, -50%);` because IE9 has a weird bug that let the user scroll
    // half a div (see id:8342 for more info), and it also has a known issue that caused the input box caret to
    // disappear (see id:8345 for more info). We are using virtual table to center the modal-dialog to avoid using transform.
    return div({className: 'modal-dialog-underlay modal-underlay virtual-table'},
      div({className: 'virtual-table-row'},
        div({className: 'virtual-table-cell'},
          div({className: 'modal-dialog modal-warning-dialog', onClick: this.stopPropagation},
            div({className: 'modal-dialog-closer', onClick: this.clickHandler.bind(null, this.props.secondaryButtonAction)}),
            div({className: 'modal-dialog-content'},
              div({className: 'modal-dialog-header'}, span({className: 'modal-dialog-header-text'}, this.props.headerText)),
              div({className: 'modal-dialog-main'}, this.props.warningText),
              div({className: 'modal-dialog-footer'},
                Button({
                  children: this.props.primaryButtonText,
                  isPrimary: true,
                  onClick: this.clickHandler.bind(null, this.props.primaryButtonAction)}),
                Button({
                  children: this.props.secondaryButtonText,
                  isSecondary: true,
                  onClick: this.clickHandler.bind(null, this.props.secondaryButtonAction)})
              )
            )
          )
        )
      )
    );
  }
}

module.exports = ModalWarningDialog;
