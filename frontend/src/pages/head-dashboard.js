import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';
import { ConfirmModal } from '../components/Modal.js';

// State
const state = {
  user: null,
  loading: true,
  pendingEnrollments: [],
  approvedEnrollments: [],
  filters: {
    status: 'PENDING_PAYMENT',
    search: ''
  },
  selectedEnrollment: null,
  approvalModal: null
};

// No more mock data - all data comes from real API

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadPendingEnrollments();
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
    const savedUser = TokenManager.getUser();
    if (savedUser) {
      state.user = savedUser;
    }
  }
}

async function loadPendingEnrollments() {
  try {
    const response = await api.get(endpoints.headPendingEnrollments);
    console.log('Pending enrollments response:', response);

    if (response?.results) {
      // Group by student for display
      const groupedByStudent = {};

      for (const se of response.results) {
        const studentKey = se.student_id;

        if (!groupedByStudent[studentKey]) {
          groupedByStudent[studentKey] = {
            id: studentKey,
            student_name: se.student_name,
            student_number: se.student_number,
            program: se.program_code,
            year_level: se.year_level,
            subjects: [],
            total_units: 0,
            payment_status: se.is_month1_paid ? 'Paid' : 'Pending Payment',
            enrolled_at: se.created_at
          };
        }

        groupedByStudent[studentKey].subjects.push({
          id: se.id,
          code: se.subject_code,
          name: se.subject_name,
          units: se.subject_units,
          section: se.section_name,
          schedule: 'TBD',  // Schedule not in API yet
          status: 'PENDING_HEAD'
        });

        groupedByStudent[studentKey].total_units += se.subject_units;
      }

      state.pendingEnrollments = Object.values(groupedByStudent);
      console.log('Grouped enrollments:', state.pendingEnrollments);
    } else {
      state.pendingEnrollments = [];
      console.warn('No pending enrollments found');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading pending enrollments');
    state.pendingEnrollments = [];
  }
  state.loading = false;
}

function getFilteredEnrollments() {
  let filtered = state.pendingEnrollments;

  if (state.filters.search) {
    const search = state.filters.search.toLowerCase();
    filtered = filtered.filter(e =>
      e.student_name.toLowerCase().includes(search) ||
      e.student_number.toLowerCase().includes(search) ||
      e.program.toLowerCase().includes(search)
    );
  }

  return filtered;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading dashboard...');
    return;
  }

  const filteredEnrollments = getFilteredEnrollments();
  const pendingCount = state.pendingEnrollments.length;

  app.innerHTML = `
    ${createHeader({
      role: 'DEPARTMENT_HEAD',
      activePage: 'head-dashboard',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Head Dashboard</h1>
          <p class="text-gray-600 mt-1">Review and approve student subject enrollments</p>
        </div>
        <div class="mt-4 md:mt-0 flex items-center gap-3">
          ${pendingCount > 0 ? `
            <span class="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-medium animate-pulse">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              ${pendingCount} Pending Approval
            </span>
          ` : `
            <span class="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-medium">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              All Caught Up!
            </span>
          `}
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        ${renderStatCard('Pending Approval', pendingCount, 'yellow', 'clock')}
        ${renderStatCard('Total Subjects', state.pendingEnrollments.reduce((sum, e) => sum + e.subjects.length, 0), 'blue', 'book')}
        ${renderStatCard('Total Units', state.pendingEnrollments.reduce((sum, e) => sum + e.total_units, 0), 'indigo', 'academic')}
        ${renderStatCard('Students', state.pendingEnrollments.length, 'green', 'users')}
      </div>
      
      <!-- Search Bar -->
      <div class="card mb-6">
        <div class="flex flex-col md:flex-row gap-4">
          <div class="flex-1">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input type="text" 
                     id="searchInput"
                     placeholder="Search by student name, number, or program..." 
                     value="${state.filters.search}"
                     onkeyup="handleSearch(event)"
                     class="form-input pl-10">
            </div>
          </div>
          <button onclick="approveAll()" class="btn-primary flex items-center gap-2" ${pendingCount === 0 ? 'disabled' : ''}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Approve All (${pendingCount})
          </button>
        </div>
      </div>
      
      <!-- Pending Enrollments List -->
      <div class="space-y-4">
        ${filteredEnrollments.length > 0 ? filteredEnrollments.map(enrollment => renderEnrollmentCard(enrollment)).join('') : `
          <div class="card text-center py-16">
            <svg class="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No Pending Enrollments</h3>
            <p class="text-gray-500">All subject enrollments have been processed.</p>
          </div>
        `}
      </div>
    </main>
  `;
}

function renderStatCard(label, value, color, icon) {
  const colors = {
    yellow: 'from-yellow-400 to-orange-500',
    blue: 'from-blue-400 to-blue-600',
    indigo: 'from-indigo-400 to-purple-600',
    green: 'from-green-400 to-emerald-600'
  };

  const icons = {
    clock: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>`,
    book: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>`,
    academic: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path>`,
    users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>`
  };

  return `
    <div class="card relative overflow-hidden">
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center shadow-lg">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icons[icon]}
          </svg>
        </div>
        <div>
          <p class="text-3xl font-bold text-gray-800">${value}</p>
          <p class="text-sm text-gray-500">${label}</p>
        </div>
      </div>
    </div>
  `;
}

function renderEnrollmentCard(enrollment) {
  return `
    <div class="card hover:shadow-xl transition-shadow">
      <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <!-- Student Info -->
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            ${enrollment.student_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">${enrollment.student_name}</h3>
            <p class="text-sm text-gray-500">${enrollment.student_number} • ${enrollment.program} - Year ${enrollment.year_level}</p>
            <div class="flex items-center gap-2 mt-2 flex-wrap">
              <span class="badge badge-info">${enrollment.subjects.length} Subjects</span>
              <span class="badge badge-success">${enrollment.total_units} Units</span>
              ${enrollment.payment_approved
                ? '<span class="badge badge-success text-xs">✓ Payment Complete</span>'
                : '<span class="badge badge-warning text-xs">⏳ Payment Pending</span>'}
            </div>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button onclick="viewDetails('${enrollment.id}')" class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
            View Details
          </button>
          <button onclick="approveEnrollment('${enrollment.id}')" class="btn-primary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Approve
          </button>
        </div>
      </div>
      
      <!-- Subjects Preview -->
      <div class="mt-4 pt-4 border-t border-gray-100">
        <p class="text-sm font-medium text-gray-600 mb-2">Enrolled Subjects:</p>
        <div class="flex flex-wrap gap-2">
          ${enrollment.subjects.map(subject => `
            <span class="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
              <span class="font-mono font-medium">${subject.code}</span>
              <span class="text-gray-400">•</span>
              <span>${subject.units}u</span>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function getApprovalContent(enrollment) {
  return `
    <!-- Student Info -->
    <div class="bg-gray-50 rounded-xl p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p class="text-xs text-gray-500">Program</p>
          <p class="font-medium">${enrollment.program}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Year Level</p>
          <p class="font-medium">Year ${enrollment.year_level}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Total Units</p>
          <p class="font-medium">${enrollment.total_units} units</p>
        </div>
        <div>
          <p class="text-xs text-gray-500">Payment Status</p>
          <p class="font-medium ${enrollment.payment_status === 'Paid' ? 'text-green-600' : 'text-amber-600'}">${enrollment.payment_status}</p>
        </div>
      </div>
    </div>

    <!-- Subjects Table -->
    <h4 class="font-bold text-gray-800 mb-3">Subjects for Approval</h4>
    <div class="border border-gray-200 rounded-xl overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Section</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Schedule</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Units</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${enrollment.subjects.map(subject => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <p class="font-mono font-medium text-blue-600">${subject.code}</p>
                <p class="text-sm text-gray-600">${subject.name}</p>
              </td>
              <td class="px-4 py-3 text-gray-700">${subject.section}</td>
              <td class="px-4 py-3 text-gray-700 text-sm">${subject.schedule}</td>
              <td class="px-4 py-3 text-center font-medium">${subject.units}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot class="bg-gray-50">
          <tr>
            <td colspan="3" class="px-4 py-3 text-right font-semibold text-gray-700">Total Units:</td>
            <td class="px-4 py-3 text-center font-bold text-blue-600">${enrollment.total_units}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

// Event Handlers
window.handleSearch = function (event) {
  state.filters.search = event.target.value;
  render();
};

window.viewDetails = function (enrollmentId) {
  const enrollment = state.pendingEnrollments.find(e => e.id === enrollmentId);
  if (!enrollment) return;

  state.selectedEnrollment = enrollment;

  const modal = new Modal({
    title: `Subject Enrollment Details - ${enrollment.student_name} (${enrollment.student_number})`,
    content: getApprovalContent(enrollment),
    size: 'xl',
    actions: [
      {
        label: 'Reject',
        onClick: async (m) => {
          await rejectEnrollment(enrollmentId);
          m.close();
        }
      },
      {
        label: 'Cancel',
        onClick: (m) => {
          state.selectedEnrollment = null;
          m.close();
        }
      },
      {
        label: 'Approve All Subjects',
        primary: true,
        onClick: async (m) => {
          await confirmApproval(enrollmentId);
          m.close();
        }
      }
    ]
  });

  state.approvalModal = modal;
  modal.show();
};

window.approveEnrollment = function (enrollmentId) {
  viewDetails(enrollmentId);
};

window.confirmApproval = async function (enrollmentId) {
  const enrollment = state.pendingEnrollments.find(e => e.id === enrollmentId);
  if (!enrollment) return;

  Toast.info(`Approving ${enrollment.student_name}'s enrollment...`);

  try {
    // Approve all subjects for this student
    for (const subject of enrollment.subjects) {
      await api.post(endpoints.headApprove(subject.id));
    }

    // Remove from pending list
    state.pendingEnrollments = state.pendingEnrollments.filter(e => e.id !== enrollmentId);
    state.selectedEnrollment = null;

    Toast.success(`${enrollment.student_name}'s subject enrollment has been approved!`);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Approving enrollment');
  }
};

window.rejectEnrollment = async function (enrollmentId) {
  const enrollment = state.pendingEnrollments.find(e => e.id === enrollmentId);
  if (!enrollment) return;

  const reason = prompt('Please provide a reason for rejection:');
  if (!reason) return;

  Toast.info(`Rejecting ${enrollment.student_name}'s enrollment...`);

  try {
    // Reject all subjects for this student
    for (const subject of enrollment.subjects) {
      await api.post(endpoints.headReject(subject.id), { reason });
    }

    state.pendingEnrollments = state.pendingEnrollments.filter(e => e.id !== enrollmentId);
    state.selectedEnrollment = null;

    Toast.warning(`${enrollment.student_name}'s enrollment has been rejected.`);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Rejecting enrollment');
  }
};

window.approveAll = async function () {
  if (state.pendingEnrollments.length === 0) return;

  ConfirmModal({
    title: 'Approve All Enrollments',
    message: `Are you sure you want to approve all ${state.pendingEnrollments.length} pending enrollments?`,
    confirmText: 'Approve All',
    onConfirm: async () => {
      Toast.info('Approving all pending enrollments...');

      try {
        // Collect all subject IDs
        const allSubjectIds = [];
        for (const enrollment of state.pendingEnrollments) {
          for (const subject of enrollment.subjects) {
            allSubjectIds.push(subject.id);
          }
        }

        // Bulk approve
        await api.post(endpoints.headBulkApprove, { ids: allSubjectIds });

        const count = state.pendingEnrollments.length;
        state.pendingEnrollments = [];

        Toast.success(`Successfully approved ${count} student enrollments!`);
        render();
      } catch (error) {
        ErrorHandler.handle(error, 'Bulk approving enrollments');
      }
    }
  });
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
