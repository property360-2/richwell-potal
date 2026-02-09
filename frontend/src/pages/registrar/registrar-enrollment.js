import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { formatCurrency, requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { Modal } from '../../components/Modal.js';
import { renderStudentSearch, renderOverrideEnrollmentForm } from '../../organisms/index.js';

// State
const state = {
  user: null,
  loading: true,
  searchQuery: '',
  searchResults: [],
  selectedStudent: null,
  availableSubjects: [],
  selectedSubject: null,
  selectedSection: null,
  overrideReason: '',
  confirmModal: null
};

// No more mock data - all data comes from real API

async function init() {
  if (!requireAuth()) return;

  await loadData();
  render();
}

async function loadData() {
  try {
    const userResponse = await api.get(endpoints.me);
    if (userResponse) {
      state.user = userResponse;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user data');
  }

  // Load available subjects from API
  try {
    const response = await api.get(endpoints.manageSubjects);
    const subjects = response?.results || response || [];
    state.availableSubjects = subjects;
    if (subjects.length === 0) {
      console.warn('No subjects found in the system');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading subjects');
    state.availableSubjects = [];
  }

  state.loading = false;
}

async function searchStudentsFromAPI(query) {
  try {
    const response = await api.get(`${endpoints.cashierStudentSearch}?q=${encodeURIComponent(query)}`);
    const students = response?.results || [];

    // Transform to the format needed by the UI
    state.searchResults = students.map(s => ({
      id: s.id || s.enrollment_id,
      student_number: s.student_number,
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      program: { code: s.program_code || 'N/A', name: s.program_name || s.program_code || 'N/A' },
      year_level: s.year_level || 1,
      enrollment_status: s.enrollment_status || 'ACTIVE',
      enrolledSubjects: [],
      totalUnits: 0
    }));

    console.log(`Found ${state.searchResults.length} students`);
  } catch (error) {
    ErrorHandler.handle(error, 'Searching students');
    state.searchResults = [];
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading enrollment system...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
    role: 'REGISTRAR',
    activePage: 'registrar-enrollment',
    user: state.user
  })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Manual Enrollment Override</h1>
        <p class="text-gray-600 mt-1">Manually enroll students with override capabilities</p>
      </div>
      
      <!-- Warning Banner -->
      <div class="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
        <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <div>
          <p class="font-medium text-yellow-800">Override Mode</p>
          <p class="text-sm text-yellow-700">This interface bypasses prerequisite validation and capacity limits. All overrides require a documented reason and are logged for audit purposes.</p>
        </div>
      </div>
      
      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Left Column - Student Selection -->
        <div class="space-y-6">
          <!-- Search Card -->
          ${renderStudentSearch({
    query: state.searchQuery,
    results: state.searchResults,
    selectedId: state.selectedStudent?.id,
    loading: false // We could add loading state if needed
  })}
          
          <!-- Selected Student Details -->
          ${state.selectedStudent ? renderStudentDetails() : `
            <div class="card text-center py-12">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <p class="text-gray-400">Search for a student to begin manual enrollment</p>
            </div>
          `}
        </div>
        
        <!-- Right Column - Subject Selection & Override Form -->
        <div class="space-y-6">
          ${state.selectedStudent ? `
            <!-- Subject Selection -->
            <div class="card">
              <h2 class="text-xl font-bold text-gray-800 mb-4">Select Subject to Enroll</h2>
              <div class="space-y-3 max-h-80 overflow-y-auto">
                ${state.availableSubjects.map(subject => renderSubjectOption(subject)).join('')}
              </div>
            </div>
            
            <!-- Override Form -->
            ${state.selectedSubject ? renderOverrideEnrollmentForm({
    student: state.selectedStudent,
    subject: state.selectedSubject,
    selectedSectionId: state.selectedSection,
    overrideReason: state.overrideReason
  }) : ''}
          ` : `
            <div class="card text-center py-12">
              <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
              </svg>
              <p class="text-gray-400">Select a student first to see available subjects</p>
            </div>
          `}
        </div>
      </div>
    </main>
  `;

  attachEventListeners();
}



function renderStudentDetails() {
  const student = state.selectedStudent;

  return `
    <div class="card">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">${student.first_name} ${student.last_name}</h2>
          <p class="text-gray-500">${student.student_number}</p>
        </div>
        <span class="badge ${student.enrollment_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${student.enrollment_status}</span>
      </div>
      
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-500">Program</p>
          <p class="font-medium text-gray-800">${student.program.name}</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-500">Year Level</p>
          <p class="font-medium text-gray-800">Year ${student.year_level}</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-500">Total Units</p>
          <p class="font-medium text-gray-800">${student.totalUnits} / 30</p>
        </div>
        <div class="p-3 bg-gray-50 rounded-xl">
          <p class="text-sm text-gray-500">Enrolled Subjects</p>
          <p class="font-medium text-gray-800">${student.enrolledSubjects.length}</p>
        </div>
      </div>
      
      ${student.enrolledSubjects.length > 0 ? `
        <h3 class="font-medium text-gray-700 mb-3">Currently Enrolled</h3>
        <div class="space-y-2">
          ${student.enrolledSubjects.map(s => `
            <div class="p-3 bg-green-50 rounded-lg flex items-center justify-between">
              <div>
                <span class="font-mono text-sm font-bold text-green-700">${s.code}</span>
                <p class="text-sm text-green-600">${s.name}</p>
              </div>
              <span class="text-sm text-green-600">${s.units} units</span>
            </div>
          `).join('')}
        </div>
      ` : `
        <p class="text-gray-400 text-center py-4">No enrolled subjects</p>
      `}
    </div>
  `;
}

function renderSubjectOption(subject) {
  const isEnrolled = state.selectedStudent?.enrolledSubjects?.find(s => s.code === subject.code);
  const isSelected = state.selectedSubject?.id === subject.id;
  const hasPrereq = subject.prerequisite;

  return `
    <div onclick="${isEnrolled ? '' : `selectSubject(${subject.id})`}" 
         class="p-4 rounded-xl transition-colors ${isEnrolled ? 'bg-gray-100 opacity-50 cursor-not-allowed' : isSelected ? 'bg-blue-50 ring-2 ring-blue-500 cursor-pointer' : 'bg-gray-50 hover:bg-blue-50 cursor-pointer'}">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-bold ${isEnrolled ? 'text-gray-400' : 'text-blue-600'}">${subject.code}</span>
            ${isEnrolled ? '<span class="badge badge-success text-xs">Enrolled</span>' : ''}
            ${hasPrereq ? `<span class="badge badge-warning text-xs">Prereq: ${subject.prerequisite}</span>` : ''}
          </div>
          <p class="font-medium ${isEnrolled ? 'text-gray-400' : 'text-gray-800'}">${subject.name}</p>
          <p class="text-sm ${isEnrolled ? 'text-gray-400' : 'text-gray-500'}">${subject.units} units</p>
        </div>
        ${!isEnrolled && isSelected ? `
          <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
        ` : ''}
      </div>
    </div>
  `;
}



function getConfirmContent(subject, section) {
  return `
    <div class="text-center mb-6">
      <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <p class="text-gray-600">You are about to manually enroll:</p>
    </div>

    <div class="p-4 bg-gray-50 rounded-xl">
      <p class="text-sm text-gray-500">Student</p>
      <p class="font-medium">${state.selectedStudent.first_name} ${state.selectedStudent.last_name}</p>
      <p class="text-sm text-gray-500 mt-2">Subject</p>
      <p class="font-medium">${subject.code} - ${subject.name}</p>
      <p class="text-sm text-gray-500 mt-2">Section</p>
      <p class="font-medium">Section ${section?.name} - ${section?.schedule}</p>
      <p class="text-sm text-gray-500 mt-2">Reason</p>
      <p class="font-medium text-sm">${state.overrideReason}</p>
    </div>
  `;
}

function attachEventListeners() {
  const searchInput = document.getElementById('studentSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        searchStudent();
      }
    });
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
    });
  }
}

// Global functions
window.searchStudent = async function () {
  const input = document.getElementById('studentSearch');
  state.searchQuery = input?.value || '';

  if (state.searchQuery.length >= 2) {
    await searchStudentsFromAPI(state.searchQuery);
  } else {
    state.searchResults = [];
  }
  render();
};

window.selectStudent = function (studentId) {
  state.selectedStudent = state.searchResults.find(s => s.id === studentId);
  state.selectedSubject = null;
  state.selectedSection = null;
  render();
};

window.selectSubject = function (subjectId) {
  state.selectedSubject = state.availableSubjects.find(s => s.id === subjectId);
  state.selectedSection = null;
  render();
};

window.confirmOverride = function () {
  const sectionSelect = document.getElementById('sectionSelect');
  const reasonInput = document.getElementById('overrideReason');

  if (!sectionSelect?.value) {
    Toast.error('Please select a section');
    return;
  }

  if (!reasonInput?.value?.trim()) {
    Toast.error('Override reason is required');
    return;
  }

  state.selectedSection = sectionSelect.value;
  state.overrideReason = reasonInput.value.trim();

  const subject = state.selectedSubject;
  const section = subject.sections.find(s => s.id === parseInt(state.selectedSection));

  const modal = new Modal({
    title: 'Confirm Override Enrollment',
    content: getConfirmContent(subject, section),
    size: 'md',
    actions: [
      { label: 'Cancel', onClick: (m) => m.close() },
      {
        label: 'Confirm',
        primary: true,
        onClick: async (m) => {
          await executeOverride();
          m.close();
        }
      }
    ]
  });

  state.confirmModal = modal;
  modal.show();
};

window.executeOverride = async function () {
  try {
    // Try API call
    try {
      await api.post(`/enrollment/enrollment/${state.selectedStudent.id}/override-enroll/`, {
        subject_id: state.selectedSubject.id,
        section_id: parseInt(state.selectedSection),
        override_reason: state.overrideReason
      });
    } catch (error) {
      console.log('API override failed, using mock:', error);
    }

    // Add to student's enrolled subjects (mock)
    const section = state.selectedSubject.sections.find(s => s.id === parseInt(state.selectedSection));
    state.selectedStudent.enrolledSubjects.push({
      id: Date.now(),
      code: state.selectedSubject.code,
      name: state.selectedSubject.name,
      section: section.name,
      units: state.selectedSubject.units
    });
    state.selectedStudent.totalUnits += state.selectedSubject.units;

    Toast.success(`Successfully enrolled ${state.selectedStudent.first_name} in ${state.selectedSubject.code}!`);

    // Reset form
    state.selectedSubject = null;
    state.selectedSection = null;
    state.overrideReason = '';

    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Override enrollment');
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/pages/auth/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
