import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal, ConfirmModal } from '../components/Modal.js';
import { createTabs, updateHash } from '../components/tabs.js';

// Tab constants
const TABS = {
  SECTIONS: 'sections',
  SCHEDULE: 'schedule'
};

// Days for schedule grid (Monday-Sunday)
const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' },
  { code: 'SUN', name: 'Sunday', short: 'Sun' }
];

// Time slots (1-hour blocks from 7am to 9pm)
const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

// Room options
const ROOMS = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
  'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
  'Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5'
];

// Subject colors for schedule grid
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

function getSubjectColor(subjectCode) {
  const codes = [...new Set(state.sectionSchedule.map(s => s.subject_code))];
  const index = codes.indexOf(subjectCode);
  return COLORS[index % COLORS.length];
}

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

  // Load sections
  await loadSections();

  // Load professors
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

    // Build schedule from section subjects
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
            professor: ss.professors?.[0] || ss.professor
          });
        });
      }
    });

  } catch (error) {
    ErrorHandler.handle(error, 'Loading section details');
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
      role: 'REGISTRAR',
      activePage: 'registrar-sections',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Section & Schedule Management</h1>
        <p class="text-gray-600 mt-1">Manage sections, assign subjects, professors, and schedules</p>
      </div>

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
  return `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-xl font-bold text-gray-800">Sections</h2>
        <p class="text-sm text-gray-600 mt-1">
          ${state.sections.length} sections for ${state.activeSemester?.name || 'current semester'}
        </p>
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${state.sections.map(section => `
          <div class="card hover:shadow-lg transition-shadow cursor-pointer" onclick="viewSection('${section.id}')">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-lg font-bold text-blue-600">${section.name}</h3>
                <p class="text-sm text-gray-600">${section.program_code || section.program?.code || 'N/A'}</p>
              </div>
              <span class="px-2 py-1 text-xs font-medium rounded ${
                section.year_level === 1 ? 'bg-green-100 text-green-800' :
                section.year_level === 2 ? 'bg-blue-100 text-blue-800' :
                section.year_level === 3 ? 'bg-purple-100 text-purple-800' :
                'bg-orange-100 text-orange-800'
              }">
                Year ${section.year_level || 'N/A'}
              </span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-500">
              <span>${section.enrolled_count || 0}/${section.capacity || 40} students</span>
              <span>${section.subject_count || 0} subjects</span>
            </div>
          </div>
        `).join('')}
      </div>
    `}
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
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
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
          <button onclick="openEditSectionModal()" class="btn btn-secondary">
            Edit Section
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
          ${state.sectionSubjects.length === 0 ? `
            <p class="text-gray-500 text-center py-8">No subjects assigned yet</p>
          ` : `
            <div class="space-y-3">
              ${state.sectionSubjects.map(ss => {
                const subject = ss.subject || {};
                const professor = ss.professors?.[0] || ss.professor;
                return `
                  <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="flex items-start justify-between">
                      <div>
                        <p class="font-bold text-blue-600">${subject.code || ss.subject_code}</p>
                        <p class="text-sm text-gray-700">${subject.title || ss.subject_name || ''}</p>
                        ${professor ? `
                          <p class="text-xs text-gray-500 mt-1">
                            Prof. ${professor.first_name || ''} ${professor.last_name || ''}
                          </p>
                        ` : '<p class="text-xs text-orange-500 mt-1">No professor assigned</p>'}
                      </div>
                      <button onclick="openScheduleSlotModal('${ss.id}')"
                              class="text-blue-600 hover:text-blue-800 text-sm">
                        + Schedule
                      </button>
                    </div>
                    ${ss.schedule_slots && ss.schedule_slots.length > 0 ? `
                      <div class="mt-2 pt-2 border-t border-gray-200">
                        ${ss.schedule_slots.map(slot => `
                          <p class="text-xs text-gray-600">
                            ${slot.day} ${slot.start_time}-${slot.end_time} | ${slot.room || 'TBA'}
                          </p>
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- Weekly Schedule Grid -->
      <div class="lg:col-span-2">
        <div class="card overflow-hidden">
          <h3 class="text-lg font-bold text-gray-800 mb-4">Weekly Schedule</h3>
          ${renderSectionScheduleGrid()}
        </div>
      </div>
    </div>
  `;
}

function renderSectionScheduleGrid() {
  if (state.sectionSchedule.length === 0) {
    return `
      <div class="text-center py-8 text-gray-500">
        <p>No schedule slots defined yet</p>
        <p class="text-sm mt-1">Assign subjects and add schedules to see them here</p>
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-50">
            <th class="border border-gray-200 px-2 py-2 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10 w-16">Time</th>
            ${DAYS.map(day => `
              <th class="border border-gray-200 px-2 py-2 text-center text-xs font-semibold text-gray-600 uppercase min-w-[100px]">${day.short}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${TIME_SLOTS.map(timeSlot => `
            <tr>
              <td class="border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">${formatTime(timeSlot)}</td>
              ${DAYS.map(day => renderScheduleCell(day.code, timeSlot)).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderScheduleCell(day, timeSlot) {
  const slots = state.sectionSchedule.filter(s => {
    if (s.day !== day) return false;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const startHour = parseInt(s.start_time?.split(':')[0] || '0');
    const endHour = parseInt(s.end_time?.split(':')[0] || '0');
    return slotHour >= startHour && slotHour < endHour;
  });

  if (slots.length === 0) {
    return `<td class="border border-gray-200 px-1 py-1 bg-white h-8"></td>`;
  }

  const slot = slots[0];
  const isFirstSlot = timeSlot === slot.start_time?.substring(0, 5);

  if (!isFirstSlot) {
    return `<td class="border-0"></td>`;
  }

  const duration = calculateDuration(slot.start_time, slot.end_time);
  const color = getSubjectColor(slot.subject_code);

  return `
    <td class="border border-gray-200 px-1 py-1 align-top" rowspan="${duration}">
      <div class="rounded border-l-4 p-1 h-full ${color} text-xs">
        <div class="font-bold">${slot.subject_code}</div>
        <div class="opacity-80">${slot.room || 'TBA'}</div>
      </div>
    </td>
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
          <option value="">All Sections</option>
          ${state.sections.map(s => `
            <option value="${s.id}">${s.name}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <p class="text-gray-500 text-lg">Select a section to view its schedule</p>
      <p class="text-gray-400 text-sm mt-2">Or click on a section card in the Sections tab</p>
    </div>
  `;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatTime(time24) {
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

// ============================================================
// EVENT HANDLERS - TAB SWITCHING
// ============================================================

window.switchTab = function(tabId) {
  state.activeTab = tabId;
  updateHash(tabId);
  render();
};

window.changeSemester = async function(semesterId) {
  state.activeSemester = state.semesters.find(s => s.id === semesterId);
  state.selectedSection = null;
  await loadSections();
  render();
};

// ============================================================
// EVENT HANDLERS - SECTIONS
// ============================================================

window.viewSection = async function(sectionId) {
  await loadSectionDetails(sectionId);
  render();
};

window.backToSections = function() {
  state.selectedSection = null;
  state.sectionSubjects = [];
  state.sectionSchedule = [];
  render();
};

window.openAddSectionModal = function() {
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

window.openAssignSubjectModal = function() {
  Toast.info('Subject assignment modal - select from program subjects');
};

window.openScheduleSlotModal = function(sectionSubjectId) {
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

window.deleteSection = async function(sectionId) {
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

window.filterScheduleBySection = async function(sectionId) {
  if (!sectionId) {
    state.sectionSchedule = [];
    render();
    return;
  }
  await loadSectionDetails(sectionId);
  render();
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
