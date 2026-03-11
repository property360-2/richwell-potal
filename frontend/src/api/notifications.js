import api from './axios';

export const notificationsApi = {
    getNotifications: (params) => api.get('notifications/', { params }),
    markRead: (id) => api.post(`notifications/${id}/mark-read/`),
    markAllRead: () => api.post('notifications/mark-all-read/'),
    getUnreadCount: () => api.get('notifications/unread-count/'),
};
