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
    success: (message, duration) => toastEmitter?.success(message, duration),
    error: (message, duration) => toastEmitter?.error(message, duration),
    warning: (message, duration) => toastEmitter?.warning(message, duration),
    info: (message, duration) => toastEmitter?.info(message, duration)
};

export default Toast;
