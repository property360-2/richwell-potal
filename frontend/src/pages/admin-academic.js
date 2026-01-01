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
  editingSemester: null
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();

  // Check if user is admin
  if (state.user?.role !== 'ADMIN') {
    Toast.error('Access denied. Admin only.');
    window.location.href = '/login.html';
    return;
  }

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
      role: 'ADMIN',
      activePage: 'admin-academic',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Academic Structure</h1>
        <p class="text-gray-600 mt-1">Manage programs, subjects, curricula, and semesters</p>
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
      return renderProgramsTab();
    case TABS.SUBJECTS:
      return renderSubjectsTab();
    case TABS.CURRICULA:
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
        <div class="card hover:shadow-lg transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="text-xl font-bold text-gray-800">${program.code}</h3>
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

          <div class="flex gap-2 pt-4 border-t border-gray-200">
            <button onclick="openEditProgramModal('${program.id}')" class="btn btn-secondary flex-1 text-sm">
              Edit
            </button>
            <button onclick="deleteProgram('${program.id}')" class="btn btn-danger flex-1 text-sm">
              Delete
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getProgramForm(program = null) {
  const isEdit = program !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-program-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
        <input type="text" id="${prefix}-code" value="${program?.code || ''}" required class="form-input" placeholder="e.g., BSIT, BSCS">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
        <input type="text" id="${prefix}-name" value="${program?.name || ''}" required class="form-input" placeholder="e.g., Bachelor of Science in Information Technology">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="${prefix}-description" rows="3" class="form-input" placeholder="Optional description">${program?.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
        <select id="${prefix}-duration" required class="form-select">
          <option value="2" ${program?.duration_years === 2 ? 'selected' : ''}>2 years</option>
          <option value="3" ${program?.duration_years === 3 ? 'selected' : ''}>3 years</option>
          <option value="4" ${program?.duration_years === 4 ? 'selected' : '' || !program ? 'selected' : ''}>4 years</option>
          <option value="5" ${program?.duration_years === 5 ? 'selected' : ''}>5 years</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="${prefix}-active" ${program?.is_active !== false ? 'checked' : ''} class="rounded border-gray-300">
        <label for="${prefix}-active" class="text-sm font-medium text-gray-700">Active</label>
      </div>
    </form>
  `;
}

// ============================================================
// SUBJECTS TAB
// ============================================================

function renderSubjectsTab() {
  return `
    <div class="mb-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">Subjects</h2>
          <p class="text-sm text-gray-600 mt-1">Manage subjects and prerequisites</p>
        </div>
        ${state.selectedProgram ? `
          <button onclick="openAddSubjectModal()" class="btn btn-primary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Subject
          </button>
        ` : ''}
      </div>

      <div class="card mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Program</label>
        <select onchange="handleProgramFilterChange(this.value)" class="form-select">
          <option value="">Select a program...</option>
          ${state.programs.map(p => `
            <option value="${p.id}" ${state.selectedProgram?.id === p.id ? 'selected' : ''}>${p.code} - ${p.name}</option>
          `).join('')}
        </select>
      </div>
    </div>

    ${!state.selectedProgram ? `
      <div class="card text-center py-12">
        <p class="text-gray-500 text-lg">Select a program to view subjects</p>
      </div>
    ` : state.subjects.length === 0 ? `
      <div class="card text-center py-12">
        <p class="text-gray-500 text-lg">No subjects found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Subject" to create your first subject</p>
      </div>
    ` : `
      <div class="space-y-3">
        ${state.subjects.map(subject => `
          <div class="card">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-bold text-blue-600 font-mono">${subject.code}</h3>
                  <span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                    Year ${subject.year_level} - ${subject.semester === 1 ? '1st' : '2nd'} Sem
                  </span>
                  <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    ${subject.units} units
                  </span>
                </div>
                <p class="text-gray-900 font-medium">${subject.title || subject.name}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="openEditSubjectModal('${subject.id}')" class="btn btn-secondary text-sm">Edit</button>
                <button onclick="deleteSubject('${subject.id}')" class="btn btn-danger text-sm">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function getSubjectForm(subject = null) {
  const isEdit = subject !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-subject-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
        <input type="text" id="${prefix}-sub-code" value="${subject?.code || ''}" required class="form-input">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Subject Title *</label>
        <input type="text" id="${prefix}-sub-title" value="${subject?.title || subject?.name || ''}" required class="form-input">
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

    ${state.curricula.length === 0 ? `
      <div class="card text-center py-12">
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
                <p class="text-sm text-gray-500 mt-1">${curriculum.program_name || 'No program'}</p>
              </div>
              <div class="flex gap-2">
                <button onclick="openEditCurriculumModal('${curriculum.id}')" class="btn btn-secondary text-sm">Edit</button>
                <button onclick="viewCurriculum('${curriculum.id}')" class="btn btn-secondary text-sm">View</button>
                <button onclick="deleteCurriculum('${curriculum.id}')" class="btn btn-danger text-sm">Delete</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function getCurriculumForm(curriculum = null) {
  const isEdit = curriculum !== null;
  const prefix = isEdit ? 'edit' : 'add';

  return `
    <form id="${prefix}-curriculum-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Code *</label>
        <input type="text" id="${prefix}-curriculum-code" value="${curriculum?.code || ''}" required class="form-input">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program *</label>
        <select id="${prefix}-curriculum-program" required class="form-select">
          <option value="">Select a program...</option>
          ${state.programs.map(p => `
            <option value="${p.id}" ${curriculum?.program === p.id ? 'selected' : ''}>${p.code} - ${p.name}</option>
          `).join('')}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Effective Year *</label>
        <input type="number" id="${prefix}-curriculum-year" value="${curriculum?.effective_year || new Date().getFullYear()}" required class="form-input">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="${prefix}-curriculum-description" rows="3" class="form-input">${curriculum?.description || ''}</textarea>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="${prefix}-curriculum-active" ${curriculum?.is_active !== false ? 'checked' : ''} class="rounded border-gray-300">
        <label for="${prefix}-curriculum-active" class="text-sm font-medium text-gray-700">Active</label>
      </div>
    </form>
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
        <p class="text-sm text-gray-600 mt-1">Manage academic semesters</p>
      </div>
      <div class="flex items-center gap-4">
        <select onchange="handleSemesterFilterChange(this.value)" class="form-select text-sm">
          <option value="all" ${state.semesterFilterYear === 'all' ? 'selected' : ''}>All Years</option>
          ${years.map(year => `
            <option value="${year}" ${state.semesterFilterYear === year ? 'selected' : ''}>${year}</option>
          `).join('')}
        </select>
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
        <p class="text-gray-500 text-lg">No semesters found</p>
      </div>
    ` : `
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Semester</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Academic Year</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${state.filteredSemesters.map(sem => `
              <tr class="${sem.is_current ? 'bg-blue-50' : ''}">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${sem.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${sem.academic_year}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  ${formatSemesterDate(sem.start_date)} - ${formatSemesterDate(sem.end_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  ${sem.is_current
                    ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Current</span>'
                    : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Inactive</span>'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                  <button onclick="openEditSemesterModal('${sem.id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                  ${!sem.is_current ? `
                    <button onclick="setCurrentSemester('${sem.id}')" class="text-green-600 hover:text-green-900">Set Current</button>
                    <button onclick="deleteSemester('${sem.id}')" class="text-red-600 hover:text-red-900">Delete</button>
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
            <input type="text" id="add-sem-year" required class="form-input" placeholder="2024-2025">
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
            <input type="text" id="edit-sem-year" value="${sem.academic_year}" required class="form-input">
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
// EVENT HANDLERS
// ============================================================

window.switchTab = function(tabId) {
  state.activeTab = tabId;
  updateHash(tabId);

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

// Programs handlers
window.openAddProgramModal = function() {
  const modal = new Modal({
    title: 'Add New Program',
    content: getProgramForm(),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Add Program',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-program-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }

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
  modal.show();
};

window.openEditProgramModal = async function(programId) {
  try {
    const response = await api.get(endpoints.manageProgram(programId));
    state.editingProgram = response;

    const modal = new Modal({
      title: 'Edit Program',
      content: getProgramForm(response),
      size: 'lg',
      actions: [
        { label: 'Cancel', onClick: (m) => { m.close(); state.editingProgram = null; } },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-program-form');
            if (!form.checkValidity()) { form.reportValidity(); return; }

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
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading program');
  }
};

window.deleteProgram = async function(programId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Program',
    message: 'Are you sure you want to delete this program?',
    confirmLabel: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.manageProgram(programId));
    Toast.success('Program deleted');
    await loadPrograms();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting program');
  }
};

// Subjects handlers
window.handleProgramFilterChange = async function(programId) {
  if (!programId) {
    state.selectedProgram = null;
    state.subjects = [];
  } else {
    state.selectedProgram = state.programs.find(p => p.id === programId);
    await loadSubjects(programId);
  }
  render();
};

window.openAddSubjectModal = function() {
  if (!state.selectedProgram) { Toast.error('Select a program first'); return; }

  const modal = new Modal({
    title: 'Add New Subject',
    content: getSubjectForm(),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Add Subject',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-subject-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }

          const data = {
            code: document.getElementById('add-sub-code').value.toUpperCase(),
            title: document.getElementById('add-sub-title').value,
            year_level: parseInt(document.getElementById('add-sub-year').value),
            semester: parseInt(document.getElementById('add-sub-semester').value),
            units: parseInt(document.getElementById('add-sub-units').value),
            program: state.selectedProgram.id
          };

          try {
            await api.post(endpoints.manageSubjects, data);
            Toast.success('Subject added');
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
  modal.show();
};

window.openEditSubjectModal = async function(subjectId) {
  try {
    const response = await api.get(endpoints.manageSubject(subjectId));
    state.editingSubject = response;

    const modal = new Modal({
      title: 'Edit Subject',
      content: getSubjectForm(response),
      size: 'lg',
      actions: [
        { label: 'Cancel', onClick: (m) => { m.close(); state.editingSubject = null; } },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-subject-form');
            if (!form.checkValidity()) { form.reportValidity(); return; }

            const data = {
              code: document.getElementById('edit-sub-code').value.toUpperCase(),
              title: document.getElementById('edit-sub-title').value,
              year_level: parseInt(document.getElementById('edit-sub-year').value),
              semester: parseInt(document.getElementById('edit-sub-semester').value),
              units: parseInt(document.getElementById('edit-sub-units').value)
            };

            try {
              await api.put(endpoints.manageSubject(state.editingSubject.id), data);
              Toast.success('Subject updated');
              m.close();
              state.editingSubject = null;
              await loadSubjects(state.selectedProgram.id);
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating subject');
            }
          }
        }
      ]
    });
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subject');
  }
};

window.deleteSubject = async function(subjectId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Subject',
    message: 'Are you sure you want to delete this subject?',
    confirmLabel: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.manageSubject(subjectId));
    Toast.success('Subject deleted');
    await loadSubjects(state.selectedProgram.id);
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting subject');
  }
};

// Curricula handlers
window.openAddCurriculumModal = async function() {
  if (state.programs.length === 0) await loadPrograms();

  const modal = new Modal({
    title: 'Add New Curriculum',
    content: getCurriculumForm(),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Create Curriculum',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-curriculum-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }

          const data = {
            code: document.getElementById('add-curriculum-code').value,
            program: document.getElementById('add-curriculum-program').value,
            effective_year: parseInt(document.getElementById('add-curriculum-year').value),
            description: document.getElementById('add-curriculum-description').value,
            is_active: document.getElementById('add-curriculum-active').checked
          };

          try {
            await api.post(endpoints.curricula, data);
            Toast.success('Curriculum created');
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
  modal.show();
};

window.openEditCurriculumModal = async function(curriculumId) {
  if (state.programs.length === 0) await loadPrograms();

  try {
    const curriculum = await api.get(endpoints.curriculumDetail(curriculumId));

    const modal = new Modal({
      title: 'Edit Curriculum',
      content: getCurriculumForm(curriculum),
      size: 'lg',
      actions: [
        { label: 'Cancel', onClick: (m) => m.close() },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-curriculum-form');
            if (!form.checkValidity()) { form.reportValidity(); return; }

            const data = {
              code: document.getElementById('edit-curriculum-code').value,
              program: document.getElementById('edit-curriculum-program').value,
              effective_year: parseInt(document.getElementById('edit-curriculum-year').value),
              description: document.getElementById('edit-curriculum-description').value,
              is_active: document.getElementById('edit-curriculum-active').checked
            };

            try {
              await api.put(endpoints.curriculumDetail(curriculumId), data);
              Toast.success('Curriculum updated');
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
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading curriculum');
  }
};

window.viewCurriculum = async function(curriculumId) {
  Toast.info('View curriculum - coming soon');
};

window.deleteCurriculum = async function(curriculumId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Curriculum',
    message: 'Are you sure you want to delete this curriculum?',
    confirmLabel: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.curriculumDetail(curriculumId));
    Toast.success('Curriculum deleted');
    await loadCurricula();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting curriculum');
  }
};

// Semesters handlers
window.handleSemesterFilterChange = function(year) {
  state.semesterFilterYear = year;
  filterSemesters();
  render();
};

window.openAddSemesterModal = function() {
  state.showSemesterAddModal = true;
  render();
};

window.closeSemesterAddModal = function() {
  state.showSemesterAddModal = false;
  render();
};

window.openEditSemesterModal = function(semesterId) {
  const semester = state.semesters.find(s => s.id === semesterId);
  if (semester) {
    state.editingSemester = semester;
    state.showSemesterEditModal = true;
    render();
  }
};

window.closeSemesterEditModal = function() {
  state.showSemesterEditModal = false;
  state.editingSemester = null;
  render();
};

window.submitAddSemester = async function() {
  const form = document.getElementById('add-semester-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const data = {
    name: document.getElementById('add-sem-name').value,
    academic_year: document.getElementById('add-sem-year').value,
    start_date: document.getElementById('add-sem-start').value,
    end_date: document.getElementById('add-sem-end').value,
    is_current: document.getElementById('add-sem-current').checked
  };

  try {
    await api.post(endpoints.semesters, data);
    Toast.success('Semester created');
    state.showSemesterAddModal = false;
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Creating semester');
  }
};

window.submitEditSemester = async function() {
  const form = document.getElementById('edit-semester-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const data = {
    name: document.getElementById('edit-sem-name').value,
    academic_year: document.getElementById('edit-sem-year').value,
    start_date: document.getElementById('edit-sem-start').value,
    end_date: document.getElementById('edit-sem-end').value,
    is_current: document.getElementById('edit-sem-current').checked
  };

  try {
    await api.put(endpoints.semesterDetail(state.editingSemester.id), data);
    Toast.success('Semester updated');
    state.showSemesterEditModal = false;
    state.editingSemester = null;
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Updating semester');
  }
};

window.setCurrentSemester = async function(semesterId) {
  const confirmed = await ConfirmModal({
    title: 'Set as Current Semester',
    message: 'Set this semester as the current semester?',
    confirmLabel: 'Set as Current',
    danger: false
  });
  if (!confirmed) return;

  try {
    await api.post(endpoints.setCurrentSemester(semesterId), {});
    Toast.success('Semester set as current');
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Setting current semester');
  }
};

window.deleteSemester = async function(semesterId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Semester',
    message: 'Are you sure you want to delete this semester?',
    confirmLabel: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.semesterDetail(semesterId));
    Toast.success('Semester deleted');
    await loadSemesters();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting semester');
  }
};

// Global logout
window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
