import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';

/**
 * Programs Module for Registrar Academic Page
 * Refactored using Atomic UI Components & Validation Utility
 */
export const ProgramsModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.handleProgramSearch = (query) => this.handleProgramSearch(query);
        window.handleProgramSort = (key) => this.handleProgramSort(key);
        window.viewProgramDetails = (id) => this.viewProgramDetails(id);
        window.openAddProgramModal = () => this.openAddProgramModal();
        window.openEditProgramModal = (id) => this.openEditProgramModal(id);
        window.deleteProgram = (id) => this.deleteProgram(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    // --- Rendering Logic ---

    renderProgramsTab() {
        const filtered = this.getFilteredPrograms();

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Degree Programs</h2>
                    <p class="text-sm text-gray-500 font-medium">Manage academic courses and curriculum structures</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="relative group">
                        <input type="text" id="prog-search" placeholder="Search programs..." 
                               class="w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                               value="${this.state.programSearchQuery || ''}" 
                               oninput="handleProgramSearch(this.value)">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Program',
            onClick: 'openAddProgramModal()'
        })}
                </div>
            </div>

            ${UI.table({
            headers: ['Program Name', 'Code', 'Department', 'Curricula', 'Actions'],
            rows: filtered.map(p => [
                `<div>
                        <div class="font-black text-gray-900">${p.name}</div>
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">${p.duration_years} Years Duration</div>
                    </div>`,
                `<span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs font-black border border-blue-100">${p.code}</span>`,
                p.department || 'General Academic',
                UI.badge(p.total_curricula || 0, p.total_curricula > 0 ? 'info' : 'default'),
                `<div class="flex gap-2 justify-end">
                        ${UI.button({ label: 'Details', type: 'secondary', size: 'sm', onClick: `viewProgramDetails('${p.id}')` })}
                        ${UI.button({ label: 'Edit', type: 'ghost', size: 'sm', onClick: `openEditProgramModal('${p.id}')` })}
                        ${UI.button({ label: 'Delete', type: 'danger', size: 'sm', onClick: `deleteProgram('${p.id}')` })}
                    </div>`
            ])
        })}
        `;
    },

    getFilteredPrograms() {
        let items = [...this.state.programs];
        if (this.state.programSearchQuery) {
            const q = this.state.programSearchQuery.toLowerCase();
            items = items.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        }
        return items;
    },

    // --- Actions ---

    handleProgramSearch(query) {
        this.state.programSearchQuery = query;
        this.render();
        // Keep focus on search input
        const el = document.getElementById('prog-search');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    },

    async viewProgramDetails(id) {
        const program = this.state.programs.find(p => p.id === id);
        if (!program) return;
        this.state.activeProgram = program;
        this.state.subView = 'program_details';
        await Promise.all([this.ctx.loadCurricula(id), this.ctx.loadSubjects(id)]);
        this.render();
    },

    openAddProgramModal() {
        const modal = new Modal({
            title: 'Create New Program',
            content: this.getProgramForm(),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Program', primary: true,
                    onClick: async (m) => await this.handleSubmit(m)
                }
            ]
        });
        modal.show();
    },

    async openEditProgramModal(id) {
        const p = this.state.programs.find(prog => prog.id === id);
        const modal = new Modal({
            title: 'Edit Program',
            content: this.getProgramForm(p),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Update Program', primary: true,
                    onClick: async (m) => await this.handleSubmit(m, id)
                }
            ]
        });
        modal.show();
    },

    getProgramForm(p = null) {
        return `
            <form id="prog-form" class="space-y-6 p-2">
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'Program Code', id: 'f-code', value: p?.code || '', placeholder: 'e.g. BSIT', required: true })}
                    ${UI.field({ label: 'Duration (Years)', id: 'f-duration', type: 'number', value: p?.duration_years || 4, required: true })}
                </div>
                ${UI.field({ label: 'Program Full Name', id: 'f-name', value: p?.name || '', placeholder: 'Bachelor of Science...', required: true })}
                ${UI.field({ label: 'Description', id: 'f-desc', type: 'textarea', value: p?.description || '' })}
                <div class="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <input type="checkbox" id="f-active" ${p ? (p.is_active ? 'checked' : '') : 'checked'} class="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500">
                    <div>
                        <div class="font-bold text-gray-800 text-sm">Active Status</div>
                        <div class="text-[10px] text-gray-400 uppercase font-black tracking-widest">Controls if students can enroll</div>
                    </div>
                </div>
            </form>
        `;
    },

    async handleSubmit(modal, id = null) {
        const data = {
            code: document.getElementById('f-code').value.toUpperCase(),
            name: document.getElementById('f-name').value,
            duration_years: parseInt(document.getElementById('f-duration').value),
            description: document.getElementById('f-desc').value,
            is_active: document.getElementById('f-active').checked
        };

        // Standard Validation
        const { isValid, errors } = Validator.validate(data, {
            code: [Validator.required, Validator.minLength(2)],
            name: [Validator.required, Validator.minLength(5)],
            duration_years: [Validator.required]
        });

        if (!isValid) {
            Toast.error(Object.values(errors)[0]);
            return;
        }

        try {
            if (id) await api.patch(`${endpoints.managePrograms}${id}/`, data);
            else await api.post(endpoints.managePrograms, data);

            Toast.success(id ? 'Program updated' : 'Program created');
            modal.close();
            await this.ctx.loadPrograms();
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    deleteProgram(id) {
        ConfirmModal({
            title: 'Delete Program', message: 'All associated data will be archived. Continue?', danger: true,
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.managePrograms}${id}/`);
                    Toast.success('Program deleted');
                    await this.ctx.loadPrograms();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    }
};
