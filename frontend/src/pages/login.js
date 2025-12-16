import '../style.css';
import { api, endpoints, TokenManager } from '../api.js';
import { showToast, validateEmail, redirectByRole } from '../utils.js';

function init() {
  // Check if already logged in
  if (TokenManager.isAuthenticated()) {
    const user = TokenManager.getUser();
    if (user) {
      redirectByRole(user.role);
      return;
    }
  }

  render();
}

function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex">
      <!-- Left Side - Branding -->
      <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between">
        <div>
          <div class="flex items-center gap-3">
            <img src="/logo.jpg" alt="Richwell Colleges" class="w-12 h-12 rounded-xl object-cover">
            <span class="text-2xl font-bold text-white">Richwell Colleges</span>
          </div>
        </div>
        
        <div class="space-y-6">
          <h1 class="text-4xl font-bold text-white leading-tight">
            Your pathway to<br>
            <span class="text-blue-200">quality education</span>
          </h1>
          <p class="text-blue-100 text-lg">
            Access your student portal, view grades, manage enrollments, and stay connected with your academic journey.
          </p>
          
          <div class="flex items-center gap-6 pt-4">
            <div class="flex -space-x-3">
              <div class="w-10 h-10 rounded-full bg-blue-400 border-2 border-blue-600"></div>
              <div class="w-10 h-10 rounded-full bg-indigo-400 border-2 border-blue-600"></div>
              <div class="w-10 h-10 rounded-full bg-purple-400 border-2 border-blue-600"></div>
            </div>
            <span class="text-blue-200 text-sm">Join 1000+ students already enrolled</span>
          </div>
        </div>
        
        <div class="text-blue-200 text-sm">
          © 2024 Richwell Colleges. All rights reserved.
        </div>
      </div>
      
      <!-- Right Side - Login Form -->
      <div class="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div class="w-full max-w-md">
          <!-- Mobile Logo -->
          <div class="lg:hidden text-center mb-8">
            <img src="/logo.jpg" alt="Richwell Colleges" class="w-16 h-16 rounded-xl object-cover mx-auto mb-4 shadow-lg">
            <h1 class="text-2xl font-bold text-white">Richwell Colleges</h1>
          </div>
          
          <!-- Login Card -->
          <div class="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-bold text-white mb-2">Welcome Back</h2>
              <p class="text-blue-200">Sign in to your account</p>
            </div>
            
            <form id="login-form" class="space-y-6">
              <div>
                <label class="block text-sm font-medium text-blue-200 mb-2">Email Address</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </span>
                  <input type="email" id="email" class="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="you@example.com" required>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-blue-200 mb-2">Password</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </span>
                  <input type="password" id="password" class="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="••••••••" required>
                  <button type="button" id="toggle-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <label class="flex items-center cursor-pointer">
                  <input type="checkbox" id="remember" class="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500">
                  <span class="ml-2 text-sm text-blue-200">Remember me</span>
                </label>
                <a href="#" class="text-sm text-blue-300 hover:text-white transition-colors">Forgot password?</a>
              </div>
              
              <button type="submit" id="login-btn" class="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/50 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
                <span>Sign In</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </button>
            </form>
            
            <div class="mt-8 text-center">
              <p class="text-blue-200 text-sm">
                Don't have an account? 
                <a href="/" class="text-white font-semibold hover:underline">Enroll Now</a>
              </p>
            </div>
          </div>
          
          <!-- Test Accounts Info -->
          <div class="mt-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <p class="text-xs text-blue-300 text-center mb-2">Test Accounts</p>
            <div class="text-xs text-blue-200 space-y-1">
              <p><span class="text-white">Admin:</span> admin@richwell.edu.ph / admin123</p>
              <p><span class="text-white">Registrar:</span> registrar@richwell.edu.ph / registrar123</p>
              <p><span class="text-white">Dept Head:</span> jcentita@richwell.edu.ph / head123</p>
              <p><span class="text-white">Cashier:</span> cashier@richwell.edu.ph / cashier123</p>
              <p><span class="text-white">Professor:</span> professor@richwell.edu.ph / prof123</p>
              <p><span class="text-white">Student:</span> student@richwell.edu.ph / student123</p>
              <p><span class="text-white">Admission:</span> admission@richwell.edu.ph / admission123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  const form = document.getElementById('login-form');
  const togglePassword = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('password');

  // Toggle password visibility
  togglePassword?.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
  });

  // Form submission
  form?.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');

  if (!validateEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  // Disable button and show loading
  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span>Signing in...</span>
  `;

  try {
    const response = await fetch('/api/v1/accounts/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();

      // Check if student account is pending approval
      if (data.user.role === 'STUDENT' && data.user.enrollment_status === 'PENDING') {
        showToast('Your account is pending approval. Please wait for the Admissions Office to review your application.', 'warning');
        resetLoginButton();
        return;
      }

      // Check if student account was rejected
      if (data.user.role === 'STUDENT' && data.user.enrollment_status === 'REJECTED') {
        showToast('Your application has been rejected. Please contact the Admissions Office.', 'error');
        resetLoginButton();
        return;
      }

      // Store tokens and user info
      TokenManager.setTokens(data.access, data.refresh);
      TokenManager.setUser(data.user);

      showToast('Login successful!', 'success');

      // Redirect based on role
      setTimeout(() => {
        redirectByRole(data.user.role);
      }, 1000);
    } else {
      const error = await response.json();
      showToast(error.detail || 'Invalid email or password', 'error');
      resetLoginButton();
    }
  } catch (error) {
    showToast('Network error. Please check your connection.', 'error');
    resetLoginButton();
  }
}

function resetLoginButton() {
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = false;
  loginBtn.innerHTML = `
    <span>Sign In</span>
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
    </svg>
  `;
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
