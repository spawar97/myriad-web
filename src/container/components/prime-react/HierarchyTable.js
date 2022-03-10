
import React, { useState, useEffect, useRef  } from 'react';
import { TreeTable } from 'primereact-opt/treetable';
import { Column } from 'primereact-opt/column';
import { Ripple } from 'primereact-opt/ripple';
import { Dropdown } from 'primereact-opt/dropdown';
import Util from '../../util/util';
import CookieStore from '../../stores/CookieStore';
import { ContextMenu } from 'primereact-opt/contextmenu';
import { getObject, getSessionIntegar, setObject } from '../../util/SessionStorage'
import { Observable } from 'windowed-observable';
import  FrontendConstants from '../../constants/FrontendConstants'
import AccountUtil from '../../util/AccountUtil';
import PermissionsUtil from '../../util/PermissionsUtil';
import {FeatureListConstants, AccessPermissionsConstants} from '../../constants/PermissionsConstants'
const observable = new Observable(FrontendConstants.COLLABORATION_CONTEXT);
import RactScorecardStore from "../../stores/RactScorecardStore";
import './hierarchyTableStyle.scss';

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

const HierarchyTable = (props) => {
  let {showMulitilevelSorting, tableData, defaultPaginationFirst, defaultPaginationRows, defaultCurrentPage, gotoTooltipText, defaultExpansionKeys,
    toggleColumnLabel, globalSearchPlaceHolder, customeRowClassName, htmlRegex, paginationLayout, goToPageText, nextPageText,
    prevPageLinkText, customTableProps, toggleExpandedRowLabel, customColumnProps, columnStyle, rowPerPageDropdownOptions,
    columnsList, customHeader, tdHtmlClass, customUserFunction, showSearchHeader, pageLinkSize, scrollable, hasChildren,
    singleColumnTable, paginator, isWidgetization, allSelectCheckbox, isMultiple, columnWidth, hasGlobalSearch, showMultiselectWithSearch, lazyParams, lazyLoad, widgetId, widgetTitle, addTaskEnabled  } = props;
  
  const dt = useRef(null);
  const [cols, setCols] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  
  const [allNodes, setAllNodes] = useState([]);
  const [parentDropdown, setParentDropdown] = useState(null);
  const [childDropdown, setChildDropdown] = useState(null);
  const [selectedParentField, setSelectedParentField] = useState(null);
  const [selectedChildField, setSelectedChildField] = useState(null);
  const [parentOptions, setParentOptions] = useState([]);
  const [childOptions, setChildOptions] = useState([]);
  const [highchartThis, setHighchartThis] = useState({});
  const cm = useRef(null);

  const generateOptions = (field, level, allData) => {
    let options = [];

    if (level == "parent") {
      allData?.map((obj) => {
        options.push({ name: obj.data[field], value: obj.data[field], field: field });
      })
      options?.unshift({ name: 'All', value: 'All' });
    }
    else if (level == "child") {
      allData?.map((obj) => {
        obj.children.map((child) => {
          options.push({ name: child.data[field], value: child.data[field], field: field });
         })
      })
      options?.unshift({ name: 'All', value: 'All' });
    }

    return [...new Map(options.map(item =>
      [item["name"], item])).values()];
  }

  const HierachyDropdown = (field, parentPlaceholder, childPlaceholder, contextFilterOptions) => {
    let { parent, child } = contextFilterOptions;

    return (<>
    <div className='prt-drpdwn'>
      <Dropdown value={parentDropdown} options={parentOptions} onChange={(e) => updateParentLevelData(e, parentOptions, parent)} optionLabel="name" placeholder={parentPlaceholder} className='parent-drpdwn'/>
    </div>
    <div className='chld-drpdwn'>
      <Dropdown value={childDropdown} options={childOptions} onChange={(e) => updateChildLevelData(e, childOptions, child)} optionLabel="name" placeholder={childPlaceholder} className='child-drpdwn'/>
    </div>
    </>);
  }

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
        header: col.hierarchySort ? HierachyDropdown(col.field, col.parentPlaceholder, col.childPlaceholder, col.contextFilterOptions) : col.header,
        style: col.style ? col.style : {},
        expander: col.expander,
        className: col.frozen ? `freeze-column freeze-${i + 1}` : "",
        body: col.drilldown ? nameDrilldown : handleBody,
        filter: col.filter ? true : false,
        filterFunction: col?.filterFunction || null,
        filterMatchMode: col?.filterMatchMode || null,
        sortable: col?.hasOwnProperty('sortable') ? col.sortable : true,
      };

      let columnProps = _.extend(defaultColumnProps, {});

      return <Column {...columnProps}/>;
    }) : null;
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

  const setHierarchyOptions = (columnsList, allData) => {
    let hierarchyCol = columnsList.filter((obj) => obj.hierarchySort);
    if (hierarchyCol[0]) {
      let prntOptions = generateOptions(hierarchyCol[0].field, "parent", allData);
      let chldOptions =  generateOptions(hierarchyCol[0].field, "child", allData);
      setParentOptions(prntOptions);
      setChildOptions(chldOptions);
    }
  }

  const loadTable = async () => {
    let formattedHtmlData;
    // create deep copy of user custom table data
    if (tableData?.length) {
      const deepTableData = Util.deepCopyFunction(tableData);
      formattedHtmlData = formatHTMLData(deepTableData);
      setAllNodes(formattedHtmlData);
      setNodes(formattedHtmlData);
    } else {
      setAllNodes([]);
      setNodes([]);
    }
 
    if (columnsList?.length) {
      const deepColumnData = Util.deepCopyFunction(columnsList);
      let formatColumnData = formatColumnHTMLData(deepColumnData);
      setCols(formatColumnData);
      setHierarchyOptions(formatColumnData, formattedHtmlData);
    }
  }

  const chartLoaded = async () => {
    let loaded = await loadTable();
    return loaded;
  }

  //new Start

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
    let immExposureStore  =  props.exposureStore.getExposureStore();
    let immReport = props.exposureStore.getExposureStore().getIn(['files', props.fileId]);
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

  //new End

  useEffect(() => {
    chartLoaded();
    let store = RactScorecardStore.getStore();
    let highchartsData = store.get("highchartThis");
    setHighchartThis(highchartsData);
  
  }, [tableData]); 

  let checkBoxProps = customTableProps?.selectionMode === 'checkbox' ? {
    selectionKeys: selectedChecboxKeys,
    onSelectionChange: (e) => onCheckboxSelection(e)
  } : {};

  let defaultProps = {
    value: nodes,
    paginatorTemplate: template,
    header:  showSearchHeader ? searchHeader: false,
    resizableColumns: true,
    reorderableColumns: true,
    rowClassName: customeRowClassName,
    expandedKeys: expandedKeys,
    filterMode: "strict",
    columnResizeMode: "expand",
    onToggle: e => setExpandedKeys(e.value),
    cellSelection: true,
    selectionMode: "single",
    removableSort: true,
    onExpand: customUserFunction,
    pageLinkSize: pageLinkSize,
    contextMenuSelectionKey: selectedNodeKey,
    onContextMenuSelectionChange: event => setSelectedNodeKey(event.value),
    onContextMenu : event => {
      let immExposureStore  =  props.exposureStore.getExposureStore();
      let userHasCreateTask = AccountUtil.hasPrivilege(immExposureStore, 'isCreateTask') && 
                              PermissionsUtil.checkLoggedInUserHasAccessForFeature(FeatureListConstants.TASK, AccessPermissionsConstants.EDIT)
      if(addTaskEnabled && userHasCreateTask && !immExposureStore.get('isViewTasks')){
        cm.current.show(event.originalEvent)
      }
    },
    ref: dt,
    scrollable: scrollable,
    ...checkBoxProps
  }

  let tableProps = _.extend(defaultProps, customTableProps);

  const calculateChildLevelData = (allNodes, field, value, parentField, parentDropdownValue) => {
    let finalNodes = fetchChildrenNodes(allNodes, field, value);
    let filteredData;

    if (parentField) {
      filteredData = finalNodes.filter((obj) => obj.data[parentField] == parentDropdownValue);
    }
    else {
      filteredData = finalNodes;
    }
    setNodes(() => filteredData);
    return filteredData;
  }

  const updateChildOptions = (allData, field) => {
    let children = [];
    allData.map((obj) => {
      obj.children.map((chld) => {
        if (field) {
          children.push(chld.data[field])
        }
      })
    })
    let uniqChildren = _.uniq(children);

    let childOpts = [];
    uniqChildren?.map((obj) => {
      childOpts.push({ name: obj, value: obj, field: field });
    })
    childOpts?.unshift({ name: 'All', value: 'All' });
    setChildOptions(childOpts);
  }

  const updateContextFilter = (e, contextFilterOptions) => {
    let { aliasName, columnName, tableName } = contextFilterOptions;
    let immStore = props.exposureStore?.getExposureStore()?.toJS();
    let reportData = immStore?.files[props?.fileId]?.reportData;

    if (e.value !== 'All') {
      Util.saveAndPublishEvent(reportData, aliasName, [e.value], tableName, columnName, null, immStore);
    }
    else {
      Util.saveAndPublishEvent(reportData, aliasName, [], tableName, columnName, null, immStore);
    }
  }

  const updateParentLevelData = (e, options, contextFilterOptions) => {
    updateContextFilter(e, contextFilterOptions);

    let allData = Util.deepCopyFunction(allNodes);
    setParentDropdown(() => e.value);

    let field = options.filter((obj) => obj.value == e.value)[0]?.field;
    setSelectedParentField(() => field);

    let data = allData.filter((obj) => obj.data[field] == e.value);

    if (field && !selectedChildField) {
      setNodes(() => data);
      updateChildOptions(data, field);
    }
    else if (field && selectedChildField) {
      calculateChildLevelData(allNodes, selectedChildField, childDropdown, field, e.value);
      updateChildOptions(data, field);
    }
    else if (!field && selectedChildField){
      calculateChildLevelData(allNodes, selectedChildField, childDropdown, null, e.value);
      updateChildOptions(allData, selectedChildField);
    }
    else {
      setHierarchyOptions(cols, allData);
      setNodes(() => allData);
    }
    
  }

  const fetchChildrenNodes = (totalData, field, selectedValue) => {
    let allData = Util.deepCopyFunction(totalData);
    let finalNodes = [];

    finalNodes = allData.map((obj) => {
      let children = [];
      
      if (field) {
        obj.children?.map((node) => {
          if (node.data[field] == selectedValue) {
            children.push(node);
          }
        })
      }
      else {
        obj.children?.map((node) => {
          children.push(node);
        })
      }

      obj.children = children;
      return obj;
    })

    return finalNodes;
  }


  const updateChildLevelData = (e, options, contextFilterOptions) => {
    updateContextFilter(e, contextFilterOptions);
    setChildDropdown(e.value);
    
    let field = options.filter((obj) => obj.value == e.value)[0]?.field;
    setSelectedChildField(field);

    calculateChildLevelData(allNodes, field, e.value, selectedParentField, parentDropdown);
  }

  return (
    <div>
       <ContextMenu model={contextMenu} ref={cm} onHide={() => setSelectedNodeKey(null)} id="context"/>
      <TreeTable {...tableProps}>
        <Column className='prime-hidden-column' />
        {_columns()}
      </TreeTable>
    </div>
  );
}

HierarchyTable.defaultProps = {
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
  lazyLoad: false
}

export default HierarchyTable;

