import React from 'react';
import $ from 'jquery';
import cx from 'classnames';
import _ from 'underscore';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import StatusMessage from './StatusMessage';
import StatusMessageTypeConstants from '../constants/StatusMessageTypeConstants';
import Util from '../util/util';

class StatusMessageContainer extends React.PureComponent {
  static displayName = 'StatusMessageContainer';

  static propTypes = {
    immStatusMessageList: PropTypes.instanceOf(Imm.List).isRequired,
    handleCloseStatusMessage: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {isSystemMessageInViewPort: false};
  }

  componentDidMount() {
    this.setSystemMessageInViewPort();
    window.onscroll = this.setSystemMessageInViewPort;
  }

  componentWillUnmount() {
    window.onscroll = undefined;
  }

  componentDidUpdate() {
    this.setSystemMessageInViewPort();
  }

  setSystemMessageInViewPort = () => {
    this.setState({isSystemMessageInViewPort: Util.isInViewport(_.last($('.status-message-container.system .status-message-body')))});
  };

  render() {
    const [toastStatusMessages, statusMessages] = _.chain(this.props.immStatusMessageList.toJS())
      .map((statusMessage, index) =>
        <StatusMessage
          id={statusMessage['id']}
          key={statusMessage['text'] + index}
          text={statusMessage['text']}
          type={statusMessage['type']}
          isToast={_.contains([StatusMessageTypeConstants.TOAST_SUCCESS, StatusMessageTypeConstants.TOAST_ERROR, StatusMessageTypeConstants.TOAST_INFO], statusMessage.type)}
          handleClose={this.props.handleCloseStatusMessage}
          toastTimeout={statusMessage['toastTimeout']}
        />
      )
      .partition(statusMessageComp => statusMessageComp.props.isToast)
      .value();

    return (
      <div className='status-message-containers'>
        <div className={cx('status-message-container', 'system')}>
          {statusMessages}
        </div>
        <div className={cx('status-message-container', 'toast', {'system-message-not-in-vp': !this.state.isSystemMessageInViewPort})}>
          {toastStatusMessages}
        </div>
      </div>
    );
  }
}

module.exports = StatusMessageContainer;
export default StatusMessageContainer;
