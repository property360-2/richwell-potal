/**
 * Registrar INC Management Page
 * 
 * Manage Incomplete (INC) grades - view, filter, and process expired INCs.
 * Uses modular component architecture.
 */
import '../../../style.css';
import { api, endpoints, TokenManager } from '../../../api.js';
import { requireAuth, formatDate } from '../../../utils.js';
import { createHeader } from '../../../components/header.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { LoadingOverlay, InlineSpinner } from '../../../components/Spinner.js';
import { renderBadge } from '../../../atoms/badges/Badge.js';
import { renderButton } from '../../../atoms/buttons/Button.js';
import { renderStatCard, renderStatCardGrid } from '../../../molecules/cards/StatCard.js';
import { renderAlert, renderBanner } from '../../../molecules/feedback/Alert.js';
import { renderEmptyState } from '../../../organisms/layout/EmptyState.js';
import { Icon } from '../../../atoms/icons/Icon.js';
import { showToast } from '../../../components/Toast.js';

// ============================================================
// STATE
// ============================================================

const state = {
    user: null,
    incRecords: [],
    summary: {
        total_count: 0,
        expired_count: 0,
        expiring_soon_count: 0
    },
    loading: true,
    processing: false,
    filters: {
        showExpired: false,
        search: ''
    }
};

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    if (!requireAuth()) return;

    await Promise.all([
        loadUserProfile(),
        loadINCReport()
    ]);

    state.loading = false;
    render();
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            const userData = response.data || response;
            state.user = userData;
            TokenManager.setUser(userData);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile');
    }
}

async function loadINCReport() {
    try {
        const params = new URLSearchParams();
        if (state.filters.showExpired) {
            params.append('include_expired', 'true');
        }

        const url = `${endpoints.incReport}?${params.toString()}`;
        const response = await api.get(url);

        if (response?.success) {
            state.incRecords = response.data.inc_records || [];
            state.summary = {
                total_count: response.data.total_count || 0,
                expired_count: response.data.expired_count || 0,
                expiring_soon_count: response.data.expiring_soon_count || 0
            };
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading INC report');
        state.incRecords = [];
    }
}

// ============================================================
// ACTIONS
// ============================================================

function handleSearchChange(value) {
    state.filters.search = value.toLowerCase();
    render();
}

function handleShowExpiredChange(checked) {
    state.filters.showExpired = checked;
    loadINCReport().then(render);
}

async function processExpiredINCs(dryRun = true) {
    state.processing = true;
    render();

    try {
        const response = await api.post(endpoints.processExpiredIncs, {
            dry_run: dryRun
        });

        if (response?.success) {
            if (dryRun) {
                const count = response.processed_count;
                if (count === 0) {
                    showToast('No expired INC grades found to process', 'info');
                } else {
                    // Show confirmation modal
                    showProcessConfirmation(count, response.processed);
                }
            } else {
                showToast(`Successfully processed ${response.processed_count} expired INC(s)`, 'success');
                // Reload data
                await loadINCReport();
            }
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Processing expired INCs');
    }

    state.processing = false;
    render();
}

function showProcessConfirmation(count, records) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.id = 'process-modal';

    modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-orange-50">
        <h3 class="font-bold text-lg text-gray-800">Confirm Processing</h3>
      </div>
      <div class="p-6">
        ${renderAlert({
        variant: 'warning',
        title: 'This action cannot be undone',
        message: `You are about to convert ${count} expired INC grade(s) to 5.00 (Failed).`
    })}
        
        <div class="mt-4 max-h-48 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="text-gray-500">
              <tr>
                <th class="text-left py-1">Student</th>
                <th class="text-left py-1">Subject</th>
              </tr>
            </thead>
            <tbody class="text-gray-700">
              ${records.slice(0, 10).map(r => `
                <tr class="border-t border-gray-100">
                  <td class="py-2">${r.student_number}</td>
                  <td class="py-2">${r.subject_code}</td>
                </tr>
              `).join('')}
              ${records.length > 10 ? `
                <tr class="border-t border-gray-100">
                  <td colspan="2" class="py-2 text-gray-500 italic">
                    ... and ${records.length - 10} more
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
        <button 
          onclick="closeProcessModal()"
          class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          onclick="confirmProcess()"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Process ${count} INC(s)
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
}

function closeProcessModal() {
    const modal = document.getElementById('process-modal');
    if (modal) modal.remove();
}

async function confirmProcess() {
    closeProcessModal();
    await processExpiredINCs(false);
}

// ============================================================
// RENDER
// ============================================================

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading INC report...');
        return;
    }

    // Filter records
    const filteredRecords = state.incRecords.filter(r => {
        if (!state.filters.search) return true;
        return (
            r.student_number.toLowerCase().includes(state.filters.search) ||
            r.student_name.toLowerCase().includes(state.filters.search) ||
            r.subject_code.toLowerCase().includes(state.filters.search)
        );
    });

    app.innerHTML = `
    ${createHeader({
        role: 'REGISTRAR',
        activePage: 'registrar-inc',
        user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">INC Management</h1>
          <p class="text-gray-600 mt-1">View and process Incomplete (INC) grades</p>
        </div>
        
        ${state.summary.expired_count > 0 ? `
          <button 
            onclick="processExpiredINCs(true)"
            ${state.processing ? 'disabled' : ''}
            class="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            ${state.processing ? InlineSpinner() : Icon('warning', { size: 'sm' })}
            Process Expired (${state.summary.expired_count})
          </button>
        ` : ''}
      </div>
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        ${renderStatCard({
        label: 'Total INC Grades',
        value: state.summary.total_count,
        iconName: 'clock',
        color: 'blue'
    })}
        ${renderStatCard({
        label: 'Expiring Soon (30 days)',
        value: state.summary.expiring_soon_count,
        iconName: 'warning',
        color: 'yellow'
    })}
        ${renderStatCard({
        label: 'Expired',
        value: state.summary.expired_count,
        iconName: 'error',
        color: 'red'
    })}
      </div>
      
      <!-- Warning Banner -->
      ${state.summary.expiring_soon_count > 0 ? `
        ${renderBanner({
        message: `${state.summary.expiring_soon_count} INC grade(s) will expire within 30 days. Students should be notified.`,
        variant: 'warning'
    })}
      ` : ''}
      
      <!-- Filters -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <!-- Search -->
          <div class="flex-1 min-w-[250px]">
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                ${Icon('search', { size: 'sm' })}
              </span>
              <input 
                type="text" 
                placeholder="Search by student, subject..."
                class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value="${state.filters.search}"
                oninput="handleSearchChange(this.value)"
              />
            </div>
          </div>
          
          <!-- Show Expired Toggle -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              ${state.filters.showExpired ? 'checked' : ''}
              onchange="handleShowExpiredChange(this.checked)"
              class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Include expired</span>
          </label>
        </div>
      </div>
      
      <!-- Table -->
      ${renderINCTable(filteredRecords)}
    </main>
  `;
}

function renderINCTable(records) {
    if (records.length === 0) {
        return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        ${renderEmptyState({
            icon: 'check',
            title: 'No INC Grades',
            message: 'All incomplete grades have been resolved or none exist.'
        })}
      </div>
    `;
    }

    return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
              <th class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Semester</th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Days Left</th>
              <th class="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${records.map(record => renderINCRow(record)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderINCRow(record) {
    let statusBadge;
    let daysDisplay;

    if (record.is_expired) {
        statusBadge = renderBadge({ text: 'Expired', color: 'danger', size: 'sm' });
        daysDisplay = '<span class="text-red-600 font-medium">Expired</span>';
    } else if (record.days_until_expiration !== null && record.days_until_expiration <= 30) {
        statusBadge = renderBadge({ text: 'Expiring Soon', color: 'warning', size: 'sm' });
        daysDisplay = `<span class="text-orange-600 font-medium">${record.days_until_expiration} days</span>`;
    } else {
        statusBadge = renderBadge({ text: 'Active', color: 'secondary', size: 'sm' });
        daysDisplay = record.days_until_expiration !== null ? `${record.days_until_expiration} days` : '--';
    }

    return `
    <tr class="${record.is_expired ? 'bg-red-50' : record.days_until_expiration <= 30 ? 'bg-yellow-50' : ''} hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${record.student_name}</div>
        <div class="text-sm text-gray-500">${record.student_number}</div>
      </td>
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${record.subject_code}</div>
        <div class="text-sm text-gray-500">${record.subject_title}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-gray-900">${record.semester}</div>
        <div class="text-sm text-gray-500">${record.academic_year}</div>
      </td>
      <td class="px-6 py-4 text-center">
        ${daysDisplay}
      </td>
      <td class="px-6 py-4 text-center">
        ${statusBadge}
      </td>
    </tr>
  `;
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleSearchChange = handleSearchChange;
window.handleShowExpiredChange = handleShowExpiredChange;
window.processExpiredINCs = processExpiredINCs;
window.closeProcessModal = closeProcessModal;
window.confirmProcess = confirmProcess;

window.logout = function () {
    TokenManager.clearTokens();
    window.location.href = '/login.html';
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
