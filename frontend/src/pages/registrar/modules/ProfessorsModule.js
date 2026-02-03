import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';
import { debounce } from '../../../utils.js';

/**
 * Professors Module for Registrar Academic Page
 * Refactored using Atomic UI Components & Validation Utility
 */
export const ProfessorsModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.handleProfessorSearch = (query) => this.handleProfessorSearch(query);
        window.openAddProfessorModal = () => this.openAddProfessorModal();
        window.openEditProfessorModal = (id) => this.openEditProfessorModal(id);
        window.deleteProfessor = (id) => this.deleteProfessor(id);
        window.toggleProfPassword = (checked) => this.toggleProfPassword(checked);
        window.removeProfessorSubject = (id) => this.removeProfessorSubject(id);
        window.addProfessorSubject = (id, code, title) => this.addProfessorSubject(id, code, title);
        window.checkProfessorDuplicate = () => this.checkProfessorDuplicate();
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderProfessorsTab() {
        const filtered = this.getFilteredProfessors();

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Faculty Management</h2>
                    <p class="text-sm text-gray-500 font-medium">Manage professor profiles and academic assignments</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="relative group">
                        <input type="text" id="prof-search" placeholder="Search professors..." 
                               class="w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                               value="${this.state.professorSearch || ''}" 
                               oninput="handleProfessorSearch(this.value)">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Professor',
            onClick: 'openAddProfessorModal()'
        })}
                </div>
            </div>

            ${UI.table({
            headers: ['Professor', 'Department', 'Specialization', 'Assigned Subjects', 'Actions'],
            rows: filtered.map(p => [
                `<div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">
                            ${(p.first_name || '?')[0]}${(p.last_name || '?')[0]}
                        </div>
                        <div class="ml-4">
                            <div class="font-black text-gray-900">${p.full_name}</div>
                            <div class="text-xs text-gray-400 font-medium">${p.email}</div>
                        </div>
                    </div>`,
                p.profile?.department || 'Unassigned',
                p.profile?.specialization || 'Not Specified',
                `<div class="flex flex-wrap gap-1">
                        ${(p.profile?.assigned_subjects || []).map(s => UI.badge(s.code, 'info')).join('') || '<span class="text-gray-300 text-[10px] italic">None</span>'}
                    </div>`,
                `<div class="flex gap-2 justify-end">
                        ${UI.button({ label: 'Edit', type: 'ghost', size: 'sm', onClick: `openEditProfessorModal('${p.id}')` })}
                        ${UI.button({ label: 'Delete', type: 'danger', size: 'sm', onClick: `deleteProfessor('${p.id}')` })}
                    </div>`
            ])
        })}
        `;
    },

    getFilteredProfessors() {
        return this.state.professors;
    },

    handleProfessorSearch(query) {
        if (!this.debouncedSearch) {
            this.debouncedSearch = debounce(async (q) => {
                this.ctx.state.professorSearch = q;
                await this.ctx.loadProfessors(q);
                this.render();
                const input = document.getElementById('prof-search');
                if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
            }, 500);
        }
        this.debouncedSearch(query);
    },

    toggleProfPassword(checked) {
        const container = document.getElementById('prof-password-container');
        if (container) container.classList.toggle('hidden', checked);
    },

    openAddProfessorModal() {
        this.state.editingProfessor = null;
        this.state.profSubjectState.selected = [];

        const modal = new Modal({
            title: 'Add New Professor',
            content: this.getProfessorForm(),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                { label: 'Create Professor', primary: true, onClick: async (m) => this.handleSubmit(m) }
            ]
        });
        modal.show();
        setTimeout(() => this.setupFormEvents(), 100);
    },

    async openEditProfessorModal(id) {
        try {
            const prof = await api.get(endpoints.professorDetail(id));
            this.state.editingProfessor = prof;
            this.state.profSubjectState.selected = (prof.profile?.assigned_subjects || []).map(s => ({
                id: s.id, code: s.code, title: s.title
            }));

            const modal = new Modal({
                title: 'Edit Professor Profile',
                content: this.getProfessorForm(prof),
                size: 'lg',
                actions: [
                    { label: 'Cancel', onClick: (m) => m.close() },
                    { label: 'Update Profile', primary: true, onClick: async (m) => this.handleSubmit(m, id) }
                ]
            });
            modal.show();
            setTimeout(() => this.setupFormEvents(), 100);
        } catch (e) { ErrorHandler.handle(e); }
    },

    getProfessorForm(p = null) {
        const profile = p?.profile || {};
        const programs = this.state.programs.map(pr => ({ value: pr.code, label: pr.code }));

        return `
            <form id="professor-form" class="space-y-6 p-2">
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'First Name', id: 'f-first', value: p?.first_name || '', required: true })}
                    ${UI.field({ label: 'Last Name', id: 'f-last', value: p?.last_name || '', required: true })}
                </div>
                <p id="name-dup-warning" class="hidden text-xs text-red-500 font-bold -mt-4 mb-2 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Warning: A professor with this name already exists.
                </p>
                <div>
                 <div>
                    ${UI.field({ label: 'Email Address', id: 'f-email', value: p?.email || '', type: 'email', required: true, placeholder: 'professor@school.edu' })}
                    <p id="dup-warning" class="hidden text-xs text-red-500 font-bold mt-1 flex items-center gap-1">
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        Warning: This email is already registered in the system.
                   </p>
                </div>
                
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({
            label: 'Target Program',
            id: 'f-dept',
            type: 'select',
            value: profile.department || '',
            options: [{ value: '', label: 'Select Program' }, ...programs]
        })}
                    ${UI.field({ label: 'Specialization', id: 'f-spec', value: profile.specialization || '', placeholder: 'e.g. Data Science' })}
                </div>

                ${!p ? `
                <div class="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 space-y-3">
                    <label class="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" id="f-auto-pass" checked onchange="toggleProfPassword(this.checked)" class="w-5 h-5 rounded-md border-gray-300 text-blue-600">
                        <div>
                            <div class="text-sm font-bold text-gray-800">Auto-generate password</div>
                            <div class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Recommended for security</div>
                        </div>
                    </label>
                    <div id="prof-password-container" class="hidden">
                        ${UI.field({ label: 'Manual Password', id: 'f-pass', type: 'password', placeholder: 'Enter custom password' })}
                    </div>
                </div>` : ''}

                <div class="pt-6 border-t border-gray-100">
                    <label class="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Qualified Academic Subjects</label>
                    <div class="relative group">
                        <input type="text" id="prof-subject-search" placeholder="Search to add subjects..." 
                               class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        <div id="prof-subject-dropdown" class="hidden absolute z-20 w-full bg-white border border-gray-100 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-xl ring-1 ring-black/5"></div>
                    </div>
                    <div id="prof-selected-subjects" class="flex flex-wrap gap-2 mt-4 min-h-[40px] items-center">
                        ${this.state.profSubjectState.selected.length > 0 ?
                this.state.profSubjectState.selected.map(s => `
                                <div class="bg-gray-100 text-gray-700 text-xs font-black pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 border border-gray-200">
                                    ${s.code}
                                    <button type="button" onclick="removeProfessorSubject('${s.id}')" class="text-gray-400 hover:text-red-500 transition-colors">&times;</button>
                                </div>
                            `).join('') : '<span class="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">No subjects assigned yet</span>'
            }
                    </div>
                </div>
            </form>
        `;
    },

    setupFormEvents() {
        // Subject Search
        const input = document.getElementById('prof-subject-search');
        if (input) {
            if (!this.debouncedSubjectSearch) {
                this.debouncedSubjectSearch = debounce(async (e) => {
                    await this.handleSubjectSearch(e);
                }, 300);
            }
            input.oninput = this.debouncedSubjectSearch;
        }

        // Subject Removal Delegation
        const subjectContainer = document.getElementById('prof-selected-subjects');
        if (subjectContainer) {
            subjectContainer.onclick = (e) => {
                const btn = e.target.closest('button[data-remove-id]');
                if (btn) {
                    this.removeProfessorSubject(btn.dataset.removeId);
                }
            };
        }

        // Duplicate Check Listeners
        if (!this.debouncedCheckDuplicate) {
            this.debouncedCheckDuplicate = debounce(async (e) => {
                await this.checkProfessorDuplicate();
            }, 500);
        }

        const duplicateHandler = this.debouncedCheckDuplicate;
        ['f-first', 'f-last', 'f-email'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = duplicateHandler;
        });
    },

    async handleSubjectSearch(e) {
        const query = e.target.value.trim();
        const dropdown = document.getElementById('prof-subject-dropdown');
        if (query.length < 2) { dropdown.classList.add('hidden'); return; }

        try {
            const response = await this.ctx.api.get(`${this.ctx.endpoints.manageSubjects}?search=${encodeURIComponent(query)}`);
            const results = response.results || response || [];
            const subjects = results.filter(s => !this.state.profSubjectState.selected.some(sel => sel.id === s.id)).slice(0, 8);

            dropdown.innerHTML = subjects.map(s => `
                <div class="px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 transition-colors">
                    <span class="font-black text-blue-600 mr-2">${s.code}</span>
                    <span class="text-gray-600">${s.title}</span>
                    <span class="hidden" data-id="${s.id}" data-code="${s.code}" data-title="${s.title.replace(/'/g, "\\'")}"></span> 
                </div>
            `).join('');

            dropdown.querySelectorAll('div').forEach(div => {
                div.onclick = () => {
                    const data = div.querySelector('span[data-id]');
                    this.addProfessorSubject(data.dataset.id, data.dataset.code, data.dataset.title);
                };
            });

            dropdown.classList.toggle('hidden', subjects.length === 0);
        } catch (e) { console.error(e); }
    },

    addProfessorSubject(id, code, title) {
        if (!this.state.profSubjectState.selected.some(s => s.id === id)) {
            this.state.profSubjectState.selected.push({ id, code, title });
        }
        this.updateProfessorSubjectTags();
        const input = document.getElementById('prof-subject-search');
        if (input) input.value = '';
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
            <div class="bg-gray-100 text-gray-700 text-xs font-black pl-3 pr-2 py-1.5 rounded-lg flex items-center gap-2 border border-gray-200 animate-in fade-in zoom-in duration-200">
                ${s.code}
                <button type="button" data-remove-id="${s.id}" class="text-gray-400 hover:text-red-500 transition-colors">&times;</button>
            </div>
        `).join('') || '<span class="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">No subjects assigned yet</span>';
    },

    async handleSubmit(modal, id = null) {
        const data = {
            first_name: document.getElementById('f-first').value,
            last_name: document.getElementById('f-last').value,
            email: document.getElementById('f-email').value,
            profile: {
                department: document.getElementById('f-dept').value,
                specialization: document.getElementById('f-spec').value,
                assigned_subject_ids: this.state.profSubjectState.selected.map(s => s.id)
            }
        };

        if (!id) {
            const autoPass = document.getElementById('f-auto-pass').checked;
            if (!autoPass) data.password = document.getElementById('f-pass').value;
        }

        const rules = {
            first_name: [Validator.required],
            last_name: [Validator.required],
            email: [Validator.required, Validator.email]
        };
        const { isValid, errors } = Validator.validate(data, rules);

        if (!isValid) return Toast.error(Object.values(errors)[0]);

        try {
            const response = id
                ? await api.patch(endpoints.professorDetail(id), data)
                : await api.post(endpoints.professors, data);

            modal.close();
            if (response.temp_password) {
                ConfirmModal({
                    title: 'Account Created',
                    message: `Professor account ready.\nCredentials:\nEmail: ${response.email}\nTemp Pass: ${response.temp_password}`,
                    confirmLabel: 'Copy & Close'
                });
            } else {
                Toast.success(id ? 'Profile updated' : 'Professor added');
            }
            await this.ctx.loadProfessors();
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    deleteProfessor(id) {
        ConfirmModal({
            title: 'Deactivate Faculty', message: 'This professor will lose access to the system. Proceed?', danger: true,
            onConfirm: async () => {
                try {
                    await api.patch(endpoints.professorDetail(id), { is_active: false });
                    Toast.success('Professor deactivated');
                    await this.ctx.loadProfessors();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    },

    async checkProfessorDuplicate() {
        const email = document.getElementById('f-email')?.value.trim() || '';
        const firstName = document.getElementById('f-first')?.value.trim() || '';
        const lastName = document.getElementById('f-last')?.value.trim() || '';

        console.log('Checking duplicates for:', { email, firstName, lastName });

        const emailWarning = document.getElementById('dup-warning');
        const nameWarning = document.getElementById('name-dup-warning');
        const btn = document.querySelector('.modal-footer .btn-primary');

        // Reset Warnings
        if (emailWarning) emailWarning.classList.add('hidden');
        if (nameWarning) nameWarning.classList.add('hidden');
        // Do not enable button yet, wait for checks. 
        // We only DISABLE if duplicates found. Enabling is default state if no duplicates.
        // However, if we enable here, we might race with previous checks? No, debounce handles that.
        if (btn) btn.disabled = false;

        let isDuplicate = false;

        // Check Email - ONLY if email is provided
        if (email && (!this.state.editingProfessor || this.state.editingProfessor.email !== email)) {
            const emailDuplicate = await this.ctx.service.checkProfessorEmailDuplicate(email);
            if (emailDuplicate) {
                if (emailWarning) emailWarning.classList.remove('hidden');
                isDuplicate = true;
                console.log('Email duplicate found');
            }
        }

        // Check Name - ONLY if both names provided
        if (firstName && lastName) {
            // Skip check if editing and name hasn't changed
            const isSameName = this.state.editingProfessor &&
                this.state.editingProfessor.first_name === firstName &&
                this.state.editingProfessor.last_name === lastName;

            if (!isSameName) {
                const nameDuplicate = await this.ctx.service.checkProfessorNameDuplicate(firstName, lastName);
                if (nameDuplicate) {
                    if (nameWarning) nameWarning.classList.remove('hidden');
                    isDuplicate = true;
                    console.log('Name duplicate found');
                }
            }
        }

        if (btn && isDuplicate) btn.disabled = true;
    },
};


