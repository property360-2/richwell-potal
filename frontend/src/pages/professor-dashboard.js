/**
 * Professor Dashboard Page
 * 
 * Refactored to use modular components from the atomic architecture.
 */
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

// Import modular components
import { renderScheduleGrid, DAYS, formatTime } from '../organisms/tables/ScheduleGrid.js';
import { renderEmptyState } from '../organisms/layout/EmptyState.js';
import { renderBadge } from '../atoms/badges/Badge.js';
import { Icon } from '../atoms/icons/Icon.js';

// State
const state = {
    user: null,
    activeSemester: null,
    schedule: null,
    assignedSections: [],
    loading: true
};

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    if (!requireAuth()) return;
    await loadUserProfile();
    await loadActiveSemester();
    if (state.activeSemester && state.user) {
        await loadSchedule();
    }
    state.loading = false;
    render();
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            const userData = response.data || response;
            state.user = userData;
            TokenManager.setUser(userData);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile');
    }
}

async function loadActiveSemester() {
    try {
        const response = await api.get(endpoints.semesters);
        const semesters = response?.semesters || response?.results || response || [];
        state.activeSemester = semesters.find(s => s.is_current) || semesters[0];
    } catch (error) {
        ErrorHandler.handle(error, 'Loading semesters');
    }
}

async function loadSchedule() {
    try {
        if (!state.user || !state.user.id) {
            console.warn('User ID missing, skipping schedule load');
            state.schedule = {};
            state.assignedSections = [];
            return;
        }

        const response = await api.get(`/academics/professor/${state.user.id}/schedule/${state.activeSemester.id}/`);
        state.schedule = response?.schedule || {};
        state.assignedSections = response?.assigned_sections || [];
    } catch (error) {
        if (error.message && error.message.includes('404')) {
            state.schedule = {};
            state.assignedSections = [];
        } else {
            ErrorHandler.handle(error, 'Loading schedule');
            state.schedule = {};
            state.assignedSections = [];
        }
    }
}

// ============================================================
// MAIN RENDER
// ============================================================

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading dashboard...');
        return;
    }

    app.innerHTML = `
    ${createHeader({
        role: 'PROFESSOR',
        activePage: 'dashboard',
        user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Professor Dashboard</h1>
        <p class="text-gray-600 mt-1">
          ${state.activeSemester ? `Semester: ${state.activeSemester.name} ${state.activeSemester.academic_year}` : 'No active semester'}
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column: Assignments & Qualifications -->
        <div class="lg:col-span-1 flex flex-col gap-8">
          ${renderAssignedSections()}
          ${renderQualifiedSubjects()}
        </div>

        <!-- Schedule Grid -->
        <div class="lg:col-span-2">
          ${renderProfessorSchedule()}
        </div>
      </div>
    </main>
  `;
}

// ============================================================
// RENDER COMPONENTS
// ============================================================

function renderQualifiedSubjects() {
    const subjects = state.user?.professor_profile?.assigned_subjects || [];

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 class="font-bold text-gray-800">My Qualified Subjects</h3>
        ${renderBadge({ text: String(subjects.length), color: 'secondary', size: 'sm' })}
      </div>
      <div class="divide-y divide-gray-100 overflow-y-auto max-h-[400px]">
        ${subjects.length === 0 ? `
          <div class="p-6 text-center">
            <p class="text-gray-500 text-sm">No qualified subjects assigned yet.</p>
          </div>
        ` : subjects.map(sub => `
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-blue-600 text-sm">${sub.code}</p>
                <p class="font-medium text-gray-800 text-sm">${sub.title}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAssignedSections() {
    const sections = state.assignedSections || [];

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
      <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 class="font-bold text-gray-800">My Assigned Sections</h3>
        ${renderBadge({ text: String(sections.length), color: 'primary', size: 'sm' })}
      </div>
      <div class="divide-y divide-gray-100 overflow-y-auto max-h-[600px]">
        ${sections.length === 0 ? `
          <div class="p-8 text-center flex flex-col items-center justify-center h-48">
            <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
              ${Icon('folder', { size: 'lg', className: 'text-gray-400' })}
            </div>
            <h4 class="text-gray-900 font-medium mb-1">No Assigned Sections</h4>
            <p class="text-gray-500 text-xs">Assigned sections will appear here.</p>
          </div>
        ` : sections.map(sec => `
          <div class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex flex-col gap-1">
              <div class="flex items-center justify-between">
                ${renderBadge({ text: sec.section_name, color: 'primary', size: 'sm' })}
                ${sec.is_tba ? renderBadge({ text: 'TBA', color: 'warning', size: 'sm' }) : ''}
              </div>
              
              <div class="mt-1">
                <div class="text-sm font-bold text-gray-900">${sec.subject_code}</div>
                <div class="text-xs text-gray-500 truncate" title="${sec.subject_title}">${sec.subject_title}</div>
              </div>

              <div class="flex items-start gap-2 mt-2 text-xs text-gray-600">
                ${Icon('clock', { size: 'sm', className: 'text-gray-400 shrink-0 mt-0.5' })}
                <span>${sec.schedule || 'Schedule not set'}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderProfessorSchedule() {
    const schedule = state.schedule || {};
    const isEmpty = Object.keys(schedule).length === 0 || Object.values(schedule).every(arr => arr.length === 0);

    if (isEmpty) {
        return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 class="font-bold text-gray-800">My Teaching Schedule</h3>
        </div>
        ${renderEmptyState({
            icon: 'calendar',
            title: 'No schedule assigned yet',
            message: 'Please contact the registrar for your teaching assignments.'
        })}
      </div>
    `;
    }

    // Convert schedule format from { MON: [slots], TUE: [slots] } to flat array for ScheduleGrid
    const slots = [];
    Object.entries(schedule).forEach(([dayCode, daySlots]) => {
        if (Array.isArray(daySlots)) {
            daySlots.forEach(slot => {
                slots.push({
                    id: slot.id || `${dayCode}-${slot.start_time}`,
                    day: dayCode,
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    subject_code: slot.subject_code,
                    subject_title: slot.subject_title,
                    room: slot.room,
                    section: slot.section
                });
            });
        }
    });

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 class="font-bold text-gray-800">My Teaching Schedule</h3>
      </div>
      <div class="p-4">
        ${renderScheduleGrid({
        slots,
        mode: 'view',
        showDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
        emptyMessage: 'No schedule slots found'
    })}
      </div>
    </div>
  `;
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

document.addEventListener('DOMContentLoaded', init);

window.logout = function () {
    TokenManager.clearTokens();
    window.location.href = '/login.html';
};
