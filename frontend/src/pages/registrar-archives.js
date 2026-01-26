import '../style.css';
import { createHeader } from '../components/header.js';
import { requireAuth, redirectByRole, formatDate, createSpinner, ErrorHandler } from '../utils.js';
import { api, endpoints } from '../api.js';

// State definition
const state = {
  activeType: 'sections',
  searchQuery: '',
  items: [],
  loading: false,
  user: JSON.parse(localStorage.getItem('user')) || null
};

// Types configuration
const ARCHIVE_TYPES = [
  { id: 'sections', label: 'Sections' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'programs', label: 'Programs' },
  { id: 'curricula', label: 'Curricula' },
  { id: 'professors', label: 'Professors' }
];

async function init() {
  if (!requireAuth()) return;

  try {
    const response = await api.get(endpoints.me);
    // Unwrap response if it's wrapped in a data property (common in some API responses)
    state.user = response?.data || response;
  } catch (error) {
    console.error('Failed to fetch user in init:', error);
    // Fallback to local storage if API fails, or redirect to login
    if (!state.user) {
      console.warn('No local user found, redirecting to login');
      window.location.href = '/login.html';
      return;
    }
  }


  const userRole = state.user?.role?.toUpperCase();

  if (userRole !== 'REGISTRAR' && userRole !== 'HEAD_REGISTRAR') {
    console.warn('Redirecting because role mismatch:', userRole);
    redirectByRole(state.user?.role);
    return;
  }

  render();
  await loadArchives();
}

async function loadArchives() {
  state.loading = true;
  renderList();

  try {
    // Construct query parameters manually as api.get doesn't support params object
    const p = new URLSearchParams({
      type: state.activeType,
      search: state.searchQuery
    });

    const response = await api.get(`/academics/archives/?${p.toString()}`);

    // Check if response is an error object (since api.get might not throw on 4xx if JSON provided)
    if (response && response.error) {
      throw new Error(response.error);
    }

    if (Array.isArray(response)) {
      state.items = response;
    } else {
      console.warn('Unexpected response format:', response);
      state.items = [];
    }

  } catch (error) {
    ErrorHandler.handle(error, 'Loading archives');
    state.items = []; // Ensure it's an array on error
  } finally {
    state.loading = false;
    renderList();
  }
}

function handleSearch(query) {
  state.searchQuery = query;
  // Debounce search could be added here if needed, but for now simple input change works
  loadArchives();
}

function handleTypeChange(type) {
  state.activeType = type;
  state.searchQuery = ''; // Reset search on type change
  document.getElementById('archive-search').value = '';
  loadArchives();
  renderTypeTabs(); // Re-render tabs to update active state
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    ${createHeader({
    role: 'REGISTRAR',
    activePage: 'registrar-archives',
    user: state.user
  })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="mb-8">
         <h1 class="text-3xl font-bold text-gray-800">Data Archives</h1>
         <p class="text-gray-600 mt-1">View historical and deleted records</p>
      </div>

      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <!-- Type Tabs -->
        <div class="flex bg-gray-100 p-1 rounded-lg" id="type-tabs">
           ${renderTypeTabs(false)}
        </div>

        <!-- Search -->
        <div class="relative w-full md:w-64">
           <input type="text" 
                  id="archive-search"
                  placeholder="Search archives..." 
                  class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  oninput="handleSearch(this.value)">
           <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
           </svg>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
          <div id="archives-list">
              <!-- Content rendered by renderList() -->
          </div>
      </div>
    </main>
  `;
}

function renderTypeTabs(returnData = true) {
  const html = ARCHIVE_TYPES.map(type => `
    <button onclick="handleTypeChange('${type.id}')" 
            class="px-4 py-2 rounded-md text-sm font-medium transition-all ${state.activeType === type.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
      ${type.label}
    </button>
  `).join('');

  if (returnData) {
    const el = document.getElementById('type-tabs');
    if (el) el.innerHTML = html;
  }
  return html;
}

function renderList() {
  const container = document.getElementById('archives-list');
  if (!container) return;

  if (state.loading) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20">
        ${createSpinner('lg')}
        <p class="text-gray-500 mt-4">Searching archives...</p>
      </div>
    `;
    return;
  }

  if (state.items.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
        </svg>
        <p class="text-lg font-medium">No archived items found</p>
        <p class="text-sm">Try adjusting your search query</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name / Title</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Archived</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${state.items.map(item => `
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-bold text-gray-900">${item.title}</div>
                ${item.meta?.code ? `<div class="text-xs text-gray-500 font-mono mt-0.5">${item.meta.code}</div>` : ''}
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-600">${item.description}</div>
              </td>
               <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 uppercase">
                  ${item.type}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${formatDate(item.deleted_at)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Expose globals
window.handleSearch = handleSearch;
window.handleTypeChange = handleTypeChange;

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
