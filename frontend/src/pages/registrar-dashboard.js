import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  stats: {
    totalStudents: 0,
    pendingCOR: 0,
    pendingOverride: 0,
    incStudents: 0
  },
  recentStudents: []
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadStudents();
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

async function loadStudents() {
  try {
    // Fetch enrolled students using cashier search endpoint
    const response = await api.get(endpoints.cashierStudentSearch);
    const students = response?.results || response || [];

    console.log('Dashboard students response:', students);

    // Transform to dashboard format
    state.recentStudents = students.slice(0, 10).map(s => ({
      id: s.id || s.enrollment_id,
      student_number: s.student_number || 'N/A',
      name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
      program: s.program_code || s.program?.code || 'N/A',
      year_level: s.year_level || 1,
      status: 'complete',  // Default to complete since we don't have INC data yet
      inc_count: 0
    }));

    // Update stats with real count
    state.stats.totalStudents = students.length;
    state.stats.pendingCOR = students.length;  // All enrolled students can print COR

    console.log(`Loaded ${state.recentStudents.length} students for dashboard`);
  } catch (error) {
    console.error('Failed to load students:', error);
    state.recentStudents = [];
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
      role: 'REGISTRAR',
      activePage: 'registrar-dashboard',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Welcome, ${state.user?.first_name || 'Registrar'}!</h1>
        <p class="text-gray-600 mt-1">Manage student records, COR printing, and enrollments</p>
      </div>
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        ${renderStatCard('Total Students', state.stats.totalStudents, 'blue', 'users', '/registrar-documents.html')}
        ${renderStatCard('COR Requests', state.stats.pendingCOR, 'green', 'document', '/registrar-documents.html')}
        ${renderStatCard('Override Pending', state.stats.pendingOverride, 'yellow', 'clipboard', '/registrar-enrollment.html')}
        ${renderStatCard('Students with INC', state.stats.incStudents, 'orange', 'alert', '/registrar-documents.html')}
      </div>
      
      <!-- Quick Actions -->
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <!-- Document Release Card -->
        <a href="/registrar-documents.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-blue-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">Document Release</h3>
              <p class="text-gray-600 text-sm mt-1">Release official documents (COR, TOR, etc.) for students.</p>
              <span class="inline-flex items-center gap-1 text-blue-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>

        <!-- Subject Management Card -->
        <a href="/registrar-subjects.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-purple-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Subject Management</h3>
              <p class="text-gray-600 text-sm mt-1">Manage subjects, units, year levels, and prerequisites.</p>
              <span class="inline-flex items-center gap-1 text-purple-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>
        
        <!-- Semester Management Card -->
        <a href="/registrar-semesters.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-orange-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-orange-600 transition-colors">Semester Management</h3>
              <p class="text-gray-600 text-sm mt-1">Manage academic semesters and enrollment periods.</p>
              <span class="inline-flex items-center gap-1 text-orange-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>

        <!-- Override Enrollment Card -->
        <a href="/registrar-enrollment.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-green-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-green-600 transition-colors">Override Enrollment</h3>
              <p class="text-gray-600 text-sm mt-1">Manually enroll students in subjects. Override prerequisites and capacity.</p>
              <span class="inline-flex items-center gap-1 text-green-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>

        <!-- Section Management Card -->
        <a href="/sections.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-teal-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-teal-600 transition-colors">Section Management</h3>
              <p class="text-gray-600 text-sm mt-1">Create sections, assign subjects and professors.</p>
              <span class="inline-flex items-center gap-1 text-teal-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>

        <!-- Schedule Management Card -->
        <a href="/schedule.html" class="card hover:shadow-xl transition-all group cursor-pointer border-2 border-transparent hover:border-violet-200">
          <div class="flex items-start gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800 group-hover:text-violet-600 transition-colors">Schedule Management</h3>
              <p class="text-gray-600 text-sm mt-1">Set up class schedules for sections and manage timetables.</p>
              <span class="inline-flex items-center gap-1 text-violet-600 text-sm font-medium mt-2">
                Open <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </span>
            </div>
          </div>
        </a>
      </div>

      <!-- Recent Students Table -->
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">Recent Students</h2>
          <a href="/registrar-cor.html" class="text-blue-600 hover:text-blue-800 text-sm font-medium">View All →</a>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Year</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${state.recentStudents.map(student => `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        ${student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p class="font-medium text-gray-800">${student.name}</p>
                        <p class="text-xs text-gray-500">${student.student_number}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-gray-700">${student.program}</td>
                  <td class="px-4 py-3 text-center text-gray-700">Year ${student.year_level}</td>
                  <td class="px-4 py-3 text-center">
                    ${student.status === 'has_inc' ?
      `<span class="badge badge-warning">${student.inc_count} INC</span>` :
      '<span class="badge badge-success">Complete</span>'
    }
                  </td>
                  <td class="px-4 py-3 text-center">
                    <a href="/registrar-documents.html" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Release Docs</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  `;
}

function renderStatCard(label, value, color, icon, link) {
  const colors = {
    blue: 'from-blue-400 to-blue-600',
    green: 'from-green-400 to-emerald-600',
    yellow: 'from-yellow-400 to-orange-500',
    orange: 'from-orange-400 to-red-500'
  };

  const icons = {
    users: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>`,
    document: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>`,
    clipboard: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>`,
    alert: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>`
  };

  return `
    <a href="${link}" class="card relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
      <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colors[color]} opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icons[icon]}
          </svg>
        </div>
        <div>
          <p class="text-3xl font-bold text-gray-800">${value}</p>
          <p class="text-sm text-gray-500">${label}</p>
        </div>
      </div>
    </a>
  `;
}

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
