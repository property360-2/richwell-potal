import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CreditCard, UserCheck, FileText, Star, Megaphone, Info, Check } from 'lucide-react';
import { api, endpoints } from '../../api';
import { useToast } from '../../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = () => {
    const { success, error } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
        
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(interval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await api.get(endpoints.notifications.unreadCount);
            setUnreadCount(res.unread_count || 0);
        } catch (err) {
            console.error('Failed to fetch unread count', err);
        }
    };

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await api.get(endpoints.notifications.list + '?page_size=10');
            setNotifications(res.notifications || []);
        } catch (err) {
            console.error('Failed to fetch notifications', err);
        } finally {
            setLoading(false);
        }
    };

    const togglePanel = () => {
        const nextState = !isOpen;
        setIsOpen(nextState);
        if (nextState) {
            fetchNotifications();
        }
    };

    const markAsRead = async (id, link) => {
        try {
            await api.post(endpoints.notifications.markRead(id));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            if (link) window.location.href = link;
        } catch (err) {
            console.error('Failed to mark read', err);
        }
    };

    const markAllRead = async () => {
        try {
            await api.post(endpoints.notifications.markAllRead);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            success('All marked as read');
        } catch (err) {
            error('Action failed');
        }
    };

    const getIcon = (type) => {
        const icons = {
            PAYMENT: { icon: CreditCard, color: 'text-green-600 bg-green-50' },
            ENROLLMENT: { icon: UserCheck, color: 'text-blue-600 bg-blue-50' },
            DOCUMENT: { icon: FileText, color: 'text-purple-600 bg-purple-50' },
            GRADE: { icon: Star, color: 'text-amber-600 bg-amber-50' },
            ANNOUNCEMENT: { icon: Megaphone, color: 'text-indigo-600 bg-indigo-50' },
            SYSTEM: { icon: Info, color: 'text-gray-600 bg-gray-50' }
        };
        const cfg = icons[type] || icons.SYSTEM;
        return <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cfg.color}`}><cfg.icon size={20} /></div>;
    };

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={togglePanel}
                className={`relative p-3 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                aria-label="Notifications"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-4 w-80 md:w-96 bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-500"
                    role="complementary"
                    aria-label="Notifications"
                >
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                        <h3 className="font-black text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                disabled={loading}
                                className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-wide">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => markAsRead(notif.id, notif.link)}
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.is_read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`mt-1 p-2 rounded-full h-fit flex-shrink-0 ${
                                                !notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {getIcon(notif.type)}
                                            </div>
                                            <div>
                                                <p className={`text-xs ${!notif.is_read ? 'font-black text-gray-900' : 'font-medium text-gray-500'}`}>
                                                    {notif.message}
                                                </p>
                                                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wider">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-50 bg-gray-50/50 text-center">
                        <Link to="/notifications" className="text-[10px] font-black text-gray-500 hover:text-blue-600 uppercase tracking-widest transition-colors">
                            View All History
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
