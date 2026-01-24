/**
 * Export Button Utility
 * Provides helpers to trigger Excel/PDF downloads from API endpoints
 */

import { api } from '../api.js';
import { Toast } from './Toast.js';

/**
 * Create an export button with dropdown for Excel/PDF options
 * 
 * @param {Object} options Configuration object
 * @param {string} options.endpoint API endpoint for export (e.g., '/api/v1/enrollment/export/students/')
 * @param {string} options.filename Base filename (without extension)
 * @param {string} options.label Button label (default: 'Export')
 * @param {string} options.className Additional CSS classes
 * @returns {string} HTML for export button
 */
export function createExportButton({
    endpoint,
    filename,
    label = 'Export',
    className = ''
}) {
    const uniqueId = `export-btn-${Math.random().toString(36).substr(2, 9)}`;

    return `
    <div class="relative inline-block" data-export-dropdown>
      <button 
        type="button"
        id="${uniqueId}"
        class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${className}"
        aria-haspopup="true"
        aria-expanded="false"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <span>${label}</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      
      <div 
        class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden z-50"
        role="menu"
        aria-orientation="vertical"
      >
        <button 
          type="button"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 rounded-t-lg"
          data-export-format="excel"
          data-export-endpoint="${endpoint}"
          data-export-filename="${filename}"
          role="menuitem"
        >
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <div>
            <div class="font-medium text-gray-900">Excel</div>
            <div class="text-xs text-gray-500">.xlsx format</div>
          </div>
        </button>
        
        <button 
          type="button"
          class="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3 rounded-b-lg border-t border-gray-100"
          data-export-format="pdf"
          data-export-endpoint="${endpoint}"
          data-export-filename="${filename}"
          role="menuitem"
        >
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
          <div>
            <div class="font-medium text-gray-900">PDF</div>
            <div class="text-xs text-gray-500">.pdf format</div>
          </div>
        </button>
      </div>
    </div>
  `;
}

/**
 * Initialize export button dropdowns and click handlers
 * Call this after adding export buttons to the DOM
 *
 * @param {Element} container Optional container element (defaults to document)
 */
export function initExportButtons(container = document) {
    const dropdowns = container.querySelectorAll('[data-export-dropdown]');

    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('button[aria-haspopup]');
        const menu = dropdown.querySelector('[role="menu"]');
        const exportButtons = dropdown.querySelectorAll('[data-export-format]');

        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            // Close all other dropdowns
            document.querySelectorAll('[data-export-dropdown] [aria-expanded="true"]').forEach(btn => {
                if (btn !== button) {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.nextElementSibling.classList.add('hidden');
                }
            });

            // Toggle this dropdown
            button.setAttribute('aria-expanded', !isExpanded);
            menu.classList.toggle('hidden');
        });

        // Handle export clicks
        exportButtons.forEach(exportBtn => {
            exportBtn.addEventListener('click', async () => {
                const format = exportBtn.dataset.exportFormat;
                const endpoint = exportBtn.dataset.exportEndpoint;
                const filename = exportBtn.dataset.exportFilename;

                // Close dropdown
                button.setAttribute('aria-expanded', 'false');
                menu.classList.add('hidden');

                // Trigger download
                await downloadExport(endpoint, format, filename);
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('[data-export-dropdown] [aria-expanded="true"]').forEach(btn => {
            btn.setAttribute('aria-expanded', 'false');
            btn.nextElementSibling.classList.add('hidden');
        });
    });
}

/**
 * Download export file from endpoint
 * 
 * @param {string} endpoint API endpoint
 * @param {string} format 'excel' or 'pdf'
 * @param {string} filename Base filename
 */
async function downloadExport(endpoint, format, filename) {
    try {
        Toast.info(`Preparing ${format.toUpperCase()} export...`);

        const response = await api.request(`${endpoint}?format=${format}`, {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error('Export failed');
        }

        // Get blob from response
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        Toast.success(`${format.toUpperCase()} export downloaded successfully!`);
    } catch (error) {
        console.error('Export error:', error);
        Toast.error('Failed to export. Please try again.');
    }
}
