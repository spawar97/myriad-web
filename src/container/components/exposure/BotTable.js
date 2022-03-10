import React from 'react'
import styled from 'styled-components'
import { useTable, usePagination, useSortBy } from 'react-table'
import PropTypes from 'prop-types';
import cx from 'classnames';

const pageRows = (props) => {
  if (props.dataArray.length < 5) {
    return [props.dataArray.length];
  } else if (props.dataArray.length >= 5 && props.dataArray.length <= 10) {
    return [5, 10];
  } else {
    return [5, 10, 15];
  }
};

const generateSortingIndicator = column => {
  return column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : "";
};

const lastDataValue = (props, pageIndex, pageSize) => {
  let lastDisplayVal = (pageIndex + 1) * pageSize;
  if (lastDisplayVal > props.dataArray.length) {
    return props.dataArray.length;
  }
  return (pageIndex + 1) * pageSize;
};

const firstDataValue = (props, pageIndex, pageSize) => {
  return (pageIndex * pageSize) + 1;
};

const Styles = styled.div`
  table {
  border-left: none;
  border-right: none;
  width:100%;
  border-collapse: collapse;
  tr {
  background: #f5f5f5;
  border-bottom: 1px solid #BDBDBD;
  text-align: left;
  height: 3.6rem;
  }
  thead {
  cursor: pointer;
  background: #f5f5f5;
  border-bottom: 1px solid #BDBDBD;
  text-align: left;
  font-weight: 600;
  }   
  td {
  border-bottom: 1px solid #BDBDBD;
  background-color: white;
  border-right: 0px;
  height: 3.6rem;
  padding-right: 5px;
  }  
  th {
  min-width: 200px;
  border-bottom: 2px solid #BDBDBD;
  text-align: left;
  padding-right: 8px;
  }
  }
  select {
  float: right;
  width: 50px;
  color: #1E96DE;
  border-radius: 0.2rem;
  padding-left: 5px;
  height: 25px;
  line-height: 25px;
  }
  button {
  margin-right: 1%;
  margin-left: 1%;
  color: #1E96DE;
  cursor: pointer;
  display: inline-flex;
  background: transparent;
  border: none;
  }
  .bot-table-pagination-center {
  margin-left: 20%;
  }
  .pagination {
  margin-top: 10px;
  margin-bottom: 0px;
  }
 .first-data-value {
  height: 25px;
  width: 30px;
  border: 1px solid #BDBDBD;
  text-align: center;
  margin-right: 6px;
  border-radius: 0.2rem;
  margin-top: -4px;
  line-height: 25px;
  }
  button:disabled {
  color:#9bceee;
  }
  .icon-accordion-down {
  right: 2.75rem;
  position: absolute;
  margin-top: 0.35rem;
  z-index: 5;
  color: #1E96DE;
  pointer-events: none;
  line-height: 18px;
  }
  .table-title {
  font-size: 18px;
  font-weight: 600;
  padding-bottom: 10px;
  }
  .table-scroll {
    overflow-x:scroll;
  }
`;

function Table({ columns, data, props }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    // below new props related to 'usePagination' hook
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable({
    columns,
    data,
    initialState: { pageIndex: 0, pageSize: 5 }
  }, useSortBy, usePagination)

  // Render the UI for table
  return (
    <div id="table">
      <div className="table-title">{"Related Data Listing"}</div>
      <div className="table-scroll">
        <table id="bot-table" {...getTableProps()}>
          <thead id="table-header">
          {headerGroups.map((headerGroup, index) => (
            <tr key={index} {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column, index) => (
                <th key={index} id="bot-header-data" {...column.getHeaderProps(column.getSortByToggleProps())}>{column.render('Header')}{generateSortingIndicator(column)}</th>
              ))}
            </tr>
          ))}
          </thead>
          <tbody id="bot-table-body" {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr key={i} id="bot-table-row" {...row.getRowProps()}>
                {row.cells.map((cell,index) => {
                  return <td key={index} id="bot-table-data" {...cell.getCellProps()}>{cell.render('Cell')}</td>
                })}
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span id="page-info">
          {'Displaying '}
          <span id="start"> {firstDataValue(props, pageIndex, pageSize)}</span> - <span id="end">{lastDataValue(props, pageIndex, pageSize)} </span> of <span id="total-data"> {props.dataArray.length}</span>
        </span>
        <span className={cx('pagination-center', 'bot-table-pagination-center')}>
          <button id="first" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {'First'}
          </button>
          <button id="previous" onClick={() => previousPage()} disabled={!canPreviousPage}>
            {'Previous'}
          </button>
        </span>
        <button id="pagination-info">
          <div className="first-data-value">
            {pageIndex + 1}</div> of {pageOptions.length}
        </button>
        <span>
          <button id="next" onClick={() => nextPage()} disabled={!canNextPage}>
            {'Next'}
          </button>
          <button id="last" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {'Last'}
          </button>
        </span>
        <span>
          <span className="icon-accordion-down"></span>
          <select id="paginationRows"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value))
            }}>
            {pageRows(props).map(pageSize => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </span>
      </div>
    </div>
  );
}

function BotTable(props) {
  const columns = [];
  let column = [];
  let botData = props.dataArray;
  if (Array.isArray(botData)) {
    column = Object.keys(botData[0]);
  } else {
    column = Object.keys(botData);
  }

  for (let i = 0; i < column.length; i++) {
    let view = {};
    view.Header = column[i].toUpperCase().replace("_", " ");
    view.accessor = column[i];
    view.width = 180;
    view.Cell = row => <div><span title={row.value}> {row.value}</span></div>
    columns.push(view);
  }
  return (
    <Styles>
      <Table columns={columns} data={botData} props={props} />
    </Styles>
  )
}

BotTable.propTypes = {
  dataArray: PropTypes.array,
};

export default BotTable;
