/**
 * OverrideEnrollmentForm Component
 * 
 * Form for manual enrollment with override capabilities.
 * Handles validation display, section selection, and override reason input.
 */

export const renderOverrideEnrollmentForm = ({
    student,
    subject,
    selectedSectionId = null,
    overrideReason = '',
    onConfirm = 'confirmOverride', // Global function name
    onSectionChange = 'updateSection', // Handler for section change if needed, or we rely on DOM
    validationIssues = []
}) => {
    if (!student || !subject) return '';

    // Calculate validation issues if not provided
    const issues = validationIssues.length > 0 ? validationIssues : [];

    // Check prerequisites (basic check if not provided)
    if (issues.length === 0) {
        if (subject.prerequisite) {
            const hasPrereq = student.enrolledSubjects?.find(s => s.code === subject.prerequisite);
            if (!hasPrereq) {
                issues.push(`Missing prerequisite: ${subject.prerequisite}`);
            }
        }

        // Check unit limit
        if ((student.totalUnits + subject.units) > 30) {
            issues.push(`Would exceed 30-unit limit`);
        }

        // Section capacity checks usually happen on selection, but we can check general status
        const fullSections = subject.sections?.filter(s => s.enrolled >= s.slots) || [];
        if (fullSections.length > 0 && fullSections.length === subject.sections?.length) {
            issues.push(`All sections are at full capacity`);
        } else if (fullSections.length > 0) {
            issues.push(`${fullSections.length} section(s) at full capacity`);
        }
    }

    return `
        <div class="card border-2 border-yellow-200">
            <h3 class="font-bold text-gray-800 mb-4">Override Enrollment</h3>
            
            <div class="p-4 bg-blue-50 rounded-xl mb-4">
                <p class="font-medium text-blue-800">${subject.code} - ${subject.name}</p>
                <p class="text-sm text-blue-600">${subject.units} units</p>
            </div>
            
            ${issues.length > 0 ? `
                <div class="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                    <p class="font-medium text-red-800 mb-2">⚠️ Override Required</p>
                    <ul class="text-sm text-red-600 space-y-1">
                        ${issues.map(issue => `<li>• ${issue}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Select Section</label>
                <select id="sectionSelect" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Choose a section...</option>
                    ${subject.sections?.map(section => `
                        <option value="${section.id}" 
                                ${parseInt(selectedSectionId) === section.id ? 'selected' : ''}
                                ${section.enrolled >= section.slots ? 'class="text-red-600"' : ''}>
                            Section ${section.name} - ${section.schedule} (${section.enrolled}/${section.slots}${section.enrolled >= section.slots ? ' FULL' : ''})
                        </option>
                    `).join('') || ''}
                </select>
            </div>
            
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">Override Reason <span class="text-red-500">*</span></label>
                <textarea id="overrideReason"
                          rows="3"
                          required
                          placeholder="Provide justification for this override enrollment..."
                          class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none">${overrideReason}</textarea>
                <p class="text-xs text-gray-500 mt-1">This reason will be logged for audit purposes</p>
            </div>
            
            <button onclick="${onConfirm}()" class="w-full btn-primary bg-yellow-600 hover:bg-yellow-700">
                <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                Override Enroll
            </button>
        </div>
    `;
};
