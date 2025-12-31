import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

// State
const state = {
  user: null,
  users: [],
  selectedUser: null,
  permissionCategories: [],
  search: '',
  roleFilter: '',
  loading: true,
  modalOpen: false
};

// Role display mapping
const ROLE_LABELS = {
  'STUDENT': 'Student',
  'PROFESSOR': 'Professor',
  'CASHIER': 'Cashier',
  'REGISTRAR': 'Registrar',
  'HEAD_REGISTRAR': 'Head Registrar',
  'ADMISSION_STAFF': 'Admission Staff',
  'DEPARTMENT_HEAD': 'Department Head',
  'ADMIN': 'Admin'
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  await loadUsers();

  state.loading = false;
  render();
}

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response && response.data) {
      state.user = response.data;
      TokenManager.setUser(response.data);
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
    const savedUser = TokenManager.getUser();
    if (savedUser) state.user = savedUser;
  }
}

async function loadUsers() {
  try {
    const params = new URLSearchParams();
    if (state.search) params.append('search', state.search);
    if (state.roleFilter) params.append('role', state.roleFilter);

    const url = `${endpoints.users}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await api.get(url);

    if (response && response.users) {
      state.users = response.users;
    }
  } catch (error) {
    console.error('Failed to load users:', error);
    ErrorHandler.handle(error, 'Loading users');
  }
}

async function openPermissionModal(userId) {
  state.selectedUser = state.users.find(u => u.id === userId);
  if (!state.selectedUser) return;

  state.modalOpen = true;
  render();

  // Load user's current permissions
  try {
    const response = await api.get(endpoints.userPermissions(userId));
    if (response && response.categories) {
      state.permissionCategories = response.categories;
      render(); // Re-render to update modal with loaded permissions
    }
  } catch (error) {
    console.error('Failed to load permissions:', error);
    ErrorHandler.handle(error, 'Loading user permissions');
  }
}

async function togglePermission(userId, permissionCode, granted) {
  try {
    const response = await api.post(endpoints.updateUserPermission(userId), {
      permission_code: permissionCode,
      granted: granted
    });

    const result = await response.json();

    if (result.success) {
      Toast.success(result.message);
      await openPermissionModal(userId); // Refresh permissions
    } else {
      Toast.error(result.error || 'Failed to update permission');
    }
  } catch (error) {
    console.error('Failed to toggle permission:', error);
    ErrorHandler.handle(error, 'Updating permission');
  }
}

function closeModal() {
  state.modalOpen = false;
  state.selectedUser = null;
  state.permissionCategories = [];
  render();
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading users...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: state.user?.role || 'ADMIN',
      activePage: 'admin-users',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">User Management</h1>
        <p class="text-gray-600 mt-1">Manage user accounts and permissions</p>
      </div>

      <!-- Search and Filters -->
      ${renderSearchFilters()}

      <!-- Users Table -->
      ${renderUsersTable()}
    </main>

    <!-- Permission Modal -->
    ${state.modalOpen ? renderPermissionModalContainer() : ''}
  `;

  // Attach event listeners
  attachEventListeners();
}

function renderSearchFilters() {
  return `
    <div class="card mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div class="md:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
          <input
            type="text"
            id="search-input"
            placeholder="Search by name, email, or student number..."
            value="${state.search}"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
        </div>

        <!-- Role Filter -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
          <select
            id="role-filter"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            ${Object.entries(ROLE_LABELS).map(([value, label]) => `
              <option value="${value}" ${state.roleFilter === value ? 'selected' : ''}>${label}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
}

function renderUsersTable() {
  if (state.users.length === 0) {
    return `
      <div class="card text-center py-16">
        <svg class="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        <h3 class="text-xl font-bold text-gray-700 mb-2">No Users Found</h3>
        <p class="text-gray-500">Try adjusting your search filters.</p>
      </div>
    `;
  }

  return `
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Permissions</th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${state.users.map(user => renderUserRow(user)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUserRow(user) {
  return `
    <tr class="hover:bg-gray-50 transition-colors">
      <td class="px-6 py-4">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
            ${(user.first_name[0] || '') + (user.last_name[0] || '')}
          </div>
          <div class="ml-4">
            <div class="font-medium text-gray-900">${user.full_name}</div>
            ${user.student_number ? `<div class="text-sm text-gray-500">${user.student_number}</div>` : ''}
          </div>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">${user.email}</td>
      <td class="px-6 py-4">
        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}">
          ${ROLE_LABELS[user.role] || user.role}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-700">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          <span>${user.permission_count} permission${user.permission_count !== 1 ? 's' : ''}</span>
        </div>
      </td>
      <td class="px-6 py-4 text-sm">
        <button
          onclick="window.openPermissionModal('${user.id}')"
          class="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
          Manage Permissions
        </button>
      </td>
    </tr>
  `;
}

function getRoleBadgeColor(role) {
  const colors = {
    'ADMIN': 'bg-purple-100 text-purple-800',
    'HEAD_REGISTRAR': 'bg-red-100 text-red-800',
    'REGISTRAR': 'bg-orange-100 text-orange-800',
    'PROFESSOR': 'bg-blue-100 text-blue-800',
    'CASHIER': 'bg-green-100 text-green-800',
    'DEPARTMENT_HEAD': 'bg-yellow-100 text-yellow-800',
    'ADMISSION_STAFF': 'bg-teal-100 text-teal-800',
    'STUDENT': 'bg-gray-100 text-gray-800'
  };
  return colors[role] || 'bg-gray-100 text-gray-800';
}

function renderPermissionModalContainer() {
  return `
    <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="window.closeModal()">
      <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
        ${renderPermissionModal()}
      </div>
    </div>
  `;
}

function renderPermissionModal() {
  if (!state.selectedUser) return '';

  return `
    <div class="flex flex-col h-full max-h-[90vh]">
      <!-- Modal Header -->
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h3 class="text-xl font-bold text-gray-800">Manage Permissions</h3>
          <p class="text-sm text-gray-600 mt-1">
            ${state.selectedUser.full_name}
            <span class="px-2 py-0.5 ml-2 text-xs rounded-full ${getRoleBadgeColor(state.selectedUser.role)}">
              ${ROLE_LABELS[state.selectedUser.role]}
            </span>
          </p>
        </div>
        <button onclick="window.closeModal()" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6">
        ${state.permissionCategories.length === 0 ? `
          <div class="text-center py-12">
            <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-4 text-gray-600">Loading permissions...</p>
          </div>
        ` : `
          <div class="space-y-6">
            ${state.permissionCategories.map(category => renderPermissionCategory(category)).join('')}
          </div>
        `}
      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
        <button onclick="window.closeModal()" class="btn-secondary">Close</button>
      </div>
    </div>
  `;
}

function renderPermissionCategory(category) {
  return `
    <div class="permission-category border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <h4 class="font-semibold text-gray-800 flex items-center gap-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
          ${category.name}
        </h4>
      </div>
      <div class="p-4 space-y-3">
        ${category.permissions.map(perm => renderPermissionItem(perm)).join('')}
      </div>
    </div>
  `;
}

function renderPermissionItem(perm) {
  const sourceColors = {
    'custom_grant': 'bg-green-100 text-green-800',
    'custom_revoke': 'bg-red-100 text-red-800',
    'role_default': 'bg-blue-100 text-blue-800',
    'none': 'bg-gray-100 text-gray-600'
  };

  const sourceLabels = {
    'custom_grant': 'Custom Grant',
    'custom_revoke': 'Custom Revoke',
    'role_default': 'Role Default',
    'none': 'Not Assigned'
  };

  return `
    <div class="permission-item flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <label class="flex items-start gap-3 flex-1 cursor-pointer">
        <input
          type="checkbox"
          ${perm.has_permission ? 'checked' : ''}
          ${perm.can_toggle ? '' : 'disabled'}
          onchange="window.togglePermission('${state.selectedUser.id}', '${perm.code}', this.checked)"
          class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 h-5 w-5"
        >
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">${perm.name}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${sourceColors[perm.source]}">
              ${sourceLabels[perm.source]}
            </span>
          </div>
          ${perm.description ? `<p class="text-sm text-gray-500 mt-1">${perm.description}</p>` : ''}
          <p class="text-xs text-gray-400 mt-1 font-mono">${perm.code}</p>
        </div>
      </label>
    </div>
  `;
}

function attachEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.search = e.target.value;
      debounce(loadUsers, 500)();
    });
  }

  const roleFilter = document.getElementById('role-filter');
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      state.roleFilter = e.target.value;
      loadUsers();
    });
  }
}

// Debounce utility
let debounceTimer;
function debounce(func, delay) {
  return function(...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Global functions
window.openPermissionModal = openPermissionModal;
window.closeModal = closeModal;
window.togglePermission = togglePermission;

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Initialize
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
