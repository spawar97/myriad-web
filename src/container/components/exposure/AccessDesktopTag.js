var React = require('react');
var cx = require('classnames');

var ListItem = React.createFactory(require('../ListItem'));
var FrontendConstants = require('../../constants/FrontendConstants');

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

class AccessDesktopTag extends React.Component {
  static displayName = 'AccessDesktopTag';

  render() {
    return ListItem({
      content: div({className: cx('non-desktop-tag', 'virtual-table')},
        div({className: 'virtual-table-row'},
          span({className: cx('virtual-table-cell', 'icon-info')}),
          span({className: cx('virtual-table-cell')}, span({className: 'text'},
            FrontendConstants.PLEASE_ACCESS_THIS_APPLICATION_ON_A_DESKTOP_TO_VIEW_FULL_CONTENT))))
    });
  }
}

module.exports = AccessDesktopTag;
