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
  curriculum: null,
  structure: null,
  statistics: null,
  studentInfo: null,
  error: null,
  expandedYears: new Set()
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadCurriculumWithGrades();

  // Auto-expand current year level
  if (state.studentInfo?.current_year_level) {
    state.expandedYears.add(String(state.studentInfo.current_year_level));
  }

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

async function loadCurriculumWithGrades() {
  try {
    const response = await api.get(endpoints.studentCurriculum);
    if (response.success) {
      const data = response.data;
      state.curriculum = data.curriculum;
      state.structure = data.structure;
      state.statistics = data.statistics;
      state.studentInfo = data.student;
    } else {
      state.error = response.error || 'Failed to load curriculum';
    }
  } catch (error) {
    if (error.response?.status === 400) {
      state.error = error.response.data?.error || 'No curriculum assigned';
    } else {
      ErrorHandler.handle(error, 'Loading grades');
      state.error = 'Failed to load grades';
    }
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading grades...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'STUDENT',
      activePage: 'grades',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      ${state.error ? renderErrorState() : renderGradesContent()}
    </main>
  `;
}

function renderErrorState() {
  return `
    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-800 mb-2">No Curriculum Assigned</h3>
      <p class="text-gray-600 max-w-md mx-auto">${state.error}</p>
      <p class="text-sm text-gray-500 mt-4">Please contact the registrar's office to be assigned to a curriculum.</p>
    </div>
  `;
}

function renderGradesContent() {
  return `
    <!-- Curriculum Header -->
    <div class="mb-8">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">My Grades</h1>
          <p class="text-gray-600 mt-1">${state.curriculum.program_code} - ${state.curriculum.program_name}</p>
          <p class="text-sm text-gray-500">Curriculum: ${state.curriculum.code} (Effective ${state.curriculum.effective_year})</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-500">${state.studentInfo.student_number}</p>
          <p class="text-sm text-gray-600">${state.studentInfo.name}</p>
        </div>
      </div>
      ${state.curriculum.description ? `
        <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-800">${state.curriculum.description}</p>
        </div>
      ` : ''}
    </div>

    <!-- Statistics Cards -->
    ${renderStatistics()}

    <!-- Grades by Year/Semester -->
    ${renderGradeStructure()}
  `;
}

function renderStatistics() {
  const stats = state.statistics;

  return `
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
      <!-- GWA -->
      <div class="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <p class="text-blue-100 text-xs font-medium">GWA</p>
        <p class="text-3xl font-bold mt-1">${stats.gwa || 'N/A'}</p>
      </div>

      <!-- Completion -->
      <div class="card">
        <p class="text-gray-500 text-xs font-medium">Completion</p>
        <p class="text-3xl font-bold text-green-600 mt-1">${stats.completion_percentage}%</p>
      </div>

      <!-- Subjects -->
      <div class="card">
        <p class="text-gray-500 text-xs font-medium">Subjects</p>
        <p class="text-2xl font-bold text-gray-800 mt-1">${stats.completed_subjects}/${stats.total_subjects}</p>
      </div>

      <!-- Units -->
      <div class="card">
        <p class="text-gray-500 text-xs font-medium">Units</p>
        <p class="text-2xl font-bold text-gray-800 mt-1">${stats.completed_units}/${stats.total_units}</p>
      </div>

      <!-- INC Count -->
      ${stats.inc_count > 0 ? `
        <div class="card border-2 border-yellow-300">
          <p class="text-yellow-600 text-xs font-medium">INC Subjects</p>
          <p class="text-2xl font-bold text-yellow-600 mt-1">${stats.inc_count}</p>
        </div>
      ` : `
        <div class="card">
          <p class="text-gray-500 text-xs font-medium">Current Year</p>
          <p class="text-2xl font-bold text-gray-800 mt-1">${state.studentInfo.current_year_level}</p>
        </div>
      `}
    </div>
  `;
}

function renderGradeStructure() {
  const years = Object.keys(state.structure).sort();

  return `
    <div class="space-y-4">
      ${years.map(year => renderYearSection(year)).join('')}
    </div>
  `;
}

function renderYearSection(yearLevel) {
  const yearData = state.structure[yearLevel];
  const semesters = Object.keys(yearData).sort();
  const isExpanded = state.expandedYears.has(yearLevel);
  const isCurrent = parseInt(yearLevel) === state.studentInfo.current_year_level;

  // Calculate year statistics
  let totalSubjects = 0;
  let completedSubjects = 0;
  let totalUnits = 0;
  let completedUnits = 0;

  semesters.forEach(sem => {
    yearData[sem].forEach(subject => {
      totalSubjects++;
      totalUnits += subject.units;
      if (subject.status === 'completed') {
        completedSubjects++;
        completedUnits += subject.units;
      }
    });
  });

  return `
    <div class="border border-gray-200 rounded-lg overflow-hidden ${isCurrent ? 'ring-2 ring-blue-500' : ''}">
      <div
        class="bg-gradient-to-r ${isCurrent ? 'from-blue-600 to-blue-700' : 'from-gray-600 to-gray-700'} text-white px-6 py-4 cursor-pointer hover:opacity-90 transition"
        onclick="toggleYear('${yearLevel}')"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h3 class="text-lg font-bold">${getYearLabel(yearLevel)}</h3>
            ${isCurrent ? '<span class="px-2 py-0.5 bg-white text-blue-600 text-xs font-medium rounded-full">Current</span>' : ''}
          </div>
          <div class="flex items-center gap-6">
            <div class="text-sm">
              <span class="font-medium">${completedSubjects}/${totalSubjects}</span> subjects
              <span class="mx-2">|</span>
              <span class="font-medium">${completedUnits}/${totalUnits}</span> units
            </div>
            <svg class="w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="${isExpanded ? '' : 'hidden'}">
        ${semesters.map(sem => renderSemesterTable(yearLevel, sem, yearData[sem])).join('')}
      </div>
    </div>
  `;
}

function renderSemesterTable(yearLevel, semesterNumber, subjects) {
  const semesterLabel = getSemesterLabel(semesterNumber);
  const totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);

  return `
    <div class="border-t border-gray-200">
      <div class="bg-gray-100 px-6 py-3 flex items-center justify-between">
        <h4 class="font-semibold text-gray-800">${semesterLabel}</h4>
        <span class="text-sm text-gray-600">${totalUnits} units</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject Code</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject Title</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Units</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${subjects.map(subject => renderSubjectRow(subject)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSubjectRow(subject) {
  const gradeDisplay = getGradeDisplay(subject);
  const statusBadge = getStatusBadge(subject);
  const remarks = getRemarks(subject);

  return `
    <tr class="${subject.status === 'inc' ? 'bg-yellow-50' : subject.status === 'failed' ? 'bg-red-50' : ''}">
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="font-mono text-sm font-semibold text-blue-600">${subject.code}</span>
        ${subject.is_major ? '<span class="ml-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Major</span>' : ''}
      </td>
      <td class="px-6 py-4">
        <span class="text-sm text-gray-800">${subject.title}</span>
        ${subject.prerequisites.length > 0 ? `
          <p class="text-xs text-gray-400 mt-0.5">Prereq: ${subject.prerequisites.map(p => p.code).join(', ')}</p>
        ` : ''}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        <span class="text-sm font-medium text-gray-800">${subject.units}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        ${gradeDisplay}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-center">
        ${statusBadge}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        ${remarks}
      </td>
    </tr>
  `;
}

function getGradeDisplay(subject) {
  if (!subject.grade) {
    return '<span class="text-gray-300">-</span>';
  }

  const gradeValue = parseFloat(subject.grade);
  let gradeColor = 'text-gray-600';
  let gradeBg = 'bg-gray-100';

  if (subject.grade === 'INC') {
    gradeColor = 'text-yellow-600';
    gradeBg = 'bg-yellow-100';
  } else if (gradeValue) {
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

  return `
    <span class="inline-flex items-center justify-center px-3 py-1 rounded-lg ${gradeBg}">
      <span class="text-lg font-bold ${gradeColor}">${subject.grade}</span>
    </span>
  `;
}

function getStatusBadge(subject) {
  const statusConfig = {
    'completed': { class: 'bg-green-100 text-green-700', label: 'Passed' },
    'enrolled': { class: 'bg-blue-100 text-blue-700', label: 'Enrolled' },
    'inc': { class: 'bg-yellow-100 text-yellow-700', label: 'INC' },
    'failed': { class: 'bg-red-100 text-red-700', label: 'Failed' },
    'pending': { class: 'bg-gray-100 text-gray-500', label: 'Pending' }
  };

  const config = statusConfig[subject.status] || statusConfig.pending;

  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${config.class}">${config.label}</span>`;
}

function getRemarks(subject) {
  const remarks = [];

  // INC expiry warning
  if (subject.status === 'inc' && subject.inc_days_remaining !== null) {
    if (subject.inc_days_remaining <= 0) {
      remarks.push('<span class="text-red-600 font-medium text-xs">EXPIRED</span>');
    } else if (subject.inc_days_remaining <= 30) {
      remarks.push(`<span class="text-yellow-600 font-medium text-xs">Expires in ${subject.inc_days_remaining} days</span>`);
    } else {
      remarks.push(`<span class="text-gray-500 text-xs">Expires in ${subject.inc_days_remaining} days</span>`);
    }
  }

  // Retake indicator
  if (subject.retake_count > 0) {
    remarks.push(`<span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">Retake #${subject.retake_count}</span>`);
  }

  // Semester taken
  if (subject.semester_taken && subject.status === 'completed') {
    remarks.push(`<span class="text-gray-400 text-xs">${subject.semester_taken}</span>`);
  }

  return remarks.length > 0 ? remarks.join(' ') : '<span class="text-gray-300">-</span>';
}

// Helper functions
function getYearLabel(year) {
  const labels = {
    '1': '1st Year',
    '2': '2nd Year',
    '3': '3rd Year',
    '4': '4th Year',
    '5': '5th Year'
  };
  return labels[year] || `Year ${year}`;
}

function getSemesterLabel(semester) {
  const labels = {
    '1': '1st Semester',
    '2': '2nd Semester',
    '3': 'Summer'
  };
  return labels[semester] || `Semester ${semester}`;
}

// Event handlers
window.toggleYear = function(yearLevel) {
  if (state.expandedYears.has(yearLevel)) {
    state.expandedYears.delete(yearLevel);
  } else {
    state.expandedYears.add(yearLevel);
  }
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
