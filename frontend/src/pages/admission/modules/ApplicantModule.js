import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { formatDate } from '../../../utils.js';

export const ApplicantModule = {
    init(ctx) {
        this.ctx = ctx;
        window.viewApplicant = (id) => this.viewApplicant(id);
        window.verifyDocument = (aid, doc) => this.verifyDocument(aid, doc);
        window.approveApplicant = (aid) => this.ctx.idModule.openIdAssignmentModal(aid);
        window.rejectApplicant = (id) => this.rejectApplicant(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderApplicantsTable() {
        const filtered = this.state.applicants.filter(a => {
            const matchesSearch = !this.state.searchQuery ||
                `${a.first_name} ${a.last_name}`.toLowerCase().includes(this.state.searchQuery.toLowerCase()) ||
                a.email.toLowerCase().includes(this.state.searchQuery.toLowerCase());
            const matchesStatus = this.state.statusFilter === 'all' || a.status === this.state.statusFilter;
            return matchesSearch && matchesStatus;
        });

        return `
            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Applicant</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Program</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Date</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${filtered.map(a => `
                            <tr class="hover:bg-gray-50 cursor-pointer" onclick="viewApplicant('${a.id}')">
                                <td class="px-6 py-4">
                                    <div class="font-bold text-gray-900">${a.first_name} ${a.last_name}</div>
                                    <div class="text-xs text-gray-500">${a.email}</div>
                                </td>
                                <td class="px-6 py-4 text-sm">${a.program_code || '---'}</td>
                                <td class="px-6 py-4 text-xs text-gray-500">${formatDate(a.created_at)}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${this.getStatusClass(a.status)}">
                                        ${a.status}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button class="text-blue-600 font-bold text-xs" onclick="event.stopPropagation(); viewApplicant('${a.id}')">Review</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    getStatusClass(status) {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-700';
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    },

    async viewApplicant(id) {
        const applicant = this.state.applicants.find(a => a.id === id);
        if (!applicant) return;

        const modal = new Modal({
            title: 'Applicant Details',
            content: this.getApplicantDetailsContent(applicant),
            size: 'lg',
            actions: [
                { label: 'Close', onClick: (m) => m.close() },
                applicant.status === 'PENDING' ? {
                    label: 'Reject Applicant',
                    danger: true,
                    onClick: () => { modal.close(); this.rejectApplicant(id); }
                } : null,
                applicant.status === 'PENDING' ? {
                    label: 'Approve & Assign ID',
                    primary: true,
                    onClick: () => { modal.close(); this.ctx.idModule.openIdAssignmentModal(id); }
                } : null
            ].filter(Boolean)
        });
        modal.show();
    },

    getApplicantDetailsContent(a) {
        return `
            <div class="grid grid-cols-2 gap-6">
                <div>
                    <h4 class="text-xs font-black uppercase text-gray-400 mb-2">Personal Information</h4>
                    <div class="space-y-2">
                        <p class="text-sm"><span class="font-bold">Full Name:</span> ${a.first_name} ${a.last_name}</p>
                        <p class="text-sm"><span class="font-bold">Gender:</span> ${a.gender}</p>
                        <p class="text-sm"><span class="font-bold">Contact:</span> ${a.contact_number}</p>
                        <p class="text-sm"><span class="font-bold">Address:</span> ${a.address}</p>
                    </div>
                </div>
                <div>
                    <h4 class="text-xs font-black uppercase text-gray-400 mb-2">Academic Information</h4>
                    <div class="space-y-2">
                        <p class="text-sm"><span class="font-bold">Program:</span> ${a.program_name}</p>
                        <p class="text-sm"><span class="font-bold">Year Level:</span> ${a.year_level}</p>
                    </div>
                </div>
            </div>
        `;
    },

    async rejectApplicant(id) {
        ConfirmModal({
            title: 'Reject Applicant',
            message: 'Are you sure you want to reject this applicant? Enter reason below (optional):',
            content: '<textarea id="reject-reason" class="form-input mt-4" placeholder="Reason for rejection..."></textarea>',
            danger: true,
            onConfirm: async () => {
                const reason = document.getElementById('reject-reason').value;
                try {
                    await this.ctx.service.rejectApplicant(id, reason);
                    Toast.success('Applicant rejected');
                    await this.ctx.loadApplicants();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    }
};
