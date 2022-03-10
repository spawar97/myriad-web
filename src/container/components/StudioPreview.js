import React from 'react';
import ReportsWrapper from './ReportsWrapper';
import ShallowCompare from 'react-addons-shallow-compare';
import Imm from 'immutable';
import PropTypes from 'prop-types';

class StudioPreview extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  render() {
    return (
      <div className='studio-preview'>
        <div className='title'>
          {this.props.title}
        </div>
        <ReportsWrapper
          immExposureStore={this.props.immExposureStore}
          fileType={this.props.fileType}
          reportIds={this.props.reportIds}
          />
      </div>
    );
  }
}

StudioPreview.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  title: PropTypes.string.isRequired,
  fileType: PropTypes.string.isRequired,
  reportIds: PropTypes.arrayOf(PropTypes.string).isRequired
};

export default StudioPreview;
