import React from 'react';
import PropTypes from 'prop-types';
import CodeMirrorEditor from "../../CodeMirrorEditor";
import Imm from 'immutable';

require('codemirror/lib/codemirror.css');
// These imports are used to modify CodeMirror global var.
require('codemirror/addon/hint/html-hint');
require('codemirror/addon/hint/javascript-hint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/hint/show-hint.css');
require('codemirror/mode/htmlembedded/htmlembedded');
require('codemirror/mode/javascript/javascript');

class OversightConfigurationJsonEditor extends React.PureComponent {

  static propTypes = {
    immMetric: PropTypes.instanceOf(Imm.Map).isRequired,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      metricInputValueInit: this.metricImmToString(this.props.immMetric),
    };
  }

  componentDidMount() {
    this.setState({
      metricInputValueInit: this.metricImmToString(this.props.immMetric),
    });
  }

  componentDidUpdate(prevProps) {
    const {immMetric} = this.props;
    if (!Imm.is(immMetric, prevProps.immMetric)) {
      this.setState({
        metricInputValueInit: this.metricImmToString(immMetric),
      });
    }
  }

  metricImmToString(immMetric) {
    return JSON.stringify(immMetric, null, 2);
  }

  changeMetricInput(value){
    this.setState({metricInputValueChanged: value});
    let immJsonValueChanged;
    let validationResult = true;
    try {
      immJsonValueChanged = Imm.fromJS(JSON.parse(value));
    } catch(e) {
      immJsonValueChanged = null;
      validationResult = false;
    }
    this.props.onChange(immJsonValueChanged, validationResult);
  }

  render() {
    const {metricInputValueInit} = this.state;

    return (<CodeMirrorEditor className='metric-input' ref='metric-input' key='metric-input'
                        lineNumbers={true} mode={{name: 'javascript', json: true}}
                        smartIndent={true} dragDrop={true}
                        value={metricInputValueInit} extraKeys={{'`': 'autocomplete'}}
                        onChange={this.changeMetricInput.bind(this)}
    />);
  }
}

module.exports = OversightConfigurationJsonEditor;
