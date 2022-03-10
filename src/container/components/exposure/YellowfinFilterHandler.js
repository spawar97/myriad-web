import React from 'react';
import Imm from 'immutable';
import PropTypes from 'prop-types';
import {YellowfinFilter, YellowfinUtil} from '../../util/YellowfinUtil';

class YellowfinFilterHandler extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      filtersApplied: false
    };
  }

  componentDidMount() {
    window.Yellowfin.eventListener.addListener(this, 'request-filters', this.handleRequestFilters);
  }

  componentWillUnmount() {
    window.Yellowfin.eventListener.removeListener(this, 'request-filters');
  }

  handleRequestFilters() {
    // Only apply the filters once
    if (!this.state.filtersApplied) {
      YellowfinUtil.sendYellowfinFilters(this.props.filters, this.props.immExposureStore);
      this.setState({filtersApplied: true});
    }
  }

  render() {
    // This is an empty component.
    return <div></div>;
  }
}

YellowfinFilterHandler.PropTypes = {
  immExposureStore: PropTypes.instanceOf(Imm.Map).isRequired,
  filters: PropTypes.arrayOf(PropTypes.instanceOf(YellowfinFilter)).isRequired
};

export default YellowfinFilterHandler;
