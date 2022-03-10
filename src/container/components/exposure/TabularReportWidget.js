var React = require('react');
var ShallowCompare = require('react-addons-shallow-compare');
var _ = require('underscore');
var Imm = require('immutable');
import PropTypes from 'prop-types';

var TabularWidget = React.createFactory(require('./TabularWidget'));



class TabularReportWidget extends React.Component {
  static displayName = 'TabularReportWidget';

  static propTypes = {
    width: PropTypes.number.isRequired,
    drilldownId: PropTypes.string,
    immReport: PropTypes.instanceOf(Imm.Map)
  };

  render() {
    return TabularWidget({
      width: this.props.width,
      fileId: this.props.immReport.getIn(['fileWrapper', 'file', 'id']),
      immColumns: this.props.immReport.getIn(['tabularReportState', 'query', 'columns']),
      immColumnHeaders: this.props.immReport.getIn(['fileWrapper', 'file', 'reportConfig', 'columnHeaders']),
      immRows: this.props.immReport.getIn(['reportData', 0, 'rows']),
      immPageOrdering: this.props.immReport.getIn(['tabularReportState', 'pageOrderings'], Imm.List()),
      pageLowerLimit: this.props.immReport.getIn(['tabularReportState', 'pageLowerLimit']),
      pageUpperLimit: this.props.immReport.getIn(['tabularReportState', 'pageUpperLimit']),
      totalRows: this.props.immReport.getIn(['reportData', 0, 'totalRows']),
      drilldownId: this.props.drilldownId
    })
  }
}

module.exports = TabularReportWidget;
