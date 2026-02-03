import { createHeader } from '../../../components/header.js';
import { formatCurrency } from '../../../utils.js';

export const EnrollmentUI = {
    init(ctx) {
        this.ctx = ctx;
        window.handleYearFilterChange = (v) => this.handleYearFilterChange(v);
        window.handleSemesterFilterChange = (v) => this.handleSemesterFilterChange(v);
        window.clearFilters = () => this.clearFilters();
        window.enrollSubject = (id) => this.enrollSubject(id);
        window.removeFromCart = (id) => this.ctx.cart.removeFromCart(id);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },
    get subjects() { return this.ctx.subjects; },
    get cart() { return this.ctx.cart; },

    renderAdmissionPending() {
        return `
            <div class="max-w-2xl mx-auto mt-12 p-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <div class="text-center">
                <svg class="mx-auto h-16 w-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h2 class="mt-4 text-2xl font-bold text-gray-900">Account Pending Admission Approval</h2>
                <p class="mt-3 text-gray-700">Your enrollment application is being reviewed by the Admission Office.</p>
                <div class="mt-6">
                  <a href="/student-dashboard.html" class="btn btn-primary">Back to Dashboard</a>
                </div>
              </div>
            </div>
        `;
    },

    renderEnrolledView() {
        return `
            <div class="mb-8">
              <h1 class="text-3xl font-bold text-gray-800">Your Enrolled Subjects</h1>
              <p class="text-gray-600 mt-1">Currently enrolled for this semester</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Subject</th>
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Section</th>
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Professor</th>
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Units</th>
                      <th class="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    ${this.state.enrolledSubjects.map(s => `
                        <tr>
                            <td class="px-6 py-4">
                                <div class="text-sm font-bold text-gray-900">${s.subject_code}</div>
                                <div class="text-[10px] text-gray-500">${s.subject_title}</div>
                            </td>
                            <td class="px-6 py-4 text-sm">${s.section_name}</td>
                            <td class="px-6 py-4 text-sm">${s.professor || 'TBA'}</td>
                            <td class="px-6 py-4 text-sm font-bold">${s.units}</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${s.payment_approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                                    ${s.approval_status_display}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                  </tbody>
                </table>
            </div>
        `;
    },

    renderEnrollmentBuilder() {
        const filteredAvailable = this.state.availableSubjects.filter(s =>
            !this.state.recommendedSubjects.find(r => r.id === s.id)
        );

        return `
            <div class="mb-8 flex justify-between items-center">
              <div>
                <h1 class="text-3xl font-bold text-gray-800">Subject Enrollment</h1>
                <p class="text-gray-600 mt-1">Select subjects for the current semester</p>
              </div>
            </div>

            ${this.renderUnitCounter()}
            ${this.renderFilters()}

            <div class="space-y-8">
                <section>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-800">Recommended Subjects</h2>
                        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">${this.state.recommendedSubjects.length} Available</span>
                    </div>
                    ${this.subjects.renderCategorizedSubjects(
            this.subjects.groupSubjectsByYearAndSemester(this.state.recommendedSubjects),
            true, 'recommended'
        )}
                </section>

                <section>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-bold text-gray-800">All Available Subjects</h2>
                        <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">${filteredAvailable.length} Available</span>
                    </div>
                    ${this.subjects.renderCategorizedSubjects(
            this.subjects.groupSubjectsByYearAndSemester(filteredAvailable),
            false, 'available'
        )}
                </section>
            </div>

            ${this.renderFloatingCartButton()}
        `;
    },

    renderUnitCounter() {
        const currentUnits = this.cart.getTotalUnits();
        const percentage = (currentUnits / this.state.maxUnits) * 100;
        return `
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-blue-600 rounded-lg text-white">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <div>
                            <span class="font-bold text-gray-800">Enrollment Units</span>
                            <p class="text-[11px] text-gray-500 uppercase tracking-widest font-black">Limit: ${this.state.maxUnits} Units</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="text-3xl font-black text-blue-600">${currentUnits}</span>
                        <span class="text-xs text-gray-400 font-bold">/ ${this.state.maxUnits}</span>
                    </div>
                </div>
                <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-blue-600 h-full transition-all duration-500" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div>
                    <label class="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Year Level</label>
                    <select onchange="handleYearFilterChange(this.value)" class="form-select text-sm h-11">
                        <option value="">All Years</option>
                        ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${this.state.filters.yearLevel === y ? 'selected' : ''}>Year ${y}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Semester</label>
                    <select onchange="handleSemesterFilterChange(this.value)" class="form-select text-sm h-11">
                        <option value="">All Semesters</option>
                        <option value="1" ${this.state.filters.semester === 1 ? 'selected' : ''}>1st Semester</option>
                        <option value="2" ${this.state.filters.semester === 2 ? 'selected' : ''}>2nd Semester</option>
                        <option value="3" ${this.state.filters.semester === 3 ? 'selected' : ''}>Summer</option>
                    </select>
                </div>
                <div class="flex items-end">
                    <button onclick="clearFilters()" class="h-11 w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Clear Filters
                    </button>
                </div>
            </div>
        `;
    },

    renderFloatingCartButton() {
        if (this.state.cart.length === 0) return '';
        return `
            <button onclick="openCartModal()" class="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 z-50 flex items-center gap-3">
                <div class="relative">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    <span class="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">${this.state.cart.length}</span>
                </div>
                <span class="font-bold text-sm pr-2">Review Enrollment</span>
            </button>
        `;
    },

    handleYearFilterChange(v) {
        this.state.filters.yearLevel = v ? parseInt(v) : null;
        this.ctx.loadData().then(() => this.render());
    },

    handleSemesterFilterChange(v) {
        this.state.filters.semester = v ? parseInt(v) : null;
        this.ctx.loadData().then(() => this.render());
    },

    clearFilters() {
        this.state.filters = { yearLevel: null, semester: null };
        this.ctx.loadData().then(() => this.render());
    },

    enrollSubject(subjectId) {
        const select = document.getElementById(`section-select-${subjectId}`);
        if (!select || !select.value) {
            Toast.error('Please select a section first');
            return;
        }

        const subject = this.state.recommendedSubjects.find(s => s.id === subjectId) ||
            this.state.availableSubjects.find(s => s.id === subjectId);
        const section = subject.sections.find(sec => sec.id === select.value);

        if (this.cart.addToCart(subject, section)) {
            this.render();
        }
    }
};
