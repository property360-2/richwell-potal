import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';
import { formatDate } from '../../../utils.js';

/**
 * Semesters Module for Registrar Academic Page
 * Refactored using Atomic UI Components & Validation Utility
 */
export const SemestersModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.handleSemesterSearch = (q) => this.handleSemesterSearch(q);
        window.openAddSemesterModal = () => this.openAddSemesterModal();
        window.openEditSemesterModal = (id) => this.openEditSemesterModal(id);
        window.deleteSemester = (id) => this.deleteSemester(id);
        window.setAsActiveSemester = (id) => this.setAsActiveSemester(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSemestersTab() {
        const filtered = this.state.semesters.filter(s =>
            s.name.toLowerCase().includes((this.state.semesterSearch || '').toLowerCase()) ||
            s.academic_year.includes(this.state.semesterSearch || '')
        );

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Academic Calendar</h2>
                    <p class="text-sm text-gray-500 font-medium">Configure active semesters and enrollment periods</p>
                </div>
                ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Create Semester',
            onClick: 'openAddSemesterModal()'
        })}
            </div>

            ${UI.table({
            headers: ['Semester Name', 'Academic Year', 'Schedule', 'Enrollment Period', 'Status', 'Actions'],
            rows: filtered.map(s => [
                `<div class="font-black text-gray-900">${s.name}</div>`,
                `<div class="font-bold text-gray-600">${s.academic_year}</div>`,
                `<div class="text-xs text-gray-400 font-medium">${formatDate(s.start_date)} &mdash; ${formatDate(s.end_date)}</div>`,
                `<div class="text-xs text-gray-500 font-medium">${s.enrollment_start_date && s.enrollment_end_date ? `${formatDate(s.enrollment_start_date)} &mdash; ${formatDate(s.enrollment_end_date)}` : '<span class="text-gray-400">Not set</span>'}</div>`,
                this.getStatusBadge(s),
                `<div class="flex gap-2 justify-end">
                        ${!s.is_current ? UI.button({ label: 'Activate', type: 'secondary', size: 'sm', onClick: `setAsActiveSemester('${s.id}')` }) : ''}
                        ${UI.button({ label: 'Edit', type: 'ghost', size: 'sm', onClick: `openEditSemesterModal('${s.id}')` })}
                    </div>`
            ])
        })}
        `;
    },

    handleSemesterSearch(q) {
        this.state.semesterSearch = q;
        this.render();
    },

    getStatusBadge(semester) {
        const statusMap = {
            'SETUP': { label: 'Setup', type: 'default' },
            'ENROLLMENT_OPEN': { label: 'Enrollment Open', type: 'success' },
            'ENROLLMENT_CLOSED': { label: 'Enrollment Closed', type: 'warning' },
            'GRADING_OPEN': { label: 'Grading Open', type: 'info' },
            'GRADING_CLOSED': { label: 'Grading Closed', type: 'default' },
            'ARCHIVED': { label: 'Archived', type: 'default' }
        };

        const status = statusMap[semester.status] || { label: semester.status, type: 'default' };
        const currentBadge = semester.is_current ? UI.badge('Active', 'info') + ' ' : '';
        return currentBadge + UI.badge(status.label, status.type);
    },

    openAddSemesterModal() {
        const modal = new Modal({
            title: 'Initialize New Semester',
            content: this.getSemesterForm(),
            size: 'md',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                { label: 'Create Semester', primary: true, onClick: async (m) => await this.handleSubmit(m) }
            ]
        });
        modal.show();
    },

    async openEditSemesterModal(id) {
        try {
            const sem = this.state.semesters.find(s => s.id === id);
            const modal = new Modal({
                title: 'Edit Academic Period',
                content: this.getSemesterForm(sem),
                size: 'md',
                actions: [
                    { label: 'Cancel', onClick: (m) => m.close() },
                    { label: 'Update Period', primary: true, onClick: async (m) => await this.handleSubmit(m, id) }
                ]
            });
            modal.show();
        } catch (e) { ErrorHandler.handle(e); }
    },

    getSemesterForm(s = null) {
        return `
            <form id="sem-form" class="space-y-6 p-2">
                ${UI.field({ label: 'Semester Name', id: 'f-name', value: s?.name || '', placeholder: 'e.g. 1st Semester 2024', required: true })}
                ${UI.field({ label: 'Academic Year', id: 'f-ay', value: s?.academic_year || '', placeholder: 'e.g. 2023-2024', required: true })}
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'Start Date', id: 'f-start', type: 'date', value: s?.start_date || '', required: true })}
                    ${UI.field({ label: 'End Date', id: 'f-end', type: 'date', value: s?.end_date || '', required: true })}
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">Enrollment Period</label>
                    <div class="grid grid-cols-2 gap-6">
                        ${UI.field({ label: 'Enrollment Start', id: 'f-enroll-start', type: 'date', value: s?.enrollment_start_date || '' })}
                        ${UI.field({ label: 'Enrollment End', id: 'f-enroll-end', type: 'date', value: s?.enrollment_end_date || '' })}
                    </div>
                </div>
                <div class="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <input type="checkbox" id="f-active" ${s?.is_current ? 'checked' : ''} class="w-5 h-5 rounded-md border-gray-300 text-blue-600">
                    <div>
                        <div class="font-bold text-gray-800 text-sm">Set as Active Session</div>
                        <div class="text-[10px] text-gray-400 font-black uppercase tracking-widest">This will be the current semester for enrollment</div>
                    </div>
                </div>
            </form>
        `;
    },

    async handleSubmit(modal, id = null) {
        const data = {
            name: document.getElementById('f-name').value,
            academic_year: document.getElementById('f-ay').value,
            start_date: document.getElementById('f-start').value,
            end_date: document.getElementById('f-end').value,
            enrollment_start_date: document.getElementById('f-enroll-start').value || null,
            enrollment_end_date: document.getElementById('f-enroll-end').value || null,
            is_current: document.getElementById('f-active').checked
        };

        const { isValid, errors } = Validator.validate(data, {
            name: [Validator.required],
            academic_year: [Validator.required],
            start_date: [Validator.required],
            end_date: [Validator.required]
        });

        if (!isValid) return Toast.error(Object.values(errors)[0]);

        try {
            if (id) await api.patch(`${endpoints.semesters}${id}/`, data);
            else await api.post(endpoints.semesters, data);

            Toast.success(id ? 'Calendar updated' : 'Semester added');
            modal.close();
            await this.ctx.loadSemesters();
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    async setAsActiveSemester(id) {
        ConfirmModal({
            title: 'Switch Active Session',
            message: 'Are you sure you want to make this the active semester? This will update the default term for all users.',
            onConfirm: async () => {
                try {
                    await api.post(endpoints.activateTerm(id));
                    Toast.success('Now active');
                    await this.ctx.loadSemesters();
                    this.render();
                } catch (e) { ErrorHandler.handle(e); }
            }
        });
    }
};
