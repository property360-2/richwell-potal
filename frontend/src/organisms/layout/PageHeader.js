/**
 * PageHeader Organism
 * 
 * Consistent page header with title, subtitle, breadcrumbs, and actions.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { renderBreadcrumb } from '../../molecules/index.js';
import { renderButton } from '../../atoms/index.js';

/**
 * Render page header HTML
 */
export function renderPageHeader({
    title = '',
    subtitle = '',
    breadcrumbs = [],     // [{ label, href?, onClick? }]
    actions = [],          // [{ label, onClick, variant?, icon? }]
    badge = null,          // { text, color }
    backButton = null,     // { label, onClick }
    className = ''
}) {
    const breadcrumbHtml = breadcrumbs.length > 0
        ? `<div class="mb-4">${renderBreadcrumb({ items: breadcrumbs })}</div>`
        : '';

    const backHtml = backButton ? `
    <button onclick="${backButton.onClick || 'history.back()'}" class="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
      </svg>
      ${backButton.label || 'Back'}
    </button>
  ` : '';

    const badgeHtml = badge ? `
    <span class="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${badge.color || 'blue'}-100 text-${badge.color || 'blue'}-800">
      ${badge.text}
    </span>
  ` : '';

    const actionsHtml = actions.length > 0 ? `
    <div class="flex items-center gap-2 flex-shrink-0">
      ${actions.map(action => renderButton({
        label: action.label,
        variant: action.variant || 'primary',
        icon: action.icon || null,
        onClick: action.onClick || ''
    })).join('')}
    </div>
  ` : '';

    return `
    <div class="${className}">
      ${backHtml}
      ${breadcrumbHtml}
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 flex items-center">
            ${title}
            ${badgeHtml}
          </h1>
          ${subtitle ? `<p class="text-gray-600 mt-1">${subtitle}</p>` : ''}
        </div>
        ${actionsHtml}
      </div>
    </div>
  `.trim();
}

/**
 * PageHeader Component Class
 */
export class PageHeader extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderPageHeader(this.props);
    }

    setTitle(title) {
        const h1 = this.$('h1');
        if (h1) {
            h1.childNodes[0].textContent = title;
        }
    }
}

// Register with SIS
SIS.register('PageHeader', PageHeader);

export default PageHeader;
