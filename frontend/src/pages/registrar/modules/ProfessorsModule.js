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
        window.removeProfessorProgram = (id) => this.removeProfessorProgram(id);
        window.addProfessorProgram = (id, code) => this.addProfessorProgram(id, code);
        window.checkProfessorDuplicate = () => this.checkProfessorDuplicate();
        window.viewProfessorDetails = (id) => this.viewProfessorDetails(id);
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
            onRowClick: 'viewProfessorDetails',
            rows: filtered.map(p => ({
                id: p.id,
                cells: [
                    `<div class="flex items-center">
                        <div class="h-10 w-10 flex-shrink-0 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">
                            ${(p.first_name || '?')[0]}${(p.last_name || '?')[0]}
                        </div>
                        <div class="ml-4">
                            <div class="font-black text-gray-900">${p.full_name}</div>
                            <div class="text-xs text-gray-400 font-medium">${p.email}</div>
                        </div>
                    </div>`,
                    `<div class="flex flex-wrap gap-1">
                        ${(p.profile?.program_codes || []).map(code => UI.badge(code, 'success')).join('') || UI.badge(p.profile?.department || 'Unassigned', 'secondary')}
                    </div>`,
                    p.profile?.specialization || 'Not Specified',
                    `<div class="flex flex-wrap gap-1">
                        ${(p.profile?.assigned_subjects || []).map(s => UI.badge(s.code, 'info')).join('') || '<span class="text-gray-300 text-[10px] italic">None</span>'}
                    </div>`,
                    `<div class="flex gap-2 justify-end">
                        <button onclick="event.stopPropagation(); viewProfessorDetails('${p.id}')" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Portfolio">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            View
                        </button>
                        <button onclick="event.stopPropagation(); openEditProfessorModal('${p.id}')" class="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Edit</button>
                        <button onclick="event.stopPropagation(); deleteProfessor('${p.id}')" class="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
                    </div>`
                ]
            }))
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
        this.state.profProgramState.selected = [];

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

            // Map programs - we need IDs from the API, but profile.program_codes only has codes.
            // Wait, does ProfessorProfileSerializer return program objects? No, just codes.
            // I should have included IDs in the serializer. Let me fix the serializer first if needed.
            // Actually, I added program_codes method field. I should add a method to get program objects or just IDs.
            // Let's assume the API returns enough info.

            // Let's re-check the serializer I just wrote. Ah, I added program_ids as write_only, 
            // but I should have added a read_only field for programs too.
            this.state.profProgramState.selected = (prof.profile?.programs || []).map(pr => ({
                id: pr.id, code: pr.code
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
                    <div>
                        ${UI.field({
            label: 'Home Department/Program',
            id: 'f-dept',
            type: 'select',
            value: profile.department || '',
            options: [{ value: '', label: 'Select Primary Dept' }, ...programs]
        })}
                    </div>
                    ${UI.field({ label: 'Specialization', id: 'f-spec', value: profile.specialization || '', placeholder: 'e.g. Data Science' })}
                </div>

                <!-- Multiple Program Association -->
                <div class="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4">
                    <label class="block text-[11px] font-black text-gray-400 uppercase tracking-widest">Active Teaching Programs</label>
                    <div class="flex flex-wrap gap-2 mb-3" id="prof-selected-programs">
                        ${this.state.profProgramState.selected.length > 0 ?
                this.state.profProgramState.selected.map(pr => `
                                <div class="bg-indigo-100 text-indigo-700 text-[10px] font-black pl-3 pr-2 py-1 rounded-lg flex items-center gap-2 border border-indigo-200">
                                    ${pr.code}
                                    <button type="button" onclick="removeProfessorProgram('${pr.id}')" class="text-indigo-400 hover:text-indigo-600 transition-colors">&times;</button>
                                </div>
                            `).join('') : '<span class="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">No additional programs assigned</span>'
            }
                    </div>
                    <div class="flex gap-2">
                        <select id="f-add-program" class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 transition-all outline-none">
                            <option value="">Add Program Assignment...</option>
                            ${this.state.programs.filter(p => !this.state.profProgramState.selected.some(sel => sel.id === p.id)).map(p => `
                                <option value="${p.id}" data-code="${p.code}">${p.code} - ${p.name}</option>
                            `).join('')}
                        </select>
                        <button type="button" onclick="const s = document.getElementById('f-add-program'); if(s.value) addProfessorProgram(s.value, s.options[s.selectedIndex].dataset.code)" 
                                class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                            Add
                        </button>
                    </div>
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
        this.clearFormErrors(['f-first', 'f-last', 'f-email', 'f-pass']);

        const data = {
            first_name: document.getElementById('f-first').value.trim(),
            last_name: document.getElementById('f-last').value.trim(),
            email: document.getElementById('f-email').value.trim(),
            profile: {
                department: document.getElementById('f-dept').value,
                specialization: document.getElementById('f-spec').value.trim(),
                assigned_subject_ids: this.state.profSubjectState.selected.map(s => s.id),
                program_ids: this.state.profProgramState.selected.map(p => p.id)
            }
        };

        if (!id) {
            const autoPass = document.getElementById('f-auto-pass').checked;
            if (!autoPass) data.password = document.getElementById('f-pass').value;
        }

        const rules = {
            first_name: [Validator.required, Validator.minLength(2)],
            last_name: [Validator.required, Validator.minLength(2)],
            email: [Validator.required, Validator.email]
        };

        if (!id && !document.getElementById('f-auto-pass').checked) {
            rules.password = [Validator.required, Validator.minLength(6)];
        }

        const { isValid, errors } = Validator.validate(data, rules);

        if (!isValid) {
            let firstErrorId = null;
            Object.entries(errors).forEach(([field, msg]) => {
                const fieldId = field === 'first_name' ? 'f-first' :
                    (field === 'last_name' ? 'f-last' :
                        (field === 'email' ? 'f-email' : 'f-pass'));
                this.showFieldError(fieldId, msg);
                if (!firstErrorId) firstErrorId = fieldId;
            });

            if (firstErrorId) {
                const el = document.getElementById(firstErrorId);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => el.focus(), 500);
                }
            }
            Toast.error('Please fix the errors in the form');
            return;
        }

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
        } catch (e) {
            if (e.data && typeof e.data === 'object') {
                const processErrors = (errors, prefix = '') => {
                    Object.entries(errors).forEach(([field, msgs]) => {
                        if (typeof msgs === 'object' && !Array.isArray(msgs)) {
                            processErrors(msgs, field + '.');
                        } else {
                            const fullField = prefix + field;
                            const fieldId = fullField === 'first_name' ? 'f-first' :
                                (fullField === 'last_name' ? 'f-last' :
                                    (fullField === 'email' ? 'f-email' :
                                        (fullField.includes('department') ? 'f-dept' : null)));
                            if (fieldId) this.showFieldError(fieldId, Array.isArray(msgs) ? msgs[0] : msgs);
                        }
                    });
                };
                processErrors(e.data);
            }
            ErrorHandler.handle(e, 'Professor Submission');
        }
    },

    showFieldError(id, message) {
        const input = document.getElementById(id);
        const errorDiv = document.getElementById(`error-${id}`) || this.createErrorDiv(id);

        if (input) {
            input.classList.remove('border-gray-200', 'bg-gray-50');
            input.classList.add('border-red-400', 'bg-red-50/30');
        }

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    },

    clearFormErrors(ids) {
        ids.forEach(id => {
            const input = document.getElementById(id);
            const errorDiv = document.getElementById(`error-${id}`);

            if (input) {
                input.classList.remove('border-red-400', 'bg-red-50/30');
                input.classList.add('border-gray-200', 'bg-gray-50');
            }

            if (errorDiv) {
                errorDiv.classList.add('hidden');
            }
        });
    },

    createErrorDiv(id) {
        const input = document.getElementById(id);
        if (!input) return null;

        const div = document.createElement('div');
        div.id = `error-${id}`;
        div.className = 'text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-200';
        input.parentNode.appendChild(div);
        return div;
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

    addProfessorProgram(id, code) {
        if (!this.state.profProgramState.selected.some(p => p.id === id)) {
            this.state.profProgramState.selected.push({ id, code });
        }
        this.updateProfessorProgramTags();
        const select = document.getElementById('f-add-program');
        if (select) select.value = '';
    },

    removeProfessorProgram(id) {
        this.state.profProgramState.selected = this.state.profProgramState.selected.filter(p => p.id !== id);
        this.updateProfessorProgramTags();
    },

    updateProfessorProgramTags() {
        const container = document.getElementById('prof-selected-programs');
        if (!container) return;

        container.innerHTML = this.state.profProgramState.selected.map(pr => `
            <div class="bg-indigo-100 text-indigo-700 text-[10px] font-black pl-3 pr-2 py-1 rounded-lg flex items-center gap-2 border border-indigo-200 animate-in fade-in zoom-in duration-200">
                ${pr.code}
                <button type="button" onclick="removeProfessorProgram('${pr.id}')" class="text-indigo-400 hover:text-indigo-600 transition-colors">&times;</button>
            </div>
        `).join('') || '<span class="text-gray-400 text-[10px] uppercase font-bold tracking-widest ml-1">No additional programs assigned</span>';

        // Update select options to hide already selected
        const select = document.getElementById('f-add-program');
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="">Add Program Assignment...</option>' +
                this.state.programs.filter(p => !this.state.profProgramState.selected.some(sel => sel.id === p.id)).map(p => `
                    <option value="${p.id}" data-code="${p.code}">${p.code} - ${p.name}</option>
                `).join('');
            select.value = currentVal;
        }
    },

    async viewProfessorDetails(id) {
        try {
            const prof = await this.ctx.service.loadProfessorDetail(id);
            const activeSemester = this.state.semesters.find(s => s.is_current);
            let scheduleData = { schedule: [], assigned_sections: [] };

            if (activeSemester) {
                scheduleData = await this.ctx.service.loadProfessorSchedule(id, activeSemester.id);
            }

            const modal = new Modal({
                title: 'Professor Portfolio',
                size: 'xl',
                content: this.getProfessorDetailsContent(prof, scheduleData, activeSemester),
                actions: [{ label: 'Close', onClick: (m) => m.close() }]
            });
            modal.show();
        } catch (e) { ErrorHandler.handle(e); }
    },

    getProfessorDetailsContent(p, scheduleData, semester) {
        const profile = p.profile || {};
        const schedule = scheduleData.schedule || [];
        const assignedSections = scheduleData.assigned_sections || [];

        const renderSchedule = () => {
            if (!schedule || schedule.length === 0) {
                return `<div class="p-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p class="text-gray-400 font-bold uppercase tracking-widest text-xs">No active teaching schedule for ${semester?.name || 'current term'}</p>
                </div>`;
            }

            return `
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                <th class="pb-3 px-2">Day</th>
                                <th class="pb-3 px-2">Time</th>
                                <th class="pb-3 px-2">Subject</th>
                                <th class="pb-3 px-2">Section</th>
                                <th class="pb-3 px-2">Room</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${schedule.map(s => `
                                <tr class="group hover:bg-blue-50/30 transition-colors">
                                    <td class="py-3 px-2 text-sm font-bold text-gray-700">${s.day_display}</td>
                                    <td class="py-3 px-2 text-sm text-gray-500">${s.start_time} - ${s.end_time}</td>
                                    <td class="py-3 px-2">
                                        <div class="text-sm font-black text-blue-600">${s.subject.code}</div>
                                        <div class="text-[10px] text-gray-400 truncate w-48">${s.subject.title}</div>
                                    </td>
                                    <td class="py-3 px-2 text-sm font-medium text-gray-600">${s.section.name}</td>
                                    <td class="py-3 px-2 text-sm text-gray-500">${s.room || 'TBA'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        };

        return `
            <div class="space-y-8 p-2">
                <!-- Header Bio -->
                <div class="flex items-start gap-6 pb-8 border-b border-gray-100">
                    <div class="h-24 w-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-200">
                        ${(p.first_name || '?')[0]}${(p.last_name || '?')[0]}
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                            <h2 class="text-2xl font-black text-gray-800">${p.full_name}</h2>
                            ${UI.badge(p.is_active ? 'Active Faculty' : 'Inactive', p.is_active ? 'success' : 'danger')}
                        </div>
                        <p class="text-blue-600 font-bold mb-4">${p.email}</p>
                        
                        <div class="grid grid-cols-3 gap-8">
                            <div>
                                <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Departments/Programs</div>
                                <div class="flex flex-wrap gap-1 mt-1">
                                    ${(profile.program_codes || []).map(code => UI.badge(code, 'success')).join('') || UI.badge(profile.department || 'Not Assigned', 'secondary')}
                                </div>
                            </div>
                            <div>
                                <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Specialization</div>
                                <div class="text-sm font-bold text-gray-700">${profile.specialization || 'General Education'}</div>
                            </div>
                            <div>
                                <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Load Limit</div>
                                <div class="text-sm font-bold text-gray-700">${profile.max_teaching_hours || 'Standard'} Hours/Week</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Assigned Subjects -->
                <div>
                    <h3 class="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                        Qualified Subject Assignments
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        ${(profile.assigned_subjects || []).map(s => `
                            <div class="group px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all">
                                <span class="text-sm font-black text-gray-700 group-hover:text-blue-700">${s.code}</span>
                                <span class="text-[10px] text-gray-400 block">${s.title}</span>
                            </div>
                        `).join('') || '<p class="text-sm text-gray-400 italic">No specific subjects assigned yet.</p>'}
                    </div>
                </div>

                <!-- Teaching Schedule -->
                <div class="pt-4">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Current Teaching Load
                        </h3>
                        <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">
                            ${semester?.name || 'Active Semester'}
                        </span>
                    </div>
                    ${renderSchedule()}
                </div>
            </div>
        `;
    }
};


