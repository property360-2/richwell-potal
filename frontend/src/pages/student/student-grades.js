/**
 * Student Grades Page
 * 
 * Displays student's grades organized by semester with GPA calculations.
 * Uses modular component architecture for consistency.
 */
import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatDate } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay, InlineSpinner } from '../../components/Spinner.js';
import { renderBadge, renderStatusBadge } from '../../atoms/badges/Badge.js';
import { renderStatCard, renderStatCardGrid } from '../../molecules/cards/StatCard.js';
import { renderEmptyState } from '../../organisms/layout/EmptyState.js';
import { Icon } from '../../atoms/icons/Icon.js';
import { renderTabs } from '../../organisms/navigation/Tabs.js';

// ============================================================
// STATE
// ============================================================

const state = {
  user: null,
  gradesData: null,
  transcriptData: null,
  loading: true,
  activeTab: 'grades', // 'grades' | 'transcript'
  selectedSemester: 'all'
};

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  if (!requireAuth()) return;

  await Promise.all([
    loadUserProfile(),
    loadGrades()
  ]);

  state.loading = false;
  render();
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      const userData = response.data || response;
      state.user = userData;
      TokenManager.setUser(userData);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user profile');
  }
}

async function loadGrades() {
  try {
    const response = await api.get(endpoints.myGrades);
    if (response?.success) {
      state.gradesData = response.data;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading grades');
    state.gradesData = { semesters: [], summary: {} };
  }
}

async function loadTranscript() {
  if (state.transcriptData) return; // Already loaded

  try {
    const response = await api.get(endpoints.myTranscript);
    if (response?.success) {
      state.transcriptData = response.data;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading transcript');
    state.transcriptData = { transcript: [], summary: {} };
  }
  render();
}

// ============================================================
// ACTIONS
// ============================================================

function handleTabChange(tabId) {
  state.activeTab = tabId;
  if (tabId === 'transcript' && !state.transcriptData) {
    loadTranscript();
  }
  render();
}

function handleSemesterFilter(semesterId) {
  state.selectedSemester = semesterId;
  render();
}

// ============================================================
// RENDER
// ============================================================

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading grades...');
    return;
  }

  const summary = state.gradesData?.summary || {};

  app.innerHTML = `
    ${createHeader({
    role: 'STUDENT',
    activePage: 'grades',
    user: state.user
  })}
    
    <main class="max-w-6xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-2">Academic Record</h1>
        <p class="text-gray-600">View your grades, GPA, and academic progress</p>
      </div>
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        ${renderGPACard(summary.cumulative_gpa)}
        ${renderStatCard({
    label: 'Units Earned',
    value: summary.total_units_earned || 0,
    iconName: 'book',
    color: 'blue'
  })}
        ${renderStatCard({
    label: 'Passed',
    value: summary.subjects_passed || 0,
    iconName: 'check',
    color: 'green'
  })}
        ${renderStatCard({
    label: 'Failed',
    value: summary.subjects_failed || 0,
    iconName: 'close',
    color: 'red'
  })}
      </div>
      
      <!-- Tabs -->
      <div class="mb-6">
        ${renderTabs({
    tabs: [
      { id: 'grades', label: 'Semester Grades' },
      { id: 'transcript', label: 'Transcript' }
    ],
    activeTab: state.activeTab,
    variant: 'pills',
    onTabChange: 'handleTabChange'
  })}
      </div>
      
      <!-- Content -->
      ${state.activeTab === 'grades' ? renderGradesTab() : renderTranscriptTab()}
    </main>
  `;

  attachEventListeners();
}

function renderGPACard(gpa) {
  const gpaValue = gpa !== null ? gpa.toFixed(2) : '--';
  const gpaColor = gpa === null ? 'gray' : gpa <= 1.75 ? 'green' : gpa <= 2.5 ? 'blue' : gpa <= 3.0 ? 'yellow' : 'red';

  return `
    <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium opacity-90">Cumulative GPA</span>
        ${Icon('chart', { size: 'md', className: 'opacity-75' })}
      </div>
      <div class="text-4xl font-bold">${gpaValue}</div>
      <div class="text-xs opacity-75 mt-1">
        ${gpa !== null ? getGPADescription(gpa) : 'No grades yet'}
      </div>
    </div>
  `;
}

function getGPADescription(gpa) {
  if (gpa <= 1.25) return 'Excellent';
  if (gpa <= 1.75) return 'Very Good';
  if (gpa <= 2.25) return 'Good';
  if (gpa <= 2.75) return 'Satisfactory';
  if (gpa <= 3.0) return 'Passing';
  return 'Needs Improvement';
}

function renderGradesTab() {
  const semesters = state.gradesData?.semesters || [];

  if (semesters.length === 0) {
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        ${renderEmptyState({
      icon: 'book',
      title: 'No Grades Yet',
      message: 'Your grades will appear here once they are submitted by your professors.'
    })}
      </div>
    `;
  }

  // Semester filter
  const filterOptions = [
    { value: 'all', label: 'All Semesters' },
    ...semesters.map(s => ({
      value: s.semester_id,
      label: `${s.semester_name} ${s.academic_year}`
    }))
  ];

  const filteredSemesters = state.selectedSemester === 'all'
    ? semesters
    : semesters.filter(s => s.semester_id === state.selectedSemester);

  return `
    <!-- Filter -->
    <div class="mb-6">
      <select 
        id="semester-filter"
        class="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onchange="handleSemesterFilter(this.value)"
      >
        ${filterOptions.map(opt => `
          <option value="${opt.value}" ${state.selectedSemester === opt.value ? 'selected' : ''}>
            ${opt.label}
          </option>
        `).join('')}
      </select>
    </div>
    
    <!-- Semester Cards -->
    <div class="space-y-6">
      ${filteredSemesters.map(semester => renderSemesterCard(semester)).join('')}
    </div>
  `;
}

function renderSemesterCard(semester) {
  const subjects = semester.subjects || [];
  const gpa = semester.gpa ? semester.gpa.toFixed(2) : '--';

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-800">${semester.semester_name} ${semester.academic_year}</h3>
          <p class="text-sm text-gray-500">${subjects.length} subject(s) • ${semester.total_units} units</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-bold text-gray-800">${gpa}</div>
          <div class="text-xs text-gray-500">GPA</div>
        </div>
      </div>
      
      <!-- Subjects Table -->
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Units</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Grade</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Retake Eligibility</th>
              <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            ${subjects.map(subject => renderSubjectRow(subject)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSubjectRow(subject) {
  const gradeClass = getGradeClass(subject.grade, subject.status);
  const isResolutionPending = subject.pending_resolution;

  return `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${subject.subject_code}</div>
        <div class="text-sm text-gray-500">${subject.subject_title}</div>
        ${isResolutionPending ? `
          <div class="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit">
            ${Icon('clock', { size: 'xs' })}
            RESOLVED BY PROFESSOR (PENDING APPROVAL)
          </div>
        ` : ''}
      </td>
      <td class="px-6 py-4 text-center text-gray-600">${subject.units}</td>
      <td class="px-6 py-4 text-center">
        ${isResolutionPending ? `
            <div class="flex flex-col items-center">
                <span class="text-xs text-gray-400 line-through">${subject.grade || 'INC'}</span>
                <span class="text-xl font-bold text-blue-600">${subject.pending_resolution.proposed_grade}</span>
            </div>
        ` : `
            <span class="text-xl font-bold ${gradeClass}">${subject.grade || '--'}</span>
        `}
      <td class="px-6 py-4 text-center">
        ${subject.retake_eligibility_date ? `
          <div class="flex flex-col items-center">
            <span class="text-xs font-medium ${subject.is_retake_eligible ? 'text-green-600 bg-green-50' : 'text-blue-600 bg-blue-50'} px-2 py-0.5 rounded-full border ${subject.is_retake_eligible ? 'border-green-100' : 'border-blue-100'}">
              ${formatDate(subject.retake_eligibility_date)}
            </span>
            <span class="text-[10px] text-gray-400 mt-1 uppercase tracking-tight">
              ${subject.status === 'INC' ? 'Resolution Limit' : 'Eligible for Retake'}
            </span>
          </div>
        ` : '<span class="text-gray-400 text-xs">N/A</span>'}
      </td>
      <td class="px-6 py-4 text-center">
        ${renderStatusBadge(subject.status)}
      </td>
    </tr>
  `;
}

function getGradeClass(grade, status) {
  if (!grade) return 'text-gray-400';
  const g = parseFloat(grade);
  if (g <= 1.75) return 'text-green-600';
  if (g <= 2.5) return 'text-blue-600';
  if (g <= 3.0) return 'text-yellow-600';
  return 'text-red-600';
}

function renderTranscriptTab() {
  if (!state.transcriptData) {
    return `
      <div class="flex items-center justify-center py-12">
        ${InlineSpinner()}
        <span class="ml-3 text-gray-500">Loading transcript...</span>
      </div>
    `;
  }

  const { student, transcript, summary } = state.transcriptData;

  if (!transcript || transcript.length === 0) {
    return `
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
        ${renderEmptyState({
      icon: 'clipboard',
      title: 'No Academic Record',
      message: 'Your transcript will appear here once you have completed subjects.'
    })}
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-bold text-gray-800">Unofficial Transcript of Records</h2>
            <p class="text-sm text-gray-500">For reference only - Request official copy from Registrar</p>
          </div>
          <button 
            onclick="window.print()"
            class="px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            ${Icon('download', { size: 'sm' })}
            Print
          </button>
        </div>
        
        <!-- Student Info -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span class="text-gray-500">Name:</span>
            <span class="font-medium text-gray-800 ml-1">${student?.name || 'N/A'}</span>
          </div>
          <div>
            <span class="text-gray-500">Student No:</span>
            <span class="font-medium text-gray-800 ml-1">${student?.student_number || 'N/A'}</span>
          </div>
          <div>
            <span class="text-gray-500">Program:</span>
            <span class="font-medium text-gray-800 ml-1">${student?.program_code || 'N/A'}</span>
          </div>
          <div>
            <span class="text-gray-500">GWA:</span>
            <span class="font-bold text-blue-600 ml-1">${summary?.gwa?.toFixed(2) || '--'}</span>
          </div>
        </div>
      </div>
      
      <!-- Transcript Content -->
      <div class="divide-y divide-gray-100">
        ${transcript.map(sem => renderTranscriptSemester(sem)).join('')}
      </div>
      
      <!-- Summary Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500">Total Units: <span class="font-medium text-gray-800">${summary?.total_units || 0}</span></span>
          <span class="text-gray-500">Earned Units: <span class="font-medium text-green-600">${summary?.earned_units || 0}</span></span>
          <span class="text-gray-500">Remaining: <span class="font-medium text-gray-800">${summary?.remaining_units || 0}</span></span>
        </div>
      </div>
    </div>
  `;
}

function renderTranscriptSemester(semester) {
  return `
    <div class="px-6 py-4">
      <h4 class="font-semibold text-gray-700 mb-3">${semester.semester} ${semester.academic_year}</h4>
      <table class="w-full text-sm">
        <thead>
          <tr class="text-gray-500">
            <th class="text-left py-1">Code</th>
            <th class="text-left py-1">Title</th>
            <th class="text-center py-1 w-16">Units</th>
            <th class="text-center py-1 w-16">Grade</th>
            <th class="text-left py-1">Remarks</th>
          </tr>
        </thead>
        <tbody>
          ${semester.subjects.map(s => `
            <tr class="border-t border-gray-50">
              <td class="py-2 font-medium text-gray-900">${s.code}</td>
              <td class="py-2 text-gray-600">${s.title}</td>
              <td class="py-2 text-center text-gray-600">${s.units}</td>
              <td class="py-2 text-center font-semibold ${getGradeClass(s.grade, s.status)}">${s.grade}</td>
              <td class="py-2 text-gray-500 text-xs">${s.remarks || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function attachEventListeners() {
  // Tab clicks
  document.querySelectorAll('[data-tab-id]').forEach(tab => {
    tab.addEventListener('click', () => {
      handleTabChange(tab.dataset.tabId);
    });
  });
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleTabChange = handleTabChange;
window.handleSemesterFilter = handleSemesterFilter;

window.logout = function () {
  TokenManager.clearTokens();
  window.location.href = '/login.html';
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
