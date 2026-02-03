import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

export const AdminSubjectsModule = {
    init(ctx) {
        this.ctx = ctx;
        window.openAddSubjectModal = () => this.openAddSubjectModal();
        window.openEditSubjectModal = (id) => this.openEditSubjectModal(id);
        window.deleteSubject = (id) => this.deleteSubject(id);
        window.handleProgramFilterChange = (id) => this.handleProgramFilterChange(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSubjectsTab() {
        return `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl font-bold text-gray-800">Subject Repository</h2>
                <div class="flex gap-4">
                    <select onchange="handleProgramFilterChange(this.value)" class="form-select text-sm h-10 w-48">
                        <option value="">All Programs</option>
                        ${this.state.programs.map(p => `<option value="${p.id}" ${this.state.subjectFilterProgram === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
                    </select>
                    <button onclick="openAddSubjectModal()" class="btn btn-primary">Add Subject</button>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Code</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Title</th>
                            <th class="px-6 py-3 text-left text-xs font-bold uppercase">Units</th>
                            <th class="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y">
                        ${this.state.subjects.map(s => `
                            <tr>
                                <td class="px-6 py-4 font-bold text-indigo-600">${s.code}</td>
                                <td class="px-6 py-4 text-sm">${s.title || s.name}</td>
                                <td class="px-6 py-4 text-sm">${s.units}</td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="openEditSubjectModal('${s.id}')" class="text-gray-600 mr-2">Edit</button>
                                    <button onclick="deleteSubject('${s.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    handleProgramFilterChange(id) {
        this.state.subjectFilterProgram = id;
        this.ctx.loadSubjects(id).then(() => this.render());
    },

    openAddSubjectModal() {
        const modal = new Modal({
            title: 'Add Subject',
            content: this.getSubjectForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('s-code').value,
                            title: document.getElementById('s-title').value,
                            units: parseInt(document.getElementById('s-units').value),
                            program: document.getElementById('s-prog').value
                        };
                        try {
                            await api.post(endpoints.manageSubjects, data);
                            Toast.success('Subject created');
                            m.close();
                            await this.ctx.loadSubjects(this.state.subjectFilterProgram);
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    async openEditSubjectModal(id) {
        const subject = this.state.subjects.find(s => s.id === id);
        if (!subject) return;

        const modal = new Modal({
            title: 'Edit Subject',
            content: this.getSubjectForm(subject),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Update', primary: true,
                    onClick: async (m) => {
                        const data = {
                            code: document.getElementById('s-code').value,
                            title: document.getElementById('s-title').value,
                            units: parseInt(document.getElementById('s-units').value),
                            program: document.getElementById('s-prog').value
                        };
                        try {
                            await api.patch(`${endpoints.manageSubjects}${id}/`, data);
                            Toast.success('Subject updated');
                            m.close();
                            await this.ctx.loadSubjects(this.state.subjectFilterProgram);
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    },

    deleteSubject(id) {
        ConfirmModal({
            title: 'Delete Subject', message: 'Proceed with deletion?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.manageSubjects}${id}/`);
                    Toast.success('Subject deleted');
                    await this.ctx.loadSubjects(this.state.subjectFilterProgram);
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    getSubjectForm(s = null) {
        return `
            <form class="space-y-4">
                <div><label class="block text-sm">Code</label><input id="s-code" value="${s?.code || ''}" class="form-input"></div>
                <div><label class="block text-sm">Title</label><input id="s-title" value="${s?.title || s?.name || ''}" class="form-input"></div>
                <div><label class="block text-sm">Units</label><input type="number" id="s-units" value="${s?.units || 3}" class="form-input"></div>
                <div>
                    <label class="block text-sm">Program</label>
                    <select id="s-prog" class="form-select">
                        <option value="">None (General)</option>
                        ${this.state.programs.map(p => `<option value="${p.id}" ${s?.program === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
                    </select>
                </div>
            </form>
        `;
    }
};
