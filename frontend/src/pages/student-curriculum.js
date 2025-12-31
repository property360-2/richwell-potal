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
  expandedYears: new Set() // Track which years are expanded
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadCurriculum();

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

async function loadCurriculum() {
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
      ErrorHandler.handle(error, 'Loading curriculum');
      state.error = 'Failed to load curriculum';
    }
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading curriculum...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'STUDENT',
      activePage: 'student-curriculum',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      ${state.error ? renderErrorState() : renderCurriculumContent()}
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

function renderCurriculumContent() {
  return `
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-800">My Curriculum</h1>
      <p class="text-gray-600 mt-1">${state.curriculum.program_code} - ${state.curriculum.program_name}</p>
      <p class="text-sm text-gray-500">Curriculum ${state.curriculum.code} (Effective ${state.curriculum.effective_year})</p>
    </div>

    <!-- Statistics Cards -->
    ${renderStatistics()}

    <!-- Curriculum Structure -->
    ${renderCurriculumStructure()}
  `;
}

function renderStatistics() {
  const stats = state.statistics;

  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">Completion</p>
            <p class="text-3xl font-bold text-blue-600">${stats.completion_percentage}%</p>
          </div>
          <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">Subjects Completed</p>
            <p class="text-3xl font-bold text-green-600">${stats.completed_subjects}</p>
            <p class="text-xs text-gray-500">of ${stats.total_subjects}</p>
          </div>
          <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">Units Completed</p>
            <p class="text-3xl font-bold text-purple-600">${stats.completed_units}</p>
            <p class="text-xs text-gray-500">of ${stats.total_units}</p>
          </div>
          <svg class="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 mb-1">Current Year</p>
            <p class="text-3xl font-bold text-orange-600">${state.studentInfo.current_year_level}</p>
            <p class="text-xs text-gray-500">${getYearLabel(state.studentInfo.current_year_level)}</p>
          </div>
          <svg class="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="card mb-8">
      <p class="text-sm font-medium text-gray-700 mb-2">Overall Progress</p>
      <div class="w-full bg-gray-200 rounded-full h-4">
        <div class="bg-blue-600 h-4 rounded-full transition-all" style="width: ${stats.completion_percentage}%"></div>
      </div>
    </div>
  `;
}

function renderCurriculumStructure() {
  const years = Object.keys(state.structure).sort();

  return `
    <div class="space-y-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-800">Curriculum Structure</h2>
        <div class="flex gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Completed</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>Enrolled</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-gray-300"></span>
            <span>Pending</span>
          </div>
        </div>
      </div>

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

  semesters.forEach(sem => {
    yearData[sem].forEach(subject => {
      totalSubjects++;
      totalUnits += subject.units;
      if (subject.status === 'completed') completedSubjects++;
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
            <h3 class="text-xl font-bold">${getYearLabel(yearLevel)}</h3>
            ${isCurrent ? '<span class="px-3 py-1 bg-white text-blue-600 text-sm font-medium rounded-full">Current Year</span>' : ''}
          </div>
          <div class="flex items-center gap-6">
            <div class="text-sm">
              <span class="font-medium">${completedSubjects}/${totalSubjects}</span> subjects
              <span class="mx-2">•</span>
              <span class="font-medium">${totalUnits}</span> units
            </div>
            <svg class="w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

      <div class="${isExpanded ? '' : 'hidden'}">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          ${semesters.map(sem => renderSemesterSection(yearLevel, sem, yearData[sem])).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderSemesterSection(yearLevel, semesterNumber, subjects) {
  const semesterLabel = getSemesterLabel(semesterNumber);
  const totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);

  return `
    <div class="border border-gray-200 rounded-lg">
      <div class="bg-gray-100 px-4 py-3 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold text-gray-800">${semesterLabel}</h4>
          <span class="text-sm text-gray-600">${totalUnits} units</span>
        </div>
      </div>
      <div class="p-4 space-y-3">
        ${subjects.map(subject => renderSubjectCard(subject)).join('')}
      </div>
    </div>
  `;
}

function renderSubjectCard(subject) {
  const statusConfig = {
    'completed': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '✓', label: 'Completed' },
    'enrolled': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '●', label: 'Enrolled' },
    'pending': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', icon: '○', label: 'Pending' }
  };

  const config = statusConfig[subject.status];

  return `
    <div class="border ${config.border} ${config.bg} rounded-lg p-3">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="${config.text} text-lg">${config.icon}</span>
            <p class="font-semibold text-gray-900">${subject.code}</p>
            ${subject.is_required ? '<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">Required</span>' : ''}
            ${subject.is_major ? '<span class="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">Major</span>' : ''}
          </div>
          <p class="text-sm text-gray-700 mb-2">${subject.title}</p>
          ${subject.prerequisites.length > 0 ? `
            <p class="text-xs text-gray-500">
              Prereq: ${subject.prerequisites.map(p => p.code).join(', ')}
            </p>
          ` : ''}
        </div>
        <div class="ml-3 text-right">
          <span class="inline-block px-3 py-1 text-sm font-medium rounded ${config.bg} ${config.text}">
            ${subject.units} ${subject.units === 1 ? 'unit' : 'units'}
          </span>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function getYearLabel(year) {
  const labels = {
    1: '1st Year',
    2: '2nd Year',
    3: '3rd Year',
    4: '4th Year',
    5: '5th Year'
  };
  return labels[year] || `Year ${year}`;
}

function getSemesterLabel(semester) {
  const labels = {
    1: '1st Semester',
    2: '2nd Semester',
    3: 'Summer'
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
