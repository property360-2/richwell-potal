import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, formatCurrency, requireAuth } from '../utils.js';

// State
const state = {
  user: null,
  loading: true,
  semester: null,
  grades: [],
  gpa: null,
  totalUnits: 0,
  isFinalized: false
};

async function init() {
  if (!requireAuth()) return;

  await loadGrades();
  render();
}

async function loadGrades() {
  try {
    // Load user profile
    const userResponse = await api.get(endpoints.me);
    if (userResponse) {
      state.user = userResponse;
    }

    // Load grades from API
    try {
      const gradesEndpoint = `${endpoints.myEnrollment}/grades/`;
      const gradesResponse = await api.get(gradesEndpoint);
      console.log('Grades API response:', gradesResponse);

      if (gradesResponse?.data) {
        state.semester = gradesResponse.data.semester;
        state.grades = gradesResponse.data.grades || [];
        state.gpa = gradesResponse.data.gpa;
        state.totalUnits = gradesResponse.data.total_units || 0;
        state.isFinalized = gradesResponse.data.is_finalized || false;
      }
    } catch (error) {
      console.log('Grades API failed:', error);
      showToast('Unable to load grades', 'error');
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
  state.loading = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  app.innerHTML = `
    ${renderHeader()}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">My Grades</h1>
        <p class="text-gray-600 mt-1">${state.semester || 'Current Semester'}</p>
      </div>

      <!-- GPA Card -->
      ${renderGPACard()}

      <!-- Grades Table -->
      <div class="card">
        <h2 class="text-xl font-bold text-gray-800 mb-6">Subject Grades</h2>

        ${state.grades.length === 0 ? `
          <div class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <p class="text-gray-500 text-sm">No grades available yet</p>
            <p class="text-gray-400 text-xs mt-1">Grades will appear here once your professors submit them</p>
          </div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Title</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${state.grades.map(grade => renderGradeRow(grade)).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </main>
  `;
}

function renderHeader() {
  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
        </div>

        <nav class="hidden md:flex items-center gap-6">
          <a href="/student-dashboard.html" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/subject-enrollment.html" class="text-gray-600 hover:text-gray-900">Enroll Subjects</a>
          <a href="/grades.html" class="text-blue-600 font-medium">Grades</a>
          <a href="/soa.html" class="text-gray-600 hover:text-gray-900">SOA</a>
        </nav>

        <div class="flex items-center gap-4">
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
        <p class="mt-4 text-gray-600">Loading grades...</p>
      </div>
    </div>
  `;
}

function renderGPACard() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <!-- GPA -->
      <div class="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-blue-100 text-sm font-medium">Grade Point Average</p>
            <p class="text-4xl font-bold mt-2">${state.gpa || 'N/A'}</p>
          </div>
          <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Total Units -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Total Units</p>
            <p class="text-4xl font-bold text-gray-800 mt-2">${state.totalUnits}</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-600 text-sm font-medium">Status</p>
            <p class="text-2xl font-bold mt-2 ${state.isFinalized ? 'text-green-600' : 'text-yellow-600'}">
              ${state.isFinalized ? 'Finalized' : 'Pending'}
            </p>
          </div>
          <div class="w-12 h-12 ${state.isFinalized ? 'bg-green-100' : 'bg-yellow-100'} rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 ${state.isFinalized ? 'text-green-600' : 'text-yellow-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${state.isFinalized ? `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              ` : `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              `}
            </svg>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderGradeRow(grade) {
  const gradeValue = parseFloat(grade.grade);
  let gradeColor = 'text-gray-600';
  let gradeBg = 'bg-gray-100';

  if (gradeValue) {
    if (gradeValue <= 1.5) {
      gradeColor = 'text-green-600';
      gradeBg = 'bg-green-100';
    } else if (gradeValue <= 2.5) {
      gradeColor = 'text-blue-600';
      gradeBg = 'bg-blue-100';
    } else if (gradeValue <= 3.0) {
      gradeColor = 'text-yellow-600';
      gradeBg = 'bg-yellow-100';
    } else {
      gradeColor = 'text-red-600';
      gradeBg = 'bg-red-100';
    }
  }

  const statusBadge = {
    'ENROLLED': '<span class="badge badge-info">Enrolled</span>',
    'PENDING_PAYMENT': '<span class="badge badge-warning">Pending Payment</span>',
    'PASSED': '<span class="badge badge-success">Passed</span>',
    'FAILED': '<span class="badge badge-error">Failed</span>',
    'INCOMPLETE': '<span class="badge badge-warning">INC</span>',
    'DROPPED': '<span class="badge badge-error">Dropped</span>'
  };

  return `
    <tr>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="font-mono text-sm font-semibold text-blue-600">${grade.subject_code}</span>
      </td>
      <td class="px-6 py-4">
        <span class="text-sm text-gray-800">${grade.subject_title}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        <span class="text-sm font-medium text-gray-800">${grade.units}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        ${grade.grade ? `
          <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg ${gradeBg}">
            <span class="text-lg font-bold ${gradeColor}">${grade.grade}</span>
          </span>
        ` : `
          <span class="text-sm text-gray-400">Not yet graded</span>
        `}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        ${statusBadge[grade.status] || `<span class="badge">${grade.status_display}</span>`}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-sm text-gray-600">${grade.professor_name}</span>
      </td>
    </tr>
  `;
}

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
