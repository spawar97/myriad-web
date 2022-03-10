import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import OversightConfigurationUtil from "../../../util/OversightConfigurationUtil";

class OversightConfigurationMetricList extends React.PureComponent {

  static propTypes = {
    immMetrics: PropTypes.object.isRequired,
    activatedId: PropTypes.string,
    itemSelected: PropTypes.func,
  };

  selectItem(id) {
    this.props.itemSelected(id);
  }

  render() {
    const {immMetrics, activatedId} = this.props;
    const groups = immMetrics
      .sort((first, second) => {
        const firstCategoryName = first.get('category', '');
        const secondCategoryName = second.get('category', '');

        if (!firstCategoryName && secondCategoryName) {
          return 1;
        } else if (firstCategoryName && !secondCategoryName) {
          return -1;
        } else {
          return firstCategoryName.localeCompare(secondCategoryName);
        }
      })
      .groupBy(metric => metric.get('category', ''));
    const groupsContent = groups.keySeq().map((key) => {
      const immGroup = groups.get(key);
      const listItems = OversightConfigurationUtil.sortMetrics(immGroup)
        .map(
          (immMetric) => {
            const metricId = immMetric.get('metricId');
            return (
              <li className={
                  cx({
                    'activated': metricId === activatedId,
                    'enabled': immMetric.get('isAccount') && immMetric.get('metricStatus') === 'enabled',
                  })}
                  key={metricId} onClick={() => {this.selectItem(metricId)}}>
                {immMetric.getIn(['displayAttributes', 'title'], metricId)}
              </li>
            );
          }
        );
      return (
        <li key={key}>
          <h3>{key}</h3>
          <ul>
            {listItems}
          </ul>
        </li>
      );
    });

    return (<ul>
      {groupsContent}
    </ul>);
  }

}

module.exports = OversightConfigurationMetricList;
