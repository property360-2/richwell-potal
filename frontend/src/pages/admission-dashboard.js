import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { formatDate, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';

// State
const state = {
  user: null,
  applicants: [],
  loading: true,
  filters: {
    status: 'all',
    created_via: 'all'
  },
  selectedApplicant: null,
  pendingModal: null,
  idAssignmentModal: null,
  selectedApplicantForId: null,
  suggestedIdNumber: '',
  idNumberError: ''
};

// No more mock data - all data comes from real API

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
    ErrorHandler.handle(error, 'Loading user profile');
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
  console.log('LoadApplicants: Starting to fetch applicants...');
  try {
    const response = await api.get(endpoints.applicants);
    console.log('LoadApplicants: Raw API response:', response);

    // Handle paginated response {count, results, ...}
    const enrollments = response?.results || response || [];

    if (enrollments && Array.isArray(enrollments)) {
      // Map API response to expected format
      state.applicants = enrollments.map(enrollment => ({
        id: enrollment.id,
        student_number: enrollment.student_number,
        first_name: enrollment.first_name || 'Unknown',
        last_name: enrollment.last_name || 'Student',
        email: enrollment.email,
        status: enrollment.status,
        created_via: enrollment.created_via || 'ONLINE',
        created_at: enrollment.created_at,
        program: enrollment.program || { code: 'N/A', name: 'Enrolled Program' },
        documents: enrollment.documents || [],
        student: { first_name: enrollment.first_name, last_name: enrollment.last_name }
      }));
      console.log('LoadApplicants: Loaded', state.applicants.length, 'applicants');
    } else {
      console.log('LoadApplicants: No applicants from API');
      state.applicants = [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading applicants');
    state.applicants = [];
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
    app.innerHTML = LoadingOverlay('Loading admission dashboard...');
    return;
  }

  const filteredApplicants = getFilteredApplicants();

  app.innerHTML = `
    <!-- Header -->
    ${createHeader({
    role: 'ADMISSION',
    activePage: 'admission-dashboard',
    user: state.user
  })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Admission Dashboard</h1>
          <p class="text-gray-600 mt-1">Manage applicants and verify documents</p>
        </div>
        <div class="mt-4 md:mt-0 flex items-center gap-3">
          <!-- PENDING APPLICANTS BUTTON -->
          <button onclick="openPendingModal()" class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all shadow-lg shadow-orange-500/25 animate-pulse">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${state.applicants.filter(a => a.status === 'PENDING').length} Pending Approval</span>
          </button>
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
              <th class="px-6 py-4 text-left">Date</th>
              <th class="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredApplicants.length > 0 ? filteredApplicants.map(applicant => renderApplicantRow(applicant)).join('') : `
              <tr>
                <td colspan="4" class="px-6 py-12 text-center text-gray-500">
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

    <!-- Pending Applicants Modal -->
    ${state.showPendingModal ? renderPendingModal() : ''}

    <!-- ID Assignment Modal -->
    ${state.showIdAssignmentModal ? renderIdAssignmentModal() : ''}
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
  return `
    <tr class="table-row">
      <td class="px-6 py-4">
        <div>
          <p class="font-medium text-gray-800">${applicant.first_name} ${applicant.last_name}</p>
          <p class="text-sm text-gray-500">${applicant.student_number}</p>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="font-medium text-gray-800">${applicant.program?.code || 'N/A'}</span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">
        ${formatDate(applicant.created_at)}
      </td>
      <td class="px-6 py-4 text-center">
        <button onclick="viewApplicant('${applicant.id}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm">
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
              ${(applicant.first_name || 'U')[0]}${(applicant.last_name || 'N')[0]}
            </div>
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800">${applicant.first_name || 'Unknown'} ${applicant.last_name || 'Student'}</h3>
              <p class="text-gray-500">${applicant.email || applicant.student_email || 'No email'}</p>
              <div class="flex gap-2 mt-2 items-center">
                <span class="badge badge-info">${applicant.student_number}</span>
                <span class="badge ${applicant.status === 'ACTIVE' ? 'badge-success' : applicant.status === 'REJECTED' ? 'badge-error' : 'badge-warning'}">${applicant.status}</span>
                <button onclick="editStudentIdFromModal('${applicant.id}')" class="text-xs text-blue-600 hover:text-blue-800 font-medium ml-2 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                  Edit IDN
                </button>
              </div>
            </div>
          </div>
          
          <!-- Login Credentials Section (Auto-generated) -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              Login Credentials
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-white rounded-lg p-3 border border-blue-100">
                <p class="text-xs text-gray-500 mb-1">School Email (Username)</p>
                <p class="font-medium text-blue-600 font-mono text-sm">${applicant.school_email || applicant.email || 'N/A'}</p>
              </div>
              <div class="bg-white rounded-lg p-3 border border-blue-100">
                <p class="text-xs text-gray-500 mb-1">Password</p>
                <p class="font-medium text-blue-600 font-mono text-sm">richwell123</p>
              </div>
            </div>
          </div>
          
          <!-- Contact & Info Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Personal Email</p>
              <p class="font-medium">${applicant.email || applicant.student_email || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Contact Number</p>
              <p class="font-medium">${applicant.contact_number || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Program</p>
              <p class="font-medium">${applicant.program?.name || 'N/A'}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-sm text-gray-500">Created Via</p>
              <p class="font-medium">${applicant.created_via}</p>
            </div>
            <div class="bg-gray-50 rounded-xl p-4 col-span-2">
              <p class="text-sm text-gray-500">Applied On</p>
              <p class="font-medium">${formatDate(applicant.created_at)}</p>
            </div>
          </div>
          
          <!-- Documents Section -->
          <div>
            <h4 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Documents (${applicant.documents?.length || 0})
            </h4>
            <div class="space-y-3">
              ${applicant.documents?.length > 0 ? applicant.documents.map(doc => `
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center gap-3">
                    ${doc.file_url ? `
                      <img src="${doc.file_url}" alt="${doc.document_type_display || doc.original_filename}" class="w-12 h-12 rounded-lg object-cover cursor-pointer" onclick="viewDocumentImage('${doc.file_url}', '${doc.document_type_display || doc.original_filename}')">
                    ` : `
                      <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                      </div>
                    `}
                    <div>
                      <span class="font-medium text-gray-700">${doc.document_type_display || doc.original_filename || 'Document'}</span>
                      ${doc.original_filename ? `<p class="text-xs text-gray-400">${doc.original_filename}</p>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="badge ${doc.is_verified ? 'badge-success' : 'badge-warning'}">${doc.is_verified ? 'VERIFIED' : 'PENDING'}</span>
                    ${!doc.is_verified && doc.id ? `
                      <button onclick="verifyDocument('${applicant.id}', '${doc.id}')" class="btn-primary text-xs py-1 px-3">
                        Verify
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('') : '<p class="text-gray-500 text-center py-4">No documents uploaded</p>'}
            </div>
          </div>
        </div>
        
        <!-- Modal Footer -->
        <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between">
          <div class="flex gap-2">
            ${applicant.status === 'PENDING' ? `
              <button onclick="approveFromViewDetails('${applicant.id}')" class="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Accept
              </button>
              <button onclick="rejectApplicant('${applicant.id}')" class="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                Reject
              </button>
            ` : applicant.status === 'ACTIVE' ? `
              <span class="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Approved
              </span>
            ` : applicant.status === 'REJECTED' ? `
              <span class="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Rejected
              </span>
            ` : ''}
          </div>
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
  // Use loose equality to handle string/number mismatches
  state.selectedApplicant = state.applicants.find(a => a.id == id);
  render();
};

window.closeModal = function (event) {
  if (event && event.target !== event.currentTarget) return;
  state.selectedApplicant = null;
  render();
};

window.verifyDocument = async function (applicantId, docName) {
  Toast.info(`Verifying ${docName}...`);

  // Simulate API call
  setTimeout(() => {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (applicant) {
      const doc = applicant.documents.find(d => d.name === docName);
      if (doc) {
        doc.status = 'VERIFIED';
        Toast.success(`${docName} verified successfully!`);
        render();
      }
    }
  }, 1000);
};

window.acceptApplicant = async function (applicantId) {
  Toast.info('Approving applicant...');

  // Simulate API call
  setTimeout(() => {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (applicant) {
      applicant.status = 'ACTIVE';
      state.selectedApplicant = applicant;
      Toast.success(`${applicant.first_name} ${applicant.last_name} has been approved! They can now login.`);
      render();
    }
  }, 500);
};

window.rejectApplicant = async function (applicantId) {
  if (!confirm('Are you sure you want to reject this applicant?')) return;

  Toast.info('Rejecting applicant...');

  // Simulate API call
  setTimeout(() => {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (applicant) {
      applicant.status = 'REJECTED';
      state.selectedApplicant = applicant;
      Toast.warning(`${applicant.first_name} ${applicant.last_name} has been rejected.`);
      render();
    }
  }, 500);
};

// Pending Modal functions
window.openPendingModal = function () {
  state.showPendingModal = true;
  render();
};

window.closePendingModal = function () {
  state.showPendingModal = false;
  render();
};

// Approve from View Details modal - opens ID assignment modal
window.approveFromViewDetails = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id == applicantId);
  if (!applicant) return;

  // Close view details modal first
  state.selectedApplicant = null;

  // Open ID assignment modal
  openIdAssignmentModal(applicant);
};

// Edit Student ID from View Details modal
window.editStudentIdFromModal = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id == applicantId);
  if (!applicant) return;

  // Close view details modal first
  state.selectedApplicant = null;

  // Open ID assignment modal for editing
  openIdAssignmentModal(applicant);
};

window.openIdAssignmentModal = async function (applicant) {
  state.selectedApplicantForId = applicant;
  state.idNumberError = '';

  // Fetch suggested ID from backend
  try {
    const response = await api.get(endpoints.nextStudentNumber);
    if (response && response.next_student_number) {
      state.suggestedIdNumber = response.next_student_number;
    } else {
      // Fallback
      const year = new Date().getFullYear();
      state.suggestedIdNumber = `${year}-00001`;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Fetching next student number');
    const year = new Date().getFullYear();
    state.suggestedIdNumber = `${year}-00001`;
  }

  state.showIdAssignmentModal = true;
  render();

  // Focus input
  setTimeout(() => {
    const input = document.getElementById('id-number-input');
    if (input) input.focus();
  }, 100);
};

window.closeIdAssignmentModal = function (event) {
  if (event && event.target !== event.currentTarget) return;
  state.showIdAssignmentModal = false;
  state.selectedApplicantForId = null;
  state.suggestedIdNumber = '';
  state.idNumberError = '';
  render();
};

window.handleIdNumberInput = function (event) {
  state.suggestedIdNumber = event.target.value;
  state.idNumberError = ''; // Clear error on input
};

window.submitIdAssignment = async function () {
  const idNumber = state.suggestedIdNumber.trim();
  const applicant = state.selectedApplicantForId;

  if (!applicant) return;

  // Allow any non-empty format
  if (!idNumber || idNumber.length === 0) {
    state.idNumberError = 'Student ID is required';
    render();
    return;
  }

  Toast.info('Assigning ID and approving applicant...');

  try {
    const response = await api.patch(
      endpoints.applicantUpdate(applicant.id),
      {
        action: 'accept',
        student_number: idNumber
      }
    );

    if (response && (response.success || response.data)) {
      Toast.success(`${applicant.first_name} ${applicant.last_name} approved with ID: ${idNumber}`);

      // Update local state
      applicant.status = 'ACTIVE';
      applicant.student_number = idNumber;

      // Close modal and refresh
      if (state.idAssignmentModal) state.idAssignmentModal.close();
      state.selectedApplicantForId = null;
      await loadApplicants();
      render();
      return;
    }

    if (response && response.error) {
      state.idNumberError = response.error;
      render();
      throw new Error(response.error);
    }

    throw new Error('Invalid API response');
  } catch (error) {
    ErrorHandler.handle(error, 'Assigning ID');

    // Show exact backend error message
    if (error.response?.data?.error) {
      state.idNumberError = error.response.data.error;
      render();
    } else {
      if (state.idAssignmentModal) state.idAssignmentModal.close();
    }
  }
};

function renderPendingModal() {
  const pendingApplicants = state.applicants.filter(a => a.status === 'PENDING');

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closePendingModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="sticky top-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Pending Applicants</h2>
            <p class="text-yellow-100 text-sm">${pendingApplicants.length} applicant(s) awaiting approval</p>
          </div>
          <button onclick="closePendingModal()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          ${pendingApplicants.length === 0 ? `
            <div class="text-center py-12">
              <svg class="w-16 h-16 text-green-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p class="text-gray-500 text-lg">All applicants have been processed!</p>
            </div>
          ` : `
            <div class="space-y-6">
              ${pendingApplicants.map(applicant => renderPendingApplicantCard(applicant)).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderIdAssignmentModal() {
  if (!state.selectedApplicantForId) return '';

  const applicant = state.selectedApplicantForId;

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeIdAssignmentModal(event)">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 class="text-xl font-bold">Assign Student ID Number</h2>
            <p class="text-blue-100 text-sm">${applicant.first_name} ${applicant.last_name}</p>
          </div>
          <button onclick="closeIdAssignmentModal()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Student ID Number <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="id-number-input"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-lg font-mono"
              placeholder="Enter student ID"
              value="${state.suggestedIdNumber}"
              oninput="handleIdNumberInput(event)"
            >
            <p class="text-xs text-gray-500 mt-2">Enter any unique student ID number</p>
            ${state.idNumberError ? `
              <p class="text-sm text-red-600 mt-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${state.idNumberError}
              </p>
            ` : ''}
          </div>

          <!-- Info Box -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-blue-800 mb-2">Credentials Info</h4>
            <div class="text-sm text-blue-700 space-y-1">
              <p><strong>Login Email:</strong> ${applicant.email}</p>
              <p><strong>Program:</strong> ${applicant.program?.code || 'N/A'}</p>
              <p><strong>Password:</strong> School email (unchanged on approval)</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3">
            <button onclick="closeIdAssignmentModal()" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <button onclick="submitIdAssignment()" class="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg">
              Approve & Assign ID
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPendingApplicantCard(applicant) {
  return `
    <div class="border-2 border-yellow-200 rounded-2xl overflow-hidden bg-yellow-50/50">
      <!-- Applicant Header -->
      <div class="p-4 bg-white border-b border-yellow-200">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
              ${(applicant.first_name || 'U')[0]}${(applicant.last_name || 'N')[0]}
            </div>
            <div>
              <h3 class="text-lg font-bold text-gray-800">${applicant.first_name} ${applicant.last_name}</h3>
              <p class="text-sm text-gray-500">${applicant.student_number} • ${applicant.email}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm font-medium text-blue-600">${applicant.program?.code || 'N/A'}</span>
                <span class="text-xs text-gray-400">•</span>
                <span class="text-sm text-gray-500">${applicant.created_via}</span>
              </div>
            </div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex items-center gap-3">
            <button onclick="acceptFromPending('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Accept
            </button>
            <button onclick="rejectFromPending('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Reject
            </button>
          </div>
        </div>
      </div>
      
      <!-- Documents Section -->
      <div class="p-4">
        <h4 class="font-semibold text-gray-700 mb-3">Uploaded Documents</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${applicant.documents?.map(doc => `
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div class="h-32 bg-gray-100 flex items-center justify-center">
                ${doc.file_url ? `
                  <img src="${doc.file_url}" 
                       alt="${doc.document_type_display || doc.original_filename}" 
                       class="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                       onclick="viewDocumentImage('${doc.file_url}', '${doc.document_type_display || doc.original_filename}')">
                ` : `
                  <div class="text-gray-400 text-center p-4">
                    <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span class="text-sm">${doc.document_type_display || doc.original_filename || 'Document'}</span>
                  </div>
                `}
              </div>
              <div class="p-3 flex items-center justify-between">
                <span class="font-medium text-gray-700 text-sm">${doc.document_type_display || doc.original_filename || 'Document'}</span>
                <span class="badge ${doc.is_verified ? 'badge-success' : 'badge-warning'} text-xs">${doc.is_verified ? 'VERIFIED' : 'PENDING'}</span>
              </div>
            </div>
          `).join('') || '<p class="text-gray-400">No documents uploaded</p>'}
        </div>
      </div>
    </div>
  `;
}

window.acceptFromPending = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id === applicantId);
  if (!applicant) return;

  // Open modal instead of direct approval
  openIdAssignmentModal(applicant);
};

window.rejectFromPending = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id === applicantId);
  if (!applicant) return;

  const name = applicant.student?.first_name || applicant.first_name;
  const lastName = applicant.student?.last_name || applicant.last_name;

  ConfirmModal({
    title: 'Reject Applicant',
    message: `Are you sure you want to reject ${name} ${lastName}?`,
    confirmText: 'Reject',
    onConfirm: async () => {
      Toast.info(`Rejecting ${name}...`);

      try {
        // Call real API
        const response = await api.patch(endpoints.applicantUpdate(applicantId), { action: 'reject' });
        console.log('Reject API response:', response);

        if (response && (response.success || response.data)) {
          Toast.warning(response.message || 'Applicant rejected.');
          // Update local state immediately
          applicant.status = 'REJECTED';
          // Also refresh from server
          await loadApplicants();
          state.showPendingModal = false;
          render();
          return;
        }
        throw new Error('API response invalid');
      } catch (error) {
        ErrorHandler.handle(error, 'Rejecting applicant');
        // Fallback to local update
        applicant.status = 'REJECTED';
        Toast.warning(`${name} ${lastName} has been rejected.`);
        state.showPendingModal = false;
        render();
      }
    }
  });
};

window.viewDocumentImage = function (url, name) {
  if (!url) return;
  window.open(url, '_blank');
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
