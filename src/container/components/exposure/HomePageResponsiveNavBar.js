import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import cx from 'classnames';

import Combobox from "../Combobox";

class HomePageResponsiveNavBar extends React.PureComponent {
  static propTypes = {
    cookies: PropTypes.object,
    path: PropTypes.string,
    immOptions: PropTypes.instanceOf(Imm.List).isRequired,
    activeOptionId: PropTypes.string,
    dropDownClassName: PropTypes.string,
    onSelectedTab: PropTypes.func.isRequired
  };

  static contextTypes = {
    router: PropTypes.object
  }

  constructor(props) {
    super(props);
    const { immOptions } = props;
    this.state = {
      numberHorizontalTabs: immOptions.size,
    };
    this.tabButtonWidthMap = {};
    this._handleWindowResize = _.debounce(this._handleWindowResize.bind(this), 100);
  }

  saveContainerReference(ref){
    this.containerNode = ref;
    if (ref != null) {
      if (this.state.numberHorizontalTabs === this.props.immOptions.size && this.containerWidth != ref.offsetWidth) {
        // detects container resize when editor is opened (not detected by window resize)
        this.containerWidth = ref.offsetWidth;
        this._handleWindowResize();
      }
    }
  }

  saveHorizontalTabReference(groupEntityId, ref) {
    if (ref != null) {
      this.tabButtonWidthMap[groupEntityId] = ref.offsetWidth;
    }
  }

  saveDropDownReference(ref) {
    this.dropDownNode = ref;
  }

  getDropDownWidth() {
    let dropDownWidth = 0;
    if (this.dropDownNode != null) {
      dropDownWidth = this.dropDownNode.offsetWidth;
    }
    return dropDownWidth;
  }

  getDropDownActiveOption(numberHorizontalTabs) {
    const dropDownOptions = this.props.immOptions.slice(numberHorizontalTabs);
    return dropDownOptions.find(o => o.value === this.props.activeOptionId);
  }

  hasOptionChanged(newProps, oldProps) {
    const oldPropsValues = Imm.List(oldProps.immOptions.map(o => o.value));
    const newPropsValues = Imm.List(newProps.immOptions.map(o => o.value));
    return !Imm.is(newPropsValues, oldPropsValues) || newProps.activeOptionId !== oldProps.activeOptionId;
  }

  componentWillReceiveProps(nextProps) {
    const { immOptions } = nextProps;
    if (this.hasOptionChanged(nextProps, this.props)) {
      this.setState({
        numberHorizontalTabs: immOptions.size,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
      this.refreshNumberHorizontalTabs();
  }

  componentDidMount() {
    window.addEventListener('resize', this._handleWindowResize);
    window.addEventListener('orientationchange', this._handleWindowResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._handleWindowResize);
    window.removeEventListener('orientationchange', this._handleWindowResize);
  }

  _handleWindowResize() {
    this.refreshNumberHorizontalTabs();
  }

  refreshNumberHorizontalTabs() {
    const { numberHorizontalTabs } = this.state;
    const newNumberHorizontalTabs = this.getNumberHorizontalTabs();
    if (newNumberHorizontalTabs !== numberHorizontalTabs) {
      this.setState({
        numberHorizontalTabs: newNumberHorizontalTabs,
      });
    }
  }

  getNumberHorizontalTabs() {
    const offset = this.getDropDownWidth();
    let remainingWidth = this.containerNode ? this.containerNode.offsetWidth - offset : 0;
    let numberHorizontalTabs = 0;
    const { immOptions } = this.props;
    let lastTabWidth = 0;
    for (let i = 0; i < immOptions.size; i++) {
      const tabKey = immOptions.get(i).value;
      lastTabWidth = this.tabButtonWidthMap[tabKey];
      if (remainingWidth - lastTabWidth < 0) {
        break;
      }
      remainingWidth -= lastTabWidth;
      numberHorizontalTabs += 1;
    }

    const dropDownActiveOption = this.getDropDownActiveOption(numberHorizontalTabs);
    if (dropDownActiveOption != null) {
      const dropDownActiveTabWidth = this.tabButtonWidthMap[dropDownActiveOption.value];
      numberHorizontalTabs -= dropDownActiveTabWidth > lastTabWidth ? 2 : 1;
    }

    return numberHorizontalTabs;
  }

  onTabSelected(selectedId) {
    const { onSelectedTab } = this.props;
    onSelectedTab(selectedId);
  }

  hasTabDropDown() {
    return this.state.numberHorizontalTabs < this.props.immOptions.size;
  }
  getHorizontalTabButton(option, key) {
    let styleClasses = option.cx.split(' ');
    if (this.hasTabDropDown() && _.contains(styleClasses, 'last')) {
      styleClasses = _.filter(styleClasses, c => c !== 'last');
    }
    return  (
      <button key={key}
           className={styleClasses.join(' ')}
           onClick={this.onTabSelected.bind(this, option.value)}
           title={option.title}
           ref={this.saveHorizontalTabReference.bind(this, option.value)}>
        {option.label}
      </button>
    );
  }

  getHorizontalTabButtons(options) {
    let tabButtons = [];
    if (options.size > 0) {
      options.forEach((option, i) => {
        const key = `responsive-nav-bar-tab-${++i}`;
        const newTabButton = this.getHorizontalTabButton(option, key);
        tabButtons.push(newTabButton);
      });
    }
    return tabButtons;
  }

  getActiveOptionTab(immOptions) {
    const {activeOptionId } = this.props;
    const activeOption = immOptions.find(o => o.value === activeOptionId);
    const activeOptionIndex = immOptions.findIndex(o => o.value === activeOptionId);
    let activeOptionTab = null;
    if (activeOption != null) {
      activeOptionTab = this.getHorizontalTabButton(activeOption, `responsive-nav-bar-tab-${activeOptionIndex}`);
    }
    return activeOptionTab;
  }

  getDropDownTabButton(options) {
    let dropDownButton = null;
    if (options.size > 0) {
      const { dropDownClassName } = this.props;
      dropDownButton = (
        <div ref={this.saveDropDownReference.bind(this)}
             className={cx("drop-down-wrapper", dropDownClassName, "last")}>
          <Combobox className='home-page-team-nav-dropdown'
                    placeholder={`+ ${options.size}`}
                    valueKey='value'
                    labelKey='label'
                    passOnlyValueToChangeHandler={true}
                    onChange={this.onTabSelected.bind(this)}
                    options={options}/>
        </div>
      );
    }
    return dropDownButton;
  }


  render() {
    const { immOptions, activeOptionId } = this.props;
    const { numberHorizontalTabs } = this.state;
    const horizontalTabOptions = immOptions.slice(0, numberHorizontalTabs);
    const horizontalTabs = this.getHorizontalTabButtons(horizontalTabOptions);
    const dropDownOptions = immOptions.slice(numberHorizontalTabs).toArray();
    const dropDownTabs = _.filter(dropDownOptions, tab => tab.value !== activeOptionId);
    const dropDownTabButton = this.getDropDownTabButton(Imm.List(dropDownTabs));
    return (
      <div className='responsive-home-page-nav-bar' ref={this.saveContainerReference.bind(this)}>
        <div>{horizontalTabs}</div>
        <div>{this.getActiveOptionTab(dropDownOptions)}</div>
        <div className='home-page-nav-dropdown-container'>{dropDownTabButton}</div>
      </div>
    );
  }
}

export default HomePageResponsiveNavBar;
