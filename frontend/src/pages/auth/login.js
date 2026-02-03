import '../../style.css';
import { api, endpoints, TokenManager } from '../../api.js';
import { validateEmail, redirectByRole, setButtonLoading } from '../../utils.js';
import { Toast } from '../../components/Toast.js';

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
      <div class="hidden lg:flex lg:w-1/2 bg-white p-16 flex-col justify-between border-r border-gray-100">
        <div>
          <div class="flex items-center gap-3">
            <img src="/logo.jpg" alt="Richwell Colleges" class="w-14 h-14 rounded-2xl object-cover shadow-sm">
            <span class="text-2xl font-bold text-gray-900 tracking-tight">Richwell Colleges</span>
          </div>
        </div>
        
        <div class="max-w-md">
          <h1 class="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            Your pathway to<br>
            <span class="text-blue-600">excellence.</span>
          </h1>
          <p class="text-gray-600 text-lg leading-relaxed">
            Access your secure portal to manage your academic profile, view grades, and stay updated with campus life at Richwell Colleges.
          </p>
          
          <div class="mt-12 space-y-4">
            <div class="flex items-center gap-4 text-gray-600">
              <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 20l9 2 9-2-1.382-14.016z"></path></svg>
              </div>
              <span class="font-medium">Secure & Encrypted Portal</span>
            </div>
            <div class="flex items-center gap-4 text-gray-600">
              <div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <span class="font-medium">Real-time Academic Updates</span>
            </div>
          </div>
        </div>
        
        <div class="text-gray-400 text-sm font-medium">
          © 2024 Richwell Colleges. Excellence in Education.
        </div>
      </div>
      
      <!-- Right Side - Login Form -->
      <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div class="w-full max-w-md">
          <!-- Mobile Logo -->
          <div class="lg:hidden text-center mb-8">
            <img src="/logo.jpg" alt="Richwell Colleges" class="w-16 h-16 rounded-xl object-cover mx-auto mb-4 shadow-lg">
            <h1 class="text-2xl font-bold text-gray-800">Richwell Colleges</h1>
          </div>
          
          <!-- Login Card -->
          <div class="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
            <div class="text-center mb-8">
              <h2 class="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
              <p class="text-gray-500">Sign in to your account</p>
            </div>
            
            <form id="login-form" class="space-y-6">
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
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
                    class="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" 
                    placeholder="you@example.com" 
                    required
                    aria-required="true"
                    autocomplete="email"
                  >
                </div>
                <div class="error-message text-red-500 text-sm mt-1" role="alert"></div>
              </div>
              
              <div>
                <label for="password" class="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </span>
                  <input 
                    type="password" 
                    id="password" 
                    name="password"
                    class="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all" 
                    placeholder="••••••••" 
                    required
                    aria-required="true"
                    autocomplete="current-password"
                  >
                  <button 
                    type="button" 
                    id="toggle-password" 
                    class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                  </button>
                </div>
                <div class="error-message text-red-500 text-sm mt-1" role="alert"></div>
              </div>
              
              <div class="flex items-center justify-between">
                <label class="flex items-center cursor-pointer">
                  <input type="checkbox" id="remember" name="remember" class="w-4 h-4 text-blue-600 bg-gray-50 border-gray-300 rounded focus:ring-blue-500">
                  <span class="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="/forgot-password.html" class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">Forgot password?</a>
              </div>
              
              <button 
                type="submit" 
                id="login-btn" 
                class="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-500/30 transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                </svg>
              </button>
            </form>
            
            <div class="mt-8 text-center">
              <p class="text-gray-500 text-sm">
                Don't have an account? 
                <a href="/" class="text-blue-600 font-semibold hover:underline">Enroll Now</a>
              </p>
            </div>
          </div>
          
          <!-- Help Text -->
          <div class="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p class="text-xs text-gray-500 text-center mb-2 font-medium">Need Help?</p>
            <p class="text-xs text-gray-400 text-center">
              Contact the IT department if you've forgotten your password or need assistance accessing your account.
            </p>
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
    Toast.error('Please enter a valid email address');
    const emailInput = document.getElementById('email');
    emailInput.setAttribute('aria-invalid', 'true');
    emailInput.focus();
    return;
  }

  // Use centralized button loading utility
  setButtonLoading(loginBtn, true, 'Signing in...');

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
        Toast.warning('Your account is pending approval. Please wait for the Admissions Office to review your application.');
        resetLoginButton();
        return;
      }

      // Check if student account was rejected
      if (data.user.role === 'STUDENT' && data.user.enrollment_status === 'REJECTED') {
        Toast.error('Your application has been rejected. Please contact the Admissions Office.');
        resetLoginButton();
        return;
      }

      // Store tokens and user info
      TokenManager.setTokens(data.access, data.refresh);
      TokenManager.setUser(data.user);

      Toast.success('Login successful!');

      // Redirect based on role
      setTimeout(() => {
        redirectByRole(data.user.role);
      }, 1000);
    } else {
      const error = await response.json();
      Toast.error(error.detail || 'Invalid email or password');
      setButtonLoading(loginBtn, false);
    }
  } catch (error) {
    Toast.error('Network error. Please check your connection.');
    setButtonLoading(loginBtn, false);
  }
}

// resetLoginButton function no longer needed - using setButtonLoading utility

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
