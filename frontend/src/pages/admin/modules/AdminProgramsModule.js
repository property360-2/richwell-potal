import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';

/**
 * Admin Programs Module
 * Refactored with Atomic UI Components
 */
export const AdminProgramsModule = {
    init(ctx) {
        this.ctx = ctx;
        window.openAddProgramModal = () => this.openAddProgramModal();
        window.openEditProgramModal = (id) => this.openEditProgramModal(id);
        window.deleteProgram = (id) => this.deleteProgram(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderProgramsTab() {
        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800 tracking-tight">Academic Programs</h2>
                    <p class="text-sm text-gray-500 font-medium">Define and modify course degree structures</p>
                </div>
                ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Program',
            onClick: 'openAddProgramModal()'
        })}
            </div>

            <div class="animate-in fade-in duration-500">
                ${UI.table({
            headers: ['Program Code', 'Full Description', 'School / Department', 'Actions'],
            rows: this.state.programs.map(p => [
                `<span class="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">${p.code}</span>`,
                `<div class="font-bold text-gray-800 text-sm">${p.name}</div>`,
                `<div class="text-xs font-black text-gray-400 uppercase tracking-widest">${p.department || 'Academic Affairs'}</div>`,
                `<div class="flex gap-2 justify-end">
                            ${UI.button({ label: 'Edit', type: 'ghost', size: 'sm', onClick: `openEditProgramModal('${p.id}')` })}
                            ${UI.button({ label: 'Delete', type: 'danger', size: 'sm', onClick: `deleteProgram('${p.id}')` })}
                        </div>`
            ])
        })}
            </div>
        `;
    },

    openAddProgramModal() {
        const modal = new Modal({
            title: 'Create Degree Program',
            content: this.getProgramForm(),
            size: 'md',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                { label: 'Initialize Program', primary: true, onClick: async (m) => await this.handleSubmit(m) }
            ]
        });
        modal.show();
    },

    async openEditProgramModal(id) {
        const program = this.state.programs.find(p => p.id === id);
        if (!program) return;

        const modal = new Modal({
            title: 'Edit Program Configuration',
            content: this.getProgramForm(program),
            size: 'md',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                { label: 'Save Changes', primary: true, onClick: async (m) => await this.handleSubmit(m, id) }
            ]
        });
        modal.show();
    },

    getProgramForm(p = null) {
        return `
            <form id="admin-prog-form" class="space-y-6 p-2">
                ${UI.field({ label: 'Program Code', id: 'f-code', value: p?.code || '', placeholder: 'e.g. BSIT, BSEE', required: true })}
                ${UI.field({ label: 'Program Full Name', id: 'f-name', value: p?.name || '', placeholder: 'e.g. Bachelor of Science in...', required: true })}
                ${UI.field({ label: 'Department / College', id: 'f-dept', value: p?.department || '', placeholder: 'e.g. College of Computing' })}
            </form>
        `;
    },

    async handleSubmit(modal, id = null) {
        const data = {
            code: document.getElementById('f-code').value.toUpperCase(),
            name: document.getElementById('f-name').value,
            department: document.getElementById('f-dept').value
        };

        const { isValid, errors } = Validator.validate(data, {
            code: [Validator.required, Validator.minLength(2)],
            name: [Validator.required, Validator.minLength(5)]
        });

        if (!isValid) return Toast.error(Object.values(errors)[0]);

        try {
            if (id) await api.patch(`${endpoints.managePrograms}${id}/`, data);
            else await api.post(endpoints.managePrograms, data);

            Toast.success(id ? 'Configuration updated' : 'Program established');
            modal.close();
            await this.ctx.loadPrograms();
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    deleteProgram(id) {
        ConfirmModal({
            title: 'Decommission Program', message: 'This will archive the program and all linked academic tracks. Proceed?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.managePrograms}${id}/`);
                    Toast.success('Program decommissioned');
                    await this.ctx.loadPrograms();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    }
};
