import React, { useState, useEffect, useRef } from 'react';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './style.scss';
import "primereact-opt/resources/primereact.css";
import "primeflex/primeflex.css"
import { TreeTable } from 'primereact-opt/treetable';
import { Column } from 'primereact-opt/column';
import { InputText } from 'primereact-opt/inputtext';
import { Dropdown } from 'primereact-opt/dropdown';
import { Ripple } from 'primereact-opt/ripple';
import { Button } from 'primereact-opt/button';
import { ContextMenu } from 'primereact-opt/contextmenu';
import { MultiSelect } from 'primereact-opt/multiselect';
import classNames from 'classnames'
import { Checkbox } from 'primereact-opt/checkbox';
import Imm from 'immutable';
import FreezePopUp from './FreezePopUp';
import RactScorecardStore from "../../stores/RactScorecardStore";
import Utils from "../../util/util";
import ComprehendQuery from "../../lib/ComprehendQuery";
import ExposureActions from '../../actions/ExposureActions';
import ModalConstants from '../../constants/ModalConstants';
import StatusMessageTypeConstants from '../../constants/StatusMessageTypeConstants';
import Util from '../../util/util';
import CookieStore from '../../stores/CookieStore';
import { getObject, getSessionIntegar, setObject } from '../../util/SessionStorage'
import { Observable } from 'windowed-observable';
import  FrontendConstants from '../../constants/FrontendConstants'
import AccountUtil from '../../util/AccountUtil';
import PermissionsUtil from '../../util/PermissionsUtil';
import {FeatureListConstants, AccessPermissionsConstants} from '../../constants/PermissionsConstants'
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);

var selectedItems = {};
let cookiesStore =  CookieStore.getCookies()



// Custom Logic for adding classname to specific rows
const rowClassName = (node) => {

  let classes = {};
  let classes1 = {};

  let nodeChild = node.children && node.children[0] && node.children[0].data;

  if (node.children && node.children.length === 1) {
    classes1 = { 'div-comp': (nodeChild && nodeChild.name && nodeChild.name.props && nodeChild.name.props.dangerouslySetInnerHTML && $(nodeChild.name.props.dangerouslySetInnerHTML.__html).hasClass("t-component")) };
  }

  classes = {
    'blue-highlight': node.key.includes("-") ? false : true,
    'light-highlight': node.key.split("-").length === 2,
    'relative-highlight': node.key.split("-").length === 4
  }

  return mergeLodash(classes1, classes);
}


const PrimeTable = (props) => {

  let {showMulitilevelSorting ,tableData, defaultPaginationFirst, defaultPaginationRows, defaultCurrentPage, gotoTooltipText, defaultExpansionKeys,
    toggleColumnLabel, globalSearchPlaceHolder, customeRowClassName, htmlRegex, paginationLayout, goToPageText, nextPageText,
    prevPageLinkText, customTableProps, toggleExpandedRowLabel, customColumnProps, columnStyle, rowPerPageDropdownOptions,
    columnsList, customHeader, tdHtmlClass, customUserFunction, showSearchHeader, pageLinkSize, scrollable, hasChildren,
    singleColumnTable, paginator, isWidgetization, allSelectCheckbox, isMultiple, columnWidth, hasGlobalSearch, showMultiselectWithSearch, lazyParams, lazyLoad, widgetId, widgetTitle, addTaskEnabled ,customeFilterFunction, selectionBoxConfigs } = props;

    addTaskEnabled = addTaskEnabled ? addTaskEnabled : false;

  const [globalFilter, setGlobalFilter] = useState(null);
  const [first, setFirst] = useState(defaultPaginationFirst);
  const [rows, setRows] = useState(defaultPaginationRows);
  const [currentPage, setCurrentPage] = useState(defaultCurrentPage);
  const [pageInputTooltip, setPageInputTooltip] = useState(
    gotoTooltipText
  );

  const [nodes, setNodes] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState(defaultExpansionKeys);
  const [freezedColumns, setFreezedColumn] = useState([]);
  const [cols, setCols] = useState([]);
  const [colOptions, setColOptions] = useState([]);
  const [colFreezeOptions, setColFreezeOptions] = useState([]);
  const [multiSortColOptions, setMultiSortColOptions] = useState([]);
  let defaultSortInitValue = {field: '', order: ''};
  const [multiSortColumns, setMultiSortColumns] = useState([defaultSortInitValue]); 
  const [showModal, setShowModal] = useState(false);
  const [highchartThis, setHighchartThis] = useState({});
  const [selected, setSelected] = useState(null);
  const [lazyData, setLazyData] = useState([]);

  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const cm = useRef(null);

  let [selectedItem, setSelectedItem] = useState({});
  const dt = useRef(null);
  const [selectedChecboxKeys, setSelectedCheckboxKeys] = useState({});
  const [selectAllChecked, setSelectAllChecked] = useState(false);
  const [lazyApiCount, setLazyApiCount] = useState(null);
  const [lazyLoader, setLazyLoader] = useState(false);
  const [controllerSignal, setControllerSignal] = useState(null);
  

  const onChangeMultiSelectValue = (e, key) => {
    dt.current.filter(e.value, key, 'in')
    customeFilterFunction == true ?  dt.current.filter(e.value, key, 'custom') :  dt.current.filter(e.value, key, 'in')
    setSelectedItem({ [key]: e.value });
    selectedItems[key]= e.value
  }

  const representativesItemTemplate = (option) => {
    return (
      <div className="p-multiselect-representative-option">
        <span className="image-text">{option.name}</span>
      </div>
    );
  }
  
  const getUniqOptions = (nodesArray, field) => {
    let options = [];
    let dataValues = nodesArray.map((obj) => obj.data?.[field])
    _.uniq(dataValues).map((value) => {
      let obj = {};
      if (htmlRegex.test(value)) {
        obj["name"] = $(value).text();
      }
      else {
        obj["name"] = value;
      }
      options.push(obj)
    });
    return options;
  }

  const customColumnFilter = (value, options) => {

    if (nodes?.length && _.isEmpty(options)) {
      options = getUniqOptions(nodes, value);
    }    
    
    if (!_.isEmpty(options)) {
      let MultiSelectComponent = (
        <MultiSelect
          value={selectedItems[value]}
          options={options}
          itemTemplate={representativesItemTemplate}
          onChange={(e) => onChangeMultiSelectValue(e, value)}
          optionLabel="name"
          optionValue="name"
          placeholder="All"
          filter = {showMultiselectWithSearch == true ? true : false}
          className={showMultiselectWithSearch == true ? "multiselect-custom" : "p-column-filter"}
        />);

      return  allSelectCheckbox ? <SelectAll/> : MultiSelectComponent
    }

  }
 
  const _onChange = () => {
    setLazyData(RactScorecardStore.getAll());
  }

  /***  parse Html in table data ***/
  function parseObjectKeys(obj) {
    for (var prop in obj) {
      var sub = obj[prop]

      if (sub && typeof (sub) === "object") {
        parseObjectKeys(sub);
      }

      else if (sub && typeof (sub) === "string") {

        if (htmlRegex.test(sub)) {
          let a = <div class={tdHtmlClass} dangerouslySetInnerHTML={{ __html: sub }}></div>;
          obj[prop] = sub;
        }

      }
    }
  }

  const formatHTMLData = (data) => {
    data.map((object) => {
      parseObjectKeys(object)
    })
    return data;
  }

  const formatColumnHTMLData = (data) => {
    let colHtml = data.map((object) => {
      object["header"] = <div dangerouslySetInnerHTML={{ __html: object.header }}></div>;
      return object;
    })
    return colHtml;
  }


  const onColumnToggle = (event) => {
    let freezeData = [], freezeDataStyle = [], unfreezeData = [], unfreezeDataStyle = [];
    if (isMultiple) {
      let currentFreezedColumns = event.value.filter(obj => obj.frozen === true);
      setFreezedColumn(currentFreezedColumns);
      let style = { width: `${columnWidth}px`, height: '40px' };
      let columnsData = _.chain(event.value).sortBy((column) => column.id).map((column, i) => {
        let freezedStyle = { ...style, left: `${i * columnWidth}px` };
        let lastFreezedColumnStyle = { ...freezedStyle, borderWidth: '0 1px 1px 0' }
        column.style = i + 1 == currentFreezedColumns.length ? lastFreezedColumnStyle : column.frozen ? freezedStyle : style;
        return column;
      }).value();
      freezeData = columnsData.filter(obj => obj.frozen === true) 
      if(freezeData.length){
      let freezeDataLength = freezeData.length - 1;
      freezeDataStyle = freezeData.map((obj, index) => {
        if (isMultiple) {
          obj.style.left = `${index * columnWidth}px`
          if (freezeDataLength == index) {
            obj.style.borderWidth = '0 1px 1px 0'
          } else {
            obj.style.borderWidth = '0 0 1px 0'
          }
          return obj;
        }
      })
      unfreezeData = columnsData.filter(obj => obj.frozen === false)
      unfreezeDataStyle = unfreezeData.map((obj) => {
        if (isMultiple) {
          obj.style = { width: `${columnWidth}px`, height: '40px' };
        }
        return obj;
      })
      columnsData = [...freezeDataStyle, ...unfreezeDataStyle]
      }
      setCols(columnsData);
    } else {
      let columnsData = _.chain(event.value).sortBy((column) => column.id).toArray().value();
      setCols(columnsData);
    }
  }

  const [toggleLabel, setToggleLabel] = useState(toggleExpandedRowLabel);

  const toggleApplications = () => {

    if (Object.keys(expandedKeys).length) {
      setExpandedKeys({})
      setToggleLabel("Expand All");
    }
    else {
      setExpandedKeys(defaultExpansionKeys);
      setToggleLabel("Collapse All");
    }
    customUserFunction();
  }

  const onColumnFreeze = (event) => {
    setFreezedColumn(event.value);
    let columns = cols;

    let removedColumns = columns.map((obj) => {
      obj.frozen = false;
      if(isMultiple){
        obj.style = { width: `${columnWidth}px`, height: '40px' };
      }
      return obj;
    })

    let array = [];
    let updatedColumns = [];

    if(isMultiple){
      removedColumns = _.sortBy(removedColumns.concat(event.value), "id");
      array = _.sortBy(array.concat(event.value), "id");
      updatedColumns = array.map((obj, index, {length}) => { 
        obj.frozen = true;
        obj.style = {...obj.style, left: `${index * columnWidth}px`};
        if(index + 1 == length){
          obj.style = {...obj.style, borderWidth: '0 1px 1px 0' };
        }
        return obj;
      })
    } else{
      array.push(event.value);
     updatedColumns = array.map((obj) => {
        obj.frozen = true;
        return obj;
      })
    }

    const mergedArray = [...updatedColumns, ...removedColumns];
    let set = new Set();
    let finalMultiple = mergedArray.filter(item => {
      if (!set.has(item.id)) {
        set.add(item.id);
        return true;
      }
      return false;
    }, set);

    let final = Object.values(removedColumns.concat(updatedColumns).reduce((r, o) => {
      r[o.id] = o;
      return r;
    }, {}));


    isMultiple ? setCols(finalMultiple) : setCols(final);
  }

  // Function to handle drilldown with expander
  const triggered = (e) => {
    let drilldownAttr = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.drilldown;
    Utils.drilldownToSpecificDashboard(drilldownAttr, highchartThis);
  }

  const getDrilldown = (study, key, drilldownData) => {
    let obj = drilldownData && drilldownData.find(object => object[key] === study);
    return (obj && obj.drilldown) ? obj.drilldown : false;
  }

  let drillDownData;

  const _columns = () => {
    return cols && cols.length ? cols.map((col, i) => {

      col.drilldown ? drillDownData = col.drilldown.drilldownData : null;

      const handleBody = (node) => {
        return <span dangerouslySetInnerHTML={{__html: node.data[col.field]}}></span>;
      }

      let defaultColumnProps = {
        key: col.id,
        columnKey: `${col.id}`,
        field: col.field,
        header: col.header,
        style: col.style ? col.style : {},
        expander: col.expander,
        className: col.frozen ? `freeze-column freeze-${i + 1}` : "",
        reorderable: col.frozen ? false : true,
        filterHeaderClassName: col.frozen ? `freeze-column freeze-${i + 1}` : "", 
        sortable: col?.hasOwnProperty('sortable') ? col.sortable : true ,
        body: col.drilldown ? nameDrilldown : handleBody,
        filter: col.filter ? true : false,
        filterElement: col.filterElement ? customColumnFilter(col.field, col.columnMultiSelectOptions) : null,
        filterFunction: col?.filterFunction || null,
        filterMatchMode: col?.filterMatchMode || null,
      };

      let columnProps = _.extend(defaultColumnProps, {});

      return <Column {...columnProps}/>;
    }) : null;
  }

  // Specific code to handle drilldown from name
  const nameDrilldown = (node) => {
    let name = node.data.name;

    let drillableElement = getDrilldown(name, "studyname", drillDownData);

    if (drillableElement) {
      return <a class="prime-drilldown" onClick={(e) => triggered(e)} data-drilldown={JSON.stringify(drillableElement)}>{name}</a>
    }
    else {
      return name;
    }
  }

  const treeTableFuncMap = {
    'globalFilter': setGlobalFilter,
  };

  let showHideMetricProps = {
    toggleColumnLabel: toggleColumnLabel,
    cols: cols,
    colOptions: colOptions,
    onColumnToggle: onColumnToggle
  }
  const multiSort = (value) => {
    ExposureActions.closeModal();
    setMultiSortColumns(value);
  }

  const resetMultiSort = () => {
    setMultiSortColumns([defaultSortInitValue]);
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
  const getHeader = (globalFilterKey) => {
    let multisortHtml= "";
    if(showMulitilevelSorting){
      multisortHtml= <i className="pi pi-sort-alt" onClick={() => showSortModal()}></i>
    }
    return (
      <div className='table-headers-components' >
        {customHeader ? <div className="custom-header-comp" dangerouslySetInnerHTML={{ __html: customHeader }} /> : null}
        <div id='prime-collapse'>
          {hasChildren ? <Button className='collapse-button' onClick={toggleApplications} label={toggleLabel} /> : null}
          {!hasGlobalSearch ? <div className="text-right">
            <div className="p-input-icon-left">
              <i className="pi pi-search"></i>
              <InputText
                type="search"
                onInput={(e) => treeTableFuncMap[`${globalFilterKey}`](e.target.value)}
                placeholder={globalSearchPlaceHolder}
                size="50"
              />
            </div>
          </div> : null }
        </div>
        { !singleColumnTable ? <div className="cog-container">
          {multisortHtml}
          <i className="pi pi-cog" onClick={() => setShowModal(!showModal)}></i>
          <FreezePopUp
            show={showModal}
            setShowModal={setShowModal}
            freezedColumns={freezedColumns}
            colOptions={colOptions}
            colFreezeOptions={colFreezeOptions}
            onColumnFreeze={onColumnFreeze}
            showHideMetricProps={showHideMetricProps}
            isMultiple = {isMultiple ? true : false}
          />
        </div> : null}
      </div>
    );
  }


  let searchHeader = getHeader('globalFilter');

  const chartLoaded = async () => {
    let loaded = await loadTable();
    return loaded;
  }

  const loadTable = async () => {
    // create deep copy of user custom table data
    if (tableData?.length) {
      const deepTableData = Util.deepCopyFunction(tableData);
      let formattedHtmlData = formatHTMLData(deepTableData);
      setNodes(formattedHtmlData);
    }
    else {
      setNodes([]);
    }

    if (columnsList?.length) {
      const deepColumnData = Util.deepCopyFunction(columnsList);
      let formatColumnData = formatColumnHTMLData(deepColumnData);

      setCols(formatColumnData);

      // Set options for hide show columns
      let colOptions = [];
      let multiSortColOptions = [];
      for (let col of formatColumnData) {
        multiSortColOptions.push({label: col.header, value: col.field, disabled: col.disabled });
        colOptions.push({ label: col.header, value: col, disabled: col.disabled });
      }
      setColOptions(colOptions);
      setMultiSortColOptions(multiSortColOptions);

      // Set options for freeze columns
      let colFreezeOptions = [];
      isMultiple ? [] : colFreezeOptions.push({ label: "None", value: "" })
      for (let col of formatColumnData) {
        colFreezeOptions.push({ label: col.header, value: col });
      }
    setColFreezeOptions(colFreezeOptions);

    let frozenColumn = deepColumnData.filter(obj => obj.frozen === true);
    isMultiple ? setFreezedColumn(frozenColumn) : setFreezedColumn(frozenColumn[0]);
      
    if (isMultiple) {
        onColumnToggles(deepColumnData)
      }
    }
  }
  function onColumnToggles(frozenColumn) {
    let currentFreezedColumns = frozenColumn.filter(obj => obj.frozen === true);
    let style = { width: `${columnWidth}px`, height: '40px',pointerEvents: "auto" };
    let columnsData = _.chain(frozenColumn).sortBy((column) => column.id).map((column, i) => {
      let freezedStyle = { ...style, left: `${i * columnWidth}px` };
      let lastFreezedColumnStyle = { ...freezedStyle, borderWidth: '0 1px 1px 0' }
      column.style = i + 1 == currentFreezedColumns.length ? lastFreezedColumnStyle : column.frozen ? freezedStyle : style;
      return column;
    }).value();
    setCols(columnsData)
  }

  const sortData = (unsortedData) => {
    return unsortedData.sort((a,b) => (a.data.name > b.data.name) ? 1 : ((b.data.name > a.data.name) ? -1 : 0));
  }

  const cancelPreviousApi = async () => {
    let oldLazyRequest = controllerSignal;

    if (oldLazyRequest && typeof oldLazyRequest === "object") {
     await oldLazyRequest?.abort();
     setControllerSignal(null);   
    }
  }

  useEffect(() => {
    chartLoaded();
    let store = RactScorecardStore.getStore();
    let highchartsData = store.get("highchartThis");
    setHighchartThis(highchartsData);
  
  }, [tableData]); 


  useEffect(() => {
    // Monitor store
    RactScorecardStore.addChangeListener(_onChange);
    
    // create deep copy of user custom table data
    if (lazyData &&  lazyData.length && (JSON.stringify(nodes) !== JSON.stringify(lazyData))) {
      const deepTableData = Util.deepCopyFunction(lazyData);
      let formattedHtmlData = formatHTMLData(deepTableData);
      let finalData = sortData([...nodes, ...formattedHtmlData]);
      setNodes(finalData);
    }

    return () => {
      RactScorecardStore.removeChangeListener(_onChange);
    }
  }, [lazyData]);

  useEffect(() => {
    customUserFunction();
  });

  // GoTo Page Functionality
  const onPageInputKeyDown = (event, options) => {
    if (event.key === "Enter") {
      const page = parseInt(currentPage);
      if (page < 0 || page > options.totalPages) {
        setPageInputTooltip(
          `Value must be between 1 and ${options.totalPages}.`
        );
      } else {
        const first = currentPage ? options.rows * (page - 1) : 0;

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
      if (
        (options.view.startPage === options.page &&
          options.view.startPage !== 0) ||
        (options.view.endPage === options.page &&
          options.page + 1 !== options.totalPages)
      ) {
        const className = classNames(options.className, { "p-disabled": true });

        return (
          <span className={className} style={{ userSelect: "none" }}>
            ...
          </span>
        );
      }

      return (
        <button
          type="button"
          className={options.className}
          onClick={options.onClick}
        >
          {options.page + 1}
          <Ripple />
        </button>
      );
    },
    RowsPerPageDropdown: (options) => {
      let allPageOption = { label: "All", value: options.totalRecords };
      const dropdownOptions = [...rowPerPageDropdownOptions, allPageOption];

      return (
        <Dropdown
          value={options.value}
          options={dropdownOptions}
          onChange={options.onChange}
          appendTo={document.body}
        />
      );
    },
    CurrentPageReport: (options) => {
      return (
        <span
          className="p-mx-3"
          style={{ color: "var(--text-color)", userSelect: "none" }}
        >
          {goToPageText}{" "}
          <InputText
            size="2"
            className="p-ml-1"
            value={currentPage}
            tooltip={pageInputTooltip}
            onKeyDown={(e) => onPageInputKeyDown(e, options)}
            onChange={onPageInputChange}
          />
        </span>
      );
    }
  };

  const drillElement = (event) => {
    let drilldownData = event.originalEvent.target && event.originalEvent.target.firstElementChild && event.originalEvent.target.firstElementChild.lastElementChild && event.originalEvent.target.firstElementChild.lastElementChild.getAttribute("data-drilldown");

    // If drilldown attribute is present then only drilldown
    if (drilldownData) {
      Utils.drilldownToSpecificDashboard(drilldownData, highchartThis);
    }
    setSelected(event.value);
  }

  const getCoordinates = () => {
    let elem = document.getElementById("context");
    let box = elem.getBoundingClientRect();

    let coordinates = {
      x: box.left,
      y: box.bottom,
      xWithScroll: box.left + window.pageXOffset,
      yWithScroll: box.bottom + window.pageYOffset,
    };
    return coordinates;
  }

  const toggleAddTask = (selectedNodeKey, actionType) => {
    let tabId = getObject("currentWidgetizationTab")
    let {x: pointX  , y:pointY} = getCoordinates()
    let { immReport,immExposureStore } =  highchartThis?.props;
    let args = {immReport,immExposureStore, widgetId, widgetTitle,  pointX, pointY, actionType, CookieStore, tabId };
    let taskObject = Util.generateContextObject(args);
    observable.publish(taskObject); 
  }

  let contextMenu = [
    {
      label: 'Add Task',
      icon: 'icon-add-task',
      command: () => toggleAddTask(selectedNodeKey, FrontendConstants.ADD_TASK)
    } 
  ]

  const getSelectedValues = (currentSelected) => {
    let { field } = selectionBoxConfigs;
    let currentSelectedNodes = [];
    
    currentSelected?.map((key) => {
      nodes?.filter((node) => { 
        if(node?.key == key) {
          currentSelectedNodes.push(node?.data[field])
        }
      })
    });

    let values = currentSelectedNodes.map((html) => $(html)[0]?.dataset?.id);
    return values?.length ? values : 'clearAll';
  }

  const publishContextFilter = (currentSelected) => {
    let { columnName, tableName, currentWidget } = props?.widgetInfo;
    let immStore = props.exposureStore?.getExposureStore()?.toJS();
    let reportData = immStore?.files[props?.fileId]?.reportData;

    let selectedValues = getSelectedValues(currentSelected)
    Utils.saveAndPublishEvent(reportData, currentWidget, selectedValues, tableName, columnName, null, immStore);
  }

  const onCheckboxSelection = (event) => {
    let { value } = event;
    let currentSelectedValues = Object.keys(value);

    let checkboxSelectedLength = Object.keys(currentSelectedValues)?.length;
    let tableDataLength = tableData?.length;
    let isAllCheckBoxSelected = checkboxSelectedLength === tableDataLength;
     
 
    if (isWidgetization) {

      publishContextFilter(currentSelectedValues);

    }

    setSelectedCheckboxKeys(value);
  }


  // scrollable: true This property breaks in 6.3.2 
  let checkBoxProps = customTableProps?.selectionMode === 'checkbox' ? {
    selectionKeys: selectedChecboxKeys,
    onSelectionChange: (e) => onCheckboxSelection(e)
  } : {};
  
  const onSort = (e) =>{
    setMultiSortColumns(e.multiSortMeta);
  }

  let defaultProps = {
    value: nodes,
    paginator: paginator,
    first:  first,
    rows:  rows ,
    onPage:  onCustomPage,
    paginatorTemplate:  template,
    globalFilter:  globalFilter,
    header:  showSearchHeader ? searchHeader: false,
    resizableColumns: true,
    reorderableColumns: true,
    rowClassName: customeRowClassName,
    expandedKeys: expandedKeys,
    sortMode: "multiple",
    filterMode: "strict",
    columnResizeMode: "expand",
    onToggle: e => setExpandedKeys(e.value),
    cellSelection: true,
    selectionMode: "single",
    selection: selected,
    multiSortMeta: multiSortColumns,
    onSort: onSort,
    removableSort: true,
    onSelectionChange: e => drillElement(e),
    onExpand: customUserFunction,
    pageLinkSize: pageLinkSize,
    contextMenuSelectionKey: selectedNodeKey,
    onContextMenuSelectionChange: event => setSelectedNodeKey(event.value),
    onContextMenu : event => {
      let { immExposureStore } =  highchartThis?.props;
      let userHasCreateTask = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask') && 
                              PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)
      if(addTaskEnabled && userHasCreateTask && !immExposureStore.get('isViewTasks')){
        cm.current.show(event.originalEvent)
      }
    },
    ref: dt,
    scrollable:scrollable,
    ...checkBoxProps
  }



  let tableProps = _.extend(defaultProps, customTableProps);


  const onChangeSelectAll = (e) => {

    let checked = e?.checked;
    let selectAllNodes = {};

    let allSelectedValues = [];
    if (checked) {
      allSelectedValues = nodes.map((obj) => {
        let key = obj['key'];

        selectAllNodes[key] = {
          checked: true,
          partialChecked: false
        };
         
        return key;
      })
    }

    publishContextFilter(allSelectedValues);
    setSelectedCheckboxKeys(selectAllNodes);
    setSelectAllChecked(e.checked);
  }

  const SelectAll = () => {
    return (
      <div
        className="p-field-checkbox select-all-checkbox"
      >
        <Checkbox
          inputId="select-all"
          checked={selectAllChecked}
          onChange={e => onChangeSelectAll(e)}
        />
        <label
          htmlFor="select-all"
        >
          {'Select All'}
        </label>
      </div>
    );
  }

  const lazyLoadedData = async (params) => {

    let {query, signal, disableContextFilter} = params
    let fileId = props.fileId;
    let immQueryOptionsWrapper = props?.exposureStore?.getImmQueryOptionsWrapper(fileId);
  
    let value = await ComprehendQuery.filterWidgetAsyncQuery(fileId, immQueryOptionsWrapper, [query], signal, disableContextFilter, props.exposureStore?.getExposureStore()?.toJS().fetchedTaskFilters).then((res) => {
      let { dataFormatterCallback, cqlId, parseApiData } = lazyParams;

      if (res?.Error) {

        throw new Error(res?.Error?.message);

      } else {

        let parseData = res && parseApiData(res, [query], cqlId);
        
        let tableRowsData = parseData && dataFormatterCallback(parseData, cqlId);

        return tableRowsData
      }
    }).catch(err => {
      ExposureActions.createStatusMessage(
        err?.message,
        StatusMessageTypeConstants.WARNING,
      );
    });

    return value;
  }
  
  // Bug in 6.3.2 release hence scrollable is disabled and <Column /> is added 
  const loadMore = async (params) => {
    let {query, signal, initialState, disableContextFilter } = params;
    setLazyLoader(true);

    let lazyLoadParams = { query, signal, disableContextFilter };

    let lazyData = await lazyLoadedData(lazyLoadParams);

    let { parsedTableData } = lazyData;
    let loadedParseData = parsedTableData ?? [];

    if (initialState) {
      setNodes([...loadedParseData]);
      setLazyLoader(false);
    } else {
      setNodes((prev) => { return [...prev, ...loadedParseData] });
    }

    setSelectAllChecked(false);

    return lazyData
  }

  // Load more button
  const lazyLoadMore = async () => {
    
    let { queries } = lazyParams;
    if (lazyApiCount < (queries?.length - 1)) {
      let disableContextFilter = false;
      let params = {
        query: queries[lazyApiCount + 1],
        disableContextFilter
      };

      await loadMore(params)
      setLazyApiCount(lazyApiCount + 1);
      setLazyLoader(false);

    }
  }

  // Eager load
  const eagerLoad = async (query, signal) => {
    let disableContextFilter = true;
    
    for(let obj of query) {

      let params = {
        query: obj,
        signal,
        disableContextFilter
      };

      await loadMore(params);
    }
    setLazyLoader(false);
  }

  
  const checkAllSelect = () => {
    let currentSelectedCheckbox = selectedChecboxKeys && Object.keys(selectedChecboxKeys)?.length;
    if (currentSelectedCheckbox) {
      let isAllCheckBoxSelect = currentSelectedCheckbox === nodes?.length;
      setSelectedCheckboxKeys(isAllCheckBoxSelect)
    }
  }

  const fetchInitialLazyData = async (query, signal) => {
    let { type, queries } = lazyParams;
    let initialState = true;
    let params = {
      query, signal, initialState
    };

    await loadMore(params).then((res) => {

      if (res?.Error) {

        throw new Error(res?.Error?.message);

      } 
      else if (type === 'backgroundLoad') {

        let restQueries = queries?.slice(1, queries?.length);
        if (restQueries?.length) {
          eagerLoad(restQueries, signal);
        }else{
          checkAllSelect();
        }

      }

    }).catch(err => {
      ExposureActions.createStatusMessage(
        err?.message,
        StatusMessageTypeConstants.WARNING,
      );
    });

  }

  
  useEffect(() => {
    let { queries, type } = lazyParams;

    if (lazyLoad && queries?.length) {
      cancelPreviousApi();
      let controller = new AbortController();
      let fileId = props.fileId;
      
      if (type === 'backgroundLoad') {
        ExposureActions.updateRequests(fileId, controller);
        setControllerSignal(controller);
        fetchInitialLazyData(queries[0], controller.signal)

      } else if ('loadMore') {
          ExposureActions.updateRequests(fileId, controller);
          fetchInitialLazyData(queries[0], controller.signal);
          checkAllSelect();
          setLazyApiCount(0);
      }

    }

  }, [lazyParams?.queries])

  let { queries, type, totalLazyCount } = lazyParams;

  return (
    <div className="table-container">
      <ContextMenu model={contextMenu} ref={cm} onHide={() => setSelectedNodeKey(null)} id="context"/>
      
      <TreeTable {...tableProps}>
        <Column className='prime-hidden-column' />
        {_columns()}
      </TreeTable>
      {lazyLoad && queries?.length && type == "loadMore" && (lazyApiCount !== (queries?.length - 1)) ?
        <div className="load-more-content">
          <Button label={lazyLoader ? "Loading..." : "Load More..."} loading={lazyLoader} onClick={(e) => lazyLoadMore(e)} />
        </div>
        : null}
      {lazyLoad && type == "loadMore" && <span> {nodes?.length} of {totalLazyCount} rows</span>}
      {lazyLoad && queries?.length && type == "backgroundLoad" && lazyLoader ?
        <div className="load-more-content bg-load">
          <div className="loading">Loading</div>
        </div>
        : null}
    </div>
  );
}

PrimeTable.defaultProps = {
  tableData: [],
  gotoTooltipText: "Press 'Enter' key to go to this page.",
  defaultPaginationRows: 10,
  defaultPaginationFirst: 0,
  defaultCurrentPage: 1,
  defaultExpansionKeys: { "0": true, "0-0": true },
  columnsList: [{ id: 0, field: 'name', header: 'Name', expander: true },
  { id: 1, field: 'size', header: 'Size' },
  { id: 2, field: 'type', header: 'Type' }],
  toggleColumnLabel: 'Show/Hide Metric',
  globalSearchPlaceHolder: "Search",
  customeRowClassName: rowClassName,
  prevPageLinkText: 'Previous',
  nextPageText: 'Next',
  goToPageText: 'Go to',
  paginationLayout: "FirstPageLink  PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown  CurrentPageReport",
  // In order to check if any html element is passed as string we are using this regex
  htmlRegex: /<(?=.*? .*?\/ ?>|br|hr|input|!--|wbr)[a-z]+.*?>|<([a-z]+).*?<\/\1>/i,
  customTableProps: {},
  customColumnProps: {},
  toggleExpandedRowLabel: 'Collapse All',
  rowPerPageDropdownOptions: [
    { label: 5, value: 5 },
    { label: 10, value: 10 },
    { label: 20, value: 20 },
    { label: 50, value: 50 }
  ],
  tdHtmlClass: "prime-ele",
  customHeader: "",
  showSearchHeader: true,
  // If custom function is not passed return empty function
  customUserFunction: function(){ },
  scrollable:false,
  hasChildren:true,
  singleColumnTable: false,
  paginator:true,
  isWidgetization:false,
  columnWidth: "170",
  hasGlobalSearch : false,
  allSelectCheckbox:false,
  lazyParams: {},
  lazyLoad: false,
  selectionBoxConfigs: {}
}

export default PrimeTable;

