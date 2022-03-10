var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var div = DOM.div;

class FixedDataTableHeader extends React.Component {
  static displayName = 'FixedDataTableHeader';

  static propTypes = {
    onCheckAll: PropTypes.func,
    contents: PropTypes.any,
    sortHandler: PropTypes.func,
    sortIndex: PropTypes.number
  };

  sortHandler = () => {
    var sortIndex = (this.props.sortIndex + 1) % 3;
    this.props.sortHandler(sortIndex);
  };

  render() {
    var sortCell = null;
    if (this.props.sortHandler) {
      var sortIconClassName;
      switch (this.props.sortIndex) {
        case 0:
          sortIconClassName = 'icon icon-ascending-alt';
          break;
        case 1:
          sortIconClassName ='icon icon-descending-alt';
          break;
        case 2:
          sortIconClassName = 'icon icon-menu';
      }
      sortCell = div({className: 'fixed-data-table-header-sorter virtual-table-cell',
                      onClick: this.sortHandler},
                     div({className: sortIconClassName}));
    }
    return div({className: 'fixed-data-table-header virtual-table'},
               div({className: 'virtual-table-row'},
                   div({onClick: this.props.onCheckAll
                    , className: 'fixed-data-table-header-contents virtual-table-cell'}, this.props.contents),
                   sortCell));
  }
}

module.exports = FixedDataTableHeader;
