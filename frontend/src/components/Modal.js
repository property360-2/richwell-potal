/**
 * Reusable Modal Component
 *
 * Flexible modal dialog with customizable content, actions, and styling.
 * Includes proper accessibility (ARIA attributes, keyboard navigation).
 *
 * Usage:
 *   import { Modal, ConfirmModal, FormModal } from './components/Modal.js';
 *
 *   const modal = new Modal({
 *     title: 'Edit User',
 *     content: '<form>...</form>',
 *     actions: [
 *       { label: 'Cancel', onClick: () => modal.close() },
 *       { label: 'Save', onClick: handleSave, primary: true }
 *     ]
 *   });
 *   modal.show();
 */

export class Modal {
  constructor(options = {}) {
    this.options = {
      title: '',
      content: '',
      actions: [],
      size: 'md', // 'sm', 'md', 'lg', 'xl', 'full'
      closeOnEscape: true,
      closeOnBackdrop: true,
      showCloseButton: true,
      onClose: null,
      onShow: null,
      ...options
    };

    this.modalId = `modal-${Date.now()}`;
    this.isOpen = false;
    this.init();
  }

  init() {
    // Create modal element
    const modalEl = document.createElement('div');
    modalEl.id = this.modalId;
    modalEl.innerHTML = this.getHTML();
    document.body.appendChild(modalEl);

    // Attach event listeners
    this.attachEventListeners();
  }

  getHTML() {
    return `
      <div
        class="fixed inset-0 z-50 overflow-y-auto hidden"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity modal-backdrop"></div>

        <!-- Modal Container -->
        <div class="flex items-center justify-center min-h-screen p-4">
          <!-- Modal Dialog -->
          <div class="${this.getModalSizeClasses()} relative transform transition-all modal-dialog">
            <div class="bg-white rounded-lg shadow-xl overflow-hidden">
              <!-- Header -->
              ${this.getHeaderHTML()}

              <!-- Body -->
              <div class="modal-body p-6">
                ${this.options.content}
              </div>

              <!-- Footer -->
              ${this.getFooterHTML()}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getModalSizeClasses() {
    const sizes = {
      sm: 'max-w-sm w-full',
      md: 'max-w-md w-full',
      lg: 'max-w-2xl w-full',
      xl: 'max-w-4xl w-full',
      full: 'max-w-7xl w-full mx-4'
    };
    return sizes[this.options.size] || sizes.md;
  }

  getHeaderHTML() {
    if (!this.options.title && !this.options.showCloseButton) return '';

    return `
      <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900" id="modal-title">
          ${this.options.title}
        </h3>
        ${this.options.showCloseButton ? `
          <button
            type="button"
            class="modal-close text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
  }

  getFooterHTML() {
    if (!this.options.actions || this.options.actions.length === 0) return '';

    const buttons = this.options.actions.map((action, index) => {
      const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
      const variantClasses = action.primary
        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        : action.danger
          ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500';

      return `
        <button
          type="button"
          class="${baseClasses} ${variantClasses} modal-action"
          data-action-index="${index}"
          ${action.disabled ? 'disabled' : ''}
        >
          ${action.label}
        </button>
      `;
    }).join('');

    return `
      <div class="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
        ${buttons}
      </div>
    `;
  }

  attachEventListeners() {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    // Close button
    const closeBtn = modalEl.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Backdrop click
    if (this.options.closeOnBackdrop) {
      const backdrop = modalEl.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.addEventListener('click', () => this.close());
      }
    }

    // Action buttons
    const actionButtons = modalEl.querySelectorAll('.modal-action');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.actionIndex);
        const action = this.options.actions[index];
        if (action && action.onClick) {
          action.onClick(this);
        }
      });
    });

    // Escape key
    if (this.options.closeOnEscape) {
      this.escapeHandler = (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.escapeHandler);
    }
  }

  show() {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    modalEl.classList.remove('hidden');
    this.isOpen = true;

    // Trigger animation
    setTimeout(() => {
      const dialog = modalEl.querySelector('.modal-dialog');
      const backdrop = modalEl.querySelector('.modal-backdrop');

      if (dialog) {
        dialog.classList.add('opacity-100', 'scale-100');
        dialog.classList.remove('opacity-0', 'scale-95');
      }

      if (backdrop) {
        backdrop.classList.add('opacity-100');
        backdrop.classList.remove('opacity-0');
      }
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Focus first focusable element
    this.focusFirstElement();

    // Call onShow callback
    if (this.options.onShow) {
      this.options.onShow(this);
    }
  }

  close() {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    const dialog = modalEl.querySelector('.modal-dialog');
    const backdrop = modalEl.querySelector('.modal-backdrop');

    // Trigger animation
    if (dialog) {
      dialog.classList.remove('opacity-100', 'scale-100');
      dialog.classList.add('opacity-0', 'scale-95');
    }

    if (backdrop) {
      backdrop.classList.remove('opacity-100');
      backdrop.classList.add('opacity-0');
    }

    // Hide after animation
    setTimeout(() => {
      modalEl.classList.add('hidden');
      this.isOpen = false;

      // Restore body scroll
      document.body.style.overflow = '';

      // Call onClose callback
      if (this.options.onClose) {
        this.options.onClose(this);
      }
    }, 300);
  }

  destroy() {
    this.close();

    // Remove event listeners
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }

    // Remove element
    setTimeout(() => {
      const modalEl = document.getElementById(this.modalId);
      if (modalEl) {
        modalEl.remove();
      }
    }, 350);
  }

  updateContent(content) {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    const bodyEl = modalEl.querySelector('.modal-body');
    if (bodyEl) {
      bodyEl.innerHTML = content;
    }
  }

  updateTitle(title) {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    const titleEl = modalEl.querySelector('#modal-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  focusFirstElement() {
    const modalEl = document.getElementById(this.modalId);
    if (!modalEl) return;

    const focusable = modalEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }
}

/**
 * Confirmation Modal
 * Quick helper for confirmation dialogs
 */
export function ConfirmModal(options = {}) {
  return new Promise((resolve) => {
    const modal = new Modal({
      title: options.title || 'Confirm Action',
      content: `
        <div class="text-center">
          ${options.icon ? `
            <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full ${options.danger ? 'bg-red-100' : 'bg-blue-100'} mb-4">
              ${options.icon}
            </div>
          ` : ''}
          <p class="text-gray-700">${options.message || 'Are you sure?'}</p>
        </div>
      `,
      size: options.size || 'sm',
      actions: [
        {
          label: options.cancelLabel || 'Cancel',
          onClick: (m) => {
            m.destroy();
            resolve(false);
          }
        },
        {
          label: options.confirmLabel || 'Confirm',
          primary: !options.danger,
          danger: options.danger,
          onClick: (m) => {
            m.destroy();
            resolve(true);
          }
        }
      ]
    });

    modal.show();
  });
}

/**
 * Alert Modal
 * Simple alert dialog
 */
export function AlertModal(message, title = 'Notice') {
  return new Promise((resolve) => {
    const modal = new Modal({
      title,
      content: `<p class="text-gray-700">${message}</p>`,
      size: 'sm',
      actions: [
        {
          label: 'OK',
          primary: true,
          onClick: (m) => {
            m.destroy();
            resolve();
          }
        }
      ]
    });

    modal.show();
  });
}

export default Modal;
