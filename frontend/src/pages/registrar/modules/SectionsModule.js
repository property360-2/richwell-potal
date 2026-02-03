import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { formatTime, getSubjectColor, setButtonLoading } from '../../../utils.js';

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

export const SectionsModule = {
    init(ctx) {
        this.ctx = ctx;
        const { state, render } = ctx;

        window.handleSectionSearch = (q) => this.handleSectionSearch(q);
        window.handleSectionFilterProgram = (id) => this.handleSectionFilterProgram(id);
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
        const filteredSections = this.state.sections.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(this.state.sectionSearch.toLowerCase());
            const matchesYear = this.state.sectionFilterYear === 'all' || String(s.year_level) === this.state.sectionFilterYear;
            return matchesSearch && matchesYear;
        });

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-800">Section Management</h2>
                <p class="text-sm text-gray-600 mt-1">Manage sections for ${this.state.activeSemester?.name || '...'}</p>
              </div>
              <button onclick="openAddSectionModal()" class="btn btn-primary">Add Section</button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input type="text" placeholder="Search..." class="form-input text-sm" value="${this.state.sectionSearch}" oninput="handleSectionSearch(this.value)">
              <select onchange="handleSectionFilterProgram(this.value)" class="form-select text-sm">
                <option value="all">All Programs</option>
                ${this.state.programs.map(p => `<option value="${p.id}" ${this.state.sectionFilterProgram === p.id ? 'selected' : ''}>${p.code}</option>`).join('')}
              </select>
              <select onchange="handleSectionFilterYear(this.value)" class="form-select text-sm">
                <option value="all">All Years</option>
                <option value="1" ${this.state.sectionFilterYear === '1' ? 'selected' : ''}>1</option>
                <option value="2" ${this.state.sectionFilterYear === '2' ? 'selected' : ''}>2</option>
                <option value="3" ${this.state.sectionFilterYear === '3' ? 'selected' : ''}>3</option>
                <option value="4" ${this.state.sectionFilterYear === '4' ? 'selected' : ''}>4</option>
              </select>
            </div>

            <div class="bg-white rounded-xl shadow border overflow-hidden">
                <table class="min-w-full divide-y">
                    <thead class="bg-gray-50">
                        <tr><th class="px-6 py-3 text-left text-xs font-bold uppercase">Section</th><th class="px-6 py-3 text-left text-xs font-bold uppercase">Program</th><th class="px-6 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody class="divide-y">
                        ${filteredSections.map(s => `
                            <tr class="hover:bg-gray-50 cursor-pointer" onclick="viewSection('${s.id}')">
                                <td class="px-6 py-4 font-bold">${s.name}</td>
                                <td class="px-6 py-4 text-sm">${s.program_code || s.program?.code}</td>
                                <td class="px-6 py-4 text-right">
                                    <button onclick="event.stopPropagation(); viewSection('${s.id}')" class="text-blue-600 mr-2">View</button>
                                    <button onclick="event.stopPropagation(); deleteSection('${s.id}')" class="text-red-500">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderSectionDetail() {
        const s = this.state.selectedSection;
        if (!s) return '';

        return `
            <div class="mb-6"><button onclick="backToSections()" class="text-blue-600 flex items-center gap-2">&larr; Back</button></div>
            <div class="bg-white p-6 rounded-xl shadow border mb-8">
                <h2 class="text-2xl font-bold">${s.name}</h2>
                <p class="text-gray-500">${s.program_code} - Year ${s.year_level}</p>
            </div>

            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-4 bg-white p-4 rounded-xl border shadow-sm">
                    <h3 class="font-bold mb-4">Available Subjects</h3>
                    <div class="space-y-2">
                        ${this.state.detailedSubjects.map(subj => {
            const isSlotted = this.state.sectionSchedule.some(slot => slot.subject_id === subj.subject_id);
            return `
                                <div class="p-3 border rounded-lg ${isSlotted ? 'bg-gray-50 opacity-50' : 'cursor-grab bg-blue-50 border-blue-200'}"
                                     ${isSlotted ? '' : `draggable="true" ondragstart="handleDragStart(event, '${subj.subject_id}', '${subj.code}', '${subj.title}')"`}>
                                    <div class="font-bold text-xs">${subj.code}</div>
                                    <div class="text-sm font-medium">${subj.title}</div>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
                <div class="col-span-8 bg-white rounded-xl border shadow-sm overflow-x-auto">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="bg-gray-50 border-b">
                                <th class="w-20 p-2 text-xs font-bold text-gray-400">Time</th>
                                ${DAYS.map(d => `<th class="p-2 text-xs font-bold text-gray-600">${d.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${TIME_SLOTS.map(t => `
                                <tr class="h-12 border-b">
                                    <td class="text-[10px] text-gray-400 text-center bg-gray-50">${formatTime(t)}</td>
                                    ${DAYS.map(d => this.renderScheduleCell(d.code, t)).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
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
                <td class="p-1" rowspan="${rowSpan}">
                    <div class="w-full h-full rounded p-2 text-[10px] flex flex-col justify-between ${getSubjectColor(slot.subject_code)}">
                        <div>
                            <div class="font-black">${slot.subject_code}</div>
                            <div class="font-medium truncate">${slot.subject_title}</div>
                        </div>
                        <button onclick="removeScheduleSlot('${slot.id}')" class="text-red-500 self-end">&times;</button>
                    </div>
                </td>
            `;
        }

        // Check if overlapped by a rowspan
        const overlapped = this.state.sectionSchedule.find(s => {
            if (s.day !== day) return false;
            const sStart = parseInt(s.start_time.split(':')[0]);
            const sEnd = parseInt(s.end_time.split(':')[0]);
            const tH = parseInt(time.split(':')[0]);
            return tH > sStart && tH < sEnd;
        });
        if (overlapped) return '';

        return `<td class="border-l border-gray-100 p-0 hover:bg-blue-50" 
                    data-day="${day}" data-time="${time}"
                    ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDropToSchedule(event)">
                </td>`;
    },

    handleDragStart(e, id, code, title) {
        e.dataTransfer.setData('subject_id', id);
        e.dataTransfer.setData('code', code);
        e.dataTransfer.setData('title', title);
        e.currentTarget.classList.add('opacity-50');
    },

    handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100'); },
    handleDragLeave(e) { e.currentTarget.classList.remove('bg-blue-100'); },

    async handleDropToSchedule(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-100');
        const subjectId = e.dataTransfer.getData('subject_id');
        const day = e.currentTarget.dataset.day;
        const startTime = e.currentTarget.dataset.time;

        // Default to 1 hour
        const [h, m] = startTime.split(':').map(Number);
        const endTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        try {
            // First check if assigned, if not assign it
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

            Toast.success('Slot added');
            await this.viewSection(this.state.selectedSection.id);
        } catch (e) { ErrorHandler.handle(e); }
    },

    async removeScheduleSlot(id) {
        if (!confirm('Remove this slot?')) return;
        try {
            await api.delete(endpoints.scheduleSlot(id));
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
    handleSectionSearch(q) { this.state.sectionSearch = q; this.render(); }
};
