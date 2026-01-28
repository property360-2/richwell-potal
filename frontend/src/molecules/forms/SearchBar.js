/**
 * SearchBar Molecule
 * 
 * Search input with icon, optional filters, and debounced input.
 * 
 * Usage:
 *   import { renderSearchBar, SearchBar } from './molecules/forms/SearchBar.js';
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

/**
 * Render search bar HTML
 * @param {Object} options - Search bar options
 * @returns {string} HTML string
 */
export function renderSearchBar({
    name = 'search',
    id = '',
    value = '',
    placeholder = 'Search...',
    width = 'w-64',
    showClear = true,
    onInput = '',
    onChange = '',
    onClear = '',
    className = ''
}) {
    const inputId = id || name;
    const hasClear = showClear && value;

    return `
    <div class="relative ${width} ${className}">
      <input
        type="text"
        name="${name}"
        id="${inputId}"
        value="${escapeAttr(value)}"
        placeholder="${escapeAttr(placeholder)}"
        class="w-full pl-9 pr-${hasClear ? '8' : '4'} py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        ${onInput ? `oninput="${onInput}"` : ''}
        ${onChange ? `onchange="${onChange}"` : ''}
      >
      <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      ${hasClear ? `
        <button 
          type="button" 
          class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          ${onClear ? `onclick="${onClear}"` : ''}
          aria-label="Clear search"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      ` : ''}
    </div>
  `.trim();
}

/**
 * Render search bar with filter dropdown
 * @param {Object} options - Options
 * @returns {string} HTML string
 */
export function renderSearchBarWithFilter({
    searchProps = {},
    filterOptions = [],  // [{ value, label }]
    filterValue = 'all',
    filterName = 'filter',
    onFilterChange = '',
    className = ''
}) {
    const filterHtml = filterOptions.length > 0 ? `
    <select 
      name="${filterName}"
      class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      ${onFilterChange ? `onchange="${onFilterChange}"` : ''}
    >
      ${filterOptions.map(opt => `
        <option value="${opt.value}" ${opt.value === filterValue ? 'selected' : ''}>${opt.label}</option>
      `).join('')}
    </select>
  ` : '';

    return `
    <div class="flex items-center gap-3 ${className}">
      ${renderSearchBar(searchProps)}
      ${filterHtml}
    </div>
  `.trim();
}

// Helper
function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * SearchBar Component Class with debounce
 */
export class SearchBar extends BaseComponent {
    init() {
        this.state = {
            value: this.props.value || ''
        };
        this.debounceTimer = null;
        this.debounceMs = this.props.debounce || 300;
        this.render();
    }

    render() {
        this.el.innerHTML = renderSearchBar({
            ...this.props,
            value: this.state.value
        });
        this.attachListeners();
    }

    attachListeners() {
        const input = this.$('input');
        if (input) {
            this.on(input, 'input', this.handleInput);
            this.on(input, 'keydown', this.handleKeydown);
        }

        const clearBtn = this.$('button');
        if (clearBtn) {
            this.on(clearBtn, 'click', this.handleClear);
        }
    }

    handleInput(e) {
        this.state.value = e.target.value;

        // Update clear button visibility
        const clearBtn = this.$('button');
        if (clearBtn) {
            clearBtn.style.display = this.state.value ? 'block' : 'none';
        }

        // Debounced emit
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.emit('search', { value: this.state.value });
        }, this.debounceMs);
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.handleClear();
        } else if (e.key === 'Enter') {
            clearTimeout(this.debounceTimer);
            this.emit('search', { value: this.state.value });
        }
    }

    handleClear() {
        this.state.value = '';
        const input = this.$('input');
        if (input) {
            input.value = '';
            input.focus();
        }
        this.emit('search', { value: '' });
        this.emit('clear', {});
        this.render();
    }

    getValue() {
        return this.state.value;
    }

    setValue(value) {
        this.state.value = value;
        this.render();
    }

    focus() {
        this.$('input')?.focus();
    }

    onDestroy() {
        clearTimeout(this.debounceTimer);
    }
}

// Register with SIS
SIS.register('SearchBar', SearchBar);

export default SearchBar;
