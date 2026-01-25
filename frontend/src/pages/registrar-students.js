import '../style.css';
import { api, endpoints } from '../api.js';
import { requireAuth, formatDate } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';

const state = {
    user: null,
    loading: true,
    students: [],
    programs: [],
    curricula: [],

    filters: {
        program: '',
        curriculum: '',
        search: ''
    },

    pagination: {
        count: 0,
        next: null,
        previous: null,
        currentPage: 1
    },

    activeModalTab: 'profile', // profile, grades, schedule
    selectedStudent: null // Detailed data
};

async function init() {
    if (!requireAuth()) return;

    // Load initial data
    try {
        const [user, programsResponse] = await Promise.all([
            api.get(endpoints.me),
            api.get(endpoints.academicPrograms)
        ]);

        state.user = user;
        state.programs = programsResponse.results || programsResponse;

        await loadStudents();

    } catch (error) {
        ErrorHandler.handle(error, 'Initializing page');
    } finally {
        state.loading = false;
        render();
    }
}

async function loadStudents(url = null) {
    try {
        // Build query params
        let queryObj = {};
        if (!url) {
            if (state.filters.program) queryObj.program = state.filters.program;
            if (state.filters.curriculum) queryObj.curriculum = state.filters.curriculum;
            if (state.filters.search) queryObj.search = state.filters.search;
        }

        const queryString = new URLSearchParams(queryObj).toString();
        const fetchUrl = url || `${endpoints.registrarStudents}?${queryString}`;

        const response = await api.get(fetchUrl);

        if (response.results) {
            state.students = response.results;
            state.pagination = {
                count: response.count,
                next: response.next,
                previous: response.previous,
                currentPage: url ? getPageFromUrl(url) : 1
            };
        } else {
            state.students = response;
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading students');
        state.students = [];
    }
}

async function loadStudentDetails(studentId) {
    try {
        const response = await api.get(endpoints.registrarStudentDetail(studentId));
        state.selectedStudent = response;
        return response;
    } catch (error) {
        ErrorHandler.handle(error, 'Loading student details');
        return null;
    }
}

// Helper to extract page number from URL
function getPageFromUrl(url) {
    const params = new URL(url).searchParams;
    return parseInt(params.get('page')) || 1;
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading students...');
        return;
    }

    app.innerHTML = `
        ${createHeader({
        role: 'REGISTRAR',
        activePage: 'registrar-students',
        user: state.user
    })}
        
        <main class="max-w-7xl mx-auto px-4 py-8">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">Student Management</h1>
                    <p class="text-gray-600 mt-1">View, manage, and enroll students</p>
                </div>
                <button onclick="openAddStudentModal()" class="btn btn-primary flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Student
                </button>
            </div>
            
            <!-- Filters -->
            <div class="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input type="text" 
                               value="${state.filters.search}"
                               onchange="updateFilter('search', this.value)"
                               placeholder="Name or Student No." 
                               class="form-input w-full">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Program</label>
                        <select onchange="updateFilter('program', this.value)" class="form-select w-full">
                            <option value="">All Programs</option>
                            ${state.programs.map(p => `
                                <option value="${p.id}" ${state.filters.program === p.id ? 'selected' : ''}>
                                    ${p.code}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                     <div class="flex items-end">
                        <button onclick="applyFilters()" class="btn btn-secondary w-full">
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- Table -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student No.</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${state.students.length > 0 ? state.students.map(student => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        ${student.student_number}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${student.last_name}, ${student.first_name}</div>
                                        <div class="text-sm text-gray-500">${student.email}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        ${student.program_code}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        ${student.year_level}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${getStatusColor(student.status)}">
                                            ${student.status}
                                        </span>
                                        ${student.academic_status ? `
                                            <span class="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                ${student.academic_status}
                                            </span>
                                        ` : ''}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onclick="viewStudent('${student.id}')" class="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                                        <button onclick="editStudent('${student.id}')" class="text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                                        <button onclick="deleteStudent('${student.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">
                                        No students found
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination -->
                ${renderPagination()}
            </div>
        </main>
    `;
}

function renderPagination() {
    const { next, previous, count } = state.pagination;
    if (!next && !previous) return '';

    return `
        <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Showing requirements...
                        <span class="font-medium">${count}</span> results
                    </p>
                </div>
                <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button onclick="loadStudents('${previous}')" 
                                ${!previous ? 'disabled' : ''}
                                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${!previous ? 'opacity-50 cursor-not-allowed' : ''}">
                            Previous
                        </button>
                        <button onclick="loadStudents('${next}')" 
                                ${!next ? 'disabled' : ''}
                                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${!next ? 'opacity-50 cursor-not-allowed' : ''}">
                            Next
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    `;
}

function getStatusColor(status) {
    switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-800';
        case 'INACTIVE': return 'bg-red-100 text-red-800';
        case 'GRADUATED': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// Global functions
window.updateFilter = (key, value) => {
    state.filters[key] = value;
};

window.applyFilters = () => {
    loadStudents();
    render();
};

window.loadStudents = (url) => loadStudents(url).then(render);

// ===================================
// ADD STUDENT MODAL
// ===================================
window.openAddStudentModal = () => {
    const modal = new Modal({
        title: 'Add New Student',
        content: `
            <form id="add-student-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">First Name *</label>
                        <input type="text" name="first_name" required class="form-input mt-1 block w-full">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Last Name *</label>
                        <input type="text" name="last_name" required class="form-input mt-1 block w-full">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700">Email *</label>
                    <input type="email" name="email" required class="form-input mt-1 block w-full" placeholder="personal@email.com">
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                     <div>
                        <label class="block text-sm font-medium text-gray-700">Birthdate *</label>
                        <input type="date" name="birthdate" required class="form-input mt-1 block w-full">
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700">Contact No.</label>
                        <input type="text" name="contact_number" class="form-input mt-1 block w-full">
                    </div>
                </div>
                 <div>
                    <label class="block text-sm font-medium text-gray-700">Address</label>
                    <input type="text" name="address" class="form-input mt-1 block w-full">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Program *</label>
                        <select name="program" required class="form-select mt-1 block w-full">
                            <option value="">Select Program</option>
                            ${state.programs.map(p => `<option value="${p.id}">${p.code} - ${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                         <label class="block text-sm font-medium text-gray-700">Year Level</label>
                         <select name="year_level" required class="form-select mt-1 block w-full">
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                         </select>
                    </div>
                </div>

                <div class="flex items-center gap-2 mt-4">
                    <input type="checkbox" id="is_transferee" name="is_transferee" 
                           onchange="document.getElementById('transferee-fields').classList.toggle('hidden', !this.checked)">
                    <label for="is_transferee" class="text-sm font-medium text-gray-700">Is Transferee?</label>
                </div>
                
                <div id="transferee-fields" class="hidden pl-4 border-l-2 border-blue-200 space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Previous School</label>
                        <input type="text" name="previous_school" class="form-input mt-1 block w-full">
                    </div>
                    <!-- Credited Subjects Simple Box for now -->
                     <p class="text-xs text-blue-600">Note: Manual subject crediting can be done after account creation via 'Edit' or 'Enrollment' page.</p>
                </div>
            </form>
        `,
        actions: [
            { label: 'Cancel', onClick: (m) => m.close() },
            {
                label: 'Create Student',
                primary: true,
                onClick: async (m) => {
                    const form = document.getElementById('add-student-form');
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }

                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    data.is_transferee = form.querySelector('#is_transferee').checked;

                    try {
                        const response = await api.post(endpoints.registrarStudents, data);
                        Toast.success(`Student created: ${response.student_number}`);
                        m.close();
                        loadStudents();
                        render();
                    } catch (error) {
                        ErrorHandler.handle(error, 'Creating student');
                    }
                }
            }
        ],
        size: 'lg'
    });
    modal.show();
};

// ===================================
// VIEW STUDENT MODAL
// ===================================
window.viewStudent = async (id) => {
    const student = await loadStudentDetails(id);
    if (!student) return;

    state.activeModalTab = 'profile';
    renderStudentModal();
};

function renderStudentModal() {
    if (!state.selectedStudent) return;

    const s = state.selectedStudent;

    // Content for tabs
    let content = '';

    if (state.activeModalTab === 'profile') {
        content = `
            <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div>
                    <p class="text-gray-500">Student Number</p>
                    <p class="font-bold">${s.student_number}</p>
                </div>
                <div>
                    <p class="text-gray-500">Email</p>
                    <p class="font-bold">${s.email}</p>
                </div>
                <div>
                    <p class="text-gray-500">Program</p>
                    <p class="font-bold">${s.program_code}</p>
                </div>
               <div>
                    <p class="text-gray-500">Year Level</p>
                    <p class="font-bold">${s.year_level}</p>
                </div>
                <div>
                    <p class="text-gray-500">Status</p>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(s.status)}">${s.status}</span>
                </div>
                <div>
                    <p class="text-gray-500">Curriculum</p>
                    <p class="font-bold">${s.curriculum_code || 'N/A'}</p>
                </div>
                <!-- Personal Info -->
                 <div class="col-span-2 mt-4 pt-4 border-t border-gray-100">
                    <h4 class="font-bold text-gray-700 mb-2">Personal Information</h4>
                </div>
                <div>
                    <p class="text-gray-500">Contact</p>
                    <p class="font-bold">${s.contact_number || '-'}</p>
                </div>
                <div>
                     <p class="text-gray-500">Address</p>
                    <p class="font-bold">${s.address || '-'}</p>
                </div>
                <div>
                     <p class="text-gray-500">Birthdate</p>
                    <p class="font-bold">${s.birthdate || '-'}</p>
                </div>
                ${s.is_transferee ? `
                    <div class="col-span-2">
                        <p class="text-gray-500">Previous School</p>
                        <p class="font-bold">${s.previous_school || '-'}</p>
                    </div>
                ` : ''}
            </div>
        `;
    } else if (state.activeModalTab === 'enrollment') {
        const enrollments = s.current_enrollment || [];
        content = `
             <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Section</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Units</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${enrollments.length > 0 ? enrollments.map(e => `
                            <tr>
                                <td class="px-4 py-2 font-medium">${e.subject_code}</td>
                                <td class="px-4 py-2 text-gray-600">${e.subject_title}</td>
                                <td class="px-4 py-2 text-gray-600">${e.section}</td>
                                <td class="px-4 py-2 text-gray-600">${e.units}</td>
                                <td class="px-4 py-2"><span class="px-2 text-xs rounded-full bg-blue-50 text-blue-700">${e.status}</span></td>
                            </tr>
                        `).join('') : `<tr><td colspan="5" class="px-4 py-4 text-center text-gray-500">No active enrollment</td></tr>`}
                    </tbody>
                </table>
             </div>
        `;
    } else if (state.activeModalTab === 'history') {
        const history = s.academic_history || [];
        content = `
             <div class="overflow-x-auto max-h-96 overflow-y-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Semester</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Title</th>
                            <th class="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Grade</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${history.length > 0 ? history.map(h => `
                            <tr>
                                <td class="px-4 py-2 text-gray-500 text-xs">${h.semester}</td>
                                <td class="px-4 py-2 font-medium">${h.subject_code}</td>
                                <td class="px-4 py-2 text-gray-600">${h.subject_title}</td>
                                <td class="px-4 py-2 font-bold ${getGradeColor(h.grade)}">${formatGrade(h.grade, h.status)}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="4" class="px-4 py-4 text-center text-gray-500">No academic history</td></tr>`}
                    </tbody>
                </table>
             </div>
        `;
    }

    const modal = new Modal({
        title: `Student Details: ${s.last_name}, ${s.first_name}`,
        content: `
            <div class="border-b border-gray-200 mb-4">
                <nav class="-mb-px flex space-x-8">
                    <button onclick="switchStudentTab('profile')" 
                            class="${state.activeModalTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                        Profile
                    </button>
                    <button onclick="switchStudentTab('enrollment')"
                            class="${state.activeModalTab === 'enrollment' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                        Current Enrollment (COR)
                    </button>
                    <button onclick="switchStudentTab('history')"
                            class="${state.activeModalTab === 'history' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
                        Academic History (TOR)
                    </button>
                </nav>
            </div>
            <div>
                ${content}
            </div>
            <div class="mt-6 flex justify-end gap-2">
                <button onclick="window.print()" class="btn btn-outline-secondary text-sm">Print / Save PDF</button>
            </div>
        `,
        actions: [],
        size: 'lg'
    });
    // We reuse modal instance if possible or create new.
    // Modal implementation usually creates new DOM check.
    // For tabs we might need to handle re-render.
    // Simplest is to close old and open new, but flicker. 
    // Ideally update content. But `Modal` class simplistic?
    // I'll assume simplistic: close and reopen or just show.

    // Close existing manually if open?
    // Modal class usually appends to body.
    // I'll just show it. If there is an efficient way to update, I'd use it.
    // I will modify `switchStudentTab` to re-call `renderStudentModal` which opens a *new* modal on top?
    // Optimization: Close all modals first.
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove()); // Hacky cleanup

    modal.show();
}

window.switchStudentTab = (tab) => {
    state.activeModalTab = tab;
    renderStudentModal();
};

window.editStudent = (id) => {
    // Placeholder for Edit - usually re-uses Add Modal with pre-filled data
    // For now, show info
    Toast.info('Edit functionality to be implemented (reuse Add Modal)');
};

window.deleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student record?')) return;
    try {
        await api.request(`${endpoints.registrarStudents}${id}/`, { method: 'DELETE' });
        Toast.success('Student deleted successfully');
        loadStudents();
    } catch (error) {
        ErrorHandler.handle(error, 'Deleting student');
    }
};

function formatGrade(grade, status) {
    if (status === 'CREDITED') return 'CREDIT';
    if (!grade) return '-';
    return grade;
}

function getGradeColor(grade) {
    if (!grade) return 'text-gray-800';
    const g = parseFloat(grade);
    if (g <= 3.0) return 'text-green-600'; // 1.0 is highest, 3.0 passing
    if (g > 3.0) return 'text-red-600'; // 5.0 fail
    return 'text-gray-800';
}

// Init
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
