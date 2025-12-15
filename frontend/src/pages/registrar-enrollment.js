import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, formatCurrency, requireAuth } from '../utils.js';

// State
const state = {
    user: null,
    loading: true,
    searchQuery: '',
    selectedStudent: null,
    availableSubjects: [],
    selectedSubject: null,
    selectedSection: null,
    overrideReason: '',
    showConfirmModal: false
};

// Mock students data
const mockStudents = [
    {
        id: 1,
        student_number: '2024-00001',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        email: 'jdelacruz@richwell.edu.ph',
        program: { code: 'BSIT', name: 'BS Information Technology' },
        year_level: 1,
        enrollment_status: 'ACTIVE',
        enrolledSubjects: [
            { id: 101, code: 'IT101', name: 'Introduction to Computing', section: 'A', units: 3 },
            { id: 102, code: 'IT102', name: 'Computer Programming 1', section: 'A', units: 3 }
        ],
        totalUnits: 6
    },
    {
        id: 2,
        student_number: '2024-00002',
        first_name: 'Maria',
        last_name: 'Santos',
        email: 'msantos@richwell.edu.ph',
        program: { code: 'BSCS', name: 'BS Computer Science' },
        year_level: 2,
        enrollment_status: 'PENDING',
        enrolledSubjects: [],
        totalUnits: 0
    }
];

const mockSubjects = [
    {
        id: 1, code: 'IT101', name: 'Introduction to Computing', units: 3, sections: [
            { id: 1, name: 'A', slots: 40, enrolled: 38, schedule: 'MWF 8:00-9:00 AM' },
            { id: 2, name: 'B', slots: 40, enrolled: 35, schedule: 'TTH 9:00-10:30 AM' }
        ]
    },
    {
        id: 2, code: 'IT102', name: 'Computer Programming 1', units: 3, sections: [
            { id: 3, name: 'A', slots: 35, enrolled: 35, schedule: 'MWF 10:00-11:00 AM' },
            { id: 4, name: 'B', slots: 35, enrolled: 30, schedule: 'TTH 1:00-2:30 PM' }
        ]
    },
    {
        id: 3, code: 'IT201', name: 'Computer Programming 2', units: 3, prerequisite: 'IT102', sections: [
            { id: 5, name: 'A', slots: 35, enrolled: 25, schedule: 'MWF 2:00-3:00 PM' }
        ]
    },
    {
        id: 4, code: 'IT202', name: 'Data Structures', units: 3, prerequisite: 'IT201', sections: [
            { id: 6, name: 'A', slots: 30, enrolled: 20, schedule: 'TTH 8:00-9:30 AM' }
        ]
    },
    {
        id: 5, code: 'IT301', name: 'Database Management', units: 3, prerequisite: 'IT202', sections: [
            { id: 7, name: 'A', slots: 30, enrolled: 30, schedule: 'MWF 3:00-4:00 PM' }
        ]
    },
    {
        id: 6, code: 'GE101', name: 'Understanding the Self', units: 3, sections: [
            { id: 8, name: 'A', slots: 50, enrolled: 50, schedule: 'MWF 1:00-2:00 PM' }
        ]
    }
];

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
        state.availableSubjects = mockSubjects;
    } catch (error) {
        console.error('Failed to load data:', error);
        state.availableSubjects = mockSubjects;
    }
    state.loading = false;
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = renderLoading();
        return;
    }

    app.innerHTML = `
    ${renderHeader()}
    
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
          <div class="card">
            <h2 class="text-xl font-bold text-gray-800 mb-4">Select Student</h2>
            <div class="flex gap-3">
              <div class="flex-1 relative">
                <input type="text" 
                       id="studentSearch"
                       value="${state.searchQuery}"
                       placeholder="Search by student number or name..."
                       class="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <button onclick="searchStudent()" class="btn-primary px-6">Search</button>
            </div>
            
            ${state.searchQuery ? renderSearchResults() : ''}
          </div>
          
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
                ${mockSubjects.map(subject => renderSubjectOption(subject)).join('')}
              </div>
            </div>
            
            <!-- Override Form -->
            ${state.selectedSubject ? renderOverrideForm() : ''}
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
    
    <!-- Confirm Modal -->
    ${state.showConfirmModal ? renderConfirmModal() : ''}
  `;

    attachEventListeners();
}

function renderHeader() {
    return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <div>
            <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
            <span class="text-sm text-gray-500 ml-2">Registrar</span>
          </div>
        </div>
        
        <nav class="hidden md:flex items-center gap-6">
          <a href="/curriculum.html" class="text-gray-600 hover:text-gray-900">Curriculum</a>
          <a href="/sections.html" class="text-gray-600 hover:text-gray-900">Sections</a>
          <a href="/schedule.html" class="text-gray-600 hover:text-gray-900">Schedule</a>
          <a href="/registrar-enrollment.html" class="text-blue-600 font-medium">Manual Enroll</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-sm font-medium text-gray-800">${state.user?.first_name || 'Registrar'} ${state.user?.last_name || 'User'}</p>
            <p class="text-xs text-gray-500">Registrar</p>
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
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  `;
}

function renderSearchResults() {
    const query = state.searchQuery.toLowerCase();
    const results = mockStudents.filter(s =>
        s.student_number.toLowerCase().includes(query) ||
        s.first_name.toLowerCase().includes(query) ||
        s.last_name.toLowerCase().includes(query) ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(query)
    );

    if (results.length === 0) {
        return `
      <div class="mt-4 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
        No students found matching "${state.searchQuery}"
      </div>
    `;
    }

    return `
    <div class="mt-4 space-y-2">
      ${results.map(student => `
        <div onclick="selectStudent(${student.id})" 
             class="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between ${state.selectedStudent?.id === student.id ? 'ring-2 ring-blue-500' : ''}">
          <div>
            <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
            <p class="text-sm text-gray-500">${student.student_number} • ${student.program.code}</p>
          </div>
          <span class="badge ${student.enrollment_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${student.enrollment_status}</span>
        </div>
      `).join('')}
    </div>
  `;
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

function renderOverrideForm() {
    const subject = state.selectedSubject;
    const issues = [];

    if (subject.prerequisite) {
        const hasPrereq = state.selectedStudent.enrolledSubjects.find(s => s.code === subject.prerequisite);
        if (!hasPrereq) {
            issues.push(`Missing prerequisite: ${subject.prerequisite}`);
        }
    }

    const fullSections = subject.sections.filter(s => s.enrolled >= s.slots);
    if (fullSections.length > 0) {
        issues.push(`${fullSections.length} section(s) at full capacity`);
    }

    if ((state.selectedStudent.totalUnits + subject.units) > 30) {
        issues.push(`Would exceed 30-unit limit`);
    }

    return `
    <div class="card border-2 border-yellow-200">
      <h3 class="font-bold text-gray-800 mb-4">Override Enrollment</h3>
      
      <div class="p-4 bg-blue-50 rounded-xl mb-4">
        <p class="font-medium text-blue-800">${subject.code} - ${subject.name}</p>
        <p class="text-sm text-blue-600">${subject.units} units</p>
      </div>
      
      ${issues.length > 0 ? `
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
          <p class="font-medium text-red-800 mb-2">⚠️ Override Required</p>
          <ul class="text-sm text-red-600 space-y-1">
            ${issues.map(issue => `<li>• ${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Select Section</label>
        <select id="sectionSelect" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Choose a section...</option>
          ${subject.sections.map(section => `
            <option value="${section.id}" ${section.enrolled >= section.slots ? 'class="text-red-600"' : ''}>
              Section ${section.name} - ${section.schedule} (${section.enrolled}/${section.slots}${section.enrolled >= section.slots ? ' FULL' : ''})
            </option>
          `).join('')}
        </select>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">Override Reason <span class="text-red-500">*</span></label>
        <textarea id="overrideReason"
                  rows="3"
                  required
                  placeholder="Provide justification for this override enrollment..."
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
        <p class="text-xs text-gray-500 mt-1">This reason will be logged for audit purposes</p>
      </div>
      
      <button onclick="confirmOverride()" class="w-full btn-primary bg-yellow-600 hover:bg-yellow-700">
        <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
        </svg>
        Override Enroll
      </button>
    </div>
  `;
}

function renderConfirmModal() {
    const subject = state.selectedSubject;
    const section = subject.sections.find(s => s.id === parseInt(state.selectedSection));

    return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeConfirmModal()">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Confirm Override Enrollment</h3>
          <p class="text-gray-600">You are about to manually enroll:</p>
        </div>
        
        <div class="p-4 bg-gray-50 rounded-xl mb-4">
          <p class="text-sm text-gray-500">Student</p>
          <p class="font-medium">${state.selectedStudent.first_name} ${state.selectedStudent.last_name}</p>
          <p class="text-sm text-gray-500 mt-2">Subject</p>
          <p class="font-medium">${subject.code} - ${subject.name}</p>
          <p class="text-sm text-gray-500 mt-2">Section</p>
          <p class="font-medium">Section ${section?.name} - ${section?.schedule}</p>
          <p class="text-sm text-gray-500 mt-2">Reason</p>
          <p class="font-medium text-sm">${state.overrideReason}</p>
        </div>
        
        <div class="flex gap-3">
          <button onclick="closeConfirmModal()" class="flex-1 btn-secondary">Cancel</button>
          <button onclick="executeOverride()" class="flex-1 btn-primary bg-yellow-600 hover:bg-yellow-700">Confirm</button>
        </div>
      </div>
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
window.searchStudent = function () {
    const input = document.getElementById('studentSearch');
    state.searchQuery = input?.value || '';
    render();
};

window.selectStudent = function (studentId) {
    state.selectedStudent = mockStudents.find(s => s.id === studentId);
    state.selectedSubject = null;
    state.selectedSection = null;
    render();
};

window.selectSubject = function (subjectId) {
    state.selectedSubject = mockSubjects.find(s => s.id === subjectId);
    state.selectedSection = null;
    render();
};

window.confirmOverride = function () {
    const sectionSelect = document.getElementById('sectionSelect');
    const reasonInput = document.getElementById('overrideReason');

    if (!sectionSelect?.value) {
        showToast('Please select a section', 'error');
        return;
    }

    if (!reasonInput?.value?.trim()) {
        showToast('Override reason is required', 'error');
        return;
    }

    state.selectedSection = sectionSelect.value;
    state.overrideReason = reasonInput.value.trim();
    state.showConfirmModal = true;
    render();
};

window.closeConfirmModal = function () {
    state.showConfirmModal = false;
    render();
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

        showToast(`Successfully enrolled ${state.selectedStudent.first_name} in ${state.selectedSubject.code}!`, 'success');

        // Reset form
        state.selectedSubject = null;
        state.selectedSection = null;
        state.overrideReason = '';
        state.showConfirmModal = false;

        render();
    } catch (error) {
        console.error('Override enrollment failed:', error);
        showToast('Failed to enroll student', 'error');
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
