import React from 'react';
import terms_of_use from '../resources/terms_of_use.json';
import PropTypes from 'prop-types';
//Components
import Button from '../components/Button';
import saamaLogo from '../../images/saama_dark_logo.png';
//Constants
import FrontendConstants from '../constants/FrontendConstants';
import RouteNameConstants from '../constants/RouteNameConstants';
//Actions
import ExposureActions from '../actions/ExposureActions';

export default class UserAgreementsPage extends React.PureComponent {
  static contextTypes = {
    router: PropTypes.object
  };

  static propTypes = {
    handleAgree: PropTypes.func,
    handleCheckboxSelection: PropTypes.func
  }

  state = {
    userAgree: false
  }

  handleAgree = () => {
    const { immExposureStore, handleAgree } = this.props;

    if (handleAgree) {
      handleAgree();
    } else {
      const userId = immExposureStore.getIn(['userInfo', 'id']);
      ExposureActions.acceptPolicyAndAgreements(userId,
        () => this.context.router.push(RouteNameConstants.EXPOSURE_USER_PROFILE));
    }
  };

  renderTermsAndAgreements = () => {
    const { terms_of_use_text, version, prefix } = terms_of_use;

    return (
      <div className='terms-and-conditions'>
        <div className='prefix'>{`${FrontendConstants.PRIVACY_POLICY_UPDATE}: ${prefix} ${version}`}</div>
        <div className='term-of-use-main' dangerouslySetInnerHTML={{ __html: terms_of_use_text }} />
      </div>
    )
  };

  renderControls = () => {
    const { userAgree } = this.state;

    return (
      <div className='agreements-controls'>
        <div className='checkbox-agreement'>
          <input type="checkbox"
            checked={userAgree}
            onChange={this.handleCheckboxSelection}
          />
          <label className='checkbox-label'>{FrontendConstants.AN_AGREEMENT_CHECKBOX}</label>
        </div>
        <Button
          classes={{ 'agree-btn': true }}
          children={FrontendConstants.AN_AGREEMENT}
          isPrimary={true}
          isDisabled={!userAgree}
          onClick={this.handleAgree}
        />
      </div>
    );
  }

  handleCheckboxSelection = () => {
    const { handleCheckboxSelection } = this.props;
    this.setState({ userAgree: !this.state.userAgree });

    if (handleCheckboxSelection) {
      handleCheckboxSelection();
    }
  }

  render() {
    return (
      <div className='policy-content'>
        <div className='agreements-content'>
          <img className='agreements-content-logo' src={saamaLogo} />
          <hr className='agreements-hr-line' />
          {this.renderTermsAndAgreements()}
          {this.renderControls()}
        </div>
      </div>
    )
  }
};
