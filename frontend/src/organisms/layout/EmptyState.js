/**
 * EmptyState Organism
 * 
 * Placeholder for empty data states with icon, message, and action.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon, renderButton, BUTTON_ICONS } from '../../atoms/index.js';

/**
 * Render empty state HTML
 */
export function renderEmptyState({
    icon = 'search',
    title = 'No results found',
    message = '',
    action = null,  // { label, onClick, variant }
    size = 'md',    // 'sm' | 'md' | 'lg'
    className = ''
}) {
    const sizes = {
        sm: { icon: 'lg', title: 'text-base', padding: 'py-6' },
        md: { icon: 'xl', title: 'text-lg', padding: 'py-12' },
        lg: { icon: '2xl', title: 'text-xl', padding: 'py-16' }
    };
    const s = sizes[size] || sizes.md;

    const iconHtml = typeof icon === 'string'
        ? `<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
         ${Icon(icon, { size: s.icon, className: 'text-gray-400' })}
       </div>`
        : icon;

    const actionHtml = action ? `
    <div class="mt-4">
      ${renderButton({
        label: action.label,
        variant: action.variant || 'primary',
        onClick: action.onClick || ''
    })}
    </div>
  ` : '';

    return `
    <div class="text-center ${s.padding} ${className}">
      ${iconHtml}
      <h4 class="${s.title} font-semibold text-gray-700 mb-1">${title}</h4>
      ${message ? `<p class="text-gray-500 text-sm max-w-md mx-auto">${message}</p>` : ''}
      ${actionHtml}
    </div>
  `.trim();
}

/**
 * Common empty state presets
 */
export const EmptyStatePresets = {
    noResults: (action) => renderEmptyState({
        icon: 'search',
        title: 'No results found',
        message: 'Try adjusting your search or filters to find what you\'re looking for.',
        action
    }),
    noData: (entityName, action) => renderEmptyState({
        icon: 'folder',
        title: `No ${entityName} yet`,
        message: `Get started by creating your first ${entityName.toLowerCase()}.`,
        action: action || { label: `Add ${entityName}`, onClick: '' }
    }),
    error: (action) => renderEmptyState({
        icon: 'error',
        title: 'Something went wrong',
        message: 'We couldn\'t load the data. Please try again.',
        action: action || { label: 'Retry', onClick: 'window.location.reload()' }
    }),
    noAccess: () => renderEmptyState({
        icon: 'lock',
        title: 'Access Restricted',
        message: 'You don\'t have permission to view this content.'
    }),
    comingSoon: () => renderEmptyState({
        icon: 'clock',
        title: 'Coming Soon',
        message: 'This feature is under development and will be available soon.'
    })
};

/**
 * EmptyState Component Class
 */
export class EmptyState extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderEmptyState(this.props);
        this.attachListeners();
    }

    attachListeners() {
        if (this.props.action?.onClick && typeof this.props.action.onClick === 'function') {
            const btn = this.$('button');
            if (btn) {
                this.on(btn, 'click', this.props.action.onClick);
            }
        }
    }
}

// Register with SIS
SIS.register('EmptyState', EmptyState);

export default EmptyState;
