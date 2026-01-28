/**
 * FilterPanel Organism
 * 
 * Generic filter composition with search, selects, and action buttons.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { renderSearchBar, renderSearchBarWithFilter } from '../../molecules/index.js';
import { renderSelectInput, renderButton, Icon } from '../../atoms/index.js';

/**
 * Render filter panel HTML
 */
export function renderFilterPanel({
    search = null,           // { name, value, placeholder, onInput }
    filters = [],            // [{ type: 'select', name, value, options, onChange }]
    actions = [],            // [{ label, onClick, variant, icon }]
    layout = 'horizontal',   // 'horizontal' | 'vertical'
    className = ''
}) {
    const searchHtml = search ? renderSearchBar({
        name: search.name || 'search',
        value: search.value || '',
        placeholder: search.placeholder || 'Search...',
        onInput: search.onInput || '',
        width: 'w-64'
    }) : '';

    const filtersHtml = filters.map(filter => {
        if (filter.type === 'select') {
            return `
        <select 
          name="${filter.name}"
          class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          ${filter.onChange ? `onchange="${filter.onChange}"` : ''}
        >
          ${filter.options.map(opt => `
            <option value="${opt.value}" ${opt.value === filter.value ? 'selected' : ''}>${opt.label}</option>
          `).join('')}
        </select>
      `;
        }
        return '';
    }).join('');

    const actionsHtml = actions.map(action => renderButton({
        label: action.label,
        variant: action.variant || 'primary',
        icon: action.icon,
        onClick: action.onClick || '',
        className: 'whitespace-nowrap'
    })).join('');

    const layoutClass = layout === 'vertical'
        ? 'flex flex-col gap-4'
        : 'flex flex-col md:flex-row md:items-center justify-between gap-4';

    return `
    <div class="${layoutClass} mb-6 ${className}">
      <div class="flex items-center gap-3 flex-wrap">
        ${searchHtml}
        ${filtersHtml}
      </div>
      ${actionsHtml ? `<div class="flex items-center gap-2">${actionsHtml}</div>` : ''}
    </div>
  `.trim();
}

/**
 * FilterPanel Component Class
 */
export class FilterPanel extends BaseComponent {
    init() {
        this.state = {
            search: this.props.search?.value || '',
            filters: {}
        };

        // Initialize filter values
        this.props.filters?.forEach(f => {
            this.state.filters[f.name] = f.value || '';
        });

        this.render();
    }

    render() {
        const id = this.el.id || `filterpanel-${Date.now()}`;
        this.el.id = id;

        // Create handlers
        window[`${id}_search`] = this.handleSearch.bind(this);
        window[`${id}_filter`] = this.handleFilter.bind(this);

        this.el.innerHTML = renderFilterPanel({
            ...this.props,
            search: this.props.search ? {
                ...this.props.search,
                value: this.state.search,
                onInput: `${id}_search(this.value)`
            } : null,
            filters: this.props.filters?.map(f => ({
                ...f,
                value: this.state.filters[f.name],
                onChange: `${id}_filter('${f.name}', this.value)`
            }))
        });
    }

    handleSearch(value) {
        this.state.search = value;
        this.emitChange();
    }

    handleFilter(name, value) {
        this.state.filters[name] = value;
        this.emitChange();
    }

    emitChange() {
        this.emit('change', {
            search: this.state.search,
            filters: this.state.filters
        });
    }

    getValues() {
        return {
            search: this.state.search,
            filters: this.state.filters
        };
    }

    reset() {
        this.state.search = '';
        this.state.filters = {};
        this.props.filters?.forEach(f => {
            this.state.filters[f.name] = '';
        });
        this.render();
        this.emitChange();
    }
}

// Register with SIS
SIS.register('FilterPanel', FilterPanel);

export default FilterPanel;
