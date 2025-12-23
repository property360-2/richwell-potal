import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, formatCurrency, requireAuth } from '../utils.js';

// State
const state = {
  user: null,
  loading: true,
  recommendedSubjects: [],
  availableSubjects: [],
  enrolledSubjects: [],
  cart: [], // Shopping cart for picked subjects: [{ subject, section }]
  totalUnits: 0,
  maxUnits: 30,
  showSchedulePreview: null,
  showConfirmModal: false,
  showCartConfirmModal: false, // For confirming all cart items
  pendingEnrollment: null, // { subject, section }

  // Edit modal state
  editingEnrollment: null,
  editModalSelectedSubject: null,
  editModalSelectedSection: null,
  showEditModal: false
};

// Mock data for development
const mockRecommendedSubjects = [
  {
    id: 1, code: 'IT101', name: 'Introduction to Computing', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 1, name: 'A', slots: 40, enrolled: 35, schedule: 'MWF 8:00-9:00 AM' },
      { id: 2, name: 'B', slots: 40, enrolled: 28, schedule: 'TTH 9:00-10:30 AM' }
    ]
  },
  {
    id: 2, code: 'IT102', name: 'Computer Programming 1', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 3, name: 'A', slots: 35, enrolled: 30, schedule: 'MWF 10:00-11:00 AM' },
      { id: 4, name: 'B', slots: 35, enrolled: 20, schedule: 'TTH 1:00-2:30 PM' }
    ]
  },
  {
    id: 3, code: 'GE101', name: 'Understanding the Self', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 5, name: 'A', slots: 50, enrolled: 45, schedule: 'MWF 1:00-2:00 PM' }
    ]
  },
  {
    id: 4, code: 'GE102', name: 'Readings in Philippine History', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 6, name: 'A', slots: 50, enrolled: 38, schedule: 'TTH 3:00-4:30 PM' }
    ]
  },
  {
    id: 5, code: 'MATH101', name: 'Mathematics in the Modern World', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 7, name: 'A', slots: 40, enrolled: 35, schedule: 'MWF 9:00-10:00 AM' },
      { id: 8, name: 'B', slots: 40, enrolled: 32, schedule: 'TTH 10:30-12:00 PM' }
    ]
  },
  {
    id: 6, code: 'PE101', name: 'Physical Fitness', units: 2, prerequisite: null, prerequisite_met: true, sections: [
      { id: 9, name: 'A', slots: 60, enrolled: 50, schedule: 'SAT 8:00-10:00 AM' }
    ]
  },
  {
    id: 7, code: 'NSTP1', name: 'National Service Training Program 1', units: 3, prerequisite: null, prerequisite_met: true, sections: [
      { id: 10, name: 'A', slots: 100, enrolled: 85, schedule: 'SAT 10:00-1:00 PM' }
    ]
  }
];

const mockAvailableSubjects = [
  ...mockRecommendedSubjects,
  {
    id: 8, code: 'IT201', name: 'Computer Programming 2', units: 3, prerequisite: 'IT102', prerequisite_met: false, sections: [
      { id: 11, name: 'A', slots: 35, enrolled: 25, schedule: 'MWF 2:00-3:00 PM' }
    ]
  },
  {
    id: 9, code: 'IT202', name: 'Data Structures', units: 3, prerequisite: 'IT201', prerequisite_met: false, sections: [
      { id: 12, name: 'A', slots: 35, enrolled: 20, schedule: 'TTH 8:00-9:30 AM' }
    ]
  },
  {
    id: 10, code: 'IT301', name: 'Database Management', units: 3, prerequisite: 'IT202', prerequisite_met: false, sections: [
      { id: 13, name: 'A', slots: 30, enrolled: 18, schedule: 'MWF 3:00-4:00 PM' }
    ]
  }
];

const mockEnrolledSubjects = [
  { id: 101, subject: { code: 'IT101', name: 'Introduction to Computing' }, section: 'A', units: 3, schedule: 'MWF 8:00-9:00 AM', status: 'ENROLLED' },
  { id: 102, subject: { code: 'IT102', name: 'Computer Programming 1' }, section: 'A', units: 3, schedule: 'MWF 10:00-11:00 AM', status: 'ENROLLED' }
];

async function init() {
  if (!requireAuth()) return;

  await loadData();
  render();
  attachEventListeners();
}

async function loadData() {
  try {
    // Load user profile
    const userResponse = await api.get(endpoints.me);
    if (userResponse) {
      state.user = userResponse.data || userResponse;
    }

    // Check if student has student_number (admission approved)
    if (!state.user?.student_number) {
      state.loading = false;
      return; // Stop loading, will show admission pending message in render
    }

    // Try to load recommended subjects - this includes payment status
    try {
      const recommendedResponse = await api.get(endpoints.recommendedSubjects);
      console.log('Recommended subjects response:', recommendedResponse);
      if (recommendedResponse?.data) {
        const subjects = recommendedResponse.data.recommended_subjects || [];
        // Map backend fields to frontend model
        state.recommendedSubjects = subjects.map(s => ({
          ...s,
          name: s.title || s.name,
          prerequisite_met: s.prerequisites_met,
          sections: (s.available_sections || s.sections || []).map(sec => ({
            ...sec,
            id: sec.section_id || sec.id,
            name: sec.section_name || sec.name,
            slots: sec.available_slots || sec.slots,
            enrolled: 0, // Backend sends available slots, not total/enrolled
            schedule: Array.isArray(sec.schedule) ? sec.schedule.map(slot => `${slot.day} ${slot.start_time}-${slot.end_time}`).join(', ') : sec.schedule
          }))
        }));

        state.totalUnits = recommendedResponse.data.current_units || 0;
        state.maxUnits = recommendedResponse.data.max_units || 30;
      } else if (recommendedResponse?.length) {
        state.recommendedSubjects = recommendedResponse;
      } else {
        state.recommendedSubjects = mockRecommendedSubjects;
      }
    } catch (err) {
      console.log('Failed to load recommended subjects:', err);
      showToast('Error loading subjects: ' + (err.message || 'Unknown error'), 'error');
      state.recommendedSubjects = mockRecommendedSubjects;
    }

    // Try to load all available subjects
    try {
      const availableResponse = await api.get(endpoints.availableSubjects);
      if (availableResponse?.data) {
        const subjects = availableResponse.data.available_subjects || [];
        state.availableSubjects = subjects.map(s => ({
          ...s,
          name: s.title || s.name,
          prerequisite_met: s.prerequisites_met,
          sections: (s.available_sections || s.sections || []).map(sec => ({
            ...sec,
            id: sec.section_id || sec.id,
            name: sec.section_name || sec.name,
            slots: sec.available_slots || sec.slots,
            enrolled: 0,
            schedule: Array.isArray(sec.schedule) ? sec.schedule.map(slot => `${slot.day} ${slot.start_time}-${slot.end_time}`).join(', ') : sec.schedule
          }))
        }));
      } else if (availableResponse?.length) {
        state.availableSubjects = availableResponse;
      } else {
        state.availableSubjects = mockAvailableSubjects;
      }
    } catch {
      state.availableSubjects = mockAvailableSubjects;
    }

    // Try to load enrolled subjects
    try {
      const enrolledResponse = await api.get(endpoints.myEnrollments);
      if (enrolledResponse?.data?.subject_enrollments) {
        // Map backend fields to frontend model
        state.enrolledSubjects = enrolledResponse.data.subject_enrollments.map(s => ({
          id: s.id,
          subject: {
            code: s.subject_code,
            name: s.subject_title,
            units: s.units
          },
          section: s.section_name,
          units: s.units,
          schedule: Array.isArray(s.schedule) ? s.schedule.map(slot => `${slot.day} ${slot.start_time}-${slot.end_time}`).join(', ') : s.schedule,
          status: s.status,
          // Approval fields for badge display
          payment_approved: s.payment_approved,
          head_approved: s.head_approved,
          approval_status_display: s.approval_status_display,
          is_fully_enrolled: s.is_fully_enrolled
        }));
        state.totalUnits = enrolledResponse.data.enrolled_units || 0;
      } else if (enrolledResponse?.length) {
        state.enrolledSubjects = enrolledResponse;
      } else {
        state.enrolledSubjects = mockEnrolledSubjects;
      }
    } catch {
      state.enrolledSubjects = mockEnrolledSubjects;
    }

    // Calculate total enrolled units if not set
    if (!state.totalUnits) {
      state.totalUnits = state.enrolledSubjects.reduce((sum, e) => sum + (e.units || e.subject?.units || 0), 0);
    }

    // Set enrollment state - lock enrollment if student has any enrolled subjects
    state.hasEnrolledSubjects = state.enrolledSubjects.length > 0;

  } catch (error) {
    // REMOVED: Mock data fallback prevents seeing real errors
    state.recommendedSubjects = [];
    state.availableSubjects = [];
    state.enrolledSubjects = [];
    showToast('Failed to load data. Please refresh.', 'error');
  }
  state.loading = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  // Check if student has student_number (admission approved)
  if (!state.user?.student_number) {
    app.innerHTML = `
      ${renderHeader()}

      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="max-w-2xl mx-auto mt-12 p-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <div class="text-center">
            <svg class="mx-auto h-16 w-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <h2 class="mt-4 text-2xl font-bold text-gray-900">Account Pending Admission Approval</h2>
            <p class="mt-3 text-gray-700">
              Your enrollment application is being reviewed by the Admission Office.
              You will be able to enroll in subjects once your account is approved and a Student ID Number is assigned.
            </p>
            <p class="mt-4 text-sm text-gray-600">
              Please check back later or contact the Admission Office for updates on your application status.
            </p>
            <div class="mt-6">
              <a href="/student-dashboard.html" class="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                </svg>
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </main>
    `;
    return;
  }

  // Check if student has enrolled subjects - show locked view
  if (state.hasEnrolledSubjects) {
    app.innerHTML = `
      ${renderHeader()}

      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- Page Title -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-800">Your Enrolled Subjects</h1>
          <p class="text-gray-600 mt-1">Currently enrolled for this semester</p>
        </div>

        <!-- Unit Summary -->
        <div class="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-gray-800">Total Units Enrolled</h3>
              <p class="text-sm text-gray-600 mt-1">Maximum allowed: ${state.maxUnits} units</p>
            </div>
            <div class="text-right">
              <p class="text-4xl font-bold text-blue-600">${state.totalUnits}</p>
              <p class="text-sm text-gray-500">units</p>
            </div>
          </div>
          <div class="mt-4">
            <div class="w-full bg-gray-200 rounded-full h-3">
              <div class="bg-blue-600 h-3 rounded-full transition-all duration-300" style="width: ${Math.min((state.totalUnits / state.maxUnits) * 100, 100)}%"></div>
            </div>
          </div>
        </div>

        <!-- Info Message -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <div>
              <p class="text-sm text-blue-800 font-medium">Your subject enrollments are pending approval</p>
              <p class="text-sm text-blue-700 mt-1" >Once Approved by Head, you cannot longer change or update your subjects</p>
              <p class="text-sm text-blue-700 mt-1">Your enrollments will need to be processed before you can add more subjects. Please check back later for updates.</p>
            </div>
          </div>
        </div>

        <!-- Enrolled Subjects - Table Format -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Title</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${state.enrolledSubjects.map(enrollment => renderEnrolledSubjectRow(enrollment)).join('')}
            </tbody>
          </table>
        </div>
      </main>

      <!-- Schedule Preview Modal -->
      ${state.showSchedulePreview ? renderSchedulePreviewModal() : ''}

      <!-- Edit Modal -->
      ${state.showEditModal ? renderEditModal() : ''}
    `;
  } else {
    // Show normal enrollment interface
    app.innerHTML = `
      ${renderHeader()}

      <main class="max-w-7xl mx-auto px-4 py-8">
        <!-- Page Title -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-800">Subject Enrollment</h1>
          <p class="text-gray-600 mt-1">Select subjects for the current semester</p>
        </div>

        <!-- Unit Counter Bar -->
        ${renderUnitCounter()}

        <!-- Main Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left Column - Subject Selection (Takes 2 columns) -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Recommended Subjects -->
            <div class="card">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-xl font-bold text-gray-800">Recommended Subjects</h2>
                  <p class="text-sm text-gray-500">Based on your year level and curriculum</p>
                </div>
                <span class="badge badge-info">${state.recommendedSubjects.length} subjects</span>
              </div>

              <div class="space-y-3">
                ${state.recommendedSubjects.map(subject => renderSubjectCard(subject, true)).join('')}
              </div>
            </div>

            <!-- All Available Subjects -->
            <div class="card">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h2 class="text-xl font-bold text-gray-800">All Available Subjects</h2>
                  <p class="text-sm text-gray-500">For irregular students or advanced enrollment</p>
                </div>
              </div>

              <div class="space-y-3">
                ${state.availableSubjects.filter(s => !state.recommendedSubjects.find(r => r.id === s.id)).map(subject => renderSubjectCard(subject, false)).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column - Cart/Enrollment Summary -->
          <div class="space-y-6">
            <!-- Shopping Cart -->
            <div class="card sticky top-24">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-bold text-gray-800">Selected Subjects</h3>
                <span class="text-sm text-gray-500">${state.cart.reduce((sum, item) => sum + item.subject.units, 0)} / ${state.maxUnits} units</span>
              </div>
              ${state.cart.length === 0 ? `
                <div class="text-center py-6">
                  <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <p class="text-gray-400 text-sm">No subjects selected yet</p>
                  <p class="text-gray-400 text-xs mt-1">Pick subjects to enroll</p>
                </div>
              ` : `
                <div class="space-y-2 mb-4">
                  ${state.cart.map(item => renderCartItem(item)).join('')}
                </div>
                <button onclick="showConfirmAllModal()" class="w-full btn-primary py-3 flex items-center justify-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Confirm Enrollment (${state.cart.length})
                </button>
              `}
            </div>
          </div>
        </div>
      </main>

      <!-- Schedule Preview Modal -->
      ${state.showSchedulePreview ? renderSchedulePreviewModal() : ''}

      <!-- Cart Confirmation Modal -->
      ${state.showCartConfirmModal ? renderCartConfirmModal() : ''}

      <!-- Edit Modal -->
      ${state.showEditModal ? renderEditModal() : ''}
    `;
  }

  attachEventListeners();
}

function renderHeader() {
  // Change navigation text based on enrollment state
  const navText = state.hasEnrolledSubjects ? 'Subjects' : 'Enroll Subjects';

  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
        </div>

        <nav class="hidden md:flex items-center gap-6">
          <a href="/student-dashboard.html" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/subject-enrollment.html" class="text-blue-600 font-medium">${navText}</a>
          <a href="/grades.html" class="text-gray-600 hover:text-gray-900">Grades</a>
          <a href="/soa.html" class="text-gray-600 hover:text-gray-900">SOA</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <button onclick="logout()" class="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function renderLoading() {
  return `
    <div class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <svg class="w-12 h-12 animate-spin text-blue-600 mx-auto" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-gray-600">Loading subjects...</p>
      </div>
    </div>
  `;
}

function renderUnitCounter() {
  const currentUnits = state.totalUnits + getSelectedUnits();
  const percentage = (currentUnits / state.maxUnits) * 100;
  const isNearLimit = currentUnits >= 27; // Warning when reaching 27 units (30-unit cap)
  const isAtLimit = currentUnits >= state.maxUnits;

  return `
    <div class="card mb-8">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div>
            <p class="font-bold text-gray-800">Unit Counter</p>
            <p class="text-sm text-gray-500">Maximum ${state.maxUnits} units per semester</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-blue-600'}">${currentUnits}</p>
          <p class="text-sm text-gray-500">/ ${state.maxUnits} units</p>
        </div>
      </div>
      <div class="progress-bar h-3">
        <div class="progress-bar-fill ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : ''}" style="width: ${Math.min(percentage, 100)}%"></div>
      </div>
      ${isAtLimit ? '<p class="text-red-600 text-sm mt-2 font-medium">⚠️ You have reached the maximum unit limit</p>' : ''}
    </div>
  `;
}

function renderSubjectCard(subject, isRecommended) {
  const isInCart = state.cart.some(item => item.subject.id === subject.id);
  const isEnrolled = state.enrolledSubjects.find(e => e.subject?.code === subject.code);
  const canAdd = subject.prerequisite_met !== false && !isInCart && !isEnrolled;

  // Calculate units including cart
  const cartUnits = state.cart.reduce((sum, item) => sum + item.subject.units, 0);
  const wouldExceedLimit = (state.totalUnits + cartUnits + subject.units) > state.maxUnits;

  return `
    <div class="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors ${!canAdd || isInCart ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-sm font-bold text-blue-600">${subject.code}</span>
            ${isRecommended ? '<span class="badge badge-success text-xs">Recommended</span>' : ''}
            ${isInCart ? '<span class="badge badge-warning text-xs">Added to Cart</span>' : ''}
            ${isEnrolled ? '<span class="badge badge-info text-xs">Enrolled</span>' : ''}
            ${!subject.prerequisite_met && subject.prerequisite ? `<span class="badge badge-error text-xs">Prereq: ${subject.prerequisite}</span>` : ''}
          </div>
          <p class="font-medium text-gray-800">${subject.name}</p>
          <p class="text-sm text-gray-500">${subject.units} units</p>

          <!-- Sections -->
          <div class="mt-3 space-y-2">
            ${subject.sections?.map(section => {
              const cartItem = state.cart.find(item => item.subject.id === subject.id);
              const isThisSectionInCart = cartItem && cartItem.section.id === section.id;

              return `
              <div class="flex items-center justify-between text-sm p-2 bg-white rounded-lg">
                <div class="flex items-center gap-2">
                  <span class="font-medium">Section ${section.name}</span>
                  <span class="text-gray-400">|</span>
                  <span class="text-gray-600">${section.schedule}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">${section.slots - (section.enrolled || 0)} slots</span>
                  ${isThisSectionInCart ? `
                    <span class="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-lg">
                      ✓ Added
                    </span>
                  ` : canAdd && !wouldExceedLimit ? `
                    <button onclick="enrollSubject('${subject.id}', '${section.id}')"
                            class="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                      Add
                    </button>
                  ` : ''}
                </div>
              </div>
            `}).join('') || ''}
          </div>
        </div>
      </div>
    </div>
  `;
}


function renderEnrolledSubjectRow(enrollment) {
  // Get dual approval status from API
  const paymentApproved = enrollment.payment_approved || false;
  const headApproved = enrollment.head_approved || false;
  const isFullyEnrolled = paymentApproved && headApproved && enrollment.status === 'ENROLLED';

  // Determine row background class
  let rowClass = '';
  if (isFullyEnrolled) {
    rowClass = 'bg-green-50';
  } else if (paymentApproved || headApproved) {
    rowClass = 'bg-yellow-50';
  }

  // Render dual status badges
  const paymentBadge = paymentApproved
    ? '<span class="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">✓ Payment Complete</span>'
    : '<span class="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">⏳ Payment Pending</span>';

  const headBadge = headApproved
    ? '<span class="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">✓ Head Approved</span>'
    : '<span class="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">⏳ Awaiting Head</span>';

  const finalBadge = isFullyEnrolled
    ? '<span class="inline-flex items-center px-2 py-1 text-xs font-bold text-green-800 bg-green-200 rounded-full">ENROLLED</span>'
    : '';

  return `
    <tr class="${rowClass} hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm font-medium text-gray-900">${enrollment.subject_code || enrollment.subject?.code}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${enrollment.subject_title || enrollment.subject?.name}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${enrollment.section_name || 'N/A'}</div>
      </td>
      <td class="px-6 py-4">
        <div class="text-sm text-gray-900">${enrollment.schedule || 'TBA'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${enrollment.units}</div>
      </td>
      <td class="px-6 py-4">
        <div class="space-y-1">
          ${isFullyEnrolled ? `
            ${finalBadge}
          ` : `
            ${paymentBadge}
            ${headBadge}
          `}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        ${!headApproved ? `
          <button onclick="openEditModal('${enrollment.id}')"
                  class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
        ` : '<span class="text-gray-400 text-xs">No actions</span>'}
      </td>
    </tr>
  `;
}

function renderEnrolledSubject(enrollment, isFullWidth = false) {
  // Get dual approval status from API
  const paymentApproved = enrollment.payment_approved || false;
  const headApproved = enrollment.head_approved || false;
  const isFullyEnrolled = paymentApproved && headApproved && enrollment.status === 'ENROLLED';

  // Determine background class
  let bgClass = 'bg-gray-50';
  if (isFullyEnrolled) {
    bgClass = 'bg-green-50';
  } else if (paymentApproved || headApproved) {
    bgClass = 'bg-yellow-50';
  }

  // Render dual status badges
  const paymentBadge = paymentApproved
    ? '<span class="badge badge-success text-xs">✓ Payment Complete</span>'
    : '<span class="badge badge-warning text-xs">⏳ Payment Pending</span>';

  const headBadge = headApproved
    ? '<span class="badge badge-success text-xs">✓ Head Approved</span>'
    : '<span class="badge badge-warning text-xs">⏳ Awaiting Head</span>';

  const finalBadge = isFullyEnrolled
    ? '<span class="badge badge-success text-xs font-bold">ENROLLED</span>'
    : '';

  // Full width version for locked state
  if (isFullWidth) {
    return `
      <div class="p-6 ${bgClass} rounded-xl border ${isFullyEnrolled ? 'border-green-200' : 'border-gray-200'}">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h3 class="text-xl font-bold text-gray-800 mb-2">${enrollment.subject_code || enrollment.subject?.code}</h3>
            <p class="text-gray-700 mb-3">${enrollment.subject_title || enrollment.subject?.name}</p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p class="text-xs text-gray-500">Section</p>
                <p class="font-medium text-gray-800">${enrollment.section_name || 'N/A'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Units</p>
                <p class="font-medium text-gray-800">${enrollment.units}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Schedule</p>
                <p class="font-medium text-gray-800 text-sm">${enrollment.schedule || 'TBA'}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500">Status</p>
                <p class="font-medium text-gray-800">${enrollment.status || 'PENDING_HEAD'}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              ${paymentBadge}
              ${headBadge}
              ${finalBadge}
            </div>
            ${enrollment.approval_status_display ? `<p class="text-sm text-gray-600 mt-3 italic">${enrollment.approval_status_display}</p>` : ''}
          </div>
        </div>
        ${!headApproved ? `
          <div class="mt-4 pt-4 border-t border-gray-200">
            <button onclick="openEditModal('${enrollment.id}')"
                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Edit Subject/Section
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Compact version for sidebar
  return `
    <div class="flex items-center justify-between p-3 ${bgClass} rounded-xl border ${isFullyEnrolled ? 'border-green-200' : 'border-gray-200'}">
      <div class="flex-1">
        <div class="flex items-center gap-1 mb-2">
          <p class="font-medium text-gray-800">${enrollment.subject_code || enrollment.subject?.code} - ${enrollment.subject_title || enrollment.subject?.name}</p>
        </div>
        <p class="text-xs text-gray-500 mb-2">${enrollment.section_name ? 'Section ' + enrollment.section_name : ''} • ${enrollment.units} units</p>
        <div class="flex flex-wrap gap-1">
          ${paymentBadge}
          ${headBadge}
          ${finalBadge}
        </div>
        ${enrollment.approval_status_display ? `<p class="text-xs text-gray-600 mt-1 italic">${enrollment.approval_status_display}</p>` : ''}
      </div>
    </div>
  `;
}

function renderCartItem(item) {
  const { subject } = item;
  return `
    <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
      <div class="flex-1 pr-2">
        <p class="font-medium text-gray-800 text-sm">${subject.code}</p>
        <p class="text-xs text-gray-600 truncate">${subject.name || subject.title}</p>
        <p class="text-xs text-gray-500 mt-1">${subject.units} units</p>
      </div>
      <button onclick="removeFromCart(${subject.id})" class="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Remove">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
}

function renderCartConfirmModal() {
  const totalUnits = state.cart.reduce((sum, item) => sum + item.subject.units, 0);

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onclick="closeCartConfirmModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl transform animate-slideUp max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-800">Confirm Subject Enrollment</h3>
          <p class="text-gray-500 mt-1">Review your selected subjects before confirming</p>
        </div>

        <!-- Subject List -->
        <div class="mb-6 space-y-3">
          ${state.cart.map(item => `
            <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <p class="font-bold text-gray-800">${item.subject.code}</p>
                  <p class="text-gray-700 text-sm mt-1">${item.subject.name || item.subject.title}</p>
                  <div class="flex items-center gap-4 mt-2 text-xs text-gray-600">
                    <span>${item.subject.units} units</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Total Units -->
        <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="font-medium text-gray-800">Total Units:</span>
            <span class="text-2xl font-bold text-blue-600">${totalUnits} / ${state.maxUnits}</span>
          </div>
        </div>

        <!-- Warning Note -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-sm text-amber-700">Once confirmed, these subjects will be pending for approval. You won't be able to add more subjects until these enrollments are processed.</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button onclick="closeCartConfirmModal()"
                  class="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
            Cancel
          </button>
          <button onclick="confirmAllEnrollments()"
                  class="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
            Confirm All Enrollments
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderSchedulePreviewModal() {
  const subject = state.showSchedulePreview;
  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeSchedulePreview()">
      <div class="bg-white rounded-2xl p-6 max-w-lg mx-4" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-4">${subject.code} - Schedule Preview</h3>
        <div class="space-y-3">
          ${subject.sections?.map(section => `
            <div class="p-4 bg-gray-50 rounded-xl">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium">Section ${section.name}</p>
                  <p class="text-sm text-gray-600">${section.schedule}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-medium">${section.enrolled}/${section.slots}</p>
                  <p class="text-xs text-gray-500">enrolled</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        <button onclick="closeSchedulePreview()" class="w-full mt-4 btn-secondary">Close</button>
      </div>
    </div>
  `;
}

function renderConfirmEnrollModal() {
  const { subject, section } = state.pendingEnrollment || {};
  if (!subject || !section) return '';

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onclick="closeConfirmModal()">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl transform animate-slideUp" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-800">Confirm Enrollment</h3>
          <p class="text-gray-500 mt-1">Please review the subject details below</p>
        </div>
        
        <!-- Subject Details Card -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border border-blue-100">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span class="text-lg font-bold text-blue-600">${subject.code?.slice(0, 2) || 'SB'}</span>
            </div>
            <div class="flex-1">
              <p class="font-mono text-sm font-bold text-blue-600">${subject.code}</p>
              <p class="font-semibold text-gray-800 text-lg">${subject.name}</p>
              <div class="flex items-center gap-3 mt-2 text-sm text-gray-600">
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                  </svg>
                  ${subject.units} units
                </span>
                <span class="text-gray-300">|</span>
                <span class="flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                  Section ${section.name}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Schedule -->
          <div class="mt-4 pt-4 border-t border-blue-200">
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="font-medium text-gray-700">Schedule:</span>
              <span class="text-gray-600">${section.schedule}</span>
            </div>
            <div class="flex items-center gap-2 text-sm mt-2">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span class="font-medium text-gray-700">Available Slots:</span>
              <span class="text-gray-600">${section.slots - (section.enrolled || 0)} remaining</span>
            </div>
          </div>
        </div>
        
        <!-- Warning Note -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
          <div class="flex items-start gap-2">
            <svg class="w-5 h-5 text-amber-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="text-sm text-amber-700">Once enrolled, this subject will be pending for approval. Please make sure the schedule fits your timetable.</p>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex gap-3">
          <button onclick="closeConfirmModal()" 
                  class="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
            Cancel
          </button>
          <button onclick="confirmEnrollment()" 
                  class="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
            Confirm Enrollment
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEditModal() {
  const enrollment = state.editingEnrollment;
  if (!enrollment) return '';

  const allSubjects = [...state.recommendedSubjects, ...state.availableSubjects];
  const selectedSubject = state.editModalSelectedSubject
    ? allSubjects.find(s => s.id === state.editModalSelectedSubject)
    : allSubjects.find(s => s.code === enrollment.subject.code);

  return `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onclick="closeEditModal()">
      <div class="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <!-- Header -->
        <div class="mb-6">
          <h3 class="text-2xl font-bold text-gray-800">Edit Enrollment</h3>
          <p class="text-gray-500 mt-1">Change subject or section before head approval</p>
        </div>

        <!-- Current Info -->
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p class="text-sm font-medium text-blue-900 mb-2">Current:</p>
          <p class="text-lg font-bold text-blue-700">${enrollment.subject.code} - ${enrollment.subject.name}</p>
          <p class="text-sm text-blue-600">Section ${enrollment.section} • ${enrollment.units} units</p>
        </div>

        <!-- Subject Selection -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select New Subject</label>
          <select id="edit-subject-select" onchange="onEditSubjectChange()"
                  class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500">
            <option value="">-- Keep Current Subject --</option>
            ${allSubjects.map(s => `
              <option value="${s.id}" ${s.code === enrollment.subject.code ? 'selected' : ''}>
                ${s.code} - ${s.name || s.title} (${s.units} units)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Section Selection -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
          ${selectedSubject?.sections?.length > 0 ? `
            <div class="space-y-2">
              ${selectedSubject.sections.map(section => `
                <label class="flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50
                  ${state.editModalSelectedSection === section.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
                  <div class="flex items-center gap-3">
                    <input type="radio" name="edit-section" value="${section.id}"
                           onchange="state.editModalSelectedSection = '${section.id}'; render();"
                           ${state.editModalSelectedSection === section.id ? 'checked' : ''}
                           class="w-4 h-4 text-blue-600" />
                    <div>
                      <p class="font-medium text-gray-800">Section ${section.name}</p>
                      <p class="text-sm text-gray-600">${section.schedule || 'TBA'}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-gray-600">${section.enrolled || 0}/${section.slots}</p>
                  </div>
                </label>
              `).join('')}
            </div>
          ` : '<p class="text-gray-500 text-sm">No sections available</p>'}
        </div>

        <!-- Unit Impact -->
        ${state.editModalSelectedSubject ? `
          <div class="mb-6 p-4 ${calculateEditUnitImpact(enrollment, selectedSubject) > 30 ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl">
            <p class="text-sm font-medium">Unit Impact: ${enrollment.units} → ${selectedSubject?.units || 0} units</p>
            <p class="text-sm mt-1">Total: ${calculateEditUnitImpact(enrollment, selectedSubject)} / 30 units
              ${calculateEditUnitImpact(enrollment, selectedSubject) > 30 ? ' ⚠️ EXCEEDS LIMIT!' : ''}
            </p>
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="flex gap-3">
          <button onclick="closeEditModal()"
                  class="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium">
            Cancel
          </button>
          <button onclick="confirmEditEnrollment()"
                  class="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-medium
                  ${!state.editModalSelectedSection || calculateEditUnitImpact(enrollment, selectedSubject) > 30 ? 'opacity-50 cursor-not-allowed' : ''}"
                  ${!state.editModalSelectedSection || calculateEditUnitImpact(enrollment, selectedSubject) > 30 ? 'disabled' : ''}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  `;
}

function getSelectedUnits() {
  return 0; // State.selectedSubjects removed
}

function attachEventListeners() {
  // Event listeners are attached via onclick in the template
}

// Global functions for onclick handlers
window.enrollSubject = function (subjectId, sectionId) {
  console.log('Add to cart - Subject ID:', subjectId, 'Section ID:', sectionId);

  // Find subject
  const subject = state.recommendedSubjects.find(s => s.id == subjectId) || state.availableSubjects.find(s => s.id == subjectId);

  if (!subject) {
    console.error('Subject not found. Available subjects:', state.recommendedSubjects, state.availableSubjects);
    showToast('Subject not found', 'error');
    return;
  }

  // Find the section
  const section = subject.sections?.find(sec => sec.id == sectionId);
  if (!section) {
    showToast('Section not found', 'error');
    return;
  }

  // Check if already in cart
  const alreadyInCart = state.cart.some(item => item.subject.id === subject.id);
  if (alreadyInCart) {
    showToast('Subject already in your enrollment list', 'warning');
    return;
  }

  // Calculate total units including cart items
  const cartUnits = state.cart.reduce((sum, item) => sum + item.subject.units, 0);
  if (state.totalUnits + cartUnits + subject.units > state.maxUnits) {
    showToast(`Adding this subject would exceed the ${state.maxUnits}-unit limit`, 'error');
    return;
  }

  // Add to cart
  state.cart.push({ subject, section });
  showToast(`${subject.code} added to enrollment list`, 'success');
  render();
};

window.removeFromCart = function (subjectId) {
  state.cart = state.cart.filter(item => item.subject.id !== subjectId);
  showToast('Subject removed from enrollment list', 'info');
  render();
};

window.closeCartConfirmModal = function () {
  state.showCartConfirmModal = false;
  render();
};

window.showConfirmAllModal = function () {
  if (state.cart.length === 0) {
    showToast('Please add subjects to your enrollment list first', 'warning');
    return;
  }
  state.showCartConfirmModal = true;
  render();
};

window.confirmAllEnrollments = async function () {
  if (state.cart.length === 0) return;

  // Close modal and show loading
  state.showCartConfirmModal = false;
  render();

  try {
    let successCount = 0;
    let failCount = 0;

    // Process enrollments sequentially to avoid SQLite database locks
    for (const item of state.cart) {
      try {
        const response = await api.post(endpoints.enrollSubject, {
          subject_id: item.subject.id,
          section_id: item.section.id
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (error) {
        console.error('Enrollment error:', error);
        failCount++;
      }
    }

    // Clear cart and reload data
    state.cart = [];
    await loadData();
    render();

    if (failCount === 0) {
      showToast(`Successfully enrolled in ${successCount} subject(s)!`, 'success');
    } else {
      showToast(`Enrolled: ${successCount}, Failed: ${failCount}. Please try again for failed subjects.`, 'warning');
    }

  } catch (error) {
    console.error('Bulk enrollment failed:', error);
    showToast('Failed to process enrollments. Please try again.', 'error');
  }
};

// ============================================================
// EDIT ENROLLMENT FUNCTIONS
// ============================================================

// Calculate total units after edit
function calculateEditUnitImpact(enrollment, newSubject) {
  if (!newSubject) return state.totalUnits;
  const oldUnits = enrollment.units;
  const newUnits = newSubject.units;
  return state.totalUnits - oldUnits + newUnits;
}

// Open edit modal
window.openEditModal = function(enrollmentId) {
  const enrollment = state.enrolledSubjects.find(e => e.id === enrollmentId);
  if (!enrollment) return;

  state.editingEnrollment = enrollment;
  state.editModalSelectedSubject = null;
  state.editModalSelectedSection = null;
  state.showEditModal = true;
  render();
};

// Close edit modal
window.closeEditModal = function() {
  state.editingEnrollment = null;
  state.editModalSelectedSubject = null;
  state.editModalSelectedSection = null;
  state.showEditModal = false;
  render();
};

// Handle subject change in edit modal
window.onEditSubjectChange = function() {
  const select = document.getElementById('edit-subject-select');
  state.editModalSelectedSubject = select.value || null;
  state.editModalSelectedSection = null;
  render();
};

// Confirm edit enrollment
window.confirmEditEnrollment = async function() {
  const enrollment = state.editingEnrollment;
  if (!enrollment || !state.editModalSelectedSection) return;

  // Determine subject ID
  let subjectId = state.editModalSelectedSubject;
  if (!subjectId) {
    const allSubjects = [...state.recommendedSubjects, ...state.availableSubjects];
    const currentSubject = allSubjects.find(s => s.code === enrollment.subject.code);
    if (!currentSubject) {
      showToast('Error: Cannot find current subject', 'error');
      return;
    }
    subjectId = currentSubject.id;
  }

  try {
    const response = await api.put(`${endpoints.myEnrollments}${enrollment.id}/edit/`, {
      subject_id: subjectId,
      section_id: state.editModalSelectedSection
    });

    if (response.success) {
      showToast(response.message || 'Enrollment updated successfully!', 'success');
      closeEditModal();
      await loadData();
      render();
    } else {
      showToast(response.error || 'Failed to update enrollment', 'error');
    }
  } catch (error) {
    console.error('Edit enrollment error:', error);
    const errorMsg = error.error || error.message || 'Failed to update enrollment';
    showToast(errorMsg, 'error');
  }
};

// DROP FUNCTIONALITY DISABLED - Students cannot drop subjects
// window.dropSubject = async function (enrollmentId) {
//   if (!confirm('Are you sure you want to drop this subject?')) return;
//
//   try {
//     // Try API
//     try {
//       await api.post(`${endpoints.myEnrollments}${enrollmentId}/drop/`);
//     } catch (error) {
//       console.log('API drop failed, using mock:', error);
//     }
//
//     // Remove from enrolled (mock)
//     state.enrolledSubjects = state.enrolledSubjects.filter(e => e.id !== enrollmentId);
//     state.totalUnits = state.enrolledSubjects.reduce((sum, e) => sum + (e.units || e.subject?.units || 0), 0);
//
//     showToast('Subject dropped successfully', 'success');
//     render();
//   } catch (error) {
//     console.error('Drop failed:', error);
//     showToast('Failed to drop subject', 'error');
//   }
// };

window.showSchedulePreview = function (subjectId) {
  const subject = state.availableSubjects.find(s => s.id === subjectId);
  state.showSchedulePreview = subject;
  render();
};

window.closeSchedulePreview = function () {
  state.showSchedulePreview = null;
  render();
};

window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
