/**
 * PaymentBuckets Domain Organism
 * 
 * Displays payment progress with 6-month buckets and permit status.
 * Used in student dashboard and cashier views.
 */

import { BaseComponent, SIS } from '../../../core/index.js';
import { Icon, renderBadge } from '../../../atoms/index.js';

/**
 * Format currency to PHP
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0
    }).format(amount || 0);
}

/**
 * Render payment bucket progress bar
 */
function renderBucketRow(bucket) {
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
        <span class="${isComplete ? 'text-green-600 font-semibold' : 'text-gray-600'}">
          ${formatCurrency(bucket.paid)}
        </span>
      </div>
      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}">
        ${statusText}
      </span>
    </div>
  `;
}

/**
 * Render permit status item
 */
function renderPermitItem(label, isUnlocked) {
    return `
    <div class="flex items-center justify-between p-3 rounded-xl ${isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}">
      <div class="flex items-center gap-3">
        ${isUnlocked ? `
          <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            ${Icon('check', { size: 'sm', className: 'text-white' })}
          </div>
        ` : `
          <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            ${Icon('lock', { size: 'sm', className: 'text-gray-500' })}
          </div>
        `}
        <span class="font-medium ${isUnlocked ? 'text-green-700' : 'text-gray-500'}">${label}</span>
      </div>
      ${isUnlocked ? `
        <button class="text-xs text-green-600 font-medium hover:underline">Print</button>
      ` : `
        <span class="text-xs text-gray-400">Locked</span>
      `}
    </div>
  `;
}

/**
 * Render payment buckets component
 */
export function renderPaymentBuckets({
    buckets = [],
    totalPaid = 0,
    monthlyCommitment = 0,
    semesterName = 'Current Semester',
    showPermits = true,
    className = ''
}) {
    // Calculate permit unlocks based on bucket payments
    const getPermitStatus = (month) => {
        const bucket = buckets.find(b => b.month === month);
        return bucket ? bucket.paid >= bucket.required : false;
    };

    const permitsHtml = showPermits ? `
    <div class="space-y-3 mb-6">
      <h3 class="text-lg font-semibold text-gray-800">Permit Status</h3>
      ${renderPermitItem('Subject Enrollment', getPermitStatus(1))}
      ${renderPermitItem('Chapter Test', getPermitStatus(2))}
      ${renderPermitItem('Prelims', getPermitStatus(3))}
      ${renderPermitItem('Midterms', getPermitStatus(4))}
      ${renderPermitItem('Prefinals', getPermitStatus(5))}
      ${renderPermitItem('Finals', getPermitStatus(6))}
    </div>
  ` : '';

    const bucketsHtml = buckets.length > 0
        ? buckets.map(b => renderBucketRow(b)).join('')
        : '<p class="text-gray-500 text-center py-4">No payment data available</p>';

    return `
    <div class="card ${className}">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">Payment Progress</h2>
        <div class="flex items-center gap-2">
          <span class="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium">
            ${semesterName}
          </span>
          <a href="/pages/student/soa.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
            View SOA
            ${Icon('chevronRight', { size: 'sm' })}
          </a>
        </div>
      </div>
      
      <!-- Payment Summary -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="text-center p-4 bg-green-50 rounded-xl">
          <p class="text-2xl font-bold text-green-600">${formatCurrency(totalPaid)}</p>
          <p class="text-sm text-green-700">Total Paid</p>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-xl">
          <p class="text-2xl font-bold text-blue-600">${formatCurrency(monthlyCommitment)}</p>
          <p class="text-sm text-blue-700">Monthly Commitment</p>
        </div>
      </div>
      
      ${permitsHtml}
      
      <!-- Buckets -->
      <div class="space-y-4">
        ${bucketsHtml}
      </div>
    </div>
  `.trim();
}

/**
 * PaymentBuckets Component Class
 */
export class PaymentBuckets extends BaseComponent {
    init() {
        this.render();
    }

    render() {
        this.el.innerHTML = renderPaymentBuckets(this.props);
    }

    setBuckets(buckets) {
        this.props.buckets = buckets;
        this.render();
    }
}

// Register with SIS
SIS.register('PaymentBuckets', PaymentBuckets);

export default PaymentBuckets;
