/**
 * Pagination Organism
 * 
 * Page navigation with page numbers and prev/next buttons.
 */

import { BaseComponent, SIS } from '../../core/index.js';
import { Icon } from '../../atoms/index.js';

/**
 * Render pagination HTML
 */
export function renderPagination({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 10,
    onPageChange = '',     // Function name
    showInfo = true,
    maxVisiblePages = 5,
    className = ''
}) {
    if (totalPages <= 1) return '';

    // Calculate visible page range
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
    }

    const prevDisabled = currentPage === 1;
    const nextDisabled = currentPage === totalPages;

    const buttonClass = 'px-3 py-2 text-sm font-medium rounded-lg transition-colors';
    const activeClass = 'bg-blue-600 text-white';
    const inactiveClass = 'text-gray-700 hover:bg-gray-100';
    const disabledClass = 'text-gray-300 cursor-not-allowed';

    // Info text
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    const infoHtml = showInfo && totalItems > 0 ? `
    <span class="text-sm text-gray-500">
      Showing ${startItem}-${endItem} of ${totalItems}
    </span>
  ` : '';

    // Page buttons
    const pagesHtml = pages.map(page => {
        const isActive = page === currentPage;
        const click = onPageChange ? `onclick="${onPageChange}(${page})"` : '';

        return `
      <button 
        type="button" 
        class="${buttonClass} ${isActive ? activeClass : inactiveClass}"
        ${click}
        ${isActive ? 'aria-current="page"' : ''}
      >${page}</button>
    `;
    }).join('');

    // Ellipsis
    const showStartEllipsis = startPage > 1;
    const showEndEllipsis = endPage < totalPages;

    return `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 ${className}">
      ${infoHtml}
      <nav class="flex items-center gap-1" aria-label="Pagination">
        <button 
          type="button" 
          class="${buttonClass} ${prevDisabled ? disabledClass : inactiveClass}"
          ${prevDisabled ? 'disabled' : ''}
          ${!prevDisabled && onPageChange ? `onclick="${onPageChange}(${currentPage - 1})"` : ''}
          aria-label="Previous page"
        >
          ${Icon('chevronLeft', { size: 'sm' })}
        </button>
        
        ${showStartEllipsis ? `
          <button type="button" class="${buttonClass} ${inactiveClass}" ${onPageChange ? `onclick="${onPageChange}(1)"` : ''}>1</button>
          <span class="px-2 text-gray-400">...</span>
        ` : ''}
        
        ${pagesHtml}
        
        ${showEndEllipsis ? `
          <span class="px-2 text-gray-400">...</span>
          <button type="button" class="${buttonClass} ${inactiveClass}" ${onPageChange ? `onclick="${onPageChange}(${totalPages})"` : ''}>${totalPages}</button>
        ` : ''}
        
        <button 
          type="button" 
          class="${buttonClass} ${nextDisabled ? disabledClass : inactiveClass}"
          ${nextDisabled ? 'disabled' : ''}
          ${!nextDisabled && onPageChange ? `onclick="${onPageChange}(${currentPage + 1})"` : ''}
          aria-label="Next page"
        >
          ${Icon('chevronRight', { size: 'sm' })}
        </button>
      </nav>
    </div>
  `.trim();
}

/**
 * Pagination Component Class
 */
export class Pagination extends BaseComponent {
    init() {
        this.state = {
            currentPage: this.props.currentPage || 1
        };

        const id = this.el.id || `pagination-${Date.now()}`;
        this.el.id = id;
        window[`${id}_change`] = this.handleChange.bind(this);

        this.render();
    }

    render() {
        this.el.innerHTML = renderPagination({
            ...this.props,
            currentPage: this.state.currentPage,
            onPageChange: `${this.el.id}_change`
        });
    }

    handleChange(page) {
        if (page === this.state.currentPage) return;
        if (page < 1 || page > this.props.totalPages) return;

        this.state.currentPage = page;
        this.render();
        this.emit('change', { page });
    }

    setPage(page) {
        this.handleChange(page);
    }

    getCurrentPage() {
        return this.state.currentPage;
    }
}

// Register with SIS
SIS.register('Pagination', Pagination);

export default Pagination;
