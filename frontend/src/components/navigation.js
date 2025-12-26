// Navigation component factory functions
// Creates desktop and mobile navigation HTML

import { getNavigationForRole } from '../config/navigation.js';

/**
 * Create desktop navigation links
 * @param {Object} options
 * @param {string} options.role - User role (STUDENT, REGISTRAR, etc.)
 * @param {string} options.activePage - Current page identifier
 * @returns {string} HTML string for desktop navigation
 */
export function createDesktopNavigation({ role, activePage }) {
  const navItems = getNavigationForRole(role);

  return `
    <nav class="hidden md:flex items-center gap-2">
      ${navItems.map(item => {
        const isActive = item.page === activePage;
        return `
          <a href="${item.href}"
             class="${isActive
               ? 'px-3 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium'
               : 'px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors'}">
            ${item.label}
          </a>
        `;
      }).join('')}
    </nav>
  `;
}

/**
 * Create mobile navigation links (for drawer)
 * @param {Object} options
 * @param {string} options.role - User role
 * @param {string} options.activePage - Current page identifier
 * @returns {string} HTML string for mobile navigation
 */
export function createMobileNavigation({ role, activePage }) {
  const navItems = getNavigationForRole(role);

  return `
    <nav class="flex flex-col gap-2 p-4">
      ${navItems.map(item => {
        const isActive = item.page === activePage;
        return `
          <a href="${item.href}"
             class="${isActive
               ? 'px-4 py-3 text-blue-600 bg-blue-50 rounded-xl font-semibold flex items-center gap-3'
               : 'px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-3'}">
            <span>${item.label}</span>
            ${isActive ? `
              <svg class="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
            ` : ''}
          </a>
        `;
      }).join('')}
    </nav>
  `;
}
