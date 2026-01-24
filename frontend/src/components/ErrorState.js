/**
 * ErrorState Component
 * 
 * Displays error states with retry functionality for API failures.
 * Provides users with actionable feedback and recovery options.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.title - Error title (default: "Something went wrong")
 * @param {string} options.message - Error message (default: generic message)
 * @param {Function} options.onRetry - Callback function for retry action
 * @param {string} options.retryText - Text for retry button (default: "Try Again")
 * @param {boolean} options.showRetry - Whether to show retry button (default: true)
 * @param {string} options.icon - Icon type: 'error', 'network', 'forbidden' (default: 'error')
 * @returns {HTMLElement} The error state element
 */
export function createErrorState(options = {}) {
    const {
        title = 'Something went wrong',
        message = 'We encountered an error while loading this content. Please try again.',
        onRetry = null,
        retryText = 'Try Again',
        showRetry = true,
        icon = 'error'
    } = options;

    const container = document.createElement('div');
    container.className = 'flex flex-col items-center justify-center py-12 px-4';
    container.setAttribute('role', 'alert');
    container.setAttribute('aria-live', 'polite');

    // Icon SVGs
    const icons = {
        error: `
      <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    `,
        network: `
      <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"/>
      </svg>
    `,
        forbidden: `
      <svg class="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
      </svg>
    `
    };

    container.innerHTML = `
    ${icons[icon] || icons.error}
    <h3 class="text-lg font-semibold text-gray-900 mb-2">${title}</h3>
    <p class="text-gray-600 text-center max-w-md mb-6">${message}</p>
    ${showRetry && onRetry ? `
      <button 
        class="btn-primary inline-flex items-center gap-2"
        data-error-retry
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        ${retryText}
      </button>
    ` : ''}
  `;

    // Attach retry handler
    if (showRetry && onRetry) {
        const retryButton = container.querySelector('[data-error-retry]');
        retryButton.addEventListener('click', async () => {
            retryButton.disabled = true;
            retryButton.innerHTML = `
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Retrying...
      `;

            try {
                await onRetry();
            } catch (error) {
                retryButton.disabled = false;
                retryButton.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          ${retryText}
        `;
            }
        });
    }

    return container;
}

/**
 * Helper function to parse API error messages
 * @param {Error} error - The error object from API call
 * @returns {Object} Parsed error with title and message
 */
export function parseApiError(error) {
    // Network errors
    if (!navigator.onLine) {
        return {
            title: 'No Internet Connection',
            message: 'Please check your internet connection and try again.',
            icon: 'network'
        };
    }

    // Timeout errors
    if (error.message && error.message.includes('timeout')) {
        return {
            title: 'Request Timeout',
            message: 'The request took too long to complete. Please try again.',
            icon: 'network'
        };
    }

    // Permission errors
    if (error.status === 403) {
        return {
            title: 'Access Denied',
            message: 'You do not have permission to access this resource.',
            icon: 'forbidden',
            showRetry: false
        };
    }

    // Not found errors
    if (error.status === 404) {
        return {
            title: 'Not Found',
            message: 'The requested resource could not be found.',
            icon: 'error',
            showRetry: false
        };
    }

    // Server errors
    if (error.status >= 500) {
        return {
            title: 'Server Error',
            message: 'Our servers are experiencing issues. Please try again in a few moments.',
            icon: 'error'
        };
    }

    // Default error
    return {
        title: 'Something went wrong',
        message: error.message || 'We encountered an unexpected error. Please try again.',
        icon: 'error'
    };
}
