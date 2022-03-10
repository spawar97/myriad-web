var React = require('react');
var _ = require('underscore');
var Imm = require('immutable');
var DropdownList = React.createFactory(require('react-widgets/lib/DropdownList'));
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var Button = React.createFactory(require('../Button'));
var ItemOpener = React.createFactory(require('../ItemOpener'));
var ListItem = React.createFactory(require('../ListItem'));
var SchemaTreeView = React.createFactory(require('../SchemaTreeView'));
var AdminActions = require('../../actions/AdminActions');
var DataTypeConstants = require('../../constants/DataTypeConstants');
var ComprehendSchemaUtil = require('../../util/ComprehendSchemaUtil');

var div = DOM.div,
    span = DOM.span;

var columnPathToSelectedSet = function(immColumnPath) {
  var shortNameList = immColumnPath ? [immColumnPath.last()] : [];
  return Imm.Set(shortNameList);
};

// A dropdown that allows users to select columns.
var ColumnSelectorDropdown = React.createFactory(// A dropdown that allows users to select columns.
class extends React.Component {
  static displayName = 'ColumnSelectorDropdown';

  static propTypes = {
    handleSelect: PropTypes.func.isRequired,
    immColumns: PropTypes.instanceOf(Imm.List),
    immSelectedColumns: PropTypes.instanceOf(Imm.Set),
    immTablePath: PropTypes.instanceOf(Imm.List),
    isOptional: PropTypes.bool,  // This prop is not applicable for multiSelectEnabled.
    multiSelectEnabled: PropTypes.bool
  };

  handleMultiSelection = (column) => {
    // Add the newly selected column to the originally selected columns.
    var immSelectedColumnPaths = this.props.immSelectedColumns.map(function(columnName) {
      return this.props.immTablePath.push('columns', columnName);
    }, this);
    immSelectedColumnPaths = immSelectedColumnPaths.add(this.props.immTablePath.push('columns', column.shortName));
    this.props.handleSelect(immSelectedColumnPaths.toList());
  };

  handleSingleSelection = (column) => {
    var immSelectedColumnPath = null;
    if (!this.props.isOptional || column.shortName) {  // When a None item is not clicked.
      immSelectedColumnPath = this.props.immTablePath.push('columns', column.shortName);
    }
    this.props.handleSelect(immSelectedColumnPath);
  };

  render() {
    if (this.props.immColumns) {
      // Columns represent possible dropdown choices. For multiselect case, already selected ones are filtered out.
      var columns = this.props.immColumns.filter(function(immColumn) {
        if (this.props.multiSelectEnabled) {
          return !this.props.immSelectedColumns.find(function(colName) {
            return immColumn.get('shortName') === colName;
          });
        }
        return true;
      }, this).map(function(immColumn) {
        var shortName = immColumn.get('shortName');
        var longName = immColumn.get('longName');
        return {shortName: shortName, longName: longName + ' (' + shortName + ')'};
      }).toJS();

      var selectedColumns = this.props.immSelectedColumns.map(function(colName) {
        return this.props.immColumns.find(function(immColumn) {
          return immColumn.get('shortName') === colName;
        });
      }, this).toJS();

      if (this.props.isOptional) {
        columns.unshift({longName: 'None'});
      }

      var isDisabled = _.isEmpty(columns);
      var defaultProps = {
        data: columns,
        duration: 0,  // Prevent the animation
        readOnly: isDisabled,
        valueField: 'shortName',
        textField: 'longName'
      };
      var dropdown = DropdownList(
        _.extend(defaultProps,
          this.props.multiSelectEnabled ? {
            value: {shortName: '', longName: 'Select Multiple Columns'},
            onChange: this.handleMultiSelection
          } : {
            value: selectedColumns[0] || {shortName: '', longName: ''},
            onChange: this.handleSingleSelection
          }
        )
      );

      var errorMessage = null;
      if (isDisabled) {
        var message = this.props.multiSelectEnabled && !_.isEmpty(selectedColumns) ? 'All columns have been selected.' : 'No columns with valid data types are available on this table.';
        errorMessage = span({className: 'error'}, message);
      }

      return div(null,
        dropdown,
        errorMessage
      );
    } else {
      return div(null, 'Select a table first');  // FIXME placeholder
    }
  }
});

// A dropdown that allows users to select a table from a schema. Invisible tables are hidden from view.
var TableSelectorDropdown = React.createFactory(
  class extends React.Component {
    static displayName = 'TableSelectorDropdown';

    static propTypes = {
      handleSelect: PropTypes.func.isRequired,
      immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map).isRequired,
      immSelectedTablePath: PropTypes.instanceOf(Imm.List)
    };

    handleSelect = (selectedItem) => {
      var immTablePath = Imm.List([selectedItem.datasource, 'tables', selectedItem.shortName]);
      this.props.handleSelect(immTablePath);
    };

    render() {
      var selectedItem = null;
      var dropdownItems = _.isNull(this.props.immWorkingCsDatasources) ? null : this.props.immWorkingCsDatasources.reduce(function(immMemo, immDatasource) {
        return immMemo.concat(
          immDatasource.get('tables').reduce(function(immInnerMemo, immTable) {
            var tableShortName = immTable.get('shortName');
            var datasourceShortName = immDatasource.get('shortName');
            var item = {
              longName: immTable.get('longName'),
              shortName: tableShortName,
              datasource: datasourceShortName,
              valueField: tableShortName + '.' + datasourceShortName
            };

            // side effect
            if (Imm.List([datasourceShortName, 'tables', tableShortName]).equals(this.props.immSelectedTablePath)) {
              selectedItem = item;
            }
            if (!!immTable.get('checkboxState') && !immTable.get('isInvisible')) {
              // We are calling toJS() anyway so no need to Imm.fromJS(item) here...
              return immInnerMemo.push(item);
            } else {
              return immInnerMemo;
            }
          }, Imm.List(), this)
        );
      }, Imm.List(), this).toJS();

      dropdownItems = _.sortBy(dropdownItems, 'longName');

      return DropdownList({
        data: dropdownItems,
        duration: 0,  // Prevent the animation
        readOnly: false,
        value: selectedItem || {shortName: '', longName: ''},
        valueField: 'valueField',
        textField: 'longName',
        onChange: this.handleSelect,
        groupBy: function(item) { return item.datasource; }
      });
    }
  },
);

// This component displays GPP demography information.
// Selectors are present for the table, the name property, and other default demography information properties.
var GPPPatientInfoPanel = React.createFactory(
class extends React.Component {
  static displayName = 'GPPPatientInfoPanel';

  static propTypes = {
    immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map).isRequired,
    immDemography: PropTypes.instanceOf(Imm.Map).isRequired,
    width: PropTypes.number.isRequired
  };

  state = {openPatientInfo: true};

  handleItemOpener = () => {
    this.setState({openPatientInfo: !this.state.openPatientInfo});
  };

  render() {
    var immTablePath = this.props.immDemography.get('tablePath');
    var immColumns = immTablePath ? this.props.immWorkingCsDatasources.getIn(immTablePath.push('columns')).toList()
      .filter(function(immColumn) { return !immColumn.get('isInvisible'); })
      .sortBy(function(immColumn) { return immColumn.get('shortName'); }) : null;
    var infoColumns = this.props.immDemography.get('infoPaths').map(function(path) { return path.last(); }).toSet();
    var patientInfoSelection = _.map(infoColumns.toJS(), function(shortName) {
      var immColumnPath = this.props.immDemography.get('tablePath').push('columns', shortName);
      var longName = this.props.immWorkingCsDatasources.getIn(immColumnPath.push('longName'));
      return ListItem({
        width: this.props.width,
        key: shortName,
        content: longName,
        icon: 'icon-close-alt',
        onIconClick: AdminActions.removeGPPDemographyInfoItem.bind(null, immColumnPath)
      });
    }.bind(this));

    // Add spans around the dropdown titles so react-testutils can query accurately in GPP-test.js
    var mainContent = this.state.openPatientInfo ?
      div({className: 'patient-info-main'},
        div({className: 'patient-info'}, span({className: 'icon-table'}), span({}, 'Demography table'),
          TableSelectorDropdown({
            handleSelect: AdminActions.updateGPPDemography.bind(null, 'tablePath'),
            immWorkingCsDatasources: this.props.immWorkingCsDatasources,
            immSelectedTablePath: immTablePath})),
        div({className: 'patient-info'}, span({}, 'Patient name'),
          ColumnSelectorDropdown({handleSelect: AdminActions.updateGPPDemography.bind(null, 'namePath'),
            width: this.props.width,
            immColumns: immColumns,
            immTablePath: immTablePath,
            immSelectedColumns: columnPathToSelectedSet(this.props.immDemography.get('namePath'))})),
        div({className: 'patient-info'}, span({}, 'Patient information'),
          ColumnSelectorDropdown({handleSelect: AdminActions.updateGPPDemography.bind(null, 'infoPaths'),
            width: this.props.width,
            immColumns: immColumns,
            immTablePath: immTablePath,
            multiSelectEnabled: true,
            immSelectedColumns: infoColumns}),
          div({className: 'patient-selection-wrapper'}, patientInfoSelection))) : null;

    return div({className: 'patient-info-panel'},
      div({className: 'section-title'},
        ItemOpener({isOpen: this.state.openPatientInfo, onClick: this.handleItemOpener}),
        span({className: 'title-text'}, 'Patient Info')),
      mainContent);
  }
});

// GPPChartPanel is responsible to render various dropdowns that are necessary to configure a chart for GPP.
// The titles for each dropdown change depending on the GPP chart type ('Duration' or 'Numeric').
// Column selection dropdowns do not appear until a chart type is selected.
var GPPChartPanel = React.createFactory(
  class extends React.Component {
    static displayName = 'GPPChartPanel';

    static propTypes = {
      immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map).isRequired,
      immGPPChart: PropTypes.instanceOf(Imm.Map).isRequired,
      immNumericChartDatePaths: PropTypes.instanceOf(Imm.Map).isRequired,
      index: PropTypes.number.isRequired,
      width: PropTypes.number.isRequired
    };

    handleItemOpener = () => {
      AdminActions.updateGPPChart(this.props.index, 'editing', !this.props.immGPPChart.get('editing'));
    };

    render() {
      var type = this.props.immGPPChart.get('type');
      var immTablePath = this.props.immGPPChart.get('tablePath');
      var immColumns = immTablePath ? this.props.immWorkingCsDatasources.getIn(immTablePath.push('columns')).toList()
        .filter(function(immColumn) { return !immColumn.get('isInvisible'); })
        .sortBy(function(immColumn) { return immColumn.get('shortName'); }) : null;
      var immDateColumns = immColumns ? immColumns.filter(function(immColumn) {
        return immColumn.get('dataType') === DataTypeConstants.DATE ||
          immColumn.get('dataType') === DataTypeConstants.DATETIME;
      }) : null;
      var immNumericColumns = immColumns ? immColumns.filter(function(immColumn) {
        return immColumn.get('dataType') === DataTypeConstants.INTEGER ||
          immColumn.get('dataType') === DataTypeConstants.DECIMAL;
      }) : null;
      var immMainColumnPath = this.props.immGPPChart.get('mainColumnPath');
      var immLowerBoundPath = this.props.immGPPChart.get('lowerBoundPath');
      var immUpperBoundPath = this.props.immGPPChart.get('upperBoundPath');

      var title, mainColumnName, lowerBoundColumnName, upperBoundColumnName, optionalBound;
      switch (type) {
        case 'Duration':
          if (immTablePath) {
            title = this.props.immWorkingCsDatasources.getIn(immTablePath.push('longName'));
          } else {
            title = 'GPP Duration Chart';
          }
          mainColumnName = 'Term';
          lowerBoundColumnName = 'Start date';
          upperBoundColumnName = 'End date';
          break;
        case 'Numeric':
          if (immMainColumnPath) {
            title = this.props.immWorkingCsDatasources.getIn(immMainColumnPath.push('longName'));
          } else {
            title = 'GPP Numeric Chart';
          }
          mainColumnName = 'Value';
          optionalBound = true;
          lowerBoundColumnName = 'Minimum';
          upperBoundColumnName = 'Maximum';

          // If both are undefined/null, show that the fields are optional.
          if (!immLowerBoundPath && !immUpperBoundPath) {
            lowerBoundColumnName += ' (optional)';
            upperBoundColumnName += ' (optional)';
          }
          break;
        default:
          title = 'GPP Chart';
      }

      var typeDropdown = DropdownList({
        data: ['Duration', 'Numeric'],
        duration: 0,  // Prevent the animation
        value: type,
        onChange: AdminActions.updateGPPChart.bind(null, this.props.index, 'type')
      });

      var columnSelectors = type ? [
        div({className: 'patient-info', key: 'mainColumnSelector'}, mainColumnName,
          ColumnSelectorDropdown({
            handleSelect: AdminActions.updateGPPChart.bind(null, this.props.index, 'mainColumnPath'),
            immColumns: type === 'Duration' ? immColumns : immNumericColumns,
            immTablePath: immTablePath,
            width: this.props.width,
            immSelectedColumns: columnPathToSelectedSet(immMainColumnPath)})),
        div({className: 'patient-info', key: 'lowerBoundSelector'}, lowerBoundColumnName,
          ColumnSelectorDropdown({
            handleSelect: AdminActions.updateGPPChart.bind(null, this.props.index, 'lowerBoundPath'),
            isOptional: optionalBound,
            immColumns: type === 'Duration' ? immDateColumns : immNumericColumns,
            immTablePath: immTablePath,
            width: this.props.width,
            immSelectedColumns: columnPathToSelectedSet(immLowerBoundPath)})),
        div({className: 'patient-info', key: 'upperBoundSelector'}, upperBoundColumnName,
          ColumnSelectorDropdown({
            handleSelect: AdminActions.updateGPPChart.bind(null, this.props.index, 'upperBoundPath'),
            isOptional: optionalBound,
            immColumns: type === 'Duration' ? immDateColumns : immNumericColumns,
            immTablePath: immTablePath,
            width: this.props.width,
            immSelectedColumns: columnPathToSelectedSet(immUpperBoundPath)}))
      ] : null;

      if (type === 'Numeric') {
        var tableString = immTablePath ? ComprehendSchemaUtil.pathToTableString(immTablePath) : null;
        var immDateColumnPath = this.props.immNumericChartDatePaths.getIn([tableString, 'datePath']);
        columnSelectors.unshift(div({className: 'patient-info', key: 'dateSelector'}, 'Date',
          ColumnSelectorDropdown({
            handleSelect: AdminActions.setGPPNumericChartDate,
            immColumns: immDateColumns,
            immTablePath: immTablePath,
            width: this.props.width,
            immSelectedColumns: columnPathToSelectedSet(immDateColumnPath)})));
      }

      var mainContent = this.props.immGPPChart.get('editing') ? div({className: 'patient-info-main'},
        div({className: 'patient-info'}, span({className: 'icon-report'}), 'GPP chart type', typeDropdown),
        div({className: 'patient-info'}, span({className: 'icon-table'}), 'GPP table',
          TableSelectorDropdown({
            handleSelect: AdminActions.updateGPPChart.bind(null, this.props.index, 'tablePath'),
            immWorkingCsDatasources: this.props.immWorkingCsDatasources,
            immSelectedTablePath: this.props.immGPPChart.get('tablePath')})),
        columnSelectors) : null;

      return div({className: 'patient-info-panel'},
        div({className: 'section-title'},
          ItemOpener({isOpen: this.props.immGPPChart.get('editing'), onClick: this.handleItemOpener}),
          // 20 px for item opener, 20px for ellipsis, 20px for trash can.
          span({className: 'title-text text-truncation', style: {width: this.props.width - 60}}, title),
          span({className: 'icon-remove', onClick: AdminActions.removeGPPChart.bind(null, this.props.index)})),
        mainContent);
    }
  },
);

// GPPSidebar is the wrapper component that contains a title, Patient Info Panel, Chart Panels,
// and a Add GPP Chart Button.
class GPPSidebar extends React.Component {
  static displayName = 'GPPSidebar';

  static propTypes = {
    immWorkingCsDatasources: PropTypes.instanceOf(Imm.Map).isRequired,
    immWorkingGPP: PropTypes.instanceOf(Imm.Map).isRequired,
    height: PropTypes.number.isRequired
  };

  width = 350;

  handleAllChartItemOpener = (isOpen) => {
    this.props.immWorkingGPP.get('charts').forEach(function(chart, index) {
      AdminActions.updateGPPChart(index, 'editing', isOpen);
    });
  };

  render() {
    var innerWidth = this.width - 19;  // 14px is for scrollbar and 5px is for padding.

    var charts = this.props.immWorkingGPP.get('charts').map(function(immGPPChart, index) {
      return GPPChartPanel({
        key: index,
        immWorkingCsDatasources: this.props.immWorkingCsDatasources,
        immGPPChart: immGPPChart,
        immNumericChartDatePaths: this.props.immWorkingGPP.get('numericChartDatePaths'),
        index: index,
        width: innerWidth
      })
    }, this).toJS();

    return div({className: 'admin-tab-gpp-sidebar', style: {width: this.width, height: this.props.height}},
      div({style: {width: innerWidth, height: this.props.height}},
        div({className: 'title'}, 'Configure GPP'),
          GPPPatientInfoPanel({
            width: innerWidth,
            immWorkingCsDatasources: this.props.immWorkingCsDatasources,
            immDemography: this.props.immWorkingGPP.get('demography')
          }),
          _.isEmpty(charts) ? null : div({className: 'item-opener-button-group'},
            Button({icon: 'item-opener open', onClick: this.handleAllChartItemOpener.bind(null, true), isSecondary: true, children: 'Open all'}),
            Button({icon: 'item-opener', onClick: this.handleAllChartItemOpener.bind(null, false), isSecondary: true, children: 'Close all'})),
          charts,
          Button({icon: 'icon-plus-circle2', onClick: AdminActions.addGPPChart, isPrimary: true, children: 'Add another GPP Chart'})));
  }
}

module.exports = GPPSidebar;
