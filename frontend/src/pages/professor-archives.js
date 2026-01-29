import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { ErrorHandler } from '../utils/errorHandler.js';

// State
const state = {
    user: null,
    loading: true,
    semesters: [],
    selectedSemester: null,
    sections: []
};

async function init() {
    if (!requireAuth()) return;

    await Promise.all([
        loadUserProfile(),
        loadSemesters()
    ]);

    state.loading = false;
    render();
}

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            state.user = response.data || response;
            TokenManager.setUser(state.user);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile');
    }
}

async function loadSemesters() {
    try {
        const response = await api.get(endpoints.semesters);
        state.semesters = response?.semesters || response?.results || response || [];
        // Don't auto-select current semester for archives
    } catch (error) {
        ErrorHandler.handle(error, 'Loading semesters');
    }
}

async function loadSectionsForSemester(semesterId) {
    try {
        state.loading = true;
        render();

        const response = await api.get(`/academics/professor/${state.user.id}/schedule/${semesterId}/`);
        state.sections = response?.assigned_sections || [];
        state.selectedSemester = state.semesters.find(s => s.id === semesterId);

        state.loading = false;
        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Loading sections');
        state.sections = [];
        state.loading = false;
        render();
    }
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading archives...');
        return;
    }

    app.innerHTML = `
    ${createHeader({
        role: 'PROFESSOR',
        activePage: 'professor-archives',
        user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Past Records & Archives</h1>
        <p class="text-gray-600 mt-1">View your teaching history and past sections</p>
      </div>

      <!-- Semester Selector -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">Select Semester</label>
        <select 
          id="semesterSelect" 
          class="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onchange="handleSemesterChange(this.value)"
        >
          <option value="">-- Select a semester --</option>
          ${state.semesters.map(sem => `
            <option value="${sem.id}" ${state.selectedSemester?.id === sem.id ? 'selected' : ''}>
              ${sem.name} ${sem.academic_year} ${sem.is_current ? '(Current)' : ''}
            </option>
          `).join('')}
        </select>
      </div>

      ${state.selectedSemester ? renderSections() : renderEmptyState()}
    </main>
  `;
}

function renderEmptyState() {
    return `
    <div class="card text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      <h3 class="text-xl font-bold text-gray-800 mb-2">Select a Semester</h3>
      <p class="text-gray-600">Choose a semester from the dropdown to view your teaching records</p>
    </div>
  `;
}

function renderSections() {
    if (state.sections.length === 0) {
        return `
      <div class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
        </svg>
        <h3 class="text-xl font-bold text-gray-800 mb-2">No Sections Found</h3>
        <p class="text-gray-600">You had no assigned sections in ${state.selectedSemester.name} ${state.selectedSemester.academic_year}</p>
      </div>
    `;
    }

    return `
    <div class="space-y-4">
      ${state.sections.map(section => `
        <div class="card hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-800">${section.section_name}</h3>
              <p class="text-sm text-gray-600 mt-1">
                ${section.subject_code} - ${section.subject_title}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>📚 ${section.units} units</span>
                <span>👥 ${section.enrolled_count || 0} students</span>
              </div>
            </div>
            <a 
              href="/professor-grades.html?section=${section.section_id}&subject=${section.subject_id}&semester=${state.selectedSemester.id}" 
              class="btn-primary"
            >
              View Grades
            </a>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Event handlers
window.handleSemesterChange = function (semesterId) {
    if (semesterId) {
        loadSectionsForSemester(semesterId);
    } else {
        state.selectedSemester = null;
        state.sections = [];
        render();
    }
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
