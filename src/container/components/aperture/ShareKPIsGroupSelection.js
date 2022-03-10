import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';

class ShareKPIsGroupSelection extends React.PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { groups, onGroupSelect } = this.props;
    return (
      <div>
        <div className='group-selection-header'>
          Select a team to edit sharing:
        </div>
        <div className='group-list'>
        {
          groups
            .sortBy((group) => group.get('name').toUpperCase())
            .map((group) => {
              return (
                <div key={group.get('id')} className='group-info' onClick={() => onGroupSelect(group)}>
                  <div className='group-name'>
                    Team Name: {group.get('name')}
                  </div>
                  <div className='group-description'>
                    Description: {group.get('description')}
                  </div>
                </div>
              );
            }).toSeq()
        }
        </div>
      </div>
    );
  }
}

ShareKPIsGroupSelection.propTypes = {
  groups: PropTypes.instanceOf(Imm.List).isRequired,
  onGroupSelect: PropTypes.func.isRequired
};

export default ShareKPIsGroupSelection;
