import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, formatDate, requireAuth } from '../utils.js';

// State
const state = {
  user: null,
  applicants: [],
  loading: true,
  filters: {
    status: 'all',
    created_via: 'all'
  },
  selectedApplicant: null
};

// Mock data for development
const mockApplicants = [
  { id: 1, student_number: '2025-00001', first_name: 'Juan', last_name: 'Dela Cruz', email: 'juan@example.com', status: 'ACTIVE', created_via: 'ONLINE', created_at: '2024-12-01T10:30:00Z', program: { code: 'BSIT', name: 'BS Information Technology' }, documents: [{ name: 'Valid ID', status: 'PENDING' }, { name: 'Form 138', status: 'VERIFIED' }] },
  { id: 2, student_number: '2025-00002', first_name: 'Maria', last_name: 'Santos', email: 'maria@example.com', status: 'ACTIVE', created_via: 'ONLINE', created_at: '2024-12-02T14:20:00Z', program: { code: 'BSCS', name: 'BS Computer Science' }, documents: [{ name: 'Valid ID', status: 'VERIFIED' }, { name: 'Form 138', status: 'VERIFIED' }] },
  { id: 3, student_number: '2025-00003', first_name: 'Pedro', last_name: 'Reyes', email: 'pedro@example.com', status: 'PENDING', created_via: 'TRANSFEREE', created_at: '2024-12-03T09:15:00Z', program: { code: 'BSBA', name: 'BS Business Administration' }, documents: [{ name: 'Valid ID', status: 'PENDING' }, { name: 'TOR', status: 'PENDING' }] },
  { id: 4, student_number: '2025-00004', first_name: 'Ana', last_name: 'Garcia', email: 'ana@example.com', status: 'ACTIVE', created_via: 'ONLINE', created_at: '2024-12-04T16:45:00Z', program: { code: 'BSIT', name: 'BS Information Technology' }, documents: [{ name: 'Valid ID', status: 'VERIFIED' }, { name: 'Form 138', status: 'PENDING' }] },
  { id: 5, student_number: '2025-00005', first_name: 'Jose', last_name: 'Cruz', email: 'jose@example.com', status: 'ACTIVE', created_via: 'ONLINE', created_at: '2024-12-05T11:00:00Z', program: { code: 'BSCS', name: 'BS Computer Science' }, documents: [{ name: 'Valid ID', status: 'VERIFIED' }, { name: 'Form 138', status: 'VERIFIED' }, { name: 'Good Moral', status: 'VERIFIED' }] }
];

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadApplicants();
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
    console.error('Failed to load profile:', error);
    // Fallback to localStorage
    const savedUser = TokenManager.getUser();
    if (savedUser) {
      state.user = savedUser;
    }
  }
}

// Format role for display
function formatRole(role) {
  const roleNames = {
    'ADMIN': 'Administrator',
    'REGISTRAR': 'Registrar',
    'HEAD_REGISTRAR': 'Head Registrar',
    'ADMISSION_STAFF': 'Admission Staff',
    'CASHIER': 'Cashier',
    'PROFESSOR': 'Professor',
    'STUDENT': 'Student'
  };
  return roleNames[role] || role;
}

async function loadApplicants() {
  try {
    const response = await api.get(endpoints.applicants);
    if (response && response.results) {
      state.applicants = response.results;
    } else {
      state.applicants = mockApplicants;
    }
  } catch (error) {
    console.log('Using mock data');
    state.applicants = mockApplicants;
  }
  state.loading = false;
}

function getFilteredApplicants() {
  return state.applicants.filter(a => {
    if (state.filters.status !== 'all' && a.status !== state.filters.status) return false;
    if (state.filters.created_via !== 'all' && a.created_via !== state.filters.created_via) return false;
    return true;
  });
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  const filteredApplicants = getFilteredApplicants();

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader()}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Admission Dashboard</h1>
          <p class="text-gray-600 mt-1">Manage applicants and verify documents</p>
        </div>
        <div class="mt-4 md:mt-0">
          <span class="badge badge-info text-sm py-2 px-4">${filteredApplicants.length} Applicant(s)</span>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        ${renderStatCard('Total Applicants', state.applicants.length, 'blue')}
        ${renderStatCard('Online', state.applicants.filter(a => a.created_via === 'ONLINE').length, 'green')}
        ${renderStatCard('Transferees', state.applicants.filter(a => a.created_via === 'TRANSFEREE').length, 'yellow')}
        ${renderStatCard('Pending Docs', state.applicants.filter(a => a.documents?.some(d => d.status === 'PENDING')).length, 'red')}
      </div>
      
      <!-- Filters -->
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select id="filter-status" class="form-input py-2" onchange="handleFilterChange()">
              <option value="all">All Status</option>
              <option value="ACTIVE" ${state.filters.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
              <option value="PENDING" ${state.filters.status === 'PENDING' ? 'selected' : ''}>Pending</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Created Via</label>
            <select id="filter-created-via" class="form-input py-2" onchange="handleFilterChange()">
              <option value="all">All Sources</option>
              <option value="ONLINE" ${state.filters.created_via === 'ONLINE' ? 'selected' : ''}>Online</option>
              <option value="TRANSFEREE" ${state.filters.created_via === 'TRANSFEREE' ? 'selected' : ''}>Transferee</option>
            </select>
          </div>
          <div class="flex items-end">
            <button onclick="resetFilters()" class="btn-secondary py-2 px-4">Reset Filters</button>
          </div>
        </div>
      </div>
      
      <!-- Applicants Table -->
      <div class="table-container">
        <table class="w-full">
          <thead>
            <tr class="table-header">
              <th class="px-6 py-4 text-left">Student</th>
              <th class="px-6 py-4 text-left">Program</th>
              <th class="px-6 py-4 text-left">Status</th>
              <th class="px-6 py-4 text-left">Source</th>
              <th class="px-6 py-4 text-left">Documents</th>
              <th class="px-6 py-4 text-left">Date</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredApplicants.length > 0 ? filteredApplicants.map(applicant => renderApplicantRow(applicant)).join('') : `
              <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                  <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                  </svg>
                  <p>No applicants found matching your filters</p>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </main>
    
    <!-- Applicant Detail Modal -->
    ${state.selectedApplicant ? renderApplicantModal(state.selectedApplicant) : ''}
  `;
}

function renderHeader() {
  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2">${formatRole(state.user?.role)}</span>
          </div>
        </div>
        
        <nav class="hidden md:flex items-center gap-6">
          <a href="/curriculum.html" class="text-gray-600 hover:text-gray-900">Curriculum</a>
          <a href="/sections.html" class="text-gray-600 hover:text-gray-900">Sections</a>
          <a href="/schedule.html" class="text-gray-600 hover:text-gray-900">Schedule</a>
          <a href="/admission-dashboard.html" class="text-blue-600 font-medium">Admissions</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">${state.user?.first_name || 'Staff'} ${state.user?.last_name || 'User'}</p>
            <p class="text-xs text-gray-500">${formatRole(state.user?.role)}</p>
          </div>
          <button onclick="logout()" class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-gray-600">Loading admission dashboard...</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, color) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  };

  return `
    <div class="card text-center">
      <p class="text-3xl font-bold ${colors[color].split(' ')[1]}">${value}</p>
      <p class="text-sm text-gray-500 mt-1">${label}</p>
    </div>
  `;
}

function renderApplicantRow(applicant) {
  const pendingDocs = applicant.documents?.filter(d => d.status === 'PENDING').length || 0;
  const verifiedDocs = applicant.documents?.filter(d => d.status === 'VERIFIED').length || 0;
  const totalDocs = applicant.documents?.length || 0;

  return `
    <tr class="table-row">
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${applicant.first_name[0]}${applicant.last_name[0]}
          </div>
          <div>
            <p class="font-medium text-gray-800">${applicant.first_name} ${applicant.last_name}</p>
            <p class="text-sm text-gray-500">${applicant.student_number}</p>
          </div>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="font-medium text-gray-800">${applicant.program?.code || 'N/A'}</span>
      </td>
      <td class="px-6 py-4">
        <span class="badge ${applicant.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${applicant.status}</span>
      </td>
      <td class="px-6 py-4">
        <span class="badge ${applicant.created_via === 'ONLINE' ? 'badge-info' : 'badge-warning'}">${applicant.created_via}</span>
      </td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-2">
          <div class="w-24 progress-bar">
            <div class="progress-bar-fill" style="width: ${totalDocs > 0 ? (verifiedDocs / totalDocs) * 100 : 0}%"></div>
          </div>
          <span class="text-sm text-gray-500">${verifiedDocs}/${totalDocs}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">
        ${formatDate(applicant.created_at)}
      </td>
      <td class="px-6 py-4 text-center">
        <button onclick="viewApplicant(${applicant.id})" class="text-blue-600 hover:text-blue-800 font-medium text-sm">
          View Details
        </button>
      </td>
    </tr>
  `;
}

function renderApplicantModal(applicant) {
  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Applicant Details</h2>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Profile Section -->
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              ${applicant.first_name[0]}${applicant.last_name[0]}
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-800">${applicant.first_name} ${applicant.last_name}</h3>
              <p class="text-gray-500">${applicant.email}</p>
              <div class="flex gap-2 mt-2">
                <span class="badge badge-info">${applicant.student_number}</span>
                <span class="badge ${applicant.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${applicant.status}</span>
              </div>
            </div>
          </div>
          
          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Program</p>
              <p class="font-medium">${applicant.program?.name || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Created Via</p>
              <p class="font-medium">${applicant.created_via}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Applied On</p>
              <p class="font-medium">${formatDate(applicant.created_at)}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Contact</p>
              <p class="font-medium">${applicant.contact_number || 'N/A'}</p>
            </div>
          </div>
          
          <!-- Documents Section -->
          <div>
            <h4 class="font-bold text-gray-800 mb-4">Documents</h4>
            <div class="space-y-3">
              ${applicant.documents?.map(doc => `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                    <span class="font-medium text-gray-700">${doc.name}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="badge ${doc.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}">${doc.status}</span>
                    ${doc.status === 'PENDING' ? `
                      <button onclick="verifyDocument(${applicant.id}, '${doc.name}')" class="btn-primary text-xs py-1 px-3">
                        Verify
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('') || '<p class="text-gray-500 text-center py-4">No documents uploaded</p>'}
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button onclick="closeModal()" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}

// Event handlers
window.handleFilterChange = function () {
  state.filters.status = document.getElementById('filter-status').value;
  state.filters.created_via = document.getElementById('filter-created-via').value;
  render();
};

window.resetFilters = function () {
  state.filters = { status: 'all', created_via: 'all' };
  render();
};

window.viewApplicant = function (id) {
  state.selectedApplicant = state.applicants.find(a => a.id === id);
  render();
};

window.closeModal = function (event) {
  if (event && event.target !== event.currentTarget) return;
  state.selectedApplicant = null;
  render();
};

window.verifyDocument = async function (applicantId, docName) {
  showToast(`Verifying ${docName}...`, 'info');

  // Simulate API call
  setTimeout(() => {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (applicant) {
      const doc = applicant.documents.find(d => d.name === docName);
      if (doc) {
        doc.status = 'VERIFIED';
        showToast(`${docName} verified successfully!`, 'success');
        render();
      }
    }
  }, 1000);
};

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
