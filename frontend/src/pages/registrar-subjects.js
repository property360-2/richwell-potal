import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';

// State
const state = {
  user: null,
  loading: true,
  subjects: [],
  programs: [],
  selectedProgram: null,
  showAddModal: false,
  showEditModal: false,
  editingSubject: null,
  formData: {
    code: '',
    name: '',
    description: '',
    units: 3,
    program_ids: [],       // All programs (at least one required)
    year_level: 1,
    semester_number: 1,
    has_prerequisites: false,
    prerequisites: []
  },
  prerequisiteSearch: '',
  filteredPrerequisites: []
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadPrograms();
  await loadSubjects();
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

async function loadPrograms() {
  try {
    const response = await api.get(endpoints.managePrograms);
    state.programs = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load programs:', error);
    state.programs = [];
  }
}

async function loadSubjects() {
  try {
    let url = endpoints.manageSubjects;
    if (state.selectedProgram) {
      url += `?program=${state.selectedProgram}`;
    }
    const response = await api.get(url);
    state.subjects = response?.results || response || [];
  } catch (error) {
    console.error('Failed to load subjects:', error);
    state.subjects = [];
  }
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
      activePage: 'registrar-subjects',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Subject Management</h1>
          <p class="text-gray-600 mt-1">Manage subjects, units, and prerequisites</p>
        </div>
        <button onclick="openAddModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Subject
        </button>
      </div>

      <!-- Filters -->
      <div class="card mb-6">
        <div class="flex items-center gap-4">
          <label class="text-sm font-medium text-gray-700">Filter by Program:</label>
          <select onchange="filterByProgram(this.value)" class="form-select flex-1">
            <option value="">All Programs</option>
            ${state.programs.map(p => `
              <option value="${p.id}" ${state.selectedProgram === p.id ? 'selected' : ''}>
                ${p.code} - ${p.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Subjects Table -->
      <div class="card">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Year</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sem</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Units</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Prerequisites</th>
                <th class="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${state.subjects.length === 0 ? `
                <tr>
                  <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                    No subjects found. Click "Add Subject" to create one.
                  </td>
                </tr>
              ` : state.subjects.map(subject => `
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm font-bold text-gray-900">${subject.code}</span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">${subject.title || subject.name}</div>
                    ${subject.description ? `<div class="text-xs text-gray-500 mt-1">${subject.description}</div>` : ''}
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm ${subject.program_codes?.length > 1 ? 'font-semibold' : ''} text-gray-700">
                      ${subject.program_codes && subject.program_codes.length > 1
                        ? subject.program_codes.join(', ')
                        : (subject.program_code || 'N/A')}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm text-gray-700">${subject.year_level}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm text-gray-700">${subject.semester_number}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="text-sm font-medium text-gray-900">${subject.units}</span>
                  </td>
                  <td class="px-6 py-4">
                    ${subject.prerequisites && subject.prerequisites.length > 0
                      ? `<div class="flex flex-wrap gap-1">
                          ${subject.prerequisites.map(prereq =>
                            `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">${prereq.code}</span>`
                          ).join('')}
                        </div>`
                      : '<span class="text-xs text-gray-400">None</span>'
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button onclick="openEditModal('${subject.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Edit
                      </button>
                      <button onclick="deleteSubject('${subject.id}')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </main>

    ${state.showAddModal ? renderAddModal() : ''}
    ${state.showEditModal ? renderEditModal() : ''}
  `;
}


function renderAddModal() {
  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeAddModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Add New Subject</h3>

        <form onsubmit="handleAddSubject(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
              <input type="text" id="add-code" required class="form-input" placeholder="e.g., CS101">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Units *</label>
              <input type="number" id="add-units" min="1" max="6" value="3" required class="form-input">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input type="text" id="add-name" required class="form-input" placeholder="e.g., Introduction to Programming">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="add-description" rows="3" class="form-input" placeholder="Optional description"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Programs *</label>
            <div id="add-programs" class="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              ${state.programs.map((p, index) => `
                <label class="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                  <input type="checkbox" name="add-program-checkbox" value="${p.id}" ${index === 0 ? 'checked' : ''} class="rounded border-gray-300 text-blue-600">
                  <span class="text-sm font-medium">${p.code}</span>
                  <span class="text-sm text-gray-600">- ${p.name}</span>
                </label>
              `).join('')}
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Select all programs this subject belongs to. At least one program is required.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
              <select id="add-year" required class="form-select">
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select id="add-semester" required class="form-select">
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="3">Summer</option>
              </select>
            </div>
          </div>

          <div class="border-t pt-4">
            <div class="flex items-center gap-2 mb-3">
              <input type="checkbox" id="add-has-prereq" onchange="togglePrerequisiteSection('add')" class="rounded border-gray-300">
              <label for="add-has-prereq" class="text-sm font-medium text-gray-700">Has Prerequisites</label>
            </div>

            <div id="add-prereq-section" class="hidden space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Search Prerequisites</label>
                <input type="text" id="add-prereq-search" oninput="searchPrerequisites('add')" class="form-input" placeholder="Search by subject code or name...">
              </div>

              <div id="add-prereq-results" class="max-h-40 overflow-y-auto border rounded-lg"></div>

              <div id="add-selected-prereqs" class="space-y-2">
                <p class="text-sm font-medium text-gray-700">Selected Prerequisites:</p>
                <div id="add-prereq-list" class="space-y-1"></div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button type="button" onclick="closeAddModal()" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1">Add Subject</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderEditModal() {
  const subject = state.editingSubject;
  if (!subject) return '';

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeEditModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <h3 class="text-2xl font-bold text-gray-800 mb-6">Edit Subject</h3>

        <form onsubmit="handleEditSubject(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
              <input type="text" id="edit-code" value="${subject.code}" required class="form-input">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Units *</label>
              <input type="number" id="edit-units" value="${subject.units}" min="1" max="6" required class="form-input">
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input type="text" id="edit-name" value="${subject.title || subject.name}" required class="form-input">
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="edit-description" rows="3" class="form-input">${subject.description || ''}</textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Programs *</label>
            <div id="edit-programs" class="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
              ${state.programs.map(p => {
                const isChecked = subject.program_codes?.includes(p.code) ? 'checked' : '';
                return `
                  <label class="flex items-center space-x-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                    <input type="checkbox" name="edit-program-checkbox" value="${p.id}" ${isChecked} class="rounded border-gray-300 text-blue-600">
                    <span class="text-sm font-medium">${p.code}</span>
                    <span class="text-sm text-gray-600">- ${p.name}</span>
                  </label>
                `;
              }).join('')}
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Select all programs this subject belongs to. At least one program is required.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Year Level *</label>
              <select id="edit-year" required class="form-select">
                <option value="1" ${subject.year_level === 1 ? 'selected' : ''}>1st Year</option>
                <option value="2" ${subject.year_level === 2 ? 'selected' : ''}>2nd Year</option>
                <option value="3" ${subject.year_level === 3 ? 'selected' : ''}>3rd Year</option>
                <option value="4" ${subject.year_level === 4 ? 'selected' : ''}>4th Year</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select id="edit-semester" required class="form-select">
                <option value="1" ${subject.semester_number === 1 ? 'selected' : ''}>1st Semester</option>
                <option value="2" ${subject.semester_number === 2 ? 'selected' : ''}>2nd Semester</option>
                <option value="3" ${subject.semester_number === 3 ? 'selected' : ''}>Summer</option>
              </select>
            </div>
          </div>

          <div class="border-t pt-4">
            <div class="flex items-center gap-2 mb-3">
              <input type="checkbox" id="edit-has-prereq" ${subject.prerequisites && subject.prerequisites.length > 0 ? 'checked' : ''} onchange="togglePrerequisiteSection('edit')" class="rounded border-gray-300">
              <label for="edit-has-prereq" class="text-sm font-medium text-gray-700">Has Prerequisites</label>
            </div>

            <div id="edit-prereq-section" class="${subject.prerequisites && subject.prerequisites.length > 0 ? '' : 'hidden'} space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Search Prerequisites</label>
                <input type="text" id="edit-prereq-search" oninput="searchPrerequisites('edit')" class="form-input" placeholder="Search by subject code or name...">
              </div>

              <div id="edit-prereq-results" class="max-h-40 overflow-y-auto border rounded-lg"></div>

              <div id="edit-selected-prereqs" class="space-y-2">
                <p class="text-sm font-medium text-gray-700">Selected Prerequisites:</p>
                <div id="edit-prereq-list" class="space-y-1">
                  ${subject.prerequisites ? subject.prerequisites.map(prereq => `
                    <div class="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg" data-prereq-id="${prereq.id}">
                      <span class="text-sm text-gray-700"><span class="font-bold">${prereq.code}</span> - ${prereq.name}</span>
                      <button type="button" onclick="removePrerequisite('edit', '${prereq.id}')" class="text-red-600 hover:text-red-800">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  `).join('') : ''}
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button type="button" onclick="closeEditModal()" class="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" class="btn btn-primary flex-1">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
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

// Event handlers
window.openAddModal = function() {
  state.showAddModal = true;
  render();
};

window.closeAddModal = function() {
  state.showAddModal = false;
  render();
};

window.openEditModal = async function(subjectId) {
  try {
    const response = await api.get(endpoints.manageSubject(subjectId));
    state.editingSubject = response;
    state.showEditModal = true;
    render();
  } catch (error) {
    console.error('Failed to load subject:', error);
    showToast('Failed to load subject details', 'error');
  }
};

window.closeEditModal = function() {
  state.showEditModal = false;
  state.editingSubject = null;
  render();
};

window.handleAddSubject = async function(event) {
  event.preventDefault();

  const hasPrereq = document.getElementById('add-has-prereq').checked;
  const selectedPrereqs = hasPrereq ? getSelectedPrerequisites('add') : [];

  // Collect all checked programs
  const checkedPrograms = Array.from(document.querySelectorAll('input[name="add-program-checkbox"]:checked'))
    .map(cb => cb.value);

  if (checkedPrograms.length === 0) {
    showToast('Please select at least one program', 'error');
    return;
  }

  // First checked program is primary, rest are additional
  const primaryProgram = checkedPrograms[0];
  const additionalProgramIds = checkedPrograms.slice(1);

  const data = {
    code: document.getElementById('add-code').value,
    title: document.getElementById('add-name').value,
    description: document.getElementById('add-description').value,
    units: parseInt(document.getElementById('add-units').value),
    program: primaryProgram,  // Primary program (first checked)
    program_ids: additionalProgramIds,  // Additional programs
    year_level: parseInt(document.getElementById('add-year').value),
    semester_number: parseInt(document.getElementById('add-semester').value),
    prerequisite_ids: selectedPrereqs
  };

  try {
    const response = await api.post(endpoints.manageSubjects, data);
    showToast('Subject added successfully', 'success');
    state.showAddModal = false;
    await loadSubjects();
    render();
  } catch (error) {
    console.error('Failed to add subject:', error);
    showToast('Failed to add subject', 'error');
  }
};

window.handleEditSubject = async function(event) {
  event.preventDefault();

  const hasPrereq = document.getElementById('edit-has-prereq').checked;
  const selectedPrereqs = hasPrereq ? getSelectedPrerequisites('edit') : [];
  const oldPrereqs = state.editingSubject.prerequisites?.map(p => p.id) || [];

  // Collect all checked programs
  const checkedPrograms = Array.from(document.querySelectorAll('input[name="edit-program-checkbox"]:checked'))
    .map(cb => cb.value);

  if (checkedPrograms.length === 0) {
    showToast('Please select at least one program', 'error');
    return;
  }

  // First checked program is primary, rest are additional
  const primaryProgram = checkedPrograms[0];
  const additionalProgramIds = checkedPrograms.slice(1);

  const data = {
    code: document.getElementById('edit-code').value,
    title: document.getElementById('edit-name').value,
    description: document.getElementById('edit-description').value,
    units: parseInt(document.getElementById('edit-units').value),
    program: primaryProgram,  // Primary program (first checked)
    program_ids: additionalProgramIds,  // Additional programs
    year_level: parseInt(document.getElementById('edit-year').value),
    semester_number: parseInt(document.getElementById('edit-semester').value),
    prerequisite_ids: selectedPrereqs
  };

  try {
    await api.put(endpoints.manageSubject(state.editingSubject.id), data);
    showToast('Subject updated successfully', 'success');
    state.showEditModal = false;
    state.editingSubject = null;
    await loadSubjects();
    render();
  } catch (error) {
    console.error('Failed to update subject:', error);
    showToast('Failed to update subject', 'error');
  }
};

window.deleteSubject = async function(subjectId) {
  if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
    return;
  }

  try {
    await api.delete(endpoints.manageSubject(subjectId));
    showToast('Subject deleted successfully', 'success');
    await loadSubjects();
    render();
  } catch (error) {
    console.error('Failed to delete subject:', error);
    showToast('Failed to delete subject', 'error');
  }
};

window.filterByProgram = async function(programId) {
  state.selectedProgram = programId || null;
  await loadSubjects();
  render();
};

window.logout = function() {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Prerequisite management functions
window.togglePrerequisiteSection = function(mode) {
  const checkbox = document.getElementById(`${mode}-has-prereq`);
  const section = document.getElementById(`${mode}-prereq-section`);

  if (checkbox.checked) {
    section.classList.remove('hidden');
  } else {
    section.classList.add('hidden');
  }
};

window.searchPrerequisites = function(mode) {
  const searchInput = document.getElementById(`${mode}-prereq-search`);
  const query = searchInput.value.toLowerCase().trim();
  const resultsDiv = document.getElementById(`${mode}-prereq-results`);

  if (!query) {
    resultsDiv.innerHTML = '<p class="text-sm text-gray-500 p-3">Type to search for subjects...</p>';
    return;
  }

  const filtered = state.subjects.filter(subject => {
    const subjectTitle = subject.title || subject.name;
    if (!subject.code || !subjectTitle) return false;

    const matchesQuery = subject.code.toLowerCase().includes(query) ||
                        subjectTitle.toLowerCase().includes(query);
    const notAlreadySelected = !isPrerequisiteSelected(mode, subject.id);
    return matchesQuery && notAlreadySelected;
  });

  if (filtered.length === 0) {
    resultsDiv.innerHTML = '<p class="text-sm text-gray-500 p-3">No subjects found.</p>';
    return;
  }

  resultsDiv.innerHTML = filtered.slice(0, 10).map(subject => {
    const subjectTitle = subject.title || subject.name;
    return `
      <div class="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" onclick="addPrerequisite('${mode}', '${subject.id}', '${subject.code}', '${subjectTitle.replace(/'/g, "\\'")}')">
        <p class="text-sm font-bold text-gray-900">${subject.code}</p>
        <p class="text-xs text-gray-600">${subjectTitle}</p>
      </div>
    `;
  }).join('');
};

window.addPrerequisite = function(mode, prereqId, prereqCode, prereqName) {
  const listDiv = document.getElementById(`${mode}-prereq-list`);
  const searchInput = document.getElementById(`${mode}-prereq-search`);

  // Check if already added
  if (isPrerequisiteSelected(mode, prereqId)) {
    return;
  }

  // Add to the list
  const prereqDiv = document.createElement('div');
  prereqDiv.className = 'flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg';
  prereqDiv.setAttribute('data-prereq-id', prereqId);
  prereqDiv.innerHTML = `
    <span class="text-sm text-gray-700"><span class="font-bold">${prereqCode}</span> - ${prereqName}</span>
    <button type="button" onclick="removePrerequisite('${mode}', '${prereqId}')" class="text-red-600 hover:text-red-800">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  listDiv.appendChild(prereqDiv);

  // Clear search
  searchInput.value = '';
  document.getElementById(`${mode}-prereq-results`).innerHTML = '<p class="text-sm text-gray-500 p-3">Type to search for subjects...</p>';
};

window.removePrerequisite = function(mode, prereqId) {
  const listDiv = document.getElementById(`${mode}-prereq-list`);
  const prereqElement = listDiv.querySelector(`[data-prereq-id="${prereqId}"]`);

  if (prereqElement) {
    prereqElement.remove();
  }
};

function isPrerequisiteSelected(mode, prereqId) {
  const listDiv = document.getElementById(`${mode}-prereq-list`);
  return listDiv.querySelector(`[data-prereq-id="${prereqId}"]`) !== null;
}

function getSelectedPrerequisites(mode) {
  const listDiv = document.getElementById(`${mode}-prereq-list`);
  const prereqElements = listDiv.querySelectorAll('[data-prereq-id]');
  return Array.from(prereqElements).map(el => el.getAttribute('data-prereq-id'));
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
