/**
 * Toast Notification System
 *
 * Provides user feedback for actions with auto-dismiss and manual close.
 * Supports success, error, warning, and info variants.
 *
 * Usage:
 *   import { Toast } from './components/Toast.js';
 *
 *   Toast.success('Operation completed successfully!');
 *   Toast.error('Something went wrong');
 *   Toast.warning('Please review your input');
 *   Toast.info('New updates available');
 */

class ToastManager {
  constructor() {
    this.toasts = [];
    this.containerId = 'toast-container';
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    if (!document.getElementById(this.containerId)) {
      const container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(container);
    }
  }

  show(message, type = 'info', duration = 5000) {
    const toast = {
      id: Date.now() + Math.random(),
      message,
      type,
      duration
    };

    this.toasts.push(toast);
    this.render(toast);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }

    return toast.id;
  }

  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 7000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }

  dismiss(toastId) {
    this.toasts = this.toasts.filter(t => t.id !== toastId);
    const element = document.getElementById(`toast-${toastId}`);

    if (element) {
      // Fade out animation
      element.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => element.remove(), 300);
    }
  }

  dismissAll() {
    this.toasts.forEach(toast => this.dismiss(toast.id));
  }

  render(toast) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const toastEl = document.createElement('div');
    toastEl.id = `toast-${toast.id}`;
    toastEl.className = this.getToastClasses(toast.type);
    toastEl.innerHTML = this.getToastHTML(toast);

    // Add to DOM
    container.appendChild(toastEl);

    // Trigger enter animation
    setTimeout(() => {
      toastEl.classList.remove('translate-x-full', 'opacity-0');
    }, 10);

    // Attach close button event
    const closeBtn = toastEl.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismiss(toast.id));
    }
  }

  getToastClasses(type) {
    const baseClasses = 'flex items-start gap-3 p-4 rounded-xl shadow-xl border-2 transition-all duration-300 transform translate-x-full opacity-0 backdrop-blur-sm min-w-[320px] max-w-md';

    const typeClasses = {
      success: 'bg-green-50/95 border-green-300 text-green-900',
      error: 'bg-red-50/95 border-red-300 text-red-900',
      warning: 'bg-amber-50/95 border-amber-300 text-amber-900',
      info: 'bg-blue-50/95 border-blue-300 text-blue-900'
    };

    return `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
  }

  getToastHTML(toast) {
    const icons = {
      success: `
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
      `,
      error: `
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
      `,
      warning: `
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
      `,
      info: `
        <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
        </svg>
      `
    };

    return `
      <div class="flex-shrink-0 mt-0.5">
        ${icons[toast.type] || icons.info}
      </div>
      <div class="flex-1 text-sm font-semibold leading-relaxed">
        ${this.escapeHtml(toast.message)}
      </div>
      <button
        class="toast-close flex-shrink-0 ml-2 -mr-1 p-1.5 rounded-lg hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-500"
        aria-label="Close notification"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
  }

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, m => map[m]);
  }
}

// Create singleton instance
export const Toast = new ToastManager();

// Wrapper for backward compatibility with some pages
export function showToast(message, type = 'info', duration = 5000) {
  return Toast.show(message, type, duration);
}

// Export for testing
export { ToastManager };
