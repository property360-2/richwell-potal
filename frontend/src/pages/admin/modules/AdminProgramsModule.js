import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

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
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-800">Degree Programs</h2>
                <button onclick="openAddProgramModal()" class="btn btn-primary">Add Program</button>
            </div>
            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Code</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Department</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${this.state.programs.map(p => `
                            <tr>
                                <td class="px-6 py-4 font-bold text-blue-600">${p.code}</td>
                                <td class="px-6 py-4 text-sm">${p.name}</td>
                                <td class="px-6 py-4 text-sm text-gray-500">${p.department || 'General'}</td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="openEditProgramModal('${p.id}')" class="text-gray-600 mr-2">Edit</button>
                                    <button onclick="deleteProgram('${p.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    openAddProgramModal() {
        const modal = new Modal({
            title: 'Add Program',
            content: this.getProgramForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('p-code').value,
                            name: document.getElementById('p-name').value,
                            department: document.getElementById('p-dept').value
                        };
                        try {
                            await api.post(endpoints.managePrograms, data);
                            Toast.success('Program created');
                            m.close();
                            await this.ctx.loadPrograms();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    async openEditProgramModal(id) {
        const program = this.state.programs.find(p => p.id === id);
        if (!program) return;

        const modal = new Modal({
            title: 'Edit Program',
            content: this.getProgramForm(program),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Update', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('p-code').value,
                            name: document.getElementById('p-name').value,
                            department: document.getElementById('p-dept').value
                        };
                        try {
                            await api.patch(`${endpoints.managePrograms}${id}/`, data);
                            Toast.success('Program updated');
                            m.close();
                            await this.ctx.loadPrograms();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    deleteProgram(id) {
        ConfirmModal({
            title: 'Delete Program', message: 'This will also affect associated subjects and curricula. Continue?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.managePrograms}${id}/`);
                    Toast.success('Program deleted');
                    await this.ctx.loadPrograms();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    getProgramForm(p = null) {
        return `
            <form class="space-y-4">
                <div><label class="block text-sm">Code</label><input id="p-code" value="${p?.code || ''}" class="form-input"></div>
                <div><label class="block text-sm">Name</label><input id="p-name" value="${p?.name || ''}" class="form-input"></div>
                <div><label class="block text-sm">Department</label><input id="p-dept" value="${p?.department || ''}" class="form-input"></div>
            </form>
        `;
    }
};
