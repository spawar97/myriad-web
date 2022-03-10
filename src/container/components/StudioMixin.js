var React = require('react');
var Imm = require('immutable');
var cx = require('classnames');
import DOM from 'react-dom-factories';

var InputBlockContainer = React.createFactory(require('./InputBlockContainer'));
var InputWithPlaceholder = React.createFactory(require('./InputWithPlaceholder'));
var ListItem = React.createFactory(require('./ListItem'));
var ExposureActions = require('../actions/ExposureActions');
var DataTypeConstants = require('../constants/DataTypeConstants');
var ExposureAppConstants = require('../constants/ExposureAppConstants');
var FrontendConstants = require('../constants/FrontendConstants');
var StatusMessageTypeConstants = require('../constants/StatusMessageTypeConstants');
var Util = require('../util/util');

var div = DOM.div;
var span = DOM.span;

var StudioMixin = {

  FILTER_TYPE_WIDTH: null,
  IMM_INTERLEAVE_PATH: Imm.List(['datasources', 'tables', 'columns']),
  SCHEMA_TREE_VIEW_HEIGHT: 400,

  getInitialState: function() {
    return {
      immTvSearchState: Imm.fromJS({
        isTvSearchByTable: false,
        tvExcludedDataSources: [],
        tvResultCounts: [0, 0, 0],
        tvShowAllTreeItems: true
      })
    };
  },

  handleResize: function() {
    this.setState({leftPanelWidth: $('.studio-editor').width(), rightPanelWidth: $('.studio-preview').width()});
  },

  handleTreeItemDoubleClick: function(immNodePath) {
    if (immNodePath.size < 3) {  // Only allow double-clicks on column nodes (where path length is 3).
      return;
    }
    var tableDotColumnShortName = immNodePath.takeLast(2).join('.'),
      immCqlQueryPointer = this.state.immCqlQueryPointer || Imm.Map({cqlQueryIndex: 0, caretPosition: -1}),
      cqlQueryIndex = immCqlQueryPointer.get('cqlQueryIndex'),
      caretPosition = immCqlQueryPointer.get('caretPosition'),
      originalCqlQuery = this.state.immCqlQueries.get(immCqlQueryPointer.get('cqlQueryIndex')),
      cqlQuery = (originalCqlQuery || 'select').replace(/ *;*$/, ''),
      newCqlQuery,
      stateObject = {};
    if (caretPosition === -1 || caretPosition >= _.size(originalCqlQuery)) {
      newCqlQuery = getNewCqlQuery(cqlQuery, '');
    } else {
      newCqlQuery = getNewCqlQuery(cqlQuery.substr(0, caretPosition), cqlQuery.substr(caretPosition));
    }
    stateObject.immCqlQueries = this.state.immCqlQueries.set(cqlQueryIndex, newCqlQuery);
    if (caretPosition > -1) {
      stateObject.immCqlQueryPointer = immCqlQueryPointer.set('caretPosition', caretPosition + _.size(newCqlQuery) - _.size(originalCqlQuery));
    }
    this.setState(stateObject, this.onTreeItemDoubleClick);

    function getNewCqlQuery(leftText, rightText) {
      // We trim the left and right text, determine the best separators to use and then add the separators to the text.
      var trimmedLeftText = leftText.replace(/ +$/,'');
      var trimmedRightText = rightText.replace(/^ +/,'');
      // If the word to the left is a field name (includes a `.`), we use ', ' as a separator, otherwise we use ' '.
      var leftSeparator = /\b(\w+\.)+\w+$/.test(trimmedLeftText) ? ', ' : ' ';
      // If the word to the right is a field name (includes a `.`), we use ', ' as a separator, otherwise we use ' '.
      var rightSeparator = /^(\w+\.)+\w+\b/.test(trimmedRightText) ? ', ' : ' ';
      var cql = trimmedLeftText + leftSeparator + tableDotColumnShortName + rightSeparator + trimmedRightText;
      // Remove any trailing spaces and add a `;` (required for cql parsing to work on the back end).
      return cql.replace(/ *$/, '') + ';';
    }
  },

  handleTreeItemExpandOrCollapse: function(immNodePath) {
    var immExpandedNodePath = (immNodePath.size > 1 ? immNodePath.splice(1, 0, 'tables') : immNodePath).unshift('datasources').push('expanded');
    var isExpanded = this.state.immWorkingCs.getIn(immExpandedNodePath, false);
    this.setState({immWorkingCs: this.state.immWorkingCs.setIn(immExpandedNodePath, !isExpanded)});
  },

  handleTreeItemSelection: function(immNodePath) {
    if (immNodePath.size === 3) {
      var immWorkingCs = this.state.immWorkingCs;
      if (this.state.immSelectedTreeViewItemPath) {
        immWorkingCs = immWorkingCs.setIn(this.IMM_INTERLEAVE_PATH.interleave(this.state.immSelectedTreeViewItemPath).push('selected'), false);
      }
      this.setState({
        immWorkingCs: immWorkingCs.setIn(this.IMM_INTERLEAVE_PATH.interleave(immNodePath).push('selected'), true),
        immSelectedTreeViewItemPath: immNodePath
      });
    }
  },

  handleTvSearch: function(immTvSearchState, e) {
    this.updateTvSearch(immTvSearchState, e.target.value);
  },

  handleTvToggleSearchField: function(tvSearchText) {
    this.updateTvSearch(this.state.immTvSearchState.set('isTvSearchByTable', !this.state.immTvSearchState.get('isTvSearchByTable')), tvSearchText);
  },

  updateTvSearch: function(immNewTvSearchState, tvSearchText) {
    var stateObject = {};
    var immWorkingCs = this.state.immWorkingCs.withMutations(function(mutWorkingCs) {
      var filterChanged = immNewTvSearchState.get('isTvSearchByTable') !== this.state.immTvSearchState.get('isTvSearchByTable');

      // Reset our counts. These will be updated during the search.
      var tvResultCounts = [0, 0, 0];

      mutWorkingCs.get('datasources').forEach(function(immDs, dsShortName) {
        if (!immNewTvSearchState.get('tvExcludedDataSources').contains(dsShortName)) {
          // This datasource is included in the search, search it.
          filterTreeViewSearchResults(
            mutWorkingCs,
            tvSearchText,
            Imm.List(['datasources', dsShortName]),
            immNewTvSearchState,
            tvResultCounts,
            filterChanged);
        } else {
          // Datasource is excluded from search, just mark it invisible.
          mutWorkingCs.setIn(['datasources', dsShortName, 'inSearch'], false);
        }
      }, this);

      stateObject.immTvSearchState = immNewTvSearchState.set('tvResultCounts', Imm.List(tvResultCounts));
    }.bind(this));

    this.setState(_.extend(stateObject, {immWorkingCs: immWorkingCs}));

    function filterTreeViewSearchResults(mutWorkingCs, tvSearchText, immKeyPath, immTvSearchState, tvResultCounts) {
      var isSearchTextEmpty = _.isEmpty(tvSearchText);
      var re = isSearchTextEmpty ? null : Util.escapedRegExp(tvSearchText, 'i');

      // Set the depth of the tree at which we want to match against our search
      // terms. If we're searching by columns then we want to match at depth 2, if
      // we're searching by tables then we match at depth 1.
      var searchDepth = immTvSearchState.get('isTvSearchByTable') ? 1 : 2;

      treeMapper(immKeyPath, 0);

      function treeMapper(immKeyPath, depth) {
        var immNode = mutWorkingCs.getIn(immKeyPath),
          visible = false;

        if (immNode.has('childrenName') && depth < searchDepth) {
          var immChildKeyPath = immKeyPath.push(immNode.get('childrenName'));
          mutWorkingCs.getIn(immChildKeyPath).forEach(function(immNode, key) {
            visible = treeMapper(immChildKeyPath.push(key), depth + 1) || visible;
          });
        }

        // If the search string is empty just set everything visible again.
        if (isSearchTextEmpty) {
          visible = true;
        } else if (depth === searchDepth) {
          // Only look deeper than the first level since we do not match on Datasource names.
          if (re.test(immNode.get('longName')) ||
            re.test(immNode.get('shortName')) ||
            // This tests in something like `public.dm.age` so that you can use full shortname syntax.
            re.test(immKeyPath.join('.').replace(/(datasources|tables|columns)\./g, '')+ immNode.get('shortName'))) {
            visible = immTvSearchState.get('tvShowAllTreeItems') || !!immNode.get('checkboxState');
          }
        }

        if (visible) {
          mutWorkingCs.setIn(immKeyPath.push('expanded'), true);
          tvResultCounts[depth]++;
        }
        mutWorkingCs.setIn(immKeyPath.push('inSearch'), visible);
        return visible;
      }
    }
  },

  addNewFieldInTable: function(immComprehendSchemas){
    var immSelectedTreeViewItemPath = this.state.immSelectedTreeViewItemPath;
    if (!_.isNull(immSelectedTreeViewItemPath)) {
      var immTreeItem = this.getImmTreeItem(immSelectedTreeViewItemPath);
      let tempTree = [immSelectedTreeViewItemPath.get(0), immSelectedTreeViewItemPath.get(1)];
      tempTree = Imm.List(tempTree);

      let fieldName = immTreeItem.get('longName');

      let clinicalAttributes = this.state.clinicalAttributes;

      clinicalAttributes = clinicalAttributes.map(attr=>{
        if(attr.fieldName == fieldName){
          fieldName = this.getImmTreeItem(tempTree).get('longName') + '-' + immTreeItem.get('longName')
        }
      })

      let selectedSchema = immComprehendSchemas.get(this.state.immWorkingCs.get('id'));
      var immIncludedDynamicFilter = {
        clinicalDbDetail: {
          datasource: immSelectedTreeViewItemPath.get(0),
          table: immSelectedTreeViewItemPath.get(1),
          column: immSelectedTreeViewItemPath.get(2),
          schema: selectedSchema.get('name'),
          dataType: immTreeItem.get('dataType'),
          dependOnAttributes: []
        },
        fieldName: fieldName
      };
      if(!(this.state.clinicalAttributes.filter((attr)=>{ 
        return attr.clinicalDbDetail.schema === immIncludedDynamicFilter.clinicalDbDetail.schema &&
              attr.clinicalDbDetail.table === immIncludedDynamicFilter.clinicalDbDetail.table &&
              attr.clinicalDbDetail.column === immIncludedDynamicFilter.clinicalDbDetail.column
      })).length){
        var filterType;
        switch (immTreeItem.get('dataType')) {
          case DataTypeConstants.DATE:
          case DataTypeConstants.DATETIME:
            filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_DATE;
            break;
          case DataTypeConstants.DECIMAL:
          case DataTypeConstants.INTEGER:
            filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER;
            break;
          case DataTypeConstants.BOOLEAN:
          case DataTypeConstants.STRING:
            filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN;
            break;
          default:
            // Data types `List` and `Null` are not supported (no messaging required since we should never see these types here).
            return;
        }
        immIncludedDynamicFilter.filterType = filterType;
        this.setState({clinicalAttributes: [...this.state.clinicalAttributes, immIncludedDynamicFilter]})
      }
    }
  },

  addNewIncludedDynamicFilter: function() {
    var immSelectedTreeViewItemPath = this.state.immSelectedTreeViewItemPath;
    if (!_.isNull(immSelectedTreeViewItemPath)) {
      var immTreeItem = this.getImmTreeItem(immSelectedTreeViewItemPath);
      var filterType;
      switch (immTreeItem.get('dataType')) {
        case DataTypeConstants.DATE:
        case DataTypeConstants.DATETIME:
        case DataTypeConstants.DECIMAL:
        case DataTypeConstants.INTEGER:
          filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_SLIDER;
          break;
        case DataTypeConstants.BOOLEAN:
        case DataTypeConstants.STRING:
          filterType = ExposureAppConstants.APPLIED_FILTER_TYPE_DROPDOWN;
          break;
        default:
          // Data types `List` and `Null` are not supported (no messaging required since we should never see these types here).
          return;
      }
      var immIncludedDynamicFilter = Imm.fromJS({
        column: {
          datasourceName: immSelectedTreeViewItemPath.get(0),
          nodeShortName: immSelectedTreeViewItemPath.get(1),
          propertyShortName: immSelectedTreeViewItemPath.get(2)},
        filterType: filterType
      });
      var immColumn = immIncludedDynamicFilter.get('column');
      var immIncludedDynamicFilters = this.state.immCurrentFile.get('includedDynamicFilters', Imm.List());
      if (immTreeItem.get('inSearch') && !immIncludedDynamicFilters.some(function(immIncludedDynamicFilter) { return Imm.is(immIncludedDynamicFilter.get('column'), immColumn); })) {
        this.setState({immCurrentFile: this.state.immCurrentFile.set('includedDynamicFilters', immIncludedDynamicFilters.push(immIncludedDynamicFilter))});
      }
    }
  },

  getIncludedStaticFilters: function(immCurrentFile) {
    return immCurrentFile.get('includedStaticFilters', Imm.List()).map(function(filter, idx) {
      return InputBlockContainer({
        key: 'static-filter-' + idx,
        class: cx('data-input', 'static-filter'),
        title: div({className: cx('entry-text', 'filter-title')}, FrontendConstants.STATIC_FILTER(idx + 1), span({className: 'icon-remove', onClick: this.handleRemoveStaticFilter.bind(null, idx)})),
        inputComponent: InputWithPlaceholder({
          type: 'text',
          key: 'parameter-measure-' + idx,
          className: cx('text-input', 'filter-input'),
          placeholder: FrontendConstants.ENTER_CQL,
          onChange: this.updateIncludedStaticFilters.bind(null, idx),
          value: filter})})
    }, this);
  },

  // Returns true if all dynamic filters are pointing to valid column entries.
  sanityCheckFilters: function(immCurrentFile) {
    let immIncludedDynamicFilterList = immCurrentFile.get('includedDynamicFilters', Imm.List());
    return immIncludedDynamicFilterList.every(immIncludedDynamicFilter => {
      let immColumn = immIncludedDynamicFilter.get('column');
      let immPath = this.getImmPath(immColumn);
      return !!this.getImmTreeItem(immPath);
    });
  },

  getIncludedDynamicFilters: function(immCurrentFile) {
    let immIncludedDynamicFilterList = immCurrentFile.get('includedDynamicFilters', Imm.List());
    return immIncludedDynamicFilterList.map((immIncludedDynamicFilter, idx) => {
      let immColumn = immIncludedDynamicFilter.get('column');
      let immPath = this.getImmPath(immColumn);
      let immTreeItem = this.getImmTreeItem(immPath);
      let content;
      let error = false;

      if (immTreeItem) {
        let columnLongName = immTreeItem.get('longName');
        let tableLongName = '';
        if (immIncludedDynamicFilterList.count(function(immIncludedDynamicFilter) {
            return this.getImmTreeItem(this.getImmPath(immIncludedDynamicFilter.get('column'))).get('longName') === columnLongName;
          }, this) > 1) {
          tableLongName = this.getImmTreeItem(immPath.take(2)).get('longName') + ' - ';
        }
        content = tableLongName + columnLongName;
      } else {
        error = true;
        content = `${FrontendConstants.ERROR_UNABLE_TO_RESOLVE} ${immColumn.get('nodeShortName', '')}.${immColumn.get('propertyShortName', '')}`;
      }
      return div({key: immPath.join('-'), className: 'applied-filter clearfix'},
        ListItem({
          content: content,
          icon: 'icon-close-alt',
          classnameSet: {error},
          onIconClick: this.deleteIncludedDynamicFilter.bind(null, idx)
        }));
    });
  },

  getImmPath: function (immColumn) {
    return Imm.List([immColumn.get('datasourceName'), immColumn.get('nodeShortName'), immColumn.get('propertyShortName')]);
  },

  getImmTreeItem: function(immPath) {
    return this.state.immWorkingCs.getIn(this.IMM_INTERLEAVE_PATH.interleave(immPath));
  },

  getWorkingCs: function(immComprehendSchema) {
    // Note that the internal `Imm.Map`s below are used to convert a JavaScript array of arrays into an immutable map, i.e.
    // Imm.Map([['a': 1], ['b': 2]])  =>  {a: 1, b: 2}
    // which unfortunately cannot be produced by `Imm.List().map().toMap()`.
    return Imm.Map({
      id: immComprehendSchema.get('id'),
      datasources: Imm.Map(immComprehendSchema.get('datasources').map(function(immDatasource) {
        return [
          immDatasource.get('shortName'),
          Imm.Map({
            shortName: immDatasource.get('shortName'),
            tables: Imm.Map(immDatasource.get('nodes').map(function(immNode) {
              return [
                immNode.get('shortName'),
                Imm.Map({
                  shortName: immNode.get('shortName'),
                  longName: immNode.get('longName'),
                  columns: Imm.Map(immNode.get('properties').map(function(immProperty) {
                    return [
                      immProperty.get('shortName'),
                      Imm.Map({
                        shortName: immProperty.get('shortName'),
                        longName: immProperty.get('longName'),
                        dataType: immProperty.get('dataType'),
                        inSearch: true})];
                  }).toJS()),
                  childrenName: 'columns',
                  inSearch: true})];
            }).toJS()),
            childrenName: 'tables',
            inSearch: true})];
      }).toJS())
    });
  },

  updateIncludedStaticFilters: function(idx, e) {
    this.setState({immCurrentFile: this.state.immCurrentFile.setIn(['includedStaticFilters', idx], e.target.value)});
  },

  handleAddStaticFilter: function() {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('includedStaticFilters', this.state.immCurrentFile.get('includedStaticFilters').push(null))});
  },

  handleRemoveStaticFilter: function(idx) {
    ExposureActions.createStatusMessage(FrontendConstants.YOU_HAVE_DELETED_FILTER(FrontendConstants.STATIC, idx + 1), StatusMessageTypeConstants.TOAST_SUCCESS);
    this.setState({immCurrentFile: this.state.immCurrentFile.deleteIn(['includedStaticFilters', idx])});
  },

  deleteIncludedDynamicFilter: function(idx) {
    this.setState({immCurrentFile: this.state.immCurrentFile.set('includedDynamicFilters', this.state.immCurrentFile.get('includedDynamicFilters').splice(idx, 1))});
  }
};

module.exports = StudioMixin;
