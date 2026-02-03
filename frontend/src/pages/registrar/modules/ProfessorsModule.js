import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

export const ProfessorsModule = {
    init(ctx) {
        this.ctx = ctx;
        const { state, render } = ctx;

        window.handleProfessorSearch = (query) => this.handleProfessorSearch(query);
        window.openAddProfessorModal = () => this.openAddProfessorModal();
        window.openEditProfessorModal = (id) => this.openEditProfessorModal(id);
        window.deleteProfessor = (id) => this.deleteProfessor(id);
        window.toggleProfPassword = (checked) => this.toggleProfPassword(checked);
        window.removeProfessorSubject = (id) => this.removeProfessorSubject(id);
        window.addProfessorSubject = (id, code, title) => this.addProfessorSubject(id, code, title);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderProfessorsTab() {
        const filteredProfessors = this.state.professors.filter(p => {
            if (!this.state.professorSearch) return true;
            const q = this.state.professorSearch.toLowerCase();
            return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
        });

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-800">Professor Management</h2>
                <p class="text-sm text-gray-600 mt-1">Manage academic faculty and subject assignments</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="relative">
                    <input type="text" id="prof-search" placeholder="Search professors..." class="form-input text-sm pl-8 py-1.5 w-64"
                           value="${this.state.professorSearch || ''}" oninput="handleProfessorSearch(this.value)">
                    <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <button onclick="openAddProfessorModal()" class="btn btn-primary flex items-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                  Add Professor
                </button>
              </div>
            </div>

            <div class="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Professor</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Specialization</th>
                            <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned Subjects</th>
                            <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${filteredProfessors.length === 0 ? `
                            <tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No professors found.</td></tr>
                        ` : filteredProfessors.map(p => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4">
                                    <div class="flex items-center">
                                        <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                                            ${(p.first_name || '?')[0]}${(p.last_name || '?')[0]}
                                        </div>
                                        <div class="ml-4">
                                            <div class="text-sm font-bold text-gray-900">${p.full_name}</div>
                                            <div class="text-sm text-gray-500">${p.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${p.profile?.department || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${p.profile?.specialization || '-'}</td>
                                <td class="px-6 py-4">
                                    <div class="flex flex-wrap gap-1">
                                        ${(p.profile?.assigned_subjects || []).map(s => `<span class="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded border border-blue-100 font-medium">${s.code}</span>`).join('')}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onclick="openEditProfessorModal('${p.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                    <button onclick="deleteProfessor('${p.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    handleProfessorSearch(query) {
        this.ctx.state.professorSearch = query;
        this.render();
        const input = document.getElementById('prof-search');
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    },

    toggleProfPassword(checked) {
        const container = document.getElementById('prof-password-container');
        const input = document.getElementById('prof-password');
        if (checked) {
            container.classList.add('hidden');
            input.value = '';
        } else {
            container.classList.remove('hidden');
        }
    },

    openAddProfessorModal() {
        this.state.editingProfessor = null;
        this.state.profSubjectState.selected = [];

        const modal = new Modal({
            title: 'Add New Professor',
            content: this.getProfessorForm(),
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Professor',
                    primary: true,
                    onClick: async (m) => {
                        const form = document.getElementById('professor-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }

                        const autoPass = document.getElementById('prof-auto-password').checked;
                        const manualPass = document.getElementById('prof-password').value;

                        if (!autoPass && !manualPass) {
                            Toast.error('Please enter a password or enable auto-generation');
                            return;
                        }

                        const data = {
                            first_name: document.getElementById('prof-first-name').value,
                            last_name: document.getElementById('prof-last-name').value,
                            email: document.getElementById('prof-email').value,
                            profile: {
                                department: document.getElementById('prof-department').value,
                                specialization: document.getElementById('prof-specialization').value,
                                assigned_subject_ids: this.state.profSubjectState.selected.map(s => s.id)
                            }
                        };

                        if (!autoPass && manualPass) data.password = manualPass;

                        try {
                            const response = await api.post(endpoints.professors, data);
                            m.close();
                            if (response.temp_password) {
                                ConfirmModal({
                                    title: 'Professor Account Created',
                                    message: `Email: ${response.email}\nTemporary Password: ${response.temp_password}`,
                                    confirmLabel: 'Done',
                                    onConfirm: () => { }
                                });
                            }
                            await this.ctx.loadProfessors();
                            this.render();
                        } catch (error) { ErrorHandler.handle(error, 'Adding professor'); }
                    }
                }
            ]
        });
        modal.show();
        setTimeout(() => this.setupProfessorSubjectSearch(), 100);
    },

    async openEditProfessorModal(professorId) {
        try {
            const professor = await api.get(endpoints.professorDetail(professorId));
            this.state.editingProfessor = professor;
            this.state.profSubjectState.selected = (professor.profile?.assigned_subjects || []).map(s => ({
                id: s.id, code: s.code, title: s.title
            }));

            const modal = new Modal({
                title: 'Edit Professor',
                content: this.getProfessorForm(professor),
                actions: [
                    { label: 'Cancel', onClick: (m) => m.close() },
                    {
                        label: 'Save Changes',
                        primary: true,
                        onClick: async (m) => {
                            const form = document.getElementById('professor-form');
                            if (!form.checkValidity()) { form.reportValidity(); return; }

                            const data = {
                                first_name: document.getElementById('prof-first-name').value,
                                last_name: document.getElementById('prof-last-name').value,
                                profile: {
                                    department: document.getElementById('prof-department').value,
                                    specialization: document.getElementById('prof-specialization').value,
                                    assigned_subject_ids: this.state.profSubjectState.selected.map(s => s.id)
                                }
                            };

                            try {
                                await api.patch(endpoints.professorDetail(professorId), data);
                                Toast.success('Professor updated successfully');
                                m.close();
                                await this.ctx.loadProfessors();
                                this.render();
                            } catch (error) { ErrorHandler.handle(error, 'Updating professor'); }
                        }
                    }
                ]
            });
            modal.show();
            setTimeout(() => this.setupProfessorSubjectSearch(), 100);
        } catch (error) { ErrorHandler.handle(error, 'Loading professor details'); }
    },

    deleteProfessor(professorId) {
        ConfirmModal({
            title: 'Deactivate Professor',
            message: 'Are you sure you want to deactivate this professor? They will no longer be able to log in.',
            danger: true,
            onConfirm: async () => {
                try {
                    await api.patch(endpoints.professorDetail(professorId), { is_active: false });
                    Toast.success('Professor deactivated successfully');
                    await this.ctx.loadProfessors();
                    this.render();
                } catch (error) { ErrorHandler.handle(error, 'Deactivating professor'); }
            }
        });
    },

    getProfessorForm(professor = null) {
        const profile = professor?.profile || {};
        return `
            <form id="professor-form" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium">First Name *</label><input type="text" id="prof-first-name" value="${professor?.first_name || ''}" required class="form-input"></div>
                <div><label class="block text-sm font-medium">Last Name *</label><input type="text" id="prof-last-name" value="${professor?.last_name || ''}" required class="form-input"></div>
              </div>
              <div><label class="block text-sm font-medium">Email *</label><input type="email" id="prof-email" value="${professor?.email || ''}" required class="form-input" ${professor ? 'readonly' : ''}></div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium">Program</label>
                    <select id="prof-department" class="form-select">
                        <option value="">Select Program</option>
                        ${this.state.programs.map(p => `<option value="${p.code}" ${profile.department === p.code ? 'selected' : ''}>${p.code}</option>`).join('')}
                    </select>
                </div>
                <div><label class="block text-sm font-medium">Specialization</label><input type="text" id="prof-specialization" value="${profile.specialization || ''}" class="form-input"></div>
              </div>
              ${!professor ? `
                <div class="bg-blue-50 p-3 rounded">
                    <label class="flex items-center gap-2"><input type="checkbox" id="prof-auto-password" checked onchange="toggleProfPassword(this.checked)"> Auto-generate password</label>
                    <div id="prof-password-container" class="hidden mt-2"><input type="password" id="prof-password" class="form-input" placeholder="Custom password"></div>
                </div>` : ''}
              <div class="pt-4 border-t">
                <label class="block text-sm font-medium mb-1">Qualified Subjects</label>
                <input type="text" id="prof-subject-search" placeholder="Search subjects..." class="form-input text-sm">
                <div id="prof-subject-dropdown" class="hidden relative z-10 w-full bg-white border mt-1 max-h-48 overflow-y-auto shadow-lg"></div>
                <div id="prof-selected-subjects" class="flex flex-wrap gap-2 mt-2">
                    ${(profile.assigned_subjects || []).map(s => `
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">${s.code}<button type="button" onclick="removeProfessorSubject('${s.id}')">&times;</button></span>
                    `).join('')}
                </div>
              </div>
            </form>
        `;
    },

    setupProfessorSubjectSearch() {
        const input = document.getElementById('prof-subject-search');
        const dropdown = document.getElementById('prof-subject-dropdown');
        if (!input || !dropdown) return;

        input.oninput = debounce(async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) { dropdown.classList.add('hidden'); return; }
            try {
                const response = await api.get(`${endpoints.manageSubjects}?search=${encodeURIComponent(query)}`);
                const subjects = response?.results || response || [];
                const matches = subjects.filter(s => !this.state.profSubjectState.selected.some(sel => String(sel.id) === String(s.id))).slice(0, 10);
                dropdown.innerHTML = matches.map(s => `
                    <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onclick="addProfessorSubject('${s.id}', '${s.code}', '${s.title.replace(/'/g, "\\'")}')">
                        <b>${s.code}</b> - ${s.title}
                    </div>
                `).join('');
                dropdown.classList.toggle('hidden', matches.length === 0);
            } catch (e) { console.error(e); }
        }, 300);
    },

    addProfessorSubject(id, code, title) {
        if (!this.state.profSubjectState.selected.some(s => s.id === id)) {
            this.state.profSubjectState.selected.push({ id, code, title });
        }
        this.updateProfessorSubjectTags();
        document.getElementById('prof-subject-search').value = '';
        document.getElementById('prof-subject-dropdown').classList.add('hidden');
    },

    removeProfessorSubject(id) {
        this.state.profSubjectState.selected = this.state.profSubjectState.selected.filter(s => s.id !== id);
        this.updateProfessorSubjectTags();
    },

    updateProfessorSubjectTags() {
        const container = document.getElementById('prof-selected-subjects');
        if (!container) return;
        container.innerHTML = this.state.profSubjectState.selected.map(s => `
            <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">${s.code}<button type="button" onclick="removeProfessorSubject('${s.id}')">&times;</button></span>
        `).join('') || '<p class="text-gray-400 text-xs">No subjects assigned</p>';
    }
};
