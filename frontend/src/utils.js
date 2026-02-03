/**
 * Utility functions for the Richwell Colleges Portal
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: success, error, warning, info
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    const styles = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.className = `${styles[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transform translate-x-full opacity-0 transition-all duration-300`;
    toast.innerHTML = `
    <span class="text-lg font-bold">${icons[type]}</span>
    <span class="font-medium">${message}</span>
  `;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });

    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

/**
 * Form validation helpers
 */
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone) {
    return /^[0-9]{10,11}$/.test(phone.replace(/[^0-9]/g, ''));
}

export function validateRequired(value) {
    return value && value.trim().length > 0;
}

/**
 * Format currency (PHP)
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
    }).format(amount);
}

/**
 * Format date
 */
export function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Create loading spinner HTML
 */
export function createSpinner(size = 'md') {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-10 h-10'
    };

    return `
    <svg class="${sizes[size]} animate-spin" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `;
}

/**
 * Role-based redirect
 */
export function redirectByRole(role) {
    const routes = {
        STUDENT: '/pages/student/student-dashboard.html',
        ADMISSION_STAFF: '/pages/admission/admission-dashboard.html',
        ADMIN: '/pages/admin/admin-dashboard.html',
        REGISTRAR: '/pages/registrar/registrar-dashboard.html',
        HEAD_REGISTRAR: '/pages/registrar/registrar-dashboard.html',
        DEPARTMENT_HEAD: '/pages/head/head-dashboard.html',
        CASHIER: '/pages/cashier/cashier-dashboard.html',
        PROFESSOR: '/pages/professor/professor-dashboard.html'
    };

    const route = routes[role] || '/pages/student/student-dashboard.html';
    window.location.href = route;
}

/**
 * Check if user is authenticated and redirect if not
 */
export function requireAuth() {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/pages/auth/login.html';
        return false;
    }
    return true;
}

/**
 * Get query parameter from URL
 */
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Logout user - centralized function used across all pages
 */
export async function logout() {
    const { TokenManager } = await import('./api.js');
    const { Toast } = await import('./components/Toast.js');

    TokenManager.clearTokens();
    Toast.success('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/pages/auth/login.html';
    }, 1000);
}

// Make logout globally available
if (typeof window !== 'undefined') {
    window.logout = logout;
}

/**
 * Set button loading state
 * @param {HTMLElement} btn - Button element
 * @param {boolean} isLoading - Loading state
 * @param {string} loadingText - Text to show during loading
 */
export function setButtonLoading(btn, isLoading, loadingText = 'Loading...') {
    if (!btn) return;

    btn.disabled = isLoading;

    if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerHTML;
    }

    btn.innerHTML = isLoading
        ? `<svg class="w-5 h-5 animate-spin inline-block mr-2" viewBox="0 0 24 24" fill="none">
             <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
             <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>${loadingText}`
        : btn.dataset.originalText;
}

/**
 * Validate form field with visual feedback
 * @param {HTMLInputElement} input - Input element
 * @param {Function} validationFn - Validation function
 * @param {string} errorMessage - Error message to display
 * @returns {boolean} Is valid
 */
export function validateField(input, validationFn, errorMessage) {
    if (!input) return false;

    const isValid = validationFn(input.value);

    // Add/remove error class
    if (isValid) {
        input.classList.remove('border-red-400', 'focus:ring-red-500');
        input.classList.add('border-gray-200', 'focus:ring-blue-500');
        input.setAttribute('aria-invalid', 'false');
    } else {
        input.classList.remove('border-gray-200', 'focus:ring-blue-500');
        input.classList.add('border-red-400', 'focus:ring-red-500');
        input.setAttribute('aria-invalid', 'true');
    }

    // Update error message container
    const errorContainer = input.parentElement.querySelector('.error-message');
    if (errorContainer) {
        errorContainer.textContent = isValid ? '' : errorMessage;
        errorContainer.setAttribute('aria-live', 'assertive');
    }

    return isValid;
}

/**
 * Add error message container to input
 * @param {HTMLInputElement} input - Input element
 */
export function addErrorContainer(input) {
    if (!input || !input.parentElement) return;

    const existing = input.parentElement.querySelector('.error-message');
    if (existing) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message text-red-500 text-sm mt-1';
    errorDiv.setAttribute('role', 'alert');
    input.parentElement.appendChild(errorDiv);
}

/**
 * Initialize form validation for a form element
 * @param {HTMLFormElement} form - Form element
 * @param {Object} validationRules - Validation rules { fieldName: { fn, message } }
 */
export function initFormValidation(form, validationRules) {
    if (!form) return;

    Object.entries(validationRules).forEach(([fieldName, rule]) => {
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (!input) return;

        addErrorContainer(input);

        // Validate on blur
        input.addEventListener('blur', () => {
            validateField(input, rule.fn, rule.message);
        });

        // Clear error on input
        input.addEventListener('input', () => {
            if (input.classList.contains('border-red-400')) {
                validateField(input, rule.fn, rule.message);
            }
        });
    });
}


export const ErrorHandler = {
    handle: async (error, context = 'Operation') => {
        const { Toast } = await import('./components/Toast.js');
        console.error(`${context} failed:`, error);

        let message = 'An unexpected error occurred.';

        if (error.response) {
            // Server responded with error
            const data = error.response.data;
            if (data.detail) message = data.detail;
            else if (data.error) message = data.error;
            else if (data.message) message = data.message;
            else if (typeof data === 'string') message = data;
            // Handle Django field errors
            else if (typeof data === 'object') {
                const firstError = Object.values(data)[0];
                if (Array.isArray(firstError)) message = firstError[0];
                else if (typeof firstError === 'string') message = firstError;
            }
        } else if (error.request) {
            // Request made but no response
            message = 'Server received no response. Please check your connection.';
        } else {
            // Request setup error
            message = error.message;
        }

        Toast.error(`${context}: ${message}`);
    }
};

/**
 * Get color for subject code
 */
export function getSubjectColor(subjectCode) {
    const COLORS = [
        'bg-blue-100 border-blue-400 text-blue-800',
        'bg-green-100 border-green-400 text-green-800',
        'bg-purple-100 border-purple-400 text-purple-800',
        'bg-orange-100 border-orange-400 text-orange-800',
        'bg-pink-100 border-pink-400 text-pink-800',
        'bg-teal-100 border-teal-400 text-teal-800',
        'bg-indigo-100 border-indigo-400 text-indigo-800',
        'bg-red-100 border-red-400 text-red-800'
    ];
    const hash = (subjectCode || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLORS[hash % COLORS.length];
}

/**
 * Format 24h time to 12h
 */
export function formatTime(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}${ampm}`;
}
