import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';

// State
const state = {
  user: null,
  schedule: [],
  semesters: [],
  activeSemester: null,
  loading: true
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

// Mock data
const MOCK_SCHEDULE = [
  { id: '1', section: { name: 'BSIT-1A' }, subject: { code: 'IT101', title: 'Introduction to Computing' }, day: 'MON', start_time: '08:00', end_time: '09:30', room: 'Room 301' },
  { id: '2', section: { name: 'BSIT-1B' }, subject: { code: 'IT101', title: 'Introduction to Computing' }, day: 'MON', start_time: '10:00', end_time: '11:30', room: 'Room 301' },
  { id: '3', section: { name: 'BSIT-1A' }, subject: { code: 'IT101', title: 'Introduction to Computing' }, day: 'WED', start_time: '08:00', end_time: '09:30', room: 'Room 301' },
  { id: '4', section: { name: 'BSIT-1B' }, subject: { code: 'IT101', title: 'Introduction to Computing' }, day: 'WED', start_time: '10:00', end_time: '11:30', room: 'Room 301' },
  { id: '5', section: { name: 'BSCS-1A' }, subject: { code: 'CS101', title: 'Intro to Computer Science' }, day: 'TUE', start_time: '13:00', end_time: '14:30', room: 'CL1' },
  { id: '6', section: { name: 'BSCS-1A' }, subject: { code: 'CS101', title: 'Intro to Computer Science' }, day: 'THU', start_time: '13:00', end_time: '14:30', room: 'CL1' }
];

const MOCK_SEMESTERS = [
  { id: '1', name: '1st Semester 2024-2025', is_active: true }
];

// Color palette
const COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800'
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
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    state.semesters = response?.results || response || MOCK_SEMESTERS;
    state.activeSemester = state.semesters.find(s => s.is_active) || state.semesters[0];
  } catch (error) {
    state.semesters = MOCK_SEMESTERS;
    state.activeSemester = MOCK_SEMESTERS[0];
  }
}

async function loadSchedule() {
  if (!state.user?.id || !state.activeSemester?.id) {
    state.schedule = MOCK_SCHEDULE;
    return;
  }

  try {
    const response = await api.get(endpoints.professorSchedule(state.user.id, state.activeSemester.id));
    state.schedule = response?.results || response || MOCK_SCHEDULE;
  } catch (error) {
    state.schedule = MOCK_SCHEDULE;
  }
}

function formatTime(time) {
  const [hour, minute] = time.split(':');
  const h = parseInt(hour);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minute} ${ampm}`;
}

function getScheduleForDay(day) {
  return state.schedule.filter(s => s.day === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

function getTotalHours() {
  let totalMinutes = 0;
  state.schedule.forEach(slot => {
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
  });
  return Math.round(totalMinutes / 60 * 10) / 10;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  const uniqueSubjects = [...new Set(state.schedule.map(s => s.subject?.code))];
  const uniqueSections = [...new Set(state.schedule.map(s => s.section?.name))];

  app.innerHTML = `
    ${renderHeader()}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">My Teaching Schedule</h1>
          <p class="text-gray-600 mt-1">${state.activeSemester?.name || 'Current Semester'}</p>
        </div>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="card text-center">
          <p class="text-3xl font-bold text-blue-600">${state.schedule.length}</p>
          <p class="text-sm text-gray-500">Total Classes</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-green-600">${uniqueSubjects.length}</p>
          <p class="text-sm text-gray-500">Subjects</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-purple-600">${uniqueSections.length}</p>
          <p class="text-sm text-gray-500">Sections</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-orange-600">${getTotalHours()}</p>
          <p class="text-sm text-gray-500">Hours/Week</p>
        </div>
      </div>
      
      <!-- Weekly Schedule Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${DAYS.map(day => {
    const daySchedule = getScheduleForDay(day.code);
    return `
            <div class="card">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-gray-800">${day.name}</h2>
                <span class="badge badge-info">${daySchedule.length} class${daySchedule.length !== 1 ? 'es' : ''}</span>
              </div>
              ${daySchedule.length > 0 ? `
                <div class="space-y-3">
                  ${daySchedule.map(slot => `
                    <div class="p-4 rounded-xl border-l-4 ${getSubjectColor(slot.subject?.code)}">
                      <div class="flex items-start justify-between">
                        <div>
                          <p class="font-bold">${slot.subject?.code}</p>
                          <p class="text-sm opacity-80">${slot.subject?.title}</p>
                        </div>
                        <span class="text-xs font-medium opacity-70">${slot.section?.name}</span>
                      </div>
                      <div class="flex items-center gap-4 mt-3 text-sm opacity-70">
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}
                        </span>
                        <span class="flex items-center gap-1">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          ${slot.room}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="py-8 text-center text-gray-400">
                  <svg class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                  </svg>
                  <p>No classes</p>
                </div>
              `}
            </div>
          `;
  }).join('')}
      </div>
      
      <!-- Subjects Legend -->
      <div class="card mt-8">
        <h3 class="font-bold text-gray-800 mb-4">My Subjects</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${uniqueSubjects.map(code => {
    const subjectSlots = state.schedule.filter(s => s.subject?.code === code);
    const subject = subjectSlots[0]?.subject;
    const sections = [...new Set(subjectSlots.map(s => s.section?.name))];
    return `
              <div class="flex items-center gap-3 p-3 rounded-xl ${getSubjectColor(code)}">
                <div class="w-10 h-10 rounded-lg bg-white/50 flex items-center justify-center font-bold">${code?.slice(0, 2)}</div>
                <div>
                  <p class="font-semibold">${code}</p>
                  <p class="text-xs opacity-70">${sections.join(', ')}</p>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      </div>
    </main>
  `;
}

function renderHeader() {
  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2">Professor</span>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">Prof. ${state.user?.first_name || ''} ${state.user?.last_name || ''}</p>
            <p class="text-xs text-gray-500">${state.user?.email || ''}</p>
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

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = '/login.html', 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
