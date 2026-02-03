import '../../../style.css';
import { api, endpoints } from '../../../api.js';
import { requireAuth } from '../../../utils.js';
import { createHeader } from '../../../components/header.js';
import { LoadingOverlay } from '../../../components/Spinner.js';

const urlParams = new URLSearchParams(window.location.search);

const state = {
    user: null,
    sectionSubjectId: urlParams.get('section_subject_id'),
    subjectCode: urlParams.get('code'),
    sectionName: urlParams.get('section'),
    students: [],
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

    await loadGrades();
    render();
}

async function loadGrades() {
    if (!state.sectionSubjectId) return;

    try {
        // Reuse Professor endpoint but with Read-Only intent
        const response = await api.get(`${endpoints.grading.students}?section_subject=${state.sectionSubjectId}`);
        // Endpoint returns a list or wrapper object? Professor grades uses listing logic.
        // Assuming returns array directly or { students: [] } based on views_grading.py
        if (Array.isArray(response)) {
            state.students = response;
        } else if (response && response.students) {
            state.students = response.students;
        } else {
            state.students = [];
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        alert("Error loading grades. Ensure you have permission.");
    } finally {
        state.loading = false;
    }
}

function getGradeClass(grade) {
    const num = parseFloat(grade);
    if (grade === 'INC') return 'text-orange-600 bg-orange-50';
    if (grade === '5.00' || grade === 'FAILED' || grade === 'DROPPED') return 'text-red-600 bg-red-50';
    if (!isNaN(num) && num <= 3.0) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
}

function render() {
    const app = document.getElementById('app');

    // Header
    const headerHtml = createHeader({ role: 'REGISTRAR', activePage: 'grades', user: state.user });

    let contentHtml = '';

    if (state.loading) {
        contentHtml = LoadingOverlay('Loading Student Grades...');
    } else {
        contentHtml = `
            <main class="max-w-7xl mx-auto px-4 py-8">
                <!-- Breadcrumbs -->
                <nav class="flex mb-8 text-gray-500 text-sm">
                    <a href="/registrar-grades.html" class="hover:text-blue-600">Programs</a>
                    <span class="mx-2">/</span>
                    <a href="#" onclick="history.go(-2); return false;" class="hover:text-blue-600">Sections</a>
                    <span class="mx-2">/</span>
                    <a href="#" onclick="history.back(); return false;" class="hover:text-blue-600">Subjects</a>
                     <span class="mx-2">/</span>
                    <span class="text-gray-900 font-semibold">Grades</span>
                </nav>

                <div class="mb-6 flex justify-between items-end">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-800">${state.subjectCode} Grades</h1>
                        <p class="text-gray-500">Section: <strong>${state.sectionName}</strong></p>
                    </div>
                    
                    <div class="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <span class="text-sm text-blue-800 font-medium">Read-Only View</span>
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
    if (state.students.length === 0) {
        return `
            <div class="p-12 text-center text-gray-500">
                No students found enrolled in this subject.
            </div>
         `;
    }

    return `
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Grade</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Remarks</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                ${state.students.map(student => `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center">
                                <div>
                                    <div class="text-sm font-medium text-gray-900">${student.full_name}</div>
                                    <div class="text-xs text-gray-500">${student.student_number}</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${student.is_finalized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                ${student.is_finalized ? 'Finalized' : 'Draft'}
                            </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-center">
                            <span class="px-3 py-1 rounded-md text-sm font-bold ${getGradeClass(student.current_grade)}">
                                ${student.current_grade || '-'}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                            ${student.current_remarks || '-'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

document.addEventListener('DOMContentLoaded', init);
