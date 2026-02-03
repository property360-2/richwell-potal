import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatDate } from '../../utils.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { Modal } from '../../components/Modal.js';
import { ConfirmModal } from '../../components/Modal.js';

// State
const state = {
  user: null,
  programs: [],
  subjects: [],
  selectedProgram: null,
  loading: true,
  programModal: null,
  subjectModal: null,
  prereqModal: null,
  versionsModal: null,
  editingProgram: null,
  editingSubject: null,
  editingSubjectForPrereq: null,
  versions: []
};

// No more mock data - all data comes from real API

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadPrograms();
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
    ErrorHandler.handle(error, 'Loading user profile');
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadPrograms() {
  try {
    const response = await api.get(endpoints.managePrograms);
    const programs = response?.results || response;
    state.programs = (programs && Array.isArray(programs)) ? programs : [];
    if (state.programs.length === 0) {
      console.warn('No programs found in the system');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading programs');
    state.programs = [];
  }
  state.loading = false;
}

async function loadSubjects(programId) {
  try {
    const response = await api.get(`${endpoints.manageSubjects}?program=${programId}`);
    const subjects = response?.results || response;
    state.subjects = (subjects && Array.isArray(subjects)) ? subjects : [];
    if (state.subjects.length === 0) {
      console.warn(`No subjects found for program ${programId}`);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subjects');
    state.subjects = [];
  }
  render();
}

async function loadVersions(programId) {
  try {
    const response = await api.get(endpoints.programVersions(programId));
    if (response && (response.results || Array.isArray(response))) {
      state.versions = response.results || response;
    } else {
      state.versions = [];
    }
  } catch (error) {
    state.versions = [];
  }
}

// Format role for display
function formatRole(role) {
  const roleNames = {
    'ADMIN': 'Administrator',
    'REGISTRAR': 'Registrar',
    'HEAD_REGISTRAR': 'Head Registrar',
    'ADMISSION_STAFF': 'Admission Staff'
  };
  return roleNames[role] || role;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading curriculum...');
    return;
  }

  app.innerHTML = `
    ${renderHeader()}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Curriculum Management</h1>
          <p class="text-gray-600 mt-1">Manage programs, subjects, and prerequisites</p>
        </div>
        <div class="mt-4 md:mt-0">
          <button onclick="openProgramModal()" class="btn-primary">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Program
          </button>
        </div>
      </div>
      
      <!-- Two Column Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Programs List (Left) -->
        <div class="lg:col-span-1">
          <div class="card">
            <h2 class="text-lg font-bold text-gray-800 mb-4">Programs</h2>
            <div class="space-y-2">
              ${state.programs.map(program => renderProgramCard(program)).join('')}
            </div>
          </div>
        </div>
        
        <!-- Subjects List (Right) -->
        <div class="lg:col-span-2">
          ${state.selectedProgram ? renderSubjectsPanel() : renderSelectProgramPrompt()}
        </div>
      </div>
    </main>
  `;
}

function renderHeader() {
  const isRegistrar = ['REGISTRAR', 'HEAD_REGISTRAR'].includes(state.user?.role);
  const dashboardLink = isRegistrar ? '/pages/registrar/registrar-dashboard.html' : '/pages/student/curriculum.html';

  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2">${formatRole(state.user?.role)}</span>
          </div>
        </div>
        
        <nav class="hidden md:flex items-center gap-2">
          ${isRegistrar ? `
            <a href="/pages/registrar/registrar-dashboard.html" class="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Dashboard</a>
            <a href="/pages/registrar/registrar-cor.html" class="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">COR</a>
          ` : ''}
          <a href="/pages/admission/admission-dashboard.html" class="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Admissions</a>
          <a href="/pages/student/curriculum.html" class="px-3 py-2 text-blue-600 bg-blue-50 rounded-lg font-medium">Curriculum</a>
          <a href="/pages/student/sections.html" class="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Sections</a>
          <a href="/pages/student/schedule.html" class="px-3 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Schedule</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">${state.user?.first_name || 'Staff'} ${state.user?.last_name || 'User'}</p>
            <p class="text-xs text-gray-500">${formatRole(state.user?.role)}</p>
          </div>
          <button onclick="logout()" class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderProgramCard(program) {
  const isSelected = state.selectedProgram?.id === program.id;
  return `
    <div class="p-4 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}" onclick="selectProgram('${program.id}')">
      <div class="flex items-center justify-between">
        <div>
          <span class="font-bold text-blue-600">${program.code}</span>
          <p class="text-sm text-gray-600 mt-1">${program.name}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="event.stopPropagation(); editProgram('${program.id}')" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-white rounded-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      </div>
      ${program.is_active ? '<span class="badge badge-success text-xs mt-2">Active</span>' : '<span class="badge badge-warning text-xs mt-2">Inactive</span>'}
    </div>
  `;
}

function renderSelectProgramPrompt() {
  return `
    <div class="card text-center py-16">
      <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-600 mb-2">Select a Program</h3>
      <p class="text-gray-500">Click on a program to view and manage its subjects</p>
    </div>
  `;
}

function renderSubjectsPanel() {
  const program = state.selectedProgram;
  const groupedSubjects = groupSubjectsByYear();

  return `
    <div class="space-y-6">
      <!-- Program Info Card -->
      <div class="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold text-gray-800">${program.code}</h2>
            <p class="text-gray-600">${program.name}</p>
            <p class="text-sm text-gray-500 mt-1">${program.duration_years} years • ${state.subjects.length} subjects</p>
          </div>
          <div class="flex gap-2">
            <button onclick="openVersionsModal()" class="btn-secondary text-sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Versions
            </button>
            <button onclick="createSnapshot()" class="btn-primary text-sm">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Save Snapshot
            </button>
          </div>
        </div>
      </div>
      
      <!-- Add Subject Button -->
      <div class="flex justify-end">
        <button onclick="openSubjectModal()" class="btn-secondary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Subject
        </button>
      </div>
      
      <!-- Subjects by Year -->
      ${Object.entries(groupedSubjects).map(([year, semesters]) => `
        <div class="card">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Year ${year}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${Object.entries(semesters).map(([sem, subjects]) => `
              <div>
                <h4 class="font-semibold text-gray-600 mb-3">Semester ${sem}</h4>
                <div class="space-y-2">
                  ${subjects.map(subject => renderSubjectRow(subject)).join('')}
                  ${subjects.length === 0 ? '<p class="text-sm text-gray-400 italic">No subjects</p>' : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
      
      ${Object.keys(groupedSubjects).length === 0 ? `
        <div class="card text-center py-8">
          <p class="text-gray-500">No subjects added yet. Click "Add Subject" to add one.</p>
        </div>
      ` : ''}
    </div>
  `;
}

function groupSubjectsByYear() {
  const grouped = {};
  state.subjects.forEach(subject => {
    const year = subject.year_level || 1;
    const sem = subject.semester_number || 1;
    if (!grouped[year]) grouped[year] = {};
    if (!grouped[year][sem]) grouped[year][sem] = [];
    grouped[year][sem].push(subject);
  });
  return grouped;
}

function renderSubjectRow(subject) {
  return `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div class="flex items-center gap-3">
        <span class="badge ${subject.is_major ? 'badge-info' : 'badge-warning'}">${subject.is_major ? 'Major' : 'Minor'}</span>
        <div>
          <span class="font-medium text-gray-800">${subject.code}</span>
          <p class="text-sm text-gray-500">${subject.title}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">${subject.units} units</span>
        ${subject.prerequisites?.length > 0 ? `
          <button onclick="event.stopPropagation(); showPrereqs('${subject.id}')" class="badge badge-warning text-xs cursor-pointer hover:bg-yellow-200">
            ${subject.prerequisites.length} prereq(s)
          </button>
        ` : ''}
        <button onclick="openPrereqModal('${subject.id}')" class="p-1 text-gray-400 hover:text-blue-600" title="Manage Prerequisites">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
          </svg>
        </button>
        <button onclick="editSubject('${subject.id}')" class="p-1 text-gray-400 hover:text-blue-600" title="Edit Subject">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
        </button>
        <button onclick="deleteSubject('${subject.id}')" class="p-1 text-gray-400 hover:text-red-600" title="Delete Subject">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderProgramModal() {
  const isEdit = !!state.editingProgram;
  const program = isEdit ? state.programs.find(p => p.id === state.editingProgram) : {};

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeProgramModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit' : 'Add'} Program</h2>
          <button onclick="closeProgramModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form onsubmit="saveProgram(event)" class="p-6 space-y-4">
          <div>
            <label class="form-label">Program Code *</label>
            <input type="text" id="program-code" class="form-input" value="${program.code || ''}" placeholder="BSIT" required>
          </div>
          <div>
            <label class="form-label">Program Name *</label>
            <input type="text" id="program-name" class="form-input" value="${program.name || ''}" placeholder="Bachelor of Science in Information Technology" required>
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea id="program-description" class="form-input" rows="3" placeholder="Program description">${program.description || ''}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Duration (Years) *</label>
              <input type="number" id="program-duration" class="form-input" value="${program.duration_years || 4}" min="1" max="6" required>
            </div>
            <div>
              <label class="form-label">Status</label>
              <select id="program-active" class="form-input">
                <option value="true" ${program.is_active !== false ? 'selected' : ''}>Active</option>
                <option value="false" ${program.is_active === false ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="closeProgramModal()" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'} Program</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderSubjectModal() {
  const isEdit = !!state.editingSubject;
  const subject = isEdit ? state.subjects.find(s => s.id === state.editingSubject) : {};

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeSubjectModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit' : 'Add'} Subject</h2>
          <button onclick="closeSubjectModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form onsubmit="saveSubject(event)" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Subject Code *</label>
              <input type="text" id="subject-code" class="form-input" value="${subject.code || ''}" placeholder="IT101" required>
            </div>
            <div>
              <label class="form-label">Units *</label>
              <input type="number" id="subject-units" class="form-input" value="${subject.units || 3}" min="1" max="6" required>
            </div>
          </div>
          <div>
            <label class="form-label">Subject Title *</label>
            <input type="text" id="subject-title" class="form-input" value="${subject.title || ''}" placeholder="Introduction to Computing" required>
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea id="subject-description" class="form-input" rows="2" placeholder="Subject description">${subject.description || ''}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="form-label">Year Level *</label>
              <select id="subject-year" class="form-input" required>
                ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${subject.year_level === y ? 'selected' : ''}>${y}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Semester *</label>
              <select id="subject-semester" class="form-input" required>
                <option value="1" ${subject.semester_number === 1 ? 'selected' : ''}>1st</option>
                <option value="2" ${subject.semester_number === 2 ? 'selected' : ''}>2nd</option>
              </select>
            </div>
            <div>
              <label class="form-label">Type</label>
              <select id="subject-major" class="form-input">
                <option value="true" ${subject.is_major !== false ? 'selected' : ''}>Major</option>
                <option value="false" ${subject.is_major === false ? 'selected' : ''}>Minor</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" onclick="closeSubjectModal()" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Create'} Subject</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderPrereqModal() {
  const subject = state.subjects.find(s => s.id === state.editingSubjectForPrereq);
  if (!subject) return '';

  const availablePrereqs = state.subjects.filter(s =>
    s.id !== subject.id &&
    !subject.prerequisites?.some(p => p.id === s.id) &&
    (s.year_level < subject.year_level || (s.year_level === subject.year_level && s.semester_number < subject.semester_number))
  );

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closePrereqModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Prerequisites for ${subject.code}</h2>
          <button onclick="closePrereqModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          <!-- Current Prerequisites -->
          <div class="mb-6">
            <h3 class="font-semibold text-gray-700 mb-2">Current Prerequisites</h3>
            ${subject.prerequisites?.length > 0 ? `
              <div class="space-y-2">
                ${subject.prerequisites.map(p => `
                  <div class="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                    <span class="font-medium text-blue-700">${p.code}</span>
                    <button onclick="removePrereq('${subject.id}', '${p.id}')" class="text-red-500 hover:text-red-700">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-gray-400 text-sm italic">No prerequisites</p>'}
          </div>
          
          <!-- Add Prerequisite -->
          ${availablePrereqs.length > 0 ? `
            <div>
              <h3 class="font-semibold text-gray-700 mb-2">Add Prerequisite</h3>
              <select id="prereq-select" class="form-input mb-3">
                <option value="">Select a subject...</option>
                ${availablePrereqs.map(s => `<option value="${s.id}">${s.code} - ${s.title}</option>`).join('')}
              </select>
              <button onclick="addPrereq('${subject.id}')" class="btn-primary w-full">Add Prerequisite</button>
            </div>
          ` : '<p class="text-gray-400 text-sm text-center">No available subjects to add as prerequisites</p>'}
        </div>
      </div>
    </div>
  `;
}

function renderVersionsModal() {
  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeVersionsModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">Curriculum Versions</h2>
          <button onclick="closeVersionsModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-6">
          ${state.versions.length > 0 ? `
            <div class="space-y-3">
              ${state.versions.map(v => `
                <div class="p-4 bg-gray-50 rounded-xl">
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-bold text-gray-800">Version ${v.version_number}</span>
                    ${v.is_active ? '<span class="badge badge-success">Active</span>' : ''}
                  </div>
                  <p class="text-sm text-gray-500">${v.notes || 'No notes'}</p>
                  <p class="text-xs text-gray-400 mt-2">Created by ${v.created_by_name || 'Unknown'} on ${formatDate(v.created_at)}</p>
                </div>
              `).join('')}
            </div>
          ` : '<p class="text-gray-400 text-center py-8">No versions saved yet. Click "Save Snapshot" to create one.</p>'}
        </div>
      </div>
    </div>
  `;
}

// Event Handlers
window.selectProgram = async function (id) {
  state.selectedProgram = state.programs.find(p => p.id === id);
  await loadSubjects(id);
};

window.openProgramModal = function (id = null) {
  state.editingProgram = id;
  state.showProgramModal = true;
  render();
};

window.closeProgramModal = function () {
  state.showProgramModal = false;
  state.editingProgram = null;
  render();
};

window.editProgram = function (id) {
  openProgramModal(id);
};

window.saveProgram = async function (e) {
  e.preventDefault();
  const data = {
    code: document.getElementById('program-code').value,
    name: document.getElementById('program-name').value,
    description: document.getElementById('program-description').value,
    duration_years: parseInt(document.getElementById('program-duration').value),
    is_active: document.getElementById('program-active').value === 'true'
  };

  try {
    let response;
    if (state.editingProgram) {
      response = await api.patch(endpoints.manageProgram(state.editingProgram), data);
    } else {
      response = await api.post(endpoints.managePrograms, data);
    }

    if (response && response.ok) {
      Toast.success(`Program ${state.editingProgram ? 'updated' : 'created'} successfully!`);
      closeProgramModal();
      await loadPrograms();
      render();
    } else {
      const error = await response?.json();
      Toast.error(error?.detail || 'Failed to save program');
    }
  } catch (error) {
    ErrorHandler.handle(error, `${state.editingProgram ? 'Updating' : 'Creating'} program`);
  }
};

window.openSubjectModal = function (id = null) {
  state.editingSubject = id;
  state.showSubjectModal = true;
  render();
};

window.closeSubjectModal = function () {
  state.showSubjectModal = false;
  state.editingSubject = null;
  render();
};

window.editSubject = function (id) {
  openSubjectModal(id);
};

window.saveSubject = async function (e) {
  e.preventDefault();
  const data = {
    program: state.selectedProgram.id,
    code: document.getElementById('subject-code').value,
    title: document.getElementById('subject-title').value,
    description: document.getElementById('subject-description').value,
    units: parseInt(document.getElementById('subject-units').value),
    year_level: parseInt(document.getElementById('subject-year').value),
    semester_number: parseInt(document.getElementById('subject-semester').value),
    is_major: document.getElementById('subject-major').value === 'true'
  };

  try {
    let response;
    if (state.editingSubject) {
      response = await api.patch(endpoints.manageSubject(state.editingSubject), data);
    } else {
      response = await api.post(endpoints.manageSubjects, data);
    }

    if (response && response.ok) {
      Toast.success(`Subject ${state.editingSubject ? 'updated' : 'created'} successfully!`);
      closeSubjectModal();
      await loadSubjects(state.selectedProgram.id);
    } else {
      const error = await response?.json();
      Toast.error(error?.detail || 'Failed to save subject');
    }
  } catch (error) {
    ErrorHandler.handle(error, `${state.editingSubject ? 'Updating' : 'Creating'} subject`);
  }
};

window.deleteSubject = async function (id) {
  ConfirmModal({
    title: 'Delete Subject',
    message: 'Are you sure you want to delete this subject?',
    confirmText: 'Delete',
    onConfirm: async () => {
      try {
        const response = await api.delete(endpoints.manageSubject(id));
        if (response && response.ok) {
          Toast.success('Subject deleted successfully!');
          await loadSubjects(state.selectedProgram.id);
        } else {
          const error = await response?.json();
          Toast.error(error?.detail || 'Failed to delete subject');
        }
      } catch (error) {
        ErrorHandler.handle(error, 'Deleting subject');
      }
    }
  });
};

window.openPrereqModal = function (subjectId) {
  state.editingSubjectForPrereq = subjectId;
  state.showPrereqModal = true;
  render();
};

window.closePrereqModal = function () {
  state.showPrereqModal = false;
  state.editingSubjectForPrereq = null;
  render();
};

window.addPrereq = async function (subjectId) {
  const prereqId = document.getElementById('prereq-select').value;
  if (!prereqId) {
    Toast.error('Please select a prerequisite');
    return;
  }

  try {
    const response = await api.post(endpoints.subjectPrereqs(subjectId), { prerequisite_id: prereqId });
    if (response && response.ok) {
      Toast.success('Prerequisite added successfully!');
      await loadSubjects(state.selectedProgram.id);
      openPrereqModal(subjectId); // Refresh modal
    } else {
      const error = await response?.json();
      Toast.error(error?.error || error?.detail || 'Failed to add prerequisite');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Adding prerequisite');
  }
};

window.removePrereq = async function (subjectId, prereqId) {
  try {
    const response = await api.delete(endpoints.removeSubjectPrereq(subjectId, prereqId));
    if (response && response.ok) {
      Toast.success('Prerequisite removed!');
      await loadSubjects(state.selectedProgram.id);
      openPrereqModal(subjectId);
    } else {
      const error = await response?.json();
      Toast.error(error?.detail || 'Failed to remove prerequisite');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Removing prerequisite');
  }
};

window.showPrereqs = function (subjectId) {
  openPrereqModal(subjectId);
};

window.openVersionsModal = async function () {
  if (state.selectedProgram) {
    await loadVersions(state.selectedProgram.id);
  }
  state.showVersionsModal = true;
  render();
};

window.closeVersionsModal = function () {
  state.showVersionsModal = false;
  render();
};

window.createSnapshot = async function () {
  if (!state.selectedProgram) return;

  const notes = prompt('Enter notes for this curriculum version:');
  if (notes === null) return;

  try {
    const response = await api.post(endpoints.programSnapshot(state.selectedProgram.id), {
      notes: notes || 'Curriculum snapshot'
    });

    if (response && response.ok) {
      Toast.success('Curriculum snapshot saved!');
    } else {
      const error = await response?.json();
      Toast.error(error?.detail || 'Failed to save snapshot');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Saving curriculum snapshot');
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/pages/auth/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
