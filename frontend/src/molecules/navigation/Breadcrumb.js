/**
 * Breadcrumb Molecule
 * 
 * Navigation breadcrumb trail.
 * 
 * Usage:
 *   import { renderBreadcrumb } from './molecules/navigation/Breadcrumb.js';
 *   
 *   const html = renderBreadcrumb({
 *     items: [
 *       { label: 'Home', href: '/' },
 *       { label: 'Academic', href: '#academic' },
 *       { label: 'Programs' }  // Current page (no href)
 *     ]
 *   });
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

/**
 * Render breadcrumb HTML
 * @param {Object} options - Breadcrumb options
 * @returns {string} HTML string
 */
export function renderBreadcrumb({
    items = [],           // [{ label, href?, onClick? }]
    separator = 'chevron', // 'chevron' | 'slash' | 'arrow'
    className = ''
}) {
    if (items.length === 0) return '';

    const separatorHtml = {
        chevron: `<svg class="w-3 h-3 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>`,
        slash: `<span class="text-gray-400 mx-2">/</span>`,
        arrow: `<span class="text-gray-400 mx-2">→</span>`
    }[separator] || separatorHtml.chevron;

    const itemsHtml = items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        let content;
        if (isLast) {
            // Current page - no link
            content = `<span class="text-gray-900 font-medium">${item.label}</span>`;
        } else if (item.href) {
            content = `<a href="${item.href}" class="text-blue-600 hover:text-blue-800 hover:underline">${item.label}</a>`;
        } else if (item.onClick) {
            content = `<button type="button" class="text-blue-600 hover:text-blue-800 hover:underline" onclick="${item.onClick}">${item.label}</button>`;
        } else {
            content = `<span class="text-gray-500">${item.label}</span>`;
        }

        return `
      <li class="inline-flex items-center">
        ${!isFirst ? separatorHtml : ''}
        <span class="text-sm">${content}</span>
      </li>
    `;
    }).join('');

    return `
    <nav class="flex ${className}" aria-label="Breadcrumb">
      <ol class="inline-flex items-center">
        ${itemsHtml}
      </ol>
    </nav>
  `.trim();
}

/**
 * Breadcrumb Component Class
 */
export class Breadcrumb extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderBreadcrumb(this.props);
    }

    setItems(items) {
        this.props.items = items;
        this.render();
    }
}

// Register with SIS
SIS.register('Breadcrumb', Breadcrumb);

export default Breadcrumb;
