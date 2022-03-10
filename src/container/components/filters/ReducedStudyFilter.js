import React from 'react';
import PropTypes from "prop-types";
import Imm from "immutable";
import cx from 'classnames';
import Tooltip from 'rc-tooltip';
import FrontendConstants from "../../constants/FrontendConstants";
import MasterStudyFilterUtil from "../../util/MasterStudyFilterUtil";

class ReducedStudyFilter extends React.PureComponent {

  static propTypes = {
    immStudies: PropTypes.oneOfType([
      PropTypes.instanceOf(Imm.OrderedSet),
      PropTypes.instanceOf(Imm.List)
    ]).isRequired,
    immSelectedNames: PropTypes.oneOfType([
      PropTypes.instanceOf(Imm.OrderedSet),
      PropTypes.instanceOf(Imm.List)
    ]).isRequired,
  };

  constructor(props) {
    super(props);
    const immSelectedStudies = this._getImmSelectedStudies(props);
    const isAllActiveSelected = MasterStudyFilterUtil.isAllActiveSelected(immSelectedStudies, props.immStudies);
    const isAllArchivedSelected = MasterStudyFilterUtil.isAllArchivedSelected(immSelectedStudies, props.immStudies);
    this.state = {
      immSelectedStudies: immSelectedStudies,
      isAllActiveSelected: isAllActiveSelected,
      isAllArchivedSelected: isAllArchivedSelected,
    };
  }

  componentWillReceiveProps(nextProps) {
    const immPrevStudies = this.props.immStudies;
    const immNextStudies = nextProps.immStudies;
    const immPrevSelectedStudies = this.props.immSelectedStudies;
    const immNextSelectedStudies = nextProps.immSelectedStudies;
    if (!Imm.is(immPrevStudies, immNextStudies)
      || !Imm.is(immPrevSelectedStudies, immNextSelectedStudies)) {
      const immNextSelectedStudies = this._getImmSelectedStudies(nextProps);
      const isAllActiveSelected = MasterStudyFilterUtil.isAllActiveSelected(immNextSelectedStudies, immNextStudies);
      const isAllArchivedSelected = MasterStudyFilterUtil.isAllArchivedSelected(immNextSelectedStudies, immNextStudies);
      this.setState({
        immSelectedStudies: immNextSelectedStudies,
        isAllActiveSelected: isAllActiveSelected,
        isAllArchivedSelected: isAllArchivedSelected,
      });
    }
  }

  _getImmSelectedStudies(props) {
    return props.immStudies
      .filter(study => props.immSelectedNames.contains(study.label))
      .map(study => _.assign(study, {className: study.isArchived ? 'is-archived' : ''}))
      .toSet().sortBy(studies => studies.label);
  }

  render() {
    const { immSelectedStudies, isAllActiveSelected, isAllArchivedSelected  } = this.state;

    let renderedSelectedItems = [];
    if (isAllActiveSelected) {
      renderedSelectedItems.push(FrontendConstants.ALL_ACTIVE);
    }
    if (isAllArchivedSelected) {
      renderedSelectedItems.push(FrontendConstants.ALL_ARCHIVED);
    }
    if (!isAllActiveSelected) {
      immSelectedStudies.filter(study => !study.isArchived).forEach(study => renderedSelectedItems.push(study.label));
    }
    if (!isAllArchivedSelected){
      immSelectedStudies.filter(study => study.isArchived).forEach(study => renderedSelectedItems.push(study.label));
    }
    const selection = renderedSelectedItems.sort().join(', ');

    // TODO - <Tooltip> breaks completely when rendered inside of the supernavbar. Disabling for now
    return (
      // <Tooltip
      //   placement='bottomLeft'
      //   overlay={selection}
      //   overlayClassName='selected-study-tooltip'
      //   trigger={['click', 'hover']}>
      <span className={cx('selected-study')}>
        {selection}
      </span>
      // </Tooltip>
    );
  }
}

export default ReducedStudyFilter;
