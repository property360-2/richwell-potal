/**
 * Registrar Sections Page
 * 
 * Refactored to use modular components from the atomic architecture.
 */
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, updateHash } from '../components/tabs.js';

// Import modular components
import { renderScheduleGrid, DAYS, TIME_SLOTS, formatTime } from '../organisms/tables/ScheduleGrid.js';
import { renderPageHeader } from '../organisms/layout/PageHeader.js';
import { renderEmptyState, EmptyStatePresets } from '../organisms/layout/EmptyState.js';
import { renderFilterPanel } from '../organisms/filters/FilterPanel.js';
import { renderBadge, renderStatusBadge } from '../atoms/badges/Badge.js';
import { Icon } from '../atoms/icons/Icon.js';

// Tab constants
const TABS = {
  SECTIONS: 'sections',
  SCHEDULE: 'schedule'
};

// Room options (can be fetched from API later)
const ROOMS = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
  'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
  'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'
];

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
  selectedSection: null,
  sectionSubjects: [],
  sectionSchedule: [],

  // Professors state
  professors: [],

  // Modals
  sectionModal: null,
  scheduleModal: null,
  subjectAssignModal: null
};

// ============================================================
// INITIALIZATION
// ============================================================

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

// ============================================================
// DATA LOADING
// ============================================================

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
    state.activeSemester = state.semesters.find(s => s.is_current || s.is_active) || state.semesters[0] || null;
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.semesters = [];
  }

  await loadSections();
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

async function loadSectionDetails(sectionId) {
  try {
    const response = await api.get(endpoints.section(sectionId));
    state.selectedSection = response;

    // Load section subjects with schedules
    const subjectsResponse = await api.get(`${endpoints.sectionSubjects}?section=${sectionId}`);
    state.sectionSubjects = subjectsResponse?.results || subjectsResponse || [];

    // Build schedule from section subjects - format for ScheduleGrid
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
            professor_name: ss.professors?.[0]
              ? `${ss.professors[0].first_name || ''} ${ss.professors[0].last_name || ''}`.trim()
              : null
          });
        });
      }
    });

  } catch (error) {
    ErrorHandler.handle(error, 'Loading section details');
  }
}

// ============================================================
// MAIN RENDER
// ============================================================

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
      ${renderPageHeader({
    title: 'Section & Schedule Management',
    subtitle: 'Manage sections, assign subjects, professors, and schedules'
  })}

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
  const headerHtml = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Sections</h2>
        <p class="text-sm text-gray-600 mt-1">
          ${state.sections.length} sections for ${state.activeSemester?.name || 'current semester'}
        </p>
      </div>
      <button onclick="openAddSectionModal()" class="btn btn-primary flex items-center gap-2">
        ${Icon('plus', { size: 'md' })}
        Add Section
      </button>
    </div>
  `;

  if (state.sections.length === 0) {
    return `
      ${headerHtml}
      ${renderEmptyState({
      icon: 'folder',
      title: 'No sections found',
      message: 'Click "Add Section" to create your first section',
      action: { label: 'Add Section', onClick: 'openAddSectionModal()' }
    })}
    `;
  }

  // Year level badge colors
  const getYearBadgeColor = (year) => {
    const colors = { 1: 'success', 2: 'primary', 3: 'purple', 4: 'warning' };
    return colors[year] || 'secondary';
  };

  return `
    ${headerHtml}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${state.sections.map(section => `
        <div class="card hover:shadow-lg transition-shadow cursor-pointer" onclick="viewSection('${section.id}')">
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="text-lg font-bold text-blue-600">${section.name}</h3>
              <p class="text-sm text-gray-600">${section.program_code || section.program?.code || 'N/A'}</p>
            </div>
            ${renderBadge({
    text: `Year ${section.year_level || 'N/A'}`,
    color: getYearBadgeColor(section.year_level),
    size: 'sm'
  })}
          </div>
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>${section.enrolled_count || 0}/${section.capacity || 40} students</span>
            <span>${section.subject_count || 0} subjects</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ============================================================
// SECTION DETAIL VIEW
// ============================================================

function renderSectionDetail() {
  const section = state.selectedSection;

  return `
    <!-- Back Button -->
    <button onclick="backToSections()" class="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6">
      ${Icon('arrowLeft', { size: 'md' })}
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
          <button onclick="openEditSectionModal()" class="btn btn-gray">
            Edit
          </button>
          <button onclick="openMergeSectionModal()" class="btn btn-warning text-white">
            Merge
          </button>
          <button onclick="dissolveSection()" class="btn btn-danger text-white">
            Dissolve
          </button>
        </div>
      </div>
    </div>

    <!-- Section Subjects & Schedule -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Assigned Subjects -->
      <div class="lg:col-span-1">
        <div class="card">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Assigned Subjects</h3>
          ${renderAssignedSubjects()}
        </div>
      </div>

      <!-- Weekly Schedule Grid - Using ScheduleGrid organism! -->
      <div class="lg:col-span-2">
        <div class="card">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Weekly Schedule</h3>
          ${renderScheduleGrid({
    slots: state.sectionSchedule,
    mode: 'view',
    showDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    emptyMessage: 'No schedule slots defined yet',
    className: ''
  })}
        </div>
      </div>
    </div>
  `;
}

function renderAssignedSubjects() {
  if (state.sectionSubjects.length === 0) {
    return `<p class="text-gray-500 text-center py-8">No subjects assigned yet</p>`;
  }

  return `
    <div class="space-y-3">
      ${state.sectionSubjects.map(ss => {
    const subject = ss.subject || {};
    const professor = ss.professors?.[0] || ss.professor;
    const profName = professor
      ? `Prof. ${professor.first_name || ''} ${professor.last_name || ''}`.trim()
      : null;

    return `
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-bold text-blue-600">${subject.code || ss.subject_code}</p>
                <p class="text-sm text-gray-700">${subject.title || ss.subject_name || ''}</p>
                ${profName
        ? `<p class="text-xs text-gray-500 mt-1">${profName}</p>`
        : `<p class="text-xs text-orange-500 mt-1">No professor assigned</p>`
      }
              </div>
              <button onclick="openScheduleSlotModal('${ss.id}')"
                      class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                ${Icon('plus', { size: 'sm' })} Schedule
              </button>
            </div>
            ${ss.schedule_slots && ss.schedule_slots.length > 0 ? `
              <div class="mt-2 pt-2 border-t border-gray-200">
                ${ss.schedule_slots.map(slot => `
                  <p class="text-xs text-gray-600">
                    ${slot.day} ${formatTime(slot.start_time)}-${formatTime(slot.end_time)} | ${slot.room || 'TBA'}
                  </p>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
  }).join('')}
    </div>
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
          <p class="text-sm text-gray-600 mt-1">View all section schedules</p>
        </div>
        <select id="section-filter" onchange="filterScheduleBySection(this.value)" class="form-select">
          <option value="">Select a Section</option>
          ${state.sections.map(s => `
            <option value="${s.id}">${s.name}</option>
          `).join('')}
        </select>
      </div>
    </div>

    ${state.sectionSchedule.length > 0
      ? renderScheduleGrid({
        slots: state.sectionSchedule,
        mode: 'view',
        showDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        emptyMessage: 'Select a section to view its schedule'
      })
      : renderEmptyState({
        icon: 'calendar',
        title: 'Select a section to view its schedule',
        message: 'Or click on a section card in the Sections tab'
      })
    }
  `;
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
  await loadSections();
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

window.openAssignSubjectModal = function () {
  Toast.info('Subject assignment modal - select from program subjects');
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

window.openMergeSectionModal = function () {
  if (!state.selectedSection) return;

  // Filter sections: Same program, same semester, same year level, not itself
  const potentialTargets = state.sections.filter(s =>
    s.id !== state.selectedSection.id &&
    (s.program?.id === state.selectedSection.program?.id || s.program === state.selectedSection.program) &&
    s.year_level === state.selectedSection.year_level
  );

  const modal = new Modal({
    title: 'Merge Section',
    content: `
      <div class="p-4 bg-yellow-50 text-yellow-800 rounded mb-4 text-sm">
        <p class="font-bold mb-1">Warning: Irreversible Action</p>
        <p>Merging <strong>${state.selectedSection.name}</strong> will:</p>
        <ul class="list-disc ml-5 mt-1">
          <li>Move all ${state.selectedSection.enrolled_count || 0} students to the target section</li>
          <li>Mark this section as DISSOLVED</li>
          <li>Set the target section as the Parent Section</li>
        </ul>
      </div>
      <form id="merge-section-form">
        <label class="block text-sm font-medium text-gray-700 mb-1">Target Section *</label>
        <select id="target-section" required class="form-select">
          <option value="">Select Target Section</option>
          ${potentialTargets.map(s => `<option value="${s.id}">${s.name} (${s.enrolled_count}/${s.capacity})</option>`).join('')}
        </select>
        ${potentialTargets.length === 0 ? '<p class="text-xs text-red-500 mt-1">No eligible sections found (must match Program and Year Level)</p>' : ''}
      </form>
    `,
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Merge Sections',
        primary: true,
        danger: true,
        onClick: async (m) => {
          const targetId = document.getElementById('target-section').value;
          if (!targetId) {
            Toast.error('Please select a target section');
            return;
          }
          try {
            await api.post(`${endpoints.sections}${state.selectedSection.id}/merge/`, {
              target_section_id: targetId
            });
            Toast.success('Section merged successfully');
            m.close();
            backToSections();
            await loadSections();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Merging section');
          }
        }
      }
    ]
  });
  modal.show();
};

window.dissolveSection = async function () {
  if (!state.selectedSection) return;

  const confirmed = await ConfirmModal({
    title: 'Dissolve Section',
    message: `Are you sure you want to dissolve <span class="font-bold">${state.selectedSection.name}</span>? 
                  <br/><br/>
                  <span class="text-red-500">Students will be unassigned from their home section (Regular -> Irregular).</span>`,
    confirmLabel: 'Yes, Dissolve Section',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.post(`${endpoints.sections}${state.selectedSection.id}/dissolve/`);
    Toast.success('Section dissolved');
    backToSections();
    await loadSections();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Dissolving section');
  }
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
