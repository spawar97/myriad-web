var React = require('react');
import PropTypes from 'prop-types';
import DOM from 'react-dom-factories';

var ReactDOM = require('react-dom');

var SimpleAction = React.createFactory(require('../SimpleAction'));
var SimpleDropdown = React.createFactory(require('../SimpleDropdown'));
var AdminActions = require('../../actions/AdminActions');
var KeyCodeConstants = require('../../constants/KeyCodeConstants');

var div = DOM.div,
    input = DOM.input;

class EditSchemaTitleBar extends React.Component {
  static displayName = 'EditSchemaTitleBar';

  static propTypes = {
    onSaveAndDeploy: PropTypes.func.isRequired,
    hideOptionsDropdown: PropTypes.bool,
    canRenameSchema: PropTypes.bool,
    schemaName: PropTypes.string
  };

  static defaultProps = {
    canRenameSchema: true
  };

  componentDidMount = () => {
    AdminActions.renameSchema(this.props.schemaName);
  };

  state = {editSchemaName: false};

  handleBlur = (e) => {
      AdminActions.renameSchema(e.target.value);
      this.setState({editSchemaName: false});
  };

  handleDropdownClick = (index) => {
    switch (index) {
      case 0:
        this.setState({editSchemaName: true}, function() {
          var input = ReactDOM.findDOMNode(this.refs['rename-schemaName-input']);
          input.focus();
          input.select();
        });
        break;
      case 1:
        AdminActions.discardSchemaChanges();
    }
  };

  handleRenameSchema = (e) => {
    switch (e.keyCode) {
      case KeyCodeConstants.ENTER:
        this.setState({editSchemaName: false});
        AdminActions.renameSchema(e.target.value);
        break;
      case KeyCodeConstants.ESCAPE:
        this.setState({editSchemaName: false});
        break;
    }
  };

  render() {
    var schemaName = this.state.editSchemaName && this.props.canRenameSchema ? input({
      type: 'text',
      ref: 'rename-schemaName-input',
      defaultValue: this.props.schemaName,
      maxLength: 512,
      onKeyDown: this.handleRenameSchema,
      onBlur: this.handleBlur
    }) : div({ref: 'schemaName'}, this.props.schemaName);

    var dropdown = this.props.hideOptionsDropdown ? null : SimpleDropdown({
      scrollbarDisabled: true,
      onChange: this.handleDropdownClick,
      selectCheckDisabled: true,
      disableChevron: true,
      icon: 'icon-cog',
      selectedItemPrefix: 'Options',
      items: [{icon: 'icon-pencil', name: 'Rename schema', disabled: !this.props.canRenameSchema},
              {icon: 'icon-remove', name: 'Discard changes'}]
    });

    return div({className: 'admin-tab-edit-schema-title-bar'},
               div(null,
                   div({className: 'tab-title'}, schemaName),
                   div(null, SimpleAction({class: 'icon-cloud-upload', onClick: this.props.onSaveAndDeploy, text: 'Save and Deploy'})),
                   div(null, dropdown)));
  }
}

module.exports = EditSchemaTitleBar;
