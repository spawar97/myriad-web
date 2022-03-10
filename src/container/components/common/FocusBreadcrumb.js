import FrontendConstants from "../../constants/FrontendConstants";
import PropTypes from 'prop-types';
import Combobox from "../Combobox";
import React from 'react';
import Imm from 'immutable';
import cx from 'classnames';
import {TouchDiv} from '../TouchComponents';
import Util from "../../util/util"
import { Tooltip } from 'primereact-opt/tooltip';
import CookieStore from '../../stores/CookieStore';

// Breadcrumbs for the file hierarchy.
class FocusBreadcrumbs extends React.PureComponent {
  static propTypes = {
    immBreadcrumbConfig: PropTypes.instanceOf(Imm.List).isRequired,
    showTaskPane: PropTypes.instanceOf(Boolean)
  };

  onChangeValue = (dropdownValue, immConfig) => {
    const immOptions = immConfig.get('value');
    const onChange = immConfig.get('onChange');

    let immSelected = immOptions.find((immVal) => immVal.get('value', '') === dropdownValue);
    onChange(immSelected);
  };

  render() {
    const { immBreadcrumbConfig, showTaskPane, exposureStore, fileId } = this.props;
    let breadCrumb = [];
    const breadcrumbLength = immBreadcrumbConfig.size;
    var immFile = exposureStore.getIn(['files', fileId, 'fileWrapper', 'file']);
    let showUSDMTime;
    if(immFile){
      showUSDMTime=  immFile.toJS().hideLeftFilterPanel 
    }
    const USDMTime =  exposureStore.get('USDMTime')?.length ? Util.utc_formatted_date_time_new(new Date(parseInt(exposureStore.get('USDMTime')[0]?.values[0])),true ):null;
    let selectedStudies = Util.getSelectedStudiesFilterFromSession(exposureStore.toJS().masterStudyFilterContext.props.cookie,exposureStore)
    let studies = selectedStudies.toJS()?.map(data=>data.value)
  
    immBreadcrumbConfig.map((immConfig, index) => {
      let type = '';
      let value = '';
      let immSelectedValue = '';
      let displayLabel = '';

      if (immConfig) {
        type = immConfig.get('type');
        value = immConfig.get('value');
        immSelectedValue = immConfig.get('immSelectedValue');
        displayLabel = immConfig.get('displayLabel');
      }

      if (type === 'dropdown') {
        const selectedValue = immSelectedValue.get('value');
        //changed this for adding dynamic classes for automation purpose
        const dropdownClass = displayLabel ? displayLabel.toLowerCase() + '-dropdown breadcrumb-selection' : 'breadcrumb-selection';
        breadCrumb.push(
          <span className="breadcrumb-label">
            <label key={'dropdown_label_' + index}>{displayLabel}:</label>
            <Combobox key={'dropdown_' + index}
                      className={ dropdownClass }
                      placeholder={FrontendConstants.NONE}
                      value={selectedValue}
                      onChange={(e) => {
                        this.onChangeValue(e, immConfig)
                      }}
                      options={value ? Imm.fromJS(value) : Imm.List()}
                      labelKey='title'
                      disabled = {showTaskPane}
            />
          </span>
        );
      }

      if(index < breadcrumbLength - 1) {
        breadCrumb.push(
          <TouchDiv key={'arrow_'+index} className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right', 'oversight-breadcrumb-margin')}/>
        );
      }
    });

    if (breadCrumb.length) {
      breadCrumb.shift();
    }

    return (
      <div className="focus-breadcrumbs-display">
        {breadCrumb}
         {(USDMTime && showUSDMTime && studies.length==1)?
         <React.Fragment>
           <span className="icon-clock usdm-icons" tooltipOptions={{ className: 'blue-tooltip', position: 'top' }}  ></span>
           <Tooltip target=".icon-clock" content={`USDM Last Refresh Date/Time: ${USDMTime}`} className={"usdm-tooltip"} />
          </React.Fragment>:''} 
      </div>
    );
  }
}

module.exports = FocusBreadcrumbs;
