import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';
import { createSearchInput } from '../components/SearchInput.js';
import { EmptyState, EmptyStateIcons } from '../components/EmptyState.js';

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
  try {
    if (!requireAuth()) return;
    await loadUserProfile();
    await loadAllStudents();
  } catch (error) {
    console.error('Init failed:', error);
    ErrorHandler.handle(error, 'Initializing page');
  } finally {
    state.loading = false;
    render();
  }
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
          <div class="flex-1" id="search-container"></div>
        </div>

        <!-- Students Table -->
        ${state.loadingStudents ? `
          <div class="text-center py-8">
            <svg class="w-8 h-8 animate-spin text-blue-600 mx-auto" width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-2 text-gray-500">Loading students...</p>
          </div>
        ` : renderStudentsList()}
      </div>
    </main>
  `;

  // Initialize search input after render
  const searchContainer = document.getElementById('search-container');
  if (searchContainer) {
    const searchInput = createSearchInput({
      placeholder: 'Search by student number or name...',
      onSearch: (query) => {
        state.searchQuery = query;
        const displayStudents = query.trim()
          ? state.allStudents.filter(student =>
            student.student_number.toLowerCase().includes(query.toLowerCase()) ||
            student.full_name.toLowerCase().includes(query.toLowerCase()) ||
            student.first_name.toLowerCase().includes(query.toLowerCase()) ||
            student.last_name.toLowerCase().includes(query.toLowerCase())
          )
          : state.allStudents;
        state.searchResults = displayStudents;

        // Re-render student list
        const tableContainer = document.querySelector('.overflow-x-auto')?.parentElement;
        if (tableContainer) {
          const listHtml = renderStudentsList();
          tableContainer.innerHTML = listHtml;
        }
      }
    });
    searchContainer.appendChild(searchInput);
  }
}


function renderStudentsList() {
  const displayStudents = state.searchQuery.trim()
    ? state.searchResults
    : state.allStudents;

  if (displayStudents.length === 0) {
    if (displayStudents.length === 0) {
      return EmptyState({
        icon: state.searchQuery ? EmptyStateIcons.search : EmptyStateIcons.users,
        title: state.searchQuery ? 'No students found' : 'No students enrolled',
        description: state.searchQuery
          ? 'Try adjusting your search criteria or check the student number.'
          : 'There are no enrolled students in the system yet.',
        action: state.searchQuery ? {
          label: 'Clear Search',
          onClick: 'handleClearSearch()'
        } : null
      });
    }
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

function getReleaseForm(student, enrollmentStatus) {
  const canReleaseCOR = enrollmentStatus?.can_release_cor !== false;
  const hasEnrollment = enrollmentStatus?.has_enrollment !== false;

  return `
    <p class="text-gray-600 mb-6">Student: <span class="font-bold">${student.full_name}</span> (${student.student_number})</p>

    ${enrollmentStatus ? `
      <!-- Enrollment Status Info -->
      <div class="p-4 rounded-lg mb-4 ${canReleaseCOR ? 'bg-blue-50 border border-blue-200' : 'bg-yellow-50 border border-yellow-200'}">
        <div class="flex items-start gap-3">
          ${canReleaseCOR ? `
            <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          ` : `
            <svg class="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          `}
          <div class="flex-1">
            <p class="font-medium ${canReleaseCOR ? 'text-blue-800' : 'text-yellow-800'}">${enrollmentStatus.message}</p>
            ${hasEnrollment ? `
              <p class="text-sm ${canReleaseCOR ? 'text-blue-600' : 'text-yellow-600'} mt-1">
                Semester: ${enrollmentStatus.semester} | Total Units: ${enrollmentStatus.total_units || 0}
              </p>
            ` : ''}
            ${!canReleaseCOR ? `
              <p class="text-sm text-yellow-700 mt-2 font-medium">
                ⚠️ COR cannot be released until the student enrolls in at least one subject
              </p>
            ` : ''}
          </div>
        </div>

        ${canReleaseCOR && enrollmentStatus.enrolled_subjects && enrollmentStatus.enrolled_subjects.length > 0 ? `
          <details class="mt-3">
            <summary class="text-sm text-blue-700 cursor-pointer hover:text-blue-800 font-medium">
              View enrolled subjects (${enrollmentStatus.enrolled_subjects_count})
            </summary>
            <div class="mt-2 pl-4 space-y-1">
              ${enrollmentStatus.enrolled_subjects.map(subj => `
                <div class="text-sm text-gray-700">
                  <span class="font-mono font-medium">${subj.code}</span> - ${subj.title} (${subj.units} units)
                </div>
              `).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    ` : ''}

    <form id="release-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
        <select id="document-type" required class="form-select" ${!canReleaseCOR ? 'onchange="handleDocTypeChange(this.value, ' + canReleaseCOR + ')"' : ''}>
          <option value="">Select document type...</option>
          <option value="COR" ${!canReleaseCOR ? 'disabled' : ''}>
            Certificate of Registration (COR) ${!canReleaseCOR ? '- Requires enrolled subjects' : ''}
          </option>
          <option value="TOR">Transcript of Records (TOR)</option>
          <option value="GOOD_MORAL">Certificate of Good Moral</option>
          <option value="DIPLOMA">Diploma</option>
          <option value="HONORABLE_DISMISSAL">Honorable Dismissal</option>
        </select>
        ${!canReleaseCOR ? `
          <p class="text-xs text-yellow-600 mt-1">
            <strong>Note:</strong> COR is disabled because student has no enrolled subjects
          </p>
        ` : `
          <p class="text-xs text-gray-500 mt-1">Note: As of now, only COR is fully implemented</p>
        `}
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

// Handle document type change to show warning for COR
window.handleDocTypeChange = function (docType, canReleaseCOR) {
  if (docType === 'COR' && !canReleaseCOR) {
    Toast.warning('COR cannot be released: Student has no enrolled subjects');
    // Reset selection
    document.getElementById('document-type').value = '';
  }
};

// Event handlers
window.refreshStudents = async function () {
  await loadAllStudents();
  render();
  Toast.success('Student list refreshed');
};

window.openReleaseModal = async function (studentId) {
  const student = state.allStudents.find(s => s.student_id === studentId);
  if (!student) return;

  state.selectedStudent = studentId;

  // Fetch enrollment status for COR validation
  let enrollmentStatus = null;
  try {
    enrollmentStatus = await api.get(endpoints.studentEnrollmentStatus(studentId));
  } catch (error) {
    console.error('Failed to load enrollment status:', error);
  }

  const modal = new Modal({
    title: 'Release Document',
    content: getReleaseForm(student, enrollmentStatus),
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

          const docType = document.getElementById('document-type').value;

          // Validate COR release
          if (docType === 'COR' && enrollmentStatus && !enrollmentStatus.can_release_cor) {
            Toast.error('Cannot release COR: Student has no enrolled subjects for the current semester');
            return;
          }

          const data = {
            student_id: studentId,
            document_type: docType,
            purpose: document.getElementById('document-purpose').value,
            copies_released: parseInt(document.getElementById('document-copies').value),
            notes: document.getElementById('document-notes').value
          };

          try {
            const result = await api.post(endpoints.createDocumentRelease, data);

            if (result && (result.success || result.document_code)) {
              Toast.success(`Document released successfully! Code: ${result.document_code || result.data?.document_code}`);
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


window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

window.handleClearSearch = function () {
  state.searchQuery = '';
  state.searchResults = [];
  render();
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
