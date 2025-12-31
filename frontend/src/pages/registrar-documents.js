import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';

// State
const state = {
  user: null,
  loading: true,
  loadingStudents: false,
  searchQuery: '',
  searchResults: [],
  allStudents: [],
  selectedStudent: null,
  releaseModal: null
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadAllStudents();
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
    ErrorHandler.handle(error, 'Loading user profile');
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadAllStudents() {
  state.loadingStudents = true;
  try {
    const response = await api.get(endpoints.cashierStudentSearch);
    const students = response?.results || response || [];

    state.allStudents = students.map(s => ({
      id: s.id || s.enrollment_id,
      student_id: s.id,
      student_number: s.student_number || 'N/A',
      first_name: s.first_name || s.student_name?.split(' ')[0] || '',
      last_name: s.last_name || s.student_name?.split(' ').slice(1).join(' ') || '',
      full_name: s.student_name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      program: {
        code: s.program_code || s.program?.code || 'N/A',
        name: s.program_name || s.program?.name || 'N/A'
      },
      year_level: s.year_level || 1,
      semester: s.semester || '1st Semester 2025-2026'
    }));

    console.log(`Loaded ${state.allStudents.length} students`);
  } catch (error) {
    ErrorHandler.handle(error, 'Loading students');
    state.allStudents = [];
  }
  state.loadingStudents = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading document release system...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'REGISTRAR',
      activePage: 'registrar-documents',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Document Release</h1>
          <p class="text-gray-600 mt-1">Search students and release official documents (COR, TOR, etc.)</p>
        </div>
      </div>

      <!-- Enrolled Students List -->
      <div class="card mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-gray-800">Enrolled Students (${state.allStudents.length})</h2>
          <button onclick="refreshStudents()" class="btn-secondary text-sm flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            Refresh
          </button>
        </div>

        <!-- Search -->
        <div class="flex gap-4 mb-4">
          <div class="flex-1">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input type="text"
                     id="searchInput"
                     placeholder="Search by student number or name..."
                     value="${state.searchQuery}"
                     oninput="handleSearch(event)"
                     class="form-input pl-10">
            </div>
          </div>
        </div>

        <!-- Students Table -->
        ${state.loadingStudents ? `
          <div class="text-center py-8">
            <svg class="w-8 h-8 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-gray-500">Loading students...</p>
          </div>
        ` : renderStudentsList()}
      </div>
    </main>
  `;
}


function renderStudentsList() {
  const displayStudents = state.searchQuery.trim()
    ? state.searchResults
    : state.allStudents;

  if (displayStudents.length === 0) {
    return `
      <div class="text-center py-12 text-gray-500">
        ${state.searchQuery ? 'No students found matching your search.' : 'No students found.'}
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student Number</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
            <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Year</th>
            <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${displayStudents.map(student => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm font-bold text-gray-900">${student.student_number}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    ${(student.first_name[0] || '') + (student.last_name[0] || '')}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">${student.full_name}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-gray-700">${student.program.code}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span class="text-sm text-gray-700">Year ${student.year_level}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <button onclick="openReleaseModal('${student.student_id}')" class="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Release Document
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function getReleaseForm(student) {
  return `
    <p class="text-gray-600 mb-6">Student: <span class="font-bold">${student.full_name}</span> (${student.student_number})</p>

    <form id="release-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
        <select id="document-type" required class="form-select">
          <option value="COR">Certificate of Registration (COR)</option>
          <option value="TOR">Transcript of Records (TOR)</option>
          <option value="GOOD_MORAL">Certificate of Good Moral</option>
          <option value="DIPLOMA">Diploma</option>
          <option value="HONORABLE_DISMISSAL">Honorable Dismissal</option>
        </select>
        <p class="text-xs text-gray-500 mt-1">Note: As of now, only COR is fully implemented</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
        <input type="text" id="document-purpose" class="form-input" placeholder="e.g., For employment, For scholarship">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Number of Copies *</label>
        <input type="number" id="document-copies" min="1" max="10" value="1" required class="form-input">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Internal)</label>
        <textarea id="document-notes" rows="3" class="form-input" placeholder="Optional internal notes"></textarea>
      </div>
    </form>
  `;
}

// Event handlers
window.handleSearch = function(event) {
  const query = event.target.value.toLowerCase().trim();
  state.searchQuery = query;

  if (!query) {
    state.searchResults = [];
    render();
    return;
  }

  state.searchResults = state.allStudents.filter(student =>
    student.student_number.toLowerCase().includes(query) ||
    student.full_name.toLowerCase().includes(query) ||
    student.first_name.toLowerCase().includes(query) ||
    student.last_name.toLowerCase().includes(query)
  );

  render();
};

window.refreshStudents = async function() {
  await loadAllStudents();
  render();
  Toast.success('Student list refreshed');
};

window.openReleaseModal = function(studentId) {
  const student = state.allStudents.find(s => s.student_id === studentId);
  if (!student) return;

  state.selectedStudent = studentId;

  const modal = new Modal({
    title: 'Release Document',
    content: getReleaseForm(student),
    size: 'lg',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Release Document',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('release-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            student_id: studentId,
            document_type: document.getElementById('document-type').value,
            purpose: document.getElementById('document-purpose').value,
            copies_released: parseInt(document.getElementById('document-copies').value),
            notes: document.getElementById('document-notes').value
          };

          try {
            const response = await api.post(endpoints.createDocumentRelease, data);
            const result = await response.json();

            if (response.ok && result?.success) {
              Toast.success(`Document released successfully! Code: ${result.data.document_code}`);
              m.close();
              state.selectedStudent = null;
            } else {
              const errorMsg = result?.error || result?.errors || result?.message || 'Failed to release document';
              Toast.error(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg);
            }
          } catch (error) {
            ErrorHandler.handle(error, 'Releasing document');
          }
        }
      }
    ]
  });

  state.releaseModal = modal;
  modal.show();
};


window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
