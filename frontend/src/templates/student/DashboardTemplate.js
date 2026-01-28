/**
 * Student Dashboard Template
 * 
 * Modular implementation of the student dashboard page.
 * Uses atomic components to replace the monolithic render function.
 */

import { BaseComponent, SIS, mountComponents } from '../../../core/index.js';
import { Icon, LoadingOverlay } from '../../../atoms/index.js';
import { renderStatCard, renderStatCardGrid, renderAlert, renderBanner } from '../../../molecules/index.js';
import { renderPageHeader } from '../../../organisms/index.js';
import { renderPaymentBuckets } from '../../../organisms/domain/payments/PaymentBuckets.js';

/**
 * Render dashboard stat cards
 */
function renderDashboardStats(user, enrollmentStatus, programCode) {
    const profile = user?.student_profile;

    // Determine student type
    let studentType = 'Regular';
    if (profile?.overload_approved) studentType = 'Overloaded';
    else if (profile?.is_irregular) studentType = 'Irregular';

    const cards = [
        {
            label: 'Student Number',
            value: user?.student_number || 'Pending',
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
            value: programCode || profile?.program_code || 'N/A',
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
            value: enrollmentStatus,
            iconName: 'success',
            color: 'green'
        }
    ];

    return renderStatCardGrid(cards, { columns: 4 });
}

/**
 * Render admission status banner
 */
function renderAdmissionBanner(user, enrollmentStatus, enrolledUnits) {
    const isApproved = user?.student_number &&
        (enrollmentStatus === 'ACTIVE' || enrollmentStatus === 'ENROLLED');

    if (!isApproved) {
        return renderBanner({
            message: 'Account Pending – Your enrollment application is being reviewed by the Admission Office.',
            variant: 'warning',
            className: 'mb-8'
        });
    } else if (enrolledUnits === 0) {
        return `
      <div class="bg-green-50 border-l-4 border-green-400 p-6 mb-8 rounded-r-xl">
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0">
            ${Icon('success', { size: 'lg', className: 'text-green-400' })}
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-green-800">Account Approved – Student ID: ${user.student_number}</h3>
            <p class="text-sm text-green-700 mt-2">Your enrollment application has been approved! You can now enroll in subjects.</p>
            <a href="/subject-enrollment.html" class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
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

/**
 * Render payment pending banner
 */
function renderPaymentPendingBanner(month1Paid, monthlyCommitment, month1Label) {
    if (month1Paid) return '';

    return `
    <div class="card bg-gradient-to-r from-blue-500 to-indigo-500 text-white mb-8">
      <div class="flex items-start gap-4">
        <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          ${Icon('currency', { size: 'lg' })}
        </div>
        <div>
          <h2 class="text-xl font-bold">Payment Pending</h2>
          <p class="mt-1 text-blue-100">You can enroll in subjects now! Your enrollments will be marked as pending until ${month1Label} payment is received.</p>
          <p class="mt-2 text-sm text-blue-200">Please pay ${month1Label} (${formatCurrency(monthlyCommitment)}) at the Cashier's Office.</p>
        </div>
      </div>
    </div>
  `;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

/**
 * Render complete student dashboard
 */
export function renderStudentDashboardTemplate({
    user = null,
    loading = false,
    error = null,
    enrollmentStatus = 'N/A',
    programCode = null,
    enrolledUnits = 0,
    paymentBuckets = [],
    totalPaid = 0,
    monthlyCommitment = 0,
    month1Paid = false,
    activeSemester = null,
    headerHtml = ''
}) {
    if (loading) {
        return LoadingOverlay('Loading your dashboard...');
    }

    if (error) {
        return `
      ${headerHtml}
      <main class="max-w-7xl mx-auto px-4 py-8">
        <div class="card">
          ${renderAlert({
            title: 'Unable to load dashboard',
            message: error.message || 'Please try again later.',
            variant: 'danger',
            action: { label: 'Retry', onClick: 'window.retryLoadData()' }
        })}
        </div>
      </main>
    `;
    }

    // Month 1 label
    const month1Bucket = paymentBuckets.find(b => b.month === 1);
    const month1Label = month1Bucket?.event_label ? `Month 1: ${month1Bucket.event_label}` : 'Month 1';

    return `
    ${headerHtml}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Welcome back, ${user?.first_name || 'Student'}!</h1>
        <p class="text-gray-600 mt-1">Here's your academic overview</p>
      </div>
      
      <!-- Stats Grid -->
      ${renderDashboardStats(user, enrollmentStatus, programCode)}
      
      <!-- Admission Status Banner -->
      <div class="mt-8">
        ${renderAdmissionBanner(user, enrollmentStatus, enrolledUnits)}
      </div>
      
      <!-- Payment Pending Banner -->
      ${renderPaymentPendingBanner(month1Paid, monthlyCommitment, month1Label)}
      
      <!-- Main Content -->
      <div class="grid grid-cols-1 gap-8">
        ${renderPaymentBuckets({
        buckets: paymentBuckets,
        totalPaid,
        monthlyCommitment,
        semesterName: activeSemester?.name || 'Current Semester',
        showPermits: true
    })}
      </div>
    </main>
  `.trim();
}

/**
 * StudentDashboardTemplate Component Class
 */
export class StudentDashboardTemplate extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderStudentDashboardTemplate(this.props);
        mountComponents(this.el);
    }

    update(props) {
        Object.assign(this.props, props);
        this.render();
    }
}

// Register with SIS
SIS.register('StudentDashboardTemplate', StudentDashboardTemplate);

export default StudentDashboardTemplate;
