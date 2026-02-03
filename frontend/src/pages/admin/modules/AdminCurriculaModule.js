import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

export const AdminCurriculaModule = {
    init(ctx) {
        this.ctx = ctx;
        window.openAddCurriculumModal = () => this.openAddCurriculumModal();
        window.openEditCurriculumModal = (id) => this.openEditCurriculumModal(id);
        window.deleteCurriculum = (id) => this.deleteCurriculum(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderCurriculaTab() {
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-800">Academic Curricula</h2>
                <button onclick="openAddCurriculumModal()" class="btn btn-primary">Add Curriculum</button>
            </div>
            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Code</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${this.state.curricula.map(c => `
                            <tr>
                                <td class="px-6 py-4 font-bold text-gray-900">${c.code}</td>
                                <td class="px-6 py-4 text-sm">${c.name}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                                        ${c.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="openEditCurriculumModal('${c.id}')" class="text-gray-600 mr-2">Edit</button>
                                    <button onclick="deleteCurriculum('${c.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    openAddCurriculumModal() {
        const modal = new Modal({
            title: 'Add Curriculum',
            content: this.getCurriculumForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('c-code').value,
                            name: document.getElementById('c-name').value,
                            program: document.getElementById('c-prog').value,
                            effective_year: document.getElementById('c-year').value,
                            is_active: document.getElementById('c-active').checked
                        };
                        try {
                            await api.post(endpoints.manageCurricula, data);
                            Toast.success('Curriculum created');
                            m.close();
                            await this.ctx.loadCurricula();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    async openEditCurriculumModal(id) {
        const curriculum = this.state.curricula.find(c => c.id === id);
        if (!curriculum) return;

        const modal = new Modal({
            title: 'Edit Curriculum',
            content: this.getCurriculumForm(curriculum),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Update', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('c-code').value,
                            name: document.getElementById('c-name').value,
                            effective_year: document.getElementById('c-year').value,
                            is_active: document.getElementById('c-active').checked
                        };
                        try {
                            await api.patch(`${endpoints.manageCurricula}${id}/`, data);
                            Toast.success('Curriculum updated');
                            m.close();
                            await this.ctx.loadCurricula();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    deleteCurriculum(id) {
        ConfirmModal({
            title: 'Delete Curriculum', message: 'This cannot be undone if students are enrolled. Continue?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.manageCurricula}${id}/`);
                    Toast.success('Curriculum deleted');
                    await this.ctx.loadCurricula();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    getCurriculumForm(c = null) {
        return `
            <form class="space-y-4">
                <div><label class="block text-sm">Code</label><input id="c-code" value="${c?.code || ''}" class="form-input"></div>
                <div><label class="block text-sm">Name</label><input id="c-name" value="${c?.name || ''}" class="form-input"></div>
                <div>
                    <label class="block text-sm">Program</label>
                    <select id="c-prog" class="form-select" ${c ? 'disabled' : ''}>
                        ${this.state.programs.map(p => `<option value="${p.id}" ${c?.program === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
                    </select>
                </div>
                <div><label class="block text-sm">Effective Year</label><input id="c-year" value="${c?.effective_year || '2023'}" class="form-input"></div>
                <label class="flex items-center gap-2"><input type="checkbox" id="c-active" ${c?.is_active ? 'checked' : ''}> Set as Active</label>
            </form>
        `;
    }
};
