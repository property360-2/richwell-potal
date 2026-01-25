import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, updateHash } from '../components/tabs.js';

// Tab constants
const TABS = {
  SECTIONS: 'sections',
  SECTIONS: 'sections',
  SCHEDULE: 'schedule'
};

// Days for schedule grid (Monday-Sunday)
const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' },
  { code: 'SUN', name: 'Sunday', short: 'Sun' }
];

// Time slots (1-hour blocks from 7am to 9pm)
const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

// Room options
const ROOMS = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
  'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
  'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'
];

// Subject colors for schedule grid
const COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-indigo-100 border-indigo-400 text-indigo-800',
  'bg-red-100 border-red-400 text-red-800'
];

// State
const state = {
  user: null,
  loading: true,
  activeTab: TABS.SECTIONS,
  sectionDetailTab: 'subjects',

  // Sections state
  sections: [],
  programs: [],
  semesters: [],
  activeSemester: null,
  selectedSection: null,
  sectionSubjects: [],
  sectionSchedule: [],
  enrolledStudents: [],

  // All students for Students tab
  allStudents: [],
  loadingStudents: false,
  studentsError: false,

  // Section filters for scalable filtering
  sectionFilters: {
    search: '',
    program: 'all',
    yearLevel: 'all'
  },

  // Professors state
  professors: [],

  // Available subjects for assignment
  programSubjects: [],
  loadingSubjects: false,

  // Modals
  sectionModal: null,
  scheduleModal: null,
  subjectAssignModal: null
};

/**
 * Get filtered sections - efficient client-side filtering
 */
function getFilteredSections() {
  const { search, program, yearLevel } = state.sectionFilters;

  let filtered = state.sections.slice();

  // Apply search filter (name or program code)
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name?.toLowerCase().includes(searchLower) ||
      (s.program_code || s.program?.code || '').toLowerCase().includes(searchLower)
    );
  }

  // Apply program filter
  if (program !== 'all') {
    filtered = filtered.filter(s =>
      (s.program?.id || s.program) === program ||
      (s.program_code || s.program?.code) === program
    );
  }

  // Apply year level filter
  if (yearLevel !== 'all') {
    const yearNum = parseInt(yearLevel, 10);
    filtered = filtered.filter(s => s.year_level === yearNum);
  }

  // Sort by name
  filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return filtered;
}

/**
 * Get section counts by year level for quick stats
 */
function getSectionCountsByYear() {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, total: state.sections.length };
  state.sections.forEach(s => {
    if (counts[s.year_level] !== undefined) {
      counts[s.year_level]++;
    }
  });
  return counts;
}

/**
 * Check for schedule conflicts
 */
function hasScheduleConflict(day, startTime, endTime, excludeSlotId = null) {
  const newStart = parseInt(startTime.split(':')[0]);
  const newEnd = parseInt(endTime.split(':')[0]);

  return state.sectionSchedule.some(slot => {
    if (slot.id === excludeSlotId) return false;
    if (slot.day !== day) return false;

    const slotStart = parseInt(slot.start_time?.split(':')[0] || '0');
    const slotEnd = parseInt(slot.end_time?.split(':')[0] || '0');

    // Check for overlap
    return !(newEnd <= slotStart || newStart >= slotEnd);
  });
}

function getSubjectColor(subjectCode) {
  const codes = [...new Set(state.sectionSchedule.map(s => s.subject_code))];
  const index = codes.indexOf(subjectCode);
  return COLORS[index % COLORS.length];
}

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadInitialData();

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
      state.user = response;
      TokenManager.setUser(response);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user profile', { showToast: false });
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadInitialData() {
  // Load programs
  try {
    const response = await api.get(endpoints.academicPrograms);
    state.programs = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading programs');
    state.programs = [];
  }

  // Load semesters
  try {
    const response = await api.get(endpoints.semesters);
    if (response?.semesters && Array.isArray(response.semesters)) {
      state.semesters = response.semesters;
    } else if (response?.results && Array.isArray(response.results)) {
      state.semesters = response.results;
    } else if (Array.isArray(response)) {
      state.semesters = response;
    } else {
      state.semesters = [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
  }

  // Ensure semesters is always an array before using .find()
  if (!Array.isArray(state.semesters)) {
    state.semesters = [];
  }
  state.activeSemester = state.semesters.find(s => s.is_current || s.is_active) || state.semesters[0] || null;

  // Load sections
  await loadSections();

  // Load professors
  await loadProfessors();
}

async function loadSections() {
  try {
    let url = endpoints.sections;
    if (state.activeSemester?.id) {
      url += `?semester=${state.activeSemester.id}`;
    }
    const response = await api.get(url);
    state.sections = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading sections');
    state.sections = [];
  }
}

async function loadProfessors() {
  try {
    const response = await api.get(endpoints.professors);
    state.professors = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading professors');
    state.professors = [];
  }
}

async function loadAllStudents() {
  if (state.allStudents.length > 0 || state.studentsError) return; // Prevent retry if error or loaded

  state.loadingStudents = true;
  state.studentsError = false;
  render();

  try {
    // Fetch all enrollments
    const response = await api.get(endpoints.registrarAllStudents);
    const enrollments = response?.results || response || [];

    state.allStudents = enrollments.map(e => ({
      id: e.id,
      student_number: e.student_number || 'N/A',
      name: e.student_name || 'Unknown',
      email: e.student_email,
      program: e.program_code || 'N/A',
      year_level: '?', // Not returned by serializer
      status: e.status,
      date: e.created_at
    }));
  } catch (error) {
    console.warn('Error loading students:', error);
    state.studentsError = true;
    state.allStudents = [];
    Toast.error('Failed to load student list');
  } finally {
    state.loadingStudents = false;
    render();
  }
}

async function loadSectionDetails(sectionId) {
  try {
    const response = await api.get(endpoints.section(sectionId));
    state.selectedSection = response;

    // Load section subjects with schedules
    const subjectsResponse = await api.get(`${endpoints.sectionSubjects}?section=${sectionId}`);
    state.sectionSubjects = subjectsResponse?.results || subjectsResponse || [];

    // Build schedule from section subjects
    state.sectionSchedule = [];
    state.sectionSubjects.forEach(ss => {
      if (ss.schedule_slots) {
        ss.schedule_slots.forEach(slot => {
          state.sectionSchedule.push({
            id: slot.id,
            section_subject_id: ss.id,
            subject_id: ss.subject?.id || ss.subject,
            subject_code: ss.subject?.code || ss.subject_code,
            subject_title: ss.subject?.title || ss.subject_name,
            day: slot.day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            room: slot.room,
            professor: ss.professors?.[0] || ss.professor
          });
        });
      }
    });

    // Load enrolled students
    try {
      const enrollmentResponse = await api.get(endpoints.sectionEnrolledStudents(sectionId));
      state.enrolledStudents = enrollmentResponse?.students || [];
      // Update enrolled count if available
      if (state.selectedSection && enrollmentResponse?.enrolled_count !== undefined) {
        state.selectedSection.enrolled_count = enrollmentResponse.enrolled_count;
      }
    } catch (e) {
      console.warn('Failed to load enrolled students:', e);
      state.enrolledStudents = [];
    }

  } catch (error) {
    ErrorHandler.handle(error, 'Loading section details');
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
    role: 'REGISTRAR',
    activePage: 'registrar-sections',
    user: state.user
  })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Section & Schedule Management</h1>
        <p class="text-gray-600 mt-1">Manage sections, assign subjects, professors, and schedules</p>
      </div>

      <!-- Semester Filter -->
      <div class="mb-6 flex items-center gap-4">
        <label class="text-sm font-medium text-gray-700">Semester:</label>
        <select id="semester-filter" onchange="changeSemester(this.value)" class="form-select min-w-[200px]">
          ${state.semesters.map(sem => `
            <option value="${sem.id}" ${state.activeSemester?.id === sem.id ? 'selected' : ''}>
              ${sem.name} ${sem.is_current ? '(Current)' : ''}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Tabs -->
      ${createTabs({
    tabs: [
      { id: TABS.SECTIONS, label: 'Sections' },
      { id: TABS.SCHEDULE, label: 'Schedule Grid' }
    ],
    activeTab: state.activeTab,
    onTabChange: 'switchTab'
  })}

      <!-- Tab Content -->
      <div class="tab-content">
        ${renderTabContent()}
      </div>
    </main>
  `;
}

function renderTabContent() {
  switch (state.activeTab) {
    case TABS.SECTIONS:
      return state.selectedSection ? renderSectionDetail() : renderSectionsTab();
    case TABS.SCHEDULE:
      return renderScheduleTab();
    default:
      return renderSectionsTab();
  }
}

// ============================================================
// SECTIONS TAB - LIST VIEW
// ============================================================

function renderSectionsTab() {
  const filteredSections = getFilteredSections();
  const counts = getSectionCountsByYear();
  const { search, program, yearLevel } = state.sectionFilters;

  // Helper for year level formatting
  const formatYear = (y) => {
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };
    return `${y}${suffixes[y] || 'th'} Year`;
  };

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Sections</h2>
        <p class="text-sm text-gray-600 mt-1">
          ${state.sections.length} sections for ${state.activeSemester?.name || 'current semester'}
        </p>
      </div>
      <button onclick="openAddSectionModal()" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Add Section
      </button>
    </div>

    ${state.sections.length > 0 ? `
      <!-- Search and Filters -->
      <div class="card mb-4 bg-gray-50">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Search -->
          <div class="md:col-span-2">
            <label class="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div class="relative">
              <input type="text" 
                     id="section-search"
                     value="${search}"
                     onkeyup="handleSectionSearch(this.value)"
                     placeholder="Search by name or program..."
                     class="form-input pl-10">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          
          <!-- Program Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Program</label>
            <select onchange="handleSectionProgramFilter(this.value)" class="form-select text-sm">
              <option value="all" ${program === 'all' ? 'selected' : ''}>All Programs</option>
              ${state.programs.map(p => `
                <option value="${p.code}" ${program === p.code ? 'selected' : ''}>${p.code}</option>
              `).join('')}
            </select>
          </div>
          
          <!-- Year Level Filter -->
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Year Level</label>
            <select onchange="handleSectionYearFilter(this.value)" class="form-select text-sm">
              <option value="all" ${yearLevel === 'all' ? 'selected' : ''}>All Years</option>
              <option value="1" ${yearLevel === '1' || yearLevel === 1 ? 'selected' : ''}>1st Year</option>
              <option value="2" ${yearLevel === '2' || yearLevel === 2 ? 'selected' : ''}>2nd Year</option>
              <option value="3" ${yearLevel === '3' || yearLevel === 3 ? 'selected' : ''}>3rd Year</option>
              <option value="4" ${yearLevel === '4' || yearLevel === 4 ? 'selected' : ''}>4th Year</option>
            </select>
          </div>
        </div>
        
        ${(search || program !== 'all' || yearLevel !== 'all') ? `
          <div class="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
            <span class="text-sm text-gray-600">
              Showing <strong>${filteredSections.length}</strong> of ${counts.total} sections
            </span>
            <button onclick="clearSectionFilters()" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Clear Filters
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Quick Year Filter Badges -->
      <div class="flex flex-wrap gap-2 mb-4">
        <button onclick="handleSectionYearFilter('all')" 
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${yearLevel === 'all'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}">
          All (${counts.total})
        </button>
        ${[1, 2, 3, 4].map(y => `
          <button onclick="handleSectionYearFilter(${y})" 
                  class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${yearLevel === y || yearLevel === String(y)
            ? 'bg-blue-600 text-white'
            : counts[y] > 0
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-gray-50 text-gray-400 cursor-not-allowed'}"
                  ${counts[y] === 0 ? 'disabled' : ''}>
            ${formatYear(y)} (${counts[y]})
          </button>
        `).join('')}
      </div>
    ` : ''}

    ${state.sections.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <p class="text-gray-500 text-lg">No sections found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Section" to create your first section</p>
      </div>
    ` : filteredSections.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No sections match your filters</p>
        <button onclick="clearSectionFilters()" class="mt-4 text-blue-600 hover:text-blue-800 font-medium">
          Clear Filters
        </button>
      </div>
    ` : `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filteredSections.map(section => {
                const enrolled = section.enrolled_count || 0;
                const capacity = section.capacity || 40;
                const percentage = Math.round((enrolled / capacity) * 100);
                const isNearFull = percentage >= 80;
                const isFull = percentage >= 100;

                return `
          <div class="card hover:shadow-lg transition-all cursor-pointer border-l-4 ${section.year_level === 1 ? 'border-l-green-500' :
                    section.year_level === 2 ? 'border-l-blue-500' :
                      section.year_level === 3 ? 'border-l-purple-500' :
                        'border-l-orange-500'
                  }" onclick="viewSection('${section.id}')">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-bold text-gray-800">${section.name}</h3>
                <p class="text-sm text-gray-500">${section.program_code || section.program?.code || 'N/A'}</p>
              </div>
              <span class="px-2 py-1 text-xs font-medium rounded ${section.year_level === 1 ? 'bg-green-100 text-green-800' :
                    section.year_level === 2 ? 'bg-blue-100 text-blue-800' :
                      section.year_level === 3 ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                  }">
                Year ${section.year_level || 'N/A'}
              </span>
            </div>
            
            <!-- Enrollment Progress -->
            <div class="mb-3">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-600">Enrolled</span>
                <span class="${isFull ? 'text-red-600 font-bold' : isNearFull ? 'text-orange-600' : 'text-gray-700'}">
                  ${enrolled}/${capacity}
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="h-2 rounded-full transition-all ${isFull ? 'bg-red-500' : isNearFull ? 'bg-orange-500' : 'bg-blue-500'
                  }" style="width: ${Math.min(100, percentage)}%"></div>
              </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                </svg>
                ${section.subject_count || 0} subjects
              </span>
              <span class="text-blue-600 font-medium text-xs">View →</span>
            </div>
          </div>
        `}).join('')}
      </div>
    `}
  `;
}

function renderStudentsTab() {
  if (state.studentsError) {
    return `
      <div class="text-center py-16 text-gray-500">
        <p class="text-red-500 mb-2">Failed to load students.</p>
        <button onclick="loadAllStudents()" class="text-blue-600 hover:text-blue-800 underline">Try again</button>
      </div>
    `;
  }

  // Trigger load if empty and not loading
  if (state.allStudents.length === 0 && !state.loadingStudents) {
    loadAllStudents();
    return `
      <div class="flex flex-col items-center justify-center py-16">
        <div class="spinner border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        <p class="mt-4 text-gray-500">Loading enrolled students...</p>
      </div>
    `;
  }

  if (state.loadingStudents) {
    return `
      <div class="flex flex-col items-center justify-center py-16">
        <div class="spinner border-4 border-blue-500 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
        <p class="mt-4 text-gray-500">Loading enrolled students...</p>
      </div>
    `;
  }

  return `
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-800">All Enrolled Students <span class="text-sm font-normal text-gray-500">(${state.allStudents.length})</span></h2>
        <div class="flex gap-2">
           <button class="text-sm text-blue-600 hover:text-blue-800 font-medium">Export List</button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th class="py-3 px-4">Student Name</th>
              <th class="py-3 px-4">ID Number</th>
              <th class="py-3 px-4">Program</th>
              <th class="py-3 px-4">Year</th>
              <th class="py-3 px-4">Enrolled Date</th>
              <th class="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y">
            ${state.allStudents.map(student => {
    // Safe initials logic
    const names = (student.name || '').trim().split(' ');
    const initials = names.length > 1
      ? `${names[0][0]}${names[names.length - 1][0]}`
      : (student.name || '?').substring(0, 2).toUpperCase();

    const status = String(student.status || '').toUpperCase();

    return `
              <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 font-medium text-gray-800">
                  <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-xs mr-3">
                      ${initials}
                    </div>
                    ${student.name}
                  </div>
                </td>
                <td class="py-3 px-4 text-gray-600">${student.student_number}</td>
                <td class="py-3 px-4 text-gray-600">${student.program}</td>
                <td class="py-3 px-4 text-gray-600">${student.year_level !== '?' ? 'Year ' + student.year_level : '-'}</td>
                <td class="py-3 px-4 text-gray-600">${new Date(student.date).toLocaleDateString()}</td>
                <td class="py-3 px-4">
                  <span class="inline-flex px-2 py-1 rounded text-xs font-semibold ${status === 'ENROLLED' || status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
        status === 'PENDING' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
      }">
                    ${student.status}
                  </span>
                </td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}




// ============================================================
// SECTION DETAIL VIEW
// ============================================================

function renderSectionDetail() {
  const section = state.selectedSection;
  const activeTab = state.sectionDetailTab || 'subjects';

  return `
    <!-- Back Button -->
    <button onclick="backToSections()" class="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
      Back to Sections
    </button>

    <!-- Section Header -->
    <div class="card mb-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-2xl font-bold text-gray-800">${section.name}</h2>
          <p class="text-gray-600 mt-1">${section.program_code || section.program?.code} - Year ${section.year_level}</p>
          <p class="text-sm text-gray-500 mt-2">${section.enrolled_count || 0}/${section.capacity || 40} students enrolled</p>
        </div>
        <div class="flex gap-2">
          <button onclick="openAssignSubjectModal()" class="btn btn-primary">
            Assign Subject
          </button>
          <button onclick="openEditSectionModal()" class="btn btn-secondary">
            Edit Section
          </button>
        </div>
      </div>
    </div>

    <!-- Sub Navigation -->
    <div class="flex border-b border-gray-200 mb-6">
      <button onclick="switchSectionDetailTab('subjects')" class="px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'subjects' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
        Subjects
      </button>
      <button onclick="switchSectionDetailTab('students')" class="px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'students' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
        Enrolled Students (${state.enrolledStudents.length})
      </button>
    </div>

    ${activeTab === 'subjects' ? renderSectionSubjectsList() : renderSectionStudentsList()}
  `;
}

function renderSectionSubjectsList() {
  return `
      <!-- Assigned Subjects -->
      <div class="card bg-white">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Assigned Subjects</h3>
          ${state.sectionSubjects.length === 0 ? `
            <p class="text-gray-500 text-center py-8">No subjects assigned yet</p>
          ` : `
            <div class="space-y-3">
              ${state.sectionSubjects.map(ss => {
    const subject = ss.subject || {};
    const professor = ss.professors?.[0] || ss.professor;
    return `
                  <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <p class="font-bold text-blue-600">${subject.code || ss.subject_code}</p>
                        <p class="text-sm text-gray-700">${subject.title || ss.subject_name || ''}</p>
                        <div class="flex items-center gap-2 mt-1">
                          ${professor ? `
                            <span class="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                              </svg>
                              ${professor.first_name || ''} ${professor.last_name || ''}
                            </span>
                          ` : `
                            <span class="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                              </svg>
                              No professor
                            </span>
                          `}
                          <button onclick="openEditProfessorModal('${ss.id}')" class="text-xs text-blue-600 hover:text-blue-800 underline">
                            ${professor ? 'Change' : 'Assign'}
                          </button>
                        </div>
                      </div>
                      <div class="flex flex-col gap-1">
                        <button onclick="openScheduleSlotModal('${ss.id}')"
                                class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded">
                          + Schedule
                        </button>
                        <button onclick="removeSectionSubject('${ss.id}')"
                                class="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded">
                          Remove
                        </button>
                      </div>
                    </div>
                    ${ss.schedule_slots && ss.schedule_slots.length > 0 ? `
                      <div class="mt-2 pt-2 border-t border-gray-200">
                        ${ss.schedule_slots.map(slot => `
                          <p class="text-xs text-gray-600">
                            ${slot.day} ${slot.start_time}-${slot.end_time} | ${slot.room || 'TBA'}
                          </p>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `;
  }).join('')}
            </div>
          `}
      </div>
    `;
}

function renderSectionStudentsList() {
  return `
    <div class="mt-6 card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-gray-800">
          Enrolled Students 
          <span class="text-sm font-normal text-gray-500 ml-2">(${state.enrolledStudents.length} students)</span>
        </h3>
        <button class="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Export List
        </button>
      </div>

      ${state.enrolledStudents.length === 0 ? `
        <div class="text-center py-8 text-gray-500">
          <p>No students enrolled yet.</p>
        </div>
      ` : `
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${state.enrolledStudents.map(student => `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold text-xs mr-3">
                        ${(student.first_name || '?')[0]}${(student.last_name || '?')[0]}
                      </div>
                      <div>
                        <div class="text-sm font-medium text-gray-900">${student.last_name}, ${student.first_name}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${student.student_number}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${student.email}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-500">
                    <div class="flex flex-wrap gap-1">
                      ${(student.subjects || []).map(subj => `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${subj.status === 'PASSED' ? 'bg-green-100 text-green-800' :
      subj.status === 'FAILED' ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
    }" title="${subj.title}">
                          ${subj.code}
                        </span>
                      `).join('')}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
    `;
}

window.switchSectionDetailTab = function (tab) {
  state.sectionDetailTab = tab;
  render();
};

function renderSectionScheduleGrid() {
  if (state.sectionSchedule.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <p>No schedule slots defined yet</p>
        <p class="text-sm mt-1">Assign subjects and add schedules to see them here</p>
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10 w-16">Time</th>
            ${DAYS.map(day => `
              <th class="border border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase min-w-[100px]">${day.short}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${TIME_SLOTS.map(timeSlot => `
            <tr>
              <td class="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">${formatTime(timeSlot)}</td>
              ${DAYS.map(day => renderScheduleCell(day.code, timeSlot)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderScheduleCell(day, timeSlot) {
  const slots = state.sectionSchedule.filter(s => {
    if (s.day !== day) return false;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const startHour = parseInt(s.start_time?.split(':')[0] || '0');
    const endHour = parseInt(s.end_time?.split(':')[0] || '0');
    return slotHour >= startHour && slotHour < endHour;
  });

  if (slots.length === 0) {
    return `<td class="border border-gray-200 px-1 py-1 bg-white h-8"></td>`;
  }

  const slot = slots[0];
  const isFirstSlot = timeSlot === slot.start_time?.substring(0, 5);

  if (!isFirstSlot) {
    return `<td class="border-0"></td>`;
  }

  const duration = calculateDuration(slot.start_time, slot.end_time);
  const color = getSubjectColor(slot.subject_code);

  return `
    <td class="border border-gray-200 px-1 py-1 align-top" rowspan="${duration}">
      <div class="rounded border-l-4 p-1 h-full ${color} text-xs">
        <div class="font-bold">${slot.subject_code}</div>
        <div class="opacity-80">${slot.room || 'TBA'}</div>
      </div>
    </td>
  `;
}

// ============================================================
// SCHEDULE TAB - FULL GRID VIEW
// ============================================================

function renderScheduleTab() {
  return `
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Schedule Grid</h2>
          <p class="text-sm text-gray-600 mt-1">View section schedules</p>
        </div>
        <div class="flex gap-2">
          ${state.selectedSection ? `
            <button onclick="viewSection('${state.selectedSection.id}')" class="btn btn-secondary">
              View Section Details
            </button>
          ` : ''}
          <select id="section-filter" onchange="filterScheduleBySection(this.value)" class="form-select">
            <option value="">Select Section...</option>
            ${state.sections.map(s => `
              <option value="${s.id}" ${state.selectedSection?.id === s.id ? 'selected' : ''}>${s.name}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    ${state.selectedSection ? `
      <div class="card overflow-hidden">
        ${renderSectionScheduleGrid()}
      </div>
    ` : `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p class="text-gray-500 text-lg">Select a section to view its schedule</p>
        <p class="text-gray-400 text-sm mt-2">Or click on a section card in the Sections tab</p>
      </div>
    `}
  `;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${ampm}`;
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return 1;
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return Math.max(1, end - start);
}

// ============================================================
// EVENT HANDLERS - TAB SWITCHING
// ============================================================

window.switchTab = function (tabId) {
  state.activeTab = tabId;
  updateHash(tabId);
  render();
};

window.changeSemester = async function (semesterId) {
  state.activeSemester = state.semesters.find(s => s.id === semesterId);
  state.selectedSection = null;
  // Reset filters when semester changes
  state.sectionFilters = { search: '', program: 'all', yearLevel: 'all' };
  await loadSections();
  render();
};

// Section filter handlers - efficient client-side filtering
let searchTimeout = null;
window.handleSectionSearch = function (value) {
  // Debounce search for performance with large datasets
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.sectionFilters.search = value;
    render();
  }, 200);
};

window.handleSectionProgramFilter = function (program) {
  state.sectionFilters.program = program;
  render();
};

window.handleSectionYearFilter = function (year) {
  state.sectionFilters.yearLevel = year;
  render();
};

window.clearSectionFilters = function () {
  state.sectionFilters = { search: '', program: 'all', yearLevel: 'all' };
  render();
};

// ============================================================
// EVENT HANDLERS - SECTIONS
// ============================================================

window.viewSection = async function (sectionId) {
  await loadSectionDetails(sectionId);
  render();
};

window.backToSections = function () {
  state.selectedSection = null;
  state.sectionSubjects = [];
  state.sectionSchedule = [];
  render();
};

window.openAddSectionModal = function () {
  const modal = new Modal({
    title: 'Add New Section',
    content: `
      <form id="add-section-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
          <input type="text" id="section-name" required class="form-input" placeholder="e.g., BSIT-1A">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Program *</label>
          <select id="section-program" required class="form-select">
            <option value="">Select Program</option>
            ${state.programs.map(p => `
              <option value="${p.id}">${p.code} - ${p.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
            <select id="section-year" required class="form-select">
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" id="section-capacity" value="40" min="1" max="100" class="form-input">
          </div>
        </div>
      </form>
    `,
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Create Section',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-section-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            name: document.getElementById('section-name').value,
            program: document.getElementById('section-program').value,
            semester: state.activeSemester?.id,
            year_level: parseInt(document.getElementById('section-year').value),
            capacity: parseInt(document.getElementById('section-capacity').value) || 40
          };

          try {
            await api.post(endpoints.sections, data);
            Toast.success('Section created successfully');
            m.close();
            await loadSections();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Creating section');
          }
        }
      }
    ]
  });
  modal.show();
};

window.openAssignSubjectModal = async function () {
  if (!state.selectedSection) {
    Toast.error('No section selected');
    return;
  }

  const section = state.selectedSection;
  const programId = section.program?.id || section.program_id || section.program;

  console.log('Loading subjects for section:', section.name, 'programId:', programId);

  // Show loading state
  state.loadingSubjects = true;

  // Load subjects for the program
  try {
    // Try program-specific subjects first
    let subjectsUrl = endpoints.manageSubjects;
    if (programId) {
      subjectsUrl += `?program=${programId}`;
    }

    console.log('Fetching subjects from:', subjectsUrl);
    const response = await api.get(subjectsUrl);
    console.log('Subjects response:', response);

    // Handle different response formats
    if (Array.isArray(response)) {
      state.programSubjects = response;
    } else if (response?.results && Array.isArray(response.results)) {
      state.programSubjects = response.results;
    } else if (response?.subjects && Array.isArray(response.subjects)) {
      state.programSubjects = response.subjects;
    } else {
      state.programSubjects = [];
    }

    // Filter to show only subjects not already assigned to this section
    const assignedSubjectIds = state.sectionSubjects.map(ss => ss.subject?.id || ss.subject);
    state.programSubjects = state.programSubjects.filter(s => !assignedSubjectIds.includes(s.id));

    console.log('Filtered subjects (not yet assigned):', state.programSubjects.length);
  } catch (error) {
    console.error('Error loading subjects:', error);
    ErrorHandler.handle(error, 'Loading subjects');
    state.programSubjects = [];
  }

  state.loadingSubjects = false;

  const modal = new Modal({
    title: 'Assign Subject to Section',
    content: `
      <form id="assign-subject-form" class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-blue-800 text-sm">
            <strong>Section:</strong> ${section.name}<br>
            <strong>Program:</strong> ${section.program_code || section.program?.code || 'N/A'}<br>
            <strong>Year Level:</strong> ${section.year_level}
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
          ${state.programSubjects.length === 0 ? `
            <div class="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">No available subjects to assign</div>
          ` : `
            <select id="assign-subject-id" required class="form-select">
              <option value="">Select a subject...</option>
              ${state.programSubjects.map(s => `
                <option value="${s.id}">${s.code} - ${s.title || s.name} (Year ${s.year_level}, Sem ${s.semester})</option>
              `).join('')}
            </select>
          `}
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Professor</label>
          <select id="assign-professor-id" class="form-select">
            <option value="">TBA (To Be Announced)</option>
            ${state.professors.map(p => `
              <option value="${p.id}">${p.first_name} ${p.last_name}</option>
            `).join('')}
          </select>
          <p class="text-xs text-gray-500 mt-1">Optional - can be assigned later</p>
        </div>
      </form>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Assign Subject',
        primary: true,
        onClick: async (m) => {
          const subjectId = document.getElementById('assign-subject-id')?.value;
          const professorId = document.getElementById('assign-professor-id')?.value;

          if (!subjectId) {
            Toast.error('Please select a subject');
            return;
          }

          const data = {
            section: section.id,
            subject: subjectId
          };

          if (professorId) {
            data.professor = professorId;
          }

          try {
            await api.post(endpoints.sectionSubjects, data);
            Toast.success('Subject assigned successfully');
            m.close();

            // Refresh section details
            await loadSectionDetails(section.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Assigning subject');
          }
        }
      }
    ]
  });

  modal.show();
};

window.openEditProfessorModal = function (sectionSubjectId) {
  const sectionSubject = state.sectionSubjects.find(ss => ss.id === sectionSubjectId);
  if (!sectionSubject) {
    Toast.error('Section subject not found');
    return;
  }

  const subject = sectionSubject.subject || {};
  const currentProfessor = sectionSubject.professors?.[0] || sectionSubject.professor;

  const modal = new Modal({
    title: 'Assign Professor',
    content: `
      <form id="edit-professor-form" class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p class="text-blue-800 text-sm">
            <strong>Subject:</strong> ${subject.code || sectionSubject.subject_code} - ${subject.title || sectionSubject.subject_name || ''}<br>
            <strong>Current:</strong> ${currentProfessor ? (currentProfessor.name || `Prof. ${currentProfessor.first_name} ${currentProfessor.last_name}`) : 'Not assigned'}
          </p>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Professor *</label>
          <select id="edit-professor-id" class="form-select">
            <option value="">TBA (To Be Announced)</option>
            ${state.professors.map(p => `
              <option value="${p.id}" ${currentProfessor?.id === p.id ? 'selected' : ''}>
                ${p.first_name} ${p.last_name}
              </option>
            `).join('')}
          </select>
        </div>
      </form>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Update Professor',
        primary: true,
        onClick: async (m) => {
          const professorId = document.getElementById('edit-professor-id')?.value;

          const data = {
            professor: professorId || null
          };

          try {
            await api.patch(endpoints.sectionSubject(sectionSubjectId), data);
            Toast.success('Professor updated successfully');
            m.close();

            // Refresh section details
            await loadSectionDetails(state.selectedSection.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Updating professor');
          }
        }
      }
    ]
  });

  modal.show();
};

window.removeSectionSubject = async function (sectionSubjectId) {
  const sectionSubject = state.sectionSubjects.find(ss => ss.id === sectionSubjectId);
  if (!sectionSubject) return;

  const subject = sectionSubject.subject || {};

  const confirmed = await ConfirmModal({
    title: 'Remove Subject',
    message: `Are you sure you want to remove "${subject.code || sectionSubject.subject_code}" from this section? This will also remove all schedule slots for this subject.`,
    confirmLabel: 'Remove',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.sectionSubject(sectionSubjectId));
    Toast.success('Subject removed from section');

    // Refresh section details
    await loadSectionDetails(state.selectedSection.id);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Removing subject');
  }
};

window.openScheduleSlotModal = function (sectionSubjectId) {
  const modal = new Modal({
    title: 'Add Schedule Slot',
    content: `
      <form id="add-schedule-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Day *</label>
          <select id="slot-day" required class="form-select">
            ${DAYS.map(d => `<option value="${d.code}">${d.name}</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <select id="slot-start" required class="form-select">
              ${TIME_SLOTS.map(t => `<option value="${t}">${formatTime(t)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
            <select id="slot-end" required class="form-select">
              ${TIME_SLOTS.map(t => `<option value="${t}">${formatTime(t)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Room</label>
          <select id="slot-room" class="form-select">
            <option value="">TBA</option>
            ${ROOMS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
      </form>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Add Schedule',
        primary: true,
        onClick: async (m) => {
          const data = {
            section_subject: sectionSubjectId,
            day: document.getElementById('slot-day').value,
            start_time: document.getElementById('slot-start').value,
            end_time: document.getElementById('slot-end').value,
            room: document.getElementById('slot-room').value || ''
          };

          // Validate end time > start time
          if (data.end_time <= data.start_time) {
            Toast.error('End time must be after start time');
            return;
          }

          try {
            await api.post(endpoints.scheduleSlots, data);
            Toast.success('Schedule slot added');
            m.close();
            await loadSectionDetails(state.selectedSection.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding schedule slot');
          }
        }
      }
    ]
  });
  modal.show();
};

window.deleteSection = async function (sectionId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Section',
    message: 'Are you sure you want to delete this section? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.section(sectionId));
    Toast.success('Section deleted successfully');
    state.selectedSection = null;
    await loadSections();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting section');
  }
};

window.filterScheduleBySection = async function (sectionId) {
  if (!sectionId) {
    state.sectionSchedule = [];
    render();
    return;
  }
  await loadSectionDetails(sectionId);
  render();
};

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
