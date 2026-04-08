/**
 * errorHandling.js
 * 
 * Centralized utility for extracting error messages from API responses,
 * including special handling for 'blob' responseTypes.
 */

/**
 * Extracts a readable error message from a DRF error response.
 * Handles both standard JSON responses and Blob responses (e.g., failed PDF downloads).
 * 
 * @param {Error} error - The Axios/fetch error object.
 * @returns {Promise<string>} - A promise resolving to the error message string.
 */
export const getErrorMessage = async (error) => {
  if (!error.response) return error.message || 'Network error occurred';

  const data = error.response.data;

  // Handle Blob responses (common in downloads)
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.error || parsed.detail || 'Failed to process document request';
    } catch (e) {
      return 'Failed to process document request';
    }
  }

  // Handle standard JSON objects
  if (typeof data === 'object' && data !== null) {
      return data.error || data.detail || data.message || 'An unexpected error occurred';
  }

  return 'An unexpected error occurred';
};
