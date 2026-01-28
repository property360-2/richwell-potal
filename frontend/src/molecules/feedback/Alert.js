/**
 * Alert Molecule
 * 
 * Informational alert boxes with variants.
 * 
 * Usage:
 *   import { renderAlert, Alert } from './molecules/feedback/Alert.js';
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

const VARIANTS = {
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'info'
    },
    success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        icon: 'success'
    },
    warning: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        icon: 'warning'
    },
    danger: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: 'error'
    }
};

/**
 * Render alert HTML
 * @param {Object} options - Alert options
 * @returns {string} HTML string
 */
export function renderAlert({
    title = '',
    message = '',
    variant = 'info',
    dismissible = false,
    onDismiss = '',
    icon = true,
    className = ''
}) {
    const v = VARIANTS[variant] || VARIANTS.info;

    const iconHtml = icon ? `
    <div class="flex-shrink-0 mt-0.5">
      ${Icon(v.icon, { size: 'md' })}
    </div>
  ` : '';

    const dismissBtn = dismissible ? `
    <button 
      type="button" 
      class="flex-shrink-0 ml-auto -mr-1 p-1 rounded hover:bg-black/10 transition-colors"
      ${onDismiss ? `onclick="${onDismiss}"` : ''}
      aria-label="Dismiss"
    >
      ${Icon('close', { size: 'sm' })}
    </button>
  ` : '';

    return `
    <div class="${v.bg} ${v.border} ${v.text} border rounded-xl p-4 ${className}" role="alert">
      <div class="flex items-start gap-3">
        ${iconHtml}
        <div class="flex-1 min-w-0">
          ${title ? `<h4 class="font-semibold mb-1">${title}</h4>` : ''}
          ${message ? `<p class="text-sm ${title ? 'opacity-90' : ''}">${message}</p>` : ''}
        </div>
        ${dismissBtn}
      </div>
    </div>
  `.trim();
}

/**
 * Render banner alert (full-width)
 * @param {Object} options - Banner options
 * @returns {string} HTML string
 */
export function renderBanner({
    message = '',
    variant = 'info',
    action = null,  // { label, onClick }
    className = ''
}) {
    const v = VARIANTS[variant] || VARIANTS.info;

    const actionHtml = action ? `
    <button 
      type="button" 
      class="ml-4 font-medium underline hover:no-underline"
      ${action.onClick ? `onclick="${action.onClick}"` : ''}
    >${action.label}</button>
  ` : '';

    return `
    <div class="${v.bg} ${v.border} ${v.text} border-l-4 px-4 py-3 ${className}">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          ${Icon(v.icon, { size: 'sm' })}
          <span class="text-sm font-medium">${message}</span>
        </div>
        ${actionHtml}
      </div>
    </div>
  `.trim();
}

/**
 * Alert Component Class
 */
export class Alert extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderAlert({
            ...this.props,
            onDismiss: this.props.dismissible ? '' : undefined
        });
        this.attachListeners();
    }

    attachListeners() {
        if (this.props.dismissible) {
            const btn = this.$('button');
            if (btn) {
                this.on(btn, 'click', () => {
                    this.dismiss();
                });
            }
        }
    }

    dismiss() {
        this.el.style.opacity = '0';
        this.el.style.transform = 'translateY(-10px)';
        this.el.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            this.el.remove();
            this.emit('dismissed', {});
        }, 300);
    }
}

// Register with SIS
SIS.register('Alert', Alert);

export default Alert;
