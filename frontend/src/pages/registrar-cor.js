import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
  user: null,
  loading: true,
  loadingStudents: false,
  searchQuery: '',
  searchResults: [],
  allStudents: [],
  selectedStudent: null,
  showCORPreview: false
};

// Fetch real subject enrollments for a student
async function loadStudentSubjectEnrollments(enrollmentId) {
  try {
    const response = await api.get(`/admissions/enrollments/${enrollmentId}/subjects/`);

    if (response?.data?.subjects) {
      return response.data.subjects.map(s => ({
        code: s.subject_code || 'N/A',
        name: s.subject_name || s.subject_title || 'N/A',
        units: s.units || 3,
        section: s.section_name || 'N/A',
        schedule: s.schedule || 'TBA',
        grade: s.grade,
        status: s.status || 'ENROLLED'
      }));
    }

    // Fallback to empty array if no subjects
    return [];
  } catch (error) {
    console.error(`Failed to load subjects for enrollment ${enrollmentId}:`, error);
    return [];
  }
}

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
    console.error('Failed to load profile:', error);
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadAllStudents() {
  state.loadingStudents = true;
  try {
    // Fetch enrolled students using cashier search (returns all enrolled students)
    const response = await api.get(endpoints.cashierStudentSearch);
    const students = response?.results || response || [];

    console.log('API Response:', students);

    // Transform to student format (subjects will be loaded on-demand when viewing COR)
    state.allStudents = students.map(s => ({
      id: s.id || s.enrollment_id,
      student_number: s.student_number || 'N/A',
      first_name: s.first_name || s.student_name?.split(' ')[0] || '',
      last_name: s.last_name || s.student_name?.split(' ').slice(1).join(' ') || '',
      program: {
        code: s.program_code || s.program?.code || 'N/A',
        name: s.program_name || s.program?.name || 'N/A'
      },
      year_level: s.year_level || 1,
      semester: s.semester || '1st Semester 2025-2026',
      subjects: [], // Will be loaded on-demand
      totalUnits: 0, // Will be calculated from actual subjects
      subjectsLoaded: false // Flag to track if subjects have been loaded
    }));

    console.log(`Loaded ${state.allStudents.length} students`);
  } catch (error) {
    console.error('Failed to load students:', error);
    state.allStudents = [];
  }
  state.loadingStudents = false;
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
      activePage: 'registrar-cor',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Certificate of Registration</h1>
          <p class="text-gray-600 mt-1">Search and print student COR documents</p>
        </div>
        <div class="mt-4 md:mt-0">
          <a href="/registrar-enrollment.html" class="btn-secondary flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            Override Enrollment
          </a>
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
                     onkeyup="handleSearch(event)"
                     class="form-input pl-10">
            </div>
          </div>
          <button onclick="searchStudent()" class="btn-primary">Search</button>
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
      
      <!-- Selected Student Details -->
      ${state.selectedStudent ? renderStudentDetails() : ''}
    </main>
    
    <!-- COR Preview Modal -->
    ${state.showCORPreview && state.selectedStudent ? renderCORPreview() : ''}
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
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  `;
}

function renderStudentsList() {
  // Filter students based on search query
  const query = state.searchQuery.toLowerCase().trim();
  const filteredStudents = query
    ? state.allStudents.filter(s =>
      s.student_number.toLowerCase().includes(query) ||
      s.first_name.toLowerCase().includes(query) ||
      s.last_name.toLowerCase().includes(query) ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(query)
    )
    : state.allStudents;

  if (filteredStudents.length === 0) {
    return `
      <div class="text-center py-8">
        <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <p class="text-gray-500">${query ? 'No students found matching your search.' : 'No enrolled students yet.'}</p>
      </div>
    `;
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Year</th>
            <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${filteredStudents.slice(0, 20).map(student => `
            <tr class="hover:bg-blue-50 cursor-pointer" onclick="selectStudent('${student.id}')">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    ${(student.first_name[0] || '?')}${(student.last_name[0] || '?')}
                  </div>
                  <div>
                    <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
                    <p class="text-xs text-gray-500">${student.student_number}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="badge badge-info">${student.program.code}</span>
              </td>
              <td class="px-4 py-3 text-center text-gray-700">Year ${student.year_level}</td>
              <td class="px-4 py-3 text-center">
                <button onclick="event.stopPropagation(); selectStudent('${student.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View COR
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${filteredStudents.length > 20 ? `
        <p class="text-center py-3 text-sm text-gray-500">Showing 20 of ${filteredStudents.length} students. Use search to find specific students.</p>
      ` : ''}
    </div>
  `;
}

function renderSearchResults() {
  return `
    <div class="mt-4 border-t pt-4">
      <p class="text-sm text-gray-500 mb-3">Found ${state.searchResults.length} student(s)</p>
      <div class="space-y-2">
        ${state.searchResults.map(student => `
          <div class="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors" onclick="selectStudent('${student.id}')">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                ${student.first_name[0]}${student.last_name[0]}
              </div>
              <div>
                <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
                <p class="text-sm text-gray-500">${student.student_number} • ${student.program.code} Year ${student.year_level}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              ${student.subjects.some(s => s.status === 'INC') ?
      '<span class="badge badge-warning">Has INC</span>' :
      '<span class="badge badge-success">Complete</span>'
    }
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStudentDetails() {
  const student = state.selectedStudent;

  // Show loading state if subjects haven't been loaded yet
  if (!student.subjectsLoaded) {
    return `
      <div class="card">
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              ${student.first_name[0]}${student.last_name[0]}
            </div>
            <div>
              <h2 class="text-2xl font-bold text-gray-800">${student.first_name} ${student.last_name}</h2>
              <p class="text-gray-600">${student.student_number}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="badge badge-info">${student.program.code}</span>
                <span class="badge badge-primary">Year ${student.year_level}</span>
                <span class="text-sm text-gray-500">${student.semester}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="text-center py-12">
          <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-gray-600">Loading subject enrollments...</p>
        </div>
      </div>
    `;
  }

  const incSubjects = student.subjects.filter(s => s.status === 'INC');
  const passedSubjects = student.subjects.filter(s => s.status === 'PASSED');

  return `
    <div class="card">
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            ${student.first_name[0]}${student.last_name[0]}
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-800">${student.first_name} ${student.last_name}</h2>
            <p class="text-gray-600">${student.student_number}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="badge badge-info">${student.program.code}</span>
              <span class="badge badge-primary">Year ${student.year_level}</span>
              <span class="text-sm text-gray-500">${student.semester}</span>
            </div>
          </div>
        </div>
        <button onclick="previewCOR()" class="btn-primary flex items-center gap-2" ${student.subjects.length === 0 ? 'disabled' : ''}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Print COR
        </button>
      </div>

      <!-- INC Warning -->
      ${incSubjects.length > 0 ? `
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
          <div class="flex items-start gap-3">
            <svg class="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div>
              <h4 class="font-bold text-orange-800">Incomplete Grades (${incSubjects.length})</h4>
              <div class="text-sm text-orange-700 mt-1">
                ${incSubjects.map(s => `<p>• <strong>${s.code}</strong> - ${s.name}: ${s.inc_reason}</p>`).join('')}
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div class="flex items-center gap-3">
            <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <h4 class="font-bold text-green-800">All Subjects Complete</h4>
              <p class="text-sm text-green-700">This student has passed all enrolled subjects.</p>
            </div>
          </div>
        </div>
      `}
      
      <!-- Subjects Table -->
      <h3 class="text-lg font-bold text-gray-800 mb-3">Enrolled Subjects</h3>
      ${student.subjects.length === 0 ? `
        <div class="border border-gray-200 rounded-xl p-8 text-center">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
          <p class="text-gray-500 font-medium">No subjects enrolled yet</p>
          <p class="text-sm text-gray-400 mt-1">This student has not enrolled in any subjects for this semester.</p>
        </div>
      ` : `
        <div class="border border-gray-200 rounded-xl overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Section</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Schedule</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Units</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${student.subjects.map(subject => `
                <tr class="hover:bg-gray-50 ${subject.status === 'INC' ? 'bg-orange-50' : ''}">
                  <td class="px-4 py-3">
                    <p class="font-mono font-medium text-blue-600">${subject.code}</p>
                    <p class="text-sm text-gray-600">${subject.name}</p>
                  </td>
                  <td class="px-4 py-3 text-gray-700">${subject.section}</td>
                  <td class="px-4 py-3 text-gray-700 text-sm">${subject.schedule}</td>
                  <td class="px-4 py-3 text-center font-medium">${subject.units}</td>
                  <td class="px-4 py-3 text-center font-bold ${subject.status === 'INC' ? 'text-orange-600' : 'text-gray-800'}">
                    ${subject.grade !== null && subject.grade !== undefined ? subject.grade.toFixed(2) : (subject.status === 'INC' ? 'INC' : '-')}
                  </td>
                  <td class="px-4 py-3 text-center">
                    ${subject.status === 'PASSED' ? '<span class="badge badge-success">Passed</span>' :
                      subject.status === 'INC' ? '<span class="badge badge-warning">INC</span>' :
                      subject.status === 'ENROLLED' ? '<span class="badge badge-info">Enrolled</span>' :
                      `<span class="badge badge-secondary">${subject.status}</span>`
                    }
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot class="bg-gray-50">
              <tr>
                <td colspan="3" class="px-4 py-3 text-right font-semibold text-gray-700">Total Units:</td>
                <td class="px-4 py-3 text-center font-bold text-blue-600">${student.totalUnits}</td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `}
    </div>
  `;
}

function renderCORPreview() {
  const student = state.selectedStudent;
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4" onclick="closeCORPreview()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-slideUp" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">Certificate of Registration Preview</h2>
            <p class="text-blue-100 text-sm">${student.student_number} - ${student.first_name} ${student.last_name}</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="printCOR()" class="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
              </svg>
              Print
            </button>
            <button onclick="closeCORPreview()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- COR Content -->
        <div class="p-8 overflow-y-auto max-h-[calc(90vh-80px)]" id="cor-content">
          <div class="border-2 border-gray-300 p-8">
            <!-- Header -->
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold text-gray-800">RICHWELL COLLEGES</h1>
              <p class="text-gray-600">Quezon City, Philippines</p>
              <h2 class="text-xl font-bold text-blue-600 mt-4">CERTIFICATE OF REGISTRATION</h2>
              <p class="text-sm text-gray-500">${student.semester}</p>
            </div>
            
            <!-- Student Info -->
            <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p><strong>Student Number:</strong> ${student.student_number}</p>
                <p><strong>Name:</strong> ${student.first_name} ${student.last_name}</p>
              </div>
              <div>
                <p><strong>Program:</strong> ${student.program.name}</p>
                <p><strong>Year Level:</strong> ${student.year_level}</p>
              </div>
            </div>
            
            <!-- Subjects Table -->
            <table class="w-full border-collapse text-sm mb-6">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border border-gray-300 px-3 py-2 text-left">Subject Code</th>
                  <th class="border border-gray-300 px-3 py-2 text-left">Subject Title</th>
                  <th class="border border-gray-300 px-3 py-2 text-center">Units</th>
                  <th class="border border-gray-300 px-3 py-2 text-center">Section</th>
                  <th class="border border-gray-300 px-3 py-2 text-left">Schedule</th>
                  <th class="border border-gray-300 px-3 py-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                ${student.subjects.map(s => `
                  <tr>
                    <td class="border border-gray-300 px-3 py-2 font-mono">${s.code}</td>
                    <td class="border border-gray-300 px-3 py-2">${s.name}</td>
                    <td class="border border-gray-300 px-3 py-2 text-center">${s.units}</td>
                    <td class="border border-gray-300 px-3 py-2 text-center">${s.section}</td>
                    <td class="border border-gray-300 px-3 py-2">${s.schedule}</td>
                    <td class="border border-gray-300 px-3 py-2 text-center font-bold ${s.status === 'INC' ? 'text-orange-600' : ''}">${s.grade !== null ? s.grade.toFixed(2) : 'INC'}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-100 font-bold">
                  <td colspan="2" class="border border-gray-300 px-3 py-2 text-right">Total Units:</td>
                  <td class="border border-gray-300 px-3 py-2 text-center">${student.totalUnits}</td>
                  <td colspan="3" class="border border-gray-300 px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
            
            <!-- Signature Section -->
            <div class="flex justify-between mt-12">
              <div class="text-center">
                <div class="w-48 border-t border-gray-400 pt-1">
                  <p class="font-semibold">Student's Signature</p>
                </div>
              </div>
              <div class="text-center">
                <div class="w-48 border-t border-gray-400 pt-1">
                  <p class="font-semibold">Registrar</p>
                  <p class="text-xs text-gray-500">Date: ${today}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Event Handlers
window.handleSearch = function (event) {
  state.searchQuery = event.target.value;
  if (event.key === 'Enter') {
    searchStudent();
  }
};

window.searchStudent = function () {
  const query = state.searchQuery.toLowerCase().trim();
  if (!query) {
    state.searchResults = [];
    state.selectedStudent = null;
    render();
    return;
  }

  // Just re-render - the filtering happens in renderStudentsList
  render();
};

window.selectStudent = async function (studentId) {
  const student = state.allStudents.find(s => s.id === studentId);

  if (!student) {
    showToast('Student not found', 'error');
    return;
  }

  state.selectedStudent = student;

  // Load subjects if not already loaded
  if (!student.subjectsLoaded) {
    render(); // Show student with loading state

    const subjects = await loadStudentSubjectEnrollments(student.id);
    student.subjects = subjects;
    student.totalUnits = subjects.reduce((sum, s) => sum + s.units, 0);
    student.subjectsLoaded = true;
  }

  render();
};

window.refreshStudents = async function () {
  await loadAllStudents();
  render();
  showToast('Students list refreshed', 'success');
};

window.previewCOR = function () {
  state.showCORPreview = true;
  render();
};

window.closeCORPreview = function () {
  state.showCORPreview = false;
  render();
};

window.printCOR = async function () {
  try {
    showToast('Generating COR PDF...', 'info');

    // Call backend API to generate PDF
    const enrollmentId = state.selectedStudent.id; // This should be enrollment ID from API
    const token = TokenManager.getToken();

    const response = await fetch(`${endpoints.generateCOR.replace('{enrollment_id}', enrollmentId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate COR');
    }

    // Download PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `COR-${state.selectedStudent.student_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast('COR generated successfully', 'success');
  } catch (error) {
    console.error('Failed to generate COR:', error);
    showToast(error.message || 'Failed to generate COR', 'error');

    // Fallback to client-side printing if backend fails
    const content = document.getElementById('cor-content').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>COR - ${state.selectedStudent.student_number}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #333; padding: 8px; }
          th { background: #f0f0f0; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .font-mono { font-family: monospace; }
          .text-orange-600 { color: #ea580c; }
          @media print {
            body { margin: 0; padding: 10mm; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
};

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
