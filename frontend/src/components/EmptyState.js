/**
 * EmptyState Component
 * 
 * Reusable empty state pattern for consistent UX across all pages.
 * 
 * @param {Object} options Configuration object
 * @param {string} options.icon SVG icon HTML
 * @param {string} options.title Main heading
 * @param {string} options.description Supporting text
 * @param {Object} options.action Optional CTA button { label, onClick }
 * @returns {string} HTML for empty state
 * 
 * Usage:
 *   import { EmptyState } from '../components/EmptyState.js';
 * 
 *   EmptyState({
 *     icon: '<svg>...</svg>',
 *     title: 'No programs found',
 *     description: 'Get started by creating your first program',
 *     action: {
 *       label: 'Add Program',
 *       onClick: 'openAddProgramModal()'
 *     }
 *   })
 */

export function EmptyState({ icon, title, description, action }) {
    return `
    <div class="card text-center py-12">
      <div class="w-16 h-16 mx-auto text-gray-400 mb-4">
        ${icon}
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto mb-6">${description}</p>
      ${action ? `
        <button 
          onclick="${action.onClick}" 
          class="btn btn-primary inline-flex items-center gap-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          ${action.label}
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Common empty state icons
 */
export const EmptyStateIcons = {
    noData: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
  `,
    noResults: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
    </svg>
  `,
    noPrograms: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
    </svg>
  `,
    error: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
    </svg>
  `,
    noCurriculum: `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
    </svg>
  `
};
