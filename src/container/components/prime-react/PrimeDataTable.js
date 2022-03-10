import React, { useState, useEffect } from 'react';
import 'primereact-opt/resources/themes/saga-blue/theme.css';
import 'primereact-opt/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import './style.scss';
import "primereact-opt/resources/primereact.css";
import "primeflex/primeflex.css"
import { DataTable } from 'primereact-opt/datatable';
import { Column } from 'primereact-opt/column';
import { InputText } from 'primereact-opt/inputtext';
import { Dropdown } from 'primereact-opt/dropdown';
import { Ripple } from 'primereact-opt/ripple';
import { Button } from 'primereact-opt/button';
import classNames from 'classnames'
import FreezePopUp from './FreezePopUp';
import RactScorecardStore from "../../stores/RactScorecardStore";
import Utils from "../../util/util";


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


const PrimeDataTable = (props) => {
    let { tableData, defaultPaginationFirst, defaultPaginationRows, defaultCurrentPage, gotoTooltipText, defaultExpansionKeys,
        toggleColumnLabel, globalSearchPlaceHolder, customeRowClassName, htmlRegex, paginationLayout, goToPageText, nextPageText,
        prevPageLinkText, customTableProps, toggleExpandedRowLabel, customColumnProps, columnStyle, rowPerPageDropdownOptions,
        columnsList, customHeader, tdHtmlClass, customUserFunction, showSearchHeader, pageLinkSize, widgetInfo } = props;

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
    const [showModal, setShowModal] = useState(false);
    const [highchartThis, setHighchartThis] = useState({});
    const [selected, setSelected] = useState(null);
    const [lazyData, setLazyData] = useState([]);
    const [selectedValues, setSelectedValues] = useState([]);
    const [widgetFilterInfo, setwidgetFilterInfo] = useState(widgetInfo);

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
        let columnsData = _.chain(event.value).sortBy((column) => column.id).toArray().value();
        setCols(columnsData);
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
            return obj;
        })

        let array = [];
        array.push(event.value);

        let updatedColumns = array.map((obj) => {
            obj.frozen = true;
            return obj;
        })

        let final = Object.values(removedColumns.concat(updatedColumns).reduce((r, o) => {
            r[o.id] = o;
            return r;
        }, {}));


        setCols(final);
    }

    const codeFilter = (value, filter) => {
        
        return filter > value;
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
                return <span dangerouslySetInnerHTML={{ __html: node.data[col.field] }}></span>;
            }
            
            let defaultColumnProps = {
                key: col.id,
                columnKey: `${col.id}`,
                field: col.field,
                header: col.header,
                style: col.style ? col.style : {},
                expander: col.expander,
                className: col.frozen ? `freeze-column freeze-${i + 1}` : "",
                sortable: false,
                body: handleBody,
                filter: false,
                filterPlaceholder: "Search by subjectId",
                filterFunction: codeFilter
            };

            let columnProps = _.extend(defaultColumnProps, customColumnProps);

            return <Column {...columnProps} />;
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

    const getHeader = (globalFilterKey) => {
        return (
            <div className='table-headers-components' >
                {customHeader ? <div className="custom-header-comp" dangerouslySetInnerHTML={{ __html: customHeader }} /> : <div className="custom-header-comp"></div>}
                <div id='prime-collapse'>
                    <Button className='collapse-button' onClick={toggleApplications} label={toggleLabel} />
                    <div className="text-right">
                        <div className="p-input-icon-left">
                            <i className="pi pi-search"></i>
                            <InputText
                                type="search"
                                onInput={(e) => treeTableFuncMap[`${globalFilterKey}`](e.target.value)}
                                placeholder={globalSearchPlaceHolder}
                                size="50"
                            />
                        </div>
                    </div>
                </div>
                <div className="cog-container">
                    <i className="pi pi-cog" onClick={() => setShowModal(!showModal)}></i>
                    <FreezePopUp
                        show={showModal}
                        setShowModal={setShowModal}
                        freezedColumns={freezedColumns}
                        colOptions={colOptions}
                        colFreezeOptions={colFreezeOptions}
                        onColumnFreeze={onColumnFreeze}
                        showHideMetricProps={showHideMetricProps}
                    />
                </div>
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
        const deepTableData = JSON.parse(JSON.stringify(tableData));
        let formattedHtmlData = formatHTMLData(deepTableData);
        setNodes(formattedHtmlData);
        const deepColumnData = JSON.parse(JSON.stringify(columnsList));
        let formatColumnData = formatColumnHTMLData(deepColumnData);
        setCols(formatColumnData);

        // Set options for hide show columns
        let colOptions = [];
        for (let col of formatColumnData) {
            colOptions.push({ label: col.header, value: col, disabled: col.disabled });
        }
        setColOptions(colOptions);

        // Set options for freeze columns
        let colFreezeOptions = [];
        colFreezeOptions.push({ label: "None", value: "" })
        for (let col of formatColumnData) {
            colFreezeOptions.push({ label: col.header, value: col });
        }
        setColFreezeOptions(colFreezeOptions);

        let frozenColumn = deepColumnData.filter(obj => obj.frozen === true);
        setFreezedColumn(frozenColumn[0]);
        
        if (selectedValues.length < tableData.length) {
            setSelectedValues([])
        }
    }

    const sortData = (unsortedData) => {
        return unsortedData.sort((a, b) => (a.data.name > b.data.name) ? 1 : ((b.data.name > a.data.name) ? -1 : 0));
    }

    useEffect(() => {
        chartLoaded();
        let store = RactScorecardStore.getStore();
        let highchartsData = store.get("highchartThis");
        setHighchartThis(highchartsData);
    }, [tableData]); // eslint-disable-line react-hooks/exhaustiv e-deps


    useEffect(() => {
        // Monitor store
        RactScorecardStore.addChangeListener(_onChange);

        // create deep copy of user custom table data
        if (lazyData && lazyData.length && (JSON.stringify(nodes) !== JSON.stringify(lazyData))) {
            const deepTableData = JSON.parse(JSON.stringify(lazyData));
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

    const onSelectionChange = (event) => {

        // let unique1;
        // if (event.value.length > selectedValues.length)
        //     unique1 = event.value.filter((o) => selectedValues.map(data => data.data.id).indexOf(o.data.id) === -1);
        // else
        //     unique1 = selectedValues.filter((o) => event.value.map(data => data.data.id).indexOf(o.data.id) === -1);
        let reportData = props.exposureStore?.getExposureStore()?.toJS()?.files[props?.fileId]?.reportData
        Utils.saveAndPublishEvent(reportData, widgetFilterInfo.currentWidget, event.value.map(data => data.data.id), widgetFilterInfo.tableName, widgetFilterInfo.columnName)
        setSelectedValues(event.value)
    }

    // scrollable: true This property breaks in 6.3.2 
    let defaultProps = {
        value: nodes,
        paginator: true,
        first: first,
        rows: rows,
        onPage: onCustomPage,
        paginatorTemplate: template,
        globalFilter: globalFilter,
        header: showSearchHeader ? searchHeader : false,
        resizableColumns: true,
        reorderableColumns: true,
        rowClassName: customeRowClassName,
        expandedKeys: expandedKeys,
        sortMode: "multiple",
        filterMatchMode: "contains",
        columnResizeMode: "expand",
        onToggle: e => setExpandedKeys(e.value),
        cellSelection: true,
        selectionMode: "single",
        selection: selected,
        //onSelectionChange: e => drillElement(e),
        onExpand: customUserFunction,
        pageLinkSize: pageLinkSize
    }

    let tableProps = _.extend(defaultProps, customTableProps);

    // Bug in 6.3.2 release hence scrollable is disabled and <Column /> is added 

    return (
        <div>
            <div className="table-container">
                <DataTable {...tableProps}
                    selection={selectedValues} onSelectionChange={e => onSelectionChange(e)}
                >
                    <Column selectionMode="multiple" style={{ width: '3em' }} />
                    {/* <Column className='prime-hidden-column' /> */}
                    {_columns()}
                </DataTable>
            </div>
        </div>
    );
}

PrimeDataTable.defaultProps = {
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
    customUserFunction: function () { }
}

export default PrimeDataTable;
