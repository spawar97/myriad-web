import React from 'react';
import PropTypes from 'prop-types';
import cx from "classnames";

class CollapsibleText extends React.PureComponent {
  static propTypes = {
    title: PropTypes.string,
    content: PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = { collapse: false };
  }

  toggle() {
    this.setState(state => ({ collapse: !state.collapse }));
  }

  render() {
    const { title, content } = this.props;
    const { collapse } = this.state;
    let collapsibleContent;
    if (collapse) {
      collapsibleContent = <div className='content' aria-expanded={collapse}>{content}</div>;
    }
    return (
      <div className='collapsible-text'>
        <div className='title' style={{display: 'flex'}} onClick={this.toggle}>
          <div>{title}</div>
          <div className={cx('icon-accordion-down', {'rotate-arrow-up': collapse})}/>
        </div>
        {collapsibleContent}
      </div>
    );
  }
}

export default CollapsibleText;
