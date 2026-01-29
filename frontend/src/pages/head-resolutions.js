import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { requireAuth, formatDate, setButtonLoading } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';
import { Modal } from '../components/Modal.js';
import { Icon } from '../atoms/icons/Icon.js';

// State
const state = {
    user: null,
    loading: true,
    resolutions: [],
    selectedResolution: null,
    submitting: false
};

async function init() {
    if (!requireAuth()) return;

    await loadUserProfile();
    if (!state.user) {
        window.location.href = '/login.html';
        return;
    }

    const role = state.user.role; // e.g. DEPARTMENT_HEAD
    console.log('Current User Role:', role);

    if (role !== 'DEPARTMENT_HEAD' && role !== 'ADMIN') {
        console.warn('Unauthorized role access to Head Resolutions:', role);

        // Redirect based on role
        if (role === 'STUDENT') window.location.href = '/student-dashboard.html';
        else if (role === 'PROFESSOR') window.location.href = '/professor-dashboard.html';
        else if (role === 'REGISTRAR' || role === 'HEAD_REGISTRAR') window.location.href = '/registrar-dashboard.html';
        else if (role === 'CASHIER') window.location.href = '/cashier-dashboard.html';
        else window.location.href = '/login.html';
        return;
    }

    await loadResolutions();

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
        ErrorHandler.handle(error, 'Loading profile');
    }
}

async function loadResolutions() {
    try {
        const response = await api.get(`${endpoints.gradeResolutions}pending/`);
        state.resolutions = response || [];
    } catch (error) {
        ErrorHandler.handle(error, 'Loading resolutions');
    }
}

function render() {
    const app = document.getElementById('app');

    if (state.loading) {
        app.innerHTML = LoadingOverlay('Loading pending resolutions...');
        return;
    }

    app.innerHTML = `
        ${createHeader({
        role: 'HEAD',
        activePage: 'head-resolutions',
        user: state.user
    })}

        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Grade Resolutions</h1>
                <p class="text-gray-600 mt-1">Review and approve grade change requests from professors.</p>
            </div>

            ${renderResolutionList()}
        </main>
    `;
}

function renderResolutionList() {
    if (state.resolutions.length === 0) {
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    ${Icon('check', { className: 'text-green-600', size: 'lg' })}
                </div>
                <h3 class="text-lg font-bold text-gray-800">All Clear!</h3>
                <p class="text-gray-500">There are no pending grade resolutions awaiting your review.</p>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Subject</th>
                        <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Current</th>
                        <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Proposed</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Requested By</th>
                        <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${state.resolutions.map(res => `
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4">
                                <div class="text-sm font-bold text-gray-900">${res.student_name}</div>
                                <div class="text-xs text-gray-500">${res.student_number}</div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-600">
                                <div class="font-medium">${res.subject_code}</div>
                                <div class="text-xs text-gray-400">${res.subject_title}</div>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <span class="px-2 py-1 bg-gray-100 rounded text-sm font-bold text-gray-600">${res.original_grade || 'INC'}</span>
                            </td>
                            <td class="px-6 py-4 text-center">
                                <span class="px-2 py-1 bg-blue-50 rounded text-sm font-bold text-blue-700">${res.requested_grade}</span>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                <div>${res.requested_by_name}</div>
                                <div class="text-xs">${formatDate(res.created_at)}</div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button onclick="window.viewResolution('${res.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-bold">
                                    Review Request
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.viewResolution = function (id) {
    const resolution = state.resolutions.find(r => r.id === id);
    if (!resolution) return;

    state.selectedResolution = resolution;

    const modal = new Modal({
        title: 'Review Grade Resolution',
        content: `
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Request Details</h4>
                    <p class="text-sm text-gray-700"><span class="font-bold">Reason:</span> ${resolution.reason}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span class="block text-xs text-blue-600 font-bold uppercase">Proposed Grade</span>
                        <span class="text-2xl font-black text-blue-700">${resolution.requested_grade}</span>
                    </div>
                    <div class="bg-orange-50 p-3 rounded-lg border border-orange-100">
                        <span class="block text-xs text-orange-600 font-bold uppercase">Target Status</span>
                        <span class="text-2xl font-black text-orange-700">${resolution.status || 'PASSED'}</span>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Approval Notes (Optional)</label>
                    <textarea id="action-notes" class="form-input w-full h-24" placeholder="Enter any specific instructions or justifications..."></textarea>
                </div>
            </div>
        `,
        actions: [
            {
                label: 'Reject Request',
                class: 'btn-secondary text-red-600',
                onClick: () => handleAction('reject')
            },
            {
                label: 'Approve & Forward to Registrar',
                class: 'btn-primary',
                onClick: () => handleAction('approve')
            }
        ],
        onClose: () => {
            state.activeModal = null;
        }
    });

    state.activeModal = modal;
    modal.show();
};

async function handleAction(actionType) {
    const notes = document.getElementById('action-notes').value;
    const id = state.selectedResolution.id;

    if (actionType === 'reject' && !notes) {
        Toast.error('Please provide a reason for rejection in the notes.');
        return;
    }

    try {
        state.submitting = true;
        const url = `${endpoints.gradeResolutions}${id}/${actionType}/`;
        const payload = actionType === 'reject' ? { reason: notes } : { notes };

        await api.post(url, payload);

        Toast.success(actionType === 'approve' ? 'Resolution forwarded to Registrar' : 'Resolution rejected');

        if (state.activeModal) {
            state.activeModal.close();
        }

        await loadResolutions();
        render();
    } catch (error) {
        ErrorHandler.handle(error, 'Processing resolution');
    } finally {
        state.submitting = false;
    }
}

document.addEventListener('DOMContentLoaded', init);
