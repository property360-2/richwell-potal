import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, initHashNavigation, updateHash } from '../components/tabs.js';

// Tab constants
const TABS = {
  PROGRAMS: 'programs',
  SUBJECTS: 'subjects',
  CURRICULA: 'curricula',
  SEMESTERS: 'semesters'
};

// State
const state = {
  user: null,
  loading: true,
  activeTab: TABS.PROGRAMS,

  // Programs state
  programs: [],
  programModal: null,
  editingProgram: null,

  // Subjects state
  subjects: [],
  selectedProgram: null,
  subjectModal: null,
  editingSubject: null,
  subjectSearch: '',
  prereqModal: null,

  // Prerequisite selection state
  prereqState: {
    add: { selected: [], results: [], search: '' },
    edit: { selected: [], results: [], search: '' }
  },

  // Curricula state
  curricula: [],
  selectedCurriculum: null,
  curriculumModal: null,
  curriculumSubjectModal: null,
  editingCurriculumSubject: null,
  availableSubjects: [], // For adding to curriculum
  assignedSubjectIds: new Set(), // For filtering add dropdown
  curriculumFilter: 'all', // 'all' or programId
  curriculumSort: 'effective_year_desc', // 'effective_year_desc', 'effective_year_asc', 'code_asc'

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

  // Navigation State
  viewStack: [], // For back navigation
  currentView: 'list', // 'list', 'program_detail', 'curriculum_detail'
  activeProgram: null,
  activeCurriculum: null,
  curriculumStructure: null
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
    if (response && response.semesters) {
      state.semesters = response.semesters;
      state.activeSemester = response.semesters.find(s => s.is_current);
    } else if (Array.isArray(response)) {
      state.semesters = response;
      state.activeSemester = response.find(s => s.is_current);
    } else {
      state.semesters = [];
    }
    filterSemesters();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
  }
}

function filterSemesters() {
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
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Academic Structure</h1>
        <p class="text-gray-600 mt-1">Manage programs, subjects, and curricula</p>
      </div>

      <!-- Tabs -->
      ${createTabs({
    tabs: [
      { id: TABS.PROGRAMS, label: 'Programs' },
      { id: TABS.SUBJECTS, label: 'Subjects' },
      { id: TABS.CURRICULA, label: 'Curricula' },
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

function renderTabContent() {
  switch (state.activeTab) {
    case TABS.PROGRAMS:
      if (state.currentView === 'curriculum_detail') {
        return renderCurriculumProspectusView();
      } else if (state.currentView === 'program_detail') {
        return renderProgramCurriculaView();
      }
      return renderProgramsTab();
    case TABS.SUBJECTS:
      return renderSubjectsTab();
    case TABS.CURRICULA:
      if (state.currentView === 'curriculum_detail') {
        return renderCurriculumProspectusView();
      }
      return renderCurriculaTab();
    case TABS.SEMESTERS:
      return renderSemestersTab();
    default:
      return renderProgramsTab();
  }
}

// ============================================================
// PROGRAMS TAB
// ============================================================

function renderProgramsTab() {
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Programs</h2>
        <p class="text-sm text-gray-600 mt-1">Academic programs and curriculum tracks</p>
      </div>
      <button onclick="openAddProgramModal()" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Add Program
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${state.programs.length === 0 ? `
        <div class="col-span-full card text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <p class="text-gray-500 text-lg">No programs found</p>
          <p class="text-gray-400 text-sm mt-2">Click "Add Program" to create your first program</p>
        </div>
      ` : state.programs.map(program => `
        <div class="card hover:shadow-lg transition-all duration-200 group cursor-pointer border-l-4 ${program.is_active ? 'border-l-blue-500' : 'border-l-gray-300'}" 
             onclick="navigateToProgram('${program.id}')">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">${program.code}</h3>
                ${program.is_active
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>'
      : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>'
    }
              </div>
              <p class="text-gray-900 font-medium">${program.name}</p>
            </div>
          </div>

          ${program.description ? `
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">${program.description}</p>
          ` : ''}

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-blue-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 mb-1">Duration</p>
              <p class="text-lg font-bold text-blue-600">${program.duration_years} ${program.duration_years === 1 ? 'year' : 'years'}</p>
            </div>
            <div class="bg-purple-50 rounded-lg p-3">
              <p class="text-xs text-gray-600 mb-1">Subjects</p>
              <p class="text-lg font-bold text-purple-600">${program.total_subjects || 0}</p>
            </div>
          </div>

          <div class="flex gap-2 pt-4 border-t border-gray-200" onclick="event.stopPropagation()">
            <button onclick="openEditProgramModal('${program.id}')" class="btn btn-secondary flex-1 text-sm py-2">
              Edit
            </button>
            <button onclick="deleteProgram('${program.id}')" class="btn btn-danger flex-1 text-sm py-2">
              Delete
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// NAVIGATION & SUBS VIEWS
// ============================================================

window.navigateToProgram = async function (programId) {
  state.loading = true;
  render();

  try {
    const program = state.programs.find(p => p.id === programId);
    if (program) {
      state.activeProgram = program;
      await loadCurricula(programId);
      state.currentView = 'program_detail';
      state.viewStack.push('list');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading program details');
  } finally {
    state.loading = false;
    render();
  }
};

window.navigateBack = function () {
  if (state.viewStack.length > 0) {
    const prevView = state.viewStack.pop();
    if (prevView === 'list') {
      state.currentView = 'list';
      state.activeProgram = null;
      state.activeCurriculum = null;
    } else if (prevView === 'program_detail') {
      state.currentView = 'program_detail';
      state.activeCurriculum = null;
    }
    render();
  } else {
    state.currentView = 'list';
    render();
  }
};

window.navigateToCurriculum = async function (curriculumId) {
  state.loading = true;
  render();

  try {
    const curriculum = await api.get(endpoints.curriculumDetail(curriculumId));
    const structure = await api.get(endpoints.curriculumStructure(curriculumId));

    state.activeCurriculum = curriculum;
    state.curriculumStructure = structure;

    // Also load subjects for this program to facilitate adding
    if (curriculum.program) {
      await loadSubjects(curriculum.program);
      state.availableSubjects = [...state.subjects];
    }

    // Push current view to stack before switching
    state.viewStack.push(state.currentView);
    state.currentView = 'curriculum_detail';
  } catch (error) {
    ErrorHandler.handle(error, 'Loading curriculum details');
  } finally {
    state.loading = false;
    render();
  }
}


function renderProgramCurriculaView() {
  if (!state.activeProgram) return '<div class="text-center p-8">Program not found</div>';

  return `
        <div class="mb-6">
            <button onclick="navigateBack()" class="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
                <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                Back to Programs
            </button>
            
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">${state.activeProgram.name}</h2>
                    <p class="text-gray-600">Curriculum List</p>
                </div>
                <button onclick="openAddCurriculumModal()" class="btn btn-primary flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    New Curriculum
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             ${state.curricula.length === 0 ? `
                <div class="col-span-full card text-center py-12">
                   <p class="text-gray-500 text-lg">No curricula found for this program</p>
                   <p class="text-gray-400 text-sm mt-2">Create one to get started</p>
                </div>
             ` : state.curricula.map(curriculum => `
                 <div class="card hover:shadow-xl transition-all duration-200 cursor-pointer border-t-4 ${curriculum.is_active ? 'border-t-green-500' : 'border-t-gray-300'}"
                      onclick="navigateToCurriculum('${curriculum.id}')">
                      <div class="flex justify-between items-start mb-3">
                          <h3 class="text-lg font-bold text-gray-800">${curriculum.code}</h3>
                          ${curriculum.is_active
      ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Active</span>'
      : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Inactive</span>'}
                      </div>
                      <p class="text-sm text-gray-600 mb-4">Effective Year: <span class="font-semibold">${curriculum.effective_year}</span></p>
                      
                      ${curriculum.description ? `<p class="text-sm text-gray-500 line-clamp-2 mb-4">${curriculum.description}</p>` : ''}
                      
                      <div class="flex gap-2 mt-auto pt-4 border-t border-gray-100" onclick="event.stopPropagation()">
                          <button onclick="openEditCurriculumModal('${curriculum.id}')" class="flex-1 btn btn-secondary text-xs py-2">Edit</button>
                          <button onclick="deleteCurriculum('${curriculum.id}')" class="flex-1 btn btn-danger text-xs py-2">Delete</button>
                      </div>
                 </div>
             `).join('')}
        </div>
    `;
}

function renderCurriculumProspectusView() {
  if (!state.activeCurriculum) return '<div>Curriculum not found</div>';

  return `
      <div class="mb-6">
         <button onclick="navigateBack()" class="flex items-center text-gray-600 hover:text-blue-600 mb-4 transition-colors">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
            Back
         </button>
         
         <div class="flex items-start justify-between">
             <div>
                 <div class="flex items-center gap-3 mb-1">
                     <h2 class="text-2xl font-bold text-gray-900">${state.activeCurriculum.code}</h2>
                     ${state.activeCurriculum.is_active
      ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Active</span>'
      : '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">Archive</span>'}
                 </div>
                 <p class="text-gray-600">${state.activeCurriculum.program_name || 'Program'} • Effective ${state.activeCurriculum.effective_year}</p>
             </div>
             <div class="flex gap-2">
                 <button onclick="openEditCurriculumModal('${state.activeCurriculum.id}')" class="btn btn-secondary flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    Edit Info
                 </button>
                 <button onclick="openAddCurriculumSubjectModal('${state.activeCurriculum.id}')" class="btn btn-primary flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Subject
                 </button>
             </div>
         </div>
      </div>
      
      <!-- Reuse the existing logic for the grid but adapted for full page -->
      ${getCurriculumViewContent(state.activeCurriculum, state.curriculumStructure)}
   `;
}

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

// ============================================================
// SUBJECTS TAB
// ============================================================

function renderSubjectsTab() {
  // If no program selected, show Program Cards
  if (!state.selectedProgram) {
    return `
      <div class="mb-6">
        <div class="mb-6">
          <h2 class="text-xl font-bold text-gray-800">Subjects</h2>
          <p class="text-sm text-gray-600 mt-1">Select a program to manage its subjects</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${state.programs.map(program => `
            <div class="card hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${program.is_active ? 'border-l-blue-500' : 'border-l-gray-300'}"
                 onclick="handleProgramFilterChange('${program.id}')">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-bold text-gray-800">${program.code}</h3>
                <span class="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-full">${program.total_subjects || 0} Subjects</span>
              </div>
              <p class="text-gray-600 text-sm line-clamp-2">${program.name}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // If program selected, show Subjects List with Back button
  return `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-6">
        <button onclick="handleProgramFilterChange('')" class="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
          <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
          Back to Programs
        </button>
        <button onclick="openAddSubjectModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Subject
        </button>
      </div>

      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-800">${state.selectedProgram.code} Subjects</h2>
        <p class="text-gray-600">${state.selectedProgram.name}</p>
      </div>

      <!-- Search Filter -->
      <div class="card p-4 mb-6">
         <label class="block text-sm font-medium text-gray-700 mb-2">Search Subjects</label>
         <div class="relative">
             <input type="text" 
                    placeholder="Search by code or title..." 
                    class="form-input pl-10"
                    value="${state.subjectSearch || ''}"
                    oninput="handleSubjectSearch(this.value)">
             <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
             </svg>
         </div>
      </div>

      ${(() => {
      // Filter subjects based on search
      const filteredSubjects = state.subjectSearch
        ? state.subjects.filter(s =>
          s.code.toLowerCase().includes(state.subjectSearch.toLowerCase()) ||
          (s.title || s.name || '').toLowerCase().includes(state.subjectSearch.toLowerCase())
        )
        : state.subjects;

      if (filteredSubjects.length === 0) {
        return `
            <div class="card text-center py-12">
              <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="text-gray-500 text-lg">No subjects found</p>
              ${!state.subjectSearch ? '<p class="text-gray-400 text-sm mt-2">Click "Add Subject" to create your first subject</p>' : ''}
            </div>
          `;
      }

      return `
          <div class="space-y-3">
            ${filteredSubjects.map(subject => `
              <div class="card hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <h3 class="text-lg font-bold text-blue-600 font-mono">${subject.code}</h3>
                      <span class="px-2 py-1 text-xs font-medium rounded ${subject.year_level === 1 ? 'bg-green-100 text-green-800' :
          subject.year_level === 2 ? 'bg-blue-100 text-blue-800' :
            subject.year_level === 3 ? 'bg-purple-100 text-purple-800' :
              'bg-orange-100 text-orange-800'
        }">
                        Year ${subject.year_level} - ${subject.semester === 1 ? '1st' : '2nd'} Semester
                      </span>
                      <span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        ${subject.units} ${subject.units === 1 ? 'unit' : 'units'}
                      </span>
                    </div>
                    <p class="text-gray-900 font-medium mb-2">${subject.title || subject.name}</p>
                    <div class="flex items-center gap-2 flex-wrap">
                      ${subject.prerequisites && subject.prerequisites.length > 0 ? `
                        <span class="text-xs text-gray-500">Prerequisites:</span>
                        ${subject.prerequisites.map(p => `
                          <span class="px-2 py-0.5 text-xs font-mono bg-amber-100 text-amber-800 rounded border border-amber-200" title="${p.title || p.name || ''}">
                            ${p.code}
                          </span>
                        `).join('')}
                      ` : `
                        <span class="text-xs text-gray-400 italic">No prerequisites</span>
                      `}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button onclick="openEditSubjectModal('${subject.id}')" class="btn btn-secondary text-sm">
                      Edit
                    </button>
                    <button onclick="deleteSubject('${subject.id}')" class="btn btn-danger text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `;
    })()}
    </div>
  `;
}

function getSubjectForm(subject = null) {
  const isEdit = subject !== null;
  const prefix = isEdit ? 'edit' : 'add';
  const prereqMode = isEdit ? 'edit' : 'add';
  const selectedPrereqs = state.prereqState[prereqMode].selected;

  return `
    <form id="${prefix}-subject-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
        <input type="text" id="${prefix}-sub-code" value="${subject?.code || ''}" required class="form-input" placeholder="e.g., IT101, CS201">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Subject Title *</label>
        <input type="text" id="${prefix}-sub-title" value="${subject?.title || subject?.name || ''}" required class="form-input" placeholder="e.g., Introduction to Programming">
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
          <select id="${prefix}-sub-year" required class="form-select">
            <option value="1" ${subject?.year_level === 1 ? 'selected' : ''}>1st Year</option>
            <option value="2" ${subject?.year_level === 2 ? 'selected' : ''}>2nd Year</option>
            <option value="3" ${subject?.year_level === 3 ? 'selected' : ''}>3rd Year</option>
            <option value="4" ${subject?.year_level === 4 ? 'selected' : ''}>4th Year</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
          <select id="${prefix}-sub-semester" required class="form-select">
            <option value="1" ${subject?.semester === 1 ? 'selected' : ''}>1st Semester</option>
            <option value="2" ${subject?.semester === 2 ? 'selected' : ''}>2nd Semester</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Units *</label>
        <input type="number" id="${prefix}-sub-units" value="${subject?.units || 3}" min="1" max="6" required class="form-input">
      </div>

      <!-- Prerequisites Section -->
      <div class="border-t pt-4 mt-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Prerequisites (Optional)
        </label>

        <!-- Search Input -->
        <div class="relative">
          <input
            type="text"
            id="${prefix}-prereq-search"
            placeholder="Search subjects by code or title..."
            class="form-input pr-10"
            autocomplete="off"
          />
          <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>

        <!-- Search Results Dropdown -->
        <div id="${prefix}-prereq-dropdown" class="hidden absolute z-50 mt-1 w-[calc(100%-3rem)] bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
        </div>

        <!-- Selected Prerequisites -->
        <div id="${prefix}-selected-prereqs" class="flex flex-wrap gap-2 mt-3">
          ${selectedPrereqs.length === 0 ? `
            <p class="text-sm text-gray-400">No prerequisites selected</p>
          ` : selectedPrereqs.map(p => `
            <span class="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <span class="font-mono font-medium">${p.code}</span>
              <button type="button" onclick="removePrerequisite('${prereqMode}', '${p.id}')"
                      class="hover:text-red-600 ml-1 focus:outline-none">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </span>
          `).join('')}
        </div>
      </div>
    </form>
  `;
}

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

    <!-- Controls -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="card p-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Program</label>
            <select onchange="handleCurriculumFilterChange(this.value)" class="form-select">
                <option value="all" ${state.curriculumFilter === 'all' ? 'selected' : ''}>All Programs</option>
                ${state.programs.map(p => `
                    <option value="${p.id}" ${state.curriculumFilter === p.id ? 'selected' : ''}>${p.code} - ${p.name}</option>
                `).join('')}
            </select>
        </div>
        <div class="card p-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select onchange="handleCurriculumSortChange(this.value)" class="form-select">
                <option value="effective_year_desc" ${state.curriculumSort === 'effective_year_desc' ? 'selected' : ''}>Newest Effective Year</option>
                <option value="effective_year_asc" ${state.curriculumSort === 'effective_year_asc' ? 'selected' : ''}>Oldest Effective Year</option>
                <option value="code_asc" ${state.curriculumSort === 'code_asc' ? 'selected' : ''}>Code (A-Z)</option>
            </select>
        </div>
    </div>

    ${state.curricula.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No curricula found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Curriculum" to create your first curriculum</p>
      </div>
    ` : (() => {
      // Apply Filter
      let displayCurricula = state.curriculumFilter === 'all'
        ? [...state.curricula]
        : state.curricula.filter(c => c.program === state.curriculumFilter);

      // Apply Sort
      displayCurricula.sort((a, b) => {
        switch (state.curriculumSort) {
          case 'effective_year_desc':
            return b.effective_year - a.effective_year;
          case 'effective_year_asc':
            return a.effective_year - b.effective_year;
          case 'code_asc':
            return a.code.localeCompare(b.code);
          default:
            return 0;
        }
      });

      if (displayCurricula.length === 0) {
        return `
                <div class="card text-center py-12">
                   <p class="text-gray-500">No curricula found matching filters</p>
                </div>
            `;
      }

      return `
            <div class="space-y-4">
            ${displayCurricula.map(curriculum => `
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
                    <button onclick="navigateToCurriculum('${curriculum.id}')" class="btn btn-secondary text-sm">
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
        `;
    })()}
  `;
}

// ============================================================
// EVENT HANDLERS - SUBJECTS SEARCH & FILTER
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

window.handleSubjectSearch = function (query) {
  state.subjectSearch = query;
  render();
};

// ============================================================
// EVENT HANDLERS - CURRICULA SORT & FILTER
// ============================================================

window.handleCurriculumFilterChange = function (value) {
  state.curriculumFilter = value;
  render();
};

window.handleCurriculumSortChange = function (value) {
  state.curriculumSort = value;
  render();
};

// ============================================================
// EVENT HANDLERS - TAB SWITCHING
// ============================================================

window.switchTab = function (tabId) {
  state.activeTab = tabId;
  updateHash(tabId);

  // Load data for the tab if needed
  if (tabId === TABS.SUBJECTS && !state.subjects.length && state.selectedProgram) {
    loadSubjects(state.selectedProgram.id).then(render);
  } else if (tabId === TABS.CURRICULA && !state.curricula.length) {
    loadCurricula().then(render);
  } else if (tabId === TABS.SEMESTERS && !state.semesters.length) {
    loadSemesters().then(render);
  } else {
    render();
  }
};

// ============================================================
// EVENT HANDLERS - PROGRAMS
// ============================================================

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

          try {
            await api.post(endpoints.managePrograms, data);
            Toast.success('Program added successfully');
            m.close();
            await loadPrograms();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding program');
          }
        }
      }
    ]
  });

  state.programModal = modal;
  modal.show();
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

            try {
              await api.put(endpoints.manageProgram(state.editingProgram.id), data);
              Toast.success('Program updated successfully');
              m.close();
              state.editingProgram = null;
              await loadPrograms();
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating program');
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
  if (!state.selectedProgram) {
    Toast.error('Please select a program first');
    return;
  }

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
            semester: parseInt(document.getElementById('add-sub-semester').value),
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
              semester: parseInt(document.getElementById('edit-sub-semester').value),
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

    // Load ALL subjects for the program to facilitate adding new ones
    if (curriculum.program) {
      // Load subjects for the program (this populates state.subjects)
      await loadSubjects(curriculum.program);
      // Copy to availableSubjects so we have them for the modal
      state.availableSubjects = [...state.subjects];
    }

    state.selectedCurriculum = curriculum;

    const modal = new Modal({
      title: `Curriculum: ${curriculum.code}`,
      content: getCurriculumViewContent(curriculum, structure),
      size: 'xl',
      actions: [
        {
          label: 'Close',
          onClick: (m) => {
            m.close();
            state.selectedCurriculum = null;
          }
        },
        {
          label: 'Edit Curriculum',
          primary: false,
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

  // Flatten structure for easier checking of assigned subjects
  const assignedSubjectIds = new Set();

  Object.keys(structure).forEach(year => {
    Object.keys(structure[year]).forEach(sem => {
      const subjects = structure[year][sem];
      if (subjects && subjects.length > 0) {
        const key = `${year}-${sem}`;
        subjectsByLevel[key] = subjects;
        totalSubjects += subjects.length;
        subjects.forEach(s => assignedSubjectIds.add(s.id));
      }
    });
  });

  // Store assigned IDs in state for filtering add dropdown
  state.assignedSubjectIds = assignedSubjectIds;

  return `
    <!-- Curriculum Info -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="flex justify-between items-start">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <div>
            <p class="text-sm text-gray-600">Program</p>
            <p class="font-semibold text-gray-900">${curriculum.program_name || 'Not assigned'}</p>
            </div>
            <div>
            <p class="text-sm text-gray-600">Effective Year</p>
            <p class="font-semibold text-gray-900">${curriculum.effective_year}</p>
            </div>
            <div>
            <p class="text-sm text-gray-600">Total Subjects</p>
            <p class="font-semibold text-gray-900">${totalSubjects}</p>
            </div>
            <div>
            <p class="text-sm text-gray-600">Status</p>
            <p class="font-semibold ${curriculum.is_active ? 'text-green-600' : 'text-gray-600'}">
                ${curriculum.is_active ? 'Active' : 'Inactive'}
            </p>
            </div>
        </div>
        <button onclick="openAddCurriculumSubjectModal('${curriculum.id}')" class="btn btn-primary btn-sm flex items-center gap-2 ml-4">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Subject
        </button>
      </div>
      ${curriculum.description ? `
        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-sm text-gray-600">Description</p>
          <p class="text-gray-900">${curriculum.description}</p>
        </div>
      ` : ''}
    </div>

    <!-- Subjects by Year and Semester -->
    ${totalSubjects === 0 ? `
      <div class="text-center py-12 bg-gray-50 rounded-lg">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <p class="text-gray-500 text-lg">No subjects assigned to this curriculum yet</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Subject" to assign subjects</p>
      </div>
    ` : `
      <div class="space-y-6">
        ${[1, 2, 3, 4, 5].map(year => {
    const hasYearSubjects = [1, 2, 3].some(sem => subjectsByLevel[`${year}-${sem}`]?.length > 0);
    if (!hasYearSubjects) return '';

    return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="bg-blue-600 text-white px-4 py-3">
                <h3 class="font-bold text-lg">Year ${year}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                ${[1, 2, 3].map(semester => {
      const key = `${year}-${semester}`;
      const subjects = subjectsByLevel[key] || [];

      if (subjects.length === 0) return '';

      const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);
      const semesterName = semester === 3 ? 'Summer' : (semester === 1 ? '1st Semester' : '2nd Semester');

      return `
                    <div class="border border-gray-200 rounded-lg">
                      <div class="bg-gray-100 px-3 py-2 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                          <h4 class="font-semibold text-gray-800">${semesterName}</h4>
                          <span class="text-sm text-gray-600">${totalUnits} units</span>
                        </div>
                      </div>
                      <div class="p-3 space-y-2">
                        ${subjects.map(subject => `
                          <div class="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 group">
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <p class="font-medium text-gray-900">${subject.code}</p>
                                ${!subject.is_required ? '<span class="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">Elective</span>' : ''}
                              </div>
                              <p class="text-sm text-gray-600">${subject.title}</p>
                              ${subject.prerequisites && subject.prerequisites.length > 0 ? `
                                <p class="text-xs text-gray-500 mt-1">
                                  Prereq: ${subject.prerequisites.map(p => p.code).join(', ')}
                                </p>
                              ` : ''}
                            </div>
                            <div class="ml-3 text-right">
                              <span class="inline-block px-2 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800 mb-1">
                                ${subject.units} ${subject.units === 1 ? 'unit' : 'units'}
                              </span>
                              <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="openEditCurriculumSubjectModal('${curriculum.id}', '${subject.id}', ${year}, ${semester}, ${subject.is_required})" class="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onclick="removeCurriculumSubject('${curriculum.id}', '${subject.id}')" class="p-1 text-red-600 hover:bg-red-50 rounded" title="Remove">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  `;
    }).join('')}
              </div>
            </div>
          `;
  }).join('')}
      </div>
    `}
  `;
}

// Add Subject Modal
window.openAddCurriculumSubjectModal = function (curriculumId) {
  // Filter out already assigned subjects
  const unassignedSubjects = state.availableSubjects.filter(s => !state.assignedSubjectIds.has(s.id));

  const content = `
        <form id="add-curr-subject-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <div class="relative">
                    <input type="text" id="subject-search" placeholder="Search subject code or title..." class="form-input mb-2" autocomplete="off">
                    <select id="add-subject-id" required class="form-select" size="5">
                        ${unassignedSubjects.map(s => `
                            <option value="${s.id}">${s.code} - ${s.title} (${s.units} units)</option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
                    <select id="add-year-level" required class="form-select">
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                        <option value="5">5th Year</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                    <select id="add-semester" required class="form-select">
                        <option value="1">1st Semester</option>
                        <option value="2">2nd Semester</option>
                        <option value="3">Summer</option>
                    </select>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="add-is-required" checked class="rounded border-gray-300 text-blue-600">
                <label for="add-is-required" class="text-sm font-medium text-gray-700">Required Subject</label>
            </div>
        </form>
    `;

  const modal = new Modal({
    title: 'Add Subject to Curriculum',
    content: content,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Add Subject',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-curr-subject-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const subjectId = document.getElementById('add-subject-id').value;
          if (!subjectId) {
            Toast.error("Please select a subject");
            return;
          }

          const payload = {
            assignments: [{
              subject_id: subjectId,
              year_level: parseInt(document.getElementById('add-year-level').value),
              semester_number: parseInt(document.getElementById('add-semester').value),
              is_required: document.getElementById('add-is-required').checked
            }]
          };

          try {
            await api.post(endpoints.curriculumAssignSubjects(curriculumId), payload);
            Toast.success('Subject added successfully');
            m.close();
            // Refresh the view
            viewCurriculum(curriculumId);
          } catch (error) {
            ErrorHandler.handle(error, 'Adding subject to curriculum');
          }
        }
      }
    ]
  });

  state.curriculumSubjectModal = modal;
  modal.show();

  // Simple search filter logic
  setTimeout(() => {
    const searchInput = document.getElementById('subject-search');
    const select = document.getElementById('add-subject-id');
    if (searchInput && select) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const options = Array.from(select.options);
        options.forEach(opt => {
          const text = opt.text.toLowerCase();
          opt.style.display = text.includes(term) ? '' : 'none';
        });
      });
    }
  }, 100);
};

// Edit Subject Assignment Modal
window.openEditCurriculumSubjectModal = function (curriculumId, subjectId, currentYear, currentSem, currentRequired) {
  // Find subject details for display
  const subject = state.availableSubjects.find(s => s.id === subjectId);
  const subjectDisplay = subject ? `${subject.code} - ${subject.title}` : 'Unknown Subject';

  const content = `
        <form id="edit-curr-subject-form" class="space-y-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" value="${subjectDisplay}" disabled class="form-input bg-gray-100 text-gray-600">
                <input type="hidden" id="edit-subject-id" value="${subjectId}">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
                    <select id="edit-year-level" required class="form-select">
                        <option value="1" ${currentYear === 1 ? 'selected' : ''}>1st Year</option>
                        <option value="2" ${currentYear === 2 ? 'selected' : ''}>2nd Year</option>
                        <option value="3" ${currentYear === 3 ? 'selected' : ''}>3rd Year</option>
                        <option value="4" ${currentYear === 4 ? 'selected' : ''}>4th Year</option>
                        <option value="5" ${currentYear === 5 ? 'selected' : ''}>5th Year</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
                    <select id="edit-semester" required class="form-select">
                        <option value="1" ${currentSem === 1 ? 'selected' : ''}>1st Semester</option>
                        <option value="2" ${currentSem === 2 ? 'selected' : ''}>2nd Semester</option>
                        <option value="3" ${currentSem === 3 ? 'selected' : ''}>Summer</option>
                    </select>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" id="edit-is-required" ${currentRequired ? 'checked' : ''} class="rounded border-gray-300 text-blue-600">
                <label for="edit-is-required" class="text-sm font-medium text-gray-700">Required Subject</label>
            </div>
        </form>
    `;

  const modal = new Modal({
    title: 'Edit Subject Assignment',
    content: content,
    size: 'sm',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Save Changes',
        primary: true,
        onClick: async (m) => {
          const payload = {
            assignments: [{
              subject_id: subjectId,
              year_level: parseInt(document.getElementById('edit-year-level').value),
              semester_number: parseInt(document.getElementById('edit-semester').value),
              is_required: document.getElementById('edit-is-required').checked
            }]
          };

          try {
            await api.post(endpoints.curriculumAssignSubjects(curriculumId), payload);
            Toast.success('Assignment updated successfully');
            m.close();
            viewCurriculum(curriculumId);
          } catch (error) {
            ErrorHandler.handle(error, 'Updating assignment');
          }
        }
      }
    ]
  });

  state.curriculumSubjectModal = modal;
  modal.show();
};

// Remove Subject
window.removeCurriculumSubject = async function (curriculumId, subjectId) {
  const confirmed = await ConfirmModal({
    title: 'Remove Subject',
    message: 'Are you sure you want to remove this subject from the curriculum?',
    confirmLabel: 'Remove',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.curriculumRemoveSubject(curriculumId, subjectId));
    Toast.success('Subject removed successfully');
    viewCurriculum(curriculumId);
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
