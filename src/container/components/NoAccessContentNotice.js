import React from 'react';

class NoAccessContentNotice extends React.Component {
    static displayName = 'NoAccessContentNotice';

    render() {
        return (
            <div className="empty-content">
                <div className="empty-content-text-holder">
                    <div className="icon-text-wrapper">
                        <span className="icon-info"></span>
                        <span className="empty-content-text">
                    You currently do not have access to this module.
                    Please contact the support team -
                    <a href="https://support.saama.com" target="_blank"
                       style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      https://support.saama.com
                    </a>
                    <div className="navigation section">
                      <a href="/folders/" style={{ cursor: 'pointer', textDecoration: 'underline'  }}>
                        Or return to Analytics
                      </a>
                    </div>
                  </span>
                    </div>
                </div>
            </div>
        )
    }
}

module.exports = NoAccessContentNotice;
