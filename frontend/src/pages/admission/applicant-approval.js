import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { renderApplicantCard } from '../../molecules/index.js';
import { renderIdAssignmentModal } from '../../organisms/index.js';

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
    ${state.showIdAssignmentModal && state.selectedApplicantForId ? renderIdAssignmentModal({
    applicant: state.selectedApplicantForId,
    suggestedId: state.suggestedIdNumber,
    error: state.idNumberError
  }) : ''}
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

    if (response) {
      Toast.success(`${applicant.first_name} approved! ID: ${idNumber}`);

      // Update UI
      applicant.status = 'ACTIVE';
      applicant.student_number = idNumber;
      state.showIdAssignmentModal = false;
      render();
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

    if (response) {
      Toast.warning(`${applicant.first_name} has been rejected.`);
      applicant.status = 'REJECTED';
      render();
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
