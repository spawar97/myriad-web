var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var $ = require('jquery');
var cx = require('classnames');
var FixedDataTable = require('fixed-data-table');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var Checkbox = React.createFactory(require('../Checkbox'));
var Combobox = React.createFactory(require('../Combobox'));
var ExposureActions = require('../../actions/ExposureActions');
var FrontendConstants = require('../../constants/FrontendConstants');
var HttpResponseConstants = require('../../constants/HttpResponseConstants');
var AppRequest = require('../../http/AppRequest');
var GA = require('../../util/GoogleAnalytics');
var Util = require('../../util/util');

// These classes are dependent on the FixedDataTable class.
var Column = React.createFactory(FixedDataTable.Column);
var Table = React.createFactory(FixedDataTable.Table);

var div = React.createFactory(require('../TouchComponents').TouchDiv);
var span = React.createFactory(require('../TouchComponents').TouchSpan);

class DataSelector extends React.Component {
  static displayName = 'DataSelector';

  static propTypes = {
    canSelectEntireTable: PropTypes.bool,
    comprehendSchemaId: PropTypes.string.isRequired,
    immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
    nodeSelectionHandler: PropTypes.func.isRequired,
    includeDatasourceInSelection: PropTypes.bool,
    width: PropTypes.number,
    inSelectableMode: PropTypes.bool,
    noInteractions: PropTypes.bool
  };

  static defaultProps = {
    inSelectableMode: true
  };

  constructor(props, context) {
    super(props, context);
    var datasourceName, immSelectableTables;
    var immComprehendSchema = props.immExposureStore.getIn(['comprehendSchemas', props.comprehendSchemaId]);
    if (immComprehendSchema) {
      immSelectableTables = immComprehendSchema.get('datasources').flatMap(function(immDatasource) {
        datasourceName = immDatasource.get('shortName');
        return immDatasource.get('nodes').flatMap(function(immNode) {
          if (immNode.get('isVisible') !== false) {  // Note: the node is visible if `isVisible` is undefined or true.
            return [immNode.set('datasourceName', datasourceName)];
          }
        });
      }).sortBy(Util.immPluck('longName'));
    } else {
      var immDatasources = props.immExposureStore.getIn(['comprehendSchemaOverviews', props.comprehendSchemaId]);
      immSelectableTables = immDatasources ? this.getSelectableTables(immDatasources) : Imm.List();
    }

    this.state = {
      highlightColumn: null,
      immSelectedTable: null,
      immTables: Imm.Map(),
      numDataRows: this.getNumDataRows(),
      immSelectableTables: immSelectableTables,
      selectedColumn: null,
      selectedAll: false
    };
  }

  oldRequest = null;

  getWidth = () => {
    return $(ReactDOM.findDOMNode(this)).width();
  };

  componentDidMount() {
    if (this.state.immSelectableTables.isEmpty()) {
      var url = '/api/comprehend-schema-overview/' + this.props.comprehendSchemaId;
      AppRequest({type: 'GET', url: url}).then(
        function(data) {
          var immDatasources = Imm.Map(Imm.fromJS(data).map(function(immDatasource) {
            var datasourceName = immDatasource.get('shortName');
            var immNodes = Imm.Map(immDatasource.get('nodeDescriptors').map(function(immNode) {
              return [immNode.get('shortName'), immNode.set('datasourceName', datasourceName)];
            }));
            return [immDatasource.get('shortName'), immNodes];
          }));
          this.setState({datasourceName: data.datasourceName, immSelectableTables: this.getSelectableTables(immDatasources)});
          ExposureActions.setComprehendSchemaOverview(this.props.comprehendSchemaId, immDatasources);
        }.bind(this),
        function(jqXHR) {
          this.oldRequest = null;
          console.log('%cERROR: GET ' + url + ' failed.', 'color: #E05353');
          GA.sendAjaxException('GET ', url, ' failed.', jqXHR.status);
        }.bind(this)
      );
    }
    if (Util.isNotDesktop()) {
      window.addEventListener('orientationchange', this.onOrientationChange);
    }
  }

  componentWillUpdate(nextProps) {
    if (this.props.inSelectableMode && !nextProps.inSelectableMode) {
      this.setState({highlightColumn: null, selectedColumn: null});
    }
  }

  componentDidUpdate() {
    if (this.state.dataTableWidth !== this.getWidth()) {
      this.setState({dataTableWidth: this.getWidth()});
    }
  }

  componentWillUnmount() {
    if (Util.isNotDesktop()) {
      window.removeEventListener('orientationchange', this.onOrientationChange);
    }
  }

  getNumDataRows = () => {
    return Util.isNotDesktop() && !Util.isPortrait() ? 3 : 5;
  };

  getSelectableTables = (immDatasources) => {
    return immDatasources.toList().flatMap(function(immNodes) { return immNodes.toList(); }).sortBy(Util.immPluck('longName'));
  };

  handleSelectTable = (dropdownItem) => {
    var immExposureStore = this.props.immExposureStore;
    var comprehendSchemaId = this.props.comprehendSchemaId;
    var datasourceName = dropdownItem.datasourceName;
    var nodeShortName = dropdownItem.shortName;

    // We want `immSelectedTable` to contain `datasourceName`, `shortName`, `longName`,
    // `properties`, and `sampleDataRows` before rendering its preview table. In case A &
    // B, the retrieved table contains everything we need. In case C, it contains
    // everything except `sampleDataRows` which we'll need to fetch. In case D, we need to
    // fetch the properties ( `List[PropertyDescriptor]` ) in addition to the
    // `sampleDataRows`.
    var immSelectedTable = this.state.immTables.getIn([datasourceName, nodeShortName]) ||  // Case A.
      immExposureStore.getIn(['comprehendSchemaOverviews', comprehendSchemaId, datasourceName, nodeShortName]) ||  // Case B.
      immExposureStore.getIn(['comprehendSchemas', comprehendSchemaId, 'datasources', datasourceName, 'nodes'], Imm.List())  // Case C.
        .find(function(node) { return node.get('shortName') === nodeShortName; }) ||
      Imm.fromJS(dropdownItem);  // Case D.

    if (immSelectedTable.has('properties') && !immSelectedTable.has('sampleDataRows')) {
      // If the node was pulled from a comprehendSchema we need to strip out invisible properties.
      var immVisibleProperties = immSelectedTable.get('properties').filter(function(immProperty) {
        return immProperty.get('isVisible') !== false;  // Note: the property is visible if `isVisible` is undefined or true.
      });
      immSelectedTable = immSelectedTable.set('properties', immVisibleProperties);
    }

    if (immSelectedTable.has('sampleDataRows')) {
      // immSelectedTable contains everything we need.
      this.setState({immSelectedTable: immSelectedTable, highlightColumn: null, selectedColumn: null});
    } else {
      // We need to fetch the sample data.
      // If we don't have a comprehendSchema then we also need to fetch the property descriptors.
      var fetchPropertyDescriptors = !immSelectedTable.has('properties');
      if (this.oldRequest) {
        this.oldRequest.abort();
      }
      var url = '/api/comprehend-schema-table/' + comprehendSchemaId + '/' + Util.pgEscapeDoubleQuote(datasourceName) + '/' + Util.pgEscapeDoubleQuote(nodeShortName) +
        (fetchPropertyDescriptors ? '?fetchPropertyDescriptors=true' : '');
      (this.oldRequest = AppRequest({type: 'GET', url: url})).then(
        function(data) {
          this.oldRequest = null;
          immSelectedTable = immSelectedTable.set('sampleDataRows', Imm.fromJS(data.values));
          if (fetchPropertyDescriptors) {
            immSelectedTable = immSelectedTable.set('properties', Imm.fromJS(data.propertyDescriptors));
          }
          // We cache `immSelectedTable` for the duration of this session.
          ExposureActions.setComprehendSchemaOverviewTable(comprehendSchemaId, datasourceName, nodeShortName, immSelectedTable);
          this.setState({
            immSelectedTable: immSelectedTable,
            immTables: this.state.immTables.setIn([datasourceName, nodeShortName], immSelectedTable),
            highlightColumn: null,
            selectedColumn: null
          });
        }.bind(this),
        function(jqXHR) {
          this.oldRequest = null;
          if (jqXHR.statusText !== HttpResponseConstants.STATUS_TEXT.ABORT) {
            console.log('%cERROR: GET ' + url + ' failed.', 'color: #E05353');
            GA.sendAjaxException('GET ', url, ' failed.', jqXHR.status);
          }
        }.bind(this)
      );
    }
  };

  toggleSelectAll = () => {
    var column = null;
    if (!this.state.selectedAll) {
      column = '*';  // When the whole table is selected, the column is '*'.
    }
    this.setState({selectedColumn: column, selectedAll: !this.state.selectedAll});
    this.sendSelection(column);
  };

  selectColumn = (columnShortName) => {
    this.setState({selectedColumn: columnShortName, selectedAll: false});
    this.sendSelection(columnShortName);
  };

  sendSelection = (columnShortName) => {
    var datasourceName = this.props.includeDatasourceInSelection ? this.state.immSelectedTable.get('datasourceName') + '.' : '';
    this.props.nodeSelectionHandler(columnShortName ? datasourceName + this.state.immSelectedTable.get('shortName') + '.' + columnShortName : null);
  };

  onMouseEnter = (columnShortName) => {
    this.setState({highlightColumn: columnShortName});
  };

  onMouseLeave = (columnShortName) => {
    if (this.state.highlightColumn === columnShortName) {
      this.setState({highlightColumn: null});
    }
  };

  onOrientationChange = () => {
    this.setState({numDataRows: this.getNumDataRows()});
  };

  createPreviewTable = () => {
    var hasInteractions = this.props.inSelectableMode;
    var immColumns = this.state.immSelectedTable.get('properties');
    var immColumnLongNames = Imm.Map(immColumns.map(function(immColumn) {
      return [immColumn.get('shortName'), immColumn.get('longName')];
    }));
    var rows = this.state.immSelectedTable.get('sampleDataRows').take(this.state.numDataRows).toJS();
    var boldCtx = Util.get2dCanvasContext('bold 14px ' + Util.getWidestFont());
    var normalCtx = Util.get2dCanvasContext('normal 14px ' + Util.getWidestFont());
    var COLUMN_PADDING_PLUS_BORDER = 41;
    var headerWidths = immColumns.reduce(function(memo, col) {
      var shortName = col.get('shortName');
      memo[shortName] = _.max([
          boldCtx.measureText(col.get('longName')).width,
          normalCtx.measureText(shortName).width]
        ) + COLUMN_PADDING_PLUS_BORDER;
      return memo;
    }, {});
    var colMinWidths = _.reduce(rows, function(memo, row) {
      _.each(row, function(value, shortName) {
        memo[shortName] = _.max([memo[shortName], normalCtx.measureText(value).width + COLUMN_PADDING_PLUS_BORDER]);
      });
      return memo;
    }, headerWidths);

    var DATA_TABLE_WIDTH = this.props.width || this.state.dataTableWidth;
    var totalWidth = _.reduce(colMinWidths, function(memo, num) { return memo + num; }, 0);
    var extraPadding = _.max([0, (DATA_TABLE_WIDTH - totalWidth) / immColumns.size]);

    var headerRenderer = function(columnShortName) {
      return div({
          className: cx(
            'column-header-container',
            {highlight: this.state.selectedColumn === columnShortName || this.state.highlightColumn === columnShortName || this.state.selectedAll}),
          onClick: hasInteractions ? this.selectColumn.bind(null, columnShortName) : null,
          onMouseEnter: hasInteractions ? this.onMouseEnter.bind(null, columnShortName) : null,
          onMouseLeave: hasInteractions ? this.onMouseLeave.bind(null, columnShortName) : null},
        div({className: cx('fixed-data-table-header-contents', 'column-header', 'virtual-table')},
          div({className: 'virtual-table-row'},
            div({className: cx('virtual-table-cell', 'column-long-name')}, immColumnLongNames.get(columnShortName))),
          div({className: 'virtual-table-row'},
            div({className: cx('virtual-table-cell', 'column-short-name')}, columnShortName))));
    }.bind(this);

    var cellRenderer = function(cellData, columnShortName) {
      return div({
          className: cx(
            'cell-container',
            {highlight: this.state.selectedColumn === columnShortName || this.state.highlightColumn === columnShortName || this.state.selectedAll}),
          onClick: hasInteractions ? this.selectColumn.bind(null, columnShortName) : null,
          onMouseEnter: hasInteractions ? this.onMouseEnter.bind(null, columnShortName) : null,
          onMouseLeave: hasInteractions ? this.onMouseLeave.bind(null, columnShortName) : null},
        div({className: cx('virtual-table')},
          div({className: 'virtual-table-row'}, div({className: cx('virtual-table-cell', 'cell-data')}, cellData))));
    }.bind(this);

    var tArgs = _.map(colMinWidths, function(width, shortName) {
      return Column({
        label: shortName,
        dataKey: shortName,
        minWidth: width + extraPadding,
        width: width + extraPadding,
        headerRenderer: headerRenderer,
        cellRenderer: cellRenderer
      });
    });

    var DATA_TABLE_ROW_HEIGHT = 40;
    var HEADER_ROWS = 2;
    var SCROLLBAR_HEIGHT = 17;
    var isDesktop = Util.isDesktop();
    tArgs.unshift({
      headerHeight: HEADER_ROWS * DATA_TABLE_ROW_HEIGHT,
      height: (HEADER_ROWS + this.state.numDataRows) * DATA_TABLE_ROW_HEIGHT + SCROLLBAR_HEIGHT,
      width: isDesktop ? DATA_TABLE_WIDTH : totalWidth,
      rowHeight: DATA_TABLE_ROW_HEIGHT,
      rowsCount: _.size(rows),
      rowGetter: function(i) { return rows[i]; },
      overflowX: isDesktop ? 'auto' : 'hidden',
      overflowY: isDesktop ? 'auto' : 'hidden'
    });

    return Table.apply(null, tArgs);
  };

  tableDropdownItem = (option) => {
    return span({className: 'table-dropdown-item'},
      span({className: 'long-name'}, option.longName),
      span({className: 'short-name'}, option.shortName)
    );
  };

  render() {
    var hasInteractions = this.props.inSelectableMode;
    var tableSelected = !_.isNull(this.state.immSelectedTable);
    var tablePreview = tableSelected ?
      div({className: cx('table-preview', {disabled: !hasInteractions})}, this.createPreviewTable()) :
      div({className: 'table-preview-placeholder'}, FrontendConstants.TABLE_PREVIEWS_HERE);

    return div({className: 'data-selector'},
      div({className: 'table-dropdown-header'}, FrontendConstants.TABLE),
      Combobox({
        className: 'table-selector-dropdown',
        placeholder: FrontendConstants.PLEASE_SELECT_A_TABLE,
        valueKey: 'shortName',
        labelKey: 'longName',
        optionRenderer: this.tableDropdownItem,
        valueRenderer: this.tableDropdownItem,
        autoblur: false,
        value: tableSelected ? this.state.immSelectedTable : null,
        onChange: this.handleSelectTable,
        passOnlyValueToChangeHandler: false,
        options: this.state.immSelectableTables || Imm.List()
      }),
      (tableSelected ?
        div({className: 'sample-data-text'},
          span({className: 'bold'}, FrontendConstants.SAMPLE_DATA_TEXT(this.state.immSelectedTable.get('properties').size)),
          (this.props.noInteractions ? null : div(null, span({className: cx({disabled: !hasInteractions})}, FrontendConstants.PLEASE_SELECT_A_SINGLE_COLUMN), span({className: 'select-all'},
            this.props.canSelectEntireTable ? div(null, Checkbox({
                checkedState: this.state.selectedAll,
                onClick: this.toggleSelectAll
              }),
              FrontendConstants.SELECT_ENTIRE_TABLE) : null)))) :
        div({className: 'sample-data-text'}, '\u00a0')),  // Use a non-breaking space (unicode `00a0`) placeholder to retain height.
      tablePreview
    );
  }
}

module.exports = DataSelector;
