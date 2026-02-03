import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { requireAuth, formatDate, setButtonLoading } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { Modal } from '../../components/Modal.js';
import { Icon } from '../../atoms/icons/Icon.js';

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
            <div class="space-y-6">
                <!-- Header Section: Student & Subject -->
                <div class="flex items-start justify-between pb-4 border-b border-gray-100">
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 leading-tight">${resolution.student_name}</h3>
                        <p class="text-sm text-gray-500 font-medium tracking-wide">${resolution.student_number}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-bold text-gray-800">${resolution.subject_code}</p>
                        <p class="text-xs text-gray-500 truncate max-w-[200px]">${resolution.subject_title}</p>
                    </div>
                </div>

                <!-- Grade Change Visual -->
                <div class="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-2 opacity-10">
                        ${Icon('trending-up', { size: 'xl' })}
                    </div>
                    
                    <div class="flex items-center justify-between relative z-10">
                        <div class="text-center">
                            <span class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Current</span>
                            <span class="text-2xl font-bold text-gray-500 font-mono">${resolution.original_grade || 'INC'}</span>
                        </div>

                        <div class="flex flex-col items-center px-4">
                            <div class="h-0.5 w-12 bg-gray-200 mb-1"></div>
                            ${Icon('arrow-right', { size: 'sm', class: 'text-blue-500' })}
                            <div class="h-0.5 w-12 bg-gray-200 mt-1"></div>
                        </div>

                        <div class="text-center">
                            <span class="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Proposed</span>
                            <span class="text-3xl font-black text-blue-600 font-mono">${resolution.requested_grade}</span>
                        </div>
                    </div>
                    
                    <div class="mt-4 flex justify-center">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            Target Status: ${resolution.status || 'PASSED'}
                        </span>
                    </div>
                </div>

                <!-- Reason Section -->
                <div>
                    <h4 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        ${Icon('message-square', { size: 'xs' })} 
                        Reason for Request
                    </h4>
                    <div class="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 leading-relaxed italic border-l-4 border-blue-400">
                        "${resolution.reason || 'No reason provided.'}"
                    </div>
                    <p class="text-xs text-gray-400 mt-2 text-right">Requested by <span class="font-semibold text-gray-600">${resolution.requested_by_name}</span> on ${formatDate(resolution.created_at)}</p>
                </div>

                <!-- Notes Input -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">
                        Department Head Notes <span class="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea 
                        id="action-notes" 
                        class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                        rows="3" 
                        placeholder="Add any instructions, conditions, or rejection reasons here..."
                    ></textarea>
                </div>
            </div>
        `,
        actions: [
            {
                label: 'Reject Request',
                class: 'px-6 py-2.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg text-sm font-bold transition-all',
                onClick: () => handleAction('reject')
            },
            {
                label: 'Approve & Forward',
                class: 'px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 rounded-lg text-sm font-bold transition-all transform hover:-translate-y-0.5',
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
