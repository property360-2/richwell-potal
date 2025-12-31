import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

// State
const state = {
    user: null,
    loading: true,
    applicants: []
};

// No more mock data - all data comes from real API

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
            first_name: enrollment.student_name?.split(' ')[0] || 'Unknown',
            last_name: enrollment.student_name?.split(' ').slice(1).join(' ') || 'Student',
            email: enrollment.student_email,
            program: { code: enrollment.program_code || 'N/A', name: enrollment.program_name || 'Program' },
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
            ${applicant.first_name[0]}${applicant.last_name[0]}
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
            <button onclick="acceptApplicant(${applicant.id})" 
                    class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-green-600/25">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Accept
            </button>
            <button onclick="rejectApplicant(${applicant.id})" 
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Global functions
window.acceptApplicant = async function (applicantId) {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (!applicant) return;

    Toast.info(`Approving ${applicant.first_name} ${applicant.last_name}...`);

    // Simulate API call
    setTimeout(() => {
        applicant.status = 'ACTIVE';
        Toast.success(`${applicant.first_name} ${applicant.last_name} has been approved! They can now login.`);
        render();
    }, 500);
};

window.rejectApplicant = async function (applicantId) {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (!applicant) return;

    if (!confirm(`Are you sure you want to reject ${applicant.first_name} ${applicant.last_name}?`)) return;

    Toast.info(`Rejecting ${applicant.first_name}...`);

    // Simulate API call
    setTimeout(() => {
        applicant.status = 'REJECTED';
        Toast.warning(`${applicant.first_name} ${applicant.last_name} has been rejected.`);
        render();
    }, 500);
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
