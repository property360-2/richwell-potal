import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { formatDate } from '../../../utils.js';

export const AdminSemestersModule = {
    init(ctx) {
        this.ctx = ctx;
        window.openAddSemesterModal = () => this.openAddSemesterModal();
        window.openEditSemesterModal = (id) => this.openEditSemesterModal(id);
        window.deleteSemester = (id) => this.deleteSemester(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSemestersTab() {
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-800">Academic Semesters</h2>
                <button onclick="openAddSemesterModal()" class="btn btn-primary">Add Semester</button>
            </div>
            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Name</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Academic Year</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Status</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${this.state.semesters.map(s => `
                            <tr>
                                <td class="px-6 py-4 font-bold text-gray-900">${s.name}</td>
                                <td class="px-6 py-4 text-sm text-gray-600">${s.academic_year}</td>
                                <td class="px-6 py-4">
                                    <span class="px-2 py-1 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
                                        ${s.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="openEditSemesterModal('${s.id}')" class="text-gray-600 mr-2">Edit</button>
                                    <button onclick="deleteSemester('${s.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    openAddSemesterModal() {
        const modal = new Modal({
            title: 'Add Semester',
            content: this.getSemesterForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create', primary: true,
                    onClick: async (m) => {
                        const data = {
                            name: document.getElementById('s-sem-name').value,
                            academic_year: document.getElementById('s-ay').value,
                            start_date: document.getElementById('s-start').value,
                            end_date: document.getElementById('s-end').value,
                            is_active: document.getElementById('s-active').checked
                        };
                        try {
                            await api.post(endpoints.manageSemesters, data);
                            Toast.success('Semester created');
                            m.close();
                            await this.ctx.loadSemesters();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    async openEditSemesterModal(id) {
        const semester = this.state.semesters.find(s => s.id === id);
        if (!semester) return;

        const modal = new Modal({
            title: 'Edit Semester',
            content: this.getSemesterForm(semester),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Update', primary: true,
                    onClick: async (m) => {
                        const data = {
                            name: document.getElementById('s-sem-name').value,
                            academic_year: document.getElementById('s-ay').value,
                            start_date: document.getElementById('s-start').value,
                            end_date: document.getElementById('s-end').value,
                            is_active: document.getElementById('s-active').checked
                        };
                        try {
                            await api.patch(`${endpoints.manageSemesters}${id}/`, data);
                            Toast.success('Semester updated');
                            m.close();
                            await this.ctx.loadSemesters();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    deleteSemester(id) {
        ConfirmModal({
            title: 'Delete Semester', message: 'Proceed?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.manageSemesters}${id}/`);
                    Toast.success('Semester deleted');
                    await this.ctx.loadSemesters();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    getSemesterForm(s = null) {
        return `
            <form class="space-y-4">
                <div><label class="block text-sm">Semester Name</label><input id="s-sem-name" value="${s?.name || ''}" class="form-input"></div>
                <div><label class="block text-sm">Academic Year</label><input id="s-ay" value="${s?.academic_year || ''}" class="form-input"></div>
                <div><label class="block text-sm">Start Date</label><input type="date" id="s-start" value="${s?.start_date || ''}" class="form-input"></div>
                <div><label class="block text-sm">End Date</label><input type="date" id="s-end" value="${s?.end_date || ''}" class="form-input"></div>
                <label class="flex items-center gap-2"><input type="checkbox" id="s-active" ${s?.is_active ? 'checked' : ''}> Set as Active</label>
            </form>
        `;
    }
};
