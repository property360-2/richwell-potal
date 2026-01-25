
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

const DAYS = [
    { code: 'MON', name: 'Monday', short: 'Mon' },
    { code: 'TUE', name: 'Tuesday', short: 'Tue' },
    { code: 'WED', name: 'Wednesday', short: 'Wed' },
    { code: 'THU', name: 'Thursday', short: 'Thu' },
    { code: 'FRI', name: 'Friday', short: 'Fri' },
    { code: 'SAT', name: 'Saturday', short: 'Sat' },
    { code: 'SUN', name: 'Sunday', short: 'Sun' }
];

const state = {
    user: null,
    activeSemester: null,
    schedule: null,
    assignedSections: [],
    loading: true
};

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

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            // Handle inconsistent API response structure (wrapped vs unwrapped)
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

        // professor_id is user.id
        const response = await api.get(`/academics/professor/${state.user.id}/schedule/${state.activeSemester.id}/`);
        state.schedule = response?.schedule || {};
        state.assignedSections = response?.assigned_sections || [];
    } catch (error) {
        if (error.message && error.message.includes('404')) {
            // No schedule found is a valid state for new professors
            state.schedule = {};
            state.assignedSections = [];
        } else {
            ErrorHandler.handle(error, 'Loading schedule');
            state.schedule = {};
            state.assignedSections = [];
        }
    }
}

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

        <!-- Schedule Table -->
        <div class="lg:col-span-2">
            ${renderScheduleTable()}
        </div>
      </div>
    </main>
  `;
}

function renderQualifiedSubjects() {
    // These are the subjects the professor is qualified/eligible to teach (from profile)
    const subjects = state.user?.professor_profile?.assigned_subjects || [];

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 class="font-bold text-gray-800">My Qualified Subjects</h3>
        <span class="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">${subjects.length}</span>
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
        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">${sections.length}</span>
      </div>
      <div class="divide-y divide-gray-100 overflow-y-auto max-h-[600px]">
        ${sections.length === 0 ? `
            <div class="p-8 text-center flex flex-col items-center justify-center h-48">
                <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <h4 class="text-gray-900 font-medium mb-1">No Assigned Sections</h4>
                <p class="text-gray-500 text-xs">Assigned sections will appear here.</p>
            </div>
        ` : sections.map(sec => `
            <div class="p-4 hover:bg-gray-50 transition-colors">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center justify-between">
                         <span class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            ${sec.section_name}
                        </span>
                        ${sec.is_tba ? '<span class="text-xs font-bold text-amber-600 border border-amber-200 bg-amber-50 px-2 py-0.5 rounded">TBA</span>' : ''}
                    </div>
                    
                    <div class="mt-1">
                        <div class="text-sm font-bold text-gray-900">${sec.subject_code}</div>
                        <div class="text-xs text-gray-500 truncate" title="${sec.subject_title}">${sec.subject_title}</div>
                    </div>

                    <div class="flex items-start gap-2 mt-2 text-xs text-gray-600">
                        <svg class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>${sec.schedule || 'Schedule not set'}</span>
                    </div>
                </div>
            </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderScheduleTable() {
    const schedule = state.schedule || {};
    const isEmpty = Object.keys(schedule).length === 0 || Object.values(schedule).every(arr => arr.length === 0);

    return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <h3 class="font-bold text-gray-800">My Teaching Schedule</h3>
      </div>
      
      ${isEmpty ? `
        <div class="p-12 text-center">
            <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
            </div>
            <h4 class="text-lg font-bold text-gray-700 mb-2">No schedule assigned yet</h4>
            <p class="text-gray-500">Please contact the registrar for your teaching assignments.</p>
        </div>
      ` : `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Day</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Section</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Room</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${renderScheduleRows(schedule)}
                </tbody>
            </table>
        </div>
      `}
    </div>
  `;
}

function renderScheduleRows(schedule) {
    // schedule is expected to be { 'MON': [slot, ...], 'TUE': ... }
    const rows = [];

    // Sort days
    const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    dayOrder.forEach(dayCode => {
        const daySlots = schedule[dayCode];
        if (daySlots && daySlots.length > 0) {
            // Sort slots by time
            daySlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

            daySlots.forEach(slot => {
                rows.push(`
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ${dayCode}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="text-sm font-bold text-gray-900">${slot.subject_code}</div>
                            <div class="text-xs text-gray-500">${slot.subject_title}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span class="px-2 py-1 bg-gray-100 rounded text-gray-800 font-medium">${slot.section}</span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                            ${slot.room || 'TBA'}
                        </td>
                    </tr>
                `);
            });
        }
    });

    return rows.join('');
}

function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
window.logout = function () {
    TokenManager.clearTokens();
    window.location.href = '/login.html';
};
