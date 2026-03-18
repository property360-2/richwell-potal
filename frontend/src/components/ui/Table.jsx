import React from 'react';
import './Table.css';
import LoadingSpinner from './LoadingSpinner';
import { ChevronUp, ChevronDown } from 'lucide-react';

const Table = ({ 
  columns, 
  data, 
  onRowClick, 
  loading, 
  emptyMessage = 'No data available', 
  rowClassName,
  sortConfig = { key: null, direction: 'asc' },
  onSort
}) => {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, idx) => {
              const isSorted = sortConfig.key === col.accessor;
              return (
                <th 
                  key={idx} 
                  style={{ width: col.width, textAlign: col.align || 'left', cursor: col.sortable ? 'pointer' : 'default' }}
                  className={`${col.className || ''} ${col.sortable ? 'table-header-sortable' : ''}`}
                  onClick={() => col.sortable && onSort && onSort(col.accessor)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <div className="flex flex-col -space-y-1">
                        <ChevronUp 
                          size={12} 
                          className={isSorted && sortConfig.direction === 'asc' ? 'text-primary' : 'text-slate-300'} 
                        />
                        <ChevronDown 
                          size={12} 
                          className={isSorted && sortConfig.direction === 'desc' ? 'text-primary' : 'text-slate-300'} 
                        />
                      </div>
                    )}
                  </div>
                </th>
              );
            })}
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
