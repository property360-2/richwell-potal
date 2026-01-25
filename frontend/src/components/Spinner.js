/**
 * Loading Spinner Components
 *
 * Provides various loading indicators for different use cases.
 *
 * Usage:
 *   import { Spinner, LoadingOverlay, InlineLoader } from './components/Spinner.js';
 *
 *   // Simple spinner
 *   <div>${Spinner()}</div>
 *
 *   // Full page overlay
 *   <div>${LoadingOverlay('Loading data...')}</div>
 *
 *   // Inline loader for buttons
 *   <button>${InlineLoader()} Loading...</button>
 */

/**
 * Basic spinner component
 *
 * @param {Object} options - Configuration options
 * @param {string} options.size - Size: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} options.color - Color class (default: 'text-blue-600')
 * @returns {string} HTML string
 */
export function Spinner(options = {}) {
  const {
    size = 'md',
    color = 'text-blue-600'
  } = options;

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const sizeClass = sizes[size] || sizes.md;

  return `
    <svg
      class="${sizeClass} ${color} animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
      role="status"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  `;
}

/**
 * Full page loading overlay
 *
 * @param {string} message - Loading message to display
 * @param {Object} options - Configuration options
 * @param {boolean} options.transparent - Use transparent background (default: false)
 * @returns {string} HTML string
 */
export function LoadingOverlay(message = 'Loading...', options = {}) {
  const {
    transparent = false
  } = options;

  const bgClass = transparent
    ? 'bg-white/50'
    : 'bg-white/90';

  return `
    <div
      class="fixed inset-0 ${bgClass} backdrop-blur-sm z-50 flex items-center justify-center"
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="bg-white rounded-xl shadow-2xl p-8 max-w-sm text-center border border-gray-200">
        <div class="flex justify-center mb-4">
          ${Spinner({ size: 'lg', color: 'text-blue-600' })}
        </div>
        <p class="text-gray-700 font-medium text-lg">${message}</p>
        <p class="text-gray-500 text-sm mt-2">Please wait...</p>
      </div>
    </div>
  `;
}

/**
 * Inline loader for buttons and small spaces
 *
 * @param {Object} options - Configuration options
 * @param {string} options.size - Size: 'sm', 'md' (default: 'sm')
 * @param {string} options.color - Color class (default: 'text-white')
 * @returns {string} HTML string
 */
export function InlineLoader(options = {}) {
  const {
    size = 'sm',
    color = 'text-white'
  } = options;

  return Spinner({ size, color });
}

/**
 * Card skeleton loader
 *
 * @param {number} count - Number of skeleton cards to show (default: 3)
 * @returns {string} HTML string
 */
export function SkeletonCard(count = 3) {
  const cards = Array.from({ length: count }, (_, i) => `
    <div class="bg-white rounded-lg shadow p-6 animate-pulse" key="${i}">
      <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div class="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div class="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
      <div class="h-3 bg-gray-200 rounded w-5/6"></div>
    </div>
  `).join('');

  return cards;
}

/**
 * Table skeleton loader
 *
 * @param {number} rows - Number of skeleton rows (default: 5)
 * @param {number} cols - Number of columns (default: 4)
 * @returns {string} HTML string
 */
export function SkeletonTable(rows = 5, cols = 4) {
  const tableRows = Array.from({ length: rows }, (_, i) => `
    <tr key="${i}">
      ${Array.from({ length: cols }, (_, j) => `
        <td class="px-6 py-4" key="${j}">
          <div class="h-4 bg-gray-200 rounded animate-pulse"></div>
        </td>
      `).join('')}
    </tr>
  `).join('');

  return `
    <table class="min-w-full divide-y divide-gray-200">
      <tbody class="bg-white divide-y divide-gray-200">
        ${tableRows}
      </tbody>
    </table>
  `;
}

/**
 * Spinner manager for showing/hiding loading states
 */
export class LoadingManager {
  constructor() {
    this.overlayId = 'loading-overlay';
  }

  /**
   * Show full page loading overlay
   */
  show(message = 'Loading...') {
    // Remove existing overlay if present
    this.hide();

    const overlay = document.createElement('div');
    overlay.id = this.overlayId;
    overlay.innerHTML = LoadingOverlay(message);

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  /**
   * Hide loading overlay
   */
  hide() {
    const overlay = document.getElementById(this.overlayId);
    if (overlay) {
      overlay.remove();
    }
    document.body.style.overflow = '';
  }

  /**
   * Show loading for a specific element
   */
  showInElement(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        ${Spinner({ size: 'lg' })}
        <p class="mt-4 text-gray-600">${message}</p>
      </div>
    `;
  }

  /**
   * Execute async function with loading overlay
   */
  async withLoading(asyncFn, message = 'Loading...') {
    this.show(message);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      this.hide();
    }
  }
}

// Create singleton instance
export const Loading = new LoadingManager();
