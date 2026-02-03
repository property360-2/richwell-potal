import { formatCurrency } from '../../../utils.js';
import { Toast } from '../../../components/Toast.js';
import { UI } from '../../../components/UI.js';

/**
 * Subject Module for Enrollment System
 * Refactored with Atomic UI Components
 */
export const SubjectModule = {
    init(ctx) {
        this.ctx = ctx;
        window.toggleAccordion = (id, btn) => this.toggleAccordion(id, btn);
        window.updateSubjectCardDetails = (id, select) => this.updateSubjectCardDetails(id, select);
        window.setYearSemesterToggle = (key, val) => this.setYearSemesterToggle(key, val);
    },

    get state() { return this.ctx.state; },
    get render() { return this.ctx.render; },

    groupSubjectsByYearAndSemester(subjects) {
        const grouped = {};
        subjects.forEach(subject => {
            const year = subject.year_level || 'Other';
            const semester = subject.semester_number || 0;
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][semester]) grouped[year][semester] = [];
            grouped[year][semester].push(subject);
        });
        return grouped;
    },

    getYearLabel(yearLevel) {
        if (yearLevel === 'Other') return 'Extra Curricular / Other';
        const ordinals = { 1: 'First Year', 2: 'Second Year', 3: 'Third Year', 4: 'Fourth Year', 5: 'Fifth Year' };
        return ordinals[yearLevel] || `Year ${yearLevel}`;
    },

    getSemesterLabel(semesterNum) {
        const labels = { 1: 'First Semester', 2: 'Second Semester', 3: 'Summer Session', 0: 'Uncategorized' };
        return labels[semesterNum] || `Semester ${semesterNum}`;
    },

    setYearSemesterToggle(key, val) {
        this.state.yearLevelToggles[key] = val;
        this.render();
    },

    renderCategorizedSubjects(grouped, isRecommended, sectionId) {
        const years = Object.keys(grouped).sort((a, b) => {
            if (a === 'Other') return 1;
            if (b === 'Other') return -1;
            return parseInt(a) - parseInt(b);
        });

        if (years.length === 0) return `
            <div class="flex flex-col items-center justify-center p-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                <div class="text-4xl mb-4">📚</div>
                <p class="text-gray-400 font-black uppercase tracking-widest text-xs">No subjects available for this curriculum</p>
            </div>
        `;

        return years.map(year => {
            const toggleKey = `${sectionId}_${year}`;
            const activeSem = this.state.yearLevelToggles[toggleKey] || 1;
            const subjects = grouped[year][activeSem] || [];

            return `
                <div class="bg-white rounded-3xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
                    <div class="p-6 bg-gradient-to-br from-gray-50/50 to-white border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div class="flex items-center gap-4">
                             <div class="w-12 h-12 bg-white ring-1 ring-gray-100 rounded-2xl flex items-center justify-center text-blue-600 font-black shadow-sm text-xl">
                                ${year === 'Other' ? '?' : year}
                            </div>
                            <div>
                                <h3 class="font-black text-gray-900 text-xl tracking-tight">${this.getYearLabel(year)}</h3>
                                <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">Academic Track Distribution</p>
                            </div>
                        </div>
                        <div class="flex p-1.5 bg-gray-100/80 rounded-2xl ring-1 ring-gray-200/50">
                            ${[1, 2, 3].map(sem => `
                                <button onclick="setYearSemesterToggle('${toggleKey}', ${sem})" 
                                    class="px-5 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${activeSem === sem ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}">
                                    ${sem === 3 ? 'Summer' : sem + (sem === 1 ? 'st' : 'nd') + ' Sem'}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="p-6 bg-gray-50/20 min-h-[160px]">
                        ${subjects.length > 0 ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                ${subjects.map(s => this.renderSubjectCard(s, isRecommended)).join('')}
                            </div>
                        ` : `
                            <div class="flex flex-col items-center justify-center py-12 text-gray-300">
                                <p class="text-[11px] font-black uppercase tracking-widest">No listings for ${this.getSemesterLabel(activeSem)}</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderSubjectCard(subject, isRecommended) {
        const isInCart = this.state.cart.some(item => item.subject.id === subject.id);
        const isEnrolled = this.state.enrolledSubjects.some(e => (e.subject?.code || e.subject_code || e.code) === subject.code);
        const hasPrerequisiteIssue = subject.prerequisite_met === false;

        return `
            <div class="group bg-white border border-gray-100 p-6 rounded-3xl transition-all hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 relative ${isEnrolled ? 'ring-2 ring-green-500/20 bg-green-50/10' : ''}">
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 uppercase tracking-widest ring-1 ring-blue-100">${subject.code}</span>
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${subject.units} Units</span>
                </div>
                <h3 class="font-black text-gray-900 leading-tight mb-6 min-h-[2.5rem] line-clamp-2 text-md transition-colors group-hover:text-blue-600" title="${subject.title}">${subject.title}</h3>
                
                ${isEnrolled ? `
                    <div class="flex items-center gap-2.5 py-3 px-4 rounded-2xl bg-green-500/10 text-green-600 font-black text-[10px] uppercase tracking-widest w-full justify-center ring-1 ring-green-500/20">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                        Already Verified
                    </div>
                ` : `
                    <div class="space-y-4">
                        ${hasPrerequisiteIssue ? `
                             <div class="bg-red-500/5 p-3 rounded-xl ring-1 ring-red-500/10 mb-4 animate-in fade-in duration-300">
                                <div class="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1.5 pointer-events-none">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    Requirement Gap
                                </div>
                                <div class="text-[10px] text-red-700 font-bold leading-tight">Must complete: ${subject.missing_prerequisites?.map(p => typeof p === 'string' ? p : p.code).join(', ')}</div>
                             </div>
                        ` : ''}
                        
                        <div class="flex flex-col gap-3">
                            <div class="relative">
                                <select id="section-select-${subject.id}" onchange="updateSubjectCardDetails('${subject.id}', this)" 
                                        class="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-[11px] font-black text-gray-700 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all appearance-none cursor-pointer">
                                    <option value="">Choose Learning Section</option>
                                    ${(subject.sections || []).map(sec => `
                                        <option value="${sec.id}">${sec.name} &bull; ${sec.slots - sec.enrolled} Vacancies</option>
                                    `).join('')}
                                </select>
                                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            
                            <button onclick="enrollSubject('${subject.id}')"
                                    id="btn-add-${subject.id}"
                                    class="w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-sm
                                           ${isInCart ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-200/50 cursor-default' :
                (hasPrerequisiteIssue ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/20 active:scale-95')}">
                                ${isInCart ? 'Pending in Cart' : 'Enlist Subject'}
                            </button>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
};
