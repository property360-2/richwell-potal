import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth, getQueryParam } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
    user: null,
    sections: [],
    selectedSection: null,
    sectionSubjects: [],
    scheduleSlots: [],
    loading: true,
    showSlotModal: false,
    showConflictModal: false,
    editingSlot: null,
    conflict: null,
    pendingSlotData: null
};

// Constants
const DAYS = [
    { code: 'MON', name: 'Monday' },
    { code: 'TUE', name: 'Tuesday' },
    { code: 'WED', name: 'Wednesday' },
    { code: 'THU', name: 'Thursday' },
    { code: 'FRI', name: 'Friday' },
    { code: 'SAT', name: 'Saturday' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

// No more mock data - all data comes from real API

// Color palette for subjects
const COLORS = [
    'bg-blue-100 border-blue-300 text-blue-800',
    'bg-green-100 border-green-300 text-green-800',
    'bg-purple-100 border-purple-300 text-purple-800',
    'bg-orange-100 border-orange-300 text-orange-800',
    'bg-pink-100 border-pink-300 text-pink-800',
    'bg-teal-100 border-teal-300 text-teal-800',
    'bg-indigo-100 border-indigo-300 text-indigo-800',
    'bg-red-100 border-red-300 text-red-800'
];

function getSubjectColor(index) {
    return COLORS[index % COLORS.length];
}

async function init() {
    if (!requireAuth()) return;

    await loadUserProfile();
    await loadSections();

    // Check for section param in URL
    const sectionId = getQueryParam('section');
    if (sectionId) {
        await selectSection(sectionId);
    }

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
        const savedUser = TokenManager.getUser();
        if (savedUser) state.user = savedUser;
    }
}

async function loadSections() {
    try {
        const response = await api.get(endpoints.sections);
        const sections = response?.results || response;
        if (sections && Array.isArray(sections)) {
            state.sections = sections;
            console.log(`Loaded ${sections.length} sections from API`);
        } else {
            state.sections = [];
            console.warn('No sections returned from API');
        }
    } catch (error) {
        console.error('Error loading sections:', error);
        state.sections = [];
    }
}

async function selectSection(id) {
    state.selectedSection = state.sections.find(s => s.id === id);

    if (!state.selectedSection) {
        console.error('Section not found:', id);
        return;
    }

    // Load section subjects
    try {
        const response = await api.get(`${endpoints.sectionSubjects}?section=${id}`);
        const subjects = response?.results || response;
        if (subjects && Array.isArray(subjects)) {
            state.sectionSubjects = subjects;
            console.log(`Loaded ${subjects.length} section subjects`);
        } else {
            state.sectionSubjects = [];
            console.warn('No section subjects returned');
        }
    } catch (error) {
        console.error('Error loading section subjects:', error);
        state.sectionSubjects = [];
    }

    // Load schedule slots
    try {
        if (state.sectionSubjects.length === 0) {
            state.scheduleSlots = [];
            console.log('No section subjects, skipping schedule slots');
        } else {
            const subjectIds = state.sectionSubjects.map(ss => ss.id);
            let allSlots = [];
            for (const ssId of subjectIds) {
                const response = await api.get(`${endpoints.scheduleSlots}?section_subject=${ssId}`);
                const slots = response?.results || response || [];
                allSlots = allSlots.concat(slots);
            }
            state.scheduleSlots = allSlots;
            console.log(`Loaded ${allSlots.length} schedule slots`);
        }
    } catch (error) {
        console.error('Error loading schedule slots:', error);
        state.scheduleSlots = [];
    }

    render();
}

function formatRole(role) {
    const roleNames = { 'ADMIN': 'Administrator', 'REGISTRAR': 'Registrar', 'HEAD_REGISTRAR': 'Head Registrar' };
    return roleNames[role] || role;
}

function formatTime(time) {
    if (!time) return 'N/A';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const [hour, minute] = parts;
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minute} ${ampm}`;
}

function getSlotPosition(startTime) {
    const [hour] = startTime.split(':').map(Number);
    return hour - 7; // 7am is row 0
}

function getSlotDuration(startTime, endTime) {
    if (!startTime || !endTime) return 1; // Default to 1 hour
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const start = startHour * 60 + startMin;
    const end = endHour * 60 + endMin;
    const duration = (end - start) / 60; // Duration in hours
    return duration > 0 ? duration : 1; // Ensure positive duration
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
      activePage: 'schedule',
      user: state.user
    })}
    
    <main class="max-w-full mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Schedule Editor</h1>
          <p class="text-gray-600 mt-1">Create and manage class schedules</p>
        </div>
        <div class="mt-4 md:mt-0 flex gap-4 items-center">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select id="section-select" class="form-input py-2" onchange="handleSectionChange()">
              <option value="">Select a section...</option>
              ${state.sections.map(s => `<option value="${s.id}" ${state.selectedSection?.id === s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
      
      ${state.selectedSection ? renderScheduleGrid() : renderSelectSectionPrompt()}
    </main>
    
    <!-- Modals -->
    ${state.showSlotModal ? renderSlotModal() : ''}
    ${state.showConflictModal ? renderConflictModal() : ''}
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
        <p class="mt-4 text-gray-600">Loading schedule...</p>
      </div>
    </div>
  `;
}

function renderSelectSectionPrompt() {
    return `
    <div class="card text-center py-20 max-w-lg mx-auto">
      <svg class="w-20 h-20 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <h3 class="text-2xl font-bold text-gray-600 mb-2">Select a Section</h3>
      <p class="text-gray-500">Choose a section from the dropdown to view and edit its schedule</p>
    </div>
  `;
}

function renderScheduleGrid() {
    return `
    <div class="space-y-6">
      <!-- Section Info & Legend -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="card flex-1 min-w-[300px]">
          <h2 class="text-xl font-bold text-gray-800 mb-2">${state.selectedSection.name} Schedule</h2>
          <p class="text-gray-600">${state.selectedSection.program?.code || ''} • Year ${state.selectedSection.year_level}</p>
        </div>
        
        <div class="card flex-1 min-w-[300px]">
          <h3 class="font-semibold text-gray-700 mb-3">Subjects Legend</h3>
          <div class="flex flex-wrap gap-2">
            ${state.sectionSubjects.map((ss, i) => `
              <span class="px-3 py-1 rounded-full text-xs font-medium border ${getSubjectColor(i)}">${ss.subject_code || ss.subject?.code || 'Unknown'}</span>
            `).join('')}
          </div>
        </div>
      </div>
      
      <!-- Schedule Grid -->
      <div class="card overflow-x-auto">
        <div class="min-w-[800px]">
          <!-- Grid Header -->
          <div class="grid grid-cols-7 border-b border-gray-200">
            <div class="p-3 bg-gray-50 font-semibold text-gray-700 text-center">Time</div>
            ${DAYS.map(day => `
              <div class="p-3 bg-gray-50 font-semibold text-gray-700 text-center">${day.name}</div>
            `).join('')}
          </div>
          
          <!-- Grid Body -->
          ${TIME_SLOTS.map((time, rowIndex) => `
            <div class="grid grid-cols-7 border-b border-gray-100">
              <div class="p-2 text-sm text-gray-500 text-center border-r border-gray-100">${formatTime(time)}</div>
              ${DAYS.map(day => {
        const slot = state.scheduleSlots.find(s =>
            s.day === day.code &&
            s.start_time === time
        );
        if (slot) {
            const ss = state.sectionSubjects.find(ss => ss.id === slot.section_subject);
            const colorIndex = state.sectionSubjects.findIndex(ss => ss.id === slot.section_subject);
            const duration = getSlotDuration(slot.start_time, slot.end_time);

            // Debug logging
            if (!slot.end_time) {
                console.warn('Slot missing end_time:', slot);
            }

            return `
                    <div class="p-1 relative" style="grid-row: span ${Math.ceil(duration)}">
                      <div onclick="editSlot('${slot.id}')" class="p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow h-full ${getSubjectColor(colorIndex)}" style="min-height: ${duration * 48}px">
                        <p class="font-semibold text-xs">${ss?.subject_code || ss?.subject?.code || 'N/A'}</p>
                        <p class="text-xs opacity-75">${formatTime(slot.start_time)}${slot.end_time ? ' - ' + formatTime(slot.end_time) : ''}</p>
                        <p class="text-xs opacity-75">${slot.room || 'No room'}</p>
                      </div>
                    </div>
                  `;
        }
        // Check if this cell is covered by a multi-hour slot
        const coveringSlot = state.scheduleSlots.find(s => {
            if (s.day !== day.code) return false;
            const slotStart = parseInt(s.start_time.split(':')[0]);
            const slotEnd = parseInt(s.end_time.split(':')[0]);
            const currentHour = parseInt(time.split(':')[0]);
            return currentHour > slotStart && currentHour < slotEnd;
        });
        if (coveringSlot) {
            return `<div class="p-1"></div>`; // Empty but covered cell
        }
        return `
                  <div class="p-1 border-r border-gray-50">
                    <div onclick="openSlotModal('${day.code}', '${time}')" class="h-12 rounded-lg border-2 border-dashed border-transparent hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-center">
                      <span class="text-gray-300 text-xl opacity-0 hover:opacity-100">+</span>
                    </div>
                  </div>
                `;
    }).join('')}
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Add Slot Button (Mobile) -->
      <div class="lg:hidden">
        <button onclick="openSlotModal()" class="btn-primary w-full">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Schedule Slot
        </button>
      </div>
    </div>
  `;
}

function renderSlotModal() {
    const isEdit = !!state.editingSlot;
    const slot = isEdit ? state.scheduleSlots.find(s => s.id === state.editingSlot) : {};

    return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeSlotModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">${isEdit ? 'Edit' : 'Add'} Schedule Slot</h2>
          <button onclick="closeSlotModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <form onsubmit="saveSlot(event)" class="p-6 space-y-4">
          <div>
            <label class="form-label">Subject *</label>
            <select id="slot-subject" class="form-input" required>
              <option value="">Select a subject...</option>
              ${state.sectionSubjects.map(ss => `
                <option value="${ss.id}" ${slot.section_subject === ss.id ? 'selected' : ''}>${ss.subject_code || ss.subject?.code || 'Unknown'} - ${ss.subject_title || ss.subject?.title || 'Unknown'}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Day *</label>
            <select id="slot-day" class="form-input" required>
              ${DAYS.map(d => `<option value="${d.code}" ${slot.day === d.code ? 'selected' : ''}>${d.name}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Start Time *</label>
              <select id="slot-start" class="form-input" required>
                ${TIME_SLOTS.map(t => `<option value="${t}" ${slot.start_time === t ? 'selected' : ''}>${formatTime(t)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">End Time *</label>
              <select id="slot-end" class="form-input" required>
                ${TIME_SLOTS.slice(1).map(t => `<option value="${t}" ${slot.end_time === t ? 'selected' : ''}>${formatTime(t)}</option>`).join('')}
                <option value="22:00" ${slot.end_time === '22:00' ? 'selected' : ''}>10:00 PM</option>
              </select>
            </div>
          </div>
          <div>
            <label class="form-label">Room *</label>
            <input type="text" id="slot-room" class="form-input" value="${slot.room || ''}" placeholder="Room 301, CL1, etc." required>
          </div>
          <div class="flex justify-between gap-3 pt-4">
            ${isEdit ? `<button type="button" onclick="deleteSlot('${slot.id}')" class="btn-secondary text-red-600 hover:bg-red-50">Delete</button>` : '<div></div>'}
            <div class="flex gap-3">
              <button type="button" onclick="closeSlotModal()" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary">${isEdit ? 'Update' : 'Add'} Slot</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderConflictModal() {
    return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeConflictModal()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b bg-red-50 rounded-t-2xl">
          <h2 class="text-xl font-bold text-red-800 flex items-center gap-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            Schedule Conflict Detected
          </h2>
        </div>
        <div class="p-6">
          <p class="text-gray-700 mb-4">${state.conflict || 'A scheduling conflict was detected.'}</p>
          
          <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
            <p class="text-sm text-yellow-800">You can override this conflict with a valid reason. This will be logged for audit purposes.</p>
          </div>
          
          <div>
            <label class="form-label">Override Reason *</label>
            <textarea id="override-reason" class="form-input" rows="3" placeholder="Enter reason for override..."></textarea>
          </div>
          
          <div class="flex justify-end gap-3 pt-4">
            <button onclick="closeConflictModal()" class="btn-secondary">Cancel</button>
            <button onclick="overrideConflict()" class="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors">
              Override & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Event Handlers
window.handleSectionChange = async function () {
    const sectionId = document.getElementById('section-select').value;
    if (sectionId) {
        await selectSection(sectionId);
    } else {
        state.selectedSection = null;
        state.sectionSubjects = [];
        state.scheduleSlots = [];
        render();
    }
};

window.openSlotModal = function (day = null, time = null) {
    state.editingSlot = null;
    state.showSlotModal = true;
    render();

    // Pre-fill day and time if provided
    if (day) {
        setTimeout(() => {
            const daySelect = document.getElementById('slot-day');
            if (daySelect) daySelect.value = day;
        }, 0);
    }
    if (time) {
        setTimeout(() => {
            const startSelect = document.getElementById('slot-start');
            if (startSelect) startSelect.value = time;
        }, 0);
    }
};

window.closeSlotModal = function () {
    state.showSlotModal = false;
    state.editingSlot = null;
    render();
};

window.editSlot = function (id) {
    state.editingSlot = id;
    state.showSlotModal = true;
    render();
};

window.saveSlot = async function (e) {
    e.preventDefault();

    const data = {
        section_subject: document.getElementById('slot-subject').value,
        day: document.getElementById('slot-day').value,
        start_time: document.getElementById('slot-start').value,
        end_time: document.getElementById('slot-end').value,
        room: document.getElementById('slot-room').value,
        override_conflict: false
    };

    // Validate time
    if (data.start_time >= data.end_time) {
        showToast('End time must be after start time', 'error');
        return;
    }

    // Debug logging
    console.log('Saving slot with data:', data);

    state.pendingSlotData = data;

    try {
        if (state.editingSlot) {
            // Update existing slot
            const response = await api.patch(endpoints.scheduleSlot(state.editingSlot), data);
            if (response && (response.ok || response.id)) {
                showToast('Schedule slot updated!', 'success');
                closeSlotModal();
                await selectSection(state.selectedSection.id);
                return;
            }
        } else {
            // Create new slot
            const response = await api.post(endpoints.scheduleSlots, data);
            if (response && (response.ok || response.id)) {
                showToast('Schedule slot added!', 'success');
                closeSlotModal();
                await selectSection(state.selectedSection.id);
                return;
            }
        }
    } catch (error) {
        console.error('Failed to save schedule slot:', error);
        const errorMessage = error?.error || error?.message || 'Failed to save schedule slot. Please try again.';
        showToast(errorMessage, 'error');
    }
};

window.deleteSlot = async function (id) {
    if (!confirm('Delete this schedule slot?')) return;

    try {
        const response = await api.delete(endpoints.scheduleSlot(id));
        if (response && response.ok) {
            showToast('Schedule slot deleted!', 'success');
            closeSlotModal();
            await selectSection(state.selectedSection.id);
        } else {
            const error = await response?.json();
            showToast(error?.detail || 'Failed to delete schedule slot', 'error');
        }
    } catch (error) {
        console.error('Failed to delete schedule slot:', error);
        showToast('Failed to delete schedule slot. Please try again.', 'error');
    }
};

window.closeConflictModal = function () {
    state.showConflictModal = false;
    state.conflict = null;
    state.pendingSlotData = null;
    render();
};

window.overrideConflict = async function () {
    const reason = document.getElementById('override-reason').value;
    if (!reason.trim()) {
        showToast('Please enter a reason for the override', 'error');
        return;
    }

    const data = { ...state.pendingSlotData, override_conflict: true, override_reason: reason };

    try {
        const response = await api.post(endpoints.scheduleSlots, data);
        if (response && response.ok) {
            showToast('Schedule slot added with override!', 'success');
            closeConflictModal();
            closeSlotModal();
            await selectSection(state.selectedSection.id);
        } else {
            const error = await response?.json();
            showToast(error?.detail || 'Failed to override conflict', 'error');
        }
    } catch (error) {
        console.error('Failed to override conflict:', error);
        showToast('Failed to override conflict. Please try again.', 'error');
    }
};

window.logout = function () {
    TokenManager.clearTokens();
    showToast('Logged out successfully', 'success');
    setTimeout(() => window.location.href = '/login.html', 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
