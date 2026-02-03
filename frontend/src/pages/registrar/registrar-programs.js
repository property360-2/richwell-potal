import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { Modal, ConfirmModal } from '../../components/Modal.js';

// State
const state = {
  user: null,
  loading: true,
  programs: [],
  addModal: null,
  editModal: null,
  editingProgram: null
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadPrograms();
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

async function loadPrograms() {
  try {
    const response = await api.get(endpoints.managePrograms);
    state.programs = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading programs');
    state.programs = [];
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading programs...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'REGISTRAR',
      activePage: 'registrar-programs',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Program Management</h1>
          <p class="text-gray-600 mt-1">Manage academic programs and curriculum tracks</p>
        </div>
        <button onclick="openAddModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Program
        </button>
      </div>

      <!-- Programs Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${state.programs.length === 0 ? `
          <div class="col-span-full card text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
            <p class="text-gray-500 text-lg">No programs found</p>
            <p class="text-gray-400 text-sm mt-2">Click "Add Program" to create your first program</p>
          </div>
        ` : state.programs.map(program => `
          <div class="card hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <h3 class="text-xl font-bold text-gray-800">${program.code}</h3>
                  ${program.is_active
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Active</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>'
                  }
                </div>
                <p class="text-gray-900 font-medium">${program.name}</p>
              </div>
            </div>

            ${program.description ? `
              <p class="text-sm text-gray-600 mb-4 line-clamp-2">${program.description}</p>
            ` : ''}

            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="bg-blue-50 rounded-lg p-3">
                <p class="text-xs text-gray-600 mb-1">Duration</p>
                <p class="text-lg font-bold text-blue-600">${program.duration_years} ${program.duration_years === 1 ? 'year' : 'years'}</p>
              </div>
              <div class="bg-purple-50 rounded-lg p-3">
                <p class="text-xs text-gray-600 mb-1">Subjects</p>
                <p class="text-lg font-bold text-purple-600">${program.total_subjects || 0}</p>
              </div>
            </div>

            <div class="flex gap-2 pt-4 border-t border-gray-200">
              <button onclick="openEditModal('${program.id}')" class="btn btn-secondary flex-1 text-sm">
                Edit
              </button>
              <button onclick="deleteProgram('${program.id}')" class="btn btn-danger flex-1 text-sm">
                Delete
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </main>
  `;
}

function getAddProgramForm() {
  return `
    <form id="add-program-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
        <input type="text" id="add-code" required class="form-input" placeholder="e.g., BSIT, BSCS" pattern="[A-Z]+" title="Must be uppercase letters only">
        <p class="text-xs text-gray-500 mt-1">Use uppercase letters only (e.g., BSIT, BSCS)</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
        <input type="text" id="add-name" required class="form-input" placeholder="e.g., Bachelor of Science in Information Technology">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="add-description" rows="3" class="form-input" placeholder="Optional description of the program"></textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
        <select id="add-duration" required class="form-select">
          <option value="4">4 years</option>
          <option value="2">2 years</option>
          <option value="3">3 years</option>
          <option value="5">5 years</option>
          <option value="6">6 years</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="add-active" checked class="rounded border-gray-300">
        <label for="add-active" class="text-sm font-medium text-gray-700">Active (currently offered)</label>
      </div>
    </form>
  `;
}

function getEditProgramForm(program) {
  return `
    <form id="edit-program-form" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Code *</label>
        <input type="text" id="edit-code" value="${program.code}" required class="form-input" pattern="[A-Z]+" title="Must be uppercase letters only">
        <p class="text-xs text-gray-500 mt-1">Use uppercase letters only (e.g., BSIT, BSCS)</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Program Name *</label>
        <input type="text" id="edit-name" value="${program.name}" required class="form-input">
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea id="edit-description" rows="3" class="form-input">${program.description || ''}</textarea>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duration (Years) *</label>
        <select id="edit-duration" required class="form-select">
          <option value="2" ${program.duration_years === 2 ? 'selected' : ''}>2 years</option>
          <option value="3" ${program.duration_years === 3 ? 'selected' : ''}>3 years</option>
          <option value="4" ${program.duration_years === 4 ? 'selected' : ''}>4 years</option>
          <option value="5" ${program.duration_years === 5 ? 'selected' : ''}>5 years</option>
          <option value="6" ${program.duration_years === 6 ? 'selected' : ''}>6 years</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <input type="checkbox" id="edit-active" ${program.is_active ? 'checked' : ''} class="rounded border-gray-300">
        <label for="edit-active" class="text-sm font-medium text-gray-700">Active (currently offered)</label>
      </div>
    </form>
  `;
}

// Event handlers
window.openAddModal = function() {
  const modal = new Modal({
    title: 'Add New Program',
    content: getAddProgramForm(),
    size: 'lg',
    actions: [
      {
        label: 'Cancel',
        onClick: (m) => m.close()
      },
      {
        label: 'Add Program',
        primary: true,
        onClick: async (m) => {
          const form = document.getElementById('add-program-form');
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const data = {
            code: document.getElementById('add-code').value.toUpperCase(),
            name: document.getElementById('add-name').value,
            description: document.getElementById('add-description').value,
            duration_years: parseInt(document.getElementById('add-duration').value),
            is_active: document.getElementById('add-active').checked
          };

          try {
            await api.post(endpoints.managePrograms, data);
            Toast.success('Program added successfully');
            m.close();
            await loadPrograms();
            render();
          } catch (error) {
            ErrorHandler.handle(error, 'Adding program');
          }
        }
      }
    ]
  });

  state.addModal = modal;
  modal.show();
};

window.openEditModal = async function(programId) {
  try {
    const response = await api.get(endpoints.manageProgram(programId));
    state.editingProgram = response;

    const modal = new Modal({
      title: 'Edit Program',
      content: getEditProgramForm(response),
      size: 'lg',
      actions: [
        {
          label: 'Cancel',
          onClick: (m) => {
            m.close();
            state.editingProgram = null;
          }
        },
        {
          label: 'Save Changes',
          primary: true,
          onClick: async (m) => {
            const form = document.getElementById('edit-program-form');
            if (!form.checkValidity()) {
              form.reportValidity();
              return;
            }

            const data = {
              code: document.getElementById('edit-code').value.toUpperCase(),
              name: document.getElementById('edit-name').value,
              description: document.getElementById('edit-description').value,
              duration_years: parseInt(document.getElementById('edit-duration').value),
              is_active: document.getElementById('edit-active').checked
            };

            try {
              await api.put(endpoints.manageProgram(state.editingProgram.id), data);
              Toast.success('Program updated successfully');
              m.close();
              state.editingProgram = null;
              await loadPrograms();
              render();
            } catch (error) {
              ErrorHandler.handle(error, 'Updating program');
            }
          }
        }
      ]
    });

    state.editModal = modal;
    modal.show();
  } catch (error) {
    ErrorHandler.handle(error, 'Loading program details');
  }
};

window.deleteProgram = async function(programId) {
  const confirmed = await ConfirmModal({
    title: 'Delete Program',
    message: 'Are you sure you want to delete this program? This action cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  });

  if (!confirmed) return;

  try {
    await api.delete(endpoints.manageProgram(programId));
    Toast.success('Program deleted successfully');
    await loadPrograms();
    render();
  } catch (error) {
    ErrorHandler.handle(error, 'Deleting program');
  }
};

window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/pages/auth/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
