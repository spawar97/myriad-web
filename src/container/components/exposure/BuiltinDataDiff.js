import React from 'react';
import createReactClass from 'create-react-class';
import Imm from 'immutable';
import PropTypes from 'prop-types';

import {TouchDiv as div} from '../TouchComponents';

let BuiltinDataDiff = createReactClass({
  displayName: 'BuiltinDataDiff',

  propTypes: {
    immExposureStore: PropTypes.instanceOf(Imm.Map),
    width: PropTypes.number.isRequired,
    params: PropTypes.shape({
      fileId: PropTypes.string
    }),
    query: PropTypes.shape({
      drilldownId: PropTypes.string
    })
  },

  contextTypes: {
    router: PropTypes.object
  },

  render: function() {
    return <div>Future development builtin type</div>
  }
});

module.exports = BuiltinDataDiff;
