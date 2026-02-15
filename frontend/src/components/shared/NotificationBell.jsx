import React, { useState, useEffect, useRef } from 'react';
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
                className={`relative p-3 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-black border-2 border-white rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-96 bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tighter">NOTIFICATIONS</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Real-time alerts</p>
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all">
                                <Check size={20} />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[450px] overflow-y-auto">
                        {loading ? (
                            <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
                        ) : notifications.length > 0 ? (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => markAsRead(n.id, n.link)}
                                    className={`p-6 border-b border-gray-50 hover:bg-gray-50 transition-all cursor-pointer flex gap-4 ${n.is_read ? 'opacity-50' : ''}`}
                                >
                                    {getIcon(n.type)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-sm tracking-tight leading-none ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-600'}`}>{n.title}</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase shrink-0 ml-2">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold line-clamp-2 leading-relaxed">{n.message}</p>
                                    </div>
                                    {!n.is_read && <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-2" />}
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center">
                                <Bell className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">All Systems Clear</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50/50 text-center border-t border-gray-50">
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:tracking-[0.3em] transition-all">
                            VIEW HISTORICAL LOGS
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
