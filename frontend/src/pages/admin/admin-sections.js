import '../../../../style.css';
import { api, endpoints, TokenManager } from '../../../../api.js';
import { requireAuth } from '../../../../utils.js';
import { createHeader } from '../../../../components/header.js';
import { Toast } from '../../../../components/Toast.js';
import { ErrorHandler } from '../../../../utils/errorHandler.js';
import { LoadingOverlay } from '../../../../components/Spinner.js';
import { Modal, ConfirmModal } from '../../../../components/Modal.js';
import { createTabs, updateHash } from '../../../../components/tabs.js';

// Tab constants
const TABS = {
  SECTIONS: 'sections',
  PROFESSORS: 'professors',
  SCHEDULE: 'schedule'
};

// State
const state = {
  user: null,
  loading: true,
  activeTab: TABS.SECTIONS,

  // Sections state
  sections: [],
  programs: [],
  semesters: [],
  activeSemester: null,

  // Professors state
  professors: []
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
    // Handle different response formats
    if (response?.semesters && Array.isArray(response.semesters)) {
      state.semesters = response.semesters;
    } else if (response?.results && Array.isArray(response.results)) {
      state.semesters = response.results;
    } else if (Array.isArray(response)) {
      state.semesters = response;
    } else {
      state.semesters = [];
    }
    state.activeSemester = state.semesters.find(s => s.is_current || s.is_active) || state.semesters[0] || null;
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
  }

  // Load sections
  await loadSections();

  // Load professors
  await loadProfessors();
}

async function loadSections() {
  try {
    const response = await api.get(endpoints.sections);
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

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'ADMIN',
      activePage: 'admin-sections',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Section & Scheduling Management</h1>
        <p class="text-gray-600 mt-1">Manage sections, professors, and schedules</p>
      </div>

      <!-- Tabs -->
      ${createTabs({
        tabs: [
          { id: TABS.SECTIONS, label: 'Sections' },
          { id: TABS.PROFESSORS, label: 'Professors' },
          { id: TABS.SCHEDULE, label: 'Schedule' }
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
      return renderSectionsTab();
    case TABS.PROFESSORS:
      return renderProfessorsTab();
    case TABS.SCHEDULE:
      return renderScheduleTab();
    default:
      return renderSectionsTab();
  }
}

// ============================================================
// SECTIONS TAB
// ============================================================

function renderSectionsTab() {
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Sections</h2>
        <p class="text-sm text-gray-600 mt-1">Class sections for the current semester</p>
      </div>
      <button onclick="openAddSectionModal()" class="btn btn-primary flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Add Section
      </button>
    </div>

    ${state.sections.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
        <p class="text-gray-500 text-lg">No sections found</p>
        <p class="text-gray-400 text-sm mt-2">Click "Add Section" to create your first section</p>
      </div>
    ` : `
      <div class="space-y-4">
        ${state.sections.map(section => `
          <div class="card">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-bold text-blue-600">${section.name}</h3>
                  <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    ${section.program_code || 'N/A'}
                  </span>
                  <span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                    ${section.semester_name || 'N/A'}
                  </span>
                </div>
                <p class="text-sm text-gray-600">Year ${section.year_level || 'N/A'}</p>
                <p class="text-sm text-gray-500">${section.subject_count || 0} subjects assigned</p>
              </div>
              <div class="flex gap-2">
                <button onclick="viewSection('${section.id}')" class="btn btn-secondary text-sm">
                  View
                </button>
                <button onclick="deleteSection('${section.id}')" class="btn btn-danger text-sm">
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
// PROFESSORS TAB
// ============================================================

function renderProfessorsTab() {
  return `
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-800">Professors</h2>
      <p class="text-sm text-gray-600 mt-1">Faculty members and teaching workload</p>
    </div>

    ${state.professors.length === 0 ? `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <p class="text-gray-500 text-lg">No professors found</p>
        <p class="text-gray-400 text-sm mt-2">Professors can be added through user management</p>
      </div>
    ` : `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${state.professors.map(prof => `
          <div class="card">
            <div class="flex items-start gap-3 mb-4">
              <div class="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                ${prof.first_name?.[0] || ''}${prof.last_name?.[0] || ''}
              </div>
              <div class="flex-1">
                <h3 class="font-bold text-gray-800">${prof.first_name} ${prof.last_name}</h3>
                <p class="text-sm text-gray-600">${prof.email}</p>
              </div>
            </div>
            ${prof.professor_profile ? `
              <div class="space-y-2 pt-3 border-t border-gray-200">
                ${prof.professor_profile.department ? `
                  <div class="flex items-center gap-2 text-sm">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                    <span class="text-gray-700">${prof.professor_profile.department}</span>
                  </div>
                ` : ''}
                <div class="flex items-center gap-2 text-sm">
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="text-gray-700">Max: ${prof.professor_profile.max_teaching_hours || 24} hrs/week</span>
                </div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `}
  `;
}

// ============================================================
// SCHEDULE TAB
// ============================================================

function renderScheduleTab() {
  return `
    <div class="mb-6">
      <h2 class="text-xl font-bold text-gray-800">Schedule</h2>
      <p class="text-sm text-gray-600 mt-1">Class schedules and time slots</p>
    </div>

    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <p class="text-gray-500 text-lg">Schedule management</p>
      <p class="text-gray-400 text-sm mt-2">Select a section to view and manage its schedule</p>
    </div>
  `;
}

// ============================================================
// EVENT HANDLERS
// ============================================================

window.switchTab = function(tabId) {
  state.activeTab = tabId;
  updateHash(tabId);
  render();
};

window.openAddSectionModal = function() {
  const modal = new Modal({
    title: 'Add New Section',
    content: getSectionForm(),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Create Section',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-section-form');
          if (!form.checkValidity()) { form.reportValidity(); return; }

          const data = {
            name: document.getElementById('add-section-name').value,
            program: document.getElementById('add-section-program').value,
            semester: document.getElementById('add-section-semester').value,
            year_level: parseInt(document.getElementById('add-section-year').value),
            max_students: parseInt(document.getElementById('add-section-max').value)
          };

          try {
            await api.post(endpoints.sections, data);
            Toast.success('Section created');
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

function getSectionForm() {
  return `
    <form id="add-section-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Section Name *</label>
        <input type="text" id="add-section-name" required class="form-input" placeholder="e.g., BSIT-1A">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program *</label>
        <select id="add-section-program" required class="form-select">
          <option value="">Select a program...</option>
          ${state.programs.map(p => `
            <option value="${p.id}">${p.code} - ${p.name}</option>
          `).join('')}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
        <select id="add-section-semester" required class="form-select">
          <option value="">Select a semester...</option>
          ${state.semesters.map(s => `
            <option value="${s.id}" ${s.is_current ? 'selected' : ''}>${s.name} - ${s.academic_year}</option>
          `).join('')}
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
          <select id="add-section-year" required class="form-select">
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Max Students *</label>
          <input type="number" id="add-section-max" value="40" min="1" max="100" required class="form-input">
        </div>
      </div>
    </form>
  `;
}

window.viewSection = function(sectionId) {
  Toast.info('View section - coming soon');
};

window.deleteSection = async function(sectionId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Section',
    message: 'Are you sure you want to delete this section?',
    confirmLabel: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  try {
    await api.delete(endpoints.section(sectionId));
    Toast.success('Section deleted');
    await loadSections();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting section');
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
