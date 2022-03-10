import React, { useState, useEffect } from 'react';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import "primeflex/primeflex.css";
import { DataTable } from 'primereact-opt/datatable';
import { Column } from 'primereact-opt/column';
import { InputText } from 'primereact-opt/inputtext';
import { Dropdown } from 'primereact-opt/dropdown';
import { Ripple } from 'primereact-opt/ripple';
import { Calendar } from 'primereact-opt/calendar';
import ExposureActions from '../../actions/ExposureActions';
import ModalConstants from '../../constants/ModalConstants';
import FreezePopUp from '../prime-react/FreezePopUp';

const BotPrimeTable = (props) => {

  let { tableData, defaultPaginationFirst, defaultPaginationRows, defaultCurrentPage, gotoTooltipText, toggleColumnLabel,
    paginationLayout, nextPageText, prevPageLinkText, customTableProps, customColumnProps, 
    rowPerPageDropdownOptions, columnWidth } = props;

  const [first, setFirst] = useState(defaultPaginationFirst);
  const [rows, setRows] = useState(defaultPaginationRows);
  const [currentPage, setCurrentPage] = useState(defaultCurrentPage);
  const [pageInputTooltip, setPageInputTooltip] = useState(
    gotoTooltipText
  );
  const [nodes, setNodes] = useState([]);
  const [freezedColumns, setFreezedColumn] = useState([]);
  const [cols, setCols] = useState([]);
  const [colOptions, setColOptions] = useState([]);
  const [multiSortColOptions, setMultiSortColOptions] = useState([]);
  const [colFreezeOptions, setColFreezeOptions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  let defaultSortInitValue = {field: '', order: ''};
  const [multiSortColumns, setMultiSortColumns] = useState([defaultSortInitValue]);
  const [startDateFilter, setStartDate] = useState(null);
  const [endDateFilter, setEndDate] = useState(null);
  let dt;

  const onColumnToggle = (event) => {
    let currentFreezedColumns = event.value.filter(obj => obj.frozen === true);
    setFreezedColumn(currentFreezedColumns);
    let style = { width: `${columnWidth}px`, height: '40px'};    
    let columnsData = _.chain(event.value).sortBy((column) => column.id).map((column, i)=> {
      let freezedStyle = {...style, left: `${i * columnWidth}px`};
      let lastFreezedColumnStyle = {...freezedStyle, borderWidth: '0 1px 1px 0'} 
      column.style = i + 1 == currentFreezedColumns.length ? lastFreezedColumnStyle : column.frozen ? freezedStyle : style;
      return column;
    }).value();
    setCols(columnsData);
  }

  const onColumnFreeze = (event) => {
    setFreezedColumn(event.value);
    let columns = cols;

    let removedColumns = columns.map((obj) => { 
      obj.frozen = false;
      obj.style = { width: `${columnWidth}px`, height: '40px' };
      return obj;
    });
    removedColumns = _.sortBy(removedColumns.concat(event.value), "id");

    let array = [];
    array = _.sortBy(array.concat(event.value), "id");

    let updatedColumns = array.map((obj, index, {length}) => { 
      obj.frozen = true;
      obj.style = {...obj.style, left: `${index * columnWidth}px`};
      if(index + 1 == length){
        obj.style = {...obj.style, borderWidth: '0 1px 1px 0' };
      }
      return obj;
    })

    const mergedArray = [...updatedColumns, ...removedColumns];
    let set = new Set();
    let final = mergedArray.filter(item => {
      if (!set.has(item.id)) {
        set.add(item.id);
        return true;
      }
      return false;
    }, set);
    setCols(final);
  }
  const _columns = () => {
    return cols && cols.length ? cols.map((col, i) => {
      let dateFilterElement = <Calendar monthNavigator onChange={(e)=>{onDateChange(e, col.field)}} 
                              dateFormat="yy-mm-dd" yearNavigator yearRange="2010:2030" showIcon
                              placeholder="Select"/>;
      let isDate = col.field.toLowerCase().includes("date");
      let defaultColumnProps = {
        key: col.id,
        columnKey: `${col.id}`,
        field: col.field,
        header: col.header,
        style: col.style ? col.style : {},
        frozen: col.frozen,
        sortable: true,
        filter: true,
        className: col.frozen ? `freeze-column freeze-${i + 1}` : "",
        filterHeaderClassName: col.frozen ? `freeze-column freeze-${i + 1}` : "",
        body: bodyTemplate,
        filterPlaceholder: "Search",
        filterElement: isDate ? dateFilterElement : null,
        filterFunction: isDate ? (value, filter) => filterDate(value, filter, col.field) : null,
      };

      let columnProps = _.extend(defaultColumnProps, customColumnProps);

      return <Column {...columnProps} />;
    }) : null;
  }

  let showHideMetricProps = {
    toggleColumnLabel: toggleColumnLabel,
    cols: cols,
    colOptions: colOptions,
    onColumnToggle: onColumnToggle
  }

  const bodyTemplate = (data, props) => {
    return (
      <span title={data[props.field]}>{data[props.field]}</span>       
    );
  }  

  const filterDate = (value, filter, field) =>{
    if (filter === undefined || filter === null || (typeof filter === 'string' && filter.trim() === '')) {
        return true;
    }
    if (value === undefined || value === null) {
        return false;
    }
    if(field.toLowerCase().includes("start date")){      
      if(endDateFilter != null){
        return new Date(value) >= filter && new Date(value) <= endDateFilter;
      }
      return new Date(value) >= filter;
    }
    else if(field.toLowerCase().includes("end date")){      
      if(startDateFilter != null){
        return new Date(value) <= filter && new Date(value) >= startDateFilter ;
      }
      return new Date(value) <= filter;
    }
    else{
      return new Date(value).toDateString() == filter.toDateString();
    }

  } 

  const onDateChange = (e, field)=> {
    let filter = e.value;
    if(field.toLowerCase().includes("start date")){
      setStartDate(filter);
    }
    if(field.toLowerCase().includes("end date")){
      setEndDate(filter);
    }
    dt.filter(filter, field, 'custom');
  }
  
  const loadTable = () => {
    // create deep copy of user custom table data
    const deepTableData = JSON.parse(JSON.stringify(tableData));
    setNodes(deepTableData);
    const columns = [];
    let column = [];
    if (Array.isArray(deepTableData)) {
      column = Object.keys(deepTableData[0]);
    } else {
      column = Object.keys(deepTableData);
    }

    for (let i = 0; i < column.length; i++) {
      let view = {};
      view.id = i;
      view.header = column[i].toUpperCase().replace("_", " ");
      view.displayName = column[i].toUpperCase().replace("_", " ");
      view.field = column[i];
      view.frozen = i < 3 ? true : false;
      let style = { width: `${columnWidth}px`, height: '40px'};
      let freezedStyle = {...style, left: `${i * columnWidth}px`};
      let lastFreezedColumnStyle = {...freezedStyle, borderWidth: '0 1px 1px 0'}
      view.style = (i == 2 && column.length > 4) ? lastFreezedColumnStyle : view.frozen ? freezedStyle : style;
      view.sortable = true,
      columns.push(view);
    }  
    const deepColumnData = JSON.parse(JSON.stringify(columns));
    setCols(deepColumnData);
    // Set options for hide show columns
    let colOptions = [], multiSortColOptions = [];
    for (let col of deepColumnData) {
      colOptions.push({ label: col.header, value: col, disabled: col.disabled });
      multiSortColOptions.push({ label: col.header, value: col.field, disabled: col.disabled });
    }
    setColOptions(colOptions);
    setMultiSortColOptions(multiSortColOptions);

    // Set options for freeze columns
    let colFreezeOptions = [];
    for (let col of deepColumnData) {
      colFreezeOptions.push({ label: col.header, value: col });
    }
    setColFreezeOptions(colFreezeOptions);
    let frozenColumn = deepColumnData.filter(obj => obj.frozen === true);
    setFreezedColumn(frozenColumn);
  }

  useEffect(() => {
    loadTable();
  },[tableData]);
  
  // GoTo Page Functionality
  const onPageInputKeyDown = (event, options) => {
    if (event.key === "Enter") {
      const page = parseInt(currentPage);
      if (page < 0 || page > options.totalPages) {
        setPageInputTooltip(
          `Value must be between 1 and ${options.totalPages}.`
        );
      } else {
        const first = currentPage ? options.props.rows * (page - 1) : 0;

        setFirst(first);
        setPageInputTooltip(gotoTooltipText);
      }
    }
  };

  const onPageInputChange = (event) => {
    setCurrentPage(event.target.value);
  };

  const onCustomPage = (event) => {
    setFirst(event.first);
    setRows(event.rows);
    setCurrentPage(event.page + 1);
  };

  const multiSort = (value) => {
    ExposureActions.closeModal();
    setMultiSortColumns(value);
  }

  const resetMultiSort = () => {
    setMultiSortColumns([]);
  }

  const showSortModal = () => {
    ExposureActions.displayModal(ModalConstants.MODAL_MULTI_SORT_SETTINGS, {
      tableColumns: multiSortColOptions,
      defaultSortInitValue: defaultSortInitValue,
      multiSortColumns: multiSortColumns.length > 0 ? multiSortColumns : [defaultSortInitValue],
      handleCancel: ExposureActions.closeModal,
      handleMultiSort: multiSort,
      resetMultiSort: resetMultiSort
    });
  }

  // Pagination Layout
  const template = {
    layout: paginationLayout,
    PrevPageLink: (options) => {
      return (
        <button
          type="button"
          className={options.className}
          onClick={options.onClick}
          disabled={options.disabled}
        >
          <span className="p-p-3">{prevPageLinkText}</span>
          <Ripple />
        </button>
      );
    },
    NextPageLink: (options) => {
      return (
        <button
          type="button"
          className={options.className}
          onClick={options.onClick}
          disabled={options.disabled}
        >
          <span className="p-p-3">{nextPageText}</span>
          <Ripple />
        </button>
      );
    },
    PageLinks: (options) => {     
      return (
        <span
        className="p-mx-3"
        style={{ color: "var(--text-color)", userSelect: "none" }}
      >
        <InputText
          size="1"
          className="p-ml-1"
          value={currentPage}
          tooltip={pageInputTooltip}
          onKeyDown={(e) => onPageInputKeyDown(e, options)}
          onChange={onPageInputChange}
        /> of {options.totalPages}
      </span>
      )
    },
    RowsPerPageDropdown: (options) => {
      let dropdownOptions = [];
      const rowOptions = [...rowPerPageDropdownOptions];
      const totalRecords = options.totalRecords;
      let value = options.value;
      if (totalRecords < 5) {
        dropdownOptions = [{label: totalRecords, value: totalRecords}];
        value = totalRecords;
      } else if (totalRecords >= 5 && totalRecords <= 10) {
        dropdownOptions = rowOptions.slice(0,-1);
      } else {
        dropdownOptions = rowOptions;
      }
      return (
        <React.Fragment>          
          <Dropdown
            value={value}
            options={dropdownOptions}
            onChange={options.onChange}
            appendTo={document.body}
          />
        </React.Fragment>
      );
    },
    CurrentPageReport: (options) => {
        return (
            <span style={{ color: 'var(--text-color)' }}>
                Showing {options.first} - {options.last} of {options.totalRecords}
            </span>
        )
    }
  };

  const onSort = (e) =>{
    setMultiSortColumns(e.multiSortMeta);
  }

  let defaultProps = {
    value: nodes,
    paginator: true,
    first:  first,
    rows:  rows ,
    onPage:  onCustomPage,
    paginatorTemplate:  template,
    resizableColumns: true,
    sortMode: "multiple",
    pageLinkSize: 1,
    multiSortMeta: multiSortColumns,
    onSort: onSort,
    removableSort: true
  }

  let tableProps = _.extend(defaultProps, customTableProps);

  return (
    <div id="table">
        <div className="bot-table">
            <div className="table-title">{"Related Data Listing"}
              <div className="settings-container">
                <i className="pi pi-sort-alt" onClick={() => showSortModal()}></i>
                <i className="pi pi-cog" onClick={() => setShowModal(!showModal)}></i>
                <FreezePopUp
                  show={showModal}
                  setShowModal={setShowModal}
                  freezedColumns={freezedColumns} 
                  colOptions={colOptions} 
                  colFreezeOptions={colFreezeOptions}
                  onColumnFreeze={onColumnFreeze}
                  isMultiple={true}
                  showHideMetricProps={showHideMetricProps} 
                />                
              </div>            
            </div>            
            <DataTable ref={(el) => dt = el} {...tableProps} id="bot-table">
              {_columns()}
            </DataTable>
        </div>
    </div>
  );
}

BotPrimeTable.defaultProps = {
  tableData: [],
  gotoTooltipText: "Press 'Enter' key to go to this page.",
  defaultPaginationRows: 5,
  defaultPaginationFirst: 0,
  defaultCurrentPage: 1,
  toggleColumnLabel: 'Show/Hide Metric',
  globalSearchPlaceHolder: "Search",
  prevPageLinkText: 'Previous',
  nextPageText: 'Next',
  goToPageText: 'Go to',
  paginationLayout: "CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown",
  customTableProps: {},
  customColumnProps: {},
  rowPerPageDropdownOptions: [
    { label: 5, value: 5 },
    { label: 10, value: 10 },
    { label: 15, value: 15 },
  ],
  columnWidth: "170"
}

export default BotPrimeTable;
