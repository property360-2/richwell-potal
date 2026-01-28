/**
 * Button Atom
 * 
 * Reusable button component with variants, sizes, and icons.
 * This is a pure presentational component - no business logic.
 * 
 * Usage:
 *   import { Button, renderButton } from './atoms/buttons/Button.js';
 *   
 *   // Function call (returns HTML string)
 *   const html = renderButton({ label: 'Save', variant: 'primary' });
 *   
 *   // Or use the component
 *   <div data-sis-component="Button" data-sis-props='{"label": "Save", "variant": "primary"}'></div>
 */

import { BaseComponent, SIS } from '../../core/index.js';

// Button variants with their CSS classes
const VARIANTS = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    danger: 'btn btn-danger',
    ghost: 'btn btn-ghost',
    link: 'text-blue-600 hover:text-blue-800 underline'
};

// Button sizes
const SIZES = {
    sm: 'text-xs px-2 py-1',
    md: '', // Default size from btn class
    lg: 'text-lg px-6 py-3'
};

/**
 * Render button HTML string
 * @param {Object} options - Button options
 * @returns {string} HTML string
 */
export function renderButton({
    label = '',
    variant = 'primary',
    size = 'md',
    icon = null,
    iconPosition = 'left',
    disabled = false,
    loading = false,
    type = 'button',
    id = '',
    className = '',
    dataAttributes = {},
    onClick = ''
}) {
    const variantClass = VARIANTS[variant] || VARIANTS.primary;
    const sizeClass = SIZES[size] || '';
    const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

    // Build data attributes string
    const dataAttrs = Object.entries(dataAttributes)
        .map(([key, value]) => `data-${key}="${value}"`)
        .join(' ');

    // Icon HTML
    const iconHtml = icon ? `<span class="btn-icon">${icon}</span>` : '';

    // Loading spinner
    const loadingHtml = loading ? `
    <svg class="animate-spin h-4 w-4 ${label ? 'mr-2' : ''}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ` : '';

    // Build content based on icon position
    let content = '';
    if (loading) {
        content = `${loadingHtml}${label || 'Loading...'}`;
    } else if (iconPosition === 'left') {
        content = `${iconHtml}${iconHtml && label ? '<span class="ml-2">' + label + '</span>' : label}`;
    } else {
        content = `${label ? '<span class="mr-2">' + label + '</span>' : ''}${iconHtml}`;
    }

    return `
    <button 
      type="${type}"
      ${id ? `id="${id}"` : ''}
      class="${variantClass} ${sizeClass} ${disabledClass} ${className} flex items-center justify-center gap-1".trim()
      ${disabled || loading ? 'disabled' : ''}
      ${onClick ? `onclick="${onClick}"` : ''}
      ${dataAttrs}
    >
      ${content}
    </button>
  `.trim();
}

/**
 * Button Component Class
 * For use with ComponentFactory
 */
export class Button extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        const button = renderButton(this.props);
        this.el.innerHTML = button;
        this.attachListeners();
    }

    attachListeners() {
        const btn = this.el.querySelector('button');
        if (btn && this.props.onClick && typeof this.props.onClick === 'function') {
            this.on(btn, 'click', this.props.onClick);
        }
    }
}

// Register with SIS
SIS.register('Button', Button);

// Common button icons
export const BUTTON_ICONS = {
    plus: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
  </svg>`,
    edit: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
  </svg>`,
    delete: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
  </svg>`,
    save: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
  </svg>`,
    close: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>`,
    search: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
  </svg>`,
    refresh: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
  </svg>`,
    download: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
  </svg>`,
    view: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
  </svg>`
};

export default Button;
