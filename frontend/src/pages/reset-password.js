import '../style.css';
import { api, endpoints } from '../api.js';
import { getQueryParam, setButtonLoading } from '../utils.js';
import { Toast } from '../components/Toast.js';

let resetToken = null;

function init() {
    // Get token from URL
    resetToken = getQueryParam('token');

    if (!resetToken) {
        showError('Invalid reset link. Please request a new password reset.');
        return;
    }

    // Validate token
    validateToken();
}

async function validateToken() {
    const app = document.getElementById('app');

    // Show loading
    app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div class="text-center text-white">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p>Validating reset link...</p>
      </div>
    </div>
  `;

    try {
        const response = await fetch(`${endpoints.accounts.validateResetToken}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: resetToken }),
        });

        const data = await response.json();

        if (data.success) {
            showResetForm(data.data.email);
        } else {
            showError(data.message || 'Invalid or expired reset link');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function showResetForm(email) {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Logo and Title -->
        <div class="text-center mb-8">
          <div class="inline-block p-4 bg-white/10 backdrop-blur-xl rounded-2xl mb-4">
            <svg class="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p class="text-blue-200">Enter your new password for <strong>${email}</strong></p>
        </div>

        <!-- Form Card -->
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <form id="reset-password-form" class="space-y-6">
            <div>
              <label for="new-password" class="block text-sm font-medium text-blue-200 mb-2">New Password</label>
              <input 
                type="password" 
                id="new-password" 
                name="new_password"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="Enter new password" 
                required
                aria-required="true"
                minlength="8"
                autocomplete="new-password"
              >
              <p class="text-sm text-gray-400 mt-1">Must be at least 8 characters</p>
              <div class="error-message text-red-300 text-sm mt-1" role="alert"></div>
            </div>

            <div>
              <label for="confirm-password" class="block text-sm font-medium text-blue-200 mb-2">Confirm Password</label>
              <input 
                type="password" 
                id="confirm-password" 
                name="confirm_password"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" 
                placeholder="Confirm new password" 
                required
                aria-required="true"
                minlength="8"
                autocomplete="new-password"
              >
              <div class="error-message text-red-300 text-sm mt-1" role="alert"></div>
            </div>

            <!-- Password strength indicator -->
            <div id="password-strength" class="hidden">
              <div class="flex items-center gap-2 mb-1">
                <div class="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div id="strength-bar" class="h-full transition-all duration-300"></div>
                </div>
                <span id="strength-text" class="text-sm font-medium"></span>
              </div>
            </div>

            <button 
              type="submit" 
              id="submit-btn" 
              class="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg shadow-blue-500/30"
            >
              Reset Password
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

    // Add password strength indicator
    const newPasswordInput = document.getElementById('new-password');
    newPasswordInput.addEventListener('input', updatePasswordStrength);

    // Handle form submission
    const form = document.getElementById('reset-password-form');
    form.addEventListener('submit', handleSubmit);
}

function updatePasswordStrength(e) {
    const password = e.target.value;
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');
    const strengthContainer = document.getElementById('password-strength');

    if (!password) {
        strengthContainer.classList.add('hidden');
        return;
    }

    strengthContainer.classList.remove('hidden');

    // Calculate strength
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    // Update UI
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const widths = ['20%', '40%', '60%', '80%', '100%'];

    strengthBar.className = `h-full transition-all duration-300 ${colors[strength - 1] || 'bg-red-500'}`;
    strengthBar.style.width = widths[strength - 1] || '20%';
    strengthText.textContent = labels[strength - 1] || 'Very Weak';
    strengthText.className = `text-sm font-medium ${colors[strength - 1]?.replace('bg-', 'text-') || 'text-red-500'}`;
}

async function handleSubmit(e) {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const submitBtn = document.getElementById('submit-btn');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        Toast.error('Passwords do not match');
        return;
    }

    // Validate password length
    if (newPassword.length < 8) {
        Toast.error('Password must be at least 8 characters long');
        return;
    }

    setButtonLoading(submitBtn, true, 'Resetting...');

    try {
        const response = await fetch(`${endpoints.accounts.resetPassword}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: resetToken,
                new_password: newPassword,
            }),
        });

        const data = await response.json();

        if (data.success) {
            Toast.success(data.message || 'Password reset successful!');

            // Redirect to login after 2 seconds
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            Toast.error(data.message || 'Failed to reset password');
            setButtonLoading(submitBtn, false);
        }
    } catch (error) {
        Toast.error('Network error. Please try again.');
        setButtonLoading(submitBtn, false);
    }
}

function showError(message) {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md text-center">
        <div class="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
          <div class="inline-block p-4 bg-red-500/20 rounded-full mb-4">
            <svg class="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Link Invalid</h2>
          <p class="text-blue-200 mb-6">${message}</p>
          <a 
            href="/forgot-password.html" 
            class="inline-block py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            Request New Reset Link
          </a>
        </div>
      </div>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
