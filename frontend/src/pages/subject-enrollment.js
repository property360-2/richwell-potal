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
  totalUnits: 0,
  maxUnits: 30,
  hasPaymentHold: false,
  showPaymentHoldModal: false,
  showSchedulePreview: null
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
      state.user = userResponse;
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
        // Check if Month 1 is paid - if not, student cannot enroll
        state.hasPaymentHold = !recommendedResponse.data.can_enroll;
      } else if (recommendedResponse?.length) {
        state.recommendedSubjects = recommendedResponse;
        state.hasPaymentHold = true; // Default to blocked
      } else {
        state.recommendedSubjects = mockRecommendedSubjects;
        state.hasPaymentHold = true; // Default to blocked
      }
    } catch (err) {
      console.log('Failed to load recommended subjects:', err);
      showToast('Error loading subjects: ' + (err.message || 'Unknown error'), 'error');
      state.recommendedSubjects = mockRecommendedSubjects;
      state.hasPaymentHold = true; // Default to blocked when API fails
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
          status: s.status
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

  } catch (error) {
    console.error('Failed to load data:', error);
    // Use mock data as fallback
    state.recommendedSubjects = mockRecommendedSubjects;
    state.availableSubjects = mockAvailableSubjects;
    state.enrolledSubjects = mockEnrolledSubjects;
    state.hasPaymentHold = false;
  }
  state.loading = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = renderLoading();
    return;
  }

  app.innerHTML = `
    ${renderHeader()}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Subject Enrollment</h1>
        <p class="text-gray-600 mt-1">Select subjects for the current semester</p>
      </div>
      
      <!-- Payment Required Banner -->
      ${state.hasPaymentHold ? `
        <div class="card bg-gradient-to-r from-yellow-500 to-orange-500 text-white mb-8">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-bold">💳 Payment Required</h2>
              <p class="mt-1 text-yellow-100">Please pay Month 1 at the Cashier's Office before you can enroll in subjects.</p>
              <p class="mt-2 text-sm text-yellow-200">Once your payment is confirmed, you can return to this page to select and enroll in your subjects.</p>
            </div>
          </div>
        </div>
      ` : ''}
      
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
        
        <!-- Right Column - Enrollment Summary -->
        <div class="space-y-6">
          <!-- Currently Enrolled -->
          <div class="card sticky top-24">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-bold text-gray-800">Currently Enrolled</h3>
              <span class="text-sm text-gray-500">${state.totalUnits} / ${state.maxUnits} units</span>
            </div>
            ${state.enrolledSubjects.length === 0 ? `
              <p class="text-gray-400 text-center py-4">No enrolled subjects yet</p>
            ` : `
              <div class="space-y-2">
                ${state.enrolledSubjects.map(enrollment => renderEnrolledSubject(enrollment)).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    </main>
    
    <!-- Payment Hold Modal -->
    ${state.showPaymentHoldModal ? renderPaymentHoldModal() : ''}
    
    <!-- Schedule Preview Modal -->
    ${state.showSchedulePreview ? renderSchedulePreviewModal() : ''}
  `;

  attachEventListeners();
}

function renderHeader() {
  return `
    <header class="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img src="/logo.jpg" alt="Richwell Colleges" class="w-10 h-10 rounded-lg object-cover">
          <span class="text-xl font-bold gradient-text">Richwell Colleges</span>
        </div>
        
        <nav class="hidden md:flex items-center gap-6">
          <a href="/student-dashboard.html" class="text-gray-600 hover:text-gray-900">Dashboard</a>
          <a href="/subject-enrollment.html" class="text-blue-600 font-medium">Enroll Subjects</a>
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
  const isNearLimit = currentUnits >= state.maxUnits - 3;
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
  const isSelected = false; // Instant enroll has no cart
  const isEnrolled = state.enrolledSubjects.find(e => e.subject?.code === subject.code);
  const canAdd = subject.prerequisite_met !== false && !isSelected && !isEnrolled && !state.hasPaymentHold;
  const wouldExceedLimit = (state.totalUnits + getSelectedUnits() + subject.units) > state.maxUnits;

  return `
    <div class="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors ${!canAdd ? 'opacity-60' : ''}">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="font-mono text-sm font-bold text-blue-600">${subject.code}</span>
            ${isRecommended ? '<span class="badge badge-success text-xs">Recommended</span>' : ''}
            ${isEnrolled ? '<span class="badge badge-info text-xs">Enrolled</span>' : ''}
            ${!subject.prerequisite_met && subject.prerequisite ? `<span class="badge badge-error text-xs">Prereq: ${subject.prerequisite}</span>` : ''}
            ${state.hasPaymentHold ? '<span class="badge badge-warning text-xs">Payment Required</span>' : ''}
          </div>
          <p class="font-medium text-gray-800">${subject.name}</p>
          <p class="text-sm text-gray-500">${subject.units} units</p>
          
          <!-- Sections -->
          <div class="mt-3 space-y-2">
            ${subject.sections?.map(section => `
              <div class="flex items-center justify-between text-sm p-2 bg-white rounded-lg">
                <div class="flex items-center gap-2">
                  <span class="font-medium">Section ${section.name}</span>
                  <span class="text-gray-400">|</span>
                  <span class="text-gray-600">${section.schedule}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">${section.enrolled}/${section.slots}</span>
                  ${canAdd && !wouldExceedLimit ? `
                    <button onclick="enrollSubject('${subject.id}', '${section.id}')" 
                            class="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                      Enroll
                    </button>
                  ` : state.hasPaymentHold ? `
                    <span class="px-3 py-1 text-xs font-medium text-gray-400 bg-gray-200 rounded-lg cursor-not-allowed">
                      Locked
                    </span>
                  ` : ''}
                </div>
              </div>
            `).join('') || ''}
          </div>
        </div>
      </div>
    </div>
  `;
}



function renderEnrolledSubject(enrollment) {
  return `
    <div class="flex items-center justify-between p-3 bg-green-50 rounded-xl">
      <div>
        <p class="font-medium text-gray-800">${enrollment.subject?.code} - ${enrollment.subject?.name}</p>
        <p class="text-xs text-gray-500">${enrollment.schedule} • ${enrollment.units} units</p>
      </div>
      <button onclick="dropSubject(${enrollment.id})" class="text-xs text-red-600 hover:text-red-700 font-medium">
        Drop
      </button>
    </div>
  `;
}

function renderPaymentHoldModal() {
  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closePaymentHoldModal()">
      <div class="bg-white rounded-2xl p-6 max-w-md mx-4" onclick="event.stopPropagation()">
        <div class="text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-800 mb-2">Payment Hold</h3>
          <p class="text-gray-600 mb-6">You must pay Month 1 before enrolling in subjects. Please visit the Cashier's Office to process your payment.</p>
          <div class="flex gap-3">
            <button onclick="closePaymentHoldModal()" class="flex-1 btn-secondary">Close</button>
            <a href="/soa.html" class="flex-1 btn-primary text-center">View SOA</a>
          </div>
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

function getSelectedUnits() {
  return 0; // State.selectedSubjects removed
}

function attachEventListeners() {
  // Event listeners are attached via onclick in the template
}

// Global functions for onclick handlers
window.enrollSubject = async function (subjectId, sectionId) {
  if (state.hasPaymentHold) {
    state.showPaymentHoldModal = true;
    render();
    return;
  }

  // Find subject to check units
  const subject = state.recommendedSubjects.find(s => s.id === subjectId) || state.availableSubjects.find(s => s.id === subjectId);
  if (!subject) return;

  if (state.totalUnits + subject.units > state.maxUnits) {
    showToast('Enrolling would exceed max units', 'error');
    return;
  }

  if (!confirm(`Are you sure you want to enroll in ${subject.code} - ${subject.name}?`)) return;

  try {
    const response = await api.post(endpoints.enrollSubject, {
      subject_id: subjectId,
      section_id: sectionId
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        showToast('Enrollment successful!', 'success');
        loadData(); // Reload all data
      } else {
        showToast(data.error || 'Enrollment failed', 'error');
      }
    } else {
      const data = await response.json().catch(() => ({}));
      showToast(data.error || 'Enrollment failed', 'error');
    }
  } catch (error) {
    console.error('Enrollment failed:', error);
    showToast('Failed to enroll. Please try again.', 'error');
  }
};

window.dropSubject = async function (enrollmentId) {
  if (!confirm('Are you sure you want to drop this subject?')) return;

  try {
    // Try API
    try {
      await api.post(`${endpoints.myEnrollments}${enrollmentId}/drop/`);
    } catch (error) {
      console.log('API drop failed, using mock:', error);
    }

    // Remove from enrolled (mock)
    state.enrolledSubjects = state.enrolledSubjects.filter(e => e.id !== enrollmentId);
    state.totalUnits = state.enrolledSubjects.reduce((sum, e) => sum + (e.units || e.subject?.units || 0), 0);

    showToast('Subject dropped successfully', 'success');
    render();
  } catch (error) {
    console.error('Drop failed:', error);
    showToast('Failed to drop subject', 'error');
  }
};

window.closePaymentHoldModal = function () {
  state.showPaymentHoldModal = false;
  render();
};

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
