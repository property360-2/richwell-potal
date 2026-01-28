/**
 * Student Exam Permits Page
 * 
 * Allows students to view and generate exam permits.
 * Checks payment status before generation.
 */
import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay, InlineSpinner } from '../components/Spinner.js';
import { renderBadge } from '../atoms/badges/Badge.js';
import { renderButton } from '../atoms/buttons/Button.js';
import { renderEmptyState } from '../organisms/layout/EmptyState.js';
import { Icon } from '../atoms/icons/Icon.js';
import { showToast } from '../components/Toast.js';

// ============================================================
// STATE
// ============================================================

const state = {
    user: null,
    permits: [],
    loading: true,
    generating: false,
};

const EXAM_PERIODS = [
    { value: 'PRELIM', label: 'Preliminary Exam' },
    { value: 'MIDTERM', label: 'Midterm Exam' },
    { value: 'PREFINAL', label: 'Pre-Final Exam' },
    { value: 'FINAL', label: 'Final Exam' }
];

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
    if (!requireAuth()) return;

    // Custom navigation link for exam permits if not in config
    // (Assuming update to navigation.js happens separately or is dynamic)

    await Promise.all([
        loadUserProfile(),
        loadPermits()
    ]);

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
            state.user = response.data || response;
            TokenManager.setUser(state.user);
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading user profile');
    }
}

async function loadPermits() {
    try {
        const response = await api.get('/admissions/my-enrollment/exam-permits/');
        // Note: Endpoint might need to be added to api.js if not present used direct path for safety or add to api.js
        // Checking api.js from previous steps... it has myExamPermits: '/admissions/my-enrollment/exam-permits/'
        // Wait, let me check api.js again.
        // View file 336 output showed:
        // 91:     path('my-enrollment/exam-permits/', views.MyExamPermitsView.as_view(), name='my-exam-permits'),
        //
        // But let's verify if I added it to frontend/src/api.js.
        // I don't think I added it explicitly in a replace_file_content call yet. 
        // I only added myGrades, myTranscript, etc.
        // Let's assume I will add it or use direct string.

        if (response) {
            // Depending on pagination
            state.permits = Array.isArray(response) ? response : (response.results || []);
        }
    } catch (error) {
        console.error('Error loading permits:', error);
        state.permits = [];
    }
}

// ============================================================
// ACTIONS
// ============================================================

async function generatePermit(examPeriod) {
    if (state.generating) return;
    state.generating = true;
    render(); // Update UI to show loading on button

    try {
        // endpoint: /admissions/exam-permits/<period>/generate/
        const response = await api.post(`/admissions/exam-permits/${examPeriod}/generate/`, {});

        if (response) {
            showToast('Exam permit generated successfully!', 'success');
            await loadPermits();
        }
    } catch (error) {
        const msg = error.response?.data?.error || error.message || 'Failed to generate permit. Please check your payment balance.';
        showToast(msg, 'error');
    }

    state.generating = false;
    render();
}

async function printPermit(permitId) {
    // In a real app this opens a PDF or print view.
    // We'll simulate by calling the print endpoint which updates status
    try {
        await api.get(`/admissions/exam-permits/${permitId}/print/`);
        // Then open print window
        window.print();
        // Refresh to show printed status status update
        loadPermits().then(render);
    } catch (err) {
        ErrorHandler.handle(err, 'Printing permit');
    }
}

// ============================================================
// RENDER
// ============================================================

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading exam permits...');
        return;
    }

    app.innerHTML = `
    ${createHeader({
        role: 'STUDENT',
        activePage: 'exam-permits',
        user: state.user
    })}
    
    <main class="max-w-5xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Exam Permits</h1>
          <p class="text-gray-600 mt-1">Generate and print your exam permits for the current semester</p>
        </div>
      </div>
      
      <!-- Generator Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            ${Icon('plus', { size: 'sm', className: 'text-blue-600' })}
            Generate New Permit
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${EXAM_PERIODS.map(period => renderPeriodButton(period)).join('')}
        </div>
        <p class="text-sm text-gray-500 mt-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <span class="font-semibold text-blue-700">Note:</span> 
            Permits can only be generated if the required monthly installment for the exam period is fully paid.
        </p>
      </div>
      
      <!-- Permits List -->
      <h2 class="text-xl font-bold text-gray-800 mb-4">My Permits</h2>
      ${renderPermitsList()}
      
    </main>
  `;
}

function renderPeriodButton(period) {
    // Check if we already have this permit
    // We assume state.permits are for current semester mostly, or we filter.
    // For simplicity, just check existence in list.
    const existing = state.permits.find(p => p.exam_period === period.value);

    if (existing) {
        return `
            <button disabled class="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 font-medium flex flex-col items-center justify-center gap-2 opacity-75 cursor-not-allowed">
                ${Icon('check', { size: 'md' })}
                ${period.label}
                <span class="text-xs">Generated</span>
            </button>
        `;
    }

    return `
        <button 
            onclick="generatePermit('${period.value}')"
            ${state.generating ? 'disabled' : ''}
            class="p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all flex flex-col items-center justify-center gap-2 group relative overflow-hidden"
        >
            ${state.generating ? InlineSpinner() : Icon('file', { size: 'md', className: 'text-gray-400 group-hover:text-blue-600' })}
            <span class="font-medium text-gray-700 group-hover:text-blue-700">${period.label}</span>
            <span class="text-xs text-gray-400 group-hover:text-blue-500">Click to generate</span>
        </button>
    `;
}

function renderPermitsList() {
    if (state.permits.length === 0) {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100">
                ${renderEmptyState({
            icon: 'file',
            title: 'No Permits Yet',
            message: 'Generate a permit above to view it here.'
        })}
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${state.permits.map(permit => renderPermitCard(permit)).join('')}
        </div>
    `;
}

function renderPermitCard(permit) {
    return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div class="p-6">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h3 class="font-bold text-lg text-gray-800">${permit.exam_period_display}</h3>
                        <p class="text-sm text-gray-500">${permit.semester_name} • ${permit.academic_year}</p>
                    </div>
                    ${renderBadge({
        text: permit.is_printed ? 'Printed' : 'Ready',
        color: permit.is_printed ? 'secondary' : 'success'
    })}
                </div>
                
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Permit Code</span>
                        <span class="font-mono font-medium text-gray-700">${permit.permit_code}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Date Generated</span>
                        <span class="text-gray-700">${formatDate(permit.created_at)}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-500">Status</span>
                        <span class="text-green-600 font-medium">Valid</span>
                    </div>
                </div>
                
                <button 
                    onclick="printPermit('${permit.id}')"
                    class="w-full py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                    ${Icon('download', { size: 'sm' })}
                    Print / Download
                </button>
            </div>
        </div>
    `;
}

// ============================================================
// GLOBAL HANDLERS
// ============================================================

window.generatePermit = generatePermit;
window.printPermit = printPermit;
window.logout = function () {
    TokenManager.clearTokens();
    window.location.href = '/login.html';
};

document.addEventListener('DOMContentLoaded', init);
