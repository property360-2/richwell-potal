import { createHeader } from '../../../components/header.js';
import { formatCurrency } from '../../../utils.js';
import { UI } from '../../../components/UI.js';

/**
 * Enrollment UI Module
 * Refactored with Atomic UI Components for Student Portal
 */
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
            <div class="max-w-xl mx-auto mt-20 p-12 bg-white rounded-3xl border border-amber-100 shadow-2xl shadow-amber-500/10 text-center animate-in zoom-in duration-500">
                <div class="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-amber-500/5">
                    <svg class="h-10 w-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                </div>
                <h2 class="text-3xl font-black text-gray-900 tracking-tight mb-4">Verification in Progress</h2>
                <p class="text-gray-500 font-medium mb-8 leading-relaxed">Your portal account is currently pending admission office clearance. Please check back later once your identification has been verified.</p>
                ${UI.button({ label: 'Back to Dashboard', onClick: "location.href='/pages/student/student-dashboard.html'", type: 'secondary', size: 'md' })}
            </div>
        `;
    },

    renderEnrolledView() {
        return `
            <header class="mb-10">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Enrollment Active</span>
                    <span class="text-xs text-gray-400 font-bold uppercase tracking-widest">${this.state.activeSemester?.name}</span>
                </div>
                <h1 class="text-4xl font-black text-gray-900 tracking-tight">Your Enrolled Subjects</h1>
                <p class="text-gray-500 font-medium mt-2">Study load for the current academic session.</p>
            </header>
            
            ${UI.table({
            headers: ['Academic Subject', 'Section', 'Faculty', 'Units', 'Status'],
            rows: this.state.enrolledSubjects.map(s => [
                `<div>
                        <div class="font-black text-gray-900 text-sm">${s.subject_code}</div>
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">${s.subject_title}</div>
                    </div>`,
                `<span class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-black border border-blue-100">${s.section_name}</span>`,
                `<div class="text-sm font-bold text-gray-600">${s.professor || 'Assignment Pending'}</div>`,
                `<div class="font-black text-gray-900">${s.units}</div>`,
                UI.badge(s.payment_approved ? 'Paid & Verified' : 'Pending Payment', s.payment_approved ? 'success' : 'warning')
            ])
        })}
        `;
    },

    renderEnrollmentBuilder() {
        const filteredAvailable = this.state.availableSubjects.filter(s =>
            !this.state.recommendedSubjects.find(r => r.id === s.id)
        );

        return `
            <header class="mb-12">
                <div class="flex items-center gap-3 mb-2">
                    <span class="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Enlistment Portal</span>
                    <span class="text-xs text-gray-400 font-bold uppercase tracking-widest">${this.state.activeSemester?.name}</span>
                </div>
                <h1 class="text-4xl font-black text-gray-900 tracking-tight">Subject Enrollment</h1>
                <p class="text-gray-500 font-medium mt-2">Personalize your academic load for the upcoming term.</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
                <div class="lg:col-span-1">
                    ${this.renderUnitCounter()}
                </div>
                <div class="lg:col-span-3">
                    ${this.renderFilters()}
                </div>
            </div>

            <div class="space-y-12">
                <section>
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h2 class="text-2xl font-black text-gray-900 tracking-tight">Curriculum Picks</h2>
                            <p class="text-sm text-gray-400 font-medium">Standard subjects based on your year level</p>
                        </div>
                        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">${this.state.recommendedSubjects.length} Found</span>
                    </div>
                    ${this.subjects.renderCategorizedSubjects(
            this.subjects.groupSubjectsByYearAndSemester(this.state.recommendedSubjects),
            true, 'recommended'
        )}
                </section>

                <section>
                    <div class="flex items-center justify-between mb-6">
                         <div>
                            <h2 class="text-2xl font-black text-gray-900 tracking-tight">Global Catalog</h2>
                            <p class="text-sm text-gray-400 font-medium">All other subjects available for cross-enrollment</p>
                        </div>
                        <span class="px-3 py-1 bg-gray-50 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">${filteredAvailable.length} Listings</span>
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
            <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 h-full">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div class="text-right">
                        <div class="text-[28px] font-black text-gray-900 leading-none">${currentUnits}</div>
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">/ ${this.state.maxUnits} Limit</div>
                    </div>
                </div>
                <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-2">
                    <div class="bg-blue-600 h-full transition-all duration-1000 ease-out" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-tighter text-center">Credit Load Capacity</p>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div class="bg-white p-4 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 flex flex-col md:flex-row gap-4 h-full items-end">
                <div class="flex-1 w-full">
                    <label class="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2 tracking-widest">Filter by Year</label>
                    <select onchange="handleYearFilterChange(this.value)" class="w-full px-5 py-3 bg-gray-50 border border-gray-50 rounded-2xl outline-none text-xs font-bold text-gray-600 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer">
                        <option value="">Full Academic History</option>
                        ${[1, 2, 3, 4, 5].map(y => `<option value="${y}" ${this.state.filters.yearLevel === y ? 'selected' : ''}>Year Level ${y}</option>`).join('')}
                    </select>
                </div>
                <div class="flex-1 w-full">
                    <label class="block text-[10px] font-black uppercase text-gray-400 mb-2 ml-2 tracking-widest">Select Semester</label>
                    <select onchange="handleSemesterFilterChange(this.value)" class="w-full px-5 py-3 bg-gray-50 border border-gray-50 rounded-2xl outline-none text-xs font-bold text-gray-600 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer">
                        <option value="">All Semesters</option>
                        <option value="1" ${this.state.filters.semester === 1 ? 'selected' : ''}>1st Semester</option>
                        <option value="2" ${this.state.filters.semester === 2 ? 'selected' : ''}>2nd Semester</option>
                        <option value="3" ${this.state.filters.semester === 3 ? 'selected' : ''}>Summer Session</option>
                    </select>
                </div>
                <button onclick="clearFilters()" class="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-[11px] font-black text-gray-500 uppercase tracking-widest transition-all h-[47px]">
                    Reset
                </button>
            </div>
        `;
    },

    renderFloatingCartButton() {
        if (this.state.cart.length === 0) return '';
        return `
            <div class="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-500">
                <button onclick="openCartModal()" class="bg-black text-white px-8 py-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group">
                    <div class="relative">
                        <svg class="w-6 h-6 text-blue-400 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        <span class="absolute -top-3 -right-3 bg-blue-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ring-4 ring-black">${this.state.cart.length}</span>
                    </div>
                    <div class="text-left">
                        <div class="text-xs font-black uppercase tracking-widest">Review Selections</div>
                        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-tight">${this.cart.getTotalUnits()} Total Units</div>
                    </div>
                </button>
            </div>
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
            Toast.error('Please assign a learning section first');
            return;
        }

        const subject = this.state.recommendedSubjects.find(s => s.id === subjectId) ||
            this.state.availableSubjects.find(s => s.id === subjectId);
        const section = (subject.sections || []).find(sec => sec.id === select.value);

        if (this.cart.addToCart(subject, section)) {
            this.render();
        }
    }
};
