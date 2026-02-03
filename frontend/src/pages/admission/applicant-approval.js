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
  applicants: [],
  // Modal State
  showIdAssignmentModal: false,
  selectedApplicantForId: null,
  suggestedIdNumber: '',
  idNumberError: ''
};

async function init() {
  if (!requireAuth()) return;

  await loadData();
  render();
}

async function loadData() {
  try {
    const userResponse = await api.get(endpoints.me);
    if (userResponse) {
      state.user = userResponse;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user');
  }

  // Load pending applicants from real API
  try {
    const response = await api.get(`${endpoints.applicants}?status=PENDING`);
    const enrollments = response?.results || response || [];

    state.applicants = enrollments.map(enrollment => ({
      id: enrollment.id,
      student_number: enrollment.student_number,
      first_name: enrollment.first_name || 'Unknown',
      last_name: enrollment.last_name || 'Student',
      email: enrollment.email,
      program: enrollment.program || { code: 'N/A', name: 'Program' },
      status: enrollment.status,
      created_at: enrollment.created_at,
      documents_verified: enrollment.documents?.filter(d => d.status === 'VERIFIED').length || 0,
      documents_total: enrollment.documents?.length || 0
    }));

    console.log(`Loaded ${state.applicants.length} pending applicants`);
  } catch (error) {
    ErrorHandler.handle(error, 'Loading pending applicants');
    state.applicants = [];
  }

  state.loading = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading applicants...');
    return;
  }

  const pendingCount = state.applicants.filter(a => a.status === 'PENDING').length;

  app.innerHTML = `
    ${createHeader({
    role: 'ADMISSION',
    activePage: 'applicant-approval',
    user: state.user
  })}
    
    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Applicant Approval</h1>
          <p class="text-gray-600 mt-1">Review and approve pending student applications</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            ${pendingCount} Pending
          </span>
        </div>
      </div>
      
      <!-- Info Banner -->
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div>
          <p class="font-medium text-blue-800">Approval Instructions</p>
          <p class="text-sm text-blue-700 mt-1">Accepted students will be able to login to the portal. Rejected students will be notified and cannot login.</p>
        </div>
      </div>
      
      <!-- Applicants List -->
      <div class="space-y-4">
        ${state.applicants.length === 0 ? `
          <div class="card text-center py-12">
            <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-gray-500">No pending applicants</p>
          </div>
        ` : state.applicants.map(applicant => renderApplicantCard(applicant)).join('')}
      </div>
    </main>

    <!-- Modal -->
    ${state.showIdAssignmentModal ? renderIdAssignmentModal() : ''}
  `;
}

function renderApplicantCard(applicant) {
  const isPending = applicant.status === 'PENDING';
  const docsComplete = applicant.documents_verified === applicant.documents_total;

  return `
    <div class="card border-l-4 ${isPending ? 'border-l-yellow-400' : applicant.status === 'ACTIVE' ? 'border-l-green-400' : 'border-l-red-400'}">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Applicant Info -->
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
            ${(applicant.first_name || 'U')[0]}${(applicant.last_name || 'N')[0]}
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">${applicant.first_name} ${applicant.last_name}</h3>
            <p class="text-sm text-gray-500">${applicant.student_number} • ${applicant.email}</p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-sm font-medium text-blue-600">${applicant.program.code}</span>
              <span class="text-xs px-2 py-0.5 rounded-full ${docsComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                Docs: ${applicant.documents_verified}/${applicant.documents_total}
              </span>
              <span class="badge ${applicant.status === 'PENDING' ? 'badge-warning' : applicant.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}">
                ${applicant.status}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-3">
          ${isPending ? `
            <button onclick="openIdAssignmentModal('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-green-600/25">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Accept
            </button>
            <button onclick="rejectApplicant('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Reject
            </button>
          ` : applicant.status === 'ACTIVE' ? `
            <span class="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Approved
            </span>
          ` : `
            <span class="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Rejected
            </span>
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
              <p><strong>Password:</strong> richwell123 (default)</p>
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Global functions
window.openIdAssignmentModal = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id === applicantId);
  if (!applicant) return;

  state.selectedApplicantForId = applicant;
  state.idNumberError = '';

  // Auto-generate suggested ID
  try {
    const response = await api.get(endpoints.nextStudentNumber);
    state.suggestedIdNumber = response?.next_student_number || `2026-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
  } catch {
    state.suggestedIdNumber = `2026-${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
  }

  state.showIdAssignmentModal = true;
  render();

  setTimeout(() => {
    const input = document.getElementById('id-number-input');
    if (input) input.focus();
  }, 100);
}

window.closeIdAssignmentModal = function (event) {
  if (event && event.target !== event.currentTarget) return;
  state.showIdAssignmentModal = false;
  state.selectedApplicantForId = null;
  render();
}

window.handleIdNumberInput = function (event) {
  state.suggestedIdNumber = event.target.value;
  state.idNumberError = '';
}

window.submitIdAssignment = async function () {
  const idNumber = state.suggestedIdNumber.trim();
  const applicant = state.selectedApplicantForId;
  if (!applicant || !idNumber) {
    state.idNumberError = 'Student ID is required';
    render();
    return;
  }

  Toast.info(`Approving ${applicant.first_name}...`);

  try {
    const response = await api.patch(endpoints.applicantUpdate(applicant.id), {
      action: 'accept',
      student_number: idNumber
    });

    if (response && (response.success || response.data)) {
      Toast.success(`${applicant.first_name} approved! ID: ${idNumber}`);

      // Update UI
      applicant.status = 'ACTIVE';
      applicant.student_number = idNumber;
      state.showIdAssignmentModal = false;
      render();
    } else if (response && response.error) {
      state.idNumberError = response.error;
      render();
    } else {
      throw new Error('Approval failed');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Approving applicant');
  }
}

window.rejectApplicant = async function (applicantId) {
  const applicant = state.applicants.find(a => a.id === applicantId);
  if (!applicant) return;

  if (!confirm(`Are you sure you want to reject ${applicant.first_name} ${applicant.last_name}?`)) return;

  Toast.info(`Rejecting ${applicant.first_name}...`);

  try {
    const response = await api.patch(endpoints.applicantUpdate(applicantId), {
      action: 'reject'
    });

    if (response && (response.success || response.data)) {
      Toast.warning(`${applicant.first_name} has been rejected.`);
      applicant.status = 'REJECTED';
      render();
    } else if (response && response.error) {
      Toast.error(response.error);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Rejecting applicant');
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/pages/auth/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
