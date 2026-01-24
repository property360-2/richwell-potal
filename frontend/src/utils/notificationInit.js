/**
 * Utility to initialize notification bell in pages
 * 
 * Add this to any page that uses createHeader() to enable notifications:
 * 
 * import { initNotificationBell } from '../utils/notificationInit.js';
 * 
 * // After rendering the page
 * initNotificationBell();
 */

import { createNotificationBell, startNotificationPolling, stopNotificationPolling } from '../components/NotificationBell.js';

/**
 * Initialize the notification bell in the header
 * Call this after the header has been rendered
 */
export function initNotificationBell() {
    const placeholder = document.getElementById('notification-bell-placeholder');

    if (placeholder && !placeholder.hasChildNodes()) {
        const bell = createNotificationBell();
        placeholder.appendChild(bell);
        startNotificationPolling();

        // Stop polling when page unloads
        window.addEventListener('beforeunload', stopNotificationPolling);
    }
}

// Auto-initialize on DOM ready if placeholder exists
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationBell);
} else {
    // DOM already loaded
    setTimeout(initNotificationBell, 100);
}
