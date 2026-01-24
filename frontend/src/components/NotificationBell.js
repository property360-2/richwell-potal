/**
 * Notification Bell Component
 * 
 * Displays a notification bell icon with unread count badge.
 * Opens a dropdown panel showing recent notifications.
 * Polls for new notifications every 30 seconds.
 * 
 * Usage:
 * import { createNotificationBell, startNotificationPolling, stopNotificationPolling } from './components/NotificationBell.js';
 * 
 * const bell = createNotificationBell();
 * document.getElementById('header').appendChild(bell);
 * startNotificationPolling();
 */

import { api, endpoints } from '../api.js';
import { Toast } from './Toast.js';

let pollInterval = null;
let unreadCount = 0;
let isOpen = false;
let notifications = [];

/**
 * Create the notification bell component
 * @returns {HTMLElement} The notification bell element
 */
export function createNotificationBell() {
    const container = document.createElement('div');
    container.className = 'relative';
    container.id = 'notification-bell-container';

    container.innerHTML = `
    <button 
      id="notification-bell-button"
      class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      aria-label="Notifications"
      aria-haspopup="true"
      aria-expanded="false"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
      </svg>
      <span 
        id="notification-badge" 
        class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full hidden"
      >
        0
      </span>
    </button>
    
    <!-- Notification Panel -->
    <div 
      id="notification-panel"
      class="hidden absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
      role="menu"
      aria-orientation="vertical"
    >
      <div class="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">Notifications</h3>
        <button 
          id="mark-all-read-btn"
          class="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Mark all as read
        </button>
      </div>
      
      <div id="notification-list" class="max-h-96 overflow-y-auto">
        <!-- Notifications will be inserted here -->
      </div>
      
      <div class="p-3 border-t border-gray-200 text-center">
        <a href="/notifications.html" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View all notifications
        </a>
      </div>
    </div>
  `;

    // Attach event listeners
    const button = container.querySelector('#notification-bell-button');
    const panel = container.querySelector('#notification-panel');
    const markAllReadBtn = container.querySelector('#mark-all-read-btn');

    button.addEventListener('click', togglePanel);
    markAllReadBtn.addEventListener('click', markAllAsRead);

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target) && isOpen) {
            closePanel();
        }
    });

    return container;
}

/**
 * Toggle the notification panel
 */
async function togglePanel() {
    isOpen = !isOpen;
    const panel = document.getElementById('notification-panel');
    const button = document.getElementById('notification-bell-button');

    if (isOpen) {
        panel.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        await loadNotifications();
    } else {
        panel.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
    }
}

/**
 * Close the notification panel
 */
function closePanel() {
    isOpen = false;
    const panel = document.getElementById('notification-panel');
    const button = document.getElementById('notification-bell-button');

    if (panel) {
        panel.classList.add('hidden');
        button?.setAttribute('aria-expanded', 'false');
    }
}

/**
 * Load notifications from API
 */
async function loadNotifications() {
    try {
        const response = await api.get(endpoints.notifications.list + '?page_size=10');

        if (response?.notifications) {
            notifications = response.notifications;
            renderNotifications();
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
        const listContainer = document.getElementById('notification-list');
        if (listContainer) {
            listContainer.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <p>Failed to load notifications</p>
          <button onclick="window.loadNotifications()" class="mt-2 text-blue-600 hover:text-blue-800 text-sm">
            Retry
          </button>
        </div>
      `;
        }
    }
}

// Make loadNotifications available globally for retry button
window.loadNotifications = loadNotifications;

/**
 * Render notifications in the panel
 */
function renderNotifications() {
    const listContainer = document.getElementById('notification-list');
    if (!listContainer) return;

    if (notifications.length === 0) {
        listContainer.innerHTML = `
      <div class="p-8 text-center text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p>No notifications yet</p>
      </div>
    `;
        return;
    }

    listContainer.innerHTML = notifications.map(n => `
    <div 
      class="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${n.is_read ? 'opacity-75' : 'bg-blue-50'}"
      onclick="handleNotificationClick(${n.id}, '${n.link || ''}')"
    >
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          ${getNotificationIcon(n.type)}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 ${!n.is_read ? 'font-semibold' : ''}">
            ${n.title}
          </p>
          <p class="text-sm text-gray-600 mt-1">${n.message}</p>
          <p class="text-xs text-gray-400 mt-1">${formatTime(n.created_at)}</p>
        </div>
        ${!n.is_read ? '<div class="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>' : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type) {
    const icons = {
        PAYMENT: `
      <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    `,
        ENROLLMENT: `
      <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    `,
        DOCUMENT: `
      <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
    `,
        GRADE: `
      <div class="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>
      </div>
    `,
        ANNOUNCEMENT: `
      <div class="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
        </svg>
      </div>
    `,
        SYSTEM: `
      <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    `
    };

    return icons[type] || icons.SYSTEM;
}

/**
 * Format timestamp
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

/**
 * Handle notification click
 */
window.handleNotificationClick = async function (notificationId, link) {
    try {
        // Mark as read
        await api.post(endpoints.notifications.markRead(notificationId));

        // Update unread count
        await updateUnreadCount();

        // Close panel
        closePanel();

        // Navigate to link if provided
        if (link) {
            window.location.href = link;
        }
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
};

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
    try {
        await api.post(endpoints.notifications.markAllRead);
        Toast.success('All notifications marked as read');

        // Update UI
        notifications = notifications.map(n => ({ ...n, is_read: true }));
        renderNotifications();
        updateUnreadCount();
    } catch (error) {
        console.error('Failed to mark all as read:', error);
        Toast.error('Failed to mark all as read');
    }
}

/**
 * Update unread count badge
 */
export async function updateUnreadCount() {
    try {
        const response = await api.get(endpoints.notifications.unreadCount);

        if (response?.unread_count !== undefined) {
            unreadCount = response.unread_count;

            const badge = document.getElementById('notification-badge');
            if (badge) {
                badge.textContent = unreadCount;

                if (unreadCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('Failed to update unread count:', error);
    }
}

/**
 * Start polling for new notifications
 */
export function startNotificationPolling() {
    // Initial load
    updateUnreadCount();

    // Poll every 30 seconds
    pollInterval = setInterval(updateUnreadCount, 30000);
}

/**
 * Stop polling for notifications
 */
export function stopNotificationPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}
