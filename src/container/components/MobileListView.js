var React = require('react');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var EmptyContentNotice = React.createFactory(require('./EmptyContentNotice'));
var FrontendConstants = require('../constants/FrontendConstants');

var div = DOM.div,
    li = DOM.li,
    ul = DOM.ul;

var MobileListItem = React.createFactory(class extends React.Component {
  static propTypes = {
    // An array containing the ordered contents of the list item. e.g.
    // [div({className: 'report-list-item-unique icon-star'}, 'blah'), div({...}, ...), ...]
    contents: PropTypes.arrayOf(PropTypes.element).isRequired,
    // The action to fire if the list item is 'clicked'.
    action: PropTypes.func,
    // Will set the border style of the MobileListItem to dotted instead of the
    // default solid.
    dottedBorder: PropTypes.bool,
    // The icon will be displayed to the right of the contents.
    icon: PropTypes.string
  };

  static defaultProps = {
    dottedBorder: false,
    action: null,
    icon: null
  };

  render() {
    var icon = this.props.icon ? div({className: 'mobile-list-item-action ' + this.props.icon}) : null;

    return li({className: cx('mobile-list-item', {'dotted-border': this.props.dottedBorder}),
               onClick: this.props.action},
      // Note: In our integration tests we want to quickly reference the title text of an item,
      // so we assume that the first child of this div is the title.
      div({className: 'mobile-list-item-contents'}, this.props.contents),
      icon);
  }
});

class MobileListView extends React.Component {
  static propTypes = {
    // An array of contents to display in the list. Each array entry in an
    // object that corresponds to a MobileListItem. e.g.
    // [{contents: [...], action: function(){...}, icon: 'icon-blah'}, {contents: [...], ...}, ...
    //
    // See MobileListItem above for detailed descriptions of the expected fields.
    listItems: PropTypes.arrayOf(PropTypes.object).isRequired,
    // Will set the separator style of the MobileListItem to dotted instead of the default solid.
    dottedBorder: PropTypes.bool,
    // This is the message that will be displayed if the list is empty
    emptyListMessage: PropTypes.string
  };

  static defaultProps = {emptyListMessage: FrontendConstants.YOU_HAVE_NO_ITEMS_AT_THIS_TIME(FrontendConstants.ANALYTICS)};

  render() {
    // Build the list items from the passed in contents.
    var processedListItems = _.map(this.props.listItems, function(listItem, index) {
      return MobileListItem({contents: listItem.contents, dottedBorder: this.props.dottedBorder, action: listItem.action, icon: listItem.icon, key: index});
    }, this);

    return div({className: 'mobile-list-view'}, ul({className: 'mobile-list-view-list'}, _.isEmpty(processedListItems) ?
      EmptyContentNotice({noticeText: this.props.emptyListMessage}) :
      processedListItems));
  }
}

module.exports = MobileListView;
