import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { formatDate, requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// State
const state = {
    user: null,
    students: [],
    loading: true,
    filters: {
        status: 'all',
        search: ''
    },
    selectedStudent: null
};

async function init() {
    if (!requireAuth()) return;

    await loadUserProfile();
    await loadStudents();
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
        ErrorHandler.handle(error, 'Loading user profile');
        const savedUser = TokenManager.getUser();
        if (savedUser) {
            state.user = savedUser;
        }
    }
}

async function loadStudents() {
    try {
        const statusFilter = state.filters.status === 'all' ? 'all' : state.filters.status;
        const response = await api.get(endpoints.allStudents(statusFilter));

        const enrollments = response?.results || response || [];

        if (Array.isArray(enrollments)) {
            state.students = enrollments.map(enrollment => ({
                id: enrollment.id,
                student_number: enrollment.student_number,
                first_name: enrollment.first_name || 'Unknown',
                last_name: enrollment.last_name || 'Student',
                email: enrollment.email,
                status: enrollment.status,
                year_level: enrollment.year_level || 1,
                created_at: enrollment.created_at,
                program: enrollment.program || { code: 'N/A', name: 'N/A' },
                contact_number: enrollment.contact_number,
                address: enrollment.address,
                student_id: enrollment.student_id,
                first_month_paid: enrollment.first_month_paid,
                has_subject_enrollments: enrollment.has_subject_enrollments,
                can_be_marked_admitted: enrollment.can_be_marked_admitted,
                subject_enrollment_count: enrollment.subject_enrollment_count || 0
            }));
        } else {
            state.students = [];
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading students');
        state.students = [];
    }
    state.loading = false;
}

function getFilteredStudents() {
    let filtered = state.students;

    // Search filter
    if (state.filters.search) {
        const search = state.filters.search.toLowerCase();
        filtered = filtered.filter(s =>
            s.first_name?.toLowerCase().includes(search) ||
            s.last_name?.toLowerCase().includes(search) ||
            s.student_number?.toLowerCase().includes(search) ||
            s.email?.toLowerCase().includes(search)
        );
    }

    return filtered;
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'ACTIVE': return 'bg-green-100 text-green-800';
        case 'ADMITTED': return 'bg-blue-100 text-blue-800';
        case 'PENDING': return 'bg-yellow-100 text-yellow-800';
        case 'PENDING_PAYMENT': return 'bg-orange-100 text-orange-800';
        case 'HOLD': return 'bg-gray-100 text-gray-800';
        case 'COMPLETED': return 'bg-purple-100 text-purple-800';
        case 'REJECTED': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusLabel(status) {
    switch (status) {
        case 'ACTIVE': return 'Active (Enrolled)';
        case 'ADMITTED': return 'Admitted (No Subjects)';
        case 'PENDING': return 'Pending';
        case 'PENDING_PAYMENT': return 'Pending Payment';
        case 'HOLD': return 'On Hold';
        case 'COMPLETED': return 'Completed';
        case 'REJECTED': return 'Rejected';
        default: return status;
    }
}

function getUserHeaderRole() {
    if (!state.user) return 'ADMISSION';
    const role = state.user.role?.toUpperCase();
    if (role === 'REGISTRAR' || role === 'HEAD_REGISTRAR') {
        return 'REGISTRAR';
    }
    return 'ADMISSION';
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading students...');
        return;
    }

    const filteredStudents = getFilteredStudents();
    const headerRole = getUserHeaderRole();

    // Stats
    const totalStudents = state.students.length;
    const activeCount = state.students.filter(s => s.status === 'ACTIVE').length;
    const admittedCount = state.students.filter(s => s.status === 'ADMITTED').length;
    const pendingCount = state.students.filter(s => s.status === 'PENDING').length;

    app.innerHTML = `
        ${createHeader({
        role: headerRole,
        activePage: 'all-students',
        user: state.user
    })}
        
        <main class="max-w-7xl mx-auto px-4 py-8">
            <!-- Page Title -->
            <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">All Students</h1>
                    <p class="text-gray-600 mt-1">View all students including enrolled and admitted</p>
                </div>
                <div class="mt-4 md:mt-0">
                    <span class="badge badge-info text-sm py-2 px-4">${filteredStudents.length} Student(s)</span>
                </div>
            </div>
            
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                ${renderStatCard('Total Students', totalStudents, 'blue')}
                ${renderStatCard('Active (Enrolled)', activeCount, 'green')}
                ${renderStatCard('Admitted (No Subjects)', admittedCount, 'indigo')}
                ${renderStatCard('Pending Approval', pendingCount, 'yellow')}
            </div>
            
            <!-- Filters -->
            <div class="card mb-6">
                <div class="flex flex-wrap gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select id="filter-status" class="form-input py-2" onchange="handleFilterChange()">
                            <option value="all" ${state.filters.status === 'all' ? 'selected' : ''}>All Status</option>
                            <option value="ACTIVE" ${state.filters.status === 'ACTIVE' ? 'selected' : ''}>Active (Enrolled)</option>
                            <option value="ADMITTED" ${state.filters.status === 'ADMITTED' ? 'selected' : ''}>Admitted (No Subjects)</option>
                            <option value="PENDING" ${state.filters.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                            <option value="PENDING_PAYMENT" ${state.filters.status === 'PENDING_PAYMENT' ? 'selected' : ''}>Pending Payment</option>
                            <option value="HOLD" ${state.filters.status === 'HOLD' ? 'selected' : ''}>On Hold</option>
                            <option value="COMPLETED" ${state.filters.status === 'COMPLETED' ? 'selected' : ''}>Completed</option>
                            <option value="REJECTED" ${state.filters.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                            <option value="ACTIVE,ADMITTED" ${state.filters.status === 'ACTIVE,ADMITTED' ? 'selected' : ''}>Active & Admitted</option>
                        </select>
                    </div>
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input type="text" id="filter-search" 
                               class="form-input py-2 w-full" 
                               placeholder="Search by name, student number, or email..."
                               value="${state.filters.search}"
                               oninput="handleSearchChange(event)">
                    </div>
                    <div class="flex items-end">
                        <button onclick="resetFilters()" class="btn-secondary py-2 px-4">Reset Filters</button>
                    </div>
                </div>
            </div>
            
            <!-- Students Table -->
            <div class="table-container">
                <table class="w-full">
                    <thead>
                        <tr class="table-header">
                            <th class="px-6 py-4 text-left">Student</th>
                            <th class="px-6 py-4 text-left">Program</th>
                            <th class="px-6 py-4 text-center">Year</th>
                            <th class="px-6 py-4 text-center">Subjects</th>
                            <th class="px-6 py-4 text-center">Status</th>
                            <th class="px-6 py-4 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredStudents.length > 0 ? filteredStudents.map(student => renderStudentRow(student)).join('') : `
                            <tr>
                                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                                    <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                    </svg>
                                    <p>No students found matching your filters</p>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </main>

        <!-- Student Detail Modal -->
        ${state.selectedStudent ? renderStudentModal(state.selectedStudent) : ''}
    `;
}

function renderStatCard(label, value, color) {
    const bgColors = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        indigo: 'bg-indigo-50',
        yellow: 'bg-yellow-50',
        red: 'bg-red-50'
    };
    const textColors = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        indigo: 'text-indigo-600',
        yellow: 'text-yellow-600',
        red: 'text-red-600'
    };

    return `
        <div class="card text-center ${bgColors[color]}">
            <p class="text-3xl font-bold ${textColors[color]}">${value}</p>
            <p class="text-sm text-gray-500 mt-1">${label}</p>
        </div>
    `;
}

function renderStudentRow(student) {
    return `
        <tr class="table-row">
            <td class="px-6 py-4">
                <div>
                    <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
                    <p class="text-sm text-gray-500">${student.student_number || 'No ID assigned'}</p>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="font-medium text-gray-800">${student.program?.code || 'N/A'}</span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="text-gray-700">${student.year_level || '-'}</span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-full ${student.subject_enrollment_count > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'} font-medium text-sm">
                    ${student.subject_enrollment_count}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(student.status)}">
                    ${getStatusLabel(student.status)}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <button onclick="viewStudent('${student.id}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    View Details
                </button>
            </td>
        </tr>
    `;
}

function renderStudentModal(student) {
    return `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                <!-- Modal Header -->
                <div class="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 class="text-xl font-bold text-gray-800">Student Details</h2>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Modal Body -->
                <div class="p-6 space-y-6">
                    <!-- Profile Section -->
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            ${(student.first_name || 'U')[0]}${(student.last_name || 'N')[0]}
                        </div>
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-gray-800">${student.first_name || 'Unknown'} ${student.last_name || 'Student'}</h3>
                            <p class="text-gray-500">${student.email || 'No email'}</p>
                            <div class="flex gap-2 mt-2">
                                <span class="badge badge-info">${student.student_number || 'No ID'}</span>
                                <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(student.status)}">${getStatusLabel(student.status)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Info Grid -->
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">Program</p>
                            <p class="font-medium">${student.program?.name || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">Year Level</p>
                            <p class="font-medium">Year ${student.year_level || 1}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">Subjects Enrolled</p>
                            <p class="font-medium">${student.subject_enrollment_count} subject(s)</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">First Month Paid</p>
                            <p class="font-medium">${student.first_month_paid ? 'Yes' : 'No'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">Contact Number</p>
                            <p class="font-medium">${student.contact_number || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-4">
                            <p class="text-sm text-gray-500">Created At</p>
                            <p class="font-medium">${formatDate(student.created_at)}</p>
                        </div>
                        ${student.address ? `
                            <div class="bg-gray-50 rounded-xl p-4 col-span-2">
                                <p class="text-sm text-gray-500">Address</p>
                                <p class="font-medium">${student.address}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Status Info -->
                    ${student.status === 'ADMITTED' ? `
                        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>
                                    <p class="font-semibold text-blue-800">Admitted Status</p>
                                    <p class="text-sm text-blue-700 mt-1">This student has been admitted and paid the initial fee, but did not enroll in subjects during the enrollment period. They can be enrolled in subjects through subject enrollment or marked as active once they select their subjects.</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${student.status === 'ACTIVE' && student.subject_enrollment_count === 0 ? `
                        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                            <div class="flex items-start gap-3">
                                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <div>
                                    <p class="font-semibold text-yellow-800">No Subject Enrollments</p>
                                    <p class="text-sm text-yellow-700 mt-1">This student is active but has not enrolled in any subjects yet. Consider contacting them or marking as ADMITTED if the enrollment period has closed.</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Modal Footer -->
                <div class="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
                    <button onclick="closeModal()" class="btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;
}

// Event handlers
window.handleFilterChange = async function () {
    state.filters.status = document.getElementById('filter-status').value;
    state.loading = true;
    render();
    await loadStudents();
    render();
};

window.handleSearchChange = function (event) {
    state.filters.search = event.target.value;
    render();
};

window.resetFilters = async function () {
    state.filters = { status: 'all', search: '' };
    state.loading = true;
    render();
    await loadStudents();
    render();
};

window.viewStudent = function (id) {
    state.selectedStudent = state.students.find(s => s.id === id || s.id == id);
    render();
};

window.closeModal = function (event) {
    if (event && event.target !== event.currentTarget) return;
    state.selectedStudent = null;
    render();
};

// Init
document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
