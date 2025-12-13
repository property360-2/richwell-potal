import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, formatCurrency, requireAuth } from '../utils.js';

// State
const state = {
  user: null,
  loading: true,
  showChangePasswordModal: false,
  paymentBuckets: [
    { month: 1, required: 5000, paid: 5000, label: 'Month 1' },
    { month: 2, required: 5000, paid: 3500, label: 'Month 2' },
    { month: 3, required: 5000, paid: 0, label: 'Month 3' },
    { month: 4, required: 5000, paid: 0, label: 'Month 4' },
    { month: 5, required: 5000, paid: 0, label: 'Month 5' },
    { month: 6, required: 5000, paid: 0, label: 'Month 6' }
  ]
};

async function init() {
  if (!requireAuth()) return;

  await loadUserProfile();
  render();
}

async function loadUserProfile() {
  try {
    const response = await api.get(endpoints.me);
    if (response) {
      state.user = response;
    }
  } catch (error) {
    console.error('Failed to load profile:', error);
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
    <!-- Header -->
    ${renderHeader()}
    
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Welcome back, ${state.user?.first_name || 'Student'}!</h1>
        <p class="text-gray-600 mt-1">Here's your academic overview</p>
      </div>
      
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        ${renderStatCard('Student Number', state.user?.student_number || 'N/A', 'blue', `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path>
          </svg>
        `)}
        ${renderStatCard('Program', state.user?.program?.code || 'BSIT', 'indigo', `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        `)}
        ${renderStatCard('Enrollment Status', 'Active', 'green', `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        `)}
        ${renderStatCard('Units Enrolled', '21 / 30', 'purple', `
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
        `)}
      </div>
      
      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Left Column - Payment Progress -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Payment Progress Card -->
          <div class="card">
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-gray-800">Payment Progress</h2>
              <div class="flex items-center gap-2">
                <span class="badge badge-info">Semester 1, 2024-2025</span>
                <a href="/soa.html" class="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View SOA
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </a>
              </div>
            </div>
            
            <!-- Payment Summary -->
            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="text-center p-4 bg-green-50 rounded-xl">
                <p class="text-2xl font-bold text-green-600">${formatCurrency(8500)}</p>
                <p class="text-sm text-green-700">Paid</p>
              </div>
              <div class="text-center p-4 bg-yellow-50 rounded-xl">
                <p class="text-2xl font-bold text-yellow-600">${formatCurrency(21500)}</p>
                <p class="text-sm text-yellow-700">Remaining</p>
              </div>
              <div class="text-center p-4 bg-blue-50 rounded-xl">
                <p class="text-2xl font-bold text-blue-600">${formatCurrency(30000)}</p>
                <p class="text-sm text-blue-700">Total</p>
              </div>
            </div>
            
            <!-- 6 Month Buckets -->
            <div class="space-y-4">
              ${state.paymentBuckets.map(bucket => renderPaymentBucket(bucket)).join('')}
            </div>
          </div>
        </div>
        
        <!-- Right Column - Exam Permits -->
        <div class="space-y-6">
          <!-- Exam Permits Card -->
          <div class="card">
            <h3 class="font-bold text-gray-800 mb-4">Exam Permits</h3>
            <p class="text-sm text-gray-500 mb-4">Pay monthly buckets to unlock exam permits</p>
            <div class="space-y-3">
              ${renderExamPermit('Prelims', true)}
              ${renderExamPermit('Midterms', false)}
              ${renderExamPermit('Prefinals', false)}
              ${renderExamPermit('Finals', false)}
            </div>
          </div>
          
          <!-- Account Settings Card -->
          <div class="card">
            <h3 class="font-bold text-gray-800 mb-4">Account Settings</h3>
            <button onclick="openChangePasswordModal()" class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                </svg>
              </div>
              <div>
                <p class="font-medium text-gray-800">Change Password</p>
                <p class="text-xs text-gray-500">Update your login password</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  `;
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
          <a href="/student-dashboard.html" class="text-blue-600 font-medium">Dashboard</a>
          <a href="/subject-enrollment.html" class="text-gray-600 hover:text-gray-900">Enroll Subjects</a>
          <a href="/soa.html" class="text-gray-600 hover:text-gray-900">SOA</a>
        </nav>
        
        <div class="flex items-center gap-4">
          <button class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </button>
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
        <p class="mt-4 text-gray-600">Loading your dashboard...</p>
      </div>
    </div>
  `;
}

function renderStatCard(label, value, color, icon) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return `
    <div class="card hover:shadow-lg transition-shadow">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-white shadow-lg">
          ${icon}
        </div>
        <div>
          <p class="text-sm text-gray-500">${label}</p>
          <p class="text-lg font-bold text-gray-800">${value}</p>
        </div>
      </div>
    </div>
  `;
}

function renderPaymentBucket(bucket) {
  const percentage = Math.min(100, (bucket.paid / bucket.required) * 100);
  const isComplete = percentage >= 100;

  return `
    <div class="flex items-center gap-4">
      <div class="w-20 text-sm font-medium text-gray-600">${bucket.label}</div>
      <div class="flex-1">
        <div class="progress-bar">
          <div class="progress-bar-fill ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}" style="width: ${percentage}%"></div>
        </div>
      </div>
      <div class="w-32 text-right text-sm">
        <span class="${isComplete ? 'text-green-600 font-semibold' : 'text-gray-600'}">${formatCurrency(bucket.paid)}</span>
        <span class="text-gray-400"> / ${formatCurrency(bucket.required)}</span>
      </div>
      ${isComplete ? '<span class="badge badge-success">Paid</span>' : '<span class="badge badge-warning">Pending</span>'}
    </div>
  `;
}

function renderDocumentRow(name, status, filename) {
  const statusStyles = {
    verified: { badge: 'badge-success', text: 'Verified', icon: '✓' },
    pending: { badge: 'badge-warning', text: 'Pending', icon: '⏳' },
    rejected: { badge: 'badge-error', text: 'Rejected', icon: '✕' }
  };

  const s = statusStyles[status];

  return `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <div>
          <p class="font-medium text-gray-800">${name}</p>
          <p class="text-xs text-gray-500">${filename || 'Not uploaded'}</p>
        </div>
      </div>
      <span class="badge ${s.badge}">${s.text}</span>
    </div>
  `;
}

function renderExamPermit(exam, unlocked) {
  return `
    <div class="flex items-center justify-between p-3 rounded-xl ${unlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}">
      <div class="flex items-center gap-3">
        ${unlocked ? `
          <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        ` : `
          <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        `}
        <span class="font-medium ${unlocked ? 'text-green-700' : 'text-gray-500'}">${exam}</span>
      </div>
      ${unlocked ? `
        <button class="text-xs text-green-600 font-medium hover:underline">Print</button>
      ` : `
        <span class="text-xs text-gray-400">Locked</span>
      `}
    </div>
  `;
}

// Logout function
window.logout = function () {
  TokenManager.clearTokens();
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1000);
};

// Change Password functions
window.openChangePasswordModal = function () {
  state.showChangePasswordModal = true;
  renderPasswordModal();
};

window.closeChangePasswordModal = function () {
  state.showChangePasswordModal = false;
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.remove();
};

window.submitPasswordChange = async function (event) {
  event.preventDefault();

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  if (newPassword.length < 6) {
    showToast('New password must be at least 6 characters', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  // Simulate API call (mock)
  showToast('Updating password...', 'info');
  setTimeout(() => {
    showToast('Password changed successfully!', 'success');
    closeChangePasswordModal();
  }, 1000);
};

function renderPasswordModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById('changePasswordModal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'changePasswordModal';
  modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  modal.onclick = (e) => { if (e.target === modal) closeChangePasswordModal(); };

  modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onclick="event.stopPropagation()">
      <h3 class="text-xl font-bold text-gray-800 mb-2">Change Password</h3>
      <p class="text-gray-600 mb-6">Update your login password</p>
      
      <form onsubmit="submitPasswordChange(event)">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input type="password" id="currentPassword" required
                   class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" id="newPassword" required minlength="6"
                   class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input type="password" id="confirmPassword" required
                   class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button type="button" onclick="closeChangePasswordModal()" class="flex-1 btn-secondary">Cancel</button>
          <button type="submit" class="flex-1 btn-primary">Update Password</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
