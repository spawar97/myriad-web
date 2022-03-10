import React from 'react';
import '../../../stylesheets/modules/bot.scss';

class BotModal extends React.PureComponent {

  state = { feedbackText: "" }

  render() {
    return (
      <div className="popover-comment">
        <div className="comment-header"> Comment <span className="optional-text">(Optional)</span>
        </div>
        <div className="comment-box">
          <textarea placeholder="Enter your comment..." onChange={() => this.setState({ feedbackText: event.target.value })}></textarea>
        </div>
        <div className="vote-icons filter-buttons-wrapper">
          <button className="btn btn-secondary" onClick={() => { this.props.feedback(this.state.feedbackText); this.props.handleClose(); }}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={() => { this.props.feedback(this.state.feedbackText); this.props.handleClose(); }}>
            Submit
          </button>
        </div>
      </div>
    )
  }
}

export default BotModal;

