import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/notifications';
import './NotificationBell.css';

const NotificationBell = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch unread count');
    }
  };

  const toggleDropdown = async () => {
    if (!isOpen) {
      try {
        const res = await notificationsApi.getNotifications({ limit: 10 });
        setNotifications(res.data.results || res.data);
      } catch (error) {
        console.error('Failed to fetch notifications');
      }
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read');
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      await notificationsApi.markRead(notif.id);
    }
    setIsOpen(false);
    if (notif.link_url) {
      navigate(notif.link_url);
    }
    fetchUnreadCount();
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`header-btn ${unreadCount > 0 ? 'has-unread' : ''}`} 
        onClick={toggleDropdown}
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown animate-in zoom-in-95 duration-200">
          <div className="dropdown-header">
            <span className="title">Notifications</span>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className={`notification-icon-type ${notif.type}`} />
                  <div className="notification-content">
                    <div className="notification-title">
                       {notif.title}
                       {!notif.is_read && <span className="unread-dot" />}
                    </div>
                    <p className="notification-message">{notif.message}</p>
                    <div className="notification-meta">
                       <span className="time"><Clock size={10} /> {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       {notif.link_url && <span className="action-hint">Click to view <ExternalLink size={10} /></span>}
                    </div>
                  </div>
                  {!notif.is_read && (
                    <button className="mark-single-read" onClick={(e) => handleMarkRead(notif.id, e)}>
                       <X size={12} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Bell size={32} className="text-slate-200" />
                <p>No new notifications</p>
              </div>
            )}
          </div>
          <div className="dropdown-footer">
             <button onClick={() => navigate('/notifications')}>View all updates</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
