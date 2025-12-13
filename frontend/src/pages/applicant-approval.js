import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';

// State
const state = {
    user: null,
    loading: true,
    applicants: []
};

// Mock pending applicants
const mockApplicants = [
    {
        id: 1,
        student_number: '2025-00001',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        email: 'jdelacruz@richwell.edu.ph',
        program: { code: 'BSIT', name: 'BS Information Technology' },
        status: 'PENDING',
        created_at: '2024-12-10T10:30:00Z',
        documents_verified: 2,
        documents_total: 3
    },
    {
        id: 2,
        student_number: '2025-00002',
        first_name: 'Maria',
        last_name: 'Santos',
        email: 'msantos@richwell.edu.ph',
        program: { code: 'BSCS', name: 'BS Computer Science' },
        status: 'PENDING',
        created_at: '2024-12-11T14:20:00Z',
        documents_verified: 3,
        documents_total: 3
    },
    {
        id: 3,
        student_number: '2025-00003',
        first_name: 'Pedro',
        last_name: 'Reyes',
        email: 'preyes@richwell.edu.ph',
        program: { code: 'BSBA', name: 'BS Business Administration' },
        status: 'PENDING',
        created_at: '2024-12-12T09:15:00Z',
        documents_verified: 1,
        documents_total: 2
    },
    {
        id: 4,
        student_number: '2025-00004',
        first_name: 'Ana',
        last_name: 'Garcia',
        email: 'agarcia@richwell.edu.ph',
        program: { code: 'BSIT', name: 'BS Information Technology' },
        status: 'PENDING',
        created_at: '2024-12-13T08:00:00Z',
        documents_verified: 2,
        documents_total: 2
    }
];

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
        console.error('Failed to load user:', error);
    }

    // Load pending applicants (mock for now)
    state.applicants = mockApplicants;
    state.loading = false;
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = renderLoading();
        return;
    }

    const pendingCount = state.applicants.filter(a => a.status === 'PENDING').length;

    app.innerHTML = `
    ${renderHeader()}
    
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

function renderHeader() {
    return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2">Approval</span>
          </div>
        </div>
        
        <nav class="hidden md:flex items-center gap-6">
          <a href="/curriculum.html" class="text-gray-600 hover:text-gray-900">Curriculum</a>
          <a href="/admission-dashboard.html" class="text-gray-600 hover:text-gray-900">Admissions</a>
          <a href="/applicant-approval.html" class="text-blue-600 font-medium">Approval</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">${state.user?.first_name || 'Staff'} ${state.user?.last_name || 'User'}</p>
            <p class="text-xs text-gray-500">${state.user?.role || 'Staff'}</p>
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
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
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

    showToast(`Approving ${applicant.first_name} ${applicant.last_name}...`, 'info');

    // Simulate API call
    setTimeout(() => {
        applicant.status = 'ACTIVE';
        showToast(`${applicant.first_name} ${applicant.last_name} has been approved! They can now login.`, 'success');
        render();
    }, 500);
};

window.rejectApplicant = async function (applicantId) {
    const applicant = state.applicants.find(a => a.id === applicantId);
    if (!applicant) return;

    if (!confirm(`Are you sure you want to reject ${applicant.first_name} ${applicant.last_name}?`)) return;

    showToast(`Rejecting ${applicant.first_name}...`, 'info');

    // Simulate API call
    setTimeout(() => {
        applicant.status = 'REJECTED';
        showToast(`${applicant.first_name} ${applicant.last_name} has been rejected.`, 'warning');
        render();
    }, 500);
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
