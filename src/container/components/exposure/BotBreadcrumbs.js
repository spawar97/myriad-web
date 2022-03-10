const React = require('react');
const Imm = require('immutable');
const cx = require('classnames');
const Link = require('react-router').Link;

import Tooltip from 'rc-tooltip';
const _ = require('underscore');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';
import "../../../stylesheets/_imported-font-icons.scss";

const FileTitle = require('./FileTitle');
const TouchDiv = require('../TouchComponents').TouchDiv;
const ExposureAppConstants = require('../../constants/ExposureAppConstants');
const ExposureNavConstants = require('../../constants/ExposureNavConstants');
const RouteNameConstants = require('../../constants/RouteNameConstants');
const Util = require('../../util/util');
const HelpUtil = require('../../util/HelpUtil');



const a = DOM.a;
const div = DOM.div;

// Breadcrumbs for the file hierarchy.
class BotBreadcrumbs extends React.PureComponent {
  static propTypes = {
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    fileId: PropTypes.string,
    searchedText: PropTypes.string,
    isMobile: PropTypes.bool
  };

  // Walk up the folder structure to produce an Immutable List of immFiles.
  getImmFilePath(fileId, immExposureStore) {
    const immTopLevelFile = Imm.Map({
      id: ExposureAppConstants.REPORTS_LANDING_PAGE_ID,
      title: 'DaLIA Search Query'
    });

    let immFiles = Imm.List();
    let immCurFile = immExposureStore.getIn(['fileConfigs', fileId]);
    while (immCurFile) {
      immFiles = immFiles.unshift(immCurFile);
      const parentId = immCurFile.get('folderId');
      immCurFile = immExposureStore.getIn(['fileConfigs', parentId]);
    }

    // If the current file is inside a folder, that folder will be the root. Otherwise add `Analytics`.
    if (immFiles.size < 2) {
      immFiles = immFiles.unshift(immTopLevelFile);
    }
    return immFiles;
  }

  render() {
    const immFilePath = this.getImmFilePath(this.props.fileId, this.props.immExposureStore);
    const currentFile = immFilePath.last();
    const parentFiles = immFilePath.pop();
    const searchedText = this.props.searchedText;
    const breadCrumbText = <span><span className='breadcrumb-separator icon icon-arrow-right oversight-breadcrumb-margin'></span><div className='bot-breadcrumbText' title={searchedText}><i>&#8220;{searchedText}&#8221;</i></div></span>;
    const tooltipOverlay = <span>{currentFile.get('title')}</span>;
    const tooltipConfig = {
      key: 'title',
      placement: 'bottomLeft',
      overlay: tooltipOverlay,
      overlayClassName: 'breadcrumb-tooltip',
      trigger: ['click', 'hover']
    };

    // It seems rc-tooltip needs a simple element to attach event listeners to.
    // If we need a tooltip, wrap the content we care about in a span.
    const titleComponent = currentFile.get('id') === ExposureAppConstants.REPORTS_LANDING_PAGE_ID ? <span key='title' className='title'>{currentFile.get('title')}</span> :
      <Tooltip {...tooltipConfig}>
        <span className='rc-tooltip-trigger-container'>
          <FileTitle className='title' immFileConfig={currentFile}></FileTitle>
        </span>
      </Tooltip>;

    // Basic support for arbitrary depth path, although we currently only ever show one level.
    const path = parentFiles.flatMap((immFile, index) => {
      const fileId = immFile.get('id');
      const linkConfig = {
        key: `breadcrumb-path-${index}`,
        className: cx('breadcrumb-path', 'open-link'),
        to: { name: fileId === ExposureAppConstants.REPORTS_LANDING_PAGE_ID ? RouteNameConstants.EXPOSURE_FOLDERS : RouteNameConstants.EXPOSURE_FOLDERS_SHOW, params: { fileId } }
      };

      // This Link component is not interacting with the react-router properly.
      // It generates invariant exceptions TODO: figure out why.
      // If you replace with a normal <a which bypasses react-router you don't get the error.
      return Imm.List([
        <Link {...linkConfig}>{immFile.get('title')}</Link>,
        <TouchDiv key={`breadcrumb-separator-${index}`} className={cx('breadcrumb-separator', 'icon', 'icon-arrow-right')}></TouchDiv>
      ]);
    });

    var breadcrumbs = this.props.isMobile ? titleComponent : path.push(titleComponent);
    const reportTitle = currentFile.get('title');
    const help = HelpUtil.isInAppHelpExists(reportTitle)
      ? a({ className: 'icon-question-circle', key: 'help-link', href: Util.formatHelpLink(reportTitle), target: '_blank' })
      : undefined;

    return (
      <TouchDiv key='breadcrumbs-top' className='breadcrumbs'>{breadcrumbs} {breadCrumbText} {help} </TouchDiv>
    );
  }
}

module.exports = BotBreadcrumbs;
