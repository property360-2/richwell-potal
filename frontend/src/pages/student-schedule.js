import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
  user: null,
  schedule: [],
  enrolledSubjects: [],
  semesters: [],
  activeSemester: null,
  loading: true,
  viewMode: 'grid' // 'grid' or 'list'
};

// Constants
const DAYS = [
  { code: 'MON', name: 'Monday', short: 'Mon' },
  { code: 'TUE', name: 'Tuesday', short: 'Tue' },
  { code: 'WED', name: 'Wednesday', short: 'Wed' },
  { code: 'THU', name: 'Thursday', short: 'Thu' },
  { code: 'FRI', name: 'Friday', short: 'Fri' },
  { code: 'SAT', name: 'Saturday', short: 'Sat' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
  TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

// Color palette for subjects
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

function getSubjectColor(subjectCode) {
  const codes = [...new Set(state.schedule.map(s => s.subject?.code))];
  const index = codes.indexOf(subjectCode);
  return COLORS[index % COLORS.length];
}

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadSemesters();
  await loadSchedule();

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

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    state.semesters = response?.semesters || response?.results || response || [];
    state.activeSemester = state.semesters.find(s => s.is_active || s.is_current) || state.semesters[0];
  } catch (error) {
    console.error('Failed to load semesters:', error);
  }
}

async function loadSchedule() {
  if (!state.user?.id || !state.activeSemester?.id) {
    state.schedule = [];
    return;
  }

  try {
    // Load enrolled subjects with schedule information
    const response = await api.get(endpoints.myEnrollments);
    console.log('My enrollments response:', response);

    if (response?.data?.subject_enrollments) {
      const enrollments = response.data.subject_enrollments;

      // Transform enrollments into schedule slots
      state.schedule = [];
      enrollments.forEach(enrollment => {
        if (enrollment.section && enrollment.section.section_subjects) {
          enrollment.section.section_subjects.forEach(sectionSubject => {
            if (sectionSubject.schedule_slots && Array.isArray(sectionSubject.schedule_slots)) {
              sectionSubject.schedule_slots.forEach(slot => {
                state.schedule.push({
                  id: slot.id,
                  day: slot.day,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  room: slot.room,
                  subject: {
                    code: enrollment.subject.code,
                    title: enrollment.subject.title || enrollment.subject.name
                  },
                  section: enrollment.section,
                  professor: sectionSubject.professor
                });
              });
            }
          });
        }
      });

      state.enrolledSubjects = enrollments;
    }
  } catch (error) {
    console.error('Failed to load schedule:', error);
    showToast('Failed to load your schedule', 'error');
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
      role: 'STUDENT',
      activePage: 'student-schedule',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">My Class Schedule</h1>
            <p class="text-gray-600 mt-1">${state.activeSemester?.name || 'Current Semester'}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- View Mode Toggle -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-1 flex gap-1">
              <button
                onclick="setViewMode('grid')"
                class="px-4 py-2 rounded-lg transition-colors ${state.viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
              </button>
              <button
                onclick="setViewMode('list')"
                class="px-4 py-2 rounded-lg transition-colors ${state.viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      ${state.schedule.length === 0 ? renderEmptyState() : ''}
      ${state.viewMode === 'grid' && state.schedule.length > 0 ? renderGridView() : ''}
      ${state.viewMode === 'list' && state.schedule.length > 0 ? renderListView() : ''}

      <!-- Subject Legend -->
      ${state.schedule.length > 0 ? renderSubjectLegend() : ''}
    </main>
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
        <p class="mt-4 text-gray-600">Loading your schedule...</p>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="card text-center py-16">
      <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-700 mb-2">No Schedule Yet</h3>
      <p class="text-gray-500 mb-6">You haven't enrolled in any subjects for this semester.</p>
      <a href="/subject-enrollment.html" class="btn-primary inline-flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
        Enroll in Subjects
      </a>
    </div>
  `;
}

function renderGridView() {
  return `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-gray-50">
              <th class="border border-gray-200 px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase sticky left-0 bg-gray-50 z-10">Time</th>
              ${DAYS.map(day => `
                <th class="border border-gray-200 px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase min-w-[140px]">${day.short}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${TIME_SLOTS.map(timeSlot => `
              <tr>
                <td class="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 sticky left-0 z-10">${formatTime(timeSlot)}</td>
                ${DAYS.map(day => renderGridCell(day.code, timeSlot)).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderGridCell(day, timeSlot) {
  const slots = state.schedule.filter(s => {
    if (s.day !== day) return false;
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const startHour = parseInt(s.start_time.split(':')[0]);
    const endHour = parseInt(s.end_time.split(':')[0]);
    return slotHour >= startHour && slotHour < endHour;
  });

  if (slots.length === 0) {
    return `<td class="border border-gray-200 px-3 py-2 text-sm text-gray-400 text-center bg-white"></td>`;
  }

  const slot = slots[0];
  const color = getSubjectColor(slot.subject.code);
  const isFirstSlot = timeSlot === slot.start_time;

  if (!isFirstSlot) {
    return `<td class="border-0"></td>`;
  }

  const duration = calculateDuration(slot.start_time, slot.end_time);

  return `
    <td class="border border-gray-200 px-2 py-2 align-top" rowspan="${duration}">
      <div class="rounded-lg border-l-4 p-3 h-full ${color}">
        <div class="font-bold text-sm mb-1">${slot.subject.code}</div>
        <div class="text-xs mb-2 line-clamp-2">${slot.subject.title}</div>
        <div class="text-xs opacity-90">
          <div>${slot.start_time} - ${slot.end_time}</div>
          ${slot.room ? `<div>${slot.room}</div>` : ''}
          ${slot.professor ? `<div class="mt-1">Prof. ${slot.professor.first_name} ${slot.professor.last_name}</div>` : ''}
        </div>
      </div>
    </td>
  `;
}

function renderListView() {
  const groupedByDay = {};
  DAYS.forEach(day => {
    groupedByDay[day.code] = state.schedule.filter(s => s.day === day.code).sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  });

  return `
    <div class="space-y-6">
      ${DAYS.map(day => {
        const daySchedule = groupedByDay[day.code];
        if (daySchedule.length === 0) return '';

        return `
          <div class="card">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                ${day.short}
              </div>
              ${day.name}
            </h3>
            <div class="space-y-3">
              ${daySchedule.map(slot => {
                const color = getSubjectColor(slot.subject.code);
                return `
                  <div class="flex items-start gap-4 p-4 rounded-xl border-l-4 ${color}">
                    <div class="flex-1">
                      <div class="font-bold text-gray-800">${slot.subject.code} - ${slot.subject.title}</div>
                      <div class="text-sm text-gray-600 mt-1">
                        <span class="font-medium">${slot.start_time} - ${slot.end_time}</span>
                        ${slot.room ? ` • ${slot.room}` : ''}
                        ${slot.section?.name ? ` • Section ${slot.section.name}` : ''}
                      </div>
                      ${slot.professor ? `
                        <div class="text-sm text-gray-500 mt-1">
                          Prof. ${slot.professor.first_name} ${slot.professor.last_name}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSubjectLegend() {
  const uniqueSubjects = [...new Map(state.schedule.map(s => [s.subject.code, s.subject])).values()];

  return `
    <div class="card mt-8">
      <h3 class="text-lg font-bold text-gray-800 mb-4">Enrolled Subjects</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        ${uniqueSubjects.map(subject => {
          const color = getSubjectColor(subject.code);
          return `
            <div class="flex items-center gap-3 p-3 rounded-lg border-l-4 ${color}">
              <div class="flex-1">
                <div class="font-bold text-sm">${subject.code}</div>
                <div class="text-xs opacity-90">${subject.title}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Helper functions
function formatTime(time24) {
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function calculateDuration(startTime, endTime) {
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return end - start;
}

// Global functions
window.setViewMode = function(mode) {
  state.viewMode = mode;
  render();
};

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
