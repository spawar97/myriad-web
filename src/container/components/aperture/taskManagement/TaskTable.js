import React from 'react';
import 'primeicons/primeicons.css';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.css';
import 'primeflex/primeflex.css';
import Combobox from "../../Combobox";
import {SortableContainer, SortableElement, SortableHandle} from 'react-sortable-hoc';
import FrontendConstants from "../../../constants/FrontendConstants";
import "../../../../stylesheets/modules/tasks-dashboard.scss"

var AdminActions = require('../../../actions/AdminActions');
import Imm from 'immutable';
import ToggleButton from '../../ToggleButton';
import PropTypes from "prop-types";
import cx from "classnames";
import TaskManagementStore from '../../../stores/TaskManagementStore';
import {MultiSelect} from 'primereact-opt/multiselect';
import Util from '../../../util/util';

const DragHandle = SortableHandle(() => <div className='drag-drop-icon icon-menu9 icon-hamburger'
                                             style={{padding: '0 0 0 1rem'}}/>);

class TaskTable extends React.PureComponent {
  static propTypes = {
    tasks_metadata: PropTypes.instanceOf(Imm.List),
    fieldTypeArr: PropTypes.instanceOf(Imm.List)
  };

  constructor(props) {
    super(props);
    this.state = {
      tasks_metadata: props.tasks_metadata,
      fieldTypeArr: props.fieldTypeArr,
      dateConditions: props.dateConditions,
      title: props.title,
      removeAttribute: props.removeAttribute,
      defaultMandatory: props.defaultMandatory,
      files: props.files,
      clinicalDataChangeConfirmation: false
    };
    this.rowRenderer = this.getAttributeRow.bind(this);
    this.sortChangeHandler = this._onSortChange.bind(this);
    this._continueReset = this._continueReset.bind(this);
    this._continueDragAndDrop = this._continueDragAndDrop.bind(this);
    this.confirmRemoveAttribute = this.confirmRemoveAttribute.bind(this);
  }

  static allowedClinicalFieldType = ["singleSelectDropdown", "multiSelectDropdown"];
  static mandatoryClinicalFields = ["studyIds", "siteCountries", "siteIds"];

  static SortableItem = SortableElement(({rowRenderer, value: immSelectedAttribute}) => {
    const dispositionRow = rowRenderer(immSelectedAttribute, immSelectedAttribute.get('elementIndex'));
    return (<div className="grabbing noselect">{dispositionRow}</div>);
  });

  static SortableList = SortableContainer(({items, rowRenderer}) => {
    return (
      <div>
        {items.map((value, index) => {
          const key = `item-${index}`;
          value = value.toJS();
          value.elementIndex = index;
          value = Imm.Map(value);
          const sortableItemProps = {key, index, value, rowRenderer};
          return (
            <TaskTable.SortableItem {...sortableItemProps} />);
        })}
      </div>
    );
  });

  componentWillReceiveProps(nextProps) {
    const {tasks_metadata, fieldTypeArr, dateConditions} = this.props;
    if (!Imm.is(tasks_metadata, nextProps.tasks_metadata)
      || !Imm.is(fieldTypeArr, nextProps.fieldTypeArr)
      || !Imm.is(dateConditions, nextProps.dateConditions)) {
      this.setState({
        tasks_metadata: nextProps.tasks_metadata,
        fieldTypeArr: nextProps.fieldTypeArr,
        dateConditions: nextProps.dateConditions
      });
    }
  }

  _getReorderedDispositions(immEditedAttributes, event) {
    const {oldIndex, newIndex} = event;

    // Simple algorithm to reorder the list:
    // 1. Pop old index
    // 2. Splice array into 2 arrays at new index
    // 3. insert the popped element between the two arrays
    const immMovedDisposition = Imm.List([immEditedAttributes.get(oldIndex)]);
    const immSelectedAttributesExcludingMovedDs = immEditedAttributes.delete(oldIndex);
    const immListStart = immSelectedAttributesExcludingMovedDs.slice(0, newIndex);
    const immListEnd = immSelectedAttributesExcludingMovedDs.slice(newIndex, immSelectedAttributesExcludingMovedDs.size);

    // Map through the reordered list and update ds sequence appropriately
    return immListStart.concat(immMovedDisposition, immListEnd).map((immDs, dsseq) => {
      return immDs.set('fieldSeq', dsseq + 1);
    });
  }

  _continueDragAndDrop(flag) {
    if (flag) {
      this.setState({clinicalDataChangeConfirmation: true}, () => {
        const {tasks_metadata} = this.state;
        let immNewDispositions = this._getReorderedDispositions(tasks_metadata, this.state.dragAndDropEvent);
        if (this.props.attributeType === 'clinicalAttributes') {
          immNewDispositions = immNewDispositions.map(attr => {
            attr = attr.set('dependOnAttributes', Imm.List());
            return attr;
          })
        }
        this.props.updateTaskMetadata(immNewDispositions, this.props.attributeType);
      });
    }
  }

  _onSortChange(event) {
    if (this.props.attributeType === 'clinicalAttributes' && !this.state.clinicalDataChangeConfirmation) {
      this.setState({
        dragAndDropEvent: event
      }, () => {
        AdminActions.displayDependancyResetModal(this._continueDragAndDrop);
      })
    } else {
      const {tasks_metadata} = this.state;
      let immNewDispositions = this._getReorderedDispositions(tasks_metadata, event);
      if (this.props.attributeType === 'clinicalAttributes') {
        immNewDispositions = immNewDispositions.map(attr => {
          attr = attr.set('dependOnAttributes', Imm.List());
          return attr;
        })
      }
      this.props.updateTaskMetadata(immNewDispositions, this.props.attributeType);
    }

  }

  _getFixedWidthColumnStyle(width) {
    return {width: width, maxWidth: width, minWidth: width};
  }

  getUpdatedAttributes(immEditedAttributes, idx, updatedFieldName, updatedValue) {
    let immEditedAttribute = immEditedAttributes[idx];
    immEditedAttribute = immEditedAttribute.delete('invalidRecordType');
    immEditedAttribute = immEditedAttribute.set(updatedFieldName, updatedValue);
    immEditedAttributes[idx] = immEditedAttribute;
    return immEditedAttributes;
  }

  updateAttributeValue(idx, updatedFieldName, updatedValue, event) {
    const tasks_metadata = [...this.state.tasks_metadata];
    if (event && event.originalEvent.checked) {
      let filesArr = [];
      this.state.files.forEach(element => {
        filesArr = filesArr.concat(element.items)
      })
      updatedValue = filesArr;
    }
    let newImmDispositions = this.getUpdatedAttributes(tasks_metadata, idx, updatedFieldName, updatedValue);

    this.props.updateTaskMetadata(Imm.List(newImmDispositions), this.props.attributeType);
  }

  _continueReset(flag) {
    if (flag === true) {
      this.setState({clinicalDataChangeConfirmation: true}, () => {
        let {idx, newValue, fieldName} = this.state.tempClinicalAttributeDetails
        const selectedAttribute = this.state.tasks_metadata.get(idx);
        this.continueChangingFieldName(idx, newValue, fieldName, selectedAttribute);
      });
    } else {
      const newImmStore = TaskManagementStore.getStore();
      const taskMetadata = newImmStore.getIn(['taskMetadata', 'taskAttributes', this.props.attributeType], Imm.List());
      this.setState({
        tasks_metadata: taskMetadata
      })
    }
  }

  handleLOVChange(idx, fieldName, changeEvent) {
    let newValue = changeEvent.currentTarget.value;
    let {tasks_metadata} = this.state;

    let selectedAttribute = tasks_metadata.get(idx);
    selectedAttribute = selectedAttribute.set(fieldName, newValue);
    tasks_metadata = tasks_metadata.set(idx, selectedAttribute);
    this.props.updateTaskMetadata(tasks_metadata, this.props.attributeType);
  }

  handleFieldDescriptionChange(idx, fieldName, changeEvent) {
    const newValue = changeEvent.currentTarget.value;
    let {tasks_metadata} = this.state;
    let selectedAttribute = tasks_metadata.get(idx); 
    selectedAttribute = selectedAttribute.set(fieldName, newValue);
    tasks_metadata = tasks_metadata.set(idx, selectedAttribute);
    this.props.updateTaskMetadata(tasks_metadata, this.props.attributeType);
  }

  handleFieldNameChange(idx, fieldName, changeEvent) {
    const newValue = changeEvent.currentTarget.value;
    let {tasks_metadata} = this.state;
    let selectedAttribute = tasks_metadata.get(idx);

    // remove invalid record type
    const invalidRecordType = selectedAttribute.get('invalidRecordType');
    if(invalidRecordType === 'emptyFieldName' || invalidRecordType === 'duplicateFieldName'){
      selectedAttribute = selectedAttribute.delete('invalidRecordType');
    }

    // generate fieldId ----> camel case of fieldName
    // do not allow to change mandatory clinical attribute's fieldId
    if (!selectedAttribute.get('fieldId') || (selectedAttribute.get('fieldId') && !TaskTable.mandatoryClinicalFields.includes(selectedAttribute.get('fieldId')))) {
      selectedAttribute = selectedAttribute.set('fieldId', Util.toCamelCase(newValue));
    }

    // check duplicate fieldName in all attribute type ---> core, extended and clinical
    const isDuplicate = this.props.checkDuplicateFieldName(idx, this.props.attributeType, newValue);
    if (isDuplicate) {
      selectedAttribute = selectedAttribute.set('duplicateFieldName', true);
    } else {
      selectedAttribute = selectedAttribute.delete('duplicateFieldName');
    }

    // if clinical data is getting changed and if we do not have
    // confirmation then save fieldName to current state
    // otherwise update value of store
    if (this.props.attributeType === 'clinicalAttributes' && !this.state.clinicalDataChangeConfirmation) {
      tasks_metadata = tasks_metadata.set(idx, selectedAttribute);
      tasks_metadata = tasks_metadata.setIn([idx, fieldName], newValue);
      this.setState({
        tasks_metadata: tasks_metadata,
      })
    } else {
      this.continueChangingFieldName(idx, newValue, fieldName, selectedAttribute);
    }
  }

  continueChangingFieldName(idx, newValue, fieldName, selectedAttribute) {
    let {tasks_metadata} = this.state;

    selectedAttribute = selectedAttribute.set(fieldName, newValue);
    tasks_metadata = tasks_metadata.set(idx, selectedAttribute);

    if (this.props.attributeType == 'clinicalAttributes') {
      tasks_metadata = tasks_metadata.map((attr) => {
        attr = attr.set('dependOnAttributes', Imm.List());
        return attr;
      })
    }
    this.props.updateTaskMetadata(tasks_metadata, this.props.attributeType);
  }

  onBlurFieldName(idx, fieldName, immSelectedAttribute, changeEvent) {
    const newValue = changeEvent.currentTarget.value.trim();
    const newImmStore = TaskManagementStore.getStore();
    const duplicateFieldName = immSelectedAttribute.get('duplicateFieldName');
    if(duplicateFieldName){
      changeEvent.currentTarget.focus();
    }else{
      const oldValue = newImmStore.getIn(['taskMetadata', 'taskAttributes', this.props.attributeType, idx, fieldName]);
      if (newValue != oldValue) {
        this.setState({
          tempClinicalAttributeDetails: {
            idx: idx,
            newValue: newValue,
            fieldName: fieldName
          },
        }, () => AdminActions.displayDependancyResetModal(this._continueReset));
      }
    }
  }

  handleFieldTypeChange(idx, fieldName, option) {
    this.updateAttributeValue(idx, fieldName, Imm.fromJS(option));
  }

  getLOVInputField(idx, fieldName, value, immSelectedAttribute) {
    const invalidRecordType = immSelectedAttribute.get('invalidRecordType')
    const {attributeType} = this.props;
    const inputKey = `input-${fieldName}`;
    const fixedWidthInputStyle = this._getFixedWidthColumnStyle('18rem');
    return <input className={cx("text-input", "input-height", {'invalid-input': invalidRecordType == 'emptyLOVs' || invalidRecordType == 'duplicateLOVs'})}
                  type="text"
                  style={fixedWidthInputStyle}
                  value={value}
                  key={inputKey}
                  disabled={attributeType === 'coreAttributes' || attributeType === 'clinicalAttributes'}
                  onChange={this.handleLOVChange.bind(this, idx, fieldName)}
    />
  }

  getFieldNameInputField(idx, fieldName, value, immSelectedAttribute) {
    const inputKey = `input-${fieldName}`;
    const {attributeType} = this.props;
    const fixedWidthInputStyle = this._getFixedWidthColumnStyle('15rem');
    let inputContent = <input
      className={cx("text-input", "input-height", {'invalid-input': immSelectedAttribute.get('duplicateFieldName') || immSelectedAttribute.get('invalidRecordType') == 'emptyFieldName'})}
      style={fixedWidthInputStyle}
      type="text"
      value={value}
      key={inputKey}
      disabled={attributeType === 'coreAttributes' || attributeType === 'clinicalAttributes'}
      onChange={this.handleFieldNameChange.bind(this, idx, fieldName)}
      onBlur={attributeType === 'clinicalAttributes' ? this.onBlurFieldName.bind(this, idx, fieldName, immSelectedAttribute) : null}
    />
    let content = <div>
      {inputContent}
      {
        immSelectedAttribute.get('duplicateFieldName') ?
          <div style={fixedWidthInputStyle} className="duplicate-field-name-error">Duplicate field name</div> :
          null
      }
    </div>

    return (content);
  }

  getFieldDescriptionInputBox(idx, fieldName, value) {
    const inputKey = `input-${fieldName}`;
    const { attributeType } = this.props; 
    const fixedWidthInputStyle = this._getFixedWidthColumnStyle('22rem');
    return (<input className={cx("text-input")}
                   style={fixedWidthInputStyle}
                   type="text"
                   value={value}
                   key={inputKey}
                   disabled={attributeType === 'coreAttributes' || attributeType === 'clinicalAttributes'}
                   onChange={this.handleFieldDescriptionChange.bind(this, idx, fieldName)}

    />);
  }

  getDateConditionDropdown(fieldName, idx) {
    const {tasks_metadata} = this.state;
    const immSelectedAttribute = tasks_metadata.get(idx);
    const immSelectedDateCondition = immSelectedAttribute.get(fieldName) ? [...immSelectedAttribute.get(fieldName)] : [];

    // Build the dropdown available usdmEvent selections for current disposition
    const immAvailableDateConditions = this.state.dateConditions;

    const key = `date-condition-${idx}`;
    return <MultiSelect
      className={cx("dateConditions-dropdown", {'invalid-input': immSelectedAttribute.get('invalidRecordType') == 'emptyDateConditions'})}
      key={key}
      id={'dateConditions-dropdown-' + idx}
      name={'dateConditions-dropdown-' + idx}
      value={immSelectedDateCondition}
      options={immAvailableDateConditions}
      itemTemplate={this.itemTemplate}
      panelHeaderTemplate={(options) => {
        return this.panelHeaderTemplate(immAvailableDateConditions, options, 'dateConditions')
      }}
      disabled={this.state.title === 'Core Attributes' || this.state.title === 'Clinical Attributes'}
      onChange={(e) => {
        this.updateAttributeValue(idx, fieldName, e.value)
      }}
      optionLabel="label" placeholder="Select"
      optionValue="dateCondition" dataKey="id"/>
  }

  getFieldTypeDropDownField(fieldName, idx) {
    const {tasks_metadata, fieldTypeArr} = this.state;
    const {attributeType} = this.props;
    const immSelectedAttribute = tasks_metadata.get(idx);
    const fieldId = immSelectedAttribute.get('fieldId');
    const immSelectedFieldType = immSelectedAttribute.get('fieldType');

    let immAvailableFieldTypeOptions = fieldTypeArr;
    if (attributeType === 'clinicalAttributes') {
      immAvailableFieldTypeOptions = immAvailableFieldTypeOptions.map(option => {
        if (!TaskTable.allowedClinicalFieldType.includes(option.get('field_type_value'))) {
          option = option.set('disabled', true);
        }
        return option;
      })
    }

    const key = `field-type-${idx}`;

    //build dropdown for field type
    return <Combobox
      className='usdm-event-selector-dropdown field-type-dropdown'
      placeholder='Select Type'
      value={immSelectedFieldType}
      valueKey='field_type_value'
      labelKey='fieldType'
      passOnlyValueToChangeHandler={true}
      options={immAvailableFieldTypeOptions}
      disabled={attributeType === 'coreAttributes' || attributeType === 'clinicalAttributes'}
      onChange={this.handleFieldTypeChange.bind(this, idx, fieldName)}
      key={key}
    />;
  }

  handleToggleIsMandatory(idx) {
    let tasks_metadata = this.state.tasks_metadata;
    let immSelectedAttribute = tasks_metadata.get(idx);
    immSelectedAttribute = immSelectedAttribute.set('isMandatory', !immSelectedAttribute.get('isMandatory'));
    tasks_metadata = tasks_metadata.set(idx, immSelectedAttribute);
    this.props.updateTaskMetadata(tasks_metadata, this.props.attributeType);
  }

  getIsMandatoryToggle(immSelectedAttribute, idx) {
    const isMandatory = immSelectedAttribute.get('isMandatory');
    const showMandatory = immSelectedAttribute.get('showMandatory');

    let toggleButton;
    if (showMandatory) {
      toggleButton = (
        <ToggleButton
          className='api-user-toggle-button'
          isActive={isMandatory || false}
          activeText={FrontendConstants.CHECKMARK}
          onClick={this.handleToggleIsMandatory.bind(this, idx)}>
        </ToggleButton>
      );
    } else {
      toggleButton = (
        <div className="circle is-mandatory">{FrontendConstants.CHECKMARK}</div>
      )
    }

    return toggleButton;
  }

  panelHeaderTemplate(values, options, name) {
    const noDataFound = {
      textAlign: 'center',
      paddingTop: '0.5rem',
      fontSize: '1.2rem'
    }
    let content = '';
    if (values.length > 0)
      content = <div className="p-multiselect-header">
        <div>
          <span title="Select All">{options.checkboxElement}</span>
          {name != 'associatedAnalytics' && <b> Select All</b>}
        </div>
        {name == 'associatedAnalytics' && options.filterElement}
        {options.closeElement}
      </div>;
    else
      content = <div style={noDataFound}>No data found</div>
    return content;
  }

  itemTemplate(options) {
    return <div className="itemTemplate" title={options.desc}>
      {options.label}
    </div>
  }

  _getMultiselectField(immSelectedAttribute, index) {
    const associatedDashboardList = this.state.files;
    const associatedAnalyticsAndDashboard = immSelectedAttribute.get('associatedAnalyticsAndDashboard');

    return <MultiSelect
      className={cx("associated-files-dropdown", {'invalid-input': immSelectedAttribute.get('invalidRecordType') == 'emptyAssociatedAnalytics'})}
      id={this.props.attributeType + 'associatedfilesdropdown' + index}
      value={associatedAnalyticsAndDashboard}
      options={associatedDashboardList}
      panelHeaderTemplate={(options) => {
        return this.panelHeaderTemplate(associatedDashboardList, options, 'associatedAnalytics')
      }}
      filter
      disabled={this.props.attributeType === 'coreAttributes' || this.props.attributeType === 'clinicalAttributes'}
      onChange={(e) => {
        this.updateAttributeValue(index, 'associatedAnalyticsAndDashboard', e.value, e)
      }}
      optionLabel="name" optionGroupLabel="name" optionGroupChildren="items" placeholder="Select"
      dataKey="name"/>
  }

  confirmRemoveAttribute(flag) {
    if (flag) {
      this.setState({clinicalDataChangeConfirmation: true}, () => {
        let {tasks_metadata} = this.state;

        if (tasks_metadata.get(this.state.deleteElementIndex)) {
          tasks_metadata = tasks_metadata.filter((item, index) => {
            return index != this.state.deleteElementIndex
          });
        }

        tasks_metadata = tasks_metadata.map(attr => {
          attr = attr.set('dependOnAttributes', Imm.List());
          return attr;
        })

        tasks_metadata = tasks_metadata.map((item, index) => {
          item = item.set('fieldSeq', index + 1)
          return item
        })
        this.props.updateTaskMetadata(tasks_metadata, this.props.attributeType);
      });
    }
  }

  deleteAttribute(deleteElementIndex) {
    if (this.props.attributeType === 'clinicalAttributes' && !this.state.clinicalDataChangeConfirmation) {
      this.setState({
        deleteElementIndex: deleteElementIndex
      }, () => {
        AdminActions.displayDependancyResetModal(this.confirmRemoveAttribute);
      })
    } else {
      this.setState({
        deleteElementIndex: deleteElementIndex
      }, () => {
        AdminActions.deleteExtendedAttributeConfirmation(this.confirmRemoveAttribute);
      });
    }
  }

  _dependsOnMultiselectDropdown(immSelectedAttribute, index) {
    const newImmStore = TaskManagementStore.getStore();
    let taskMetadata = newImmStore.getIn(['taskMetadata', 'taskAttributes', this.props.attributeType], Imm.List());
    taskMetadata = taskMetadata.toJS();
    let dependsOnOptions = [];
    for (let i = 0; i < index; i++) {
      dependsOnOptions.push({
        fieldName: taskMetadata[i].fieldName,
        fieldId: taskMetadata[i].fieldId
      });
    }
    const dependsOnValue = immSelectedAttribute.get('dependOnAttributes') ? immSelectedAttribute.get('dependOnAttributes') : [];
    return <MultiSelect
      className='associated-files-dropdown'
      key={'dependsOn-' + index}
      value={dependsOnValue}
      options={dependsOnOptions}
      disabled={true}
      panelHeaderTemplate={(options) => {
        return this.panelHeaderTemplate(dependsOnOptions, options)
      }}
      onChange={(e) => {
        this.updateAttributeValue(index, 'dependOnAttributes', e.value)
      }}
      optionLabel="fieldName" placeholder="Select Filter dependancy"
      optionValue="fieldId"/>
  }

  //generate row
  getAttributeRow(immSelectedAttribute, index) {
    const {attributeType} = this.props;
    const idx = index;
    const rowKey = `${attributeType}-${idx}`;

    const removeAttribute = this.state.removeAttribute;

    const deleteDispositionBtn = (
      <div className='delete-attribute' onClick={() => {
        this.deleteAttribute(idx)
      }}>{removeAttribute || immSelectedAttribute.removeAttribute ? 'x' : ''}</div>
    );

    const editClinicalAttributeBtn = (
      <div className='edit-item icon-eye' 
        onClick={() => {
        this.props.viewClinicalAttribute(immSelectedAttribute, idx)}}/>
    );

    const actionsColumn =
      <div className='action-column'>
        {deleteDispositionBtn}
        <div>{immSelectedAttribute.get('fieldSeq')}</div>
        <DragHandle/>
        {attributeType === 'clinicalAttributes' ? editClinicalAttributeBtn : null}
      </div>


    const fieldNameValue = immSelectedAttribute.get('fieldName');
    const fieldId = immSelectedAttribute.get('fieldId');
    const fieldNameColumn = this.getFieldNameInputField(idx, 'fieldName', fieldNameValue, immSelectedAttribute);

    const fieldTypeColumn = this.getFieldTypeDropDownField('fieldType', idx);

    let fieldLov = '-';
    if (immSelectedAttribute.get('fieldType') == 'singleSelectDropdown' || immSelectedAttribute.get('fieldType') == 'multiSelectDropdown') {
      if(attributeType != 'clinicalAttributes' && !(fieldId == 'assigneeIds' || fieldId == 'observerIds'))
      fieldLov = this.getLOVInputField(idx, 'fieldValues', immSelectedAttribute.get('fieldValues'), immSelectedAttribute);
    } else if (immSelectedAttribute.get('fieldType') == 'date') {
      fieldLov = this.getDateConditionDropdown('dateConditions', idx);
    }

    const isMandatoryColumn = this.getIsMandatoryToggle(immSelectedAttribute, idx);

    const filterDependancy = attributeType === 'clinicalAttributes' ? this._dependsOnMultiselectDropdown(immSelectedAttribute, idx) : '';

    const fieldDescValue = immSelectedAttribute.get('fieldDesc');
    const fieldDescription = this.getFieldDescriptionInputBox(idx, 'fieldDesc', fieldDescValue);

    const reportDashboardMultiselect = attributeType === 'coreAttributes' ? '' : this._getMultiselectField(immSelectedAttribute, idx);


    return (
      <tr id={`${this.props.attributeType}-${idx}`} key={rowKey}>
        <td className='action-column'>
          {actionsColumn}
        </td>
        <td className='field-name-column'>
          {fieldNameColumn}
        </td>
        <td className='field-type-column'>
          {fieldTypeColumn}
        </td>
        <td className='field-lov'>
          {fieldLov}
        </td>
        <td className='is-mandatory-column'>
          {isMandatoryColumn}
        </td>
        <td className='filter-dependancy-column'>
          {filterDependancy}
        </td>
        <td className='field-description'>
          {fieldDescription}
        </td>
        <td className='report-dashboard-multiselect'>
          {reportDashboardMultiselect}
        </td>
      </tr>
    );
  }

  render() {
    const {tasks_metadata, title} = this.state;

    let tbodyContent = (
      <TaskTable.SortableList items={tasks_metadata}
                              rowRenderer={this.rowRenderer}
                              onSortEnd={this.sortChangeHandler}
                              lockAxis={'y'}
                              distance={10}
                              useDragHandle={true}
                              getContainer={() => document.getElementById(`${title}`)}
                              lockToContainerEdges={true}
                              disableAutoscroll={true}
                              helperClass='disposition-drag-and-drop'
      />
    );
    return (
      <React.Fragment>
        <span className="attribute-type">{title}</span>
        {tasks_metadata.size > 0 ?
          <table id={`${title}`} className="parallel-scroll">
            <tbody>{tbodyContent}</tbody>
          </table>
          :
          <div className="no-attribute-container"> 
            No {title} Configured. To add {title},<br/>
            1. Click on 'Add' button at the top.<br/>
            2. Click on '{title}' option.<br/>
            3. Specify the details of the {title}<br/>
            4. Click on 'Save' at the top.
          </div>
        }
      </React.Fragment>
    )
  }
}

export default TaskTable;
