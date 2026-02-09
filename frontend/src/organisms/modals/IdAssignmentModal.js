/**
 * IdAssignmentModal Component
 * 
 * Modal for assigning a Student ID to an approved applicant.
 */

export const renderIdAssignmentModal = ({
  applicant,
  suggestedId = '',
  error = '',
  onClose = 'closeIdAssignmentModal',
  onSubmit = 'submitIdAssignment',
  onInput = 'handleIdNumberInput'
}) => {
  if (!applicant) return '';

  return `
    <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onclick="${onClose}(event)">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 class="text-xl font-bold">Assign Student ID Number</h2>
            <p class="text-blue-100 text-sm">${applicant.first_name} ${applicant.last_name}</p>
          </div>
          <button onclick="${onClose}()" class="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Student ID Number <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="id-number-input"
              class="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all text-lg font-mono"
              placeholder="Enter student ID"
              value="${suggestedId}"
              oninput="${onInput}(event)"
            >
            <p class="text-xs text-gray-500 mt-2">Enter any unique student ID number</p>
            ${error ? `
              <p class="text-sm text-red-600 mt-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${error}
              </p>
            ` : ''}
          </div>

          <!-- Info Box -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h4 class="font-semibold text-blue-800 mb-2">Credentials Info</h4>
            <div class="text-sm text-blue-700 space-y-1">
              <p><strong>Login Email:</strong> ${applicant.email}</p>
              <p><strong>Program:</strong> ${applicant.program?.code || 'N/A'}</p>
              <p><strong>Password:</strong> richwell123 (default)</p>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3">
            <button onclick="${onClose}()" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors">
              Cancel
            </button>
            <button onclick="${onSubmit}()" class="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg">
              Approve & Assign ID
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};
