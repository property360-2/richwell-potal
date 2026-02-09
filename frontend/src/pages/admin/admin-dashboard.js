import '../../style.css';
import { createHeader } from '../../components/header.js';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth } from '../../utils.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { Toast } from '../../components/Toast.js';
import { renderStatCardGrid, renderQuickActionGrid } from '../../molecules/index.js';

// State
const state = {
    user: null
};

// Initialize the page
async function init() {
    if (!requireAuth()) return;

    // Get user from localStorage first for quick render
    state.user = TokenManager.getUser();

    if (!state.user || state.user.role !== 'ADMIN') {
        Toast.error('Access denied. Admin only.');
        window.location.href = '/pages/auth/login.html';
        return;
    }

    render();
    loadStats();
}

function render() {
    const app = document.getElementById('app');

    app.innerHTML = `
        ${createHeader({
        role: 'ADMIN',
        activePage: 'admin-dashboard',
        user: state.user
    })}

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p class="mt-2 text-sm text-gray-600">System administration and management</p>
            </div>

            <!-- Quick Stats -->
            ${renderStatCardGrid([
        {
            label: 'Total Users',
            value: '-',
            valueId: 'total-users',
            icon: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
            color: 'blue'
        },
        {
            label: 'Total Subjects',
            value: '-',
            valueId: 'total-subjects',
            icon: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>',
            color: 'green'
        },
        {
            label: 'Total Programs',
            value: '-',
            valueId: 'total-programs',
            icon: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
            color: 'purple'
        },
        {
            label: 'Active Semester',
            value: '-',
            valueId: 'active-semester',
            icon: '<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
            color: 'orange'
        }
    ], { columns: 4, className: 'mb-8' })}

            <!-- Quick Actions -->
            <div class="bg-white shadow sm:rounded-lg mb-8">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                    ${renderQuickActionGrid([
        {
            href: '/pages/admin/admin-users.html',
            title: 'User Management',
            description: 'Manage users and permissions',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />',
            iconColor: 'text-blue-600'
        },
        {
            href: '/pages/admin/admin-academic.html',
            title: 'Academic',
            description: 'Programs, subjects, curricula, semesters',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />',
            iconColor: 'text-green-600'
        },
        {
            href: '/pages/admin/admin-sections.html',
            title: 'Sections',
            description: 'Manage sections and schedules',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />',
            iconColor: 'text-purple-600'
        },
        {
            href: '/pages/admin/admin-audit-logs.html',
            title: 'Audit Logs',
            description: 'View system activity logs',
            icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />',
            iconColor: 'text-orange-600'
        }
    ])}
                </div>
            </div>

            <!-- Recent Activity (placeholder) -->
            <div class="bg-white shadow sm:rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">System Overview</h3>
                    <p class="text-sm text-gray-500">
                        Welcome to the admin dashboard. Use the navigation menu above or the quick actions to manage the system.
                    </p>
                </div>
            </div>
        </div>
    `;

}

// Global logout function
window.logout = function () {
    TokenManager.clearTokens();
    Toast.success('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/pages/auth/login.html';
    }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();

async function loadStats() {
    try {
        // Load users count
        const usersResponse = await api.get(endpoints.users);
        if (usersResponse.success && usersResponse.users) {
            document.getElementById('total-users').textContent = usersResponse.users.length;
        }

        // Load subjects count
        const subjectsResponse = await api.get(endpoints.manageSubjects);
        if (subjectsResponse.results) {
            document.getElementById('total-subjects').textContent = subjectsResponse.results.length;
        }

        // Load programs count
        const programsResponse = await api.get(endpoints.programs);
        if (programsResponse.results) {
            document.getElementById('total-programs').textContent = programsResponse.results.length;
        }

        // Load active semester
        const semestersResponse = await api.get(endpoints.semesters);
        if (semestersResponse.results) {
            const activeSemester = semestersResponse.results.find(s => s.status === 'ACTIVE');
            document.getElementById('active-semester').textContent = activeSemester ? activeSemester.name : 'None';
        }
    } catch (error) {
        ErrorHandler.handle(error, 'Loading dashboard stats');
    }
}
