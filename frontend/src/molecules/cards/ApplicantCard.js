/**
 * ApplicantCard Component
 * 
 * Displays applicant information and action buttons for approval/rejection.
 */

export const renderApplicantCard = ({
  applicant,
  onAccept = 'openIdAssignmentModal', // Global function
  onReject = 'rejectApplicant'       // Global function
}) => {
  if (!applicant) return '';

  const isPending = applicant.status === 'PENDING';
  const docsComplete = applicant.documents_verified === applicant.documents_total;

  // Status Badge Logic
  let statusBadge = '';
  let borderClass = '';

  if (isPending) {
    borderClass = 'border-l-yellow-400';
    statusBadge = `<span class="badge badge-warning">${applicant.status}</span>`;
  } else if (applicant.status === 'ACTIVE') {
    borderClass = 'border-l-green-400';
    statusBadge = `<span class="badge badge-success">${applicant.status}</span>`;
  } else {
    borderClass = 'border-l-red-400';
    statusBadge = `<span class="badge badge-danger">${applicant.status}</span>`;
  }

  // Action Buttons Logic
  let actionsHtml = '';
  if (isPending) {
    actionsHtml = `
            <button onclick="${onAccept}('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-green-600/25">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Accept
            </button>
            <button onclick="${onReject}('${applicant.id}')" 
                    class="flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Reject
            </button>
        `;
  } else if (applicant.status === 'ACTIVE') {
    actionsHtml = `
            <span class="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Approved
            </span>
        `;
  } else {
    actionsHtml = `
            <span class="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-xl font-medium">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Rejected
            </span>
        `;
  }

  return `
    <div class="card border-l-4 ${borderClass}">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Applicant Info -->
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
            ${(applicant.first_name || 'U')[0]}${(applicant.last_name || 'N')[0]}
          </div>
          <div>
            <h3 class="text-lg font-bold text-gray-800">${applicant.first_name} ${applicant.last_name}</h3>
            <p class="text-sm text-gray-500">${applicant.student_number || 'No ID'} • ${applicant.email}</p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-sm font-medium text-blue-600">${applicant.program?.code || 'N/A'}</span>
              <span class="text-xs px-2 py-0.5 rounded-full ${docsComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
                Docs: ${applicant.documents_verified || 0}/${applicant.documents_total || 0}
              </span>
              ${statusBadge}
            </div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex items-center gap-3">
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
};
