// frontend\src\pages\registrar-academic.js
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate, setButtonLoading } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, initHashNavigation, updateHash } from '../components/tabs.js';

// Tab constants
const TABS = {
  PROGRAMS: 'programs',
  PROFESSORS: 'professors',
  SECTIONS: 'sections',
  CURRICULA: 'curricula',
  SEMESTERS: 'semesters'
};

// Section Constants
const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' },
  { code: 'SUN', name: 'Sunday', short: 'Sun' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

const ROOMS = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
  'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
  'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'
];

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
  activeTab: TABS.PROGRAMS,

  // Navigation State (New)
  activeProgram: null, // For Program > Curricula view
  subView: 'list', // 'list' or 'program_curricula'

  // Programs state
  programs: [],
  programModal: null,
  editingProgram: null,

  // Professors state
  professors: [],
  professorModal: null,
  editingProfessor: null,
  subjectSelectionModal: null,
  professorSearch: '',

  // Subject selection state for professors
  profSubjectState: {
    selected: [],
    results: [],
    search: ''
  },

  // Curricula state
  curricula: [],
  selectedCurriculum: null,
  curriculumModal: null,

  // Semesters state
  semesters: [],
  filteredSemesters: [],
  activeSemester: null,
  semesterFilterYear: 'all',
  showSemesterAddModal: false,
  showSemesterEditModal: false,
  editingSemester: null,
  semesterFormData: {
    name: '1st Semester',
    academic_year: '',
    start_date: '',
    end_date: '',
    enrollment_start_date: '',
    enrollment_end_date: '',
    is_current: false
  },

  // Sections state
  sections: [],
  selectedSection: null,
  sectionSubjects: [],
  sectionSchedule: [],
  sectionSearch: '',
  sectionFilterProgram: 'all',
  sectionFilterYear: 'all'
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadPrograms();

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

async function loadPrograms() {
  try {
    const response = await api.get(endpoints.managePrograms);
    state.programs = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading programs');
    state.programs = [];
  }
}

async function loadSubjects(programId = null) {
  try {
    const url = programId
      ? `${endpoints.manageSubjects}?program=${programId}`
      : endpoints.manageSubjects;
    const response = await api.get(url);
    state.subjects = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subjects');
    state.subjects = [];
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

async function loadCurricula(programId = null) {
  try {
    const url = programId
      ? `${endpoints.curricula}?program=${programId}`
      : endpoints.curricula;
    const response = await api.get(url);
    state.curricula = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading curricula');
    state.curricula = [];
  }
}

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    console.log('API Response (Semesters):', response);

    let semestersList = [];
    if (response && response.semesters) {
      // Custom format from earlier impl
      semestersList = response.semesters;
    } else if (response && response.results) {
      // DRF Standard Pagination
      semestersList = response.results;
    } else if (Array.isArray(response)) {
      // Direct List
      semestersList = response;
    }

    console.log('Parsed Semesters List:', semestersList);
    state.semesters = semestersList || [];
    state.activeSemester = state.semesters.find(s => s.is_current);

    filterSemesters();
  } catch (error) {
    console.error('Error loading semesters:', error);
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
  }
}

function filterSemesters() {
  console.log('Filtering Semesters. State:', { total: state.semesters.length, filter: state.semesterFilterYear });
  if (state.semesterFilterYear === 'all') {
    state.filteredSemesters = state.semesters;
  } else {
    state.filteredSemesters = state.semesters.filter(s => s.academic_year === state.semesterFilterYear);
  }
}


function getUniqueAcademicYears() {
  const years = [...new Set(state.semesters.map(s => s.academic_year))];
  return years.sort().reverse();
}

function formatSemesterDate(dateString) {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadSections() {
  try {
    let url = endpoints.sections;
    const params = [];
    if (state.activeSemester?.id) params.push(`semester=${state.activeSemester.id}`);
    if (state.sectionFilterProgram !== 'all') params.push(`program=${state.sectionFilterProgram}`);

    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await api.get(url);
    state.sections = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading sections');
    state.sections = [];
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
            subject_code: ss.subject_code,
            subject_title: ss.subject_title,
            day: slot.day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            room: slot.room,
            professor_id: slot.professor,
            professor_name: slot.professor_name
          });
        });
      }
    });
  } catch (error) {
    ErrorHandler.handle(error, 'Loading section details');
  }
}

function getFilteredSections() {
  let filtered = [...state.sections];

  if (state.sectionSearch) {
    const q = state.sectionSearch.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
  }

  if (state.sectionFilterYear !== 'all') {
    filtered = filtered.filter(s => s.year_level === parseInt(state.sectionFilterYear));
  }

  return filtered;
}

function getSubjectColor(subjectCode) {
  const codes = [...new Set(state.sectionSchedule.map(s => s.subject_code))];
  const index = codes.indexOf(subjectCode);
  return COLORS[index % COLORS.length];
}

function formatTime(time24) {
  if (!time24) return '';
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

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading academic structure...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
    role: 'REGISTRAR',
    activePage: 'registrar-academic',
    user: state.user
  })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Breadcrumbs -->
      ${renderBreadcrumbs()}

      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Academic Structure</h1>
        <p class="text-gray-600 mt-1">Manage programs, subjects, and curricula</p>
      </div>

      <!-- Tabs -->
      ${createTabs({
    tabs: [
      { id: TABS.PROGRAMS, label: 'Programs' },
      { id: TABS.PROFESSORS, label: 'Professors' },
      { id: TABS.SECTIONS, label: 'Sections' },
      { id: TABS.SEMESTERS, label: 'Semesters' }
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

function renderBreadcrumbs() {
  const parts = [];

  // Base
  parts.push(`<span class="text-gray-500">Academic Structure</span>`);

  // Active Tab
  if (state.activeTab === TABS.PROGRAMS) {
    parts.push(`<a href="#" onclick="event.preventDefault(); switchTab('${TABS.PROGRAMS}')" class="text-blue-600 hover:text-blue-800">Programs</a>`);

    // Sub-view: Program Curricula
    if (state.subView === 'program_curricula' && state.activeProgram) {
      parts.push(`<span class="text-gray-900 font-medium">${state.activeProgram.code} - Curricula</span>`);
    }
  } else if (state.activeTab === TABS.PROFESSORS) {
    parts.push(`<span class="text-gray-900">Professors</span>`);
  } else if (state.activeTab === TABS.SECTIONS) {
    parts.push(`<a href="#" onclick="event.preventDefault(); switchTab('${TABS.SECTIONS}')" class="text-blue-600 hover:text-blue-800">Sections</a>`);
    if (state.selectedSection) {
      parts.push(`<span class="text-gray-900 font-medium">${state.selectedSection.name}</span>`);
    }
  } else if (state.activeTab === TABS.CURRICULA) {
    parts.push(`<span class="text-gray-900">All Curricula</span>`);
  } else if (state.activeTab === TABS.SEMESTERS) {
    parts.push(`<span class="text-gray-900">Semesters</span>`);
  }

  return `
    <nav class="flex mb-4" aria-label="Breadcrumb">
      <ol class="inline-flex items-center space-x-1 md:space-x-3">
        ${parts.map((part, index) => `
          <li class="inline-flex items-center">
            ${index > 0 ? `<svg class="w-3 h-3 text-gray-400 mx-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4"/>
            </svg>` : ''}
            <div class="flex items-center text-sm font-medium">
              ${part}
            </div>
          </li>
        `).join('')}
      </ol>
    </nav>
  `;
}

function renderTabContent() {
  switch (state.activeTab) {
    case TABS.PROGRAMS:
      if (state.subView === 'program_curricula') {
        return renderProgramCurriculaView();
      }
      if (state.subView === 'program_details') {
        return renderProgramDetailsView();
      }
      return renderProgramsTab();
    case TABS.PROFESSORS:
      return renderProfessorsTab();
    case TABS.SECTIONS:
      return state.selectedSection ? renderSectionDetail() : renderSectionsTab();
    case TABS.CURRICULA:
      return renderCurriculaTab(); // Original global view (optional/admin)
    case TABS.SEMESTERS:
      return renderSemestersTab();
    default:
      return renderProgramsTab();
  }
}

// ============================================================
// PROGRAMS TAB & NAVIGATION
// ============================================================

function getFilteredAndSortedPrograms() {
  let filtered = [...state.programs];

  // Filter
  if (state.programSearchQuery) {
    const q = state.programSearchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.department && p.department.toLowerCase().includes(q))
    );
  }

  // Sort
  const sortKey = state.programSortKey || 'name_asc';
  filtered.sort((a, b) => {
    switch (sortKey) {
      case 'name_asc': return a.name.localeCompare(b.name);
      case 'name_desc': return b.name.localeCompare(a.name);
      case 'dept_asc': return (a.department || '').localeCompare(b.department || '');
      case 'dept_desc': return (b.department || '').localeCompare(a.department || '');
      case 'curr_asc': return (a.total_curricula || 0) - (b.total_curricula || 0);
      case 'curr_desc': return (b.total_curricula || 0) - (a.total_curricula || 0);
      default: return a.name.localeCompare(b.name);
    }
  });

  return filtered;
}

window.handleProgramSearch = function (query) {
  state.programSearchQuery = query;
  render();
  // Restore focus
  setTimeout(() => {
    const el = document.getElementById('prog-search');
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, 0);
};

window.handleProgramSort = function (key) {
  state.programSortKey = key;
  render();
};

function renderProgramsTab() {
  const programs = getFilteredAndSortedPrograms();
  const sortKey = state.programSortKey || 'name_asc';

  const getSortIcon = (colKey) => {
    if (sortKey === `${colKey}_asc`) return '▲';
    if (sortKey === `${colKey}_desc`) return '▼';
    return '<span class="text-gray-300">↕</span>';
  };

  const nextSort = (colKey) => {
    // Toggle logic
    if (sortKey === `${colKey}_asc`) return `${colKey}_desc`;
    return `${colKey}_asc`;
  };

  return `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Programs</h2>
        <p class="text-sm text-gray-600 mt-1">Academic programs and curriculum tracks</p>
      </div>
      <div class="flex items-center gap-2">
         <div class="relative">
            <input type="text" 
                   id="prog-search"
                   placeholder="Search programs..." 
                   class="form-input text-sm pl-8 w-64"
                   value="${state.programSearchQuery || ''}"
                   oninput="handleProgramSearch(this.value)">
            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
         </div>
         <button onclick="openAddProgramModal()" class="btn btn-primary flex items-center gap-2 whitespace-nowrap">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Program
         </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th onclick="handleProgramSort('${nextSort('name')}')" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group">
                            <div class="flex items-center gap-1">
                                Program Name ${getSortIcon('name')}
                            </div>
                        </th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Code
                        </th>
                        <th onclick="handleProgramSort('${nextSort('dept')}')" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                            <div class="flex items-center gap-1">
                                Department ${getSortIcon('dept')}
                            </div>
                        </th>
                         <th onclick="handleProgramSort('${nextSort('curr')}')" class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                            <div class="flex items-center justify-center gap-1">
                                Curricula ${getSortIcon('curr')}
                            </div>
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${programs.length === 0 ? `
                        <tr>
                            <td colspan="5" class="px-6 py-12 text-center">
                                <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                                </svg>
                                <p class="text-gray-500 font-medium">No programs found.</p>
                                <p class="text-sm text-gray-400 mt-1">Try adjusting your search or add a new program.</p>
                            </td>
                        </tr>
                    ` : programs.map(program => `
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4">
                                <div class="text-sm font-bold text-gray-900">${program.name}</div>
                                ${program.description ? `<div class="text-xs text-gray-500 truncate max-w-[250px]">${program.description}</div>` : ''}
                                ${!program.is_active ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800 mt-1">Inactive</span>' : ''}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-100">
                                    ${program.code}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                ${program.department || '-'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${program.total_curricula > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                                    ${program.total_curricula || 0}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex items-center justify-end gap-2">
                                    <button onclick="viewProgramDetails('${program.id}')" class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors text-xs">
                                        View Curricula
                                    </button>
                                    <button onclick="openEditProgramModal('${program.id}')" class="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded transition-colors" title="Edit">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="deleteProgram('${program.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors" title="Delete">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;
}

// PROGRAM > DETAILS VIEW
window.viewProgramDetails = async function (programId) {
  const program = state.programs.find(p => p.id === programId);
  if (!program) return;

  state.activeProgram = program;
  state.subView = 'program_details';

  // Default detail tab
  state.programDetailTab = state.programDetailTab || 'subjects';

  // Load necessary data
  await Promise.all([
    loadCurricula(programId),
    loadSubjects(programId) // Ensure subjects are loaded for this program
  ]);

  render();
  window.scrollTo(0, 0);
};

window.switchProgramDetailTab = function (tab) {
  state.programDetailTab = tab;
  render();
};

function renderProgramDetailsView() {
  const program = state.activeProgram;
  if (!program) return renderProgramsTab();

  const activeTab = state.programDetailTab || 'subjects';

  return `
        <div class="mb-6">
            <button onclick="returnToProgramList()" class="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Programs
            </button>

            <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold text-gray-900">${program.code}</h1>
                        ${program.is_active
      ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>'
      : '<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>'
    }
                    </div>
                    <h2 class="text-xl text-gray-700 font-medium mb-2">${program.name}</h2>
                    ${program.description ? `<p class="text-gray-500 max-w-2xl">${program.description}</p>` : ''}
                    
                    <div class="flex gap-6 mt-4">
                        <div class="text-sm">
                            <span class="block text-gray-500">Duration</span>
                            <span class="font-semibold text-gray-900">${program.duration_years} Years</span>
                        </div>
                        <div class="text-sm">
                            <span class="block text-gray-500">Curricula</span>
                            <span class="font-semibold text-gray-900">${state.curricula.length} Versions</span>
                        </div>
                         <div class="text-sm">
                            <span class="block text-gray-500">Total Subjects</span>
                            <span class="font-semibold text-gray-900">${state.subjects.length} Subjects</span>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button onclick="openEditProgramModal('${program.id}')" class="btn btn-secondary flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        Edit Program
                    </button>
                    <button onclick="deleteProgram('${program.id}')" class="btn btn-danger flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Detail Tabs -->
        <div class="border-b border-gray-200 mb-6">
            <nav class="-mb-px flex space-x-8">
                <button onclick="switchProgramDetailTab('subjects')" class="${activeTab === 'subjects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    Subjects
                </button>
                <button onclick="switchProgramDetailTab('curricula')" class="${activeTab === 'curricula' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">
                    Curricula
                </button>
            </nav>
        </div>

        <!-- Tab Content -->
        <div>
            ${activeTab === 'subjects' ? renderProgramSubjectsTable() : ''}
            ${activeTab === 'curricula' ? renderProgramCurriculaList() : ''}
        </div>
    `;
}

// Helper for filtering/sorting
// Helper for filtering/sorting
function getFilteredAndSortedSubjects() {
  let filtered = [...state.subjects];

  // Search Filter
  if (state.subjectSearchQuery) {
    const q = state.subjectSearchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q)
    );
  }

  // Category Filter
  if (state.subjectFilterCategory && state.subjectFilterValue) {
    const category = state.subjectFilterCategory;
    const value = state.subjectFilterValue;

    if (category === 'year_level') {
      filtered = filtered.filter(s => String(s.year_level) === value);
    } else if (category === 'semester') {
      filtered = filtered.filter(s => String(s.semester_number) === value);
    } else if (category === 'grade_school') {
      // Example custom category if needed, effectively "Program" based on our structure
      // But since this is inside a Program View, "By Program" doesn't make sense unless it's a global subject list.
      // The request says "By Program" but we are in "Program Details > Subjects".
      // I will implement generic "By Type" if subject has type field.
      // For now, Year/Sem are relevant.
    }
  }

  // Sort
  const sortKey = state.subjectSortOrder || 'level_asc';

  filtered.sort((a, b) => {
    if (sortKey === 'code_asc') return a.code.localeCompare(b.code);
    if (sortKey === 'code_desc') return b.code.localeCompare(a.code);
    if (sortKey === 'title_asc') return a.title.localeCompare(b.title);
    if (sortKey === 'units_desc') return b.units - a.units;

    // Default: level_asc (Year > Sem > Code)
    if (a.year_level !== b.year_level) return (a.year_level || 0) - (b.year_level || 0);
    if (a.semester_number !== b.semester_number) return (a.semester_number || 0) - (b.semester_number || 0);
    return a.code.localeCompare(b.code);
  });

  return filtered;
}

// Event Handlers
window.handleProgramSubjectSearch = function (query) {
  state.subjectSearchQuery = query;
  render();
  restoreFocus('prog-subject-search');
};

window.handleProgramSubjectSort = function (order) {
  state.subjectSortOrder = order;
  render();
};

window.handleProgramSubjectFilter = function (category, value) {
  state.subjectFilterCategory = category;
  state.subjectFilterValue = value;
  render();
};

function restoreFocus(id) {
  setTimeout(() => {
    const input = document.getElementById(id);
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 0);
}

function renderProgramSubjectsTable() {
  const subjects = getFilteredAndSortedSubjects();

  return `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
             <h3 class="text-lg font-medium text-gray-900">Program Subjects Masterlist</h3>
             
             <div class="flex flex-wrap items-center gap-2">
                <!-- Search -->
                <div class="relative">
                    <input type="text" 
                        id="prog-subject-search" 
                        placeholder="Search subjects..." 
                        class="form-input text-sm pl-8 py-1.5 w-48 lg:w-64"
                        value="${state.subjectSearchQuery || ''}"
                        oninput="handleProgramSubjectSearch(this.value)">
                    <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>

                <!-- Filter -->
                <select onchange="const [c,v] = this.value.split(':'); handleProgramSubjectFilter(c,v)" class="form-select text-sm py-1.5 w-40">
                    <option value="">All Categories</option>
                    <optgroup label="Year Level">
                        <option value="year_level:1" ${state.subjectFilterValue === '1' ? 'selected' : ''}>Year 1</option>
                        <option value="year_level:2" ${state.subjectFilterValue === '2' ? 'selected' : ''}>Year 2</option>
                        <option value="year_level:3" ${state.subjectFilterValue === '3' ? 'selected' : ''}>Year 3</option>
                        <option value="year_level:4" ${state.subjectFilterValue === '4' ? 'selected' : ''}>Year 4</option>
                    </optgroup>
                    <optgroup label="Semester">
                        <option value="semester:1" ${state.subjectFilterValue === '1' && state.subjectFilterCategory === 'semester' ? 'selected' : ''}>1st Semester</option>
                        <option value="semester:2" ${state.subjectFilterValue === '2' && state.subjectFilterCategory === 'semester' ? 'selected' : ''}>2nd Semester</option>
                        <option value="semester:3" ${state.subjectFilterValue === '3' && state.subjectFilterCategory === 'semester' ? 'selected' : ''}>Summer</option>
                    </optgroup>
                </select>

                <!-- Sort -->
                <select onchange="handleProgramSubjectSort(this.value)" class="form-select text-sm py-1.5 w-40">
                    <option value="level_asc" ${state.subjectSortOrder === 'level_asc' ? 'selected' : ''}>Year Level (Asc)</option>
                    <option value="code_asc" ${state.subjectSortOrder === 'code_asc' ? 'selected' : ''}>Code (A-Z)</option>
                    <option value="code_desc" ${state.subjectSortOrder === 'code_desc' ? 'selected' : ''}>Code (Z-A)</option>
                    <option value="title_asc" ${state.subjectSortOrder === 'title_asc' ? 'selected' : ''}>Title (A-Z)</option>
                    <option value="units_desc" ${state.subjectSortOrder === 'units_desc' ? 'selected' : ''}>Units (High-Low)</option>
                </select>

                <button onclick="openAddSubjectModal()" class="btn btn-primary text-sm whitespace-nowrap px-3">
                    + Add
                </button>
             </div>
        </div>

        <div class="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
            <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                         <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                         <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                         <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                         <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Units</th>
                         <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Curricula</th>
                         <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prerequisites</th>
                         <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${subjects.length === 0 ? `
                        <tr>
                            <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                                No subjects found matching your filters.
                            </td>
                        </tr>
                    ` : subjects.map(s => `
                        <tr class="hover:bg-gray-50 group">
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${s.year_level ? `<span class="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium text-xs">Y${s.year_level} ${s.semester_number === 3 ? 'Sum' : 'S' + s.semester_number}</span>` : '-'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 font-mono">${s.code}</td>
                            <td class="px-6 py-4 text-sm text-gray-900">
                                <div class="font-medium">${s.title}</div>
                                ${s.description ? `<p class="text-xs text-gray-400 truncate max-w-[200px]">${s.description}</p>` : ''}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-medium">${s.units}</td>
                            <td class="px-6 py-4 text-sm">
                                <div class="flex flex-wrap gap-1 max-w-[200px]">
                                    ${s.curricula && s.curricula.length > 0
      ? s.curricula.map(c => `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100" title="${c.name || c}">${c.code || c}</span>`).join('')
      : '<span class="text-xs text-gray-300 italic">None</span>'}
                                </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                <div class="flex flex-wrap gap-1">
                                ${s.prerequisites && s.prerequisites.length > 0
      ? s.prerequisites.map(p => `<code class="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">${p.code}</code>`).join('')
      : '<span class="text-gray-300">-</span>'}
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick="openEditSubjectModal('${s.id}')" class="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded hover:bg-indigo-100" title="Edit">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="deleteSubject('${s.id}')" class="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded hover:bg-red-100" title="Delete">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </div>
        </div>
    `;
}

function renderProgramCurriculaList() {
  // Reuse existing render logic or simplified version
  // renderProgramCurriculaView() effectively does this but as a full page. 
  // We can extract the inner list logic.

  // Group by Effective Year
  const curriculaByYear = {};
  state.curricula.forEach(c => {
    if (!curriculaByYear[c.effective_year]) {
      curriculaByYear[c.effective_year] = [];
    }
    curriculaByYear[c.effective_year].push(c);
  });
  const sortedYears = Object.keys(curriculaByYear).sort().reverse();

  return `
      <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">Curriculum Versions</h3>
            <button onclick="openAddCurriculumModal()" class="btn btn-primary text-sm">
                + Add Curriculum
            </button>
      </div>

       ${state.curricula.length === 0 ? `
            <div class="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <p class="text-gray-500">No curricula defined yet.</p>
            </div>
       ` : `
            <div class="space-y-6">
            ${sortedYears.map(year => `
                <div>
                     <span class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Effective ${year}</span>
                     <div class="grid grid-cols-1 gap-3">
                        ${curriculaByYear[year].map(c => `
                            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center ${c.is_active ? 'border-l-4 border-l-green-500' : ''}">
                                <div>
                                    <div class="flex items-center gap-2 mb-1">
                                        <h4 class="text-lg font-bold text-gray-800">${c.code}</h4>
                                        ${c.is_active ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Active</span>' : ''}
                                    </div>
                                    <div class="text-sm text-gray-500 flex gap-4">
                                        <span>${c.total_subjects || 0} Subjects</span>
                                        <span>${c.total_units || 0} Units</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button onclick="viewCurriculum('${c.id}')" class="btn btn-sm btn-secondary">
                                        View Structure
                                    </button>
                                     <button onclick="openEditCurriculumModal('${c.id}')" class="p-2 text-gray-400 hover:text-blue-600">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    </button>
                                    <button onclick="deleteCurriculum('${c.id}')" class="p-2 text-gray-400 hover:text-red-600">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                     </div>
                </div>
            `).join('')}
            </div>
       `}
    `;
}

// PROGRAM > CURRICULA VIEW (New Page)
// Deprecated effectively by renderProgramDetailsView, but kept for compatibility logic ref if needed
function renderProgramCurriculaView() {
  if (!state.activeProgram) return renderProgramsTab();
  // ... (rest is handled by new view)
  return renderProgramDetailsView(); // Redirect logic
}

// ============================================================
// SUBJECTS TAB
// ============================================================

// ============================================================
// PROFESSORS TAB
// ============================================================

function renderProfessorsTab() {
  const filteredProfessors = state.professors.filter(p => {
    if (!state.professorSearch) return true;
    const q = state.professorSearch.toLowerCase();
    return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
  });

  return `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Professor Management</h2>
        <p class="text-sm text-gray-600 mt-1">Manage academic faculty and subject assignments</p>
      </div>
      
      <div class="flex items-center gap-4">
        <div class="relative">
            <input type="text" 
                   id="prof-search" 
                   placeholder="Search professors..." 
                   class="form-input text-sm pl-8 py-1.5 w-64"
                   value="${state.professorSearch || ''}"
                   oninput="handleProfessorSearch(this.value)">
            <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
        </div>
        
        <button onclick="openAddProfessorModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Professor
        </button>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Professor</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Subjects</th>
                    <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${filteredProfessors.length === 0 ? `
                    <tr>
                        <td colspan="5" class="px-6 py-12 text-center text-gray-500">
                            No professors found.
                        </td>
                    </tr>
                ` : filteredProfessors.map(p => `
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center">
                                <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                    ${(p.first_name || '?')[0]}${(p.last_name || '?')[0]}
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-bold text-gray-900">${p.full_name}</div>
                                    <div class="text-sm text-gray-500">${p.email}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${p.profile?.department || '<span class="text-gray-300">Not set</span>'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${p.profile?.specialization || '<span class="text-gray-300">Not set</span>'}
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex flex-wrap gap-1">
                                ${p.profile?.assigned_subjects && p.profile.assigned_subjects.length > 0
      ? p.profile.assigned_subjects.map(s => `<span class="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 font-medium">${s.code}</span>`).join('')
      : '<span class="text-gray-300 text-sm">-</span>'}
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="openEditProfessorModal('${p.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                            <button onclick="deleteProfessor('${p.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
  `;
}

window.handleProfessorSearch = function (query) {
  const input = document.getElementById('prof-search');
  const start = input?.selectionStart;
  const end = input?.selectionEnd;

  state.professorSearch = query;
  render();

  const newInput = document.getElementById('prof-search');
  if (newInput) {
    newInput.focus();
    if (start !== undefined && end !== undefined) {
      newInput.setSelectionRange(start, end);
    }
  }
};

function getProfessorForm(professor = null) {
  const isEdit = professor !== null;
  const profile = professor?.profile || {};

  return `
    <form id="professor-form" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input type="text" id="prof-first-name" value="${professor?.first_name || ''}" required class="form-input transition-colors">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input type="text" id="prof-last-name" value="${professor?.last_name || ''}" required class="form-input transition-colors">
        </div>
      </div>
      
      <div id="prof-name-loader" class="hidden flex items-center gap-2 text-xs text-blue-600 mt-[-10px] mb-2">
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Checking name availability...</span>
      </div>

      <div id="prof-name-error" class="hidden flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 mt-[-10px] mb-2 animate-pulse">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <span>A professor with this name already exists.</span>
      </div>
      
      <div id="prof-check-fail" class="hidden flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-100 mt-[-10px] mb-2">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Could not verify name uniqueness. Try again.</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
        <input type="email" id="prof-email" value="${professor?.email || ''}" required class="form-input" ${isEdit ? 'readonly' : ''}>
        ${isEdit ? '<p class="text-xs text-gray-500 mt-1">Email cannot be changed after creation.</p>' : ''}
      </div>

      <div id="prof-email-loader" class="hidden flex items-center gap-2 text-xs text-blue-600 mt-[-10px] mb-2">
        <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Checking email availability...</span>
      </div>

      <div id="prof-email-error" class="hidden flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 mt-[-10px] mb-2 animate-pulse">
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <span>This email has already exist in the system</span>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input type="text" id="prof-department" value="${profile.department || ''}" class="form-input" placeholder="e.g. Computer Studies">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
          <input type="text" id="prof-specialization" value="${profile.specialization || ''}" class="form-input" placeholder="e.g. Web Development">
        </div>
      </div>

      <div class="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
        <label class="flex items-center gap-2 cursor-pointer mb-2">
            <input type="checkbox" id="prof-auto-password" checked class="form-checkbox text-blue-600 rounded" onchange="toggleProfPassword(this.checked)">
            <div>
                <span class="text-sm font-medium text-blue-900">Auto-generate initial password</span>
                <p class="text-xs text-blue-700">If unchecked, you can manually set the password.</p>
            </div>
        </label>
        
        <div id="prof-password-container" class="hidden mt-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" id="prof-password" class="form-input bg-white" placeholder="Enter custom password">
        </div>
      </div>

      <div class="border-t border-gray-200 pt-4 mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Qualified Subjects</label>
        <div class="relative mb-2">
            <input type="text" 
                   id="prof-subject-search"
                   placeholder="Search subjects to assign..." 
                   class="form-input text-sm"
                   autocomplete="off">
            <div id="prof-subject-dropdown" class="hidden absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
               <!-- Results -->
            </div>
        </div>

        <div id="prof-selected-subjects" class="flex flex-wrap gap-2 min-h-[30px]">
             ${(profile.assigned_subjects || []).map(s => `
                <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <span class="font-mono font-medium">${s.code}</span>
                    <button type="button" onclick="removeProfessorSubject('${s.id}')" class="text-blue-600 hover:text-blue-800 ml-1">
                        &times;
                    </button>
                </span>
             `).join('')}
             ${!profile.assigned_subjects || profile.assigned_subjects.length === 0 ? '<p class="text-sm text-gray-400">No subjects assigned</p>' : ''}
        </div>
      </div>
    </form>
  `;
}

// Helper to toggle password field visibility
window.toggleProfPassword = function (checked) {
  const container = document.getElementById('prof-password-container');
  const input = document.getElementById('prof-password');
  if (checked) {
    container.classList.add('hidden');
    input.value = ''; // Clear if re-enabled
  } else {
    container.classList.remove('hidden');
  }
};

window.openAddProfessorModal = function () {
  state.editingProfessor = null;
  state.profSubjectState.selected = [];

  const modal = new Modal({
    title: 'Add New Professor',
    content: getProfessorForm(),
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => m.close()
      },
      {
        label: 'Create Professor',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('professor-form');
          const errorDiv = document.getElementById('prof-name-error');
          const loaderDiv = document.getElementById('prof-name-loader');
          const errorEmailDiv = document.getElementById('prof-email-error');
          const loaderEmailDiv = document.getElementById('prof-email-loader');

          // Prevent submit if duplicate error is visible or check is in progress
          if ((errorDiv && !errorDiv.classList.contains('hidden')) ||
            (loaderDiv && !loaderDiv.classList.contains('hidden')) ||
            (errorEmailDiv && !errorEmailDiv.classList.contains('hidden')) ||
            (loaderEmailDiv && !loaderEmailDiv.classList.contains('hidden'))) {
            return;
          }

          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          // Custom password validation
          const autoPass = document.getElementById('prof-auto-password').checked;
          const manualPass = document.getElementById('prof-password').value;

          if (!autoPass && !manualPass) {
            Toast.error('Please enter a password or enable auto-generation');
            return;
          }

          // Find the submit button via modal ID since m.element is undefined
          const modalEl = document.getElementById(m.modalId);
          const submitBtn = modalEl ? modalEl.querySelector('button.bg-blue-600.modal-action') : null;

          if (submitBtn && submitBtn.disabled) return;

          const data = {
            first_name: document.getElementById('prof-first-name').value,
            last_name: document.getElementById('prof-last-name').value,
            email: document.getElementById('prof-email').value,
            profile: {
              department: document.getElementById('prof-department').value,
              specialization: document.getElementById('prof-specialization').value,
              assigned_subject_ids: state.profSubjectState.selected.map(s => s.id)
            }
          };

          if (!autoPass && manualPass) {
            data.password = manualPass;
          }

          try {
            const response = await api.post(endpoints.professors, data);
            m.close();

            if (response.temp_password) {
              const credModal = new Modal({
                title: 'Professor Account Created',
                content: `
                        <div class="text-center">
                            <div class="mb-4">
                                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h3 class="text-lg font-bold text-gray-900">Account Successfully Created</h3>
                                <p class="text-sm text-gray-500">Please share these credentials with the professor.</p>
                            </div>
                            
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left mb-6">
                                <div class="mb-3">
                                    <label class="block text-xs text-gray-500 uppercase font-bold tracking-wider">Email (Username)</label>
                                    <div class="flex items-center gap-2">
                                        <code class="text-lg font-mono font-bold text-gray-800 select-all">${response.email}</code>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 uppercase font-bold tracking-wider">Initial Password</label>
                                    <div class="flex items-center justify-between gap-2">
                                        <code class="text-lg font-mono font-bold text-blue-600 select-all">${response.temp_password}</code>
                                    </div>
                                </div>
                            </div>

                            <p class="text-xs text-gray-500 italic">
                                The professor can change this password in their profile settings.
                            </p>
                        </div>
                    `,
                actions: [{ label: 'Done', primary: true, onClick: (cm) => cm.close() }]
              });
              credModal.show();
            } else {
              // Manual password case
              const okModal = new Modal({
                title: 'Professor Account Created',
                content: `
                   <div class="text-center py-4">
                      <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <h3 class="text-lg font-bold text-gray-900 mb-2">Success</h3>
                      <p class="text-gray-600">Professor account created with the manually set password.</p>
                   </div>
                 `,
                actions: [{ label: 'Close', primary: true, onClick: (cm) => cm.close() }]
              });
              okModal.show();
            }

            await loadProfessors();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding professor');
          }
        }
      }
    ]
  });

  state.professorModal = modal;
  modal.show();

  // Setup real-time duplicate check
  setTimeout(() => {
    setupProfessorSubjectSearch();
    setupDuplicateCheck(modal);
  }, 100);
};

// New helper for duplicate checking (Name & Email)
window.setupDuplicateCheck = function (modal) {
  const fnInput = document.getElementById('prof-first-name');
  const lnInput = document.getElementById('prof-last-name');
  const emailInput = document.getElementById('prof-email');

  const errorNameDiv = document.getElementById('prof-name-error');
  const loaderNameDiv = document.getElementById('prof-name-loader');
  const failDiv = document.getElementById('prof-check-fail');

  const errorEmailDiv = document.getElementById('prof-email-error');
  const loaderEmailDiv = document.getElementById('prof-email-loader');

  // Find the modal element using the ID generated by the Modal class
  const modalElement = document.getElementById(modal.modalId);
  const submitBtn = modalElement ? modalElement.querySelector('button.bg-blue-600.modal-action') : null;

  if (!fnInput || !lnInput || !errorNameDiv) return;

  // --- NAME CHECK LOGIC ---
  let nameDebounceTimer;
  const checkNameDuplicate = async () => {
    const fn = fnInput.value.trim();
    const ln = lnInput.value.trim();

    // Reset UI
    errorNameDiv.classList.add('hidden');
    if (failDiv) failDiv.classList.add('hidden');
    if (loaderNameDiv) loaderNameDiv.classList.add('hidden');

    if (!fn || !ln) {
      fnInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      lnInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      checkButtonState();
      return;
    }

    if (loaderNameDiv) loaderNameDiv.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await api.get(`${endpoints.professors}check-duplicate/?first_name=${encodeURIComponent(fn)}&last_name=${encodeURIComponent(ln)}`);

      if (loaderNameDiv) loaderNameDiv.classList.add('hidden');

      if (response.duplicate) {
        errorNameDiv.classList.remove('hidden');
        fnInput.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
        lnInput.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      } else {
        fnInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
        lnInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      }
      checkButtonState();
    } catch (e) {
      if (loaderNameDiv) loaderNameDiv.classList.add('hidden');
      if (failDiv) failDiv.classList.remove('hidden');
      checkButtonState(); // or keep disabled
    }
  };

  const handleNameInput = () => {
    clearTimeout(nameDebounceTimer);
    nameDebounceTimer = setTimeout(checkNameDuplicate, 300);
  };

  fnInput.addEventListener('input', handleNameInput);
  lnInput.addEventListener('input', handleNameInput);


  // --- EMAIL CHECK LOGIC ---
  let emailDebounceTimer;
  const checkEmailDuplicate = async () => {
    const email = emailInput.value.trim();

    errorEmailDiv.classList.add('hidden');
    if (loaderEmailDiv) loaderEmailDiv.classList.add('hidden');

    // Basic regex or just length check before calling api
    if (!email || !email.includes('@')) {
      emailInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      checkButtonState();
      return;
    }

    if (loaderEmailDiv) loaderEmailDiv.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await api.get(`${endpoints.professors}check-duplicate/?email=${encodeURIComponent(email)}`);

      if (loaderEmailDiv) loaderEmailDiv.classList.add('hidden');

      if (response.duplicate) {
        errorEmailDiv.classList.remove('hidden');
        emailInput.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      } else {
        emailInput.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-500');
      }
      checkButtonState();
    } catch (e) {
      if (loaderEmailDiv) loaderEmailDiv.classList.add('hidden');
      // could show failDiv too or separate one
      checkButtonState();
    }
  };

  const handleEmailInput = () => {
    clearTimeout(emailDebounceTimer);
    emailDebounceTimer = setTimeout(checkEmailDuplicate, 300);
  };

  if (emailInput && !emailInput.hasAttribute('readonly')) {
    emailInput.addEventListener('input', handleEmailInput);
  }

  // --- GLOBAL BUTTON STATE ---
  const checkButtonState = () => {
    if (!submitBtn) return;

    const isNameLoading = loaderNameDiv && !loaderNameDiv.classList.contains('hidden');
    const isEmailLoading = loaderEmailDiv && !loaderEmailDiv.classList.contains('hidden');
    const hasNameError = errorNameDiv && !errorNameDiv.classList.contains('hidden');
    const hasEmailError = errorEmailDiv && !errorEmailDiv.classList.contains('hidden');

    if (isNameLoading || isEmailLoading || hasNameError || hasEmailError) {
      submitBtn.disabled = true;
    } else {
      submitBtn.disabled = false;
    }
  };
};

window.openEditProfessorModal = async function (professorId) {
  try {
    const professor = await api.get(endpoints.professorDetail(professorId));
    state.editingProfessor = professor;
    state.profSubjectState.selected = (professor.profile?.assigned_subjects || []).map(s => ({
      id: s.id,
      code: s.code,
      title: s.title
    }));

    const modal = new Modal({
      title: 'Edit Professor',
      content: getProfessorForm(professor),
      actions: [
        {
          label: 'Cancel',
          onClick: (m) => m.close()
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('professor-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const data = {
              first_name: document.getElementById('prof-first-name').value,
              last_name: document.getElementById('prof-last-name').value,
              profile: {
                department: document.getElementById('prof-department').value,
                specialization: document.getElementById('prof-specialization').value,
                assigned_subject_ids: state.profSubjectState.selected.map(s => s.id)
              }
            };

            try {
              await api.patch(endpoints.professorDetail(professorId), data);
              Toast.success('Professor updated successfully');
              m.close();
              await loadProfessors();
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating professor');
            }
          }
        }
      ]
    });

    state.professorModal = modal;
    modal.show();
    setTimeout(() => setupProfessorSubjectSearch(), 100);
  } catch (error) {
    ErrorHandler.handle(error, 'Loading professor details');
  }
};

window.deleteProfessor = async function (professorId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Professor Account',
    message: 'Are you sure you want to deactivate this professor? They will no longer be able to log in or be assigned to sections.',
    confirmLabel: 'Deactivate',
    danger: true
  });

  if (!confirmed) return;

  try {
    // In many systems we don't hard delete users, but the API might support it or we patch is_active
    // The ProfessorViewSet get_queryset filters by is_active=True
    await api.patch(endpoints.professorDetail(professorId), { is_active: false });
    Toast.success('Professor deactivated successfully');
    await loadProfessors();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deactivating professor');
  }
};

window.setupProfessorSubjectSearch = function () {
  const searchInput = document.getElementById('prof-subject-search');
  const resultsDropdown = document.getElementById('prof-subject-dropdown');

  if (!searchInput || !resultsDropdown) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      resultsDropdown.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        // Search from API
        const response = await api.get(`${endpoints.manageSubjects}?search=${encodeURIComponent(query)}`);
        const subjects = response?.results || response || [];

        // Filter out already selected (robust ID check)
        const matches = subjects.filter(s => {
          return !state.profSubjectState.selected.some(sel => String(sel.id) === String(s.id));
        }).slice(0, 10);

        if (matches.length > 0) {
          resultsDropdown.innerHTML = matches.map(s => `
                <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-0" 
                     onclick="addProfessorSubject('${s.id}', '${s.code}', '${(s.title || '').replace(/'/g, "\\'")}')">
                    <div class="flex flex-col">
                        <span class="font-bold text-sm text-blue-600">${s.code}</span>
                        <span class="text-xs text-gray-500 truncate max-w-[200px]">${s.title}</span>
                    </div>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </div>
              `).join('');
          resultsDropdown.classList.remove('hidden');
        } else {
          resultsDropdown.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">No subjects found for "${query}"</div>`;
          resultsDropdown.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Error searching subjects:', error);
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.classList.add('hidden');
    }
  });
};

window.addProfessorSubject = function (id, code, title) {
  if (!state.profSubjectState.selected.find(s => s.id === id)) {
    state.profSubjectState.selected.push({ id, code, title });
  }
  updateProfessorSubjectTags();

  const searchInput = document.getElementById('prof-subject-search');
  const resultsDropdown = document.getElementById('prof-subject-dropdown');
  if (searchInput) searchInput.value = '';
  if (resultsDropdown) resultsDropdown.classList.add('hidden');
};

window.removeProfessorSubject = function (id) {
  state.profSubjectState.selected = state.profSubjectState.selected.filter(s => s.id !== id);
  updateProfessorSubjectTags();
};

window.updateProfessorSubjectTags = function () {
  const container = document.getElementById('prof-selected-subjects');
  if (!container) return;

  const selected = state.profSubjectState.selected;

  if (selected.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">No subjects assigned</p>';
    return;
  }

  container.innerHTML = selected.map(p => `
        <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <span class="font-mono font-medium" title="${p.title || ''}">${p.code}</span>
            <button type="button" onclick="removeProfessorSubject('${p.id}')" class="text-blue-600 hover:text-blue-800 ml-1">
                &times;
            </button>
        </span>
    `).join('');
};


function getSubjectForm(subject = null) {
  const isEdit = subject !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-subject-form" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                <input type="text" id="${prefix}-sub-code" value="${subject?.code || ''}" required class="form-input uppercase" placeholder="e.g. IT101">
            </div>
            <div>
                 <label class="block text-sm font-medium text-gray-700 mb-1">Units *</label>
                 <input type="number" id="${prefix}-sub-units" value="${subject?.units || 3}" required class="form-input" min="0" max="10">
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descriptive Title *</label>
            <input type="text" id="${prefix}-sub-title" value="${subject?.title || ''}" required class="form-input" placeholder="e.g. Introduction to Computing">
        </div>
        
        <div class="mt-4">
             <label class="block text-sm font-medium text-gray-700 mb-2 border-b border-gray-200 pb-1">Recommended Year Level and Semester</label>
             <div class="grid grid-cols-2 gap-4">
                 <div>
                    <label class="block text-xs text-gray-500 mb-1">Year Level</label>
                    <select id="${prefix}-sub-year" class="form-select">
                        ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${subject?.year_level === y ? 'selected' : ''}>Year ${y}</option>`).join('')}
                    </select>
                 </div>
                 <div>
                    <label class="block text-xs text-gray-500 mb-1">Semester</label>
                    <select id="${prefix}-sub-semester" class="form-select">
                        <option value="1" ${subject?.semester_number === 1 ? 'selected' : ''}>1st Semester</option>
                        <option value="2" ${subject?.semester_number === 2 ? 'selected' : ''}>2nd Semester</option>
                        <option value="3" ${subject?.semester_number === 3 ? 'selected' : ''}>Summer</option>
                    </select>
                 </div>
             </div>
        </div>

        <!-- Prerequisites Section -->
        <div class="border-t border-gray-200 pt-4 mt-4">
             <label class="block text-sm font-medium text-gray-700 mb-2">Prerequisites</label>
             
             <div class="relative mb-2">
                <input type="text" 
                       id="${prefix}-prereq-search"
                       placeholder="Search subject code to add..." 
                       class="form-input text-sm"
                       autocomplete="off">
                <div id="${prefix}-prereq-dropdown" class="hidden absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                   <!-- Results -->
                </div>
             </div>

             <div id="${prefix}-selected-prereqs" class="flex flex-wrap gap-2 min-h-[30px]">
                 ${(isEdit && subject.prerequisites ? subject.prerequisites : []).map(p => `
                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        <span class="font-mono font-medium">${p.code}</span>
                        <button type="button" onclick="removePrerequisite('${prefix}', '${p.id}')" class="text-blue-600 hover:text-blue-800 ml-1">
                            &times;
                        </button>
                    </span>
                 `).join('')}
                 ${!isEdit || !subject.prerequisites || subject.prerequisites.length === 0 ? '<p class="text-sm text-gray-400">No prerequisites selected</p>' : ''}
             </div>
        </div>
    </form>
  `;
}

// ============================================================
// SECTIONS TAB
// ============================================================

function renderSectionsTab() {
  const filteredSections = getFilteredSections();

  return `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Section Management</h2>
        <p class="text-sm text-gray-600 mt-1">Manage class sections for ${state.activeSemester?.name || 'current semester'}</p>
      </div>
      
      <div class="flex items-center gap-2">
        <button onclick="openAddSectionModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Section
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="relative">
        <input type="text" 
               placeholder="Search by name..." 
               class="form-input text-sm pl-8"
               value="${state.sectionSearch}"
               oninput="handleSectionSearch(this.value)">
        <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      <select onchange="handleSectionFilterProgram(this.value)" class="form-select text-sm">
        <option value="all">All Programs</option>
        ${state.programs.map(p => `<option value="${p.id}" ${state.sectionFilterProgram === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
      </select>
      
      <select onchange="handleSectionFilterYear(this.value)" class="form-select text-sm">
        <option value="all">All Years</option>
        <option value="1" ${state.sectionFilterYear === '1' ? 'selected' : ''}>1st Year</option>
        <option value="2" ${state.sectionFilterYear === '2' ? 'selected' : ''}>2nd Year</option>
        <option value="3" ${state.sectionFilterYear === '3' ? 'selected' : ''}>3rd Year</option>
        <option value="4" ${state.sectionFilterYear === '4' ? 'selected' : ''}>4th Year</option>
      </select>

      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span>Semester:</span>
        <span class="font-bold text-blue-600">${state.activeSemester?.name || 'None'}</span>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Section Name</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Program</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Year Level</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Enrolled</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subjects</th>
                    <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${filteredSections.length === 0 ? `
                    <tr>
                        <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                            No sections found.
                        </td>
                    </tr>
                ` : filteredSections.map(section => `
                    <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick="viewSection('${section.id}')">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-bold text-gray-900">${section.name}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-600">${section.program_code || section.program.code}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${section.year_level === 1 ? 'bg-green-100 text-green-800' :
      section.year_level === 2 ? 'bg-blue-100 text-blue-800' :
        section.year_level === 3 ? 'bg-purple-100 text-purple-800' :
          'bg-orange-100 text-orange-800'
    }">
                                Year ${section.year_level}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center gap-2">
                                <div class="w-16 bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-blue-600 h-1.5 rounded-full" style="width: ${Math.min(100, (section.enrolled_count / section.capacity) * 100)}%"></div>
                                </div>
                                <span class="text-xs text-gray-600 font-medium">${section.enrolled_count} / ${section.capacity}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm text-gray-600">${section.section_subjects?.length || 0} Subjects</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button onclick="event.stopPropagation(); viewSection('${section.id}')" class="text-blue-600 hover:text-blue-900 mr-3">View</button>
                            <button onclick="event.stopPropagation(); deleteSection('${section.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
  `;
}

function renderSectionDetail() {
  const section = state.selectedSection;
  if (!section) return renderSectionsTab();

  return `
    <!-- Back Button -->
    <div class="mb-6 flex items-center justify-between">
      <button onclick="backToSections()" class="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        <span>Back to Sections</span>
      </button>
      
      <div class="flex gap-2">
        <button onclick="openEditSectionModal()" class="btn btn-secondary btn-sm flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
          </svg>
          Edit
        </button>
        <button onclick="deleteSection('${section.id}')" class="btn btn-danger btn-sm">Delete</button>
      </div>
    </div>

    <!-- Header Card -->
    <div class="card mb-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-gray-900">${section.name}</h1>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 uppercase tracking-wider">
              Year ${section.year_level}
            </span>
          </div>
          <p class="text-gray-600 text-lg font-medium">${section.program_code || section.program.code} - ${section.program_name || section.program.name}</p>
          <div class="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              ${state.activeSemester?.name}
            </span>
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              ${section.enrolled_count || 0} / ${section.capacity} Students
            </span>
          </div>
        </div>
        
        <div class="flex gap-2">
          <button onclick="openAssignStudentsModal()" class="btn btn-primary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
            Assign Students
          </button>
          <button onclick="openAssignSectionSubjectModal()" class="btn btn-secondary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            Assign Schedule
          </button>
          <button onclick="openViewStudentsModal()" class="btn btn-secondary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            View Students
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Assigned Subjects List -->
      <div class="lg:col-span-4">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 class="font-bold text-gray-800">Assigned Subjects</h3>
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">${state.sectionSubjects.length} Items</span>
          </div>
          <div class="p-5 space-y-4 max-h-[600px] overflow-y-auto">
            ${state.sectionSubjects.length === 0 ? `
              <div class="text-center py-8 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                <p>No subjects assigned yet.</p>
              </div>
            ` : state.sectionSubjects.map(ss => `
              <div class="group relative bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 p-4 rounded-xl transition-all">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0 pr-8">
                    <p class="text-sm font-bold text-blue-600 truncate mb-0.5">${ss.subject_code}</p>
                    <h4 class="text-sm font-bold text-gray-800 line-clamp-2 leading-snug mb-2">${ss.subject_title}</h4>
                    
                    <div class="space-y-1.5">
                         ${ss.professors && ss.professors.length > 0 ? ss.professors.map(p => `
                            <div class="flex items-center gap-2 text-xs text-gray-600">
                                <div class="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                <span class="font-medium">Prof. ${p.name}</span>
                                ${p.is_primary ? '<span class="text-[10px] text-gray-400 italic">(Primary)</span>' : ''}
                            </div>
                         `).join('') : `
                            <div class="flex items-center gap-2 text-xs text-orange-500 font-medium">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                <span>No professor assigned</span>
                            </div>
                         `}
                    </div>
                  </div>
                  <div class="flex flex-col gap-1.5">
                      <button onclick="openScheduleSlotModal('${ss.id}')" 
                              class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Add Schedule Slot">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                      </button>
                       <button onclick="removeSubjectFromSection('${ss.id}')" 
                              class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Subject">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                  </div>
                </div>
                
                ${ss.schedule_slots && ss.schedule_slots.length > 0 ? `
                  <div class="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 gap-1">
                    ${ss.schedule_slots.map(slot => `
                      <div class="flex items-center justify-between text-[11px] text-gray-500 py-1 px-2 bg-white rounded-md border border-gray-100 group/slot">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-gray-700">${slot.day}</span>
                            <span>${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</span>
                            <span class="text-gray-300">|</span>
                            <span class="bg-gray-100 px-1 rounded font-mono">${slot.room || 'TBA'}</span>
                        </div>
                        <button onclick="deleteScheduleSlot('${slot.id}')" class="opacity-0 group-hover/slot:opacity-100 text-red-400 hover:text-red-600 p-0.5">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Schedule Grid View -->
      <div class="lg:col-span-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 class="font-bold text-gray-800">Weekly Schedule Grid</h3>
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 bg-blue-100 border border-blue-300 rounded-sm"></div>Lecture</div>
              <div class="flex items-center gap-1.5"><div class="w-2.5 h-2.5 bg-green-100 border border-green-300 rounded-sm"></div>Laboratory</div>
            </div>
          </div>
          <div class="p-0 overflow-x-auto">
            ${renderSectionScheduleGrid()}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSectionScheduleGrid() {
  return `
    <table class="w-full border-collapse table-fixed min-w-[800px]">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-200">
          <th class="w-20 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center border-r border-gray-100">Time</th>
          ${DAYS.map(day => `
            <th class="py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center border-r border-gray-100">
                ${day.name}
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${TIME_SLOTS.map(time => `
          <tr class="h-12 border-b border-gray-100 group hover:bg-gray-50/30 transition-colors">
            <td class="text-[10px] font-bold text-gray-400 text-center border-r border-gray-100 align-top pt-2">
                ${formatTime(time)}
            </td>
            ${DAYS.map(day => renderScheduleCell(day.code, time)).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
    `;
}

function renderScheduleCell(day, timeSlot) {
  const matchingSlots = state.sectionSchedule.filter(s => {
    if (s.day !== day) return false;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const startHour = parseInt(s.start_time.split(':')[0]);
    const endHour = parseInt(s.end_time.split(':')[0]);
    return slotHour >= startHour && slotHour < endHour;
  });

  if (matchingSlots.length === 0) {
    return `<td class="border-r border-gray-100 p-0.5"></td>`;
  }

  const slot = matchingSlots[0];
  const isFirstRow = timeSlot.startsWith(slot.start_time.substring(0, 2));

  if (!isFirstRow) {
    // We handle grouping with rowspan on the first matching row, 
    // so skip rendering a cell for subsequent matching rows.
    // Wait, for table cells to align correctly in a simple row-by-row render, 
    // we can't easily use rowspan unless we track what cells are already "covered".
    // Instead, let's render a transparent or empty cell, or better, 
    // use the same logic as registrar-sections.js which expects rowspan handling 
    // if we were building the whole table in one go.
    // But here we are rendering row by row.
    return '';
  }

  const duration = calculateDuration(slot.start_time, slot.end_time);
  const colorClass = getSubjectColor(slot.subject_code);

  return `
    <td class="border-r border-gray-100 p-1 align-top" rowspan="${duration}">
      <div class="h-full rounded-lg border-l-4 shadow-sm p-2 flex flex-col justify-between ${colorClass} transition-transform hover:scale-[1.02] cursor-default">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-tight opacity-75">${slot.subject_code}</p>
          <p class="text-xs font-bold leading-tight line-clamp-2">${slot.subject_title}</p>
        </div>
        <div class="mt-auto pt-2 flex items-center justify-between gap-1 border-t border-black/5">
          <span class="text-[10px] font-bold"><span class="opacity-60">RM</span> ${slot.room || 'TBA'}</span>
          ${slot.professor_name ? `<span class="text-[9px] truncate font-medium max-w-[60px] text-right" title="${slot.professor_name}">${slot.professor_name.split(' ').pop()}</span>` : ''}
        </div>
      </div>
    </td>
    `;
}

// ============================================================
// SECTION EVENT HANDLERS
// ============================================================

window.handleSectionSearch = function (q) {
  state.sectionSearch = q;
  render();
};

window.handleSectionFilterProgram = function (id) {
  state.sectionFilterProgram = id;
  loadSections().then(render);
};

window.handleSectionFilterYear = function (y) {
  state.sectionFilterYear = y;
  render();
};

window.viewSection = async function (id) {
  state.loadingSection = true;
  render(); // Show spinner? 
  await loadSectionDetails(id);
  state.loadingSection = false;
  render();
  window.scrollTo(0, 0);
};

window.backToSections = function () {
  state.selectedSection = null;
  state.sectionSubjects = [];
  state.sectionSchedule = [];
  render();
};

window.openAddSectionModal = function () {
  const modal = new Modal({
    title: 'Create New Section',
    content: `
    <form id="add-section-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
          <input type="text" id="sec-name" required class="form-input" placeholder="e.g. BSIT-1A">
          <p class="text-[11px] text-gray-500 mt-1">Recommended format: [Program]-[Year][Letter]</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Academic Program *</label>
          <select id="sec-program" required class="form-select" onchange="updateAddSectionCurricula(this.value)">
            <option value="">Select Program</option>
            ${state.programs.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
          <select id="sec-year" required class="form-select bg-white" onchange="updateAddSectionSubjects()">
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>

        <div class="md:col-span-2">
           <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum (Auto-populate subjects)</label>
           <select id="sec-curriculum" class="form-select" onchange="updateAddSectionSubjects()">
               <option value="">Select Program First</option>
           </select>
        </div>

        <div class="md:col-span-2 hidden" id="sec-subjects-wrapper">
             <label class="block text-sm font-medium text-gray-700 mb-2">Subjects to Assign</label>
             <div id="sec-subjects-list" class="border border-gray-200 rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-50">
                <p class="text-xs text-gray-400 text-center col-span-2">Select a curriculum to view subjects</p>
             </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Student Capacity *</label>
          <input type="number" id="sec-capacity" value="40" required class="form-input" min="1" max="100">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Semester</label>
          <div class="form-input bg-gray-50 text-gray-500 flex items-center h-[38px]">${state.activeSemester?.name || 'Current'}</div>
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

          const subjectCheckboxes = document.querySelectorAll('input[name="sec_subjects"]:checked');
          const subjectIds = Array.from(subjectCheckboxes).map(cb => cb.value);

          const data = {
            name: document.getElementById('sec-name').value,
            program: document.getElementById('sec-program').value,
            semester: state.activeSemester?.id,
            year_level: parseInt(document.getElementById('sec-year').value),
            capacity: parseInt(document.getElementById('sec-capacity').value),
            subject_ids: subjectIds
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

window.openEditSectionModal = function () {
  const section = state.selectedSection;
  const modal = new Modal({
    title: 'Edit Section',
    content: `
    <form id="edit-section-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
          <input type="text" id="edit-sec-name" value="${section.name}" required class="form-input">
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Academic Program</label>
          <div class="form-input bg-gray-50 text-gray-500 flex items-center h-[38px]">${section.program_code || section.program.code}</div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
          <select id="edit-sec-year" required class="form-select">
            <option value="1" ${section.year_level === 1 ? 'selected' : ''}>1st Year</option>
            <option value="2" ${section.year_level === 2 ? 'selected' : ''}>2nd Year</option>
            <option value="3" ${section.year_level === 3 ? 'selected' : ''}>3rd Year</option>
            <option value="4" ${section.year_level === 4 ? 'selected' : ''}>4th Year</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Student Capacity *</label>
          <input type="number" id="edit-sec-capacity" value="${section.capacity}" required class="form-input" min="1" max="100">
        </div>
      </div>
      </form>
    `,
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Save Changes',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('edit-section-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            name: document.getElementById('edit-sec-name').value,
            year_level: parseInt(document.getElementById('edit-sec-year').value),
            capacity: parseInt(document.getElementById('edit-sec-capacity').value)
          };

          try {
            await api.patch(endpoints.section(section.id), data);
            Toast.success('Section updated');
            m.close();
            await loadSectionDetails(section.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Updating section');
          }
        }
      }
    ]
  });
  modal.show();
};

window.deleteSection = async function (id) {
  const confirmed = await ConfirmModal({
    title: 'Delete Section',
    message: 'Are you sure you want to delete this section? This will remove all subject assignments and schedules.',
    confirmLabel: 'Delete Section',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.section(id));
    Toast.success('Section deleted');
    backToSections();
    await loadSections();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting section');
  }
};

window.openAssignSectionSubjectModal = async function () {
  // 1. Load subjects for this program (if not loaded)
  const section = state.selectedSection;
  if (section && section.program) {
    await loadSubjects(section.program);
  }
  // 2. Load professors (if not loaded)
  if (state.professors.length === 0) {
    await loadProfessors();
  }

  const modal = new Modal({
    title: 'Assign Subject to Section',
    content: getAssignSectionSubjectForm(),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Assign',
        primary: true,
        onClick: async (m, e) => {
          await submitSectionAssignment(m, e.target);
        }
      }
    ]
  });
  modal.show();
};

function getAssignSectionSubjectForm() {
  // Generate Time Slots Options (7am to 9pm)
  const timeOptions = TIME_SLOTS.map(t => `<option value="${t}">${formatTime(t)}</option>`).join('');
  // Day Options
  const dayOptions = DAYS.map(d => `<option value="${d.code}">${d.name}</option>`).join('');
  // Room Options
  const roomOptions = ROOMS.map(r => `<option value="${r}">${r}</option>`).join('');
  // Subject Options
  const subjectOptions = state.subjects.map(s => `<option value="${s.id}">${s.code} - ${s.title}</option>`).join('');
  // Professor Options
  const profOptions = state.professors.map(p => `<option value="${p.id}">${p.full_name || p.user?.first_name + ' ' + p.user?.last_name}</option>`).join('');

  return `
        <form id="assign-section-subject-form" class="space-y-4">
            <div id="conflict-warning" class="hidden bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800 flex items-start gap-2">
                <svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <span id="conflict-message">Warning message here</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select id="assign-subject" required class="form-select w-full">
                        <option value="">Select Subject</option>
                        ${subjectOptions}
                    </select>
                </div>

                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                    <select id="assign-professor" class="form-select w-full">
                        <option value="">TBA</option>
                        ${profOptions}
                    </select>
                </div>
                
                <div>
                     <label class="block text-sm font-medium text-gray-700 mb-1">Day *</label>
                     <select id="assign-day" required class="form-select w-full" onchange="checkConflictsAsync()">
                        ${dayOptions}
                     </select>
                </div>

                 <div>
                     <label class="block text-sm font-medium text-gray-700 mb-1">Room</label>
                     <select id="assign-room" class="form-select w-full" onchange="checkConflictsAsync()">
                        <option value="">TBA</option>
                        ${roomOptions}
                     </select>
                </div>

                <div>
                     <label class="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
                     <select id="assign-start" required class="form-select w-full" onchange="checkConflictsAsync()">
                        ${timeOptions}
                     </select>
                </div>

                <div>
                     <label class="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
                     <select id="assign-end" required class="form-select w-full" onchange="checkConflictsAsync()">
                        ${timeOptions}
                     </select>
                </div>
            </div>
        </form>
    `;
}

window.checkConflictsAsync = async function () {
  const day = document.getElementById('assign-day').value;
  const room = document.getElementById('assign-room').value;
  const start = document.getElementById('assign-start').value;
  const end = document.getElementById('assign-end').value;
  const professor = document.getElementById('assign-professor').value;
  const warningEl = document.getElementById('conflict-warning');
  const msgEl = document.getElementById('conflict-message');

  // Reset UI
  warningEl.classList.add('hidden');
  msgEl.textContent = '';

  if (!day || !start || !end) return false;

  // Basic validation
  if (start >= end) {
    msgEl.textContent = 'End time must be after start time.';
    warningEl.classList.remove('hidden');
    return true;
  }

  // 1. Local Section Conflict Check
  const startTime = parseInt(start.replace(':', ''));
  const endTime = parseInt(end.replace(':', ''));

  const sectionConflict = state.sectionSchedule.find(s => {
    if (s.day !== day) return false;
    const sStart = parseInt(s.start_time.substring(0, 5).replace(':', ''));
    const sEnd = parseInt(s.end_time.substring(0, 5).replace(':', ''));
    return (startTime < sEnd && endTime > sStart);
  });

  if (sectionConflict) {
    msgEl.innerHTML = `<strong>Schedule Conflict:</strong> This section already has <strong>${sectionConflict.subject_code}</strong> at this time.`;
    warningEl.classList.remove('hidden');
    return true;
  }

  // 2. Server-side Conflict Check
  const semesterId = state.selectedSection.semester || state.activeSemester?.id;

  try {
    if (room && room !== 'TBA') {
      const roomResp = await api.post(endpoints.checkRoomConflict, {
        room,
        day,
        start_time: start,
        end_time: end,
        semester_id: semesterId
      });
      if (roomResp && roomResp.has_conflict) {
        msgEl.innerHTML = `<strong>Room Conflict:</strong> ${roomResp.conflict || 'Room is occupied.'}`;
        warningEl.classList.remove('hidden');
        return true;
      }
    }

    if (professor) {
      const profResp = await api.post(endpoints.checkProfessorConflict, {
        professor_id: professor,
        day,
        start_time: start,
        end_time: end,
        semester_id: semesterId
      });
      if (profResp && profResp.has_conflict) {
        msgEl.innerHTML = `<strong>Professor Conflict:</strong> ${profResp.conflict || 'Professor has another class.'}`;
        warningEl.classList.remove('hidden');
        return true;
      }
    }
  } catch (error) {
    console.warn('Conflict check failed', error);
  }

  return false;
};

window.submitSectionAssignment = async function (modal, btn) {
  const form = document.getElementById('assign-section-subject-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const modalEl = document.getElementById(modal.modalId);
  const submitBtn = btn || modalEl.querySelector('[data-primary="true"]');
  setButtonLoading(submitBtn, true, 'Assigning...');

  if (await checkConflictsAsync()) {
    setButtonLoading(submitBtn, false);
    return;
  }

  const data = {
    section: state.selectedSection.id,
    subject: document.getElementById('assign-subject').value,
    professor: document.getElementById('assign-professor').value || null,
    day: document.getElementById('assign-day').value,
    room: document.getElementById('assign-room').value || null,
    start_time: document.getElementById('assign-start').value,
    end_time: document.getElementById('assign-end').value
  };



  try {
    // 1. Assign Subject
    const assignmentPayload = {
      section: state.selectedSection.id,
      subject: document.getElementById('assign-subject').value,
      professor: document.getElementById('assign-professor').value || null
    };

    const assignment = await api.post(endpoints.sectionSubjects, assignmentPayload);

    // 2. Create Schedule Slot (if successful)
    if (assignment && assignment.id) {
      const schedulePayload = {
        section_subject: assignment.id,
        day: document.getElementById('assign-day').value,
        room: document.getElementById('assign-room').value || null,
        start_time: document.getElementById('assign-start').value,
        end_time: document.getElementById('assign-end').value,
        professor: assignmentPayload.professor
      };

      await api.post(endpoints.scheduleSlots, schedulePayload);
    }

    Toast.success('Subject assigned and scheduled successfully');
    modal.close();
    await loadSectionDetails(state.selectedSection.id);
    render();
  } catch (error) {
    if (error && error.status === 400) {
      const warningEl = document.getElementById('conflict-warning');
      const msgEl = document.getElementById('conflict-message');
      msgEl.textContent = error.response?.data?.non_field_errors?.[0] || 'Conflict detected.';
      warningEl.classList.remove('hidden');
    } else {
      ErrorHandler.handle(error, 'Assigning subject');
    }
  } finally {
    setButtonLoading(submitBtn, false);
  }
};

window.removeSubjectFromSection = async function (ssId) {
  const confirmed = await ConfirmModal({
    title: 'Remove Subject',
    message: 'Are you sure you want to remove this subject? It will also delete all schedule slots associated with it.',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.sectionSubject(ssId));
    Toast.success('Subject removed');
    await loadSectionDetails(state.selectedSection.id);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Removing subject');
  }
}

window.openScheduleSlotModal = function (ssId) {
  const ss = state.sectionSubjects.find(item => item.id === ssId);
  const qualifiedProfs = state.professors.filter(p =>
    p.profile?.assigned_subjects?.some(s => s.code === ss.subject_code)
  );

  const modal = new Modal({
    title: `Add Schedule Slot: ${ss.subject_code} `,
    content: `
    <form id="add-slot-form" class="space-y-4">
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Professor (Optional)</label>
          <select id="slot-prof" class="form-select">
            <option value="">Use Section Default</option>
            ${state.professors.map(p => `
                <option value="${p.id}" ${qualifiedProfs.some(qp => qp.id === p.id) ? 'style="font-weight:bold; color:green"' : ''}>
                    ${p.full_name} ${qualifiedProfs.some(qp => qp.id === p.id) ? '★' : ''}
                </option>
            `).join('')}
          </select>
          <p class="text-[10px] text-gray-500 mt-1">★ Denotes professor qualified for this subject</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Room / Venue</label>
          <select id="slot-room" class="form-select">
            <option value="">TBA</option>
            ${ROOMS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>

        <div id="conflict-warning" class="hidden p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
             <!-- Warning messages -->
        </div>
      </form>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Add Slot',
        primary: true,
        onClick: async (m, e) => {
          const btn = e.target;
          const { setButtonLoading } = await import('../utils.js');

          const data = {
            section_subject: ssId,
            day: document.getElementById('slot-day').value,
            start_time: document.getElementById('slot-start').value,
            end_time: document.getElementById('slot-end').value,
            room: document.getElementById('slot-room').value,
            professor: document.getElementById('slot-prof').value || null
          };

          if (data.end_time <= data.start_time) {
            Toast.error('End time must be after start time');
            return;
          }

          setButtonLoading(btn, true, 'Adding...');

          try {
            await api.post(endpoints.scheduleSlots, data);
            Toast.success('Schedule slot added');
            m.close();
            await loadSectionDetails(state.selectedSection.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding schedule');
          } finally {
            setButtonLoading(btn, false);
          }
        }
      }
    ]
  });
  modal.show();
};

window.deleteScheduleSlot = async function (id) {
  if (!confirm('Delete this schedule slot?')) return;
  try {
    await api.delete(endpoints.scheduleSlot(id));
    Toast.success('Slot deleted');
    await loadSectionDetails(state.selectedSection.id);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting slot');
  }
}

window.switchTab = function (tabId) {
  state.activeTab = tabId;
  state.subView = 'list'; // Reset sub-view on tab change
  state.activeProgram = null;
  state.selectedSection = null; // Clear selected section
  updateHash(tabId);

  // Load data for the tab if needed
  if (tabId === TABS.PROFESSORS) {
    loadProfessors().then(render);
  } else if (tabId === TABS.SECTIONS) {
    Promise.all([loadSemesters(), loadPrograms(), loadSections()]).then(render);
  } else if (tabId === TABS.CURRICULA) {
    loadCurricula().then(render);
  } else if (tabId === TABS.SEMESTERS) {
    loadSemesters().then(render);
  } else if (tabId === TABS.PROGRAMS) {
    loadPrograms().then(render);
  } else {
    render();
  }
};

window.viewProgramCurricula = async function (programId) {
  const program = state.programs.find(p => p.id === programId);
  if (!program) return;

  state.activeProgram = program;
  state.subView = 'program_curricula';
  state.activeTab = TABS.PROGRAMS; // Ensure we stick to Programs tab

  // Load curricula specifically for this program
  await loadCurricula(programId);

  // Re-render
  render();
  window.scrollTo(0, 0);
};

window.returnToProgramList = function () {
  state.activeProgram = null;
  state.subView = 'list';
  render();
};



window.openEditProgramModal = async function (programId) {
  try {
    const response = await api.get(endpoints.manageProgram(programId));
    state.editingProgram = response;

    const modal = new Modal({
      title: 'Edit Program',
      content: getProgramForm(response),
      size: 'lg',
      actions: [
        {
          label: 'Cancel',
          onClick: (m) => {
            m.close();
            state.editingProgram = null;
          }
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-program-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const data = {
              code: document.getElementById('edit-code').value.toUpperCase(),
              name: document.getElementById('edit-name').value,
              description: document.getElementById('edit-description').value,
              duration_years: parseInt(document.getElementById('edit-duration').value),
              is_active: document.getElementById('edit-active').checked
            };

            // Prevent double-submit
            const submitBtn = m.element.querySelector('[data-action="primary"]');
            const { setButtonLoading } = await import('../utils.js');
            setButtonLoading(submitBtn, true, 'Saving...');

            try {
              await api.put(endpoints.manageProgram(state.editingProgram.id), data);
              Toast.success('Program updated successfully');
              m.close();
              state.editingProgram = null;
              await loadPrograms();
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating program');
              setButtonLoading(submitBtn, false);
            }
          }
        }
      ]
    });

    state.programModal = modal;
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading program details');
  }
};

window.deleteProgram = async function (programId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Program',
    message: 'Are you sure you want to delete this program? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.manageProgram(programId));
    Toast.success('Program deleted successfully');
    await loadPrograms();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting program');
  }
};

// ============================================================
// EVENT HANDLERS - PROGRAMS
// ============================================================

function getProgramForm(program = null) {
  const isEdit = program !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-program-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
        <input type="text" id="${prefix}-code" value="${program?.code || ''}" required class="form-input" placeholder="e.g., BSIT, BSCS" pattern="[A-Z]+" title="Must be uppercase letters only">
        <p class="text-xs text-gray-500 mt-1">Use uppercase letters only (e.g., BSIT, BSCS)</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
        <input type="text" id="${prefix}-name" value="${program?.name || ''}" required class="form-input" placeholder="e.g., Bachelor of Science in Information Technology">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="${prefix}-description" rows="3" class="form-input" placeholder="Optional description of the program">${program?.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
        <select id="${prefix}-duration" required class="form-select">
          <option value="2" ${program?.duration_years === 2 ? 'selected' : ''}>2 years</option>
          <option value="3" ${program?.duration_years === 3 ? 'selected' : ''}>3 years</option>
          <option value="4" ${program?.duration_years === 4 ? 'selected' : '' || !program ? 'selected' : ''}>4 years</option>
          <option value="5" ${program?.duration_years === 5 ? 'selected' : ''}>5 years</option>
          <option value="6" ${program?.duration_years === 6 ? 'selected' : ''}>6 years</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="${prefix}-active" ${program?.is_active !== false ? 'checked' : ''} class="rounded border-gray-300">
        <label for="${prefix}-active" class="text-sm font-medium text-gray-700">Active (currently offered)</label>
      </div>
    </form>
    `;
}

window.openAddProgramModal = function () {
  const modal = new Modal({
    title: 'Add New Program',
    content: getProgramForm(),
    size: 'lg',
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => m.close()
      },
      {
        label: 'Add Program',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-program-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            code: document.getElementById('add-code').value.toUpperCase(),
            name: document.getElementById('add-name').value,
            description: document.getElementById('add-description').value,
            duration_years: parseInt(document.getElementById('add-duration').value),
            is_active: document.getElementById('add-active').checked
          };

          // Prevent double-submit
          const submitBtn = m.element.querySelector('[data-action="primary"]');
          const { setButtonLoading } = await import('../utils.js');
          setButtonLoading(submitBtn, true, 'Adding...');

          try {
            await api.post(endpoints.managePrograms, data);
            Toast.success('Program added successfully');
            m.close();
            await loadPrograms();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding program');
            setButtonLoading(submitBtn, false);
          }
        }
      }
    ]
  });

  state.programModal = modal;
  modal.show();
};

// ============================================================
// EVENT HANDLERS - SUBJECTS
// ============================================================

window.handleProgramFilterChange = async function (programId) {
  if (!programId) {
    state.selectedProgram = null;
    state.subjects = [];
  } else {
    state.selectedProgram = state.programs.find(p => p.id === programId);
    await loadSubjects(programId);
  }
  render();
};

window.openAddSubjectModal = function () {
  const targetProgram = state.selectedProgram || state.activeProgram;

  if (!targetProgram) {
    Toast.error('Please select a program first');
    return;
  }

  // Ensure state matches for submission
  state.selectedProgram = targetProgram;

  // Reset prerequisite state
  resetPrereqState('add');

  const modal = new Modal({
    title: 'Add New Subject',
    content: getSubjectForm(),
    size: 'lg',
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => {
          resetPrereqState('add');
          m.close();
        }
      },
      {
        label: 'Add Subject',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-subject-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            code: document.getElementById('add-sub-code').value.toUpperCase(),
            title: document.getElementById('add-sub-title').value,
            year_level: parseInt(document.getElementById('add-sub-year').value),
            semester_number: parseInt(document.getElementById('add-sub-semester').value),
            units: parseInt(document.getElementById('add-sub-units').value),
            program: state.selectedProgram.id,
            prerequisite_ids: state.prereqState.add.selected.map(p => p.id)
          };

          try {
            await api.post(endpoints.manageSubjects, data);
            Toast.success('Subject added successfully');
            resetPrereqState('add');
            m.close();
            await loadSubjects(state.selectedProgram.id);
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding subject');
          }
        }
      }
    ]
  });

  state.subjectModal = modal;
  modal.show();

  // Setup search listeners after modal is shown
  setTimeout(() => setupPrereqSearchListeners('add'), 100);
};

window.openEditSubjectModal = async function (subjectId) {
  try {
    const response = await api.get(endpoints.manageSubject(subjectId));
    state.editingSubject = response;

    // Initialize prerequisites from the subject
    initEditPrerequisites(response);

    const modal = new Modal({
      title: 'Edit Subject',
      content: getSubjectForm(response),
      size: 'lg',
      actions: [
        {
          label: 'Cancel',
          onClick: (m) => {
            m.close();
            state.editingSubject = null;
            resetPrereqState('edit');
          }
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-subject-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const data = {
              code: document.getElementById('edit-sub-code').value.toUpperCase(),
              title: document.getElementById('edit-sub-title').value,
              year_level: parseInt(document.getElementById('edit-sub-year').value),
              semester_number: parseInt(document.getElementById('edit-sub-semester').value),
              units: parseInt(document.getElementById('edit-sub-units').value),
              prerequisite_ids: state.prereqState.edit.selected.map(p => p.id)
            };

            try {
              await api.put(endpoints.manageSubject(state.editingSubject.id), data);
              Toast.success('Subject updated successfully');
              m.close();
              state.editingSubject = null;
              resetPrereqState('edit');
              await loadSubjects(state.selectedProgram.id);
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating subject');
            }
          }
        }
      ]
    });

    state.subjectModal = modal;
    modal.show();

    // Setup search listeners after modal is shown
    setTimeout(() => setupPrereqSearchListeners('edit'), 100);
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subject details');
  }
};

// ============================================================
// PREREQUISITE HELPERS
// ============================================================

window.setupPrereqSearchListeners = function (prefix) {
  const searchInput = document.getElementById(`${prefix} -prereq - search`);
  const resultsDropdown = document.getElementById(`${prefix} -prereq - dropdown`);

  if (!searchInput || !resultsDropdown) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) {
      resultsDropdown.classList.add('hidden');
      return;
    }

    // Filter subjects from the same program that are NOT matched already
    const matches = state.subjects.filter(s => {
      const alreadySelected = state.prereqState[prefix].selected.some(sel => sel.id === s.id);
      // Also prevent self-prerequisite if editing (though we don't have easy access to current ID here, handle minimal case)
      const isSelf = state.editingSubject && state.editingSubject.id === s.id;

      return !alreadySelected && !isSelf && (s.code.toLowerCase().includes(query) || s.title.toLowerCase().includes(query));
    }).slice(0, 10);

    if (matches.length > 0) {
      resultsDropdown.innerHTML = matches.map(s => `
      <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
  onclick = "addPrerequisite('${prefix}', '${s.id}', '${s.code}')" >
                    <span class="font-medium text-sm text-gray-800">${s.code}</span>
                    <span class="text-xs text-gray-500 truncate max-w-[150px]">${s.title}</span>
      </div>
    `).join('');
      resultsDropdown.classList.remove('hidden');
    } else {
      resultsDropdown.innerHTML = `<div class="px-3 py-2 text-sm text-gray-500">No subjects found</div>`;
      resultsDropdown.classList.remove('hidden');
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
      resultsDropdown.classList.add('hidden');
    }
  });
};

window.addPrerequisite = function (prefix, id, code) {
  // Add to state
  if (!state.prereqState[prefix].selected.find(s => s.id === id)) {
    state.prereqState[prefix].selected.push({ id, code });
  }

  // UI Update
  updatePrereqTags(prefix);

  // Clear search
  const searchInput = document.getElementById(`${prefix} -prereq - search`);
  const resultsDropdown = document.getElementById(`${prefix} -prereq - dropdown`);
  if (searchInput) searchInput.value = '';
  if (resultsDropdown) resultsDropdown.classList.add('hidden');
};

window.removePrerequisite = function (prefix, id) {
  state.prereqState[prefix].selected = state.prereqState[prefix].selected.filter(s => s.id !== id);
  updatePrereqTags(prefix);
};

window.updatePrereqTags = function (prefix) {
  const container = document.getElementById(`${prefix} -selected - prereqs`);
  if (!container) return;

  const selected = state.prereqState[prefix].selected;

  if (selected.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">No prerequisites selected</p>';
    return;
  }

  container.innerHTML = selected.map(p => `
    < span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm" >
            <span class="font-mono font-medium">${p.code}</span>
            <button type="button" onclick="removePrerequisite('${prefix}', '${p.id}')" class="text-blue-600 hover:text-blue-800 ml-1">
                &times;
            </button>
        </span >
    `).join('');
};

window.resetPrereqState = function (prefix) {
  if (state.prereqState[prefix]) {
    state.prereqState[prefix].selected = [];
    state.prereqState[prefix].results = [];
    state.prereqState[prefix].search = '';
  }
};

window.initEditPrerequisites = function (subject) {
  if (subject && subject.prerequisites) {
    state.prereqState.edit.selected = subject.prerequisites.map(p => ({
      id: p.id,
      code: p.code
    }));
  } else {
    state.prereqState.edit.selected = [];
  }
};

window.deleteSubject = async function (subjectId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Subject',
    message: 'Are you sure you want to delete this subject? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.manageSubject(subjectId));
    Toast.success('Subject deleted successfully');
    await loadSubjects(state.selectedProgram.id);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting subject');
  }
};

// ============================================================
// EVENT HANDLERS - CURRICULA
// ============================================================

function getCurriculumForm(curriculum = null) {
  const isEdit = curriculum !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-curriculum-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Code *</label>
        <input type="text" id="${prefix}-curriculum-code" value="${curriculum?.code || ''}" required class="form-input" placeholder="e.g., BSIT-2024">
        <p class="text-xs text-gray-500 mt-1">Unique identifier for this curriculum version</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program *</label>
        <select id="${prefix}-curriculum-program" required class="form-select">
          <option value="">Select a program...</option>
          ${state.programs.map(program => `
            <option value="${program.id}" ${curriculum?.program === program.id ? 'selected' : ''}>
              ${program.code} - ${program.name}
            </option>
          `).join('')}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Effective Year *</label>
        <input type="number" id="${prefix}-curriculum-year" value="${curriculum?.effective_year || new Date().getFullYear()}" required class="form-input" min="2000" max="2099" placeholder="e.g., 2024">
        <p class="text-xs text-gray-500 mt-1">Year when this curriculum takes effect</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="${prefix}-curriculum-description" rows="3" class="form-input" placeholder="Brief description of this curriculum version">${curriculum?.description || ''}</textarea>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="${prefix}-curriculum-active" ${curriculum?.is_active !== false ? 'checked' : ''} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
        <label for="${prefix}-curriculum-active" class="text-sm font-medium text-gray-700">Active Curriculum</label>
      </div>
    </form>
    `;
}

window.openAddCurriculumModal = async function () {
  // Ensure programs are loaded
  if (state.programs.length === 0) {
    await loadPrograms();
  }

  const modal = new Modal({
    title: 'Add New Curriculum',
    content: getCurriculumForm(),
    size: 'lg',
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => m.close()
      },
      {
        label: 'Create Curriculum',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-curriculum-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            code: document.getElementById('add-curriculum-code').value,
            program: document.getElementById('add-curriculum-program').value,
            effective_year: parseInt(document.getElementById('add-curriculum-year').value),
            description: document.getElementById('add-curriculum-description').value,
            is_active: document.getElementById('add-curriculum-active').checked
          };

          try {
            await api.post(endpoints.curricula, data);
            Toast.success('Curriculum created successfully');
            m.close();
            await loadCurricula();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Creating curriculum');
          }
        }
      }
    ]
  });

  state.curriculumModal = modal;
  modal.show();
};

window.openEditCurriculumModal = async function (curriculumId) {
  // Ensure programs are loaded
  if (state.programs.length === 0) {
    await loadPrograms();
  }

  try {
    const curriculum = await api.get(endpoints.curriculumDetail(curriculumId));

    const modal = new Modal({
      title: 'Edit Curriculum',
      content: getCurriculumForm(curriculum),
      size: 'lg',
      actions: [
        {
          label: 'Cancel',
          onClick: (m) => m.close()
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-curriculum-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const data = {
              code: document.getElementById('edit-curriculum-code').value,
              program: document.getElementById('edit-curriculum-program').value,
              effective_year: parseInt(document.getElementById('edit-curriculum-year').value),
              description: document.getElementById('edit-curriculum-description').value,
              is_active: document.getElementById('edit-curriculum-active').checked
            };

            try {
              await api.put(endpoints.curriculumDetail(curriculumId), data);
              Toast.success('Curriculum updated successfully');
              m.close();
              await loadCurricula();
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating curriculum');
            }
          }
        }
      ]
    });

    state.curriculumModal = modal;
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading curriculum');
  }
};

window.viewCurriculum = async function (curriculumId) {
  try {
    // Fetch curriculum details and structure
    const curriculum = await api.get(endpoints.curriculumDetail(curriculumId));
    const structure = await api.get(endpoints.curriculumStructure(curriculumId));

    const modal = new Modal({
      title: `Curriculum: ${curriculum.code} `,
      content: getCurriculumViewContent(curriculum, structure),
      size: 'xl',
      actions: [
        {
          label: 'Close',
          onClick: (m) => m.close()
        },
        {
          label: 'Edit Curriculum',
          primary: true,
          onClick: (m) => {
            m.close();
            openEditCurriculumModal(curriculumId);
          }
        }
      ]
    });

    state.curriculumModal = modal;
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading curriculum details');
  }
};

function getCurriculumViewContent(curriculum, response) {
  // Parse backend structure format: { "year": { "sem": [subjects...] } }
  const structure = response.structure || {};
  const subjectsByLevel = {};
  let totalSubjects = 0;

  Object.keys(structure).forEach(year => {
    Object.keys(structure[year]).forEach(sem => {
      const subjects = structure[year][sem];
      if (subjects && subjects.length > 0) {
        const key = `${year} -${sem} `;
        subjectsByLevel[key] = subjects;
        totalSubjects += subjects.length;
      }
    });
  });

  state.currentCurriculum = { ...curriculum, structure: subjectsByLevel }; // Store for easy access

  return `
    <!--Strong Context Header-->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div>
               <p class="text-sm text-blue-600 font-semibold mb-1 tracking-wide uppercase">Program</p>
               <h3 class="text-2xl font-bold text-gray-900">${curriculum.program_name || 'Not assigned'}</h3>
           </div>
           
           <div class="h-px md:h-12 w-full md:w-px bg-blue-200"></div>

           <div>
              <p class="text-sm text-blue-600 font-semibold mb-1 tracking-wide uppercase">Curriculum</p>
              <h3 class="text-xl font-semibold text-gray-900">${curriculum.code}</h3>
           </div>

           <div class="h-px md:h-12 w-full md:w-px bg-blue-200"></div>

           <div>
              <p class="text-sm text-blue-600 font-semibold mb-1 tracking-wide uppercase">Effective Year</p>
              <h3 class="text-xl font-semibold text-gray-900">${curriculum.effective_year}</h3>
           </div>

           <div class="h-px md:h-12 w-full md:w-px bg-blue-200"></div>

            <div>
              <p class="text-sm text-blue-600 font-semibold mb-1 tracking-wide uppercase">Status</p>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${curriculum.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                 ${curriculum.is_active ? 'Active' : 'Inactive'}
              </span>
           </div>
       </div>
       ${curriculum.description ? `
        <div class="mt-4 pt-4 border-t border-blue-200">
           <p class="text-gray-700 text-sm">${curriculum.description}</p>
        </div>
       ` : ''}
    </div>

    <!--Subjects by Year and Semester-->
    <div class="space-y-6">
      ${[1, 2, 3, 4, 5].map(year => {
    return `
            <div class="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <div class="bg-gray-800 text-white px-4 py-3 flex justify-between items-center">
                    <h3 class="font-bold text-lg">Year ${year}</h3>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-gray-50">
                ${[1, 2, 3].map(semester => {
      const key = `${year}-${semester}`;
      const subjects = subjectsByLevel[key] || [];
      const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);
      const semesterName = semester === 3 ? 'Summer' : (semester === 1 ? '1st Semester' : '2nd Semester');

      return `
                    <div class="flex flex-col h-full bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div class="bg-gray-100 px-3 py-2 border-b border-gray-200 flex justify-between items-center">
                            <h4 class="font-semibold text-gray-800">${semesterName}</h4>
                            <span class="text-xs font-bold bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">${totalUnits} units</span>
                        </div>
                        
                        <div class="p-3 space-y-2 flex-grow">
                            ${subjects.length === 0 ? `
                                <div class="text-center py-4 text-gray-400 text-sm italic">
                                    No subjects assigned
                                </div>
                            ` : subjects.map(subject => `
                                <div class="group flex items-start justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors rounded px-2 -mx-2">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono font-bold text-blue-600">${subject.code}</span>
                                            <span class="text-xs font-medium bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">${subject.units}u</span>
                                        </div>
                                        <p class="text-sm text-gray-700 truncate" title="${subject.title}">${subject.title}</p>
                                        ${subject.prerequisites && subject.prerequisites.length > 0 ? `
                                            <div class="text-xs text-gray-500 mt-0.5 flex gap-1 items-center">
                                                <svg class="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                                ${subject.prerequisites.map(p => p.code).join(', ')}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <button onclick="removeSubjectFromCurriculum('${curriculum.id}', '${subject.id}')" class="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove from curriculum">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>
                            `).join('')}
                        </div>

                        <div class="p-2 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                            <button onclick="openAssignSubjectModal('${curriculum.id}', ${year}, ${semester})" class="w-full py-1.5 text-center text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-dashed border-blue-300 rounded-md transition-colors flex items-center justify-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                Assign Subject
                            </button>
                        </div>
                    </div>
                    `;
    }).join('')}
                </div>
            </div>
            `;
  }).join('')}
    </div>
  `;
}

// ============================================================
// CURRICULUM SUBJECT MANAGEMENT
// ============================================================

window.openAssignSubjectModal = async function (curriculumId, year, semester) {
  const curriculum = state.curricula.find(c => c.id === curriculumId) || state.currentCurriculum;

  // Initial State for Modal
  state.assignModal = {
    curriculumId,
    year,
    semester,
    activeTab: 'select', // 'select' or 'create'
    searchQuery: '',
    searchResults: [],
    programId: curriculum.program // Ensure we scope to program
  };

  // Pre-load subjects
  await loadSubjects(curriculum.program);

  const modal = new Modal({
    title: `Assign to Year ${year} - ${semester === 3 ? 'Summer' : (semester === 1 ? '1st Sem' : '2nd Sem')} `,
    content: getAssignSubjectModalContent(),
    size: 'lg',
    hideFooter: true // Custom footer per tab
  });

  state.curriculumModal = modal; // Re-use this state slot or create a new one
  modal.show();

  // Trigger initial empty search to show all available
  searchAssignSubjects('');
};

window.getAssignSubjectModalContent = function () {
  const { activeTab, curriculumId, year, semester } = state.assignModal;

  return `
    <div class="flex flex-col h-[500px]">
             < !--Tabs -->
             <div class="flex border-b border-gray-200 mb-4">
                 <button onclick="selectAssignTab('select')" class="flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'select' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                     Select Existing Subject
                 </button>
                 <button onclick="selectAssignTab('create')" class="flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'create' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
                     Create New Subject
                 </button>
             </div>

             <!--Content Area-- >
    <div class="flex-1 overflow-y-auto pr-2">
      ${activeTab === 'select' ? renderAssignSelectTab() : renderAssignCreateTab()}
    </div>
        </div>
    `;
};

window.renderAssignSelectTab = function () {
  return `
    <div class="space-y-4">
            <div class="relative">
                <input type="text" 
                       oninput="searchAssignSubjects(this.value)" 
                       placeholder="Search by code or title..." 
                       class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                       autofocus>
                <div class="absolute left-3 top-2.5 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <div id="assign-results" class="space-y-2">
                <!-- Results populated by JS -->
                <p class="text-center text-gray-500 py-4">Type to search subjects...</p>
            </div>
        </div>
    `;
};

window.renderAssignCreateTab = function () {
  return `
    <form id="inline-create-subject-form" class="space-y-4 px-1" onsubmit="event.preventDefault(); createAndAssignSubject();">
            <div class="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p class="text-sm text-blue-800 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    New subject will be added to <strong>${state.currentCurriculum.program_name}</strong> and assigned to this curriculum immediately.
                </p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                   <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
                   <input type="text" id="new-sub-code" required class="form-input uppercase" placeholder="e.g. CS101">
                </div>
                <div>
                   <label class="block text-sm font-medium text-gray-700 mb-1">Units *</label>
                   <input type="number" id="new-sub-units" required class="form-input" value="3" min="0" max="10">
                </div>
            </div>

            <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">Subject Title *</label>
               <input type="text" id="new-sub-title" required class="form-input" placeholder="e.g. Introduction to Computing">
            </div>
            
            <div>
               <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
               <textarea id="new-sub-desc" class="form-input" rows="2"></textarea>
            </div>

            <div class="pt-4">
                <button type="submit" class="w-full btn btn-primary flex justify-center items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Create & Assign Subject
                </button>
            </div>
        </form>
    `;
};

window.selectAssignTab = function (tab) {
  state.assignModal.activeTab = tab;
  state.curriculumModal.setContent(getAssignSubjectModalContent());
  if (tab === 'select') searchAssignSubjects('');
};

window.searchAssignSubjects = function (query) {
  const resultsContainer = document.getElementById('assign-results');
  if (!resultsContainer) return;

  const lowerQ = query.toLowerCase();

  // Filter logic: Must match query AND match Program AND NOT be already in this specific curriculum
  // To check if already in curriculum, we need to check state.currentCurriculum.structure
  // But structure is nested {year: {sem: [subjects]}}. Let's flatten IDs first.

  const assignedIds = new Set();
  Object.values(state.currentCurriculum.structure || {}).forEach(yearObj => {
    if (yearObj) {
      Object.values(yearObj).forEach(semArr => {
        if (Array.isArray(semArr)) {
          semArr.forEach(s => assignedIds.add(s.id));
        }
      });
    }
  });

  const results = state.subjects.filter(s => {
    const matchesQuery = s.code.toLowerCase().includes(lowerQ) || (s.title || s.name).toLowerCase().includes(lowerQ);
    const matchesProgram = s.program === state.assignModal.programId; // Strict scoping
    const notAssigned = !assignedIds.has(s.id);

    return matchesQuery && matchesProgram && notAssigned;
  }).slice(0, 15);

  if (results.length === 0) {
    resultsContainer.innerHTML = `<div class="p-4 text-center text-gray-500 bg-gray-50 rounded">No matching subjects found in this program.</div>`;
    return;
  }

  resultsContainer.innerHTML = results.map(s => `
    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-800">${s.code}</span>
                    <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">${s.units}u</span>
                </div>
                <p class="text-sm text-gray-600 truncate max-w-[250px]">${s.title || s.name}</p>
            </div>
            <button onclick="assignSubjectToCurriculum('${s.id}')" class="btn btn-sm btn-primary">
                Assign
            </button>
        </div>
    `).join('');
};

window.assignSubjectToCurriculum = async function (subjectId) {
  const { curriculumId, year, semester } = state.assignModal;

  // Mock API call since valid endpoint might be tricky to guess perfectly without full docs,
  // but assuming standard post endpoint:
  // Actually we have endpoints.curriculumAssignSubjects in api.js

  try {
    const payload = {
      subject_ids: [subjectId],
      year_level: year,
      semester_number: semester
    };

    // Use the endpoint defined in api.js: curriculumAssignSubjects: (id) => `/ academics / curricula / ${ id } /assign_subjects/`
    await api.post(endpoints.curriculumAssignSubjects(curriculumId), payload);

    Toast.success('Subject assigned successfully');
    state.curriculumModal.close();

    // Refresh view
    viewCurriculum(curriculumId);

  } catch (error) {
    ErrorHandler.handle(error, 'Assigning subject');
  }
};

window.createAndAssignSubject = async function () {
  const code = document.getElementById('new-sub-code').value.toUpperCase();
  const title = document.getElementById('new-sub-title').value;
  const units = parseInt(document.getElementById('new-sub-units').value);
  const desc = document.getElementById('new-sub-desc').value;

  const { programId, curriculumId, year, semester } = state.assignModal;

  try {
    // 1. Create Subject
    const subjectData = {
      code,
      title,
      units,
      description: desc,
      program: programId,
      // Defaults as we are inline:
      year_level: year, // Suggestion
      semester: semester
    };

    const newSubject = await api.post(endpoints.manageSubjects, subjectData);

    // 2. Assign to Curriculum
    if (newSubject && newSubject.id) {
      const assignPayload = {
        subject_ids: [newSubject.id],
        year_level: year,
        semester_number: semester
      };
      await api.post(endpoints.curriculumAssignSubjects(curriculumId), assignPayload);

      Toast.success('Subject created and assigned!');
      state.curriculumModal.close();
      viewCurriculum(curriculumId);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Creating subject');
  }
};


window.removeSubjectFromCurriculum = async function (curriculumId, subjectId) {
  const confirmed = await ConfirmModal({
    title: 'Remove Subject',
    message: 'Are you sure you want to remove this subject from the curriculum? The subject itself will not be deleted.',
    confirmLabel: 'Remove',
    danger: true
  });

  if (!confirmed) return;

  try {
    // Assuming endpoint: /academics/curricula/${id}/subjects/${subjectId}/
    // Using DELETE
    await api.delete(endpoints.curriculumRemoveSubject(curriculumId, subjectId));

    Toast.success('Subject removed from curriculum');
    viewCurriculum(curriculumId); // Refresh

  } catch (error) {
    ErrorHandler.handle(error, 'Removing subject');
  }
};

window.deleteCurriculum = async function (curriculumId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Curriculum',
    message: 'Are you sure you want to delete this curriculum? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.curriculumDetail(curriculumId));
    Toast.success('Curriculum deleted successfully');
    await loadCurricula();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting curriculum');
  }
};

// ============================================================
// CURRICULA TAB
// ============================================================

function renderCurriculaTab() {
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Curricula</h2>
        <p class="text-sm text-gray-600 mt-1">Curriculum versions and subject mapping</p>
      </div>
      <button onclick="openAddCurriculumModal()" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Add Curriculum
      </button>
    </div>

    ${state.curricula.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No curricula found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Curriculum" to create your first curriculum</p>
      </div>
    ` : `
      <div class="space-y-4">
        ${state.curricula.map(curriculum => `
          <div class="card">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-xl font-bold text-gray-800">${curriculum.code}</h3>
                  ${curriculum.is_active
      ? '<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">Active</span>'
      : '<span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">Inactive</span>'
    }
                </div>
                <p class="text-gray-600">Effective Year: ${curriculum.effective_year}</p>
                <p class="text-sm text-gray-500 mt-1">${curriculum.program_name || 'No program assigned'}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="openEditCurriculumModal('${curriculum.id}')" class="btn btn-secondary text-sm">
                  Edit
                </button>
                <button onclick="viewCurriculum('${curriculum.id}')" class="btn btn-secondary text-sm">
                  View
                </button>
                <button onclick="deleteCurriculum('${curriculum.id}')" class="btn btn-danger text-sm">
                  Delete
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ============================================================
// SEMESTERS TAB
// ============================================================

function renderSemestersTab() {
  const years = getUniqueAcademicYears();

  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Semesters</h2>
        <p class="text-sm text-gray-600 mt-1">Manage academic semesters and enrollment periods</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-700">Filter:</label>
          <select onchange="handleSemesterFilterChange(this.value)" class="form-select text-sm">
            <option value="all" ${state.semesterFilterYear === 'all' ? 'selected' : ''}>All Years</option>
            ${years.map(year => `
              <option value="${year}" ${state.semesterFilterYear === year ? 'selected' : ''}>${year}</option>
            `).join('')}
          </select>
        </div>
        <button onclick="openAddSemesterModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Semester
        </button>
      </div>
    </div>

    ${state.filteredSemesters.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No semesters found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Semester" to create your first semester</p>
      </div>
    ` : `
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${state.filteredSemesters.map(semester => `
              <tr class="${semester.is_current ? 'bg-blue-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">${semester.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">${semester.academic_year}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-600">
                    ${formatSemesterDate(semester.start_date)} - ${formatSemesterDate(semester.end_date)}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-600">
                    ${semester.enrollment_start_date && semester.enrollment_end_date
      ? `${formatSemesterDate(semester.enrollment_start_date)} - ${formatSemesterDate(semester.enrollment_end_date)}`
      : '<span class="text-gray-400">Not set</span>'}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${semester.is_current
      ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Current</span>'
      : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button onclick="openEditSemesterModal('${semester.id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                  ${!semester.is_current ? `
                    <button onclick="setCurrentSemester('${semester.id}')" class="text-green-600 hover:text-green-900">Set Current</button>
                    <button onclick="deleteSemester('${semester.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}

    ${state.showSemesterAddModal ? renderSemesterAddModal() : ''}
    ${state.showSemesterEditModal ? renderSemesterEditModal() : ''}
  `;
}

function renderSemesterAddModal() {
  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeSemesterAddModal()">
      <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Add New Semester</h3>
        <form id="add-semester-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Semester Name *</label>
            <select id="add-sem-name" required class="form-select">
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <input type="text" id="add-sem-year" required class="form-input" placeholder="2024-2025" pattern="\\d{4}-\\d{4}">
              <p class="text-xs text-gray-500 mt-1">Format: YYYY-YYYY (e.g., 2024-2025)</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" id="add-sem-start" required class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" id="add-sem-end" required class="form-input">
            </div>
          </div>

          <div class="border-t pt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Enrollment Period (Optional)</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">Opens</label>
                <input type="date" id="add-sem-enroll-start" class="form-input">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Closes</label>
                <input type="date" id="add-sem-enroll-end" class="form-input">
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="add-sem-current" class="rounded border-gray-300">
              <label for="add-sem-current" class="text-sm text-gray-700">Set as current semester</label>
          </div>
        </form>

        <div class="flex gap-3 mt-6">
          <button onclick="closeSemesterAddModal()" class="flex-1 btn btn-secondary">Cancel</button>
          <button onclick="submitAddSemester()" class="flex-1 btn btn-primary">Create Semester</button>
        </div>
      </div>
    </div>
    `;
}

function renderSemesterEditModal() {
  const sem = state.editingSemester;
  if (!sem) return '';

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeSemesterEditModal()">
      <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Edit Semester</h3>
        <form id="edit-semester-form" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Semester Name *</label>
            <select id="edit-sem-name" required class="form-select">
              <option value="1st Semester" ${sem.name === '1st Semester' ? 'selected' : ''}>1st Semester</option>
              <option value="2nd Semester" ${sem.name === '2nd Semester' ? 'selected' : ''}>2nd Semester</option>
              <option value="Summer" ${sem.name === 'Summer' ? 'selected' : ''}>Summer</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
            <input type="text" id="edit-sem-year" value="${sem.academic_year}" required class="form-input" placeholder="2024-2025" pattern="\\d{4}-\\d{4}">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input type="date" id="edit-sem-start" value="${sem.start_date || ''}" required class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
              <input type="date" id="edit-sem-end" value="${sem.end_date || ''}" required class="form-input">
            </div>
          </div>

          <div class="border-t pt-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Enrollment Period (Optional)</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-600 mb-1">Opens</label>
                <input type="date" id="edit-sem-enroll-start" value="${sem.enrollment_start_date || ''}" class="form-input">
              </div>
              <div>
                <label class="block text-sm text-gray-600 mb-1">Closes</label>
                <input type="date" id="edit-sem-enroll-end" value="${sem.enrollment_end_date || ''}" class="form-input">
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="edit-sem-current" ${sem.is_current ? 'checked' : ''} class="rounded border-gray-300">
              <label for="edit-sem-current" class="text-sm text-gray-700">Set as current semester</label>
          </div>
        </form>

        <div class="flex gap-3 mt-6">
          <button onclick="closeSemesterEditModal()" class="flex-1 btn btn-secondary">Cancel</button>
          <button onclick="submitEditSemester()" class="flex-1 btn btn-primary">Save Changes</button>
        </div>
      </div>
    </div>
    `;
}

// ============================================================
// EVENT HANDLERS - SEMESTERS
// ============================================================

window.handleSemesterFilterChange = function (year) {
  state.semesterFilterYear = year;
  filterSemesters();
  render();
};

window.openAddSemesterModal = function () {
  state.showSemesterAddModal = true;
  render();
};

window.closeSemesterAddModal = function () {
  state.showSemesterAddModal = false;
  render();
};

window.openEditSemesterModal = async function (semesterId) {
  const semester = state.semesters.find(s => s.id === semesterId);
  if (semester) {
    state.editingSemester = semester;
    state.showSemesterEditModal = true;
    render();
  }
};

window.closeSemesterEditModal = function () {
  state.showSemesterEditModal = false;
  state.editingSemester = null;
  render();
};

window.submitAddSemester = async function () {
  const form = document.getElementById('add-semester-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    name: document.getElementById('add-sem-name').value,
    academic_year: document.getElementById('add-sem-year').value,
    start_date: document.getElementById('add-sem-start').value,
    end_date: document.getElementById('add-sem-end').value,
    enrollment_start_date: document.getElementById('add-sem-enroll-start').value || null,
    enrollment_end_date: document.getElementById('add-sem-enroll-end').value || null,
    is_current: document.getElementById('add-sem-current').checked
  };

  // Remove empty optional fields
  if (!data.enrollment_start_date) delete data.enrollment_start_date;
  if (!data.enrollment_end_date) delete data.enrollment_end_date;

  try {
    await api.post(endpoints.semesters, data);
    Toast.success('Semester created successfully');
    state.showSemesterAddModal = false;
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Creating semester');
  }
};

window.submitEditSemester = async function () {
  const form = document.getElementById('edit-semester-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = {
    name: document.getElementById('edit-sem-name').value,
    academic_year: document.getElementById('edit-sem-year').value,
    start_date: document.getElementById('edit-sem-start').value,
    end_date: document.getElementById('edit-sem-end').value,
    enrollment_start_date: document.getElementById('edit-sem-enroll-start').value || null,
    enrollment_end_date: document.getElementById('edit-sem-enroll-end').value || null,
    is_current: document.getElementById('edit-sem-current').checked
  };

  // Remove empty optional fields
  if (!data.enrollment_start_date) delete data.enrollment_start_date;
  if (!data.enrollment_end_date) delete data.enrollment_end_date;

  try {
    await api.put(endpoints.semesterDetail(state.editingSemester.id), data);
    Toast.success('Semester updated successfully');
    state.showSemesterEditModal = false;
    state.editingSemester = null;
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Updating semester');
  }
};

window.setCurrentSemester = async function (semesterId) {
  const confirmed = await ConfirmModal({
    title: 'Set as Current Semester',
    message: 'Are you sure you want to set this semester as the current semester?',
    confirmLabel: 'Set as Current',
    danger: false
  });

  if (!confirmed) return;

  try {
    await api.post(endpoints.setCurrentSemester(semesterId), {});
    Toast.success('Semester set as current successfully');
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Setting current semester');
  }
};

window.deleteSemester = async function (semesterId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Semester',
    message: 'Are you sure you want to delete this semester? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.semesterDetail(semesterId));
    Toast.success('Semester deleted successfully');
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting semester');
  }
};

// ============================================================
// PREREQUISITE FUNCTIONS
// ============================================================

function resetPrereqState(mode) {
  state.prereqState[mode] = { selected: [], results: [], search: '' };
}

function initEditPrerequisites(subject) {
  state.prereqState.edit.selected = (subject.prerequisites || []).map(p => ({
    id: p.id,
    code: p.code,
    title: p.title || p.name
  }));
}

function updatePrereqDropdown(mode) {
  const dropdown = document.getElementById(`${mode === 'edit' ? 'edit' : 'add'}-prereq-dropdown`);
  if (!dropdown) return;

  if (state.prereqState[mode].results.length === 0) {
    dropdown.classList.add('hidden');
    return;
  }

  dropdown.classList.remove('hidden');
  dropdown.innerHTML = state.prereqState[mode].results.map(s => `
    <button type="button" onclick="addPrerequisite('${mode}', '${s.id}', '${s.code}', '${(s.title || s.name || '').replace(/'/g, "\\'")}')"
  class="w-full px-4 py-2 text-left hover:bg-gray-100 flex justify-between items-center border-b border-gray-100 last:border-0">
      <span class="font-mono text-blue-600 font-medium">${s.code}</span>
      <span class="text-gray-600 text-sm truncate ml-2">${s.title || s.name || ''}</span>
    </button>
    `).join('');
}

function updateSelectedPrereqs(mode) {
  const container = document.getElementById(`${mode === 'edit' ? 'edit' : 'add'}-selected-prereqs`);
  if (!container) return;

  if (state.prereqState[mode].selected.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">No prerequisites selected</p>';
    return;
  }

  container.innerHTML = state.prereqState[mode].selected.map(p => `
    <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
      <span class="font-mono font-medium">${p.code}</span>
      <button type="button" onclick="removePrerequisite('${mode}', '${p.id}')"
              class="hover:text-red-600 ml-1 focus:outline-none">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </span>
    `).join('');
}

function setupPrereqSearchListeners(mode) {
  const searchInput = document.getElementById(`${mode === 'edit' ? 'edit' : 'add'}-prereq-search`);
  if (!searchInput) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchPrerequisites(mode, e.target.value);
    }, 300);
  });

  searchInput.addEventListener('focus', () => {
    if (state.prereqState[mode].results.length > 0) {
      updatePrereqDropdown(mode);
    }
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById(`${mode === 'edit' ? 'edit' : 'add'}-prereq-dropdown`);
    if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

function searchPrerequisites(mode, query) {
  state.prereqState[mode].search = query;

  if (query.length < 2) {
    state.prereqState[mode].results = [];
    updatePrereqDropdown(mode);
    return;
  }

  const lowerQuery = query.toLowerCase();
  const editingId = state.editingSubject?.id;

  // Filter from loaded subjects
  const results = state.subjects.filter(s =>
    (s.code.toLowerCase().includes(lowerQuery) ||
      (s.title || s.name || '').toLowerCase().includes(lowerQuery)) &&
    !state.prereqState[mode].selected.find(p => p.id === s.id) &&
    s.id !== editingId  // Can't be prerequisite of itself
  ).slice(0, 10);

  state.prereqState[mode].results = results;
  updatePrereqDropdown(mode);
}

window.addPrerequisite = function (mode, id, code, title) {
  if (!state.prereqState[mode].selected.find(p => p.id === id)) {
    state.prereqState[mode].selected.push({ id, code, title });
    updateSelectedPrereqs(mode);
  }

  // Clear search
  const searchInput = document.getElementById(`${mode === 'edit' ? 'edit' : 'add'}-prereq-search`);
  if (searchInput) {
    searchInput.value = '';
  }
  state.prereqState[mode].results = [];
  updatePrereqDropdown(mode);
};

window.removePrerequisite = function (mode, id) {
  state.prereqState[mode].selected = state.prereqState[mode].selected.filter(p => p.id !== id);
  updateSelectedPrereqs(mode);
};

// ============================================================
// SECTIONS TAB & LOGIC
// ============================================================


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
// ====================
// SECTION MODALS (New)
// ====================

window.openAssignStudentsModal = async function () {
  const section = state.selectedSection;
  if (!section) return;

  // UI Loading
  const modal = new Modal({
    title: 'Assign Students',
    content: '<div class="p-8 text-center text-gray-500">Loading recommendations...</div>'
  });
  modal.show();

  try {
    const recommendations = await api.get(endpoints.section(section.id) + 'recommend-students/');

    // Update modal content
    const content = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <h4 class="font-bold text-blue-800 text-sm">System Recommendations</h4>
                        <p class="text-xs text-blue-600">Showing students in ${section.program_code} - Year ${section.year_level} who are not assigned to any section.</p>
                    </div>
                </div>
                
                <div class="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 w-10">
                                    <input type="checkbox" onchange="toggleSelectAllStudents(this)" class="rounded border-gray-300">
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student No.</th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200" id="recommend-list">
                            ${recommendations.map(s => `
                                <tr>
                                    <td class="px-4 py-2 text-center">
                                        <input type="checkbox" name="assign_student" value="${s.user_id}" class="rounded border-gray-300 cursor-pointer">
                                    </td>
                                    <td class="px-4 py-2 text-sm font-mono">${s.student_number}</td>
                                    <td class="px-4 py-2 text-sm font-bold">${s.last_name}, ${s.first_name}</td>
                                </tr>
                            `).join('')}
                             ${recommendations.length === 0 ? '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-400">No matching students found.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    modal.close();

    new Modal({
      title: `Assign Students to ${section.name}`,
      content: content,
      actions: [
        { label: 'Cancel', onClick: m => m.close() },
        {
          label: `Assign Selected`,
          primary: true,
          onClick: async (m) => {
            const selected = [...document.querySelectorAll('input[name="assign_student"]:checked')].map(cb => cb.value);
            if (selected.length === 0) {
              Toast.error('Please select students to assign');
              return;
            }

            try {
              setButtonLoading(m.element.querySelector('button.btn-primary'), true);
              await api.post(endpoints.section(section.id) + 'assign-students/', { student_ids: selected });
              Toast.success(`Assigned ${selected.length} students`);
              m.close();
              await viewSection(section.id);
            } catch (e) {
              ErrorHandler.handle(e, 'Assigning students');
              setButtonLoading(m.element.querySelector('button.btn-primary'), false);
            }
          }
        }
      ],
      size: 'lg'
    }).show();

  } catch (e) {
    modal.close();
    ErrorHandler.handle(e, 'Loading recommendations');
  }
};

window.toggleSelectAllStudents = function (source) {
  document.querySelectorAll('input[name="assign_student"]').forEach(cb => cb.checked = source.checked);
};

window.openViewStudentsModal = async function () {
  const section = state.selectedSection;
  if (!section) return;

  // UI Loading
  const modal = new Modal({
    title: `Students in ${section.name}`,
    content: '<div class="p-8 text-center text-gray-500">Loading students...</div>'
  });
  modal.show();

  try {
    const students = await api.get(endpoints.section(section.id) + 'students/');
    const content = `
                <div class="mb-2 text-sm text-gray-500 text-right">Total: ${students.length} students</div>
                <div class="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student No.</th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th class="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${students.map(s => `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-mono">${s.student_number}</td>
                                    <td class="px-4 py-2 text-sm font-bold">${s.last_name}, ${s.first_name}</td>
                                    <td class="px-4 py-2 text-right">
                                        <button onclick="removeStudentFromSection('${s.user_id}')" class="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                             ${students.length === 0 ? '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-400">No students assigned.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
        `;
    modal.close();
    new Modal({
      title: `Students in ${section.name}`,
      content: content,
      actions: [{ label: 'Close', onClick: m => m.close() }],
      size: 'lg'
    }).show();
  } catch (e) {
    modal.close();
    ErrorHandler.handle(e, 'Loading students');
  }
};

window.removeStudentFromSection = async function (studentId) {
  if (!confirm('Are you sure you want to remove this student from the section?')) return;
  try {
    const section = state.selectedSection;
    await api.post(endpoints.section(section.id) + 'remove-student/', { student_id: studentId });
    Toast.success('Student removed');

    // Refresh by reloading same modal - a bit recursive. 
    // Better: Close all modals and re-open ViewStudents? 
    // Or manually remove row?
    document.querySelector(`button[onclick="removeStudentFromSection('${studentId}')"]`).closest('tr').remove();

    // Also refresh the section details in background
    await loadSectionDetails(section.id);
    render(); // Updating counts

  } catch (e) {
    ErrorHandler.handle(e, 'Removing student');
  }
};

// ====================
// SECTION MODALS (New)
// ====================

window.openAssignStudentsModal = async function () {
  const section = state.selectedSection;
  if (!section) return;

  // UI Loading
  const modal = new Modal({
    title: 'Assign Students',
    content: '<div class="p-8 text-center text-gray-500">Loading recommendations...</div>'
  });
  modal.show();

  try {
    const recommendations = await api.get(endpoints.section(section.id) + 'recommend-students/');

    // Update modal content
    const content = `
            <div class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                    <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <div>
                        <h4 class="font-bold text-blue-800 text-sm">System Recommendations</h4>
                        <p class="text-xs text-blue-600">Showing students in ${section.program_code} - Year ${section.year_level} who are not assigned to any section.</p>
                    </div>
                </div>
                
                <div class="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 w-10">
                                    <input type="checkbox" onchange="toggleSelectAllStudents(this)" class="rounded border-gray-300">
                                </th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student No.</th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200" id="recommend-list">
                            ${recommendations.map(s => `
                                <tr>
                                    <td class="px-4 py-2 text-center">
                                        <input type="checkbox" name="assign_student" value="${s.user_id}" class="rounded border-gray-300 cursor-pointer">
                                    </td>
                                    <td class="px-4 py-2 text-sm font-mono">${s.student_number}</td>
                                    <td class="px-4 py-2 text-sm font-bold">${s.last_name}, ${s.first_name}</td>
                                </tr>
                            `).join('')}
                             ${recommendations.length === 0 ? '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-400">No matching students found.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    modal.close();

    new Modal({
      title: `Assign Students to ${section.name}`,
      content: content,
      actions: [
        { label: 'Cancel', onClick: m => m.close() },
        {
          label: `Assign Selected`,
          primary: true,
          onClick: async (m) => {
            const selected = [...document.querySelectorAll('input[name="assign_student"]:checked')].map(cb => cb.value);
            if (selected.length === 0) {
              Toast.error('Please select students to assign');
              return;
            }

            try {
              setButtonLoading(m.element.querySelector('button.btn-primary'), true);
              await api.post(endpoints.section(section.id) + 'assign-students/', { student_ids: selected });
              Toast.success(`Assigned ${selected.length} students`);
              m.close();
              await viewSection(section.id);
            } catch (e) {
              ErrorHandler.handle(e, 'Assigning students');
              setButtonLoading(m.element.querySelector('button.btn-primary'), false);
            }
          }
        }
      ],
      size: 'lg'
    }).show();

  } catch (e) {
    modal.close();
    ErrorHandler.handle(e, 'Loading recommendations');
  }
};

window.toggleSelectAllStudents = function (source) {
  document.querySelectorAll('input[name="assign_student"]').forEach(cb => cb.checked = source.checked);
};

window.openViewStudentsModal = async function () {
  const section = state.selectedSection;
  if (!section) return;

  // UI Loading
  const modal = new Modal({
    title: `Students in ${section.name}`,
    content: '<div class="p-8 text-center text-gray-500">Loading students...</div>'
  });
  modal.show();

  try {
    const students = await api.get(endpoints.section(section.id) + 'students/');
    const content = `
                <div class="mb-2 text-sm text-gray-500 text-right">Total: ${students.length} students</div>
                <div class="max-h-[500px] overflow-y-auto border border-gray-200 rounded-lg">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Student No.</th>
                                <th class="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                <th class="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${students.map(s => `
                                <tr>
                                    <td class="px-4 py-2 text-sm font-mono">${s.student_number}</td>
                                    <td class="px-4 py-2 text-sm font-bold">${s.last_name}, ${s.first_name}</td>
                                    <td class="px-4 py-2 text-right">
                                        <button onclick="removeStudentFromSection('${s.user_id}')" class="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                             ${students.length === 0 ? '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-400">No students assigned.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
        `;
    modal.close();
    new Modal({
      title: `Students in ${section.name}`,
      content: content,
      actions: [{ label: 'Close', onClick: m => m.close() }],
      size: 'lg'
    }).show();
  } catch (e) {
    modal.close();
    ErrorHandler.handle(e, 'Loading students');
  }
};

window.removeStudentFromSection = async function (studentId) {
  if (!confirm('Are you sure you want to remove this student from the section?')) return;
  try {
    const section = state.selectedSection;
    await api.post(endpoints.section(section.id) + 'remove-student/', { student_id: studentId });
    Toast.success('Student removed');

    // Refresh by reloading same modal - a bit recursive. 
    // Better: Close all modals and re-open ViewStudents? 
    // Or manually remove row?
    document.querySelector(`button[onclick="removeStudentFromSection('${studentId}')"]`).closest('tr').remove();

    // Also refresh the section details in background
    await loadSectionDetails(section.id);
    render(); // Updating counts

  } catch (e) {
    ErrorHandler.handle(e, 'Removing student');
  }
};

window.updateAddSectionCurricula = async function (programId) {
  const currSelect = document.getElementById('sec-curriculum');
  if (!currSelect) return;

  if (!programId) {
    currSelect.innerHTML = '<option value="">Select Program First</option>';
    return;
  }

  // Fetch curricula
  try {
    const curricula = await api.get(endpoints.curricula + `?program=${programId}`);
    const activeFirst = curricula.sort((a, b) => (b.is_active - a.is_active));

    currSelect.innerHTML = '<option value="">Select Curriculum to load subjects...</option>' +
      activeFirst.map(c => `<option value="${c.id}">${c.code} ${c.is_active ? '(Active)' : ''}</option>`).join('');

    // Reset subjects
    document.getElementById('sec-subjects-list').innerHTML = '<p class="text-xs text-gray-400 text-center col-span-2">Select a curriculum to view subjects</p>';
    document.getElementById('sec-subjects-wrapper').classList.add('hidden');
  } catch (e) {
    console.error(e);
    currSelect.innerHTML = '<option value="">Error loading curricula</option>';
  }
};

window.updateAddSectionSubjects = async function () {
  const currId = document.getElementById('sec-curriculum').value;
  const yearLevel = parseInt(document.getElementById('sec-year').value);

  if (!currId) {
    document.getElementById('sec-subjects-wrapper').classList.add('hidden');
    return;
  }

  document.getElementById('sec-subjects-wrapper').classList.remove('hidden');
  const container = document.getElementById('sec-subjects-list');
  container.innerHTML = '<p class="text-xs text-gray-500 col-span-2">Loading subjects...</p>';

  try {
    const structure = await api.get(endpoints.curriculumStructure(currId));

    let subjects = [];
    const blocks = Array.isArray(structure) ? structure : (structure.year_levels || []);

    blocks.forEach(yearBlock => {
      if (yearBlock.year_level === yearLevel) {
        subjects = subjects.concat(yearBlock.subjects || []);
      }
    });

    if (subjects.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-500 col-span-2">No subjects found for Year ' + yearLevel + '.</p>';
      return;
    }

    container.innerHTML = subjects.map(s => `
            <div class="flex items-start gap-2 bg-white p-2 rounded border border-gray-100">
                <input type="checkbox" name="sec_subjects" value="${s.id}" checked class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                <div class="text-sm">
                    <span class="font-bold text-gray-700 block">${s.code}</span>
                    <span class="text-gray-500 text-[10px] block leading-tight">${s.title}</span>
                </div>
            </div>
        `).join('');

  } catch (e) {
    container.innerHTML = '<p class="text-xs text-red-500 col-span-2">Error loading subjects</p>';
    console.error(e);
  }
};
