import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal } from '../../../components/Modal.js';
import { debounce } from '../../../utils.js';

export const IdAssignmentModule = {
    init(ctx) {
        this.ctx = ctx;
        window.handleIdInput = debounce((e) => this.checkIdAvailability(e.target.value), 500);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    async openIdAssignmentModal(applicantId) {
        const applicant = this.state.applicants.find(a => a.id === applicantId);
        if (!applicant) return;

        // Generate a suggested ID (usually current year + sequence)
        const year = new Date().getFullYear();
        const suggestedId = `${year}-${Math.floor(1000 + Math.random() * 9000)}`;

        const modal = new Modal({
            title: 'Assign Student ID',
            content: `
                <div class="space-y-4">
                    <p class="text-sm text-gray-600">Assigning ID for <span class="font-bold">${applicant.first_name} ${applicant.last_name}</span></p>
                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-400 mb-1">Student ID Number</label>
                        <input type="text" id="assign-id-input" value="${suggestedId}" oninput="handleIdInput(event)" class="form-input text-lg font-mono">
                        <div id="id-status" class="mt-2 text-xs font-bold"></div>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Approve & Assign',
                    primary: true,
                    onClick: async (m) => {
                        const id = document.getElementById('assign-id-input').value;
                        if (!id) return Toast.error('Please enter an ID');
                        try {
                            await this.ctx.service.assignId(applicantId, id);
                            Toast.success('ID assigned and applicant approved');
                            m.close();
                            await this.ctx.loadApplicants();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
        this.checkIdAvailability(suggestedId);
    },

    async checkIdAvailability(id) {
        const statusEl = document.getElementById('id-status');
        if (!statusEl) return;

        if (!id) {
            statusEl.textContent = '';
            return;
        }

        statusEl.className = 'mt-2 text-xs font-bold text-gray-400';
        statusEl.textContent = 'Checking availability...';

        try {
            const resp = await this.ctx.service.checkIdAvailability(id);
            if (resp.available) {
                statusEl.className = 'mt-2 text-xs font-bold text-green-600';
                statusEl.textContent = '✓ ID is available';
            } else {
                statusEl.className = 'mt-2 text-xs font-bold text-red-600';
                statusEl.textContent = '✕ ID is already taken';
            }
        } catch (e) {
            statusEl.className = 'mt-2 text-xs font-bold text-red-600';
            statusEl.textContent = 'Could not verify ID';
        }
    }
};
