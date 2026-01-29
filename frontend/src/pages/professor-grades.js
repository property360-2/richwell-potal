/**
 * Professor Grades Management Page
 * 
 * Allows professors to view and submit grades for students
 * in their assigned sections/subjects.
 */
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay, InlineSpinner } from '../components/Spinner.js';
import { renderBadge, renderStatusBadge } from '../atoms/badges/Badge.js';
import { Icon } from '../atoms/icons/Icon.js';
import { renderEmptyState } from '../organisms/layout/EmptyState.js';
import { showToast } from '../components/Toast.js';

// ============================================================
// STATE
// ============================================================

const state = {
  user: null,
  semesters: [],
  selectedSemesterId: null,
  semester: null, // Selected semester detail
  assignedSections: [],
  selectedSectionSubject: null,
  students: [],
  modifiedGrades: {}, // { subjectEnrollmentId: { grade, status, remarks } }
  loading: true,
  loadingStudents: false,
  submitting: false,
  gradeHistory: [],
  showHistoryModal: false,
  historyStudentId: null
};

// Grade options for dropdown
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
  { value: '5.00', label: '5.00' }
];

const STATUS_OPTIONS = [
  { value: 'ENROLLED', label: 'Enrolled' },
  { value: 'PASSED', label: 'Passed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'INC', label: 'Incomplete' },
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
    const current = state.semesters.find(s => s.is_current);
    state.selectedSemesterId = current?.id || state.semesters[0]?.id;
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

async function loadStudents(sectionSubjectId) {
  state.loadingStudents = true;
  state.students = [];
  state.modifiedGrades = {};
  render();

  try {
    const url = `${endpoints.grading.students}?section_subject=${sectionSubjectId}`;
    const response = await api.get(url);

    if (response) {
      state.students = response.students || [];
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading students');
    state.students = [];
  }

  state.loadingStudents = false;
  render();
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

function handleSemesterChange(semesterId) {
  state.selectedSemesterId = semesterId;
  state.selectedSectionSubject = null;
  state.students = [];
  state.modifiedGrades = {};
  loadAssignedSections().then(render);
}

function handleSectionChange(sectionSubjectId) {
  state.selectedSectionSubject = sectionSubjectId;
  if (sectionSubjectId) {
    loadStudents(sectionSubjectId);
  } else {
    state.students = [];
    state.modifiedGrades = {};
    render();
  }
}

function handleGradeChange(subjectEnrollmentId, grade) {
  if (!state.modifiedGrades[subjectEnrollmentId]) {
    state.modifiedGrades[subjectEnrollmentId] = {};
  }
  state.modifiedGrades[subjectEnrollmentId].grade = grade;

  // Auto-calculate status
  if (grade) {
    const gradeNum = parseFloat(grade);
    if (gradeNum <= 3.0) {
      state.modifiedGrades[subjectEnrollmentId].status = 'PASSED';
    } else {
      state.modifiedGrades[subjectEnrollmentId].status = 'FAILED';
    }
  }

  render();
}

function handleStatusChange(subjectEnrollmentId, status) {
  if (!state.modifiedGrades[subjectEnrollmentId]) {
    state.modifiedGrades[subjectEnrollmentId] = {};
  }
  state.modifiedGrades[subjectEnrollmentId].status = status;

  // Clear grade if INC or DROPPED
  if (status === 'INC' || status === 'DROPPED') {
    state.modifiedGrades[subjectEnrollmentId].grade = null;
  }

  render();
}

function handleRemarksChange(subjectEnrollmentId, remarks) {
  if (!state.modifiedGrades[subjectEnrollmentId]) {
    state.modifiedGrades[subjectEnrollmentId] = {};
  }
  state.modifiedGrades[subjectEnrollmentId].remarks = remarks;
}

async function submitSingleGrade(subjectEnrollmentId) {
  const modifiedData = state.modifiedGrades[subjectEnrollmentId];
  if (!modifiedData) return;

  const student = state.students.find(s => s.subject_enrollment_id === subjectEnrollmentId);
  if (!student) return;

  // Validate INC requires remarks
  if (modifiedData.status === 'INC' && !modifiedData.remarks) {
    showToast('Remarks are required for Incomplete (INC) status', 'error');
    return;
  }

  state.submitting = true;
  render();

  try {
    const payload = {
      subject_enrollment_id: subjectEnrollmentId,
      grade: modifiedData.grade ? parseFloat(modifiedData.grade) : null,
      status: modifiedData.status || student.current_status,
      remarks: modifiedData.remarks || ''
    };

    await api.post(endpoints.grading.submit, payload);

    showToast(`Grade submitted for ${student.full_name}`, 'success');

    // Clear modification and reload
    delete state.modifiedGrades[subjectEnrollmentId];
    await loadStudents(state.selectedSectionSubject);

  } catch (error) {
    ErrorHandler.handle(error, 'Submitting grade');
  }

  state.submitting = false;
  render();
}

async function submitAllGrades() {
  const modifiedIds = Object.keys(state.modifiedGrades);
  if (modifiedIds.length === 0) {
    showToast('No grades to submit', 'warning');
    return;
  }

  // Validate all INC have remarks
  for (const id of modifiedIds) {
    const data = state.modifiedGrades[id];
    if (data.status === 'INC' && !data.remarks) {
      const student = state.students.find(s => s.subject_enrollment_id === id);
      showToast(`Remarks required for ${student?.full_name || 'student'} (INC status)`, 'error');
      return;
    }
  }

  state.submitting = true;
  render();

  try {
    const grades = modifiedIds.map(id => {
      const data = state.modifiedGrades[id];
      const student = state.students.find(s => s.subject_enrollment_id === id);
      return {
        subject_enrollment_id: id,
        grade: data.grade ? parseFloat(data.grade) : null,
        status: data.status || student?.current_status,
        remarks: data.remarks || ''
      };
    });

    const response = await api.post(endpoints.grading.bulk, { grades });

    if (response.success) {
      showToast(`${response.submitted_count} grade(s) submitted successfully`, 'success');
    } else {
      showToast(`Submitted ${response.submitted_count}, ${response.error_count} error(s)`, 'warning');
    }

    // Clear modifications and reload
    state.modifiedGrades = {};
    await loadStudents(state.selectedSectionSubject);

  } catch (error) {
    ErrorHandler.handle(error, 'Submitting grades');
  }

  state.submitting = false;
  render();
}

async function showHistory(subjectEnrollmentId) {
  state.historyStudentId = subjectEnrollmentId;
  state.showHistoryModal = true;
  state.gradeHistory = [];
  render();

  await loadGradeHistory(subjectEnrollmentId);
  render();
}

function closeHistoryModal() {
  state.showHistoryModal = false;
  state.gradeHistory = [];
  state.historyStudentId = null;
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
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800">My Sections</h1>
        <div class="flex items-center gap-3 mt-1">
          <p class="text-gray-600">
            ${state.semester ? `${state.semester.name} ${state.semester.academic_year}` : 'No semester selected'}
          </p>
        <div class="mt-2">
          ${state.semester?.is_grading_open ?
      renderBadge({ text: 'Grading Open', color: 'success', size: 'sm' }) :
      renderBadge({ text: 'Grading Closed', color: 'danger', size: 'sm' })}
          
          ${state.semester?.grading_start_date ? `
            <p class="text-sm text-gray-500 mt-1 font-medium italic">
              grading date: ${formatDate(state.semester.grading_start_date)} - ${formatDate(state.semester.grading_end_date)}
            </p>
          ` : ''}
        </div>
        </div>
      </div>
      
      
      ${!state.selectedSectionSubject ? renderSectionsTable() : `
        <!-- Back Button -->
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

        <!-- Save Button Bar -->
        ${Object.keys(state.modifiedGrades).length > 0 ? `
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div class="flex justify-end">
              <button 
                onclick="window.submitAllGrades()"
                ${state.submitting ? 'disabled' : ''}
                class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                ${state.submitting ? InlineSpinner() : Icon('check', { size: 'sm' })}
                Save Changes (${Object.keys(state.modifiedGrades).length})
              </button>
            </div>
          </div>
        ` : ''}
        
        <!-- Students Table -->
        ${renderStudentsTable()}
      `}
      
      <!-- History Modal -->
      ${state.showHistoryModal ? renderHistoryModal() : ''}
    </main>
  `;

  attachEventListeners();
}

function renderSectionsTable() {
  if (state.assignedSections.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        ${renderEmptyState({
      icon: 'clipboard',
      title: 'No Sections Assigned',
      message: 'No sections assigned as of the moment.'
    })}
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
              <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            ${state.assignedSections.map(section => `
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="font-semibold text-gray-800">${section.section_name}</span>
                </td>
                <td class="px-6 py-4">
                  <div>
                    <p class="font-mono text-sm font-semibold text-blue-600">${section.subject_code}</p>
                    <p class="text-sm text-gray-600">${section.subject_title}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${section.units} units</p>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-600">
                    ${section.schedule_display || '-'}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-600">${section.room || '-'}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ${section.enrolled_count || 0}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onclick="window.handleSectionChange('${section.section_subject_id}')"
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
  if (!state.selectedSectionSubject) {
    return '';
  }

  if (state.loadingStudents) {
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        ${InlineSpinner()}
        <p class="text-gray-500 mt-2">Loading students...</p>
      </div>
    `;
  }

  if (state.students.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        ${renderEmptyState({
      icon: 'users',
      title: 'No Students Found',
      message: 'No students are enrolled in this section-subject combination.'
    })}
      </div>
    `;
  }

  const selectedSection = state.assignedSections.find(s => s.section_subject_id === state.selectedSectionSubject);

  return `
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          <h3 class="font-bold text-gray-800">${selectedSection?.section_name || ''} - ${selectedSection?.subject_code || ''}</h3>
          <p class="text-sm text-gray-500">${state.students.length} student(s) enrolled</p>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-gray-500">Legend:</span>
          ${renderBadge({ text: 'Modified', color: 'warning', size: 'sm' })}
          ${renderBadge({ text: 'Finalized', color: 'secondary', size: 'sm' })}
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Student</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">Grade</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Status</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-48">Remarks</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${state.students.map(student => renderStudentRow(student)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderStudentRow(student) {
  const modified = state.modifiedGrades[student.subject_enrollment_id];
  const currentGrade = modified?.grade !== undefined ? modified.grade : (student.current_grade || '');
  const currentStatus = modified?.status || student.current_status;
  const isModified = !!modified;
  const isFinalized = student.is_finalized;

  // Grading rules:
  // 1. Finalized grades cannot be modified by professors.
  // 2. INC resolution allowed if is_resolution_allowed is true AND no retake exists.
  // 3. Normal grading allowed if semester is_grading_open is true.
  // 3. Normal grading allowed if semester is_grading_open is true.
  const isResolutionAllowed = student.is_resolution_allowed && !student.has_retake;
  const isGradingOpen = state.semester?.is_grading_open;

  // LOGIC FIX: Allow editing if it's an INC resolution regardless of finalization status
  const isResolutionContext = isResolutionAllowed && (currentStatus === 'INC' || currentStatus === 'FOR_RESOLUTION');
  const canEdit = !student.pending_resolution && ((!isFinalized && isGradingOpen) || isResolutionContext);

  // Determine grade class
  let gradeClass = '';
  if (currentGrade) {
    const gradeNum = parseFloat(currentGrade);
    gradeClass = gradeNum <= 3.0 ? 'passed' : 'failed';
  }

  return `
    <tr class="${isModified ? 'bg-yellow-50' : ''} ${!canEdit && !student.pending_resolution ? 'opacity-70 bg-gray-50' : ''} hover:bg-gray-50">
      <td class="px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${student.full_name.charAt(0)}
          </div>
          <div>
            <p class="font-medium text-gray-900">${student.full_name}</p>
            <p class="text-sm text-gray-500">${student.student_number}</p>
          </div>
        </div>
      </td>
      
      <td class="px-4 py-3 text-center">
        ${student.pending_resolution ? `
          <div class="flex flex-col items-center">
            <span class="text-xs text-gray-400 line-through">${currentGrade || '-'}</span>
            <span class="text-base font-bold text-blue-600">${student.pending_resolution.proposed_grade}</span>
            <span class="text-[10px] font-bold text-orange-600 mt-1 uppercase">Pending Approval</span>
          </div>
        ` : !canEdit ? `
          <span class="font-bold ${gradeClass}">${currentGrade || '-'}</span>
        ` : `
          <select 
            class="grade-input ${isModified ? 'modified' : ''} ${gradeClass}"
            data-id="${student.subject_enrollment_id}"
            data-field="grade"
            ${(currentStatus === 'INC' || currentStatus === 'FOR_RESOLUTION') && !isResolutionContext ? 'disabled' : ''}
          >
            ${GRADE_OPTIONS.map(opt => `
              <option value="${opt.value}" ${currentGrade === opt.value ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        `}
      </td>
      
      <td class="px-4 py-3 text-center">
        ${!canEdit && !student.pending_resolution ? `
          ${renderStatusBadge(currentStatus)}
          ${student.has_retake ? '<div class="text-[10px] text-red-500 font-bold mt-1">RETAKE ACTIVE</div>' : ''}
        ` : student.pending_resolution ? `
          <div class="flex flex-col items-center">
            ${renderStatusBadge(student.pending_resolution.proposed_status)}
            <span class="text-[10px] text-gray-400 mt-1 italic">Proposed Status</span>
          </div>
        ` : `
          <select 
            class="status-select ${isModified ? 'modified' : ''}"
            data-id="${student.subject_enrollment_id}"
            data-field="status"
          >
            ${STATUS_OPTIONS.map(opt => `
              <option value="${opt.value}" ${currentStatus === opt.value ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        `}
      </td>
      
      <td class="px-4 py-3">
        ${!canEdit && !student.pending_resolution ? `
          <span class="text-sm text-gray-500">${isFinalized ? 'Finalized' : isResolutionAllowed ? 'INC Resolution' : 'Closed'}</span>
        ` : student.pending_resolution ? `
           <span class="text-xs text-orange-600 font-medium">Awaiting Registrar & Head Review</span>
        ` : `
          <input 
            type="text" 
            class="w-full px-2 py-1 text-sm border border-gray-200 rounded ${isModified ? 'bg-yellow-50' : ''}"
            placeholder="Optional remarks..."
            data-id="${student.subject_enrollment_id}"
            data-field="remarks"
            value="${modified?.remarks || ''}"
          />
        `}
      </td>
      
      <td class="px-4 py-3 text-center">
        <div class="flex items-center justify-center gap-1">
          ${!isFinalized && isModified ? `
            <button 
              onclick="window.submitSingleGrade('${student.subject_enrollment_id}')"
              class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Save grade"
              ${state.submitting ? 'disabled' : ''}
            >
              ${Icon('check', { size: 'sm' })}
            </button>
          ` : ''}
          <button 
            onclick="window.showHistory('${student.subject_enrollment_id}')"
            class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="View history"
          >
            ${Icon('clock', { size: 'sm' })}
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderHistoryModal() {
  const student = state.students.find(s => s.subject_enrollment_id === state.historyStudentId);

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="window.closeHistoryModal()">
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onclick="event.stopPropagation()">
        <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-gray-800">Grade History</h3>
            <p class="text-sm text-gray-500">${student?.full_name || 'Student'} - ${student?.subject_code || ''}</p>
          </div>
          <button 
            onclick="window.closeHistoryModal()"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ${Icon('x', { size: 'md' })}
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[60vh]">
          ${state.gradeHistory.length === 0 ? `
            <div class="text-center py-8">
              <p class="text-gray-500">No grade history found</p>
            </div>
          ` : `
            <div class="space-y-4">
              ${state.gradeHistory.map(entry => `
                <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div class="w-2 h-2 mt-2 rounded-full ${entry.is_finalization ? 'bg-green-500' : 'bg-blue-500'}"></div>
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-medium text-gray-900">
                        ${entry.previous_grade || '-'} → ${entry.new_grade || '-'}
                      </span>
                      <span class="text-xs text-gray-500">
                        ${formatDate(entry.created_at)}
                      </span>
                    </div>
                    <div class="text-sm text-gray-600 mb-1">
                      Status: ${entry.previous_status} → ${entry.new_status}
                    </div>
                    ${entry.change_reason ? `
                      <div class="text-sm text-gray-500 italic">
                        "${entry.change_reason}"
                      </div>
                    ` : ''}
                    <div class="text-xs text-gray-400 mt-1">
                      By: ${entry.changed_by_name || 'System'}
                      ${entry.is_finalization ? renderBadge({ text: 'Finalized', color: 'success', size: 'sm' }) : ''}
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
  // Grade input changes
  document.querySelectorAll('[data-field="grade"]').forEach(el => {
    el.addEventListener('change', (e) => {
      handleGradeChange(e.target.dataset.id, e.target.value);
    });
  });

  // Status select changes
  document.querySelectorAll('[data-field="status"]').forEach(el => {
    el.addEventListener('change', (e) => {
      handleStatusChange(e.target.dataset.id, e.target.value);
    });
  });

  // Remarks input changes
  document.querySelectorAll('[data-field="remarks"]').forEach(el => {
    el.addEventListener('input', (e) => {
      handleRemarksChange(e.target.dataset.id, e.target.value);
    });
  });
}

function handleBackToSections() {
  state.selectedSectionSubject = null;
  state.students = [];
  state.modifiedGrades = {};
  render();
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleSemesterChange = handleSemesterChange;
window.handleSectionChange = handleSectionChange;
window.handleBackToSections = handleBackToSections;
window.submitSingleGrade = submitSingleGrade;
window.submitAllGrades = submitAllGrades;
window.showHistory = showHistory;
window.closeHistoryModal = closeHistoryModal;

window.logout = function () {
  TokenManager.clearTokens();
  window.location.href = '/login.html';
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
