import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal } from '../../../components/Modal.js';
import { Icon } from '../../../atoms/icons/Icon.js';
import { formatDate } from '../../../utils.js';

/**
 * Resolutions Module for Registrar Student Management Page
 * Handles Review and Finalization of Grade Resolutions
 */
export const ResolutionsModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.viewResolution = (id) => this.viewResolution(id);
        window.handleResolutionAction = (action) => this.handleAction(action);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    async loadResolutions() {
        try {
            const response = await api.get(`${endpoints.gradeResolutions}pending/`);
            this.state.resolutions = response || [];
        } catch (error) {
            ErrorHandler.handle(error, 'Loading resolutions');
        }
    },

    renderResolutionsTab() {
        if (this.state.resolutionsLoading) {
            return `
                <div class="flex flex-col items-center justify-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p class="text-gray-500 mt-4 font-medium">Loading pending resolutions...</p>
                </div>
            `;
        }

        if (this.state.resolutions.length === 0) {
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
                        ${this.state.resolutions.map(res => `
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
                                        ${Icon('chevronRight', { size: 'xs', className: 'text-gray-300' })}
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
                                    <button onclick="viewResolution('${res.id}')" class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                        Review & Finalize
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    viewResolution(id) {
        const resolution = this.state.resolutions.find(r => r.id === id);
        if (!resolution) return;

        this.state.selectedResolution = resolution;

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
                        <textarea id="action-notes" class="w-full h-24 border border-gray-200 rounded-lg p-3 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" placeholder="Enter optional notes for the audit trail..."></textarea>
                    </div>
                </div>
            `,
            actions: [
                {
                    label: 'Reject Resolution',
                    onClick: () => this.handleAction('reject')
                },
                {
                    label: 'Final Approval (Update Grade)',
                    primary: true,
                    onClick: () => this.handleAction('approve')
                }
            ]
        });

        this.state.activeModuleModal = modal;
        modal.show();
    },

    async handleAction(actionType) {
        const notes = document.getElementById('action-notes').value;
        const id = this.state.selectedResolution.id;

        if (actionType === 'reject' && !notes) {
            Toast.error('Please provide a reason for rejection.');
            return;
        }

        try {
            const url = `${endpoints.gradeResolutions}${id}/${actionType}/`;
            const payload = actionType === 'reject' ? { reason: notes } : { notes };

            await api.post(url, payload);

            Toast.success(actionType === 'approve' ? 'Grade finalized and updated' : 'Resolution rejected');

            if (this.state.activeModuleModal) {
                this.state.activeModuleModal.close();
            }

            await this.loadResolutions();
            this.render();
        } catch (error) {
            ErrorHandler.handle(error, 'Processing resolution');
        }
    }
};
