import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  programs: [],
  semesters: [],
  reportType: 'enrollment', // enrollment, payment, grades
  filters: {
    semester: '',
    program: '',
    dateFrom: '',
    dateTo: ''
  },
  reportData: null
};

async function init() {
  if (!requireAuth()) return;
  await loadUserProfile();
  await loadReferenceData();
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

async function loadReferenceData() {
  try {
    const [programs, semesters] = await Promise.all([
      api.get(endpoints.managePrograms),
      api.get(endpoints.semesters)
    ]);
    
    state.programs = programs?.results || programs || [];
    state.semesters = semesters?.results || semesters || [];
    
    // Set default active semester
    const activeSem = state.semesters.find(s => s.is_current);
    if (activeSem) state.filters.semester = activeSem.id;
    
  } catch (error) {
    ErrorHandler.handle(error, 'Loading reference data');
  }
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading reports...');
    return;
  }

  app.innerHTML = `
    ${createHeader({
      role: 'DEPARTMENT_HEAD', // Also accessible to REGISTRAR/ADMIN via permission checks if we expand
      activePage: 'head-reports',
      user: state.user
    })}

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
        <p class="text-gray-600 mt-1">Generate enrollment, payment, and grade reports</p>
      </div>

      <!-- Report Configuration -->
      <div class="card mb-8">
        <h2 class="text-lg font-bold text-gray-800 mb-4">Report Configuration</h2>
        
        <!-- Report Type Tabs -->
        <div class="flex border-b border-gray-200 mb-6">
          <button onclick="setReportType('enrollment')" class="px-6 py-3 font-medium text-sm border-b-2 transition-colors ${state.reportType === 'enrollment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
            Enrollment List
          </button>
          <button onclick="setReportType('grades')" class="px-6 py-3 font-medium text-sm border-b-2 transition-colors ${state.reportType === 'grades' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">
            Grade Summary
          </button>
          <!-- Add more types as needed -->
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select id="filter-semester" onchange="updateFilters('semester', this.value)" class="form-select w-full">
              <option value="">All Semesters</option>
              ${state.semesters.map(s => `
                <option value="${s.id}" ${state.filters.semester === s.id ? 'selected' : ''}>${s.name} ${s.academic_year}</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select id="filter-program" onchange="updateFilters('program', this.value)" class="form-select w-full">
              <option value="">All Programs</option>
              ${state.programs.map(p => `
                <option value="${p.id}" ${state.filters.program === p.id ? 'selected' : ''}>${p.code}</option>
              `).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input type="date" id="filter-date-from" onchange="updateFilters('dateFrom', this.value)" class="form-input w-full">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input type="date" id="filter-date-to" onchange="updateFilters('dateTo', this.value)" class="form-input w-full">
          </div>
        </div>

        <div class="flex justify-end gap-3">
            <button onclick="generateReport()" class="btn btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Generate Report
            </button>
            <button onclick="exportReport('csv')" class="btn btn-secondary flex items-center gap-2" ${!state.reportData ? 'disabled' : ''}>
                Download CSV
            </button>
        </div>
      </div>

      <!-- Report Results -->
      ${renderReportResults()}
    </main>
  `;
}

function renderReportResults() {
  if (!state.reportData) {
    return `
      <div class="card flex flex-col items-center justify-center py-16 text-gray-400">
        <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p>Select filters and click "Generate Report" to view data.</p>
      </div>
    `;
  }

  // Enrollment Report Table
  if (state.reportType === 'enrollment') {
    return `
        <div class="card">
            <div class="flex justify-between items-center mb-4">
                <h3 class="font-bold text-gray-800">Enrollment Results (${state.reportData.length} records)</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 text-xs text-gray-500 uppercase font-semibold">
                        <tr>
                            <th class="px-4 py-3 text-left">Student ID</th>
                            <th class="px-4 py-3 text-left">Name</th>
                            <th class="px-4 py-3 text-left">Program</th>
                            <th class="px-4 py-3 text-center">Year</th>
                            <th class="px-4 py-3 text-center">Status</th>
                            <th class="px-4 py-3 text-center">Enrolled Units</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 text-sm">
                        ${state.reportData.map(row => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-4 py-3 font-mono text-gray-600">${row.student_number}</td>
                                <td class="px-4 py-3 font-medium text-gray-900">${row.student_name}</td>
                                <td class="px-4 py-3">${row.program_code}</td>
                                <td class="px-4 py-3 text-center">${row.year_level}</td>
                                <td class="px-4 py-3 text-center">
                                    <span class="badge ${row.status === 'ENROLLED' ? 'badge-success' : 'badge-warning'}">${row.status}</span>
                                </td>
                                <td class="px-4 py-3 text-center">${row.total_units}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
  }

  return '';
}

// Global functions
window.setReportType = function(type) {
    state.reportType = type;
    state.reportData = null; // Clear previous data
    render();
};

window.updateFilters = function(key, value) {
    state.filters[key] = value;
};

window.generateReport = async function() {
    // Construct query params
    const params = new URLSearchParams({
        type: state.reportType,
        ...state.filters
    });
    
    Toast.info('Generating report...');
    
    try {
        const response = await api.get(`${endpoints.reports}?${params.toString()}`);
        
        if (response && response.success) {
            // Backend returns { success: true, type: '...', count: N, results: [...] }
            state.reportData = response.results;
            Toast.success(`Report generated: ${response.count} records found`);
        } else {
            state.reportData = [];
            Toast.warning(response?.error || 'No data found');
        }

        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Generating report');
        state.reportData = [];
        render();
    }
};

window.exportReport = function(format) {
    if (!state.reportData || state.reportData.length === 0) return;

    // Simple CSV export
    const headers = Object.keys(state.reportData[0]);
    const csvContent = [
        headers.join(','),
        ...state.reportData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${state.reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
