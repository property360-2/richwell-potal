/**
 * Spinner/Loader Atom
 * 
 * Loading indicators in various sizes and styles.
 * 
 * Usage:
 *   import { renderSpinner, LoadingOverlay, InlineSpinner } from './atoms/loaders/Spinner.js';
 */

import { BaseComponent, SIS } from '../../core/index.js';

// Size configurations
const SIZES = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
};

// Color configurations
const COLORS = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    success: 'text-green-600',
    danger: 'text-red-600'
};

/**
 * Render spinner SVG
 * @param {Object} options - Spinner options
 * @returns {string} HTML string
 */
export function renderSpinner({
    size = 'md',
    color = 'primary',
    className = ''
}) {
    const sizeClass = SIZES[size] || SIZES.md;
    const colorClass = COLORS[color] || COLORS.primary;

    return `
    <svg class="animate-spin ${sizeClass} ${colorClass} ${className}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `.trim();
}

/**
 * Render inline spinner with optional text
 * @param {Object} options - Options
 * @returns {string} HTML string
 */
export function InlineSpinner({
    text = 'Loading...',
    size = 'sm',
    color = 'primary',
    className = ''
}) {
    return `
    <span class="inline-flex items-center gap-2 ${className}">
      ${renderSpinner({ size, color })}
      ${text ? `<span class="text-sm text-gray-600">${text}</span>` : ''}
    </span>
  `.trim();
}

/**
 * Render full-page or container loading overlay
 * @param {string} message - Loading message
 * @param {Object} options - Options
 * @returns {string} HTML string
 */
export function LoadingOverlay(message = 'Loading...', {
    size = 'xl',
    fullPage = false,
    className = ''
} = {}) {
    const containerClass = fullPage
        ? 'fixed inset-0 z-50 bg-white/90 backdrop-blur-sm'
        : 'w-full min-h-[400px]';

    return `
    <div class="${containerClass} flex flex-col items-center justify-center ${className}">
      ${renderSpinner({ size, color: 'primary' })}
      ${message ? `<p class="mt-4 text-gray-600 font-medium">${message}</p>` : ''}
    </div>
  `.trim();
}

/**
 * Render skeleton loading placeholder
 * @param {Object} options - Skeleton options
 * @returns {string} HTML string
 */
export function renderSkeleton({
    width = 'full',
    height = '4',
    rounded = 'md',
    className = ''
}) {
    const widthClass = width === 'full' ? 'w-full' : `w-${width}`;
    const heightClass = `h-${height}`;
    const roundedClass = `rounded-${rounded}`;

    return `
    <div class="animate-pulse bg-gray-200 ${widthClass} ${heightClass} ${roundedClass} ${className}"></div>
  `.trim();
}

/**
 * Render table skeleton
 * @param {number} rows - Number of rows
 * @param {number} cols - Number of columns
 * @returns {string} HTML string
 */
export function TableSkeleton(rows = 5, cols = 4) {
    const headerCells = Array(cols).fill(0).map(() => `
    <th class="px-6 py-3">
      <div class="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
    </th>
  `).join('');

    const bodyRows = Array(rows).fill(0).map(() => `
    <tr>
      ${Array(cols).fill(0).map(() => `
        <td class="px-6 py-4">
          <div class="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
        </td>
      `).join('')}
    </tr>
  `).join('');

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>${headerCells}</tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `.trim();
}

/**
 * Render card skeleton
 * @returns {string} HTML string
 */
export function CardSkeleton() {
    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 bg-gray-200 rounded-xl"></div>
        <div class="flex-1">
          <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div class="space-y-2">
        <div class="h-3 bg-gray-200 rounded"></div>
        <div class="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  `.trim();
}

/**
 * Spinner Component Class
 */
export class Spinner extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderSpinner(this.props);
    }
}

// Register with SIS
SIS.register('Spinner', Spinner);

export default { renderSpinner, InlineSpinner, LoadingOverlay, renderSkeleton, TableSkeleton, CardSkeleton };
