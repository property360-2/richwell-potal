import '../../style.css';
import { getQueryParam } from '../../utils.js';

function init() {
  const studentNumber = getQueryParam('student_number') || 'PENDING';
  const firstName = getQueryParam('first_name') || 'Student';
  const lastName = getQueryParam('last_name') || 'User';
  const loginEmail = getQueryParam('login_email') || '';  // Personal email for login
  const schoolEmail = getQueryParam('school_email') || '';
  const passwordParam = getQueryParam('password') || '';
  const status = getQueryParam('status') || 'PENDING';

  // Login email is the personal email from the form (Backend uses email field for login)
  const email = loginEmail || schoolEmail || `${firstName[0].toLowerCase()}${lastName.toLowerCase()}@example.com`;

  // Password is set by backend or defaults to 'richwell123'
  const password = passwordParam || 'richwell123';

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
            <span class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Please Take a screenshot or copy the credentials below
            </span>
          </div>
          
          <!-- Credentials Section -->
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">Your Login Credentials</h3>
            
            <div class="space-y-4">
              <!-- Email/Username -->
              <div class="bg-white rounded-lg p-4 border border-blue-200">
                <p class="text-xs text-gray-500 mb-1">Email (Login)</p>
                <p class="text-lg font-bold text-blue-600 font-mono">${email}</p>
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
          
          <!-- Payment Required Notice -->
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="font-semibold text-blue-800">Payment Required for Subject Enrollment</p>
                <p class="text-sm text-blue-700 mt-1">You can login now! To enroll in subjects, please pay your first month fee at the Cashier.</p>
              </div>
            </div>
          </div>
          
          <!-- What's Next -->
          <div class="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 class="font-semibold text-blue-800 mb-2">What's Next?</h3>
            <ul class="text-sm text-blue-700 space-y-2">
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                Save your credentials (screenshot or copy)
              </li>
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                Login with your email and password
              </li>
              <li class="flex items-start gap-2">
                <span class="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                Pay the first month at the Cashier to unlock subject enrollment
              </li>
            </ul>
          </div>
          
          <!-- Buttons -->
          <div class="flex flex-col sm:flex-row gap-3">
            <a href="/pages/student/student-dashboard.html" class="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25">
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
    email,
    password
  };
}

// Copy credentials to clipboard
window.copyCredentials = async function () {
  const { email, password } = window.credentialsData;
  const text = `Email (Login): ${email}\nPassword: ${password}`;

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
