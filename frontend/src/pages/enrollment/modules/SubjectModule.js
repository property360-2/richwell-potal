import { formatCurrency } from '../../../utils.js';
import { Toast } from '../../../components/Toast.js';

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
        if (yearLevel === 'Other') return 'Other Subjects';
        const ordinals = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year', 4: '4th Year', 5: '5th Year' };
        return ordinals[yearLevel] || `Year ${yearLevel}`;
    },

    getSemesterLabel(semesterNum) {
        const labels = { 1: '1st Semester', 2: '2nd Semester', 3: 'Summer', 0: 'Not Categorized' };
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

        if (years.length === 0) return '<p class="text-gray-500 text-center py-8">No subjects available</p>';

        return years.map(year => {
            const toggleKey = `${sectionId}_${year}`;
            const activeSem = this.state.yearLevelToggles[toggleKey] || 1;
            const subjects = grouped[year][activeSem] || [];

            return `
                <div class="border border-gray-200 rounded-lg mb-4 overflow-hidden bg-white shadow-sm">
                    <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div class="flex items-center gap-3">
                             <div class="w-10 h-10 bg-white border border-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold shadow-sm">
                                ${year === 'Other' ? '?' : year}
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-800 text-lg">${this.getYearLabel(year)}</h3>
                                <p class="text-xs text-gray-500 font-medium uppercase tracking-wide">Academic Year Level</p>
                            </div>
                        </div>
                        <div class="flex p-1 bg-gray-200/80 rounded-lg">
                            ${[1, 2, 3].map(sem => `
                                <button onclick="setYearSemesterToggle('${toggleKey}', ${sem})" 
                                    class="px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${activeSem === sem ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                                    ${sem === 3 ? 'Summer' : sem + (sem === 1 ? 'st' : 'nd') + ' Sem'}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="p-4 bg-gray-50/50 min-h-[100px]">
                        ${subjects.length > 0 ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                ${subjects.map(s => this.renderSubjectCard(s, isRecommended)).join('')}
                            </div>
                        ` : `
                            <div class="flex flex-col items-center justify-center py-8 text-gray-400">
                                <p class="text-sm font-medium">No subjects found for ${this.getSemesterLabel(activeSem)}</p>
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
            <div class="bg-white border border-gray-200 p-5 rounded-xl transition-all hover:shadow-lg ${isEnrolled ? ' ring-1 ring-green-100 bg-green-50/20' : ''}">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">${subject.code}</span>
                    <span class="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase">${subject.units} Units</span>
                </div>
                <h3 class="font-bold text-gray-900 leading-tight mb-4 min-h-[3rem] line-clamp-2" title="${subject.title}">${subject.title}</h3>
                
                ${isEnrolled ? `
                    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-bold text-[11px] uppercase tracking-wide">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                        Already Enrolled
                    </div>
                ` : `
                    <div class="space-y-3">
                        ${hasPrerequisiteIssue ? `
                             <div class="bg-red-50 p-2 rounded text-[10px] text-red-600 font-medium">
                                ⚠️ Missing Prerequisites: ${subject.missing_prerequisites?.map(p => typeof p === 'string' ? p : p.code).join(', ')}
                             </div>
                        ` : ''}
                        
                        <div class="flex flex-col gap-2.5">
                            <select id="section-select-${subject.id}" onchange="updateSubjectCardDetails('${subject.id}', this)" class="form-select text-[11px] h-9 border-gray-200 bg-gray-50">
                                <option value="">-- Choose Section --</option>
                                ${(subject.sections || []).map(sec => `
                                    <option value="${sec.id}">${sec.name} (${sec.slots - sec.enrolled} slots left)</option>
                                `).join('')}
                            </select>
                            
                            <button onclick="enrollSubject('${subject.id}')"
                                    id="btn-add-${subject.id}"
                                    class="w-full h-9 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all
                                           ${isInCart ? 'bg-amber-100 text-amber-700 cursor-default' :
                (hasPrerequisiteIssue ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]')}">
                                ${isInCart ? 'Already in Cart' : 'Add to Enrollment'}
                            </button>
                        </div>
                    </div>
                `}
            </div>
        `;
    }
};
