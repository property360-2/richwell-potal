import '../style.css';
import { api, endpoints } from '../api.js';
import { requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { LoadingOverlay } from '../components/Spinner.js';

const urlParams = new URLSearchParams(window.location.search);

const state = {
    user: null,
    programId: urlParams.get('program_id'),
    programName: urlParams.get('program_name'),
    semesterId: null,
    semesters: [],
    sections: [],
    loading: true
};

async function init() {
    if (!requireAuth()) return;

    // Load User
    try {
        const user = await api.get(endpoints.me);
        state.user = user;
    } catch (e) {
        console.error(e);
    }

    await loadInitialData();
}

async function loadInitialData() {
    try {
        // Load semesters for filter
        const semesters = await api.get(endpoints.semesters);
        state.semesters = (semesters && semesters.results) ? semesters.results : (semesters || []);

        // Set default semester (current)
        const current = semesters.find(s => s.is_current);
        if (current) {
            state.semesterId = current.id;
            await loadSections();
        } else {
            state.loading = false;
            render();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        state.loading = false;
        render();
    }
}

async function loadSections() {
    if (!state.programId || !state.semesterId) return;

    state.loading = true;
    render();

    try {
        // Use existing SectionViewSet with filters
        const response = await api.get(`${endpoints.sections}?program=${state.programId}&semester=${state.semesterId}`);
        state.sections = (response && response.results) ? response.results : (response || []);
    } catch (error) {
        console.error('Error loading sections:', error);
        state.sections = [];
    } finally {
        state.loading = false;
        render();
    }
}

window.handleSemesterChange = function (semesterId) {
    state.semesterId = semesterId;
    loadSections();
};

function render() {
    const app = document.getElementById('app');

    // Header
    const headerHtml = createHeader({ role: 'REGISTRAR', activePage: 'grades', user: state.user });

    // Main Content
    let contentHtml = '';

    if (state.loading) {
        contentHtml = LoadingOverlay('Loading Sections...');
    } else {
        contentHtml = `
            <main class="max-w-7xl mx-auto px-4 py-8">
                <!-- Breadcrumbs -->
                <nav class="flex mb-8 text-gray-500 text-sm">
                    <a href="/registrar-grades.html" class="hover:text-blue-600">Programs</a>
                    <span class="mx-2">/</span>
                    <span class="text-gray-900 font-semibold">${state.programName || 'Sections'}</span>
                </nav>

                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">Sections List</h1>
                        <h2 class="text-gray-500">${state.programName}</h2>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        <label class="text-sm font-medium text-gray-700">Semester:</label>
                        <select onchange="window.handleSemesterChange(this.value)" 
                            class="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none">
                            ${state.semesters.map(sem => `
                                <option value="${sem.id}" ${sem.id == state.semesterId ? 'selected' : ''}>
                                    ${sem.name} ${sem.academic_year} ${sem.is_current ? '(Current)' : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    ${renderTable()}
                </div>
            </main>
        `;
    }

    app.innerHTML = headerHtml + contentHtml;
}

function renderTable() {
    if (state.sections.length === 0) {
        return `
            <div class="p-12 text-center">
                <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900">No Sections Found</h3>
                <p class="text-gray-500 mt-1">There are no sections created for this program in the selected semester.</p>
            </div>
        `;
    }

    return `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year Level</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Students</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 hover:bg-gray-50">
                ${state.sections.map(section => `
                    <tr class="hover:bg-blue-50/50 transition-colors cursor-pointer" onclick="window.location.href='/registrar-grades-subjects.html?section_id=${section.id}&section_name=${encodeURIComponent(section.name)}&program_name=${encodeURIComponent(state.programName)}'">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div class="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                    ${section.name.substring(0, 2)}
                                </div>
                                <div class="ml-4">
                                    <div class="text-sm font-medium text-gray-900">${section.name}</div>
                                    <div class="text-xs text-gray-500">Capacity: ${section.capacity}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            Year ${section.year_level}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                            ${section.enrolled_count || '-'}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="/registrar-grades-subjects.html?section_id=${section.id}&section_name=${encodeURIComponent(section.name)}&program_name=${encodeURIComponent(state.programName)}" 
                                class="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1">
                                View Subjects
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.addEventListener('DOMContentLoaded', init);
