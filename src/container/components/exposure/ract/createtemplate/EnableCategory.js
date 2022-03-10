import React from 'react';
import { PropTypes } from 'prop-types';
import ToggleButton from '../../../../components/ToggleButton';
import FrontendConstants from '../../../../constants/FrontendConstants';

const EnableCategory = (props) => {
  const { enable, category, isView } = props;
  
  const toggleCheckbox = (e) => {
    props.updateEnable(category, enable);
  }

  return (<React.Fragment>
    <div className="category align-right">
      <label className="enable-category-label">Enabled</label>
      <ToggleButton id={category.id} disabled = {isView} isActive={enable}  activeText={FrontendConstants.CHECKMARK} onClick={(e) => toggleCheckbox(e)} className="enable-category-button"/>
    </div>
  </React.Fragment>)
}

EnableCategory.PropTypes = {
  category: PropTypes.object,
  updateEnable: PropTypes.func,
  enable: PropTypes.bool
};

export default React.memo(EnableCategory);
