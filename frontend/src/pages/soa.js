import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { formatCurrency, requireAuth } from '../utils.js';
import { createHeader } from '../components/header.js';
import { Toast } from '../components/Toast.js';
import { ErrorHandler } from '../utils/errorHandler.js';
import { LoadingOverlay } from '../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  paymentBuckets: [],
  paymentHistory: [],
  semester: null
};

async function init() {
  if (!requireAuth()) return;

  await loadData();
  render();
}

async function loadData() {
  try {
    // Load user profile
    const userResponse = await api.get(endpoints.me);
    if (userResponse) {
      state.user = userResponse.data || userResponse;
    }

    // Load payment data from API
    try {
      const paymentsResponse = await api.get(endpoints.myPayments);
      console.log('Payment API response:', paymentsResponse);

      if (paymentsResponse?.data) {
        const data = paymentsResponse.data;

        // Update payment buckets from API
        if (data.buckets && Array.isArray(data.buckets)) {
          state.paymentBuckets = data.buckets.map(b => ({
            month: b.month,
            required: b.required,
            paid: b.paid,
            event_label: b.event_label,
            label: b.event_label || `Month ${b.month}`,
            dueDate: calculateDueDate(b.month) // Generate due dates
          }));
        }

        // Update payment history (recent_transactions)
        if (data.recent_transactions && Array.isArray(data.recent_transactions)) {
          state.paymentHistory = data.recent_transactions.map(t => ({
            id: t.id,
            date: t.processed_at,
            amount: t.amount,
            receipt: t.receipt_number || `OR-${t.id.substring(0, 8)}`,
            monthApplied: 'Multiple', // Transactions can be applied to multiple months
            processedBy: 'Cashier'
          }));
        }

        // Store semester info if available
        state.semester = data.semester || null;
      }
    } catch (error) {
      ErrorHandler.handle(error, 'Loading payment data');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading data');
  }
  state.loading = false;
}

// Helper function to calculate due dates based on month number
function calculateDueDate(month) {
  const startDate = new Date(2025, 7, 15); // August 15, 2025 (semester start)
  const dueDate = new Date(startDate);
  dueDate.setMonth(startDate.getMonth() + (month - 1));
  return dueDate.toISOString().split('T')[0];
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading statement of account...');
    return;
  }

  const totalPaid = state.paymentBuckets.reduce((sum, b) => sum + b.paid, 0);
  const totalRequired = state.paymentBuckets.reduce((sum, b) => sum + b.required, 0);
  const balance = totalRequired - totalPaid;

  app.innerHTML = `
    ${createHeader({
      role: 'STUDENT',
      activePage: 'soa',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-800">Statement of Account</h1>
          <p class="text-gray-600 mt-1">${state.semester || 'Current Semester'}</p>
        </div>
        <button onclick="printSOA()" class="btn-primary flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Print SOA
        </button>
      </div>
      
      <!-- Student Info Card -->
      <div class="card mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p class="text-sm text-gray-500">Student Name</p>
            <p class="font-bold text-gray-800">${state.user?.first_name || 'Juan'} ${state.user?.last_name || 'Dela Cruz'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Student Number</p>
            <p class="font-bold text-gray-800">${state.user?.student_number || '2024-00001'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Program</p>
            <p class="font-bold text-gray-800">${state.user?.program?.name || 'BS Information Technology'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500">Year Level</p>
            <p class="font-bold text-gray-800">1st Year</p>
          </div>
        </div>
      </div>
      
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <p class="text-green-100 text-sm mb-1">Total Paid</p>
          <p class="text-3xl font-bold">${formatCurrency(totalPaid)}</p>
        </div>
        <div class="card bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
          <p class="text-yellow-100 text-sm mb-1">Remaining Balance</p>
          <p class="text-3xl font-bold">${formatCurrency(balance)}</p>
        </div>
        <div class="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <p class="text-blue-100 text-sm mb-1">Total Assessment</p>
          <p class="text-3xl font-bold">${formatCurrency(totalRequired)}</p>
        </div>
      </div>
      
      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column - Payment Buckets & History -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Payment Schedule -->
          <div class="card">
            <h2 class="text-xl font-bold text-gray-800 mb-6">Payment Schedule (6-Month Plan)</h2>
            ${state.paymentBuckets.length === 0 ? `
              <div class="text-center py-12">
                <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <p class="text-gray-500 text-sm">No payment schedule available</p>
                <p class="text-gray-400 text-xs mt-1">Please enroll in a semester to see your payment plan</p>
              </div>
            ` : `
              <div class="space-y-4">
                ${state.paymentBuckets.map(bucket => renderPaymentBucket(bucket)).join('')}
              </div>
            `}
          </div>
          
          <!-- Payment History -->
          <div class="card">
            <h2 class="text-xl font-bold text-gray-800 mb-6">Payment History</h2>
            ${state.paymentHistory.length === 0 ? `
              <p class="text-gray-400 text-center py-8">No payments recorded yet</p>
            ` : `
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied To</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    ${state.paymentHistory.map(payment => {
                      // Look up event label for the month if it's a specific month
                      let monthDisplay = payment.monthApplied;
                      if (payment.monthApplied !== 'Multiple' && !isNaN(payment.monthApplied)) {
                        const bucket = state.paymentBuckets.find(b => b.month === parseInt(payment.monthApplied));
                        if (bucket && bucket.event_label) {
                          monthDisplay = `Month ${payment.monthApplied}: ${bucket.event_label}`;
                        } else {
                          monthDisplay = `Month ${payment.monthApplied}`;
                        }
                      }
                      return `
                      <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3 text-sm text-gray-800">${formatDate(payment.date)}</td>
                        <td class="px-4 py-3 text-sm font-mono text-blue-600">${payment.receipt}</td>
                        <td class="px-4 py-3 text-sm text-gray-600">${monthDisplay}</td>
                        <td class="px-4 py-3 text-sm font-medium text-green-600 text-right">${formatCurrency(payment.amount)}</td>
                      </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
        
        <!-- Right Column - Quick Info -->
        <div class="space-y-6">
          <!-- Payment Progress -->
          <div class="card">
            <h3 class="font-bold text-gray-800 mb-4">Overall Progress</h3>
            <div class="text-center mb-4">
              <div class="relative inline-flex items-center justify-center">
                <svg class="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="8" fill="none" class="text-gray-200"></circle>
                  <circle cx="64" cy="64" r="56" stroke="currentColor" stroke-width="8" fill="none" class="text-blue-600" 
                          stroke-dasharray="${2 * Math.PI * 56}" 
                          stroke-dashoffset="${2 * Math.PI * 56 * (1 - totalPaid / totalRequired)}">
                  </circle>
                </svg>
                <span class="absolute text-2xl font-bold">${Math.round((totalPaid / totalRequired) * 100)}%</span>
              </div>
            </div>
            <div class="text-center text-sm text-gray-500">
              ${formatCurrency(totalPaid)} of ${formatCurrency(totalRequired)} paid
            </div>
          </div>
          
          <!-- Exam Permit Status -->
          <div class="card">
            <h3 class="font-bold text-gray-800 mb-4">Exam Permit Status</h3>
            <div class="space-y-2">
              ${renderExamPermitStatus('Prelims', 1)}
              ${renderExamPermitStatus('Midterms', 2)}
              ${renderExamPermitStatus('Prefinals', 4)}
              ${renderExamPermitStatus('Finals', 6)}
            </div>
          </div>
          
          <!-- Help Card -->
          <div class="card bg-blue-50 border border-blue-200">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div>
                <p class="font-medium text-blue-800">Need Help?</p>
                <p class="text-sm text-blue-600 mt-1">Visit the Cashier's Office for payment inquiries or call (02) 1234-5678.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;
}



function renderPaymentBucket(bucket) {
  const percentage = Math.min(100, (bucket.paid / bucket.required) * 100);
  const isComplete = percentage >= 100;
  const isPartial = percentage > 0 && percentage < 100;
  const isPastDue = new Date(bucket.dueDate) < new Date() && !isComplete;

  return `
    <div class="p-4 rounded-xl ${isPastDue ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center ${isComplete ? 'bg-green-500' : isPartial ? 'bg-yellow-500' : 'bg-gray-300'}">
            ${isComplete ? `
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            ` : `
              <span class="text-white font-bold">${bucket.month}</span>
            `}
          </div>
          <div>
            <p class="font-medium text-gray-800">${bucket.event_label ? `Month ${bucket.month}: ${bucket.event_label}` : `Month ${bucket.month}`}</p>
            <p class="text-xs text-gray-500">Due: ${formatDate(bucket.dueDate)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold ${isComplete ? 'text-green-600' : isPastDue ? 'text-red-600' : 'text-gray-800'}">${formatCurrency(bucket.paid)}</p>
          <p class="text-xs text-gray-500">of ${formatCurrency(bucket.required)}</p>
        </div>
      </div>
      <div class="progress-bar h-2">
        <div class="progress-bar-fill ${isComplete ? 'bg-green-500' : isPartial ? 'bg-yellow-500' : 'bg-gray-300'}" style="width: ${percentage}%"></div>
      </div>
      ${isPastDue ? '<p class="text-red-600 text-xs mt-2 font-medium">⚠️ Past due</p>' : ''}
    </div>
  `;
}

function renderExamPermitStatus(exam, monthRequired) {
  const bucket = state.paymentBuckets.find(b => b.month === monthRequired);
  const isUnlocked = bucket && bucket.paid >= bucket.required;

  return `
    <div class="flex items-center justify-between p-3 rounded-xl ${isUnlocked ? 'bg-green-50' : 'bg-gray-100'}">
      <div class="flex items-center gap-2">
        ${isUnlocked ? `
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        ` : `
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        `}
        <span class="${isUnlocked ? 'text-green-700 font-medium' : 'text-gray-500'}">${exam}</span>
      </div>
      <span class="text-xs ${isUnlocked ? 'text-green-600' : 'text-gray-400'}">
        ${isUnlocked ? 'Unlocked' : `Pay Month ${monthRequired}`}
      </span>
    </div>
  `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Global functions
window.printSOA = function () {
  window.print();
};

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
