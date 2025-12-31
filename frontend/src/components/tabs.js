/**
 * Reusable Tab Component
 *
 * Provides a clean tabbed interface for switching between different views
 * within a single page.
 *
 * Usage:
 *   import { createTabs } from './components/tabs.js';
 *
 *   const tabsHTML = createTabs({
 *     tabs: [
 *       { id: 'tab1', label: 'First Tab' },
 *       { id: 'tab2', label: 'Second Tab' }
 *     ],
 *     activeTab: 'tab1',
 *     onTabChange: 'switchTab'  // name of global function
 *   });
 */

/**
 * Create a tabbed navigation interface
 * @param {Object} options
 * @param {Array} options.tabs - Array of tab objects {id, label}
 * @param {string} options.activeTab - ID of currently active tab
 * @param {string} options.onTabChange - Name of global function to call on tab change
 * @returns {string} HTML string for tabs
 */
export function createTabs({ tabs, activeTab, onTabChange }) {
  return `
    <div class="border-b border-gray-200 mb-6">
      <nav class="flex gap-2 overflow-x-auto" aria-label="Tabs">
        ${tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return `
            <button
              onclick="${onTabChange}('${tab.id}')"
              class="px-6 py-3 font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 border-b-2 border-transparent'
              }"
              aria-current="${isActive ? 'page' : 'false'}"
            >
              ${tab.label}
            </button>
          `;
        }).join('')}
      </nav>
    </div>
  `;
}

/**
 * Initialize URL hash-based tab navigation
 * Allows tabs to be bookmarkable and shareable via URL hash
 * @param {string} defaultTab - Default tab to show if no hash present
 * @param {Function} onTabChange - Function to call when tab changes
 */
export function initHashNavigation(defaultTab, onTabChange) {
  // Handle initial hash
  const hash = window.location.hash.slice(1); // Remove #
  if (hash) {
    onTabChange(hash);
  } else {
    onTabChange(defaultTab);
  }

  // Handle hash changes (back/forward navigation)
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1);
    if (newHash) {
      onTabChange(newHash);
    }
  });
}

/**
 * Update URL hash when tab changes
 * @param {string} tabId - ID of the tab to navigate to
 */
export function updateHash(tabId) {
  window.location.hash = tabId;
}
