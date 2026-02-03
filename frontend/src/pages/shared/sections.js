import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatDate } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { Modal, ConfirmModal } from '../../components/Modal.js';

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
  sectionModal: null,
  assignModal: null,
  editingSection: null
};

// No more mock data - all data comes from real API

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
    state.programs = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading programs');
    state.programs = [];
  }

  // Load semesters
  try {
    const response = await api.get(endpoints.semesters);
    state.semesters = response?.results || response || [];
    state.activeSemester = state.semesters.find(s => s.is_active) || state.semesters[0] || null;

    if (state.semesters.length === 0) {
      Toast.warning('No semesters found. Please create a semester first.');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
    state.activeSemester = null;
  }

  // Load professors
  try {
    const response = await api.get(endpoints.professors);
    state.professors = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading professors');
    state.professors = [];
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

    // Load section subjects
    try {
      const subjectsResponse = await api.get(`${endpoints.sectionSubjects}?section=${sectionId}`);
      state.selectedSection.section_subjects = subjectsResponse?.results || subjectsResponse || [];
    } catch (error) {
      ErrorHandler.handle(error, 'Loading section subjects');
      state.selectedSection.section_subjects = [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading section details');
    // Fallback to cached section data
    state.selectedSection = state.sections.find(s => s.id === sectionId) || null;
    if (state.selectedSection) {
      state.selectedSection.section_subjects = [];
    }
  }

  // Load available subjects for the program
  try {
    const programId = state.selectedSection?.program?.id;
    if (programId) {
      const response = await api.get(`${endpoints.manageSubjects}?program=${programId}`);
      state.subjects = response?.results || response || [];
    } else {
      state.subjects = [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading available subjects');
    state.subjects = [];
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
    app.innerHTML = LoadingOverlay('Loading sections...');
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
  `;
}


// Form generators
function getSectionForm() {
  const isEdit = !!state.editingSection;
  const section = isEdit ? state.sections.find(s => s.id === state.editingSection) : {};

  return `
    <form id="section-form" class="space-y-4">
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
    </form>
  `;
}

function getAssignSubjectForm() {
  const assignedSubjectIds = (state.selectedSection?.section_subjects || []).map(ss => ss.subject?.id);
  const availableSubjects = state.subjects.filter(s => !assignedSubjectIds.includes(s.id));

  return `
    <form id="assign-form" class="space-y-4">
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
    </form>
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
                <div class="flex-1">
                  <p class="font-semibold text-gray-800">${ss.subject?.code} - ${ss.subject?.title}</p>
                  <div class="text-sm text-gray-500 space-y-1">
                    ${ss.professors && ss.professors.length > 0 ?
                      ss.professors.map(prof => `
                        <div class="flex items-center gap-2">
                          <span>${prof.name || prof.full_name || 'Unknown Professor'}</span>
                          ${prof.is_primary ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Primary</span>' : ''}
                        </div>
                      `).join('')
                      : ss.is_tba ? '<span class="text-yellow-600">TBA</span>' : '<span class="text-orange-600">No professors assigned</span>'}
                    ${ss.schedule_slots && ss.schedule_slots.length > 0 ? `
                      <div class="mt-2 space-y-1">
                        ${ss.schedule_slots.map(slot => `
                          <div class="flex items-center gap-2 text-xs text-gray-600">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${slot.day_display || slot.day} ${slot.start_time}-${slot.end_time}</span>
                            ${slot.room ? `<span class="text-gray-400">• ${slot.room}</span>` : ''}
                          </div>
                        `).join('')}
                      </div>
                    ` : ss.is_tba ? '' : '<div class="text-xs text-orange-500 mt-1">No schedule set</div>'}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                ${ss.is_tba ? '<span class="badge badge-warning">TBA</span>' : ''}
                <button
                  onclick="toggleTBA('${ss.id}', ${!ss.is_tba})"
                  class="p-2 text-gray-400 hover:text-yellow-600 rounded-lg"
                  title="${ss.is_tba ? 'Mark as scheduled' : 'Mark as TBA'}">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </button>
                <button
                  onclick="openScheduleModal('${ss.id}')"
                  class="p-2 text-gray-400 hover:text-blue-600 rounded-lg"
                  title="Manage schedule">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </button>
                <button
                  onclick="removeAssignment('${ss.id}')"
                  class="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                  title="Remove subject">
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
  const isEdit = !!id;

  const modal = new Modal({
    title: isEdit ? 'Edit Section' : 'Add Section',
    content: getSectionForm(),
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => { m.close(); state.editingSection = null; } },
      {
        label: isEdit ? 'Update Section' : 'Create Section',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('section-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            name: document.getElementById('section-name').value,
            program: document.getElementById('section-program').value,
            semester: document.getElementById('section-semester').value,
            year_level: parseInt(document.getElementById('section-year').value),
            capacity: parseInt(document.getElementById('section-capacity').value)
          };

          try {
            if (state.editingSection) {
              await api.patch(endpoints.section(state.editingSection), data);
            } else {
              await api.post(endpoints.sections, data);
            }

            Toast.success(`Section ${isEdit ? 'updated' : 'created'} successfully!`);
            m.close();
            state.editingSection = null;
            await loadSections();
            render();
          } catch (error) {
            ErrorHandler.handle(error, `${isEdit ? 'Updating' : 'Creating'} section`);
          }
        }
      }
    ]
  });

  state.sectionModal = modal;
  modal.show();
};

window.editSection = function (id) {
  openSectionModal(id);
};

window.openAssignModal = function () {
  const modal = new Modal({
    title: `Assign Subject to ${state.selectedSection?.name}`,
    content: getAssignSubjectForm(),
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Assign Subject',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('assign-form');
          const subjectId = document.getElementById('assign-subject').value;
          const professorId = document.getElementById('assign-professor').value;
          const isTba = document.getElementById('assign-tba').checked;

          if (!subjectId) {
            Toast.error('Please select a subject');
            return;
          }

          const data = {
            section: state.selectedSection.id,
            subject: subjectId,
            professor: professorId || null,
            is_tba: isTba || !professorId
          };

          try {
            await api.post(endpoints.sectionSubjects, data);
            Toast.success('Subject assigned successfully!');
            m.close();
            await loadSectionDetails(state.selectedSection.id);
          } catch (error) {
            ErrorHandler.handle(error, 'Assigning subject');
          }
        }
      }
    ]
  });

  state.assignModal = modal;
  modal.show();
};

window.toggleTBA = async function (sectionSubjectId, isTba) {
  try {
    await api.patch(endpoints.sectionSubject(sectionSubjectId), {
      is_tba: isTba
    });

    Toast.success(isTba ? 'Marked as TBA' : 'Removed TBA status');
    await loadSectionDetails(state.selectedSection.id);
  } catch (error) {
    ErrorHandler.handle(error, 'Updating TBA status');
  }
};

window.openScheduleModal = function (sectionSubjectId) {
  // Navigate to schedule page with this section-subject pre-selected
  const sectionSubject = state.selectedSection?.section_subjects?.find(ss => ss.id === sectionSubjectId);
  if (!sectionSubject) return;

  // Store in localStorage for the schedule page to pick up
  localStorage.setItem('schedule_section_id', state.selectedSection.id);
  localStorage.setItem('schedule_section_subject_id', sectionSubjectId);

  window.location.href = '/schedule.html';
};

window.removeAssignment = async function (id) {
  const confirmed = await ConfirmModal({
    title: 'Remove Subject',
    message: 'Remove this subject from the section?',
    confirmLabel: 'Remove',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.sectionSubject(id));
    Toast.success('Subject removed!');
    await loadSectionDetails(state.selectedSection.id);
  } catch (error) {
    ErrorHandler.handle(error, 'Removing subject');
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
