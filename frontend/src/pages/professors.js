import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';

const state = {
  user: null,
  professors: [],
  semesters: [],
  activeSemester: null,
  selectedProfessor: null,
  workloadData: null,
  loading: true,
  showAddModal: false,
  showWorkloadModal: false
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadSemesters();
  await loadProfessors();
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

async function loadProfessors() {
  try {
    const response = await api.get('/academics/professors/');
    state.professors = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load professors:', error);
    showToast('Failed to load professors', 'error');
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
      role: 'REGISTRAR',
      activePage: 'professors',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-800">Professor Management</h1>
            <p class="text-gray-600 mt-1">Manage professors and teaching assignments</p>
          </div>
        </div>
      </div>

      ${state.professors.length === 0 ? renderEmptyState() : renderProfessorList()}
    </main>

    ${state.showWorkloadModal ? renderWorkloadModal() : ''}
  `;
}

function renderProfessorList() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${state.professors.map(prof => renderProfessorCard(prof)).join('')}
    </div>
  `;
}

function renderProfessorCard(prof) {
  const teachingLoad = prof.teaching_load || {};

  return `
    <div class="card hover:shadow-lg transition-shadow">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span class="text-blue-600 font-bold text-lg">
              ${prof.full_name?.charAt(0) || 'P'}
            </span>
          </div>
          <div>
            <h3 class="font-bold text-gray-800">${prof.full_name || 'Unknown'}</h3>
            <p class="text-sm text-gray-500">${prof.email || ''}</p>
          </div>
        </div>
      </div>

      <div class="space-y-2 mb-4">
        <div class="text-sm text-gray-600">
          <span class="font-medium">Teaching Load:</span>
          ${teachingLoad && teachingLoad.total_subjects !== undefined ? `
            <div class="mt-1">
              <div>${teachingLoad.total_subjects} subject${teachingLoad.total_subjects !== 1 ? 's' : ''}</div>
              <div>${teachingLoad.total_sections} section${teachingLoad.total_sections !== 1 ? 's' : ''}</div>
              <div class="${teachingLoad.is_overloaded ? 'text-red-600 font-bold' : ''}">
                ${teachingLoad.total_hours_per_week} hrs/week
                ${teachingLoad.is_overloaded ? ' ⚠️ Overloaded' : ''}
              </div>
            </div>
          ` : '<div class="mt-1 text-gray-400">No assignments</div>'}
        </div>
      </div>

      <button onclick="viewWorkload('${prof.id}')" class="btn-secondary w-full text-sm">
        View Detailed Workload
      </button>
    </div>
  `;
}

function renderWorkloadModal() {
  if (!state.workloadData) {
    return `
      <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
          <p>Loading workload data...</p>
        </div>
      </div>
    `;
  }

  const data = state.workloadData;

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
         onclick="closeWorkloadModal()">
      <div class="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
           onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">
            Professor Workload - ${data.professor_name}
          </h3>
          <button onclick="closeWorkloadModal()" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="card bg-blue-50">
            <div class="text-3xl font-bold text-blue-600">${data.total_sections}</div>
            <div class="text-sm text-gray-600">Sections</div>
          </div>
          <div class="card bg-green-50">
            <div class="text-3xl font-bold text-green-600">${data.total_subjects}</div>
            <div class="text-sm text-gray-600">Subjects</div>
          </div>
          <div class="card ${data.is_overloaded ? 'bg-red-50' : 'bg-purple-50'}">
            <div class="text-3xl font-bold ${data.is_overloaded ? 'text-red-600' : 'text-purple-600'}">
              ${data.total_hours_per_week} hrs
            </div>
            <div class="text-sm text-gray-600">Per Week</div>
          </div>
        </div>

        ${data.is_overloaded ? `
          <div class="bg-red-50 border-l-4 border-red-600 p-4 mb-6">
            <p class="text-red-800 font-bold">⚠️ Warning: Professor is overloaded!</p>
          </div>
        ` : ''}

        <h4 class="font-bold text-gray-800 mb-4">Teaching Assignments</h4>
        <div class="space-y-2">
          ${data.sections_detail && data.sections_detail.length > 0 ? data.sections_detail.map(detail => `
            <div class="border rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-bold text-gray-800">
                    ${detail.subject_code} - ${detail.subject_title}
                  </div>
                  <div class="text-sm text-gray-600">
                    Section: ${detail.section}
                    ${detail.is_primary ? '<span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Primary</span>' : ''}
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-gray-700">${detail.hours_per_week} hrs/week</div>
                </div>
              </div>
            </div>
          `).join('') : '<p class="text-gray-500 text-center py-4">No teaching assignments</p>'}
        </div>

        <div class="mt-6 flex justify-end">
          <button onclick="closeWorkloadModal()" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="card text-center py-16">
      <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-700 mb-2">No Professors Yet</h3>
      <p class="text-gray-500 mb-6">Professors will appear here once they are added to the system.</p>
    </div>
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
        <p class="mt-4 text-gray-600">Loading professors...</p>
      </div>
    </div>
  `;
}

// Global functions
window.viewWorkload = async function(professorId) {
  state.showWorkloadModal = true;
  state.workloadData = null;
  render();

  try {
    const data = await api.get(`/academics/professors/${professorId}/workload/?semester=${state.activeSemester.id}`);
    state.workloadData = data;
    render();
  } catch (error) {
    console.error('Failed to load workload:', error);
    showToast('Failed to load workload', 'error');
    state.showWorkloadModal = false;
    render();
  }
};

window.closeWorkloadModal = function() {
  state.showWorkloadModal = false;
  state.workloadData = null;
  render();
};

window.logout = function() {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
