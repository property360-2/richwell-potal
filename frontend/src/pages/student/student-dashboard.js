/**
 * Student Dashboard Page
 * 
 * Refactored to use modular components from the atomic architecture.
 */
import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { formatCurrency, requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';
import { createErrorState, parseApiError } from '../../components/ErrorState.js';

// Import modular components
import { renderStatCard, renderStatCardGrid } from '../../molecules/cards/StatCard.js';
import { renderBanner, renderAlert } from '../../molecules/feedback/Alert.js';
import { Icon } from '../../atoms/icons/Icon.js';
import { renderBadge } from '../../atoms/badges/Badge.js';
import { renderChangePasswordModal } from '../../organisms/index.js';

// State
const state = {
  user: null,
  loading: true,
  error: null,
  showChangePasswordModal: false,
  month1Paid: false,
  totalPaid: 0,
  totalRequired: 0,
  monthlyCommitment: 0,
  paymentBuckets: [],
  enrollmentStatus: 'N/A',
  enrolledUnits: 0,
  maxUnits: 30,
  programCode: null,
  activeSemester: null
};

// ============================================================
// INITIALIZATION
// ============================================================

async function init() {
  if (!requireAuth()) return;

  state.loading = true;
  state.error = null;
  await loadUserProfile();
  render();
}

window.retryLoadData = async function () {
  await init();
};

// ============================================================
// DATA LOADING
// ============================================================

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      state.user = response.data || response;
    }

    // Load enrollment data
    try {
      const enrollmentResponse = await api.get(endpoints.myEnrollment);
      if (enrollmentResponse?.data) {
        state.enrollmentStatus = enrollmentResponse.data.status || 'N/A';
        state.programCode = enrollmentResponse.data.program_code || null;
        if (enrollmentResponse.data.semester) {
          state.activeSemester = enrollmentResponse.data.semester;
        }
      }
    } catch (error) {
      console.log('Enrollment API failed:', error);
      state.enrollmentStatus = 'N/A';
    }

    // Load subject enrollments
    try {
      const subjectsResponse = await api.get(endpoints.myEnrollments);
      if (subjectsResponse?.data) {
        state.enrolledUnits = subjectsResponse.data.enrolled_units || 0;
      }
    } catch (error) {
      console.log('Subject enrollments API failed:', error);
      state.enrolledUnits = 0;
    }

    // Load payment data
    try {
      const paymentsResponse = await api.get(endpoints.myPayments);
      if (paymentsResponse?.data?.buckets) {
        state.paymentBuckets = paymentsResponse.data.buckets.map(b => ({
          month: b.month,
          required: b.required,
          paid: b.paid,
          event_label: b.event_label,
          label: b.event_label || `Month ${b.month}`
        }));

        const month1 = state.paymentBuckets.find(b => b.month === 1);
        state.month1Paid = month1 ? month1.paid >= month1.required : false;
        state.totalPaid = state.paymentBuckets.reduce((sum, b) => sum + b.paid, 0);
        state.totalRequired = state.paymentBuckets.reduce((sum, b) => sum + b.required, 0);
        state.monthlyCommitment = state.paymentBuckets.length > 0 ? state.paymentBuckets[0].required : 0;
      } else {
        state.month1Paid = false;
      }
    } catch (error) {
      console.log('Payment API failed:', error);
      state.month1Paid = false;
      state.totalPaid = 0;
      state.totalRequired = 30000;
    }

    state.loading = false;
    state.error = null;
  } catch (error) {
    console.error('Failed to load profile:', error);
    state.loading = false;
    state.error = error;
  }
}

// ============================================================
// MAIN RENDER
// ============================================================

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading your dashboard...');
    return;
  }

  // Error state
  if (state.error) {
    const errorInfo = parseApiError(state.error);
    app.innerHTML = `
      ${createHeader({
      role: 'STUDENT',
      activePage: 'student-dashboard',
      user: state.user
    })}
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="card">
          ${renderAlert({
      title: errorInfo.title || 'Unable to load dashboard',
      message: errorInfo.message || 'Please try again later.',
      variant: 'danger',
      action: { label: 'Retry', onClick: 'retryLoadData()' }
    })}
        </div>
      </main>
    `;
    return;
  }

  // Determine student type
  const profile = state.user?.student_profile;
  let studentType = 'Regular';
  if (profile?.overload_approved) studentType = 'Overloaded';
  else if (profile?.is_irregular) studentType = 'Irregular';

  app.innerHTML = `
    ${createHeader({
    role: 'STUDENT',
    activePage: 'student-dashboard',
    user: state.user
  })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Welcome back, ${state.user?.first_name || 'Student'}!</h1>
        <p class="text-gray-600 mt-1">Here's your academic overview</p>
      </div>
      
      <!-- Stats Grid - Using StatCardGrid component -->
      ${renderStatCardGrid([
    {
      label: 'Student Number',
      value: state.user?.student_number || 'Pending',
      iconName: 'user',
      color: 'blue'
    },
    {
      label: 'Student Type',
      value: studentType,
      iconName: 'user',
      color: 'indigo'
    },
    {
      label: 'Program',
      value: state.programCode || profile?.program_code || 'N/A',
      iconName: 'book',
      color: 'blue'
    },
    {
      label: 'Curriculum',
      value: profile?.curriculum_code || 'N/A',
      iconName: 'book',
      color: 'indigo'
    },
    {
      label: 'Home Section',
      value: profile?.home_section_name || 'None',
      iconName: 'users',
      color: 'purple'
    },
    {
      label: 'Enrollment Status',
      value: state.enrollmentStatus,
      iconName: 'success',
      color: 'green'
    }
  ], { columns: 4 })}

      <!-- Admission Status Banner -->
      <div class="mt-8">
        ${renderAdmissionStatusBanner()}
      </div>

      <!-- Payment Pending Banner -->
      ${renderPaymentPendingBanner()}
      
      <!-- Main Content -->
      <div class="grid grid-cols-1 gap-8">
        <div class="w-full space-y-6">
          ${renderPaymentProgressCard()}
        </div>
      </div>
    </main>

    ${renderChangePasswordModal({
    isOpen: state.showChangePasswordModal,
    onClose: 'closeChangePasswordModal',
    onSubmit: 'submitPasswordChange',
    onToggleVisibility: 'togglePasswordVisibility'
  })}
  `;
}

// ============================================================
// RENDER COMPONENTS
// ============================================================

function renderAdmissionStatusBanner() {
  const isApproved = state.user?.student_number &&
    ['ACTIVE', 'ENROLLED', 'PENDING_PAYMENT', 'COMPLETED'].includes(state.enrollmentStatus);

  if (!isApproved) {
    return renderBanner({
      message: 'Account Pending – Your enrollment application is being reviewed by the Admission Office. You cannot enroll in subjects until your account is approved.',
      variant: 'warning',
      className: 'mb-8'
    });
  } else if (state.enrolledUnits === 0) {
    return `
      <div class="bg-green-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-xl">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              ${Icon('success', { size: 'md', className: 'text-white' })}
            </div>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-green-800">Account Approved – Student ID: ${state.user.student_number}</h3>
            <p class="text-sm text-green-700 mt-2">
              Your enrollment application has been approved! You are now eligible to enroll in subjects.
            </p>
            <a href="/pages/subject-enrollment.html" class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
              ${Icon('plus', { size: 'sm' })}
              Enroll in Subjects
            </a>
          </div>
        </div>
      </div>
    `;
  }
  return '';
}

function renderPaymentPendingBanner() {
  if (state.month1Paid) return '';

  const month1Bucket = state.paymentBuckets.find(b => b.month === 1);
  const month1Label = month1Bucket?.event_label ? `Month 1: ${month1Bucket.event_label}` : 'Month 1';

  return `
    <div class="card bg-gradient-to-r from-blue-500 to-indigo-500 text-white mb-8">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          ${Icon('currency', { size: 'lg' })}
        </div>
        <div>
          <h2 class="text-xl font-bold">Payment Pending</h2>
          <p class="mt-1 text-blue-100">You can enroll in subjects now! Your enrollments will be marked as pending until ${month1Label} payment is received.</p>
          <p class="mt-2 text-sm text-blue-200">Please pay ${month1Label} (${formatCurrency(state.monthlyCommitment)}) at the Cashier's Office.</p>
        </div>
      </div>
    </div>
  `;
}

function renderPaymentProgressCard() {
  return `
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">Payment Progress</h2>
        <div class="flex items-center gap-2">
          ${renderBadge({ text: state.activeSemester?.name || 'Current Semester', color: 'primary', size: 'sm' })}
          <a href="/pages/student/soa.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            View SOA
            ${Icon('chevronRight', { size: 'sm' })}
          </a>
        </div>
      </div>
      
      <!-- Payment Summary -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="text-center p-4 bg-green-50 rounded-xl">
          <p class="text-2xl font-bold text-green-600">${formatCurrency(state.totalPaid)}</p>
          <p class="text-sm text-green-700">Total Paid</p>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-xl">
          <p class="text-2xl font-bold text-blue-600">${formatCurrency(state.monthlyCommitment)}</p>
          <p class="text-sm text-blue-700">Monthly Commitment</p>
        </div>
      </div>
      
      <!-- 6 Month Buckets -->
      <div class="space-y-4">
        ${state.paymentBuckets.map(bucket => renderPaymentBucket(bucket)).join('')}
      </div>
    </div>
  `;
}

function isMonthPaid(month) {
  const bucket = state.paymentBuckets.find(b => b.month === month);
  return bucket ? bucket.paid >= bucket.required : false;
}

function renderPaymentBucket(bucket) {
  const percentage = Math.min(100, (bucket.paid / bucket.required) * 100);
  const isComplete = percentage >= 100;
  const isPartial = percentage > 0 && percentage < 100;

  let statusBadge, statusText;
  if (isComplete) {
    statusBadge = 'bg-green-100 text-green-800';
    statusText = 'Complete';
  } else if (isPartial) {
    statusBadge = 'bg-yellow-100 text-yellow-800';
    statusText = 'Partial';
  } else {
    statusBadge = 'bg-red-100 text-red-800';
    statusText = 'Pending';
  }

  const label = bucket.event_label
    ? `Month ${bucket.month}: ${bucket.event_label}`
    : `Month ${bucket.month}`;

  return `
    <div class="flex items-center gap-4">
      <div class="w-40 text-sm font-medium text-gray-600">${label}</div>
      <div class="flex-1">
        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            class="h-full ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-blue-500'} transition-all duration-500"
            style="width: ${percentage}%"
          ></div>
        </div>
      </div>
      <div class="w-32 text-right text-sm">
        <span class="${isComplete ? 'text-green-600 font-semibold' : 'text-gray-600'}">${formatCurrency(bucket.paid)}</span>
      </div>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}">
        ${statusText}
      </span>
    </div>
  `;
}



// ============================================================
// CHANGE PASSWORD MODAL
// ============================================================

window.openChangePasswordModal = function () {
  state.showChangePasswordModal = true;
  render();
};

window.closeChangePasswordModal = function () {
  state.showChangePasswordModal = false;
  render();
};

window.submitPasswordChange = async function (event) {
  event.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    Toast.error('Please fill in all fields');
    return;
  }

  if (newPassword.length < 6) {
    Toast.error('New password must be at least 6 characters');
    return;
  }

  if (newPassword !== confirmPassword) {
    Toast.error('New passwords do not match');
    return;
  }

  Toast.info('Updating password...');

  try {
    const response = await api.post(endpoints.changePassword, {
      current_password: currentPassword,
      new_password: newPassword
    });

    const data = await response.json();

    if (response.ok && data?.success) {
      Toast.success('Password changed successfully! Please login again.');
      closeChangePasswordModal();
      setTimeout(() => {
        TokenManager.clearTokens();
        window.location.href = '/pages/auth/login.html';
      }, 2000);
    } else {
      Toast.error(data?.error || 'Failed to change password');
    }
  } catch (error) {
    console.error('Password change error:', error);
    Toast.error(error?.message || 'Failed to change password. Please try again.');
  }
};


window.togglePasswordVisibility = function (inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    button.innerHTML = Icon('eye', { size: 'md' });
  } else {
    input.type = 'password';
    button.innerHTML = Icon('eye', { size: 'md' });
  }
};

// ============================================================
// INITIALIZE
// ============================================================

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
