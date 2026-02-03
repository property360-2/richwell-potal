import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  logs: [],
  filters: {
    actions: [],
    targetModels: []
  },
  pagination: {
    count: 0,
    next: null,
    previous: null,
    currentPage: 1
  },
  // Filter state
  selectedAction: '',
  selectedModel: '',
  searchQuery: '',
  dateFrom: '',
  dateTo: '',
  // Detail modal
  selectedLog: null,
  showDetailModal: false
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();

  // Check if user is admin
  if (state.user?.role !== 'ADMIN') {
    Toast.error('Access denied. Admin only.');
    window.location.href = '/login.html';
    return;
  }

  await Promise.all([
    loadFilters(),
    loadLogs()
  ]);

  state.loading = false;
  render();
}

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      state.user = response;
      TokenManager.setUser(response);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user profile', { showToast: false });
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadFilters() {
  try {
    const response = await api.get(endpoints.auditLogFilters);
    if (response) {
      state.filters.actions = response.actions || [];
      state.filters.targetModels = response.target_models || [];
    }
  } catch (error) {
    // Filters are optional, don't show error
    console.error('Failed to load filters:', error);
  }
}

async function loadLogs(page = 1) {
  try {
    state.loading = true;
    render();

    // Build query params
    const params = new URLSearchParams();
    if (state.selectedAction) params.append('action', state.selectedAction);
    if (state.selectedModel) params.append('target_model', state.selectedModel);
    if (state.searchQuery) params.append('search', state.searchQuery);
    if (state.dateFrom) params.append('date_from', state.dateFrom);
    if (state.dateTo) params.append('date_to', state.dateTo);
    if (page > 1) params.append('page', page);

    const queryString = params.toString();
    const url = queryString ? `${endpoints.auditLogs}?${queryString}` : endpoints.auditLogs;

    const response = await api.get(url);

    if (response) {
      state.logs = response.results || response || [];
      state.pagination = {
        count: response.count || state.logs.length,
        next: response.next,
        previous: response.previous,
        currentPage: page
      };
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading audit logs');
    state.logs = [];
  } finally {
    state.loading = false;
    render();
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading && state.logs.length === 0) {
    app.innerHTML = LoadingOverlay('Loading audit logs...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'ADMIN',
      activePage: 'admin-audit-logs',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Audit Logs</h1>
        <p class="text-gray-600 mt-1">View system activity and track all changes</p>
      </div>

      <!-- Filters -->
      ${renderFilters()}

      <!-- Stats -->
      ${renderStats()}

      <!-- Logs Table -->
      ${renderLogsTable()}

      <!-- Pagination -->
      ${renderPagination()}
    </main>

    ${state.showDetailModal ? renderDetailModal() : ''}
  `;
}

function renderFilters() {
  return `
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Search -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            id="search-input"
            value="${state.searchQuery}"
            placeholder="Search by user or model..."
            class="form-input"
            onkeyup="handleSearchKeyup(event)"
          >
        </div>

        <!-- Action Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
          <select id="action-filter" class="form-select" onchange="handleActionChange(this.value)">
            <option value="">All Actions</option>
            ${state.filters.actions.map(a => `
              <option value="${a.value}" ${state.selectedAction === a.value ? 'selected' : ''}>${a.label}</option>
            `).join('')}
          </select>
        </div>

        <!-- Target Model -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Target</label>
          <select id="model-filter" class="form-select" onchange="handleModelChange(this.value)">
            <option value="">All Models</option>
            ${state.filters.targetModels.map(m => `
              <option value="${m}" ${state.selectedModel === m ? 'selected' : ''}>${m}</option>
            `).join('')}
          </select>
        </div>

        <!-- Date From -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <input
            type="date"
            id="date-from"
            value="${state.dateFrom}"
            class="form-input"
            onchange="handleDateFromChange(this.value)"
          >
        </div>

        <!-- Date To -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <input
            type="date"
            id="date-to"
            value="${state.dateTo}"
            class="form-input"
            onchange="handleDateToChange(this.value)"
          >
        </div>
      </div>

      <div class="flex justify-end mt-4 gap-2">
        <button onclick="clearFilters()" class="btn btn-secondary text-sm">
          Clear Filters
        </button>
        <button onclick="applyFilters()" class="btn btn-primary text-sm">
          Apply Filters
        </button>
      </div>
    </div>
  `;
}

function renderStats() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="card">
        <p class="text-sm text-gray-600">Total Logs</p>
        <p class="text-2xl font-bold text-blue-600">${state.pagination.count.toLocaleString()}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-600">Showing</p>
        <p class="text-2xl font-bold text-green-600">${state.logs.length}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-600">Current Page</p>
        <p class="text-2xl font-bold text-purple-600">${state.pagination.currentPage}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-600">Filters Active</p>
        <p class="text-2xl font-bold text-orange-600">${countActiveFilters()}</p>
      </div>
    </div>
  `;
}

function countActiveFilters() {
  let count = 0;
  if (state.selectedAction) count++;
  if (state.selectedModel) count++;
  if (state.searchQuery) count++;
  if (state.dateFrom) count++;
  if (state.dateTo) count++;
  return count;
}

function renderLogsTable() {
  if (state.logs.length === 0) {
    return `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No audit logs found</p>
        <p class="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${state.logs.map(log => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(log.timestamp)}</div>
                <div class="text-xs text-gray-500">${formatTime(log.timestamp)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${log.actor_name || 'SYSTEM'}</div>
                <div class="text-xs text-gray-500">${log.actor_email || '-'}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeClass(log.action)}">
                  ${log.action_display}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${log.target_model}</div>
                <div class="text-xs text-gray-500 font-mono">${log.target_id ? log.target_id.substring(0, 8) + '...' : '-'}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600 font-mono">${log.ip_address || '-'}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <button onclick="viewLogDetail('${log.id}')" class="text-blue-600 hover:text-blue-900 text-sm">
                  View Details
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPagination() {
  const totalPages = Math.ceil(state.pagination.count / 20);
  if (totalPages <= 1) return '';

  return `
    <div class="flex justify-between items-center mt-6">
      <div class="text-sm text-gray-600">
        Showing ${(state.pagination.currentPage - 1) * 20 + 1} - ${Math.min(state.pagination.currentPage * 20, state.pagination.count)} of ${state.pagination.count}
      </div>
      <div class="flex gap-2">
        <button
          onclick="goToPage(${state.pagination.currentPage - 1})"
          ${!state.pagination.previous ? 'disabled' : ''}
          class="btn btn-secondary text-sm ${!state.pagination.previous ? 'opacity-50 cursor-not-allowed' : ''}"
        >
          Previous
        </button>
        <span class="px-4 py-2 text-sm text-gray-700">
          Page ${state.pagination.currentPage} of ${totalPages}
        </span>
        <button
          onclick="goToPage(${state.pagination.currentPage + 1})"
          ${!state.pagination.next ? 'disabled' : ''}
          class="btn btn-secondary text-sm ${!state.pagination.next ? 'opacity-50 cursor-not-allowed' : ''}"
        >
          Next
        </button>
      </div>
    </div>
  `;
}

function renderDetailModal() {
  const log = state.selectedLog;
  if (!log) return '';

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeDetailModal()">
      <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-xl font-bold text-gray-800">Audit Log Details</h3>
          <button onclick="closeDetailModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <!-- Basic Info -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Timestamp</p>
              <p class="font-medium">${formatDate(log.timestamp)} ${formatTime(log.timestamp)}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Action</p>
              <span class="px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeClass(log.action)}">
                ${log.action_display}
              </span>
            </div>
          </div>

          <!-- Actor -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">User</p>
              <p class="font-medium">${log.actor_name || 'SYSTEM'}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Email</p>
              <p class="font-medium">${log.actor_email || '-'}</p>
            </div>
          </div>

          <!-- Target -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Target Model</p>
              <p class="font-medium">${log.target_model}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Target ID</p>
              <p class="font-medium font-mono text-sm">${log.target_id || '-'}</p>
            </div>
          </div>

          <!-- IP Address -->
          <div>
            <p class="text-sm text-gray-600">IP Address</p>
            <p class="font-medium font-mono">${log.ip_address || '-'}</p>
          </div>

          <!-- Payload -->
          ${log.payload && Object.keys(log.payload).length > 0 ? `
            <div>
              <p class="text-sm text-gray-600 mb-2">Payload / Details</p>
              <pre class="bg-gray-100 rounded-lg p-4 text-sm overflow-x-auto">${JSON.stringify(log.payload, null, 2)}</pre>
            </div>
          ` : ''}
        </div>

        <div class="flex justify-end mt-6">
          <button onclick="closeDetailModal()" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getActionBadgeClass(action) {
  if (action.includes('CREATED') || action.includes('ENROLLED')) {
    return 'bg-green-100 text-green-800';
  }
  if (action.includes('DELETED') || action.includes('DROPPED') || action.includes('REVOKED')) {
    return 'bg-red-100 text-red-800';
  }
  if (action.includes('UPDATED') || action.includes('CHANGED') || action.includes('EDITED')) {
    return 'bg-blue-100 text-blue-800';
  }
  if (action.includes('LOGIN') || action.includes('LOGOUT')) {
    return 'bg-purple-100 text-purple-800';
  }
  if (action.includes('RELEASED') || action.includes('APPROVED')) {
    return 'bg-teal-100 text-teal-800';
  }
  if (action.includes('OVERRIDE') || action.includes('IMPERSONATED')) {
    return 'bg-orange-100 text-orange-800';
  }
  return 'bg-gray-100 text-gray-800';
}

// Event handlers
window.handleSearchKeyup = function(event) {
  if (event.key === 'Enter') {
    applyFilters();
  }
};

window.handleActionChange = function(value) {
  state.selectedAction = value;
};

window.handleModelChange = function(value) {
  state.selectedModel = value;
};

window.handleDateFromChange = function(value) {
  state.dateFrom = value;
};

window.handleDateToChange = function(value) {
  state.dateTo = value;
};

window.applyFilters = function() {
  state.searchQuery = document.getElementById('search-input')?.value || '';
  loadLogs(1);
};

window.clearFilters = function() {
  state.selectedAction = '';
  state.selectedModel = '';
  state.searchQuery = '';
  state.dateFrom = '';
  state.dateTo = '';
  loadLogs(1);
};

window.goToPage = function(page) {
  if (page < 1) return;
  loadLogs(page);
};

window.viewLogDetail = function(logId) {
  const log = state.logs.find(l => l.id === logId);
  if (log) {
    state.selectedLog = log;
    state.showDetailModal = true;
    render();
  }
};

window.closeDetailModal = function() {
  state.showDetailModal = false;
  state.selectedLog = null;
  render();
};

window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
