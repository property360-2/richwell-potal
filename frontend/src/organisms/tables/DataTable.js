/**
 * DataTable Organism
 * 
 * Generic sortable, filterable data table.
 * Consolidates table patterns used across all admin/registrar pages.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { renderBadge, renderStatusBadge, Icon, LoadingOverlay, TableSkeleton } from '../../atoms/index.js';
import { renderSearchBar } from '../../molecules/index.js';

/**
 * Render table HTML
 */
export function renderDataTable({
    columns = [],       // [{ key, label, sortable?, width?, render?, align? }]
    data = [],          // Array of row objects
    sortKey = null,
    sortDirection = 'asc',
    onSort = '',        // Function name for sort handler
    onRowClick = '',    // Function name for row click
    loading = false,
    emptyMessage = 'No data found',
    emptyIcon = 'search',
    className = '',
    rowClassName = '',
    headerClassName = ''
}) {
    if (loading) {
        return TableSkeleton(5, columns.length);
    }

    const renderSortIcon = (col) => {
        if (!col.sortable) return '';
        const isActive = sortKey === col.key;
        const icon = isActive
            ? (sortDirection === 'asc' ? '▲' : '▼')
            : '<span class="text-gray-300">↕</span>';
        return `<span class="ml-1">${icon}</span>`;
    };

    const headerCells = columns.map(col => {
        const sortable = col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : '';
        const sortClick = col.sortable && onSort ? `onclick="${onSort}('${col.key}')"` : '';
        const align = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
        const width = col.width ? `style="width: ${col.width}"` : '';

        return `
      <th class="px-6 py-3 ${align} text-xs font-bold text-gray-500 uppercase tracking-wider ${sortable} ${headerClassName}" ${sortClick} ${width}>
        <div class="flex items-center ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}">
          ${col.label}
          ${renderSortIcon(col)}
        </div>
      </th>
    `;
    }).join('');

    if (data.length === 0) {
        return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>${headerCells}</tr></thead>
        </table>
        <div class="px-6 py-12 text-center">
          ${Icon(emptyIcon, { size: 'xl', className: 'mx-auto text-gray-400 mb-3' })}
          <p class="text-gray-500 font-medium">${emptyMessage}</p>
        </div>
      </div>
    `;
    }

    const bodyRows = data.map((row, rowIndex) => {
        const rowClick = onRowClick ? `onclick="${onRowClick}('${row.id || rowIndex}')"` : '';
        const clickClass = onRowClick ? 'cursor-pointer' : '';

        const cells = columns.map(col => {
            const align = col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left';
            let cellContent = row[col.key];

            // Custom render function
            if (col.render) {
                cellContent = col.render(row[col.key], row, rowIndex);
            } else if (cellContent === null || cellContent === undefined) {
                cellContent = '-';
            }

            return `<td class="px-6 py-4 whitespace-nowrap text-sm ${align}">${cellContent}</td>`;
        }).join('');

        return `<tr class="hover:bg-gray-50 transition-colors ${clickClass} ${rowClassName}" ${rowClick}>${cells}</tr>`;
    }).join('');

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>${headerCells}</tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${bodyRows}
          </tbody>
        </table>
      </div>
    </div>
  `.trim();
}

/**
 * Common cell renderers
 */
export const CellRenderers = {
    badge: (value) => renderBadge({ text: value, size: 'sm' }),
    status: (value) => renderStatusBadge(value, { size: 'sm' }),
    date: (value) => value ? new Date(value).toLocaleDateString() : '-',
    datetime: (value) => value ? new Date(value).toLocaleString() : '-',
    currency: (value) => value ? `₱${Number(value).toLocaleString()}` : '-',
    boolean: (value) => value ? '✓' : '✗',
    code: (value) => `<code class="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">${value}</code>`,
    truncate: (maxLength = 50) => (value) => {
        if (!value) return '-';
        return value.length > maxLength ? value.slice(0, maxLength) + '...' : value;
    },
    actions: (buttons) => (value, row) => {
        return buttons.map(btn => {
            const onClick = btn.onClick ? btn.onClick.replace('{id}', row.id) : '';
            return `<button class="text-${btn.color || 'blue'}-600 hover:text-${btn.color || 'blue'}-800 p-1" onclick="${onClick}" title="${btn.label}">${Icon(btn.icon, { size: 'sm' })}</button>`;
        }).join('');
    }
};

/**
 * DataTable Component Class
 */
export class DataTable extends BaseComponent {
    init() {
        this.state = {
            data: this.props.data || [],
            sortKey: this.props.sortKey || null,
            sortDirection: this.props.sortDirection || 'asc',
            loading: this.props.loading || false,
            searchQuery: ''
        };

        // Expose sort handler globally for onclick
        const id = this.el.id || `datatable-${Date.now()}`;
        this.el.id = id;
        window[`${id}_sort`] = this.handleSort.bind(this);
        window[`${id}_rowClick`] = this.handleRowClick.bind(this);

        this.render();
    }

    render() {
        const sortedData = this.getSortedData();
        const id = this.el.id;

        this.el.innerHTML = renderDataTable({
            ...this.props,
            data: sortedData,
            sortKey: this.state.sortKey,
            sortDirection: this.state.sortDirection,
            loading: this.state.loading,
            onSort: `${id}_sort`,
            onRowClick: this.props.onRowClick ? `${id}_rowClick` : ''
        });
    }

    getSortedData() {
        let data = [...this.state.data];

        // Search filter
        if (this.state.searchQuery && this.props.searchKeys) {
            const query = this.state.searchQuery.toLowerCase();
            data = data.filter(row => {
                return this.props.searchKeys.some(key => {
                    const val = row[key];
                    return val && String(val).toLowerCase().includes(query);
                });
            });
        }

        // Sort
        if (this.state.sortKey) {
            const col = this.props.columns.find(c => c.key === this.state.sortKey);
            data.sort((a, b) => {
                let aVal = a[this.state.sortKey];
                let bVal = b[this.state.sortKey];

                // Handle null/undefined
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                // Numeric sort
                if (typeof aVal === 'number') {
                    return this.state.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }

                // String sort
                const result = String(aVal).localeCompare(String(bVal));
                return this.state.sortDirection === 'asc' ? result : -result;
            });
        }

        return data;
    }

    handleSort(key) {
        if (this.state.sortKey === key) {
            this.setState({ sortDirection: this.state.sortDirection === 'asc' ? 'desc' : 'asc' });
        } else {
            this.setState({ sortKey: key, sortDirection: 'asc' });
        }
        this.emit('sort', { key: this.state.sortKey, direction: this.state.sortDirection });
    }

    handleRowClick(id) {
        const row = this.state.data.find(r => String(r.id) === String(id));
        this.emit('rowClick', { id, row });
        if (this.props.onRowClick && typeof this.props.onRowClick === 'function') {
            this.props.onRowClick(id, row);
        }
    }

    setData(data) {
        this.setState({ data });
    }

    setLoading(loading) {
        this.setState({ loading });
    }

    search(query) {
        this.setState({ searchQuery: query });
    }

    refresh() {
        this.render();
    }
}

// Register with SIS
SIS.register('DataTable', DataTable);

export default DataTable;
