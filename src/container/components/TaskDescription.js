import React from 'react';
import { TouchDiv } from './TouchComponents';
import Tooltip from 'rc-tooltip';
import PropTypes from 'prop-types';

class TaskDescription extends React.Component {

  render() {
    const taskDescriptionLength = this.props.description.length;

    return (
      <TouchDiv id="task-description">
        {this.props.description.substring(0, 20)}
        {taskDescriptionLength > 20 ?
          <Tooltip
            overlay={<pre>{this.props.description}</pre>}
            overlayClassName='selected-study-tooltip'
            trigger={['hover']}>
              <span> ...</span>
          </Tooltip> : null
        }
      </TouchDiv>
    )
  }
};

TaskDescription.propTypes = {
  description: PropTypes.string
};

module.exports = TaskDescription;
