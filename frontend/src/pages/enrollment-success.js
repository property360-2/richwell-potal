import '../style.css';
import { getQueryParam } from '../utils.js';

function init() {
    const studentNumber = getQueryParam('student_number') || 'PENDING';

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
        
        <!-- Student Number Card -->
        <div class="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl p-8 text-center">
          <p class="text-sm text-gray-500 uppercase tracking-wider mb-2">Your Student Number</p>
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-3xl font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/30">
            ${studentNumber}
          </div>
          <p class="text-sm text-gray-500 mt-4">Please save this number for your records</p>
          
          <div class="mt-8 space-y-4">
            <div class="bg-blue-50 rounded-xl p-4 text-left">
              <h3 class="font-semibold text-blue-800 mb-2">What's Next?</h3>
              <ul class="text-sm text-blue-700 space-y-2">
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Check your email for login credentials
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Pay your first month to unlock subject enrollment
                </li>
                <li class="flex items-start gap-2">
                  <svg class="w-5 h-5 mt-0.5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Login to view your dashboard and enroll in subjects
                </li>
              </ul>
            </div>
          </div>
          
          <div class="mt-6 flex flex-col sm:flex-row gap-3">
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
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
