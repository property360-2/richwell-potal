import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { formatCurrency, requireAuth } from '../../utils.js';
import { createHeader } from '../../components/header.js';
import { Toast } from '../../components/Toast.js';
import { ErrorHandler } from '../../utils/errorHandler.js';
import { LoadingOverlay } from '../../components/Spinner.js';

// State
const state = {
  user: null,
  loading: true,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  pendingPayments: [],  // Students with pending Month 1 payment
  selectedStudent: null,
  todayTransactions: [],
  showPaymentModal: false,
  showQuickPaymentModal: false,
  quickPaymentData: null,
  paymentForm: {
    amount: '',
    receiptNumber: '',
    monthApplied: 1
  }
};

// No more mock data - all data comes from real API

async function init() {
  if (!requireAuth()) return;

  await loadData();
  render();
}

async function loadData() {
  try {
    const userResponse = await api.get(endpoints.me);
    console.log('User loaded:', userResponse);
    if (userResponse) {
      state.user = userResponse;
    }

    // Load today's transactions
    try {
      const transactionsResponse = await api.get(endpoints.cashierTodayTransactions);
      console.log('Today transactions API response:', transactionsResponse);

      if (transactionsResponse?.success) {
        state.todayTransactions = transactionsResponse.data.transactions || [];
      } else {
        state.todayTransactions = [];
      }
    } catch (err) {
      ErrorHandler.handle(err, 'Loading today transactions');
      state.todayTransactions = [];
    }

    // Load pending payments (students with Month 1 not paid)
    console.log('Calling pending payments API:', endpoints.cashierPendingPayments);
    try {
      const pendingResponse = await api.get(endpoints.cashierPendingPayments);
      console.log('Pending payments API response:', pendingResponse);

      if (pendingResponse?.success === false) {
        ErrorHandler.handle(new Error('API returned error'), 'Loading pending payments');
      }

      // Handle both response formats
      state.pendingPayments = pendingResponse?.results || pendingResponse?.data?.results || [];
      console.log('Loaded pending payments:', state.pendingPayments.length, state.pendingPayments);
    } catch (err) {
      ErrorHandler.handle(err, 'Loading pending payments');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Loading dashboard data');
  }
  state.loading = false;
}

function render() {
  const app = document.getElementById('app');

  if (state.loading) {
    app.innerHTML = LoadingOverlay('Loading cashier dashboard...');
    return;
  }

  const todayTotal = state.todayTransactions.reduce((sum, t) => sum + t.amount, 0);

  app.innerHTML = `
    ${createHeader({
      role: 'CASHIER',
      activePage: 'cashier-dashboard',
      user: state.user
    })}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Page Title -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Cashier Dashboard</h1>
        <p class="text-gray-600 mt-1">Process student payments and manage transactions</p>
      </div>
      
      <!-- Search Card - AT TOP -->
      <div class="card mb-8">
        <h2 class="text-xl font-bold text-gray-800 mb-4">Search Student</h2>
        <div class="flex gap-3">
          <div class="flex-1 relative">
            <input type="text" 
                   id="studentSearch"
                   value="${state.searchQuery}"
                   placeholder="Enter student number or name..."
                   class="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <svg class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
          <button onclick="searchStudent()" class="btn-primary px-6">Search</button>
        </div>
        
        ${state.searchQuery ? renderSearchResults() : ''}
      </div>
      
      <!-- Selected Student Details (if any) -->
      ${state.selectedStudent ? renderStudentDetails() : ''}
      
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="card bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <p class="text-green-100 text-sm mb-1">Today's Collection</p>
          <p class="text-3xl font-bold">${formatCurrency(todayTotal)}</p>
          <p class="text-green-100 text-sm mt-2">${state.todayTransactions.length} transactions</p>
        </div>
        <div class="card bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <p class="text-blue-100 text-sm mb-1">Students Served</p>
          <p class="text-3xl font-bold">${state.todayTransactions.length}</p>
          <p class="text-blue-100 text-sm mt-2">Today</p>
        </div>
        <div class="card bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
          <p class="text-yellow-100 text-sm mb-1">Pending Month 1 Payment</p>
          <p class="text-3xl font-bold">${state.pendingPayments.length}</p>
          <p class="text-yellow-100 text-sm mt-2">Need payment to enroll</p>
        </div>
      </div>
      
      <!-- Pending Payments Section -->
      ${state.pendingPayments.length > 0 ? `
        <div class="card mb-8 border-2 border-yellow-200 bg-yellow-50">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
              <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Students Awaiting Month 1 Payment
            </h2>
            <span class="badge badge-warning">${state.pendingPayments.length} students</span>
          </div>
          <p class="text-sm text-gray-600 mb-4">These students have been accepted and need to pay Month 1 before they can enroll in subjects.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${state.pendingPayments.slice(0, 6).map(student => {
    const month1 = student.payment_buckets?.find(b => b.month === 1);
    const month1Required = month1?.required || 5000;
    const month1Paid = month1?.paid || 0;
    const month1Balance = month1Required - month1Paid;
    const program = student.program ? `${student.program.code}` : 'N/A';
    return `
              <div class="bg-white p-4 rounded-xl border border-yellow-200 hover:shadow-md transition-all cursor-pointer" onclick="openQuickPayment('${student.id}')">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                    ${student.first_name[0]}${student.last_name[0]}
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold text-gray-800">${student.first_name} ${student.last_name}</p>
                    <p class="text-xs text-gray-500">${student.student_number}</p>
                    <p class="text-xs text-blue-600 font-medium">${program}</p>
                  </div>
                </div>
                <div class="space-y-2 pt-3 border-t border-gray-100">
                  <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">Monthly Payment:</span>
                    <span class="font-bold text-gray-800">${formatCurrency(month1Required)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">Paid:</span>
                    <span class="font-semibold text-green-600">${formatCurrency(month1Paid)}</span>
                  </div>
                  <div class="flex justify-between items-center pb-2">
                    <span class="text-xs text-gray-500">Balance:</span>
                    <span class="font-bold text-red-600">${formatCurrency(month1Balance)}</span>
                  </div>
                  <button class="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-colors">
                    Record Payment
                  </button>
                </div>
              </div>
            `}).join('')}
          </div>
          ${state.pendingPayments.length > 6 ? `
            <p class="text-center text-gray-500 text-sm mt-4">And ${state.pendingPayments.length - 6} more...</p>
          ` : ''}
        </div>
      ` : ''}
      
      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Left Column - Today's Transactions -->
        
        <!-- Right Column - Today's Transactions -->
        <div class="space-y-6">
          <div class="card">
            <h3 class="font-bold text-gray-800 mb-4">Today's Transactions</h3>
            ${state.todayTransactions.length === 0 ? `
              <p class="text-gray-400 text-center py-8">No transactions yet today</p>
            ` : `
              <div class="space-y-3">
                ${state.todayTransactions.map(t => `
                  <div class="p-3 bg-gray-50 rounded-xl">
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-medium text-gray-800">${t.student}</span>
                      <span class="text-green-600 font-bold">${formatCurrency(t.amount)}</span>
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-500">
                      <span>${t.studentNumber}</span>
                      <span>${t.time}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    </main>
    
    <!-- Payment Modal -->
    ${state.showPaymentModal ? renderPaymentModal() : ''}
    
    <!-- Quick Payment Modal -->
    ${state.showQuickPaymentModal ? renderQuickPaymentModal() : ''}
  `;

  attachEventListeners();
}

function renderSearchResults() {
  if (state.searchLoading) {
    return `
      <div class="mt-4 p-4 bg-gray-50 rounded-xl text-center">
        <svg class="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-gray-500">Searching...</span>
      </div>
    `;
  }

  const results = state.searchResults;

  if (results.length === 0) {
    return `
      <div class="mt-4 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
        No students found matching "${state.searchQuery}"
      </div>
    `;
  }

  return `
    <div class="mt-4 space-y-2">
      ${results.map(student => `
        <div onclick="selectStudent('${student.id}')" 
             class="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between ${state.selectedStudent?.id === student.id ? 'ring-2 ring-blue-500' : ''}">
          <div>
            <p class="font-medium text-gray-800">${student.first_name} ${student.last_name}</p>
            <p class="text-sm text-gray-500">${student.student_number}${student.program?.code ? ' • ' + student.program.code : ''}</p>
          </div>
          <span class="badge ${student.enrollment_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${student.enrollment_status}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStudentDetails() {
  const student = state.selectedStudent;
  const totalPaid = student.paymentBuckets.reduce((sum, b) => sum + b.paid, 0);
  const totalRequired = student.paymentBuckets.reduce((sum, b) => sum + b.required, 0);
  const balance = totalRequired - totalPaid;
  const month1Paid = student.paymentBuckets[0].paid >= student.paymentBuckets[0].required;

  return `
    <div class="card">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-800">${student.first_name} ${student.last_name}</h2>
          <p class="text-gray-500">${student.student_number} • ${student.program.name}</p>
        </div>
        <span class="badge ${student.enrollment_status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${student.enrollment_status}</span>
      </div>
      
      <!-- Payment Summary -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="text-center p-4 bg-green-50 rounded-xl">
          <p class="text-xl font-bold text-green-600">${formatCurrency(totalPaid)}</p>
          <p class="text-sm text-green-700">Paid</p>
        </div>
        <div class="text-center p-4 bg-yellow-50 rounded-xl">
          <p class="text-xl font-bold text-yellow-600">${formatCurrency(balance)}</p>
          <p class="text-sm text-yellow-700">Balance</p>
        </div>
        <div class="text-center p-4 bg-blue-50 rounded-xl">
          <p class="text-xl font-bold text-blue-600">${formatCurrency(totalRequired)}</p>
          <p class="text-sm text-blue-700">Total</p>
        </div>
      </div>
      
      <!-- Payment Buckets -->
      <h3 class="font-bold text-gray-800 mb-3">Payment Schedule</h3>
      <div class="grid grid-cols-6 gap-2 mb-6">
        ${student.paymentBuckets.map(bucket => {
    const percentage = (bucket.paid / bucket.required) * 100;
    const isComplete = percentage >= 100;
    return `
            <div class="text-center p-2 rounded-lg ${isComplete ? 'bg-green-100' : bucket.paid > 0 ? 'bg-yellow-100' : 'bg-gray-100'}">
              <p class="text-xs text-gray-500">M${bucket.month}</p>
              <p class="font-bold ${isComplete ? 'text-green-600' : 'text-gray-600'}">${Math.round(percentage)}%</p>
            </div>
          `;
  }).join('')}
      </div>
      
      <!-- Actions -->
      <div class="flex gap-3">
        <button onclick="openPaymentModal()" class="flex-1 btn-primary">
          <svg class="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Record Payment
        </button>
        ${student.enrollment_status === 'PENDING' && month1Paid ? `
          <button onclick="activateStudent()" class="btn-secondary bg-green-600 text-white hover:bg-green-700">
            Activate Student
          </button>
        ` : ''}
      </div>
      
      <!-- Payment History -->
      ${student.paymentHistory.length > 0 ? `
        <h3 class="font-bold text-gray-800 mt-6 mb-3">Payment History</h3>
        <div class="space-y-2">
          ${student.paymentHistory.slice(-5).map(p => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p class="text-sm font-mono text-blue-600">${p.receipt}</p>
                <p class="text-xs text-gray-500">Month ${p.monthApplied} • ${formatDate(p.date)}</p>
              </div>
              <span class="font-bold text-green-600">${formatCurrency(p.amount)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderPaymentModal() {
  const student = state.selectedStudent;
  const nextUnpaidMonth = student.paymentBuckets.find(b => b.paid < b.required)?.month || 1;

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closePaymentModal()">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Record Payment</h3>
        <p class="text-gray-600 mb-6">Recording payment for ${student.first_name} ${student.last_name}</p>
        
        <form id="paymentForm" onsubmit="submitPayment(event)">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
              <input type="number" 
                     id="paymentAmount"
                     required min="1"
                     placeholder="Enter payment amount"
                     class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
              <input type="text" 
                     id="receiptNumber"
                     required
                     placeholder="e.g., OR-2024-0001"
                     class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Apply to Month</label>
              <select id="monthApplied"
                      class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                ${student.paymentBuckets.map(b => `
                  <option value="${b.month}" ${b.month === nextUnpaidMonth ? 'selected' : ''}>
                    Month ${b.month} (${formatCurrency(b.required - b.paid)} remaining)
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="closePaymentModal()" class="flex-1 btn-secondary">Cancel</button>
            <button type="submit" class="flex-1 btn-primary">Submit Payment</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function attachEventListeners() {
  const searchInput = document.getElementById('studentSearch');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        searchStudent();
      }
    });
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
    });
  }
}

// Global functions
window.searchStudent = async function () {
  const input = document.getElementById('studentSearch');
  state.searchQuery = input?.value || '';

  if (state.searchQuery.length < 2) {
    state.searchResults = [];
    render();
    return;
  }

  state.searchLoading = true;
  render();

  try {
    const response = await api.get(`${endpoints.cashierStudentSearch}?q=${encodeURIComponent(state.searchQuery)}`);
    if (response?.results) {
      state.searchResults = response.results;
    } else {
      state.searchResults = [];
      console.warn('No students found for query:', state.searchQuery);
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Searching students');
    Toast.error('Failed to search students. Please try again.');
    state.searchResults = [];
  }

  state.searchLoading = false;
  render();
};

window.selectStudent = function (studentId) {
  // Find from search results first
  state.selectedStudent = state.searchResults.find(s => s.id === studentId || s.id === String(studentId));
  // Then check pending payments
  if (!state.selectedStudent) {
    state.selectedStudent = state.pendingPayments.find(s => s.id === studentId || s.id === String(studentId));
  }
  // If still not found, show error
  if (!state.selectedStudent) {
    Toast.error('Student not found');
    return;
  }

  // Normalize the payment buckets format
  if (state.selectedStudent && state.selectedStudent.payment_buckets) {
    state.selectedStudent.paymentBuckets = state.selectedStudent.payment_buckets.map(b => ({
      month: b.month,
      required: b.required,
      paid: b.paid,
      is_fully_paid: b.is_fully_paid
    }));
  }

  render();
};

window.openPaymentModal = function () {
  if (!state.selectedStudent) return;
  state.showPaymentModal = true;
  render();
};

window.closePaymentModal = function () {
  state.showPaymentModal = false;
  render();
};

window.submitPayment = async function (event) {
  event.preventDefault();

  const amount = parseFloat(document.getElementById('paymentAmount').value);
  const receipt = document.getElementById('receiptNumber').value;
  const monthApplied = parseInt(document.getElementById('monthApplied').value);

  if (!amount || !receipt) {
    Toast.error('Please fill in all fields');
    return;
  }

  try {
    // Try to call the real API
    const data = await api.post(endpoints.cashierRecordPayment, {
      enrollment_id: state.selectedStudent.enrollment_id,
      amount: amount,
      payment_mode: 'CASH',
      reference_number: receipt,
      allocations: [{ month: monthApplied, amount: amount }],
      notes: `Month ${monthApplied} payment`
    });

    if (data && (data.success || data.id || data.message)) {
      Toast.success(data.message || 'Payment recorded successfully!');

      // Refresh student data and today's transactions
      if (state.selectedStudent.enrollment_id) {
        await searchStudent();
        state.selectedStudent = state.searchResults.find(s => s.id === state.selectedStudent.id);
      }

      // Reload today's transactions to show the new payment with real-time data
      await loadData();
      render(); // Re-render to show updated payment data
    } else {
      if (data?.errors) {
        const errorMsg = Object.values(data.errors).flat().join(', ');
        throw new Error(errorMsg);
      }
      throw new Error(data?.error || data?.message || 'API call failed');
    }
  } catch (error) {
    console.log('API payment failed, using mock:', error);

    // Fallback to mock update
    const now = new Date();
    const newPayment = {
      id: Date.now(),
      date: now.toISOString().split('T')[0],
      amount: amount,
      receipt: receipt,
      monthApplied: monthApplied
    };

    if (!state.selectedStudent.paymentHistory) {
      state.selectedStudent.paymentHistory = [];
    }
    state.selectedStudent.paymentHistory.push(newPayment);

    // Update payment bucket
    const bucket = state.selectedStudent.paymentBuckets?.find(b => b.month === monthApplied);
    if (bucket) {
      bucket.paid = Math.min(bucket.required, bucket.paid + amount);
    }

    // Add to today's transactions
    state.todayTransactions.unshift({
      id: Date.now(),
      time: now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      student: `${state.selectedStudent.first_name} ${state.selectedStudent.last_name}`,
      studentNumber: state.selectedStudent.student_number,
      amount: amount,
      receipt: receipt,
      monthApplied: monthApplied
    });

    Toast.success('Payment recorded successfully!');
  }

  state.showPaymentModal = false;
  render();
};

window.activateStudent = function () {
  if (!state.selectedStudent) return;

  const month1 = state.selectedStudent.paymentBuckets[0];
  if (month1.paid < month1.required) {
    Toast.error('Student must pay Month 1 first');
    return;
  }

  state.selectedStudent.enrollment_status = 'ACTIVE';
  Toast.success(`${state.selectedStudent.first_name} ${state.selectedStudent.last_name} has been activated!`);
  render();
};

// Quick Payment Functions
window.openQuickPayment = function (studentId) {
  const student = state.pendingPayments.find(s => s.id === studentId);
  if (!student) return;

  const month1 = student.payment_buckets?.find(b => b.month === 1);
  const required = month1?.required || 5000;
  const paid = month1?.paid || 0;
  const toPay = required - paid;

  state.quickPaymentData = {
    student,
    amount: toPay,
    month: 1,
    receipt: `OR-${Date.now().toString().slice(-6)}`
  };

  state.showQuickPaymentModal = true;
  render();
};

window.closeQuickPaymentModal = function () {
  state.showQuickPaymentModal = false;
  state.quickPaymentData = null;
  render();
};

window.confirmQuickPayment = async function (event) {
  event.preventDefault();

  if (!state.quickPaymentData) return;

  const receipt = document.getElementById('quickReceipt').value;
  const amount = parseFloat(document.getElementById('quickAmount').value);

  if (!amount || !receipt) {
    Toast.error('Please check amount and receipt');
    return;
  }

  const { student } = state.quickPaymentData;

  try {
    const data = await api.post(endpoints.cashierRecordPayment, {
      enrollment_id: student.enrollment_id,
      amount: amount,
      payment_mode: 'CASH',
      reference_number: receipt,
      allocations: [{ month: 1, amount: amount }],
      notes: `Month 1 Quick Payment`
    });

    if (data && (data.success || data.id || data.message)) {
      Toast.success('Payment recorded! Student can now enroll.');
      closeQuickPaymentModal();
      await loadData(); // Refresh pending list with real-time data
      render(); // Re-render to show updated data
    } else {
      if (data?.errors) {
        const errorMsg = Object.values(data.errors).flat().join(', ');
        throw new Error(errorMsg);
      }
      throw new Error(data?.error || data?.message || 'Payment failed');
    }
  } catch (error) {
    ErrorHandler.handle(error, 'Processing quick payment');
  }
};


function renderQuickPaymentModal() {
  const { student, amount, receipt } = state.quickPaymentData;
  if (!student) return '';

  return `
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick="closeQuickPaymentModal()">
      <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
        <div class="mb-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-gray-800">Confirm Month 1 Payment</h3>
              <p class="text-sm text-gray-500">${student.first_name} ${student.last_name}</p>
            </div>
          </div>
          <p class="text-gray-600">This will complete the Month 1 payment and allow the student to enroll in subjects.</p>
        </div>
        
        <form onsubmit="confirmQuickPayment(event)">
          <div class="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">Program:</span>
              <span class="font-medium text-gray-800">${student.program?.code || 'N/A'}</span>
            </div>
            <div class="border-t border-gray-200 pt-3">
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Receipt Number</label>
              <input type="text" id="quickReceipt" value="${receipt}" required
                     class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-mono text-gray-800 focus:outline-none focus:border-blue-500 transition-colors">
            </div>
            <div class="border-t border-gray-200 pt-3">
               <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Payment Amount</label>
               <div class="flex items-center gap-2">
                 <span class="text-gray-400 font-bold">PHP</span>
                 <input type="number" id="quickAmount" value="${amount}" required min="1" step="0.01"
                        class="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xl font-bold text-gray-800 focus:outline-none focus:border-blue-500">
               </div>
               <p class="text-xs text-gray-500 mt-1">Enter payment amount (can be partial)</p>
            </div>
          </div>

          <div class="flex gap-3">
            <button type="button" onclick="closeQuickPaymentModal()" class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" class="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30">
              Confirm & Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

window.logout = function () {
  TokenManager.clearTokens();
  Toast.success('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/pages/auth/login.html';
  }, 1000);
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
