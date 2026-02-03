import '../../style.css';
import { api, endpoints } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { LoadingOverlay } from '../../components/Spinner.js';

const urlParams = new URLSearchParams(window.location.search);

const state = {
    user: null,
    sectionId: urlParams.get('section_id'),
    sectionName: urlParams.get('section_name'),
    programName: urlParams.get('program_name'),
    subjects: [],
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

    await loadSubjects();
    render();
}

async function loadSubjects() {
    if (!state.sectionId) return;

    try {
        const response = await api.get(`/api/v1/enrollment/registrar/sections/${state.sectionId}/subjects/`);
        state.subjects = (response && response.results) ? response.results : (response || []);
    } catch (error) {
        console.error('Error loading subjects:', error);
        state.subjects = [];
    } finally {
        state.loading = false;
    }
}

function getBadgeClass(status) {
    switch (status) {
        case 'Submitted': return 'bg-green-100 text-green-800 border-green-200';
        case 'Partial': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'No Students': return 'bg-gray-100 text-gray-600 border-gray-200';
        default: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Pending
    }
}

function render() {
    const app = document.getElementById('app');

    // Header
    const headerHtml = createHeader({ role: 'REGISTRAR', activePage: 'grades', user: state.user });

    let contentHtml = '';

    if (state.loading) {
        contentHtml = LoadingOverlay('Loading Subjects...');
    } else {
        contentHtml = `
            <main class="max-w-7xl mx-auto px-4 py-8">
                <!-- Breadcrumbs -->
                <nav class="flex mb-8 text-gray-500 text-sm">
                    <a href="/pages/registrar/registrar-grades.html" class="hover:text-blue-600">Programs</a>
                    <span class="mx-2">/</span>
                    <a href="#" onclick="history.back(); return false;" class="hover:text-blue-600">${state.programName || 'Sections'}</a>
                    <span class="mx-2">/</span>
                    <span class="text-gray-900 font-semibold">${state.sectionName || 'Subjects'}</span>
                </nav>

                <div class="mb-6">
                    <h1 class="text-2xl font-bold text-gray-800">Section Subjects</h1>
                    <p class="text-gray-500">Grade submission status for section <strong>${state.sectionName}</strong></p>
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
    if (state.subjects.length === 0) {
        return `
            <div class="p-12 text-center">
                <h3 class="text-lg font-medium text-gray-900">No Subjects Found</h3>
                <p class="text-gray-500 mt-1">This section has no subjects assigned.</p>
            </div>
        `;
    }

    return `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professor</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200 hover:bg-gray-50">
                ${state.subjects.map(subject => `
                    <tr>
                        <td class="px-6 py-4">
                            <div class="text-sm font-bold text-gray-900">${subject.subject_code}</div>
                            <div class="text-sm text-gray-500">${subject.subject_title}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            ${subject.professor_name}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center text-sm">
                            <div class="text-gray-900 font-medium">${subject.stats.enrolled} Enrolled</div>
                            <div class="text-xs text-gray-500">
                                ${subject.stats.graded} Graded / ${subject.stats.finalized} Finalized
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeClass(subject.status)}">
                                ${subject.status}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <a href="/pages/registrar/registrar-grades-view.html?section_subject_id=${subject.id}&code=${encodeURIComponent(subject.subject_code)}&section=${encodeURIComponent(state.sectionName)}" 
                                class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors">
                                View Grades
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.addEventListener('DOMContentLoaded', init);
