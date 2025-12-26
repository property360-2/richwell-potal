import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
  user: null,
  programs: [],
  sections: [],
  subjects: [],
  professors: [],
  semesters: [],
  activeSemester: null,
  selectedSection: null,
  loading: true,
  filters: {
    program: 'all',
    semester: 'active'
  },
  showSectionModal: false,
  showAssignModal: false,
  editingSection: null
};

// Mock data
const MOCK_PROGRAMS = [
  { id: '1', code: 'BSIT', name: 'BS Information Technology' },
  { id: '2', code: 'BSCS', name: 'BS Computer Science' }
];

const MOCK_SEMESTERS = [
  { id: '1', name: '1st Semester 2024-2025', is_active: true },
  { id: '2', name: '2nd Semester 2024-2025', is_active: false }
];

const MOCK_SECTIONS = [
  { id: '1', name: 'BSIT-1A', program: { id: '1', code: 'BSIT' }, semester: { id: '1', name: '1st Sem 2024-2025' }, year_level: 1, capacity: 40, enrolled_count: 35 },
  { id: '2', name: 'BSIT-1B', program: { id: '1', code: 'BSIT' }, semester: { id: '1', name: '1st Sem 2024-2025' }, year_level: 1, capacity: 40, enrolled_count: 38 },
  { id: '3', name: 'BSIT-2A', program: { id: '1', code: 'BSIT' }, semester: { id: '1', name: '1st Sem 2024-2025' }, year_level: 2, capacity: 40, enrolled_count: 32 },
  { id: '4', name: 'BSCS-1A', program: { id: '2', code: 'BSCS' }, semester: { id: '1', name: '1st Sem 2024-2025' }, year_level: 1, capacity: 35, enrolled_count: 30 }
];

const MOCK_SUBJECTS = [
  { id: '1', code: 'IT101', title: 'Introduction to Computing', units: 3 },
  { id: '2', code: 'IT102', title: 'Computer Programming 1', units: 3 },
  { id: '3', code: 'GE101', title: 'English Communication', units: 3 }
];

const MOCK_PROFESSORS = [
  { id: '1', first_name: 'Juan', last_name: 'Dela Cruz', email: 'juan.prof@richwell.edu.ph' },
  { id: '2', first_name: 'Maria', last_name: 'Santos', email: 'maria.prof@richwell.edu.ph' },
  { id: '3', first_name: 'Pedro', last_name: 'Reyes', email: 'pedro.prof@richwell.edu.ph' }
];

const MOCK_SECTION_SUBJECTS = [
  { id: '1', subject: { id: '1', code: 'IT101', title: 'Introduction to Computing' }, professor: { id: '1', first_name: 'Juan', last_name: 'Dela Cruz' }, is_tba: false },
  { id: '2', subject: { id: '2', code: 'IT102', title: 'Computer Programming 1' }, professor: null, is_tba: true }
];

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadInitialData();
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
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadInitialData() {
  // Load programs
  try {
    const response = await api.get(endpoints.academicPrograms);
    const programs = response?.results || response;
    state.programs = (programs && programs.length > 0) ? programs : MOCK_PROGRAMS;
  } catch (error) {
    state.programs = MOCK_PROGRAMS;
  }

  // Load semesters
  try {
    const response = await api.get(endpoints.semesters);
    const semesters = response?.results || response;
    state.semesters = (semesters && semesters.length > 0) ? semesters : MOCK_SEMESTERS;
    state.activeSemester = state.semesters.find(s => s.is_active) || state.semesters[0];
  } catch (error) {
    state.semesters = MOCK_SEMESTERS;
    state.activeSemester = MOCK_SEMESTERS[0];
  }

  // Load professors
  try {
    const response = await api.get(endpoints.professors);
    const professors = response?.results || response;
    state.professors = (professors && professors.length > 0) ? professors : MOCK_PROFESSORS;
  } catch (error) {
    state.professors = MOCK_PROFESSORS;
  }

  await loadSections();
  state.loading = false;
}

async function loadSections() {
  try {
    let url = endpoints.sections;
    const params = [];
    if (state.filters.semester !== 'all') {
      const semId = state.filters.semester === 'active' ? state.activeSemester?.id : state.filters.semester;
      if (semId) params.push(`semester=${semId}`);
    }
    if (state.filters.program !== 'all') {
      params.push(`program=${state.filters.program}`);
    }
    if (params.length) url += '?' + params.join('&');

    const response = await api.get(url);
    state.sections = response?.results || response || MOCK_SECTIONS;
  } catch (error) {
    state.sections = MOCK_SECTIONS;
  }
}

async function loadSectionDetails(sectionId) {
  try {
    const response = await api.get(endpoints.section(sectionId));
    state.selectedSection = response;
    // Load section subjects
    const subjectsResponse = await api.get(`${endpoints.sectionSubjects}?section=${sectionId}`);
    state.selectedSection.section_subjects = subjectsResponse?.results || subjectsResponse || MOCK_SECTION_SUBJECTS;
  } catch (error) {
    state.selectedSection = state.sections.find(s => s.id === sectionId);
    state.selectedSection.section_subjects = MOCK_SECTION_SUBJECTS;
  }

  // Load available subjects for the program
  try {
    const programId = state.selectedSection?.program?.id;
    if (programId) {
      const response = await api.get(`${endpoints.manageSubjects}?program=${programId}`);
      state.subjects = response?.results || response || MOCK_SUBJECTS;
    }
  } catch (error) {
    state.subjects = MOCK_SUBJECTS;
  }

  render();
}

function formatRole(role) {
  const roleNames = {
    'ADMIN': 'Administrator',
    'REGISTRAR': 'Registrar',
    'HEAD_REGISTRAR': 'Head Registrar'
  };
  return roleNames[role] || role;
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
      activePage: 'sections',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Section Management</h1>
          <p class="text-gray-600 mt-1">Create and manage class sections</p>
        </div>
        <div class="mt-4 md:mt-0">
          <button onclick="openSectionModal()" class="btn-primary">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Section
          </button>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="card mb-6">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select id="filter-program" class="form-input py-2" onchange="handleFilterChange()">
              <option value="all">All Programs</option>
              ${state.programs.map(p => `<option value="${p.id}" ${state.filters.program === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select id="filter-semester" class="form-input py-2" onchange="handleFilterChange()">
              <option value="active">Active Semester</option>
              ${state.semesters.map(s => `<option value="${s.id}" ${state.filters.semester === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      
      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sections List -->
        <div class="lg:col-span-1">
          <div class="card">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-800">Sections</h2>
              <span class="badge badge-info">${state.sections.length}</span>
            </div>
            <div class="space-y-2 max-h-[60vh] overflow-y-auto">
              ${state.sections.length > 0 ? state.sections.map(section => renderSectionCard(section)).join('') : `
                <p class="text-gray-400 text-center py-8">No sections found</p>
              `}
            </div>
          </div>
        </div>
        
        <!-- Section Details -->
        <div class="lg:col-span-2">
          ${state.selectedSection ? renderSectionDetails() : renderSelectSectionPrompt()}
        </div>
      </div>
    </main>
    
    <!-- Modals -->
    ${state.showSectionModal ? renderSectionModal() : ''}
    ${state.showAssignModal ? renderAssignModal() : ''}
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
        <p class="mt-4 text-gray-600">Loading sections...</p>
      </div>
    </div>
  `;
}

function renderSectionCard(section) {
  const isSelected = state.selectedSection?.id === section.id;
  const occupancy = section.capacity ? Math.round((section.enrolled_count || 0) / section.capacity * 100) : 0;

  return `
    <div class="p-4 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}" onclick="selectSection('${section.id}')">
      <div class="flex items-center justify-between mb-2">
        <span class="font-bold text-gray-800">${section.name}</span>
        <span class="badge badge-info text-xs">Year ${section.year_level}</span>
      </div>
      <p class="text-sm text-gray-500">${section.program?.code || 'Unknown'}</p>
      <div class="mt-3">
        <div class="flex justify-between text-xs text-gray-500 mb-1">
          <span>Capacity</span>
          <span>${section.enrolled_count || 0}/${section.capacity || 40}</span>
        </div>
        <div class="progress-bar h-2">
          <div class="progress-bar-fill ${occupancy > 90 ? 'bg-red-500' : occupancy > 70 ? 'bg-yellow-500' : ''}" style="width: ${occupancy}%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderSelectSectionPrompt() {
  return `
    <div class="card text-center py-16">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-600 mb-2">Select a Section</h3>
      <p class="text-gray-500">Click on a section to view and assign subjects</p>
    </div>
  `;
}

function renderSectionDetails() {
  const section = state.selectedSection;
  const sectionSubjects = section.section_subjects || [];

  return `
    <div class="space-y-6">
      <!-- Section Info -->
      <div class="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">${section.name}</h2>
            <p class="text-gray-600">${section.program?.name || section.program?.code || 'Unknown Program'}</p>
            <div class="flex gap-4 mt-2 text-sm text-gray-500">
              <span>Year ${section.year_level}</span>
              <span>•</span>
              <span>Capacity: ${section.capacity}</span>
              <span>•</span>
              <span>Enrolled: ${section.enrolled_count || 0}</span>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="editSection('${section.id}')" class="btn-secondary text-sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Edit
            </button>
            <a href="/schedule.html?section=${section.id}" class="btn-primary text-sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Schedule
            </a>
          </div>
        </div>
      </div>
      
      <!-- Assigned Subjects -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">Assigned Subjects</h3>
          <button onclick="openAssignModal()" class="btn-secondary text-sm">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Assign Subject
          </button>
        </div>
        
        <div class="space-y-3">
          ${sectionSubjects.length > 0 ? sectionSubjects.map(ss => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                </div>
                <div>
                  <p class="font-semibold text-gray-800">${ss.subject?.code} - ${ss.subject?.title}</p>
                  <div class="text-sm text-gray-500 space-y-1">
                    ${ss.professors && ss.professors.length > 0 ?
                      ss.professors.map(prof => `
                        <div class="flex items-center gap-2">
                          <span>${prof.name}</span>
                          ${prof.is_primary ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Primary</span>' : ''}
                        </div>
                      `).join('')
                      : ss.is_tba ? '<span class="text-yellow-600">TBA</span>' : '<span class="text-orange-600">No professors assigned</span>'}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${ss.is_tba ? '<span class="badge badge-warning">TBA</span>' : ''}
                <button onclick="removeAssignment('${ss.id}')" class="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </div>
          `).join('') : `
            <p class="text-gray-400 text-center py-8">No subjects assigned yet. Click "Assign Subject" to add one.</p>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderSectionModal() {
  const isEdit = !!state.editingSection;
  const section = isEdit ? state.sections.find(s => s.id === state.editingSection) : {};

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeSectionModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit' : 'Add'} Section</h2>
          <button onclick="closeSectionModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form onsubmit="saveSection(event)" class="p-6 space-y-4">
          <div>
            <label class="form-label">Section Name *</label>
            <input type="text" id="section-name" class="form-input" value="${section.name || ''}" placeholder="BSIT-1A" required>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Program *</label>
              <select id="section-program" class="form-input" required>
                ${state.programs.map(p => `<option value="${p.id}" ${section.program?.id === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Year Level *</label>
              <select id="section-year" class="form-input" required>
                ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${section.year_level === y ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Semester *</label>
              <select id="section-semester" class="form-input" required>
                ${state.semesters.map(s => `<option value="${s.id}" ${section.semester?.id === s.id || s.is_active ? 'selected' : ''}>${s.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Capacity *</label>
              <input type="number" id="section-capacity" class="form-input" value="${section.capacity || 40}" min="1" max="100" required>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="closeSectionModal()" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'} Section</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderAssignModal() {
  const assignedSubjectIds = (state.selectedSection?.section_subjects || []).map(ss => ss.subject?.id);
  const availableSubjects = state.subjects.filter(s => !assignedSubjectIds.includes(s.id));

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeAssignModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Assign Subject to ${state.selectedSection?.name}</h2>
          <button onclick="closeAssignModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form onsubmit="assignSubject(event)" class="p-6 space-y-4">
          <div>
            <label class="form-label">Subject *</label>
            <select id="assign-subject" class="form-input" required>
              <option value="">Select a subject...</option>
              ${availableSubjects.map(s => `<option value="${s.id}">${s.code} - ${s.title}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Professor</label>
            <select id="assign-professor" class="form-input">
              <option value="">TBA (To Be Announced)</option>
              ${state.professors.map(p => `<option value="${p.id}">Prof. ${p.first_name} ${p.last_name}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="assign-tba" class="w-4 h-4 text-blue-600 rounded">
            <label for="assign-tba" class="text-sm text-gray-600">Mark as TBA (Professor to be announced)</label>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="closeAssignModal()" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Assign Subject</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// Event Handlers
window.selectSection = async function (id) {
  await loadSectionDetails(id);
};

window.handleFilterChange = async function () {
  state.filters.program = document.getElementById('filter-program').value;
  state.filters.semester = document.getElementById('filter-semester').value;
  state.selectedSection = null;
  await loadSections();
  render();
};

window.openSectionModal = function (id = null) {
  state.editingSection = id;
  state.showSectionModal = true;
  render();
};

window.closeSectionModal = function () {
  state.showSectionModal = false;
  state.editingSection = null;
  render();
};

window.editSection = function (id) {
  openSectionModal(id);
};

window.saveSection = async function (e) {
  e.preventDefault();
  const data = {
    name: document.getElementById('section-name').value,
    program: document.getElementById('section-program').value,
    semester: document.getElementById('section-semester').value,
    year_level: parseInt(document.getElementById('section-year').value),
    capacity: parseInt(document.getElementById('section-capacity').value)
  };

  try {
    let response;
    if (state.editingSection) {
      response = await api.patch(endpoints.section(state.editingSection), data);
    } else {
      response = await api.post(endpoints.sections, data);
    }

    if (response && response.ok) {
      showToast(`Section ${state.editingSection ? 'updated' : 'created'} successfully!`, 'success');
      closeSectionModal();
      await loadSections();
      render();
    } else {
      const errorData = await response?.json();
      console.error('Section save error:', errorData);

      let errorMessage = 'Failed to save section';

      // Handle custom exception handler format { success: false, error: { message, details } }
      if (errorData?.error) {
        if (errorData.error.details) {
          // Combine field errors from details
          errorMessage = Object.entries(errorData.error.details)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        }
      } else if (errorData?.detail) {
        // Standard DRF error
        errorMessage = errorData.detail;
      } else if (typeof errorData === 'object') {
        // Fallback for flat field errors
        errorMessage = Object.entries(errorData)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
      }

      showToast(errorMessage, 'error');
    }
  } catch (error) {
    console.error('Save failed:', error);
    showToast('An unexpected error occurred', 'error');
  }
};

window.openAssignModal = function () {
  state.showAssignModal = true;
  render();
};

window.closeAssignModal = function () {
  state.showAssignModal = false;
  render();
};

window.assignSubject = async function (e) {
  e.preventDefault();
  const subjectId = document.getElementById('assign-subject').value;
  const professorId = document.getElementById('assign-professor').value;
  const isTba = document.getElementById('assign-tba').checked;

  if (!subjectId) {
    showToast('Please select a subject', 'error');
    return;
  }

  const data = {
    section: state.selectedSection.id,
    subject: subjectId,
    professor: professorId || null,
    is_tba: isTba || !professorId
  };

  try {
    const response = await api.post(endpoints.sectionSubjects, data);
    if (response && response.ok) {
      showToast('Subject assigned successfully!', 'success');
      closeAssignModal();
      await loadSectionDetails(state.selectedSection.id);
    } else {
      const error = await response?.json();
      showToast(error?.detail || 'Failed to assign subject', 'error');
    }
  } catch (error) {
    // Mock success
    const subject = state.subjects.find(s => s.id === subjectId);
    const professor = state.professors.find(p => p.id === professorId);
    if (!state.selectedSection.section_subjects) state.selectedSection.section_subjects = [];
    state.selectedSection.section_subjects.push({
      id: Date.now().toString(),
      subject: { id: subjectId, code: subject.code, title: subject.title },
      professor: professor ? { id: professorId, first_name: professor.first_name, last_name: professor.last_name } : null,
      is_tba: isTba || !professorId
    });
    showToast('Subject assigned (mock)', 'success');
    closeAssignModal();
    render();
  }
};

window.removeAssignment = async function (id) {
  if (!confirm('Remove this subject from the section?')) return;

  try {
    const response = await api.delete(endpoints.sectionSubject(id));
    if (response && response.ok) {
      showToast('Subject removed!', 'success');
      await loadSectionDetails(state.selectedSection.id);
    }
  } catch (error) {
    state.selectedSection.section_subjects = state.selectedSection.section_subjects.filter(ss => ss.id !== id);
    showToast('Subject removed (mock)', 'success');
    render();
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
