/**
 * Registrar Grade Finalization Page
 * 
 * Allows registrar to view sections with submitted grades and finalize them.
 * Finalization locks the grades.
 */
import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { renderBadge } from '../../atoms/badges/Badge.js';
import { showToast } from '../../components/Toast.js';
import { Icon } from '../../atoms/icons/Icon.js';
import { renderEmptyState } from '../../organisms/layout/EmptyState.js';

// ============================================================
// STATE
// ============================================================

const state = {
    user: null,
    loading: true,
    sections: [],
    filteredSections: [],
    searchQuery: '',
    filterStatus: 'all', // all, ready, pending
    processingId: null
};

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    if (!requireAuth()) return;

    await loadUserProfile();
    await loadSections();

    state.loading = false;
    render();
}

async function loadUserProfile() {
    try {
        const response = await api.get(endpoints.me);
        if (response) {
            state.user = response.data || response;
            TokenManager.setUser(state.user);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile', { showToast: false });
    }
}

async function loadSections() {
    try {
        const response = await api.get(endpoints.sectionsForFinalization);
        if (response && response.data) {
            state.sections = response.data;
            filterSections();
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading sections');
        state.sections = [];
    }
}

function filterSections() {
    let filtered = [...state.sections];

    // Status Filter
    if (state.filterStatus === 'ready') {
        filtered = filtered.filter(s => s.is_ready);
    } else if (state.filterStatus === 'pending') {
        filtered = filtered.filter(s => !s.is_ready && s.status !== 'Finalized');
    } else if (state.filterStatus === 'finalized') {
        filtered = filtered.filter(s => s.status === 'Finalized');
    }

    // Search Filter
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter(s =>
            s.subject_code.toLowerCase().includes(query) ||
            s.subject_title.toLowerCase().includes(query) ||
            s.section_name.toLowerCase().includes(query)
        );
    }

    state.filteredSections = filtered;
}

// ============================================================
// ACTIONS
// ============================================================

async function finalizeSection(sectionId, subjectId) {
    if (!confirm('Are you sure you want to finalize these grades? This action cannot be undone by professors.')) {
        return;
    }

    state.processingId = sectionId;
    render();

    try {
        const response = await api.post(endpoints.finalizeSection(sectionId), {
            subject_id: subjectId
        });

        if (response && response.success) {
            showToast(response.message, 'success');
            await loadSections();
        } else {
            showToast(response.error || 'Failed to finalize grades', 'error');
        }
    } catch (error) {
        const msg = error.response?.data?.error || 'Failed to finalize grades';
        if (error.response?.data?.ungraded_students) {
            const ungraded = error.response.data.ungraded_students.join(', ');
            showToast(`Cannot finalize. Ungraded students: ${ungraded}`, 'error');
        } else {
            showToast(msg, 'error');
        }
    }

    state.processingId = null;
    render();
}

// ============================================================
// RENDER
// ============================================================

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading sections...');
        return;
    }

    app.innerHTML = `
    ${createHeader({
        role: 'REGISTRAR',
        activePage: 'grade-finalization',
        user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Grade Finalization</h1>
          <p class="text-gray-600 mt-1">Review and finalize submitted grades from professors</p>
        </div>
        
        <div class="flex items-center gap-2">
             <div class="card p-3 flex items-center gap-3 bg-blue-50 border-blue-100">
                 <div class="text-xl font-bold text-blue-700">${state.sections.filter(s => s.is_ready).length}</div>
                 <div class="text-xs text-blue-600 font-medium">Ready for<br>Finalization</div>
             </div>
             <div class="card p-3 flex items-center gap-3">
                 <div class="text-xl font-bold text-gray-700">${state.sections.length}</div>
                 <div class="text-xs text-gray-500 font-medium">Total<br>Sections</div>
             </div>
        </div>
      </div>
      
      <!-- Filters -->
      <div class="card mb-6 p-4">
        <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div class="w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Search subject or section..." 
                    class="form-input"
                    value="${state.searchQuery}"
                    oninput="handleSearch(this.value)"
                >
            </div>
            
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">Filter:</span>
                <button onclick="setFilter('all')" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.filterStatus === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">All</button>
                <button onclick="setFilter('ready')" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.filterStatus === 'ready' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}">Ready</button>
                <button onclick="setFilter('pending')" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.filterStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">Pending</button>
                 <button onclick="setFilter('finalized')" class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.filterStatus === 'finalized' ? 'bg-blue-100 text-blue-800' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}">Finalized</button>
            </div>
        </div>
      </div>
      
      <!-- List -->
      ${renderSectionList()}
      
    </main>
  `;
}

function renderSectionList() {
    if (state.filteredSections.length === 0) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
                ${renderEmptyState({
            icon: 'search',
            title: 'No Sections Found',
            message: 'Try adjusting your filters or search query.'
        })}
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 gap-4">
            ${state.filteredSections.map(section => renderSectionCard(section)).join('')}
        </div>
    `;
}

function renderSectionCard(section) {
    const isReady = section.is_ready;
    const isFinalized = section.status === 'Finalized';

    // Calculate progress
    const total = section.stats.total;
    const graded = section.stats.graded;
    const percent = total > 0 ? Math.round((graded / total) * 100) : 0;

    return `
        <div class="bg-white rounded-xl shadow-sm border ${isReady ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'} p-5 transition-shadow hover:shadow-md">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <!-- Info -->
                <div class="flex items-start gap-4 flex-1">
                    <div class="w-12 h-12 rounded-lg ${isReady ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} flex items-center justify-center flex-shrink-0">
                         ${Icon('book', { size: 'lg' })}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-bold text-gray-800">${section.subject_code}</h3>
                            <span class="text-gray-400">•</span>
                            <span class="text-gray-600">${section.section_name}</span>
                             ${renderBadge({
        text: section.status,
        color: isFinalized ? 'primary' : (isReady ? 'success' : 'warning')
    })}
                        </div>
                        <p class="text-sm text-gray-500">${section.subject_title}</p>
                        
                        <!-- Mini Stats -->
                        <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                             <span class="flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                Passed: ${section.stats.passed}
                             </span>
                             <span class="flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                Failed: ${section.stats.failed}
                             </span>
                             <span class="flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                                INC: ${section.stats.inc}
                             </span>
                        </div>
                    </div>
                </div>
                
                <!-- Progress & Action -->
                <div class="flex items-center gap-6">
                    <div class="w-32">
                        <div class="flex justify-between text-xs mb-1">
                            <span class="font-medium text-gray-700">${graded}/${total} Graded</span>
                            <span class="text-gray-500">${percent}%</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2">
                            <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                        </div>
                    </div>
                    
                    ${isFinalized
            ? `<button disabled class="px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                                ${Icon('check', { size: 'sm' })} Finalized
                           </button>`
            : `<button 
                                onclick="finalizeSection('${section.section_id}', '${section.subject_id}')" 
                                ${!isReady || state.processingId ? 'disabled' : ''}
                                class="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isReady
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }"
                            >
                                ${state.processingId === section.section_id
                ? '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>'
                : Icon('lock', { size: 'sm' })
            }
                                Finalize Grades
                           </button>`
        }
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.handleSearch = function (query) {
    state.searchQuery = query;
    filterSections();
    render();
};

window.setFilter = function (status) {
    state.filterStatus = status;
    filterSections();
    render();
};

window.finalizeSection = finalizeSection;

window.logout = function () {
    TokenManager.clearTokens();
    window.location.href = '/login.html';
};

document.addEventListener('DOMContentLoaded', init);
