import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { ConfirmModal } from '../components/Modal.js';

// State
const state = {
    user: null,
    loading: true,
    resolutions: [],
    filter: 'pending', // pending, approved, rejected, all
    selectedResolution: null,
    showDetailModal: false
};

async function init() {
    if (!requireAuth()) return;

    state.loading = true;
    render();

    await loadUserProfile();
    await loadResolutions();

    state.loading = false;
    render();
}

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            state.user = response.data || response;
            TokenManager.setUser(state.user);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile');
    }
}

async function loadResolutions() {
    try {
        let url = endpoints.gradeResolutions;
        if (state.filter === 'pending') {
            url = endpoints.pendingResolutions;
        } else if (state.filter !== 'all') {
            url = `${endpoints.gradeResolutions}?status=${state.filter}`;
        }
        const response = await api.get(url);
        state.resolutions = response?.results || response || [];
    } catch (error) {
        ErrorHandler.handle(error, 'Loading grade resolutions');
        state.resolutions = [];
    }
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading grade resolutions...');
        return;
    }

    app.innerHTML = `
    ${createHeader({
        role: state.user?.role || 'REGISTRAR',
        activePage: 'registrar-resolutions',
        user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Grade Resolution Requests</h1>
          <p class="text-gray-600 mt-1">Review and approve professor grade change requests</p>
        </div>
        <div class="mt-4 md:mt-0 flex items-center gap-3">
          <span class="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
            ${state.resolutions.filter(r => r.status === 'PENDING_REGISTRAR').length} Pending Review
          </span>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex gap-2 mb-6 border-b border-gray-200 pb-4">
        <button onclick="setFilter('pending')" 
          class="px-4 py-2 rounded-lg font-medium transition-colors ${state.filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
          Pending
        </button>
        <button onclick="setFilter('approved')" 
          class="px-4 py-2 rounded-lg font-medium transition-colors ${state.filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
          Approved
        </button>
        <button onclick="setFilter('rejected')" 
          class="px-4 py-2 rounded-lg font-medium transition-colors ${state.filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
          Rejected
        </button>
        <button onclick="setFilter('all')" 
          class="px-4 py-2 rounded-lg font-medium transition-colors ${state.filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">
          All
        </button>
      </div>

      <!-- Resolutions Table -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        ${state.resolutions.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Grade</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Proposed Grade</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Requested By</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${state.resolutions.map(resolution => renderResolutionRow(resolution)).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-center py-16">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-600">No resolutions found</h3>
            <p class="text-gray-400 mt-1">No grade change requests match your filter</p>
          </div>
        `}
      </div>
    </main>

    ${state.showDetailModal ? renderDetailModal() : ''}
  `;
}

function renderResolutionRow(resolution) {
    const statusColors = {
        'PENDING_REGISTRAR': 'bg-yellow-100 text-yellow-800',
        'PENDING_HEAD': 'bg-orange-100 text-orange-800',
        'APPROVED': 'bg-green-100 text-green-800',
        'REJECTED': 'bg-red-100 text-red-800'
    };

    return `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${resolution.student_name || 'N/A'}</div>
        <div class="text-sm text-gray-500">${resolution.student_number || ''}</div>
      </td>
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${resolution.subject_code || 'N/A'}</div>
        <div class="text-sm text-gray-500">${resolution.subject_title || ''}</div>
      </td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono font-bold">
          ${resolution.original_grade || 'N/A'}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono font-bold">
          ${resolution.requested_grade || 'N/A'}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-600">
        ${resolution.requested_by_name || 'Professor'}
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">
        ${resolution.created_at ? formatDate(resolution.created_at) : 'N/A'}
      </td>
      <td class="px-6 py-4">
        <span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[resolution.status] || 'bg-gray-100 text-gray-700'}">
          ${formatStatus(resolution.status)}
        </span>
      </td>
      <td class="px-6 py-4 text-center">
        ${resolution.status === 'PENDING_REGISTRAR' ? `
          <div class="flex items-center justify-center gap-2">
            <button onclick="approveResolution('${resolution.id}')" 
              class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors">
              Approve
            </button>
            <button onclick="rejectResolution('${resolution.id}')" 
              class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
              Reject
            </button>
          </div>
        ` : `
          <button onclick="viewDetails('${resolution.id}')" 
            class="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            View
          </button>
        `}
      </td>
    </tr>
  `;
}

function formatStatus(status) {
    const labels = {
        'PENDING_REGISTRAR': 'Pending Review',
        'PENDING_HEAD': 'Awaiting Head',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected'
    };
    return labels[status] || status;
}

function renderDetailModal() {
    const res = state.selectedResolution;
    if (!res) return '';

    return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeDetailModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Resolution Details</h2>
          <button onclick="closeDetailModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Student</label>
              <p class="font-medium text-gray-900">${res.student_name}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Subject</label>
              <p class="font-medium text-gray-900">${res.subject_code}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Original Grade</label>
              <p class="font-mono font-bold text-gray-700">${res.original_grade}</p>
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Proposed Grade</label>
              <p class="font-mono font-bold text-blue-600">${res.requested_grade}</p>
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-gray-500 uppercase">Reason</label>
            <p class="text-gray-700 mt-1">${res.reason || 'No reason provided'}</p>
          </div>
          ${res.attachment_url ? `
            <div>
              <label class="text-xs font-medium text-gray-500 uppercase">Attachment</label>
              <a href="${res.attachment_url}" target="_blank" class="block mt-1 text-blue-600 hover:underline">View Document</a>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Event Handlers
window.setFilter = async function (filter) {
    state.filter = filter;
    state.loading = true;
    render();
    await loadResolutions();
    state.loading = false;
    render();
};

window.approveResolution = async function (id) {
    ConfirmModal({
        title: 'Approve Grade Resolution',
        message: 'Are you sure you want to approve this grade change? This will forward it to the Program Head for final approval.',
        confirmText: 'Approve',
        confirmClass: 'bg-green-600 hover:bg-green-700',
        onConfirm: async () => {
            try {
                await api.post(endpoints.gradeResolutionApprove(id), {});
                Toast.success('Resolution approved and forwarded to Program Head');
                await loadResolutions();
                render();
            } catch (error) {
                ErrorHandler.handle(error, 'Approving resolution');
            }
        }
    });
};

window.rejectResolution = async function (id) {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason === null) return;

    try {
        await api.post(endpoints.gradeResolutionReject(id), { reason });
        Toast.success('Resolution rejected');
        await loadResolutions();
        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Rejecting resolution');
    }
};

window.viewDetails = function (id) {
    state.selectedResolution = state.resolutions.find(r => r.id === id);
    state.showDetailModal = true;
    render();
};

window.closeDetailModal = function () {
    state.showDetailModal = false;
    state.selectedResolution = null;
    render();
};

window.logout = function () {
    TokenManager.clearTokens();
    Toast.success('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
