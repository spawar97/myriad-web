import React from 'react';
import Imm from 'immutable';

let Button1 = React.createFactory(require('../../Button'));
let SchemaTreeView = React.createFactory(require('../../SchemaTreeView'));
var ListItem = React.createFactory(require('../../ListItem'));
let Combobox = React.createFactory(require('../../Combobox'));
let StudioMixin = require('../../StudioMixin');
let createReactClass = require('create-react-class');
import FrontendConstants from "../../../constants/FrontendConstants";
import Button from '../../Button';
import DOM from 'react-dom-factories';

let div = DOM.div;

var AddClinicalAttributeModal = createReactClass({
  mixins: [StudioMixin],

  getInitialState: function () {
    const {clinicalAttributes, workingCs} = this.props;
    return {
      immWorkingCs: workingCs ? this.getWorkingCs(workingCs) : null,
      clinicalAttributes: clinicalAttributes
    }
  },

  componentWillReceiveProps: function (nextProps) {
    this.setState({
      immWorkingCs: nextProps.workingCs ? this.getWorkingCs(nextProps.workingCs) : this.state.immWorkingCs,
    })
  },

  onChangeSchema: function (dropdownValue) {
    let workingCs = this.props.getWorkingComprehendSchema(dropdownValue.idx);
    this.setState({
      immWorkingCs: this.getWorkingCs(workingCs)
    });
  },

  _createPopupContent() {
    const SchemaTreeViewStyle = { 
      width: this.props.isViewMode ? '100%' : '80%', float: 'left'
    }
    const {immComprehendSchemas, workingCs} = this.props;
    const {clinicalAttributes} = this.state;
    let immWorkingCs = this.state.immWorkingCs ? this.state.immWorkingCs : workingCs ? this.getWorkingCs(workingCs) : null;

    let buttonTemplate = '';
    let clinical_popup_section_right = '';
    
    if (!this.props.isViewMode) {
      buttonTemplate = Button1({
        icon: 'icon-plus-circle2',
        children: "Add",
        isPrimary: true,
        onClick: () => {
          this.addNewFieldInTable(immComprehendSchemas)
        }
      })
      
      clinical_popup_section_right = div(
        {className: `clinical-popup-section-right `},
        clinicalAttributes.map((immIncludedDynamicFilter, idx) => {
          const clinicalDbDetail = immIncludedDynamicFilter.clinicalDbDetail;
          const title = `${immIncludedDynamicFilter.fieldName} (${clinicalDbDetail.datasource}.${clinicalDbDetail.table}.${clinicalDbDetail.column})` ;
          const content = <span><span className="list-item-content">{immIncludedDynamicFilter.fieldName}</span> <span className="attribute-db-details">({clinicalDbDetail.datasource}.{clinicalDbDetail.table}.{clinicalDbDetail.column})</span></span> ;
          return div({key: `clinicalTreeAttribute-${idx}`},
            div({className: 'list-item tag'},
              div({className: 'list-item-overflow', title: title}, content)));
        })
      )
    }
    return (
      div({className: 'clinical-popup'},
        div({className: `studio clinical-popup-section-left ${this.props.isViewMode ? 'full-width' : ''}`},
          div({className: 'schema-section'},
            div({className: 'entry-text'}, this.props.isViewMode ? 'Schema' : FrontendConstants.SELECT_A_SCHEMA),
            Combobox({
              key: 'schema-dropdown',
              className: 'schema-dropdown',
              options: immComprehendSchemas ? immComprehendSchemas.map(function (immComprehendSchema, idx) {
                return {idx: idx, text: immComprehendSchema.get("name"), value: immComprehendSchema.get('id')};
              }).toList() : Imm.List(),
              valueKey: 'value',
              labelKey: 'text',
              disabled: this.props.isViewMode,
              passOnlyValueToChangeHandler: false,  // Ensures we're returning the whole option object rather than just the value.
              value: _.isNull(immWorkingCs) ? '' : immWorkingCs.get('id'),
              onChange: this.onChangeSchema
            }),
            div({},
              div({style: SchemaTreeViewStyle},
                _.isNull(immComprehendSchemas) || _.isNull(immWorkingCs) ? null :
                  SchemaTreeView({
                    columnCheckboxOnly: true,
                    disableToggleButtons: true,
                    disableSearch: this.props.isViewMode,
                    handleTreeItemExpandOrCollapse: this.handleTreeItemExpandOrCollapse,
                    handleTreeItemSelection: this.handleTreeItemSelection,
                    handleTvSearch: this.handleTvSearch,
                    immTvSearchState: this.state.immTvSearchState,
                    handleTvToggleSearchField: this.handleTvToggleSearchField,
                    height: this.SCHEMA_TREE_VIEW_HEIGHT,
                    immWorkingCsDatasources: immWorkingCs.get('datasources'),
                    maxDepth: 2,
                    noCheckboxes: true,
                    noSideNavBorder: true,
                    noSearchBoxMargin: true,
                    noTooltips: true,
                    width: this.props.leftPanelWidth
                  }),
              ),
              buttonTemplate,
            ),
          )),
        clinical_popup_section_right
      ));
  },

  render: function () {
    const modalDialogContentStyle = {
      width: this.props.isViewMode ? '60rem' : '100rem', height: '50rem', maxHeight: '50rem'
    }
    return (
      <div className="modal-dialog-underlay modal-underlay virtual-table clinicalAttributeModal">
        <div className="virtual-table-row">
          <div className="virtual-table-cell">
            <div className="modal-dialog"
                 style={modalDialogContentStyle}>
              <div className="modal-dialog-closer" onClick={this.props.closeClinicalAttributeModal}></div>
              <div className="modal-dialog-content">
                <div className="modal-dialog-header">
                  <span
                    className="modal-dialog-header-text">{this.props.isViewMode ? `${FrontendConstants.VIEW_CLINICAL_ATTRIBUTE} ${this.props.selectedAttributeName}` : FrontendConstants.ADD_CLINICAL_ATTRIBUTE}</span>
                </div>
                <div className="modal-dialog-main">
                  {this._createPopupContent()}
                </div>
                <div className="modal-dialog-footer mt-2 text-align-right">
                  {
                    !this.props.isViewMode ?
                      <div>
                        <Button
                          icon='btn-success'
                          children='Cancel'
                          isSecondary={true}
                          onClick={this.props.closeClinicalAttributeModal}
                        />
                        <Button
                          icon='icon-loop2 btn-success'
                          children={FrontendConstants.SAVE}
                          isPrimary={true}
                          onClick={() => this.props.addClinicalAtrributes(this.state.clinicalAttributes)}
                          isDisabled={!this.state.clinicalAttributes.length}
                        />
                      </div> :
                      <Button
                        icon='btn-success'
                        children='Close'
                        isSecondary={true}
                        onClick={this.props.closeClinicalAttributeModal}
                      />
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

export default AddClinicalAttributeModal;
