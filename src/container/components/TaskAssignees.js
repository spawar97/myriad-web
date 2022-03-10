import React from 'react';
import { TouchDiv } from './TouchComponents';
import Tooltip from 'rc-tooltip';
import PropTypes from 'prop-types';

class TaskAssignees extends React.Component {

  render() {
    const numberOfAssignees = this.props.taskAssignees.length;
    const moreConfig = {
      className: 'text-link'
    };

    return (
      <TouchDiv id="assignees">
        {this.props.taskAssignees[0]}
        {numberOfAssignees > 1 ?
          <Tooltip
            placement='bottomLeft'
            overlay={this.props.taskAssignees.join(', ')}
            overlayClassName='selected-study-tooltip'
            trigger={['click', 'hover']}>
              <span {...moreConfig}>+ {numberOfAssignees - 1} more</span>
          </Tooltip> : null
        }
      </TouchDiv>
    )
  }
};

TaskAssignees.propTypes = {
  taskAssignees: PropTypes.arrayOf(PropTypes.string)
};

module.exports = TaskAssignees;
