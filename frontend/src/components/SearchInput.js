/**
 * SearchInput Component
 * 
 * Debounced search input for filtering tables and lists.
 * 
 * @param {Object} options Configuration object
 * @param {string} options.placeholder Placeholder text
 * @param {string} options.onSearch Function name to call on search (receives query string)
 * @param {number} options.debounceMs Debounce delay in ms (default: 300)
 * @returns {string} HTML for search input
 * 
 * Usage:
 *   import { SearchInput } from '../components/SearchInput.js';
 * 
 *   SearchInput({
 *     placeholder: 'Search students...',
 *     onSearch: 'filterStudents'
 *   })
 */

export function SearchInput({ placeholder = 'Search...', onSearch, debounceMs = 300 }) {
    const inputId = `search-${Math.random().toString(36).substr(2, 9)}`;

    return `
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <input
        type="search"
        id="${inputId}"
        class="form-input pl-10 pr-4"
        placeholder="${placeholder}"
        oninput="debounceSearch(this.value, '${onSearch}', ${debounceMs})"
        autocomplete="off"
      />
    </div>
  `;
}

/**
 * Initialize search functionality (call once per page)
 * Adds debounce helper to window
 */
export function initSearch() {
    if (window.debounceSearch) return; // Already initialized

    let debounceTimer;
    window.debounceSearch = function (query, callbackName, delay) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (typeof window[callbackName] === 'function') {
                window[callbackName](query);
            }
        }, delay);
    };
}
