const React = require('react');
const _ = require('underscore');
const cx = require('classnames');
import PropTypes from 'prop-types';

const CodeMirrorEditor = require('./CodeMirrorEditor');
const Button = require('./Button');
const SimpleButtonArray = require('./SimpleButtonArray');
const AdminActions = require('../actions/AdminActions');
const ModalConstants = require('../constants/ModalConstants');

require('!style-loader!css-loader!../../../node_modules/codemirror/lib/codemirror.css');

class JsonEditor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {error: null};
    this.handleSave = this.handleSave.bind(this);
    this.keyDownHandler = this.keyDownHandler.bind(this);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.isLoading && !this.props.isLoading && this.props.data) {
      this.resizeCodeMirror();
      let cm = this.refs['codeMirror'].editor;
      cm.getDoc().setValue(JSON.stringify(this.props.data, null, 2));
      cm.focus();
    } else if (this.props.width !== prevProps.width) {
      this.resizeCodeMirror();
    }
  }

  handleSave() {
    if (!this.props.isLoading && !this.props.isSaving) {
      let text = this.refs['codeMirror'].editor.getValue();
      let json;
      try {
        json = JSON.parse(text);
      } catch(e) {
        this.setState({error: 'Invalid JSON'});
        return;
      }
      AdminActions.displayModal(ModalConstants.MODAL_SAVE_DEPLOY_WARNING, {saveFunction: () => AdminActions.saveComprehendSchemaJson(json) });
    }
  }

  keyDownHandler() {
    this.setState({error: null});
    if (this.props.error) { AdminActions.clearComprehendSchemaJsonError(); }
  }

  resizeCodeMirror() {
    this.refs['codeMirror'].editor.setSize('100%', '100%');
  }

  render() {
    let content;
    switch (true) {
      case this.props.isLoading:
        content = <div className='overlay'><div className='spinner' /></div>;
        break;
      case _.isObject(this.props.data):
        content = (
          <CodeMirrorEditor
              ref='codeMirror'
              className={cx({'read-only': this.props.isSaving})}
              lineNumbers={true}
              mode={{name: 'javascript', json: true}}
              readOnly={this.props.isSaving}
              style={{height: '100%'}} />
        );
        break;
      default:
        content = <div />;
    }
    let error = this.state.error || this.props.error ? <div className='error'>{this.state.error || this.props.error}</div> : null;

    let saveButton = (
      <Button
          classes={{'json-editor-save': true}}
          isDisabled={this.props.isSaving}
          isPrimary={true}
          icon='icon-cloud-upload'
          onClick={this.handleSave}>
        Save & Deploy
      </Button>
    );
    let cancelButton = (
      <Button
          classes={{'json-editor-cancel': true}}
          isDisabled={this.props.isSaving}
          isSecondary={true}
          icon='icon-close'
          onClick={AdminActions.closeComprehendSchemaJsonEditor}>
        Cancel
      </Button>
    );

    return (
      <div className='json-editor-modal' onKeyDown={this.keyDownHandler}>
        <div className='json-editor'>
          <div className='json-editor-header'>
            <span>EDIT JSON</span>
          </div>
          <div className='json-editor-content'>{content}</div>
          <div className='json-editor-controls'>
            {saveButton}
            {cancelButton}
            {error}
          </div>
        </div>
      </div>
    );
  }
}

JsonEditor.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  width: PropTypes.number.isRequired,
  data: PropTypes.object,
  error: PropTypes.string
};

module.exports = JsonEditor;
