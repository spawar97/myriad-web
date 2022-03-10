var React = require('react');
var ReactDOM = require('react-dom');
var cx = require('classnames');
var $ = require('jquery');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ExposureActions = require('../actions/ExposureActions');
var ModalDialogContent = require('../components/ModalDialogContent');

var div = DOM.div;

class ModalDialog extends React.Component {
  static displayName = 'ModalDialog';

  static propTypes = {
    isHidden: PropTypes.bool
  };

  state = {
    isLarger: false,
    modalClassName: '',
  };

  stopPropagation = (e) => {
    e.stopPropagation();
  };

  handleCancel = () => {
    var modalDialogContent = this.refs['modalDialogContent'];
    // If the modalDialogContent includes a cancelHandler function then it is
    // responsible for managing the dirty state and back navigation.
    var modalHandlesOwnDirtyNavigation = _.isFunction(modalDialogContent.cancelHandler);
    if (modalHandlesOwnDirtyNavigation) {
      modalDialogContent.cancelHandler();
    } else {
      modalDialogContent.props.handleCancel();
    }
    // If modalDialogContent doesn't handle it's own state then the calling
    // function should be returned `true` to indicate that navigation must still
    // be handled.
    return !modalHandlesOwnDirtyNavigation;
  };

  componentDidUpdate(prevProps) {
    if (this.props.children !== prevProps.children) {
      // Quick fix to run this after the current dispatch is finished otherwise
      // React will complain about dispatching while in the middle of a
      // dispatch.
      //
      // Hide the warning modal if it is displayed.
      setTimeout(() => ExposureActions.toggleDisplayWarningModal(null, true));
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    document.body.style.overflow = "scroll";
    document.body.style.webkitOverflowScrolling = "touch";
  }

  componentWillMount() {
    document.body.style.overflow = "hidden";
    document.body.style.webkitOverflowScrolling = "auto";
  }

  handleResize = () => {
    $(ReactDOM.findDOMNode(this.refs['modalDialog'])).css({maxHeight: this.getViewportHeight()});
  };

  getViewportHeight = () => {
    return $(window).height() + 'px';
  };

  setIsLarger = (isLarger) => {
    this.setState({isLarger});
  };

  setModalClassName = (className) => {
    this.setState({ modalClassName: className });
  };

  // ModalDialog always expects a single child for the modal content.  Clicking outside of the
  // dialog or clicking the top-right close icon, should have the same behavior as one of the
  // button on the dialog, and they are handled by handleCancel.
  render() {
    const { isHidden } = this.props;
    const { isLarger, modalClassName } = this.state;

    const modalProps = {
      ref: 'modalDialogContent',
      isHidden: isHidden,
      setIsLarger: this.setIsLarger,
      isLarger: isLarger,
      setModalClassName: this.setModalClassName,
    };

    const extendedClassNames = {
      larger: isLarger,
    };

    if (modalClassName) {
      extendedClassNames[modalClassName] = true;
    }

    // We are removing `transform: translate(-50%, -50%);` because IE9 has a weird bug that let the user scroll
    // half a div (see id:8342 for more info), and it also has a known issue that caused the input box caret to
    // disappear (see id:8345 for more info). We are using virtual table to center the modal-dialog to avoid using transform.
    return div({className: cx('modal-dialog-underlay', 'modal-underlay', 'virtual-table', {hidden: this.props.isHidden})},
      div({className: 'virtual-table-row'},
        div({className: 'virtual-table-cell'},
          div({
              className: cx('modal-dialog', extendedClassNames),
              onClick: this.stopPropagation,
              ref: 'modalDialog',
              style: {maxHeight: this.getViewportHeight()}
            },
            div({className: 'modal-dialog-closer', onClick: this.handleCancel}),
            div({className: 'modal-dialog-content'}, React.cloneElement(this.props.children, modalProps))
          )
        )
      )
    );
  }
}

module.exports = ModalDialog;
