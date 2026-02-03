import { api, endpoints } from '../../../api.js';
import { Toast } from '../../../components/Toast.js';
import { ErrorHandler } from '../../../utils/errorHandler.js';
import { Modal, ConfirmModal } from '../../../components/Modal.js';

/**
 * Programs Module for Registrar Academic Page
 * Handles rendering and logic for the Programs tab
 */
export const ProgramsModule = {
    init(ctx) {
        this.ctx = ctx;
        const { state, render } = ctx;

        // Register Global Handlers
        window.handleProgramSearch = (query) => this.handleProgramSearch(query);
        window.handleProgramSort = (key) => this.handleProgramSort(key);
        window.viewProgramDetails = (programId) => this.viewProgramDetails(programId);
        window.switchProgramDetailTab = (tab) => this.switchProgramDetailTab(tab);
        window.handleProgramSubjectSearch = (query) => this.handleProgramSubjectSearch(query);
        window.handleProgramSubjectSort = (order) => this.handleProgramSubjectSort(order);
        window.handleProgramSubjectFilter = (c, v) => this.handleProgramSubjectFilter(c, v);
        window.returnToProgramList = () => this.returnToProgramList();
        window.openAddProgramModal = () => this.openAddProgramModal();
        window.openEditProgramModal = (id) => this.openEditProgramModal(id);
        window.deleteProgram = (id) => this.deleteProgram(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    // --- Rendering Logic ---

    getFilteredAndSortedPrograms() {
        let filtered = [...this.state.programs];
        if (this.state.programSearchQuery) {
            const q = this.state.programSearchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.code.toLowerCase().includes(q) ||
                (p.department && p.department.toLowerCase().includes(q))
            );
        }

        const sortKey = this.state.programSortKey || 'name_asc';
        filtered.sort((a, b) => {
            switch (sortKey) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'dept_asc': return (a.department || '').localeCompare(b.department || '');
                case 'dept_desc': return (b.department || '').localeCompare(a.department || '');
                case 'curr_asc': return (a.total_curricula || 0) - (b.total_curricula || 0);
                case 'curr_desc': return (b.total_curricula || 0) - (a.total_curricula || 0);
                default: return a.name.localeCompare(b.name);
            }
        });
        return filtered;
    },

    renderProgramsTab() {
        const programs = this.getFilteredAndSortedPrograms();
        const sortKey = this.state.programSortKey || 'name_asc';

        const getSortIcon = (colKey) => {
            if (sortKey === `${colKey}_asc`) return '▲';
            if (sortKey === `${colKey}_desc`) return '▼';
            return '<span class="text-gray-300">↕</span>';
        };

        const nextSort = (colKey) => sortKey === `${colKey}_asc` ? `${colKey}_desc` : `${colKey}_asc`;

        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 class="text-xl font-bold text-gray-800">Programs</h2>
                <p class="text-sm text-gray-600 mt-1">Academic programs and curriculum tracks</p>
              </div>
              <div class="flex items-center gap-2">
                 <div class="relative">
                    <input type="text" id="prog-search" placeholder="Search programs..." class="form-input text-sm pl-8 w-64"
                           value="${this.state.programSearchQuery || ''}" oninput="handleProgramSearch(this.value)">
                    <svg class="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                 </div>
                 <button onclick="openAddProgramModal()" class="btn btn-primary flex items-center gap-2 whitespace-nowrap">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    Add Program
                 </button>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th onclick="handleProgramSort('${nextSort('name')}')" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none group">
                                    <div class="flex items-center gap-1">Program Name ${getSortIcon('name')}</div>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                                <th onclick="handleProgramSort('${nextSort('dept')}')" class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                                    <div class="flex items-center gap-1">Department ${getSortIcon('dept')}</div>
                                </th>
                                 <th onclick="handleProgramSort('${nextSort('curr')}')" class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                                    <div class="flex items-center justify-center gap-1">Curricula ${getSortIcon('curr')}</div>
                                </th>
                                <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${programs.length === 0 ? `
                                <tr>
                                    <td colspan="5" class="px-6 py-12 text-center">
                                        <p class="text-gray-500 font-medium">No programs found.</p>
                                    </td>
                                </tr>
                            ` : programs.map(program => `
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-bold text-gray-900">${program.name}</div>
                                        ${program.description ? `<div class="text-xs text-gray-500 truncate max-w-[250px]">${program.description}</div>` : ''}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 rounded bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-100">${program.code}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${program.department || '-'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-center">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${program.total_curricula > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                                            ${program.total_curricula || 0}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div class="flex items-center justify-end gap-2">
                                            <button onclick="viewProgramDetails('${program.id}')" class="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors text-xs">View Curricula</button>
                                            <button onclick="openEditProgramModal('${program.id}')" class="text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-1.5 rounded transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                                            <button onclick="deleteProgram('${program.id}')" class="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderProgramDetailsView() {
        const program = this.state.activeProgram;
        if (!program) return this.renderProgramsTab();

        const activeTab = this.state.programDetailTab || 'subjects';

        return `
            <div class="mb-6">
                <button onclick="returnToProgramList()" class="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Back to Programs
                </button>

                <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div>
                        <div class="flex items-center gap-3 mb-2">
                            <h1 class="text-3xl font-bold text-gray-900">${program.code}</h1>
                            ${program.is_active ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>' : '<span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>'}
                        </div>
                        <h2 class="text-xl text-gray-700 font-medium mb-2">${program.name}</h2>
                        <div class="flex gap-6 mt-4">
                            <div class="text-sm"><span class="block text-gray-500">Duration</span><span class="font-semibold text-gray-900">${program.duration_years} Years</span></div>
                            <div class="text-sm"><span class="block text-gray-500">Curricula</span><span class="font-semibold text-gray-900">${this.state.curricula.length} Versions</span></div>
                             <div class="text-sm"><span class="block text-gray-500">Total Subjects</span><span class="font-semibold text-gray-900">${this.state.subjects.length} Subjects</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="border-b border-gray-200 mb-6">
                <nav class="-mb-px flex space-x-8">
                    <button onclick="switchProgramDetailTab('subjects')" class="${activeTab === 'subjects' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Subjects</button>
                    <button onclick="switchProgramDetailTab('curricula')" class="${activeTab === 'curricula' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">Curricula</button>
                </nav>
            </div>

            <div>
                ${activeTab === 'subjects' ? this.renderProgramSubjectsTable() : this.renderProgramCurriculaList()}
            </div>
        `;
    },

    renderProgramSubjectsTable() {
        const subjects = this.getFilteredAndSortedSubjects();
        return `
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                 <h3 class="text-lg font-medium text-gray-900">Program Subjects Masterlist</h3>
                 <div class="flex flex-wrap items-center gap-2">
                    <div class="relative">
                        <input type="text" id="prog-subject-search" placeholder="Search subjects..." class="form-input text-sm pl-8 py-1.5 w-48 lg:w-64"
                            value="${this.state.subjectSearchQuery || ''}" oninput="handleProgramSubjectSearch(this.value)">
                    </div>
                    <select onchange="const [c,v] = this.value.split(':'); handleProgramSubjectFilter(c,v)" class="form-select text-sm py-1.5 w-40">
                        <option value="">All Categories</option>
                        <option value="year_level:1" ${this.state.subjectFilterValue === '1' ? 'selected' : ''}>Year 1</option>
                        <option value="year_level:2" ${this.state.subjectFilterValue === '2' ? 'selected' : ''}>Year 2</option>
                        <option value="year_level:3" ${this.state.subjectFilterValue === '3' ? 'selected' : ''}>Year 3</option>
                        <option value="year_level:4" ${this.state.subjectFilterValue === '4' ? 'selected' : ''}>Year 4</option>
                    </select>
                    <button onclick="openAddSubjectModal()" class="btn btn-primary text-sm whitespace-nowrap px-3">+ Add</button>
                 </div>
            </div>
            <div class="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                             <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Level</th>
                             <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                             <th class="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                             <th class="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Units</th>
                             <th class="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${subjects.map(s => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Y${s.year_level} S${s.semester_number}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">${s.code}</td>
                                <td class="px-6 py-4 text-sm text-gray-900">${s.title}</td>
                                <td class="px-6 py-4 text-center text-sm font-medium">${s.units}</td>
                                <td class="px-6 py-4 text-right text-sm">
                                    <button onclick="openEditSubjectModal('${s.id}')" class="text-indigo-600 mr-2">Edit</button>
                                    <button onclick="deleteSubject('${s.id}')" class="text-red-600">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderProgramCurriculaList() {
        const curriculaByYear = {};
        this.state.curricula.forEach(c => {
            if (!curriculaByYear[c.effective_year]) curriculaByYear[c.effective_year] = [];
            curriculaByYear[c.effective_year].push(c);
        });
        const sortedYears = Object.keys(curriculaByYear).sort().reverse();

        return `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900">Curriculum Versions</h3>
                <button onclick="openAddCurriculumModal()" class="btn btn-primary text-sm">+ Add Curriculum</button>
            </div>
            <div class="space-y-6">
                ${sortedYears.map(year => `
                    <div>
                         <span class="text-xs font-bold text-gray-500 uppercase mb-2 block">Effective ${year}</span>
                         <div class="grid grid-cols-1 gap-3">
                            ${curriculaByYear[year].map(c => `
                                <div class="bg-white border rounded-lg p-4 flex justify-between items-center ${c.is_active ? 'border-l-4 border-l-green-500' : ''}">
                                    <div>
                                        <h4 class="text-lg font-bold">${c.code}</h4>
                                        <div class="text-sm text-gray-500">${c.total_subjects || 0} Subjects | ${c.total_units || 0} Units</div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="viewCurriculum('${c.id}')" class="btn btn-sm btn-secondary">View</button>
                                        <button onclick="deleteCurriculum('${c.id}')" class="text-red-600">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                         </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // --- Handlers ---

    handleProgramSearch(query) {
        this.state.programSearchQuery = query;
        this.render();
        this.restoreFocus('prog-search');
    },

    handleProgramSort(key) {
        this.state.programSortKey = key;
        this.render();
    },

    async viewProgramDetails(programId) {
        const program = this.state.programs.find(p => p.id === programId);
        if (!program) return;
        this.state.activeProgram = program;
        this.state.subView = 'program_details';
        this.state.programDetailTab = this.state.programDetailTab || 'subjects';
        await Promise.all([
            this.ctx.loadCurricula(programId),
            this.ctx.loadSubjects(programId)
        ]);
        this.render();
        window.scrollTo(0, 0);
    },

    switchProgramDetailTab(tab) {
        this.state.programDetailTab = tab;
        this.render();
    },

    handleProgramSubjectSearch(query) {
        this.state.subjectSearchQuery = query;
        this.render();
        this.restoreFocus('prog-subject-search');
    },

    handleProgramSubjectSort(order) {
        this.state.subjectSortOrder = order;
        this.render();
    },

    handleProgramSubjectFilter(category, value) {
        this.state.subjectFilterCategory = category;
        this.state.subjectFilterValue = value;
        this.render();
    },

    returnToProgramList() {
        this.state.subView = 'list';
        this.state.activeProgram = null;
        this.render();
    },

    restoreFocus(id) {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            }
        }, 0);
    },

    getFilteredAndSortedSubjects() {
        let filtered = [...this.state.subjects];
        if (this.state.subjectSearchQuery) {
            const q = this.state.subjectSearchQuery.toLowerCase();
            filtered = filtered.filter(s => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q));
        }
        if (this.state.subjectFilterCategory && this.state.subjectFilterValue) {
            const { subjectFilterCategory: cat, subjectFilterValue: val } = this.state;
            if (cat === 'year_level') filtered = filtered.filter(s => String(s.year_level) === val);
            else if (cat === 'semester') filtered = filtered.filter(s => String(s.semester_number) === val);
        }
        const sortKey = this.state.subjectSortOrder || 'level_asc';
        filtered.sort((a, b) => {
            if (sortKey === 'code_asc') return a.code.localeCompare(b.code);
            if (sortKey === 'code_desc') return b.code.localeCompare(a.code);
            if (a.year_level !== b.year_level) return (a.year_level || 0) - (b.year_level || 0);
            return (a.semester_number || 0) - (b.semester_number || 0);
        });
        return filtered;
    },

    // --- Modal Actions ---

    openAddProgramModal() {
        const modal = new Modal({
            title: 'Add New Program',
            content: this.getProgramForm(),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Add Program',
                    primary: true,
                    onClick: async (m) => {
                        const form = document.getElementById('add-program-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }

                        const data = {
                            code: document.getElementById('add-code').value.toUpperCase(),
                            name: document.getElementById('add-name').value,
                            description: document.getElementById('add-description').value,
                            duration_years: parseInt(document.getElementById('add-duration').value),
                            is_active: document.getElementById('add-active').checked
                        };

                        try {
                            await api.post(endpoints.managePrograms, data);
                            Toast.success('Program added successfully');
                            m.close();
                            await this.ctx.loadPrograms();
                            this.render();
                        } catch (error) {
                            ErrorHandler.handle(error, 'Adding program');
                        }
                    }
                }
            ]
        });
        modal.show();
    },

    openEditProgramModal(programId) {
        const program = this.state.programs.find(p => p.id === programId);
        if (!program) return;

        const modal = new Modal({
            title: 'Edit Program',
            content: this.getProgramForm(program),
            size: 'lg',
            actions: [
                { label: 'Cancel', onClick: (m) => m.close() },
                {
                    label: 'Save Changes',
                    primary: true,
                    onClick: async (m) => {
                        const form = document.getElementById('add-program-form');
                        if (!form.checkValidity()) { form.reportValidity(); return; }

                        const data = {
                            code: document.getElementById('add-code').value.toUpperCase(),
                            name: document.getElementById('add-name').value,
                            description: document.getElementById('add-description').value,
                            duration_years: parseInt(document.getElementById('add-duration').value),
                            is_active: document.getElementById('add-active').checked
                        };

                        try {
                            await api.patch(`${endpoints.managePrograms}${programId}/`, data);
                            Toast.success('Program updated successfully');
                            m.close();
                            await this.ctx.loadPrograms();
                            this.render();
                        } catch (error) {
                            ErrorHandler.handle(error, 'Updating program');
                        }
                    }
                }
            ]
        });
        modal.show();
    },

    deleteProgram(programId) {
        ConfirmModal({
            title: 'Delete Program',
            message: 'Are you sure you want to delete this program? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await api.delete(`${endpoints.managePrograms}${programId}/`);
                    Toast.success('Program deleted successfully');
                    await this.ctx.loadPrograms();
                    this.render();
                } catch (error) {
                    ErrorHandler.handle(error, 'Deleting program');
                }
            }
        });
    },

    getProgramForm(program = null) {
        return `
            <form id="add-program-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Program Code</label>
                        <input type="text" id="add-code" value="${program?.code || ''}" class="form-input" required placeholder="e.g. BSIT">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Duration (Years)</label>
                        <input type="number" id="add-duration" value="${program?.duration_years || 4}" class="form-input" required min="1" max="10">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Program Name</label>
                    <input type="text" id="add-name" value="${program?.name || ''}" class="form-input" required placeholder="e.g. Bachelor of Science in Information Technology">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="add-description" class="form-input" rows="3">${program?.description || ''}</textarea>
                </div>
                <div class="flex items-center">
                    <input type="checkbox" id="add-active" ${program ? (program.is_active ? 'checked' : '') : 'checked'} class="h-4 w-4 text-blue-600 border-gray-300 rounded">
                    <label class="ml-2 block text-sm text-gray-900">Program is Active</label>
                </div>
            </form>
        `;
    }
};
