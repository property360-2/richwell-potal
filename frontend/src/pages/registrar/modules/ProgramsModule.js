import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';
import { UI } from '../../../components/UI.js';
import { Validator } from '../../../utils/validation.js';
import { debounce } from '../../../utils.js';

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
        window.closeProgramDetails = () => this.closeProgramDetails();
        window.openAddCurriculumModal = (programId) => this.openAddCurriculumModal(programId);
        window.setProgramDetailTab = (tab) => this.setProgramDetailTab(tab);
        window.viewCurriculumStructure = (id, code) => this.viewCurriculumStructure(id, code);
        window.openAddSubjectModal = (programId) => this.openAddSubjectModal(programId);
        window.handleProgramSubjectSearch = (query) => this.handleProgramSubjectSearch(query);
        window.handleProgramSubjectSort = (key) => this.handleProgramSubjectSort(key);
        window.handlePrerequisiteSearch = (query) => this.handlePrerequisiteSearch(query);
        window.addPrerequisite = (id, code) => this.addPrerequisite(id, code);
        window.removePrerequisite = (id) => this.removePrerequisite(id);
        window.toggleSubjectGrouping = (checked) => this.toggleSubjectGrouping(checked);
        window.checkSubjectCode = (code) => this.checkSubjectCode(code);
        window.openAddCurriculumSubjectModal = (curId, year, sem) => this.openAddCurriculumSubjectModal(curId, year, sem);
        window.handleCurriculumSubjectRemove = (curId, subId, code) => this.handleCurriculumSubjectRemove(curId, subId, code);
        window.handleSearchCurSub = (query) => this.handleSearchCurSub(query);
        window.selectCurriculumSubject = (curId, subId, code, year, sem) => this.selectCurriculumSubject(curId, subId, code, year, sem);
        window.handleCurriculumBulkAssign = (curId, year, sem) => this.handleCurriculumBulkAssign(curId, year, sem);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    // --- Rendering Logic ---

    renderProgramsTab() {
        if (this.state.subView === 'program_details' && this.state.activeProgram) {
            return this.renderProgramDetails();
        }
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

    handleProgramSort(key) {
        if (this.state.programSortBy === key) {
            this.state.programSortOrder = this.state.programSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.programSortBy = key;
            this.state.programSortOrder = 'asc';
        }
        this.render();
    },

    async viewProgramDetails(id) {
        const program = this.state.programs.find(p => p.id === id);
        if (!program) return;
        this.state.activeProgram = program;
        this.state.subView = 'program_details';
        this.state.programDetailTab = 'subjects'; // Default tab
        this.state.programSubjectSearch = '';
        this.state.programSubjectSortBy = 'code';
        this.state.programSubjectSortOrder = 'asc';
        this.state.programSubjectGrouped = false; // Add grouping state
        this.state.selectedPrerequisites = []; // Reset selected prereqs
        await Promise.all([this.ctx.loadCurricula(id), this.ctx.loadSubjects(id)]);
        this.render();
    },

    closeProgramDetails() {
        this.state.subView = 'list';
        this.state.activeProgram = null;
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
    },

    renderProgramDetails() {
        const p = this.state.activeProgram;
        const curricula = this.state.activeProgramCurricula || [];
        const activeTab = this.state.programDetailTab || 'subjects';

        return `
            <div class="mb-6">
                ${UI.button({ label: '&larr; Back to Programs', type: 'ghost', size: 'sm', onClick: 'closeProgramDetails()' })}
            </div>
            
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                             <h2 class="text-3xl font-black text-gray-900">${p.name}</h2>
                             <span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs font-black border border-blue-100">${p.code}</span>
                             ${p.is_active ? UI.badge('Active', 'success') : UI.badge('Inactive', 'warning')}
                        </div>
                        <p class="text-gray-500">${p.description || 'No description provided.'}</p>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="flex items-center gap-1 mb-6 bg-gray-100/50 p-1 rounded-xl w-fit">
                <button onclick="setProgramDetailTab('subjects')" 
                        class="px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'subjects' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    Subjects
                </button>
                <button onclick="setProgramDetailTab('curricula')" 
                        class="px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'curricula' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    Curriculums
                </button>
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                ${activeTab === 'subjects' ? this.renderSubjectsTab() : this.renderCurriculaTab()}
            </div>
        `;
    },

    renderSubjectsTab() {
        const subjects = this.state.activeProgramSubjects || [];
        const p = this.state.activeProgram;
        return `
            <div class="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex items-center gap-4">
                    <h3 class="font-bold text-gray-800 uppercase text-xs tracking-widest whitespace-nowrap">Master Subject List</h3>
                    <div class="relative group">
                        <input type="text" id="subj-search" placeholder="Search subjects..." 
                               class="w-64 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-xs"
                               value="${this.state.programSubjectSearch || ''}" 
                               oninput="handleProgramSubjectSearch(this.value)">
                        <svg class="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                        <input type="checkbox" id="group-subjects" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
                               ${this.state.programSubjectGrouped ? 'checked' : ''} 
                               onchange="toggleSubjectGrouping(this.checked)">
                        <label for="group-subjects" class="text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer">Group by Year</label>
                    </div>
                </div>
                ${UI.button({ label: 'Add Subject', size: 'sm', onClick: `openAddSubjectModal('${p.id}')` })}
            </div>
            ${this.state.programSubjectGrouped ? this.renderGroupedSubjects(subjects) : this.renderFlatSubjects(subjects)}
            ${subjects.length === 0 ? '<div class="p-8 text-center text-gray-400 font-medium">No subjects found in this program.</div>' : ''}
        `;
    },

    renderFlatSubjects(subjects) {
        return UI.table({
            headers: [
                { label: 'Subject Name', sortable: true, key: 'title' },
                { label: 'Code & Units', sortable: true, key: 'code' },
                { label: 'Prerequisites' },
                { label: 'Curriculum' },
                { label: 'Category', sortable: true, key: 'classification' },
                { label: 'Year', sortable: true, key: 'year_level' },
                { label: 'Sem', sortable: true, key: 'semester_number' }
            ],
            sortBy: this.state.programSubjectSortBy,
            sortOrder: this.state.programSubjectSortOrder,
            onSort: 'handleProgramSubjectSort',
            rows: subjects.map(s => [
                `<div class="font-bold text-gray-900 leading-tight">${s.title}</div>`,
                `<div class="flex flex-col">
                    <span class="font-mono text-blue-600 font-bold">${s.code}</span>
                    <span class="text-[10px] text-gray-500 font-medium">${s.units} Units</span>
                </div>`,
                `<div class="flex flex-wrap gap-1">
                    ${s.prerequisites && s.prerequisites.length > 0
                    ? s.prerequisites.map(p => `<span class="px-1.5 py-0.5 rounded bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-200">${p.code}</span>`).join('')
                    : '<span class="text-[10px] text-gray-300 italic">None</span>'
                }
                </div>`,
                `<div class="flex flex-wrap gap-1">
                    ${s.curriculum_codes && s.curriculum_codes.length > 0
                    ? s.curriculum_codes.map(c => `<span class="px-1.5 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-700 border border-blue-100">${c}</span>`).join('')
                    : '<span class="text-[10px] text-gray-400 font-medium">Standard</span>'
                }
                </div>`,
                `<span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${this.getClassificationStyle(s.classification)}">
                    ${s.classification_display || s.classification || 'MINOR'}
                </span>`,
                `<div class="bg-gray-100 text-gray-700 text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center">Y${s.year_level}</div>`,
                `<div class="bg-gray-100 text-gray-700 text-[10px] font-black w-6 h-6 rounded-lg flex items-center justify-center">S${s.semester_number}</div>`
            ])
        });
    },

    renderGroupedSubjects(subjects) {
        const grouped = {};
        subjects.forEach(s => {
            const key = `Year ${s.year_level}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(s);
        });

        return Object.entries(grouped).sort().map(([year, yearSubjects]) => {
            // Further group by semester
            const semGrouped = {};
            yearSubjects.forEach(s => {
                const semKey = `Semester ${s.semester_number}`;
                if (!semGrouped[semKey]) semGrouped[semKey] = [];
                semGrouped[semKey].push(s);
            });

            return `
                <div class="p-6 bg-gray-50/30 border-b border-gray-100">
                    <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span class="w-8 h-px bg-gray-200"></span> ${year} <span class="flex-1 h-px bg-gray-200"></span>
                    </h4>
                    <div class="grid grid-cols-1 gap-6">
                        ${Object.entries(semGrouped).sort().map(([sem, semSubjects]) => `
                            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                    <div class="text-[10px] font-black text-blue-600 uppercase tracking-widest">${sem}</div>
                                    <div class="text-[10px] font-bold text-gray-400">${semSubjects.length} Subjects</div>
                                </div>
                                <div class="p-0">
                                    ${UI.table({
                headers: ['Subject Detail', 'Curriculum', 'Category'],
                rows: semSubjects.map(s => [
                    `<div class="flex items-center gap-4">
                                                <div class="flex flex-col">
                                                    <div class="font-bold text-gray-900 text-sm">${s.title}</div>
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-mono text-blue-600 font-bold text-xs">${s.code}</span>
                                                        <span class="text-[10px] text-gray-400">${s.units} Units</span>
                                                    </div>
                                                </div>
                                            </div>`,
                    `<div class="flex flex-wrap gap-1">
                                                ${(s.curriculum_codes || []).map(c => `<span class="px-1.5 py-0.5 rounded bg-blue-50 text-[9px] font-bold text-blue-600 border border-blue-100">${c}</span>`).join('') || '<span class="text-[10px] text-gray-300">Standard</span>'}
                                            </div>`,
                    `<span class="px-2 py-0.5 rounded bg-gray-50 text-[9px] font-black uppercase tracking-wider ${this.getClassificationStyle(s.classification)}">
                                                ${s.classification_display || s.classification}
                                            </span>`
                ])
            })}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderCurriculaTab() {
        const p = this.state.activeProgram;
        const curricula = this.state.activeProgramCurricula || [];
        return `
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 class="font-bold text-gray-800 uppercase text-xs tracking-widest">Curriculum History</h3>
                ${UI.button({ label: 'Create Curriculum', size: 'sm', onClick: `openAddCurriculumModal('${p.id}')` })}
            </div>
            ${UI.table({
            headers: ['Version', 'Academic Year', 'Status', 'Subjects', 'Actions'],
            rows: curricula.map(c => [
                `<span class="font-mono font-bold text-blue-600">${c.code}</span>`,
                c.effective_year || 'N/A',
                c.is_active ? UI.badge('Active', 'success') : UI.badge('Archived', 'default'),
                `${c.total_subjects || 0} Subjects`,
                UI.button({ label: 'View Structure', size: 'xs', type: 'secondary', onClick: `viewCurriculumStructure('${c.id}', '${c.code}')` })
            ])
        })}
            ${curricula.length === 0 ? '<div class="p-8 text-center text-gray-400 font-medium">No curricula found for this program.</div>' : ''}
        `;
    },

    setProgramDetailTab(tab) {
        this.state.programDetailTab = tab;
        this.render();
    },

    async handleProgramSubjectSearch(query) {
        this.state.programSubjectSearch = query;
        if (!this.debouncedSubjectLoad) {
            this.debouncedSubjectLoad = debounce(async () => {
                await this.ctx.loadSubjects(this.state.activeProgram.id);
                this.render();
                const el = document.getElementById('subj-search');
                if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
            }, 300);
        }
        this.debouncedSubjectLoad();
    },

    async handleProgramSubjectSort(key) {
        if (this.state.programSubjectSortBy === key) {
            this.state.programSubjectSortOrder = this.state.programSubjectSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.programSubjectSortBy = key;
            this.state.programSubjectSortOrder = 'asc';
        }
        await this.ctx.loadSubjects(this.state.activeProgram.id);
        this.render();
    },

    toggleSubjectGrouping(checked) {
        this.state.programSubjectGrouped = checked;
        this.render();
    },

    async viewCurriculumStructure(id, code) {
        try {
            const data = await this.ctx.service.loadCurriculumStructure(id);
            const structure = data.structure || {};
            const program = this.state.activeProgram;

            // Use program duration to show all years, or fall back to keys in structure
            const yearLevels = program?.duration_years
                ? Array.from({ length: program.duration_years }, (_, i) => i + 1)
                : Object.keys(structure).sort((a, b) => a - b);

            const modal = new Modal({
                title: `Structure: ${code}`,
                size: 'xl',
                content: `
                    <div class="space-y-8 p-4 max-h-[70vh] overflow-y-auto custom-scrollbar" id="curriculum-structure-content">
                        ${yearLevels.map(year => {
                    const semesters = structure[year] || {};
                    return `
                                <div class="border-b border-gray-100 pb-6 last:border-0">
                                    <h4 class="text-sm font-black text-blue-600 uppercase tracking-widest mb-4">YEAR ${year}</h4>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        ${[1, 2].map(semNum => { // Only show 1st and 2nd by default, Summer (3) handled below if needed
                        const subjects = semesters[semNum] || [];
                        return this.renderStructureSemester(id, year, semNum, subjects);
                    }).join('')}
                                        ${semesters[3]?.length || program?.duration_years ? this.renderStructureSemester(id, year, 3, semesters[3] || []) : ''}
                                    </div>
                                </div>
                            `;
                }).join('')}
                        ${yearLevels.length === 0 ? '<div class="text-center py-20 text-gray-400">No years defined for this program duration</div>' : ''}
                    </div>
                `,
                actions: [{ label: 'Close', onClick: (m) => m.close() }]
            });
            modal.show();
            this.activeStructureModal = modal;
        } catch (e) { ErrorHandler.handle(e); }
    },

    renderStructureSemester(curId, year, semNum, subjects) {
        return `
            <div class="bg-gray-50/50 rounded-xl p-4 border border-gray-100 flex flex-col min-h-[120px]">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        ${semNum === 3 ? 'Summer' : `Semester ${semNum}`}
                    </div>
                    <button onclick="openAddCurriculumSubjectModal('${curId}', ${year}, ${semNum})" 
                            class="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-all group">
                        <svg class="w-3 h-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4"/>
                        </svg>
                    </button>
                </div>
                <div class="space-y-2 flex-1">
                    ${subjects.map(s => `
                        <div class="flex flex-col p-2 bg-white rounded-lg border border-gray-200/50 shadow-sm relative group/item">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-black text-blue-600 text-[10px] tracking-tight">${s.code}</span>
                                <button onclick="handleCurriculumSubjectRemove('${curId}', '${s.id}', '${s.code}')" 
                                        class="opacity-0 group-hover/item:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="text-xs font-bold text-gray-800 line-clamp-1 pr-6" title="${s.title}">${s.title}</div>
                            <div class="mt-1 flex items-center justify-between">
                                <span class="text-[8px] text-gray-400 font-mono uppercase tracking-tighter">${s.units} Units</span>
                                 ${s.is_major ? '<span class="text-[8px] font-black text-indigo-500 uppercase">Major</span>' : ''}
                            </div>
                        </div>
                    `).join('') || '<div class="text-gray-300 italic text-[10px] py-4 text-center h-full flex items-center justify-center">No subjects</div>'}
                </div>
            </div>
        `;
    },

    async openAddCurriculumSubjectModal(curId, year, sem) {
        this.curSubjectContext = { curId, year, sem };

        const modal = new Modal({
            title: `Add Subjects - Y${year} S${sem}`,
            size: 'md',
            content: `
                <div class="space-y-4 p-2">
                    <div class="flex items-center justify-between gap-4 mb-2">
                         <div class="relative flex-1">
                            <input type="text" id="cur-sub-search" placeholder="Filter by code or title..." 
                                   class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none"
                                   oninput="handleSearchCurSub(this.value)">
                        </div>
                        <div class="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">
                            Y${year} S${sem} Filter
                        </div>
                    </div>
                    <div id="cur-sub-results" class="space-y-2 max-h-80 overflow-y-auto custom-scrollbar p-1">
                        <div class="flex items-center justify-center py-12">
                             <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    </div>
                </div>
            `,
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Assign Selected',
                    primary: true,
                    onClick: async (m) => await this.handleCurriculumBulkAssign(curId, year, sem)
                }
            ]
        });

        modal.show();
        this.activeCurSearchModal = modal;

        // Initial load based on subject's year and sem
        try {
            const results = await this.ctx.service.loadSubjects({
                year_level: year,
                semester_number: sem,
                program: this.state.activeProgram.id // Only subjects from this program
            });
            this.state.availableCurSubjects = results;
            this.renderCurSubResults(results);
        } catch (e) {
            document.getElementById('cur-sub-results').innerHTML = '<div class="text-center py-8 text-red-400 text-xs font-bold">Failed to load subjects</div>';
        }
    },

    renderCurSubResults(subjects) {
        const resultsEl = document.getElementById('cur-sub-results');
        if (!resultsEl) return;

        resultsEl.innerHTML = subjects.map(s => `
            <label class="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/10 transition-all group cursor-pointer">
                <div class="flex items-center gap-3">
                    <div class="relative flex items-center">
                        <input type="checkbox" name="cur-sub-check" value="${s.id}" data-code="${s.code}"
                               class="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 transition-all">
                    </div>
                    <div class="flex flex-col">
                        <div class="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">${s.title}</div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">${s.code}</span>
                            <span class="text-[10px] text-gray-400 font-medium">${s.units} Units</span>
                        </div>
                    </div>
                </div>
            </label>
        `).join('') || '<div class="text-center py-12 text-gray-400 text-xs italic">No matching subjects found for this year level and semester</div>';
    },

    async handleSearchCurSub(query) {
        if (!this.state.availableCurSubjects) return;

        const filtered = this.state.availableCurSubjects.filter(s =>
            s.title.toLowerCase().includes(query.toLowerCase()) ||
            s.code.toLowerCase().includes(query.toLowerCase())
        );

        this.renderCurSubResults(filtered);
    },

    async handleCurriculumBulkAssign(curId, year, sem) {
        const checkboxes = document.querySelectorAll('input[name="cur-sub-check"]:checked');
        if (checkboxes.length === 0) {
            Toast.error('Please select at least one subject');
            return;
        }

        const assignments = Array.from(checkboxes).map(cb => ({
            subject_id: cb.value,
            year_level: year,
            semester_number: sem,
            is_required: true
        }));

        try {
            await this.ctx.service.assignCurriculumSubjects(curId, assignments);
            Toast.success(`${assignments.length} subjects assigned successfully`);
            if (this.activeCurSearchModal) this.activeCurSearchModal.close();

            // Refresh structure
            const curriculum = this.state.activeProgramCurricula?.find(c => c.id === curId);
            if (this.activeStructureModal) {
                this.activeStructureModal.close();
                this.viewCurriculumStructure(curId, curriculum?.code || 'Updated');
            }
        } catch (e) { ErrorHandler.handle(e); }
    },

    async selectCurriculumSubject(curId, subId, code, year, sem) {
        // ... kept for fallback if needed, but not used by UI anymore
        try {
            await this.ctx.service.assignCurriculumSubjects(curId, [
                {
                    subject_id: subId,
                    year_level: year,
                    semester_number: sem,
                    is_required: true
                }
            ]);
            Toast.success(`${code} assigned to Year ${year} Semester ${sem}`);
            if (this.activeCurSearchModal) this.activeCurSearchModal.close();

            const curriculum = this.state.activeProgramCurricula?.find(c => c.id === curId);
            if (this.activeStructureModal) {
                this.activeStructureModal.close();
                this.viewCurriculumStructure(curId, curriculum?.code || 'Updated');
            }
        } catch (e) { ErrorHandler.handle(e); }
    },

    async handleCurriculumSubjectRemove(curId, subId, code) {
        if (!await ConfirmModal({
            title: 'Remove Assignment',
            message: `Are you sure you want to remove ${code} from this curriculum?`,
            danger: true,
            confirmLabel: 'Remove'
        })) return;

        try {
            await this.ctx.service.removeCurriculumSubject(curId, subId);
            Toast.success(`${code} removed from curriculum`);

            // Refresh structure modal
            const curriculum = this.state.activeProgramCurricula?.find(c => c.id === curId);
            if (this.activeStructureModal) {
                this.activeStructureModal.close();
                this.viewCurriculumStructure(curId, curriculum?.code || 'Updated');
            }
        } catch (e) { ErrorHandler.handle(e); }
    },

    openAddCurriculumModal(programId) {
        const modal = new Modal({
            title: 'Create New Curriculum',
            content: this.getCurriculumForm(),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Curriculum', primary: true,
                    onClick: async (m) => await this.handleCurriculumSubmit(m, programId)
                }
            ]
        });
        modal.show();
    },

    getCurriculumForm() {
        const currentYear = new Date().getFullYear();
        return `
            <form id="curriculum-form" class="space-y-6 p-2">
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({ label: 'Curriculum Code', id: 'c-code', placeholder: 'e.g. BSIT-2026-V1', required: true })}
                    ${UI.field({ label: 'Effective Year', id: 'c-year', type: 'number', value: currentYear, required: true })}
                </div>
                ${UI.field({ label: 'Curriculum Name', id: 'c-name', placeholder: 'e.g. BSIT Revision 2026', required: true })}
                ${UI.field({ label: 'Description', id: 'c-desc', type: 'textarea', placeholder: 'Brief description of this version...' })}
                
                <div class="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <input type="checkbox" id="c-active" checked class="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500">
                    <div>
                        <div class="font-bold text-gray-800 text-sm">Active for New Enrollees</div>
                        <div class="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">Controls if students can be assigned to this version</div>
                    </div>
                </div>
            </form>
        `;
    },

    async handleCurriculumSubmit(modal, programId) {
        const data = {
            program: programId,
            code: document.getElementById('c-code').value.toUpperCase(),
            name: document.getElementById('c-name').value,
            effective_year: parseInt(document.getElementById('c-year').value),
            description: document.getElementById('c-desc').value,
            is_active: document.getElementById('c-active').checked
        };

        const { isValid, errors } = Validator.validate(data, {
            code: [Validator.required, Validator.minLength(3)],
            name: [Validator.required, Validator.minLength(5)],
            effective_year: [Validator.required]
        });

        if (!isValid) {
            Toast.error(Object.values(errors)[0]);
            return;
        }

        try {
            await api.post(endpoints.curricula, data);
            Toast.success('Curriculum version created');
            modal.close();
            await this.ctx.loadCurricula(programId);
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    openAddSubjectModal(programId) {
        const modal = new Modal({
            title: 'Create New Subject',
            content: this.getSubjectForm(),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Create Subject', primary: true,
                    onClick: async (m) => await this.handleSubjectSubmit(m, programId)
                }
            ]
        });
        modal.show();
    },

    getSubjectForm() {
        const selectedHTML = this.state.selectedPrerequisites.map(p => `
            <div class="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 text-[10px] font-bold text-amber-700">
                ${p.code}
                <button type="button" onclick="removePrerequisite('${p.id}')" class="hover:text-amber-900 ml-1">×</button>
            </div>
        `).join('') || '<div class="text-[10px] text-gray-400 italic">No prerequisites selected</div>';

        return `
            <form id="subject-form" class="space-y-6 p-2">
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({
            label: 'Subject Code', id: 's-code', placeholder: 'e.g. CS101', required: true,
            attrs: 'oninput="checkSubjectCode(this.value)"'
        })}
                    ${UI.field({ label: 'Units', id: 's-units', type: 'number', value: 3, required: true })}
                </div>
                <div id="code-warning" class="hidden -mt-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[10px] font-bold flex items-center gap-2">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/></svg>
                    Subject code already exists in the system
                </div>
                ${UI.field({ label: 'Subject Title', id: 's-title', placeholder: 'e.g. Introduction to Computing', required: true })}
                ${UI.field({ label: 'Description', id: 's-desc', type: 'textarea', placeholder: 'Subject description...' })}
                
                <div class="grid grid-cols-2 gap-6">
                    ${UI.field({
            label: 'Year Level', id: 's-year', type: 'select',
            options: [
                { label: 'Year 1', value: 1 },
                { label: 'Year 2', value: 2 },
                { label: 'Year 3', value: 3 },
                { label: 'Year 4', value: 4 },
                { label: 'Year 5', value: 5 }
            ]
        })}
                    ${UI.field({
            label: 'Semester', id: 's-sem', type: 'select',
            options: [
                { label: '1st Semester', value: 1 },
                { label: '2nd Semester', value: 2 },
                { label: 'Summer', value: 3 }
            ]
        })}
                    ${UI.field({
            label: 'Classification', id: 's-class', type: 'select',
            options: [
                { label: 'Major Subject', value: 'MAJOR' },
                { label: 'Minor Subject', value: 'MINOR' }
            ]
        })}
                </div>

                <div class="space-y-3 p-4 bg-amber-50/30 rounded-2xl border border-amber-100">
                    <label class="block text-[11px] font-black text-amber-600 uppercase tracking-widest ml-1">Prerequisites</label>
                    <div class="relative">
                        <input type="text" id="prereq-search" placeholder="Search and add prerequisites..." 
                               class="w-full px-4 py-2 bg-white border border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 transition-all text-xs outline-none"
                               oninput="handlePrerequisiteSearch(this.value)">
                        <div id="prereq-results" class="hidden absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar"></div>
                    </div>
                    <div class="flex flex-wrap gap-2 pt-1">
                        ${selectedHTML}
                    </div>
                </div>

                <div class="flex items-center gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <input type="checkbox" id="s-global" class="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500">
                    <div>
                        <div class="font-bold text-blue-800 text-sm">Global Subject</div>
                        <div class="text-[10px] text-blue-600 uppercase font-black tracking-widest mt-0.5">Toggle to share this subject with ALL programs</div>
                    </div>
                </div>
            </form>
        `;
    },

    async handlePrerequisiteSearch(query) {
        const resultsEl = document.getElementById('prereq-results');
        if (!query || query.length < 2) {
            resultsEl.classList.add('hidden');
            return;
        }

        const subjects = await this.ctx.service.loadSubjects({ search: query });
        const existingIds = this.state.selectedPrerequisites.map(p => p.id);
        const filtered = subjects.filter(s => !existingIds.includes(s.id));

        if (filtered.length === 0) {
            resultsEl.innerHTML = '<div class="p-3 text-center text-gray-400 text-[10px]">No subjects found</div>';
        } else {
            resultsEl.innerHTML = filtered.map(s => `
                <button type="button" onclick="addPrerequisite('${s.id}', '${s.code}')" 
                        class="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors border-b border-gray-50 last:border-0 group">
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-gray-700 text-xs">${s.code}</span>
                        <span class="text-[10px] text-gray-400 group-hover:text-amber-600">Click to add</span>
                    </div>
                    <div class="text-[10px] text-gray-400 truncate">${s.title}</div>
                </button>
            `).join('');
        }
        resultsEl.classList.remove('hidden');
    },

    async checkSubjectCode(code) {
        if (!code || code.length < 2) {
            this.hideCodeWarning();
            return;
        }

        if (!this.debouncedCodeCheck) {
            this.debouncedCodeCheck = debounce(async (val) => {
                const isDuplicate = await this.ctx.service.checkSubjectCodeDuplicate(val);
                if (isDuplicate) {
                    this.showCodeWarning();
                } else {
                    this.hideCodeWarning();
                }
            }, 500);
        }
        this.debouncedCodeCheck(code);
    },

    showCodeWarning() {
        const warning = document.getElementById('code-warning');
        const input = document.getElementById('s-code');
        const submitBtn = document.querySelector('button[data-primary="true"]');

        if (warning) warning.classList.remove('hidden');
        if (input) input.classList.add('border-red-400', 'bg-red-50/50');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    },

    hideCodeWarning() {
        const warning = document.getElementById('code-warning');
        const input = document.getElementById('s-code');
        const submitBtn = document.querySelector('button[data-primary="true"]');

        if (warning) warning.classList.add('hidden');
        if (input) input.classList.remove('border-red-400', 'bg-red-50/50');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    },

    addPrerequisite(id, code) {
        this.state.selectedPrerequisites.push({ id, code });
        const resultsEl = document.getElementById('prereq-results');
        const searchInput = document.getElementById('prereq-search');
        resultsEl.classList.add('hidden');
        searchInput.value = '';

        // Update modal content without full re-render
        const form = document.getElementById('subject-form');
        const modalContent = document.querySelector('.modal-content'); // This might differ based on how Modal is implemented
        // But the best way is to manually update the tags container
        this.updatePrerequisiteTags();
    },

    removePrerequisite(id) {
        this.state.selectedPrerequisites = this.state.selectedPrerequisites.filter(p => p.id !== id);
        this.updatePrerequisiteTags();
    },

    updatePrerequisiteTags() {
        const container = document.querySelector('#subject-form .flex-wrap');
        if (container) {
            container.innerHTML = this.state.selectedPrerequisites.map(p => `
                <div class="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200 text-[10px] font-bold text-amber-700 animate-in fade-in zoom-in duration-200">
                    ${p.code}
                    <button type="button" onclick="removePrerequisite('${p.id}')" class="hover:text-amber-900 ml-1">×</button>
                </div>
            `).join('') || '<div class="text-[10px] text-gray-400 italic">No prerequisites selected</div>';
        }
    },

    async handleSubjectSubmit(modal, programId) {
        const isGlobal = document.getElementById('s-global').checked;

        const data = {
            program: programId,
            code: document.getElementById('s-code').value.toUpperCase(),
            title: document.getElementById('s-title').value,
            units: parseInt(document.getElementById('s-units').value),
            description: document.getElementById('s-desc').value,
            year_level: parseInt(document.getElementById('s-year').value),
            semester_number: parseInt(document.getElementById('s-sem').value),
            classification: document.getElementById('s-class').value,
            program_ids: isGlobal ? this.state.programs.map(p => p.id) : [programId],
            prerequisite_ids: this.state.selectedPrerequisites.map(p => p.id)
        };

        const { isValid, errors } = Validator.validate(data, {
            code: [Validator.required, Validator.minLength(2)],
            title: [Validator.required, Validator.minLength(5)],
            units: [Validator.required]
        });

        if (!isValid) {
            Toast.error(Object.values(errors)[0]);
            return;
        }

        try {
            await api.post(endpoints.manageSubjects, data);
            Toast.success(isGlobal ? 'Global subject created' : 'Subject created');
            modal.close();
            await this.ctx.loadSubjects(programId);
            this.render();
        } catch (e) { ErrorHandler.handle(e); }
    },

    getClassificationStyle(cls) {
        const styles = {
            'MAJOR': 'bg-indigo-50 text-indigo-700 border border-indigo-100',
            'MINOR': 'bg-gray-50 text-gray-700 border border-gray-200'
        };
        return styles[cls] || styles['MINOR'];
    }
};
