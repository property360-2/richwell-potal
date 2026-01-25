import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, updateHash } from '../components/tabs.js';

// Tab constants
const TABS = {
  SCHEDULE: 'schedule',
  GRADING: 'grading'
};

// State
const state = {
  user: null,
  schedule: [],
  semesters: [],
  activeSemester: null,
  loading: true,
  activeTab: TABS.SCHEDULE,

  // Grading state
  mySections: [],
  selectedSection: null,
  selectedSubject: null,
  sectionStudents: [],
  loadingStudents: false
};

// Constants
const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' }
];

// Allowed grades for dropdown
const GRADE_OPTIONS = [
  { value: '', label: 'Select Grade' },
  { value: '1.00', label: '1.00 - Excellent' },
  { value: '1.25', label: '1.25 - Very Good' },
  { value: '1.50', label: '1.50 - Good' },
  { value: '1.75', label: '1.75 - Above Average' },
  { value: '2.00', label: '2.00 - Average' },
  { value: '2.25', label: '2.25 - Below Average' },
  { value: '2.50', label: '2.50 - Fair' },
  { value: '2.75', label: '2.75 - Passing' },
  { value: '3.00', label: '3.00 - Barely Passing' },
  { value: '5.00', label: '5.00 - Failed' },
  { value: 'INC', label: 'INC - Incomplete' }
];

// Color palette for subjects
const COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800'
];

function getSubjectColor(subjectCode) {
  const codes = [...new Set(state.schedule.map(s => s.subject?.code))];
  const index = codes.indexOf(subjectCode);
  return COLORS[index % COLORS.length];
}

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadSemesters();
  await loadSchedule();

  // Initialize hash navigation
  const hash = window.location.hash.slice(1);
  if (hash && Object.values(TABS).includes(hash)) {
    state.activeTab = hash;
  }

  state.loading = false;
  render();

  // Handle hash changes
  window.addEventListener('hashchange', () => {
    const newHash = window.location.hash.slice(1);
    if (newHash && Object.values(TABS).includes(newHash)) {
      switchTab(newHash);
    }
  });
}

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      // API may return { success, data: {...} } or just the user object directly
      state.user = response.data || response;
      TokenManager.setUser(state.user);
    }
  } catch (error) {
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    const semesters = response?.semesters || response?.results || response || [];
    state.semesters = Array.isArray(semesters) ? semesters : [];
    state.activeSemester = state.semesters.find(s => s.is_current || s.is_active) || state.semesters[0] || null;
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
    state.activeSemester = null;
  }
}

async function loadSchedule() {
  if (!state.user?.id || !state.activeSemester?.id) {
    state.schedule = [];
    return;
  }

  try {
    const response = await api.get(endpoints.professorSchedule(state.user.id, state.activeSemester.id));
    // The API returns { professor, semester, schedule: [...] }
    state.schedule = response?.schedule || response?.results || (Array.isArray(response) ? response : []);
  } catch (error) {
    ErrorHandler.handle(error, 'Loading schedule');
    state.schedule = [];
  }
}

async function loadMySections() {
  try {
    const response = await api.get(endpoints.professorMySections);
    // Ensure we always get an array - check multiple possible response formats
    if (Array.isArray(response)) {
      state.mySections = response;
    } else if (response?.data && Array.isArray(response.data)) {
      state.mySections = response.data;
    } else if (response?.results && Array.isArray(response.results)) {
      state.mySections = response.results;
    } else if (response?.sections && Array.isArray(response.sections)) {
      state.mySections = response.sections;
    } else {
      state.mySections = [];
    }
  } catch (error) {
    console.error('Error loading sections:', error);
    state.mySections = [];
  }
}

async function loadSectionStudents(sectionId, subjectId) {
  state.loadingStudents = true;
  render();

  try {
    const response = await api.get(endpoints.sectionStudents(sectionId, subjectId));
    state.sectionStudents = response?.students || response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading students');
    state.sectionStudents = [];
  }

  state.loadingStudents = false;
  render();
}

function formatTime(time) {
  if (!time) return '';
  const [hour, minute] = time.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minute || '00'} ${ampm}`;
}

function getScheduleForDay(day) {
  return state.schedule.filter(s => s.day === day).sort((a, b) =>
    (a.start_time || '').localeCompare(b.start_time || '')
  );
}

function getTotalHours() {
  let totalMinutes = 0;
  state.schedule.forEach(slot => {
    if (!slot.start_time || !slot.end_time) return;
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    totalMinutes += (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
  });
  return Math.round(totalMinutes / 60 * 10) / 10;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading...');
    return;
  }

  const uniqueSubjects = [...new Set(state.schedule.map(s => s.subject?.code).filter(Boolean))];
  const uniqueSections = [...new Set(state.schedule.map(s => s.section?.name).filter(Boolean))];

  app.innerHTML = `
    ${createHeader({
    role: 'PROFESSOR',
    activePage: 'professor-schedule',
    user: state.user
  })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Professor Dashboard</h1>
          <p class="text-gray-600 mt-1">${state.activeSemester?.name || 'Current Semester'}</p>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="card text-center">
          <p class="text-3xl font-bold text-blue-600">${state.schedule.length}</p>
          <p class="text-sm text-gray-500">Total Classes</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-green-600">${uniqueSubjects.length}</p>
          <p class="text-sm text-gray-500">Subjects</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-purple-600">${uniqueSections.length}</p>
          <p class="text-sm text-gray-500">Sections</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-orange-600">${getTotalHours()}</p>
          <p class="text-sm text-gray-500">Hours/Week</p>
        </div>
      </div>

      <!-- Tabs -->
      ${createTabs({
    tabs: [
      { id: TABS.SCHEDULE, label: 'My Schedule' },
      { id: TABS.GRADING, label: 'Grade Students' }
    ],
    activeTab: state.activeTab,
    onTabChange: 'switchTab'
  })}

      <!-- Tab Content -->
      <div class="tab-content mt-6">
        ${renderTabContent()}
      </div>
    </main>
  `;
}

function renderTabContent() {
  switch (state.activeTab) {
    case TABS.SCHEDULE:
      return renderScheduleTab();
    case TABS.GRADING:
      return renderGradingTab();
    default:
      return renderScheduleTab();
  }
}

// ============================================================
// SCHEDULE TAB
// ============================================================

function renderScheduleTab() {
  const uniqueSubjects = [...new Set(state.schedule.map(s => s.subject?.code).filter(Boolean))];

  return `
    <!-- Weekly Schedule Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${DAYS.map(day => {
    const daySchedule = getScheduleForDay(day.code);
    return `
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-800">${day.name}</h2>
              <span class="badge badge-info">${daySchedule.length} class${daySchedule.length !== 1 ? 'es' : ''}</span>
            </div>
            ${daySchedule.length > 0 ? `
              <div class="space-y-3">
                ${daySchedule.map(slot => `
                  <div class="p-4 rounded-xl border-l-4 ${getSubjectColor(slot.subject?.code)}">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="font-bold">${slot.subject?.code || 'N/A'}</p>
                        <p class="text-sm opacity-80">${slot.subject?.title || ''}</p>
                      </div>
                      <span class="text-xs font-medium opacity-70">${slot.section?.name || ''}</span>
                    </div>
                    <div class="flex items-center gap-4 mt-3 text-sm opacity-70">
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                      </span>
                      <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        ${slot.room || 'TBA'}
                      </span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="py-8 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                </svg>
                <p>No classes</p>
              </div>
            `}
          </div>
        `;
  }).join('')}
    </div>
    
    <!-- Subjects Legend -->
    ${uniqueSubjects.length > 0 ? `
      <div class="card mt-8">
        <h3 class="font-bold text-gray-800 mb-4">My Subjects</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${uniqueSubjects.map(code => {
    const subjectSlots = state.schedule.filter(s => s.subject?.code === code);
    const subject = subjectSlots[0]?.subject;
    const sections = [...new Set(subjectSlots.map(s => s.section?.name).filter(Boolean))];
    return `
              <div class="flex items-center gap-3 p-3 rounded-xl ${getSubjectColor(code)}">
                <div class="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center font-bold">${code?.slice(0, 2) || '?'}</div>
                <div>
                  <p class="font-semibold">${code}</p>
                  <p class="text-xs opacity-70">${sections.join(', ') || 'No sections'}</p>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

// ============================================================
// GRADING TAB
// ============================================================

function renderGradingTab() {
  // Ensure mySections is always an array
  const sections = Array.isArray(state.mySections) ? state.mySections : [];

  // If viewing a section's students
  if (state.selectedSection && state.selectedSubject) {
    return renderStudentGradingView();
  }

  // Flatten sections - create one item per (section, subject) pair
  const flattenedItems = [];
  for (const section of sections) {
    const subjects = section.subjects || [];
    if (subjects.length === 0) {
      // Section with no subjects - show it anyway
      flattenedItems.push({
        ...section,
        subject_id: null,
        subject_code: 'N/A',
        subject_title: ''
      });
    } else {
      for (const subj of subjects) {
        flattenedItems.push({
          ...section,
          subject_id: subj.subject_id,
          subject_code: subj.subject_code,
          subject_title: subj.subject_title,
          units: subj.units
        });
      }
    }
  }

  return `
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-800">Select Section to Grade</h2>
      <p class="text-sm text-gray-600 mt-1">Choose a section and subject to view students and submit grades</p>
    </div>

    ${flattenedItems.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <p class="text-gray-500 text-lg">No sections assigned</p>
        <p class="text-gray-400 text-sm mt-2">You have no sections assigned for grading this semester</p>
        <p class="text-gray-400 text-xs mt-4">Make sure you're logged in as a professor with assigned classes</p>
      </div>
    ` : `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${flattenedItems.map(item => `
          <div class="card hover:shadow-lg transition-all">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${item.section_name || item.name || 'Section'}</h3>
                <p class="text-sm text-gray-500">${item.program_code || 'Program'}</p>
              </div>
              <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                Year ${item.year_level || 'N/A'}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 mb-3">
              <p><strong>Subject:</strong> ${item.subject_code || 'N/A'} - ${item.subject_title || ''}</p>
              <p><strong>Students:</strong> ${item.student_count || 0}</p>
            </div>
            
            <button onclick="selectSectionForGrading('${item.section_id || item.id}', '${item.subject_id}')" 
                    class="btn btn-primary w-full">
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              Grade Students
            </button>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderStudentGradingView() {
  const section = state.selectedSection;
  const subject = state.selectedSubject;

  return `
    <!-- Back Button -->
    <button onclick="backToSectionList()" class="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
      Back to Sections
    </button>

    <!-- Section Header -->
    <div class="card mb-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">${section.section_name || section.name || 'Section'}</h2>
          <p class="text-gray-600 mt-1">${subject.code || 'Subject'} - ${subject.title || ''}</p>
          <p class="text-sm text-gray-500 mt-2">${state.sectionStudents.length} students</p>
        </div>
        <div class="flex gap-2">
          <button onclick="submitAllGrades()" class="btn btn-primary">
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Save All Grades
          </button>
        </div>
      </div>
    </div>

    ${state.loadingStudents ? `
      <div class="card text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p class="text-gray-500">Loading students...</p>
      </div>
    ` : state.sectionStudents.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No students enrolled</p>
      </div>
    ` : `
      <!-- Student Grading Table -->
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student No.</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Current Status</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Grade</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${state.sectionStudents.map((student, index) => {
    const statusColors = {
      'ENROLLED': 'bg-blue-100 text-blue-800',
      'PASSED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'INC': 'bg-yellow-100 text-yellow-800',
      'DROPPED': 'bg-gray-100 text-gray-800'
    };
    const statusColor = statusColors[student.status] || 'bg-gray-100 text-gray-800';

    return `
                  <tr class="hover:bg-gray-50" data-student-id="${student.subject_enrollment_id || student.id}">
                    <td class="px-4 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          ${(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}
                        </div>
                        <div>
                          <p class="font-medium text-gray-900">${student.last_name || ''}, ${student.first_name || ''}</p>
                          <p class="text-sm text-gray-500">${student.email || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600 font-mono">${student.student_number || 'N/A'}</td>
                    <td class="px-4 py-4 text-center">
                      <span class="px-2 py-1 text-xs font-medium rounded ${statusColor}">
                        ${student.status || 'ENROLLED'}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-center">
                      <select id="grade-${index}" 
                              data-index="${index}"
                              class="form-select text-sm w-36"
                              onchange="updateGradeValue(${index}, this.value)">
                        ${GRADE_OPTIONS.map(opt => `
                          <option value="${opt.value}" ${student.grade === opt.value || (student.grade && String(student.grade) === opt.value) ? 'selected' : ''}>
                            ${opt.label}
                          </option>
                        `).join('')}
                      </select>
                    </td>
                    <td class="px-4 py-4 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <button onclick="submitSingleGrade(${index})" 
                                class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                title="Save this grade">
                          Save
                        </button>
                        ${student.status === 'INC' ? `
                          <button onclick="openResolveINCModal(${index})" 
                                  class="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                  title="Resolve INC">
                            Resolve INC
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
  }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Grade Legend -->
      <div class="card mt-6 bg-gray-50">
        <h4 class="font-medium text-gray-700 mb-3">Grade Scale</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-sm">
          <span class="text-green-700">1.00-1.75: Excellent</span>
          <span class="text-blue-700">2.00-2.25: Good</span>
          <span class="text-yellow-700">2.50-2.75: Fair</span>
          <span class="text-orange-700">3.00: Passing</span>
          <span class="text-red-700">5.00: Failed</span>
          <span class="text-purple-700">INC: Incomplete</span>
        </div>
      </div>
    `}
  `;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

window.switchTab = function (tabId) {
  state.activeTab = tabId;
  updateHash(tabId);

  // Load grading data when switching to grading tab
  if (tabId === TABS.GRADING && state.mySections.length === 0) {
    loadMySections().then(render);
  } else {
    render();
  }
};

window.selectSectionForGrading = async function (sectionId, subjectId) {
  const section = state.mySections.find(s =>
    (s.section_id === sectionId || s.id === sectionId)
  );

  state.selectedSection = section || { id: sectionId, section_id: sectionId };
  state.selectedSubject = { id: subjectId, code: section?.subject_code, title: section?.subject_title };

  await loadSectionStudents(sectionId, subjectId);
};

window.backToSectionList = function () {
  state.selectedSection = null;
  state.selectedSubject = null;
  state.sectionStudents = [];
  render();
};

window.updateGradeValue = function (index, value) {
  if (state.sectionStudents[index]) {
    state.sectionStudents[index].pendingGrade = value;
  }
};

window.submitSingleGrade = async function (index) {
  const student = state.sectionStudents[index];
  if (!student) return;

  const gradeValue = student.pendingGrade || document.getElementById(`grade-${index}`)?.value;

  if (!gradeValue) {
    Toast.error('Please select a grade');
    return;
  }

  try {
    const data = {
      subject_enrollment_id: student.subject_enrollment_id || student.id,
      is_inc: gradeValue === 'INC'
    };

    if (gradeValue !== 'INC') {
      data.grade = gradeValue;
    }

    await api.post(endpoints.submitGrade, data);
    Toast.success(`Grade saved for ${student.first_name} ${student.last_name}`);

    // Refresh student list
    await loadSectionStudents(
      state.selectedSection.section_id || state.selectedSection.id,
      state.selectedSubject.id
    );
  } catch (error) {
    ErrorHandler.handle(error, 'Submitting grade');
  }
};

window.submitAllGrades = async function () {
  const gradesToSubmit = [];

  state.sectionStudents.forEach((student, index) => {
    const gradeEl = document.getElementById(`grade-${index}`);
    const gradeValue = student.pendingGrade || gradeEl?.value;

    if (gradeValue && student.status !== 'PASSED' && student.status !== 'FAILED') {
      gradesToSubmit.push({
        subject_enrollment_id: student.subject_enrollment_id || student.id,
        grade: gradeValue === 'INC' ? null : gradeValue,
        is_inc: gradeValue === 'INC'
      });
    }
  });

  if (gradesToSubmit.length === 0) {
    Toast.info('No grades to submit');
    return;
  }

  const confirmed = await ConfirmModal({
    title: 'Submit All Grades',
    message: `Are you sure you want to submit grades for ${gradesToSubmit.length} student(s)?`,
    confirmLabel: 'Submit Grades'
  });

  if (!confirmed) return;

  let successCount = 0;
  let errorCount = 0;

  for (const gradeData of gradesToSubmit) {
    try {
      await api.post(endpoints.submitGrade, gradeData);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error('Error submitting grade:', error);
    }
  }

  if (successCount > 0) {
    Toast.success(`${successCount} grade(s) submitted successfully`);
  }
  if (errorCount > 0) {
    Toast.error(`${errorCount} grade(s) failed to submit`);
  }

  // Refresh student list
  await loadSectionStudents(
    state.selectedSection.section_id || state.selectedSection.id,
    state.selectedSubject.id
  );
};

window.openResolveINCModal = function (index) {
  const student = state.sectionStudents[index];
  if (!student) return;

  const modal = new Modal({
    title: 'Resolve Incomplete Grade',
    content: `
      <div class="space-y-4">
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p class="text-yellow-800">
            <strong>Student:</strong> ${student.last_name}, ${student.first_name}<br>
            <strong>Current Status:</strong> INC (Incomplete)
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">New Grade *</label>
          <select id="resolve-inc-grade" class="form-select">
            ${GRADE_OPTIONS.filter(opt => opt.value && opt.value !== 'INC').map(opt => `
              <option value="${opt.value}">${opt.label}</option>
            `).join('')}
          </select>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Reason for Change</label>
          <textarea id="resolve-inc-reason" rows="3" class="form-input" placeholder="Optional: Enter reason for grade change"></textarea>
        </div>
      </div>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Resolve INC',
        primary: true,
        onClick: async (m) => {
          const grade = document.getElementById('resolve-inc-grade').value;
          const reason = document.getElementById('resolve-inc-reason').value;

          if (!grade) {
            Toast.error('Please select a grade');
            return;
          }

          try {
            await api.post(endpoints.submitGrade, {
              subject_enrollment_id: student.subject_enrollment_id || student.id,
              grade: grade,
              is_inc: false,
              change_reason: reason
            });

            Toast.success('INC resolved successfully');
            m.close();

            // Refresh student list
            await loadSectionStudents(
              state.selectedSection.section_id || state.selectedSection.id,
              state.selectedSubject.id
            );
          } catch (error) {
            ErrorHandler.handle(error, 'Resolving INC');
          }
        }
      }
    ]
  });

  modal.show();
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => window.location.href = '/login.html', 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
