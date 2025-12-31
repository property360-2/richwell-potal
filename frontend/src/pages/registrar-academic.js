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
  CURRICULA: 'curricula'
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
  prereqModal: null,

  // Curricula state
  curricula: [],
  selectedCurriculum: null,
  curriculumModal: null
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
          { id: TABS.CURRICULA, label: 'Curricula' }
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

      <!-- Program Filter -->
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
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <p class="text-gray-500 text-lg">Select a program to view subjects</p>
      </div>
    ` : state.subjects.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
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
                  <span class="px-2 py-1 text-xs font-medium rounded ${
                    subject.year_level === 1 ? 'bg-green-100 text-green-800' :
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
                ${subject.prerequisites && subject.prerequisites.length > 0 ? `
                  <div class="flex items-center gap-2 text-sm text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <span>Prerequisites: ${subject.prerequisites.map(p => p.code).join(', ')}</span>
                  </div>
                ` : ''}
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
// EVENT HANDLERS - TAB SWITCHING
// ============================================================

window.switchTab = function(tabId) {
  state.activeTab = tabId;
  updateHash(tabId);

  // Load data for the tab if needed
  if (tabId === TABS.SUBJECTS && !state.subjects.length && state.selectedProgram) {
    loadSubjects(state.selectedProgram.id).then(render);
  } else if (tabId === TABS.CURRICULA && !state.curricula.length) {
    loadCurricula().then(render);
  } else {
    render();
  }
};

// ============================================================
// EVENT HANDLERS - PROGRAMS
// ============================================================

window.openAddProgramModal = function() {
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

window.openEditProgramModal = async function(programId) {
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

window.deleteProgram = async function(programId) {
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
  if (!state.selectedProgram) {
    Toast.error('Please select a program first');
    return;
  }

  const modal = new Modal({
    title: 'Add New Subject',
    content: getSubjectForm(),
    size: 'lg',
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => m.close()
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
            program: state.selectedProgram.id
          };

          try {
            await api.post(endpoints.manageSubjects, data);
            Toast.success('Subject added successfully');
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
        {
          label: 'Cancel',
          onClick: (m) => {
            m.close();
            state.editingSubject = null;
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
              units: parseInt(document.getElementById('edit-sub-units').value)
            };

            try {
              await api.put(endpoints.manageSubject(state.editingSubject.id), data);
              Toast.success('Subject updated successfully');
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

    state.subjectModal = modal;
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subject details');
  }
};

window.deleteSubject = async function(subjectId) {
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

window.openAddCurriculumModal = async function() {
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

window.openEditCurriculumModal = async function(curriculumId) {
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

window.viewCurriculum = async function(curriculumId) {
  try {
    // Fetch curriculum details and structure
    const curriculum = await api.get(endpoints.curriculumDetail(curriculumId));
    const structure = await api.get(endpoints.curriculumStructure(curriculumId));

    const modal = new Modal({
      title: `Curriculum: ${curriculum.code}`,
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

function getCurriculumViewContent(curriculum, structure) {
  // Group subjects by year level and semester
  const subjectsByLevel = {};

  if (structure && structure.subjects && structure.subjects.length > 0) {
    structure.subjects.forEach(subject => {
      const key = `${subject.year_level}-${subject.semester}`;
      if (!subjectsByLevel[key]) {
        subjectsByLevel[key] = [];
      }
      subjectsByLevel[key].push(subject);
    });
  }

  return `
    <!-- Curriculum Info -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p class="font-semibold text-gray-900">${structure?.subjects?.length || 0}</p>
        </div>
        <div>
          <p class="text-sm text-gray-600">Status</p>
          <p class="font-semibold ${curriculum.is_active ? 'text-green-600' : 'text-gray-600'}">
            ${curriculum.is_active ? 'Active' : 'Inactive'}
          </p>
        </div>
      </div>
      ${curriculum.description ? `
        <div class="mt-3 pt-3 border-t border-gray-200">
          <p class="text-sm text-gray-600">Description</p>
          <p class="text-gray-900">${curriculum.description}</p>
        </div>
      ` : ''}
    </div>

    <!-- Subjects by Year and Semester -->
    ${!structure || !structure.subjects || structure.subjects.length === 0 ? `
      <div class="text-center py-12 bg-gray-50 rounded-lg">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        <p class="text-gray-500 text-lg">No subjects assigned to this curriculum yet</p>
        <p class="text-gray-400 text-sm mt-2">Subjects can be assigned through the curriculum management interface</p>
      </div>
    ` : `
      <div class="space-y-6">
        ${[1, 2, 3, 4, 5].map(year => {
          const hasYearSubjects = [1, 2].some(sem => subjectsByLevel[`${year}-${sem}`]?.length > 0);
          if (!hasYearSubjects) return '';

          return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
              <div class="bg-blue-600 text-white px-4 py-3">
                <h3 class="font-bold text-lg">Year ${year}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                ${[1, 2].map(semester => {
                  const key = `${year}-${semester}`;
                  const subjects = subjectsByLevel[key] || [];

                  if (subjects.length === 0) return '';

                  const totalUnits = subjects.reduce((sum, s) => sum + (s.units || 0), 0);

                  return `
                    <div class="border border-gray-200 rounded-lg">
                      <div class="bg-gray-100 px-3 py-2 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                          <h4 class="font-semibold text-gray-800">${semester === 1 ? '1st' : '2nd'} Semester</h4>
                          <span class="text-sm text-gray-600">${totalUnits} units</span>
                        </div>
                      </div>
                      <div class="p-3 space-y-2">
                        ${subjects.map(subject => `
                          <div class="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
                            <div class="flex-1">
                              <p class="font-medium text-gray-900">${subject.code}</p>
                              <p class="text-sm text-gray-600">${subject.title}</p>
                              ${subject.prerequisites && subject.prerequisites.length > 0 ? `
                                <p class="text-xs text-gray-500 mt-1">
                                  Prereq: ${subject.prerequisites.join(', ')}
                                </p>
                              ` : ''}
                            </div>
                            <div class="ml-3 text-right">
                              <span class="inline-block px-2 py-1 text-sm font-medium rounded bg-blue-100 text-blue-800">
                                ${subject.units} ${subject.units === 1 ? 'unit' : 'units'}
                              </span>
                              ${subject.type ? `
                                <p class="text-xs text-gray-500 mt-1">${subject.type}</p>
                              ` : ''}
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

window.deleteCurriculum = async function(curriculumId) {
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
// GLOBAL HANDLERS
// ============================================================

window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
