/**
 * Badge Atom
 * 
 * Status and label badges with color variants.
 * Pure presentational component.
 * 
 * Usage:
 *   import { renderBadge, StatusBadge } from './atoms/badges/Badge.js';
 *   
 *   const html = renderBadge({ text: 'Active', color: 'success' });
 *   const statusHtml = renderStatusBadge('ENROLLED');
 */

import { BaseComponent, SIS } from '../../core/index.js';

// Color variants with CSS classes
const COLORS = {
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-sky-100 text-sky-800 border-sky-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    teal: 'bg-teal-100 text-teal-800 border-teal-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200'
};

// Size variants
const SIZES = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
};

/**
 * Render badge HTML string
 * @param {Object} options - Badge options
 * @returns {string} HTML string
 */
export function renderBadge({
    text = '',
    color = 'secondary',
    size = 'sm',
    rounded = true,
    border = false,
    icon = null,
    className = ''
}) {
    const colorClass = COLORS[color] || COLORS.secondary;
    const sizeClass = SIZES[size] || SIZES.sm;
    const roundedClass = rounded ? 'rounded-full' : 'rounded';
    const borderClass = border ? 'border' : '';

    const iconHtml = icon ? `<span class="mr-1">${icon}</span>` : '';

    return `
    <span class="inline-flex items-center font-medium ${colorClass} ${sizeClass} ${roundedClass} ${borderClass} ${className}">
      ${iconHtml}${text}
    </span>
  `.trim();
}

// Status to color mapping
const STATUS_COLORS = {
    // Enrollment statuses
    'ACTIVE': 'success',
    'ENROLLED': 'success',
    'PENDING': 'warning',
    'PENDING_PAYMENT': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger',
    'CANCELLED': 'danger',
    'DROPPED': 'danger',
    'COMPLETED': 'info',
    'GRADUATED': 'purple',

    // Grade statuses
    'PASSED': 'success',
    'FAILED': 'danger',
    'INC': 'warning',
    'DRP': 'secondary',
    'W': 'secondary',

    // Semester statuses
    'CURRENT': 'success',
    'UPCOMING': 'info',
    'PAST': 'secondary',

    // Payment statuses
    'PAID': 'success',
    'PARTIAL': 'warning',
    'UNPAID': 'danger',

    // Generic
    'TRUE': 'success',
    'FALSE': 'danger',
    'YES': 'success',
    'NO': 'danger',
    'ENABLED': 'success',
    'DISABLED': 'secondary'
};

/**
 * Render status badge with automatic color mapping
 * @param {string} status - Status text
 * @param {Object} options - Additional options
 * @returns {string} HTML string
 */
export function renderStatusBadge(status, options = {}) {
    const normalizedStatus = String(status).toUpperCase().replace(/\s+/g, '_');
    const color = STATUS_COLORS[normalizedStatus] || 'secondary';

    return renderBadge({
        text: status,
        color,
        ...options
    });
}

/**
 * Badge Component Class
 */
export class Badge extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderBadge(this.props);
    }
}

/**
 * StatusBadge Component Class
 */
export class StatusBadge extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        const status = this.props.status || this.el.textContent.trim();
        this.el.innerHTML = renderStatusBadge(status, this.props);
    }
}

// Register with SIS
SIS.register('Badge', Badge);
SIS.register('StatusBadge', StatusBadge);

export { COLORS as BADGE_COLORS, STATUS_COLORS };
export default Badge;
