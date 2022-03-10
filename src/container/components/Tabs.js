var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var cx = require('classnames');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;

class Tabs extends React.Component {
  static displayName = 'Tabs';

  static propTypes = {
    disabledTabs: PropTypes.array.isRequired,
    handleTabSelect: PropTypes.func.isRequired,
    selectedTab: PropTypes.string.isRequired,
    tabNames: PropTypes.array.isRequired,
    tabNameMap: PropTypes.object.isRequired
  };

  shouldComponentUpdate(nextProps, nextState) {
    return ShallowCompare(this, nextProps, nextState);
  }

  switchTab = (tab) => {
    this.props.handleTabSelect(tab);
  };

  elementForTab = (tab) => {
    var isTabDisabled = _.indexOf(this.props.disabledTabs, tab) !== -1;
    return div({
      key: 'tab-' + tab,
      className: cx('tab', 'tab-' + tab.toLowerCase(), {selected: this.props.selectedTab === tab, disabled: isTabDisabled}),
      onClick: isTabDisabled ? _.noop : this.switchTab.bind(null, tab)
    }, this.props.tabNameMap[tab]);
  };

  render() {
    var elements = this.props.tabNames.map(function(tab) {
      return this.elementForTab(tab);
    }.bind(this));

    return div({className: 'tabs'},
      div(null, elements)
    );
  }
}

module.exports = Tabs;
