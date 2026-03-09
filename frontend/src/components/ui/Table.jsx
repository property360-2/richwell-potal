import React from 'react';
import './Table.css';
import LoadingSpinner from './LoadingSpinner';

const Table = ({ columns, data, onRowClick, loading, emptyMessage = 'No data available', rowClassName }) => {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                style={{ width: col.width, textAlign: col.align || 'left' }}
                className={col.className || ''}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="table-loading">
                <LoadingSpinner size="md" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => {
              const customClass = typeof rowClassName === 'function' ? rowClassName(row) : rowClassName || '';
              return (
                <tr 
                  key={rowIndex} 
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${onRowClick ? 'table-row-clickable' : ''} ${customClass}`}
                >
                  {columns.map((col, colIndex) => (
                    <td 
                      key={colIndex} 
                      style={{ textAlign: col.align || 'left' }}
                      className={col.className || ''}
                    >
                      {col.render ? col.render(row) : (row[col.accessor] ?? col.emptyValue ?? '-')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
