import React from 'react';
import PropTypes from "prop-types";
import Imm from "immutable";
import cx from 'classnames';
import FrontendConstants from "../../../constants/FrontendConstants";

class MetricSelector extends React.PureComponent {

  static propTypes = {
    immMetricCategoryNamesMap: PropTypes.instanceOf(Imm.OrderedMap).isRequired,
    immSelectedItems: PropTypes.instanceOf(Imm.List).isRequired, // [column name]
    onApply: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    const {immMetricCategoryNamesMap, immSelectedItems, onApply} = props;

    this.popoverRef = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleOutsideClick = this.handleOutsideClick.bind(this);
    this.onApply = onApply;

    const items = this._getMetricsListFromMap(immMetricCategoryNamesMap);
    const immSelectedCategories = this._getSelectedCategories(immMetricCategoryNamesMap, immSelectedItems);

    this.state = {
      immItems: items.sort() ,
      immItemsByGroup: immMetricCategoryNamesMap.sortBy((x, k) => k),
      immSelectedItems: props.immSelectedItems ,
      immSelectedCategories: immSelectedCategories ,
    };

    this.initialState = this.state;
    this.OnSelectAll = this._onSelectAll.bind(this);
    this.OnClear = this._onClear.bind(this);
    this.OnApply = this._onApply.bind(this);
    this.ToggleCategoryCheckbox = this._toggleCategoryCheckbox.bind(this);
    this.ToggleMetricCheckbox = this._toggleMetricCheckbox.bind(this);
  }

  componentWillUnmount() {
    this._removeClickEventListener();
  }

  _getSummaryText() {
    const {immSelectedItems, immItems} = this.state;
    let result = FrontendConstants.OVERSIGHT_METRICS_ALL;
    if (immSelectedItems.size !== immItems.size) {
      const count = immSelectedItems.size;
      if (count === 1) {
        result = `${count} ${FrontendConstants.OVERSIGHT_METRIC}`;
      } else {
        result = `${count} ${FrontendConstants.OVERSIGHT_METRICS}`;
      }
    }
    return result;
  }

  _getContent() {
    return (
      <div className="popover">
        {this._getHeader()}
        <hr/>
        {this._getCategories()}
        <hr/>
        {this._getMetrics()}
      </div>
    );
  }

  _getHeader() {
    const {immSelectedItems, immItems} = this.state;
    const allSelected = immSelectedItems.size == immItems.size;
    const divSelectAllProps = {
      className: cx('metrics-select-all-control', { disabled: allSelected }),
      onClick: (allSelected) ? null : this.OnSelectAll,
    };
    const noSelection = immSelectedItems.size === 0;
    const divClearProps = {
      className: cx('metrics-clear-control', { disabled: noSelection }),
      onClick: (noSelection) ? null : this.OnClear,
    };
    const divApplyProps = {
      className: cx('metrics-apply-control', { disabled: noSelection }),
      onClick: (noSelection) ? null : this.OnApply,
    };
    return (
      <div className="popover-controls">
        <div {...divSelectAllProps} >
          {FrontendConstants.OVERSIGHT_METRICS_SELECT_ALL}
        </div>
        <div {...divClearProps} >
          {FrontendConstants.OVERSIGHT_METRICS_CLEAR}
        </div>
        <div {...divApplyProps} >
          {FrontendConstants.OVERSIGHT_METRICS_APPLY}
        </div>
      </div>
    );
  }

  _getCategories() {
    const {immItemsByGroup, immSelectedCategories} = this.state;
    const categoriesNodes = [];
    immItemsByGroup.keySeq().forEach((key) => {
      const id = key;
      const checked = immSelectedCategories.contains(key);
      categoriesNodes.push(
        <label key={id} className="metrics-items-container-item">
          <input type="checkbox"
                 id={id}
                 checked={checked}
                 onChange={this.ToggleCategoryCheckbox}
                 className="metrics-items-container-input" />
                 {key}
        </label>
      );
    });

    return (
      <div className="metrics-categories-container">
        <div className="metrics-items-container-title">{FrontendConstants.OVERSIGHT_METRICS_CATEGORIES}</div>
        {categoriesNodes}
      </div>
    );
  }

  _getMetrics() {
    const {immItems, immSelectedItems} = this.state;
    const nodes = [];
    immItems.forEach(item => {
      const id = item;
      const checked = immSelectedItems.contains(item);
      nodes.push(
        <label key={id} className="metrics-items-container-item">
          <input type="checkbox"
                 id={id}
                 checked={checked}
                 onChange={this.ToggleMetricCheckbox}
                 className="metrics-items-container-input" />{item}
        </label>
      )
    });

    return (
      <div className="metrics-items-container">
        <div className="metrics-items-container-title">{FrontendConstants.OVERSIGHT_METRICS_CATEGORY_NAME}</div>
        {nodes}
      </div>
    );
  }

  _onSelectAll() {
    this.setState((prevState, prevProps) => {
      const items = this._getMetricsListFromMap(prevState.immItemsByGroup);
      const categories = this._getSelectedCategories(prevState.immItemsByGroup, items);
      return ({
        immSelectedItems: items,
        immSelectedCategories: categories,
      })
    });
  }

  _onClear() {
    this.setState(({
      immSelectedItems: Imm.List(),
      immSelectedCategories: Imm.List(),
    }));
  }

  _onApply() {
    this.onApply(this.state.immSelectedItems);
    this.handleClick();
  }

  _getMetricsListFromMap(immMetricCategoryNamesMap) {
    return immMetricCategoryNamesMap.toList().flatten().toSet();
  }

  _getSelectedCategories(immItemsByGroup, items) {
    return immItemsByGroup.map(immMetricsList => {
      return immMetricsList.reduce((memo, metricName) => {
        if (!memo) {
          return memo;
        }

        return items.contains(metricName);
      }, true);
    }).filter(isChecked => !!isChecked)
      .keySeq()
      .toList();
  }

  _getSelectedMetricsByCategories(immSelectedCategories) {
    const {immItemsByGroup} = this.state;
    const result = immSelectedCategories.map(category => {
      return Imm.List(immItemsByGroup.get(category));
    }).flatten(2);
    return result;
  }

  _toggleCategoryCheckbox(e) {
    const id = e.target.id;
    let {immSelectedCategories} = this.state;

    const index = immSelectedCategories.findIndex(item => item === id);
    if (index == -1) {
      immSelectedCategories = immSelectedCategories.push(id);
    } else {
      immSelectedCategories = immSelectedCategories.remove(index);
    }
    const immSelectedItems = this._getSelectedMetricsByCategories(immSelectedCategories);

    this.setState(({
      immSelectedItems: immSelectedItems,
      immSelectedCategories: immSelectedCategories,
    }));
  }

  _toggleMetricCheckbox(e) {
    const id = e.target.id;
    let {immSelectedItems, immItemsByGroup} = this.state;

    const index = immSelectedItems.findIndex(item => item === id);
    if (index == -1) {
      immSelectedItems = immSelectedItems.push(id);
    } else {
      immSelectedItems = immSelectedItems.remove(index);
    }

    const immSelectedCategories = this._getSelectedCategories(immItemsByGroup, immSelectedItems);

    this.setState((prevState, prevProps) => ({
      immSelectedItems: immSelectedItems,
      immSelectedCategories: immSelectedCategories ,
    }));
  }

  handleClick() {
    if (!this.state.popupVisible) {
      // attach/remove event handler
      document.addEventListener(this.getEventName(), this.handleOutsideClick, false);
    } else {
      this._removeClickEventListener();
      // store state to possible cancel by outside click
      this.initialState = this.state;
    }

    this.setState((prevState, prevProps) => ({
      popupVisible: !prevState.popupVisible,
    }));
  }

  _removeClickEventListener() {
    document.removeEventListener(this.getEventName(), this.handleOutsideClick, false);
  }

  handleOutsideClick(e) {
    //ignore clicks on the component itself
    if (this.popoverRef.contains(e.target)) {
      return;
    }
    // reset component
    this.setState(this.initialState);
    // pass click through
    this.handleClick();
  }

  getEventName() {
    return ('ontouchstart' in window) ? 'touchstart' : 'click';
  }

  render() {
    let summary = this._getSummaryText();
    let content = '';
    if (this.state.popupVisible) {
      content = this._getContent();
    }

    let onClickHandler = () => {};
    let onTouchStartHandler = () => {};
    if (this.getEventName() === 'click') {
      onClickHandler = this.handleClick;
    } else {
      onTouchStartHandler = this.handleClick;
    }

    return (
      <div className="popover-wrapper">
        <div className="popover-header" onClick={onClickHandler} onTouchStart={onTouchStartHandler}>
          <div className="popover-summary">
            {summary}
          </div>
          <div className="Select-arrow-zone">
            <div className="Select-arrow" />
          </div>
        </div>
        <div className="popover-container" ref={node => { this.popoverRef = node; }}>
          {content}
        </div>
      </div>
    );
  }
}

export default MetricSelector;
