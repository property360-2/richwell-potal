/**
 * Table sorting utility
 * Makes tables sortable by clicking column headers
 */

/**
 * Initialize table sorting
 * @param {HTMLTableElement} table - Table element
 * @param {Object} options - Configuration options
 */
export function initTableSorting(table, options = {}) {
    if (!table) return;

    const {
        sortableColumns = [], // Array of column indices that are sortable
        defaultSort = null, // { column: 0, direction: 'asc' }
    } = options;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;

    const headers = Array.from(thead.querySelectorAll('th'));

    // Add sortable class and click handlers to specified columns
    sortableColumns.forEach(columnIndex => {
        const header = headers[columnIndex];
        if (!header) return;

        header.classList.add('table-header-sortable');
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        header.setAttribute('aria-label', `Sort by ${header.textContent.trim()}`);

        // Click handler
        header.addEventListener('click', () => sortTable(table, columnIndex));

        // Keyboard handler
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortTable(table, columnIndex);
            }
        });
    });

    // Apply default sort if specified
    if (defaultSort) {
        sortTable(table, defaultSort.column, defaultSort.direction);
    }
}

/**
 * Sort table by column
 * @param {HTMLTableElement} table - Table element
 * @param {number} columnIndex - Column index to sort by
 * @param {string} direction - 'asc' or 'desc' (optional, will toggle if not specified)
 */
function sortTable(table, columnIndex, direction = null) {
    const tbody = table.querySelector('tbody');
    const headers = Array.from(table.querySelectorAll('thead th'));
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Determine sort direction
    const currentHeader = headers[columnIndex];
    const currentDirection = currentHeader.classList.contains('asc') ? 'asc' :
        currentHeader.classList.contains('desc') ? 'desc' : null;

    const newDirection = direction || (currentDirection === 'asc' ? 'desc' : 'asc');

    // Clear all header sort indicators
    headers.forEach(h => h.classList.remove('asc', 'desc'));

    // Add new sort indicator
    currentHeader.classList.add(newDirection);
    currentHeader.setAttribute('aria-sort', newDirection === 'asc' ? 'ascending' : 'descending');

    // Sort rows
    const sortedRows = rows.sort((a, b) => {
        const aCell = a.cells[columnIndex];
        const bCell = b.cells[columnIndex];

        if (!aCell || !bCell) return 0;

        // Get text content or data attribute for sorting
        const aValue = aCell.dataset.sortValue || aCell.textContent.trim();
        const bValue = bCell.dataset.sortValue || bCell.textContent.trim();

        // Try numeric comparison first
        const aNum = parseFloat(aValue.replace(/[^0-9.-]/g, ''));
        const bNum = parseFloat(bValue.replace(/[^0-9.-]/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return newDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Fall back to string comparison
        const comparison = aValue.localeCompare(bValue);
        return newDirection === 'asc' ? comparison : -comparison;
    });

    // Re-append sorted rows
    sortedRows.forEach(row => tbody.appendChild(row));
}

/**
 * Initialize scroll indicator for tables on mobile
 * @param {HTMLElement} container - Table container element
 */
export function initTableScrollIndicator(container) {
    if (!container) return;

    const table = container.querySelector('table');
    if (!table) return;

    container.classList.add('table-scroll-indicator');

    function checkScroll() {
        const isScrollable = container.scrollWidth > container.clientWidth;
        const isScrolledToEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;

        if (isScrollable && !isScrolledToEnd) {
            container.classList.add('scrollable');
        } else {
            container.classList.remove('scrollable');
        }
    }

    // Check on load and scroll
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
}
