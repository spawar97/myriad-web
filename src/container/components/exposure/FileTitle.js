import React from 'react';
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Util = require('../../util/util');

var div = DOM.div;
var span = DOM.span;

class FileTitle extends React.PureComponent {
  static displayName = 'FileTitle';
  static propTypes = {
    immFileConfig: PropTypes.instanceOf(Imm.Map).isRequired,
    className: PropTypes.string,
    prefix: PropTypes.string,
    titleClassName: PropTypes.string
  };

  render() {
    const prefix = _.isEmpty(this.props.prefix) ? null : span({className: 'file-title-prefix colon'}, this.props.prefix);
    const fileTitle = this.props.immFileConfig.get('title', '');
    const fileIcon = Util.getFileTypeIconName(this.props.immFileConfig.get('fileType'), fileTitle);

    return div({className: cx('file-title-container', this.props.className)},
      prefix,
      span({className: cx('icon', fileIcon, {larger: !_.isEmpty(this.props.prefix)})}),
      span({className: cx('file-title-text', this.props.titleClassName)}, fileTitle)
    );
  }
}

module.exports = FileTitle;
export default FileTitle;
