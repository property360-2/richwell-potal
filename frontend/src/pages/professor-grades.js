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
    semester: null,
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
    await loadAssignedSections();

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

async function loadAssignedSections() {
    try {
        const response = await api.get(endpoints.grading.sections);
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
        <h1 class="text-3xl font-bold text-gray-800">Grade Management</h1>
        <p class="text-gray-600 mt-1">
          ${state.semester ? `${state.semester.name} ${state.semester.academic_year}` : 'No active semester'}
          ${state.semester?.is_grading_open ?
            renderBadge({ text: 'Grading Open', color: 'success', size: 'sm' }) :
            renderBadge({ text: 'Grading Closed', color: 'danger', size: 'sm' })}
        </p>
      </div>
      
      <!-- Section Selector -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[250px]">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Select Section & Subject
            </label>
            <select 
              id="section-select" 
              class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onchange="window.handleSectionChange(this.value)"
            >
              <option value="">-- Select a section --</option>
              ${state.assignedSections.map(ss => `
                <option value="${ss.section_subject_id}" ${state.selectedSectionSubject === ss.section_subject_id ? 'selected' : ''}>
                  ${ss.section_name} - ${ss.subject_code}: ${ss.subject_title}
                </option>
              `).join('')}
            </select>
          </div>
          
          ${Object.keys(state.modifiedGrades).length > 0 ? `
            <button 
              onclick="window.submitAllGrades()"
              ${state.submitting ? 'disabled' : ''}
              class="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              ${state.submitting ? InlineSpinner() : Icon('check', { size: 'sm' })}
              Save All Changes (${Object.keys(state.modifiedGrades).length})
            </button>
          ` : ''}
        </div>
      </div>
      
      <!-- Students Table -->
      ${renderStudentsTable()}
      
      <!-- History Modal -->
      ${state.showHistoryModal ? renderHistoryModal() : ''}
    </main>
  `;

    attachEventListeners();
}

function renderStudentsTable() {
    if (!state.selectedSectionSubject) {
        return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        ${renderEmptyState({
            icon: 'clipboard',
            title: 'Select a Section',
            message: 'Choose a section and subject from the dropdown above to view and grade students.'
        })}
      </div>
    `;
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

    // Determine grade class
    let gradeClass = '';
    if (currentGrade) {
        const gradeNum = parseFloat(currentGrade);
        gradeClass = gradeNum <= 3.0 ? 'passed' : 'failed';
    }

    return `
    <tr class="${isModified ? 'bg-yellow-50' : ''} ${isFinalized ? 'opacity-60' : ''} hover:bg-gray-50">
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
        ${isFinalized ? `
          <span class="font-bold ${gradeClass}">${currentGrade || '-'}</span>
        ` : `
          <select 
            class="grade-input ${isModified ? 'modified' : ''} ${gradeClass}"
            data-id="${student.subject_enrollment_id}"
            data-field="grade"
            ${currentStatus === 'INC' || currentStatus === 'DROPPED' ? 'disabled' : ''}
          >
            ${GRADE_OPTIONS.map(opt => `
              <option value="${opt.value}" ${currentGrade === opt.value ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        `}
      </td>
      
      <td class="px-4 py-3 text-center">
        ${isFinalized ? `
          ${renderStatusBadge(currentStatus)}
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
        ${isFinalized ? `
          <span class="text-sm text-gray-500">-</span>
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

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleSectionChange = handleSectionChange;
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
