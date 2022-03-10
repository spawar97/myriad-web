import React from 'react';
import createReactClass from 'create-react-class';
import PropTypes from 'prop-types';
import Imm from 'immutable';
import cx from "classnames";

var InformationMessage = createReactClass({
  displayName: 'InformationMessage',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    params: PropTypes.shape({
      title: PropTypes.string,
      details: PropTypes.any,
      iconClass: PropTypes.string,
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  render: function () {
    const {iconClass, title, details} = this.props.params;

    return (
      <div className='information-message'>
        <div className='information-message-text-holder'>
          <div className='information-message-header'>
            <span className={ cx(
                'information-message-icon', iconClass, {'icon-information_solid': !iconClass}) }/>
            <span className='information-message-title'>
              {title}
            </span>
          </div>
          <div>
            <span className='information-message-details'>
              {details}
            </span>
          </div>
        </div>
      </div>
    );
  }
});

module.exports = InformationMessage;
export default InformationMessage;
