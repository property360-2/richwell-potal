import '../../../../style.css';
import { api, endpoints, TokenManager } from '../../../../api.js';
import { requireAuth } from '../../../../utils.js';
import { createHeader } from '../../../../components/header.js';
import { Toast } from '../../../../components/Toast.js';
import { ErrorHandler } from '../../../../utils/errorHandler.js';
import { LoadingOverlay } from '../../../../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  configs: []
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadConfigs();
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

async function loadConfigs() {
  try {
    const response = await api.get(endpoints.systemConfig);
    state.configs = response?.results || response || [];
  } catch (error) {
    ErrorHandler.handle(error, 'Loading system configurations');
    state.configs = [];
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading system configuration...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'ADMIN',
      activePage: 'admin-system-config',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">System Configuration</h1>
          <p class="text-gray-600 mt-1">Manage global system settings and toggles</p>
        </div>
        <button onclick="openAddConfigModal()" class="btn btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Setting
        </button>
      </div>

      <!-- Config Table -->
      <div class="card">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Key</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Value</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              ${state.configs.length === 0 ? `
                <tr>
                  <td colspan="4" class="px-6 py-12 text-center text-gray-500">
                    No configurations found.
                  </td>
                </tr>
              ` : state.configs.map(config => `
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="text-sm font-mono font-bold text-blue-600">${config.key}</span>
                  </td>
                  <td class="px-6 py-4">
                    <pre class="text-xs bg-gray-100 p-2 rounded border border-gray-200 overflow-x-auto max-w-xs">${JSON.stringify(config.value, null, 2)}</pre>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm text-gray-700">${config.description || '-'}</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <button onclick="openEditConfigModal('${config.key}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium mr-3">
                      Edit
                    </button>
                    <button onclick="deleteConfig('${config.key}')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <!-- Modal Container -->
    <div id="modal-container"></div>
  `;
}

// Modal Functions
window.openAddConfigModal = function() {
  const modalHtml = `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeModal()">
      <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-6">Add Configuration</h3>
        <form onsubmit="handleSaveConfig(event)">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                    <input type="text" id="config-key" required class="form-input" placeholder="e.g., ENROLLMENT_ENABLED">
                    <p class="text-xs text-gray-500 mt-1">Must be unique, uppercase, and no spaces.</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Value (JSON) *</label>
                    <textarea id="config-value" required rows="4" class="form-input font-mono" placeholder='true, 123, or {"foo": "bar"}'></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" id="config-desc" class="form-input" placeholder="What does this control?">
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button type="button" onclick="closeModal()" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1">Save</button>
            </div>
        </form>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modalHtml;
};

window.openEditConfigModal = function(key) {
  const config = state.configs.find(c => c.key === key);
  if (!config) return;

  const modalHtml = `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeModal()">
      <div class="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-6">Edit Configuration</h3>
        <form onsubmit="handleUpdateConfig(event, '${key}')">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Key</label>
                    <input type="text" value="${config.key}" disabled class="form-input bg-gray-100 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Value (JSON) *</label>
                    <textarea id="config-value" required rows="4" class="form-input font-mono">${JSON.stringify(config.value, null, 2)}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" id="config-desc" value="${config.description || ''}" class="form-input">
                </div>
            </div>
            <div class="flex gap-3 mt-6">
                <button type="button" onclick="closeModal()" class="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" class="btn btn-primary flex-1">Update</button>
            </div>
        </form>
      </div>
    </div>
  `;
  document.getElementById('modal-container').innerHTML = modalHtml;
};

window.closeModal = function() {
  document.getElementById('modal-container').innerHTML = '';
};

// Handlers
window.handleSaveConfig = async function(event) {
    event.preventDefault();
    
    const key = document.getElementById('config-key').value.trim().toUpperCase();
    const valueStr = document.getElementById('config-value').value;
    const description = document.getElementById('config-desc').value;

    let value;
    try {
        value = JSON.parse(valueStr);
    } catch (e) {
        // If not valid JSON, treat as string if it doesn't look like an object/array
        // But for better control, let's try to infer types or force JSON
        // Simple heuristic: if it parses, good. If not, error out to ensure validity.
        // Actually, let's allow simple strings/numbers without quotes if possible?
        // No, standard JSON is safer.
        try {
            // Try wrapping in quotes if it failed (for simple strings)
            value = JSON.parse(`"${valueStr}"`);
        } catch (e2) {
             Toast.error('Invalid JSON value. Please check syntax.');
             return;
        }
    }

    try {
        await api.post(endpoints.systemConfig, { key, value, description });
        Toast.success('Configuration saved');
        closeModal();
        await loadConfigs();
        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Saving configuration');
    }
};

window.handleUpdateConfig = async function(event, key) {
    event.preventDefault();
    
    const valueStr = document.getElementById('config-value').value;
    const description = document.getElementById('config-desc').value;

    let value;
    try {
        value = JSON.parse(valueStr);
    } catch (e) {
         Toast.error('Invalid JSON value. Please check syntax.');
         return;
    }

    try {
        await api.put(endpoints.systemConfigDetail(key), { key, value, description });
        Toast.success('Configuration updated');
        closeModal();
        await loadConfigs();
        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Updating configuration');
    }
};

window.deleteConfig = async function(key) {
    if (!confirm(`Are you sure you want to delete "${key}"? This might break system functionality.`)) return;

    try {
        await api.delete(endpoints.systemConfigDetail(key));
        Toast.success('Configuration deleted');
        await loadConfigs();
        render();
    } catch (error) {
         ErrorHandler.handle(error, 'Deleting configuration');
    }
};

window.logout = function() {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
