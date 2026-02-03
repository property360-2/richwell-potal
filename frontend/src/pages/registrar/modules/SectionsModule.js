import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';
import { formatTime, getSubjectColor } from '../../../utils.js';

const DAYS = [
    { code: 'MON', name: 'Monday' },
    { code: 'TUE', name: 'Tuesday' },
    { code: 'WED', name: 'Wednesday' },
    { code: 'THU', name: 'Thursday' },
    { code: 'FRI', name: 'Friday' },
    { code: 'SAT', name: 'Saturday' },
    { code: 'SUN', name: 'Sunday' }
];

const TIME_SLOTS = [];
for (let hour = 7; hour <= 21; hour++) {
    TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:00`);
}

/**
 * Sections Module for Registrar Academic Page
 * Refactored using Atomic UI Components & Drag-Drop UI
 */
export const SectionsModule = {
    init(ctx) {
        this.ctx = ctx;
        // Register Global Handlers
        window.handleSectionSearch = (q) => this.handleSectionSearch(q);
        window.handleSectionFilterYear = (y) => this.handleSectionFilterYear(y);
        window.viewSection = (id) => this.viewSection(id);
        window.backToSections = () => this.backToSections();
        window.openAddSectionModal = () => this.openAddSectionModal();
        window.deleteSection = (id) => this.deleteSection(id);

        // Scheduling and Drag-Drop
        window.handleDragStart = (e, id, code, title) => this.handleDragStart(e, id, code, title);
        window.handleDragOver = (e) => this.handleDragOver(e);
        window.handleDragLeave = (e) => this.handleDragLeave(e);
        window.handleDropToSchedule = (e) => this.handleDropToSchedule(e);
        window.removeScheduleSlot = (id) => this.removeScheduleSlot(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSectionsTab() {
        if (this.state.subView === 'detail') return this.renderSectionDetail();

        const filtered = this.state.sections.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(this.state.sectionSearch.toLowerCase());
            const matchesYear = this.state.sectionFilterYear === 'all' || String(s.year_level) === this.state.sectionFilterYear;
            return matchesSearch && matchesYear;
        });

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Section Manager</h2>
                    <p class="text-sm text-gray-500 font-medium">Create and schedule class sections for ${this.state.activeSemester?.name || 'Current Term'}</p>
                </div>
                ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg> Add Section',
            onClick: 'openAddSectionModal()'
        })}
            </div>

            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1 relative group">
                    <input type="text" placeholder="Search sections..." 
                           class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                           value="${this.state.sectionSearch}" 
                           oninput="handleSectionSearch(this.value)">
                    <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <select onchange="handleSectionFilterYear(this.value)" class="w-40 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-600 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value="all">All Years</option>
                    <option value="1" ${this.state.sectionFilterYear === '1' ? 'selected' : ''}>Year 1</option>
                    <option value="2" ${this.state.sectionFilterYear === '2' ? 'selected' : ''}>Year 2</option>
                    <option value="3" ${this.state.sectionFilterYear === '3' ? 'selected' : ''}>Year 3</option>
                    <option value="4" ${this.state.sectionFilterYear === '4' ? 'selected' : ''}>Year 4</option>
                </select>
            </div>

            ${UI.table({
            headers: ['Section Name', 'Program', 'Year Level', 'Status', 'Actions'],
            rows: filtered.map(s => [
                `<div class="font-black text-gray-900">${s.name}</div>`,
                `<span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs font-black border border-blue-100">${s.program_code || s.program?.code}</span>`,
                `Year ${s.year_level}`,
                UI.badge('Active', 'success'),
                `<div class="flex gap-2 justify-end">
                        ${UI.button({ label: 'Schedule', type: 'secondary', size: 'sm', onClick: `viewSection('${s.id}')` })}
                        ${UI.button({ label: 'Delete', type: 'danger', size: 'sm', onClick: `deleteSection('${s.id}')` })}
                    </div>`
            ])
        })}
        `;
    },

    renderSectionDetail() {
        const s = this.state.selectedSection;
        if (!s) return '';

        return `
            <div class="mb-6">
                ${UI.button({ label: '&larr; Back to Sections', type: 'ghost', size: 'sm', onClick: 'backToSections()' })}
            </div>
            
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 flex justify-between items-end">
                <div>
                    <h2 class="text-3xl font-black text-gray-900">${s.name}</h2>
                    <p class="text-sm text-gray-500 font-medium mt-1">${s.program_code} &bull; Year ${s.year_level} &bull; ${this.state.activeSemester?.name}</p>
                </div>
                <div class="flex gap-4">
                    <div class="text-right">
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned Units</div>
                        <div class="text-xl font-black text-blue-600">${this.calculateTotalUnits()} Units</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Masterlist Sidebar -->
                <div class="lg:col-span-3 space-y-6">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Inventory</h3>
                        <div class="space-y-3">
                            ${this.state.detailedSubjects.map(subj => {
            const isSlotted = this.state.sectionSchedule.some(slot => slot.subject_id === subj.subject_id);
            return `
                                    <div class="p-4 border rounded-2xl transition-all ${isSlotted ? 'bg-gray-50 border-gray-100 opacity-40 grayscale' : 'cursor-grab bg-white border-gray-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95'}"
                                         ${isSlotted ? '' : `draggable="true" ondragstart="handleDragStart(event, '${subj.subject_id}', '${subj.code}', '${subj.title}')"`}>
                                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">${subj.code}</div>
                                        <div class="text-sm font-bold text-gray-800 leading-tight">${subj.title}</div>
                                        <div class="text-[10px] text-gray-400 mt-2 font-bold">${subj.units} Units</div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                </div>

                <!-- Schedule Grid -->
                <div class="lg:col-span-9 bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-50/50">
                                    <th class="w-24 p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Time</th>
                                    ${DAYS.map(d => `<th class="p-4 text-[11px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-100 border-l border-gray-50">${d.name}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${TIME_SLOTS.map(t => `
                                    <tr class="h-16 group">
                                        <td class="p-0 text-[10px] font-black text-gray-400 text-center bg-gray-50/50 border-b border-gray-100">${formatTime(t)}</td>
                                        ${DAYS.map(d => this.renderScheduleCell(d.code, t)).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderScheduleCell(day, time) {
        const slot = this.state.sectionSchedule.find(s => s.day === day && s.start_time.startsWith(time));
        if (slot) {
            const start = parseInt(slot.start_time.split(':')[0]);
            const end = parseInt(slot.end_time.split(':')[0]);
            const rowSpan = end - start;
            if (time !== slot.start_time.substring(0, 5)) return '';

            return `
                <td class="p-1 border-b border-gray-100 border-l border-gray-50" rowspan="${rowSpan}">
                    <div class="w-full h-full rounded-2xl p-3 text-[10px] flex flex-col justify-between shadow-sm border animate-in fade-in zoom-in duration-300 ${getSubjectColor(slot.subject_code)}">
                        <div>
                            <div class="font-black text-blue-900">${slot.subject_code}</div>
                            <div class="font-bold text-blue-700 leading-tight mt-0.5">${slot.subject_title}</div>
                        </div>
                        <div class="flex justify-between items-center mt-2">
                             <span class="font-bold text-blue-800/50">${formatTime(slot.start_time)}-${formatTime(slot.end_time)}</span>
                             <button onclick="removeScheduleSlot('${slot.id}')" class="w-6 h-6 rounded-lg bg-white/50 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold">&times;</button>
                        </div>
                    </div>
                </td>
            `;
        }

        // Overlap check
        const overlapped = this.state.sectionSchedule.find(s => {
            if (s.day !== day) return false;
            const sStart = parseInt(s.start_time.split(':')[0]);
            const sEnd = parseInt(s.end_time.split(':')[0]);
            const tH = parseInt(time.split(':')[0]);
            return tH > sStart && tH < sEnd;
        });
        if (overlapped) return '';

        return `<td class="p-0 border-b border-gray-100 border-l border-gray-50 hover:bg-blue-50/50 transition-colors" 
                    data-day="${day}" data-time="${time}"
                    ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSchedule(event)">
                </td>`;
    },

    calculateTotalUnits() {
        // Only count unique subjects in the schedule
        const activeIds = [...new Set(this.state.sectionSchedule.map(s => s.subject_id))];
        return activeIds.reduce((sum, id) => {
            const subj = this.state.detailedSubjects.find(s => s.subject_id === id);
            return sum + (subj ? parseFloat(subj.units) : 0);
        }, 0);
    },

    handleSectionSearch(q) { this.state.sectionSearch = q; this.render(); },
    handleSectionFilterYear(y) { this.state.sectionFilterYear = y; this.render(); },

    handleDragStart(e, id, code, title) {
        e.dataTransfer.setData('subject_id', id);
        e.dataTransfer.setData('code', code);
        e.dataTransfer.setData('title', title);
        e.currentTarget.classList.add('opacity-50', 'scale-95');
    },

    handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset'); },
    handleDragLeave(e) { e.currentTarget.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset'); },

    async handleDropToSchedule(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset');
        const subjectId = e.dataTransfer.getData('subject_id');
        const day = e.currentTarget.dataset.day;
        const startTime = e.currentTarget.dataset.time;

        const [h, m] = startTime.split(':').map(Number);
        const endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        try {
            let assignment = this.state.detailedSubjects.find(s => s.subject_id === subjectId && s.is_assigned);
            if (!assignment) {
                assignment = await api.post(endpoints.sectionSubjects, {
                    section: this.state.selectedSection.id,
                    subject: subjectId
                });
            }

            await api.post(endpoints.scheduleSlots, {
                section_subject: assignment.id,
                day, start_time: startTime, end_time: endTime
            });

            Toast.success('Slot successfully placed');
            await this.viewSection(this.state.selectedSection.id);
        } catch (e) { ErrorHandler.handle(e); }
    },

    async viewSection(id) {
        try {
            const data = await this.ctx.service.loadSectionDetails(id);
            this.state.selectedSection = data.section;
            this.state.detailedSubjects = data.detailedSubjects;
            this.state.sectionSchedule = data.schedule;
            this.state.subView = 'detail';
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    backToSections() { this.state.selectedSection = null; this.state.subView = 'list'; this.render(); },

    openAddSectionModal() {
        const modal = new Modal({
            title: 'Create Section',
            content: `
                <form id="section-form" class="space-y-6">
                    ${UI.field({ label: 'Section Label', id: 'f-name', placeholder: 'e.g. BSIT-4A, CS-101', required: true })}
                    <div class="grid grid-cols-2 gap-6">
                         ${UI.field({
                label: 'Program',
                id: 'f-prog',
                type: 'select',
                options: this.state.programs.map(p => ({ value: p.id, label: p.code }))
            })}
                         ${UI.field({
                label: 'Academic Year',
                id: 'f-year',
                type: 'select',
                options: [
                    { value: 1, label: 'Year 1' },
                    { value: 2, label: 'Year 2' },
                    { value: 3, label: 'Year 3' },
                    { value: 4, label: 'Year 4' }
                ]
            })}
                    </div>
                </form>
            `,
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Section', primary: true,
                    onClick: async (m) => {
                        const data = {
                            name: document.getElementById('f-name').value,
                            program: document.getElementById('f-prog').value,
                            year_level: parseInt(document.getElementById('f-year').value),
                            semester: this.state.activeSemester.id
                        };
                        try {
                            await api.post(endpoints.sections, data);
                            Toast.success('Section created');
                            m.close();
                            await this.ctx.loadSections();
                            this.render();
                        } catch (e) { ErrorHandler.handle(e); }
                    }
                }
            ]
        });
        modal.show();
    }
};
