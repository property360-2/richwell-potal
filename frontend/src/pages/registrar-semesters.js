import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { ConfirmModal, AlertModal } from '../components/Modal.js';

// State management
const state = {
  semesters: [],
  filteredSemesters: [],
  selectedSemester: null,
  activeSemester: null,
  showAddModal: false,
  showEditModal: false,
  showDeleteConfirm: false,
  loading: false,
  error: null,
  filterYear: 'all',
  formData: {
    name: '1st Semester',
    academic_year: '',
    start_date: '',
    end_date: '',
    enrollment_start_date: '',
    enrollment_end_date: '',
    is_current: false
  }
};

// Initialize
async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadSemesters();
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
    ErrorHandler.handle(error, 'Loading user profile', { showToast: false });
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

// API Functions
async function loadSemesters() {
  try {
    state.loading = true;
    state.error = null;
    render();

    const response = await api.get(endpoints.semesters);

    if (response && response.semesters) {
      state.semesters = response.semesters;
      state.activeSemester = response.semesters.find(s => s.is_current);
      filterSemesters();
    } else if (Array.isArray(response)) {
      state.semesters = response;
      state.activeSemester = response.find(s => s.is_current);
      filterSemesters();
    } else {
      throw new Error('Failed to load semesters');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading semesters');
    state.error = 'Failed to load semesters. Please try again.';
  } finally {
    state.loading = false;
    render();
  }
}

async function createSemester(data) {
  try {
    state.loading = true;
    render();

    const response = await api.post(endpoints.semesters, data);

    if (response && response.id) {
      Toast.success('Semester created successfully!');
      state.showAddModal = false;
      resetForm();
      await loadSemesters();
    } else {
      throw new Error(response?.error || 'Failed to create semester');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Creating semester');
  } finally {
    state.loading = false;
    render();
  }
}

async function updateSemester(id, data) {
  try {
    state.loading = true;
    render();

    const response = await api.put(endpoints.semesterDetail(id), data);

    if (response && response.id) {
      Toast.success('Semester updated successfully!');
      state.showEditModal = false;
      state.selectedSemester = null;
      resetForm();
      await loadSemesters();
    } else {
      throw new Error(response?.error || 'Failed to update semester');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Updating semester');
  } finally {
    state.loading = false;
    render();
  }
}

async function deleteSemester(id) {
  try {
    state.loading = true;
    render();

    const response = await api.delete(endpoints.semesterDetail(id));

    if (response && (response.success || response.message)) {
      Toast.success('Semester deleted successfully!');
      state.showDeleteConfirm = false;
      state.selectedSemester = null;
      await loadSemesters();
    } else {
      throw new Error(response?.error || 'Failed to delete semester');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting semester');
  } finally {
    state.loading = false;
    render();
  }
}

async function setCurrentSemester(id) {
  try {
    state.loading = true;
    render();

    const response = await api.post(endpoints.setCurrentSemester(id), {});

    if (response && (response.success || response.message)) {
      Toast.success(response.message || 'Semester set as current successfully!');
      await loadSemesters();
    } else {
      throw new Error(response?.error || 'Failed to set current semester');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Setting current semester');
  } finally {
    state.loading = false;
    render();
  }
}

// NEW: Update semester term status
async function updateSemesterStatus(id, newStatus) {
  try {
    state.loading = true;
    render();

    const response = await api.patch(endpoints.semesterDetail(id), { status: newStatus });

    if (response && response.id) {
      Toast.success(`Term status updated to ${formatTermStatus(newStatus)}`);
      await loadSemesters();
    } else {
      throw new Error(response?.error || 'Failed to update status');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Updating term status');
  } finally {
    state.loading = false;
    render();
  }
}

function formatTermStatus(status) {
  const labels = {
    'SETUP': 'Setup',
    'ENROLLMENT_OPEN': 'Enrollment Open',
    'ENROLLMENT_CLOSED': 'Enrollment Closed',
    'GRADING_OPEN': 'Grading Open',
    'CLOSED': 'Closed'
  };
  return labels[status] || status;
}

function getTermStatusColor(status) {
  const colors = {
    'SETUP': 'bg-gray-50 text-gray-700',
    'ENROLLMENT_OPEN': 'bg-green-50 text-green-700 border-green-300',
    'ENROLLMENT_CLOSED': 'bg-yellow-50 text-yellow-700 border-yellow-300',
    'GRADING_OPEN': 'bg-blue-50 text-blue-700 border-blue-300',
    'CLOSED': 'bg-red-50 text-red-700 border-red-300'
  };
  return colors[status] || '';
}

function handleStatusChange(semesterId, newStatus) {
  updateSemesterStatus(semesterId, newStatus);
}

// Helper Functions
function filterSemesters() {
  if (state.filterYear === 'all') {
    state.filteredSemesters = state.semesters;
  } else {
    state.filteredSemesters = state.semesters.filter(s => s.academic_year === state.filterYear);
  }
}

function resetForm() {
  state.formData = {
    name: '1st Semester',
    academic_year: '',
    start_date: '',
    end_date: '',
    enrollment_start_date: '',
    enrollment_end_date: '',
    is_current: false
  };
}

function validateDates(data) {
  const errors = [];

  // Required fields
  if (!data.name) errors.push('Semester name is required');
  if (!data.academic_year) errors.push('Academic year is required');
  if (!data.start_date) errors.push('Start date is required');
  if (!data.end_date) errors.push('End date is required');

  // Academic year format
  if (data.academic_year && !data.academic_year.match(/^\d{4}-\d{4}$/)) {
    errors.push('Academic year must be in format YYYY-YYYY (e.g., 2024-2025)');
  }

  // Date validations
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end <= start) {
      errors.push('End date must be after start date');
    }
  }

  if (data.enrollment_start_date && data.enrollment_end_date) {
    const enrollStart = new Date(data.enrollment_start_date);
    const enrollEnd = new Date(data.enrollment_end_date);
    if (enrollEnd <= enrollStart) {
      errors.push('Enrollment end date must be after enrollment start date');
    }
  }

  return errors;
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
}

function getUniqueAcademicYears() {
  const years = [...new Set(state.semesters.map(s => s.academic_year))];
  return years.sort().reverse();
}

// Event Handlers
function handleOpenAddModal() {
  resetForm();
  state.showAddModal = true;
  render();
}

function handleCloseAddModal() {
  state.showAddModal = false;
  resetForm();
  render();
}

function handleOpenEditModal(semester) {
  state.selectedSemester = semester;
  state.formData = {
    name: semester.name,
    academic_year: semester.academic_year,
    start_date: semester.start_date,
    end_date: semester.end_date,
    enrollment_start_date: semester.enrollment_start_date || '',
    enrollment_end_date: semester.enrollment_end_date || '',
    is_current: semester.is_current
  };
  state.showEditModal = true;
  render();
}

function handleCloseEditModal() {
  state.showEditModal = false;
  state.selectedSemester = null;
  resetForm();
  render();
}

function handleOpenDeleteConfirm(semester) {
  state.selectedSemester = semester;
  state.showDeleteConfirm = true;
  render();
}

function handleCloseDeleteConfirm() {
  state.showDeleteConfirm = false;
  state.selectedSemester = null;
  render();
}

function handleFormChange(field, value) {
  state.formData[field] = value;
}

async function handleCreateSubmit(e) {
  e.preventDefault();

  const errors = validateDates(state.formData);
  if (errors.length > 0) {
    await AlertModal('Please fix the following errors:\n\n' + errors.join('\n'), 'Validation Error');
    return;
  }

  // Remove empty optional fields
  const data = { ...state.formData };
  if (!data.enrollment_start_date) delete data.enrollment_start_date;
  if (!data.enrollment_end_date) delete data.enrollment_end_date;

  createSemester(data);
}

async function handleUpdateSubmit(e) {
  e.preventDefault();

  const errors = validateDates(state.formData);
  if (errors.length > 0) {
    await AlertModal('Please fix the following errors:\n\n' + errors.join('\n'), 'Validation Error');
    return;
  }

  // Remove empty optional fields
  const data = { ...state.formData };
  if (!data.enrollment_start_date) delete data.enrollment_start_date;
  if (!data.enrollment_end_date) delete data.enrollment_end_date;

  updateSemester(state.selectedSemester.id, data);
}

function handleDeleteConfirm() {
  deleteSemester(state.selectedSemester.id);
}

async function handleSetCurrent(semester) {
  if (semester.is_current) {
    await AlertModal('This semester is already set as current', 'Notice');
    return;
  }

  const confirmed = await ConfirmModal({
    title: 'Set as Current Semester',
    message: `Set "${semester.name} ${semester.academic_year}" as the current semester?`,
    confirmLabel: 'Set as Current',
    danger: false
  });

  if (confirmed) {
    setCurrentSemester(semester.id);
  }
}

function handleFilterChange(year) {
  state.filterYear = year;
  filterSemesters();
  render();
}

// Render Functions

function renderToolbar() {
  const years = getUniqueAcademicYears();

  return `
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex justify-between items-center">
        <div class="flex space-x-4">
          <button onclick="window.semestersApp.handleOpenAddModal()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">
            + Add Semester
          </button>

          <div class="flex items-center space-x-2">
            <label class="text-sm font-medium text-gray-700">Filter:</label>
            <select onchange="window.semestersApp.handleFilterChange(this.value)"
                    class="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
              <option value="all" ${state.filterYear === 'all' ? 'selected' : ''}>All Years</option>
              ${years.map(year => `
                <option value="${year}" ${state.filterYear === year ? 'selected' : ''}>${year}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="text-sm text-gray-600">
          Total: ${state.filteredSemesters.length} semester(s)
        </div>
      </div>
    </div>
  `;
}

function renderSemesterTable() {
  if (state.loading) {
    return `
      <div class="bg-white rounded-lg shadow p-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading semesters...</p>
        </div>
      </div>
    `;
  }

  if (state.error) {
    return `
      <div class="bg-white rounded-lg shadow p-8">
        <div class="text-center text-red-600">
          <p class="text-lg font-semibold">Error</p>
          <p class="mt-2">${state.error}</p>
          <button onclick="window.semestersApp.loadSemesters()"
                  class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  if (state.filteredSemesters.length === 0) {
    return `
      <div class="bg-white rounded-lg shadow p-12">
        <div class="text-center text-gray-500">
          <p class="text-lg">No semesters found</p>
          <button onclick="window.semestersApp.handleOpenAddModal()"
                  class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Add First Semester
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Academic Year</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Period</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term Phase</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${state.filteredSemesters.map(semester => `
            <tr class="${semester.is_current ? 'bg-blue-50' : ''}">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${semester.name}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${semester.academic_year}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(semester.start_date)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(semester.end_date)}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-600">
                  ${semester.enrollment_start_date && semester.enrollment_end_date
      ? `${formatDate(semester.enrollment_start_date)} - ${formatDate(semester.enrollment_end_date)}`
      : 'Not set'}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${semester.is_current
      ? '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Current</span>'
      : '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Inactive</span>'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <select onchange="window.semestersApp.handleStatusChange('${semester.id}', this.value)" 
                        class="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-1 px-2 ${getTermStatusColor(semester.status)}">
                  <option value="SETUP" ${semester.status === 'SETUP' ? 'selected' : ''}>Setup</option>
                  <option value="ENROLLMENT_OPEN" ${semester.status === 'ENROLLMENT_OPEN' ? 'selected' : ''}>Enrollment Open</option>
                  <option value="ENROLLMENT_CLOSED" ${semester.status === 'ENROLLMENT_CLOSED' ? 'selected' : ''}>Enrollment Closed</option>
                  <option value="GRADING_OPEN" ${semester.status === 'GRADING_OPEN' ? 'selected' : ''}>Grading Open</option>
                  <option value="CLOSED" ${semester.status === 'CLOSED' ? 'selected' : ''}>Closed</option>
                </select>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button onclick="window.semestersApp.handleOpenEditModal(${JSON.stringify(semester).replace(/"/g, '&quot;')})"
                        class="text-blue-600 hover:text-blue-900">Edit</button>
                ${!semester.is_current
      ? `<button onclick="window.semestersApp.handleSetCurrent(${JSON.stringify(semester).replace(/"/g, '&quot;')})"
                            class="text-green-600 hover:text-green-900">Set Current</button>
                     <button onclick="window.semestersApp.handleOpenDeleteConfirm(${JSON.stringify(semester).replace(/"/g, '&quot;')})"
                            class="text-red-600 hover:text-red-900">Delete</button>`
      : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAddModal() {
  if (!state.showAddModal) return '';

  return `
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form onsubmit="window.semestersApp.handleCreateSubmit(event)">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Add New Semester</h3>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Semester Name *</label>
                    <select onchange="window.semestersApp.handleFormChange('name', this.value)"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required>
                      <option value="1st Semester">1st Semester</option>
                      <option value="2nd Semester">2nd Semester</option>
                      <option value="Summer">Summer</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <input type="text"
                           value="${state.formData.academic_year}"
                           onchange="window.semestersApp.handleFormChange('academic_year', this.value)"
                           placeholder="2024-2025"
                           pattern="\\d{4}-\\d{4}"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                           required>
                    <p class="mt-1 text-xs text-gray-500">Format: YYYY-YYYY (e.g., 2024-2025)</p>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700">Start Date *</label>
                      <input type="date"
                             value="${state.formData.start_date}"
                             onchange="window.semestersApp.handleFormChange('start_date', this.value)"
                             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                             required>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700">End Date *</label>
                      <input type="date"
                             value="${state.formData.end_date}"
                             onchange="window.semestersApp.handleFormChange('end_date', this.value)"
                             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                             required>
                    </div>
                  </div>

                  <div class="border-t pt-4">
                    <p class="text-sm font-medium text-gray-700 mb-2">Enrollment Period (Optional)</p>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm text-gray-600">Opens</label>
                        <input type="date"
                               value="${state.formData.enrollment_start_date}"
                               onchange="window.semestersApp.handleFormChange('enrollment_start_date', this.value)"
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      </div>

                      <div>
                        <label class="block text-sm text-gray-600">Closes</label>
                        <input type="date"
                               value="${state.formData.enrollment_end_date}"
                               onchange="window.semestersApp.handleFormChange('enrollment_end_date', this.value)"
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center">
                    <input type="checkbox"
                           ${state.formData.is_current ? 'checked' : ''}
                           onchange="window.semestersApp.handleFormChange('is_current', this.checked)"
                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label class="ml-2 block text-sm text-gray-900">Set as current semester</label>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button type="submit"
                        class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">
                  Create Semester
                </button>
                <button type="button"
                        onclick="window.semestersApp.handleCloseAddModal()"
                        class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEditModal() {
  if (!state.showEditModal) return '';

  return `
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form onsubmit="window.semestersApp.handleUpdateSubmit(event)">
              <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Edit Semester</h3>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700">Semester Name *</label>
                    <select value="${state.formData.name}"
                            onchange="window.semestersApp.handleFormChange('name', this.value)"
                            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            required>
                      <option value="1st Semester" ${state.formData.name === '1st Semester' ? 'selected' : ''}>1st Semester</option>
                      <option value="2nd Semester" ${state.formData.name === '2nd Semester' ? 'selected' : ''}>2nd Semester</option>
                      <option value="Summer" ${state.formData.name === 'Summer' ? 'selected' : ''}>Summer</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700">Academic Year *</label>
                    <input type="text"
                           value="${state.formData.academic_year}"
                           onchange="window.semestersApp.handleFormChange('academic_year', this.value)"
                           placeholder="2024-2025"
                           pattern="\\d{4}-\\d{4}"
                           class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                           required>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700">Start Date *</label>
                      <input type="date"
                             value="${state.formData.start_date}"
                             onchange="window.semestersApp.handleFormChange('start_date', this.value)"
                             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                             required>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700">End Date *</label>
                      <input type="date"
                             value="${state.formData.end_date}"
                             onchange="window.semestersApp.handleFormChange('end_date', this.value)"
                             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                             required>
                    </div>
                  </div>

                  <div class="border-t pt-4">
                    <p class="text-sm font-medium text-gray-700 mb-2">Enrollment Period (Optional)</p>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-sm text-gray-600">Opens</label>
                        <input type="date"
                               value="${state.formData.enrollment_start_date}"
                               onchange="window.semestersApp.handleFormChange('enrollment_start_date', this.value)"
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      </div>

                      <div>
                        <label class="block text-sm text-gray-600">Closes</label>
                        <input type="date"
                               value="${state.formData.enrollment_end_date}"
                               onchange="window.semestersApp.handleFormChange('enrollment_end_date', this.value)"
                               class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center">
                    <input type="checkbox"
                           ${state.formData.is_current ? 'checked' : ''}
                           onchange="window.semestersApp.handleFormChange('is_current', this.checked)"
                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label class="ml-2 block text-sm text-gray-900">Set as current semester</label>
                  </div>
                </div>
              </div>

              <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button type="submit"
                        class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">
                  Update Semester
                </button>
                <button type="button"
                        onclick="window.semestersApp.handleCloseEditModal()"
                        class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDeleteConfirm() {
  if (!state.showDeleteConfirm || !state.selectedSemester) return '';

  return `
    <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
      <div class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">Delete Semester</h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      Are you sure you want to delete <strong>${state.selectedSemester.name} ${state.selectedSemester.academic_year}</strong>?
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button type="button"
                      onclick="window.semestersApp.handleDeleteConfirm()"
                      class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">
                Delete
              </button>
              <button type="button"
                      onclick="window.semestersApp.handleCloseDeleteConfirm()"
                      class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    ${createHeader({
    role: 'REGISTRAR',
    activePage: 'registrar-semesters',
    user: state.user
  })}
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      ${renderToolbar()}
      ${renderSemesterTable()}
    </main>
    ${renderAddModal()}
    ${renderEditModal()}
    ${renderDeleteConfirm()}
  `;
}

// Logout function
window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Expose functions to window for event handlers
window.semestersApp = {
  handleOpenAddModal,
  handleCloseAddModal,
  handleOpenEditModal,
  handleCloseEditModal,
  handleOpenDeleteConfirm,
  handleCloseDeleteConfirm,
  handleFormChange,
  handleCreateSubmit,
  handleUpdateSubmit,
  handleDeleteConfirm,
  handleSetCurrent,
  handleFilterChange,
  handleStatusChange,
  loadSemesters
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
