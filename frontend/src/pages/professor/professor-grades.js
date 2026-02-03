/**
 * Professor Grades Management Page
 * 
 * Allows professors to view and submit grades for students
 * in their assigned sections/subjects.
 */
import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatDate } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Modal } from '../../components/Modal.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay, InlineSpinner } from '../../components/Spinner.js';
import { renderBadge, renderStatusBadge } from '../../atoms/badges/Badge.js';
import { Icon } from '../../atoms/icons/Icon.js';
import { renderEmptyState } from '../../organisms/layout/EmptyState.js';
import { showToast } from '../../components/Toast.js';

// ============================================================
// STATE
// ============================================================

const state = {
  user: null,
  semesters: [],
  selectedSemesterId: null, // Active semester
  semester: null,
  assignedSections: [], // Active sections
  selectedSectionSubject: null, // Active section subject

  // Archive specific state
  archiveSemesters: [],
  archiveSelectedSemesterId: null,
  archiveAssignedSections: [],
  archiveSelectedSectionSubject: null,
  archiveSemesterData: null,

  students: [],
  savingGrades: {},
  searchQuery: '',
  sortBy: 'enrollment__student__last_name',
  sortOrder: 'asc',
  loading: true,
  loadingStudents: false,
  submitting: false,
  gradeHistory: [],
  showHistoryModal: false,
  historyStudentId: null,
  activeTab: 'active' // 'active' or 'archives'
};

const GRADE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '1.00', label: '1.00' },
  { value: '1.25', label: '1.25' },
  { value: '1.50', label: '1.50' },
  { value: '1.75', label: '1.75' },
  { value: '2.00', label: '2.00' },
  { value: '2.25', label: '2.25' },
  { value: '2.50', label: '2.50' },
  { value: '2.75', label: '2.75' },
  { value: '3.00', label: '3.00' },
  { value: '5.00', label: '5.00' },
  { value: 'INC', label: 'INC' },
  { value: 'DROPPED', label: 'Dropped' }
];

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadSemesters();

  if (state.selectedSemesterId) {
    await loadAssignedSections();
  }

  state.loading = false;
  render();
}

// ============================================================
// DATA LOADING
// ============================================================

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      const userData = response.data || response;
      state.user = userData;
      TokenManager.setUser(userData);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading user profile');
  }
}

async function loadSemesters() {
  try {
    const response = await api.get(endpoints.semesters);
    state.semesters = response?.results || response || [];

    // Sort semesters by start date desc
    state.semesters.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const current = state.semesters.find(s => s.is_current);
    state.selectedSemesterId = current?.id || state.semesters[0]?.id;

    // Prepare archive semesters (exclude current)
    state.archiveSemesters = state.semesters.filter(s => !s.is_current);
    if (state.archiveSemesters.length > 0) {
      state.archiveSelectedSemesterId = state.archiveSemesters[0].id;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
  }
}

async function loadAssignedSections() {
  try {
    const url = `${endpoints.grading.sections}?semester=${state.selectedSemesterId}`;
    const response = await api.get(url);
    if (response) {
      state.assignedSections = response.sections || [];
      state.semester = response.semester;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading assigned sections');
    state.assignedSections = [];
  }
}

async function loadArchiveAssignedSections() {
  if (!state.archiveSelectedSemesterId) return;
  try {
    const url = `${endpoints.grading.sections}?semester=${state.archiveSelectedSemesterId}`;
    const response = await api.get(url);
    if (response) {
      state.archiveAssignedSections = response.sections || [];
      state.archiveSemesterData = response.semester;
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading archive sections');
    state.archiveAssignedSections = [];
  }
}

async function loadStudents(sectionSubjectId) {
  state.loadingStudents = true;
  updateStudentsTable();

  try {
    let url = `${endpoints.grading.students}?section_subject=${sectionSubjectId}`;
    if (state.searchQuery) url += `&search=${encodeURIComponent(state.searchQuery)}`;
    if (state.sortBy) {
      const ordering = state.sortOrder === 'desc' ? `-${state.sortBy}` : state.sortBy;
      url += `&ordering=${ordering}`;
    }

    const response = await api.get(url);

    if (response) {
      state.students = response.students || [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading students');
    state.students = [];
  }

  state.loadingStudents = false;
  updateStudentsTable();
}

async function loadArchiveStudents() {
  state.loadingStudents = true;
  updateStudentsTable();

  try {
    // If we have a section focused, load for that section
    // Otherwise, load global search results
    let url = `${endpoints.grading.students}`;

    if (state.searchQuery) {
      url += `?semester=archives&search=${encodeURIComponent(state.searchQuery)}`;
    } else if (state.archiveSelectedSectionSubject) {
      url += `?section_subject=${state.archiveSelectedSectionSubject}`;
      // Fix: Must pass the semester ID so backend doesn't default to current semester
      if (state.archiveSelectedSemesterId) {
        url += `&semester=${state.archiveSelectedSemesterId}`;
      }
    } else {
      state.students = [];
      state.loadingStudents = false;
      updateStudentsTable();
      return;
    }

    if (state.sortBy) {
      const ordering = state.sortOrder === 'desc' ? `-${state.sortBy}` : state.sortBy;
      url += (url.includes('?') ? '&' : '?') + `ordering=${ordering}`;
    }

    const response = await api.get(url);
    if (response) {
      state.students = response.students || [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Searching archives');
    state.students = [];
  }

  state.loadingStudents = false;
  updateStudentsTable();
}

async function loadGradeHistory(subjectEnrollmentId) {
  try {
    const response = await api.get(endpoints.grading.history(subjectEnrollmentId));
    state.gradeHistory = response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading grade history');
    state.gradeHistory = [];
  }
}

// ============================================================
// ACTIONS
// ============================================================

function handleTabChange(tab) {
  state.activeTab = tab;
  state.students = [];
  state.searchQuery = '';

  if (tab === 'archives') {
    if (state.archiveSelectedSemesterId) {
      loadArchiveAssignedSections().then(render);
    } else {
      render();
    }
  } else {
    render();
  }
}

function handleSemesterChange(semesterId) {
  state.selectedSemesterId = semesterId;
  state.selectedSectionSubject = null;
  state.students = [];
  loadAssignedSections().then(render);
}

function handleArchiveSemesterChange(semesterId) {
  state.archiveSelectedSemesterId = semesterId;
  state.archiveSelectedSectionSubject = null;
  state.students = [];
  loadArchiveAssignedSections().then(render);
}

function handleSectionChange(sectionSubjectId) {
  state.selectedSectionSubject = sectionSubjectId;
  state.searchQuery = '';
  state.sortBy = 'enrollment__student__last_name';
  state.sortOrder = 'asc';
  if (sectionSubjectId) {
    render();
    loadStudents(sectionSubjectId);
  } else {
    state.students = [];
    render();
  }
}

function handleArchiveSectionChange(sectionSubjectId) {
  state.archiveSelectedSectionSubject = sectionSubjectId;
  state.searchQuery = '';
  state.sortBy = 'enrollment__student__last_name';
  state.sortOrder = 'asc';
  if (sectionSubjectId) {
    render();
    loadArchiveStudents();
  } else {
    state.students = [];
    render();
  }
}

function handleSearch(query) {
  state.searchQuery = query;
  if (state.activeTab === 'archives') {
    loadArchiveStudents();
  } else if (state.selectedSectionSubject) {
    loadStudents(state.selectedSectionSubject);
  }
}

function handleSort(field) {
  if (state.sortBy === field) {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortBy = field;
    state.sortOrder = 'asc';
  }

  if (state.activeTab === 'archives') {
    loadArchiveStudents();
  } else if (state.selectedSectionSubject) {
    loadStudents(state.selectedSectionSubject);
  }
}

async function submitGrade(subjectEnrollmentId, grade, status, remarks = '') {
  state.savingGrades[subjectEnrollmentId] = true;
  updateStudentRow(subjectEnrollmentId);

  try {
    const payload = {
      subject_enrollment_id: subjectEnrollmentId,
      grade: grade && grade !== 'INC' && grade !== 'DROPPED' ? parseFloat(grade) : null,
      status: status,
      remarks: remarks
    };

    const response = await api.post(endpoints.grading.submit, payload);

    if (response.success) {
      showToast('Grade updated successfully', 'success');
      const student = state.students.find(s => s.subject_enrollment_id === subjectEnrollmentId);
      if (student) {
        student.current_grade = payload.grade;
        student.current_status = payload.status;
        student.current_remarks = remarks;

        if (response.is_resolution) {
          if (state.activeTab === 'archives') loadArchiveStudents();
          else loadStudents(state.selectedSectionSubject);
        }
      }
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Updating grade');
  }

  state.savingGrades[subjectEnrollmentId] = false;
  updateStudentRow(subjectEnrollmentId);
}

function handleGradeChange(subjectEnrollmentId, grade) {
  if (grade === 'INC') {
    showIncModal(subjectEnrollmentId);
    return;
  }

  let status = 'ENROLLED';
  if (grade === 'DROPPED') {
    status = 'DROPPED';
    grade = null;
  } else if (grade) {
    const gradeNum = parseFloat(grade);
    if (!isNaN(gradeNum)) {
      status = gradeNum <= 3.0 ? 'PASSED' : 'FAILED';
    }
  }

  submitGrade(subjectEnrollmentId, grade, status);
}

function showIncModal(subjectEnrollmentId) {
  const student = state.students.find(s => s.subject_enrollment_id === subjectEnrollmentId);
  if (!student) return;

  const currentRemarks = student.current_remarks || '';
  const isResolution = student.is_finalized || student.current_status === 'INC';

  const modal = new Modal({
    title: isResolution ? 'Resolve Student Grade' : 'Incomplete (INC) Grade',
    content: `
      <div class="space-y-4">
        <div class="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p class="text-sm text-blue-800">
            You are ${isResolution ? 'resolving' : 'setting'} a grade for <strong>${student.full_name}</strong>.
          </p>
        </div>
        ${isResolution ? `
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Select New Grade</label>
              <select id="resolve-modal-grade" class="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                ${GRADE_OPTIONS.filter(o => o.value && o.value !== 'INC').map(opt => `
                    <option value="${opt.value}">${opt.label}</option>
                `).join('')}
              </select>
            </div>
        ` : ''}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Remarks / Requirements (Optional)</label>
          <textarea 
            id="inc-modal-remarks" 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            rows="4"
            placeholder="e.g., Missing final project..."
          >${currentRemarks}</textarea>
        </div>
      </div>
    `,
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => {
          m.destroy();
          updateStudentRow(subjectEnrollmentId);
        }
      },
      {
        label: isResolution ? 'Submit Resolution' : 'Confirm INC',
        primary: true,
        onClick: (m) => {
          const remarks = document.getElementById('inc-modal-remarks').value;
          if (isResolution) {
            const grade = document.getElementById('resolve-modal-grade').value;
            let status = 'PASSED';
            if (grade === 'DROPPED') status = 'DROPPED';
            else if (grade) {
              const gradeNum = parseFloat(grade);
              status = gradeNum <= 3.0 ? 'PASSED' : 'FAILED';
            }
            submitGrade(subjectEnrollmentId, grade, status, remarks);
          } else {
            submitGrade(subjectEnrollmentId, 'INC', 'INC', remarks);
          }
          m.destroy();
        }
      }
    ]
  });
  modal.show();
}

async function showHistory(subjectEnrollmentId) {
  state.historyStudentId = subjectEnrollmentId;
  state.showHistoryModal = true;
  state.gradeHistory = [];
  render();

  await loadGradeHistory(subjectEnrollmentId);
  render();
}

// ============================================================
// RENDER
// ============================================================

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading grade management...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
    role: 'PROFESSOR',
    activePage: 'grades',
    user: state.user
  })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Tab Navigation -->
      <div class="flex items-center gap-1 mb-8 p-1 bg-gray-100 rounded-xl w-fit">
        <button 
          onclick="window.handleTabChange('active')"
          class="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${state.activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        >
          Active Grading
        </button>
        <button 
          onclick="window.handleTabChange('archives')"
          class="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${state.activeTab === 'archives' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
        >
          Past Records & Archives
        </button>
      </div>

      <!-- Page Header -->
      <div class="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">${state.activeTab === 'active' ? 'My Sections' : 'Historical Records'}</h1>
          <div class="flex items-center gap-3 mt-1 text-gray-600">
            ${state.activeTab === 'archives' ? `
                <p>Browse by term or use global search.</p>
            ` : `
                <p>
                  ${state.semester ? `${state.semester.name} ${state.semester.academic_year}` : 'No semester selected'}
                </p>
                <div>
                  ${state.semester?.is_grading_open ?
      renderBadge({ text: 'Grading Open', color: 'success', size: 'sm' }) :
      renderBadge({ text: 'Grading Closed', color: 'danger', size: 'sm' })}
                </div>
            `}
          </div>
        </div>
        
        <div class="relative w-full md:w-72">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              ${Icon('search', { size: 'sm' })}
            </span>
            <input 
              type="text" 
              id="student-search"
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
              placeholder="Search student globally..."
              value="${state.searchQuery}"
            >
        </div>
      </div>
      
      <div id="content-area">
        ${state.activeTab === 'active' ? renderActiveView() : renderArchivesView()}
      </div>
      
      ${state.showHistoryModal ? renderHistoryModal() : ''}
    </main>
  `;

  attachEventListeners();
}

function renderActiveView() {
  if (!state.selectedSectionSubject) {
    return `
            <div class="mb-6 flex gap-4">
                <div class="w-64">
                    <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Semester</label>
                    <select 
                        class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        onchange="window.handleSemesterChange(this.value)"
                    >
                        ${state.semesters.map(sem => `
                            <option value="${sem.id}" ${state.selectedSemesterId === sem.id ? 'selected' : ''}>
                                ${sem.name} ${sem.academic_year} ${sem.is_current ? '(Current)' : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            ${renderSectionsTable(state.assignedSections, 'window.handleSectionChange')}
        `;
  }

  return `
        <div class="mb-4">
            <button 
                onclick="window.handleBackToSections()"
                class="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Sections
            </button>
        </div>
        <div id="students-table-container">${renderStudentsTable()}</div>
    `;
}

function renderArchivesView() {
  if (state.searchQuery.length >= 2) {
    return `<div id="students-table-container">${renderStudentsTable()}</div>`;
  }

  if (!state.archiveSelectedSectionSubject) {
    return `
            <div class="mb-6 flex gap-4">
                <div class="w-64">
                    <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Select Past Term</label>
                    <select 
                        class="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        onchange="window.handleArchiveSemesterChange(this.value)"
                    >
                        ${state.archiveSemesters.length === 0 ? '<option>No past terms found</option>' :
        state.archiveSemesters.map(sem => `
                            <option value="${sem.id}" ${state.archiveSelectedSemesterId === sem.id ? 'selected' : ''}>
                                ${sem.name} ${sem.academic_year}
                            </option>
                        `).join('')}
                    </select>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                ${state.archiveAssignedSections.length === 0 ? renderEmptyState({
          icon: 'calendar',
          title: 'No Historical Records',
          message: 'You have no assigned sections for this term.'
        }) : renderSectionsTable(state.archiveAssignedSections, 'window.handleArchiveSectionChange')}
            </div>
        `;
  }

  return `
        <div class="mb-4">
            <button 
                onclick="window.handleBackToArchiveSections()"
                class="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Historical Sections
            </button>
        </div>
        <div id="students-table-container">${renderStudentsTable()}</div>
    `;
}

function renderSectionsTable(sections, viewHandler) {
  if (sections.length === 0) {
    return renderEmptyState({
      icon: 'clipboard',
      title: 'No Sections Found',
      message: 'No active sections found for this selection.'
    });
  }

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${sections.map(section => `
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-semibold text-gray-800">${section.section_name}</span>
                </td>
                <td class="px-6 py-4">
                  <div>
                    <p class="font-mono text-sm font-semibold text-blue-600">${section.subject_code}</p>
                    <p class="text-sm text-gray-600">${section.subject_title}</p>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${section.enrolled_count || 0}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onclick="${viewHandler}('${section.section_subject_id}')"
                    class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStudentsTable() {
  if (state.loadingStudents && state.students.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        ${InlineSpinner()}
        <p class="text-gray-500 mt-2">Loading data...</p>
      </div>
    `;
  }

  const isArchiveTable = state.activeTab === 'archives' || state.searchQuery.length >= 2;
  const sortIcon = (field) => {
    if (state.sortBy !== field) return Icon('chevrons-up-down', { size: 'xs', class: 'text-gray-300 ml-1 inline' });
    return state.sortOrder === 'asc'
      ? Icon('chevron-up', { size: 'xs', class: 'text-blue-500 ml-1 inline' })
      : Icon('chevron-down', { size: 'xs', class: 'text-blue-500 ml-1 inline' });
  };

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      ${state.loadingStudents ? `
        <div class="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden z-10">
          <div class="h-full bg-blue-600 animate-[loading_1.5s_infinite_linear]"></div>
        </div>
      ` : ''}
      
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 class="font-bold text-gray-800">
            ${state.searchQuery.length >= 2 ? 'Global Search Results' : 'Student Records'}
        </h3>
        <span class="text-sm text-gray-500">${state.students.length} record(s)</span>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th 
                class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onclick="window.handleSort('enrollment__student__last_name')"
              >
                Student ${sortIcon('enrollment__student__last_name')}
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Subject
              </th>
              <th 
                class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32 cursor-pointer hover:bg-gray-100 transition-colors"
                onclick="window.handleSort('grade')"
              >
                Grade ${sortIcon('grade')}
              </th>
              <th 
                class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-40 cursor-pointer hover:bg-gray-100 transition-colors"
                onclick="window.handleSort('status')"
              >
                Status ${sortIcon('status')}
              </th>
              ${isArchiveTable ? `
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Action
                </th>
              ` : `
                <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-40">
                  Action
                </th>
              `}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${state.students.length === 0 ? `
              <tr>
                <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                  No records found.
                </td>
              </tr>
            ` : state.students.map(student => renderStudentRow(student)).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <style>
      @keyframes loading {
        0% { transform: translateX(-100%); width: 30%; }
        50% { width: 30%; }
        100% { transform: translateX(333%); width: 30%; }
      }
    </style>
  `;
}

function renderStudentRow(student) {
  const currentStatus = student.current_status;
  let currentGrade = student.current_grade || '';
  const isSaving = state.savingGrades[student.subject_enrollment_id];
  const isPendingInc = student.pending_resolution?.proposed_status === 'INC';

  if ((!currentGrade || currentGrade === '') && (currentStatus === 'INC' || isPendingInc)) {
    currentGrade = 'INC';
  }
  if (!currentGrade && currentStatus === 'DROPPED') currentGrade = 'DROPPED';

  const isFinalized = student.is_finalized;
  const isResolutionAllowed = student.is_resolution_allowed && !student.has_retake;
  const isGradingOpen = state.semester?.is_grading_open;

  const isArchiveOrSearch = state.activeTab === 'archives' || state.searchQuery.length >= 2;
  const canEditActive = !isArchiveOrSearch && !student.pending_resolution && ((!isFinalized && isGradingOpen) || (isResolutionAllowed && (currentStatus === 'INC' || currentStatus === 'FOR_RESOLUTION')));
  const canResolveArchive = isArchiveOrSearch && isResolutionAllowed && !student.pending_resolution;

  let gradeClass = '';
  if (currentGrade && currentGrade !== 'INC' && currentGrade !== 'DROPPED') {
    const gradeNum = parseFloat(currentGrade);
    gradeClass = gradeNum <= 3.0 ? 'passed' : 'failed';
  }

  return `
    <tr data-id="${student.subject_enrollment_id}" class="${isSaving ? 'bg-blue-50/30' : ''} hover:bg-gray-50 transition-colors">
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${student.full_name.charAt(0)}
          </div>
          <div>
            <p class="font-medium text-gray-900">${student.full_name}</p>
            <p class="text-xs text-gray-500">${student.student_number}</p>
            ${isArchiveOrSearch ? `<p class="text-[10px] text-blue-600 font-bold uppercase mt-1">${student.semester_name}</p>` : ''}
          </div>
        </div>
      </td>

      <td class="px-4 py-3">
        <p class="text-sm font-semibold text-gray-800">${student.subject_code}</p>
        <p class="text-xs text-gray-500 truncate max-w-[200px]">${student.subject_title}</p>
      </td>
      
      <td class="px-4 py-3 text-center">
        <div class="flex flex-col items-center">
          ${student.pending_resolution ? `
            <span class="text-xs text-gray-400 line-through">${currentGrade || '-'}</span>
            <span class="text-base font-bold text-blue-600">${student.pending_resolution.proposed_grade}</span>
            <span class="text-[10px] font-bold text-orange-600 mt-1 uppercase">
              ${student.pending_resolution.status === 'PENDING_REGISTRAR' ? 'Pending Registrar' :
        (student.pending_resolution.status === 'PENDING_HEAD' ? 'Pending Head & Registrar' : 'Pending Approval')}
            </span>
          ` : canEditActive ? `
            <div class="flex items-center justify-center gap-1">
              <select 
                class="grade-input ${gradeClass}"
                data-id="${student.subject_enrollment_id}"
                data-field="grade"
                ${isSaving ? 'disabled' : ''}
              >
                ${GRADE_OPTIONS.map(opt => `
                  <option value="${opt.value}" ${currentGrade === opt.value ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
            </div>
          ` : `
            <span class="font-bold ${gradeClass}">${currentGrade || '-'}</span>
          `}
          ${isSaving ? `<div class="mt-1">${InlineSpinner('xs')}</div>` : ''}
        </div>
      </td>
      
      <td class="px-4 py-3 text-center">
        <div class="flex flex-col items-center">
          ${student.pending_resolution ? `
            ${renderStatusBadge(student.pending_resolution.proposed_status)}
            <span class="text-[10px] text-gray-400 mt-1 italic">Proposed Status</span>
          ` : `
            ${renderStatusBadge(currentStatus)}
            ${student.has_retake ? '<div class="text-[10px] text-red-500 font-bold mt-1">RETAKE ACTIVE</div>' : ''}
          `}
        </div>
      </td>

     ${isArchiveOrSearch ? `
        <td class="px-4 py-3 text-center">
            ${student.retake_eligibility_date ? `
                <span class="text-xs text-red-600 font-medium">Retake after ${formatDate(student.retake_eligibility_date)}</span>
            ` : '<span class="text-gray-400">-</span>'}
        </td>
      ` : ''}
      
      <td class="px-4 py-3 text-center">
        ${student.pending_resolution ? `
            <button 
                onclick="window.revokeResolution('${student.pending_resolution.id}')"
                class="px-3 py-1 bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
                ${isSaving ? 'disabled' : ''}
            >
                Revoke Request
            </button>
        ` : (currentGrade === 'INC') ? `
            <div class="flex items-center justify-center gap-2">
                <button 
                    onclick="window.showIncModal('${student.subject_enrollment_id}')"
                    class="px-3 py-1 bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg hover:bg-blue-200 transition-colors"
                    ${isSaving ? 'disabled' : ''}
                >
                    Resolve
                </button>
                 <button 
                    onclick="document.querySelector('select[data-id=\'${student.subject_enrollment_id}\']').focus()"
                    class="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                    ${isSaving ? 'disabled' : ''}
                >
                    Edit
                </button>
            </div>
        ` : (isArchiveOrSearch && canResolveArchive) ? `
             <button 
                onclick="window.showIncModal('${student.subject_enrollment_id}')"
                class="px-3 py-1 bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-lg hover:bg-orange-200 transition-colors"
                ${isSaving ? 'disabled' : ''}
            >
                Resolve
            </button>
        ` : '-'}
      </td>
    </tr>
  `;
}

function updateStudentsTable() {
  const container = document.getElementById('students-table-container');
  if (container) {
    container.innerHTML = renderStudentsTable();
    attachTableEventListeners();
  }
}

function updateStudentRow(subjectEnrollmentId) {
  const row = document.querySelector(`tr[data-id="${subjectEnrollmentId}"]`);
  if (row) {
    const student = state.students.find(s => s.subject_enrollment_id === subjectEnrollmentId);
    if (student) {
      row.outerHTML = renderStudentRow(student);
      attachTableEventListeners();
    }
  }
}

function renderHistoryModal() {
  const student = state.students.find(s => s.subject_enrollment_id === state.historyStudentId);

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-gray-800">Grade History</h3>
            <p class="text-sm text-gray-500">${student?.full_name || 'Student'}</p>
          </div>
          <button onclick="window.closeHistoryModal()" class="p-2 hover:bg-gray-100 rounded-lg">
            ${Icon('x', { size: 'md' })}
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          ${state.gradeHistory.length === 0 ? `
            <div class="text-center py-8"><p class="text-gray-500">No history found</p></div>
          ` : `
            <div class="space-y-4">
              ${state.gradeHistory.map(entry => `
                <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-medium">${entry.previous_grade || '-'} → ${entry.new_grade || '-'}</span>
                      <span class="text-xs text-gray-500">${formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function attachEventListeners() {
  const searchInput = document.getElementById('student-search');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        handleSearch(state.searchQuery);
      }, 500);
    });
  }

  attachTableEventListeners();
}

function attachTableEventListeners() {
  document.querySelectorAll('[data-field="grade"]').forEach(el => {
    el.addEventListener('change', (e) => {
      handleGradeChange(e.target.dataset.id, e.target.value);
    });
  });
}

function handleBackToSections() {
  state.selectedSectionSubject = null;
  state.students = [];
  state.searchQuery = '';
  render();
}

function handleBackToArchiveSections() {
  state.archiveSelectedSectionSubject = null;
  state.students = [];
  state.searchQuery = '';
  render();
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleTabChange = handleTabChange;
window.handleSemesterChange = handleSemesterChange;
window.handleArchiveSemesterChange = handleArchiveSemesterChange;
window.handleSectionChange = handleSectionChange;
window.handleArchiveSectionChange = handleArchiveSectionChange;
window.handleBackToSections = handleBackToSections;
window.handleBackToArchiveSections = handleBackToArchiveSections;
window.handleSort = handleSort;
window.showIncModal = showIncModal;
window.revokeResolution = async (resolutionId) => {
  if (!confirm('Are you sure you want to revoke this grade resolution request?')) return;

  try {
    state.loading = true;
    render(); // Show global loading or just toast? Let's assume global loading for safety or optimistic update.
    // Actually, just loading overlay is safer.

    // Note: We need to verify the endpoint structure.
    // The GradeResolutionViewSet is at /grade-resolutions/
    // So DELETE should be at /api/v1/enrollment/grade-resolutions/{id}/
    const response = await api.delete(`/enrollment/grade-resolutions/${resolutionId}/`);

    if (response) {
      showToast('Resolution request revoked successfully', 'success');
      // Refresh data
      if (state.activeTab === 'archives') loadArchiveStudents();
      else if (state.selectedSectionSubject) loadStudents(state.selectedSectionSubject);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Revoking resolution');
    state.loading = false;
    render();
  }
};
window.closeHistoryModal = () => {
  state.showHistoryModal = false;
  render();
};

window.logout = function () {
  TokenManager.clearTokens();
  window.location.href = '/login.html';
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
