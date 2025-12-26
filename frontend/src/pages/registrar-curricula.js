import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
  user: null,
  loading: true,
  curricula: [],
  programs: [],
  subjects: [],
  semesters: [],
  selectedProgram: null,
  selectedCurriculum: null,
  showAddModal: false,
  showEditModal: false,
  showViewModal: false,
  showAssignModal: false,
  curriculumStructure: null,
  editingCurriculum: null,
  formData: {
    program: '',
    code: '',
    name: '',
    description: '',
    effective_year: new Date().getFullYear(),
    is_active: true
  },
  assignmentData: {
    year_level: 1,
    semester_number: 1,
    subject_id: '',
    semester_id: null,
    is_required: true
  }
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadPrograms();
  await loadCurricula();
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
    console.error('Failed to load profile:', error);
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadPrograms() {
  try {
    const response = await api.get(endpoints.programs);
    state.programs = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load programs:', error);
    state.programs = [];
  }
}

async function loadCurricula() {
  try {
    let url = '/academics/curricula/';
    if (state.selectedProgram) {
      url += `?program=${state.selectedProgram}`;
    }
    const response = await api.get(url);
    state.curricula = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load curricula:', error);
    state.curricula = [];
  }
}

async function loadSubjects(programId) {
  try {
    const response = await api.get(`/academics/manage/subjects/?program=${programId}`);
    state.subjects = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load subjects:', error);
    state.subjects = [];
  }
}

// Helper function to group subjects by year and semester
function groupSubjectsByYearAndSemester(subjects) {
  const grouped = {};

  subjects.forEach(subject => {
    const year = subject.year_level || 'Unassigned';
    const sem = subject.semester_number || 'Unassigned';

    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][sem]) grouped[year][sem] = [];

    grouped[year][sem].push(subject);
  });

  return grouped;
}

// Select all subject checkboxes
function selectAllSubjects() {
  const checkboxes = document.querySelectorAll('input[name="subjects[]"]');
  checkboxes.forEach(cb => cb.checked = true);
  updateSelectionCount();
}

// Clear all subject checkboxes
function clearAllSubjects() {
  const checkboxes = document.querySelectorAll('input[name="subjects[]"]');
  checkboxes.forEach(cb => cb.checked = false);
  updateSelectionCount();
}

// Update selection counter
function updateSelectionCount() {
  const checkboxes = document.querySelectorAll('input[name="subjects[]"]:checked');
  const counter = document.getElementById('selection-count');
  if (counter) {
    counter.textContent = `${checkboxes.length} subject${checkboxes.length !== 1 ? 's' : ''} selected`;
  }
}

// Attach change listeners to all checkboxes
function attachCheckboxListeners() {
  const checkboxes = document.querySelectorAll('input[name="subjects[]"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateSelectionCount);
  });
}

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    state.semesters = response?.semesters || response?.results || response || [];
  } catch (error) {
    console.error('Failed to load semesters:', error);
    state.semesters = [];
  }
}

async function loadCurriculumStructure(curriculumId) {
  try {
    const response = await api.get(`/academics/curricula/${curriculumId}/structure/`);
    state.curriculumStructure = response;
  } catch (error) {
    console.error('Failed to load curriculum structure:', error);
    state.curriculumStructure = null;
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'REGISTRAR',
      activePage: 'registrar-curricula',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Curriculum Management</h1>
          <p class="text-gray-600 mt-1">Manage curriculum versions and subject assignments</p>
        </div>
        <button onclick="openAddModal()" class="mt-4 md:mt-0 btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Curriculum
        </button>
      </div>

      <!-- Program Filter -->
      <div class="card mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Program</label>
        <select onchange="filterByProgram(event)" class="form-select max-w-md">
          <option value="">All Programs</option>
          ${state.programs.map(p => `
            <option value="${p.id}" ${state.selectedProgram === p.id ? 'selected' : ''}>
              ${p.code} - ${p.name}
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Curricula List -->
      ${renderCurriculaList()}
    </main>

    ${state.showAddModal ? renderAddModal() : ''}
    ${state.showEditModal ? renderEditModal() : ''}
    ${state.showViewModal ? renderViewModal() : ''}
    ${state.showAssignModal ? renderAssignModal() : ''}
  `;
}


function renderCurriculaList() {
  if (state.curricula.length === 0) {
    return `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-gray-500 mb-4">No curricula found${state.selectedProgram ? ' for this program' : ''}</p>
        <button onclick="openAddModal()" class="btn btn-primary">Create First Curriculum</button>
      </div>
    `;
  }

  // Group by program
  const grouped = {};
  state.curricula.forEach(curr => {
    if (!grouped[curr.program_code]) {
      grouped[curr.program_code] = {
        name: curr.program_name,
        curricula: []
      };
    }
    grouped[curr.program_code].curricula.push(curr);
  });

  return Object.keys(grouped).map(programCode => `
    <div class="card mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4">${programCode} - ${grouped[programCode].name}</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${grouped[programCode].curricula.map(curr => `
          <div class="border-2 ${curr.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200'} rounded-xl p-4">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="font-bold text-gray-900">${curr.code}</h3>
                <p class="text-sm text-gray-600">${curr.name}</p>
              </div>
              <span class="px-2 py-1 rounded text-xs font-medium ${curr.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                ${curr.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            ${curr.description ? `<p class="text-xs text-gray-500 mb-3">${curr.description}</p>` : ''}

            <div class="grid grid-cols-2 gap-2 text-xs mb-3">
              <div class="bg-white rounded p-2">
                <p class="text-gray-500">Effective Year</p>
                <p class="font-bold text-gray-900">${curr.effective_year}</p>
              </div>
              <div class="bg-white rounded p-2">
                <p class="text-gray-500">Subjects</p>
                <p class="font-bold text-gray-900">${curr.total_subjects || 0}</p>
              </div>
            </div>

            <div class="flex gap-2">
              <button onclick="viewCurriculum('${curr.id}')" class="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                View Structure
              </button>
              <button onclick="openEditModal('${curr.id}')" class="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderAddModal() {
  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeAddModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Create New Curriculum</h3>

        <form onsubmit="handleAddCurriculum(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Program *</label>
            <select id="add-program" required class="form-select">
              <option value="">Select Program</option>
              ${state.programs.map(p => `
                <option value="${p.id}">${p.code} - ${p.name}</option>
              `).join('')}
            </select>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Code *</label>
              <input type="text" id="add-code" required placeholder="e.g., REV3, 2025" class="form-input">
              <p class="text-xs text-gray-500 mt-1">Unique identifier for this version</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Effective Year *</label>
              <input type="number" id="add-year" required min="2020" max="2099" value="${new Date().getFullYear()}" class="form-input">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Name *</label>
            <input type="text" id="add-name" required placeholder="e.g., BSIT Curriculum 2025" class="form-input">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="add-description" rows="3" placeholder="Describe this curriculum version..." class="form-input"></textarea>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="add-active" checked class="w-4 h-4 text-blue-600 rounded">
            <label for="add-active" class="text-sm font-medium text-gray-700">Active (new students can be assigned)</label>
          </div>

          <div class="flex gap-3 mt-6">
            <button type="button" onclick="closeAddModal()" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1">Create Curriculum</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditModal() {
  const curr = state.editingCurriculum;
  if (!curr) return '';

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeEditModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Edit Curriculum</h3>

        <form onsubmit="handleEditCurriculum(event)" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <input type="text" value="${curr.program_code} - ${curr.program_name}" disabled class="form-input bg-gray-100">
            <p class="text-xs text-gray-500 mt-1">Program cannot be changed</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Code *</label>
              <input type="text" id="edit-code" required value="${curr.code}" class="form-input">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Effective Year *</label>
              <input type="number" id="edit-year" required min="2020" max="2099" value="${curr.effective_year}" class="form-input">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Curriculum Name *</label>
            <input type="text" id="edit-name" required value="${curr.name}" class="form-input">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="edit-description" rows="3" class="form-input">${curr.description || ''}</textarea>
          </div>

          <div class="flex items-center gap-2">
            <input type="checkbox" id="edit-active" ${curr.is_active ? 'checked' : ''} class="w-4 h-4 text-blue-600 rounded">
            <label for="edit-active" class="text-sm font-medium text-gray-700">Active (new students can be assigned)</label>
          </div>

          <div class="flex gap-3 mt-6">
            <button type="button" onclick="handleDeleteCurriculum()" class="btn bg-red-600 hover:bg-red-700 text-white">
              Delete
            </button>
            <div class="flex-1"></div>
            <button type="button" onclick="closeEditModal()" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderViewModal() {
  if (!state.curriculumStructure) return '';

  const { curriculum, structure } = state.curriculumStructure;
  const years = Object.keys(structure).sort();

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeViewModal()">
      <div class="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex items-start justify-between mb-6">
          <div>
            <h3 class="text-2xl font-bold text-gray-800">${curriculum.name}</h3>
            <p class="text-gray-600">${curriculum.program_code} - ${curriculum.program_name}</p>
          </div>
          <button onclick="openAssignModal()" class="btn btn-primary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Assign Subject
          </button>
        </div>

        ${years.length === 0 ? `
          <div class="text-center py-12 text-gray-500">
            <p class="mb-4">No subjects assigned to this curriculum yet</p>
            <button onclick="openAssignModal()" class="btn btn-primary">Assign First Subject</button>
          </div>
        ` : years.map(year => `
          <div class="mb-8">
            <h4 class="text-lg font-bold text-gray-800 mb-4">Year ${year}</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${renderSemester(structure[year], year, '1', '1st Semester')}
              ${renderSemester(structure[year], year, '2', '2nd Semester')}
              ${renderSemester(structure[year], year, '3', 'Summer')}
            </div>
          </div>
        `).join('')}

        <div class="flex justify-end mt-6">
          <button onclick="closeViewModal()" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}

function renderSemester(yearData, year, semNum, semName) {
  const subjects = yearData[semNum] || [];

  return `
    <div class="border-2 border-gray-200 rounded-xl p-4">
      <h5 class="font-bold text-gray-700 mb-3">${semName}</h5>
      ${subjects.length === 0 ? `
        <p class="text-xs text-gray-400">No subjects</p>
      ` : `
        <div class="space-y-2">
          ${subjects.map(subj => `
            <div class="bg-white border border-gray-200 rounded-lg p-3">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="font-bold text-sm text-gray-900">${subj.code}</p>
                  <p class="text-xs text-gray-600">${subj.title}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-gray-500">${subj.units} units</span>
                    ${subj.is_required ? '<span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Required</span>' : ''}
                    ${subj.is_major ? '<span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 rounded">Major</span>' : ''}
                  </div>
                  ${subj.semester_name ? `
                    <div class="mt-2">
                      <p class="text-xs text-gray-500">
                        <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        Bound to: <span class="font-medium text-green-700">${subj.semester_name}</span>
                      </p>
                      ${subj.semester_dates ? `
                        <p class="text-xs text-gray-400">
                          ${new Date(subj.semester_dates.start_date).toLocaleDateString()} - ${new Date(subj.semester_dates.end_date).toLocaleDateString()}
                        </p>
                      ` : ''}
                    </div>
                  ` : ''}
                  ${subj.prerequisites && subj.prerequisites.length > 0 ? `
                    <div class="mt-2">
                      <p class="text-xs text-gray-500">Prerequisites:</p>
                      <div class="flex flex-wrap gap-1 mt-1">
                        ${subj.prerequisites.map(p => `
                          <span class="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded">${p.code}</span>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
                <button onclick="removeSubjectFromCurriculum('${subj.id}')" class="ml-2 p-1 text-red-600 hover:bg-red-50 rounded">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderAssignModal() {
  const curriculum = state.curriculumStructure?.curriculum;
  if (!curriculum) return '';

  // Group subjects by year and semester
  const grouped = groupSubjectsByYearAndSemester(state.subjects);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === 'Unassigned') return 1;
    if (b === 'Unassigned') return -1;
    return parseInt(a) - parseInt(b);
  });

  const semesterLabels = {
    1: '1st Semester',
    2: '2nd Semester',
    3: 'Summer',
    'Unassigned': 'Not Categorized'
  };

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeAssignModal()">
      <div class="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Assign Subjects to Curriculum</h3>
          <button onclick="closeAssignModal()" class="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>

        <form id="assign-form" onsubmit="handleAssignSubject(event)" class="space-y-6">
          <!-- Year/Semester Categories -->
          ${years.map(year => `
            <div class="border-b border-gray-200 pb-6 last:border-b-0">
              <h4 class="text-lg font-bold text-gray-800 mb-4">
                Year ${year}
              </h4>

              ${Object.keys(grouped[year]).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return parseInt(a) - parseInt(b);
              }).map(sem => `
                <div class="mb-4">
                  <h5 class="text-md font-semibold text-gray-700 mb-3 px-3 py-2 bg-gray-50 rounded-lg">
                    ${semesterLabels[sem] || `Semester ${sem}`}
                  </h5>

                  <div class="space-y-2 ml-4">
                    ${grouped[year][sem]
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map(subject => `
                        <label class="flex items-start gap-3 p-3 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group">
                          <input
                            type="checkbox"
                            name="subjects[]"
                            value="${subject.id}"
                            data-year="${subject.year_level}"
                            data-semester="${subject.semester_number}"
                            class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          >
                          <div class="flex-1">
                            <div class="font-medium text-gray-800 group-hover:text-blue-600">
                              ${subject.code} - ${subject.title}
                            </div>
                            <div class="text-sm text-gray-500">
                              ${subject.units} units
                              ${subject.is_major ? '<span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Major</span>' : ''}
                            </div>
                          </div>
                        </label>
                      `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `).join('')}

          <!-- Bulk Actions -->
          <div class="flex gap-2 pt-4 border-t border-gray-200">
            <button type="button" onclick="selectAllSubjects()" class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
              Select All
            </button>
            <button type="button" onclick="clearAllSubjects()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
              Clear All
            </button>
            <div class="ml-auto text-sm text-gray-500" id="selection-count">
              0 subjects selected
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onclick="closeAssignModal()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Assign Selected Subjects
            </button>
          </div>
        </form>
      </div>
    </div>
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
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  `;
}

// Event handlers
window.filterByProgram = function(event) {
  state.selectedProgram = event.target.value || null;
  loadCurricula().then(() => render());
};

window.openAddModal = function() {
  state.showAddModal = true;
  render();
};

window.closeAddModal = function() {
  state.showAddModal = false;
  render();
};

window.openEditModal = async function(curriculumId) {
  const curriculum = state.curricula.find(c => c.id === curriculumId);
  if (curriculum) {
    state.editingCurriculum = curriculum;
    state.showEditModal = true;
    render();
  }
};

window.closeEditModal = function() {
  state.showEditModal = false;
  state.editingCurriculum = null;
  render();
};

window.viewCurriculum = async function(curriculumId) {
  const curriculum = state.curricula.find(c => c.id === curriculumId);
  if (!curriculum) return;

  state.selectedCurriculum = curriculum;

  // Load subjects for this program
  await loadSubjects(curriculum.program);

  // Load curriculum structure
  await loadCurriculumStructure(curriculumId);

  state.showViewModal = true;
  render();
};

window.closeViewModal = function() {
  state.showViewModal = false;
  state.selectedCurriculum = null;
  state.curriculumStructure = null;
  render();
};

window.openAssignModal = async function() {
  // Load semesters for binding
  await loadSemesters();
  state.showAssignModal = true;
  render();

  // Attach checkbox listeners after modal is rendered
  setTimeout(() => {
    attachCheckboxListeners();
    updateSelectionCount();
  }, 100);
};

window.closeAssignModal = function() {
  state.showAssignModal = false;
  render();
};

window.handleAddCurriculum = async function(event) {
  event.preventDefault();

  const data = {
    program: document.getElementById('add-program').value,
    code: document.getElementById('add-code').value,
    name: document.getElementById('add-name').value,
    description: document.getElementById('add-description').value,
    effective_year: parseInt(document.getElementById('add-year').value),
    is_active: document.getElementById('add-active').checked
  };

  try {
    const response = await api.post('/academics/curricula/', data);
    const result = await response.json();

    if (response.ok) {
      showToast('Curriculum created successfully', 'success');
      closeAddModal();
      await loadCurricula();
      render();
    } else {
      const errorMsg = result?.code || result?.error || 'Failed to create curriculum';
      showToast(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg, 'error');
    }
  } catch (error) {
    console.error('Failed to create curriculum:', error);
    showToast('Failed to create curriculum', 'error');
  }
};

window.handleEditCurriculum = async function(event) {
  event.preventDefault();

  const data = {
    program: state.editingCurriculum.program,
    code: document.getElementById('edit-code').value,
    name: document.getElementById('edit-name').value,
    description: document.getElementById('edit-description').value,
    effective_year: parseInt(document.getElementById('edit-year').value),
    is_active: document.getElementById('edit-active').checked
  };

  try {
    const response = await fetch(`/api/v1/academics/curricula/${state.editingCurriculum.id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      showToast('Curriculum updated successfully', 'success');
      closeEditModal();
      await loadCurricula();
      render();
    } else {
      const errorMsg = result?.code || result?.error || 'Failed to update curriculum';
      showToast(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg, 'error');
    }
  } catch (error) {
    console.error('Failed to update curriculum:', error);
    showToast('Failed to update curriculum', 'error');
  }
};

window.handleDeleteCurriculum = async function() {
  if (!confirm('Are you sure you want to delete this curriculum? Students assigned to it will remain on it.')) {
    return;
  }

  try {
    const response = await fetch(`/api/v1/academics/curricula/${state.editingCurriculum.id}/`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`
      }
    });

    if (response.ok || response.status === 204) {
      showToast('Curriculum deleted successfully', 'success');
      closeEditModal();
      await loadCurricula();
      render();
    } else {
      showToast('Failed to delete curriculum', 'error');
    }
  } catch (error) {
    console.error('Failed to delete curriculum:', error);
    showToast('Failed to delete curriculum', 'error');
  }
};

window.handleAssignSubject = async function(event) {
  event.preventDefault();

  // Get all checked subject checkboxes
  const checkboxes = document.querySelectorAll('input[name="subjects[]"]:checked');

  if (checkboxes.length === 0) {
    showToast('Please select at least one subject', 'error');
    return;
  }

  // Build assignments array from checked subjects
  const assignments = Array.from(checkboxes).map(checkbox => ({
    subject_id: checkbox.value,
    year_level: parseInt(checkbox.dataset.year) || 1,
    semester_number: parseInt(checkbox.dataset.semester) || 1,
    is_required: true,  // Default to required
    semester_id: null
  }));

  const data = {
    assignments: assignments
  };

  try {
    const response = await fetch(
      `/api/v1/academics/curricula/${state.selectedCurriculum.id}/assign_subjects/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        },
        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      showToast(`Successfully assigned ${assignments.length} subject${assignments.length !== 1 ? 's' : ''} (${result.created} created, ${result.updated} updated)`, 'success');
      closeAssignModal();
      await loadCurriculumStructure(state.selectedCurriculum.id);
      render();
    } else {
      const errorMsg = result?.errors?.[0]?.error || result?.error || 'Failed to assign subjects';
      showToast(errorMsg, 'error');
    }
  } catch (error) {
    console.error('Failed to assign subjects:', error);
    showToast('Failed to assign subjects', 'error');
  }
};

window.removeSubjectFromCurriculum = async function(subjectId) {
  if (!confirm('Remove this subject from the curriculum?')) return;

  try {
    const response = await fetch(
      `/api/v1/academics/curricula/${state.selectedCurriculum.id}/subjects/${subjectId}/`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`
        }
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      showToast('Subject removed successfully', 'success');
      await loadCurriculumStructure(state.selectedCurriculum.id);
      render();
    } else {
      showToast(result?.error || 'Failed to remove subject', 'error');
    }
  } catch (error) {
    console.error('Failed to remove subject:', error);
    showToast('Failed to remove subject', 'error');
  }
};

window.logout = function() {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
