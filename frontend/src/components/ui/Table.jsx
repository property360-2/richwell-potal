import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from './EmptyState';
import Spinner from './Spinner';

const Table = ({ 
    columns = [],
    data = [],
    loading = false,
    onRowClick,
    sortable = true,
    pagination = false,
    pageSize = 10,
    emptyMessage = 'No data available',
    className = ''
}) => {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    // Sorting logic
    const sortedData = React.useMemo(() => {
        if (!sortConfig.key) return data;
        
        const sorted = [...data].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }, [data, sortConfig]);

    // Pagination logic
    const paginatedData = React.useMemo(() => {
        if (!pagination) return sortedData;
        
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return sortedData.slice(start, end);
    }, [sortedData, currentPage, pageSize, pagination]);

    const totalPages = Math.ceil(data.length / pageSize);

    const handleSort = (key) => {
        if (!sortable) return;
        
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Spinner size="lg" />
            </div>
        );
    }

    if (data.length === 0) {
        return <EmptyState message={emptyMessage} />;
    }

    return (
        <div className="w-full bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Scrollable Container with Indicators */}
            <div className="relative flex-1 group">
                {/* Left Fade */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent opacity-0 transition-opacity pointer-events-none z-10 sm:hidden" data-scroll-left></div>
                
                {/* Right Fade */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent opacity-0 transition-opacity pointer-events-none z-10 sm:hidden" data-scroll-right></div>

                <div 
                    className="overflow-x-auto w-full scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200/50 hover:scrollbar-thumb-gray-300 transition-colors"
                    onScroll={(e) => {
                        const target = e.target;
                        const left = target.parentElement.querySelector('[data-scroll-left]');
                        const right = target.parentElement.querySelector('[data-scroll-right]');
                        
                        if (left && right) {
                            left.style.opacity = target.scrollLeft > 10 ? '1' : '0';
                            right.style.opacity = (target.scrollWidth - target.clientWidth - target.scrollLeft) > 10 ? '1' : '0';
                        }
                    }}
                    ref={(el) => {
                        if (el) {
                            // Initial check
                            setTimeout(() => {
                                const right = el.parentElement?.querySelector('[data-scroll-right]');
                                if (right) {
                                  right.style.opacity = (el.scrollWidth > el.clientWidth) ? '1' : '0';
                                }
                            }, 100);
                        }
                    }}
                >
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                        <tr>
                            {columns.map((column, index) => (
                                <th 
                                    key={index}
                                    className={`px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest ${column.sortable !== false && sortable ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                                    onClick={() => column.sortable !== false && handleSort(column.key)}
                                    aria-label={column.sortable !== false && sortable ? `Sort by ${column.label}` : undefined}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable !== false && sortable && sortConfig.key === column.key && (
                                            sortConfig.direction === 'asc' ? 
                                                <ChevronUp className="w-3 h-3" /> : 
                                                <ChevronDown className="w-3 h-3" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((row, rowIndex) => (
                            <tr 
                                key={rowIndex}
                                className={`hover:bg-gray-50/50 transition-all ${onRowClick ? 'cursor-pointer' : ''}`}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((column, colIndex) => (
                                    <td key={colIndex} className="px-8 py-5 text-sm font-bold text-gray-900">
                                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && totalPages > 1 && (
                <div className="px-8 py-5 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            </div>{/* Close relative wrapper */}
        </div>
    );
};

export default Table;
