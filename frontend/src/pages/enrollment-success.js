import '../style.css';
import { getQueryParam, showToast } from '../utils.js';

function init() {
  const studentNumber = getQueryParam('student_number') || 'PENDING';
  const firstName = getQueryParam('first_name') || 'Student';
  const lastName = getQueryParam('last_name') || 'User';
  const status = getQueryParam('status') || 'PENDING';

  // Generate username: first letter of first name + last name + timestamp suffix
  const timestamp = Date.now().toString().slice(-4);
  const username = (firstName.charAt(0) + lastName).toLowerCase().replace(/\s/g, '') + timestamp;

  // Password is the student number
  const password = studentNumber !== 'PENDING' ? studentNumber : '2025-XXXXX';

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="max-w-md w-full">
        <!-- Success Animation -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-6 shadow-2xl shadow-green-500/40 animate-bounce">
            <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">Enrollment Successful!</h1>
          <p class="text-gray-600">Welcome to Richwell Colleges</p>
        </div>
        
        <!-- Main Card -->
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl p-8">
          <!-- Status Badge -->
          <div class="text-center mb-6">
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full ${status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
              ${status === 'ACTIVE' ? `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Account Active
              ` : `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Pending Approval
              `}
            </span>
          </div>
          
          <!-- Credentials Section -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Your Login Credentials</h3>
            
            <div class="space-y-4">
              <!-- Student Number -->
              <div class="bg-white rounded-lg p-4 border border-blue-200">
                <p class="text-xs text-gray-500 mb-1">Student Number</p>
                <p class="text-lg font-bold text-blue-600 font-mono">${studentNumber}</p>
              </div>
              
              <!-- Username -->
              <div class="bg-white rounded-lg p-4 border border-blue-200">
                <p class="text-xs text-gray-500 mb-1">Username</p>
                <p class="text-lg font-bold text-blue-600 font-mono">${username}</p>
              </div>
              
              <!-- Password -->
              <div class="bg-white rounded-lg p-4 border border-blue-200">
                <p class="text-xs text-gray-500 mb-1">Password</p>
                <p class="text-lg font-bold text-blue-600 font-mono">${password}</p>
              </div>
            </div>
            
            <!-- Copy Button -->
            <button onclick="copyCredentials()" id="copyBtn" class="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-blue-200 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
              </svg>
              Copy Credentials
            </button>
          </div>
          
          <!-- Warning for Pending -->
          ${status !== 'ACTIVE' ? `
            <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                <div>
                  <p class="font-semibold text-yellow-800">Account Pending Approval</p>
                  <p class="text-sm text-yellow-700 mt-1">Your account will be activated once the Admissions Office reviews your application. You will be able to login after approval.</p>
                </div>
              </div>
            </div>
          ` : ''}
          
          <!-- What's Next -->
          <div class="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 class="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ul class="text-sm text-blue-700 space-y-2">
              <li class="flex items-start gap-2">
                <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Save your credentials (screenshot or copy)
              </li>
              <li class="flex items-start gap-2">
                <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Wait for approval from Admissions Office
              </li>
              <li class="flex items-start gap-2">
                <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Login and pay your first month to enroll in subjects
              </li>
            </ul>
          </div>
          
          <!-- Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <a href="/login.html" class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
              </svg>
              Login Now
            </a>
            <a href="/" class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all">
              Back to Home
            </a>
          </div>
        </div>
        
        <!-- Footer -->
        <p class="text-center text-gray-500 text-sm mt-8">
          Need help? Contact <a href="mailto:admissions@richwell.edu.ph" class="text-blue-600 hover:underline">admissions@richwell.edu.ph</a>
        </p>
      </div>
    </div>
  `;

  // Store credentials for copy function
  window.credentialsData = {
    studentNumber,
    username,
    password
  };
}

// Copy credentials to clipboard
window.copyCredentials = async function () {
  const { studentNumber, username, password } = window.credentialsData;
  const text = `Student Number: ${studentNumber}\nUsername: ${username}\nPassword: ${password}`;

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyBtn');
    btn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Copied!
    `;
    btn.classList.remove('border-blue-200', 'text-blue-600', 'hover:bg-blue-50');
    btn.classList.add('border-green-200', 'text-green-600', 'bg-green-50');

    setTimeout(() => {
      btn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
        </svg>
        Copy Credentials
      `;
      btn.classList.add('border-blue-200', 'text-blue-600', 'hover:bg-blue-50');
      btn.classList.remove('border-green-200', 'text-green-600', 'bg-green-50');
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
