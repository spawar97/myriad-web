import React from 'react';
import cx from 'classnames';
import _ from 'underscore';
import PropTypes from 'prop-types';

import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';

class StatusMessage extends React.PureComponent {
  static displayName = 'StatusMessage';

  static propTypes = {
    handleClose: PropTypes.func.isRequired,
    id: PropTypes.string,
    isToast: PropTypes.bool,
    text: PropTypes.string,
    type: PropTypes.oneOf(_.values(StatusMessageTypeConstants)),
    toastTimeout: PropTypes.number
  };

  static defaultProps = {
    toastTimeout: 10000
  };

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (this.props.isToast) {
      window.setTimeout(this.props.handleClose.bind(null, this.props.id), this.props.toastTimeout);
    }
  }

  render() {
    return (
      <div className={cx('status-message-body lsac-status-msg', this.props.type, {toast: this.props.isToast})} onClick={this.props.handleClose.bind(this, this.props.id)}>
        <div className='status-icon'> 
          <span className={cx('icon', 'icon-status-type')} />
        </div>
        <div className='status-text'>
          {this.props.text}
        </div>
        <div className='status-close-button'>
          <span className={cx('icon', 'icon-close-alt')} onClick={this.props.handleClose.bind(this, this.props.id)} />
        </div>
      </div>
    );
  }
}

module.exports = StatusMessage;
export default StatusMessage;
