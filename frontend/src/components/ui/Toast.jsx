/**
 * Toast Utility
 * provides a static API to trigger toasts from outside React components
 */

let toastEmitter = null;

/**
 * Internal use only: connects the React context to this static utility
 */
export const setToastEmitter = (emitter) => {
    toastEmitter = emitter;
};

/**
 * Toast API
 * Usage: Toast.success('Saved!');
 */
export const Toast = {
    success: (message, action) => toastEmitter?.success(message, action),
    error: (message, action) => toastEmitter?.error(message, action),
    warning: (message, action) => toastEmitter?.warning(message, action),
    info: (message, action) => toastEmitter?.info(message, action)
};

export default Toast;
