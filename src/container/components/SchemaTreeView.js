var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var cx = require('classnames');
var Imm = require('immutable');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Combobox = React.createFactory(require('./Combobox'));
var SimpleButtonArray = React.createFactory(require('./SimpleButtonArray'));
var SimpleDropdown = React.createFactory(require('./SimpleDropdown'));
var Spinner = React.createFactory(require('./Spinner'));
var TreeItem = React.createFactory(require('./TreeItem'));
var AdminActions = require('../actions/AdminActions.js');

var div = DOM.div,
    hr = DOM.hr,
    input = DOM.input,
    span = DOM.span;

class SchemaTreeView extends React.Component {
  static displayName = 'SchemaTreeView';

  static propTypes = {
    immTvSearchState: PropTypes.instanceOf(Imm.Map).isRequired,
    maxDepth: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    columnCheckboxOnly: PropTypes.bool,
    disableSearch: PropTypes.bool,
    disableToggleButtons: PropTypes.bool,  // If this property is set as true, the ALL/IN SCHEMA toggle button group will not be rendered.
    gppMode: PropTypes.bool,
    handleColumnSearchFieldDropdown: PropTypes.func,
    handleTreeItemCheckboxClick: PropTypes.func,
    handleTreeItemDoubleClick: PropTypes.func,
    handleTreeItemExpandOrCollapse: PropTypes.func,
    handleTreeItemSelection: PropTypes.func,
    handleTvSearch: PropTypes.func,
    handleTvToggleSearchField: PropTypes.func,
    height: PropTypes.number,
    immAdminStore: PropTypes.instanceOf(Imm.Map),
    immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map),
    noCheckboxes: PropTypes.bool,
    noSearchBoxMargin: PropTypes.bool,
    noSideNavBorder: PropTypes.bool,
    noTooltips: PropTypes.bool,
    searchColumnOnly: PropTypes.bool,
    tvSearchText: PropTypes.string
  };

  // Do a recursive depth-first traversal of the tree data and
  // display entries based on the curent settings.
  generateTreeView = (immNodeMap, depth, immNodeShortNamePath) => {
    // 200 is for search box width, 100px is for padding.
    // 30px is the padding between each TreeItem and the vertical scrollbar + the vertical scrollbar width.
    var treeItemWidth = (this.props.gppMode ? (this.props.width - 300) : this.props.width) - 30;
    // A tree view list consists of the TreeItem for the currentNode
    // followed by the TreeItems generated from the depth first
    // traversal of its children.
    return immNodeMap.sort(comparator).reduce(function(immTreeItems, immNode) {
      // childrenName will be either 'tables' or 'columns'.
      var childrenName = immNode.get('childrenName');
      var immChildNodeShortNamePath = immNodeShortNamePath.push(immNode.get('shortName'));
      // Only print the highest level of the tree and unselected items
      // if user has selected to do so.
      if (immNode.get('inSearch') && (this.props.immTvSearchState.get('tvShowAllTreeItems') || !!immNode.get('checkboxState'))) {
        immTreeItems = immTreeItems.push(TreeItem({key: immChildNodeShortNamePath.join('.'),
                                                   depth: depth,
                                                   maxDepth: this.props.maxDepth,
                                                   immNode: immNode,
                                                   immNodePath: immChildNodeShortNamePath,
                                                   width: treeItemWidth,
                                                   noCheckboxes: this.props.noCheckboxes,
                                                   disableCheckbox: this.props.columnCheckboxOnly ? depth !== 2 : false,
                                                   handleTreeItemCheckboxClick: this.props.handleTreeItemCheckboxClick,
                                                   handleTreeItemDoubleClick: this.props.handleTreeItemDoubleClick,
                                                   handleTreeItemSelection: this.props.handleTreeItemSelection,
                                                   handleTreeItemExpandOrCollapse: this.props.handleTreeItemExpandOrCollapse,
                                                   noTooltips: this.props.noTooltips}));

        // If this node is expanded and has children, we create TreeItem
        // components for them as well.
        if (depth < this.props.maxDepth && immNode.get('expanded')) {
          immTreeItems = immTreeItems.concat(this.generateTreeView(immNode.get(childrenName), depth + 1, immChildNodeShortNamePath));
        }
      }
      return immTreeItems;
    }, Imm.List(), this);

    function comparator(immMap1, immMap2) {
      var name1 = displayName(immMap1), name2 = displayName(immMap2);
      return name1 < name2 ? -1 : name1 > name2 ? 1 : 0;

      function displayName(immMap) {
        var longName = immMap.get('longName');
        return (_.isEmpty(longName) ? immMap.get('shortName') : longName).toLowerCase();
      }
    }
  };

  toggleShowAllTreeItems = () => {
    AdminActions.updateTvSearch(this.props.immTvSearchState.set('tvShowAllTreeItems', !this.props.immTvSearchState.get('tvShowAllTreeItems')), false);
  };

  handleDbDropdownSelection = (dbConnectionName) => {
    AdminActions.setDbConnectionName(dbConnectionName);
  };

  getDbConnectionString = (immDbInfo) => {
    return immDbInfo.get('dbHost') + ':' + immDbInfo.get('dbPort') + '/' + immDbInfo.get('dbName');
  };

  render() {
    var immTreeItems, treeItemsJs;
    if (this.props.datasourcesAreLoading || _.isNull(this.props.immWorkingCsDatasources)) {
      treeItemsJs = div({className: 'spinner-container'}, div({className: 'spinner'}));
    } else {
      immTreeItems = this.generateTreeView(this.props.immWorkingCsDatasources, 0, Imm.List());
      treeItemsJs = immTreeItems.isEmpty() ? span(null, 'Search returned no results.') : immTreeItems.toJS();
    }

    // 162 = 40 for hr + 74 for button + 48 for search bar.
    var treeWindowHeight = (this.props.height - 162) + 'px';
    // 200 is for search box width, 100px is for padding.
    var treeWindowWidth = this.props.gppMode ? (this.props.width - 300) : this.props.width;
    var toggleButtons = this.props.disableToggleButtons ? null :
      div({className: 'admin-edit-schema-button'},
          SimpleButtonArray({buttons: [{text: 'ALL'}, {text: 'IN SCHEMA'}], onClick: this.toggleShowAllTreeItems}));

    var immAdminStore = this.props.immAdminStore;
    var immWorkingCs = immAdminStore ? immAdminStore.get('workingCs') : null;
    var dbConnectionDropdown = null;
    if (immWorkingCs) {
      var dbDropdownData = immAdminStore.get('accountClinicalDBs').map(function (immDbInfo, name) {
        return immDbInfo.merge({name: name, text: name + ': ' + immDbInfo.get('dbCustomerName')});
      }.bind(this)).valueSeq().toList();
      dbConnectionDropdown = Combobox({
        className: 'schema-tree-view-db-select-dropdown',
        value: immWorkingCs.get('dbConnectionName'),
        valueKey: 'name',
        labelKey: 'text',
        onChange: this.handleDbDropdownSelection,
        options: dbDropdownData
      });
    }

    return div({className: cx({'schema-tree-view': true, 'no-border': this.props.noSideNavBorder}),
                style: {width: this.props.width}},
               dbConnectionDropdown,
               toggleButtons,
               this.props.disableSearch ? null :
               TreeViewSearch({immWorkingCsDatasources: this.props.immWorkingCsDatasources,
                               immTvSearchState: this.props.immTvSearchState,
                               noSideNavBorder: this.props.noSideNavBorder,
                               handleTvSearch: this.props.handleTvSearch,
                               handleTvToggleSearchField: this.props.handleTvToggleSearchField,
                               noSearchBoxMargin: this.props.noSearchBoxMargin,
                               searchColumnOnly: this.props.searchColumnOnly,
                               handleColumnSearchFieldDropdown: this.props.handleColumnSearchFieldDropdown,
                               gppMode: this.props.gppMode,
                               tvSearchText: this.props.tvSearchText}),
               !this.props.immTvSearchState.get('searchInProgress') ?
                 div({className: 'schema-tree-items', style: {height: this.props.height ? treeWindowHeight : null, width: treeWindowWidth}}, div(null, treeItemsJs)) :
                 Spinner());
  }
}

var TreeViewDropdown = React.createFactory(class extends React.Component {
  static displayName = 'TreeViewDropdown';

  static propTypes = {
    immTvSearchState: PropTypes.instanceOf(Imm.Map).isRequired,
    handleTvToggleSearchField: PropTypes.func,
    immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map),
    tvSearchText: PropTypes.string
  };

  toggleDatasource = (dsShortName, exclude) => {
    var immNewExcludeList = this.props.immTvSearchState.get('tvExcludedDataSources');
    if (exclude) {
      immNewExcludeList = immNewExcludeList.push(dsShortName);
    } else {
      immNewExcludeList = immNewExcludeList.filter(function(dsName) { return dsName !== dsShortName; });
    }

    AdminActions.updateTvSearch(this.props.immTvSearchState.set('tvExcludedDataSources', immNewExcludeList), false);
  };

  getSelectedDatasources = () => {
    // We reduce a JavaScript array here because `Imm.List().map( << div >> ).toJS()` results in
    // Warning: Any use of a keyed object should be wrapped in React.addons.createFragment(object) before being passed as a child.
    // Also note that `Imm.List().map( << div >> ).toArray()` does not produce the desired result.
    return _.isNull(this.props.immWorkingCsDatasources) ? null : this.props.immWorkingCsDatasources.reduce(function(memo, immDs) {
      var checked = !this.props.immTvSearchState.get('tvExcludedDataSources').contains(immDs.get('shortName'));
      var checkmark = checked ? div({className: 'icon-checkmark-full'}) : null;

      memo.push(
        div({className: 'schema-tree-view-datasource',
             key: immDs.get('shortName'),
             onClick: this.toggleDatasource.bind(null, immDs.get('shortName'), checked)},
          span({className: cx({checked: checked})}, immDs.get('shortName')),
          checkmark));
      return memo;
    }, [], this);
  };

  toggleSearchField = () => {
    AdminActions.updateTvSearch(this.props.immTvSearchState.set('isTvSearchByTable', !this.props.immTvSearchState.get('isTvSearchByTable')), this.props.tvSearchText, false);
  };

  render() {
    var labelOne = div({className: 'dropdown-label'}, 'Search for');
    var searchToggle = SimpleButtonArray({buttons: [{text: 'Table'}, {text: 'Column'}],
                                          activeButtonKey: this.props.immTvSearchState.get('isTvSearchByTable') ? 0 : 1,
                                          onClick: this.props.handleTvToggleSearchField ? this.props.handleTvToggleSearchField.bind(null, this.props.tvSearchText) : this.toggleSearchField});
    var labelTwo = div({className: 'dropdown-label'}, 'Search in');
    var dsSelectors = div({className: 'schema-tree-view-datasource-container'}, this.getSelectedDatasources());
    var dropdownContent = div(null,
                              labelOne,
                              searchToggle,
                              hr(null),
                              labelTwo,
                              dsSelectors);

    return SimpleDropdown({
      selectCheckDisabled: true,
      hoverDisabled: true,
      rightAlign: true,
      disableItemClick: true,
      opener: div({className: 'icon-cog'}),
      scrollbarDisabled: true,
      items: [{name: dropdownContent}]
    });
  }
});

var TreeViewColumnOnlyDropdown = React.createFactory(class extends React.Component {
  static displayName = 'TreeViewColumnOnlyDropdown';

  static propTypes = {
    immTvSearchState: PropTypes.instanceOf(Imm.Map).isRequired,
    handleColumnSearchFieldDropdown: PropTypes.func.isRequired
  };

  render() {
    var labelOne = div({className: 'dropdown-label'}, 'Search with');
    var dropdownItems = ['Long & Short Name', 'Long Name', 'Short Name'];
    var dropdownSelector = SimpleDropdown({
      rightAlign: true,
      selectedIndex: _.indexOf(dropdownItems, this.props.immTvSearchState.get('searchField'), this),
      scrollbarDisabled: true,
      onChange: this.props.handleColumnSearchFieldDropdown,
      items: _.map(dropdownItems, function(item) { return {name: item}; })
    });
    var dropdownContent = div(null,
      labelOne,
      div({className: 'search-with'}, dropdownSelector));

    return SimpleDropdown({
      selectCheckDisabled: true,
      hoverDisabled: true,
      rightAlign: true,
      disableItemClick: true,
      opener: div({className: 'icon-cog'}),
      scrollbarDisabled: true,
      items: [{name: dropdownContent}]
    });
  }
});

var TreeViewSearch = React.createFactory(class extends React.Component {
  static displayName = 'TreeViewSearch';

  static propTypes = {
    handleTvSearch: PropTypes.func.isRequired,
    immTvSearchState: PropTypes.instanceOf(Imm.Map).isRequired,
    gppMode: PropTypes.bool,
    handleColumnSearchFieldDropdown: PropTypes.func,
    handleTvToggleSearchField: PropTypes.func,
    immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map),
    noSearchBoxMargin: PropTypes.bool,
    noSideNavBorder: PropTypes.bool,
    searchColumnOnly: PropTypes.bool,
    tvSearchText: PropTypes.string
  };

  focusOnInput = () => {
    $(ReactDOM.findDOMNode(this.refs['tvSearchBox'])).focus();
  };

  // Conditionally render the clear cross icon. The clear cross icon
  // should only be rendered if there is text in the search field to
  // be cleared.
  getTvSearchClearCross = () => {
    var searchClear = null;
    if (!_.isEmpty(this.props.tvSearchText)) {
      searchClear = span({className: 'icon-close', onClick: this.handleSearchClose});
    }
    return div({className: 'schema-tree-view-search-cancel'}, searchClear);
  };

  getTvSearchSummary = () => {
    var summaryText = null;

    if (!_.isEmpty(this.props.tvSearchText)) {
      var immTvResultCounts = this.props.immTvSearchState.get('tvResultCounts');
      var ds = immTvResultCounts.get(0);
      var tables = immTvResultCounts.get(1);
      var cols = immTvResultCounts.get(2);

      summaryText = this.props.immTvSearchState.get('isTvSearchByTable') ?
        span({className: 'summary-text-container'},
             span({className: 'summary-text'}, 'Showing '),
             span({className: 'summary-text bold'}, tables + ' tables, '),
             span({className: 'summary-text'}, ds + ' datasources')) :
        span({className: 'summary-text-container'},
             span({className: 'summary-text'}, 'Showing '),
             span({className: 'summary-text bold'}, cols + ' columns'),
             span({className: 'summary-text'}, ' from ' + tables + ' tables, ' + ds + ' datasources'));
    }

    return summaryText;
  };

  handleTvSearch = (e) => {
    this.props.handleTvSearch(this.props.immTvSearchState, e);
  };

  // If the user clicks on the search clear button clear the search string
  // and data source selections.
  handleSearchClose = () => {
    $(ReactDOM.findDOMNode(this.refs['tvSearchBox'])).val('');
    this.props.handleTvSearch(this.props.immTvSearchState, {target: {value: ''}});
  };

  render() {
    var searchDropDown = this.props.searchColumnOnly ?
      TreeViewColumnOnlyDropdown({
        immTvSearchState: this.props.immTvSearchState,
        handleColumnSearchFieldDropdown: this.props.handleColumnSearchFieldDropdown
      }) :
      TreeViewDropdown({
        handleTvToggleSearchField: this.props.handleTvToggleSearchField,
        immWorkingCsDatasources: this.props.immWorkingCsDatasources,
        immTvSearchState: this.props.immTvSearchState,
        tvSearchText: this.props.tvSearchText});
    var clearCross = this.getTvSearchClearCross();
    var searchSummary = this.getTvSearchSummary();

    return div({className: cx({'schema-tree-view-search': true, 'gpp-mode': this.props.gppMode})},
               div({className: cx({'schema-tree-view-search-box': true, 'no-margin': this.props.noSearchBoxMargin})},
                   div({className: cx({'nav-tree': !this.props.searchColumnOnly, 'modal': this.props.searchColumnOnly})}, searchDropDown),
                   input({type: 'text',
                          value: this.props.tvSearchText,
                          placeholder: 'Search' + (this.props.searchColumnOnly ? ' for child column' : ''),
                          ref: 'tvSearchBox',
                          onChange: this.handleTvSearch}),
                   clearCross,
                   div({className: 'schema-tree-view-search-icon',
                        onClick: this.focusOnInput},
                       div({className: 'icon icon-search'}))),
               !this.props.immTvSearchState.get('searchInProgress') ? div(null, searchSummary, this.props.noSideNavBorder ? null : hr({className: 'dotted-hr dark'})) : null);
  }
});

module.exports = SchemaTreeView;
