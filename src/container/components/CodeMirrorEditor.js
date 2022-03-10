const React = require('react');
const ReactDOM = require('react-dom');
const CodeMirror = require('codemirror');
import PropTypes from 'prop-types';

class CodeMirrorEditor extends React.Component {
  constructor() {
    super();
    this.handleChange = this.handleChange.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  componentDidMount() {
    let editor = ReactDOM.findDOMNode(this.refs['editor']);
    this.editor = CodeMirror.fromTextArea(editor, this.props);
    if (this.props.initialValue !== undefined) {
      this.editor.setValue(this.props.initialValue);  // Set the initial value.
    }
    if (this.props.value !== undefined) {
      this.editor.setValue(this.props.value);
    }

    this.editor.on('change', this.handleChange);
    this.editor.on('blur', this.handleBlur);
  }

  componentWillUnmount() {
    this.editor.off('change');
    this.editor.off('blur');
  }

  componentDidUpdate(prevProps) {
    const {value: prevValue} = prevProps;
    const {value} = this.props;
    if (value !== prevValue) {
      this.editor.setValue(value);
    }
  }

  handleChange(doc) {
    this.props.onChange && this.props.onChange(doc.getValue());
  }

  handleBlur(doc) {
    this.props.onBlur && this.props.onBlur(doc.getValue());
  }

  render() {
    let editor = <textarea ref='editor' />;

    return <div style={this.props.style} className={this.props.className}>{editor}</div>;
  }
}

CodeMirrorEditor.propTypes = {
  className: PropTypes.string,
  onChange: PropTypes.func,  // This function has the value as its parameter.
  onBlur: PropTypes.func,  // This function has the value as its parameter.
  style: PropTypes.object,
  initialValue: PropTypes.string,
  value: PropTypes.string,
};

module.exports = CodeMirrorEditor;
