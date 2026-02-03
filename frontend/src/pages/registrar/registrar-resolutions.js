import '../../../style.css';
import { api, endpoints, TokenManager } from '../../../api.js';
import { requireAuth, formatDate, setButtonLoading } from '../../../utils.js';
import { createHeader } from '../../../components/header.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { LoadingOverlay } from '../../../components/Spinner.js';
import { Modal } from '../../../components/Modal.js';
import { Icon } from '../../../atoms/icons/Icon.js';

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

  if (state.user.role !== 'REGISTRAR' && state.user.role !== 'HEAD_REGISTRAR' && state.user.role !== 'ADMIN') {
    // Redirect to appropriate dashboard based on role
    if (state.user.role === 'STUDENT') window.location.href = '/student-dashboard.html';
    else if (state.user.role === 'PROFESSOR') window.location.href = '/professor-dashboard.html';
    else if (state.user.role === 'DEPARTMENT_HEAD') window.location.href = '/head-dashboard.html';
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
    role: 'REGISTRAR',
    activePage: 'registrar-resolutions',
    user: state.user
  })}

        <main class="max-w-7xl mx-auto px-4 py-8">
            <div class="mb-8 flex items-start justify-between">
                <div>
                    <h1 class="text-3xl font-bold text-gray-800">Final Grade Review</h1>
                    <p class="text-gray-600 mt-1">Review and finalize grade changes approved by Department Heads.</p>
                </div>
                <div class="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span class="block text-xs font-bold text-blue-600 uppercase">Pending Review</span>
                    <span class="text-xl font-black text-blue-700">${state.resolutions.length}</span>
                </div>
            </div>

            ${renderResolutionList()}
        </main>
    `;
}

function renderResolutionList() {
  if (state.resolutions.length === 0) {
    return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div class="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    ${Icon('check', { className: 'text-blue-600', size: 'lg' })}
                </div>
                <h3 class="text-lg font-bold text-gray-800">No Pending Requests</h3>
                <p class="text-gray-500">There are no grade resolutions awaiting final registrar review.</p>
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
                        <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Grade Change</th>
                        <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Approvals</th>
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
                                <div class="flex items-center justify-center gap-2">
                                    <span class="text-xs text-gray-400 line-through">${res.original_grade || 'INC'}</span>
                                    ${Icon('chevron-right', { size: 'xs', className: 'text-gray-300' })}
                                    <span class="text-sm font-bold text-blue-700">${res.requested_grade}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-sm text-gray-500">
                                <div class="flex items-center gap-1.5 text-xs text-green-600 font-bold">
                                    ${Icon('check', { size: 'xs' })} 
                                    Head: ${res.requested_by_name}
                                </div>
                                <div class="text-[10px] text-gray-400 mt-1">${formatDate(res.created_at)}</div>
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button onclick="window.viewResolution('${res.id}')" class="btn btn-primary text-xs py-1.5 px-3">
                                    Review & Finalize
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
    title: 'Final Grade Approval',
    content: `
            <div class="space-y-4">
                <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                    <div class="mt-0.5">${Icon('info', { className: 'text-yellow-600', size: 'sm' })}</div>
                    <div>
                        <p class="text-sm font-bold text-yellow-800">Administrator Notice</p>
                        <p class="text-xs text-yellow-700">Approving this request will immediately update the student's official transcript and create a grade history trail.</p>
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-xs font-bold text-gray-400 uppercase mb-2">Academic Justification</h4>
                    <p class="text-sm text-gray-700 font-medium italic">"${resolution.reason}"</p>
                    <div class="mt-3 pt-3 border-t border-gray-200">
                         <span class="text-[10px] text-gray-400 uppercase font-bold">Recommended By:</span>
                         <p class="text-xs text-gray-600 font-bold">${resolution.requested_by_name} (Program Head)</p>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Registrar Remarks</label>
                    <textarea id="action-notes" class="form-input w-full h-24" placeholder="Enter optional notes for the audit trail..."></textarea>
                </div>
            </div>
        `,
    actions: [
      {
        label: 'Reject Resolution',
        class: 'btn-secondary text-red-600',
        onClick: () => handleAction('reject')
      },
      {
        label: 'Final Approval (Update Grade)',
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
    Toast.error('Please provide a reason for rejection.');
    return;
  }

  try {
    state.submitting = true;
    const url = `${endpoints.gradeResolutions}${id}/${actionType}/`;
    const payload = actionType === 'reject' ? { reason: notes } : { notes };

    await api.post(url, payload);

    Toast.success(actionType === 'approve' ? 'Grade finalized and updated' : 'Resolution rejected');

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
