import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { formatDate } from '../../../utils.js';

export const SemestersModule = {
    init(ctx) {
        this.ctx = ctx;
        window.handleSemesterSearch = (q) => this.handleSemesterSearch(q);
        window.openAddSemesterModal = () => this.openAddSemesterModal();
        window.openEditSemesterModal = (id) => this.openEditSemesterModal(id);
        window.deleteSemester = (id) => this.deleteSemester(id);
        window.setAsActiveSemester = (id) => this.setAsActiveSemester(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSemestersTab() {
        const semesters = this.state.semesters.filter(s =>
            s.name.toLowerCase().includes((this.state.semesterSearch || '').toLowerCase()) ||
            s.academic_year.includes(this.state.semesterSearch || '')
        );

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-800">Academic Semesters</h2>
                <p class="text-sm text-gray-600 mt-1">Manage academic calendars and active periods</p>
              </div>
              <button onclick="openAddSemesterModal()" class="btn btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                Add Semester
              </button>
            </div>

            <div class="bg-white rounded-lg shadow border overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Semester</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Academic Year</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Duration</th>
                            <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${semesters.map(s => `
                            <tr class="${s.is_active ? 'bg-blue-50/30' : ''}">
                                <td class="px-6 py-4 font-bold text-gray-900">${s.name}</td>
                                <td class="px-6 py-4 text-sm text-gray-600">${s.academic_year}</td>
                                <td class="px-6 py-4 text-xs text-gray-500">${formatDate(s.start_date)} - ${formatDate(s.end_date)}</td>
                                <td class="px-6 py-4 text-center">
                                    ${s.is_active ?
                '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">ACTIVE</span>' :
                '<span class="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold">INACTIVE</span>'}
                                </td>
                                <td class="px-6 py-4 text-right text-sm">
                                    ${!s.is_active ? `<button onclick="setAsActiveSemester('${s.id}')" class="text-blue-600 mr-3">Set Active</button>` : ''}
                                    <button onclick="openEditSemesterModal('${s.id}')" class="text-gray-500 mr-3">Edit</button>
                                    <button onclick="deleteSemester('${s.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    handleSemesterSearch(q) {
        this.state.semesterSearch = q;
        this.render();
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
                            name: document.getElementById('sem-name').value,
                            academic_year: document.getElementById('sem-ay').value,
                            start_date: document.getElementById('sem-start').value,
                            end_date: document.getElementById('sem-end').value,
                            is_active: document.getElementById('sem-active').checked
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

    async setAsActiveSemester(id) {
        try {
            await api.post(`${endpoints.manageSemesters}${id}/set-active/`);
            Toast.success('Active semester updated');
            await this.ctx.loadSemesters();
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    getSemesterForm(sem = null) {
        return `
            <form id="sem-form" class="space-y-4">
                <div><label class="block text-sm">Semester Name</label><input type="text" id="sem-name" value="${sem?.name || ''}" class="form-input" placeholder="e.g. 1st Semester"></div>
                <div><label class="block text-sm">Academic Year</label><input type="text" id="sem-ay" value="${sem?.academic_year || ''}" class="form-input" placeholder="e.g. 2023-2024"></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm">Start Date</label><input type="date" id="sem-start" value="${sem?.start_date || ''}" class="form-input"></div>
                    <div><label class="block text-sm">End Date</label><input type="date" id="sem-end" value="${sem?.end_date || ''}" class="form-input"></div>
                </div>
                <label class="flex items-center gap-2"><input type="checkbox" id="sem-active" ${sem?.is_active ? 'checked' : ''}> Set as Active</label>
            </form>
        `;
    }
};
