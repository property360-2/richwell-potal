/**
 * Centralized Error Handler
 *
 * Handles all API and application errors with user-friendly messages.
 * Automatically shows toast notifications and handles common error scenarios.
 *
 * Usage:
 *   import { ErrorHandler } from './utils/errorHandler.js';
 *
 *   try {
 *     await api.post('/endpoint', data);
 *   } catch (error) {
 *     ErrorHandler.handle(error, 'Saving data');
 *   }
 */

import { Toast } from '../components/Toast.js';

export class ErrorHandler {
  /**
   * Handle any type of error with appropriate user feedback
   *
   * @param {Error|Object} error - The error object
   * @param {string} context - Context of where the error occurred (e.g., "Loading users")
   * @param {Object} options - Additional options
   * @param {boolean} options.showToast - Whether to show toast notification (default: true)
   * @param {Function} options.onError - Custom error callback
   * @param {boolean} options.logToConsole - Whether to log to console (default: true)
   */
  static handle(error, context = '', options = {}) {
    const {
      showToast = true,
      onError = null,
      logToConsole = true
    } = options;

    // Log to console for debugging
    if (logToConsole) {
      console.error(`Error in ${context}:`, error);
    }

    // Parse error details
    const errorInfo = this.parseError(error);

    // Show toast notification
    if (showToast) {
      Toast.error(errorInfo.message);
    }

    // Handle specific error types
    this.handleSpecificErrors(errorInfo, error);

    // Call custom error handler if provided
    if (onError && typeof onError === 'function') {
      onError(errorInfo, error);
    }

    return errorInfo;
  }

  /**
   * Parse error into a standardized format
   */
  static parseError(error) {
    // API Response Error (Axios-style or our Custom api.js style)
    if (error.response || error.status || error.data) {
      return this.parseApiError(error.response || error);
    }

    // Network Error
    if (error.request) {
      return {
        type: 'network',
        status: 0,
        message: 'Unable to connect to the server. Please check your internet connection.',
        details: null
      };
    }

    // Application Error
    if (error instanceof Error) {
      // Don't show technical JS errors to users
      const isTechnicalError =
        error.message.includes('JSON') ||
        error.message.includes('Unexpected token') ||
        error.message.includes('SyntaxError') ||
        error.message.includes('<!DOCTYPE');

      return {
        type: 'application',
        status: null,
        message: isTechnicalError
          ? 'Unable to load data at the moment. Please try again later.'
          : error.message || 'An unexpected error occurred',
        details: null
      };
    }

    // Unknown Error
    return {
      type: 'unknown',
      status: null,
      message: 'Something went wrong. Please try again.',
      details: error
    };
  }

  /**
   * Parse API error response
   */
  static parseApiError(response) {
    const status = response.status;
    const data = response.data || {};

    // Extract error message from various response formats
    let message = this.extractErrorMessage(data, status);

    return {
      type: 'api',
      status,
      message,
      details: data,
      validationErrors: this.extractValidationErrors(data)
    };
  }

  /**
   * Extract error message from API response
   */
  static extractErrorMessage(data, status) {
    // Try various common error message fields
    if (data.error) {
      if (typeof data.error === 'string') return data.error;
      if (data.error.message) return data.error.message;
    }

    if (data.message) return data.message;
    if (data.detail && typeof data.detail === 'string') return data.detail;

    // Validation errors (under 'errors', 'error.details', or at root)
    const validationErrors = data.errors || (data.error && data.error.details) || data;

    if (validationErrors && typeof validationErrors === 'object' && !Array.isArray(validationErrors)) {
      // Check if it looks like a DRF validation error (object with arrays or strings)
      const keys = Object.keys(validationErrors);
      if (keys.length > 0 && keys.every(key => Array.isArray(validationErrors[key]) || typeof validationErrors[key] === 'string')) {
        return this.formatValidationErrors(validationErrors);
      }
    }

    // Default messages based on status code
    return this.getDefaultErrorMessage(status);
  }

  /**
   * Extract validation errors from response
   */
  static extractValidationErrors(data) {
    if (!data || typeof data !== 'object') return null;

    if (data.errors && typeof data.errors === 'object') {
      return data.errors;
    }

    if (data.error && data.error.details && typeof data.error.details === 'object') {
      return data.error.details;
    }

    // If it's a flat object with arrays/strings, treat as root-level validation errors
    const keys = Object.keys(data);
    if (keys.length > 0 && !data.detail && !data.message && !data.error) {
      if (keys.every(k => Array.isArray(data[k]) || typeof data[k] === 'string')) {
        return data;
      }
    }

    return null;
  }

  /**
   * Format validation errors into a readable message
   */
  static formatValidationErrors(errors) {
    if (typeof errors === 'string') return errors;

    const messages = [];

    for (const [field, fieldErrors] of Object.entries(errors)) {
      if (Array.isArray(fieldErrors)) {
        fieldErrors.forEach(msg => {
          messages.push(`${field}: ${msg}`);
        });
      } else if (typeof fieldErrors === 'string') {
        messages.push(`${field}: ${fieldErrors}`);
      }
    }

    return messages.length > 0
      ? messages.join('. ')
      : 'Validation error occurred';
  }

  /**
   * Get default error message based on HTTP status code
   */
  static getDefaultErrorMessage(status) {
    const messages = {
      400: 'Invalid input. Please check the information you entered.',
      401: 'Your session has expired. Please log in again.',
      403: 'You don\'t have permission to do this.',
      404: 'The information you\'re looking for isn\'t available yet.',
      409: 'This action conflicts with existing data. Please refresh and try again.',
      422: 'Unable to process the information provided. Please check your input.',
      429: 'Too many requests. Please wait a moment before trying again.',
      500: 'Something went wrong on our end. Please try again in a few moments.',
      502: 'The server is temporarily unavailable. Please try again shortly.',
      503: 'The service is currently unavailable. Please try again later.'
    };

    if (messages[status]) return messages[status];

    if (status >= 400 && status < 500) {
      return 'Unable to complete your request. Please try again.';
    }

    if (status >= 500) {
      return 'We\'re experiencing technical difficulties. Please try again later.';
    }

    return 'Something went wrong. Please try again.';
  }

  /**
   * Handle specific error scenarios
   */
  static handleSpecificErrors(errorInfo, originalError) {
    // 401 Unauthorized - Redirect to login
    if (errorInfo.status === 401) {
      setTimeout(() => {
        // Clear auth tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');

        // Redirect to login
        window.location.href = '/pages/auth/login.html';
      }, 2000);
    }

    // 429 Rate Limit - Show retry time if available
    if (errorInfo.status === 429 && errorInfo.details?.retry_after) {
      const retryAfter = errorInfo.details.retry_after;
      Toast.warning(`Please wait ${retryAfter} seconds before trying again.`);
    }
  }

  /**
   * Handle validation errors with field-specific feedback
   *
   * @param {Object} errors - Validation errors object
   * @param {Function} callback - Callback to display errors (receives field, message)
   */
  static handleValidationErrors(errors, callback) {
    if (!errors || typeof errors !== 'object') return;

    for (const [field, messages] of Object.entries(errors)) {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      messageArray.forEach(message => {
        if (typeof callback === 'function') {
          callback(field, message);
        } else {
          Toast.error(`${field}: ${message}`);
        }
      });
    }
  }

  /**
   * Show a generic error message
   */
  static showError(message) {
    Toast.error(message);
  }

  /**
   * Show a warning message
   */
  static showWarning(message) {
    Toast.warning(message);
  }

  /**
   * Show a success message
   */
  static showSuccess(message) {
    Toast.success(message);
  }

  /**
   * Show an info message
   */
  static showInfo(message) {
    Toast.info(message);
  }
}

// Export singleton methods
export default ErrorHandler;
