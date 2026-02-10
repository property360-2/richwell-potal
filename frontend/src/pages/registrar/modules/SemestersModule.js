import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal, AlertModal } from '../../../components/Modal.js';
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
        window.updateAcademicYearDisplay = () => this.updateAcademicYearDisplay();
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
        const terms = [
            { value: '1st Semester', label: '1st Semester' },
            { value: '2nd Semester', label: '2nd Semester' },
            { value: 'Summer Class', label: 'Summer Class' }
        ];

        return `
            <form id="sem-form" class="space-y-6 p-2">
                ${UI.field({ label: 'Term/Semester', id: 'f-term', type: 'select', options: terms, value: s?.name || terms[0].value, required: true })}
                
                <div class="bg-blue-50/30 border border-blue-100/50 p-4 rounded-xl">
                    <div class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Auto-Generated Scope</div>
                    <div id="ay-display" class="text-lg font-black text-blue-600">
                        ${s?.academic_year || 'Select a start date...'}
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'Start Date', id: 'f-start', type: 'date', value: s?.start_date || '', required: true, attrs: 'onchange="updateAcademicYearDisplay()"' })}
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

    updateAcademicYearDisplay() {
        const startInput = document.getElementById('f-start');
        const display = document.getElementById('ay-display');
        if (!startInput || !display) return;

        const ay = this.calculateAcademicYear(startInput.value);
        display.innerText = ay || 'Select a start date...';
    },

    calculateAcademicYear(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return null;

        const month = date.getMonth() + 1; // 1-12
        const year = date.getFullYear();

        // July-Dec starts current year, Jan-June starts previous year
        const startYear = month >= 7 ? year : year - 1;
        return `${startYear}-${startYear + 1}`;
    },

    async handleSubmit(modal, id = null) {
        const term = document.getElementById('f-term').value;
        const startDate = document.getElementById('f-start').value;
        const academicYear = this.calculateAcademicYear(startDate);

        if (!academicYear) return Toast.error('Please select a valid start date');

        const data = {
            name: term,
            academic_year: academicYear,
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
            end_date: [Validator.required, (v) => new Date(v) > new Date(data.start_date) ? null : "End date must be after start date"],
            enrollment_end_date: [
                (v) => !v || !data.enrollment_start_date || new Date(v) > new Date(data.enrollment_start_date) ? null : "Enrollment end must be after start",
                (v) => !v || !data.end_date || new Date(v) <= new Date(data.end_date) ? null : "Enrollment must end before or on semester end"
            ],
            enrollment_start_date: [
                (v) => !v || !data.end_date || new Date(v) < new Date(data.end_date) ? null : "Enrollment start must be before semester end"
            ]
        });

        if (!isValid) return Toast.error(errors[Object.keys(errors)[0]]);

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
        const target = this.ctx.state.semesters.find(s => s.id === id);
        const currentActive = this.ctx.state.semesters.find(s => s.is_current);

        // Strict Policy: Block activation if another semester is ongoing
        if (currentActive && currentActive.id !== id &&
            !['GRADING_CLOSED', 'ARCHIVED'].includes(currentActive.status)) {

            await AlertModal(
                `Cannot activate <b>${target.name}</b> while <b>${currentActive.name}</b> is still ongoing.<br><br>` +
                `Please close or archive the current semester first before switching sessions.`,
                'Switch Blocked'
            );
            return;
        }

        const confirmed = await ConfirmModal({
            title: 'Set Active Semester',
            message: `Are you sure you want to make ${target.name} ${target.academic_year} the active semester?`,
            icon: '<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
            confirmLabel: 'Activate'
        });

        if (confirmed) {
            try {
                await api.post(endpoints.activateTerm(id));
                Toast.success('Now active');
                await this.ctx.loadSemesters();
                this.render();
            } catch (e) { ErrorHandler.handle(e, 'activating semester'); }
        }
    }
};
