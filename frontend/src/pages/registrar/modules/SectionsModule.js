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
    if (hour < 21) TIME_SLOTS.push(`${hour.toString().padStart(2, '0')}:30`);
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
        window.handleSectionFilterProgram = (p) => this.handleSectionFilterProgram(p);
        window.handleSectionSort = (field) => this.handleSectionSort(field);
        window.viewSection = (id) => this.viewSection(id);
        window.backToSections = () => this.backToSections();
        window.openAddSectionModal = () => this.openAddSectionModal();
        window.deleteSection = (id) => this.deleteSection(id);
        window.openBulkCreateModal = () => this.openBulkCreateModal();
        window.handleBulkInputs = () => this.handleBulkInputs();
        window.updateBulkCurriculumOptions = () => this.updateBulkCurriculumOptions();

        // Scheduling and Drag-Drop
        window.handleDragStart = (e, id, code, title) => this.handleDragStart(e, id, code, title);
        window.handleDragOver = (e) => this.handleDragOver(e);
        window.handleDragLeave = (e) => this.handleDragLeave(e);
        window.updateDragData = (el, id) => this.updateDragData(el, id);
        window.switchSubTab = (tab) => this.switchSubTab(tab);
        window.handleDropToSchedule = (e) => this.handleDropToSchedule(e);
        window.removeScheduleSlot = (id) => this.removeScheduleSlot(id);

        // Student CRUD
        window.openAddStudentModal = () => this.openAddStudentModal();
        window.removeStudentFromSection = (id) => this.removeStudentFromSection(id);
        window.handleAddStudentSearch = (q) => this.handleAddStudentSearch(q);
        window.addStudentToSection = (id) => this.addStudentToSection(id);

        // Slot Editor Sidebar
        window.openSlotEditor = (id) => this.openSlotEditor(id);
        window.closeSlotEditor = () => this.closeSlotEditor();
        window.saveSlotUpdate = () => this.saveSlotUpdate();
        window.setSlotColor = (color) => this.setSlotColor(color);
        window.refreshLogisticsStatus = (prefix = 'f') => this.refreshLogisticsStatus(prefix);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    renderSectionsTab() {
        if (this.state.subView === 'detail') return this.renderSectionDetail();

        // Since we are now using async filtering, we use the fetched state directly
        // But we keep a local filter for smooth UI if needed, or just use this.state.sections
        const filtered = this.state.sections;

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 class="text-2xl font-black text-gray-800">Section Manager</h2>
                    <p class="text-sm text-gray-500 font-medium">Create and schedule class sections for ${this.state.activeSemester?.name || 'Current Term'}</p>
                </div>
                <div class="flex gap-3">
                    ${UI.button({
            label: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg> Bulk Create Sections',
            type: 'primary',
            onClick: 'openBulkCreateModal()'
        })}
                </div>
            </div>

            <div class="flex flex-col md:flex-row gap-4 mb-6">
                <div class="flex-1 relative group">
                    <input type="text" placeholder="Search sections..." 
                           class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm"
                           value="${this.state.sectionSearch}" 
                           oninput="handleSectionSearch(this.value)">
                    <svg class="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <select onchange="handleSectionFilterYear(this.value)" class="w-44 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-600 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value="all">All Year Levels</option>
                    <option value="1" ${this.state.sectionFilterYear === '1' ? 'selected' : ''}>1st Year</option>
                    <option value="2" ${this.state.sectionFilterYear === '2' ? 'selected' : ''}>2nd Year</option>
                    <option value="3" ${this.state.sectionFilterYear === '3' ? 'selected' : ''}>3rd Year</option>
                    <option value="4" ${this.state.sectionFilterYear === '4' ? 'selected' : ''}>4th Year</option>
                </select>
                <select onchange="handleSectionFilterProgram(this.value)" class="w-44 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm font-bold text-gray-600 focus:ring-4 focus:ring-blue-500/10 transition-all">
                    <option value="all">All Programs</option>
                    ${this.state.programs.map(p => `
                        <option value="${p.id}" ${this.state.sectionFilterProgram === p.id ? 'selected' : ''}>${p.code}</option>
                    `).join('')}
                </select>
            </div>

            ${UI.table({
            headers: [
                `<button onclick="handleSectionSort('name')" class="flex items-center gap-1 uppercase tracking-widest">Section Name ${this.getSortIcon('name')}</button>`,
                `<button onclick="handleSectionSort('program__code')" class="flex items-center gap-1 uppercase tracking-widest">Program ${this.getSortIcon('program__code')}</button>`,
                `<button onclick="handleSectionSort('year_level')" class="flex items-center gap-1 uppercase tracking-widest">Year Level ${this.getSortIcon('year_level')}</button>`,
                'Status',
                'Actions'
            ],
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
                    <p class="text-sm text-gray-500 font-medium mt-1">
                        <span class="font-bold text-blue-600">${s.program?.code || s.program_code}</span> &bull; 
                        ${s.program?.name || 'Program'} &bull; 
                        Year ${s.year_level} &bull; ${this.state.activeSemester?.name}
                    </p>
                </div>
                <div class="flex gap-4">
                    <div class="text-right">
                        <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned Units</div>
                        <div class="text-xl font-black text-blue-600">${this.calculateTotalUnits()} Units</div>
                    </div>
                </div>
            </div>

            <!-- Tabs Navigation -->
             <div class="flex border-b border-gray-200 mb-6">
                <button onclick="switchSubTab('schedule')" class="px-6 py-3 text-sm font-bold border-b-2 transition-colors ${this.state.activeSubTab !== 'students' && this.state.activeSubTab !== 'grades' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">Schedule</button>
                <button onclick="switchSubTab('students')" class="px-6 py-3 text-sm font-bold border-b-2 transition-colors ${this.state.activeSubTab === 'students' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">Students</button>
                <button onclick="switchSubTab('grades')" class="px-6 py-3 text-sm font-bold border-b-2 transition-colors ${this.state.activeSubTab === 'grades' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}">Grades</button>
            </div>
            
            ${this.renderSubTabContent()}
        `;
    },

    renderSubTabContent() {
        const tab = this.state.activeSubTab || 'schedule';

        console.log('Rendering subtab:', tab); // Debug

        if (tab === 'students') {
            return this.renderStudentsTab();
        } else if (tab === 'grades') {
            return this.renderGradesTab();
        }

        // Default: Schedule
        return `
            <div class="relative">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-500 ${this.state.sidebarOpen ? 'lg:mr-[380px]' : ''}">
                    <!-- Masterlist Sidebar -->
                    <div class="lg:col-span-3 space-y-6 sticky top-24 self-start">
                        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Unscheduled Subjects</h3>
                            <div class="space-y-3">
                                ${this.state.detailedSubjects.map(subj => {
            const isSlotted = this.state.sectionSchedule.some(slot => slot.subject_id === subj.subject_id);

            return `
                                        <div class="p-4 border rounded-2xl transition-all ${isSlotted ? 'bg-gray-50 border-gray-100 opacity-60 grayscale-[0.5]' : 'cursor-grab bg-white border-gray-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 active:scale-95'}"
                                             ${isSlotted ? '' : `draggable="true" ondragstart="handleDragStart(event, '${subj.subject_id}', '${subj.code}', '${subj.title}')"`}>
                                            
                                            <div class="flex justify-between items-start mb-2">
                                                <div class="text-[10px] font-black text-blue-600 uppercase tracking-wider">${subj.code}</div>
                                                ${isSlotted ? `<span class="px-2 py-0.5 bg-green-500 text-white text-[8px] font-black uppercase rounded tracking-widest animate-pulse">Scheduled</span>` : ''}
                                            </div>

                                            <div class="text-sm font-bold text-gray-800 leading-tight mb-2">${subj.title}</div>
                                            <div class="text-[10px] text-gray-400 font-bold mb-3">${subj.units} Units</div>
                                            
                                            <div class="pt-2 border-t border-gray-50">
                                                <label class="text-[10px] uppercase font-bold text-gray-400 block mb-1">Assigned Professor on Subject</label>
                                                <select 
                                                    ${isSlotted ? 'disabled' : ''}
                                                    onclick="event.stopPropagation()" 
                                                    onchange="updateDragData(this, '${subj.subject_id}')" 
                                                    class="w-full text-xs p-1.5 bg-gray-50 border border-gray-100 rounded ${isSlotted ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 focus:ring-1 focus:ring-blue-500'} outline-none transition-colors" 
                                                    data-subject="${subj.subject_id}"
                                                >
                                                    <option value="">-- ${isSlotted ? 'Already Scheduled' : 'Drag to Select'} --</option>
                                                    ${(subj.qualified_professors || []).map(p => {
                const isSelected = isSlotted && this.state.sectionSchedule.find(slot => slot.subject_id === subj.subject_id)?.professor === p.id;
                return `<option value="${p.id}" ${isSelected ? 'selected' : ''}>${p.name || p.full_name || p.user?.last_name || 'Prof'}</option>`;
            }).join('')}
                                                </select>
                                            </div>
                                        </div>
                                    `;
        }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Schedule Grid -->
                    <div class="lg:col-span-9 bg-white rounded-3xl border border-gray-100 shadow-xl">
                        <div>
                            <table class="w-full border-collapse table-fixed">
                                <thead>
                                    <tr class="bg-gray-50/50">
                                        <th class="w-20 p-4 text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 sticky top-24 bg-white/95 backdrop-blur-sm z-[30]">Time</th>
                                        ${DAYS.map(d => `<th class="p-4 text-[11px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-100 border-l border-gray-50 sticky top-24 bg-white/95 backdrop-blur-sm z-[30]">${d.name}</th>`).join('')}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${TIME_SLOTS.map(t => {
            const isHour = t.endsWith(':00');
            const labelColor = isHour ? 'text-gray-400 font-black' : 'text-gray-300 font-bold text-[9px]';

            return `
                                        <tr class="h-12 group">
                                            <td class="p-0 ${labelColor} text-center bg-gray-50/50 border-b border-gray-100 align-top pt-1 leading-none ${isHour ? 'border-t border-gray-200' : ''}">
                                                ${t}
                                            </td>
                                            ${DAYS.map(d => this.renderScheduleCell(d.code, t)).join('')}
                                        </tr>
                                    `;
        }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Right Sidebar Editor -->
                <div id="slot-editor-sidebar" class="fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-[60] transform transition-transform duration-500 ease-in-out border-l border-gray-100 flex flex-col ${this.state.sidebarOpen ? 'translate-x-0' : 'translate-x-full'}">
                    ${this.renderSlotEditorSidebar()}
                </div>
            </div>
        `;
    },

    async loadSectionStudents() {
        if (!this.state.selectedSection) return;
        try {
            // Fetch students assigned to this section
            // Assuming filter support, otherwise we might need a specific endpoint
            const res = await api.get(`${endpoints.registrarStudents}?section=${this.state.selectedSection.id}`);
            this.state.sectionStudents = res.results || res; // Handle pagination if present
            this.render();
        } catch (e) {
            console.error('Failed to load students', e);
        }
    },

    renderStudentsTab() {
        // Trigger load if not loaded
        if (this.state.sectionStudents === undefined) {
            this.state.sectionStudents = null; // Mark as loading
            this.loadSectionStudents();
        }

        if (this.state.sectionStudents === null) {
            return `<div class="p-8 text-center text-gray-400">Loading students...</div>`;
        }

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-800">Students (${this.state.sectionStudents.length})</h3>
                    ${UI.button({
            label: 'Add Student',
            size: 'sm',
            onClick: 'openAddStudentModal()'
        })}
                </div>
                
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th class="text-left py-3 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">Student Info</th>
                                <th class="text-left py-3 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">Enrollment Status</th>
                                <th class="text-right py-3 px-4 text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${this.state.sectionStudents.length === 0
                ? `<tr><td colspan="3" class="p-8 text-center text-gray-400 text-sm">No students assigned to this section yet.</td></tr>`
                : this.state.sectionStudents.map(student => `
                                <tr class="group hover:bg-blue-50/30 transition-colors">
                                    <td class="p-4">
                                        <div class="font-bold text-gray-900">${student.last_name}, ${student.first_name}</div>
                                        <div class="text-xs text-gray-500 font-mono">${student.student_number || 'No ID'}</div>
                                    </td>
                                    <td class="p-4">
                                        ${UI.badge(student.enrollment_status || 'Enrolled', 'success')}
                                    </td>
                                    <td class="p-4 text-right">
                                        ${UI.button({
                    label: 'Remove',
                    type: 'danger',
                    size: 'xs',
                    onClick: `removeStudentFromSection('${student.id}')`
                })}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderGradesTab() {
        return `<div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Grades for this Section</h3>
                    <p class="text-gray-500">Grades management coming soon...</p>
                </div>`;
    },

    renderScheduleCell(day, time) {
        // Robust lookup: find slot that starts at this time
        const slot = this.state.sectionSchedule.find(s => {
            if (s.day !== day) return false;
            const [sH, sM] = s.start_time.split(':').map(Number);
            const slotTimeKey = `${sH.toString().padStart(2, '0')}:${sM.toString().padStart(2, '0')}`;
            return slotTimeKey === time;
        });

        if (slot) {
            // Calculate row span based on 30-min intervals
            const [startH, startM] = slot.start_time.split(':').map(Number);
            const [endH, endM] = slot.end_time.split(':').map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const rowSpan = Math.ceil((endMinutes - startMinutes) / 30);

            // Get professor name
            const prof = this.state.professors?.find(p => p.id === slot.professor);
            const profName = prof ? (prof.full_name || (prof.user?.last_name)) : 'TBA';

            // Determine color based on subject (consistent hashing)
            const colorClass = getSubjectColor(slot.subject_code);

            return `
                <td rowspan="${rowSpan}" 
                    class="p-0 relative align-top border-l border-gray-50 z-10" 
                    style="height: ${rowSpan * 3}rem;"
                    draggable="true" 
                    onclick="openSlotEditor('${slot.id}')"
                    ondragstart="handleDragStart(event, '${slot.subject_id}', '${slot.subject_code}', '${slot.subject_title || ''}', '${slot.id}')">
                    <div class="h-full w-full ${slot.color ? slot.color : colorClass.bg + ' ' + colorClass.border} border-l-4 p-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden">
                        <div>
                            <div class="flex justify-between items-start">
                                <span class="text-[10px] font-black ${colorClass.text} uppercase tracking-wider">${slot.subject_code}</span>
                                ${slot.room ? `<span class="text-[9px] font-bold bg-white/50 px-1.5 py-0.5 rounded text-gray-600">${slot.room}</span>` : ''}
                            </div>
                            <div class="font-bold text-xs text-gray-800 leading-tight mt-1 line-clamp-2">${profName}</div>
                        </div>
                        <div class="mt-2 pt-2 border-t border-black/5 flex justify-between items-end">
                             <div class="text-[9px] font-bold text-gray-500 whitespace-nowrap">${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}</div>
                             <button onclick="removeScheduleSlot('${slot.id}')" class="w-4 h-4 rounded-full bg-white/50 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center font-bold text-xs">&times;</button>
                        </div>
                    </div>
                </td>`;
        }

        // Overlap check (Minute precise)
        const [curH, curM] = time.split(':').map(Number);
        const curMinutes = curH * 60 + curM;

        const overlapped = this.state.sectionSchedule.find(s => {
            if (s.day !== day) return false;
            const [sStartH, sStartM] = s.start_time.split(':').map(Number);
            const [sEndH, sEndM] = s.end_time.split(':').map(Number);
            const sStartTotal = sStartH * 60 + sStartM;
            const sEndTotal = sEndH * 60 + sEndM;

            // Current time is inside an existing slot (exclusive of end time)
            return curMinutes >= sStartTotal && curMinutes < sEndTotal;
        });

        if (overlapped) return '';

        const isHour = time.endsWith(':00');
        const gridClass = isHour ? 'border-t border-t-gray-300' : 'border-t border-t-gray-100 border-dashed';

        return `<td class="p-0 ${gridClass} border-b border-gray-100 border-l border-gray-50 hover:bg-blue-50/50 transition-colors relative h-12" 
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

    handleSectionSearch(q) {
        this.state.sectionSearch = q;
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(async () => {
            await this.ctx.loadSections();
            this.render();
        }, 400);
    },
    async handleSectionFilterYear(y) {
        this.state.sectionFilterYear = y;
        await this.ctx.loadSections();
        this.render();
    },
    async handleSectionFilterProgram(p) {
        this.state.sectionFilterProgram = p;
        await this.ctx.loadSections();
        this.render();
    },
    async handleSectionSort(field) {
        if (this.state.sectionSortBy === field) {
            this.state.sectionSortOrder = this.state.sectionSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sectionSortBy = field;
            this.state.sectionSortOrder = 'asc';
        }
        await this.ctx.loadSections();
        this.render();
    },
    getSortIcon(field) {
        if (this.state.sectionSortBy !== field) return '<svg class="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>';
        return this.state.sectionSortOrder === 'asc'
            ? '<svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>'
            : '<svg class="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
    },

    switchSubTab(tab) {
        this.state.activeSubTab = tab;
        this.render();
    },

    updateDragData(selectEl, subjectId) {
        // Store selected professor for this subject temporarily in state or data attribute
        // Simplify: we can iterate selects on drag start, but this is cleaner if we store it map.
        if (!this.state.dragSelections) this.state.dragSelections = {};
        this.state.dragSelections[subjectId] = selectEl.value;
    },

    handleDragStart(e, id, code, title, slotId = null) {
        e.dataTransfer.setData('subject_id', id);
        e.dataTransfer.setData('code', code);
        e.dataTransfer.setData('title', title);
        if (slotId) e.dataTransfer.setData('slot_id', slotId);

        // Add selected professor if any
        if (this.state.dragSelections && this.state.dragSelections[id]) {
            e.dataTransfer.setData('preferred_professor', this.state.dragSelections[id]);
        }

        e.currentTarget.classList.add('opacity-50', 'scale-95');
    },

    handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset'); },
    handleDragLeave(e) { e.currentTarget.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset'); },

    async handleDropToSchedule(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-blue-100/50', 'ring-2', 'ring-blue-400', 'ring-inset');
        const subjectId = e.dataTransfer.getData('subject_id');
        const slotId = e.dataTransfer.getData('slot_id'); // If moving
        const code = e.dataTransfer.getData('code');
        const title = e.dataTransfer.getData('title');
        const day = e.currentTarget.dataset.day;
        const startTime = e.currentTarget.dataset.time;

        // Default 1 hour duration
        const [h, m] = startTime.split(':').map(Number);
        let endH = h + 1;
        let endM = m;
        const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

        // Get existing assignment if any
        let assignment = this.state.detailedSubjects.find(s => s.subject_id === subjectId && s.is_assigned);

        // If moving, we might need to fetch the specific slot details (room/prof) to pre-fill?
        // For now, we use defaults or existing assignment data.
        let currentRoom = '';
        if (slotId) {
            const existingSlot = this.state.sectionSchedule.find(s => s.id === slotId);
            if (existingSlot) currentRoom = existingSlot.room || '';
        }

        // Open Modal
        const modal = new Modal({
            title: slotId ? `Reschedule: ${code}` : `Schedule Class: ${code}`,
            content: `
                <form id="schedule-form" class="space-y-4">
                    <input type="hidden" id="f-subject-id" value="${subjectId}">
                    <div class="grid grid-cols-2 gap-4">
                        ${UI.field({ label: 'Day', id: 'f-day', value: day, disabled: true })}
                        <div class="grid grid-cols-2 gap-2">
                             <div>
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Start</label>
                                <select id="f-start" onchange="refreshLogisticsStatus('f')" class="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20">
                                    ${TIME_SLOTS.map(t => `<option value="${t}" ${startTime === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                             </div>
                             <div>
                                <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">End</label>
                                <select id="f-end" onchange="refreshLogisticsStatus('f')" class="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20">
                                    ${TIME_SLOTS.map(t => `<option value="${t}" ${endTime === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                             </div>
                        </div>
                    </div>
                    
                    <div>
                         <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span>Room</span>
                            <span id="f-room-status" class="text-xs font-normal text-gray-500"></span>
                         </label>
                         <select id="f-room" onchange="refreshLogisticsStatus('f')" class="w-full form-select rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <option value="">No Room (TBA)</option>
                            ${this.state.rooms.filter(r => r.is_active).map(r => `<option value="${r.name}" ${currentRoom === r.name ? 'selected' : ''}>${r.name} (${r.room_type}, Cap: ${r.capacity})</option>`).join('')}
                         </select>
                    </div>

                     <div>
                          <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span>Professor</span>
                            <span id="f-prof-status" class="text-xs font-normal text-gray-500"></span>
                          </label>
                          <select id="f-prof" onchange="refreshLogisticsStatus('f')" class="w-full form-select rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                             <option value="">No Professor (TBA)</option>
                             ${this.state.professors.map(p => {
                const name = `${p.last_name}, ${p.first_name}`;
                const preferredId = e.dataTransfer.getData('preferred_professor');
                const selectedId = preferredId || (assignment?.professor_id) || (this.state.sectionSchedule.find(s => s.id === slotId)?.professor);

                return `<option value="${p.id}" data-name="${name}" ${selectedId === p.id ? 'selected' : ''}>${name}</option>`;
            }).join('')}
                          </select>
                     </div>

                    <div id="conflict-warning" class="hidden p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 font-medium whitespace-pre-line"></div>
                </form>
            `,
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: slotId ? 'Update Schedule' : 'Save Schedule', primary: true, id: 'btn-save-schedule',
                    onClick: async (m) => {
                        const sTime = document.getElementById('f-start').value;
                        const eTime = document.getElementById('f-end').value;
                        const room = document.getElementById('f-room').value;
                        const profId = document.getElementById('f-prof').value;
                        const override = false;

                        try {
                            // 1. Create/Get Assignment
                            let assignmentId = assignment ? (assignment.id || assignment.section_subject_id) : null;
                            const currentProfId = assignment ? (assignment.professor || assignment.assigned_professors?.[0]?.id || assignment.professors?.[0]?.id) : null;

                            if (!assignment) {
                                console.log('Creating new section subject assignment:', {
                                    section: this.state.selectedSection.id,
                                    subject: subjectId,
                                    professor: profId || null
                                });
                                assignment = await api.post(endpoints.sectionSubjects, {
                                    section: this.state.selectedSection.id,
                                    subject: subjectId,
                                    professor: profId || null
                                });
                                assignmentId = assignment.id;
                            } else if (profId && currentProfId !== profId) {
                                // Update professor if changed
                                await api.request(endpoints.sectionSubject(assignmentId), {
                                    method: 'PATCH',
                                    body: JSON.stringify({ professor: profId })
                                });
                            }

                            const payload = {
                                section_subject: assignmentId,
                                day: day,
                                start_time: sTime,
                                end_time: eTime,
                                room: room || '',
                                professor: profId || null,
                                override_conflict: override
                            };

                            console.log('Schedule slot payload:', payload);

                            if (slotId) {
                                // Update existing
                                await api.request(endpoints.scheduleSlot(slotId), {
                                    method: 'PATCH',
                                    body: JSON.stringify(payload)
                                });
                            } else {
                                // Create new
                                await api.post(endpoints.scheduleSlots, payload);
                            }

                            Toast.success('Schedule saved');
                            m.close();
                            await this.viewSection(this.state.selectedSection.id);
                        } catch (e) {
                            console.error('Schedule save error:', e);
                            const warningEl = document.getElementById('conflict-warning');
                            if (warningEl) {
                                const data = e.data || {};
                                let messages = [];

                                // Handle structured error responses
                                if (data.detail) messages.push(data.detail);
                                if (data.error) messages.push(data.error);
                                if (data.non_field_errors) messages.push(...data.non_field_errors);

                                // Handle field-specific errors with better formatting
                                for (const key in data) {
                                    if (!['detail', 'error', 'non_field_errors', 'success', 'conflict_details', 'warning_type'].includes(key)) {
                                        const val = data[key];
                                        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        if (Array.isArray(val)) {
                                            messages.push(`${label}: ${val.join(', ')}`);
                                        } else if (typeof val === 'string') {
                                            messages.push(`${label}: ${val}`);
                                        }
                                    }
                                }

                                // Display conflict details if available
                                if (data.conflict_details) {
                                    const conflict = data.conflict_details;
                                    messages.push(`\n⚠️ ${conflict.type.toUpperCase()} CONFLICT`);
                                    messages.push(`Resource: ${conflict.resource}`);
                                    messages.push(`Details: ${conflict.conflict}`);
                                }

                                warningEl.textContent = messages.join('\n') || e.message || 'Error saving schedule';
                                warningEl.classList.remove('hidden');
                            } else {
                                ErrorHandler.handle(e);
                            }
                        }
                    }
                }
            ]
        });
        modal.show();
        setTimeout(() => this.refreshLogisticsStatus('f'), 100);
    },

    async removeScheduleSlot(id) {
        const confirmed = await ConfirmModal({
            title: 'Delete Schedule Slot',
            message: 'Are you sure you want to remove this schedule slot?',
            confirmLabel: 'Delete Slot',
            danger: true
        });

        if (confirmed) {
            try {
                await api.delete(endpoints.scheduleSlot(id));
                Toast.success('Schedule slot removed');
                if (this.state.sidebarOpen) {
                    this.state.sidebarOpen = false;
                    this.state.activeSlotId = null;
                }
                await this.viewSection(this.state.selectedSection.id);
            } catch (e) {
                ErrorHandler.handle(e);
            }
        }
    },

    async viewSection(id) {
        try {
            const [data, globalSchedule] = await Promise.all([
                this.ctx.service.loadSectionDetails(id),
                this.ctx.service.loadAllScheduleSlots(this.state.activeSemester.id)
            ]);
            this.state.selectedSection = data.section;
            this.state.detailedSubjects = data.detailedSubjects;
            this.state.sectionSchedule = data.schedule;
            this.state.globalSchedule = globalSchedule;
            this.state.subView = 'detail';
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    backToSections() { this.state.selectedSection = null; this.state.subView = 'list'; this.render(); },

    openAddSectionModal() {
        const modal = new Modal({
            title: 'Create Individual Section',
            content: `
                <form id="section-form" class="space-y-6">
                    ${UI.field({ label: 'Section Label', id: 'f-name', placeholder: 'e.g. BSIT-4A', required: true, attrs: 'autofocus' })}
                    <div class="grid grid-cols-2 gap-6">
                         ${UI.field({
                label: 'Program',
                id: 'f-prog',
                type: 'select',
                options: [{ value: '', label: 'Select Program' }, ...this.state.programs.map(p => ({ value: p.id, label: p.code }))]
            })}
                         ${UI.field({
                label: 'Year Level',
                id: 'f-year',
                type: 'select',
                options: [
                    { value: '', label: 'Select Year' },
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
                        this.clearFormErrors(['f-name', 'f-prog', 'f-year']);

                        const data = {
                            name: document.getElementById('f-name').value.trim(),
                            program: document.getElementById('f-prog').value,
                            year_level: document.getElementById('f-year').value,
                            semester: this.state.activeSemester.id
                        };

                        const { isValid, errors } = Validator.validate(data, {
                            name: [Validator.required, Validator.minLength(2)],
                            program: [Validator.required],
                            year_level: [Validator.required]
                        });

                        if (!isValid) {
                            Object.entries(errors).forEach(([field, msg]) => {
                                const id = field === 'name' ? 'f-name' : (field === 'program' ? 'f-prog' : 'f-year');
                                this.showFieldError(id, msg);
                            });
                            return;
                        }

                        try {
                            // Ensure year_level is int for backend
                            data.year_level = parseInt(data.year_level);
                            await api.post(endpoints.sections, data);
                            Toast.success('Section created');
                            m.close();
                            await this.ctx.loadSections();
                            this.render();
                        } catch (e) {
                            if (e.data && typeof e.data === 'object') {
                                Object.entries(e.data).forEach(([field, msgs]) => {
                                    const id = field === 'name' ? 'f-name' : (field === 'program' ? 'f-prog' : 'f-year');
                                    this.showFieldError(id, Array.isArray(msgs) ? msgs[0] : msgs);
                                });
                            } else {
                                ErrorHandler.handle(e);
                            }
                        }
                    }
                }
            ]
        });
        modal.show();
    },

    openBulkCreateModal() {
        if (!this.state.programs || this.state.programs.length === 0) {
            Toast.error('No programs available');
            return;
        }

        const modal = new Modal({
            title: 'Bulk Create Sections',
            content: `
                <div class="space-y-6">
                    <p class="text-sm text-gray-500">Automatically generate section names and link curriculum subjects based on the selected program and year level.</p>
                    
                    <div class="grid grid-cols-2 gap-4">
                        ${UI.field({
                label: 'Program',
                id: 'bulk-program',
                type: 'select',
                attrs: 'onchange="handleBulkInputs(); updateBulkCurriculumOptions()"',
                options: this.state.programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))
            })}
                        ${UI.field({
                label: 'Curriculum',
                id: 'bulk-curriculum',
                type: 'select',
                options: [{ value: '', label: 'Auto-detect Active' }]
            })}
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        ${UI.field({
                label: 'Year Level',
                id: 'bulk-year',
                type: 'select',
                attrs: 'onchange="handleBulkInputs()"',
                options: [
                    { value: '1', label: '1st Year' },
                    { value: '2', label: '2nd Year' },
                    { value: '3', label: '3rd Year' },
                    { value: '4', label: '4th Year' },
                    { value: '5', label: '5th Year' }
                ]
            })}
                        ${UI.field({
                label: 'Start Index',
                id: 'bulk-start',
                type: 'number',
                value: 1,
                attrs: 'min="1" oninput="handleBulkInputs()"'
            })}
                        ${UI.field({
                label: 'Count',
                id: 'bulk-count',
                type: 'number',
                value: 1,
                attrs: 'min="1" max="20" oninput="handleBulkInputs()"'
            })}
                    </div>
                    
                    <div class="border-t border-gray-100 pt-6">
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Generated Sections Preview</label>
                        <div id="bulk-preview" class="space-y-1.5 max-h-48 overflow-y-auto bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <!-- Preview items -->
                        </div>
                        <div id="bulk-warning" class="hidden mt-3 p-3 bg-red-50 text-red-700 text-[11px] rounded-xl border border-red-100 font-bold flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <span id="bulk-warning-text"></span>
                        </div>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Sections', primary: true, id: 'btn-bulk-confirm',
                    onClick: async (m) => {
                        await this.executeBulkCreate(m);
                    }
                }
            ]
        });

        modal.show();

        this.updateBulkCurriculumOptions();
        this.handleBulkInputs();
    },

    async updateBulkCurriculumOptions() {
        const programId = document.getElementById('bulk-program')?.value;
        if (!programId) return;

        try {
            const res = await api.get(`${endpoints.curricula}?program=${programId}&is_active=true`);
            const select = document.getElementById('bulk-curriculum');
            if (select && res && res.length > 0) {
                select.innerHTML = res.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
            } else if (select) {
                select.innerHTML = '<option value="">No active curriculum found</option>';
            }
        } catch (e) {
            console.error('Error loading curricula', e);
        }
    },

    async handleBulkInputs() {
        const programId = document.getElementById('bulk-program')?.value;
        if (!programId) return;

        const program = this.state.programs.find(p => p.id === programId);
        const programCode = program ? program.code : 'PROG';
        const year = document.getElementById('bulk-year').value;
        const startIndex = parseInt(document.getElementById('bulk-start').value) || 1;
        const count = parseInt(document.getElementById('bulk-count').value) || 1;

        const names = [];
        for (let i = 0; i < count; i++) {
            names.push(`${programCode} ${year}-${startIndex + i}`);
        }

        const previewEl = document.getElementById('bulk-preview');
        if (previewEl) {
            previewEl.innerHTML = names.map(n => `
                <div class="flex items-center justify-between text-sm p-1">
                    <span class="font-mono font-bold text-gray-600">${n}</span>
                    <span class="text-xs text-gray-400">Checking...</span>
                </div>
            `).join('');
        }

        const confirmBtn = document.getElementById('btn-bulk-confirm');
        if (confirmBtn) confirmBtn.disabled = true;

        const warningEl = document.getElementById('bulk-warning');
        if (warningEl) warningEl.classList.add('hidden');

        if (this.bulkValidationTimeout) clearTimeout(this.bulkValidationTimeout);
        this.bulkValidationTimeout = setTimeout(async () => {
            await this.validateBulkNames(names);
        }, 500);
    },

    async validateBulkNames(names) {
        if (!this.state.activeSemester) return;

        try {
            const res = await api.post(`${endpoints.sections}validate-names/`, {
                names: names,
                semester_id: this.state.activeSemester.id
            });

            const duplicates = res.duplicates || [];
            const previewEl = document.getElementById('bulk-preview');
            let hasError = false;

            if (previewEl) {
                previewEl.innerHTML = names.map(n => {
                    const isDup = duplicates.includes(n);
                    if (isDup) hasError = true;
                    return `
                        <div class="flex items-center justify-between text-sm p-1 border-b border-gray-100 last:border-0">
                            <span class="font-mono font-bold ${isDup ? 'text-red-600' : 'text-green-700'}">${n}</span>
                            ${isDup
                            ? '<span class="text-xs font-bold text-red-500 flex items-center gap-1">❌ Duplicate</span>'
                            : '<span class="text-xs font-bold text-green-500 flex items-center gap-1">✓ Available</span>'
                        }
                        </div>
                    `;
                }).join('');
            }

            const warningEl = document.getElementById('bulk-warning');
            const confirmBtn = document.getElementById('btn-bulk-confirm');

            if (hasError) {
                if (warningEl) {
                    const warningText = document.getElementById('bulk-warning-text');
                    if (warningText) warningText.textContent = 'Some generated section names already exist in this semester. Duplicate sections are not allowed.';
                    warningEl.classList.remove('hidden');
                }
                if (confirmBtn) confirmBtn.disabled = true;
            } else {
                if (warningEl) warningEl.classList.add('hidden');
                if (confirmBtn) confirmBtn.disabled = false;
            }
        } catch (e) {
            console.error(e);
            const previewEl = document.getElementById('bulk-preview');
            if (previewEl) previewEl.innerHTML = `<div class="text-red-500 text-xs">Error validating names</div>`;
        }
    },

    async executeBulkCreate(modal) {
        this.clearFormErrors(['bulk-program', 'bulk-curriculum', 'bulk-year', 'bulk-start', 'bulk-count']);

        const programId = document.getElementById('bulk-program').value;
        const curriculumId = document.getElementById('bulk-curriculum').value;
        const yearLevel = document.getElementById('bulk-year').value;
        const startIndex = document.getElementById('bulk-start').value;
        const count = document.getElementById('bulk-count').value;

        const data = {
            program: programId,
            curriculum: curriculumId,
            year: yearLevel,
            start: startIndex,
            count: count
        };

        const { isValid, errors } = Validator.validate(data, {
            program: [Validator.required],
            curriculum: [Validator.required],
            year: [Validator.required],
            start: [Validator.required],
            count: [Validator.required]
        });

        if (!isValid) {
            let firstId = null;
            Object.entries(errors).forEach(([field, msg]) => {
                const id = `bulk-${field}`;
                this.showFieldError(id, msg);
                if (!firstId) firstId = id;
            });
            if (firstId) document.getElementById(firstId)?.focus();
            Toast.error('Please fix the configuration errors');
            return;
        }

        const program = this.state.programs.find(p => p.id === programId);
        const programCode = program ? program.code : 'PROG';

        const names = [];
        const startNum = parseInt(startIndex);
        const countNum = parseInt(count);

        for (let i = 0; i < countNum; i++) {
            names.push(`${programCode} ${yearLevel}-${startNum + i}`);
        }

        try {
            await api.post(`${endpoints.sections}bulk-create/`, {
                program: programId,
                curriculum: curriculumId,
                semester: this.state.activeSemester.id,
                year_level: parseInt(yearLevel),
                section_names: names,
                capacity: 40 // Default
            });

            Toast.success(`${count} sections created successfully`);
            modal.close();
            await this.ctx.loadSections();
            this.render();
        } catch (e) {
            ErrorHandler.handle(e);
        }
    },

    openAddStudentModal() {
        const modal = new Modal({
            title: 'Add Student to Section',
            content: `
    < div class="space-y-4" >
                    <p class="text-sm text-gray-500">Search for students to add to <strong>${this.state.selectedSection.name}</strong>.</p>
                    
                    <div class="relative group">
                        <input type="text" placeholder="Search by name or ID..." autofocus
                               class="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-bold text-gray-700"
                               oninput="handleAddStudentSearch(this.value)">
                        <svg class="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    
                    <div id="student-search-results" class="space-y-2 max-h-60 overflow-y-auto min-h-[100px]">
                        <div class="p-8 text-center text-gray-400 text-sm">Type to search students...</div>
                    </div>
                </div >
    `,
            actions: [{ label: 'Close', onClick: (m) => m.close() }]
        });
        modal.show();
        this.studentSearchModal = modal;
    },

    async handleAddStudentSearch(q) {
        if (!q || q.length < 2) return;

        if (this.addStudentTimeout) clearTimeout(this.addStudentTimeout);
        this.addStudentTimeout = setTimeout(async () => {
            const resultsEl = document.getElementById('student-search-results');
            resultsEl.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">Searching...</div>';

            try {
                // Filter where section is null ideally, but simple search first
                const res = await api.get(`${endpoints.registrarStudents}?search = ${q} `);
                const students = res.results || res;

                if (students.length === 0) {
                    resultsEl.innerHTML = '<div class="p-4 text-center text-gray-400 text-sm">No students found.</div>';
                    return;
                }

                resultsEl.innerHTML = students.map(s => {
                    const inSection = s.section ? true : false; // s.section is likely an ID or object
                    const sectionName = s.section_details?.name || 'Another Section';
                    // Note: API might not return section_details, simplified assumption

                    return `
    < div class="p-3 border rounded-xl flex justify-between items-center hover:bg-gray-50 transition-colors" >
        <div>
            <div class="font-bold text-gray-900 text-sm">${s.last_name}, ${s.first_name}</div>
            <div class="text-xs text-gray-500 font-mono">${s.student_number}</div>
        </div>
                            
                            ${inSection
                            ? `<span class="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">In ${sectionName}</span>`
                            : UI.button({
                                label: 'Add',
                                size: 'xs',
                                onClick: `addStudentToSection('${s.id}')`
                            })
                        }
                        </div >
    `;
                }).join('');

            } catch (e) {
                console.error(e);
                resultsEl.innerHTML = '<div class="p-4 text-center text-red-400 text-sm">Error searching.</div>';
            }
        }, 400);
    },

    async addStudentToSection(studentId) {
        try {
            await api.patch(`${endpoints.registrarStudents}${studentId}/`, {
                section: this.state.selectedSection.id
            });

            Toast.success('Student added to section');
            if (this.studentSearchModal) this.studentSearchModal.close();

            // Refresh list
            await this.loadSectionStudents();
        } catch (e) {
            ErrorHandler.handle(e);
        }
    },

    async removeStudentFromSection(studentId) {
        // Confirmation
        if (!confirm('Are you sure you want to remove this student from the section?')) return;

        try {
            await api.patch(`${endpoints.registrarStudents}${studentId}/`, {
                section: null
            });
            Toast.success('Student removed from section');
            await this.loadSectionStudents();
        } catch (e) {
            ErrorHandler.handle(e);
        }
    },

    openSlotEditor(slotId) {
        this.state.activeSlotId = slotId;
        this.state.sidebarOpen = true;
        this.render();
        setTimeout(() => this.refreshLogisticsStatus('edit'), 100);
    },

    closeSlotEditor() {
        this.state.sidebarOpen = false;
        this.state.activeSlotId = null;
        this.render();
    },

    setSlotColor(color) {
        const slotId = this.state.activeSlotId;
        if (!slotId) return;

        const slot = this.state.sectionSchedule.find(s => s.id === slotId);
        if (slot) {
            slot.color = color;
            const el = document.querySelector(`[onclick="openSlotEditor('${slotId}')"] div`);
            if (el) {
                // Remove all possible bg/border classes (rough hack for preview)
                el.className = `h-full w-full rounded-xl ${color} border-l-4 p-2 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden`;
            }
        }
    },

    renderSlotEditorSidebar() {
        const slotId = this.state.activeSlotId;
        const slot = slotId ? this.state.sectionSchedule.find(s => s.id === slotId) : null;

        if (!slot) return `<div class="p-8 text-center text-gray-400">Select a slot to edit</div>`;

        const prof = this.state.professors?.find(p => p.id === slot.professor);
        const subjInfo = this.state.detailedSubjects?.find(s => s.subject_id === slot.subject_id);
        const qualifiedProfs = subjInfo?.qualified_professors || [];
        const colorClass = getSubjectColor(slot.subject_code);

        const PRESET_COLORS = [
            { name: 'Default', value: '' },
            { name: 'Blue', value: 'bg-blue-100 border-blue-400 text-blue-800' },
            { name: 'Green', value: 'bg-green-100 border-green-400 text-green-800' },
            { name: 'Purple', value: 'bg-purple-100 border-purple-400 text-purple-800' },
            { name: 'Orange', value: 'bg-orange-100 border-orange-400 text-orange-800' },
            { name: 'Pink', value: 'bg-pink-100 border-pink-400 text-pink-800' },
            { name: 'Teal', value: 'bg-teal-100 border-teal-400 text-teal-800' },
            { name: 'Red', value: 'bg-red-100 border-red-400 text-red-800' },
            { name: 'Indigo', value: 'bg-indigo-100 border-indigo-400 text-indigo-800' },
            { name: 'Slate', value: 'bg-slate-100 border-slate-400 text-slate-800' }
        ];

        return `
            <div class="px-6 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 class="text-xl font-black text-gray-900">${slot.subject_code}</h3>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">${slot.subject_title || 'Class Slot'}</p>
                </div>
                <button onclick="closeSlotEditor()" class="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-8">
                <!-- Color Coding -->
                <section>
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Color Coding</label>
                    <div class="grid grid-cols-5 gap-2">
                        ${PRESET_COLORS.map(c => `
                            <button onclick="setSlotColor('${c.value}')" 
                                    class="w-full h-10 rounded-lg border-2 transition-all ${c.value ? c.value.split(' ')[0] + ' ' + c.value.split(' ')[1] : 'bg-gray-100 border-gray-200'} ${slot.color === c.value || (!slot.color && !c.value) ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'hover:scale-105 opacity-80'}"
                                    title="${c.name}">
                            </button>
                        `).join('')}
                    </div>
                </section>

                <!-- Schedule Details -->
                <section class="space-y-4">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Time & Logistics</label>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-widest text-[10px] text-gray-400">Start Time</label>
                            <select id="edit-start" onchange="refreshLogisticsStatus('edit')" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold">
                                ${TIME_SLOTS.map(t => `<option value="${t}" ${slot.start_time.startsWith(t) ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-widest text-[10px] text-gray-400">End Time</label>
                            <select id="edit-end" onchange="refreshLogisticsStatus('edit')" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold">
                                ${TIME_SLOTS.map(t => `<option value="${t}" ${slot.end_time.startsWith(t) ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-gray-600 mb-1 block">Room</label>
                        <select id="edit-room" onchange="refreshLogisticsStatus('edit')" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold">
                            <option value="">No Room (TBA)</option>
                            ${this.state.rooms?.filter(r => r.is_active).map(r => `<option value="${r.name}" ${slot.room === r.name ? 'selected' : ''}>${r.name} (${r.room_type})</option>`).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-gray-600 mb-1 block">Assigned Professor on Subject</label>
                        <select id="edit-prof" onchange="refreshLogisticsStatus('edit')" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-bold">
                            <option value="">No Professor (TBA)</option>
                            ${qualifiedProfs.map(p => {
            const name = p.name || p.full_name || `${p.user?.last_name || p.last_name}, ${p.user?.first_name || p.first_name}`;
            return `<option value="${p.id}" data-name="${name}" ${slot.professor === p.id ? 'selected' : ''}>${name}</option>`;
        }).join('')}
                        </select>
                    </div>
                </section>

                <!-- Warnings -->
                <div id="edit-conflict-warning" class="hidden p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-100 font-medium animate-in fade-in slide-in-from-top-2 whitespace-pre-line">
                </div>
            </div>

            <div class="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-3">
                <button onclick="removeScheduleSlot('${slot.id}')" class="px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-black hover:bg-red-100 transition-all uppercase tracking-widest whitespace-nowrap">
                    Delete
                </button>
                <div class="flex-1 flex gap-3">
                    <button onclick="closeSlotEditor()" class="flex-1 py-3 text-sm font-black text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-widest">Discard</button>
                    <button onclick="saveSlotUpdate()" id="btn-save-slot" class="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 transition-all uppercase tracking-widest">
                        Save Changes
                    </button>
                </div>
            </div>
        `;
    },

    async saveSlotUpdate() {
        const slotId = this.state.activeSlotId;
        if (!slotId) return;

        const btn = document.getElementById('btn-save-slot');
        const warningEl = document.getElementById('edit-conflict-warning');

        const payload = {
            start_time: document.getElementById('edit-start').value,
            end_time: document.getElementById('edit-end').value,
            room: document.getElementById('edit-room').value,
            professor: document.getElementById('edit-prof').value || null,
            override_conflict: false,
            color: this.state.sectionSchedule.find(s => s.id === slotId)?.color || ''
        };

        try {
            if (btn) btn.disabled = true;
            if (btn) btn.innerHTML = 'Saving...';

            await api.request(endpoints.scheduleSlot(slotId), {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });

            Toast.success('Schedule updated');
            this.state.sidebarOpen = false;
            this.state.activeSlotId = null;

            // Reload data to reflect changes
            await this.viewSection(this.state.selectedSection.id);
        } catch (e) {
            console.error('Update failed', e);
            if (warningEl) {
                const data = e.data || {};
                let messages = [];

                if (data.detail) messages.push(data.detail);
                if (data.error) messages.push(data.error);
                if (data.non_field_errors) messages.push(...data.non_field_errors);

                for (const key in data) {
                    if (!['detail', 'error', 'non_field_errors', 'success'].includes(key)) {
                        const val = data[key];
                        const label = key.charAt(0).toUpperCase() + key.slice(1);
                        if (Array.isArray(val)) messages.push(`${label}: ${val.join(', ')}`);
                        else if (typeof val === 'string') messages.push(`${label}: ${val}`);
                    }
                }

                warningEl.textContent = messages.join('\n') || e.message || 'Error saving update';
                warningEl.classList.remove('hidden');
            } else {
                ErrorHandler.handle(e);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Save Changes';
            }
        }
    },

    refreshLogisticsStatus(prefix = 'f') {
        const dayEl = document.getElementById(`${prefix}-day`);
        const startEl = document.getElementById(`${prefix}-start`);
        const endEl = document.getElementById(`${prefix}-end`);
        const roomEl = document.getElementById(`${prefix}-room`);
        const profEl = document.getElementById(`${prefix}-prof`);
        const roomStatusEl = document.getElementById(`${prefix}-room-status`);
        const profStatusEl = document.getElementById(`${prefix}-prof-status`);

        if (!startEl || !endEl) return;

        const day = dayEl ? dayEl.value : (this.state.activeSlotId ? this.state.sectionSchedule.find(s => s.id === this.state.activeSlotId)?.day : null);
        const start = startEl.value;
        const end = endEl.value;

        if (!day || !start || !end) return;

        const { busyProfs, busyRooms } = this.checkAvailability(day, start, end, this.state.activeSlotId);

        // Update Room Select with enhanced display
        if (roomEl) {
            const selectedRoom = roomEl.value;
            let availableCount = 0;
            let busyCount = 0;

            Array.from(roomEl.options).forEach(opt => {
                const roomName = opt.value;
                if (!roomName) return;

                const conflict = busyRooms[roomName];
                const roomInfo = this.state.rooms.find(r => r.name === roomName);

                if (conflict) {
                    busyCount++;
                    const baseInfo = roomInfo ? `${roomName} (${roomInfo.room_type}, Cap: ${roomInfo.capacity})` : roomName;
                    opt.textContent = `🔴 ${baseInfo} - BUSY: ${conflict.subject_code} (${conflict.section_name})`;
                    opt.style.color = '#dc2626';
                    opt.style.fontWeight = 'bold';
                } else {
                    availableCount++;
                    const baseInfo = roomInfo ? `${roomName} (${roomInfo.room_type}, Cap: ${roomInfo.capacity})` : roomName;
                    opt.textContent = `🟢 ${baseInfo} - Available`;
                    opt.style.color = '#16a34a';
                    opt.style.fontWeight = 'normal';
                }
            });

            // Update status indicator
            if (roomStatusEl) {
                if (selectedRoom && busyRooms[selectedRoom]) {
                    roomStatusEl.textContent = '⚠️ Selected room is busy';
                    roomStatusEl.className = 'text-xs font-bold text-red-600';
                } else {
                    roomStatusEl.textContent = `${availableCount} available, ${busyCount} busy`;
                    roomStatusEl.className = 'text-xs font-normal text-gray-500';
                }
            }
        }

        // Update Professor Select with enhanced display
        if (profEl) {
            const selectedProf = profEl.value;
            let availableCount = 0;
            let busyCount = 0;

            Array.from(profEl.options).forEach(opt => {
                const profId = opt.value;
                if (!profId) return;

                const conflict = busyProfs[profId];
                const profName = opt.getAttribute('data-name') || opt.text.split(' (')[0].split(' - ')[0].replace(/^🔴 |^🟢 /, '');

                if (conflict) {
                    busyCount++;
                    opt.textContent = `🔴 ${profName} - BUSY: ${conflict.subject_code} (${conflict.section_name})`;
                    opt.style.color = '#dc2626';
                    opt.style.fontWeight = 'bold';
                } else {
                    availableCount++;
                    opt.textContent = `🟢 ${profName} - Available`;
                    opt.style.color = '#16a34a';
                    opt.style.fontWeight = 'normal';
                }
            });

            // Update status indicator
            if (profStatusEl) {
                if (selectedProf && busyProfs[selectedProf]) {
                    profStatusEl.textContent = '⚠️ Selected professor is busy';
                    profStatusEl.className = 'text-xs font-bold text-red-600';
                } else {
                    profStatusEl.textContent = `${availableCount} available, ${busyCount} busy`;
                    profStatusEl.className = 'text-xs font-normal text-gray-500';
                }
            }
        }
    },

    checkAvailability(day, startTime, endTime, excludeSlotId = null) {
        if (!day || !startTime || !endTime || !this.state.globalSchedule) return { professors: {}, rooms: {} };

        const parseTime = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };

        const start = parseTime(startTime);
        const end = parseTime(endTime);

        const busyProfs = {};
        const busyRooms = {};

        this.state.globalSchedule.forEach(slot => {
            if (slot.id === excludeSlotId) return;
            if (slot.day !== day) return;

            const slotStart = parseTime(slot.start_time);
            const slotEnd = parseTime(slot.end_time);

            // Overlap: max(start1, start2) < min(end1, end2)
            if (Math.max(start, slotStart) < Math.min(end, slotEnd)) {
                if (slot.professor) busyProfs[slot.professor] = slot;
                if (slot.room) busyRooms[slot.room] = slot;
            }
        });

        return { busyProfs, busyRooms };
    },

    showFieldError(id, message) {
        const input = document.getElementById(id);
        const errorDiv = document.getElementById(`error-${id}`) || this.createErrorDiv(id);

        if (input) {
            input.classList.add('border-red-500', 'bg-red-50', 'ring-red-50');
            input.classList.remove('border-gray-200', 'bg-gray-50');
        }

        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    },

    clearFormErrors(fieldIds) {
        fieldIds.forEach(id => {
            const input = document.getElementById(id);
            const errorDiv = document.getElementById(`error-${id}`);

            if (input) {
                input.classList.remove('border-red-500', 'bg-red-50', 'ring-red-50');
                input.classList.add('border-gray-200', 'bg-gray-50');
            }

            if (errorDiv) {
                errorDiv.classList.add('hidden');
            }
        });
    },

    createErrorDiv(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return null;

        const div = document.createElement('div');
        div.id = `error-${inputId}`;
        div.className = 'text-[10px] font-bold text-red-500 mt-1 animate-in fade-in slide-in-from-top-1';
        input.parentNode.appendChild(div);
        return div;
    }
};
