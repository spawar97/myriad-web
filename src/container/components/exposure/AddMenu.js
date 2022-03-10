import React from 'react';
import ReactDOM from 'react-dom';
import Imm from 'immutable';
import ShallowCompare from 'react-addons-shallow-compare';
import cx from 'classnames';
import _ from 'underscore';
import PropTypes from 'prop-types';

import ExposureActions from '../../actions/ExposureActions';
import AccountUtil from '../../util/AccountUtil';
import FrontendConstants from '../../constants/FrontendConstants';
import RouteNameConstants from '../../constants/RouteNameConstants';
import ExposureAppConstants from '../../constants/ExposureAppConstants';

import Menu from '../../lib/react-menu/components/Menu';
import MenuOption from '../../lib/react-menu/components/MenuOption';
import MenuOptions from '../../lib/react-menu/components/MenuOptions';
import MenuTrigger from '../../lib/react-menu/components/MenuTrigger';
import {TouchDiv as div, TouchSpan as span} from '../TouchComponents';

class AddMenu extends React.Component {
  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  createFolderHandler() {
    // Only pass query for now as we always create folder on the Landing Page.
    ExposureActions.createFolder(this.props.query);
  }

  constructMenuOptions() {
    const immAppConfig = comprehend.globals.immAppConfig;
    const hasCRO = AccountUtil.hasCROOversight(immAppConfig);
    const hasKpiStudio = AccountUtil.hasKPIStudio(immAppConfig);
    const userIsAdmin = AccountUtil.hasPrivilege(this.props.immExposureStore, 'isAdmin');
    // If we have a fileId, then we can't create a folder (we can't nest folders)
    const canCreateFolder = !this.props.fileId;

    // Construct a map of AddMenuOptions -> JSX for the specified add menu option
    const menuOptions = {};
    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.CREATE_FOLDER] = (
        canCreateFolder
          ? (
          <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.CREATE_FOLDER} className='add-menu-create-folder' onSelect={this.createFolderHandler.bind(this)}>
            <div className={cx('react-menu-icon', 'icon-folder', 'menu-item-create-folder')}>
              {FrontendConstants.FOLDER}
            </div>
          </MenuOption>
        )
          : null
      );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.TABULAR_REPORT] = (
      <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.TABULAR_REPORT} className='add-menu-create-report' onSelect={() => this.context.router.push(RouteNameConstants.EXPOSURE_REPORTS_NEW)}>
        <div className={cx('react-menu-icon', 'icon-report', 'menu-item-create-report')}>
          {FrontendConstants.TABULAR_REPORT}
        </div>
      </MenuOption>
    );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.GRAPHICAL_REPORT] = (
      <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.GRAPHICAL_REPORT} className='add-menu-create-adhoc-report' onSelect={() => this.context.router.push(RouteNameConstants.EXPOSURE_ADHOC_REPORTS_NEW)}>
        <div className={cx('react-menu-icon', 'icon-report', 'menu-item-create-adhoc-report')}>
          {FrontendConstants.GRAPHICAL_REPORT}
        </div>
      </MenuOption>
    );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.DASHBOARD] = (
      <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.DASHBOARD} className='add-menu-create-dashboard' onSelect={() => this.context.router.push(RouteNameConstants.EXPOSURE_DASHBOARDS_NEW)}>
        <div className={cx('react-menu-icon', 'icon-dashboard', 'menu-item-create-dashboard')}>
          {FrontendConstants.DASHBOARD}
        </div>
      </MenuOption>
    );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.MONITOR] = (
      userIsAdmin
        ? (
        <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.MONITOR} className='add-menu-create-monitor' onSelect={() => this.context.router.push(RouteNameConstants.EXPOSURE_MONITORS_NEW)}>
          <div className={cx('react-menu-icon', 'icon-alarm-check', 'menu-item-create-monitor')}>
            {FrontendConstants.MONITOR}
          </div>
        </MenuOption>
      )
        : null
    );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.QUALITY_AGREEMENT] = (
      (userIsAdmin && hasCRO)
        ? (
        <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.QUALITY_AGREEMENT} className='add-menu-create-quality-agreement' onSelect={() => this.context.router.push(RouteNameConstants.EXPOSURE_QUALITY_AGREEMENTS_NEW)}>
          <div className={cx('react-menu-icon', 'icon-file', 'menu-item-create-quality-agreement')}>
            {FrontendConstants.QUALITY_AGREEMENT}
          </div>
        </MenuOption>
      )
        : null
    );

    menuOptions[ExposureAppConstants.ADD_MENU_ADD_TYPES.DATA_REVIEW_SET] = (
      <MenuOption key={ExposureAppConstants.ADD_MENU_ADD_TYPES.DATA_REVIEW_SET}
                  className='add-menu-create-data-review'
                  onSelect={() => {
                    this.context.router.push(RouteNameConstants.EXPOSURE_DATA_REVIEW_NEW)
                  }}
      >
        <div className={cx('react-menu-icon', 'icon-table', 'menu-item-create-data-review')}>
          {FrontendConstants.DATA_REVIEW_SET}
        </div>
      </MenuOption>
    );

    return menuOptions;
  }

  render() {
    const userHasCreateTarget = AccountUtil.hasPrivilege(this.props.immExposureStore, 'isCreateTarget');
    // If the user doesn't have create privileges then don't show the add menu
    if (!userHasCreateTarget) {
      return null;
    }

    const menuOptions = this.constructMenuOptions();

    const addMenuOptions = [
        ExposureAppConstants.ADD_MENU_ADD_TYPES.CREATE_FOLDER,
        ExposureAppConstants.ADD_MENU_ADD_TYPES.TABULAR_REPORT,
        ExposureAppConstants.ADD_MENU_ADD_TYPES.GRAPHICAL_REPORT,
        ExposureAppConstants.ADD_MENU_ADD_TYPES.DASHBOARD,
        ExposureAppConstants.ADD_MENU_ADD_TYPES.MONITOR,
        ExposureAppConstants.ADD_MENU_ADD_TYPES.QUALITY_AGREEMENT, // CRO Oversight check is performed on menu JSX build
        ExposureAppConstants.ADD_MENU_ADD_TYPES.DATA_REVIEW_SET
      ];

    return (
      <Menu className='add-menu'>
        <MenuTrigger className='add-menu-trigger'>
          <div className={cx('react-menu-icon', 'icon-plus-circle2')}>
            {FrontendConstants.ADD}
          </div>
        </MenuTrigger>
        <MenuOptions className='add-menu-options'>
          {
            _.map(addMenuOptions, (menuOption) => menuOptions[menuOption], this)
          }
        </MenuOptions>
      </Menu>
    );
  }
}

AddMenu.propTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  query: PropTypes.objectOf(PropTypes.string),
  fileId: PropTypes.string
};

AddMenu.contextTypes = {
  router: PropTypes.object
};


module.exports = AddMenu;
