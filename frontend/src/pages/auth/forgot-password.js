import '../../../../style.css';
import { api, endpoints } from '../../../../api.js';
import { validateEmail, setButtonLoading } from '../../../../utils.js';
import { Toast } from '../../../../components/Toast.js';

function init() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <div class="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-2xl mb-4">
            <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">Forgot Password</h1>
          <p class="text-blue-200">Enter your email to receive a password reset link</p>
        </div>

        <!-- Form Card -->
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <form id="forgot-password-form" class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-blue-200 mb-2">Email Address</label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </span>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  class="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                  placeholder="you@example.com" 
                  required
                  aria-required="true"
                  autocomplete="email"
                >
              </div>
              <div class="error-message text-red-300 text-sm mt-1" role="alert"></div>
            </div>

            <button 
              type="submit" 
              id="submit-btn" 
              class="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg shadow-blue-500/30"
            >
              Send Reset Link
            </button>
          </form>

          <div class="mt-6 text-center">
            <a href="/login.html" class="text-sm text-blue-300 hover:text-white transition-colors">
              ← Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

    // Handle form submission
    const form = document.getElementById('forgot-password-form');
    form.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const submitBtn = document.getElementById('submit-btn');

    if (!validateEmail(email)) {
        Toast.error('Please enter a valid email address');
        const emailInput = document.getElementById('email');
        emailInput.setAttribute('aria-invalid', 'true');
        emailInput.focus();
        return;
    }

    setButtonLoading(submitBtn, true, 'Sending...');

    try {
        const response = await fetch(`${endpoints.accounts.requestPasswordReset}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.success) {
            Toast.success(data.message || 'If your email is registered, you will receive a reset link shortly.');

            // Clear form
            document.getElementById('forgot-password-form').reset();

            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 3000);
        } else {
            Toast.error(data.message || 'Failed to send reset email');
            setButtonLoading(submitBtn, false);
        }
    } catch (error) {
        Toast.error('Network error. Please check your connection.');
        setButtonLoading(submitBtn, false);
    }
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
